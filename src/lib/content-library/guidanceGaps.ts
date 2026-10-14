/**
 * WHERE THE SITE HAS NO GUIDANCE FOR WHAT THE STORY RAISES, IT SAYS SO
 * (walkthrough run 38593464953, FR limits).
 *
 * A father served with a parenting application wrote "she wants sole custody
 * and wants to move to ottawa with her". The pages gave him the answer, its
 * forms and its deadline, and Form 35.1 said "We cannot fill this one in for
 * you yet" -- but nothing said that the site has no step-by-step guidance on
 * the move itself, or where to turn for it. The beta finish line's "limits"
 * check: a case the site cannot fully handle says so and points to help.
 *
 * One plain line per gap, only when the person's own words (or the issue
 * they ticked) raise it, with the existing help pointer (GetHelp). Each line
 * says only what the SITE does not cover. It states no law, so it needs no
 * source (CLAUDE.md s. 2), and it says nothing about how the case will go
 * (s. 3).
 *
 * Pure: no I/O.
 */

export type GuidanceGap = {
  id: "relocation";
  /** The one line: what the site does not cover yet. */
  say: string;
  /** The heading of the help pointer under it (GetHelp). */
  helpHeading: string;
  /** Why the help is offered, in one plain sentence. */
  why: string;
};

/*
 * Moving with a child (review of 6e7c257: the first pattern took "she moved
 * to Toronto with her new partner" and "she relocated her business"). Each
 * sentence is read on its own:
 *
 *   - "move ... with" a child named in so many words ("with the kids",
 *     "with our son");
 *   - "move ... with her / him / them" only when the pronoun ends the
 *     sentence or is followed by "to <place>" -- never by a noun ("with her
 *     new partner", "with her sister") -- and the person's words name a child;
 *   - "take our daughter away", "take the kids to live in ...";
 *   - "relocat..." only with a family word in the same sentence (a child,
 *     custody, parenting), or the intake's issue value "relocation".
 */
const CHILD_WORD = /\b(?:kids?|child|children|sons?|daughters?|daugters?|baby|babies)\b/i;
const FAMILY_WORD = /\b(?:kids?|child|children|sons?|daughters?|daugters?|baby|babies|custody|parenting)\b/i;
const CHILD_NP = "(?:the|my|our|his|her|their)\\s+(?:\\w+\\s+)?(?:kids?|child|children|sons?|daughters?|daugters?|baby)\\b";
const MOVE = "\\bmov(?:e|es|ed|ing)\\s+(?:away\\s+|out of (?:town|the city|the province|province|the country)\\s+|(?:to|across)\\s+[\\w.'-]+(?:\\s+[\\w.'-]+)?\\s+)?with\\s+";
const MOVE_WITH_CHILD = new RegExp(`${MOVE}${CHILD_NP}`, "i");
/** The pronoun at the end of the sentence, or before "to <place>": never before a noun. */
const MOVE_WITH_PRONOUN = new RegExp(`${MOVE}(?:her|him|them)(?=\\s*$|\\s*[,;:]|\\s+to\\s+[a-z])`, "i");
const TAKE_CHILD_AWAY = new RegExp(`\\b(?:take|takes|taking|took)\\s+${CHILD_NP}\\s+(?:away\\b|out of (?:the )?(?:province|country)\\b|to\\s+live\\b)`, "i");
const RELOCATE = /\brelocat\w*/i;
const RELOCATION_ISSUE = /"relocation"/;

/** The person's words raise moving with a child. */
export function raisesRelocation(words: string): boolean {
  if (RELOCATION_ISSUE.test(words)) return true;
  const childNamed = CHILD_WORD.test(words);
  return words
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .some(
      (sentence) =>
        MOVE_WITH_CHILD.test(sentence) ||
        TAKE_CHILD_AWAY.test(sentence) ||
        (childNamed && MOVE_WITH_PRONOUN.test(sentence)) ||
        (RELOCATE.test(sentence) && FAMILY_WORD.test(sentence)),
    );
}

export const RELOCATION_GAP: GuidanceGap = {
  id: "relocation",
  say: "We do not have step-by-step guidance on moving with a child yet.",
  helpHeading: "Help with the move",
  // A family lawyer, not "a lawyer or paralegal": a paralegal's family scope is limited (review of 6e7c257).
  why: "A family lawyer can go through the move and what it means for your case with you.",
};

/** The gaps the person's words raise, for a court whose guidance this covers. */
export function guidanceGapsFor(court: string, words: string): GuidanceGap[] {
  if (court !== "family") return [];
  return raisesRelocation(words) ? [RELOCATION_GAP] : [];
}
