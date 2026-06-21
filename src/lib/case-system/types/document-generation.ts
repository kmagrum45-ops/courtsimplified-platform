import type {
  CourtSimplifiedCasePath,
  EvidenceStrength,
  LitigationStage,
  RiskSeverity,
} from "./case";

import type { DraftingDocumentType, DraftingSectionPurpose } from "./document-workspace";

export type GenerationReadiness =
  | "draft"
  | "needs-review"
  | "procedural-review-required"
  | "evidence-review-required"
  | "court-ready-review-required";

export type GenerationConcernType =
  | "missing-evidence"
  | "missing-date"
  | "missing-source"
  | "unsupported-allegation"
  | "speculative-wording"
  | "contradiction-risk"
  | "proof-gap"
  | "procedural-risk"
  | "forum-risk"
  | "service-risk"
  | "deadline-risk"
  | "exhibit-reference-risk"
  | "tone-risk"
  | "legal-advice-risk"
  | "other";

export type GenerationConcern = {
  id: string;
  concernType: GenerationConcernType;
  title: string;
  description: string;
  severity: RiskSeverity;
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  suggestedFix?: string;
};

export type GeneratedEvidenceReference = {
  evidenceId: string;
  exhibitLabel?: string;
  relationship:
    | "supports-fact"
    | "supports-issue"
    | "supports-damages"
    | "supports-procedure"
    | "supports-timeline"
    | "background-context"
    | "requires-review"
    | "unknown";
  strength: EvidenceStrength;
  notes?: string;
};

export type GeneratedLitigationSection = {
  id: string;
  heading: string;
  purpose: DraftingSectionPurpose;

  paragraphs: string[];
  bulletPoints: string[];

  linkedIssueIds: string[];
  linkedTimelineEventIds: string[];
  evidenceReferences: GeneratedEvidenceReference[];

  concerns: GenerationConcern[];

  courtToneNotes: string[];
  proofNotes: string[];
  proceduralNotes: string[];

  userReviewRequired: boolean;
  aiReviewRequired: boolean;
};

export type LitigationDocumentGeneration = {
  id: string;
  caseId?: string;
  casePath?: CourtSimplifiedCasePath;

  documentType: DraftingDocumentType;
  stage: LitigationStage;

  title: string;
  subtitle?: string;

  generatedAt: string;
  readiness: GenerationReadiness;

  sections: GeneratedLitigationSection[];

  globalConcerns: GenerationConcern[];
  nextSteps: string[];

  exportWarnings: string[];
  courtUseWarnings: string[];

  sourceEngine: string;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyGenerationConcern(
  overrides: Partial<GenerationConcern> = {},
): GenerationConcern {
  return {
    id: overrides.id || createId("generation_concern"),
    concernType: overrides.concernType || "other",
    title: overrides.title || "",
    description: overrides.description || "",
    severity: overrides.severity || "medium",
    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedEvidenceIds: overrides.linkedEvidenceIds || [],
    linkedTimelineEventIds: overrides.linkedTimelineEventIds || [],
    suggestedFix: overrides.suggestedFix || "",
  };
}

export function createEmptyGeneratedLitigationSection(
  overrides: Partial<GeneratedLitigationSection> = {},
): GeneratedLitigationSection {
  return {
    id: overrides.id || createId("generated_section"),
    heading: overrides.heading || "",
    purpose: overrides.purpose || "other",

    paragraphs: overrides.paragraphs || [],
    bulletPoints: overrides.bulletPoints || [],

    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedTimelineEventIds: overrides.linkedTimelineEventIds || [],
    evidenceReferences: overrides.evidenceReferences || [],

    concerns: overrides.concerns || [],

    courtToneNotes: overrides.courtToneNotes || [],
    proofNotes: overrides.proofNotes || [],
    proceduralNotes: overrides.proceduralNotes || [],

    userReviewRequired: overrides.userReviewRequired ?? true,
    aiReviewRequired: overrides.aiReviewRequired ?? false,
  };
}

export function createEmptyLitigationDocumentGeneration(
  overrides: Partial<LitigationDocumentGeneration> = {},
): LitigationDocumentGeneration {
  return {
    id: overrides.id || createId("litigation_generation"),
    caseId: overrides.caseId,
    casePath: overrides.casePath,

    documentType: overrides.documentType || "other",
    stage: overrides.stage || "not-sure",

    title: overrides.title || "",
    subtitle: overrides.subtitle || "",

    generatedAt: overrides.generatedAt || new Date().toISOString(),
    readiness: overrides.readiness || "draft",

    sections: overrides.sections || [],

    globalConcerns: overrides.globalConcerns || [],
    nextSteps: overrides.nextSteps || [],

    exportWarnings: overrides.exportWarnings || [],
    courtUseWarnings: overrides.courtUseWarnings || [],

    sourceEngine: overrides.sourceEngine || "documentGenerationEngine",
  };
}