/**
 * Proves the AI claim-type classifier runs ONLY on the opening story, and
 * replays story 4's real turn sequence to show what the retained claim type is
 * at each turn, before and after the fix.
 *
 * COSTS NOTHING. The classifier is stubbed with a recorder, so this exercises
 * the real orchestrateIntakeTurn gating without a billed call. The stub's
 * return values for the two texts that matter are the MEASURED ones:
 *
 *   - the opening story, classified alone -> personal-loan   (measured)
 *   - short answers, classified alone     -> debt/services   (measured: the
 *     live run retained debt/services, which under last-wins can only have
 *     come from a later turn, since the opening story yields personal-loan)
 *
 * THE DEFECT. classifyClaimTypeWithAi ran on every turn carrying new text, and
 * every caller retains the last non-null suggestion. So a three-word answer,
 * classified with no surrounding context, overwrote a classification derived
 * from the user's whole story. Story 4 was routed to unpaid-debt-services by a
 * fragment, when its own story classifies as a personal loan.
 *
 * Run: node --import tsx scripts/verification/verifyClassifierGating.ts
 */

import { pathToFileURL } from "node:url";

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** Story 4's opening narrative and the answers it actually gave, in order. */
const OPENING =
  "My cousin was short when his car went in for work last autumn and I moved some money across to " +
  "him to cover it. He said he would sort me out when his overtime came through in the new year. " +
  "The overtime came and went. Every time I bring it up he changes the subject, and now he has " +
  "stopped replying altogether.";

const ANSWERS: { questionId: string; text: string }[] = [
  { questionId: "sc-orient-when-happened", text: "About two months ago." },
  { questionId: "sc-orient-role", text: "Starting a claim (plaintiff)" },
  { questionId: "sc-orient-dispute-category", text: "Starting a Small Claims case" },
  { questionId: "sc-claim-filed", text: "No, I have not filed anything yet." },
  { questionId: "sc-safety-check", text: "No safety concerns." },
  { questionId: "sc-amount-claimed", text: "$3,500." },
  { questionId: "sc-evidence-available", text: "The bank transfer, and texts where he mentions sorting me out." },
  { questionId: "sc-remedy-sought", text: "I want my money back." },
];

const PERSONAL_LOAN = {
  claimTypeId: "sc-claim-personal-loan-between-individuals",
  claimTypeName: "Personal loan between individuals -- borrower hasn't repaid",
};
const DEBT_SERVICES = {
  claimTypeId: "sc-claim-unpaid-debt-services",
  claimTypeName: "Unpaid debt or non-payment for services",
};

/**
 * Stands in for classifyClaimTypeWithAi. Returns personal-loan for the full
 * story and debt/services for anything shorter, which is the measured
 * behaviour and is exactly the asymmetry the defect exploited.
 */
function makeStubClassifier() {
  const calledWith: string[] = [];

  const classify = async (storyText: string) => {
    calledWith.push(storyText);
    return storyText.length > 200 ? PERSONAL_LOAN : DEBT_SERVICES;
  };

  return { classify, calledWith };
}

type ReplayRow = {
  turn: number;
  label: string;
  classifierCalled: boolean;
  retained: string;
};

/**
 * Replays the sequence through the REAL orchestrateIntakeTurn.
 *
 * `simulateLastWins` reproduces the pre-fix behaviour by classifying on every
 * turn, so the before/after table comes from one code path rather than from a
 * remembered description of the old one.
 */
