/**
 * EVERY ASK-ONCE STORY RUNS IN EXACTLY ONE SHARD (site owner, 18 Nov 2026).
 *
 * courtsimplified-ask-once.yml runs the page-level ask-once test (tests/browser/ask-once-pages.spec.ts) as parallel
 * shards (job ask-once-shard), each with its own list of stories, balanced by measured CI time. Two jobs of one court
 * each were cancelled at their 60-minute limit on #550 (eb3cc085), with no failure, once the real-AI readings were
 * added. The single job named ask-once waits for the shards and passes only when all of them passed.
 *
 * What it checks:
 *   1. the shards are numbered 1..N and the job named ask-once needs them and passes only on "success";
 *   2. every story the spec has (Playwright's own --list) is in exactly one shard, and every story a shard names exists;
 *   3. the workflow builds each shard's grep through scripts/browser/askOnceGrep.mjs, and Playwright, given each
 *      shard's grep, lists exactly that shard's stories' tests (each reading included); the shards together list
 *      every test of the spec once;
 *   4. self-tests: a planted story in no shard, one in two, a shard naming a story that does not exist, and a grep
 *      taking a story whose name only starts the same, each fail.
 *
 * What failure it catches: a story (or a recorded reading) that silently stops running in CI, or runs twice, after
 * the split; or a shard that grows past its limit unnoticed because a new story landed in it by a loose grep.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parse } from "yaml";
import { askOnceGrep } from "../browser/askOnceGrep.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SPEC = "tests/browser/ask-once-pages.spec.ts";
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

/** A test's story: its title after "--", without " (reading r1)" or " (every court)". */
const storyOf = (title: string) => title.replace(/^.*ask once on every page -- /, "").replace(/ \(.*\)$/, "").trim();

/** The problems with a split: every story in exactly one shard; every story a shard names exists. */
export function shardProblems(stories: string[], shards: string[][]): string[] {
  const problems: string[] = [];
  const count = new Map<string, number>();
  for (const shard of shards) for (const story of shard) count.set(story, (count.get(story) ?? 0) + 1);
  for (const story of stories) {
    const n = count.get(story) ?? 0;
    if (n === 0) problems.push(`in no shard: ${story}`);
    if (n > 1) problems.push(`in more than one shard (${n}): ${story}`);
  }
  for (const story of count.keys()) if (!stories.includes(story)) problems.push(`named in a shard but the spec has no such story: ${story}`);
  return problems;
}

/** Playwright's own list of the spec's tests (titles), optionally narrowed by a grep. */
function listed(grep?: string): string[] {
  // Node runs Playwright's own command line with no shell between, so the grep reaches it exactly as the workflow's does.
  const args = [createRequire(import.meta.url).resolve("@playwright/test/cli"), "test", SPEC, "--list", ...(grep ? ["--grep", grep] : [])];
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100" } });
  if (run.status !== 0 && !/No tests found/i.test(`${run.stdout}${run.stderr}`)) throw new Error(`playwright --list failed: ${(run.stderr || run.stdout).slice(0, 400)}`);
  return run.stdout.split(/\r?\n/).filter((line) => line.includes("ask once on every page --")).map((line) => line.replace(/^.*ask once on every page -- /, "ask once on every page -- ").trim());
}

// ---- 4. Self-tests first: the checker must catch each planted fault ----------------------------------------------
check("planted: a story in no shard fails", shardProblems(["a", "b"], [["a"]]).some((p) => p.startsWith("in no shard: b")));
check("planted: a story in two shards fails", shardProblems(["a", "b"], [["a", "b"], ["b"]]).some((p) => p.startsWith("in more than one shard (2): b")));
check("planted: a shard naming a missing story fails", shardProblems(["a"], [["a", "ghost"]]).some((p) => p.includes("no such story: ghost")));
check("a correct split has no problems", shardProblems(["a", "b"], [["a"], ["b"]]).length === 0);
const grep = new RegExp(askOnceGrep(["sc-slip-and-fall"]));
check("planted: the grep for a story never takes one whose name only starts the same",
  grep.test("ask once on every page -- sc-slip-and-fall") && !grep.test("ask once on every page -- sc-slip-and-fall-changed"));
