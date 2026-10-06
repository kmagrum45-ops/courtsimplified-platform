/**
 * DECISION 5 — the events a deadline can be counted from, and the only dates
 * we ask a user for.
 *
 * *** WHY THE STAGE MAP'S `countFrom` PROSE WAS NOT ENOUGH ***
 *
 * Every deadline already recorded what its clock runs from — "the day of being
 * served with the claim", "the date the claim was issued". That prose is what a
 * person reads, and it is unusable as a key: two deadlines phrase the same
 * event differently ("the day the defendant was served with the claim" and
 * "the day of being served with the claim" are one event seen from two sides),
 * and nothing can join it to an answer a user typed into a form.
 *
 * So each deadline names an event from this catalogue, and this catalogue is
 * the single place that says which real-world moment that is. The stage map's
 * prose stays, because the prose is better for reading and the key is better
 * for arithmetic, and neither is a substitute for the other.
 *
 * *** NOT EVERY EVENT IS A QUESTION WE ASK ***
 *
 * `question: null` means we deliberately do not ask. Two reasons, and they are
 * different:
 *
 *   - "the day the claim was discovered" decides whether the two-year
 *     limitation period has run. WHEN a claim was discovered is a legal
 *     question under Limitations Act s. 5, not a fact a person can simply
 *     report, and a date box labelled "when did you discover the claim?"
 *     invites an answer that then drives a computed date telling them they are
 *     out of time. That is the system applying law to their facts (CLAUDE.md
 *     section 2). The limitation period is shown as a period, with the rule,
 *     and the reader applies it.
 *
 *   - "the occurrence of the injury" is a plain fact and we could ask it. It is
 *     not asked HERE because the pre-suit notice stages sit before intake in
 *     the product and have no case record to read from. Left as a period, and
 *     the event is recorded so that when there is somewhere to ask it, the
 *     wiring is already there.
 *
 * Both are recorded rather than omitted, because an event with no question is
 * information — it says the deadline exists and we are not computing it — and
 * a missing event would just look like an oversight.
 *
 * *** THE DATES ARE OPTIONAL, ALWAYS ***
 *
 * A known date buys a computed date with its working shown. An unknown one
 * costs nothing: the block shows the period, which is what it showed before
 * any of this existed. There is no path where declining to answer produces a
 * worse answer, which is the only way an optional question stays honest.
 */

import { parseIso, type IsoDate } from "./holidays";

export type DeadlineEventKey =
  | "served-with-claim"
  | "claim-issued"
  | "first-defence-filed"
  | "defendants-claim-served"
  | "settlement-conference-date"
  | "judgment-date"
  | "learned-of-default"
  | "trial-judgment-awareness"
  | "action-commenced"
  | "claim-discovered"
  | "injury-occurred"
  // 2026-10-01: civil and family. Recorded, not asked — their deadlines are
  // shown as periods with the rule (computedDeadline.ts skips their regimes).
  | "order-made"
  | "pleadings-closed"
  | "motion-hearing-date"
  | "pre-trial-conference-date"
  | "trial-date"
  | "served-with-application"
  | "served-with-motion-to-change"
  | "case-conference-date"
  // 2026-10-01: civil map review. Recorded, not asked, like the keys above.
  | "defence-served"
  | "defence-time-expired"
  | "own-defence-delivered"
  | "order-came-to-attention"
  | "mediation-session-date"
  | "set-down-for-trial"
  | "struck-off-trial-list"
  | "action-dismissed-for-delay"
  | "served-with-request-to-admit"
  | "served-with-third-party-claim"
  | "third-party-claim-issued"
  | "writ-issued"
  | "served-with-notice-of-appeal"
  | "served-with-motion-material"
  | "discovery-answer-given"
  | "notice-of-appeal-filed"
  | "transcript-ready-notice"
  | "served-with-appeal-materials"
  | "appeal-hearing-date"
  | "leave-motion-record-served"
  | "libel-came-to-knowledge"
  | "evidence-tendered"
  | "served-with-crossclaim"
  | "action-discontinued"
  | "third-party-defence-served"
  | "defence-to-counterclaim-served"
  | "served-with-removal-order"
  | "served-with-amended-pleading"
  // 2026-10-01: family map review. Recorded, not asked, like the keys above.
  | "family-case-started"
  | "marriage-terminated"
  | "spouses-separated"
  | "spouse-died"
  | "answer-served"
  | "motion-form-served"
  | "automatic-order-issued"
  | "financial-statement-due"
  | "family-settlement-conference-date"
  | "trial-management-conference-date"
  | "witness-attendance-date"
  | "disclosure-requested"
  | "notice-of-approaching-dismissal-served"
  | "served-with-notice-of-default-hearing"
  | "motion-to-change-filed"
  | "default-hearing-date"
  | "documents-requested"
  | "costs-submissions-requested"
  | "offer-served"
  | "draft-order-served"
  | "served-with-amended-application"
  | "appellant-record-served"
  | "licence-suspension-first-notice-served"
  | "served-with-notice-of-garnishment"
  | "co-owner-notice-served"
  | "stay-or-dismiss-notice-received"
  | "stay-or-dismiss-submission-received"
  | "childrens-lawyer-report-served"
  | "served-with-request-for-financial-statement"
  | "served-with-order-for-financial-statement"
  | "bjdr-hearing-date"
  | "questioning-date"
  | "financial-examination-date";

