import { NextRequest, NextResponse } from "next/server";

import {
  orchestrateIntakeTurn,
  type OrchestrateIntakeTurnResult,
} from "@/src/lib/case-system/intake/orchestrateIntakeTurn";
import { KNOWN_FACT_FIELDS, type IntakeQuestion } from "@/src/lib/case-system/intake/questionBank";
import type { IntakeFacts } from "@/src/lib/case-system/intake/selectQuestions";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * Session 11 -- the first piece of the intake foundation (Sessions 3-10)
 * reachable over HTTP. Wraps orchestrateIntakeTurn(), reinvents nothing:
 * this file only validates the request, checks auth, and calls straight
 * through. No UI calls this yet.
 *
 * Uses the REAL QUESTION_BANK (orchestrateIntakeTurn()'s default) -- every
 * entry is status: "reviewed" (see questionBank.ts), so selectQuestions()
 * returns real questions for a live conversation.
 *
 * Auth pattern matches app/api/small-claims/analyze/route.ts exactly, not
 * a new approach: getAuthenticatedUser() from serverAuth, real
 * OPENAI_API_KEY read server-side only (never sent to the client).
 * Unlike the analyze routes, there's no deterministic-fallback mode here
 * to serve an unauthenticated request with -- orchestrateIntakeTurn()
 * always calls real AI when newStoryText is given, so this route requires
 * authentication unconditionally rather than degrading gracefully.
 *
 * Session 12 adds a narrow, hard-gated dev-only escape hatch: see
 * isDevPreviewAllowed() below. It exists solely so app/intake-preview
 * (also Session 12, a new, clearly-named, unwired preview route) can
 * click through a full conversation locally using
 * DEV_ONLY_testReviewedBank.ts's 8 questions instead of the real
 * QUESTION_BANK, whose entries are all still status: "draft". The gate is
 * `process.env.NODE_ENV !== "production" && ?devPreview=true` -- both
 * required, and the NODE_ENV half is a server environment value Next.js
 * sets automatically for a production build/start, not something any
 * request can influence. See isDevPreviewAllowed()'s own comment for the
 * full reasoning; this is the one thing about this route worth reading
 * carefully before trusting it.
 */

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 50_000;
const MAX_STORY_TEXT_LENGTH = 8_000;
const MAX_FACT_STRING_LENGTH = 200;
const MAX_ANSWERED_IDS = 50;
const MAX_ANSWERED_ID_LENGTH = 200;

const KNOWN_FACT_FIELD_SET = new Set<string>(KNOWN_FACT_FIELDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isIntakeFacts(value: unknown): value is IntakeFacts {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, fieldValue]) => {
    if (!KNOWN_FACT_FIELD_SET.has(key)) return false;
    if (typeof fieldValue === "boolean" || typeof fieldValue === "number") return true;
    return typeof fieldValue === "string" && fieldValue.length <= MAX_FACT_STRING_LENGTH;
  });
}

function isAnsweredIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_ANSWERED_IDS &&
    value.every((id) => typeof id === "string" && id.length <= MAX_ANSWERED_ID_LENGTH)
  );
}

type GuidedTurnRequestBody = {
  facts: IntakeFacts;
  answeredIds: string[];
  newStoryText?: string;
};

function isGuidedTurnRequestBody(value: unknown): value is GuidedTurnRequestBody {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(["facts", "answeredIds", "newStoryText"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;

  if (!isIntakeFacts(value.facts)) return false;
  if (!isAnsweredIds(value.answeredIds)) return false;
  if (
    value.newStoryText !== undefined &&
    !(typeof value.newStoryText === "string" && value.newStoryText.length <= MAX_STORY_TEXT_LENGTH)
  ) {
    return false;
  }

  return true;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * DEV-ONLY PREVIEW GATE -- the entire mechanism keeping
 * DEV_ONLY_testReviewedBank.ts's un-reviewed content out of production.
 * Requires BOTH:
 *   (a) the request explicitly opts in with the query string
 *       ?devPreview=true (absent, misspelled, or any other value ->
 *       false), AND
 *   (b) process.env.NODE_ENV !== "production".
 *
 * (b) is not client input. It's a server-side environment value Next.js
 * itself sets to "production" for `next build`/`next start`, and nothing
 * in an incoming HTTP request -- a query param, a header, a cookie -- can
 * change what value this process was started with. That means (b) alone
 * makes this function return false for every request in a real production
 * deployment, regardless of (a), regardless of a bug elsewhere in this
 * file, regardless of who's calling it or why. Exported specifically so
 * this exact claim is directly testable/inspectable, not just asserted in
 * a comment.
 */
export function isDevPreviewAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return request.nextUrl.searchParams.get("devPreview") === "true";
}

type GuidedTurnRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  orchestrate: typeof orchestrateIntakeTurn;
  hasExternalAiKey: () => boolean;
};

export function createGuidedTurnPost(overrides: Partial<GuidedTurnRouteDependencies> = {}) {
  const dependencies: GuidedTurnRouteDependencies = {
    authenticate: getAuthenticatedUser,
    orchestrate: orchestrateIntakeTurn,
    hasExternalAiKey: hasConfiguredServerAi,
    ...overrides,
  };

  return async function guidedTurnPost(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return errorResponse("The intake turn payload is too large.", 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("A valid intake turn payload is required.", 400);
    }

    if (!isGuidedTurnRequestBody(body)) {
      return errorResponse("A valid intake turn payload is required.", 400);
    }

    try {
      const authenticated = Boolean(await dependencies.authenticate(request));
      if (!authenticated) {
        return errorResponse("Sign in required to continue guided intake.", 401);
      }

      if (!dependencies.hasExternalAiKey()) {
        return errorResponse("Guided intake is not available right now.", 503);
      }
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return errorResponse("Guided intake is not available right now.", 503);
      }

      // See isDevPreviewAllowed() above -- false for every request in
      // production, unconditionally. The dynamic import only ever executes
      // inside this already-gated branch, never at module load time.
      let devPreviewBank: readonly IntakeQuestion[] | undefined;
      if (isDevPreviewAllowed(request)) {
        const { DEV_ONLY_TEST_REVIEWED_BANK } = await import(
          "@/src/lib/case-system/intake/DEV_ONLY_testReviewedBank"
        );
        devPreviewBank = DEV_ONLY_TEST_REVIEWED_BANK;
      }

      const result: OrchestrateIntakeTurnResult = await dependencies.orchestrate(
        body.facts,
        body.answeredIds,
        body.newStoryText,
        apiKey,
        devPreviewBank,
      );

      return NextResponse.json({ ok: true, result, authenticated });
    } catch {
      console.error("Guided intake turn route failed.");
      return errorResponse("CourtSimplified could not process this intake turn right now.", 500);
    }
  };
}

export const POST = createGuidedTurnPost();
