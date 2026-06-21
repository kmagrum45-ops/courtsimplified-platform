import {
  CaseConfidence,
  CaseEvidenceType,
} from "../architecture/masterCaseSchema";

import {
  EvidenceCollection,
  EvidenceCollectionItem,
  EvidenceCollectionType,
  EvidencePackagingBuildInput,
  EvidencePackagingBuildOutput,
  EvidencePackagingIssue,
  EvidencePackagingModel,
  ExhibitPackage,
} from "./evidencePackagingArchitecture";

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

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function confidenceRank(value: CaseConfidence): number {
  const ranks: Record<CaseConfidence, number> = {
    "very-low": 1,
    low: 2,
    medium: 3,
    high: 4,
    "very-high": 5,
  };

  return ranks[value] || 1;
}

function confidenceFromRank(rank: number): CaseConfidence {
  if (rank >= 4.5) return "very-high";
  if (rank >= 3.5) return "high";
  if (rank >= 2.5) return "medium";
  if (rank >= 1.5) return "low";
  return "very-low";
}

function averageConfidence(values: CaseConfidence[]): CaseConfidence {
  if (values.length === 0) return "very-low";

  const average =
    values.reduce((total, value) => total + confidenceRank(value), 0) /
    values.length;

  return confidenceFromRank(average);
}

function collectionTypeForEvidence(type: CaseEvidenceType): EvidenceCollectionType {
  if (type === "text-message" || type === "screenshot") return "message-thread";
  if (type === "email") return "email-thread";
  if (type === "social-media") return "social-media-thread";
  if (type === "photo") return "photo-series";
  if (type === "video") return "video-series";
  if (type === "invoice" || type === "receipt" || type === "financial-record") {
    return "financial-package";
  }
  if (type === "medical-record") return "medical-package";
  if (type === "school-record") return "school-package";
  if (type === "court-form" || type === "court-order" || type === "official-record") {
    return "procedural-package";
  }

  return "mixed-exhibit";
}

function collectionTitle(type: EvidenceCollectionType): string {
  if (type === "message-thread") return "Message Evidence";
  if (type === "email-thread") return "Email Evidence";
  if (type === "social-media-thread") return "Social Media Evidence";
  if (type === "photo-series") return "Photo Evidence";
  if (type === "video-series") return "Video Evidence";
  if (type === "financial-package") return "Financial Evidence";
  if (type === "medical-package") return "Medical Evidence";
  if (type === "school-package") return "School Evidence";
  if (type === "employment-package") return "Employment Evidence";
  if (type === "procedural-package") return "Procedural Evidence";
  if (type === "mixed-exhibit") return "Mixed Evidence";
  return "Unclassified Evidence";
}

function sortItems(items: EvidenceCollectionItem[]): EvidenceCollectionItem[] {
  return [...items].sort((a, b) => {
    const left = a.dateNormalized || a.dateRaw || "";
    const right = b.dateNormalized || b.dateRaw || "";

    if (!left && !right) return a.title.localeCompare(b.title);
    if (!left) return 1;
    if (!right) return -1;

    return left.localeCompare(right);
  });
}

function buildCollections(
  input: EvidencePackagingBuildInput,
): EvidenceCollection[] {
  const grouped = new Map<EvidenceCollectionType, EvidenceCollectionItem[]>();

  for (const item of input.evidenceItems) {
    const collectionType = collectionTypeForEvidence(item.evidenceType);

    const collectionItem: EvidenceCollectionItem = {
      evidenceId: item.id,
      title: item.title,
      evidenceType: item.evidenceType,
      dateRaw: item.dateRaw,
      dateNormalized: item.dateNormalized,
      confidence: item.confidence || "medium",
    };

    grouped.set(collectionType, [
      ...(grouped.get(collectionType) || []),
      collectionItem,
    ]);
  }

  return Array.from(grouped.entries()).map(([collectionType, rawItems]) => {
    const items = sortItems(rawItems);
    const datedItems = items.filter((item) => item.dateNormalized || item.dateRaw);

    return {
      id: createId("evidence_collection"),
      collectionType,
      title: collectionTitle(collectionType),
      description:
        "CourtSimplified grouped these evidence items so they can become exhibits, affidavit references, court-package sections, or trial-binder materials.",
      itemCount: items.length,
      startDate: datedItems[0]?.dateNormalized || datedItems[0]?.dateRaw,
      endDate:
        datedItems[datedItems.length - 1]?.dateNormalized ||
        datedItems[datedItems.length - 1]?.dateRaw,
      evidenceIds: items.map((item) => item.evidenceId),
      items,
      chronologyOrdered: datedItems.length === items.length,
      confidence: averageConfidence(items.map((item) => item.confidence)),
    };
  });
}

function exhibitLabel(index: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return `Exhibit ${alphabet[index]}`;
  return `Exhibit ${index + 1}`;
}

function estimatePages(collection: EvidenceCollection): number {
  if (
    collection.collectionType === "message-thread" ||
    collection.collectionType === "photo-series" ||
    collection.collectionType === "social-media-thread"
  ) {
    return Math.max(1, Math.ceil(collection.itemCount / 4));
  }

  return Math.max(1, collection.itemCount);
}

