/**
 * PART 4 — the deadline engine. Code, not a model.
 *
 * *** WHY A MODEL MUST NEVER DO THIS ***
 *
 * Date arithmetic is the one thing in this product with exactly one right
 * answer, no interpretation, and an unrecoverable failure mode. A model that
 * is right 98% of the time is wrong about one deadline in fifty, silently, in
 * fluent prose, and the person finds out when the clerk turns them away. There
 * is no upside to weigh against that, so this is ordinary arithmetic with
 * every step citing the provision it applies.
 *
 * *** WHAT IT RETURNS ***
 *
 * Not a date. A date, the reasoning that produced it, the provision behind
 * each step, and how certain it is. The steps are shown to the user, because
 * "20 December, and here is why" is checkable and "20 December" is a thing
 * they have to trust.
 *
 * *** WHY "CONFIRM WITH THE COURT" IS A REAL OUTCOME ***
 *
 * Five of the holidays r. 1.02 names have no date stated in any statute we
 * could vendor: Good Friday, Easter Monday, Labour Day, Thanksgiving Day and
 * Civic Holiday (see holidays.ts). Their dates are settled and this engine
 * uses them — but where the ANSWER TURNS ON one of them, the result says so
 * rather than presenting a computed date as verified law. Most deadlines never
 * go near them.
 *
 * *** THE TWO COUNTING REGIMES ***
 *
 * r. 3.01 counts periods under the Small Claims rules, using r. 1.02's holiday
 * list, in which every Saturday and Sunday is a holiday. The Legislation Act
 * counts statutory periods — the municipal and occupiers' notice deadlines —
 * using s. 88 (2), in which SATURDAY IS NOT A HOLIDAY. The same 10 days from
 * the same event can end on different dates depending on which applies, and on
 * a notice period the difference is the claim.
 */

import type { RuleCitation } from "../stage-map/citations";
import * as C from "../stage-map/citations";
import type { CountingRegime, DeadlineLength } from "../stage-map/stageMap";
import {
  addDays,
  dayOfWeek,
  holidayFor,
  isLeapYear,
  parseIso,
  toIso,
  type HolidayRegime,
  type IsoDate,
} from "./holidays";

export type DeadlineCertainty = "computed" | "confirm-with-court";

export type ComputationStep = {
  /** Plain language, written here, never by a model. */
  did: string;
  citation: RuleCitation;
};

export type DeadlineResult = {
  /** The event the clock ran from. */
  from: IsoDate;
  /** The last day. */
  deadline: IsoDate;
  certainty: DeadlineCertainty;
  steps: ComputationStep[];
  /** Set when certainty is "confirm-with-court". Says exactly what is unsure. */
  uncertainty?: string;
};

export type DeadlineInput = {
  from: IsoDate;
  length: DeadlineLength;
  regime: CountingRegime;
  /**
   * "after" counts forward from the event; "before" counts back from it, as
   * r. 13.03 (2)'s "at least 14 days before the settlement conference" does.
   */
  direction?: "after" | "before";
};

const holidayRegime = (regime: CountingRegime): HolidayRegime =>
  regime === "small-claims-rules" ? "small-claims-rules" : "legislation-act";

/** The provision that says to exclude the first day and include the last. */
function countingRule(regime: CountingRegime): RuleCitation {
  return regime === "small-claims-rules" ? C.R_3_01_COMPUTATION : C.S_LEGISLATION_89_3_BETWEEN;
}

/** The provision that extends a period ending on a holiday. */
function extensionRule(regime: CountingRegime): RuleCitation {
  return regime === "small-claims-rules" ? C.R_3_01_COMPUTATION : C.S_LEGISLATION_89_1_HOLIDAY;
}

