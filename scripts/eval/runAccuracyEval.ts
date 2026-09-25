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
 *   deflection misses            0
 *   deadline accuracy            100%
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
  stageCatalogueForPrompt,
  STAGE_RESOLVER_SYSTEM,
  type StageModelOutput,
  type StageResolution,
} from "../../src/lib/case-system/stage-map/resolveStage";
import { renderStageAnswer } from "../../src/lib/content-library/stageAnswerView";
import { createOpenAIClient } from "../../src/lib/case-system/openaiClient";
import { addUsage, costOf, type Usage } from "../content/verifiedContentPipeline";
import { DEADLINE_CASES, runDeadlineCases } from "./deadlineCases";

dotenv.config({ path: ".env.local", quiet: true });

const MODEL = "gpt-4o-mini";

type Result = {
  story: Story;
  resolution: StageResolution;
  /** Did the user actually get content, and for which stage? */
  shownStageId: string | null;
};

function outcomeOf(resolution: StageResolution): string {
  return resolution.kind === "suggested" ? resolution.stageId : resolution.kind;
}

function expectedOf(story: Story): string {
  return story.expect.kind === "stage" ? story.expect.stageId : story.expect.kind;
}

async function classify(story: Story, usage: Usage[]): Promise<StageResolution> {
  try {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      seed: 1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: STAGE_RESOLVER_SYSTEM },
        {
          role: "user",
          content: `STAGES:\n\n${stageCatalogueForPrompt()}\n\nTHE CASE:\n\n${story.text}`,
        },
      ],
    });

    addUsage(usage, {
      model: MODEL,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      calls: 1,
    });

    const content = response.choices[0]?.message?.content;
    return resolveFromModelOutput(content ? (JSON.parse(content) as StageModelOutput) : null);
  } catch (error) {
    console.error(`  ${story.id}: ${error instanceof Error ? error.message : String(error)}`);
    return resolveFromModelOutput(null);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = args.includes("--story") ? args[args.indexOf("--story") + 1] : null;
  const stories = only ? STORIES.filter((story) => story.id === only) : STORIES;

  // ---- deadlines first: no model, no excuses ----------------------------

  const deadlines = runDeadlineCases();

  if (!process.env.OPENAI_API_KEY) {
    console.log("");
    console.log("  OPENAI_API_KEY is not set — deadline cases ran, classification did not.");
    report([], deadlines, []);
    return;
  }

  const usage: Usage[] = [];
  const results: Result[] = [];

  console.log("");
  console.log(`ACCURACY EVAL — ${stories.length} stor${stories.length === 1 ? "y" : "ies"}, ${MODEL}`);
  console.log("");

  for (const story of stories) {
    const resolution = await classify(story, usage);

    /*
     * What the user would actually SEE. A suggested stage with no published
     * block shows nothing, so it cannot be wrong-stage content — the runtime
     * turns that into UNKNOWN. Measuring the suggestion alone would overstate
     * the harm.
     */
    const shownStageId =
      resolution.kind === "suggested" && renderStageAnswer(resolution.stageId)
        ? resolution.stageId
        : null;

    results.push({ story, resolution, shownStageId });

    const got = outcomeOf(resolution);
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
      resolution.kind === "suggested" ? ` @${resolution.confidence.toFixed(2)}` : "";
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
    (result) => outcomeOf(result.resolution) === expectedOf(result.story),
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
    (result.story.neverSuggest ?? []).includes(outcomeOf(result.resolution)),
  );

  const outOfScope = results.filter((result) => result.story.expect.kind === "out-of-scope");
  const outOfScopeMissed = outOfScope.filter(
    (result) => result.resolution.kind !== "out-of-scope",
  );

  const shouldBeUnknown = results.filter((result) => result.story.expect.kind === "unknown");
  const overconfident = shouldBeUnknown.filter(
    (result) => result.resolution.kind === "suggested",
  );

  const stageAccuracy = resolvable.length
    ? (resolvable.filter((r) => outcomeOf(r.resolution) === expectedOf(r.story)).length /
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
      console.log(`      want ${expectedOf(entry.story)}, got ${outcomeOf(entry.resolution)}`);
      console.log(`      ${entry.story.because}`);
    }
    console.log("");
  }

  const misses = results.filter(
    (result) => outcomeOf(result.resolution) !== expectedOf(result.story),
  );
  if (misses.length > 0) {
    console.log("ALL MISSES:");
    for (const miss of misses) {
      const unknown = miss.resolution.kind === "unknown";
      console.log(
        `  ${unknown ? "(unsure)" : "(wrong) "} ${miss.story.id}: want ` +
          `${expectedOf(miss.story)}, got ${outcomeOf(miss.resolution)}`,
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
        overconfident.length > 0));

  if (failed) process.exitCode = 1;
  else console.log("  All targets met.");
  console.log("");
  void DEADLINE_CASES;
}

void main();
