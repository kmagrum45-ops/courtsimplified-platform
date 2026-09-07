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

export type ExtractedFactsWithConfidence = {
  facts: IntakeFacts;
  /**
   * Which fields in `facts` were stated as a direct, confident assertion
   * (e.g. "I filed it last week," "I haven't served them yet") rather than
   * an incidental, hedged, or uncertain mention (e.g. "I was going to file
   * but haven't decided"). Always a subset of the keys present in `facts`.
   */
  directFields: KnownFactField[];
};

// Session 10. A separate sibling function, not a change to
// extractIntakeFacts()/SYSTEM_PROMPT above -- four existing proof scripts
// (Sessions 3, 4, 7, 9) call the plain function and expect IntakeFacts
// back directly; changing its shape would break all of them for no reason.
// This makes its own dedicated call rather than reusing the one above,
// which costs one extra call for a caller that wants both facts and
// confidence -- but orchestrateIntakeTurn.ts (the only real caller of
// this one) switches to calling ONLY this function instead of the plain
// one, so in practice it's still exactly one extraction call per turn,
// not two. The plain extractIntakeFacts() stays available, unchanged, for
// anything that doesn't need confidence.
const CONFIDENCE_SYSTEM_PROMPT = `You extract structured facts from a short first-person story about a legal dispute, and you flag which of those facts were stated as direct, confident assertions versus incidental or uncertain mentions. You do not give legal advice, characterize the dispute legally, or judge who is right. You only report what the story states or clearly implies.

Return a JSON object with exactly two top-level fields:

- "facts": an object with ONLY these keys, omitting any you cannot determine from the text:
  - "role": "plaintiff" if the narrator is the one bringing/considering a claim, "defendant" if they are responding to one.
  - "disputeCategory": a short lowercase-hyphenated slug for the kind of dispute, if clear (e.g. "work-or-services", "defamation"). Omit if unclear.
  - "claimFiled": true or false, only if the story explicitly says whether a court claim/Plaintiff's Claim has been filed. Omit if not mentioned.
  - "claimServed": true or false, only if the story explicitly addresses service on the other party. Omit if not mentioned.
  - "defenceFiled": true or false, only if the story explicitly addresses whether the other side filed a Defence. Omit if not mentioned.
  - "twentyDaysElapsed": true or false, only if the story gives enough detail to know whether 20 days have passed since service. Omit if not mentioned.
  Do not guess at fields the story doesn't address -- omit them rather than assume.

- "directFields": an array of field names, drawn only from the keys actually present in "facts", whose value was stated as a DIRECT, CONFIDENT assertion -- something the person clearly and definitely says happened, is true, or is not true, right now. Do NOT include a field here if the mention was incidental, hedged, uncertain, hypothetical, or about something merely being considered or not yet decided (e.g. "I was going to file but haven't decided," "I might serve them soon," "I think maybe"). A field can be present in "facts" without being in "directFields" if it's stated but not with that level of directness.

Return only the JSON object, no other text.`;

function sanitizeDirectFields(raw: unknown, facts: IntakeFacts): KnownFactField[] {
  if (!Array.isArray(raw)) return [];
  const presentKeys = new Set(Object.keys(facts));
  return raw.filter(
    (value): value is KnownFactField => typeof value === "string" && isKnownField(value) && presentKeys.has(value),
  );
}

/**
 * One OpenAI call: free text -> { facts, directFields }. Same extraction
 * boundary and sanitization as extractIntakeFacts() (reuses the same
 * sanitize() helper for the facts half), plus a per-field confidence flag
 * used by orchestrateIntakeTurn.ts to distinguish a genuine correction
 * from a casual mention that happens to conflict with an already-known
 * fact.
 */
export async function extractIntakeFactsWithConfidence(
  storyText: string,
  apiKey: string,
): Promise<ExtractedFactsWithConfidence> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CONFIDENCE_SYSTEM_PROMPT },
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

  const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const facts = sanitize(record.facts);
  const directFields = sanitizeDirectFields(record.directFields, facts);
  return { facts, directFields };
}
