/**
 * Validates judgeConcerns/opposingArguments text against CLAUDE.md section
 * 3's explicit prohibition -- the first two items on its "Not allowed"
 * list: "predictions about judges, opposing-argument responses ...
 * anything grading the merits of a user's specific case." Confirmed
 * necessary with real captured output, not hypothetically: Session 35's
 * fixture harness (scripts/verification/fixtures/unpaidInvoiceGap.actual.md,
 * overLimitContract.actual.md) captured real generated sentences like "The
 * judge may be concerned about the lack of written evidence..." and "The
 * defendant may argue that no enforceable contract exists...".
 *
 * Same pattern as voiceLayer.ts's validateVoiceLayerOutput(): pure,
 * deterministic, no AI, runs on every item before it's ever returned to a
 * user. Deliberately small and extensible, not exhaustive -- same "narrow
 * now, expand deliberately" posture as questionBank.ts's KNOWN_FACT_FIELDS.
 *
 * Why this runs on the FINAL merged arrays, not just the AI prompt output:
 * judgeConcerns/opposingArguments in courtSimplifiedBrain.ts have more than
 * one source -- the main structured-ai cognition call, the element-proof-
 * analysis engine's own per-element judgeConcern/opposingArgument fields,
 * and several deterministic, hardcoded supplemental builders
 * (buildSupplementalJudgeConcerns, buildSupplementalOpposingArguments,
 * buildProofDrivenJudgeConcerns, buildProofDrivenOpposingArguments) -- some
 * of which contain the same forbidden phrasing verbatim in plain string
 * literals (e.g. "The court may question whether the claim is out of
 * time."). This validator is the one enforcement point that doesn't depend
 * on every prompt and every hardcoded string being reworded correctly.
 * Rewording those hardcoded strings is real, separate follow-up work this
 * fix doesn't do -- see this session's report for exactly which ones.
 *
 * On a match, the single offending item is dropped, not the whole array --
 * same "fall back safely, never block the whole response" posture as
 * voiceLayer.ts's fallback-to-plain-question-text behavior.
 */

import type { JudgeConcern, OpposingArgument } from "./intelligenceTypes";

// Deliberately small and extensible, not exhaustive -- see file header.
const BLOCKED_TERMS = [
  // judge-prediction
  "judge may",
  "court may question",
  "court may ask",
  "court may require",
  "court may care",
  // opposing-argument-prediction
  "may argue",
  "opposing side",
  "other side may",
  "strongest response",
  "strongest argument",
];

/**
 * Pure, deterministic, no AI. Runs on every free-text field of every
 * judgeConcerns/opposingArguments item before it's ever shown to anyone.
 */
export function validateCaseStrengthLanguage(text: string): { valid: boolean; matchedTerm?: string } {
  const lower = text.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { valid: false, matchedTerm: term };
    }
  }
  return { valid: true };
}

function judgeConcernFields(item: JudgeConcern): string[] {
  return [item.concern, item.whyJudgeMayCare, item.howToAddress];
}

function opposingArgumentFields(item: OpposingArgument): string[] {
  return [item.argument, item.whyItMatters, item.responseStrategy];
}

/**
 * Drops any JudgeConcern whose concern/whyJudgeMayCare/howToAddress text
 * matches a blocked term, regardless of which of courtSimplifiedBrain.ts's
 * several sources produced it. Never throws, never blocks the rest of the
 * array.
 */
export function filterJudgeConcerns(items: readonly JudgeConcern[]): JudgeConcern[] {
  return items.filter((item) => {
    for (const field of judgeConcernFields(item)) {
      const result = validateCaseStrengthLanguage(field);
      if (!result.valid) {
        console.error(
          `[caseStrengthLanguageValidator] dropped judgeConcern (matched term "${result.matchedTerm}"): ${field}`,
        );
        return false;
      }
    }
    return true;
  });
}

/** Same as filterJudgeConcerns(), for OpposingArgument. */
export function filterOpposingArguments(items: readonly OpposingArgument[]): OpposingArgument[] {
  return items.filter((item) => {
    for (const field of opposingArgumentFields(item)) {
      const result = validateCaseStrengthLanguage(field);
      if (!result.valid) {
        console.error(
          `[caseStrengthLanguageValidator] dropped opposingArgument (matched term "${result.matchedTerm}"): ${field}`,
        );
        return false;
      }
    }
    return true;
  });
}
