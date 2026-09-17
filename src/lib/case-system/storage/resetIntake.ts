/**
 * Clears every trace of an intake from browser storage.
 *
 * WHAT THIS IS FOR
 *
 * An anonymous user starting a new flow must start empty. On a shared computer
 * — a library, a shelter, a drop-in centre, which is what this platform's
 * audience actually uses — the alternative is the next person reading someone
 * else's account of their own legal problem.
 *
 * WHY IT CLEARS BY REGISTRY RATHER THAN BY LIST
 *
 * The previous clearing code was three hand-maintained lists in three files
 * (`builder/page.tsx`'s `clearTransientCaseContext`, `dashboard/page.tsx`'s
 * logout loop, and `caseContextStorage.ts`'s own clear). Each named ten keys.
 * There are twenty-six. A list that has to be updated in three places when a
 * key is added is a list that will be wrong.
 *
 * This iterates `INTAKE_STORAGE_KEYS`, so adding a key to the registry clears
 * it everywhere, and `npm run test:storage-keys` makes the registry the only
 * place a key can be named.
 *
 * WHY STORAGE IS INJECTED
 *
 * So the behaviour is testable without a browser. The reset is the part that
 * must not silently do nothing, and a check that needs a dev server running is
 * a check that gets skipped.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 *
 * The Supabase auth token (`sb-<project>-auth-token`). Clearing intake is not
 * signing out, and a signed-in user who starts a second case must not be
 * logged out by it. Sign-out is a separate action that clears its own session.
 */

import {
  INTAKE_STORAGE_KEYS,
  userScopedKey,
  type IntakeStorageKey,
} from "./intakeStorageKeys";

/** The slice of Storage this needs. Lets a plain object stand in for it. */
export type ClearableStorage = Pick<Storage, "removeItem"> & {
  readonly length: number;
  key(index: number): string | null;
};

export type ResetIntakeArgs = {
  local?: ClearableStorage | null;
  session?: ClearableStorage | null;
  /**
   * When present, that user's scoped keys are cleared too.
   *
   * Omit it to clear only what an anonymous visitor could have left behind.
   * Passing a user id does NOT sign the user out; it clears their local draft.
   */
  userId?: string | null;
  /**
   * Set false to leave the unscoped, shared localStorage keys alone.
   *
   * Defaults to TRUE. Those keys are the shared-computer exposure, so the safe
   * default is to clear them, and a caller that wants them kept has to say so.
   */
  includeShared?: boolean;
  /**
   * Set false to leave `…:<userId>` keys alone — every user's, not just one.
   *
   * WHY THIS IS SEPARATE FROM `userId`. The user-scoped entries are PREFIX
   * matches, because the suffix is a user id this module cannot enumerate. So
   * a plain sweep removes every account's draft on the machine, which is right
   * for "an anonymous person is starting fresh on a library computer" and
   * wrong for "the court-path finder is being opened and we do not know
   * whether anyone is signed in".
   *
   * Defaults to TRUE. A caller that cannot rule out a signed-in user passes
   * false, which is the conservative choice: it still clears everything
   * anonymous and everything shared.
   */
  includeUserScoped?: boolean;
};

export type ResetIntakeResult = {
  /** Keys actually removed, for tests and for the reachability of this code. */
  removed: string[];
};

function keysIn(storage: ClearableStorage): string[] {
  const names: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const name = storage.key(index);
    if (typeof name === "string") names.push(name);
  }
  return names;
}

function shouldRemove(entry: IntakeStorageKey, name: string): boolean {
  return entry.matches === "prefix" ? name.startsWith(entry.key) : name === entry.key;
}

/**
 * Removes every registered key from both storages.
 *
 * Enumerating what is PRESENT and matching it against the registry — rather
 * than calling removeItem for each registered key — is what makes the prefix
 * entries work: `courtSimplifiedWorkspaceDocument:<caseId>` and
 * `courtsimplified-ai-case-partner-chat:<caseId>:<path>:<session>` cannot be
 * enumerated from the registry, only recognised.
 */
export function resetIntake(args: ResetIntakeArgs = {}): ResetIntakeResult {
  const includeShared = args.includeShared !== false;
  const includeUserScoped = args.includeUserScoped !== false;
  const removed: string[] = [];

  const areas: { storage: ClearableStorage | null | undefined; area: "local" | "session" }[] = [
    { storage: args.local, area: "local" },
    { storage: args.session, area: "session" },
  ];

  for (const { storage, area } of areas) {
    if (!storage) continue;

    const entries = INTAKE_STORAGE_KEYS.filter(
      (entry) =>
        entry.area === area &&
        (includeShared || entry.scope !== "shared") &&
        (includeUserScoped || entry.scope !== "user"),
    );

    let present: string[];
    try {
      present = keysIn(storage);
    } catch {
      // Storage can throw on access in a private window or with site data
      // blocked. A reset that cannot read is not a reset that should crash the
      // page it was called from.
      continue;
    }

    for (const name of present) {
      if (!entries.some((entry) => shouldRemove(entry, name))) continue;
      try {
        storage.removeItem(name);
        removed.push(name);
      } catch {
        // Same reasoning: never let a storage failure break the caller.
      }
    }
  }

  // The user-scoped keys are prefix entries, so the loop above already removed
  // them for every user on this browser. This explicit pass exists for the case
  // where the key is absent from the enumeration but present to removeItem,
  // which some storage shims allow, and costs nothing when it is a no-op.
  if (args.userId && args.local) {
    for (const entry of INTAKE_STORAGE_KEYS) {
      if (entry.scope !== "user" || entry.area !== "local") continue;
      const name = userScopedKey(entry.key, args.userId);
      try {
        args.local.removeItem(name);
      } catch {
        // As above.
      }
    }
  }

  return { removed };
}

/**
 * The browser-side call. Reads `window` itself so call sites stay one line and
 * cannot forget an area.
 */
export function resetIntakeInBrowser(
  options: {
    userId?: string | null;
    includeShared?: boolean;
    includeUserScoped?: boolean;
  } = {},
): ResetIntakeResult {
  if (typeof window === "undefined") return { removed: [] };
  return resetIntake({
    local: window.localStorage,
    session: window.sessionStorage,
    userId: options.userId ?? null,
    includeShared: options.includeShared,
    includeUserScoped: options.includeUserScoped,
  });
}
