import {
  CaseConfidence,
  CaseEvidenceLifecycleStatus,
  CaseEvidenceType,
  CaseLegalDomain,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type EvidenceRelationshipVersion = "1.0.0";

export type EvidenceRelationshipType =
  | "supports-fact"
  | "supports-claim"
  | "supports-element"
  | "supports-damages"
  | "supports-procedure"
  | "supports-witness"
  | "contradicts-fact"
  | "contradicts-evidence"
  | "duplicates"
  | "same-thread-as"
  | "context-for"
  | "foundation-for"
  | "exhibit-child-of"
  | "referenced-by-document"
  | "referenced-by-affidavit"
  | "unknown";

export type EvidenceConcernType =
  | "authenticity"
  | "hearsay"
  | "relevance"
  | "missing-context"
  | "chain-of-custody"
  | "illegible"
  | "privacy"
  | "incomplete-record"
  | "duplicate"
  | "unsupported-link"
  | "unknown";

export type EvidenceReadinessLevel =
  | "unreviewed"
  | "early"
  | "mapped"
  | "usable"
  | "court-ready"
  | "excluded";

export type EvidenceRelationship = {
  id: string;
  type: EvidenceRelationshipType;
  targetId: string;
  targetKind:
    | "fact"
    | "claim"
    | "element"
    | "timeline-event"
    | "document"
    | "witness"
    | "evidence"
    | "damages"
    | "procedure"
    | "unknown";
  explanation: string;
  confidence: CaseConfidence;
};

export type EvidenceConcern = {
  id: string;
  concernType: EvidenceConcernType;
  severity: CaseSeverity;
  explanation: string;
  suggestedFix: string;
};

export type EvidenceExhibitReference = {
  exhibitLabel?: string;
  exhibitGroup?: string;
  exhibitOrder?: number;
  parentExhibitId?: string;
  childExhibitIds: string[];
  displayTitle?: string;
  filingReady: boolean;
  notes: string[];
};

export type EvidenceDocumentReference = {
  documentId: string;
  documentTitle: string;
  documentType:
    | "pleading"
    | "affidavit"
    | "brief"
    | "motion-material"
    | "conference-material"
    | "trial-material"
    | "settlement-material"
    | "export-package"
    | "unknown";
  referenceLocation?: string;
  referencePurpose: string;
};

export type EvidenceBurdenLink = {
  claimDomain: CaseLegalDomain;
  issueLabel: string;
  burdenLabel: string;
  provesOrSupports: string[];
  missingProofStillNeeded: string[];
  strength: CaseConfidence;
};

export type EvidenceLifecycleHistoryItem = {
  id: string;
  status: CaseEvidenceLifecycleStatus;
  changedAt: string;
  changedBy: "system" | "user" | "human-review" | "import";
  reason: string;
};

export type EvidenceNode = {
  id: string;
  version: EvidenceRelationshipVersion;

  type: CaseEvidenceType;
  title: string;
  description?: string;

  lifecycleStatus: CaseEvidenceLifecycleStatus;
  readinessLevel: EvidenceReadinessLevel;

  storagePath?: string;
  fileName?: string;
  sourceText?: string;

  relationships: EvidenceRelationship[];
  concerns: EvidenceConcern[];
  burdenLinks: EvidenceBurdenLink[];
  documentReferences: EvidenceDocumentReference[];
  exhibit: EvidenceExhibitReference;

  linkedClaimDomains: CaseLegalDomain[];
  linkedTimelineEventIds: string[];
  linkedPartyIds: string[];

  lifecycleHistory: EvidenceLifecycleHistoryItem[];

  tags: string[];
  confidence: CaseConfidence;
};

export type EvidenceGroup = {
  id: string;
  title: string;
  description?: string;
  groupType:
    | "exhibit-group"
    | "message-thread"
    | "document-set"
    | "photo-set"
    | "financial-record-set"
    | "witness-set"
    | "procedural-record-set"
    | "unknown";
  evidenceIds: string[];
  representativeEvidenceId?: string;
  exhibitLabel?: string;
  readinessLevel: EvidenceReadinessLevel;
  concerns: EvidenceConcern[];
};

export type EvidenceGraphIssue = {
  id: string;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  affectedEvidenceIds: string[];
  suggestedFix: string;
};

export type EvidenceGraphReadiness = {
  overallReadiness: CaseConfidence;
  admissibilityReadiness: CaseConfidence;
  authenticityReadiness: CaseConfidence;
  exhibitReadiness: CaseConfidence;
  burdenLinkingReadiness: CaseConfidence;
  affidavitReadiness: CaseConfidence;
  hearingReadiness: CaseConfidence;
  blockers: string[];
  nextEvidenceActions: string[];
};

export type EvidenceRelationshipGraph = {
  id: string;
  version: EvidenceRelationshipVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;
  stage: CaseStage;

  nodes: EvidenceNode[];
  groups: EvidenceGroup[];
  issues: EvidenceGraphIssue[];

  readiness: EvidenceGraphReadiness;

  warnings: string[];
  confidence: CaseConfidence;
};

export type EvidenceGraphBuildInput = {
  caseId?: string;
  stage: CaseStage;
  evidenceCandidates: Array<{
    id?: string;
    type: CaseEvidenceType;
    title: string;
    description?: string;
    storagePath?: string;
    fileName?: string;
    sourceText?: string;
    linkedClaimDomains?: CaseLegalDomain[];
    linkedTimelineEventIds?: string[];
    linkedPartyIds?: string[];
    tags?: string[];
  }>;
};

export type EvidenceGraphBuildOutput = {
  graph: EvidenceRelationshipGraph;
  warnings: string[];
};