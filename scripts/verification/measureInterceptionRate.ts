/**
 * Interception-rate measurement harness.
 *
 * WHY THIS EXISTS. Part 2(a) established that a single run cannot measure
 * the rate at which the model generates prohibited case-strength language:
 * two runs of identical stories, with no prompt change between them,
 * produced 4 interceptions then 2, with NO overlap in which journeys were
 * caught. So any before/after comparison from single runs is noise.
 *
 * This runs the same journey set N times and reports a DISTRIBUTION —
 * per-run totals, per-field and per-term breakdowns, and which journeys
 * were caught — so a prompt change can be judged against the variance
 * rather than against one number.
 *
 * Reuses fixtures/pipelineRunner.ts and the JOURNEYS from
 * runJourneyBattery.ts. No parallel harness, and it deliberately does NOT
 * write the per-journey files the battery writes — this measures, it does
 * not capture output.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/verification/measureInterceptionRate.ts --runs=5 --label=before
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runStoryThroughPipeline } from "./fixtures/pipelineRunner";
import { JOURNEYS } from "./runJourneyBattery";
import {
  setInterceptionContext,
  getInterceptions,
  clearInterceptions,
  type SanitizerInterception,
} from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "scripts", "verification", "fixtures", "journeyBattery");

type RunResult = {
  runIndex: number;
  total: number;
  interceptions: SanitizerInterception[];
};

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function tally<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function stats(values: number[]): { min: number; max: number; mean: number; spread: number } {
  if (!values.length) return { min: 0, max: 0, mean: 0, spread: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, mean, spread: max - min };
}

async function main() {
  const runs = Number(arg("runs", "5"));
  const label = arg("label", "unlabelled");
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.OPENAI_API_KEY;

  const perRunCost = (0.08 / 19) * JOURNEYS.length;
  console.log(`Interception-rate measurement — label "${label}"`);
  console.log(`Journeys per run: ${JOURNEYS.length}`);
  console.log(`Runs: ${runs}`);
  console.log(`Estimated cost: $${(perRunCost * runs).toFixed(3)}\n`);

  if (dryRun) {
    console.log("--dry-run: stopping before any billed call.");
    return;
  }
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  const results: RunResult[] = [];

  for (let r = 1; r <= runs; r += 1) {
    process.stdout.write(`  run ${r}/${runs} `);
    const caught: SanitizerInterception[] = [];

    for (const j of JOURNEYS) {
      clearInterceptions();
      setInterceptionContext(j.id);
      try {
        await runStoryThroughPipeline(j, apiKey);
      } catch (error) {
        // A journey that throws still tells us nothing was intercepted in
        // it; recording the failure beats aborting the whole measurement.
        console.warn(`\n    journey ${j.id} threw: ${(error as Error).message.slice(0, 120)}`);
      }
      caught.push(...getInterceptions());
      process.stdout.write(".");
    }

    results.push({ runIndex: r, total: caught.length, interceptions: caught });
    console.log(` ${caught.length} interception(s)`);
  }

  // ---- report ----
  const totals = results.map((r) => r.total);
  const s = stats(totals);
  const all = results.flatMap((r) => r.interceptions);

  const lines: string[] = [];
  lines.push(`# Interception rate — "${label}"`, "");
  lines.push(`Run at ${new Date().toISOString()}`, "");
  lines.push(`- Journeys per run: **${JOURNEYS.length}**`);
  lines.push(`- Runs: **${runs}**`);
  lines.push(`- Totals per run: **${totals.join(", ")}**`);
  lines.push(`- min ${s.min} / max ${s.max} / mean ${s.mean.toFixed(2)} / spread ${s.spread}`);
  lines.push(`- Grand total: **${all.length}** across ${runs * JOURNEYS.length} journey-runs`, "");

  lines.push("## By matched term", "");
  lines.push("| Term | Count |", "|---|---|");
  for (const [k, v] of [...tally(all, (i) => i.matchedTerm).entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${k}\` | ${v} |`);
  }
  lines.push("");

  lines.push("## By field", "");
  lines.push("| Field | Count |", "|---|---|");
  for (const [k, v] of [...tally(all, (i) => i.field).entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${k}\` | ${v} |`);
  }
  lines.push("");

  lines.push("## By journey", "");
  lines.push("| Journey | Times caught (of " + runs + " runs) |", "|---|---|");
  for (const [k, v] of [...tally(all, (i) => i.context).entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");

  lines.push("## Per run", "");
  for (const r of results) {
    lines.push(`### Run ${r.runIndex} — ${r.total}`, "");
    if (!r.interceptions.length) lines.push("_None._", "");
    for (const i of r.interceptions) {
      lines.push(`- **${i.context}** ${i.kind} \`${i.field}\` matched "${i.matchedTerm}"\n  > ${i.text.replace(/\n/g, " ").slice(0, 240)}`);
    }
    lines.push("");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `_RATE_${label}.md`);
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");

  console.log(`\nTotals: ${totals.join(", ")}  (min ${s.min}, max ${s.max}, mean ${s.mean.toFixed(2)}, spread ${s.spread})`);
  console.log(`Wrote ${path.relative(REPO_ROOT, out)}`);
}

// Entrypoint guard — runFullClaimTypeSurvey.ts lacked one and importing it
// silently re-ran 19 billed journeys. This script bills considerably more.
const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
