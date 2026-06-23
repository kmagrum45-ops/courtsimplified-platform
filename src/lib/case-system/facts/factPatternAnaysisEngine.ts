import {
  FactPatternAnalysisResult,
  FactPatternCategory,
  FactPatternFinding,
} from "./factPatternTypes";

import {
  ExtractedEvidence,
  ExtractedEvent,
  IntelligenceConfidence,
  IntelligenceSeverity,
  NormalizedIntake,
} from "../intelligence/intelligenceTypes";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function confidenceFromCount(count: number): IntelligenceConfidence {
  if (count >= 6) return "high";
  if (count >= 3) return "medium";
  if (count >= 1) return "low";
  return "very-low";
}

function severityForCategory(category: FactPatternCategory): IntelligenceSeverity {
  if (
    category === "contradiction" ||
    category === "credibility" ||
    category === "causation"
  ) {
    return "high";
  }

  if (
    category === "admission" ||
    category === "denial" ||
    category === "timeline" ||
    category === "knowledge" ||
    category === "notice"
  ) {
    return "medium";
  }

  return "low";
}

function evidenceIdsByTextMatch(args: {
  text: string;
  evidence: ExtractedEvidence[];
}): string[] {
  const text = normalize(args.text);

  return args.evidence
    .filter((item) => {
      const combined = normalize(`${item.title} ${item.description || ""} ${item.sourceText || ""}`);
      return combined.length > 0 && text.length > 0 && combined.includes(text.slice(0, 20));
    })
    .map((item) => item.id);
}

function buildFinding(args: {
  category: FactPatternCategory;
  title: string;
  description: string;
  supportingFactIds?: string[];
  supportingEvidenceIds?: string[];
  confidence?: IntelligenceConfidence;
  significance: string;
  litigationImpact: string;
}): FactPatternFinding {
  return {
    id: createId("fact_pattern"),
    category: args.category,
    title: args.title,
    description: args.description,
    supportingFactIds: args.supportingFactIds || [],
    supportingEvidenceIds: args.supportingEvidenceIds || [],
    confidence: args.confidence || "medium",
    severity: severityForCategory(args.category),
    significance: args.significance,
    litigationImpact: args.litigationImpact,
  };
}

function detectAdmissionPatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const raw = normalize(intake.rawUserText);
  const findings: FactPatternFinding[] = [];

  if (
    raw.includes("admitted") ||
    raw.includes("admits") ||
    raw.includes("said they did") ||
    raw.includes("confirmed") ||
    raw.includes("acknowledged")
  ) {
    findings.push(
      buildFinding({
        category: "admission",
        title: "Possible admission detected",
        description:
          "The intake contains language suggesting that someone may have admitted or acknowledged an important fact.",
        confidence: "medium",
        significance:
          "Admissions can be important because they may reduce what needs to be proven through other evidence.",
        litigationImpact:
          "The system should preserve the exact words, speaker, date, context, and supporting document before relying on this as an admission.",
      }),
    );
  }

  return findings;
}

function detectDenialPatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const raw = normalize(intake.rawUserText);
  const findings: FactPatternFinding[] = [];

  if (
    raw.includes("denied") ||
    raw.includes("denies") ||
    raw.includes("never") ||
    raw.includes("refused") ||
    raw.includes("said it never happened")
  ) {
    findings.push(
      buildFinding({
        category: "denial",
        title: "Possible denial detected",
        description:
          "The intake contains language suggesting that a party denied an important fact.",
        confidence: "medium",
        significance:
          "A denial can create a dispute that must be supported or challenged with records, dates, messages, or witness evidence.",
        litigationImpact:
          "The system should compare the denial against documents, payment records, messages, admissions, and timeline evidence.",
      }),
    );
  }

  return findings;
}

function detectContradictionPatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const raw = normalize(intake.rawUserText);
  const findings: FactPatternFinding[] = [];

  if (
    raw.includes("but") ||
    raw.includes("however") ||
    raw.includes("contradict") ||
    raw.includes("doesn't match") ||
    raw.includes("does not match") ||
    raw.includes("different story")
  ) {
    findings.push(
      buildFinding({
        category: "contradiction",
        title: "Possible factual contradiction detected",
        description:
          "The intake contains signals that two facts, statements, or records may not match.",
        confidence: "medium",
        significance:
          "Contradictions can affect credibility, proof strength, settlement pressure, and court readiness.",
        litigationImpact:
          "The system should compare each conflicting statement against the timeline, documents, evidence, and prior admissions.",
      }),
    );
  }

  return findings;
}

function detectTimelinePatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const raw = normalize(intake.rawUserText);
  const findings: FactPatternFinding[] = [];

  if (
    intake.dates.length > 0 ||
    raw.includes("before") ||
    raw.includes("after") ||
    raw.includes("then") ||
    raw.includes("later") ||
    raw.includes("deadline") ||
    raw.includes("late")
  ) {
    findings.push(
      buildFinding({
        category: "timeline",
        title: "Timeline significance detected",
        description:
          "The intake contains date, sequence, delay, or deadline signals.",
        supportingFactIds: intake.events.map((event) => event.id),
        confidence: confidenceFromCount(intake.dates.length + intake.events.length),
        significance:
          "Timeline order can affect limitation periods, procedural steps, credibility, causation, and proof.",
        litigationImpact:
          "The system should build a date-by-date chronology before generating final court materials.",
      }),
    );
  }

  return findings;
}

function detectKnowledgeNoticePatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const raw = normalize(intake.rawUserText);
  const findings: FactPatternFinding[] = [];

  if (
    raw.includes("knew") ||
    raw.includes("known") ||
    raw.includes("notice") ||
    raw.includes("warned") ||
    raw.includes("told") ||
    raw.includes("aware")
  ) {
    findings.push(
      buildFinding({
        category: raw.includes("notice") || raw.includes("warned") ? "notice" : "knowledge",
        title: "Knowledge or notice signal detected",
        description:
          "The intake contains language suggesting that a party may have known about, been warned about, or received notice of an important fact.",
        confidence: "medium",
        significance:
          "Knowledge and notice can matter to responsibility, foreseeability, credibility, procedural fairness, and causation.",
        litigationImpact:
          "The system should identify who knew what, when they knew it, how they knew it, and what record proves it.",
      }),
    );
  }

  return findings;
}

function detectCausationPatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const raw = normalize(intake.rawUserText);
  const findings: FactPatternFinding[] = [];

  if (
    raw.includes("because") ||
    raw.includes("caused") ||
    raw.includes("led to") ||
    raw.includes("resulted in") ||
    raw.includes("due to")
  ) {
    findings.push(
      buildFinding({
        category: "causation",
        title: "Causation signal detected",
        description:
          "The intake contains language connecting one event, act, omission, or decision to a harm or result.",
        confidence: "medium",
        significance:
          "Causation is often one of the hardest parts of a case and usually needs a clear chain of proof.",
        litigationImpact:
          "The system should test whether the evidence proves more than timing or suspicion and actually supports the causal link.",
      }),
    );
  }

  return findings;
}

function detectDamagesPatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const findings: FactPatternFinding[] = [];

  if (intake.moneyAmounts.length > 0 || intake.harms.length > 0) {
    findings.push(
      buildFinding({
        category: "damages",
        title: "Damages or harm signal detected",
        description:
          "The intake contains money amounts, losses, expenses, harm, or requested outcomes.",
        supportingFactIds: intake.harms.map((harm) => harm.id),
        confidence: confidenceFromCount(intake.moneyAmounts.length + intake.harms.length),
        significance:
          "Damages must usually be proven with records, calculations, receipts, testimony, or other reliable evidence.",
        litigationImpact:
          "The system should separate claimed losses from proven losses and identify missing damages evidence.",
      }),
    );
  }

  return findings;
}

