/**
 * Chrome's milestone pass 2 on PR #550 (bbcade40, 17 Nov 2026): each finding, by its number, at the shared piece that
 * owns it, so it cannot come back on any route.
 *
 * WHAT IT CATCHES. The page tests passed while Chrome, with the real AI, found facts asked twice. Each check below is the
 * rule the fix puts in one place; the browser proof, on the real AI's recorded readings, is the story pack's
 * "chrome pass 2" group and the ask-once stories sc-/family-/civil-chrome2-* (tests/browser/fixtures/real-ai/).
 *
 * Run: npm run test:chrome-pass-2
 */
import { readFileSync } from "node:fs";
import { courtQuestionShown } from "../../src/lib/case-system/understanding/betterDestination";
import { timelineIn } from "../../src/lib/case-system/caseFile/storyFacts";
import { reviewEntries, statedInStory } from "../../src/lib/case-system/intakeReview";
import { suggestApplicability } from "../../src/lib/case-system/forms/applicabilitySuggestions";
import type { CaseRecord } from "../../src/lib/case-system/caseRecord";
import { partyOfOffer, storyPartyOffers, type PartiesRecord } from "../../src/lib/case-system/parties/parties";
import { answeredInIntake, caseFileOf, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { amountWithCostsNote } from "../../src/lib/case-system/format/recordedAmount";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { fillForm, pdfValues } from "../../src/lib/case-system/forms/formMap";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { factStatus, mayAskWords, settledNotSure } from "../../src/lib/case-system/caseFile/factStatus";
import { storySuggestionFor } from "../../src/lib/case-system/family/triageStoryQuote";
import { emptyStatusRecord, selectNextTriageQuestion } from "../../src/lib/case-system/family/statusTriage";
import { factOfAskedText } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { homeAsks } from "../../src/lib/case-system/caseFile/factQuestions";
import { foldsAsNotAnswered } from "../../app/_components/NotAnsweredYet";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed += 1;
}
const source = (file: string) => readFileSync(file, "utf8");

/** One finding's checks: a crash (a function the fix adds, missing before it) fails that finding alone. */
function section(name: string, run: () => void) {
  try { run(); } catch (error) { check(`${name} could not run`, false, error instanceof Error ? error.message.split("\n")[0] : String(error)); }
}

