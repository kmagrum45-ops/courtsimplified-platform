/**
 * Runs the verified content pipeline over stages.
 *
 *   npm run content:draft -- defendant:served-defence-period-running
 *   npm run content:draft -- --all
 *   npm run content:draft -- --all --model=gpt-4o
 *
 * *** WHAT A RUN DOES ***
 *
 * For each stage: draft, verify, and if anything is unsupported or the prose
 * is above the reading target, redraft with the verifier's reasons attached.
 * Three attempts in total — the first draft and two redrafts. After that the
 * block is NEEDS_HUMAN and is not published.
 *
 * *** IT DOES NOT PUBLISH ANYTHING ***
 *
 * Output goes to a generated file and a run log. Nothing is served until it is
 * wired in deliberately, and nothing reaches `approved` from here at all.
 *
 * *** WHY THE RUN LOG IS COMMITTED ***
 *
 * The runtime audit log writes to Supabase, which is production and which
 * nothing here may touch. But the provenance of content that will reach users
 * has to live somewhere a regulator can read. So each run writes a log to the
 * repository: model, time, token counts, and for every sentence the verifier's
 * verdict and the passage it quoted. That is the evidence that the two passes
 * actually happened and what they concluded.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import {
  draft,
  verify,
  sentencesOf,
  sourceMaterial,
  stagePremise,
  readabilityProblem,
  addUsage,
  costOf,
  type Usage,
  type DraftSections,
} from "./verifiedContentPipeline";
import { CASE_STAGES, isSpecialStage, type CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import type { SentenceVerdict, StageAnswer } from "../../src/lib/content-library/stageAnswers";
import { readability } from "../../src/lib/content-library/readability";

// The key is read from .env.local inside this process and never printed.
dotenv.config({ path: ".env.local", quiet: true });

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "content-pipeline");

const MAX_ATTEMPTS = 3; // the first draft plus two redrafts

type Attempt = {
  attempt: number;
  sections: DraftSections;
  verdicts: SentenceVerdict[];
  readability: number;
  problems: string[];
};

/**
 * Which vendored sources the verifier actually found support in.
 *
 * The stage premise is excluded: it is where the case stands, not a source for
 * anything the law says, and listing it as provenance would overstate what
 * backs the block.
 */
function sourcesUsed(verdicts: SentenceVerdict[]): string[] {
  return Array.from(
    new Set(
      verdicts
        .filter((verdict) => verdict.supported && verdict.sourceId)
        .map((verdict) => verdict.sourceId as string)
        .filter((sourceId) => sourceId !== "stage-premise"),
    ),
  ).sort();
}

function proseOf(sections: DraftSections): string {
  return [
    sections.whatsHappening,
    sections.whatToDoNext,
    sections.yourDeadline ?? "",
    sections.whatHappensAfter,
  ]
    .filter((part) => part && part !== "NOT_SUPPORTED")
    .join("\n\n");
}

