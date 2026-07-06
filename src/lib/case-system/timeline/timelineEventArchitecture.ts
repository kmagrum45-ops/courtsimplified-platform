import {
  CaseConfidence,
  CaseCourtPath,
  CaseEvidenceType,
  CaseLegalDomain,
  CaseProvince,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type TimelineArchitectureVersion = "1.0.0";

export type TimelineEventKind =
  | "factual-event"
  | "communication"
  | "evidence-created"
  | "harm-event"
  | "procedural-event"
  | "filing-event"
  | "service-event"
  | "deadline-event"
  | "conference-event"
  | "motion-event"
  | "hearing-event"
  | "order-event"
  | "payment-event"
  | "settlement-event"
  | "enforcement-event"
  | "appeal-event"
  | "unknown";

export type TimelineDateCertainty =
  | "exact"
  | "approximate"
  | "range"
  | "unknown";

export type TimelineEventImportance =
  | "background"
  | "supporting"
  | "important"
  | "critical";

export type TimelineRelationshipType =
  | "causes"
  | "leads-to"
  | "responds-to"
  | "contradicts"
  | "supports"
  | "precedes"
  | "follows"
  | "same-event-as"
  | "procedural-prerequisite"
  | "evidence-of"
  | "harm-from"
  | "deadline-for"
  | "unknown";

export type TimelineValidationIssueType =
  | "missing-date"
  | "impossible-sequence"
  | "unclear-order"
  | "contradictory-date"
  | "missing-evidence-link"
  | "missing-party-link"
  | "missing-procedural-context"
  | "deadline-risk"
  | "limitation-risk"
  | "service-risk"
  | "causation-gap"
  | "unknown";

export type TimelineEventSource = {
  sourceType:
  | "user-intake"
  | "uploaded-evidence"
  | "document"
  | "court-record"
  | "system-inference"
  | "manual-review"
  | "unknown";
  sourceId?: string;
  sourceText?: string;
  confidence: CaseConfidence;
};

export type TimelineDateValue = {
  rawText?: string;
  normalizedDate?: string;
  normalizedStartDate?: string;
  normalizedEndDate?: string;
  certainty: TimelineDateCertainty;
  confidence: CaseConfidence;
};

export type TimelineEventRelationship = {
  id: string;
  type: TimelineRelationshipType;
  targetEventId: string;
  explanation: string;
  confidence: CaseConfidence;
};

export type TimelineEvidenceLink = {
  evidenceId: string;
  evidenceType?: CaseEvidenceType;
  linkReason: string;
  provesOrSupports: string[];
  concerns: string[];
  confidence: CaseConfidence;
};

export type TimelineClaimLink = {
  claimId?: string;
  legalDomain: CaseLegalDomain;
  elementOrIssue: string;
  linkReason: string;
  confidence: CaseConfidence;
};

export type TimelineProceduralContext = {
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  filingRelated: boolean;
  serviceRelated: boolean;
  deadlineRelated: boolean;
  hearingRelated: boolean;
  orderRelated: boolean;
  enforcementRelated: boolean;
  appealRelated: boolean;
  practicalEffect: string[];
};

export type TimelineValidationIssue = {
  id: string;
  issueType: TimelineValidationIssueType;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  affectedEventIds: string[];
};

export type LitigationTimelineEvent = {
  id: string;
  version: TimelineArchitectureVersion;

  kind: TimelineEventKind;
  title: string;
  description: string;
  importance: TimelineEventImportance;

  date: TimelineDateValue;

  partyIds: string[];
  evidenceLinks: TimelineEvidenceLink[];
  claimLinks: TimelineClaimLink[];

  proceduralContext?: TimelineProceduralContext;

  relationships: TimelineEventRelationship[];
  validationIssues: TimelineValidationIssue[];

  source: TimelineEventSource;

  tags: string[];
  confidence: CaseConfidence;
};

export type TimelineCausationChain = {
  id: string;
  title: string;
  eventIds: string[];
  linkedClaimIds: string[];
  linkedLegalDomains: CaseLegalDomain[];
  explanation: string;
  gaps: string[];
  strength: CaseConfidence;
};

export type TimelineProceduralSequence = {
  id: string;
  courtPath: CaseCourtPath;
  stage: CaseStage;
  eventIds: string[];
  missingPrerequisites: string[];
  deadlineRisks: string[];
  serviceRisks: string[];
  sequencingWarnings: string[];
  confidence: CaseConfidence;
};

export type TimelineReadinessState = {
  chronologyCompleteness: CaseConfidence;
  dateConfidence: CaseConfidence;
  evidenceLinkingStrength: CaseConfidence;
  proceduralSequencingStrength: CaseConfidence;
  causationStrength: CaseConfidence;
  blockers: string[];
  nextTimelineActions: string[];
};

export type LitigationTimelineModel = {
  id: string;
  version: TimelineArchitectureVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;

  events: LitigationTimelineEvent[];
  causationChains: TimelineCausationChain[];
  proceduralSequences: TimelineProceduralSequence[];

  validationIssues: TimelineValidationIssue[];
  readiness: TimelineReadinessState;

  warnings: string[];
  confidence: CaseConfidence;
};

export type TimelineBuildInput = {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  rawNarrative?: string;
  eventCandidates: Array<{
    id?: string;
    title: string;
    description: string;
    dateRaw?: string;
    dateNormalized?: string;
    sourceText?: string;
    partyIds?: string[];
    evidenceIds?: string[];
    legalDomains?: CaseLegalDomain[];
  }>;
};

export type TimelineBuildOutput = {
  timeline: LitigationTimelineModel;
  warnings: string[];
};