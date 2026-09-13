/**
 * The claim type's own evidence categories, surfaced as general information.
 *
 * ---------------------------------------------------------------------------
 * SESSION 48 — THE ADDRESSED/UNADDRESSED SPLIT WAS REMOVED. Do not restore it.
 * ---------------------------------------------------------------------------
 *
 * This module used to split a claim type's evidenceCategories into "addressed"
 * (the text plausibly mentions it) and "unaddressed", by word overlap with a
 * negation window. The UI rendered the first group as:
 *
 *     "Already mentioned in what you've shared: ..."
 *
 * Observed live. The user wrote:
 *
 *     "MY UNCLES EX GIRLFRIEND SENT MESSAGES TO MY DAD AND UNCLE SAYING I WAS
 *      A PROSTITUTE AND ITS NOT TRUE"
 *
 * and the site told them they had already mentioned "Copy of the written notice
 * sent". They had not. The whole match was the single token "sent" — the user
 * sent messages; the category is a written notice sent. Same token, different
 * referent. The negation guard did not help: "NOT" sat 14 tokens away, outside
 * the 8-word window.
 *
 * WHY THIS WAS REMOVED RATHER THAN TUNED. It is a CLAUDE.md section 4 problem,
 * not a precision problem. "Already mentioned in what you've shared" is the
 * site asserting a fact about the user's own file that the user never supplied.
 * The user makes the characterisations; the site records what they actually
 * said. No threshold makes a word-overlap test capable of establishing that a
 * person mentioned a thing, because the distinction between "sent messages"
 * and "sent a written notice" is the referent, not the vocabulary.
 *
 * WHY NOT THE alreadyCovered TREATMENT (71adaa9), which narrowed a similar
 * match to "the term you used" instead of deleting it. That match had a
 * CONSEQUENCE — it suppressed a question — so the user needed to see why
 * something disappeared, and disclosing the token was the minimum honest
 * account of an action already taken. This one had no consequence at all: it
 * was purely informational. There was nothing to explain, so a token-level
 * footnote would still have made the assertion, just more quietly. Disclosure
 * is the right fix for an action; deletion is the right fix for an unnecessary
 * assertion.
 *
 * AGGRAVATING FACT, recorded so it is not rediscovered. Both live callers
 * passed the user's STORY, while this module's contract described
 * "evidence-related text" and its proof script fed it a short evidence answer.
 * A narrative is full of incidental verbs, so production ran the matcher far
 * outside the conditions its own header called a "known precision limit".
 *
 * What remains is the part that was always legitimate: listing the claim type's
 * own sourced evidence categories as general information about situations like
 * this. That is topic surfacing — the user decides whether any of it fits.
 * Nothing here claims the user has, or lacks, any of it.
 */

import type { ClaimType, EvidenceCategory } from "./claimTypes";

export type EvidenceGuidance = {
  claimTypeId: string;
  claimTypeName: string;
  /**
   * Every distinct evidence category for this claim type, in the claim type's
   * own order and words.
   *
   * Deliberately ONE list. There is no "addressed" subset, and adding one back
   * would re-create the defect in the file header — see it before changing
   * this shape.
   */
  categories: EvidenceCategory[];
};

/**
 * Every distinct evidenceCategory across a claim type's plaintiffElements,
 * deduplicated by name (a future claim type could list the same category
 * name under two elements; this shows it once, not twice).
 *
 * Session 34: exported so claimTypeOverviewContent.ts reuses the exact same
 * dedup logic when it needs the same category list (with sourceUrls
 * attached) for IntelligenceOverviewPanel.tsx -- same "reinvents none of
 * their logic" posture as selectQuestions.ts's evaluateFactCondition
 * export in Session 32.
 */
export function collectEvidenceCategories(claimType: ClaimType): EvidenceCategory[] {
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
 * Pure function: a matched claim type -> its own evidence categories as
 * general information.
 *
 * Takes no user text, by design. The previous signature accepted the text it
 * used to match against, and that parameter is gone rather than ignored: a
 * function that accepts the user's words invites someone to start drawing
 * conclusions from them again.
 */
export function buildEvidenceCategoryGuidance(claimType: ClaimType): EvidenceGuidance {
  return {
    claimTypeId: claimType.id,
    claimTypeName: claimType.name,
    categories: collectEvidenceCategories(claimType),
  };
}
