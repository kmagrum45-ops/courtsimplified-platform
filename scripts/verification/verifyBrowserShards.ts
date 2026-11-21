/**
 * EVERY BROWSER-REGRESSION SPEC RUNS IN EXACTLY ONE SHARD (site owner, 16 Nov 2026).
 *
 * The browser-regression job of courtsimplified-ci.yml runs as two shards (browser-regression-shard, matrix shard 1 and
 * 2), each with its own list of spec files, balanced by measured CI time. The single job of 417 tests ran past its
 * 70-minute limit on #550. Two hand-kept lists can drift: a new spec added to neither never runs, and one added to both
 * runs twice and hides nothing but costs time.
 *
 * What it checks:
 *   1. every spec file (tests/browser/*.spec.ts) is in exactly one shard, unless another workflow that runs on pull
 *      requests or pushes runs it (by name, or through a package script it runs) or it is on notInCi.json -- so a spec
 *      in neither shard, or in both, fails;
 *   2. every path in a shard's list exists, and appears once;
 *   3. Playwright itself, given each shard's list (--list), finds tests in every file on it, and in no other file;
 *   4. the job named browser-regression waits for the shards and passes only when they all passed;
 *   5. self-tests: a planted spec in neither shard, one in both, and a missing path each fail.
 *
 * What failure it catches: a browser spec that silently stops running in CI, or runs twice, after the split.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

type Inputs = { specs: string[]; shards: string[][]; elsewhere: Set<string>; exists: (file: string) => boolean };

/** The problems with a split: each spec in exactly one shard unless run elsewhere; each listed path real and listed once. */
export function shardProblems(input: Inputs): string[] {
  const problems: string[] = [];
  const count = new Map<string, number>();
  for (const shard of input.shards) for (const file of shard) count.set(file, (count.get(file) ?? 0) + 1);
  for (const spec of input.specs) {
    const n = count.get(spec) ?? 0;
    if (n === 0 && !input.elsewhere.has(spec)) problems.push(`in no shard and run nowhere else: ${spec}`);
    if (n > 1) problems.push(`in more than one shard (${n}): ${spec}`);
  }
  for (const file of count.keys()) if (!input.exists(file)) problems.push(`listed in a shard but does not exist: ${file}`);
  return problems;
}

// ---- The real inputs ---------------------------------------------------------------------------------------------
const workflows = path.join(ROOT, ".github", "workflows");
const ci = parse(readFileSync(path.join(workflows, "courtsimplified-ci.yml"), "utf8"));
const shardJob = ci.jobs?.["browser-regression-shard"];
const include: { shard: number; specs: string }[] = shardJob?.strategy?.matrix?.include ?? [];
const shards = include.map((entry) => entry.specs.split(/\s+/).filter(Boolean));
const specs = readdirSync(path.join(ROOT, "tests", "browser")).filter((f) => f.endsWith(".spec.ts")).map((f) => `tests/browser/${f}`);

