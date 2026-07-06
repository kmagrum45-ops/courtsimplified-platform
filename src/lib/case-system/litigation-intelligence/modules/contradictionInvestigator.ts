export type ContradictionInvestigatorVersion = "2.0.0";

export type ContradictionSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ContradictionConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type ContradictionRiskLevel =
  | "minimal"
  | "manageable"
  | "elevated"
  | "serious"
  | "critical";

export type ContradictionCategory =
  | "direct-conflict"
  | "timeline-conflict"
  | "amount-conflict"
  | "party-conflict"
  | "evidence-conflict"
  | "pleading-conflict"
  | "statement-conflict"
  | "missing-explanation"
  | "changed-version"
  | "credibility-impact"
  | "resolved-or-explainable"
  | "unknown";

export type ContradictionSignal = {
  id?: string;
  category?: string;
  severity?: string;
  explanation?: string;
  litigationRisk?: string;
  sourceA?: string;
  sourceB?: string;
  linkedEvidenceIds?: string[];
  linkedClaimIds?: string[];
};

export type ImportedContradictionFindingSignal = {
  source: string;
  title?: string;
  category?: string;
  severity?: string;
  explanation?: string;
  linkedEvidenceIds?: string[];
  linkedClaimIds?: string[];
};

export type ContradictionInvestigationInput = {
  caseId?: string;
  rawNarrative?: string;

  contradictionAnalysis?: {
    totalFindings?: number;
    criticalFindings?: number;
    highFindings?: number;
    moderateFindings?: number;
    lowFindings?: number;
    overallRisk?: string;
    warnings?: string[];
    summary?: string;
    findings?: ContradictionSignal[];
  };

  evidenceContradictions?: string[];
  narrativeContradictions?: string[];
  credibilityWarnings?: string[];
  proceduralWarnings?: string[];
  burdenWarnings?: string[];
  litigationReasoningWarnings?: string[];

  evidenceFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedEvidenceIds?: string[];
    linkedClaimIds?: string[];
  }>;

  credibilityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedEvidenceIds?: string[];
    linkedClaimIds?: string[];
  }>;

  burdenFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedEvidenceIds?: string[];
    linkedClaimIds?: string[];
  }>;
};

export type ContradictionInvestigationFinding = {
  id: string;
  category: ContradictionCategory;
  severity: ContradictionSeverity;
  confidence: ContradictionConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  litigationImpact: string;
  credibilityImpact: string;
  recommendedQuestion: string;
  recommendedAction: string;
  whatToCompare: string[];
  whatWouldResolveIt: string[];
  linkedEvidenceIds: string[];
  linkedClaimIds: string[];
  source: string;
};

export type ContradictionInvestigatorIntelligence = {
  contradictionScore: number;
  consistencyScore: number;
  explanationReadinessScore: number;
  litigationRiskScore: number;
  credibilityRiskScore: number;
  overallRiskLevel: ContradictionRiskLevel;
  confidence: ContradictionConfidence;
};

export type ContradictionInvestigationResult = {
  version: ContradictionInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: ContradictionInvestigatorIntelligence;
  findings: ContradictionInvestigationFinding[];

  directContradictions: string[];
  timelineContradictions: string[];
  evidenceContradictions: string[];
  amountContradictions: string[];
  statementContradictions: string[];
  unresolvedContradictions: string[];
  explainableContradictions: string[];

  comparisonRequests: string[];
  resolutionRequests: string[];
  judgeQuestions: string[];
  opponentAttackPoints: string[];

  topQuestions: string[];
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

function severityRank(value: ContradictionSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): ContradictionConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function riskLevelFromScore(score: number): ContradictionRiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "serious";
  if (score >= 40) return "elevated";
  if (score >= 20) return "manageable";
  return "minimal";
}

