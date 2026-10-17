/**
 * Claim-type matcher — identifies which claim type a story resembles.
 *
 * No AI, no network, pure string matching against claimTypes.ts's `signals`
 * field, which is itself annotated "No AI here -- just data."
 *
 * Does not gate question selection -- that remains exclusively
 * selectQuestions.ts's job, driven by `disputeCategory` via
 * questionBank.ts's `appliesWhen`.
 *
 * Note, still not acted on: unlike selectQuestions.ts, this has no built-in
 * `status === "reviewed"` gate. Every ClaimType is currently "draft". Matched
 * claim-type content IS now shown directly to a user (the overview panel's
 * evidence checklist, court points and common defences), so the question that
 * note raises is live rather than hypothetical.
 */

import type { ClaimType } from "./claimTypes";

export type ClaimTypeMatch = {
  claimType: ClaimType;
  matchedSignals: string[];
  /**
   * 2026-09-28. True when at least one signal appeared in the story as a
   * whole phrase. False when the match rests only on content words scattered
   * through the story -- the weaker evidence, and the way a customer's story
   * ("hired... someone else to finish... I want my money back") matched the
   * contractor's unpaid-debt claim. orchestrateIntakeTurn treats a
   * scattered-words-only match as a candidate, not a match.
   */
  exactPhraseMatched: boolean;
};

/**
 * VOCABULARY WARNING FOR ANYONE AUTHORING FAMILY SIGNALS.
 *
 * Ontario's Child Support Guidelines, O. Reg. 391/97, say "parent or spouse"
 * wherever the federal Guidelines, SOR/97-175, say "spouse". The two
 * instruments govern different paths — federal on the Divorce Act path,
 * Ontario on the Family Law Act path — and a signal list built by reading one
 * of them will miss stories written in the other's language.
 *
 * Worse for a matcher specifically: "spouse" is also the word a never-married
 * user is least likely to type about themselves. A signal list that leans on
 * it will fail exactly the population the Ontario regulation exists to serve.
 *
 * This is a difference between two TEXTS, and it stands. It is not part of a
 * two-table warning — there are not two tables. O. Reg. 303/24 revoked
 * Schedule I of the Ontario regulation and pointed its "table" definition at
 * the federal one. See docs/sources/ontario-child-support-guidelines.txt.
 */

/**
 * Words carrying no discriminating power, dropped before a signal is compared
 * to a story so that "false statements about me" can match "the statements she
 * made were false" — same content, different grammar.
 *
 * First-person pronouns are in here deliberately. 88 of the 255 signals (35%)
 * contain one, which meant those signals only matched a story written in that
 * exact grammatical person. A story phrased "what she told the school was
 * untrue" could never match "false statements about me", however close the
 * meaning.
 */
const IGNORED_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "at", "by", "with", "from", "that", "this", "these", "those", "it", "its",
  "is", "are", "was", "were", "be", "been", "being", "do", "did", "does",
  "has", "have", "had", "will", "would", "can", "could", "should",
  "i", "me", "my", "mine", "we", "us", "our", "ours",
  "you", "your", "he", "him", "his", "she", "her", "they", "them", "their",
  "about", "up", "out", "not", "no", "so", "as", "than", "then", "there",
  "things", "thing", "stuff", "people", "someone", "something",
]);

/** Lowercase, drop apostrophes and punctuation, collapse whitespace. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentWords(signal: string): string[] {
  return normalize(signal)
    .split(" ")
    .filter((word) => word.length > 2 && !IGNORED_WORDS.has(word));
}

/** An exact phrase is stronger evidence than the same words scattered. */
const EXACT_PHRASE_SCORE = 3;
const ALL_CONTENT_WORDS_SCORE = 2;

