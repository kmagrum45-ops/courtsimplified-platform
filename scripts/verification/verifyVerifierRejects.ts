/**
 * Does the verifier actually reject wrong content?
 *
 *   npm run test:verifier -- [model]
 *
 * *** WHY THIS EXISTS BEFORE THE PIPELINE IS RUN ***
 *
 * The whole value of a drafter/verifier split rests on the verifier being
 * willing to say no. A verifier that agrees with plausible text is not a
 * check, it is a second opinion from the same kind of mind, and it would turn
 * every block green while changing nothing. So it is tested against sentences
 * that are wrong in the three ways that actually cost people their cases,
 * BEFORE any content is drafted on the strength of it.
 *
 * *** THE CONTROLS ARE NOT OPTIONAL ***
 *
 * Three planted errors, and two sentences that are CORRECT and must be
 * accepted. Without the controls, a verifier that rejected everything would
 * score three out of three and be useless — it would reject every true
 * sentence the drafter ever wrote and send every block to NEEDS_HUMAN.
 *
 * Rejecting everything and accepting everything are both failures. The check
 * has to distinguish them.
 *
 * *** THE CODE GATE IS TESTED SEPARATELY, WITHOUT A MODEL ***
 *
 * A fabricated quote is the one failure a reviewer reading the verification
 * record would not catch, so `findQuote` is asserted directly against a
 * plausible invention. That check needs no API call and runs every time.
 */

import dotenv from "dotenv";

import {
  findQuote,
  makesAClaim,
  predictsOutcome,
  modalMismatch,
  verify,
  addUsage,
  costOf,
  type Usage,
} from "../content/verifiedContentPipeline";
import * as C from "../../src/lib/case-system/stage-map/citations";
import { SOURCE_NAMES } from "../../src/lib/case-system/stage-map/citations";

