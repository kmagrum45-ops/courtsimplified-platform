import { CaseConfidence, CaseSeverity } from "../architecture/masterCaseSchema";

import {
  DamagesAmount,
  DamagesCausationLink,
  DamagesProofRequirement,
  DamagesReadinessState,
  DamagesRemedyBuildInput,
  DamagesRemedyBuildOutput,
  DamagesRemedyModel,
  DamagesRisk,
  RemedyAssessment,
} from "./damagesRemedyArchitecture";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function confidenceRank(value: CaseConfidence): number {
  const ranks: Record<CaseConfidence, number> = {
    "very-low": 1,
    low: 2,
    medium: 3,
    high: 4,
    "very-high": 5,
  };

  return ranks[value] || 1;
}

function confidenceFromRank(rank: number): CaseConfidence {
  if (rank >= 4.5) return "very-high";
  if (rank >= 3.5) return "high";
  if (rank >= 2.5) return "medium";
  if (rank >= 1.5) return "low";
  return "very-low";
}

function averageConfidence(values: CaseConfidence[]): CaseConfidence {
  if (values.length === 0) return "very-low";

  const average =
    values.reduce((total, value) => total + confidenceRank(value), 0) /
    values.length;

  return confidenceFromRank(average);
}

function severityFromCount(count: number): CaseSeverity {
  if (count >= 4) return "high";
  if (count >= 2) return "medium";
  if (count === 1) return "low";
  return "info";
}

function buildAmounts(input: DamagesRemedyBuildInput): DamagesAmount[] {
  return (input.requestedAmounts || []).map((amount) => ({
    id: amount.id || createId("damages_amount"),
    category: amount.category || "unknown",
    label: amount.label,
    amount: amount.amount,
    currency: amount.currency || "CAD",
    rawText: amount.rawText,
    calculationExplanation: amount.calculationExplanation,
    confidence:
      typeof amount.amount === "number" && amount.calculationExplanation
        ? "medium"
        : typeof amount.amount === "number"
          ? "low"
          : "very-low",
  }));
}

function buildProofRequirements(
  input: DamagesRemedyBuildInput,
  amounts: DamagesAmount[],
): DamagesProofRequirement[] {
  if (amounts.length === 0) {
    return [
      {
        id: createId("damages_proof"),
        category: "unknown",
        requiredProof:
          "If money is requested, the system needs the amount, category, calculation, and supporting evidence.",
        availableEvidenceIds: input.linkedEvidenceIds || [],
        missingEvidence: [
          "Damages amount",
          "Calculation explanation",
          "Evidence supporting the requested amount",
        ],
        explanation:
          "No structured damages amount has been captured yet.",
        strength: "very-low",
      },
    ];
  }

  return amounts.map((amount) => {
    const linkedEvidenceIds = input.requestedAmounts?.find(
      (item) => item.id === amount.id,
    )?.linkedEvidenceIds || input.linkedEvidenceIds || [];

    const missingEvidence = [
      ...(typeof amount.amount !== "number" ? ["Specific amount requested"] : []),
      ...(!amount.calculationExplanation ? ["Calculation explanation"] : []),
      ...(linkedEvidenceIds.length === 0 ? ["Supporting evidence"] : []),
    ];

    return {
      id: createId("damages_proof"),
      category: amount.category,
      requiredProof:
        "The damages amount should be supported by evidence, explanation, causation, and proportionality.",
      availableEvidenceIds: linkedEvidenceIds,
      missingEvidence,
      explanation:
        "Damages are stronger when the amount, calculation, proof, and connection to the claim are clear.",
      strength:
        missingEvidence.length === 0
          ? "high"
          : missingEvidence.length <= 1
            ? "medium"
            : "low",
    };
  });
}

