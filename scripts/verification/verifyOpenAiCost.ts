/**
 * OpenAI spending stays under control.
 *
 * WHAT IT CATCHES (2026-10-08: October's spend reached about $396 against a $100
 * budget, $205.76 of it prompt-cache WRITES that were almost never read back):
 *   - a call to a GPT-5.6+ model going out without prompt_cache_options, so the
 *     whole prompt is written to the cache at 1.25 times the input price;
 *   - a caller's own cache options being overwritten;
 *   - a model that rejects the option failing the call instead of dropping it;
 *   - token use (including cache writes) not being counted for the exam report;
 *   - a workflow that makes billed AI calls without first running the daily
 *     spend note (scripts/ai/spendGuard.mjs), or that note stopping a run
 *     (site owner, 2026-10-08: never stop work mid-way);
 *   - the billed CI suite running on code it already passed on, or without the
 *     spend check;
 *   - the walkthrough or nightly check (not tests of answer quality) running
 *     at full reasoning effort.
 *
 * COSTS NOTHING: no network; the OpenAI client is a fake.
 *
 * Run: npm run test:openai-cost
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { rejectedDroppableParam } from "../../src/lib/case-system/aiModels";
import { forceNoStore, implicitCacheWriteModel, tokenUse, withoutCacheWrites } from "../../src/lib/case-system/openaiClient";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

async function main() {
  console.log("\n1. No prompt-cache writes unless a caller asks for them");
  check("gpt-6.1-sol and gpt-5.6 write to the cache unless told not to", implicitCacheWriteModel("gpt-6.1-sol") && implicitCacheWriteModel("gpt-5.6") && implicitCacheWriteModel("gpt-7"));
  check("older models do not", !implicitCacheWriteModel("gpt-4o-mini") && !implicitCacheWriteModel("gpt-5.4") && !implicitCacheWriteModel(""));
  const sent = withoutCacheWrites({ model: "gpt-6.1-sol", messages: [] });
  check("a gpt-6.1-sol call asks for explicit caching with no breakpoint (nothing written)", JSON.stringify(sent.prompt_cache_options) === JSON.stringify({ mode: "explicit" }));
  check("an older model's call is left alone", !("prompt_cache_options" in withoutCacheWrites({ model: "gpt-4o-mini" })));
  const own = { mode: "explicit", ttl: "30m" };
  check("a caller's own cache options are kept", withoutCacheWrites({ model: "gpt-6.1-sol", prompt_cache_options: own }).prompt_cache_options === own);
  const rejected = Object.assign(new Error("Unrecognized request argument supplied: prompt_cache_options"), { status: 400 });
  check("a model that rejects the option has it dropped, not the call failed", rejectedDroppableParam(rejected, sent) === "prompt_cache_options");

  console.log("\n2. Every call through the client is sent that way, and counted");
  const seen: Record<string, unknown>[] = [];
  const fake = {
    chat: {
      completions: {
        create: async (body: Record<string, unknown>) => {
          seen.push(body);
          return { choices: [], usage: { prompt_tokens: 5000, completion_tokens: 800, prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 } } };
        },
      },
    },
  };
  const client = forceNoStore(fake);
  const before = { ...tokenUse };
  await client.chat.completions.create({ model: "gpt-6.1-sol", messages: [] });
  check("the request carries explicit caching and store: false", JSON.stringify(seen[0]?.prompt_cache_options) === '{"mode":"explicit"}' && seen[0]?.store === false);
  check("its tokens are counted", tokenUse.calls === before.calls + 1 && tokenUse.input === before.input + 5000 && tokenUse.output === before.output + 800);

  console.log("\n3. The daily spend check runs before every billed AI run");
  const workflows = readdirSync(path.join(ROOT, ".github/workflows")).filter((file) => file.endsWith(".yml"));
  const unguarded: string[] = [];
  for (const file of workflows) {
    const text = readFileSync(path.join(ROOT, ".github/workflows", file), "utf8");
    if (!text.includes("secrets.OPENAI_API_KEY") || file === "courtsimplified-ci.yml") continue;
    const guard = text.indexOf("spendGuard.mjs");
    const install = text.indexOf("npm ci");
    if (guard < 0 || (install >= 0 && guard > install)) unguarded.push(file);
  }
  check("every AI workflow checks today's spend before installing and running", unguarded.length === 0, unguarded.join(", "));
  const ci = readFileSync(path.join(ROOT, ".github/workflows/courtsimplified-ci.yml"), "utf8");
  const billed = ci.slice(ci.indexOf("- name: Safety pass regression (real"));
  check(
    "CI's billed suite runs only after the spend check and only on AI code it has not passed on",
    /steps\.spend\.outcome == 'success'/.test(billed.split("\n")[1] ?? "") && /safety-passed\.outputs\.cache-hit != 'true'/.test(billed.split("\n")[1] ?? ""),
  );
  // Cast: Next.js types require NODE_ENV on every env object; this run deliberately passes PATH only (no keys).
  const noKey = spawnSync(process.execPath, [path.join(ROOT, "scripts/ai/spendGuard.mjs")], { env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv, encoding: "utf8" });
  check("with no admin key the note says so and the run continues (never stops work)", noKey.status === 0 && /OPENAI_ADMIN_KEY/.test(noKey.stdout));
  const guard = await import("../../scripts/ai/spendGuard.mjs");
  check("today's costs are summed", guard.sumCosts({ data: [{ results: [{ amount: { value: 3.5 } }, { amount: { value: 1.25 } }] }] }) === 4.75);
  check("today starts at midnight Toronto time", new Date(guard.torontoMidnight(new Date("2026-10-08T14:00:00Z")) * 1000).toISOString() === "2026-10-08T04:00:00.000Z");

  console.log("\n4. Checks that are not about answer quality think less, and are not re-run on code they passed");
  for (const name of ["courtsimplified-walkthrough.yml", "courtsimplified-nightly-ai.yml"]) {
    const text = readFileSync(path.join(ROOT, ".github/workflows", name), "utf8");
    check(`${name} runs at low effort`, /AI_EFFORT_DEEP: low/.test(text) && /AI_EFFORT_STANDARD: low/.test(text));
  }
  for (const name of ["courtsimplified-walkthrough.yml", "courtsimplified-nightly-ai.yml", "courtsimplified-story-review.yml", "courtsimplified-retrieval-eval.yml", "courtsimplified-coverage.yml"]) {
    const text = readFileSync(path.join(ROOT, ".github/workflows", name), "utf8");
    check(`${name} skips code it already passed on`, text.includes("needs.gate.outputs.run == 'true'") && text.includes("actions/cache/save@v4"));
  }

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
