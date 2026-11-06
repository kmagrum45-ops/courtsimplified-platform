/**
 * THE STORY READER NEVER TAKES A WITNESS OR BYSTANDER AS THE OTHER PARTY (Chrome check of #544, 6 Nov 2026, F2).
 *
 * Chrome, Small Claims: the story was "I hired a deck builder in March 2026 to build a deck at my home. They never
 * finished it and kept the money I paid. My neighbour remembers their teal-orange van." The case page's "What we have
 * so far" showed "The other party: Your neighbour (from your story)". The neighbour is a witness. Cause: the reader
 * of who the other side is to the person (storyFacts.ts otherSideIn, its ROLE words: landlord, employer, neighbour...)
 * took the first sentence naming one, whatever the person in it did.
 *
 * The rule checked (site owner, 6 Nov: "if the other party is not clear, leave it unset, never guess"): a sentence in
 * which that person only saw, heard, remembers or can confirm something is never read as naming the other party; the
 * story's own words for the side the person dealt with may still be offered (marked "from your story", never an
 * answer until the person gives it); a story that names no other side gives no line.
 *
 * WHAT FAILURE THIS CATCHES: a witness, neighbour or family member shown as the person the case is against.
 *
 * Run: npm run test:story-other-party
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

const DECK = "I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid. My neighbour remembers their teal-orange van.";
{
  const line = otherPartyLine(DECK);
  check("F2: Chrome's story: the neighbour who remembers the van is not the other party", !/neighbou?r/i.test(line?.value ?? ""), JSON.stringify(line));
  check("F2: Chrome's story: what is offered comes from the story's own words about the side the person dealt with, or nothing", line === null || /deck builder/i.test(line.value), JSON.stringify(line));
}
const WITNESSES = [
  "The store refused to refund my $900 laptop. My neighbour saw me bring it back the next day.",
  "My contractor's crew broke my window. My neighbour, Paul Brown, witnessed the damage.",
  "The seller never delivered the couch. My landlord can confirm nothing arrived.",
  "A moving company lost my boxes in May 2026. My partner was there when they loaded the truck.",
  "The garage overcharged me $1,200. My neighbour heard the mechanic promise a lower price.",
];
for (const story of WITNESSES) {
  const side = otherSideIn(story);
  const witnessWords = /neighbou?r|landlord|partner|Paul Brown/i;
  check(`a witness is not the other party: "${story.slice(0, 60)}..."`, !witnessWords.test(side?.value ?? "") && !witnessWords.test(otherPartyLine(story)?.value ?? ""), JSON.stringify({ side, line: otherPartyLine(story) }));
}
// The same words, as the other side: still read (the reader is not switched off).
const SIDES: [string, RegExp][] = [
  ["My neighbour's tree fell on my car in April 2026 and he refuses to pay for the repair.", /neighbou?r/i],
  ["My landlord kept my $1,500 deposit when I moved out.", /landlord/i],
  ["My former employer never paid my last two weeks of wages.", /employer/i],
];
for (const [story, side] of SIDES) check(`the other side named by who they are is still read: "${story.slice(0, 50)}..."`, side.test(otherSideIn(story)?.value ?? ""), JSON.stringify(otherSideIn(story)));
// No other side in the story: no line.
check("a story naming no other side gives no other party line", otherPartyLine("Something went wrong in March 2026 and I lost $500. My neighbour remembers it.") === null || !/neighbou?r/i.test(otherPartyLine("Something went wrong in March 2026 and I lost $500. My neighbour remembers it.")?.value ?? ""), JSON.stringify(otherPartyLine("Something went wrong in March 2026 and I lost $500. My neighbour remembers it.")));

console.log(failures ? `\n${failures} check(s) failed.` : "\nNo witness or bystander is read as the other party.");
process.exit(failures ? 1 : 0);
