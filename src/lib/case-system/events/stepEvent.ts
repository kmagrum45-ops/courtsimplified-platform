/**
 * The step a person confirmed, and the event that put their case there:
 * offered as the kind of step for a sentence from their story that names it.
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
 * served, trial date fixed...), and a sentence that names THAT event in plain
 * words, it returns the event type with where the suggestion came from. It is
 * a SUGGESTION (CLAUDE.md section 4): the Timeline pre-selects it with the
 * reason beside it, and nothing is recorded until the person presses "Record
 * this". They can choose another kind, or "Not a court step".
 *
 * WHAT IT DOES NOT DO. It never types a sentence the confirmed step does not
 * account for ("It's been months, and he hasn't paid anything" is still the
 * person's to classify), never offers `other-user-described` as a fallback
 * (verifyCaseEvents: the untyped option is first-class, not a default), and
 * never reads a sentence that says the event did NOT happen ("we haven't had
 * a judgment yet").
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

/** Plain words that name each event. Surfaces of speech, not law. */
const EVENT_WORDS: Readonly<Partial<Record<CaseEventType, RegExp>>> = {
  "order-or-judgment-received":
    /\b(?:(?:i|we) won|won (?:my|the|our|his|her|their)\b|judge?ments?\b|the (?:judge|court) (?:said|ordered|awarded|gave|ruled|found|decided)|ordered (?:him|her|them|me|us) to pay|awarded (?:me|us|him|her|them)\b|lost (?:my|the|our) case)/i,
  "noted-in-default": /\bnoted in default\b|\bin default\b/i,
  "defence-filed": /\b(?:filed|served|sent|submitted) (?:a|my|his|her|their|the|our) defen[cs]e\b|\bdefen[cs]e (?:was |has been )?(?:filed|served)\b/i,
  "claim-served":
    /\bserved\b|\b(?:got|received|picked up) (?:the |a |his |her |their )?(?:papers|plaintiff'?s? claim|claim|court papers)\b|\b(?:claim|papers) (?:came|arrived)\b|\bhanded (?:me )?(?:the |a )?(?:papers|claim)\b/i,
  "claim-filed": /\b(?:filed|issued|started) (?:my|the|a|our) (?:plaintiff'?s )?claim\b|\bclaim (?:was |has been )?(?:issued|filed)\b/i,
  "defendants-claim-issued": /\bdefendant'?s claim\b|\bcounter-?claim/i,
  "settlement-conference-held": /\b(?:had|attended|went to|did) (?:a |the |our )?settlement conference\b|\bsettlement conference (?:was held|happened|took place|went)\b/i,
  "trial-date-fixed": /\btrial (?:date|is (?:on|set|scheduled|booked)|was (?:set|scheduled|booked))\b|\bnotice of trial\b/i,
  "motion-served": /\b(?:served (?:me )?with|got|received) (?:a |the |his |her |their )?(?:notice of )?motion\b/i,
};

/** A no just before the words: "we haven't had a judgment yet", "never served". */
const SAYS_IT_DID_NOT = /\b(?:no|not|never|haven'?t|hasn'?t|didn'?t|did not|have not|has not|wasn'?t|isn'?t|yet to|without|waiting (?:for|on))\b[^.!?]{0,30}$/i;

export type StepEventSuggestion = {
  eventType: CaseEventType;
  /** Where the suggestion came from, in plain words, shown beside it. */
  basis: string;
};

export function suggestedEventForSentence(
  sentence: string,
  step: { id: string; title: string } | null | undefined,
): StepEventSuggestion | null {
  if (!step) return null;
  const eventType = STEP_EVENT[step.id];
  const words = eventType ? EVENT_WORDS[eventType] : undefined;
  if (!eventType || !words) return null;
  const match = words.exec(sentence);
  if (!match || SAYS_IT_DID_NOT.test(sentence.slice(0, match.index))) return null;
  return {
    eventType,
    basis: `Suggested because you confirmed “${step.title}” on the Overview, and this sentence describes it. Change it if that is not right.`,
  };
}
