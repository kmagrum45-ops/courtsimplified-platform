/**
 * "HOW DO I GET IT LOWERED?" ANSWERED PLAINLY, FROM THE RULE ITSELF
 * (2026-10-14, walkthrough MC, ledger V4 and C13).
 *
 * A father paying child support under a 2022 order lost his job and asked
 * "how do i get it lowered". The first rule card on his results said "Family
 * Rule 14 governs motions for temporary orders" -- a catalogue row for the
 * motion stage, about temporary orders, not his final order -- and nothing
 * on the page answered his question in a line.
 *
 * Two routes, each one plain line with the subrules it restates quoted from
 * the saved Family Law Rules (the stage map's own citations, familyStages.ts,
 * checked against docs/sources/corpus/family-law-rules.txt):
 *
 *   ASKING     an order already in place and words asking to change the order,
 *              the support, parenting or payments: r. 15 (5) motion to change
 *              (Form 15), r. 15 (2) final orders, and the consent carve-out it
 *              is "subject to", r. 15 (17) (Form 15C) and (18) (Form 15D,
 *              child support only).
 *   RESPONDING the person was SERVED with the other side's motion to change:
 *              r. 15 (9) response (Form 15B) or consent (Form 15C), r. 15 (10)
 *              the time. Someone served with anything else gets neither line
 *              (review 2026-10-14: "My ex served me a Motion to Change to
 *              increase it" was told to bring one).
 *
 * The temporary-motion card (rule 14) is hidden only when the story asks for
 * neither urgency nor a temporary order: rule 15 has no interim route, and
 * rule 14 is where interim relief lives.
 *
 * Information about the route, never a prediction (CLAUDE.md sections 2, 3).
 * "Final" is in the line because rule 15 is about final orders; the line does
 * not claim the person's order is final.
 *
 * Pure: no I/O.
 */

import type { RuleCitation } from "../../../src/lib/case-system/stage-map/citations";
import { findStage } from "../../../src/lib/case-system/stage-map/stageMap";

/** The stage map's steps whose rules are the quotes shown. */
export const MOTION_TO_CHANGE_STEP = "family:both:asking-to-change-final-order";
export const SERVED_WITH_MOTION_TO_CHANGE_STEP = "family:both:served-with-motion-to-change";

/** Restates r. 15 (5), with the consent carve-out of r. 15 (17) and (18) it is subject to. */
export const MOTION_TO_CHANGE_LINE =
  "To change a final order, you bring a motion to change (Form 15). If you, the other party and any assignee all agree to the change, you file a consent motion to change (Form 15C) instead, or a consent motion to change child support (Form 15D) if only child support is changing.";

/** Restates r. 15 (9) and (10). */
export const RESPOND_TO_MOTION_TO_CHANGE_LINE =
  "You were served with a motion to change. If you do not agree to the change, or want the court to make a different or additional change, you serve and file a response to motion to change (Form 15B). If you agree, you complete the consent motion to change (Form 15C) and return a signed copy to the party making the motion. Either is due no later than 30 days after you receive the motion to change and its supporting documents if you live in Canada or the United States, and no later than 60 days in any other case.";

