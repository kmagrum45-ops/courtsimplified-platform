import {
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
  sourceUrl?: string;
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
  // importanceScore (a hand-assigned 0-100) and confidence (an ordinal) were
  // declared here. Both are gone: importanceScore fed a third term in the
  // ranking formula alongside binding force and court level, and confidence
  // was read once, only to be converted to 0.9/0.7/0.5 -- the scoreFromConfidence
  // mechanism removed from dashboardAdapter and from the family path before it.
  // Ranking now runs on bindingWeight and courtLevel, which are facts about
  // what an authority IS.

  courtPaths: CaseCourtPath[];
  legalDomains: CaseLegalDomain[];
  appliesAcrossIssueDomains?: boolean;
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

  /*
   * REMOVED 2026-09-26: `annualPracticeLinks`.
   *
   * It was write-only. Eleven of the twelve entries were `[]`, and the twelfth
   * held a placeholder whose own text read "Annual Practice commentary should be
   * added from verified user-provided extraction". Nothing anywhere read the
   * field — the only reference outside the data was this declaration and one test
   * fixture.
   *
   * It is removed rather than left empty because an empty field shaped for
   * commentary is an invitation. The Ontario Annual Practice is a commercial
   * Thomson Reuters publication and is not on CLAUDE.md §2's acceptable-source
   * list, so filling it is a licensing decision for the site owner, not a coding
   * task. The planning package that motivated it is preserved, non-shipping, at
   * docs/reference/civil-annual-practice/, and scripts/rules/refusedCorpusPaths.ts
   * records why it is never a corpus source.
   *
   * If a licensing route is ever agreed, add it back WITH the provenance it always
   * lacked: which edition and which year. The book is republished annually and the
   * old shape had nowhere to record which year a passage came from — noted in the
   * 2026-09-11 findings as a gap before any of it was ever populated.
   */

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
