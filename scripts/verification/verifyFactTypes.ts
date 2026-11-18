/**
 * EVERY FACT HAS A TYPE, AND THE ONE WRITER KEEPS ONLY A VALUE OF THAT TYPE (site owner, 18 Nov 2026, decision 1 on
 * 2d0ebd53). Lists every fact and every party detail with its type, and fails when one has none (a planted fact with no
 * type is caught). Then, on the real AI's recorded readings and Chrome's own words, that a value of the wrong type is not
 * kept and not offered: a sentence in a yes/no fact (S6: the story suggestion "The contractor's work was bad..." for "Do
 * you believe the plaintiff ... owes you money?"; the driver's "Test Kitchens Inc."), words in an amount (S3 "$2,400 plus
 * my costs" is 2,400 with its note), a place as a name (S2 "Gatineau, Quebec"); in the case file's writer (give), the
 * server's save (applyFactWrites), the chat's suggestions, the review's, the one offer place and the Parties step.
 *
 * Fails when: a fact or a party detail has no type; a mismatched value is kept or offered; the Forms tab takes a sentence
 * as the person's Yes to a Defendant's Claim; a question in the bank asks a fact of another type.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { FACT_IDS, applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";
import { FACT_TYPES, PARTY_DETAIL_TYPES, factTypeOf, fitsFactType, partyDetailFits, suggestionFits } from "../../src/lib/case-system/caseFile/factTypes";
import { PARTY_DETAILS, storyPartyOffers, type PartiesRecord } from "../../src/lib/case-system/parties/parties";
import { emptyCaseFile, give, caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { suggestApplicability } from "../../src/lib/case-system/forms/applicabilitySuggestions";
import { offeredOtherParty } from "../../src/lib/case-system/caseFile/storyOffers";
import type { CaseRecord } from "../../src/lib/case-system/caseRecord";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed += 1;
}
/** A crash (a function the rule adds, missing before it) fails that part alone. */
function part(name: string, run: () => void) {
  try { run(); } catch (error) { check(`${name} could not run`, false, error instanceof Error ? error.message.split("\n")[0] : String(error)); }
}

part("Every fact has a type", () => {
  console.log("\nEvery fact and its type:");
  for (const fact of FACT_IDS) console.log(`  ${fact.padEnd(24)} ${factTypeOf(fact) ?? "(NO TYPE)"}`);
  const untyped = FACT_IDS.filter((fact) => !factTypeOf(fact));
  check(`every fact has a type (${FACT_IDS.length} facts)`, untyped.length === 0, untyped.join(", "));
  check("self-test: a planted fact with no type is caught", factTypeOf("zz-planted-fact") === undefined && !fitsFactType("zz-planted-fact", "x").ok);
  check("the type table names no fact that does not exist", Object.keys(FACT_TYPES).every((fact) => (FACT_IDS as readonly string[]).includes(fact)), Object.keys(FACT_TYPES).filter((fact) => !(FACT_IDS as readonly string[]).includes(fact)).join(", "));
  console.log("\nEvery party detail and its type:");
  for (const detail of PARTY_DETAILS) console.log(`  ${detail.padEnd(24)} ${(PARTY_DETAIL_TYPES as Record<string, string>)[detail] ?? "(NO TYPE)"}`);
  const untypedDetails = PARTY_DETAILS.filter((detail) => !(PARTY_DETAIL_TYPES as Record<string, string>)[detail]);
  check(`every party detail has a type (${PARTY_DETAILS.length} details)`, untypedDetails.length === 0, untypedDetails.join(", "));
  check("self-test: a planted party detail with no type fits nothing", !partyDetailFits("zzPlanted", "anything"));
});

part("The question bank asks each fact in its type", () => {
  // A yes/no question asks a yes/no or words fact; an amount question an amount; a date question a date.
  const allowed: Record<string, string[]> = { "yes-no": ["yes-no", "words", "choice"], amount: ["amount"], date: ["date", "words"] };
  const wrong = QUESTION_BANK.flatMap((question) => (allowed[question.answerType] ? factsOfQuestion(question.id).filter((fact) => !allowed[question.answerType].includes(factTypeOf(fact) ?? "none")).map((fact) => `${question.id} (${question.answerType}) -> ${fact} (${factTypeOf(fact)})`) : []));
  check("every yes/no, amount and date question asks a fact of a fitting type", wrong.length === 0, wrong.join("; "));
});

