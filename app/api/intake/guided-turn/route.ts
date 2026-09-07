import { NextRequest, NextResponse } from "next/server";

import {
  orchestrateIntakeTurn,
  type OrchestrateIntakeTurnResult,
} from "@/src/lib/case-system/intake/orchestrateIntakeTurn";
import { KNOWN_FACT_FIELDS } from "@/src/lib/case-system/intake/questionBank";
import type { IntakeFacts } from "@/src/lib/case-system/intake/selectQuestions";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * Session 11 -- the first piece of the intake foundation (Sessions 3-10)
 * reachable over HTTP. Wraps orchestrateIntakeTurn(), reinvents nothing:
 * this file only validates the request, checks auth, and calls straight
 * through. No UI calls this yet.
 *
 * Uses the REAL QUESTION_BANK (orchestrateIntakeTurn()'s default), not a
 * "reviewed" fixture -- every question is still status: "draft" (see
 * questionBank.ts), so selectQuestions() legitimately returns nothing
 * right now, and this route's response will legitimately show
 * intakeComplete: true / no nextQuestion for every request until
 * something in the bank is marked reviewed. That's correct, not a bug in
 * this route -- see the manual test below for what that actually looks
 * like today.
 *
 * Auth pattern matches app/api/small-claims/analyze/route.ts exactly, not
 * a new approach: getAuthenticatedUser() from serverAuth, real
 * OPENAI_API_KEY read server-side only (never sent to the client).
 * Unlike the analyze routes, there's no deterministic-fallback mode here
 * to serve an unauthenticated request with -- orchestrateIntakeTurn()
 * always calls real AI when newStoryText is given, so this route requires
 * authentication unconditionally rather than degrading gracefully.
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

      const result: OrchestrateIntakeTurnResult = await dependencies.orchestrate(
        body.facts,
        body.answeredIds,
        body.newStoryText,
        apiKey,
      );

      return NextResponse.json({ ok: true, result, authenticated });
    } catch {
      console.error("Guided intake turn route failed.");
      return errorResponse("CourtSimplified could not process this intake turn right now.", 500);
    }
  };
}

export const POST = createGuidedTurnPost();
