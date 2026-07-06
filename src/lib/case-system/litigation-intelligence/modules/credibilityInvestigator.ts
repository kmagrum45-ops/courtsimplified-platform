export type CredibilityInvestigatorVersion = "2.0.0";

export type CredibilitySeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CredibilityConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type CredibilityRiskLevel =
  | "minimal"
  | "manageable"
  | "elevated"
  | "serious"
  | "critical";

export type CredibilityFindingCategory =
  | "internal-consistency"
  | "external-consistency"
  | "corroboration"
  | "missing-corroboration"
  | "contradiction-risk"
  | "changed-story"
  | "overstatement"
  | "missing-context"
  | "document-support"
  | "witness-support"
  | "delay-or-timing"
  | "admission"
  | "judicial-concern"
  | "opponent-attack"
  | "credibility-strength"
  | "unknown";

export type CredibilityInvestigationInput = {
  caseId?: string;
  rawNarrative?: string;

  narrativeFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    sourceText?: string;
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
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  proceduralFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedQuestion?: string;
  }>;

  litigationReasoning?: {
    weakestCasePoints?: string[];
    strongestCasePoints?: string[];
    judicialConcerns?: string[];
    opposingArguments?: string[];
    missingWork?: string[];
    warnings?: string[];
  };

  credibilityAnalysis?: {
    overallScore?: number;
    overallLevel?: string;
    warnings?: string[];
    nextActions?: string[];
    summary?: string;
  };

  contradictionWarnings?: string[];
  evidenceWarnings?: string[];
  proceduralWarnings?: string[];
  burdenWarnings?: string[];
};

export type CredibilityInvestigationFinding = {
  id: string;
  category: CredibilityFindingCategory;
  severity: CredibilitySeverity;
  confidence: CredibilityConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  judicialImpact: string;
  opponentAttack: string;
  recommendedQuestion: string;
  recommendedAction: string;
  whatWouldStrengthenIt: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  source: string;
};

export type CredibilityInvestigatorIntelligence = {
  credibilityScore: number;
  reliabilityScore: number;
  corroborationScore: number;
  consistencyScore: number;
  judicialConcernScore: number;
  overallRiskLevel: CredibilityRiskLevel;
  confidence: CredibilityConfidence;
};

