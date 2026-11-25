/**
 * EVERY OFFER OF THE AMOUNT AND THE OTHER PARTY READS THE ONE OFFER READER, WHICH READS WHAT THE STORY READING SHOWED
 * (site owner, 16 Nov 2026; Chrome milestone test of #550, rows 8, 30, 33).
 *
 * Chrome: the story reading showed "$5,468.45" (S1), "REPLACEMENT QUOTE $1,500" (S4) and "Your friend Alex" (S5); the
 * review's "What is the total dollar amount you are claiming?" was an empty box with no offer (S1, S4) and Defendant 1's
 * first name in the Parties step was empty with no offer (S5). Cause: three readers, none reading the story reading.
 *
 * What it checks:
 *   1. S1, S4, S5 through the real functions: the review's amount suggestion (suggestInitialAnswers), the stated amount
 *      (statedInStory) and the Parties step's offers (storyPartyOffers) offer $5,468.45 (the reading's total, the sum of
 *      the amounts the story writes), $1,500 (the quote), and "Alex" as Defendant 1's first name, each once;
 *   2. never invented: a reading's amount the story does not write, or a name it does not write, is not offered, and a
 *      witness is never the other party;
 *   3. one source: the amount and other-party readers are called for an offer only from caseFile/storyOffers.ts (every
 *      other call is listed below with why), so a new offer cannot read its own copy.
 *
 * What failure it catches: an offer built from a different reader than the one the person was shown, so the review
 * asks for what the reading already gave.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { statedInStory, suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";
import { storyPartyOffers, type PartiesRecord } from "../../src/lib/case-system/parties/parties";
import { offeredAmount, offeredOtherParty, readingFactsOf, type ReadingFact } from "../../src/lib/case-system/caseFile/storyOffers";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { missingFacts } from "../../src/lib/case-system/caseFile/missingFacts";
import { emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

const S1 = "Synthetic: On October 4, 2026 I slipped on a wet floor at the Circle K on Sample Road in Ottawa and fell. I missed 3 days of work at $150 a day, $450 in all, and paid $18.45 for medicine. I want $5,000 for pain and suffering.";
const S1_READING: ReadingFact[] = [{ label: "Lost wages", value: "3 days at $150 per day, totalling $450" }, { label: "Amount sought", value: "$5,468.45 total, including $5,000 for pain and suffering" }];
const S4 = "Synthetic: On October 4, 2026 my neighbour cut down my tree on my side of the line. I want the tree replaced and I got a quote for $1500.";
const S4_READING: ReadingFact[] = [{ label: "Replacement quote", value: "$1,500" }];
const S5 = "Synthetic: In March 2026 I lent my friend Alex $3,000. He promised to pay me back by June 1, 2026 and has not paid anything.";
const S5_READING: ReadingFact[] = [{ label: "Other party", value: "Your friend Alex" }, { label: "Amount", value: "$3,000" }];

const checkpoint = (story: string, reading: ReadingFact[]): Checkpoint => ({
  version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000002",
  sections: { story: { text: story }, home: { readFrom: story, understood: { understanding: { facts: reading } } } },
} as unknown as Checkpoint);

// 1.
check("S1: the review offers the reading's total, $5,468.45 (the sum of the amounts the story writes)", suggestInitialAnswers(checkpoint(S1, S1_READING))["sc-amount-claimed"] === "$5,468.45", suggestInitialAnswers(checkpoint(S1, S1_READING))["sc-amount-claimed"]);
check("S1: the stated amount is the same one", statedInStory(S1, S1_READING).amount === "5468.45", statedInStory(S1, S1_READING).amount);
check("S4: the review offers the quote, $1,500", suggestInitialAnswers(checkpoint(S4, S4_READING))["sc-amount-claimed"] === "$1,500", suggestInitialAnswers(checkpoint(S4, S4_READING))["sc-amount-claimed"]);
check("S4: with no saved reading the story's own quote is offered, the same $1,500", suggestInitialAnswers(checkpoint(S4, []))["sc-amount-claimed"] === "$1,500");
// #471 re-test: an amount already paid is never offered in one click in the review (the full local run of 3774a858:
// "I paid a contractor $9,000" was offered as "Yes: $9,000"); the chat and the form still offer what the story states.
const PAID = "Synthetic story: I paid a contractor $9,000 on May 12, 2026 to fix my roof and he never came back.";
check("#471: the review never offers an amount already paid in one click", suggestInitialAnswers(checkpoint(PAID, []))["sc-amount-claimed"] === undefined, suggestInitialAnswers(checkpoint(PAID, []))["sc-amount-claimed"]);
// A quote is offered in one click only when it is the story's only amount (S4); one among others may be for something else
// (the full local run of 4d1ae680, story pack m01-kitchen: "someone else who quoted $6,300 to finish" was offered as the
// claim, which the story puts at $10,700 or more). From the story's own reader and from a reading that names it.
const M01 = "Synthetic: I hired a renovation company in March 2026 to redo my kitchen for $24,000. I paid $18,000. They stopped coming in June 2026. I had to hire someone else who quoted $6,300 to finish. I also paid $2,000 for tile. I want my money back for what was not done but I'm not sure if it is $10,700 or more.";
for (const reading of [[], [{ label: "Quote to finish", value: "$6,300" }]] as ReadingFact[][]) {
  const offered = suggestInitialAnswers(checkpoint(M01, reading))["sc-amount-claimed"];
  check(`m01: one quote among several amounts is never offered in one click (${reading.length ? "a reading names it" : "no reading"})`, offered !== "$6,300", String(offered));
}
check("S5: the review offers $3,000", suggestInitialAnswers(checkpoint(S5, S5_READING))["sc-amount-claimed"] === "$3,000");
const empty: PartiesRecord = { version: 1, list: [{ id: "you", you: true, side: "yours", details: {}, unsure: [] }, { id: "o1", side: "other", details: {}, unsure: [] }], declined: [] };
const alex = storyPartyOffers(S5, empty, offeredOtherParty(S5, S5_READING));
check("S5: the Parties step offers Alex as Defendant 1's first name, once", alex.filter((offer) => offer.party === "other:1" && offer.detail === "firstName" && offer.value === "Alex").length === 1 && alex.filter((offer) => offer.value === "Alex").length === 1, JSON.stringify(alex));
check("S5: after No, Alex is not offered again", storyPartyOffers(S5, { ...empty, declined: alex.map((offer) => offer.key) }, offeredOtherParty(S5, S5_READING)).length === 0);
check("S5: once held, Alex is not offered again", storyPartyOffers(S5, { ...empty, list: [empty.list[0], { ...empty.list[1], kind: "person", details: { firstName: "Alex" } }] }, offeredOtherParty(S5, S5_READING)).length === 0);
check("the reading is read only when it is the reading of this story (home.readFrom)", readingFactsOf({ story: { text: S4 }, home: { readFrom: "another story", understood: { understanding: { facts: S4_READING } } } }, S4).length === 0 && readingFactsOf(checkpoint(S4, S4_READING).sections as Record<string, unknown>, `${S4} Answer: yes.`).length === 1);

// 2.
check("never invented: a reading's amount the story does not write is not offered", offeredAmount(S1, [{ label: "Amount sought", value: "$9,999" }]) === null);
check("never invented: a name the story does not write is not offered", offeredOtherParty(S5, [{ label: "Other party", value: "Your friend Sam" }]) === null);
check("never a witness", offeredOtherParty("Synthetic: My neighbour Bob, who saw it, lives next door. The wind knocked my fence down.", [{ label: "Other party", value: "Bob" }]) === null);
check("never a part of a longer name (\"Circle\" of \"Circle K\")", offeredOtherParty("Synthetic: I slipped at the Circle K store.", [{ label: "Other party", value: "Circle K" }]) === null);

// 3. One source.
function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return ["node_modules", ".next"].includes(entry.name) ? [] : files(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}
const code = [...files("app"), ...files("src")];
/** Every other call of a reader, with why it is not an offer of its own. */
const ELSEWHERE: Record<string, string> = {
  "app/builder/_components/storyAnswers.ts amountFromStory": "defines amountOfferFromStory on it (the story part of the one reader)",
  "app/builder/_components/storyAnswers.ts amountOfferFromStory": "its definition",
  "src/lib/case-system/caseFile/understoodOtherParty.ts otherPartyFromUnderstanding": "its definition",
};
const readers = ["amountFromStory", "amountOfferFromStory", "otherPartyFromUnderstanding"];
const calls: string[] = [];
for (const file of code) {
  if (file === "src/lib/case-system/caseFile/storyOffers.ts") continue;
  const text = readFileSync(path.join(ROOT, file), "utf8");
  for (const reader of readers) if (new RegExp(`\\b${reader}\\(`).test(text)) calls.push(`${file} ${reader}`);
}
const stray = calls.filter((call) => !(call in ELSEWHERE));
check("the amount and other-party readers are called for an offer only from caseFile/storyOffers.ts", stray.length === 0, stray.join("; "));
check("every listed exception still exists (the list is the code's list)", Object.keys(ELSEWHERE).every((key) => calls.includes(key)), Object.keys(ELSEWHERE).filter((key) => !calls.includes(key)).join("; "));
check("self-test: a new offer reading amountOfferFromStory directly is caught", !(`app/new.tsx amountOfferFromStory` in ELSEWHERE));

