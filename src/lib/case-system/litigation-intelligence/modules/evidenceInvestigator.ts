export type EvidenceInvestigatorVersion = "1.0.0";

export type EvidenceInvestigationSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type EvidenceInvestigationCategory =
  | "missing-evidence"
  | "weak-evidence"
  | "authenticity"
  | "foundation"
  | "corroboration"
  | "contradiction"
  | "chronology"
  | "damages-proof"
  | "witness-support"
  | "court-package-readiness"
  | "unknown";

export type EvidenceInvestigationFinding = {
  id: string;
  category: EvidenceInvestigationCategory;
  severity: EvidenceInvestigationSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  whatToCollect: string[];
  linkedEvidenceIds: string[];
  linkedClaimIds: string[];
  source: string;
};

export type EvidenceInvestigationInput = {
  caseId?: string;

  evidenceItems?: Array<{
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    sourceText?: string;
    linkedClaimDomains?: string[];
    linkedTimelineEventIds?: string[];
    tags?: string[];
  }>;

  evidenceIntelligence?: {
    findingCount?: number;
    gapCount?: number;
    contradictionCount?: number;
    strongestEvidence?: string[];
    weakestEvidence?: string[];
    recommendedEvidenceCollection?: string[];
    warnings?: string[];
    summary?: string;
  };

  evidenceAnalysis?: {
    proofGaps?: string[];
    contradictionNotes?: string[];
    credibilityConcerns?: string[];
    chronologyConcerns?: string[];
    bundleWarnings?: string[];
    corroborationNotes?: string[];
  };

  proofWeaknesses?: string[];
  damagesWarnings?: string[];
  timelineWarnings?: string[];
  credibilityWarnings?: string[];
  contradictionWarnings?: string[];
  proceduralWarnings?: string[];
};

type EvidenceItem =
  NonNullable<EvidenceInvestigationInput["evidenceItems"]>[number];

