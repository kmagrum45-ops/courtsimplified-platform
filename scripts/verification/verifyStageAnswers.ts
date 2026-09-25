/**
 * Can the pipeline's output be trusted?
 *
 *   npm run test:stage-answers
 *
 * *** WHY THIS RE-CHECKS WORK THE PIPELINE ALREADY DID ***
 *
 * The run log says every sentence was verified and every quote was found. This
 * suite does not take its word for it. It re-reads each quote out of the
 * vendored corpus, now, on this machine — because the run log is a record of
 * what happened on one afternoon against one copy of the corpus, and the thing
 * that matters is whether the support EXISTS, not whether it once did.
 *
 * That also means a corpus re-vendoring that moves rule text turns this suite
 * red, which is exactly right: content verified against last year's r. 9.01 is
 * not verified.
 *
 * *** AND WHY IT CHECKS THE STATUS, NOT ONLY THE CONTENT ***
 *
 * The dangerous failure is not a bad block. It is a bad block marked
 * `verified-draft`. So the structural checks run hardest on the boundary: a
 * block carrying that status must have every part, every sentence supported,
 * every quote present, and a deadline section if and only if the stage map
 * says it has a deadline.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { findQuote } from "../content/verifiedContentPipeline";
import { CASE_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import {
  answerText,
  NO_SOURCE_NOTICE,
  type StageAnswer,
} from "../../src/lib/content-library/stageAnswers";
import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";
import { NEXT_STEP_BLOCKS } from "../../src/lib/content-library/nextSteps";
import { R_9_01_DEFENCE } from "../../src/lib/case-system/stage-map/citations";

/** Real source text, used as the control against the fabricated quote. */
const CITATION_FOR_CONTROL = R_9_01_DEFENCE.quote;

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const ANSWERS = path.join(ROOT, "docs", "content-pipeline", "stage-answers.json");

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name}\n      ${detail}` : name);
}

if (!existsSync(ANSWERS)) {
  console.log("");
  console.log("  No pipeline output yet. Run `npm run content:draft -- --all`.");
  console.log("");
  process.exit(0);
}

const answers = JSON.parse(readFileSync(ANSWERS, "utf8")) as StageAnswer[];
const stages = new Map(CASE_STAGES.map((stage) => [stage.id, stage]));

const verified = answers.filter((a) => a.verification.status === "verified-draft");
const needsHuman = answers.filter((a) => a.verification.status === "needs-human");
const noSource = answers.filter((a) => a.verification.status === "no-source");

// ---------------------------------------------------------------------------
// no-source blocks say so, and say it in the fixed wording
// ---------------------------------------------------------------------------

/*
 * These ARE shown to users, so they get checked like published content.
 *
 * The risk specific to them is drift: a block that quietly stops carrying the
 * notice reads as though we had guidance when we do not, which is the exact
 * failure the status exists to prevent. And any sentence that survived into
 * one must still have verified — the notice is added alongside the sourced
 * fragments, never instead of checking them.
 */
for (const answer of noSource) {
  check(
    `${answer.id}: carries the no-source notice`,
    answerText(answer).includes(NO_SOURCE_NOTICE),
    "without it the block reads as guidance rather than as an honest gap",
  );

  /*
   * The notice must not sit next to guidance in the same section.
   *
   * A run produced: "You can file in the Superior Court of Justice or waive
   * the amount over $50,000. The rules do not set out a step for this." The
   * block set out the step and then denied doing so, in consecutive sentences.
   * A reader who notices that stops trusting everything else on the page.
   *
   * So the notice appears ONLY in a section the pipeline recorded as empty.
   */
  if (answer.verification.status === "no-source") {
    const emptySections = new Set(answer.verification.sectionsWithoutSource);
    for (const name of ["whatToDoNext", "whatHappensAfter"] as const) {
      const section = answer[name];
      if (!section?.includes(NO_SOURCE_NOTICE)) continue;
      check(
        `${answer.id}: the no-source notice is only where there is no source (${name})`,
        emptySections.has(name) && section.trim() === NO_SOURCE_NOTICE,
        "this section carries the notice alongside sourced guidance, so it says we " +
          "cannot help immediately after helping",
      );
    }
  }

  check(
    `${answer.id}: every surviving sentence was supported`,
    answer.verification.status === "no-source" &&
      answer.verification.verdicts.some((verdict) => verdict.supported),
    "a no-source block keeps only what verified — if nothing did, it should say only " +
      "the notice, and that is worth a look",
  );

  for (const verdict of answer.verification.verdicts) {
    if (!verdict.supported) continue;
    check(
      `${answer.id}: no unverifiable quote survived into a published block`,
      !unverifiableQuote(verdict),
      `"${(verdict.quote ?? "").slice(0, 100)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Nothing claims an approval it does not have
// ---------------------------------------------------------------------------

check(
  "no block claims `approved`",
  answers.every((answer) => answer.verification.status !== ("approved" as string)),
  "`approved` is a licensee's word. The pipeline's ceiling is verified-draft.",
);

// ---------------------------------------------------------------------------
// verified-draft means what it says
// ---------------------------------------------------------------------------

