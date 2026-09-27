/**
 * Drafts and verifies the stage-INDEPENDENT blocks, through the same pipeline as
 * the 37 stage blocks.
 *
 *   npm run content:draft-generic                 draft and verify, write the run
 *   npm run content:draft-generic -- --promote    also publish, if every gate passes
 *
 * *** WHAT IS SHARED WITH THE STAGE RUN, AND WHY THAT MATTERS MORE THAN REUSE ***
 *
 * The drafter's system prompt, the verifier, the corpus quote gate and the block
 * gates are the SAME code, not equivalents:
 *
 *   drafter   `draftGeneric` calls `chat(model, DRAFTER_SYSTEM, user)` — the same
 *             constant the stage drafter uses. Only the user message differs.
 *   verifier  `verify(model, sourceText, sentences)` unchanged. It was already
 *             stage-independent: "sourceText is passed in rather than derived so the
 *             adversarial harness can hand it a known set of provisions".
 *   code gate `findQuote` over the vendored corpus, unchanged. No model's word is
 *             taken for whether its support exists.
 *   gates     `genericGateFailures` calls `allGateFailures`, the one implementation
 *             `gateFailures` also calls.
 *
 * A second pipeline would be a second standard, and the looser one wins in the end
 * because it is the one that passes.
 *
 * *** WHAT IS DIFFERENT, AND WHY EACH DIFFERENCE IS NOT A RELAXATION ***
 *
 *   no stage premise    There is no stage, so nothing is offered as an established
 *                       premise. Strictly narrower: every sentence must rest on a
 *                       quoted provision.
 *   no guide pages      `genericSourceMaterial` passes only pinpoint-quoted rules.
 *                       A guide page describes a particular point in a case; a
 *                       sentence lifted from one would carry that point's
 *                       assumptions into a block with no stage to qualify them.
 *   yourDeadline null   Forced, not requested. There is no authored StageDeadline[]
 *                       to render from, and the gate refuses a hand-written one.
 *   party-neutral gate  Replaces `wrongReaderProblems`, which returns nothing
 *                       without a side. A block shown to everybody that tells the
 *                       reader to file a defence is worse than a defendant's block
 *                       that does — the plaintiff reading it cannot tell.
 *
 * *** NEEDS-HUMAN IS THE ONLY FAILURE MODE HERE ***
 *
 * The stage run can fall back to a `no-source` block when the sources genuinely do
 * not reach. That is right for a stage, which exists in the taxonomy whether or not
 * anyone has written its procedure down — a reader has arrived there and is owed an
 * honest "we don't have this".
 *
 * A generic block is different: nobody navigates to it, it is placed on a screen
 * because we chose to put it there. If it cannot be written from sources, the right
 * outcome is not to publish it and show nothing. So there is no no-source path.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import {
  addUsage,
  costOf,
  draftGeneric,
  findQuote,
  genericSourceMaterial,
  readabilityProblem,
  sentencesOf,
  verify,
  type Usage,
} from "./verifiedContentPipeline";
import {
  dutyCompletenessProblems,
  genericGateFailures,
  partyNeutralProblems,
} from "./blockGates";
import {
  assessReadability,
  formatReadabilityException,
} from "../../src/lib/content-library/readabilityExceptions";
import {
  GENERIC_TOPICS,
  type GenericAnswer,
  type GenericTopic,
} from "../../src/lib/content-library/genericAnswers";
import { readability } from "../../src/lib/content-library/readability";
import type { SentenceVerdict } from "../../src/lib/content-library/stageAnswers";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "content-runs", "generic");
/**
 * Blocks that passed a run, held for promotion. Served to nobody.
 *
 * *** WHY DRAFTING AND PROMOTION ARE SEPARATE, LEARNED THE OBVIOUS WAY ***
 *
 * This script used to re-draft when asked to promote. The pipeline is
 * non-deterministic — publishedLibrary.ts records that temperature 0 and a seed
 * still produce different results — so a block that passed at 12:07 failed at 12:14
 * and promotion was a lottery. The stage pipeline never had this problem because it
 * keeps candidates and promotes one.
 */
const CANDIDATES = path.join(OUT_DIR, "candidates.json");

const PUBLISHED = path.join(
  ROOT,
  "src",
  "lib",
  "content-library",
  "published",
  "genericAnswers.published.json",
);

// The key is read from .env.local inside this process and never printed.
dotenv.config({ path: ".env.local", quiet: true });

