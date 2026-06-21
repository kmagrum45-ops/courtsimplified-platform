import {
  buildCaseContext,
  type BuildCaseContextInput,
  type CaseContext,
  type CaseFormNeed,
  type CaseStage,
  updateCaseContextEvidence,
  addCaseFact,
  addCaseFormNeed,
} from "./caseContextEngine";

import type { EvidenceItem } from "./evidenceEngine";

import type { StoredEvidencePackage } from "./evidenceStorage";

import type { WorkspaceDocument } from "./documentWorkspaceEngine";

import {
  buildCaseRecordLocal,
  saveCaseRecordLocal,
  updateCaseRecordLocal,
  getCaseRecordByIdLocal,
  getActiveCaseRecordLocal,
  type CasePersistenceStatus,
  type PersistedCaseRecord,
} from "./casePersistenceEngine";

type CourtPath = "family" | "small-claims" | "civil";

type IntakeAnalysisLike = {
  caseStage?: string;
  summary?: string;
  detectedIssues?: string[];
  detectedClaimTypes?: string[];
  damagesIssues?: string[];
  proceduralRisks?: string[];
  caseStrategy?: string[];
  requiredNextForms?: string[];
};

type StoredCaseDataLike = Record<string, unknown>;

type OrchestratorInput = {
  caseId?: string;
  userId?: string;
  courtPath: CourtPath;
  title?: string;
  analysis: IntakeAnalysisLike;
  intake: StoredCaseDataLike;
};

type OrchestratorUpdateBase = {
  record?: PersistedCaseRecord | null;
  caseId?: string;
  userId?: string;
  title?: string;
  status?: CasePersistenceStatus;
  syncNotes?: string[];
};

type UpdateCaseContextInput = OrchestratorUpdateBase & {
  contextInput: BuildCaseContextInput;
};

type AttachEvidenceInput = OrchestratorUpdateBase & {
  evidenceItems: EvidenceItem[];
  evidencePackages?: StoredEvidencePackage[];
};

type AttachWorkspaceInput = OrchestratorUpdateBase & {
  workspaceDocuments: WorkspaceDocument[];
};

type AttachFormsInput = OrchestratorUpdateBase & {
  formNeeds: CaseFormNeed[];
};

type AddFactInput = OrchestratorUpdateBase & {
  fact: string;
};

const VALID_CASE_STAGES: CaseStage[] = [
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "urgent",
  "not-sure",
];

function clean(value: unknown): string {
  return String(value || "").trim();
}

