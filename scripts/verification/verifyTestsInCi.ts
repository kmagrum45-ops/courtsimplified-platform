/**
 * EVERY TEST FILE IS RUN BY CI, OR SAYS WHY NOT (site owner, 6 Nov 2026).
 *
 * Found 6 Nov: fact-two-tabs.spec.ts (added in #543) failed on main and nobody knew, because no workflow ran it; three
 * terminal suites added in #544 were missing from CI's list the same way. An audit that day found 108 test files no
 * workflow run on a pull request. This check makes that impossible to repeat silently.
 *
 * A test file is a browser spec (tests/browser/*.spec.ts) or a file a `test:` script in package.json runs. It is
 * "in CI" when a workflow that runs by itself (on pull requests, pushes or a schedule) names it (its path or file name,
 * outside comments), or runs a package script that runs it (following `npm run` inside scripts, and reading the runner
 * files under scripts/browser/ those scripts start, such as storyPack.mjs). A manual-only workflow does not count: a
 * test only it runs goes on the list, naming that workflow as the reason. Otherwise it must be on
 * scripts/verification/notInCi.json with a reason. The check fails when:
 *   1. a test file is in neither (a new test nobody wired up);
 *   2. a listed file is now in CI, or no longer exists (a stale entry: delete it -- a one-line change with an obvious
 *      cause, so the work of wiring a test up is never punished);
 *   3. a listed reason is empty or too short to say why.
 * Self-tests plant each of these in synthetic inputs, so the check cannot pass by finding nothing.
 *
 * WHAT FAILURE THIS CATCHES: a test that exists, is believed to guard something, and never runs.
 *
 * Run: npm run test:tests-in-ci
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename } from "node:path";

type Workflow = { name: string; text: string };
type Entry = { file: string; reason: string };
type Inputs = { files: string[]; scripts: Record<string, string>; workflows: Workflow[]; listed: Entry[] };

const RUNS = /npm run (?:-s |--silent )?([\w:.-]+)/g;
const FILE = /(?:^|[\s"'=])((?:scripts|tests|src)\/[\w./[\]-]+\.(?:ts|mjs|cjs|js))/g;

/** The workflow's text without comment lines (a comment naming a spec does not run it). */
const code = (text: string) => text.split(/\r?\n/).filter((line) => !/^\s*#/.test(line)).join("\n");

/** Whether the workflow runs by itself: on pull requests, pushes or a schedule (never a manual-only one). */
export function runsOnPrOrPush(text: string): boolean {
  const lines = code(text).split("\n");
  const start = lines.findIndex((line) => /^(on|"on"|'on'):/.test(line));
  if (start < 0) return false;
  const inline = lines[start].replace(/^[^:]+:/, "");
  if (/\b(pull_request|push|schedule)\b/.test(inline)) return true;
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    if (/^\s+(pull_request|pull_request_target|push|schedule)\s*:?/.test(line)) return true;
  }
  return false;
}

/** The package scripts a script runs, itself included (following npm run inside scripts). */
function closure(name: string, scripts: Record<string, string>, seen = new Set<string>()): Set<string> {
  if (seen.has(name) || !(name in scripts)) return seen;
  seen.add(name);
  for (const m of scripts[name].matchAll(RUNS)) closure(m[1], scripts, seen);
  return seen;
}

export function testFiles(files: string[], scripts: Record<string, string>): string[] {
  const out = new Set(files.filter((f) => /^tests\/browser\/.*\.spec\.ts$/.test(f)));
  const known = new Set(files);
  for (const [name, command] of Object.entries(scripts)) {
    if (!name.startsWith("test:")) continue;
    for (const m of command.matchAll(FILE)) if (known.has(m[1])) out.add(m[1]);
  }
  return [...out].sort();
}

export function inCi(input: Inputs, read: (file: string) => string = () => ""): Set<string> {
  const ci = input.workflows.filter((w) => runsOnPrOrPush(w.text));
  const ran = new Set<string>();
  let text = "";
  for (const w of ci) {
    const body = code(w.text);
    text += "\n" + body;
    for (const m of body.matchAll(RUNS)) for (const s of closure(m[1], input.scripts)) ran.add(s);
  }
  const commands = [...ran].map((s) => input.scripts[s]).join("\n");
  // A runner a script starts (scripts/browser/*.mjs) names the spec it runs.
  const runners = [...commands.matchAll(FILE)].map((m) => m[1]).filter((f) => f.startsWith("scripts/browser/")).map((f) => code(read(f))).join("\n");
  const runText = text + "\n" + commands + "\n" + runners;
  return new Set(testFiles(input.files, input.scripts).filter((f) => runText.includes(f) || new RegExp(`(^|[\\s/"'])${basename(f).replace(/[.[\]]/g, "\\$&")}`, "m").test(runText)));
}

export function problems(input: Inputs, read?: (file: string) => string): string[] {
  const tests = testFiles(input.files, input.scripts);
  const ci = inCi(input, read);
  const listed = new Map(input.listed.map((e) => [e.file, e.reason]));
  const out: string[] = [];
  for (const f of tests) if (!ci.has(f) && !listed.has(f)) out.push(`not in CI and not listed: ${f} (add it to a workflow, or to notInCi.json with the reason)`);
  for (const [f, reason] of listed) {
    if (!input.files.includes(f)) out.push(`listed but no longer exists: ${f} (delete its entry)`);
    else if (ci.has(f)) out.push(`listed but now run by CI: ${f} (delete its entry)`);
    if (!reason || reason.trim().length < 20) out.push(`listed with no real reason: ${f}`);
  }
  const seen = new Set<string>();
  for (const e of input.listed) { if (seen.has(e.file)) out.push(`listed twice: ${e.file}`); seen.add(e.file); }
  return out;
}

