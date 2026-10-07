/**
 * The CanLII REST API: case METADATA only (titles, citations, courts, dates,
 * the citator). Never decision text, and never canlii.org pages.
 *
 * Endpoints, from CanLII's own documentation
 * (github.com/canlii/API_documentation, EN.md, read 2026-10-07):
 *   https://api.canlii.org/v1/caseBrowse/{language}/?api_key={key}
 *       -> { caseDatabases: [{ databaseId, jurisdiction, name }] }
 *   https://api.canlii.org/v1/caseBrowse/{language}/{databaseId}/{caseId}/?api_key={key}
 *       -> { databaseId, caseId, url, title, citation, language, docketNumber, decisionDate, keywords, concatenatedId }
 *   https://api.canlii.org/v1/caseCitator/en/{databaseId}/{caseId}/citingCases?api_key={key}
 *       -> { citingCases: [{ databaseId, caseId: { en }, title, citation }] }   (citator: "en" only)
 * The documented caseId examples are "2008scc9" (database "csc-scc"),
 * "2014onca925" (database "onca") and "1999canlii1527".
 *
 * ON BY ITSELF WHEN CANLII_API_KEY IS SET, AND HARMLESS WHEN IT IS NOT. With no
 * key, no request is made and every function returns null. Any failure --
 * timeout, error, quota, database not reachable -- also returns null, so the
 * site never fails or waits on CanLII.
 *
 * LIMITS (CanLII's terms for our key): at most one request at a time, at most
 * two per second, at most 5,000 a day. Enforced twice: in this process (one
 * queue, 500 ms apart) and across every server instance through one database
 * lease (`canlii_acquire`, migration 20261007090000), with a daily cap of
 * 4,000 so we stop well before 5,000. Every answer is cached (memory, then the
 * `canlii_cache` table), so a repeat lookup does not call CanLII again.
 *
 * The key is read on the server only and is never logged: errors name the
 * endpoint path, never the URL that carries the key.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CANLII_API_HOST = "https://api.canlii.org/v1/";
export const DAILY_CAP = 4000;
export const MIN_GAP_MS = 500;
const LEASE_MS = 10_000;
const TIMEOUT_MS = 4000;
const CACHE_DAYS = { metadata: 30, citator: 7, databases: 30 } as const;

export function canliiEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.CANLII_API_KEY?.trim());
}

// ---- citations -----------------------------------------------------------------

export type CaseRef = { databaseId: string; caseId: string };

/**
 * A citation as a CanLII database and case id, or null when it cannot be read.
 * Neutral citations ("2014 ONCA 925", "2008 SCC 9") and CanLII citations
 * ("1999 CanLII 1527 (ON CA)") only. The Supreme Court's database is
 * "csc-scc" (documented); for any other court the database is the court
 * abbreviation in lower case, and a lookup is made only when CanLII's own list
 * of databases contains it.
 */
export function caseRefFromCitation(citation: string): CaseRef | null {
  const text = citation.replace(/\s+/g, " ").trim();
  const canlii = /\b(\d{4}) CanLII (\d+) \(([A-Z][A-Z ]*[A-Z])\)/i.exec(text);
  if (canlii) {
    return { databaseId: canlii[3].replace(/\s+/g, "").toLowerCase(), caseId: `${canlii[1]}canlii${canlii[2]}` };
  }
  const neutral = /\b(\d{4}) ([A-Z]{2,10}) (\d+)\b/.exec(text);
  if (!neutral || neutral[2].toUpperCase() === "CANLII") return null;
  const court = neutral[2].toLowerCase();
  return { databaseId: court === "scc" ? "csc-scc" : court, caseId: `${neutral[1]}${court}${neutral[3]}` };
}

// ---- the limiter -----------------------------------------------------------------

export type LimiterDeps = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** The cross-instance lease. Resolves false when it cannot be taken (busy, too soon, daily cap, or unreachable). */
  acquireRemote: () => Promise<boolean>;
  releaseRemote: () => Promise<void>;
};

/**
 * One request at a time, at least MIN_GAP_MS apart, at most DAILY_CAP a day in
 * this process; and the remote lease for every instance together. A call that
 * cannot get the lease after a short wait is skipped (null), never queued
 * without end.
 */
export function createLimiter(deps: LimiterDeps, cap = DAILY_CAP) {
  let chain: Promise<unknown> = Promise.resolve();
  let lastAt = -Infinity;
  let day = "";
  let count = 0;
  let inFlight = 0;
  let maxInFlight = 0;

  function run<T>(task: () => Promise<T>): Promise<T | null> {
    const next = chain.then(async () => {
      const today = new Date(deps.now()).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        count = 0;
      }
      if (count >= cap) return null;
      const wait = lastAt + MIN_GAP_MS - deps.now();
      if (wait > 0) await deps.sleep(wait);
      let leased = false;
      for (let attempt = 0; attempt < 6 && !leased; attempt += 1) {
        leased = await deps.acquireRemote().catch(() => false);
        if (!leased) await deps.sleep(MIN_GAP_MS);
      }
      if (!leased) return null;
      count += 1;
      lastAt = deps.now();
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        return await task();
      } finally {
        inFlight -= 1;
        await deps.releaseRemote().catch(() => undefined);
      }
    });
    chain = next.catch(() => undefined);
    return next.catch(() => null);
  }

  return { run, stats: () => ({ count, maxInFlight }) };
}

