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
