/**
 * One depth-phase turn.
 *
 * API COST, derived from this file and stated because the main pipeline's
 * ~35 calls/journey turned out to be 35x what anyone assumed:
 *
 *   runSafetyPass        1   every answer, same as the main loop
 *   composeVoiceTurn     1   the lead-in only (Channel A)
 *   -------------------------------------------------------------
 *   TOTAL                2   per asked depth question
 *
 * versus 3 per turn in orchestrateIntakeTurn. Two calls it deliberately does
 * NOT make, each for a reason:
 *
 *  - NO extraction. orchestrateIntakeTurn calls
 *    extractIntakeFactsWithConfidence on every turn because it does not know
 *    what the user is talking about. Here we do: the answer belongs to a known
 *    element of a known question. It is captured verbatim into the element
 *    state map, exactly as questionBank's `capturesField` captures verbatim
 *    with no AI. Running extraction would spend a call to rediscover something
 *    already certain.
 *  - NO claim-type classifier. The depth phase only runs once a claim type is
 *    confirmed (design section 5), so there is nothing to classify.
 *
 * The safety pass is kept. A depth answer is free text from someone describing
 * a dispute, and dropping the safety check to save a call would be trading a
 * safety property for money.
 *
 * This composes runSafetyPass and composeVoiceTurn — the SAME functions the
 * main loop uses, not reimplementations. The pipelineRunner extraction lesson
 * applies: a second copy of turn logic drifts from the first.
 */

import { runSafetyPass, type SafetyClassification } from "../safetyPass";
import { composeVoiceTurn } from "../voiceLayer";
import type { IntakeQuestion } from "../questionBank";
import {
  recordCannotProvide,
  recordDepthAnswer,
  type ElementStateMap,
} from "./elementStateMap";
import { isUnknownAnswer, type SelectedDepthQuestion } from "./selectDepthQuestions";

export type DepthTurnResult = {
  safetyClassification?: SafetyClassification;
  halted: boolean;
  haltMessage: string;
  /** The conversational lead-in. Model-authored; never the question itself. */
  leadIn: string | null;
  stateMap: ElementStateMap;
  /** Whether the answer resolved the element to cannot-provide. */
  resolvedAsCannotProvide: boolean;
};

/**
 * Records one answer to one depth question.
 *
 * `nextQuestion` is the question to compose a lead-in FOR, if any. Its
 * `renderedText` is what the user sees; composeVoiceTurn never replaces it.
 */
export async function orchestrateDepthTurn(args: {
  answeredQuestion: SelectedDepthQuestion;
  answerText: string;
  stateMap: ElementStateMap;
  nextQuestion?: SelectedDepthQuestion;
  apiKey: string;
  facts: Record<string, string | number | boolean>;
}): Promise<DepthTurnResult> {
  // Call 1 of 2.
  const safety = await runSafetyPass(args.answerText, args.apiKey);

  if (safety.classification === "immediate-danger") {
    return {
      safetyClassification: safety.classification,
      halted: true,
      haltMessage: safety.userMessage || "",
      leadIn: null,
      stateMap: args.stateMap,
      resolvedAsCannotProvide: false,
    };
  }

  // PROPERTY 4. "I don't know" resolves the element rather than leaving it
  // open for the readiness gate to hold on. Recorded, never re-asked, and
  // never presented as a lesser answer.
  const unknown = isUnknownAnswer(args.answerText);

  const stateMap = unknown
    ? recordCannotProvide(args.stateMap, {
        elementId: args.answeredQuestion.elementId,
        questionId: args.answeredQuestion.question.id,
        answerText: args.answerText,
      })
    : recordDepthAnswer(args.stateMap, {
        elementId: args.answeredQuestion.elementId,
        questionId: args.answeredQuestion.question.id,
        answerText: args.answerText,
      });

  let leadIn: string | null = null;

  if (args.nextQuestion) {
    // Call 2 of 2. The voice layer receives the ALREADY-RENDERED question text
    // for context and returns a lead-in only. VoiceTurn.questionText is
    // discarded here precisely so model output cannot become question text —
    // the caller shows nextQuestion.renderedText.
    const voiceQuestion: IntakeQuestion = toVoiceQuestion(args.nextQuestion);
    const voiceTurn = await composeVoiceTurn(args.facts, voiceQuestion, args.apiKey);
    leadIn = voiceTurn.leadIn;
  }

  return {
    safetyClassification: safety.classification,
    halted: false,
    haltMessage: "",
    leadIn,
    stateMap,
    resolvedAsCannotProvide: unknown,
  };
}

/**
 * Adapts a selected depth question into the IntakeQuestion shape composeVoiceTurn
 * expects.
 *
 * The `text` passed in is the rendered, slot-substituted, human-authored
 * string. The voice layer uses it as CONTEXT for the lead-in; its system
 * prompt already instructs it not to repeat or rewrite the question, and this
 * module discards `questionText` from the result regardless. Two independent
 * reasons the invariant holds.
 */
function toVoiceQuestion(selected: SelectedDepthQuestion): IntakeQuestion {
  return {
    id: selected.question.id,
    courtArea: "small-claims",
    text: selected.renderedText,
    why: selected.question.why,
    sourceUrl: selected.question.sourceUrl,
    answerType: "short-text",
    examples: selected.question.examples,
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    status: selected.question.status,
    reviewedAt: selected.question.reviewedAt,
  };
}