part("Yes/no facts (decision 1: S6)", () => {
  // The real AI's story suggestions for S6 reading r2 and r3, from the recorded fixtures.
  const suggested: string[] = [];
  for (const reading of ["r2", "r3"]) {
    const file = path.join("tests", "browser", "fixtures", "real-ai", "sc-chrome2-s6-sued", `${reading}.json`);
    const fixture = JSON.parse(readFileSync(file, "utf8")) as { entries: { step: string; output: unknown }[] };
    for (const entry of fixture.entries) if (entry.step === "story-suggestions" && Array.isArray(entry.output)) for (const proposal of entry.output as { questionId: string; answer: string }[]) if (proposal.questionId === "sc-defendant-counterclaim") suggested.push(proposal.answer);
  }
  check("the recorded S6 readings hold the counterclaim suggestions (so the checks below test them)", suggested.length >= 2, JSON.stringify(suggested));
  for (const answer of suggested) check(`S6: the story suggestion "${answer.slice(0, 50)}..." is never offered for the yes/no question`, !suggestionFits("sc-defendant-counterclaim", answer));
  check("the counterclaim question asks the yes/no fact defendantsClaim (and keeps their words as the outcome)", factsOfQuestion("sc-defendant-counterclaim")[0] === "defendantsClaim" && factsOfQuestion("sc-defendant-counterclaim").includes("outcome"), JSON.stringify(factsOfQuestion("sc-defendant-counterclaim")));
  check("self-test: a bare \"Yes\" suggestion is offered", suggestionFits("sc-defendant-counterclaim", "Yes"));
  check("S6 driver's \"Test Kitchens Inc.\" is not a yes or no", !fitsFactType("defendantsClaim", "Test Kitchens Inc.").ok);
  const file = emptyCaseFile();
  give(file, "defendantsClaim", "The contractor's work was bad. The cabinets are crooked and the countertop is cracked.", "sc-defendant-counterclaim");
  check("the one writer keeps no sentence in a yes/no fact", file.defendantsClaim.state === "not-asked", JSON.stringify(file.defendantsClaim));
  const own = emptyCaseFile();
  give(own, "defendantsClaim", "No. I only want to defend the claim. I am not seeking money from the contractor.", "home:claim-of-your-own");
  check("the person's own answer that opens with No is kept as No (5b)", own.defendantsClaim.state === "answered" && own.defendantsClaim.value === "No", JSON.stringify(own.defendantsClaim));
  check("but a story suggestion that opens with \"Yes.\" is not offered (S6 r3)", !suggestionFits("sc-defendant-counterclaim", "Yes. The contractor's work was bad."));
  const master = { intakeCheckpoint: { version: 1, flowId: "00000000-0000-4000-8000-0000000000a1", courtPath: "small-claims", revision: "00000000-0000-4000-8000-0000000000a2", sections: { story: { text: "Synthetic." } } } };
  const saved = applyFactWrites(master, "small-claims", "c1", [{ fact: "defendantsClaim", state: "answered", value: "Test Kitchens Inc.", source: "person" }], new Date("2026-11-18T00:00:00Z"));
  check("the server's save refuses a sentence in a yes/no fact", !saved.ok, JSON.stringify(saved).slice(0, 200));
});

part("The Forms tab reads the yes/no fact (Finding 5 under decision 1)", () => {
  const DEFENDANTS_CLAIM = [{ field_path: "formApplicability.smallClaims.isMakingDefendantsClaim", choices: [{ value: true }, { value: false }, { value: "not-sure" }] }];
  const sued = { courtPath: "small-claims", side: { value: "responding" }, story: "I was served with a Small Claims claim on Oct 20, 2026. A contractor says I owe $4,200 for a kitchen job.", position: {}, claimKind: null } as unknown as CaseRecord;
  const masterWith = (answerText: string) => ({ intakeCheckpoint: { version: 1, flowId: "00000000-0000-4000-8000-0000000000f5", courtPath: "small-claims", revision: "00000000-0000-4000-8000-0000000000f6", sections: { story: { text: sued.story }, situation: { record: { where: "served", stage: "just-served", papers: "small-claims-7A", court: "small-claims" } }, builder: { step: "guided" }, guided: { earlierAnswers: [{ questionId: "sc-defendant-counterclaim", answerText }] } } } });
  const sentence = suggestApplicability(DEFENDANTS_CLAIM, sued, masterWith("The contractor's work was bad: the cabinets are crooked and the countertop is cracked."))[0];
  check("a sentence answer is never taken as their Yes (no \"You answered\" offer quoting it)", !sentence || !(sentence.reason ?? "").includes("You answered"), JSON.stringify(sentence));
  const yes = suggestApplicability(DEFENDANTS_CLAIM, sued, masterWith("Yes"))[0];
  check("their Yes is kept (firm): never asked again", yes?.value === true && yes.firm === true, JSON.stringify(yes));
  const no = suggestApplicability(DEFENDANTS_CLAIM, sued, masterWith("No"))[0];
  check("their No is kept (firm)", no?.value === false && no.firm === true, JSON.stringify(no));
});