async function replay(simulateLastWins: boolean): Promise<ReplayRow[]> {
  const stub = makeStubClassifier();
  const rows: ReplayRow[] = [];

  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];
  let retained: { claimTypeId: string; claimTypeName: string } | null = null;

  const turns = [
    { questionId: undefined as string | undefined, text: OPENING, label: "(opening story)" },
    ...ANSWERS.map((answer) => ({
      questionId: answer.questionId as string | undefined,
      text: answer.text,
      label: answer.questionId,
    })),
  ];

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    const before = stub.calledWith.length;

    const result = await orchestrateIntakeTurn(
      facts,
      answeredIds,
      turn.text,
      "stub-key",
      QUESTION_BANK,
      CLAIM_TYPES,
      "small-claims",
      turn.questionId,
      {
        runSafety: async () => ({ classification: "clear" as const, reason: "stub" }),
        extractFacts: async () => ({ facts: {}, directFields: [] }),
        classifyClaimType: stub.classify,
        composeVoice: async () => ({ leadIn: null, questionText: "", fellBackToPlainText: true }),
        // The pre-fix path classified every turn; the fix gates it to the
        // opening story. This flag replays the old behaviour honestly rather
        // than describing it.
        resolveClaimTypeEveryTurn: simulateLastWins,
      },
    );

    facts = result.facts;
    if (turn.questionId) answeredIds = [...answeredIds, turn.questionId];
    if (result.suggestedClaimType) retained = result.suggestedClaimType;

    rows.push({
      turn: i + 1,
      label: turn.label || "(opening story)",
      classifierCalled: stub.calledWith.length > before,
      retained: retained ? retained.claimTypeId : "(none)",
    });
  }

  return rows;
}

function printTable(title: string, rows: ReplayRow[]): void {
  console.log(`\n--- ${title} ---`);
  console.log("turn  classifier  retained claim type            question");
  for (const row of rows) {
    console.log(
      `${String(row.turn).padStart(4)}  ${(row.classifierCalled ? "CALLED" : "  -   ").padEnd(10)}  ` +
        `${row.retained.padEnd(28)}  ${row.label}`,
    );
  }
}

/**
 * The exact-matcher counterpart. Opening story matches personal-loan on its
 * own signals; a later evidence answer contains "unpaid invoice", which is a
 * debt/services signal.
 *
 * This exposure is REAL, not theoretical. Probed against the standard question
 * set, both of these ordinary answers to sc-evidence-available match
 * debt/services on their own:
 *
 *   "I have the unpaid invoice and the bank transfer."
 *   "Texts where he admits he owes me money."
 */
const MATCHER_OPENING =
  "I lent my cousin three thousand five hundred dollars last autumn when his car went in for " +
  "work. He said he would sort me out when his overtime came through. He never paid me back and " +
  "now he has stopped replying altogether.";

const MATCHER_ANSWERS: { questionId: string; text: string }[] = [
  { questionId: "sc-orient-when-happened", text: "About two months ago." },
  { questionId: "sc-orient-role", text: "Starting a claim (plaintiff)" },
  { questionId: "sc-orient-dispute-category", text: "Starting a Small Claims case" },
  { questionId: "sc-claim-filed", text: "No, I have not filed anything yet." },
  { questionId: "sc-safety-check", text: "No safety concerns." },
  { questionId: "sc-amount-claimed", text: "$3,500." },
  // The re-route. An ordinary answer about which documents the user holds.
  { questionId: "sc-evidence-available", text: "I have the unpaid invoice and the bank transfer." },
  { questionId: "sc-remedy-sought", text: "I want my money back." },
];

async function replayMatcher(
  simulateLastWins: boolean,
): Promise<{ rows: ReplayRow[]; classifierCalls: number }> {
  const rows: ReplayRow[] = [];
  let classifierCalls = 0;

  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];
  let retained: string | null = null;

  const turns = [
    { questionId: undefined as string | undefined, text: MATCHER_OPENING, label: "(opening story)" },
    ...MATCHER_ANSWERS.map((answer) => ({
      questionId: answer.questionId as string | undefined,
      text: answer.text,
      label: answer.questionId,
    })),
  ];

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];

    const result = await orchestrateIntakeTurn(
      facts,
      answeredIds,
      turn.text,
      "stub-key",
      QUESTION_BANK,
      CLAIM_TYPES,
      "small-claims",
      turn.questionId,
      {
        runSafety: async () => ({ classification: "clear" as const, reason: "stub" }),
        extractFacts: async () => ({ facts: {}, directFields: [] }),
        // Records rather than throws. In the BEFORE replay the matcher misses
        // on short answers ("About two months ago."), so the classifier branch
        // legitimately runs — that is the pre-fix behaviour. In the AFTER
        // replay it must never run at all, because the opening story matches
        // exactly and every later turn is gated. Asserted below.
        classifyClaimType: async () => {
          classifierCalls += 1;
          return null;
        },
        composeVoice: async () => ({ leadIn: null, questionText: "", fellBackToPlainText: true }),
        resolveClaimTypeEveryTurn: simulateLastWins,
      },
    );

    facts = result.facts;
    if (turn.questionId) answeredIds = [...answeredIds, turn.questionId];

    const fresh = result.matchedClaimTypes[0]?.claimType;
    if (fresh) retained = fresh.id;

    rows.push({
      turn: i + 1,
      label: turn.label || "(opening story)",
      classifierCalled: Boolean(fresh),
      retained: retained || "(none)",
    });
  }

  return { rows, classifierCalls };
}

