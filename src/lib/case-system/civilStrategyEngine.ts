import type { CaseRisk } from "./caseContextEngine";

import type {
  CivilCaseData,
  CivilCaseType,
  CivilLiabilityTheory,
  CivilStrategicProfile,
} from "./types/civil-case";

import type { CivilMasterCaseResult } from "./civilMasterCaseEngine";

export type CivilStrategyInput = {
  masterResult?: CivilMasterCaseResult;
  caseData?: CivilCaseData;
};

export type CivilTheoryAssessment = {
  theory: string;
  score: number;
  strength: "weak" | "developing" | "moderate" | "strong";
  supportingFactors: string[];
  weakeningFactors: string[];
  proofPressurePoints: string[];
};

export type CivilStrategyResult = {
  strategicProfile: CivilStrategicProfile;
  theoryAssessments: CivilTheoryAssessment[];
  strongestTheories: string[];
  weakestAreas: string[];
  likelyDefenceArguments: string[];
  likelyJudgeConcerns: string[];
  settlementLeverage: string[];
  escalationRisks: string[];
  tacticalNextMoves: string[];
  draftingWarnings: string[];
  readinessStrategy: string[];
  risks: CaseRisk[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function getCase(input: CivilStrategyInput): CivilCaseData | undefined {
  return input.caseData || input.masterResult?.masterCase;
}

function getTypes(input: CivilStrategyInput): CivilCaseType[] {
  return getCase(input)?.civilCaseTypes || [];
}

function getRisks(input: CivilStrategyInput): CaseRisk[] {
  return getCase(input)?.risks || input.masterResult?.workflow.risks || [];
}

function scoreToStrength(score: number): CivilTheoryAssessment["strength"] {
  if (score >= 75) return "strong";
  if (score >= 55) return "moderate";
  if (score >= 35) return "developing";
  return "weak";
}

function theoryName(type: CivilCaseType): string {
  const names: Record<CivilCaseType, string> = {
    negligence: "Negligence",
    defamation: "Defamation / reputational harm",
    "breach-of-contract": "Breach of contract",
    "occupier-liability": "Occupier liability",
    "property-damage": "Property damage",
    "personal-injury": "Personal injury",
    "professional-negligence": "Professional negligence",
    charter: "Charter / public authority claim",
    misfeasance: "Misfeasance in public office",
    "human-rights": "Human Rights / discrimination",
    privacy: "Privacy / records misuse",
    employment: "Employment-related civil claim",
    insurance: "Insurance dispute",
    debt: "Debt / unpaid money",
    "mixed-civil": "Mixed civil claim",
    unknown: "Unclear civil theory",
  };

  return names[type];
}

function buildTheoryAssessments(input: CivilStrategyInput): CivilTheoryAssessment[] {
  const master = getCase(input);
  const types = getTypes(input);
  const risks = getRisks(input);

  const evidenceStrengthCount =
    master?.evidenceProfile.keyEvidenceStrengths.length || 0;

  const missingEvidenceCount =
    master?.evidenceProfile.missingEvidence.length || 0;

  const damagesGapCount =
    master?.damagesProfile.damagesProofMissing.length || 0;

  const jurisdictionRiskCount =
    master?.procedureProfile.jurisdictionConcerns.length || 0;

  const limitationRiskCount =
    master?.procedureProfile.limitationConcerns.length || 0;

  const highRiskCount = risks.filter((risk) => risk.severity === "high").length;

  const liabilityTheories: CivilLiabilityTheory[] =
    master?.liabilityTheories || [];

  return cleanList(types.length ? types : ["unknown"])
    .map((type) => type as CivilCaseType)
    .map((type) => {
      const relatedTheory = liabilityTheories.find((theory) =>
        clean(theory.title).toLowerCase().includes(type.replace(/-/g, " ")),
      );

      let score = 45;

      score += evidenceStrengthCount * 8;
      score -= missingEvidenceCount * 8;
      score -= damagesGapCount * 7;
      score -= jurisdictionRiskCount * 10;
      score -= limitationRiskCount * 12;
      score -= highRiskCount * 8;

      if (relatedTheory?.confidence === "strong") score += 15;
      if (relatedTheory?.confidence === "very-strong") score += 25;
      if (relatedTheory?.confidence === "low") score -= 15;

      if (type === "mixed-civil") score -= 8;
      if (type === "unknown") score -= 20;

      const finalScore = Math.max(0, Math.min(100, score));

      return {
        theory: theoryName(type),
        score: finalScore,
        strength: scoreToStrength(finalScore),
        supportingFactors: cleanList([
          evidenceStrengthCount > 0
            ? "There are identified evidence strengths."
            : "",
          relatedTheory?.strengths.join("; "),
          master?.timeline.length ? "Timeline structure has started." : "",
          master?.facts.length ? "Core facts have been captured." : "",
        ]),
        weakeningFactors: cleanList([
          missingEvidenceCount > 0 ? "Evidence gaps remain." : "",
          damagesGapCount > 0 ? "Damages proof gaps remain." : "",
          jurisdictionRiskCount > 0 ? "Forum or jurisdiction concerns remain." : "",
          limitationRiskCount > 0 ? "Limitation or deadline concerns remain." : "",
          highRiskCount > 0 ? "High-risk issues remain unresolved." : "",
          type === "mixed-civil"
            ? "Mixed civil claims must be separated into clear legal pathways."
            : "",
          type === "unknown"
            ? "Civil theory is still unclear."
            : "",
        ]),
        proofPressurePoints: cleanList([
          ...(relatedTheory?.proofGaps || []),
          ...(master?.evidenceProfile.missingEvidence || []),
          ...(master?.damagesProfile.damagesProofMissing || []),
          ...(master?.procedureProfile.pleadingConcerns || []),
        ]),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildWeakestAreas(input: CivilStrategyInput): string[] {
  const master = getCase(input);
  const risks = getRisks(input);

  return cleanList([
    ...(master?.missingInformation || []),
    ...(master?.evidenceProfile.missingEvidence || []),
    ...(master?.damagesProfile.damagesProofMissing || []),
    ...(master?.procedureProfile.jurisdictionConcerns || []),
    ...(master?.procedureProfile.limitationConcerns || []),
    ...(master?.readiness.blockers || []),
    ...risks.filter((risk) => risk.severity === "high").map((risk) => risk.title),
  ]);
}

function buildSettlementLeverage(input: CivilStrategyInput): string[] {
  const master = getCase(input);

  return cleanList([
    ...(master?.strategicProfile.negotiationLeverage || []),
    master?.evidenceProfile.keyEvidenceStrengths.length
      ? "Organized evidence may create settlement pressure."
      : "",
    master?.damagesProfile.financialLosses.length
      ? "Documented financial losses may support a concrete settlement number."
      : "",
    master?.readiness.score && master.readiness.score >= 65
      ? "The file is organized enough to support a more structured settlement position."
      : "",
    master?.narrativeProfile.defenceVulnerabilities.length
      ? "Known defence risks can be priced into settlement strategy."
      : "",
  ]);
}

function buildEscalationRisks(input: CivilStrategyInput): string[] {
  const master = getCase(input);
  const risks = getRisks(input);

  return cleanList([
    ...risks.filter((risk) => risk.severity === "high").map((risk) => risk.description),
    ...(master?.procedureProfile.limitationConcerns || []),
    ...(master?.procedureProfile.jurisdictionConcerns || []),
    ...(master?.evidenceProfile.authenticationConcerns || []),
    ...(master?.narrativeProfile.unsupportedAssertions || []),
  ]);
}

function buildDraftingWarnings(input: CivilStrategyInput): string[] {
  const master = getCase(input);

  return cleanList([
    ...(master?.narrativeProfile.toneWarnings || []),
    ...(master?.narrativeProfile.unsupportedAssertions || []),
    ...(master?.procedureProfile.pleadingConcerns || []),
    "Do not plead legal conclusions without material facts.",
    "Do not merge separate civil theories into one confusing narrative.",
    "Do not claim damages without showing calculation and causation.",
  ]);
}

function buildReadinessStrategy(input: CivilStrategyInput): string[] {
  const master = getCase(input);

  return cleanList([
    master?.readiness.level
      ? `Current civil readiness level: ${master.readiness.level} (${master.readiness.score}/100).`
      : "",
    ...(master?.readiness.blockers || []),
    master?.readiness.score && master.readiness.score < 45
      ? "Focus on facts, chronology, evidence, and forum before drafting final documents."
      : "",
    master?.readiness.score && master.readiness.score >= 45 && master.readiness.score < 65
      ? "Move from organization into proof mapping and damages support."
      : "",
    master?.readiness.score && master.readiness.score >= 65
      ? "Begin preparing drafting, settlement, and package-readiness materials while resolving final blockers."
      : "",
  ]);
}

function buildTacticalNextMoves(
  input: CivilStrategyInput,
  assessments: CivilTheoryAssessment[],
): string[] {
  const master = getCase(input);
  const best = assessments[0];

  return cleanList([
    best ? `Lead with the strongest current theory: ${best.theory}.` : "",
    "Separate each civil theory into its own proof pathway.",
    "Build an issue-by-issue proof map before final pleadings.",
    "Prepare a damages table with evidence for each amount.",
    "Identify and answer the strongest defence arguments before finalizing wording.",
    "Resolve forum, limitation, service, and jurisdiction issues before document generation.",
    ...(master?.nextSteps || []),
  ]);
}

export function runCivilStrategyEngine(
  input: CivilStrategyInput,
): CivilStrategyResult {
  const theoryAssessments = buildTheoryAssessments(input);

  const strongestTheories = theoryAssessments
    .filter((item) => item.strength === "strong" || item.strength === "moderate")
    .map((item) => item.theory);

  const weakestAreas = buildWeakestAreas(input);

  // Never generated: predicting defence arguments or judge reactions is a
  // CLAUDE.md section 3 violation, not a data gap.
  const likelyDefenceArguments: string[] = [];
  const likelyJudgeConcerns: string[] = [];
  const settlementLeverage = buildSettlementLeverage(input);
  const escalationRisks = buildEscalationRisks(input);
  const draftingWarnings = buildDraftingWarnings(input);
  const readinessStrategy = buildReadinessStrategy(input);
  const tacticalNextMoves = buildTacticalNextMoves(input, theoryAssessments);

  const strategicProfile: CivilStrategicProfile = {
    strongestTheories:
      strongestTheories.length > 0
        ? strongestTheories
        : theoryAssessments.slice(0, 3).map((item) => item.theory),

    likelyDefenceArguments,
    likelyJudgeConcerns,
    settlementConsiderations: settlementLeverage,
    litigationRisks: escalationRisks,
    negotiationLeverage: settlementLeverage,
    proceduralPressurePoints: escalationRisks,
    strategicNextSteps: tacticalNextMoves,
  };

  return {
    strategicProfile,
    theoryAssessments,
    strongestTheories: strategicProfile.strongestTheories,
    weakestAreas,
    likelyDefenceArguments,
    likelyJudgeConcerns,
    settlementLeverage,
    escalationRisks,
    tacticalNextMoves,
    draftingWarnings,
    readinessStrategy,
    risks: getRisks(input),
    summary:
      weakestAreas.length > 0
        ? "Civil strategy review completed with remaining weaknesses, proof pressure, and procedural risks to resolve."
        : "Civil strategy review completed with no major unresolved strategic weaknesses detected.",
  };
}