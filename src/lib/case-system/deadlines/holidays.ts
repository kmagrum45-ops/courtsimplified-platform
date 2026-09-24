/**
 * When the named holidays actually fall — and, for five of them, an honest
 * admission that no statute we could find says.
 *
 * *** WHY THIS IS HARDER THAN IT LOOKS ***
 *
 * r. 3.01 extends a period that would end on a holiday, and r. 1.02 lists the
 * holidays BY NAME: "Victoria Day", "Family Day", "Thanksgiving Day". Neither
 * says which dates those are. Legislation Act s. 88 (2) does the same. So the
 * rule deciding whether a 10-day notice expires on the 17th or the 18th turns
 * on a fact neither instrument states.
 *
 * *** WHAT IS SOURCED, AND WHAT IS NOT ***
 *
 * Six holidays have a date fixed in a statute we have vendored and quoted:
 * Victoria Day, Canada Day and Remembrance Day (Holidays Act (Canada)), Family
 * Day (Employment Standards Act), plus New Year's Day, Christmas Day and
 * Boxing Day, which are fixed calendar dates the rules name directly.
 *
 * FIVE ARE NOT. Good Friday and Easter Monday move by ecclesiastical
 * computation. Labour Day and Thanksgiving Day rest on proclamation and long
 * practice. Civic Holiday is not a statutory holiday in Ontario at all — it is
 * declared municipally, and r. 1.02 lists it while the Legislation Act does
 * not. Their dates here are the settled ones, and they are MARKED as settled
 * practice rather than dressed up as law.
 *
 * *** WHAT THAT MARKING IS FOR ***
 *
 * A deadline whose answer turns on one of those five comes back needing
 * confirmation with the court, rather than stated as fact. Most deadlines
 * never go near them and are answered plainly. See deadlineEngine.ts.
 *
 * *** THE TWO CALENDARS DIFFER, AND THAT IS THE POINT ***
 *
 * Under the Small Claims rules EVERY SATURDAY AND SUNDAY is a holiday, and
 * Civic Holiday counts. Under the Legislation Act only SUNDAY is, and Civic
 * Holiday does not appear. A period ending on a Saturday therefore runs to
 * Monday under the rules and expires that Saturday under the Act. Since the
 * municipal and occupiers' notice periods are statutory, someone reasoning
 * "it's the weekend, so I have until Monday" loses the claim.
 */

import type { RuleCitation } from "../stage-map/citations";
import * as C from "../stage-map/citations";

/** A calendar day, as YYYY-MM-DD. No times, no zones — dates are not moments. */
export type IsoDate = string;

/**
 * How we know when this holiday falls.
 *
 * `statute` means a provision we have vendored and quoted says so.
 * `settled-practice` means it is the date everyone uses and no text we could
 * find states it. The distinction is carried all the way to the user.
 */
export type HolidayBasis =
  | { kind: "statute"; citation: RuleCitation }
  | { kind: "settled-practice"; why: string };

export type Holiday = {
  name: string;
  date: IsoDate;
  basis: HolidayBasis;
};

/** Which list of holidays applies. They are not the same list. */
export type HolidayRegime = "small-claims-rules" | "legislation-act";

// --------------------------------------------------------------- date basics

const MS_PER_DAY = 86_400_000;

export function parseIso(date: IsoDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`not a YYYY-MM-DD date: ${date}`);
  const [, y, m, d] = match;
  const ms = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const round = new Date(ms);
  if (round.getUTCMonth() !== Number(m) - 1 || round.getUTCDate() !== Number(d)) {
    throw new Error(`no such date: ${date}`);
  }
  return ms;
}

export function toIso(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return toIso(parseIso(date) + days * MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(parseIso(date)).getUTCDay();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function ymd(year: number, monthIndex: number, day: number): IsoDate {
  return toIso(Date.UTC(year, monthIndex, day));
}

/** The nth given weekday of a month, e.g. the third Monday in February. */
function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): IsoDate {
  const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const offset = (weekday - firstDow + 7) % 7;
  return ymd(year, monthIndex, 1 + offset + (n - 1) * 7);
}

/** The last given weekday strictly before a date, e.g. the Monday before May 25. */
function weekdayBefore(year: number, monthIndex: number, day: number, weekday: number): IsoDate {
  const target = Date.UTC(year, monthIndex, day);
  const dow = new Date(target).getUTCDay();
  const back = ((dow - weekday + 7) % 7) || 7;
  return toIso(target - back * MS_PER_DAY);
}

/**
 * Easter Sunday, by the anonymous Gregorian computus.
 *
 * Deterministic and universally used, but it is arithmetic from an
 * ecclesiastical rule, not from any statute — which is exactly why Good Friday
 * and Easter Monday are marked as settled practice below.
 */
export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month - 1, day);
}

