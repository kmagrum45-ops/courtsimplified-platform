/**
 * The display switches a server layout hands to client pages
 * (app/_components/DisplaySwitches.tsx), read from the environment at request
 * time. Server side only: the variables are not in the browser.
 */
import { researchStepEnabled } from "./phaseScope";

export function displaySwitchesFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): { researchStep: boolean } {
  return { researchStep: researchStepEnabled(env) };
}
