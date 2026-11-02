/**
 * The one test for an answer that gives nothing but "I don't know" (a skip, "not sure", "no idea"): kept as
 * unsure, never as a value. In its own module so the story-version rule (storyBasis.ts) can use it without
 * importing the case file (which imports storyBasis); caseFile.ts re-exports it, so there is one copy.
 */
export function isUnsureAnswer(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\s*(?:i\s*(?:do\s*not|don'?t|dont)\s*know(?:\s*yet)?|not\s*sure(?:\s*yet)?|unsure|no\s*idea|i'?m\s*not\s*sure|idk|not-sure|unknown|skip(?:ped)?)\s*[.!]?\s*$/i.test(value);
}

/**
 * An answer's words as kept or shown: "" for an answer that gives nothing but "I don't know" (the one test
 * above), so "I do not know yet" is never saved or shown as the answer itself (founder's Chrome check of #541,
 * 2 Nov: typed in the Small Claims chat, it was shown as "What you want"). Every place that copies a typed
 * answer into the analysis input, and every screen that shows one, reads it through this.
 */
export function answerWords(value: unknown): string {
  return typeof value !== "string" || isTypedUnsure(value) ? "" : value.trim();
}

/**
 * Typed words that give nothing but "I don't know" ("I do not know yet", "not sure"), as distinct from a stored
 * code that means the same ("not-sure", "unknown": a choice's value, which the analysis and the stage reader read).
 */
export function isTypedUnsure(value: unknown): boolean {
  return typeof value === "string" && isUnsureAnswer(value) && !/^[a-z]+(?:-[a-z]+)*$/.test(value.trim());
}

/**
 * A copy of an answers record with every answer that is only "I don't know" emptied, at the top level and one
 * level down (the analysis input keeps its extra answers in `extra`). Used where every court's answers enter
 * the analysis input (builder/page.tsx handleComplete), so no court saves the phrase as an answer.
 */
export function withoutUnsureAnswers<T extends Record<string, unknown>>(record: T): T {
  // A stored code ("not-sure", "unknown") stays as it is; the analysis reads it.
  const clean = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, isTypedUnsure(value) ? "" : value]));
  const out = clean(record);
  if (out.extra && typeof out.extra === "object" && !Array.isArray(out.extra)) out.extra = clean(out.extra as Record<string, unknown>);
  return out as T;
}
