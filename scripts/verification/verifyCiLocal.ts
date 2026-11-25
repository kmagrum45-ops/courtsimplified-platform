/**
 * test:ci-local -- `npm run ci:local` runs CI's main job as the workflow writes it, and only skips what it must.
 *
 * WHAT IT CHECKS.
 *   1. Every step of the workflow's `typecheck-and-build` job is either run by ci:local or skipped with a
 *      reason, and the only steps skipped (other than `uses:` steps the container does itself) are the billed
 *      OpenAI ones. Every `npm run test:` the job runs is in ci:local's run list.
 *   2. A conditional step ci:local has no rule for makes the plan throw (self-test with a planted step), so a
 *      new `if:` step is decided on, never silently skipped.
 *   3. The job's env: a literal is kept, a `${{ secrets.X }}` comes from the environment ciLocal.sh gives it
 *      (the local stack only), and an absent secret is empty, never the expression text.
 *   4. The stack settings stay private and local: carryLocal.sh writes them only after its local-URL refusal,
 *      the production guard and the catalogue count; ciLocal.sh never prints the file and deletes it.
 *   5. ci:local tests commits, merged with origin/main by default, as CI tests a pull request.
 *
 * WHAT FAILURE IT EXISTS TO CATCH. "Everything passed locally" while CI failed (site owner, 25 Nov 2026): a
 * local loop over a copied suite list missed CI's own order (the build before the checks that read it), ran on
 * Windows line endings and paths, and had no database. If ci:local drifts from the workflow, this fails.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const runner = (await import("../ci/runCiSteps.mjs")) as {
    planSteps: (text: string) => { name: string; run: string | null; skipped: string | null }[];
    jobEnv: (text: string, from: Record<string, string | undefined>) => Record<string, string>;
  };
  const workflow = readFileSync(path.join(ROOT, ".github/workflows/courtsimplified-ci.yml"), "utf8");

  console.log("\n1. Every step is run or skipped with its reason; only the billed OpenAI steps are skipped");
  const plan = runner.planSteps(workflow);
  check("the job has steps", plan.length > 50, `${plan.length}`);
  const skippedRuns = plan.filter((step) => step.skipped && !/^done by the container/.test(step.skipped));
  check(
    "every skipped run step is a billed OpenAI step",
    skippedRuns.every((step) => /OpenAI/.test(step.skipped ?? "") && /openai|safety|spend|credit/i.test(`${step.name} ${step.run}`)),
    skippedRuns.map((step) => step.name).join("; "),
  );
  const ran = plan.filter((step) => !step.skipped).map((step) => step.run ?? "").join("\n");
  const tests = [...new Set(workflow.match(/npm run test:[\w:-]+/g) ?? [])].filter((t) => t !== "npm run test:safety-regression" && t !== "npm run test:browser-shards");
  const job = workflow.slice(workflow.indexOf("typecheck-and-build:"), workflow.indexOf("browser-regression-shard:"));
  const jobTests = tests.filter((t) => job.includes(t));
  const missing = jobTests.filter((t) => !new RegExp(`${t.replace(/[:-]/g, "\\$&")}(?![\\w:-])`).test(ran));
  check(`every npm run test: of the job is run (${jobTests.length})`, jobTests.length > 200 && missing.length === 0, missing.join(", "));
  check("the build runs before the checks that read it, in CI's own order", orderOk(ran));
  check("npm ci and the type check run", /^npm ci$/m.test(ran) && /npx tsc --noEmit/.test(ran));

  console.log("\n2. A conditional step with no rule is never silently skipped");
  const planted = workflow.replace(/(\n {6}- name: TypeScript check\n)/, "\n      - name: Planted push-only step\n        if: github.event_name == 'push'\n        run: echo planted\n$1");
  let threw = "";
  try { runner.planSteps(planted); } catch (error) { threw = String(error); }
  check("self-test: a planted push-only step makes the plan throw", /no rule for the conditional step "Planted push-only step"/.test(threw), threw || "did not throw");

  console.log("\n3. The job's env");
  const env = runner.jobEnv(workflow, { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56021" });
  check("a literal is kept", env.AI_RATE_LIMITS === "local" && /max-old-space-size/.test(env.NODE_OPTIONS ?? ""));
  check("a secret comes from the given environment", env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:56021");
  check("an absent secret is empty, never the expression", env.OPENAI_API_KEY === "" && !Object.values(env).some((value) => value.includes("${{")));

  console.log("\n4. The stack settings stay local and private");
  const carry = readFileSync(path.join(ROOT, "scripts/browser/carryLocal.sh"), "utf8");
  const at = (text: string, needle: string) => text.indexOf(needle);
  const written = at(carry, 'if [ -n "${CARRY_STACK_ENV_FILE:-}" ]');
  check("carryLocal writes them only after the local-URL refusal, the production guard and the catalogue count",
    written > 0 && at(carry, "REFUSED. The Supabase URL is not a local stack") < written && at(carry, "scripts/walkthrough/guard.ts") < written && at(carry, "REFUSED. The catalogue is not the seeded one") < written);
  check("carryLocal writes the file readable by this user only", /umask 077/.test(carry.slice(written, written + 600)));
  const local = readFileSync(path.join(ROOT, "scripts/ci/ciLocal.sh"), "utf8");
  check("ciLocal never prints the file and deletes it", !/cat "\$ENVFILE"|cat \$ENVFILE/.test(local) && /rm -f "\$ENVFILE"/.test(local) && /--env-file/.test(local));

  console.log("\n5. Commits, merged with main as CI tests a pull request");
  check("it tests a commit, not the working files", /git rev-parse --verify "\$\{REF\}\^\{commit\}"/.test(local) && /git clone -q -b ci-head/.test(local));
  check("it merges origin/main by default", /CI_LOCAL_MERGE:-1/.test(local) && /git merge -q --no-edit origin\/main/.test(local));
  check("npm run ci:local is the entry", JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts["ci:local"] === "bash scripts/ci/ciLocal.sh");

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll ci:local checks passed");
  process.exit(failures ? 1 : 0);
}

/** In CI's own order, the build comes before every check that reads .next. */
function orderOk(ran: string): boolean {
  const build = ran.indexOf("npm run build");
  return build >= 0 && ["test:retrieval-bundled", "test:runtime-files-shipped"].every((t) => ran.indexOf(t) < 0 || ran.indexOf(t) > build);
}

void main();
