/**
 * Which "belongs somewhere other than Small Claims" routes to list, given the
 * claim type the USER confirmed.
 *
 * WHY. The overview listed every route to everyone. A customer whose
 * contractor quit halfway was shown the auto-insurance direct-compensation
 * rule and the residential-tenancy rule -- two long blocks about matters
 * nothing in their case resembles (live run, 2026-09-28).
 *
 * WHY NOT MATCH THE STORY. IntelligenceOverviewPanel.tsx records why the
 * routes' own story signals are not used: one of three plain stories
 * matched, on "my landlord". A false match tells someone their case belongs
 * at another tribunal. That reasoning still holds and nothing here reads the
 * story.
 *
 * WHAT THIS USES INSTEAD. The claim type the user themselves confirmed -- the
 * user's own classification, not the system applying a rule to their facts.
 * A route is hidden only when the confirmed claim type is one the route
 * plainly is not about. With no confirmed claim type, every route is listed,
 * exactly as before. The monetary-limit route is always listed: it can apply
 * to any claim.
 */

export type RouteLike = { id: string };

/**
 * For each route that concerns only particular kinds of claim, the claim
 * types it can concern. Routes not named here are always listed.
 */
const ROUTE_CLAIM_TYPES: Record<string, readonly string[]> = {
  "sc-route-vehicle-property-damage-dcpd": [
    "sc-claim-vehicle-accident-uninsured-driver-property-damage",
  ],
  "sc-route-residential-tenancy-ltb": ["sc-claim-commercial-tenancy-dispute"],
};

export function routesForConfirmedClaimType<T extends RouteLike>(
  routes: readonly T[],
  confirmedClaimTypeId: string | null | undefined,
): T[] {
  if (!confirmedClaimTypeId) return [...routes];
  return routes.filter((route) => {
    const onlyFor = ROUTE_CLAIM_TYPES[route.id];
    return !onlyFor || onlyFor.includes(confirmedClaimTypeId);
  });
}

/** Exported for the suite, which checks every key is a real route id. */
export const ROUTE_CLAIM_TYPE_KEYS = Object.keys(ROUTE_CLAIM_TYPES);
export const ROUTE_CLAIM_TYPE_VALUES = Object.values(ROUTE_CLAIM_TYPES).flat();
