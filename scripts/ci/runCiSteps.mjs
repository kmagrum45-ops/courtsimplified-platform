#!/usr/bin/env node
/**
 * RUN CI'S MAIN JOB, STEP BY STEP, AS THE WORKFLOW FILE WRITES IT (inside the ci:local container).
 *
 * WHAT IT DOES. Reads .github/workflows/courtsimplified-ci.yml, takes the job `typecheck-and-build`, and
 * runs every `run:` step in order with bash -e (GitHub's default shell), the job's own `env:` (a secret
 * comes from this process's environment, which ciLocal.sh fills from the LOCAL Supabase stack only), and
 * GITHUB_OUTPUT pointed at a scratch file. Unlike CI it does not stop at the first failure: every step
 * runs, so one run reports everything. Results: <out>/steps.json and <out>/summary.txt, one log per step.
 *
 * WHAT IT SKIPS, AND WHY (`skippedReason`). A `uses:` step (checkout, setup-node, cache) is done by the
 * container itself. A step with an `if:` is skipped only when that `if:` is about the billed OpenAI suite
 * (OPENAI_API_KEY, the spend or credit check, the safety-pass cache): ci:local never spends OpenAI money.
 * Any other `if:` makes planSteps throw, so a new conditional step is decided on, never silently skipped.
 * test:ci-local (scripts/verification/verifyCiLocal.ts) checks this plan against the workflow file.
 *
 * Usage (inside the container, from the repo root): node scripts/ci/runCiSteps.mjs <out-dir>
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

export const JOB = "typecheck-and-build";
const OPENAI_IF = /OPENAI_API_KEY|steps\.(safety-passed|spend|credit)\./;

/** Why a step is not run here, or null when it is run. Throws on a conditional step nobody has decided on. */
export function skippedReason(step) {
  if (step.uses) return `done by the container (${step.uses})`;
  if (step.if) {
    if (OPENAI_IF.test(step.if)) return "billed OpenAI suite: ci:local never spends OpenAI money";
    throw new Error(`ci:local has no rule for the conditional step "${step.name}" (if: ${step.if}); add one to runCiSteps.mjs`);
  }
  if (!step.run) throw new Error(`step "${step.name}" has neither run nor uses`);
  return null;
}

/** The job's steps, each with its run or its reason for not running. */
export function planSteps(workflowText) {
  const job = YAML.parse(workflowText).jobs?.[JOB];
  if (!job) throw new Error(`no job ${JOB}`);
  return job.steps.map((step, index) => ({ index, name: step.name ?? step.uses ?? `step ${index}`, run: step.run ?? null, skipped: skippedReason(step), continueOnError: step["continue-on-error"] === true }));
}

/** The job's env with each `${{ secrets.X }}` (or any expression) taken from this process's environment under the same key. */
export function jobEnv(workflowText, from = process.env) {
  const job = YAML.parse(workflowText).jobs[JOB];
  const out = {};
  for (const [key, value] of Object.entries(job.env ?? {})) out[key] = /\$\{\{/.test(String(value)) ? (from[key] ?? "") : String(value);
  return out;
}

function main() {
  const out = path.resolve(process.argv[2] ?? "ci-local-out");
  mkdirSync(path.join(out, "logs"), { recursive: true });
  const text = readFileSync(".github/workflows/courtsimplified-ci.yml", "utf8");
  const env = { ...process.env, ...jobEnv(text), CI: "true", GITHUB_ACTIONS: "", GITHUB_OUTPUT: path.join(out, "github-output.txt") };
  const results = [];
  for (const step of planSteps(text)) {
    if (step.skipped) { results.push({ ...step, status: "skipped" }); continue; }
    const log = path.join(out, "logs", `${String(step.index).padStart(3, "0")}.log`);
    const started = Date.now();
    const run = spawnSync("bash", ["--noprofile", "--norc", "-e", "-c", step.run], { env, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    writeFileSync(log, `$ ${step.run}\n${output}`);
    const status = run.status === 0 ? "pass" : step.continueOnError ? "fail (continue-on-error)" : "fail";
    const firstError = status === "pass" ? null : (output.split("\n").find((line) => /^(FAIL|fail|Error|error|✗)|\berror TS\d+/.test(line.trim())) ?? output.trim().split("\n").slice(-1)[0] ?? "").slice(0, 300);
    results.push({ ...step, status, seconds: Math.round((Date.now() - started) / 1000), log: path.relative(out, log), firstError });
    appendFileSync(path.join(out, "progress.txt"), `${status.padEnd(5)} ${step.name}\n`);
  }
  writeFileSync(path.join(out, "steps.json"), JSON.stringify(results, null, 1));
  const failed = results.filter((r) => r.status === "fail");
  const lines = [
    `ci:local: ${results.filter((r) => r.status === "pass").length} passed, ${failed.length} failed, ${results.filter((r) => r.status === "skipped").length} skipped`,
    ...failed.map((r) => `FAIL  ${r.name}\n      ${r.firstError}\n      log: ${r.log}`),
    ...results.filter((r) => r.status === "skipped" && !/container/.test(r.skipped)).map((r) => `skip  ${r.name}: ${r.skipped}`),
  ];
  writeFileSync(path.join(out, "summary.txt"), `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
  process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
