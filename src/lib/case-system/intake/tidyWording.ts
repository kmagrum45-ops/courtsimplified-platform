/**
 * Suggested clean-up of what the user typed — spelling, capitals, punctuation,
 * grammar — shown side by side for the user to accept or keep their own.
 *
 * WHY THIS EXISTS (site owner, 2026-10-04): "if the user makes spelling
 * mistakes, they stay". Every surface downstream — the case summary, the draft,
 * the affidavit sections — reproduces the user's text, so a typo typed once
 * appeared on every page. Reproducing the user's words is deliberate (the
 * platform must never put words in their mouth), so the fix is not to rewrite
 * silently: it is to OFFER a corrected version and let them choose
 * (CLAUDE.md §4).
 *
 * WHAT THE MODEL MAY DO: fix spelling, capitals, punctuation and grammar, and
 * break run-on text into sentences. Nothing else.
 *
 * WHAT CODE CHECKS, because a model asked to tidy can drift into rewording:
 *   1. every number in the original (ages, dates, amounts, times) is still
 *      there, and no new number appears;
 *   2. every passage the user put in quotation marks is unchanged;
 *   3. no capitalised name appears that was not in the original (no invented
 *      people or places);
 *   4. no legal term is added that the user did not use (custody, support,
 *      respondent, ...) — adding one would be the system characterising their
 *      facts;
 *   5. the length stays within a sane band of the original.
 * A suggestion failing any check is dropped; the user's text simply stays.
 */

import { createOpenAIClient } from "../openaiClient";
import { modelParams } from "../aiModels";
import { withAiCallContext } from "../../audit/aiCallLog";

export const MAX_TIDY_FIELDS = 20;
export const MAX_TIDY_FIELD_LENGTH = 4_000;
/** One request's total text. The client splits larger intakes into batches. */
export const MAX_TIDY_TOTAL_LENGTH = 12_000;

export type TidyField = { key: string; text: string };
export type TidySuggestion = { key: string; original: string; suggested: string };

const SYSTEM_PROMPT = `You correct the writing of a person describing their own family or court situation. They may be upset, writing fast, or writing in a second language.

For each field you are given, return the same text with ONLY these fixes:
- spelling mistakes and typos
- capital letters (start of sentences, "I", names already given)
- punctuation, and splitting run-on text into clear sentences
- small grammar fixes (verb agreement, missing small words like "a", "the", "to")

Rules you must never break:
- Keep the person's meaning, facts, order and point of view (keep "I", "me", "my").
- Never add a fact, detail, name, date, number, opinion or feeling that is not in the text.
- Never remove a fact.
- Keep every number, date, time and amount exactly as written.
- Keep anything inside quotation marks exactly as written, mistakes included.
- Never add legal words the person did not use (for example custody, access, support, applicant, respondent, claim, order, negligence).
- Do not make it formal or fancy. Plain, everyday words, like the person's own.
- If a field is already correct, return it unchanged.

Return JSON: {"fields": [{"key": "<key>", "text": "<corrected text>"}]} with one entry per field given, same keys.`;

const LEGAL_TERMS = [
  "custody",
  "access",
  "support",
  "applicant",
  "respondent",
  "plaintiff",
  "defendant",
  "claim",
  "order",
  "motion",
  "affidavit",
  "negligence",
  "breach",
  "decision-making",
  "parenting time",
  "equalization",
  "arrears",
  "damages",
  "liable",
  "liability",
];

