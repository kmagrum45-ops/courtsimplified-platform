/**
 * The CanLII REST API, metadata only: case titles, citations, courts, dates
 * and the citator (which later decisions cite a case). Never decision text,
 * and never a canlii.org or canlii.ca page.
 *
 * This file has no imports, so the checks drive it with a fake fetch, a fake
 * clock and a fake lease (test:canlii). canliiServer.ts wires it to the real
 * fetch and to the database that holds the shared lease and the cache.
 *
 * ENDPOINTS, from CanLII's own documentation (github.com/canlii/API_documentation,
 * EN.md, cloned and read 2026-10-07). Only these three are ever requested:
 *   caseBrowse/{lang}/                       -> { caseDatabases: [{ databaseId, jurisdiction, name }] }
 *   caseBrowse/{lang}/{databaseId}/{caseId}/ -> { databaseId, caseId, url, title, citation, language,
 *                                                docketNumber, decisionDate, keywords, concatenatedId }
 *   caseCitator/en/{databaseId}/{caseId}/citingCases
 *                                            -> { citingCases: [{ databaseId, caseId: { en }, title, citation }] }
 * The citator supports "en" only. The documented caseId examples are
 * "2008scc9" (database "csc-scc"), "2014onca925" ("onca") and "1999canlii1527".
 * Calls must use HTTPS; answers over 10MB are refused by CanLII. The `url` in a
 * case's metadata comes back as http://canlii.ca/t/..., so it is rewritten to
 * https. The documentation also lists a per-database LIST of decisions
 * (caseBrowse/{lang}/{databaseId}/?offset=&resultCount=) -- that is a bulk
 * listing, and it is deliberately NOT allowed here (Terms s. 5.1).
 *
 * ON BY ITSELF WHEN CANLII_API_KEY IS SET, AND HARMLESS WHEN IT IS NOT. With no
 * key no request is made and every function returns null at once. Any
 * failure -- timeout, error, quota, lease unavailable -- also returns null, so
 * nothing on the site fails or waits on CanLII.
 *
 * LIMITS. CanLII's documentation gives no rate limit, so ours: at most one
 * request at a time, at most two a second (500 ms between starts), and at most
 * DAILY_CAP a day, stopping well short of 5,000. Enforced in this process AND
 * across every server instance by one database lease (canlii_acquire,
 * migration 20261007090000) -- Vercel runs several copies, and a limiter in
 * one copy cannot see the others.
 *
 * THE KEY is read on the server only and never logged: errors name the
 * endpoint path, never the URL that carries the key.
 */

export const CANLII_API_ORIGIN = "https://api.canlii.org";
const API_BASE = `${CANLII_API_ORIGIN}/v1/`;

/** CanLII's limit for our key is 5,000 a day; we stop here. */
export const DAILY_CAP = 4000;
/** At most two requests a second: a start at least this far after the last. */
export const MIN_GAP_MS = 500;
/** The shared lease lasts this long if a holder dies without giving it back. */
export const LEASE_MS = 10_000;
/** A request with no answer by then is abandoned. */
export const TIMEOUT_MS = 4000;
/** How long a call may wait for another server's call to finish before giving up. */
export const MAX_LEASE_WAIT_MS = 1500;
/** Calls waiting in this process beyond this are skipped, not queued. */
export const MAX_WAITING = 8;
/** CanLII refuses answers over 10MB; anything near that is not metadata. */
export const MAX_RESPONSE_BYTES = 1_000_000;

export const CACHE_MS = {
  databases: 30 * 86_400_000,
  metadata: 30 * 86_400_000,
  citator: 7 * 86_400_000,
  notFound: 1 * 86_400_000,
} as const;

export function canliiEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.CANLII_API_KEY?.trim());
}

// ---- hosts ---------------------------------------------------------------------

/**
 * True for any canlii.org or canlii.ca address except the API host. Decision
 * TEXT lives there, and the site never fetches it, by any means (CanLII Terms
 * s. 5.1). Every script that fetches URLs taken from data calls
 * refuseCanliiContent first (test:canlii checks that they do).
 */
export function isCanliiContentUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return /canlii\.(org|ca)/i.test(url);
  }
  if (host === "api.canlii.org") return false;
  return host === "canlii.org" || host === "canlii.ca" || host.endsWith(".canlii.org") || host.endsWith(".canlii.ca");
}