export type DeadlineEvent = {
  key: DeadlineEventKey;
  /** Internal label for the moment. The prose a reader sees is the deadline's own `countFrom`. */
  label: string;
  /**
   * The intake question, verbatim, or null where we deliberately do not ask.
   * See the header: the two reasons for null are not the same reason.
   */
  question: string | null;
  /**
   * The question bank id carrying that question, where we ask it.
   *
   * This is the join, and it is the whole of decision 5's wiring: an answer to
   * this question becomes the date this event's deadlines are counted from.
   * Without it the questions would be decorative — a date box whose answer
   * reached nothing — which is what "add date questions to intake" would have
   * produced if it had been read as a UI task.
   */
  questionId?: string;
  /** Present only where `question` is null. Why we are not asking. */
  notAskedBecause?: string;
  /**
   * Where the question is asked. Absent: the Small Claims intake bank
   * (QUESTION_BANK). "case-page": the date questions on the case page, for
   * the step the reader is at (casePosition.dateQuestionsForStep).
   */
  askedOn?: "case-page";
};

/*
 * *** CIVIL AND FAMILY DATES, ASKED ON THE CASE PAGE (2026-10-05) ***
 *
 * Until 2026-10-05 every civil and family event was recorded but not asked,
 * because the engine did not count under those courts' rules. It does now
 * (deadlineEngine.ts), so each of these is asked where the reader picks their
 * step on the case page (casePosition.dateQuestionsForStep), not in the Small
 * Claims intake bank. Each asks for a date on a document or a calendar: the
 * day something was served, filed, issued, scheduled or made.
 *
 * Still not asked, and why, in NOT_ASKED below: a date that is itself a legal
 * conclusion (when spouses separated, when pleadings closed, when someone
 * "learned" of a libel), a date the rules compute rather than one that
 * happened, or an event whose start the rules leave open.
 */
