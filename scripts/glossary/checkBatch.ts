/**
 * Author's self-check for a draft batch of glossary entries, before they are
 * merged into glossaryEntries.json. Runs the same word-for-word, number,
 * opening and wording checks as test:glossary, without the content inventory.
 *
 *   node --import tsx scripts/glossary/checkBatch.ts <batch.json>
 *
 * A batch is { "entries": AuthoredEntry[], "removed": { term: reason } }, with
 * sources written as { id, pinpoint, quote } (title/citation/url are filled
 * later by npm run glossary:sources).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { manifestEntries } from "./fillSources";

const ROOT = process.cwd();
const normalise = (text: string) =>
  text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const GRADING = /\b(strong|weak|chances?|likely to (?:win|succeed|lose)|recommend\w*|advisable|should|ought)\b/i;
const PINNED_OPENING = /^(?:in|under) the (?:family|civil|small claims) rules\b|^(?:in|under) the [A-Z][\w ,.'’]*\b(?:Act|Rules)\b/i;

const batch = JSON.parse(readFileSync(process.argv[2], "utf8"));
const manifest = manifestEntries(ROOT);
const index = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/glossary/glossaryIndex.json"), "utf8")).terms as {
  term: string;
  definitions: { definition: string }[];
}[];
const cache = new Map<string, string>();
const copy = (id: string) => {
  if (!cache.has(id)) {
    const found = manifest.find((entry: { id: string }) => entry.id === id) as { file?: string } | undefined;
    cache.set(id, found ? normalise(readFileSync(path.join(ROOT, "docs/sources/corpus", found.file ?? `${id}.txt`), "utf8")) : "");
  }
  return cache.get(id)!;
};

let problems = 0;
const say = (term: string, text: string) => {
  problems += 1;
  console.log(`"${term}": ${text}`);
};
for (const entry of batch.entries ?? []) {
  const t = entry.term;
  if (!["term", "latin"].includes(entry.kind)) say(t, "kind must be term or latin");
  if (!entry.meaning) say(t, "no meaning");
  if (PINNED_OPENING.test(entry.meaning ?? "")) say(t, "meaning opens by pinning the word to one rulebook");
  if (words(entry.meaning ?? "") > 80) say(t, `meaning ${words(entry.meaning)} words (max 80)`);
  for (const [court, text] of Object.entries(entry.courts ?? {}) as [string, string][]) {
    if (!["small-claims", "civil", "family"].includes(court)) say(t, `unknown court ${court}`);
    if (words(text) > 60) say(t, `${court} note ${words(text)} words (max 60)`);
  }
  const all = [entry.meaning, ...Object.values(entry.courts ?? {})].join(" ");
  const g = all.match(GRADING);
  if (g) say(t, `grading/advice word "${g[0]}"`);
  if (!entry.sources?.length) say(t, "no sources");
  const support: string[] = [];
  for (const source of entry.sources ?? []) {
    const text = copy(source.id);
    if (!text) {
      say(t, `source id ${source.id} not in manifest`);
      continue;
    }
    const q = normalise(source.quote ?? "");
    if (!source.pinpoint) say(t, `no pinpoint for ${source.id}`);
    if (words(q) < 4) say(t, `quote under 4 words (${source.id})`);
    else if (!text.includes(q)) say(t, `quote NOT FOUND in ${source.id}: "${q.slice(0, 90)}"`);
    support.push(q);
  }
  const lawTerms = new Set([t, ...(entry.lawTerms ?? [])].map((x: string) => x.toLowerCase()));
  for (const indexed of index) if (lawTerms.has(indexed.term.toLowerCase())) support.push(...indexed.definitions.map((d) => d.definition));
  for (const lt of entry.lawTerms ?? []) if (!index.some((i) => i.term.toLowerCase() === lt.toLowerCase())) say(t, `lawTerms "${lt}" is not a defined term`);
  const stray = (all.match(/\d+(?:[.,]\d+)*/g) || []).filter((n: string) => !support.join(" ").includes(n));
  if (stray.length) say(t, `numbers no source contains: ${stray.join(", ")}`);
}
for (const [term, reason] of Object.entries(batch.removed ?? {}) as [string, string][]) {
  if (!index.some((i) => i.term === term)) say(term, "removed term is not a defined term (exact spelling)");
  if (reason.trim().length < 15) say(term, "removal reason too short");
}
console.log(problems ? `${problems} problem(s)` : `OK: ${(batch.entries ?? []).length} entries, ${Object.keys(batch.removed ?? {}).length} removed`);
process.exitCode = problems ? 1 : 0;
