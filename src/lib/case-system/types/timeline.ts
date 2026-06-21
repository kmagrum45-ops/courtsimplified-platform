import type { CourtSimplifiedCasePath, EvidenceStrength, RiskSeverity } from "./case";

export type TimelineEventType =
  | "background"
  | "incident"
  | "communication"
  | "payment"
  | "agreement"
  | "service"
  | "filing"
  | "court-date"
  | "deadline"
  | "order"
  | "breach"
  | "evidence-created"
  | "evidence-received"
  | "settlement"
  | "medical-or-treatment"
  | "police-or-institution"
  | "other";

export type TimelineEventImportance =
  | "critical"
  | "important"
  | "context"
  | "minor"
  | "unknown";

export type TimelineConfidence =
  | "confirmed"
  | "likely"
  | "uncertain"
  | "disputed"
  | "unknown";

export type TimelineIssue = {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  suggestedFix?: string;
};

export type TimelineEvidenceLink = {
  evidenceId: string;
  evidenceTitle?: string;
  relationship:
    | "proves-date"
    | "proves-event"
    | "supports-context"
    | "contradicts-event"
    | "needs-foundation"
    | "unknown";
  strength: EvidenceStrength;
  notes?: string;
};

export type LitigationTimelineEvent = {
  id: string;
  caseId?: string;
  casePath?: CourtSimplifiedCasePath;

  date?: string;
  endDate?: string;
  approximateDateText?: string;

  title: string;
  description: string;
  eventType: TimelineEventType;
  importance: TimelineEventImportance;
  confidence: TimelineConfidence;

  source?: string;
  userOriginalWording?: string;
  improvedCourtWording?: string;

  linkedIssueIds: string[];
  linkedEvidence: TimelineEvidenceLink[];
  linkedFormIds: string[];

  contradictions: TimelineIssue[];
  missingInformation: TimelineIssue[];
  proceduralWarnings: TimelineIssue[];

  tags: string[];

  createdAt: string;
  updatedAt: string;
};

export type LitigationTimelineSummary = {
  caseId?: string;
  totalEvents: number;
  criticalEvents: number;
  disputedEvents: number;
  missingDates: number;
  deadlineWarnings: string[];
  chronologyGaps: string[];
  contradictionWarnings: string[];
  nextTimelineSteps: string[];
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyTimelineEvent(
  overrides: Partial<LitigationTimelineEvent> = {},
): LitigationTimelineEvent {
  const now = new Date().toISOString();

  return {
    id: overrides.id || createId("timeline_event"),
    caseId: overrides.caseId,
    casePath: overrides.casePath,

    date: overrides.date || "",
    endDate: overrides.endDate || "",
    approximateDateText: overrides.approximateDateText || "",

    title: overrides.title || "",
    description: overrides.description || "",
    eventType: overrides.eventType || "other",
    importance: overrides.importance || "unknown",
    confidence: overrides.confidence || "unknown",

    source: overrides.source || "",
    userOriginalWording: overrides.userOriginalWording || "",
    improvedCourtWording: overrides.improvedCourtWording || "",

    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedEvidence: overrides.linkedEvidence || [],
    linkedFormIds: overrides.linkedFormIds || [],

    contradictions: overrides.contradictions || [],
    missingInformation: overrides.missingInformation || [],
    proceduralWarnings: overrides.proceduralWarnings || [],

    tags: overrides.tags || [],

    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

export function createEmptyTimelineSummary(
  overrides: Partial<LitigationTimelineSummary> = {},
): LitigationTimelineSummary {
  return {
    caseId: overrides.caseId,
    totalEvents: overrides.totalEvents || 0,
    criticalEvents: overrides.criticalEvents || 0,
    disputedEvents: overrides.disputedEvents || 0,
    missingDates: overrides.missingDates || 0,
    deadlineWarnings: overrides.deadlineWarnings || [],
    chronologyGaps: overrides.chronologyGaps || [],
    contradictionWarnings: overrides.contradictionWarnings || [],
    nextTimelineSteps: overrides.nextTimelineSteps || [],
  };
}