import type {
  CaseFormNeed,
  CaseReadiness,
  CaseRisk,
  CaseTimelineEvent,
} from "../caseContextEngine";

import type { EvidenceItem } from "../evidenceEngine";

export type CivilCaseType =
  | "negligence"
  | "defamation"
  | "breach-of-contract"
  | "occupier-liability"
  | "property-damage"
  | "personal-injury"
  | "professional-negligence"
  | "charter"
  | "misfeasance"
  | "human-rights"
  | "privacy"
  | "employment"
  | "insurance"
  | "debt"
  | "mixed-civil"
  | "unknown";

export type CivilProceduralTrack =
  | "pre-filing"
  | "pleadings"
  | "motion"
  | "discovery"
  | "mediation"
  | "pre-trial"
  | "trial"
  | "appeal"
  | "enforcement"
  | "urgent"
  | "unknown";

export type CivilRemedyType =
  | "damages"
  | "general-damages"
  | "special-damages"
  | "aggravated-damages"
  | "punitive-damages"
  | "injunction"
  | "declaratory-relief"
  | "specific-performance"
  | "charter-damages"
  | "costs"
  | "other";

export type CivilLiabilityTheory = {
  id: string;
  title: string;
  description: string;

  requiredElements: string[];
  linkedEvidenceIds: Array<string | number>;
  linkedTimelineEventIds: string[];

  strengths: string[];
  weaknesses: string[];
  proofGaps: string[];
  likelyDefences: string[];

  causationConcerns: string[];
  damagesConcerns: string[];

  confidence:
    | "low"
    | "moderate"
    | "strong"
    | "very-strong";
};

export type CivilDamagesProfile = {
  claimedAmount?: number;

  remedyTypes: CivilRemedyType[];

  financialLosses: string[];
  emotionalHarms: string[];
  reputationalHarms: string[];
  physicalHarms: string[];

  aggravatedFactors: string[];
  punitiveFactors: string[];

  causationConcerns: string[];
  mitigationConcerns: string[];

  damagesProofMissing: string[];
};

export type CivilProcedureProfile = {
  proceduralTrack: CivilProceduralTrack;

  limitationConcerns: string[];
  jurisdictionConcerns: string[];
  serviceConcerns: string[];
  pleadingConcerns: string[];
  disclosureConcerns: string[];

  motionsExpected: string[];
  proceduralDeadlines: string[];

  readinessWarnings: string[];
};

export type CivilEvidenceProfile = {
  evidenceItems: EvidenceItem[];

  keyEvidenceStrengths: string[];
  contradictionWarnings: string[];
  credibilityConcerns: string[];

  missingEvidence: string[];
  authenticationConcerns: string[];

  expertEvidenceNeeded: string[];
  witnessConcerns: string[];
};

export type CivilNarrativeProfile = {
  coreTheoryNarrative: string;

  chronologySummary: string[];
  liabilitySummary: string[];
  causationSummary: string[];
  damagesSummary: string[];

  judicialConcerns: string[];
  defenceVulnerabilities: string[];

  toneWarnings: string[];
  unsupportedAssertions: string[];

  draftingFocusAreas: string[];
};

export type CivilCaseFileCatalog = {
  uploadedDocuments: Array<{
    id: string;
    title: string;

    type:
      | "pleading"
      | "evidence"
      | "medical"
      | "financial"
      | "communication"
      | "expert"
      | "court-order"
      | "contract"
      | "other";

    status:
      | "uploaded"
      | "missing"
      | "draft"
      | "served"
      | "filed";

    linkedIssues: string[];
    linkedEvidenceIds: Array<string | number>;

    importance:
      | "low"
      | "medium"
      | "high"
      | "critical";
  }>;

  missingCriticalDocuments: string[];
  duplicateWarnings: string[];
  staleDocumentWarnings: string[];

  nextDocumentActions: string[];
};

export type CivilStrategicProfile = {
  strongestTheories: string[];

  likelyDefenceArguments: string[];
  likelyJudgeConcerns: string[];

  settlementConsiderations: string[];
  litigationRisks: string[];

  negotiationLeverage: string[];
  proceduralPressurePoints: string[];

  strategicNextSteps: string[];
};

export type CivilCaseData = {
  caseId: string;

  createdAt: string;
  updatedAt: string;

  title: string;
  summary: string;

  civilCaseTypes: CivilCaseType[];

  facts: string[];

  timeline: CaseTimelineEvent[];

  liabilityTheories: CivilLiabilityTheory[];

  damagesProfile: CivilDamagesProfile;

  procedureProfile: CivilProcedureProfile;

  evidenceProfile: CivilEvidenceProfile;

  narrativeProfile: CivilNarrativeProfile;

  strategicProfile: CivilStrategicProfile;

  caseFileCatalog: CivilCaseFileCatalog;

  formNeeds: CaseFormNeed[];

  risks: CaseRisk[];

  readiness: CaseReadiness;

  missingInformation: string[];

  nextSteps: string[];

  litigationGoals: string[];

  requestedRemedies: string[];
};

export type CivilAnalysisResult = {
  summary: string;

  strongestTheory?: string;

  liabilityStrength:
    | "weak"
    | "developing"
    | "moderate"
    | "strong";

  causationStrength:
    | "weak"
    | "developing"
    | "moderate"
    | "strong";

  damagesStrength:
    | "weak"
    | "developing"
    | "moderate"
    | "strong";

  strongestEvidence: string[];

  biggestProofGaps: string[];

  proceduralWarnings: string[];

  likelyDefenceArguments: string[];

  recommendedNextSteps: string[];

  recommendedForms: CaseFormNeed[];

  readiness: CaseReadiness;
};