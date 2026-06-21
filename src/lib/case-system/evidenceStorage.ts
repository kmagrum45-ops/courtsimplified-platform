import {
  analyzeEvidenceBundle,
  type EvidenceBundleAnalysis,
  type EvidenceItem,
  type EvidenceRelationship,
} from "./evidenceEngine";

export type StoredEvidencePackage = {
  id: string;
  caseId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;

  title: string;
  description?: string;

  evidenceItems: EvidenceItem[];
  evidenceReview: EvidenceBundleAnalysis;
  relationships: EvidenceRelationship[];

  exhibitCount: number;
  status: "draft" | "reviewed" | "locked" | "archived";
};

export type EvidenceStorageInput = {
  caseId: string;
  userId?: string;
  title?: string;
  description?: string;
  evidenceItems: EvidenceItem[];
  status?: StoredEvidencePackage["status"];
};

const LOCAL_STORAGE_KEY = "courtSimplifiedEvidencePackages";

function createId() {
  return `evidence_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readLocalPackages(): StoredEvidencePackage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function writeLocalPackages(packages: StoredEvidencePackage[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(packages)
  );
}

export function buildEvidencePackage(
  input: EvidenceStorageInput
): StoredEvidencePackage {
  const evidenceReview = analyzeEvidenceBundle(input.evidenceItems);

  return {
    id: createId(),
    caseId: input.caseId,
    userId: input.userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),

    title: input.title || "Evidence package",
    description: input.description,

    evidenceItems: input.evidenceItems,
    evidenceReview,
    relationships: evidenceReview.relationships,

    exhibitCount: input.evidenceItems.length,
    status: input.status || "draft",
  };
}

export function saveEvidencePackageLocal(
  input: EvidenceStorageInput
): StoredEvidencePackage {
  const packages = readLocalPackages();
  const newPackage = buildEvidencePackage(input);

  writeLocalPackages([newPackage, ...packages]);

  return newPackage;
}

export function updateEvidencePackageLocal(
  packageId: string,
  input: Partial<EvidenceStorageInput>
): StoredEvidencePackage | null {
  const packages = readLocalPackages();

  const existing = packages.find((item) => item.id === packageId);

  if (!existing) return null;

  const nextEvidenceItems =
    input.evidenceItems || existing.evidenceItems;

  const evidenceReview = analyzeEvidenceBundle(nextEvidenceItems);

  const updatedPackage: StoredEvidencePackage = {
    ...existing,
    caseId: input.caseId || existing.caseId,
    userId: input.userId || existing.userId,
    title: input.title || existing.title,
    description:
      input.description === undefined
        ? existing.description
        : input.description,
    evidenceItems: nextEvidenceItems,
    evidenceReview,
    relationships: evidenceReview.relationships,
    exhibitCount: nextEvidenceItems.length,
    status: input.status || existing.status,
    updatedAt: nowIso(),
  };

  writeLocalPackages(
    packages.map((item) =>
      item.id === packageId ? updatedPackage : item
    )
  );

  return updatedPackage;
}

export function getEvidencePackagesLocal(
  caseId?: string
): StoredEvidencePackage[] {
  const packages = readLocalPackages();

  if (!caseId) return packages;

  return packages.filter((item) => item.caseId === caseId);
}

export function getEvidencePackageByIdLocal(
  packageId: string
): StoredEvidencePackage | null {
  return (
    readLocalPackages().find((item) => item.id === packageId) ||
    null
  );
}

export function deleteEvidencePackageLocal(
  packageId: string
): boolean {
  const packages = readLocalPackages();
  const nextPackages = packages.filter(
    (item) => item.id !== packageId
  );

  writeLocalPackages(nextPackages);

  return nextPackages.length !== packages.length;
}

export function buildEvidenceStoragePayload(
  evidencePackage: StoredEvidencePackage
) {
  return {
    id: evidencePackage.id,
    case_id: evidencePackage.caseId,
    user_id: evidencePackage.userId || null,
    title: evidencePackage.title,
    description: evidencePackage.description || null,
    status: evidencePackage.status,
    exhibit_count: evidencePackage.exhibitCount,
    evidence_items: evidencePackage.evidenceItems,
    evidence_review: evidencePackage.evidenceReview,
    relationships: evidencePackage.relationships,
    created_at: evidencePackage.createdAt,
    updated_at: evidencePackage.updatedAt,
  };
}

export function restoreEvidencePackageFromPayload(
  payload: any
): StoredEvidencePackage {
  return {
    id: String(payload.id),
    caseId: String(payload.case_id),
    userId: payload.user_id || undefined,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,

    title: payload.title || "Evidence package",
    description: payload.description || undefined,

    evidenceItems: payload.evidence_items || [],
    evidenceReview:
      payload.evidence_review ||
      analyzeEvidenceBundle(payload.evidence_items || []),
    relationships:
      payload.relationships ||
      analyzeEvidenceBundle(payload.evidence_items || [])
        .relationships,

    exhibitCount:
      payload.exhibit_count ||
      (payload.evidence_items || []).length,

    status: payload.status || "draft",
  };
}