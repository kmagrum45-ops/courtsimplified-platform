/**
 * A guest's intake carries into their account only when they ask for it.
 *
 * What it checks (carryGuestIntake, the login page's only way to keep a guest
 * intake): the intake carries when "Sign in" was pressed from inside it in this
 * tab, the sign-in returns to that same intake and court, and less than 30
 * minutes have passed. It does not carry with no mark, to another flow or
 * court, after 30 minutes, or when the session already belongs to someone; the
 * mark is read once; and the carried intake is the account's, with the guest's
 * own review dropped (it is confirmed again on the account).
 *
 * Failure it exists to catch: both halves of the PR #463 re-test (2026-10-18)
 * — guests losing everything at sign-in, and, the other way round, the next
 * person at a shared computer signing in and receiving the last guest's story.
 *
 * Run: npm run test:guest-carry
 */
import assert from "node:assert/strict";
import { carryGuestIntake, GUEST_CARRY_MAX_AGE_MS, markGuestCarry } from "../../src/lib/case-system/guestCarry";
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

const s1 = storage(); markGuestCarry(s1, flow, now);
const carried = carryGuestIntake(s1, back, user, now + 60_000);
assert(carried, "a marked intake returning to itself carries");
assert.equal(carried.ownerId, user);
assert.equal(carried.checkpoint.sections.story.text, "Synthetic guest story");
assert.equal(carried.caseId, null);
assert.equal(carried.workflowStatus, undefined, "the guest's review is not proof on the account");
assert.equal(s1.data.has(GUEST_CARRY_KEY), false, "the mark is read once");
assert.equal(carryGuestIntake(s1, back, user, now + 60_000), null, "and cannot be used twice");

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
console.log("PASS guest carry: only the intake the guest chose, into the account they signed in to, once, within 30 minutes");