// The key is read from .env.local inside this process and never printed.
dotenv.config({ path: ".env.local", quiet: true });

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name}\n      ${detail}` : name);
}

// ---------------------------------------------------------------------------
// The code gate — no model involved
// ---------------------------------------------------------------------------

/*
 * A quote that reads exactly like O. Reg. 258/98 and appears nowhere in it.
 * This is what a fabricated citation looks like: right register, right rule
 * number, plausible clause structure. A reviewer skimming the record would
 * accept it.
 */
const FABRICATED =
  "A defendant who fails to file a defence within the prescribed time shall be " +
  "deemed to have admitted the allegations in the plaintiff's claim.";

check(
  "a fabricated quote is not found in the corpus",
  findQuote(FABRICATED) === null,
  "the code gate accepted an invented passage — nothing downstream can be trusted",
);

check(
  "a real quote IS found in the corpus",
  findQuote(C.R_9_01_DEFENCE.quote) !== null,
  "the code gate rejects genuine source text, so it would fail every true sentence",
);

check(
  "a too-short fragment is not accepted as support",
  findQuote("within 20 days") === null,
  "a fragment that short matches by accident and supports nothing",
);

/*
 * The edge-normalisation must not have opened a hole.
 *
 * The gate was loosened to tolerate a quote that ends with a full stop where
 * the source has a semicolon — an artefact of excerpting that was failing
 * genuine quotes. These assert the loosening reaches the EDGES ONLY.
 */
check(
  "a quote ending in the wrong punctuation is still found",
  findQuote(
    "the time shall be counted by excluding the first day and including the last day of the period.",
  ) !== null,
  "boundary punctuation is an artefact of excerpting; rejecting it fails true sentences",
);

check(
  "a quote altered INSIDE is still rejected",
  findQuote(
    "the time shall be counted by excluding the last day and including the first day of the period",
  ) === null,
  "first and last were swapped — the gate must not tolerate interior changes, " +
    "which is the whole reason it exists",
);

/*
 * The "states nothing" escape hatch, policed by code.
 *
 * A verifier that cannot support a sentence has an easy out: decide the
 * sentence was not really claiming anything. These assert the code check on
 * that classification, with no model involved.
 */
check(
  "a genuinely claimless sentence is recognised as such",
  !makesAClaim("This page explains where things stand and what comes next."),
  "a block needs the occasional framing sentence; rejecting those sends every block to a human",
);
check(
  "a sentence with a deadline cannot be waved through as claimless",
  makesAClaim("You have twenty days to respond, counted from the day you were served."),
  "this is the loophole — a claim relabelled as saying nothing",
);
check(
  "a sentence naming a form cannot be waved through as claimless",
  makesAClaim("Use Form 9B for this."),
  "",
);
check(
  "a sentence naming a court actor cannot be waved through as claimless",
  makesAClaim("The clerk handles this part."),
  "",
);

/*
 * OUTCOME LANGUAGE — refused by code, before any verifier verdict is read.
 *
 * The first case below is not hypothetical. It reached verified-draft: every
 * sentence supported, that one by the court's own after-judgment guide. The
 * verifier was right to pass it — the source really does say it.
 *
 * It still cannot go out. CLAUDE.md §3 is not about accuracy, it is about what
 * this product is. A sourced prediction is still a prediction, and the reader
 * is being handed an assessment of their own case by something with no
 * business making one. "Sourced" is not a defence.
 */
for (const [sentence, why] of [
  [
    "The faster you act, the better your chances of collecting the money owed.",
    "THIS ACTUALLY SHIPPED to verified-draft, sourced to the court's own guide",
  ],
  ["You are likely to win this case.", "bare prediction"],
  ["The odds of recovering the full amount are good.", "odds"],
  ["Filing early improves your chances of success.", "improvement claim"],
  ["You have a strong case for the money owed.", "grading the case — §3 directly"],
  ["The judge will probably order the defendant to pay.", "predicting the court"],
] as const) {
  check(
    `refuses outcome language: ${sentence.slice(0, 46)}`,
    predictsOutcome(sentence) !== null,
    `${why} — this must be refused even when a source says it`,
  );
}

/*
 * And it must NOT refuse the neutral rephrasing, or the drafter has nowhere to
 * go. Reporting what a guide recommends is information; adopting its
 * prediction is not.
 */
for (const sentence of [
  "The court's guide recommends starting enforcement promptly.",
  "You may file a request to note the defendant in default.",
  "The clerk may sign default judgment for a debt or liquidated demand.",
  "A settlement conference is held in every defended action.",
]) {
  check(
    `allows the neutral form: ${sentence.slice(0, 46)}`,
    predictsOutcome(sentence) === null,
    "if this is refused the drafter has no way to state what a source recommends, " +
      "and the rule becomes unsatisfiable rather than protective",
  );
}

/*
 * MUST vs MAY, checked deterministically.
 *
 * The verifier is told to be strict about this and was not — it passed "You
 * must issue your Defendant's Claim within 20 days" with r. 10.01 (2) in front
 * of it. So there is a code gate, and these assert it without a model.
 *
 * The hard part is that r. 10.01 (2) contains BOTH modals: "shall be in Form
 * 10A and may be issued". Presence proves nothing; the modal nearest the
 * period is the one that governs it.
 */
check(
  "an obligation resting on permissive text is caught",
  modalMismatch(
    "You must issue your Defendant's Claim within 20 days after the day your defence is filed.",
    C.R_10_01_DEFENDANTS_CLAIM.quote,
  ),
  "r. 10.01 (2) says the claim MAY be issued within 20 days, and allows it later with " +
    "leave. 'Must' closes a door the rule leaves open.",
);

check(
  "an obligation resting on mandatory text is NOT caught",
  !modalMismatch(
    "A defendant who wishes to dispute a claim must serve and file a defence within 20 days of being served.",
    C.R_9_01_DEFENCE.quote,
  ),
  "r. 9.01 says 'shall', so 'must' is correct here — flagging it would fail true " +
    "sentences in bulk",
);

check(
  "a sentence asserting no obligation is not flagged",
  !modalMismatch(
    "You may issue a Defendant's Claim within 20 days after your defence is filed.",
    C.R_10_01_DEFENDANTS_CLAIM.quote,
  ),
  "the permissive form is the correct way to state this rule",
);

check(
  "a quote with a changed number is still rejected",
  findQuote(
    "A defendant who wishes to dispute a plaintiff's claim shall, within 30 days of being served with the claim",
  ) === null,
  "20 was changed to 30 inside the passage",
);

// ---------------------------------------------------------------------------
// The verifier — one call, five sentences
// ---------------------------------------------------------------------------

const SOURCE = [
  C.R_9_01_DEFENCE,
  C.R_11_01_NOTING_IN_DEFAULT,
  C.R_3_01_COMPUTATION,
  C.R_10_01_DEFENDANTS_CLAIM,
  C.R_10_03_DEFENCE_TO_DEFENDANTS_CLAIM,
  C.R_11_06_SET_ASIDE,
]
  .map(
    (citation) =>
      `[${citation.pinpoint} — ${SOURCE_NAMES[citation.sourceId]}]\n${citation.quote}`,
  )
  .join("\n\n");

type Planted = { sentence: string; shouldBeSupported: boolean; why: string };

const SENTENCES: Planted[] = [
  {
    sentence:
      "You must serve and file your defence within 30 days of being served with the claim.",
    shouldBeSupported: false,
    why: "WRONG NUMBER — r. 9.01 says 20 days, not 30. Ten extra days a person would take in good faith, and they would be noted in default.",
  },
  {
    sentence:
      "If no defence is filed in time, a judge may note the defendant in default.",
    shouldBeSupported: false,
    why: "WRONG ACTOR — r. 11.01 (1) says the CLERK may note the defendant in default. Sending someone to book a motion before a judge for something the counter does costs weeks.",
  },
  {
    sentence:
      "To ask the court to note the defendant in default, file a request to note in default using Form 9A.",
    shouldBeSupported: false,
    why: "WRONG FORM — r. 11.01 (1) (a) says Form 9B. Form 9A is the defence, so this sends the plaintiff to file the other side's document.",
  },
  {
    sentence:
      "A defendant who wishes to dispute a claim must serve a defence on every other party and file it with the clerk, with proof of service, within 20 days of being served.",
    shouldBeSupported: true,
    why: "CONTROL — this is r. 9.01 restated accurately. A verifier that rejects this rejects everything true.",
  },
  {
    sentence:
      "When time is counted under these rules, the first day is not counted and the last day is.",
    shouldBeSupported: true,
    why: "CONTROL — this is r. 3.01. A verifier that rejects this cannot pass any deadline sentence.",
  },

  /*
   * MUST WHERE THE RULE SAYS MAY.
   *
   * Caught in a real block. r. 10.01 (2) says a defendant's claim MAY be
   * issued within 20 days, and after that, before trial or default judgment,
   * WITH LEAVE OF THE COURT. "Must" closes a door the rule leaves open: a
   * person reading it on day 25 concludes they have lost a claim they can
   * still bring, and abandons it. Nobody ever reports that.
   */
  {
    sentence:
      "You must issue your Defendant's Claim within 20 days after the day your defence is filed.",
    shouldBeSupported: false,
    why: "MUST vs MAY — r. 10.01 (2) says 'may be issued', and allows it later with leave of the court",
  },

  /*
   * A DEADLINE THAT DOES NOT EXIST.
   *
   * Also caught in a real block, and the most dangerous of the lot. r. 11.06
   * sets NO fixed period for a motion to set aside — it requires only that the
   * motion be made "as soon as is reasonably possible in all the
   * circumstances". The draft had borrowed the 20 days from the defence
   * deadline, which is a different rule for a different thing.
   *
   * A person told on day 25 that they had missed a 20-day limit would stop.
   * There is no limit to have missed.
   */
  {
    sentence:
      "You have 20 calendar days from the date the judgment was signed to ask the court to set it aside.",
    shouldBeSupported: false,
    why: "INVENTED DEADLINE — r. 11.06 sets no fixed period, only 'as soon as is reasonably possible'",
  },

  /*
   * CONTROL — and a recorded verifier FALSE POSITIVE.
   *
   * The verifier rejected this in a real run, reasoning that the source gives
   * 20 days from the plaintiff's claim rather than the defendant's. It does
   * not. r. 10.03 gives 20 days after service of the DEFENDANT'S claim.
   *
   * What confused it is visible in the rule: one sentence covers two different
   * parties — "a party who wishes to dispute the defendant's claim OR a third
   * party who wishes to dispute the plaintiff's claim" — and both clocks run
   * from service of the defendant's claim. The phrase "plaintiff's claim"
   * belongs to the third-party limb, not to the clock.
   *
   * It is a control now so the same misreading cannot quietly kill the block
   * again. A verifier that rejects this is wrong, and the suite says so.
   */
  {
    sentence:
      "A party who wishes to dispute the defendant's claim must serve and file a defence within 20 days after service of the defendant's claim.",
    shouldBeSupported: true,
    why:
      "CONTROL, and a recorded false positive — r. 10.03 gives 20 days after service of " +
      "the DEFENDANT'S claim. The verifier previously misread the third-party limb of the " +
      "same sentence and rejected a correct block.",
  },
];

const model = process.argv[2] ?? "gpt-4o-mini";
const usage: Usage[] = [];

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.log("");
    console.log("  OPENAI_API_KEY is not set — the code-gate checks ran, the model checks did not.");
    console.log("");
    report();
    return;
  }

  const result = await verify(
    model,
    SOURCE,
    SENTENCES.map((planted) => planted.sentence),
  );
  addUsage(usage, result.usage);

  console.log("");
  console.log(`VERIFIER — ${model}`);
  console.log("");

  for (const planted of SENTENCES) {
    const verdict = result.verdicts.find((candidate) => candidate.sentence === planted.sentence);
    const got = verdict?.supported ?? false;
    const correct = got === planted.shouldBeSupported;

    console.log(
      `  ${correct ? "ok  " : "FAIL"}  ${planted.shouldBeSupported ? "accept" : "reject"}  ` +
        `${planted.sentence.slice(0, 68)}…`,
    );
    if (!planted.shouldBeSupported && verdict?.reason) {
      console.log(`          verifier said: ${verdict.reason.slice(0, 110)}`);
    }
    if (planted.shouldBeSupported && verdict?.quote) {
      console.log(`          quoted: ${verdict.quote.slice(0, 90)}…`);
      console.log(`          found in corpus: ${verdict.quoteFound ? "yes" : "NO"}`);
    }

    check(
      `${planted.shouldBeSupported ? "accepts" : "rejects"}: ${planted.sentence.slice(0, 50)}`,
      correct,
      `${planted.why}\n      verifier said supported=${got}`,
    );
  }

  /*
   * A verifier that answers the same way to everything has learned nothing
   * about the sentences. Asserted separately because the per-sentence checks
   * above could all pass on a lucky split.
   */
  const supported = result.verdicts.filter((verdict) => verdict.supported).length;
  check(
    "the verifier discriminates rather than answering uniformly",
    supported > 0 && supported < SENTENCES.length,
    `marked ${supported} of ${SENTENCES.length} supported — a uniform answer is not a check`,
  );

  report();
}

function report(): void {
  console.log("");
  if (usage.length > 0) {
    for (const entry of usage) {
      console.log(
        `  ${entry.calls} call(s) to ${entry.model}: ${entry.inputTokens} in, ` +
          `${entry.outputTokens} out — $${costOf(entry).toFixed(4)}`,
      );
    }
    console.log("");
  }

  console.log(`  ${passed} check(s) passed`);
  console.log("");

  if (failures.length > 0) {
    console.log(`${failures.length} FAILURE(S):`);
    console.log("");
    for (const failure of failures) console.log(`  - ${failure}`);
    console.log("");
    process.exitCode = 1;
  } else {
    console.log("  All checks passed.");
    console.log("");
  }
}

void main();
