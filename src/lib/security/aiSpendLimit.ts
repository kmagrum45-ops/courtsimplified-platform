/**
 * ONE SPENDING LIMIT IN FRONT OF EVERY OPENAI CALL (site owner, 10 Nov 2026: "signed-in AI routes have no limit today").
 *
 * Every model call the site makes goes through the client in openaiClient.ts (createOpenAIClient -> forceNoStore), and
 * every method that client wraps asks `aiSpendGate()` first. So the limit is a property of the client, not of each route:
 * a route added next month is limited without knowing this file exists (test:ai-routes-limited asserts it).
 *
 * The limits, in dollars, each tunable by an environment variable:
 *   - per signed-in person a day ........ AI_USER_DAILY_USD   (default 4)
 *   - per signed-in person an hour ...... AI_USER_HOURLY_USD  (default 1.50): a burst cap inside the day
 *   - per visitor address a day ......... AI_IP_DAILY_USD     (default 6): the salted address hash aiRateLimit.ts already
 *                                          uses, across every account, so several accounts from one person share it
 *   - the whole site a day .............. AI_SITE_DAILY_USD   (default 10): guests and signed-in people together
 * A "day" is the Toronto day (todayInOntario), so "back tomorrow" means after midnight in Ontario.
 *
 * The cost of a call is its token use as OpenAI reports it on the response (`usage`: input, cached input, output),
 * priced from the price table by the model the response names (aiPrices.ts; the long-context rates when its input is
 * over 272K tokens). A counted call to a model the table cannot price is refused before it is made, and an error is
 * logged. AI_PRICE_INPUT_PER_M / AI_PRICE_OUTPUT_PER_M override the short-context input and output rates only. A call
 * is let through while the spend so far is under each limit and its cost is added when it returns, so one call can
 * finish a little over a limit; the next one is refused.
 *
 * Two layers, like aiRateLimit.ts: this server instance's memory (always on) and the shared ai_rate_limits table
 * (every instance; no new migration). AI_RATE_LIMITS=local uses memory only (CI); AI_RATE_LIMITS=off turns the limit off
 * outside production. Neither is honoured on a production deploy.
 *
 * Exempt, OUTSIDE PRODUCTION ONLY: the browser harness's test accounts (user_metadata.courtSimplifiedHarness) and
 * calls made outside any web request (the terminal suites and evaluation scripts, which have their own run cap,
 * AI_SPEND_CAP_USD). On a production deploy neither exemption exists: a call outside a request counts against the
 * site's day, and the harness flag is ignored.
 *
 * When a limit is reached no call is made: the client throws AiLimitReached (the routes fall back as they do when the
 * AI is down, so nothing is lost and the rest of the site works), and a cookie tells every screen to show
 * AI_LIMIT_WORDS (AiLimitNotice in the shared layout).
 *
 * Never throws for any other reason: an error reading the shared count falls back to the memory count, never to "no
 * limit at all".
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

import { todayInOntario } from "../case-system/dates";
import { AI_LIMIT_COOKIE, AI_LIMIT_WORDS } from "./limitWords";
import { localOnly, onProduction } from "./aiRateLimit";
import { LONG_CONTEXT_TOKENS, PRICE_TABLE, costUsd, dearestPrice, inputTokensAtMost, priceFor, tokenCounts, withOverrides } from "./aiPrices";
import { TIER_DEFAULTS } from "../case-system/aiModels";

export { AI_LIMIT_WORDS, AI_LIMIT_COOKIE };

type Env = Record<string, string | undefined>;
const processEnv = (): Env => (typeof process !== "undefined" ? process.env : {});

export type SpendLimitKind = "user-daily" | "user-hourly" | "ip-daily" | "site-daily";
export type SpendLimits = Record<SpendLimitKind, number>;

const DEFAULTS: SpendLimits = { "user-daily": 4, "user-hourly": 1.5, "ip-daily": 6, "site-daily": 10 };
const VARIABLES: Record<SpendLimitKind, string> = {
  "user-daily": "AI_USER_DAILY_USD",
  "user-hourly": "AI_USER_HOURLY_USD",
  "ip-daily": "AI_IP_DAILY_USD",
  "site-daily": "AI_SITE_DAILY_USD",
};

/** The limits in dollars, from the environment (a missing, zero or unreadable value keeps the default). */
export function spendLimits(env: Env = processEnv()): SpendLimits {
  const limits = { ...DEFAULTS };
  for (const kind of Object.keys(DEFAULTS) as SpendLimitKind[]) {
    const value = Number(env[VARIABLES[kind]]);
    if (Number.isFinite(value) && value > 0) limits[kind] = value;
  }
  return limits;
}

