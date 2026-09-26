/**
 * CHAT ITEM 7 — presentation help, LEVEL 1 ONLY.
 *
 * *** WHAT LEVEL 1 IS, AND WHERE IT STOPS ***
 *
 * Helping somebody ORGANISE what they already have, and telling them what the
 * official guide says to bring and do. Nothing else.
 *
 *   IN    the court's own checklists, quoted, with the provision or guide behind
 *         each item
 *   IN    putting their recorded events in the order they happened
 *   IN    flagging what is missing: no date recorded, no evidence recorded, a
 *         list not yet served
 *
 *   OUT   rewriting a word they wrote
 *   OUT   what to emphasise, what to leave out, which point is strongest
 *   OUT   anything about how it will go
 *
 * The middle line is the one that needs stating. "Organise your story
 * chronologically" is not our advice and not a judgment about their case — it is
 * what the Ministry's own guide tells every self-represented person, in those
 * words, and it is quoted below with its source. "Lead with the contract and
 * leave out the argument about the fence" would be strategy, and this module
 * does not have a function that could produce it.
 *
 * *** WHY THE NO-REWRITE RULE IS A PROPERTY AND NOT A PROMISE ***
 *
 * `structureStory` returns the user's own event descriptions, reordered. Never
 * edited, never summarised, never merged. `test:presentation-help` asserts that
 * the output strings are a PERMUTATION of the input strings — so a future change
 * that starts "tidying" what somebody wrote fails a check rather than passing a
 * review.
 *
 * That is the difference between a rule in a prompt and a rule in the code. This
 * module makes no model call at all.
 */

import type { RuleCitation } from "../case-system/stage-map/citations";
import * as C from "../case-system/stage-map/citations";

/**
 * One thing to do or bring, with the text that says so.
 *
 * `quote` is checked against the vendored corpus by `test:presentation-help`,
 * the same gate every stage answer passes. An item whose quote is not in the
 * sources is not a checklist item, it is our opinion about preparation.
 */
export type PresentationItem = {
  id: string;
  /** What the person does. Plain, imperative, no law. */
  text: string;
  /** The passage that supports it, verbatim from a vendored source. */
  quote: string;
  sourceId: string;
  /** The provision, where one imposes this rather than the guide recommending it. */
  citation?: RuleCitation;
};

export type PresentationChecklist = {
  id: string;
  title: string;
  /** Which hearing this is for. */
  occasion: "settlement-conference" | "trial";
  items: PresentationItem[];
};

const GUIDE = "guide-getting-ready-for-court";

/**
 * Getting ready for a settlement conference.
 *
 * The disclosure item is the one with a rule behind it rather than a
 * recommendation: r. 13.03 (2) sets 14 days, counted BACKWARDS from the
 * conference, and the deadline engine renders that date wherever the conference
 * date is known.
 */
export const SETTLEMENT_CONFERENCE_CHECKLIST: PresentationChecklist = {
  id: "presentation:settlement-conference",
  title: "Getting ready for your settlement conference",
  occasion: "settlement-conference",
  items: [
    {
      id: "presentation:sc:serve-witness-list",
      text:
        "Fill out the List of Proposed Witnesses (Form 13A), serve it on every other " +
        "party, and file it with the court.",
      quote:
        "At least 14 days before the date of the settlement conference, the plaintiff and the defendant must fill out the form and serve it on each other as well as any other party involved and file the documents with the court.",
      sourceId: GUIDE,
      citation: C.R_13_03_DISCLOSURE,
    },
    {
      id: "presentation:sc:no-witnesses-attend",
      text:
        "Do not bring your witnesses to the settlement conference. Be ready to say " +
        "briefly what each of them would say at a trial.",
      quote:
        "You should not bring any witnesses to the settlement conference, but you should be prepared to briefly explain what your witnesses will say if they come to the trial.",
      sourceId: GUIDE,
    },
    {
      id: "presentation:sc:bring-documents",
      text: "Bring the documents you are relying on.",
      quote:
        "if you do not have the necessary documents with you, the judge could order you to pay the other party",
      sourceId: GUIDE,
    },
    {
      id: "presentation:sc:attend",
      text: "Attend. If you do not, an order can be made against you.",
      quote:
        "If you do not attend the settlement conference, an order can be made against you, including an order requiring you to pay the other party",
      sourceId: GUIDE,
    },
  ],
};

