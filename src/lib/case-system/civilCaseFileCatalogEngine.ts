import type { EvidenceItem } from "./evidenceEngine";

import type {
  CivilCaseData,
  CivilCaseFileCatalog,
} from "./types/civil-case";

type CivilCatalogDocumentType =
  | "pleading"
  | "evidence"
  | "medical"
  | "financial"
  | "communication"
  | "expert"
  | "court-order"
  | "contract"
  | "other";

type CivilCatalogImportance = "low" | "medium" | "high" | "critical";

export type CivilCatalogDocument = {
  id: string;
  title: string;
  type: CivilCatalogDocumentType;
  status: "uploaded" | "missing" | "draft" | "served" | "filed";
  linkedIssues: string[];
  linkedEvidenceIds: Array<string | number>;
  importance: CivilCatalogImportance;
  warnings: string[];
};

export type CivilCaseFileCatalogInput = {
  caseData?: Partial<CivilCaseData>;
  evidenceItems?: EvidenceItem[];
};

export type CivilCaseFileCatalogResult = {
  catalog: CivilCaseFileCatalog;
  categorizedDocuments: CivilCatalogDocument[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function getEvidenceId(item: EvidenceItem, index: number): string {
  return String(
    item.id ||
      item.label ||
      item.exhibitNumber ||
      item.title ||
      `civil_document_${index + 1}`,
  );
}

function itemText(item: EvidenceItem): string {
  return normalize(
    [
      item.title,
      item.description,
      item.category,
      item.content,
      item.source,
      item.relevance,
      item.relatedIssue,
      item.relatedLegalElement,
      item.fileName,
      item.fileType,
    ].join(" "),
  );
}

function detectType(item: EvidenceItem): CivilCatalogDocumentType {
  const text = itemText(item);

  if (includesAny(text, ["statement of claim", "defence", "reply", "motion", "factum"])) {
    return "pleading";
  }

  if (includesAny(text, ["order", "endorsement", "judgment", "court order"])) {
    return "court-order";
  }

  if (includesAny(text, ["invoice", "receipt", "bank", "tax", "financial", "paystub"])) {
    return "financial";
  }

  if (includesAny(text, ["medical", "doctor", "hospital", "treatment", "clinical"])) {
    return "medical";
  }

  if (includesAny(text, ["email", "text", "message", "facebook", "social media", "letter"])) {
    return "communication";
  }

  if (includesAny(text, ["contract", "agreement", "signed", "terms"])) {
    return "contract";
  }

  if (includesAny(text, ["expert", "report", "assessment", "opinion"])) {
    return "expert";
  }

  if (includesAny(text, ["evidence", "exhibit", "screenshot", "photo", "record"])) {
    return "evidence";
  }

  return "other";
}

function detectImportance(item: EvidenceItem): CivilCatalogImportance {
  const text = itemText(item);

  if (includesAny(text, ["critical", "central", "main issue", "key evidence"])) {
    return "critical";
  }

  if (includesAny(text, ["important", "supports", "proves", "direct proof"])) {
    return "high";
  }

  if (includesAny(text, ["background", "context", "supporting"])) {
    return "medium";
  }

  return "medium";
}

function buildWarnings(item: EvidenceItem): string[] {
  const text = itemText(item);

  return cleanList([
    includesAny(text, ["screenshot", "text", "email", "social media"])
      ? "Digital evidence may require authentication details."
      : "",
    includesAny(text, ["draft", "incomplete"])
      ? "Document may be incomplete or not finalized."
      : "",
    !clean(item.date) ? "Document date is missing." : "",
  ]);
}

function buildMissingCriticalDocuments(
  documents: CivilCatalogDocument[],
): string[] {
  const types = new Set(documents.map((doc) => doc.type));

  return cleanList([
    !types.has("evidence") ? "Core civil evidence package" : "",
    !types.has("communication") ? "Communication records, if relevant" : "",
    !types.has("financial") ? "Financial damages proof, if damages are claimed" : "",
  ]);
}

function buildDuplicateWarnings(documents: CivilCatalogDocument[]): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];

  for (const doc of documents) {
    const key = normalize(doc.title);

    if (seen.has(key)) {
      warnings.push(`Possible duplicate document: ${doc.title}`);
    }

    seen.add(key);
  }

  return cleanList(warnings);
}

function buildStaleWarnings(documents: CivilCatalogDocument[]): string[] {
  return cleanList(
    documents.map((doc) =>
      doc.warnings.includes("Document date is missing.")
        ? `${doc.title} may need a date or verification.`
        : "",
    ),
  );
}

export function runCivilCaseFileCatalogEngine(
  input: CivilCaseFileCatalogInput,
): CivilCaseFileCatalogResult {
  const evidenceItems = input.evidenceItems || input.caseData?.evidenceProfile?.evidenceItems || [];

  const categorizedDocuments: CivilCatalogDocument[] = evidenceItems.map((item, index) => {
    const evidenceId = getEvidenceId(item, index);

    return {
      id: evidenceId,
      title: clean(item.title) || clean(item.label) || `Civil Document ${index + 1}`,
      type: detectType(item),
      status: "uploaded",
      linkedIssues: cleanList([item.relatedIssue, item.relatedLegalElement]),
      linkedEvidenceIds: [evidenceId],
      importance: detectImportance(item),
      warnings: buildWarnings(item),
    };
  });

  const missingCriticalDocuments = buildMissingCriticalDocuments(categorizedDocuments);
  const duplicateWarnings = buildDuplicateWarnings(categorizedDocuments);
  const staleDocumentWarnings = buildStaleWarnings(categorizedDocuments);

  const nextDocumentActions = cleanList([
    ...missingCriticalDocuments.map((item) => `Collect or generate: ${item}`),
    duplicateWarnings.length > 0 ? "Review possible duplicate civil documents." : "",
    staleDocumentWarnings.length > 0 ? "Add or verify dates for flagged documents." : "",
    categorizedDocuments.length === 0 ? "Upload supporting civil documents and evidence." : "",
  ]);

  const catalog: CivilCaseFileCatalog = {
    uploadedDocuments: categorizedDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      status: doc.status,
      linkedIssues: doc.linkedIssues,
      linkedEvidenceIds: doc.linkedEvidenceIds,
      importance: doc.importance,
    })),
    missingCriticalDocuments,
    duplicateWarnings,
    staleDocumentWarnings,
    nextDocumentActions,
  };

  return {
    catalog,
    categorizedDocuments,
    summary:
      categorizedDocuments.length > 0
        ? "Civil file catalog organized successfully."
        : "Civil file catalog requires uploaded documents.",
  };
}