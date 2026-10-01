/**
 * PART 6 — does the accuracy engine actually get people to the right place?
 *
 *   npm run eval:accuracy
 *   npm run eval:accuracy -- --story p-waiting-for-defence
 *
 * *** THE FOUR TARGETS, AND WHY THEY ARE NOT ONE NUMBER ***
 *
 *   stage accuracy              >= 90%
 *   wrong-stage content shown    0     (never, without the user confirming)
 *   deadline accuracy            100%
 *
 * *** A TARGET THAT WAS ADVERTISED AND NEVER COMPUTED ***
 *
 * This header used to list "deflection misses 0". Nothing measured it. Three
 * stories carry `requestsLegalAdvice` under a heading saying the product must
 * decline, and that field was read by nothing — declared in the suite and
 * ignored by the code, which is worse than not claiming it at all, because the
 * green line implied the property held.
 *
 * Found by independent review, and then measured WRONGLY: the first version
 * counted a story as "advice answered" whenever a stage resolved and content was
 * shown, which failed `advice-will-i-win` for getting exactly the right
 * treatment. The stage IS resolvable and the block carries no prediction.
 *
 * It now measures the DEFLECTION. The stage resolver returns `asksForAdvice`
 * alongside the stage, and the route shows DEFLECTION_MESSAGE with the referrals
 * when it is set. An advice story must come back carrying that acknowledgement
 * whatever the stage turned out to be — which is a real requirement, and was
 * genuinely absent: the wording existed and was wired into intake only.
 *
 * A single score would let a good result on the easy measure hide a failure on
 * the one that matters. They are not interchangeable: being unsure is cheap,
 * and being confidently wrong is what cost people their cases.
 *
 * *** UNKNOWN IS NOT A MISS ***
 *
 * Returning UNKNOWN on a story whose expected answer is a stage costs accuracy
 * — it should, we would rather know — but it is NOT counted as wrong-stage
 * content, because nothing wrong was shown. The two are tracked apart on
 * purpose, and the second is the one with a zero target.
 *
 * *** THE DEADLINE CHECK USES NO MODEL AT ALL ***
 *
 * Dates are arithmetic. They are computed by the engine and compared against
 * values worked out by hand from the rules, with the reasoning stated in the
 * case. 100% is the only acceptable figure, and anything less is a defect
 * rather than a tuning problem.
 */

import dotenv from "dotenv";

import { STORIES, type Story } from "./accuracyStories";
import {
  resolveFromModelOutput,
  type StageResolution,
} from "../../src/lib/case-system/stage-map/resolveStage";
import {
  resolveCasePosition,
  type CasePosition,
} from "../../src/lib/case-system/stage-map/resolveCasePosition";
import { renderStageAnswer } from "../../src/lib/content-library/stageAnswerView";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { costOf, type Usage } from "../content/verifiedContentPipeline";
import { DEADLINE_CASES, runDeadlineCases } from "./deadlineCases";
import { runChatCases } from "./chatCases";
import { assertNotProduction } from "../db/assertNotProduction";
import { resolveTier } from "../../src/lib/case-system/aiModels";

dotenv.config({ path: ".env.local", quiet: true });

// The eval measures what production runs: the deep tier from aiModels.ts,
// unless EVAL_MODEL names another model to compare against.
const MODEL = process.env.EVAL_MODEL || resolveTier("deep").model;

type Result = {
  story: Story;
  position: CasePosition;
  /** Did the user actually get content, and for which stage? */
  shownStageId: string | null;
};

/**
 * What the pipeline concluded, as one comparable label.
 *
 * boundary-unclear is its OWN outcome and is never collapsed into the stage it
 * also carries. Collapsing it would hide the whole point: we gave guidance AND
 * said the forum is uncertain.
 */
function outcomeOf(position: CasePosition): string {
  if (position.kind === "out-of-scope") return "out-of-scope";
  if (position.kind === "boundary-unclear") return "boundary-unclear";
  return position.stage.kind === "suggested" ? position.stage.stageId : position.stage.kind;
}

/** The stage resolution inside a position, when there is one. */
function stageOf(position: CasePosition): StageResolution | null {
  return position.kind === "out-of-scope" ? null : position.stage;
}

function expectedOf(story: Story): string {
  return story.expect.kind === "stage" ? story.expect.stageId : story.expect.kind;
}

