/**
 * The published set is what it says it is, and nothing else is servable.
 *
 *   npm run test:published-library
 *
 * *** THREE PROPERTIES ***
 *
 * 1. IMMUTABLE. The release carries a hash over its own blocks. Editing a
 *    published block by hand — fixing a typo, softening a sentence — changes
 *    the content without it having passed a single gate, and nothing
 *    downstream would know. Recomputing the hash makes that a build failure.
 *
 * 2. STILL VALID. Every published block is re-run through the gates against
 *    the corpus as it stands NOW. Content verified against last year's r. 9.01
 *    is not verified, so a re-vendoring that moves rule text must turn this
 *    red rather than being absorbed quietly.
 *
 * 3. THE ONLY DOOR. Nothing outside the pipeline may read blocks from the
 *    candidates directory. Candidates are whatever the last run happened to
 *    produce; serving one would make the product's legal content a function of
 *    when somebody last ran a script.
 *
 * 4. SHOWN WITH ITS SOURCE AND DATE (walkthrough run 38525903567). Every
 *    source any published sentence cites resolves to a name, a page and the
 *    date its text was saved (sourceDisplay.ts); every rendered Sources line
 *    carries that date and every proving source is listed; a rule shown
 *    beside a sentence (sentenceRules.ts) is still beside a published
 *    sentence, quoted from the saved text, with the sentence's numbers.
 *    (walkthrough run 38593464953) A form number counts whole ("20P"); the
 *    SJ next-step sentences naming a form, the affidavit, the certificate or
 *    a writ each show a source; the SW gross-negligence sentences show
 *    Municipal Act s. 44 (9) / City of Toronto Act s. 42 (5).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

import { gateFailures, isPublishable } from "../content/blockGates";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import {
  hashBlocks,
  PUBLISHED_BLOCKS,
  PUBLISHED_RELEASE,
} from "../../src/lib/content-library/publishedLibrary";
import type { StageAnswer } from "../../src/lib/content-library/stageAnswers";
import { buildSourceDisplay, SOURCE_DISPLAY_FILE } from "../content/buildSourceDisplay";
import { NOT_A_SOURCE, sourceDisplayFor } from "../../src/lib/content-library/sourceDisplay";
import { SENTENCE_RULES } from "../../src/lib/content-library/sentenceRules";
import { renderStageAnswer } from "../../src/lib/content-library/stageAnswerView";
import VERDICT_SOURCES from "../../src/lib/content-library/published/verdictSources.generated.json";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MANIFEST = path.join(ROOT, "docs", "sources", "corpus", "manifest.json");

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name}\n      ${detail}` : name);
}

// ---------------------------------------------------------------------------
// 1. Immutable
// ---------------------------------------------------------------------------

/*
 * Nothing promoted yet is a legitimate state, not a failure.
 *
 * Before the first promotion the published set is empty by design, and the
 * product serves no blocks. Reporting seven failures for that would train
 * someone to ignore this suite before it has ever said anything real.
 *
 * The "only door" check below still runs, because the thing it guards against
 * — wiring a page to a candidate — is exactly what someone might do while the
 * published set is empty.
 */
const nothingPromoted = PUBLISHED_BLOCKS.length === 0 && !PUBLISHED_RELEASE.contentHash;

const recomputed = hashBlocks(PUBLISHED_BLOCKS);
if (!nothingPromoted) check(
  "the published blocks match the hash recorded when they were promoted",
  recomputed === PUBLISHED_RELEASE.contentHash,
  `recorded ${PUBLISHED_RELEASE.contentHash}, recomputed ${recomputed}.\n` +
    `      A published block has been edited since promotion. That content has not been ` +
    `through the gates.\n      To change it: run the pipeline and promote the new run.`,
);

if (!nothingPromoted) check(
  "the release records how many blocks it published",
  PUBLISHED_RELEASE.blockCount === PUBLISHED_BLOCKS.length,
  `release says ${PUBLISHED_RELEASE.blockCount}, file holds ${PUBLISHED_BLOCKS.length}`,
);

for (const field of nothingPromoted ? [] : (["runId", "model", "promotedAt", "corpusGeneratedAt"] as const)) {
  check(
    `the release records its ${field}`,
    Boolean(PUBLISHED_RELEASE[field]),
    "a published set whose provenance is blank cannot be traced back to what produced it",
  );
}

/*
 * The hash must actually respond to content.
 *
 * A hash function that returned a constant would make every check above pass
 * forever, which is the worst possible failure for an immutability check.
 */