export type EvidenceInvestigationResult = {
  version: EvidenceInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  findings: EvidenceInvestigationFinding[];

  missingEvidenceRequests: string[];
  authenticityRequests: string[];
  foundationRequests: string[];
  corroborationRequests: string[];
  contradictionReviewRequests: string[];
  chronologyRequests: string[];
  damagesProofRequests: string[];
  witnessSupportRequests: string[];
  courtPackageRequests: string[];

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

function severityRank(value: EvidenceInvestigationSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function textOfEvidence(item: EvidenceItem): string {
  return normalize(
    [
      item.id,
      item.title,
      item.description,
      item.type,
      item.sourceText,
      ...(item.linkedClaimDomains || []),
      ...(item.linkedTimelineEventIds || []),
      ...(item.tags || []),
    ].join(" "),
  );
}

function createFinding(args: {
  category: EvidenceInvestigationCategory;
  severity: EvidenceInvestigationSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  whatToCollect: string[];
  linkedEvidenceIds?: string[];
  linkedClaimIds?: string[];
  source: string;
}): EvidenceInvestigationFinding {
  return {
    id: createId("evidence_investigation"),
    category: args.category,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    recommendedQuestion: args.recommendedQuestion,
    whatToCollect: uniqueStrings(args.whatToCollect),
    linkedEvidenceIds: args.linkedEvidenceIds || [],
    linkedClaimIds: args.linkedClaimIds || [],
    source: args.source,
  };
}

function buildBaselineFindings(
  input: EvidenceInvestigationInput,
): EvidenceInvestigationFinding[] {
  const findings: EvidenceInvestigationFinding[] = [];
  const evidenceItems = input.evidenceItems || [];

  if (evidenceItems.length === 0) {
    findings.push(
      createFinding({
        category: "missing-evidence",
        severity: "critical",
        title: "No evidence identified",
        explanation:
          "The case does not yet have evidence items connected to the litigation model.",
        whyItMatters:
          "A legal theory or narrative may sound strong, but CourtSimplified should not treat it as court-ready unless facts are connected to proof.",
        recommendedQuestion:
          "What documents, screenshots, photos, records, messages, receipts, or witnesses support the user's story?",
        whatToCollect: [
          "Text messages",
          "Emails",
          "Screenshots",
          "Photos",
          "Receipts",
          "Bank records",
          "Contracts",
          "Court documents",
          "Witness names",
        ],
        source: "evidenceItems",
      }),
    );
  }

  for (const warning of input.evidenceIntelligence?.warnings || []) {
    findings.push(
      createFinding({
        category: "weak-evidence",
        severity: includesAny(warning, ["critical", "high", "missing"])
          ? "high"
          : "medium",
        title: "Evidence intelligence warning",
        explanation: warning,
        whyItMatters:
          "Evidence warnings identify proof problems that may affect pleadings, strategy, settlement, or court-package readiness.",
        recommendedQuestion:
          "What evidence or context can fix this evidence warning?",
        whatToCollect: [
          "Original documents",
          "Full screenshots",
          "Dates",
          "Sources",
          "Witness details",
          "Supporting records",
        ],
        source: "evidenceIntelligence.warnings",
      }),
    );
  }

  for (const gap of input.evidenceAnalysis?.proofGaps || []) {
    findings.push(
      createFinding({
        category: "foundation",
        severity: "high",
        title: "Evidence proof gap",
        explanation: gap,
        whyItMatters:
          "A proof gap can prevent an item from being useful or persuasive in court.",
        recommendedQuestion:
          "What foundation, source, date, context, or supporting record fills this proof gap?",
        whatToCollect: [
          "Original source",
          "Date created",
          "Who created it",
          "Who received it",
          "How it was preserved",
          "Supporting records",
        ],
        source: "evidenceAnalysis.proofGaps",
      }),
    );
  }

  return findings;
}

function buildEvidenceItemFindings(
  input: EvidenceInvestigationInput,
): EvidenceInvestigationFinding[] {
  const findings: EvidenceInvestigationFinding[] = [];

  for (const item of input.evidenceItems || []) {
    const text = textOfEvidence(item);
    const evidenceId = clean(item.id);
    const title = clean(item.title) || "Evidence item";

    if (
      includesAny(text, ["screenshot", "text", "message", "email", "chat"]) &&
      !includesAny(text, ["date", "sender", "receiver", "recipient", "context"])
    ) {
      findings.push(
        createFinding({
          category: "authenticity",
          severity: "high",
          title: `${title}: authentication details needed`,
          explanation:
            "This appears to be communication evidence, but the record should show enough information to authenticate it.",
          whyItMatters:
            "Screenshots and messages are stronger when they show sender, recipient, date, and surrounding context.",
          recommendedQuestion:
            "Does this message evidence show who sent it, who received it, the date/time, and enough surrounding context?",
          whatToCollect: [
            "Full conversation screenshot",
            "Sender name",
            "Receiver name",
            "Date and time",
            "Uncropped context",
            "Exported message record if available",
          ],
          linkedEvidenceIds: evidenceId ? [evidenceId] : [],
          source: "evidenceItems.communication",
        }),
      );
    }

    if (
      includesAny(text, [
        "receipt",
        "invoice",
        "bank",
        "payment",
        "e-transfer",
        "etransfer",
      ]) &&
      !includesAny(text, ["amount", "$", "date", "from", "to"])
    ) {
      findings.push(
        createFinding({
          category: "damages-proof",
          severity: "medium",
          title: `${title}: payment details should be confirmed`,
          explanation:
            "This appears to be money or payment evidence, but the amount, date, payer, or recipient may need clearer identification.",
          whyItMatters:
            "Money evidence is more useful when it clearly proves the amount, date, payer, recipient, and purpose.",
          recommendedQuestion:
            "Does this record clearly show the amount, date, payer, recipient, and purpose of the payment or loss?",
          whatToCollect: [
            "Amount",
            "Date",
            "Payer",
            "Recipient",
            "Purpose",
            "Bank record",
            "Receipt or invoice",
          ],
          linkedEvidenceIds: evidenceId ? [evidenceId] : [],
          source: "evidenceItems.money",
        }),
      );
    }

    if (
      includesAny(text, ["photo", "picture", "damage", "repair", "condition"]) &&
      !includesAny(text, ["date", "location", "before", "after", "who took"])
    ) {
      findings.push(
        createFinding({
          category: "foundation",
          severity: "medium",
          title: `${title}: photo foundation needed`,
          explanation:
            "This appears to be photo or physical-condition evidence, but date, location, source, or before-and-after context may be missing.",
          whyItMatters:
            "Photos are stronger when the court can understand when, where, why, and by whom they were taken.",
          recommendedQuestion:
            "When and where was the photo taken, who took it, and what exactly does it show?",
          whatToCollect: [
            "Date",
            "Location",
            "Who took the photo",
            "What the photo shows",
            "Before-and-after comparison",
            "Repair or inspection records",
          ],
          linkedEvidenceIds: evidenceId ? [evidenceId] : [],
          source: "evidenceItems.photo",
        }),
      );
    }

    if (
      includesAny(text, ["witness", "saw", "heard", "third party"]) &&
      !includesAny(text, ["name", "statement", "contact", "present"])
    ) {
      findings.push(
        createFinding({
          category: "witness-support",
          severity: "medium",
          title: `${title}: witness support needs details`,
          explanation:
            "This evidence suggests a witness or third party may have relevant information, but the witness details are incomplete.",
          whyItMatters:
            "Witness evidence can corroborate facts, explain context, and strengthen credibility.",
          recommendedQuestion:
            "Who is the witness, what did they personally see or hear, and can they provide a statement or attend court if needed?",
          whatToCollect: [
            "Witness name",
            "Contact information",
            "What they saw or heard",
            "Statement",
            "Related documents",
          ],
          linkedEvidenceIds: evidenceId ? [evidenceId] : [],
          source: "evidenceItems.witness",
        }),
      );
    }
  }

  return findings;
}

function buildRelationshipFindings(
  input: EvidenceInvestigationInput,
): EvidenceInvestigationFinding[] {
  const findings: EvidenceInvestigationFinding[] = [];

  for (const contradiction of input.evidenceAnalysis?.contradictionNotes || []) {
    findings.push(
      createFinding({
        category: "contradiction",
        severity: "high",
        title: "Evidence contradiction needs review",
        explanation: contradiction,
        whyItMatters:
          "Contradictory evidence can damage credibility and give the other side an attack point.",
        recommendedQuestion:
          "Which version is accurate, and what evidence explains or resolves the contradiction?",
        whatToCollect: [
          "Side-by-side comparison",
          "Original records",
          "Dates",
          "Context",
          "Explanation for inconsistency",
        ],
        source: "evidenceAnalysis.contradictionNotes",
      }),
    );
  }

  for (const concern of input.evidenceAnalysis?.chronologyConcerns || []) {
    findings.push(
      createFinding({
        category: "chronology",
        severity: "medium",
        title: "Chronology concern",
        explanation: concern,
        whyItMatters:
          "Timeline problems can affect credibility, causation, limitation periods, and the sequence of proof.",
        recommendedQuestion:
          "What dates or records show the correct sequence of events?",
        whatToCollect: [
          "Exact dates",
          "Timeline",
          "Messages with timestamps",
          "Filed documents",
          "Payment records",
          "Event sequence",
        ],
        source: "evidenceAnalysis.chronologyConcerns",
      }),
    );
  }

  for (const concern of input.evidenceAnalysis?.credibilityConcerns || []) {
    findings.push(
      createFinding({
        category: "corroboration",
        severity: "medium",
        title: "Corroboration may be needed",
        explanation: concern,
        whyItMatters:
          "If credibility is questioned, corroborating records or witnesses become more important.",
        recommendedQuestion:
          "What independent record, witness, screenshot, or document supports this point?",
        whatToCollect: [
          "Independent records",
          "Witnesses",
          "Screenshots",
          "Documents",
          "Full context",
        ],
        source: "evidenceAnalysis.credibilityConcerns",
      }),
    );
  }

  return findings;
}

function buildWarningFindings(
  input: EvidenceInvestigationInput,
): EvidenceInvestigationFinding[] {
  const warnings = [
    ...(input.proofWeaknesses || []),
    ...(input.damagesWarnings || []),
    ...(input.timelineWarnings || []),
    ...(input.credibilityWarnings || []),
    ...(input.contradictionWarnings || []),
    ...(input.proceduralWarnings || []),
  ];

  return warnings.map((warning) =>
    createFinding({
      category: includesAny(warning, ["damage", "amount", "money", "loss"])
        ? "damages-proof"
        : includesAny(warning, ["timeline", "date", "sequence"])
          ? "chronology"
          : includesAny(warning, ["contradiction", "inconsistent"])
            ? "contradiction"
            : includesAny(warning, ["credibility"])
              ? "corroboration"
              : includesAny(warning, ["served", "filed", "procedure", "court"])
                ? "court-package-readiness"
                : "weak-evidence",
      severity: includesAny(warning, ["critical", "high", "missing"])
        ? "high"
        : "medium",
      title: "Evidence-related warning",
      explanation: warning,
      whyItMatters:
        "This warning may affect whether evidence can safely support the case theory, court package, or strategy.",
      recommendedQuestion:
        "What evidence, document, date, source, or explanation addresses this warning?",
      whatToCollect: [
        "Documents",
        "Dates",
        "Original records",
        "Source details",
        "Supporting evidence",
      ],
      source: "crossSystemWarnings",
    }),
  );
}

function findingsByCategory(
  findings: EvidenceInvestigationFinding[],
  category: EvidenceInvestigationCategory,
): EvidenceInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: EvidenceInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function collectionFromCategory(
  findings: EvidenceInvestigationFinding[],
  category: EvidenceInvestigationCategory,
): string[] {
  return uniqueStrings(
    findingsByCategory(findings, category).flatMap(
      (finding) => finding.whatToCollect,
    ),
  );
}

export function buildEvidenceInvestigation(
  input: EvidenceInvestigationInput,
): EvidenceInvestigationResult {
  const findings = [
    ...buildBaselineFindings(input),
    ...buildEvidenceItemFindings(input),
    ...buildRelationshipFindings(input),
    ...buildWarningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const topQuestions = questionsFromFindings(findings).slice(0, 12);

  const warnings = uniqueStrings([
    ...(input.evidenceIntelligence?.warnings || []),
    ...(input.evidenceAnalysis?.bundleWarnings || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    findings,

    missingEvidenceRequests: collectionFromCategory(
      findings,
      "missing-evidence",
    ),
    authenticityRequests: collectionFromCategory(findings, "authenticity"),
    foundationRequests: collectionFromCategory(findings, "foundation"),
    corroborationRequests: collectionFromCategory(findings, "corroboration"),
    contradictionReviewRequests: collectionFromCategory(findings, "contradiction"),
    chronologyRequests: collectionFromCategory(findings, "chronology"),
    damagesProofRequests: collectionFromCategory(findings, "damages-proof"),
    witnessSupportRequests: collectionFromCategory(findings, "witness-support"),
    courtPackageRequests: collectionFromCategory(
      findings,
      "court-package-readiness",
    ),

    topQuestions,
    nextActions: uniqueStrings([
      ...topQuestions,
      "Connect every important factual claim to at least one evidence item where possible.",
      "Confirm source, date, context, and authenticity for all key exhibits.",
      "Separate strong evidence from weak, missing, or unsupported evidence before generating court materials.",
    ]).slice(0, 14),

    warnings,

    summary:
      findings.length > 0
        ? `Evidence investigation found ${findings.length} evidence issue(s), gap(s), or follow-up question(s).`
        : "Evidence investigation did not identify major evidence gaps from the available record.",
  };
}