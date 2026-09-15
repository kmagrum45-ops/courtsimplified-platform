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

  /**
   * What the intake records, stated as such. Was `strengths`.
   *
   * RENAMED, NOT REWRITTEN — the entries were already recorded-vs-not ("The
   * intake identifies Crown/police involvement", "The intake alleges known
   * history"). Only the field name graded, and a field name is what a reader
   * scanning for section 3 problems stops on.
   */
  recordedInIntake: string[];
  /**
   * General information about this KIND of claim. Was `weaknesses`.
   *
   * Same treatment, same reason. The entries are statements about the theory
   * in general — that misfeasance has a high threshold, that public-authority
   * claims meet immunity and justiciability arguments — not findings about the
   * user's case. Under the old name they read as an assessment of it.
   */
  generalConsiderations: string[];
  proofGaps: string[];
  likelyDefences: string[];

  causationConcerns: string[];
  damagesConcerns: string[];

  /*
   * `confidence: "low" | "moderate" | "strong" | "very-strong"` was here.
   *
   * A four-rung ordinal ladder on a liability theory, which is a grade of the
   * merits however it is spelled — and `confidence` is one of the six spellings
   * the section 3 sweep found surviving a name-based pass (OUTSTANDING_ISSUES
   * section 11). Two call sites set it, both to the literal "moderate", and
   * NOTHING READ IT: no consumer of CivilLiabilityTheory.confidence exists in
   * src/ or app/. Deleted with the field rather than emptied.
   */
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
  /**
   * Legal theories DETECTED in the recorded facts, in the order they were
   * detected. Was `strongestTheories` — the adjective ranked the user's own
   * theories against each other.
   */
  recordedTheories: string[];

  // Removed, slots included:
  //   likelyDefenceArguments    - predicted the opponent's case
  //   likelyJudgeConcerns       - predicted a judge
  //   settlementConsiderations  - settlement pressure
  //   negotiationLeverage       - the same list under a second name
  //   proceduralPressurePoints  - litigationRisks under a second name
  // The first two were already forced to `[]` with a comment saying they were
  // a section 3 violation. Empty named slots are how this content comes back;
  // the fields are gone.

  /** Recorded procedural and evidentiary concerns. Was `litigationRisks`. */
  recordedConcerns: string[];

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