async function runStage(
  model: string,
  stage: CaseStage,
  usage: Usage[],
): Promise<{ answer: StageAnswer; attempts: Attempt[] }> {
  const source = sourceMaterial(stage);
  const attempts: Attempt[] = [];
  const feedback: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const drafted = await draft(model, stage, feedback);
    addUsage(usage, drafted.usage);

    const prose = proseOf(drafted.sections);
    const sentences = sentencesOf(prose);

    const verified = await verify(model, source, sentences, stagePremise(stage));
    addUsage(usage, verified.usage);

    const problems: string[] = [];

    for (const verdict of verified.verdicts) {
      if (!verdict.supported) {
        problems.push(`"${verdict.sentence}" — ${verdict.reason ?? "unsupported"}`);
      }
    }

    /*
     * A section the drafter gave up on is a problem to feed back, not a
     * silent gap. NOT_SUPPORTED is the honest answer when the sources do not
     * reach; it still means the block is not publishable as it stands.
     */
    for (const [name, value] of Object.entries(drafted.sections)) {
      if (value === "NOT_SUPPORTED") {
        problems.push(`the "${name}" section could not be written from the sources`);
      }
    }

    /*
     * The deadline section is checked against the STAGE MAP, not against the
     * drafter's judgment. A stage with a deadline whose block omits it is the
     * failure that matters most, and a model is the wrong thing to ask.
     */
    if (stage.deadlines.length > 0 && !drafted.sections.yourDeadline) {
      problems.push(
        `this stage has ${stage.deadlines.length} deadline(s) in the stage map but the ` +
          `draft gives no deadline section`,
      );
    }
    if (stage.deadlines.length === 0 && drafted.sections.yourDeadline) {
      problems.push(
        "this stage has no deadline in the stage map, but the draft states one — " +
          "check whether the stage map is wrong or the draft invented it",
      );
    }

    const reading = readabilityProblem(prose);
    if (reading) problems.push(reading);

    attempts.push({
      attempt,
      sections: drafted.sections,
      verdicts: verified.verdicts,
      readability: readability(prose).grade,
      problems,
    });

    if (problems.length === 0) {
      return {
        answer: {
          id: `answer:${stage.id}`,
          stageId: stage.id,
          userQuestion: stage.userQuestion,
          whatsHappening: drafted.sections.whatsHappening,
          whatToDoNext: drafted.sections.whatToDoNext,
          yourDeadline: drafted.sections.yourDeadline,
          whatHappensAfter: drafted.sections.whatHappensAfter,
          slots: [],
          citations: stage.rules,
          sourceIds: sourcesUsed(verified.verdicts),
          verification: {
            status: "verified-draft",
            verifiedAt: new Date().toISOString(),
            attempts: attempt,
            verdicts: verified.verdicts,
          },
        },
        attempts,
      };
    }

    feedback.length = 0;
    feedback.push(...problems);
  }

  const last = attempts[attempts.length - 1];
  return {
    answer: {
      id: `answer:${stage.id}`,
      stageId: stage.id,
      userQuestion: stage.userQuestion,
      whatsHappening: last.sections.whatsHappening,
      whatToDoNext: last.sections.whatToDoNext,
      yourDeadline: last.sections.yourDeadline,
      whatHappensAfter: last.sections.whatHappensAfter,
      slots: [],
      citations: stage.rules,
      sourceIds: sourcesUsed(last.verdicts),
      verification: {
        status: "needs-human",
        lastAttemptAt: new Date().toISOString(),
        attempts: MAX_ATTEMPTS,
        verdicts: last.verdicts,
        unsupported: last.problems,
      },
    },
    attempts,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const modelArg = args.find((arg) => arg.startsWith("--model="));
  const model = modelArg ? modelArg.slice("--model=".length) : "gpt-4o-mini";

  const requested = args.filter((arg) => !arg.startsWith("--"));
  const stages = args.includes("--all")
    ? CASE_STAGES.filter((stage) => !isSpecialStage(stage.id))
    : CASE_STAGES.filter((stage) => requested.includes(stage.id));

  if (stages.length === 0) {
    console.error("No stages selected. Pass stage ids, or --all.");
    process.exitCode = 1;
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Nothing was run.");
    process.exitCode = 1;
    return;
  }

  const usage: Usage[] = [];
  const answers: StageAnswer[] = [];
  const log: Array<{ stageId: string; attempts: Attempt[]; status: string }> = [];
  const started = Date.now();

  console.log("");
  console.log(`VERIFIED CONTENT PIPELINE — ${model}, ${stages.length} stage(s)`);
  console.log("");

  for (const stage of stages) {
    process.stdout.write(`  ${stage.id.padEnd(48)} `);
    try {
      const { answer, attempts } = await runStage(model, stage as CaseStage, usage);
      answers.push(answer);
      log.push({ stageId: stage.id, attempts, status: answer.verification.status });

      const supported = attempts[attempts.length - 1].verdicts.filter((v) => v.supported).length;
      const total = attempts[attempts.length - 1].verdicts.length;
      console.log(
        `${answer.verification.status.padEnd(14)} ${attempts.length} attempt(s), ` +
          `${supported}/${total} sentences supported, grade ` +
          `${attempts[attempts.length - 1].readability.toFixed(1)}`,
      );
      if (answer.verification.status === "needs-human") {
        for (const problem of attempts[attempts.length - 1].problems.slice(0, 3)) {
          console.log(`      ${problem.slice(0, 130)}`);
        }
      }
    } catch (error) {
      console.log(`ERROR — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    path.join(OUT_DIR, `run-${stamp}.json`),
    `${JSON.stringify({ model, startedAt: new Date(started).toISOString(), usage, log }, null, 2)}\n`,
  );
  /*
   * MERGE, never overwrite.
   *
   * A two-stage run replaced the output of a thirty-five-stage run and the
   * only sign was the verification suite reporting two blocks. Nothing was
   * lost that a re-run could not rebuild, but a pipeline whose output depends
   * on the order you happened to invoke it is a pipeline you cannot trust the
   * artefact of. Blocks are keyed by id, and a fresh result replaces the entry
   * for that stage and leaves every other one alone.
   */
  const answersPath = path.join(OUT_DIR, "stage-answers.json");
  const existing: StageAnswer[] = existsSync(answersPath)
    ? (JSON.parse(readFileSync(answersPath, "utf8")) as StageAnswer[])
    : [];

  const merged = new Map(existing.map((answer) => [answer.id, answer]));
  for (const answer of answers) merged.set(answer.id, answer);

  writeFileSync(
    answersPath,
    `${JSON.stringify([...merged.values()].sort((a, b) => a.id.localeCompare(b.id)), null, 2)}\n`,
  );

  console.log("");
  const verified = answers.filter((a) => a.verification.status === "verified-draft").length;
  console.log(`  ${verified} verified-draft, ${answers.length - verified} needs-human`);
  console.log("");

  let total = 0;
  for (const entry of usage) {
    const cost = costOf(entry);
    total += cost;
    console.log(
      `  ${entry.calls} call(s) to ${entry.model}: ${entry.inputTokens.toLocaleString()} in, ` +
        `${entry.outputTokens.toLocaleString()} out — $${cost.toFixed(4)}`,
    );
  }
  console.log("");
  console.log(`  run cost $${total.toFixed(4)} — $${(total / stages.length).toFixed(4)} per stage`);
  console.log(`  ${((Date.now() - started) / 1000).toFixed(0)}s`);
  console.log("");
  console.log(`  written to docs/content-pipeline/`);
  console.log("");
}

void main();
