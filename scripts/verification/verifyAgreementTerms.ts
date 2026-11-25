/**
 * WHAT WAS AGREED IS ONE CASE-FILE FACT, ASKED ONCE (C9, site owner, 23 Nov 2026).
 *
 * The AI-written question "What are the specific terms of the contract with the contractor?" was dropped because the
 * case file had no fact for the terms of an agreement. The owner: "Dropping a useful question is the wrong fix. Add a
 * proper case-file fact for the terms of the agreement (what was agreed, in the person's words), so the question carries
 * that fact, is asked once, is dropped once it is answered or stated in the story, and is saved to the one case record."
 *
 * What it checks:
 *   1. the one word reader names agreementTerms for the AI's terms questions, and never for an order, a parenting
 *      agreement, the proof of one, or its dates;
 *   2. the AI's terms question is kept by the grounding gate, carrying agreementTerms (it was dropped);
 *   3. the case file holds it from the one record: a typed depth answer (guided.depthStateMap), a story offer the person
 *      kept (guided.earlierAnswers), "I don't know" (not sure), and an older saved case's element record;
 *   4. asked once: the Small Claims depth questions about the agreement and the AI's question (in every court) are not
 *      asked once the case file holds it, and are asked while it does not;
 *   5. the words-only "What to confirm next" never asks it once the story says what was agreed, and still asks it when
 *      the story says nothing of the kind (or denies any agreement);
 *   6. the Small Claims depth phase filters its questions and offers through the one function.
 *
 * WHAT FAILURE THIS CATCHES: the terms question lost again (dropped for naming no fact), or asked after the person
 * answered it, said they don't know, or wrote it in their story. On the code before this change, 2, 3, 4 and 5 fail.
 *
 * Run: npm run test:agreement-terms
 */
