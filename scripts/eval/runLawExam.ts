/**
 * Runs the CourtSimplified law exam: puts every question in
 * scripts/eval/lawExam/questions/ to the site's own research step -- the same
 * one behind "The law on your question" (retrieval/researchQuestion.ts) -- and
 * scores what the site showed against the answer key, by code.
 *
 * COSTS MONEY. Each question makes the site's real model calls (about two or
 * three). It does nothing without --confirm, and no workflow runs it on its
 * own (CLAUDE.md s. 7, "OpenAI spending"):
 *
 *   npm run eval:law-exam -- --confirm                 the whole exam
 *   npm run eval:law-exam -- --confirm --limit 20      the first 20
 *   npm run eval:law-exam -- --confirm --area family   one area
 *   npm run eval:law-exam -- --confirm --ids SC-001,FAM-004
 *
 * HOW A QUESTION IS SCORED (0, 1 or 2 points), from what the site showed:
 *   answer / correct-the-premise / decline-to-judge
 *     2  a provision the site showed contains a quote from the answer key, word
 *        for word: it found the law the answer rests on;
 *     1  it showed law from the right statute or decision, but not that passage;
 *     0  it showed nothing from the key's sources.
 *     A decline-to-judge question scores 0 if any research question the site
 *     wrote predicts or grades the case.
 *   say-not-covered
 *     2  it answered nothing from the library (it said the law is not there);
 *     0  it showed provisions as if they answered the question.
 *
 * The site never writes its own wording about the law -- it shows provisions
 * and code-checked quotes -- so this measures whether it FINDS the right law.
 * The report sets the model answer beside what the site showed for a person to
 * read; key points are marked where the site's text contains them.
 *
 * Nothing here files a source request or writes to any database.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import { normalizeQuoteText, quoteAppearsIn } from "../../src/lib/case-system/intelligence/quoteMatch";
import { findingsView } from "../../src/lib/case-system/retrieval/findingsView";
import { researchQuestion } from "../../src/lib/case-system/retrieval/researchQuestion";
import { DECISION_SOURCES } from "../retrieval/decisionSources";
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

/** The retrieval source id for a file under docs/sources/ (corpus id = file stem; decisions by path). */
const decisionIdByFile = new Map(DECISION_SOURCES.map((source) => [path.basename(source.path), source.id]));
function sourceIdOf(file: string): string | null {
  if (file.startsWith("docs/sources/corpus/")) return path.basename(file, ".txt");
  if (file.startsWith("docs/sources/decisions/")) return decisionIdByFile.get(path.basename(file)) ?? null;
  return null;
}
/** Provision ids look like `corpus:<sourceId>:<n>`. */
const provisionSource = (id: string) => id.split(":")[1] ?? "";

type Shown = { id: string; citation: string; text: string; quote: string };
type Graded = {
  question: ExamQuestion;
  points: 0 | 1 | 2;
  why: string;
  seconds: number;
  researchQuestions: string[];
  shown: Shown[];
  notInLibrary: string[];
  keyPointsFound: string[];
  error?: string;
};

function grade(question: ExamQuestion, research: string[], shown: Shown[], notInLibrary: string[]): Pick<Graded, "points" | "why"> {
  if (question.expected === "say-not-covered") {
    return shown.length === 0
      ? { points: 2, why: "showed no law, as expected for a topic the site does not cover" }
      : { points: 0, why: `showed ${shown.length} provision(s) for a topic the site does not cover` };
  }
  if (question.expected === "decline-to-judge") {
    const judging = research.filter((text) => !validateCaseStrengthLanguage(text).valid);
    if (judging.length) return { points: 0, why: `researched a prediction: "${judging[0]}"` };
  }
  const exact = question.sources.some((source) => shown.some((provision) => quoteAppearsIn(source.quote, provision.text)));
  if (exact) return { points: 2, why: "showed the passage the answer key quotes" };
  const wanted = new Set(question.sources.map((source) => sourceIdOf(source.file)).filter(Boolean));
  const sameSource = shown.filter((provision) => wanted.has(provisionSource(provision.id)));
  if (sameSource.length) return { points: 1, why: `showed the right law (${sameSource[0].citation}) but not the passage the key quotes` };
  if (!shown.length && notInLibrary.length) return { points: 0, why: `said the library lacks it (${notInLibrary.join("; ")})` };
  return { points: 0, why: shown.length ? "showed other law, not the key's sources" : "showed no law" };
}

