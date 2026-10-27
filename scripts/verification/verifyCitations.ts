/**
 * EVERY CITATION THE SITE SHOWS SAYS EXACTLY WHAT IT CITES (Charter re-test, 27 Oct, root cause 5).
 *
 * Runs over the whole library: every quoted citation in the stage map (its steps, deadlines, moves
 * and final steps), the rules shown beside published sentences, the practical lines (forms, fees,
 * filing, service), and every source's name. For each it asserts, as properties:
 *   - the subsection cited holds the words quoted: the quote is found in the saved text, and the
 *     subsections it is in (retrieval/citationCheck.ts pinpointForQuote, from the chunker's own
 *     passages) are the ones cited, no wider ("s. 49 (1)-(2)" for words only s. 49 (1) says);
 *   - an Act is named by the title it gives itself, year included (the heading of its saved text),
 *     in every passage citation (the chat, the law box), the stage map's source names and the
 *     generated source display;
 *   - a sentence shown beside a rule gives no reason its rules do not give (addsReason).
 * Prints every finding, so the list can be fixed and reported, then fails if any remain.
 *
 * The chat's own citations are made at answer time; checkedAnswer.ts narrows each to its quote and
 * drops a statement adding a reason, through the same functions (test:checked-answer).
 *
 * Failure it exists to catch: a citation naming a subsection that does not say the words, an Act
 * without its year, a reason the rule does not give.
 */
import fs from "node:fs";
import path from "node:path";
import { addsReason, pinpointForQuote, shortTitleIn } from "../../src/lib/case-system/retrieval/citationCheck";
import { ownTitleFor } from "../../src/lib/content-library/sourceDisplay";
import { chunkSource, type CorpusChunk } from "../../src/lib/case-system/retrieval/corpusChunker";
import * as CITATIONS from "../../src/lib/case-system/stage-map/citations";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { STAGE_MOVES, FINAL_STEPS } from "../../src/lib/case-system/stage-map/stageSequence";
import { SENTENCE_RULES } from "../../src/lib/content-library/sentenceRules";
import * as PRACTICAL from "../../src/lib/content-library/nextStepPractical";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");
type Cite = { sourceId: string; pinpoint: string; quote: string };

const findings: string[] = [];
const find = (what: string) => findings.push(what);

// ---- every quoted citation, wherever it is defined
const cites = new Map<string, Cite & { where: string }>();
const seen = new WeakSet<object>();
function collect(value: unknown, where: string) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  const item = value as Record<string, unknown>;
  if (typeof item.sourceId === "string" && typeof item.pinpoint === "string" && typeof item.quote === "string") {
    const key = `${item.sourceId}|${item.pinpoint}|${item.quote}`;
    if (!cites.has(key)) cites.set(key, { sourceId: item.sourceId, pinpoint: item.pinpoint, quote: item.quote, where });
    return;
  }
  for (const child of Array.isArray(value) ? value : Object.values(item)) collect(child, where);
}
collect(Object.values(CITATIONS), "stage-map citations");
collect(ALL_STAGES, "stage map");
collect(STAGE_MOVES, "stage sequence");
collect(FINAL_STEPS, "stage sequence");
collect(SENTENCE_RULES, "rules beside published sentences");
collect(Object.values(PRACTICAL), "practical lines");

