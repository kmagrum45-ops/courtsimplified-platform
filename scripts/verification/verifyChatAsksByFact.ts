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
 *      reasoning profiles' first questions, the general question's parts, and the open parts), against
 *      a hand-written table of everything each asks: one asking a case-file fact is not asked as written
 *      once that fact is held; its id names only facts it asks (no pattern wins wrongly); and, the
 *      reverse, a question asking more than its id's facts keeps that other part (row 1 review, 29 Oct:
 *      "when you first found out", the order in place now, how an amount was worked out).
 *   4. The questions one at a time (GuidedFormChat) offer an unsure fact again as the story's
 *      suggestion only once: never after the review's "I don't know yet" (CI 29 Oct, family-safety:
 *      the children offered again on the results page).
 *   5. The conversation check, through the real chat route in all three areas: a question the chat
 *      asked and the person replied to is not asked again later in the conversation (by its fact, or its
 *      exact words); asked and not replied to, it may be; a compound one drops to its open part (CI story
 *      pack 29 Oct, m19-laptop-repair: "What proof do you already have...?" asked again after a reply).
 *
 * Failure it exists to catch: any chat asking again, in any wording, for a fact the case file holds,
 * or a question it already asked in this conversation and the person replied to.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chatReplies, type Court } from "./chatRouteHarness";
