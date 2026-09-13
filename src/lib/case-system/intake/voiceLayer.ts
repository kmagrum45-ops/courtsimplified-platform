/**
 * Voice layer -- phase 4 of docs/AI_INTAKE_DESIGN.md ("composes a
 * conversational restatement and transition around a question, but the
 * question text and question choices always come from the fixed bank --
 * the voice layer can rephrase around them, never replace them. A
 * validator blocks legal characterization, evaluation, prediction, or
 * advice in the voice layer's output; on validation failure, intake falls
 * back to the plain reviewed question text. Intake must never block on
 * the voice layer -- if it's slow, errors, or fails validation, the user
 * still gets the question.")
 *
 * This file is that phase's entire implementation. It does not select
 * questions (selectQuestions.ts owns that, untouched, called by the proof
 * script, not by this file) and it does not alter question text -- the
 * model is instructed never to repeat or rewrite the question, and even
 * if it tried, composeVoiceTurn() always returns question.text verbatim
 * as a separate field, never something the model produced.
 *
 * The validator is pure and deterministic -- no AI, no network, runs on
 * every generated lead-in with no exceptions. Its term list is
 * deliberately small and extensible, not exhaustive: it's the same
 * "narrow now, expand deliberately" posture as questionBank.ts's
 * KNOWN_FACT_FIELDS, not a claim that this list catches everything a
 * model could ever generate.
 */

// No OpenAI import. This module used to make one call per question; see
// composeVoiceTurn() below for why that was removed.
import type { IntakeQuestion } from "./questionBank";
import type { IntakeFacts } from "./selectQuestions";

export type VoiceTurn = {
  /** The generated lead-in, or null if generation/validation failed and the plain question text is used alone. */
  leadIn: string | null;
  /** The fixed question text, verbatim from questionBank.ts -- never model output. */
  questionText: string;
  /** True whenever leadIn is null -- validation failed, generation failed, or generation timed out. */
  fellBackToPlainText: boolean;
};

// Deliberately small and extensible, not exhaustive -- see file header.
const BLOCKED_TERMS = [
  // legal characterization
  "harassment",
  "negligence",
  "wrongful",
  "breach",
  "entitled",
  "liable",
  "valid claim",
  // evaluation
  "strong",
  "weak",
  "good case",
  "should win",
  // predictive
  "will win",
  "court will",
];

/**
 * Pure, deterministic, no AI. Runs on every generated lead-in before it's
 * ever shown to anyone.
 */
export function validateVoiceLayerOutput(text: string): { valid: boolean; matchedTerm?: string } {
  const lower = text.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { valid: false, matchedTerm: term };
    }
  }
  return { valid: true };
}

export type ComposeVoiceTurnOptions = {
  /**
   * Retained for call-site compatibility and no longer read.
   *
   * It existed so the model could briefly acknowledge feeling the user had
   * expressed. With the model gone there is nothing to acknowledge it with,
   * and inventing a deterministic "that sounds difficult" would be worse than
   * silence: a fixed sympathy line fired by a keyword is the kind of hollow
   * gesture this product should not make.
   */
  userStatedTone?: string;
  /** Retained for call-site compatibility. No call is made, so nothing times out. */
  timeoutMs?: number;
};

/**
 * (facts, question) -> a VoiceTurn. DETERMINISTIC. NO API CALL.
 *
 * ---------------------------------------------------------------------------
 * SESSION 48 — THE GENERATED LEAD-IN WAS REMOVED
 * ---------------------------------------------------------------------------
 *
 * This used to make one OpenAI call per question to write a warm 1-3 sentence
 * lead-in. It was removed for two reasons, one about the user and one about
 * cost.
 *
 * THE USER. The lead-in carried no information BY CONSTRUCTION. Its prompt's
 * rule 1 said "restate ONLY what is in the facts you were given" and rule 3
 * forbade including the question — so it could only tell the user things they
 * had just said, then hand over to a question shown separately and verbatim.
 * Because every call was stateless, it could not know what it had already
 * written, and it repeated itself badly. Measured in the live batch:
 *
 *   - Story L5: five of eight lead-ins told a user who had answered "I don't
 *     know" eight times some version of "it sounds like you're still figuring
 *     out some details." Three consecutive turns opened near-identically.
 *   - Story L1: "Thank you for sharing that information about your situation
 *     regarding the loan repayment. It sounds like this has been on your mind
 *     for a couple of months now" — three times, near-identically.
 *
 * Restating a person's own uncertainty back to them every turn is the worst
 * failure mode available for the least confident users, who are the ones this
 * site exists for.
 *
 * THE COST. ~10 calls per journey out of ~34 — roughly 29% of a journey's
 * spend, on decorative text.
 *
 * WHAT REPLACES IT: nothing per turn. The question is shown alone, which is
 * the same conclusion the education-sequencing fix reached — during intake the
 * user sees the question and the input, with nothing between them. A single
 * fixed intro line lives in the UI, shown once, rather than a fresh
 * pseudo-personal greeting every turn.
 *
 * The signature is unchanged, including `async`, so every call site keeps
 * working and nothing needs to learn that this is now free.
 *
 * validateVoiceLayerOutput() above is KEPT. explainQuestion.ts still generates
 * text and still needs it, and slots.ts relies on it for slot values.
 */
export async function composeVoiceTurn(
  facts: IntakeFacts,
  question: IntakeQuestion,
  apiKey: string,
  options: ComposeVoiceTurnOptions = {},
): Promise<VoiceTurn> {
  void facts;
  void apiKey;
  void options;

  return {
    // No lead-in. `fellBackToPlainText` stays true, which is exactly what it
    // has always meant: the user sees the reviewed question text alone.
    leadIn: null,
    questionText: question.text,
    fellBackToPlainText: true,
  };
}
