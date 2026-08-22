/**
 * Shared "do not ask what the intake already recorded" filter.
 *
 * The builder's "What to confirm next" card, and the question lists feeding it,
 * were each deciding independently what to ask, and none of them checked the
 * facts the user had already entered. That produced questions the case file
 * already answered: a Small Claims matter with a default judgment recorded was
 * still asked whether the defendant filed a Defence (a default judgment only
 * exists because one was not), and a Family matter with an Application, Answer
 * and Financial Statement recorded was still asked "Has anything already been
 * filed?".
 *
 * The rule table lives here once so a fourth caller cannot reintroduce the gap
 * with its own copy. Callers reach it two ways depending on what they hold:
 * `filingFactsFromDocuments` for structured intake tokens, and
 * `filingFactsFromNarrative` for the canonical narrative text, which is all the
 * brain has. Both produce the same shape, and one predicate decides.
 */

/** What the recorded documents already establish about procedural posture. */
export type RecordedFilingFacts = {
  anythingFiled: boolean;
  anythingServed: boolean;
  defenceOnRecord: boolean;
  defaultJudgmentOnRecord: boolean;
};

export const EMPTY_FILING_FACTS: RecordedFilingFacts = {
  anythingFiled: false,
  anythingServed: false,
  defenceOnRecord: false,
  defaultJudgmentOnRecord: false,
};

/**
 * Selections that record the absence of a filing. Callers pass either the token
 * ("nothing") or the human label ("Nothing filed yet", "Not sure"), so both
 * spellings are recognised here rather than only in the narrative reader.
 */
const NON_FILING_PATTERN =
  /^(nothing( filed yet)?|none( selected)?|not[-\s]?sure( what has been filed)?|n\/a|-)?$/i;

function isNonFiling(token: string): boolean {
  return NON_FILING_PATTERN.test(token.trim());
}

/**
 * A responding pleading, across all three vocabularies. Family's "answer" is
 * the Family equivalent of a Defence, so it answers the same question.
 */
const DEFENCE_TOKENS = new Set(["defence", "statement-defence", "answer"]);

/** A judgment on the record. Default judgment implies no Defence was filed. */
const DEFAULT_JUDGMENT_TOKENS = new Set(["default-judgment", "judgment"]);

/** Documents that only exist once something was served or filed and served. */
const SERVED_TOKENS = new Set([
  "affidavit-service",
  "plaintiffs-claim",
  "statement-claim",
  "statement-defence",
  "notice-application",
  "notice-motion",
  "answer",
  "application",
]);

function normalizeToken(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

/**
 * Build filing facts from structured intake document tokens, as held by the
 * builder (filedDocuments for Small Claims and Family, documents for Civil).
 */
export function filingFactsFromDocuments(documents: unknown): RecordedFilingFacts {
  const tokens = (Array.isArray(documents) ? documents : [])
    .map(normalizeToken)
    .filter((token) => token && !isNonFiling(token));

  return {
    anythingFiled: tokens.length > 0,
    anythingServed: tokens.some((token) => SERVED_TOKENS.has(token)),
    defenceOnRecord: tokens.some((token) => DEFENCE_TOKENS.has(token)),
    defaultJudgmentOnRecord: tokens.some((token) => DEFAULT_JUDGMENT_TOKENS.has(token)),
  };
}

/**
 * The labelled line each path writes into the canonical narrative. Small Claims
 * and Civil write human labels ("Form 9A — Defence"), Family writes raw tokens,
 * so the phrase patterns below have to cover both spellings.
 */
const DOCUMENT_LINE_LABELS = [
  "filed or received documents:",
  "existing documents:",
  "existing document signals:",
];

function documentLines(rawUserText: string): string[] {
  const lines = String(rawUserText || "").split(/\r?\n/);

  return lines
    .filter((line) => {
      const lower = line.toLowerCase();
      return DOCUMENT_LINE_LABELS.some((label) => lower.includes(label));
    })
    .map((line) => {
      const lower = line.toLowerCase();
      const label = DOCUMENT_LINE_LABELS.find((entry) => lower.includes(entry)) || "";
      return line.slice(lower.indexOf(label) + label.length).trim();
    });
}

/** One table for both readers, so the two entry points cannot drift apart. */
const EMPTY_DOCUMENT_PHRASES = NON_FILING_PATTERN;

/**
 * Build filing facts from the canonical narrative. This is what
 * courtSimplifiedBrain has: NormalizedIntake carries rawUserText and stage, not
 * the structured document list. Reading a labelled line follows the same
 * approach detectOverLimitClaimAmount already uses in that file.
 */
export function filingFactsFromNarrative(rawUserText: string): RecordedFilingFacts {
  const segments = documentLines(rawUserText);
  if (segments.length === 0) return EMPTY_FILING_FACTS;

  const joined = segments.join("; ");
  const meaningful = segments.some((segment) =>
    segment
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .some((entry) => entry && !EMPTY_DOCUMENT_PHRASES.test(entry)),
  );

  if (!meaningful) return EMPTY_FILING_FACTS;

  return {
    anythingFiled: true,
    anythingServed:
      /affidavit of service|filed\s*\/?\s*(and\s*)?served|already served|\bserved\b|plaintiff'?s claim|statement of claim|notice of (application|motion)|\banswer\b|\bapplication\b/i.test(
        joined,
      ),
    defenceOnRecord: /\bdefence\b|statement of defence|\banswer\b/i.test(joined),
    defaultJudgmentOnRecord: /default judgment|judgment already obtained|\bjudgment\b/i.test(joined),
  };
}

/**
 * Questions the recorded facts already answer. Each entry pairs the question
 * wording produced somewhere in the system with the fact that settles it.
 */
const ANSWERED_WHEN: Array<{
  pattern: RegExp;
  answered: (facts: RecordedFilingFacts) => boolean;
}> = [
  {
    // A default judgment is only available because no Defence was filed, so
    // either a Defence on record or a default judgment settles this.
    pattern: /has the (defendant|respondent) filed a defence\??/i,
    answered: (facts) => facts.defenceOnRecord || facts.defaultJudgmentOnRecord,
  },
  {
    pattern: /has anything already been filed\??/i,
    answered: (facts) => facts.anythingFiled,
  },
  {
    pattern: /has anything already been served\??/i,
    answered: (facts) => facts.anythingServed,
  },
];

/** True when the recorded facts already answer this question. */
export function isQuestionAlreadyAnswered(
  question: string,
  facts: RecordedFilingFacts,
): boolean {
  const text = String(question || "").trim();
  if (!text) return false;

  return ANSWERED_WHEN.some((rule) => rule.pattern.test(text) && rule.answered(facts));
}

/** Drop questions the recorded facts already answer, preserving order. */
export function withoutAnsweredQuestions(
  questions: string[],
  facts: RecordedFilingFacts,
): string[] {
  return questions.filter((question) => !isQuestionAlreadyAnswered(question, facts));
}
