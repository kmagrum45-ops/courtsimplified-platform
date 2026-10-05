/**
 * The official forms a piece of reviewed guidance names, with their official
 * links, so the form a step tells the user to use is one click away.
 *
 * WHY (2026-10-04). A served defendant read "you can serve a Defence
 * [Form 9A]" in their next step, then opened the Forms tab and met a catalogue
 * of every form for the court with nothing pointing at 9A (page walkthrough:
 * "does not foreground those response forms and instead starts a 240-form
 * catalogue"). The guidance already names the forms; this reads the names it
 * gives and nothing else, so it adds no legal statement of its own.
 *
 * Only numbers that exist in that court's official list are returned; a
 * number the guidance mentions for another court, or a typo, is dropped.
 */

import { officialFormFor, type OfficialFormEntry } from "./officialFormLink";

const LIST = /\bForms?\s+([0-9][0-9A-Z.]*(?:\s*(?:,|\bor\b|\band\b)\s*[0-9][0-9A-Z.]*)*)/g;

export function formNumbersNamedIn(text: string): string[] {
  const numbers: string[] = [];
  for (const match of text.matchAll(LIST)) {
    for (const raw of match[1].split(/\s*(?:,|\bor\b|\band\b)\s*/)) {
      const number = raw.trim().replace(/\.+$/, "");
      if (number && !numbers.includes(number)) numbers.push(number);
    }
  }
  return numbers;
}

/** Official entries for the forms named across these texts, in the order first named. */
export function officialFormsNamedIn(texts: readonly string[], court: string): OfficialFormEntry[] {
  const found: OfficialFormEntry[] = [];
  for (const text of texts) {
    for (const number of formNumbersNamedIn(text)) {
      const entry = officialFormFor(court, number);
      if (entry && !found.some((existing) => existing.number === entry.number)) found.push(entry);
    }
  }
  return found;
}
