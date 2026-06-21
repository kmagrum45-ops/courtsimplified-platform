import type { CourtSimplifiedCasePath, EvidenceStrength, RiskSeverity } from "./case";

export type EvidenceType =
  | "document"
  | "screenshot"
  | "text-message"
  | "email"
  | "social-media-message"
  | "photo"
  | "video"
  | "audio"
  | "court-record"
  | "government-record"
  | "medical-record"
  | "school-record"
  | "financial-record"
  | "contract"
  | "invoice"
  | "receipt"
  | "witness-summary"
  | "affidavit"
  | "expert-report"
  | "police-report"
  | "timeline-note"
  | "other";

export type EvidencePurpose =
  | "prove-fact"
  | "prove-date"
  | "prove-communication"
  | "prove-notice"
  | "prove-damages"
  | "prove-causation"
  | "prove-identity"
  | "prove-service"
  | "prove-procedural-history"
  | "prove-credibility"
  | "rebut-other-side"
  | "settlement-support"
  | "background-context"
  | "unknown";

export type EvidenceUseStage =
  | "intake"
  | "drafting"
  | "filing"
  | "service"
  | "conference"
  | "motion"
  | "hearing"
  | "trial"
  | "settlement"
  | "appeal-or-review"
  | "court-package";

export type EvidenceRelationshipKind =
  | "supports"
  | "corroborates"
  | "contradicts"
  | "duplicates"
  | "explains"
  | "depends-on"
  | "same-event"
  | "same-issue"
  | "timeline-sequence"
  | "credibility-risk"
  | "foundation-risk"
  | "authenticity-risk"
  | "hearsay-risk"
  | "damages-gap"
  | "causation-gap";

export type EvidenceAuthenticationStatus =
  | "not-reviewed"
  | "needs-foundation"
  | "partially-supported"
  | "well-supported"
  | "disputed"
  | "unknown";

export type EvidenceAdmissibilityConcern =
  | "authenticity"
  | "hearsay"
  | "relevance"
  | "privacy"
  | "incomplete-context"
  | "missing-date"
  | "missing-source"
  | "illegible"
  | "duplicate"
  | "speculation"
  | "opinion"
  | "privilege"
  | "settlement-privilege"
  | "other";

export type EvidenceFileMetadata = {
  fileName?: string;
  fileType?: string;
  fileSizeBytes?: number;
  storagePath?: string;
  publicUrl?: string;
  uploadedAt?: string;
  extractedText?: string;
  extractionStatus?: "not-started" | "completed" | "partial" | "failed";
  extractionNotes?: string[];
};

export type EvidenceIssueLink = {
  issueId: string;
  issueTitle?: string;
  legalElement?: string;
  relationship: "supports" | "weakens" | "context" | "unknown";
  explanation?: string;
  strength: EvidenceStrength;
};

export type EvidenceTimelineLink = {
  timelineEventId: string;
  date?: string;
  eventTitle?: string;
  relationship: "event-proof" | "context" | "sequence" | "contradiction" | "unknown";
  explanation?: string;
};

export type EvidenceProofTarget = {
  id: string;
  issueId?: string;
  legalTheory?: string;
  element?: string;
  factToProve: string;
  currentSupport: EvidenceStrength;
  missingProof: string[];
  notes?: string;
};

export type EvidenceRelationship = {
  id: string;
  kind: EvidenceRelationshipKind;
  sourceEvidenceId: string;
  targetEvidenceId?: string;
  targetIssueId?: string;
  targetTimelineEventId?: string;
  explanation: string;
  severity: RiskSeverity;
  suggestedFix?: string;
};

export type EvidenceRisk = {
  id: string;
  concern: EvidenceAdmissibilityConcern;
  title: string;
  description: string;
  severity: RiskSeverity;
  suggestedFix?: string;
};

export type EvidenceCourtPackageInfo = {
  exhibitLabel?: string;
  exhibitNumber?: string;
  exhibitGroup?: string;
  suggestedSection?: string;
  packageOrder?: number;
  useInPackage?: boolean;
  packageNotes: string[];
};

