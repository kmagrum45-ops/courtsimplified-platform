/**
 * THE SAFETY NOTICE SHOWS ONCE (site owner, 2026-10-29): "The fuller support information
 * shows only when what the person said indicates danger, at that moment, once."
 *
 * A pure decision, so a terminal suite can prove it: given the person's words and the
 * fingerprints of the stories the notice was already shown for, it returns the
 * fingerprint to record and show, or null. The same words never show it twice; new
 * words that name danger show it at that moment. The danger screen is
 * storySuggestsDanger (dangerWords.ts), unchanged.
 *
 * WHAT IS STORED: only a short one-way fingerprint (the first 16 hex characters of the
 * SHA-256 of the story, trimmed, spaces collapsed, lower-cased), never the words -- on a
 * shared computer the person's story must not be left behind. It is kept in
 * sessionStorage under SAFETY_NOTICE_SHOWN_KEY (registered in intakeStorageKeys.ts), so
 * it dies with the tab and is cleared on sign-out with the rest of the registry.
 *
 * A screen for when to show help, never a finding about anyone. No advice, no scoring.
 */
import { storySuggestsDanger } from "./dangerWords";
import { SAFETY_NOTICE_SHOWN_KEY } from "../storage/intakeStorageKeys";

export { SAFETY_NOTICE_SHOWN_KEY };

/** The one-way fingerprint of a story; null where the browser offers no SHA-256 (the notice then shows, the safe side). */
export async function safetyNoticeFingerprint(story: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const normalised = story.trim().replace(/\s+/g, " ").toLowerCase();
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(normalised));
  return Array.from(new Uint8Array(digest).slice(0, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * What to do for these words: `{ show: false }` when no danger is named or the notice
 * was already shown for them; otherwise show, and record `fingerprint` (null when none
 * could be made).
 */
export async function safetyNoticeToShow(story: string, shown: readonly string[]): Promise<{ show: boolean; fingerprint: string | null }> {
  if (!storySuggestsDanger(story)) return { show: false, fingerprint: null };
  const fingerprint = await safetyNoticeFingerprint(story);
  if (fingerprint && shown.includes(fingerprint)) return { show: false, fingerprint };
  return { show: true, fingerprint };
}

/**
 * THE SCREENS THE NOTICE IS SHOWN ON: the ones after the story -- the builder and the
 * case pages. Not the home page, where the story is still being typed: shown there, it
 * was recorded as shown before the person pressed Continue, so the builder (the first
 * screen after the story) never showed it. That was the fault CI's first run of
 * items-8-12 test 8 found on 2026-10-30.
 */
export const SAFETY_NOTICE_SCREENS = ["/builder", "/cases/"] as const;

export function safetyNoticeShowsOn(pathname: string): boolean {
  return SAFETY_NOTICE_SCREENS.some((screen) => pathname === screen || pathname.startsWith(screen.endsWith("/") ? screen : `${screen}/`));
}

/**
 * Fingerprint -> the screen it was shown on, in this page load only (memory, never
 * stored). A remount on the same screen (React's development double mount, the intake
 * provider re-keyed when the case is saved) keeps the notice; another screen, or a new
 * page load, does not show it again.
 */
const shownThisLoad = new Map<string, string>();

/** For tests: a new page load forgets what this load showed (the tab's record stays). */
export function startNewPageLoad(): void {
  shownThisLoad.clear();
}

/**
 * The one decision SafetyNotice makes, for these words on this screen: show, once. Records
 * the fingerprint (never the words) in the tab's store the first time it decides to show.
 */
export async function decideSafetyNotice(story: string, pathname: string, store: Pick<Storage, "getItem" | "setItem"> | null | undefined): Promise<boolean> {
  if (!safetyNoticeShowsOn(pathname) || !storySuggestsDanger(story)) return false;
  const fingerprint = await safetyNoticeFingerprint(story);
  if (!fingerprint) return true;
  if (shownThisLoad.get(fingerprint) === pathname) return true;
  if (readShownKeys(store).includes(fingerprint)) return false;
  recordShownKey(store, fingerprint);
  shownThisLoad.set(fingerprint, pathname);
  return true;
}

/** Reads the shown fingerprints from a browser store; a missing or broken entry is an empty list. */
export function readShownKeys(store: Pick<Storage, "getItem"> | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(SAFETY_NOTICE_SHOWN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && /^[0-9a-f]{16}$/.test(item)) : [];
  } catch {
    return [];
  }
}

/** Records a fingerprint, keeping only the most recent 20. Only ever a fingerprint: anything else is refused. */
export function recordShownKey(store: Pick<Storage, "getItem" | "setItem"> | null | undefined, fingerprint: string): void {
  if (!/^[0-9a-f]{16}$/.test(fingerprint)) return;
  try {
    store?.setItem(SAFETY_NOTICE_SHOWN_KEY, JSON.stringify([...readShownKeys(store).filter((item) => item !== fingerprint), fingerprint].slice(-20)));
  } catch {
    // Storage refused (private mode, full): the notice may show again, which is the safe side.
  }
}
