import {
  CaseClaim,
  CaseEvidenceItem,
  CaseTimelineEvent,
  MasterCaseSchema,
} from "../architecture/masterCaseSchema";

import {
  ContradictionConfidence,
  ContradictionEngineResult,
  ContradictionFinding,
  ContradictionNode,
  ContradictionSchemaVersion,
  ContradictionSeverity,
  ContradictionSourceType,
} from "./contradictionSchema";

export type ContradictionDetectionInput = {
  caseFile: MasterCaseSchema;
};

export type ContradictionDetectionOutput = ContradictionEngineResult & {
  version: ContradictionSchemaVersion;
  createdAt: string;
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
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function confidenceFromSource(sourceType: ContradictionSourceType): ContradictionConfidence {
  if (sourceType === "evidence" || sourceType === "document") return "high";
  if (sourceType === "timeline") return "medium";
  if (sourceType === "claim") return "medium";
  if (sourceType === "fact") return "medium";
  return "low";
}

function buildNode(args: {
  sourceType: ContradictionSourceType;
  sourceId: string;
  title: string;
  content: string;
}): ContradictionNode {
  return {
    id: createId("contradiction_node"),
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    title: args.title,
    content: args.content,
    confidence: confidenceFromSource(args.sourceType),
  };
}

function buildFinding(args: {
  category: ContradictionFinding["category"];
  severity: ContradictionSeverity;
  confidence: ContradictionConfidence;
  leftNode: ContradictionNode;
  rightNode: ContradictionNode;
  explanation: string;
  whyItMatters: string;
  possibleResolutions: string[];
  judicialConcern: string;
  litigationRisk: string;
  requiresHumanReview?: boolean;
}): ContradictionFinding {
  return {
    id: createId("contradiction"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    leftNode: args.leftNode,
    rightNode: args.rightNode,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    possibleResolutions: args.possibleResolutions,
    judicialConcern: args.judicialConcern,
    litigationRisk: args.litigationRisk,
    requiresHumanReview: args.requiresHumanReview ?? true,
  };
}

function extractMoneyValues(text: string): string[] {
  const matches = text.match(/\$?\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g);
  return uniqueStrings(matches || []);
}

function extractYearValues(text: string): string[] {
  const matches = text.match(/\b(19\d{2}|20\d{2})\b/g);
  return uniqueStrings(matches || []);
}

function extractDateLikeValues(text: string): string[] {
  const matches = text.match(
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(19\d{2}|20\d{2})\b/gi,
  );

  return uniqueStrings(matches || []);
}

function detectOppositeSignals(textA: string, textB: string): boolean {
  const a = normalize(textA);
  const b = normalize(textB);

  const denialTerms = ["never", "did not", "didn't", "no ", "not ", "denies", "denied"];
  const admissionTerms = ["did", "was", "paid", "agreed", "signed", "admitted", "confirmed"];

  const aDenies = denialTerms.some((term) => a.includes(term));
  const bDenies = denialTerms.some((term) => b.includes(term));
  const aAffirms = admissionTerms.some((term) => a.includes(term));
  const bAffirms = admissionTerms.some((term) => b.includes(term));

  return (aDenies && bAffirms) || (bDenies && aAffirms);
}

function detectAmountConflicts(
  claims: CaseClaim[],
  evidence: CaseEvidenceItem[],
): ContradictionFinding[] {
  const findings: ContradictionFinding[] = [];

  for (const claim of claims) {
    const claimAmounts = extractMoneyValues(
      [claim.title, claim.explanation, ...claim.missingFacts, ...claim.burdenIssues].join(" "),
    );

    if (claimAmounts.length === 0) continue;

    for (const item of evidence) {
      const evidenceAmounts = extractMoneyValues(
        [item.title, item.description, ...item.missingContext].join(" "),
      );

      if (evidenceAmounts.length === 0) continue;

      const overlap = claimAmounts.some((amount) => evidenceAmounts.includes(amount));

      if (!overlap && claimAmounts.length > 0 && evidenceAmounts.length > 0) {
        findings.push(
          buildFinding({
            category: "amount-conflict",
            severity: "moderate",
            confidence: "medium",
            leftNode: buildNode({
              sourceType: "claim",
              sourceId: claim.id,
              title: claim.title,
              content: claim.explanation,
            }),
            rightNode: buildNode({
              sourceType: "evidence",
              sourceId: item.id,
              title: item.title,
              content: item.description || item.title,
            }),
            explanation:
              "The claim and evidence appear to reference different money amounts.",
            whyItMatters:
              "Damage amounts must be consistent and supported by evidence before documents or settlement materials are generated.",
            possibleResolutions: [
              "Confirm the correct amount claimed.",
              "Separate principal, interest, costs, arrears, and other amounts.",
              "Link each claimed amount to receipts, transfers, invoices, or calculations.",
            ],
            judicialConcern:
              "A judge may question whether the requested amount is reliable or proven.",
            litigationRisk:
              "The opposing side may argue the amount is exaggerated, unsupported, or internally inconsistent.",
          }),
        );
      }
    }
  }

  return findings;
}

function detectDateConflicts(
  timeline: CaseTimelineEvent[],
  evidence: CaseEvidenceItem[],
): ContradictionFinding[] {
  const findings: ContradictionFinding[] = [];

  for (const event of timeline) {
    const eventDates = extractDateLikeValues(
      [event.title, event.description, event.dateRaw, event.dateNormalized].join(" "),
    );

    if (eventDates.length === 0) continue;

    for (const item of evidence) {
      const itemDates = extractDateLikeValues(
        [item.title, item.description, ...item.missingContext].join(" "),
      );

      if (itemDates.length === 0) continue;

      const overlap = eventDates.some((date) => itemDates.includes(date));

      if (!overlap && event.evidenceIds.includes(item.id)) {
        findings.push(
          buildFinding({
            category: "date-conflict",
            severity: "high",
            confidence: "medium",
            leftNode: buildNode({
              sourceType: "timeline",
              sourceId: event.id,
              title: event.title,
              content: event.description,
            }),
            rightNode: buildNode({
              sourceType: "evidence",
              sourceId: item.id,
              title: item.title,
              content: item.description || item.title,
            }),
            explanation:
              "A timeline event is linked to evidence that appears to reference a different date.",
            whyItMatters:
              "Date conflicts can affect limitation periods, credibility, causation, service, deadlines, and procedural readiness.",
            possibleResolutions: [
              "Confirm the exact event date.",
              "Check whether the evidence date is the event date, upload date, message date, filing date, or payment date.",
              "Separate factual dates from procedural dates.",
            ],
            judicialConcern:
              "A judge may be concerned that the chronology is unreliable.",
            litigationRisk:
              "The opposing side may use date inconsistencies to attack credibility or limitation arguments.",
          }),
        );
      }
    }
  }

  return findings;
}

function detectStatementConflicts(
  timeline: CaseTimelineEvent[],
  claims: CaseClaim[],
  evidence: CaseEvidenceItem[],
): ContradictionFinding[] {
  const findings: ContradictionFinding[] = [];

  const nodes = [
    ...timeline.map((event) =>
      buildNode({
        sourceType: "timeline" as const,
        sourceId: event.id,
        title: event.title,
        content: event.description,
      }),
    ),
    ...claims.map((claim) =>
      buildNode({
        sourceType: "claim" as const,
        sourceId: claim.id,
        title: claim.title,
        content: claim.explanation,
      }),
    ),
    ...evidence.map((item) =>
      buildNode({
        sourceType: "evidence" as const,
        sourceId: item.id,
        title: item.title,
        content: [item.description, ...item.missingContext].join(" "),
      }),
    ),
  ].filter((node) => clean(node.content));

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const left = nodes[i];
      const right = nodes[j];

      if (!left || !right) continue;

      if (detectOppositeSignals(left.content, right.content)) {
        findings.push(
          buildFinding({
            category: "statement-conflict",
            severity: "moderate",
            confidence: "medium",
            leftNode: left,
            rightNode: right,
            explanation:
              "Two parts of the case record appear to contain opposite or inconsistent factual signals.",
            whyItMatters:
              "Statement conflicts can create credibility problems and weaken pleadings, affidavits, settlement materials, and trial preparation.",
            possibleResolutions: [
              "Clarify whether both statements are about the same event.",
              "Add dates and context to each statement.",
              "Explain why the statements are not truly inconsistent, if applicable.",
              "Correct or remove unsupported wording before document generation.",
            ],
            judicialConcern:
              "A judge may question whether the facts are reliable or internally consistent.",
            litigationRisk:
              "The opposing side may argue the user's own materials contradict each other.",
          }),
        );
      }
    }
  }

  return findings;
}

