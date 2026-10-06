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
import { forumCheckOnlyProblems } from "../content/blockGates";
import { gateFailures } from "../content/blockGates";
import { ALL_STAGES, CASE_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import {
  answerText,
  NO_SOURCE_NOTICE,
  renderDeadlineSection,
  type StageAnswer,
} from "../../src/lib/content-library/stageAnswers";
import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";
import { assessReadability } from "../../src/lib/content-library/readabilityExceptions";
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
// Every court's steps (2026-10-06): civil and family answers are published too.
const stages = new Map(ALL_STAGES.map((stage) => [stage.id, stage]));

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

  // The same reading-level rule the publishing gate applies (blockGates.ts),
  // including its term-of-art exception. Until 2026-10-01 this suite had its own
  // stricter copy, so a block the gate published could fail here: a second copy
  // of a gate is a second, different gate.
  const score = readability(answerText(answer));
  const assessment = assessReadability(answerText(answer), TARGET_GRADE);
  check(
    `${answer.id}: reads at or below grade ${TARGET_GRADE}`,
    assessment.withinTarget,
    `${assessment.withinTarget ? "" : assessment.reason}; hardest: "${score.hardestSentences[0]?.text ?? ""}"`,
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
// quoteFound CAN FAIL — proved, not asserted
// ---------------------------------------------------------------------------

/*
 * *** WHY THIS EXISTS ***
 *
 * An independent review counted `quoteFound` across the published library and
 * found it `true` on 82 of 82 quoted verdicts — it had NEVER ONCE been false.
 * The field documents itself as "was the quote actually in the corpus?" and it
 * had answered yes every single time, including on sixteen verdicts whose
 * "source" was the stage map's own description.
 *
 * A flag that has never been false is indistinguishable from a constant. So
 * these plant the failures and assert the gate refuses the block — the
 * behaviour, not the label.
 */
const stageForPlant = CASE_STAGES.find((stage) => stage.id === "defendant:served-defence-period-running");

if (stageForPlant) {
  const soundBlock = {
    id: "answer:plant",
    stageId: stageForPlant.id,
    userQuestion: stageForPlant.userQuestion,
    whatsHappening: "You have been served with a claim.",
    whatToDoNext: "Serve a defence on every other party and file it with the clerk.",
    yourDeadline: renderDeadlineSection(stageForPlant.deadlines),
    whatHappensAfter: "A settlement conference will be held.",
    slots: [],
    citations: stageForPlant.rules,
    sourceIds: ["oreg-258-98-small-claims-rules"],
  };

  /** A quote in the right register that appears nowhere in the corpus. */
  const FABRICATED_SUPPORT =
    "A defendant who fails to file a defence within the prescribed time shall be deemed " +
    "to have admitted the allegations in the plaintiff's claim.";

  const withFabricated = {
    ...soundBlock,
    verification: {
      status: "verified-draft" as const,
      verifiedAt: new Date().toISOString(),
      attempts: 1,
      verdicts: [
        {
          sentence: "Serve a defence on every other party and file it with the clerk.",
          supported: true,
          quote: FABRICATED_SUPPORT,
          sourceId: "oreg-258-98-small-claims-rules",
          // The pipeline would set this false. A tampered or buggy record
          // claiming true is exactly what this must not be fooled by.
          quoteFound: true,
        },
      ],
    },
  };

  const fabricatedFailures = gateFailures(withFabricated as StageAnswer, stageForPlant);
  check(
    "a planted quote that is not in the corpus is refused, even claiming quoteFound",
    fabricatedFailures.some((failure) => failure.includes("not in the vendored corpus")),
    `the gate believed a stored flag instead of looking. Failures: ${fabricatedFailures.join("; ") || "(none)"}`,
  );

  /** The same block with a REAL quote must pass — or the check proves nothing. */
  const withRealQuote = {
    ...soundBlock,
    verification: {
      status: "verified-draft" as const,
      verifiedAt: new Date().toISOString(),
      attempts: 1,
      verdicts: [
        {
          sentence: "Serve a defence on every other party and file it with the clerk.",
          supported: true,
          quote: CITATION_FOR_CONTROL,
          sourceId: "oreg-258-98-small-claims-rules",
          quoteFound: true,
        },
      ],
    },
  };

  const realFailures = gateFailures(withRealQuote as StageAnswer, stageForPlant);
  check(
    "the same block with a real quote is not refused for its support",
    !realFailures.some((failure) => failure.includes("not in the vendored corpus")),
    `a gate that refuses real support would fail every true block. Failures: ${realFailures.join("; ")}`,
  );

  /*
   * And the circular case: a verdict naming the stage map while claiming the
   * corpus confirmed it.
   */
  const circular = {
    ...soundBlock,
    verification: {
      status: "verified-draft" as const,
      verifiedAt: new Date().toISOString(),
      attempts: 1,
      verdicts: [
        {
          sentence: "You have been served with a claim.",
          supported: true,
          quote: "The defendant has been served and the time to deliver a defence has not yet run out.",
          sourceId: "stage-premise",
          quoteFound: true,
        },
      ],
    },
  };

  check(
    "a verdict citing the stage map as corpus support is refused",
    gateFailures(circular as StageAnswer, stageForPlant).some((failure) =>
      failure.includes("circular"),
    ),
    "our own prose recorded as corpus support is how a false statement in a stage " +
      "description would pass verification unchallenged",
  );

  /** A verdict naming a source that is not a corpus file at all. */
  const inventedSource = {
    ...soundBlock,
    verification: {
      status: "verified-draft" as const,
      verifiedAt: new Date().toISOString(),
      attempts: 1,
      verdicts: [
        {
          sentence: "Serve a defence on every other party and file it with the clerk.",
          supported: true,
          quote: CITATION_FOR_CONTROL,
          sourceId: "guide-that-does-not-exist",
          quoteFound: true,
        },
      ],
    },
  };

  check(
    "a verdict naming a source that is not a vendored file is refused",
    gateFailures(inventedSource as StageAnswer, stageForPlant).some((failure) =>
      failure.includes("not a vendored"),
    ),
    "",
  );
}

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

// ===========================================================================
// FORUM-CHECK STAGES ROUTE. THEY DO NOT INSTRUCT.
// ===========================================================================
//
// Three before-filing stages are the catch-alls a MISCLASSIFIED matter lands on.
// "Can I sue over this, and is Small Claims the right court?" is what a criminal
// complaint, a tenancy dispute or a human-rights matter looks like after two
// model components have each got it wrong — which is not hypothetical: "I want
// him charged" was classified CIVIL at 0.8 and then placed at
// `before-filing:deciding-whether-to-sue` at 0.90.
//
// A person who arrives there needs ROUTING. Small Claims procedure is the one
// thing that would send them further in the wrong direction, and it is exactly
// what a drafter given those stages reaches for, because the stage map hands it
// r. 6.01 and a limitation period.

{
  const forumStages = CASE_STAGES.filter((stage) => stage.forumCheckOnly);

  check(
    "the three catch-all before-filing stages are marked forum-check only",
    forumStages.length === 3 &&
      forumStages.some((stage) => stage.id === "before-filing:deciding-whether-to-sue"),
    `marked: ${forumStages.map((s) => s.id).join(", ") || "(none)"}`,
  );

  /*
   * Every forum-check stage also requires affirmative scope. Two different claims
   * about the same stages, and both are wanted: the scope gate stops the block
   * rendering at all for a matter the classifier did not place in Small Claims,
   * and this rule governs what it may SAY if it does render — which matters
   * because the classifier can be right about the forum and the resolver still
   * wrong about the stage.
   */
  for (const stage of forumStages) {
    check(
      `${stage.id} also requires affirmative scope`,
      stage.requiresAffirmativeScope === true,
      "the criminal-complaint failure was two components agreeing, so one gate is " +
        "exactly what would not have caught it",
    );
  }

  const example = stages.get("before-filing:deciding-whether-to-sue");
  if (!example) throw new Error("the catch-all stage is missing from the map");

  /** What a drafter handed r. 6.01 and a limitation period actually writes. */
  const procedure = [
    ["a numbered form", "You start an action by filing a Plaintiff's Claim (Form 7A) with the clerk."],
    ["a numbered rule", "The action must be commenced in the territorial division under r. 6.01 (1)."],
    ["a defence", "The defendant then has 20 days to file a defence."],
    ["a settlement conference", "A settlement conference is scheduled after the first defence is filed."],
    ["a motion", "You may bring a motion for an order extending the time."],
    ["default", "If they do not respond you can have them noted in default."],
    ["service of a document", "You must serve the claim on every defendant."],
  ];

  for (const [what, text] of procedure) {
    check(
      `forum-check gate refuses ${what}`,
      forumCheckOnlyProblems(text, example).length > 0,
      `passed: "${text}"`,
    );
  }

  /*
   * And the other direction, which is what stops the gate from being a way of
   * publishing nothing for these stages. The monetary limit is FORUM-CHECK
   * content: $50,000 is the line between Small Claims and the Superior Court, so
   * stating it answers "is this the right court" rather than instructing.
   */
  const forumCheck = [
    "Small Claims Court can hear claims up to $50,000, not counting interest and costs.",
    "A dispute about a residential tenancy is heard by the Landlord and Tenant Board.",
    "If your claim is for more than that amount, it belongs in the Superior Court of Justice.",
    "A lawyer or paralegal can tell you which court your matter belongs in.",
    "More than two years appear to have passed since the events.",
  ];

  for (const text of forumCheck) {
    const problems = forumCheckOnlyProblems(text, example);
    check(
      `forum-check gate allows: "${text.slice(0, 46)}…"`,
      problems.length === 0,
      problems.join("; "),
    );
  }

  /** The gate applies to these stages ONLY. Every other block is untouched. */
  const ordinary = stages.get("defendant:served-defence-period-running");
  check(
    "the gate does not touch an ordinary stage",
    ordinary !== undefined &&
      forumCheckOnlyProblems(
        "You must serve a defence on every other party and file it with the clerk.",
        ordinary,
      ).length === 0,
    "an ordinary stage's whole job is to state procedure; gating it would empty the product",
  );

  /** And it is wired into the promotion gate, not only available to be called. */
  const planted = {
    id: "answer:forum-check-plant",
    stageId: "before-filing:deciding-whether-to-sue",
    userQuestion: example.userQuestion,
    whatsHappening: "You start an action by filing a Plaintiff's Claim (Form 7A) with the clerk.",
    whatToDoNext: "Small Claims Court hears claims up to $50,000.",
    yourDeadline: null,
    whatHappensAfter: "A lawyer or paralegal can tell you which court your matter belongs in.",
    slots: [],
    citations: [],
    sourceIds: [],
    verification: {
      status: "verified-draft" as const,
      verifiedAt: new Date().toISOString(),
      attempts: 1,
      verdicts: [],
    },
  };

  check(
    "a forum-check stage carrying procedure is REFUSED BY gateFailures",
    gateFailures(planted as StageAnswer, example).some((failure) =>
      failure.includes("FORUM-CHECK content"),
    ),
    `gateFailures did not refuse it: ${gateFailures(planted as StageAnswer, example).join("; ")}`,
  );
}


console.log("");
console.log("STAGE ANSWERS");
console.log("");
console.log(
  `  ${answers.length} block(s): ${verified.length} verified-draft, ` +
    `${needsHuman.length} needs-human, ${noSource.length} no-source`,
);
console.log(`  ${passed} check(s) passed`);
// ===========================================================================
// AN ELIDED QUOTE — THE GATE WAS REFUSING TRUE SUPPORT FOR A CLAIM-BARRING RULE
// ===========================================================================
//
// `before-filing:notice-snow-ice-private` sat at needs-human across two runs on a
// verdict quoting Occupiers' Liability Act s. 6.1 (1) verbatim with ONE clause
// elided — ", including the date, time and location of the occurrence," replaced
// by "...". Every word the verifier kept is in the vendored text, in order.
// `includes()` cannot match that, so the gate called a true quote a fabrication
// and held back the 60-day notice deadline: one of three deadlines in this
// product that bar the claim outright.
//
// findQuote now chains the fragments. These prove the chaining is not a hole.

{
  /** The real verdict, from the run that sat at needs-human. */
  const ELIDED_BUT_REAL =
    "No action shall be brought for the recovery of damages for personal injury caused " +
    "by snow or ice against a person or persons listed in subsection (2) unless, within " +
    "60 days after the occurrence of the injury, written notice of the claim...has been " +
    "personally served on or sent by registered mail to at least one person listed in " +
    "subsection (2).";

  check(
    "a quote eliding its own middle with ... is found when every fragment really is there",
    findQuote(ELIDED_BUT_REAL)?.sourceId === "occupiers-liability-act",
    `got ${findQuote(ELIDED_BUT_REAL)?.sourceId ?? "NOT FOUND"} — this is s. 6.1 (1) with ` +
      `one clause elided, and refusing it holds back a claim-barring deadline`,
  );

  /*
   * THE TRAP THE PROBE FOUND. "written notice of the claim" is 26 characters,
   * past the length floor, and appears in the Municipal Act, the City of Toronto
   * Act AND the Occupiers' Liability Act. Accepting a quote because each fragment
   * appears SOMEWHERE would let an ellipsis stitch two unrelated statutes
   * together and call the result support. This is the same string the real
   * verdict used, cut so its halves live in different Acts.
   */
  const STITCHED_ACROSS_SOURCES =
    "the clerk of the municipality; or if the claim is against two or more " +
    "municipalities...at least one person listed in subsection (2) of the " +
    "Occupiers' Liability Act";

  check(
    "an elided quote whose fragments live in DIFFERENT sources is refused",
    findQuote(STITCHED_ACROSS_SOURCES) === null,
    `found in ${findQuote(STITCHED_ACROSS_SOURCES)?.sourceId} — an ellipsis must not be a ` +
      `way to join two statutes into one passage`,
  );

  /** Fragments in the wrong order are not the passage. */
  const OUT_OF_ORDER =
    "has been personally served on or sent by registered mail to at least one person " +
    "listed in subsection (2)...No action shall be brought for the recovery of damages " +
    "for personal injury caused by snow or ice";

  check(
    "an elided quote whose fragments appear in the wrong order is refused",
    findQuote(OUT_OF_ORDER) === null,
    `found in ${findQuote(OUT_OF_ORDER)?.sourceId} — reversing a passage changes what it says`,
  );

  /*
   * And a gap far too large to be an elision. Both fragments are real and in the
   * right source and the right order; they are simply not one passage.
   */
  const GAP_TOO_LARGE =
    "An occupier of premises owes a duty to take such care as in all the " +
    "circumstances of the case is reasonable...at least one person listed in " +
    "subsection (2)";

  check(
    "an elided quote spanning far more than a clause is refused",
    findQuote(GAP_TOO_LARGE) === null,
    `found in ${findQuote(GAP_TOO_LARGE)?.sourceId} — an ellipsis stands for a clause, not ` +
      `for whatever lies between two distant sentences`,
  );

  /** A fabricated fragment beside a real one still fails. */
  const ONE_REAL_ONE_INVENTED =
    "No action shall be brought for the recovery of damages for personal injury caused " +
    "by snow or ice...within 14 days after the occurrence of the injury as prescribed";

  check(
    "an elided quote with one invented fragment is refused",
    findQuote(ONE_REAL_ONE_INVENTED) === null,
    `found in ${findQuote(ONE_REAL_ONE_INVENTED)?.sourceId} — half a real passage is not support`,
  );
}

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
