import type { CaseContext } from "./caseContextEngine";
import type { EvidenceItem } from "./evidenceEngine";
import {
  runLegalTheoryEngine,
  type LegalTheoryInput,
} from "./legalTheoryEngine";

export type LitigationRiskLevel = "low" | "moderate" | "high";

export type LitigationIssueCategory =
  | "evidence"
  | "credibility"
  | "timeline"
  | "procedure"
  | "damages"
  | "causation"
  | "jurisdiction"
  | "limitation"
  | "forum"
  | "witness"
  | "document-quality"
  | "legal-argument"
  | "human-rights"
  | "charter"
  | "public-authority"
  | "strategy";

export type LitigationStrength = {
  id: string;
  title: string;
  explanation: string;
  linkedEvidenceLabels: string[];
};

export type LitigationWeakness = {
  id: string;
  category: LitigationIssueCategory;
  riskLevel: LitigationRiskLevel;
  title: string;
  explanation: string;
  suggestedFixes: string[];
  linkedEvidenceLabels: string[];
};

export type OpposingArgument = {
  id: string;
  title: string;
  explanation: string;
  likelyTarget: string;
  possibleResponse: string;
};

export type JudicialConcern = {
  id: string;
  concern: string;
  reason: string;
  possibleSolution: string;
};