function detectClaimEvidenceGaps(
  claims: CaseClaim[],
  evidence: CaseEvidenceItem[],
): ContradictionFinding[] {
  const findings: ContradictionFinding[] = [];
  const evidenceText = normalize(
    evidence.map((item) => [item.title, item.description].join(" ")).join(" "),
  );

  for (const claim of claims) {
    const claimText = normalize([claim.title, claim.explanation].join(" "));

    if (!claimText) continue;

    const sensitiveProofSignals = [
      "paid",
      "payment",
      "injury",
      "damage",
      "signed",
      "agreement",
      "assault",
      "false",
      "publication",
      "deadline",
      "served",
      "filed",
      "breach",
    ];

    const claimNeedsProof = sensitiveProofSignals.some((signal) =>
      claimText.includes(signal),
    );

    if (claimNeedsProof && evidence.length === 0) {
      findings.push(
        buildFinding({
          category: "evidence-conflict",
          severity: "high",
          confidence: "high",
          leftNode: buildNode({
            sourceType: "claim",
            sourceId: claim.id,
            title: claim.title,
            content: claim.explanation,
          }),
          rightNode: buildNode({
            sourceType: "evidence",
            sourceId: "missing-evidence",
            title: "No linked evidence",
            content: "No evidence exists in the current case file.",
          }),
          explanation:
            "The claim relies on facts that usually require evidence, but no evidence is currently available.",
          whyItMatters:
            "A claim can be legally possible but still weak if the necessary proof is missing.",
          possibleResolutions: [
            "Upload or identify evidence for this claim.",
            "Link documents, screenshots, receipts, records, photos, or witness information.",
            "Mark unsupported facts as needing proof before final document generation.",
          ],
          judicialConcern:
            "A judge may not accept unsupported factual allegations.",
          litigationRisk:
            "The opposing side may argue the allegation is bare, speculative, or unproven.",
        }),
      );
    }

    if (
      claimNeedsProof &&
      evidence.length > 0 &&
      !sensitiveProofSignals.some(
        (signal) => claimText.includes(signal) && evidenceText.includes(signal),
      )
    ) {
      findings.push(
        buildFinding({
          category: "claim-conflict",
          severity: "moderate",
          confidence: "medium",
          leftNode: buildNode({
            sourceType: "claim",
            sourceId: claim.id,
            title: claim.title,
            content: claim.explanation,
          }),
          rightNode: buildNode({
            sourceType: "evidence",
            sourceId: "evidence-collection",
            title: "Evidence collection",
            content: evidenceText,
          }),
          explanation:
            "The claim appears to depend on proof signals that are not clearly reflected in the evidence collection.",
          whyItMatters:
            "The system should not treat a claim as court-ready just because evidence exists somewhere in the file.",
          possibleResolutions: [
            "Connect specific evidence to the specific claim element.",
            "Add missing proof if it exists.",
            "Revise the claim theory if the evidence does not support it.",
          ],
          judicialConcern:
            "A judge may ask where the proof is for the specific allegation.",
          litigationRisk:
            "The opposing side may argue the evidence does not prove the pleaded claim.",
        }),
      );
    }
  }

  return findings;
}

