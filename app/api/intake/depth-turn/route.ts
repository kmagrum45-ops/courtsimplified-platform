import { NextRequest, NextResponse } from "next/server";

import { CLAIM_TYPES } from "@/src/lib/case-system/intake/claimTypes";
import { orchestrateDepthTurn } from "@/src/lib/case-system/intake/depth/orchestrateDepthTurn";
import {
  selectDepthQuestions,
  type SelectedDepthQuestion,
} from "@/src/lib/case-system/intake/depth/selectDepthQuestions";
import {
  recordDepthAnswer,
  type ElementStateMap,
} from "@/src/lib/case-system/intake/depth/elementStateMap";
import {
  proposeDepthAnswersFromStory,
  type StoryAnswerProposal,
} from "@/src/lib/case-system/intake/storyAnswerProposals";
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
const MAX_CONFIRMED = 20;
const MAX_CONFIRMED_LENGTH = 400;

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
  /**
   * Proposals from the user's story that THEY confirmed (2026-10-04). Recorded
   * as their answers with no model call — the safety pass already read the
   * story they came from. Questions not listed are asked as normal.
   */
  confirmedAnswers?: { questionId: string; answerText: string }[];
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
    "confirmedAnswers",
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
  if (value.confirmedAnswers !== undefined) {
    if (!Array.isArray(value.confirmedAnswers) || value.confirmedAnswers.length > MAX_CONFIRMED) return false;
    const ok = value.confirmedAnswers.every(
      (item) =>
        isRecord(item) &&
        typeof item.questionId === "string" &&
        typeof item.answerText === "string" &&
        item.answerText.trim().length > 0 &&
        item.answerText.length <= MAX_CONFIRMED_LENGTH,
    );
    if (!ok) return false;
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

    // The user confirmed answers their story already gave. Record each as
    // their answer to that question; no model call, nothing inferred.
    if (body.confirmedAnswers && body.confirmedAnswers.length > 0) {
      let confirmedMap = stateMap;
      for (const item of body.confirmedAnswers) {
        const asked = selection.asked.find((candidate) => candidate.question.id === item.questionId);
        if (!asked) continue;
        confirmedMap = recordDepthAnswer(confirmedMap, {
          elementId: asked.elementId,
          questionId: asked.question.id,
          answerText: item.answerText.trim(),
        });
      }
      return NextResponse.json({
        ok: true,
        result: {
          questions: selection.asked.map(toClientQuestion),
          stateMap: confirmedMap,
          leadIn: null,
          halted: false,
        },
      });
    }

    // Opening call: no answer yet. Hand back the questions, plus proposals for
    // any the user's own words already answer, for them to confirm.
    if (!answered) {
      let proposals: StoryAnswerProposal[] = [];
      const story = body.userTexts.join("\n\n");
      if (story.trim() && selection.asked.length > 0) {
        try {
          proposals = await proposeDepthAnswersFromStory(
            story,
            selection.asked.map((item) => ({
              id: item.question.id,
              text: item.renderedText,
              examples: item.question.examples,
            })),
            apiKey,
          );
        } catch {
          // A failed proposal step costs the user nothing: every question is
          // simply asked, as before.
          proposals = [];
        }
      }
      return NextResponse.json({
        ok: true,
        result: {
          questions: selection.asked.map(toClientQuestion),
          proposals,
          stateMap,
          leadIn: null,
          halted: false,
        },
      });
    }

    const index = selection.asked.findIndex((item) => item.question.id === answered.question.id);
    // The next question still to ask: one whose answer the user already
    // confirmed from their story is skipped, so the lead-in is written for
    // the question they will actually see.
    const next = selection.asked.slice(index + 1).find((item) => {
      const record = stateMap[item.elementId];
      return !(record?.state === "provided" && record.questionId === item.question.id);
    });

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
