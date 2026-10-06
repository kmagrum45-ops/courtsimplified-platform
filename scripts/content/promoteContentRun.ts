/**
 * Promotes a candidate run to the published set.
 *
 *   npm run content:promote -- docs/content-pipeline/candidates/run-1.json
 *   npm run content:promote -- <file> --dry-run
 *
 * *** WHAT PROMOTION IS ***
 *
 * A pipeline run produces a CANDIDATE. Nobody is served a candidate. Promotion
 * is the deliberate act of saying "this particular run, drafted by this model
 * on this date against this corpus, is what the product serves" — and it is
 * refused unless every block that would be published passes every gate.
 *
 * *** WHY IT IS ALL-OR-NOTHING ***
 *
 * A promotion that published the blocks that passed and skipped the ones that
 * did not would quietly change what the product covers, run to run, with no
 * decision recorded anywhere. A user would find guidance for their stage one
 * week and a blank the next.
 *
 * So: if any publishable block fails a gate, NOTHING is promoted and the
 * failures are printed. Fix them, re-run the pipeline, promote again.
 *
 * `needs-human` blocks are not failures — they are excluded from the published
 * set by design, and the summary says how many were left behind.
 *
 * *** WHY IT REFUSES TO OVERWRITE SILENTLY ***
 *
 * Replacing the published set changes the legal content a real person reads.
 * The script prints what changes and requires `--confirm`, the same shape as
 * scripts/db/applyMigrations.ts, because both are "this affects users" actions
 * that should not happen as a side effect of someone exploring.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

import { gateFailures, isPublishable } from "./blockGates";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import type { StageAnswer } from "../../src/lib/content-library/stageAnswers";
import { hashBlocks, PUBLISHED_RELEASE } from "../../src/lib/content-library/publishedLibrary";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PUBLISHED = path.join(
  ROOT,
  "src",
  "lib",
  "content-library",
  "published",
  "stageAnswers.published.json",
);
const MANIFEST = path.join(ROOT, "docs", "sources", "corpus", "manifest.json");

function main(): void {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  const confirm = args.includes("--confirm");
  // Who drafted the run. Defaults to the pipeline's model; a run drafted another
  // way (2026-10-01: authored and independently reviewed in agent rounds) says so,
  // because the release record is what a regulator reads.
  const model = args.find((arg) => arg.startsWith("--model="))?.slice("--model=".length) || "gpt-4o-mini";

  if (!file) {
    console.error("Usage: npm run content:promote -- <candidate.json> [--model=<who drafted it>] [--confirm]");
    process.exitCode = 1;
    return;
  }

  const candidatePath = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!existsSync(candidatePath)) {
    console.error(`No such candidate: ${file}`);
    process.exitCode = 1;
    return;
  }

  const blocks = JSON.parse(readFileSync(candidatePath, "utf8")) as StageAnswer[];
  // Every court's steps (2026-10-06): civil and family answers are published
  // through the same gate as Small Claims.
  const stages = new Map(ALL_STAGES.map((stage) => [stage.id, stage]));

  const publishable = blocks.filter(isPublishable);
  const withheld = blocks.filter((block) => !isPublishable(block));

  console.log("");
  console.log(`CANDIDATE  ${path.relative(ROOT, candidatePath)}`);
  console.log("");
  console.log(`  ${blocks.length} block(s): ${publishable.length} publishable, ${withheld.length} withheld`);
  console.log("");

  // ---- every publishable block, every gate, against the corpus as it is now

  const failures: Array<{ id: string; reasons: string[] }> = [];
  for (const block of publishable) {
    const reasons = gateFailures(block, stages.get(block.stageId));
    if (reasons.length > 0) failures.push({ id: block.id, reasons });
  }

  if (failures.length > 0) {
    console.log(`  ${failures.length} block(s) FAILED the gates. Nothing promoted.`);
    console.log("");
    for (const failure of failures) {
      console.log(`  ${failure.id}`);
      for (const reason of failure.reasons) console.log(`      ${reason}`);
    }
    console.log("");
    console.log("  Promotion is all-or-nothing: publishing only the blocks that passed");
    console.log("  would change what the product covers with no decision recorded.");
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log(`  All ${publishable.length} publishable block(s) passed every gate.`);

  // ---- what would change -------------------------------------------------

  const contentHash = hashBlocks(publishable);
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { generatedAt: string };

  const currentIds = new Set<string>();
  if (existsSync(PUBLISHED)) {
    const current = JSON.parse(readFileSync(PUBLISHED, "utf8")) as { blocks?: StageAnswer[] };
    for (const block of current.blocks ?? []) currentIds.add(block.stageId);
  }

  const added = publishable.filter((block) => !currentIds.has(block.stageId));
  const removed = [...currentIds].filter(
    (stageId) => !publishable.some((block) => block.stageId === stageId),
  );

  console.log("");
  console.log(`  currently published: ${PUBLISHED_RELEASE.blockCount} block(s), hash ${PUBLISHED_RELEASE.contentHash}`);
  console.log(`  would publish:       ${publishable.length} block(s), hash ${contentHash}`);
  if (added.length > 0) console.log(`  ADDED:   ${added.map((block) => block.stageId).join(", ")}`);
  if (removed.length > 0) {
    console.log(`  REMOVED: ${removed.join(", ")}`);
    console.log("           — a user at that stage will stop seeing guidance.");
  }
  console.log("");

  if (!confirm) {
    console.log("  Nothing written. Re-run with --confirm to promote.");
    console.log("");
    return;
  }

  const release = {
    runId: path.basename(candidatePath, ".json"),
    model,
    promotedAt: new Date().toISOString(),
    corpusGeneratedAt: manifest.generatedAt,
    blockCount: publishable.length,
    contentHash,
  };

  mkdirSync(path.dirname(PUBLISHED), { recursive: true });
  writeFileSync(PUBLISHED, `${JSON.stringify({ release, blocks: publishable }, null, 2)}\n`);

  console.log(`  PROMOTED. ${publishable.length} block(s) written to`);
  console.log(`  ${path.relative(ROOT, PUBLISHED)}`);
  console.log("");
  console.log("  Commit it. The published set is part of the repository, not a build artefact —");
  console.log("  a regulator asking what the product said on a date reads it from git history.");
  console.log("");
}

main();
