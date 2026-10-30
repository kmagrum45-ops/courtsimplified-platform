/**
 * THE SAFETY NOTICE SHOWS ONCE (site owner, 2026-10-29): "The fuller support information
 * shows only when what the person said indicates danger, at that moment, once."
 *
 * A pure decision, so a terminal suite can prove it: given the person's words and the
 * stories the notice has already been shown for, it returns the key to record and show,
 * or null. The key is the story's words, trimmed and with spaces collapsed, so the same
 * words never show it twice, on any page; new words that name danger show it at that
 * moment. The danger screen is storySuggestsDanger (dangerWords.ts), unchanged.
 *
 * A screen for when to show help, never a finding about anyone. No advice, no scoring.
 */
import { storySuggestsDanger } from "./dangerWords";

/** Where the browser keeps the keys of the stories the notice was shown for. */
export const SAFETY_NOTICE_SHOWN_KEY = "cs_safety_notice_shown";

export function safetyNoticeKey(story: string): string {
  return story.trim().replace(/\s+/g, " ");
}

/** The key to record and show, or null: no danger named, or already shown for these words. */
export function safetyNoticeToShow(story: string, shown: readonly string[]): string | null {
  if (!storySuggestsDanger(story)) return null;
  const key = safetyNoticeKey(story);
  return shown.includes(key) ? null : key;
}

/** Reads the shown keys from a browser store; a missing or broken entry is an empty list. */
export function readShownKeys(store: Pick<Storage, "getItem"> | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(SAFETY_NOTICE_SHOWN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Records a key, keeping only the most recent 20 so the entry cannot grow without end. */
export function recordShownKey(store: Pick<Storage, "getItem" | "setItem"> | null | undefined, key: string): void {
  try {
    store?.setItem(SAFETY_NOTICE_SHOWN_KEY, JSON.stringify([...readShownKeys(store).filter((item) => item !== key), key].slice(-20)));
  } catch {
    // Storage refused (private mode, full): the notice may show again, which is the safe side.
  }
}
