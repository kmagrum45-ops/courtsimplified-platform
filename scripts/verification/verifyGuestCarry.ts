/**
 * A guest's intake carries into their account only when they ask for it.
 *
 * What it checks (carryGuestIntake, the login page's only way to keep a guest
 * intake): the intake carries when "Sign in" was pressed from inside it in this
 * tab, the sign-in returns to that same intake and court, and less than 30
 * minutes have passed. It does not carry with no mark, to another flow or
 * court, after 30 minutes, or when the session already belongs to someone; the
 * mark is read once; and the carried intake is the account's, with the guest's
 * own review dropped (it is confirmed again on the account). Every sign-in link
 * (signInAddress) marks the guest intake open in the tab and returns to it, also
 * from a page with no return address; the carried intake gets a new flow id and
 * no case id, so its first save creates a new case and never joins an older one.
 *
 * Failure it exists to catch: both halves of the PR #463 re-test (2026-10-18)
 * — guests losing everything at sign-in, and, the other way round, the next
 * person at a shared computer signing in and receiving the last guest's story.
 * And the 2026-10-19 re-test: the header "Sign in" skipped the carry, wiped the
 * intake and landed the person on My cases.
 *
 * Run: npm run test:guest-carry
 */
import assert from "node:assert/strict";
import { carryGuestIntake, GUEST_CARRY_MAX_AGE_MS, markGuestCarry, signInAddress } from "../../src/lib/case-system/guestCarry";
import { GUEST_CARRY_KEY, GUEST_INTAKE_SESSION_KEY } from "../../src/lib/case-system/storage/intakeStorageKeys";

const flow = "11111111-1111-4111-8111-111111111111";
const other = "33333333-3333-4333-8333-333333333333";
const user = "99999999-9999-4999-8999-999999999999";
const now = 1_800_000_000_000;
function storage(ownerId: string | null = null) {
  const data = new Map<string, string>([[GUEST_INTAKE_SESSION_KEY, JSON.stringify({ version: 2, ownerId, caseId: null, serverRevision: null, workflowStatus: { intakeCompleted: true },
    checkpoint: { version: 1, flowId: flow, courtPath: "family", revision: "22222222-2222-4222-8222-222222222222", sections: { story: { text: "Synthetic guest story" } } } })]]);
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}
const back = `/builder?path=family&intake=${flow}`;

const fresh = "55555555-5555-4555-8555-555555555555";

const s1 = storage(); markGuestCarry(s1, flow, now);
const result = carryGuestIntake(s1, `${back}&step=guided`, user, now + 60_000, fresh);
assert(result, "a marked intake returning to itself carries");
const carried = result.session;
assert.equal(carried.ownerId, user);
assert.equal(carried.checkpoint.sections.story.text, "Synthetic guest story");
assert.equal(carried.caseId, null, "no case id: the first save creates a new case");
assert.equal(carried.carried, true);
assert.equal(carried.checkpoint.flowId, fresh, "a new flow id, so it can never match an existing case's id");
assert.equal(result.destination, `/builder?path=family&intake=${fresh}&step=guided`, "the return address follows the new id");
assert.equal(carried.workflowStatus, undefined, "the guest's review is not proof on the account");
assert.equal(s1.data.has(GUEST_CARRY_KEY), false, "the mark is read once");
assert.equal(carryGuestIntake(s1, back, user, now + 60_000), null, "and cannot be used twice");
const s0 = storage(); markGuestCarry(s0, flow, now);
assert.equal(carryGuestIntake(s0, back, user, now, flow), null, "never kept under the guest's id");

assert.equal(carryGuestIntake(storage(), back, user, now), null, "no mark: a later person signing in gets nothing");
const s2 = storage(); markGuestCarry(s2, flow, now);
assert.equal(carryGuestIntake(s2, `/builder?path=family&intake=${other}`, user, now), null, "another flow");
const s3 = storage(); markGuestCarry(s3, flow, now);
assert.equal(carryGuestIntake(s3, `/builder?path=civil&intake=${flow}`, user, now), null, "another court");
const s4 = storage(); markGuestCarry(s4, flow, now);
assert.equal(carryGuestIntake(s4, back, user, now + GUEST_CARRY_MAX_AGE_MS + 1), null, "after 30 minutes");
const s5 = storage("44444444-4444-4444-8444-444444444444"); markGuestCarry(s5, flow, now);
assert.equal(carryGuestIntake(s5, back, user, now), null, "a session that already belongs to someone never moves to another account");
const s6 = storage(); markGuestCarry(s6, flow, now);
assert.equal(carryGuestIntake(s6, "/dashboard", user, now), null, "a sign-in that does not return to the intake");

// Every sign-in link: the guest intake open in the tab is marked and returned to.
const a1 = storage();
assert.equal(signInAddress(a1, "/builder", `?path=family&intake=${flow}&step=guided`, now), `/builder?path=family&intake=${flow}&step=guided`, "on the intake: back to it");
assert.equal(JSON.parse(a1.data.get(GUEST_CARRY_KEY)!).flowId, flow, "and it is marked");
const a2 = storage();
assert.equal(signInAddress(a2, "/", "", now), back, "from a page with no return address: back to the intake, not My cases");
assert(carryGuestIntake(a2, back, user, now + 1000, fresh), "and it carries");
const signedIn = storage(user);
assert.equal(signInAddress(signedIn, "/", "", now), null, "an account's session is not a guest intake");
assert.equal(signedIn.data.has(GUEST_CARRY_KEY), false);
const empty = storage(); empty.data.set(GUEST_INTAKE_SESSION_KEY, JSON.stringify({ ...JSON.parse(empty.data.get(GUEST_INTAKE_SESSION_KEY)!), checkpoint: { version: 1, flowId: flow, courtPath: "family", revision: "22222222-2222-4222-8222-222222222222", sections: {} } }));
assert.equal(signInAddress(empty, "/", "", now), null, "an intake with nothing entered is not brought back from elsewhere");
const none = storage(); none.data.clear();
assert.equal(signInAddress(none, "/about", "", now), null, "no guest intake: the login page's own default");
console.log("PASS guest carry: every sign-in link brings only the open guest intake, into a new case on the account signed in to, once, within 30 minutes");
