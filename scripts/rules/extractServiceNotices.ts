/**
 * Extracts COURT CLOSURE dates from the vendored court-service notice sources,
 * as dated data with the sentence each date came from.
 *
 * Run: npm run rules:notices
 * Writes: src/lib/case-system/deadlines/courtServiceNotices.json
 *
 * *** WHY A GENERATOR AND NOT A TYPED LIST ***
 *
 * A closure date typed by hand is a legal-ish fact with no source behind it, and
 * this repository does not ship those. Every record below carries the `quote` it
 * was read from, and `test:service-notices` re-checks that the quote still appears
 * verbatim in the vendored source. Hand-editing the JSON therefore fails a check
 * rather than silently becoming truth.
 *
 * *** THE STALE-NOTICE PROBLEM IS REAL, NOT THEORETICAL ***
 *
 * ontario-file-small-claims-online carries the 2026 closure near the top AND a
 * 2025 one further down, still in the page. Anything that grabbed "the" closure
 * notice would have a 50/50 chance of announcing last year's. So every notice is
 * extracted with its own year and the renderer filters by date; nothing is
 * "current" by position on the page.
 *
 * *** THE WEEKDAY IS A CROSS-CHECK, NOT DECORATION ***
 *
 * The notices state a weekday ("Wednesday, September 30, 2026"). That is a free
 * checksum: if the stated weekday does not match the weekday the date actually
 * falls on, either the parse is wrong or the notice is wrong, and in both cases
 * shipping the date would be worse than shipping nothing. A mismatch is a hard
 * failure.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");
const OUT = path.join(
  ROOT,
  "src",
  "lib",
  "case-system",
  "deadlines",
  "courtServiceNotices.json",
);

/** The sources that may carry a closure notice. */
const NOTICE_SOURCE_IDS = [
  "ontario-file-small-claims-online",
  "ontario-file-civil-claim-online",
  "scj-news",
];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type ServiceNotice = {
  /** ISO date the office is closed. */
  closedOn: string;
  /** What the notice calls the occasion, taken from the notice. */
  occasion: string;
  /** ISO date a filing made on closedOn is stamped, when the notice says. */
  stampedAs: string | null;
  /** Whether the online portal stays available, when the notice says. */
  portalAvailable: boolean | null;
  sourceId: string;
  sourceUrl: string;
  /** The sentence this came from, verbatim. Checked by test:service-notices. */
  quote: string;
  /** The weekday the notice stated, confirmed against the date itself. */
  weekdayStated: string;
};

