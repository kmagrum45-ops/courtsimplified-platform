import {
  CaseCourtPath,
  CaseKnowledgeAuthorityLevel,
  CaseKnowledgeVerificationStatus,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

import {
  LegalAuthorityReliabilityTier,
  LegalAuthoritySourceKind,
  LegalAuthorityUsePermission,
} from "./legalAuthorityRegistry";

export type KnowledgeObjectVersion = "1.0.0";

export type KnowledgeObjectKind =
  | "raw-source"
  | "doctrine"
  | "procedural-rule"
  | "procedural-operation"
  | "litigation-pattern"
  | "evidence-principle"
  | "damages-principle"
  | "credibility-principle"
  | "judicial-concern"
  | "settlement-principle"
  | "form-guidance"
  | "unknown";

export type KnowledgeExtractionStatus =
  | "not-extracted"
  | "machine-extracted"
  | "human-reviewed"
  | "verified"
  | "needs-review"
  | "deprecated";

export type KnowledgeRiskLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type KnowledgeSourceMetadata = {
  sourceId: string;
  title: string;
  citation?: string;
  sourceUrl?: string;
  sourceKind: LegalAuthoritySourceKind;
  authorityLevel: CaseKnowledgeAuthorityLevel;
  reliabilityTier: LegalAuthorityReliabilityTier;
  verificationStatus: CaseKnowledgeVerificationStatus;
  extractionStatus: KnowledgeExtractionStatus;
  jurisdiction: CaseProvince | "Canada" | "Unknown";
  lastVerifiedAt?: string;
  effectiveDate?: string;
  expiryDate?: string;
  retrievedAt?: string;
  versionLabel?: string;
};

export type KnowledgeApplicability = {
  courtPaths: CaseCourtPath[];
  jurisdictions: Array<CaseProvince | "Canada" | "Unknown">;
  legalDomains: CaseLegalDomain[];
  proceduralStages: CaseStage[];
  userPostures: Array<
    | "starting"
    | "responding"
    | "already-filed"
    | "moving-party"
    | "responding-party"
    | "enforcing"
    | "appealing"
    | "not-sure"
  >;
};

export type KnowledgeUseRules = {
  mayUseFor: LegalAuthorityUsePermission[];
  mustNotUseFor: string[];
  requiresVerificationBeforeCitation: boolean;
  requiresCurrentnessCheck: boolean;
  requiresJurisdictionCheck: boolean;
  requiresContextCheck: boolean;
  requiresHumanReviewBeforeFiling: boolean;
};

export type KnowledgeAuditMetadata = {
  createdAt: string;
  updatedAt: string;
  createdBy: "system" | "human" | "import" | "ai-assisted";
  updatedBy: "system" | "human" | "import" | "ai-assisted";
  reviewNotes: string[];
  knownLimitations: string[];
  riskLevel: KnowledgeRiskLevel;
};

export type BaseKnowledgeObject = {
  id: string;
  version: KnowledgeObjectVersion;
  kind: KnowledgeObjectKind;
  title: string;
  summary: string;

  source: KnowledgeSourceMetadata;
  applicability: KnowledgeApplicability;
  useRules: KnowledgeUseRules;
  audit: KnowledgeAuditMetadata;

  tags: string[];
  plainLanguageExplanation: string;
  systemWarnings: string[];
};

export type RawSourceKnowledgeObject = BaseKnowledgeObject & {
  kind: "raw-source";
  rawText?: string;
  storagePath?: string;
  documentPath?: string;
  extractedTextPath?: string;
  pageReferences: string[];
  sectionReferences: string[];
};

export type DoctrineKnowledgeObject = BaseKnowledgeObject & {
  kind: "doctrine";
  legalPrinciple: string;
  legalTest: string[];
  requiredElements: string[];
  burdenImpact: string[];
  evidenceImpact: string[];
  proceduralImpact: string[];
  remedyImpact: string[];
  strategicImpact: string[];
  limits: string[];
  distinguishingFactors: string[];
  unsafeUses: string[];
};

export type ProceduralRuleKnowledgeObject = BaseKnowledgeObject & {
  kind: "procedural-rule";
  ruleName: string;
  ruleNumber?: string;
  filingRelated: boolean;
  serviceRelated: boolean;
  deadlineRelated: boolean;
  evidenceRelated: boolean;
  requiredInputs: string[];
  requiredOutputs: string[];
  prerequisiteSteps: string[];
  nextPossibleSteps: string[];
  proceduralWarnings: string[];
};

export type ProceduralOperationKnowledgeObject = BaseKnowledgeObject & {
  kind: "procedural-operation";
  operationName: string;
  workflowPhase:
    | "pre-litigation"
    | "filing"
    | "service"
    | "response"
    | "conference"
    | "motion"
    | "disclosure"
    | "trial-prep"
    | "hearing"
    | "enforcement"
    | "appeal"
    | "settlement"
    | "unknown";
  practicalMeaning: string[];
  commonMistakes: string[];
  dependencyRules: string[];
  escalationTriggers: string[];
  userQuestionsToAsk: string[];
};

export type LitigationPatternKnowledgeObject = BaseKnowledgeObject & {
  kind: "litigation-pattern";
  patternName: string;
  patternCategory:
    | "common-weakness"
    | "common-opposing-argument"
    | "common-judge-concern"
    | "common-evidence-gap"
    | "common-procedural-error"
    | "common-settlement-pressure"
    | "common-credibility-risk"
    | "unknown";
  patternDescription: string;
  whyItMatters: string;
  detectionSignals: string[];
  recommendedResponses: string[];
  evidenceNeeded: string[];
  userFacingWarning: string;
};

export type EvidencePrincipleKnowledgeObject = BaseKnowledgeObject & {
  kind: "evidence-principle";
  evidenceIssue:
    | "authenticity"
    | "hearsay"
    | "relevance"
    | "missing-context"
    | "chain-of-custody"
    | "credibility"
    | "digital-metadata"
    | "witness-foundation"
    | "expert-foundation"
    | "unknown";
  principle: string;
  proofNeeded: string[];
  commonAttacks: string[];
  strengtheningSteps: string[];
  courtReadinessIndicators: string[];
};

export type DamagesPrincipleKnowledgeObject = BaseKnowledgeObject & {
  kind: "damages-principle";
  damagesType:
    | "general"
    | "special"
    | "aggravated"
    | "punitive"
    | "statutory"
    | "support"
    | "property"
    | "lost-income"
    | "reputational"
    | "unknown";
  causationRequirements: string[];
  proofRequirements: string[];
  proportionalityConcerns: string[];
  mitigationIssues: string[];
  calculationGuidance: string[];
  warningSignals: string[];
};

export type CredibilityPrincipleKnowledgeObject = BaseKnowledgeObject & {
  kind: "credibility-principle";
  credibilityIssue:
    | "inconsistency"
    | "exaggeration"
    | "unsupported-allegation"
    | "timeline-conflict"
    | "selective-evidence"
    | "emotional-overstatement"
    | "changing-story"
    | "unknown";
  courtConcern: string;
  detectionSignals: string[];
  correctiveSteps: string[];
  evidenceToStrengthen: string[];
};

export type JudicialConcernKnowledgeObject = BaseKnowledgeObject & {
  kind: "judicial-concern";
  concernCategory:
    | "procedure"
    | "evidence"
    | "credibility"
    | "proportionality"
    | "damages"
    | "jurisdiction"
    | "limitation"
    | "remedy"
    | "settlement"
    | "unknown";
  concern: string;
  whyCourtMayCare: string;
  howToAddress: string[];
  documentsAffected: string[];
  evidenceAffected: string[];
};

export type SettlementPrincipleKnowledgeObject = BaseKnowledgeObject & {
  kind: "settlement-principle";
  settlementIssue:
    | "risk-assessment"
    | "offer-analysis"
    | "damages-compromise"
    | "evidence-pressure"
    | "procedure-pressure"
    | "credibility-pressure"
    | "cost-risk"
    | "relationship-preservation"
    | "unknown";
  leverageFactors: string[];
  riskFactors: string[];
  preparationSteps: string[];
  suggestedUserQuestions: string[];
};

export type FormGuidanceKnowledgeObject = BaseKnowledgeObject & {
  kind: "form-guidance";
  formNumber?: string;
  formTitle: string;
  formPurpose: string;
  whenUsed: string[];
  whenNotUsed: string[];
  requiredInputs: string[];
  relatedForms: string[];
  proceduralWarnings: string[];
};

export type LegalKnowledgeObject =
  | RawSourceKnowledgeObject
  | DoctrineKnowledgeObject
  | ProceduralRuleKnowledgeObject
  | ProceduralOperationKnowledgeObject
  | LitigationPatternKnowledgeObject
  | EvidencePrincipleKnowledgeObject
  | DamagesPrincipleKnowledgeObject
  | CredibilityPrincipleKnowledgeObject
  | JudicialConcernKnowledgeObject
  | SettlementPrincipleKnowledgeObject
  | FormGuidanceKnowledgeObject;

export type KnowledgeRetrievalContext = {
  courtPath?: CaseCourtPath;
  jurisdiction?: CaseProvince | "Canada" | "Unknown";
  stage?: CaseStage;
  legalDomains?: CaseLegalDomain[];
  knowledgeKinds?: KnowledgeObjectKind[];
  requiresVerifiedOnly?: boolean;
  includeOperationalGuidance?: boolean;
  includeAiInference?: boolean;
  tags?: string[];
};

export type KnowledgeRetrievalResult = {
  context: KnowledgeRetrievalContext;
  objects: LegalKnowledgeObject[];
  warnings: string[];
  blockedObjects: Array<{
    objectId: string;
    reason: string;
  }>;
};

export function knowledgeObjectMatchesContext(
  object: LegalKnowledgeObject,
  context: KnowledgeRetrievalContext,
): boolean {
  if (
    context.courtPath &&
    !object.applicability.courtPaths.includes(context.courtPath) &&
    !object.applicability.courtPaths.includes("unknown")
  ) {
    return false;
  }

  if (
    context.jurisdiction &&
    !object.applicability.jurisdictions.includes(context.jurisdiction) &&
    !object.applicability.jurisdictions.includes("Unknown")
  ) {
    return false;
  }

  if (
    context.stage &&
    !object.applicability.proceduralStages.includes(context.stage) &&
    !object.applicability.proceduralStages.includes("not-sure")
  ) {
    return false;
  }

  if (
    context.legalDomains &&
    context.legalDomains.length > 0 &&
    !context.legalDomains.some((domain) =>
      object.applicability.legalDomains.includes(domain),
    ) &&
    !object.applicability.legalDomains.includes("unknown")
  ) {
    return false;
  }

  if (
    context.knowledgeKinds &&
    context.knowledgeKinds.length > 0 &&
    !context.knowledgeKinds.includes(object.kind)
  ) {
    return false;
  }

  if (
    context.requiresVerifiedOnly &&
    object.source.verificationStatus !== "verified"
  ) {
    return false;
  }

  if (
    !context.includeOperationalGuidance &&
    object.source.reliabilityTier === "operational"
  ) {
    return false;
  }

  if (!context.includeAiInference && object.source.reliabilityTier === "inferred") {
    return false;
  }

  if (
    context.tags &&
    context.tags.length > 0 &&
    !context.tags.some((tag) => object.tags.includes(tag))
  ) {
    return false;
  }

  return true;
}