/**
 * WHAT THE SITE HAS DONE WITH AN UPLOADED FILE, IN WORDS (Charter re-test 2026-10-26).
 *
 * Every document card said "Read from the document itself on this device" whatever had happened,
 * and nothing reads an upload yet (the extract route has no caller), so every field stayed empty
 * under that line. The one place a card's read status is worded: it says the file was read only
 * when it was.
 */
export type ReadStatus = "pending" | "done" | "needs-details" | "skipped" | "failed" | string | null | undefined;

/** True only when the site has read the file's text. */
export const fileWasRead = (status: ReadStatus) => status === "done" || status === "needs-details";

/** The card's line about the file. */
export function readNote(status: ReadStatus): string {
  if (fileWasRead(status)) return "Read from the document itself on this device. No AI analysis has run on it.";
  if (status === "skipped") return "Saved. This file has no text the site can read.";
  if (status === "failed") return "Saved. The site could not read this file.";
  return "Saved. The site has not read this file yet.";
}

/** The short status chip. */
export function readChip(status: ReadStatus): string {
  return status === "done" ? "Text read" : status === "needs-details" ? "Needs your details" : status === "skipped" ? "No text to read" : status === "failed" ? "Could not read" : "Not read yet";
}
