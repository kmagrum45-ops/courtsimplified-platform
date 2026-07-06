import {
  CaseConfidence,
  CaseCourtPath,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type AuthorityRegistryArchitectureVersion = "1.0.0";

export type VerifiedAuthorityKind =
  | "case-law"
  | "statute"
  | "regulation"
  | "rule"
  | "practice-direction"
  | "court-form"
  | "annual-practice-commentary"
  | "official-guide"
  | "legal-test"
  | "doctrine"
  | "unknown";

export type AuthorityCourtLevel =
  | "supreme-court-of-canada"
  | "ontario-court-of-appeal"
  | "ontario-superior-court"
  | "ontario-divisional-court"
  | "ontario-court-of-justice"
  | "small-claims-court"
  | "federal-court"
  | "federal-court-of-appeal"
  | "tribunal"
  | "other"
  | "unknown";

export type AuthorityVerificationStatus =
  | "verified"
  | "needs-review"
  | "source-pending"
  | "outdated-risk"
  | "overruled-risk"
  | "limited-use"
  | "do-not-use";

export type AuthorityBindingWeight =
  | "binding"
  | "highly-persuasive"
  | "persuasive"
  | "procedural-guidance"
  | "background"
  | "unknown";

export type AuthorityDisplayMode =
  | "collapsed"
  | "summary"
  | "expanded"
  | "internal-only"
  | "do-not-display";

export type AuthorityUserRiskLevel =
  | "safe-summary"
  | "needs-context"
  | "lawyer-review-recommended"
  | "do-not-use";

export type AuthorityRegistrySourceReference = {
  id: string;
  sourceType:
    | "official-court"
    | "canlii"
    | "scc"
    | "ontario-elaws"
    | "annual-practice"
    | "practice-direction"
    | "court-form"
    | "manual-entry"
    | "unknown";
  title: string;
  citationOrUrlLabel: string;
  pinpoint?: string;
  verifiedAt?: string;
  notes: string[];
};

export type AuthorityRegistryLegalTestElement = {
  id: string;
  label: string;
  explanation: string;
  proofNeeded: string[];
  commonWeaknesses: string[];
  evidenceExamples: string[];
  burdenRelevance: string;
};

export type AuthorityRegistryEvidenceImplication = {
  id: string;
  label: string;
  explanation: string;
  evidenceUsuallyNeeded: string[];
  weakEvidenceWarnings: string[];
  strongEvidenceExamples: string[];
};

export type AuthorityRegistryWorkflowLink = {
  route:
    | "/builder"
    | "/case-dashboard"
    | "/evidence"
    | "/documents"
    | "/forms"
    | "/court-package"
    | "/settlement-conference"
    | "/trial-package"
    | "/litigation-strategy"
    | "/legal-principles"
    | "/dashboard";
  reason: string;
  stage?: CaseStage;
};

export type VerifiedAuthorityEntry = {
  id: string;
  version: AuthorityRegistryArchitectureVersion;

  kind: VerifiedAuthorityKind;
  displayMode: AuthorityDisplayMode;
  verificationStatus: AuthorityVerificationStatus;
  userRiskLevel: AuthorityUserRiskLevel;

  title: string;
  shortTitle: string;
  citation: string;
  neutralCitation?: string;
  courtLevel: AuthorityCourtLevel;
  jurisdiction: CaseProvince | "Canada" | "Unknown";
  year?: number;

  bindingWeight: AuthorityBindingWeight;
  importanceScore: number;
  confidence: CaseConfidence;

  courtPaths: CaseCourtPath[];
  legalDomains: CaseLegalDomain[];
  proceduralStages: CaseStage[];

  topicTags: string[];
  doctrineTags: string[];
  ruleReferences: string[];
  statuteReferences: string[];
  formReferences: string[];

  corePrinciple: string;
  plainLanguageSummary: string;
  legalTestSummary: string;
  howCourtsUseIt: string[];
  practicalUse: string[];
  commonMistakes: string[];
  limitsAndWarnings: string[];

  legalTestElements: AuthorityRegistryLegalTestElement[];
  evidenceImplications: AuthorityRegistryEvidenceImplication[];
  workflowLinks: AuthorityRegistryWorkflowLink[];

  relatedAuthorities: {
    follows: string[];
    followedBy: string[];
    distinguishes: string[];
    distinguishedBy: string[];
    limits: string[];
    limitedBy: string[];
    overrules: string[];
    overruledBy: string[];
    related: string[];
  };

  annualPracticeLinks: {
    rule?: string;
    sectionLabel?: string;
    commentarySummary?: string;
    pageOrPinpoint?: string;
    notes: string[];
  }[];

  aiUseRules: {
    canShowToUser: boolean;
    canUseForReasoning: boolean;
    canUseForDrafting: boolean;
    mustVerifyBeforeCitation: boolean;
    mustExplainLimits: boolean;
    mustAskContextQuestions: boolean;
    prohibitedUses: string[];
  };

  suggestedAiQuestions: string[];
  suggestedEvidenceQuestions: string[];
  suggestedWorkflowActions: string[];

  sourceReferences: AuthorityRegistrySourceReference[];

  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
};

export type AuthorityRegistryTopicGroup = {
  id: string;
  label: string;
  description: string;
  legalDomains: CaseLegalDomain[];
  courtPaths: CaseCourtPath[];
  authorityIds: string[];
  defaultCollapsed: boolean;
};

export type AuthorityRegistrySearchContext = {
  courtPath?: CaseCourtPath;
  jurisdiction?: CaseProvince | "Canada" | "Unknown";
  stage?: CaseStage;
  legalDomains?: CaseLegalDomain[];
  topicTags?: string[];
  includeUnverified?: boolean;
  includeInternalOnly?: boolean;
  requireVerified?: boolean;
};

export type AuthorityRegistryRankingResult = {
  authorityId: string;
  score: number;
  reasons: string[];
  warnings: string[];
  displayRecommended: boolean;
};

export type AuthorityRegistrySearchResult = {
  context: AuthorityRegistrySearchContext;
  authorities: VerifiedAuthorityEntry[];
  rankings: AuthorityRegistryRankingResult[];
  warnings: string[];
};

export type AuthorityRegistryModel = {
  version: AuthorityRegistryArchitectureVersion;
  entries: VerifiedAuthorityEntry[];
  topicGroups: AuthorityRegistryTopicGroup[];
  warnings: string[];
};

export const AUTHORITY_REGISTRY_ARCHITECTURE_VERSION: AuthorityRegistryArchitectureVersion =
  "1.0.0";