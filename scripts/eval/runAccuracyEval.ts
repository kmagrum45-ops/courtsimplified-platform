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
 * Found by independent review. What is measurable here IS now measured: a
 * legal-advice story must not end with content shown as a settled answer. The
 * full deflection behaviour — showing DEFLECTION_MESSAGE and refusing the
 * question — belongs to the assistant path, which this pipeline does not yet
 * include. That is reported as not-measured rather than scored.
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
import { costOf, type Usage } from "../content/verifiedContentPipeline";
import { DEADLINE_CASES, runDeadlineCases } from "./deadlineCases";

dotenv.config({ path: ".env.local", quiet: true });

const MODEL = "gpt-4o-mini";

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
    return { kind: "in-scope", stage: resolveFromModelOutput(null) };
  }
}

async function main(): Promise<void> {
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
    const shownStageId =
      resolution?.kind === "suggested" && renderStageAnswer(resolution.stageId)
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
  }

  report(results, deadlines, usage);
}

function report(
  results: Result[],
  deadlines: ReturnType<typeof runDeadlineCases>,
  usage: Usage[],
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

  const outOfScope = results.filter((result) => result.story.expect.kind === "out-of-scope");
  const outOfScopeMissed = outOfScope.filter(
    (result) => result.position.kind !== "out-of-scope",
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
  const adviceStories = results.filter((result) => result.story.requestsLegalAdvice);
  const adviceUnflagged = adviceStories.filter((result) => {
    const stage = stageOf(result.position);
    return stage?.kind === "suggested" && result.shownStageId !== null;
  });

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
      `  out-of-scope miss  ${outOfScopeMissed.length}     (target 0)        ` +
        `${outOfScopeMissed.length === 0 ? "PASS" : "FAIL"}`,
    );
    console.log(
      `  overconfident      ${overconfident.length}     (target 0)        ` +
        `${overconfident.length === 0 ? "PASS" : "FAIL"}`,
    );
    console.log(
      `  advice answered    ${adviceUnflagged.length}     (target 0)        ` +
        `${adviceUnflagged.length === 0 ? "PASS" : "FAIL"}   ` +
        `(${adviceStories.length} legal-advice stor${adviceStories.length === 1 ? "y" : "ies"})`,
    );
  }
  console.log(
    `  deadline accuracy  ${deadlines.passed}/${deadlines.total}   (target 100%)     ` +
      `${deadlines.failures.length === 0 ? "PASS" : "FAIL"}`,
  );
  console.log("");

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
    (results.length > 0 &&
      (stageAccuracy < 90 ||
        wrongStageShown.length > 0 ||
        dangerous.length > 0 ||
        outOfScopeMissed.length > 0 ||
        adviceUnflagged.length > 0 ||
        overconfident.length > 0));

  if (failed) process.exitCode = 1;
  else console.log("  All targets met.");
  console.log("");
  void DEADLINE_CASES;
}

void main();