import { factsOfWords, questionSentences } from "../../tests/browser/harness/chatQuestionFacts";
import { heldFacts } from "../../tests/browser/harness/askOnce";
import { caseFileOf, chatQuestionToAsk, emptyCaseFile, offeredOnceMore, SLOT_FACTS, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { chatQuestionId, factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
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

  // 3. Every sentence the chat can write, from the site's own files, both ways (row 1 review, 29 Oct).
  //   Forward: a case-file fact it asks for (by the test's own wording table) is not asked as written
  //     once held; what is asked instead (its open part) asks no held fact.
  //   Reverse: a question that asks for anything beyond its id's facts is never dropped whole when
  //     those facts are held: its other part is still asked. And an id never names a fact the
  //     question does not ask (so no pattern of the chat's, nor the word reader behind it, can win
  //     wrongly: the precedence check for factsOfQuestion.ts CHAT_ASKS over ASKS_FOR).
  // ASKS_ALL: every fact each chat question asks, written by hand (the case file's facts by their slot
  // names; anything else by a name of its own), for every sentence that asks a case-file fact and every
  // open part. A new chat question that asks a case-file fact must be added here, or check (a) fails.
  const ASKS_ALL: Record<string, string[]> = {
    "What are the main dates, including when the problem happened and when you first found out about it?": ["whenHappened", "discoveredDate", "otherDates"],
    "When did you first find out about the problem, and are there other important dates?": ["discoveredDate", "otherDates"],
    "Has anything already been filed, served, ordered, scheduled, or decided by a court or tribunal?": ["filed", "orderOrDecision"],
    "Has a court or tribunal already ordered, scheduled or decided anything?": ["orderOrDecision"],
    "What are you trying to get or fix through the legal process?": ["wants"],
    "What order or arrangement exists right now, and what are you trying to change?": ["existingOrder", "wants"],
    "What order or arrangement exists right now?": ["existingOrder"],
    "Is there already a court order, agreement, upcoming conference, motion, or court date?": ["existingOrder", "courtDate"],
    "Is there already a court order or agreement?": ["existingOrder"],
    "Which public actor is involved, and what exactly did they do or fail to do?": ["otherParty", "whatHappened"],
    "What exactly did they do or fail to do?": ["whatHappened"],
    "Has anything already been filed, ordered, appealed, reviewed, or decided by a court or tribunal?": ["filed", "orderOrDecision"],
    "Has a court or tribunal already ordered, reviewed or decided anything, or has anything been appealed?": ["orderOrDecision"],
    "How much money are you claiming and how did you calculate it?": ["amount", "amountWorkedOut"],
    "How did you work out the amount you are claiming?": ["amountWorkedOut"],
    "What are you asking the court to change?": ["wants"],
    "Which public actor is involved?": ["otherParty"],
    "What are the main dates?": ["whenHappened", "otherDates"],
    "Are there other important dates?": ["otherDates"],
    "What outcome are you seeking?": ["wants"],
    "what outcome are you seeking?": ["wants"],
    "From what you described, it sounds like this may involve ${labels}. Is that right, or is the main concern with someone else?": ["otherParty"],
  };
  const ROOT = process.cwd();
  const sources = [
    "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts",
    "src/lib/case-system/knowledge/legalReasoningProfiles.ts",
    "src/lib/content-library/assistantBlocks.ts",
    "src/lib/case-system/caseFile/factsOfQuestion.ts",
  ];
  const slotsOfId = (sentence: string) => factsOfQuestion(chatQuestionId(sentence)).filter(isSlot);
  const heldOnly = (facts: readonly SlotFact[]) => ({ ...emptyCaseFile(), ...Object.fromEntries(facts.map((fact) => [fact, { state: "unsure", confirmed: true }])) });
  let seen = 0;
  for (const file of sources) {
    const whole = readFileSync(path.join(ROOT, file), "utf8");
    // The site's map: only its list of the chat's questions and their open parts (not its comments).
    const text = file.endsWith("factsOfQuestion.ts") ? whole.slice(whole.indexOf("const CHAT_QUESTIONS"), whole.indexOf("const CHAT_ID_OF_FACT")) : whole;
    for (const match of text.matchAll(/["`]([^"`\n]{8,}\?)["`]/g)) {
      const sentence = match[1];
      const byTable = factsOfWords(sentence).filter(isSlot);
      const byId = slotsOfId(sentence);
      if (!byTable.length && !byId.length) continue;
      seen += 1;
      const all = ASKS_ALL[sentence];
      // (a) Every chat question that asks a case-file fact says what else it asks.
      check(`(a) "${sentence.slice(0, 70)}" is in the test's table of everything each chat question asks`, Boolean(all), `${file}: by the table ${byTable.join()}, by its id ${byId.join()}`);
      if (!all) continue;
      // (b) Its id names only facts it asks (no pattern wins wrongly).
      check(`(b) "${sentence.slice(0, 70)}": its id names only facts it asks`, byId.every((fact) => all.includes(fact)), `id ${chatQuestionId(sentence)} -> ${byId.join()}; asks ${all.join()}`);
      check(`"${sentence.slice(0, 70)}" is asked as written when nothing is held`, chatQuestionToAsk(emptyCaseFile(), sentence) === sentence);
      for (const fact of [...new Set([...byTable, ...byId])]) {
        const asked = chatQuestionToAsk(heldOnly([fact]), sentence);
        // Forward: not asked as written; what is asked instead asks no held fact.
        check(`"${sentence.slice(0, 70)}" (${fact}) is not asked as written once ${fact} is held`, asked !== sentence, `reads as ${chatQuestionId(sentence)}`);
        if (asked) check(`  and what is asked instead asks no held fact: "${asked}"`, !(ASKS_ALL[asked] ?? factsOfWords(asked)).includes(fact) && !slotsOfId(asked).includes(fact));
        // Reverse: a question asking more than the held fact keeps its other part.
        const rest = all.filter((item) => item !== fact);
        if (rest.length) check(`(reverse) "${sentence.slice(0, 70)}" still asks ${rest.join(", ")} once ${fact} is held`, Boolean(asked) && rest.filter((item) => !isSlot(item)).every((item) => (ASKS_ALL[asked!] ?? []).includes(item)), `asked: ${asked ?? "(nothing)"}`);
      }
    }
  }
  check("the chat's sentences that ask a case-file fact were found", seen >= 8, String(seen));
  // A question the case file can never hold is asked, whatever the file holds.
  const allHeld = Object.fromEntries(SLOT_FACTS.map((fact) => [fact, { state: "answered", value: "x", confirmed: true }]));
  for (const sentence of ["What proof do you currently have?", "Is there already a court order or agreement?"]) {
    check(`"${sentence}" (no case-file fact) is still asked with every fact held`, chatQuestionToAsk({ ...emptyCaseFile(), ...allHeld }, sentence) === sentence);
  }
  // The word reader behind the chat's list still reads the home page's questions as before.
  for (const [words, fact] of [["What would you like the court to order?", "wants"], ["How much money are you claiming?", "amount"], ["When were you served?", "servedDate"], ["Who exactly do you want to sue?", "otherParty"]] as const) {
    check(`"${words}" still reads as ${fact}`, slotsOfId(words).join() === fact, slotsOfId(words).join());
  }

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

  // 5. THE CONVERSATION CHECK (site owner, 29 Oct; CI story pack m19-laptop-repair): a chat never asks
  //    again a question it already asked in this conversation that the person replied to. Through the
  //    real chat route, in all three areas: no question sentence of a later reply asks a fact (by the
  //    test's own wording table), or the exact words, of a question in an earlier reply -- every earlier
  //    reply was followed by the person's message.
  {
    const STORIES: Record<Court, string> = {
      "small-claims": "Test Repair Shop kept my laptop on May 12, 2026 and charged me $900 for a repair they never did.",
      civil: "My laptop was left at Test Repair Shop on May 12, 2026 and they kept it and charged $900.",
      family: "We separated on May 12, 2026 and cannot agree about our son.",
    };
    const TALKS = [
      ["What should I gather first?", "How long do I have to respond?"],
      ["How long do I have to respond?", "What should I gather first?", "What is the most important thing I should clarify next?"],
      ["I am not sure what to do.", "ok", "thanks", "What evidence am I missing?"],
    ];
    let compared = 0;
    for (const court of ["small-claims", "civil", "family"] as const) for (const talk of TALKS) {
      const checkpoint = { version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: STORIES[court] } } } as unknown as Checkpoint;
      const log = console.log, info = console.info;
      console.log = () => undefined; console.info = () => undefined;
      const replies = await chatReplies(court, STORIES[court], talk, {}, { intakeCheckpoint: checkpoint }).finally(() => { console.log = log; console.info = info; });
      const askedBefore = new Map<string, string>();
      const repeats: string[] = [];
      replies.forEach((reply, index) => {
        const here = questionSentences(reply).map((sentence) => ({ sentence, keys: factsOfWords(sentence).length ? factsOfWords(sentence) : [sentence] }));
        for (const { sentence, keys } of here) for (const key of keys) if (askedBefore.has(key)) repeats.push(`reply ${index + 1} asks ${key} again: "${sentence}" (asked: "${askedBefore.get(key)}")`);
        for (const { sentence, keys } of here) for (const key of keys) if (!askedBefore.has(key)) askedBefore.set(key, sentence);
        compared += here.length;
      });
      check(`${court}, ${JSON.stringify(talk)}: no question asked and replied to is asked again in the conversation`, repeats.length === 0, repeats.join(" | "));
    }
    check("the conversation check compared some questions", compared >= 6, String(compared));

    // The shared check itself: a question asked and NOT replied to may be asked again; a compound one
    // asked and replied to drops to its open part.
    const PROOF = "What proof do you already have, such as messages, emails, screenshots, witnesses, court papers, recordings, receipts, or transcripts?";
    check("asked, the person replied: not asked again (nor the same fact in other words)", chatQuestionToAsk(null, PROOF, [{ role: "assistant", text: `To keep your case record complete: ${PROOF}` }, { role: "user", text: "How long do I have?" }]) === null && chatQuestionToAsk(null, "What proof do you currently have?", [{ role: "assistant", text: PROOF }, { role: "user", text: "ok" }]) === null);
    check("asked and not replied to: it may be asked again", chatQuestionToAsk(null, PROOF, [{ role: "user", text: "What should I gather?" }, { role: "assistant", text: PROOF }]) === PROOF);
    const DATES = "What are the main dates, including when the problem happened and when you first found out about it?";
    check("a compound question asked and replied to drops to its open part", chatQuestionToAsk(null, DATES, [{ role: "assistant", text: "What are the main dates?" }, { role: "user", text: "May 12" }]) === "When did you first find out about the problem, and are there other important dates?");
    check("a question id asked and replied to (the Small Claims chat's messages) is not asked again", chatQuestionToAsk(null, "sc-remedy-sought", [{ role: "assistant", text: "What outcome are you asking the court to order?", questionId: "sc-remedy-sought" }, { role: "user", text: "My $900 back" }]) === null);
  }

  if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
  console.log("chat asks by fact: every check passed.");
})();
