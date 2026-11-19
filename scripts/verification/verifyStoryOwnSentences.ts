/**
 * THE STORY IS THE PERSON'S OWN STORY SENTENCES; FOLLOW-UP ANSWERS ARE NEVER GLUED ONTO IT (Chrome pass 3 on #550,
 * 19 Nov 2026, the worst finding).
 *
 * Chrome saw its answers to the home page's follow-up questions stuck onto the end of the story, and printed in the
 * Form 7A "Reasons for claim" box and the form's "Case story" box: S1 "...$18.45 for medicine. 100 Sample Road, Ottawa
 * ON K1B 0B1 Circle K Convenience Stores Ltd.", S2 "...kept my $1,200 deposit. Gatineau, Quebec. 8 rue de l'Église...
 * Only the $1,200 deposit", S7 "...I want a parenting schedule. No No safety concerns". Cause: the home page's one
 * writer (personWords.ts frontDoorStory, called by HomeLocationGate.tsx goToIntake) added every answer to the story
 * (13 Nov rule, so the intake would not ask them again). The answers are held as answers already
 * (home.understoodAnswers, read into the case file and the Parties step).
 *
 * The rule (site owner, 19 Nov): the reasons, the claim draft and every document use the person's own story sentences
 * only; follow-up answers go where they belong; an answer may stand as its own sentence only if the person wrote a full
 * sentence.
 *
 * What it asserts, with no browser, model or database, in all three courts:
 *   1. the writer: Chrome's S1, S2 and S7 answers (fragments) leave the story exactly as typed; a full-sentence answer
 *      ("I don't know where the water came from.") stays, as its own paragraph;
 *   2. the home page holds the answers as answers when it leaves (HomeLocationGate.tsx puts home.understoodAnswers);
 *   3. a case saved the old way (fragments glued on): the case file's story, and the Form 7A reasons, hold the story
 *      only (Small Claims, Civil, Family), and the answers are still held (answeredInIntake);
 *   4. never the person's own words: a last paragraph that is NOT one of the case's recorded answers stays, and so
 *      does the first paragraph even when it equals an answer;
 *   5. the follow-up answers about the law: a fragment answer never reaches a draft; a full sentence does;
 *   6. build check: the story section's text is written in one place on the home page, through frontDoorStory.
 *
 * WHAT FAILURE THIS CATCHES: an answer fragment (an address, a name, "No", an amount) in a stored story, a 7A reasons
 * box or a draft, in any court.
 *
 * Run: npm run test:story-own-sentences
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { frontDoorStory, personWordsOnly } from "../../src/lib/case-system/personWords";
import { answeredInIntake, caseFileOf, storyOfFile } from "../../src/lib/case-system/caseFile/caseFile";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failed = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`); }
}

// Chrome's stories and answers, pass 3 (made-up details only).
const S1 = "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. I missed 3 days of work (Oct 5 to 7) at $150 a day and bought Tylenol and an ice pack for $18.45. I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.";
const S1_ANSWERS = [
  { question: "What is the street address of the Circle K where you fell?", answer: "100 Sample Road, Ottawa ON K1B 0B1" },
  { question: "Which company operates the store?", answer: "Circle K Convenience Stores Ltd." },
];
const S2 = "My contractor left the work unfinished and kept my $1,200 deposit.";
const S2_ANSWERS = [
  { question: "Where do you live?", answer: "Gatineau, Quebec." },
  { question: "Where was the work done?", answer: "8 rue de l'Église, Gatineau QC J8X 1A1" },
  { question: "Where is the contractor based?", answer: "Saint-Jérôme Rénovations Ltée, 8 rue de l'Église, Gatineau QC J8X 1A1" },
  { question: "Are you claiming anything beyond the deposit?", answer: "Only the $1,200 deposit" },
];
const S7 = "My partner and I separated in June 2026. We have a 6-year-old. I want a parenting schedule.";
const S7_ANSWERS = [
  { question: "Is there an existing court order or written agreement about parenting?", answer: "No" },
  { question: "Are there any concerns about violence, your child's safety, or your child being taken away without agreement?", answer: "No safety concerns" },
  { question: "Is anything urgent, like a deadline this week?", answer: "No" },
];
const SENTENCE = "I don't know where the water came from.";


/** A saved checkpoint the old way: the fragments glued on as paragraphs, and held as answers. */
function oldCheckpoint(court: "small-claims" | "civil" | "family", story: string, answers: { question: string; answer: string }[]): Checkpoint {
  return { version: 1, flowId: "story-own-sentences", courtPath: court, revision: "r1",
    sections: { story: { text: [story, ...answers.map((item) => item.answer)].join("\n\n"), location: { province: "Ontario", city: "Ottawa" } }, home: { understoodAnswers: answers } } } as unknown as Checkpoint;
}
const noFragment = (where: string, text: string, answers: { answer: string }[]) => {
  for (const { answer } of answers) assert.ok(!text.includes(answer), `${where} holds the answer "${answer}":\n${text.slice(-300)}`);
};

