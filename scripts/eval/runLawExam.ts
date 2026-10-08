/**
 * Runs the CourtSimplified law exam against the site and scores it.
 *
 * Two modes:
 *   --mode answer    (default) the checked answer (retrieval/checkedAnswer.ts):
 *                    what a person now sees -- plain statements, each proved
 *                    against the official text.
 *   --mode research  the research step (retrieval/researchQuestion.ts): the
 *                    passages-only reply the site gave before checked answers.
 *
 * COSTS MONEY: the site's real model calls (answer mode: 2 chat calls and an
 * embedding a question, plus 1 grading call). Nothing runs without --confirm,
 * and no workflow runs it on its own (CLAUDE.md s. 7):
 *
 *   npm run eval:law-exam -- --confirm --limit 18           18 questions, 2 from each area
 *   npm run eval:law-exam -- --confirm                      the whole exam
 *   npm run eval:law-exam -- --confirm --area family
 *   npm run eval:law-exam -- --confirm --ids SC-001,FAM-004
 *   npm run eval:law-exam -- --confirm --mode research --no-grade
 *
 * A limited run takes questions round-robin across the areas, so 18 questions
 * test every area, not the first file.
 *
 * SCORING (each question 0 to 2):
 *   CORRECT -- a grader call compares what the site said with the answer key
 *     (the model answer and its key points, themselves quoted from the law and
 *     checked in CI by test:law-exam). 2 = says what the key says with nothing
 *     wrong; 1 = right but incomplete; 0 = wrong, or nothing useful. Anything
 *     the site said that contradicts the key scores 0, however much else is
 *     right. A correct answer from an official guide counts.
 *   For "will I win?" questions: 2 only if the site declined to judge.
 *   For out-of-scope questions: 2 only if it stated no law.
 *   LAW FOUND (shown separately) -- the share of the key's passages that the
 *     site read and cited, by code.
 *
 * Nothing here files a source request or writes to any database.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { quoteAppearsIn } from "../../src/lib/case-system/intelligence/quoteMatch";
import { ANSWER_TIME_MS, checkedAnswer, type CheckedAnswer } from "../../src/lib/case-system/retrieval/checkedAnswer";
import { DECLINE_TO_JUDGE } from "../../src/lib/case-system/retrieval/checkedAnswerText";
import { loadCorpusIndex, readPassage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { findingsView } from "../../src/lib/case-system/retrieval/findingsView";
import { researchQuestion } from "../../src/lib/case-system/retrieval/researchQuestion";
import { EXAM_AREAS, type ExamQuestion } from "./lawExam/examTypes";

const ROOT = process.cwd();
const QUESTIONS_DIR = path.join(ROOT, "scripts", "eval", "lawExam", "questions");

const arg = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

function loadExam(): ExamQuestion[] {
  return readdirSync(QUESTIONS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) => JSON.parse(readFileSync(path.join(QUESTIONS_DIR, file), "utf8")) as ExamQuestion[]);
}

/** Round-robin across areas, so a limited run tests every area. Pure; exported for the suite. */
export function spreadAcrossAreas(questions: readonly ExamQuestion[], limit: number): ExamQuestion[] {
  const byArea = EXAM_AREAS.map((area) => questions.filter((question) => question.area === area));
  const out: ExamQuestion[] = [];
  for (let round = 0; out.length < limit && byArea.some((list) => list.length > round); round += 1) {
    for (const list of byArea) if (list[round] && out.length < limit) out.push(list[round]);
  }
  return out;
}

type SiteSaid = { text: string; cites: { passageId: string; citation: string }[] }[];

type Graded = {
  question: ExamQuestion;
  points: 0 | 1 | 2;
  why: string;
  lawFound: { found: number; of: number };
  seconds: number;
  siteSaid: SiteSaid;
  notConfirmed: string[];
  /** Why each topic was not confirmed (the checked answer's internal record). */
  notConfirmedWhy?: { topic: string; why: string }[];
  declined: boolean;
  outsideScope: boolean;
  error?: string;
};

// ------------------------------------------------------------ law found (code)

const index = loadCorpusIndex();
function lawFound(question: ExamQuestion, passageIds: readonly string[]): { found: number; of: number } {
  const texts = passageIds.map((id) => (index ? readPassage(index, id, 0)?.text : "") ?? "");
  const found = question.sources.filter((source) => texts.some((text) => quoteAppearsIn(source.quote, text))).length;
  return { found, of: question.sources.length };
}

