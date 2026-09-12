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
import {
  PIPELINE_JOURNEY_TIMEOUT_MS,
  withTimeout,
  describeRunDegradation,
  abortIfRateLimited,
  RateLimitAbort,
} from "./pipelineGuards";
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
  /** Journeys that threw, timed out, or completed in a degraded state. */
  failures: { id: string; reason: string }[];
};

// The per-journey ceiling, the timeout wrapper, and the silent-degradation
// check now live in pipelineGuards.ts, shared with runFixtures.ts so the two
// harnesses cannot drift apart on what counts as a failed run.

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
    const failures: { id: string; reason: string }[] = [];

    for (const j of JOURNEYS) {
      clearInterceptions();
      setInterceptionContext(j.id);
      try {
        const run = await withTimeout(
          runStoryThroughPipeline(j, apiKey),
          PIPELINE_JOURNEY_TIMEOUT_MS,
        );
        // A 429 inside the brain's cognition call does not throw — it falls
        // back to canned text and the journey "succeeds". Counting that as a
        // clean journey is the same downward bias as swallowing a throw.
        const degraded = describeRunDegradation(run);
        if (degraded) throw new Error(degraded);
      } catch (error) {
        // Stop the entire measurement on the first 429 rather than recording
        // it as one more failed journey. Continuing spends quota on journeys
        // that cannot succeed, and every one of them would score zero
        // interceptions — indistinguishable from a clean run.
        abortIfRateLimited(error, `journey ${j.id}`);
        // A failed journey produces ZERO interceptions, which is
        // indistinguishable from a clean one in the totals. Silently
        // absorbing it biases the measured rate DOWNWARD — exactly the way a
        // prompt change is supposed to look when it works. So failures are
        // counted, and a run with any failure is not reportable (below).
        const reason = (error as Error).message.slice(0, 160);
        failures.push({ id: j.id, reason });
        console.warn(`\n    journey ${j.id} FAILED: ${reason}`);
      }
      caught.push(...getInterceptions());
      process.stdout.write(failures.some((f) => f.id === j.id) ? "x" : ".");
    }

    results.push({ runIndex: r, total: caught.length, interceptions: caught, failures });
    console.log(` ${caught.length} interception(s)${failures.length ? `, ${failures.length} FAILED journey(s)` : ""}`);

    // Stop early rather than burn the remaining quota producing more
    // unusable runs. A daily-cap 429 does not clear within a run.
    if (failures.length) {
      console.error(
        `\n  Run ${r} had ${failures.length} failed journey(s). Aborting the measurement —` +
          ` a partial run cannot be compared against a complete one.`,
      );
      break;
    }
  }

  // ---- report ----
  const totals = results.map((r) => r.total);
  const s = stats(totals);
  const all = results.flatMap((r) => r.interceptions);

  const totalFailures = results.reduce((n, r) => n + r.failures.length, 0);
  const complete = results.filter((r) => r.failures.length === 0);

  const lines: string[] = [];
  lines.push(`# Interception rate — "${label}"`, "");
  lines.push(`Run at ${new Date().toISOString()}`, "");

  if (totalFailures > 0) {
    lines.push(
      "",
      "> **NOT A VALID MEASUREMENT.**",
      `> ${totalFailures} journey(s) failed across ${results.length} attempted run(s), and`,
      "> only " + complete.length + " run(s) completed. A failed journey records zero",
      "> interceptions, which is indistinguishable from a clean one, so the totals",
      "> below UNDERSTATE the true rate by an unknown amount. Do not compare these",
      "> figures against another block.",
      "",
      "Failed journeys:",
      "",
    );
    for (const r of results) {
      for (const f of r.failures) lines.push(`- run ${r.runIndex} — \`${f.id}\`: ${f.reason}`);
    }
    lines.push("");
  }
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
if (isDirect) {
  void main().catch((error: unknown) => {
    if (error instanceof RateLimitAbort) {
      console.error(`\n${"!".repeat(70)}\n${error.message}\n${"!".repeat(70)}`);
      console.error("No report was written. The daily quota does not clear within a run.");
    } else {
      console.error("Measurement threw:", error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  });
}