export type EvidenceAiNotes = {
  plainLanguageSummary: string;
  whatItHelpsProve: string[];
  whatItDoesNotProve: string[];
  wordingSuggestions: string[];
  questionsToAskUser: string[];
  warningsForAi: string[];
};

export type LitigationEvidenceItem = {
  id: string;

  caseId?: string;
  casePath?: CourtSimplifiedCasePath;

  title: string;
  type: EvidenceType;
  description: string;
  date?: string;
  source?: string;

  originalUserDescription?: string;
  contentText?: string;

  file: EvidenceFileMetadata;

  purposes: EvidencePurpose[];
  useStages: EvidenceUseStage[];

  linkedIssues: EvidenceIssueLink[];
  linkedTimelineEvents: EvidenceTimelineLink[];
  proofTargets: EvidenceProofTarget[];

  relationships: EvidenceRelationship[];
  risks: EvidenceRisk[];

  authenticityStatus: EvidenceAuthenticationStatus;
  strength: EvidenceStrength;

  courtPackage: EvidenceCourtPackageInfo;
  aiNotes: EvidenceAiNotes;

  tags: string[];

  createdAt: string;
  updatedAt: string;
};

export type EvidenceBundleSummary = {
  caseId?: string;
  totalItems: number;
  strongItems: number;
  weakItems: number;
  unresolvedRisks: number;
  missingDates: number;
  missingSources: number;
  missingRelevanceExplanations: number;
  contradictionCount: number;
  proofGapCount: number;
  suggestedPackageSections: string[];
  nextEvidenceSteps: string[];
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyLitigationEvidenceItem(
  overrides: Partial<LitigationEvidenceItem> = {},
): LitigationEvidenceItem {
  const now = new Date().toISOString();

  return {
    id: overrides.id || createId("evidence"),

    caseId: overrides.caseId,
    casePath: overrides.casePath,

    title: overrides.title || "",
    type: overrides.type || "other",
    description: overrides.description || "",
    date: overrides.date || "",
    source: overrides.source || "",

    originalUserDescription: overrides.originalUserDescription || "",
    contentText: overrides.contentText || "",

    file: overrides.file || {
      extractionStatus: "not-started",
      extractionNotes: [],
    },

    purposes: overrides.purposes || [],
    useStages: overrides.useStages || [],

    linkedIssues: overrides.linkedIssues || [],
    linkedTimelineEvents: overrides.linkedTimelineEvents || [],
    proofTargets: overrides.proofTargets || [],

    relationships: overrides.relationships || [],
    risks: overrides.risks || [],

    authenticityStatus: overrides.authenticityStatus || "not-reviewed",
    strength: overrides.strength || "unknown",

    courtPackage: overrides.courtPackage || {
      useInPackage: true,
      packageNotes: [],
    },

    aiNotes: overrides.aiNotes || {
      plainLanguageSummary: "",
      whatItHelpsProve: [],
      whatItDoesNotProve: [],
      wordingSuggestions: [],
      questionsToAskUser: [],
      warningsForAi: [],
    },

    tags: overrides.tags || [],

    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

export function createEmptyEvidenceBundleSummary(
  overrides: Partial<EvidenceBundleSummary> = {},
): EvidenceBundleSummary {
  return {
    caseId: overrides.caseId,
    totalItems: overrides.totalItems || 0,
    strongItems: overrides.strongItems || 0,
    weakItems: overrides.weakItems || 0,
    unresolvedRisks: overrides.unresolvedRisks || 0,
    missingDates: overrides.missingDates || 0,
    missingSources: overrides.missingSources || 0,
    missingRelevanceExplanations: overrides.missingRelevanceExplanations || 0,
    contradictionCount: overrides.contradictionCount || 0,
    proofGapCount: overrides.proofGapCount || 0,
    suggestedPackageSections: overrides.suggestedPackageSections || [],
    nextEvidenceSteps: overrides.nextEvidenceSteps || [],
  };
}