// ------------------------------------------------------------ grading (one model call)

const GRADER_PROMPT = `You grade answers to Ontario law exam questions against an answer key written from the official text. Be strict and fair.

Return JSON: {"points": 0 | 1 | 2, "why": "<one sentence>"}
- 2: what the site said is correct and covers the key's essential points (wording may differ; an official guide saying the same thing counts).
- 1: what it said is correct but leaves out one or more essential points.
- 0: anything it said contradicts the key (a wrong period, number, rule, court or exception), OR it said nothing useful.
Grade only what the site said, against the key. Do not reward length.`;

async function gradeWithModel(question: ExamQuestion, siteSaid: SiteSaid): Promise<{ points: 0 | 1 | 2; why: string }> {
  const { withAiCallContext } = await import("../../src/lib/audit/aiCallLog");
  const { createOpenAIClient } = await import("../../src/lib/case-system/openaiClient");
  const { modelParams } = await import("../../src/lib/case-system/aiModels");
  const user = [
    question.story ? `FACTS: ${question.story}` : "",
    `QUESTION: ${question.question}`,
    `ANSWER KEY: ${question.modelAnswer}`,
    `ESSENTIAL POINTS: ${question.keyPoints.join(" | ")}`,
    `WHAT THE SITE SAID:\n${siteSaid.map((statement, i) => `${i + 1}. ${statement.text} [${statement.cites.map((cite) => cite.citation).join("; ")}]`).join("\n") || "(nothing)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const raw = await withAiCallContext({ callType: "small-claims-analysis" }, async () => {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      ...modelParams("standard", { effort: "low", temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GRADER_PROMPT },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  });
  try {
    const parsed = JSON.parse(raw) as { points?: unknown; why?: unknown };
    const points = parsed.points === 2 ? 2 : parsed.points === 1 ? 1 : 0;
    return { points, why: typeof parsed.why === "string" ? parsed.why.slice(0, 300) : "graded" };
  } catch {
    return { points: 0, why: "the grader's answer could not be read" };
  }
}

// ------------------------------------------------------------ one question

async function runQuestion(question: ExamQuestion, mode: "answer" | "research", grade: boolean): Promise<Graded> {
  const started = Date.now();
  const input = { question: question.question, story: question.story, courtPath: question.courtPath };
  let siteSaid: SiteSaid = [];
  let passageIds: string[] = [];
  let notConfirmed: string[] = [];
  let notConfirmedWhy: { topic: string; why: string }[] = [];
  let declined = false;
  let outsideScope = false;
  let unavailable = false;

  if (mode === "answer") {
    // The same time budget a person's question gets on the site.
    const answer: CheckedAnswer = await checkedAnswer(input, { timeoutMs: ANSWER_TIME_MS });
    siteSaid = answer.statements.map((statement) => ({
      text: statement.text,
      cites: statement.sources.map((source) => ({ passageId: source.passageId, citation: source.citation })),
    }));
    passageIds = answer.statements.flatMap((statement) => statement.sources.map((source) => source.passageId));
    notConfirmed = answer.notConfirmed;
    notConfirmedWhy = answer.notConfirmedWhy ?? [];
    declined = answer.declinedToJudge;
    outsideScope = answer.status === "outside-scope";
    unavailable = answer.status === "unavailable";
  } else {
    const view = findingsView(await researchQuestion(input), false);
    siteSaid = view.flatMap((finding) =>
      finding.provisions.map((provision) => ({ text: `"${provision.quote}"`, cites: [{ passageId: provision.id, citation: provision.citation || provision.label }] })),
    );
    passageIds = siteSaid.flatMap((statement) => statement.cites.map((cite) => cite.passageId));
    notConfirmed = view.filter((finding) => finding.status !== "answered").map((finding) => finding.missingSource || finding.question);
  }

  const found = lawFound(question, passageIds);
  const base = { question, lawFound: found, seconds: 0, siteSaid, notConfirmed, notConfirmedWhy, declined, outsideScope };
  let points: 0 | 1 | 2 = 0;
  let why = "";
  if (question.expected === "say-not-covered") {
    points = siteSaid.length === 0 ? 2 : 0;
    why = points ? "stated no law for a topic the site does not cover" : `stated ${siteSaid.length} point(s) of law for a topic the site does not cover`;
  } else if (unavailable) {
    why = "no answer (the answer step failed or timed out)";
  } else if (question.expected === "decline-to-judge" && mode === "answer" && !declined) {
    why = "did not decline to predict or grade the case";
  } else if (grade) {
    // What the person sees: when the site declines to judge, the fixed decline
    // line is shown above the answer, so the grader sees it too.
    const shown: SiteSaid = declined ? [{ text: DECLINE_TO_JUDGE, cites: [] }, ...siteSaid] : siteSaid;
    ({ points, why } = await gradeWithModel(question, shown));
    if (question.expected === "decline-to-judge" && mode === "answer") why = `declined to judge; ${why}`;
  } else {
    points = found.of && found.found / found.of >= 0.5 ? 2 : found.found ? 1 : 0;
    why = `not graded; found ${found.found} of ${found.of} key passages`;
  }
  return { ...base, points, why, seconds: (Date.now() - started) / 1000 };
}

// ------------------------------------------------------------ main

async function main() {
  const exam = loadExam();
  const area = arg("--area");
  const ids = arg("--ids")?.split(",").map((id) => id.trim());
  const limit = Number(arg("--limit") ?? 0);
  const mode = arg("--mode") === "research" ? "research" : "answer";
  const grade = !process.argv.includes("--no-grade");
  // 30 questions are held back (lawExam/holdout.json): never used for tuning,
  // run once at the end for an honest score. --set tuning (default when no ids
  // are named) leaves them out; --set holdout runs only them.
  const holdout = new Set((JSON.parse(readFileSync(path.join(ROOT, "scripts/eval/lawExam/holdout.json"), "utf8")) as { ids: string[] }).ids);
  const set = arg("--set") ?? (ids ? "all" : "tuning");
  const inSet = (id: string) => (set === "holdout" ? holdout.has(id) : set === "tuning" ? !holdout.has(id) : true);
  const filtered = exam.filter((question) => (!area || question.area === area) && (!ids || ids.includes(question.id)) && inSet(question.id));
  const chosen = limit > 0 ? spreadAcrossAreas(filtered, limit) : filtered;

  if (!process.argv.includes("--confirm")) {
    console.log(
      `The law exam has ${exam.length} questions; this run would put ${chosen.length} to the site (${mode} mode${grade ? ", graded" : ""}), ` +
        `making real model calls. Nothing was run. Add --confirm to run it.`,
    );
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is not set. Nothing was run.");
    process.exitCode = 1;
    return;
  }

  // Several questions at once (--concurrency, default 1), so the whole exam
  // fits in the workflow's time; results keep the questions' order.
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 1));
  const results: Graded[] = new Array(chosen.length);
  let next = 0;
  const worker = async () => {
    while (next < chosen.length) {
      const at = next++;
      const question = chosen[at];
      results[at] = await runOne(question);
      const last = results[at];
      console.log(`${question.id.padEnd(9)} ${last.points}/2  law ${last.lawFound.found}/${last.lawFound.of}  ${last.seconds.toFixed(1)}s  ${last.why}`);
    }
  };
  const runOne = async (question: ExamQuestion): Promise<Graded> => {
    try {
      return await runQuestion(question, mode, grade);
    } catch (error) {
      return {
        question,
        points: 0,
        why: "the run failed",
        error: (error as Error).message.slice(0, 200),
        lawFound: { found: 0, of: question.sources.length },
        seconds: 0,
        siteSaid: [],
        notConfirmed: [],
        declined: false,
        outsideScope: false,
      };
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, chosen.length) }, worker));

  writeFileSync(path.join(ROOT, "law-exam-report.json"), JSON.stringify({ mode, graded: grade, results }, null, 2));
  writeFileSync(path.join(ROOT, "law-exam-report.md"), report(results, mode, grade));
  // Only what needs fixing, small enough to read in one go: every question
  // short of full marks, with the grade, what went unconfirmed and why, and
  // the key points it was graded against.
  const failing = results.filter((result) => result.points < 2);
  writeFileSync(
    path.join(ROOT, "law-exam-failures.md"),
    [
      `# Questions short of full marks: ${failing.length} of ${results.length}`,
      `ids: ${failing.map((result) => result.question.id).join(",")}`,
      "",
      ...failing.flatMap((result) => [
        `## ${result.question.id} ${result.points}/2`,
        `Q: ${result.question.question}`,
        `Grade: ${result.why}`,
        ...(result.notConfirmedWhy ?? []).map((item) => `- not confirmed (${item.topic}): ${item.why}`),
        `Key points: ${(result.question as { keyPoints?: string[] }).keyPoints?.join(" | ") ?? ""}`,
        "",
      ]),
    ].join("\n"),
  );
  const total = results.reduce((sum, result) => sum + result.points, 0);
  // Token use for the whole run (openaiClient.ts tokenUse): what each call
  // costs, measured, including any input written to the prompt cache.
  const { tokenUse } = await import("../../src/lib/case-system/openaiClient");
  const per = (n: number) => (tokenUse.calls ? Math.round(n / tokenUse.calls) : 0);
  console.log(
    `Token use: ${tokenUse.calls} calls; per call ${per(tokenUse.input)} input (${per(tokenUse.cacheWrite)} written to cache, ${per(tokenUse.cachedRead)} read from cache), ${per(tokenUse.output)} output.`,
  );
  console.log(`Law exam (${mode}): ${total} of ${results.length * 2} points (${percent(total, results.length * 2)}) on ${results.length} questions.`);
}

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "-");

