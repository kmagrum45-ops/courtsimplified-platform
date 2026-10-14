/**
 * The step a person is at, and the event that put their case there: offered
 * as the kind of step for a sentence from their story that says it happened.
 *
 * WHY (walkthrough, 2026-10-13, R6). A plaintiff confirmed "Judgment obtained,
 * unpaid" on the Overview. The Timeline then quoted their sentence "I won my
 * small claims case against my old roommate in May" and asked, cold, "What
 * kind of step was this?" -- beside the words "You confirmed this stage on the
 * Overview". The person had already told us: being at that step means a
 * judgment was given, and the sentence says so.
 *
 * WHAT IT DOES. For a Small Claims step that exists only because an event
 * happened (judgment given, defendant noted in default, defence filed, claim
 * served, trial date fixed...), and a sentence that STATES that event
 * happened, in plain words, it returns the event type with where the
 * suggestion came from. It is a SUGGESTION (CLAUDE.md section 4): the
 * Timeline pre-selects it with the reason beside it, and nothing is recorded
 * until the person presses "Record this". They can choose another kind, or
 * "Not a court step".
 *
 * WHAT IT DOES NOT DO. It never types a sentence the step does not account
 * for ("It's been months, and he hasn't paid anything" is still the person's
 * to classify), never offers `other-user-described` as a fallback
 * (verifyCaseEvents: the untyped option is first-class, not a default), and
 * offers nothing for a question, a "no", a "maybe" or a wish ("Has he been
 * served?", "we haven't had a judgment yet", "I don't know whether he filed
 * his defence", "I want a judgment"), or for the same word in another sense
 * ("I served in the army", "his judgement about money", "won the lottery").
 * Review 2026-10-13: each of those misfired in the first version.
 *
 * Pure. Asserted by `npm run test:case-events`.
 */

import type { CaseEventType } from "./caseEventTypes";

/**
 * Small Claims steps whose description is that this event happened. Only
 * steps where being there means the event took place; a step about deciding
 * or preparing for something maps to nothing.
 */
export const STEP_EVENT: Readonly<Record<string, CaseEventType>> = {
  "plaintiff:claim-issued-not-served": "claim-filed",
  "plaintiff:served-awaiting-defence": "claim-served",
  "defendant:served-defence-period-running": "claim-served",
  "plaintiff:defendant-noted-in-default": "noted-in-default",
  "defendant:noted-in-default": "noted-in-default",
  "plaintiff:defence-filed": "defence-filed",
  "defendant:defence-filed": "defence-filed",
  "plaintiff:served-with-defendants-claim": "defendants-claim-issued",
  "plaintiff:settlement-conference-held": "settlement-conference-held",
  "plaintiff:trial-date-set": "trial-date-fixed",
  "defendant:trial-date-set": "trial-date-fixed",
  "both:responding-to-a-motion": "motion-served",
  "plaintiff:judgment-in-my-favour-unpaid": "order-or-judgment-received",
  "plaintiff:default-judgment-signed": "order-or-judgment-received",
  "defendant:default-judgment-against-me": "order-or-judgment-received",
  "defendant:judgment-against-me": "order-or-judgment-received",
};

const PAPERS = "(?:papers|court papers|plaintiff'?s? claim|claim|statement of claim)";