// ------------------------------------------------------------- the calendars

const SETTLED = (why: string): HolidayBasis => ({ kind: "settled-practice", why });
const STATUTE = (citation: RuleCitation): HolidayBasis => ({ kind: "statute", citation });

const EASTER_BASIS = SETTLED(
  "Good Friday and Easter Monday are fixed by the ecclesiastical computation of " +
    "Easter. r. 1.02 names them; no Ontario or federal statute we vendored states " +
    "their dates.",
);

const PROCLAIMED_BASIS = (name: string) =>
  SETTLED(
    `${name} is settled by proclamation and long practice. r. 1.02 names it and the ` +
      `Employment Standards Act lists it, but neither states the date.`,
  );

/**
 * Holidays named by BOTH regimes, with the dates we can establish.
 *
 * The regime-specific parts — weekends, Civic Holiday, and the substitution
 * rules — are applied by `holidaysInYear` below, because that is where the two
 * lists genuinely part company.
 */
function commonHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);

  return [
    {
      name: "New Year's Day",
      date: ymd(year, 0, 1),
      basis: STATUTE(C.R_1_02_HOLIDAY),
    },
    {
      name: "Family Day",
      date: nthWeekday(year, 1, 1, 3),
      basis: STATUTE(C.S_ESA_FAMILY_DAY),
    },
    { name: "Good Friday", date: addDays(easter, -2), basis: EASTER_BASIS },
    { name: "Easter Monday", date: addDays(easter, 1), basis: EASTER_BASIS },
    {
      name: "Victoria Day",
      date: weekdayBefore(year, 4, 25, 1),
      basis: STATUTE(C.S_HOLIDAYS_ACT_4_VICTORIA),
    },
    {
      name: "Canada Day",
      // s. 2 (2) / s. 88 (4): when July 1 is a Sunday, Canada Day is July 2.
      date: dayOfWeek(ymd(year, 6, 1)) === 0 ? ymd(year, 6, 2) : ymd(year, 6, 1),
      basis: STATUTE(C.S_HOLIDAYS_ACT_2_CANADA_DAY),
    },
    {
      name: "Labour Day",
      date: nthWeekday(year, 8, 1, 1),
      basis: PROCLAIMED_BASIS("Labour Day"),
    },
    {
      name: "Thanksgiving Day",
      date: nthWeekday(year, 9, 1, 2),
      basis: PROCLAIMED_BASIS("Thanksgiving Day"),
    },
    {
      name: "Remembrance Day",
      date: ymd(year, 10, 11),
      basis: STATUTE(C.S_HOLIDAYS_ACT_3_REMEMBRANCE),
    },
    { name: "Christmas Day", date: ymd(year, 11, 25), basis: STATUTE(C.R_1_02_HOLIDAY) },
    { name: "Boxing Day", date: ymd(year, 11, 26), basis: STATUTE(C.R_1_02_HOLIDAY) },
  ];
}

/**
 * The named holidays for a year under one regime, substitutions included.
 *
 * Weekends are NOT in this list — they are handled by `holidayFor`, because
 * "every Saturday" is not an entry in a calendar, it is a property of a date.
 */
