/**
 * AN ANSWER GIVEN TO THE HOME PAGE'S QUESTIONS IS NEVER ASKED AGAIN (Chrome check of #550, 5b, 5c, 5d; site owner,
 * 14 Nov 2026: "a fact already given or marked 'I'm not sure' is never asked again, and every page reads the record").
 *
 * The home page's questions are written by the model each time; the case file knows the fact each one asks for only
 * through the one word reader (factsOfQuestion.ts factOfAskedText). Chrome saw four facts asked again because the
 * reader did not know the question's words, or the situation answers did not stop the home page asking:
 *   5b  being sued: "Has anything happened in the court case since you received the claim?" after the start screen's
 *       "Has anything else happened in the case since you were served?" was answered;
 *   5b  "A claim of your own against them" offered after the person said they only want to defend the claim;
 *   5c  Family: "Is anything urgent, like a deadline this week, a safety worry, ..." after "No safety concerns";
 *   5d  Civil: "Who is the other side?" after the home page's question about who bought the goods was answered.
 *
 * What it asserts, with no browser, model or database:
 *   1. the home page drops a question about what has happened in the case once the start screen holds the answer;
 *   2. an answer to the home page's question about a claim of the person's own is the person's outcome: neither the
 *      chat's outcome question nor its counterclaim question is asked or offered again;
 *   3. an answer to the home page's safety question is held as safety: the Family chat's "anything urgent" question
 *      no longer asks about a safety worry (it still asks the rest);
 *   4. an answer to the home page's question about who the other side is, in the words the model uses for it
 *      (the buyer, who you sold to, the company's name), is the other party: the Civil chat does not ask it again;
 *   5. none of these words are read as a fact they do not ask about (the reader stays narrow).
 *
 * WHAT FAILURE THIS CATCHES: a home-page answer the case file does not know, so a later screen asks it again.
 *
 * Run: npm run test:home-answers-held
 */
import assert from "node:assert/strict";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { factOfAskedText } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { chatMayAsk, questionStatus } from "../../src/lib/case-system/caseFile/factStatus";
import { understandCase } from "../../src/lib/case-system/understanding/understandCase";
import { familyGuidedFields } from "../../app/builder/_components/guidedFields";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

type Fields = { guidedQuestion?: (field: { key: string; question?: string }, file: ReturnType<typeof caseFileOf>) => string };

const ID = "00000000-0000-4000-8000-000000000514";
const checkpoint = (courtPath: Checkpoint["courtPath"], sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath, revision: ID, sections: { story: { text: "Synthetic story." }, ...sections } as never });
const home = (question: string, answer: string) => ({ home: { understoodAnswers: [{ question, answer }] } });
const SERVED = { situation: { record: { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims", courtFrom: "papers", stage: "just-served" } } };

async function main() {
  const fields = await import("../../app/builder/_components/guidedFields") as Fields;
  let failed = 0;
  const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };

  await check("1. being sued: the home page does not ask what has happened in the case once the start screen holds it", async () => {
    const asked = ["Has anything happened in the court case since you received the claim?", "Has anything else happened in the case since you were served?", "Since you were served, has anything else happened in the case?"];
    const reason = async () => JSON.stringify({ summary: "Synthetic.", facts: [], matters: [{ title: "Your matter", court: "small-claims" }], mainCourt: "small-claims", side: "responding", stage: "", questions: [...asked, "What was the agreed price for the work?"].map((question) => ({ question, why: "Synthetic." })), asksForPrediction: false, step: null, points: [] });
    const result = await understandCase({ story: "A contractor sued me for $4,200.", situation: { side: "responding", servedOn: "2026-10-20", filed: true, stageGiven: true } } as never, { reason, intakeOnly: true, check: { answer: async () => ({ status: "unavailable", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] }) } as never });
    assert.equal(result.status, "understood");
    const questions = result.status === "understood" ? result.understanding.questions.map((item) => item.question) : [];
    assert.deepEqual(questions, ["What was the agreed price for the work?"], `still asked: ${questions.join(" | ")}`);
  });

  for (const [question, answer] of [
    ["Do you want to make a claim of your own against the contractor?", "No, I only want to defend the claim."],
    ["Do you believe the contractor owes you money?", "No. I am not seeking money from the contractor."],
    ["Are you planning to bring a counterclaim?", "No."],
  ] as const) {
    await check(`2. "${question}": the outcome is held; neither the outcome nor the counterclaim question is asked again`, () => {
      const file = caseFileOf(checkpoint("small-claims", { ...SERVED, ...home(question, answer) }));
      assert.equal(factOfAskedText(question, { responding: true }), "outcome", "the word reader does not know this question");
      for (const id of ["sc-defendant-outcome", "sc-defendant-counterclaim"]) assert.ok(!["ask", "offer"].includes(questionStatus(file, id)), `${id} may still be asked: ${questionStatus(file, id)}`);
    });
  }

  await check("3. Family: after \"No safety concerns\", the urgent question no longer asks about a safety worry", () => {
    const file = caseFileOf(checkpoint("family", home("Are there any immediate safety concerns for you or your child?", "No safety concerns.")));
    assert.equal(factOfAskedText("Are there any immediate safety concerns for you or your child?"), "safety", "the word reader does not know the safety question");
    assert.equal(typeof fields.guidedQuestion, "function", "guidedFields.ts guidedQuestion does not exist");
    const urgent = familyGuidedFields({ issues: [], filed: [] }).find((field) => field.key === "urgent")!;
    const asked = fields.guidedQuestion!(urgent, file);
    assert.ok(!/safety/i.test(asked), `still asks about safety: ${asked}`);
    assert.ok(/urgent/i.test(asked) && /deadline/i.test(asked), `the rest of the question is lost: ${asked}`);
    const fresh = caseFileOf(checkpoint("family", {}));
    assert.equal(fields.guidedQuestion!(urgent, fresh), urgent.question, "with nothing held, the question is asked whole");
  });

  for (const question of ["Who bought the goods from you?", "Who did you sell the goods to?", "Who is the buyer, and where are they located?", "What is the name of the company that bought the goods?", "What is the full legal name of the business?"]) {
    await check(`4. Civil: "${question}" holds the other party; "Who is the other side?" is not asked again`, () => {
      const file = caseFileOf(checkpoint("civil", home(question, "Testgoods Ltd., in Ottawa.")));
      assert.equal(factOfAskedText(question), "otherParty", "the word reader does not know this question");
      assert.equal(chatMayAsk(file, "otherParty"), false, "the Civil chat may still ask who the other side is");
    });
  }

  await check("5. the reader stays narrow: questions that ask something else name no fact", () => {
    for (const question of ["What did the buyer say about the goods?", "Did the company send you an invoice?", "What safety rules did the store post?", "What would you like to know?", "Has the buyer paid anything at all?", "Was anyone else hurt?"]) {
      assert.equal(factOfAskedText(question), null, `"${question}" was read as ${factOfAskedText(question)}`);
    }
    // "Owes you money" is the outcome only for a person being sued; asked of a person suing, it names no fact here.
    assert.equal(factOfAskedText("Do you believe Alex still owes you money?"), null, "read as a fact for the person suing");
    {
    }
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
