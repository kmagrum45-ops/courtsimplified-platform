/**
 * The critic for the page walkthrough: reads what each page showed each
 * persona (walkthrough-output/<persona>.json, written by
 * tests/browser/walkthrough.spec.ts) and writes REPORT.md and PAGES.md.
 *
 * WHY. Site owner, 2026-10-04: "are you able to review what each page gives as
 * a response then critique it?" The critic is a reviewer, not a product
 * surface: nothing it writes reaches a user. It reads one persona's pages in
 * order, knows the persona's true facts, and reports problems a careful reader
 * would see — the user's words pasted back, their typos kept, information for a
 * different case, the wrong side, jargon, advice, a missing obvious next step.
 *
 * A review, not a gate: it exits 0 whatever it finds, and 1 only if it could
 * not run. Run: node --import tsx scripts/walkthrough/critique.ts
 */

import fs from "node:fs";
import path from "node:path";

import { createOpenAIClient } from "../../src/lib/case-system/openaiClient";
import { modelParams } from "../../src/lib/case-system/aiModels";

const OUT = path.resolve(process.cwd(), "walkthrough-output");
const PAGE_TEXT_LIMIT = 14_000;

type Step = { n: number; step: string; url: string; text: string; screenshot: string; note?: string };
type Run = {
  persona: { id: string; path: string; summary: string; story: string; expect: string[]; fields?: Record<string, string> };
  failure: string | null;
  /** Failed requests and page errors the run saw (walkthrough.spec.ts, 2026-10-08). */
  problems?: string[];
  steps: Step[];
};
type Finding = {
  step: string;
  category: string;
  severity: "high" | "medium" | "low";
  quote: string;
  problem: string;
  fix: string;
};
type Check = { result: "pass" | "fail" | "n/a"; why: string };
type Verdict = { findings: Finding[]; overall: string; finishLine?: Record<string, Check> };

const CATEGORIES = [
  "echo — the user's own words pasted back instead of organized or summarized",
  "typo-kept — the user's spelling or grammar mistakes shown back to them",
  "not-their-case — information for a different issue, court, side or stage than this persona's",
  "wrong-side — speaks to the user as if they were on the other side",
  "contradiction — two places say conflicting things",
  "jargon — internal or system wording (e.g. 'canonical', 'routed as', 'Unified Analysis'), unexplained legal terms, or a citation list with no plain explanation",
  "grading — says or suggests the case is strong or weak, predicts an outcome or what a judge will think, or pushes settlement (applying the law to the user's facts and naming their next step is expected, not a problem: CLAUDE.md s. 2, 2026-10-04)",
  "missing — something this user plainly needs on this page and does not get (for example, a served person's time to respond)",
  "repetition — the same content shown more than once",
  "broken — an error, a placeholder, an empty section, or a page that failed",
];

/** The beta finish line, docs/MASTER_PLAN.md, one check per line (2026-10-08). */
export const FINISH_LINE: [string, string][] = [
  ["nextForm", "The next-step card names the correct next form for this person's situation."],
  ["deadline", "A fixed period with a known date is counted to a date; a date already passed says so."],
  ["fileFeeService", "Where and how to file, the fee, and how to serve are shown."],
  ["noRepeat", "No fact the person already gave is asked again, on any page (including after going back or reloading, where the journey shows it)."],
  ["onTopic", "Nothing for the other side, another court or another kind of case sits above the fold of a page."],
  ["sourced", "Every legal statement shown carries its source (citation or official link)."],
  ["noGrading", "Nothing judges the case, predicts an outcome or pushes settlement."],
  ["limits", "Where the site cannot fully handle the case, it says so and points to help."],
  ["conversation", "The guided conversation acknowledges what the person said, asks one question at a time, says why a question matters when that is not obvious, and answers their questions in plain words."],
];

