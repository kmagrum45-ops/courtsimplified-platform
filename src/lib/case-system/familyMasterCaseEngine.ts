import type { FamilyCaseDocument } from "./types/family-case.ts";

import {
  normalizeFamilyAiIntake,
  type FamilyAiIntakeInput,
  type FamilyNormalizedIntake,
} from "./familyAiIntakeNormalizer";

import {
  analyzeFamilyStrategy,
  type FamilyStrategyInput,
  type FamilyStrategyResult,
} from "./familyStrategyEngine";

import {
  runFamilyWorkflowEngine,
  type FamilyWorkflowResult,
} from "./familyWorkflowEngine";

import {
  runFamilyFormRoutingEngine,
  type FamilyFormRoutingResult,
} from "./familyFormRoutingEngine";

import {
  runFamilyCaseFileCatalogEngine,
  type FamilyCaseFileCatalogResult,
  type FamilyCaseFileUpload,
} from "./familyCaseFileCatalogEngine";

import {
  runFamilyEvidenceEngine,
  type FamilyEvidenceEngineResult,
  type FamilyEvidenceRawItem,
} from "./familyEvidenceEngine";

import {
  runFamilyAffidavitNarrativeEngine,
  type FamilyNarrativeResult,
  type FamilyNarrativeTone,
} from "./familyAffidavitNarrativeEngine";

export type FamilyMasterCaseInput = {
  caseStage?: string;
  role?: string;
  relationshipStatus?: string;
  issues?: string[];
  filedDocuments?: string[];
  completedForms?: string[];
  receivedForms?: string[];

  yourName?: string;
  otherParty?: string;
  childrenInfo?: string;
  currentLivingSituation?: string;
  pastLivingHistory?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
  safetyConcerns?: string;
  propertyHomeDetails?: string;
  upcomingCourtDate?: string;

  financialDisclosure?: string;
  parentingSchedule?: string;
  communicationHistory?: string;
  policeInvolvement?: string;
  childProtectionInvolvement?: string;
  schoolIssues?: string;
  medicalIssues?: string;
  relocationDetails?: string;
  existingOrders?: string;
  settlementHistory?: string;

  uploadedFiles?: FamilyCaseFileUpload[];
  existingDocuments?: FamilyCaseDocument[];
  rawEvidence?: FamilyEvidenceRawItem[];

  narrativeTone?: FamilyNarrativeTone;
  userData?: Record<string, unknown>;
};

export type FamilyMasterCaseStatus =
  | "ready-for-next-step"
  | "needs-user-information"
  | "needs-document-upload"
  | "needs-evidence-review"
  | "urgent-review-needed"
  | "blocked-before-generation";

export type FamilyMasterCaseConfidence = "high" | "medium" | "low";

export type FamilyMasterCaseResult = {
  courtPath: "family";
  status: FamilyMasterCaseStatus;
  confidence: FamilyMasterCaseConfidence;

  normalized: FamilyNormalizedIntake;
  strategy: FamilyStrategyResult;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  caseFileCatalog: FamilyCaseFileCatalogResult;
  evidence: FamilyEvidenceEngineResult;
  narrative: FamilyNarrativeResult;

  documentsPage: {
    requiredFormLabels: string[];
    recommendedFormLabels: string[];
    notNeededNowLabels: string[];
    blockedFormLabels: string[];
    completedFormLabels: string[];
    receivedFormLabels: string[];
    missingUploads: string[];
  };

  evidencePage: {
    uploadRequests: string[];
    evidenceGaps: string[];
    strongestEvidenceTitles: string[];
    riskyEvidenceTitles: string[];
    exhibitGroups: string[];
  };

  builderSummary: {
    judgeReadySummary: string;
    nextBestActions: string[];
    blockers: string[];
    warnings: string[];
    questionsToAskUser: string[];
  };

  chatContext: {
    shortCaseSummary: string;
    detectedIssues: string[];
    currentStage: string;
    nextStep: string;
    formsToDiscuss: string[];
    evidenceToRequest: string[];
    draftingWarnings: string[];
  };

  systemAudit: {
    enginesRun: string[];
    criticalBlockers: string[];
    duplicateWarnings: string[];
    metadataWarnings: string[];
    consistencyWarnings: string[];
  };
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => clean(item))
        .filter((item) => item.length > 0),
    ),
  );
}

function safeStringArray(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return cleanList(items.map((item) => clean(item)));
}