async function main(): Promise<void> {
  const before = await replay(true);
  const after = await replay(false);

  printTable("BEFORE (classify every turn, last-wins)", before);
  printTable("AFTER (classify the opening story only)", after);

  const beforeCalls = before.filter((row) => row.classifierCalled).length;
  const afterCalls = after.filter((row) => row.classifierCalled).length;

  console.log(`\nclassifier calls: ${beforeCalls} -> ${afterCalls}`);

  check(
    "BEFORE: a later answer overwrote the opening classification",
    before[before.length - 1].retained === DEBT_SERVICES.claimTypeId,
    `retained ${before[before.length - 1].retained}`,
  );
  check(
    "AFTER: the opening story's classification survives every answer",
    after[after.length - 1].retained === PERSONAL_LOAN.claimTypeId,
    `retained ${after[after.length - 1].retained}`,
  );
  check("AFTER: the classifier runs exactly once", afterCalls === 1, `${afterCalls} calls`);
  check(
    "AFTER: it runs on the opening turn, not a later one",
    after[0].classifierCalled && after.slice(1).every((row) => !row.classifierCalled),
  );
  check(
    "the fix removes classifier calls from later turns",
    afterCalls < beforeCalls,
    `${beforeCalls} -> ${afterCalls}`,
  );

  // ---- The exact matcher, the same rule on the other path ----

  const mBeforeRun = await replayMatcher(true);
  const mAfterRun = await replayMatcher(false);
  const mBefore = mBeforeRun.rows;
  const mAfter = mAfterRun.rows;

  printTable("EXACT MATCHER — BEFORE (match every turn, last-wins)", mBefore);
  printTable("EXACT MATCHER — AFTER (match the opening story only)", mAfter);

  check(
    "matcher BEFORE: an evidence answer re-routed the claim type",
    mBefore[mBefore.length - 1].retained === DEBT_SERVICES.claimTypeId,
    `retained ${mBefore[mBefore.length - 1].retained}`,
  );
  check(
    "matcher AFTER: the opening story's match survives every answer",
    mAfter[mAfter.length - 1].retained === PERSONAL_LOAN.claimTypeId,
    `retained ${mAfter[mAfter.length - 1].retained}`,
  );
  check(
    "matcher AFTER: matchedClaimTypes is populated on the opening turn only",
    mAfter[0].classifierCalled && mAfter.slice(1).every((row) => !row.classifierCalled),
  );
  check(
    "matcher AFTER: the AI classifier never runs once the story matched exactly",
    mAfterRun.classifierCalls === 0,
    `${mAfterRun.classifierCalls} call(s)`,
  );
  check(
    "matcher BEFORE: later turns also leaked into the AI classifier",
    mBeforeRun.classifierCalls > 0,
    `${mBeforeRun.classifierCalls} call(s)`,
  );

  // Symmetry is the actual requirement: neither path may re-resolve a claim
  // type from an answer.
  check(
    "both paths are gated by the same rule",
    after.slice(1).every((row) => !row.classifierCalled) &&
      mAfter.slice(1).every((row) => !row.classifierCalled),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
