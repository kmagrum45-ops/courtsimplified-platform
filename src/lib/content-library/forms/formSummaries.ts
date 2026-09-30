/**
 * The plain-language explanation of each official form, WITHOUT the rule
 * quotes: the light half of the forms guide (see formGuide.ts), for code that
 * runs in the browser -- the content inventory behind the output guard, and
 * the case forms page. The rule index (310 KB) stays out of those bundles.
 */
import summaries from "./formSummaries.json";

export type SummaryCourt = "small-claims" | "civil" | "family";

export const FORM_SUMMARIES = summaries as Record<SummaryCourt, Record<string, string>>;

export const FORM_REGULATION_URLS: Record<SummaryCourt, string> = {
  "small-claims": "https://www.ontario.ca/laws/regulation/980258",
  civil: "https://www.ontario.ca/laws/regulation/900194",
  family: "https://www.ontario.ca/laws/regulation/990114",
};

/** "7A", "Form 7A", "form 7a" all find the same entry. */
export function normalizeFormNumber(value: string): string {
  return String(value || "")
    .replace(/^\s*forms?\s+/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** The guide's number and explanation for a form, or null if the guide does not list it. */
export function formSummaryFor(court: string, number: string): { number: string; summary: string } | null {
  if (court !== "small-claims" && court !== "civil" && court !== "family") return null;
  const wanted = normalizeFormNumber(number);
  for (const [key, summary] of Object.entries(FORM_SUMMARIES[court])) {
    if (normalizeFormNumber(key) === wanted) return { number: key, summary };
  }
  return null;
}
