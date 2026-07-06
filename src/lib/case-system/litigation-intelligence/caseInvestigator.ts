import {
  buildNarrativeInvestigation,
  NarrativeInvestigationResult,
} from "./modules/narrativeInvestigator";

import {
  buildEvidenceInvestigation,
  EvidenceInvestigationResult,
} from "./modules/evidenceInvestigator";

import {
  buildBurdenInvestigation,
  BurdenInvestigationResult,
} from "./modules/burdenInvestigator";

import {
  buildProceduralInvestigation,
  ProceduralInvestigationInput,
  ProceduralInvestigationResult,
} from "./modules/proceduralInvestigator";

import {
  buildCredibilityInvestigation,
  CredibilityInvestigationResult,
} from "./modules/credibilityInvestigator";

import {
  buildContradictionInvestigation,
  ContradictionInvestigationResult,
} from "./modules/contradictionInvestigator";

import {
  buildAuthorityInvestigation,
  AuthorityInvestigationInput,
  AuthorityInvestigationResult,
} from "./modules/authorityInvestigator";

import {
  buildJudgePerspectiveInvestigation,
  JudgePerspectiveResult,
} from "./modules/judgePerspectiveInvestigator";

import {
  buildOpponentStrategyInvestigation,
  OpponentStrategyResult,
} from "./modules/opponentStrategyInvestigator";

import {
  buildSettlementInvestigation,
  SettlementInvestigationInput,
  SettlementInvestigationResult,
} from "./modules/settlementInvestigator";

import {
  buildTrialReadinessInvestigation,
  TrialReadinessInput,
  TrialReadinessResult,
} from "./modules/trialReadinessInvestigator";

export type LitigationInvestigationVersion = "2.0.0";

export type InvestigationQuestionPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type InvestigationQuestionCategory =
  | "missing-facts"
  | "missing-evidence"
  | "proof-gap"
  | "timeline"
  | "credibility"
  | "contradiction"
  | "judge-concern"
  | "opposing-argument"
  | "procedure"
  | "remedy"
  | "authority"
  | "settlement"
  | "trial-readiness"
  | "unknown";

export type InvestigationQuestion = {
  id: string;
  category: InvestigationQuestionCategory;
  priority: InvestigationQuestionPriority;
  question: string;
  whyItMatters: string;
  whatToLookFor: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  source: string;
};

