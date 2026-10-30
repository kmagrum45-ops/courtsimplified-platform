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
 * 2026-10-16: the same family of bug came back through a DIFFERENT door. Two
 * stale-case recovery effects were added 2026-10-15 to solve an unrelated
 * problem (a tab that reloads mid-intake losing its place), by reading the
 * last caseId this tab saved and -- if the court path matched -- jumping to
 * it. They had no way to tell "this tab lost its place" from "this is an
 * intentional new case of the same court type", so starting a brand new case
 * right after an earlier one silently landed on the earlier one, with its
 * story. Found live, by the site owner's own hands-on test, because this
 * suite's checks name specific effects by pattern and neither new recovery
 * effect existed yet when they were written -- a new door into old territory
 * this suite was never widened to watch. Check 7 below closes that door by
 * property, not by naming the two known effects: ANY code that reads
 * BUILDER_LAST_CASE_KEY to redirect must first check freshStoryHandoffRef, so
 * a third such effect added later is caught here too, not just the two that
 * exist today.
 *
 * The rule now: saved work is opened from the workspace (it comes from the
 * account). An explicit active flow can recover its owner/case/court-scoped
 * tab checkpoint; a fresh URL never adopts it. The legacy browser hand-off
 * remains read-once. This
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
// Part 3: the home page hands over inside the intake record (?intake=), so no
// screen reads a starting story from the older hand-off format any more.
check(
  "no screen reads a starting story from the older hand-off format",
  !/consumeGuestIntakeSession\s*\(/.test(strip(read("app/builder/page.tsx"))) &&
    !/legacy\.facts/.test(strip(read("app/_components/IntakeRecovery.tsx"))),
);

// 3. Signing in clears before navigating.
const login = strip(read("app/login/page.tsx"));
const afterSignIn = login.slice(login.indexOf("signInWithPassword("));
// The login page's clear, with or without the sign-in flag (which keeps only the safety notice's fingerprints).
const loginReset = /resetIntakeInBrowser(({ signingIn: true })?)/;
const resetAt = afterSignIn.search(loginReset);
// Any navigation, not a pinned destination: sign-in now returns to the page
// that sent the user (?next=), and the property is that clearing comes first.
const pushAt = afterSignIn.indexOf("router.push(");
check("sign-in clears the browser before opening the workspace", resetAt !== -1 && pushAt !== -1 && resetAt < pushAt);
const afterSignUp = login.slice(login.indexOf("signUp("), login.indexOf("signInWithPassword("));
check(
  "sign-up with an immediate session clears too",
  afterSignUp.search(loginReset) !== -1 &&
    afterSignUp.search(loginReset) < afterSignUp.indexOf("router.push("),
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
const leaveEffect = builder.match(/previousCaseIdRef\.current = queryCaseId;[\s\S]{0,400}?\}, \[queryCaseId[^\]]*\]\);/);
check(
  "leaving a case clears the story loaded from it",
  Boolean(leaveEffect && /if \(previous && !queryCaseId\)[\s\S]*setHomeStory\(""\)/.test(leaveEffect[0])),
);
const loadStart = builder.match(/async function loadExistingCase\(\) \{[\s\S]{0,900}?const data = recovery\?\.row\?\.id === queryCaseId \? recovery.row : null;/);
check(
  "opening a case uses only its validated recovery row and clears uncheckpointed story",
  Boolean(loadStart && /setHomeStory\(""\)/.test(loadStart[0])),
);
const newCase = builder.match(/setChatSessionId\(createChatSessionId\(courtPath\)\);[\s\S]{0,200}?router\.replace\(`\/builder\?path=/);
check("starting a new case clears the story", Boolean(newCase && /setHomeStory\(""\)/.test(newCase[0])));

// 7. (2026-10-16) ANY code that reads BUILDER_LAST_CASE_KEY to redirect this
//    tab into an old case must first rule out that a fresh story hand-off
//    just landed on this mount. Checked by property -- every occurrence of
//    the read, not just the two effects known to exist today -- so a third
//    one added later and left unguarded fails here instead of shipping.
const lastCaseReads: number[] = [];
{
  const needle = "sessionStorage.getItem(BUILDER_LAST_CASE_KEY)";
  let from = 0;
  for (;;) {
    const at = builder.indexOf(needle, from);
    if (at === -1) break;
    lastCaseReads.push(at);
    from = at + needle.length;
  }
}
check("there are stale-case recovery reads to guard (sanity)", lastCaseReads.length >= 2, String(lastCaseReads.length));
const unguarded = lastCaseReads.filter((at) => {
  const windowStart = Math.max(0, at - 1500);
  const before = builder.slice(windowStart, at);
  // The guard must be the LAST relevant statement before the read, inside
  // this same effect -- not merely present somewhere upstream in the file.
  const lastEffectStart = before.lastIndexOf("useEffect(() => {");
  const scoped = lastEffectStart === -1 ? before : before.slice(lastEffectStart);
  return !/freshStoryHandoffRef\.current\)\s*return;/.test(scoped);
});
check(
  "every stale-case recovery effect checks freshStoryHandoffRef before redirecting",
  unguarded.length === 0,
  `${unguarded.length} of ${lastCaseReads.length} unguarded`,
);
// A property, not a count: every hand-off that sets a starting story marks the
// ref first. (It pinned "two sources" until Part 3 removed the older home-page
// format, leaving the court-path finder's.)
const handoffStories = [...builder.matchAll(/setHomeStory\(\w+\.facts/g)];
check(
  "every fresh story hand-off marks freshStoryHandoffRef so the guard above has something to check",
  handoffStories.length > 0 &&
    handoffStories.every((match) => /freshStoryHandoffRef\.current\s*=\s*true;/.test(builder.slice(Math.max(0, (match.index ?? 0) - 300), match.index))),
);

// ---------------------------------------------------------------------------
// 8. (2026-10-16, second pass) Recovery runs only for a tab that RE-ENTERED on
//    the intake -- never for one that walked there from the chooser.
// ---------------------------------------------------------------------------

/*
 * *** CHECK 7 WAS SATISFIED BY THE BROKEN CODE, WHICH IS WHY THIS EXISTS ***
 *
 * Check 7 requires every stale-case recovery effect to test `freshStoryHandoffRef`
 * before redirecting. The effect that caused the live bug DID test it. The bug
 * happened anyway, because that ref is only set by two hand-offs -- the home page's
 * and the court-path finder's -- and the path the site owner actually took sets
 * neither:
 *
 *   dashboard "Start a new case" -> /builder?path=small-claims  (the chooser)
 *     -> type a city -> "Answer questions one at a time with AI help"
 *
 * On that mount `stepParam` is null, so the recovery effect returns at its
 * guided/form guard WITHOUT setting its decide-once ref. Choosing AI help flips
 * `stepParam` to "guided", the effect finally runs, reads BUILDER_LAST_CASE_KEY,
 * and injects the FINISHED case's id into the URL -- bringing back its story and
 * location.
 *
 * So the property check 7 asserts is necessary and not sufficient, and a check that
 * passes against code with the bug in it is the thing to fix. The distinction that
 * actually works is WHERE THE PAGE CAME IN: a tab that lost its place re-enters
 * directly on ?step=guided or ?step=form; somebody starting a new case enters on
 * the chooser and walks forward. Both show the same `stepParam`, so only the step
 * the page MOUNTED on can tell them apart.
 *
 * Asserted as a property, not against the two effects that exist today: a third
 * recovery effect added later is caught by the same loop.
 */
/*
 * Scoped to the effects that are REACHABLE BY WALKING FORWARD from the chooser,
 * which means the ones gated on ?step=guided or ?step=form.
 *
 * The results-step recovery is deliberately exempt, and the distinction is real
 * rather than a convenience. It fires only on `?step=results` with no analysis in
 * state — a results page that was reloaded, where resuming is the correct
 * behaviour. Walking forward from the chooser cannot reach it, because arriving at
 * results that way always has `analysis` set and the effect returns. Requiring a
 * mounted-on-intake guard there would break the resume it exists for.
 *
 * It is still covered, by the other half of the fix: a fresh chooser mount clears
 * BUILDER_LAST_CASE_KEY, so no reader of that key — this one included, and any
 * added later — can resurrect a case the person deliberately left.
 */
const walkableReads = lastCaseReads.filter((at) => {
  const before = builder.slice(Math.max(0, at - 1500), at);
  const lastEffectStart = before.lastIndexOf("useEffect(() => {");
  const scoped = lastEffectStart === -1 ? before : before.slice(lastEffectStart);
  return /stepParam\s*!==\s*"guided"/.test(scoped) || /stepParam\s*!==\s*"form"/.test(scoped);
});
check(
  "there is a guided/form recovery effect to guard (sanity)",
  walkableReads.length >= 1,
  String(walkableReads.length),
);
const unmountGuarded = walkableReads.filter((at) => {
  const before = builder.slice(Math.max(0, at - 1500), at);
  const lastEffectStart = before.lastIndexOf("useEffect(() => {");
  const scoped = lastEffectStart === -1 ? before : before.slice(lastEffectStart);
  // A guard on the step this mount came in on, whatever the ref is called.
  return !/mounted[A-Za-z]*Ref\.current\s*!==/.test(scoped);
});
check(
  "every guided/form recovery effect also requires the page to have MOUNTED on the intake step",
  unmountGuarded.length === 0,
  `${unmountGuarded.length} of ${walkableReads.length} would still fire when walked to from the chooser`,
);

/*
 * And the ref must genuinely capture MOUNT state. A ref assigned inside an effect
 * that re-runs per step would hold the current step, making the guard above a
 * tautology that always passes -- the same shape of mistake as check 7.
 *
 * So it is assigned exactly once, in render, behind a decided-once flag.
 */
check(
  "the mounted-step ref is captured once in render, not reassigned per step",
  /mountedStepDecidedRef\.current\s*=\s*true;/.test(builder) &&
    (builder.match(/mountedStepRef\.current\s*=\s*stepParam;/g) ?? []).length === 1,
);

/*
 * The other half of the fix: a new case started from the chooser forgets the last
 * one, so no later reader of that key can reopen a finished case. Only on a mount
 * that is both on the chooser AND without a caseId -- opening a saved case
 * (?caseId=...) must leave the key alone.
 */
check(
  "a fresh chooser mount with no caseId clears BUILDER_LAST_CASE_KEY",
  /removeItem\(BUILDER_LAST_CASE_KEY\)/.test(builder),
);
check(
  "that clear is skipped when a caseId is present, so opening a saved case keeps it",
  (() => {
    const at = builder.indexOf("removeItem(BUILDER_LAST_CASE_KEY)");
    if (at === -1) return false;
    const before = builder.slice(Math.max(0, at - 800), at);
    const lastEffectStart = before.lastIndexOf("useEffect(() => {");
    const scoped = lastEffectStart === -1 ? before : before.slice(lastEffectStart);
    return /queryCaseId\)\s*return;/.test(scoped) && /mounted[A-Za-z]*Ref\.current\s*===/.test(scoped);
  })(),
);

console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
