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
 * And, kept apart from the four, the steps a run could not reach (`unreached`): a count from a screen
 * never reached is not a zero.
 *
 * "ASSERTS ZERO". Every violation the site makes today, and every step the test cannot reach yet, is
 * listed in carryBaseline.json, one entry each, with the run it belongs to and a reason a person can
 * read. A violation or an unreached step that matches no entry fails the run; a listed one is reported
 * as known; an entry that matches nothing in a run that could have shown it is reported as stale (fixed:
 * delete it). scripts/verification/verifyCarryBaseline.ts (CI, typecheck job) fails a PR that ADDS an
 * entry of any kind compared with origin/main, so the list only shrinks, and the test asserts zero once
 * it is empty. Entries come only from what a real CI run recorded (scripts/browser/carrySeed.ts), never
 * from a guess.
 *
 * Pure: no browser, no network (the terminal suite runs every function here).
 */
import fs from "node:fs";
import path from "node:path";

export const CARRY_KINDS = ["asked-twice", "returned-after-removal", "wrong-case", "screens-disagree"] as const;
export type CarryKind = (typeof CARRY_KINDS)[number];
/** What a baseline entry may list: one of the four, or a step not reached. */
export const BASELINE_KINDS = [...CARRY_KINDS, "unreached"] as const;
export type BaselineKind = (typeof BASELINE_KINDS)[number];

export type CarryViolation = {
  kind: CarryKind;
  /** The run: "<court> <route> <who>", e.g. "small-claims questions guest". */
  run: string;
  court: string;
  route: string;
  /** "guest" or "signed-in". */
  who?: string;
  /** The fact it belongs to (a case-file slot, "story", or "case" for a wrong case). */
  fact: string;
  /** Where it was seen: the screen (and for asked-twice the surface:screen). */
  where: string;
  /** What was seen, for a person reading the record. Never a secret: synthetic stories only. */
  detail: string;
};

export type CarryBaselineEntry = {
  kind: BaselineKind;
  /** The fact (for "unreached": the step's name, as the run records it before its first ": "). */
  fact: string;
  /** The screen (for "unreached": "step"). */
  where: string;
  /** Only in these courts / routes / who; every one when absent (an "unreached" entry names all three). */
  court?: string;
  route?: string;
  who?: string;
  /** Why the site (or the test) still does it, in plain words (at least eight words). */
  reason: string;
  /**
   * Set only on an entry ADDED after the list started (owner, 30 Oct): a repeat the list missed, not a
   * regression. Names the carry workflow runs that recorded it, the date, why in words, and its cause
   * (the code line, file:line, that makes the site do it). Never used to hide a fault. It is the
   * only kind of addition the list check allows, and every report counts these apart from the rest.
   */
  newlyMeasured?: { runs: string[]; on: string; why: string; cause: string };
};

export type RunIdentity = { court: string; route: string; who?: string };

export const BASELINE_PATH = "tests/browser/harness/carryBaseline.json";

export function readBaseline(file = BASELINE_PATH): CarryBaselineEntry[] {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { entries?: CarryBaselineEntry[] };
  return parsed.entries ?? [];
}

/** The key two baseline entries are compared by (the terminal check's "added" test). */
export function entryKey(entry: CarryBaselineEntry): string {
  return [entry.kind, entry.fact, entry.where, entry.court ?? "*", entry.route ?? "*", entry.who ?? "*"].join("|");
}

const runFits = (entry: CarryBaselineEntry, run: RunIdentity) =>
  (entry.court === undefined || entry.court === run.court) &&
  (entry.route === undefined || entry.route === run.route) &&
  (entry.who === undefined || entry.who === run.who);