const CASE_PAGE_QUESTIONS: Partial<Record<DeadlineEventKey, string>> = {
  "order-made": "If the court made an order, what date was it made?",
  "motion-hearing-date": "If a motion has been scheduled, what date will it be heard?",
  "pre-trial-conference-date": "If a pretrial conference has been scheduled, what date is it?",
  "trial-date": "If a trial date has been set, what is the first day of trial?",
  "served-with-application": "If you were served with an application, what date was it served?",
  "served-with-motion-to-change": "If you were served with a motion to change, what date was it served?",
  "case-conference-date": "If a case conference has been scheduled, what date is it?",
  "spouse-died": "If your spouse died, what date did they die?",
  "answer-served": "If an answer has been served, what date was it served?",
  "motion-form-served": "If a motion form (Form 14B) was served, what date was it served?",
  "automatic-order-issued": "If the court issued an automatic order, what date is on it?",
  "family-settlement-conference-date": "If a settlement conference has been scheduled in your family case, what date is it?",
  "trial-management-conference-date": "If a trial management conference has been scheduled, what date is it?",
  "disclosure-requested": "If someone asked in writing for more financial information, what date did they ask?",
  "notice-of-approaching-dismissal-served": "If you were served with a notice of approaching dismissal, what date was it served?",
  "served-with-notice-of-default-hearing": "If you were served with a notice of default hearing, what date was it served?",
  "documents-requested": "If another party asked for an affidavit listing documents, what date did they ask?",
  "costs-submissions-requested": "If the court asked for written submissions on costs, what date did it ask?",
  "draft-order-served": "If a draft order was served for approval, what date was it served?",
  "served-with-amended-application": "If you were served with an amended application, what date was it served?",
  "appellant-record-served": "If the appellant's appeal record and factum were served, what date were they served?",
  "licence-suspension-first-notice-served": "If you were served with a first notice that your driver's licence may be suspended, what date was it served?",
  "served-with-notice-of-garnishment": "If you were served with a notice of garnishment, what date was it served?",
  "stay-or-dismiss-notice-received": "If you received a notice that your case or motion may be stayed or dismissed (Form 1.4A), what date did you receive it?",
  "stay-or-dismiss-submission-received": "If you received the other party's written submission about the stay or dismissal, what date did you receive it?",
  "childrens-lawyer-report-served": "If the Children's Lawyer's report was served, what date was it served?",
  "served-with-request-for-financial-statement": "If you were served with a request for a financial statement (Form 27), what date was it served?",
  "served-with-order-for-financial-statement": "If you were served with an order to serve and file a financial statement, what date was it served?",
  "bjdr-hearing-date": "If a binding judicial dispute resolution hearing has been scheduled, what date is it?",
  "questioning-date": "If a questioning has been scheduled, what date is it?",
  "financial-examination-date": "If a financial examination has been scheduled, what date is it?",
  "defence-served": "If a statement of defence was served, what date was it served?",
  "own-defence-delivered": "If you delivered your statement of defence, what date did you deliver it?",
  "mediation-session-date": "If a mediation session has been scheduled, what date is it?",
  "set-down-for-trial": "If the action was set down for trial, what date was it set down?",
  "struck-off-trial-list": "If the action was struck off the trial list, what date was that?",
  "action-dismissed-for-delay": "If the action was dismissed for delay, what date was it dismissed?",
  "served-with-request-to-admit": "If you were served with a request to admit, what date was it served?",
  "served-with-third-party-claim": "If you were served with a third party claim, what date was it served?",
  "third-party-claim-issued": "If a third party claim was issued, what date is on it?",
  "writ-issued": "If a writ of seizure and sale was issued, what date is on it?",
  "served-with-notice-of-appeal": "If you were served with a notice of appeal, what date was it served?",
  "served-with-motion-material": "If you were served with material for a motion in writing, what date was it served?",
  "discovery-answer-given": "If an undertaking was given, or a question taken under advisement, at an examination for discovery, what date was that?",
  "notice-of-appeal-filed": "If a notice of appeal was filed, what date was it filed?",
  "transcript-ready-notice": "If you were told the evidence for the appeal has been transcribed, what date were you told?",
  "served-with-appeal-materials": "If you were served with the appellant's appeal book, exhibit book, transcript and factum, what date were they served?",
  "appeal-hearing-date": "If the appeal has been scheduled, what date will it be heard?",
  "leave-motion-record-served": "If the motion record for leave to appeal was served, what date was it served?",
  "served-with-crossclaim": "If you were served with a statement of defence and crossclaim, what date was it served?",
  "action-discontinued": "If the action was discontinued, what date was it discontinued?",
  "third-party-defence-served": "If the third party's statement of defence in the main action was served on the plaintiff, what date was it served?",
  "defence-to-counterclaim-served": "If a defence to counterclaim was served, what date was it served?",
  "served-with-removal-order": "If you were served with an order removing your lawyer from the record, what date was it served?",
  "served-with-amended-pleading": "If you were served with an amended pleading, what date was it served?",
};