function mergeUserData(input: FamilyMasterCaseInput): Record<string, unknown> {
  return {
    ...(input.userData || {}),
    yourRole: input.role || input.userData?.yourRole,
    relationshipStatus: input.relationshipStatus || input.userData?.relationshipStatus,
    yourName: input.yourName || input.userData?.yourName,
    otherParty: input.otherParty || input.userData?.otherParty,
    childrenInfo: input.childrenInfo || input.userData?.childrenInfo,
    currentLivingSituation: input.currentLivingSituation || input.userData?.currentLivingSituation,
    pastLivingHistory: input.pastLivingHistory || input.userData?.pastLivingHistory,
    safetyConcerns: input.safetyConcerns || input.userData?.safetyConcerns,
    propertyHomeDetails: input.propertyHomeDetails || input.userData?.propertyHomeDetails,
    upcomingCourtDate: input.upcomingCourtDate || input.userData?.upcomingCourtDate,
    financialDisclosure: input.financialDisclosure || input.userData?.financialDisclosure,
    parentingSchedule: input.parentingSchedule || input.userData?.parentingSchedule,
    communicationHistory: input.communicationHistory || input.userData?.communicationHistory,
    policeInvolvement: input.policeInvolvement || input.userData?.policeInvolvement,
    childProtectionInvolvement: input.childProtectionInvolvement || input.userData?.childProtectionInvolvement,
    schoolIssues: input.schoolIssues || input.userData?.schoolIssues,
    medicalIssues: input.medicalIssues || input.userData?.medicalIssues,
    relocationDetails: input.relocationDetails || input.userData?.relocationDetails,
    existingOrders: input.existingOrders || input.userData?.existingOrders,
    settlementHistory: input.settlementHistory || input.userData?.settlementHistory,
  };
}

function buildNormalizerInput(input: FamilyMasterCaseInput): FamilyAiIntakeInput {
  return {
    caseStage: input.caseStage,
    role: input.role,
    relationshipStatus: input.relationshipStatus,
    issues: safeStringArray(input.issues),
    filedDocuments: safeStringArray(input.filedDocuments),
    completedForms: safeStringArray(input.completedForms),
    receivedForms: safeStringArray(input.receivedForms),

    yourName: input.yourName,
    otherParty: input.otherParty,
    childrenInfo: input.childrenInfo,
    currentLivingSituation: input.currentLivingSituation,
    pastLivingHistory: input.pastLivingHistory,
    facts: input.facts,
    timeline: input.timeline,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence,
    goal: input.goal,
    urgent: input.urgent,
    safetyConcerns: input.safetyConcerns,
    propertyHomeDetails: input.propertyHomeDetails,
    upcomingCourtDate: input.upcomingCourtDate,

    financialDisclosure: input.financialDisclosure,
    parentingSchedule: input.parentingSchedule,
    communicationHistory: input.communicationHistory,
    policeInvolvement: input.policeInvolvement,
    childProtectionInvolvement: input.childProtectionInvolvement,
    schoolIssues: input.schoolIssues,
    medicalIssues: input.medicalIssues,
    relocationDetails: input.relocationDetails,
    existingOrders: input.existingOrders,
    settlementHistory: input.settlementHistory,

    userData: mergeUserData(input),
  };
}

function buildStrategyInput(input: FamilyMasterCaseInput): FamilyStrategyInput {
  return {
    caseStage: input.caseStage,
    issues: safeStringArray(input.issues),
    filedDocuments: safeStringArray(input.filedDocuments),

    yourName: input.yourName,
    otherParty: input.otherParty,
    childrenInfo: input.childrenInfo,
    currentLivingSituation: input.currentLivingSituation,
    pastLivingHistory: input.pastLivingHistory,
    facts: input.facts,
    timeline: input.timeline,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence,
    goal: input.goal,
    urgent: input.urgent,
    safetyConcerns: input.safetyConcerns,
    propertyHomeDetails: input.propertyHomeDetails,
    upcomingCourtDate: input.upcomingCourtDate,

    financialDisclosure: input.financialDisclosure,
    parentingSchedule: input.parentingSchedule,
    communicationHistory: input.communicationHistory,
    policeInvolvement: input.policeInvolvement,
    childProtectionInvolvement: input.childProtectionInvolvement,
    schoolIssues: input.schoolIssues,
    medicalIssues: input.medicalIssues,
    relocationDetails: input.relocationDetails,
    existingOrders: input.existingOrders,
    settlementHistory: input.settlementHistory,
  };
}

function buildInitialRawEvidence(input: FamilyMasterCaseInput): FamilyEvidenceRawItem[] {
  const rawEvidence: FamilyEvidenceRawItem[] = [...(input.rawEvidence || [])];

  if (clean(input.evidence)) {
    rawEvidence.push({
      id: "typed_evidence_summary",
      title: "Typed evidence summary",
      description: clean(input.evidence),
      category: "other",
      source: "user intake",
      relevance: clean(input.goal || input.facts),
    });
  }

  return rawEvidence;
}

