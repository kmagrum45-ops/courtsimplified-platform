/**
 * AI fallback for claim-type matching -- built after tonight's survey
 * (commit f034748) found that claimTypeMatcher.ts's exact-substring
 * matching, even after broadening every claim type's `signals` list,
 * still fails on most fresh, naturally-phrased user stories (0/19 claim
 * types reliably matched a held-out paraphrase set). That's an
 * architectural ceiling on exact-substring matching, not a signals-
 * completeness problem -- closing it needs a model that can recognize
 * paraphrasing, not more hand-written phrases.
 *
 * Same shape as safetyPass.ts/extractIntakeFacts.ts: one OpenAI call,
 * gpt-4o-mini, temperature 0, structured JSON response. The model's job
 * is classification ONLY, against a closed list -- it never characterizes
 * the legal situation, never explains why it picked an id, and never
 * writes anything the user sees directly (the caller looks up the
 * matched ClaimType's own already-sourced `name` for that). Enforced two
 * ways, not just by instruction: (1) an OpenAI structured-output JSON
 * schema whose `claimTypeId` property is a strict `enum` of exactly the
 * given claim types' ids plus "none" -- the API rejects any other value
 * before it reaches this code; (2) this function re-validates the
 * response against that same set anyway (same "fail closed, don't trust
 * a single layer" posture as safetyPass.ts's isValidClassification), in
 * case a future SDK/model change makes strict mode advisory rather than
 * enforced. Either layer alone should already make fabricating a new id
 * or returning free-form legal characterization impossible; both
 * together is redundant by design.
 *
 * Does NOT decide which claim type is "the" match for a story by itself
 * -- see orchestrateIntakeTurn.ts and app/api/intake/classify-claim-type/
 * route.ts for how a suggestion from here stays unconfirmed (not written
 * into matchedClaimTypes, not fed into evidenceGuidance/claimGuidance)
 * until the user explicitly confirms it. Suggest-never-decide, same
 * pattern as everywhere else in this codebase that shows an AI-generated
 * suggestion (app/forms/page.tsx's verified form confirmation, Tier 3
 * deadline confirmations).
 */

import OpenAI from "openai";
import type { ClaimType } from "./claimTypes";

export type ClaimTypeAiSuggestion = {
  claimTypeId: string;
  claimTypeName: string;
};

const NONE_VALUE = "none";

/**
 * One short line per claim type: id, name, and (reusing existing
 * `signals` data rather than authoring new descriptive text -- signals
 * are themselves annotated "No AI here -- just data" in claimTypes.ts,
 * so quoting a couple of them here introduces no new legal content) two
 * of its signal phrases as illustrative examples of the kind of story it
 * covers.
 */
function describeClaimType(claimType: ClaimType): string {
  const examples = claimType.signals.slice(0, 2).map((signal) => `"${signal}"`).join(", ");
  return `- ${claimType.id}: ${claimType.name}${examples ? ` (e.g., ${examples})` : ""}`;
}

function buildSystemPrompt(candidates: readonly ClaimType[]): string {
  const listing = candidates.map(describeClaimType).join("\n");
  return `You are a closed-list classifier for a legal self-help intake form covering Ontario Small Claims Court. Read the person's free-text story and decide which ONE claim type from the list below it most resembles -- or none, if nothing on the list fits.

You do not give legal advice, you do not decide whether the person has a valid case, and you do not describe or characterize their situation in your own words. You only pick from the closed list given to you. If the story could plausibly fit more than one, pick the single best fit. If it fits none of them well, or you are unsure, say "none" -- do not guess.

Claim types:
${listing}

Return a JSON object: {"claimTypeId": "<one of the ids above, exactly as written>" | "none"}. Never invent an id that is not in the list above.`;
}

function buildResponseSchema(candidates: readonly ClaimType[]) {
  const allowedIds = [...candidates.map((claimType) => claimType.id), NONE_VALUE];
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "claim_type_classification",
      strict: true,
      schema: {
        type: "object",
        properties: {
          claimTypeId: { type: "string", enum: allowedIds },
        },
        required: ["claimTypeId"],
        additionalProperties: false,
      },
    },
  };
}

/**
 * One OpenAI call: free text + a closed list of candidate claim types ->
 * a single claimTypeId from that list, or null ("none" / unparseable /
 * anything outside the list, all treated the same -- fail closed to "no
 * suggestion" rather than force a guess).
 *
 * `excludeIds` lets a caller ask again after the user says "not that
 * one" (see the classify-claim-type route) without re-offering the
 * rejected id -- the exclusion is enforced the same way as the main
 * list, via the schema enum, not just the prompt wording.
 */
export async function classifyClaimTypeWithAi(
  storyText: string,
  claimTypes: readonly ClaimType[],
  apiKey: string,
  excludeIds: readonly string[] = [],
): Promise<ClaimTypeAiSuggestion | null> {
  const excludeSet = new Set(excludeIds);
  const candidates = claimTypes.filter((claimType) => !excludeSet.has(claimType.id));
  if (candidates.length === 0) return null;

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: buildResponseSchema(candidates),
    messages: [
      { role: "system", content: buildSystemPrompt(candidates) },
      { role: "user", content: storyText },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const claimTypeId = typeof record.claimTypeId === "string" ? record.claimTypeId : NONE_VALUE;
  if (claimTypeId === NONE_VALUE) return null;

  const matched = candidates.find((claimType) => claimType.id === claimTypeId);
  return matched ? { claimTypeId: matched.id, claimTypeName: matched.name } : null;
}
