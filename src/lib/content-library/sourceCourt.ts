/**
 * WHICH COURT A SOURCE IS WRITTEN FOR, so a case is never sent to another court's guide (Chrome check of #545, 9 Nov
 * 2026, item 4: a Small Claims case's "Proof the money was actually transferred (Ontario courts guide)" linked the
 * Superior Court's "Steps in a civil case", ontariocourts.ca/scj/.../civil-resources.../steps-to-civil-case/).
 *
 * Only a source that is about one court's own process is tied to it: that court's guide pages and its rules. A statute, a
 * general government page or a public-legal-education page is for every court (null). Read from the address alone, so a
 * new source is tied only by a pattern written here, never guessed.
 */
export type SourceCourt = "small-claims" | "civil" | "family";

const PATTERNS: ReadonlyArray<[SourceCourt, RegExp]> = [
  // The Small Claims Court: Ontario's procedures guide, the court's own pages, its rules (O. Reg. 258/98).
  ["small-claims", /ontario\.ca\/document\/guide-procedures-small-claims-court|ontariocourts\.ca\/scj\/small-claims|ontario\.ca\/laws\/(?:regulation|docs)\/980258/i],
  // The Superior Court's civil process: its guide for civil cases and its civil pages, the Rules of Civil Procedure.
  ["civil", /ontariocourts\.ca\/scj\/guides-and-service-resources\/guide-to-representing-yourself\/civil-resources|ontariocourts\.ca\/scj\/civil|ontario\.ca\/laws\/(?:regulation|docs)\/900194/i],
  // Family: the courts' family pages and the Family Law Rules (O. Reg. 114/99).
  ["family", /ontariocourts\.ca\/(?:scj|ocj)\/family|ontario\.ca\/laws\/(?:regulation|docs)\/990114/i],
];

/** The court a source is written for, or null when it is for every court. */
export function sourceCourtOf(url: string | null | undefined): SourceCourt | null {
  if (!url) return null;
  for (const [court, pattern] of PATTERNS) if (pattern.test(url)) return court;
  return null;
}

/** Whether a source may be shown on a case in `court`: it is for every court, or for that one. */
export function sourceFitsCourt(url: string | null | undefined, court: string | null | undefined): boolean {
  const own = sourceCourtOf(url);
  return own === null || !court || own === court;
}
