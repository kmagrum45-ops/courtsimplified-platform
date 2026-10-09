/**
 * test:historical-law -- the "law as it read on a past date" shelf
 * (scripts/retrieval/historicalSources.ts, 2026-10-09).
 *
 * WHAT IT CATCHES: an old version of a law being shown as today's law. That
 * once hid a 60-day notice rule from every slip-and-fall claim
 * (SOURCING_NOTES.md), so the corpus refuses old versions; this shelf holds
 * them instead, and these checks keep it honest:
 *   1. every historical source's title states the period it was in force,
 *      because every citation the site shows is built from the title;
 *   2. every file exists, and its own text says it is a past version for that
 *      period (no current text filed as historical, or the reverse);
 *   3. none of them is in the current corpus;
 *   4. a checked answer keeps a statement resting on one only if the statement
 *      says it is about the past.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { HISTORICAL_SOURCES } from "../retrieval/historicalSources";
import { historicalStatementOk, isHistoricalId } from "../../src/lib/case-system/retrieval/historicalLaw";
import { CORPUS_SOURCES } from "../rules/corpusSources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

console.log("\n1-3. The shelf");
for (const source of HISTORICAL_SOURCES) {
  const period = /\(as it read ([^)]+)\)/.exec(source.title)?.[1] ?? "";
  check(`${source.id}: the title states its period`, Boolean(period), source.title);
  check(`${source.id}: its id marks it historical`, isHistoricalId(source.id));
  const file = path.join(ROOT, "docs", "sources", source.path ?? "");
  const text = existsSync(file) ? readFileSync(file, "utf8").slice(0, 3000).replace(/\s+/g, " ") : "";
  check(`${source.id}: the file is there`, text.length > 0, file);
  check(
    `${source.id}: the text itself says it is a past version for that period`,
    /HISTORICAL VERSION/i.test(text) && period.split(/ to /).every((end) => text.toUpperCase().includes(end.toUpperCase())),
    text.slice(0, 200),
  );
  check(`${source.id}: not in the current corpus`, !CORPUS_SOURCES.some((current) => current.id === source.id));
}

console.log("\n4. Old law only in a statement about the past");
check("a passage id from the shelf is recognised", isHistoricalId("corpus:historical-criminal-code-part-xvi-2007:4"));
check("a current passage is not", !isHistoricalId("corpus:criminal-code:4"));
check("'In 2007, ...' may rest on it", historicalStatementOk("In 2007, the Act said the Crown could not be sued for anything done in the due enforcement of the criminal law."));
check("'at the time' may rest on it", historicalStatementOk("At the time, a claimant had to give sixty days' notice."));
check(
  "a present-tense statement may not",
  !historicalStatementOk("The Crown cannot be sued for anything done in the due enforcement of the criminal law."),
);
const answer = readFileSync(path.join(ROOT, "src/lib/case-system/retrieval/checkedAnswer.ts"), "utf8");
check(
  "the checked answer holds back a statement that fails it",
  /isHistoricalId\(source\.passageId\)\)\s*&&\s*!historicalStatementOk\(item\.statement\.text\)/.test(answer),
);

console.log(`\n${failures === 0 ? "All historical-law checks passed." : `${failures} check(s) FAILED.`}`);
if (failures) process.exitCode = 1;
