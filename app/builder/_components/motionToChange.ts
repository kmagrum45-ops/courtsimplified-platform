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
 * Three routes, each one plain line with the subrules it restates quoted from
 * the saved Family Law Rules (the stage map's own citations, familyStages.ts,
 * checked against docs/sources/corpus/family-law-rules.txt):
 *
 *   ASKING     an order already in place and the PERSON'S OWN wish to change
 *              the order, the support, parenting or payments ("I want to lower
 *              the support", "how do i get it lowered"), even if they were the
 *              respondent in the original case: r. 15 (5) motion to change
 *              (Form 15), r. 15 (2) final orders, and the consent carve-out it
 *              is "subject to", r. 15 (17) (Form 15C) and (18) (Form 15D,
 *              child support only).
 *   RESPONDING the person was SERVED with the other side's motion to change:
 *              r. 15 (9) response (Form 15B) or consent (Form 15C), r. 15 (10)
 *              the time. Someone served with anything else gets neither line
 *              (review 2026-10-14: "My ex served me a Motion to Change to
 *              increase it" was told to bring one). "I served my ex with a
 *              motion to change" is the person's own motion, not this.
 *   IF SERVED  only the other side wants the change ("My ex wants to reduce
 *              child support"): what r. 15 (9) and (10) provide if they are
 *              served, never "you bring a motion to change".
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
  "You were served with a motion to change. If you do not agree to the change, or want the court to make a different or additional change, you serve and file a response to motion to change (Form 15B). If you agree, you complete the consent motion to change (Form 15C), return a signed copy to the party making the motion, and give a copy to the assignee, if any. Either is due no later than 30 days after you receive the motion to change and its supporting documents if you live in Canada or the United States, and no later than 60 days in any other case.";

/** Restates r. 15 (9) and (10) for someone the other side may serve, without saying they were served. */
export const IF_SERVED_LINE =
  "If the other party brings a motion to change and you are served with it: if you do not agree to the change, you serve and file a response to motion to change (Form 15B); if you agree, you complete the consent motion to change (Form 15C) and return a signed copy to the party making the motion, and give a copy to the assignee, if any. Either is due no later than 30 days after you receive the motion to change and its supporting documents if you live in Canada or the United States, and no later than 60 days in any other case.";

const CHANGE_VERB = "(?:lower|reduc|chang|vary|varied|variation|increas|decreas|adjust|modif)\\w*";
const CHANGED = "(?:lowered|reduced|changed|varied|increased|decreased|adjusted|modified)";
const ORDER_THING = "(?:court order|order|support|child support|spousal support|custody|parenting(?: time| schedule)?|access|payments?|amount)";
/** What is changed: the order, what it sets, or "it"/"them" for it. "my lawyer", "of name" are not. */
const OBJECT = `(?:it|them|that|this|(?:the |my |our |his |her |their |this |that |what )?(?:\\w+ ){0,2}${ORDER_THING})`;
const ME = "\\b(?:i|we|i'm|im|i am|we're|we are)\\b";
const WANT = "(?:want|wants|wanted|need|needs|would like|'d like|wish|hope|hoping|plan|planning|trying|try|agree|agreed|asking|ask|going)";
const OTHER = "\\b(?:my ex(?:-?(?:wife|husband|partner))?|ex-?(?:wife|husband|partner)|he|she|they|the other (?:parent|party)|the (?:father|mother)|her lawyer|his lawyer)\\b";
const NOT_OTHER = "(?:(?!\\b(?:he|she|they|my ex)\\b)[^.!?\\n])";

/**
 * The person's own wish to change the order (review 2026-10-14): first person
 * with a want, or "how do I get it lowered", or "I can't keep paying".
 * A sentence whose subject is the other side ("My ex wants to reduce child
 * support") is not theirs.
 */
const OWN_ASK: RegExp[] = [
  // "I want to lower the support", "we both agree to lower it"
  new RegExp(`${ME}${NOT_OTHER}{0,70}\\b${WANT}\\b${NOT_OTHER}{0,25}\\b${CHANGE_VERB}\\s+${OBJECT}\\b`, "i"),
  // "I need the support lowered", "we want it changed"
  new RegExp(`${ME}${NOT_OTHER}{0,30}\\b${WANT}\\s+${OBJECT}\\s+${CHANGED}\\b`, "i"),
  // "how do i get it lowered", "how can we change the order"
  new RegExp(`\\bhow (?:do|can|could|would|should) (?:i|we)\\b${NOT_OTHER}{0,20}(?:\\b${CHANGE_VERB}\\s+${OBJECT}\\b|\\bget ${OBJECT}\\s+${CHANGED}\\b)`, "i"),
  // "i cant keep paying", "I can't afford the support"
  new RegExp(`${ME}${NOT_OTHER}{0,15}\\b(?:can'?t|cannot|can not) (?:keep (?:up|paying)|afford (?:to pay|the (?:support|payments?)|it))\\b`, "i"),
];

/** The other side wanting the change: "My ex is asking the court to reduce the support." */
const OTHER_ASKS = new RegExp(`${OTHER}[^.!?\\n]{0,40}\\b(?:${WANT}|filed|is going|says)\\b[^.!?\\n]{0,30}\\b${CHANGE_VERB}`, "i");

/*
 * WHOSE MOTION IS IT? (re-review 2026-10-14, after the patterns were patched
 * back and forth: "I filed my response to his motion" got the mover route,
 * then "I need an affidavit for the motion to change" got the responding
 * route). One principle: a route is given only when the sentence makes plain
 * whose motion it is. Words like response, reply, answer or affidavit never
 * decide it; only the motion's owner does. When it is not plain, no route is
 * given and the side question is asked: a wrong route is a serious error,
 * asking is cheap.
 */

/** Someone on the other side who serves or sends papers. */
const GIVER =
  "(?:\\b(?:my ex(?:-?(?:wife|husband|partner))?|ex-?(?:wife|husband|partner)|the other (?:parent|party|side))(?:'s lawyer)?|\\b(?:his|her|their) lawyer|\\bhe|\\bshe|\\bthey|\\b(?:a |the )?process server|\\bthe sheriff)\\b";

/** The other side's motion, said plainly. */
const OTHERS_MOTION: RegExp[] = [
  // "his motion to change", "my ex's motion to change", "the other parent's motion to change"
  /\b(?:his|her|their|my ex'?s|my ex-?(?:wife|husband|partner)'?s|the other (?:parent|party|side)'?s|the (?:father|mother)'?s)\s+(?:own\s+)?motion to change\b/i,
  // "the motion to change he served", "the motion to change she sent me"
  /\bmotion to change (?:that |which )?(?:he|she|they|my ex|the other (?:parent|party)) (?:served|sent|filed|brought|gave|mailed|delivered)\b/i,
  // "my ex served me a motion to change", "the process server handed me the motion to change"
  new RegExp(`${GIVER}[^.!?\\n]{0,30}\\b(?:served|sent|gave|handed|mailed|delivered) (?:me|us)\\b[^.!?\\n]{0,25}\\bmotion to change\\b`, "i"),
  // "my ex's lawyer served a motion to change on me"
  new RegExp(`${GIVER}[^.!?\\n]{0,30}\\bserved\\b[^.!?\\n]{0,25}\\bmotion to change\\b[^.!?\\n]{0,30}\\bon (?:me|us)\\b`, "i"),
  // "I got the motion to change package from his lawyer"
  new RegExp(`\\b(?:i|we) (?:got|received|was handed|were handed)\\b[^.!?\\n]{0,25}\\bmotion to change\\b[^.!?\\n]{0,40}\\bfrom ${GIVER}`, "i"),
  // "I was served with a motion to change", "we got served with the motion to change"
  /\b(?:i|we) (?:was|were|got|have been|'ve been|had been) served\b[^.!?\n]{0,30}\bmotion to change\b/i,
  // "the motion to change was served on me"
  /\bmotion to change\b[^.!?\n]{0,30}\b(?:was|were|got) served (?:on|upon) (?:me|us)\b/i,
];

/** The person's own motion, said plainly. */
const MY_MOTION: RegExp[] = [
  // "my motion to change", "our draft motion to change", "a draft motion to change"
  /\b(?:my|our) (?:own |draft )?motion to change\b|\bdraft motion to change\b/i,
  // "the motion to change I filed", "the motion to change we served"
  /\bmotion to change (?:that |which )?(?:i|we) (?:filed|served|brought|issued|sent)\b/i,
  // "I served my ex with a motion to change", "I filed a motion to change": the
  // motion is the verb's direct object.
  /\b(?:i|we) (?:served|filed|brought|issued)\s+(?:(?:him|her|them|my ex(?:-?(?:wife|husband|partner))?|the other (?:parent|party))\s+(?:with\s+)?)?(?:a |the )?motion to change\b(?!\s+(?:that\s+|which\s+)?(?:he|she|they|my ex)\b)/i,
];

const sentencesOf = (story: string) => story.split(/(?<=[.!?])\s+|\n+/).filter((sentence) => sentence.trim());

/** "I do not want the support lowered", "we never agreed to change it": a want said with a no is not an ask (re-check 2026-10-14). */
const NEGATED_WANT = new RegExp(`\\b(?:don'?t|do not|doesn'?t|does not|didn'?t|did not|never|not|won'?t|will not|wouldn'?t|would not|no longer)\\s+(?:\\w+\\s+)?${WANT}\\b`, "i");

function ownAsk(sentence: string): boolean {
  // Every place a match can start, not only the leftmost: "I don't want to
  // change anything but I want to lower the support" asks in its second half
  // (review 2026-10-14).
  return OWN_ASK.some((pattern) => {
    const sticky = new RegExp(pattern.source, "iy");
    for (let at = 0; at < sentence.length; at += 1) {
      if (at > 0 && /\w/.test(sentence[at - 1]) && /\w/.test(sentence[at])) continue;
      sticky.lastIndex = at;
      const match = sticky.exec(sentence);
      if (match && !NEGATED_WANT.test(match[0])) return true;
    }
    return false;
  });
}

/** The sentence plainly says the motion to change is the other side's. */
export function othersMotion(sentence: string): boolean {
  return OTHERS_MOTION.some((pattern) => pattern.test(sentence));
}

/** The sentence plainly says the motion to change is the person's own, or asks for the change in their own words. */
export function myMotion(sentence: string): boolean {
  return MY_MOTION.some((pattern) => pattern.test(sentence)) || ownAsk(sentence);
}

/** The person asks, in their own words, for the order to be changed. */
export function asksToChangeOrder(story: string): boolean {
  return sentencesOf(story).some((sentence) => myMotion(sentence));
}

/** The other side wants the order changed (and the person has not said they were served yet). */
export function otherSideAsksToChange(story: string): boolean {
  return sentencesOf(story).some((sentence) => OTHER_ASKS.test(sentence) && !ownAsk(sentence));
}

/** Served with, or holding, the other side's motion to change. */
export function servedWithMotionToChange(story: string): boolean {
  return sentencesOf(story).some((sentence) => othersMotion(sentence));
}

/** Urgency or a temporary order: the rule 14 card stays (interim relief is a rule 14 motion). */
const TEMPORARY_OR_URGENT = /\b(?:temporary|interim|urgent|urgently|emergency|right away|immediately|asap|before the hearing|in the meantime)\b/i;

export type MotionToChangeLead = {
  kind: "asking" | "responding" | "if-served";
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
 *
 *   the other side's motion, said plainly -> how to respond (r. 15 (9), (10));
 *                                            wins over everything else, because
 *                                            being served is a fact with a deadline
 *   their own motion or wish, said plainly -> the motion to change, even if they
 *                                            were the respondent in the original case
 *   only the other side wanting a change  -> what applies if they are served
 *   whose motion it is not plain          -> nothing (the side question is asked)
 */
export function motionToChangeLead(courtPath: string, story: string, existingOrder: boolean, responding = false): MotionToChangeLead | null {
  if (courtPath !== "family" || !existingOrder) return null;
  // "nothing urgent", "it's not urgent" are not urgency.
  const replacesTemporaryMotionCard = !TEMPORARY_OR_URGENT.test(story.replace(/\b(?:nothing|not|no|isn'?t|is not)\b[^.!?\n]{0,15}\b(?:urgent|an emergency|temporary)\b/gi, ""));
  const responseRules = () => quotes(SERVED_WITH_MOTION_TO_CHANGE_STEP, ["r. 15 (9)", "r. 15 (10)"]);
  if (servedWithMotionToChange(story)) {
    const rules = responseRules();
    return rules
      ? { kind: "responding", heading: "Answering the motion to change you were served with", line: RESPOND_TO_MOTION_TO_CHANGE_LINE, rules, replacesTemporaryMotionCard }
      : null;
  }
  if (asksToChangeOrder(story)) {
    const rules = quotes(MOTION_TO_CHANGE_STEP, ["r. 15 (5)", "r. 15 (2)", "r. 15 (17)", "r. 15 (18)"]);
    return rules
      ? { kind: "asking", heading: "Changing the order you already have", line: MOTION_TO_CHANGE_LINE, rules, replacesTemporaryMotionCard }
      : null;
  }
  if (!responding && otherSideAsksToChange(story)) {
    const rules = responseRules();
    // Their motion, not the person's: the rule 14 card is left as it is.
    return rules
      ? { kind: "if-served", heading: "If you are served with their motion to change", line: IF_SERVED_LINE, rules, replacesTemporaryMotionCard: false }
      : null;
  }
  return null;
}
