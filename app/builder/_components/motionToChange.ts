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
 * A READING, PUT TO THE PERSON (CLAUDE.md s. 4; re-review 2026-10-14): which
 * route applies is read from their words, so it is shown as "From what you
 * told us, it sounds like ... Is that right?" with Yes, the other route and
 * Not sure. No route text is shown until they answer (routeShown,
 * MotionToChangeRoute.tsx), so a misreading costs one click, not a wrong
 * instruction.
 *
 * Information about the route, never a prediction (CLAUDE.md sections 2, 3).
 * "Final" is in the line because rule 15 is about final orders; the line does
 * not claim the person's order is final.
 *
 * Pure: no I/O.
 */

import { sentences as splitSentences } from "../../../src/lib/case-system/sentences";
import type { RuleCitation } from "../../../src/lib/case-system/stage-map/citations";
import { findStage } from "../../../src/lib/case-system/stage-map/stageMap";

/** The stage map's steps whose rules are the quotes shown. */
export const MOTION_TO_CHANGE_STEP = "family:both:asking-to-change-final-order";
export const SERVED_WITH_MOTION_TO_CHANGE_STEP = "family:both:served-with-motion-to-change";

/** Restates r. 15 (5), with the consent carve-out of r. 15 (17) and (18) it is subject to. */
export const MOTION_TO_CHANGE_LINE =
  "To change a final order, you bring a motion to change (Form 15). If you, the other party and any assignee all agree to the change, you file a consent motion to change (Form 15C) instead, or a consent motion to change child support (Form 15D) if only child support is changing.";

/*
 * The moving party's starting document (walkthrough run 38525903567, FM):
 * restates r. 15 (5), quoted beside it from the stage map. No Form 15 draft
 * exists yet, so the line says so instead of offering one.
 */
export const MOTION_TO_CHANGE_START_SAY =
  "A motion to change is started with a motion to change (Form 15), unless you, the other party and any assignee all agree to the change: then it is a consent motion to change (Form 15C), or Form 15D if only child support is changing. What you have recorded does not show one filed. A working draft of Form 15 is not offered here yet. The official form is under \u201cCheck official forms\u201d.";

/**
 * r. 15 (5), which is "Subject to subrules (17) and (18)", and those two, the
 * rules MOTION_TO_CHANGE_START_SAY restates, from the stage map; null if any
 * cannot be found (then nothing is shown).
 */
export function motionToChangeStartRules(): RuleCitation[] | null {
  return quotes(MOTION_TO_CHANGE_STEP, ["r. 15 (5)", "r. 15 (17)", "r. 15 (18)"]);
}

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
const OTHER = "\\b(?:my ex(?:-?(?:wife|husband|partner))?|ex-?(?:wife|husband|partner)|he|she|they|the other (?:parent|party)|the (?:father|mother)|her lawyer|his lawyer)\\b";
const WANT_PRESENT = "(?:want|wants|need|needs|would like|'d like|wish|hope|hoping|plan|planning|am planning|trying|agree|ask|am asking)";

/*
 * THE PERSON'S OWN WISH, TIGHT (re-review 2026-10-14). The person themselves,
 * in the present, wanting the change: "I want to lower the support", "I need
 * the support lowered", "how do I get it lowered", "I can't keep paying".
 * At most three words between the want and the change, and none of them a
 * blocking verb ("stop him from changing", "make sure nobody can change") or
 * someone else ("the judge refuses to lower", "the father is asking to").
 * Past wants ("we agreed to change it last year") are not asks.
 */
// "I'd like" has no space before the want.
const SUBJECT = "\\b(?:i|we)(?:'m| am|'re| are)?(?:\\s+|(?='d\\b))(?:really\\s+|just\\s+|also\\s+|still\\s+|both\\s+|all\\s+|now\\s+)*";
const BLOCKED_WORD =
  "(?:stop|stopping|prevent|preventing|fight|fighting|oppose|opposing|refuse|refusing|block|blocking|resist|challenge|avoid|make|ensure|keep|him|her|them|he|she|they|the|father|mother|judge|court|nobody|anyone|anybody|someone|somebody|no|not|never)";
