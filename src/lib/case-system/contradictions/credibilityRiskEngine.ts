import { MasterCaseSchema } from "../architecture/masterCaseSchema";

import {
  ContradictionEngineResult,
  ContradictionFinding,
  ContradictionSeverity,
} from "./contradictionSchema";

import { detectContradictions } from "./contradictionDetectionEngine";

export type CredibilityRiskLevel =
  | "minimal"
  | "manageable"
  | "elevated"
  | "serious"
  | "critical";

export type CredibilityRiskCategory =
  | "internal-inconsistency"
  | "timeline-reliability"
  | "evidence-support"
  | "damages-reliability"
  | "claim-reliability"
  | "courtroom-presentation"
  | "unknown";

export type CredibilityRiskFinding = {
  id: string;
  category: CredibilityRiskCategory;
  level: CredibilityRiskLevel;
  score: number;
  title: string;
  explanation: string;
  linkedContradictionIds: string[];
  judgeConcern: string;
  opposingCounselUse: string;
  recommendedFix: string;
};

export type CredibilityRiskResult = {
  caseId?: string;
  generatedAt: string;
  overallScore: number;
  overallLevel: CredibilityRiskLevel;
  findings: CredibilityRiskFinding[];
  contradictionSummary: ContradictionEngineResult["summary"];
  judgeConcernScore: number;
  crossExaminationRiskScore: number;
  settlementPressureScore: number;
  documentReadinessImpact: "none" | "minor" | "moderate" | "major" | "severe";
  warnings: string[];
  nextActions: string[];
};

export type CredibilityRiskEngineInput = {
  caseFile: MasterCaseSchema;
  contradictionResult?: ContradictionEngineResult;
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

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function scoreForSeverity(severity: ContradictionSeverity): number {
  if (severity === "critical") return 35;
  if (severity === "high") return 25;
  if (severity === "moderate") return 12;
  if (severity === "low") return 5;
  return 0;
}

function levelFromScore(score: number): CredibilityRiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "serious";
  if (score >= 35) return "elevated";
  if (score >= 15) return "manageable";
  return "minimal";
}

function documentImpactFromScore(
  score: number,
): CredibilityRiskResult["documentReadinessImpact"] {
  if (score >= 80) return "severe";
  if (score >= 60) return "major";
  if (score >= 35) return "moderate";
  if (score >= 15) return "minor";
  return "none";
}

function categoryFromContradiction(
  finding: ContradictionFinding,
): CredibilityRiskCategory {
  switch (finding.category) {
    case "date-conflict":
    case "timeline-conflict":
      return "timeline-reliability";

    case "amount-conflict":
      return "damages-reliability";

    case "evidence-conflict":
      return "evidence-support";

    case "claim-conflict":
    case "causation-conflict":
      return "claim-reliability";

    case "statement-conflict":
    case "credibility-conflict":
      return "internal-inconsistency";

    case "identity-conflict":
    case "location-conflict":
    case "procedural-conflict":
    case "authority-conflict":
    case "unknown":
    default:
      return "courtroom-presentation";
  }
}

function groupContradictionsByCategory(
  findings: ContradictionFinding[],
): Map<CredibilityRiskCategory, ContradictionFinding[]> {
  const groups = new Map<CredibilityRiskCategory, ContradictionFinding[]>();

  for (const finding of findings) {
    const category = categoryFromContradiction(finding);
    const existing = groups.get(category) || [];
    existing.push(finding);
    groups.set(category, existing);
  }

  return groups;
}

function scoreGroup(findings: ContradictionFinding[]): number {
  const total = findings.reduce(
    (sum, finding) => sum + scoreForSeverity(finding.severity),
    0,
  );

  return Math.max(0, Math.min(100, total));
}

function buildCategoryTitle(category: CredibilityRiskCategory): string {
  if (category === "internal-inconsistency") return "Internal inconsistency risk";
  if (category === "timeline-reliability") return "Timeline reliability risk";
  if (category === "evidence-support") return "Evidence support risk";
  if (category === "damages-reliability") return "Damages reliability risk";
  if (category === "claim-reliability") return "Claim reliability risk";
  if (category === "courtroom-presentation") return "Courtroom presentation risk";
  return "Credibility risk";
}

function buildCategoryExplanation(
  category: CredibilityRiskCategory,
  findings: ContradictionFinding[],
): string {
  const count = findings.length;

  if (category === "internal-inconsistency") {
    return `${count} inconsistency issue(s) may affect how reliable the user's own account appears.`;
  }

  if (category === "timeline-reliability") {
    return `${count} chronology issue(s) may affect dates, limitation analysis, causation, and credibility.`;
  }

  if (category === "evidence-support") {
    return `${count} evidence-support issue(s) may affect whether the allegations are actually proven.`;
  }

  if (category === "damages-reliability") {
    return `${count} damages issue(s) may affect the reliability of amounts, calculations, or requested remedies.`;
  }

  if (category === "claim-reliability") {
    return `${count} claim-reliability issue(s) may affect whether the legal theory matches the evidence.`;
  }

  return `${count} issue(s) may affect courtroom presentation and judicial confidence.`;
}

