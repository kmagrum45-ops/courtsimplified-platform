/**
 * What a reader is shown for a step that has no written answer yet: the
 * step's deadlines and the rules that apply to it, from the stage map.
 *
 * WHY (2026-10-05). Only the Small Claims steps have published answers
 * (stageAnswers.published.json). For all 43 civil and 47 family steps the case
 * page said "We do not have reviewed next steps for that stage yet" -- even
 * though every one of those steps has its deadlines and rules recorded in the
 * stage map, every quote checked against the vendored text by
 * test:stage-map. That was the reader's own procedure, sourced and checked,
 * withheld because nobody had written prose around it.
 *
 * WHAT IT IS. Nothing written here. The deadline section is
 * `renderDeadlineSection` -- the same function a published block's deadline
 * section must be byte-identical to -- and the rules are the provisions'
 * own words with their pinpoints. Both texts are in the content inventory
 * (contentInventory.ts), so the output guard sees them like any other
 * content, and they reach the reader through the same render door.
 *
 * A written answer, when one is published, replaces this.
 */

import type { CaseStage } from "../case-system/stage-map/stageMap";
import { SOURCE_NAMES } from "../case-system/stage-map/citations";
import { renderDeadlineSection } from "./stageAnswers";

export type StageRulesText = {
  /** The step's name, as the stage map gives it. */
  title: string;
  /** The deadline section, or null where the step sets none. */
  deadlines: string | null;
  /** Each rule, quoted, or null where the step records none. */
  rules: string | null;
};

export function stageRulesText(stage: CaseStage): StageRulesText {
  const rules = stage.rules
    .map((rule) => `${SOURCE_NAMES[rule.sourceId]}, ${rule.pinpoint}: “${rule.quote}”`)
    .join("\n\n");
  return {
    title: stage.title,
    deadlines: renderDeadlineSection(stage.deadlines),
    rules: rules || null,
  };
}
