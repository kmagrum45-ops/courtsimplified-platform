/**
 * Old front door vs. the new one, on the same stories, scored by a grader that
 * did not write either (site owner, 2026-10-14: "only run 5 tests ... then if
 * we see problems or we want to advance, we'll keep adding questions").
 *
 * For each story in scripts/eval/understanding/stories.json:
 *
 *   OLD -- what the site gave before 2026-10-14: the court-path check at the
 *          front door (topic labels, fixed connection notes, suggested path),
 *          then the checked story answer the case page shows
 *          (checkedAnswer with STORY_QUESTION, on the classifier's path or
 *          the one the person chose).
 *   NEW -- understandCase: the strongest model reads the whole story, then
 *          every legal point is checked against the official text.
 *
 * A grader call (deep tier, high effort) reads each output against the
 * story's expected points (written as what a careful Ontario lawyer would tell
 * this person) and lists anything wrong, misleading or beside the point. It
 * sees only what a person would see, not which system made it.
 *
 * COSTS MONEY (model calls for both systems and the grader). Nothing runs
 * without --confirm. Writes understanding-report.md and understanding-report.json.
 *
 *   node --import tsx scripts/eval/understandingCompare.ts --confirm
 *   node --import tsx scripts/eval/understandingCompare.ts --confirm --ids slander-default
 *   node --import tsx scripts/eval/understandingCompare.ts --confirm --only new
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { classifyCourtPath, statedDollarAmounts } from "../../src/lib/case-system/intelligence/courtPathClassifier";
import { STORY_ANSWER_TIME_MS, STORY_QUESTION, checkedAnswer, type CheckedAnswer } from "../../src/lib/case-system/retrieval/checkedAnswer";
import { understandCase, type UnderstandResult } from "../../src/lib/case-system/understanding/understandCase";
import { ISSUE_KIND_LABELS, hasSeveralMattersContent, selectCrossForumNotes } from "../../src/lib/content-library/crossForumNotes";

type Story = {
  id: string;
  chosenCourt: "small-claims" | "civil" | "family";
  city: string;
  story: string;
  /** What a careful Ontario lawyer would tell this person; the grader's key. */
  expected: string[];
};

type Grade = {
  points: { point: string; verdict: "met" | "partly" | "missed"; note: string }[];
  wrong: string[];
  askedForMissing: boolean;
  score: number;
  summary: string;
};

const ROOT = process.cwd();
const arg = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

// ------------------------------------------------------------------ rendering what a person sees

function answerText(answer: CheckedAnswer): string {
  const lines: string[] = [];
  if (answer.declinedToJudge) lines.push("(The site said it does not judge whether a case will succeed.)");
  if (answer.status === "outside-scope") lines.push("(The site said this is outside what it covers.)");
  answer.statements.forEach((statement, i) => {
    lines.push(`${i + 1}. ${statement.text}`);
    for (const source of statement.sources) lines.push(`   Source: ${source.citation} -- "${source.quote.slice(0, 220)}"`);
  });
  if (answer.notConfirmed.length) lines.push(`Could not confirm (not stated): ${answer.notConfirmed.join("; ")}`);
  if (!answer.statements.length && answer.status !== "outside-scope") lines.push("(No legal statements shown.)");
  return lines.join("\n");
}

