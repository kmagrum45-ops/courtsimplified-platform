export type FormsCourtPath = "family" | "small-claims" | "civil";

export const SELECTED_CASE_UNAVAILABLE_MESSAGE =
  "This case could not be loaded. Please return to your case dashboard and try again.";

// Plain words (page review, 2026-10-06): "no verified canonical form record
// is linked" was internal status shown to users.
export const UNLINKED_FORM_RECOMMENDATION_MESSAGE =
  "Named in your case analysis. Check it against the official form in the list below before you use it.";

const CANONICAL_FORM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FormsSelectedCaseRecord = {
  id: string;
  court_path?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asCourtPath(value: unknown): FormsCourtPath | null {
  if (value === "family" || value === "small-claims" || value === "civil") {
    return value;
  }

  return null;
}

export function getCanonicalFormLookup(input: {
  canonicalFormId: unknown;
  courtType: unknown;
}): { canonicalFormId: string; courtType: FormsCourtPath } | null {
  const canonicalFormId =
    typeof input.canonicalFormId === "string"
      ? input.canonicalFormId.trim()
      : "";
  const courtType = asCourtPath(input.courtType);

  if (!CANONICAL_FORM_ID_PATTERN.test(canonicalFormId) || !courtType) {
    return null;
  }

  return { canonicalFormId, courtType };
}

export function resolveSelectedFormsCase<T>(args: {
  caseId: string;
  record: FormsSelectedCaseRecord | null;
  masterResult: T | null;
}): { courtPath: FormsCourtPath; masterResult: T | null } | null {
  const { caseId, record, masterResult } = args;

  if (!caseId || !record || record.id !== caseId) return null;

  const courtPath = asCourtPath(record.court_path);
  if (!courtPath) return null;

  const masterRecord = asRecord(masterResult);
  const declaredPath = masterRecord.path ?? masterRecord.courtPath;

  if (declaredPath !== undefined && asCourtPath(declaredPath) !== courtPath) {
    return null;
  }

  return { courtPath, masterResult };
}