const NOT_ASKED_DEFAULT =
  "not a date a person reads off a document or a calendar; shown as a period with the rule that sets it";

const NOT_ASKED: Partial<Record<DeadlineEventKey, string>> = {
  "pleadings-closed": "when pleadings close is decided under the rules, not reported as a fact",
  "spouses-separated":
    "the date of separation can itself be disputed and decided by the court; computing a limitation date from a typed answer would be this system deciding it",
  "marriage-terminated":
    "a divorce takes effect on the thirty-first day after the judgment, subject to exceptions (Divorce Act s. 12 (1)), so the date on the order is not the date asked for; shown as a period",
  "family-case-started": "recorded; the date the case started is read from the application, which the case page does not yet ask for",
  "financial-statement-due": "a date the rules compute, not one that happened",
  "defence-time-expired": "a date the rules compute, not one that happened",
  "witness-attendance-date": "depends on whose attendance; shown as a period",
  "co-owner-notice-served": "r. 29 (9) holds the money 30 days but does not fix when they start",
  "libel-came-to-knowledge": "when a person learned of a libel is decided under the Libel and Slander Act, not reported as a fact",
  "evidence-tendered": "a step at a future hearing, not a date that has happened",
  // Every deadline counted from these sets no fixed period (count 0), so a
  // date would compute nothing; asking for it would be a question that does
  // nothing with the answer.
  "motion-to-change-filed": "the rule that runs from it sets no fixed number of days",
  "default-hearing-date": "the rule that runs from it sets no fixed number of days",
  "offer-served": "the rule that runs from it sets no fixed number of days",
  "order-came-to-attention": "the rules that run from it set no fixed number of days",
};

