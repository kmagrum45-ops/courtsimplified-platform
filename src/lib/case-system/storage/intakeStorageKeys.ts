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
  /** What it holds relative to the story (StoryDataClass; verifyStoryDataRegistry). */
  storyData: StoryDataClass;
  /**
   * Kept when the login page clears the browser at sign-in (resetIntake's `signingIn`),
   * still cleared at sign-out. Only for a key that holds no case content: today the
   * safety notice's fingerprints, so "shown once" holds when a guest case moves into an
   * account (owner's Chrome check, 2026-10-30).
   */
  keptAtSignIn?: true;
  note: string;
};

/**
 * Where a piece of stored data stands when the story changes (Part 3,
 * `npm run test:story-data-registry`). Every key here, every intake section,
 * every master_result key and every table written has exactly one:
 *
 *   "version-record" — part of the intake record, whose answers are tagged with
 *                      the story version they were given for (storyBasis.ts)
 *                      and set aside when the story changes.
 *   "analysis-gate"  — shown only while the saved analysis matches the
 *                      currently confirmed facts (withConfirmedGuidance), or
 *                      checked against the current story where it is read.
 *   "not-story"      — not read from the story; the note says what it holds.
 *   "legacy"         — nothing writes it any more. Browser keys of this kind
 *                      are removed on every page load (removeLegacyBrowserKeys).
 */
