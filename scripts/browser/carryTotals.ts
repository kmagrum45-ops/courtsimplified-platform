/**
 * The end-to-end carry test's totals, over every run's record (carry-records/, the CI parts
 * downloaded into one folder): prints the one fixed line
 *   CARRY COUNTS asked-twice=N returned-after-removal=N wrong-case=N screens-disagree=N unreached=N
 * lists the baseline entries no run matched (stale: fixed, delete them) of every kind ("unreached"
 * included), and writes totals.json. Never fails on stale entries (they are reported); the runs
 * themselves fail on new violations and new unreached steps.
 * Usage: node --import tsx scripts/browser/carryTotals.ts [folder]
 */
import fs from "node:fs";
import path from "node:path";
import { CARRY_RECORDS, countsLine, countsOf, readBaseline, readRunRecords, splitNewlyMeasured, staleEntries } from "../../tests/browser/harness/carryCounts";

const dir = process.argv[2] ?? CARRY_RECORDS;
const records = readRunRecords(dir);
const violations = records.flatMap((record) => record.violations);
const counts = countsOf(violations);
const unreached = records.reduce((sum, record) => sum + record.unreached.length, 0);
const list = readBaseline();
const stale = staleEntries(list, violations, records);
const parts = splitNewlyMeasured(list);
console.log(`list: ${parts.original.length} original + ${parts.newlyMeasured.length} newly measured (counted apart)`);
console.log(`runs: ${records.length} (${records.map((record) => record.run).join("; ")})`);
for (const record of records) for (const item of record.unreached) console.log(`UNREACHED [${record.run}] ${item}`);
for (const entry of stale) console.log(`CARRY STALE ${entry.newlyMeasured ? "[newly measured] " : ""}${entry.kind} ${entry.fact} @ ${entry.where}${entry.court ? ` [${[entry.court, entry.route, entry.who].filter(Boolean).join(" ")}]` : ""}: ${entry.reason}`);
console.log(countsLine(counts, unreached));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "totals.json"), JSON.stringify({ counts, unreached, runs: records.map((record) => ({ run: record.run, counts: countsOf(record.violations), unreached: record.unreached })), stale }, null, 2));
if (records.length === 0) { console.log("No run records found."); process.exit(1); }
