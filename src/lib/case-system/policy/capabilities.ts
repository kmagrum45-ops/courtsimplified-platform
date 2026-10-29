/**
 * EVERY APPROVAL-TIER CAPABILITY AND AI-ADVICE SWITCH, AND THE ONE FUNCTION
 * THAT SAYS WHETHER EACH IS ON FOR THIS REQUEST.
 *
 * Site owner, 2026-10-29: "production defaults off, owner allowlist". On
 * production each of these is off unless the signed-in user is listed in
 * A2I_TESTER_USER_IDS; off production each is what its own switch says, as
 * before. The decision itself is capabilityAccess.capabilityAllowed, which
 * every named switch (a2iScope.isInScope, the phaseScope switches,
 * aiAnalysis.documentAnalysisEnabled) already goes through; `capabilityOn`
 * dispatches to them by key, and `capabilitySetFor` gives a screen the whole
 * answer at once (/api/capabilities, the root layout).
 *
 * Server only in practice: in the browser every switch returns the server's
 * answer (capabilityAccess.ts), so a browser call here is a lookup.
 */
import { A2I_SCOPE, isInScope, type ScopeKey } from "./a2iScope";
import type { CapabilityContext } from "./capabilityAccess";
import { SWITCH_BASE, aiAnalysisTextToUsers, appliedLawEnabled, assistantLawEnabled, caseReaderEnabled, caseUnderstandingEnabled, checkedAnswersEnabled, deepIntakeAnalysis, formFillingEnabled, plainExplanationsEnabled, researchStepEnabled, sourcedQuestionsEnabled, strategyEnabled, type SwitchKey } from "../../content-library/phaseScope";
import { documentAnalysisEnabled } from "../../case-workspace/aiAnalysis";

export type CapabilityKey = ScopeKey | SwitchKey | "documentAnalysis";
export type CapabilitySet = Readonly<Record<CapabilityKey, boolean>>;

export const CAPABILITY_KEYS: readonly CapabilityKey[] = [
  ...(Object.keys(A2I_SCOPE) as ScopeKey[]),
  ...(Object.keys(SWITCH_BASE) as SwitchKey[]),
  "documentAnalysis",
];

type Env = Record<string, string | undefined>;
const SWITCHES: Record<SwitchKey | "documentAnalysis", (env: Env, context: CapabilityContext) => boolean> = {
  aiAnalysisText: aiAnalysisTextToUsers,
  appliedLaw: appliedLawEnabled,
  plainExplanations: plainExplanationsEnabled,
  deepAnalysis: deepIntakeAnalysis,
  researchStep: researchStepEnabled,
  sourcedQuestions: sourcedQuestionsEnabled,
  assistantLaw: assistantLawEnabled,
  checkedAnswers: checkedAnswersEnabled,
  strategy: strategyEnabled,
  caseUnderstanding: caseUnderstandingEnabled,
  caseReader: caseReaderEnabled,
  formFilling: formFillingEnabled,
  documentAnalysis: (env, context) => documentAnalysisEnabled(env, undefined, context.userId),
};

/** Whether `key` is on for this request: `context` names the env and the verified user (defaults: process.env, the request's user). */
export function capabilityOn(key: CapabilityKey, context: CapabilityContext = {}): boolean {
  if (key in A2I_SCOPE) return isInScope(key as ScopeKey, context);
  const env = context.env ?? (typeof process !== "undefined" ? process.env : {});
  return SWITCHES[key as SwitchKey | "documentAnalysis"](env, context);
}

/** Every capability's answer for one user (for /api/capabilities and the page's first render). */
export function capabilitySetFor(context: CapabilityContext = {}): CapabilitySet {
  return Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, capabilityOn(key, context)])) as CapabilitySet;
}

/** Everything off: the browser's answer before the server has given one. */
export const ALL_CAPABILITIES_OFF: CapabilitySet = Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, false])) as CapabilitySet;
