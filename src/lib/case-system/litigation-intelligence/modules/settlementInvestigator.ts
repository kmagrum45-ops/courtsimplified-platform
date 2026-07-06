export type SettlementInvestigatorVersion = "2.0.0";

export type SettlementSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SettlementConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type SettlementLeverageLevel =
  | "very-weak"
  | "weak"
  | "mixed"
  | "strong"
  | "very-strong";

export type SettlementFindingCategory =
  | "settlement-strength"
  | "settlement-weakness"
  | "evidence-leverage"
  | "proof-risk"
  | "credibility-risk"
  | "contradiction-risk"
  | "procedural-risk"
  | "authority-risk"
  | "opponent-pressure"
  | "damages-or-remedy-gap"
  | "offer-strategy"
  | "conference-readiness"
  | "costs-risk"
  | "non-monetary-term"
  | "unknown";

export type SettlementInvestigationInput = {
  caseId?: string;
  courtPath?: string;
  province?: string;
  stage?: string;
  claimAmount?: number;
  desiredOutcome?: string;
  rawNarrative?: string;

  evidenceFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedEvidenceIds?: string[];
  }>;

  burdenFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  proceduralFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedAction?: string;
    applicableRuleCodes?: string[];
    authorityRegistryIds?: string[];
  }>;

  credibilityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  contradictionFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  authorityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    authorityRegistryIds?: string[];
  }>;

  judgePerspectiveFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    likelyJudgeQuestion?: string;
  }>;

  opponentStrategyFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    likelyOpponentArgument?: string;
    recommendedResponse?: string;
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

  settlementHistory?: Array<{
    date?: string;
    offerBy?: "user" | "opposing-party" | "unknown";
    amount?: number;
    terms?: string[];
    accepted?: boolean;
    rejected?: boolean;
    expired?: boolean;
    notes?: string;
  }>;

  warnings?: string[];
};

export type SettlementInvestigationFinding = {
  id: string;
  category: SettlementFindingCategory;
  severity: SettlementSeverity;
  confidence: SettlementConfidence;
  title: string;
  explanation: string;
  settlementImpact: string;
  leverageImpact: string;
  recommendedQuestion: string;
  recommendedAction: string;
  negotiationUse: string;
  evidenceToPrepare: string[];
  termsToConsider: string[];
  risksIfIgnored: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  authorityRegistryIds: string[];
  source: string;
};

export type SettlementInvestigatorIntelligence = {
  settlementReadinessScore: number;
  leverageScore: number;
  proofRiskScore: number;
  credibilityRiskScore: number;
  proceduralRiskScore: number;
  opponentPressureScore: number;
  confidence: SettlementConfidence;
  leverageLevel: SettlementLeverageLevel;
};

