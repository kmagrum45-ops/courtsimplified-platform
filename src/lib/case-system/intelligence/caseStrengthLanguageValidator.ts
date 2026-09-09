/**
 * Validates free-text output against CLAUDE.md section 3's explicit
 * prohibition -- the first items on its "Not allowed" list: "predictions
 * about judges, opposing-argument responses ... anything grading the
 * merits of a user's specific case." Confirmed necessary with real
 * captured output, not hypothetically: Session 35's fixture harness
 * (scripts/verification/fixtures/unpaidInvoiceGap.actual.md,
 * overLimitContract.actual.md) captured real generated sentences like "The
 * judge may be concerned about the lack of written evidence..." and "The
 * defendant may argue that no enforceable contract exists...", and a later
 * audit (Session 37) caught intelligenceSummary stating "...which may
 * affect the claim's viability" -- a direct merits judgment.
 *
 * Session 38 removed the judgeConcerns/opposingArguments fields and every
 * generator that fed them entirely (courtSimplifiedBrain.ts's prompt and
 * JSON schema, elementProofEngine.ts's per-element judgeConcern/
 * opposingArgument text, and the deterministic hardcoded supplemental
 * builders) -- filtering wording was never going to be sufficient for
 * fields whose entire purpose was the forbidden thing, so the fields are
 * gone rather than filtered. What remains here is the general-purpose
 * validator, now applied to intelligenceSummary/structuredCaseSummary
 * (see sanitizeSummaryText()) -- the field the audit found still capable
 * of stating a merits judgment even though its own purpose (summarizing
 * the case) is legitimate.
 *
 * Same pattern as voiceLayer.ts's validateVoiceLayerOutput(): pure,
 * deterministic, no AI, runs on every candidate text before it's ever
 * returned to a user. Deliberately small and extensible, not exhaustive --
 * same "narrow now, expand deliberately" posture as questionBank.ts's
 * KNOWN_FACT_FIELDS.
 *
 * On a match, the offending text is dropped (replaced with a safe,
 * generic fallback), not the whole response -- same "fall back safely,
 * never block the whole response" posture as voiceLayer.ts's
 * fallback-to-plain-question-text behavior.
 */

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
  // case-strength / viability / outcome grading
  "viability",
  "likely to succeed",
  "likely to win",
  "unlikely to succeed",
  "unlikely to win",
  "chances of success",
  "chance of success",
  "strong case",
  "weak case",
  "will win",
  "will lose",
];

/**
 * Pure, deterministic, no AI. Runs on any candidate free text before it's
 * ever shown to anyone.
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

/**
 * For a single free-text summary field (intelligenceSummary,
 * structuredCaseSummary): returns the text unchanged if it passes, or a
 * fixed, safe fallback if it doesn't. Never throws, never leaves the field
 * blank -- a summary field with nothing in it reads as broken to a user in
 * a way an empty array item doesn't, so the fallback is a real (if
 * generic) sentence, not an empty string.
 */
export function sanitizeSummaryText(text: string, fieldName: string): string {
  const result = validateCaseStrengthLanguage(text);
  if (result.valid) return text;
  console.error(`[caseStrengthLanguageValidator] rejected ${fieldName} (matched term "${result.matchedTerm}"): ${text}`);
  return "A summary of the saved facts is available in the case details below.";
}