function judgeConcernForCategory(category: CredibilityRiskCategory): string {
  if (category === "internal-inconsistency") {
    return "A judge may question whether the user's account is internally reliable.";
  }

  if (category === "timeline-reliability") {
    return "A judge may question whether the chronology is accurate enough to support the requested relief.";
  }

  if (category === "evidence-support") {
    return "A judge may question whether the evidence actually supports the allegations.";
  }

  if (category === "damages-reliability") {
    return "A judge may question whether the amount claimed is proven and reasonable.";
  }

  if (category === "claim-reliability") {
    return "A judge may question whether the legal claim matches the facts and evidence.";
  }

  return "A judge may need the record organized more clearly before relying on it.";
}

function opposingUseForCategory(category: CredibilityRiskCategory): string {
  if (category === "internal-inconsistency") {
    return "Opposing counsel may use inconsistent statements to attack credibility.";
  }

  if (category === "timeline-reliability") {
    return "Opposing counsel may use date or sequence issues to challenge limitation, causation, or reliability.";
  }

  if (category === "evidence-support") {
    return "Opposing counsel may argue the allegations are unsupported or disconnected from the evidence.";
  }

  if (category === "damages-reliability") {
    return "Opposing counsel may argue the damages are inflated, inconsistent, or unproven.";
  }

  if (category === "claim-reliability") {
    return "Opposing counsel may argue the claim theory is unsupported or legally misframed.";
  }

  return "Opposing counsel may argue the case presentation is unclear or unreliable.";
}

function recommendedFixForCategory(category: CredibilityRiskCategory): string {
  if (category === "internal-inconsistency") {
    return "Clarify inconsistent statements, add context, and revise unsupported wording before document generation.";
  }

  if (category === "timeline-reliability") {
    return "Create a clean chronology with exact dates, source records, and separate factual dates from filing/service dates.";
  }

  if (category === "evidence-support") {
    return "Link each allegation to specific evidence and mark unsupported allegations as needing proof.";
  }

  if (category === "damages-reliability") {
    return "Create a damages table showing amount, source, calculation, evidence, and whether it is proven or estimated.";
  }

  if (category === "claim-reliability") {
    return "Review whether the legal theory should be narrowed, reframed, or supported with additional proof.";
  }

  return "Organize the case record and resolve unclear or unsupported statements.";
}

function buildFindings(
  contradictionFindings: ContradictionFinding[],
): CredibilityRiskFinding[] {
  const groups = groupContradictionsByCategory(contradictionFindings);
  const findings: CredibilityRiskFinding[] = [];

  for (const [category, groupedFindings] of groups.entries()) {
    const score = scoreGroup(groupedFindings);

    findings.push({
      id: createId("credibility_risk"),
      category,
      level: levelFromScore(score),
      score,
      title: buildCategoryTitle(category),
      explanation: buildCategoryExplanation(category, groupedFindings),
      linkedContradictionIds: groupedFindings.map((finding) => finding.id),
      judgeConcern: judgeConcernForCategory(category),
      opposingCounselUse: opposingUseForCategory(category),
      recommendedFix: recommendedFixForCategory(category),
    });
  }

  return findings.sort((a, b) => b.score - a.score);
}

function buildWarnings(args: {
  findings: CredibilityRiskFinding[];
  contradictionResult: ContradictionEngineResult;
}): string[] {
  return uniqueStrings([
    ...args.contradictionResult.warnings,
    args.findings.some((finding) => finding.level === "critical")
      ? "Critical credibility risk requires human review before generated materials are used."
      : "",
    args.findings.some((finding) => finding.level === "serious")
      ? "Serious credibility risk should be addressed before court package generation."
      : "",
    args.findings.length > 0
      ? "Credibility findings should be reviewed before pleadings, affidavits, settlement materials, or trial materials are finalized."
      : "",
  ]);
}

function buildNextActions(findings: CredibilityRiskFinding[]): string[] {
  return uniqueStrings([
    ...findings.map((finding) => finding.recommendedFix),
    findings.length > 0
      ? "Review contradictions and credibility risks before generating final legal documents."
      : "",
  ]);
}

export function assessCredibilityRisk(
  input: CredibilityRiskEngineInput,
): CredibilityRiskResult {
  const contradictionResult =
    input.contradictionResult ||
    detectContradictions({
      caseFile: input.caseFile,
    });

  const findings = buildFindings(contradictionResult.findings);

  const overallScore = Math.max(
    0,
    Math.min(
      100,
      contradictionResult.summary.credibilityRiskScore +
        findings.reduce((sum, finding) => sum + Math.round(finding.score / 10), 0),
    ),
  );

  const judgeConcernScore = Math.max(
    0,
    Math.min(100, Math.round(overallScore * 0.9)),
  );

  const crossExaminationRiskScore = Math.max(
    0,
    Math.min(100, Math.round(overallScore * 1.05)),
  );

  const settlementPressureScore = Math.max(
    0,
    Math.min(100, Math.round(overallScore * 0.85)),
  );

  return {
    caseId: input.caseFile.id,
    generatedAt: nowIso(),
    overallScore,
    overallLevel: levelFromScore(overallScore),
    findings,
    contradictionSummary: contradictionResult.summary,
    judgeConcernScore,
    crossExaminationRiskScore,
    settlementPressureScore,
    documentReadinessImpact: documentImpactFromScore(overallScore),
    warnings: buildWarnings({
      findings,
      contradictionResult,
    }),
    nextActions: buildNextActions(findings),
  };
}