const numberTokens = (text: string) => (text.match(/\d+(?:[.,:/-]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ""));
const quotedPassages = (text: string) =>
  (text.match(/"[^"]{2,}"|“[^”]{2,}”/g) ?? []).map((q) => q.slice(1, -1));

function capitalisedWords(text: string): Set<string> {
  const words = new Set<string>();
  // Skip the first word of each sentence, and "I".
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const tokens = sentence.trim().split(/\s+/).slice(1);
    for (const token of tokens) {
      const word = token.replace(/[^A-Za-z'’-]/g, "");
      if (/^[A-Z]/.test(word) && word !== "I" && !/^I['’]/.test(word)) words.add(word.toLowerCase());
    }
  }
  return words;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * A capitalised word is "new" only if nothing the user wrote is a plausible
 * misspelling of it — "wednsday" -> "Wednesday" is a fix, not an invented name.
 */
function isNewName(name: string, originalWords: Set<string>): boolean {
  const allowed = Math.max(1, Math.floor(name.length / 4));
  for (const word of originalWords) {
    if (Math.abs(word.length - name.length) <= allowed && editDistance(word, name) <= allowed) return false;
  }
  return true;
}

const multiset = (items: string[]) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
};

/** Why a suggestion is not safe to offer, or null when it is. Exported for the suite. */
export function tidyRejectionReason(original: string, suggested: string): string | null {
  const before = multiset(numberTokens(original));
  const after = multiset(numberTokens(suggested));
  for (const [n, count] of before) if ((after.get(n) ?? 0) < count) return `number "${n}" was dropped or changed`;
  for (const [n, count] of after) if ((before.get(n) ?? 0) < count) return `number "${n}" was added`;

  const normalisedSuggestion = suggested.replace(/[“”]/g, '"');
  for (const quote of quotedPassages(original)) {
    if (!normalisedSuggestion.includes(quote)) return "a quoted passage was changed";
  }

  const originalLower = original.toLowerCase();
  const originalWords = new Set(originalLower.split(/[^a-z'’-]+/).filter(Boolean));
  for (const name of capitalisedWords(suggested)) {
    if (!originalLower.includes(name) && isNewName(name, originalWords)) return `name "${name}" was added`;
  }

  const suggestedLower = suggested.toLowerCase();
  for (const term of LEGAL_TERMS) {
    const pattern = new RegExp(`\\b${term}\\b`);
    if (!pattern.test(suggestedLower) || pattern.test(originalLower)) continue;
    // Correcting the user's own misspelling of the term is not adding it.
    // Walkthrough, 2026-10-04: "i was served a plaintifs claim" got NO
    // suggestions, because fixing "plaintifs" to "plaintiff's" read as the
    // site adding the legal word "plaintiff".
    // Long words only: a short one is a near-miss of ordinary words ("order"
    // and "older", "claim" and "clam"), and swapping those changes meaning.
    const misspelledByUser =
      term.length >= 7 && term.split(" ").every((part) => !isNewName(part, originalWords));
    if (!misspelledByUser) return `legal term "${term}" was added`;
  }

  const ratio = suggested.trim().length / Math.max(1, original.trim().length);
  if (ratio < 0.7 || ratio > 1.5) return "the length changed too much";
  return null;
}

/** Validates raw model output into suggestions worth showing. Pure; exported for the suite. */
export function validateTidyResponse(raw: unknown, fields: readonly TidyField[]): TidySuggestion[] {
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { fields?: unknown }).fields)
      ? ((raw as { fields: unknown[] }).fields as unknown[])
      : [];
  const byKey = new Map(fields.map((field) => [field.key, field.text]));
  const suggestions: TidySuggestion[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const { key, text } = entry as { key?: unknown; text?: unknown };
    if (typeof key !== "string" || typeof text !== "string" || seen.has(key)) continue;
    const original = byKey.get(key);
    if (original === undefined) continue;
    seen.add(key);
    const suggested = text.trim();
    if (!suggested || suggested === original.trim()) continue;
    if (tidyRejectionReason(original, suggested)) continue;
    suggestions.push({ key, original, suggested });
  }
  return suggestions;
}

export async function suggestTidyWording(
  fields: readonly TidyField[],
  apiKey: string,
): Promise<TidySuggestion[]> {
  const offered = fields
    .filter((field) => field.text.trim().length > 0)
    .slice(0, MAX_TIDY_FIELDS)
    .map((field) => ({ key: field.key, text: field.text.slice(0, MAX_TIDY_FIELD_LENGTH) }));
  if (offered.length === 0) return [];

  return withAiCallContext({ callType: "tidy-wording" }, async () => {
    const client = createOpenAIClient(apiKey);
    const response = await client.chat.completions.create({
      ...modelParams("standard", { temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ fields: offered }) },
      ],
    });
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }
    return validateTidyResponse(parsed, offered);
  });
}