const WINDOW = `(?:(?!${BLOCKED_WORD}\\b)\\w+\\s+){0,3}?`;
/** "ask the court to" is the person's own ask, not a third party. */
const ASK_COURT = "(?:ask (?:the )?(?:court|judge) to\\s+)?";
const OWN_ASK: RegExp[] = [
  // "I want to lower the support", "we both agree to lower it", "I want to ask the court to reduce it"
  new RegExp(`${SUBJECT}${WANT_PRESENT}\\s+to\\s+${ASK_COURT}${WINDOW}${CHANGE_VERB}\\s+${OBJECT}\\b`, "i"),
  // "I got the form ... and want to lower the support" (a sentence the person is the subject of)
  new RegExp(`^\\s*(?:i|we)\\b[^.!?\\n]*\\b(?:and|but|so)\\s+(?:i\\s+|we\\s+)?(?:really\\s+|also\\s+|now\\s+)?(?:want|need|would like)\\s+to\\s+${ASK_COURT}${WINDOW}${CHANGE_VERB}\\s+${OBJECT}\\b`, "i"),
  // "I need the support lowered", "we want it changed"
  new RegExp(`${SUBJECT}(?:want|need|would like|'d like)\\s+${OBJECT}\\s+${CHANGED}\\b`, "i"),
  // "how do i get it lowered", "how can we change the order"
  new RegExp(`\\bhow (?:do|can|could) (?:i|we)\\s+(?:get\\s+${OBJECT}\\s+${CHANGED}|${ASK_COURT}${CHANGE_VERB}\\s+${OBJECT})\\b`, "i"),
  // "I need to get the support lowered"
  new RegExp(`${SUBJECT}(?:want|need|would like|'d like)\\s+to\\s+get\\s+${OBJECT}\\s+${CHANGED}\\b`, "i"),
  // An answer given without "I": "would like the support reduced", "need it lowered"
  new RegExp(`^\\s*(?:would like|'d like|want|need)\\s+(?:to\\s+get\\s+)?${OBJECT}\\s+${CHANGED}\\b`, "i"),
  // "i cant keep paying", "I can't afford the support"
  new RegExp(`${SUBJECT}(?:can'?t|cannot|can not) (?:keep (?:up|paying)|afford (?:to pay|the (?:support|payments?)|it))\\b`, "i"),
];

/** The other side wanting the change: "My ex is asking the court to reduce the support." */
const OTHER_ASKS = new RegExp(`${OTHER}[^.!?\\n]{0,40}\\b(?:wants?|needs?|is asking|asks|asked|is trying|tries|filed|is going|says|plans?)\\b[^.!?\\n]{0,30}\\b${CHANGE_VERB}`, "i");

/*
 * WHOSE MOTION IS IT? (re-review 2026-10-14, after the patterns were patched
 * back and forth). A route is given only when the sentence makes plain whose
 * motion it is. Words like response, reply, answer, letter, date or affidavit
 * never decide it; only the motion's owner does. When it is not plain, no
 * route is given and the side question is asked. And whatever is read is
 * still only a suggestion the person confirms before the route is shown
 * (MotionToChangeRoute.tsx).
 */

/** Someone on the other side who serves or sends papers. */
const GIVER =
  "(?:\\b(?:my ex(?:-?(?:wife|husband|partner))?|ex-?(?:wife|husband|partner)|the other (?:parent|party|side))(?:'s lawyer)?|\\b(?:his|her|their) lawyer|\\bhe|\\bshe|\\bthey|\\b(?:a |the )?process server|\\bthe sheriff)\\b";
/** Only an article or the other side's possessive between a verb and the motion it hands over. */
const HANDED_MOTION = "(?:(?:a|an|the|his|her|their)\\s+)?motion to change\\b";