function buildCausationLinks(
  input: DamagesRemedyBuildInput,
): DamagesCausationLink[] {
  if (
    (input.linkedTimelineEventIds || []).length === 0 &&
    (input.linkedEvidenceIds || []).length === 0
  ) {
    return [
      {
        id: createId("damages_causation"),
        linkedTimelineEventIds: [],
        linkedEvidenceIds: [],
        explanation:
          "No timeline or evidence links currently connect the requested remedy/damages to the alleged events.",
        gaps: [
          "Timeline event connecting conduct to harm",
          "Evidence showing the harm or loss",
          "Explanation of how the event caused the loss",
        ],
        strength: "very-low",
      },
    ];
  }

  return [
    {
      id: createId("damages_causation"),
      linkedTimelineEventIds: input.linkedTimelineEventIds || [],
      linkedEvidenceIds: input.linkedEvidenceIds || [],
      explanation:
        "The damages/remedy model has at least some timeline or evidence linkage, but causation still needs claim-specific review.",
      gaps: [
        ...(input.linkedTimelineEventIds?.length ? [] : ["Timeline connection"]),
        ...(input.linkedEvidenceIds?.length ? [] : ["Evidence connection"]),
        "Causation explanation",
      ],
      strength:
        (input.linkedTimelineEventIds || []).length > 0 &&
        (input.linkedEvidenceIds || []).length > 0
          ? "medium"
          : "low",
    },
  ];
}

function buildRemedyAssessments(
  input: DamagesRemedyBuildInput,
  amounts: DamagesAmount[],
): RemedyAssessment[] {
  const requested = input.requestedRemedies || [];

  if (requested.length === 0 && amounts.length > 0) {
    return amounts.map((amount) => ({
      id: createId("remedy_assessment"),
      remedyCategory: "money",
      requestedLabel: amount.label,
      requestedAmountId: amount.id,
      fit: "possibly-available",
      linkedClaimTheoryIds: [],
      linkedEvidenceIds: input.linkedEvidenceIds || [],
      proofNeeded: [
        "Calculation explanation",
        "Evidence supporting amount",
        "Causation explanation",
      ],
      warnings: [
        "Money remedy appears requested, but forum, claim type, and proof must be confirmed.",
      ],
      alternatives: [],
      confidence: "medium",
    }));
  }

  return requested.map((remedy) => ({
    id: remedy.id || createId("remedy_assessment"),
    remedyCategory: remedy.remedyCategory,
    requestedLabel: remedy.label,
    fit: "possibly-available",
    linkedClaimTheoryIds: remedy.linkedClaimTheoryIds || [],
    linkedEvidenceIds: remedy.linkedEvidenceIds || [],
    proofNeeded: [
      "Legal availability",
      "Procedural fit",
      "Evidence support",
      "Remedy-specific proof",
    ],
    warnings: [
      "Remedy fit must be checked against forum, claim type, procedural stage, and available proof.",
    ],
    alternatives: [],
    confidence: "low",
  }));
}

function buildRisk(args: {
  riskType: DamagesRisk["riskType"];
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  linkedAmountIds?: string[];
  linkedRemedyIds?: string[];
  linkedEvidenceIds?: string[];
}): DamagesRisk {
  return {
    id: createId("damages_risk"),
    riskType: args.riskType,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
    linkedAmountIds: args.linkedAmountIds || [],
    linkedRemedyIds: args.linkedRemedyIds || [],
    linkedEvidenceIds: args.linkedEvidenceIds || [],
  };
}