export type StoryDataClass = "version-record" | "analysis-gate" | "not-story" | "legacy";

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
    storyData: "version-record",
    note: "Hand-off from the home gate into the builder, signed in or not. Consumed on entry.",
  },
  {
    key: "courtSimplifiedGuestCarry",
    area: "session",
    scope: "guest",
    matches: "exact",
    holdsCaseContent: false,
    storyData: "not-story",
    note: "Which guest intake this tab chose to bring into an account, set when the guest presses Sign in from it. Read once by the login page; expires after 30 minutes.",
  },
  {
    key: "courtSimplifiedSafetyNoticeShown",
    area: "session",
    scope: "guest",
    matches: "exact",
    holdsCaseContent: false,
    storyData: "not-story",
    keptAtSignIn: true,
    note:
      "Short one-way fingerprints (SHA-256 hex prefixes) of the stories the danger notice was already shown for, so it shows once (safetyNoticeOnce.ts, 2026-10-29). " +
      "Never the words themselves. sessionStorage, so it dies with the tab and is not left on a shared computer; cleared on sign-out with the rest of the registry. " +
      "Kept at sign-in (keptAtSignIn), so a notice a guest already saw is not shown again when their case moves into the account (2026-10-30).",
  },
  {
    key: "courtSimplifiedNotSureGuide",
    area: "session",
    scope: "guest",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "version-record",
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
    storyData: "not-story",
    note: "Case-partner chat hand-off between routes.",
  },
  {
    key: "courtSimplifiedPendingPositionSave:",
    area: "session",
    scope: "guest",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "analysis-gate",
    note:
      "A save of the step, stage or dates still on its way, written down before it is sent and crossed off once " +
      "the case holds it; sent by the next page in this tab, or as the tab closes, so a reload in the middle " +
      "does not lose it (pendingPositionSaves.ts, 28 Oct). Suffixed by case id. The same parts as master_result.position, " +
      "and replayed through the same save, which drops dates from an earlier story. Dropped after 30 minutes.",
  },
  {
    key: "courtSimplifiedPendingFormApplicability:",
    area: "session",
    scope: "guest",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "analysis-gate",
    note:
      "A save of the Forms page's \"does this form apply\" choices still on its way, written down before it is sent and " +
      "crossed off once the case holds it; sent by the next Forms page in this tab before it reads the choices, or as " +
      "the tab closes (pendingPositionSaves.ts, 28 Oct). Suffixed by case id. The same choices as master_result.formApplicability. " +
      "Dropped after 30 minutes.",
  },
  {
    key: "courtsimplified-ai-case-partner-chat:narrative-prefill",
    area: "session",
    scope: "guest",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "RETIRED in Part 3: the follow-up chat no longer hands its first message to the forms (a second copy of the story outside the version record). Suffixed by court path.",
  },

  {
    key: "courtSimplifiedBuilderLastCase",
    area: "session",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: false,
    storyData: "not-story",
    note:
      "The id and court path of the case this tab's builder last saved, so a reload of the results " +
      "step reopens that case instead of a blank intake (2026-10-06). An id, never case content.",
  },

  // ----------------------------------------------------------------- user
  {
    key: "courtSimplifiedBuilderDraft",
    area: "local",
    scope: "user",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "RETIRED 2026-09-28: no page reads or writes it (test:no-stale-intake). Listed so the reset still clears copies an older build left in a browser.",
  },
  {
    key: "courtSimplifiedActiveCaseId",
    area: "local",
    scope: "user",
    matches: "prefix",
    holdsCaseContent: false,
    storyData: "legacy",
    note:
      "Once written user-scoped by builderDraftStorage and unscoped by the evidence, forms and " +
      "document-workspace routes; nothing writes it now (checked in Part 3). The prefix match covers both.",
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
    storyData: "legacy",
    note: "Every case context this browser has held.",
  },
  {
    key: "courtSimplifiedCaseContext",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "The active case context.",
  },
  {
    key: "courtSimplifiedLoadedCaseContext",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Case context loaded by the document workspace.",
  },
  {
    key: "courtSimplifiedCaseRecords",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Persisted case records, including intake facts.",
  },
  {
    key: "courtSimplifiedActiveCaseRecord",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "The active case record.",
  },
  {
    key: "courtSimplifiedCaseSyncQueue",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Unsynced case writes waiting for Supabase. Survives sign-out.",
  },
  {
    key: "courtSimplifiedEvidencePackages",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Assembled evidence packages.",
  },
  {
    key: "courtSimplifiedEvidencePackage",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note:
      "Legacy single evidence package. casePersistenceEngine.ts (the only reader) was retired " +
      "2026-10-15 (MASTER_PLAN build order 6B); kept here so a browser carrying old data from " +
      "before that date still gets this key cleared on sign-out.",
  },
  {
    key: "courtSimplifiedRawEvidence",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Raw uploaded evidence metadata.",
  },
  {
    key: "courtSimplifiedWorkspaceDocument",
    area: "local",
    scope: "shared",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "not-story",
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
    storyData: "legacy",
    note: "Assembled master case.",
  },
  {
    key: "courtSimplifiedMasterResult",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Analysis output, which embeds the intake facts.",
  },
  {
    key: "courtSimplifiedMasterResultPatch",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Pending patch to the analysis output.",
  },
  {
    key: "courtSimplifiedDashboardPatch",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Pending dashboard patch.",
  },
  {
    key: "courtSimplifiedRecommendedNextRoute",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: false,
    storyData: "legacy",
    note: "Where the app last suggested the user go next.",
  },
  {
    key: "courtSimplifiedCase",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Legacy case blob. The Forms page stopped reading it in Part 3.",
  },
  {
    key: "caseData",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Legacy, and unprefixed — collides with anything else on the origin.",
  },
  {
    key: "master_result",
    area: "local",
    scope: "shared",
    matches: "exact",
    holdsCaseContent: true,
    storyData: "legacy",
    note: "Legacy, unprefixed. The Forms page stopped reading it in Part 3.",
  },
  {
    key: "courtsimplified_parsed_messages",
    area: "local",
    scope: "shared",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "legacy",
    note:
      "Bare key plus `:case:<caseId>`. Parsed message threads — among the most sensitive " +
      "content the platform holds.",
  },
  /*
   * STILL NAMED "ai-case-partner" ON PURPOSE, 2026-09-23.
   *
   * The module was renamed to guided-assistant because the old name claimed an
   * AI feature that does not exist -- the engine makes no model call. These
   * three localStorage keys were NOT renamed with it.
   *
   * A key rename orphans every saved conversation on every user device,
   * silently, at the moment they next open the page. The key is invisible to
   * users; the rename exists so a DEVELOPER does not mistake the module for an
   * AI feature, and this comment achieves that without losing anyone's work.
   *
   * Rename it only with a read-time migration that copies the old key forward.
   */
  {
    key: "courtsimplified-ai-case-partner-chat",
    area: "local",
    scope: "shared",
    matches: "prefix",
    holdsCaseContent: true,
    storyData: "not-story",
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
export const GUEST_CARRY_KEY = "courtSimplifiedGuestCarry";
export const COURT_PATH_FINDER_KEY = "courtSimplifiedNotSureGuide";
export const LOADED_CASE_CONTEXT_KEY = "courtSimplifiedLoadedCaseContext";
export const EVIDENCE_PACKAGE_LEGACY_KEY = "courtSimplifiedEvidencePackage";
export const WORKSPACE_DOCUMENT_KEY = "courtSimplifiedWorkspaceDocument";
export const PARSED_MESSAGES_KEY = "courtsimplified_parsed_messages";
export const BUILDER_LAST_CASE_KEY = "courtSimplifiedBuilderLastCase";
export const PENDING_POSITION_SAVE_KEY = "courtSimplifiedPendingPositionSave:";
export const PENDING_FORM_APPLICABILITY_KEY = "courtSimplifiedPendingFormApplicability:";
export const SAFETY_NOTICE_SHOWN_KEY = "courtSimplifiedSafetyNoticeShown";

/** Every individually-named constant, for the registry-coverage check. */
export const NAMED_STORAGE_KEYS = [
  BUILDER_DRAFT_KEY,
  ACTIVE_CASE_ID_KEY,
  GUEST_INTAKE_SESSION_KEY,
  GUEST_CARRY_KEY,
  COURT_PATH_FINDER_KEY,
  LOADED_CASE_CONTEXT_KEY,
  EVIDENCE_PACKAGE_LEGACY_KEY,
  WORKSPACE_DOCUMENT_KEY,
  PARSED_MESSAGES_KEY,
  BUILDER_LAST_CASE_KEY,
  PENDING_POSITION_SAVE_KEY,
  PENDING_FORM_APPLICABILITY_KEY,
  SAFETY_NOTICE_SHOWN_KEY,
] as const;
