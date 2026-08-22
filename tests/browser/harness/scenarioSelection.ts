/**
 * Scenario selection for the browser quality harness.
 *
 * Scenarios come from scripts/verification/scenarioRegistry.ts rather than being
 * hand-written here, so the harness widens automatically as that library grows.
 *
 * Two things about the registry matter when driving it through a browser:
 *
 * 1. It carries stages the intake UI cannot express. The registry cycles through
 *    ten stages including "service-uncertain" and "default-review"; the Case
 *    stage select offers nine, and neither of those. Those scenarios are mapped
 *    to the closest selectable stage and the substitution is recorded, so a
 *    report never implies a stage was exercised when it was not.
 *
 * 2. Its province can be "not-sure" (index 28), which the location gate does not
 *    accept. Those are excluded from browser runs.
 */

import { baseScenarios, type RegistryScenario } from "../../../scripts/verification/scenarioRegistry";

/** Stage values the intake Case stage select actually offers. */
export const SELECTABLE_STAGES = [
  "not-sure",
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "urgent",
] as const;

export type SelectableStage = (typeof SELECTABLE_STAGES)[number];

/** Registry stages with no matching option, mapped to the nearest one. */
const STAGE_SUBSTITUTIONS: Record<string, SelectableStage> = {
  "service-uncertain": "already-started",
  "default-review": "already-started",
};

export type SelectedScenario = {
  scenario: RegistryScenario;
  stage: SelectableStage;
  /** Set when the registry stage could not be selected in the UI. */
  stageSubstitutedFrom: string | null;
};

function resolveStage(scenario: RegistryScenario): SelectedScenario | null {
  if ((SELECTABLE_STAGES as readonly string[]).includes(scenario.stage)) {
    return { scenario, stage: scenario.stage as SelectableStage, stageSubstitutedFrom: null };
  }

  const substitute = STAGE_SUBSTITUTIONS[scenario.stage];
  if (!substitute) return null;

  return { scenario, stage: substitute, stageSubstitutedFrom: scenario.stage };
}

function isBrowserDrivable(scenario: RegistryScenario): boolean {
  return scenario.intakeFacts?.province === "Ontario";
}

/**
 * Deterministic, court-path-balanced selection. Takes scenarios round-robin
 * across the three paths so a batch of any size stays mixed, and prefers stage
 * variety over registry order so a batch is not three copies of one stage.
 */
export function selectScenarios(limit: number): SelectedScenario[] {
  const byPath = new Map<string, SelectedScenario[]>();

  for (const scenario of baseScenarios) {
    if (!isBrowserDrivable(scenario)) continue;
    const resolved = resolveStage(scenario);
    if (!resolved) continue;
    const bucket = byPath.get(scenario.courtPath) || [];
    bucket.push(resolved);
    byPath.set(scenario.courtPath, bucket);
  }

  // Order each bucket so distinct stages come first, then the rest in registry
  // order. Without this the first N of any bucket repeat a handful of stages.
  for (const [path, bucket] of byPath) {
    const seenStage = new Set<string>();
    const firstOfEachStage: SelectedScenario[] = [];
    const remainder: SelectedScenario[] = [];
    for (const entry of bucket) {
      if (seenStage.has(entry.stage)) remainder.push(entry);
      else { seenStage.add(entry.stage); firstOfEachStage.push(entry); }
    }
    byPath.set(path, [...firstOfEachStage, ...remainder]);
  }

  const paths = ["small-claims", "family", "civil"];
  const selected: SelectedScenario[] = [];
  for (let round = 0; selected.length < limit; round += 1) {
    let addedThisRound = false;
    for (const path of paths) {
      const bucket = byPath.get(path) || [];
      const entry = bucket[round];
      if (!entry) continue;
      selected.push(entry);
      addedThisRound = true;
      if (selected.length === limit) break;
    }
    if (!addedThisRound) break;
  }

  return selected;
}