/**
 * Months, per Legislation Act s. 89 (6).
 *
 * "The number of months is counted from the specified day, excluding the month
 * in which the specified day falls. The period includes the day in the last
 * month counted that has the same calendar number as the specified day or, if
 * that month has no day with that number, its last day."
 *
 * So six months after 31 August is 28 (or 29) February — the rule handles the
 * short month explicitly, which is why this is not `setMonth` and a prayer.
 */
function addMonths(from: IsoDate, months: number): IsoDate {
  const start = new Date(parseIso(from));
  const targetMonth = start.getUTCMonth() + months;
  const year = start.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(start.getUTCDate(), lastDay);
  return toIso(Date.UTC(year, month, day));
}

/**
 * Years, as an anniversary, per Legislation Act s. 89 (7) for 29 February.
 *
 * The two-year limitation period and the two-year dismissal-for-delay clock
 * both run on anniversaries, so a claim discovered on 29 February 2024 is
 * caught by this and not by generic month arithmetic.
 */
function addYears(from: IsoDate, years: number): { date: IsoDate; leapAdjusted: boolean } {
  const start = new Date(parseIso(from));
  const year = start.getUTCFullYear() + years;
  const isFeb29 = start.getUTCMonth() === 1 && start.getUTCDate() === 29;

  if (isFeb29 && !isLeapYear(year)) {
    return { date: toIso(Date.UTC(year, 1, 28)), leapAdjusted: true };
  }
  return { date: toIso(Date.UTC(year, start.getUTCMonth(), start.getUTCDate())), leapAdjusted: false };
}