/**
 * The site's default model's short-context input and output rates, overrides applied: for a token total that carries no
 * model (openaiClient.ts estimatedSpendUsd given bare counts). Every call the limits count is priced by callCostUsd.
 */
export function tokenPrices(env: Env = processEnv()): { input: number; output: number } {
  const { input, output } = withOverrides(PRICE_TABLE[TIER_DEFAULTS.deep.model] ?? dearestPrice(), env);
  return { input, output };
}

// ---------------------------------------------------------------- price errors

let priceErrorSink: ((message: string) => void) | null = null;
/** Tests only: where price errors go instead of the server error log (null: the log again). */
export function setPriceErrorSinkForTests(sink: ((message: string) => void) | null): void {
  priceErrorSink = sink;
}

/** Logs a price error: the server error log (scrubbed there; it holds a model name and counts, never content). */
function logPriceError(message: string): void {
  if (priceErrorSink) {
    priceErrorSink(message);
    return;
  }
  console.error(`[aiSpendLimit] ${message}`);
  void import("../monitoring/serverErrorLog")
    .then(({ recordServerError }) => recordServerError(new AiModelNotPriced(message), {}, { routePath: "ai-price-table", routeType: "ai" }))
    .catch(() => {});
}

/**
 * One call's cost in dollars: the model the response names (or, without one, the model requested), priced from the
 * table with its real input, cached-input and output counts (aiPrices.ts). A response naming a model the table lacks is
 * counted at the dearest rates in the table, and an error is logged.
 */
export function callCostUsd(response: unknown, env: Env = processEnv(), requestedModel?: string): number {
  const counts = tokenCounts(response);
  if (!counts) return 0;
  const named = (response as { model?: unknown } | null)?.model;
  const model = typeof named === "string" && named.trim() ? named : requestedModel;
  const price = priceFor(model, env);
  if (price) return costUsd(price, counts);
  logPriceError(`AI call answered by a model with no price in the table: "${String(model ?? "(none)").slice(0, 80)}" (requested "${String(requestedModel ?? "(none)").slice(0, 80)}"); counted at the dearest rates in the table.`);
  return costUsd(withOverrides(dearestPrice(), env), counts);
}

/** What the client throws instead of calling a model the table cannot price. */
export class AiModelNotPriced extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiModelNotPriced";
  }
}

/** Why a counted call to this model with this request may not be made, or null when it may. */
export function unpricedReason(model: unknown, body: unknown, env: Env = processEnv()): string | null {
  const price = priceFor(model, env);
  if (!price) return `AI call refused: the model "${String(model ?? "(none)").slice(0, 80)}" has no price in the table (src/lib/security/aiPrices.ts).`;
  if (!price.longContext && !price.flat && inputTokensAtMost(body) > LONG_CONTEXT_TOKENS) return `AI call refused: the request may be over ${LONG_CONTEXT_TOKENS} input tokens and "${String(model).slice(0, 80)}" has no long-context price in the table.`;
  return null;
}

/** Who a call is made for. */
export type AiAsker = {
  /** Inside a web request (false: a terminal suite or script). */
  inRequest: boolean;
  userId: string | null;
  /** The salted address hash (aiRateLimit.ts visitorId), or null. */
  visitor: string | null;
  /** user_metadata.courtSimplifiedHarness on the signed-in account. */
  harness: boolean;
};

const NOBODY: AiAsker = { inRequest: false, userId: null, visitor: null, harness: false };

/** Tests only: run `work` as if asked by `asker` (no web request is read). */
const askerForTests = new AsyncLocalStorage<AiAsker>();
export function withAiAskerForTests<T>(asker: Partial<AiAsker>, work: () => Promise<T>): Promise<T> {
  return askerForTests.run({ ...NOBODY, inRequest: true, ...asker }, work);
}

