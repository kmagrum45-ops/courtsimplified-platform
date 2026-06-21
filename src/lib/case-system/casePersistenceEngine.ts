import type { CaseContext } from "./caseContextEngine";

import {
  buildCaseContextStoragePayload,
  restoreCaseContextFromPayload,
} from "./caseContextEngine";

import type { StoredEvidencePackage } from "./evidenceStorage";
import type { WorkspaceDocument } from "./documentWorkspaceEngine";

export type CasePersistenceStatus =
  | "local-only"
  | "ready-for-sync"
  | "synced"
  | "sync-error";

export type CaseSyncQueueStatus =
  | "queued"
  | "syncing"
  | "completed"
  | "failed";

export type CasePersistenceDiagnosticLevel =
  | "info"
  | "warning"
  | "error";

export type CasePersistenceDiagnostic = {
  id: string;
  level: CasePersistenceDiagnosticLevel;
  message: string;
  createdAt: string;
};

export type CaseSyncQueueItem = {
  id: string;
  caseRecordId: string;
  status: CaseSyncQueueStatus;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistedCaseRecord = {
  id: string;
  schemaVersion: number;
  userId?: string;
  title: string;
  casePath: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  lastAutosavedAt?: string;
  status: CasePersistenceStatus;
  caseContext?: CaseContext;
  evidencePackages: StoredEvidencePackage[];
  workspaceDocuments: WorkspaceDocument[];
  syncNotes: string[];
  diagnostics?: CasePersistenceDiagnostic[];
  metadata?: {
    source?: string;
    saveReason?: string;
    recordIntegrity?: "healthy" | "recovered" | "partial" | "corrupt";
    localRevision?: number;
    remoteRevision?: number;
    lastKnownSupabaseSyncAt?: string;
  };
};

export type SaveCaseRecordInput = {
  id?: string;
  userId?: string;
  title?: string;
  caseContext?: CaseContext;
  evidencePackages?: StoredEvidencePackage[];
  workspaceDocuments?: WorkspaceDocument[];
  status?: CasePersistenceStatus;
  syncNotes?: string[];
  saveReason?: string;
};

const CASE_RECORDS_KEY = "courtSimplifiedCaseRecords";
const ACTIVE_CASE_RECORD_KEY = "courtSimplifiedActiveCaseRecord";
const CASE_SYNC_QUEUE_KEY = "courtSimplifiedCaseSyncQueue";

const LEGACY_CASE_CONTEXT_KEYS = [
  "courtSimplifiedCaseContext",
  "courtSimplifiedLoadedCaseContext",
];

const LEGACY_CASE_DATA_KEYS = ["caseData", "courtSimplifiedCase"];

const CURRENT_SCHEMA_VERSION = 2;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = "case_record") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function safeParse(value: string | null): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => clean(item)).filter(Boolean);
  }

  if (typeof value === "string" && clean(value)) {
    return [clean(value)];
  }

  return [];
}

function createDiagnostic(
  level: CasePersistenceDiagnosticLevel,
  message: string,
): CasePersistenceDiagnostic {
  return {
    id: createId("diagnostic"),
    level,
    message,
    createdAt: nowIso(),
  };
}

function inferTitle(input: SaveCaseRecordInput) {
  if (clean(input.title)) return clean(input.title);
  if (input.caseContext?.title) return input.caseContext.title;
  return "Untitled CourtSimplified case";
}

function inferCasePath(input: SaveCaseRecordInput) {
  return input.caseContext?.casePath || "unknown";
}

function inferStage(input: SaveCaseRecordInput) {
  return input.caseContext?.stage || "not-sure";
}

function restoreStoredCaseContext(raw: unknown): CaseContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  try {
    return restoreCaseContextFromPayload(raw);
  } catch {
    return undefined;
  }
}

function normalizeDiagnostics(raw: unknown): CasePersistenceDiagnostic[] {
  if (!Array.isArray(raw)) return [];

  const diagnostics: CasePersistenceDiagnostic[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const diagnostic = item as any;

    diagnostics.push({
      id: String(diagnostic.id || createId("diagnostic")),
      level:
        diagnostic.level === "error" ||
        diagnostic.level === "warning" ||
        diagnostic.level === "info"
          ? diagnostic.level
          : "info",
      message: clean(diagnostic.message) || "Persistence diagnostic.",
      createdAt: diagnostic.createdAt || diagnostic.created_at || nowIso(),
    });
  }

  return diagnostics;
}