check("the grep for a story takes each of its readings", new RegExp(askOnceGrep(["sc-chrome2-s1-fall"])).test("ask once on every page -- sc-chrome2-s1-fall (reading r2)"));

// ---- 1. The workflow's shape --------------------------------------------------------------------------------------
const workflowText = readFileSync(path.join(ROOT, ".github", "workflows", "courtsimplified-ask-once.yml"), "utf8");
const workflow = parse(workflowText);
const shardJob = workflow.jobs?.["ask-once-shard"];
const include: { shard: number; stories: string }[] = shardJob?.strategy?.matrix?.include ?? [];
const shards = include.map((entry) => String(entry.stories ?? "").split(/\s+/).filter(Boolean));
check("the workflow has a job ask-once-shard with a matrix of shards", include.length > 1, `${include.length} shard(s)`);
check("the shards are numbered 1..N", include.length > 0 && include.every((entry, index) => entry.shard === index + 1), JSON.stringify(include.map((entry) => entry.shard)));
check("each shard has a 60-minute limit at most", Number(shardJob?.["timeout-minutes"]) > 0 && Number(shardJob?.["timeout-minutes"]) <= 60, String(shardJob?.["timeout-minutes"]));
const gate = workflow.jobs?.["ask-once"];
const needs = [gate?.needs].flat();
const gateRuns = (gate?.steps ?? []).map((step: { run?: string }) => step.run ?? "").join("\n");
check("the job named ask-once needs the shards", gate?.name === "ask-once" && needs.includes("ask-once-shard"), JSON.stringify({ name: gate?.name, needs }));
check("the job named ask-once runs even when a shard fails, and passes only on success",
  /always\(\)/.test(String(gate?.if ?? "")) && /needs\.ask-once-shard\.result \}\}" = "success"/.test(gateRuns), String(gate?.if));
const runText = (shardJob?.steps ?? []).map((step: { run?: string }) => step.run ?? "").join("\n");
check("each shard's grep is built by scripts/browser/askOnceGrep.mjs from its stories",
  /CARRY_GREP="\$\(node scripts\/browser\/askOnceGrep\.mjs \$\{\{ matrix\.stories \}\}\)"/.test(runText) && /CARRY_SPEC:\s*tests\/browser\/ask-once-pages\.spec\.ts/.test(workflowText));

// ---- 2. Every story in exactly one shard ------------------------------------------------------------------------
const whole = listed();
const stories = [...new Set(whole.map(storyOf))];
const problems = shardProblems(stories, shards);
console.log(`spec: ${whole.length} tests, ${stories.length} stories; shards: ${shards.map((list) => list.length).join(" + ")} stories`);
check("every story is in exactly one shard, and every story named exists", problems.length === 0, problems.join("; "));

// ---- 3. Playwright, given each shard's grep, lists exactly that shard's tests -------------------------------------
const byShard = shards.map((list) => (list.length ? listed(askOnceGrep(list)) : []));
for (const [index, tests] of byShard.entries()) {
  const own = whole.filter((title) => shards[index].includes(storyOf(title)));
  const wrong = tests.filter((title) => !shards[index].includes(storyOf(title)));
  check(`shard ${index + 1}: its grep lists exactly its stories' tests (${tests.length})`, wrong.length === 0 && tests.length === own.length && tests.length > 0,
    `${tests.length} listed, ${own.length} expected; not its own: ${wrong.slice(0, 3).join("; ")}`);
}
const together = byShard.flat();
const doubled = together.filter((title, index) => together.indexOf(title) !== index);
const missing = whole.filter((title) => !together.includes(title));
check("the shards together list every test of the spec once", together.length === whole.length && doubled.length === 0 && missing.length === 0,
  `${together.length} vs ${whole.length}; doubled ${doubled.slice(0, 3).join("; ")}; missing ${missing.slice(0, 3).join("; ")}`);

console.log(failed ? `\n${failed} failure(s)` : "\nAll ask-once shard checks passed.");
process.exitCode = failed ? 1 : 0;
