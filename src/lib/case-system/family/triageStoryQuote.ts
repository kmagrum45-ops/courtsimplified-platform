/**
 * Page review, 2026-10-07: the family triage asked "Were you and the other
 * person married to each other?" of a mother whose story said "we were never
 * married". The story is quoted beside the question it bears on; the answer
 * is still the user's to give.
 */

/*
 * An unmarried former partner, named as such (walkthrough run 38525903567,
 * FR: "my ex gf took me to court" was followed by "Were you and the other
 * person married to each other?"). Only "my ex ..." or "my former ...": "her
 * ex-boyfriend", "my brother's ex girlfriend" and "my new girlfriend" are
 * someone else, not the other party.
 */
const EX_PARTNER =
  "\\bmy (?:ex[- ]?|former )(?:gf|bf|girl ?friend|boy ?friend|common[- ]law (?:partner|wife|husband|spouse)|partner)\\b";

/**
 * What the user already wrote that bears on a question, quoted so they can
 * answer from it. A quote, never an answer: the record changes only when the
 * user presses one of the buttons (CLAUDE.md section 4).
 */
const STORY_CUES: Record<string, RegExp> = {
  "married-to-other-party": new RegExp(
    `\\b(?:never (?:got |been )?married|(?:were|was)n'?t married|not married|(?:got |were |are |we're )married|my (?:husband|wife|ex-?husband|ex-?wife)|common[- ]law)\\b|${EX_PARTNER}`,
    "i",
  ),
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
    no: new RegExp(`\\b(?:never (?:got |been )?married|(?:were|was)n'?t married|(?:were|are) not married|not married to (?:him|her|each other)|common[- ]law)\\b|${EX_PARTNER}`, "i"),
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

/*
 * The story's answer said as a suggestion to confirm in one click (walkthrough
 * run 38525903567, FR): "From what you told us: not married. Is that right?"
 * Null when the words give no plain answer (storyAnswerFor). Recorded only
 * when the person presses it (CLAUDE.md section 4).
 */
const SUGGESTION_WORDS: Record<string, { yes?: string; no?: string }> = {
  "married-to-other-party": { yes: "you were married to each other", no: "not married" },
  "child-together": { yes: "you have a child together" },
  "case-involves-children": { yes: "the case involves children" },
};

export function storySuggestionFor(questionId: string, story: string | undefined): { value: "yes" | "no"; say: string } | null {
  const value = storyAnswerFor(questionId, story);
  const say = value ? SUGGESTION_WORDS[questionId]?.[value] : undefined;
  return value && say ? { value, say } : null;
}
