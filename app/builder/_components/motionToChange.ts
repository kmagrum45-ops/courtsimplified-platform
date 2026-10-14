/**
 * "HOW DO I GET IT LOWERED?" ANSWERED PLAINLY, FROM THE RULE ITSELF
 * (2026-10-14, walkthrough MC, ledger V4 and the onTopic failure).
 *
 * A father paying child support under a 2022 order lost his job and asked
 * "how do i get it lowered". The first rule card on his results said "Family
 * Rule 14 governs motions for temporary orders" -- a catalogue row for the
 * motion stage, about temporary orders, not his final order -- and nothing
 * on the page answered his question in a line.
 *
 * For a family story with an order already in place and words asking to
 * change it, the results now lead with one plain line and the two subrules it
 * restates, quoted from the saved Family Law Rules (the same citations the
 * stage map's "asking to change a final order" step carries, read from
 * familyStages.ts and checked against the corpus by test:stage-map):
 *
 *   r. 15 (5)  a party who wants to change a final order or agreement serves
 *              and files a motion to change (Form 15);
 *   r. 15 (2)  rule 15 applies to a final order, a filed support agreement or
 *              a filed arbitration award.
 *
 * It is information about the route, never a prediction of the outcome
 * (CLAUDE.md sections 2 and 3). "Final" is in the line because rule 15 is
 * about final orders; a temporary order is changed another way, and the line
 * does not claim his order is final.
 *
 * Pure: no I/O.
 */

import type { RuleCitation } from "../../../src/lib/case-system/stage-map/citations";
import { findStage } from "../../../src/lib/case-system/stage-map/stageMap";

/** The stage map's step for asking to change a final order; its rules are the quotes shown. */
export const MOTION_TO_CHANGE_STEP = "family:both:asking-to-change-final-order";

/** The plain line. Each part restates r. 15 (5): the person who wants a change brings a motion to change, Form 15. */
export const MOTION_TO_CHANGE_LINE = "To change a final order, you bring a motion to change (Form 15).";

/** Words asking for an order to be changed: lowered, reduced, changed, varied, increased, or not able to keep paying it. */
const ASKS_TO_CHANGE =
  /\b(?:lower(?:ed|ing)?|reduc(?:e|ed|ing|tion)|chang(?:e|ed|ing)|var(?:y|ied|iation)|increas(?:e|ed)|decreas(?:e|ed)|adjust(?:ed)?|can'?t (?:keep (?:up|paying)|afford|pay)|cannot (?:keep (?:up|paying)|afford|pay)|too (?:high|much))\b/i;

export function asksToChangeOrder(story: string): boolean {
  return ASKS_TO_CHANGE.test(story);
}

export type MotionToChangeLead = { line: string; rules: RuleCitation[] };

/**
 * The lead for a family story with an existing order that asks to change it,
 * or null. `existingOrder` is the page's own reading (existingFamilyOrder).
 * Null too if the saved quotes cannot be found, so nothing unquoted is shown.
 */
export function motionToChangeLead(courtPath: string, story: string, existingOrder: boolean): MotionToChangeLead | null {
  if (courtPath !== "family" || !existingOrder || !asksToChangeOrder(story)) return null;
  const stage = findStage(MOTION_TO_CHANGE_STEP);
  const byPinpoint = (pinpoint: string) => stage?.rules.find((rule) => rule.pinpoint === pinpoint);
  const rules = [byPinpoint("r. 15 (5)"), byPinpoint("r. 15 (2)")].filter((rule): rule is RuleCitation => Boolean(rule));
  return rules.length === 2 ? { line: MOTION_TO_CHANGE_LINE, rules } : null;
}
