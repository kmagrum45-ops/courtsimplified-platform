/**
 * DATES IN CANADIAN DOCUMENTS — one module, because every other approach drifts.
 *
 * Users upload things in any order. Courts read them in chronological order. So
 * the workspace has to get dates right without making the user do the work, and
 * every date it shows has to be one the document actually gave.
 *
 * *** THE RULE THIS MODULE EXISTS TO ENFORCE ***
 *
 * **A parser may never invent precision.** "March 2026" is not 3 March, and
 * "2026" is not 1 January. Storing either as a full date and forgetting is how a
 * chronology ends up asserting a day no document states — in front of a judge, in
 * the user's own exhibit book. Every result therefore carries its `precision`, and
 * the database has a CHECK that refuses a month-precision date on any day but the
 * 1st.
 *
 * *** AMBIGUITY IS A RESULT, NOT A GUESS ***
 *
 * `03/04/2026` is 3 April in Canada and 4 March in the United States, and Canadian
 * documents contain both conventions — a US supplier's invoice sits in the same
 * bundle as an Ontario court stamp. There is no correct default. So an ambiguous
 * numeric date returns `ambiguous: true` with BOTH readings, and the caller must
 * ask. `07/04/2026` is ambiguous; `17/04/2026` is not, because 17 cannot be a
 * month.
 *
 * *** WHAT IS DELIBERATELY NOT HERE ***
 *
 * No model call. Dates are found deterministically so that organising a case works
 * with `AI_DOCUMENT_ANALYSIS_ENABLED` off, which is its state in production.
 */

export type DatePrecision = "day" | "month" | "year";

export type ParsedDate = {
  /** ISO date. For month precision the 1st; for year precision 1 January. */
  iso: string;
  precision: DatePrecision;
  /** The text this came from, verbatim, so a user can see what was read. */
  source: string;
  /** Set when a numeric date could be read two ways. Both are given. */
  ambiguous?: {
    /** Reading with the day first — the Canadian and European convention. */
    dayFirst: string;
    /** Reading with the month first — the United States convention. */
    monthFirst: string;
  };
  /** Time of day, when the text carried one. */
  time?: { hour: number; minute: number; timezone: string | null };
};

const MONTHS_EN: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * French month names, because Ontario is bilingual and a court document, a Quebec
 * supplier's invoice or a federal notice may be in French. Accents are stripped
 * before matching, so "février" and "fevrier" both work — a text layer from a scan
 * loses accents often enough that requiring them would drop real dates.
 */
const MONTHS_FR: Record<string, number> = {
  janvier: 1, janv: 1,
  fevrier: 2, fevr: 2, fev: 2,
  mars: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7,
  aout: 8,
  septembre: 9, sept: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  decembre: 12, dec: 12,

  /*
   * *** THE ACCENTED SPELLINGS ARE LISTED, AND THAT IS NOT REDUNDANCY ***
   *
   * `monthFromName` de-accents before looking a word up, so "février" resolves
   * through the entry above. But the month-name REGEX is built from these keys and
   * is matched against the raw text — so without the accented spellings present,
   * "15 février 2026" never matched the day pattern at all. It fell through to the
   * bare-year pattern and came back as 2026 at year precision: a date silently
   * degraded from a day to a year, in a bilingual province, with no error anywhere.
   *
   * Found by running the parser rather than by reading it. Stripping accents from
   * the text instead would have been cleaner but would corrupt `source`, which
   * exists so a user can see the words the date was read from.
   */
  "février": 2, "févr": 2, "fév": 2,
  "août": 8,
  "décembre": 12, "déc": 12,
};

/** Strips accents so French month names match however they were encoded. */
export function deaccent(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function monthFromName(word: string): number | null {
  const key = deaccent(word).toLowerCase().replace(/\.$/, "");
  return MONTHS_EN[key] ?? MONTHS_FR[key] ?? null;
}

/** Days in a month, leap years included. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  return day <= daysInMonth(year, month);
}

/** Whether a value is a date that exists, written as YYYY-MM-DD ("2026-02-30" is not). */
export function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return Boolean(match) && isRealDate(Number(match![1]), Number(match![2]), Number(match![3]));
}

