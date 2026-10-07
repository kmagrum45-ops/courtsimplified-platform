/**
 * Page review, 2026-10-07: the family triage asked "Were you and the other
 * person married to each other?" of a mother whose story said "we were never
 * married". The story is quoted beside the question it bears on; the answer
 * is still the user's to give.
 */

/**
 * What the user already wrote that bears on a question, quoted so they can
 * answer from it. A quote, never an answer: the record changes only when the
 * user presses one of the buttons (CLAUDE.md section 4).
 */
const STORY_CUES: Record<string, RegExp> = {
  "married-to-other-party": /\b(?:never (?:got |been )?married|(?:were|was)n'?t married|not married|(?:got |were |are |we're )married|my (?:husband|wife|ex-?husband|ex-?wife)|common[- ]law)\b/i,
  "child-together": /\b(?:our (?:son|daughter|kids?|child(?:ren)?|baby)|my (?:son|daughter)'?s? (?:father|mother|dad|mom)|(?:son|daughter|kids?|child(?:ren)?) (?:together|with (?:him|her)))\b/i,
  "case-involves-children": /\b(?:son|daughter|kids?|child(?:ren)?|baby|custody|parenting|child support)\b/i,
};

export function storyQuoteFor(questionId: string, story: string | undefined): string | null {
  const cue = STORY_CUES[questionId];
  if (!cue || !story) return null;
  for (const sentence of story.split(/(?<=[.!?])\s+|\n+/)) {
    if (cue.test(sentence)) return sentence.trim();
  }
  return null;
}
