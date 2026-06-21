import {
  CaseConfidence,
  CaseSeverity,
} from "../architecture/masterCaseSchema";

import {
  ClaimTheory,
  ClaimTheoryArbitrationResult,
  ClaimTheoryBuildInput,
  ClaimTheoryBuildOutput,
  ClaimTheoryElement,
  ClaimTheoryModel,
  ClaimTheoryRisk,
  ClaimTheoryStatus,
} from "./claimTheoryArchitecture";

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

function normalizeTheoryStatus(args: {
  status?: ClaimTheoryStatus;
  score: number;
  suppressionReason?: string;
}): ClaimTheoryStatus {
  if (args.suppressionReason) return "suppressed";
  if (args.status) return args.status;
  if (args.score >= 70) return "dominant";
  if (args.score >= 50) return "active";
  if (args.score >= 30) return "possible";
  return "rejected";
}

function severityFromMissingCount(count: number): CaseSeverity {
  if (count >= 4) return "high";
  if (count >= 2) return "medium";
  if (count === 1) return "low";
  return "info";
}

function buildGenericElement(args: {
  theoryId: string;
  label: string;
  missingFacts: string[];
  supportingEvidenceIds: string[];
  supportingTimelineEventIds: string[];
  confidence: CaseConfidence;
}): ClaimTheoryElement {
  const hasSupport =
    args.supportingEvidenceIds.length > 0 ||
    args.supportingTimelineEventIds.length > 0;

  return {
    id: createId("claim_element"),
    key: "general-proof",
    label: args.label,
    description:
      "General claim support based on facts, evidence, timeline, and missing-information analysis.",
    status:
      args.missingFacts.length === 0 && hasSupport
        ? "satisfied"
        : args.missingFacts.length > 0 && hasSupport
          ? "partially-satisfied"
          : "missing",
    supportingFactIds: [],
    supportingEvidenceIds: args.supportingEvidenceIds,
    supportingTimelineEventIds: args.supportingTimelineEventIds,
    missingFacts: args.missingFacts,
    missingEvidence:
      args.supportingEvidenceIds.length === 0
        ? ["Evidence should be linked to this theory."]
        : [],
    risks:
      args.missingFacts.length > 0
        ? ["This theory has missing facts that should be clarified."]
        : [],
    confidence: args.confidence,
  };
}

function buildTheoryRisk(args: {
  riskType: ClaimTheoryRisk["riskType"];
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  linkedElementIds?: string[];
  linkedEvidenceIds?: string[];
}): ClaimTheoryRisk {
  return {
    id: createId("claim_risk"),
    riskType: args.riskType,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
    linkedElementIds: args.linkedElementIds || [],
    linkedEvidenceIds: args.linkedEvidenceIds || [],
  };
}

function buildTheoryRisks(args: {
  elements: ClaimTheoryElement[];
  missingFacts: string[];
  supportingEvidenceIds: string[];
  candidateRisks: string[];
}): ClaimTheoryRisk[] {
  const risks: ClaimTheoryRisk[] = [];

  if (args.missingFacts.length > 0) {
    risks.push(
      buildTheoryRisk({
        riskType: "missing-element",
        severity: severityFromMissingCount(args.missingFacts.length),
        title: "Missing facts for claim theory",
        explanation:
          "This claim theory has missing factual details that may affect pleading, proof, or strategy.",
        suggestedFix:
          "Clarify the missing facts before treating this theory as court-ready.",
        linkedElementIds: args.elements.map((element) => element.id),
      }),
    );
  }

  if (args.supportingEvidenceIds.length === 0) {
    risks.push(
      buildTheoryRisk({
        riskType: "weak-evidence",
        severity: "medium",
        title: "No evidence linked to claim theory",
        explanation:
          "This theory is not yet linked to supporting evidence.",
        suggestedFix:
          "Link screenshots, documents, witnesses, messages, records, or other proof to this theory.",
      }),
    );
  }

  for (const risk of args.candidateRisks) {
    risks.push(
      buildTheoryRisk({
        riskType: "unknown",
        severity: "medium",
        title: "Imported claim theory risk",
        explanation: risk,
        suggestedFix:
          "Review this risk and connect it to facts, evidence, procedure, or legal knowledge.",
      }),
    );
  }

  return risks;
}

