/**
 * The public library of claim and matter types (2026-09-30): the 26 Small
 * Claims claim types, 7 civil claim types and 6 family matter types that the
 * intake already uses, shown on their own pages at /claims.
 *
 * WHY. This content was already written and sourced (claimTypes.ts,
 * civilClaimTypes.ts, familyMatterTypes.ts; test:claim-types,
 * test:catalogue-verified) but could only be seen inside an intake, after a
 * claim type was matched. Publishing it is the "topic surfacing" CLAUDE.md
 * section 2 allows: what someone bringing this kind of claim generally must
 * show, and the reader decides whether it fits. Nothing here is rewritten;
 * this module only gathers the three catalogues. Every string the pages show
 * is in the content inventory (contentInventory.ts, "Claim library").
 */
import { CLAIM_TYPES, DEFENCE_CONCEPTS, type ClaimType } from "../case-system/intake/claimTypes";
import { CIVIL_CLAIM_TYPES } from "../case-system/intake/civilClaimTypes";
import { FAMILY_MATTER_TYPES } from "../case-system/intake/familyMatterTypes";
import { REMEDY_TYPES } from "../case-system/intake/remedyTypes";

export const LIBRARY_MATTER_TYPES: ClaimType[] = [...CLAIM_TYPES, ...CIVIL_CLAIM_TYPES, ...FAMILY_MATTER_TYPES];

export const LIBRARY_COURT_LABELS: Record<string, string> = {
  "small-claims": "Small Claims Court",
  civil: "Superior Court (civil)",
  family: "Family court",
};

export function libraryMatterType(id: string): ClaimType | null {
  return LIBRARY_MATTER_TYPES.find((entry) => entry.id === id) ?? null;
}

export function defencesFor(entry: ClaimType) {
  return entry.applicableDefenceConceptIds
    .map((id) => DEFENCE_CONCEPTS.find((concept) => concept.id === id))
    .filter((concept): concept is (typeof DEFENCE_CONCEPTS)[number] => Boolean(concept));
}

export function remediesFor(entry: ClaimType) {
  return entry.remedies
    .map((id) => REMEDY_TYPES.find((remedy) => remedy.id === id))
    .filter((remedy): remedy is (typeof REMEDY_TYPES)[number] => Boolean(remedy));
}