/**
 * Today's date in Ontario, as YYYY-MM-DD (walkthrough run 38500825561, 2026-10-13
 * 22:30 in Toronto: a browser clock on UTC read 14 October and called a Toronto
 * notice passed whose next open day was still today). The deadlines are Ontario
 * deadlines, and the years offered for a date without one are counted from the
 * same day, so the day is Ontario's day everywhere.
 */
export function todayInOntario(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    const day = `${part("year")}-${part("month")}-${part("day")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  } catch {
    // No time-zone data: fall back to the device's own day.
  }
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const iso = (year: number, month: number, day: number): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * Two-digit years.
 *
 * A litigation document is about the recent past or the near future, so 26 is 2026
 * and not 1926. The century is chosen from a fixed pivot rather than from today's
 * date: a window that moves with the clock would make the same document parse
 * differently next year, and a date that changes under a stored document is worse
 * than one that is occasionally a century out.
 */
export const TWO_DIGIT_YEAR_PIVOT = 70;

export function expandTwoDigitYear(value: number): number {
  return value >= TWO_DIGIT_YEAR_PIVOT ? 1900 + value : 2000 + value;
}

/** A time of day with an optional zone, e.g. "2:15 p.m. ET" or "14:15 EST". */
function parseTime(text: string): ParsedDate["time"] | undefined {
  const match =
    /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?\s*\(?\b(ET|EST|EDT|PT|PST|PDT|MT|MST|CT|CST|UTC|GMT)?\b\)?/i.exec(
      text,
    );
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase().replace(/\./g, "");
  const zone = match[4] ? match[4].toUpperCase() : null;

  if (minute > 59) return undefined;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23) return undefined;

  return { hour, minute, timezone: zone };
}

/**
 * Every date in a piece of text, with its precision, in the order found.
 *
 * Deliberately returns ALL of them. A document carries several — an invoice date,
 * a due date, an email's sent and received headers — and which one orders the
 * document is the user's decision, not this function's.
 */
export function findDates(text: string): ParsedDate[] {
  const found: ParsedDate[] = [];
  const seen = new Set<string>();

  const push = (candidate: ParsedDate): void => {
    const key = `${candidate.iso}|${candidate.precision}|${candidate.source}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push(candidate);
  };

  const monthNames = [...Object.keys(MONTHS_EN), ...Object.keys(MONTHS_FR)]
    .sort((a, b) => b.length - a.length)
    .join("|");

  // ---- ISO: 2026-03-03 -----------------------------------------------------
  for (const m of text.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (isRealDate(year, month, day)) {
      push({ iso: iso(year, month, day), precision: "day", source: m[0], time: parseTime(text) });
    }
  }

  // ---- "March 3, 2026" and "Mar 3 2026" ------------------------------------
  for (const m of text.matchAll(
    new RegExp(String.raw`\b(${monthNames})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b`, "gi"),
  )) {
    const month = monthFromName(m[1]);
    const [day, year] = [Number(m[2]), Number(m[3])];
    if (month && isRealDate(year, month, day)) {
      push({ iso: iso(year, month, day), precision: "day", source: m[0], time: parseTime(text) });
    }
  }

  // ---- "3 March 2026" and French "3 mars 2026" -----------------------------
  for (const m of text.matchAll(
    new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+|of\s+)?(${monthNames})\.?,?\s+(\d{4})\b`, "gi"),
  )) {
    const month = monthFromName(m[2]);
    const [day, year] = [Number(m[1]), Number(m[3])];
    if (month && isRealDate(year, month, day)) {
      push({ iso: iso(year, month, day), precision: "day", source: m[0], time: parseTime(text) });
    }
  }

  // ---- numeric: 03/03/2026, 3/4/26, 03-04-2026 -----------------------------
  for (const m of text.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g)) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const year = m[3].length === 2 ? expandTwoDigitYear(Number(m[3])) : Number(m[3]);

    const dayFirstValid = isRealDate(year, second, first);
    const monthFirstValid = isRealDate(year, first, second);

    if (dayFirstValid && monthFirstValid && first !== second) {
      /*
       * Both readings are real and they differ. There is NO correct default: a US
       * supplier's invoice and an Ontario court stamp can sit in the same bundle.
       * The day-first reading is offered as `iso` so a caller that ignores the
       * flag gets the Canadian convention, but `ambiguous` is set and the UI must
       * ask.
       */
      push({
        iso: iso(year, second, first),
        precision: "day",
        source: m[0],
        ambiguous: {
          dayFirst: iso(year, second, first),
          monthFirst: iso(year, first, second),
        },
        time: parseTime(text),
      });
    } else if (dayFirstValid) {
      push({ iso: iso(year, second, first), precision: "day", source: m[0], time: parseTime(text) });
    } else if (monthFirstValid) {
      push({ iso: iso(year, first, second), precision: "day", source: m[0], time: parseTime(text) });
    }
  }

  // ---- month and year only: "March 2026", "mars 2026" ----------------------
  for (const m of text.matchAll(
    new RegExp(String.raw`\b(${monthNames})\.?\s+(\d{4})\b`, "gi"),
  )) {
    const month = monthFromName(m[1]);
    const year = Number(m[2]);
    if (!month) continue;
    // Skip if a day-precision date already covered this span.
    if (found.some((d) => d.precision === "day" && d.iso.startsWith(`${year}-${String(month).padStart(2, "0")}`))) {
      continue;
    }
    push({ iso: iso(year, month, 1), precision: "month", source: m[0] });
  }

  // ---- season and year: "spring 2026" --------------------------------------
  /*
   * A season is a quarter, not a month, so it is stored at YEAR precision with the
   * season kept in `source`. Mapping "spring" to March would state a month nobody
   * wrote, which is the invention this module exists to prevent.
   */
  for (const m of text.matchAll(/\b(spring|summer|fall|autumn|winter|printemps|ete|automne|hiver)\s+(\d{4})\b/gi)) {
    const year = Number(m[2]);
    push({ iso: iso(year, 1, 1), precision: "year", source: m[0] });
  }

  // ---- bare year -----------------------------------------------------------
  for (const m of text.matchAll(/\b(19\d{2}|20\d{2})\b/g)) {
    const year = Number(m[1]);
    // "$2000" or "2000 dollars" is an amount, not a year.
    if (text[(m.index ?? 0) - 1] === "$" || /^\s*(?:dollars|bucks|\$)/i.test(text.slice((m.index ?? 0) + m[0].length))) continue;
    if (found.some((d) => d.iso.startsWith(String(year)))) continue;
    push({ iso: iso(year, 1, 1), precision: "year", source: m[0] });
  }

  return found;
}

/** The single best date in a piece of text, or null. */
export function parseDate(text: string): ParsedDate | null {
  const all = findDates(text);
  if (all.length === 0) return null;
  // Most precise first; among equals, the earliest found.
  const rank: Record<DatePrecision, number> = { day: 0, month: 1, year: 2 };
  return [...all].sort((a, b) => rank[a.precision] - rank[b.precision])[0];
}

/**
 * One consistent, unambiguous format for everything exported to a court.
 *
 * "March 3, 2026", never "03/03/2026" — the format that caused the ambiguity in
 * the first place has no business in a document a judge reads. Month and year
 * precision print as what they are, so an exhibit index never claims a day the
 * document did not give.
 */
export function formatForCourt(isoDate: string, precision: DatePrecision = "day"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  if (precision === "year") return String(year);
  if (precision === "month") return `${names[month - 1]} ${year}`;
  return `${names[month - 1]} ${day}, ${year}`;
}

/** "2:15 p.m. ET" from a parsed time. */
export function formatTimeForCourt(time: NonNullable<ParsedDate["time"]>): string {
  const meridiem = time.hour < 12 ? "a.m." : "p.m.";
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  const clock = `${hour12}:${String(time.minute).padStart(2, "0")} ${meridiem}`;
  return time.timezone ? `${clock} ${time.timezone}` : clock;
}

// ---------------------------------------------------------------------------
// Relative dates in the user's own words
// ---------------------------------------------------------------------------

export type RelativeResolution = {
  iso: string;
  /** The arithmetic, shown to the user so they can check it. */
  workingOut: string;
  needsConfirmation: true;
};

/**
 * Resolves "two weeks after he was served" against a CONFIRMED anchor date.
 *
 * *** IT NEVER GUESSES AN ANCHOR ***
 *
 * Returns null when no anchor is supplied, rather than reaching for today's date or
 * the nearest document. A chronology built on a guessed anchor is wrong in a way
 * nobody can see afterwards, and the whole point of the workspace is that the
 * record is the user's confirmed values.
 */
export function resolveRelative(
  phrase: string,
  anchor: { iso: string; label: string } | null,
): RelativeResolution | null {
  if (!anchor) return null;

  const words: Record<string, number> = {
    a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10,
  };

  const match =
    /\b(\d+|a|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)\s+(after|before|later|earlier)\b/i.exec(
      phrase,
    );
  if (!match) return null;

  const count = /^\d+$/.test(match[1]) ? Number(match[1]) : words[match[1].toLowerCase()];
  if (!count) return null;

  const unit = match[2].toLowerCase().replace(/s$/, "");
  const backwards = /before|earlier/i.test(match[3]);
  const sign = backwards ? -1 : 1;

  const date = new Date(`${anchor.iso}T00:00:00Z`);
  if (unit === "day") date.setUTCDate(date.getUTCDate() + sign * count);
  if (unit === "week") date.setUTCDate(date.getUTCDate() + sign * count * 7);
  if (unit === "month") date.setUTCMonth(date.getUTCMonth() + sign * count);

  const result = date.toISOString().slice(0, 10);

  return {
    iso: result,
    workingOut:
      `${count} ${unit}${count === 1 ? "" : "s"} ${backwards ? "before" : "after"} ` +
      `${anchor.label} (${formatForCourt(anchor.iso)}) gives ${formatForCourt(result)}`,
    needsConfirmation: true,
  };
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

export type Datable = { userDate: string | null; userDatePrecision?: DatePrecision };

/**
 * Chronological order, with undated items separated rather than sorted.
 *
 * *** WHY TWO GROUPS AND NOT A NULL SORT ***
 *
 * A null sorted to either end LOOKS ordered. An undated exhibit that appears first
 * reads as the earliest event in the case, and one that appears last reads as the
 * most recent; both are claims the document never made. So undated items come back
 * in their own group for the UI to label "date needed", and never inside the
 * sequence.
 */
export function chronological<T extends Datable>(items: T[]): { dated: T[]; undated: T[] } {
  const dated = items.filter((item) => item.userDate !== null);
  const undated = items.filter((item) => item.userDate === null);

  dated.sort((a, b) => {
    const byDate = (a.userDate as string).localeCompare(b.userDate as string);
    if (byDate !== 0) return byDate;
    /*
     * Same date, different precision: the more precise first. A document known to
     * the day is a firmer claim about that day than one known only to the month,
     * so it leads.
     */
    const rank: Record<DatePrecision, number> = { day: 0, month: 1, year: 2 };
    return rank[a.userDatePrecision ?? "day"] - rank[b.userDatePrecision ?? "day"];
  });

  return { dated, undated };
}

/* ==========================================================================
 * THE PERSON'S OWN DATES: ONE READER FOR EVERY AREA AND EVERY PAGE (step 1).
 *
 * Everything below is what the intake, the review panel, the chat, the
 * results page and the case page use to read a date the person typed or
 * wrote in their story, and to ask for the year when it is missing. Before,
 * eight places did this their own way and disagreed: "October 6" was accepted
 * in Small Claims and civil but asked for in Family, guessed as this year on
 * the results page, dropped by the Small Claims questions, and missed by the
 * chat (which then asked for "the main dates").
 *
 * The rules, on top of the two above (no invented precision; ambiguity asks):
 *   - a day and month with no year is never given a year: the person is asked,
 *     and offered the two years it can mean (yearChoices), nothing counted
 *     until they choose;
 *   - "last Tuesday", "two weeks ago" are not dates: a date box asks for one.
 *
 * A guard (test:shared-behaviour) fails if a month-name list, a date pattern
 * or a year guess appears anywhere else.
 * ======================================================================== */

/** Every month name and short form this reader knows, as one alternation (longest first). */
export const MONTH_NAMES_PATTERN = [...Object.keys(MONTHS_EN), ...Object.keys(MONTHS_FR)]
  .sort((a, b) => b.length - a.length)
  .join("|");

/** The month names in English, for writing a date back to the person. */
export const MONTH_WORDS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** The month number for a written month ("Oct", "october", "octobre"), or null. */
export function monthNumber(word: string): number | null {
  return monthFromName(word);
}

/** A day and month the person wrote without a year: "October 6", "6 Oct", "Oct. 6th". */
export type DayMonth = { month: number; day: number; source: string; index: number; /** All numbers ("10/06"): which is the month cannot be told. */ numeric?: boolean };

/** Every day and month written without a year, never inside a full date. */
export function findDayMonthWithoutYear(text: string): DayMonth[] {
  const full = findDates(text).filter((date) => date.precision === "day");
  const covered = (index: number, length: number) =>
    full.some((date) => {
      const at = text.indexOf(date.source);
      return at >= 0 && index < at + date.source.length && at < index + length;
    });
  const out: DayMonth[] = [];
  const patterns: [RegExp, (m: RegExpMatchArray) => [string, string]][] = [
    [new RegExp(String.raw`\b(${MONTH_NAMES_PATTERN})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*,?\s*\d{4})(?![/\-.]\d)(?!\s*(?:weeks?|days?|months?|years?|hours?|wks?|yrs?)\b)`, "gi"), (m) => [m[1], m[2]]],
    [new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+|de\s+)?(${MONTH_NAMES_PATTERN})\b\.?(?!\s*,?\s*\d{4})`, "gi"), (m) => [m[2], m[1]]],
  ];
  for (const [pattern, parts] of patterns) {
    for (const m of text.matchAll(pattern)) {
      const index = m.index ?? 0;
      if (covered(index, m[0].length)) continue;
      const [monthWord, dayText] = parts(m);
      const month = monthFromName(monthWord);
      const day = Number(dayText);
      if (!month || day < 1 || day > 31 || day > daysInMonth(2024, month)) continue;
      if (out.some((found) => found.index === index)) continue;
      out.push({ month, day, source: m[0], index });
    }
  }
  // A numeric day and month with no year: "10/06".
  for (const m of text.matchAll(/\b(\d{1,2})[/](\d{1,2})\b(?![/\-.]\d)/g)) {
    const index = m.index ?? 0;
    if (covered(index, m[0].length)) continue;
    const [first, second] = [Number(m[1]), Number(m[2])];
    if (first > 31 || second > 31 || (first > 12 && second > 12)) continue;
    // Which is the month cannot be told; the year question asks for the whole date.
    out.push({ month: first <= 12 ? first : second, day: first <= 12 ? second : first, source: m[0], index, numeric: true });
  }
  return out.sort((a, b) => a.index - b.index);
}

