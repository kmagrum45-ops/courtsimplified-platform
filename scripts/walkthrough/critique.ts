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
type Verdict = { findings: Finding[]; overall: string };

const CATEGORIES = [
  "echo — the user's own words pasted back instead of organized or summarized",
  "typo-kept — the user's spelling or grammar mistakes shown back to them",
  "not-their-case — information for a different issue, court, side or stage than this persona's",
  "wrong-side — speaks to the user as if they were on the other side",
  "contradiction — two places say conflicting things",
  "jargon — internal or system wording (e.g. 'canonical', 'routed as', 'Unified Analysis'), unexplained legal terms, or a citation list with no plain explanation",
  "advice — applies the law to this user's facts, grades their case, predicts an outcome, or tells them what to choose",
  "missing — something this user plainly needs on this page and does not get (for example, a served person's time to respond)",
  "repetition — the same content shown more than once",
  "broken — an error, a placeholder, an empty section, or a page that failed",
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
- The site gives legal INFORMATION, never advice. Do not suggest fixes that would make it assess the case or tell the user what to do; suggest information-style fixes.
- Judge only what is on the pages. Do not invent problems. Text inside site navigation, footers or legal notices is fine unless it is wrong.
- Showing the user's own words for them to CHECK is fine when it is labelled as their words; it is an 'echo' problem when the page presents pasted text as if it were analysis or a summary.

Return JSON: {"findings": [...], "overall": "<3-5 sentences: how well these pages serve this persona, and the most important improvements>"}`;

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
  return {
    findings: Array.isArray(parsed.findings) ? (parsed.findings as Finding[]) : [],
    overall: typeof parsed.overall === "string" ? parsed.overall : "",
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