export function refuseCanliiContent(url: string): void {
  if (isCanliiContentUrl(url)) {
    throw new Error(`Refused: CanLII content is never fetched (CanLII Terms of Use s. 5.1): ${url}`);
  }
}

/** The only API paths ever requested: the list of courts, one case, one case's citing cases. */
const ALLOWED_PATH =
  /^(?:caseBrowse\/en\/|caseBrowse\/en\/[a-z0-9-]+\/[a-z0-9-]+\/|caseCitator\/en\/[a-z0-9-]+\/[a-z0-9-]+\/citingCases)$/;

export function isAllowedApiPath(path: string): boolean {
  return ALLOWED_PATH.test(path);
}

// ---- citations -------------------------------------------------------------------

export type CaseRef = { databaseId: string; caseId: string };

/**
 * A citation as a CanLII database and case id, or null when it cannot be read.
 * Neutral citations ("2014 ONCA 925", "2008 SCC 9") and CanLII citations
 * ("1999 CanLII 1527 (ON CA)"). The Supreme Court's database is "csc-scc"
 * (documented); for any other court the database is taken to be the court's
 * abbreviation in lower case, and a lookup is made only when CanLII's own list
 * of databases contains it. Report citations ("[1999] 1 S.C.R. 201") give no
 * CanLII id and return null.
 */
export function caseRefFromCitation(citation: string): CaseRef | null {
  const text = citation.replace(/\s+/g, " ").trim();
  const canlii = /\b(\d{4}) CanLII (\d+) \(([A-Za-z][A-Za-z ]*[A-Za-z])\)/i.exec(text);
  if (canlii) {
    return { databaseId: canlii[3].replace(/\s+/g, "").toLowerCase(), caseId: `${canlii[1]}canlii${canlii[2]}` };
  }
  const neutral = /\b((?:19|20)\d{2}) ([A-Z]{2,10}) (\d{1,6})\b/.exec(text);
  if (!neutral || neutral[2] === "CANLII") return null;
  const court = neutral[2].toLowerCase();
  return { databaseId: court === "scc" ? "csc-scc" : court, caseId: `${neutral[1]}${court}${neutral[3]}` };
}

// ---- the limiter ---------------------------------------------------------------------

/** The shared lease: a token when taken, "busy" when another call holds it or it is too soon, "unavailable" when it cannot be reached. */
export type LeaseResult = { token: string } | "busy" | "unavailable";

export type LimiterDeps = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  acquire: () => Promise<LeaseResult>;
  release: (token: string) => Promise<void>;
};

/**
 * One request at a time, starts at least MIN_GAP_MS apart, at most `cap` a
 * day in this process -- and the shared lease for every instance together.
 * A call that cannot get the lease within MAX_LEASE_WAIT_MS, or arrives when
 * MAX_WAITING are already waiting, is skipped (null), never queued without end.
 */
export function createLimiter(deps: LimiterDeps, cap = DAILY_CAP) {
  let chain: Promise<unknown> = Promise.resolve();
  let lastStart = -Infinity;
  let day = "";
  let count = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  let waiting = 0;
  const starts: number[] = [];

  function run<T>(task: () => Promise<T>): Promise<T | null> {
    if (waiting >= MAX_WAITING) return Promise.resolve(null);
    waiting += 1;
    const next = chain.then(async (): Promise<T | null> => {
      waiting -= 1;
      const today = new Date(deps.now()).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        count = 0;
      }
      if (count >= cap) return null;
      const gap = lastStart + MIN_GAP_MS - deps.now();
      if (gap > 0) await deps.sleep(gap);

      let lease: LeaseResult = "busy";
      const giveUpAt = deps.now() + MAX_LEASE_WAIT_MS;
      for (;;) {
        lease = await deps.acquire().catch(() => "unavailable" as const);
        if (typeof lease === "object" || lease === "unavailable" || deps.now() >= giveUpAt) break;
        await deps.sleep(MIN_GAP_MS);
      }
      if (typeof lease !== "object") return null;

      count += 1;
      lastStart = deps.now();
      starts.push(lastStart);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        return await task();
      } finally {
        inFlight -= 1;
        await deps.release(lease.token).catch(() => undefined);
      }
    });
    chain = next.catch(() => undefined);
    return next.catch(() => null);
  }

  return { run, stats: () => ({ count, maxInFlight, starts: [...starts] }) };
}

