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

/**
 * The answer the person's own words give, for the yes/no questions where the
 * words are unambiguous -- offered as the highlighted choice, never recorded
 * until they press it (CLAUDE.md section 4). Walkthrough, 2026-10-08: three
 * family runs were asked "Were you married?" beside a quote of "My husband and
 * I got married in 2012" or "we were never married", which read as the site
 * not listening. Anything less clear than these phrases offers nothing.
 */
const STORY_ANSWERS: Record<string, { yes?: RegExp; no?: RegExp }> = {
  "married-to-other-party": {
    no: /\b(?:never (?:got |been )?married|(?:were|was)n'?t married|(?:were|are) not married|not married to (?:him|her|each other)|common[- ]law)\b/i,
    // "we got married", not "my ex got married again" (someone else's marriage).
    yes: /\b(?:(?:we|(?:him|her) and i|i and (?:him|her)|(?:my )?(?:husband|wife) and i) got married|i got married to (?:him|her)|(?:we were|we're|we are) married|married (?:him|her) in|my (?:husband|wife|ex-?husband|ex-?wife)\b)/i,
  },
  "child-together": {
    yes: /\b(?:our (?:(?:two|three|four|2|3|4|little|youngest|oldest) )?(?:son|daughter|sons|daughters|kids?|child(?:ren)?|baby|boys|girls)|my (?:son|daughter)'?s? (?:father|mother|dad|mom))\b/i,
  },
  "case-involves-children": {
    yes: /\b(?:son|daughter|sons|daughters|kids?|child(?:ren)?|baby|boys|girls|custody|parenting time|child support)\b/i,
  },
};

export function storyAnswerFor(questionId: string, story: string | undefined): "yes" | "no" | null {
  const cues = STORY_ANSWERS[questionId];
  if (!cues || !story) return null;
  const no = cues.no?.test(story) ?? false;
  const yes = cues.yes?.test(story) ?? false;
  // Both (e.g. "my ex-husband ... we were never married" is contradictory): offer nothing.
  if (yes === no) return null;
  return yes ? "yes" : "no";
}
