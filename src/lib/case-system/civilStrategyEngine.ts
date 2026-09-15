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
  // `score: number` and `strength: "weak" | "developing" | "moderate" |
  // "strong"` were here — a 0-100 sum (base 45, +8 per evidence strength,
  // -12 per limitation concern) cut into a four-rung ladder, grading each of
  // the user's own legal theories against the others. Both gone, and the
  // assessments are no longer sorted by the number.
  /** What is recorded that bears on this theory. Was `supportingFactors`. */
  recordedSupport: string[];
  /** What is not recorded. Was `weakeningFactors`. */
  recordedGaps: string[];
  /** Was `proofPressurePoints` — pressure was the grading word. */
  proofGaps: string[];
};

export type CivilStrategyResult = {
  strategicProfile: CivilStrategicProfile;
  theoryAssessments: CivilTheoryAssessment[];
  /** Detected, not ranked. Was `strongestTheories`. */
  recordedTheories: string[];
  /** What is not yet proved. Was `weakestAreas`. */
  proofGaps: string[];
  // likelyDefenceArguments, likelyJudgeConcerns and settlementLeverage are
  // removed with their slots. See CivilStrategicProfile.
  /** Was `escalationRisks` — the name predicted escalation. */
  recordedConcerns: string[];
  tacticalNextMoves: string[];
  draftingWarnings: string[];
  /** What is recorded and what is not. Was a level, a score, and a branch. */
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

// scoreToStrength() was here: >= 75 "strong", >= 55 "moderate", >= 35
// "developing", else "weak". Deleted with the score it read.

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

      return {
        theory: theoryName(type),
        recordedSupport: cleanList([
          evidenceStrengthCount > 0
            ? "Evidence has been recorded."
            : "",
          relatedTheory?.recordedInIntake.join("; "),
          master?.timeline.length ? "Timeline structure has started." : "",
          master?.facts.length ? "Core facts have been captured." : "",
        ]),
        recordedGaps: cleanList([
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
        proofGaps: cleanList([
          ...(relatedTheory?.proofGaps || []),
          ...(master?.evidenceProfile.missingEvidence || []),
          ...(master?.damagesProfile.damagesProofMissing || []),
          ...(master?.procedureProfile.pleadingConcerns || []),
        ]),
      };
    })
    // Was `.sort((a, b) => b.score - a.score)` — highest grade first. Ordered
    // by the factual partition instead: theories with something recorded come
    // before theories with nothing, and alphabetically within each group.
    .sort((a, b) => {
      const aHas = a.recordedSupport.length > 0 ? 0 : 1;
      const bHas = b.recordedSupport.length > 0 ? 0 : 1;
      return aHas - bHas || a.theory.localeCompare(b.theory);
    });
}

function buildProofGaps(input: CivilStrategyInput): string[] {
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

/*
 * buildSettlementLeverage() was here, and it is deleted rather than renamed.
 *
 * Every member predicted leverage over the other side: "Organized evidence may
 * create settlement pressure", "Documented financial losses may support a
 * concrete settlement number", "Known defence risks can be priced into
 * settlement strategy", plus a line gated on readiness.score >= 65. That is
 * settlement-pressure content by name and by content, which section 3 names
 * directly, and there is no factual restatement of leverage — the underlying
 * facts (what evidence is recorded, what losses are documented) are already
 * reported as facts elsewhere without being pointed at an opponent.
 */

function buildRecordedConcerns(input: CivilStrategyInput): string[] {
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

  // Was: "Current civil readiness level: organized (52/100)." followed by
  // three sentences chosen by threshold (< 45, 45-64, >= 65). The number and
  // the ladder are gone, and so are the branches — each one was a paraphrase
  // of "you have recorded little / some / most of this", which the blockers
  // already say item by item and without ranking.
  return cleanList([
    ...(master?.readiness.reasons || []),
    ...(master?.readiness.blockers || []),
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

  // Was filtered to theories graded "strong" or "moderate". Every detected
  // theory is now reported: withholding one because it scored low is the
  // system deciding which of the user's theories is worth their attention.
  const recordedTheories = theoryAssessments.map((item) => item.theory);

  const proofGaps = buildProofGaps(input);

  const recordedConcerns = buildRecordedConcerns(input);
  const draftingWarnings = buildDraftingWarnings(input);
  const readinessStrategy = buildReadinessStrategy(input);
  const tacticalNextMoves = buildTacticalNextMoves(input, theoryAssessments);

  const strategicProfile: CivilStrategicProfile = {
    recordedTheories:
      recordedTheories.length > 0
        ? recordedTheories
        : theoryAssessments.map((item) => item.theory),

    recordedConcerns,
    strategicNextSteps: tacticalNextMoves,
  };

  return {
    strategicProfile,
    theoryAssessments,
    recordedTheories: strategicProfile.recordedTheories,
    proofGaps,
    recordedConcerns,
    tacticalNextMoves,
    draftingWarnings,
    readinessStrategy,
    risks: getRisks(input),
    // Was "...with remaining weaknesses, proof pressure, and procedural risks
    // to resolve" / "...no major unresolved strategic weaknesses detected".
    // Both graded. This counts.
    summary: `Civil review recorded ${proofGaps.length} proof gap(s) and ${recordedConcerns.length} procedural concern(s).`,
  };
}