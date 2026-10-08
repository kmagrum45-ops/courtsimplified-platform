/**
 * The law exam's answer keys rest on the law, word for word.
 *
 * WHAT THIS CATCHES: an answer key written from memory. Every question in
 * scripts/eval/lawExam/questions/ cites the official text saved in this
 * repository, and every quote must appear in that text -- the same check the
 * site's own quotes pass (quoteMatch.ts). A key whose quote is not in the
 * source, or whose source has no recorded provenance, fails. So does a model
 * answer that predicts or grades a case (CLAUDE.md s. 3), a duplicate id, or
 * a question missing what the runner needs.
 *
 * It asserts properties, not today's count: the exam must have at least
 * MIN_QUESTIONS and cover every area; adding questions never fails it.
 *
 * COSTS NOTHING. Reads files only. The exam itself is run, at a cost, by
 * `npm run eval:law-exam` (manual only).
 *
 * Run: node --import tsx scripts/verification/verifyLawExam.ts [--file questions/x.json]
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import { quoteAppearsIn } from "../../src/lib/case-system/intelligence/quoteMatch";
import { EXAM_AREAS, EXAM_STYLES, EXPECTED, type ExamQuestion } from "../eval/lawExam/examTypes";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const QUESTIONS_DIR = path.join(ROOT, "scripts", "eval", "lawExam", "questions");
const MIN_QUESTIONS = 160;

let failures = 0;
const problems: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const manifest = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/corpus/manifest.json"), "utf8")) as {
  entries: { file: string; url: string; retrievedAt: string }[];
};
const manifestFiles = new Set(manifest.entries.map((entry) => entry.file));
const provenanceText =
  readFileSync(path.join(ROOT, "docs/sources/README.md"), "utf8") +
  readFileSync(path.join(ROOT, "scripts/retrieval/decisionSources.ts"), "utf8");

/** Where the text came from must be recorded: the corpus manifest, or the sources README / decision list. */
function provenanceOf(file: string): boolean {
  if (file.startsWith("docs/sources/corpus/")) return manifestFiles.has(path.basename(file));
  const stem = path.basename(file).replace(/(\.english|\.html)?\.(txt|pdf)$/, "");
  return provenanceText.includes(stem);
}

const textCache = new Map<string, string>();
function sourceText(file: string): string | null {
  if (!textCache.has(file)) {
    const full = path.join(ROOT, file);
    textCache.set(file, existsSync(full) && file.endsWith(".txt") ? readFileSync(full, "utf8") : "");
  }
  return textCache.get(file) || null;
}

/** What a model answer may not say: a prediction or a grade of the person's case. */
const PREDICTION =
  /\b(you (?:will|would) (?:likely |probably )?(?:win|lose|succeed|fail)|(?:is|are) (?:likely|unlikely) to (?:win|succeed|lose|fail)|(?:strong|weak|good|winnable) (?:case|claim)|(?:your|her|his|their) chances)\b/i;

