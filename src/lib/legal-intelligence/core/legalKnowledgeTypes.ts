import type { CourtSimplifiedArea, ConfidenceLevel } from "./caseModel";
import type { AuthorityLevel } from "./precedentTypes";

export type LegalKnowledgeStatus =
  | "verified"
  | "needs-verification"
  | "draft"
  | "deprecated"
  | "unknown";

export type LegalKnowledgeKind =
  | "legal-test"
  | "statute"
  | "regulation"
  | "court-rule"
  | "procedure"
  | "burden-of-proof"
  | "evidence-requirement"
  | "damages-framework"
  | "remedy-framework"
  | "form-guidance"
  | "deadline-rule"
  | "jurisdiction-rule"
  | "service-rule"
  | "settlement-guidance"
  | "trial-guidance"
  | "appeal-or-review"
  | "judge-concern"
  | "opposing-argument"
  | "risk-warning"
  | "other";

export type VerificationRequirement =
  | "safe-general-guidance"
  | "requires-source-check"
  | "requires-current-rule-check"
  | "requires-human-review"
  | "do-not-use-publicly";

export type LegalKnowledgeSource = {
  sourceName: string;
  sourceType:
    | "statute"
    | "regulation"
    | "court-rule"
    | "court-website"
    | "canlii"
    | "government"
    | "official-form"
    | "practice-direction"
    | "verified-secondary-source"
    | "internal-review"
    | "other";
  sourceUrl?: string;
  citation?: string;
  lastVerified?: string;
};

export type LegalKnowledgeItem = {
  id: string;
  title: string;
  area: CourtSimplifiedArea;
  kind: LegalKnowledgeKind;
  status: LegalKnowledgeStatus;
  authorityLevel: AuthorityLevel;
  confidence: ConfidenceLevel;

  summary: string;
  plainLanguageExplanation: string;

  legalPrinciple?: string;
  requiredElements?: string[];
  proofNeeded?: string[];
  commonMissingFacts?: string[];
  evidenceThatHelps?: string[];
  evidenceThatIsUsuallyWeak?: string[];

  proceduralStageUses?: string[];
  relatedForms?: string[];
  relatedIssueTags?: string[];

  userFacingGuidance: string[];
  judgeConcernsLikely: string[];
  opposingArgumentsLikely: string[];
  risksIfIgnored: string[];

  limitsOrWarnings: string[];

  verification: {
    requirement: VerificationRequirement;
    mustVerifyBeforeCiting: boolean;
    mustVerifyBeforeFormRecommendation: boolean;
    mustVerifyBeforeDeadlineAdvice: boolean;
    mustAvoidOverstating: boolean;
    userShouldBeToldUncertain: boolean;
  };

  sources: LegalKnowledgeSource[];

  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastReviewedByHuman?: string;
    reviewedBy?: string;
    notes?: string[];
  };
};

export type KnowledgeMatchResult = {
  knowledgeId: string;
  relevanceScore: number;
  matchedArea: CourtSimplifiedArea;
  matchedIssueTags: string[];
  matchedReason: string;
  safeToUseInAnswer: boolean;
  caution?: string;
};

export const EMPTY_LEGAL_KNOWLEDGE_ITEM: LegalKnowledgeItem = {
  id: "",
  title: "",
  area: "unknown",
  kind: "other",
  status: "unknown",
  authorityLevel: "uncertain",
  confidence: "low",
  summary: "",
  plainLanguageExplanation: "",
  userFacingGuidance: [],
  judgeConcernsLikely: [],
  opposingArgumentsLikely: [],
  risksIfIgnored: [],
  limitsOrWarnings: [],
  verification: {
    requirement: "requires-source-check",
    mustVerifyBeforeCiting: true,
    mustVerifyBeforeFormRecommendation: true,
    mustVerifyBeforeDeadlineAdvice: true,
    mustAvoidOverstating: true,
    userShouldBeToldUncertain: true,
  },
  sources: [],
};

export function isKnowledgeVerified(item: LegalKnowledgeItem): boolean {
  return item.status === "verified" && item.confidence !== "low";
}

export function canUseForGeneralGuidance(item: LegalKnowledgeItem): boolean {
  return (
    item.verification.requirement === "safe-general-guidance" ||
    item.status === "verified"
  );
}

export function requiresSourceCheck(item: LegalKnowledgeItem): boolean {
  return (
    item.status !== "verified" ||
    item.verification.mustVerifyBeforeCiting ||
    item.sources.length === 0
  );
}

export function blocksDeadlineAdvice(item: LegalKnowledgeItem): boolean {
  return item.verification.mustVerifyBeforeDeadlineAdvice === true;
}

export function blocksFormRecommendation(item: LegalKnowledgeItem): boolean {
  return item.verification.mustVerifyBeforeFormRecommendation === true;
}