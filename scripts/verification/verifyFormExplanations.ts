/**
 * Every official form is in the guide, explained from the rules that name it,
 * and the rule quotes are still the regulation's own words.
 *
 * COSTS NOTHING. Reads the vendored regulations and the guide; no model call.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - formRuleIndex.json drifting from the regulation text (a re-vendored
 *     regulation adds, drops or retitles a form, or changes a rule's words):
 *     the index is rebuilt in memory from the corpus and compared;
 *   - a rule quote that is not in the regulation, word for word, or that does
 *     not name its form;
 *   - a current form with no explanation, or an explanation for a form that
 *     is not in the table of forms (a typo or a revoked form);
 *   - an explanation that uses a number its sources do not contain (a
 *     deadline or amount written from memory), is longer than 50 words,
 *     speaks to the reader as "you", or uses advice or grading words;
 *   - an explanation missing from the content inventory, which would make
 *     the output guard blank it on screen.
 *
 * Run: node --import tsx scripts/verification/verifyFormExplanations.ts
 * Rebuild the index after re-vendoring: node --import tsx scripts/forms/buildFormRuleIndex.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { buildIndex, FORM_SOURCES, formsInList } from "../forms/buildFormRuleIndex";
import { FORM_COURTS, FORM_GUIDE, formGuideEntry } from "../../src/lib/content-library/forms/formGuide";
import { FORM_SUMMARIES } from "../../src/lib/content-library/forms/formSummaries";
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
const committed = JSON.parse(
  readFileSync(path.join(ROOT, "src/lib/content-library/forms/formRuleIndex.json"), "utf8"),
) as { forms: unknown };
const rebuilt = buildIndex(ROOT);

check(
  "the committed index matches the regulations as vendored (rebuild with scripts/forms/buildFormRuleIndex.ts)",
  JSON.stringify(committed.forms) === JSON.stringify(rebuilt),
);

// The same reading of "Form 8, 8A or 8B.1" lists that the generator uses.
const TOKEN = String.raw`\d+[A-Z]?(?:\.\d+)*[A-Z]?(?:\.\d+)?`;
function formsNamedIn(text: string): Set<string> {
  const named = new Set<string>();
  const lists = new RegExp(String.raw`Forms?\s+(${TOKEN}(?:\s*(?:,|or|and|to)\s*${TOKEN})*)`, "g");
  for (const match of text.matchAll(lists)) for (const token of formsInList(match[1])) named.add(token);
  return named;
}

const ADVICE = /\b(you|your|should|ought|important|best|strong|weak|chance|recommend|advisable|win|lose)\b/i;

for (const court of FORM_COURTS) {
  const corpus = readFileSync(path.join(ROOT, FORM_SOURCES[court].file), "utf8").replace(/\s+/g, " ");
  const entries = FORM_GUIDE[court];
  check(`${court}: the guide lists forms`, entries.length > 0);

  let quoteProblems = 0;
  let summaryProblems = 0;
  let unnamed = 0;
  for (const entry of entries) {
    for (const rule of entry.rules) {
      const inCorpus = corpus.includes(rule.quote);
      const namesForm = formsNamedIn(rule.quote).has(entry.number);
      if (!inCorpus || !namesForm) {
        quoteProblems += 1;
        if (quoteProblems <= 5)
          console.log(`      ${court} Form ${entry.number} ${rule.rule}: ${inCorpus ? "does not name the form" : "not in the regulation"}`);
      }
    }
    if (entry.rules.length === 0) unnamed += 1;

    const summary = entry.summary;
    const sources = `${entry.officialTitle} ${entry.rules.map((rule) => rule.quote).join(" ")}`;
    const strayNumbers = (summary.match(/\d+(?:[.,]\d+)*/g) || []).filter((n) => !sources.includes(n));
    const words = summary.split(/\s+/).filter(Boolean).length;
    const problem = !summary
      ? "no explanation"
      : strayNumbers.length
        ? `numbers not in its sources: ${strayNumbers.join(", ")}`
        : words > 50
          ? `${words} words`
          : ADVICE.test(summary)
            ? `advice or grading word: ${summary.match(ADVICE)![0]}`
            : !checkUserContent(summary).allowed
              ? "not in the content inventory"
              : null;
    if (problem) {
      summaryProblems += 1;
      if (summaryProblems <= 5) console.log(`      ${court} Form ${entry.number}: ${problem}`);
    }
  }
  check(`${court}: every rule quote is in the regulation and names its form`, quoteProblems === 0, `${quoteProblems} problem(s)`);
  check(`${court}: every form has a sourced, plain explanation`, summaryProblems === 0, `${summaryProblems} problem(s)`);
  // A few civil forms are named in no rule; each is shown with an honest note.
  // The property: nearly every form is grounded in a rule.
  check(`${court}: at least 95% of forms are named in a rule`, unnamed / entries.length <= 0.05, `${unnamed} unnamed`);

  const listed = new Set(entries.map((entry) => entry.number));
  const orphans = Object.keys(FORM_SUMMARIES[court]).filter((number) => !listed.has(number));
  check(`${court}: no explanation for a form that is not in the table of forms`, orphans.length === 0, orphans.join(", "));
}

check("lookup accepts 'Form 7A', '7a' and ' 7A '", formGuideEntry("small-claims", "Form 7A")?.number === "7A" &&
  formGuideEntry("small-claims", "7a")?.number === "7A" && formGuideEntry("small-claims", " 7A ")?.number === "7A");
check("a range names every form in it", formsInList("64B to 64D, 64G").join(",") === "64B,64C,64D,64G");
check("lookup refuses an unknown court", formGuideEntry("criminal", "1") === null);

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