// A time relative to now, or a weekday alone ("on Monday"): no date can be read from it.
const RELATIVE_DATE = /\b(?:yesterday|today|tonight|tomorrow|the day before yesterday|(?:last|this|next) (?:week|month|night|year|spring|summer|fall|autumn|winter|morning|afternoon|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|a few|several|couple of) (?:days?|weeks?|months?|years?) ago|ago)\b/i;

/** Whether the text names a time only relative to now ("last Tuesday", "two weeks ago"). */
export function mentionsRelativeDate(text: string): boolean {
  return RELATIVE_DATE.test(text);
}

/** Whether the text names a date of any kind: a full date, a month and year, a day and month, or a relative one. */
export function mentionsDate(text: string): boolean {
  return findDates(text).length > 0 || findDayMonthWithoutYear(text).length > 0 || mentionsRelativeDate(text) || MONTH_ALONE.test(text);
}

/**
 * A month named on its own ("in March"): a date is mentioned, though no day can be
 * read. "may" counts only as a date ("in may", "may 14"), never the verb ("it may
 * be"), as the event reader had it.
 */
const MONTH_ALONE = new RegExp(
  String.raw`\b(?:${MONTH_NAMES_PATTERN.split("|").filter((name) => name !== "may").join("|")})\b|\b(?:in|on|since|of|last|by|until|early|late|mid|this|next)\s+may\b|\bmay\s+\d`,
  "i",
);

