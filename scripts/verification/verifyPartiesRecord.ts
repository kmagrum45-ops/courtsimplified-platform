/**
 * THE PARTIES ARE ONE RECORD, READ ONE WAY (site owner, 14 Nov 2026, rules 1 and 2; Chrome forms test on #550: Form 7A
 * said "Plaintiff name not entered" and "Defendant name not entered", the site never asked the person's name, address,
 * phone or email or the defendant's address, details typed in the story became numbered facts, and a second defendant
 * was merged into the first: "Circle K Convenience Stores Ltd. (Test Manager)").
 *
 * What it asserts, with no browser, model or database:
 *   1. the record's shape is checked: a well-formed record reads back as written; a malformed or oversized one is
 *      refused (nothing half-read);
 *   2. caseFileOf reads the parties from the case record (sections.caseFile.parties): the person and every other party,
 *      each separate, in order; the other party's name (the otherParty fact every screen reads) is the first other
 *      party's own name, never two names merged into one;
 *   3. an older case with no parties record still opens and reads its parties from what it holds (the other party's
 *      name, and the person's own details from the whole Small Claims form); nothing is written back;
 *   4. a detail marked "I'm not sure" is settled: never asked again; a detail given is known; only the rest is asked,
 *      and the optional ones (the other side's phone, email and representative) are never asked, only accepted;
 *   5. the details Chrome typed in its story are read as offers, once each, for the right party: the person's name,
 *      street, city, province, postal code, phone and email; Circle K as a company with its address; Test Manager as a
 *      second, separate person at the same address; nothing is offered twice or after a No, or for a detail already
 *      held;
 *   6. a sentence that only gives party details is not one of the story's facts (it is offered, not numbered).
 *
 * WHAT FAILURE THIS CATCHES: a second copy of a party, a merged party, a detail asked after "I'm not sure", or a party
 * detail left in the story's facts.
 *
 * Run: npm run test:parties-record
 */
import assert from "node:assert/strict";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { readParties, detailStatus, detailsToAsk, partyName, storyPartyOffers, storyWithoutPartyDetails, type PartiesRecord } from "../../src/lib/case-system/parties/parties";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ID = "00000000-0000-4000-8000-000000000611";
const checkpoint = (sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: "Synthetic story." }, ...sections } as never });
const BRINGING = { situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } } };

/** Chrome's forms test story (#550, 14 Nov), the two sentences it added word for word. */
export const CHROME_FORMS_STORY =
  "On October 4, 2026 I slipped on a wet floor at the Circle K on Sample Road in Ottawa and fell. I want to claim $5,000 for pain and suffering, $450 in lost wages and $18.45 for medicine. " +
  "My name is Test Plaintiff, 12 Example Street, Ottawa ON K1A 0A1, phone 613-555-0100, email test.plaintiff@example.com. " +
  "I am suing Circle K Convenience Stores Ltd., 100 Sample Road, Ottawa ON K1B 0B1, and also the store manager, Test Manager, at the same address.";

const RECORD: PartiesRecord = {
  version: 1,
  declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Plaintiff", street: "12 Example Street", city: "Ottawa", province: "ON", postalCode: "K1A 0A1", phone: "613-555-0100", email: "test.plaintiff@example.com" }, unsure: [] },
    { id: "p-circlek", side: "other", kind: "company", details: { companyName: "Circle K Convenience Stores Ltd.", street: "100 Sample Road", city: "Ottawa", province: "ON", postalCode: "K1B 0B1" }, unsure: [] },
    { id: "p-manager", side: "other", kind: "person", details: { firstName: "Test", lastName: "Manager", street: "100 Sample Road", city: "Ottawa", province: "ON", postalCode: "K1B 0B1" }, unsure: ["phone"] },
  ],
};

let failed = 0;
const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };

check("1. a well-formed record reads back as written; malformed or oversized ones are refused", () => {
  assert.deepEqual(readParties(JSON.parse(JSON.stringify(RECORD))), RECORD);
  assert.equal(readParties({ version: 1, list: [{ id: "x", side: "nowhere", details: {}, unsure: [] }], declined: [] }), null, "a party on no side was read");
  assert.equal(readParties({ version: 1, list: [{ id: "x", side: "other", details: { street: "x".repeat(5_000) }, unsure: [] }], declined: [] }), null, "an oversized detail was read");
  assert.equal(readParties({ version: 1, list: Array.from({ length: 41 }, (_, i) => ({ id: `p${i}`, side: "other", details: {}, unsure: [] })), declined: [] }), null, "41 parties were read");
  assert.equal(readParties({ version: 1, list: [{ id: "x", side: "other", details: { nickname: "y" }, unsure: [] }], declined: [] }), null, "an unknown detail was read");
  assert.equal(readParties("nothing"), null);
});

