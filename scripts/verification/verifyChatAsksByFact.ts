/**
 * THE CHAT ASKS BY FACT: A FACT THE SAVED CASE HOLDS IS NEVER ASKED BY A CHAT (never ask twice, row 1, 29 Oct).
 *
 * The follow-up chat closed its replies with fixed sentences ("What are you trying to get or fix
 * through the legal process?", "What are the main dates...?", "Has anything already been filed...?")
 * that did not read the case file, so it asked what the person wants after the review had recorded
 * their answer, or their "I don't know yet" (story pack, 28-29 Oct: 33 held and 11 twice repeats of
 * "wants" on the results page). Now every chat question carries the fact it asks for and passes the
 * one gate (caseFile.ts chatMayAsk): a fact held answered, or held "not sure", is not asked by a chat;
 * an unsure fact is offered once more only in the review or as the story's suggestion.
 *
 * Checks, as properties, in Small Claims, civil and Family:
 *   1. Through the real chat route (chatRouteHarness.ts), with a saved case holding what they want
 *      (as "I don't know yet", and as an answer), when it happened, that nothing is filed and (Family)
 *      the children: no question sentence in any reply asks for a held fact. The fact a sentence asks
 *      for is read by the browser test's own table (tests/browser/harness/chatQuestionFacts.ts), never
 *      by the site's map, and "held" is read as the story pack reads it (askOnce.ts heldFacts).
 *   2. Control: the same case with nothing held does ask for those facts, so check 1 can fail.
 *   3. Every question sentence the chat can write (the engine's own, the issue frameworks', the
 *      reasoning profiles' first questions, the general question's parts) that asks a case-file fact,
 *      by the test's table, is one the gate stops when that fact is held.
 *   4. The questions one at a time (GuidedFormChat) offer an unsure fact again as the story's
 *      suggestion only once: never after the review's "I don't know yet" (CI 29 Oct, family-safety:
 *      the children offered again on the results page).
 *
 * Failure it exists to catch: any chat asking again, in any wording, for a fact the case file holds.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chatReplies, type Court } from "./chatRouteHarness";
import { factsOfWords, questionSentences } from "../../tests/browser/harness/chatQuestionFacts";
import { heldFacts } from "../../tests/browser/harness/askOnce";
import { caseFileOf, chatMayAsk, emptyCaseFile, offeredOnceMore, SLOT_FACTS, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { chatQuestionId } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000511";
const isSlot = (fact: string): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact);

// The chat asks one question a reply, the most pressing first: the dates when the story has none, then
// whether anything is filed while the stage is open, then what they want. So three set-ups, each
// with no word of what they want: no date or proof (the dates are asked); dated, with proof, the
// stage open (filed); dated, with proof, the stage known (what they want).
type Setup = { name: string; story: Record<Court, string>; stageOpen: boolean };
const SETUPS: Setup[] = [
  { name: "no dates", stageOpen: true, story: {
    "small-claims": "A contractor took my deposit for a deck and never came back to build it.",
    civil: "A contractor took my deposit for a home addition and never came back to build it.",
    family: "My former partner and I cannot agree about our son.",
  } },
  ...[true, false].map((stageOpen) => ({ name: stageOpen ? "dated, stage open" : "dated, stage known", stageOpen, story: {
    "small-claims": "On May 12, 2026 a contractor took my deposit for a home addition and never came back. I have the receipt and his texts.",
    civil: "On May 12, 2026 a contractor took my deposit for a home addition and never came back. I have the receipt and his texts.",
    family: "My former partner and I separated on May 12, 2026 and cannot agree about our son. I have our text messages.",
  } })),
];
const WANTS_QUESTION: Record<Court, string> = { "small-claims": "sc-remedy-sought", civil: "legalRemedy", family: "goal" };
// The story pack's two questions (a question gets "To keep your case record complete: ..."), and plain replies.
const CONVERSATIONS = [
  ["What should I gather first?", "How long do I have to respond?"],
  ["I am not sure what to do.", "What is the most important thing I should clarify next?", "It happened last spring.", "Thanks."],
];

/** A saved case's checkpoint: what they want (unsure or answered), when it happened, nothing filed, and (Family) the children. */
function holding(court: Court, story: string, wants: "unsure" | "answered" | "none"): Checkpoint {
  const sections: Record<string, unknown> = { story: { text: story } };
  if (wants !== "none") {
    sections.situation = { record: { where: "starting", filed: "nothing", court } };
    sections.builder = {
      initialAnswers: { timelineText: "2026-05-12", ...(wants === "answered" ? { [WANTS_QUESTION[court]]: "The deposit back" } : {}) },
      initialUnknowns: wants === "unsure" ? [WANTS_QUESTION[court]] : [],
      ...(court === "family" ? { triageState: { record: { caseInvolvesChildren: "yes" } } } : {}),
    };
  }
  return { version: 1, flowId: ID, courtPath: court, revision: ID, sections } as unknown as Checkpoint;
}

