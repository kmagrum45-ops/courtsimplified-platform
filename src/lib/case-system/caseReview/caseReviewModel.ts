/**
 * The AI half of the case review. The model LOCATES; it does not write.
 *
 * It returns, for each thing worth checking, a fixed finding kind and the
 * exact words from the user's own record that the finding is about. Code then:
 *   - drops any kind not in AI_FINDING_KINDS;
 *   - drops any finding with the wrong number of quotes;
 *   - drops any quote that is not the user's own text (whitespace- and
 *     case-insensitive), or is too short or too long to be a real pointer;
 *   - words the finding with the fixed template from caseReview.ts.
 * A failed, malformed or unavailable model call yields no AI findings and the
 * deterministic findings still stand -- no fallback invents anything.
 *
 * Same verification as storyAnswerProposals.ts, which is the precedent this
 * follows: a claim about what the user said is only shown if the user's own
 * words are there to prove it.
 */

import { createOpenAIClient } from "../openaiClient";
import { withAiCallContext } from "../../audit/aiCallLog";
import {
  AI_FINDING_ARITY,
  AI_FINDING_KINDS,
  caseFileText,
  renderAiFinding,
  type AiFindingKind,
  type CaseReviewFinding,
  type ConfirmedCaseFile,
} from "./caseReview";

const MAX_AI_FINDINGS = 8;
const MIN_QUOTE = 3;
const MAX_QUOTE = 200;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure. The whole safety of the AI half lives here. */
export function validateCaseReviewOutput(raw: unknown, file: ConfirmedCaseFile): CaseReviewFinding[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { findings?: unknown }).findings;
  if (!Array.isArray(list)) return [];

  const haystack = normalize(caseFileText(file));
  const seen = new Set<string>();
  const kept: CaseReviewFinding[] = [];

  for (const item of list) {
    if (kept.length >= MAX_AI_FINDINGS) break;
    if (!item || typeof item !== "object") continue;
    const { kind, quotes } = item as { kind?: unknown; quotes?: unknown };
    if (typeof kind !== "string" || !(AI_FINDING_KINDS as string[]).includes(kind)) continue;
    const typedKind = kind as AiFindingKind;
    if (!Array.isArray(quotes) || quotes.length !== AI_FINDING_ARITY[typedKind]) continue;

    const clean = quotes.map((quote) => (typeof quote === "string" ? quote.trim() : ""));
    const allGrounded = clean.every(
      (quote) => quote.length >= MIN_QUOTE && quote.length <= MAX_QUOTE && haystack.includes(normalize(quote)),
    );
    if (!allGrounded) continue;
    if (typedKind === "entries-differ") {
      const [a, b] = clean.map(normalize);
      if (a === b || a.includes(b) || b.includes(a)) continue;
    }

    const key = `${typedKind}|${clean.map(normalize).sort().join("|")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    kept.push({
      id: `${typedKind}:ai:${kept.length}`,
      kind: typedKind,
      text: renderAiFinding(typedKind, clean),
      quotes: clean,
      aiLocated: true,
    });
  }

  return kept;
}

const SYSTEM_PROMPT = `You help a person keep their own court case file complete and consistent. You read what they wrote and point at places in THEIR OWN WORDS that are worth checking. You never give legal advice, never say whether they have a case, never judge who is right, and never write sentences for them.

Return findings of these kinds only:
- "document-mentioned": they mention something that a document, receipt, invoice, message, email or photo could show (a payment, a charge, a message sent, damage). One quote.
- "date-approximate": they give a date only roughly ("in march", "a few weeks later", "last summer"). One quote.
- "entries-differ": two things they wrote seem to disagree with each other (two different amounts for the same thing, two different dates for the same event). Two quotes.
- "unknown-amount-mentioned": they say an amount is not known yet ("not sure how much", "whatever is fair"). One quote.

Each quote must be words copied exactly, character for character, from what they wrote. Copy a short phrase (a few words), not a whole sentence. If nothing fits, return an empty list. Leaving something out is always safe.

Return JSON: {"findings": [{"kind": "...", "quotes": ["..."]}]}.`;

export async function locateCaseReviewFindings(
  file: ConfirmedCaseFile,
  apiKey: string,
): Promise<CaseReviewFinding[]> {
  const text = caseFileText(file);
  if (!text) return [];
  return withAiCallContext({ callType: "case-review" }, async () => {
    const client = createOpenAIClient(apiKey);
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `What they wrote:\n"""\n${text}\n"""` },
      ],
    });
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }
    return validateCaseReviewOutput(parsed, file);
  });
}
