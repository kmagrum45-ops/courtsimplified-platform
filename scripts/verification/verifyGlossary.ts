/**
 * Every glossary entry says what a word means wherever it is used, rests on
 * sources whose quoted words are really in the saved copy, and keeps the
 * law's own definitions verbatim.
 *
 * COSTS NOTHING. Reads the vendored statutes, rules and court pages; no model call.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - glossaryIndex.json drifting from the statutes as vendored (a re-vendored
 *     Act adds, drops or rewords a definition): rebuilt in memory and compared;
 *   - a law definition that is not, word for word, in its source file;
 *   - an entry whose source quote is not, word for word, in the saved copy of
 *     that source, or whose title, citation or link no longer matches the
 *     corpus manifest (rerun scripts/glossary/fillSources.ts);
 *   - an entry that opens by pinning a shared word to one rulebook ("In the
 *     family rules, ...") -- the 2026-10-13 complaint. Court-specific meaning
 *     goes in the entry's court notes, after the meaning that applies everywhere;
 *   - a defined term that silently vanished: every term the law defines is
 *     either shown under an entry or listed in `removed` with a reason;
 *   - a number in an explanation that none of its sources contains;
 *   - grading or prediction words, an over-long explanation, a duplicate term;
 *   - an explanation missing from the content inventory (the output guard
 *     would blank it on screen).
 *
 * Run: node --import tsx scripts/verification/verifyGlossary.ts
 * Rebuild the law definitions after re-vendoring: npm run glossary:index
 * Refresh source titles and links: npm run glossary:sources
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildGlossary, GLOSSARY_SOURCES } from "../glossary/buildGlossary";
import { manifestEntries, sourceMeta } from "../glossary/fillSources";
import { GLOSSARY, GLOSSARY_FILE } from "../../src/lib/content-library/glossary/glossary";
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
const normalise = (text: string) =>
  text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

// ---- the law's own definitions (unchanged since 2026-09-30) ----
const committed = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/glossary/glossaryIndex.json"), "utf8"));
const rebuilt = buildGlossary(ROOT);
check(
  "the committed law definitions match the statutes as vendored (rebuild with npm run glossary:index)",
  JSON.stringify(committed.terms) === JSON.stringify(rebuilt),
);
const lawTexts = new Map(
  GLOSSARY_SOURCES.map((source) => [source.id, readFileSync(path.join(ROOT, source.file), "utf8").replace(/\s+/g, " ")]),
);
const notVerbatim = rebuilt.flatMap((term) =>
  term.definitions.filter((definition) => !lawTexts.get(definition.source)?.includes(definition.definition)).map(() => term.term),
);
check("every law definition is verbatim in its statute or rule", notVerbatim.length === 0, notVerbatim.join(", "));

// ---- every defined term is shown or removed for a stated reason ----
const shownLawTerms = new Map<string, string>();
for (const entry of GLOSSARY_FILE.entries) {
  for (const term of [entry.term, ...(entry.lawTerms ?? [])]) shownLawTerms.set(term.toLowerCase(), entry.term);
}
const indexTerms = rebuilt.map((term) => term.term);
const unaccounted = indexTerms.filter(
  (term) => !shownLawTerms.has(term.toLowerCase()) && !GLOSSARY_FILE.removed[term],
);
check("every term the law defines is shown under an entry or removed with a reason", unaccounted.length === 0, unaccounted.join(", "));
const bothWays = indexTerms.filter((term) => shownLawTerms.has(term.toLowerCase()) && GLOSSARY_FILE.removed[term]);
check("no term is both shown and removed", bothWays.length === 0, bothWays.join(", "));
const strayRemoved = Object.entries(GLOSSARY_FILE.removed).filter(
  ([term, reason]) => !indexTerms.includes(term) || reason.trim().length < 15,
);
check("each removal names a defined term and says why", strayRemoved.length === 0, strayRemoved.map(([term]) => term).join(", "));
const strayLawTerms = GLOSSARY_FILE.entries.flatMap((entry) =>
  (entry.lawTerms ?? []).filter((term) => !indexTerms.some((indexed) => indexed.toLowerCase() === term.toLowerCase())),
);
check("every lawTerms name is a term the law defines", strayLawTerms.length === 0, strayLawTerms.join(", "));

// ---- the authored entries ----
const manifest = manifestEntries(ROOT);
const corpusText = new Map<string, string>();
function savedCopy(id: string): string | null {
  if (corpusText.has(id)) return corpusText.get(id)!;
  const found = manifest.find((entry) => entry.id === id);
  if (!found) return null;
  const text = normalise(readFileSync(path.join(ROOT, "docs/sources/corpus", found.file ?? `${id}.txt`), "utf8"));
  corpusText.set(id, text);
  return text;
}

const GRADING = /\b(strong|weak|chances?|likely to (?:win|succeed|lose)|recommend\w*|advisable|should|ought)\b/i;
const PINNED_OPENING = /^(?:in|under) the (?:family|civil|small claims) rules\b|^(?:in|under) the [A-Z][\w ,.'’]*\b(?:Act|Rules)\b/i;
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

const seen = new Set<string>();
const problems: string[] = [];
for (const entry of GLOSSARY_FILE.entries) {
  const where = `"${entry.term}"`;
  const key = entry.term.toLowerCase();
  if (seen.has(key)) problems.push(`${where}: duplicate term`);
  seen.add(key);
  if (!["term", "latin"].includes(entry.kind)) problems.push(`${where}: kind must be term or latin`);
  if (!entry.meaning?.trim()) problems.push(`${where}: no meaning`);
  if (PINNED_OPENING.test(entry.meaning ?? "")) {
    problems.push(`${where}: meaning opens by pinning the word to one rulebook; say what it means everywhere, and put court differences in courts`);
  }
  if (words(entry.meaning ?? "") > 80) problems.push(`${where}: meaning is ${words(entry.meaning)} words (max 80)`);
  for (const [court, text] of Object.entries(entry.courts ?? {})) {
    if (!["small-claims", "civil", "family"].includes(court)) problems.push(`${where}: unknown court ${court}`);
    if (!text?.trim()) problems.push(`${where}: empty ${court} note`);
    if (words(text ?? "") > 60) problems.push(`${where}: ${court} note is ${words(text)} words (max 60)`);
  }
  const allText = [entry.meaning, ...Object.values(entry.courts ?? {})].join(" ");
  const grading = allText.match(GRADING);
  if (grading) problems.push(`${where}: grading or advice word "${grading[0]}"`);

  if (!entry.sources?.length) problems.push(`${where}: no sources`);
  const supportText: string[] = [];
  for (const source of entry.sources ?? []) {
    const meta = sourceMeta(source.id, manifest);
    const copy = savedCopy(source.id);
    if (!meta || copy === null) {
      problems.push(`${where}: source ${source.id} is not in the corpus`);
      continue;
    }
    if (source.title !== meta.title || source.citation !== meta.citation || source.url !== meta.url) {
      problems.push(`${where}: source ${source.id} title/citation/url out of date (npm run glossary:sources)`);
    }
    if (!source.pinpoint?.trim()) problems.push(`${where}: source ${source.id} has no pinpoint`);
    const quote = normalise(source.quote ?? "");
    if (words(quote) < 4) problems.push(`${where}: quote from ${source.id} is under 4 words`);
    else if (!copy.includes(quote)) problems.push(`${where}: quote not found word for word in ${source.id}: "${quote.slice(0, 80)}"`);
    supportText.push(quote);
  }
  // Law definitions shown under the entry also support it.
  for (const definition of GLOSSARY.find((shown) => shown.term === entry.term)?.definitions ?? []) supportText.push(definition.definition);
  const support = supportText.join(" ");
  const stray = (allText.match(/\d+(?:[.,]\d+)*/g) || []).filter((number) => !support.includes(number));
  if (stray.length) problems.push(`${where}: numbers no source contains: ${[...new Set(stray)].join(", ")}`);

  for (const text of [entry.meaning, ...Object.values(entry.courts ?? {})]) {
    if (text && !checkUserContent(text).allowed) problems.push(`${where}: text not in the content inventory`);
  }
}
for (const problem of problems) console.log(`      ${problem}`);
check("every entry is plain, sourced word for word, and court differences are noted separately", problems.length === 0, `${problems.length} problem(s)`);

check("Latin is limited to phrases still in use with a published meaning", GLOSSARY_FILE.entries.filter((entry) => entry.kind === "latin").length <= 15);
check("each law-definitions source still contributes at least one shown or removed term", GLOSSARY_SOURCES.every((source) =>
  rebuilt.some((term) => term.definitions.some((definition) => definition.source === source.id))));

console.log("");
console.log(`${GLOSSARY.length} entries (${GLOSSARY.filter((entry) => entry.kind === "latin").length} Latin), ${Object.keys(GLOSSARY_FILE.removed).length} defined terms removed.`);
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
