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
import {
  NO_SOURCE_NOTICE,
  renderDeadlineSection,
  type SentenceVerdict,
  type StageAnswer,
} from "../../src/lib/content-library/stageAnswers";
import { readability } from "../../src/lib/content-library/readability";
import { wrongReaderProblems } from "./blockGates";

// The key is read from .env.local inside this process and never printed.
dotenv.config({ path: ".env.local", quiet: true });

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "content-pipeline");

/*
 * The first draft plus three redrafts.
 *
 * Raised from three after the first full run. The verifier's reason is fed
 * back each time, and the pattern in the logs was a draft converging — losing
 * one rejected sentence per pass — and then running out of attempts one short.
 * A fourth costs about a tenth of a cent and converts blocks that were failing
 * for want of one more edit.
 */
const MAX_ATTEMPTS = 4;

/**
 * A rejection that means the sources do not reach, rather than the draft being
 * wrong.
 *
 * These two are different failures and were being reported as one. "The source
 * does not mention X" after four honest attempts is not a drafting problem a
 * person can sit down and solve — it means nobody has written X down.
 */
function isSourceGap(problem: string): boolean {
  return (
    problem.includes("could not be written from the sources") ||
    /the source(s| material)? (does not|do not) (mention|state|specify|explicitly)/i.test(problem)
  );
}

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

    /*
     * The deadline is overwritten with the code-rendered one before anything
     * is verified. Whatever the drafter wrote for it is discarded.
     *
     * Nine blocks were failing because the drafter wrote a label where a
     * sentence was needed. The stage map already holds the period, the event
     * and the rule, all authored and all verified — so this section is
     * assembled rather than written, and the model has nothing to get wrong.
     */
    drafted.sections.yourDeadline = renderDeadlineSection(stage.deadlines);

    const prose = proseOf(drafted.sections);

    /*
     * *** THE DEADLINE SECTION IS NOT SENT TO THE VERIFIER ***
     *
     * It is not model prose. It is assembled by `renderDeadlineSection` from
     * the stage map's own fields — authored by hand, every citation checked
     * against the vendored corpus by `test:stage-map` on every run.
     *
     * Sending it through anyway blocked the highest-stakes stages in the
     * product. The statutory weekend warning says "under the rules a deadline
     * landing on a Saturday moves to the next working day", which is r. 1.02
     * (a) with r. 3.01 — provisions the NOTICE stages do not cite, because
     * their own deadline is counted under the Legislation Act. The verifier
     * correctly reported it as unsupported by the material in front of it, and
     * the municipal and occupiers' notice blocks — the only two in the product
     * where missing the deadline means there is no action at all — could never
     * be published.
     *
     * The verifier exists to check what a MODEL wrote. This section has a
     * stronger guarantee than a verifier verdict: `gateFailures` requires it to
     * be byte-identical to what the renderer produces, so it cannot drift, be
     * edited, or be paraphrased.
     */
    const verifiableProse = [
      drafted.sections.whatsHappening,
      drafted.sections.whatToDoNext,
      drafted.sections.whatHappensAfter,
    ]
      .filter((part) => part && part !== "NOT_SUPPORTED")
      .join("\n\n");

    const sentences = sentencesOf(verifiableProse);

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
    /*
     * *** A STAGE CAN HAVE A DEADLINE AND NO PERIOD ***
     *
     * This used to test `stage.deadlines.length > 0`, which made
     * `defendant:default-judgment-against-me` UNPUBLISHABLE FOREVER. Its only
     * deadline is r. 11.06 — "as soon as is reasonably possible in all the
     * circumstances" — recorded with count 0 because the rule fixes no period.
     * `renderDeadlineSection` correctly returns nothing for it, and this check
     * then demanded a section that must not exist.
     *
     * The stage where a wrong answer costs the most was blocked by a
     * disagreement between two of my own functions about what "has a deadline"
     * means. The renderer is the authority: if it produces a period, the block
     * must carry it.
     */
    const expectedDeadline = renderDeadlineSection(stage.deadlines);
    if (expectedDeadline && !drafted.sections.yourDeadline) {
      problems.push(
        `this stage has a deadline the stage map can state, but the draft gives no ` +
          `deadline section`,
      );
    }
    if (stage.deadlines.length === 0 && drafted.sections.yourDeadline) {
      problems.push(
        "this stage has no deadline in the stage map, but the draft states one — " +
          "check whether the stage map is wrong or the draft invented it",
      );
    }

    /*
     * Is it written for the right reader?
     *
     * This ran only at promotion, so the pipeline produced the same wrong
     * block three times and only found out afterwards — a plaintiff's stage
     * telling the plaintiff to file a Defence, then describing "the plaintiff"
     * in the third person, then mixing both readers in one block.
     *
     * A drafter can fix this when told. A promotion gate can only refuse.
     */
    problems.push(
      ...wrongReaderProblems(prose, stage.side, sourcesUsed(verified.verdicts)),
    );

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

  /*
   * Out of attempts. Which kind of failure is it?
   *
   * If EVERY remaining problem is the sources not reaching, this is not a
   * block someone can finish by trying harder — the material does not exist.
   * It becomes a no-source block: the sentences that did verify, kept, plus
   * fixed wording saying the rest is not written down and where to ask.
   *
   * If anything else is outstanding — a fabricated quote, a prediction, a
   * reading level, a missing deadline — it is needs-human, because those are
   * all fixable and none of them should be papered over by declaring the
   * sources absent.
   */
  const last = attempts[attempts.length - 1];
  const allGaps = last.problems.length > 0 && last.problems.every(isSourceGap);

  const base0 = {
    id: `answer:${stage.id}`,
    stageId: stage.id,
    userQuestion: stage.userQuestion,
    slots: [],
    citations: stage.rules,
    sourceIds: sourcesUsed(last.verdicts),
  };

  if (allGaps) {
    /*
     * Keep only what verified. The unsupported sentences are dropped rather
     * than softened — a sentence nobody could source does not improve by being
     * hedged, it just becomes harder to spot.
     */
    const kept = new Set(
      last.verdicts.filter((verdict) => verdict.supported).map((verdict) => verdict.sentence),
    );
    const keepVerified = (section: string | null): string | null => {
      if (!section || section === "NOT_SUPPORTED") return null;
      const surviving = sentencesOf(section).filter((sentence) => kept.has(sentence));
      return surviving.length > 0 ? surviving.join(" ") : null;
    };

    const trimmed: DraftSections = {
      whatsHappening: keepVerified(last.sections.whatsHappening) ?? "",
      whatToDoNext: keepVerified(last.sections.whatToDoNext) ?? "",
      /*
       * THE DEADLINE IS NEVER TRIMMED.
       *
       * Trimming keeps only the sentences the verifier supported, which is
       * right for prose a model wrote and WRONG for the deadline, because the
       * deadline is rendered by code from the stage map. Running it through
       * the verifier's verdicts meant a sentence it had not happened to mark
       * supported was silently dropped.
       *
       * The promotion gate caught the result: blocks stored as
       *   "You have 6 months, counted from the date the claim was issued."
       * where the renderer produces
       *   "Serve the claim on the defendant. You have 6 months, counted …"
       *
       * So a block could reach verified-draft having quietly lost the part of
       * its deadline that says WHAT the six months is for. Re-rendered here so
       * the published text is always exactly what the stage map says.
       */
      yourDeadline: renderDeadlineSection(stage.deadlines),
      whatHappensAfter: keepVerified(last.sections.whatHappensAfter) ?? "",
    };

    /*
     * *** WHICH SECTIONS ARE ACTUALLY EMPTY — NOT WHICH BLOCK HAD PROBLEMS ***
     *
     * The first version appended the notice to whatToDoNext unconditionally
     * whenever the leftover problems were all source gaps. That produced this,
     * on the over-the-limit stage:
     *
     *   "You can file in the Superior Court of Justice or waive the amount
     *    over $50,000. The rules do not set out a step for this."
     *
     * It had just set out the step. The block contradicted itself in
     * consecutive sentences, and a reader would rightly stop trusting it.
     *
     * The notice belongs only where a section is genuinely empty after the
     * unsupported sentences are dropped. Rejected EXTRA sentences are not a
     * gap in the sources; they are a drafter reaching past them.
     */
    const empty = (["whatToDoNext", "whatHappensAfter"] as const).filter(
      (name) => !trimmed[name],
    );

    const deadlineMissing =
      stage.deadlines.some((deadline) => deadline.length.count > 0) && !trimmed.yourDeadline;

    const reading = readabilityProblem(proseOf(trimmed));

    /*
     * If nothing is missing, this block IS verified.
     *
     * Every sentence that remains was checked against a source and its quote
     * found in the corpus — which is exactly what verified-draft means. The
     * pipeline not converging on its own is a fact about the drafter, not
     * about the content that survived.
     */
    if (empty.length === 0 && !deadlineMissing && !reading) {
      return {
        answer: {
          ...base0,
          whatsHappening: trimmed.whatsHappening || stage.description,
          whatToDoNext: trimmed.whatToDoNext,
          yourDeadline: trimmed.yourDeadline,
          whatHappensAfter: trimmed.whatHappensAfter,
          verification: {
            status: "verified-draft",
            verifiedAt: new Date().toISOString(),
            attempts: MAX_ATTEMPTS,
            verdicts: last.verdicts.filter((verdict) => verdict.supported),
          },
        },
        attempts,
      };
    }

    /*
     * no-source ONLY when a section is genuinely empty.
     *
     * The first version fell through to no-source whenever the block was not
     * publishable, which let a READABILITY failure produce a "no-source" block
     * with no empty section and therefore no notice in it. The suite caught it
     * on `plaintiff:default-judgment-signed`: a block labelled as an honest gap
     * that never told the reader anything was missing, because nothing was.
     *
     * A block that is merely too hard to read has plenty of source. That is
     * rewriting — a person's job — and it is needs-human.
     *
     * A deadline the stage map says exists, missing from the block, is never a
     * "no source" situation either. The rule is right there.
     */
    if (empty.length > 0 && !deadlineMissing) {
      return {
        answer: {
          ...base0,
          whatsHappening: trimmed.whatsHappening || stage.description,
          whatToDoNext: trimmed.whatToDoNext
            ? trimmed.whatToDoNext
            : NO_SOURCE_NOTICE,
          yourDeadline: trimmed.yourDeadline,
          whatHappensAfter: trimmed.whatHappensAfter || NO_SOURCE_NOTICE,
          verification: {
            status: "no-source",
            recordedAt: new Date().toISOString(),
            attempts: MAX_ATTEMPTS,
            verdicts: last.verdicts,
            sectionsWithoutSource: empty,
          },
        },
        attempts,
      };
    }
  }

  return {
    answer: {
      ...base0,
      whatsHappening: last.sections.whatsHappening,
      whatToDoNext: last.sections.whatToDoNext,
      // Re-rendered, never carried over from the draft — see the trimming note.
      yourDeadline: renderDeadlineSection(stage.deadlines),
      whatHappensAfter: last.sections.whatHappensAfter,
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
  const failed: string[] = [];
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
      failed.push(stage.id);
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
  const count = (status: string) => answers.filter((a) => a.verification.status === status).length;
  console.log(
    `  ${count("verified-draft")} verified-draft, ${count("needs-human")} needs-human, ` +
      `${count("no-source")} no-source`,
  );
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
  /*
   * A partial run must be impossible to miss.
   *
   * A rate-limit burst once dropped twenty of thirty-five stages and the run
   * still ended with a cheerful summary; the only sign was the verification
   * suite reporting fifteen blocks instead of thirty-five. A run that did not
   * do what it was asked reports it loudly and exits non-zero.
   */
  if (failed.length > 0) {
    console.log("");
    console.log(`  ${failed.length} of ${stages.length} STAGE(S) FAILED and were not written:`);
    for (const id of failed) console.log(`    ${id}`);
    console.log("");
    console.log("  The artefact is INCOMPLETE. Re-run before trusting the counts above.");
    process.exitCode = 1;
  }

  console.log(`  written to docs/content-pipeline/`);
  console.log("");
}

void main();
