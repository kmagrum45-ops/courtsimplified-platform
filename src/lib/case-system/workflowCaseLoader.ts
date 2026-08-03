import { supabase } from "../supabase/client";
import { getEvidencePackagesLocal } from "./evidenceStorage";

export type WorkflowCaseRecord = {
  id: string;
  title: string | null;
  court_path: string | null;
  current_stage: string | null;
  master_result: unknown;
};

export type WorkflowEvidencePackage = {
  createdAt: string;
  exhibitCount: number;
  exhibits: Array<{
    id: string | number;
    label: string;
    title: string;
    description: string;
    relevance: string;
    confirmed: boolean;
  }>;
  evidenceReview: Record<string, unknown>;
};

export type WorkflowCaseBundle = {
  record: WorkflowCaseRecord | null;
  masterResult: Record<string, unknown>;
  caseData: Record<string, unknown> | null;
  evidencePackage: WorkflowEvidencePackage | null;
  workspaceDocument: unknown;
};

const DRAFT_WORKSPACE_KEY = "courtSimplifiedWorkspaceDocument:draft";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getActiveCaseId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("courtSimplifiedActiveCaseId") || "";
}

export function getWorkspaceStorageKey(caseId?: string): string {
  return caseId
    ? `courtSimplifiedWorkspaceDocument:case:${caseId}`
    : DRAFT_WORKSPACE_KEY;
}

export function readWorkspaceDocument(caseId?: string): unknown {
  const scoped = readJson(getWorkspaceStorageKey(caseId));

  if (scoped) return scoped;

  const mayUseLegacy = !caseId || getActiveCaseId() === caseId;
  if (!mayUseLegacy) return null;

  const legacy = readJson("courtSimplifiedWorkspaceDocument");

  if (legacy && typeof window !== "undefined") {
    localStorage.setItem(
      getWorkspaceStorageKey(caseId),
      JSON.stringify(legacy),
    );
  }

  return legacy;
}

export function writeWorkspaceDocument(
  caseId: string | undefined,
  value: unknown,
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    getWorkspaceStorageKey(caseId),
    JSON.stringify(value),
  );
}

export function resolveWorkflowCaseData(
  masterResultValue: unknown,
): Record<string, unknown> | null {
  const masterResult = asRecord(masterResultValue);
  const intakeData = asRecord(masterResult.intakeData);
  const persistedRecord = asRecord(masterResult.persistedRecord);
  const masterCase = asRecord(masterResult.masterCase);

  const source = hasKeys(intakeData) ? intakeData : masterResult;
  if (!hasKeys(source)) return null;

  const sourceAnalysis = asRecord(source.analysis);
  const intakeAnalysis = asRecord(masterResult.intakeAnalysis);
  const analysis = hasKeys(sourceAnalysis)
    ? sourceAnalysis
    : hasKeys(intakeAnalysis)
      ? intakeAnalysis
      : asRecord(masterResult.analysis);

  return {
    ...source,
    courtPath:
      source.courtPath ||
      masterCase.courtPath ||
      persistedRecord.casePath ||
      masterResult.courtPath ||
      "unknown",
    analysis,
  };
}

export function normalizeWorkflowEvidencePackage(
  value: unknown,
): WorkflowEvidencePackage | null {
  const candidate = asRecord(value);
  if (!hasKeys(candidate)) return null;

  const rawItems = Array.isArray(candidate.exhibits)
    ? candidate.exhibits
    : Array.isArray(candidate.evidenceItems)
      ? candidate.evidenceItems
      : [];

  const exhibits = rawItems.map((rawItem, index) => {
    const item = asRecord(rawItem);

    return {
      id:
        typeof item.id === "string" || typeof item.id === "number"
          ? item.id
          : `exhibit-${index + 1}`,
      label: String(item.label || item.exhibitNumber || `A${index + 1}`),
      title: String(item.title || item.fileName || "Untitled exhibit"),
      description: String(item.description || ""),
      relevance: String(item.relevance || ""),
      confirmed: Boolean(item.confirmed ?? item.userReviewed),
    };
  });

  const evidenceReview = asRecord(candidate.evidenceReview);

  return {
    createdAt: String(candidate.createdAt || candidate.updatedAt || ""),
    exhibitCount:
      typeof candidate.exhibitCount === "number"
        ? candidate.exhibitCount
        : exhibits.length,
    exhibits,
    evidenceReview,
  };
}

function resolveEvidenceFromMasterResult(
  masterResultValue: unknown,
): WorkflowEvidencePackage | null {
  const masterResult = asRecord(masterResultValue);
  const masterCaseFile = asRecord(masterResult.masterCaseFile);
  const persistedRecord = asRecord(masterResult.persistedRecord);
  const persistedPackages = Array.isArray(persistedRecord.evidencePackages)
    ? persistedRecord.evidencePackages
    : [];

  const savedPackage = normalizeWorkflowEvidencePackage(
    masterCaseFile.evidencePackage ||
      masterResult.evidencePackage ||
      persistedPackages[0],
  );

  if (savedPackage) return savedPackage;

  return Array.isArray(masterCaseFile.evidence)
    ? normalizeWorkflowEvidencePackage({
        evidenceItems: masterCaseFile.evidence,
      })
    : null;
}

function resolveLocalEvidence(caseId?: string): WorkflowEvidencePackage | null {
  if (caseId) {
    const casePackage = getEvidencePackagesLocal(caseId)[0];
    return normalizeWorkflowEvidencePackage(casePackage);
  }

  return normalizeWorkflowEvidencePackage(
    readJson("courtSimplifiedEvidencePackage"),
  );
}

export async function loadWorkflowCaseBundle(
  caseId: string,
): Promise<WorkflowCaseBundle> {
  const { data, error } = await supabase
    .from("cases")
    .select("id,title,court_path,current_stage,master_result")
    .eq("id", caseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("The requested case could not be found.");
  }

  const record = data as WorkflowCaseRecord;
  const masterResult = asRecord(record.master_result);

  return {
    record,
    masterResult,
    caseData: resolveWorkflowCaseData(masterResult),
    evidencePackage:
      resolveEvidenceFromMasterResult(masterResult) ||
      resolveLocalEvidence(caseId),
    workspaceDocument: readWorkspaceDocument(caseId),
  };
}

export function loadDraftWorkflowBundle(): WorkflowCaseBundle {
  const masterResult = asRecord(readJson("courtSimplifiedMasterResult"));
  const storedCase =
    readJson("caseData") || readJson("courtSimplifiedCase") || masterResult;
  const storedCaseRecord = asRecord(storedCase);

  return {
    record: null,
    masterResult,
    caseData:
      resolveWorkflowCaseData(masterResult) ||
      (hasKeys(storedCaseRecord) ? storedCaseRecord : null),
    evidencePackage: resolveLocalEvidence(),
    workspaceDocument: readWorkspaceDocument(),
  };
}