// Run elsewhere: named by another workflow that runs on pull requests or pushes, directly or through a package script
// it runs and the scripts/browser runner files those scripts start; or declared not in CI (notInCi.json).
const code = (text: string) => text.split(/\r?\n/).filter((line) => !/^\s*#/.test(line)).join("\n");
const scripts: Record<string, string> = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts;
let elsewhereText = "";
for (const name of readdirSync(workflows).filter((f) => /\.ya?ml$/.test(f) && f !== "courtsimplified-ci.yml")) {
  const text = code(readFileSync(path.join(workflows, name), "utf8"));
  if (!/^on:[\s\S]*?\b(pull_request|push|schedule)\b/m.test(text)) continue;
  elsewhereText += text;
  for (const run of text.matchAll(/npm run (?:-s )?([\w:.-]+)/g)) {
    const body = scripts[run[1]] ?? "";
    elsewhereText += `\n${body}`;
    for (const runner of body.matchAll(/scripts\/browser\/[\w./-]+/g)) if (existsSync(path.join(ROOT, runner[0]))) elsewhereText += `\n${code(readFileSync(path.join(ROOT, runner[0]), "utf8"))}`;
  }
}
const notInCi = new Set<string>(JSON.parse(readFileSync(path.join(ROOT, "scripts/verification/notInCi.json"), "utf8")).entries.map((e: { file: string }) => e.file));
const elsewhere = new Set(specs.filter((spec) => notInCi.has(spec) || elsewhereText.includes(path.basename(spec))));

// 1 and 2.
check("the browser-regression job runs as shards (browser-regression-shard, a matrix of at least two)", shards.length >= 2, `found ${shards.length}`);
const problems = shardProblems({ specs, shards, elsewhere, exists: (file) => existsSync(path.join(ROOT, file)) });
check("every spec file is in exactly one shard, or run by another workflow, or declared not in CI", problems.length === 0, problems.join("\n      "));
console.log(`      specs: ${specs.length}; shards: ${shards.map((s) => s.length).join(" + ")} = ${shards.reduce((n, s) => n + s.length, 0)}; run elsewhere or declared: ${elsewhere.size}`);

// 3. Playwright finds tests in every listed file, and only those.
for (const [index, shard] of shards.entries()) {
  let listed = "";
  try {
    listed = execFileSync(process.execPath, [path.join(ROOT, "node_modules", "@playwright", "test", "cli.js"), "test", ...shard, "--list", "--reporter=list"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, PLAYWRIGHT_BASE_URL: "http://127.0.0.1:9" }, maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    listed = String((error as { stdout?: string }).stdout ?? "");
  }
  const found = new Set([...listed.matchAll(/([\w-]+\.spec\.ts):\d+/g)].map((m) => `tests/browser/${m[1]}`));
  const missing = shard.filter((file) => !found.has(file));
  const extra = [...found].filter((file) => !shard.includes(file));
  check(`Playwright finds tests in every file of shard ${index + 1}, and in no other file`, missing.length === 0 && extra.length === 0, [...missing.map((f) => `no tests found: ${f}`), ...extra.map((f) => `not listed: ${f}`)].join("; "));
}

// 4. The one check named browser-regression waits for the shards and requires them.
const gate = ci.jobs?.["browser-regression"];
const needs = [gate?.needs].flat();
const gateRun = (gate?.steps ?? []).map((step: { run?: string }) => step.run ?? "").join("\n");
check("the job named browser-regression waits for the shards and passes only when they all passed", needs.includes("browser-regression-shard") && gate?.if === "always()" && /test "\$\{\{ needs\.browser-regression-shard\.result \}\}" = "success"/.test(gateRun));
// The shards keep the old job's guards (a rebalance that rewrote the lists dropped the env block once, 16 Nov 2026):
// AI calls counted in the test server's own memory, the staging database read first, and production refused.
const env = shardJob?.env ?? {};
const stepNames = (shardJob?.steps ?? []).map((step: { name?: string }) => step.name ?? "");
check("the shards keep their guards: AI_RATE_LIMITS local, the staging database first, production refused", env.AI_RATE_LIMITS === "local" && /secrets\.STAGING_SUPABASE_URL \|\|/.test(String(env.NEXT_PUBLIC_SUPABASE_URL ?? "")) && /secrets\.STAGING_SUPABASE_SERVICE_ROLE_KEY \|\|/.test(String(env.SUPABASE_SERVICE_ROLE_KEY ?? "")) && stepNames.includes("Refuse a production database"));
check("each shard keeps its failures apart (artifact names carry the shard)", JSON.stringify(shardJob?.steps ?? []).split("upload-artifact").length - 1 === (JSON.stringify(shardJob?.steps ?? []).match(/-\$\{\{ matrix\.shard \}\}/g) ?? []).length);

// 5. Self-tests.
const synthetic = (shardsIn: string[][], extraSpecs: string[] = []): string[] => shardProblems({ specs: ["tests/browser/a.spec.ts", "tests/browser/b.spec.ts", "tests/browser/c.spec.ts", ...extraSpecs], shards: shardsIn, elsewhere: new Set(["tests/browser/c.spec.ts"]), exists: (file) => !file.includes("gone") });
check("self-test: a clean split passes", synthetic([["tests/browser/a.spec.ts"], ["tests/browser/b.spec.ts"]]).length === 0);
check("self-test: a spec in neither shard fails", synthetic([["tests/browser/a.spec.ts"], []]).some((p) => p.includes("in no shard") && p.includes("b.spec.ts")));
check("self-test: a spec in both shards fails", synthetic([["tests/browser/a.spec.ts", "tests/browser/b.spec.ts"], ["tests/browser/b.spec.ts"]]).some((p) => p.includes("more than one shard") && p.includes("b.spec.ts")));
check("self-test: a listed path that does not exist fails", synthetic([["tests/browser/a.spec.ts", "tests/browser/gone.spec.ts"], ["tests/browser/b.spec.ts"]]).some((p) => p.includes("does not exist")));

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll browser-shard checks passed.");
process.exit(failed ? 1 : 0);
