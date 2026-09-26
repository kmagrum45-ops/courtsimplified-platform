/**
 * Court-closure notices are real, traceable to the corpus, and warn at the right
 * times.
 *
 * WHAT THIS CATCHES: a closure date that nobody can trace back to a source. The
 * dates in `courtServiceNotices.json` are generated from vendored pages, and the
 * whole point of generating them is that no date reaches a user unless a vendored
 * page says it. If someone adds a date by hand — or edits one, or the source page
 * changes its wording so the extractor's quote no longer matches — this goes red.
 * Without it, "court offices are closed on X" is a claim about the world with
 * nothing behind it, shown to somebody deciding when to file.
 *
 * It also catches a stale generator: if the corpus is re-fetched and a notice's
 * sentence changes, the committed quote stops matching and the file must be
 * regenerated rather than drifting quietly out of step with its source.
 *
 * *** THE BEHAVIOUR CHECKS RUN ON SYNTHETIC NOTICES, DELIBERATELY ***
 *
 * Asserting "a deadline of 2026-09-30 warns" would pin today's data: the moment
 * that closure passes, or the ministry publishes a different one, the check would
 * fail because reality moved rather than because the code broke. CLAUDE.md §5.
 * So the windowing rules are asserted against fabricated notices with fixed
 * dates, and the real file is checked only for internal consistency — which is a
 * property that must hold whatever the ministry publishes.
 *
 * Run: node --import tsx scripts/verification/verifyServiceNotices.ts
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  COURT_SERVICE_NOTICES,
  businessDaysBetween,
  closureWarningFor,
  closureWarningProse,
  WARN_WITHIN_BUSINESS_DAYS,
  type CourtServiceNotice,
} from "../../src/lib/case-system/deadlines/courtServiceNotices";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const weekdayOf = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

console.log("");
console.log("COURT SERVICE NOTICES");
console.log("");

// ---------------------------------------------------------------------------
// 1. Every notice is traceable to the corpus
// ---------------------------------------------------------------------------

const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as {
  entries: Array<{ id: string; url: string; file: string }>;
};
const byId = new Map(manifest.entries.map((e) => [e.id, e]));

if (COURT_SERVICE_NOTICES.length === 0) {
  // Not a failure. There may genuinely be no closure announced.
  pass("no closure notices are currently extracted (nothing to trace)");
} else {
  for (const notice of COURT_SERVICE_NOTICES) {
    const entry = byId.get(notice.sourceId);
    if (!entry) {
      fail(`notice ${notice.closedOn}: source ${notice.sourceId} is not in the corpus manifest`);
      continue;
    }
    const file = path.join(CORPUS, entry.file);
    if (!existsSync(file)) {
      fail(`notice ${notice.closedOn}: ${notice.sourceId} has no vendored file`);
      continue;
    }
    const haystack = collapse(readFileSync(file, "utf8"));
    if (!haystack.includes(collapse(notice.quote))) {
      fail(
        `notice ${notice.closedOn}: its quote is no longer in ${notice.sourceId}`,
        `The source changed, or the file was edited by hand.\n` +
          `Re-run: npm run rules:notices\n` +
          `quote: ${notice.quote.slice(0, 120)}`,
      );
      continue;
    }
    pass(`notice ${notice.closedOn} is quoted verbatim from ${notice.sourceId}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Every notice is internally consistent — a property, whatever is published
// ---------------------------------------------------------------------------

for (const notice of COURT_SERVICE_NOTICES) {
  const problems: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(notice.closedOn)) problems.push("closedOn is not an ISO date");
  if (weekdayOf(notice.closedOn) !== notice.weekdayStated) {
    problems.push(
      `the notice states ${notice.weekdayStated} but ${notice.closedOn} is a ${weekdayOf(notice.closedOn)}`,
    );
  }
  if (notice.stampedAs && notice.stampedAs <= notice.closedOn) {
    problems.push(`stampedAs ${notice.stampedAs} is not after closedOn ${notice.closedOn}`);
  }
  if (!notice.sourceUrl.startsWith("https://")) problems.push("sourceUrl is not an https URL");

  if (problems.length === 0) pass(`notice ${notice.closedOn} is internally consistent`);
  else fail(`notice ${notice.closedOn} is inconsistent`, problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 3. The warning window — asserted on synthetic notices
// ---------------------------------------------------------------------------

/** A fabricated closure on a Wednesday, with a stamping day after it. */
const synthetic = (over: Partial<CourtServiceNotice> = {}): CourtServiceNotice => ({
  closedOn: "2030-09-25", // a Wednesday
  occasion: "a fabricated occasion",
  stampedAs: "2030-09-26",
  portalAvailable: true,
  sourceId: "synthetic",
  sourceUrl: "https://example.invalid/notice",
  quote: "synthetic",
  weekdayStated: "wednesday",
  ...over,
});