if (PUBLISHED_BLOCKS.length > 0) {
  const tampered: StageAnswer[] = [
    { ...PUBLISHED_BLOCKS[0], whatToDoNext: `${PUBLISHED_BLOCKS[0].whatToDoNext} Edited.` },
    ...PUBLISHED_BLOCKS.slice(1),
  ];
  check(
    "the hash changes when a block changes",
    hashBlocks(tampered) !== recomputed,
    "the immutability check cannot detect an edit, so it is asserting nothing",
  );
}

// ---------------------------------------------------------------------------
// 2. Still valid, against the corpus as it stands now
// ---------------------------------------------------------------------------

// Every court's steps (2026-10-06): civil and family answers are published too.
const stages = new Map(ALL_STAGES.map((stage) => [stage.id, stage]));

for (const block of PUBLISHED_BLOCKS) {
  const reasons = gateFailures(block, stages.get(block.stageId));
  check(
    `published block passes every gate: ${block.stageId}`,
    reasons.length === 0,
    reasons.join("\n      "),
  );
  check(
    `published block is servable: ${block.stageId}`,
    isPublishable(block),
    `status "${block.verification.status}" is never shown to a user`,
  );
}

if (existsSync(MANIFEST) && !nothingPromoted) {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { generatedAt: string };
  check(
    "the content was verified against the corpus currently vendored",
    manifest.generatedAt === PUBLISHED_RELEASE.corpusGeneratedAt,
    `published against a corpus generated ${PUBLISHED_RELEASE.corpusGeneratedAt}; the corpus ` +
      `on disk was generated ${manifest.generatedAt}.\n      ` +
      `Re-run the pipeline and promote again — content checked against different rule text ` +
      `is not checked.`,
  );
}

// ---------------------------------------------------------------------------
// 3. The only door
// ---------------------------------------------------------------------------

/*
 * Nothing but the pipeline may read a candidate.
 *
 * Asserted over source text rather than over today's imports, so wiring a new
 * page to the candidates directory fails here rather than silently serving
 * whatever the last run produced.
 */
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      found.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const runtimeFiles = [...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "app"))];

