/**
 * The CanLII API client as the site's server uses it: the real fetch, the
 * shared lease (canlii_acquire / canlii_release) and the shared cache
 * (canlii_cache), from migration 20261007090000. Server only.
 *
 * BEFORE THE MIGRATION IS APPLIED, OR WITH NO KEY. With no CANLII_API_KEY
 * nothing is called. With a key but no lease function, the lease is
 * "unavailable" and the call is skipped at once, so the site behaves as if
 * CanLII were off. It never fails or waits because of CanLII (canliiCore.ts).
 */

import { createClient } from "@supabase/supabase-js";

import {
  createCanliiClient,
  createLimiter,
  DAILY_CAP,
  LEASE_MS,
  MIN_GAP_MS,
  type CacheStore,
  type CanliiClient,
  type LeaseResult,
} from "./canliiCore";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function acquire(): Promise<LeaseResult> {
  const db = adminClient();
  if (!db) return "unavailable";
  const { data, error } = await db.rpc("canlii_acquire", { max_per_day: DAILY_CAP, min_gap_ms: MIN_GAP_MS, lease_ms: LEASE_MS });
  if (error) return "unavailable";
  return typeof data === "string" && data ? { token: data } : "busy";
}

async function release(token: string): Promise<void> {
  const db = adminClient();
  if (db) await db.rpc("canlii_release", { token });
}

const store: CacheStore = {
  async get(key) {
    const db = adminClient();
    if (!db) return null;
    const { data, error } = await db.from("canlii_cache").select("payload,fetched_at").eq("key", key).maybeSingle();
    if (error || !data) return null;
    return { payload: data.payload, fetchedAt: Date.parse(data.fetched_at) };
  },
  async set(key, payload) {
    const db = adminClient();
    if (db) await db.from("canlii_cache").upsert({ key, payload, fetched_at: new Date().toISOString() });
  },
};

/** Lookups that reach CanLII, per person per day. Cached answers are free. */
export const PER_PERSON_DAILY_LOOKUPS = 30;

/**
 * Counts one CanLII-reaching lookup for this person and says whether it is
 * within their daily allowance. False when it cannot be counted (for example
 * before the migration is applied), so an uncounted lookup never reaches CanLII.
 */
export async function allowPersonLookup(userId: string): Promise<boolean> {
  const db = adminClient();
  if (!db) return false;
  const { data, error } = await db.rpc("canlii_user_allow", { person: userId, max_per_day: PER_PERSON_DAILY_LOOKUPS });
  return !error && data === true;
}

let client: CanliiClient | null = null;

export function canlii(): CanliiClient {
  if (client) return client;
  client = createCanliiClient({
    env: process.env,
    fetch: (url, init) => fetch(url, init),
    limiter: createLimiter({
      now: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      acquire,
      release,
    }),
    store,
    now: () => Date.now(),
  });
  return client;
}

export { canliiEnabled, caseRefFromCitation } from "./canliiCore";
