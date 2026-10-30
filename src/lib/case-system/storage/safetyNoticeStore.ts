/**
 * The browser store the "shown once" safety notice records into (safetyNoticeOnce.ts):
 * this tab's sessionStorage, under SAFETY_NOTICE_SHOWN_KEY (intakeStorageKeys.ts), so it
 * dies with the tab and is cleared on sign-out with the rest of the registry. Only
 * one-way fingerprints are ever written there, never the person's words.
 */
export function safetyNoticeStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