/*
 * Four, the same as the stage run. Seven was tried and was WORSE, consistently.
 *
 * Feedback is replaced each attempt with the last attempt failures, so a long run
 * does not accumulate understanding -- it accumulates contradictory corrections. The
 * drafter would shorten a sentence until the verifier rejected it as not what the
 * source says, then restore the source wording until readability failed, and by
 * attempt seven it was reproducing the generalities it had been told twice to avoid.
 * Measured: 4-attempt runs landed grade 7.8 to 8.4; 7-attempt runs landed 9.4 to 9.9.
 *
 * The one fully clean draft arrived on attempt TWO. Fresh runs beat long ones here.
 */
const MAX_ATTEMPTS = 4;
const MODEL = process.env.CONTENT_MODEL || "gpt-4o-mini";

type Attempt = {
  attempt: number;
  sections: { whatsHappening: string; whatToDoNext: string; whatHappensAfter: string };
  verdicts: SentenceVerdict[];
  readability: number;
  problems: string[];
};

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

function proseOf(sections: {
  whatsHappening: string;
  whatToDoNext: string;
  whatHappensAfter: string;
}): string {
  return [sections.whatsHappening, sections.whatToDoNext, sections.whatHappensAfter]
    .filter((part) => part && part !== "NOT_SUPPORTED")
    .join("\n\n");
}

