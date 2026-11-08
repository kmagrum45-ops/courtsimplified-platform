/**
 * THE OTHER PARTY THE ACCEPTED STORY READING NAMES GOES ON THE RECORD, NEVER A WITNESS (Chrome check of production
 * c38e69fd, 8 Nov 2026, B1).
 *
 * Chrome: "Here is what we understood" named Alex Testwood (Small Claims, "my friend Alex Testwood"), Dana Testwood
 * (Civil, "my former business partner, Dana Testwood") and Jordan Testfield (Family, "Jordan Testfield and I lived
 * together"); the person accepted the reading; the case record never got the other party, so Small Claims never had it
 * and Civil and Family asked for it again. Cause: nothing carried the reading's other party to the record; the home page
 * wrote only the story and the city (HomeLocationGate.tsx goToIntake).
 *
 * What it checks:
 *   1. understoodOtherParty.ts reads the name from the reading in Chrome's three stories, and in the F14 stories where a
 *      name is given, and never a witness's, a companion's or one the person did not write, even when the reading
 *      wrongly labels them the other party;
 *   2. the record: a name written to home.otherParty is the case file's other party (caseFileOf), it is mapped for the
 *      one writer (fieldFacts.ts), and a later answer from a form wins (newest answer wins);
 *   3. the home page writes it only when the reading is accepted, through the one writer (writeAnswer).
 *
 * WHAT FAILURE THIS CATCHES: the other party the person saw and accepted lost, asked again, or a witness put there.
 *
 * Run: npm run test:understood-other-party
 */
import fs from "node:fs";
import { otherPartyFromUnderstanding } from "../../src/lib/case-system/caseFile/understoodOtherParty";
import { caseFileOf, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { fieldRow } from "../../src/lib/case-system/caseFile/fieldFacts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const reading = (label: string, value: string) => [{ label: "Your side", value: "Bringing the claim" }, { label, value }];

// 1. Read from the reading, where the story names them and ties them to the case.
const READ: [string, string, string, string][] = [
  ["Small Claims (Chrome)", "Synthetic: In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised to repay me by June 1, 2026 but has not paid anything back.", "Other party", "Alex Testwood, your friend and the borrower"],
  ["Civil (Chrome)", "Synthetic: In June 2025 I lent my former business partner, Dana Testwood, $85,000 by e-transfer to buy equipment. She signed a one-page note promising to repay it by March 1, 2026.", "Other party", "Dana Testwood"],
  ["Family (Chrome)", "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me.", "Other parent", "Jordan Testfield"],
  ["roommate", "My roommate, Jamie Testlee, moved out in May 2026 and never paid her share of the rent, $1,200.", "Other party", "Jamie Testlee, your former roommate"],
  ["Inc.", "I paid Northern Testroofing Inc. $6,000 to fix my roof in May 2026 and they never came back.", "Other party", "Northern Testroofing Inc."],
  ["Ltd.", "Brightway Testrenovations Ltd. took a $3,000 deposit for my kitchen and stopped answering my calls.", "Other side", "Brightway Testrenovations Ltd."],
  ["brother", "I loaned my brother Sam Testman $2,000 in January 2026 and he refuses to pay me back.", "Borrower", "Sam Testman (your brother)"],
  ["cousin", "My cousin Dana Testfield borrowed $800 from me in February 2026 and never returned it.", "Other party", "Dana Testfield"],
];
for (const [name, story, label, value] of READ) {
  const expected = /([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+)+(?:\s+(?:Inc|Ltd)\.?)?)/.exec(value)![1];
  check(`read: ${name}`, otherPartyFromUnderstanding(reading(label, value), story) === expected, String(otherPartyFromUnderstanding(reading(label, value), story)));
}
// No name in the story: nothing read (the questions ask once).
check("read: a role with no name gives nothing", otherPartyFromUnderstanding(reading("Other party", "Your landlord"), "My landlord kept my $1,500 deposit when I moved out in April 2026.") === null);

// Never a witness, a companion, or a name the person did not write, even when the reading labels them the other party.
const NEVER: [string, string, string][] = [
  ["a friend who saw", "The store refused to refund my $900 laptop. My friend Chris Testor saw me return it the next day.", "Chris Testor"],
  ["a neighbour who watched", "A contractor never finished my fence in June 2026. My neighbour Pat Testly watched them leave the job.", "Pat Testly"],
  ["a sister who heard", "The garage overcharged me $1,200 in May 2026. My sister Kim Testa heard the mechanic quote a lower price.", "Kim Testa"],
  ["a friend who was there", "I was hit by a cyclist in May 2026. My friend Morgan Testa was with me and saw everything.", "Morgan Testa"],
  ["an uncle who can confirm", "A moving company broke my table in April 2026. My uncle, Lee Testwell, was there and can confirm the damage.", "Lee Testwell"],
  ["a friend gone shopping with", "I went to the shop with my friend Robin Testing and the clerk sold me a broken phone for $400.", "Robin Testing"],
  ["a friend who passed something on", "My friend Alex Testwood told me Quickcar Testmotors often refuses refunds. Quickcar Testmotors kept my $2,000 deposit.", "Alex Testwood"],
  ["a name not in the story", "I lent my friend $4,500 in March 2026 and he has not paid it back.", "Alex Testwood"],
];
for (const [name, story, witness] of NEVER) check(`never: ${name}`, otherPartyFromUnderstanding(reading("Other party", witness), story) === null, String(otherPartyFromUnderstanding(reading("Other party", witness), story)));
// A line not about the other side is not read.
check("never: a name on a line not about the other side", otherPartyFromUnderstanding(reading("Witness", "Pat Testly"), "A contractor never finished my fence. Pat Testly, my neighbour, saw it.") === null);

// 2. The record.
check("home.otherParty is mapped for the one writer (fieldFacts.ts)", Boolean(fieldRow("home", "otherParty")));
const checkpoint = (sections: Record<string, unknown>) => ({ version: 1 as const, flowId: "f", courtPath: "small-claims", revision: "r", sections });
const fromHome = caseFileOf(checkpoint({ home: { otherParty: "Alex Testwood" } }) as never);
check("the case file holds the name written to home.otherParty", fromHome.otherParty.state === "answered" && slotText(fromHome.otherParty, (iso) => iso) === "Alex Testwood", JSON.stringify(fromHome.otherParty));
const changed = caseFileOf(checkpoint({ home: { otherParty: "Alex Testwood" }, caseFile: { changes: { otherParty: { state: "answered", value: "Alexandra Testwood", at: "2026-11-08T12:00:00.000Z", seq: 1 } } } }) as never);
check("a later change of the name wins (newest answer wins)", slotText(changed.otherParty, (iso) => iso) === "Alexandra Testwood", JSON.stringify(changed.otherParty));

// 3. The home page writes it only when the reading is accepted, through the one writer.
const gate = fs.readFileSync("app/_components/HomeLocationGate.tsx", "utf8");
check("the home page writes the reading's other party through writeAnswer(recovery, \"home\", \"otherParty\", ...)", /writeAnswer\(recovery, "home", "otherParty", /.test(gate));
check("only when the reading was accepted (the card's own buttons)", /otherPartyFromUnderstanding\(/.test(gate) && /accepted/.test(gate));

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe accepted reading's other party goes on the record; no witness does.");
process.exit(failures ? 1 : 0);