async function runOld(story: Story): Promise<{ shown: string; costCalls: number }> {
  const classification = await classifyCourtPath({ story: story.story, declaredCourtPath: story.chosenCourt });
  const amounts = statedDollarAmounts(story.story);
  const notes = selectCrossForumNotes(classification.matters, amounts);
  const several = hasSeveralMattersContent(classification.matters, amounts);
  const front: string[] = ["FRONT DOOR (after 'Continue'):"];
  if (several) {
    front.push("Card: 'Your description may involve more than one matter'");
    for (const issue of classification.matters.issues) front.push(`- ${ISSUE_KIND_LABELS[issue.kind]?.text ?? issue.kind}: You wrote "${issue.quote}"`);
    for (const note of notes) front.push(`Note: ${note.title} -- ${note.text}`);
  }
  if (classification.primaryPath === "out-of-scope" && classification.outOfScopeForum) {
    front.push(`Card: 'CourtSimplified doesn't cover this' -- ${classification.outOfScopeForum.redirectMessage}`);
  }
  const path = classification.primaryPath;
  const suggested = path === "small-claims" || path === "civil" || path === "family" ? path : null;
  if (suggested && suggested !== story.chosenCourt && classification.confidence >= 0.6) front.push(`Buttons: Start with / Switch to ${suggested}; Continue with ${story.chosenCourt}`);
  else front.push(`Button: Continue to ${story.chosenCourt} intake`);
  if (front.length === 2 && !several) front.push("(No card shown; straight to the intake.)");

  // The case page's answer to the story, on the path the person ends up on.
  const court = suggested && classification.confidence >= 0.6 ? suggested : story.chosenCourt;
  const answer = await checkedAnswer({ question: STORY_QUESTION, story: story.story, courtPath: court }, { timeoutMs: STORY_ANSWER_TIME_MS });
  return {
    shown: `${front.join("\n")}\n\nCASE PAGE: "What the law says about your story" (court: ${court}):\n${answerText(answer)}`,
    costCalls: 1,
  };
}

