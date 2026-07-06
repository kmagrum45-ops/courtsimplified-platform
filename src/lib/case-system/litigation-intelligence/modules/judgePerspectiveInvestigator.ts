export type JudgePerspectiveInvestigatorVersion = "2.0.0";

export type JudgePerspectiveSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type JudgePerspectiveConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type JudgeConcernCategory =
  | "proof-gap"
  | "credibility"
  | "procedure"
  | "authority"
  | "contradiction"
  | "evidence-foundation"
  | "burden-of-proof"
  | "damages-or-remedy"
  | "jurisdiction"
  | "proportionality"
  | "fairness"
  | "settlement"
  | "trial-readiness"
  | "unknown";

export type JudgePerspectiveInput = {
  caseId?: string;
  courtPath?: string;
  province?: string;
  stage?: string;
  rawNarrative?: string;

  narrativeFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
  }>;

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
    linkedEvidenceIds?: string[];
    linkedClaimIds?: string[];
  }>;

  contradictionFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
    linkedEvidenceIds?: string[];
    linkedClaimIds?: string[];
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

  warnings?: string[];
};

export type JudgePerspectiveFinding = {
  id: string;
  category: JudgeConcernCategory;
  severity: JudgePerspectiveSeverity;
  confidence: JudgePerspectiveConfidence;
  title: string;
  explanation: string;
  likelyJudgeQuestion: string;
  whyTheJudgeCares: string;
  riskIfUnanswered: string;
  bestAnswerShouldInclude: string[];
  recommendedAction: string;
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  applicableRuleCodes: string[];
  authorityRegistryIds: string[];
  source: string;
};

export type JudgePerspectiveIntelligence = {
  judgeConcernScore: number;
  courtReadinessScore: number;
  proofExpectationScore: number;
  credibilityConcernScore: number;
  proceduralConcernScore: number;
  authorityConcernScore: number;
  confidence: JudgePerspectiveConfidence;
};

