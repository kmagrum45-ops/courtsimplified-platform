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
/** The Understood step's lines for facts with no slot of their own (flow/storyStated.ts STATED_EXTRAS). */
export const UNDERSTOOD_EXTRA_LABELS = { paymentHistory: "What was paid", settlementEfforts: "What you have tried to settle it" } as const;

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

/** The Forms step's way on to the results step (site owner, 27 Nov 2026: "Forms leads nowhere", acceptance rule (t)). */
export const FLOW_SEE_NEXT_STEP = "See your next step";

/** The results step (block table, approved 27 Nov 2026). Headings only: every line under them is the catalogue's or the
 * stage map's own stored text. */
export const RESULTS_HEADINGS = {
  deadlines: "Deadlines",
  checklist: "What you will need to show",
  law: "The law for this kind of claim",
  considerations: "What the other side may raise",
  notes: "Rules about this kind of claim",
  next: "What you can do next",
  sources: "Sources",
} as const;
/** A source's verified date, as the site writes it elsewhere ("verified 2026-10-06"). */
export const RESULTS_VERIFIED = (date: string) => `verified ${date}`;
/** "What you can do next": the old results page's own button words (builder page, old block 12), plus the way back to Review. */
export const RESULTS_ACTIONS = { casePage: "Open your case page", documents: "Add documents and evidence", forms: "Check official forms", change: "Change your answers" } as const;
/** Before the kind of claim is confirmed nothing from the catalogue shows (hidden by default). */
export const RESULTS_NO_KIND = "Confirm the kind of claim on the review to see what applies to it.";
/** Opens every snow-and-ice notice line in the deadlines block (site owner, 27 Nov 2026), before the item's own words. */
export const SNOW_ICE_OPENING = "If snow or ice was involved:";
