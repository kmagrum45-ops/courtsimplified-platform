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
 * fixed visitor address, so every CI run in flight shares one hourly limit; a CI job that
 * counts its test calls in a shared database (AI_RATE_LIMITS=local must be set there, and the
 * local limit must still hold in that mode); a refusal not in plain words or without when to
 * come back, and a screen that shows its own guess instead of the limit's words (limitWords.ts).
 *
 * COSTS NOTHING: no model, no network (the database is a fake).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  VISITOR_LIMITS,
  clientAddress,
  refusedResponseBody,
  resetLocalLimits,
  takeAiAllowance,
  visitorId,
} from "../../src/lib/security/aiRateLimit";
import { dailyLimitWords, limitMessageOf } from "../../src/lib/security/limitWords";

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

  // AI_RATE_LIMITS=local (CI): the database is never asked, and the local limit still holds.
  await check("in local mode the database is never asked, and the local limit still refuses", async () => {
    resetLocalLimits();
    const now = Date.UTC(2026, 9, 16, 12, 0, 0);
    let asked = 0;
    const rpc = async () => { asked += 1; return { data: true, error: null }; };
    const localEnv = { ...env, AI_RATE_LIMITS: "local" };
    for (let i = 0; i < VISITOR_LIMITS.understand; i += 1) {
      assert.equal((await takeAiAllowance(req("203.0.113.9"), "understand", { rpc, env: localEnv, now })).allowed, true);
    }
    assert.deepEqual(await takeAiAllowance(req("203.0.113.9"), "understand", { rpc, env: localEnv, now }), { allowed: false, reason: "visitor" });
    assert.equal(asked, 0, "the shared layer was called in local mode");
  });

  await check("only the CI workflows choose local mode; every job that serves the site does", () => {
    const workflows = path.join(process.cwd(), ".github", "workflows");
    for (const name of ["courtsimplified-ci.yml", "courtsimplified-story-pack.yml", "courtsimplified-walkthrough.yml"]) {
      const source = readFileSync(path.join(workflows, name), "utf8");
      const jobs = source.split(/\r?\n(?=  [a-z][a-z0-9-]*:\r?\n)/).slice(1);
      for (const job of jobs) if (/\bnpm run (start|test:)|playwright test/.test(job)) assert.match(job, /^\s+AI_RATE_LIMITS: local\s*$/m, `${name}: a job runs the site's code without AI_RATE_LIMITS: local`);
    }
    // Never in the site's own settings (the live site keeps the shared layer).
    for (const file of ["vercel.json", "next.config.ts", "next.config.js", "next.config.mjs"]) {
      try { assert.doesNotMatch(readFileSync(path.join(process.cwd(), file), "utf8"), /AI_RATE_LIMITS/, file); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
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
  // What a person is told (owner, 28 Oct): plain words, with when to come back, read back on every screen.
  await check("a refusal says plainly which limit and when to come back", () => {
    const visitor = refusedResponseBody({ allowed: false, reason: "visitor" });
    const daily = refusedResponseBody({ allowed: false, reason: "daily" });
    assert.match(visitor.error, /in an hour\./);
    assert.match(daily.error, /starts again at \d{1,2}(:\d\d)? [ap]\.m\. (today|tomorrow), Toronto time\./);
    assert.match(dailyLimitWords(Date.UTC(2026, 9, 29, 1)), /8 p\.m\. tomorrow/, "after 8 p.m. in Toronto the next start is tomorrow's");
    assert.equal(dailyLimitWords(Date.UTC(2026, 9, 28, 15)), dailyLimitWords(Date.UTC(2026, 9, 28, 23)), "one reset time all day");
    assert.match(dailyLimitWords(Date.UTC(2026, 9, 28, 15)), /8 p\.m\./, "midnight UTC is 8 p.m. in Toronto in October");
    assert.equal(limitMessageOf(429, visitor), visitor.error);
    assert.equal(limitMessageOf(429, daily), daily.error);
    assert.equal(limitMessageOf(500, visitor), null, "only a 429 is a limit");
    assert.equal(limitMessageOf(429, { error: "Something else" }), null, "only a limit refusal is read as one");
  });

  await check("every screen that calls a limited route shows the limit's own words", () => {
    const api = path.join(process.cwd(), "app", "api");
    const limitedRoutes: string[] = [];
    const walkApi = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walkApi(full);
        else if (name === "route.ts" && /aiLimitResponse\(/.test(readFileSync(full, "utf8"))) limitedRoutes.push("/api/" + path.relative(api, path.dirname(full)).split(path.sep).join("/"));
      }
    };
    walkApi(api);
    const screens: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (name === "api" || name === "node_modules") continue;
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) screens.push(full);
      }
    };
    walk(path.join(process.cwd(), "app"));
    walk(path.join(process.cwd(), "src"));
    // Callers that show the person nothing on any failure, declared with the reason (reviewer of #509).
    const SILENT_BY_DESIGN = new Map<string, string>([
      ["src/lib/case-system/intake/clientSafetyCheck.ts", "the safety pass: any failure is 'not checked' and the person carries on; its daily cost is 0"],
      ["src/lib/audit/aiCallLog.ts", "names the routes for the call log; calls none"],
    ]);
    const silent = screens.filter((file) => {
      if (SILENT_BY_DESIGN.has(path.relative(process.cwd(), file).split(path.sep).join("/"))) return false;
      const source = readFileSync(file, "utf8");
      return limitedRoutes.some((route) => source.includes(`"${route}"`) || source.includes(`\`${route}`)) && !/limitMessageOf\(/.test(source);
    });
    assert.ok(limitedRoutes.length >= 5, `found ${limitedRoutes.length} limited routes`);
    assert.deepEqual(silent.map((f) => path.relative(process.cwd(), f)), []);
  });

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
