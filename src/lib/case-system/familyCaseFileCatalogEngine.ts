import type {
  FamilyCaseDocument,
  FamilyEvidenceCategory,
  FamilyLitigationStage,
} from "./types/family-case.ts";

import type { FamilyNormalizedIntake } from "./familyAiIntakeNormalizer";
import type { FamilyWorkflowResult } from "./familyWorkflowEngine";
import type {
  FamilyFormRecommendation,
  FamilyFormRoutingResult,
} from "./familyFormRoutingEngine";
import type {
  FamilyEvidenceEngineResult,
  FamilyEvidenceRawItem,
} from "./familyEvidenceEngine";

export type FamilyCaseFileDocumentKind =
  | "official-court-form"
  | "court-order"
  | "endorsement"
  | "conference-brief"
  | "motion-material"
  | "affidavit"
  | "financial-disclosure"
  | "service-proof"
  | "evidence"
  | "settlement-offer"
  | "correspondence"
  | "generated-document"
  | "unknown";

export type FamilyCaseFileDirection =
  | "filed-by-user"
  | "served-by-user"
  | "received-from-other-party"
  | "issued-by-court"
  | "uploaded-for-evidence"
  | "generated-by-system"
  | "unknown";

export type FamilyCaseFileStatus =
  | "drafted"
  | "filed"
  | "served"
  | "received"
  | "issued"
  | "uploaded"
  | "unknown";

export type FamilyCaseFileImportance = "critical" | "important" | "helpful" | "archive";

export type FamilyCaseFileUpload = {
  id?: string;
  fileName?: string;
  originalName?: string;
  storagePath?: string;
  publicUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  title?: string;
  description?: string;
  notes?: string;
  formNumber?: string;
  formTitle?: string;
  documentStatus?: string;
  filedDate?: string;
  servedDate?: string;
  receivedDate?: string;
  issuedDate?: string;
  courtDate?: string;
  source?: string;
  direction?: FamilyCaseFileDirection;
  category?: string;
  tags?: string[];
};

export type FamilyCaseFileCatalogItem = {
  id: string;
  title: string;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;

  kind: FamilyCaseFileDocumentKind;
  direction: FamilyCaseFileDirection;
  status: FamilyCaseFileStatus;
  importance: FamilyCaseFileImportance;

  formNumber: string;
  formTitle: string;
  officialFormLabel: string;

  filedDate: string;
  servedDate: string;
  receivedDate: string;
  issuedDate: string;
  courtDate: string;

  evidenceCategory: FamilyEvidenceCategory | "not-evidence";
  linkedStage: FamilyLitigationStage | "not-sure";
  linkedWorkflowPriorities: string[];
  linkedFormLabels: string[];
  linkedEvidenceIssues: string[];

  summary: string;
  notes: string;
  warnings: string[];
  missingMetadata: string[];
  recommendedActions: string[];
};

export type FamilyCaseFileCatalogInput = {
  normalized: FamilyNormalizedIntake;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  evidence?: FamilyEvidenceEngineResult;
  uploadedFiles?: FamilyCaseFileUpload[];
  existingDocuments?: FamilyCaseDocument[];
};

export type FamilyCaseFileCatalogResult = {
  catalogItems: FamilyCaseFileCatalogItem[];
  filedForms: FamilyCaseFileCatalogItem[];
  receivedForms: FamilyCaseFileCatalogItem[];
  servedDocuments: FamilyCaseFileCatalogItem[];
  courtOrders: FamilyCaseFileCatalogItem[];
  financialDisclosure: FamilyCaseFileCatalogItem[];
  evidenceDocuments: FamilyCaseFileCatalogItem[];
  generatedDocuments: FamilyCaseFileCatalogItem[];

  completedFormLabels: string[];
  receivedFormLabels: string[];
  missingRequiredUploads: string[];
  duplicateWarnings: string[];
  staleDocumentWarnings: string[];
  metadataWarnings: string[];
  nextCatalogActions: string[];

  rawEvidenceForEvidenceEngine: FamilyEvidenceRawItem[];
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => clean(item))
        .filter((item) => item.length > 0),
    ),
  );
}

