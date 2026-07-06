export type LitigationReasoningVersion = "1.0.0";

export type LitigationReadinessLevel =
  | "not-ready"
  | "weak"
  | "developing"
  | "usable"
  | "strong"
  | "court-ready";

export type LitigationReasoningSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type LitigationReasoningFinding = {
  id: string;
  title: string;
  severity: LitigationReasoningSeverity;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
};

export type LitigationReasoningInput = {
  caseId?: string;

  claimTheoryModel?: {
    theories?: Array<{
      id: string;
      title?: string;
      status?: string;
      confidence?: string;
      linkedEvidenceIds?: string[];
      risks?: Array<{ title?: string; severity?: string; explanation?: string }>;
    }>;
    warnings?: string[];
  };

  proofAnalysis?: {
    claimProofMaps?: Array<{
      claimId: string;
      claimTitle?: string;
      overallProofStrength?: string;
      weakestElements?: string[];
      strongestElements?: string[];
      missingEvidence?: string[];
      judgeConcerns?: string[];
      opposingArguments?: string[];
      nextActions?: string[];
    }>;
    globalWeaknesses?: string[];
    globalStrengths?: string[];
    globalNextActions?: string[];
    summary?: string;
  };

  evidenceAnalysis?: {
    proofGaps?: string[];
    contradictionNotes?: string[];
    credibilityConcerns?: string[];
    chronologyConcerns?: string[];
    bundleWarnings?: string[];
    corroborationNotes?: string[];
  };

  authorityAnalysis?: {
    verifiedAuthorityIds?: string[];
    strongestAuthorityIds?: string[];
    unsafeAuthorityIds?: string[];
    warnings?: string[];
  };

  contradictionAnalysis?: {
    findings?: Array<{
      id?: string;
      category?: string;
      severity?: string;
      explanation?: string;
      litigationRisk?: string;
    }>;
    warnings?: string[];
  };

  credibilityAnalysis?: {
    overallLevel?: string;
    overallScore?: number;
    findings?: Array<{
      id?: string;
      title?: string;
      level?: string;
      explanation?: string;
      recommendedFix?: string;
    }>;
    warnings?: string[];
  };

  procedureWarnings?: string[];
  workflowWarnings?: string[];
};

