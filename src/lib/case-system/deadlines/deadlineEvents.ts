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
  | "injury-occurred";

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
};

export const DEADLINE_EVENTS: Record<DeadlineEventKey, DeadlineEvent> = {
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
  },
  "injury-occurred": {
    key: "injury-occurred",
    label: "the day the injury happened",
    question: null,
    notAskedBecause:
      "the pre-suit notice stages come before there is a case record to read a date " +
      "from; the event is recorded so the wiring exists when there is",
  },
  "judgment-date": {
    key: "judgment-date",
    label: "the date of the judgment",
    question: null,
    notAskedBecause:
      "NO DEADLINE RUNS FROM IT. Both set-aside clocks run from awareness, not from " +
      "the judgment: r. 17.01 (5) gives 30 days after the party becomes aware of the " +
      "judgment, and r. 11.06 requires a motion as soon as is reasonably possible after " +
      "learning of the default. The two dates are usually different, because a judgment " +
      "made at a hearing nobody attended is often learned of weeks later. Asking for the " +
      "judgment date and counting from it would take the later deadline away",
  },
};

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
