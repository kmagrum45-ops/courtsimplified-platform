/**
 * The random statement check (master plan build order, step 3: a court is
 * "locked" when its walkthrough cases, its held-back cases and a 50-statement
 * random check all pass).
 *
 * WHAT IT DOES. Collects every plain-words legal statement a person can see
 * for one court, each with the quote(s) it rests on:
 *   - published answers: each sentence and the quote its verifier matched;
 *   - next-step cards: filing, service and fee lines and their quotes;
 *   - deadlines: what is due and the qualifier, with the rule and exceptions;
 *   - the step chain: each "what can happen next" sentence and final reason.
 * Then draws a seeded random sample (default 50), checks mechanically that
 * each quote is word for word in the saved source, and writes the sample to
 * docs/statement-checks/<court>-<seed>.json for an independent reviewer (an
 * agent that did not write the content, CLAUDE.md s. 2) to judge whether each
 * statement says only what its quotes support.
 *
 * WHAT IT CATCHES on its own: a quote that is not in the saved source. The
 * judgment (does the sentence overreach its quote?) is the reviewer's; the
 * verdicts are recorded in the same file.
 *
 * COSTS NOTHING: no network, no model.
 *
 * Run: npx tsx scripts/eval/statementCheck.ts [court] [seed] [count]
 *      court: small-claims | civil | family   (default small-claims)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { ALL_STAGES, pathwayOf } from "../../src/lib/case-system/stage-map/stageMap";
import { FINAL_STEPS, STAGE_MOVES } from "../../src/lib/case-system/stage-map/stageSequence";
import type { RuleCitation } from "../../src/lib/case-system/stage-map/citations";
import { practicalFor, type PracticalCourt } from "../../src/lib/content-library/nextStepPractical";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const court = (process.argv[2] ?? "small-claims") as PracticalCourt;
const seed = Number(process.argv[3] ?? 20261013);
const count = Number(process.argv[4] ?? 50);

type Quote = { sourceId: string; pinpoint: string; quote: string };
export type Statement = { where: string; stageId: string; statement: string; quotes: Quote[] };

// ---------------------------------------------------------------- saved sources

const flat = (text: string) =>
  text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

const sources = new Map<string, string>();
const manifest = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/corpus/manifest.json"), "utf8")) as { entries: { id: string; file: string }[] };
for (const entry of manifest.entries) {
  try {
    sources.set(entry.id, flat(readFileSync(path.join(ROOT, "docs/sources/corpus", entry.file), "utf8")));
  } catch {
    /* not on disk */
  }
}
const index = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/retrieval/corpus-index.json"), "utf8")) as { sources: unknown };
for (const source of (Array.isArray(index.sources) ? index.sources : Object.values(index.sources as object)) as { id: string; path?: string }[]) {
  if (sources.has(source.id) || !source.path) continue;
  try {
    sources.set(source.id, flat(readFileSync(path.join(ROOT, "docs/sources", source.path), "utf8")));
  } catch {
    /* not on disk */
  }
}