/*
 * *** THE EVAL RUNS THE REAL PIPELINE ***
 *
 * It used to call the stage resolver directly, which meant the five
 * out-of-scope stories were measuring a component that does not own that
 * decision — and the resolver kept being blamed for a job belonging to
 * `classifyCourtPath`.
 *
 * `resolveCasePosition` is what the API route runs. Measuring anything else
 * would be measuring an arrangement of parts nobody uses.
 */
/**
 * Stories about an EXISTING case carry the court path the product already has.
 *
 * A case in the builder holds `court_path` from intake. Re-deriving it from a
 * fragment about service is asking a settled question badly — "he was served
 * last Tuesday by a process server" came back as a Landlord and Tenant Board
 * matter when it was put through the intake classifier.
 *
 * Stories about a case that does not exist yet — before-filing, out-of-scope,
 * the landlord boundary — carry nothing, because at intake nothing is settled.
 * That is the entry point those stories actually exercise.
 */
function knownCourtPathFor(story: Story): string | null {
  /*
   * *** THIS USED TO READ THE ANSWER KEY ***
   *
   * It derived the court path from `story.expect` — so every story whose right
   * answer was a Small Claims stage was told, for free, that it was a Small
   * Claims matter, and `resolveCasePosition` then skipped the scope classifier
   * entirely. A scope classifier that could not tell Small Claims from the LTB
   * would still have scored well.
   *
   * The reasoning behind it was sound (a real case carries a stored
   * `court_path`) and the implementation quietly cheated. Found by independent
   * review. It now reads a field on the STORY, set from what that story
   * represents, never from what it expects.
   */
  return story.existingCase ? "small-claims" : null;
}

async function classify(story: Story): Promise<CasePosition> {
  try {
    return await resolveCasePosition(story.text, {
      model: MODEL,
      knownCourtPath: knownCourtPathFor(story),
    });
  } catch (error) {
    console.error(`  ${story.id}: ${error instanceof Error ? error.message : String(error)}`);
    // A thrown classification establishes nothing, so the verdict must fail the
    // forum gate rather than default to something that passes it.
    return {
      kind: "in-scope",
      stage: resolveFromModelOutput(null),
      scope: { primaryPath: "unknown", confidence: 0 },
    };
  }
}

async function main(): Promise<void> {
  // Before anything else, and before any model spend.
  assertNotProduction("eval:accuracy");

  const args = process.argv.slice(2);
  const only = args.includes("--story") ? args[args.indexOf("--story") + 1] : null;
  const stories = only ? STORIES.filter((story) => story.id === only) : STORIES;

  // ---- deadlines first: no model, no excuses ----------------------------

  const deadlines = runDeadlineCases();

  /*
   * *** A MISSING KEY IS A FAILURE, NOT A PASS ***
   *
   * This used to call report([]) and print "All targets met." with exit code
   * 0 having classified ZERO of 45 stories, because `failed` was then driven
   * only by the deadline cases. A CI job with an unset secret reported green.
   *
   * Found by independent review, and it is the worst kind of check: one that
   * is loudest exactly when it has done nothing.
   */
  if (!process.env.OPENAI_API_KEY) {
    console.log("");
    console.log("  OPENAI_API_KEY is not set. The deadline cases ran; NOTHING was classified.");
    console.log(`  ${deadlines.passed}/${deadlines.total} deadline case(s) passed.`);
    console.log("");
    console.log("  THIS IS NOT A PASS — no story was measured.");
    console.log("");
    process.exitCode = 1;
    return;
  }

  const usage: Usage[] = [];
  const results: Result[] = [];

  console.log("");
  console.log(`ACCURACY EVAL — ${stories.length} stor${stories.length === 1 ? "y" : "ies"}, ${MODEL}`);
  console.log("");

  for (const story of stories) {
    const position = await classify(story);
    const resolution = stageOf(position);

    /*
     * What the user would actually SEE. A suggested stage with no published
     * block shows nothing, so it cannot be wrong-stage content — the runtime
     * turns that into UNKNOWN. Measuring the suggestion alone would overstate
     * the harm.
     */
    /*
     * *** RENDERED THE WAY THE ROUTE RENDERS, SCOPE VERDICT AND ALL ***
     *
     * This used to call the door with no scope, which stopped reflecting the
     * product the moment the forum gate landed: a stage marked
     * `requiresAffirmativeScope` would have been refused here for the wrong
     * reason, and shown in production for the right one — or the reverse.
     *
     * An eval that renders differently from the route is measuring an
     * arrangement of parts nobody uses, which is the same finding that moved the
     * out-of-scope stories onto `resolveCasePosition` in the first place.
     */
    const scope = position.kind === "in-scope" ? position.scope : null;
    const shownStageId =
      resolution?.kind === "suggested" &&
      renderStageAnswer(resolution.stageId, {}, {}, scope)
        ? resolution.stageId
        : null;

    results.push({ story, position, shownStageId });

    const got = outcomeOf(position);
    const want = expectedOf(story);
    const ok = got === want;
    /*
     * The confidence is printed, not just the answer.
     *
     * Three stories kept being answered when they should have been declined,
     * and "it got it wrong" does not say whether the fix is a better prompt or
     * a higher floor. The number does.
     */
    const confidence =
      resolution?.kind === "suggested" ? ` @${resolution.confidence.toFixed(2)}` : "";
    console.log(
      `  ${ok ? "ok  " : "MISS"}  ${story.id.padEnd(30)} want ${want.padEnd(44)} got ${got}${confidence}`,
    );
    // Why an UNKNOWN came back. Without this a miss cannot say whether the fix
    // is the prompt, the floor or a failed call (2026-10-01: 15 clear stories
    // came back unknown and the log could not say which).
    if (!ok && resolution?.kind === "unknown") {
      console.log(
        `          reason ${resolution.reason}; candidates ${resolution.candidates.join(", ") || "(none)"}` +
          (position.kind === "in-scope"
            ? `; scope ${position.scope.primaryPath} @${position.scope.confidence.toFixed(2)}`
            : ""),
      );
    }
  }

  const chat = await runChatCases();

  report(results, deadlines, usage, chat);
}