/** The first full, unambiguous date in a text, with the words it came from. */
export function firstFullDate(text: string): { iso: string; source: string } | null {
  const found = findDates(text)
    .filter((date) => date.precision === "day" && !date.ambiguous)
    .sort((a, b) => text.indexOf(a.source) - text.indexOf(b.source))[0];
  return found ? { iso: found.iso, source: found.source } : null;
}

/**
 * The date a typed answer gives, for counting (the deadline engine), or null. The
 * same reading as the date box (readAnswerDate), so what a box keeps is what is
 * counted: one unambiguous full date with the month in words or as ISO, and no
 * other date beside it.
 */
export function parseAnswerDate(input: string): string | null {
  return readAnswerDate(input, { oneDate: true }).iso;
}

/**
 * Whether a month and year was written with a day in front that could not be read
 * ("31 June 2026", a day that does not exist): the month alone is not what the
 * person wrote, so it is asked for rather than offered as "June 2026".
 */
export function dayWrittenBefore(text: string, date: ParsedDate): boolean {
  const at = text.indexOf(date.source);
  return date.precision === "month" && at >= 0 && /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?$/i.test(text.slice(0, at));
}

/**
 * A date that can be counted from as written: a day, not ambiguous, and not all
 * numbers ("17/04/2026" is a convention, not a fact; the person is asked for the
 * month in words).
 */
