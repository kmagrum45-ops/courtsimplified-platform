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
 * A few tries, then the caller says it didn't save.
 *
 * No AI, no network of its own: it uses the caller's database client.
 */

type Row = { master_result: unknown; updated_at: string | null };

/** Any Supabase client (server or browser); only `.from("cases")` is used. */
export type CaseRecordClient = unknown;

export type UpdateResult =
  | { ok: true; master: Record<string, unknown> }
  | { ok: false; reason: "not-found" | "conflict" | "error" | "rejected"; error?: string };

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

type Chain = { eq(column: string, value: string): Chain; maybeSingle(): Promise<{ data: Row | null; error: unknown }>; select(columns: string): Promise<{ data: unknown[] | null; error: unknown }> };

export async function updateMasterResult(
  supabase: CaseRecordClient,
  ids: { caseId: string; userId?: string },
  change: (master: Record<string, unknown>) => Record<string, unknown> | { reject: string },
  tries = 4,
): Promise<UpdateResult> {
  const db = supabase as { from(table: "cases"): { select(columns: string): Chain; update(values: Record<string, unknown>): Chain } };
  for (let attempt = 0; attempt < tries; attempt += 1) {
    let read = db.from("cases").select("master_result,updated_at").eq("id", ids.caseId);
    if (ids.userId) read = read.eq("user_id", ids.userId);
    const { data: fresh, error: readError } = await read.maybeSingle();
    if (readError) return { ok: false, reason: "error", error: String((readError as { message?: string }).message ?? readError) };
    if (!fresh) return { ok: false, reason: "not-found" };

    const changed = change(asRecord(fresh.master_result));
    if ("reject" in changed && typeof changed.reject === "string" && Object.keys(changed).length === 1) {
      return { ok: false, reason: "rejected", error: changed.reject };
    }
    const next = changed as Record<string, unknown>;

    let write = db.from("cases").update({ master_result: next, updated_at: new Date().toISOString() }).eq("id", ids.caseId);
    if (ids.userId) write = write.eq("user_id", ids.userId);
    if (fresh.updated_at) write = write.eq("updated_at", fresh.updated_at);
    const { data: written, error } = await write.select("id");
    if (error) return { ok: false, reason: "error", error: String((error as { message?: string }).message ?? error) };
    if (Array.isArray(written) && written.length > 0) return { ok: true, master: next };
    // Another save wrote first: read again and re-apply.
  }
  return { ok: false, reason: "conflict" };
}
