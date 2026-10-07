/**
 * Case types, batch "sc-housing-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-housing-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-landlord-against-former-tenant -- A landlord claiming against a former tenant
 *   sc-claim-tenant-against-former-landlord -- A tenant claiming against a former landlord
 *   sc-claim-roommate-or-shared-house -- A roommate or shared-house dispute
 *   sc-claim-subletter-not-paying -- A subletter or roommate not paying their share
 *   sc-claim-condo-owner-against-corporation -- A condo owner against the condo corporation
 *   sc-claim-condo-water-or-noise-damage -- Water or noise damage between condo units
 *   sc-claim-co-owner-dispute -- A dispute between co-owners
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_SC_HOUSING_1: ClaimType[] = [];
