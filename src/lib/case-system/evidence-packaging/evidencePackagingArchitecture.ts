import {
  CaseConfidence,
  CaseEvidenceType,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type EvidencePackagingVersion = "1.0.0";

export type EvidenceCollectionType =
  | "message-thread"
  | "email-thread"
  | "social-media-thread"
  | "photo-series"
  | "video-series"
  | "financial-package"
  | "medical-package"
  | "school-package"
  | "employment-package"
  | "procedural-package"
  | "mixed-exhibit"
  | "unknown";

export type ExhibitReadiness =
  | "unreviewed"
  | "draft"
  | "organized"
  | "court-ready";

export type ExhibitReferenceTarget =
  | "affidavit"
  | "conference-brief"
  | "motion"
  | "trial-plan"
  | "court-package"
  | "trial-binder"
  | "unknown";

export type EvidencePackagingIssueType =
  | "duplicate-evidence"
  | "missing-date"
  | "missing-context"
  | "missing-authentication"
  | "broken-sequence"
  | "orphaned-evidence"
  | "missing-exhibit-reference"
  | "unknown";

export type EvidenceCollectionItem = {
  evidenceId: string;
  title: string;
  evidenceType: CaseEvidenceType;
  dateRaw?: string;
  dateNormalized?: string;
  confidence: CaseConfidence;
};

export type EvidenceCollection = {
  id: string;
  collectionType: EvidenceCollectionType;

  title: string;
  description: string;

  itemCount: number;

  startDate?: string;
  endDate?: string;

  evidenceIds: string[];
  items: EvidenceCollectionItem[];

  chronologyOrdered: boolean;
  confidence: CaseConfidence;
};

export type ExhibitReference = {
  id: string;

  exhibitLabel: string;

  targetType: ExhibitReferenceTarget;

  targetId?: string;
  targetTitle?: string;

  explanation: string;

  confidence: CaseConfidence;
};

export type ExhibitPackage = {
  id: string;

  exhibitLabel: string;
  title: string;

  collectionIds: string[];

  evidenceIds: string[];

  pageEstimate: number;

  readiness: ExhibitReadiness;

  references: ExhibitReference[];

  warnings: string[];

  confidence: CaseConfidence;
};

export type EvidencePackagingIssue = {
  id: string;

  issueType: EvidencePackagingIssueType;

  severity: CaseSeverity;

  title: string;

  explanation: string;

  affectedEvidenceIds: string[];

  suggestedFix: string;
};

export type EvidencePackagingReadiness = {
  overallReadiness: CaseConfidence;

  collectionReadiness: CaseConfidence;

  chronologyReadiness: CaseConfidence;

  exhibitReadiness: CaseConfidence;

  affidavitReferenceReadiness: CaseConfidence;

  trialPackageReadiness: CaseConfidence;

  blockers: string[];

  nextActions: string[];
};

export type EvidencePackagingModel = {
  id: string;

  version: EvidencePackagingVersion;

  createdAt: string;

  updatedAt: string;

  caseId?: string;

  stage: CaseStage;

  collections: EvidenceCollection[];

  exhibits: ExhibitPackage[];

  issues: EvidencePackagingIssue[];

  readiness: EvidencePackagingReadiness;

  warnings: string[];

  confidence: CaseConfidence;
};

export type EvidencePackagingBuildInput = {
  caseId?: string;

  stage: CaseStage;

  evidenceItems: Array<{
    id: string;

    title: string;

    evidenceType: CaseEvidenceType;

    description?: string;

    dateRaw?: string;

    dateNormalized?: string;

    tags?: string[];

    confidence?: CaseConfidence;
  }>;
};

export type EvidencePackagingBuildOutput = {
  packaging: EvidencePackagingModel;

  warnings: string[];
};