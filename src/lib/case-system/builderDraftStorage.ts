export type BuilderDraftCourtPath = "family" | "small-claims" | "civil";

export type BuilderDraftInput = {
  caseId?: string | null;
  courtPath?: BuilderDraftCourtPath;
  province?: string;
  city?: string;
  caseStage?: string;
  yourName?: string;
  otherParty?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const BUILDER_DRAFT_STORAGE_KEY = "courtSimplifiedBuilderDraft";
export const ACTIVE_CASE_ID_STORAGE_KEY = "courtSimplifiedActiveCaseId";
export const GUEST_INTAKE_SESSION_STORAGE_KEY = "courtSimplifiedGuestIntakeSession";

function validUserId(userId?: string | null): userId is string {
  return typeof userId === "string" && userId.trim().length > 0 && userId.length <= 128;
}

export function builderDraftStorageKey(userId: string): string {
  return `${BUILDER_DRAFT_STORAGE_KEY}:${userId}`;
}

export function activeCaseIdStorageKey(userId: string): string {
  return `${ACTIVE_CASE_ID_STORAGE_KEY}:${userId}`;
}

function shortText(value: unknown, maximumLength: number): string {
  return typeof value === "string" ? value.slice(0, maximumLength) : "";
}

/**
 * This is intentionally a small, resumable intake draft. Full master-case
 * results belong only in the authenticated Supabase cases.master_result row.
 */
export function buildCompactBuilderDraft(input: BuilderDraftInput) {
  return {
    version: 1,
    caseId: shortText(input.caseId, 128),
    courtPath: input.courtPath || "",
    province: shortText(input.province, 64),
    city: shortText(input.city, 128),
    caseStage: shortText(input.caseStage, 64),
    yourName: shortText(input.yourName, 256),
    otherParty: shortText(input.otherParty, 256),
    facts: shortText(input.facts, 1_200),
    timeline: shortText(input.timeline, 800),
    evidence: shortText(input.evidence, 800),
    missingEvidence: shortText(input.missingEvidence, 500),
    goal: shortText(input.goal, 500),
    urgent: shortText(input.urgent, 128),
  };
}

/** Returns false for unavailable browser storage without exposing browser errors. */
export function saveCompactBuilderDraft(
  storage: StorageLike,
  input: BuilderDraftInput,
  userId?: string | null,
): boolean {
  if (!validUserId(userId)) return false;

  try {
    const draft = buildCompactBuilderDraft(input);

    if (draft.caseId) {
      storage.setItem(activeCaseIdStorageKey(userId), draft.caseId);
    }

    storage.setItem(builderDraftStorageKey(userId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function loadCompactBuilderDraft(
  storage: Pick<Storage, "getItem">,
  userId?: string | null,
) {
  if (!validUserId(userId)) return null;

  try {
    const value = storage.getItem(builderDraftStorageKey(userId));
    const parsed = value ? JSON.parse(value) as Record<string, unknown> : null;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      province: shortText(parsed.province, 64),
      city: shortText(parsed.city, 128),
      courtPath: shortText(parsed.courtPath, 32) as BuilderDraftCourtPath | "",
      facts: shortText(parsed.facts, 1_200),
    };
  } catch {
    return null;
  }
}

export function clearCompactBuilderDraft(
  storage: Pick<Storage, "removeItem">,
  userId?: string | null,
) {
  if (!validUserId(userId)) return;
  try {
    storage.removeItem(builderDraftStorageKey(userId));
    storage.removeItem(activeCaseIdStorageKey(userId));
  } catch {
    // Browser storage may be unavailable; do not expose storage errors.
  }
}

/**
 * A logged-out start is deliberately tab-scoped and consumed on entry to the
 * builder. It is not a resumable draft and is never written to localStorage.
 */
export function saveGuestIntakeSession(
  storage: Pick<Storage, "setItem">,
  input: BuilderDraftInput,
): boolean {
  try {
    storage.setItem(
      GUEST_INTAKE_SESSION_STORAGE_KEY,
      JSON.stringify(buildCompactBuilderDraft(input)),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeGuestIntakeSession(
  storage: Pick<Storage, "getItem" | "removeItem">,
) {
  try {
    const value = storage.getItem(GUEST_INTAKE_SESSION_STORAGE_KEY);
    storage.removeItem(GUEST_INTAKE_SESSION_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) as Record<string, unknown> : null;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      province: shortText(parsed.province, 64),
      city: shortText(parsed.city, 128),
      courtPath: shortText(parsed.courtPath, 32) as BuilderDraftCourtPath | "",
      facts: shortText(parsed.facts, 1_200),
    };
  } catch {
    return null;
  }
}

export function clearGuestIntakeSession(
  storage: Pick<Storage, "removeItem">,
) {
  try {
    storage.removeItem(GUEST_INTAKE_SESSION_STORAGE_KEY);
  } catch {
    // Browser storage may be unavailable; do not expose storage errors.
  }
}
