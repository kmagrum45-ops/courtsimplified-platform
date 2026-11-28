/**
 * THE NEW SMALL CLAIMS RESULTS STEP, WITHOUT A BROWSER (site owner, 27 Nov 2026; block table approved with changes).
 *
 * Checks, as properties, over every Small Claims claim type in the catalogue:
 *   1. every notice/time-limit item the generator marks (DEADLINE_LINE_ITEMS) is decided, kept or cut, exactly once
 *      (results/deadlineLines.ts), and every decision is for such an item; a kept one has a positive period;
 *   2. with the kind confirmed, results/scResults.ts draws each catalogue item at most once across the blocks (a kept
 *      deadline is in the deadlines only, never also in the checklist or the law; the law holds no element), the
 *      deadlines soonest first, and each source once;
 *   3. with no confirmed kind (nothing, a proposal only), nothing from the catalogue shows (hidden by default);
 *   4. a cut deadline item never shows in the deadlines;
 *   5. the results step makes no AI call: none of its own files, nor anything they import, reaches the OpenAI client
 *      (the import closure of ResultsBlocks.tsx and scResults.ts), so ?step=results draws from the record alone.
 *
 * Failure it exists to catch: the results showing a deadline twice, an element in two blocks, catalogue text for a kind
 * the person never confirmed, or an AI call coming back into the results (#568's switch-on run: no results at all,
 * because the old page waited on an AI analysis the new flow never ran).
 */
import fs from "node:fs";
import path from "node:path";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { DEADLINE_LINE_ITEMS } from "../../src/lib/case-system/applicability/catalogueConditions.generated";
import { DEADLINE_DECISIONS } from "../../src/lib/case-system/results/deadlineLines";
import { scResults } from "../../src/lib/case-system/results/scResults";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000001";
const recordWith = (answers: Record<string, string>) => caseFileOf({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: "Synthetic story." }, situation: { record: { where: "nothing", side: "starting", courtFrom: "choice" } }, builder: { initialAnswers: answers } } } as Checkpoint);

// 1.
const decided = Object.keys(DEADLINE_DECISIONS);
const undecided = DEADLINE_LINE_ITEMS.filter((key) => !(key in DEADLINE_DECISIONS));
const stray = decided.filter((key) => !DEADLINE_LINE_ITEMS.includes(key));
check("1 every notice/time-limit item is kept or cut, once", undecided.length === 0 && stray.length === 0 && new Set(decided).size === decided.length, `undecided: ${undecided.join(", ")}; not a deadline item: ${stray.join(", ")}`);
check("1 every kept item has a positive period", Object.values(DEADLINE_DECISIONS).every((d) => !d.keep || d.days > 0));

// 2-4.
const SC = CLAIM_TYPES.filter((type) => type.courtArea === "small-claims");
const twice: string[] = [];
const unsorted: string[] = [];
const cutShown: string[] = [];
const sourceTwice: string[] = [];
const elementInLaw: string[] = [];
let withDeadlines = 0;
for (const type of SC) {
  const results = scResults(recordWith({ "sc-orient-dispute-category": type.id }));
  if (results.claimTypeId !== type.id) { twice.push(`${type.id}: the confirmed kind was not read`); continue; }
  const keys = [...results.deadlines, ...results.elements, ...results.considerations, ...results.notes].map((line) => line.key);
  if (keys.length !== new Set(keys).size) twice.push(type.id);
  if (results.deadlines.some((line, i) => i > 0 && results.deadlines[i - 1].days > line.days)) unsorted.push(type.id);
  if (results.deadlines.some((line) => !DEADLINE_DECISIONS[line.key]?.keep)) cutShown.push(type.id);
  if (results.sources.length !== new Set(results.sources.map((s) => s.url)).size) sourceTwice.push(type.id);
  if ([...results.considerations, ...results.notes].some((line) => line.key.includes("|element|"))) elementInLaw.push(type.id);
  if (results.deadlines.length) withDeadlines += 1;
}
check("2 every Small Claims kind is read once confirmed, and no item is drawn twice across the blocks", twice.length === 0, twice.join(", "));
check("2 the deadlines are soonest first", unsorted.length === 0, unsorted.join(", "));
check("2 each source once", sourceTwice.length === 0, sourceTwice.join(", "));
check("2 the law block holds no element (the checklist owns them)", elementInLaw.length === 0, elementInLaw.join(", "));
check("2 kinds with a kept deadline draw it (some do)", withDeadlines > 0, String(withDeadlines));
check("4 a cut deadline item never shows in the deadlines", cutShown.length === 0, cutShown.join(", "));
const none = scResults(recordWith({}));
check("3 no confirmed kind: nothing from the catalogue shows", none.claimTypeId === null && none.deadlines.length + none.elements.length + none.considerations.length + none.notes.length === 0);

// 5. The import closure of the results step's own files.
const ROOT = process.cwd();
const resolve = (from: string, spec: string): string | null => {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return null;
};
const seen = new Set<string>();
const queue = ["app/builder/_flow/ResultsBlocks.tsx", "src/lib/case-system/results/scResults.ts"].map((file) => path.join(ROOT, file));
const ai: string[] = [];
while (queue.length) {
  const file = queue.pop()!;
  if (seen.has(file)) continue;
  seen.add(file);
  const text = fs.readFileSync(file, "utf8");
  // `import x from "y"`, `export … from "y"`, a bare `import "y"` (its side effects), and `import("y")`.
  for (const match of text.matchAll(/(?:import|export)[^"';]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gm)) {
    const spec = match[1] ?? match[2] ?? match[3];
    if (/^openai$|openaiClient|\/api\//.test(spec)) ai.push(`${path.relative(ROOT, file)} -> ${spec}`);
    const next = resolve(file, spec);
    if (next) queue.push(next);
  }
  if (/fetch\(\s*["'`]\/api\/(?:case\/(?:understand|analy|strategy)|assistant)/.test(text)) ai.push(`${path.relative(ROOT, file)} calls an AI route`);
}
check("5 the results step's import closure reaches no AI client or AI route", ai.length === 0, ai.join("; "));
check("5 the closure was walked (more than the two files)", seen.size > 2, String(seen.size));

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nThe Small Claims results step: every check passed.");
