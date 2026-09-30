/**
 * The Small Claims catalogue's verification log, and the two functions that
 * tie it to the catalogue: which entries exist, and what text each one said
 * when it was verified.
 *
 * WHY. `verifiedAt` on a catalogue entry used to be a bare date. Nothing
 * recorded what the source actually said, and nothing noticed when the
 * entry's wording was later edited -- so a date could go on vouching for a
 * sentence nobody had checked. On 2026-09-30 all 146 entries were read against
 * their sources: 58 were supported as written, 86 were corrected, and 2 could
 * not be checked because the source (O. Reg. 333/08) could not be retrieved.
 * Every dated entry now has a record in docs/sources/catalogue-verification.json
 * holding the verbatim passages it rests on and a fingerprint of the text that
 * was verified. `npm run test:catalogue-verified` holds the two together.
 *
 * TO RE-VERIFY an entry after changing it: read the source again, then update
 * its record (sources, howRead, verifiedAt) and set its fingerprint with
 * entryFingerprint(). The suite tells you which entries need it.
 */

import { createHash } from "node:crypto";

import {
  CLAIM_TYPES,
  DEFENCE_CONCEPTS,
  type SourceRef,
} from "../../src/lib/case-system/intake/claimTypes";

export type CatalogueEntryKind =
  | "plaintiffElement"
  | "defendantConsideration"
  | "proceduralNote"
  | "defenceConcept";

export type CatalogueEntry = {
  /** "<claimTypeId>|<kind>|<id>" -- procedural notes use "<claimTypeId>#note<index>". */
  key: string;
  claimTypeId: string;
  kind: CatalogueEntryKind;
  id: string;
  name?: string;
  text: string;
  whenThisComesUp?: string;
  sourceUrl: string;
  verifiedAt?: string;
  consolidationPeriod?: string;
  alsoCites?: SourceRef[];
};

export function catalogueEntries(): CatalogueEntry[] {
  const out: CatalogueEntry[] = [];
  const push = (entry: Omit<CatalogueEntry, "key">) =>
    out.push({ key: `${entry.claimTypeId}|${entry.kind}|${entry.id}`, ...entry });

  for (const claimType of CLAIM_TYPES) {
    for (const element of claimType.plaintiffElements) {
      push({
        claimTypeId: claimType.id,
        kind: "plaintiffElement",
        id: element.id,
        name: element.name,
        text: element.plainExplanation,
        sourceUrl: element.sourceUrl,
        verifiedAt: element.verifiedAt,
        consolidationPeriod: element.consolidationPeriod,
        alsoCites: element.alsoCites,
      });
    }
    for (const consideration of claimType.defendantConsiderations) {
      push({
        claimTypeId: claimType.id,
        kind: "defendantConsideration",
        id: consideration.id,
        name: consideration.name,
        text: consideration.plainExplanation,
        whenThisComesUp: consideration.whenThisComesUp,
        sourceUrl: consideration.sourceUrl,
        verifiedAt: consideration.verifiedAt,
        consolidationPeriod: consideration.consolidationPeriod,
        alsoCites: consideration.alsoCites,
      });
    }
    claimType.proceduralNotes.forEach((note, index) => {
      push({
        claimTypeId: claimType.id,
        kind: "proceduralNote",
        id: `${claimType.id}#note${index}`,
        text: note.note,
        sourceUrl: note.sourceUrl,
        verifiedAt: note.verifiedAt,
        consolidationPeriod: note.consolidationPeriod,
        alsoCites: note.alsoCites,
      });
    });
  }
  for (const concept of DEFENCE_CONCEPTS) {
    push({
      claimTypeId: "DEFENCE_CONCEPTS",
      kind: "defenceConcept",
      id: concept.id,
      name: concept.name,
      text: concept.plainExplanation,
      sourceUrl: concept.sourceUrl,
      verifiedAt: concept.verifiedAt,
      consolidationPeriod: concept.consolidationPeriod,
      alsoCites: concept.alsoCites,
    });
  }
  return out;
}

/**
 * What a user reads for this entry, plus where it says it comes from. The
 * evidence-category lists are deliberately excluded: they name kinds of
 * records, not legal propositions, and were not what was verified.
 */
export function entryFingerprint(entry: CatalogueEntry): string {
  const canonical = JSON.stringify([
    entry.name ?? null,
    entry.text,
    entry.whenThisComesUp ?? null,
    entry.sourceUrl,
    entry.alsoCites ?? null,
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export type VerificationSource = {
  sourceUrl: string;
  pinpoint: string;
  /** Verbatim from the source. For a vendored corpus file the suite checks it is really there. */
  quote: string;
};

export type VerificationRecord = {
  key: string;
  verifiedAt: string;
  /**
   * SUPPORTED as written, CORRECTED to what the source says, or AUTHORED new
   * from the source (the entry did not exist before it was verified).
   */
  outcome: "supported" | "corrected" | "authored";
  fingerprint: string;
  sources: VerificationSource[];
  /** How the source was read: vendored corpus file, OCR of a saved PDF, live page. */
  howRead: string;
  /** For a corrected entry: what was wrong with the wording before. */
  problemCorrected?: string;
  /** Later re-reads of a corrected entry by a reviewer who had not written it. */
  independentReviews?: string[];
};

export type VerificationLog = {
  description: string;
  /** Entries that could not be verified, with why. They carry no verifiedAt. */
  unverifiable: { key: string; reason: string }[];
  records: VerificationRecord[];
};

/** Whitespace and typographic quotes are not content; nothing else is forgiven. */
export function normalizeForQuote(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
