export type NarrativeInvestigatorVersion = "1.0.0";

export type NarrativeInvestigationSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type NarrativeInvestigationCategory =
  | "missing-date"
  | "missing-party"
  | "missing-location"
  | "missing-sequence"
  | "missing-evidence"
  | "unclear-fact"
  | "legal-conclusion"
  | "credibility-risk"
  | "contradiction-risk"
  | "damages-gap"
  | "procedure-gap"
  | "witness-gap"
  | "unknown";

export type NarrativeInvestigationFinding = {
  id: string;
  category: NarrativeInvestigationCategory;
  severity: NarrativeInvestigationSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  whatToCollect: string[];
  sourceText?: string;
};

export type NarrativeInvestigationInput = {
  caseId?: string;
  rawNarrative?: string;
  knownFacts?: string[];
  knownIssues?: string[];
  knownParties?: string[];
  knownEvidenceTitles?: string[];
  knownTimelineEvents?: Array<{
    id?: string;
    title?: string;
    description?: string;
    date?: string;
  }>;
  warnings?: string[];
};

export type NarrativeInvestigationResult = {
  version: NarrativeInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  findings: NarrativeInvestigationFinding[];

  missingDates: string[];
  missingParties: string[];
  missingLocations: string[];
  missingEvidence: string[];
  unclearFacts: string[];
  credibilityConcerns: string[];
  contradictionConcerns: string[];
  damagesQuestions: string[];
  proceduralQuestions: string[];
  witnessQuestions: string[];

  topQuestions: string[];
  nextActions: string[];
  warnings: string[];
  summary: string;
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
  return clean(value).toLowerCase();
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalizedText = normalize(text);

  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function hasAnyKnownValue(values?: unknown[]): boolean {
  return Boolean(values && values.some((value) => clean(value)));
}

function splitNarrative(rawNarrative?: string): string[] {
  return uniqueStrings(
    clean(rawNarrative)
      .split(/[.!?\n]+/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 8),
  );
}

function hasDateSignal(text: string): boolean {
  return (
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(text) ||
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/.test(text) ||
    includesAny(text, [
      "january",
      "february",
      "march",
      "april",
      "may ",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
      "yesterday",
      "today",
      "last week",
      "last month",
      "in 202",
      "on or about",
    ])
  );
}

function createFinding(args: {
  category: NarrativeInvestigationCategory;
  severity: NarrativeInvestigationSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  whatToCollect: string[];
  sourceText?: string;
}): NarrativeInvestigationFinding {
  return {
    id: createId("narrative_finding"),
    category: args.category,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    recommendedQuestion: args.recommendedQuestion,
    whatToCollect: uniqueStrings(args.whatToCollect),
    sourceText: args.sourceText,
  };
}

function buildBaselineFindings(
  input: NarrativeInvestigationInput,
): NarrativeInvestigationFinding[] {
  const findings: NarrativeInvestigationFinding[] = [];
  const narrative = clean(input.rawNarrative);
  const sentences = splitNarrative(input.rawNarrative);

  if (!narrative) {
    findings.push(
      createFinding({
        category: "unclear-fact",
        severity: "critical",
        title: "No narrative supplied",
        explanation:
          "The system does not yet have the user's factual story.",
        whyItMatters:
          "CourtSimplified cannot investigate, map proof, assess procedure, or prepare documents without a factual narrative.",
        recommendedQuestion:
          "What happened, in your own words, from the beginning to now?",
        whatToCollect: [
          "Main story",
          "Important dates",
          "People involved",
          "Documents or screenshots",
          "What the user wants the court to do",
        ],
      }),
    );

    return findings;
  }

  if (!hasAnyKnownValue(input.knownParties)) {
    findings.push(
      createFinding({
        category: "missing-party",
        severity: "high",
        title: "Parties are not clearly identified",
        explanation:
          "The narrative does not yet have a structured list of people, businesses, institutions, or opposing parties.",
        whyItMatters:
          "Party identification affects court forms, service, evidence mapping, witness planning, and who the claim or response is against.",
        recommendedQuestion:
          "Who are all the people, businesses, organizations, or institutions involved, and what role did each one play?",
        whatToCollect: [
          "Full names",
          "Roles",
          "Addresses if needed for service",
          "Relationship to the dispute",
          "Whether each person is a party or witness",
        ],
      }),
    );
  }

  if (!sentences.some(hasDateSignal) && !hasAnyKnownValue(input.knownTimelineEvents)) {
    findings.push(
      createFinding({
        category: "missing-date",
        severity: "high",
        title: "Important dates are missing",
        explanation:
          "The narrative does not yet provide enough dates or timeline anchors.",
        whyItMatters:
          "Dates affect limitation periods, procedural deadlines, credibility, damages, service, and whether the sequence of events makes sense.",
        recommendedQuestion:
          "What are the key dates or approximate dates for each important event?",
        whatToCollect: [
          "Exact dates",
          "Approximate dates",
          "Messages with timestamps",
          "Filed documents",
          "Orders",
          "Payment dates",
        ],
      }),
    );
  }

  if (!hasAnyKnownValue(input.knownEvidenceTitles)) {
    findings.push(
      createFinding({
        category: "missing-evidence",
        severity: "high",
        title: "Evidence is not yet identified",
        explanation:
          "The narrative is not yet connected to documents, screenshots, photos, records, witnesses, or other proof.",
        whyItMatters:
          "A case may sound strong but still fail if the facts are not connected to evidence.",
        recommendedQuestion:
          "What documents, screenshots, messages, photos, bank records, receipts, court records, or witnesses support your story?",
        whatToCollect: [
          "Text messages",
          "Emails",
          "Screenshots",
          "Photos",
          "Receipts",
          "Bank records",
          "Court documents",
          "Witness names",
        ],
      }),
    );
  }

  return findings;
}

function buildSentenceFindings(sentence: string): NarrativeInvestigationFinding[] {
  const findings: NarrativeInvestigationFinding[] = [];
  const lower = normalize(sentence);

  if (
    includesAny(lower, [
      "lied",
      "false",
      "harassed",
      "threatened",
      "abused",
      "negligent",
      "breached",
      "discriminated",
      "violated my rights",
    ]) &&
    !includesAny(lower, [
      "because",
      "shown by",
      "text",
      "email",
      "screenshot",
      "receipt",
      "record",
      "witness",
    ])
  ) {
    findings.push(
      createFinding({
        category: "legal-conclusion",
        severity: "medium",
        title: "Conclusion needs supporting facts",
        explanation:
          "The narrative uses a conclusion or legal characterization without clearly explaining the facts and proof behind it.",
        whyItMatters:
          "Courts usually need specific facts, dates, words, actions, and evidence rather than conclusions alone.",
        recommendedQuestion:
          "What exact words, actions, dates, documents, or witnesses support this point?",
        whatToCollect: [
          "Exact words",
          "Specific actions",
          "Dates",
          "Screenshots",
          "Witnesses",
          "Documents",
        ],
        sourceText: sentence,
      }),
    );
  }

  if (
    includesAny(lower, ["someone", "they", "he", "she", "them"]) &&
    !includesAny(lower, ["named", "called", "identified"])
  ) {
    findings.push(
      createFinding({
        category: "missing-party",
        severity: "medium",
        title: "Person or party is unclear",
        explanation:
          "The narrative refers to someone without clearly identifying who it is.",
        whyItMatters:
          "Unclear actors make it harder to assign responsibility, connect evidence, prepare forms, or explain the story to the court.",
        recommendedQuestion:
          "Who exactly is being referred to in this part of the story?",
        whatToCollect: [
          "Name",
          "Role",
          "Relationship to the case",
          "Whether they are a party or witness",
        ],
        sourceText: sentence,
      }),
    );
  }

  if (
    includesAny(lower, ["lost money", "damages", "cost me", "owed", "paid", "unpaid", "repair", "invoice"]) &&
    !includesAny(lower, ["receipt", "bank", "invoice", "estimate", "calculation", "$"])
  ) {
    findings.push(
      createFinding({
        category: "damages-gap",
        severity: "high",
        title: "Damages need proof",
        explanation:
          "The narrative mentions money, loss, payment, or damages without clearly identifying the records that prove the amount.",
        whyItMatters:
          "Courts usually need a clear damages calculation and supporting records.",
        recommendedQuestion:
          "What records prove the amount claimed or disputed?",
        whatToCollect: [
          "Receipts",
          "Invoices",
          "Bank records",
          "Repair estimates",
          "Payment screenshots",
          "Damages table",
        ],
        sourceText: sentence,
      }),
    );
  }

  if (
    includesAny(lower, ["served", "filed", "court date", "order", "deadline", "conference", "motion"]) &&
    !includesAny(lower, ["date", "on ", "file number", "stamped", "affidavit"])
  ) {
    findings.push(
      createFinding({
        category: "procedure-gap",
        severity: "high",
        title: "Procedural details are incomplete",
        explanation:
          "The narrative mentions court or procedure but does not yet include enough detail to confirm the procedural status.",
        whyItMatters:
          "Procedural status affects deadlines, forms, service, next steps, and whether the user should act urgently.",
        recommendedQuestion:
          "What was filed or served, when did it happen, and is there a court file number, order, deadline, or upcoming date?",
        whatToCollect: [
          "Filed documents",
          "Stamped copies",
          "Affidavit of service",
          "Court notices",
          "Orders",
          "Deadlines",
        ],
        sourceText: sentence,
      }),
    );
  }

  if (
    includesAny(lower, ["witness", "saw", "heard", "present", "third party"]) &&
    !includesAny(lower, ["name", "called", "identified"])
  ) {
    findings.push(
      createFinding({
        category: "witness-gap",
        severity: "medium",
        title: "Witness details are missing",
        explanation:
          "The narrative suggests another person may have direct knowledge, but the witness is not clearly identified.",
        whyItMatters:
          "Witnesses can corroborate key facts, publication, payments, events, conduct, and credibility.",
        recommendedQuestion:
          "Who witnessed this, what exactly did they see or hear, and can they provide a statement or attend court if needed?",
        whatToCollect: [
          "Witness name",
          "Contact information",
          "What they personally saw or heard",
          "Related documents or screenshots",
        ],
        sourceText: sentence,
      }),
    );
  }

  if (
    includesAny(lower, ["always", "never", "everyone", "clearly", "obviously"]) &&
    !includesAny(lower, ["record", "statement", "messages", "receipts", "proof"])
  ) {
    findings.push(
      createFinding({
        category: "credibility-risk",
        severity: "medium",
        title: "Absolute wording may weaken credibility",
        explanation:
          "The narrative uses broad wording that may be challenged unless supported by records.",
        whyItMatters:
          "Overbroad wording can make the user's position easier to attack and may distract from provable facts.",
        recommendedQuestion:
          "Can this point be stated with exact dates, examples, records, or specific wording instead of broad wording?",
        whatToCollect: [
          "Specific examples",
          "Dates",
          "Exact wording",
          "Documents",
          "Screenshots",
        ],
        sourceText: sentence,
      }),
    );
  }

  return findings;
}

function severityRank(value: NarrativeInvestigationSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function buildAllFindings(
  input: NarrativeInvestigationInput,
): NarrativeInvestigationFinding[] {
  const sentenceFindings = splitNarrative(input.rawNarrative).flatMap(
    buildSentenceFindings,
  );

  return [...buildBaselineFindings(input), ...sentenceFindings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
}

function findingsByCategory(
  findings: NarrativeInvestigationFinding[],
  category: NarrativeInvestigationCategory,
): NarrativeInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(findings: NarrativeInvestigationFinding[]): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

export function buildNarrativeInvestigation(
  input: NarrativeInvestigationInput,
): NarrativeInvestigationResult {
  const findings = buildAllFindings(input);
  const topQuestions = questionsFromFindings(findings).slice(0, 10);

  const warnings = uniqueStrings([
    ...(input.warnings || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    findings,

    missingDates: findingsByCategory(findings, "missing-date").map(
      (finding) => finding.recommendedQuestion,
    ),
    missingParties: findingsByCategory(findings, "missing-party").map(
      (finding) => finding.recommendedQuestion,
    ),
    missingLocations: findingsByCategory(findings, "missing-location").map(
      (finding) => finding.recommendedQuestion,
    ),
    missingEvidence: findingsByCategory(findings, "missing-evidence").map(
      (finding) => finding.recommendedQuestion,
    ),
    unclearFacts: findingsByCategory(findings, "unclear-fact").map(
      (finding) => finding.recommendedQuestion,
    ),
    credibilityConcerns: findingsByCategory(findings, "credibility-risk").map(
      (finding) => finding.recommendedQuestion,
    ),
    contradictionConcerns: findingsByCategory(findings, "contradiction-risk").map(
      (finding) => finding.recommendedQuestion,
    ),
    damagesQuestions: findingsByCategory(findings, "damages-gap").map(
      (finding) => finding.recommendedQuestion,
    ),
    proceduralQuestions: findingsByCategory(findings, "procedure-gap").map(
      (finding) => finding.recommendedQuestion,
    ),
    witnessQuestions: findingsByCategory(findings, "witness-gap").map(
      (finding) => finding.recommendedQuestion,
    ),

    topQuestions,
    nextActions: uniqueStrings([
      ...topQuestions,
      "Convert conclusions into specific facts, dates, evidence, and proof points.",
      "Connect every important event to a document, screenshot, record, or witness where possible.",
    ]).slice(0, 12),

    warnings,

    summary:
      findings.length > 0
        ? `Narrative investigation found ${findings.length} issue(s) or follow-up question(s) in the user story.`
        : "Narrative investigation did not identify major gaps from the available story.",
  };
}