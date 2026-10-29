/**
 * THE STORY PACK'S PARTS RUN EXACTLY THE WHOLE PACK, EACH TEST ONCE (site owner, 2026-10-29).
 *
 * CI shares the story pack across machines (courtsimplified-story-pack.yml: a matrix of parts,
 * each `--fully-parallel --shard=<part>/<parts>`). Checks, as properties:
 *   - the parts the workflow lists are 1..N, and every part runs `--shard=<part>/N` with that N;
 *   - `--fully-parallel` is passed (without it Playwright shards by FILE, and the pack is one
 *     file: one part would get every test and the others none);
 *   - Playwright's own lists of the N parts, put together, are exactly its list of the whole pack:
 *     the same count and the same test names, no test in two parts, none left out;
 *   - each part gets some tests (no empty machine).
 *
 * Failure it exists to catch: a split that silently drops, doubles or bunches tests, so a story
 * stops being run, or one part runs the whole pack and hits the time limit (#488, 26 Oct: split by
 * file, the first part got all 152 tests and was cancelled at 90 min). Nothing a test asserts is
 * touched by the split; this suite is what shows it.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SPEC = "tests/browser/story-pack.spec.ts";

const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/courtsimplified-story-pack.yml"), "utf8");
const parts = (workflow.match(/^\s+part:\s*\[([^\]]*)\]/m)?.[1] ?? "").split(",").map((item) => Number(item.trim())).filter(Number.isFinite);
const shard = workflow.match(/--shard=\$\{\{ matrix\.part \}\}\/(\d+)/);
const total = shard ? Number(shard[1]) : 0;
check("the workflow's parts are 1..N", parts.length > 0 && parts.every((part, index) => part === index + 1), JSON.stringify(parts));
check("every part runs --shard=<part>/N with N the number of parts", total === parts.length, `shard total ${total}, parts ${parts.length}`);
check("the parts split by test (--fully-parallel)", /npm run test:story-pack -- [^\n]*--fully-parallel/.test(workflow));

/** Playwright's own list of tests, as "file > title" lines. */
function listed(extra: string[], fullyParallel = true): string[] {
  const run = spawnSync("npx", ["playwright", "test", SPEC, "--list", "--fully-parallel", ...extra], { cwd: ROOT, encoding: "utf8", shell: true, env: { ...process.env, PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100" } });
  if (run.status !== 0) throw new Error(`playwright --list failed: ${(run.stderr || run.stdout).slice(0, 400)}`);
  // Lines look like "  [chromium] › tests/browser/story-pack.spec.ts:467:9 › sc-deck-owed (questions)";
  // the line:column is dropped so a test is known by its file and title.
  return run.stdout.split(/\r?\n/).filter((line) => line.includes("›")).map((line) => line.trim().replace(/:\d+:\d+/, ""));
}

// The whole pack exactly as one job runs it today: no split, no --fully-parallel.
const whole = listed([], false);
const byPart = (total > 0 ? parts : [1]).map((part) => listed([`--shard=${part}/${Math.max(total, 1)}`], /--fully-parallel --shard/.test(workflow)));
const together = byPart.flat();
const doubled = together.filter((name, index) => together.indexOf(name) !== index);
const missing = whole.filter((name) => !together.includes(name));
const extra = together.filter((name) => !whole.includes(name));
console.log(`whole pack: ${whole.length} tests; parts: ${byPart.map((list) => list.length).join(" + ")} = ${together.length}`);
check("the parts together list the same number of tests as the whole pack", together.length === whole.length && whole.length > 0, `${together.length} vs ${whole.length}`);
check("no test is in two parts", doubled.length === 0, doubled.slice(0, 5).join("; "));
check("no test is left out, and none is added", missing.length === 0 && extra.length === 0, [...missing.slice(0, 3), ...extra.slice(0, 3)].join("; "));
check("every part gets some tests", byPart.every((list) => list.length > 0), byPart.map((list) => list.length).join(", "));

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