/** Each run of a quote is in the saved source. */
export function quoteInSource(quote: Quote): boolean {
  const text = sources.get(quote.sourceId);
  // Runs are joined by " ... " (citations) or " | " (the published verifier's quotes).
  return !!text && quote.quote.split(/ \.\.\. | \| /).every((run) => text.includes(flat(run).replace(/^["']|["']$/g, "")));
}

// ---------------------------------------------------------------- what a person sees

const inCourt = (stageId: string) => {
  const stage = ALL_STAGES.find((candidate) => candidate.id === stageId);
  return !!stage && pathwayOf(stage) === court;
};
const q = (rule: RuleCitation): Quote => ({ sourceId: rule.sourceId, pinpoint: rule.pinpoint, quote: rule.quote });

export function collect(): Statement[] {
  const out: Statement[] = [];

  const published = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/published/stageAnswers.published.json"), "utf8")) as {
    blocks: { stageId: string; citations: Quote[]; verification?: { verdicts?: { sentence: string; supported: boolean; quote?: string; sourceId?: string }[] } }[];
  };
  for (const block of published.blocks.filter((candidate) => inCourt(candidate.stageId))) {
    for (const verdict of block.verification?.verdicts ?? []) {
      if (!verdict.supported || !verdict.quote || !verdict.sourceId) continue;
      const cited = block.citations.find((citation) => citation.sourceId === verdict.sourceId && flat(citation.quote).includes(flat(verdict.quote!).slice(0, 60)));
      out.push({ where: "published answer", stageId: block.stageId, statement: verdict.sentence, quotes: [{ sourceId: verdict.sourceId, pinpoint: cited?.pinpoint ?? "", quote: verdict.quote }] });
    }
  }

  const seenLine = new Set<string>();
  for (const stage of ALL_STAGES.filter((candidate) => inCourt(candidate.id))) {
    for (const deadline of stage.deadlines) {
      out.push({
        where: "deadline",
        stageId: stage.id,
        statement: [deadline.what, deadline.qualifier].filter(Boolean).join(". "),
        quotes: [deadline.rule, ...deadline.exceptions].map(q),
      });
    }
    // Card lines are shared across steps; each distinct line is one statement.
    const card = practicalFor(stage.id, court, "Ottawa");
    const torontoCard = practicalFor(stage.id, court, "Toronto");
    for (const line of [...(card?.filing ?? []), ...(torontoCard?.filing ?? []), ...(card?.serving ?? []), ...(card?.feeNotes ?? [])]) {
      if (seenLine.has(line.say)) continue;
      seenLine.add(line.say);
      out.push({ where: "next-step card", stageId: stage.id, statement: line.say, quotes: [q(line.cite)] });
    }
    for (const fee of card?.fees ?? []) {
      if (seenLine.has(fee.label)) continue;
      seenLine.add(fee.label);
      out.push({ where: "next-step card (fee)", stageId: stage.id, statement: `${fee.label}: $${fee.amount}`, quotes: [q(fee.cite)] });
    }
  }

  for (const move of STAGE_MOVES.filter((candidate) => inCourt(candidate.from))) {
    out.push({ where: "what can happen next", stageId: `${move.from} -> ${move.to}`, statement: move.when, quotes: move.rules.map(q) });
  }
  for (const final of FINAL_STEPS.filter((candidate) => inCourt(candidate.stage))) {
    out.push({ where: "what can happen next (final)", stageId: final.stage, statement: final.why, quotes: final.rules.map(q) });
  }
  return out;
}

/** Seeded shuffle (mulberry32), so a sample can be drawn again exactly. */
export function sample<T>(items: T[], n: number, s: number): T[] {
  let state = s >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function main() {
  const all = collect();
  const picked = sample(all, count, seed).map((statement, index) => ({
    n: index + 1,
    ...statement,
    quotesInSource: statement.quotes.map((quote) => ({ pinpoint: quote.pinpoint, sourceId: quote.sourceId, found: quoteInSource(quote) })),
    review: null as null | { verdict: "correct" | "overreaches" | "wrong"; note: string },
  }));
  const outDir = path.join(ROOT, "docs/statement-checks");
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${court}-${seed}.json`);
  writeFileSync(file, `${JSON.stringify({ court, seed, drawnFrom: all.length, count: picked.length, generated: new Date().toISOString().slice(0, 10), statements: picked }, null, 2)}\n`);
  const byWhere = all.reduce<Record<string, number>>((acc, statement) => ({ ...acc, [statement.where]: (acc[statement.where] ?? 0) + 1 }), {});
  const missing = picked.flatMap((statement) => statement.quotesInSource.filter((quote) => !quote.found).map((quote) => `#${statement.n} ${quote.sourceId} ${quote.pinpoint}`));
  console.log(`${all.length} statements for ${court}:`, byWhere);
  console.log(`Drew ${picked.length} (seed ${seed}) -> ${path.relative(ROOT, file)}`);
  console.log(missing.length ? `Quotes NOT found in the saved source:\n  ${missing.join("\n  ")}` : "Every quote in the sample is word for word in its saved source.");
}

if (process.argv[1]?.endsWith("statementCheck.ts")) main();
