import {
  analyzeEvidenceBundle,
  analyzeEvidenceItem,
  type EvidenceItem,
} from "./evidenceEngine";

export type RawEvidenceInput = {
  id?: string | number;
  title?: string;
  description?: string;
  content?: string;
  fileName?: string;
  fileType?: string;
  storagePath?: string;
  date?: string;
  source?: string;
  category?: string;
  relatedIssue?: string;
  relatedLegalElement?: string;
};

export type AssembledExhibit = EvidenceItem & {
  assembledBySystem: true;
  userReviewed: boolean;
  userEdited: boolean;
  assemblyConfidence: "strong" | "moderate" | "weak";
  assemblyNotes: string[];
};

export type EvidenceAssemblyResult = {
  exhibits: AssembledExhibit[];
  evidenceItems: EvidenceItem[];
  packageTitle: string;
  packageSummary: string;
  assemblyWarnings: string[];
  nextReviewSteps: string[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ");
}

function includesAny(text: string, terms: string[]) {
  const normalizedText = normalize(text);

  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function cleanList(items: string[]) {
  return Array.from(
    new Set(items.map((item) => clean(item)).filter(Boolean))
  );
}

function textOf(input: RawEvidenceInput) {
  return normalize(
    [
      input.title,
      input.description,
      input.content,
      input.fileName,
      input.fileType,
      input.category,
      input.date,
      input.source,
      input.relatedIssue,
      input.relatedLegalElement,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function detectCategory(input: RawEvidenceInput) {
  const text = textOf(input);

  if (
    includesAny(text, [
      "message",
      "text",
      "email",
      "screenshot",
      "chat",
      "facebook",
      "instagram",
      "conversation",
    ])
  ) {
    return "Messages / communications";
  }

  if (
    includesAny(text, [
      "receipt",
      "invoice",
      "payment",
      "bank",
      "etransfer",
      "e-transfer",
      "deposit",
      "damages",
      "loss",
      "amount",
    ])
  ) {
    return "Money / damages proof";
  }

  if (
    includesAny(text, [
      "photo",
      "picture",
      "image",
      "damage",
      "repair",
      "before",
      "after",
      "condition",
    ])
  ) {
    return "Photos / physical proof";
  }

  if (
    includesAny(text, [
      "served",
      "filed",
      "court",
      "order",
      "claim",
      "defence",
      "affidavit",
      "conference",
      "judgment",
    ])
  ) {
    return "Court / procedural records";
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
    return "Witness / third-party evidence";
  }

  if (
    includesAny(text, [
      "offer",
      "settlement",
      "proposal",
      "apology",
      "retraction",
      "resolve",
    ])
  ) {
    return "Settlement / resolution efforts";
  }

  return input.category || "Other supporting evidence";
}

function detectExhibitGroup(category: string) {
  if (category.includes("Messages")) return "A — Messages and communications";
  if (category.includes("Money")) return "B — Money, payments, and damages";
  if (category.includes("Photos")) return "C — Photos, condition, and physical proof";
  if (category.includes("Witness")) return "D — Witnesses and third-party evidence";
  if (category.includes("Court")) return "E — Court and procedural documents";
  if (category.includes("Settlement")) return "F — Settlement and resolution efforts";

  return "G — Other supporting evidence";
}

function groupPrefix(exhibitGroup: string) {
  return exhibitGroup.split("—")[0]?.trim() || "G";
}

function autoTitle(input: RawEvidenceInput, category: string, index: number) {
  if (clean(input.title)) return clean(input.title);

  if (category.includes("Messages")) return `Communication evidence ${index + 1}`;
  if (category.includes("Money")) return `Damages/payment evidence ${index + 1}`;
  if (category.includes("Photos")) return `Photo or condition evidence ${index + 1}`;
  if (category.includes("Court")) return `Court or procedural record ${index + 1}`;
  if (category.includes("Witness")) return `Witness or third-party evidence ${index + 1}`;
  if (category.includes("Settlement")) return `Settlement communication ${index + 1}`;

  return `Supporting evidence ${index + 1}`;
}

function autoDescription(input: RawEvidenceInput, category: string) {
  if (clean(input.description)) return clean(input.description);

  if (category.includes("Messages")) {
    return "This exhibit records communication between people involved in the dispute.";
  }

  if (category.includes("Money")) {
    return "This exhibit relates to money, payment, loss, expense, or damages.";
  }

  if (category.includes("Photos")) {
    return "This exhibit shows visual or physical condition evidence.";
  }

  if (category.includes("Court")) {
    return "This exhibit relates to a court, filing, service, order, or procedural step.";
  }

  if (category.includes("Witness")) {
    return "This exhibit relates to a witness, recipient, observer, or third party.";
  }

  if (category.includes("Settlement")) {
    return "This exhibit relates to settlement, resolution, apology, retraction, or offers.";
  }

  return "This exhibit may support the case and should be reviewed for relevance.";
}

function autoRelevance(input: RawEvidenceInput, category: string) {
  if (clean(input.relatedLegalElement)) {
    return `This evidence is connected to the proof point: ${clean(input.relatedLegalElement)}.`;
  }

  if (clean(input.relatedIssue)) {
    return `This evidence is connected to the issue: ${clean(input.relatedIssue)}.`;
  }

  if (category.includes("Messages")) {
    return "This may help prove what was said, when it was said, notice, admissions, denials, or the sequence of events.";
  }

  if (category.includes("Money")) {
    return "This may help prove the amount claimed, payments made, unpaid amounts, expenses, or financial loss.";
  }

  if (category.includes("Photos")) {
    return "This may help prove condition, damage, repairs, before-and-after comparison, or physical context.";
  }

  if (category.includes("Court")) {
    return "This may help prove service, filing history, procedural steps, orders, or the current stage of the case.";
  }

  if (category.includes("Witness")) {
    return "This may help identify who has direct knowledge and what a witness or third party can confirm.";
  }

  if (category.includes("Settlement")) {
    return "This may help show settlement efforts, offers, refusals, apologies, retractions, or attempts to resolve.";
  }

  return "This evidence should be reviewed and connected to a specific issue or proof point.";
}

function confidenceFor(input: RawEvidenceInput) {
  let score = 0;

  if (clean(input.title)) score += 1;
  if (clean(input.description)) score += 1;
  if (clean(input.date)) score += 1;
  if (clean(input.source)) score += 1;
  if (clean(input.relatedIssue)) score += 1;
  if (clean(input.relatedLegalElement)) score += 1;
  if (clean(input.fileName) || clean(input.storagePath) || clean(input.content)) score += 1;

  if (score >= 5) return "strong";
  if (score >= 3) return "moderate";
  return "weak";
}

function assemblyNotesFor(input: RawEvidenceInput, item: EvidenceItem) {
  const notes: string[] = [];

  if (!clean(input.title)) {
    notes.push("System created a working title. User should review it.");
  }

  if (!clean(input.description)) {
    notes.push("System created a working description. User should confirm what the exhibit shows.");
  }

  if (!clean(input.relatedIssue)) {
    notes.push("No issue was supplied. User should confirm what issue this exhibit supports.");
  }

  if (!clean(input.relatedLegalElement)) {
    notes.push("No proof point was supplied. User should connect this exhibit to a legal/factual proof point.");
  }

  const analysis = analyzeEvidenceItem(item);

  notes.push(...analysis.missingInformation);
  notes.push(...analysis.suggestedFixes);

  return cleanList(notes);
}

function sortExhibits(items: AssembledExhibit[]) {
  return items.slice().sort((a, b) => {
    const groupA = clean(a.exhibitGroup);
    const groupB = clean(b.exhibitGroup);

    if (groupA !== groupB) return groupA.localeCompare(groupB);

    const dateA = clean(a.date);
    const dateB = clean(b.date);

    if (dateA && dateB) return dateA.localeCompare(dateB);
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    return clean(a.title).localeCompare(clean(b.title));
  });
}

export function assembleEvidencePackage(
  rawEvidence: RawEvidenceInput[]
): EvidenceAssemblyResult {
  const groupCounters: Record<string, number> = {};

  const assembled = rawEvidence.map((input, index) => {
    const category = detectCategory(input);
    const exhibitGroup = detectExhibitGroup(category);
    const prefix = groupPrefix(exhibitGroup);

    groupCounters[prefix] = (groupCounters[prefix] || 0) + 1;

    const exhibitNumber = `${prefix}${groupCounters[prefix]}`;

    const item: EvidenceItem = {
      id: input.id || `assembled-${Date.now()}-${index}`,
      label: exhibitNumber,
      title: autoTitle(input, category, index),
      description: autoDescription(input, category),
      relevance: autoRelevance(input, category),
      category,
      date: input.date || "",
      source: input.source || "",
      content: input.content || "",
      fileName: input.fileName,
      fileType: input.fileType,
      storagePath: input.storagePath,
      relatedIssue: input.relatedIssue || "",
      relatedLegalElement: input.relatedLegalElement || "",
      exhibitGroup,
      exhibitNumber,
    };

    const assembledItem: AssembledExhibit = {
      ...item,
      assembledBySystem: true,
      userReviewed: false,
      userEdited: false,
      assemblyConfidence: confidenceFor(input),
      assemblyNotes: assemblyNotesFor(input, item),
    };

    return assembledItem;
  });

  const exhibits = sortExhibits(assembled).map((item, index) => {
    const prefix = groupPrefix(item.exhibitGroup || "G");
    return {
      ...item,
      label: `${prefix}${index + 1}`,
      exhibitNumber: `${prefix}${index + 1}`,
    };
  });

  const evidenceItems: EvidenceItem[] = exhibits.map((item) => ({
    id: item.id,
    label: item.label,
    title: item.title,
    description: item.description,
    relevance: item.relevance,
    category: item.category,
    date: item.date,
    source: item.source,
    content: item.content,
    fileName: item.fileName,
    fileType: item.fileType,
    storagePath: item.storagePath,
    relatedIssue: item.relatedIssue,
    relatedLegalElement: item.relatedLegalElement,
    exhibitGroup: item.exhibitGroup,
    exhibitNumber: item.exhibitNumber,
    supportsClaim: item.supportsClaim,
    supportsDefence: item.supportsDefence,
    linkedForms: item.linkedForms,
    linkedTimelineEvents: item.linkedTimelineEvents,
  }));

  const analysis = analyzeEvidenceBundle(evidenceItems);

  const assemblyWarnings: string[] = [];

  const weakItems = exhibits.filter(
    (item) => item.assemblyConfidence === "weak"
  );

  if (weakItems.length > 0) {
    assemblyWarnings.push(
      `${weakItems.length} exhibit(s) were assembled with weak confidence and need user review.`
    );
  }

  if (analysis.proofGaps.length > 0) {
    assemblyWarnings.push(
      "Some exhibits still have proof gaps that should be fixed before court use."
    );
  }

  if (analysis.contradictionNotes.length > 0) {
    assemblyWarnings.push(
      "Possible contradictions were detected and should be reviewed before filing or relying on the package."
    );
  }

  return {
    exhibits,
    evidenceItems,
    packageTitle: "Auto-assembled evidence package",
    packageSummary:
      "CourtSimplified assembled these exhibits from the available evidence. The user should review labels, descriptions, relevance, dates, sources, and proof-point links before using the package.",
    assemblyWarnings: cleanList(assemblyWarnings),
    nextReviewSteps: cleanList([
      "Review every exhibit title and description.",
      "Confirm each exhibit date and source.",
      "Connect each exhibit to a legal issue or proof point.",
      "Fix any missing foundation, authenticity, damages, causation, or credibility concerns.",
      "Confirm the final exhibit order before generating court materials.",
    ]),
  };
}