function repoInputs(): Inputs {
  // Untracked files too (not ignored), so a new spec is found before it is committed.
  const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean).filter((f) => existsSync(f));
  const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
  const workflows = readdirSync(".github/workflows").filter((f) => /\.ya?ml$/.test(f)).map((f) => ({ name: f, text: readFileSync(`.github/workflows/${f}`, "utf8") }));
  const listed = (JSON.parse(readFileSync("scripts/verification/notInCi.json", "utf8")) as { entries: Entry[] }).entries;
  return { files, scripts, workflows, listed };
}

let failed = 0;
const check = (name: string, run: () => void) => { try { run(); console.log(`pass  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`); } };

const PR = "on:\n  pull_request:\n    branches: [main]\njobs:\n  a:\n    steps:\n      - run: npm run test:a\n";
const synthetic = (over: Partial<Inputs> = {}): Inputs => ({
  files: ["tests/browser/a.spec.ts", "tests/browser/b.spec.ts", "scripts/verification/verifyA.ts", "scripts/verification/verifyB.ts"],
  scripts: { "test:a": "node scripts/verification/verifyA.ts && npm run test:c", "test:c": "playwright test tests/browser/a.spec.ts", "test:b": "node scripts/verification/verifyB.ts" },
  workflows: [{ name: "ci.yml", text: PR }],
  listed: [{ file: "tests/browser/b.spec.ts", reason: "synthetic: needs a live model, manual only" }, { file: "scripts/verification/verifyB.ts", reason: "synthetic: needs a live model, manual only" }],
  ...over,
});

check("self-test: a run script, and the scripts it runs in turn, put their files in CI", () => assert.deepEqual(problems(synthetic()), []));
check("self-test: a new test that is neither run nor listed fails", () => {
  const found = problems(synthetic({ listed: [synthetic().listed[1]] }));
  assert.ok(found.some((p) => p.includes("not in CI and not listed: tests/browser/b.spec.ts")), found.join("; "));
});
check("self-test: a listed file now run by CI fails as stale", () => {
  const found = problems(synthetic({ workflows: [{ name: "ci.yml", text: PR + "      - run: npx playwright test tests/browser/b.spec.ts\n" }] }));
  assert.ok(found.some((p) => p.includes("now run by CI: tests/browser/b.spec.ts")), found.join("; "));
});
check("self-test: a listed file that no longer exists fails; an empty reason fails", () => {
  const found = problems(synthetic({ listed: [...synthetic().listed, { file: "tests/browser/gone.spec.ts", reason: "" }] }));
  assert.ok(found.some((p) => p.includes("no longer exists: tests/browser/gone.spec.ts")), found.join("; "));
  assert.ok(found.some((p) => p.includes("no real reason: tests/browser/gone.spec.ts")), found.join("; "));
});
check("self-test: a spec named only in a comment, or only by a manual workflow, is not in CI", () => {
  const found = problems(synthetic({
    listed: [synthetic().listed[1]],
    workflows: [{ name: "ci.yml", text: PR + "  # tests/browser/b.spec.ts is not run here\n" }, { name: "manual.yml", text: "on:\n  workflow_dispatch:\njobs:\n  m:\n    steps:\n      - run: npx playwright test tests/browser/b.spec.ts\n" }],
  }));
  assert.ok(found.some((p) => p.includes("not in CI and not listed: tests/browser/b.spec.ts")), found.join("; "));
});

check("self-test: a spec started by a runner file, and a suite run on a schedule, are in CI", () => {
  const base = synthetic({ listed: [] });
  const found = problems({
    ...base,
    scripts: { ...base.scripts, "test:b": "node scripts/browser/runB.mjs", "test:v": "node scripts/verification/verifyB.ts" },
    workflows: [
      { name: "ci.yml", text: PR + "      - run: npm run test:b\n" },
      { name: "weekly.yml", text: "on:\n  schedule:\n    - cron: \"0 6 * * 1\"\njobs:\n  w:\n    steps:\n      - run: npm run test:v\n" },
    ],
  }, (file) => (file === "scripts/browser/runB.mjs" ? "spawn(\"npx\", [\"playwright\", \"test\", \"tests/browser/b.spec.ts\"])" : ""));
  assert.deepEqual(found, []);
});

const repo = repoInputs();
const readRepo = (file: string) => { try { return readFileSync(file, "utf8"); } catch { return ""; } };
check(`every test file in the repository is run by CI or listed with its reason (${testFiles(repo.files, repo.scripts).length} test files, ${inCi(repo, readRepo).size} in CI, ${repo.listed.length} listed)`, () => {
  const found = problems(repo, readRepo);
  assert.equal(found.length, 0, found.join("\n"));
});

console.log(failed ? `\n${failed} check(s) failed.` : "\nEvery test file is run by CI or says why not.");
process.exit(failed ? 1 : 0);
