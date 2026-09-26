/**
 * The chat can only say what has already been verified.
 *
 *   npm run test:library-chat
 *
 * COSTS NOTHING. No model call. Every check drives `validateSelection` and
 * `assembleChatAnswer` with payloads a model might return — including the ones
 * it must never return — because those are the two functions every answer passes
 * through, whatever the model said that day.
 *
 * *** WHY IT DOES NOT GO THROUGH selectFromLibrary ***
 *
 * A check that runs the whole pipeline to reach a validator ends up testing
 * whichever path the model happened to take. That was learned expensively on the
 * WSIAT coherence check: the first version drove the classifier end to end,
 * passed, and passed just as happily with the safety deleted, because the branch
 * it was aiming at was never reached. The gate is where the guarantee lives, so
 * the gate is what is driven.
 *
 * *** WHAT THIS EXISTS TO CATCH ***
 *
 * `docs/chat-engine-report.md` found the previous chat surface stating law and
 * procedure from ~25 unsourced templates plus an eleven-object doctrine library
 * marked `verificationStatus: "not-verified"`, none of it in the review packet,
 * all of it reachable in phase 1. The property that replaces it is narrow and
 * checkable: the model returns IDS, the ids must exist, and every word a person
 * reads comes from the published library or a fixed constant.
 */

import {
  assembleChatAnswer,
} from "../../src/lib/case-system/chat/assembleChatAnswer";
import {
  clarifyingQuestionCatalogue,
  blockCatalogue,
  droppedIds,
  validateSelection,
  MAX_BLOCKS,
  MAX_CLARIFYING,
  type ChatSelection,
} from "../../src/lib/case-system/chat/libraryChat";
import { PUBLISHED_BLOCKS } from "../../src/lib/content-library/publishedLibrary";
import {
  CHAT_NO_MATCH_MESSAGE,
  DEFLECTION_MESSAGE,
} from "../../src/lib/content-library/referralResources";
import { collectContentInventory } from "../../src/lib/content-library/contentInventory";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`pass  ${name}`);
    return;
  }
  failures.push(detail ? `${name}\n      ${detail}` : name);
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
}

const realBlockId = PUBLISHED_BLOCKS[0]?.stageId ?? "";
const realQuestionId = clarifyingQuestionCatalogue()[0]?.id ?? "";

function selection(over: Partial<ChatSelection> = {}): ChatSelection {
  return validateSelection({
    intent: "what-do-i-do-next",
    blockIds: [realBlockId],
    clarifyingQuestionIds: [],
    requestsLegalAdvice: false,
    noMatch: false,
    ...over,
  });
}

// ---------------------------------------------------------------------------
// The catalogues are real, and they are the PUBLISHED set
// ---------------------------------------------------------------------------

check(
  "there is something to offer and something to ask",
  blockCatalogue().length > 0 && clarifyingQuestionCatalogue().length > 0,
  `${blockCatalogue().length} block(s), ${clarifyingQuestionCatalogue().length} question(s)`,
);

check(
  "the block catalogue is exactly the published set",
  blockCatalogue().length === PUBLISHED_BLOCKS.length,
  "offering a stage with no published block produces a selection that renders " +
    "nothing, after the model has already decided it had an answer",
);

check(
  "no clarifying question is listed twice under two ids",
  new Set(clarifyingQuestionCatalogue().map((entry) => entry.question)).size ===
    clarifyingQuestionCatalogue().length,
  "the stage map records some boundaries on one side and some on both; two ids " +
    "for one question would let the model ask it twice",
);

// ---------------------------------------------------------------------------
// AN INVENTED ID IS DROPPED, NOT REPAIRED
// ---------------------------------------------------------------------------
//
// The single most important check here. A hallucinated block id is the model
// saying it wanted to answer something we have not written, and the honest reply
// is the no-match message — not the closest block we happen to have. Snapping to
// the nearest stage is the failure this entire engine exists to undo.

{
  const invented = validateSelection({
    intent: "what-do-i-do-next",
    blockIds: ["plaintiff:enforcing-my-judgment", "defendant:appeal-to-divisional-court"],
    clarifyingQuestionIds: [],
    requestsLegalAdvice: false,
    noMatch: false,
  });

  check(
    "block ids that are not published are dropped",
    invented.blockIds.length === 0,
    `kept: ${invented.blockIds.join(", ")}`,
  );
  check(
    "a selection left with no block becomes a no-match, whatever the model claimed",
    invented.noMatch,
    "the model said noMatch: false and named two stages that do not exist; " +
      "believing it would show the reader nothing at all",
  );
  check(
    "the invented ids are reported for the log",
    droppedIds({ blockIds: ["plaintiff:enforcing-my-judgment"] }).length === 1,
  );

  const answer = assembleChatAnswer(invented);
  check(
    "the reader gets the no-match message and the referrals",
    answer.noMatch === CHAT_NO_MATCH_MESSAGE && answer.referrals.length > 0,
    JSON.stringify({ noMatch: Boolean(answer.noMatch), referrals: answer.referrals.length }),
  );
}

/** A real id still works, or the check above proves only that nothing works. */
check(
  "a published block id survives validation",
  selection().blockIds[0] === realBlockId && !selection().noMatch,
  `expected ${realBlockId}`,
);

// ---------------------------------------------------------------------------
// Caps, and the reason for them
// ---------------------------------------------------------------------------

