/**
 * The claim-type catalogue: every profile, authored and declared, in one place.
 *
 * Ordered authored-first so a coverage report reads as progress rather than as a
 * wall of unwritten types.
 */

import { CLAIM_BARRING_PROFILES } from "./claimBarringProfiles";
import { DECLARED_PROFILES } from "./declaredProfiles";
import { NOTICE_PROFILES } from "./noticeProfiles";
import type { ClaimFamily, ClaimTypeProfile } from "./claimTypeProfile";

export const CLAIM_TYPE_PROFILES: readonly ClaimTypeProfile[] = [
  ...CLAIM_BARRING_PROFILES,
  ...NOTICE_PROFILES,
  ...DECLARED_PROFILES,
];

export function profileById(id: string): ClaimTypeProfile | undefined {
  return CLAIM_TYPE_PROFILES.find((profile) => profile.id === id);
}

/**
 * Only authored profiles may reach a user.
 *
 * The single door. A declared profile carries no forum verdict and no notices, so
 * rendering one would produce an empty answer that looks like an answer — which is
 * worse than producing nothing, because the user cannot tell the difference.
 */
export function renderableProfiles(): ClaimTypeProfile[] {
  return CLAIM_TYPE_PROFILES.filter((profile) => profile.contentStatus === "authored");
}

export type FamilyCoverage = {
  family: ClaimFamily;
  authored: number;
  declared: number;
  total: number;
};

export function coverageByFamily(): FamilyCoverage[] {
  const families = new Map<ClaimFamily, FamilyCoverage>();
  for (const profile of CLAIM_TYPE_PROFILES) {
    const row =
      families.get(profile.family) ??
      { family: profile.family, authored: 0, declared: 0, total: 0 };
    if (profile.contentStatus === "authored") row.authored += 1;
    else row.declared += 1;
    row.total += 1;
    families.set(profile.family, row);
  }
  return [...families.values()].sort((a, b) => b.total - a.total);
}
