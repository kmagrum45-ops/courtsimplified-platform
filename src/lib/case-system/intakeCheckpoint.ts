/** Intake answers and explicit review transitions on the existing owned case record. */
import { confirmedAnswerChanged, existingFactChanged, inputRevision, reconcileReview, reviewPhase, transitionReview } from "./intakeReview";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateMasterResult } from "./updateCaseRecord";
import { CASE_REQUEST_TIMEOUT_MS, runCaseWrite } from "../../../app/builder/_components/positionSave";
import { GUEST_INTAKE_SESSION_KEY } from "./storage/intakeStorageKeys";
import { withStoredFacts } from "./caseFile/serverFacts";

export type IntakeCourt = "small-claims" | "family" | "civil";
export type Checkpoint = {
  version: 1;
  flowId: string;
  courtPath: IntakeCourt;
  revision: string;
  inputRevision?: string;
  /**
   * Renewed on every change of the material facts, including an answer added after Confirm,
   * which keeps `inputRevision` (D1). Guidance built from earlier facts is outdated
   * (intakeReview.ts guidanceIsCurrent); absent, it is `inputRevision` (factsRevision()).
   */
  factsRevision?: string;
  sections: Record<string, Record<string, unknown>>;
};
export type IntakeSession = {
  version: 2;
  ownerId: string | null;
  caseId: string | null;
  serverRevision: string | null;
  /** Guest-only mirror; authenticated workflowStatus lives on the case record. */
  workflowStatus?: Record<string, unknown>;
  /** Signed in: something entered here has not reached the account yet. */
  pending?: boolean;
  /** A guest intake brought into this account at sign-in (guestCarry.ts) that has not created its case yet. */
  carried?: boolean;
  checkpoint: Checkpoint;
};
export type CheckpointRow = { id: string; user_id: string; court_path: string; current_stage?: string; master_result: Record<string, unknown> };
type Db = Pick<SupabaseClient, "from">;
export const MAX_CHECKPOINT_BYTES = 500_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const intakeId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
export const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 30) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 2_000 && value.every((item) => safeJson(item, depth + 1));
  return Boolean(value && typeof value === "object" && Object.keys(value).length <= 2_000 &&
    Object.entries(value).every(([key, item]) => !["__proto__", "prototype", "constructor"].includes(key) && safeJson(item, depth + 1)));
}

export function readCheckpoint(value: unknown, court: IntakeCourt, flowId?: string): Checkpoint | null {
  const item = record(value);
  try {
    if (item.version !== 1 || item.courtPath !== court || !intakeId(item.flowId) || !intakeId(item.revision) ||
      (flowId && item.flowId !== flowId) || (item.inputRevision !== undefined && !intakeId(item.inputRevision)) || (item.factsRevision !== undefined && !intakeId(item.factsRevision)) || !item.sections || Array.isArray(item.sections) || typeof item.sections !== "object" ||
      !safeJson(item.sections) || new TextEncoder().encode(JSON.stringify(item)).length > MAX_CHECKPOINT_BYTES) return null;
    if (Object.values(item.sections).some((section) => !section || typeof section !== "object" || Array.isArray(section))) return null;
    return item as Checkpoint;
  } catch { return null; }
}

export function readIntakeSession(storage: Pick<Storage, "getItem">, flowId: string, ownerId: string | null, court: IntakeCourt): IntakeSession | null {
  try {
    const value = record(JSON.parse(storage.getItem(GUEST_INTAKE_SESSION_KEY) || "null"));
    const checkpoint = readCheckpoint(value.checkpoint, court, flowId);
    if (value.version !== 2 || value.ownerId !== ownerId || !checkpoint ||
        (value.caseId !== null && value.caseId !== flowId) || (value.serverRevision !== null && !intakeId(value.serverRevision))) return null;
    return { version: 2, ownerId, checkpoint, caseId: value.caseId as string | null, serverRevision: value.serverRevision as string | null, ...(ownerId === null && safeJson(value.workflowStatus) ? { workflowStatus: record(value.workflowStatus) } : {}),
      ...(ownerId !== null && value.carried === true && value.caseId === null ? { carried: true } : {}) };
  } catch { return null; }
}

