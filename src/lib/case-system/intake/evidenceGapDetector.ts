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

/** True if any keyword of the category's name/examples appears in the given text's keywords. */
function isAddressed(category: EvidenceCategory, textKeywords: ReadonlySet<string>): boolean {
  if (textKeywords.size === 0) return false;
  for (const word of categoryKeywords(category)) {
    if (textKeywords.has(word)) return true;
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
  const textKeywords = extractKeywords(evidenceText ?? "");
  const addressedCategories: EvidenceCategory[] = [];
  const unaddressedCategories: EvidenceCategory[] = [];

  for (const category of collectEvidenceCategories(claimType)) {
    if (isAddressed(category, textKeywords)) {
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
