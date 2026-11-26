/**
 * THE NEW SMALL CLAIMS FLOW'S WORDS, BY ID (site owner, 26 Nov 2026: one shared place for every piece of user text).
 *
 * The screens of app/builder/_flow/ read their words from here only. Plain words; states no law. A form's number is the
 * form the owner named (Form 10A), shown as not covered yet; no other statement is made about it.
 */
import { QUESTIONS_PAGE_HEADING } from "./askCopy";

export const FLOW_STEP_HEADINGS = {
  reading: "Here is what we understood",
  questions: QUESTIONS_PAGE_HEADING,
  review: "Check everything before you continue",
  forms: "Your forms",
} as const;

/** The Understood step. */
export const UNDERSTOOD_INTRO = "We read your story. Check each line: say Yes if it is right, or tell us it is not.";
export const UNDERSTOOD_YES_ALL = "Yes, all of this is right";
export const UNDERSTOOD_NOTHING = "We did not find anything in your story to check here.";
export const FLOW_CONTINUE = "Continue";

/** The Questions page. */
export const QUESTIONS_LEFT = (count: number) => (count === 1 ? "1 question left" : `${count} questions left`);
export const QUESTIONS_NONE_LEFT = "Nothing is left to ask for now.";
export const QUESTIONS_SAVE = "Save my answers";
/** A yes-or-no question's two answers, saved as these words (the old review's own values, IntakeReviewPanel.tsx). */
export const FLOW_YES_NO = ["Yes", "No"] as const;

/** The Review step. */
export const REVIEW_INTRO = "This is everything your case holds now. Change anything that is not right.";
export const REVIEW_CONFIRM = "Continue";

/** The Forms step. */
export const FORM_NOT_COVERED = (form: string) => `${form}: not covered yet.`;
export const EVIDENCE_HEADING = "Evidence people often gather for this kind of claim";
export const EVIDENCE_GENERAL = "General information for this kind of claim. It does not look at your own facts.";