section("Finding 1", () => {
  // Finding 1: "Where this seems to belong: Small Claims Court. ... you choose where to continue." after Small Claims was
  // chosen on My cases (every story; S2 with "not clear yet").
  check("F1 the court chosen, the reading agrees: the court is not asked again", courtQuestionShown("small-claims", "small-claims", true) === false);
  check("F1 the court chosen, the reading is not clear: the court is not asked again", courtQuestionShown("unclear", "small-claims", null) === false);
  check("F1 the court chosen, the reading points to another court: that other place is offered (once)", courtQuestionShown("civil", "small-claims", true) === true);
  check("F1 the court chosen, the reading points to a tribunal: said", courtQuestionShown("tribunal", "small-claims", null) === true);
  check("F1 no court chosen yet: the reading's suggestion is offered", courtQuestionShown("small-claims", null, true) === true);
  const card = source("app/_components/CaseUnderstandingCard.tsx");
  check("F1 the reading card draws \"Where this seems to belong\" only behind the rule", /\{askCourt \? \(\s*<p[^>]*data-testid="case-understanding-court-question"[\s\S]{0,200}Where this seems to belong/.test(card) && (card.match(/Where this seems to belong/g) ?? []).length === 1);
});

section("Findings 2 and 3", () => {
  // Findings 2 and 3: the city and province given at the start, and the store's address typed as an answer, came back as
  // empty boxes on the Parties step (S1 to S5, S7; S1).
  const S1 = "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. There was no wet-floor sign. I fell on my right hip.";
  const parties = (list: PartiesRecord["list"]): PartiesRecord => ({ version: 1, declined: [], list });
  const you = { id: "you", you: true as const, side: "yours" as const, kind: "person" as const, details: {}, unsure: [] };
  const store = { id: "o1", side: "other" as const, kind: "company" as const, details: { companyName: "Circle K Convenience Stores Ltd." }, unsure: [] };
  const sections = { home: { understoodAnswers: [{ question: "What is the address of the store where you fell?", answer: "100 Sample Road, Ottawa ON K1B 0B1" }] } };
  const offered = storyPartyOffers(S1, parties([you, store]), null, { location: { city: "Ottawa", province: "Ontario" }, answered: answeredInIntake(sections) });
  const offer = (party: string, detail: string) => offered.find((item) => item.party === party && item.detail === detail)?.value;
  check("F2 the city given at the start is offered for the person's own city", offer("you", "city") === "Ottawa", JSON.stringify(offered));
  check("F2 Ontario at the start is offered as the person's province", offer("you", "province") === "ON");
  check("F3 the store's address, typed as an answer, is offered for Defendant 1", offer("other:1", "street") === "100 Sample Road" && offer("other:1", "city") === "Ottawa" && offer("other:1", "postalCode") === "K1B 0B1", JSON.stringify(offered));
  const held = storyPartyOffers(S1, parties([{ ...you, details: { city: "Kanata", province: "ON" } }, { ...store, details: { ...store.details, street: "1 Other Road", city: "Ottawa", province: "ON", postalCode: "K1B 0B2" } }]), null, { location: { city: "Ottawa", province: "Ontario" }, answered: answeredInIntake(sections) });
  check("F2/F3 once held (or answered otherwise), neither is offered again", held.every((item) => !["city", "province", "street", "postalCode"].includes(item.detail)), JSON.stringify(held));
  const declined = storyPartyOffers(S1, { ...parties([you, store]), declined: offered.map((item) => item.key) }, null, { location: { city: "Ottawa" }, answered: answeredInIntake(sections) });
  check("F2/F3 turned down once (No), never offered again", declined.length === 0, JSON.stringify(declined));
  const notOther = storyPartyOffers(S1, parties([you, store]), null, { answered: [{ question: "Where did the fall happen?", answer: "Inside, near the milk fridge." }] });
  check("F3 self-test: an answer with no address offers nothing", notOther.every((item) => item.detail !== "street"));
  // S1 on all three real readings: Defendant 1 held with no name yet (the reading named no business), the store's
  // address still offered for it, and it stays with that party once the person names it.
  const unnamed = { id: "o1", side: "other" as const, kind: "company" as const, details: {}, unsure: [] };
  const toUnnamed = storyPartyOffers(S1, parties([you, unnamed]), null, { answered: [{ question: "What is the store's exact street address?", answer: "100 Sample Road, Ottawa ON K1B 0B1" }] });
  const unnamedStreet = toUnnamed.find((item) => item.party === "other:1" && item.detail === "street");
  check("F3 Defendant 1 with no name yet: the store's address typed as an answer is still offered for it", unnamedStreet?.value === "100 Sample Road" && partyOfOffer(parties([you, unnamed]), unnamedStreet)?.id === "o1", JSON.stringify(toUnnamed));
  // Round 2 (18 Nov), all three S1 readings asked it by the store's name: "What is the street address of the Circle K where
  // you fell?". The story says it happened "at a Circle K": a business named as the place, so its address is the other side's.
  const byName = storyPartyOffers(S1, parties([you, unnamed]), null, { answered: [{ question: "What is the street address of the Circle K where you fell?", answer: "100 Sample Road, Ottawa ON K1B 0B1" }] });
  check("F3 round 2: the address of \"the Circle K where you fell\" is offered for Defendant 1", byName.find((item) => item.party === "other:1" && item.detail === "street")?.value === "100 Sample Road", JSON.stringify(byName));
  const atThe = storyPartyOffers("I was hit by another driver at the corner of Bank Street. The other driver ran the light.", parties([you, unnamed]), null, { answered: [{ question: "What is the street address of the Bank Street corner?", answer: "100 Sample Road, Ottawa ON K1B 0B1" }] });
  check("F3 round 2 self-test: a place the story does not name as a business is not the other side's address", atThe.every((item) => item.detail !== "street"), JSON.stringify(atThe));
  check("F3 self-test: with two other parties and no name, an unnamed address is not pinned on either", partyOfOffer(parties([you, unnamed, { ...unnamed, id: "o2" }]), unnamedStreet ?? toUnnamed[0]) === undefined);
  const parties2 = source("app/_components/PartiesStep.tsx");
  check("F2/F3 the Parties step passes the start's city and the intake's answers to the offers", /storyPartyOffers\(storyOfFile\(file\), record, named, \{ location: locationOf\([^\n]*answered: answeredInIntake\(sections\) \}\)/.test(parties2));
});

section("Finding 4", () => {
  // Finding 4 (S6): the home reading asked again whether a defence was filed, after "Nothing else yet. I was just served".
  const served = caseFileOf({ version: 1, flowId: "f4", courtPath: "small-claims", revision: "f4", sections: { situation: { record: { where: "served", stage: "just-served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims" } } } } as never);
  const S6_ASKED = [
    "Have you responded to the claim or received any further court papers since October 20?",
    "Have you submitted a defence or received any further court papers since you were served?",
  ];
  for (const words of S6_ASKED) {
    check(`F4 "${words.slice(0, 48)}..." names the defence fact`, factOfAskedText(words, { responding: true }) === "defenceFiled", String(factOfAskedText(words, { responding: true })));
    check(`F4 ...and is not asked once "just served" is held`, mayAskWords(served, words, { court: "small-claims", responding: true }) === false);
  }
  check("F4 \"received any further court papers\" alone names the stage", factOfAskedText("Have you received any further court papers?") === "stage");
  check("F4 self-test: a question about what is disputed names no fact", factOfAskedText("What do you dispute about the claim?", { responding: true }) === null);
  check("F4 self-test: with nothing held, the defence question may be asked", mayAskWords(caseFileOf({ version: 1, flowId: "f4b", courtPath: "small-claims", revision: "f4b", sections: {} } as never), S6_ASKED[0], { court: "small-claims", responding: true }) === true);
});

section("Findings 6 and 7", () => {
  // Findings 6 and 7 (S7, not married): "Did you live together? ... from roughly when" with a required start after
  // "separated in June 2026"; "Do you and the other person have a child together?" after "We have a 6-year-old".
  const S7 = "My partner and I separated in June 2026. We have a 6-year-old. I want a parenting schedule.";
  check("F7 \"We have a 6-year-old\" is offered as a child together (once, from the story)", storySuggestionFor("child-together", S7)?.value === "yes", JSON.stringify(storySuggestionFor("child-together", S7)));
  check("F7 \"We have a 6-year-old\" says the case involves children", storySuggestionFor("case-involves-children", S7)?.value === "yes");
  const notMarried = { ...emptyStatusRecord(), marriedToOtherParty: "no" as const, cohabitationStart: "2018", cohabitationEnd: "2026-06" };
  const childrenHeld = caseFileOf({ version: 1, flowId: "f7", courtPath: "family", revision: "f7", sections: { family: { children: "Yes, a 6-year-old who lives with me." } } } as never);
  check("F7 setup: the case file holds that the case involves children", factStatus(childrenHeld, "children") === "known", factStatus(childrenHeld, "children"));
  check("F7 the triage does not ask \"a child together\" once the case file holds the children", selectNextTriageQuestion(notMarried, new Set(), childrenHeld)?.id !== "child-together", String(selectNextTriageQuestion(notMarried, new Set(), childrenHeld)?.id));
  check("F7 self-test: with nothing held, it is asked", selectNextTriageQuestion(notMarried, new Set(), caseFileOf({ version: 1, flowId: "f7b", courtPath: "family", revision: "f7b", sections: {} } as never))?.id === "child-together");
  const triage = source("app/builder/_components/FamilyStatusTriage.tsx");
  check("F7 the triage page picks its next question through the case file", /selectNextTriageQuestion\(record, deferred, file\)/.test(triage) && /caseFileOf\(review\.checkpoint, recovery\?\.getSavedMaster\(\)/.test(triage));
  check("F6 the start of living together can be \"I'm not sure\" once when it ended is known: the end is recorded alone", /data-testid="triage-cohabitation-start-unsure"[\s\S]{0,200}cohabitationStart: "not-yet", cohabitationEnd: readPartialDate\(dateEnd\)/.test(triage));
});

section("Finding 5", () => {
  // Finding 5 (S6): the chat's "A claim of your own against them" answered Yes kept the AI's sentence as the answer, and the
  // Forms tab then asked "Are you making a Defendant's Claim...?" cold.
  const DEFENDANTS_CLAIM = [{ field_path: "formApplicability.smallClaims.isMakingDefendantsClaim", choices: [{ value: true }, { value: false }, { value: "not-sure" }] }];
  const sued = { courtPath: "small-claims", side: { value: "responding" }, story: "I was served with a Small Claims claim on Oct 20, 2026. A contractor says I owe $4,200 for a kitchen job. I already paid $2,000 and the work was bad.", position: {}, claimKind: null } as unknown as CaseRecord;
  const chatAnswer = "The contractor's work was bad: the cabinets are crooked and the countertop is cracked. I already paid $2,000.";
  const servedMaster = { intakeCheckpoint: { version: 1, flowId: "00000000-0000-4000-8000-0000000000f5", courtPath: "small-claims", revision: "00000000-0000-4000-8000-0000000000f6", sections: { story: { text: sued.story }, situation: { record: { where: "served", stage: "just-served", papers: "small-claims-7A", court: "small-claims" } }, builder: { step: "guided" }, guided: { earlierAnswers: [{ questionId: "sc-defendant-counterclaim", answerText: chatAnswer }] } } } };
  // Decision 1 (site owner, 18 Nov 2026, option c): a yes/no fact takes only a yes or no; the story's sentence is never
  // offered for it in the chat (test:fact-types), and a sentence is never taken as their Yes on the Forms tab. Their Yes
  // or No is kept, so the Forms tab never asks it again.
  const offeredClaim = suggestApplicability(DEFENDANTS_CLAIM, sued, servedMaster)[0];
  check("F5 a sentence answer to \"a claim of your own\" is never taken as their Yes on the Forms tab", !offeredClaim || !(offeredClaim.reason ?? "").includes("cabinets are crooked"), JSON.stringify(offeredClaim));
  const saidYes = { intakeCheckpoint: { ...servedMaster.intakeCheckpoint, sections: { ...servedMaster.intakeCheckpoint.sections, guided: { earlierAnswers: [{ questionId: "sc-defendant-counterclaim", answerText: "Yes" }] } } } };
  const keptYes = suggestApplicability(DEFENDANTS_CLAIM, sued, saidYes)[0];
  check("F5 their Yes to \"a claim of your own\" is kept on the Forms tab, never asked cold", keptYes?.value === true && keptYes.firm === true, JSON.stringify(keptYes));
  const noAnswer = suggestApplicability(DEFENDANTS_CLAIM, sued, { intakeCheckpoint: { ...servedMaster.intakeCheckpoint, sections: { ...servedMaster.intakeCheckpoint.sections, guided: {} } } })[0];
  check("F5 self-test: never answered, nothing is offered from it", !noAnswer || !noAnswer.reason.includes("when asked whether the plaintiff"), JSON.stringify(noAnswer));
});

section("Finding 10", () => {
  // Finding 10 (S3): "$2,400 plus my costs" was kept as the amount with its words, so Form 7A said "Missing: the amount".
  check("F10 \"$2,400 plus my costs\" is the sum 2,400 with \"plus my costs\" kept as its note", JSON.stringify(amountWithCostsNote("$2,400 plus my costs")) === JSON.stringify({ amount: 2400, note: "plus my costs" }), JSON.stringify(amountWithCostsNote("$2,400 plus my costs")));
  check("F10 self-test: \"about $10,000 plus costs\" stays as typed (not a plain sum)", amountWithCostsNote("about $10,000 plus costs") === null);
  check("F10 self-test: \"10000 CAD plus interest\" stays as typed", amountWithCostsNote("10000 CAD plus interest") === null);
  const fence = caseFileOf({ version: 1, flowId: "f10", courtPath: "small-claims", revision: "f10", sections: { builder: { initialAnswers: { "sc-amount-claimed": "$2,400 plus my costs" } } } } as never);
  check("F10 the case file holds the amount 2,400, its note beside it", fence.amount.value === 2400 && fence.amount.note === "plus my costs", JSON.stringify(fence.amount));
  check("F10 every screen shows both: \"$2,400.00 plus my costs\"", slotText(fence.amount, (iso) => iso) === "$2,400.00 plus my costs", slotText(fence.amount, (iso) => iso));
  const fenceForm = pdfValues(fillForm(FORM_7A, formContextOf({ version: 1, flowId: "f10", courtPath: "small-claims", revision: "f10", sections: { builder: { initialAnswers: { "sc-amount-claimed": "$2,400 plus my costs" } } } } as never)));
  check("F10 Form 7A's principal amount is 2,400.00, never \"Missing\"", Object.values(fenceForm).includes("2,400.00"), JSON.stringify(Object.entries(fenceForm).filter(([key]) => /amount|principal/i.test(key))));
});

section("Findings 9 and 11", () => {
  // Findings 9 and 11: the review's Timeline stayed empty after "separated in June 2026" (S7) and "delivered in August 2026"
  // (S8): the timeline reader counted only full days.
  const S8 = "A company owes me $85,000 for goods I delivered in August 2026 and has not paid. The company is Testgoods Ltd.";
  const S7 = "My partner and I separated in June 2026. We have a 6-year-old. I want a parenting schedule.";
  check("F11 \"delivered in August 2026\" is a line of the story's timeline", timelineIn(S8)?.value.includes("August 2026") === true, JSON.stringify(timelineIn(S8)));
  check("F9 \"separated in June 2026\" is a line of the story's timeline", timelineIn(S7)?.value.includes("June 2026") === true, JSON.stringify(timelineIn(S7)));
  check("F9/F11 self-test: a story with no date gives no timeline", timelineIn("My contractor left the work unfinished and kept my deposit.") === null);
  const civilTimeline = reviewEntries({ version: 1, flowId: "f11", courtPath: "civil", revision: "f11", sections: { story: { text: S8 }, civil: { input: { timeline: "" } } } } as never).find((entry) => entry.field === "timeline");
  check("F11 the Civil review's empty Timeline box offers the story's dated lines", civilTimeline?.fromStory?.value.includes("August 2026") === true, JSON.stringify(civilTimeline));
  const familyTimeline = reviewEntries({ version: 1, flowId: "f9", courtPath: "family", revision: "f9", sections: { story: { text: S7 }, family: { timeline: "" } } } as never).find((entry) => entry.field === "timeline");
  check("F9 the Family review's empty Timeline box offers the story's dated lines", familyTimeline?.fromStory?.value.includes("June 2026") === true, JSON.stringify(familyTimeline));
  const living = reviewEntries({ version: 1, flowId: "f9b", courtPath: "family", revision: "f9b", sections: { story: { text: S7 }, family: { currentLivingSituation: "" }, home: { understoodAnswers: [{ question: "Where does your child normally live, and how long have they lived there?", answer: "With me in Ottawa since birth." }] } } } as never).find((entry) => entry.field === "currentLivingSituation");
  check("F9 the Family review's empty \"Current living situation\" offers what they answered on the home page", living?.fromStory?.value === "With me in Ottawa since birth.", JSON.stringify(living));
  const notAsked = reviewEntries({ version: 1, flowId: "f9c", courtPath: "family", revision: "f9c", sections: { story: { text: S7 }, family: { currentLivingSituation: "" }, home: { understoodAnswers: [{ question: "Are there any safety concerns involving you or your child?", answer: "No safety concerns." }] } } } as never).find((entry) => entry.field === "currentLivingSituation");
  check("F9 self-test: an answer to another question is not offered there", !notAsked?.fromStory, JSON.stringify(notAsked));
  // The real AI's other words for the same questions (S7a reading r3, S7b readings r2 and r3), word for word.
  for (const question of [
    "In what city or town and province does your child usually live?",
    "In what city and province or country does your child usually live?",
    "What town or city and province or country does your child usually live in?",
    "What parenting arrangement do you currently have, and what schedule would you like?",
  ]) {
    const entry = reviewEntries({ version: 1, flowId: "f9d", courtPath: "family", revision: "f9d", sections: { story: { text: S7 }, family: { currentLivingSituation: "" }, home: { understoodAnswers: [{ question, answer: "With me in Ottawa since birth." }] } } } as never).find((item) => item.field === "currentLivingSituation");
    check(`F9 "${question.slice(0, 50)}..." answered: offered in "Current living situation"`, entry?.fromStory?.value === "With me in Ottawa since birth.", JSON.stringify(entry));
  }
});

// The home reading's offers (S2 r3, S8 r2, S6 r1) were removed on 19 Nov 2026 with the home card's offer: the home page
// asks only a fixed question whose answer neither the record nor the story gives (factQuestions.ts homeAsks;
// test:home-asks-unstated), and offers nothing; a stated value is offered once by the intake. What still applies here is
// how an AI-worded question is read for the other screens that filter them (factOfAskedText, mayAskWords).
section("Home reading: no offer on the home page; the words still read as before elsewhere", () => {
  const S2 = "My contractor left the work unfinished and kept my $1,200 deposit.";
  check("S2: the home page does not ask the amount the story gives", !homeAsks(null, "sc-amount-claimed", S2));
  check("S2: the intake's story reader still states it, to offer once", statedInStory(S2).amount === "1200", JSON.stringify(statedInStory(S2)));
  const seller = "Who was the seller under the agreement: you personally, a business you operate, or a corporation?";
  check("S8 r2: a question about the person's own side is not the other party", factOfAskedText(seller) !== "otherParty", String(factOfAskedText(seller)));
  check("S6 r1: \"If you want money from the contractor, how much are you seeking?\" is not asking the claim's amount", factOfAskedText("If you want money from the contractor, how much are you seeking?") === null && factOfAskedText("How much money are you seeking?") === "amount");
});

section("Finding 8", () => {
  // Finding 8 (S7): "No safety concerns" given on the home page, then the urgent question named a safety worry again. The
  // real AI asks the safety question in several words (S7a reading r2 below); each is the safety fact.
  for (const question of [
    "Are there any safety concerns involving you or your child?",
    "Are there any concerns about violence, your child's safety, or your child being taken away without agreement?",
    "Are there any safety concerns involving you, your child or your partner?",
    "Are there any immediate safety concerns for you or your child?",
  ]) check(`F8 "${question.slice(0, 60)}..." asks the safety fact`, factOfAskedText(question) === "safety", String(factOfAskedText(question)));
  check("F8 self-test: a question about safety rules is not the safety fact", factOfAskedText("What safety rules did the store have to follow?") !== "safety");
});

section("A cleared box stays a box (form-box-follows-record, 18 Nov)", () => {
  // Moving the form's quiet line onto the one function (stillNeeded) folded a box the person CLEARED ("removed", which the
  // one function counts as settled) into "Not answered yet", so the box was gone (browser run, all three courts).
  const base = caseFileOf({ version: 1, flowId: "fold", courtPath: "small-claims", revision: "fold", sections: {} } as never);
  const cleared = { ...base, amount: { state: "not-asked" as const, confirmed: true, removed: true as const } };
  const notSure = { ...base, amount: { state: "unsure" as const, confirmed: true } };
  check("a cleared box is not folded into \"Not answered yet\"", !foldsAsNotAnswered(cleared, ["amount"], ""));
  check("self-test: a confirmed \"I'm not sure\" with an empty box folds", foldsAsNotAnswered(notSure, ["amount"], ""));
  check("self-test: an unconfirmed \"not sure\" is still to ask: not folded", !foldsAsNotAnswered({ ...base, amount: { state: "unsure" as const, confirmed: false } }, ["amount"], ""));
  // Everywhere a box folds on "settled": the two boxes that do (found by searching "=== \"settled\"" with a fold).
  check("the one test: settled by \"not sure\", never by clearing", !settledNotSure(cleared, "amount") && settledNotSure(notSure, "amount"));
  check("both folding boxes use it (NotAnsweredYet, AskedField)", /settledNotSure\(file, item\.fact\)/.test(source("app/_components/NotAnsweredYet.tsx")) && /settledNotSure\(file, decision\.fact\)/.test(source("app/_components/AskedField.tsx")));
});

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll Chrome pass 2 checks passed.");
process.exit(failed ? 1 : 0);
