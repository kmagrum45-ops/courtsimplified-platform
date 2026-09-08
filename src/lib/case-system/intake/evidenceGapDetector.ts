/**
 * Session 22 -- evidence gap detection. Given a matched ClaimType and
 * whatever free text the user has said about their evidence, deterministically
 * splits that claim type's evidenceCategories (claimTypes.ts) into
 * "addressed" (a category the text plausibly mentions) and "unaddressed"
 * (not mentioned yet). No AI, no network -- same design posture as
 * claimTypeMatcher.ts: plain keyword overlap, auditable, never swayed by a
 * model's judgment.
 *
 * "Addressed" is deliberately coarse and word-overlap-based, not exact
 * substring matching the way claimTypeMatcher.ts's `signals` check is --
 * evidenceCategories's `name`/`examples` are natural-language phrases
 * ("Written agreement or contract") a real user is very unlikely to type
 * verbatim, unlike claimTypes.ts's `signals`, which were written as
 * substrings to match against. Word overlap is the coarser, still fully
 * deterministic middle ground: it will over-match on generic words shared
 * between categories (e.g. "email" appears in more than one category's
 * examples for some claim types) -- that's a known precision limit of a
 * simple, auditable check, not a bug to chase with heuristics. It never
 * produces a false "this category is confirmed absent" -- an empty or
 * absent evidence text just leaves every category unaddressed, which is
 * the same "no evidence recorded for this issue" framing CLAUDE.md already
 * allows, not a judgment about the category's importance to the case.
 *
 * This module never characterizes whether the user's case needs any given
 * category, never scores completeness, and never ranks categories by
 * importance -- it only reports which of the claim type's own
 * already-sourced evidenceCategories are mentioned versus not yet, same
 * "who does the applying" boundary as the rest of this directory. The
 * category objects returned are the exact ClaimType data (name/why/
 * examples), never new text generated here.
 *
 * Session 25 -- negation awareness. The Session 22 proof caught a real
 * bug: "I never sent a formal invoice... so I don't have that document"
 * was flagged as addressing "Invoice or statement of account" purely
 * because the word "invoice" appeared, with no check for negation. A
 * small, reviewable list of negation trigger words (NEGATION_TRIGGERS
 * below), checked within a bounded word-distance window of the matched
 * keyword (not anywhere in the whole text -- an unrelated negation
 * elsewhere in a longer answer must not suppress a real, separate
 * mention), now suppresses a match instead of counting it as addressed.
 * A negated mention is NOT counted as "confirmed absent" either -- this
 * module has never made that claim and doesn't start now; it's simply
 * left unaddressed, identical to the word never having appeared at all.
 * Deliberately a keyword heuristic, not a parser: it stays imperfect
 * (e.g. double negatives, or negation further than the window away,
 * aren't handled), same "known precision limit, not a bug to chase with
 * heuristics" posture as the word-overlap matching itself.
 */

import type { ClaimType, EvidenceCategory } from "./claimTypes";

export type EvidenceGuidance = {
  claimTypeId: string;
  claimTypeName: string;
  /** Categories the given text plausibly mentions. */
  addressedCategories: EvidenceCategory[];
  /** Categories not yet mentioned in the given text. */
  unaddressedCategories: EvidenceCategory[];
};

const STOPWORDS = new Set([
  "a", "an", "the", "of", "or", "and", "to", "for", "with", "your", "you",
  "if", "this", "that", "these", "those", "is", "are", "was", "were", "in",
  "on", "at", "from", "by", "it", "its", "as", "be", "been", "being", "not",
  "any", "all", "what", "when", "where", "who", "how",
]);

/** Lowercased, punctuation-stripped, stopword-filtered words, 3+ letters. */
function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

function categoryKeywords(category: EvidenceCategory): Set<string> {
  return extractKeywords([category.name, ...category.examples].join(" "));
}

// Single trigger WORDS, not multi-word phrases -- "do not have" is caught
// by the standalone "not" trigger, "don't have" by "don't", so no
// separate multi-word entries are needed to cover the task's examples
// ("don't have", "do not have", "never sent", "no [keyword]", "didn't",
// "haven't", "without a"). Deliberately narrow: this is a keyword
// heuristic for ONE common pattern, not a general negation parser.
const NEGATION_TRIGGERS = new Set([
  "no", "not", "never", "without",
  "don't", "dont", "doesn't", "doesnt", "didn't", "didnt",
  "haven't", "havent", "hasn't", "hasnt", "hadn't", "hadnt",
]);