function normalizeStatus(raw: unknown): CasePersistenceStatus {
  if (
    raw === "local-only" ||
    raw === "ready-for-sync" ||
    raw === "synced" ||
    raw === "sync-error"
  ) {
    return raw;
  }

  return "local-only";
}

function normalizeEvidencePackages(raw: unknown): StoredEvidencePackage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean) as StoredEvidencePackage[];
}

function normalizeWorkspaceDocuments(raw: unknown): WorkspaceDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean) as WorkspaceDocument[];
}

function normalizePersistedRecord(raw: unknown): PersistedCaseRecord | null {
  if (!raw || typeof raw !== "object") return null;

  try {
    const item = raw as any;

    const caseContext = restoreStoredCaseContext(
      item.caseContext || item.case_context,
    );

    const createdAt = item.createdAt || item.created_at || nowIso();
    const updatedAt = item.updatedAt || item.updated_at || createdAt;

    const schemaVersion =
      typeof item.schemaVersion === "number"
        ? item.schemaVersion
        : typeof item.schema_version === "number"
          ? item.schema_version
          : CURRENT_SCHEMA_VERSION;

    const record: PersistedCaseRecord = {
      id: String(item.id || caseContext?.caseId || createId()),
      schemaVersion,
      userId: item.userId || item.user_id || caseContext?.userId || undefined,
      title:
        clean(item.title) ||
        caseContext?.title ||
        "Untitled CourtSimplified case",
      casePath:
        item.casePath || item.case_path || caseContext?.casePath || "unknown",
      stage: item.stage || caseContext?.stage || "not-sure",
      createdAt,
      updatedAt,
      lastOpenedAt: item.lastOpenedAt || item.last_opened_at || undefined,
      lastAutosavedAt:
        item.lastAutosavedAt || item.last_autosaved_at || undefined,
      status: normalizeStatus(item.status),
      caseContext,
      evidencePackages: normalizeEvidencePackages(
        item.evidencePackages || item.evidence_packages,
      ),
      workspaceDocuments: normalizeWorkspaceDocuments(
        item.workspaceDocuments || item.workspace_documents,
      ),
      syncNotes: safeStringArray(item.syncNotes || item.sync_notes),
      diagnostics: normalizeDiagnostics(
        item.diagnostics || item.persistence_diagnostics,
      ),
      metadata: {
        source: item.metadata?.source || item.source || "local",
        saveReason:
          item.metadata?.saveReason ||
          item.metadata?.save_reason ||
          item.saveReason ||
          item.save_reason ||
          "restored",
        recordIntegrity:
          item.metadata?.recordIntegrity ||
          item.metadata?.record_integrity ||
          "healthy",
        localRevision:
          typeof item.metadata?.localRevision === "number"
            ? item.metadata.localRevision
            : typeof item.local_revision === "number"
              ? item.local_revision
              : 1,
        remoteRevision:
          typeof item.metadata?.remoteRevision === "number"
            ? item.metadata.remoteRevision
            : typeof item.remote_revision === "number"
              ? item.remote_revision
              : undefined,
        lastKnownSupabaseSyncAt:
          item.metadata?.lastKnownSupabaseSyncAt ||
          item.metadata?.last_known_supabase_sync_at ||
          item.last_known_supabase_sync_at ||
          undefined,
      },
    };

    const diagnostics = [...(record.diagnostics || [])];

    if (!record.caseContext) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          "Case record restored without a structured case context.",
        ),
      );
    }

    if (record.schemaVersion < CURRENT_SCHEMA_VERSION) {
      diagnostics.push(
        createDiagnostic(
          "info",
          `Case record migrated from schema version ${record.schemaVersion} to ${CURRENT_SCHEMA_VERSION}.`,
        ),
      );

      record.schemaVersion = CURRENT_SCHEMA_VERSION;
      record.metadata = {
        ...record.metadata,
        recordIntegrity:
          record.metadata?.recordIntegrity === "corrupt"
            ? "corrupt"
            : "recovered",
      };
    }

    record.diagnostics = diagnostics;

    return record;
  } catch {
    return null;
  }
}

function sortRecords(records: PersistedCaseRecord[]) {
  return [...records].sort((a, b) => {
    const left = new Date(a.updatedAt || a.createdAt).getTime();
    const right = new Date(b.updatedAt || b.createdAt).getTime();
    return right - left;
  });
}

