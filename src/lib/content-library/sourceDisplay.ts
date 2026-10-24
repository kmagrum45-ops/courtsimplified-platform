/**
 * Every saved source's name, page and checked date, for a Sources list or a
 * quoted passage (walkthrough run 38525903567: sentences proved from the
 * Small Claims guides showed no source, and no list showed a date; CLAUDE.md
 * s. 2 asks for both). Read from the generated table
 * (scripts/content/buildSourceDisplay.ts), which takes the stage map's own
 * names and pages from citations.ts and every other source's from the corpus
 * manifest, the retrieval index and docs/sources/README.md.
 *
 * "stage-premise" is not a source: it is the position the answer is shown for
 * ("You have been served with a claim"), recorded as stating no law
 * (ACCURACY_ENGINE.md, "The stage premise is a source, labelled as stating no
 * law"). It never appears in a Sources list.
 */

import TABLE from "./published/sourceDisplay.generated.json";
import { isRealIsoDate } from "../case-system/dates";

export type SourceDisplay = { name: string; url: string; checkedOn: string };

const SOURCES = (TABLE as { sources: Record<string, SourceDisplay> }).sources;

/** Not a source of law: never listed (see above). */
export const NOT_A_SOURCE: ReadonlySet<string> = new Set(["stage-premise"]);

/** The name, page and checked date for a source id, or null when it has none (or is not a source). */
export function sourceDisplayFor(sourceId: string): SourceDisplay | null {
  if (NOT_A_SOURCE.has(sourceId)) return null;
  const row = SOURCES[sourceId];
  return row && row.name && row.url && isRealIsoDate(row.checkedOn) ? row : null;
}

/**
 * The date a passage's source was checked, as the passage carries it
 * (findingsView sets it when the research runs; a passage is used only if its
 * text still matches the saved file, corpusIndex.ts, so that file's saved date
 * is the right one). A result saved before passages carried a date says so,
 * rather than borrowing today's file date for words that may have changed
 * (review of bee9daf).
 */
export function checkedOnShown(provision: { checkedOn?: string }): string {
  return provision.checkedOn ? `checked ${provision.checkedOn}` : "checked date not recorded";
}