async function runTopic(
  topic: GenericTopic,
  usage: Usage[],
): Promise<{ answer: GenericAnswer | null; attempts: Attempt[] }> {
  const source = genericSourceMaterial(topic);
  const attempts: Attempt[] = [];
  const feedback: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const drafted = await draftGeneric(MODEL, topic, feedback);
    addUsage(usage, drafted.usage);

    const sections = {
      whatsHappening: drafted.sections.whatsHappening,
      whatToDoNext: drafted.sections.whatToDoNext,
      whatHappensAfter: drafted.sections.whatHappensAfter,
    };

    const prose = proseOf(sections);
    const sentences = sentencesOf(prose);

    /*
     * No premise argument. There is no stage, so there is nothing that counts as
     * already established with the reader — every sentence must rest on a quoted
     * provision or fail.
     */
    const verified = await verify(MODEL, source, sentences);
    addUsage(usage, verified.usage);

    const problems: string[] = [];

    for (const verdict of verified.verdicts) {
      if (!verdict.supported) {
        problems.push(`"${verdict.sentence}" — ${verdict.reason ?? "unsupported"}`);
      }
    }

    for (const [name, value] of Object.entries(sections)) {
      if (value === "NOT_SUPPORTED") {
        problems.push(`the "${name}" section could not be written from the sources`);
      }
    }

    /*
     * Told to the DRAFTER, not only refused at promotion. A promotion gate can only
     * refuse; four attempts of being refused afterwards produces nothing. This is the
     * same reasoning the stage run applies to wrongReaderProblems.
     */
    problems.push(...partyNeutralProblems(prose));

    /*
     * Completeness, told to the drafter. A promotion gate can only refuse, and this is
     * the failure that slipped through eleven clean verdicts: the duty in r. 13.03 (2)
     * is to serve AND file, and the block only said serve.
     */
    problems.push(...dutyCompletenessProblems(prose, topic.rules));

    /*
     * *** A FILLER GATE WAS HERE AND IT WAS WRONG. RECORDED SO IT IS NOT RE-ADDED. ***
     *
     * Drafter rule 8a states a filler test -- if a sentence names no new particular,
     * it is filler however sensible it sounds -- and nothing enforces it, so I
     * enforced it with makesAClaim. That was a misuse. makesAClaim answers a
     * different question: whether a sentence makes a claim a source could support or
     * contradict, and verify() uses it to decide what needs checking at all. Its
     * marker list is tuned for that -- numbers, forms, periods, court actors, modals
     * -- and contains no document nouns.
     *
     * So it rejected "This includes expert reports not attached to your claim or
     * defence.", which carries a particular straight out of r. 13.03 (2) (a)
     * ("including an expert report"). That cost an attempt and pushed the drafter
     * towards deleting real content.
     *
     * Rule 8a is left to the drafter instruction, the verifier and the readability
     * gate, which between them removed the padding this was aimed at. A gate with
     * false positives on correct content is worse than no gate: it spends the run
     * attempts arguing with the right answer.
     */
    /*
     * The admissibility-qualifier gate, told to the drafter rather than only refused
     * at promotion. Same reasoning the stage loop gives for barExceptionProblems: a
     * promotion gate can only refuse, and refusing after four attempts wastes the run.
     */
    problems.push(...genericGateFailures({
      whatsHappening: sections.whatsHappening,
      whatToDoNext: sections.whatToDoNext,
      yourDeadline: null,
      whatHappensAfter: sections.whatHappensAfter,
      citations: [...topic.rules],
      sourceIds: sourcesUsed(verified.verdicts),
      verification: {
        status: "verified-draft",
        verifiedAt: new Date().toISOString(),
        attempts: attempt,
        verdicts: verified.verdicts,
      },
    }).filter((problem) => !problem.startsWith("status is")));

    /*
     * The gate above already reports readability, so this adds the DETAIL — which
     * sentence is hardest and how long it is. Deduplicated below so the drafter is not
     * told the same thing twice; repeated feedback reads as two problems and the
     * drafter spends an attempt looking for the second one.
     */
    const reading = readabilityProblem(prose);
    if (reading) problems.push(reading);

    {
      const seen = new Set<string>();
      const deduped = problems.filter((problem) => {
        const key = problem.slice(0, 48);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      problems.length = 0;
      problems.push(...deduped);
    }

    attempts.push({
      attempt,
      sections,
      verdicts: verified.verdicts,
      readability: readability(prose).grade,
      problems,
    });

    if (problems.length === 0) {
      /*
       * The reading-level assessment is recorded on the block itself, so a granted
       * term-of-art exception is auditable in the published artefact rather than only
       * in this run log. Null for a block that simply met the target.
       */
      const assessment = assessReadability(prose);

      return {
        answer: {
          id: `answer:generic:${topic.id}`,
          topicId: topic.id,
          userQuestion: topic.userQuestion,
          whatsHappening: sections.whatsHappening,
          whatToDoNext: sections.whatToDoNext,
          yourDeadline: null,
          whatHappensAfter: sections.whatHappensAfter,
          slots: [],
          citations: [...topic.rules],
          sourceIds: sourcesUsed(verified.verdicts),
          verification: {
            status: "verified-draft",
            verifiedAt: new Date().toISOString(),
            attempts: attempt,
            verdicts: verified.verdicts,
          },
          readabilityException: assessment.withinTarget ? assessment.exception : null,
          draftedWith: MODEL,
          publishedVia: "drafter-run",
        },
        attempts,
      };
    }

    feedback.length = 0;
    feedback.push(...problems);
  }

  /*
   * Out of attempts. Not published, not softened, not downgraded — the failure mode
   * this avoids is a pipeline that always produces something.
   */
  return { answer: null, attempts };
}

/**
 * Publishes a held candidate. MAKES NO MODEL CALLS.
 *
 * The gates are re-run here rather than trusted from the run that produced the
 * candidate, because the corpus can be re-vendored between drafting and promotion and
 * a quote that was in it may not be any more. That is the same reason
 * verifyPublishedLibrary re-checks every quote on every run.
 */
function promoteCandidates(): number {
  if (!existsSync(CANDIDATES)) {
    console.log("");
    console.log(`  nothing to promote: no candidates at ${path.relative(ROOT, CANDIDATES)}.`);
    console.log("  run the drafter first, without --promote.");
    console.log("");
    return 1;
  }

  const held = JSON.parse(readFileSync(CANDIDATES, "utf8")) as GenericAnswer[];
  const clean: GenericAnswer[] = [];

  console.log("");
  console.log(`PROMOTING — ${held.length} candidate(s), no model calls`);
  console.log("");

  for (const candidate of held) {
    const problems = genericGateFailures(candidate);

    /*
     * Every quote re-checked against the corpus as it is NOW. A candidate drafted
     * against last week's vendored text is not verified against this week's.
     */
    for (const verdict of candidate.verification.verdicts ?? []) {
      if (!verdict.supported || !verdict.quote) continue;
      for (const quote of verdict.quote.split(" | ")) {
        if (quote.trim().length < 25) continue;
        if (findQuote(quote) === null) {
          problems.push(`rests on a passage no longer in the corpus: "${quote.slice(0, 70)}"`);
        }
      }
    }

    /*
     * A stored readability exception is re-derived, not trusted. If the mechanism
     * would no longer grant it — the allowlist changed, the term was removed — the
     * candidate must not publish on a grant that no longer exists.
     */
    const assessment = assessReadability(
      [candidate.whatsHappening, candidate.whatToDoNext, candidate.whatHappensAfter]
        .filter(Boolean)
        .join("\n\n"),
    );
    if (candidate.readabilityException && !assessment.exception) {
      problems.push(
        "carries a readability exception that the mechanism would not grant today",
      );
    }

    if (problems.length > 0) {
      console.log(`  ${candidate.id} — REFUSED`);
      for (const problem of problems) console.log(`      - ${problem}`);
      continue;
    }

    console.log(`  ${candidate.id} — passes every gate`);
    if (assessment.exception) {
      console.log("      " + formatReadabilityException(assessment.exception, candidate.id));
    }
    clean.push({ ...candidate, readabilityException: assessment.exception });
  }

  if (clean.length !== GENERIC_TOPICS.length) {
    console.log("");
    console.log(
      `  NOT PROMOTING: ${clean.length} of ${GENERIC_TOPICS.length} topic(s) are clean.`,
    );
    console.log("");
    return 1;
  }

  const existing: GenericAnswer[] = existsSync(PUBLISHED)
    ? (JSON.parse(readFileSync(PUBLISHED, "utf8")) as { blocks: GenericAnswer[] }).blocks
    : [];
  const merged = new Map(existing.map((answer) => [answer.id, answer]));
  for (const answer of clean) merged.set(answer.id, answer);
  const blocks = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    PUBLISHED,
    `${JSON.stringify(
      {
        release: {
          /*
           * From the BLOCKS, not from this process env. Promotion is a separate
           * invocation and does not know which model drafted the candidate.
           */
          model:
            [...new Set(blocks.map((block) => block.draftedWith).filter(Boolean))].join(", ") ||
            "unrecorded",
          promotedAt: new Date().toISOString(),
          blockCount: blocks.length,
        },
        blocks,
      },
      null,
      2,
    )}\n`,
  );

  console.log("");
  console.log(`  promoted ${blocks.length} block(s) to ${path.relative(ROOT, PUBLISHED)}`);
  console.log("");
  return 0;
}

