/** Intake answers and explicit review transitions on the existing owned case record. */
import { inputRevision, materialInitialFacts, reconcileReview, transitionReview } from "./intakeReview";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateMasterResult } from "./updateCaseRecord";
import { CASE_REQUEST_TIMEOUT_MS, runCaseWrite } from "../../../app/builder/_components/positionSave";
import { GUEST_INTAKE_SESSION_KEY } from "./storage/intakeStorageKeys";

export type IntakeCourt = "small-claims" | "family" | "civil";
export type Checkpoint = {
  version: 1;
  flowId: string;
  courtPath: IntakeCourt;
  revision: string;
  inputRevision?: string;
  sections: Record<string, Record<string, unknown>>;
};
export type IntakeSession = {
  version: 2;
  ownerId: string | null;
  caseId: string | null;
  serverRevision: string | null;
  /** Guest-only mirror; authenticated workflowStatus lives on the case record. */
  workflowStatus?: Record<string, unknown>;
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
      (flowId && item.flowId !== flowId) || (item.inputRevision !== undefined && !intakeId(item.inputRevision)) || !item.sections || Array.isArray(item.sections) || typeof item.sections !== "object" ||
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
    return { version: 2, ownerId, checkpoint, caseId: value.caseId as string | null, serverRevision: value.serverRevision as string | null, ...(ownerId === null && safeJson(value.workflowStatus) ? { workflowStatus: record(value.workflowStatus) } : {}) };
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

export async function saveCheckpoint(db: Db, ownerId: string, caseId: string, snapshot: Checkpoint, expectedRevision: string | null, current: () => boolean, materialEdited = false) {
  if (!readCheckpoint(snapshot, snapshot.courtPath, caseId)) return { ok: false as const, reason: "rejected" as const, error: "intake-invalid" };
  return runCaseWrite(caseId, () => updateMasterResult(db, { caseId, userId: ownerId, courtPath: snapshot.courtPath }, (master) => {
    if (!current()) return { reject: "intake-cancelled" };
    const existing = record(master.intakeCheckpoint);
    if (existing.revision === snapshot.revision) return { reject: "intake-unchanged" };
    if ((existing.revision ?? null) !== expectedRevision) return { reject: "intake-conflict" };
    // Preserve every unrelated case field, including completed-case state.
    const previous = readCheckpoint(master.intakeCheckpoint, snapshot.courtPath, caseId);
    const workflow = record(master.workflowStatus);
    const proof = record(workflow.intakeReview);
    const materialDifference = Boolean(previous && materialInitialFacts(previous) !== materialInitialFacts(snapshot));
    const mustRenew = materialDifference && Boolean(proof.reviewedRevision || proof.confirmedRevision) && previous && inputRevision(previous) === inputRevision(snapshot);
    const committed = mustRenew ? { ...snapshot, inputRevision: snapshot.revision } : snapshot;
    const changed = materialEdited || Boolean(previous && inputRevision(previous) !== inputRevision(committed));
    return { ...master, intakeCheckpoint: committed, ...(changed ? { workflowStatus: reconcileReview(workflow, previous ?? snapshot, committed) } : {}) };
  }, 2, { requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS }));
}

export async function createCheckpointCase(db: Db, ownerId: string, snapshot: Checkpoint) {
  const { error } = await db.from("cases").insert({
    id: snapshot.flowId, user_id: ownerId, court_path: snapshot.courtPath,
    title: "Unfinished intake", status: "active", current_stage: "not-sure",
    master_result: { source: "builder-created-shell", lifecycleStage: "intake-started", workflowStatus: { intakeCompleted: false, intakeReview: { version: 1 } }, intakeCheckpoint: snapshot },
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
    try { return { ...master, workflowStatus: transitionReview(record(master.workflowStatus), saved, action, expectedInput, new Date().toISOString()) }; }
    catch { return { reject: "intake-review-required" }; }
  }, 2, { requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS }));
}
