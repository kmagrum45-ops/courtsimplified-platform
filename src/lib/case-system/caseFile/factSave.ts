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
import { updateMasterResult, type CaseRecordClient, type UpdateResult } from "../updateCaseRecord";
import { factOfField } from "./fieldFacts";
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


/**
 * THE POSITION'S FACTS (case core G2): the kind of claim and the dates a position save writes, as fact writes,
 * by the one field-to-fact table (fieldFacts.ts: position.claimKind, position.dateAnswers keyed by the stage map's
 * question ids). A date key that maps to no single fact is left to the position alone. Each is sent as the newest
 * save (force): the position save is the person's latest word on it, ordered by the server like any other.
 */
export function positionFactWrites(patch: { claimKind?: unknown; dateAnswers?: unknown }, kept?: unknown): FactWrite[] {
  // `kept`: the position as the save kept it; a value the save did not keep (a date the case file holds from another
  // answer, stripped by the route) is not written as a fact either.
  const keptPosition = kept && typeof kept === "object" ? (kept as { claimKind?: unknown; dateAnswers?: Record<string, unknown> }) : null;
  const writes: FactWrite[] = [];
  const seen = new Set<FactId>();
  const add = (fact: FactId, value: string, question: string) => {
    if (seen.has(fact)) return;
    seen.add(fact);
    writes.push({ fact, state: "answered", value, source: "person", question, force: true });
  };
  const kind = factOfField("position", "claimKind");
  if ("fact" in kind && typeof patch.claimKind === "string" && patch.claimKind.trim() && (!keptPosition || keptPosition.claimKind === patch.claimKind)) add(kind.fact, patch.claimKind, "position:claimKind");
  const dates = patch.dateAnswers && typeof patch.dateAnswers === "object" && !Array.isArray(patch.dateAnswers) ? (patch.dateAnswers as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(dates)) {
    const mapped = factOfField("position", "dateAnswers", key);
    if ("fact" in mapped && typeof value === "string" && value.trim() && (!keptPosition || keptPosition.dateAnswers?.[key] === value)) add(mapped.fact, value, `position:${key}`);
  }
  return writes;
}

/**
 * ONE GUARDED SAVE OF A SCREEN'S OLD COPY AND THE FACTS IT ANSWERS (case core G2; design §11, coexistence).
 *
 * `change` writes the old copy as before (the position); `writes` (or a function of the changed record, for writes
 * that depend on what the change kept) are applied on top by applyFactWrites, in the same compare-and-set
 * (updateMasterResult), so the two never disagree. A case with no intake checkpoint (or a court outside the three
 * intake courts) keeps the old copy only; a fact the case file cannot read leaves the old copy saved without it.
 *
 * `sendFacts` (the browser's direct save): the save runs in the browser, which never numbers a fact (design §12), so
 * the old copy is saved here and its facts are then sent to POST /api/cases/facts, where the server numbers them. A
 * send that fails leaves the old copy saved and the fact unrecorded until it is given again (said, not hidden).
 */
export async function saveWithFacts(
  client: CaseRecordClient,
  ids: { caseId: string; userId?: string; court: IntakeCourt | null },
  change: (master: Record<string, unknown>) => Record<string, unknown> | { reject: string },
  writes: readonly FactWrite[] | ((changed: Record<string, unknown>) => readonly FactWrite[]),
  clock: () => Date = () => new Date(),
  options: { tries?: number; requestTimeoutMs?: number; sendFacts?: (writes: readonly FactWrite[]) => Promise<void> } = {},
): Promise<UpdateResult> {
  let toSend: readonly FactWrite[] = [];
  const result = await updateMasterResult(
    client,
    { caseId: ids.caseId, ...(ids.userId ? { userId: ids.userId } : {}) },
    (master) => {
      const changed = change(master);
      if ("reject" in changed && typeof changed.reject === "string" && Object.keys(changed).length === 1) return changed;
      const next = changed as Record<string, unknown>;
      const list = typeof writes === "function" ? writes(next) : writes;
      if (!ids.court || !list.length) return next;
      if (options.sendFacts) { toSend = list; return next; }
      const applied = applyFactWrites(next, ids.court, ids.caseId, list, clock());
      return applied.ok ? applied.master : next;
    },
    options.tries ?? 4,
    options.requestTimeoutMs ? { requestTimeoutMs: options.requestTimeoutMs } : {},
  );
  if (result.ok && toSend.length && options.sendFacts) await options.sendFacts(toSend).catch(() => {});
  return result;
}
