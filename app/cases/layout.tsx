import type { ReactNode } from "react";

import { DisplaySwitchesProvider } from "@/app/_components/DisplaySwitches";
import { displaySwitchesFromEnv } from "@/src/lib/content-library/displaySwitches";

/**
 * Server layout: reads the display switches (RESEARCH_STEP) on every request
 * and hands them to the client pages below, so saved research on a case obeys
 * the switch as it is now, not as it was when the case was analysed
 * (app/_components/DisplaySwitches.tsx). force-dynamic so the value is read at
 * request time, never fixed into a prerendered page at build.
 */
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: ReactNode }) {
  return <DisplaySwitchesProvider switches={displaySwitchesFromEnv()}>{children}</DisplaySwitchesProvider>;
}
