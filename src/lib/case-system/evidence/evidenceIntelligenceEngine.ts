import {
  EvidenceContradiction,
  EvidenceGap,
  EvidenceIntelligenceFinding,
  EvidenceIntelligenceResult,
  EvidenceStrength,
} from "./evidenceIntelligenceTypes";

import {
  ExtractedEvidence,
  IntelligenceConfidence,
  IntelligenceSeverity,
  NormalizedIntake,
} from "../intelligence/intelligenceTypes";

import { FactPatternAnalysisResult } from "../facts/factPatternTypes";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function strengthFromConfidence(confidence: IntelligenceConfidence): EvidenceStrength {
  if (confidence === "very-high") return "very-strong";
  if (confidence === "high") return "strong";
  if (confidence === "medium") return "moderate";
  if (confidence === "low") return "weak";
  return "very-weak";
}

function severityFromEvidence(item: ExtractedEvidence): IntelligenceSeverity {
  if (item.admissibilityConcerns.some((concern) => concern.severity === "critical")) {
    return "critical";
  }

  if (item.admissibilityConcerns.some((concern) => concern.severity === "high")) {
    return "high";
  }

  if (item.gaps.length > 0) {
    return "medium";
  }

  return "low";
}

function buildEvidenceFinding(item: ExtractedEvidence): EvidenceIntelligenceFinding {
  const strength = strengthFromConfidence(item.strength);

  return {
    id: createId("evidence_intelligence"),
    title: item.title || "Evidence item",
    explanation:
      clean(item.description) ||
      clean(item.sourceText) ||
      "Evidence item requires review, context, authentication, and proof mapping.",
    confidence: item.strength,
    strength,
    supportingEvidenceIds: [item.id],
    litigationImpact:
      item.gaps.length > 0 || item.admissibilityConcerns.length > 0
        ? "This evidence may help the case but needs missing context, authentication, admissibility review, or clearer proof linkage before court use."
        : "This evidence may support the case if it is relevant, authentic, complete, and linked to a required fact or issue.",
  };
}

function buildEvidenceGaps(item: ExtractedEvidence): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  for (const gap of item.gaps) {
    gaps.push({
      id: createId("evidence_gap"),
      title: `Evidence gap: ${item.title}`,
      explanation: gap,
      severity: severityFromEvidence(item),
      recommendedEvidence: [
        "Add dates, source, sender/recipient, full context, and connection to the issue.",
        "Confirm how this evidence proves a required fact or element.",
      ],
    });
  }

  for (const concern of item.admissibilityConcerns) {
    gaps.push({
      id: createId("evidence_gap"),
      title: `Admissibility concern: ${item.title}`,
      explanation: concern.explanation,
      severity: concern.severity,
      recommendedEvidence: [concern.suggestedFix],
    });
  }

  return gaps;
}

function buildMissingEvidenceGaps(args: {
  intake: NormalizedIntake;
  factPatternAnalysis?: FactPatternAnalysisResult;
}): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  if (args.intake.evidence.length === 0) {
    gaps.push({
      id: createId("evidence_gap"),
      title: "No evidence identified",
      explanation:
        "The current intake does not identify evidence that can be linked to the major facts, claims, or requested outcomes.",
      severity: "high",
      recommendedEvidence: [
        "Upload or describe documents, messages, receipts, photos, emails, records, orders, transcripts, or witness information.",
        "Link each major fact to at least one evidence item.",
      ],
    });
  }

  if (args.factPatternAnalysis?.admissions.length) {
    gaps.push({
      id: createId("evidence_gap"),
      title: "Admission evidence needs preservation",
      explanation:
        "Fact Pattern Analysis detected possible admissions. Exact words, speaker, recipient, date, and context should be preserved before relying on them.",
      severity: "medium",
      recommendedEvidence: [
        "Screenshot or export the full conversation.",
        "Preserve the exact words and surrounding context.",
        "Identify who made the admission and when.",
      ],
    });
  }

  if (args.factPatternAnalysis?.contradictions.length) {
    gaps.push({
      id: createId("evidence_gap"),
      title: "Contradiction evidence needs comparison",
      explanation:
        "Fact Pattern Analysis detected possible contradictions. The system needs the records or messages that show both sides of the conflict.",
      severity: "high",
      recommendedEvidence: [
        "Collect the statement being contradicted.",
        "Collect the record, message, date, or document that contradicts it.",
        "Create a side-by-side comparison.",
      ],
    });
  }

  if (args.factPatternAnalysis?.timelineIssues.length && args.intake.dates.length === 0) {
    gaps.push({
      id: createId("evidence_gap"),
      title: "Timeline evidence missing",
      explanation:
        "Fact Pattern Analysis detected timeline significance, but no extracted dates are available.",
      severity: "high",
      recommendedEvidence: [
        "Build a date-by-date chronology.",
        "Add documents or messages confirming each important date.",
      ],
    });
  }

  if (args.factPatternAnalysis?.damagesIndicators.length && args.intake.moneyAmounts.length === 0) {
    gaps.push({
      id: createId("evidence_gap"),
      title: "Damages evidence missing",
      explanation:
        "Fact Pattern Analysis detected harm or damages, but no money amounts were extracted.",
      severity: "medium",
      recommendedEvidence: [
        "Add receipts, invoices, repair estimates, income records, expense records, or calculations.",
        "Separate claimed damages from proven damages.",
      ],
    });
  }

  return gaps;
}

