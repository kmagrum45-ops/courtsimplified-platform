/**
 * What the intake would ask, written from the law the research read
 * (retrieval/sourcedQuestions.ts), for real stories across the three courts:
 * each question, its "why", the provision it rests on, and how many drafts
 * code and the independent check refused. Real model calls; a report, not a
 * gate -- read it to judge whether the questions are the ones a careful
 * lawyer would ask, and neutral.
 *
 * Stories: kinds of case nobody has written questions for (a bus injury, a
 * Charter claim, a human-rights claim, a relocation), plus a spread of the
 * labelled recall set. Fabricated stories only.
 *
 * Needs OPENAI_API_KEY (the Retrieval Eval workflow runs it).
 *
 *   npm run eval:sourced-questions
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { sourcedQuestions } from "../../src/lib/case-system/retrieval/sourcedQuestions";
import type { RetrievalInput } from "../../src/lib/case-system/retrieval/storyRetrieval";
import { RECALL_SET } from "./retrievalRecallSet";

const LIMIT = Number(process.env.SOURCED_PROBE_LIMIT || 12);

const UNCATALOGUED: (RetrievalInput & { id: string })[] = [
  {
    id: "bus-pedestrian",
    courtPath: "small-claims",
    side: "plaintiff",
    story:
      "i was hit by an OC transpo bus when i was waiting to cross at a cross walk. the bus made a right turn and drove over the curb and the side of the bus knocked me down and i dislocated my shoulder. i have hospital report and xrays and i want to sue",
  },
  {
    id: "charter-search",
    courtPath: "civil",
    side: "plaintiff",
    story:
      "Two police officers came into my apartment last spring without a warrant and searched my bedroom. They said they were looking for someone else. Nothing was found and no charges were laid. I want to sue the police service for violating my rights and for the stress it caused.",
  },
  {
    id: "human-rights-employment",
    courtPath: "civil",
    side: "plaintiff",
    story:
      "I was fired from my warehouse job three weeks after I told my manager I was pregnant. They said it was restructuring but they hired someone for my position a month later. I want to sue them for wrongful dismissal and discrimination.",
  },
  {
    id: "relocation-child",
    courtPath: "family",
    side: "defendant",
    story:
      "My ex wants to move with our 8 year old to Alberta for a new job. We have a court order that gives us shared parenting time. I don't want my son moved so far away. She says she will file something to change the order.",
  },
  {
    id: "defendant-damage-deposit",
    courtPath: "small-claims",
    side: "defendant",
    story:
      "My former roommate is suing me in Small Claims for $3,000 saying I damaged furniture when I moved out. The furniture was already worn when I moved in and I have photos from the first day.",
  },
];

async function main() {
  const step = Math.max(1, RECALL_SET.length / Math.max(1, LIMIT - UNCATALOGUED.length));
  const stories = [
    ...UNCATALOGUED,
    ...Array.from({ length: Math.max(0, LIMIT - UNCATALOGUED.length) }, (_, n) => RECALL_SET[Math.floor(n * step)]).map((story) => ({
      id: story.id,
      courtPath: story.court,
      story: story.story,
      ...(story.side ? { side: story.side } : {}),
    })),
  ];

  const lines: string[] = [];
  const seconds: number[] = [];
  let asked = 0;
  let refusedByCode = 0;
  let refusedByChecker = 0;
  let none = 0;
  for (const story of stories) {
    const t0 = Date.now();
    const result = await sourcedQuestions(story);
    const s = (Date.now() - t0) / 1000;
    seconds.push(s);
    asked += result.questions.length;
    refusedByCode += result.counts.refusedByCode;
    refusedByChecker += result.counts.refusedByChecker;
    if (result.questions.length === 0) none += 1;
    lines.push(
      `## ${story.id} (${story.courtPath}${story.side ? `, ${story.side}` : ""}, ${s.toFixed(1)}s; written ${result.counts.written}, refused by code ${result.counts.refusedByCode}, by the check ${result.counts.refusedByChecker}${result.skipped ? `; ${result.skipped}` : ""})`,
      "",
      `> ${story.story.slice(0, 400)}`,
      "",
    );
    for (const question of result.questions) {
      lines.push(`- **${question.question}**`, `  - Why: ${question.why}`, `  - ${question.citation}: "${question.quote}"`);
    }
    if (result.sourceRequests.length) lines.push(`- library lacks: ${result.sourceRequests.join("; ")}`);
    lines.push("");
    console.log(`${story.id}: ${result.questions.length} question(s), ${s.toFixed(1)}s${result.skipped ? ` (${result.skipped})` : ""}`);
  }
  seconds.sort((a, b) => a - b);
  const median = seconds[Math.floor(seconds.length / 2)] ?? 0;
  const max = seconds[seconds.length - 1] ?? 0;
  const head = [
    `# Questions from the law: ${asked} asked across ${stories.length} stories (${none} with none; median ${median.toFixed(1)}s, slowest ${max.toFixed(1)}s)`,
    "",
    `Refused before anyone would see them: ${refusedByCode} by code (quote, number, wording), ${refusedByChecker} by the independent check.`,
    "",
  ];
  writeFileSync(path.join(process.cwd(), "sourced-questions-probe.md"), `${[...head, ...lines].join("\n")}\n`);
  console.log(`${asked} questions across ${stories.length} stories; ${none} with none; median ${median.toFixed(1)}s`);
}

void main();