function severityFromText(value: unknown): ContradictionSeverity {
  const text = normalize(value);

  if (
    includesAny(text, [
      "critical",
      "direct conflict",
      "contradicted",
      "false",
      "impossible",
    ])
  ) {
    return "critical";
  }

  if (
    includesAny(text, [
      "high",
      "inconsistent",
      "conflict",
      "changed story",
      "different version",
      "unresolved",
    ])
  ) {
    return "high";
  }

  if (includesAny(text, ["concern", "weak", "unclear", "review", "gap"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low", "explainable"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): ContradictionCategory {
  const text = normalize(value);

  if (includesAny(text, ["timeline", "date", "sequence", "before", "after"])) {
    return "timeline-conflict";
  }

  if (includesAny(text, ["amount", "money", "payment", "paid", "owed", "$"])) {
    return "amount-conflict";
  }

  if (includesAny(text, ["who", "party", "person", "defendant", "plaintiff"])) {
    return "party-conflict";
  }

  if (
    includesAny(text, [
      "evidence",
      "document",
      "record",
      "screenshot",
      "email",
      "text",
    ])
  ) {
    return "evidence-conflict";
  }

  if (
    includesAny(text, [
      "pleading",
      "claim",
      "defence",
      "application",
      "answer",
    ])
  ) {
    return "pleading-conflict";
  }

  if (
    includesAny(text, [
      "said",
      "statement",
      "message",
      "told",
      "admitted",
      "denied",
    ])
  ) {
    return "statement-conflict";
  }

  if (includesAny(text, ["changed story", "different version", "new version"])) {
    return "changed-version";
  }

  if (includesAny(text, ["explain", "context", "unclear why"])) {
    return "missing-explanation";
  }

  if (
    includesAny(text, ["resolved", "explainable", "not actually inconsistent"])
  ) {
    return "resolved-or-explainable";
  }

  if (includesAny(text, ["credibility"])) {
    return "credibility-impact";
  }

  if (includesAny(text, ["contradiction", "conflict", "inconsistent"])) {
    return "direct-conflict";
  }

  return "unknown";
}

function createFinding(args: {
  category: ContradictionCategory;
  severity: ContradictionSeverity;
  confidence: ContradictionConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  litigationImpact: string;
  credibilityImpact: string;
  recommendedQuestion: string;
  recommendedAction: string;
  whatToCompare: string[];
  whatWouldResolveIt: string[];
  linkedEvidenceIds?: string[];
  linkedClaimIds?: string[];
  source: string;
}): ContradictionInvestigationFinding {
  return {
    id: createId("contradiction_investigation"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    litigationImpact: args.litigationImpact,
    credibilityImpact: args.credibilityImpact,
    recommendedQuestion: args.recommendedQuestion,
    recommendedAction: args.recommendedAction,
    whatToCompare: uniqueStrings(args.whatToCompare),
    whatWouldResolveIt: uniqueStrings(args.whatWouldResolveIt),
    linkedEvidenceIds: args.linkedEvidenceIds || [],
    linkedClaimIds: args.linkedClaimIds || [],
    source: args.source,
  };
}

function buildContradictionAnalysisFindings(
  input: ContradictionInvestigationInput,
): ContradictionInvestigationFinding[] {
  const findings: ContradictionInvestigationFinding[] = [];

  for (const signal of input.contradictionAnalysis?.findings || []) {
    const text = `${signal.category || ""} ${signal.explanation || ""} ${
      signal.litigationRisk || ""
    }`;

    findings.push(
      createFinding({
        category: categoryFromText(text),
        severity: severityFromText(signal.severity || text),
        confidence: "medium",
        title: signal.category
          ? `Contradiction: ${signal.category}`
          : "Contradiction signal",
        explanation:
          signal.explanation ||
          signal.litigationRisk ||
          "A contradiction signal was detected.",
        whyItMatters:
          "Contradictions can affect credibility, proof strength, settlement posture, and whether the court accepts the user's version.",
        litigationImpact:
          signal.litigationRisk ||
          "This contradiction may need to be resolved before final court materials are generated.",
        credibilityImpact:
          "A judge or opposing party may use this contradiction to question reliability.",
        recommendedQuestion:
          "Which version is accurate, and what evidence explains or resolves the contradiction?",
        recommendedAction:
          "Create a side-by-side contradiction review and identify the most reliable source.",
        whatToCompare: [
          signal.sourceA || "First version/source",
          signal.sourceB || "Second version/source",
          "Dates",
          "Documents",
          "Messages",
          "Witness accounts",
        ],
        whatWouldResolveIt: [
          "Original records",
          "Timeline explanation",
          "Context",
          "Witness confirmation",
          "Admission or clarification",
        ],
        linkedEvidenceIds: signal.linkedEvidenceIds || [],
        linkedClaimIds: signal.linkedClaimIds || [],
        source: "contradictionAnalysis.findings",
      }),
    );
  }

  for (const warning of input.contradictionAnalysis?.warnings || []) {
    findings.push(
      createFinding({
        category: categoryFromText(warning),
        severity: severityFromText(warning),
        confidence: "medium",
        title: "Contradiction warning",
        explanation: warning,
        whyItMatters:
          "Contradiction warnings identify parts of the record that may need explanation before relying on them.",
        litigationImpact:
          "Unresolved contradictions can weaken claims, defences, motions, settlement posture, and trial readiness.",
        credibilityImpact: "Unresolved contradictions may damage credibility.",
        recommendedQuestion:
          "What explains this contradiction, and which record should the court rely on?",
        recommendedAction:
          "Resolve, explain, or isolate the contradiction before using this point in court materials.",
        whatToCompare: [
          "Version A",
          "Version B",
          "Dates",
          "Source documents",
          "Witness accounts",
        ],
        whatWouldResolveIt: [
          "Reliable original record",
          "Chronology",
          "Explanation for inconsistency",
          "Supporting document",
        ],
        source: "contradictionAnalysis.warnings",
      }),
    );
  }

  return findings;
}

function buildStringSignalFindings(
  input: ContradictionInvestigationInput,
): ContradictionInvestigationFinding[] {
  const sources: Array<{ source: string; values: string[] }> = [
    {
      source: "evidenceContradictions",
      values: input.evidenceContradictions || [],
    },
    {
      source: "narrativeContradictions",
      values: input.narrativeContradictions || [],
    },
    {
      source: "credibilityWarnings",
      values: input.credibilityWarnings || [],
    },
    {
      source: "proceduralWarnings",
      values: input.proceduralWarnings || [],
    },
    {
      source: "burdenWarnings",
      values: input.burdenWarnings || [],
    },
    {
      source: "litigationReasoningWarnings",
      values: input.litigationReasoningWarnings || [],
    },
  ];

  return sources.flatMap((sourceGroup) =>
    sourceGroup.values.map((value) =>
      createFinding({
        category: categoryFromText(value),
        severity: severityFromText(value),
        confidence: "medium",
        title: "Contradiction-related signal",
        explanation: value,
        whyItMatters:
          "This signal may indicate an inconsistency or a point that needs explanation.",
        litigationImpact:
          "If unresolved, this may create risk in pleadings, evidence, settlement, or trial.",
        credibilityImpact:
          "The opposing party may use this to question reliability.",
        recommendedQuestion:
          "Is this actually a contradiction, and what evidence or context explains it?",
        recommendedAction:
          "Review the competing versions and document the explanation.",
        whatToCompare: [
          "Narrative",
          "Evidence",
          "Timeline",
          "Pleadings",
          "Messages",
          "Witness statements",
        ],
        whatWouldResolveIt: [
          "Exact wording",
          "Original document",
          "Dates",
          "Context",
          "Reliable explanation",
        ],
        source: sourceGroup.source,
      }),
    ),
  );
}

function normalizeImportedSignals(
  input: ContradictionInvestigationInput,
): ImportedContradictionFindingSignal[] {
  return [
    ...(input.evidenceFindings || []).map((item) => ({
      source: "evidenceFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      linkedClaimIds: item.linkedClaimIds || [],
    })),
    ...(input.credibilityFindings || []).map((item) => ({
      source: "credibilityFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      linkedClaimIds: item.linkedClaimIds || [],
    })),
    ...(input.burdenFindings || []).map((item) => ({
      source: "burdenFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      linkedClaimIds: item.linkedClaimIds || [],
    })),
  ];
}

function buildImportedInvestigatorFindings(
  input: ContradictionInvestigationInput,
): ContradictionInvestigationFinding[] {
  const imported = normalizeImportedSignals(input);

  return imported
    .filter((item) =>
      includesAny(
        `${item.title || ""} ${item.category || ""} ${item.explanation || ""}`,
        [
          "contradiction",
          "inconsistent",
          "conflict",
          "changed story",
          "different version",
          "denied",
          "admitted",
        ],
      ),
    )
    .map((item) => {
      const text = `${item.title || ""} ${item.category || ""} ${
        item.explanation || ""
      }`;

      return createFinding({
        category: categoryFromText(text),
        severity: severityFromText(item.severity || text),
        confidence: "medium",
        title: item.title || "Imported contradiction signal",
        explanation:
          item.explanation ||
          "An imported investigator finding may reflect a contradiction.",
        whyItMatters:
          "Cross-module contradictions should be resolved before final reasoning relies on the point.",
        litigationImpact:
          "This may affect burden proof, evidence strength, credibility, or procedure.",
        credibilityImpact:
          "The court may treat unresolved contradictions as reliability problems.",
        recommendedQuestion:
          "How does this imported finding compare with the rest of the record?",
        recommendedAction:
          "Compare this signal against narrative, evidence, timeline, and proof records.",
        whatToCompare: [
          "Imported finding",
          "Narrative",
          "Evidence",
          "Timeline",
          "Burden proof",
        ],
        whatWouldResolveIt: [
          "Source document",
          "Chronology",
          "Clarification",
          "Supporting evidence",
        ],
        linkedEvidenceIds: item.linkedEvidenceIds,
        linkedClaimIds: item.linkedClaimIds,
        source: item.source,
      });
    });
}

function calculateIntelligence(
  findings: ContradictionInvestigationFinding[],
  input: ContradictionInvestigationInput,
): ContradictionInvestigatorIntelligence {
  let contradictionScore = 0;
  let consistencyScore = 85;
  let explanationReadinessScore = 80;
  let litigationRiskScore = 0;
  let credibilityRiskScore = 0;

  for (const finding of findings) {
    if (finding.severity === "critical") {
      contradictionScore += 22;
      consistencyScore -= 18;
      explanationReadinessScore -= 16;
      litigationRiskScore += 20;
      credibilityRiskScore += 20;
    } else if (finding.severity === "high") {
      contradictionScore += 14;
      consistencyScore -= 12;
      explanationReadinessScore -= 10;
      litigationRiskScore += 14;
      credibilityRiskScore += 14;
    } else if (finding.severity === "medium") {
      contradictionScore += 7;
      consistencyScore -= 5;
      explanationReadinessScore -= 5;
      litigationRiskScore += 7;
      credibilityRiskScore += 7;
    } else if (finding.severity === "low") {
      contradictionScore += 2;
      consistencyScore -= 1;
      explanationReadinessScore -= 1;
      litigationRiskScore += 2;
      credibilityRiskScore += 2;
    }

    if (finding.category === "resolved-or-explainable") {
      explanationReadinessScore += 10;
      litigationRiskScore -= 5;
      credibilityRiskScore -= 5;
    }
  }

  contradictionScore += (input.contradictionAnalysis?.criticalFindings || 0) * 12;
  contradictionScore += (input.contradictionAnalysis?.highFindings || 0) * 8;

  const normalizedContradictionScore = Math.max(
    0,
    Math.min(100, Math.round(contradictionScore)),
  );

  return {
    contradictionScore: normalizedContradictionScore,
    consistencyScore: Math.max(0, Math.min(100, Math.round(consistencyScore))),
    explanationReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(explanationReadinessScore)),
    ),
    litigationRiskScore: Math.max(
      0,
      Math.min(100, Math.round(litigationRiskScore)),
    ),
    credibilityRiskScore: Math.max(
      0,
      Math.min(100, Math.round(credibilityRiskScore)),
    ),
    overallRiskLevel: riskLevelFromScore(normalizedContradictionScore),
    confidence: confidenceFromScore(
      Math.max(0, 100 - normalizedContradictionScore),
    ),
  };
}

function findingsByCategory(
  findings: ContradictionInvestigationFinding[],
  category: ContradictionCategory,
): ContradictionInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: ContradictionInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function actionsFromFindings(
  findings: ContradictionInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

function collectionFromFindings(
  findings: ContradictionInvestigationFinding[],
  selector: (finding: ContradictionInvestigationFinding) => string[],
): string[] {
  return uniqueStrings(findings.flatMap(selector));
}

export function buildContradictionInvestigation(
  input: ContradictionInvestigationInput,
): ContradictionInvestigationResult {
  const findings = [
    ...buildContradictionAnalysisFindings(input),
    ...buildStringSignalFindings(input),
    ...buildImportedInvestigatorFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings, input);

  const topQuestions = questionsFromFindings(findings).slice(0, 14);

  const unresolvedContradictions = findings
    .filter((finding) => finding.category !== "resolved-or-explainable")
    .map((finding) => finding.title);

  const warnings = uniqueStrings([
    ...(input.contradictionAnalysis?.warnings || []),
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

    directContradictions: findingsByCategory(findings, "direct-conflict").map(
      (finding) => finding.explanation,
    ),
    timelineContradictions: findingsByCategory(
      findings,
      "timeline-conflict",
    ).map((finding) => finding.explanation),
    evidenceContradictions: findingsByCategory(
      findings,
      "evidence-conflict",
    ).map((finding) => finding.explanation),
    amountContradictions: findingsByCategory(findings, "amount-conflict").map(
      (finding) => finding.explanation,
    ),
    statementContradictions: findingsByCategory(
      findings,
      "statement-conflict",
    ).map((finding) => finding.explanation),
    unresolvedContradictions: uniqueStrings(unresolvedContradictions),
    explainableContradictions: findingsByCategory(
      findings,
      "resolved-or-explainable",
    ).map((finding) => finding.explanation),

    comparisonRequests: collectionFromFindings(
      findings,
      (finding) => finding.whatToCompare,
    ),
    resolutionRequests: collectionFromFindings(
      findings,
      (finding) => finding.whatWouldResolveIt,
    ),
    judgeQuestions: uniqueStrings(
      findings.map(
        (finding) =>
          `Why should the court accept this version despite: ${finding.title}?`,
      ),
    ),
    opponentAttackPoints: uniqueStrings(
      findings.map((finding) => finding.litigationImpact),
    ),

    topQuestions,
    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      "Create a contradiction chart before relying on disputed facts in final court materials.",
      "Separate true contradictions from explainable context differences.",
      "Do not let unresolved contradictions drive claim theory, proof mapping, or litigation strategy.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Contradiction Investigator assessed contradiction risk as ${intelligence.overallRiskLevel} with contradiction score ${intelligence.contradictionScore}/100 and found ${findings.length} contradiction signal(s).`
        : `Contradiction Investigator assessed contradiction risk as ${intelligence.overallRiskLevel} with contradiction score ${intelligence.contradictionScore}/100 and found no major contradiction signals.`,
  };
}