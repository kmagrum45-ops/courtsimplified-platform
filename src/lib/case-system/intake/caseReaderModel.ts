/**
 * The case reader's model call (see caseReader.ts for what it is and why).
 * Server only. Everything it returns goes through validateCasePicture.
 */

import { createOpenAIClient } from "../openaiClient";
import { modelParams } from "../aiModels";
import { withAiCallContext } from "../../audit/aiCallLog";
import { allDateQuestions } from "../casePosition";
import { QUESTION_BANK } from "./questionBank";
import { CASE_EVENTS, EMPTY_PICTURE, validateCasePicture, type CasePicture } from "./caseReader";

const SYSTEM_PROMPT = `You read what a person has written about their own court matter in Ontario (Small Claims Court, the Superior Court, or a family court) and report what it SAYS -- like a careful legal assistant taking notes. You never give advice, never judge who is right or how the case will go, and never name a law, rule or form.

Report only what their words clearly say. Leaving something out is always safe; a wrong report is not. Every item must carry "quote": words copied exactly, character for character, from the PERSON's words (their story or their "A:" answers -- never a "Q:" line), short, showing where it comes from.

Return JSON:
{
  "side": {"value": "bringing" | "responding", "quote": "..."} or null,
  "events": [{"value": <event id>, "quote": "..."}],
  "dates": [{"questionId": <date question id>, "month": 1-12, "day": 1-31, "year": <four digits ONLY if the person wrote the year, else null>, "quote": "..."}],
  "amount": {"value": <number of dollars the person says is claimed or owed>, "quote": "..."} or null,
  "otherParty": {"value": "<who the case is with, in their words>", "quote": "..."} or null,
  "married": {"value": "yes" | "no", "quote": "..."} or null,
  "childTogether": {"value": "yes" | "no", "quote": "..."} or null
}

"side": bringing = they want to take someone to court or already did; responding = someone took them to court (they were sued, served, or the other person started the case).

Event ids (use only these, and only when their words describe it, in any wording):
${Object.entries(CASE_EVENTS)
  .map(([id, meaning]) => `- ${id}: ${meaning}`)
  .join("\n")}

Date question ids (report a date only for the moment the question asks about):
@@DATES@@

Never invent a year. If they wrote "November 20" with no year, return "year": null.`;

export async function readCase(
  personsWords: string,
  transcript: string,
  apiKey: string,
  options: { caseId?: string | null } = {},
): Promise<CasePicture> {
  if (!personsWords.trim()) return { ...EMPTY_PICTURE };
  return withAiCallContext({ callType: "case-reader", caseId: options.caseId ?? null }, async () => {
    const client = createOpenAIClient(apiKey);
    const dates = allDateQuestions()
      .map((question) => `- ${question.id}: ${question.question}`)
      .join("\n");
    const response = await client.chat.completions.create({
      ...modelParams("standard", { temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT.replace("@@DATES@@", dates) },
        { role: "user", content: `What the person has written:\n"""\n${transcript.slice(0, 12_000)}\n"""` },
      ],
    });
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }
    return validateCasePicture(parsed, personsWords);
  });
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/**
 * What the person has written on their case, read from the saved record --
 * never from the request, so nothing can be put in their mouth: the story
 * and the fields they typed, then each guided answer under the reviewed
 * question it answered (question text from the bank, by id). `personsWords`
 * is what every quote must come from; `transcript` is what the reader reads.
 */
export function caseWordsFrom(masterResult: unknown, story: string): { personsWords: string; transcript: string } {
  const master = asRecord(masterResult);
  const intake = asRecord(master.intakeData);
  const typed = ["goal", "urgent", "timeline", "evidence"]
    .map((key) => (typeof intake[key] === "string" ? (intake[key] as string).trim() : ""))
    .filter(Boolean);
  const answers = Array.isArray(master.intakeAnswers) ? master.intakeAnswers : [];
  const lines: string[] = [];
  const answerWords: string[] = [];
  for (const raw of answers.slice(-200)) {
    const answer = asRecord(raw);
    const text = typeof answer.answerText === "string" ? answer.answerText.trim() : "";
    if (!text) continue;
    const question = QUESTION_BANK.find((item) => item.id === answer.questionId);
    lines.push(`Q: ${question?.text ?? "(a question)"}\nA: ${text}`);
    answerWords.push(text);
  }
  const personsWords = [story.trim(), ...typed, ...answerWords].filter(Boolean).join("\n");
  const transcript = [story.trim(), ...typed, ...lines].filter(Boolean).join("\n\n");
  return { personsWords, transcript };
}
