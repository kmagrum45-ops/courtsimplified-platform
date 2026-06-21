import {
  CaseConfidence,
  CaseLegalDomain,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type ClaimTheoryVersion = "1.0.0";

export type ClaimTheoryStatus =
  | "dominant"
  | "active"
  | "secondary"
  | "alternative"
  | "possible"
  | "suppressed"
  | "rejected"
  | "unknown";

export type ClaimTheorySource =
  | "user-narrative"
  | "claim-arbitration"
  | "legal-knowledge"
  | "evidence"
  | "timeline"
  | "procedure"
  | "human-review"
  | "unknown";

export type ClaimElementStatus =
  | "satisfied"
  | "partially-satisfied"
  | "missing"
  | "contradicted"
  | "not-applicable";

export type ClaimTheoryRiskType =
  | "missing-element"
  | "weak-evidence"
  | "causation-gap"
  | "limitation-risk"
  | "jurisdiction-risk"
  | "remedy-risk"
  | "credibility-risk"
  | "proportionality-risk"
  | "procedural-risk"
  | "conflicting-theory"
  | "unsupported-damages"
  | "unknown";

export type ClaimCompatibilityStatus =
  | "compatible"
  | "partially-compatible"
  | "incompatible"
  | "requires-election"
  | "unknown";

export type ClaimTheoryElement = {
  id: string;
  key: string;
  label: string;
  description: string;
  status: ClaimElementStatus;
  supportingFactIds: string[];
  supportingEvidenceIds: string[];
  supportingTimelineEventIds: string[];
  missingFacts: string[];
  missingEvidence: string[];
  risks: string[];
  confidence: CaseConfidence;
};

export type ClaimTheoryBurden = {
  id: string;
  issueLabel: string;
  burdenHolder: "user" | "other-side" | "shared" | "unknown";
  standard:
    | "balance-of-probabilities"
    | "best-interests"
    | "statutory-test"
    | "beyond-reasonable-doubt"
    | "unknown";
  whatMustBeProven: string[];
  currentProofStrength: CaseConfidence;
  missingProof: string[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  explanation: string;
};

export type ClaimTheoryRemedy = {
  id: string;
  remedyType:
    | "money-damages"
    | "general-damages"
    | "special-damages"
    | "aggravated-damages"
    | "punitive-damages"
    | "injunction"
    | "declaration"
    | "apology"
    | "retraction"
    | "parenting-order"
    | "support-order"
    | "property-order"
    | "dismissal"
    | "costs"
    | "interest"
    | "enforcement"
    | "unknown";
  requestedAmount?: number;
  fit:
    | "appears-available"
    | "possibly-available"
    | "weak-fit"
    | "not-available"
    | "unknown";
  proofNeeded: string[];
  proportionalityConcerns: string[];
  warnings: string[];
};

export type ClaimTheoryRisk = {
  id: string;
  riskType: ClaimTheoryRiskType;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  linkedElementIds: string[];
  linkedEvidenceIds: string[];
};

export type ClaimTheoryCompatibility = {
  id: string;
  otherClaimTheoryId: string;
  status: ClaimCompatibilityStatus;
  explanation: string;
  conflictIssues: string[];
  suggestedResolution: string;
};

export type ClaimTheorySuppression = {
  id: string;
  reason: string;
  suppressedByClaimTheoryId?: string;
  suppressedBecause:
    | "dominant-narrative"
    | "unsupported-facts"
    | "incompatible-theory"
    | "wrong-forum"
    | "insufficient-evidence"
    | "procedural-barrier"
    | "human-review"
    | "unknown";
  canBeRevivedIf: string[];
};

export type ClaimTheory = {
  id: string;
  version: ClaimTheoryVersion;

  domain: CaseLegalDomain;
  title: string;
  status: ClaimTheoryStatus;

  source: ClaimTheorySource;
  explanation: string;

  score: number;
  confidence: CaseConfidence;

  elements: ClaimTheoryElement[];
  burdens: ClaimTheoryBurden[];
  remedies: ClaimTheoryRemedy[];
  risks: ClaimTheoryRisk[];
  compatibility: ClaimTheoryCompatibility[];
  suppression?: ClaimTheorySuppression;

  linkedFactIds: string[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  linkedProceduralIssueIds: string[];
  linkedKnowledgeObjectIds: string[];

  arbitrationNotes: string[];
};

export type ClaimTheoryArbitrationResult = {
  id: string;
  dominantClaimTheoryIds: string[];
  activeClaimTheoryIds: string[];
  secondaryClaimTheoryIds: string[];
  alternativeClaimTheoryIds: string[];
  suppressedClaimTheoryIds: string[];
  rejectedClaimTheoryIds: string[];

  explanation: string;
  warnings: string[];
  confidence: CaseConfidence;
};

export type ClaimTheoryModel = {
  id: string;
  version: ClaimTheoryVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;
  stage: CaseStage;

  theories: ClaimTheory[];
  arbitration: ClaimTheoryArbitrationResult;

  globalRisks: ClaimTheoryRisk[];
  warnings: string[];
  confidence: CaseConfidence;
};

export type ClaimTheoryBuildInput = {
  caseId?: string;
  stage: CaseStage;
  claimCandidates: Array<{
    id?: string;
    domain: CaseLegalDomain;
    title: string;
    status?: ClaimTheoryStatus;
    explanation: string;
    score?: number;
    confidence?: CaseConfidence;
    supportingEvidenceIds?: string[];
    supportingTimelineEventIds?: string[];
    missingFacts?: string[];
    risks?: string[];
    suppressionReason?: string;
  }>;
};

export type ClaimTheoryBuildOutput = {
  model: ClaimTheoryModel;
  warnings: string[];
};