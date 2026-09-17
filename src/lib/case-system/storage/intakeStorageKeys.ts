/**
 * EVERY browser-storage key this application uses, in one place.
 *
 * *** THIS MODULE IS THE ONLY LEGAL PLACE TO NAME A STORAGE KEY. ***
 *
 * `npm run test:storage-keys` fails on a string-literal storage key anywhere
 * else in app/ or src/. That check is the point of this file, not a nicety.
 *
 * WHY IT EXISTS
 *
 * The court-path finder's key was written in `NotSureCourtGuide.tsx` as a local
 * `temporaryKey` const, read in `builder/page.tsx` as a bare string literal, and
 * a third set of keys was exported properly from `builderDraftStorage.ts`.
 * Three conventions for one job. Two separate searches for that key missed it —
 * the first because the literal has no separator after "courtSimplified", the
 * second because the const name is local and shares no token with the literal.
 *
 * A key nobody can find is a key nobody can clear. That is how the leak below
 * survived.
 *
 * WHAT `scope` MEANS, AND WHY IT IS THE IMPORTANT COLUMN
 *
 *   "user"   — the key ends in `:<userId>`, so two accounts on one browser
 *              cannot read each other's data.
 *   "guest"  — sessionStorage, so it dies with the tab.
 *   "shared" — localStorage with NO user id and NO expiry. Every account on
 *              the machine, and every anonymous visitor after them, reads the
 *              same value.
 *
 * TWENTY keys are "shared" and most carry case facts. The audience for this
 * platform uses library and shelter computers. That is a privacy finding, not
 * a tidiness one: see docs/security/DATA_FLOW_INVENTORY.md.
 *
 * Marking a key "shared" here is a statement that it is UNSCOPED, not a
 * statement that it is acceptable.
 */

export type StorageArea = "local" | "session";

export type StorageScope = "user" | "guest" | "shared";

export type IntakeStorageKey = {
  /** The literal key, or the prefix when `matches` is "prefix". */
  key: string;
  area: StorageArea;
  scope: StorageScope;
  /**
   * "exact"  — clear this key.
   * "prefix" — clear every key that starts with this, because the suffix is a
   *            case id, a court path, or a user id that cannot be enumerated
   *            from here.
   */
  matches: "exact" | "prefix";
  /** Whether the value can contain what the user wrote about their case. */
  holdsCaseContent: boolean;
  note: string;
};

/**
 * Suffix used by the user-scoped keys. Kept here so the one place that knows
 * how a scoped key is spelled is the same place that lists the keys.
 */
export function userScopedKey(base: string, userId: string): string {
  return `${base}:${userId}`;
}

