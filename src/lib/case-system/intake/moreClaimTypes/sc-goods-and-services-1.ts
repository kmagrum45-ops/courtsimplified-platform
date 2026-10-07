/**
 * Case types, batch "sc-goods-and-services-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-goods-and-services-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-contractor-poor-or-incomplete-work -- A contractor did poor or unfinished work
 *   sc-claim-contractor-took-deposit-and-left -- A contractor took a deposit and disappeared
 *   sc-claim-homeowner-wont-pay-contractor -- A homeowner will not pay the contractor
 *   sc-claim-defective-product -- Something bought that does not work
 *   sc-claim-used-vehicle-private-sale -- A used car bought privately
 *   sc-claim-new-vehicle-defects -- Defects in a new vehicle
 *   sc-claim-new-home-defects -- Defects in a newly built home
 *   sc-claim-home-inspector-missed-defects -- A home inspector who missed something
 *   sc-claim-undisclosed-defects-after-purchase -- Problems found after buying a house
 *   sc-claim-real-estate-deposit-dispute -- A real estate deposit in dispute
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_SC_GOODS_AND_SERVICES_1: ClaimType[] = [];