async function main() {
  const exam = loadExam();
  const area = arg("--area");
  const ids = arg("--ids")?.split(",").map((id) => id.trim());
  const limit = Number(arg("--limit") ?? 0);
  let chosen = exam.filter((question) => (!area || question.area === area) && (!ids || ids.includes(question.id)));
  if (limit > 0) chosen = chosen.slice(0, limit);

  if (!process.argv.includes("--confirm")) {
    console.log(
      `The law exam has ${exam.length} questions; this run would put ${chosen.length} to the site's research step, ` +
        `making real model calls (about 2 to 3 each). Nothing was run. Add --confirm to run it.`,
    );
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is not set. Nothing was run.");
    process.exitCode = 1;
    return;
  }

  const results: Graded[] = [];
  for (const question of chosen) {
    const started = Date.now();
    try {
      const result = await researchQuestion({ question: question.question, story: question.story, courtPath: question.courtPath });
      const view = findingsView(result, false);
      const shown: Shown[] = view.flatMap((finding) =>
        finding.provisions.map((provision) => ({ id: provision.id, citation: provision.citation || provision.label, text: provision.text, quote: provision.quote })),
      );
      const notInLibrary = view.filter((finding) => finding.status !== "answered").map((finding) => finding.missingSource || finding.question);
      const research = view.map((finding) => finding.question);
      const siteText = normalizeQuoteText(shown.map((provision) => provision.text).join(" "));
      const keyPointsFound = question.keyPoints.filter((point) => siteText.includes(normalizeQuoteText(point)));
      results.push({
        question,
        ...grade(question, research, shown, notInLibrary),
        seconds: (Date.now() - started) / 1000,
        researchQuestions: research,
        shown,
        notInLibrary,
        keyPointsFound,
      });
    } catch (error) {
      results.push({
        question,
        points: 0,
        why: "the research step failed",
        error: (error as Error).message.slice(0, 200),
        seconds: (Date.now() - started) / 1000,
        researchQuestions: [],
        shown: [],
        notInLibrary: [],
        keyPointsFound: [],
      });
    }
    const last = results[results.length - 1];
    console.log(`${question.id.padEnd(9)} ${last.points}/2  ${last.seconds.toFixed(1)}s  ${last.why}`);
  }

  writeFileSync(path.join(ROOT, "law-exam-report.json"), JSON.stringify(results, null, 2));
  writeFileSync(path.join(ROOT, "law-exam-report.md"), report(results));
  const total = results.reduce((sum, result) => sum + result.points, 0);
  console.log(`Law exam: ${total} of ${results.length * 2} points (${percent(total, results.length * 2)}) on ${results.length} questions.`);
}

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "-");

function report(results: Graded[]): string {
  const total = results.reduce((sum, result) => sum + result.points, 0);
  const lines = [
    `# CourtSimplified law exam`,
    "",
    `Run ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. ${results.length} questions, ` +
      `${total} of ${results.length * 2} points (${percent(total, results.length * 2)}).`,
    "",
    "2 points: the site showed the passage the answer key quotes. 1 point: the right statute or decision, not that passage. " +
      "0: neither, or (for out-of-scope questions) it showed law it should not have, or (for \"will I win\" questions) it researched a prediction.",
    "",
    "| Area | Questions | Points | Score |",
    "|---|---|---|---|",
  ];
  for (const area of EXAM_AREAS) {
    const inArea = results.filter((result) => result.question.area === area);
    if (!inArea.length) continue;
    const points = inArea.reduce((sum, result) => sum + result.points, 0);
    lines.push(`| ${area} | ${inArea.length} | ${points} / ${inArea.length * 2} | ${percent(points, inArea.length * 2)} |`);
  }
  lines.push("", "## Every question", "");
  for (const result of results) {
    const { question } = result;
    lines.push(`### ${question.id} — ${result.points}/2 (${question.style}, ${question.courtPath})`, "");
    if (question.story) lines.push(`> ${question.story.replace(/\n/g, "\n> ")}`, ">");
    lines.push(`> **${question.question}**`, "", `**Result:** ${result.why}${result.error ? ` (${result.error})` : ""}`, "");
    lines.push(`**Model answer:** ${question.modelAnswer}`, "");
    lines.push(`**Key sources:** ${question.sources.map((source) => `${path.basename(source.file, ".txt")} ${source.pinpoint}`).join("; ") || "none (not covered)"}`, "");
    if (result.researchQuestions.length) lines.push(`**What the site looked into:** ${result.researchQuestions.join(" / ")}`, "");
    if (result.shown.length) {
      lines.push("**What the site showed:**");
      for (const provision of result.shown.slice(0, 6)) lines.push(`- ${provision.citation}: "${provision.quote}"`);
      lines.push("");
    }
    if (result.notInLibrary.length) lines.push(`**Not in the library:** ${result.notInLibrary.join("; ")}`, "");
    lines.push(`**Key points in what it showed:** ${result.keyPointsFound.length} of ${question.keyPoints.length}`, "");
  }
  return `${lines.join("\n")}\n`;
}

void main();