// ---- the server's database (cache and lease) ------------------------------------

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let limiter: ReturnType<typeof createLimiter> | null = null;
function serverLimiter() {
  if (limiter) return limiter;
  limiter = createLimiter({
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    acquireRemote: async () => {
      const db = adminClient();
      if (!db) return false;
      const { data, error } = await db.rpc("canlii_acquire", { max_per_day: DAILY_CAP, min_gap_ms: MIN_GAP_MS, lease_ms: LEASE_MS });
      return !error && data === true;
    },
    releaseRemote: async () => {
      const db = adminClient();
      if (db) await db.rpc("canlii_release");
    },
  });
  return limiter;
}

const memory = new Map<string, { payload: unknown; at: number }>();

async function cached<T>(key: string, days: number, load: () => Promise<T | null>): Promise<T | null> {
  const fresh = (at: number) => Date.now() - at < days * 86_400_000;
  const hit = memory.get(key);
  if (hit && fresh(hit.at)) return hit.payload as T;
  const db = adminClient();
  if (db) {
    const { data } = await db.from("canlii_cache").select("payload,fetched_at").eq("key", key).maybeSingle();
    if (data && fresh(Date.parse(data.fetched_at))) {
      memory.set(key, { payload: data.payload, at: Date.parse(data.fetched_at) });
      return data.payload as T;
    }
  }
  const loaded = await load();
  if (loaded !== null) {
    memory.set(key, { payload: loaded, at: Date.now() });
    if (db) await db.from("canlii_cache").upsert({ key, payload: loaded, fetched_at: new Date().toISOString() });
  }
  return loaded;
}

/** The one place a request is made. Only the API host, only these paths. */
async function apiGet(path: string): Promise<unknown | null> {
  const key = process.env.CANLII_API_KEY?.trim();
  if (!key) return null;
  if (!/^(caseBrowse\/en\/(?:[a-z0-9-]+\/[a-z0-9-]+\/)?|caseCitator\/en\/[a-z0-9-]+\/[a-z0-9-]+\/citingCases)$/.test(path)) return null;
  return serverLimiter().run(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${CANLII_API_HOST}${path}?api_key=${encodeURIComponent(key)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        console.error(`[canlii] ${path}: HTTP ${response.status}`);
        return null;
      }
      return (await response.json()) as unknown;
    } catch {
      console.error(`[canlii] ${path}: no answer`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

// ---- what the site asks ------------------------------------------------------------

export type CaseMetadata = {
  databaseId: string;
  caseId: string;
  title: string;
  citation: string;
  url: string;
  decisionDate: string | null;
};

async function databaseIds(): Promise<Set<string> | null> {
  const list = await cached("databases:en", CACHE_DAYS.databases, async () => {
    const body = (await apiGet("caseBrowse/en/")) as { caseDatabases?: { databaseId?: unknown }[] } | null;
    const ids = (body?.caseDatabases ?? []).map((item) => item.databaseId).filter((id): id is string => typeof id === "string");
    return ids.length ? ids : null;
  });
  return list ? new Set(list) : null;
}

/** Confirms a citation exists on CanLII and returns its proper title, citation, court database, date and link. */
export async function lookupCase(citation: string): Promise<CaseMetadata | null> {
  if (!canliiEnabled()) return null;
  const ref = caseRefFromCitation(citation);
  if (!ref) return null;
  return caseMetadata(ref);
}

/** Metadata for a case already identified by database and id (for example, one the citator returned). */
export async function caseMetadata(ref: CaseRef): Promise<CaseMetadata | null> {
  if (!canliiEnabled()) return null;
  const known = await databaseIds();
  if (!known?.has(ref.databaseId)) return null;
  return cached(`case:${ref.databaseId}:${ref.caseId}`, CACHE_DAYS.metadata, async () => {
    const body = (await apiGet(`caseBrowse/en/${ref.databaseId}/${ref.caseId}/`)) as Record<string, unknown> | null;
    if (!body || typeof body.title !== "string" || typeof body.citation !== "string" || typeof body.url !== "string") return null;
    return {
      databaseId: ref.databaseId,
      caseId: ref.caseId,
      title: body.title,
      citation: body.citation,
      url: body.url.replace(/^http:\/\//, "https://"),
      decisionDate: typeof body.decisionDate === "string" ? body.decisionDate : null,
    };
  });
}

export type CitingCases = { count: number; cases: { title: string; citation: string; databaseId: string; caseId: string }[] };

/**
 * Later decisions that cite this one (CanLII's citator). A pointer only:
 * being cited is not the same as being followed or upheld.
 */
export async function citingCases(ref: CaseRef): Promise<CitingCases | null> {
  if (!canliiEnabled()) return null;
  return cached(`citing:${ref.databaseId}:${ref.caseId}`, CACHE_DAYS.citator, async () => {
    const body = (await apiGet(`caseCitator/en/${ref.databaseId}/${ref.caseId}/citingCases`)) as {
      citingCases?: { databaseId?: unknown; caseId?: { en?: unknown }; title?: unknown; citation?: unknown }[];
    } | null;
    if (!body || !Array.isArray(body.citingCases)) return null;
    const cases = body.citingCases
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "",
        citation: typeof item.citation === "string" ? item.citation : "",
        databaseId: typeof item.databaseId === "string" ? item.databaseId : "",
        caseId: typeof item.caseId?.en === "string" ? item.caseId.en : "",
      }))
      .filter((item) => item.title && item.citation && item.databaseId && item.caseId);
    return { count: cases.length, cases };
  });
}