export function countable(date: ParsedDate): boolean {
  return date.precision === "day" && !date.ambiguous && !NUMERIC_DATE.test(date.source.trim());
}

/**
 * The two years a day and month with no year can mean, nearest first: for an
 * upcoming event this year's or next, otherwise this year's or last. Offered
 * as a question; never used until the person picks one.
 */
export function yearChoices(month: number, day: number, options: { now?: Date; upcoming?: boolean } = {}): string[] {
  const today = todayInOntario(options.now ?? new Date());
  const thisYear = Number(today.slice(0, 4));
  const real = (year: number) => (isRealDate(year, month, day) ? iso(year, month, day) : null);
  const current = real(thisYear);
  if (!current) return [real(thisYear - 1), real(thisYear + 1)].filter((date): date is string => Boolean(date));
  const nearest = options.upcoming ? (current >= today ? current : real(thisYear + 1)) : current <= today ? current : real(thisYear - 1);
  if (!nearest) return [current];
  const nearestYear = Number(nearest.slice(0, 4));
  const other = real(options.upcoming ? nearestYear + 1 : nearestYear - 1);
  return [nearest, ...(other ? [other] : [])];
}

/** The same choices for an ISO date whose year was not given (its month and day). */
export function yearChoicesFor(isoDate: string, options: { now?: Date; upcoming?: boolean } = {}): string[] {
  return yearChoices(Number(isoDate.slice(5, 7)), Number(isoDate.slice(8, 10)), options);
}

