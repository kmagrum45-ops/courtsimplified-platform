/**
 * Voice layer -- phase 4 of docs/AI_INTAKE_DESIGN.md ("composes a
 * conversational restatement and transition around a question, but the
 * question text and question choices always come from the fixed bank --
 * the voice layer can rephrase around them, never replace them. A
 * validator blocks legal characterization, evaluation, prediction, or
 * advice in the voice layer's output; on validation failure, intake falls
 * back to the plain reviewed question text. Intake must never block on
 * the voice layer -- if it's slow, errors, or fails validation, the user
 * still gets the question.")
 *
 * This file is that phase's entire implementation. It does not select
 * questions (selectQuestions.ts owns that, untouched, called by the proof
 * script, not by this file) and it does not alter question text -- the
 * model is instructed never to repeat or rewrite the question, and even
 * if it tried, composeVoiceTurn() always returns question.text verbatim
 * as a separate field, never something the model produced.
 *
 * The validator is pure and deterministic -- no AI, no network, runs on
 * every generated lead-in with no exceptions. Its term list is
 * deliberately small and extensible, not exhaustive: it's the same
 * "narrow now, expand deliberately" posture as questionBank.ts's
 * KNOWN_FACT_FIELDS, not a claim that this list catches everything a
 * model could ever generate.
 */

import OpenAI from "openai";
import { createOpenAIClient, withAbortableTimeout } from "../openaiClient";
import type { IntakeQuestion } from "./questionBank";
import type { IntakeFacts } from "./selectQuestions";

export type VoiceTurn = {
  /** The generated lead-in, or null if generation/validation failed and the plain question text is used alone. */
  leadIn: string | null;
  /** The fixed question text, verbatim from questionBank.ts -- never model output. */
  questionText: string;
  /** True whenever leadIn is null -- validation failed, generation failed, or generation timed out. */
  fellBackToPlainText: boolean;
};

// Deliberately small and extensible, not exhaustive -- see file header.
const BLOCKED_TERMS = [
  // legal characterization
  "harassment",
  "negligence",
  "wrongful",
  "breach",
  "entitled",
  "liable",
  "valid claim",
  // evaluation
  "strong",
  "weak",
  "good case",
  "should win",
  // predictive
  "will win",
  "court will",
];

/**
 * Pure, deterministic, no AI. Runs on every generated lead-in before it's
 * ever shown to anyone.
 */
export function validateVoiceLayerOutput(text: string): { valid: boolean; matchedTerm?: string } {
  const lower = text.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { valid: false, matchedTerm: term };
    }
  }
  return { valid: true };
}

const SYSTEM_PROMPT = `You write a short, warm lead-in for a legal intake conversation, 1-3 sentences.

You are given the facts the user has already told us, the next question that needs to be asked (for context only), and sometimes a short excerpt of something the user said in their own words that carried real feeling.

Rules:
1. Restate ONLY what is in the facts you were given, in plain natural language. Never add, infer, or assume anything that isn't explicitly present in those facts. If no facts are given yet, don't invent any -- just write a brief, neutral opener.
2. If a "user's own words" excerpt is given, you may briefly and warmly acknowledge the feeling it expresses (e.g. frustration, disappointment) in your own words -- but do NOT amplify it, escalate it, add drama, or turn it into a legal characterization of the situation. One short, plain acknowledgment at most. Never invent a feeling the excerpt doesn't actually contain, and never treat the excerpt as a source of new facts about what happened.
3. Transition naturally toward the next question, but do NOT repeat, paraphrase, or rewrite the question itself -- it will be shown separately, verbatim, right after your lead-in. Never include the question text in your response.
4. Never characterize the legal or factual situation (no words like negligence, wrongful, breach, harassment, entitled, liable, valid claim), never evaluate it (no "strong", "weak", "good case"), never predict an outcome (no "will win", "court will").
5. You do not give advice and you do not decide anything -- you only restate, acknowledge tone if given, and transition.

Return only the lead-in text. No JSON, no question, no extra commentary, no quotation marks around it.`;

function buildUserPrompt(facts: IntakeFacts, question: IntakeQuestion, userStatedTone?: string): string {
  const factsText = Object.keys(facts).length > 0 ? JSON.stringify(facts) : "(no facts known yet)";
  const whyText = question.why ? `\nWhy this question matters: ${question.why}` : "";
  const toneText = userStatedTone
    ? `\n\nSomething the user said in their own words, which carried real feeling: "${userStatedTone}"`
    : "";
  return (
    `Facts the user has already told us: ${factsText}${toneText}\n\n` +
    `Next question to ask (for context only -- do not repeat or rewrite it): "${question.text}"${whyText}`
  );
}

async function generateWithTimeout(
  client: OpenAI,
  userPrompt: string,
  timeoutMs: number,
): Promise<string | null> {
  // Previously a Promise.race against a bare setTimeout. That abandoned the
  // response but not the request: on timeout the call kept running, billed and
  // unobserved. withAbortableTimeout cancels it. See openaiClient.ts.
  const response = await withAbortableTimeout(
    (signal) =>
      client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        },
        { signal },
      ),
    timeoutMs,
  );

  if (!response) return null;
  return response.choices[0]?.message?.content?.trim() || null;
}

export type ComposeVoiceTurnOptions = {
  /**
   * A short excerpt of something the user said in their own words that
   * carried real feeling (frustration, disappointment, etc.). NOT a new
   * fact -- selectQuestions.ts's IntakeFacts has no field for tone, and
   * this parameter is not one either. It exists solely so the model can
   * briefly acknowledge stated feeling without amplifying or
   * characterizing it (see SYSTEM_PROMPT rule 2). Omit when there's
   * nothing like this to acknowledge.
   */
  userStatedTone?: string;
  timeoutMs?: number;
};

/**
 * One OpenAI call, bounded by a timeout: (facts, next question) -> a
 * VoiceTurn. Never throws, never blocks intake -- any failure (timeout,
 * API error, empty response, validator rejection) resolves to
 * fellBackToPlainText: true rather than propagating an error, and is
 * logged internally only, never surfaced to the user as an error.
 */
export async function composeVoiceTurn(
  facts: IntakeFacts,
  question: IntakeQuestion,
  apiKey: string,
  options: ComposeVoiceTurnOptions = {},
): Promise<VoiceTurn> {
  const { userStatedTone, timeoutMs = 8000 } = options;
  try {
    const client = createOpenAIClient(apiKey);
    const generated = await generateWithTimeout(client, buildUserPrompt(facts, question, userStatedTone), timeoutMs);

    if (generated) {
      const validation = validateVoiceLayerOutput(generated);
      if (validation.valid) {
        return { leadIn: generated, questionText: question.text, fellBackToPlainText: false };
      }
      console.error(
        `[voiceLayer] validator rejected generated lead-in for question "${question.id}" ` +
          `(matched term "${validation.matchedTerm}"): ${generated}`,
      );
    } else {
      console.error(`[voiceLayer] no output for question "${question.id}" (empty response or timeout)`);
    }
  } catch (error) {
    console.error(
      `[voiceLayer] generation failed for question "${question.id}": ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  return { leadIn: null, questionText: question.text, fellBackToPlainText: true };
}