check("1. the writer: S1, S2 and S7's fragment answers leave the story exactly as typed", () => {
  assert.equal(frontDoorStory(S1, S1_ANSWERS), S1);
  assert.equal(frontDoorStory(S2, S2_ANSWERS), S2);
  assert.equal(frontDoorStory(S7, S7_ANSWERS), S7);
});
check("1b. the writer: a full-sentence answer stays, as its own paragraph", () => {
  assert.equal(frontDoorStory(S1, [...S1_ANSWERS, { question: "What made the floor wet?", answer: SENTENCE }]), `${S1}\n\n${SENTENCE}`);
});

check("2. the home page holds the answers as answers when it leaves (home.understoodAnswers)", () => {
  const source = readFileSync("app/_components/HomeLocationGate.tsx", "utf8");
  assert.ok(/recovery\.put\("home", "understoodAnswers", answers/.test(source), "the same-flow path does not put home.understoodAnswers");
  assert.ok(/understoodAnswers: answers/.test(source), "the new-case path does not carry home.understoodAnswers");
});

for (const court of ["small-claims", "civil", "family"] as const) {
  for (const [name, story, answers] of [["S1", S1, S1_ANSWERS], ["S2", S2, S2_ANSWERS], ["S7", S7, S7_ANSWERS]] as const) {
    check(`3. ${court} ${name}: a story saved the old way reads as the story only; the answers are still held`, () => {
      const checkpoint = oldCheckpoint(court, story, [...answers]);
      const file = caseFileOf(checkpoint);
      assert.equal(storyOfFile(file).trim(), story);
      noFragment("the Form 7A reasons", formContextOf(checkpoint).reasons, answers);
      const held = answeredInIntake(checkpoint.sections as Record<string, unknown>).map((item) => item.answer);
      for (const { answer } of answers) assert.ok(held.includes(answer), `the answer "${answer}" is no longer held`);
    });
  }
}

check("4. never the person's own words: a paragraph that is not a recorded answer stays; so does the first paragraph", () => {
  const own = "Circle K Convenience Stores Ltd.";
  const checkpoint = { ...oldCheckpoint("small-claims", S1, []), sections: { story: { text: `${S1}\n\n${own}` }, home: { understoodAnswers: [{ question: "Q", answer: "100 Sample Road, Ottawa ON K1B 0B1" }] } } } as unknown as Checkpoint;
  assert.ok(storyOfFile(caseFileOf(checkpoint)).includes(own), "a paragraph the person wrote was removed");
  const first = { ...checkpoint, sections: { story: { text: `${own}\n\nMore of my story.` }, home: { understoodAnswers: [{ question: "Q", answer: own }] } } } as unknown as Checkpoint;
  assert.ok(storyOfFile(caseFileOf(first)).startsWith(own), "the first paragraph was removed");
  const sentence = { ...checkpoint, sections: { story: { text: `${S1}\n\n${SENTENCE}` }, home: { understoodAnswers: [{ question: "Q", answer: SENTENCE }] } } } as unknown as Checkpoint;
  assert.ok(storyOfFile(caseFileOf(sentence)).includes(SENTENCE), "a full sentence of the person's own was removed");
});

check("5. the follow-up answers about the law: a fragment never reaches a draft; a full sentence does", () => {
  const text = `${S1}\n\nAnswers to follow-up questions about the law that applies:\nQ: Was there a sign?\nA: No\nQ: How much?\nA: Only the $1,200 deposit\nQ: Did the defendant agree in writing?\nA: Yes, we signed a contract.`;
  const words = personWordsOnly(text);
  assert.ok(!/\bNo\b\s*$/m.test(words) && !words.includes("Only the $1,200 deposit"), `a fragment answer reached the draft text:\n${words}`);
  assert.ok(words.includes("Yes, we signed a contract."), "a full-sentence answer was lost");
});

check("6. build check: the home page writes the story's text in one place, through frontDoorStory", () => {
  const source = readFileSync("app/_components/HomeLocationGate.tsx", "utf8");
  const writes = source.match(/put\(STORY_SECTION, "text", ([^,]+),/g) ?? [];
  assert.equal(writes.length, 1, `story text written ${writes.length} times`);
  assert.ok(/const story = frontDoorStory\(facts, answers\)/.test(source) && /put\(STORY_SECTION, "text", story,/.test(source), "the written story is not frontDoorStory's");
});

console.log(failed ? `\n${failed} check(s) failed` : "\nAll story-own-sentences checks passed");
process.exitCode = failed ? 1 : 0;