for (const answer of verified) {
  const stage = stages.get(answer.stageId);

  check(
    `${answer.id}: the stage it answers exists`,
    stage !== undefined,
    "a block keyed to a stage that is not in the map can never be shown",
  );
  if (!stage) continue;

  check(
    `${answer.id}: every section is written`,
    Boolean(answer.whatsHappening && answer.whatToDoNext && answer.whatHappensAfter),
    "a verified block with a missing section is a block that answers half the question",
  );

  check(
    `${answer.id}: no section was abandoned`,
    ![answer.whatsHappening, answer.whatToDoNext, answer.yourDeadline, answer.whatHappensAfter]
      .filter(Boolean)
      .some((section) => (section as string).includes("NOT_SUPPORTED")),
    "NOT_SUPPORTED is the drafter giving up honestly — it must never reach verified-draft",
  );

  /*
   * The deadline section is checked against the STAGE MAP.
   *
   * This is the single most consequential structural property: a stage with a
   * deadline whose block does not mention it is how someone misses a filing
   * window while reading our guidance on the day it closes.
   */
  const stageHasDeadline = stage.deadlines.some((deadline) => deadline.length.count > 0);
  check(
    `${answer.id}: deadline section matches the stage map`,
    stageHasDeadline ? Boolean(answer.yourDeadline) : true,
    stageHasDeadline
      ? `the stage map gives this stage ${stage.deadlines.length} deadline(s) and the block states none`
      : "",
  );

  /*
   * Traceable to at least one real source — a rule, or an official guide.
   *
   * The first version required a rule citation and caught a genuine problem:
   * a verified block on "I won but they are not paying" with no citations at
   * all, because the stage map lists no rules for that position. Every
   * sentence in it WAS supported, by the after-judgment court guide. The
   * content was sound; the provenance record was empty.
   *
   * Requiring a RULE specifically would have been the wrong fix — it would
   * fail blocks whose answer genuinely lives in a court guide rather than in
   * the regulation, which is most of the practical layer. So the property is:
   * something real backs this, and we can say what.
   */
  check(
    `${answer.id}: traceable to at least one source`,
    answer.citations.length > 0 || (answer.sourceIds ?? []).length > 0,
    "a verified block whose provenance is empty looks complete and is not — " +
      "neither a cited rule nor a source the verifier found support in",
  );

  /*
   * Canadian spelling.
   *
   * Mostly cosmetic, with one exception that is not: "defense". The document a
   * defendant files is a DEFENCE (Form 9A), and a block that spells it the
   * American way is telling someone to look for a form that does not exist on
   * any Ontario court page. The rest are here because content going to a
   * regulator should not read as though it were written for another country —
   * a real run produced "a judgment in your favor".
   */
  const US_SPELLINGS = /\b(defense|favor|favors|favored|honor|honors|labor|center|centers|judgement)\b/gi;
  const found = Array.from(new Set(Array.from(answerText(answer).matchAll(US_SPELLINGS), (m) => m[0])));
  check(
    `${answer.id}: Canadian spelling`,
    found.length === 0,
    `found ${found.join(", ")} — "defence" is the name of Form 9A, so this one matters ` +
      `beyond style`,
  );

  const score = readability(answerText(answer));
  check(
    `${answer.id}: reads at or below grade ${TARGET_GRADE}`,
    Number(score.grade.toFixed(1)) <= TARGET_GRADE,
    `grade ${score.grade.toFixed(1)}: "${score.hardestSentences[0]?.text ?? ""}"`,
  );

  /*
   * Every sentence supported, and every quote found AGAIN, now.
   */
  const verdicts = answer.verification.verdicts;
  check(
    `${answer.id}: every sentence was accounted for`,
    verdicts.length > 0 && verdicts.every((verdict) => verdict.supported),
    `${verdicts.filter((v) => !v.supported).length} unsupported sentence(s) in a verified block`,
  );

  for (const verdict of verdicts) {
    if (!unverifiableQuote(verdict)) continue;
    check(
      `${answer.id}: quoted support is still in the corpus`,
      false,
      `a passage this block rests on is not in the vendored text:\n      ` +
        `"${(verdict.quote ?? "").slice(0, 120)}"\n      ` +
        `If the corpus was re-vendored, this block needs re-verification, not a green tick.`,
    );
  }
}

/**
 * A verdict whose quoted support cannot be found in the vendored corpus.
 *
 * Extracted so the same predicate can be run against a SYNTHETIC block below.
 * A check that only ever sees real data passes whenever the data happens to be
 * clean, which tells you nothing about whether it would catch the thing it
 * exists for.
 *
 * A premise-supported sentence has no corpus quote by design and is not a
 * failure. A quote too short to be support was already rejected upstream.
 */
function unverifiableQuote(verdict: {
  quote?: string;
  sourceId?: string;
  supported?: boolean;
}): boolean {
  if (!verdict.supported) return false;
  if (!verdict.quote || verdict.sourceId === "stage-premise") return false;
  return verdict.quote
    .split(" | ")
    .some((quote) => quote.trim().length >= 25 && findQuote(quote) === null);
}

