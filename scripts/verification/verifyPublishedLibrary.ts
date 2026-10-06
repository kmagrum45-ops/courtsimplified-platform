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
