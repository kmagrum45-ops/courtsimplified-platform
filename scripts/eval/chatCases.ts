/**
 * Does the chat route a real question to the right published content?
 *
 * Run as part of `npm run eval:accuracy`. Spends model calls, one per case.
 *
 * *** WHY THE CHAT IS MEASURED AND NOT ASSERTED ***
 *
 * `test:library-chat` proves the GATE: an invented block id is dropped, prose in
 * any field is refused, the caps hold, the deflection is a constant. Every one of
 * those runs offline and is true regardless of what a model says.
 *
 * None of them says the chat picks the RIGHT block. That is a judgment call, it
 * is the thing the chat exists to do, and the only way to know is to ask it real
 * questions and look. So these cases sit with the stories rather than with the
 * gate checks, and they are scored rather than passed.
 *
 * *** EACH CASE STATES WHAT A WRONG ANSWER WOULD COST ***
 *
 * Same discipline as the deadline cases. A red line here should say why it
 * matters, not just that a string did not match — otherwise the temptation is to
 * adjust the expectation until it goes green, and the suite stops testing
 * anything.
 */

import { selectFromLibrary } from "../../src/lib/case-system/chat/libraryChat";
import { assembleChatAnswer } from "../../src/lib/case-system/chat/assembleChatAnswer";
import { resolveCasePosition } from "../../src/lib/case-system/stage-map/resolveCasePosition";

export type ChatCase = {
  id: string;
  question: string;
  caseContext?: string;
  /** The block that should come back, or null where nothing should. */
  expectBlock: string | null;
  /** Whether the QUESTION asks for something only a licensee may answer. */
  expectAdvice: boolean;
  /** What a wrong answer costs. Printed on failure. */
  because: string;
};

export const CHAT_CASES: ChatCase[] = [
  {
    id: "chat-served-what-now",
    question: "I got served with a claim last Tuesday. What am I supposed to do?",
    expectBlock: "defendant:served-defence-period-running",
    expectAdvice: false,
    because:
      "The commonest question this product will ever be asked, and the one the " +
      "original bug answered for everybody. A defence period is running.",
  },
  {
    id: "chat-icy-city-sidewalk-is-not-toronto",
    question:
      "I slipped on the ice on a city sidewalk and broke my wrist. It happened last week.",
    expectBlock: "before-filing:notice-municipality",
    expectAdvice: false,
    because:
      "THE CASE THAT CAUGHT A REAL ERROR. A first run returned the City of Toronto " +
      "block for a story that says only 'a city sidewalk'. Toronto has its own Act " +
      "and its own clerk, so that reader would have served notice on the wrong " +
      "office — with ten days to do it in, and no action at all if they missed it.",
  },
  {
    id: "chat-enforcement",
    question:
      "I have a judgment and they still haven't paid. How do I actually collect the money?",
    expectBlock: "plaintiff:judgment-in-my-favour-unpaid",
    expectAdvice: false,
    because:
      "The judgment-unpaid block answers this. (This case was written when no " +
      "enforcement block was published and expected no match; the block was " +
      "published in #51 and the stale expectation failed every run until " +
      "2026-10-05.) The advice flag must stay false: 'how do I collect' is a " +
      "plain procedural question, and telling somebody only a lawyer may answer " +
      "it is untrue and discouraging.",
  },
  {
    id: "chat-will-i-win",
    question: "Do you think I'll win this?",
    caseContext: "I was served with a claim two weeks ago for $4,000 over a fence.",
    expectBlock: "defendant:served-defence-period-running",
    expectAdvice: true,
    because:
      "The stage is plain and the question is not answerable. Both are true at once: " +
      "the deflection is owed AND the procedural content should still be shown, " +
      "because withholding it punishes somebody for not knowing what to ask.",
  },
  {
    id: "chat-should-i-settle",
    question: "They've offered me $1,800 to settle and I'm claiming $4,000. Should I take it?",
    expectBlock: null,
    expectAdvice: true,
    because: "Weighing a settlement is advice and section 3 territory. No block, deflection owed.",
  },
];

export async function runChatCases(): Promise<{
  total: number;
  blockCorrect: number;
  adviceCorrect: number;
  failures: string[];
}> {
  const failures: string[] = [];
  let blockCorrect = 0;
  let adviceCorrect = 0;

  for (const testCase of CHAT_CASES) {
    const selection = await selectFromLibrary(testCase.question, testCase.caseContext ?? "");

    /*
     * The composition rule, measured as the route runs it: where there is a case
     * context, the reader s own stage comes from the STAGE RESOLVER and is shown
     * first, whatever the chat router decided. See assembleChatAnswer.
     */
    let currentStage = null as { stageId: string; scope: { primaryPath: string; confidence: number } | null } | null;
    if (testCase.caseContext) {
      const position = await resolveCasePosition(testCase.caseContext, {
        knownCourtPath: "small-claims",
      });
      if (position.kind !== "out-of-scope" && position.stage.kind === "suggested") {
        currentStage = {
          stageId: position.stage.stageId,
          scope: position.kind === "in-scope" ? position.scope : null,
        };
      }
    }

    const answer = assembleChatAnswer(selection, {}, currentStage);

    const wanted = testCase.expectBlock;
    const wantedNothing = wanted === null;

    /*
     * For a case expecting nothing, ANY block is a miss. For one expecting a
     * block, that block must be among those returned — not necessarily first,
     * because a second block is allowed and sometimes right.
     */
    /*
     * Measured on what the READER SEES, not on what the router picked. The
     * composition rule means a block can reach them from the stage resolver even
     * when the router returned none — which is the whole point of it.
     */
    const seen = answer.answers.map((a) => a.stageId);
    const blockOk = wantedNothing ? seen.length === 0 : seen.includes(wanted);

    if (blockOk) blockCorrect += 1;
    else {
      failures.push(
        `${testCase.id}: wanted ${testCase.expectBlock ?? "no block"}, got ` +
          `${selection.blockIds.join(", ") || "none"}\n      ${testCase.because}`,
      );
    }

    if (selection.requestsLegalAdvice === testCase.expectAdvice) adviceCorrect += 1;
    else {
      failures.push(
        `${testCase.id}: advice flag ${selection.requestsLegalAdvice}, expected ` +
          `${testCase.expectAdvice}\n      ${testCase.because}`,
      );
    }

    // A structural guarantee, checked on every real answer rather than only in
    // the offline suite: nothing is ever returned with no message at all.
    if (
      answer.answers.length === 0 &&
      !answer.noMatch &&
      !answer.cannotAnswer
    ) {
      failures.push(`${testCase.id}: returned an empty answer with no message`);
    }
  }

  return {
    total: CHAT_CASES.length,
    blockCorrect,
    adviceCorrect,
    failures,
  };
}
