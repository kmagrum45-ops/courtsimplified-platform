import {
  runFamilyMasterCaseEngine,
  type FamilyMasterCaseInput,
  type FamilyMasterCaseResult,
} from "../familyMasterCaseEngine";
import { runCourtSimplifiedBrain } from "../intelligence/courtSimplifiedBrain";
import type {
  CourtSimplifiedBrainOutput,
} from "../intelligence/intelligenceTypes";

export type FamilyCanonicalIntakeOptions = {
  caseId?: string;
  allowExternalCognition?: boolean;
};

export type FamilyCanonicalStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "not-sure";

export type FamilyCanonicalIntakeResult = {
  courtPath: "family";
  province: "Ontario";
  stage: FamilyCanonicalStage;
  role: string;
  familyMasterResult: FamilyMasterCaseResult;
  brain: CourtSimplifiedBrainOutput;
  masterResultPatch: Record<string, unknown>;
  dashboardPatch: Record<string, unknown>;
  recommendedNextRoute?: string;
};

const VALID_STAGES: FamilyCanonicalStage[] = [
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

function normalizeStage(value: unknown): FamilyCanonicalStage {
  const normalized = clean(value).toLowerCase().replace(/\s+/g, "-");
  return VALID_STAGES.includes(normalized as FamilyCanonicalStage)
    ? (normalized as FamilyCanonicalStage)
    : "not-sure";
}

function buildCanonicalNarrative(input: FamilyMasterCaseInput): string {
  return [
    "Court path: Family",
    "Jurisdiction: Ontario",
    `Stage: ${normalizeStage(input.caseStage)}`,
    clean(input.role) ? `User role: ${clean(input.role)}` : "",
    clean(input.yourName) ? `User: ${clean(input.yourName)}` : "",
    clean(input.otherParty) ? `Other party: ${clean(input.otherParty)}` : "",
    input.issues?.length ? `Selected issues: ${input.issues.join("; ")}` : "",
    input.filedDocuments?.length
      ? `Existing documents: ${input.filedDocuments.join("; ")}`
      : "",
    input.completedForms?.length
      ? `Completed forms: ${input.completedForms.join("; ")}`
      : "",
    input.receivedForms?.length
      ? `Received forms: ${input.receivedForms.join("; ")}`
      : "",
    clean(input.relationshipStatus)
      ? `Relationship status: ${clean(input.relationshipStatus)}`
      : "",
    clean(input.childrenInfo)
      ? `Children and parenting details: ${clean(input.childrenInfo)}`
      : "",
    clean(input.currentLivingSituation)
      ? `Current living situation: ${clean(input.currentLivingSituation)}`
      : "",
    clean(input.pastLivingHistory)
      ? `Past caregiving and living history: ${clean(input.pastLivingHistory)}`
      : "",
    clean(input.facts) ? `Facts: ${clean(input.facts)}` : "",
    clean(input.timeline) ? `Timeline: ${clean(input.timeline)}` : "",
    clean(input.evidence) ? `Evidence: ${clean(input.evidence)}` : "",
    clean(input.missingEvidence)
      ? `Missing evidence: ${clean(input.missingEvidence)}`
      : "",
    clean(input.goal) ? `Requested outcome: ${clean(input.goal)}` : "",
    clean(input.urgent) ? `Urgency: ${clean(input.urgent)}` : "",
    clean(input.safetyConcerns)
      ? `Safety concerns: ${clean(input.safetyConcerns)}`
      : "",
    clean(input.propertyHomeDetails)
      ? `Property, home, and disclosure details: ${clean(input.propertyHomeDetails)}`
      : "",
    clean(input.upcomingCourtDate)
      ? `Upcoming court date: ${clean(input.upcomingCourtDate)}`
      : "",
    clean(input.financialDisclosure)
      ? `Financial disclosure: ${clean(input.financialDisclosure)}`
      : "",
    clean(input.parentingSchedule)
      ? `Parenting schedule: ${clean(input.parentingSchedule)}`
      : "",
    clean(input.communicationHistory)
      ? `Communication history: ${clean(input.communicationHistory)}`
      : "",
    clean(input.policeInvolvement)
      ? `Police involvement: ${clean(input.policeInvolvement)}`
      : "",
    clean(input.childProtectionInvolvement)
      ? `Child protection involvement: ${clean(input.childProtectionInvolvement)}`
      : "",
    clean(input.schoolIssues) ? `School issues: ${clean(input.schoolIssues)}` : "",
    clean(input.medicalIssues)
      ? `Medical issues: ${clean(input.medicalIssues)}`
      : "",
    clean(input.relocationDetails)
      ? `Relocation details: ${clean(input.relocationDetails)}`
      : "",
    clean(input.existingOrders)
      ? `Existing orders: ${clean(input.existingOrders)}`
      : "",
    clean(input.settlementHistory)
      ? `Settlement history: ${clean(input.settlementHistory)}`
      : "",
    input.uploadedFiles?.length
      ? `Uploaded file metadata: ${input.uploadedFiles
          .map((file) =>
            [
              clean(file.fileName),
              clean(file.title),
              clean(file.category),
              clean(file.description),
              clean(file.source),
              clean(file.notes),
            ]
              .filter(Boolean)
              .join(" | "),
          )
          .filter(Boolean)
          .join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runFamilyIntakeCanonicalIntegration(
  input: FamilyMasterCaseInput,
  options: FamilyCanonicalIntakeOptions = {},
): Promise<FamilyCanonicalIntakeResult> {
  const stage = normalizeStage(input.caseStage);
  const familyMasterResult = runFamilyMasterCaseEngine({
    ...input,
    caseStage: stage,
  });

  const brain = await runCourtSimplifiedBrain({
    caseId: options.caseId,
    courtPath: "family",
    province: "Ontario",
    stage,
    rawUserText: buildCanonicalNarrative(input),
    existingMasterResult: {},
    sourceType: "user-intake",
    allowExternalCognition: options.allowExternalCognition,
  });

  const masterResultPatch = {
    ...brain.masterResultPatch,
    familyMasterResult,
    familyWorkflow: familyMasterResult.workflow,
    familyEvidence: familyMasterResult.evidence,
    familyFormRouting: familyMasterResult.formRouting,
    familyStrategy: familyMasterResult.strategy,
    familyNarrative: familyMasterResult.narrative,
    familyCaseFileCatalog: familyMasterResult.caseFileCatalog,
    familyIntegration: {
      source: "familyIntakeCanonicalAdapter",
      specializedSource: "familyMasterCaseEngine",
      canonicalSource: "CourtSimplifiedBrain",
      courtPath: "family",
      province: "Ontario",
      stage,
      role: familyMasterResult.normalized.role,
    },
  };

  return {
    courtPath: "family",
    province: "Ontario",
    stage,
    role: familyMasterResult.normalized.role,
    familyMasterResult,
    brain,
    masterResultPatch,
    dashboardPatch: brain.dashboardPatch,
    recommendedNextRoute: brain.recommendedNextRoute,
  };
}