function buildEvidenceContradictions(args: {
  intake: NormalizedIntake;
  factPatternAnalysis?: FactPatternAnalysisResult;
}): EvidenceContradiction[] {
  const contradictions: EvidenceContradiction[] = [];

  if (args.factPatternAnalysis?.contradictions.length) {
    contradictions.push({
      id: createId("evidence_contradiction"),
      title: "Fact pattern contradiction requires evidence review",
      explanation:
        "Fact Pattern Analysis detected possible contradictions. Evidence should be compared to determine whether the conflict is real, explainable, or harmful.",
      evidenceIds: unique(args.intake.evidence.map((item) => item.id)),
      severity: "high",
    });
  }

  const incompleteEvidence = args.intake.evidence.filter(
    (item) =>
      item.gaps.length > 0 ||
      item.admissibilityConcerns.some(
        (concern) =>
          concern.concern === "incomplete-record" ||
          concern.concern === "missing-context",
      ),
  );

  if (incompleteEvidence.length > 0) {
    contradictions.push({
      id: createId("evidence_contradiction"),
      title: "Incomplete evidence may create context conflict",
      explanation:
        "One or more evidence items are incomplete or missing context. Incomplete records can create disputes about meaning, reliability, or credibility.",
      evidenceIds: incompleteEvidence.map((item) => item.id),
      severity: "medium",
    });
  }

  return contradictions;
}

export function buildEvidenceIntelligenceAnalysis(args: {
  intake: NormalizedIntake;
  factPatternAnalysis?: FactPatternAnalysisResult;
}): EvidenceIntelligenceResult {
  const findings = args.intake.evidence.map(buildEvidenceFinding);

  const gaps = [
    ...args.intake.evidence.flatMap(buildEvidenceGaps),
    ...buildMissingEvidenceGaps({
      intake: args.intake,
      factPatternAnalysis: args.factPatternAnalysis,
    }),
  ];

  const contradictions = buildEvidenceContradictions({
    intake: args.intake,
    factPatternAnalysis: args.factPatternAnalysis,
  });

  const strongestEvidence = findings
    .filter(
      (finding) =>
        finding.strength === "strong" || finding.strength === "very-strong",
    )
    .map((finding) => finding.title);

  const weakestEvidence = findings
    .filter(
      (finding) =>
        finding.strength === "weak" || finding.strength === "very-weak",
    )
    .map((finding) => finding.title);

  const recommendedEvidenceCollection = unique([
    ...gaps.flatMap((gap) => gap.recommendedEvidence),
    findings.length === 0 ? "Collect and upload evidence for each major fact." : "",
    "Link every major fact to evidence before generating final court materials.",
  ]);

  return {
    version: "1.0.0",
    findings,
    contradictions,
    gaps,
    strongestEvidence,
    weakestEvidence,
    recommendedEvidenceCollection,
    summary:
      findings.length > 0
        ? `Evidence intelligence reviewed ${findings.length} evidence item(s), found ${gaps.length} gap(s), and flagged ${contradictions.length} contradiction/context issue(s).`
        : "Evidence intelligence found no evidence items to analyze.",
  };
}