// C9 (23 Nov 2026): the Small Claims form's "Found in your description" offers only what the case file does not hold from
// another place (the one asker, caseFile/missingFacts.ts; asker.ts foundStillToOffer was deleted, 23 Nov 2026): the amount, when, what they want and the other party given on the home page or
// in the chat, and the person's own name given on the Parties step, are not offered again.
{
  const held = emptyCaseFile();
  const answer = (value: string, question: string) => ({ state: "answered" as const, value, confirmed: true, source: { kind: "answer" as const, question } });
  held.amount = answer("2400", "sc-amount-claimed");
  held.whenHappened = answer("2026-06-01", "sc-orient-when-happened");
  held.wants = answer("To be paid back", "sc-remedy-sought");
  held.otherParty = answer("Alex Smith", "otherParty");
  held.parties = { recorded: true, list: [{ id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Person" }, unsure: [] }] };
  // A story that gives the amount, when, what they want and the evidence, read from the record's story (as on arrival).
  const story = "My name is Test Person. I am suing Fakebuild Test Contracting Inc. On May 1, 2026 they left my roof unfinished. They owe me $2,400. I want my money back. I have the invoice and texts.";
  const offered = (file: ReturnType<typeof emptyCaseFile>) => missingFacts({ ...file, storyText: story }, "sc-form").map((item) => item.field);
  const left = offered(held);
  check("C9: \"Found in your description\" never offers a value the case file holds (amount, when, goal, other party, your name)", JSON.stringify(left) === JSON.stringify(["evidence"]), JSON.stringify(left));
  check("C9 self-test: with nothing held, everything the story gives is offered (the names by the Parties step, not here)", JSON.stringify(offered(emptyCaseFile())) === JSON.stringify(["amountClaimed", "timeline", "goal", "evidence"]), JSON.stringify(offered(emptyCaseFile())));
  // The kind of claim is offered on the AI summary page and in the Small Claims chat only while the case file holds none
  // (claimKindOf, the one kind reader): read, so the table's case-file gate for both stays true.
  const overview = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
  const guidedChat = readFileSync("app/builder/_components/GuidedSmallClaimsIntake.tsx", "utf8");
  check("C9: the AI summary page offers a kind only when the case file holds none (claimKindOf; held hides the offer)", /claimKindLine\(claimKindOf\(caseFile/.test(overview) && /\{!kind\.held && kind\.claimTypeId \? <ClaimKindOffer/.test(overview));
  check("C9: the Small Claims chat offers a kind only when the case file holds none (claimKindOf)", /const heldKind = claimKindOf\(fileNow\);/.test(guidedChat) && /!kindGiven && !turnedDownKinds\.includes/.test(guidedChat));
  // The forms page: an answer the case already holds (the side, a step the person chose, "not married") is kept, shown with
  // Change ("firm"), never offered again; only the site's own suggested step is offered (the person never chose it).
  const applicability = readFileSync("src/lib/case-system/forms/applicabilitySuggestions.ts", "utf8");
  check("C9: the forms page keeps what the case holds (side, chosen step, not married) as firm, shown with Change", /reason: "Your case says you are responding to the other side's case\.", firm: true/.test(applicability) && /reason: "You said you were not married to the other person\.", firm: true/.test(applicability) && /firm only for a step they chose/.test(applicability) && /data-testid="forms-kept-from-case"/.test(readFileSync("app/forms/FormsWorkspace.tsx", "utf8")));
  check("C9: the form lists only the one asker's values (missingFacts \"sc-form\", read from the record's story)", /const listedOffers = foundToOffer\.filter\(/.test(readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8")) && /const offeredHere = new Map\(foundToOffer\.filter\(/.test(readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8")) && /const foundToOffer = missingFacts\(/.test(readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8")) && !/extractedFacts/.test(readFileSync("app/builder/_components/SmallClaimsIntake.tsx", "utf8")));
}

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll one-source offer checks passed.");
process.exit(failed ? 1 : 0);
