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
 * Moving with a child: "relocation", "relocate", "move to Ottawa with her",
 * "moving away with the kids", the intake's "Relocation / moving with child"
 * issue (its value "relocation"). Not "moved out", "moving on", "moved in
 * with her" or a move with no child named.
 */
const CHILD = "(?:her|him|them|the (?:kids?|child|children|baby)|my (?:son|daughter|daugter|kids?|child|children)|our (?:son|daughter|daugter|kids?|child|children))";
const RELOCATION = new RegExp(
  `\\brelocat\\w*|\\bmov(?:e|es|ed|ing)\\s+(?:away\\s+|out of (?:town|the city|the province|province)\\s+|(?:to|across)\\s+[\\w.'-]+(?:\\s+[\\w.'-]+)?\\s+)?with\\s+${CHILD}\\b|\\b(?:take|takes|taking|took)\\s+${CHILD}\\s+(?:away\\s+)?to\\s+(?:live\\s+in\\s+)?[A-Za-z]`,
  "i",
);

export const RELOCATION_GAP: GuidanceGap = {
  id: "relocation",
  say: "We do not have step-by-step guidance on moving with a child yet.",
  helpHeading: "Help with the move",
  why: "A lawyer or paralegal can go through the move and what it means for your case with you.",
};

/** The gaps the person's words raise, for a court whose guidance this covers. */
export function guidanceGapsFor(court: string, words: string): GuidanceGap[] {
  if (court !== "family") return [];
  return RELOCATION.test(words) ? [RELOCATION_GAP] : [];
}