export type LitigationInvestigationInput = {
  caseId?: string;
  courtPath?: string;
  province?: string;
  stage?: string;
  rawNarrative?: string;
  desiredOutcome?: string;
  claimAmount?: number;

  knownFacts?: string[];
  knownIssues?: string[];
  knownParties?: string[];
  knownEvidenceTitles?: string[];
  knownTimelineEvents?: Array<{
    id?: string;
    title?: string;
    description?: string;
    date?: string;
  }>;

  evidenceItems?: Array<{
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    sourceText?: string;
    linkedClaimDomains?: string[];
    linkedTimelineEventIds?: string[];
    tags?: string[];
  }>;

  claimTheories?: Array<{
    id?: string;
    title?: string;
    status?: string;
    confidence?: string;
    linkedEvidenceIds?: string[];
    burdens?: Array<{
      issueLabel?: string;
      burdenHolder?: "user" | "other-side" | "shared" | "unknown";
      standard?: string;
      whatMustBeProven?: string[];
      currentProofStrength?: string;
      missingProof?: string[];
      linkedEvidenceIds?: string[];
      explanation?: string;
    }>;
    elements?: Array<{
      id?: string;
      label?: string;
      status?: string;
      missingFacts?: string[];
      missingEvidence?: string[];
      supportingEvidenceIds?: string[];
      risks?: string[];
      confidence?: string;
    }>;
    risks?: Array<{
      title?: string;
      severity?: string;
      explanation?: string;
    }>;
  }>;

  litigationReasoning?: {
    readinessScore?: number;
    readinessLevel?: string;
    strongestCasePoints?: string[];
    weakestCasePoints?: string[];
    judicialConcerns?: string[];
    opposingArguments?: string[];
    missingWork?: string[];
    nextActions?: string[];
    warnings?: string[];
  };

  workflowReadiness?: {
    blockers?: string[];
    nextActions?: string[];
    recommendedRoute?: string;
  };

  masterCaseReadiness?: {
    blockers?: string[];
    reasons?: string[];
  };

  proceduralState?: ProceduralInvestigationInput["proceduralState"];
  authorityReferences?: ProceduralInvestigationInput["authorityReferences"];
  authorities?: AuthorityInvestigationInput["authorities"];
  authorityAnalysis?: AuthorityInvestigationInput["authorityAnalysis"];
  evidenceAnalysis?: Record<string, unknown>;
  evidenceIntelligence?: Record<string, unknown>;
  contradictionAnalysis?: Record<string, unknown>;
  credibilityAnalysis?: Record<string, unknown>;
  proofAnalysis?: Record<string, unknown>;
  settlementHistory?: SettlementInvestigationInput["settlementHistory"];
  trialMaterials?: TrialReadinessInput["trialMaterials"];
  witnesses?: TrialReadinessInput["witnesses"];
  exhibits?: TrialReadinessInput["exhibits"];

  proceduralWarnings?: string[];
  evidenceWarnings?: string[];
  burdenWarnings?: string[];
  authorityWarnings?: string[];
  credibilityWarnings?: string[];
  contradictionWarnings?: string[];
  litigationReasoningWarnings?: string[];
  warnings?: string[];
};

