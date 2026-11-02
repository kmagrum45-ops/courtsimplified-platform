/**
 * THE SERVER'S SAVE OF FACT WRITES THROUGH THE ONE CASE-RECORD SAVE (case core G0; CASE_CORE_DESIGN.md §12).
 *
 * Used by POST /api/cases/facts, and by test:fact-rails with a stand-in database client. It re-reads the
 * row, applies the writes to what it read (factRecord.ts applyFactWrites: seq = highest stored + 1, the
 * server's time), and writes only if `updated_at` is unchanged; when another save landed first it reads
 * the new row and applies the writes again on top (updateCaseRecord.ts updateMasterResult). Every write in
 * a request was a conflict: nothing is written, and the conflicts are returned.
 *
 * No AI, no network of its own: it uses the caller's database client (the person's own token in the route).
 */
import { applyFactWrites, type FactConflict, type FactId, type FactRecords, type FactWrite, type FactWriteResult } from "./factRecord";
import { updateMasterResult, type CaseRecordClient } from "../updateCaseRecord";
import type { IntakeCourt } from "../intakeCheckpoint";

const NOTHING_TO_SAVE = "nothing-to-save";

export type FactSaveOutcome =
  | { ok: true; saved: { fact: FactId; seq: number; at: string }[]; conflicts: FactConflict[]; facts: FactRecords }
  | { ok: false; reason: "no-intake-checkpoint" | "rejected" | "not-found" | "conflict" | "error"; error?: string };

export async function saveFactWrites(
  client: CaseRecordClient,
  ids: { caseId: string; userId: string; court: IntakeCourt },
  writes: readonly FactWrite[],
  clock: () => Date = () => new Date(),
): Promise<FactSaveOutcome> {
  // The change runs once per attempt; the last attempt's result is the one written.
  let last: FactWriteResult | null = null;
  const saved = await updateMasterResult(client, { caseId: ids.caseId, userId: ids.userId, courtPath: ids.court }, (master) => {
    last = applyFactWrites(master, ids.court, ids.caseId, writes, clock());
    if (!last.ok) return { reject: last.reject };
    if (!last.saved.length) return { reject: NOTHING_TO_SAVE };
    return last.master;
  });
  const result = last as FactWriteResult | null;
  if (!saved.ok) {
    if (saved.reason === "rejected" && saved.error === NOTHING_TO_SAVE && result?.ok) return { ok: true, saved: [], conflicts: result.conflicts, facts: result.facts };
    if (saved.reason === "rejected" && saved.error === "no-intake-checkpoint") return { ok: false, reason: "no-intake-checkpoint" };
    return { ok: false, reason: saved.reason, ...(saved.error ? { error: saved.error } : {}) };
  }
  if (!result?.ok) return { ok: false, reason: "error", error: "no result" };
  return { ok: true, saved: result.saved, conflicts: result.conflicts, facts: result.facts };
}

/**
 * The intake court of an owned case row, for the writer's own write filter (updateMasterResult checks the
 * row's court, and the checkpoint must be that court's): the row's court column, when it is one of the
 * three intake courts. Kept here, in the case file module, so the route reads no court copy itself.
 */
export function intakeCourtOfRow(row: { court_path: string | null }): IntakeCourt | null {
  const court = row.court_path;
  return court === "small-claims" || court === "civil" || court === "family" ? court : null;
}