export const INTAKE_STORAGE_KEYS: readonly IntakeStorageKey[] = [
  // ---------------------------------------------------------------- guest
  {
    key: "courtSimplifiedGuestIntakeSession",
    area: "session",
    scope: "guest",
    matches: "exact",
    holdsCaseContent: true,
    note: "Anonymous hand-off from the home gate into the builder. Consumed on entry.",
  },
  {
    key: "courtSimplifiedNotSureGuide",
    area: "session",
    scope: "guest",
    matches: "exact",
    holdsCaseContent: true,
    note:
      "Court-path finder hand-off. Written with seven fields; only province, city and facts " +
      "are ever read. Removed only when all three validate, so a payload failing that guard " +
      "stays for the life of the tab.",
  },
  {
    key: "courtsimplified-ai-case-partner-chat:route-transfer",
    area: "session",
    scope: "guest",
    matches: "exact",
    holdsCaseContent: true,
    note: "Case-partner chat hand-off between routes.",
  },
  {
    key: "courtsimplified-ai-case-partner-chat:narrative-prefill",
    area: "session",
    scope: "guest",
    matches: "prefix",
    holdsCaseContent: true,
    note: "Suffixed by court path. The user's narrative, extracted into intake fields.",
  },

  // ----------------------------------------------------------------- user
  {
    key: "courtSimplifiedBuilderDraft",
    area: "local",
    scope: "user",
    matches: "prefix",
    holdsCaseContent: true,
    note: "Resumable intake draft. Suffixed with the user id; refuses to write without one.",
  },
  {
    key: "courtSimplifiedActiveCaseId",
    area: "local",
    scope: "user",
    matches: "prefix",
    holdsCaseContent: false,
    note:
      "Written user-scoped by builderDraftStorage, but ALSO read and written UNSCOPED by " +
      "the evidence, forms and document-workspace routes. The prefix match covers both.",
  },

  // --------------------------------------------------------------- shared
  // Unscoped localStorage. Everything below is readable by the next person to
  // use the browser.
  {
    key: "courtSimplifiedCaseContexts",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Every case context this browser has held.",
  },
  {
    key: "courtSimplifiedCaseContext",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "The active case context.",
  },
  {
    key: "courtSimplifiedLoadedCaseContext",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Case context loaded by the document workspace.",
  },
  {
    key: "courtSimplifiedCaseRecords",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Persisted case records, including intake facts.",
  },
  {
    key: "courtSimplifiedActiveCaseRecord",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "The active case record.",
  },
  {
    key: "courtSimplifiedCaseSyncQueue",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Unsynced case writes waiting for Supabase. Survives sign-out.",
  },
  {
    key: "courtSimplifiedEvidencePackages",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Assembled evidence packages.",
  },
  {
    key: "courtSimplifiedEvidencePackage",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Legacy single evidence package, still read by casePersistenceEngine.",
  },
  {
    key: "courtSimplifiedRawEvidence",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Raw uploaded evidence metadata.",
  },
  {
    key: "courtSimplifiedWorkspaceDocument",
    area: "local",
    scope: "shared",
    matches: "prefix",
    holdsCaseContent: true,
    note:
      "Bare key is the legacy form; `:draft` and `:<caseId>` are current. Prefix covers all " +
      "three. Holds generated document text.",
  },
  {
    key: "courtSimplifiedMasterCase",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Assembled master case.",
  },
  {
    key: "courtSimplifiedMasterResult",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Analysis output, which embeds the intake facts.",
  },
  {
    key: "courtSimplifiedMasterResultPatch",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Pending patch to the analysis output.",
  },
  {
    key: "courtSimplifiedDashboardPatch",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Pending dashboard patch.",
  },
  {
    key: "courtSimplifiedRecommendedNextRoute",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: false,
    note: "Where the app last suggested the user go next.",
  },
  {
    key: "courtSimplifiedCase",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Legacy case blob. Still read by the forms route.",
  },
  {
    key: "caseData",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Legacy, and unprefixed — collides with anything else on the origin.",
  },
  {
    key: "master_result",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    note: "Legacy, unprefixed. Read by the forms route.",
  },
  {
    key: "courtsimplified_parsed_messages",
    area: "local",
    scope: "shared",
    matches: "prefix",
    holdsCaseContent: true,
    note:
      "Bare key plus `:case:<caseId>`. Parsed message threads — among the most sensitive " +
      "content the platform holds.",
  },
  {
    key: "courtsimplified-ai-case-partner-chat",
    area: "local",
    scope: "shared",
    matches: "prefix",
    holdsCaseContent: true,
    note:
      "Case-partner chat transcripts, suffixed by case id, path and session. The user's own " +
      "words about their matter.",
  },
] as const;

/** Convenience accessors. Prefer these over filtering the array at call sites. */
export const GUEST_STORAGE_KEYS = INTAKE_STORAGE_KEYS.filter((k) => k.scope === "guest");
export const SHARED_STORAGE_KEYS = INTAKE_STORAGE_KEYS.filter((k) => k.scope === "shared");
export const USER_STORAGE_KEYS = INTAKE_STORAGE_KEYS.filter((k) => k.scope === "user");

/**
 * Named individually where a call site needs one specific key.
 *
 * Every one of these is listed in INTAKE_STORAGE_KEYS above — asserted by
 * `npm run test:storage-keys`, so a constant here cannot drift into naming a
 * key the reset does not clear.
 */
export const BUILDER_DRAFT_KEY = "courtSimplifiedBuilderDraft";
export const ACTIVE_CASE_ID_KEY = "courtSimplifiedActiveCaseId";
export const GUEST_INTAKE_SESSION_KEY = "courtSimplifiedGuestIntakeSession";
export const COURT_PATH_FINDER_KEY = "courtSimplifiedNotSureGuide";
export const LOADED_CASE_CONTEXT_KEY = "courtSimplifiedLoadedCaseContext";
export const EVIDENCE_PACKAGE_LEGACY_KEY = "courtSimplifiedEvidencePackage";
export const WORKSPACE_DOCUMENT_KEY = "courtSimplifiedWorkspaceDocument";
export const PARSED_MESSAGES_KEY = "courtsimplified_parsed_messages";

/** Every individually-named constant, for the registry-coverage check. */
export const NAMED_STORAGE_KEYS = [
  BUILDER_DRAFT_KEY,
  ACTIVE_CASE_ID_KEY,
  GUEST_INTAKE_SESSION_KEY,
  COURT_PATH_FINDER_KEY,
  LOADED_CASE_CONTEXT_KEY,
  EVIDENCE_PACKAGE_LEGACY_KEY,
  WORKSPACE_DOCUMENT_KEY,
  PARSED_MESSAGES_KEY,
] as const;