export const ADD_THE_YEAR = "Please add the year, for example October 6, 2026.";
export const GIVE_THE_DATE = "Please give the day, month and year, for example October 6, 2026.";
/** An all-numbers date has two readings and is never counted from: asked for with the month as a word. */
export const MONTH_IN_WORDS = "Please write the month as a word, for example October 6, 2026.";

/**
 * What a typed answer to a date question still needs, or null. The one rule
 * for every date box in every area (readAnswerDate).
 */
export function needsYear(answer: string, options: { oneDate?: boolean } = {}): string | null {
  return readAnswerDate(answer, options).ask;
}

/** More than one date in one answer: which one is meant cannot be told. */
export const ONE_DATE = "Please give one date, for example October 6, 2026.";

// Three numbers that could be a date but are not read as one ("02/30/26", "2026/10/06", "20261006", "2026-10-06T00:00").
const NUMBERS_LIKE_A_DATE = /\b\d{4}[/.]\d{1,2}[/.]\d{1,2}\b|\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b|\b(?:19|20)\d{6}\b|\b\d{4}-\d{1,2}-\d{1,2}T/;
// A day with no month ("the 6th").
const DAY_ONLY = /\b(?:the\s+)?\d{1,2}(?:st|nd|rd|th)\b/i;

/**
 * The one reading of a typed answer to a date question, shared by every date box
 * (needsYear, dateAnswerCheck) and by the deadline count (parseAnswerDate), so a
 * box whose answer is counted never keeps a date that is then not counted (step 1
 * reviewer: "served Oct 6, hearing October 20, 2026" was kept, then dropped).
 *
 * `oneDate`: the box's answer is counted from (a deadline's date question, Family's
 * served date, and the count itself). A box that only asks roughly when ("Roughly
 * when did it happen?") may name two full dates; they are kept as words.
 *
 *   - one full date, month in words or ISO, nothing else dated: counted, nothing asked;
 *   - (oneDate) more than one date, or a date and "last Tuesday": asks for one date;
 *   - an all-numbers date ("10/06/2026"): asks for the month in words;
 *   - numbers that are no readable date ("02/30/26", "2026/10/06"): asks for the date;
 *   - a day and month without the year: asks for the year (never guessed);
 *   - a day that does not exist, a day with no month, a date written another way
 *     ("6-Oct-2026"), or a time only relative to now: asks for the date;
 *   - a month and year, a year, or no date at all: taken as words, not counted.
 */
