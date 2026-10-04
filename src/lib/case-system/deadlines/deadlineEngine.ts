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
  formatLongDate,
  holidayFor,
  isLeapYear,
  parseIso,
  toIso,
  type HolidayRegime,
  type IsoDate,
} from "./holidays";
import { fillTemplate, type DeadlineTemplateId } from "./deadlineTemplates";

export type DeadlineCertainty = "computed" | "confirm-with-court";

export type ComputationStep = {
  /**
   * Which reviewed sentence this step is. Decision 5.
   *
   * The engine picks a template and supplies dates; it does not write prose.
   * `did` below is that template filled, so callers that only want the text
   * still get it, and the render path can guard the template it came from.
   */
  templateId: DeadlineTemplateId;
  values: Record<string, string>;
  /** The template, filled. Plain language, written in deadlineTemplates.ts. */
  did: string;
  citation: RuleCitation;
};

/** Every sentence the engine produces goes through here, or it is not produced. */
function step(
  templateId: DeadlineTemplateId,
  values: Record<string, string>,
  citation: RuleCitation,
): ComputationStep {
  return { templateId, values, did: fillTemplate(templateId, values), citation };
}

export type DeadlineResult = {
  /** The event the clock ran from. */
  from: IsoDate;
  /** The last day. */
  deadline: IsoDate;
  certainty: DeadlineCertainty;
  steps: ComputationStep[];
  /** Set when certainty is "confirm-with-court". Says exactly what is unsure. */
  uncertainty?: string;
  /**
   * Which reviewed template the uncertainty text came from.
   *
   * Recorded rather than inferred. The render path has to guard the template
   * before showing the filled sentence, and the alternative was matching the
   * text back to its template by its fixed prefix — which works until a
   * template is reworded by someone who does not know a matcher depends on its
   * first twelve characters.
   */
  uncertaintyTemplate?: DeadlineTemplateId;
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

const holidayRegime = (regime: CountingRegime): HolidayRegime => {
  // Civil and family periods are never computed (computedDeadline.ts skips
  // them): the working below cites Small Claims and Legislation Act provisions,
  // which would be the wrong citations for those courts.
  if (regime === "civil-rules" || regime === "family-rules") {
    throw new Error(`regime ${regime} is shown as a period and is not computed`);
  }
  return regime === "small-claims-rules" ? "small-claims-rules" : "legislation-act";
};

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
  holidayRegime(regime); // throws for civil-rules and family-rules: never computed here

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
    steps.push(
      step(
        direction === "after" ? "counted-days-forward" : "counted-days-backward",
        { count: String(length.count), from: formatLongDate(from), result: formatLongDate(date) },
        countingRule(regime),
      ),
    );
  } else if (length.unit === "months") {
    const signed = direction === "after" ? length.count : -length.count;
    date = addMonths(from, signed);
    steps.push(
      step(
        "counted-months",
        { count: String(length.count), from: formatLongDate(from), result: formatLongDate(date) },
        C.S_LEGISLATION_89_6_MONTHS,
      ),
    );
    if (regime === "small-claims-rules") {
      // r. 3.01 counts days, not months, so the Legislation Act supplies the
      // month arithmetic even for a period set by the rules.
      steps.push(step("months-supplied-by-legislation-act", {}, C.S_LEGISLATION_46_APPLIES));
    }
  } else {
    const signed = direction === "after" ? length.count : -length.count;
    const { date: anniversary, leapAdjusted } = addYears(from, signed);
    date = anniversary;
    steps.push(
      step(
        "counted-years",
        { count: String(length.count), from: formatLongDate(from), result: formatLongDate(date) },
        C.S_LEGISLATION_89_6_MONTHS,
      ),
    );
    if (leapAdjusted) {
      steps.push(
        step(
          "leap-year-anniversary",
          { from: formatLongDate(from), year: date.slice(0, 4) },
          C.S_LEGISLATION_89_7_LEAP,
        ),
      );
    }
  }

  // --- 2. the holiday extension -----------------------------------------

  const hRegime = holidayRegime(regime);
  let certainty: DeadlineCertainty = "computed";
  let uncertainty: string | undefined;
  let uncertaintyTemplate: DeadlineTemplateId | undefined;

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
      uncertaintyTemplate = "uncertain-backward-count-lands-on-holiday";
      uncertainty = fillTemplate("uncertain-backward-count-lands-on-holiday", {
        result: formatLongDate(date),
        holiday: landed.name,
      });
    }
    return { from, deadline: date, certainty, steps, uncertainty, uncertaintyTemplate };
  }

  const shifted: ComputationStep[] = [];
  let guard = 0;
  for (;;) {
    const landed = holidayFor(date, hRegime);
    if (!landed) break;
    if (++guard > 30) break; // cannot happen; a runaway loop must never hang a page

    if (landed.basis.kind === "settled-practice") {
      certainty = "confirm-with-court";
      uncertaintyTemplate = "uncertain-settled-practice-holiday";
      uncertainty = fillTemplate("uncertain-settled-practice-holiday", { holiday: landed.name });
    }

    shifted.push(
      step(
        landed.weekend ? "landed-on-weekend" : "landed-on-holiday",
        { result: formatLongDate(date), holiday: landed.name },
        extensionRule(regime),
      ),
    );
    date = addDays(date, 1);
  }

  if (shifted.length > 0) {
    steps.push(...shifted);
    steps.push(
      step("extended-past-holiday", { result: formatLongDate(date) }, extensionRule(regime)),
    );
    if (regime === "small-claims-rules") {
      steps.push(step("weekends-are-holidays-under-the-rules", {}, C.R_1_02_HOLIDAY));
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
    uncertaintyTemplate = "uncertain-statutory-saturday";
    uncertainty = fillTemplate("uncertain-statutory-saturday", { result: formatLongDate(date) });
    steps.push(step("statutory-saturday-is-not-a-holiday", {}, C.S_LEGISLATION_88_HOLIDAYS));
  }

  return { from, deadline: date, certainty, steps, uncertainty, uncertaintyTemplate };
}
