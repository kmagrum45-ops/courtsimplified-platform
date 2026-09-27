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
    new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?(${monthNames})\.?,?\s+(\d{4})\b`, "gi"),
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
