/**
 * THE FOUR DRAFTS READ THE PARTIES AND FACTS FROM THE CASE RECORD (site owner, 14 Nov 2026, rules 7 and 8; Chrome forms
 * test on #550, rows 5 and 11 to 13: the Plaintiff's Claim draft said "Plaintiff name not entered" and "Defendant name
 * not entered" and listed the site's questions as numbered facts; "Your story" held the site's questions; the affidavit
 * outline and the chronology said nothing was recorded, though October 4, 2026 was confirmed).
 *
 * The drafts as the Drafts tab makes them (drafts/recordDrafts.ts draftsOfRecord), from Chrome's story as the case
 * record holds it: the parties saved in the Parties step, the home page's questions recorded as asked, the amount, the
 * date and what the person wants. What it asserts, with no browser, model or database:
 *   1. the Plaintiff's Claim draft names every party from the record, each its own line, and says "not entered" for
 *      nothing the person gave; a second defendant is never merged into the first ("(Test Manager)");
 *   2. no draft holds one of the site's questions, a sentence that only gives party details, or an analysis note;
 *   3. no draft cuts the person's story into numbered sentences ("1. October 4, 2026");
 *   4. "Your story" lists who is involved from the record, the date the record holds and what the person wants;
 *   5. the affidavit outline says who the person is (their name and address from the record) and what happened in their
 *      own words, not "Nothing is recorded";
 *   6. the chronology holds the date the record holds (October 4, 2026), even with an empty Timeline tab;
 *   7. the amounts: $5,468.45, and $5,000, $450 and $18.45, the same in every draft that shows them.
 *
 * WHAT FAILURE THIS CATCHES: a draft built from its own copy of the answers instead of the case record.
 *
 * Run: npm run test:drafts-from-record
 */
import assert from "node:assert/strict";
import { draftsOfRecord } from "../../src/lib/case-system/drafts/recordDrafts";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import type { CaseDraft } from "../../src/lib/case-system/drafts/caseDrafts";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import type { PartiesRecord } from "../../src/lib/case-system/parties/parties";

const ID = "00000000-0000-4000-8000-000000000614";
const NOW = new Date("2026-11-14T12:00:00Z");
const STORY =
  "On October 4, 2026 I slipped on a wet floor at the Circle K on Sample Road in Ottawa and fell. I want to claim $5,000 for pain and suffering, $450 in lost wages and $18.45 for medicine.\n\n" +
  "What injuries did the fall cause? A bruised hip and a sore back.\n\n" +
  "Do you know what caused the floor to be wet? Water leaking from under the milk fridge.\n\n" +
  "My name is Test Plaintiff, 12 Example Street, Ottawa ON K1A 0A1, phone 613-555-0100, email test.plaintiff@example.com. " +
  "I am suing Circle K Convenience Stores Ltd., 100 Sample Road, Ottawa ON K1B 0B1, and also the store manager, Test Manager, at the same address.";
const ASKED = ["What injuries did the fall cause?", "Do you know what caused the floor to be wet?"];
const PARTIES: PartiesRecord = {
  version: 1, declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Plaintiff", street: "12 Example Street", city: "Ottawa", province: "ON", postalCode: "K1A 0A1", phone: "613-555-0100", email: "test.plaintiff@example.com" }, unsure: [] },
    { id: "d1", side: "other", kind: "company", details: { companyName: "Circle K Convenience Stores Ltd.", street: "100 Sample Road", city: "Ottawa", province: "ON", postalCode: "K1B 0B1" }, unsure: [] },
    { id: "d2", side: "other", kind: "person", details: { firstName: "Test", lastName: "Manager", street: "100 Sample Road", city: "Ottawa", province: "ON", postalCode: "K1B 0B1" }, unsure: [] },
  ],
};
const checkpoint: Checkpoint = {
  version: 1, flowId: ID, courtPath: "small-claims", revision: ID,
  sections: {
    situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } },
    story: { text: STORY },
    home: { understoodAnswers: ASKED.map((question) => ({ question, answer: "(answered)" })) },
    "small-claims": { input: { amountClaimed: "5468.45", whenHappened: "October 4, 2026", goal: "Payment of $5,000 for pain and suffering, $450 for lost wages and $18.45 for medicine." } },
    caseFile: { parties: PARTIES },
  } as never,
};
// What the old saved intake held (the drafts must not read it for parties or facts): Chrome's case, as saved.
const OLD_INTAKE = { facts: STORY, yourName: "", otherParty: "Circle K Convenience Stores Ltd. (Test Manager)", evidence: "" };