export const DEADLINE_EVENTS = {
  "served-with-claim": {
    key: "served-with-claim",
    label: "the day the claim was served",
    question: "If the claim has been served, what date was it served?",
    questionId: "sc-date-claim-served",
  },
  "claim-issued": {
    key: "claim-issued",
    label: "the date the claim was issued",
    question: "If a claim has been issued by the court, what date is on it?",
    questionId: "sc-date-claim-issued",
  },
  "first-defence-filed": {
    key: "first-defence-filed",
    label: "the day the first defence was filed",
    question: "If a defence has been filed, what date was it filed?",
    questionId: "sc-date-defence-filed",
  },
  "defendants-claim-served": {
    key: "defendants-claim-served",
    label: "the day the defendant's claim was served",
    question: "If you were served with a defendant's claim, what date was it served?",
    questionId: "sc-date-defendants-claim-served",
  },
  "settlement-conference-date": {
    key: "settlement-conference-date",
    label: "the date of the settlement conference",
    question: "If a settlement conference has been scheduled, what date is it?",
    questionId: "sc-date-settlement-conference",
  },
  "learned-of-default": {
    key: "learned-of-default",
    label: "the day you learned of the noting in default or the default judgment",
    question: "If you have been noted in default, what date did you find out?",
    questionId: "sc-date-learned-of-default",
  },
  "trial-judgment-awareness": {
    key: "trial-judgment-awareness",
    label: "the day you became aware of the judgment",
    question: "If judgment was made at a hearing you did not attend, what date did you find out?",
    questionId: "sc-date-learned-of-judgment",
  },
  /*
   * Shares a question with `claim-issued`, and shares it deliberately.
   *
   * r. 11.1's two-year dismissal clock runs from the commencement of the
   * action; r. 8.01's six-month service window runs from the date the claim was
   * issued. Those are the same moment — an action is commenced by issuing the
   * claim — and one date is on the document in the reader's hand. Asking twice
   * would invite two answers to one question and a quiet contradiction between
   * two deadlines computed from them.
   */
  "action-commenced": {
    key: "action-commenced",
    label: "the day the action was commenced",
    question: "If a claim has been issued by the court, what date is on it?",
    questionId: "sc-date-claim-issued",
  },

  // ---- recorded, deliberately not asked -----------------------------------

  "claim-discovered": {
    key: "claim-discovered",
    label: "the day the claim was discovered",
    question: null,
    notAskedBecause:
      "when a claim was discovered is decided under Limitations Act s. 5, not reported " +
      "as a fact, and computing a limitation date from a typed answer would be this " +
      "system applying the law to the reader's facts",
    // Still never asked. Since 2026-10-06 (CLAUDE.md "guide like a lawyer",
    // caseSpecificDeadlines in a2iScope.ts) the two-year date is counted from
    // the INJURY date instead, under s. 5 (2)'s presumption and saying so --
    // computedDeadline.ts, template "presumed-discovery-from-injury".
  },
  /*
   * *** THIS WAS THE ONE REAL WIRING GAP, AND IT WAS THE WORST ONE TO HAVE ***
   *
   * It read `question: null`, because "the pre-suit notice stages come before
   * there is a case record to read a date from". That was true of the product
   * before decision 5 and false the moment decision 5 shipped: the route takes
   * `dateAnswers` from any caller, and nothing about a notice stage stops us
   * asking when somebody fell.
   *
   * Which left the three deadlines that BAR THE CLAIM — municipal 10 days,
   * Toronto 10 days, occupiers 60 days — as the only ones in the product that
   * could never show a date, when they are the ones where a date matters most.
   * A person with ten days does not need "you have 10 days, counted from the
   * occurrence of the injury". They need the day of the month, and they need to
   * be told that under a statute a Saturday does not save them.
   *
   * Unlike `claim-discovered` below, this is a plain fact. What day did you
   * fall. No legal question, nothing for the reader to apply, nothing for us to
   * decide on their behalf.
   */
  "injury-occurred": {
    key: "injury-occurred",
    label: "the day the injury happened",
    question: "If this involves an injury, what date did it happen?",
    questionId: "sc-date-injury",
  },
  "judgment-date": {
    key: "judgment-date",
    label: "the date of the judgment",
    question: null,
    notAskedBecause:
      "The set-aside clocks do not run from it: r. 17.01 (5) gives 30 days after the " +
      "party becomes aware of the judgment, and r. 11.06 requires a motion as soon as is " +
      "reasonably possible after learning of the default, and asking for the judgment " +
      "date could be mistaken for those. Two deadlines DO run from it (2026-10-01): a " +
      "motion for a new trial within 30 days after a final order (r. 17.04 (1)) and a " +
      "notice of appeal within 30 days (Rules of Civil Procedure r. 61.04 (1)). It is not " +
      "yet asked at intake, so those are shown as periods with their rules",
  },
  ...Object.fromEntries(
    (
      [
        ["order-made", "the day the order was made"],
        ["pleadings-closed", "the day pleadings closed"],
        ["motion-hearing-date", "the date the motion will be heard"],
        ["pre-trial-conference-date", "the date of the pretrial conference"],
        ["trial-date", "the first day of trial"],
        ["served-with-application", "the day the application was served"],
        ["served-with-motion-to-change", "the day the motion to change was served"],
        ["case-conference-date", "the date of the case conference"],
        ["family-case-started", "the day the family case was started"],
        ["marriage-terminated", "the day the marriage was ended by divorce or a judgment of nullity"],
        ["spouses-separated", "the day the spouses separated with no reasonable prospect of living together again"],
        ["spouse-died", "the day the first spouse died"],
        ["answer-served", "the day the answer was served"],
        ["motion-form-served", "the day the motion form (Form 14B) was served"],
        ["automatic-order-issued", "the day the automatic order was issued"],
        ["financial-statement-due", "the day the financial statement was due to be served"],
        ["family-settlement-conference-date", "the date of the family settlement conference"],
        ["trial-management-conference-date", "the date of the trial management conference"],
        ["witness-attendance-date", "the day the witness must be in court or at a questioning"],
        ["disclosure-requested", "the day additional financial information was requested in writing"],
        ["notice-of-approaching-dismissal-served", "the day the notice of approaching dismissal was served"],
        ["served-with-notice-of-default-hearing", "the day the payor was served with the notice of default hearing"],
        ["motion-to-change-filed", "the day the motion to change was filed"],
        ["default-hearing-date", "the date of the default hearing"],
        ["documents-requested", "the day another party requested an affidavit listing documents"],
        ["costs-submissions-requested", "the day the court required written submissions on costs"],
        ["offer-served", "the day the offer to settle was served"],
        ["draft-order-served", "the day a draft order was served for approval"],
        ["served-with-amended-application", "the day the amended application was served"],
        ["appellant-record-served", "the day the appellant's appeal record and factum were served"],
        ["licence-suspension-first-notice-served", "the day the first notice of driver's licence suspension was served"],
        ["served-with-notice-of-garnishment", "the day the notice of garnishment was served"],
        ["co-owner-notice-served", "the notice to co-owner of debt (r. 29 (9) holds the money 30 days but does not fix when they start)"],
        ["stay-or-dismiss-notice-received", "the day the notice that the case or motion may be stayed or dismissed (Form 1.4A) was received"],
        ["stay-or-dismiss-submission-received", "the day a copy of the other party's written submission under rule 1.4 was received"],
        ["childrens-lawyer-report-served", "the day the Children's Lawyer's report was served"],
        ["served-with-request-for-financial-statement", "the day the request for a financial statement (Form 27) was served"],
        ["served-with-order-for-financial-statement", "the day the order to serve and file a financial statement was served"],
        ["bjdr-hearing-date", "the date of the binding judicial dispute resolution hearing"],
        ["questioning-date", "the date set for questioning a person"],
        ["financial-examination-date", "the date of the financial examination"],
        ["defence-served", "the day the statement of defence was served"],
        ["defence-time-expired", "the day the time to deliver a defence ran out"],
        ["own-defence-delivered", "the day this defendant delivered their statement of defence"],
        ["order-came-to-attention", "the day the order came to the person's attention"],
        ["mediation-session-date", "the date of the mediation session"],
        ["set-down-for-trial", "the day the action was set down for trial"],
        ["struck-off-trial-list", "the day the action was struck off the trial list"],
        ["action-dismissed-for-delay", "the day the action was dismissed for delay"],
        ["served-with-request-to-admit", "the day the request to admit was served"],
        ["served-with-third-party-claim", "the day the third party claim was served"],
        ["third-party-claim-issued", "the day the third party claim was issued"],
        ["writ-issued", "the day the writ of seizure and sale was issued"],
        ["served-with-notice-of-appeal", "the day the notice of appeal was served"],
        ["served-with-motion-material", "the day the moving party's material for a motion in writing was served"],
        ["discovery-answer-given", "the day an undertaking was given, or a question taken under advisement, at an examination for discovery"],
        ["notice-of-appeal-filed", "the day the notice of appeal was filed"],
        ["transcript-ready-notice", "the day notice was received that the evidence for the appeal has been transcribed"],
        ["served-with-appeal-materials", "the day the appellant's appeal book, exhibit book, transcript and factum were served"],
        ["appeal-hearing-date", "the date the appeal will be heard"],
        ["leave-motion-record-served", "the day the moving party's motion record for leave to appeal was served"],
        ["libel-came-to-knowledge", "the day the libel came to the knowledge of the person defamed"],
        ["evidence-tendered", "the day the record or report is tendered in evidence"],
        ["served-with-crossclaim", "the day the statement of defence and crossclaim was served"],
        ["action-discontinued", "the day the action was discontinued"],
        ["third-party-defence-served", "the day the third party's statement of defence in the main action was served on the plaintiff"],
        ["defence-to-counterclaim-served", "the day the defence to counterclaim was served"],
        ["served-with-removal-order", "the day the client was served with the order removing their lawyer from the record"],
        ["served-with-amended-pleading", "the day the amended pleading was served"],
      ] as const
    ).map(([key, label]) => {
      const question = CASE_PAGE_QUESTIONS[key as DeadlineEventKey];
      return [
        key,
        question
          ? { key, label, question, questionId: `case-date-${key}`, askedOn: "case-page" as const }
          : { key, label, question: null, notAskedBecause: NOT_ASKED[key as DeadlineEventKey] ?? NOT_ASKED_DEFAULT },
      ];
    }),
  ),
} as Record<DeadlineEventKey, DeadlineEvent>;

