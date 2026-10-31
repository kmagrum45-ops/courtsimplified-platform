/**
 * "Newly measured" carry entries (owner, 30 Oct): the one way an entry may be ADDED to the carry list.
 *
 * What it checks:
 * - An added entry with no `newlyMeasured` record is still rejected (the list may only shrink).
 * - An added entry is allowed only when it carries `newlyMeasured`: at least one GitHub Actions run id
 *   (digits) of the carry workflow that recorded it, the date (YYYY-MM-DD), and why it is a repeat the
 *   list missed rather than a regression, in words (at least twelve).
 * - A badly formed `newlyMeasured` record is a bad entry.
 * - Counts keep newly measured entries apart from the rest of the list (splitNewlyMeasured), so a
 *   report never mixes them with the original entries.
 *
 * The failure it exists to catch: the list growing quietly. The only door is a marked entry that
 * names the runs that saw it, which a reviewer can open, and that every report shows on its own line.
 * First use: civil review guest "What would you like the court to order?" asked twice, seen on main
 * (run 41153220152), the code the list was seeded from.
 *
 * Usage: npm run test:carry-newly-measured
 */
import * as counts from "../../tests/browser/harness/carryCounts";
import type { CarryBaselineEntry } from "../../tests/browser/harness/carryCounts";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? `\n     ${detail}` : ""}`);
  if (!ok) failed += 1;
};

const base: CarryBaselineEntry = {
  kind: "asked-twice", fact: "wants", where: "form-field@/builder?step=results", court: "civil", route: "review", who: "guest",
  reason: "Seen by the carry test: what the person wants ordered, given in the chat, asked again on the results page",
};
const marked = { ...base, newlyMeasured: { runs: ["41153220152"], on: "2026-10-31", why: "A repeat the list missed: seen on unchanged main, the same code the list was seeded from, so it is not a regression" } } as CarryBaselineEntry;

type Allowed = (before: readonly CarryBaselineEntry[], now: readonly CarryBaselineEntry[]) => { rejected: CarryBaselineEntry[]; newlyMeasured: CarryBaselineEntry[] };
const allowedAdditions = (counts as { allowedAdditions?: Allowed }).allowedAdditions;
check("allowedAdditions exists", typeof allowedAdditions === "function");
if (allowedAdditions) {
  const plain = allowedAdditions([], [base]);
  check("an added entry with no newlyMeasured record is rejected", plain.rejected.length === 1 && plain.newlyMeasured.length === 0, JSON.stringify(plain));
  const ok = allowedAdditions([], [marked]);
  check("an added entry marked newly measured (run ids, date, why) is allowed", ok.rejected.length === 0 && ok.newlyMeasured.length === 1, JSON.stringify(ok));
  const noRun = { ...base, newlyMeasured: { runs: [], on: "2026-10-31", why: (marked as { newlyMeasured: { why: string } }).newlyMeasured.why } } as CarryBaselineEntry;
  check("a newly measured entry naming no run is rejected", allowedAdditions([], [noRun]).rejected.length === 1);
  const badRun = { ...base, newlyMeasured: { runs: ["main"], on: "2026-10-31", why: (marked as { newlyMeasured: { why: string } }).newlyMeasured.why } } as CarryBaselineEntry;
  check("a run id that is not a number is rejected", allowedAdditions([], [badRun]).rejected.length === 1);
  const shortWhy = { ...base, newlyMeasured: { runs: ["41153220152"], on: "2026-10-31", why: "missed it" } } as CarryBaselineEntry;
  check("a why shorter than twelve words is rejected", allowedAdditions([], [shortWhy]).rejected.length === 1);
  const noDate = { ...base, newlyMeasured: { runs: ["41153220152"], on: "yesterday", why: (marked as { newlyMeasured: { why: string } }).newlyMeasured.why } } as CarryBaselineEntry;
  check("a date not in YYYY-MM-DD is rejected", allowedAdditions([], [noDate]).rejected.length === 1);
  check("an entry already on main is not an addition", allowedAdditions([base], [base]).rejected.length === 0 && allowedAdditions([base], [base]).newlyMeasured.length === 0);
}

check("badEntries flags a malformed newlyMeasured record", counts.badEntries([{ ...base, newlyMeasured: { runs: [], on: "x", why: "" } } as CarryBaselineEntry]).length > 0);
check("badEntries accepts a well formed one", counts.badEntries([marked]).length === 0, JSON.stringify(counts.badEntries([marked])));

type Split = (list: readonly CarryBaselineEntry[]) => { original: CarryBaselineEntry[]; newlyMeasured: CarryBaselineEntry[] };
const split = (counts as { splitNewlyMeasured?: Split }).splitNewlyMeasured;
check("splitNewlyMeasured exists", typeof split === "function");
if (split) {
  const s = split([{ ...base, fact: "amount" }, marked]);
  check("the list splits into the original entries and the newly measured ones", s.original.length === 1 && s.newlyMeasured.length === 1);
}

if (failed) { console.log(`${failed} check(s) failed.`); process.exit(1); }
console.log("Newly measured: the only allowed addition, marked with its runs, counted apart.");
