import { NextRequest, NextResponse } from "next/server";

import {
  applyConfirmedStoryAnswers,
  orchestrateIntakeTurn,
  type OrchestrateIntakeTurnResult,
} from "@/src/lib/case-system/intake/orchestrateIntakeTurn";
import type { ConfirmedStoryAnswer, EarlierConversation } from "@/src/lib/case-system/intake/storyAnswerProposals";
import { KNOWN_FACT_FIELDS, QUESTION_BANK, type IntakeQuestion } from "@/src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES, type ClaimType } from "@/src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "@/src/lib/case-system/intake/selectQuestions";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { situationAnswers, situationFromRaw } from "@/src/lib/case-system/situation/situation";

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

// 2026-10-05: raised from 50,000 for `earlier` (the story and every earlier
// answer, each capped below), sent with each answer turn.
const MAX_REQUEST_BYTES = 120_000;
const MAX_STORY_TEXT_LENGTH = 8_000;
// Session 30: raised from 200. orchestrateIntakeTurn.ts now stores verbatim
// free-text answers (up to its own MAX_CAPTURED_ANSWER_LENGTH of 1,000)
// into facts, and facts round-trips back through this same validation on
// every subsequent turn -- this cap must comfortably exceed that.
const MAX_FACT_STRING_LENGTH = 1_200;
const MAX_ANSWERED_IDS = 50;
const MAX_ANSWERED_ID_LENGTH = 200;
const MAX_CONFIRMED_ANSWERS = 30;
const MAX_CONFIRMED_ANSWER_LENGTH = 1_000;

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
  /**
   * Step 2. The situation answers the person gave before their story (situation.ts).
   * The facts they settle (the side, whether a claim was filed or served) are applied
   * over the turn's facts, before and after it, and their questions count as answered:
   * the story never overrides them and they are never asked again.
   */
  situation?: Record<string, unknown>;
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
  /**
   * 2026-09-28. Story answers the user confirmed (after editing or removing
   * any) from the "Here's what I understood" step. When present, the turn
   * applies them instead of processing new text; see
   * applyConfirmedStoryAnswers().
   */
  confirmedAnswers?: ConfirmedStoryAnswer[];
  /**
   * 2026-09-28. Only with confirmedAnswers: the opening story and the ids the
   * first card showed, so answers for questions the confirmations just made
   * applicable can be offered once. See applyConfirmedStoryAnswers.
   */
  repropose?: { story: string; alreadyOffered: string[] };
  /**
   * 2026-10-05. Only with answeredQuestionId: the opening story, every
   * earlier answer by question id, and the ids the person unticked in a
   * proposal card. The questions about to be asked are checked against all of
   * it, so nobody is asked for something they already said. See
   * orchestrateIntakeTurn's `earlier`.
   */
  earlier?: EarlierConversation;
};

function isIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_ANSWERED_IDS &&
    value.every((id) => typeof id === "string" && id.length <= MAX_ANSWERED_ID_LENGTH)
  );
}

function isEarlierConversation(value: unknown): value is EarlierConversation {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => key !== "story" && key !== "answers" && key !== "declined")) return false;
  if (typeof value.story !== "string" || value.story.length > MAX_STORY_TEXT_LENGTH) return false;
  if (!isIdList(value.declined)) return false;
  return (
    Array.isArray(value.answers) &&
    value.answers.length <= MAX_ANSWERED_IDS &&
    value.answers.every(
      (item) =>
        isRecord(item) &&
        Object.keys(item).every((key) => key === "questionId" || key === "answerText") &&
        typeof item.questionId === "string" &&
        item.questionId.length <= MAX_ANSWERED_ID_LENGTH &&
        typeof item.answerText === "string" &&
        item.answerText.length <= MAX_CONFIRMED_ANSWER_LENGTH,
    )
  );
}

function isConfirmedAnswers(value: unknown): value is ConfirmedStoryAnswer[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_CONFIRMED_ANSWERS &&
    value.every(
      (item) =>
        isRecord(item) &&
        Object.keys(item).every((key) => key === "questionId" || key === "answerText") &&
        typeof item.questionId === "string" &&
        item.questionId.length <= MAX_ANSWERED_ID_LENGTH &&
        typeof item.answerText === "string" &&
        item.answerText.length <= MAX_CONFIRMED_ANSWER_LENGTH,
    )
  );
}