function newText(result: UnderstandResult): string {
  if (result.status !== "understood") return "(The new engine gave no answer; the site would fall back to the old front door.)";
  const u = result.understanding;
  return [
    "HERE IS WHAT WE UNDERSTOOD:",
    u.summary,
    ...u.facts.map((fact) => `- ${fact.label}: ${fact.value}`),
    u.stage ? `Where it stands: ${u.stage}` : "",
    u.matters.length > 1 ? `Matters: ${u.matters.map((m) => `${m.title} (${m.court}${m.forum ? `: ${m.forum}` : ""})`).join("; ")}` : "",
    "",
    "WHAT WE STILL NEED TO KNOW:",
    ...u.questions.map((q, i) => `${i + 1}. ${q.question}${q.why ? ` (Why: ${q.why})` : ""}`),
    "",
    "YOUR NEXT STEP AND THE LAW THAT APPLIES (each checked against the official text):",
    answerText(result.answer),
    "",
    `WHERE THIS SEEMS TO BELONG: ${u.mainCourt}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

// ------------------------------------------------------------------ the grader

const GRADER_PROMPT = `You are a senior Ontario litigator grading what a legal self-help website showed a self-represented person, in response to their story. Grade strictly, as a careful lawyer would.

You are given the person's STORY, the EXPECTED points a careful Ontario lawyer would cover for this person, and what the SITE SHOWED.

Return JSON:
{"points": [{"point": "<expected point, shortened>", "verdict": "met"|"partly"|"missed", "note": "<one short sentence>"}],
 "wrong": ["<each statement the site showed that is legally wrong, misleading, about the wrong court or side, about something that did not happen, or irrelevant enough to confuse this person>"],
 "askedForMissing": boolean,
 "score": <0-10>,
 "summary": "<two sentences: how useful this would be to the person and the biggest problem>"}

- "met" only if the site actually said it (in substance), correctly. A point the site lists as "could not confirm" is missed.
- Fixed cards or notes that do not fit the story count as wrong (for example, a note about an earlier decision when nothing has been decided).
- askedForMissing: true if the site asked the person for the important missing facts (the expected points name them).
- score: 10 = what a careful lawyer would tell them, nothing wrong; 5 = useful but missing key points or with a confusing error; 0 = wrong or useless. Any statement that could send them to the wrong court, the wrong form or past a deadline costs heavily.
- Do not reward length. Do not penalize correct extra points that help this person.`;

async function grade(story: Story, shown: string): Promise<Grade | null> {
  const { createOpenAIClient } = await import("../../src/lib/case-system/openaiClient");
  const { modelParams } = await import("../../src/lib/case-system/aiModels");
  const client = createOpenAIClient();
  const response = await client.chat.completions.create({
    ...modelParams("deep", { effort: "high" }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GRADER_PROMPT },
      {
        role: "user",
        content: `STORY (they live in ${story.city}, Ontario; today is ${new Date().toISOString().slice(0, 10)}):\n${story.story}\n\nEXPECTED:\n${story.expected.map((point, i) => `${i + 1}. ${point}`).join("\n")}\n\nSITE SHOWED:\n${shown}`,
      },
    ],
  });
  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "") as Grade;
    return { ...parsed, score: Number(parsed.score) };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ main

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.log("This spends the site's OpenAI balance. Run again with --confirm.");
    return;
  }
  const only = arg("--only");
  const ids = arg("--ids")?.split(",").map((id) => id.trim()).filter(Boolean);
  const stories = (JSON.parse(readFileSync(path.join(ROOT, "scripts", "eval", "understanding", "stories.json"), "utf8")) as Story[]).filter(
    (story) => !ids?.length || ids.includes(story.id),
  );

  type Row = { id: string; system: "old" | "new"; shown: string; grade: Grade | null; ms: number };
  const rows: Row[] = [];
  await Promise.all(
    stories.map(async (story) => {
      const systems: ("old" | "new")[] = only === "new" ? ["new"] : only === "old" ? ["old"] : ["old", "new"];
      for (const system of systems) {
        const started = Date.now();
        let shown: string;
        try {
          shown =
            system === "old"
              ? (await runOld(story)).shown
              : newText(await understandCase({ story: story.story, city: story.city, chosenCourt: story.chosenCourt }));
        } catch (error) {
          shown = `(Run failed: ${error instanceof Error ? error.message : String(error)})`;
        }
        const ms = Date.now() - started;
        const graded = await grade(story, shown).catch(() => null);
        rows.push({ id: story.id, system, shown, grade: graded, ms });
        console.log(`${story.id} ${system}: ${graded ? graded.score : "?"}/10 in ${Math.round(ms / 1000)} s`);
      }
    }),
  );

  const order = (row: Row) => stories.findIndex((story) => story.id === row.id) * 2 + (row.system === "new" ? 1 : 0);
  rows.sort((a, b) => order(a) - order(b));
  const avg = (system: "old" | "new") => {
    const scores = rows.filter((row) => row.system === system && row.grade).map((row) => row.grade!.score);
    return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "n/a";
  };
  const md: string[] = [
    "# Front door: old vs new",
    "",
    `Run ${new Date().toISOString()}. ${stories.length} stories. Average score out of 10: **old ${avg("old")}**, **new ${avg("new")}**.`,
    "",
    "| Story | Old | New | Old: wrong items | New: wrong items |",
    "|---|---|---|---|---|",
    ...stories.map((story) => {
      const old = rows.find((row) => row.id === story.id && row.system === "old");
      const fresh = rows.find((row) => row.id === story.id && row.system === "new");
      return `| ${story.id} | ${old?.grade?.score ?? "-"} | ${fresh?.grade?.score ?? "-"} | ${old?.grade?.wrong.length ?? "-"} | ${fresh?.grade?.wrong.length ?? "-"} |`;
    }),
    "",
  ];
  for (const story of stories) {
    md.push(`## ${story.id}`, "", `> ${story.story}`, "", `Chosen on the menu: ${story.chosenCourt}`, "");
    for (const row of rows.filter((item) => item.id === story.id)) {
      md.push(`### ${row.system.toUpperCase()} — ${row.grade?.score ?? "?"}/10 (${Math.round(row.ms / 1000)} s)`, "");
      if (row.grade) {
        md.push(`**Grader:** ${row.grade.summary}`, "");
        for (const point of row.grade.points) md.push(`- ${point.verdict === "met" ? "✅" : point.verdict === "partly" ? "🟡" : "❌"} ${point.point} — ${point.note}`);
        if (row.grade.wrong.length) md.push("", "**Wrong or misleading:**", ...row.grade.wrong.map((item) => `- ${item}`));
        md.push("", `Asked for the missing facts: ${row.grade.askedForMissing ? "yes" : "no"}`, "");
      }
      md.push("<details><summary>What the person saw</summary>", "", "```", row.shown, "```", "", "</details>", "");
    }
  }
  writeFileSync(path.join(ROOT, "understanding-report.md"), md.join("\n"));
  writeFileSync(path.join(ROOT, "understanding-report.json"), JSON.stringify({ rows, stories }, null, 2));
  console.log(`Average: old ${avg("old")}, new ${avg("new")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
