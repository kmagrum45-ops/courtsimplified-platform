import {
  CaseConfidence,
  CaseCourtPath,
  CaseCredibilityRiskLevel,
  CaseProvince,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type WorkflowOrchestrationVersion = "1.1.0";

export type WorkflowRoute =
  | "/builder"
  | "/case-dashboard"
  | "/evidence"
  | "/documents"
  | "/forms"
  | "/court-package"
  | "/settlement-conference"
  | "/trial-package"
  | "/generated-documents"
  | "/litigation-strategy"
  | "/legal-principles"
  | "/dashboard";

export type WorkflowGateType =
  | "court-path"
  | "stage"
  | "claims"
  | "procedure"
  | "evidence"
  | "proof"
  | "timeline"
  | "damages"
  | "credibility"
  | "authority"
  | "contradictions"
  | "knowledge"
  | "forms"
  | "documents"
  | "human-review"
  | "unknown";

export type WorkflowBlockerType =
  | "missing-court-path"
  | "missing-stage"
  | "missing-claim-theory"
  | "missing-evidence"
  | "missing-proof-analysis"
  | "proof-risk"
  | "missing-timeline"
  | "missing-damages-proof"
  | "procedural-risk"
  | "procedural-deadline-risk"
  | "procedural-compliance-risk"
  | "procedural-motion-risk"
  | "procedural-discovery-risk"
  | "procedural-settlement-risk"
  | "procedural-trial-risk"
  | "credibility-risk"
  | "legal-authority-risk"
  | "citation-safety-risk"
  | "wrong-jurisdiction-authority"
  | "contradiction-risk"
  | "form-risk"
  | "document-risk"
  | "unknown";

export type WorkflowActionKind =
  | "answer-question"
  | "add-facts"
  | "add-evidence"
  | "confirm-stage"
  | "confirm-court-path"
  | "confirm-deadline"
  | "review-claims"
  | "review-proof"
  | "strengthen-proof"
  | "review-procedure"
  | "review-damages"
  | "review-credibility"
  | "review-legal-knowledge"
  | "review-authorities"
  | "review-citation-safety"
  | "review-jurisdiction-fit"
  | "resolve-contradictions"
  | "prepare-forms"
  | "prepare-documents"
  | "prepare-court-package"
  | "prepare-settlement"
  | "prepare-trial"
  | "human-review"
  | "unknown";

export type WorkflowDocumentReadinessImpact =
  | "none"
  | "minor"
  | "moderate"
  | "major"
  | "severe";

export type WorkflowGate = {
  id: string;
  gateType: WorkflowGateType;
  title: string;
  explanation: string;
  status: "open" | "blocked" | "satisfied" | "not-applicable";
  severity: CaseSeverity;
  requiredBeforeRoutes: WorkflowRoute[];
  suggestedFix: string;
};

export type WorkflowBlocker = {
  id: string;
  blockerType: WorkflowBlockerType;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  affectedRoutes: WorkflowRoute[];
};

export type WorkflowNextAction = {
  id: string;
  kind: WorkflowActionKind;
  title: string;
  explanation: string;
  priority: "low" | "medium" | "high" | "critical";
  route: WorkflowRoute;
  blockedBy: string[];
  unlocks: WorkflowRoute[];
};

export type WorkflowRouteAssessment = {
  route: WorkflowRoute;
  available: boolean;
  recommended: boolean;
  reason: string;
  blockedBy: string[];
  confidence: CaseConfidence;
};

export type WorkflowReadinessState = {
  overallReadiness: CaseConfidence;

  intakeReadiness: CaseConfidence;
  claimReadiness: CaseConfidence;

  procedureReadiness: CaseConfidence;
  proceduralDeadlineReadiness?: CaseConfidence;
  proceduralComplianceReadiness?: CaseConfidence;
  proceduralMotionReadiness?: CaseConfidence;
  proceduralDiscoveryReadiness?: CaseConfidence;
  proceduralSettlementReadiness?: CaseConfidence;
  proceduralTrialReadiness?: CaseConfidence;
  proceduralCostsReadiness?: CaseConfidence;
  proceduralAssessmentReadiness?: CaseConfidence;

  evidenceReadiness: CaseConfidence;
  proofReadiness?: CaseConfidence;
  timelineReadiness: CaseConfidence;
  damagesReadiness: CaseConfidence;
  credibilityReadiness: CaseConfidence;
  authorityReadiness?: CaseConfidence;
  contradictionReadiness?: CaseConfidence;
  citationReadiness?: CaseConfidence;
  jurisdictionReadiness?: CaseConfidence;
  documentReadiness: CaseConfidence;

  blockers: string[];
  recommendedRoute?: WorkflowRoute;
};

export type WorkflowProofInput = {
  hasProofAnalysis?: boolean;
  proofWeaknesses?: string[];
  proofStrengths?: string[];
  proofNextActions?: string[];
  weakClaimProofCount?: number;
  missingElementProofCount?: number;
  contradictedElementProofCount?: number;
};

export type WorkflowAuthorityInput = {
  hasAuthorityAnalysis?: boolean;
  authorityWarnings?: string[];
  verifiedAuthorityCount?: number;
  strongestAuthorityCount?: number;
  unsafeAuthorityCount?: number;
  directlyApplicableAuthorityCount?: number;
  wrongJurisdictionAuthorityCount?: number;
};

export type WorkflowContradictionInput = {
  hasContradictionAnalysis?: boolean;
  totalFindings?: number;
  criticalFindings?: number;
  highFindings?: number;
  moderateFindings?: number;
  lowFindings?: number;
  overallRisk?: "minimal" | "manageable" | "elevated" | "serious" | "critical";
  warnings?: string[];
};

export type WorkflowCredibilityInput = {
  hasCredibilityAnalysis?: boolean;
  overallLevel?: CaseCredibilityRiskLevel;
  overallScore?: number;
  judgeConcernScore?: number;
  crossExaminationRiskScore?: number;
  settlementPressureScore?: number;
  documentReadinessImpact?: WorkflowDocumentReadinessImpact;
  warnings?: string[];
  nextActions?: string[];
};

export type WorkflowProceduralInput = {
  hasProceduralAnalysis?: boolean;

  overallProceduralReadiness?: CaseConfidence;

  deadlineReadiness?: CaseConfidence;
  complianceReadiness?: CaseConfidence;
  serviceReadiness?: CaseConfidence;
  filingReadiness?: CaseConfidence;
  motionReadiness?: CaseConfidence;
  discoveryReadiness?: CaseConfidence;
  settlementReadiness?: CaseConfidence;
  preTrialReadiness?: CaseConfidence;
  trialReadiness?: CaseConfidence;
  costsReadiness?: CaseConfidence;
  assessmentReadiness?: CaseConfidence;

  dependencyCount?: number;
  blockerCount?: number;
  riskCount?: number;
  deadlineCount?: number;

  criticalRiskCount?: number;
  highRiskCount?: number;

  warnings?: string[];
  blockers?: string[];
  nextActions?: string[];
};

export type WorkflowOrchestrationModel = {
  id: string;
  version: WorkflowOrchestrationVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;

  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;

  gates: WorkflowGate[];
  blockers: WorkflowBlocker[];
  nextActions: WorkflowNextAction[];
  routeAssessments: WorkflowRouteAssessment[];

  readiness: WorkflowReadinessState;

  warnings: string[];
  confidence: CaseConfidence;
};

export type WorkflowOrchestrationBuildInput = {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;

  hasDominantClaim: boolean;
  hasEvidence: boolean;
  hasTimeline: boolean;
  hasDamagesModel: boolean;
  hasLegalKnowledgeWarnings: boolean;

  proof?: WorkflowProofInput;
  authority?: WorkflowAuthorityInput;
  contradictions?: WorkflowContradictionInput;
  credibility?: WorkflowCredibilityInput;
  procedural?: WorkflowProceduralInput;

  claimWarnings?: string[];
  proceduralWarnings?: string[];
  evidenceWarnings?: string[];
  timelineWarnings?: string[];
  damagesWarnings?: string[];
  credibilityWarnings?: string[];
  authorityWarnings?: string[];
  contradictionWarnings?: string[];
  knowledgeWarnings?: string[];
};

export type WorkflowOrchestrationBuildOutput = {
  model: WorkflowOrchestrationModel;
  warnings: string[];
};