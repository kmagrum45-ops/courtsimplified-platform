/**
 * PER-VISITOR LIMITS ON THE AI ROUTES THAT NEED NO SIGN-IN (2026-10-14 audit,
 * MASTER_PLAN build order 6C).
 *
 * The front door and several intake routes call the model before anyone signs
 * in. Without a limit, anyone past the site password could run up the OpenAI
 * bill. Each such route calls `takeAiAllowance(request, group)` first and
 * answers 429 when it is refused.
 *
 * Two layers:
 *   - shared: a row per visitor and route group per hour in the database
 *     (ai_rate_limit_take, migration 20261015090000), plus one ceiling for all
 *     visitors together per day. Holds across every server instance.
 *   - local: the same limits in this server instance's memory. Always on, so
 *     the site is protected before the migration is applied and if the
 *     database is unreachable. Weaker (each instance counts alone), never off.
 *
 * AI_RATE_LIMITS=local (CI only, 2026-10-28): the local layer alone. Every CI run in flight
 * shared the database's counts (a fixed test visitor, one daily ceiling), so the limits ran out
 * part-way through the runs; and CI's typecheck job reaches the production database, so its test
 * calls were counted there. A test run's server is one instance, so its own memory is its count.
 *
 * Privacy: the visitor is identified by a salted SHA-256 of their address
 * (and the site cookie when there is one). No address is stored or logged.
 *
 * Never throws. A database error falls back to the local layer, never to
 * "no limit at all".
 */

import { createHash } from "node:crypto";
import { dailyLimitWords, visitorLimitWords } from "./limitWords";

export type AiRouteGroup = "understand" | "light" | "safety";

/**
 * Per visitor per hour. "understand" is the front door's deep reading (one
 * call checks up to a dozen statements); "light" is a classifier, a stage
 * resolver, a spelling suggestion, a safety pass or an explanation.
 */
export const VISITOR_LIMITS: Record<AiRouteGroup, number> = {
  understand: 30,
  light: 150,
  // The safety pass looks for danger in what a person writes. It is cheap, and
  // it must never be the call that is refused because the site is busy, so it
  // has a generous visitor limit and does not count against the daily ceiling.
  safety: 300,
};

/** Weight of one call against the daily ceiling for all visitors together. */
export const GLOBAL_COST: Record<AiRouteGroup, number> = { understand: 10, light: 1, safety: 0 };

/** Units a day for all visitors together. AI_DAILY_CEILING overrides. */
export const DEFAULT_DAILY_CEILING = 3_000;

const HOUR = 3_600;
const DAY = 86_400;

export function dailyCeiling(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.AI_DAILY_CEILING);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_DAILY_CEILING;
}

/** The visitor's address as the platform reports it. Pure. */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}

/** A stable, salted, one-way id for the visitor. Pure. */
export function visitorId(headers: Headers, salt = process.env.AI_LIMIT_SALT || "courtsimplified-ai-limit"): string {
  return createHash("sha256").update(`${salt}|${clientAddress(headers)}`).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------- local layer

type Window = { start: number; hits: number };
const local = new Map<string, Window>();

/** Counts `cost` against `bucket` in this instance's memory; true when still within `max`. */
export function takeLocal(bucket: string, windowSeconds: number, max: number, cost: number, now = Date.now()): boolean {
  const start = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const current = local.get(bucket);
  const window = current && current.start === start ? current : { start, hits: 0 };
  if (window.hits + cost > max) {
    local.set(bucket, window);
    return false;
  }
  window.hits += cost;
  local.set(bucket, window);
  if (local.size > 20_000) {
    for (const [key, value] of local) if (value.start < start) local.delete(key);
  }
  return true;
}

/** For tests only. */
export function resetLocalLimits(): void {
  local.clear();
}

// ---------------------------------------------------------------- shared layer

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

async function defaultRpc(): Promise<Rpc | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return async (fn, args) => {
    const { data, error } = await db.rpc(fn, args);
    return { data, error: error ? { message: error.message } : null };
  };
}

/** True / false from the database, or null when the shared layer is unavailable. */
async function takeShared(rpc: Rpc | null, bucket: string, windowSeconds: number, max: number, cost: number): Promise<boolean | null> {
  if (!rpc) return null;
  try {
    const { data, error } = await rpc("ai_rate_limit_take", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_max_hits: max,
      p_cost: cost,
    });
    if (error || typeof data !== "boolean") return null;
    return data;
  } catch {
    return null;
  }
}

/** A Vercel production deploy (either name Vercel gives it; a2iScope.ts reads both the same way). */
export function onProduction(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "production" || env.NEXT_PUBLIC_VERCEL_ENV === "production";
}

/**
 * The test-only mode (AI_RATE_LIMITS=local). Never on a production deploy, whatever is set there:
 * Vercel sets VERCEL_ENV=production on the live site, and there the shared count always holds.
 */
export function localOnly(env: Record<string, string | undefined>): boolean {
  return env.AI_RATE_LIMITS === "local" && !onProduction(env);
}

export type AllowanceResult = { allowed: true } | { allowed: false; reason: "visitor" | "daily" };

export type AllowanceDeps = { rpc?: Rpc | null; env?: Record<string, string | undefined>; now?: number };

/**
 * Takes one call's allowance for this visitor and route group. Both the
 * visitor's hourly limit and the daily ceiling must allow it. Never throws.
 */
export async function takeAiAllowance(request: Request, group: AiRouteGroup, deps: AllowanceDeps = {}): Promise<AllowanceResult> {
  try {
    const env = deps.env ?? process.env;
    // "off" (local development only) is never honoured on a production deploy either.
    if (env.AI_RATE_LIMITS === "off" && !onProduction(env)) return { allowed: true };
    const visitor = `v:${group}:${visitorId(request.headers, env.AI_LIMIT_SALT || undefined)}`;
    const day = new Date(deps.now ?? Date.now()).toISOString().slice(0, 10);
    const global = `g:${day}`;
    const ceiling = dailyCeiling(env);
    const cost = GLOBAL_COST[group];

    // Local first: always enforced, even when the database answers.
    if (!takeLocal(visitor, HOUR, VISITOR_LIMITS[group], 1, deps.now)) return { allowed: false, reason: "visitor" };
    if (cost > 0 && !takeLocal(global, DAY, ceiling, cost, deps.now)) return { allowed: false, reason: "daily" };

    const rpc = localOnly(env) ? null : deps.rpc !== undefined ? deps.rpc : await defaultRpc();
    const visitorShared = await takeShared(rpc, visitor, HOUR, VISITOR_LIMITS[group], 1);
    if (visitorShared === false) return { allowed: false, reason: "visitor" };
    const globalShared = cost > 0 ? await takeShared(rpc, global, DAY, ceiling, cost) : true;
    if (globalShared === false) return { allowed: false, reason: "daily" };

    // Now and then, drop windows older than two days.
    if (rpc && Math.random() < 0.01) void rpc("ai_rate_limits_prune", {}).catch(() => undefined);
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/** What a refused call answers. Plain words; the page falls back where it can. */
export function refusedResponseBody(result: Extract<AllowanceResult, { allowed: false }>) {
  return {
    ok: false,
    // One copy of the words (limitWords.ts), which every screen reads back.
    error: result.reason === "visitor" ? visitorLimitWords() : dailyLimitWords(),
    limited: result.reason,
  };
}