import fs from "node:fs";
import { factOfAskedText, factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { caseFileOf, emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { factStatus, mayAskWords, mayShowQuestion } from "../../src/lib/case-system/caseFile/factStatus";
import { quotesOf, statedInStory } from "../../src/lib/case-system/intakeReview";
import { verifyGroundedCognition } from "../../src/lib/case-system/intelligence/groundedCognition";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const TERMS_QUESTION = "What are the specific terms of the contract with the contractor?";
const DEPTH_IDS = ["depth-contractor-agreement", "depth-services-agreement", "depth-goods-contract-agreement", "depth-goods-agreement", "depth-commercial-terms", "depth-debt-agreement", "depth-loan-agreement"];

// 1. The one word reader.
for (const words of [TERMS_QUESTION, "What payment due date or payment terms did you agree on?", "What were the terms of the agreement?", "What did you and the contractor agree to?", "What exactly was agreed?"]) {
  check(`1. reads agreementTerms: "${words}"`, factOfAskedText(words) === "agreementTerms", String(factOfAskedText(words)));
}
for (const words of ["Is there already a court order or agreement?", "Do you and the other parent have a written parenting agreement?", "What proof do you have of the agreement, such as messages, invoices, receipts, or emails?", "What are the exact dates of the agreement, payment, and any communications?", "When was payment due under your agreement?"]) {
  check(`1. never agreementTerms: "${words}"`, factOfAskedText(words) !== "agreementTerms", String(factOfAskedText(words)));
}
for (const id of DEPTH_IDS) check(`1. the depth question ${id} asks agreementTerms`, factsOfQuestion(id).includes("agreementTerms" as never));

// 2. Kept by the grounding gate, with its fact.
{
  const { cognition } = verifyGroundedCognition({ missingInformation: [{ field: "x", question: TERMS_QUESTION, reason: "Recording it helps." }] } as Record<string, unknown>, { items: [] } as never);
  const kept = ((cognition as Record<string, unknown>).missingInformation as { question: string; fact?: string }[]) ?? [];
  check("2. the AI's terms question is kept, carrying agreementTerms (it was dropped for naming no fact)", kept.some((item) => item.question === TERMS_QUESTION && item.fact === "agreementTerms"), JSON.stringify(kept));
}

// 3. Held from the one record.
const checkpoint = (sections: Record<string, unknown>) => ({ version: 1 as const, flowId: "f", courtPath: "small-claims", revision: "r", sections }) as never;
const typed = caseFileOf(checkpoint({ guided: { depthStateMap: { "existed-agreement-contractor": { elementId: "existed-agreement-contractor", elementName: "An agreement", state: "provided", providedVia: "depth-answer", userText: "He would redo the roof for $6,000 by June.", questionId: "depth-contractor-agreement" } } } }));
check("3. a typed depth answer is the case file's agreementTerms, in the person's words", typed.agreementTerms?.state === "answered" && typed.agreementTerms.value === "He would redo the roof for $6,000 by June." && factStatus(typed, "agreementTerms") === "known", JSON.stringify(typed.agreementTerms));
const kept = caseFileOf(checkpoint({ guided: { earlierAnswers: [{ questionId: "depth-services-agreement", answerText: "Ten hours of cleaning at $40 an hour." }] } }));
check("3. a story offer the person kept (earlierAnswers) is agreementTerms", factStatus(kept, "agreementTerms") === "known", JSON.stringify(kept.agreementTerms));
const dontKnow = caseFileOf(checkpoint({ guided: { depthStateMap: { "existed-agreement-goods": { elementId: "existed-agreement-goods", elementName: "An agreement", state: "cannot-provide", questionId: "depth-goods-contract-agreement" } } } }));
check("3. \"I don't know\" is not sure (settled), never asked again", factStatus(dontKnow, "agreementTerms") === "settled", JSON.stringify(dontKnow.agreementTerms));
const older = caseFileOf(null, { intakeData: { extra: { elementStateMap: { "existed-agreement-contractor": { state: "provided", userText: "A written quote for the deck.", questionId: "depth-contractor-agreement" } } } } });
check("3. an older saved case's element record is read too", factStatus(older, "agreementTerms") === "known", JSON.stringify(older.agreementTerms));

// 4. Asked once.
for (const id of DEPTH_IDS) check(`4. ${id}: asked while nothing is held, never once it is`, mayShowQuestion(emptyCaseFile(), id) && !mayShowQuestion(typed, id) && !mayShowQuestion(dontKnow, id));
check("4. the AI's question: asked while nothing is held, never once it is (answered or not sure)", mayAskWords(emptyCaseFile(), TERMS_QUESTION, { wordsOnly: { storySays: {} } }) && !mayAskWords(typed, TERMS_QUESTION, { wordsOnly: { storySays: {} } }) && !mayAskWords(dontKnow, TERMS_QUESTION, { wordsOnly: { storySays: {} } }));
for (const court of ["small-claims", "civil", "family"]) {
  const held = { ...emptyCaseFile(), area: court, agreementTerms: { state: "answered" as const, value: "Held.", confirmed: true, source: { kind: "answer" as const, question: "held" } } };
  check(`4. ${court}: the AI's question is never asked once the case file holds what was agreed`, !mayAskWords(held, TERMS_QUESTION, { court, wordsOnly: { storySays: {} } }));
}

// 5. Stated in the story.
const storyFile = (story: string) => ({ ...emptyCaseFile(), storyText: story });
// What the one story reader reads, as "What to confirm next" passes it (IntelligenceOverviewPanel.tsx).
const says = (story: string) => quotesOf(statedInStory(story));
const agreementTermsIn = (story: string) => says(story).agreementTerms;
const STATED = ["We agreed he would redo the roof for $6,000 by June. He left after two days.", "The written quote said the deck would be finished in two weeks.", "I hired a contractor in May. They promised to finish the kitchen by July 1."];
for (const story of STATED) check(`5. the story says what was agreed: not asked ("${story.slice(0, 40)}...")`, Boolean(agreementTermsIn(story)) && !mayAskWords(storyFile(story), TERMS_QUESTION, { wordsOnly: { storySays: says(story) } }));
const NOT_STATED = ["My contractor left my roof half done in May 2026.", "I never agreed to pay extra, but he billed me $900 more.", "We have a court order about parenting time."];
for (const story of NOT_STATED) check(`5. the story does not say what was agreed: still asked ("${story.slice(0, 40)}...")`, !agreementTermsIn(story) && mayAskWords(storyFile(story), TERMS_QUESTION, { wordsOnly: { storySays: says(story) } }));

// 6. The depth phase and the overview read the one function.
const chat = fs.readFileSync("app/builder/_components/GuidedSmallClaimsIntake.tsx", "utf8");
check("6. the depth phase drops a question whose fact the case file holds", /result\.questions = result\.questions\.filter\(\(question\) => mayShowQuestion\(depthFile, question\.id\)\)/.test(chat));
check("6. the depth phase drops a story offer whose fact the case file holds", /result\.proposals = \(result\.proposals \?\? \[\]\)\.filter\(\(proposal\) => mayShowQuestion\(depthFile, proposal\.questionId\)\)/.test(chat));
const overview = fs.readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
check("6. \"What to confirm next\" asks in words only, with the one story reader's reading (never what the story says)", /missingWords\(caseFile, candidateQuestions, \{[^}]*responding: respondingFromRecord\(caseFile \?\? undefined\), wordsOnly: \{ storySays: storyReading \} \}\)/.test(overview) && /const storyReading = quotesOf\(statedInStory\(/.test(overview));
// What was agreed is read, never offered: it is not one of the facts the story offers (STORY_STATED_FACTS).
check("6. what was agreed is never offered from the story (not a stated fact)", !("agreementTerms" in statedInStory(STATED[0])));

console.log(failures ? `\n${failures} check(s) failed.` : "\nWhat was agreed is one case-file fact: carried by the AI's question, asked once, never after it is held or in the story.");
process.exit(failures ? 1 : 0);