export type LitigationInvestigationResult = {
  version: LitigationInvestigationVersion;
  generatedAt: string;
  caseId?: string;

  narrative: NarrativeInvestigationResult;
  evidence: EvidenceInvestigationResult;
  burden: BurdenInvestigationResult;
  procedure: ProceduralInvestigationResult;
  credibility: CredibilityInvestigationResult;
  contradictions: ContradictionInvestigationResult;
  authority: AuthorityInvestigationResult;
  judgePerspective: JudgePerspectiveResult;
  opponentStrategy: OpponentStrategyResult;
  settlement: SettlementInvestigationResult;
  trialReadiness: TrialReadinessResult;

  urgentQuestions: InvestigationQuestion[];
  recommendedQuestions: InvestigationQuestion[];
  optionalQuestions: InvestigationQuestion[];

  evidenceRequests: string[];
  proofRequests: string[];
  timelineRequests: string[];
  credibilityRequests: string[];
  proceduralRequests: string[];
  authorityRequests: string[];
  settlementRequests: string[];
  trialReadinessRequests: string[];

  nextInvestigationFocus: string[];
  warnings: string[];
  summary: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase();
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function priorityRank(priority: InvestigationQuestionPriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function priorityFromText(value: unknown): InvestigationQuestionPriority {
  const text = normalize(value);

  if (
    text.includes("critical") ||
    text.includes("contradicted") ||
    text.includes("unsafe") ||
    text.includes("blocked")
  ) {
    return "critical";
  }

  if (
    text.includes("missing") ||
    text.includes("weak") ||
    text.includes("no proof") ||
    text.includes("high") ||
    text.includes("deadline")
  ) {
    return "high";
  }

  if (
    text.includes("warning") ||
    text.includes("concern") ||
    text.includes("review") ||
    text.includes("gap")
  ) {
    return "medium";
  }

  return "low";
}

function categoryFromText(value: unknown): InvestigationQuestionCategory {
  const text = normalize(value);

  if (text.includes("evidence") || text.includes("document")) {
    return "missing-evidence";
  }

  if (text.includes("proof") || text.includes("burden") || text.includes("onus")) {
    return "proof-gap";
  }

  if (text.includes("timeline") || text.includes("date") || text.includes("chronology")) {
    return "timeline";
  }

  if (text.includes("credibility") || text.includes("believe")) {
    return "credibility";
  }

  if (text.includes("contradiction") || text.includes("inconsistent")) {
    return "contradiction";
  }

  if (text.includes("judge") || text.includes("court")) {
    return "judge-concern";
  }

  if (text.includes("opponent") || text.includes("other side")) {
    return "opposing-argument";
  }

  if (text.includes("procedure") || text.includes("served") || text.includes("filed")) {
    return "procedure";
  }

  if (text.includes("authority") || text.includes("rule") || text.includes("case law")) {
    return "authority";
  }

  if (text.includes("settlement") || text.includes("offer")) {
    return "settlement";
  }

  if (text.includes("trial") || text.includes("witness") || text.includes("exhibit")) {
    return "trial-readiness";
  }

  if (text.includes("damage") || text.includes("remedy") || text.includes("amount")) {
    return "remedy";
  }

  return "missing-facts";
}

function whatToLookFor(category: InvestigationQuestionCategory): string[] {
  if (category === "missing-evidence" || category === "proof-gap") {
    return [
      "Documents",
      "Screenshots",
      "Messages",
      "Receipts",
      "Bank records",
      "Photos",
      "Witnesses",
      "Court records",
    ];
  }

  if (category === "procedure") {
    return [
      "Filed copies",
      "Stamped documents",
      "Affidavit of service",
      "Court notices",
      "Orders",
      "Deadlines",
    ];
  }

  if (category === "authority") {
    return [
      "Rules",
      "Statutes",
      "Case law",
      "Form rules",
      "Authority registry entries",
    ];
  }

  if (category === "trial-readiness") {
    return [
      "Witness list",
      "Exhibit list",
      "Chronology",
      "Proof map",
      "Trial materials",
      "Draft order",
    ];
  }

  return [
    "Specific facts",
    "Dates",
    "Documents",
    "Evidence",
    "Witnesses",
    "Explanation",
  ];
}

function buildQuestion(args: {
  question: string;
  source: string;
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
}): InvestigationQuestion {
  const category = categoryFromText(args.question);

  return {
    id: createId("investigation_question"),
    category,
    priority: priorityFromText(args.question),
    question: args.question,
    whyItMatters:
      "CourtSimplified needs this answer to connect facts, evidence, burden, procedure, authority, strategy, and court readiness without guessing.",
    whatToLookFor: whatToLookFor(category),
    linkedClaimIds: args.linkedClaimIds || [],
    linkedEvidenceIds: args.linkedEvidenceIds || [],
    source: args.source,
  };
}

function sortQuestions(questions: InvestigationQuestion[]): InvestigationQuestion[] {
  return questions.slice().sort((a, b) => {
    const rankDiff = priorityRank(b.priority) - priorityRank(a.priority);
    if (rankDiff !== 0) return rankDiff;
    return a.category.localeCompare(b.category);
  });
}

function questionsByPriority(
  questions: InvestigationQuestion[],
  priority: InvestigationQuestionPriority[],
): InvestigationQuestion[] {
  return questions.filter((question) => priority.includes(question.priority));
}

function extractRequests(
  questions: InvestigationQuestion[],
  categories: InvestigationQuestionCategory[],
): string[] {
  return uniqueStrings(
    questions
      .filter((question) => categories.includes(question.category))
      .flatMap((question) => question.whatToLookFor),
  );
}

function buildAllQuestions(args: {
  narrative: NarrativeInvestigationResult;
  evidence: EvidenceInvestigationResult;
  burden: BurdenInvestigationResult;
  procedure: ProceduralInvestigationResult;
  credibility: CredibilityInvestigationResult;
  contradictions: ContradictionInvestigationResult;
  authority: AuthorityInvestigationResult;
  judgePerspective: JudgePerspectiveResult;
  opponentStrategy: OpponentStrategyResult;
  settlement: SettlementInvestigationResult;
  trialReadiness: TrialReadinessResult;
  input: LitigationInvestigationInput;
}): InvestigationQuestion[] {
  return sortQuestions([
    ...args.narrative.topQuestions.map((question: string) =>
      buildQuestion({ question, source: "narrativeInvestigator" }),
    ),
    ...args.evidence.topQuestions.map((question: string) =>
      buildQuestion({ question, source: "evidenceInvestigator" }),
    ),
    ...args.burden.nextActions.map((question: string) =>
      buildQuestion({ question, source: "burdenInvestigator" }),
    ),
    ...args.procedure.topQuestions.map((question: string) =>
      buildQuestion({ question, source: "proceduralInvestigator" }),
    ),
    ...args.credibility.topQuestions.map((question: string) =>
      buildQuestion({ question, source: "credibilityInvestigator" }),
    ),
    ...args.contradictions.topQuestions.map((question: string) =>
      buildQuestion({ question, source: "contradictionInvestigator" }),
    ),
    ...args.authority.topQuestions.map((question: string) =>
      buildQuestion({ question, source: "authorityInvestigator" }),
    ),
    ...args.judgePerspective.likelyJudgeQuestions.map((question: string) =>
      buildQuestion({ question, source: "judgePerspectiveInvestigator" }),
    ),
    ...args.opponentStrategy.likelyOpponentArguments.map((question: string) =>
      buildQuestion({ question, source: "opponentStrategyInvestigator" }),
    ),
    ...args.settlement.offerPreparationQuestions.map((question: string) =>
      buildQuestion({ question, source: "settlementInvestigator" }),
    ),
    ...args.trialReadiness.nextActions.map((question: string) =>
      buildQuestion({ question, source: "trialReadinessInvestigator" }),
    ),
    ...(args.input.litigationReasoning?.missingWork || []).map((question: string) =>
      buildQuestion({ question, source: "litigationReasoning.missingWork" }),
    ),
    ...(args.input.workflowReadiness?.blockers || []).map((question: string) =>
      buildQuestion({ question, source: "workflowReadiness.blockers" }),
    ),
  ]);
}

export function buildLitigationInvestigation(
  input: LitigationInvestigationInput,
): LitigationInvestigationResult {
  const narrative = buildNarrativeInvestigation({
    caseId: input.caseId,
    rawNarrative: input.rawNarrative,
    knownFacts: input.knownFacts,
    knownIssues: input.knownIssues,
    knownParties: input.knownParties,
    knownEvidenceTitles: input.knownEvidenceTitles,
    knownTimelineEvents: input.knownTimelineEvents,
    warnings: input.warnings,
  });

  const evidence = buildEvidenceInvestigation({
    caseId: input.caseId,
    evidenceItems: input.evidenceItems,
    evidenceIntelligence: input.evidenceIntelligence,
    evidenceAnalysis: input.evidenceAnalysis,
    proofWeaknesses: input.burdenWarnings,
    damagesWarnings: input.warnings,
    timelineWarnings: narrative.missingDates,
    credibilityWarnings: input.credibilityWarnings,
    contradictionWarnings: input.contradictionWarnings,
    proceduralWarnings: input.proceduralWarnings,
  });

  const burden = buildBurdenInvestigation({
    caseId: input.caseId,
    claimTheories: input.claimTheories,
    proofAnalysis: input.proofAnalysis,
    litigationReasoning: input.litigationReasoning,
    evidenceWarnings: evidence.warnings,
    proceduralWarnings: input.proceduralWarnings,
    credibilityWarnings: input.credibilityWarnings,
    contradictionWarnings: input.contradictionWarnings,
  });

  const procedure = buildProceduralInvestigation({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    rawNarrative: input.rawNarrative,
    proceduralState: input.proceduralState,
    workflowReadiness: input.workflowReadiness,
    authorityReferences: input.authorityReferences,
    evidenceWarnings: evidence.warnings,
    burdenWarnings: burden.warnings,
    authorityWarnings: input.authorityWarnings,
    litigationReasoningWarnings: input.litigationReasoningWarnings,
  });

  const credibility = buildCredibilityInvestigation({
    caseId: input.caseId,
    rawNarrative: input.rawNarrative,
    narrativeFindings: narrative.findings,
    evidenceFindings: evidence.findings,
    burdenFindings: burden.findings,
    proceduralFindings: procedure.findings,
    litigationReasoning: input.litigationReasoning,
    credibilityAnalysis: input.credibilityAnalysis,
    contradictionWarnings: input.contradictionWarnings,
    evidenceWarnings: evidence.warnings,
    proceduralWarnings: procedure.warnings,
    burdenWarnings: burden.warnings,
  });

  const contradictions = buildContradictionInvestigation({
    caseId: input.caseId,
    rawNarrative: input.rawNarrative,
    contradictionAnalysis: input.contradictionAnalysis,
    evidenceContradictions: evidence.contradictionReviewRequests,
    narrativeContradictions: narrative.contradictionConcerns,
    credibilityWarnings: credibility.warnings,
    proceduralWarnings: procedure.warnings,
    burdenWarnings: burden.warnings,
    litigationReasoningWarnings: input.litigationReasoningWarnings,
    evidenceFindings: evidence.findings,
    credibilityFindings: credibility.findings,
    burdenFindings: burden.findings,
  });

  const authority = buildAuthorityInvestigation({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    authorities: input.authorities,
    authorityAnalysis: input.authorityAnalysis,
    proceduralFindings: procedure.findings,
    burdenFindings: burden.findings,
    evidenceFindings: evidence.findings,
    credibilityFindings: credibility.findings,
    contradictionFindings: contradictions.findings,
    litigationReasoning: input.litigationReasoning,
    proceduralWarnings: procedure.warnings,
    evidenceWarnings: evidence.warnings,
    burdenWarnings: burden.warnings,
    credibilityWarnings: credibility.warnings,
    contradictionWarnings: contradictions.warnings,
  });

  const judgePerspective = buildJudgePerspectiveInvestigation({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    rawNarrative: input.rawNarrative,
    narrativeFindings: narrative.findings,
    evidenceFindings: evidence.findings,
    burdenFindings: burden.findings,
    proceduralFindings: procedure.findings,
    credibilityFindings: credibility.findings,
    contradictionFindings: contradictions.findings,
    authorityFindings: authority.findings,
    litigationReasoning: input.litigationReasoning,
    workflowReadiness: input.workflowReadiness,
    warnings: input.warnings,
  });

  const opponentStrategy = buildOpponentStrategyInvestigation({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    rawNarrative: input.rawNarrative,
    evidenceFindings: evidence.findings,
    burdenFindings: burden.findings,
    proceduralFindings: procedure.findings,
    credibilityFindings: credibility.findings,
    contradictionFindings: contradictions.findings,
    authorityFindings: authority.findings,
    judgePerspectiveFindings: judgePerspective.findings,
    litigationReasoning: input.litigationReasoning,
    workflowReadiness: input.workflowReadiness,
    warnings: input.warnings,
  });

  const settlement = buildSettlementInvestigation({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    claimAmount: input.claimAmount,
    desiredOutcome: input.desiredOutcome,
    rawNarrative: input.rawNarrative,
    evidenceFindings: evidence.findings,
    burdenFindings: burden.findings,
    proceduralFindings: procedure.findings,
    credibilityFindings: credibility.findings,
    contradictionFindings: contradictions.findings,
    authorityFindings: authority.findings,
    judgePerspectiveFindings: judgePerspective.findings,
    opponentStrategyFindings: opponentStrategy.findings,
    litigationReasoning: input.litigationReasoning,
    settlementHistory: input.settlementHistory,
    warnings: input.warnings,
  });

  const trialReadiness = buildTrialReadinessInvestigation({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    rawNarrative: input.rawNarrative,
    desiredOutcome: input.desiredOutcome,
    claimAmount: input.claimAmount,
    evidenceFindings: evidence.findings,
    burdenFindings: burden.findings,
    proceduralFindings: procedure.findings,
    credibilityFindings: credibility.findings,
    contradictionFindings: contradictions.findings,
    authorityFindings: authority.findings,
    judgePerspectiveFindings: judgePerspective.findings,
    opponentStrategyFindings: opponentStrategy.findings,
    settlementFindings: settlement.findings,
    litigationReasoning: input.litigationReasoning,
    workflowReadiness: input.workflowReadiness,
    trialMaterials: input.trialMaterials,
    witnesses: input.witnesses,
    exhibits: input.exhibits,
    warnings: input.warnings,
  });

  const questions = buildAllQuestions({
    narrative,
    evidence,
    burden,
    procedure,
    credibility,
    contradictions,
    authority,
    judgePerspective,
    opponentStrategy,
    settlement,
    trialReadiness,
    input,
  });

  const urgentQuestions = questionsByPriority(questions, [
    "critical",
    "high",
  ]).slice(0, 12);

  const recommendedQuestions = questionsByPriority(questions, ["medium"]).slice(
    0,
    12,
  );

  const optionalQuestions = questionsByPriority(questions, ["low"]).slice(0, 12);

  const warnings = uniqueStrings([
    ...(input.warnings || []),
    ...(input.litigationReasoning?.warnings || []),
    ...narrative.warnings,
    ...evidence.warnings,
    ...burden.warnings,
    ...procedure.warnings,
    ...credibility.warnings,
    ...contradictions.warnings,
    ...authority.warnings,
    ...judgePerspective.warnings,
    ...opponentStrategy.warnings,
    ...settlement.warnings,
    ...trialReadiness.warnings,
  ]);

  const nextInvestigationFocus = uniqueStrings([
    ...urgentQuestions.map((question) => question.question),
    ...narrative.nextActions,
    ...evidence.nextActions,
    ...burden.nextActions,
    ...procedure.nextActions,
    ...credibility.nextActions,
    ...contradictions.nextActions,
    ...authority.nextActions,
    ...judgePerspective.nextActions,
    ...opponentStrategy.nextActions,
    ...settlement.nextActions,
    ...trialReadiness.nextActions,
  ]).slice(0, 20);

  return {
    version: "2.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    narrative,
    evidence,
    burden,
    procedure,
    credibility,
    contradictions,
    authority,
    judgePerspective,
    opponentStrategy,
    settlement,
    trialReadiness,

    urgentQuestions,
    recommendedQuestions,
    optionalQuestions,

    evidenceRequests: extractRequests(questions, [
      "missing-evidence",
      "proof-gap",
      "opposing-argument",
    ]),
    proofRequests: extractRequests(questions, ["missing-facts", "proof-gap"]),
    timelineRequests: extractRequests(questions, ["timeline"]),
    credibilityRequests: extractRequests(questions, [
      "credibility",
      "contradiction",
    ]),
    proceduralRequests: extractRequests(questions, ["procedure"]),
    authorityRequests: extractRequests(questions, ["authority"]),
    settlementRequests: extractRequests(questions, ["settlement", "remedy"]),
    trialReadinessRequests: extractRequests(questions, ["trial-readiness"]),

    nextInvestigationFocus,
    warnings,

    summary:
      `Case Investigator v2.0.0 ran 11 specialist investigators and produced ` +
      `${questions.length} investigation question(s), ${warnings.length} warning(s), ` +
      `trial readiness ${trialReadiness.intelligence.overallReadinessLevel}, ` +
      `procedural readiness ${procedure.proceduralReadinessLevel}, and ` +
      `authority readiness ${authority.intelligence.confidence}.`,
  };
}