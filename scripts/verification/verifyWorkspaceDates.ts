/**
 * Dates parse correctly, precision is never invented, ambiguity is surfaced, and
 * chronological order is independent of upload order.
 *
 * WHAT THIS CATCHES: a date the workspace states that no document gave.
 *
 * The workspace's whole value is that a user's exhibit book and chronology come out
 * in the order a court reads them. Every one of those dates is printed next to a
 * document in a bundle that goes to a judge. So the failure to guard against is not
 * "the parser threw" — it is "the parser produced a plausible date that is wrong",
 * because nobody downstream can tell.
 *
 * Three specific ways that happens, each with tests below:
 *
 * 1. **Invented precision.** "March 2026" stored as 2026-03-03 asserts a day. The
 *    parser must return month precision, and `formatForCourt` must print "March
 *    2026" and not "March 1, 2026".
 * 2. **Silently resolved ambiguity.** 03/04/2026 is 3 April in Canada and 4 March
 *    in the United States, and a bundle can contain both conventions. Choosing one
 *    quietly is the single most likely wrong date in the product.
 * 3. **Undated items sorted into the sequence.** A null at either end LOOKS
 *    ordered; an undated exhibit appearing first reads as the earliest event.
 *
 * COSTS NOTHING. Pure functions. No network, no model, no database.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceDates.ts
 */

import {
  chronological,
  daysInMonth,
  expandTwoDigitYear,
  findDates,
  formatForCourt,
  formatTimeForCourt,
  parseDate,
  resolveRelative,
} from "../../src/lib/case-workspace/parseDate";

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE DATES");
console.log("");

// ---------------------------------------------------------------------------
// 1. Every format that appears in Canadian documents
// ---------------------------------------------------------------------------

