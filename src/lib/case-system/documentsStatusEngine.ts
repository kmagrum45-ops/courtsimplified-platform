import { cleanList, normalize } from "./utils";

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

  const formMatch = text.match(/form([0-9]+[a-z]?)/i);
  if (formMatch) return `form-${formMatch[1].toLowerCase()}`;

  if (text.includes("plaintiffsclaim") || text.includes("plaintiffclaim")) {
    return "form-7a";
  }

  if (text.includes("affidavitofservice")) {
    return "form-8a";
  }

  if (text.includes("defence") || text.includes("defense")) {
    return "form-9a";
  }

  if (text.includes("witness")) {
    return "witness-list";
  }

  if (text.includes("settlementconference")) {
    return "settlement-conference";
  }

  if (text.includes("settlementposition")) {
    return "settlement-position-summary";
  }

  if (text.includes("evidencelist")) {
    return "evidence-list";
  }

  if (text.includes("documentbundle") || text.includes("keydocument")) {
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

  if (text.includes("13b") || text === "consent" || text.includes("form13bconsent")) {
    return true;
  }

  return false;
}

function isOfficialFormLike(label: string) {
  const text = normalize(label);

  return (
    text.includes("form") ||
    text.includes("plaintiffsclaim") ||
    text.includes("affidavitofservice") ||
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