export type SettlementInvestigationResult = {
  version: SettlementInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: SettlementInvestigatorIntelligence;
  findings: SettlementInvestigationFinding[];

  settlementStrengths: string[];
  settlementWeaknesses: string[];
  leveragePoints: string[];
  pressurePoints: string[];
  offerPreparationQuestions: string[];
  conferenceReadinessQuestions: string[];
  damagesQuestions: string[];
  nonMonetaryTermsToConsider: string[];

  evidenceToPrepare: string[];
  suggestedSettlementPosture: string;
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

function severityRank(value: SettlementSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): SettlementConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function leverageLevelFromScore(score: number): SettlementLeverageLevel {
  if (score >= 85) return "very-strong";
  if (score >= 70) return "strong";
  if (score >= 45) return "mixed";
  if (score >= 25) return "weak";
  return "very-weak";
}

function severityFromText(value: unknown): SettlementSeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "blocked", "unsafe", "contradicted"])) {
    return "critical";
  }

  if (includesAny(text, ["high", "missing", "weak", "no proof", "deadline"])) {
    return "high";
  }

  if (includesAny(text, ["concern", "unclear", "review", "gap", "risk"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): SettlementFindingCategory {
  const text = normalize(value);

  if (includesAny(text, ["strong", "strength", "admission", "verified"])) {
    return "settlement-strength";
  }

  if (includesAny(text, ["weak", "missing", "gap", "unclear"])) {
    return "settlement-weakness";
  }

  if (includesAny(text, ["evidence", "document", "screenshot", "record"])) {
    return "evidence-leverage";
  }

  if (includesAny(text, ["burden", "proof", "onus", "element"])) {
    return "proof-risk";
  }

  if (includesAny(text, ["credibility", "believe", "reliable"])) {
    return "credibility-risk";
  }

  if (includesAny(text, ["contradiction", "inconsistent", "conflict"])) {
    return "contradiction-risk";
  }

  if (includesAny(text, ["procedure", "service", "filed", "deadline", "conference"])) {
    return "procedural-risk";
  }

  if (includesAny(text, ["authority", "rule", "case law", "statute"])) {
    return "authority-risk";
  }

  if (includesAny(text, ["opponent", "other side", "attack", "pressure"])) {
    return "opponent-pressure";
  }

  if (includesAny(text, ["damage", "amount", "money", "remedy", "order"])) {
    return "damages-or-remedy-gap";
  }

  if (includesAny(text, ["offer", "settlement", "proposal", "terms"])) {
    return "offer-strategy";
  }

  if (includesAny(text, ["conference", "brief", "settlement conference"])) {
    return "conference-readiness";
  }

  if (includesAny(text, ["costs"])) {
    return "costs-risk";
  }

  if (includesAny(text, ["apology", "retraction", "return", "payment plan", "non-monetary"])) {
    return "non-monetary-term";
  }

  return "unknown";
}

function createFinding(args: {
  category: SettlementFindingCategory;
  severity: SettlementSeverity;
  confidence: SettlementConfidence;
  title: string;
  explanation: string;
  settlementImpact: string;
  leverageImpact: string;
  recommendedQuestion: string;
  recommendedAction: string;
  negotiationUse: string;
  evidenceToPrepare: string[];
  termsToConsider?: string[];
  risksIfIgnored?: string[];
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  authorityRegistryIds?: string[];
  source: string;
}): SettlementInvestigationFinding {
  return {
    id: createId("settlement_investigation"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    settlementImpact: args.settlementImpact,
    leverageImpact: args.leverageImpact,
    recommendedQuestion: args.recommendedQuestion,
    recommendedAction: args.recommendedAction,
    negotiationUse: args.negotiationUse,
    evidenceToPrepare: uniqueStrings(args.evidenceToPrepare),
    termsToConsider: uniqueStrings(args.termsToConsider || []),
    risksIfIgnored: uniqueStrings(args.risksIfIgnored || []),
    linkedClaimIds: uniqueStrings(args.linkedClaimIds || []),
    linkedEvidenceIds: uniqueStrings(args.linkedEvidenceIds || []),
    authorityRegistryIds: uniqueStrings(args.authorityRegistryIds || []),
    source: args.source,
  };
}

function buildImportedFindings(
  input: SettlementInvestigationInput,
): SettlementInvestigationFinding[] {
  const imported = [
    ...(input.evidenceFindings || []).map((item) => ({
      source: "evidenceFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
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
      authorityRegistryIds: [] as string[],
    })),
    ...(input.proceduralFindings || []).map((item) => ({
      source: "proceduralFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation || item.recommendedAction,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
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
      authorityRegistryIds: item.authorityRegistryIds || [],
    })),
    ...(input.judgePerspectiveFindings || []).map((item) => ({
      source: "judgePerspectiveFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation || item.likelyJudgeQuestion,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
    ...(input.opponentStrategyFindings || []).map((item) => ({
      source: "opponentStrategyFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation:
        item.explanation ||
        item.likelyOpponentArgument ||
        item.recommendedResponse,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
  ];

  return imported.map((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${
      item.explanation || ""
    }`;
    const category = categoryFromText(text);
    const severity = severityFromText(item.severity || text);

    return createFinding({
      category,
      severity,
      confidence: "medium",
      title: item.title || "Settlement issue",
      explanation:
        item.explanation ||
        "This issue may affect settlement leverage, offer strategy, or conference readiness.",
      settlementImpact:
        "This factor may affect settlement range, leverage, risk tolerance, or whether the matter is ready for a settlement discussion.",
      leverageImpact:
        severityRank(severity) >= 4
          ? "This likely weakens settlement leverage unless answered with evidence or authority."
          : category === "settlement-strength" || category === "evidence-leverage"
            ? "This may improve settlement leverage if presented clearly."
            : "This may have a mixed effect depending on the supporting proof.",
      recommendedQuestion:
        "How does this issue affect settlement value, risk, leverage, or the terms that should be requested?",
      recommendedAction:
        "Prepare a settlement position that accounts for this issue and supports it with evidence.",
      negotiationUse:
        "Use this to decide whether to strengthen the record before negotiating, adjust the offer, or prepare an explanation for conference.",
      evidenceToPrepare: [
        "Key documents",
        "Damages calculation",
        "Timeline",
        "Proof chart",
        "Settlement history",
        "Authority if needed",
      ],
      termsToConsider: [
        "Payment amount",
        "Payment deadline",
        "Payment plan",
        "Dismissal or release terms",
        "Confidentiality if appropriate",
        "Non-monetary terms if relevant",
      ],
      risksIfIgnored: [
        "Weak settlement position",
        "Unrealistic offer",
        "Settlement conference unpreparedness",
        "Reduced leverage",
      ],
      linkedClaimIds: item.linkedClaimIds,
      linkedEvidenceIds: item.linkedEvidenceIds,
      authorityRegistryIds: item.authorityRegistryIds,
      source: item.source,
    });
  });
}

function buildSettlementHistoryFindings(
  input: SettlementInvestigationInput,
): SettlementInvestigationFinding[] {
  const findings: SettlementInvestigationFinding[] = [];

  for (const offer of input.settlementHistory || []) {
    const terms = uniqueStrings(offer.terms || []);
    const title = offer.amount
      ? `Settlement offer: $${offer.amount}`
      : "Settlement offer or proposal";

    findings.push(
      createFinding({
        category: "offer-strategy",
        severity: offer.expired || offer.rejected ? "medium" : "info",
        confidence: "medium",
        title,
        explanation:
          offer.notes ||
          `Settlement proposal recorded from ${offer.offerBy || "unknown party"}.`,
        settlementImpact:
          "Prior offers may affect negotiation posture, issue narrowing, and settlement conference strategy.",
        leverageImpact:
          offer.rejected || offer.expired
            ? "The prior offer may show negotiation history but may not resolve current risk."
            : "The offer may provide a reference point for negotiation.",
        recommendedQuestion:
          "What was offered, when, by whom, what terms were included, and why was it accepted, rejected, or left unresolved?",
        recommendedAction:
          "Summarize settlement history and identify whether a new offer should be made.",
        negotiationUse:
          "Use prior offers to evaluate movement, reasonableness, and remaining issues.",
        evidenceToPrepare: [
          "Offer letter or email",
          "Dates",
          "Terms",
          "Response",
          "Reasons for rejection or expiry",
        ],
        termsToConsider: terms,
        risksIfIgnored: [
          "Settlement history may be misunderstood",
          "Offer strategy may repeat previous problems",
        ],
        source: "settlementHistory",
      }),
    );
  }

  return findings;
}

function buildReasoningFindings(
  input: SettlementInvestigationInput,
): SettlementInvestigationFinding[] {
  const signals = [
    ...(input.litigationReasoning?.strongestCasePoints || []).map((value) => ({
      source: "litigationReasoning.strongestCasePoints",
      value,
      category: "settlement-strength" as SettlementFindingCategory,
      severity: "info" as SettlementSeverity,
    })),
    ...(input.litigationReasoning?.weakestCasePoints || []).map((value) => ({
      source: "litigationReasoning.weakestCasePoints",
      value,
      category: "settlement-weakness" as SettlementFindingCategory,
      severity: severityFromText(value),
    })),
    ...(input.litigationReasoning?.opposingArguments || []).map((value) => ({
      source: "litigationReasoning.opposingArguments",
      value,
      category: "opponent-pressure" as SettlementFindingCategory,
      severity: severityFromText(value),
    })),
    ...(input.litigationReasoning?.missingWork || []).map((value) => ({
      source: "litigationReasoning.missingWork",
      value,
      category: categoryFromText(value),
      severity: severityFromText(value),
    })),
    ...(input.warnings || []).map((value) => ({
      source: "warnings",
      value,
      category: categoryFromText(value),
      severity: severityFromText(value),
    })),
  ];

  return signals.map((signal) =>
    createFinding({
      category: signal.category,
      severity: signal.severity,
      confidence: "medium",
      title:
        signal.category === "settlement-strength"
          ? "Settlement leverage strength"
          : "Settlement leverage issue",
      explanation: signal.value,
      settlementImpact:
        signal.category === "settlement-strength"
          ? "This may support a stronger settlement position."
          : "This may weaken or complicate settlement posture unless addressed.",
      leverageImpact:
        signal.category === "settlement-strength"
          ? "Improves leverage if clearly presented."
          : "May reduce leverage if not answered.",
      recommendedQuestion:
        "How should this point affect the user's settlement position or offer strategy?",
      recommendedAction:
        "Use this point to refine the settlement position and prepare supporting evidence.",
      negotiationUse:
        "Use this to decide what to emphasize, what to fix, and where compromise may be realistic.",
      evidenceToPrepare: [
        "Supporting evidence",
        "Damages calculation",
        "Timeline",
        "Proof map",
      ],
      termsToConsider: [
        "Settlement amount",
        "Payment schedule",
        "Dismissal/release terms",
        "Non-monetary terms",
      ],
      risksIfIgnored: [
        "Poor settlement leverage",
        "Unrealistic expectations",
        "Weak conference preparation",
      ],
      source: signal.source,
    }),
  );
}

function calculateIntelligence(
  findings: SettlementInvestigationFinding[],
  input: SettlementInvestigationInput,
): SettlementInvestigatorIntelligence {
  let settlementReadinessScore = 80;
  let leverageScore = 55;
  let proofRiskScore = 0;
  let credibilityRiskScore = 0;
  let proceduralRiskScore = 0;
  let opponentPressureScore = 0;

  if (!input.claimAmount && !clean(input.desiredOutcome)) {
    settlementReadinessScore -= 10;
  }

  if ((input.settlementHistory || []).length > 0) {
    settlementReadinessScore += 5;
  }

  for (const finding of findings) {
    if (finding.severity === "critical") {
      settlementReadinessScore -= 16;
      leverageScore -= 12;
      opponentPressureScore += 16;
    } else if (finding.severity === "high") {
      settlementReadinessScore -= 10;
      leverageScore -= 8;
      opponentPressureScore += 10;
    } else if (finding.severity === "medium") {
      settlementReadinessScore -= 5;
      leverageScore -= 3;
      opponentPressureScore += 4;
    }

    if (
      finding.category === "settlement-strength" ||
      finding.category === "evidence-leverage"
    ) {
      leverageScore += 8;
      settlementReadinessScore += 4;
    }

    if (
      finding.category === "proof-risk" ||
      finding.category === "damages-or-remedy-gap"
    ) {
      proofRiskScore += 10;
    }

    if (
      finding.category === "credibility-risk" ||
      finding.category === "contradiction-risk"
    ) {
      credibilityRiskScore += 10;
    }

    if (finding.category === "procedural-risk") {
      proceduralRiskScore += 10;
    }

    if (finding.category === "opponent-pressure") {
      opponentPressureScore += 8;
    }
  }

  settlementReadinessScore = Math.max(
    0,
    Math.min(100, Math.round(settlementReadinessScore)),
  );

  leverageScore = Math.max(0, Math.min(100, Math.round(leverageScore)));

  return {
    settlementReadinessScore,
    leverageScore,
    proofRiskScore: Math.max(0, Math.min(100, Math.round(proofRiskScore))),
    credibilityRiskScore: Math.max(
      0,
      Math.min(100, Math.round(credibilityRiskScore)),
    ),
    proceduralRiskScore: Math.max(
      0,
      Math.min(100, Math.round(proceduralRiskScore)),
    ),
    opponentPressureScore: Math.max(
      0,
      Math.min(100, Math.round(opponentPressureScore)),
    ),
    confidence: confidenceFromScore(settlementReadinessScore),
    leverageLevel: leverageLevelFromScore(leverageScore),
  };
}

function findingsByCategory(
  findings: SettlementInvestigationFinding[],
  category: SettlementFindingCategory,
): SettlementInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: SettlementInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function actionsFromFindings(
  findings: SettlementInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

function collectionFromFindings(
  findings: SettlementInvestigationFinding[],
  selector: (finding: SettlementInvestigationFinding) => string[],
): string[] {
  return uniqueStrings(findings.flatMap(selector));
}

function settlementPostureFromIntelligence(
  intelligence: SettlementInvestigatorIntelligence,
): string {
  if (
    intelligence.settlementReadinessScore >= 75 &&
    intelligence.leverageScore >= 70
  ) {
    return "Strong settlement posture: user can negotiate from strength if evidence, damages, and procedural materials are organized.";
  }

  if (
    intelligence.settlementReadinessScore >= 55 &&
    intelligence.leverageScore >= 45
  ) {
    return "Mixed settlement posture: user should negotiate carefully and fix key proof, credibility, or procedural gaps first.";
  }

  if (intelligence.settlementReadinessScore < 40) {
    return "Weak settlement readiness: user should strengthen evidence, damages, procedure, and risk explanations before serious negotiation.";
  }

  return "Cautious settlement posture: user should prepare a realistic offer strategy and address the strongest opponent pressure points.";
}

export function buildSettlementInvestigation(
  input: SettlementInvestigationInput,
): SettlementInvestigationResult {
  const findings = [
    ...buildImportedFindings(input),
    ...buildSettlementHistoryFindings(input),
    ...buildReasoningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings, input);
  const suggestedSettlementPosture =
    settlementPostureFromIntelligence(intelligence);

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

    settlementStrengths: findingsByCategory(
      findings,
      "settlement-strength",
    ).map((finding) => finding.explanation),
    settlementWeaknesses: findingsByCategory(
      findings,
      "settlement-weakness",
    ).map((finding) => finding.explanation),
    leveragePoints: uniqueStrings(
      findings
        .filter((finding) =>
          ["settlement-strength", "evidence-leverage"].includes(
            finding.category,
          ),
        )
        .map((finding) => finding.explanation),
    ),
    pressurePoints: uniqueStrings(
      findings
        .filter((finding) => severityRank(finding.severity) >= 3)
        .map((finding) => finding.explanation),
    ),
    offerPreparationQuestions: questionsFromFindings(
      findings.filter((finding) =>
        ["offer-strategy", "opponent-pressure", "costs-risk"].includes(
          finding.category,
        ),
      ),
    ),
    conferenceReadinessQuestions: questionsFromFindings(
      findingsByCategory(findings, "conference-readiness"),
    ),
    damagesQuestions: questionsFromFindings(
      findingsByCategory(findings, "damages-or-remedy-gap"),
    ),
    nonMonetaryTermsToConsider: collectionFromFindings(
      findings,
      (finding) => finding.termsToConsider,
    ),

    evidenceToPrepare: collectionFromFindings(
      findings,
      (finding) => finding.evidenceToPrepare,
    ),
    suggestedSettlementPosture,
    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      "Prepare a damages/remedy position before making or responding to an offer.",
      "Use strongest evidence and weakest risk points to decide settlement range and conference strategy.",
      "Do not enter settlement conference without a clear proof map, damages calculation, and response to likely opponent attacks.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Settlement Investigator assessed settlement readiness as ${intelligence.confidence} (${intelligence.settlementReadinessScore}/100), leverage as ${intelligence.leverageLevel}, and found ${findings.length} settlement factor(s).`
        : `Settlement Investigator assessed settlement readiness as ${intelligence.confidence} (${intelligence.settlementReadinessScore}/100), leverage as ${intelligence.leverageLevel}, and found no major settlement issues.`,
  };
}