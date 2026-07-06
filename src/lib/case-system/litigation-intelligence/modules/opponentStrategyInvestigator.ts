export type OpponentStrategyInvestigatorVersion = "2.0.0";

export type OpponentStrategySeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type OpponentStrategyConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type OpponentAttackCategory =
  | "deny-facts"
  | "attack-evidence"
  | "attack-credibility"
  | "attack-burden"
  | "attack-procedure"
  | "attack-authority"
  | "attack-remedy"
  | "exploit-contradiction"
  | "delay-or-adjourn"
  | "settlement-pressure"
  | "jurisdiction-attack"
  | "costs-pressure"
  | "trial-cross-examination"
  | "unknown";

export type OpponentStrategyInput = {
  caseId?: string;
  courtPath?: string;
  province?: string;
  stage?: string;
  rawNarrative?: string;

  evidenceFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    linkedEvidenceIds?: string[];
  }>;

  burdenFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  proceduralFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    applicableRuleCodes?: string[];
    authorityRegistryIds?: string[];
  }>;

  credibilityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  contradictionFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  authorityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    applicableRuleCodes?: string[];
    authorityRegistryIds?: string[];
  }>;

  judgePerspectiveFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    likelyJudgeQuestion?: string;
    recommendedAction?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  litigationReasoning?: {
    strongestCasePoints?: string[];
    weakestCasePoints?: string[];
    judicialConcerns?: string[];
    opposingArguments?: string[];
    missingWork?: string[];
    warnings?: string[];
  };

  workflowReadiness?: {
    blockers?: string[];
    nextActions?: string[];
    recommendedRoute?: string;
  };

  warnings?: string[];
};

export type OpponentStrategyFinding = {
  id: string;
  category: OpponentAttackCategory;
  severity: OpponentStrategySeverity;
  confidence: OpponentStrategyConfidence;
  title: string;
  likelyOpponentArgument: string;
  explanation: string;
  whyItMatters: string;
  likelyCourtImpact: string;
  recommendedResponse: string;
  responseShouldInclude: string[];
  evidenceToPrepare: string[];
  crossExaminationRisk: string;
  settlementImpact: string;
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  applicableRuleCodes: string[];
  authorityRegistryIds: string[];
  source: string;
};

export type OpponentStrategyIntelligence = {
  attackRiskScore: number;
  responseReadinessScore: number;
  settlementPressureScore: number;
  crossExaminationRiskScore: number;
  proceduralAttackRiskScore: number;
  evidenceAttackRiskScore: number;
  credibilityAttackRiskScore: number;
  confidence: OpponentStrategyConfidence;
};

