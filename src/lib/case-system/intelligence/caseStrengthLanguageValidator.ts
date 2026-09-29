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

/*
 * 2026-09-27 -- expanded after an independent second-opinion review (a
 * different AI, given only this file and CLAUDE.md section 3, asked to find
 * gaps). Two kinds of gap were real and are added below: outcome-prediction
 * verb forms this list only caught in one tense/modal ("likely to succeed"
 * but not "may succeed" or "may be dismissed"), and merit-grading adjectives
 * with no synonym coverage ("viability" but not "viable"/"non-viable").
 *
 * Several of that review's suggestions were REJECTED, not overlooked --
 * recorded here so they aren't re-suggested and re-added later without this
 * reasoning:
 *   - Bare "accept", "reject", "believe", "prefer", "conclude", "award" --
 *     these are ordinary words this site's own LEGITIMATE output uses
 *     constantly in neutral procedural sentences (e.g. nextBestActions
 *     content describing that "the court may award costs" -- reviewed
 *     library text, not a case-specific prediction). validateCaseStrengthLanguage
 *     is a plain substring match, so a bare common word blocks correct
 *     output silently instead of catching the forbidden thing.
 *   - Bare "succeed", "fail", "claim", "rely on" -- same problem, worse for
 *     "claim": the entire product is about a user's "claim". A bare match
 *     would misfire on nearly every legitimate sentence.
 *   - "the defendant/plaintiff/respondent may/could/might [verb]" as one
 *     pattern -- redundant. Substring matching already means "the defendant
 *     may argue" contains "may argue" and is already caught; no separate
 *     party-label pattern is needed for verbs already in this list.
 */
