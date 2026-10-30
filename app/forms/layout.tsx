import type { ReactNode } from "react";

/**
 * RENDERED PER REQUEST, SO THE ADDRESS WINS (owner's Chrome check, 30 Oct).
 *
 * This page reads its case or court from the address (path, caseId, intake). A
 * prerendered page is cached by Next's client router under its path alone, and a
 * later client-side visit with another case borrowed the first visit's address:
 * "Continue with Family" opened the earlier Small Claims case. Rendered per
 * request, the search is part of the cache key and the case asked for is the one
 * opened. The rule and its check: scripts/verification/verifyAddressWins.ts
 * (npm run test:address-wins).
 */
export const dynamic = "force-dynamic";

export default function AddressWinsLayout({ children }: { children: ReactNode }) {
  return children;
}