/** Every question sentence of the chat's replies for this saved case, with the facts the test's table reads in it. */
async function asked(court: Court, setup: Setup, wants: "unsure" | "answered" | "none") {
  const story = setup.story[court];
  // The stage open or known, as the route reads the saved position.
  const master = { intakeCheckpoint: holding(court, story, wants), ...(setup.stageOpen ? { position: { confirmedStage: null, stepId: null, dateAnswers: {} } } : {}) };
  const sentences: { sentence: string; facts: string[] }[] = [];
  for (const messages of CONVERSATIONS) {
    // The route logs each request; only this suite's lines are wanted here.
    const log = console.log, info = console.info;
    console.log = () => undefined; console.info = () => undefined;
    const replies = await chatReplies(court, story, messages, setup.stageOpen ? { caseStage: "not-sure" } : {}, master).finally(() => { console.log = log; console.info = info; });
    const errors = replies.filter((reply) => reply.startsWith("ERROR"));
    if (errors.length) check(`${court}: the chat route answered`, false, errors.join(" | "));
    sentences.push(...replies.flatMap((reply) => questionSentences(reply)).map((sentence) => ({ sentence, facts: factsOfWords(sentence) })));
  }
  return { master, sentences };
}

(async () => {
  // 1 and 2: through the route.
  const controlFacts = new Set<string>();
  for (const court of ["small-claims", "civil", "family"] as const) for (const setup of SETUPS) {
    const control = await asked(court, setup, "none");
    for (const item of control.sentences) for (const fact of item.facts) controlFacts.add(fact);

    for (const wants of ["unsure", "answered"] as const) {
      const { master, sentences } = await asked(court, setup, wants);
      const held = heldFacts(master, court);
      const mustHold = ["wants", "whenHappened", "filed", ...(court === "family" ? ["children"] : [])];
      check(`${court}, ${setup.name} (wants ${wants}): the saved case holds ${mustHold.join(", ")}`, mustHold.every((fact) => held.has(fact)), JSON.stringify([...held]));
      const repeats = sentences.filter((item) => item.facts.some((fact) => held.has(fact)));
      check(`${court}, ${setup.name} (wants ${wants}): no chat question asks for a fact the saved case holds`, repeats.length === 0, repeats.map((item) => `${item.facts.join("+")}: "${item.sentence}"`).join(" | "));
    }
  }

  const expected = ["wants", "whenHappened", "filed"];
  check(`control -- with nothing held, the chat asks for ${expected.join(", ")} (so the checks above can fail)`, expected.every((fact) => controlFacts.has(fact)), [...controlFacts].join(", ") || "(no question)");

  // 3. Every sentence the chat can write, from the site's own files: a fact it asks for is stopped when held.
  const ROOT = process.cwd();
  const sources = [
    "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts",
    "src/lib/case-system/knowledge/legalReasoningProfiles.ts",
    "src/lib/content-library/assistantBlocks.ts",
  ];
  let seen = 0;
  for (const file of sources) {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    for (const match of text.matchAll(/["`]([^"`\n]{8,}\?)["`]/g)) {
      const sentence = match[1];
      for (const fact of factsOfWords(sentence).filter(isSlot)) {
        seen += 1;
        const file1 = { ...emptyCaseFile(), [fact]: { state: "unsure", confirmed: true } };
        check(`"${sentence.slice(0, 70)}" (${fact}) is not asked once ${fact} is held`, !chatMayAsk(file1, chatQuestionId(sentence)), `reads as ${chatQuestionId(sentence)}`);
      }
    }
  }
  check("the chat's sentences that ask a case-file fact were found", seen >= 8, String(seen));
  // And a sentence that asks no held fact is still asked (the gate is not shut).
  const allHeld = Object.fromEntries(SLOT_FACTS.map((fact) => [fact, { state: "answered", value: "x", confirmed: true }]));
  check("a question that asks no case-file fact is still asked", chatMayAsk({ ...emptyCaseFile(), ...allHeld }, chatQuestionId("What proof do you currently have?")));

  // 4. The questions one at a time: the story's suggestion of an unsure fact, once in all.
  {
    const sections = { story: { text: SETUPS[0].story.family }, builder: { initialUnknowns: ["childrenInfo"] }, "form-chat": { skipped: ["childrenInfo"] } };
    const file = caseFileOf({ version: 1, flowId: ID, courtPath: "family", revision: ID, sections } as unknown as Checkpoint);
    check("the children, \"I don't know yet\" in the review, are held unsure", file.children.state === "unsure");
    check("after the review's \"I don't know yet\", the children have had their one more offer", offeredOnceMore(file, "children", sections));
    const skippedOnly = { story: { text: SETUPS[0].story.family }, "form-chat": { skipped: ["childrenInfo"] } };
    const chatOnly = caseFileOf({ version: 1, flowId: ID, courtPath: "family", revision: ID, sections: skippedOnly } as unknown as Checkpoint);
    check("skipped only in the questions, the story may still suggest them once", chatOnly.children.state === "unsure" && !offeredOnceMore(chatOnly, "children", skippedOnly));
    const chat = readFileSync(path.join(ROOT, "app/builder/_components/GuidedFormChat.tsx"), "utf8");
    check("GuidedFormChat asks through the one chat gate and bounds the story's offer by offeredOnceMore", /!chatMayAsk\(file, field\.key\)/.test(chat) && /offeredOnceMore\(file, fact/.test(chat));
  }

  if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
  console.log("chat asks by fact: every check passed.");
})();
