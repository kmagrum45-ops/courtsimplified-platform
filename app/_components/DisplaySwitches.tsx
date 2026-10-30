"use client";

/**
 * SWITCHES THAT DECIDE WHAT A PAGE SHOWS, DECIDED ON THE SERVER (2026-10-29).
 *
 * The owner set RESEARCH_STEP=off and "What we looked into" still showed on a
 * live case: the switch stopped new research (courtSimplifiedBrain.ts), but the
 * research saved with the case (master_result.intakeAnalysis.research) is read
 * straight from the database by client pages, which never asked the switch.
 * A client component cannot read RESEARCH_STEP itself (a server-only variable
 * is undefined in the browser), so the server layouts for /builder and /cases
 * read it at request time and pass it down here (displaySwitchesFromEnv).
 *
 * With no provider above it, everything here reads as OFF: a page that forgot
 * the provider hides the feature rather than showing it against the switch.
 */
import { createContext, useContext, type ReactNode } from "react";

export type DisplaySwitches = {
  /** phaseScope.researchStepEnabled: "What we looked into" and the "The law behind this" lines built from it. */
  researchStep: boolean;
};

const OFF: DisplaySwitches = { researchStep: false };

const DisplaySwitchesContext = createContext<DisplaySwitches>(OFF);

export function DisplaySwitchesProvider({ switches, children }: { switches: DisplaySwitches; children: ReactNode }) {
  return <DisplaySwitchesContext.Provider value={switches}>{children}</DisplaySwitchesContext.Provider>;
}

export function useDisplaySwitches(): DisplaySwitches {
  return useContext(DisplaySwitchesContext);
}