export function baselineEntryFor(violation: CarryViolation, list: readonly CarryBaselineEntry[]): CarryBaselineEntry | null {
  return list.find((entry) => entry.kind === violation.kind && entry.fact === violation.fact && entry.where === violation.where && runFits(entry, violation)) ?? null;
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

/** The step's name of an unreached record ("sign in from the builder: TimeoutError ..." -> "sign in from the builder"). */
export function unreachedStep(item: string): string {
  const at = item.indexOf(": ");
  return (at === -1 ? item : item.slice(0, at)).trim();
}

export function unreachedEntryFor(run: RunIdentity, item: string, list: readonly CarryBaselineEntry[]): CarryBaselineEntry | null {
  const step = unreachedStep(item);
  return list.find((entry) => entry.kind === "unreached" && entry.fact === step && runFits(entry, run)) ?? null;
}

/** A run's unreached steps split into listed (known) and new (each fails the run). */
export function splitUnreached(run: RunIdentity, unreached: readonly string[], list: readonly CarryBaselineEntry[]) {
  const known: { item: string; entry: CarryBaselineEntry }[] = [];
  const unknown: string[] = [];
  for (const item of unreached) {
    const entry = unreachedEntryFor(run, item, list);
    if (entry) known.push({ item, entry });
    else unknown.push(item);
  }
  return { known, unknown };
}

/**
 * Entries nothing matched, in the runs that could have shown them: the site (or the test) was fixed;
 * delete them. An "unreached" entry is stale when every run it fits reached that step.
 */
export function staleEntries(list: readonly CarryBaselineEntry[], violations: readonly CarryViolation[], runs: readonly (RunIdentity & { unreached?: readonly string[] })[]): CarryBaselineEntry[] {
  return list.filter((entry) => {
    const fitting = runs.filter((run) => runFits(entry, run));
    if (!fitting.length) return false;
    if (entry.kind === "unreached") return !fitting.some((run) => (run.unreached ?? []).some((item) => unreachedStep(item) === entry.fact));
    return !violations.some((violation) => baselineEntryFor(violation, [entry]) !== null);
  });
}

/** Entries in `now` that `before` does not have: a PR may not add any, of any kind. */
export function addedEntries(before: readonly CarryBaselineEntry[], now: readonly CarryBaselineEntry[]): CarryBaselineEntry[] {
  const had = new Set(before.map(entryKey));
  return now.filter((entry) => !had.has(entryKey(entry)));
}

/** What is wrong with an entry's newlyMeasured record (empty when it is well formed). */
export function newlyMeasuredProblems(entry: CarryBaselineEntry): string[] {
  const record = entry.newlyMeasured;
  if (!record) return ["no newlyMeasured record (an added entry must name the runs that saw it)"];
  const problems: string[] = [];
  if (!Array.isArray(record.runs) || record.runs.length === 0) problems.push("newlyMeasured names no carry workflow run");
  else if (record.runs.some((run) => !/^\d{6,}$/.test(String(run)))) problems.push("newlyMeasured run ids are GitHub Actions run numbers (digits)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(record.on ?? ""))) problems.push("newlyMeasured.on is a date, YYYY-MM-DD");
  if (String(record.why ?? "").trim().split(/\s+/).filter(Boolean).length < 12) problems.push("newlyMeasured.why says in words (at least twelve) why it is a repeat the list missed, not a regression");
  if (!/[\w./\[\]-]+\.(?:tsx?|jsx?|mjs|cjs):\d+/.test(String(record.cause ?? ""))) problems.push("newlyMeasured.cause names the code line that makes the site do it (file:line)");
  return problems;
}

/** The entries added compared with `before`: newly measured ones (allowed) and the rest (rejected). */
export function allowedAdditions(before: readonly CarryBaselineEntry[], now: readonly CarryBaselineEntry[]): { rejected: CarryBaselineEntry[]; newlyMeasured: CarryBaselineEntry[] } {
  const added = addedEntries(before, now);
  // Never used to hide a fault: an entry removed in the same change, of the same kind, fact and court,
  // means a known entry is being swapped for a "new" one.
  const kept = new Set(now.map(entryKey));
  const removed = before.filter((entry) => !kept.has(entryKey(entry)));
  const swaps = (entry: CarryBaselineEntry) => removed.some((gone) => gone.kind === entry.kind && gone.fact === entry.fact && (gone.court ?? "*") === (entry.court ?? "*"));
  const allowed = (entry: CarryBaselineEntry) => newlyMeasuredProblems(entry).length === 0 && !swaps(entry);
  return {
    rejected: added.filter((entry) => !allowed(entry)),
    newlyMeasured: added.filter(allowed),
  };
}

/** The list split so a report never mixes newly measured entries with the original ones. */
export function splitNewlyMeasured(list: readonly CarryBaselineEntry[]): { original: CarryBaselineEntry[]; newlyMeasured: CarryBaselineEntry[] } {
  return { original: list.filter((entry) => !entry.newlyMeasured), newlyMeasured: list.filter((entry) => Boolean(entry.newlyMeasured)) };
}

/** Problems with an entry's shape (each must say why in words and name its fact). */
export function badEntries(list: readonly CarryBaselineEntry[]): { entry: CarryBaselineEntry; why: string }[] {
  const bad: { entry: CarryBaselineEntry; why: string }[] = [];
  const keys = new Set<string>();
  for (const entry of list) {
    if (!(BASELINE_KINDS as readonly string[]).includes(entry.kind)) bad.push({ entry, why: `kind must be one of ${BASELINE_KINDS.join(", ")}` });
    if (!entry.fact?.trim()) bad.push({ entry, why: "names no fact (or step)" });
    if (!entry.where?.trim()) bad.push({ entry, why: "names no screen (where)" });
    if (entry.kind === "unreached" && (!entry.court || !entry.route || !entry.who)) bad.push({ entry, why: "an unreached step names its run: court, route and who" });
    if (entry.who !== undefined && entry.who !== "guest" && entry.who !== "signed-in") bad.push({ entry, why: "who is guest or signed-in" });
    if (!entry.reason || entry.reason.trim().split(/\s+/).length < 8) bad.push({ entry, why: "the reason is not in words (at least eight)" });
    if (entry.newlyMeasured !== undefined) for (const why of newlyMeasuredProblems(entry)) bad.push({ entry, why });
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

/**
 * The one fixed, greppable line:
 * `CARRY COUNTS asked-twice=N returned-after-removal=N wrong-case=N screens-disagree=N unreached=N`
 * (the four counts, then the steps not reached, kept apart).
 */
export function countsLine(counts: CarryCounts, unreached: number, label = ""): string {
  return `CARRY COUNTS${label ? ` ${label}` : ""} ${CARRY_KINDS.map((kind) => `${kind}=${counts[kind]}`).join(" ")} unreached=${unreached}`;
}
export const COUNTS_LINE = /^CARRY COUNTS(?: [^=]+?)? asked-twice=(\d+) returned-after-removal=(\d+) wrong-case=(\d+) screens-disagree=(\d+) unreached=(\d+)$/;

// Outside test-results/, which Playwright empties at the start of every run.
export const CARRY_RECORDS = "carry-records";

export type CarryRunRecord = { run: string; court: string; route: string; who: string; violations: CarryViolation[]; known: number; unknown: number; unreached: string[] };

export function writeRunRecord(record: CarryRunRecord): string {
  fs.mkdirSync(CARRY_RECORDS, { recursive: true });
  const file = path.join(CARRY_RECORDS, `${record.run.replace(/[^\w.-]+/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...record, counts: countsOf(record.violations) }, null, 2));
  return file;
}

/** Every run record under a folder (the CI totals job downloads all the parts into one). */
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
 * Baseline entries for what runs recorded (scripts/browser/carrySeed.ts): one per violation and per
 * unreached step, each limited to its own run (court, route, who), with a reason naming what was seen.
 */
export function seedEntries(records: readonly CarryRunRecord[]): CarryBaselineEntry[] {
  const out = new Map<string, CarryBaselineEntry>();
  const put = (entry: CarryBaselineEntry) => { if (!out.has(entryKey(entry))) out.set(entryKey(entry), entry); };
  for (const record of records) {
    const run = { court: record.court, route: record.route, who: record.who };
    for (const violation of record.violations) {
      put({ kind: violation.kind, fact: violation.fact, where: violation.where, ...run, reason: `Seen by the carry test in the ${record.run} run on ${violation.where}: ${violation.detail}` });
    }
    for (const item of record.unreached) {
      put({ kind: "unreached", fact: unreachedStep(item), where: "step", ...run, reason: `The carry test could not reach this step in the ${record.run} run: ${item.slice(unreachedStep(item).length + 2) || item}` });
    }
  }
  return [...out.values()];
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
