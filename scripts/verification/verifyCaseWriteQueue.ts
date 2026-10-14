/**
 * No two writes to the same case's row are in flight at once from the builder
 * and the case page.
 *
 * COSTS NOTHING. A test-double database client and source reads; no network,
 * no database, no model.
 *
 * WHY. Walkthrough run 38525903567 (2026-10-14, main at 96c4b11): two of five
 * browser journeys stopped on "Saving your case" and "Opening your case…",
 * the browser logging PATCH and GET /rest/v1/cases 500 57014 ("canceling
 * statement due to statement timeout"). The builder's case save had a
 * one-at-a-time queue (saveChainRef, after the same failure on 2026-10-09);
 * the position saves had a second queue of their own (positionSave.ts); the
 * family-answers save was in neither. Each was one at a time on its own, but
 * they wrote the same large master_result row at the same moment, a second
 * UPDATE of a row waits on the first's row lock, and the wait counts against
 * the statement timeout. Every write now goes through one queue per case
 * (positionSave.ts runCaseWrite).
 *
 * WHAT THIS CATCHES:
 *   1. Two writes to one case overlapping: the case save, the family-answers
 *      save and position saves (the person's clicks and the catch-up) fired
 *      at once against a client that records how many writes to each case
 *      are in flight. The property: never more than one -- whatever the
 *      number of writes. Writes to another case may overlap freely.
 *   2. A save given up on (its time ran out with its write already sent)
 *      letting the next write start beside it.
 *   3. A lost save: everything fired in (1) is on the case at the end.
 *   4. Repeats costing writes: a save the case already holds writes nothing,
 *      and a catch-up of parts this page already saved sends nothing.
 *   5. A new write to `cases` on the builder or case pages outside the queue
 *      (a source scan: every `.update(` on cases and every
 *      `updateMasterResult(` there must sit inside a `runCaseWrite(` call).
 *      The scanner is tested on a synthetic source first, so a broken scanner
 *      cannot pass silently.
 *
 * Not covered: the server routes (/api/case/read, /api/cases/*) write the row
 * from the server, outside any browser queue; they use updateMasterResult's
 * updated_at check, so they never erase a save, but they can still overlap
 * one browser write.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  positionSavesSettled,
  runCaseWrite,
  savePositionQueued,
  savePositionQueuedOutcome,
  setPositionClientForChecks,
  setPositionSaveTimeoutForChecks,
} from "../../app/builder/_components/positionSave";
import { readCasePosition } from "../../src/lib/case-system/casePosition";
import { updateMasterResult } from "../../src/lib/case-system/updateCaseRecord";

const ROOT = path.resolve(__dirname, "../..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS  ${name}`);
  else {
    failures += 1;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

// ---- A test-double client that records overlapping writes -----------------

type Row = { court_path: string; master_result: Record<string, unknown>; updated_at: string };

function recordingClient(rows: Record<string, Row>) {
  const stats = { inFlight: new Map<string, number>(), maxInFlight: new Map<string, number>(), writes: 0, reads: 0 };
  const hooks: { writeDelayMs: (caseId: string) => number } = { writeDelayMs: () => 5 + Math.floor(Math.random() * 25) };
  let stamp = 0;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const db = {
    from() {
      return {
        select(columns: string) {
          const filters: Record<string, string> = {};
          const chain = {
            eq(column: string, value: string) {
              filters[column] = value;
              return chain;
            },
            async maybeSingle() {
              stats.reads += 1;
              await sleep(1 + Math.floor(Math.random() * 5));
              const row = rows[filters.id];
              if (!row) return { data: null, error: null };
              return {
                data: /master_result/.test(columns)
                  ? { master_result: JSON.parse(JSON.stringify(row.master_result)), updated_at: row.updated_at }
                  : { court_path: row.court_path },
                error: null,
              };
            },
          };
          return chain;
        },
        update(values: { master_result: Record<string, unknown> }) {
          const filters: Record<string, string> = {};
          const chain = {
            eq(column: string, value: string) {
              filters[column] = value;
              return chain;
            },
            async select() {
              const caseId = filters.id;
              stats.writes += 1;
              const now = (stats.inFlight.get(caseId) ?? 0) + 1;
              stats.inFlight.set(caseId, now);
              stats.maxInFlight.set(caseId, Math.max(stats.maxInFlight.get(caseId) ?? 0, now));
              try {
                await sleep(hooks.writeDelayMs(caseId));
                const row = rows[caseId];
                if (!row) return { data: [], error: null };
                if (filters.updated_at !== undefined && filters.updated_at !== row.updated_at) return { data: [], error: null };
                row.master_result = values.master_result;
                row.updated_at = `2026-10-14T00:00:00.${String((stamp += 1)).padStart(3, "0")}Z`;
                return { data: [{ id: caseId }], error: null };
              } finally {
                stats.inFlight.set(caseId, (stats.inFlight.get(caseId) ?? 1) - 1);
              }
            },
          };
          return chain;
        },
      };
    },
  };
  return { db, stats, hooks };
}

const freshRow = (court: string): Row => ({ court_path: court, master_result: { intakeData: { courtPath: court } }, updated_at: "2026-10-14T00:00:00.000Z" });

// The builder's case save, as page.tsx does it: read, rebuild on top, write
// only over what was read, inside the case's queue.
function caseSave(db: unknown, caseId: string, marker: string) {
  return runCaseWrite(caseId, () => updateMasterResult(db, { caseId }, (stored) => ({ ...stored, analysisRun: marker })));
}

void (async () => {
  try {
    // ---- 1 and 3: everything at once, never two writes to one case --------
    const rows = { "case-a": freshRow("small-claims"), "case-b": freshRow("civil") };
    const { db, stats } = recordingClient(rows);
    setPositionClientForChecks(db as never);
    const fired: Promise<unknown>[] = [
      caseSave(db, "case-a", "first"),
      savePositionQueued("case-a", { confirmedStage: "responding" }),
      runCaseWrite("case-a", () => updateMasterResult(db, { caseId: "case-a" }, (stored) => ({ ...stored, familyStatus: { answered: true } }))),
      savePositionQueued("case-a", { dateAnswers: { "sc-date-claim-served": "2026-09-20" } }),
      savePositionQueuedOutcome("case-a", { confirmedStage: "responding", dateAnswers: { "sc-date-claim-served": "2026-09-20" } }, { onlyUnsaved: true }),
      caseSave(db, "case-a", "second"),
      // Another case, at the same moment: it may overlap case-a's writes.
      caseSave(db, "case-b", "other"),
      savePositionQueued("case-b", { confirmedStage: "starting-case" }),
    ];
    await Promise.all(fired);
    await positionSavesSettled("case-a", 5_000);
    check(
      "queue: never two writes to the same case in flight at once (case saves, family answers and position saves fired together)",
      (stats.maxInFlight.get("case-a") ?? 0) === 1 && (stats.maxInFlight.get("case-b") ?? 0) === 1,
      `most at once: case-a ${stats.maxInFlight.get("case-a")}, case-b ${stats.maxInFlight.get("case-b")}`,
    );
    const a = rows["case-a"].master_result;
    const position = readCasePosition(a, "small-claims");
    check(
      "queue: no save is lost -- every one fired is on the case",
      a.analysisRun === "second" &&
        JSON.stringify(a.familyStatus) === JSON.stringify({ answered: true }) &&
        position.confirmedStage === "responding" &&
        position.dateAnswers["sc-date-claim-served"] === "2026-09-20" &&
        readCasePosition(rows["case-b"].master_result, "civil").confirmedStage === "starting-case",
    );

    // ---- 4: repeats cost no write -----------------------------------------
    const writesBefore = stats.writes;
    const repeat = await savePositionQueued("case-a", { confirmedStage: "responding" });
    check("repeats: a save the case already holds is reported saved and writes nothing", repeat === true && stats.writes === writesBefore);
    const readsBefore = stats.reads;
    const catchUp = await savePositionQueuedOutcome("case-a", { confirmedStage: "responding", dateAnswers: { "sc-date-claim-served": "2026-09-20" } }, { onlyUnsaved: true });
    check("repeats: a catch-up of parts this page already saved sends nothing at all", catchUp === "saved" && stats.reads === readsBefore && stats.writes === writesBefore);
    const changed = await savePositionQueuedOutcome("case-a", { confirmedStage: "responding", dateAnswers: { "sc-date-claim-served": "2026-09-21" } }, { onlyUnsaved: true });
    check(
      "repeats: a catch-up still sends what changed",
      changed === "saved" && readCasePosition(rows["case-a"].master_result, "small-claims").dateAnswers["sc-date-claim-served"] === "2026-09-21",
    );

    // ---- 2: a save given up on holds the queue until its write is done ----
    const slowRows = { "case-slow": freshRow("family") };
    const slow = recordingClient(slowRows);
    setPositionClientForChecks(slow.db as never);
    setPositionSaveTimeoutForChecks(20);
    let firstWrite = true;
    slow.hooks.writeDelayMs = () => {
      if (firstWrite) {
        firstWrite = false;
        return 150; // sent before the 20 ms limit, finishes long after it
      }
      return 5;
    };
    const gaveUp = savePositionQueued("case-slow", { confirmedStage: "responding" });
    const next = caseSave(slow.db, "case-slow", "after");
    const gaveUpResult = await gaveUp;
    await next;
    await positionSavesSettled("case-slow", 5_000);
    check("queue: a save given up on is reported as not saved", gaveUpResult === false);
    check(
      "queue: the next write waits until a given-up write has really finished",
      (slow.stats.maxInFlight.get("case-slow") ?? 0) === 1 && slowRows["case-slow"].master_result.analysisRun === "after",
      `most at once: ${slow.stats.maxInFlight.get("case-slow")}`,
    );
    setPositionSaveTimeoutForChecks(null);

    // ---- A reader waits for a case write in the queue ---------------------
    let release: () => void = () => undefined;
    void runCaseWrite("case-wait", () => new Promise<void>((resolve) => (release = resolve)));
    let settled = false;
    const waiting = positionSavesSettled("case-wait", 5_000).then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 30));
    const whileWriting = settled;
    release();
    await waiting;
    check("queue: a reader of the case waits while a case write is going, then goes ahead", !whileWriting && settled);
  } finally {
    setPositionClientForChecks(null);
    setPositionSaveTimeoutForChecks(null);
  }

  // ---- 5: every write to `cases` on these pages is inside runCaseWrite ----
  /** Comments blanked out (same length, so indices hold). */
  function blankComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) => match.replace(/[^\n]/g, " "));
  }
  /** Indices of writes to the cases row: `.from("cases")` followed by `.update(`, and calls of updateMasterResult. */
  function writeSites(source: string): number[] {
    const sites: number[] = [];
    for (const match of source.matchAll(/\.from\(\s*["']cases["']\s*\)\s*\.update\(/g)) sites.push(match.index ?? 0);
    for (const match of source.matchAll(/(?<![\w.])updateMasterResult\(/g)) {
      const lineStart = source.lastIndexOf("\n", match.index ?? 0) + 1;
      if (/^\s*import\b/.test(source.slice(lineStart, match.index))) continue;
      sites.push(match.index ?? 0);
    }
    return sites;
  }
  /** True when `index` sits inside the argument list of some `runCaseWrite(` call before it. */
  function insideQueue(source: string, index: number): boolean {
    for (const match of source.matchAll(/runCaseWrite\(/g)) {
      const start = (match.index ?? 0) + match[0].length;
      if (start > index) break;
      let depth = 1;
      for (let i = start; i < index && depth > 0; i += 1) {
        if (source[i] === "(") depth += 1;
        else if (source[i] === ")") depth -= 1;
      }
      if (depth > 0) return true;
    }
    return false;
  }
  function unqueuedWrites(raw: string): number[] {
    const source = blankComments(raw);
    return writeSites(source).filter((index) => !insideQueue(source, index));
  }

  // The scanner itself, on synthetic sources.
  const bad = `async function save() {\n  await supabase.from("cases").update({ a: 1 }).eq("id", id);\n  await updateMasterResult(supabase, { caseId }, (m) => m);\n}`;
  const good = `async function save() {\n  await runCaseWrite(id, async () => {\n    await supabase.from("cases").update({ a: 1 }).eq("id", id);\n    return updateMasterResult(supabase, { caseId }, (m) => m);\n  });\n}`;
  const closed = `runCaseWrite(id, () => Promise.resolve());\nawait supabase.from("cases").update({ a: 1 });`;
  check(
    "scanner: finds writes outside the queue, and accepts writes inside it",
    unqueuedWrites(bad).length === 2 && unqueuedWrites(good).length === 0 && unqueuedWrites(closed).length === 1,
  );

  const pageFiles: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) pageFiles.push(full);
    }
  };
  walk(path.join(ROOT, "app/builder"));
  walk(path.join(ROOT, "app/cases"));
  // positionSave.ts is the queue itself; its writes run only from inside it
  // (asserted by behaviour above).
  const scanned = pageFiles.filter((file) => !file.endsWith(path.join("_components", "positionSave.ts")));
  const offenders: string[] = [];
  let sitesSeen = 0;
  for (const file of scanned) {
    const raw = readFileSync(file, "utf8");
    sitesSeen += writeSites(blankComments(raw)).length;
    for (const index of unqueuedWrites(raw)) offenders.push(`${path.relative(ROOT, file)}:${raw.slice(0, index).split("\n").length}`);
  }
  check("source: the builder and case pages write the case somewhere (sanity: the scan sees them)", sitesSeen > 0);
  check("source: every write to a case's row on the builder and case pages goes through runCaseWrite", offenders.length === 0, offenders.join(", "));

  console.log(failures ? `\n${failures} case-write-queue check(s) failed.` : "\nAll case-write-queue checks passed.");
  if (failures) process.exitCode = 1;
})();