const text = (draft: CaseDraft) => draft.sections.map((part) => `${part.heading}\n${part.text}`).join("\n\n");
const part = (draft: CaseDraft, heading: RegExp) => draft.sections.find((item) => heading.test(item.heading))?.text ?? "";

let failed = 0;
const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };

const drafts = draftsOfRecord(formContextOf(checkpoint), { timeline: [], intake: OLD_INTAKE, now: NOW });
const all = [drafts.claim, drafts.story, drafts.affidavit, drafts.chronology] as const;

check("1. the Plaintiff's Claim draft names every party from the record, each its own line; nothing given says 'not entered'", () => {
  const parties = part(drafts.claim, /Parties/);
  for (const name of ["Test Plaintiff", "12 Example Street", "Circle K Convenience Stores Ltd.", "100 Sample Road", "Test Manager"]) assert.ok(parties.includes(name), `${name} is not in the parties: ${parties}`);
  assert.ok(!/not entered/i.test(text(drafts.claim)), `"not entered" in: ${text(drafts.claim).split("\n").find((line) => /not entered/i.test(line))}`);
  assert.ok(!/\(Test Manager\)/.test(text(drafts.claim)), "the second defendant is merged into the first");
  const lines = parties.split("\n");
  assert.ok(lines.some((line) => /Circle K/.test(line) && !/Test Manager/.test(line)) && lines.some((line) => /Test Manager/.test(line) && !/Circle K/.test(line)), `the two defendants share a line: ${parties}`);
});
check("2. no draft holds a site question, a party-detail sentence or an analysis note", () => {
  for (const draft of all) {
    const words = text(draft);
    for (const question of ASKED) assert.ok(!words.includes(question), `${draft.title}: "${question}"`);
    assert.ok(!/My name is|I am suing|appears to involve|Amount was captured/.test(words), `${draft.title}: ${words.split("\n").find((line) => /My name is|I am suing|appears to involve|Amount was captured/.test(line))}`);
  }
});
check("3. no draft cuts the story into numbered sentences", () => {
  for (const draft of [drafts.claim, drafts.story]) {
    const numbered = text(draft).split("\n").filter((line) => /^\d+\.\s/.test(line.trim()));
    assert.deepEqual(numbered, [], `${draft.title}: ${numbered.join(" | ")}`);
  }
});
check("4. 'Your story': who is involved, the date and what the person wants, from the record", () => {
  const who = part(drafts.story, /Who is involved/);
  for (const name of ["Test Plaintiff", "Circle K Convenience Stores Ltd.", "Test Manager"]) assert.ok(who.includes(name), `${name} missing: ${who}`);
  assert.ok(part(drafts.story, /When/).includes("October 4, 2026"), `when: ${part(drafts.story, /When/)}`);
  assert.ok(/\$5,000.*\$450.*\$18\.45/.test(part(drafts.story, /What you want/)), `wants: ${part(drafts.story, /What you want/)}`);
  assert.ok(part(drafts.story, /What happened/).includes("A bruised hip and a sore back."), "the person's answer is lost");
});
check("5. the affidavit outline says who the person is and what happened, in their words", () => {
  assert.ok(/Test Plaintiff/.test(part(drafts.affidavit, /About you/)) && /12 Example Street/.test(part(drafts.affidavit, /About you/)), `about you: ${part(drafts.affidavit, /About you/)}`);
  const happened = part(drafts.affidavit, /What happened/);
  assert.ok(!/Nothing is recorded/.test(happened) && /slipped on a wet floor/.test(happened), `what happened: ${happened}`);
});
check("6. the chronology holds the date the record holds, with an empty Timeline tab", () => {
  assert.ok(text(drafts.chronology).includes("October 4, 2026"), text(drafts.chronology));
  assert.ok(!/Nothing is recorded on your timeline yet/.test(text(drafts.chronology)), "said nothing is recorded");
});
check("7. the amounts are the same in every draft that shows them", () => {
  assert.ok(text(drafts.claim).includes("$5,468.45"), "the total is not in the claim draft");
  for (const draft of [drafts.claim, drafts.story]) for (const amount of ["$5,000", "$450", "$18.45"]) assert.ok(text(draft).includes(amount), `${draft.title} lacks ${amount}`);
  for (const draft of all) assert.ok(!/\$5,468\.4(?!5)|\$5468|\$18\.4(?!5)/.test(text(draft)), `${draft.title} shows an amount another way`);
});

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nAll checks passed");
