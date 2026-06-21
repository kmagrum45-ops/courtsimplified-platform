export type EvidenceStrengthLevel = "strong" | "moderate" | "weak" | "unknown";

export type EvidenceStrength = EvidenceStrengthLevel;

export type EvidenceRelationshipType =
  | "corroborates"
  | "supports_same_issue"
  | "contradicts"
  | "same_event"
  | "duplicate_or_overlap"
  | "chronology_gap"
  | "credibility_concern"
  | "authenticity_concern"
  | "missing_damages_proof"
  | "missing_causation_proof"
  | "missing_foundation";

export type EvidenceItem = {
  id?: string | number;
  label?: string;
  title?: string;
  description?: string;
  relevance?: string;
  category?: string;
  date?: string;
  source?: string;
  content?: string;

  fileName?: string;
  fileType?: string;
  storagePath?: string;

  relatedIssue?: string;
  relatedLegalElement?: string;
  exhibitGroup?: string;
  exhibitNumber?: string;

  supportsClaim?: boolean;
  supportsDefence?: boolean;

  linkedForms?: string[];
  linkedTimelineEvents?: string[];
};

export type EvidenceRelationship = {
  type: EvidenceRelationshipType;
  sourceLabel: string;
  targetLabel?: string;
  explanation: string;
  severity: "low" | "medium" | "high";
  suggestedFix?: string;
};

export type EvidenceAnalysis = {
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  risks: string[];
  suggestedFixes: string[];
  exhibitUse: string[];

  strengthLevel: EvidenceStrengthLevel;
  suggestedExhibitGroup: string;
  suggestedExhibitNumber?: string;

  relatedIssues: string[];
  relatedLegalElements: string[];

  proceduralUse: string[];
  settlementUse: string[];
  trialUse: string[];

  authenticityRisks: string[];
  hearsayRisks: string[];
  missingFoundation: string[];

  courtPackageNotes: string[];
};

export type EvidenceBundleAnalysis = EvidenceAnalysis & {
  exhibitGroups: ExhibitGroup[];
  packageOrder: string[];
  bundleWarnings: string[];

  relationships: EvidenceRelationship[];
  corroborationNotes: string[];
  contradictionNotes: string[];
  chronologyConcerns: string[];
  credibilityConcerns: string[];
  proofGaps: string[];
};

export type ExhibitGroup = {
  groupLabel: string;
  groupTitle: string;
  items: EvidenceItem[];
  purpose: string;
};

function cleanList(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]) {
  const normalizedText = normalize(text);

  return terms.some((term) => {
    const normalizedTerm = normalize(term);
    return normalizedTerm.length > 0 && normalizedText.includes(normalizedTerm);
  });
}

