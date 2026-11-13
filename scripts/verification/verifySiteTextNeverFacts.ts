/**
 * THE SITE'S OWN QUESTIONS NEVER BECOME THE PERSON'S FACTS (Chrome check of #550, 13 Nov 2026: the worst finding).
 *
 * Chrome saw the site's questions as numbered facts in every Form 7A draft ("10. What is the exact address of the Circle
 * K where you fell?") and inside the Defence draft, and in a Family case the site quoted its own question "Are there any
 * existing court orders or written agreements about parenting?" as "From your story" and hid the court-location rules,
 * although the answer was "No". Cause: the home page's follow-up answers were added to the story as "<question>
 * <answer>" lines (HomeLocationGate.tsx), and the follow-up answers about the law were added to the facts as "Q: ... /
 * A: ..." (sourcedAnswers.ts); every reader that turns the story into facts then read the site's words as the person's.
 *
 * The rule: only the person's own words (their story and their answers) become facts. Site text, question text and
 * option labels never do, in any court.
 *
 * What it asserts, with no browser, model or database:
 *   1. the home page's story (frontDoorStory, the one writer) holds the person's answers and none of the questions;
 *   2. a case saved the old way (questions in the story) reads, through the one reader (personWordsOnly), as the
 *      person's words only: userStory, every starting and responding draft in Small Claims, Family and Civil, and the
 *      Family "From your story" order quote carry no question text, and keep every answer;
 *   3. the follow-up answers about the law: their questions never reach a draft either;
 *   4. build check: HomeLocationGate.tsx builds the story through frontDoorStory and never joins a question into it.
 *
 * The question list is the site's own: the Small Claims question bank, the depth questions, the Family and Civil chat
 * fields, and the questions Chrome saw the home page ask (those are written by the model each time, so the ones seen
 * are listed by their words).
 *
 * WHAT FAILURE THIS CATCHES: any site question, in any court, turning up in a draft, a "From your story" quote or the
 * stored story.
 *
 * Run: npm run test:site-text-never-facts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { DEPTH_QUESTIONS } from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";
import { userStory } from "../../src/lib/case-system/userStory";
import { startingDocumentDraft } from "../../src/lib/case-system/drafts/startingDocumentDraft";
import { respondingDocumentDraft } from "../../src/lib/case-system/drafts/respondingDocumentDraft";
import { existingFamilyOrderQuote } from "../../src/lib/case-system/familyStoryReading";
import { sourcedAnswerListText } from "../../app/builder/_components/sourcedAnswers";

type Words = { personWordsOnly?: (text: string) => string; frontDoorStory?: (story: string, answers: { question: string; answer: string }[]) => string };

/** The questions Chrome saw the home page and the chats ask on 13 Nov (written by the model, so listed by their words). */
const SEEN_QUESTIONS = [
  "What is the exact address of the Circle K where you fell?",
  "Are you still experiencing symptoms from the fall?",
  "Was the tree's trunk entirely on your property, or did it cross the property line?",
  "Do you want your neighbour to pay the replacement cost, or do you want a court order requiring them to replace the tree?",
  "When did you and your neighbour agree that the $800 would be paid?",
  "Has your neighbour given any reason for not paying?",
  "How were the claim papers given to you: handed to you, mailed, left at your home, emailed, or another way?",
  "Are there any existing court orders or written agreements about parenting?",
];

function siteQuestions(): string[] {
  const choice = { issues: [], filed: [], documents: [] } as never;
  const fields = [...familyGuidedFields(choice), ...civilGuidedFields(choice)].map((field) => (field as { question?: string }).question ?? "");
  return [...new Set([...QUESTION_BANK.map((q) => q.text), ...DEPTH_QUESTIONS.map((q) => q.text), ...fields, ...SEEN_QUESTIONS].map((q) => q.trim()).filter((q) => q.length > 12 && q.endsWith("?")))];
}