function buildExhibits(collections: EvidenceCollection[]): ExhibitPackage[] {
  return collections.map((collection, index) => ({
    id: createId("exhibit_package"),
    exhibitLabel: exhibitLabel(index),
    title: collection.title,
    collectionIds: [collection.id],
    evidenceIds: collection.evidenceIds,
    pageEstimate: estimatePages(collection),
    readiness: collection.chronologyOrdered ? "organized" : "draft",
    references: [
      {
        id: createId("exhibit_reference"),
        exhibitLabel: exhibitLabel(index),
        targetType: "court-package",
        targetTitle: collection.title,
        explanation:
          "This exhibit can be referenced in court packages once review confirms relevance, order, and completeness.",
        confidence: collection.confidence,
      },
    ],
    warnings: collection.chronologyOrdered
      ? []
      : ["Some evidence items in this exhibit do not have clear dates."],
    confidence: collection.confidence,
  }));
}

function buildIssues(
  input: EvidencePackagingBuildInput,
  collections: EvidenceCollection[],
): EvidencePackagingIssue[] {
  const issues: EvidencePackagingIssue[] = [];

  const seenTitles = new Map<string, string[]>();

  for (const item of input.evidenceItems) {
    const key = clean(item.title).toLowerCase();
    if (!key) continue;

    seenTitles.set(key, [...(seenTitles.get(key) || []), item.id]);
  }

  for (const ids of seenTitles.values()) {
    if (ids.length > 1) {
      issues.push({
        id: createId("evidence_packaging_issue"),
        issueType: "duplicate-evidence",
        severity: "medium",
        title: "Possible duplicate evidence",
        explanation:
          "Multiple evidence items have the same or very similar title.",
        affectedEvidenceIds: ids,
        suggestedFix:
          "Review these items and mark duplicates before generating final exhibit packages.",
      });
    }
  }

  for (const collection of collections) {
    if (!collection.chronologyOrdered) {
      issues.push({
        id: createId("evidence_packaging_issue"),
        issueType: "missing-date",
        severity: "medium",
        title: "Evidence collection has missing dates",
        explanation:
          "This collection cannot be fully chronological because one or more items are missing dates.",
        affectedEvidenceIds: collection.evidenceIds,
        suggestedFix:
          "Add dates or approximate dates before using this collection in affidavits, chronology, or trial materials.",
      });
    }

    if (collection.itemCount === 1) {
      issues.push({
        id: createId("evidence_packaging_issue"),
        issueType: "missing-context",
        severity: "low",
        title: "Single-item evidence collection may need context",
        explanation:
          "A one-item collection may still be useful, but screenshots and messages often need surrounding context.",
        affectedEvidenceIds: collection.evidenceIds,
        suggestedFix:
          "Add surrounding messages, full thread context, or explanation if this item is part of a larger conversation.",
      });
    }
  }

  if (input.evidenceItems.length === 0) {
    issues.push({
      id: createId("evidence_packaging_issue"),
      issueType: "orphaned-evidence",
      severity: "high",
      title: "No evidence available for packaging",
      explanation:
        "No evidence items were supplied to the evidence packaging engine.",
      affectedEvidenceIds: [],
      suggestedFix:
        "Upload, save, or connect evidence before generating exhibit packages.",
    });
  }

  return issues;
}

function buildReadiness(args: {
  collections: EvidenceCollection[];
  exhibits: ExhibitPackage[];
  issues: EvidencePackagingIssue[];
}) {
  const highIssues = args.issues.filter(
    (issue) => issue.severity === "high" || issue.severity === "critical",
  );

  const mediumIssues = args.issues.filter((issue) => issue.severity === "medium");

  const collectionReadiness = averageConfidence(
    args.collections.map((collection) => collection.confidence),
  );

  const chronologyReadiness: CaseConfidence =
    args.collections.length === 0
      ? "very-low"
      : args.collections.every((collection) => collection.chronologyOrdered)
        ? "high"
        : "low";

  const exhibitReadiness: CaseConfidence =
    args.exhibits.length === 0
      ? "very-low"
      : highIssues.length > 0
        ? "low"
        : mediumIssues.length > 0
          ? "medium"
          : "high";

  const overallReadiness = averageConfidence([
    collectionReadiness,
    chronologyReadiness,
    exhibitReadiness,
  ]);

  return {
    overallReadiness,
    collectionReadiness,
    chronologyReadiness,
    exhibitReadiness,
    affidavitReferenceReadiness: exhibitReadiness,
    trialPackageReadiness: exhibitReadiness,
    blockers: uniqueStrings(highIssues.map((issue) => issue.title)),
    nextActions: uniqueStrings([
      ...args.issues.slice(0, 8).map((issue) => issue.suggestedFix),
      args.exhibits.length > 0
        ? "Review exhibit labels and confirm which exhibits should be used in court materials."
        : "",
      args.collections.length > 0
        ? "Confirm whether message and screenshot collections are in chronological order."
        : "",
    ]),
  };
}

export function buildEvidencePackaging(
  input: EvidencePackagingBuildInput,
): EvidencePackagingBuildOutput {
  const timestamp = nowIso();

  const collections = buildCollections(input);
  const exhibits = buildExhibits(collections);
  const issues = buildIssues(input, collections);
  const readiness = buildReadiness({ collections, exhibits, issues });

  const warnings = uniqueStrings([
    ...issues.map((issue) => issue.title),
    ...exhibits.flatMap((exhibit) => exhibit.warnings),
  ]);

  const packaging: EvidencePackagingModel = {
    id: createId("evidence_packaging"),
    version: "1.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,
    caseId: input.caseId,
    stage: input.stage,
    collections,
    exhibits,
    issues,
    readiness,
    warnings,
    confidence: readiness.overallReadiness,
  };

  return {
    packaging,
    warnings,
  };
}