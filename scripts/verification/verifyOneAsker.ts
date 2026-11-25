/**
 * THE ONE ASKER (site owner, 23 Nov 2026; Chrome's test of #561, comment 7117157779: 32 repeated questions while the C9
 * check counted 1).
 *
 * What it checks:
 *   1. Chrome's Small Claims story, as it ARRIVES (no "Save story" pressed), guest or signed in, no AI: the Parties step
 *      offers the person's name, the other party's name, person or company ("Inc." is a company) and each side's city
 *      (parties.ts storyPartyOffers); the whole form offers the amount, when and what they want (missingFacts
 *      "sc-form"). Each is OFFERED, never filled in. A sentence that only starts with a name is not read as one.
 *   2. False positives (site owner, d): a wrongly read name, city or company type the person answers "No, that's not
 *      right" is never offered again with that value, and is never saved; "I'm not sure" never overwrites a held answer;
 *      a value the record holds is never offered.
 *   3. Deleted stays deleted (site owner, b): the second copies of the asker are gone from app/ and src/, and each name
 *      still to delete is listed with its court; a listed one that is gone must come off the list (one-line deletion).
 *
 * WHAT FAILURE THIS CATCHES: a story fact asked again because nothing read it into the record; a wrong value offered
 * again after "No"; an old asker brought back beside the one asker.
 *
 * Run: npm run test:one-asker
 */
import fs from "node:fs";
import path from "node:path";
import { storyPartyOffers, withNameParts, type PartiesRecord } from "../../src/lib/case-system/parties/parties";
import { FACT_IDS } from "../../src/lib/case-system/caseFile/factRecord";
import { elementFact, form7aFromRecord, missingFacts } from "../../src/lib/case-system/caseFile/missingFacts";
import { partyBoxFacts, recorderElementFact } from "../../tests/browser/harness/askOnce";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// Chrome's three stories, word for word (test of #561, runs 1 to 3).
const SC = "TEST Tess Plaintiff, Ottawa, hired TEST Fakebuild Contracting Inc., Ottawa, in January 2026 to renovate a kitchen. I paid $5,468.45. The work was not finished and I want my money back.";
const CIVIL = "TEST Alex Plaintiff, Ottawa, sues TEST BuildRight Ltd., Toronto, for breach of a written contract, $120,000, signed March 2025.";
const FAMILY = "TEST Sam Applicant, Ottawa, wants a divorce and parenting arrangements for two children who live with me in Ottawa. Married June 2012, separated 1 March 2025.";

const none: PartiesRecord = { version: 1, list: [], declined: [] };
const offers = (story: string, record: PartiesRecord = none) => storyPartyOffers(story, record).map((offer) => `${offer.party}|${offer.kind}|${offer.detail}|${offer.value}`);

// 1. Read on arrival.
check("1. Small Claims (Chrome 1.4, 1.12): your name, the other party (a company), each side's city are offered", JSON.stringify(offers(SC)) === JSON.stringify(["you|person|fullName|TEST Tess Plaintiff", "you|person|city|Ottawa", "other:1|company|companyName|TEST Fakebuild Contracting Inc.", "other:1|company|city|Ottawa"]), JSON.stringify(offers(SC)));
check("1. Civil (Chrome 2.7, 2.12): your name, TEST BuildRight Ltd. (a company), Toronto", JSON.stringify(offers(CIVIL)) === JSON.stringify(["you|person|fullName|TEST Alex Plaintiff", "you|person|city|Ottawa", "other:1|company|companyName|TEST BuildRight Ltd.", "other:1|company|city|Toronto"]), JSON.stringify(offers(CIVIL)));
check("1. Family (Chrome 3.7, 3.8): your name with TEST kept, your city", JSON.stringify(offers(FAMILY)) === JSON.stringify(["you|person|fullName|TEST Sam Applicant", "you|person|city|Ottawa"]), JSON.stringify(offers(FAMILY)));
for (const story of ["Ottawa, Toronto, hired someone.", "In January, Bob Smith, Ottawa, was there.", "My friend Alex Testwood, Ottawa, lent me money.", "I hired a contractor in Ottawa."]) {
  check(`1. not an introduction, nothing read: "${story}"`, offers(story).length === 0, JSON.stringify(offers(story)));
}
const arrived = { ...emptyCaseFile(), storyText: SC };
const formOffers = missingFacts(arrived, "sc-form").map((item) => `${item.field}=${item.value}`);
check("1. the whole form offers the amount, when and what you want from the story as it arrives (Chrome 1.4)", JSON.stringify(formOffers) === JSON.stringify(["amountClaimed=$5,468.45", "timeline=January 2026", "goal=I want my money back"]), JSON.stringify(formOffers));
check("1. each is an offer (Yes / No / Not sure), never filled in", missingFacts(arrived, "sc-form").every((item) => item.status === "offer"));
check("1. names are offered once, by the Parties step only, never also in the form's list", !formOffers.some((item) => /^(?:otherParty|yourName)=/.test(item)));