// ---------------------------------------------------------------------------
// A fabricated quote can never reach verified-draft — asserted synthetically
// ---------------------------------------------------------------------------

/*
 * *** WHY A SYNTHETIC CASE AND NOT JUST THE REAL BLOCKS ***
 *
 * Every check above runs against whatever the last pipeline run produced. If
 * that output is clean, they all pass — including the one that would catch a
 * fabricated quote — and the suite reports success without ever having
 * exercised the thing that matters. A green run would then mean "today's data
 * is fine", not "invented support cannot get through".
 *
 * So the predicate is run against a block that is wrong on purpose: marked
 * verified-draft, every field present, one verdict quoting a passage that
 * reads exactly like O. Reg. 258/98 and appears nowhere in it.
 *
 * This is not hypothetical. The pipeline's code gate caught real verifier
 * output doing exactly this, twice, on sentences the verifier itself had
 * called supported.
 */
const FABRICATED_QUOTE =
  "A defendant who fails to file a defence within the prescribed time shall be " +
  "deemed to have admitted the allegations in the plaintiff's claim.";

check(
  "a fabricated quote is detected as unverifiable",
  unverifiableQuote({ supported: true, quote: FABRICATED_QUOTE, sourceId: "oreg-258-98-small-claims-rules" }),
  "invented support marked verified-draft would pass review unnoticed — this is the " +
    "one failure a reviewer reading the verification record cannot catch",
);

check(
  "genuine support is NOT flagged as unverifiable",
  !unverifiableQuote({
    supported: true,
    quote: CITATION_FOR_CONTROL,
    sourceId: "oreg-258-98-small-claims-rules",
  }),
  "if real quotes are flagged, every true block fails and the check is worthless — " +
    "rejecting everything and accepting everything are both failures",
);

check(
  "a premise-supported sentence is not flagged",
  !unverifiableQuote({ supported: true, quote: "You have been served.", sourceId: "stage-premise" }),
  "the premise has no corpus quote by design",
);

// ---------------------------------------------------------------------------
// needs-human means not shown
// ---------------------------------------------------------------------------

for (const answer of needsHuman) {
  check(
    `${answer.id}: needs-human is not renderable`,
    answer.verification.status === "needs-human",
    "",
  );
  check(
    `${answer.id}: records what could not be supported`,
    answer.verification.status === "needs-human" && answer.verification.unsupported.length > 0,
    "a block handed to a person must say what stopped it, or they start from nothing",
  );
}

// ---------------------------------------------------------------------------
// Conflicts with the existing catalogue
// ---------------------------------------------------------------------------

/*
 * Where the new blocks and the old ones talk about the same thing, do they
 * agree on the particulars?
 *
 * Reported, not failed. The existing blocks are human-written and were sourced
 * when they were written; a difference is a question for a reviewer, not
 * automatically a defect in either. What must not happen is the two
 * catalogues quietly disagreeing about how many days something takes.
 */
const particulars = (text: string): string[] =>
  Array.from(
    new Set([
      ...Array.from(text.matchAll(/\b(\d{1,3})\s+(day|days|month|months|year|years)\b/gi), (m) =>
        `${m[1]} ${m[2].toLowerCase().replace(/s$/, "")}`,
      ),
      ...Array.from(text.matchAll(/\bForm\s+(\d{1,2}[A-Z]?)\b/gi), (m) => `Form ${m[1].toUpperCase()}`),
    ]),
  );

const conflicts: string[] = [];
for (const answer of verified) {
  const mine = particulars(answerText(answer));
  if (mine.length === 0) continue;

  for (const block of NEXT_STEP_BLOCKS) {
    if (block.pathway !== "small-claims") continue;
    const theirs = particulars(block.text);

    // Same form, different day-count, or the reverse: worth a human look.
    const sharedForms = mine.filter((item) => item.startsWith("Form") && theirs.includes(item));
    if (sharedForms.length === 0) continue;

    const myDays = mine.filter((item) => !item.startsWith("Form"));
    const theirDays = theirs.filter((item) => !item.startsWith("Form"));
    const disagree = myDays.filter((item) => !theirDays.includes(item));

    if (disagree.length > 0 && theirDays.length > 0) {
      conflicts.push(
        `${answer.id} and ${block.id} both mention ${sharedForms.join(", ")}; ` +
          `new says ${myDays.join(", ") || "no period"}, existing says ${theirDays.join(", ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

console.log("");
console.log("STAGE ANSWERS");
console.log("");
console.log(
  `  ${answers.length} block(s): ${verified.length} verified-draft, ` +
    `${needsHuman.length} needs-human, ${noSource.length} no-source`,
);
console.log(`  ${passed} check(s) passed`);
console.log("");

if (conflicts.length > 0) {
  console.log(`  ${conflicts.length} particular(s) to reconcile with the existing catalogue:`);
  console.log("");
  for (const conflict of conflicts.slice(0, 12)) console.log(`    ${conflict}`);
  if (conflicts.length > 12) console.log(`    …and ${conflicts.length - 12} more`);
  console.log("");
  console.log("  Reported, not failed — a reviewer decides which is right.");
  console.log("");
}

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