part("Amounts (S3: \"$2,400 plus my costs\")", () => {
  const fits = fitsFactType("amount", "$2,400 plus my costs");
  check("\"$2,400 plus my costs\" is 2,400 with \"plus my costs\" as its note", fits.ok && fits.value === 2400 && fits.note === "plus my costs", JSON.stringify(fits));
  check("words that are not one amount are not an amount (\"about two thousand\")", !fitsFactType("amount", "about two thousand").ok);
  const file = emptyCaseFile();
  give(file, "amount", "about two thousand", "sc-amount-claimed");
  check("the one writer keeps no words as an amount", file.amount.state === "not-asked", JSON.stringify(file.amount));
  const fence = caseFileOf({ version: 1, flowId: "f10", courtPath: "small-claims", revision: "f10", sections: { builder: { initialAnswers: { "sc-amount-claimed": "$2,400 plus my costs" } } } } as never);
  check("the case file holds 2,400 and its note (finding 10 kept)", fence.amount.value === 2400 && fence.amount.note === "plus my costs", JSON.stringify(fence.amount));
});

part("Names and places (S2: \"Gatineau, Quebec\")", () => {
  check("\"Gatineau\" is not a name", !fitsFactType("otherParty", "Gatineau").ok && !partyDetailFits("firstName", "Gatineau"));
  check("\"Gatineau, Quebec\" (S2's answer to where the contractor is) is not a name", !fitsFactType("otherParty", "Gatineau, Quebec").ok && !partyDetailFits("firstName", "Gatineau, Quebec"));
  check("\"Gatineau\" is a city", partyDetailFits("city", "Gatineau"));
  check("self-test: a real name is a name (\"Pat Testfield\", \"Testgoods Ltd.\", \"Alex\")", ["Pat Testfield", "Testgoods Ltd.", "Alex"].every((name) => fitsFactType("otherParty", name).ok && partyDetailFits("fullName", name)));
  check("self-test: a name that holds a place word is still a name (\"Ottawa Paving Inc.\")", fitsFactType("otherParty", "Ottawa Paving Inc.").ok);
  const file = emptyCaseFile();
  give(file, "otherParty", "Gatineau, Quebec", "home:where-is-the-contractor");
  check("the one writer keeps no place as the other party", file.otherParty.state === "not-asked", JSON.stringify(file.otherParty));
  const reading = [{ label: "Other party", value: "Gatineau" }];
  check("the one offer place offers no place as the other party", offeredOtherParty("My contractor in Gatineau kept my deposit.", reading) === null);
  const record: PartiesRecord = { version: 1, declined: [], list: [{ id: "you", you: true, side: "yours", kind: "person", details: {}, unsure: [] }, { id: "o1", side: "other", kind: "person", details: {}, unsure: [] }] } as PartiesRecord;
  const offers = storyPartyOffers("My contractor kept my $1,200 deposit.", record, { value: "Gatineau", quote: "Gatineau" });
  check("the Parties step offers no place as a name", offers.every((offer) => !/name/i.test(offer.detail) || offer.value !== "Gatineau"), JSON.stringify(offers));
});

part("Dates", () => {
  check("a sentence with no day or time is not a date", !fitsFactType("whenHappened", "The contractor's work was bad.").ok);
  check("self-test: a rough time is a date (\"June 2026\", \"last summer\")", fitsFactType("whenHappened", "June 2026").ok && fitsFactType("whenHappened", "last summer").ok);
  check("self-test: \"No court date yet\" answers a date", fitsFactType("courtDate", "No court date yet").ok);
});

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nEvery fact has a type, and only a value of its type is kept.");
process.exit(failed ? 1 : 0);