export function readAnswerDate(answer: string, options: { oneDate?: boolean } = {}): { iso: string | null; ask: string | null } {
  const text = answer.trim();
  const none = { iso: null, ask: null };
  if (!text) return none;
  const days = findDates(text).filter((date) => date.precision === "day");
  const counted = days.filter(countable);
  const numeric = days.filter((date) => !countable(date));
  const partial = findDayMonthWithoutYear(text);
  const relative = mentionsRelativeDate(text);
  if (counted.length === 1 && !numeric.length && !partial.length && !relative) return { iso: counted[0].iso, ask: null };
  if (options.oneDate && (counted.length + numeric.length + partial.length > 1 || (counted.length && relative))) return { iso: null, ask: ONE_DATE };
  if (numeric.length) return { iso: null, ask: MONTH_IN_WORDS };
  if (NUMBERS_LIKE_A_DATE.test(text)) return { iso: null, ask: GIVE_THE_DATE };
  if (partial.length) return { iso: null, ask: ADD_THE_YEAR };
  // Full dates, with the year written, beside other words: kept as words where nothing is counted.
  if (counted.length) return none;
  if (IMPOSSIBLE_DATE.test(text) || DAY_ONLY.test(text) || relative) return { iso: null, ask: GIVE_THE_DATE };
  return none;
}

/** Whether a question asks for a date ("When ...?", "What day ...?", "... date ..."). */
export function asksForDate(question: string): boolean {
  return /\b(?:when|what day|which day|date)\b/i.test(question);
}

/** The first full date written in words or as ISO (not all numbers), with its words and position. */
export function firstWordedDate(text: string): { iso: string; source: string; index: number } | null {
  const found = findDates(text)
    .filter(countable)
    .map((date) => ({ iso: date.iso, source: date.source, index: text.indexOf(date.source) }))
    .sort((a, b) => a.index - b.index);
  return found[0] ?? null;
}

const NUMERIC_DATE = /^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$/;

/** Where each date the person wrote sits in a text: full dates in words or ISO, and days and months without a year. */
export function dateSpans(text: string): { index: number; source: string }[] {
  return dateMentionsIn(text).map(({ index, source }) => ({ index, source }));
}

/** A date the person wrote, with its parts: the year only when they wrote it. */
export type DateMention = { index: number; source: string; month: number; day: number; year: number | null; iso: string | null };

