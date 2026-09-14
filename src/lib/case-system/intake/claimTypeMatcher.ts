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
};

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

    for (const signal of claimType.signals) {
      const phrase = normalize(signal);

      if (phrase && story.includes(phrase)) {
        matchedSignals.push(signal);
        score += EXACT_PHRASE_SCORE;
        continue;
      }

      const words = contentWords(signal);
      if (words.length > 0 && words.every((word) => storyWords.has(word))) {
        matchedSignals.push(signal);
        score += ALL_CONTENT_WORDS_SCORE;
      }
    }

    return { claimType, matchedSignals, score };
  });

  const ranked = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  if (ranked.length > 1 && ranked[1].score >= ranked[0].score) return null;

  return {
    claimType: ranked[0].claimType,
    matchedSignals: ranked[0].matchedSignals,
  };
}