// Deliberately small and extensible, not exhaustive -- see file header.
const BLOCKED_TERMS = [
  // judge-prediction
  "judge may",
  "judge will",
  "judge could",
  "judge might",
  "judge is likely to",
  "judge is expected to",
  "judge would likely",
  "court may question",
  "court may ask",
  "court may require",
  "court may care",
  "court will expect",
  "court is likely to",
  "court is expected to",
  "court would likely",
  // opposing-argument-prediction
  "may argue",
  "could argue",
  "might argue",
  "will argue",
  "may contend",
  "could contend",
  "might contend",
  "may assert",
  "could assert",
  "might assert",
  "may allege",
  "could allege",
  "might allege",
  "may deny",
  "could deny",
  "might deny",
  "will deny",
  "may dispute",
  "could dispute",
  "might dispute",
  "may maintain",
  "could maintain",
  "might maintain",
  "opposing side",
  "opposing counsel may",
  "other side may",
  "strongest response",
  "strongest argument",
  // case-strength / viability / outcome grading
  "viability",
  "viable",
  "non-viable",
  "not viable",
  "tenable",
  "untenable",
  "meritorious",
  "lacks merit",
  "meritless",
  "well-founded",
  "unfounded",
  "compelling",
  "persuasive",
  "unpersuasive",
  "credible",
  "not credible",
  "strong claim",
  "weak claim",
  "strong evidence",
  "weak evidence",
  "helps your case",
  "hurts your case",
  "supports your claim",
  "undermines your claim",
  "strengthens your case",
  "weakens your case",
  "open-and-shut",
  "slam dunk",
  "clear-cut case",
  "good case",
  "bad case",
  "solid case",
  "winnable",
  "likely to succeed",
  "likely to win",
  "unlikely to succeed",
  "unlikely to win",
  "may succeed",
  "could succeed",
  "might succeed",
  "may fail",
  "could fail",
  "might fail",
  "may be dismissed",
  "could be dismissed",
  "might be dismissed",
  "will be dismissed",
  "may be denied",
  "could be denied",
  "might be denied",
  "will be denied",
  "may be granted",
  "could be granted",
  "might be granted",
  "chances of success",
  "chance of success",
  "prospects of success",
  "probability of success",
  "likely to prevail",
  "unlikely to prevail",
  "prevail",
  "strong case",
  "weak case",
  "will win",
  "will lose",
  "you'll win",
  "you'll lose",
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
/* ------------------------------------------------------------------ */
/* Interception record (Session 48)                                    */
/* ------------------------------------------------------------------ */

/**
 * WHY THIS EXISTS. The journey battery established that runtime invariant
 * violations read 0 while these sanitizers fired four times in 16 journeys
 * — three of them the identical phrase "may affect the claim's viability",
 * generated independently across three unrelated stories, plus "The
 * defendant may argue the truth of the statement", an opposing-argument
 * prediction the battery's own I3 check never saw.
 *
 * The reason it never saw them is that everything downstream reads
 * POST-sanitizer output. A catch and a clean generation are
 * indistinguishable there: both look like zero violations. So there was no
 * way to tell whether the model was improving, degrading, or being saved by
 * a substring list that happens to contain "viability".
 *
 * The console.error calls beside each record below are the existing
 * convention and are KEPT — they are what a developer sees in a terminal.
 * They carry the field and matched term but NOT the text: in production a
 * console line goes to the hosting provider's logs, outside the Canadian
 * database, and the text is about the user's case (2026-09-28, found while
 * checking the LSO A2I answers). The text stays in the in-memory record.
 * This adds an in-memory record of the same events so a test can assert on
 * them and a human can review them after the run, which a console line
 * cannot support.
 *
 * Deliberately in-memory and bounded, not persisted: these carry user case
 * text, and `docs/PRIVATE_REAL_WORLD_CASE_REVIEW.md` establishes that real
 * case narrative stays out of the repo. Nothing here writes to disk. A
 * harness reads the buffer and decides what to keep.
 */
export type SanitizerInterception = {
  /** Which sanitizer acted, and how. */
  kind: "rejected" | "dropped" | "blanked";
  /** The field or cognition path the text came from. */
  field: string;
  /** The blocked term that matched. */
  matchedTerm: string;
  /** The text that was intercepted, truncated. */
  text: string;
  /** Caller-set label — a journey id, a fixture name, or "(unattributed)". */
  context: string;
  at: string;
};

/** Bounded so a long-running server cannot grow this without limit. */
const MAX_INTERCEPTIONS = 500;
const interceptions: SanitizerInterception[] = [];
let interceptionContext = "(unattributed)";

/** Label subsequent interceptions — e.g. with the journey being run. */
export function setInterceptionContext(context: string): void {
  interceptionContext = context || "(unattributed)";
}

export function getInterceptions(): readonly SanitizerInterception[] {
  return interceptions;
}

export function clearInterceptions(): void {
  interceptions.length = 0;
}

function recordInterception(
  kind: SanitizerInterception["kind"],
  field: string,
  matchedTerm: string | undefined,
  text: string,
): void {
  if (interceptions.length >= MAX_INTERCEPTIONS) return;
  interceptions.push({
    kind,
    field,
    matchedTerm: matchedTerm || "(unknown)",
    text: text.slice(0, 400),
    context: interceptionContext,
    at: new Date().toISOString(),
  });
}

export function sanitizeSummaryText(text: string, fieldName: string): string {
  const result = validateCaseStrengthLanguage(text);
  if (result.valid) return text;
  console.error(`[caseStrengthLanguageValidator] rejected ${fieldName} (matched term "${result.matchedTerm}", ${text.length} chars)`);
  recordInterception("rejected", fieldName, result.matchedTerm, text);
  return "A summary of the saved facts is available in the case details below.";
}

/**
 * For arrays of short free-text items (risk explanations, warnings, next
 * actions): drops any item that fails the check rather than replacing it,
 * since a shorter list still reads as complete in a way a blanked-out
 * summary field would not. Never throws.
 */
export function sanitizeTextArray(items: string[], fieldName: string): string[] {
  return items.filter((item) => {
    const result = validateCaseStrengthLanguage(item);
    if (result.valid) return true;
    console.error(`[caseStrengthLanguageValidator] dropped ${fieldName} item (matched term "${result.matchedTerm}", ${item.length} chars)`);
    recordInterception("dropped", fieldName, result.matchedTerm, item);
    return false;
  });
}

/**
 * The single choke point: recursively walks a raw, untyped AI cognition
 * object (whatever shape GptCognitionOutput happens to be, including any
 * nested arrays/objects added later) and blanks any string value that fails
 * the check, in place of every downstream field having its own ad hoc
 * sanitizeSummaryText()/sanitizeTextArray() call. Safe by construction: the
 * codebase's existing pattern is `clean(x) || fallback` for single fields
 * and `cleanList([...])` for arrays, both of which already treat an empty
 * string as absent, so blanking here is enough -- no caller needs to change.
 * Call this once, immediately after JSON.parse() on the raw model response,
 * before any buildXxx() mapper reads a single field from it.
 */
export function sanitizeCognitionOutput<T>(raw: T, path = "cognition"): T {
  if (typeof raw === "string") {
    const result = validateCaseStrengthLanguage(raw);
    if (result.valid) return raw;
    console.error(`[caseStrengthLanguageValidator] blanked ${path} (matched term "${result.matchedTerm}", ${String(raw).length} chars)`);
    recordInterception("blanked", path, result.matchedTerm, raw);
    return "" as unknown as T;
  }

  if (Array.isArray(raw)) {
    return raw.map((item, index) => sanitizeCognitionOutput(item, `${path}[${index}]`)) as unknown as T;
  }

  if (raw && typeof raw === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      out[key] = sanitizeCognitionOutput(value, `${path}.${key}`);
    }
    return out as T;
  }

  return raw;
}
