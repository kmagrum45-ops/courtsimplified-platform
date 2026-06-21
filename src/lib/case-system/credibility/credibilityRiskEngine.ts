import { CaseConfidence, CaseSeverity } from "../architecture/masterCaseSchema";

import {
  CredibilityConcernType,
  CredibilityCorrectionAction,
  CredibilityReadinessState,
  CredibilityRiskBuildInput,
  CredibilityRiskBuildOutput,
  CredibilityRiskModel,
  CredibilitySignal,
  JudicialRiskCategory,
  JudicialRiskFinding,
} from "./credibilityRiskArchitecture";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item: string) => item.trim()).filter(Boolean)));
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
    values.reduce((total: number, value: CaseConfidence) => total + confidenceRank(value), 0) /
    values.length;

  return confidenceFromRank(average);
}

function severityFromText(text: string): CaseSeverity {
  const lower = text.toLowerCase();

  if (
    lower.includes("critical") ||
    lower.includes("deadline") ||
    lower.includes("limitation") ||
    lower.includes("urgent")
  ) {
    return "high";
  }

  if (
    lower.includes("missing") ||
    lower.includes("unclear") ||
    lower.includes("unsupported") ||
    lower.includes("weak")
  ) {
    return "medium";
  }

  return "low";
}

function concernTypeFromText(text: string): CredibilityConcernType {
  const lower = text.toLowerCase();

  if (lower.includes("timeline") || lower.includes("date")) return "timeline-conflict";
  if (lower.includes("unsupported") || lower.includes("proof") || lower.includes("evidence")) return "unsupported-allegation";
  if (lower.includes("context")) return "missing-context";
  if (lower.includes("damages") || lower.includes("amount") || lower.includes("calculation")) return "damages-proportionality";
  if (lower.includes("causation") || lower.includes("caused")) return "weak-causation";
  if (lower.includes("procedure") || lower.includes("filed") || lower.includes("served")) return "procedural-noncompliance";
  if (lower.includes("relief") || lower.includes("remedy")) return "unclear-relief";

  return "unsupported-allegation";
}

function categoryFromConcern(type: CredibilityConcernType): JudicialRiskCategory {
  if (
    type === "timeline-conflict" ||
    type === "inconsistency" ||
    type === "changing-story" ||
    type === "emotional-overstatement" ||
    type === "exaggeration-risk"
  ) {
    return "credibility";
  }

  if (
    type === "unsupported-allegation" ||
    type === "missing-context" ||
    type === "selective-evidence"
  ) {
    return "evidence";
  }

  if (type === "damages-proportionality") return "damages";
  if (type === "weak-causation") return "proportionality";
  if (type === "procedural-noncompliance") return "procedure";
  if (type === "unclear-relief") return "remedy";

  return "unknown";
}

function buildSignal(args: {
  text: string;
  source: CredibilitySignal["source"];
  input: CredibilityRiskBuildInput;
}): CredibilitySignal {
  const concernType = concernTypeFromText(args.text);
  const severity = severityFromText(args.text);

  return {
    id: createId("credibility_signal"),
    concernType,
    title: concernType
      .split("-")
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    description: args.text,
    source: args.source,
    linkedClaimDomains: args.input.legalDomains,
    linkedEvidenceIds: args.input.linkedEvidenceIds || [],
    linkedTimelineEventIds: args.input.linkedTimelineEventIds || [],
    severity,
    confidence: severity === "high" ? "medium" : "low",
  };
}

function buildSignals(input: CredibilityRiskBuildInput): CredibilitySignal[] {
  return [
    ...(input.timelineWarnings || []).map((warning: string) =>
      buildSignal({ text: warning, source: "timeline", input }),
    ),
    ...(input.evidenceWarnings || []).map((warning: string) =>
      buildSignal({ text: warning, source: "evidence", input }),
    ),
    ...(input.procedureWarnings || []).map((warning: string) =>
      buildSignal({ text: warning, source: "procedure", input }),
    ),
    ...(input.damagesWarnings || []).map((warning: string) =>
      buildSignal({ text: warning, source: "damages", input }),
    ),
    ...(input.claimWarnings || []).map((warning: string) =>
      buildSignal({ text: warning, source: "claim-theory", input }),
    ),
  ];
}

function buildJudicialFinding(signal: CredibilitySignal): JudicialRiskFinding {
  const category = categoryFromConcern(signal.concernType);

  return {
    id: createId("judicial_risk"),
    category,
    severity: signal.severity,
    title: signal.title,
    whyCourtMayCare:
      category === "evidence"
        ? "A court may need clearer proof before accepting this point."
        : category === "procedure"
          ? "A court may focus on whether procedural steps, service, deadlines, and required materials were handled correctly."
          : category === "damages"
            ? "A court may need a clear explanation of how the amount was calculated and why it is supported."
            : category === "credibility"
              ? "A court may be concerned if the story is inconsistent, unclear, unsupported, or difficult to follow."
              : "A court may need this issue clarified before relying on it.",
    howToAddress:
      category === "evidence"
        ? "Link this issue to specific evidence and explain what the evidence proves."
        : category === "procedure"
          ? "Confirm the procedural step, date, service status, deadline, and required material."
          : category === "damages"
            ? "Break down the amount, connect it to evidence, and explain causation."
            : category === "credibility"
              ? "Clarify the timeline, avoid overstatement, and support important claims with evidence."
              : "Clarify the issue and connect it to the case record.",
    linkedSignalIds: [signal.id],
    linkedEvidenceIds: signal.linkedEvidenceIds,
    linkedTimelineEventIds: signal.linkedTimelineEventIds,
    linkedClaimDomains: signal.linkedClaimDomains,
    confidence: signal.confidence,
  };
}