/**
 * Every day the person wrote, in order: full dates in words or ISO (with their
 * year and ISO), and days and months without a year (year null, never filled).
 * All-numbers dates are left out: which part is the month cannot be told.
 */
export function dateMentionsIn(text: string): DateMention[] {
  const full = findDates(text)
    .filter(countable)
    .map((date) => {
      const [year, month, day] = date.iso.split("-").map(Number);
      return { index: text.indexOf(date.source), source: date.source, month, day, year, iso: date.iso };
    });
  const partial = findDayMonthWithoutYear(text)
    .filter((date) => !date.numeric)
    .map((date) => ({ index: date.index, source: date.source, month: date.month, day: date.day, year: null, iso: null }));
  return [...full, ...partial].filter((mention) => mention.index >= 0).sort((a, b) => a.index - b.index);
}

/**
 * A date the person wrote, as a value to offer them: the full date when they
 * wrote one, or, with no year written, the nearer of the two years it can mean,
 * marked so it is asked and never counted until they choose (yearChoices).
 */
export function offeredDate(text: string, options: { now?: Date; upcoming?: boolean } = {}): { value: string; yearMissing: boolean } | null {
  const worded = firstWordedDate(text);
  const value = worded ? parseAnswerDate(worded.source) : null;
  if (value) return { value, yearMissing: false };
  const partial = findDayMonthWithoutYear(text).find((date) => !date.numeric);
  if (!partial) return null;
  const nearest = yearChoices(partial.month, partial.day, options)[0];
  return nearest ? { value: nearest, yearMissing: true } : null;
}

/** The days of the week, as one alternation: a weekday is not a date, but it names a moment. */
export const WEEKDAY_NAMES_PATTERN = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";

/**
 * The two years an offered date without a written year can mean, given the
 * year offered first: that one, and the one beyond it (next year for a date on
 * or after today, last year otherwise). The person picks.
 */
export function yearChoicesAround(isoDate: string, today: string): string[] {
  const year = Number(isoDate.slice(0, 4));
  const rest = isoDate.slice(4);
  const other = isoDate >= today ? year + 1 : year - 1;
  const [month, day] = [Number(rest.slice(1, 3)), Number(rest.slice(4, 6))];
  return [year, other].filter((value) => isRealDate(value, month, day)).map((value) => `${value}${rest}`);
}

/** The full English month names only ("january|february|..."): where a short form ("Jan", "Mar") could be a name. */
export const MONTH_FULL_NAMES_PATTERN = MONTH_WORDS_EN.map((month) => month.toLowerCase()).join("|");

/**
 * What a typed answer to a question still needs before it is kept, when the
 * question asks for a date (its words, or its type): the one check every date
 * box uses -- the questions one at a time in all three areas, the review panel's
 * questions and its served-date box. Null when the question is not about a date
 * or the answer is complete.
 */
export function dateAnswerCheck(question: string, answer: string, options: { dateQuestion?: boolean; oneDate?: boolean } = {}): string | null {
  return isDateQuestion(question, options) || options.oneDate ? needsYear(answer, { oneDate: options.oneDate }) : null;
}

/** Whether a box's question asks for a date (its words, or its type): the boxes dateAnswerCheck applies to. */
export function isDateQuestion(question: string, options: { dateQuestion?: boolean } = {}): boolean {
  return Boolean(options.dateQuestion) || asksForDate(question);
}

/**
 * A day and month in either order, year or not, with spaces or hyphens ("Feb 30,
 * 2026", "sept 31", "6-Oct-2026"), or an ISO date ("2026-02-30"): readAnswerDate asks
 * for the date when nothing in it was read as a real one.
 */
const IMPOSSIBLE_DATE = new RegExp(String.raw`\b(?:(?:${MONTH_NAMES_PATTERN})\.?[\s-]+\d{1,2}(?:st|nd|rd|th)?(?:,?[\s-]+\d{4})?|\d{1,2}(?:st|nd|rd|th)?[\s-]+(?:of\s+)?(?:${MONTH_NAMES_PATTERN})\.?(?:,?[\s-]+\d{4})?|\d{4}-\d{1,2}-\d{1,2})\b`, "i");
