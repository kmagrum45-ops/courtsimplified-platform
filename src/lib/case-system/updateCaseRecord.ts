/**
 * Change one part of a saved case without erasing what another save wrote at
 * the same moment (2026-10-13).
 *
 * WHY. Every part of a case (the stage the person confirmed, the dates they
 * gave, their forms answers, their drafts, the case reader's reading) lives in
 * one record, `cases.master_result`, and each route wrote it by reading the
 * whole record, changing its own part and writing the whole record back. Two
 * of those at once and the slower one erased the faster one's change. The
 * walkthrough's "asks again" failures on reload came from this: the case
 * reader takes several seconds between its read and its write, which is
 * exactly when the person confirms their stage and dates on the results page.
 * Some routes also wrote without stamping `updated_at`, so the check the
 * position route already had could not see them.
 *
 * HOW. Read the record and its `updated_at`; apply the change to what was
 * read; write only if `updated_at` is still the one read, stamping a new one.
 * If another save got there first, read again and re-apply the change on top.
 * A few tries, with a short pause between them, then the caller says it
 * didn't save.
 *
 * No AI, no network of its own: it uses the caller's database client.
 */

type Row = { master_result: unknown; updated_at: string | null };

/** Any Supabase client (server or browser); only `.from("cases")` is used. */
export type CaseRecordClient = unknown;

export type UpdateResult =
  | { ok: true; master: Record<string, unknown> }
  | { ok: false; reason: "not-found" | "conflict" | "error" | "rejected"; error?: string; code?: string };

/** The parts of a client error worth keeping: its message, and a database or PostgREST code when the database answered. */
function describe(error: unknown): { error: string; code?: string } {
  const record = (error && typeof error === "object" ? error : {}) as { message?: unknown; code?: unknown };
  const code = typeof record.code === "string" && record.code ? record.code : undefined;
  return { error: String(record.message ?? error), ...(code ? { code } : {}) };
}

/**
 * A request given up after `ms` (2026-10-14): supabase-js has no timeout of
 * its own, and a browser write that never answered held the case's one write
 * queue (positionSave.ts runCaseWrite) for good. Applied only when the client
 * offers abortSignal (test doubles may not).
 */
function within<T>(builder: T, ms: number | undefined): T {
  const withSignal = builder as T & { abortSignal?: (signal: AbortSignal) => T };
  return ms && typeof withSignal.abortSignal === "function" ? withSignal.abortSignal(AbortSignal.timeout(ms)) : builder;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

type Chain = { eq(column: string, value: string): Chain; maybeSingle(): Promise<{ data: Row | null; error: unknown }>; select(columns: string): Promise<{ data: unknown[] | null; error: unknown }> };

export type UpdateOptions = {
  /** Each read and write is given up after this long (the browser's callers; a server route leaves it unset). */
  requestTimeoutMs?: number;
};

export async function updateMasterResult(
  supabase: CaseRecordClient,
  ids: { caseId: string; userId?: string },
  change: (master: Record<string, unknown>) => Record<string, unknown> | { reject: string },
  tries = 4,
  options: UpdateOptions = {},
): Promise<UpdateResult> {
  const db = supabase as { from(table: "cases"): { select(columns: string): Chain; update(values: Record<string, unknown>): Chain } };
  for (let attempt = 0; attempt < tries; attempt += 1) {
    let read = db.from("cases").select("master_result,updated_at").eq("id", ids.caseId);
    if (ids.userId) read = read.eq("user_id", ids.userId);
    const { data: fresh, error: readError } = await within(read, options.requestTimeoutMs).maybeSingle();
    if (readError) return { ok: false, reason: "error", ...describe(readError) };
    if (!fresh) return { ok: false, reason: "not-found" };

    const changed = change(asRecord(fresh.master_result));
    if ("reject" in changed && typeof changed.reject === "string" && Object.keys(changed).length === 1) {
      return { ok: false, reason: "rejected", error: changed.reject };
    }
    const next = changed as Record<string, unknown>;

    let write = db.from("cases").update({ master_result: next, updated_at: new Date().toISOString() }).eq("id", ids.caseId);
    if (ids.userId) write = write.eq("user_id", ids.userId);
    if (fresh.updated_at) write = write.eq("updated_at", fresh.updated_at);
    const { data: written, error } = await within(write, options.requestTimeoutMs).select("id");
    if (error) return { ok: false, reason: "error", ...describe(error) };
    if (Array.isArray(written) && written.length > 0) return { ok: true, master: next };
    // Another save wrote first: read again and re-apply, after a short,
    // growing, jittered pause (2026-10-14), so two writers that keep losing
    // to each other do not re-read and re-send the whole record back to back.
    if (attempt + 1 < tries) await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1) + Math.floor(Math.random() * 60)));
  }
  return { ok: false, reason: "conflict" };
}