function checkQuestion(question: ExamQuestion, where: string) {
  const id = question.id ?? "(no id)";
  const say = (problem: string) => problems.push(`${where} ${id}: ${problem}`);
  if (!/^[A-Z]{2,4}-\d{3}$/.test(id)) say("id must look like AREA-000");
  if (!EXAM_AREAS.includes(question.area)) say(`unknown area "${question.area}"`);
  if (!EXAM_STYLES.includes(question.style)) say(`unknown style "${question.style}"`);
  if (!EXPECTED.includes(question.expected)) say(`unknown expected "${question.expected}"`);
  if (!["small-claims", "civil", "family"].includes(question.courtPath)) say(`unknown courtPath "${question.courtPath}"`);
  if (!question.question?.trim() || question.question.length > 1000) say("question missing or over 1,000 characters");
  if ((question.story ?? "").length > 3000) say("story over 3,000 characters");
  if (!question.modelAnswer?.trim()) say("no model answer");
  if (!Array.isArray(question.keyPoints) || question.keyPoints.length === 0) say("no key points");
  if (PREDICTION.test(question.modelAnswer ?? "") || !validateCaseStrengthLanguage(question.modelAnswer ?? "").valid) {
    say("the model answer predicts or grades a case");
  }
  if (question.style === "out-of-scope" && question.expected !== "say-not-covered") say("an out-of-scope question expects say-not-covered");
  if (question.style === "judge-the-case" && question.expected !== "decline-to-judge") say("a judge-the-case question expects decline-to-judge");
  if (question.style === "false-premise" && question.expected !== "correct-the-premise") say("a false-premise question expects correct-the-premise");

  const sources = Array.isArray(question.sources) ? question.sources : [];
  if (question.expected !== "say-not-covered" && sources.length === 0) say("no source for an answer that states law");
  for (const source of sources) {
    if (!source.file?.startsWith("docs/sources/")) {
      say(`source must be under docs/sources/: ${source.file}`);
      continue;
    }
    const text = sourceText(source.file);
    if (!text) {
      say(`source file missing or not a .txt: ${source.file}`);
      continue;
    }
    if (!provenanceOf(source.file)) say(`no recorded provenance for ${source.file}`);
    if (!source.pinpoint?.trim()) say(`no pinpoint for a quote from ${source.file}`);
    // A headnote is a reporter's summary, not the court's words: a key quotes the reasons.
    if (/headnote|summary|catchwords/i.test(source.pinpoint ?? "")) say(`quotes a decision's summary, not the court's reasons: ${source.file}`);
    if (!quoteAppearsIn(source.quote ?? "", text)) say(`quote not found word for word in ${source.file}: "${(source.quote ?? "").slice(0, 80)}"`);
  }
}

const only = process.argv.includes("--file") ? process.argv[process.argv.indexOf("--file") + 1] : null;
const files = only
  ? [path.resolve(only.startsWith("/") ? only : path.join(ROOT, "scripts/eval/lawExam", only))]
  : readdirSync(QUESTIONS_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.join(QUESTIONS_DIR, file));

const all: ExamQuestion[] = [];
for (const file of files) {
  let list: ExamQuestion[] = [];
  try {
    list = JSON.parse(readFileSync(file, "utf8")) as ExamQuestion[];
  } catch (error) {
    problems.push(`${path.basename(file)}: not valid JSON (${(error as Error).message})`);
    continue;
  }
  if (!Array.isArray(list)) {
    problems.push(`${path.basename(file)}: must be a JSON array of questions`);
    continue;
  }
  for (const question of list) checkQuestion(question, path.basename(file));
  all.push(...list);
}

const ids = all.map((question) => question.id);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
check(`every question is well formed and every quote is in its source (${all.length} questions, ${files.length} files)`, problems.length === 0, problems.slice(0, 40).join("\n      ") + (problems.length > 40 ? `\n      ... ${problems.length - 40} more` : ""));
check("every id is unique", duplicates.length === 0, duplicates.join(", "));

if (!only) {
  check(`the exam has at least ${MIN_QUESTIONS} questions`, all.length >= MIN_QUESTIONS, `${all.length}`);
  const missingAreas = EXAM_AREAS.filter((area) => !all.some((question) => question.area === area));
  check("every area is examined", missingAreas.length === 0, missingAreas.join(", "));
  const missingStyles = EXAM_STYLES.filter((style) => !all.some((question) => question.style === style));
  check("every style of question is used", missingStyles.length === 0, missingStyles.join(", "));
  // The held-back questions (2026-10-07): the honest score. They must exist,
  // number 30, and not include the questions already used to tune the site.
  const holdout = (JSON.parse(readFileSync(path.join(ROOT, "scripts/eval/lawExam/holdout.json"), "utf8")) as { ids: string[] }).ids;
  check("30 questions are held back, every one real", holdout.length === 30 && holdout.every((id) => ids.includes(id)), holdout.filter((id) => !ids.includes(id)).join(", "));
  check("no held-back question is one already used for tuning (-001, -002)", !holdout.some((id) => /-00[12]$/.test(id)));
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