function buildClaimTheory(
  candidate: ClaimTheoryBuildInput["claimCandidates"][number],
): ClaimTheory {
  const score = candidate.score ?? 0;
  const confidence = candidate.confidence || "medium";

  const status = normalizeTheoryStatus({
    status: candidate.status,
    score,
    suppressionReason: candidate.suppressionReason,
  });

  const supportingEvidenceIds = candidate.supportingEvidenceIds || [];
  const supportingTimelineEventIds = candidate.supportingTimelineEventIds || [];
  const missingFacts = candidate.missingFacts || [];

  const element = buildGenericElement({
    theoryId: candidate.id || "",
    label: `${candidate.domain} theory support`,
    missingFacts,
    supportingEvidenceIds,
    supportingTimelineEventIds,
    confidence,
  });

  const risks = buildTheoryRisks({
    elements: [element],
    missingFacts,
    supportingEvidenceIds,
    candidateRisks: candidate.risks || [],
  });

  return {
    id: candidate.id || createId("claim_theory"),
    version: "1.0.0",

    domain: candidate.domain,
    title: candidate.title,
    status,

    source: "claim-arbitration",
    explanation: candidate.explanation,

    score,
    confidence,

    elements: [element],
    burdens: [
      {
        id: createId("claim_burden"),
        issueLabel: `${candidate.domain} proof burden`,
        burdenHolder: "user",
        standard: "balance-of-probabilities",
        whatMustBeProven: [
          "Facts supporting the theory",
          "Evidence connecting the facts to the theory",
          "Relief or outcome connected to the theory",
        ],
        currentProofStrength: supportingEvidenceIds.length > 0 ? "medium" : "low",
        missingProof: [
          ...missingFacts,
          ...(supportingEvidenceIds.length === 0
            ? ["Supporting evidence is not yet linked."]
            : []),
        ],
        linkedEvidenceIds: supportingEvidenceIds,
        linkedTimelineEventIds: supportingTimelineEventIds,
        explanation:
          "The claim theory must be supported by facts, evidence, and a coherent litigation narrative.",
      },
    ],
    remedies: [],
    risks,
    compatibility: [],
    suppression: candidate.suppressionReason
      ? {
          id: createId("claim_suppression"),
          reason: candidate.suppressionReason,
          suppressedBecause: "dominant-narrative",
          canBeRevivedIf: [
            "New facts directly support this theory.",
            "The dominant narrative changes after review.",
            "Human review reclassifies this theory.",
          ],
        }
      : undefined,

    linkedFactIds: [],
    linkedEvidenceIds: supportingEvidenceIds,
    linkedTimelineEventIds: supportingTimelineEventIds,
    linkedProceduralIssueIds: [],
    linkedKnowledgeObjectIds: [],

    arbitrationNotes: [
      candidate.explanation,
      ...(candidate.suppressionReason ? [candidate.suppressionReason] : []),
    ],
  };
}

function buildArbitrationResult(theories: ClaimTheory[]): ClaimTheoryArbitrationResult {
  const dominant = theories.filter((theory) => theory.status === "dominant");
  const active = theories.filter((theory) => theory.status === "active");
  const secondary = theories.filter((theory) => theory.status === "secondary");
  const alternative = theories.filter((theory) => theory.status === "alternative");
  const suppressed = theories.filter((theory) => theory.status === "suppressed");
  const rejected = theories.filter((theory) => theory.status === "rejected");

  const effectiveDominant =
    dominant.length > 0
      ? dominant
      : active.length > 0
        ? [active[0]]
        : [];

  return {
    id: createId("claim_arbitration"),
    dominantClaimTheoryIds: effectiveDominant.map((theory) => theory.id),
    activeClaimTheoryIds: active.map((theory) => theory.id),
    secondaryClaimTheoryIds: secondary.map((theory) => theory.id),
    alternativeClaimTheoryIds: alternative.map((theory) => theory.id),
    suppressedClaimTheoryIds: suppressed.map((theory) => theory.id),
    rejectedClaimTheoryIds: rejected.map((theory) => theory.id),

    explanation:
      effectiveDominant.length > 0
        ? "The model identified a dominant or strongest active claim theory. Downstream systems should prioritize this theory and treat suppressed/rejected theories as audit-only."
        : "No dominant claim theory was identified. More facts are needed before downstream systems should generate strong litigation outputs.",
    warnings: uniqueStrings([
      ...(suppressed.length > 0
        ? ["Some theories were suppressed and should remain audit-only."]
        : []),
      ...(rejected.length > 0
        ? ["Some theories were rejected and should not drive forms, evidence, or strategy."]
        : []),
      ...(effectiveDominant.length === 0
        ? ["No dominant claim theory is currently available."]
        : []),
    ]),
    confidence: averageConfidence(theories.map((theory) => theory.confidence)),
  };
}

function buildGlobalRisks(theories: ClaimTheory[]): ClaimTheoryRisk[] {
  const risks: ClaimTheoryRisk[] = [];

  if (!theories.some((theory) => theory.status === "dominant")) {
    risks.push(
      buildTheoryRisk({
        riskType: "conflicting-theory",
        severity: "medium",
        title: "No dominant theory confirmed",
        explanation:
          "The system has not confirmed a dominant claim theory. This can weaken routing, forms, evidence mapping, and document generation.",
        suggestedFix:
          "Clarify the main legal theory and confirm which facts support it.",
      }),
    );
  }

  const suppressedOrRejected = theories.filter(
    (theory) => theory.status === "suppressed" || theory.status === "rejected",
  );

  if (suppressedOrRejected.length > 0) {
    risks.push(
      buildTheoryRisk({
        riskType: "conflicting-theory",
        severity: "low",
        title: "Suppressed or rejected theories preserved for audit",
        explanation:
          "Some theories were not allowed to drive the active litigation model but remain visible for transparency.",
        suggestedFix:
          "Do not use suppressed or rejected theories unless new facts justify revival.",
      }),
    );
  }

  return risks;
}

export function buildClaimTheoryModel(
  input: ClaimTheoryBuildInput,
): ClaimTheoryBuildOutput {
  const timestamp = nowIso();

  const theories = input.claimCandidates.map(buildClaimTheory);
  const arbitration = buildArbitrationResult(theories);
  const globalRisks = buildGlobalRisks(theories);

  const warnings = uniqueStrings([
    ...arbitration.warnings,
    ...globalRisks.map((risk) => risk.title),
    ...theories.flatMap((theory) => theory.risks.map((risk) => risk.title)),
  ]);

  const confidence = averageConfidence([
    arbitration.confidence,
    ...theories.map((theory) => theory.confidence),
  ]);

  const model: ClaimTheoryModel = {
    id: createId("claim_theory_model"),
    version: "1.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,
    stage: input.stage,

    theories,
    arbitration,

    globalRisks,
    warnings,
    confidence,
  };

  return {
    model,
    warnings,
  };
}