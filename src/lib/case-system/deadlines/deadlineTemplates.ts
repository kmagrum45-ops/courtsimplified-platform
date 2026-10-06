/**
 * DECISION 5 — the fixed sentences the deadline engine is allowed to say.
 *
 * *** WHY THE ENGINE NO LONGER WRITES ITS OWN PROSE ***
 *
 * The engine always returned its working — "Counted 20 days from 2026-03-02,
 * not counting that day itself…" — and the design note said those steps are
 * shown to the user. Nothing showed them, because nothing called the engine.
 *
 * Decision 5 calls it. The moment it is called, that prose is user-facing, and
 * `outputGuard` is an ALLOWLIST: a string reaches a user only if it is a
 * content-library item or an allowlisted system message. Interpolated prose
 * assembled inside an engine is neither. Returning it from the render path
 * would have routed a dozen sentences about how the law counts days around the
 * one control that exists to stop exactly that — and it would have done it
 * quietly, because the guard cannot report on text that never reaches it.
 *
 * So every sentence the engine can produce lives here, as a fixed template with
 * typed holes, indexed by `contentInventory` like every other piece of content
 * and therefore in the packet a licensee reviews. The engine chooses WHICH
 * template and supplies the dates. It does not compose sentences.
 *
 * That is the same split already used for the blocks themselves: the words are
 * reviewed once, and the user's own facts are dropped into them by code.
 *
 * *** THE SLOTS ARE DATES AND COUNTS, NEVER CLAUSES ***
 *
 * A slot holds a date, a number, or a holiday name. Nothing that carries legal
 * meaning goes through one, because a slot is the one place text is not
 * checked, and a template with a `{whatTheRuleSays}` hole would be a template
 * that says nothing and a guard that checks nothing.
 */

import * as C from "../stage-map/citations";
import type { RuleCitation } from "../stage-map/citations";

export type DeadlineTemplateId =
  | "counted-days-forward"
  | "counted-days-backward"
  | "counted-months"
  | "months-supplied-by-legislation-act"
  | "counted-years"
  | "leap-year-anniversary"
  | "landed-on-holiday"
  | "landed-on-weekend"
  | "extended-past-holiday"
  | "weekends-are-holidays-under-the-rules"
  | "statutory-saturday-is-not-a-holiday"
  | "uncertain-settled-practice-holiday"
  | "uncertain-statutory-saturday"
  | "uncertain-backward-count-lands-on-holiday"
  | "computed-date-forward"
  | "computed-date-backward"
  | "how-this-was-counted"
  | "confirm-the-computed-date"
  | "court-office-closed-on-this-date"
  | "court-office-closes-soon-after-this-date"
  // 2026-10-05: civil and family dates are computed too.
  | "counted-days-forward-skipping-holidays"
  | "counted-days-backward-skipping-holidays"
  | "counted-days-forward-skipping-weekends"
  | "counted-days-backward-skipping-weekends"
  | "landed-on-court-closed-weekend"
  | "extended-to-next-open-day"
  | "weekends-are-holidays-under-the-civil-rules"
  | "months-supplied-by-legislation-act-for-the-rules"
  | "uncertain-family-court-office-closure"
  // 2026-10-06 (page review): a counted date in the past read as still open.
  | "computed-date-has-passed"
  // 2026-10-06: the two-year limit counted from an injury date, under the presumption.
  | "presumed-discovery-from-injury";

export type DeadlineTemplate = {
  id: DeadlineTemplateId;
  /** The exact words. Reviewed as written; filled by code. */
  text: string;
  /**
   * The provision this sentence describes, or null where it describes none.
   *
   * Null is for the four framing sentences — "How that was counted", "based on
   * the date you gave us" — which state arithmetic and where the answer came
   * from, and no law. Citing r. 3.01 beside them because the field exists would
   * put a rule number next to a sentence the rule does not say, which is the
   * exact species of error the citation discipline exists to prevent.
   */
  cites: RuleCitation | null;
};

/*
 * A note on wording, because one of these had to change to exist at all.
 *
 * `uncertain-backward-count-lands-on-holiday` previously read "they do not say
 * what happens to a backwards-counted date". That is an assertion that the
 * rules are silent — the one claim this pipeline cannot verify and the thing
 * decision 1 forbids outright, for the good reason that we made it twice and
 * were wrong both times. It was unreachable prose in an uncalled engine, so
 * nothing caught it. Wiring the engine up made it a sentence a person would
 * read, and it is now phrased as what the provisions DO say, plus the step that
 * avoids the question.
 */