function readCaseRecordsLocal(): PersistedCaseRecord[] {
  if (!canUseLocalStorage()) return [];

  const parsed = safeParse(localStorage.getItem(CASE_RECORDS_KEY));

  if (!Array.isArray(parsed)) return [];

  return sortRecords(
    parsed
      .map((item) => normalizePersistedRecord(item))
      .filter((item): item is PersistedCaseRecord => Boolean(item)),
  );
}

function writeCaseRecordsLocal(records: PersistedCaseRecord[]) {
  if (!canUseLocalStorage()) return;

  const normalized = sortRecords(records).map((record) =>
    buildCaseRecordSupabasePayload(record),
  );

  localStorage.setItem(CASE_RECORDS_KEY, JSON.stringify(normalized));
}

function writeActiveCaseRecord(record: PersistedCaseRecord) {
  if (!canUseLocalStorage()) return;

  localStorage.setItem(
    ACTIVE_CASE_RECORD_KEY,
    JSON.stringify(buildCaseRecordSupabasePayload(record)),
  );
}

function readSyncQueueLocal(): CaseSyncQueueItem[] {
  if (!canUseLocalStorage()) return [];

  const parsed = safeParse(localStorage.getItem(CASE_SYNC_QUEUE_KEY));

  if (!Array.isArray(parsed)) return [];

  const normalized: CaseSyncQueueItem[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;

    const raw = item as any;

    const status: CaseSyncQueueStatus =
      raw.status === "queued" ||
      raw.status === "syncing" ||
      raw.status === "completed" ||
      raw.status === "failed"
        ? raw.status
        : "queued";

    const queueItem: CaseSyncQueueItem = {
      id: String(raw.id || createId("sync_queue")),
      caseRecordId: String(raw.caseRecordId || raw.case_record_id || ""),
      status,
      attempts:
        typeof raw.attempts === "number" && raw.attempts >= 0
          ? raw.attempts
          : 0,
      createdAt: raw.createdAt || raw.created_at || nowIso(),
      updatedAt: raw.updatedAt || raw.updated_at || nowIso(),
    };

    const lastAttemptAt = raw.lastAttemptAt || raw.last_attempt_at;
    const nextAttemptAt = raw.nextAttemptAt || raw.next_attempt_at;
    const error = raw.error;

    if (lastAttemptAt) queueItem.lastAttemptAt = String(lastAttemptAt);
    if (nextAttemptAt) queueItem.nextAttemptAt = String(nextAttemptAt);
    if (error) queueItem.error = String(error);

    if (!queueItem.caseRecordId) continue;

    normalized.push(queueItem);
  }

  return normalized;
}