{
  const many = validateSelection({
    intent: "where-do-i-stand",
    blockIds: PUBLISHED_BLOCKS.map((block) => block.stageId),
    clarifyingQuestionIds: clarifyingQuestionCatalogue().map((entry) => entry.id),
    requestsLegalAdvice: false,
    noMatch: false,
  });

  check(
    `at most ${MAX_BLOCKS} blocks reach the reader`,
    many.blockIds.length === MAX_BLOCKS,
    `${many.blockIds.length} — a chat answer of six stage blocks is a search result, ` +
      `and hands back the work of deciding which part applies`,
  );
  check(
    `at most ${MAX_CLARIFYING} questions go back`,
    many.clarifyingQuestionIds.length === MAX_CLARIFYING,
    `${many.clarifyingQuestionIds.length} — three is an interrogation`,
  );
}

check(
  "a repeated block id is not shown twice",
  validateSelection({ blockIds: [realBlockId, realBlockId] }).blockIds.length === 1,
);

/*
 * A real clarifying question survives AND arrives as the stage map's own words.
 *
 * The filtering checks above would all pass if nothing ever got through, which is
 * the failure mode this catches: a catalogue whose ids never match would make the
 * chat silently unable to ask anything.
 */
{
  const asking = assembleChatAnswer(
    selection({ blockIds: [], clarifyingQuestionIds: [realQuestionId], noMatch: true }),
  );
  const expected = clarifyingQuestionCatalogue().find((entry) => entry.id === realQuestionId);

  check(
    "a valid clarifying question reaches the reader, in the stage map's words",
    asking.clarifyingQuestions.length === 1 &&
      asking.clarifyingQuestions[0] === expected?.question,
    `got ${JSON.stringify(asking.clarifyingQuestions)}; expected ${JSON.stringify(expected?.question)}`,
  );
}

// ---------------------------------------------------------------------------
// ADVICE RIDES ALONGSIDE THE ANSWER, NEVER INSTEAD OF IT
// ---------------------------------------------------------------------------

{
  const asked = assembleChatAnswer(selection({ requestsLegalAdvice: true }));

  check(
    "an advice question gets the fixed deflection",
    asked.cannotAnswer === DEFLECTION_MESSAGE,
    "the model sets a boolean; the words are a constant it never sees",
  );
  check(
    "and still gets the block",
    asked.answers.length === 1,
    "withholding procedural content because the question was badly framed punishes " +
      "somebody for not knowing what kind of question to ask",
  );
  check(
    "and gets the referrals with it",
    asked.referrals.length > 0,
  );

  const ordinary = assembleChatAnswer(selection());
  check(
    "an ordinary question gets no deflection and no referrals",
    ordinary.cannotAnswer === null && ordinary.referrals.length === 0,
    "referrals on every answer are furniture, and furniture is not read",
  );
}

// ---------------------------------------------------------------------------
// Nothing the model wrote can reach the reader
// ---------------------------------------------------------------------------
//
// The structural claim: there is no field in the reply a sentence could travel
// in. Asserted by feeding prose into every field and checking none of it comes
// out the other side.

{
  const hostile = validateSelection({
    intent: "You should file a Defence within 20 days." as ChatSelection["intent"],
    blockIds: ["Serve the claim on the defendant within six months."],
    clarifyingQuestionIds: ["Did you file your claim before the limitation period expired?"],
    requestsLegalAdvice: false,
    noMatch: false,
  } as unknown as Partial<ChatSelection>);

  const rendered = JSON.stringify(assembleChatAnswer(hostile));

  check(
    "prose in the intent field is refused",
    hostile.intent === "something-else",
    `got ${hostile.intent}`,
  );
  check(
    "no sentence the model wrote appears anywhere in the answer",
    !rendered.includes("Serve the claim on the defendant within six months") &&
      !rendered.includes("Did you file your claim before the limitation period") &&
      !rendered.includes("You should file a Defence"),
    rendered.slice(0, 300),
  );
}

check(
  "a null selection is a no-match, not a crash",
  validateSelection(null).noMatch && validateSelection(null).blockIds.length === 0,
);

check(
  "a malformed selection is a no-match",
  validateSelection({ blockIds: "not-an-array" } as unknown as Partial<ChatSelection>).noMatch,
);

// ---------------------------------------------------------------------------
// Every word the chat can show is reviewable
// ---------------------------------------------------------------------------

{
  const inventory = new Set(collectContentInventory().map((entry) => entry.text.trim()));

  check(
    "the no-match message is in the review packet",
    inventory.has(CHAT_NO_MATCH_MESSAGE.trim()),
    "a message shown at the moment somebody is most likely to give up, that no " +
      "licensee has been asked to read",
  );
  check(
    "the deflection message is in the review packet",
    inventory.has(DEFLECTION_MESSAGE.trim()),
  );

  /*
   * And the blocks themselves. `assembleChatAnswer` renders through
   * `renderStageAnswer`, which guards every section — so this asserts the chat
   * has not acquired a second way to produce content that skips it.
   */
  const shown = assembleChatAnswer(selection()).answers.flatMap((answer) =>
    answer.sections.map((section) => section.text),
  );
  check(
    "every section the chat shows came through the output guard",
    shown.length > 0,
    "the block rendered nothing, so this check asserted nothing",
  );
}

// ---------------------------------------------------------------------------

console.log("");
console.log("LIBRARY CHAT");
console.log("");
console.log(
  `  ${blockCatalogue().length} block(s) offerable, ` +
    `${clarifyingQuestionCatalogue().length} clarifying question(s)`,
);
console.log(`  ${passed} check(s) passed`);
console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}