function buildCorrectionAction(finding: JudicialRiskFinding): CredibilityCorrectionAction {
  return {
    id: createId("credibility_action"),
    title: `Address: ${finding.title}`,
    explanation: finding.howToAddress,
    priority:
      finding.severity === "critical" || finding.severity === "high"
        ? "high"
        : finding.severity === "medium"
          ? "medium"
          : "low",
    addressesFindingIds: [finding.id],
    recommendedUserAction: finding.howToAddress,
  };
}

function buildReadiness(args: {
  signals: CredibilitySignal[];
  findings: JudicialRiskFinding[];
  actions: CredibilityCorrectionAction[];
}): CredibilityReadinessState {
  const highFindings = args.findings.filter(
    (finding: JudicialRiskFinding) =>
      finding.severity === "high" || finding.severity === "critical",
  );

  const mediumFindings = args.findings.filter(
    (finding: JudicialRiskFinding) => finding.severity === "medium",
  );

  const consistencyReadiness: CaseConfidence = args.signals.some(
    (signal: CredibilitySignal) =>
      signal.concernType === "timeline-conflict" ||
      signal.concernType === "inconsistency" ||
      signal.concernType === "changing-story",
  )
    ? "low"
    : "medium";

  const evidenceSupportReadiness: CaseConfidence = args.signals.some(
    (signal: CredibilitySignal) =>
      signal.concernType === "unsupported-allegation" ||
      signal.concernType === "missing-context" ||
      signal.concernType === "selective-evidence",
  )
    ? "low"
    : "medium";

  const proportionalityReadiness: CaseConfidence = args.signals.some(
    (signal: CredibilitySignal) =>
      signal.concernType === "damages-proportionality" ||
      signal.concernType === "weak-causation",
  )
    ? "low"
    : "medium";

  const proceduralReadiness: CaseConfidence = args.signals.some(
    (signal: CredibilitySignal) => signal.concernType === "procedural-noncompliance",
  )
    ? "low"
    : "medium";

  const courtroomReadiness: CaseConfidence =
    highFindings.length > 0 ? "low" : mediumFindings.length > 0 ? "medium" : "high";

  return {
    overallReadiness: averageConfidence([
      consistencyReadiness,
      evidenceSupportReadiness,
      proportionalityReadiness,
      proceduralReadiness,
      courtroomReadiness,
    ]),
    consistencyReadiness,
    evidenceSupportReadiness,
    proportionalityReadiness,
    proceduralReadiness,
    courtroomReadiness,
    blockers: highFindings.map((finding: JudicialRiskFinding) => finding.title),
    nextCredibilityActions: uniqueStrings([
      ...args.actions.slice(0, 8).map(
        (action: CredibilityCorrectionAction) => action.recommendedUserAction,
      ),
      "Review the case for consistency, evidence support, proportionality, and procedural clarity before filing or hearing preparation.",
    ]),
  };
}

export function buildCredibilityRiskModel(
  input: CredibilityRiskBuildInput,
): CredibilityRiskBuildOutput {
  const timestamp = nowIso();

  const signals = buildSignals(input);
  const judicialRiskFindings = signals.map((signal: CredibilitySignal) =>
    buildJudicialFinding(signal),
  );
  const correctionActions = judicialRiskFindings.map((finding: JudicialRiskFinding) =>
    buildCorrectionAction(finding),
  );

  const readiness = buildReadiness({
    signals,
    findings: judicialRiskFindings,
    actions: correctionActions,
  });

  const warnings = uniqueStrings([
    ...signals.map((signal: CredibilitySignal) => signal.title),
    ...judicialRiskFindings.map((finding: JudicialRiskFinding) => finding.title),
  ]);

  const confidence = averageConfidence([
    readiness.consistencyReadiness,
    readiness.evidenceSupportReadiness,
    readiness.proportionalityReadiness,
    readiness.proceduralReadiness,
    readiness.courtroomReadiness,
  ]);

  return {
    model: {
      id: createId("credibility_risk_model"),
      version: "1.0.0",
      createdAt: timestamp,
      updatedAt: timestamp,

      caseId: input.caseId,
      stage: input.stage,

      signals,
      judicialRiskFindings,
      correctionActions,

      readiness,

      warnings,
      confidence,
    },
    warnings,
  };
}