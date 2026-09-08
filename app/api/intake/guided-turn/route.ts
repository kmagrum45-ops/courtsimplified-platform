import { NextRequest, NextResponse } from "next/server";

import {
  orchestrateIntakeTurn,
  type OrchestrateIntakeTurnResult,
} from "@/src/lib/case-system/intake/orchestrateIntakeTurn";
import { KNOWN_FACT_FIELDS, QUESTION_BANK, type IntakeQuestion } from "@/src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES, type ClaimType } from "@/src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "@/src/lib/case-system/intake/selectQuestions";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * Session 11 -- the first piece of the intake foundation (Sessions 3-10)
 * reachable over HTTP. Wraps orchestrateIntakeTurn(), reinvents nothing:
 * this file only validates the request, checks auth, and calls straight
 * through. No UI calls this yet.
 *
 * Uses the REAL QUESTION_BANK for small-claims (the only court area with
 * reviewed content today -- every entry is status: "reviewed", see
 * questionBank.ts), so selectQuestions() returns real questions for a live
 * conversation. Session 16 added an optional `courtArea` request field
 * (validated against SUPPORTED_COURT_AREAS, currently just "small-claims")
 * so a future Family/Civil bank can be added to COURT_AREA_CONTENT without
 * touching this route's validation or dispatch logic again.
 *
 * Auth pattern matches app/api/small-claims/analyze/route.ts exactly, not
 * a new approach: getAuthenticatedUser() from serverAuth, real
 * OPENAI_API_KEY read server-side only (never sent to the client).
 * Unlike the analyze routes, there's no deterministic-fallback mode here
 * to serve an unauthenticated request with -- orchestrateIntakeTurn()
 * always calls real AI when newStoryText is given, so this route requires
 * authentication unconditionally rather than degrading gracefully.
 *
 * Session 12 added a narrow, hard-gated dev-only escape hatch
 * (isDevPreviewAllowed(), DEV_ONLY_testReviewedBank.ts, app/intake-preview)
 * so a developer could click through a full conversation locally before
 * questionBank.ts's real entries were reviewed. Session 13 marked
 * QUESTION_BANK reviewed for real; Session 28 removed the escape hatch
 * per its own file header's stated trigger ("once questionBank.ts's real
 * entries go through actual review... this entire file should be
 * deleted"). This route now always uses the real, reviewed
 * COURT_AREA_CONTENT bank for every request.
 */

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 50_000;
const MAX_STORY_TEXT_LENGTH = 8_000;
// Session 30: raised from 200. orchestrateIntakeTurn.ts now stores verbatim
// free-text answers (up to its own MAX_CAPTURED_ANSWER_LENGTH of 1,000)
// into facts, and facts round-trips back through this same validation on
// every subsequent turn -- this cap must comfortably exceed that.
const MAX_FACT_STRING_LENGTH = 1_200;
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

// Session 16: the only court area with a real reviewed question bank and
// claim-type registry today. A future Family/Civil session adds its own
// entry to COURT_AREA_CONTENT below and to this list -- this route's
// validation and dispatch logic doesn't change either time.
const SUPPORTED_COURT_AREAS = ["small-claims"] as const;
type SupportedCourtArea = (typeof SUPPORTED_COURT_AREAS)[number];

function isSupportedCourtArea(value: unknown): value is SupportedCourtArea {
  return typeof value === "string" && (SUPPORTED_COURT_AREAS as readonly string[]).includes(value);
}

const COURT_AREA_CONTENT: Record<
  SupportedCourtArea,
  { questionBank: readonly IntakeQuestion[]; claimTypes: readonly ClaimType[] }
> = {
  "small-claims": { questionBank: QUESTION_BANK, claimTypes: CLAIM_TYPES },
};

type GuidedTurnRequestBody = {
  facts: IntakeFacts;
  answeredIds: string[];
  newStoryText?: string;
  /** Defaults to "small-claims" when omitted -- every caller today omits it. */
  courtArea?: SupportedCourtArea;
  /**
   * Session 30: the id of the question `newStoryText` directly answers, if
   * any -- lets orchestrateIntakeTurn.ts capture the raw answer text
   * verbatim instead of discarding it. Omitted for the opening free-form
   * story turn, where there is no single question being answered.
   */
  answeredQuestionId?: string;
};

function isGuidedTurnRequestBody(value: unknown): value is GuidedTurnRequestBody {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(["facts", "answeredIds", "newStoryText", "courtArea", "answeredQuestionId"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;

  if (!isIntakeFacts(value.facts)) return false;
  if (!isAnsweredIds(value.answeredIds)) return false;
  if (
    value.newStoryText !== undefined &&
    !(typeof value.newStoryText === "string" && value.newStoryText.length <= MAX_STORY_TEXT_LENGTH)
  ) {
    return false;
  }
  if (value.courtArea !== undefined && !isSupportedCourtArea(value.courtArea)) {
    return false;
  }
  if (
    value.answeredQuestionId !== undefined &&
    !(typeof value.answeredQuestionId === "string" && value.answeredQuestionId.length <= MAX_ANSWERED_ID_LENGTH)
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

      const courtArea = body.courtArea ?? "small-claims";
      const { questionBank, claimTypes } = COURT_AREA_CONTENT[courtArea];

      const result: OrchestrateIntakeTurnResult = await dependencies.orchestrate(
        body.facts,
        body.answeredIds,
        body.newStoryText,
        apiKey,
        questionBank,
        claimTypes,
        courtArea,
        body.answeredQuestionId,
      );

      return NextResponse.json({ ok: true, result, authenticated });
    } catch {
      console.error("Guided intake turn route failed.");
      return errorResponse("CourtSimplified could not process this intake turn right now.", 500);
    }
  };
}

export const POST = createGuidedTurnPost();