export function holidaysInYear(year: number, regime: HolidayRegime): Holiday[] {
  const holidays = commonHolidays(year);

  if (regime === "small-claims-rules") {
    // r. 1.02 (g) — the Legislation Act has no Civic Holiday at all.
    holidays.push({
      name: "Civic Holiday",
      date: nthWeekday(year, 7, 1, 1),
      basis: SETTLED(
        "Civic Holiday is not a statutory holiday in Ontario — it is declared " +
          "municipally and is not observed everywhere. r. 1.02 (g) names it as a " +
          "holiday for these rules; the first Monday in August is the settled date.",
      ),
    });

    /*
     * r. 1.02's substitutions, which are broader than the Legislation Act's:
     * they shift for a SATURDAY as well as a Sunday, and Christmas can take
     * two following days, or one when it falls on a Friday.
     */
    const substitution = STATUTE(C.R_1_02_HOLIDAY_SUBSTITUTION);
    const extra: Holiday[] = [];

    for (const name of ["New Year's Day", "Canada Day", "Remembrance Day"]) {
      const holiday = holidays.find((h) => h.name === name);
      if (!holiday) continue;
      const dow = dayOfWeek(holiday.date);
      if (dow === 6) extra.push({ name: `${name} (observed)`, date: addDays(holiday.date, 2), basis: substitution });
      if (dow === 0) extra.push({ name: `${name} (observed)`, date: addDays(holiday.date, 1), basis: substitution });
    }

    const christmas = ymd(year, 11, 25);
    const christmasDow = dayOfWeek(christmas);
    if (christmasDow === 6) {
      extra.push({ name: "Christmas Day (observed)", date: addDays(christmas, 2), basis: substitution });
      extra.push({ name: "Boxing Day (observed)", date: addDays(christmas, 3), basis: substitution });
    } else if (christmasDow === 0) {
      extra.push({ name: "Christmas Day (observed)", date: addDays(christmas, 1), basis: substitution });
      extra.push({ name: "Boxing Day (observed)", date: addDays(christmas, 2), basis: substitution });
    } else if (christmasDow === 5) {
      extra.push({ name: "Christmas Day (observed)", date: addDays(christmas, 3), basis: substitution });
    }

    holidays.push(...extra);
  } else {
    /*
     * Legislation Act s. 88 (3), (5). Narrower: Sunday only for New Year's,
     * and Christmas takes the Monday when it falls on a Saturday and the
     * Tuesday when it falls on a Sunday — one day, not two. Canada Day is
     * already handled above, since s. 88 (4) defers to the federal Act.
     *
     * Remembrance Day gets NO substitution here: s. 88 does not provide one.
     */
    const newYear = ymd(year, 0, 1);
    if (dayOfWeek(newYear) === 0) {
      holidays.push({
        name: "New Year's Day (observed)",
        date: addDays(newYear, 1),
        basis: STATUTE(C.S_LEGISLATION_88_HOLIDAYS),
      });
    }

    const christmas = ymd(year, 11, 25);
    const dow = dayOfWeek(christmas);
    if (dow === 6) {
      holidays.push({
        name: "Christmas Day (observed)",
        date: addDays(christmas, 2),
        basis: STATUTE(C.S_LEGISLATION_88_HOLIDAYS),
      });
    } else if (dow === 0) {
      holidays.push({
        name: "Christmas Day (observed)",
        date: addDays(christmas, 2),
        basis: STATUTE(C.S_LEGISLATION_88_HOLIDAYS),
      });
    }
  }

  return holidays;
}

/**
 * Is this date a holiday under this regime? Returns which one, or undefined.
 *
 * Weekends are decided here rather than from the year's list, because the two
 * regimes disagree about them and that disagreement is the single most
 * consequential difference between the calendars.
 */
export function holidayFor(date: IsoDate, regime: HolidayRegime): Holiday | undefined {
  const dow = dayOfWeek(date);

  if (regime === "small-claims-rules" && (dow === 0 || dow === 6)) {
    return {
      name: dow === 0 ? "Sunday" : "Saturday",
      date,
      basis: STATUTE(C.R_1_02_HOLIDAY),
    };
  }

  if (regime === "legislation-act" && dow === 0) {
    return { name: "Sunday", date, basis: STATUTE(C.S_LEGISLATION_88_HOLIDAYS) };
  }

  const year = Number(date.slice(0, 4));
  // A substituted holiday can land in the next calendar year (New Year's Day
  // observed on 2 January is in the same year, but Boxing Day observed can
  // spill from 25 December into the 27th or 28th — still this year. Checking
  // the neighbouring year costs nothing and removes the class of bug.)
  for (const candidate of [...holidaysInYear(year, regime), ...holidaysInYear(year - 1, regime)]) {
    if (candidate.date === date) return candidate;
  }
  return undefined;
}

/** Days whose date we could not establish from any statute we vendored. */
export function unsourcedHolidayNames(regime: HolidayRegime): string[] {
  return holidaysInYear(2026, regime)
    .filter((holiday) => holiday.basis.kind === "settled-practice")
    .map((holiday) => holiday.name)
    .sort();
}