function isoFrom(year: number, monthName: string, day: number): string {
  const month = MONTHS.indexOf(monthName.toLowerCase()) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekdayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Collapses the whitespace antiword and HTML extraction both leave behind. */
function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractNotices(
  text: string,
  sourceId: string,
  sourceUrl: string,
): { notices: ServiceNotice[]; problems: string[] } {
  const notices: ServiceNotice[] = [];
  const problems: string[] = [];

  /*
   * Split on the page's OWN LINES first, then on sentence ends inside each line.
   *
   * The first version normalised all whitespace away and then split on ". ",
   * which produced a `quote` containing the page's navigation and the contact
   * centre's phone numbers alongside the closure sentence — because on a
   * collapsed page those have no sentence boundary between them. The quote is
   * what a reader is shown as the source of a date, so a quote that runs through
   * a TTY number is not usable evidence of anything.
   *
   * The vendored extraction already puts each banner sentence on its own line,
   * so the line structure is the better unit and costs nothing to respect.
   */
  const sentences = text
    .split(/\r?\n/)
    .flatMap((line) => normalise(line).split(/(?<=\.)\s+/))
    .map((s) => s.trim())
    .filter(Boolean);

  const closedRe = new RegExp(
    String.raw`closed on\s+(${WEEKDAYS.join("|")}),?\s+(${MONTHS.join("|")})\s+(\d{1,2}),?\s+(\d{4})`,
    "i",
  );
  const stampedRe = new RegExp(
    String.raw`next business day,?\s+(${MONTHS.join("|")})\s+(\d{1,2}),?\s+(\d{4})`,
    "i",
  );

  sentences.forEach((sentence, index) => {
    const closed = closedRe.exec(sentence);
    if (!closed) return;

    const [, weekdayStated, monthName, dayText, yearText] = closed;
    const closedOn = isoFrom(Number(yearText), monthName, Number(dayText));
    const actual = weekdayOf(closedOn);

    if (actual !== weekdayStated.toLowerCase()) {
      problems.push(
        `${sourceId}: notice says "${weekdayStated}, ${monthName} ${dayText}, ${yearText}" but ` +
          `${closedOn} is a ${actual}. Either the parse or the notice is wrong; not shipping the date.`,
      );
      return;
    }

    /*
     * The occasion, the portal statement and the stamping date are spread over
     * the sentences FOLLOWING the closure sentence, not inside it. On the
     * ontario.ca pages the order is:
     *
     *   [0] "...will be closed on Wednesday, September 30, 2026 in honour of ..."
     *   [1] "The ministry's online filing services will remain available ..."
     *   [2] "However, any documents submitted that day ... will be marked as
     *        filed/issued on the next business day, October 1, 2026."
     *
     * A two-sentence window missed [2] and reported the stamping date as "not
     * stated", which is the one fact the warning exists to convey. Four
     * sentences covers the current layout with room to spare; the weekday
     * cross-check and the requirement that the stamping date be LATER than the
     * closure are what stop a wider window picking up an unrelated date.
     */
    const window = sentences.slice(index, index + 4).join(" ");
    const stamped = stampedRe.exec(window);
    let stampedAs = stamped ? isoFrom(Number(stamped[3]), stamped[1], Number(stamped[2])) : null;

    // A stamping date must be AFTER the closure. Widening the window to four
    // sentences is what makes this guard necessary: without it, a nearby
    // unrelated date could be read as the stamping date and would look fine.
    if (stampedAs && stampedAs <= closedOn) {
      problems.push(
        `${sourceId}: read a stamping date of ${stampedAs} for a closure on ${closedOn}, ` +
          `which is not later. Refusing it rather than shipping a date that cannot be right.`,
      );
      stampedAs = null;
    }

    const occasionMatch = /in honour of the ([^.]+?)\./i.exec(window);
    const occasion = occasionMatch ? occasionMatch[1].trim() : "a court office closure";

    const portalAvailable = /online filing services will remain available/i.test(window)
      ? true
      : null;

    notices.push({
      closedOn,
      occasion,
      stampedAs,
      portalAvailable,
      sourceId,
      sourceUrl,
      quote: sentence,
      weekdayStated: weekdayStated.toLowerCase(),
    });
  });

  return { notices, problems };
}

function main(): void {
  const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as {
    entries: Array<{ id: string; url: string; file: string }>;
  };
  const byId = new Map(manifest.entries.map((e) => [e.id, e]));

  const all: ServiceNotice[] = [];
  const problems: string[] = [];

  for (const id of NOTICE_SOURCE_IDS) {
    const entry = byId.get(id);
    if (!entry) {
      problems.push(`${id} is not in the corpus manifest — run rules:fetch`);
      continue;
    }
    const file = path.join(CORPUS, entry.file);
    if (!existsSync(file)) {
      problems.push(`${id} has a manifest entry but no vendored file`);
      continue;
    }
    const result = extractNotices(readFileSync(file, "utf8"), id, entry.url);
    all.push(...result.notices);
    problems.push(...result.problems);
    console.log(`  ${id.padEnd(38)} ${result.notices.length} notice(s)`);
  }

  // De-duplicate by date, keeping every source that says it — two pages agreeing
  // is the cross-check, so the count is worth keeping.
  const byDate = new Map<string, ServiceNotice[]>();
  for (const n of all) {
    byDate.set(n.closedOn, [...(byDate.get(n.closedOn) ?? []), n]);
  }

  const records = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([closedOn, group]) => ({
      ...group[0],
      closedOn,
      corroboratedBy: group.map((g) => g.sourceId),
    }));

  console.log("");
  for (const r of records) {
    console.log(
      `  ${r.closedOn}  ${r.weekdayStated.padEnd(10)} stamped=${r.stampedAs ?? "(not stated)"}  ` +
        `sources=${r.corroboratedBy.length}  ${r.occasion}`,
    );
  }

  if (problems.length > 0) {
    console.log("");
    console.log("PROBLEMS:");
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note:
          "GENERATED by scripts/rules/extractServiceNotices.ts from vendored sources. " +
          "Do not edit by hand: test:service-notices re-checks every quote against the corpus.",
        notices: records,
      },
      null,
      2,
    )}\n`,
  );
  console.log("");
  console.log(`  ${records.length} notice(s) written to ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]).includes("extractServiceNotices")) {
  main();
}
