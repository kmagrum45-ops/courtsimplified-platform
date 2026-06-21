import {
  CaseConfidence,
  CaseCourtPath,
  CaseProvince,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type ProceduralStateVersion = "2.0.0";

export type ProceduralAuthorityLevel =
  | "rule-of-court"
  | "practice-direction"
  | "official-form"
  | "case-law"
  | "secondary-source"
  | "system-inference"
  | "unknown";

export type ProceduralVerificationStatus =
  | "verified"
  | "needs-review"
  | "not-verified"
  | "do-not-use"
  | "unknown";

export type ProceduralAuthorityReference = {
  id: string;
  rule: string;
  subrule?: string;
  title: string;
  source: string;
  authorityLevel: ProceduralAuthorityLevel;
  verificationStatus: ProceduralVerificationStatus;
  principle?: string;
  appliesWhen: string[];
  doesNotApplyWhen: string[];
  crossReferences: string[];
  confidence: CaseConfidence;
};

export type ProceduralArea =
  | "commencement"
  | "service"
  | "response"
  | "default"
  | "pleadings"
  | "amendments"
  | "discovery"
  | "motion"
  | "motion-evidence"
  | "settlement"
  | "pre-trial"
  | "trial"
  | "costs"
  | "assessment"
  | "enforcement"
  | "appeal"
  | "unknown";

export type ProceduralEventType =
  | "not-started"
  | "claim-prepared"
  | "claim-filed"
  | "claim-issued"
  | "claim-served"
  | "notice-of-action-issued"
  | "application-issued"
  | "response-served"
  | "response-filed"
  | "defence-due"
  | "notice-of-intent-filed"
  | "default-noted"
  | "default-judgment-requested"
  | "default-judgment-issued"
  | "pleading-delivered"
  | "pleading-amended"
  | "affidavit-of-documents-served"
  | "disclosure-requested"
  | "disclosure-served"
  | "discovery-scheduled"
  | "discovery-completed"
  | "undertaking-given"
  | "undertaking-due"
  | "motion-contemplated"
  | "motion-filed"
  | "motion-served"
  | "motion-confirmation-due"
  | "motion-heard"
  | "motion-abandoned"
  | "affidavit-served"
  | "cross-examination-scheduled"
  | "settlement-offer-made"
  | "settlement-offer-withdrawn"
  | "settlement-offer-expired"
  | "settlement-reached"
  | "conference-scheduled"
  | "conference-materials-due"
  | "conference-completed"
  | "pre-trial-scheduled"
  | "certificate-of-readiness-due"
  | "pre-trial-brief-due"
  | "pre-trial-report-issued"
  | "trial-scheduled"
  | "trial-materials-due"
  | "trial-completed"
  | "costs-awarded"
  | "costs-assessment-requested"
  | "bill-of-costs-served"
  | "assessment-hearing-scheduled"
  | "certificate-of-assessment-issued"
  | "order-issued"
  | "judgment-issued"
  | "enforcement-started"
  | "appeal-contemplated"
  | "appeal-started"
  | "closed"
  | "unknown";

export type ProceduralDependencyType =
  | "must-file-before-service"
  | "must-serve-before-response"
  | "must-confirm-deadline"
  | "must-complete-conference-before-next-step"
  | "must-disclose-before-hearing"
  | "must-have-order-before-enforcement"
  | "must-confirm-appeal-deadline"
  | "must-confirm-forum"
  | "must-confirm-stage"
  | "must-confirm-parties"
  | "must-confirm-relief"
  | "must-confirm-service-method"
  | "must-confirm-proof-of-service"
  | "must-confirm-defence-deadline"
  | "must-confirm-default-status"
  | "must-confirm-motion-materials"
  | "must-confirm-motion-confirmation"
  | "must-confirm-affidavit-deadlines"
  | "must-confirm-discovery-obligations"
  | "must-confirm-settlement-offer-status"
  | "must-confirm-costs-exposure"
  | "must-confirm-assessment-step"
  | "must-confirm-pretrial-readiness"
  | "unknown";

export type ProceduralRiskType =
  | "deadline-risk"
  | "service-risk"
  | "wrong-forum-risk"
  | "wrong-form-risk"
  | "premature-step-risk"
  | "missing-material-risk"
  | "incomplete-party-risk"
  | "unclear-relief-risk"
  | "limitation-risk"
  | "procedural-confusion"
  | "default-risk"
  | "motion-abandonment-risk"
  | "affidavit-deadline-risk"
  | "discovery-noncompliance-risk"
  | "privilege-risk"
  | "settlement-costs-risk"
  | "costs-sanction-risk"
  | "assessment-risk"
  | "pretrial-readiness-risk"
  | "trial-readiness-risk"
  | "authority-traceability-risk"
  | "unknown";

export type ProceduralActionKind =
  | "confirm-forum"
  | "confirm-stage"
  | "confirm-deadline"
  | "confirm-service"
  | "confirm-filed-materials"
  | "confirm-proof-of-service"
  | "confirm-defence-deadline"
  | "confirm-default-status"
  | "confirm-motion-deadline"
  | "confirm-affidavit-deadline"
  | "confirm-discovery-status"
  | "confirm-settlement-offer-status"
  | "confirm-costs-status"
  | "confirm-assessment-status"
  | "prepare-filing"
  | "prepare-response"
  | "prepare-conference"
  | "prepare-motion"
  | "prepare-disclosure"
  | "prepare-settlement"
  | "prepare-pretrial"
  | "prepare-trial"
  | "prepare-costs-materials"
  | "prepare-assessment-materials"
  | "prepare-enforcement"
  | "prepare-appeal"
  | "review-evidence"
  | "review-forms"
  | "review-authority"
  | "human-review"
  | "unknown";

export type ProceduralDeadline = {
  id: string;
  title: string;
  dateRaw?: string;
  dateNormalized?: string;
  certainty: "exact" | "approximate" | "unknown";
  source:
    | "user"
    | "court-order"
    | "rule"
    | "served-document"
    | "system-inference"
    | "unknown";
  rule?: string;
  subrule?: string;
  triggerEvent?: string;
  timeAmount?: number;
  timeUnit?: "days" | "business-days" | "weeks" | "months" | "years" | "unknown";
  countingRuleNeeded?: boolean;
  relatedAuthorityIds: string[];
  relatedEventIds: string[];
  relatedDocumentIds: string[];
  relatedFormIds: string[];
  riskLevel: CaseSeverity;
  confidence: CaseConfidence;
};

export type ProceduralEvent = {
  id: string;
  type: ProceduralEventType;
  area: ProceduralArea;
  title: string;
  description: string;
  occurredAtRaw?: string;
  occurredAtNormalized?: string;
  source:
    | "user"
    | "court-record"
    | "document"
    | "rule"
    | "system-inference"
    | "manual-review"
    | "unknown";
  rule?: string;
  subrule?: string;
  relatedAuthorityIds: string[];
  relatedDocumentIds: string[];
  relatedEvidenceIds: string[];
  relatedDeadlineIds: string[];
  confidence: CaseConfidence;
};

export type ProceduralRequirement = {
  id: string;
  area: ProceduralArea;
  title: string;
  explanation: string;
  appliesWhen: string[];
  doesNotApplyWhen: string[];
  requiredAction: string;
  requiredFormLabels: string[];
  requiredBeforeEvents: ProceduralEventType[];
  relatedDeadlineIds: string[];
  relatedRiskIds: string[];
  relatedAuthorityIds: string[];
  status: "satisfied" | "not-satisfied" | "unclear" | "not-applicable";
  severity: CaseSeverity;
};

export type ProceduralCourtPower = {
  id: string;
  area: ProceduralArea;
  rule: string;
  subrule?: string;
  title: string;
  description: string;
  trigger: string;
  possibleOrders: string[];
  relatedAuthorityIds: string[];
  confidence: CaseConfidence;
};

export type ProceduralDependency = {
  id: string;
  type: ProceduralDependencyType;
  title: string;
  explanation: string;
  prerequisite: string;
  currentStatus:
    | "satisfied"
    | "not-satisfied"
    | "unclear"
    | "not-applicable";
  affectedStages: CaseStage[];
  affectedCourtPaths: CaseCourtPath[];
  relatedAuthorityIds: string[];
  suggestedFix: string;
  severity: CaseSeverity;
};

export type ProceduralRisk = {
  id: string;
  area: ProceduralArea;
  type: ProceduralRiskType;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  relatedAuthorityIds: string[];
  relatedDeadlineIds: string[];
  relatedEventIds: string[];
};

export type ProceduralNextAction = {
  id: string;
  kind: ProceduralActionKind;
  title: string;
  explanation: string;
  priority: "low" | "medium" | "high" | "critical";
  blockedBy: string[];
  unlocks: string[];
  relatedAuthorityIds: string[];
};

export type ProceduralAreaReadinessState = {
  area: ProceduralArea;
  readiness: CaseConfidence;
  blockers: string[];
  nextActions: string[];
  relatedAuthorityIds: string[];
};

export type ProceduralReadinessState = {
  overallReadiness: CaseConfidence;
  forumReadiness: CaseConfidence;
  stageReadiness: CaseConfidence;
  deadlineReadiness: CaseConfidence;
  serviceReadiness: CaseConfidence;
  filingReadiness: CaseConfidence;
  evidenceProcedureReadiness: CaseConfidence;
  motionReadiness: CaseConfidence;
  discoveryReadiness: CaseConfidence;
  settlementReadiness: CaseConfidence;
  preTrialReadiness: CaseConfidence;
  costsReadiness: CaseConfidence;
  assessmentReadiness: CaseConfidence;
  areaReadiness: ProceduralAreaReadinessState[];
  blockers: string[];
  nextActions: string[];
};

export type ProceduralStateModel = {
  id: string;
  version: ProceduralStateVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;

  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;

  authorityReferences: ProceduralAuthorityReference[];
  events: ProceduralEvent[];
  deadlines: ProceduralDeadline[];
  requirements: ProceduralRequirement[];
  courtPowers: ProceduralCourtPower[];
  dependencies: ProceduralDependency[];
  risks: ProceduralRisk[];
  nextActions: ProceduralNextAction[];

  readiness: ProceduralReadinessState;

  warnings: string[];
  confidence: CaseConfidence;
};

export type ProceduralStateBuildInput = {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  rawNarrative?: string;
  knownEvents?: Array<{
    id?: string;
    type?: ProceduralEventType;
    area?: ProceduralArea;
    title: string;
    description: string;
    dateRaw?: string;
    dateNormalized?: string;
    source?: ProceduralEvent["source"];
    rule?: string;
    subrule?: string;
    relatedAuthorityIds?: string[];
    relatedDocumentIds?: string[];
    relatedEvidenceIds?: string[];
  }>;
  knownDeadlines?: Array<{
    id?: string;
    title: string;
    dateRaw?: string;
    dateNormalized?: string;
    source?: ProceduralDeadline["source"];
    rule?: string;
    subrule?: string;
    triggerEvent?: string;
    timeAmount?: number;
    timeUnit?: ProceduralDeadline["timeUnit"];
    countingRuleNeeded?: boolean;
    relatedAuthorityIds?: string[];
  }>;
  authorityReferences?: ProceduralAuthorityReference[];
  requirements?: ProceduralRequirement[];
  courtPowers?: ProceduralCourtPower[];
};

export type ProceduralStateBuildOutput = {
  proceduralState: ProceduralStateModel;
  warnings: string[];
};