function writeSyncQueueLocal(queue: CaseSyncQueueItem[]) {
  if (!canUseLocalStorage()) return;

  localStorage.setItem(CASE_SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function queueRecordForSync(recordId: string) {
  const queue = readSyncQueueLocal();

  const existing = queue.find(
    (item) =>
      item.caseRecordId === recordId &&
      (item.status === "queued" || item.status === "failed"),
  );

  if (existing) {
    const updatedQueue: CaseSyncQueueItem[] = queue.map((item) => {
      if (item.id !== existing.id) return item;

      return {
        ...item,
        status: "queued",
        updatedAt: nowIso(),
        error: undefined,
      };
    });

    writeSyncQueueLocal(updatedQueue);
    return;
  }

  const item: CaseSyncQueueItem = {
    id: createId("sync_queue"),
    caseRecordId: recordId,
    status: "queued",
    attempts: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  writeSyncQueueLocal([item, ...queue]);
}

export function buildCaseRecordLocal(
  input: SaveCaseRecordInput,
): PersistedCaseRecord {
  const createdAt = nowIso();

  return {
    id: input.id || input.caseContext?.caseId || createId(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userId: input.userId || input.caseContext?.userId,
    title: inferTitle(input),
    casePath: inferCasePath(input),
    stage: inferStage(input),
    createdAt,
    updatedAt: createdAt,
    lastOpenedAt: createdAt,
    lastAutosavedAt: input.saveReason === "autosave" ? createdAt : undefined,
    status: input.status || "local-only",
    caseContext: input.caseContext,
    evidencePackages: input.evidencePackages || [],
    workspaceDocuments: input.workspaceDocuments || [],
    syncNotes:
      input.syncNotes || [
        "Saved locally.",
        "Ready for future Supabase synchronization.",
      ],
    diagnostics: [
      createDiagnostic(
        "info",
        `Case record created locally${
          input.saveReason ? ` by ${input.saveReason}` : ""
        }.`,
      ),
    ],
    metadata: {
      source: "local",
      saveReason: input.saveReason || "manual-save",
      recordIntegrity: "healthy",
      localRevision: 1,
    },
  };
}

export function saveCaseRecordLocal(
  input: SaveCaseRecordInput,
): PersistedCaseRecord {
  const records = readCaseRecordsLocal();

  const existing =
    input.id || input.caseContext?.caseId
      ? records.find(
          (item) =>
            item.id === input.id || item.id === input.caseContext?.caseId,
        )
      : undefined;

  const base = existing || buildCaseRecordLocal(input);
  const updatedAt = nowIso();

  const record: PersistedCaseRecord = {
    ...base,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userId: input.userId || input.caseContext?.userId || base.userId,
    title: inferTitle({
      ...input,
      title: input.title || base.title,
    }),
    casePath: input.caseContext?.casePath || base.casePath || "unknown",
    stage: input.caseContext?.stage || base.stage || "not-sure",
    updatedAt,
    lastOpenedAt: updatedAt,
    lastAutosavedAt:
      input.saveReason === "autosave" ? updatedAt : base.lastAutosavedAt,
    status: input.status || base.status || "local-only",
    caseContext: input.caseContext || base.caseContext,
    evidencePackages: input.evidencePackages || base.evidencePackages || [],
    workspaceDocuments:
      input.workspaceDocuments || base.workspaceDocuments || [],
    syncNotes:
      input.syncNotes ||
      base.syncNotes || [
        "Saved locally.",
        "Ready for future Supabase synchronization.",
      ],
    diagnostics: [
      ...(base.diagnostics || []),
      createDiagnostic(
        "info",
        `Case record saved${input.saveReason ? ` by ${input.saveReason}` : ""}.`,
      ),
    ].slice(-30),
    metadata: {
      ...base.metadata,
      source: "local",
      saveReason: input.saveReason || "manual-save",
      recordIntegrity: "healthy",
      localRevision: (base.metadata?.localRevision || 0) + 1,
    },
  };

  const nextRecords = [
    record,
    ...records.filter((item) => item.id !== record.id),
  ];

  writeCaseRecordsLocal(nextRecords);
  writeActiveCaseRecord(record);

  if (record.status === "ready-for-sync") {
    queueRecordForSync(record.id);
  }

  return record;
}

export function updateCaseRecordLocal(
  record: PersistedCaseRecord,
): PersistedCaseRecord {
  const records = readCaseRecordsLocal();
  const updatedAt = nowIso();

  const updated: PersistedCaseRecord = {
    ...record,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt,
    lastOpenedAt: record.lastOpenedAt || updatedAt,
    diagnostics: [
      ...(record.diagnostics || []),
      createDiagnostic("info", "Case record updated locally."),
    ].slice(-30),
    metadata: {
      ...record.metadata,
      source: "local",
      saveReason: record.metadata?.saveReason || "manual-update",
      recordIntegrity: record.metadata?.recordIntegrity || "healthy",
      localRevision: (record.metadata?.localRevision || 0) + 1,
    },
  };

  const nextRecords = [
    updated,
    ...records.filter((item) => item.id !== updated.id),
  ];

  writeCaseRecordsLocal(nextRecords);
  writeActiveCaseRecord(updated);

  if (updated.status === "ready-for-sync") {
    queueRecordForSync(updated.id);
  }

  return updated;
}

export function getCaseRecordsLocal(): PersistedCaseRecord[] {
  return readCaseRecordsLocal();
}

export function getCaseRecordByIdLocal(id: string): PersistedCaseRecord | null {
  return readCaseRecordsLocal().find((record) => record.id === id) || null;
}

export function getActiveCaseRecordLocal(): PersistedCaseRecord | null {
  if (!canUseLocalStorage()) return null;

  const parsed = safeParse(localStorage.getItem(ACTIVE_CASE_RECORD_KEY));

  return normalizePersistedRecord(parsed);
}

export function setActiveCaseRecordLocal(
  id: string,
): PersistedCaseRecord | null {
  const record = getCaseRecordByIdLocal(id);

  if (!record) return null;

  const updated: PersistedCaseRecord = {
    ...record,
    lastOpenedAt: nowIso(),
    diagnostics: [
      ...(record.diagnostics || []),
      createDiagnostic("info", "Case record set as active."),
    ].slice(-30),
  };

  updateCaseRecordLocal(updated);
  writeActiveCaseRecord(updated);

  return updated;
}

export function deleteCaseRecordLocal(id: string): boolean {
  const records = readCaseRecordsLocal();

  const nextRecords = records.filter((record) => record.id !== id);

  writeCaseRecordsLocal(nextRecords);

  const queue = readSyncQueueLocal().filter(
    (item) => item.caseRecordId !== id,
  );

  writeSyncQueueLocal(queue);

  const active = getActiveCaseRecordLocal();

  if (active?.id === id && canUseLocalStorage()) {
    localStorage.removeItem(ACTIVE_CASE_RECORD_KEY);
  }

  return nextRecords.length !== records.length;
}

export function clearAllCaseRecordsLocal() {
  if (!canUseLocalStorage()) return;

  localStorage.removeItem(CASE_RECORDS_KEY);
  localStorage.removeItem(ACTIVE_CASE_RECORD_KEY);
  localStorage.removeItem(CASE_SYNC_QUEUE_KEY);
}

export function buildCaseRecordSupabasePayload(record: PersistedCaseRecord) {
  return {
    id: record.id,
    schema_version: record.schemaVersion,
    user_id: record.userId || null,
    title: record.title,
    case_path: record.casePath,
    stage: record.stage,
    status: record.status,
    case_context: record.caseContext
      ? buildCaseContextStoragePayload(record.caseContext)
      : null,
    evidence_packages: record.evidencePackages,
    workspace_documents: record.workspaceDocuments,
    sync_notes: record.syncNotes,
    diagnostics: record.diagnostics || [],
    metadata: record.metadata || null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    last_opened_at: record.lastOpenedAt || null,
    last_autosaved_at: record.lastAutosavedAt || null,
  };
}

export function restoreCaseRecordFromSupabasePayload(
  payload: any,
): PersistedCaseRecord {
  return (
    normalizePersistedRecord(payload) || {
      id: createId(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      title: "Recovered CourtSimplified case",
      casePath: "unknown",
      stage: "not-sure",
      status: "sync-error",
      evidencePackages: [],
      workspaceDocuments: [],
      syncNotes: ["The persisted record could not be fully restored."],
      diagnostics: [
        createDiagnostic(
          "error",
          "Supabase payload could not be fully restored.",
        ),
      ],
      metadata: {
        source: "supabase",
        saveReason: "recovery",
        recordIntegrity: "corrupt",
        localRevision: 1,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
  );
}

export function collectCurrentLocalCaseRecord(): PersistedCaseRecord | null {
  if (!canUseLocalStorage()) return null;

  try {
    let caseContext: CaseContext | undefined;

    for (const key of LEGACY_CASE_CONTEXT_KEYS) {
      const rawContext = safeParse(localStorage.getItem(key));

      caseContext = restoreStoredCaseContext(rawContext);

      if (caseContext) break;
    }

    const fallbackCaseData = LEGACY_CASE_DATA_KEYS.map((key) =>
      safeParse(localStorage.getItem(key)),
    ).find(Boolean) as any;

    const rawEvidencePackage = safeParse(
      localStorage.getItem("courtSimplifiedEvidencePackage"),
    );

    const rawWorkspace = safeParse(
      localStorage.getItem("courtSimplifiedWorkspaceDocument"),
    );

    const evidencePackages: StoredEvidencePackage[] = rawEvidencePackage
      ? [rawEvidencePackage as StoredEvidencePackage]
      : [];

    const workspaceDocuments: WorkspaceDocument[] = rawWorkspace
      ? [rawWorkspace as WorkspaceDocument]
      : [];

    if (
      !caseContext &&
      !fallbackCaseData &&
      evidencePackages.length === 0 &&
      workspaceDocuments.length === 0
    ) {
      return null;
    }

    return saveCaseRecordLocal({
      id:
        caseContext?.caseId ||
        fallbackCaseData?.caseId ||
        fallbackCaseData?.id ||
        "draft-case",
      userId: caseContext?.userId || fallbackCaseData?.userId,
      title:
        caseContext?.title ||
        fallbackCaseData?.title ||
        "CourtSimplified Draft Case",
      caseContext,
      evidencePackages,
      workspaceDocuments,
      status: "ready-for-sync",
      saveReason: "collect-current-local-state",
      syncNotes: [
        "Collected local litigation workspace state.",
        "Master persistence architecture attached.",
        "Ready for Supabase synchronization.",
      ],
    });
  } catch {
    return null;
  }
}

export function autosaveCaseRecordLocal(
  input: SaveCaseRecordInput,
): PersistedCaseRecord {
  return saveCaseRecordLocal({
    ...input,
    status: input.status || "ready-for-sync",
    saveReason: "autosave",
    syncNotes: input.syncNotes || [
      "Autosaved locally.",
      "Queued for future Supabase synchronization.",
    ],
  });
}

export function markCaseRecordSyncedLocal(
  id: string,
  remoteRevision?: number,
): PersistedCaseRecord | null {
  const record = getCaseRecordByIdLocal(id);

  if (!record) return null;

  const updated: PersistedCaseRecord = {
    ...record,
    status: "synced",
    updatedAt: nowIso(),
    syncNotes: [...(record.syncNotes || []), "Case record marked synced."].slice(
      -30,
    ),
    diagnostics: [
      ...(record.diagnostics || []),
      createDiagnostic("info", "Case record synchronized."),
    ].slice(-30),
    metadata: {
      ...record.metadata,
      recordIntegrity: "healthy",
      remoteRevision:
        typeof remoteRevision === "number"
          ? remoteRevision
          : record.metadata?.remoteRevision,
      lastKnownSupabaseSyncAt: nowIso(),
    },
  };

  updateCaseRecordLocal(updated);

  const queue: CaseSyncQueueItem[] = readSyncQueueLocal().map((item) => {
    if (item.caseRecordId !== id) return item;

    return {
      ...item,
      status: "completed",
      updatedAt: nowIso(),
    };
  });

  writeSyncQueueLocal(queue);

  return updated;
}

export function markCaseRecordSyncErrorLocal(
  id: string,
  errorMessage: string,
): PersistedCaseRecord | null {
  const record = getCaseRecordByIdLocal(id);

  if (!record) return null;

  const updated: PersistedCaseRecord = {
    ...record,
    status: "sync-error",
    updatedAt: nowIso(),
    syncNotes: [
      ...(record.syncNotes || []),
      `Sync error: ${errorMessage}`,
    ].slice(-30),
    diagnostics: [
      ...(record.diagnostics || []),
      createDiagnostic("error", errorMessage),
    ].slice(-30),
    metadata: {
      ...record.metadata,
      recordIntegrity: record.metadata?.recordIntegrity || "partial",
    },
  };

  updateCaseRecordLocal(updated);

  const queue = readSyncQueueLocal();
  const existing = queue.find((item) => item.caseRecordId === id);

  let updatedQueue: CaseSyncQueueItem[];

  if (existing) {
    updatedQueue = queue.map((item) => {
      if (item.caseRecordId !== id) return item;

      const failedItem: CaseSyncQueueItem = {
        ...item,
        status: "failed",
        attempts: item.attempts + 1,
        updatedAt: nowIso(),
        error: errorMessage,
      };

      failedItem.lastAttemptAt = nowIso();

      return failedItem;
    });
  } else {
    const failedItem: CaseSyncQueueItem = {
      id: createId("sync_queue"),
      caseRecordId: id,
      status: "failed",
      attempts: 1,
      error: errorMessage,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    failedItem.lastAttemptAt = nowIso();

    updatedQueue = [failedItem, ...queue];
  }

  writeSyncQueueLocal(updatedQueue);

  return updated;
}

export function getCaseSyncQueueLocal(): CaseSyncQueueItem[] {
  return readSyncQueueLocal();
}

export function clearCompletedCaseSyncQueueLocal() {
  const queue = readSyncQueueLocal().filter(
    (item) => item.status !== "completed",
  );

  writeSyncQueueLocal(queue);
}

export function getCasePersistenceHealthLocal() {
  const records = readCaseRecordsLocal();
  const queue = readSyncQueueLocal();

  const diagnostics = records.flatMap((record) => record.diagnostics || []);

  return {
    recordCount: records.length,
    activeRecord: getActiveCaseRecordLocal(),
    queuedSyncCount: queue.filter((item) => item.status === "queued").length,
    failedSyncCount: queue.filter((item) => item.status === "failed").length,
    syncedRecordCount: records.filter((item) => item.status === "synced")
      .length,
    localOnlyRecordCount: records.filter(
      (item) => item.status === "local-only",
    ).length,
    readyForSyncRecordCount: records.filter(
      (item) => item.status === "ready-for-sync",
    ).length,
    diagnosticCount: diagnostics.length,
    warningCount: diagnostics.filter((item) => item.level === "warning")
      .length,
    errorCount: diagnostics.filter((item) => item.level === "error").length,
  };
}