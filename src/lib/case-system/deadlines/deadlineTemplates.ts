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
  | "court-office-closes-soon-after-this-date";

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
