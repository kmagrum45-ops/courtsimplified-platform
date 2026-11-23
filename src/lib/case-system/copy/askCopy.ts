/**
 * WHAT A QUESTION SCREEN SAYS WHEN THERE IS NOTHING LEFT TO ASK (owner's Chrome check, 31 Oct).
 *
 * After a case was confirmed and everything was answered, "Answer questions one at a time" showed
 * nothing in Small Claims (only "Send my story" again), and said something else in civil and Family.
 * One sentence, the same in all three courts, read from here by every question screen
 * (GuidedSmallClaimsIntake, GuidedFormChat).
 *
 * Plain words. States no law.
 */
export const NOTHING_LEFT_TO_ASK = "Everything we need for now is already answered.";

/**
 * WHAT EVERY SCREEN SAYS FOR A FACT THE PERSON SAID THEY DO NOT KNOW (site owner, 31 Oct).
 *
 * After "I don't know" or "not sure" (a skip, the words typed, or "I do not know yet"), no screen asks
 * the question again, in any court. Where the fact would be asked, this quiet line shows instead, with
 * a control the person may use to add it (ADD_IT_LATER; the review's through ChangeAnswer, the one
 * change path). Never counted as still to answer, never blocks Confirm.
 */
export const NOT_ANSWERED_YET = "Not answered yet: add it when you know";
/** The control beside NOT_ANSWERED_YET. */
export const ADD_IT_LATER = "Add it";
/**
 * Said where married-only topics are left out because the person answered "I'm not sure" to whether they were married
 * (site owner, 14 Nov 2026, decision A: the owner's own words).
 */
export const MARRIED_UNSURE_NOTE = "You can add this when you know.";
/** The control that shows why a question is asked, and hides it again (the Family triage). */
export const WHY_ASKED_SHOW = "Why is this asked?";
export const WHY_ASKED_HIDE = "Hide why this is asked";
/** The words around a story's value offered for a question: "Is this right: <value>?" (the Family triage). */
export const IS_THIS_RIGHT_BEFORE = "Is this right: ";
export const IS_THIS_RIGHT_AFTER = "?";

/** The children, when the story says there are none ("We have no children"): offered once with Yes / No / Not sure (C9). */
export const NO_CHILDREN = "No children";
/** The case file's "what was agreed" fact, as "What we have so far", the review and Change name it (C9, 23 Nov 2026). */
export const AGREEMENT_TERMS_LABEL = "What was agreed";
