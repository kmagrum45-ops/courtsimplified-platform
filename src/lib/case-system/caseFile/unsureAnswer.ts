/**
 * The one test for an answer that gives nothing but "I don't know" (a skip, "not sure", "no idea"): kept as
 * unsure, never as a value. In its own module so the story-version rule (storyBasis.ts) can use it without
 * importing the case file (which imports storyBasis); caseFile.ts re-exports it, so there is one copy.
 */
export function isUnsureAnswer(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\s*(?:i\s*(?:do\s*not|don'?t|dont)\s*know(?:\s*yet)?|not\s*sure(?:\s*yet)?|unsure|no\s*idea|i'?m\s*not\s*sure|idk|not-sure|unknown|skip(?:ped)?)\s*[.!]?\s*$/i.test(value);
}