function buildRisks(args: {
  amounts: DamagesAmount[];
  proofRequirements: DamagesProofRequirement[];
  causationLinks: DamagesCausationLink[];
  remedies: RemedyAssessment[];
}): DamagesRisk[] {
  const risks: DamagesRisk[] = [];

  for (const proof of args.proofRequirements) {
    if (proof.missingEvidence.length > 0) {
      risks.push(
        buildRisk({
          riskType: "proof-gap",
          severity: severityFromCount(proof.missingEvidence.length),
          title: "Damages proof gap",
          explanation: proof.explanation,
          suggestedFix: `Add: ${proof.missingEvidence.join("; ")}.`,
          linkedEvidenceIds: proof.availableEvidenceIds,
        }),
      );
    }
  }

  for (const causation of args.causationLinks) {
    if (causation.strength === "very-low" || causation.strength === "low") {
      risks.push(
        buildRisk({
          riskType: "causation-gap",
          severity: "medium",
          title: "Damages causation gap",
          explanation: causation.explanation,
          suggestedFix:
            "Connect the claimed loss or remedy to specific facts, timeline events, and evidence.",
          linkedEvidenceIds: causation.linkedEvidenceIds,
        }),
      );
    }
  }

  for (const remedy of args.remedies) {
    if (remedy.fit === "weak-fit" || remedy.fit === "wrong-forum") {
      risks.push(
        buildRisk({
          riskType: "wrong-remedy",
          severity: "high",
          title: "Remedy may not fit the forum",
          explanation:
            "The requested remedy may not match the court path, claim type, or procedural stage.",
          suggestedFix:
            "Confirm forum, claim type, and legal availability before generating documents.",
          linkedRemedyIds: [remedy.id],
          linkedEvidenceIds: remedy.linkedEvidenceIds,
        }),
      );
    }
  }

  for (const amount of args.amounts) {
    if (typeof amount.amount === "number" && !amount.calculationExplanation) {
      risks.push(
        buildRisk({
          riskType: "amount-unsupported",
          severity: "medium",
          title: "Amount needs calculation explanation",
          explanation:
            "The amount is captured, but the calculation or basis is not explained.",
          suggestedFix:
            "Break the amount into categories and explain how it was calculated.",
          linkedAmountIds: [amount.id],
        }),
      );
    }
  }

  return risks;
}

function buildReadiness(args: {
  amounts: DamagesAmount[];
  proofRequirements: DamagesProofRequirement[];
  causationLinks: DamagesCausationLink[];
  remedies: RemedyAssessment[];
  risks: DamagesRisk[];
}): DamagesReadinessState {
  const amountReadiness = averageConfidence(args.amounts.map((amount) => amount.confidence));
  const proofReadiness = averageConfidence(args.proofRequirements.map((proof) => proof.strength));
  const causationReadiness = averageConfidence(args.causationLinks.map((link) => link.strength));
  const remedyFitReadiness = averageConfidence(args.remedies.map((remedy) => remedy.confidence));

  const blockers = args.risks
    .filter((risk) => risk.severity === "high" || risk.severity === "critical")
    .map((risk) => risk.title);

  const nextDamagesActions = uniqueStrings([
    ...args.risks.slice(0, 6).map((risk) => risk.suggestedFix),
    "Connect each requested amount or remedy to facts, evidence, and causation.",
    "Check proportionality and forum fit before generating court documents.",
  ]);

  return {
    overallReadiness: averageConfidence([
      amountReadiness,
      proofReadiness,
      causationReadiness,
      remedyFitReadiness,
    ]),
    amountReadiness,
    proofReadiness,
    causationReadiness,
    proportionalityReadiness: "low",
    remedyFitReadiness,
    settlementReadiness: "low",
    blockers,
    nextDamagesActions,
  };
}

export function buildDamagesRemedyModel(
  input: DamagesRemedyBuildInput,
): DamagesRemedyBuildOutput {
  const timestamp = nowIso();

  const amounts = buildAmounts(input);
  const proofRequirements = buildProofRequirements(input, amounts);
  const causationLinks = buildCausationLinks(input);
  const remedyAssessments = buildRemedyAssessments(input, amounts);

  const risks = buildRisks({
    amounts,
    proofRequirements,
    causationLinks,
    remedies: remedyAssessments,
  });

  const readiness = buildReadiness({
    amounts,
    proofRequirements,
    causationLinks,
    remedies: remedyAssessments,
    risks,
  });

  const warnings = uniqueStrings([
    ...risks.map((risk) => risk.title),
    ...(amounts.length === 0 ? ["No structured damages amount captured."] : []),
  ]);

  const confidence = averageConfidence([
    readiness.amountReadiness,
    readiness.proofReadiness,
    readiness.causationReadiness,
    readiness.remedyFitReadiness,
  ]);

  const model: DamagesRemedyModel = {
    id: createId("damages_remedy_model"),
    version: "1.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,
    stage: input.stage,

    legalDomains: input.legalDomains,

    amounts,
    proofRequirements,
    causationLinks,
    remedyAssessments,
    risks,

    readiness,

    warnings,
    confidence,
  };

  return {
    model,
    warnings,
  };
}