function detectLocationConflicts(timeline: CaseTimelineEvent[]): ContradictionFinding[] {
  const findings: ContradictionFinding[] = [];

  const locationSignals = [
    "ottawa",
    "toronto",
    "orleans",
    "st. laurent",
    "st laurent",
    "school",
    "hospital",
    "court",
    "home",
    "work",
  ];

  for (let i = 0; i < timeline.length; i += 1) {
    for (let j = i + 1; j < timeline.length; j += 1) {
      const left = timeline[i];
      const right = timeline[j];

      if (!left || !right) continue;

      const leftLocations = locationSignals.filter((location) =>
        normalize(left.description).includes(location),
      );

      const rightLocations = locationSignals.filter((location) =>
        normalize(right.description).includes(location),
      );

      if (
        leftLocations.length > 0 &&
        rightLocations.length > 0 &&
        !leftLocations.some((location) => rightLocations.includes(location))
      ) {
        const leftYears = extractYearValues(left.description);
        const rightYears = extractYearValues(right.description);
        const hasSameYear =
          leftYears.length === 0 ||
          rightYears.length === 0 ||
          leftYears.some((year) => rightYears.includes(year));

        if (hasSameYear) {
          findings.push(
            buildFinding({
              category: "location-conflict",
              severity: "low",
              confidence: "low",
              leftNode: buildNode({
                sourceType: "timeline",
                sourceId: left.id,
                title: left.title,
                content: left.description,
              }),
              rightNode: buildNode({
                sourceType: "timeline",
                sourceId: right.id,
                title: right.title,
                content: right.description,
              }),
              explanation:
                "Two timeline events appear to reference different locations and may need clearer context.",
              whyItMatters:
                "Location conflicts can affect jurisdiction, causation, credibility, and factual clarity.",
              possibleResolutions: [
                "Confirm whether the events occurred at different times.",
                "Add exact locations and dates.",
                "Clarify whether the location difference is expected or inconsistent.",
              ],
              judicialConcern:
                "A judge may need clearer location details to understand the chronology.",
              litigationRisk:
                "The opposing side may use unclear locations to challenge reliability or jurisdiction.",
            }),
          );
        }
      }
    }
  }

  return findings;
}

