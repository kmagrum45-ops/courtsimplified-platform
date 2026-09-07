/**
 * Session 15 -- Tier 2 field help for the Small Claims static form
 * (SmallClaimsIntake.tsx). A single narrow function: a fixed question's
 * text/why -> a short plain-language explanation, or null on any failure.
 *
 * Deliberately takes ONLY `question` (its text/why) and `apiKey` -- no
 * facts, no other form field values, no story text. That is enforced by
 * this function's signature, not by a prompt instruction: there is no
 * parameter through which a caller could pass the user's other answers,
 * so this function has no way to reference or characterize them even if
 * something upstream tried. This explains the fixed question, never the
 * user's situation -- same "who does the applying" boundary as the rest
 * of this directory.
 *
 * Reuses voiceLayer.ts's validateVoiceLayerOutput() unchanged -- same
 * banned-term guardrail, no new validator. Same fallback philosophy as
 * composeVoiceTurn(): bounded by a timeout, never throws, and any failure
 * (timeout, API error, empty response, validator rejection) resolves to
 * null so the caller shows nothing extra rather than a broken state.
 */

import OpenAI from "openai";
import { validateVoiceLayerOutput } from "./voiceLayer";
import type { IntakeQuestion } from "./questionBank";

export type ExplainableQuestion = Pick<IntakeQuestion, "text" | "why">;

export type ExplainQuestionResult = {
  explanation: string;
};

const SYSTEM_PROMPT = `You explain a single fixed legal-intake question in plain, short language, 2-4 sentences.

You are given ONLY that question's fixed text and (if present) why it's being asked. You are NOT given anything about any specific person's situation -- because none was provided, never invent or assume any.

Rules:
1. Explain what the question is asking and why it's being asked, using ONLY the text and "why it's being asked" you were given. Never add a new legal rule, deadline, dollar amount, or fact that isn't already present in what you were given.
2. Never characterize any person's situation (no "your case", no assuming facts about anyone), never evaluate anything (no "strong"/"weak"/"good"), never predict an outcome, never advise what someone should do.
3. Plain, warm, clear language, as if explaining to someone unfamiliar with courts -- not legal jargon.

Return only the explanation text. No JSON, no quotation marks, no extra commentary.`;

function buildUserPrompt(question: ExplainableQuestion): string {
  const whyText = question.why ? `\nWhy this is being asked: ${question.why}` : "";
  return `Question: "${question.text}"${whyText}`;
}

async function generateWithTimeout(
  client: OpenAI,
  userPrompt: string,
  timeoutMs: number,
): Promise<string | null> {
  const request = client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  const response = await Promise.race([request, timeout]);
  if (!response) return null;
  return response.choices[0]?.message?.content?.trim() || null;
}

/**
 * One bounded OpenAI call: a fixed question's text/why -> a short
 * plain-language explanation, or null on any failure (timeout, API
 * error, empty response, validator rejection). Never throws.
 */
export async function explainQuestionForUser(
  question: ExplainableQuestion,
  apiKey: string,
  timeoutMs = 8000,
): Promise<ExplainQuestionResult | null> {
  try {
    const client = new OpenAI({ apiKey });
    const generated = await generateWithTimeout(client, buildUserPrompt(question), timeoutMs);

    if (!generated) {
      console.error("[explainQuestion] no output (empty response or timeout)");
      return null;
    }

    const validation = validateVoiceLayerOutput(generated);
    if (!validation.valid) {
      console.error(
        `[explainQuestion] validator rejected generated explanation (matched term "${validation.matchedTerm}"): ${generated}`,
      );
      return null;
    }

    return { explanation: generated };
  } catch (error) {
    console.error(
      `[explainQuestion] generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
