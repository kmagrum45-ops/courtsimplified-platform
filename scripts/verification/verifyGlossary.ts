/**
 * Every glossary definition is the law's own words, and every explanation
 * says only what the definitions support.
 *
 * COSTS NOTHING. Reads the vendored statutes and rules; no model call.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - glossaryIndex.json drifting from the statutes as vendored (a re-vendored
 *     Act adds, drops or rewords a definition): rebuilt in memory and compared;
 *   - a definition that is not, word for word, in its source file;
 *   - a term with no explanation, or an explanation for a term the index does
 *     not define (a typo, or a term that was removed);
 *   - an explanation longer than 60 words, using "you", advice or grading
 *     words, or a number none of its definitions contain;
 *   - an explanation missing from the content inventory (the output guard
 *     would blank it on screen).
 *
 * Run: node --import tsx scripts/verification/verifyGlossary.ts
 * Rebuild after re-vendoring: node --import tsx scripts/glossary/buildGlossary.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildGlossary, GLOSSARY_SOURCES } from "../glossary/buildGlossary";
import { GLOSSARY } from "../../src/lib/content-library/glossary/glossary";
import explanations from "../../src/lib/content-library/glossary/glossaryExplanations.json";
import { checkUserContent } from "../../src/lib/content-library/outputGuard";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ROOT = process.cwd();
const committed = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/glossary/glossaryIndex.json"), "utf8"));
check(
  "the committed glossary matches the statutes as vendored (rebuild with scripts/glossary/buildGlossary.ts)",
  JSON.stringify(committed.terms) === JSON.stringify(buildGlossary(ROOT)),
);

const texts = new Map(
  GLOSSARY_SOURCES.map((source) => [source.id, readFileSync(path.join(ROOT, source.file), "utf8").replace(/\s+/g, " ")]),
);
const ADVICE = /\b(you|your|should|ought|must|important|best|strong|weak|chance|recommend|advisable)\b/i;

let definitionProblems = 0;
let explanationProblems = 0;
for (const entry of GLOSSARY) {
  for (const definition of entry.definitions) {
    if (!texts.get(definition.source)?.includes(definition.definition)) {
      definitionProblems += 1;
      console.log(`      "${entry.term}" (${definition.pinpoint}) is not verbatim in its source`);
    }
  }
  const text = entry.explanation;
  const sources = entry.definitions.map((definition) => definition.definition).join(" ");
  const stray = (text.match(/\d+(?:[.,]\d+)*/g) || []).filter((number) => !sources.includes(number));
  const words = text.split(/\s+/).filter(Boolean).length;
  const problem = !text
    ? "no explanation"
    : stray.length
      ? `numbers not in its definitions: ${stray.join(", ")}`
      : words > 60
        ? `${words} words`
        : ADVICE.test(text)
          ? `advice word: ${text.match(ADVICE)![0]}`
          : !checkUserContent(text).allowed
            ? "not in the content inventory"
            : null;
  if (problem) {
    explanationProblems += 1;
    console.log(`      "${entry.term}": ${problem}`);
  }
}
check("every definition is verbatim in its statute or rule", definitionProblems === 0, `${definitionProblems} problem(s)`);
check("every term has a plain, sourced explanation", explanationProblems === 0, `${explanationProblems} problem(s)`);

const defined = new Set(GLOSSARY.map((entry) => entry.term));
const orphans = Object.keys(explanations).filter((term) => !defined.has(term));
check("no explanation for a term the law does not define here", orphans.length === 0, orphans.join(", "));
check("each source contributes at least one definition", GLOSSARY_SOURCES.every((source) =>
  GLOSSARY.some((entry) => entry.definitions.some((definition) => definition.source === source.id))));

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