function textOf(item: EvidenceItem) {
  return normalize(
    [
      item.label,
      item.title,
      item.description,
      item.relevance,
      item.category,
      item.date,
      item.source,
      item.content,
      item.fileName,
      item.fileType,
      item.relatedIssue,
      item.relatedLegalElement,
      item.exhibitGroup,
      item.exhibitNumber,
      ...(item.linkedForms || []),
      ...(item.linkedTimelineEvents || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function hasMeaningfulText(value: unknown) {
  return String(value || "").trim().length > 6;
}

function labelOf(item: EvidenceItem) {
  return String(
    item.label ||
      item.exhibitNumber ||
      item.title ||
      item.id ||
      "Unlabelled exhibit",
  );
}

function detectSuggestedExhibitGroup(item: EvidenceItem) {
  const text = textOf(item);

  if (
    includesAny(text, [
      "screenshot",
      "text",
      "message",
      "email",
      "facebook",
      "instagram",
      "conversation",
      "chat",
    ])
  ) {
    return "A — Messages and communications";
  }

  if (
    includesAny(text, [
      "invoice",
      "receipt",
      "payment",
      "deposit",
      "bank",
      "etransfer",
      "e-transfer",
      "amount",
      "damages",
      "loss",
    ])
  ) {
    return "B — Money, payments, and damages";
  }

  if (
    includesAny(text, [
      "photo",
      "picture",
      "damage",
      "repair",
      "before",
      "after",
      "vehicle",
      "property",
    ])
  ) {
    return "C — Photos, condition, and physical proof";
  }

  if (
    includesAny(text, [
      "witness",
      "saw",
      "heard",
      "third party",
      "recipient",
      "observer",
    ])
  ) {
    return "D — Witnesses and third-party evidence";
  }

  if (
    includesAny(text, [
      "court",
      "filed",
      "served",
      "affidavit of service",
      "claim",
      "defence",
      "conference",
      "order",
      "judgment",
    ])
  ) {
    return "E — Court and procedural documents";
  }

  if (
    includesAny(text, [
      "settlement",
      "offer",
      "proposal",
      "payment plan",
      "negotiate",
      "resolve",
    ])
  ) {
    return "F — Settlement and resolution efforts";
  }

  return "G — Other supporting evidence";
}

function detectRelatedIssues(item: EvidenceItem) {
  const text = textOf(item);
  const issues: string[] = [];

  if (
    includesAny(text, [
      "defamation",
      "slander",
      "libel",
      "false statement",
      "reputation",
      "accused",
      "posted",
      "third party",
    ])
  ) {
    issues.push("Defamation / reputational harm");
  }

  if (
    includesAny(text, [
      "loan",
      "debt",
      "owed",
      "unpaid",
      "invoice",
      "payment",
      "balance",
      "deposit",
      "refund",
    ])
  ) {
    issues.push("Debt / unpaid money");
  }

  if (
    includesAny(text, [
      "contract",
      "agreement",
      "quote",
      "estimate",
      "scope",
      "services",
      "work",
      "renovation",
    ])
  ) {
    issues.push("Contract / agreement dispute");
  }

  if (
    includesAny(text, [
      "damage",
      "repair",
      "property",
      "vehicle",
      "broken",
      "defective",
      "before",
      "after",
    ])
  ) {
    issues.push("Property damage / defective work");
  }

  if (
    includesAny(text, [
      "parenting",
      "custody",
      "access",
      "child",
      "decision-making",
      "school",
      "pickup",
      "drop off",
    ])
  ) {
    issues.push("Parenting / decision-making responsibility");
  }

  if (
    includesAny(text, [
      "support",
      "income",
      "pay stub",
      "tax",
      "notice of assessment",
      "arrears",
      "section 7 expense",
    ])
  ) {
    issues.push("Support / financial disclosure");
  }

  return cleanList([item.relatedIssue || "", ...issues]);
}

function detectLegalElements(item: EvidenceItem) {
  const text = textOf(item);
  const elements: string[] = [];

  if (
    includesAny(text, [
      "exact words",
      "statement",
      "false statement",
      "slander",
      "libel",
      "defamation",
      "called me",
      "accused me",
    ])
  ) {
    elements.push("Exact words or statement");
  }

  if (
    includesAny(text, [
      "third party",
      "recipient",
      "sent to",
      "posted",
      "published",
      "shared",
      "audience",
    ])
  ) {
    elements.push("Publication to another person");
  }

  if (
    includesAny(text, ["false", "not true", "lied", "untrue", "wrong"])
  ) {
    elements.push("Falsity / disputed truth");
  }

  if (
    includesAny(text, [
      "reputation",
      "business",
      "lost work",
      "customers",
      "harm",
      "damage",
      "embarrassment",
    ])
  ) {
    elements.push("Harm, damages, or impact");
  }

  if (
    includesAny(text, ["agreement", "contract", "quote", "promise", "terms"])
  ) {
    elements.push("Agreement or legal obligation");
  }

  if (
    includesAny(text, [
      "payment",
      "invoice",
      "receipt",
      "deposit",
      "bank",
      "etransfer",
      "e-transfer",
      "amount",
    ])
  ) {
    elements.push("Amount claimed / damages calculation");
  }

  if (
    includesAny(text, [
      "served",
      "filed",
      "affidavit of service",
      "court",
      "claim",
      "defence",
    ])
  ) {
    elements.push("Procedural step / service / filing history");
  }

  return cleanList([item.relatedLegalElement || "", ...elements]);
}

function detectProceduralUse(item: EvidenceItem) {
  const text = textOf(item);
  const uses: string[] = [];

  if (includesAny(text, ["served", "service", "affidavit of service"])) {
    uses.push("Use to confirm service or filing history.");
  }

  if (includesAny(text, ["conference", "settlement conference"])) {
    uses.push(
      "Use in settlement conference preparation to identify the issues still in dispute.",
    );
  }

  if (includesAny(text, ["trial", "witness", "exhibit"])) {
    uses.push(
      "Use for trial preparation, exhibit organization, or witness planning.",
    );
  }

  if (includesAny(text, ["deadline", "date", "timeline"])) {
    uses.push("Use to build the case timeline and identify timing issues.");
  }

  return cleanList(uses);
}

function detectSettlementUse(item: EvidenceItem) {
  const text = textOf(item);
  const uses: string[] = [];

  if (
    includesAny(text, [
      "offer",
      "settlement",
      "payment plan",
      "apology",
      "retraction",
      "resolve",
    ])
  ) {
    uses.push(
      "Use to show settlement efforts, offers, refusals, or attempts to resolve.",
    );
  }

  if (
    includesAny(text, [
      "invoice",
      "receipt",
      "payment",
      "damages",
      "loss",
      "amount",
    ])
  ) {
    uses.push(
      "Use to support settlement position and explain the amount being requested.",
    );
  }

  if (
    includesAny(text, [
      "message",
      "email",
      "screenshot",
      "statement",
      "admission",
    ])
  ) {
    uses.push("Use to show what was communicated and narrow the issues for settlement.");
  }

  return cleanList(uses);
}

function detectTrialUse(item: EvidenceItem) {
  const text = textOf(item);
  const uses: string[] = [];

  if (
    includesAny(text, [
      "screenshot",
      "message",
      "email",
      "statement",
      "photo",
      "receipt",
      "invoice",
      "contract",
    ])
  ) {
    uses.push(
      "Use as a potential exhibit if properly authenticated and connected to a live issue.",
    );
  }

  if (includesAny(text, ["witness", "saw", "heard", "third party"])) {
    uses.push(
      "Use to identify witness evidence and what the witness personally observed.",
    );
  }

  if (includesAny(text, ["date", "timeline", "sequence"])) {
    uses.push("Use to support chronology and sequence of events.");
  }

  return cleanList(uses);
}

function detectRisks(item: EvidenceItem) {
  const text = textOf(item);

  const risks: string[] = [];
  const authenticityRisks: string[] = [];
  const hearsayRisks: string[] = [];
  const missingFoundation: string[] = [];
  const suggestedFixes: string[] = [];

  if (
    includesAny(text, [
      "screenshot",
      "message",
      "text",
      "email",
      "facebook",
      "instagram",
      "chat",
    ])
  ) {
    authenticityRisks.push(
      "Screenshots should show sender, receiver, date, and enough surrounding context.",
    );
    missingFoundation.push(
      "Identify who sent it, who received it, when it was sent, and how it was preserved.",
    );
    suggestedFixes.push("Keep full conversation order and avoid cropping out important context.");
  }

  if (
    includesAny(text, ["someone said", "told me", "heard that", "rumour", "they said"])
  ) {
    hearsayRisks.push(
      "This may rely on what someone else said and may need a witness or source document.",
    );
    suggestedFixes.push(
      "Identify the original speaker and whether that person can provide direct evidence.",
    );
  }

  if (
    includesAny(text, ["opinion", "i think", "probably", "everyone knows", "clearly"])
  ) {
    risks.push("This may sound speculative unless tied to specific facts or documents.");
    suggestedFixes.push("Replace opinion wording with exact dates, words, documents, and actions.");
  }

  if (includesAny(text, ["photo", "picture", "damage", "repair"])) {
    missingFoundation.push("Add date, location, what the photo shows, and who took the photo.");
    suggestedFixes.push(
      "Connect photos to repair estimates, receipts, or before-and-after comparison if available.",
    );
  }

  if (includesAny(text, ["invoice", "receipt", "payment", "damages"])) {
    missingFoundation.push("Connect the amount to a damages table or calculation.");
    suggestedFixes.push("Explain how this amount fits into the total claim or defence.");
  }

  return {
    risks: cleanList(risks),
    authenticityRisks: cleanList(authenticityRisks),
    hearsayRisks: cleanList(hearsayRisks),
    missingFoundation: cleanList(missingFoundation),
    suggestedFixes: cleanList(suggestedFixes),
  };
}

function determineStrengthLevel(
  item: EvidenceItem,
  missingInformation: string[],
  risks: string[],
  authenticityRisks: string[],
  hearsayRisks: string[],
): EvidenceStrengthLevel {
  let score = 0;

  if (hasMeaningfulText(item.title)) score += 10;
  if (hasMeaningfulText(item.description)) score += 15;
  if (hasMeaningfulText(item.relevance)) score += 20;
  if (hasMeaningfulText(item.date)) score += 15;
  if (hasMeaningfulText(item.source)) score += 15;
  if (hasMeaningfulText(item.category)) score += 10;
  if (hasMeaningfulText(item.fileName) || hasMeaningfulText(item.storagePath)) {
    score += 10;
  }

  score -= missingInformation.length * 8;
  score -= risks.length * 5;
  score -= authenticityRisks.length * 6;
  score -= hearsayRisks.length * 8;

  if (score >= 55) return "strong";
  if (score >= 30) return "moderate";
  if (score > 0) return "weak";

  return "unknown";
}
export function analyzeEvidenceItem(item: EvidenceItem): EvidenceAnalysis {
  const text = textOf(item);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingInformation: string[] = [];
  const exhibitUse: string[] = [];
  const courtPackageNotes: string[] = [];

  if (hasMeaningfulText(item.title)) strengths.push("This evidence has a clear title.");
  else missingInformation.push("Add a short exhibit title.");

  if (hasMeaningfulText(item.description)) strengths.push("This evidence includes a description.");
  else missingInformation.push("Explain what this evidence shows.");

  if (hasMeaningfulText(item.relevance)) strengths.push("This evidence explains why it matters.");
  else missingInformation.push("Explain why this evidence matters to the claim, defence, or current court step.");

  if (hasMeaningfulText(item.date)) strengths.push("This evidence has a date or event reference.");
  else missingInformation.push("Add the date or event this evidence relates to.");

  if (hasMeaningfulText(item.source)) strengths.push("This evidence identifies a source.");
  else missingInformation.push("Identify who created, sent, received, or produced this evidence.");

  const relatedIssues = detectRelatedIssues(item);
  const relatedLegalElements = detectLegalElements(item);
  const proceduralUse = detectProceduralUse(item);
  const settlementUse = detectSettlementUse(item);
  const trialUse = detectTrialUse(item);
  const riskResult = detectRisks(item);

  if (relatedLegalElements.length > 0) {
    strengths.push("This evidence can be connected to one or more legal proof points.");
  } else {
    weaknesses.push("This evidence is not yet connected to a specific legal element or proof point.");
    missingInformation.push("Identify what legal point this evidence helps prove.");
  }

  if (includesAny(text, ["screenshot", "text", "message", "email"])) {
    exhibitUse.push("Use this to prove communications, notice, admissions, statements, denials, or timeline.");
  }

  if (
    includesAny(text, [
      "invoice",
      "receipt",
      "payment",
      "deposit",
      "bank",
      "etransfer",
      "e-transfer",
    ])
  ) {
    exhibitUse.push("Use this to prove amount claimed, payment history, unpaid balance, or expenses.");
  }

  if (includesAny(text, ["photo", "damage", "repair", "before", "after"])) {
    exhibitUse.push("Use this to prove condition, damage, repairs, or before-and-after comparison.");
  }

  if (includesAny(text, ["witness", "saw", "heard", "third party", "recipient"])) {
    exhibitUse.push("Use this to identify possible witness evidence or publication to another person.");
  }

  const suggestedExhibitGroup =
    item.exhibitGroup || detectSuggestedExhibitGroup(item);

  courtPackageNotes.push(`Suggested exhibit group: ${suggestedExhibitGroup}.`);

  if (relatedIssues.length > 0) {
    courtPackageNotes.push(`Related issue: ${relatedIssues.join(", ")}.`);
  }

  if (relatedLegalElements.length > 0) {
    courtPackageNotes.push(`Proof point: ${relatedLegalElements.join(", ")}.`);
  }

  const strengthLevel = determineStrengthLevel(
    item,
    missingInformation,
    riskResult.risks,
    riskResult.authenticityRisks,
    riskResult.hearsayRisks,
  );

  return {
    strengths: cleanList(strengths),
    weaknesses: cleanList(weaknesses),
    missingInformation: cleanList(missingInformation),
    risks: cleanList(riskResult.risks),
    suggestedFixes: cleanList(riskResult.suggestedFixes),
    exhibitUse: cleanList(exhibitUse),

    strengthLevel,
    suggestedExhibitGroup,
    suggestedExhibitNumber: item.exhibitNumber,

    relatedIssues,
    relatedLegalElements,

    proceduralUse,
    settlementUse,
    trialUse,

    authenticityRisks: riskResult.authenticityRisks,
    hearsayRisks: riskResult.hearsayRisks,
    missingFoundation: riskResult.missingFoundation,

    courtPackageNotes: cleanList(courtPackageNotes),
  };
}

function mergeEvidenceAnalyses(analyses: EvidenceAnalysis[]): EvidenceAnalysis {
  const strengthPriority: Record<EvidenceStrengthLevel, number> = {
    unknown: 0,
    weak: 1,
    moderate: 2,
    strong: 3,
  };

  const strongest =
    analyses
      .map((item) => item.strengthLevel)
      .sort((a, b) => strengthPriority[b] - strengthPriority[a])[0] || "unknown";

  return {
    strengths: cleanList(analyses.flatMap((item) => item.strengths)),
    weaknesses: cleanList(analyses.flatMap((item) => item.weaknesses)),
    missingInformation: cleanList(
      analyses.flatMap((item) => item.missingInformation),
    ),
    risks: cleanList(analyses.flatMap((item) => item.risks)),
    suggestedFixes: cleanList(analyses.flatMap((item) => item.suggestedFixes)),
    exhibitUse: cleanList(analyses.flatMap((item) => item.exhibitUse)),

    strengthLevel: strongest,
    suggestedExhibitGroup: "Bundle-level analysis",
    suggestedExhibitNumber: undefined,

    relatedIssues: cleanList(analyses.flatMap((item) => item.relatedIssues)),
    relatedLegalElements: cleanList(
      analyses.flatMap((item) => item.relatedLegalElements),
    ),

    proceduralUse: cleanList(analyses.flatMap((item) => item.proceduralUse)),
    settlementUse: cleanList(analyses.flatMap((item) => item.settlementUse)),
    trialUse: cleanList(analyses.flatMap((item) => item.trialUse)),

    authenticityRisks: cleanList(
      analyses.flatMap((item) => item.authenticityRisks),
    ),
    hearsayRisks: cleanList(analyses.flatMap((item) => item.hearsayRisks)),
    missingFoundation: cleanList(
      analyses.flatMap((item) => item.missingFoundation),
    ),

    courtPackageNotes: cleanList(
      analyses.flatMap((item) => item.courtPackageNotes),
    ),
  };
}

function buildExhibitGroups(items: EvidenceItem[]): ExhibitGroup[] {
  const groups = new Map<string, EvidenceItem[]>();

  for (const item of items) {
    const analysis = analyzeEvidenceItem(item);
    const group = analysis.suggestedExhibitGroup;

    const existing = groups.get(group) || [];
    groups.set(group, [...existing, item]);
  }

  return Array.from(groups.entries()).map(([groupTitle, groupItems], index) => {
    const groupLabel = groupTitle.split("—")[0]?.trim() || `Group ${index + 1}`;

    return {
      groupLabel,
      groupTitle,
      items: groupItems,
      purpose:
        groupTitle.includes("Messages")
          ? "Communications, statements, publication, admissions, denials, or timeline."
          : groupTitle.includes("Money")
            ? "Amounts claimed, payments, losses, receipts, invoices, or damages."
            : groupTitle.includes("Photos")
              ? "Visual proof of condition, damage, repairs, or physical context."
              : groupTitle.includes("Witnesses")
                ? "Third-party evidence, witnesses, recipients, or people with direct knowledge."
                : groupTitle.includes("Court")
                  ? "Filing history, service, court orders, judgments, or procedural records."
                  : groupTitle.includes("Settlement")
                    ? "Offers, settlement attempts, retractions, apologies, or resolution efforts."
                    : "Other supporting evidence.",
    };
  });
}

function buildPackageOrder(groups: ExhibitGroup[]) {
  const preferredOrder = ["A", "B", "C", "D", "E", "F", "G"];

  return groups
    .slice()
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.groupLabel);
      const bIndex = preferredOrder.indexOf(b.groupLabel);

      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    })
    .map((group) => group.groupTitle);
}

function sameMeaningfulField(a?: string, b?: string) {
  return (
    hasMeaningfulText(a) &&
    hasMeaningfulText(b) &&
    normalize(a) === normalize(b)
  );
}

function sharedWords(a: string, b: string) {
  const ignored = new Set([
    "the",
    "and",
    "for",
    "that",
    "this",
    "with",
    "from",
    "into",
    "they",
    "were",
    "have",
    "has",
    "had",
    "you",
    "your",
    "court",
    "evidence",
    "exhibit",
  ]);

  const aWords = normalize(a)
    .split(" ")
    .filter((word) => word.length > 4 && !ignored.has(word));

  const bWords = normalize(b)
    .split(" ")
    .filter((word) => word.length > 4 && !ignored.has(word));

  return aWords.filter((word) => bWords.includes(word));
}

function buildEvidenceRelationships(items: EvidenceItem[]): EvidenceRelationship[] {
  const relationships: EvidenceRelationship[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const currentText = textOf(current);
    const currentAnalysis = analyzeEvidenceItem(current);

    if (currentAnalysis.authenticityRisks.length > 0) {
      relationships.push({
        type: "authenticity_concern",
        sourceLabel: labelOf(current),
        explanation: `${labelOf(current)} may need stronger authentication before it is used as a court exhibit.`,
        severity: "medium",
        suggestedFix:
          "Confirm sender, receiver, date, full context, and how the evidence was preserved.",
      });
    }

    if (currentAnalysis.missingFoundation.length > 0) {
      relationships.push({
        type: "missing_foundation",
        sourceLabel: labelOf(current),
        explanation: `${labelOf(current)} is useful, but still needs foundation details before it is fully court-ready.`,
        severity: "medium",
        suggestedFix: currentAnalysis.missingFoundation[0],
      });
    }

    if (
      includesAny(currentText, [
        "damages",
        "loss",
        "lost money",
        "lost work",
        "amount claimed",
      ]) &&
      !includesAny(currentText, [
        "invoice",
        "receipt",
        "bank",
        "etransfer",
        "e-transfer",
        "calculation",
      ])
    ) {
      relationships.push({
        type: "missing_damages_proof",
        sourceLabel: labelOf(current),
        explanation: `${labelOf(current)} refers to damages or loss, but does not appear to include direct proof of the amount.`,
        severity: "high",
        suggestedFix:
          "Add receipts, invoices, payment records, repair estimates, lost-work proof, or a damages calculation.",
      });
    }

    if (
      includesAny(currentText, ["because", "caused", "as a result", "led to", "impact"]) &&
      !includesAny(currentText, ["timeline", "before", "after", "date", "sequence"])
    ) {
      relationships.push({
        type: "missing_causation_proof",
        sourceLabel: labelOf(current),
        explanation: `${labelOf(current)} may support impact, but the cause-and-effect link is not clearly proven yet.`,
        severity: "high",
        suggestedFix:
          "Connect this exhibit to a dated event, prior warning, communication, invoice, photo, or witness evidence.",
      });
    }

    for (let j = i + 1; j < items.length; j += 1) {
      const other = items[j];
      const otherText = textOf(other);
      const otherAnalysis = analyzeEvidenceItem(other);

      const sameDate = sameMeaningfulField(current.date, other.date);
      const sameSource = sameMeaningfulField(current.source, other.source);
      const sameIssue =
        currentAnalysis.relatedIssues.some((issue) =>
          otherAnalysis.relatedIssues.includes(issue),
        ) || sameMeaningfulField(current.relatedIssue, other.relatedIssue);

      const sameElement =
        currentAnalysis.relatedLegalElements.some((element) =>
          otherAnalysis.relatedLegalElements.includes(element),
        ) ||
        sameMeaningfulField(
          current.relatedLegalElement,
          other.relatedLegalElement,
        );

      const overlappingWords = sharedWords(currentText, otherText);

      if (sameDate && sameSource) {
        relationships.push({
          type: "same_event",
          sourceLabel: labelOf(current),
          targetLabel: labelOf(other),
          explanation: `${labelOf(current)} and ${labelOf(other)} appear connected to the same date/source and may belong in the same event sequence.`,
          severity: "low",
          suggestedFix:
            "Review whether these exhibits should be grouped together or cross-referenced in the evidence package.",
        });
      }

      if (sameIssue && sameElement) {
        relationships.push({
          type: "corroborates",
          sourceLabel: labelOf(current),
          targetLabel: labelOf(other),
          explanation: `${labelOf(current)} and ${labelOf(other)} both support the same issue and proof point.`,
          severity: "low",
          suggestedFix:
            "Use these together to strengthen that part of the case theory.",
        });
      } else if (sameIssue) {
        relationships.push({
          type: "supports_same_issue",
          sourceLabel: labelOf(current),
          targetLabel: labelOf(other),
          explanation: `${labelOf(current)} and ${labelOf(other)} relate to the same issue, but may prove different parts of it.`,
          severity: "low",
          suggestedFix:
            "Explain what each exhibit proves so they do not look repetitive.",
        });
      }

      if (overlappingWords.length >= 8 && (sameDate || sameSource || sameIssue)) {
        relationships.push({
          type: "duplicate_or_overlap",
          sourceLabel: labelOf(current),
          targetLabel: labelOf(other),
          explanation: `${labelOf(current)} and ${labelOf(other)} may overlap or repeat similar proof.`,
          severity: "low",
          suggestedFix:
            "Keep both only if each one adds something different, such as context, date, sender, recipient, or proof of impact.",
        });
      }

      if (
        includesAny(currentText, [
          "not true",
          "false",
          "lied",
          "never happened",
          "denied",
        ]) &&
        includesAny(otherText, ["admitted", "confirmed", "said", "message", "email"])
      ) {
        relationships.push({
          type: "contradicts",
          sourceLabel: labelOf(current),
          targetLabel: labelOf(other),
          explanation: `${labelOf(current)} may conflict with or challenge the version shown in ${labelOf(other)}.`,
          severity: "high",
          suggestedFix:
            "Prepare a clear explanation of the inconsistency and identify which document is more reliable.",
        });
      }

      if (
        includesAny(currentText, [
          "changed story",
          "different version",
          "inconsistent",
        ]) ||
        includesAny(otherText, [
          "changed story",
          "different version",
          "inconsistent",
        ])
      ) {
        relationships.push({
          type: "credibility_concern",
          sourceLabel: labelOf(current),
          targetLabel: labelOf(other),
          explanation: `${labelOf(current)} and ${labelOf(other)} may raise a credibility or consistency issue.`,
          severity: "high",
          suggestedFix:
            "Compare the exact wording, dates, and context before relying on this point.",
        });
      }
    }
  }

  return relationships;
}

function buildRelationshipSummaries(relationships: EvidenceRelationship[]) {
  const corroborationNotes = relationships
    .filter((relationship) =>
      ["corroborates", "supports_same_issue", "same_event"].includes(
        relationship.type,
      ),
    )
    .map((relationship) => relationship.explanation);

  const contradictionNotes = relationships
    .filter((relationship) => relationship.type === "contradicts")
    .map((relationship) => relationship.explanation);

  const chronologyConcerns = relationships
    .filter((relationship) => relationship.type === "chronology_gap")
    .map((relationship) => relationship.explanation);

  const credibilityConcerns = relationships
    .filter((relationship) => relationship.type === "credibility_concern")
    .map((relationship) => relationship.explanation);

  const proofGaps = relationships
    .filter((relationship) =>
      [
        "missing_damages_proof",
        "missing_causation_proof",
        "missing_foundation",
        "authenticity_concern",
      ].includes(relationship.type),
    )
    .map((relationship) => relationship.explanation);

  return {
    corroborationNotes: cleanList(corroborationNotes),
    contradictionNotes: cleanList(contradictionNotes),
    chronologyConcerns: cleanList(chronologyConcerns),
    credibilityConcerns: cleanList(credibilityConcerns),
    proofGaps: cleanList(proofGaps),
  };
}

export function analyzeEvidenceBundle(
  items: EvidenceItem[],
): EvidenceBundleAnalysis {
  const analyses = items.map(analyzeEvidenceItem);
  const merged = mergeEvidenceAnalyses(analyses);
  const exhibitGroups = buildExhibitGroups(items);
  const packageOrder = buildPackageOrder(exhibitGroups);
  const relationships = buildEvidenceRelationships(items);
  const relationshipSummaries = buildRelationshipSummaries(relationships);

  const bundleWarnings: string[] = [];

  if (items.length === 0) {
    bundleWarnings.push("No evidence has been added yet.");
  }

  const itemsWithoutDates = items.filter((item) => !hasMeaningfulText(item.date));
  if (itemsWithoutDates.length > 0) {
    bundleWarnings.push(
      `${itemsWithoutDates.length} evidence item(s) need a date or timeline reference.`,
    );
  }

  const itemsWithoutRelevance = items.filter(
    (item) => !hasMeaningfulText(item.relevance),
  );
  if (itemsWithoutRelevance.length > 0) {
    bundleWarnings.push(
      `${itemsWithoutRelevance.length} evidence item(s) need a relevance explanation.`,
    );
  }

  const itemsWithoutSources = items.filter(
    (item) => !hasMeaningfulText(item.source),
  );
  if (itemsWithoutSources.length > 0) {
    bundleWarnings.push(
      `${itemsWithoutSources.length} evidence item(s) need source/sender/creator information.`,
    );
  }

  if (relationshipSummaries.proofGaps.length > 0) {
    bundleWarnings.push(
      "Some exhibits still need stronger foundation, causation, damages, or authenticity support.",
    );
  }

  if (relationshipSummaries.contradictionNotes.length > 0) {
    bundleWarnings.push(
      "Possible contradictions were detected between exhibits. Review before using them in a court package.",
    );
  }

  return {
    ...merged,
    exhibitGroups,
    packageOrder,
    bundleWarnings: cleanList(bundleWarnings),

    relationships,
    corroborationNotes: relationshipSummaries.corroborationNotes,
    contradictionNotes: relationshipSummaries.contradictionNotes,
    chronologyConcerns: relationshipSummaries.chronologyConcerns,
    credibilityConcerns: relationshipSummaries.credibilityConcerns,
    proofGaps: relationshipSummaries.proofGaps,
  };
}