/** The other side's motion, owned in so many words: it wins over the person's own ask. */
const OTHERS_MOTION_OWNED: RegExp[] = [
  // "his motion to change", "my ex's motion to change", "the other parent's motion to change"
  /\b(?:his|her|their|my ex'?s|my ex-?(?:wife|husband|partner)'?s|the other (?:parent|party|side)'?s|the (?:father|mother)'?s)\s+(?:own\s+)?motion to change\b/i,
  // "the motion to change he served", "the motion to change she sent me"
  /\bmotion to change (?:that |which )?(?:he|she|they|my ex|the other (?:parent|party)|the (?:mother|father)) (?:served|sent|filed|brought|gave|mailed|delivered)\b/i,
  // "My ex filed a motion to change", "he has brought a motion to change"
  new RegExp(`(?:${OTHER}|\\bthe other side)(?:'s lawyer)?\\s+(?:has\\s+|have\\s+|just\\s+|already\\s+)*(?:filed|brought|started|issued|served)\\s+${HANDED_MOTION}`, "i"),
];
/** The other side's motion handed over: it counts only when the person's own ask is not in the story too. */
const OTHERS_MOTION_HANDED: RegExp[] = [
  // "my ex served me a motion to change", "the process server handed me the motion to change"
  new RegExp(`${GIVER}[^.!?\\n]{0,30}?\\b(?:served|sent|gave|handed|mailed|delivered) (?:me|us)\\s+${HANDED_MOTION}`, "i"),
  // "my ex's lawyer served a motion to change on me"
  new RegExp(`${GIVER}[^.!?\\n]{0,30}?\\bserved\\s+${HANDED_MOTION}[^.!?\\n]{0,30}\\bon (?:me|us)\\b`, "i"),
  // "I got the motion to change package from his lawyer"
  new RegExp(`\\b(?:i|we) (?:got|received|was handed|were handed)\\s+${HANDED_MOTION}[^.!?\\n]{0,40}\\bfrom ${GIVER}`, "i"),
  // "I was served with a motion to change", "we got served with the motion to change"
  new RegExp(`\\b(?:i|we)(?:\\s+(?:was|were|got|have been|had been)|'ve been)\\s+served (?:with\\s+)?${HANDED_MOTION}`, "i"),
  // "the motion to change was served on me"
  /\bmotion to change\b[^.!?\n]{0,30}\b(?:was|were|got) served (?:on|upon) (?:me|us)\b/i,
];
/** A motion with an outcome or a year behind it is not one to answer now. */
const PAST_MOTION = /\b(?:dismissed|withdrawn|withdrew|decided|heard|ordered|granted|denied|struck|refused|thrown out|(?:19|20)\d\d|years? ago|last year)\b/i;

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

// The shared splitter: "Ltd." does not end a sentence (sentences.ts).
const sentencesOf = (story: string) => splitSentences(story);

