/**
 * What the research step (retrieval/researchStory.ts) does with real stories:
 * the questions it chose to research, what it found for each with the
 * verified quote, what it said the library lacks, how many rounds it took and
 * how long. Real model calls; a report, not a gate.
 *
 * Stories: the bus-injury live run (2026-10-05) that prompted the research
 * step, plus a spread of the labelled recall set (retrievalRecallSet.ts)
 * across Small Claims, civil and family. Fabricated stories only.
 *
 * Needs OPENAI_API_KEY (the Retrieval Eval workflow runs it).
 *
 *   npm run eval:research
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadCorpusIndex, readPassage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { researchStory } from "../../src/lib/case-system/retrieval/researchStory";
import type { RetrievalInput } from "../../src/lib/case-system/retrieval/storyRetrieval";
import { RECALL_SET } from "./retrievalRecallSet";

const LIMIT = Number(process.env.RESEARCH_PROBE_LIMIT || 10);

const BUS: RetrievalInput & { id: string } = {
  id: "bus-pedestrian (live run 2026-10-05)",
  courtPath: "small-claims",
  side: "plaintiff",
  story:
    "i was hit by an OC transpo bus when i was waiting to cross at a cross walk. the bus made a right turn and drove over the curb and the side of the bus knocked me down and i dislocated my shoulder. i have hospital report and xrays and i want to sue",
};

async function main() {
  const index = loadCorpusIndex();
  if (!index) throw new Error("No built index.");
  const step = Math.max(1, RECALL_SET.length / (LIMIT - 1));
  const stories: (RetrievalInput & { id: string })[] = [
    BUS,
    ...Array.from({ length: LIMIT - 1 }, (_, n) => RECALL_SET[Math.floor(n * step)]).map((story) => ({
      id: story.id,
      courtPath: story.court,
      story: story.story,
      ...(story.stage ? { stage: story.stage } : {}),
      ...(story.side ? { side: story.side } : {}),
    })),
  ];

  const lines: string[] = [];
  let answered = 0;
  let total = 0;
  const seconds: number[] = [];
  const requests = new Set<string>();
  for (const story of stories) {
    const t0 = Date.now();
    const result = await researchStory(story);
    const s = (Date.now() - t0) / 1000;
    seconds.push(s);
    lines.push(`## ${story.id} (${story.courtPath}, ${s.toFixed(1)}s, ${result.rounds} round(s)${result.skipped ? `, skipped: ${result.skipped}` : ""})`, "", `> ${story.story.slice(0, 400)}`, "");
    for (const finding of result.findings) {
      total += 1;
      if (finding.status === "answered") answered += 1;
      lines.push(`- **${finding.status.toUpperCase()}** — ${finding.question}`);
      for (const answer of finding.answeredBy) {
        const passage = readPassage(index, answer.passageId, 1);
        const where = passage ? [passage.source.title, passage.pinpoint].filter(Boolean).join(", ") : answer.passageId;
        lines.push(`  - ${where}: "${answer.quote}"`);
      }
      if (finding.missingSource) {
        lines.push(`  - library lacks: ${finding.missingSource}`);
        requests.add(finding.missingSource);
      }
    }
    lines.push("");
    console.log(`${story.id}: ${result.findings.filter((f) => f.status === "answered").length}/${result.findings.length} answered, ${s.toFixed(1)}s`);
  }
  seconds.sort((a, b) => a - b);
  const median = seconds[Math.floor(seconds.length / 2)] ?? 0;
  const head = [
    `# Research step: ${answered} of ${total} questions answered from the library (${stories.length} stories, median ${median.toFixed(1)}s)`,
    "",
    "Each question was chosen by the model; each answer's quote was checked by code to be in the passage it names.",
    "",
    "## Laws the research said the library lacks",
    "",
    ...(requests.size ? [...requests].map((name) => `- ${name}`) : ["- none"]),
    "",
  ];
  writeFileSync(path.join(process.cwd(), "research-probe.md"), `${[...head, ...lines].join("\n")}\n`);
  console.log(`${answered} of ${total} questions answered; median ${median.toFixed(1)}s`);
}

void main();
