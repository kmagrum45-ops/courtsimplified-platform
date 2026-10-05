/**
 * Measures retrieval against the labelled set (retrievalRecallSet.ts), with
 * real model and embeddings calls, and times each step.
 *
 *   npm run eval:retrieval-recall
 *
 * Reports, and writes retrieval-recall.md / retrieval-recall.json:
 *   - story hit rate: stories where at least one labelled provision came back;
 *   - provision recall: labelled provisions that came back, and how many of
 *     those only through a followed cross-reference;
 *   - time: writing the queries, embedding them, and the whole retrieval
 *     (median and slowest), which is time a person waits before the analysis.
 *
 * A report, not a gate: the model's queries vary run to run, so the numbers
 * move a little on their own. Compare runs, not a single number. Fabricated
 * stories only; needs OPENAI_API_KEY (the Story Review workflow runs it).
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadCorpusIndex, type Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { embedWithModel, retrieveForStory, writeQueriesWithModel } from "../../src/lib/case-system/retrieval/storyRetrieval";
import { RECALL_SET, type RecallLabel } from "./retrievalRecallSet";

const matches = (passage: Passage, label: RecallLabel) =>
  passage.sourceId === label.source && (!label.section || passage.pinpoint.split(" ")[1] === label.section);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
  const index = loadCorpusIndex();
  if (!index) throw new Error("No corpus index.");

  const rows: {
    id: string;
    court: string;
    hit: boolean;
    found: string[];
    viaReference: string[];
    missed: string[];
    queriesMs: number;
    embedMs: number;
    totalMs: number;
    skipped?: string;
    queries: string[];
    retrieved: string[];
  }[] = [];

  for (const story of RECALL_SET) {
    let queriesMs = 0;
    let embedMs = 0;
    const started = Date.now();
    const result = await retrieveForStory(
      { story: story.story, courtPath: story.court, stage: story.stage, side: story.side },
      {
        index,
        writeQueries: async (input) => {
          const t = Date.now();
          try {
            return await writeQueriesWithModel(input);
          } finally {
            queriesMs = Date.now() - t;
          }
        },
        embed: async (texts, model, dimensions) => {
          const t = Date.now();
          try {
            return await embedWithModel(texts, model, dimensions);
          } finally {
            embedMs = Date.now() - t;
          }
        },
      },
    );
    const totalMs = Date.now() - started;
    const label = (item: RecallLabel) => `${item.source}${item.section ? ` ${item.section}` : ""}`;
    const found = story.expect.filter((item) => result.passages.some((passage) => matches(passage, item)));
    const viaReference = found.filter(
      (item) => !result.passages.some((passage) => matches(passage, item) && !passage.referredBy),
    );
    rows.push({
      id: story.id,
      court: story.court,
      hit: found.length > 0,
      found: found.map(label),
      viaReference: viaReference.map(label),
      missed: story.expect.filter((item) => !found.includes(item)).map(label),
      queriesMs,
      embedMs,
      totalMs,
      ...(result.skipped ? { skipped: result.skipped } : {}),
      queries: result.queries,
      retrieved: result.passages.map((passage) => `${passage.sourceId} ${passage.pinpoint || passage.heading.slice(0, 30)}${passage.referredBy ? " (ref)" : ""} [${passage.score.toFixed(2)}]`),
    });
    console.log(`${found.length ? "hit " : "MISS"} ${story.id} (${totalMs} ms)`);
  }

  const labels = RECALL_SET.reduce((sum, story) => sum + story.expect.length, 0);
  const foundCount = rows.reduce((sum, row) => sum + row.found.length, 0);
  const viaCount = rows.reduce((sum, row) => sum + row.viaReference.length, 0);
  const hits = rows.filter((row) => row.hit).length;
  const byCourt = ["small-claims", "civil", "family"].map((court) => {
    const subset = rows.filter((row) => row.court === court);
    return `${court}: ${subset.filter((row) => row.hit).length}/${subset.length}`;
  });
  const summary = {
    generatedAt: new Date().toISOString(),
    stories: rows.length,
    storyHits: hits,
    labels,
    labelsFound: foundCount,
    labelsFoundOnlyByReference: viaCount,
    medianMs: { queries: median(rows.map((row) => row.queriesMs)), embed: median(rows.map((row) => row.embedMs)), total: median(rows.map((row) => row.totalMs)) },
    slowestMs: Math.max(...rows.map((row) => row.totalMs)),
  };

  const lines = [
    "# Retrieval recall",
    "",
    `Run ${summary.generatedAt}.`,
    "",
    `- **Stories with a labelled provision retrieved: ${hits} of ${rows.length}** (${byCourt.join(", ")})`,
    `- **Labelled provisions retrieved: ${foundCount} of ${labels}**, of which ${viaCount} only through a followed cross-reference`,
    `- **Time** (median): writing queries ${summary.medianMs.queries} ms, embedding ${summary.medianMs.embed} ms, whole retrieval ${summary.medianMs.total} ms; slowest ${summary.slowestMs} ms`,
    "",
    "| story | court | result | found | missed | ms |",
    "|---|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.id} | ${row.court} | ${row.hit ? "hit" : "**miss**"}${row.skipped ? ` (${row.skipped})` : ""} | ${row.found.map((item) => (row.viaReference.includes(item) ? `${item} (ref)` : item)).join(", ")} | ${row.missed.join(", ")} | ${row.totalMs} |`,
    ),
    "",
    "## Misses: what came back instead",
    "",
    ...rows
      .filter((row) => row.missed.length)
      .flatMap((row) => [`### ${row.id}`, "", `Missed: ${row.missed.join(", ")}`, "", "Queries:", ...row.queries.map((query) => `- ${query}`), "", "Retrieved:", ...row.retrieved.map((item) => `- ${item}`), ""]),
  ];
  writeFileSync(path.join(process.cwd(), "retrieval-recall.md"), lines.join("\n"));
  writeFileSync(path.join(process.cwd(), "retrieval-recall.json"), JSON.stringify({ summary, rows }, null, 2) + "\n");
  console.log(`\n${hits}/${rows.length} stories hit; ${foundCount}/${labels} labels found (${viaCount} by reference); median ${summary.medianMs.total} ms.`);
}

main().catch((error) => {
  const status = (error as { status?: number })?.status;
  console.error(`${status ? `HTTP ${status}: ` : ""}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
