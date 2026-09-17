/**
 * resetIntake clears everything an intake left behind, and nothing it should
 * not.
 *
 *   npm run test:reset-intake
 *
 * COSTS NOTHING. A fake Storage, no browser, no dev server.
 *
 * WHY NOT A BROWSER TEST. There is one of those too, for the real user journey.
 * But the reset itself is the part that must not silently do nothing, and a
 * check that needs a dev server running is a check that gets skipped — which is
 * how this class of bug survives.
 *
 * THE PROPERTIES, in the order they matter:
 *
 *   1. After a reset, NO registered key remains. Asserted against the registry
 *      itself, so adding a key to the registry extends this check for free and
 *      a key that the reset cannot reach fails it.
 *   2. Prefix keys — the ones suffixed with a case id, court path or user id —
 *      are cleared, because those are exactly the ones a fixed list misses.
 *   3. A signed-in user's draft survives a reset that says so.
 *   4. The Supabase auth token is NEVER cleared. Clearing intake is not signing
 *      out, and a reset that logged people out would be reverted rather than
 *      fixed.
 *   5. Unrelated keys are untouched.
 */

import { pathToFileURL } from "node:url";

import {
  INTAKE_STORAGE_KEYS,
  userScopedKey,
} from "../../src/lib/case-system/storage/intakeStorageKeys";
import { resetIntake, type ClearableStorage } from "../../src/lib/case-system/storage/resetIntake";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** A Storage stand-in. Deliberately not a mock of the real thing — a real map. */
function fakeStorage(seed: Record<string, string> = {}): ClearableStorage & {
  map: Map<string, string>;
} {
  const map = new Map(Object.entries(seed));
  return {
    map,
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(name: string) {
      map.delete(name);
    },
  };
}

const USER = "11111111-2222-4333-8444-555555555555";
const OTHER_USER = "99999999-8888-4777-8666-555555555555";
const STORY = "my landlord kept my deposit";

/**
 * A browser mid-flow: every registered key populated, including the prefix
 * forms a fixed list would miss.
 */
function populated(): { local: ReturnType<typeof fakeStorage>; session: ReturnType<typeof fakeStorage> } {
  const local: Record<string, string> = {};
  const session: Record<string, string> = {};

  for (const entry of INTAKE_STORAGE_KEYS) {
    const bag = entry.area === "local" ? local : session;
    if (entry.matches === "exact") {
      bag[entry.key] = STORY;
      continue;
    }
    // Every shape a prefix key actually takes in the wild.
    bag[entry.key] = STORY;
    bag[`${entry.key}:draft`] = STORY;
    bag[`${entry.key}:case:abc-123`] = STORY;
    if (entry.scope === "user") {
      bag[userScopedKey(entry.key, USER)] = STORY;
      bag[userScopedKey(entry.key, OTHER_USER)] = STORY;
    }
  }

  // Things the reset must not touch.
  local["sb-fddlpnibovkkkgboabqb-auth-token"] = "session-token";
  local["theme"] = "dark";
  session["unrelated-app-state"] = "keep me";

  return { local: fakeStorage(local), session: fakeStorage(session) };
}

function remaining(bag: ReturnType<typeof fakeStorage>): string[] {
  return [...bag.map.keys()];
}

function isRegistered(name: string, area: "local" | "session"): boolean {
  return INTAKE_STORAGE_KEYS.some(
    (entry) =>
      entry.area === area &&
      (entry.matches === "prefix" ? name.startsWith(entry.key) : name === entry.key),
  );
}