/** The dates a case is known to have. Every one optional, all ISO. */
export type CaseDates = Partial<Record<DeadlineEventKey, IsoDate>>;

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * Turns whatever a user typed into an ISO date, or nothing.
 *
 * *** AMBIGUITY IS REFUSED, NOT GUESSED ***
 *
 * "03/04/2026" is 3 April to most of the world and 4 March to some of it, and
 * nothing in the string says which. A guess here is a deadline out by a month,
 * presented as computed, with the rule cited beside it — the most credible
 * wrong answer this product could give. So anything but an unambiguous date
 * returns null, the date stays unknown, and the block shows the period.
 *
 * Accepted: 2026-04-03, 3 April 2026, April 3 2026, 3 Apr 2026.
 * Refused: 03/04/2026, "last Tuesday", "early March", "about 3 weeks ago".
 *
 * A refusal is not an error and is not shown as one. The reader simply gets
 * what they would have got without answering.
 */
export function parseUserDate(input: string): IsoDate | null {
  const text = input.trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!text) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return validated(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const monthName = MONTHS.map((month) => month.slice(0, 3)).join("|");

  // 3 April 2026 / 3 Apr 2026 / 3rd April 2026
  const dayFirst = new RegExp(
    `^(\\d{1,2})(?:st|nd|rd|th)? (${monthName})[a-z]* (\\d{4})$`,
  ).exec(text);
  if (dayFirst) {
    return validated(Number(dayFirst[3]), monthNumber(dayFirst[2]), Number(dayFirst[1]));
  }

  // April 3 2026 / Apr 3rd 2026
  const monthFirst = new RegExp(
    `^(${monthName})[a-z]* (\\d{1,2})(?:st|nd|rd|th)? (\\d{4})$`,
  ).exec(text);
  if (monthFirst) {
    return validated(Number(monthFirst[3]), monthNumber(monthFirst[1]), Number(monthFirst[2]));
  }

  return null;
}

