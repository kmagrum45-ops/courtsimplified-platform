/**
 * THE CARRY COUNTS: THE FOUR WAYS A PERSON'S STORY IS NOT CARRIED, AND THE BASELINE THAT MAY ONLY SHRINK
 * (site owner, 30 Oct: "a fact given once is known everywhere, never asked again, never refilled after
 * the person removed it, never shown on the wrong case").
 *
 * The end-to-end carry test (tests/browser/carry-end-to-end.spec.ts) records four kinds of violation:
 *   asked-twice             a question for a fact the person already gave (askOnce.ts factsAskedTwice,
 *                           heldViolations: the same recorder as the story pack);
 *   returned-after-removal  a value the person removed shown again: refilled in a box, offered
 *                           ("Use … (from your story)"), or listed, on any screen, after removal;
 *   wrong-case              a page addressed to one case (its id in the address) showing another case;
 *   screens-disagree        one fact, read from two screens (or one screen before and after a reload,
 *                           a sign-in, a change), showing different values.
 *
 * "ASSERTS ZERO". Every violation the site makes today is listed in carryBaseline.json, one entry each,
 * with the fact it belongs to and a reason a person can read. A violation that matches no entry fails
 * the test. An entry that matches nothing in a run is reported as stale (the site was fixed: delete it).
 * scripts/verification/verifyCarryBaseline.ts (CI, typecheck job) fails a PR that ADDS an entry compared
 * with origin/main, so the counts can only go down, and the test asserts zero once the file is empty.
 * The baseline started EMPTY on purpose: entries come only from what a real CI run recorded, never
 * from a guess.
 *
 * Pure: no browser, no network (the terminal suite runs every function here).
 */
import fs from "node:fs";
import path from "node:path";

export const CARRY_KINDS = ["asked-twice", "returned-after-removal", "wrong-case", "screens-disagree"] as const;
export type CarryKind = (typeof CARRY_KINDS)[number];

export type CarryViolation = {
  kind: CarryKind;
  /** The run: "<court> <route> <who>", e.g. "small-claims questions guest". */
  run: string;
  court: string;
  route: string;
  /** The fact it belongs to (a case-file slot, "story", or "case" for a wrong case). */
  fact: string;
  /** Where it was seen: the screen (and for asked-twice the surface:screen). */
  where: string;
  /** What was seen, for a person reading the record. Never a secret: synthetic stories only. */
  detail: string;
};

export type CarryBaselineEntry = {
  kind: CarryKind;
  fact: string;
  where: string;
  /** Only in these courts / routes; every one when absent. */
  court?: string;
  route?: string;
  /** Why the site still does it, in plain words (at least eight words). */
  reason: string;
};

export const BASELINE_PATH = "tests/browser/harness/carryBaseline.json";

export function readBaseline(file = BASELINE_PATH): CarryBaselineEntry[] {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { entries?: CarryBaselineEntry[] };
  return parsed.entries ?? [];
}

/** The key two baseline entries are compared by (the terminal check's "added" test). */
export function entryKey(entry: CarryBaselineEntry): string {
  return [entry.kind, entry.fact, entry.where, entry.court ?? "*", entry.route ?? "*"].join("|");
}

export function baselineEntryFor(violation: CarryViolation, list: readonly CarryBaselineEntry[]): CarryBaselineEntry | null {
  return list.find((entry) =>
    entry.kind === violation.kind && entry.fact === violation.fact && entry.where === violation.where &&
    (entry.court === undefined || entry.court === violation.court) &&
    (entry.route === undefined || entry.route === violation.route),
  ) ?? null;
}

export function splitByBaseline(violations: readonly CarryViolation[], list: readonly CarryBaselineEntry[]) {
  const known: { violation: CarryViolation; entry: CarryBaselineEntry }[] = [];
  const unknown: CarryViolation[] = [];
  for (const violation of violations) {
    const entry = baselineEntryFor(violation, list);
    if (entry) known.push({ violation, entry });
    else unknown.push(violation);
  }
  return { known, unknown };
}

/** Entries no violation matched (in the runs that could have shown them): the site was fixed; delete them. */
export function staleEntries(list: readonly CarryBaselineEntry[], violations: readonly CarryViolation[], runs: readonly { court: string; route: string }[]): CarryBaselineEntry[] {
  return list.filter((entry) =>
    runs.some((run) => (entry.court === undefined || entry.court === run.court) && (entry.route === undefined || entry.route === run.route)) &&
    !violations.some((violation) => baselineEntryFor(violation, [entry]) !== null),
  );
}

