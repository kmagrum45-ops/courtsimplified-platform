/**
 * The provision behind every sentence a published stage answer proved, for
 * the answer's source list (2026-10-13).
 *
 * WHY. Each published answer was checked sentence by sentence at release:
 * every sentence carries a verdict with the quote that supports it, found in
 * the saved official text. But the source list shown under the answer is the
 * answer's own `citations`, which name only some of those provisions. The
 * walkthrough's critic flagged, on three Small Claims cases, a sentence like
 * "a defendant's claim may be issued within 20 days after your defence is
 * filed" whose rule (r. 10.01) was not in the list, although the release had
 * proved it word for word from r. 10.01 (3).
 *
 * This finds, for each such quote, the provision it sits in -- by cutting the
 * saved text on its own section boundaries (corpusChunker, the same cut the
 * search index uses) -- and writes them to
 * src/lib/content-library/published/verdictSources.generated.json. The
 * published answers are not touched. A quote that cannot be placed in exactly
 * one provision is left out, never guessed.
 *
 * EXACT WORDS (2026-10-29, site owner: every legal statement shown has its
 * plain sentence plus the source's exact words one click away, with the
 * citation). The same placing is done for every part of every checked quote
 * and written to src/lib/content-library/published/quotePinpoints.generated.json,
 * keyed by quoteKey(sourceId, quote): the provision each part sits in, or null
 * where it cannot be placed in exactly one. These pinpoints are DERIVED from
 * the saved text at build time, never at request time; the published answers
 * carry only the quote and its source. A part that opens with a lettered
 * clause ("(h.1) a proceeding based on ...") is narrowed to that clause
 * (clauseNarrowed); a roman-numeral subclause is not, because the saved text
 * does not say which clause it belongs to (its indentation is antiword's).
 *
 * Run: npx tsx scripts/content/buildVerdictSources.ts           (writes)
 *      npx tsx scripts/content/buildVerdictSources.ts --check   (CI: fails if stale)
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chunkSource, collapse, type ChunkSource } from "../../src/lib/case-system/retrieval/corpusChunker";
import { quoteKey, quoteParts } from "../../src/lib/content-library/quoteKey";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PUBLISHED = path.join(ROOT, "src/lib/content-library/published/stageAnswers.published.json");
const OUT = path.join(ROOT, "src/lib/content-library/published/verdictSources.generated.json");
const PINPOINTS_OUT = path.join(ROOT, "src/lib/content-library/published/quotePinpoints.generated.json");
const CORPUS = path.join(ROOT, "docs/sources/corpus");

type Verdict = { sentence: string; supported: boolean; quote?: string; sourceId?: string; quoteFound?: boolean };
type Block = {
  stageId: string;
  citations: { sourceId: string; pinpoint: string }[];
  verification?: { verdicts?: Verdict[] };
};

export type VerdictSources = Record<string, { sourceId: string; pinpoint: string }[]>;

const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as { entries: ChunkSource[] };
const sources = new Map(manifest.entries.map((entry) => [entry.id, entry]));
const chunkCache = new Map<string, ReturnType<typeof chunkSource>>();

const rawCache = new Map<string, string>();

function rawText(sourceId: string): string {
  if (!rawCache.has(sourceId)) {
    let text = "";
    try {
      text = sources.has(sourceId) ? readFileSync(path.join(CORPUS, `${sourceId}.txt`), "utf8") : "";
    } catch {
      text = "";
    }
    rawCache.set(sourceId, text);
  }
  return rawCache.get(sourceId) ?? "";
}

function chunksOf(sourceId: string) {
  if (!chunkCache.has(sourceId)) {
    const source = sources.get(sourceId);
    const text = rawText(sourceId);
    chunkCache.set(sourceId, source && text ? chunkSource(source, text) : []);
  }
  return chunkCache.get(sourceId) ?? [];
}

/** The one provision a quote sits in, or null. "..." joins pieces; the first piece places it. */
export function pinpointForQuote(sourceId: string, quote: string): string | null {
  const first = collapse(quote.split(/\s*(?:\.\.\.|…)\s*/)[0] ?? "");
  // A table row ("LIBEL AND SLANDER ACT |SECTION 6 |") is a schedule, which
  // the passage cut files under the last numbered section. Never placed.
  if (first.length < 20 || /\|/.test(quote)) return null;
  const found = chunksOf(sourceId).filter((chunk) => chunk.text.includes(first));
  // A web page has no section numbers; its heading is where the words are
  // ("Documents you cannot file online"). 2026-10-13: "Court staff review
  // online filings within 3 business days" was proved from the ontario.ca
  // filing page but not listed.
  if (found.length && found.every((chunk) => !chunk.pinpoint)) {
    const headings = new Set(found.map((chunk) => chunk.heading.trim()).filter(Boolean));
    return headings.size === 1 ? [...headings][0] : null;
  }
  const pinpoints = new Set(found.filter((chunk) => chunk.pinpoint).map((chunk) => chunk.pinpoint));
  if (pinpoints.size !== 1 || found.some((chunk) => !chunk.pinpoint)) return null;
  return narrowed(found[0].pinpoint, rawText(sourceId), first);
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * "r. 10.01 (1)-(4)" -> "r. 10.01 (2)": in the saved text as printed, the
 * last line before the quote that opens a subsection -- "      (2)  The
 * defendant's claim ..." or "      10.01  (1)  ..." -- when the last section
 * number above it is this provision's own and the subsection is in the
 * passage's range. Otherwise the range is kept: a wrong subsection is worse
 * than a wide one.
 */
export function narrowed(pinpoint: string, raw: string, quote: string): string {
  const range = /^([rs]\.\s*)([\d.]+)\s*\((\d+(?:\.\d+)?)\)-\((\d+(?:\.\d+)?)\)$/.exec(pinpoint);
  if (!range) return pinpoint;
  const [, prefix, section, low, high] = range;
  const words = quote.split(" ").slice(0, 12).map(escape).join("\\s+");
  const located = new RegExp(words).exec(raw);
  if (!located) return pinpoint;
  const before = raw.slice(0, located.index);
  const openers = [...before.matchAll(/^[ \t]*(?:([\d.]+)[ \t]+)?\((\d+(?:\.\d+)?)\)[ \t]/gm)];
  const sections = [...before.matchAll(/^[ \t]*(\d+(?:\.\d+)*)[ \t]+\(1\)[ \t]|^[ \t]*(\d+(?:\.\d+)*)[ \t]{2,}\S/gm)];
  const lastSection = sections.at(-1);
  const sectionNumber = lastSection ? (lastSection[1] ?? lastSection[2]) : null;
  const opener = openers.at(-1);
  if (!opener || sectionNumber !== section) return pinpoint;
  const number = Number(opener[2]);
  if (number < Number(low) || number > Number(high)) return pinpoint;
  // The opener must come after the section's own number.
  if ((opener.index ?? 0) < (lastSection?.index ?? 0)) return pinpoint;
  return `${prefix}${section} (${opener[2]})`;
}

/** "r. 10.01 (3)" and "r. 10.01 (1)-(3)" name the same rule for the list: keep the one the answer already cites. */
const ruleOf = (pinpoint: string) => pinpoint.replace(/\s*\(.*$/, "").trim();

export function buildVerdictSources(): VerdictSources {
  const published = JSON.parse(readFileSync(PUBLISHED, "utf8")) as { blocks: Block[] };
  const out: VerdictSources = {};
  for (const block of published.blocks) {
    const cited = new Set(block.citations.map((citation) => `${citation.sourceId}|${ruleOf(citation.pinpoint)}`));
    // A web page the answer already cites is listed once, whatever part of it.
    const citedPages = new Set(block.citations.filter((citation) => !/^[rs]\.\s/.test(citation.pinpoint)).map((citation) => citation.sourceId));
    const added: { sourceId: string; pinpoint: string }[] = [];
    for (const verdict of block.verification?.verdicts ?? []) {
      if (!verdict.supported || !verdict.quoteFound || !verdict.quote || !verdict.sourceId) continue;
      const pinpoint = pinpointForQuote(verdict.sourceId, verdict.quote);
      if (!pinpoint) continue;
      const key = `${verdict.sourceId}|${ruleOf(pinpoint)}`;
      if (cited.has(key)) continue;
      if (!/^[rs]\.\s/.test(pinpoint)) {
        if (citedPages.has(verdict.sourceId)) continue;
        citedPages.add(verdict.sourceId);
      }
      cited.add(key);
      added.push({ sourceId: verdict.sourceId, pinpoint });
    }
    if (added.length) out[block.stageId] = added;
  }
  return out;
}

/**
 * A lettered clause a quote part opens with, added to the provision it sits
 * in: "s. 16 (1)" + "(h.1) a proceeding based on ..." -> "s. 16 (1) (h.1)".
 * Only a clause the part itself names (a letter, or a letter with a number
 * such as h.1), never i, v or x, which could be a roman-numeral subclause;
 * and only onto one section or subsection, never a range. Otherwise the
 * provision is kept as placed.
 */
const LETTERED_CLAUSE = /^\(((?:[a-z](?:\.\d+)+)|[a-hj-uwyz])\)\s/;
export function clauseNarrowed(pinpoint: string, part: string): string {
  const clause = LETTERED_CLAUSE.exec(part.trim());
  if (!clause) return pinpoint;
  if (!/^[rs]\.\s*[\d.]+(?:\s*\(\d+(?:\.\d+)?\))?$/.test(pinpoint)) return pinpoint;
  return `${pinpoint} (${clause[1]})`;
}

/** The provision each part of a quote sits in (null where it cannot be placed in exactly one). */
export function pinpointsForQuote(sourceId: string, quote: string): (string | null)[] {
  return quoteParts(quote).map((part) => {
    const placed = pinpointForQuote(sourceId, part);
    if (!placed) return null;
    const narrowedToClause = clauseNarrowed(placed, part);
    return narrowedToClause === placed || clauseDirectlyUnder(rawText(sourceId), part) ? narrowedToClause : placed;
  });
}

/**
 * Whether the clause a part opens with sits directly under its section or
 * subsection in the saved text: found there, as a line of its own, with no
 * numbered paragraph ("2. ...") between the last section or subsection
 * opener and it. A clause under a numbered paragraph is that paragraph's
 * clause, and "s. 6 (1) (b)" would then name the wrong thing.
 */
function clauseDirectlyUnder(raw: string, part: string): boolean {
  // Horizontal space includes the no-break spaces some saved texts carry (the Family Law Rules: "5.  (1)").
  const words = part.trim().split(/\s+/).slice(0, 12).map(escape).join("\\s+");
  const located = new RegExp(`^[^\\S\\r\\n]*${words}`, "m").exec(raw);
  if (!located) return false;
  const before = raw.slice(0, located.index);
  // A section or subsection opener: "16 (1)  ...", "(2)  ...", " 5.  (1)  ..." (the Family Law Rules' style), "34  ...".
  const opener = [...before.matchAll(/^[^\S\r\n]*(?:\d+(?:\.\d+)*\.?[^\S\r\n]+)?\(\d+(?:\.\d+)?\)[^\S\r\n]|^[^\S\r\n]*\d+(?:\.\d+)*[^\S\r\n]{2,}\S/gm)].at(-1);
  const since = before.slice(opener?.index ?? 0);
  // A numbered paragraph ("2. The ..."), not a rule number followed by its subrule ("5.  (1)").
  return !/^[^\S\r\n]*\d+\.[^\S\r\n]+(?!\()/m.test(since.split("\n").slice(1).join("\n"));
}

export type QuotePinpoints = Record<string, (string | null)[]>;

/** Every checked quote of every published answer, by quoteKey, with its parts' provisions. A quote none of whose parts can be placed is left out. */
export function buildQuotePinpoints(): QuotePinpoints {
  const published = JSON.parse(readFileSync(PUBLISHED, "utf8")) as { blocks: Block[] };
  const out: QuotePinpoints = {};
  const owner = new Map<string, string>();
  for (const block of published.blocks) {
    for (const verdict of block.verification?.verdicts ?? []) {
      if (!verdict.supported || !verdict.quoteFound || !verdict.quote || !verdict.sourceId) continue;
      const key = quoteKey(verdict.sourceId, verdict.quote);
      const identity = `${verdict.sourceId}\u0000${verdict.quote}`;
      if (owner.has(key) && owner.get(key) !== identity) throw new Error(`quoteKey collision on ${key}: two different quotes; widen the key`);
      owner.set(key, identity);
      if (key in out) continue;
      const pinpoints = pinpointsForQuote(verdict.sourceId, verdict.quote);
      if (pinpoints.some(Boolean)) out[key] = pinpoints;
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  const outputs: [string, string][] = [
    [OUT, `${JSON.stringify(buildVerdictSources(), null, 2)}\n`],
    [PINPOINTS_OUT, `${JSON.stringify(buildQuotePinpoints(), null, 1)}\n`],
  ];
  if (process.argv.includes("--check")) {
    for (const [file, built] of outputs) {
      let current = "";
      try {
        current = readFileSync(file, "utf8");
      } catch {
        current = "";
      }
      if (current !== built) {
        console.log(`${path.basename(file)} is stale: run npx tsx scripts/content/buildVerdictSources.ts`);
        process.exitCode = 1;
      } else {
        console.log(`${path.basename(file)} is current.`);
      }
    }
    return;
  }
  for (const [file, built] of outputs) writeFileSync(file, built);
  const count = Object.values(JSON.parse(outputs[0][1]) as VerdictSources).reduce((sum, list) => sum + list.length, 0);
  console.log(`Wrote ${count} provisions across ${Object.keys(JSON.parse(outputs[0][1])).length} answers.`);
  console.log(`Wrote the provisions of ${Object.keys(JSON.parse(outputs[1][1])).length} checked quotes.`);
}

/*
 * *** THIS GUARD USED TO NEVER MATCH, AND FAILED SILENTLY ***
 *
 * It compared `import.meta.url` against "file://" + process.argv[1]. When argv[1]
 * is RELATIVE -- which is how npx/tsx passes it -- that compares
 * "file://scripts/content/..." with "file:///C:/Users/.../scripts/content/...", so
 * they never match: main() never ran, nothing was written, and the process exited 0.
 * Running it with --check printed nothing and succeeded, which reads as "the
 * generated file is current" when nothing had been checked at all.
 *
 * Found 2026-10-17: three bot PRs failed CI on "every source in the search index has
 * a checked date" because a newly added Act had no source-display row, and
 * regenerating it locally appeared to do nothing whatsoever.
 *
 * pathToFileURL resolves a relative argv against the working directory and produces
 * the same absolute file: URL that import.meta.url carries.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
