/**
 * Whether the reading's "Continue" button should be the quiet, outlined one
 * rather than the primary green one -- pure, for `CaseUnderstandingCard`'s
 * button and the test that proves it (verifyCaseUnderstanding.ts).
 *
 * *** WHY THIS LIVES IN ITS OWN FILE ***
 *
 * `CaseUnderstandingCard` is a client component. It may import only TYPES from
 * understandCase.ts, because that module's graph reaches the checked-answer
 * engine and from there corpusIndex.ts, which reads the corpus with node:fs.
 * Importing a runtime value from it pulls node:fs into the browser bundle:
 * `tsc` passes, `next build` fails (PR #436's first CI run). So this function
 * imports nothing at runtime, and understandCase.ts re-exports it.
 *
 * 2026-10-17 live bug: a landlord-held deposit was correctly read as
 * belonging to the Landlord and Tenant Board, not Small Claims -- but
 * `mainCourt` values outside small-claims/civil/family (tribunal,
 * outside-ontario) have no `CourtPath` to offer as an alternative button, and
 * the chosen-path button treated that exactly like "unclear" (no better
 * destination known): still primary and green, on the same screen that had
 * just explained this almost certainly isn't the right venue. The one thing
 * that separates "truly unclear" from "known to belong somewhere else, just
 * not somewhere this button can send you" is `mainCourt`, so that is the one
 * thing this checks -- never a mapped path's own availability, which stays
 * exactly as it was (a mapped-but-unavailable path still leaves the chosen
 * path as the only thing to click, so it must stay primary).
 */
import type { UnderstoodCourt } from "./understandCase";

export function betterDestinationKnown(mainCourt: UnderstoodCourt, chosenPath: string, suggestedIsAvailable: boolean | null): boolean {
  if (mainCourt === "unclear" || mainCourt === chosenPath) return false;
  // suggestedIsAvailable is null when mainCourt maps to no path at all
  // (tribunal, outside-ontario): there is nothing to check availability of.
  return suggestedIsAvailable ?? true;
}
