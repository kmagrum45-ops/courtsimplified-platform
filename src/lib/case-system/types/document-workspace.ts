import type {
  CourtSimplifiedCasePath,
  EvidenceStrength,
  LitigationStage,
  RiskSeverity,
} from "./case";

export type DraftingDocumentType =
  | "claim"
  | "defence"
  | "reply"
  | "application"
  | "answer"
  | "motion"
  | "affidavit"
  | "conference-brief"
  | "settlement-brief"
  | "trial-brief"
  | "factum"
  | "chronology"
  | "evidence-summary"
  | "proof-chart"
  | "court-package-index"
  | "letter"
  | "other";

export type DraftingSectionPurpose =
  | "overview"
  | "facts"
  | "issues"
  | "law"
  | "evidence"
  | "argument"
  | "damages"
  | "remedy"
  | "procedure"
  | "settlement"
  | "timeline"
  | "witnesses"
  | "exhibits"
  | "orders-requested"
  | "signature"
  | "other";

export type DraftingStatus =
  | "not-started"
  | "draft"
  | "needs-review"
  | "reviewed"
  | "ready-for-export"
  | "filed-or-served"
  | "archived";

export type DraftingSource =
  | "system-generated"
  | "user-written"
  | "ai-assisted"
  | "imported"
  | "template-derived";

export type DraftingConcernType =
  | "unsupported-allegation"
  | "missing-date"
  | "missing-evidence"
  | "missing-party"
  | "speculative-wording"
  | "argumentative-tone"
  | "duplicate-content"
  | "contradiction-risk"
  | "procedural-risk"
  | "exhibit-reference-risk"
  | "legal-advice-risk"
  | "other";

export type DraftingRevisionAction =
  | "created"
  | "section-added"
  | "section-updated"
  | "section-removed"
  | "section-reordered"
  | "status-changed"
  | "ai-review"
  | "user-review"
  | "exported"
  | "filed"
  | "served";

export type DraftingConcern = {
  id: string;
  concernType: DraftingConcernType;
  title: string;
  description: string;
  severity: RiskSeverity;
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
  suggestedFix?: string;
};

export type DraftingEvidenceReference = {
  evidenceId: string;
  exhibitLabel?: string;
  relationship:
    | "supports-paragraph"
    | "supports-fact"
    | "supports-damages"
    | "supports-procedure"
    | "background-context"
    | "contradiction-risk"
    | "unknown";
  strength: EvidenceStrength;
  notes?: string;
};

export type DraftingSection = {
  id: string;
  heading: string;
  purpose: DraftingSectionPurpose;

  originalUserWording?: string;
  improvedCourtWording?: string;

  paragraphs: string[];
  bulletPoints: string[];

  linkedIssueIds: string[];
  linkedTimelineEventIds: string[];
  evidenceReferences: DraftingEvidenceReference[];

  concerns: DraftingConcern[];
  notes: string[];

  source: DraftingSource;
  userReviewed: boolean;
  aiReviewed: boolean;
  locked: boolean;

  createdAt: string;
  updatedAt: string;
};

export type DraftingRevision = {
  id: string;
  createdAt: string;
  action: DraftingRevisionAction;
  description: string;
  sectionId?: string;
};

export type LitigationDraftingWorkspace = {
  id: string;
  caseId?: string;
  casePath?: CourtSimplifiedCasePath;

  documentType: DraftingDocumentType;
  stage: LitigationStage;

  title: string;
  subtitle?: string;
  status: DraftingStatus;

  sections: DraftingSection[];

  globalConcerns: DraftingConcern[];
  nextDraftingSteps: string[];
  exportReadinessNotes: string[];

  revisionHistory: DraftingRevision[];

  createdAt: string;
  updatedAt: string;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyDraftingConcern(
  overrides: Partial<DraftingConcern> = {},
): DraftingConcern {
  return {
    id: overrides.id || createId("drafting_concern"),
    concernType: overrides.concernType || "other",
    title: overrides.title || "",
    description: overrides.description || "",
    severity: overrides.severity || "medium",
    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedEvidenceIds: overrides.linkedEvidenceIds || [],
    suggestedFix: overrides.suggestedFix || "",
  };
}

export function createEmptyDraftingSection(
  overrides: Partial<DraftingSection> = {},
): DraftingSection {
  const now = new Date().toISOString();

  return {
    id: overrides.id || createId("drafting_section"),
    heading: overrides.heading || "",
    purpose: overrides.purpose || "other",

    originalUserWording: overrides.originalUserWording || "",
    improvedCourtWording: overrides.improvedCourtWording || "",

    paragraphs: overrides.paragraphs || [],
    bulletPoints: overrides.bulletPoints || [],

    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedTimelineEventIds: overrides.linkedTimelineEventIds || [],
    evidenceReferences: overrides.evidenceReferences || [],

    concerns: overrides.concerns || [],
    notes: overrides.notes || [],

    source: overrides.source || "system-generated",
    userReviewed: overrides.userReviewed || false,
    aiReviewed: overrides.aiReviewed || false,
    locked: overrides.locked || false,

    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

export function createEmptyDraftingRevision(
  overrides: Partial<DraftingRevision> = {},
): DraftingRevision {
  return {
    id: overrides.id || createId("drafting_revision"),
    createdAt: overrides.createdAt || new Date().toISOString(),
    action: overrides.action || "created",
    description: overrides.description || "",
    sectionId: overrides.sectionId,
  };
}

export function createEmptyLitigationDraftingWorkspace(
  overrides: Partial<LitigationDraftingWorkspace> = {},
): LitigationDraftingWorkspace {
  const now = new Date().toISOString();

  return {
    id: overrides.id || createId("drafting_workspace"),
    caseId: overrides.caseId,
    casePath: overrides.casePath,

    documentType: overrides.documentType || "other",
    stage: overrides.stage || "not-sure",

    title: overrides.title || "",
    subtitle: overrides.subtitle || "",
    status: overrides.status || "draft",

    sections: overrides.sections || [],

    globalConcerns: overrides.globalConcerns || [],
    nextDraftingSteps: overrides.nextDraftingSteps || [],
    exportReadinessNotes: overrides.exportReadinessNotes || [],

    revisionHistory:
      overrides.revisionHistory || [
        createEmptyDraftingRevision({
          action: "created",
          description: "Drafting workspace created.",
        }),
      ],

    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}