function scoreCredibilityRisk(findings: ContradictionFinding[]): number {
  let score = 0;

  for (const finding of findings) {
    if (finding.severity === "critical") score += 30;
    if (finding.severity === "high") score += 20;
    if (finding.severity === "moderate") score += 10;
    if (finding.severity === "low") score += 4;
  }

  return Math.max(0, Math.min(100, score));
}

function overallRisk(score: number): ContradictionEngineResult["summary"]["overallRisk"] {
  if (score >= 80) return "critical";
  if (score >= 60) return "serious";
  if (score >= 35) return "elevated";
  if (score >= 15) return "manageable";
  return "minimal";
}

export function detectContradictions(
  input: ContradictionDetectionInput,
): ContradictionDetectionOutput {
  const caseFile = input.caseFile;

  const findings = [
    ...detectDateConflicts(caseFile.timeline, caseFile.evidence),
    ...detectAmountConflicts(caseFile.claims, caseFile.evidence),
    ...detectStatementConflicts(caseFile.timeline, caseFile.claims, caseFile.evidence),
    ...detectClaimEvidenceGaps(caseFile.claims, caseFile.evidence),
    ...detectLocationConflicts(caseFile.timeline),
  ];

  const criticalFindings = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;

  const highFindings = findings.filter(
    (finding) => finding.severity === "high",
  ).length;

  const moderateFindings = findings.filter(
    (finding) => finding.severity === "moderate",
  ).length;

  const lowFindings = findings.filter(
    (finding) => finding.severity === "low",
  ).length;

  const credibilityRiskScore = scoreCredibilityRisk(findings);

  return {
    version: "1.0.0",
    createdAt: nowIso(),
    findings,
    summary: {
      totalFindings: findings.length,
      criticalFindings,
      highFindings,
      moderateFindings,
      lowFindings,
      credibilityRiskScore,
      overallRisk: overallRisk(credibilityRiskScore),
    },
    warnings: uniqueStrings([
      findings.length > 0
        ? "Contradictions or proof inconsistencies were detected and should be reviewed before generating final legal materials."
        : "",
      criticalFindings > 0
        ? "Critical contradiction risk detected."
        : "",
      highFindings > 0
        ? "High contradiction risk detected."
        : "",
    ]),
  };
}