export const DEADLINE_TEMPLATES: Record<DeadlineTemplateId, DeadlineTemplate> = {
  "counted-days-forward": {
    id: "counted-days-forward",
    text:
      "Counted {count} days from {from}, not counting that day itself and counting the " +
      "last day, which gives {result}.",
    cites: C.R_3_01_COMPUTATION,
  },
  "counted-days-backward": {
    id: "counted-days-backward",
    text: "Counted back {count} days from {from}, which gives {result}.",
    cites: C.R_3_01_COMPUTATION,
  },
  "counted-months": {
    id: "counted-months",
    text:
      "Counted {count} months from {from}, landing on the same day of the month (or the " +
      "last day of that month, if it is shorter), which gives {result}.",
    cites: C.S_LEGISLATION_89_6_MONTHS,
  },
  "months-supplied-by-legislation-act": {
    id: "months-supplied-by-legislation-act",
    text:
      "The Small Claims rules say how to count days. The Legislation Act supplies the " +
      "month arithmetic, because Part VI of that Act applies to every Act and regulation.",
    cites: C.S_LEGISLATION_46_APPLIES,
  },
  "counted-years": {
    id: "counted-years",
    text: "Counted {count} years from {from} to the anniversary, which gives {result}.",
    cites: C.S_LEGISLATION_89_6_MONTHS,
  },
  "leap-year-anniversary": {
    id: "leap-year-anniversary",
    text:
      "{from} was 29 February, and {year} is not a leap year, so the anniversary falls on " +
      "28 February.",
    cites: C.S_LEGISLATION_89_7_LEAP,
  },
  /*
   * Two templates rather than one, because one of them needed a `{landed}` hole
   * holding a clause the engine had built by joining phrases — "13 June is
   * Saturday, and 15 June is Canada Day" — and a hole that holds a clause is a
   * template that says nothing. Each day is now its own sentence.
   */
  "landed-on-holiday": {
    id: "landed-on-holiday",
    text: "{result} is {holiday}.",
    cites: C.R_1_02_HOLIDAY,
  },
  /*
   * A weekend day needs its own sentence. The other one produced "Sunday 22
   * March 2026 is Sunday." — true, useless, and it reads like a fault. The
   * reader already knows it is a Sunday; what they do not know is that the day
   * counts as a holiday, which is the entire reason the date moved.
   *
   * It does not say "these rules", though the first draft did. This same
   * sentence is reached under the Legislation Act, where Sunday is a holiday
   * and Saturday is not, and attributing it to the rules there would be wrong
   * about the one distinction that costs people claims. The step that follows
   * names the provision doing the work, with its citation.
   */
  "landed-on-weekend": {
    id: "landed-on-weekend",
    text: "{result} is a {holiday}, and a {holiday} counts as a holiday for this deadline.",
    cites: C.R_1_02_HOLIDAY,
  },
  "extended-past-holiday": {
    id: "extended-past-holiday",
    text: "The period therefore runs to the next day that is not a holiday: {result}.",
    cites: C.R_3_01_COMPUTATION,
  },
  "weekends-are-holidays-under-the-rules": {
    id: "weekends-are-holidays-under-the-rules",
    text:
      "Under these rules every Saturday and Sunday is a holiday, along with the named days.",
    cites: C.R_1_02_HOLIDAY,
  },
  "statutory-saturday-is-not-a-holiday": {
    id: "statutory-saturday-is-not-a-holiday",
    text:
      "Checked whether the last day is a holiday. For a deadline set by a statute the " +
      "holidays are the days listed in the Legislation Act, and Saturday is not one of " +
      "the days that list names.",
    cites: C.S_LEGISLATION_88_HOLIDAYS,
  },
  "uncertain-settled-practice-holiday": {
    id: "uncertain-settled-practice-holiday",
    text:
      "This date moved because of {holiday}. We could not find a statute stating when " +
      "{holiday} falls, so the date used here is the settled one. The court office can " +
      "confirm it.",
    cites: C.R_1_02_HOLIDAY,
  },
  "uncertain-statutory-saturday": {
    id: "uncertain-statutory-saturday",
    text:
      "{result} is a Saturday. This deadline is set by a statute rather than by the Small " +
      "Claims rules, and the list of holidays in the Legislation Act names Sunday and the " +
      "named holidays, not Saturday — so this period ends on the Saturday. It is extended " +
      "to the next day the office is open if the place where it must be done is not open " +
      "that day during its regular hours, which is worth confirming with that office.",
    cites: C.S_LEGISLATION_89_1_HOLIDAY,
  },
  "uncertain-backward-count-lands-on-holiday": {
    id: "uncertain-backward-count-lands-on-holiday",
    text:
      "{result} is {holiday}, and this deadline is counted backwards from a hearing date. " +
      "The provisions on holidays speak to a period that ends or expires on a holiday, " +
      "and this date is one you have to act by rather than one a period runs out on. " +
      "Doing it before {result} avoids the question.",
    cites: C.R_3_01_COMPUTATION,
  },

  /*
   * ---- the four framing sentences ----
   *
   * "Based on the date you gave us" is not politeness. A computed date is only
   * as good as the date it was counted from, and that date came from the reader,
   * optionally, possibly from memory. Presenting the result as "your deadline
   * is" would put our authority behind their recollection. Saying where it came
   * from lets them notice if the input was wrong, which is the only way they
   * can.
   */
  "computed-date-forward": {
    id: "computed-date-forward",
    text: "Based on the date you gave us, the last day for this is {result}.",
    cites: null,
  },
  "computed-date-backward": {
    id: "computed-date-backward",
    text: "Based on the date you gave us, this has to be done by {result} at the latest.",
    cites: null,
  },
  /*
   * A counted date before today (page review, 2026-10-06): an injured person
   * whose 60-day notice ended 19 months earlier was shown "You have 60 days"
   * with nothing saying the time was gone. It states the date's relation to
   * today and nothing about what follows: the steps for a missed deadline are
   * their own answers, and what a court would do is never said here.
   */
  /*
   * The general two-year limit runs from the day a claim is discovered, which
   * the Act decides (s. 5 (1)). It also PRESUMES that day is the day of the act
   * or omission, unless the contrary is proved (s. 5 (2)). Counting from the
   * injury date under that presumption -- and saying so, and that it can be
   * displaced -- is applying the law to the person's facts, which CLAUDE.md's
   * "guide like a lawyer" rule now asks for; behind caseSpecificDeadlines.
   * Page review, 2026-10-06: the site owner's own ice-slip story (13 January
   * 2025) never saw its last day to sue, 13 January 2027.
   */
  "presumed-discovery-from-injury": {
    id: "presumed-discovery-from-injury",
    text:
      "The Limitations Act presumes you knew about your claim on the day it happened, unless " +
      "you can prove you learned of it later. So this is counted from the date you gave for the injury.",
    cites: C.S_LIMITATIONS_5_2_PRESUMPTION,
  },
  "computed-date-has-passed": {
    id: "computed-date-has-passed",
    text:
      "That date has already passed. If you missed it, look for the step about a missed " +
      "deadline in the list of steps above.",
    cites: null,
  },
  "how-this-was-counted": {
    id: "how-this-was-counted",
    text: "How that was counted:",
    cites: null,
  },
  "confirm-the-computed-date": {
    id: "confirm-the-computed-date",
    text:
      "This date was worked out by counting, not taken from your court file. If the date " +
      "you gave us is not exactly right, this one will not be either — and the court " +
      "office can confirm both.",
    cites: null,
  },

  /*
   * *** THE TWO CLOSURE SENTENCES, AND WHY THEY CITE NOTHING ***
   *
   * These describe a MINISTRY SERVICE NOTICE, not law. The date they warn about
   * is not a holiday under r. 1.02 and the deadline does NOT move: the rule says
   * what it says, and the engine is right about it. What these add is that the
   * counter is shut, which no provision states and which only the ministry's own
   * page says. Attaching a rule number to them would put a citation beside a
   * sentence the rule does not support — the error the citation discipline
   * exists to prevent — so `cites` is null and the sentence names its source
   * in the text instead.
   *
   * The {source} slot holds a URL that comes from the vendored corpus manifest,
   * never from a model and never typed. It carries no legal meaning, which is
   * what the slot rule forbids.
   */
  /*
   * ---- civil and family (2026-10-05) ----
   *
   * Rules of Civil Procedure r. 3.01 (1) (b) does not count holidays in a
   * period of seven days or less; its holiday list (r. 1.03) is word for word
   * the Small Claims one. Family Law Rules r. 3 (2) does not count Saturdays,
   * Sundays and other days all court offices are closed in a period of less
   * than seven days, and r. 3 (3) carries a period that ends on a closed day to
   * the next open day. The Family Law Rules do not list closed days, so a
   * public holiday is a day we cannot be sure of: the engine takes the reading
   * that gives the earlier date and says so.
   */
  "counted-days-forward-skipping-holidays": {
    id: "counted-days-forward-skipping-holidays",
    text:
      "Counted {count} days from {from}, not counting that day itself and not counting " +
      "holidays, because this period is seven days or less. That gives {result}.",
    cites: C.RCP_3_01_SHORT,
  },
  "counted-days-backward-skipping-holidays": {
    id: "counted-days-backward-skipping-holidays",
    text:
      "Counted back {count} days from {from}, not counting holidays, because this period " +
      "is seven days or less. That gives {result}.",
    cites: C.RCP_3_01_SHORT,
  },
  "counted-days-forward-skipping-weekends": {
    id: "counted-days-forward-skipping-weekends",
    text:
      "Counted {count} days from {from}, starting the day after it and not counting " +
      "Saturdays and Sundays, because this period is less than seven days. That gives {result}.",
    cites: C.F_R3_2_SHORT,
  },
  "counted-days-backward-skipping-weekends": {
    id: "counted-days-backward-skipping-weekends",
    text:
      "Counted back {count} days from {from}, not counting Saturdays and Sundays, because " +
      "this period is less than seven days. That gives {result}.",
    cites: C.F_R3_2_SHORT,
  },
  "landed-on-court-closed-weekend": {
    id: "landed-on-court-closed-weekend",
    text: "{result} is a {holiday}, when court offices are closed.",
    cites: C.F_R3_3_CLOSED,
  },
  "extended-to-next-open-day": {
    id: "extended-to-next-open-day",
    text: "The period therefore ends on the next day court offices are open: {result}.",
    cites: C.F_R3_3_CLOSED,
  },
  "weekends-are-holidays-under-the-civil-rules": {
    id: "weekends-are-holidays-under-the-civil-rules",
    text:
      "Under the Rules of Civil Procedure every Saturday and Sunday is a holiday, along " +
      "with the named days.",
    cites: C.RCP_1_03_HOLIDAY,
  },
  "months-supplied-by-legislation-act-for-the-rules": {
    id: "months-supplied-by-legislation-act-for-the-rules",
    text:
      "These rules say how to count days. The Legislation Act supplies the month and year " +
      "arithmetic, because Part VI of that Act applies to every Act and regulation.",
    cites: C.S_LEGISLATION_46_APPLIES,
  },
  "uncertain-family-court-office-closure": {
    id: "uncertain-family-court-office-closure",
    text:
      "{day} is {holiday}. The Family Law Rules count around days when all court offices " +
      "are closed. We could not find a list of those days, so we could not confirm whether " +
      "court offices are closed on {holiday}. The date above treats {day} in the way that " +
      "gives the earlier date. The court office can tell you whether it is open that day.",
    cites: C.F_R3_3_CLOSED,
  },

  "court-office-closed-on-this-date": {
    id: "court-office-closed-on-this-date",
    text:
      "Court offices are closed on {closedOn} for {occasion}. This date is still the " +
      "deadline — a closure does not move it. But anything filed online or by email that " +
      "day is marked as filed on the next business day, {stampedAs}, so filing on the " +
      "deadline itself would be recorded as late. Filing before {closedOn} avoids this. " +
      "If that is not possible, ask the court office what to do. Source: {source}",
    cites: null,
  },
  "court-office-closes-soon-after-this-date": {
    id: "court-office-closes-soon-after-this-date",
    text:
      "Court offices are closed on {closedOn} for {occasion}, which is within a few days " +
      "of this date. Anything filed online or by email on {closedOn} is marked as filed " +
      "on the next business day, {stampedAs}. If you are filing close to the deadline, " +
      "that closure day will not count as the day you filed. Source: {source}",
    cites: null,
  },
};

/**
 * Fills a template. Deliberately the same shape as `fillSlots` for blocks, and
 * deliberately throws on a missing value: a step reading "Counted  days from "
 * is worse than no step.
 */
export function fillTemplate(
  id: DeadlineTemplateId,
  values: Record<string, string>,
): string {
  return DEADLINE_TEMPLATES[id].text.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined || value === "") {
      throw new Error(`deadline template "${id}" has no value for {${name}}`);
    }
    return value;
  });
}