export function writeIntakeSession(storage: Pick<Storage, "setItem">, value: IntakeSession): boolean {
  try {
    if (!readCheckpoint(value.checkpoint, value.checkpoint.courtPath, value.checkpoint.flowId)) return false;
    storage.setItem(GUEST_INTAKE_SESSION_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export async function loadCheckpointCase(db: Db, id: string, ownerId: string, court: IntakeCourt): Promise<CheckpointRow | null> {
  const { data, error } = await db.from("cases").select("id,user_id,court_path,current_stage,master_result")
    .eq("id", id).eq("user_id", ownerId).abortSignal(AbortSignal.timeout(CASE_REQUEST_TIMEOUT_MS)).maybeSingle();
  if (error) throw new Error("Your selected case could not be loaded. Please retry.");
  if (!data || data.user_id !== ownerId || data.court_path !== court) return null;
  return { ...data, master_result: record(data.master_result) } as CheckpointRow;
}

export async function saveCheckpoint(db: Db, ownerId: string, caseId: string, snapshot: Checkpoint, expectedRevision: string | null, current: () => boolean, materialEdited = false, fromReview = false) {
  if (!readCheckpoint(snapshot, snapshot.courtPath, caseId)) return { ok: false as const, reason: "rejected" as const, error: "intake-invalid" };
  return runCaseWrite(caseId, () => updateMasterResult(db, { caseId, userId: ownerId, courtPath: snapshot.courtPath }, (master) => {
    if (!current()) return { reject: "intake-cancelled" };
    const existing = record(master.intakeCheckpoint);
    if (existing.revision === snapshot.revision) return { reject: "intake-unchanged" };
    if ((existing.revision ?? null) !== expectedRevision) return { reject: "intake-conflict" };
    // Preserve every unrelated case field, including completed-case state.
    const previous = readCheckpoint(master.intakeCheckpoint, snapshot.courtPath, caseId);
    // The fact record is the server's (G2(c), serverFacts.ts): the stored record is kept exactly, whatever the tab's
    // snapshot holds, and the checks below compare against it. Before G2 the snapshot was written whole and erased the
    // record written since (intakeCheckpoint.ts:115, cause read on staging, 1 Nov).
    const tab = { ...snapshot, sections: withStoredFacts(snapshot.sections, existing.sections) };
    const workflow = record(master.workflowStatus);
    const proof = record(workflow.intakeReview);
    /*
     * A safety net for a caller that changes the facts without a new input revision.
     * It counts only a changed or removed answer, never a field getting its first
     * value: a form registering its defaults (an empty field, a stage read from the
     * story) cancelled the confirmation on the first "Show my next step" (re-test
     * 2026-10-18).
     */
    // Once confirmed, the same rule as the browser (confirmedAnswerChanged): only an answer that was
    // confirmed, changed or removed. Against the last save, a box typed into after Confirm counted
    // each save as a change and cancelled it (Chrome check of #514's preview, 29 Oct).
    const confirmedNow = Boolean(previous && reviewPhase(workflow, previous) === "user-confirmed");
    const mustRenew = Boolean(previous && (proof.reviewedRevision || proof.confirmedRevision) && inputRevision(previous) === inputRevision(tab) && (confirmedNow ? confirmedAnswerChanged(workflow, previous!, tab) : existingFactChanged(previous!, tab)));
    const committed = mustRenew ? { ...tab, inputRevision: tab.revision } : tab;
    const changed = materialEdited || Boolean(previous && inputRevision(previous) !== inputRevision(committed));
    return { ...master, intakeCheckpoint: committed, ...(changed ? { workflowStatus: reconcileReview(workflow, previous ?? snapshot, committed, fromReview) } : {}) };
  }, 2, { requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS }));
}

export async function createCheckpointCase(db: Db, ownerId: string, snapshot: Checkpoint) {
  const { error } = await db.from("cases").insert({
    id: snapshot.flowId, user_id: ownerId, court_path: snapshot.courtPath,
    title: "Unfinished intake", status: "active", current_stage: "not-sure",
    master_result: { source: "builder-created-shell", lifecycleStage: "intake-started", workflowStatus: { intakeCompleted: false, intakeReview: { version: 1 } }, intakeCheckpoint: { ...snapshot, sections: withStoredFacts(snapshot.sections, {}) } },
  }).abortSignal(AbortSignal.timeout(CASE_REQUEST_TIMEOUT_MS)).select("id").single();
  if (!error) return;
  // An interrupted INSERT may have succeeded. Retry the SAME id, never another case.
  const existing = await loadCheckpointCase(db, snapshot.flowId, ownerId, snapshot.courtPath);
  if (record(existing?.master_result.intakeCheckpoint).revision !== snapshot.revision) throw new Error("Your intake could not be saved. Your text is still in this tab; please retry.");
}

/** Small projection: checking a response must not download a completed case again. */
export async function checkpointMatches(db: Db, caseId: string, ownerId: string, court: IntakeCourt, revision: string | null) {
  const { data, error } = await db.from("cases").select("user_id,court_path,revision:master_result->intakeCheckpoint->>revision")
    .eq("id", caseId).eq("user_id", ownerId).abortSignal(AbortSignal.timeout(CASE_REQUEST_TIMEOUT_MS)).maybeSingle();
  if (error) throw new Error("Your saved intake could not be checked. Your answers remain here; reconnect and retry.");
  return Boolean(data && data.user_id === ownerId && data.court_path === court && data.revision === revision);
}

/** The only new-confirmation writer. Uses the same owned row, queue and CAS as every checkpoint. */
export async function saveReviewTransition(db: Db, ownerId: string, caseId: string, snapshot: Checkpoint, action: "review" | "collect" | "confirm", expectedInput: string, current: () => boolean) {
  return runCaseWrite(caseId, () => updateMasterResult(db, { caseId, userId: ownerId, courtPath: snapshot.courtPath }, master => {
    if (!current()) return { reject: "intake-cancelled" };
    const saved = readCheckpoint(master.intakeCheckpoint, snapshot.courtPath, caseId);
    if (!saved || saved.revision !== snapshot.revision || inputRevision(saved) !== expectedInput) return { reject: "intake-conflict" };
    // The saved case too: Confirm needs only what the review asks, and the review reads the saved position (a kind of claim picked on the overview).
    try { return { ...master, workflowStatus: transitionReview(record(master.workflowStatus), saved, action, expectedInput, new Date().toISOString(), master) }; }
    catch { return { reject: "intake-review-required" }; }
  }, 2, { requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS }));
}

/** A review action the store could not save (its answer was an error), kept so the retry can finish it. */
export type PendingTransition = { action: "review" | "collect" | "confirm"; expectedInput: string };

/** Whether the saved case already records this review action for these answers (its save landed although it answered an error). */
export function transitionLanded(master: Record<string, unknown>, court: IntakeCourt, caseId: string, pending: PendingTransition): boolean {
  const saved = readCheckpoint(master.intakeCheckpoint, court, caseId);
  if (!saved || inputRevision(saved) !== pending.expectedInput) return false;
  const workflow = record(master.workflowStatus);
  const review = record(workflow.intakeReview);
  if (pending.action === "confirm") return reviewPhase(workflow, saved) === "user-confirmed" && review.confirmedRevision === pending.expectedInput;
  if (pending.action === "review") return review.reviewedRevision === pending.expectedInput;
  return !review.reviewedRevision && !review.confirmedRevision;
}

/**
 * "Retry saving intake" after a review action whose save answered an error (Chrome check of #544 on a8c8cf57, 7 Nov,
 * step 19: four retries over three minutes never cleared "Your review could not be saved", yet the case was confirmed).
 * The saved case is read back first: when the action is already there, it is taken as saved and nothing is written
 * again; when it is not, the action is sent again through the one writer (saveReviewTransition).
 */
export async function retryReviewTransition(db: Db, ownerId: string, caseId: string, snapshot: Checkpoint, pending: PendingTransition, current: () => boolean): Promise<{ ok: true; master: Record<string, unknown>; landed: boolean } | { ok: false; reason: string; error?: string }> {
  const row = await loadCheckpointCase(db, caseId, ownerId, snapshot.courtPath);
  if (row && transitionLanded(row.master_result, snapshot.courtPath, caseId, pending)) return { ok: true, master: row.master_result, landed: true };
  const result = await saveReviewTransition(db, ownerId, caseId, snapshot, pending.action, pending.expectedInput, current);
  return result.ok ? { ok: true, master: result.master, landed: false } : { ok: false, reason: result.reason, ...(result.error ? { error: result.error } : {}) };
}

/** The stored value when it fits this field's type, else the component's own value. */
export function adoptStored<T>(stored: unknown, fallback: T): T {
  if (stored === undefined) return fallback;
  if (fallback instanceof Set) return (Array.isArray(stored) ? new Set(stored) : fallback) as T;
  if (fallback !== null && (stored === null || typeof stored !== typeof fallback)) return fallback;
  if (Array.isArray(fallback) !== Array.isArray(stored) && fallback !== null) return fallback;
  return stored as T;
}