function includesAny(text: string, terms: string[]): boolean {
  const normalizedText = normalize(text);
  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function createId(prefix: string, index: number): string {
  return `${prefix}_${index + 1}`;
}

function extractFormNumber(text: string): string {
  const match = clean(text).match(/\bform\s+([0-9][0-9a-zA-Z.\-]*)\b/i);
  return match?.[1] || "";
}

function makeOfficialFormLabel(formNumber: string, formTitle: string): string {
  if (!formNumber && !formTitle) return "";
  if (formNumber && formTitle) return `Form ${formNumber} - ${formTitle}`;
  if (formNumber) return `Form ${formNumber}`;
  return formTitle;
}

function uploadSearchText(upload: FamilyCaseFileUpload): string {
  return normalize([
    upload.title,
    upload.formTitle,
    upload.formNumber,
    upload.fileName,
    upload.originalName,
    upload.description,
    upload.notes,
    upload.category,
    upload.source,
    upload.tags?.join(" "),
  ].join(" "));
}

function titleFromUpload(upload: FamilyCaseFileUpload): string {
  return clean(
    upload.title ||
      upload.formTitle ||
      upload.originalName ||
      upload.fileName ||
      "Untitled family document",
  );
}

function detectKind(upload: FamilyCaseFileUpload): FamilyCaseFileDocumentKind {
  const text = uploadSearchText(upload);

  if (includesAny(text, ["court order", "final order", "temporary order", "consent order"])) return "court-order";
  if (includesAny(text, ["endorsement", "court endorsement"])) return "endorsement";
  if (includesAny(text, ["affidavit of service", "proof of service", "service proof", "served"])) return "service-proof";
  if (includesAny(text, ["case conference brief", "settlement conference brief", "trial management conference brief"])) return "conference-brief";
  if (includesAny(text, ["notice of motion", "motion material", "urgent motion"])) return "motion-material";
  if (includesAny(text, ["affidavit", "sworn statement"])) return "affidavit";
  if (includesAny(text, ["financial statement", "financial disclosure", "tax return", "notice of assessment", "pay stub", "paystub", "bank statement", "income disclosure"])) return "financial-disclosure";
  if (includesAny(text, ["form ", "application", "answer", "reply", "schedule a", "schedule b"])) return "official-court-form";
  if (includesAny(text, ["settlement offer", "offer to settle", "proposal", "settlement proposal"])) return "settlement-offer";
  if (includesAny(text, ["letter", "email", "correspondence"])) return "correspondence";
  if (includesAny(text, ["generated", "draft", "system output"])) return "generated-document";
  if (includesAny(text, ["evidence", "screenshot", "photo", "video", "police", "school", "medical", "receipt", "message", "calendar", "parenting log"])) return "evidence";

  return "unknown";
}

function detectDirection(upload: FamilyCaseFileUpload, kind: FamilyCaseFileDocumentKind): FamilyCaseFileDirection {
  if (upload.direction) return upload.direction;

  const text = uploadSearchText(upload);

  if (includesAny(text, ["received", "served on me", "from respondent", "from applicant", "from other party", "other party sent"])) return "received-from-other-party";
  if (includesAny(text, ["served by me", "i served", "served on", "served to", "proof of service"])) return "served-by-user";
  if (includesAny(text, ["filed", "filed by me", "submitted to court", "uploaded to court"])) return "filed-by-user";
  if (kind === "court-order" || kind === "endorsement" || includesAny(text, ["issued by court", "court issued"])) return "issued-by-court";
  if (kind === "generated-document") return "generated-by-system";
  if (kind === "evidence") return "uploaded-for-evidence";

  return "unknown";
}

function normalizeStatus(value: unknown): FamilyCaseFileStatus {
  const status = normalize(value);

  if (status.includes("filed")) return "filed";
  if (status.includes("served")) return "served";
  if (status.includes("received")) return "received";
  if (status.includes("issued")) return "issued";
  if (status.includes("draft")) return "drafted";
  if (status.includes("upload")) return "uploaded";

  return "unknown";
}

function detectStatus(upload: FamilyCaseFileUpload, direction: FamilyCaseFileDirection): FamilyCaseFileStatus {
  const explicitStatus = normalizeStatus(upload.documentStatus);
  if (explicitStatus !== "unknown") return explicitStatus;

  if (direction === "filed-by-user") return "filed";
  if (direction === "served-by-user") return "served";
  if (direction === "received-from-other-party") return "received";
  if (direction === "issued-by-court") return "issued";
  if (direction === "generated-by-system") return "drafted";
  if (direction === "uploaded-for-evidence") return "uploaded";

  return "unknown";
}

function detectEvidenceCategory(
  upload: FamilyCaseFileUpload,
  kind: FamilyCaseFileDocumentKind,
): FamilyEvidenceCategory | "not-evidence" {
  const text = uploadSearchText(upload);

  if (kind === "court-order") return "court-order";
  if (kind === "official-court-form" || kind === "conference-brief" || kind === "motion-material") return "court-application-answer-reply";
  if (kind === "financial-disclosure") return "financial-disclosure";
  if (kind === "service-proof") return "service-proof";
  if (kind === "settlement-offer") return "settlement-offer";
  if (kind === "affidavit") return "affidavit";

  if (includesAny(text, ["parenting schedule", "calendar", "access log", "parenting log"])) return "parenting-schedule";
  if (includesAny(text, ["text", "email", "message", "screenshot", "chat", "sms"])) return "message-email-text";
  if (includesAny(text, ["police", "occurrence", "911"])) return "police-report";
  if (includesAny(text, ["cas", "children's aid", "child protection"])) return "child-protection-record";
  if (includesAny(text, ["school", "teacher", "daycare", "attendance"])) return "school-record";
  if (includesAny(text, ["medical", "doctor", "hospital"])) return "medical-record";
  if (includesAny(text, ["therapy", "counselling", "counseling"])) return "therapy-counselling-record";
  if (includesAny(text, ["tax return"])) return "income-tax-return";
  if (includesAny(text, ["notice of assessment", "noa"])) return "notice-of-assessment";
  if (includesAny(text, ["paystub", "pay stub"])) return "paystub";
  if (includesAny(text, ["bank statement", "account statement"])) return "bank-statement";
  if (includesAny(text, ["receipt", "expense", "invoice"])) return "expense-receipt";
  if (includesAny(text, ["section 7", "special expense"])) return "section-7-expense-proof";
  if (includesAny(text, ["property", "asset", "debt", "pension", "valuation"])) return "property-document";
  if (includesAny(text, ["mortgage", "lease", "home"])) return "mortgage-or-lease";
  if (includesAny(text, ["photo", "video", "image", "recording"])) return "photo-video";
  if (includesAny(text, ["witness", "statement"])) return "witness";

  return kind === "evidence" ? "other" : "not-evidence";
}

function detectImportance(
  kind: FamilyCaseFileDocumentKind,
  status: FamilyCaseFileStatus,
  direction: FamilyCaseFileDirection,
): FamilyCaseFileImportance {
  if (kind === "court-order" || kind === "endorsement" || kind === "service-proof") return "critical";
  if (kind === "official-court-form" && ["filed", "received", "served"].includes(status)) return "critical";
  if (kind === "financial-disclosure" || kind === "affidavit" || kind === "motion-material") return "important";
  if (direction === "generated-by-system") return "helpful";
  if (kind === "unknown") return "archive";
  return "helpful";
}

function linkFormLabels(upload: FamilyCaseFileUpload, formRouting: FamilyFormRoutingResult): string[] {
  const formNumber = clean(
    upload.formNumber || extractFormNumber(`${upload.title} ${upload.fileName} ${upload.originalName}`),
  );
  const text = uploadSearchText(upload);

  return cleanList(
    formRouting.all
      .filter((form: FamilyFormRecommendation) => {
        if (formNumber && form.formNumber === formNumber) return true;
        return includesAny(text, [form.formNumber, form.title, form.officialLabel]);
      })
      .map((form) => form.officialLabel),
  );
}

function missingMetadataForItem(item: FamilyCaseFileCatalogItem): string[] {
  const missing: string[] = [];

  if (!item.fileName) missing.push("File name is missing.");
  if (!item.storagePath && !item.publicUrl) missing.push("Storage path or URL is missing.");
  if (item.kind === "official-court-form" && !item.formNumber) missing.push("Form number is missing.");
  if (["filed", "served", "received"].includes(item.status) && !item.filedDate && !item.servedDate && !item.receivedDate) {
    missing.push("Filed, served, or received date is missing.");
  }
  if (item.direction === "unknown") missing.push("Document direction is unclear.");
  if (item.kind === "unknown") missing.push("Document kind is unclear.");

  return cleanList(missing);
}

function recommendedActionsForItem(item: FamilyCaseFileCatalogItem): string[] {
  const actions: string[] = [];

  if (item.missingMetadata.length > 0) actions.push("Complete missing metadata for this document.");
  if (item.kind === "official-court-form" && item.status === "unknown") actions.push("Confirm whether this form was drafted, filed, served, or received.");
  if (item.kind === "court-order") actions.push("Link this order to the current workflow, enforcement, or change-analysis step.");
  if (item.kind === "service-proof") actions.push("Use this document to confirm service status.");
  if (item.evidenceCategory !== "not-evidence") actions.push("Send this document into the evidence engine for issue-linking and exhibit grouping.");

  return cleanList(actions);
}

function catalogUpload(
  upload: FamilyCaseFileUpload,
  index: number,
  input: FamilyCaseFileCatalogInput,
): FamilyCaseFileCatalogItem {
  const kind = detectKind(upload);
  const direction = detectDirection(upload, kind);
  const status = detectStatus(upload, direction);
  const formNumber = clean(
    upload.formNumber ||
      extractFormNumber(`${upload.title} ${upload.formTitle} ${upload.fileName} ${upload.originalName}`),
  );
  const formTitle = clean(upload.formTitle || upload.title || "");
  const evidenceCategory = detectEvidenceCategory(upload, kind);
  const linkedFormLabels = linkFormLabels(upload, input.formRouting);

  const item: FamilyCaseFileCatalogItem = {
    id: clean(upload.id) || createId("family_file", index),
    title: titleFromUpload(upload),
    fileName: clean(upload.fileName || upload.originalName),
    storagePath: clean(upload.storagePath),
    publicUrl: clean(upload.publicUrl),
    mimeType: clean(upload.mimeType),
    sizeBytes: Number(upload.sizeBytes || 0),
    uploadedAt: clean(upload.uploadedAt || new Date().toISOString()),

    kind,
    direction,
    status,
    importance: detectImportance(kind, status, direction),

    formNumber,
    formTitle,
    officialFormLabel: makeOfficialFormLabel(formNumber, formTitle),

    filedDate: clean(upload.filedDate),
    servedDate: clean(upload.servedDate),
    receivedDate: clean(upload.receivedDate),
    issuedDate: clean(upload.issuedDate),
    courtDate: clean(upload.courtDate),

    evidenceCategory,
    linkedStage: input.normalized.stage || "not-sure",
    linkedWorkflowPriorities: cleanList([input.workflow.primaryPriority]),
    linkedFormLabels,
    linkedEvidenceIssues: cleanList([
      ...input.workflow.detectedCaseTypes,
      ...input.workflow.parentingIssues,
      ...input.workflow.supportIssues,
      ...input.workflow.safetyIssues,
      ...input.workflow.propertyIssues,
    ]),

    summary: clean(upload.description || upload.notes || titleFromUpload(upload)),
    notes: clean(upload.notes),
    warnings: [],
    missingMetadata: [],
    recommendedActions: [],
  };

  item.missingMetadata = missingMetadataForItem(item);
  item.recommendedActions = recommendedActionsForItem(item);
  item.warnings = cleanList([
    item.missingMetadata.length > 0 ? "Document metadata is incomplete." : "",
    item.kind === "unknown" ? "The system could not confidently classify this document." : "",
  ]);

  return item;
}

function convertExistingDocument(
  doc: FamilyCaseDocument,
  index: number,
  input: FamilyCaseFileCatalogInput,
): FamilyCaseFileCatalogItem {
  const status = normalizeStatus((doc as { status?: unknown }).status);

  const upload: FamilyCaseFileUpload = {
    id: createId("existing_family_doc", index),
    title: clean((doc as { title?: unknown }).title),
    formNumber: clean((doc as { formNumber?: unknown }).formNumber),
    formTitle: clean((doc as { title?: unknown }).title),
    documentStatus: status,
    filedDate: clean((doc as { filedDate?: unknown }).filedDate),
    servedDate: clean((doc as { servedDate?: unknown }).servedDate),
    receivedDate: clean((doc as { receivedDate?: unknown }).receivedDate),
    notes: clean((doc as { notes?: unknown }).notes),
    direction:
      status === "filed"
        ? "filed-by-user"
        : status === "served"
          ? "served-by-user"
          : status === "received"
            ? "received-from-other-party"
            : "unknown",
  };

  return catalogUpload(upload, index, input);
}

function buildDuplicateWarnings(items: FamilyCaseFileCatalogItem[]): string[] {
  const warnings: string[] = [];
  const groups = new Map<string, FamilyCaseFileCatalogItem[]>();

  for (const item of items) {
    const key = normalize(`${item.formNumber || item.title}|${item.status}|${item.direction}`);
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }

  for (const group of groups.values()) {
    if (group.length > 1 && clean(group[0].title)) {
      warnings.push(`Possible duplicate document records detected for ${group[0].title}.`);
    }
  }

  return cleanList(warnings);
}

function buildMissingRequiredUploads(
  input: FamilyCaseFileCatalogInput,
  items: FamilyCaseFileCatalogItem[],
): string[] {
  const existingLabels = cleanList([
    ...items.map((item) => item.officialFormLabel),
    ...items.map((item) => item.title),
    ...items.map((item) => (item.formNumber ? `Form ${item.formNumber}` : "")),
  ]).map(normalize);

  return cleanList(
    input.formRouting.requiredNow
      .filter((form: FamilyFormRecommendation) => {
        const label = normalize(form.officialLabel);
        const shortLabel = normalize(`Form ${form.formNumber}`);
        return !existingLabels.some(
          (existing) => existing.includes(label) || label.includes(existing) || existing.includes(shortLabel),
        );
      })
      .map((form) => `Upload or generate ${form.officialLabel}.`),
  );
}

function toRawEvidence(item: FamilyCaseFileCatalogItem): FamilyEvidenceRawItem | null {
  if (item.evidenceCategory === "not-evidence") return null;

  return {
    id: item.id,
    title: item.title,
    fileName: item.fileName,
    description: item.summary,
    category: item.evidenceCategory,
    date: item.filedDate || item.servedDate || item.receivedDate || item.issuedDate || item.courtDate || item.uploadedAt,
    source: item.direction,
    relevance: item.linkedEvidenceIssues.join(", "),
    notes: item.notes,
    uploadedPath: item.storagePath,
    mimeType: item.mimeType,
  };
}

export function runFamilyCaseFileCatalogEngine(
  input: FamilyCaseFileCatalogInput,
): FamilyCaseFileCatalogResult {
  const uploadedItems = (input.uploadedFiles || []).map((upload, index) =>
    catalogUpload(upload, index, input),
  );
  const existingItems = (input.existingDocuments || []).map((doc, index) =>
    convertExistingDocument(doc, index + uploadedItems.length, input),
  );
  const catalogItems = [...uploadedItems, ...existingItems];

  const filedForms = catalogItems.filter(
    (item) => item.kind === "official-court-form" && item.status === "filed",
  );
  const receivedForms = catalogItems.filter(
    (item) => item.kind === "official-court-form" && item.status === "received",
  );
  const servedDocuments = catalogItems.filter(
    (item) => item.status === "served" || item.kind === "service-proof",
  );
  const courtOrders = catalogItems.filter(
    (item) => item.kind === "court-order" || item.kind === "endorsement",
  );
  const financialDisclosure = catalogItems.filter(
    (item) => item.kind === "financial-disclosure" || item.evidenceCategory === "financial-disclosure",
  );
  const evidenceDocuments = catalogItems.filter((item) => item.evidenceCategory !== "not-evidence");
  const generatedDocuments = catalogItems.filter(
    (item) => item.direction === "generated-by-system" || item.kind === "generated-document",
  );

  const completedFormLabels = cleanList([
    ...filedForms.map((item) => item.officialFormLabel || item.title),
    ...servedDocuments.map((item) => item.officialFormLabel || item.title),
  ]);

  const receivedFormLabels = cleanList(
    receivedForms.map((item) => item.officialFormLabel || item.title),
  );

  const duplicateWarnings = buildDuplicateWarnings(catalogItems);
  const missingRequiredUploads = buildMissingRequiredUploads(input, catalogItems);
  const metadataWarnings = cleanList(
    catalogItems.flatMap((item) => item.warnings.map((warning) => `${item.title}: ${warning}`)),
  );

  const staleDocumentWarnings = cleanList(
    catalogItems
      .filter((item) => item.kind === "official-court-form" && item.status === "drafted")
      .map((item) => `${item.title} is only drafted. Confirm whether it was filed or served.`),
  );

  const nextCatalogActions = cleanList([
    ...missingRequiredUploads,
    ...catalogItems.flatMap((item) =>
      item.recommendedActions.map((action) => `${item.title}: ${action}`),
    ),
    courtOrders.length === 0 && input.normalized.procedural.hasExistingOrder
      ? "Upload the existing court order or agreement."
      : "",
    receivedForms.length === 0 && input.normalized.procedural.isResponding
      ? "Upload the forms received from the other party."
      : "",
    financialDisclosure.length === 0 && input.workflow.supportIssues.length > 0
      ? "Upload financial disclosure for support analysis."
      : "",
  ]);

  const rawEvidenceForEvidenceEngine = evidenceDocuments
    .map((item) => toRawEvidence(item))
    .filter((item): item is FamilyEvidenceRawItem => item !== null);

  const summary = cleanList([
    `${catalogItems.length} family case file document(s) cataloged.`,
    `${filedForms.length} filed form(s), ${receivedForms.length} received form(s), and ${servedDocuments.length} served/service document(s) detected.`,
    `${evidenceDocuments.length} document(s) can flow into the evidence engine.`,
    missingRequiredUploads.length > 0
      ? `${missingRequiredUploads.length} required upload/generation item(s) remain.`
      : "No required upload gaps detected from current routing.",
  ]).join(" ");

  return {
    catalogItems,
    filedForms,
    receivedForms,
    servedDocuments,
    courtOrders,
    financialDisclosure,
    evidenceDocuments,
    generatedDocuments,
    completedFormLabels,
    receivedFormLabels,
    missingRequiredUploads,
    duplicateWarnings,
    staleDocumentWarnings,
    metadataWarnings,
    nextCatalogActions,
    rawEvidenceForEvidenceEngine,
    summary,
  };
}
