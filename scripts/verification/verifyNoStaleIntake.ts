/**
 * Nothing from an earlier session is shown before the user opens a case.
 *
 * 2026-09-28: a signed-in user opened the Small Claims intake and found an old
 * test story already filled in. Earlier fixes had scoped browser storage per
 * user and cleared it for anonymous visitors, but the builder deliberately
 * RESTORED the signed-in user's own last draft from localStorage on every
 * visit, and the home gate offered it as "Saved case on this device". That was
 * a feature, which is why each leak fix left it standing.
 *
 * The rule now: saved work is opened from the workspace (it comes from the
 * account); the browser is only a read-once hand-off between two pages. This
 * suite asserts the PROPERTIES that keep that true:
 *
 *   1. No page reads or writes the per-user resumable browser draft.
 *   2. The home-to-builder hand-off is deleted by the act of reading it.
 *   3. Signing in clears the browser BEFORE the workspace opens.
 *   4. Signing out clears it, from the button and from any other sign-out
 *      (expiry, another tab), via a guard mounted on every page.
 *   5. The clear actually removes every case-content key in the registry,
 *      including the old per-user draft keys an earlier build left behind.
 *   6. Leaving, switching or starting a case in the builder clears the story
 *      React state still holds from the previous case (2026-09-30).
 *
 * The browser-level version (planted draft, pages checked on screen) is in
 * tests/browser/intake-reset.spec.ts.
 *
 * Reads source off disk and exercises the storage helpers against in-memory
 * storage. No browser, no network, no database.
 *
 * Run: npm run test:no-stale-intake
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { consumeGuestIntakeSession, saveGuestIntakeSession } from "../../src/lib/case-system/builderDraftStorage";
import { INTAKE_STORAGE_KEYS, userScopedKey } from "../../src/lib/case-system/storage/intakeStorageKeys";
import { resetIntake } from "../../src/lib/case-system/storage/resetIntake";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

// 1. No page uses the resumable per-user draft.
const offenders = walk(path.join(ROOT, "app"))
  .filter((file) => /\b(loadCompactBuilderDraft|saveCompactBuilderDraft)\s*\(/.test(strip(readFileSync(file, "utf8"))))
  .map((file) => path.relative(ROOT, file));
check("no page reads or writes a resumable browser draft", offenders.length === 0, offenders.join(", "));
check(
  "the home gate has no 'saved case on this device' resume panel",
  !read("app/_components/HomeLocationGate.tsx").includes("saved-case-panel"),
);

// 2. The hand-off is read once.
const store = new Map<string, string>();
const session = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
saveGuestIntakeSession(session, { courtPath: "small-claims", province: "Ontario", city: "Ottawa", facts: "HANDOFF story" });
const first = consumeGuestIntakeSession(session);
const second = consumeGuestIntakeSession(session);
check("the hand-off delivers the story once", first?.facts === "HANDOFF story");
check("the hand-off is gone after it is read", second === null && store.size === 0);
check(
  "the builder takes its starting story only from the read-once hand-off",
  /consumeGuestIntakeSession\(sessionStorage\)/.test(strip(read("app/builder/page.tsx"))),
);

// 3. Signing in clears before navigating.
const login = strip(read("app/login/page.tsx"));
const afterSignIn = login.slice(login.indexOf("signInWithPassword("));
const resetAt = afterSignIn.indexOf("resetIntakeInBrowser()");
// Any navigation, not a pinned destination: sign-in now returns to the page
// that sent the user (?next=), and the property is that clearing comes first.
const pushAt = afterSignIn.indexOf("router.push(");
check("sign-in clears the browser before opening the workspace", resetAt !== -1 && pushAt !== -1 && resetAt < pushAt);
const afterSignUp = login.slice(login.indexOf("signUp("), login.indexOf("signInWithPassword("));
check(
  "sign-up with an immediate session clears too",
  afterSignUp.indexOf("resetIntakeInBrowser()") !== -1 &&
    afterSignUp.indexOf("resetIntakeInBrowser()") < afterSignUp.indexOf("router.push("),
);

// 4. Signing out clears, however it happens.
const dashboard = strip(read("app/dashboard/page.tsx"));
const logout = dashboard.slice(dashboard.indexOf("async function logout()"));
check(
  "the Log out button clears before signing out",
  logout.indexOf("resetIntakeInBrowser()") !== -1 && logout.indexOf("resetIntakeInBrowser()") < logout.indexOf("signOut()"),
);
const guard = strip(read("app/_components/AuthStorageGuard.tsx"));
check("the sign-out guard clears on SIGNED_OUT", /SIGNED_OUT"\)\s*resetIntakeInBrowser\(\)/.test(guard));
check("the sign-out guard is mounted on every page", /<AuthStorageGuard\s*\/>/.test(strip(read("app/layout.tsx"))));

// 5. The clear removes every case-content key, including old per-user drafts.
function fakeStorage(keys: string[]) {
  const map = new Map(keys.map((k) => [k, "SECRETMARKER"]));
  return {
    map,
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
  };
}
const planted = (area: "local" | "session") =>
  INTAKE_STORAGE_KEYS.filter((e) => e.area === area && e.holdsCaseContent).map((e) =>
    e.scope === "user" ? userScopedKey(e.key, "any-user-id") : e.matches === "prefix" ? `${e.key}:x` : e.key,
  );
const local = fakeStorage(planted("local"));
const sess = fakeStorage(planted("session"));
check("the registry has case-content keys to plant (sanity)", local.map.size + sess.map.size > 10);
resetIntake({ local, session: sess });
const left = [...local.map.keys(), ...sess.map.keys()];
check("a full clear leaves no case content in the browser", left.length === 0, left.join(", "));

// 6. (2026-09-30) The builder is one mounted page across ?caseId=A and
//    ?path=...: leaving a case must clear the story loaded FROM it, and opening
//    a case must start from no story. The site owner pressed Back after an
//    intake and found an earlier case's story prefilled in a fresh one.
const builder = strip(read("app/builder/page.tsx"));
const leaveEffect = builder.match(/previousCaseIdRef\.current = queryCaseId;[\s\S]{0,400}?\}, \[queryCaseId\]\);/);
check(
  "leaving a case clears the story loaded from it",
  Boolean(leaveEffect && /if \(previous && !queryCaseId\)[\s\S]*setHomeStory\(""\)/.test(leaveEffect[0])),
);
const loadStart = builder.match(/async function loadExistingCase\(\) \{[\s\S]{0,300}?from\("cases"\)/);
check(
  "opening a case clears the previous story before loading its own",
  Boolean(loadStart && /setHomeStory\(""\)/.test(loadStart[0])),
);
const newCase = builder.match(/setChatSessionId\(createChatSessionId\(courtPath\)\);[\s\S]{0,200}?router\.replace\(`\/builder\?path=/);
check("starting a new case clears the story", Boolean(newCase && /setHomeStory\(""\)/.test(newCase[0])));

console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