export function computeDeadline(input: DeadlineInput): DeadlineResult {
  const { from, length, regime } = input;

  /*
   * *** A PERIOD OF ZERO IS NOT A PERIOD ***
   *
   * r. 11.06 sets no fixed number of days — it requires a motion "as soon as
   * is reasonably possible in all the circumstances" — and the stage map
   * records that as count 0. Without this guard the engine happily counted
   * zero days and then rolled the result off a weekend, returning a date two
   * days later with the step "Counted 0 days ... the period runs to ...".
   *
   * That fabricates a deadline out of a rule whose whole point is that there
   * is not one, and it does it in the engine that exists to stop exactly that.
   * Found by independent review. `renderDeadlineSection` already filtered
   * these out; the engine did not.
   */
  if (length.count === 0) {
    throw new Error(
      "computeDeadline called with a period of 0 — this rule sets no fixed deadline, " +
        "and returning a date for it would invent one",
    );
  }
  const direction = input.direction ?? "after";
  const steps: ComputationStep[] = [];

  // --- 1. the raw period -------------------------------------------------

  let date: IsoDate;

  if (length.unit === "days") {
    const signed = direction === "after" ? length.count : -length.count;
    date = addDays(from, signed);
    steps.push({
      did:
        direction === "after"
          ? `Counted ${length.count} days from ${from}, not counting that day itself and counting the last day, which gives ${date}.`
          : `Counted back ${length.count} days from ${from}, which gives ${date}.`,
      citation: countingRule(regime),
    });
  } else if (length.unit === "months") {
    const signed = direction === "after" ? length.count : -length.count;
    date = addMonths(from, signed);
    steps.push({
      did:
        `Counted ${length.count} months from ${from}, landing on the same day of the month ` +
        `(or the last day of that month, if it is shorter), which gives ${date}.`,
      citation: C.S_LEGISLATION_89_6_MONTHS,
    });
    if (regime === "small-claims-rules") {
      // r. 3.01 counts days, not months, so the Legislation Act supplies the
      // month arithmetic even for a period set by the rules.
      steps.push({
        did:
          "The Small Claims rules say how to count days but not months, so the " +
          "Legislation Act supplies the month arithmetic, as it applies to every " +
          "Act and regulation.",
        citation: C.S_LEGISLATION_46_APPLIES,
      });
    }
  } else {
    const signed = direction === "after" ? length.count : -length.count;
    const { date: anniversary, leapAdjusted } = addYears(from, signed);
    date = anniversary;
    steps.push({
      did: `Counted ${length.count} years from ${from} to the anniversary, which gives ${date}.`,
      citation: C.S_LEGISLATION_89_6_MONTHS,
    });
    if (leapAdjusted) {
      steps.push({
        did:
          `${from} was 29 February, and ${date.slice(0, 4)} is not a leap year, so the ` +
          `anniversary falls on 28 February.`,
        citation: C.S_LEGISLATION_89_7_LEAP,
      });
    }
  }

  // --- 2. the holiday extension -----------------------------------------

  const hRegime = holidayRegime(regime);
  let certainty: DeadlineCertainty = "computed";
  let uncertainty: string | undefined;

  /*
   * A period counted BACKWARDS is not extended.
   *
   * r. 3.01 and s. 89 (1) both speak of a period that ENDS or EXPIRES on a
   * holiday. r. 13.03 (2)'s "at least 14 days before the settlement
   * conference" is a date by which something must already have been done, and
   * rolling it forward would shorten the notice the other side gets — the
   * opposite of what an extension is for. Rolling it backwards is not
   * something either provision says to do either. So the engine leaves the
   * date where the arithmetic put it and says plainly that the safe course is
   * to be early.
   */
  if (direction === "before") {
    const landed = holidayFor(date, hRegime);
    if (landed) {
      certainty = "confirm-with-court";
      uncertainty =
        `${date} is ${landed.name}, and this is a deadline counted backwards from a ` +
        `hearing date. The rules say a period ENDING on a holiday runs to the next ` +
        `working day; they do not say what happens to a backwards-counted date. ` +
        `Filing and serving before ${date} avoids the question entirely.`;
    }
    return { from, deadline: date, certainty, steps, uncertainty };
  }

  const shifted: string[] = [];
  let guard = 0;
  for (;;) {
    const landed = holidayFor(date, hRegime);
    if (!landed) break;
    if (++guard > 30) break; // cannot happen; a runaway loop must never hang a page

    if (landed.basis.kind === "settled-practice") {
      certainty = "confirm-with-court";
      uncertainty =
        `This date moved because of ${landed.name}. No statute we can quote states ` +
        `when ${landed.name} falls — the date used here is the settled one, but the ` +
        `court is the place to confirm it.`;
    }

    shifted.push(`${date} is ${landed.name}`);
    date = addDays(date, 1);
  }

  if (shifted.length > 0) {
    steps.push({
      did: `${shifted.join(", and ")}, so the period runs to the next day that is not a holiday: ${date}.`,
      citation: extensionRule(regime),
    });
    if (regime === "small-claims-rules") {
      steps.push({
        did:
          "Under these rules every Saturday and Sunday is a holiday, along with the " +
          "named days.",
        citation: C.R_1_02_HOLIDAY,
      });
    }
  } else if (regime === "legislation-act" && dayOfWeek(date) === 6) {
    /*
     * The Saturday trap, stated out loud.
     *
     * s. 88 (2) lists Sunday and not Saturday, so a statutory period genuinely
     * can expire on a Saturday. Anyone who assumes otherwise misses it by two
     * days, and on a 10-day notice that ends the claim. s. 89 (2) may extend
     * it where the place for serving or filing is closed — which depends on
     * facts we do not have.
     */
    certainty = "confirm-with-court";
    uncertainty =
      `${date} is a Saturday. For a deadline set by a statute rather than by the ` +
      `Small Claims rules, Saturday is NOT a holiday — only Sunday is — so this ` +
      `period does end on the Saturday. It may be extended if the place you have to ` +
      `serve or file is closed that day, which is worth confirming.`;
    steps.push({
      did:
        "Checked whether the last day is a holiday. For a statutory deadline the " +
        "holidays are the ones listed in the Legislation Act, and Saturday is not " +
        "among them.",
      citation: C.S_LEGISLATION_88_HOLIDAYS,
    });
  }

  return { from, deadline: date, certainty, steps, uncertainty };
}