function monthNumber(prefix: string): number {
  return MONTHS.findIndex((month) => month.startsWith(prefix)) + 1;
}

/** A well-formed date that does not exist — 31 February — is refused too. */
function validated(year: number, month: number, day: number): IsoDate | null {
  const candidate =
    `${String(year).padStart(4, "0")}-` +
    `${String(month).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`;
  try {
    parseIso(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/** Every event we do ask about, for the intake bank and its coverage check. */
export function askedEvents(): DeadlineEvent[] {
  return Object.values(DEADLINE_EVENTS).filter((event) => event.question !== null);
}

/**
 * Turns the answers to the date questions into the dates a deadline runs from.
 *
 * *** THIS IS THE JOIN, AND IT IS THE ONLY ONE ***
 *
 * `answers` is keyed by question bank id, which is what an intake session has.
 * The result is keyed by event, which is what the stage map's deadlines name.
 * Nothing else in the product translates between the two, so there is one place
 * to look when a date shows up against the wrong deadline.
 *
 * An unparseable answer is simply absent from the result. It is not an error and
 * the reader is not told off: they get the period, which is what they would have
 * got without answering at all.
 */
export function caseDatesFrom(answers: Record<string, string | undefined>): CaseDates {
  const dates: CaseDates = {};

  for (const event of Object.values(DEADLINE_EVENTS)) {
    if (!event.questionId) continue;
    const answer = answers[event.questionId];
    if (!answer) continue;
    const parsed = parseUserDate(answer);
    if (parsed) dates[event.key] = parsed;
  }

  return dates;
}
