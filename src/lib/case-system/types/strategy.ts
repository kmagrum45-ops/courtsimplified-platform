import type {
  CourtSimplifiedCasePath,
  EvidenceStrength,
  LitigationStage,
  RiskSeverity,
} from "./case";

export type StrategyCategory =
  | "case-theory"
  | "evidence"
  | "procedure"
  | "credibility"
  | "damages"
  | "causation"
  | "settlement"
  | "hearing-preparation"
  | "trial-preparation"
  | "wording"
  | "risk-control"
  | "unknown";

export type StrategicPosition =
  | "strong"
  | "developing"
  | "mixed"
  | "weak"
  | "unclear";

export type ArgumentSide =
  | "user"
  | "other-side"
  | "judge-or-decision-maker"
  | "neutral";

export type StrategyPoint = {
  id: string;
  category: StrategyCategory;
  side: ArgumentSide;
  title: string;
  explanation: string;
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  strength: EvidenceStrength;
  riskLevel: RiskSeverity;
  suggestedAction?: string;
};

export type DefenceOrResponseAttack = {
  id: string;
  title: string;
  likelyArgument: string;
  whyItMatters: string;
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
  riskLevel: RiskSeverity;
  possibleResponse: string;
  missingProofToAnswer: string[];
};

export type JudgeConcern = {
  id: string;
  concern: string;
  whyCourtMayCare: string;
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
  severity: RiskSeverity;
  suggestedPreparation: string;
};

export type SettlementStrategy = {
  currentPosition: StrategicPosition;
  settlementStrengths: string[];
  settlementWeaknesses: string[];
  reasonableResolutionOptions: string[];
  documentsToSupportSettlement: string[];
  risksIfNoSettlement: string[];
  wordingNotes: string[];
};

export type WordingImprovement = {
  id: string;
  originalWording: string;
  improvedWording: string;
  reason: string;
  category:
    | "court-tone"
    | "clarity"
    | "evidence-link"
    | "remove-speculation"
    | "separate-fact-from-opinion"
    | "legal-focus"
    | "other";
  linkedIssueIds: string[];
};

export type LitigationStrategyProfile = {
  caseId?: string;
  casePath?: CourtSimplifiedCasePath;
  stage: LitigationStage;

  overallPosition: StrategicPosition;

  strengths: StrategyPoint[];
  weaknesses: StrategyPoint[];
  opportunities: StrategyPoint[];
  threats: StrategyPoint[];

  likelyOtherSideArguments: DefenceOrResponseAttack[];
  likelyJudgeConcerns: JudgeConcern[];

  settlement: SettlementStrategy;
  wordingImprovements: WordingImprovement[];

  nextStrategicActions: string[];
  preparationWarnings: string[];
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyStrategyPoint(
  overrides: Partial<StrategyPoint> = {},
): StrategyPoint {
  return {
    id: overrides.id || createId("strategy_point"),
    category: overrides.category || "unknown",
    side: overrides.side || "neutral",
    title: overrides.title || "",
    explanation: overrides.explanation || "",
    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedEvidenceIds: overrides.linkedEvidenceIds || [],
    linkedTimelineEventIds: overrides.linkedTimelineEventIds || [],
    strength: overrides.strength || "unknown",
    riskLevel: overrides.riskLevel || "medium",
    suggestedAction: overrides.suggestedAction || "",
  };
}

export function createEmptyDefenceOrResponseAttack(
  overrides: Partial<DefenceOrResponseAttack> = {},
): DefenceOrResponseAttack {
  return {
    id: overrides.id || createId("defence_attack"),
    title: overrides.title || "",
    likelyArgument: overrides.likelyArgument || "",
    whyItMatters: overrides.whyItMatters || "",
    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedEvidenceIds: overrides.linkedEvidenceIds || [],
    riskLevel: overrides.riskLevel || "medium",
    possibleResponse: overrides.possibleResponse || "",
    missingProofToAnswer: overrides.missingProofToAnswer || [],
  };
}

export function createEmptyJudgeConcern(
  overrides: Partial<JudgeConcern> = {},
): JudgeConcern {
  return {
    id: overrides.id || createId("judge_concern"),
    concern: overrides.concern || "",
    whyCourtMayCare: overrides.whyCourtMayCare || "",
    linkedIssueIds: overrides.linkedIssueIds || [],
    linkedEvidenceIds: overrides.linkedEvidenceIds || [],
    severity: overrides.severity || "medium",
    suggestedPreparation: overrides.suggestedPreparation || "",
  };
}

export function createEmptySettlementStrategy(
  overrides: Partial<SettlementStrategy> = {},
): SettlementStrategy {
  return {
    currentPosition: overrides.currentPosition || "unclear",
    settlementStrengths: overrides.settlementStrengths || [],
    settlementWeaknesses: overrides.settlementWeaknesses || [],
    reasonableResolutionOptions: overrides.reasonableResolutionOptions || [],
    documentsToSupportSettlement: overrides.documentsToSupportSettlement || [],
    risksIfNoSettlement: overrides.risksIfNoSettlement || [],
    wordingNotes: overrides.wordingNotes || [],
  };
}

export function createEmptyWordingImprovement(
  overrides: Partial<WordingImprovement> = {},
): WordingImprovement {
  return {
    id: overrides.id || createId("wording_improvement"),
    originalWording: overrides.originalWording || "",
    improvedWording: overrides.improvedWording || "",
    reason: overrides.reason || "",
    category: overrides.category || "other",
    linkedIssueIds: overrides.linkedIssueIds || [],
  };
}

export function createEmptyLitigationStrategyProfile(
  overrides: Partial<LitigationStrategyProfile> = {},
): LitigationStrategyProfile {
  return {
    caseId: overrides.caseId,
    casePath: overrides.casePath,
    stage: overrides.stage || "not-sure",

    overallPosition: overrides.overallPosition || "unclear",

    strengths: overrides.strengths || [],
    weaknesses: overrides.weaknesses || [],
    opportunities: overrides.opportunities || [],
    threats: overrides.threats || [],

    likelyOtherSideArguments: overrides.likelyOtherSideArguments || [],
    likelyJudgeConcerns: overrides.likelyJudgeConcerns || [],

    settlement: overrides.settlement || createEmptySettlementStrategy(),
    wordingImprovements: overrides.wordingImprovements || [],

    nextStrategicActions: overrides.nextStrategicActions || [],
    preparationWarnings: overrides.preparationWarnings || [],
  };
}