/** "I do not want the support lowered": a want said with a no is not an ask (kept as a second guard). */
const NEGATED_WANT = /\b(?:don'?t|do not|doesn'?t|does not|didn'?t|did not|never|not|won'?t|will not|wouldn'?t|would not|no longer)\s+(?:\w+\s+)?(?:want|need|would like|wish|hope|plan|agree|ask)\b/i;

function ownAsk(sentence: string): boolean {
  // Every place a match can start, not only the leftmost: "I don't want to
  // change anything but I want to lower the support" asks in its second half.
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

/** How plainly a sentence says the motion is the other side's: owned in so many words, handed over, or not at all. */
export function othersMotion(sentence: string): "owned" | "handed" | null {
  if (PAST_MOTION.test(sentence)) return null;
  if (OTHERS_MOTION_OWNED.some((pattern) => pattern.test(sentence))) return "owned";
  if (OTHERS_MOTION_HANDED.some((pattern) => pattern.test(sentence))) return "handed";
  return null;
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

/** Served with, or holding, the other side's motion to change, said plainly. */
export function servedWithMotionToChange(story: string): boolean {
  return sentencesOf(story).some((sentence) => othersMotion(sentence) !== null);
}

/** Urgency or a temporary order: the rule 14 card stays (interim relief is a rule 14 motion). */
const TEMPORARY_OR_URGENT = /\b(?:temporary|interim|urgent|urgently|emergency|right away|immediately|asap|before the hearing|in the meantime)\b/i;

export type MotionToChangeKind = "asking" | "responding" | "if-served";

export type MotionToChangeLead = {
  kind: MotionToChangeKind;
  /**
   * What the site read, put to the person as a question (CLAUDE.md s. 4):
   * "it sounds like the other side served you with a motion to change". The
   * route is shown only once they say yes (routeShown).
   */
  reading: string;
  heading: string;
  line: string;
  rules: RuleCitation[];
  /** False when the story is urgent or asks for a temporary order: the rule 14 card stays. */
  replacesTemporaryMotionCard: boolean;
  /** The other route, for "No" ("No, I'm bringing it" / "No, the other side is bringing it"). */
  alternate: Omit<MotionToChangeLead, "alternate" | "alternateLabel"> | null;
  /** The button that shows the other route. */
  alternateLabel: string;
};

function quotes(stepId: string, pinpoints: string[]): RuleCitation[] | null {
  const stage = findStage(stepId);
  const rules = pinpoints.map((pinpoint) => stage?.rules.find((rule) => rule.pinpoint === pinpoint));
  return rules.every(Boolean) ? (rules as RuleCitation[]) : null;
}

type Route = Omit<MotionToChangeLead, "alternate" | "alternateLabel">;

function route(kind: MotionToChangeKind, replacesTemporaryMotionCard: boolean): Route | null {
  if (kind === "asking") {
    const rules = quotes(MOTION_TO_CHANGE_STEP, ["r. 15 (5)", "r. 15 (2)", "r. 15 (17)", "r. 15 (18)"]);
    return rules
      ? { kind, reading: "you want to ask the court to change the order", heading: "Changing the order you already have", line: MOTION_TO_CHANGE_LINE, rules, replacesTemporaryMotionCard }
      : null;
  }
  const rules = quotes(SERVED_WITH_MOTION_TO_CHANGE_STEP, ["r. 15 (9)", "r. 15 (10)"]);
  if (!rules) return null;
  return kind === "responding"
    ? { kind, reading: "the other side served you with a motion to change", heading: "Answering the motion to change you were served with", line: RESPOND_TO_MOTION_TO_CHANGE_LINE, rules, replacesTemporaryMotionCard }
    : // Their motion, not the person's: the rule 14 card is left as it is.
      { kind, reading: "the other side wants the order changed", heading: "If you are served with their motion to change", line: IF_SERVED_LINE, rules, replacesTemporaryMotionCard: false };
}

/**
 * The lead for a family story with an existing order, or null. `existingOrder`
 * is the page's reading (existingFamilyOrder); `responding` its reading that
 * the person was served with the other side's papers (respondingInFamilyStory).
 * Null too if a saved quote cannot be found, so nothing unquoted is shown.
 *
 *   the other side's motion, owned in so many words -> respond (r. 15 (9), (10));
 *                                    wins over an own ask: being served has a deadline
 *   their motion handed over, and no own ask         -> respond
 *   handed over AND an own ask                       -> nothing (not plain)
 *   their own motion or wish, said plainly           -> the motion to change, even if
 *                                    they were the respondent in the original case
 *   only the other side wanting a change             -> what applies if they are served
 *   whose motion it is not plain, or a past motion   -> nothing (the side question is asked)
 *
 * Whatever it reads is a suggestion: MotionToChangeRoute asks "Is that right?"
 * before any route is shown.
 */
export function motionToChangeLead(courtPath: string, story: string, existingOrder: boolean, responding = false): MotionToChangeLead | null {
  if (courtPath !== "family" || !existingOrder) return null;
  // "nothing urgent", "it's not urgent" are not urgency.
  const replacesTemporaryMotionCard = !TEMPORARY_OR_URGENT.test(story.replace(/\b(?:nothing|not|no|isn'?t|is not)\b[^.!?\n]{0,15}\b(?:urgent|an emergency|temporary)\b/gi, ""));
  const sentences = sentencesOf(story);
  const others = sentences.map((sentence) => othersMotion(sentence));
  const owned = others.includes("owned");
  const handed = others.includes("handed");
  const mine = sentences.some((sentence) => myMotion(sentence));

  let kind: MotionToChangeKind | null = null;
  if (owned) kind = "responding";
  else if (handed) kind = mine ? null : "responding";
  else if (mine) kind = "asking";
  else if (!responding && otherSideAsksToChange(story)) kind = "if-served";
  if (!kind) return null;

  const main = route(kind, replacesTemporaryMotionCard);
  if (!main) return null;
  // "No, the other side is bringing it" is not "I was served": it gets what
  // applies IF they are served, never "You were served" (re-review 2026-10-14).
  const alternateKind: MotionToChangeKind = kind === "asking" ? "if-served" : "asking";
  return {
    ...main,
    alternate: route(alternateKind, replacesTemporaryMotionCard),
    alternateLabel: kind === "asking" ? "No, the other side is bringing it" : "No, I'm bringing it",
  };
}

/*
 * THE CHAT ANSWERS "HOW DO I GET IT LOWERED?" (walkthrough run 38525903567,
 * FM). The guided chat ended "That's everything we need for now" with his
 * question unanswered. When his words ask to change an order he already has,
 * its closing line answers in the reviewed route line (r. 15 (5): a party who
 * wants to change a final order "shall serve and file a motion to change
 * (Form 15)", with the consent carve-out of r. 15 (17) and (18)), each
 * subrule quoted. Only the "asking" reading: someone served with, or
 * expecting, the other side's motion gets nothing here. Information, not a
 * prediction; the results page still puts the reading to them (CLAUDE.md s. 4).
 */
export type ChatClosing = { say: string; rules: RuleCitation[] };

export const CHAT_CLOSING_LEAD = "You asked how to change the order you have.";
export const CHAT_CLOSING_NEXT = "Continue to see your next step, with its forms and time limits.";

export function chatClosingFor(story: string, existingOrder: boolean, responding = false): ChatClosing | null {
  const lead = motionToChangeLead("family", story, existingOrder, responding);
  if (!lead || lead.kind !== "asking") return null;
  return { say: `${CHAT_CLOSING_LEAD} ${lead.line} ${CHAT_CLOSING_NEXT}`, rules: lead.rules };
}

/** What the person has said about the reading: nothing yet, yes, the other route, or not sure. */
export type ReadingChoice = null | "yes" | "other" | "not-sure";

/**
 * The route to show for the person's answer: none until they confirm
 * (CLAUDE.md s. 4: a reading is a suggestion), the read route on yes, the
 * other on "No", none on "Not sure" (the stage question below asks instead).
 */
export function routeShown(lead: MotionToChangeLead, choice: ReadingChoice): Route | null {
  if (choice === "yes") return lead;
  if (choice === "other") return lead.alternate;
  return null;
}

/**
 * The temporary-motion card is hidden only once the person has confirmed a
 * route that replaces it -- never on a reading they have not answered, on
 * "Not sure", or on a route that leaves it (re-review 2026-10-14).
 */
export function hidesTemporaryMotionCard(lead: MotionToChangeLead | null, choice: ReadingChoice): boolean {
  return Boolean(lead && routeShown(lead, choice)?.replacesTemporaryMotionCard);
}

/*
 * WHILE THE READING IS UNANSWERED (walkthrough run 38525903567, FM): "Family
 * Rule 14 governs motions for temporary orders" sat under the unanswered
 * motion-to-change question, the wrong procedure for a final order. It is
 * folded under its condition until the person answers. Hidden on a confirmed
 * route that replaces it; shown as before on "Not sure", "No", a route that
 * leaves it, an urgent story, or no reading at all.
 */
export type TemporaryMotionCardMode = "shown" | "folded" | "hidden";
export const TEMPORARY_MOTION_FOLD_LABEL = "Only if you need a temporary order before the motion is decided";

export function temporaryMotionCardMode(lead: MotionToChangeLead | null, choice: ReadingChoice): TemporaryMotionCardMode {
  if (hidesTemporaryMotionCard(lead, choice)) return "hidden";
  if (lead && choice === null && lead.replacesTemporaryMotionCard) return "folded";
  return "shown";
}

/*
 * ONE CLICK, NOT TWO (walkthrough run 38525903567, FM). "it sounds like you
 * want to ask the court to change the order. Is that right?" and, right
 * after, "From what you told us: I need to bring or answer a motion. Yes,
 * that is right" asked the same thing twice. A confirmed motion-to-change
 * route -- bringing one, or answering one served on you -- is the motion
 * stage, so the person's answer to the reading records it (CLAUDE.md s. 4:
 * they still confirm once, and can change it). "If served", "Not sure" and
 * no answer record nothing; the stage question is asked as before.
 */
export function stageFromMotionAnswer(lead: MotionToChangeLead | null, choice: ReadingChoice): "motion" | null {
  if (!lead) return null;
  const kind = routeShown(lead, choice)?.kind;
  return kind === "asking" || kind === "responding" ? "motion" : null;
}

/** The stage question waits while the reading is unanswered: the answer settles it (stageFromMotionAnswer). */
export function stageQuestionWaits(lead: MotionToChangeLead | null, choice: ReadingChoice, confirmedStage: string | null): boolean {
  return Boolean(lead) && choice === null && !confirmedStage;
}

/** The person's answer to the reading, as saved on the case (casePosition.ts `motionToChange`). */
export type SavedMotionAnswer = { answer: Exclude<ReadingChoice, null>; readingKind: MotionToChangeKind };

/**
 * The answer that stands for this reading: one given this visit (null after
 * Change), else one saved on the case -- but only while the reading is the
 * same kind; a new, different reading is asked again.
 */
export function standingChoice(
  lead: MotionToChangeLead | null,
  thisVisit: { answer: ReadingChoice; readingKind: MotionToChangeKind } | undefined,
  saved: SavedMotionAnswer | undefined,
): ReadingChoice {
  if (!lead) return null;
  const given = thisVisit ?? saved;
  return given && given.readingKind === lead.kind ? given.answer : null;
}
