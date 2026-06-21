import type { CourtSimplifiedArea } from "./caseModel";

export type CourtLevel =
  | "small-claims-court"
  | "provincial-court"
  | "superior-court"
  | "divisional-court"
  | "court-of-appeal"
  | "supreme-court-of-canada"
  | "tribunal"
  | "federal-court"
  | "federal-court-of-appeal"
  | "unknown";

export type AuthorityLevel =
  | "binding"
  | "highly-persuasive"
  | "persuasive"
  | "informational"
  | "uncertain";

export type PrecedentStatus =
  | "verified"
  | "needs-verification"
  | "deprecated"
  | "partially-applied"
  | "distinguished"
  | "overturned"
  | "unknown";

export type LegalPrincipleType =
  | "substantive-law"
  | "procedure"
  | "evidence"
  | "damages"
  | "credibility"
  | "causation"
  | "jurisdiction"
  | "charter"
  | "burden-of-proof"
  | "remedy"
  | "limitations"
  | "family-law"
  | "small-claims"
  | "civil-procedure"
  | "constitutional"
  | "other";

export type PrecedentIssueTag =
  | "defamation"
  | "negligence"
  | "contract"
  | "property-damage"
  | "family-parenting"
  | "support"
  | "civil-procedure"
  | "summary-judgment"
  | "limitations"
  | "credibility"
  | "damages"
  | "harassment"
  | "evidence"
  | "charter"
  | "misfeasance"
  | "causation"
  | "procedural-fairness"
  | "burden-of-proof"
  | "injunction"
  | "other";

export type LegalCitation = {
  neutralCitation?: string;
  reportedCitation?: string;
  docketNumber?: string;
};

export type PrecedentSource = {
  sourceName: string;
  sourceType:
    | "canlii"
    | "government"
    | "court-website"
    | "statute"
    | "regulation"
    | "official-rule"
    | "verified-secondary-source"
    | "other";
  sourceUrl?: string;
  lastVerified?: string;
};

export type PrecedentHolding = {
  title: string;
  summary: string;
  keyPrinciples: string[];

  whatTheCourtActuallyHeld: string[];

  importantQuotes?: {
    quote: string;
    paragraph?: string;
  }[];

  limitsOrWarnings?: string[];

  commonlyMisusedFor?: string[];
};

export type PrecedentUsageGuidance = {
  whenToUse: string[];
  whenNotToUse: string[];

  proceduralContexts: string[];

  factualRequirements: string[];

  commonWeaknesses: string[];

  opposingArgumentsLikely: string[];

  judgeConcernsLikely: string[];
};

export type PrecedentRelationship = {
  relatedCaseName: string;
  relationshipType:
    | "followed"
    | "distinguished"
    | "criticized"
    | "overturned"
    | "clarified"
    | "expanded"
    | "limited";
};

export type LegalPrecedent = {
  id: string;

  caseName: string;

  citation: LegalCitation;

  courtLevel: CourtLevel;

  province?: string;

  year?: number;

  area: CourtSimplifiedArea;

  issueTags: PrecedentIssueTag[];

  principleTypes: LegalPrincipleType[];

  authorityLevel: AuthorityLevel;

  status: PrecedentStatus;

  verified: boolean;

  summary: string;

  holding: PrecedentHolding;

  usageGuidance: PrecedentUsageGuidance;

  relatedCases?: PrecedentRelationship[];

  source: PrecedentSource;

  aiUsageRules: {
    mayUseForGeneralGuidance: boolean;

    mayUseForProceduralGuidance: boolean;

    mayUseForStrategicReasoning: boolean;

    requiresHumanVerificationBeforeCiting: boolean;

    avoidOverstatingHolding: boolean;

    avoidUsingAsBindingIfOutsideJurisdiction: boolean;
  };

  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastReviewedByHuman?: string;
    confidence?: "low" | "medium" | "high";
  };
};

export type PrecedentSearchResult = {
  precedentId: string;

  relevanceScore: number;

  matchedIssueTags: string[];

  matchedPrinciples: string[];

  reasoning: string;
};

export const EMPTY_PRECEDENT: LegalPrecedent = {
  id: "",

  caseName: "",

  citation: {},

  courtLevel: "unknown",

  area: "unknown",

  issueTags: ["other"],

  principleTypes: ["other"],

  authorityLevel: "uncertain",

  status: "unknown",

  verified: false,

  summary: "",

  holding: {
    title: "",
    summary: "",
    keyPrinciples: [],
    whatTheCourtActuallyHeld: [],
    importantQuotes: [],
    limitsOrWarnings: [],
    commonlyMisusedFor: [],
  },

  usageGuidance: {
    whenToUse: [],
    whenNotToUse: [],
    proceduralContexts: [],
    factualRequirements: [],
    commonWeaknesses: [],
    opposingArgumentsLikely: [],
    judgeConcernsLikely: [],
  },

  relatedCases: [],

  source: {
    sourceName: "",
    sourceType: "other",
  },

  aiUsageRules: {
    mayUseForGeneralGuidance: true,
    mayUseForProceduralGuidance: true,
    mayUseForStrategicReasoning: true,
    requiresHumanVerificationBeforeCiting: true,
    avoidOverstatingHolding: true,
    avoidUsingAsBindingIfOutsideJurisdiction: true,
  },

  metadata: {
    confidence: "low",
  },
};

export function isBindingAuthority(
  precedent: LegalPrecedent
): boolean {
  return precedent.authorityLevel === "binding";
}

export function requiresVerificationBeforeUse(
  precedent: LegalPrecedent
): boolean {
  return (
    precedent.verified === false ||
    precedent.aiUsageRules.requiresHumanVerificationBeforeCiting
  );
}

export function shouldAvoidUsingPrecedent(
  precedent: LegalPrecedent
): boolean {
  return (
    precedent.status === "overturned" ||
    precedent.status === "deprecated"
  );
}