/**
 * Getting ready for a trial.
 *
 * Taken from the guide's own "Checklist: Getting ready for trial", which is a
 * list the Ministry publishes for exactly this purpose. Where the guide gives a
 * period — 30 days for documents, 10 days for a summons — it is quoted with the
 * number, because a checklist item that drops the number is the half a person
 * cannot act on.
 */
export const TRIAL_CHECKLIST: PresentationChecklist = {
  id: "presentation:trial",
  title: "Getting ready for your trial",
  occasion: "trial",
  items: [
    {
      id: "presentation:trial:review-filed",
      text: "Read the claim, the defence and anything else that has been filed.",
      quote:
        "Review the claim, defence (if any) and any other documents that have been filed.",
      sourceId: GUIDE,
    },
    {
      id: "presentation:trial:list-points",
      text: "List the points you need to prove, and how you will prove each one.",
      quote: "List the points you need to prove.",
      sourceId: GUIDE,
    },
    {
      id: "presentation:trial:serve-documents-30-days",
      text:
        "Serve on every other party the documents and witness statements you will " +
        "use, at least 30 days before the trial.",
      quote:
        "serve on all other parties the documents and witness statements that you will use at least 30 days before trial",
      sourceId: GUIDE,
    },
    {
      id: "presentation:trial:summons-10-days",
      text:
        "If you are summonsing a witness, serve the summons and the attendance money " +
        "at least 10 days before the trial.",
      quote:
        "serve a copy of the summons on each witness, together with attendance money, at least 10 days before the trial",
      sourceId: GUIDE,
    },
    {
      id: "presentation:trial:three-copies",
      text:
        "Bring the original documents and at least three copies of each: one for the " +
        "judge, one for the other party, one for you.",
      quote:
        "You should bring the original documents and at least three copies of each document to the trial.",
      sourceId: GUIDE,
    },
    {
      id: "presentation:trial:questions-for-witnesses",
      text: "Write out the questions you want to ask your own witnesses and theirs.",
      quote: "Prepare a list of questions for your witnesses.",
      sourceId: GUIDE,
    },
    {
      id: "presentation:trial:arrive-early",
      text:
        "On the day, give yourself plenty of time to get to the courthouse and find " +
        "your courtroom.",
      quote:
        "On your trial date, dress appropriately and give yourself plenty of time to travel to the courthouse and find your courtroom.",
      sourceId: GUIDE,
    },
  ],
};

export const PRESENTATION_CHECKLISTS: PresentationChecklist[] = [
  SETTLEMENT_CONFERENCE_CHECKLIST,
  TRIAL_CHECKLIST,
];

/**
 * Why the story-structuring flow orders events by date.
 *
 * Quoted rather than asserted, because "tell it in order" is the one piece of
 * presentation guidance in this module that could be mistaken for our own advice
 * about how to run a case. It is not ours. It is what the guide tells every
 * self-represented person, and this is the sentence.
 */
export const CHRONOLOGICAL_ORDER_BASIS = {
  quote:
    "Usually the best way to organize a story is in the order that the events actually happened.",
  sourceId: GUIDE,
};

/**
 * What a gap flag may say.
 *
 * CLAUDE.md §3 draws this line and these are its own examples: "no evidence
 * recorded for this issue", "this document is missing", "this date is
 * unconfirmed" are allowed; anything grading the merits is not.
 *
 * So a flag reports the PRESENCE OR ABSENCE of something in the record and
 * stops. It never says the gap matters more or less than another gap, never
 * orders them by importance, and never says what the absence means for how the
 * case will go — all three of which would be assessment wearing a checklist's
 * clothes.
 */
export type GapFlag = {
  id: string;
  /** What is not recorded. Never what it costs them. */
  text: string;
  /** Why the record has a place for it, where a rule or the guide says so. */
  because: PresentationItem | null;
};