export type LitigationStrategyReport = {
  id: string;
  createdAt: string;
  overallRisk: LitigationRiskLevel;
  strengths: LitigationStrength[];
  weaknesses: LitigationWeakness[];
  opposingArguments: OpposingArgument[];
  judicialConcerns: JudicialConcern[];
  missingEvidence: string[];
  timelineConcerns: string[];
  proceduralConcerns: string[];
  recommendedNextSteps: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function cleanList(items: string[]) {
  return Array.from(new Set(items.map((item) => clean(item)).filter(Boolean)));
}

function includesAny(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function safeTheoryCourtPath(
  path: CaseContext["casePath"]
): LegalTheoryInput["courtPath"] {
  if (path === "family" || path === "small-claims" || path === "civil") {
    return path;
  }

  return "civil";
}

function exhibitLabel(item: EvidenceItem) {
  return String(
    item.label || item.exhibitNumber || item.title || "Unlabelled exhibit"
  );
}

function contextRecord(context: CaseContext) {
  return context as unknown as Record<string, unknown>;
}

function issueText(issue: unknown) {
  if (typeof issue === "string") return issue;

  if (issue && typeof issue === "object") {
    const record = issue as Record<string, unknown>;

    return [
      record.title,
      record.name,
      record.label,
      record.category,
      record.explanation,
      record.description,
      record.issue,
    ]
      .map(clean)
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function issueTexts(context: CaseContext): string[] {
  return cleanList((context.issues || []).map(issueText));
}

function collectContextText(context: CaseContext) {
  const record = contextRecord(context);

  const evidenceText = context.evidenceItems
    .map((item) =>
      [
        item.label,
        item.exhibitNumber,
        item.title,
        item.description,
        item.relevance,
        item.date,
      ].join(" ")
    )
    .join(" ");

  return [
    record.facts,
    record.summary,
    record.caseSummary,
    record.goal,
    record.remedy,
    record.damagesBreakdown,
    record.missingEvidence,
    issueTexts(context).join(" "),
    context.timeline.map((event) => JSON.stringify(event)).join(" "),
    evidenceText,
  ].join(" ");
}

function hasChronologyDates(context: CaseContext) {
  return (
    context.evidenceItems.some((item) => clean(item.date)) ||
    context.timeline.length >= 3
  );
}

function hasExplainedEvidence(context: CaseContext) {
  return context.evidenceItems.some(
    (item) => clean(item.description) && clean(item.relevance)
  );
}

function buildLegalTheoryInput(context: CaseContext): LegalTheoryInput {
  const record = contextRecord(context);

  return {
    courtPath: safeTheoryCourtPath(context.casePath),
    facts: clean(record.facts || record.summary || record.caseSummary),
    issues: issueTexts(context),
    evidence: context.evidenceItems
      .map((item) => [item.title, item.description, item.relevance].join(" "))
      .join(" "),
    timeline: context.timeline.map((item) => JSON.stringify(item)).join(" "),
    damagesBreakdown: clean(record.damagesBreakdown),
    goal: clean(record.goal || record.remedy),
  };
}

function buildStrengths(context: CaseContext): LitigationStrength[] {
  const strengths: LitigationStrength[] = [];
  const text = collectContextText(context);
  const legalTheory = runLegalTheoryEngine(buildLegalTheoryInput(context));

  if (context.evidenceItems.length >= 5) {
    strengths.push({
      id: createId("strength"),
      title: "Substantial evidence record",
      explanation:
        "The case includes multiple evidence items, which can support chronology, damages, credibility, causation, and issue mapping if organized properly.",
      linkedEvidenceLabels: context.evidenceItems.map(exhibitLabel),
    });
  }

  if (hasChronologyDates(context)) {
    strengths.push({
      id: createId("strength"),
      title: "Chronology can be developed",
      explanation:
        "The file contains enough timeline structure to begin building a date-based narrative, which is important for causation, credibility, procedural history, and damages.",
      linkedEvidenceLabels: [],
    });
  }

  if (context.issues.length >= 2) {
    strengths.push({
      id: createId("strength"),
      title: "Multiple issue categories identified",
      explanation:
        "The case has identified more than one issue, allowing the system to separate legal theories, evidence targets, risks, and remedies.",
      linkedEvidenceLabels: [],
    });
  }

  if (hasExplainedEvidence(context)) {
    strengths.push({
      id: createId("strength"),
      title: "Some evidence is already explained",
      explanation:
        "At least some exhibits already include relevance notes, which helps connect evidence to issues instead of leaving documents as unsupported uploads.",
      linkedEvidenceLabels: context.evidenceItems.map(exhibitLabel),
    });
  }

  if (legalTheory.strongestTheory) {
    strengths.push({
      id: createId("strength"),
      title: `Detected legal theory: ${legalTheory.strongestTheory.theoryName}`,
      explanation: legalTheory.strongestTheory.plainLanguageMeaning,
      linkedEvidenceLabels: [],
    });
  }

  if (
    includesAny(text, [
      "admitted",
      "admission",
      "acknowledged",
      "agreed",
      "confirmed",
    ])
  ) {
    strengths.push({
      id: createId("strength"),
      title: "Possible admission evidence",
      explanation:
        "The file may contain admissions or acknowledgments. Admissions can be powerful if tied to exact words, dates, and documents.",
      linkedEvidenceLabels: context.evidenceItems.map(exhibitLabel),
    });
  }

  return strengths;
}

function buildWeaknesses(context: CaseContext): LitigationWeakness[] {
  const weaknesses: LitigationWeakness[] = [];
  const text = collectContextText(context);
  const legalTheory = runLegalTheoryEngine(buildLegalTheoryInput(context));

  if (context.evidenceItems.length === 0) {
    weaknesses.push({
      id: createId("weakness"),
      category: "evidence",
      riskLevel: "high",
      title: "No evidence uploaded",
      explanation:
        "The case currently has no evidence records. This prevents meaningful proof mapping, exhibit organization, chronology support, and document generation.",
      suggestedFixes: [
        "Upload screenshots, emails, contracts, letters, photos, receipts, policies, records, reports, court documents, or tribunal materials.",
        "Label each exhibit with what it proves and the issue it supports.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  if (!hasChronologyDates(context)) {
    weaknesses.push({
      id: createId("weakness"),
      category: "timeline",
      riskLevel: "high",
      title: "Chronology is weak",
      explanation:
        "Few dated events were detected. A weak chronology makes it easier for the other side to attack causation, delay, credibility, and procedural timing.",
      suggestedFixes: [
        "Create a date-by-date timeline.",
        "Link each major event to a document, message, receipt, record, or witness.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  if (
    context.evidenceItems.some(
      (item) => !clean(item.relevance) && !clean(item.description)
    )
  ) {
    weaknesses.push({
      id: createId("weakness"),
      category: "document-quality",
      riskLevel: "moderate",
      title: "Evidence lacks proof value explanations",
      explanation:
        "Some exhibits do not explain what they prove. A court package should not force the reader to guess why a document matters.",
      suggestedFixes: [
        "Add a short relevance note to every exhibit.",
        "Use wording like: This proves ___ because ___.",
      ],
      linkedEvidenceLabels: context.evidenceItems.map(exhibitLabel),
    });
  }

  if (context.issues.length === 0) {
    weaknesses.push({
      id: createId("weakness"),
      category: "legal-argument",
      riskLevel: "high",
      title: "No issue structure detected",
      explanation:
        "The system cannot yet identify the main legal or factual disputes. Without issue framing, drafting and evidence organization become generic.",
      suggestedFixes: [
        "Identify the main legal theory, factual dispute, remedy requested, and key evidence needed.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  if (legalTheory.allMissingProof.length >= 5) {
    weaknesses.push({
      id: createId("weakness"),
      category: "legal-argument",
      riskLevel: "high",
      title: "Major proof gaps for detected legal theories",
      explanation:
        "The legal theory engine detected several missing proof targets. The claim may be vulnerable unless those proof gaps are addressed before drafting.",
      suggestedFixes: legalTheory.allMissingProof.slice(0, 8),
      linkedEvidenceLabels: [],
    });
  }

  if (
    includesAny(text, ["limitation", "deadline", "late", "years ago", "expired"])
  ) {
    weaknesses.push({
      id: createId("weakness"),
      category: "limitation",
      riskLevel: "high",
      title: "Possible limitation or deadline issue",
      explanation:
        "The file suggests a timing issue. Limitation periods, tribunal deadlines, appeal deadlines, or judicial review timelines can seriously affect the case.",
      suggestedFixes: [
        "Identify the date the harm happened.",
        "Identify the date the user discovered the claim.",
        "Identify any tribunal, appeal, review, or court deadline.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  if (
    safeTheoryCourtPath(context.casePath) === "civil" &&
    includesAny(text, [
      "tribunal",
      "hrto",
      "human rights",
      "judicial review",
      "ltb",
      "board",
      "commission",
    ])
  ) {
    weaknesses.push({
      id: createId("weakness"),
      category: "forum",
      riskLevel: "high",
      title: "Possible forum or pathway problem",
      explanation:
        "This matter may involve a tribunal, judicial review, appeal route, Human Rights process, or civil claim overlap. Wrong forum selection can waste time or damage the case.",
      suggestedFixes: [
        "Identify the decision-maker or institution involved.",
        "Identify whether the remedy belongs in court, tribunal, judicial review, appeal, or mixed pathway.",
        "Check deadlines before drafting court documents.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  if (
    safeTheoryCourtPath(context.casePath) === "civil" &&
    includesAny(text, [
      "negligence",
      "caused",
      "because of",
      "resulted in",
      "foreseeable",
    ]) &&
    !includesAny(text, [
      "causation",
      "caused by",
      "directly caused",
      "materially contributed",
    ])
  ) {
    weaknesses.push({
      id: createId("weakness"),
      category: "causation",
      riskLevel: "moderate",
      title: "Causation needs sharpening",
      explanation:
        "The case appears to involve harm or negligence, but the connection between the defendant’s conduct and the harm may need clearer proof.",
      suggestedFixes: [
        "Explain the chain from conduct → risk → harm → damages.",
        "Identify what would likely have changed if the defendant acted properly.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  if (
    safeTheoryCourtPath(context.casePath) === "civil" &&
    includesAny(text, ["damages", "loss", "harm", "money", "expenses"]) &&
    !includesAny(text, ["receipt", "invoice", "calculation", "breakdown", "$"])
  ) {
    weaknesses.push({
      id: createId("weakness"),
      category: "damages",
      riskLevel: "moderate",
      title: "Damages need a clearer breakdown",
      explanation:
        "The file mentions loss or harm but does not appear to contain a clear damages calculation or supporting records.",
      suggestedFixes: [
        "Create a damages table.",
        "Separate general harm, out-of-pocket losses, lost income, repair costs, special damages, and requested remedies.",
      ],
      linkedEvidenceLabels: [],
    });
  }

  return weaknesses;
}

function buildOpposingArguments(context: CaseContext): OpposingArgument[] {
  const argumentsList: OpposingArgument[] = [];
  const text = collectContextText(context);
  const legalTheory = runLegalTheoryEngine(buildLegalTheoryInput(context));

  if (context.evidenceItems.length < 3) {
    argumentsList.push({
      id: createId("opposing"),
      title: "Insufficient evidence",
      explanation:
        "The opposing side may argue the case relies on conclusions, assumptions, or unsupported allegations.",
      likelyTarget: "Overall proof and reliability",
      possibleResponse:
        "Expand the evidence package and connect each exhibit to a specific allegation, legal element, or remedy.",
    });
  }

  if (!hasChronologyDates(context)) {
    argumentsList.push({
      id: createId("opposing"),
      title: "Unclear sequence of events",
      explanation:
        "The opposing side may argue the timeline is unclear, inconsistent, or missing important dates.",
      likelyTarget: "Chronology, credibility, limitation periods, and causation",
      possibleResponse:
        "Create a dated chronology with linked exhibits for each major event.",
    });
  }

  legalTheory.allDefenceAttacks.slice(0, 8).forEach((attack) => {
    argumentsList.push({
      id: createId("opposing"),
      title: attack,
      explanation:
        "This is a likely defence attack identified from the legal theory analysis.",
      likelyTarget: "Legal theory, proof, causation, damages, or procedure",
      possibleResponse:
        "Address this directly in the case summary, evidence plan, and drafting before filing or serving materials.",
    });
  });

  if (includesAny(text, ["human rights", "discrimination", "accommodation"])) {
    argumentsList.push({
      id: createId("opposing"),
      title: "No protected-ground connection",
      explanation:
        "The other side may argue the treatment was unfair but not legally discriminatory.",
      likelyTarget: "Human Rights causation and protected-ground link",
      possibleResponse:
        "Identify the protected ground, adverse treatment, connection between them, impact, and remedy.",
    });
  }

  if (
    includesAny(text, [
      "charter",
      "government",
      "public authority",
      "police",
      "crown",
    ])
  ) {
    argumentsList.push({
      id: createId("opposing"),
      title: "Improper attack on public discretion",
      explanation:
        "A public authority may argue the claim challenges discretion, policy, or a protected decision rather than actionable conduct.",
      likelyTarget: "Jurisdiction, immunity, and legal framing",
      possibleResponse:
        "Frame the issue around actionable process failure, rights impact, operational conduct, causation, and available remedy.",
    });
  }

  return argumentsList;
}

function buildJudicialConcerns(context: CaseContext): JudicialConcern[] {
  const concerns: JudicialConcern[] = [];
  const text = collectContextText(context);
  const legalTheory = runLegalTheoryEngine(buildLegalTheoryInput(context));

  if (!hasChronologyDates(context)) {
    concerns.push({
      id: createId("judge"),
      concern: "Chronology may be difficult to follow",
      reason:
        "Few dated events were identified. Judges need a clear sequence to understand facts, delay, causation, and procedural history.",
      possibleSolution:
        "Create a structured timeline with dates, events, linked exhibits, and short relevance notes.",
    });
  }

  if (context.evidenceItems.length === 0) {
    concerns.push({
      id: createId("judge"),
      concern: "Insufficient supporting material",
      reason:
        "The case currently lacks uploaded exhibits, which can make allegations appear unsupported.",
      possibleSolution:
        "Upload and label supporting records before relying on the draft package.",
    });
  }

  if (context.issues.length === 0) {
    concerns.push({
      id: createId("judge"),
      concern: "Core issues may be unclear",
      reason:
        "No formal issue structure was detected. This can make documents unfocused or repetitive.",
      possibleSolution:
        "Define the factual disputes, legal issues, remedies, and evidence targets clearly.",
    });
  }

  legalTheory.allJudgeConcerns.slice(0, 8).forEach((concern) => {
    concerns.push({
      id: createId("judge"),
      concern,
      reason:
        "This concern was identified from the legal theory engine and should be addressed before final drafting.",
      possibleSolution:
        "Add facts, evidence, proof mapping, or legal framing that answers this concern directly.",
    });
  });

  if (
    safeTheoryCourtPath(context.casePath) === "civil" &&
    includesAny(text, ["tribunal", "judicial review", "human rights", "hrto"])
  ) {
    concerns.push({
      id: createId("judge"),
      concern: "Forum and remedy may need clarification",
      reason:
        "The matter may involve court, tribunal, judicial review, appeal, or mixed-path jurisdiction.",
      possibleSolution:
        "Clarify the correct pathway before generating court forms or drafting claims.",
    });
  }

  return concerns;
}

function determineRisk(weaknesses: LitigationWeakness[]): LitigationRiskLevel {
  const high = weaknesses.filter((item) => item.riskLevel === "high").length;
  const moderate = weaknesses.filter((item) => item.riskLevel === "moderate")
    .length;

  if (high >= 2) return "high";
  if (high >= 1 || moderate >= 3) return "moderate";
  return "low";
}

export function buildLitigationStrategyReport(
  context: CaseContext
): LitigationStrategyReport {
  const strengths = buildStrengths(context);
  const weaknesses = buildWeaknesses(context);
  const opposingArguments = buildOpposingArguments(context);
  const judicialConcerns = buildJudicialConcerns(context);
  const text = collectContextText(context);
  const legalTheory = runLegalTheoryEngine(buildLegalTheoryInput(context));

  const missingEvidence = cleanList([
    context.evidenceItems.length === 0 ? "No evidence uploaded." : "",
    !hasChronologyDates(context) ? "No clear dated chronology detected." : "",
    context.evidenceItems.some(
      (item) => !clean(item.description) && !clean(item.relevance)
    )
      ? "Some exhibits lack explanations."
      : "",
    ...legalTheory.allMissingProof.slice(0, 10),
  ]);

  const timelineConcerns = cleanList([
    !hasChronologyDates(context) ? "Timeline dates are weak or missing." : "",
    context.timeline.length < 2 ? "Very few timeline events detected." : "",
    includesAny(text, ["limitation", "deadline", "late", "years ago"])
      ? "Timing or limitation issue may need review."
      : "",
  ]);

  const proceduralConcerns = cleanList([
    context.stage === "not-sure" ? "Current procedural stage is unclear." : "",
    safeTheoryCourtPath(context.casePath) === "civil" &&
    context.issues.length === 0
      ? "Civil claim structure needs clearer issue framing."
      : "",
    safeTheoryCourtPath(context.casePath) === "civil" &&
    includesAny(text, [
      "tribunal",
      "hrto",
      "judicial review",
      "appeal",
      "reconsideration",
    ])
      ? "Forum/pathway must be confirmed before drafting forms."
      : "",
  ]);

  const overallRisk = determineRisk(weaknesses);

  const recommendedNextSteps = cleanList([
    legalTheory.strongestTheory
      ? `Build around the strongest detected theory: ${legalTheory.strongestTheory.theoryName}.`
      : "Clarify the strongest legal theory before drafting.",
    missingEvidence.length > 0 ? "Address missing evidence and proof targets." : "",
    timelineConcerns.length > 0 ? "Strengthen chronology and dated events." : "",
    proceduralConcerns.length > 0
      ? "Clarify procedural stage, forum, and litigation route."
      : "",
    weaknesses.length > 0
      ? "Review weaknesses and suggested fixes before export or filing."
      : "",
    opposingArguments.length > 0
      ? "Prepare responses to likely opposing arguments."
      : "",
    judicialConcerns.length > 0
      ? "Answer judge concerns directly in the case summary and evidence package."
      : "",
    "Continue improving exhibit explanations and issue mapping.",
  ]);

  return {
    id: createId("strategy_report"),
    createdAt: nowIso(),
    overallRisk,
    strengths,
    weaknesses,
    opposingArguments,
    judicialConcerns,
    missingEvidence,
    timelineConcerns,
    proceduralConcerns,
    recommendedNextSteps,
  };
}