/** Entries in `now` that `before` does not have: a PR may not add any. */
export function addedEntries(before: readonly CarryBaselineEntry[], now: readonly CarryBaselineEntry[]): CarryBaselineEntry[] {
  const had = new Set(before.map(entryKey));
  return now.filter((entry) => !had.has(entryKey(entry)));
}

/** Problems with an entry's shape (each must say why in words and name its fact). */
export function badEntries(list: readonly CarryBaselineEntry[]): { entry: CarryBaselineEntry; why: string }[] {
  const bad: { entry: CarryBaselineEntry; why: string }[] = [];
  const keys = new Set<string>();
  for (const entry of list) {
    if (!(CARRY_KINDS as readonly string[]).includes(entry.kind)) bad.push({ entry, why: `kind must be one of ${CARRY_KINDS.join(", ")}` });
    if (!entry.fact?.trim()) bad.push({ entry, why: "names no fact" });
    if (!entry.where?.trim()) bad.push({ entry, why: "names no screen (where)" });
    if (!entry.reason || entry.reason.trim().split(/\s+/).length < 8) bad.push({ entry, why: "the reason is not in words (at least eight)" });
    if (keys.has(entryKey(entry))) bad.push({ entry, why: "listed twice" });
    keys.add(entryKey(entry));
  }
  return bad;
}

export type CarryCounts = Record<CarryKind, number>;

export function countsOf(violations: readonly CarryViolation[]): CarryCounts {
  const counts = Object.fromEntries(CARRY_KINDS.map((kind) => [kind, 0])) as CarryCounts;
  for (const violation of violations) counts[violation.kind] += 1;
  return counts;
}

/** The one fixed, greppable line: `CARRY COUNTS asked-twice=N returned-after-removal=N wrong-case=N screens-disagree=N`. */
export function countsLine(counts: CarryCounts, label = ""): string {
  return `CARRY COUNTS${label ? ` ${label}` : ""} ${CARRY_KINDS.map((kind) => `${kind}=${counts[kind]}`).join(" ")}`;
}
export const COUNTS_LINE = /^CARRY COUNTS(?: [^=]+?)? asked-twice=(\d+) returned-after-removal=(\d+) wrong-case=(\d+) screens-disagree=(\d+)$/;

// Outside test-results/, which Playwright empties at the start of every run.
export const CARRY_RECORDS = "carry-records";

export type CarryRunRecord = { run: string; court: string; route: string; who: string; violations: CarryViolation[]; known: number; unknown: number; unreached: string[] };

export function writeRunRecord(record: CarryRunRecord): string {
  fs.mkdirSync(CARRY_RECORDS, { recursive: true });
  const file = path.join(CARRY_RECORDS, `${record.run.replace(/[^\w.-]+/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...record, counts: countsOf(record.violations) }, null, 2));
  return file;
}

/** Every run record under a folder (the CI totals job downloads all three parts into one). */
export function readRunRecords(dir = CARRY_RECORDS): CarryRunRecord[] {
  if (!fs.existsSync(dir)) return [];
  const out: CarryRunRecord[] = [];
  const walk = (folder: string) => {
    for (const name of fs.readdirSync(folder)) {
      const full = path.join(folder, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".json") && name !== "totals.json") out.push(JSON.parse(fs.readFileSync(full, "utf8")) as CarryRunRecord);
    }
  };
  walk(dir);
  return out;
}

/**
 * Amounts in a text, as numbers ("$7,250", "7250.00", "$7,250.00" are one amount). Used to tell
 * whether a screen shows the amount the person gave: a value typed by the person and absent from
 * the story, so its presence anywhere is unambiguous.
 */
export function amountsIn(text: string): number[] {
  return [...text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/g)].map((match) => Number(match[1].replace(/,/g, "")) + (match[2] ? Number(match[2]) / 100 : 0));
}

/** Whether a screen's text shows a tracked value: an amount by number, words by their marker. */
export function shows(text: string, value: { amount?: number; marker?: RegExp }): boolean {
  if (value.amount !== undefined) return amountsIn(text).includes(value.amount);
  return value.marker ? value.marker.test(text) : false;
}