export type JudgePerspectiveResult = {
  version: JudgePerspectiveInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: JudgePerspectiveIntelligence;
  findings: JudgePerspectiveFinding[];

  likelyJudgeQuestions: string[];
  proofQuestions: string[];
  credibilityQuestions: string[];
  proceduralQuestions: string[];
  authorityQuestions: string[];
  remedyQuestions: string[];

  courtReadinessProblems: string[];
  strongestJudgeFriendlyPoints: string[];
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

function severityRank(value: JudgePerspectiveSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): JudgePerspectiveConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function severityFromText(value: unknown): JudgePerspectiveSeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "blocked", "unsafe", "contradicted"])) {
    return "critical";
  }

  if (includesAny(text, ["high", "missing", "no proof", "wrong", "deadline"])) {
    return "high";
  }

  if (includesAny(text, ["concern", "weak", "unclear", "review", "gap"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): JudgeConcernCategory {
  const text = normalize(value);

  if (includesAny(text, ["proof", "missing element", "burden", "onus"])) {
    return "burden-of-proof";
  }

  if (includesAny(text, ["credibility", "believe", "reliable"])) {
    return "credibility";
  }

  if (includesAny(text, ["serve", "file", "deadline", "procedure", "motion"])) {
    return "procedure";
  }

  if (includesAny(text, ["authority", "rule", "statute", "case law"])) {
    return "authority";
  }

  if (includesAny(text, ["contradiction", "inconsistent", "conflict"])) {
    return "contradiction";
  }

  if (includesAny(text, ["evidence", "screenshot", "authentic", "foundation"])) {
    return "evidence-foundation";
  }

  if (includesAny(text, ["damage", "amount", "remedy", "order", "relief"])) {
    return "damages-or-remedy";
  }

  if (includesAny(text, ["jurisdiction", "wrong court", "forum"])) {
    return "jurisdiction";
  }

  if (includesAny(text, ["fair", "notice", "prejudice"])) {
    return "fairness";
  }

  if (includesAny(text, ["settlement", "offer", "resolve"])) {
    return "settlement";
  }

  if (includesAny(text, ["trial", "witness", "exhibit"])) {
    return "trial-readiness";
  }

  return "proof-gap";
}

function judgeQuestionForCategory(category: JudgeConcernCategory, text: string): string {
  if (category === "burden-of-proof") {
    return "What exactly must be proven here, who has the burden, and what evidence satisfies that burden?";
  }

  if (category === "credibility") {
    return "Why should the court believe this version of events?";
  }

  if (category === "procedure") {
    return "Was the correct procedural step completed properly and on time?";
  }

  if (category === "authority") {
    return "What verified rule, statute, case law, or authority supports this position?";
  }

  if (category === "contradiction") {
    return "How is this contradiction explained, and which version should the court accept?";
  }

  if (category === "evidence-foundation") {
    return "Who created this evidence, when was it created, and how do I know it is reliable?";
  }

  if (category === "damages-or-remedy") {
    return "What order is being requested, and what evidence supports that remedy or amount?";
  }

  if (category === "jurisdiction") {
    return "Why is this the correct court, tribunal, or procedural path?";
  }

  if (category === "fairness") {
    return "Has the other side had proper notice and a fair chance to respond?";
  }

  if (category === "settlement") {
    return "Have the issues been narrowed, and is there a realistic settlement position?";
  }

  if (category === "trial-readiness") {
    return "Are the witnesses, exhibits, issues, authorities, and deadlines ready for trial?";
  }

  return `What facts and evidence support this point: ${text}?`;
}

function createFinding(args: {
  category: JudgeConcernCategory;
  severity: JudgePerspectiveSeverity;
  confidence: JudgePerspectiveConfidence;
  title: string;
  explanation: string;
  likelyJudgeQuestion: string;
  whyTheJudgeCares: string;
  riskIfUnanswered: string;
  bestAnswerShouldInclude: string[];
  recommendedAction: string;
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  applicableRuleCodes?: string[];
  authorityRegistryIds?: string[];
  source: string;
}): JudgePerspectiveFinding {
  return {
    id: createId("judge_perspective"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    likelyJudgeQuestion: args.likelyJudgeQuestion,
    whyTheJudgeCares: args.whyTheJudgeCares,
    riskIfUnanswered: args.riskIfUnanswered,
    bestAnswerShouldInclude: uniqueStrings(args.bestAnswerShouldInclude),
    recommendedAction: args.recommendedAction,
    linkedClaimIds: uniqueStrings(args.linkedClaimIds || []),
    linkedEvidenceIds: uniqueStrings(args.linkedEvidenceIds || []),
    applicableRuleCodes: uniqueStrings(args.applicableRuleCodes || []),
    authorityRegistryIds: uniqueStrings(args.authorityRegistryIds || []),
    source: args.source,
  };
}

function importedFindingText(item: {
  title?: string;
  category?: string;
  explanation?: string;
}): string {
  return `${item.title || ""} ${item.category || ""} ${item.explanation || ""}`;
}

function buildFromImportedFindings(input: JudgePerspectiveInput): JudgePerspectiveFinding[] {
  const imported = [
    ...(input.narrativeFindings || []).map((item) => ({
      source: "narrativeFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
      applicableRuleCodes: [] as string[],
      authorityRegistryIds: [] as string[],
    })),
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
  ];

  return imported.map((item) => {
    const text = importedFindingText(item);
    const category = categoryFromText(text);

    return createFinding({
      category,
      severity: severityFromText(item.severity || text),
      confidence: "medium",
      title: item.title || "Judge perspective issue",
      explanation:
        item.explanation ||
        "This issue may matter to how a judge evaluates the case.",
      likelyJudgeQuestion: judgeQuestionForCategory(category, text),
      whyTheJudgeCares:
        "Judges usually focus on proof, fairness, procedure, credibility, authority, and whether the requested order is legally supported.",
      riskIfUnanswered:
        "If this is not answered clearly, the court may reject the point, require more evidence, adjourn the step, or give it less weight.",
      bestAnswerShouldInclude: [
        "Specific facts",
        "Reliable evidence",
        "Dates",
        "Procedural status",
        "Authority if needed",
        "Clear explanation",
      ],
      recommendedAction:
        "Prepare a direct court-facing answer supported by facts, evidence, procedure, and authority where needed.",
      linkedClaimIds: item.linkedClaimIds,
      linkedEvidenceIds: item.linkedEvidenceIds,
      applicableRuleCodes: item.applicableRuleCodes,
      authorityRegistryIds: item.authorityRegistryIds,
      source: item.source,
    });
  });
}

function buildLitigationReasoningFindings(
  input: JudgePerspectiveInput,
): JudgePerspectiveFinding[] {
  const concerns = [
    ...(input.litigationReasoning?.judicialConcerns || []).map((value) => ({
      source: "litigationReasoning.judicialConcerns",
      value,
    })),
    ...(input.litigationReasoning?.weakestCasePoints || []).map((value) => ({
      source: "litigationReasoning.weakestCasePoints",
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

  return concerns.map((item) => {
    const category = categoryFromText(item.value);

    return createFinding({
      category,
      severity: severityFromText(item.value),
      confidence: "medium",
      title: "Likely judicial concern",
      explanation: item.value,
      likelyJudgeQuestion: judgeQuestionForCategory(category, item.value),
      whyTheJudgeCares:
        "This issue may affect whether the court can rely on the user's position or allow the matter to move forward.",
      riskIfUnanswered:
        "The judge may find the point unsupported, procedurally defective, unclear, unfair, or not ready.",
      bestAnswerShouldInclude: [
        "Direct answer",
        "Proof",
        "Timeline",
        "Rule or authority if relevant",
        "Explanation for any gap",
      ],
      recommendedAction:
        "Prepare a judge-ready answer before using this point in final materials.",
      source: item.source,
    });
  });
}

function calculateIntelligence(
  findings: JudgePerspectiveFinding[],
  input: JudgePerspectiveInput,
): JudgePerspectiveIntelligence {
  let judgeConcernScore = 0;
  let courtReadinessScore = 85;
  let proofExpectationScore = 80;
  let credibilityConcernScore = 0;
  let proceduralConcernScore = 0;
  let authorityConcernScore = 0;

  for (const finding of findings) {
    if (finding.severity === "critical") {
      judgeConcernScore += 20;
      courtReadinessScore -= 18;
    } else if (finding.severity === "high") {
      judgeConcernScore += 12;
      courtReadinessScore -= 10;
    } else if (finding.severity === "medium") {
      judgeConcernScore += 6;
      courtReadinessScore -= 5;
    } else if (finding.severity === "low") {
      judgeConcernScore += 2;
      courtReadinessScore -= 1;
    }

    if (finding.category === "credibility") credibilityConcernScore += 12;
    if (finding.category === "contradiction") credibilityConcernScore += 14;
    if (finding.category === "procedure") proceduralConcernScore += 12;
    if (finding.category === "authority") authorityConcernScore += 12;
    if (finding.category === "burden-of-proof") proofExpectationScore -= 8;
    if (finding.category === "evidence-foundation") proofExpectationScore -= 6;
  }

  if ((input.litigationReasoning?.strongestCasePoints || []).length > 0) {
    courtReadinessScore += 5;
    proofExpectationScore += 5;
  }

  return {
    judgeConcernScore: Math.max(0, Math.min(100, Math.round(judgeConcernScore))),
    courtReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(courtReadinessScore)),
    ),
    proofExpectationScore: Math.max(
      0,
      Math.min(100, Math.round(proofExpectationScore)),
    ),
    credibilityConcernScore: Math.max(
      0,
      Math.min(100, Math.round(credibilityConcernScore)),
    ),
    proceduralConcernScore: Math.max(
      0,
      Math.min(100, Math.round(proceduralConcernScore)),
    ),
    authorityConcernScore: Math.max(
      0,
      Math.min(100, Math.round(authorityConcernScore)),
    ),
    confidence: confidenceFromScore(courtReadinessScore),
  };
}

function findingsByCategory(
  findings: JudgePerspectiveFinding[],
  category: JudgeConcernCategory,
): JudgePerspectiveFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(findings: JudgePerspectiveFinding[]): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.likelyJudgeQuestion),
  );
}

function actionsFromFindings(findings: JudgePerspectiveFinding[]): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

export function buildJudgePerspectiveInvestigation(
  input: JudgePerspectiveInput,
): JudgePerspectiveResult {
  const findings = [
    ...buildFromImportedFindings(input),
    ...buildLitigationReasoningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings, input);

  const likelyJudgeQuestions = questionsFromFindings(findings).slice(0, 16);

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

    likelyJudgeQuestions,
    proofQuestions: questionsFromFindings(
      findings.filter((finding) =>
        ["proof-gap", "burden-of-proof", "evidence-foundation"].includes(
          finding.category,
        ),
      ),
    ),
    credibilityQuestions: questionsFromFindings(
      findings.filter((finding) =>
        ["credibility", "contradiction"].includes(finding.category),
      ),
    ),
    proceduralQuestions: questionsFromFindings(
      findingsByCategory(findings, "procedure"),
    ),
    authorityQuestions: questionsFromFindings(
      findingsByCategory(findings, "authority"),
    ),
    remedyQuestions: questionsFromFindings(
      findingsByCategory(findings, "damages-or-remedy"),
    ),

    courtReadinessProblems: uniqueStrings(
      findings
        .filter((finding) => severityRank(finding.severity) >= 3)
        .map((finding) => finding.explanation),
    ),
    strongestJudgeFriendlyPoints: uniqueStrings(
      input.litigationReasoning?.strongestCasePoints || [],
    ),

    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      ...(input.workflowReadiness?.nextActions || []),
      "Prepare direct answers to the judge's likely questions before generating final court materials.",
      "Do not treat a point as judge-ready unless it is supported by facts, evidence, procedure, and authority where needed.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Judge Perspective Investigator found ${findings.length} likely court concern(s), with court readiness ${intelligence.confidence} (${intelligence.courtReadinessScore}/100).`
        : `Judge Perspective Investigator found no major judge-facing concerns, with court readiness ${intelligence.confidence} (${intelligence.courtReadinessScore}/100).`,
  };
}