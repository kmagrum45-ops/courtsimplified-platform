/**
 * Removes every recorded real-AI step that a whole replay did not use (site owner, 19 Nov 2026, rule 0: "when a reading
 * is re-recorded, the new one is the only one in the folder"). Recording (AI_FIXTURES=record) only adds the steps a
 * reading lacks, so after a change the old steps stay beside the new ones; this takes them out.
 *
 * Run after a replay of EVERY reading with AI_FIXTURES_USED=<log> (tests/browser/harness/aiFixtures.ts writes each step
 * used). It refuses a log that names no step of a reading on disk, so a partial replay never empties a reading.
 *
 *   node scripts/browser/pruneAiFixtures.mjs <log>          lists what it would remove
 *   node scripts/browser/pruneAiFixtures.mjs <log> --write  removes it, and lists what it removed
 */
import fs from "node:fs";
import path from "node:path";

const [log, flag] = process.argv.slice(2);
if (!log || !fs.existsSync(log)) { console.error("usage: pruneAiFixtures.mjs <used-steps log> [--write]"); process.exit(2); }
const DIR = path.join("tests", "browser", "fixtures", "real-ai");
const usedSteps = new Set(fs.readFileSync(log, "utf8").split(/\r?\n/).filter(Boolean));
let removed = 0;
let refused = 0;
for (const story of fs.readdirSync(DIR)) {
  for (const name of fs.readdirSync(path.join(DIR, story)).filter((item) => /^r\d+\.json$/.test(item))) {
    const key = `${story}/${name.replace(/\.json$/, "")}`;
    const file = path.join(DIR, story, name);
    const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
    const kept = fixture.entries.filter((entry) => usedSteps.has(`${key} ${entry.step} ${entry.input}`));
    if (!kept.length) { console.log(`REFUSED ${key}: the log uses none of its ${fixture.entries.length} steps (was it replayed?)`); refused++; continue; }
    const gone = fixture.entries.filter((entry) => !kept.includes(entry));
    for (const entry of gone) console.log(`${flag === "--write" ? "removed" : "would remove"}  ${key} ${entry.step} ${entry.input}`);
    removed += gone.length;
    if (flag === "--write" && gone.length) fs.writeFileSync(file, `${JSON.stringify({ ...fixture, entries: kept }, null, 2)}\n`);
  }
}
console.log(`${removed} step(s) ${flag === "--write" ? "removed" : "to remove"}; ${refused} reading(s) refused.`);
process.exit(refused ? 1 : 0);
