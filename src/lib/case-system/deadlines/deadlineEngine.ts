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
 *
 * *** AND THE CIVIL AND FAMILY RULES (2026-10-05) ***
 *
 * Until 2026-10-05 civil and family periods were shown only as periods: the
 * working cited the Small Claims and Legislation Act provisions, which would
 * have been the wrong citations. They now count under their own rules, with
 * their own citations:
 *   - civil, Rules of Civil Procedure r. 3.01 (1): the same holiday list as
 *     Small Claims (r. 1.03 (1) is word for word r. 1.02 (1)), and holidays
 *     not counted in a period of seven days or less;
 *   - family, Family Law Rules r. 3: count from the day after; Saturdays,
 *     Sundays and days all court offices are closed not counted in a period of
 *     less than seven days; a last day on a closed day runs to the next open
 *     day. The rules do not list closed days, so a public holiday is treated
 *     the way that gives the earlier date, marked confirm-with-court.
 * Months and years under all three sets of rules come from the Legislation
 * Act (s. 46 applies Part VI to every regulation).
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

/*
 * Which holiday list a regime uses.
 *
 * Civil: Rules of Civil Procedure r. 1.03 (1)'s "holiday" is word for word
 * r. 1.02 (1)'s (Saturday and Sunday included, the same named days, the same
 * Monday and Tuesday substitutions), so it is the same calendar.
 *
 * Family: the Family Law Rules count around "days when all court offices are
 * closed" (r. 3 (2), (3)) and do not list them. Saturday and Sunday are certain
 * -- r. 3 (2) names them. The rules' public-holiday list is used only to find
 * the days we cannot be sure of; see the family branches below.
 */
const holidayRegime = (regime: CountingRegime): HolidayRegime =>
  regime === "legislation-act" ? "legislation-act" : "small-claims-rules";

/** The provision that says to exclude the first day and include the last. */
function countingRule(regime: CountingRegime): RuleCitation {
  if (regime === "civil-rules") return C.RCP_3_01_COUNT;
  if (regime === "family-rules") return C.F_R3_1_COUNTING;
  return regime === "small-claims-rules" ? C.R_3_01_COMPUTATION : C.S_LEGISLATION_89_3_BETWEEN;
}

/** The provision that extends a period ending on a holiday (or, for family, a closed day). */
function extensionRule(regime: CountingRegime): RuleCitation {
  if (regime === "civil-rules") return C.RCP_3_01_COUNT;
  if (regime === "family-rules") return C.F_R3_3_CLOSED;
  return regime === "small-claims-rules" ? C.R_3_01_COMPUTATION : C.S_LEGISLATION_89_1_HOLIDAY;
}

const isWeekend = (date: IsoDate) => {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
};

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
  let certainty: DeadlineCertainty = "computed";
  let uncertainty: string | undefined;
  let uncertaintyTemplate: DeadlineTemplateId | undefined;

  // --- 1. the raw period -------------------------------------------------

  let date: IsoDate;

  /*
   * Short periods under the civil and family rules skip days.
   *
   * Civil, r. 3.01 (1) (b): in a period of seven days or less, holidays (every
   * Saturday and Sunday among them) are not counted. Family, r. 3 (2): in a
   * period of LESS than seven days, Saturdays, Sundays and other days all
   * court offices are closed are not counted. The two thresholds differ by a
   * day and that day is a real seven-day period.
   *
   * A family public holiday is a day we cannot be sure of. Counting forward,
   * counting it gives the earlier last day; counting back from a hearing,
   * skipping it gives the earlier date to act by. Either way the engine takes
   * the earlier date and says why.
   */
  const shortCivil = regime === "civil-rules" && length.unit === "days" && length.count <= 7;
  const shortFamily = regime === "family-rules" && length.unit === "days" && length.count < 7;

  if (shortCivil || shortFamily) {
    const signed = direction === "after" ? 1 : -1;
    let cursor = from;
    let counted = 0;
    for (let guard = 0; counted < length.count && guard < 60; guard += 1) {
      cursor = addDays(cursor, signed);
      if (shortCivil) {
        const holiday = holidayFor(cursor, "small-claims-rules");
        if (holiday) {
          if (holiday.basis.kind === "settled-practice") {
            certainty = "confirm-with-court";
            uncertaintyTemplate = "uncertain-settled-practice-holiday";
            uncertainty = fillTemplate("uncertain-settled-practice-holiday", { holiday: holiday.name });
          }
          continue;
        }
        counted += 1;
        continue;
      }
      if (isWeekend(cursor)) continue;
      const possible = holidayFor(cursor, "small-claims-rules");
      if (possible) {
        certainty = "confirm-with-court";
        uncertaintyTemplate = "uncertain-family-court-office-closure";
        uncertainty = fillTemplate("uncertain-family-court-office-closure", {
          day: formatLongDate(cursor),
          holiday: possible.name,
        });
        if (direction === "before") continue;
      }
      counted += 1;
    }
    date = cursor;
    const template: DeadlineTemplateId = shortCivil
      ? direction === "after"
        ? "counted-days-forward-skipping-holidays"
        : "counted-days-backward-skipping-holidays"
      : direction === "after"
        ? "counted-days-forward-skipping-weekends"
        : "counted-days-backward-skipping-weekends";
    steps.push(
      step(
        template,
        { count: String(length.count), from: formatLongDate(from), result: formatLongDate(date) },
        shortCivil ? C.RCP_3_01_SHORT : C.F_R3_2_SHORT,
      ),
    );
  } else if (length.unit === "days") {
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
    } else if (regime === "civil-rules" || regime === "family-rules") {
      steps.push(step("months-supplied-by-legislation-act-for-the-rules", {}, C.S_LEGISLATION_46_APPLIES));
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
    if (regime === "civil-rules" || regime === "family-rules") {
      steps.push(step("months-supplied-by-legislation-act-for-the-rules", {}, C.S_LEGISLATION_46_APPLIES));
    }
  }

  // --- 2. the holiday extension -----------------------------------------

  const hRegime = holidayRegime(regime);

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

  if (regime === "family-rules") {
    /*
     * r. 3 (3): a period whose last day falls on a day court offices are
     * closed ends on the next day they are open. Saturday and Sunday are
     * certain. A public holiday is not something we can confirm, so the date
     * is NOT moved past it -- that would give a later date than may be right
     * -- and the reader is told to check.
     */
    const moved: ComputationStep[] = [];
    for (let guard2 = 0; guard2 < 10; guard2 += 1) {
      if (isWeekend(date)) {
        moved.push(
          step(
            "landed-on-court-closed-weekend",
            { result: formatLongDate(date), holiday: dayOfWeek(date) === 0 ? "Sunday" : "Saturday" },
            C.F_R3_3_CLOSED,
          ),
        );
        date = addDays(date, 1);
        continue;
      }
      const possible = holidayFor(date, "small-claims-rules");
      if (possible) {
        certainty = "confirm-with-court";
        uncertaintyTemplate = "uncertain-family-court-office-closure";
        uncertainty = fillTemplate("uncertain-family-court-office-closure", {
          day: formatLongDate(date),
          holiday: possible.name,
        });
      }
      break;
    }
    if (moved.length > 0) {
      steps.push(...moved);
      steps.push(step("extended-to-next-open-day", { result: formatLongDate(date) }, C.F_R3_3_CLOSED));
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
    } else if (regime === "civil-rules") {
      steps.push(step("weekends-are-holidays-under-the-civil-rules", {}, C.RCP_1_03_HOLIDAY));
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
