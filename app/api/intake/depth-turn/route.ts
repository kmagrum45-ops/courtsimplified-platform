import { NextRequest, NextResponse } from "next/server";

import { CLAIM_TYPES } from "@/src/lib/case-system/intake/claimTypes";
import { orchestrateDepthTurn } from "@/src/lib/case-system/intake/depth/orchestrateDepthTurn";
import {
  selectDepthQuestions,
  type SelectedDepthQuestion,
} from "@/src/lib/case-system/intake/depth/selectDepthQuestions";
import type { ElementStateMap } from "@/src/lib/case-system/intake/depth/elementStateMap";
import type { SlotValues } from "@/src/lib/case-system/intake/depth/slots";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * One depth-phase turn, server-side.
 *
 * The depth phase runs only on a CONFIRMED claim type — an exact
 * matchClaimType hit, or an AI suggestion the user confirmed. The client holds
 * that distinction (GuidedSmallClaimsIntake's matchedClaimType is set by both
 * paths) and sends the resulting id here.
 *
 * WHY THE QUESTION SELECTION IS RE-RUN SERVER-SIDE rather than trusting the
 * client's list: selectDepthQuestions is pure, so re-running it is cheap, and
 * it means a client cannot ask an arbitrary question. The question the user
 * sees is authored bank content either way, but only if the server is the one
 * choosing it.
 *
 * Auth pattern matches guided-turn and safety-check: required unconditionally,
 * because orchestrateDepthTurn always runs a real safety pass and there is no
 * safe deterministic substitute for a safety classification.
 *
 * Cost: 2 OpenAI calls per turn (safety pass, plus a lead-in when another
 * question follows). See orchestrateDepthTurn.ts.
 */

export const runtime = "nodejs";

const MAX_ANSWER_LENGTH = 8_000;
const MAX_USER_TEXTS = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type DepthTurnRequestBody = {
  claimTypeId: string;
  /** The question being answered. Empty on the opening call. */
  answeredQuestionId?: string;
  answerText?: string;
  userTexts: string[];
  slotValues: SlotValues;
  stateMap?: ElementStateMap;
  facts: Record<string, string | number | boolean>;
};

function isDepthTurnRequestBody(value: unknown): value is DepthTurnRequestBody {
  if (!isRecord(value)) return false;

  const allowed = new Set([
    "claimTypeId",
    "answeredQuestionId",
    "answerText",
    "userTexts",
    "slotValues",
    "stateMap",
    "facts",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;

  if (typeof value.claimTypeId !== "string" || value.claimTypeId.length === 0) return false;
  if (!Array.isArray(value.userTexts) || value.userTexts.length > MAX_USER_TEXTS) return false;
  if (value.userTexts.some((text) => typeof text !== "string")) return false;
  if (!isRecord(value.slotValues)) return false;
  if (!isRecord(value.facts)) return false;

  if (value.answerText !== undefined) {
    if (typeof value.answerText !== "string" || value.answerText.length > MAX_ANSWER_LENGTH) {
      return false;
    }
  }
  if (value.answeredQuestionId !== undefined && typeof value.answeredQuestionId !== "string") {
    return false;
  }

  return true;
}

export function createDepthTurnPost(
  overrides: Partial<{
    authenticate: typeof getAuthenticatedUser;
    hasExternalAiKey: () => boolean;
  }> = {},
) {
  const dependencies = {
    authenticate: overrides.authenticate || getAuthenticatedUser,
    hasExternalAiKey: overrides.hasExternalAiKey || hasConfiguredServerAi,
  };

  return async function POST(request: NextRequest) {
    const user = await dependencies.authenticate(request);
    if (!user) return errorResponse("Sign in to continue.", 401);

    if (!dependencies.hasExternalAiKey()) {
      return errorResponse("Detailed intake is not available right now.", 503);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return errorResponse("Detailed intake is not available right now.", 503);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request.", 400);
    }

    if (!isDepthTurnRequestBody(body)) return errorResponse("Invalid request.", 400);

    const claimType = CLAIM_TYPES.find((candidate) => candidate.id === body.claimTypeId);
    if (!claimType) return errorResponse("Unknown claim type.", 400);

    // Pure, and re-run here so the server chooses the question, not the client.
    const selection = selectDepthQuestions({
      elements: claimType.plaintiffElements,
      userTexts: body.userTexts,
      slotValues: body.slotValues,
    });

    // The state map the client holds wins if present — it carries answers from
    // earlier turns. Otherwise start from the selection's map, which already
    // has story-covered elements recorded as provided.
    const stateMap = body.stateMap || selection.stateMap;

    const answered: SelectedDepthQuestion | undefined = body.answeredQuestionId
      ? selection.asked.find((item) => item.question.id === body.answeredQuestionId)
      : undefined;

    // Opening call: no answer yet, just hand back the first question.
    if (!answered) {
      return NextResponse.json({
        ok: true,
        result: {
          questions: selection.asked.map(toClientQuestion),
          stateMap,
          leadIn: null,
          halted: false,
        },
      });
    }

    const index = selection.asked.findIndex((item) => item.question.id === answered.question.id);
    const next = selection.asked[index + 1];

    try {
      const turn = await orchestrateDepthTurn({
        answeredQuestion: answered,
        answerText: body.answerText || "",
        stateMap,
        nextQuestion: next,
        apiKey,
        facts: body.facts,
      });

      return NextResponse.json({
        ok: true,
        result: {
          questions: selection.asked.map(toClientQuestion),
          stateMap: turn.stateMap,
          leadIn: turn.leadIn,
          halted: turn.halted,
          haltMessage: turn.haltMessage,
          resolvedAsCannotProvide: turn.resolvedAsCannotProvide,
        },
      });
    } catch {
      console.error("Depth turn failed.");
      return errorResponse("That didn't go through. Please try again.", 500);
    }
  };
}

/**
 * What the client is given. `text` is the rendered, slot-substituted, AUTHORED
 * string — never model output. The lead-in travels separately and is the only
 * model-authored text in the payload.
 */
function toClientQuestion(item: SelectedDepthQuestion) {
  return {
    id: item.question.id,
    elementId: item.elementId,
    text: item.renderedText,
    why: item.question.why,
    sourceUrl: item.question.sourceUrl,
    examples: item.question.examples,
  };
}

export const POST = createDepthTurnPost();