const verified = new Map<string, { at: number; user: { id: string; harness: boolean } | null }>();

async function userOfToken(token: string, env: Env): Promise<{ id: string; harness: boolean } | null> {
  const key = createHash("sha256").update(token).digest("hex");
  const cached = verified.get(key);
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.user;
  let user: { id: string; harness: boolean } | null = null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && publicKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const { data, error } = await createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } }).auth.getUser(token);
      if (!error && data.user) user = { id: data.user.id, harness: data.user.user_metadata?.courtSimplifiedHarness === true };
    } catch {
      user = null;
    }
  }
  if (verified.size > 5_000) verified.clear();
  verified.set(key, { at: Date.now(), user });
  return user;
}

/**
 * Who is asking: the web request's verified bearer token (the same token every signed-in route checks) and the visitor
 * address hash. Outside a web request: nobody, inRequest false.
 */
export async function currentAiAsker(env: Env = processEnv()): Promise<AiAsker> {
  const forTests = askerForTests.getStore();
  if (forTests) return forTests;
  let headerList: Headers | null = null;
  try {
    const { headers } = await import("next/headers");
    headerList = (await headers()) as unknown as Headers;
  } catch {
    return NOBODY;
  }
  try {
    const { visitorId } = await import("./aiRateLimit");
    const visitor = visitorId(headerList, env.AI_LIMIT_SALT || undefined);
    const token = (headerList.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
    const user = token ? await userOfToken(token, env) : null;
    return { inRequest: true, userId: user?.id ?? null, visitor, harness: user?.harness ?? false };
  } catch {
    return { ...NOBODY, inRequest: true };
  }
}

/** True when this asker is not limited. Never true on a production deploy, except AI_RATE_LIMITS cannot make it so. */
export function spendExempt(asker: AiAsker, env: Env = processEnv()): boolean {
  if (onProduction(env)) return false;
  if (env.AI_RATE_LIMITS === "off") return true;
  return asker.harness || !asker.inRequest;
}

// ---------------------------------------------------------------- counts

const MICROS = 1_000_000;
const RECORD_MAX = 2_147_483_647;

type Bucket = { key: string; kind: SpendLimitKind; hourly: boolean };

/** The buckets a call counts against: the day's (Toronto) and, for a person, the clock hour's. */
export function bucketsFor(asker: AiAsker, now: number): Bucket[] {
  const day = todayInOntario(new Date(now));
  const hour = new Date(Math.floor(now / 3_600_000) * 3_600_000).toISOString().slice(0, 13);
  const buckets: Bucket[] = [{ key: `$s:${day}`, kind: "site-daily", hourly: false }];
  if (asker.visitor) buckets.push({ key: `$v:${asker.visitor}:${day}`, kind: "ip-daily", hourly: false });
  if (asker.userId) {
    buckets.push({ key: `$u:${asker.userId}:${day}`, kind: "user-daily", hourly: false });
    buckets.push({ key: `$h:${asker.userId}:${hour}`, kind: "user-hourly", hourly: true });
  }
  return buckets;
}

/** The shared count (the ai_rate_limits table, read and added to with the service role). */
export type SpendStore = {
  /** Micro-dollars spent per bucket key, or null when the table cannot be read. */
  read(keys: string[]): Promise<Record<string, number> | null>;
  add(key: string, hourly: boolean, micros: number): Promise<void>;
};

const memory = new Map<string, number>();

/** Tests only. */
export function resetSpendMemory(): void {
  memory.clear();
}

let storeForTests: SpendStore | null | undefined;
/** Tests only: replace the shared count (null: none). */
export function setSpendStoreForTests(store: SpendStore | null | undefined): void {
  storeForTests = store;
}

function databaseStore(env: Env): SpendStore | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  })();
  return {
    async read(keys) {
      try {
        const db = await client;
        const { data, error } = await db.from("ai_rate_limits").select("bucket,hits").in("bucket", keys);
        if (error || !Array.isArray(data)) return null;
        const spent: Record<string, number> = {};
        // A Toronto day spans two of the table's UTC day windows: both rows are summed.
        for (const row of data as Array<{ bucket: string; hits: number }>) spent[row.bucket] = (spent[row.bucket] ?? 0) + (Number(row.hits) || 0);
        return spent;
      } catch {
        return null;
      }
    },
    async add(bucket, hourly, micros) {
      try {
        const db = await client;
        await db.rpc("ai_rate_limit_take", { p_bucket: bucket, p_window_seconds: hourly ? 3_600 : 86_400, p_max_hits: RECORD_MAX, p_cost: micros });
      } catch {
        // The memory count still has it.
      }
    },
  };
}

