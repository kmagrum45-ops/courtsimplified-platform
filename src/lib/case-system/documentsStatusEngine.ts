import { cleanList, labelHasFormNumber, normalize } from "./utils";

export type DocumentStatus =
  | "completed"
  | "received"
  | "required-now"
  | "not-needed-now"
  | "later"
  | "case-package-task"
  | "blocked";

export type DocumentStatusInput = {
  completedForms?: string[];
  receivedForms?: string[];
  requiredNextForms?: string[];
  notNeededNow?: string[];
  casePackageItems?: string[];
};

export type DocumentStatusItem = {
  label: string;
  normalizedKey: string;
  status: DocumentStatus;
  reasons: string[];
};

export type DocumentStatusResult = {
  completed: DocumentStatusItem[];
  received: DocumentStatusItem[];
  requiredNow: DocumentStatusItem[];
  notNeededNow: DocumentStatusItem[];
  later: DocumentStatusItem[];
  casePackageTasks: DocumentStatusItem[];
  blocked: DocumentStatusItem[];
  duplicatesRemoved: string[];
};

function normalizeDocumentKey(label: string) {
  const text = normalize(label);

  // normalize() keeps spaces, hyphens and apostrophes, so every run-together
  // literal below — and the form-number pattern — has to be matched against
  // the compacted text. Comparing against `text` meant "Form 7A",
  // "Plaintiff's Claim" and "plaintiffs-claim" each produced a different key
  // and survived deduplication as separate entries.
  const compact = text.replace(/[^a-z0-9]/g, "");

  const formMatch = compact.match(/form([0-9]+[a-z]?)/i);
  if (formMatch) return `form-${formMatch[1].toLowerCase()}`;

  if (compact.includes("plaintiffsclaim") || compact.includes("plaintiffclaim")) {
    return "form-7a";
  }

  if (compact.includes("affidavitofservice")) {
    return "form-8a";
  }

  if (compact.includes("defence") || compact.includes("defense")) {
    return "form-9a";
  }

  if (compact.includes("witness")) {
    return "witness-list";
  }

  if (compact.includes("settlementconference")) {
    return "settlement-conference";
  }

  if (compact.includes("settlementposition")) {
    return "settlement-position-summary";
  }

  if (compact.includes("evidencelist")) {
    return "evidence-list";
  }

  if (compact.includes("documentbundle") || compact.includes("keydocument")) {
    return "document-bundle";
  }

  return text;
}

function makeItem(label: string, status: DocumentStatus, reasons: string[]): DocumentStatusItem {
  return {
    label,
    normalizedKey: normalizeDocumentKey(label),
    status,
    reasons: cleanList(reasons),
  };
}

function shouldBlockGenericBadMatch(label: string) {
  const text = normalize(label);

  if (!text) return true;

  // Exact number match: a substring test for "13b" also caught "113B" and any
  // longer number ending in 13B. labelHasFormNumber covers the normal spaced
  // labels; the concatenated literal below only fires on a label that already
  // has its separators removed, which normalize() does not do.
  if (
    labelHasFormNumber(label, "13B") ||
    text === "consent" ||
    text.includes("form13bconsent")
  ) {
    return true;
  }

  return false;
}

function isOfficialFormLike(label: string) {
  const text = normalize(label);

  // normalize() lowercases and collapses whitespace but keeps spaces, hyphens
  // and apostrophes, so the two run-together literals below never matched and
  // "Plaintiff's Claim" / "Affidavit of Service" were wrongly blocked. Compare
  // the compacted form as well: "Plaintiff's Claim", "plaintiffs claim" and
  // "plaintiffs-claim" all reduce to "plaintiffsclaim".
  const compact = text.replace(/[^a-z0-9]/g, "");

  return (
    text.includes("form") ||
    compact.includes("plaintiffsclaim") ||
    compact.includes("affidavitofservice") ||
    text.includes("defence") ||
    text.includes("defense")
  );
}

function addItem(
  target: DocumentStatusItem[],
  item: DocumentStatusItem,
  usedKeys: Map<string, DocumentStatus>,
  duplicatesRemoved: string[]
) {
  const existingStatus = usedKeys.get(item.normalizedKey);

  if (!existingStatus) {
    usedKeys.set(item.normalizedKey, item.status);
    target.push(item);
    return;
  }

  duplicatesRemoved.push(
    `${item.label} removed from ${item.status}; already categorized as ${existingStatus}.`
  );
}

export function runDocumentStatusEngine(input: DocumentStatusInput): DocumentStatusResult {
  const completed: DocumentStatusItem[] = [];
  const received: DocumentStatusItem[] = [];
  const requiredNow: DocumentStatusItem[] = [];
  const notNeededNow: DocumentStatusItem[] = [];
  const later: DocumentStatusItem[] = [];
  const casePackageTasks: DocumentStatusItem[] = [];
  const blocked: DocumentStatusItem[] = [];
  const duplicatesRemoved: string[] = [];

  const usedKeys = new Map<string, DocumentStatus>();

  for (const label of cleanList(input.completedForms || [])) {
    if (shouldBlockGenericBadMatch(label)) {
      blocked.push(makeItem(label, "blocked", ["Blocked as generic or incorrect completed-form match."]));
      continue;
    }

    addItem(
      completed,
      makeItem(label, "completed", ["User intake or analysis indicates this form was already completed."]),
      usedKeys,
      duplicatesRemoved
    );
  }

  for (const label of cleanList(input.receivedForms || [])) {
    if (shouldBlockGenericBadMatch(label)) {
      blocked.push(makeItem(label, "blocked", ["Blocked as generic or incorrect received-form match."]));
      continue;
    }

    addItem(
      received,
      makeItem(label, "received", ["User intake or analysis indicates this document was received from another party or the court."]),
      usedKeys,
      duplicatesRemoved
    );
  }

  for (const label of cleanList(input.requiredNextForms || [])) {
    if (shouldBlockGenericBadMatch(label)) {
      blocked.push(makeItem(label, "blocked", ["Blocked as generic or incorrect required-form match."]));
      continue;
    }

    const item = makeItem(label, "required-now", ["This appears to be an official form required at the current stage."]);

    if (!isOfficialFormLike(label)) {
      blocked.push(makeItem(label, "blocked", ["Blocked from required forms because it does not look like an official form."]));
      continue;
    }

    addItem(requiredNow, item, usedKeys, duplicatesRemoved);
  }

  for (const label of cleanList(input.notNeededNow || [])) {
    if (shouldBlockGenericBadMatch(label)) {
      blocked.push(makeItem(label, "blocked", ["Blocked as generic or incorrect not-needed match."]));
      continue;
    }

    addItem(
      notNeededNow,
      makeItem(label, "not-needed-now", ["This form is not needed at the current stage or has been displaced by current case status."]),
      usedKeys,
      duplicatesRemoved
    );
  }

  for (const label of cleanList(input.casePackageItems || [])) {
    addItem(
      casePackageTasks,
      makeItem(label, "case-package-task", ["This is a case preparation task, not an official court form."]),
      usedKeys,
      duplicatesRemoved
    );
  }

  return {
    completed,
    received,
    requiredNow,
    notNeededNow,
    later,
    casePackageTasks,
    blocked,
    duplicatesRemoved: cleanList(duplicatesRemoved),
  };
}