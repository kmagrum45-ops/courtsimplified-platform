/**
 * WHAT THE STAGE MAP OWNS (CLAUDE.md s. 2a, site owner 2026-10-14).
 *
 * The next step, its form and its response deadline come only from the stage
 * map (stage-map/stageMap.ts, stageSequence.ts, content-library/
 * nextStepPractical.ts, the deadline engine). The model reasons about the
 * story and explains; it never writes a step, form or deadline of its own.
 *
 * This is the code half of that rule, shared by every place model text can
 * reach a person: a sentence that names a court form by number, counts a
 * response period in days or weeks, or instructs the person to file, serve or
 * deliver a court document is map-owned, and a model-written one is dropped,
 * even when a checker found words supporting it. Why: on 2026-10-13 a checked
 * statement gave a homeowner with a lien on his house a 20-day Defence
 * deadline. The quote was real; the person had not been sued, so no defence
 * was due. Whether a step applies is a question of where the case stands,
 * and that is what the map decides.
 *
 * Deliberately narrow. Statements of law that are not the person's own next
 * step stay with the checked answer: a limitation period ("two years after
 * the day the claim was discovered"), what must be proven, which court and
 * why, what a rule allows. Those are checked against the official text and
 * shown with their source.
 */

/** "Form 9A", "Form 14B", "Form 35.1". */
const FORM_NUMBER = /\bforms?\s+\d+(?:\.\d+)?[A-Z]?\b/i;

/** A response or step period counted in days or weeks: "within 20 days", "20 days after you were served". */
const DAY_PERIOD =
  /\b(?:within|in|no later than)\s+(?:\d+|one|two|three|four|five|six|seven|ten|fourteen|fifteen|twenty|thirty|sixty|ninety)\s+(?:calendar\s+|business\s+)?(?:days?|weeks?)\b|\b(?:\d+|ten|fourteen|fifteen|twenty|thirty|sixty|ninety)\s+(?:calendar\s+|business\s+)?(?:days?|weeks?)\s+(?:after|from|of|before|following)\b/i;

/**
 * An instruction to take a court step: "You must file your Defence", "Serve
 * the claim on ...". Only as an instruction to the reader (an imperative
 * starting the sentence, or "you must / need to / should ..."): "she did not
 * file a defence" is the person's own fact and stays (test:case-understanding).
 */
const STEP_VERB = String.raw`(?:file|serve|deliver|issue)\s+(?:a|an|your|the|their|this|that)\s+(?:statement of\s+)?(?:defen[cs]e|claim|plaintiff'?s claim|defendant'?s claim|form|motion|notice|affidavit|answer|application|reply|request|record)\b`;
const STEP_INSTRUCTION = new RegExp(
  String.raw`(?:^|[.;:!?]\s+)` + STEP_VERB + String.raw`|\byou\s+(?:must|need to|should|have to|will need to|will have to|can now|may now|are required to)\s+(?:\w+\s+){0,2}?` + STEP_VERB,
  "i",
);

/** "Your next step is ...", "the next step is to ...". */
const NEXT_STEP = /\b(?:your|the)\s+next\s+step\b/i;

/** True when `text` states something the stage map owns. Pure. */
export function isMapOwnedProcedure(text: string): boolean {
  const value = text || "";
  return FORM_NUMBER.test(value) || DAY_PERIOD.test(value) || STEP_INSTRUCTION.test(value) || NEXT_STEP.test(value);
}