const SYSTEM_PROMPT = `You are reviewing CourtSimplified, an Ontario legal-information website for people without a lawyer. You are given ONE persona's journey: the true facts about them, and the visible text of each page they saw, in order.

Review every page as a careful, demanding reader who knows this persona's real situation. Report each specific problem with:
- step: the step name it appears on
- category: exactly one of: ${CATEGORIES.map((c) => c.split(" — ")[0]).join(", ")}
- severity: high (misleads, wrong side/case, or blocks the user), medium (confusing, unhelpful, or noisy), low (polish)
- quote: the exact words from the page (short)
- problem: what is wrong, in one sentence
- fix: what the page should do instead, in one sentence

Category meanings:
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

Rules for you:
- The site guides like a lawyer: it SHOULD apply the law to this person's facts, name the court, form, rule, deadline and next step. It must NEVER grade the case or predict the outcome. Never suggest a fix that grades the case.
- Judge only what is on the pages. Do not invent problems. Text inside site navigation, footers or legal notices is fine unless it is wrong.
- Showing the user's own words for them to CHECK is fine when it is labelled as their words; it is an 'echo' problem when the page presents pasted text as if it were analysis or a summary.

Also score the journey against the beta FINISH LINE (docs/MASTER_PLAN.md). For each check give "pass", "fail" or "n/a" (only when the journey never reaches what the check needs) and a one-sentence reason quoting the page where you can:
${FINISH_LINE.map(([id, text]) => `- ${id}: ${text}`).join("\n")}

Return JSON: {"findings": [...], "finishLine": {${FINISH_LINE.map(([id]) => `"${id}": {"result": "pass|fail|n/a", "why": "..."}`).join(", ")}}, "overall": "<3-5 sentences: how well these pages serve this persona, and the most important improvements>"}`;

function describeRun(run: Run): string {
  const facts = [
    `Persona: ${run.persona.id} (${run.persona.path})`,
    `Who they are: ${run.persona.summary}`,
    `What they typed as their story: """${run.persona.story}"""`,
    run.persona.fields ? `Other things they typed: ${JSON.stringify(run.persona.fields)}` : "",
    `True facts a reader must be able to rely on:\n${run.persona.expect.map((e) => `- ${e}`).join("\n")}`,
    run.failure ? `The run FAILED at the last step: ${run.failure}` : "",
  ].filter(Boolean);
  const pages = run.steps.map(
    (step) =>
      `=== STEP ${step.n}: ${step.step} (${step.url}) ===\n${step.text.slice(0, PAGE_TEXT_LIMIT)}${
        step.text.length > PAGE_TEXT_LIMIT ? "\n[... page text truncated ...]" : ""
      }`,
  );
  return `${facts.join("\n\n")}\n\n${pages.join("\n\n")}`;
}