/**
 * Strips comments before scanning.
 *
 * Without this the check failed on `publishedLibrary.ts` itself — whose header
 * explains that candidates live in docs/content-pipeline/candidates/ and must
 * not be served. The prose describing the rule tripped the rule.
 *
 * This is the third time in this work that a check has matched its own
 * explanation. The pattern is worth naming: a source scan that does not strip
 * comments is checking the documentation, not the code.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

let offenders = 0;
for (const file of runtimeFiles) {
  const source = withoutComments(readFileSync(file, "utf8"));
  if (/content-pipeline[\\/](candidates|stage-answers)/.test(source)) {
    offenders += 1;
    check(
      `runtime code does not read a candidate run: ${path.relative(ROOT, file)}`,
      false,
      "candidates are whatever the last run produced. Serving one makes the product's legal " +
        "content depend on when somebody last ran a script. Read from publishedLibrary.ts.",
    );
  }
}
if (offenders === 0) {
  check(`no runtime file reads a candidate run (${runtimeFiles.length} scanned)`, true);
}

// ---------------------------------------------------------------------------
// 4. Every source a published answer cites is shown, with its page and checked date
// ---------------------------------------------------------------------------
//
// Walkthrough run 38525903567 (senior-lawyer review, 2026-10-14): the Sources
// list kept only the stage map's own sources, so sentences proved from the
// Small Claims guides (guide-after-judgment, guide-replying-to-a-claim) showed
// none, and no list showed a checked date (CLAUDE.md s. 2). These assert the
// property over every id any published sentence cites, not a list of ids.

{
  const saved = readFileSync(SOURCE_DISPLAY_FILE, "utf8");
  check("sourceDisplay.generated.json matches a fresh build", saved === `${JSON.stringify(buildSourceDisplay(), null, 2)}\n`, "run: npx tsx scripts/content/buildSourceDisplay.ts");

  const manifestDates = new Map(
    (JSON.parse(readFileSync(MANIFEST, "utf8")) as { entries: { id: string; retrievedAt: string }[] }).entries.map((entry) => [entry.id, entry.retrievedAt.slice(0, 10)]),
  );
  type Cited = { sourceId?: string };
  const cited = new Set<string>();
  for (const block of PUBLISHED_BLOCKS as unknown as { citations?: Cited[]; sourceIds?: string[]; verification?: { verdicts?: Cited[] } }[]) {
    for (const citation of block.citations ?? []) if (citation.sourceId) cited.add(citation.sourceId);
    for (const verdict of block.verification?.verdicts ?? []) if (verdict.sourceId) cited.add(verdict.sourceId);
    for (const id of block.sourceIds ?? []) cited.add(id);
  }
  for (const rows of Object.values(VERDICT_SOURCES as Record<string, { sourceId: string }[]>)) for (const row of rows) cited.add(row.sourceId);
  for (const entry of SENTENCE_RULES) for (const rule of entry.rules) cited.add(rule.sourceId);
  const notShown = [...cited].filter((id) => !NOT_A_SOURCE.has(id)).filter((id) => {
    const shown = sourceDisplayFor(id);
    return !shown || !/^https:\/\//.test(shown.url) || !shown.name.trim() || shown.checkedOn !== manifestDates.get(id);
  });
  check(
    `every source a published sentence cites has a name, an https page and its saved date (${cited.size} ids)`,
    notShown.length === 0,
    notShown.join(", "),
  );

  // Rendered: every published answer's Sources list carries a date on every
  // line, and names every source its sentences were proved from.
  const missing: string[] = [];
  for (const block of PUBLISHED_BLOCKS as unknown as { stageId: string; verification?: { verdicts?: Cited[] } }[]) {
    // With the scope a scoped step needs and its confirmed fact, so every published answer renders.
    const stage = ALL_STAGES.find((candidate) => candidate.id === block.stageId);
    const facts = stage?.requiresConfirmedFact ? { [stage.requiresConfirmedFact.key]: "yes" } : {};
    const answer = renderStageAnswer(block.stageId, facts, {}, { primaryPath: stage?.pathway ?? "small-claims", confidence: 1 });
    if (!answer) {
      missing.push(`${block.stageId}: did not render`);
      continue;
    }
    for (const source of answer.sources) if (!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedOn)) missing.push(`${block.stageId}: ${source.name} has no date`);
    const listed = new Set(answer.sources.map((source) => source.name));
    for (const verdict of block.verification?.verdicts ?? []) {
      const shown = verdict.sourceId ? sourceDisplayFor(verdict.sourceId) : null;
      if (shown && !listed.has(shown.name)) missing.push(`${block.stageId}: ${verdict.sourceId} not listed`);
    }
  }
  check("every rendered Sources line has a checked date, and every proving source is listed", missing.length === 0, [...new Set(missing)].slice(0, 6).join("; "));

  // SJ: the two examination sentences show their rule, quoted, beside them.
  const sj = renderStageAnswer("plaintiff:judgment-in-my-favour-unpaid");
  const ruleLines = sj?.sentenceRules ?? [];
  check(
    "SJ: the guide the answer was proved from is in its Sources list",
    Boolean(sj?.sources.some((source) => source.name === sourceDisplayFor("guide-after-judgment")?.name)),
  );
  check(
    "SJ: '30 days before' and 'at least 3 days before' each show r. 8.01 (12), with a date",
    ["30 days before the hearing", "at least 3 days before"].every((words) =>
      ruleLines.some((entry) => entry.sentence.includes(words) && entry.rules.some((rule) => rule.pinpoint.startsWith("r. 8.01 (12)") && /^\d{4}-\d{2}-\d{2}$/.test(rule.checkedOn))),
    ),
    ruleLines.map((entry) => `${entry.sentence} -> ${entry.rules.map((rule) => rule.pinpoint).join(", ")}`).join(" | "),
  );

  // Every sentence-rule entry: its sentence is still published, its quotes are
  // in the saved text, and every number in the sentence is in a quote beside it.
  const corpusText = (id: string) => readFileSync(path.join(ROOT, "docs", "sources", "corpus", `${id}.txt`), "utf8").replace(/\s+/g, " ");
  const publishedText = (PUBLISHED_BLOCKS as unknown as Record<string, unknown>[]).map((block) => JSON.stringify(block)).join(" ");
  const WORDS: Record<string, string> = { "3": "three", "5": "five", "7": "seven", "10": "10", "15": "15", "20": "20", "30": "30" };
  const wrong: string[] = [];
  for (const entry of SENTENCE_RULES) {
    if (!publishedText.includes(entry.sentence)) wrong.push(`no longer published: ${entry.sentence}`);
    for (const rule of entry.rules) {
      for (const run of rule.quote.split(" ... ")) if (!corpusText(rule.sourceId).includes(run.replace(/\s+/g, " "))) wrong.push(`${rule.pinpoint}: quote not in the saved text`);
    }
    const quotes = entry.rules.map((rule) => rule.quote).join(" ");
    // A form number counts whole: "20P" must be "20P" in a quote (walkthrough run 38593464953, SJ).
    for (const number of entry.sentence.match(/\d+[A-Z]?\b/g) ?? []) {
      if (!new RegExp(`\\b(?:${number}|${WORDS[number] ?? number})\\b`, /[A-Z]$/.test(number) ? "" : "i").test(quotes)) wrong.push(`${entry.sentence}: ${number} is in no quote beside it`);
    }
  }
  check("each rule shown beside a sentence: sentence still published, quote in the saved text, its numbers in the quote", wrong.length === 0, wrong.join("; "));

  // SJ (walkthrough run 38593464953): every sentence of the next-step paragraph
  // that names a form, the affidavit, the certificate or the writ filing has a
  // source beside it. Asserted over the paragraph itself, so a new sentence of
  // that kind fails until it has one.
  {
    const lead = (PUBLISHED_BLOCKS as unknown as { stageId: string; whatToDoNext?: string }[]).find((block) => block.stageId === "plaintiff:judgment-in-my-favour-unpaid")?.whatToDoNext ?? "";
    const named = lead.split(/(?<=\.)\s+/).filter((sentence) => /\[Form \d+[A-Z]?|Affidavit|Certificate|writ/i.test(sentence));
    const bare = named.filter((sentence) => !ruleLines.some((entry) => entry.sentence === sentence && entry.rules.length > 0));
    check("SJ: each next-step sentence naming a form, the affidavit, the certificate or a writ shows its source, with a date", named.length >= 4 && bare.length === 0 && ruleLines.every((entry) => entry.rules.every((rule) => /^\d{4}-\d{2}-\d{2}$/.test(rule.checkedOn))), bare.join(" | "));
  }
  // SW (walkthrough run 38593464953): the gross-negligence sentence shows the Act's own subsection.
  {
    const notice = (PUBLISHED_BLOCKS as unknown as Record<string, unknown>[]).find((block) => JSON.stringify(block).includes("There, the municipality is liable only for gross negligence."));
    const stageId = String(notice?.stageId ?? "");
    const shown = notice ? renderStageAnswer(stageId, {}, {}, { primaryPath: ALL_STAGES.find((stage) => stage.id === stageId)?.pathway ?? "small-claims", confidence: 1 })?.sentenceRules ?? [] : [];
    const gross = shown.filter((entry) => /liable only for gross negligence/.test(entry.sentence));
    check(
      "SW: each 'liable only for gross negligence' sentence shows Municipal Act s. 44 (9) or City of Toronto Act s. 42 (5), quoted, with a date",
      gross.length >= 2 &&
        gross.every((entry) => entry.rules.length > 0 && entry.rules.every((rule) => /^s\. (?:44 \(9\)|42 \(5\))$/.test(rule.pinpoint) && /gross negligence/.test(rule.quote) && /^\d{4}-\d{2}-\d{2}$/.test(rule.checkedOn))),
      gross.map((entry) => `${entry.sentence} -> ${entry.rules.map((rule) => rule.pinpoint).join(", ")}`).join(" | "),
    );
  }
}

// ---------------------------------------------------------------------------

console.log("");
console.log("PUBLISHED LIBRARY");
console.log("");
console.log(`  run ${PUBLISHED_RELEASE.runId || "(none)"}, model ${PUBLISHED_RELEASE.model || "(none)"}`);
console.log(`  promoted ${PUBLISHED_RELEASE.promotedAt?.slice(0, 10) || "(never)"}, ` +
  `corpus ${PUBLISHED_RELEASE.corpusGeneratedAt?.slice(0, 10) || "(none)"}`);
console.log(`  ${PUBLISHED_BLOCKS.length} block(s), hash ${PUBLISHED_RELEASE.contentHash || "(none)"}`);
console.log(`  ${passed} check(s) passed`);
if (nothingPromoted) {
  console.log("");
  console.log("  Nothing promoted yet. Run a pipeline pass, then:");
  console.log("    npm run content:promote -- docs/content-pipeline/candidates/<run>.json --confirm");
}
console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  console.log("");
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}