function determineStatus(params: {
  normalized: FamilyNormalizedIntake;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  caseFileCatalog: FamilyCaseFileCatalogResult;
  evidence: FamilyEvidenceEngineResult;
  narrative: FamilyNarrativeResult;
}): FamilyMasterCaseStatus {
  const { normalized, workflow, formRouting, caseFileCatalog, evidence, narrative } = params;

  if (normalized.procedural.isUrgent || workflow.primaryPriority === "urgent-safety") {
    return "urgent-review-needed";
  }

  if (formRouting.blockersBeforeGeneration.length > 0 || workflow.blockersBeforeForms.length > 0) {
    return "blocked-before-generation";
  }

  if (caseFileCatalog.missingRequiredUploads.length > 0) {
    return "needs-document-upload";
  }

  if (evidence.evidenceGaps.some((gap) => gap.priority === "critical") || narrative.unsupportedAllegations.length > 0) {
    return "needs-evidence-review";
  }

  if (normalized.missingInformation.length > 0) {
    return "needs-user-information";
  }

  return "ready-for-next-step";
}

function determineConfidence(params: {
  normalized: FamilyNormalizedIntake;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  evidence: FamilyEvidenceEngineResult;
  narrative: FamilyNarrativeResult;
}): FamilyMasterCaseConfidence {
  const { normalized, workflow, formRouting, evidence, narrative } = params;

  let score = 100;

  score -= normalized.missingInformation.length * 8;
  score -= workflow.blockersBeforeForms.length * 10;
  score -= formRouting.blockersBeforeGeneration.length * 10;
  score -= evidence.evidenceGaps.length * 7;
  score -= narrative.unsupportedAllegations.length * 6;

  if (normalized.primaryConfidence < 40) score -= 15;
  if (evidence.strongestEvidence.length === 0) score -= 10;

  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function consistencyWarnings(params: {
  normalized: FamilyNormalizedIntake;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  caseFileCatalog: FamilyCaseFileCatalogResult;
}): string[] {
  const { normalized, workflow, formRouting, caseFileCatalog } = params;
  const warnings: string[] = [];

  if (normalized.procedural.isResponding && caseFileCatalog.receivedForms.length === 0) {
    warnings.push("The case is marked as responding, but no received forms are cataloged yet.");
  }

  if (workflow.supportIssues.length > 0 && caseFileCatalog.financialDisclosure.length === 0) {
    warnings.push("Support issues are detected, but no financial disclosure documents are cataloged yet.");
  }

  if (normalized.procedural.hasExistingOrder && caseFileCatalog.courtOrders.length === 0) {
    warnings.push("The intake suggests an existing order, but no order is cataloged yet.");
  }

  if (formRouting.requiredNow.length > 0 && caseFileCatalog.missingRequiredUploads.length > 0) {
    warnings.push("Required forms are detected, but matching uploaded/generated documents are missing.");
  }

  return cleanList(warnings);
}

export function runFamilyMasterCaseEngine(input: FamilyMasterCaseInput): FamilyMasterCaseResult {
  const normalized = normalizeFamilyAiIntake(buildNormalizerInput(input));
  const strategy = analyzeFamilyStrategy(buildStrategyInput(input));
  const workflow = runFamilyWorkflowEngine({ normalized, strategy });
  const formRouting = runFamilyFormRoutingEngine({ normalized, strategy, workflow });

  const firstCatalog = runFamilyCaseFileCatalogEngine({
    normalized,
    workflow,
    formRouting,
    uploadedFiles: input.uploadedFiles || [],
    existingDocuments: input.existingDocuments || [],
  });

  const evidence = runFamilyEvidenceEngine({
    normalized,
    strategy,
    workflow,
    formRouting,
    rawEvidence: cleanEvidenceItems([
      ...buildInitialRawEvidence(input),
      ...firstCatalog.rawEvidenceForEvidenceEngine,
    ]),
  });

  const caseFileCatalog = runFamilyCaseFileCatalogEngine({
    normalized,
    workflow,
    formRouting,
    evidence,
    uploadedFiles: input.uploadedFiles || [],
    existingDocuments: input.existingDocuments || [],
  });

  const narrative = runFamilyAffidavitNarrativeEngine({
    normalized,
    strategy,
    workflow,
    formRouting,
    evidence,
    rawFacts: input.facts,
    rawTimeline: input.timeline,
    rawGoal: input.goal,
    rawUrgent: input.urgent || input.safetyConcerns,
    tone: input.narrativeTone || "court-ready",
  });

  const status = determineStatus({
    normalized,
    workflow,
    formRouting,
    caseFileCatalog,
    evidence,
    narrative,
  });

  const confidence = determineConfidence({
    normalized,
    workflow,
    formRouting,
    evidence,
    narrative,
  });

  const auditConsistencyWarnings = consistencyWarnings({
    normalized,
    workflow,
    formRouting,
    caseFileCatalog,
  });

  const requiredFormLabels = cleanList(formRouting.requiredNow.map((form) => form.officialLabel));
  const recommendedFormLabels = cleanList(formRouting.recommendedNow.map((form) => form.officialLabel));
  const notNeededNowLabels = cleanList(formRouting.notNeededNow.map((form) => form.officialLabel));
  const blockedFormLabels = cleanList(formRouting.blocked.map((form) => form.officialLabel));

  const evidenceGaps = cleanList(evidence.evidenceGaps.map((gap) => `${gap.issue}: ${gap.missingEvidence.join(", ")}`));
  const exhibitGroups = cleanList(evidence.evidencePackages.map((pack) => pack.packageTitle));

  const nextStep = workflow.workflowSteps[0]?.title || workflow.summary;

  return {
    courtPath: "family",
    status,
    confidence,

    normalized,
    strategy,
    workflow,
    formRouting,
    caseFileCatalog,
    evidence,
    narrative,

    documentsPage: {
      requiredFormLabels,
      recommendedFormLabels,
      notNeededNowLabels,
      blockedFormLabels,
      completedFormLabels: caseFileCatalog.completedFormLabels,
      receivedFormLabels: caseFileCatalog.receivedFormLabels,
      missingUploads: caseFileCatalog.missingRequiredUploads,
    },

    evidencePage: {
      uploadRequests: evidence.evidenceUploadRequests,
      evidenceGaps,
      strongestEvidenceTitles: evidence.strongestEvidence.map((item) => item.title),
      riskyEvidenceTitles: evidence.riskyEvidence.map((item) => item.title),
      exhibitGroups,
    },

    builderSummary: {
      judgeReadySummary: narrative.judgeReadySummary,
      nextBestActions: cleanList([
        ...workflow.nextBestActions,
        ...narrative.nextDraftingActions,
        ...caseFileCatalog.nextCatalogActions,
      ]),
      blockers: cleanList([
        ...workflow.blockersBeforeForms,
        ...formRouting.blockersBeforeGeneration,
        ...caseFileCatalog.missingRequiredUploads,
      ]),
      warnings: cleanList([
        ...workflow.proceduralWarnings,
        ...formRouting.routingWarnings,
        ...narrative.draftingWarnings,
        ...caseFileCatalog.metadataWarnings,
        ...auditConsistencyWarnings,
      ]),
      questionsToAskUser: normalized.recommendedQuestions,
    },

    chatContext: {
      shortCaseSummary: narrative.judgeReadySummary,
      detectedIssues: cleanList([
        ...workflow.detectedCaseTypes,
        ...workflow.parentingIssues,
        ...workflow.supportIssues,
        ...workflow.safetyIssues,
        ...workflow.propertyIssues,
      ]),
      currentStage: normalized.stage,
      nextStep,
      formsToDiscuss: cleanList([...requiredFormLabels, ...recommendedFormLabels]),
      evidenceToRequest: evidence.evidenceUploadRequests,
      draftingWarnings: narrative.draftingWarnings,
    },

    systemAudit: {
      enginesRun: [
        "familyAiIntakeNormalizer",
        "familyStrategyEngine",
        "familyWorkflowEngine",
        "familyFormRoutingEngine",
        "familyCaseFileCatalogEngine",
        "familyEvidenceEngine",
        "familyAffidavitNarrativeEngine",
        "familyMasterCaseEngine",
      ],
      criticalBlockers: cleanList([
        ...workflow.blockersBeforeForms,
        ...formRouting.blockersBeforeGeneration,
        ...caseFileCatalog.missingRequiredUploads,
      ]),
      duplicateWarnings: caseFileCatalog.duplicateWarnings,
      metadataWarnings: caseFileCatalog.metadataWarnings,
      consistencyWarnings: auditConsistencyWarnings,
    },
  };
}

function cleanEvidenceItems(items: FamilyEvidenceRawItem[]): FamilyEvidenceRawItem[] {
  const seen = new Set<string>();
  const result: FamilyEvidenceRawItem[] = [];

  for (const item of items) {
    const key = clean(`${item.id}|${item.title}|${item.fileName}|${item.description}|${item.uploadedPath}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