async function critique(run: Run, apiKey: string): Promise<Verdict> {
  const client = createOpenAIClient(apiKey);
  const response = await client.chat.completions.create({
    ...modelParams("deep", { temperature: 0 }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: describeRun(run) },
    ],
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as Partial<Verdict>;
  const finishLine: Record<string, Check> = {};
  for (const [id] of FINISH_LINE) {
    const item = (parsed.finishLine as Record<string, Partial<Check>> | undefined)?.[id];
    const result = item?.result === "pass" || item?.result === "fail" || item?.result === "n/a" ? item.result : "n/a";
    finishLine[id] = { result, why: typeof item?.why === "string" ? item.why : "not scored" };
  }
  return {
    findings: Array.isArray(parsed.findings) ? (parsed.findings as Finding[]) : [],
    overall: typeof parsed.overall === "string" ? parsed.overall : "",
    finishLine,
  };
}

const order = { high: 0, medium: 1, low: 2 } as const;

async function main(): Promise<void> {
  if (!fs.existsSync(OUT)) throw new Error("walkthrough-output/ not found; run the walkthrough spec first.");
  const runs = fs
    .readdirSync(OUT)
    .filter((file) => file.endsWith(".json") && file !== "critique.json")
    .map((file) => JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8")) as Run)
    .sort((a, b) => a.persona.id.localeCompare(b.persona.id));
  if (runs.length === 0) throw new Error("no persona results in walkthrough-output/.");

  const apiKey = process.env.OPENAI_API_KEY;
  const verdicts: Record<string, Verdict> = {};
  for (const run of runs) {
    if (!apiKey) {
      verdicts[run.persona.id] = { findings: [], overall: "Not reviewed: OPENAI_API_KEY is not set." };
      continue;
    }
    try {
      verdicts[run.persona.id] = await critique(run, apiKey);
    } catch (error) {
      verdicts[run.persona.id] = {
        findings: [],
        overall: `Not reviewed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    console.log(`${run.persona.id}: ${verdicts[run.persona.id].findings.length} finding(s)`);
  }

  const report: string[] = [
    "# Page walkthrough — critic report",
    "",
    `Generated ${new Date().toISOString()} by \`scripts/walkthrough/critique.ts\` from \`tests/browser/walkthrough.spec.ts\`. Every persona is fabricated. Full page text is in PAGES.md; screenshots are alongside.`,
    "",
    "| Persona | Got through | High | Medium | Low |",
    "|---|---|---|---|---|",
  ];
  for (const run of runs) {
    const f = verdicts[run.persona.id].findings;
    const count = (s: string) => f.filter((x) => x.severity === s).length;
    report.push(`| ${run.persona.id} | ${run.failure ? `no — ${run.failure.slice(0, 80)}` : "yes"} | ${count("high")} | ${count("medium")} | ${count("low")} |`);
  }
  for (const run of runs) {
    const verdict = verdicts[run.persona.id];
    report.push("", `## ${run.persona.id}`, "", `*${run.persona.summary}*`, "", verdict.overall, "");
    for (const finding of [...verdict.findings].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))) {
      report.push(
        `- **${finding.severity}** · ${finding.category} · step \`${finding.step}\` — ${finding.problem}`,
        `  - Page says: "${String(finding.quote).replace(/\s+/g, " ").slice(0, 300)}"`,
        `  - Fix: ${finding.fix}`,
      );
    }
  }

  const pages: string[] = ["# Page walkthrough — what each page showed", ""];
  for (const run of runs) {
    pages.push(`## ${run.persona.id}`, "", `*${run.persona.summary}*`, "");
    for (const step of run.steps) {
      pages.push(`### ${step.n}. ${step.step}`, "", `\`${step.url}\` · screenshot \`${step.screenshot}\`${step.note ? ` · ${step.note}` : ""}`, "", "```text", step.text, "```", "");
    }
  }

  // The finish line, case by case (docs/MASTER_PLAN.md): every check must pass
  // for every case. A failed run fails every check it did not reach.
  const line: string[] = [
    "# Beta finish line — case by case",
    "",
    "From the page walkthrough (20 fabricated cases) and the critic. pass / FAIL / n/a (the journey never reached what the check needs). Checks: docs/MASTER_PLAN.md.",
    "",
    `| Case | ${FINISH_LINE.map(([id]) => id).join(" | ")} |`,
    `|---|${FINISH_LINE.map(() => "---").join("|")}|`,
  ];
  const totals: Record<string, { pass: number; fail: number }> = Object.fromEntries(FINISH_LINE.map(([id]) => [id, { pass: 0, fail: 0 }]));
  for (const run of runs) {
    const scored = verdicts[run.persona.id].finishLine ?? {};
    const cells = FINISH_LINE.map(([id]) => {
      const result = run.failure ? "fail" : (scored[id]?.result ?? "n/a");
      if (result === "pass") totals[id].pass += 1;
      if (result === "fail") totals[id].fail += 1;
      return result === "fail" ? "**FAIL**" : result;
    });
    line.push(`| ${run.persona.id} | ${cells.join(" | ")} |`);
  }
  line.push(`| **passed / failed** | ${FINISH_LINE.map(([id]) => `${totals[id].pass} / ${totals[id].fail}`).join(" | ")} |`, "", "## Why each check failed", "");
  for (const run of runs) {
    const scored = verdicts[run.persona.id].finishLine ?? {};
    const failed = FINISH_LINE.filter(([id]) => scored[id]?.result === "fail");
    if (run.failure) {
      line.push(`- **${run.persona.id}**: the run did not finish (${run.failure.slice(0, 160)})`);
      for (const problem of (run.problems ?? []).slice(-5)) line.push(`  - seen: \`${problem.replace(/`/g, "'").slice(0, 240)}\``);
    }
    for (const [id] of failed) line.push(`- **${run.persona.id}** · ${id}: ${scored[id].why}`);
  }
  fs.writeFileSync(path.join(OUT, "FINISH_LINE.md"), `${line.join("\n")}\n`);

  fs.writeFileSync(path.join(OUT, "REPORT.md"), `${report.join("\n")}\n`);
  fs.writeFileSync(path.join(OUT, "PAGES.md"), `${pages.join("\n")}\n`);
  fs.writeFileSync(path.join(OUT, "critique.json"), JSON.stringify(verdicts, null, 2));
  console.log(`Wrote ${path.join(OUT, "REPORT.md")} and PAGES.md`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  // Job logs are not readable from the agent workspace; an annotation is.
  // Error text only -- never page text or anything a persona typed.
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Critic::${message.replace(/\r?\n/g, " ").slice(0, 300)}`);
  process.exit(1);
});
