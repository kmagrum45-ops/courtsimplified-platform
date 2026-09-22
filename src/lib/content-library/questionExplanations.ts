/**
 * Plain-language explanations for intake questions — the replacement for the
 * generative `explainQuestion` call.
 *
 * *** WHY THIS FILE EXISTS ***
 *
 * `explainQuestion.ts` sent a question to the model with no `response_format`
 * and rendered the free-form prose that came back verbatim
 * (docs/lso-ai-audit.md, finding B-7). The prompt was carefully written — the
 * model was given no user facts and forbidden from adding rules, deadlines or
 * amounts — but it was still generative text about a legal question, shown to
 * a user without review.
 *
 * *** WHERE THE TEXT COMES FROM: THE QUESTION'S OWN `why` ***
 *
 * These explanations are NOT newly authored. They are derived at module load
 * from `QUESTION_BANK`, using each question's existing `why` field and its
 * existing `sourceUrl`. That text was already written by a person, already
 * sourced, and is already shown to users under "Why does this matter?".
 *
 * Deriving rather than hand-copying keeps one source of truth. Editing a
 * question's `why` updates its explanation, changes the derived version hash,
 * and voids any licensee approval attached to the old wording — which is the
 * behaviour the review model needs.
 *
 * *** QUESTIONS WITHOUT A `why` ***
 *
 * Get an explicit placeholder here, and the UI shows a generic NON-LEGAL
 * fallback instead (see `GENERIC_FALLBACK`). No model call, and no invented
 * explanation standing in for one.
 */

import { QUESTION_BANK } from "../case-system/intake/questionBank";

export type QuestionExplanation = {
  text: string;
  sourceUrl: string;
  /** True when no `why` existed and this is an unreviewed placeholder. */
  isPlaceholder: boolean;
};

/**
 * The generic, deliberately NON-LEGAL fallback.
 *
 * It says nothing about law, procedure, deadlines or the user's situation, so
 * it needs no licensee review and is safe to show for any question. It is a
 * permitted non-legal system message under the LSO policy, and it is on the
 * allowlist in `outputGuard.ts`.
 */
export const GENERIC_FALLBACK =
  "This question helps us understand your situation. If you're unsure, you can skip it or answer in your own words.";

function placeholderFor(questionId: string): string {
  return `[NEEDS LICENSEE REVIEW: plain-language explanation for intake question "${questionId}", which has no "why" text to derive one from]`;
}

export const QUESTION_EXPLANATIONS: Record<string, QuestionExplanation> =
  Object.fromEntries(
    QUESTION_BANK.map((question) => [
      question.id,
      {
        text: question.why ?? placeholderFor(question.id),
        sourceUrl: question.sourceUrl ?? "",
        isPlaceholder: !question.why,
      },
    ]),
  );

/**
 * The explanation for a question id.
 *
 * Returns null when there is no reviewed explanation, so the caller shows the
 * generic fallback rather than a placeholder string. A user must never see the
 * words "NEEDS LICENSEE REVIEW".
 */
export function explanationFor(questionId: string): QuestionExplanation | null {
  const entry = QUESTION_EXPLANATIONS[questionId];
  if (!entry || entry.isPlaceholder) return null;
  return entry;
}
