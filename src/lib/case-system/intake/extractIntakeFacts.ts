/**
 * Minimal fact-extraction proof -- seed of phase 2 in
 * docs/AI_INTAKE_DESIGN.md ("Fact extraction (AI): free text -> structured
 * facts, shown back to the user for confirmation"). This is the extraction
 * half only: one OpenAI call, no confirmation UI, no safety pass. Built for
 * Session 3's single end-to-end proof (unpaid debt / non-payment for
 * services) -- not wired into any live route.
 *
 * Deliberately narrow: extracts only the fields in questionBank.ts's
 * KNOWN_FACT_FIELDS, nothing else. No legal reasoning, no case-strength
 * language -- pure fact pulling, same "who does the applying" boundary as
 * the rest of this directory (the model reports what the story says, it
 * doesn't characterize whether the story satisfies anything).
 *
 * Claim-type matching is NOT done here. claimTypes.ts's `signals` field is
 * explicitly "No AI here -- just data" -- matching against it is a plain
 * keyword step, kept separate (see scripts/proofs/), not folded into this
 * AI call.
 */

import OpenAI from "openai";
import { KNOWN_FACT_FIELDS, type KnownFactField } from "./questionBank";
import type { IntakeFacts } from "./selectQuestions";

const SYSTEM_PROMPT = `You extract structured facts from a short first-person story about a legal dispute. You do not give legal advice, characterize the dispute legally, or judge who is right. You only report what the story states or clearly implies.

Return a JSON object with ONLY these fields, omitting any you cannot determine from the text:
- "role": "plaintiff" if the narrator is the one bringing/considering a claim, "defendant" if they are responding to one.
- "disputeCategory": a short lowercase-hyphenated slug for the kind of dispute, if clear (e.g. "work-or-services", "defamation"). Omit if unclear.
- "claimFiled": true or false, only if the story explicitly says whether a court claim/Plaintiff's Claim has been filed. Omit if not mentioned.
- "claimServed": true or false, only if the story explicitly addresses service on the other party. Omit if not mentioned.
- "defenceFiled": true or false, only if the story explicitly addresses whether the other side filed a Defence. Omit if not mentioned.
- "twentyDaysElapsed": true or false, only if the story gives enough detail to know whether 20 days have passed since service. Omit if not mentioned.

Do not guess at fields the story doesn't address -- omit them rather than assume. Return only the JSON object, no other text.`;

function isKnownField(key: string): key is KnownFactField {
  return (KNOWN_FACT_FIELDS as readonly string[]).includes(key);
}

function sanitize(raw: unknown): IntakeFacts {
  const facts: IntakeFacts = {};
  if (!raw || typeof raw !== "object") return facts;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isKnownField(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      facts[key] = value;
    }
  }
  return facts;
}

/**
 * One OpenAI call: free text -> IntakeFacts (a strict subset of
 * KNOWN_FACT_FIELDS). Any field the model returns outside that known set,
 * or with an unexpected type, is dropped rather than passed through --
 * selectQuestions.ts's FactCondition evaluation only ever looks up known
 * fields anyway, but this keeps the extraction boundary explicit.
 */
export async function extractIntakeFacts(storyText: string, apiKey: string): Promise<IntakeFacts> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: storyText },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }
  return sanitize(parsed);
}
