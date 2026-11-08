/**
 * THE STORY READER READS A FRIEND OR RELATIVE AS THE OTHER PARTY ONLY WHEN THE STORY TIES THEM TO WHAT IS OWED, AND
 * NEVER A WITNESS (Chrome check of #544 on 9b960f7, 8 Nov 2026, F14).
 *
 * Chrome, Small Claims: the story "In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised to
 * repay me by June 2026 but has not paid anything back." gave no "The other party" line on the case page until the name
 * was typed. Cause: the reader of who the other side is to the person (storyFacts.ts otherSideIn) knew only a fixed
 * list of roles (landlord, employer, roommate, contractor...); "friend" and relatives were not on it.
 *
 * The rule checked (site owner, 6 and 8 Nov: never take a witness or bystander as the other party; unclear is left
 * unset): a friend, relative or acquaintance is read as the other party only in a sentence that ties them to the money
 * or thing owed (the person lent, gave, paid or sold to them, or they owe, borrowed, kept, never paid or refuse to pay),
 * never in a sentence where they only saw, heard, were there or can confirm, and never only because they were present.
 * The other readings (a business, a role such as landlord or roommate) are unchanged.
 *
 * WHAT FAILURE THIS CATCHES: the other party left out of a plain loan-to-a-friend story, or a witness, relative or
 * companion shown as the person the case is against.
 *
 * Run: npm run test:story-other-party-relations
 */
import { otherSideIn } from "../../src/lib/case-system/caseFile/storyFacts";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const otherPartyLine = (story: string) => storyLines(story, emptyCaseFile(), false).find((line) => line.fact === "otherParty") ?? null;

// The other party, named in the story: read, by name where the story gives one.
const READ: [string, RegExp][] = [
  ["In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised to repay me by June 2026 but has not paid anything back.", /Alex Testwood/],
  ["My roommate, Jamie Testlee, moved out in May 2026 and never paid her share of the rent, $1,200.", /roommate/i],
  ["My landlord kept my $1,500 deposit when I moved out in April 2026.", /landlord/i],
  ["I paid Northern Testroofing Inc. $6,000 to fix my roof in May 2026 and they never came back.", /Northern Testroofing Inc/],
  ["Brightway Testrenovations Ltd. took a $3,000 deposit for my kitchen and stopped answering my calls.", /Brightway Testrenovations Ltd/],
  ["I loaned my brother Sam Testman $2,000 in January 2026 and he refuses to pay me back.", /Sam Testman/],
  ["My cousin Dana Testfield borrowed $800 from me in February 2026 and never returned it.", /Dana Testfield/],
];
for (const [story, side] of READ) {
  const read = otherSideIn(story);
  check(`the other party is read: "${story.slice(0, 64)}..."`, side.test(read?.value ?? "") && side.test(otherPartyLine(story)?.value ?? ""), JSON.stringify({ read, line: otherPartyLine(story) }));
}

// A witness, bystander or companion: never the other party.
const NOT_READ: [string, RegExp][] = [
  ["The store refused to refund my $900 laptop. My friend Chris Testor saw me return it the next day.", /Chris|friend/i],
  ["A contractor never finished my fence in June 2026. My neighbour Pat Testly watched them leave the job.", /Pat|neighbou?r/i],
  ["The garage overcharged me $1,200 in May 2026. My sister heard the mechanic quote a lower price.", /sister/i],
  ["I was hit by a cyclist in May 2026. My friend Morgan Testa was with me and saw everything.", /Morgan|friend/i],
  ["A moving company broke my table in April 2026. My uncle, Lee Testwell, was there and can confirm the damage.", /Lee|uncle/i],
  ["I went to the shop with my friend Robin Testing and the clerk sold me a broken phone for $400.", /Robin|friend/i],
  ["My friend Alex Testwood told me Quickcar Testmotors often refuses refunds. Quickcar Testmotors kept my $2,000 deposit.", /Alex|friend/i],
];
for (const [story, witness] of NOT_READ) {
  const read = otherSideIn(story);
  const line = otherPartyLine(story);
  check(`a witness or companion is not the other party: "${story.slice(0, 64)}..."`, !witness.test(read?.value ?? "") && !witness.test(line?.value ?? ""), JSON.stringify({ read, line }));
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nA friend or relative is read only when the story ties them to what is owed; no witness is read.");
process.exit(failures ? 1 : 0);