export type OpponentStrategyResult = {
  version: OpponentStrategyInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: OpponentStrategyIntelligence;
  findings: OpponentStrategyFinding[];

  likelyOpponentArguments: string[];
  strongestOpponentAttacks: string[];
  evidenceAttackPoints: string[];
  credibilityAttackPoints: string[];
  burdenAttackPoints: string[];
  proceduralAttackPoints: string[];
  authorityAttackPoints: string[];
  remedyAttackPoints: string[];

  responsePlan: string[];
  evidenceToPrepare: string[];
  crossExaminationRisks: string[];
  settlementPressurePoints: string[];

  nextActions: string[];
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

function includesAny(value: unknown, terms: string[]): boolean {
  const text = normalize(value);
  return terms.some((term) => text.includes(normalize(term)));
}

function severityRank(value: OpponentStrategySeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): OpponentStrategyConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function severityFromText(value: unknown): OpponentStrategySeverity {
  const text = normalize(value);

  if (
    includesAny(text, [
      "critical",
      "contradicted",
      "blocked",
      "unsafe",
      "wrong",
      "impossible",
    ])
  ) {
    return "critical";
  }

  if (
    includesAny(text, [
      "high",
      "missing",
      "weak",
      "no proof",
      "deadline",
      "credibility",
    ])
  ) {
    return "high";
  }

  if (includesAny(text, ["concern", "unclear", "review", "gap", "risk"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): OpponentAttackCategory {
  const text = normalize(value);

  if (includesAny(text, ["evidence", "screenshot", "document", "authentic", "foundation"])) {
    return "attack-evidence";
  }

  if (includesAny(text, ["credibility", "believe", "reliable", "overstatement"])) {
    return "attack-credibility";
  }

  if (includesAny(text, ["burden", "onus", "proof", "prove", "missing element"])) {
    return "attack-burden";
  }

  if (includesAny(text, ["procedure", "served", "filed", "deadline", "motion"])) {
    return "attack-procedure";
  }

  if (includesAny(text, ["authority", "rule", "statute", "case law", "unsafe"])) {
    return "attack-authority";
  }

  if (includesAny(text, ["contradiction", "inconsistent", "conflict", "changed story"])) {
    return "exploit-contradiction";
  }

  if (includesAny(text, ["damages", "amount", "remedy", "order", "relief"])) {
    return "attack-remedy";
  }

  if (includesAny(text, ["jurisdiction", "wrong court", "forum"])) {
    return "jurisdiction-attack";
  }

  if (includesAny(text, ["costs"])) {
    return "costs-pressure";
  }

  if (includesAny(text, ["settlement", "offer", "pressure"])) {
    return "settlement-pressure";
  }

  if (includesAny(text, ["trial", "cross", "witness"])) {
    return "trial-cross-examination";
  }

  if (includesAny(text, ["delay", "adjourn"])) {
    return "delay-or-adjourn";
  }

  return "deny-facts";
}

function opponentArgumentForCategory(
  category: OpponentAttackCategory,
  text: string,
): string {
  if (category === "attack-evidence") {
    return "The other side may argue the evidence is incomplete, unreliable, unauthenticated, missing context, or does not prove what the user says it proves.";
  }

  if (category === "attack-credibility") {
    return "The other side may argue the user's version is exaggerated, inconsistent, unsupported, biased, or not believable.";
  }

  if (category === "attack-burden") {
    return "The other side may argue the user has not met the burden of proof for this issue.";
  }

  if (category === "attack-procedure") {
    return "The other side may argue the user used the wrong procedure, missed a deadline, failed service, or has not completed a required step.";
  }

  if (category === "attack-authority") {
    return "The other side may argue the legal authority is missing, unverified, outdated, wrong-jurisdiction, or does not apply.";
  }

  if (category === "exploit-contradiction") {
    return "The other side may use this contradiction to argue the user's evidence or story should not be trusted.";
  }

  if (category === "attack-remedy") {
    return "The other side may argue the requested remedy or amount is unsupported, excessive, unavailable, or disconnected from the proof.";
  }

  if (category === "jurisdiction-attack") {
    return "The other side may argue this is the wrong court, wrong forum, or wrong procedural path.";
  }

  if (category === "costs-pressure") {
    return "The other side may use costs risk or procedural conduct to pressure settlement or discourage the user from continuing.";
  }

  if (category === "settlement-pressure") {
    return "The other side may use weaknesses in the record to pressure a lower settlement.";
  }

  if (category === "trial-cross-examination") {
    return "The other side may cross-examine on this point to expose gaps, inconsistencies, or missing records.";
  }

  if (category === "delay-or-adjourn") {
    return "The other side may seek delay, adjournment, or procedural advantage if the record is incomplete.";
  }

  return `The other side may deny the facts or argue this point is not proven: ${text}`;
}

function createFinding(args: {
  category: OpponentAttackCategory;
  severity: OpponentStrategySeverity;
  confidence: OpponentStrategyConfidence;
  title: string;
  likelyOpponentArgument: string;
  explanation: string;
  whyItMatters: string;
  likelyCourtImpact: string;
  recommendedResponse: string;
  responseShouldInclude: string[];
  evidenceToPrepare: string[];
  crossExaminationRisk: string;
  settlementImpact: string;
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  applicableRuleCodes?: string[];
  authorityRegistryIds?: string[];
  source: string;
}): OpponentStrategyFinding {
  return {
    id: createId("opponent_strategy"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    likelyOpponentArgument: args.likelyOpponentArgument,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    likelyCourtImpact: args.likelyCourtImpact,
    recommendedResponse: args.recommendedResponse,
    responseShouldInclude: uniqueStrings(args.responseShouldInclude),
    evidenceToPrepare: uniqueStrings(args.evidenceToPrepare),
    crossExaminationRisk: args.crossExaminationRisk,
    settlementImpact: args.settlementImpact,
    linkedClaimIds: uniqueStrings(args.linkedClaimIds || []),
    linkedEvidenceIds: uniqueStrings(args.linkedEvidenceIds || []),
    applicableRuleCodes: uniqueStrings(args.applicableRuleCodes || []),
    authorityRegistryIds: uniqueStrings(args.authorityRegistryIds || []),
    source: args.source,
  };
}

function buildImportedFindings(input: OpponentStrategyInput): OpponentStrategyFinding[] {
  const imported = [
    ...(input.evidenceFindings || []).map((item) => ({
      source: "evidenceFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
    ...(input.burdenFindings || []).map((item) => ({
      source: "burdenFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
    ...(input.proceduralFindings || []).map((item) => ({
      source: "proceduralFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
      applicableRuleCodes: item.applicableRuleCodes || [],
      authorityRegistryIds: item.authorityRegistryIds || [],
    })),
    ...(input.credibilityFindings || []).map((item) => ({
      source: "credibilityFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
    ...(input.contradictionFindings || []).map((item) => ({
      source: "contradictionFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
    ...(input.authorityFindings || []).map((item) => ({
      source: "authorityFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
      applicableRuleCodes: item.applicableRuleCodes || [],
      authorityRegistryIds: item.authorityRegistryIds || [],
    })),
    ...(input.judgePerspectiveFindings || []).map((item) => ({
      source: "judgePerspectiveFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation || item.likelyJudgeQuestion,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
  ];

  return imported.map((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${
      item.explanation || ""
    }`;
    const category = categoryFromText(text);

    return createFinding({
      category,
      severity: severityFromText(item.severity || text),
      confidence: "medium",
      title: item.title || "Likely opponent attack",
      likelyOpponentArgument: opponentArgumentForCategory(category, text),
      explanation:
        item.explanation ||
        "This imported issue may create a point the opposing party can attack.",
      whyItMatters:
        "Opponent strategy analysis helps the user prepare responses before the other side uses weaknesses against them.",
      likelyCourtImpact:
        "If unanswered, this attack may reduce the strength of the user's evidence, credibility, procedure, authority, or requested remedy.",
      recommendedResponse:
        "Prepare a direct response supported by facts, evidence, procedure, authority, or a clear explanation.",
      responseShouldInclude: [
        "Clear factual answer",
        "Evidence support",
        "Timeline context",
        "Authority if legal/procedural",
        "Explanation for any weakness",
      ],
      evidenceToPrepare: [
        "Original documents",
        "Screenshots",
        "Witness evidence",
        "Timeline",
        "Proof chart",
        "Authority source",
      ],
      crossExaminationRisk:
        "The opposing party may use this point to ask questions designed to expose gaps, inconsistencies, or missing proof.",
      settlementImpact:
        "This issue may be used to pressure settlement unless it is answered clearly.",
      linkedClaimIds: item.linkedClaimIds,
      linkedEvidenceIds: item.linkedEvidenceIds,
      applicableRuleCodes: item.applicableRuleCodes,
      authorityRegistryIds: item.authorityRegistryIds,
      source: item.source,
    });
  });
}

function buildReasoningFindings(
  input: OpponentStrategyInput,
): OpponentStrategyFinding[] {
  const signals = [
    ...(input.litigationReasoning?.opposingArguments || []).map((value) => ({
      source: "litigationReasoning.opposingArguments",
      value,
    })),
    ...(input.litigationReasoning?.weakestCasePoints || []).map((value) => ({
      source: "litigationReasoning.weakestCasePoints",
      value,
    })),
    ...(input.litigationReasoning?.judicialConcerns || []).map((value) => ({
      source: "litigationReasoning.judicialConcerns",
      value,
    })),
    ...(input.litigationReasoning?.missingWork || []).map((value) => ({
      source: "litigationReasoning.missingWork",
      value,
    })),
    ...(input.workflowReadiness?.blockers || []).map((value) => ({
      source: "workflowReadiness.blockers",
      value,
    })),
    ...(input.warnings || []).map((value) => ({
      source: "warnings",
      value,
    })),
  ];

  return signals.map((signal) => {
    const category = categoryFromText(signal.value);

    return createFinding({
      category,
      severity: severityFromText(signal.value),
      confidence: "medium",
      title: "Likely opponent argument",
      likelyOpponentArgument: opponentArgumentForCategory(category, signal.value),
      explanation: signal.value,
      whyItMatters:
        "The other side will usually focus on the easiest weakness: missing proof, unclear facts, contradictions, bad procedure, weak authority, or unsupported remedies.",
      likelyCourtImpact:
        "If this argument is not answered, it may influence the judge or weaken settlement leverage.",
      recommendedResponse:
        "Prepare a response using the strongest available facts, documents, admissions, timeline, and authority.",
      responseShouldInclude: [
        "Direct answer",
        "Supporting evidence",
        "Timeline",
        "Explanation for any gap",
        "Authority if relevant",
      ],
      evidenceToPrepare: [
        "Documents",
        "Messages",
        "Receipts",
        "Court records",
        "Witness evidence",
        "Chronology",
      ],
      crossExaminationRisk:
        "This point may become a cross-examination or credibility attack if the case reaches a hearing or trial.",
      settlementImpact:
        "This weakness may reduce leverage unless it is fixed or explained.",
      source: signal.source,
    });
  });
}

function calculateIntelligence(
  findings: OpponentStrategyFinding[],
): OpponentStrategyIntelligence {
  let attackRiskScore = 0;
  let responseReadinessScore = 85;
  let settlementPressureScore = 0;
  let crossExaminationRiskScore = 0;
  let proceduralAttackRiskScore = 0;
  let evidenceAttackRiskScore = 0;
  let credibilityAttackRiskScore = 0;

  for (const finding of findings) {
    if (finding.severity === "critical") {
      attackRiskScore += 20;
      responseReadinessScore -= 18;
      settlementPressureScore += 18;
      crossExaminationRiskScore += 18;
    } else if (finding.severity === "high") {
      attackRiskScore += 12;
      responseReadinessScore -= 10;
      settlementPressureScore += 10;
      crossExaminationRiskScore += 10;
    } else if (finding.severity === "medium") {
      attackRiskScore += 6;
      responseReadinessScore -= 5;
      settlementPressureScore += 5;
      crossExaminationRiskScore += 5;
    } else if (finding.severity === "low") {
      attackRiskScore += 2;
      responseReadinessScore -= 1;
    }

    if (finding.category === "attack-procedure") proceduralAttackRiskScore += 12;
    if (finding.category === "attack-evidence") evidenceAttackRiskScore += 12;
    if (
      finding.category === "attack-credibility" ||
      finding.category === "exploit-contradiction"
    ) {
      credibilityAttackRiskScore += 12;
    }
  }

  return {
    attackRiskScore: Math.max(0, Math.min(100, Math.round(attackRiskScore))),
    responseReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(responseReadinessScore)),
    ),
    settlementPressureScore: Math.max(
      0,
      Math.min(100, Math.round(settlementPressureScore)),
    ),
    crossExaminationRiskScore: Math.max(
      0,
      Math.min(100, Math.round(crossExaminationRiskScore)),
    ),
    proceduralAttackRiskScore: Math.max(
      0,
      Math.min(100, Math.round(proceduralAttackRiskScore)),
    ),
    evidenceAttackRiskScore: Math.max(
      0,
      Math.min(100, Math.round(evidenceAttackRiskScore)),
    ),
    credibilityAttackRiskScore: Math.max(
      0,
      Math.min(100, Math.round(credibilityAttackRiskScore)),
    ),
    confidence: confidenceFromScore(responseReadinessScore),
  };
}

function findingsByCategory(
  findings: OpponentStrategyFinding[],
  category: OpponentAttackCategory,
): OpponentStrategyFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function actionsFromFindings(findings: OpponentStrategyFinding[]): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedResponse),
  );
}

function collectionFromFindings(
  findings: OpponentStrategyFinding[],
  selector: (finding: OpponentStrategyFinding) => string[],
): string[] {
  return uniqueStrings(findings.flatMap(selector));
}

export function buildOpponentStrategyInvestigation(
  input: OpponentStrategyInput,
): OpponentStrategyResult {
  const findings = [
    ...buildImportedFindings(input),
    ...buildReasoningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings);

  const warnings = uniqueStrings([
    ...(input.litigationReasoning?.warnings || []),
    ...(input.warnings || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "2.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    intelligence,
    findings,

    likelyOpponentArguments: uniqueStrings(
      findings.map((finding) => finding.likelyOpponentArgument),
    ),
    strongestOpponentAttacks: uniqueStrings(
      findings
        .filter((finding) => severityRank(finding.severity) >= 4)
        .map((finding) => finding.likelyOpponentArgument),
    ),
    evidenceAttackPoints: findingsByCategory(findings, "attack-evidence").map(
      (finding) => finding.explanation,
    ),
    credibilityAttackPoints: findings
      .filter((finding) =>
        ["attack-credibility", "exploit-contradiction"].includes(
          finding.category,
        ),
      )
      .map((finding) => finding.explanation),
    burdenAttackPoints: findingsByCategory(findings, "attack-burden").map(
      (finding) => finding.explanation,
    ),
    proceduralAttackPoints: findingsByCategory(findings, "attack-procedure").map(
      (finding) => finding.explanation,
    ),
    authorityAttackPoints: findingsByCategory(findings, "attack-authority").map(
      (finding) => finding.explanation,
    ),
    remedyAttackPoints: findingsByCategory(findings, "attack-remedy").map(
      (finding) => finding.explanation,
    ),

    responsePlan: actionsFromFindings(findings).slice(0, 16),
    evidenceToPrepare: collectionFromFindings(
      findings,
      (finding) => finding.evidenceToPrepare,
    ),
    crossExaminationRisks: uniqueStrings(
      findings.map((finding) => finding.crossExaminationRisk),
    ),
    settlementPressurePoints: uniqueStrings(
      findings.map((finding) => finding.settlementImpact),
    ),

    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      "Prepare answers to the strongest opponent attacks before settlement, conference, motion, or trial.",
      "Do not rely on a weak point until the likely opponent attack has a clear evidence-backed response.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Opponent Strategy Investigator found ${findings.length} likely attack point(s), with response readiness ${intelligence.confidence} (${intelligence.responseReadinessScore}/100).`
        : `Opponent Strategy Investigator found no major attack points, with response readiness ${intelligence.confidence} (${intelligence.responseReadinessScore}/100).`,
  };
}