// 2. False positives.
const sc = storyPartyOffers(SC, none);
// Each needs the offer to exist first: with no offer (the code before the one asker) these fail rather than pass vacuously.
const wrongCity = sc.find((offer) => offer.party !== "you" && offer.detail === "city") ?? { key: "missing-offer" };
const afterNo: PartiesRecord = { ...none, declined: [wrongCity.key] };
check("2. a city answered \"No, that's not right\" is never offered again with that value", wrongCity.key !== "missing-offer" && !storyPartyOffers(SC, afterNo).some((offer) => offer.key === wrongCity.key));
check("2. ... and the other offers stay (only that value is turned down)", storyPartyOffers(SC, afterNo).length === sc.length - 1);
const wrongKind = sc.find((offer) => offer.party !== "you" && offer.detail === "companyName") ?? { key: "missing-offer" };
check("2. a company name (and its company type) answered \"No\" is never offered again", wrongKind.key !== "missing-offer" && !storyPartyOffers(SC, { ...none, declined: [wrongKind.key] }).some((offer) => offer.key === wrongKind.key));
const youHeld: PartiesRecord = { version: 1, declined: [], list: [{ id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Tess", lastName: "Realname", city: "Kanata" }, unsure: [] }] };
check("2. a name or city the record holds is never offered (the person's own answer wins)", !storyPartyOffers(SC, youHeld).some((offer) => offer.party === "you"), JSON.stringify(offers(SC, youHeld)));
const youUnsure: PartiesRecord = { version: 1, declined: [], list: [{ id: "you", you: true, side: "yours", kind: "person", details: {}, unsure: ["city"] }] };
check("2. \"I'm not sure\" settles: the city is not offered again", !storyPartyOffers(SC, youUnsure).some((offer) => offer.party === "you" && offer.detail === "city"));
const heldAmount = { ...arrived, amount: { state: "answered" as const, value: 6000, confirmed: true, source: { kind: "answer" as const, question: "sc-amount-claimed" } } };
check("2. an amount the record holds is never offered from the story", !missingFacts(heldAmount, "sc-form").some((item) => item.field === "amountClaimed"));
const unsureAmount = { ...arrived, amount: { state: "unsure" as const, confirmed: true, source: { kind: "answer" as const, question: "sc-amount-claimed" } } };
check("2. an amount said \"I'm not sure\" is not offered again", !missingFacts(unsureAmount, "sc-form").some((item) => item.field === "amountClaimed"));
check("2. a box the person filled is never offered over", !missingFacts(arrived, "sc-form", { boxes: { amountClaimed: "$6,000" } }).some((item) => item.field === "amountClaimed"));

// 4. The Form 7A checklist, from the record (Chrome 1.14; site owner, decision 3).
{
  const kind = CLAIM_TYPES.find((type) => type.id === "sc-claim-contractor-poor-or-incomplete-work")!;
  const amountHeld = { ...arrived, amount: { state: "answered" as const, value: 5468.45, confirmed: true, source: { kind: "answer" as const, question: "sc-amount-claimed" } } };
  const result = form7aFromRecord(amountHeld, kind.plaintiffElements, {});
  check("4. the amount the record holds is shown as held, never \"Still to add\"", result.held.some((item) => item.elementId === "amount-cpw" && item.value === "$5,468.45"), JSON.stringify(result.held));
  check("4. \"What the contractor agreed to do\" is found in the story (\"... hired ... to renovate a kitchen\")", result.found.some((item) => item.elementId === "agreement-for-the-work-cpw" && /to renovate a kitchen/.test(item.quote)), JSON.stringify(result.found));
  check("4. \"The work was not ... finished\" is found in the story (\"The work was not finished ...\")", result.found.some((item) => item.elementId === "reasonably-acceptable-quality-cpw" && /not finished/.test(item.quote)), JSON.stringify(result.found));
  const declined = form7aFromRecord(amountHeld, kind.plaintiffElements, { "agreement-for-the-work-cpw": { state: "not-yet", storyDeclined: true } });
  check("4. an item said \"Not right\" is never offered from the story again (it stays to add)", !declined.found.some((item) => item.elementId === "agreement-for-the-work-cpw") && !declined.held.some((item) => item.elementId === "agreement-for-the-work-cpw"));
  const answered = form7aFromRecord(amountHeld, kind.plaintiffElements, { "reasonably-acceptable-quality-cpw": { state: "provided" }, "amount-cpw": { state: "cannot-provide" } });
  check("4. an item the person already answered (or \"I don't have this\") is neither held nor offered", !answered.found.some((item) => item.elementId === "reasonably-acceptable-quality-cpw") && !answered.held.some((item) => item.elementId === "amount-cpw"));
  check("4. no story, nothing held: nothing found or held (the checklist asks as before)", form7aFromRecord(emptyCaseFile(), kind.plaintiffElements, {}).found.length === 0 && form7aFromRecord(emptyCaseFile(), kind.plaintiffElements, {}).held.length === 0);
  const surface = fs.readFileSync("app/builder/_components/StatementOfClaimSurface.tsx", "utf8");
  check("4. the checklist reads the one asker and shows ONE Yes for every found item, a \"Not right\" for each", /form7aFromRecord\(caseFile, /.test(surface) && (surface.match(/data-testid="form7a-found-yes"/g) ?? []).length === 1 && /fromRecord\.found\.map\([\s\S]{0,600}data-testid="form7a-found-not-right"/.test(surface));
  check("4. a found item is not also listed as \"Still to add\"", /gate\.outstanding\.filter\(\(element\) => !foundIds\.has\(element\.elementId\)\)\.map\(/.test(surface));
}

// 4b. The page recorder's copy of the element rule (it also runs on code before the one asker) agrees with the site's.
{
  const all = CLAIM_TYPES.flatMap((type) => type.plaintiffElements);
  const differ = all.filter((element) => recorderElementFact(element) !== elementFact(element)).map((element) => element.id);
  check(`4b. the question logs' recorder reads every Form 7A element's fact as the site does (${all.length} elements)`, all.length > 600 && differ.length === 0, differ.slice(0, 10).join(", "));
}

// 5. The chat starts by itself from a story the home page already read (Chrome 1.9).
{
  const chat = fs.readFileSync("app/builder/_components/GuidedSmallClaimsIntake.tsx", "utf8");
  check("5. a story the home page read starts the questions by itself, once (no \"Send my story\" box)", /const homeRead = caseFileOf\(recovery\?\.getReview\(\)\.checkpoint \?\? null\)\.storyReadOnHome \?\? "";\s*const readOnHome = Boolean\(homeRead\) && homeRead === story\.trim\(\);/.test(chat) && /if \(autoStarted\.current \|\| !readOnHome \|\| started/.test(chat) && /autoStarted\.current = true;\s*handleStorySubmit\(\);/.test(chat));
}

// 6. A fact the record holds is never an empty asking box (the carry and story-pack runs of #563).
{
  const parties = fs.readFileSync("app/_components/PartiesStep.tsx", "utf8");
  check("6. the Parties step never asks the one other party's name the record holds as \"not sure\" or removed elsewhere", /const settledElsewhere = !typing && status === "ask" && nameDetail && party\.side === "other" && !partyName\(party\) && record\.list\.filter\(\(item\) => item\.side === "other"\)\.length === 1 && factStatus\(file, "otherParty"\) === "settled";/.test(parties) && /data-testid=\{typing \? "parties-detail-typing" : settledNote !== null \|\| status === "settled" \|\| settledElsewhere \? "parties-detail-unsure" : "parties-detail-ask"\}/.test(parties) && /const settledNote = status === "settled" \|\| settledElsewhere \? boxView\(\{ state: "unsure" \}/.test(parties));
  // Rule 1 (24 Nov 2026): the box stays in that state, typeable, with the note: never words alone.
  check("6b. a \"not sure\" or removed name on the Parties step keeps its box, with the note", !/data-testid="parties-detail-unsure" data-detail=\{detail\} className="text-sm"><span className="font-semibold">\{LABELS\[detail\]\}:<\/span> Not sure yet/.test(parties));
}

// 7. The last name is its own fact (site owner, 23 Nov 2026): a one-word name fills the first name only.
{
  check("7. each side's last name is a fact of its own (yourLastName, otherPartyLastName)", (FACT_IDS as readonly string[]).includes("yourLastName") && (FACT_IDS as readonly string[]).includes("otherPartyLastName"));
  const one = withNameParts([{ id: "o", side: "other", kind: "person", details: { fullName: "Alex" }, unsure: [] }])[0];
  check("7. a one-word name held fills the first name, and only it (the last name stays to ask, once)", one.details.firstName === "Alex" && !one.details.lastName && Boolean(one.heldElsewhere?.includes("firstName")));
  const two = withNameParts([{ id: "o", side: "other", kind: "person", details: { fullName: "Jordan Testwood" }, unsure: [] }])[0];
  check("7. a two-word name fills both (so neither is asked)", two.details.firstName === "Jordan" && two.details.lastName === "Testwood");
  const typedFirst = withNameParts([{ id: "o", side: "other", kind: "person", details: { fullName: "Alex", firstName: "Alexander" }, unsure: [] }])[0];
  check("7. a first name the person typed is never replaced", typedFirst.details.firstName === "Alexander");
  const named: PartiesRecord = { version: 1, declined: [], list: [{ id: "o", side: "other", kind: "person", details: { fullName: "Jordan" }, unsure: [] }] };
  check("7. a party with a name is never offered a part of a name again (\"First name: Jordan\")", !storyPartyOffers("I am suing Jordan.", named, { value: "Jordan", quote: "Jordan" }).some((offer) => /^(?:firstName|lastName|fullName|companyName)$/.test(offer.detail)));
  check("7. the recorder reads a last-name box as the last-name fact, not the name", JSON.stringify(partyBoxFacts("party:other:p-1:lastName")) === JSON.stringify(["otherPartyLastName"]) && JSON.stringify(partyBoxFacts("party:you:you:lastName")) === JSON.stringify(["yourLastName"]) && JSON.stringify(partyBoxFacts("party:other:p-1:firstName")) === JSON.stringify(["otherParty"]));
}

// 3. Deleted stays deleted.
const DELETED = ["askOf", "mayAsk", "foundStillToOffer", "extractFromStory", "EXTRACTABLE_STORY_FIELDS", "alreadyAsked", "askable", "chatQuestionToAsk", "nextQuestion", "notAsked", "pendingFields", "isQuestionAlreadyAnswered", "withoutAnsweredQuestions", "withoutMunicipalityAsked", "withoutStageAnswered"];
/** Still to delete (each moves onto the one asker in this rebuild): the court whose screens use it. Only shrinks. */
const STILL_TO_DELETE: Record<string, string> = {};
const files: string[] = [];
const walk = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (/\.(tsx?|mts)$/.test(entry.name)) files.push(full.replace(/\\/g, "/")); } };
walk("app"); walk("src");
const code = files.map((file) => ({ file, text: fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1") }));
// Defined or imported anywhere (a function, a constant, a set, or an import of the name): "nextQuestion" and "askable" are
// also ordinary words for a variable or a field, which are not the deleted asker.
const definesOrImports = (name: string) => new RegExp(`function\\s+${name}\\b|export\\s+const\\s+${name}\\b|const\\s+${name}\\s*=\\s*(?:new\\s+Set|\\(|async\\b|\\[|function\\b)|import[^;]*\\b${name}\\b[^;]*from|export\\s*\\{[^}]*\\b${name}\\b`);
const usedIn = (name: string) => code.filter((item) => definesOrImports(name).test(item.text)).map((item) => item.file);
for (const name of DELETED) check(`3. deleted stays deleted: ${name} is in no file of app/ or src/`, usedIn(name).length === 0, usedIn(name).join(", "));
for (const [name, where] of Object.entries(STILL_TO_DELETE)) check(`3. still to delete (${where}): ${name} is still there, so the list is true (delete the entry when it goes)`, usedIn(name).length > 0);
// The self-test: a planted copy is found.
check("3. self-test: a deleted asker brought back is found (a function, an exported const, a const set, an import)", definesOrImports("askOf").test("export function askOf(file, id) {}") && definesOrImports("notAsked").test("const notAsked = (slot) => true;") && definesOrImports("EXTRACTABLE_STORY_FIELDS").test("const EXTRACTABLE_STORY_FIELDS = new Set([])") && definesOrImports("nextQuestion").test('import { nextQuestion } from "./caseFile";'));
check("3. self-test: an ordinary variable or field of the same word is not the deleted asker", !definesOrImports("nextQuestion").test("const nextQuestion = remainingIds.length > 0 ? bank[0] : undefined;") && !definesOrImports("nextQuestion").test("nextQuestion?: IntakeQuestion;"));

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe one asker: the story is read on arrival, each fact is offered once, nothing deleted comes back.");
process.exit(failures ? 1 : 0);
