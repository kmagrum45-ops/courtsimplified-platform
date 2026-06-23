import {
  FactPatternEngineInput,
  FactPatternEngineOutput,
  FactPatternReport,
  FactPatternFinding,
  FactPatternSignal,
  ExtractedFactEntity,
} from "./factPatternArchitecture";

import {
  CaseConfidence,
  CaseSeverity,
} from "../architecture/masterCaseSchema";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function uniqueStrings(items: unknown[]): string[] {
  return Array.from(
    new Set(
      items
        .map(cleanString)
        .filter(Boolean),
    ),
  );
}

function confidenceFromCount(
  count: number,
): CaseConfidence {
  if (count >= 8) return "very-high";
  if (count >= 5) return "high";
  if (count >= 3) return "medium";
  if (count >= 1) return "low";
  return "very-low";
}

function detectSignals(
  narrative: string,
): FactPatternSignal[] {
  const lower =
    narrative.toLowerCase();

  const signals: FactPatternSignal[] = [];

  const addSignal = (
    label: string,
    type: FactPatternSignal["signalType"],
    severity: CaseSeverity = "medium",
  ) => {
    signals.push({
      id: createId("signal"),
      signalType: type,
      label,
      description: label,
      sourceText: label,
      confidence: "medium",
      severity,
    });
  };

  if (
    lower.includes("text") ||
    lower.includes("message")
  ) {
    addSignal(
      "Communication evidence detected",
      "communication",
    );
  }

  if (
    lower.includes("email")
  ) {
    addSignal(
      "Email evidence detected",
      "communication",
    );
  }

  if (
    lower.includes("receipt") ||
    lower.includes("invoice")
  ) {
    addSignal(
      "Documentary proof detected",
      "document",
    );
  }

  if (
    lower.includes("contract")
  ) {
    addSignal(
      "Contract issue detected",
      "contract",
      "high",
    );
  }

  if (
    lower.includes("child") ||
    lower.includes("custody") ||
    lower.includes("parenting")
  ) {
    addSignal(
      "Parenting issue detected",
      "child-related",
      "high",
    );
  }

  if (
    lower.includes("support")
  ) {
    addSignal(
      "Support issue detected",
      "payment",
      "high",
    );
  }

  if (
    lower.includes("paid") ||
    lower.includes("payment")
  ) {
    addSignal(
      "Payment evidence detected",
      "payment",
    );
  }

  if (
    lower.includes("denied") ||
    lower.includes("refused")
  ) {
    addSignal(
      "Possible denial detected",
      "denial",
    );
  }

  if (
    lower.includes("admitted") ||
    lower.includes("admission")
  ) {
    addSignal(
      "Admission detected",
      "admission",
    );
  }

  if (
    lower.includes("late") ||
    lower.includes("deadline")
  ) {
    addSignal(
      "Deadline issue detected",
      "deadline",
    );
  }

  return signals;
}

function buildPatternFindings(
  signals: FactPatternSignal[],
): FactPatternFinding[] {
  if (signals.length === 0) {
    return [];
  }

  return [
    {
      id: createId("pattern"),
      category: "unknown",
      status: "detected",
      title: "Fact Pattern Detected",
      explanation:
        "Narrative contains identifiable litigation signals.",
      confidence: confidenceFromCount(
        signals.length,
      ),
      severity: "medium",
      relatedDomains: ["unknown"],
      supportingSignals: signals,
      missingFacts: [],
      evidenceNeeded: [],
      proceduralSignals: [],
      credibilitySignals: [],
      judicialConcernSignals: [],
      recommendedQuestions: [
        "What evidence supports this allegation?",
        "What documents exist?",
        "What dates are important?",
      ],
    },
  ];
}

function extractEntities(
  narrative: string,
): ExtractedFactEntity[] {
  const entities: ExtractedFactEntity[] =
    [];

  const dollarMatches =
    narrative.match(/\$\d+/g) || [];

  dollarMatches.forEach(
    (value) => {
      entities.push({
        id: createId("entity"),
        label: "Money",
        entityType: "money",
        value,
        sourceText: value,
        confidence: "medium",
      });
    },
  );

  return entities;
}

export function buildFactPatternEngine(
  input: FactPatternEngineInput,
): FactPatternEngineOutput {
  const timestamp = nowIso();

  const narrative =
    input.rawNarrative || "";

  const signals =
    detectSignals(narrative);

  const findings =
    buildPatternFindings(signals);

  const entities =
    extractEntities(narrative);

  const report: FactPatternReport =
    {
      id: createId(
        "fact_pattern_report",
      ),

      version: "1.0.0",

      createdAt: timestamp,

      updatedAt: timestamp,

      caseId: input.caseId,

      courtPath:
        input.courtPath,

      province:
        input.province,

      stage: input.stage,

      detectedPatterns:
        findings,

      extractedEntities:
        entities,

      globalSignals:
        signals,

      missingFacts: [],

      evidenceNeeded: [],

      proceduralSignals: [],

      credibilitySignals: [],

      judicialConcernSignals:
        [],

      recommendedQuestions:
        uniqueStrings(
          findings.flatMap(
            (
              finding,
            ) =>
              finding.recommendedQuestions,
          ),
        ),

      dominantPatternIds:
        findings.map(
          (
            finding,
          ) => finding.id,
        ),

      warnings:
        narrative.length === 0
          ? [
              "No narrative supplied to Fact Pattern Engine.",
            ]
          : [],

      summary:
        findings.length > 0
          ? `${findings.length} fact pattern(s) detected.`
          : "No significant fact patterns detected.",

      confidence:
        confidenceFromCount(
          signals.length,
        ),
    };

  return {
    report,
    warnings:
      report.warnings,
  };
}