function main(): void {
  // ---- 1 & 2: a full reset leaves no registered key, prefixes included ----

  {
    const { local, session } = populated();
    const before = local.map.size + session.map.size;
    const result = resetIntake({ local, session, userId: USER });

    const leftoverLocal = remaining(local).filter((n) => isRegistered(n, "local"));
    const leftoverSession = remaining(session).filter((n) => isRegistered(n, "session"));

    check(
      "a full reset removes every registered key",
      leftoverLocal.length === 0 && leftoverSession.length === 0,
      `left behind: ${[...leftoverLocal, ...leftoverSession].join(", ")}`,
    );

    check(
      "the reset actually did something (guards against a silent no-op)",
      result.removed.length > 0 && result.removed.length < before,
      `removed ${result.removed.length} of ${before}`,
    );

    // The specific shapes a hand-written list misses.
    for (const shape of [
      "courtSimplifiedWorkspaceDocument:draft",
      "courtsimplified_parsed_messages:case:abc-123",
      "courtsimplified-ai-case-partner-chat:case:abc-123",
      userScopedKey("courtSimplifiedBuilderDraft", USER),
      userScopedKey("courtSimplifiedBuilderDraft", OTHER_USER),
    ]) {
      check(`suffixed key is cleared: ${shape}`, !local.map.has(shape));
    }

    check(
      "the court-path finder hand-off is cleared",
      !session.map.has("courtSimplifiedNotSureGuide"),
    );

    // ---- 4: never sign anyone out ----
    check(
      "the Supabase auth token survives",
      local.map.get("sb-fddlpnibovkkkgboabqb-auth-token") === "session-token",
    );
    // ---- 5: leave unrelated keys alone ----
    check("an unrelated localStorage key survives", local.map.get("theme") === "dark");
    check(
      "an unrelated sessionStorage key survives",
      session.map.get("unrelated-app-state") === "keep me",
    );
  }

  // ---- The two keys actually observed in a real browser, 2026-09-17 ----
  //
  // NOT hypothetical shapes. These are the exact key names a user found in
  // localStorage on their own machine, holding a case story that had survived
  // window closes and browser restarts:
  //
  //   courtSimplifiedWorkspaceDocument:case:3b24868a-f37a-4334-a82c-56830dcd0269
  //   courtSimplifiedBuilderDraft:7ae96282-53fa-4a5a-80f1-39ea5ba1c62e
  //
  // The first is the whole drafting workspace document, keyed by case id with
  // NO user id in the key. It is the one that was visible, and it is not the
  // key the original diagnosis predicted — that diagnosis was reasoned from
  // code rather than observed, and it was wrong. These rows exist so the fix
  // is pinned to what was measured, not to what was inferred.
  {
    const observed = {
      "courtSimplifiedWorkspaceDocument:case:3b24868a-f37a-4334-a82c-56830dcd0269": STORY,
      "courtSimplifiedBuilderDraft:7ae96282-53fa-4a5a-80f1-39ea5ba1c62e": STORY,
    };

    const local = fakeStorage({ ...observed, theme: "dark" });
    const session = fakeStorage({});
    resetIntake({ local, session });

    for (const key of Object.keys(observed)) {
      check(`observed-in-browser key is cleared: ${key.slice(0, 46)}…`, !local.map.has(key));
    }
    check("the unrelated key beside them survives", local.map.get("theme") === "dark");
  }

  // The user-scoped half of that pair must NOT be swept when the caller cannot
  // rule out a signed-in user — the finder's case. The workspace document,
  // which carries no user id, must still go.
  {
    const local = fakeStorage({
      "courtSimplifiedWorkspaceDocument:case:3b24868a-f37a-4334-a82c-56830dcd0269": STORY,
      "courtSimplifiedBuilderDraft:7ae96282-53fa-4a5a-80f1-39ea5ba1c62e": STORY,
    });
    resetIntake({ local, session: fakeStorage({}), includeUserScoped: false });

    check(
      "includeUserScoped:false still clears the unscoped workspace document",
      !local.map.has("courtSimplifiedWorkspaceDocument:case:3b24868a-f37a-4334-a82c-56830dcd0269"),
    );
    check(
      "includeUserScoped:false keeps the user-scoped builder draft",
      local.map.has("courtSimplifiedBuilderDraft:7ae96282-53fa-4a5a-80f1-39ea5ba1c62e"),
    );
  }

  // ---- 3: a signed-in user's draft survives when the caller says so ----

  {
    const { local, session } = populated();
    resetIntake({ local, session, includeUserScoped: false });

    check(
      "includeUserScoped:false keeps a signed-in user's draft",
      local.map.get(userScopedKey("courtSimplifiedBuilderDraft", USER)) === STORY,
    );
    check(
      "includeUserScoped:false still clears the guest hand-off",
      !session.map.has("courtSimplifiedNotSureGuide"),
    );
    check(
      "includeUserScoped:false still clears the shared, unscoped keys",
      !local.map.has("courtSimplifiedCaseContext") && !local.map.has("caseData"),
      `still present: ${remaining(local).filter((n) => isRegistered(n, "local")).join(", ")}`,
    );
  }

  // ---- includeShared:false is the narrow sweep ----

  {
    const { local, session } = populated();
    resetIntake({ local, session, includeShared: false });

    check(
      "includeShared:false leaves the unscoped keys in place",
      local.map.get("courtSimplifiedCaseContext") === STORY,
    );
    check(
      "includeShared:false still clears the guest hand-off",
      !session.map.has("courtSimplifiedGuestIntakeSession"),
    );
  }

  // ---- Storage that throws must not take the page down ----

  {
    const hostile: ClearableStorage = {
      get length(): number {
        throw new Error("site data blocked");
      },
      key() {
        throw new Error("site data blocked");
      },
      removeItem() {
        throw new Error("site data blocked");
      },
    };

    let threw = false;
    try {
      resetIntake({ local: hostile, session: hostile });
    } catch {
      threw = true;
    }
    check("storage that throws is survived, not propagated", !threw);
  }

  // ---- Absent storage is a no-op, not a crash ----

  {
    let threw = false;
    try {
      resetIntake({});
      resetIntake({ local: null, session: null });
    } catch {
      threw = true;
    }
    check("missing storage is a no-op", !threw);
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