check("2. caseFileOf reads every party from the record, each separate; the other party is the first one's own name", () => {
  const file = caseFileOf(checkpoint({ ...BRINGING, caseFile: { parties: RECORD } }));
  assert.equal(file.parties.recorded, true);
  assert.deepEqual(file.parties.list.map((party) => partyName(party)), ["Test Plaintiff", "Circle K Convenience Stores Ltd.", "Test Manager"]);
  assert.equal(file.otherParty.state, "answered");
  assert.equal(file.otherParty.value, "Circle K Convenience Stores Ltd.", `other party: ${JSON.stringify(file.otherParty.value)}`);
  assert.ok(!/\(Test Manager\)/.test(String(file.otherParty.value)), "the second defendant was merged into the first");
});

check("3. an older case with no parties record opens and reads its parties from what it holds; nothing written back", () => {
  const sections = { ...BRINGING, "small-claims": { input: { yourName: "Old Person", yourAddress: "5 Old Lane", yourCity: "Kingston", yourEmail: "old@example.com", defendantAddress: "9 Shop Road, Kingston ON K7L 1A1", otherParty: "Oldshop Inc." } } };
  const before = JSON.stringify(sections);
  const file = caseFileOf(checkpoint(sections));
  assert.equal(JSON.stringify(sections), before, "the saved case was changed while read");
  assert.equal(file.parties.recorded, false);
  const you = file.parties.list.find((party) => party.you);
  assert.ok(you, "the person is not among the parties");
  assert.equal(you!.details.fullName, "Old Person");
  assert.equal(you!.details.street, "5 Old Lane");
  assert.equal(you!.details.city, "Kingston");
  assert.equal(you!.details.email, "old@example.com");
  const other = file.parties.list.find((party) => party.side === "other");
  assert.ok(other, "the other party is not among the parties");
  assert.equal(partyName(other!), "Oldshop Inc.");
  assert.equal(other!.kind, "company");
  assert.equal(other!.details.street, "9 Shop Road, Kingston ON K7L 1A1", "an address given whole is kept whole, as given");
});

check("4. \"I'm not sure\" is settled and never asked; a given detail is known; optional details are never asked", () => {
  const manager = RECORD.list[2];
  assert.equal(detailStatus(manager, "phone"), "settled");
  assert.equal(detailStatus(manager, "street"), "known");
  assert.equal(detailStatus(manager, "email"), "ask");
  const asked = detailsToAsk(manager);
  assert.ok(!asked.includes("phone") && !asked.includes("email") && !asked.some((detail) => detail.startsWith("rep")), `optional details asked of the other side: ${asked.join(", ")}`);
  const you = { ...RECORD.list[0], details: { firstName: "Test" }, unsure: ["email" as const] };
  const askedOfYou = detailsToAsk(you);
  assert.ok(askedOfYou.includes("lastName") && askedOfYou.includes("street") && askedOfYou.includes("phone"), `not asked: ${askedOfYou.join(", ")}`);
  assert.ok(!askedOfYou.includes("firstName") && !askedOfYou.includes("email"), `asked again: ${askedOfYou.join(", ")}`);
});

check("5. Chrome's story: each party detail is offered once, for the right party; Test Manager is a second party", () => {
  const offers = storyPartyOffers(CHROME_FORMS_STORY, { version: 1, list: [], declined: [] });
  const of = (who: string) => offers.filter((offer) => offer.party === who).map((offer) => `${offer.detail}=${offer.value}`).sort();
  assert.deepEqual(of("you"), ["city=Ottawa", "email=test.plaintiff@example.com", "fullName=Test Plaintiff", "phone=613-555-0100", "postalCode=K1A 0A1", "province=ON", "street=12 Example Street"].sort());
  assert.deepEqual(of("other:1"), ["city=Ottawa", "companyName=Circle K Convenience Stores Ltd.", "postalCode=K1B 0B1", "province=ON", "street=100 Sample Road"].sort());
  assert.deepEqual(of("other:2"), ["city=Ottawa", "fullName=Test Manager", "postalCode=K1B 0B1", "province=ON", "street=100 Sample Road"].sort());
  assert.equal(new Set(offers.map((offer) => offer.key)).size, offers.length, "an offer is made twice");
  for (const offer of offers) assert.ok(CHROME_FORMS_STORY.includes(offer.quote), `the quote is not the story's words: ${offer.quote}`);
  // Declined, or already held: not offered again.
  const declined = storyPartyOffers(CHROME_FORMS_STORY, { version: 1, list: [], declined: [offers[0].key] });
  assert.ok(!declined.some((offer) => offer.key === offers[0].key), "offered again after No");
  const held = storyPartyOffers(CHROME_FORMS_STORY, RECORD);
  assert.deepEqual(held, [], `offered though held: ${held.map((offer) => offer.key).join(", ")}`);
});

check("6. a sentence that only gives party details is not one of the story's facts", () => {
  const facts = storyWithoutPartyDetails(CHROME_FORMS_STORY);
  assert.ok(!/My name is|613-555-0100|test\.plaintiff@example\.com|I am suing/.test(facts), `party details left in the facts: ${facts}`);
  assert.ok(/slipped on a wet floor/.test(facts) && /\$450 in lost wages/.test(facts), `the story's own facts were lost: ${facts}`);
});

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nAll checks passed");
