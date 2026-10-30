/**
 * The end-to-end carry test's totals, over every run's record (carry-records/, the three CI parts
 * downloaded into one folder): prints the one fixed line
 *   CARRY COUNTS asked-twice=N returned-after-removal=N wrong-case=N screens-disagree=N
 * lists the baseline entries no run matched (stale: the site was fixed, delete them), and writes
 * carry-records/totals.json. Never fails on stale entries (they are reported); the runs themselves
 * fail on new violations. Usage: node --import tsx scripts/browser/carryTotals.ts [folder]
 */
import fs from "node:fs";
import path from "node:path";
import { CARRY_RECORDS, countsLine, countsOf, readBaseline, readRunRecords, staleEntries } from "../../tests/browser/harness/carryCounts";

const dir = process.argv[2] ?? CARRY_RECORDS;
const records = readRunRecords(dir);
const violations = records.flatMap((record) => record.violations);
const counts = countsOf(violations);
const stale = staleEntries(readBaseline(), violations, records);
console.log(`runs: ${records.length} (${records.map((record) => record.run).join("; ")})`);
for (const record of records) if (record.unreached.length) console.log(`UNREACHED ${record.run}: ${record.unreached.join(" | ")}`);
for (const entry of stale) console.log(`CARRY STALE ${entry.kind} ${entry.fact} @ ${entry.where}: ${entry.reason}`);
console.log(countsLine(counts));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "totals.json"), JSON.stringify({ counts, runs: records.map((record) => ({ run: record.run, counts: countsOf(record.violations), unreached: record.unreached })), stale }, null, 2));
if (records.length === 0) { console.log("No run records found."); process.exit(1); }