function report(results: Graded[], mode: string, grade: boolean): string {
  const total = results.reduce((sum, result) => sum + result.points, 0);
  const found = results.reduce((sum, result) => sum + result.lawFound.found, 0);
  const of = results.reduce((sum, result) => sum + result.lawFound.of, 0);
  const lines = [
    `# CourtSimplified law exam (${mode} mode)`,
    "",
    `Run ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. ${results.length} questions. ` +
      `**Correct: ${total} of ${results.length * 2} points (${percent(total, results.length * 2)}).** ` +
      `Law found: ${found} of ${of} key passages (${percent(found, of)}).`,
    "",
    grade
      ? "Correct: 2 = right and complete, 1 = right but incomplete, 0 = anything wrong or nothing useful (graded against the answer key). " +
        '"Will I win?" questions score only if the site declined to judge; out-of-scope questions only if it stated no law.'
      : "Not graded: points come from the share of the key's passages the site found.",
    "",
    "| Area | Questions | Correct | Law found |",
    "|---|---|---|---|",
  ];
  for (const area of EXAM_AREAS) {
    const inArea = results.filter((result) => result.question.area === area);
    if (!inArea.length) continue;
    const points = inArea.reduce((sum, result) => sum + result.points, 0);
    const f = inArea.reduce((sum, result) => sum + result.lawFound.found, 0);
    const o = inArea.reduce((sum, result) => sum + result.lawFound.of, 0);
    lines.push(`| ${area} | ${inArea.length} | ${points} / ${inArea.length * 2} (${percent(points, inArea.length * 2)}) | ${f} / ${o} |`);
  }
  lines.push("", "## Every question", "");
  for (const result of results) {
    const { question } = result;
    lines.push(`### ${question.id} — ${result.points}/2 (${question.style}, ${question.courtPath})`, "");
    if (question.story) lines.push(`> ${question.story.replace(/\n/g, "\n> ")}`, ">");
    lines.push(`> **${question.question}**`, "", `**Grade:** ${result.why}${result.error ? ` (${result.error})` : ""}`, "");
    if (result.declined) lines.push("_The site declined to predict or grade the case._", "");
    if (result.outsideScope) lines.push("_The site said this is outside the law it covers._", "");
    if (result.siteSaid.length) {
      lines.push("**What the site said:**");
      for (const statement of result.siteSaid) lines.push(`- ${statement.text} _(${statement.cites.map((cite) => cite.citation).join("; ")})_`);
      lines.push("");
    }
    if (result.notConfirmed.length) lines.push(`**Could not confirm:** ${result.notConfirmed.join("; ")}`, "");
    for (const item of result.notConfirmedWhy ?? []) lines.push(`- _why not confirmed (${item.topic}):_ ${item.why}`);
    if (result.notConfirmedWhy?.length) lines.push("");
    lines.push(`**Answer key:** ${question.modelAnswer}`, "");
    lines.push(`**Law found:** ${result.lawFound.found} of ${result.lawFound.of} key passages (${question.sources.map((source) => `${path.basename(source.file, ".txt")} ${source.pinpoint}`).join("; ") || "none"})`, "");
  }
  return `${lines.join("\n")}\n`;
}

if (process.argv[1]?.endsWith("runLawExam.ts")) void main();
