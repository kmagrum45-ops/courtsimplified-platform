/**
 * Builds carry baseline entries from what a CI run recorded (owner, 30 Oct: #533 merges with run 4's
 * list). Reads every carry-records JSON under a folder (a downloaded run's artifacts), makes one entry
 * per violation and per unreached step, each limited to its own run (court, route, guest or signed-in)
 * with a reason naming what was seen (harness/carryCounts.ts seedEntries), and checks their shape.
 * Prints them; with --write, puts them in tests/browser/harness/carryBaseline.json (keeping its _about).
 * Never guesses: an entry exists only because a run recorded it.
 * Usage: node --import tsx scripts/browser/carrySeed.ts <artifacts folder> [--write]
 */
import fs from "node:fs";
import { BASELINE_PATH, badEntries, readRunRecords, seedEntries } from "../../tests/browser/harness/carryCounts";

const dir = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!dir) { console.error("Usage: carrySeed.ts <artifacts folder> [--write]"); process.exit(1); }
const records = readRunRecords(dir);
if (!records.length) { console.error(`No carry-records found under ${dir}.`); process.exit(1); }
const entries = seedEntries(records);
const bad = badEntries(entries);
if (bad.length) { console.error(`Entries with a bad shape: ${JSON.stringify(bad, null, 2)}`); process.exit(1); }
const byKind = entries.reduce<Record<string, number>>((all, entry) => ({ ...all, [entry.kind]: (all[entry.kind] ?? 0) + 1 }), {});
console.error(`${records.length} runs, ${entries.length} entries: ${JSON.stringify(byKind)}`);
if (process.argv.includes("--write")) {
  const current = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as { _about?: string };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({ _about: current._about, entries }, null, 2) + "\n");
  console.error(`written to ${BASELINE_PATH}`);
} else {
  console.log(JSON.stringify(entries, null, 2));
}