{
  const only = [synthetic()];

  const onDay = closureWarningFor("2030-09-25", only);
  if (onDay?.onTheDay === true && onDay.templateId === "court-office-closed-on-this-date") {
    pass("a deadline ON a closure day gets the on-the-day sentence");
  } else {
    fail("a deadline ON a closure day did not get the on-the-day sentence", String(onDay?.templateId));
  }

  // The Monday before that Wednesday: 2 business days.
  const near = closureWarningFor("2030-09-23", only);
  if (near?.onTheDay === false && near.templateId === "court-office-closes-soon-after-this-date") {
    pass("a deadline shortly BEFORE a closure gets the nearby sentence");
  } else {
    fail("a deadline shortly before a closure did not get the nearby sentence", String(near?.templateId));
  }

  const farBefore = closureWarningFor("2030-08-01", only);
  if (farBefore === null) pass("a deadline well before a closure gets no warning");
  else fail("a deadline well before a closure produced a warning");

  const afterwards = closureWarningFor("2030-10-10", only);
  if (afterwards === null) pass("a closure already past produces no warning");
  else fail("a closure already past produced a warning");

  const noStamp = closureWarningFor("2030-09-25", [synthetic({ stampedAs: null })]);
  if (noStamp === null) {
    pass("a notice with no stamping date produces no warning, rather than an alarm with no date in it");
  } else {
    fail("a notice with no stamping date still produced a warning");
  }

  // The boundary itself, asserted through the exported constant rather than a
  // hardcoded 3, so changing the policy changes the test's expectation with it.
  const boundary = "2030-09-25";
  let cursor = boundary;
  for (let i = 0; i < WARN_WITHIN_BUSINESS_DAYS; i += 1) {
    const d = new Date(`${cursor}T00:00:00Z`);
    do {
      d.setUTCDate(d.getUTCDate() - 1);
    } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    cursor = d.toISOString().slice(0, 10);
  }
  if (businessDaysBetween(cursor, boundary) === WARN_WITHIN_BUSINESS_DAYS) {
    pass(`the window boundary is exactly ${WARN_WITHIN_BUSINESS_DAYS} business days`);
  } else {
    fail(
      "the window boundary is not what the constant says",
      `${cursor} -> ${boundary} is ${businessDaysBetween(cursor, boundary)} business day(s)`,
    );
  }

  if (closureWarningFor(cursor, only) !== null) {
    pass("a deadline exactly at the window boundary still warns");
  } else {
    fail("a deadline exactly at the window boundary did not warn");
  }
}

// ---------------------------------------------------------------------------
// 4. The sentence is a filled template, and names its source
// ---------------------------------------------------------------------------

{
  const prose = closureWarningProse("2030-09-25", [synthetic()]);
  if (!prose) {
    fail("no prose was produced for a synthetic closure");
  } else {
    const problems: string[] = [];
    if (/\{[a-z]+\}/i.test(prose)) problems.push(`an unfilled slot remains: ${prose}`);
    if (!prose.includes("https://example.invalid/notice")) problems.push("the source URL is absent");
    if (!/still the deadline|not move/i.test(prose)) {
      problems.push("the sentence does not say the deadline itself is unchanged");
    }
    if (problems.length === 0) {
      pass("the warning is a filled template that names its source and does not move the deadline");
    } else {
      fail("the warning sentence is wrong", problems.join("\n"));
    }
  }
}

// ---------------------------------------------------------------------------
// 5. The warning never claims a closure moves a deadline
// ---------------------------------------------------------------------------

{
  // The whole risk of this feature is a user reading "closed" as "extended".
  const both = [
    closureWarningProse("2030-09-25", [synthetic()]),
    closureWarningProse("2030-09-23", [synthetic()]),
  ].filter((p): p is string => Boolean(p));

  const wrong = both.filter((p) => /extend|moves to|pushed to|becomes the new deadline/i.test(p));
  if (wrong.length === 0) {
    pass("neither closure sentence suggests the deadline is extended");
  } else {
    fail("a closure sentence implies the deadline moves", wrong.join("\n"));
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