{
  const cases: Array<[string, string, "day" | "month" | "year"]> = [
    // English, long and short, with and without ordinals and commas.
    ["March 3, 2026", "2026-03-03", "day"],
    ["March 3 2026", "2026-03-03", "day"],
    ["Mar 3, 2026", "2026-03-03", "day"],
    ["March 3rd, 2026", "2026-03-03", "day"],
    ["3 March 2026", "2026-03-03", "day"],
    ["3rd March 2026", "2026-03-03", "day"],
    ["Sept 9, 2026", "2026-09-09", "day"],
    // ISO, which court e-filing stamps use.
    ["2026-03-03", "2026-03-03", "day"],
    ["2026-3-3", "2026-03-03", "day"],
    // Numeric where only one reading is possible.
    ["17/04/2026", "2026-04-17", "day"],
    ["31-12-2026", "2026-12-31", "day"],
    ["25.12.2026", "2026-12-25", "day"],
    // French, accented and stripped — a scan's text layer loses accents.
    ["3 mars 2026", "2026-03-03", "day"],
    ["15 février 2026", "2026-02-15", "day"],
    ["15 fevrier 2026", "2026-02-15", "day"],
    ["3 août 2026", "2026-08-03", "day"],
    ["1 décembre 2026", "2026-12-01", "day"],
    // Partial dates keep their precision.
    ["March 2026", "2026-03-01", "month"],
    ["décembre 2026", "2026-12-01", "month"],
    ["spring 2026", "2026-01-01", "year"],
    ["2026", "2026-01-01", "year"],
    // Leap years.
    ["29 February 2024", "2024-02-29", "day"],
    ["February 29, 2024", "2024-02-29", "day"],
  ];

  const problems: string[] = [];
  for (const [text, expectedIso, expectedPrecision] of cases) {
    const result = parseDate(text);
    if (!result) {
      problems.push(`"${text}" parsed to nothing`);
      continue;
    }
    if (result.iso !== expectedIso || result.precision !== expectedPrecision) {
      problems.push(
        `"${text}" gave ${result.iso} (${result.precision}), expected ${expectedIso} (${expectedPrecision})`,
      );
    }
  }

  if (problems.length === 0) pass(`all ${cases.length} date formats parse with the right precision`);
  else fail("a date format parsed wrongly", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 2. Ambiguity is surfaced, never resolved silently
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  // Both readings real and different -> ambiguous, with both offered.
  for (const [text, dayFirst, monthFirst] of [
    ["03/04/2026", "2026-04-03", "2026-03-04"],
    ["3/4/26", "2026-04-03", "2026-03-04"],
    ["07/04/2026", "2026-04-07", "2026-07-04"],
    ["12/01/2026", "2026-01-12", "2026-12-01"],
  ] as Array<[string, string, string]>) {
    const result = parseDate(text);
    if (!result?.ambiguous) {
      problems.push(`"${text}" was NOT flagged ambiguous — a wrong date would ship silently`);
      continue;
    }
    if (result.ambiguous.dayFirst !== dayFirst || result.ambiguous.monthFirst !== monthFirst) {
      problems.push(
        `"${text}" offered ${result.ambiguous.dayFirst}/${result.ambiguous.monthFirst}, ` +
          `expected ${dayFirst}/${monthFirst}`,
      );
    }
  }

  // Only one reading possible -> NOT ambiguous. Over-flagging trains users to
  // click through the prompt, which destroys the prompt's value.
  for (const text of ["17/04/2026", "31-12-2026", "25.12.2026"]) {
    if (parseDate(text)?.ambiguous) {
      problems.push(`"${text}" was flagged ambiguous though only one reading is a real date`);
    }
  }

  // Same number both sides cannot be ambiguous: 05/05 is 5 May either way.
  if (parseDate("05/05/2026")?.ambiguous) {
    problems.push("05/05/2026 was flagged ambiguous, but both readings are the same date");
  }

  if (problems.length === 0) pass("ambiguous numeric dates are flagged with both readings, and only those");
  else fail("ambiguity handling is wrong", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 3. Impossible dates do not become plausible ones
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  /*
   * 29 February 2026 does not exist — 2026 is not a leap year. The parser must not
   * return 2026-02-29, and must not silently slide to the 28th or the 1st AT DAY
   * PRECISION. Falling back to month precision is acceptable and is what happens:
   * the text really does say February 2026, and month precision claims no day.
   */
  const impossible = parseDate("29 February 2026");
  if (impossible?.iso === "2026-02-29") {
    problems.push("29 February 2026 was accepted as a real date");
  }
  if (impossible && impossible.precision === "day") {
    problems.push(
      `29 February 2026 came back at DAY precision as ${impossible.iso} — ` +
        `a day the document never gave`,
    );
  }

  for (const text of ["32/01/2026", "2026-13-01", "00/05/2026"]) {
    const result = parseDate(text);
    if (result && result.precision === "day") {
      problems.push(`"${text}" produced a day-precision date: ${result.iso}`);
    }
  }

  if (daysInMonth(2024, 2) !== 29) problems.push("daysInMonth says February 2024 is not 29 days");
  if (daysInMonth(2026, 2) !== 28) problems.push("daysInMonth says February 2026 is not 28 days");
  if (daysInMonth(2000, 2) !== 29) problems.push("daysInMonth is wrong on the 2000 century leap year");
  if (daysInMonth(1900, 2) !== 28) problems.push("daysInMonth is wrong on the 1900 century non-leap year");

  if (problems.length === 0) pass("impossible dates never come back at day precision; leap years are right");
  else fail("an impossible date became a plausible one", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 4. Two-digit years are stable, not relative to today
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  if (expandTwoDigitYear(26) !== 2026) problems.push("26 did not expand to 2026");
  if (expandTwoDigitYear(99) !== 1999) problems.push("99 did not expand to 1999");
  if (expandTwoDigitYear(70) !== 1970) problems.push("70 did not expand to 1970 (the pivot)");
  if (expandTwoDigitYear(69) !== 2069) problems.push("69 did not expand to 2069 (just under the pivot)");

  /*
   * The pivot is fixed rather than derived from the current year on purpose: a
   * sliding window would make the same stored document parse differently next year,
   * and a date that changes under a document already in a bundle is worse than one
   * that is occasionally a century out.
   */
  if (problems.length === 0) pass("two-digit years expand from a fixed pivot, so a stored date cannot drift");
  else fail("two-digit year expansion is wrong", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 5. Several dates in one document, all returned with their roles available
// ---------------------------------------------------------------------------

{
  const invoice = "Invoice date: March 3, 2026. Payment due: April 2, 2026. Sent 2026-03-04.";
  const all = findDates(invoice);
  const isos = all.map((d) => d.iso);
  const problems: string[] = [];

  for (const expected of ["2026-03-03", "2026-04-02", "2026-03-04"]) {
    if (!isos.includes(expected)) problems.push(`${expected} was not found in the invoice text`);
  }

  if (problems.length === 0) {
    pass(`every date in a document is returned, not just the first (${all.length} found)`);
  } else {
    fail("findDates missed a date", `${problems.join("\n")}\nfound: ${isos.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// 6. Times and timezones
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  const email = parseDate("Sent: March 3, 2026 2:15 p.m. ET");
  if (!email?.time) problems.push("no time was read from an email header");
  else {
    if (email.time.hour !== 14 || email.time.minute !== 15) {
      problems.push(`2:15 p.m. read as ${email.time.hour}:${email.time.minute}`);
    }
    if (email.time.timezone !== "ET") problems.push(`timezone read as ${email.time.timezone}`);
    const printed = formatTimeForCourt(email.time);
    if (printed !== "2:15 p.m. ET") problems.push(`printed as "${printed}", expected "2:15 p.m. ET"`);
  }

  const midnight = parseDate("2026-03-03 12:30 a.m.");
  if (midnight?.time && midnight.time.hour !== 0) {
    problems.push(`12:30 a.m. read as hour ${midnight.time.hour}, should be 0`);
  }
  const noon = parseDate("2026-03-03 12:30 p.m.");
  if (noon?.time && noon.time.hour !== 12) {
    problems.push(`12:30 p.m. read as hour ${noon.time.hour}, should be 12`);
  }

  if (problems.length === 0) pass("times parse with meridiem and timezone, and print as the court format");
  else fail("time handling is wrong", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 7. Court format states only what the precision supports
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  if (formatForCourt("2026-03-03", "day") !== "March 3, 2026") problems.push("day format wrong");
  if (formatForCourt("2026-03-01", "month") !== "March 2026") {
    problems.push(`month precision printed "${formatForCourt("2026-03-01", "month")}" — it must not state a day`);
  }
  if (formatForCourt("2026-01-01", "year") !== "2026") {
    problems.push(`year precision printed "${formatForCourt("2026-01-01", "year")}"`);
  }
  // The format that caused the ambiguity has no business in an exported document.
  if (/\d{2}\/\d{2}/.test(formatForCourt("2026-03-03", "day"))) {
    problems.push("the court format uses slashes, which is the ambiguous form");
  }

  if (problems.length === 0) pass("the court format never states precision the date does not have");
  else fail("the court format is wrong", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 8. Relative dates need an anchor, and show their working
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (resolveRelative("two weeks after he was served", null) !== null) {
    problems.push("a relative date resolved with NO anchor — it must never guess one");
  }

  const anchor = { iso: "2026-03-03", label: "the day you were served" };
  const two = resolveRelative("two weeks after he was served", anchor);
  if (two?.iso !== "2026-03-17") problems.push(`two weeks after 3 March gave ${two?.iso}`);
  if (two && !two.workingOut.includes("March 17, 2026")) {
    problems.push("the working out does not show the resulting date in the court format");
  }
  if (two && two.needsConfirmation !== true) {
    problems.push("a resolved relative date was not marked as needing confirmation");
  }

  const before = resolveRelative("3 days before the hearing", { iso: "2026-03-10", label: "the hearing" });
  if (before?.iso !== "2026-03-07") problems.push(`3 days before 10 March gave ${before?.iso}`);

  const months = resolveRelative("2 months after filing", { iso: "2026-01-31", label: "filing" });
  if (!months) problems.push("a month-based relative date did not resolve");

  if (problems.length === 0) pass("relative dates resolve only against a confirmed anchor and show their working");
  else fail("relative date handling is wrong", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 9. Chronological order is independent of upload order
// ---------------------------------------------------------------------------

{
  // Twenty documents in deliberately scrambled upload order, mixed formats and
  // precisions, including three undated. This is the Part 3A acceptance test.
  const uploaded = [
    { id: "n", userDate: null as string | null },
    { id: "e", userDate: "2026-03-04" },
    { id: "a", userDate: "2026-01-05" },
    { id: "k", userDate: "2026-06-01", userDatePrecision: "month" as const },
    { id: "c", userDate: "2026-02-14" },
    { id: "n2", userDate: null as string | null },
    { id: "h", userDate: "2026-04-30" },
    { id: "b", userDate: "2026-01-20" },
    { id: "j", userDate: "2026-05-15" },
    { id: "d", userDate: "2026-03-03" },
    { id: "m", userDate: "2026-01-01", userDatePrecision: "year" as const },
    { id: "f", userDate: "2026-03-20" },
    { id: "i", userDate: "2026-05-01" },
    { id: "n3", userDate: null as string | null },
    { id: "g", userDate: "2026-04-01" },
    { id: "l", userDate: "2026-07-04" },
    { id: "o", userDate: "2026-08-08" },
    { id: "p", userDate: "2026-09-09" },
    { id: "q", userDate: "2026-10-10" },
    { id: "r", userDate: "2026-11-11" },
  ];

  const { dated, undated } = chronological(uploaded);
  const problems: string[] = [];

  if (undated.length !== 3) problems.push(`${undated.length} undated items, expected 3`);
  if (dated.length !== 17) problems.push(`${dated.length} dated items, expected 17`);

  // Strictly non-decreasing by date.
  for (let i = 1; i < dated.length; i += 1) {
    if ((dated[i - 1].userDate as string) > (dated[i].userDate as string)) {
      problems.push(
        `out of order at ${i}: ${dated[i - 1].userDate} before ${dated[i].userDate}`,
      );
    }
  }

  // The year-precision item sorts by its stored date (1 January) and leads.
  if (dated[0].id !== "m") {
    problems.push(`the 2026 year-precision item did not lead; ${dated[0].id} did`);
  }

  // No undated item may appear inside the sequence.
  if (dated.some((item) => item.userDate === null)) {
    problems.push("an undated item was sorted into the dated sequence");
  }

  if (problems.length === 0) {
    pass("20 documents uploaded out of order come back chronological, with 3 undated grouped apart");
  } else {
    fail("ordering is wrong", problems.join("\n"));
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
