/**
 * The single gate every AI-fed, user-facing string passes through.
 *
 * *** WHAT IT IS FOR ***
 *
 * The LSO A2I policy allows AI to select from human-reviewed content and to
 * produce non-legal content with safeguards that effectively prevent legal
 * content. "Effectively prevent" is the load-bearing phrase: a prompt asking a
 * model not to give legal advice is a request, not a safeguard.
 *
 * This is the safeguard. A string reaches a user only if it is either
 *
 *   1. the text of a content-library item, or
 *   2. an explicitly allowlisted non-legal system message.
 *
 * Anything else is blocked. That is an ALLOWLIST, which is the difference
 * between this and `caseStrengthLanguageValidator.ts`: that file blocks 24
 * known-bad phrases and is a useful second line, but a deny-list cannot
 * establish that a string is approved content — only that it does not contain
 * the phrases someone thought of.
 *
 * *** WHY THIS IS NOT A PROMPT INSTRUCTION ***
 *
 * Every generative call in this codebase already has a careful prompt. The
 * audit still found three places where model prose reached a user. Prompts
 * constrain what a model is asked for; they do not constrain what a render
 * path will display. This does.
 */

import { collectContentInventory } from "./contentInventory";
import { isServable, REQUIRE_APPROVED_CONTENT } from "./licenseeReview";

/**
 * Non-legal system messages the product may show without licensee review.
 *
 * Every entry must be true of ANY user in ANY matter, must state nothing about
 * law, procedure, deadlines, forms or the reader's situation, and must not
 * change meaning depending on facts. If adding a string here requires a moment
 * of thought about whether it is legal content, it is legal content and
 * belongs in the library instead.
 */
export const ALLOWED_SYSTEM_MESSAGES: readonly string[] = [
  "This question helps us understand your situation. If you're unsure, you can skip it or answer in your own words.",
  "We could not complete that just now. Please try again.",
  "Your information is saved.",
  "Loading…",
  "We do not have reviewed next steps for that stage yet, so we will not show any. You can still use the rest of your case file.",
];

const SYSTEM_MESSAGES = new Set(ALLOWED_SYSTEM_MESSAGES.map((entry) => entry.trim()));

/** Text of every library item, built once. */
let libraryTextCache: Map<string, { id: string; version: number }> | null = null;

function libraryText(): Map<string, { id: string; version: number }> {
  if (libraryTextCache) return libraryTextCache;

  const map = new Map<string, { id: string; version: number }>();
  for (const entry of collectContentInventory()) {
    map.set(entry.text.trim(), { id: entry.id, version: entry.version });
    // Blocks are often rendered line by line (next steps are), so each line is
    // individually recognisable. Without this the guard would reject its own
    // catalogue's output the moment a caller split a block for layout.
    for (const line of entry.text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) map.set(trimmed, { id: entry.id, version: entry.version });
    }
  }

  libraryTextCache = map;
  return map;
}

export type GuardResult =
  | { allowed: true; reason: "library-item"; id: string }
  | { allowed: true; reason: "system-message" }
  | { allowed: false; reason: "not-approved-content" | "unreviewed-content" | "placeholder" };

/**
 * Whether a string may be shown to a user.
 *
 * Pure and synchronous, so it can be called from a render path without turning
 * it async, and so a test can assert on it directly.
 */
export function checkUserContent(text: string): GuardResult {
  const trimmed = (text ?? "").trim();

  if (!trimmed) return { allowed: false, reason: "not-approved-content" };

  // A placeholder is never shown, approved or not. It is a note to us.
  if (trimmed.includes("[NEEDS LICENSEE REVIEW:")) {
    return { allowed: false, reason: "placeholder" };
  }

  if (SYSTEM_MESSAGES.has(trimmed)) {
    return { allowed: true, reason: "system-message" };
  }

  const found = libraryText().get(trimmed);
  if (!found) return { allowed: false, reason: "not-approved-content" };

  // With REQUIRE_APPROVED_CONTENT off this passes for any library item, which
  // is what keeps the product usable before review has happened.
  if (!isServable(found.id, found.version)) {
    return { allowed: false, reason: "unreviewed-content" };
  }

  return { allowed: true, reason: "library-item", id: found.id };
}

/**
 * Returns the text if it may be shown, and an empty string if it may not.
 *
 * FAILS CLOSED, and returns rather than throws. A blocked string on a render
 * path should leave a gap, not a stack trace on a user's screen in the middle
 * of their case — the failure mode has to be "we showed less" and never
 * "the page broke".
 *
 * `context` is for the audit log and for the console warning; it should name
 * the render path, not the content.
 */
export function assertApprovedUserContent(text: string, context: string): string {
  const result = checkUserContent(text);
  if (result.allowed) return text;

  // Console only. A user sees nothing; we see everything.
  console.error(
    `[outputGuard] blocked user-facing content at ${context}: ${result.reason}` +
      (REQUIRE_APPROVED_CONTENT ? " (REQUIRE_APPROVED_CONTENT is on)" : ""),
  );

  return "";
}

/** Test seam: clears the memoised library index after a content change. */
export function resetOutputGuardCache(): void {
  libraryTextCache = null;
}