// How many words on either side of a matched keyword count as "nearby"
// for negation purposes. Tuned against the real Session 22 example --
// "i never sent a formal invoice or statement of account" puts "account"
// 8 words after "never" -- while staying a bounded local window, not a
// whole-text scan.
const NEGATION_WINDOW_WORDS = 8;

/**
 * Ordered lowercase word tokens. Punctuation is stripped except internal
 * apostrophes, so a contraction like "don't" survives as one token
 * instead of splitting into "don"/"t" -- unlike extractKeywords() above,
 * order is preserved and stopwords are kept, both needed for the
 * negation-window check.
 */
function tokenizeOrdered(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ""))
    .filter(Boolean);
}

/** Same normalization extractKeywords() applies to a single token, for comparing against categoryKeywords(). */
function bareWord(token: string): string {
  return token.replace(/[^a-z0-9]/g, "");
}

/**
 * True if a negation trigger appears within NEGATION_WINDOW_WORDS words
 * before or after the token at `matchIndex`.
 */
function isNegatedNearby(tokens: readonly string[], matchIndex: number): boolean {
  const start = Math.max(0, matchIndex - NEGATION_WINDOW_WORDS);
  const end = Math.min(tokens.length, matchIndex + NEGATION_WINDOW_WORDS + 1);
  for (let index = start; index < end; index += 1) {
    if (index !== matchIndex && NEGATION_TRIGGERS.has(tokens[index])) return true;
  }
  return false;
}

/**
 * True if any keyword of the category's name/examples appears in the
 * given ordered text tokens, AND that specific occurrence isn't near a
 * negation trigger. A negated occurrence is skipped, not treated as a
 * miss for the whole category -- a later, non-negated mention of the
 * same or a different keyword in the category still counts.
 */
function isAddressed(category: EvidenceCategory, textTokens: readonly string[]): boolean {
  const categoryWords = categoryKeywords(category);
  if (categoryWords.size === 0) return false;

  for (let index = 0; index < textTokens.length; index += 1) {
    const word = bareWord(textTokens[index]);
    if (word.length > 2 && categoryWords.has(word) && !isNegatedNearby(textTokens, index)) {
      return true;
    }
  }
  return false;
}

/**
 * Every distinct evidenceCategory across a claim type's plaintiffElements,
 * deduplicated by name (a future claim type could list the same category
 * name under two elements; this shows it once, not twice).
 */
function collectEvidenceCategories(claimType: ClaimType): EvidenceCategory[] {
  const seen = new Set<string>();
  const categories: EvidenceCategory[] = [];
  for (const element of claimType.plaintiffElements) {
    for (const category of element.evidenceCategories) {
      if (seen.has(category.name)) continue;
      seen.add(category.name);
      categories.push(category);
    }
  }
  return categories;
}

/**
 * Pure function: (matched claim type, evidence-related text so far) ->
 * which of that claim type's evidenceCategories are addressed vs. not.
 * `evidenceText` is caller-supplied -- this function has no opinion on
 * where it came from (a single answer to sc-evidence-available, several
 * turns' worth concatenated, etc.), matching selectQuestions.ts's and
 * claimTypeMatcher.ts's existing philosophy of taking exactly what the
 * caller gives it and nothing from outside its arguments.
 */
export function detectEvidenceGaps(
  claimType: ClaimType,
  evidenceText: string | undefined,
): EvidenceGuidance {
  const textTokens = tokenizeOrdered(evidenceText ?? "");
  const addressedCategories: EvidenceCategory[] = [];
  const unaddressedCategories: EvidenceCategory[] = [];

  for (const category of collectEvidenceCategories(claimType)) {
    if (isAddressed(category, textTokens)) {
      addressedCategories.push(category);
    } else {
      unaddressedCategories.push(category);
    }
  }

  return {
    claimTypeId: claimType.id,
    claimTypeName: claimType.name,
    addressedCategories,
    unaddressedCategories,
  };
}
