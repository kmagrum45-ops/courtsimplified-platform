/**
 * Researches ONE question a person asks the Court Assistant, the way the
 * analysis researches their whole story: a lawyer's research questions for
 * it, a search of the library, a reading call that must quote what answers
 * each, code that checks every quote is in its passage, and a plain "our
 * library does not have this yet" (with a source request) where it is not.
 *
 * WHY (2026-10-05). The Court Assistant made no model call and used no law:
 * it assembled replies from hand-written blocks chosen by keyword, so a
 * question it had no block for got a general reply. The site owner asked for
 * the whole site to be ready for every kind of case. This gives every
 * question the law that answers it, in the law's own words.
 *
 * Narrower and faster than the story research: one or two research
 * questions, not six, and a shorter budget, because it runs per message.
 * What the reader sees is the provisions' own words and the verified quote
 * (findingsView.ts), never model wording about the law.
 *
 * Never throws. Asserted by `npm run test:assistant-law`.
 */

import { parseIssues, researchStory, type ResearchDeps, type ResearchIssue, type ResearchResult } from "./researchStory";
import type { RetrievalCourt } from "./storyRetrieval";

export const MAX_QUESTION_ISSUES = 2;
const QUESTION_RESEARCH_MS = 40_000;

export type QuestionInput = {
  question: string;
  /** The person's story, for context. Optional. */
  story?: string;
  courtPath: RetrievalCourt;
  side?: "plaintiff" | "defendant";
};

export const QUESTION_ISSUES_SYSTEM_PROMPT = `You are an experienced Ontario lawyer. A person with a legal matter has asked you a question. List the one or two questions you would look up in Ontario law to answer it accurately.

Rules:
- Research questions only. Never answer them.
- If they ask how their case will turn out, whether they will win, or what they should do, research the rule, test or procedure that governs that step instead. Never research a prediction.
- Leave out every name, address, date, amount and personal detail.
- For each question give 2 or 3 search phrases written the way Ontario legislation, court rules or an official guide would phrase it.
- Also describe their situation in one neutral line, with no personal details.

Return JSON: {"situation": "...", "issues": [{"question": "...", "queries": ["...", "..."]}]} with 1 or 2 issues.`;

/** What the issue call is shown. Exported for the suite. */
export function questionPrompt(input: QuestionInput): string {
  const context = (input.story ?? "").trim();
  return [
    `COURT: ${input.courtPath}.${input.side ? ` The person is the ${input.side === "plaintiff" ? "one bringing the matter" : "one responding to it"}.` : ""}`,
    `THEIR QUESTION: ${input.question.trim().slice(0, 1000)}`,
    context ? `WHAT THEY HAVE TOLD US ABOUT THEIR MATTER:\n${context.slice(0, 4000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The model's research questions, at most two. Pure; exported for the suite. */
export function parseQuestionIssues(content: unknown): ResearchIssue[] {
  return parseIssues(content).slice(0, MAX_QUESTION_ISSUES);
}

async function spotWithModel(input: QuestionInput): Promise<ResearchIssue[]> {
  const { withAiCallContext } = await import("../../audit/aiCallLog");
  const { createOpenAIClient } = await import("../openaiClient");
  const { modelParams } = await import("../aiModels");
  // Part of answering the person, audited with the analysis research it
  // mirrors, told apart by prompt version.
  const raw = await withAiCallContext({ callType: "small-claims-analysis" }, async () => {
    const client = createOpenAIClient();
    const response = await client.chat.completions.create({
      ...modelParams("standard", { effort: (process.env.AI_EFFORT_RESEARCH || "low") as "low", temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: QUESTION_ISSUES_SYSTEM_PROMPT },
        { role: "user", content: questionPrompt(input) },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  });
  return parseQuestionIssues(raw);
}

/** Research one question. Always resolves; never throws. */
export async function researchQuestion(
  input: QuestionInput,
  deps: ResearchDeps & { spotQuestion?: (input: QuestionInput) => Promise<ResearchIssue[]> } = {},
): Promise<ResearchResult> {
  const spot = deps.spotQuestion ?? spotWithModel;
  // researchStory reads `story` only through spotIssues, which is replaced
  // here; the question stands in for it so its length check passes on a
  // short question with no story.
  const story = `${input.question}\n\n${input.story ?? ""}`.trim().padEnd(20, " ");
  return researchStory(
    { story, courtPath: input.courtPath, ...(input.side ? { side: input.side } : {}) },
    {
      ...deps,
      timeoutMs: deps.timeoutMs ?? QUESTION_RESEARCH_MS,
      spotIssues: async () => spot(input),
    },
  );
}