export type LitigationReasoningResult = {
  version: LitigationReasoningVersion;
  generatedAt: string;
  caseId?: string;

  readinessScore: number;
  readinessLevel: LitigationReadinessLevel;

  strongestCasePoints: string[];
  weakestCasePoints: string[];
  judicialConcerns: string[];
  opposingArguments: string[];
  missingWork: string[];

  findings: LitigationReasoningFinding[];
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

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function severityRank(value: unknown): number {
  const severity = clean(value).toLowerCase();

  if (severity === "critical") return 5;
  if (severity === "high" || severity === "serious") return 4;
  if (severity === "medium" || severity === "moderate" || severity === "elevated") return 3;
  if (severity === "low" || severity === "manageable") return 2;
  if (severity === "info" || severity === "minimal") return 1;

  return 2;
}

function confidenceScore(value: unknown): number {
  const confidence = clean(value).toLowerCase();

  if (confidence === "very-high") return 95;
  if (confidence === "high") return 80;
  if (confidence === "medium") return 60;
  if (confidence === "low") return 35;
  if (confidence === "very-low") return 15;

  return 45;
}

function readinessLevelFromScore(score: number): LitigationReadinessLevel {
  if (score >= 90) return "court-ready";
  if (score >= 75) return "strong";
  if (score >= 60) return "usable";
  if (score >= 40) return "developing";
  if (score >= 20) return "weak";
  return "not-ready";
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildFinding(args: {
  title: string;
  severity: LitigationReasoningSeverity;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
}): LitigationReasoningFinding {
  return {
    id: createId("litigation_reasoning"),
    title: args.title,
    severity: args.severity,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    recommendedAction: args.recommendedAction,
    linkedClaimIds: args.linkedClaimIds || [],
    linkedEvidenceIds: args.linkedEvidenceIds || [],
  };
}

function buildClaimTheoryFindings(
  input: LitigationReasoningInput,
): LitigationReasoningFinding[] {
  const findings: LitigationReasoningFinding[] = [];
  const theories = input.claimTheoryModel?.theories || [];

  const dominant = theories.filter((theory) => theory.status === "dominant");
  const active = theories.filter(
    (theory) => theory.status === "dominant" || theory.status === "active",
  );

  if (theories.length === 0) {
    findings.push(
      buildFinding({
        title: "No claim theory model available",
        severity: "high",
        explanation:
          "The litigation reasoning engine did not receive claim theory data.",
        whyItMatters:
          "The system cannot reason properly unless it knows what legal theory the evidence is supposed to support.",
        recommendedAction:
          "Run claim theory analysis before generating strategy, court packages, or final documents.",
      }),
    );
  }

  if (theories.length > 0 && dominant.length === 0) {
    findings.push(
      buildFinding({
        title: "No dominant claim theory confirmed",
        severity: "medium",
        explanation:
          "The system has possible or active theories, but none is clearly dominant.",
        whyItMatters:
          "Without a dominant theory, forms, evidence mapping, drafting, and strategy can become unfocused.",
        recommendedAction:
          "Clarify the strongest legal theory and suppress weak or unsupported theories from driving the workflow.",
        linkedClaimIds: active.map((theory) => theory.id),
      }),
    );
  }

  for (const theory of theories) {
    for (const risk of theory.risks || []) {
      findings.push(
        buildFinding({
          title: risk.title || `Risk in ${theory.title || "claim theory"}`,
          severity:
            severityRank(risk.severity) >= 4
              ? "high"
              : severityRank(risk.severity) >= 3
                ? "medium"
                : "low",
          explanation:
            risk.explanation ||
            "A claim theory risk was identified and should be reviewed.",
          whyItMatters:
            "Claim theory risks can affect pleadings, proof mapping, authority use, and strategy.",
          recommendedAction:
            "Connect this risk to facts, evidence, legal elements, and any missing proof.",
          linkedClaimIds: [theory.id],
          linkedEvidenceIds: theory.linkedEvidenceIds || [],
        }),
      );
    }
  }

  return findings;
}

function buildProofFindings(input: LitigationReasoningInput): LitigationReasoningFinding[] {
  const findings: LitigationReasoningFinding[] = [];
  const maps = input.proofAnalysis?.claimProofMaps || [];

  if (maps.length === 0) {
    findings.push(
      buildFinding({
        title: "No proof map available",
        severity: "high",
        explanation:
          "No claim proof map was available for litigation reasoning.",
        whyItMatters:
          "The system cannot know whether the case is court-ready unless each claim is mapped to required proof.",
        recommendedAction:
          "Run element proof analysis and connect each claim element to evidence.",
      }),
    );
  }

  for (const map of maps) {
    if ((map.missingEvidence || []).length > 0) {
      findings.push(
        buildFinding({
          title: `Missing proof for ${map.claimTitle || "claim"}`,
          severity: "high",
          explanation:
            map.missingEvidence?.join("; ") ||
            "This claim has missing evidence.",
          whyItMatters:
            "A claim may be legally possible but still fail if required elements are unsupported.",
          recommendedAction:
            "Collect or identify the missing evidence before relying on this claim in court materials.",
          linkedClaimIds: [map.claimId],
        }),
      );
    }

    if ((map.weakestElements || []).length > 0) {
      findings.push(
        buildFinding({
          title: `Weak elements in ${map.claimTitle || "claim"}`,
          severity: "medium",
          explanation: map.weakestElements?.join("; ") || "",
          whyItMatters:
            "Weak elements are likely targets for a judge or opposing party.",
          recommendedAction:
            "Strengthen each weak element with better evidence, dates, context, witnesses, or authority.",
          linkedClaimIds: [map.claimId],
        }),
      );
    }
  }

  return findings;
}

function buildEvidenceFindings(
  input: LitigationReasoningInput,
): LitigationReasoningFinding[] {
  const findings: LitigationReasoningFinding[] = [];

  for (const gap of input.evidenceAnalysis?.proofGaps || []) {
    findings.push(
      buildFinding({
        title: "Evidence proof gap",
        severity: "high",
        explanation: gap,
        whyItMatters:
          "Proof gaps can prevent the system from treating evidence as court-ready.",
        recommendedAction:
          "Fix foundation, authenticity, damages, causation, or context before relying on this evidence.",
      }),
    );
  }

  for (const contradiction of input.evidenceAnalysis?.contradictionNotes || []) {
    findings.push(
      buildFinding({
        title: "Evidence contradiction",
        severity: "high",
        explanation: contradiction,
        whyItMatters:
          "Contradictory evidence can weaken credibility and create judicial concern.",
        recommendedAction:
          "Prepare a side-by-side comparison and explain which evidence is more reliable.",
      }),
    );
  }

  for (const concern of input.evidenceAnalysis?.credibilityConcerns || []) {
    findings.push(
      buildFinding({
        title: "Evidence credibility concern",
        severity: "medium",
        explanation: concern,
        whyItMatters:
          "Credibility concerns can affect whether the court accepts the user's version of events.",
        recommendedAction:
          "Clarify dates, wording, source, surrounding context, and consistency with other evidence.",
      }),
    );
  }

  return findings;
}

function buildAuthorityFindings(
  input: LitigationReasoningInput,
): LitigationReasoningFinding[] {
  const findings: LitigationReasoningFinding[] = [];

  const unsafe = input.authorityAnalysis?.unsafeAuthorityIds || [];
  const verified = input.authorityAnalysis?.verifiedAuthorityIds || [];

  if (unsafe.length > 0) {
    findings.push(
      buildFinding({
        title: "Unsafe authorities detected",
        severity: "high",
        explanation: `${unsafe.length} authority item(s) are unsafe or require review before use.`,
        whyItMatters:
          "Unsafe or unverified authorities should not drive generated legal arguments.",
        recommendedAction:
          "Replace unsafe authorities with verified statutes, rules, official sources, or stronger case law.",
      }),
    );
  }

  if (verified.length === 0 && input.authorityAnalysis) {
    findings.push(
      buildFinding({
        title: "No verified authorities available",
        severity: "medium",
        explanation:
          "Authority analysis was provided, but no verified authorities were identified.",
        whyItMatters:
          "Drafting and legal reasoning should not overstate legal conclusions without verified authority support.",
        recommendedAction:
          "Add verified authority before generating final legal arguments or court materials.",
      }),
    );
  }

  return findings;
}

function buildContradictionFindings(
  input: LitigationReasoningInput,
): LitigationReasoningFinding[] {
  const findings: LitigationReasoningFinding[] = [];

  for (const contradiction of input.contradictionAnalysis?.findings || []) {
    findings.push(
      buildFinding({
        title: contradiction.category
          ? `Contradiction: ${contradiction.category}`
          : "Contradiction detected",
        severity:
          severityRank(contradiction.severity) >= 5
            ? "critical"
            : severityRank(contradiction.severity) >= 4
              ? "high"
              : "medium",
        explanation:
          contradiction.explanation ||
          contradiction.litigationRisk ||
          "A contradiction was detected.",
        whyItMatters:
          "Contradictions can damage credibility, proof strength, settlement posture, and courtroom readiness.",
        recommendedAction:
          "Resolve or explain the contradiction before generating final materials.",
      }),
    );
  }

  return findings;
}

function buildCredibilityFindings(
  input: LitigationReasoningInput,
): LitigationReasoningFinding[] {
  const findings: LitigationReasoningFinding[] = [];

  const level = clean(input.credibilityAnalysis?.overallLevel);

  if (level === "serious" || level === "critical") {
    findings.push(
      buildFinding({
        title: "Serious credibility risk",
        severity: level === "critical" ? "critical" : "high",
        explanation:
          "Credibility analysis indicates a serious or critical risk level.",
        whyItMatters:
          "Credibility risk can affect settlement pressure, cross-examination risk, and whether the court accepts the case narrative.",
        recommendedAction:
          "Resolve contradictions, missing context, overstatement, and weak evidence before final drafting.",
      }),
    );
  }

  for (const finding of input.credibilityAnalysis?.findings || []) {
    findings.push(
      buildFinding({
        title: finding.title || "Credibility finding",
        severity:
          severityRank(finding.level) >= 5
            ? "critical"
            : severityRank(finding.level) >= 4
              ? "high"
              : "medium",
        explanation:
          finding.explanation ||
          "A credibility issue was identified.",
        whyItMatters:
          "Credibility findings help predict judge concerns and opposing party attacks.",
        recommendedAction:
          finding.recommendedFix ||
          "Clarify the record and connect disputed points to evidence.",
      }),
    );
  }

  return findings;
}

function calculateReadinessScore(input: LitigationReasoningInput): number {
  let score = 55;

  const proofMaps = input.proofAnalysis?.claimProofMaps || [];
  const theories = input.claimTheoryModel?.theories || [];

  if (theories.some((theory) => theory.status === "dominant")) score += 10;
  if (proofMaps.length > 0) score += 10;

  const strongProofCount = proofMaps.filter(
    (map) =>
      map.overallProofStrength === "high" ||
      map.overallProofStrength === "very-high",
  ).length;

  score += strongProofCount * 5;

  score -= (input.proofAnalysis?.globalWeaknesses || []).length * 3;
  score -= (input.evidenceAnalysis?.proofGaps || []).length * 5;
  score -= (input.evidenceAnalysis?.contradictionNotes || []).length * 6;
  score -= (input.authorityAnalysis?.unsafeAuthorityIds || []).length * 5;
  score -= (input.contradictionAnalysis?.findings || []).length * 5;

  const credibilityScore = input.credibilityAnalysis?.overallScore;
  if (typeof credibilityScore === "number") {
    score -= Math.round(credibilityScore * 0.25);
  }

  score -= (input.procedureWarnings || []).length * 4;
  score -= (input.workflowWarnings || []).length * 3;

  return clampScore(score);
}

function buildNextActions(findings: LitigationReasoningFinding[]): string[] {
  const sorted = findings.slice().sort((a, b) => {
    return severityRank(b.severity) - severityRank(a.severity);
  });

  return uniqueStrings(sorted.map((finding) => finding.recommendedAction)).slice(0, 12);
}

export function buildLitigationReasoning(
  input: LitigationReasoningInput,
): LitigationReasoningResult {
  const findings = [
    ...buildClaimTheoryFindings(input),
    ...buildProofFindings(input),
    ...buildEvidenceFindings(input),
    ...buildAuthorityFindings(input),
    ...buildContradictionFindings(input),
    ...buildCredibilityFindings(input),
  ];

  const readinessScore = calculateReadinessScore(input);
  const readinessLevel = readinessLevelFromScore(readinessScore);

  const strongestCasePoints = uniqueStrings([
    ...(input.proofAnalysis?.globalStrengths || []),
    ...(input.evidenceAnalysis?.corroborationNotes || []),
    ...(input.authorityAnalysis?.strongestAuthorityIds || []).map(
      (id) => `Strong authority available: ${id}`,
    ),
  ]);

  const weakestCasePoints = uniqueStrings([
    ...(input.proofAnalysis?.globalWeaknesses || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 3)
      .map((finding) => finding.title),
  ]);

  const judicialConcerns = uniqueStrings([
    ...(input.proofAnalysis?.claimProofMaps || []).flatMap(
      (map) => map.judgeConcerns || [],
    ),
    ...findings.map((finding) => finding.whyItMatters),
  ]);

  const opposingArguments = uniqueStrings([
    ...(input.proofAnalysis?.claimProofMaps || []).flatMap(
      (map) => map.opposingArguments || [],
    ),
  ]);

  const missingWork = uniqueStrings([
    ...(input.proofAnalysis?.globalWeaknesses || []),
    ...(input.proofAnalysis?.claimProofMaps || []).flatMap(
      (map) => map.missingEvidence || [],
    ),
    ...(input.procedureWarnings || []),
    ...(input.workflowWarnings || []),
  ]);

  const warnings = uniqueStrings([
    ...(input.claimTheoryModel?.warnings || []),
    ...(input.evidenceAnalysis?.bundleWarnings || []),
    ...(input.authorityAnalysis?.warnings || []),
    ...(input.contradictionAnalysis?.warnings || []),
    ...(input.credibilityAnalysis?.warnings || []),
    ...(input.procedureWarnings || []),
    ...(input.workflowWarnings || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    readinessScore,
    readinessLevel,

    strongestCasePoints,
    weakestCasePoints,
    judicialConcerns,
    opposingArguments,
    missingWork,

    findings,
    nextActions: buildNextActions(findings),
    warnings,

    summary:
      findings.length > 0
        ? `Litigation reasoning reviewed the available claim, proof, evidence, authority, contradiction, and credibility signals. Readiness is ${readinessLevel} at ${readinessScore}/100 with ${findings.length} finding(s).`
        : `Litigation reasoning found no major issues. Readiness is ${readinessLevel} at ${readinessScore}/100.`,
  };
}