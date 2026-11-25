/**
 * THE FAMILY BOXES A QUESTION ASKED IN OTHER WORDS ANSWERS (C9, 23 Nov 2026): one map, read by the case file (caseFile.ts
 * livingSituation, heldLivingSituation) and the review (intakeReview.ts, the answer shown in its box as held). Imports
 * nothing, so neither reader joins an import loop through it.
 */
/** Family boxes the home page's reading or the chat may have asked in other words: the questions that ask what the box asks. */
export const ANSWERED_ELSEWHERE: Record<string, RegExp> = {
  currentLivingSituation: /\bwhere (?:does|do|is) (?:your|the) (?:child|children|kids?|son|daughter)\b[^?]*\b(?:live|living|stay)|\b(?:child|children|kids?|son|daughter)\b[^?]*\b(?:live|lives|living) with\b|\bliving (?:arrangements?|situation)\b|\b(?:parenting|living) arrangements? (?:do you have )?(?:now|currently)\b|\bwhat parenting arrangements?\b|\b(?:child|children|kids?|son|daughter) (?:usually |normally |currently )?(?:live|lives|living) in\b|\bdoes (?:your|the) (?:child|children|kids?|son|daughter) (?:usually |normally |currently )?live\b/i,
};
