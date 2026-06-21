import type { RawEvidenceInput } from "./evidenceAssemblyEngine";

export type RawEvidenceStatus =
  | "new"
  | "ready-for-assembly"
  | "assembled"
  | "needs-review"
  | "archived";

export type StoredRawEvidence = RawEvidenceInput & {
  id: string;
  caseId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  status: RawEvidenceStatus;
  intakeSource:
    | "manual-entry"
    | "intake-upload"
    | "parsed-message"
    | "document-upload"
    | "photo-upload"
    | "system-import";
  notes?: string;
};

export type SaveRawEvidenceInput = RawEvidenceInput & {
  caseId: string;
  userId?: string;
  status?: RawEvidenceStatus;
  intakeSource?: StoredRawEvidence["intakeSource"];
  notes?: string;
};

const RAW_EVIDENCE_KEY = "courtSimplifiedRawEvidence";

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return `raw_evidence_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function readAllRawEvidence(): StoredRawEvidence[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(RAW_EVIDENCE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function writeAllRawEvidence(items: StoredRawEvidence[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(RAW_EVIDENCE_KEY, JSON.stringify(items));
}

export function saveRawEvidenceLocal(
  input: SaveRawEvidenceInput
): StoredRawEvidence {
  const existing = readAllRawEvidence();

  const item: StoredRawEvidence = {
    ...input,
    id: input.id ? String(input.id) : createId(),
    caseId: input.caseId,
    userId: input.userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: input.status || "new",
    intakeSource: input.intakeSource || "manual-entry",
    notes: input.notes,
  };

  writeAllRawEvidence([item, ...existing]);

  return item;
}

export function saveManyRawEvidenceLocal(
  inputs: SaveRawEvidenceInput[]
): StoredRawEvidence[] {
  const existing = readAllRawEvidence();

  const newItems = inputs.map((input) => ({
    ...input,
    id: input.id ? String(input.id) : createId(),
    caseId: input.caseId,
    userId: input.userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: input.status || "new",
    intakeSource: input.intakeSource || "manual-entry",
    notes: input.notes,
  }));

  writeAllRawEvidence([...newItems, ...existing]);

  return newItems;
}

export function getRawEvidenceLocal(
  caseId?: string
): StoredRawEvidence[] {
  const items = readAllRawEvidence();

  if (!caseId) return items;

  return items.filter((item) => item.caseId === caseId);
}

export function getRawEvidenceReadyForAssemblyLocal(
  caseId: string
): StoredRawEvidence[] {
  return getRawEvidenceLocal(caseId).filter((item) =>
    ["new", "ready-for-assembly", "needs-review"].includes(item.status)
  );
}

export function updateRawEvidenceLocal(
  id: string,
  updates: Partial<StoredRawEvidence>
): StoredRawEvidence | null {
  const items = readAllRawEvidence();

  const existing = items.find((item) => item.id === id);

  if (!existing) return null;

  const updated: StoredRawEvidence = {
    ...existing,
    ...updates,
    id: existing.id,
    caseId: updates.caseId || existing.caseId,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  };

  writeAllRawEvidence(
    items.map((item) => (item.id === id ? updated : item))
  );

  return updated;
}

export function updateRawEvidenceStatusLocal(
  id: string,
  status: RawEvidenceStatus
): StoredRawEvidence | null {
  return updateRawEvidenceLocal(id, { status });
}

export function markRawEvidenceAsAssembledLocal(
  ids: string[]
): StoredRawEvidence[] {
  const items = readAllRawEvidence();

  const idSet = new Set(ids);

  const updatedItems = items.map((item) =>
    idSet.has(item.id)
      ? {
          ...item,
          status: "assembled" as RawEvidenceStatus,
          updatedAt: nowIso(),
        }
      : item
  );

  writeAllRawEvidence(updatedItems);

  return updatedItems.filter((item) => idSet.has(item.id));
}

export function deleteRawEvidenceLocal(id: string): boolean {
  const items = readAllRawEvidence();

  const nextItems = items.filter((item) => item.id !== id);

  writeAllRawEvidence(nextItems);

  return nextItems.length !== items.length;
}

export function clearRawEvidenceForCaseLocal(caseId: string): number {
  const items = readAllRawEvidence();

  const nextItems = items.filter((item) => item.caseId !== caseId);

  writeAllRawEvidence(nextItems);

  return items.length - nextItems.length;
}

export function buildRawEvidenceSupabasePayload(item: StoredRawEvidence) {
  return {
    id: item.id,
    case_id: item.caseId,
    user_id: item.userId || null,
    title: item.title || null,
    description: item.description || null,
    content: item.content || null,
    file_name: item.fileName || null,
    file_type: item.fileType || null,
    storage_path: item.storagePath || null,
    date: item.date || null,
    source: item.source || null,
    category: item.category || null,
    related_issue: item.relatedIssue || null,
    related_legal_element: item.relatedLegalElement || null,
    status: item.status,
    intake_source: item.intakeSource,
    notes: item.notes || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function restoreRawEvidenceFromSupabasePayload(
  payload: any
): StoredRawEvidence {
  return {
    id: String(payload.id),
    caseId: String(payload.case_id),
    userId: payload.user_id || undefined,
    title: payload.title || undefined,
    description: payload.description || undefined,
    content: payload.content || undefined,
    fileName: payload.file_name || undefined,
    fileType: payload.file_type || undefined,
    storagePath: payload.storage_path || undefined,
    date: payload.date || undefined,
    source: payload.source || undefined,
    category: payload.category || undefined,
    relatedIssue: payload.related_issue || undefined,
    relatedLegalElement: payload.related_legal_element || undefined,
    status: payload.status || "new",
    intakeSource: payload.intake_source || "manual-entry",
    notes: payload.notes || undefined,
    createdAt: payload.created_at || nowIso(),
    updatedAt: payload.updated_at || nowIso(),
  };
}