function cleanList(items: Array<string | undefined | null>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function normalizeToken(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/_/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function asStage(value: unknown): CaseStage {
  const normalized = normalizeToken(value);

  if (VALID_CASE_STAGES.includes(normalized as CaseStage)) {
    return normalized as CaseStage;
  }

  if (
    normalized === "start" ||
    normalized === "new" ||
    normalized === "starting" ||
    normalized === "starting case"
  ) {
    return "starting-case";
  }

  if (
    normalized === "already started" ||
    normalized === "active" ||
    normalized === "in-progress" ||
    normalized === "in progress"
  ) {
    return "already-started";
  }

  if (
    normalized === "case conference" ||
    normalized === "settlement-conference" ||
    normalized === "settlement conference"
  ) {
    return "conference";
  }

  if (
    normalized === "urgent-motion" ||
    normalized === "urgent motion" ||
    normalized === "emergency"
  ) {
    return "urgent";
  }

  return "not-sure";
}

function titleFromInput(input: OrchestratorInput): string {
  if (clean(input.title)) return clean(input.title);

  if (clean(input.analysis.summary)) {
    return clean(input.analysis.summary).slice(0, 80);
  }

  if (input.courtPath === "family") return "Family Case";
  if (input.courtPath === "small-claims") return "Small Claims Case";
  if (input.courtPath === "civil") return "Civil Litigation Case";

  return "CourtSimplified Case";
}

function factsFromAnalysis(input: OrchestratorInput): string[] {
  const detectedIssues = input.analysis.detectedIssues || [];
  const detectedClaimTypes = input.analysis.detectedClaimTypes || [];
  const damagesIssues = input.analysis.damagesIssues || [];
  const proceduralRisks = input.analysis.proceduralRisks || [];
  const caseStrategy = input.analysis.caseStrategy || [];

  return cleanList([
    input.analysis.summary,
    ...detectedIssues.map((item) => `Detected issue: ${item}`),
    ...detectedClaimTypes.map((item) => `Detected claim type: ${item}`),
    ...damagesIssues.map((item) => `Damages concern: ${item}`),
    ...proceduralRisks.map((item) => `Procedural risk: ${item}`),
    ...caseStrategy.map((item) => `Strategy note: ${item}`),
  ]);
}

function formNeedsFromAnalysis(input: OrchestratorInput): CaseFormNeed[] {
  const requiredNextForms = cleanList(input.analysis.requiredNextForms || []);
  const stage: CaseStage = asStage(input.analysis.caseStage);

  return requiredNextForms.map(
    (title): CaseFormNeed => ({
      title,
      reason:
        "Recommended by intake analysis as a next required form or document.",
      stage,
      status: "needed-now",
      linkedIssueIds: [],
      linkedEvidenceIds: [],
    }),
  );
}

function loadRecord(input: OrchestratorUpdateBase): PersistedCaseRecord | null {
  if (input.record) return input.record;

  if (input.caseId) {
    const byId = getCaseRecordByIdLocal(input.caseId);
    if (byId) return byId;
  }

  return getActiveCaseRecordLocal();
}

function buildSyncNotes(
  existingNotes: string[],
  newNotes: string[] | undefined,
  defaultNote: string,
): string[] {
  return cleanList([
    ...existingNotes,
    defaultNote,
    ...(newNotes || []),
    `Updated by masterCaseOrchestrator at ${new Date().toISOString()}.`,
  ]);
}

function recordTitle(
  record: PersistedCaseRecord | null,
  title?: string,
  context?: CaseContext,
) {
  if (clean(title)) return clean(title);
  if (context?.title) return context.title;
  if (record?.title) return record.title;

  return "CourtSimplified Case";
}

function saveUpdatedRecord(
  record: PersistedCaseRecord,
  updates: {
    caseContext?: CaseContext;
    evidencePackages?: StoredEvidencePackage[];
    workspaceDocuments?: WorkspaceDocument[];
    title?: string;
    status?: CasePersistenceStatus;
    syncNotes?: string[];
  },
): PersistedCaseRecord {
  const nextContext = updates.caseContext ?? record.caseContext;

  return updateCaseRecordLocal({
    ...record,
    title: updates.title || recordTitle(record, undefined, nextContext),
    casePath: nextContext?.casePath || record.casePath,
    stage: nextContext?.stage || record.stage,
    caseContext: nextContext,
    evidencePackages: updates.evidencePackages ?? record.evidencePackages,
    workspaceDocuments:
      updates.workspaceDocuments ?? record.workspaceDocuments,
    status: updates.status || record.status || "ready-for-sync",
    syncNotes: updates.syncNotes || record.syncNotes,
  });
}

export function buildMasterCaseFromIntake(
  input: OrchestratorInput,
): PersistedCaseRecord {
  const title = titleFromInput(input);
  const stage: CaseStage = asStage(input.analysis.caseStage);

  const context = buildCaseContext({
    caseId: input.caseId,
    userId: input.userId,
    casePath: input.courtPath,
    stage,
    partyRole: "unknown",
    title,
    summary: input.analysis.summary || "",
    facts: factsFromAnalysis(input),
    evidenceItems: [],
    formNeeds: formNeedsFromAnalysis(input),
  });

  return buildCaseRecordLocal({
    id: context.caseId,
    userId: input.userId,
    title,
    caseContext: context,
    status: "ready-for-sync",
    syncNotes: [
      "Built from completed intake analysis.",
      "Master litigation case context generated.",
      "Ready for evidence, proof mapping, document generation, and Supabase synchronization.",
    ],
  });
}

export function saveMasterCaseFromIntake(
  input: OrchestratorInput,
): PersistedCaseRecord {
  const record = buildMasterCaseFromIntake(input);

  return saveCaseRecordLocal({
    id: record.id,
    userId: record.userId,
    title: record.title,
    caseContext: record.caseContext,
    evidencePackages: record.evidencePackages,
    workspaceDocuments: record.workspaceDocuments,
    status: record.status,
    syncNotes: record.syncNotes,
  });
}

export function rebuildMasterCaseContext(
  input: UpdateCaseContextInput,
): PersistedCaseRecord {
  const existingRecord = loadRecord(input);

  const existingContext = existingRecord?.caseContext;

  const context = buildCaseContext({
    caseId:
      input.contextInput.caseId ||
      existingContext?.caseId ||
      existingRecord?.id ||
      input.caseId,
    userId:
      input.contextInput.userId ||
      existingContext?.userId ||
      existingRecord?.userId ||
      input.userId,
    casePath:
      input.contextInput.casePath ||
      existingContext?.casePath ||
      existingRecord?.casePath ||
      "unknown",
    stage:
      input.contextInput.stage ||
      existingContext?.stage ||
      existingRecord?.stage ||
      "not-sure",
    partyRole:
      input.contextInput.partyRole ||
      existingContext?.partyRole ||
      "unknown",
    title:
      input.contextInput.title ||
      input.title ||
      existingContext?.title ||
      existingRecord?.title ||
      "CourtSimplified Case",
    summary:
      input.contextInput.summary ||
      existingContext?.summary ||
      "",
    facts:
      input.contextInput.facts ||
      existingContext?.facts ||
      [],
    evidenceItems:
      input.contextInput.evidenceItems ||
      existingContext?.evidenceItems ||
      [],
    formNeeds:
      input.contextInput.formNeeds ||
      existingContext?.formNeeds ||
      [],
  });

  const baseRecord =
    existingRecord ||
    buildCaseRecordLocal({
      id: context.caseId,
      userId: context.userId,
      title: context.title,
      caseContext: context,
      status: "ready-for-sync",
      syncNotes: ["Created from master orchestrator context rebuild."],
    });

  return saveUpdatedRecord(baseRecord, {
    caseContext: context,
    title: recordTitle(baseRecord, input.title, context),
    status: input.status || "ready-for-sync",
    syncNotes: buildSyncNotes(
      baseRecord.syncNotes,
      input.syncNotes,
      "Master case context rebuilt and readiness recalculated.",
    ),
  });
}

export function attachEvidenceToMasterCase(
  input: AttachEvidenceInput,
): PersistedCaseRecord {
  const record = loadRecord(input);

  if (!record) {
    const context = buildCaseContext({
      caseId: input.caseId,
      userId: input.userId,
      casePath: "unknown",
      stage: "not-sure",
      partyRole: "unknown",
      title: input.title || "CourtSimplified Evidence Case",
      summary: "",
      facts: [],
      evidenceItems: input.evidenceItems,
      formNeeds: [],
    });

    return saveCaseRecordLocal({
      id: context.caseId,
      userId: context.userId,
      title: context.title,
      caseContext: context,
      evidencePackages: input.evidencePackages || [],
      workspaceDocuments: [],
      status: input.status || "ready-for-sync",
      syncNotes: buildSyncNotes(
        [],
        input.syncNotes,
        "Created new master case record from evidence attachment.",
      ),
    });
  }

  const existingContext = record.caseContext;

  const updatedContext = existingContext
    ? updateCaseContextEvidence(existingContext, input.evidenceItems)
    : buildCaseContext({
        caseId: record.id,
        userId: record.userId || input.userId,
        casePath: record.casePath || "unknown",
        stage: record.stage || "not-sure",
        partyRole: "unknown",
        title: recordTitle(record, input.title),
        summary: "",
        facts: [],
        evidenceItems: input.evidenceItems,
        formNeeds: [],
      });

  return saveUpdatedRecord(record, {
    caseContext: updatedContext,
    evidencePackages: input.evidencePackages ?? record.evidencePackages,
    title: recordTitle(record, input.title, updatedContext),
    status: input.status || "ready-for-sync",
    syncNotes: buildSyncNotes(
      record.syncNotes,
      input.syncNotes,
      "Evidence attached to master case and litigation intelligence recalculated.",
    ),
  });
}

export function attachWorkspaceDocumentsToMasterCase(
  input: AttachWorkspaceInput,
): PersistedCaseRecord {
  const record = loadRecord(input);

  if (!record) {
    const context = buildCaseContext({
      caseId: input.caseId,
      userId: input.userId,
      casePath: "unknown",
      stage: "not-sure",
      partyRole: "unknown",
      title: input.title || "CourtSimplified Drafting Case",
      summary: "",
      facts: [],
      evidenceItems: [],
      formNeeds: [],
    });

    return saveCaseRecordLocal({
      id: context.caseId,
      userId: context.userId,
      title: context.title,
      caseContext: context,
      evidencePackages: [],
      workspaceDocuments: input.workspaceDocuments,
      status: input.status || "ready-for-sync",
      syncNotes: buildSyncNotes(
        [],
        input.syncNotes,
        "Created new master case record from workspace document attachment.",
      ),
    });
  }

  return saveUpdatedRecord(record, {
    workspaceDocuments: input.workspaceDocuments,
    title: input.title || record.title,
    status: input.status || "ready-for-sync",
    syncNotes: buildSyncNotes(
      record.syncNotes,
      input.syncNotes,
      "Workspace documents attached to master case.",
    ),
  });
}

export function attachFormsToMasterCase(
  input: AttachFormsInput,
): PersistedCaseRecord {
  const record = loadRecord(input);

  const existingContext = record?.caseContext;

  const baseContext =
    existingContext ||
    buildCaseContext({
      caseId: record?.id || input.caseId,
      userId: record?.userId || input.userId,
      casePath: record?.casePath || "unknown",
      stage: record?.stage || "not-sure",
      partyRole: "unknown",
      title: recordTitle(record || null, input.title),
      summary: "",
      facts: [],
      evidenceItems: [],
      formNeeds: [],
    });

  const existingTitles = new Set(
    baseContext.formNeeds.map((form) => normalizeToken(form.title)),
  );

  let updatedContext = baseContext;

  for (const formNeed of input.formNeeds) {
    if (!existingTitles.has(normalizeToken(formNeed.title))) {
      updatedContext = addCaseFormNeed(updatedContext, formNeed);
      existingTitles.add(normalizeToken(formNeed.title));
    }
  }

  if (!record) {
    return saveCaseRecordLocal({
      id: updatedContext.caseId,
      userId: updatedContext.userId,
      title: updatedContext.title,
      caseContext: updatedContext,
      evidencePackages: [],
      workspaceDocuments: [],
      status: input.status || "ready-for-sync",
      syncNotes: buildSyncNotes(
        [],
        input.syncNotes,
        "Created new master case record from form recommendations.",
      ),
    });
  }

  return saveUpdatedRecord(record, {
    caseContext: updatedContext,
    title: recordTitle(record, input.title, updatedContext),
    status: input.status || "ready-for-sync",
    syncNotes: buildSyncNotes(
      record.syncNotes,
      input.syncNotes,
      "Form recommendations attached to master case.",
    ),
  });
}

export function addFactToMasterCase(input: AddFactInput): PersistedCaseRecord {
  const record = loadRecord(input);

  const existingContext = record?.caseContext;

  const baseContext =
    existingContext ||
    buildCaseContext({
      caseId: record?.id || input.caseId,
      userId: record?.userId || input.userId,
      casePath: record?.casePath || "unknown",
      stage: record?.stage || "not-sure",
      partyRole: "unknown",
      title: recordTitle(record || null, input.title),
      summary: "",
      facts: [],
      evidenceItems: [],
      formNeeds: [],
    });

  const updatedContext = addCaseFact(baseContext, input.fact);

  if (!record) {
    return saveCaseRecordLocal({
      id: updatedContext.caseId,
      userId: updatedContext.userId,
      title: updatedContext.title,
      caseContext: updatedContext,
      evidencePackages: [],
      workspaceDocuments: [],
      status: input.status || "ready-for-sync",
      syncNotes: buildSyncNotes(
        [],
        input.syncNotes,
        "Created new master case record from added fact.",
      ),
    });
  }

  return saveUpdatedRecord(record, {
    caseContext: updatedContext,
    title: recordTitle(record, input.title, updatedContext),
    status: input.status || "ready-for-sync",
    syncNotes: buildSyncNotes(
      record.syncNotes,
      input.syncNotes,
      "Fact added to master case and context recalculated.",
    ),
  });
}

export function getActiveMasterCaseRecord(): PersistedCaseRecord | null {
  return getActiveCaseRecordLocal();
}

export function getMasterCaseRecordById(
  caseId: string,
): PersistedCaseRecord | null {
  return getCaseRecordByIdLocal(caseId);
}