// ---- the saved text, cut into the chunker's own passages, once per source (as the index cuts it)
const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, "manifest.json"), "utf8"));
const entries: { id: string; title: string; url: string; citation?: string }[] = (Array.isArray(manifest) ? manifest : manifest.entries ?? manifest.sources ?? Object.values(manifest)) as never;
const chunks = new Map<string, CorpusChunk[] | null>();
function chunksOf(sourceId: string): CorpusChunk[] | null {
  if (!chunks.has(sourceId)) {
    const file = path.join(CORPUS, `${sourceId}.txt`);
    const entry = entries.find((item) => item.id === sourceId);
    chunks.set(sourceId, fs.existsSync(file) && entry ? chunkSource({ id: sourceId, title: entry.title, citation: entry.citation, url: entry.url }, fs.readFileSync(file, "utf8")) : null);
  }
  return chunks.get(sourceId)!;
}
const plain = (text: string) => text.replace(/[“”‘’"']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const SUBS = /^(.*?\b(?:ss?|rr?|para)\.\s*[\w.]+)\s*\((\d+(?:\.\d+)?)\)(?:\s*-\s*\((\d+(?:\.\d+)?)\))?\s*$/;
const range = (pinpoint: string) => {
  const match = SUBS.exec(pinpoint.replace(/\s+/g, " ").trim());
  return match ? { section: match[1].replace(/\s+/g, ""), from: Number(match[2]), to: match[3] === undefined ? Number(match[2]) : Number(match[3]) } : null;
};

let compared = 0;
let notComparable = 0;
for (const cite of cites.values()) {
  const passages = chunksOf(cite.sourceId);
  if (!passages) { find(`${cite.where}: ${cite.sourceId} ${cite.pinpoint}: no saved text for this source`); continue; }
  // A quote joined with "..." is several quotes: each part is found, and the subsections they are in are put together.
  const parts = plain(cite.quote).split(/\s*(?:\.\.\.|…)\s*/).filter((part) => part.length >= 20);
  const located = parts.map((part) => {
    const chunk = passages.find((passage) => plain(passage.text).includes(part));
    return chunk ? range(pinpointForQuote(chunk.pinpoint, chunk.text, part)) : null;
  });
  const cited = range(cite.pinpoint);
  if (!cited || !located.length || located.some((item) => !item)) { notComparable += 1; continue; }
  const quoted = { section: located[0]!.section, from: Math.min(...located.map((item) => item!.from)), to: Math.max(...located.map((item) => item!.to)) };
  const chunk = { pinpoint: located.length === 1 ? "" : "joined" };
  if (located.some((item) => item!.section !== quoted.section)) { notComparable += 1; continue; }
  compared += 1;
  if (cited.section !== quoted.section) continue; // a cross-reference quoted from another section's text: not this check's to judge
  if (quoted.from < cited.from || quoted.to > cited.to) find(`${cite.where}: ${cite.sourceId} ${cite.pinpoint}: the quoted words are in (${quoted.from})${quoted.to !== quoted.from ? `-(${quoted.to})` : ""}, outside what is cited`);
  else if ((cited.from < quoted.from || cited.to > quoted.to) && chunk.pinpoint.replace(/\s+/g, "") !== cite.pinpoint.replace(/\s+/g, "")) {
    find(`${cite.where}: ${cite.sourceId} ${cite.pinpoint}: cites more than the words quoted, which are only in (${quoted.from})${quoted.to !== quoted.from ? `-(${quoted.to})` : ""}`);
  }
}

// ---- every Act by its own name, year included
const ownTitle = new Map<string, string>();
/** A title compared as words: straight and curly apostrophes, and spacing, are the same title. */
const sameTitle = (title: string) => title.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
for (const entry of entries) {
  const file = path.join(CORPUS, `${entry.id}.txt`);
  const title = fs.existsSync(file) ? shortTitleIn(fs.readFileSync(file, "utf8")) : null;
  if (!title) continue;
  ownTitle.set(entry.id, title);
  // What a person reads (a passage's citation in the chat and the law box, storyRetrieval.ts): the
  // manifest's title is bound into the index's embeddings and is not corrected there (corpusIndex.ts).
  const shown = ownTitleFor(entry.id) ?? entry.title;
  if (sameTitle(shown) !== sameTitle(title)) find(`passage citations: ${entry.id}: named "${shown}", its own title is "${title}"`);
}
for (const [sourceId, name] of Object.entries((CITATIONS as unknown as { SOURCE_NAMES: Record<string, string> }).SOURCE_NAMES)) {
  const title = ownTitle.get(sourceId);
  if (title && !sameTitle(name).startsWith(sameTitle(title))) find(`stage-map source names: ${sourceId}: "${name}" does not start with its own title "${title}"`);
}
const display = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/content-library/published/sourceDisplay.generated.json"), "utf8"));
for (const [sourceId, shown] of Object.entries((display.sources ?? display) as Record<string, { name?: string }>)) {
  const title = ownTitle.get(sourceId);
  if (title && shown?.name && !sameTitle(shown.name).startsWith(sameTitle(title))) find(`source display: ${sourceId}: "${shown.name}" does not start with its own title "${title}"`);
}

// ---- no reason a rule does not give, in a sentence shown beside rules
for (const entry of SENTENCE_RULES) {
  const reason = addsReason(entry.sentence, entry.rules.map((rule) => rule.quote));
  if (reason) find(`rules beside published sentences: "${entry.sentence}" gives a reason its rules do not: "${reason}"`);
}

console.log(`${cites.size} quoted citations; ${compared} compared subsection by subsection; ${notComparable} with no subsection to compare (a section, a paragraph or a guide)`);
for (const finding of findings) console.log(`FAIL  ${finding}`);
console.log(findings.length ? `\n${findings.length} finding(s)` : "\nall passed");
process.exitCode = findings.length ? 1 : 0;