function report(
  results: Result[],
  deadlines: ReturnType<typeof runDeadlineCases>,
  usage: Usage[],
  chat: Awaited<ReturnType<typeof runChatCases>>,
): void {
  const resolvable = results.filter((result) => result.story.expect.kind === "stage");
  const correct = results.filter(
    (result) => outcomeOf(result.position) === expectedOf(result.story),
  );

  /*
   * WRONG-STAGE CONTENT: the measure with a zero target.
   *
   * Content was actually rendered, for a stage that is not the right one.
   * Returning UNKNOWN is not this. Suggesting a stage we have no block for is
   * not this either — nothing was shown.
   */
  const wrongStageShown = results.filter((result) => {
    if (!result.shownStageId) return false;
    /*
     * *** boundary-unclear SHOWS A STAGE ON PURPOSE ***
     *
     * `landlord-damage-claim-is-a-debt-claim` printed as wrong-stage content
     * under the line "want boundary-unclear, got boundary-unclear". It got
     * exactly what it should: where the LTB's jurisdiction ends for a FORMER
     * tenant is unsourceable (recorded in courtPathClassifier.ts), so the
     * design is to give the Small Claims guidance AND say the forum may be the
     * other one. A dead end would be safe and useless.
     *
     * So content shown alongside a boundary caveat is the designed outcome, not
     * wrong-stage content, and counting it as a failure punished the component
     * for behaving as specified.
     */
    if (expectedOf(result.story) === "boundary-unclear") return false;
    return result.shownStageId !== expectedOf(result.story);
  });

  /*
   * A stage explicitly named as dangerous for this story. Harm is not
   * symmetric — telling a defendant with judgment against them how to begin a
   * claim is not the same size of error as a neighbouring-stage mix-up.
   */
  const dangerous = results.filter((result) =>
    (result.story.neverSuggest ?? []).includes(outcomeOf(result.position)),
  );

  /*
   * *** A MISS IS WHAT THE READER GETS, NOT WHICH COMPONENT CAUGHT IT ***
   *
   * This filtered on `position.kind !== "out-of-scope"`, which is the
   * CLASSIFIER's verdict. Two stories then printed as misses reading
   * "want out-of-scope, got out-of-scope" under a FAIL line, because the
   * classifier let them through and the stage resolver's own backstop caught
   * them — which the route then presents as out of scope, correctly, with
   * referrals and no Small Claims guidance.
   *
   * So the reader was sent to the right place and the eval called it a failure.
   * A red line that is wrong is worse than no line: it is the one a person
   * starts ignoring, and this report is evidence for a regulator.
   *
   * The miss is now measured on the outcome the reader actually gets. Which
   * component caught it is still worth knowing — a backstop doing the
   * classifier's job is a weakness even when the answer is right — so it is
   * reported on its own line rather than as a failure.
   */
  const outOfScope = results.filter((result) => result.story.expect.kind === "out-of-scope");

  /*
   * *** THREE OUTCOMES, AND ONLY ONE OF THEM HURTS ***
   *
   *   sent to the right forum   correct
   *   UNKNOWN, with referrals   not the answer, and not harmful: no Small Claims
   *                             guidance is shown, and the referrals are the same
   *                             ones the out-of-scope path gives
   *   a Small Claims stage,
   *   with content              THE HARM. Somebody with a criminal complaint or an
   *                             out-of-province dispute is handed procedural
   *                             instructions for a court that will not hear them
   *
   * `oos-criminal` — "I want him charged" — came back UNKNOWN on one run and
   * out-of-scope on the next, and the old measure counted the UNKNOWN run as
   * identical to the third case. It is not: the story's own reasoning says
   * "answering it as a Small Claims question would mislead", and UNKNOWN answers
   * it as nothing.
   *
   * So the zero target is on the harm, and the unhelpful-but-safe case is reported
   * on its own line rather than hidden. Splitting them is what makes the zero mean
   * something; collapsing them made a run fail for being cautious.
   */
  const outOfScopeMissed = outOfScope.filter((result) => result.shownStageId !== null);

  /*
   * *** A THIRD BUCKET, BECAUSE THE SECOND WAS FLATTERING ITSELF ***
   *
   * On one run `oos-criminal` — "I want him charged" — came back
   * `before-filing:deciding-whether-to-sue` AT 0.90. No content reached the
   * reader, so it counted as the safe case. It is not safe; it is LUCKY. Nothing
   * was shown because that stage has no published block yet, and the day it gets
   * one this becomes the harm case with no code change and no warning.
   *
   * So a confident Small Claims stage on an out-of-scope matter is reported apart
   * from a genuine UNKNOWN. One is the pipeline declining; the other is the
   * pipeline being wrong and the content gap covering for it.
   */
  /*
   * *** WHAT "LATENT" MEANS NOW THAT THE FORUM GATE EXISTS ***
   *
   * It used to mean: a stage was suggested confidently and nothing was shown
   * ONLY because that block is unpublished. That was luck, and it was reported
   * as such — the day somebody published the block it became real harm.
   *
   * The forum gate removed the luck for the stages that carry it: a matter the
   * classifier did not affirmatively place in Small Claims cannot render those
   * blocks whether or not they are published. So a story is only latent now if
   * the suggested stage is one the gate does NOT cover — where publishing content
   * would still turn a wrong suggestion into wrong content.
   *
   * The distinction matters for the report. "Nothing is shown because we have not
   * written it" and "nothing is shown because the gate refused it" look identical
   * to a reader and are opposite facts about the product.
   */
  const outOfScopeLatent = outOfScope.filter((result) => {
    if (result.shownStageId !== null) return false;
    const stage = stageOf(result.position);
    if (stage?.kind !== "suggested") return false;
    return findStage(stage.stageId)?.requiresAffirmativeScope !== true;
  });

  /** Confidently suggested, and stopped by the gate rather than by a content gap. */
  const outOfScopeGated = outOfScope.filter((result) => {
    const stage = stageOf(result.position);
    return (
      result.shownStageId === null &&
      stage?.kind === "suggested" &&
      findStage(stage.stageId)?.requiresAffirmativeScope === true
    );
  });
  const outOfScopeUnplaced = outOfScope.filter(
    (result) =>
      result.shownStageId === null &&
      stageOf(result.position)?.kind !== "suggested" &&
      outcomeOf(result.position) !== "out-of-scope",
  );
  const caughtByBackstopOnly = outOfScope.filter(
    (result) =>
      result.position.kind !== "out-of-scope" &&
      outcomeOf(result.position) === "out-of-scope",
  );

  const shouldBeUnknown = results.filter((result) => result.story.expect.kind === "unknown");
  const overconfident = shouldBeUnknown.filter(
    (result) => stageOf(result.position)?.kind === "suggested",
  );

  /*
   * Legal-advice stories, measured as far as this pipeline can.
   *
   * The stage may well be resolvable — "my trial is next week, what should I
   * say to the judge" has a clear stage — so a suggestion is not itself a
   * failure. What must not happen is the advice question being treated as
   * answered. This pipeline has no deflection step, so what is checked is that
   * such a story never ends with content presented as a settled answer.
   */
  /*
   * *** THIS MEASURED THE WRONG THING, AND ITS FAILURE WAS UNEARNED ***
   *
   * It counted a story as "advice answered" whenever a stage resolved AND content
   * was shown. So `advice-will-i-win` failed for getting exactly the right
   * treatment: the stage IS resolvable, and the block it renders is the same
   * verified procedural content anybody at that stage receives, carrying no
   * prediction — which the outcome-language gate guarantees before publication.
   *
   * Withholding that content would punish the person for not knowing what kind of
   * question to ask. What must not happen is their actual question going
   * unanswered in silence, as if procedural information were a reply to "will I
   * win?".
   *
   * So the measure is now the DEFLECTION: an advice story must come back carrying
   * the acknowledgement that we cannot answer it, whatever the stage turned out to
   * be. That is a real requirement and it was genuinely missing — the wording
   * existed as DEFLECTION_MESSAGE and was wired into intake's safety pass only,
   * with nothing equivalent on the stage route.
   */
  const adviceStories = results.filter((result) => result.story.requestsLegalAdvice);
  const adviceUnflagged = adviceStories.filter(
    (result) => stageOf(result.position)?.asksForAdvice !== true,
  );

  const stageAccuracy = resolvable.length
    ? (resolvable.filter((r) => outcomeOf(r.position) === expectedOf(r.story)).length /
        resolvable.length) *
      100
    : 0;

  console.log("");
  console.log("RESULTS");
  console.log("");
  if (results.length > 0) {
    console.log(`  overall            ${correct.length}/${results.length}`);
    console.log(
      `  stage accuracy     ${stageAccuracy.toFixed(0)}%  (target >= 90%)   ` +
        `${stageAccuracy >= 90 ? "PASS" : "FAIL"}`,
    );
    console.log(
      `  wrong-stage shown  ${wrongStageShown.length}     (target 0)        ` +
        `${wrongStageShown.length === 0 ? "PASS" : "FAIL"}`,
    );
    console.log(
      `  dangerous stage    ${dangerous.length}     (target 0)        ` +
        `${dangerous.length === 0 ? "PASS" : "FAIL"}`,
    );
    console.log(
      `  out-of-scope harm  ${outOfScopeMissed.length}     (target 0)        ` +
        `${outOfScopeMissed.length === 0 ? "PASS" : "FAIL"}   ` +
        `(Small Claims content actually SHOWN on a matter that belongs elsewhere)`,
    );
    console.log(
      `  out-of-scope latent ${outOfScopeLatent.length}    (target 0)        ` +
        `${outOfScopeLatent.length === 0 ? "PASS" : "FAIL"}   ` +
        `a Small Claims stage suggested CONFIDENTLY; nothing shown only because that ` +
        `block is unpublished`,
    );
    console.log(
      `  gate refused      ${outOfScopeGated.length}                        ` +
        `    a wrong stage STOPPED BY THE FORUM GATE rather than by a content gap`,
    );
    console.log(
      `  out-of-scope unsure ${outOfScopeUnplaced.length}                        ` +
        `    came back UNKNOWN with referrals — not the answer, and not harmful`,
    );
    console.log(
      `  caught by backstop ${caughtByBackstopOnly.length}                     ` +
        `     right answer, wrong component: the classifier let these through and the ` +
        `stage resolver stopped them`,
    );
    console.log(
      `  overconfident      ${overconfident.length}     (target 0)        ` +
        `${overconfident.length === 0 ? "PASS" : "FAIL"}`,
    );
    console.log(
      `  advice deflected   ${adviceStories.length - adviceUnflagged.length}/${adviceStories.length}   (target all)      ` +
        `${adviceUnflagged.length === 0 ? "PASS" : "FAIL"}   ` +
        `(${adviceStories.length} legal-advice stor${adviceStories.length === 1 ? "y" : "ies"})`,
    );
  }
  /*
   * Two lines, not one, because they are not the same claim.
   *
   * The first says the date a reader would SEE is right — measured through the
   * render path, guard included, with the date read out of the prose rather than
   * out of the engine's return value. The second says how many of those went the
   * whole way through the runtime door and a real published block.
   *
   * Reporting only the first would let "9/9 end to end" stand for something
   * broader than it is, and reporting only the second would hide six correct
   * dates behind two published blocks. The gap between them IS the remaining
   * work: the three notice stages are still needs-human, and the limitation
   * period runs from an event we deliberately never ask about.
   */
  console.log(
    `  deadline accuracy  ${deadlines.passed}/${deadlines.total}   (target 100%)     ` +
      `${deadlines.failures.length === 0 ? "PASS" : "FAIL"}   ` +
      `(as rendered to a reader, not as returned by the engine)`,
  );
  console.log(
    `  through a block    ${deadlines.throughPublishedBlock}/${deadlines.total}                     ` +
      `     the runtime door end to end; the rest have no published block yet`,
  );

  /*
   * The chat, measured rather than asserted.
   *
   * Two numbers because the two decisions fail differently. Picking the wrong
   * BLOCK hands somebody another position's procedure. Getting the ADVICE flag
   * wrong tells them their ordinary procedural question needs a lawyer, or fails
   * to tell them that a question about their odds does.
   */
  console.log(
    `  chat routing      ${chat.blockCorrect}/${chat.total}   (target all)      ` +
      `${chat.blockCorrect === chat.total ? "PASS" : "FAIL"}   which published block answers the question`,
  );
  console.log(
    `  chat advice flag  ${chat.adviceCorrect}/${chat.total}   (target all)      ` +
      `${chat.adviceCorrect === chat.total ? "PASS" : "FAIL"}   whether the question is one only a licensee may answer`,
  );  console.log("");

  for (const [label, entries] of [
    ["WRONG-STAGE CONTENT SHOWN", wrongStageShown],
    ["DANGEROUS STAGE SUGGESTED", dangerous],
    ["OUT-OF-SCOPE MISSED", outOfScopeMissed],
    ["ANSWERED CONFIDENTLY WHEN IT SHOULD NOT HAVE", overconfident],
  ] as const) {
    if (entries.length === 0) continue;
    console.log(`${label}:`);
    for (const entry of entries) {
      console.log(`  ${entry.story.id}`);
      console.log(`      want ${expectedOf(entry.story)}, got ${outcomeOf(entry.position)}`);
      console.log(`      ${entry.story.because}`);
    }
    console.log("");
  }

  const misses = results.filter(
    (result) => outcomeOf(result.position) !== expectedOf(result.story),
  );
  if (misses.length > 0) {
    console.log("ALL MISSES:");
    for (const miss of misses) {
      const unknown = stageOf(miss.position)?.kind === "unknown";
      console.log(
        `  ${unknown ? "(unsure)" : "(wrong) "} ${miss.story.id}: want ` +
          `${expectedOf(miss.story)}, got ${outcomeOf(miss.position)}`,
      );
    }
    console.log("");
  }

  if (chat.failures.length > 0) {
    console.log("CHAT:");
    console.log("");
    for (const failure of chat.failures) console.log(`  ${failure}`);
    console.log("");
  }

  if (deadlines.failures.length > 0) {
    console.log("DEADLINE FAILURES:");
    for (const failure of deadlines.failures) console.log(`  ${failure}`);
    console.log("");
  }

  for (const entry of usage) {
    console.log(
      `  ${entry.calls} call(s): ${entry.inputTokens.toLocaleString()} in, ` +
        `${entry.outputTokens.toLocaleString()} out — $${costOf(entry).toFixed(4)}`,
    );
  }
  console.log("");

  const failed =
    deadlines.failures.length > 0 ||
    chat.failures.length > 0 ||
    (results.length > 0 &&
      (stageAccuracy < 90 ||
        wrongStageShown.length > 0 ||
        dangerous.length > 0 ||
        outOfScopeMissed.length > 0 ||
    outOfScopeLatent.length > 0 ||
        adviceUnflagged.length > 0 ||
        overconfident.length > 0));

  if (failed) process.exitCode = 1;
  else console.log("  All targets met.");
  console.log("");
  void DEADLINE_CASES;
}

void main();
