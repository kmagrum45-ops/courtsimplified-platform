import type {
  CourtSimplifiedCasePath,
  LitigationStage,
  RiskSeverity,
} from "./case";

export type ForumType =
  | "court"
  | "tribunal"
  | "administrative-body"
  | "appeal-body"
  | "unknown";

export type ProceduralStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "missed"
  | "late-risk"
  | "blocked"
  | "not-applicable"
  | "unknown";

export type DeadlineUrgency =
  | "none-known"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type ServiceMethod =
  | "personal-service"
  | "regular-mail"
  | "registered-mail"
  | "courier"
  | "email"
  | "court-portal"
  | "process-server"
  | "alternative-service"
  | "not-served"
  | "unknown";

export type ProceduralStepType =
  | "intake"
  | "jurisdiction-check"
  | "limitation-check"
  | "drafting"
  | "filing"
  | "service"
  | "response"
  | "disclosure"
  | "conference"
  | "motion"
  | "hearing"
  | "trial-preparation"
  | "trial"
  | "order"
  | "enforcement"
  | "appeal-or-review"
  | "settlement"
  | "other";

export type ProceduralForum = {
  id: string;
  casePath: CourtSimplifiedCasePath;
  forumType: ForumType;
  name: string;
  province?: string;
  courtLevel?: string;
  municipality?: string;
  address?: string;
  website?: string;
  notes: string[];
};

export type ProceduralDeadline = {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  triggerEvent?: string;
  urgency: DeadlineUrgency;
  status: ProceduralStatus;
  linkedFormIds: string[];
  linkedTimelineEventIds: string[];
  linkedEvidenceIds: string[];
  riskNotes: string[];
  nextAction?: string;
};

export type ServiceRecord = {
  id: string;
  partyServed: string;
  method: ServiceMethod;
  servedDate?: string;
  servedBy?: string;
  documentsServed: string[];
  proofOfServiceAvailable: boolean;
  proofEvidenceIds: string[];
  status: ProceduralStatus;
  issues: string[];
  nextAction?: string;
};

export type ProceduralStep = {
  id: string;
  stepType: ProceduralStepType;
  title: string;
  description: string;
  stage: LitigationStage;
  status: ProceduralStatus;
  priority: RiskSeverity;
  requiredForms: string[];
  requiredEvidence: string[];
  linkedIssueIds: string[];
  linkedTimelineEventIds: string[];
  warnings: string[];
  nextAction?: string;
};

export type ForumPathwayWarning = {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  possibleForums: string[];
  reasonForConcern: string;
  suggestedReviewStep: string;
};

export type ProceduralIntelligenceProfile = {
  caseId?: string;
  currentStage: LitigationStage;
  likelyForum?: ProceduralForum;
  possibleForums: ProceduralForum[];
  deadlines: ProceduralDeadline[];
  serviceRecords: ServiceRecord[];
  steps: ProceduralStep[];
  pathwayWarnings: ForumPathwayWarning[];
  limitationConcerns: string[];
  urgencyConcerns: string[];
  disclosureConcerns: string[];
  filingConcerns: string[];
  nextProceduralFocus: string[];
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProceduralForum(
  overrides: Partial<ProceduralForum> = {},
): ProceduralForum {
  return {
    id: overrides.id || createId("forum"),
    casePath: overrides.casePath || "unknown",
    forumType: overrides.forumType || "unknown",
    name: overrides.name || "",
    province: overrides.province || "Ontario",
    courtLevel: overrides.courtLevel || "",
    municipality: overrides.municipality || "",
    address: overrides.address || "",
    website: overrides.website || "",
    notes: overrides.notes || [],
  };
}

export function createEmptyProceduralDeadline(
  overrides: Partial<ProceduralDeadline> = {},
): ProceduralDeadline {
  return {
    id: overrides.id || createId("deadline"),
    title: overrides.title || "",
    description: overrides.description || "",
    dueDate: overrides.dueDate || "",
    triggerEvent: overrides.triggerEvent || "",
    urgency: overrides.urgency || "unknown",
    status: overrides.status || "unknown",
    linkedFormIds: overrides.linkedFormIds || [],
    linkedTimelineEventIds: overrides.linkedTimelineEventIds || [],
    linkedEvidenceIds: overrides.linkedEvidenceIds || [],
    riskNotes: overrides.riskNotes || [],
    nextAction: overrides.nextAction || "",
  };
}

export function createEmptyServiceRecord(
  overrides: Partial<ServiceRecord> = {},
): ServiceRecord {
  return {
    id: overrides.id || createId("service"),
    partyServed: overrides.partyServed || "",
    method: overrides.method || "unknown",
    servedDate: overrides.servedDate || "",
    servedBy: overrides.servedBy || "",
    documentsServed: overrides.documentsServed || [],
    proofOfServiceAvailable: overrides.proofOfServiceAvailable || false,
    proofEvidenceIds: overrides.proofEvidenceIds || [],
    status: overrides.status || "unknown",
    issues: overrides.issues || [],
    nextAction: overrides.nextAction || "",
  };
}

export function createEmptyProceduralStep(
  overrides: Partial<ProceduralStep> = {},
): ProceduralStep {
  return {
    id: overrides.id || createId("procedure_step"),
    stepType: overrides.stepType || "other",
    title: overrides.title || "",
    description: overrides.description || "",
    stage: overrides.stage || "not-sure",
    status: overrides.status || "unknown",
    priority: overrides.priority || "medium",
    requiredForms: overrides.requiredForms || [],
    requiredEvidence: overrides.requiredEvidence || [],
    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedTimelineEventIds: overrides.linkedTimelineEventIds || [],
    warnings: overrides.warnings || [],
    nextAction: overrides.nextAction || "",
  };
}

export function createEmptyForumPathwayWarning(
  overrides: Partial<ForumPathwayWarning> = {},
): ForumPathwayWarning {
  return {
    id: overrides.id || createId("pathway_warning"),
    title: overrides.title || "",
    description: overrides.description || "",
    severity: overrides.severity || "medium",
    possibleForums: overrides.possibleForums || [],
    reasonForConcern: overrides.reasonForConcern || "",
    suggestedReviewStep: overrides.suggestedReviewStep || "",
  };
}

export function createEmptyProceduralIntelligenceProfile(
  overrides: Partial<ProceduralIntelligenceProfile> = {},
): ProceduralIntelligenceProfile {
  return {
    caseId: overrides.caseId,
    currentStage: overrides.currentStage || "not-sure",
    likelyForum: overrides.likelyForum,
    possibleForums: overrides.possibleForums || [],
    deadlines: overrides.deadlines || [],
    serviceRecords: overrides.serviceRecords || [],
    steps: overrides.steps || [],
    pathwayWarnings: overrides.pathwayWarnings || [],
    limitationConcerns: overrides.limitationConcerns || [],
    urgencyConcerns: overrides.urgencyConcerns || [],
    disclosureConcerns: overrides.disclosureConcerns || [],
    filingConcerns: overrides.filingConcerns || [],
    nextProceduralFocus: overrides.nextProceduralFocus || [],
  };
}