/**
 * How much the story resembles each claim type's signals.
 *
 * WHY THIS IS NO LONGER A PLAIN SUBSTRING MATCH. The previous version required
 * a signal to appear in the story verbatim. 250 of the 255 signals are
 * multi-word phrases and only 5 are single words, so 19 of the 22 claim types
 * could only match a user who happened to type an exact phrase such as
 * "spreading rumors that aren't true". Measured against ten plainly-worded
 * stories — one per claim type, written the way a person actually writes —
 * **0 of 10 matched the right claim type, and none matched anything at all**.
 * The matcher was not brittle; it was inoperative on real prose.
 *
 * Two ways a signal can hit now:
 *   - the whole phrase appears in the story (worth 3), or
 *   - every content word of the phrase appears somewhere in the story, in any
 *     order and any grammatical person (worth 2).
 *
 * WHY THE MARGIN GUARD. A wrong claim type is worse than no claim type: it
 * drives the evidence checklist, the court points, the common defences, and
 * the elements the Statement of Claim is assembled from. So the top scorer
 * must beat the runner-up outright. A tie returns null rather than taking
 * whichever claim type happens to sit earlier in the array — which is what the
 * old code did, silently, as its documented tie-break.
 */
export function matchClaimType(
  storyText: string,
  claimTypes: readonly ClaimType[],
): ClaimTypeMatch | null {
  const story = normalize(storyText);
  if (!story) return null;

  const storyWords = new Set(story.split(" "));

  const scored = claimTypes.map((claimType) => {
    const matchedSignals: string[] = [];
    let score = 0;
    let exactPhrases = 0;

    for (const signal of claimType.signals) {
      const phrase = normalize(signal);

      if (phrase && story.includes(phrase)) {
        matchedSignals.push(signal);
        score += EXACT_PHRASE_SCORE;
        exactPhrases += 1;
        continue;
      }

      // 2026-10-16 live bug: a MULTI-WORD signal that IGNORED_WORDS reduces to
      // a single leftover word is not "all the content words of a phrase" --
      // it's one incidental word. "i never did that" and "i was never there"
      // both reduce to just ["never"], "it wasn't me" to ["wasnt"], "sued for
      // something i did not do" to ["sued"] -- all on defendant-side claim
      // types, all common enough to turn up in an unrelated plaintiff's
      // story. A contractor-deposit story ("...never did the work...") scored
      // on "never" alone and was classified as the DEFENDANT'S "being sued
      // for something you did not do" claim type. A signal AUTHORED as one
      // word (e.g. "defamation", "tripped") is unaffected: it already matches
      // through the exact-phrase check above, which requires the word to
      // actually appear, not merely survive the ignore-list.
      const words = contentWords(signal);
      if (words.length >= 2 && words.every((word) => storyWords.has(word))) {
        matchedSignals.push(signal);
        score += ALL_CONTENT_WORDS_SCORE;
      }
    }

    return { claimType, matchedSignals, score, exactPhrases };
  });

  const ranked = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  if (ranked.length > 1 && ranked[1].score >= ranked[0].score) return null;

  return {
    claimType: ranked[0].claimType,
    matchedSignals: ranked[0].matchedSignals,
    exactPhraseMatched: ranked[0].exactPhrases > 0,
  };
}

/**
 * The "settled" bar every caller that auto-applies a match without asking
 * the person uses: an exact-phrase hit, never a scattered-words-only
 * candidate (see ClaimTypeMatch.exactPhraseMatched). Extracted 2026-10-16 so
 * every auto-apply site shares the one bar rather than re-deriving it --
 * orchestrateIntakeTurn.ts's guided-chat opening story and
 * SmallClaimsIntake.tsx's "Case story" field both call this, not
 * matchClaimType() directly, when the plan is to apply the result without a
 * confirmation step.
 */
export function settledClaimTypeMatch(
  storyText: string,
  claimTypes: readonly ClaimType[],
): ClaimTypeMatch | null {
  const candidate = matchClaimType(storyText, claimTypes);
  return candidate && candidate.exactPhraseMatched ? candidate : null;
}