const CHANGE_VERB = "(?:lower|reduc|chang|vary|varied|variation|increas|decreas|adjust|modif)\\w*";
const ORDER_THING = "(?:court order|order|support|child support|spousal support|custody|parenting(?: time| schedule)?|access|payments?|amount)";
/** Words asking to change the order itself, or what it sets: support, parenting, payments. */
const ASKS_TO_CHANGE: RegExp[] = [
  // "change the support order", "lower my child support", "reduce the payments"
  new RegExp(`\\b${CHANGE_VERB}\\s+(?:the |my |our |his |her |their |this |that |what )?(?:\\w+ ){0,2}${ORDER_THING}\\b`, "i"),
  // "the support to be lowered", "my payments reduced", "order changed"
  new RegExp(`\\b${ORDER_THING}\\b[^.!?\\n]{0,30}\\b(?:lowered|reduced|changed|varied|increased|decreased|adjusted|modified)\\b`, "i"),
  // "how do i get it lowered" (in a story that names an order)
  /\bget (?:it|them|that) (?:lowered|reduced|changed|varied|increased|decreased|adjusted)\b/i,
  // "i cant keep paying", "can't afford the support"
  /\b(?:can'?t|cannot|can not) (?:keep (?:up|paying)|afford (?:to pay|the (?:support|payments?)|it))\b/i,
];

/** The person was served with the other side's motion to change. */
const SERVED_MOTION_TO_CHANGE: RegExp[] = [
  /\bserved\b[^.!?\n]{0,40}\bmotion to change\b/i,
  /\bmotion to change\b[^.!?\n]{0,40}\b(?:served (?:on )?me|was served|got served)\b/i,
  /\b(?:my ex|he|she|they|the other (?:parent|party)|the mother|the father)\b[^.!?\n]{0,30}\b(?:filed|brought|started|sent me|gave me)\b[^.!?\n]{0,20}\bmotion to change\b/i,
];

/** Urgency or a temporary order: the rule 14 card stays (interim relief is a rule 14 motion). */
const TEMPORARY_OR_URGENT = /\b(?:temporary|interim|urgent|urgently|emergency|right away|immediately|asap|before the hearing|in the meantime)\b/i;

export function asksToChangeOrder(story: string): boolean {
  return ASKS_TO_CHANGE.some((pattern) => pattern.test(story));
}

export function servedWithMotionToChange(story: string): boolean {
  return SERVED_MOTION_TO_CHANGE.some((pattern) => pattern.test(story));
}

export type MotionToChangeLead = {
  kind: "asking" | "responding";
  heading: string;
  line: string;
  rules: RuleCitation[];
  /** False when the story is urgent or asks for a temporary order: the rule 14 card stays. */
  replacesTemporaryMotionCard: boolean;
};

function quotes(stepId: string, pinpoints: string[]): RuleCitation[] | null {
  const stage = findStage(stepId);
  const rules = pinpoints.map((pinpoint) => stage?.rules.find((rule) => rule.pinpoint === pinpoint));
  return rules.every(Boolean) ? (rules as RuleCitation[]) : null;
}

/**
 * The lead for a family story with an existing order, or null. `existingOrder`
 * is the page's reading (existingFamilyOrder); `responding` its reading that
 * the person was served with the other side's papers (respondingInFamilyStory).
 * Null too if a saved quote cannot be found, so nothing unquoted is shown.
 */
export function motionToChangeLead(courtPath: string, story: string, existingOrder: boolean, responding = false): MotionToChangeLead | null {
  if (courtPath !== "family" || !existingOrder) return null;
  // "nothing urgent", "it's not urgent" are not urgency.
  const replacesTemporaryMotionCard = !TEMPORARY_OR_URGENT.test(story.replace(/\b(?:nothing|not|no|isn'?t|is not)\b[^.!?\n]{0,15}\b(?:urgent|an emergency|temporary)\b/gi, ""));
  if (servedWithMotionToChange(story)) {
    const rules = quotes(SERVED_WITH_MOTION_TO_CHANGE_STEP, ["r. 15 (9)", "r. 15 (10)"]);
    return rules
      ? { kind: "responding", heading: "Answering the motion to change you were served with", line: RESPOND_TO_MOTION_TO_CHANGE_LINE, rules, replacesTemporaryMotionCard }
      : null;
  }
  // Served with something else: not theirs to bring, and not this route.
  if (responding || !asksToChangeOrder(story)) return null;
  const rules = quotes(MOTION_TO_CHANGE_STEP, ["r. 15 (5)", "r. 15 (2)", "r. 15 (17)", "r. 15 (18)"]);
  return rules
    ? { kind: "asking", heading: "Changing the order you already have", line: MOTION_TO_CHANGE_LINE, rules, replacesTemporaryMotionCard }
    : null;
}