function storeFor(env: Env): SpendStore | null {
  if (storeForTests !== undefined) return storeForTests;
  return localOnly(env) ? null : databaseStore(env);
}

export type SpendDecision = { allowed: true; asker: AiAsker; buckets: Bucket[] } | { allowed: false; kind: SpendLimitKind };

/** Whether a call may be made now. Reads the memory count and the shared count; the higher of the two decides. */
export async function checkAiSpend(deps: { env?: Env; now?: number; asker?: AiAsker } = {}): Promise<SpendDecision> {
  const env = deps.env ?? processEnv();
  const asker = deps.asker ?? (await currentAiAsker(env));
  if (spendExempt(asker, env)) return { allowed: true, asker, buckets: [] };
  const now = deps.now ?? Date.now();
  const buckets = bucketsFor(asker, now);
  const limits = spendLimits(env);
  const shared = await storeFor(env)?.read(buckets.map((bucket) => bucket.key)) ?? null;
  for (const bucket of buckets) {
    const spent = Math.max(memory.get(bucket.key) ?? 0, shared?.[bucket.key] ?? 0);
    if (spent >= Math.round(limits[bucket.kind] * MICROS)) return { allowed: false, kind: bucket.kind };
  }
  return { allowed: true, asker, buckets };
}

/** Adds a returned call's cost to every bucket it counted against. */
export async function recordAiSpend(buckets: Bucket[], usd: number, env: Env = processEnv()): Promise<void> {
  const micros = Math.round(usd * MICROS);
  if (!buckets.length || micros <= 0) return;
  for (const bucket of buckets) memory.set(bucket.key, (memory.get(bucket.key) ?? 0) + micros);
  if (memory.size > 20_000) memory.clear();
  const store = storeFor(env);
  if (store) await Promise.all(buckets.map((bucket) => store.add(bucket.key, bucket.hourly, micros)));
}

/** What the client throws instead of calling the model. */
export class AiLimitReached extends Error {
  readonly kind: SpendLimitKind;
  constructor(kind: SpendLimitKind) {
    super(AI_LIMIT_WORDS);
    this.name = "AiLimitReached";
    this.kind = kind;
  }
}

/** Tells every screen in this browser that today's AI help is used up (a route handler can set cookies; elsewhere a no-op). */
async function markLimitForScreens(env: Env, now: number): Promise<void> {
  try {
    const { cookies } = await import("next/headers");
    const day = todayInOntario(new Date(now));
    (await cookies()).set(AI_LIMIT_COOKIE, day, { path: "/", sameSite: "lax", httpOnly: false, secure: onProduction(env), maxAge: 26 * 3_600 });
  } catch {
    // Not in a route handler: the call is still refused.
  }
}

/**
 * THE GATE. Call it with the model call to make: the limit is checked first (a refused call is never made), and the
 * call's cost is recorded when it returns.
 */
export async function aiSpendGate<T>(call: () => Promise<T>, deps: { env?: Env; now?: number; body?: unknown } = {}): Promise<T> {
  const env = deps.env ?? processEnv();
  const decision = await checkAiSpend({ env, now: deps.now });
  if (!decision.allowed) {
    await markLimitForScreens(env, deps.now ?? Date.now());
    throw new AiLimitReached(decision.kind);
  }
  // A counted call (every call on production; outside it, everyone but the exempt) must have a price before it is made.
  const requestedModel = (deps.body as { model?: unknown } | null | undefined)?.model;
  const counted = !spendExempt(decision.asker, env);
  if (counted) {
    const reason = unpricedReason(requestedModel, deps.body, env);
    if (reason) {
      logPriceError(reason);
      throw new AiModelNotPriced(reason);
    }
  }
  const response = await call();
  if (counted) await recordAiSpend(decision.buckets, callCostUsd(response, env, typeof requestedModel === "string" ? requestedModel : undefined), env);
  return response;
}
