/**
 * test:ai-rate-limit -- the AI routes that need no sign-in are limited per
 * visitor and by a daily ceiling (src/lib/security/aiRateLimit.ts; 2026-10-14
 * audit, MASTER_PLAN build order 6C).
 *
 * WHAT IT CATCHES: a route that calls the model with no sign-in and no limit
 * (anyone past the site password could run up the OpenAI bill); a limiter that
 * lets everything through when the database is missing or failing; a refused
 * hit from the database being ignored; the safety pass refused because the
 * site is busy; a raw address kept as the visitor's id; a test harness that sends one
 * fixed visitor address, so every CI run in flight shares one hourly limit.
 *
 * COSTS NOTHING: no model, no network (the database is a fake).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  VISITOR_LIMITS,
  clientAddress,
  resetLocalLimits,
  takeAiAllowance,
  visitorId,
} from "../../src/lib/security/aiRateLimit";

let failures = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`pass  ${name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL  ${name}\n      ${message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:ai-rate-limit::${name}: ${message.replace(/\n/g, " ")}`);
  }
}

const req = (ip: string) => new Request("https://example.invalid/api/x", { method: "POST", headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
const env = { AI_DAILY_CEILING: "100000" } as Record<string, string | undefined>;

async function main() {
  await check("with no database, the local limit still refuses a visitor over the hourly limit", async () => {
    resetLocalLimits();
    const now = Date.UTC(2026, 9, 15, 12, 0, 0);
    for (let i = 0; i < VISITOR_LIMITS.understand; i += 1) {
      assert.equal((await takeAiAllowance(req("203.0.113.7"), "understand", { rpc: null, env, now })).allowed, true);
    }
    const over = await takeAiAllowance(req("203.0.113.7"), "understand", { rpc: null, env, now });
    assert.deepEqual(over, { allowed: false, reason: "visitor" });
    assert.equal((await takeAiAllowance(req("203.0.113.8"), "understand", { rpc: null, env, now })).allowed, true, "another visitor is unaffected");
  });

  await check("the next hour gives the allowance back", async () => {
    const next = Date.UTC(2026, 9, 15, 13, 0, 1);
    assert.equal((await takeAiAllowance(req("203.0.113.7"), "understand", { rpc: null, env, now: next })).allowed, true);
  });

  await check("a refusal from the shared database is respected", async () => {
    resetLocalLimits();
    const rpc = async () => ({ data: false, error: null });
    assert.deepEqual(await takeAiAllowance(req("198.51.100.1"), "light", { rpc, env }), { allowed: false, reason: "visitor" });
  });

  await check("a failing database falls back to the local limit, not to no limit", async () => {
    resetLocalLimits();
    const rpc = async () => ({ data: null, error: { message: "relation does not exist" } });
    const now = Date.UTC(2026, 9, 15, 15, 0, 0);
    let refused = false;
    for (let i = 0; i <= VISITOR_LIMITS.light; i += 1) {
      const r = await takeAiAllowance(req("198.51.100.2"), "light", { rpc, env, now });
      if (!r.allowed) refused = true;
    }
    assert.equal(refused, true);
  });

  await check("the daily ceiling refuses once the site's total is spent", async () => {
    resetLocalLimits();
    const small = { AI_DAILY_CEILING: "25" };
    const now = Date.UTC(2026, 9, 16, 9, 0, 0);
    assert.equal((await takeAiAllowance(req("192.0.2.1"), "understand", { rpc: null, env: small, now })).allowed, true);
    assert.equal((await takeAiAllowance(req("192.0.2.2"), "understand", { rpc: null, env: small, now })).allowed, true);
    assert.deepEqual(await takeAiAllowance(req("192.0.2.3"), "understand", { rpc: null, env: small, now }), { allowed: false, reason: "daily" });
  });

  await check("the safety pass is never refused by the daily ceiling", async () => {
    const small = { AI_DAILY_CEILING: "25" };
    const now = Date.UTC(2026, 9, 16, 9, 30, 0);
    assert.equal((await takeAiAllowance(req("192.0.2.9"), "safety", { rpc: null, env: small, now })).allowed, true);
  });

  await check("the visitor id is a salted hash, never the address", () => {
    const headers = req("203.0.113.7").headers;
    assert.equal(clientAddress(headers), "203.0.113.7");
    const id = visitorId(headers, "salt");
    assert.match(id, /^[0-9a-f]{32}$/);
    assert.ok(!id.includes("203"));
    assert.notEqual(id, visitorId(headers, "other-salt"));
  });

  await check("every API route that calls the model with no sign-in takes an allowance first", () => {
    const root = path.join(process.cwd(), "app", "api");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name === "route.ts") files.push(full);
      }
    };
    walk(root);
    const MODEL = /understandCase|classifyCourtPath|resolveCasePosition|resolveStageWithModel|tidyWording|explainProvision|runSafetyPass|guidedAssistantOrchestrator|createOpenAIClient|checkedAnswer\(|libraryChat/;
    const unguarded = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      if (!MODEL.test(source)) return false;
      if (/getAuthenticatedUser|getAuthenticatedOwnedCase/.test(source)) return false;
      return !/aiLimitResponse\(/.test(source);
    });
    assert.deepEqual(unguarded.map((f) => path.relative(process.cwd(), f)), []);
  });

  // The hourly visitor count is shared across every run in flight (the database layer), so a
  // harness that names one fixed address makes all CI runs one visitor, and the limit runs out
  // part-way through a suite (case 05, 25 Oct, browser harness; #488, 28 Oct, chat harness).
  await check("test harnesses never send a fixed visitor address", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (name === "node_modules") continue;
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|mjs|js)$/.test(name)) files.push(full);
      }
    };
    walk(path.join(process.cwd(), "scripts"));
    walk(path.join(process.cwd(), "tests"));
    const fixed = files.filter((file) => !file.endsWith("verifyAiRateLimit.ts") && /["']x-forwarded-for["']\s*:\s*["'`][^"'`$]*["'`]/.test(readFileSync(file, "utf8")));
    assert.deepEqual(fixed.map((f) => path.relative(process.cwd(), f)), []);
  });

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll AI-limit checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