export type Limiter = ReturnType<typeof createLimiter>;

// ---- the client -------------------------------------------------------------------------

export type CacheStore = {
  get: (key: string) => Promise<{ payload: unknown; fetchedAt: number } | null>;
  set: (key: string, payload: unknown) => Promise<void>;
};

export type CanliiDeps = {
  env: Record<string, string | undefined>;
  fetch: (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{
    ok: boolean;
    status: number;
    headers: { get: (name: string) => string | null };
    text: () => Promise<string>;
  }>;
  limiter: Limiter;
  store: CacheStore | null;
  now: () => number;
  log?: (message: string) => void;
};

export type CaseMetadata = {
  databaseId: string;
  caseId: string;
  title: string;
  citation: string;
  /** canlii.ca short link, https. A link for the person to click; never fetched. */
  url: string;
  decisionDate: string | null;
  /** The court's name from CanLII's list of databases. */
  court: string | null;
};

export type CitingCase = { title: string; citation: string; databaseId: string; caseId: string };
export type CitingCases = { count: number; cases: CitingCase[] };

type Answer = { kind: "ok"; body: unknown } | { kind: "not-found" } | null;
type Cached<T> = { found: true; value: T } | { found: false };

export function createCanliiClient(deps: CanliiDeps) {
  const log = deps.log ?? ((message: string) => console.error(message));
  const memory = new Map<string, { payload: unknown; fetchedAt: number }>();

  /** The one place a request is made. Only the API host, only the allowed paths. */
  async function apiGet(path: string): Promise<Answer> {
    const key = deps.env.CANLII_API_KEY?.trim();
    if (!key || !isAllowedApiPath(path)) return null;
    return deps.limiter.run(async (): Promise<Answer> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await deps.fetch(`${API_BASE}${path}?api_key=${encodeURIComponent(key)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (response.status === 404) return { kind: "not-found" };
        if (!response.ok) {
          log(`[canlii] ${path}: HTTP ${response.status}`);
          return null;
        }
        if (Number(response.headers.get("content-length") ?? 0) > MAX_RESPONSE_BYTES) {
          log(`[canlii] ${path}: answer too large`);
          return null;
        }
        const text = await response.text();
        if (text.length > MAX_RESPONSE_BYTES) return null;
        const body = JSON.parse(text) as unknown;
        if (body && typeof body === "object" && "error" in body) {
          log(`[canlii] ${path}: ${String((body as { error: unknown }).error).slice(0, 40)}`);
          return null;
        }
        return { kind: "ok", body };
      } catch {
        log(`[canlii] ${path}: no answer`);
        return null;
      } finally {
        clearTimeout(timer);
      }
    });
  }

  /**
   * Memory, then the shared cache table, then CanLII. A "not found" answer is
   * remembered for a day so a mistyped citation does not cost a call each time.
   */
  async function cached<T>(key: string, maxAge: number, load: () => Promise<Answer>, read: (body: unknown) => T | null): Promise<Cached<T> | null> {
    const fresh = (entry: { payload: unknown; fetchedAt: number }) => {
      const isMiss = (entry.payload as { notFound?: unknown } | null)?.notFound === true;
      return deps.now() - entry.fetchedAt < (isMiss ? CACHE_MS.notFound : maxAge);
    };
    const settle = (payload: unknown): Cached<T> | null => {
      if ((payload as { notFound?: unknown } | null)?.notFound === true) return { found: false };
      const value = read(payload);
      return value === null ? null : { found: true, value };
    };

    const inMemory = memory.get(key);
    if (inMemory && fresh(inMemory)) return settle(inMemory.payload);
    const stored = deps.store ? await deps.store.get(key).catch(() => null) : null;
    if (stored && fresh(stored)) {
      memory.set(key, stored);
      return settle(stored.payload);
    }

    const answer = await load();
    if (!answer) return null;
    const payload = answer.kind === "not-found" ? { notFound: true } : answer.body;
    const settled = settle(payload);
    if (settled) {
      const keep = settled.found ? settled.value : payload;
      memory.set(key, { payload: keep, fetchedAt: deps.now() });
      if (deps.store) await deps.store.set(key, keep).catch(() => undefined);
    }
    return settled;
  }

  async function courtNames(): Promise<Map<string, string> | null> {
    const result = await cached(
      "databases:en",
      CACHE_MS.databases,
      () => apiGet("caseBrowse/en/"),
      (body) => {
        const list = (body as { caseDatabases?: { databaseId?: unknown; name?: unknown }[] } | null)?.caseDatabases;
        if (!Array.isArray(list)) return null;
        const rows = list
          .filter((item) => typeof item?.databaseId === "string")
          .map((item) => ({ databaseId: item.databaseId as string, name: typeof item.name === "string" ? item.name : "" }));
        return rows.length ? { caseDatabases: rows } : null;
      },
    );
    if (!result?.found) return null;
    return new Map(result.value.caseDatabases.map((row) => [row.databaseId, row.name]));
  }

  /** Metadata for a case identified by database and id. Null when unknown, off, or CanLII does not answer. */
  async function caseMetadata(ref: CaseRef): Promise<CaseMetadata | null> {
    if (!canliiEnabled(deps.env)) return null;
    if (!/^[a-z0-9-]+$/.test(ref.databaseId) || !/^[a-z0-9-]+$/.test(ref.caseId)) return null;
    const courts = await courtNames();
    if (!courts?.has(ref.databaseId)) return null;
    const result = await cached(
      `case:${ref.databaseId}:${ref.caseId}`,
      CACHE_MS.metadata,
      () => apiGet(`caseBrowse/en/${ref.databaseId}/${ref.caseId}/`),
      (body) => {
        const record = body as Record<string, unknown> | null;
        if (!record || typeof record.title !== "string" || typeof record.citation !== "string" || typeof record.url !== "string") {
          return null;
        }
        return {
          databaseId: ref.databaseId,
          caseId: ref.caseId,
          title: record.title,
          citation: record.citation,
          url: record.url.replace(/^http:\/\//i, "https://"),
          decisionDate: typeof record.decisionDate === "string" ? record.decisionDate : null,
        };
      },
    );
    if (!result?.found) return null;
    return { ...result.value, url: result.value.url.replace(/^http:\/\//i, "https://"), court: courts.get(ref.databaseId) || null };
  }

  /** Confirms a citation exists on CanLII and returns its proper title, citation, court, date and link. */
  async function lookupCase(citation: string): Promise<CaseMetadata | null> {
    if (!canliiEnabled(deps.env)) return null;
    const ref = caseRefFromCitation(citation);
    return ref ? caseMetadata(ref) : null;
  }

  /** Later decisions that cite this one. A pointer only: being cited is not being followed or upheld. */
  async function citingCases(ref: CaseRef): Promise<CitingCases | null> {
    if (!canliiEnabled(deps.env)) return null;
    if (!/^[a-z0-9-]+$/.test(ref.databaseId) || !/^[a-z0-9-]+$/.test(ref.caseId)) return null;
    const result = await cached(
      `citing:${ref.databaseId}:${ref.caseId}`,
      CACHE_MS.citator,
      () => apiGet(`caseCitator/en/${ref.databaseId}/${ref.caseId}/citingCases`),
      (body) => {
        const list = (body as { citingCases?: unknown } | null)?.citingCases;
        if (!Array.isArray(list)) return null;
        const cases = list
          .map((item: { databaseId?: unknown; caseId?: { en?: unknown } | unknown; title?: unknown; citation?: unknown }) => ({
            title: typeof item?.title === "string" ? item.title : "",
            citation: typeof item?.citation === "string" ? item.citation : "",
            databaseId: typeof item?.databaseId === "string" ? item.databaseId : "",
            caseId:
              typeof (item?.caseId as { en?: unknown } | undefined)?.en === "string"
                ? ((item.caseId as { en: string }).en)
                : typeof item?.caseId === "string"
                  ? (item.caseId as string)
                  : "",
          }))
          .filter((item) => item.title && item.citation && item.databaseId && item.caseId);
        return { citingCases: cases };
      },
    );
    if (!result?.found) return null;
    const cases = (result.value as { citingCases: CitingCase[] }).citingCases;
    return { count: cases.length, cases };
  }

  return { lookupCase, caseMetadata, citingCases, apiGet };
}

export type CanliiClient = ReturnType<typeof createCanliiClient>;