export type CredibilityInvestigationResult = {
  version: CredibilityInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: CredibilityInvestigatorIntelligence;
  findings: CredibilityInvestigationFinding[];

  credibilityStrengths: string[];
  credibilityRisks: string[];
  judicialCredibilityConcerns: string[];
  opponentCredibilityAttacks: string[];
  corroborationRequests: string[];
  consistencyQuestions: string[];
  missingContextQuestions: string[];
  admissionReviewQuestions: string[];

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

function severityRank(value: CredibilitySeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): CredibilityConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function riskLevelFromScore(score: number): CredibilityRiskLevel {
  if (score >= 85) return "minimal";
  if (score >= 70) return "manageable";
  if (score >= 45) return "elevated";
  if (score >= 25) return "serious";
  return "critical";
}

function severityFromText(value: unknown): CredibilitySeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "contradicted", "impossible", "false"])) {
    return "critical";
  }

  if (
    includesAny(text, [
      "high",
      "missing",
      "inconsistent",
      "credibility",
      "changed story",
      "no proof",
    ])
  ) {
    return "high";
  }

  if (includesAny(text, ["concern", "weak", "review", "unclear", "gap"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): CredibilityFindingCategory {
  const text = normalize(value);

  if (includesAny(text, ["contradiction", "inconsistent", "conflict"])) {
    return "contradiction-risk";
  }

  if (includesAny(text, ["changed story", "different version", "new version"])) {
    return "changed-story";
  }

  if (includesAny(text, ["always", "never", "everyone", "clearly", "obviously"])) {
    return "overstatement";
  }

  if (includesAny(text, ["missing context", "context", "unclear"])) {
    return "missing-context";
  }

  if (includesAny(text, ["corroborat", "independent", "witness"])) {
    return "corroboration";
  }

  if (includesAny(text, ["admitted", "admission", "acknowledged", "confirmed"])) {
    return "admission";
  }

  if (includesAny(text, ["document", "record", "screenshot", "email", "text"])) {
    return "document-support";
  }

  if (includesAny(text, ["judge", "court"])) {
    return "judicial-concern";
  }

  if (includesAny(text, ["opposing", "other side", "attack"])) {
    return "opponent-attack";
  }

  return "internal-consistency";
}

function createFinding(args: {
  category: CredibilityFindingCategory;
  severity: CredibilitySeverity;
  confidence: CredibilityConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  judicialImpact: string;
  opponentAttack: string;
  recommendedQuestion: string;
  recommendedAction: string;
  whatWouldStrengthenIt: string[];
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  source: string;
}): CredibilityInvestigationFinding {
  return {
    id: createId("credibility_investigation"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    judicialImpact: args.judicialImpact,
    opponentAttack: args.opponentAttack,
    recommendedQuestion: args.recommendedQuestion,
    recommendedAction: args.recommendedAction,
    whatWouldStrengthenIt: uniqueStrings(args.whatWouldStrengthenIt),
    linkedClaimIds: args.linkedClaimIds || [],
    linkedEvidenceIds: args.linkedEvidenceIds || [],
    source: args.source,
  };
}

function splitNarrative(rawNarrative?: string): string[] {
  return uniqueStrings(
    clean(rawNarrative)
      .split(/[.!?\n]+/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 8),
  );
}

function buildNarrativeCredibilityFindings(
  input: CredibilityInvestigationInput,
): CredibilityInvestigationFinding[] {
  const findings: CredibilityInvestigationFinding[] = [];
  const sentences = splitNarrative(input.rawNarrative);

  for (const sentence of sentences) {
    if (
      includesAny(sentence, ["always", "never", "everyone", "clearly", "obviously"]) &&
      !includesAny(sentence, ["record", "receipt", "message", "screenshot", "document"])
    ) {
      findings.push(
        createFinding({
          category: "overstatement",
          severity: "medium",
          confidence: "high",
          title: "Broad wording may weaken credibility",
          explanation:
            "The narrative uses absolute or broad wording without immediately tying it to records.",
          whyItMatters:
            "Overbroad wording can make the user easier to challenge and may distract from provable facts.",
          judicialImpact:
            "A judge may prefer exact examples, dates, documents, and specific wording over broad conclusions.",
          opponentAttack:
            "The opposing party may attack this as exaggeration or overstatement.",
          recommendedQuestion:
            "Can this point be rewritten using exact dates, examples, records, or specific wording?",
          recommendedAction:
            "Replace broad wording with specific facts and evidence-backed examples.",
          whatWouldStrengthenIt: [
            "Exact dates",
            "Specific examples",
            "Original messages",
            "Receipts or records",
            "Witness confirmation",
          ],
          source: "rawNarrative.overstatement",
        }),
      );
    }

    if (
      includesAny(sentence, ["because", "as a result", "caused", "therefore"]) &&
      !includesAny(sentence, ["date", "record", "timeline", "before", "after"])
    ) {
      findings.push(
        createFinding({
          category: "external-consistency",
          severity: "medium",
          confidence: "medium",
          title: "Cause-and-effect needs stronger support",
          explanation:
            "The narrative makes a causal connection, but the supporting timeline or evidence is not obvious.",
          whyItMatters:
            "Causation is often attacked when the timeline or records do not clearly connect event to result.",
          judicialImpact:
            "A judge may ask what proves the event caused the result rather than merely happening around the same time.",
          opponentAttack:
            "The opposing party may argue there is no reliable link between the event and the alleged impact.",
          recommendedQuestion:
            "What dated records show the before-and-after sequence and prove this caused the result?",
          recommendedAction:
            "Build a dated timeline connecting event, impact, and supporting evidence.",
          whatWouldStrengthenIt: [
            "Before-and-after timeline",
            "Messages with timestamps",
            "Receipts",
            "Photos",
            "Witness evidence",
            "Court or business records",
          ],
          source: "rawNarrative.causation",
        }),
      );
    }
  }

  return findings;
}

function buildImportedFindingSignals(
  input: CredibilityInvestigationInput,
): CredibilityInvestigationFinding[] {
  const findings: CredibilityInvestigationFinding[] = [];

  for (const item of input.narrativeFindings || []) {
    const text = `${item.title || ""} ${item.explanation || ""} ${
      item.sourceText || ""
    }`;
    const category = categoryFromText(text);

    findings.push(
      createFinding({
        category,
        severity: severityFromText(item.severity || text),
        confidence: "medium",
        title: item.title || "Narrative credibility signal",
        explanation:
          item.explanation ||
          "A narrative finding may affect credibility or reliability.",
        whyItMatters:
          "Narrative gaps can weaken the user's ability to present a clear and believable story.",
        judicialImpact:
          "A judge may ask for clearer facts, dates, sources, and context.",
        opponentAttack:
          "The opposing party may argue the story is vague, unsupported, or incomplete.",
        recommendedQuestion:
          item.recommendedQuestion ||
          "What facts, dates, evidence, or witnesses clarify this part of the story?",
        recommendedAction:
          "Clarify the narrative issue and connect it to evidence.",
        whatWouldStrengthenIt: [
          "Specific facts",
          "Exact dates",
          "Documents",
          "Screenshots",
          "Witness confirmation",
        ],
        source: "narrativeFindings",
      }),
    );
  }

  for (const item of input.evidenceFindings || []) {
    const text = `${item.title || ""} ${item.explanation || ""}`;
    const category = categoryFromText(text);

    findings.push(
      createFinding({
        category,
        severity: severityFromText(item.severity || text),
        confidence: "medium",
        title: item.title || "Evidence credibility signal",
        explanation:
          item.explanation ||
          "An evidence finding may affect credibility or reliability.",
        whyItMatters:
          "Credibility depends heavily on whether the story is supported by reliable records.",
        judicialImpact:
          "A judge may ask whether the evidence is complete, authentic, and consistent with the story.",
        opponentAttack:
          "The opposing party may attack missing context, authenticity, or gaps in the documents.",
        recommendedQuestion:
          item.recommendedQuestion ||
          "What context, source, date, or record makes this evidence more reliable?",
        recommendedAction:
          "Strengthen the evidence foundation and connect it to the story.",
        whatWouldStrengthenIt: [
          "Original records",
          "Full context",
          "Sender/receiver/date details",
          "Corroborating evidence",
          "Witness support",
        ],
        linkedEvidenceIds: item.linkedEvidenceIds || [],
        source: "evidenceFindings",
      }),
    );
  }

  for (const item of input.burdenFindings || []) {
    const text = `${item.title || ""} ${item.explanation || ""}`;

    findings.push(
      createFinding({
        category: categoryFromText(text),
        severity: severityFromText(item.severity || text),
        confidence: "medium",
        title: item.title || "Burden credibility signal",
        explanation:
          item.explanation ||
          "A burden finding may affect whether the court can rely on this point.",
        whyItMatters:
          "When required proof is missing or weak, credibility and legal strength both suffer.",
        judicialImpact:
          "A judge may ask why the required proof is missing or why the available proof should be accepted.",
        opponentAttack:
          "The opposing party may argue the user has not met the burden of proof.",
        recommendedQuestion:
          "What proof satisfies this burden, and why should the court accept it?",
        recommendedAction:
          "Connect the burden issue to reliable evidence and clear facts.",
        whatWouldStrengthenIt: [
          "Proof map",
          "Documents",
          "Witnesses",
          "Timeline support",
          "Legal authority",
        ],
        linkedClaimIds: item.linkedClaimIds || [],
        linkedEvidenceIds: item.linkedEvidenceIds || [],
        source: "burdenFindings",
      }),
    );
  }

  return findings;
}

function buildJudicialAndOpponentFindings(
  input: CredibilityInvestigationInput,
): CredibilityInvestigationFinding[] {
  const findings: CredibilityInvestigationFinding[] = [];

  for (const concern of input.litigationReasoning?.judicialConcerns || []) {
    findings.push(
      createFinding({
        category: "judicial-concern",
        severity: severityFromText(concern),
        confidence: "medium",
        title: "Judicial credibility concern",
        explanation: concern,
        whyItMatters:
          "Judicial concerns identify what the court may need clarified before accepting the user's position.",
        judicialImpact:
          "The judge may focus on this concern when testing reliability, proof, or fairness.",
        opponentAttack:
          "The opposing party may use this concern to challenge the case narrative.",
        recommendedQuestion:
          "What evidence, explanation, or context would answer this judge concern?",
        recommendedAction:
          "Prepare a direct answer to the judge concern with evidence support.",
        whatWouldStrengthenIt: [
          "Clear explanation",
          "Supporting records",
          "Witness confirmation",
          "Timeline support",
          "Authority if relevant",
        ],
        source: "litigationReasoning.judicialConcerns",
      }),
    );
  }

  for (const attack of input.litigationReasoning?.opposingArguments || []) {
    findings.push(
      createFinding({
        category: "opponent-attack",
        severity: severityFromText(attack),
        confidence: "medium",
        title: "Likely credibility attack",
        explanation: attack,
        whyItMatters:
          "A strong case should anticipate how the opposing party may challenge reliability or consistency.",
        judicialImpact:
          "If unanswered, this attack may influence how the court views credibility.",
        opponentAttack: attack,
        recommendedQuestion:
          "What evidence or explanation directly answers this likely attack?",
        recommendedAction:
          "Prepare a response supported by documents, dates, witnesses, or admissions.",
        whatWouldStrengthenIt: [
          "Contradiction chart",
          "Supporting documents",
          "Independent witness",
          "Clear chronology",
          "Admissions",
        ],
        source: "litigationReasoning.opposingArguments",
      }),
    );
  }

  return findings;
}

function buildWarningFindings(
  input: CredibilityInvestigationInput,
): CredibilityInvestigationFinding[] {
  const warnings = [
    ...(input.credibilityAnalysis?.warnings || []),
    ...(input.contradictionWarnings || []),
    ...(input.evidenceWarnings || []),
    ...(input.proceduralWarnings || []),
    ...(input.burdenWarnings || []),
    ...(input.litigationReasoning?.warnings || []),
  ];

  return warnings.map((warning) =>
    createFinding({
      category: categoryFromText(warning),
      severity: severityFromText(warning),
      confidence: "medium",
      title: "Credibility warning",
      explanation: warning,
      whyItMatters:
        "Credibility warnings can affect settlement posture, court readiness, and whether the user's evidence is persuasive.",
      judicialImpact:
        "A judge may ask for clarification, corroboration, or an explanation.",
      opponentAttack:
        "The opposing party may use this warning to challenge reliability.",
      recommendedQuestion:
        "What evidence, context, explanation, or witness support resolves this credibility warning?",
      recommendedAction:
        "Resolve this credibility warning before relying on the point in final court materials.",
      whatWouldStrengthenIt: [
        "Original documents",
        "Full context",
        "Consistent timeline",
        "Witness support",
        "Admissions",
      ],
      source: "crossSystemWarnings",
    }),
  );
}

function calculateIntelligence(
  findings: CredibilityInvestigationFinding[],
  input: CredibilityInvestigationInput,
): CredibilityInvestigatorIntelligence {
  let credibilityScore = 85;
  let reliabilityScore = 85;
  let corroborationScore = 70;
  let consistencyScore = 80;
  let judicialConcernScore = 20;

  for (const finding of findings) {
    if (finding.severity === "critical") {
      credibilityScore -= 18;
      reliabilityScore -= 18;
      consistencyScore -= 16;
      judicialConcernScore += 18;
    } else if (finding.severity === "high") {
      credibilityScore -= 12;
      reliabilityScore -= 10;
      consistencyScore -= 9;
      judicialConcernScore += 12;
    } else if (finding.severity === "medium") {
      credibilityScore -= 6;
      reliabilityScore -= 5;
      consistencyScore -= 5;
      judicialConcernScore += 6;
    } else if (finding.severity === "low") {
      credibilityScore -= 2;
      reliabilityScore -= 2;
      consistencyScore -= 1;
      judicialConcernScore += 2;
    }

    if (
      finding.category === "corroboration" ||
      finding.category === "document-support" ||
      finding.category === "witness-support" ||
      finding.category === "admission" ||
      finding.category === "credibility-strength"
    ) {
      credibilityScore += 4;
      reliabilityScore += 4;
      corroborationScore += 8;
      judicialConcernScore -= 4;
    }

    if (
      finding.category === "missing-corroboration" ||
      finding.category === "contradiction-risk" ||
      finding.category === "changed-story"
    ) {
      corroborationScore -= 8;
      consistencyScore -= 8;
    }
  }

  if ((input.litigationReasoning?.strongestCasePoints || []).length > 0) {
    credibilityScore += 5;
    reliabilityScore += 5;
  }

  const normalizedCredibilityScore = Math.max(
    0,
    Math.min(100, Math.round(credibilityScore)),
  );

  return {
    credibilityScore: normalizedCredibilityScore,
    reliabilityScore: Math.max(0, Math.min(100, Math.round(reliabilityScore))),
    corroborationScore: Math.max(0, Math.min(100, Math.round(corroborationScore))),
    consistencyScore: Math.max(0, Math.min(100, Math.round(consistencyScore))),
    judicialConcernScore: Math.max(
      0,
      Math.min(100, Math.round(judicialConcernScore)),
    ),
    overallRiskLevel: riskLevelFromScore(normalizedCredibilityScore),
    confidence: confidenceFromScore(normalizedCredibilityScore),
  };
}

function findingsByCategory(
  findings: CredibilityInvestigationFinding[],
  category: CredibilityFindingCategory,
): CredibilityInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: CredibilityInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function actionsFromFindings(
  findings: CredibilityInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

export function buildCredibilityInvestigation(
  input: CredibilityInvestigationInput,
): CredibilityInvestigationResult {
  const findings = [
    ...buildNarrativeCredibilityFindings(input),
    ...buildImportedFindingSignals(input),
    ...buildJudicialAndOpponentFindings(input),
    ...buildWarningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings, input);
  const topQuestions = questionsFromFindings(findings).slice(0, 14);

  const credibilityStrengths = uniqueStrings([
    ...(input.litigationReasoning?.strongestCasePoints || []),
    ...findingsByCategory(findings, "credibility-strength").map(
      (finding) => finding.title,
    ),
    ...findingsByCategory(findings, "document-support").map(
      (finding) => finding.title,
    ),
    ...findingsByCategory(findings, "admission").map((finding) => finding.title),
  ]);

  const credibilityRisks = uniqueStrings([
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 3)
      .map((finding) => finding.title),
  ]);

  const warnings = uniqueStrings([
    ...(input.credibilityAnalysis?.warnings || []),
    ...(input.contradictionWarnings || []),
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

    credibilityStrengths,
    credibilityRisks,
    judicialCredibilityConcerns: findingsByCategory(
      findings,
      "judicial-concern",
    ).map((finding) => finding.explanation),
    opponentCredibilityAttacks: findingsByCategory(
      findings,
      "opponent-attack",
    ).map((finding) => finding.explanation),
    corroborationRequests: uniqueStrings(
      findings.flatMap((finding) => finding.whatWouldStrengthenIt),
    ),
    consistencyQuestions: questionsFromFindings(
      findings.filter((finding) =>
        ["internal-consistency", "external-consistency", "changed-story"].includes(
          finding.category,
        ),
      ),
    ),
    missingContextQuestions: questionsFromFindings(
      findingsByCategory(findings, "missing-context"),
    ),
    admissionReviewQuestions: questionsFromFindings(
      findingsByCategory(findings, "admission"),
    ),

    topQuestions,
    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      ...(input.credibilityAnalysis?.nextActions || []),
      "Strengthen credibility by connecting key facts to records, witnesses, admissions, and a clear timeline.",
      "Prepare answers to the strongest credibility attacks before generating final court materials.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Credibility Investigator assessed credibility as ${intelligence.overallRiskLevel} risk with score ${intelligence.credibilityScore}/100 and found ${findings.length} credibility signal(s).`
        : `Credibility Investigator assessed credibility as ${intelligence.overallRiskLevel} risk with score ${intelligence.credibilityScore}/100 and found no major credibility issues.`,
  };
}