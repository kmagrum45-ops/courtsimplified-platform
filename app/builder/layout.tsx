import type { ReactNode } from "react";

import { DisplaySwitchesProvider } from "@/app/_components/DisplaySwitches";
import { displaySwitchesFromEnv } from "@/src/lib/content-library/displaySwitches";

/**
 * RENDERED PER REQUEST, for two reasons.
 *
 * 1. THE ADDRESS WINS (owner's Chrome check, 30 Oct). This page reads its case or
 *    court from the address (path, caseId, intake). A prerendered page is cached by
 *    Next's client router under its path alone, and a later client-side visit with
 *    another case borrowed the first visit's address: "Continue with Family" opened
 *    the earlier Small Claims case. Rendered per request, the search is part of the
 *    cache key and the case asked for is the one opened. The rule and its check:
 *    scripts/verification/verifyAddressWins.ts (npm run test:address-wins).
 *
 * 2. THE DISPLAY SWITCHES (RESEARCH_STEP) are read on every request and handed to
 *    the client pages below, so saved research on a case obeys the switch as it is
 *    now, not as it was when the case was analysed (app/_components/DisplaySwitches.tsx).
 */
export const dynamic = "force-dynamic";

export default function BuilderLayout({ children }: { children: ReactNode }) {
  return <DisplaySwitchesProvider switches={displaySwitchesFromEnv()}>{children}</DisplaySwitchesProvider>;
}