async function main() {
  /*
   * Promotion never drafts. Separate invocations, because the pipeline is not
   * deterministic and re-drafting at promotion time makes publication a lottery.
   */
  if (process.argv.includes("--promote")) {
    process.exitCode = promoteCandidates();
    return;
  }

  const usage: Usage[] = [];
  const log: unknown[] = [];
  const answers: GenericAnswer[] = [];

  console.log("");
  console.log(`GENERIC BLOCKS — model ${MODEL}, ${GENERIC_TOPICS.length} topic(s)`);
  console.log("");

  for (const topic of GENERIC_TOPICS) {
    process.stdout.write(`  ${topic.id} … `);
    const { answer, attempts } = await runTopic(topic, usage);
    log.push({ topicId: topic.id, attempts });

    if (!answer) {
      console.log(`NEEDS HUMAN after ${attempts.length} attempt(s)`);
      for (const problem of attempts[attempts.length - 1]?.problems ?? []) {
        console.log(`      - ${problem}`);
      }
      continue;
    }

    /*
     * The block gates run HERE as well as at promotion. A block that passed the
     * verifier can still fail a gate, and finding that out in the run is what lets
     * the next attempt fix it.
     */
    const gateProblems = genericGateFailures(answer);
    if (gateProblems.length > 0) {
      console.log(`GATE FAILED after ${attempts.length} attempt(s)`);
      for (const problem of gateProblems) console.log(`      - ${problem}`);
      continue;
    }

    if (answer.readabilityException) {
      console.log("");
      console.log("      " + formatReadabilityException(answer.readabilityException, answer.id));
      console.log("      justification: " + answer.readabilityException.justification);
      process.stdout.write("      ");
    }

    console.log(
      `verified-draft in ${answer.verification.attempts} attempt(s), ` +
        `grade ${readability(proseOf(answer)).grade.toFixed(1)}, ` +
        `${answer.verification.verdicts.length} sentence(s), ` +
        `sources: ${answer.sourceIds.join(", ") || "none"}`,
    );
    answers.push(answer);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    path.join(OUT_DIR, `run-${stamp}.json`),
    `${JSON.stringify({ model: MODEL, startedAt: new Date().toISOString(), usage, log }, null, 2)}\n`,
  );

  /*
   * Candidates are merged by id and kept, whether or not this invocation promotes.
   * A passing block is worth keeping even when the next run fails.
   */
  if (answers.length > 0) {
    const held: GenericAnswer[] = existsSync(CANDIDATES)
      ? (JSON.parse(readFileSync(CANDIDATES, "utf8")) as GenericAnswer[])
      : [];
    const mergedCandidates = new Map(held.map((answer) => [answer.id, answer]));
    for (const answer of answers) mergedCandidates.set(answer.id, answer);
    writeFileSync(
      CANDIDATES,
      `${JSON.stringify([...mergedCandidates.values()], null, 2)}\n`,
    );
    console.log(`  held ${answers.length} candidate(s) in ${path.relative(ROOT, CANDIDATES)}`);
  }

  console.log("");
  for (const entry of usage) {
    console.log(
      `  ${entry.model}: ${entry.calls} calls, ${entry.inputTokens} in, ` +
        `${entry.outputTokens} out, $${costOf(entry).toFixed(4)}`,
    );
  }
  console.log(`  total $${usage.reduce((sum, entry) => sum + costOf(entry), 0).toFixed(4)}`);

  console.log("");
  console.log(
    `  ${answers.length} block(s) passed. Run with --promote to publish the held candidate(s).`,
  );
  console.log("");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