function detectEvidenceLinkedPatterns(intake: NormalizedIntake): FactPatternFinding[] {
  const findings: FactPatternFinding[] = [];

  const evidenceLinkedEvents = intake.events.filter((event: ExtractedEvent) => event.evidenceIds.length > 0);

  if (evidenceLinkedEvents.length > 0) {
    findings.push(
      buildFinding({
        category: "conduct",
        title: "Evidence-linked fact pattern detected",
        description:
          "Some extracted facts or events are already connected to evidence.",
        supportingFactIds: evidenceLinkedEvents.map((event) => event.id),
        supportingEvidenceIds: unique(evidenceLinkedEvents.flatMap((event) => event.evidenceIds)),
        confidence: confidenceFromCount(evidenceLinkedEvents.length),
        significance:
          "Facts connected to evidence are more useful for proof mapping than unsupported narrative statements.",
        litigationImpact:
          "The system should prioritize evidence-linked facts when building proof maps and court materials.",
      }),
    );
  }

  return findings;
}

export function buildFactPatternAnalysis(
  intake: NormalizedIntake,
): FactPatternAnalysisResult {
  const findings = [
    ...detectAdmissionPatterns(intake),
    ...detectDenialPatterns(intake),
    ...detectContradictionPatterns(intake),
    ...detectTimelinePatterns(intake),
    ...detectKnowledgeNoticePatterns(intake),
    ...detectCausationPatterns(intake),
    ...detectDamagesPatterns(intake),
    ...detectEvidenceLinkedPatterns(intake),
  ];

  const admissions = findings.filter((finding) => finding.category === "admission");
  const contradictions = findings.filter((finding) => finding.category === "contradiction");
  const credibilityIssues = findings.filter(
    (finding) =>
      finding.category === "credibility" ||
      finding.category === "contradiction" ||
      finding.category === "denial",
  );
  const knowledgeIndicators = findings.filter(
    (finding) => finding.category === "knowledge" || finding.category === "notice",
  );
  const timelineIssues = findings.filter((finding) => finding.category === "timeline");
  const causationIssues = findings.filter((finding) => finding.category === "causation");
  const damagesIndicators = findings.filter((finding) => finding.category === "damages");

  const strongestPatterns = findings
    .filter((finding) => finding.confidence === "high" || finding.confidence === "very-high")
    .map((finding) => finding.title);

  const weakestPatterns = findings
    .filter((finding) => finding.confidence === "low" || finding.confidence === "very-low")
    .map((finding) => finding.title);

  const nextActions = unique([
    findings.length > 0
      ? "Review detected fact patterns and connect each one to specific evidence."
      : "Collect more facts before relying on fact pattern analysis.",
    admissions.length > 0
      ? "Preserve exact words, dates, speaker, recipient, and context for each possible admission."
      : "",
    contradictions.length > 0
      ? "Compare contradictions against messages, documents, timeline entries, and prior statements."
      : "",
    credibilityIssues.length > 0
      ? "Resolve credibility issues before generating final court materials."
      : "",
    timelineIssues.length > 0
      ? "Build a date-by-date litigation chronology."
      : "",
    causationIssues.length > 0
      ? "Test whether the evidence proves causation, not just timing."
      : "",
    damagesIndicators.length > 0
      ? "Separate claimed damages from proven damages and collect supporting records."
      : "",
  ]);

  return {
    version: "1.0.0",
    findings,
    admissions,
    contradictions,
    credibilityIssues,
    knowledgeIndicators,
    timelineIssues,
    causationIssues,
    damagesIndicators,
    strongestPatterns,
    weakestPatterns,
    nextActions,
    summary:
      findings.length > 0
        ? `Fact pattern analysis detected ${findings.length} litigation pattern(s).`
        : "No major fact patterns were detected from the current intake.",
  };
}