/** Plain words that state each event happened. Surfaces of speech, not law. */
const EVENT_WORDS: Readonly<Partial<Record<CaseEventType, RegExp>>> = {
  // A judgment as something that happened in the person's own case: they won
  // or lost THEIR case, got a judgment, or the judge or court ruled. Not "his
  // judgement about money", not someone else's case, not the lottery.
  // This map is the plaintiff's side (judgment FOR them); the defendant's
  // judgment steps use JUDGMENT_AGAINST_ME below, so "I won my case" is never
  // offered as a judgment against the person.
  "order-or-judgment-received":
    /\b(?:(?:i|we) won (?:my|our|the) (?:small claims |court )?(?:case|claim|lawsuit|trial)\b|(?:got|received|obtained|was given|were given) (?:a |the |my |our )?(?:default )?judge?ment\b|judge?ment (?:was |has been )?(?:given|granted|made|entered|issued|signed)(?! against (?:me|us))\b|judge?ment (?:was |has been )?(?:given |granted |made |entered |issued |signed )?(?:in my favou?r|against (?:him|her|them))\b|the (?:judge|court) (?:said|ordered|awarded|gave|ruled|found|decided)\b(?! (?:me|us) to pay)|ordered (?:him|her|them) to pay\b|awarded (?:me|us)\b)/i,
  "noted-in-default": /\bnoted in default\b/i,
  // Not the plaintiff's defence to a defendant's claim.
  "defence-filed": /\b(?:filed|served|sent|submitted) (?:a|my|his|her|their|the|our) defen[cs]e\b(?! to (?:his|her|their|the|a) (?:defendant'?s claim|counter-?claim))|\bdefen[cs]e (?:was |has been )?(?:filed|served)\b/i,
  // Served only with a legal object: the person was served, or someone was
  // served with the claim or papers. Not "served in the army", not "served
  // him dinner".
  "claim-served": new RegExp(
    `\\b(?:served (?:me|us)\\b|(?:i|we) (?:was|were|got|have been|had been) served\\b|served (?:me |us |him |her |them )?with\\b|served (?:me |us |him |her |them )?(?:the |a |his |her |their |my |our )?${PAPERS}\\b|(?:got|received|picked up) (?:the |a |his |her |their )?${PAPERS}\\b|(?:claim|papers) (?:came|arrived)\\b|handed (?:me )?(?:the |a )?(?:papers|claim)\\b)`,
    "i",
  ),
  "claim-filed": /\b(?:filed|issued|started) (?:my|the|a|our) (?:plaintiff'?s )?claim\b|\bclaim (?:was |has been )?(?:issued|filed)\b/i,
  "defendants-claim-issued": /\bdefendant'?s claim\b|\bcounter-?claim/i,
  "settlement-conference-held": /\b(?:had|attended|went to|did) (?:a |the |our )?settlement conference\b|\bsettlement conference (?:was held|happened|took place|went)\b/i,
  "trial-date-fixed": /\btrial (?:date|is (?:on|set|scheduled|booked)|was (?:set|scheduled|booked))\b|\bnotice of trial\b/i,
  "motion-served": /\bnotice of motion\b|\bmotion (?:to|for|against)\b/i,
};

/** A judgment against the person: the defendant's judgment steps. */
const JUDGMENT_AGAINST_ME =
  /\b(?:(?:i|we) lost (?:my|our|the) (?:small claims |court )?(?:case|claim|lawsuit|trial)\b|judge?ment (?:was |has been )?(?:given |granted |made |entered |issued |signed )?against (?:me|us)\b|(?:got|have|has) (?:a |the )?(?:default )?judge?ment against (?:me|us)\b|(?:the (?:judge|court) )?ordered (?:me|us) to pay\b)/i;

/** Steps whose event is spoken of differently from the event's usual words. */
const STEP_WORDS: Readonly<Record<string, RegExp>> = {
  "defendant:default-judgment-against-me": JUDGMENT_AGAINST_ME,
  "defendant:judgment-against-me": JUDGMENT_AGAINST_ME,
};

/**
 * Anything before the words that says it did not happen, may not have, or is
 * only wanted: "we haven't had a judgment yet", "I don't know whether he
 * filed his defence", "I need to get him served", "I want a judgment".
 */
const NOT_A_FACT =
  /\b(?:no|not|never|nothing|haven'?t|hasn'?t|hadn'?t|didn'?t|did not|have not|has not|wasn'?t|weren'?t|isn'?t|aren'?t|don'?t|do not|doesn'?t|does not|can'?t|cannot|couldn'?t|won'?t|will|would|wouldn'?t|should|shall|might|may|maybe|whether|if|unless|need to|needs to|have to|has to|want|wants|wanted|hope|hoping|going to|gonna|plan|planning|trying to|try to|asking for|ask for|yet to|without|waiting (?:for|on)|until)\b/i;

export type StepEventSuggestion = {
  eventType: CaseEventType;
  /** Where the suggestion came from, in plain words, shown beside it. */
  basis: string;
};

export function suggestedEventForSentence(
  sentence: string,
  /**
   * The step shown on the Overview. `chosen`: the person picked it themselves
   * (position.stepId), rather than it being the site's suggestion.
   */
  step: { id: string; title: string; chosen?: boolean } | null | undefined,
): StepEventSuggestion | null {
  if (!step) return null;
  const eventType = STEP_EVENT[step.id];
  const words = eventType ? STEP_WORDS[step.id] ?? EVENT_WORDS[eventType] : undefined;
  if (!eventType || !words) return null;
  // A question is not a statement that it happened ("Has he been served?").
  if (sentence.includes("?")) return null;
  const match = words.exec(sentence);
  if (!match || NOT_A_FACT.test(sentence.slice(0, match.index))) return null;
  // "You confirmed" only of a step the person chose; otherwise it is the step
  // the Overview shows them, which the site suggested (review 2026-10-13).
  const where = step.chosen
    ? `you confirmed “${step.title}” on the Overview`
    : `your step on the Overview is “${step.title}”`;
  return {
    eventType,
    basis: `Suggested because ${where}, and this sentence describes it. Change it if that is not right.`,
  };
}
