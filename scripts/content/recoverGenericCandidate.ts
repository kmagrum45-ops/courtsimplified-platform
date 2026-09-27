/**
 * Rebuilds a candidate block from the run log that produced it.
 *
 *   npm run content:recover-generic -- <run-file.json>
 *
 * *** WHY THIS EXISTS, AND WHY IT IS NOT A BACK DOOR ***
 *
 * The pipeline is non-deterministic. A run on 2026-09-27 at 12:07 produced a
 * serving-documents block that passed the drafter, 11 of 11 verifier verdicts, the
 * corpus quote gate and every block gate, at grade 8.29 on a recorded term-of-art
 * exception. Eleven subsequent runs did not reproduce it.
 *
 * That block was not kept, because `candidates.json` did not exist yet — the split
 * between drafting and promotion was added afterwards, for exactly this reason. The
 * artefact was not lost, though: every run writes its attempts, sections and verdicts
 * to `docs/content-runs/generic/run-*.json`, so the passing draft is on disk.
 *
 * This reassembles the candidate from that record. It is NOT a way to introduce prose:
 *
 *   - every sentence comes from the run log, written by the drafter
 *   - every verdict comes from the run log, produced by the verifier
 *   - the citations come from GENERIC_TOPICS, not from the log
 *   - NOTHING is published here. It writes a candidate, and `--promote` then re-runs
 *     every gate, re-checks every quote against the corpus as it is now, and
 *     re-derives the readability exception. A recovered candidate has to pass all of
 *     that on its own merits.
 *
 * It refuses a run whose final attempt had problems, so only a genuinely clean draft
 * can be recovered.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

import { GENERIC_TOPICS } from "../../src/lib/content-library/genericAnswers";
import type { GenericAnswer } from "../../src/lib/content-library/genericAnswers";
import { assessReadability } from "../../src/lib/content-library/readabilityExceptions";
import type { SentenceVerdict } from "../../src/lib/content-library/stageAnswers";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "content-runs", "generic");
const CANDIDATES = path.join(OUT_DIR, "candidates.json");

type LoggedAttempt = {
  attempt: number;
  sections: { whatsHappening: string; whatToDoNext: string; whatHappensAfter: string };
  verdicts: SentenceVerdict[];
  readability: number;
  problems: string[];
};

type RunFile = {
  model: string;
  log: { topicId: string; attempts: LoggedAttempt[] }[];
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

function main(): void {
  const named = process.argv.slice(2).find((argument) => argument.endsWith(".json"));
  if (!named) {
    console.error("usage: npm run content:recover-generic -- <run-file.json>");
    process.exitCode = 1;
    return;
  }

  const runPath = path.isAbsolute(named) ? named : path.join(OUT_DIR, named);
  const run = JSON.parse(readFileSync(runPath, "utf8")) as RunFile;

  const recovered: GenericAnswer[] = [];

  for (const entry of run.log) {
    const topic = GENERIC_TOPICS.find((candidate) => candidate.id === entry.topicId);
    if (!topic) {
      console.log(`  skipped "${entry.topicId}" — no such topic`);
      continue;
    }

    const last = entry.attempts[entry.attempts.length - 1];
    if (!last) {
      console.log(`  skipped "${entry.topicId}" — no attempts recorded`);
      continue;
    }

    if (last.problems.length > 0) {
      console.log(
        `  REFUSED "${entry.topicId}" — its final attempt had ${last.problems.length} ` +
          `problem(s), so it was never a clean draft`,
      );
      continue;
    }

    const prose = [
      last.sections.whatsHappening,
      last.sections.whatToDoNext,
      last.sections.whatHappensAfter,
    ]
      .filter(Boolean)
      .join("\n\n");

    const assessment = assessReadability(prose);

    recovered.push({
      id: `answer:generic:${topic.id}`,
      topicId: topic.id,
      userQuestion: topic.userQuestion,
      whatsHappening: last.sections.whatsHappening,
      whatToDoNext: last.sections.whatToDoNext,
      yourDeadline: null,
      whatHappensAfter: last.sections.whatHappensAfter,
      slots: [],
      citations: [...topic.rules],
      sourceIds: sourcesUsed(last.verdicts),
      verification: {
        status: "verified-draft",
        verifiedAt: new Date().toISOString(),
        attempts: last.attempt,
        verdicts: last.verdicts,
      },
      readabilityException: assessment.withinTarget ? assessment.exception : null,
      // From the run file, which recorded it at drafting time.
      draftedWith: run.model,
    });

    console.log(
      `  recovered "${topic.id}" from attempt ${last.attempt}, grade ` +
        `${last.readability.toFixed(2)}, ${last.verdicts.length} verdict(s)`,
    );
  }

  if (recovered.length === 0) {
    console.log("  nothing recovered.");
    process.exitCode = 1;
    return;
  }

  const held: GenericAnswer[] = existsSync(CANDIDATES)
    ? (JSON.parse(readFileSync(CANDIDATES, "utf8")) as GenericAnswer[])
    : [];
  const merged = new Map(held.map((answer) => [answer.id, answer]));
  for (const answer of recovered) merged.set(answer.id, answer);

  writeFileSync(CANDIDATES, `${JSON.stringify([...merged.values()], null, 2)}\n`);
  console.log(`  held in ${path.relative(ROOT, CANDIDATES)} — run --promote to publish.`);
}

main();
