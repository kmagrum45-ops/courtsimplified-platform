import {
  CaseConfidence,
  CaseLegalDomain,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type CredibilityRiskVersion = "1.0.0";

export type CredibilityConcernType =
  | "inconsistency"
  | "timeline-conflict"
  | "unsupported-allegation"
  | "exaggeration-risk"
  | "selective-evidence"
  | "missing-context"
  | "emotional-overstatement"
  | "changing-story"
  | "damages-proportionality"
  | "weak-causation"
  | "procedural-noncompliance"
  | "unclear-relief"
  | "unknown";

export type JudicialRiskCategory =
  | "credibility"
  | "evidence"
  | "procedure"
  | "damages"
  | "proportionality"
  | "jurisdiction"
  | "remedy"
  | "settlement"
  | "courtroom-readiness"
  | "unknown";

export type CredibilitySignal = {
  id: string;
  concernType: CredibilityConcernType;
  title: string;
  description: string;
  source:
    | "timeline"
    | "evidence"
    | "claim-theory"
    | "procedure"
    | "damages"
    | "user-narrative"
    | "system-inference"
    | "unknown";
  linkedClaimDomains: CaseLegalDomain[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  severity: CaseSeverity;
  confidence: CaseConfidence;
};

export type JudicialRiskFinding = {
  id: string;
  category: JudicialRiskCategory;
  severity: CaseSeverity;
  title: string;
  whyCourtMayCare: string;
  howToAddress: string;
  linkedSignalIds: string[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  linkedClaimDomains: CaseLegalDomain[];
  confidence: CaseConfidence;
};

export type CredibilityCorrectionAction = {
  id: string;
  title: string;
  explanation: string;
  priority: "low" | "medium" | "high" | "critical";
  addressesFindingIds: string[];
  recommendedUserAction: string;
};

export type CredibilityReadinessState = {
  overallReadiness: CaseConfidence;
  consistencyReadiness: CaseConfidence;
  evidenceSupportReadiness: CaseConfidence;
  proportionalityReadiness: CaseConfidence;
  proceduralReadiness: CaseConfidence;
  courtroomReadiness: CaseConfidence;
  blockers: string[];
  nextCredibilityActions: string[];
};

export type CredibilityRiskModel = {
  id: string;
  version: CredibilityRiskVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;
  stage: CaseStage;

  signals: CredibilitySignal[];
  judicialRiskFindings: JudicialRiskFinding[];
  correctionActions: CredibilityCorrectionAction[];

  readiness: CredibilityReadinessState;

  warnings: string[];
  confidence: CaseConfidence;
};

export type CredibilityRiskBuildInput = {
  caseId?: string;
  stage: CaseStage;
  legalDomains: CaseLegalDomain[];
  narrativeSummary?: string;
  timelineWarnings?: string[];
  evidenceWarnings?: string[];
  procedureWarnings?: string[];
  damagesWarnings?: string[];
  claimWarnings?: string[];
  linkedEvidenceIds?: string[];
  linkedTimelineEventIds?: string[];
};

export type CredibilityRiskBuildOutput = {
  model: CredibilityRiskModel;
  warnings: string[];
};