const STORY = "I slipped on a wet floor at a store on October 4, 2026 and hurt my hip.";
const ANSWER = "No, there are no orders or written agreements.";

async function main() {
  const words = await import("../../src/lib/case-system/personWords").catch(() => ({})) as Words;
  const questions = siteQuestions();
  let failed = 0;
  const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };
  const noQuestion = (where: string, text: string) => {
    const found = questions.find((question) => text.includes(question));
    assert.equal(found, undefined, `${where} holds the site's question ${JSON.stringify(found)}`);
  };
  // A case saved the old way: each question and its answer added to the story as one line.
  const oldStory = [STORY, ...questions.map((question) => `${question} ${ANSWER}`)].join("\n\n");

  check("setup: the site's question list is not empty, in every court's source", () => {
    assert.ok(questions.length >= 30, `only ${questions.length} questions`);
    assert.ok(questions.some((q) => /parenting/.test(q)), "no Family question");
  });

  check("1. the home page's story holds the person's answers and none of the questions", () => {
    assert.equal(typeof words.frontDoorStory, "function", "frontDoorStory (personWords.ts) does not exist");
    const story = words.frontDoorStory!(STORY, questions.map((question) => ({ question, answer: ANSWER })));
    noQuestion("the stored story", story);
    assert.ok(story.startsWith(STORY) && story.includes(ANSWER), "the person's story and answers are kept");
  });

  check("2a. an old case's story reads as the person's words only (userStory), answers kept", () => {
    const story = userStory({ facts: oldStory });
    noQuestion("userStory", story);
    assert.ok(story.includes(STORY) && story.includes(ANSWER));
  });

  for (const court of ["small-claims", "family", "civil"] as const) {
    check(`2b. ${court}: the starting and responding drafts carry no site question`, () => {
      const intake = { facts: oldStory, timeline: "", extra: { story: oldStory } } as never;
      for (const draft of [startingDocumentDraft(court, intake, new Date("2026-11-13T12:00:00Z")), respondingDocumentDraft(court, intake, new Date("2026-11-13T12:00:00Z"))]) {
        if (!draft) continue;
        noQuestion(`${court} ${draft.title}`, draft.sections.map((section) => section.text).join("\n"));
        assert.ok(draft.sections.some((section) => section.text.includes(ANSWER)), `${court} ${draft.title} lost the person's answers`);
      }
    });
  }

  check("2c. Family: the site's question about court orders is never quoted as \"From your story\"", () => {
    assert.equal(typeof words.personWordsOnly, "function", "personWordsOnly (personWords.ts) does not exist");
    assert.equal(existingFamilyOrderQuote(words.personWordsOnly!(oldStory)), null);
  });

  check("3. the follow-up answers about the law: their questions never reach a draft", () => {
    const followUp = sourcedAnswerListText([{ question: "Did the defendant agree in writing to pay for the deck?", answer: "Yes, we signed a contract." }]);
    const facts = `${STORY}\n\n${followUp}`;
    const draft = startingDocumentDraft("small-claims", { facts, timeline: "" } as never, new Date("2026-11-13T12:00:00Z"))!;
    const text = draft.sections.map((section) => section.text).join("\n");
    assert.ok(!text.includes("Did the defendant agree in writing"), "the follow-up question is in the draft");
    assert.ok(!/Answers to follow-up questions/.test(text), "the site's heading is in the draft");
    assert.ok(text.includes("Yes, we signed a contract."), "the person's answer was lost");
  });

  check("4. build check: the home page builds the story through frontDoorStory and joins no question into it", () => {
    const source = readFileSync("app/_components/HomeLocationGate.tsx", "utf8");
    assert.ok(/frontDoorStory\(/.test(source), "HomeLocationGate.tsx does not call frontDoorStory");
    assert.ok(!/item\.question\.trim\(\)\}\s*\$\{item\.answer/.test(source), "HomeLocationGate.tsx still joins a question and its answer into one line");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
