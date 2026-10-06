/**
 * The coverage test: every story in the coverage set (coverageStories.ts)
 * through the real pipeline -- the court-path classifier, the research step
 * and the questions from the law -- and a report of where it falls short:
 *
 *   - the court path the classifier chose, against the right answers;
 *   - how many of the research step's legal questions the library answered;
 *   - the laws it said the library lacks (the source-request list);
 *   - how many questions from the law the intake would ask;
 *   - per area, the weakest stories first.
 *
 * Real model calls (OPENAI_API_KEY); a report, not a gate. Run by the
 * CourtSimplified Coverage workflow, which publishes to `coverage-reports`.
 *
 *   npm run eval:coverage            (COVERAGE_LIMIT, COVERAGE_ONLY=sc-,cv- to narrow)
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { classifyCourtPath } from "../../src/lib/case-system/intelligence/courtPathClassifier";
import { loadCorpusIndex, readPassage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { researchStory } from "../../src/lib/case-system/retrieval/researchStory";
import { answeringPassages, questionsFromPassages } from "../../src/lib/case-system/retrieval/sourcedQuestions";
import { COVERAGE_SET, type CoverageStory } from "./coverageStories";

const LIMIT = Number(process.env.COVERAGE_LIMIT || COVERAGE_SET.length);
const ONLY = (process.env.COVERAGE_ONLY || "").split(",").map((s: string) => s.trim()).filter(Boolean);
const WORKERS = Number(process.env.COVERAGE_WORKERS || 6);

type Row = {
  id: string;
  court: string;
  area: string;
  side?: string;
  expect: string[];
  classified: string;
  courtOk: boolean;
  outOfScope: boolean;
  issues: number;
  answered: number;
  missing: string[];
  questions: string[];
  citations: string[];
  seconds: number;
  skipped?: string;
  error?: string;
};

async function runOne(story: CoverageStory, index: NonNullable<ReturnType<typeof loadCorpusIndex>>): Promise<Row> {
  const t0 = Date.now();
  const row: Row = {
    id: story.id,
    court: story.court,
    area: story.area,
    side: story.side,
    expect: story.expect,
    classified: "",
    courtOk: false,
    outOfScope: story.expect.every((e) => e.startsWith("out-of-scope")),
    issues: 0,
    answered: 0,
    missing: [],
    questions: [],
    citations: [],
    seconds: 0,
  };
  try {
    const classification = await classifyCourtPath({ story: story.story, allowExternalCognition: true });
    row.classified =
      classification.primaryPath === "out-of-scope"
        ? `out-of-scope:${classification.outOfScopeForum?.id ?? "?"}`
        : classification.primaryPath;
    row.courtOk =
      story.expect.includes(row.classified as never) ||
      (classification.primaryPath === "mixed" && story.expect.includes(classification.secondaryPath as never));

    if (!row.outOfScope) {
      const input = { story: story.story, courtPath: story.court, ...(story.side ? { side: story.side } : {}) };
      const research = await researchStory(input);
      row.issues = research.findings.length;
      row.answered = research.findings.filter((f) => f.status === "answered").length;
      row.missing = research.sourceRequests;
      if (research.skipped) row.skipped = research.skipped;
      const passages = answeringPassages(research);
      for (const passage of passages.slice(0, 6)) {
        const p = readPassage(index, passage.id, 1);
        if (p) row.citations.push([p.source.title, p.pinpoint].filter(Boolean).join(", "));
      }
      const questions = await questionsFromPassages(input, passages, research.issues[0]?.situation ?? "");
      row.questions = questions.questions.map((q) => q.question);
    }
  } catch (error) {
    row.error = error instanceof Error ? error.message.slice(0, 120) : "error";
  }
  row.seconds = (Date.now() - t0) / 1000;
  return row;
}

async function main() {
  const index = loadCorpusIndex();
  if (!index) throw new Error("No built index.");
  const stories = COVERAGE_SET.filter((s) => ONLY.length === 0 || ONLY.some((prefix: string) => s.id.startsWith(prefix))).slice(0, LIMIT);
  const rows: Row[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (next < stories.length) {
        const story = stories[next++];
        const row = await runOne(story, index);
        rows.push(row);
        console.log(
          `${row.id}: court ${row.courtOk ? "ok" : `MISS (${row.classified})`}, research ${row.answered}/${row.issues}, ${row.questions.length} q, ${row.missing.length} missing, ${row.seconds.toFixed(0)}s${row.error ? ` ERROR ${row.error}` : ""}`,
        );
      }
    }),
  );
  rows.sort((a, b) => COVERAGE_SET.findIndex((s) => s.id === a.id) - COVERAGE_SET.findIndex((s) => s.id === b.id));

  const pct = (n: number, d: number) => (d === 0 ? "-" : `${Math.round((100 * n) / d)}%`);
  const lines: string[] = [];
  const inScope = rows.filter((r) => !r.outOfScope);
  const courts = ["small-claims", "civil", "family"];
  lines.push(`# Coverage: ${rows.length} stories`, "");
  lines.push("| Court | Stories | Court path right | Research questions answered | Stories with questions from the law | Stories naming a missing law |", "|---|---|---|---|---|---|");
  for (const court of courts) {
    const mine = inScope.filter((r) => r.court === court);
    const issues = mine.reduce((n, r) => n + r.issues, 0);
    const answered = mine.reduce((n, r) => n + r.answered, 0);
    lines.push(
      `| ${court} | ${mine.length} | ${pct(mine.filter((r) => r.courtOk).length, mine.length)} | ${pct(answered, issues)} (${answered}/${issues}) | ${pct(mine.filter((r) => r.questions.length > 0).length, mine.length)} | ${mine.filter((r) => r.missing.length > 0).length} |`,
    );
  }
  const oos = rows.filter((r) => r.outOfScope);
  lines.push(`| belongs elsewhere | ${oos.length} | ${pct(oos.filter((r) => r.courtOk).length, oos.length)} | - | - | - |`, "");

  const missingCount = new Map<string, number>();
  for (const row of rows) for (const name of row.missing) missingCount.set(name, (missingCount.get(name) ?? 0) + 1);
  lines.push("## Laws the research said the library lacks", "");
  lines.push(...([...missingCount.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `- ${name} (${n})`) || []), "");
  if (missingCount.size === 0) lines.push("- none", "");

  lines.push("## Court path misses", "");
  for (const row of rows.filter((r) => !r.courtOk)) lines.push(`- ${row.id}: got ${row.classified || "nothing"}, want ${row.expect.join(" or ")}`);
  lines.push("");

  lines.push("## Weakest research (fewer than half the questions answered, or no questions from the law)", "");
  for (const row of inScope.filter((r) => r.issues === 0 || r.answered / r.issues < 0.5 || r.questions.length === 0)) {
    lines.push(`- ${row.id} (${row.area}): ${row.answered}/${row.issues} answered, ${row.questions.length} questions${row.skipped ? `, ${row.skipped}` : ""}${row.error ? `, error ${row.error}` : ""}`);
  }
  lines.push("");

  lines.push("## Every story", "");
  for (const row of rows) {
    lines.push(`### ${row.id} (${row.court}, ${row.area}${row.side ? `, ${row.side}` : ""}, ${row.seconds.toFixed(0)}s)`);
    lines.push(`- court path: ${row.classified}${row.courtOk ? "" : ` (want ${row.expect.join(" or ")})`}`);
    if (!row.outOfScope) {
      lines.push(`- research: ${row.answered}/${row.issues} answered${row.missing.length ? `; lacks: ${row.missing.join("; ")}` : ""}`);
      if (row.citations.length) lines.push(`- law found: ${row.citations.join(" · ")}`);
      for (const q of row.questions) lines.push(`  - Q: ${q}`);
    }
    lines.push("");
  }

  writeFileSync(path.join(process.cwd(), "coverage-report.md"), `${lines.join("\n")}\n`);
  writeFileSync(path.join(process.cwd(), "coverage.json"), `${JSON.stringify(rows, null, 2)}\n`);
  const all = inScope.reduce((n, r) => n + r.issues, 0);
  const ans = inScope.reduce((n, r) => n + r.answered, 0);
  console.log(
    `coverage: ${rows.length} stories; court path right ${pct(rows.filter((r) => r.courtOk).length, rows.length)}; research answered ${pct(ans, all)}; stories with questions ${pct(inScope.filter((r) => r.questions.length > 0).length, inScope.length)}; ${missingCount.size} missing laws named`,
  );
}

void main();
