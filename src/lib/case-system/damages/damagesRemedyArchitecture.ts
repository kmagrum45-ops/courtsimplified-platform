import {
  CaseConfidence,
  CaseLegalDomain,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type DamagesRemedyVersion = "1.0.0";

export type DamagesCategory =
  | "general-damages"
  | "special-damages"
  | "aggravated-damages"
  | "punitive-damages"
  | "statutory-damages"
  | "property-loss"
  | "lost-income"
  | "debt"
  | "support"
  | "costs"
  | "interest"
  | "non-monetary"
  | "unknown";

export type RemedyCategory =
  | "money"
  | "injunction"
  | "declaration"
  | "apology"
  | "retraction"
  | "parenting-order"
  | "support-order"
  | "property-order"
  | "dismissal"
  | "enforcement"
  | "settlement"
  | "unknown";

export type DamagesProofStatus =
  | "not-started"
  | "amount-stated"
  | "partially-supported"
  | "supported"
  | "well-supported"
  | "unsupported"
  | "unknown";

export type RemedyFitStatus =
  | "appears-available"
  | "possibly-available"
  | "weak-fit"
  | "wrong-forum"
  | "not-available"
  | "unknown";

export type DamagesRiskType =
  | "amount-unsupported"
  | "causation-gap"
  | "proof-gap"
  | "proportionality-risk"
  | "mitigation-risk"
  | "wrong-remedy"
  | "wrong-forum"
  | "double-counting"
  | "credibility-risk"
  | "unknown";

export type DamagesAmount = {
  id: string;
  category: DamagesCategory;
  label: string;
  amount?: number;
  currency: "CAD" | "USD" | "unknown";
  rawText?: string;
  calculationExplanation?: string;
  confidence: CaseConfidence;
};

export type DamagesProofRequirement = {
  id: string;
  category: DamagesCategory;
  requiredProof: string;
  availableEvidenceIds: string[];
  missingEvidence: string[];
  explanation: string;
  strength: CaseConfidence;
};

export type DamagesCausationLink = {
  id: string;
  linkedClaimTheoryId?: string;
  linkedTimelineEventIds: string[];
  linkedEvidenceIds: string[];
  explanation: string;
  gaps: string[];
  strength: CaseConfidence;
};

export type RemedyAssessment = {
  id: string;
  remedyCategory: RemedyCategory;
  requestedLabel: string;
  requestedAmountId?: string;
  fit: RemedyFitStatus;
  linkedClaimTheoryIds: string[];
  linkedEvidenceIds: string[];
  proofNeeded: string[];
  warnings: string[];
  alternatives: RemedyCategory[];
  confidence: CaseConfidence;
};

export type DamagesRisk = {
  id: string;
  riskType: DamagesRiskType;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  linkedAmountIds: string[];
  linkedRemedyIds: string[];
  linkedEvidenceIds: string[];
};

export type DamagesReadinessState = {
  overallReadiness: CaseConfidence;
  amountReadiness: CaseConfidence;
  proofReadiness: CaseConfidence;
  causationReadiness: CaseConfidence;
  proportionalityReadiness: CaseConfidence;
  remedyFitReadiness: CaseConfidence;
  settlementReadiness: CaseConfidence;
  blockers: string[];
  nextDamagesActions: string[];
};

export type DamagesRemedyModel = {
  id: string;
  version: DamagesRemedyVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;
  stage: CaseStage;

  legalDomains: CaseLegalDomain[];

  amounts: DamagesAmount[];
  proofRequirements: DamagesProofRequirement[];
  causationLinks: DamagesCausationLink[];
  remedyAssessments: RemedyAssessment[];
  risks: DamagesRisk[];

  readiness: DamagesReadinessState;

  warnings: string[];
  confidence: CaseConfidence;
};

export type DamagesRemedyBuildInput = {
  caseId?: string;
  stage: CaseStage;
  legalDomains: CaseLegalDomain[];
  requestedAmounts?: Array<{
    id?: string;
    category?: DamagesCategory;
    label: string;
    amount?: number;
    currency?: "CAD" | "USD" | "unknown";
    rawText?: string;
    calculationExplanation?: string;
    linkedEvidenceIds?: string[];
  }>;
  requestedRemedies?: Array<{
    id?: string;
    remedyCategory: RemedyCategory;
    label: string;
    linkedClaimTheoryIds?: string[];
    linkedEvidenceIds?: string[];
  }>;
  linkedTimelineEventIds?: string[];
  linkedEvidenceIds?: string[];
};

export type DamagesRemedyBuildOutput = {
  model: DamagesRemedyModel;
  warnings: string[];
};