function isGuidedTurnRequestBody(value: unknown): value is GuidedTurnRequestBody {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set([
    "facts",
    "answeredIds",
    "newStoryText",
    "courtArea",
    "answeredQuestionId",
    "confirmedAnswers",
    "repropose",
    "earlier",
    "situation",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;

  if (!isIntakeFacts(value.facts)) return false;
  if (!isAnsweredIds(value.answeredIds)) return false;
  if (value.situation !== undefined && !(isRecord(value.situation) && JSON.stringify(value.situation).length <= 2_000)) return false;
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

  if (value.repropose !== undefined) {
    if (value.confirmedAnswers === undefined) return false;
    if (!isRecord(value.repropose)) return false;
    const { story, alreadyOffered } = value.repropose;
    if (typeof story !== "string" || story.length > MAX_STORY_TEXT_LENGTH) return false;
    if (
      !Array.isArray(alreadyOffered) ||
      alreadyOffered.length > MAX_ANSWERED_IDS ||
      !alreadyOffered.every((id) => typeof id === "string" && id.length <= MAX_ANSWERED_ID_LENGTH)
    ) {
      return false;
    }
  }

  if (value.earlier !== undefined) {
    if (value.answeredQuestionId === undefined || !isEarlierConversation(value.earlier)) return false;
  }

  if (value.confirmedAnswers !== undefined) {
    if (!isConfirmedAnswers(value.confirmedAnswers)) return false;
    // A confirmation turn carries no new text and answers no single question.
    if (value.newStoryText !== undefined || value.answeredQuestionId !== undefined) return false;
  }

  return true;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type GuidedTurnRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  orchestrate: typeof orchestrateIntakeTurn;
  applyConfirmed: typeof applyConfirmedStoryAnswers;
  hasExternalAiKey: () => boolean;
};

/** The Small Claims facts and answered questions the situation answers settle (situation.ts). */
export function situationFacts(raw: Record<string, unknown> | undefined): { facts: IntakeFacts; questionIds: string[] } {
  if (!raw) return { facts: {} as IntakeFacts, questionIds: [] };
  const fromStart = situationAnswers("small-claims", situationFromRaw(raw));
  const facts: Record<string, unknown> = {};
  if (fromStart.role) facts.role = fromStart.role;
  if (fromStart.claimFiled !== undefined) facts.claimFiled = fromStart.claimFiled;
  if (fromStart.claimServed !== undefined) facts.claimServed = fromStart.claimServed;
  // The day served and "when did you receive the claim" are answered too (step 2 reviewer: both were asked again).
  return { facts: facts as IntakeFacts, questionIds: fromStart.questionIds };
}

export function createGuidedTurnPost(overrides: Partial<GuidedTurnRouteDependencies> = {}) {
  const dependencies: GuidedTurnRouteDependencies = {
    authenticate: getAuthenticatedUser,
    orchestrate: orchestrateIntakeTurn,
    applyConfirmed: applyConfirmedStoryAnswers,
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
      const fixed = situationFacts(body.situation);
      body.facts = { ...body.facts, ...fixed.facts };
      body.answeredIds = [...new Set([...body.answeredIds, ...fixed.questionIds])];
      const withSituation = <T extends { facts: IntakeFacts; answeredIds: string[] }>(result: T): T => ({
        ...result,
        facts: { ...result.facts, ...fixed.facts },
        answeredIds: [...new Set([...result.answeredIds, ...fixed.questionIds])],
      });

      if (body.confirmedAnswers) {
        const confirmedResult: OrchestrateIntakeTurnResult = await dependencies.applyConfirmed(
          body.facts,
          body.answeredIds,
          body.confirmedAnswers,
          apiKey,
          questionBank,
          courtArea,
          { intakeOnly: true },
          body.repropose,
        );
        return NextResponse.json({ ok: true, result: { ...withSituation(confirmedResult), evidenceGuidance: undefined, claimGuidance: undefined }, authenticated });
      }

      const result: OrchestrateIntakeTurnResult = await dependencies.orchestrate(
        body.facts,
        body.answeredIds,
        body.newStoryText,
        apiKey,
        questionBank,
        claimTypes,
        courtArea,
        body.answeredQuestionId,
        { intakeOnly: true },
        body.earlier,
      );

      return NextResponse.json({ ok: true, result: { ...withSituation(result), evidenceGuidance: undefined, claimGuidance: undefined }, authenticated });
    } catch (error) {
      // The error's kind and where it was thrown, never its message (which can
      // carry the person's words) or anything secret.
      console.error("Guided intake turn route failed.", {
        errorName: error instanceof Error ? error.name : "unknown",
        at: error instanceof Error ? (error.stack ?? "").split("\n").slice(1, 4).map((line) => line.trim()) : [],
      });
      return errorResponse("CourtSimplified could not process this intake turn right now.", 500);
    }
  };
}

export const POST = createGuidedTurnPost();
