/**
 * THE SMALL CLAIMS LEAVE RULE, IN THE ACT'S AND THE RULES' OWN WORDS (site owner, 2026-10-26 and
 * 2026-10-28).
 *
 * A claim within the Small Claims limit needs the Superior Court's leave to be started there. The
 * published library says that rule, and the two that follow it, in its own words, and one sentence
 * of ours with no law behind it: "A claim above it needs no such leave." Chrome (28 Oct) found the
 * three sentences after the Act's words shown with no citation. The owner's rule: every sentence is
 * the Act's or the rule's own words with its citation, or it goes; that sentence of ours goes.
 *
 * Done on screen, where the library's text is shown (StageAnswerPanel courtWords); the published
 * library is hash-locked and never edited by hand. Each quote is the saved official text:
 * Courts of Justice Act s. 23 (1.1); Rules of Civil Procedure r. 14.01.1 (2) and (3).
 */
import { S_CJA_23_1_1_LEAVE } from "../case-system/stage-map/citations";

const quoted = (where: string, words: string) => `${where}: “${words}”`;

export const CJA_23_1_1_WORDS = quoted("Courts of Justice Act, s. 23 (1.1)", S_CJA_23_1_1_LEAVE.quote);
export const RCP_14_01_1_2_WORDS = quoted("Rules of Civil Procedure, r. 14.01.1 (2)", "A motion under subsection 23 (1.1) of the Courts of Justice Act for leave to commence an action in the Superior Court of Justice that is within the Small Claims Court's jurisdiction may be made without notice, unless the court orders otherwise.");
export const CJA_23_1_2_WORDS = quoted("Courts of Justice Act, s. 23 (1.2)", "Subsection (1.1) does not apply with respect to a counterclaim, crossclaim or third or subsequent party claim, where the main action was commenced in the Superior Court of Justice.");
export const RCP_14_01_1_3_WORDS = quoted("Rules of Civil Procedure, r. 14.01.1 (3)", "The court may grant leave under subsection 23 (1.1) of the Courts of Justice Act only if it is in the interest of justice.");

/** Each of the library's wordings of the leave rules, and what is shown in its place ("" = removed). */
export const LEAVE_SENTENCES: [RegExp, string][] = [
  [/If your claim is within that limit, it can only be started in the Superior Court with that court's leave\.|A claim within that limit cannot be started in the Superior Court of Justice without that court's leave\.|A case that is within the Small Claims Court's limits must not be started in the Superior Court of Justice unless the Superior Court gives leave\.|A claim within that limit needs the Superior Court's leave to be started there\./g, CJA_23_1_1_WORDS],
  // Ours, with no law behind it (the Act says what needs leave, not what does not).
  [/ ?A claim above it needs no such leave\./g, ""],
  [/You may ask for leave by motion without notice, unless the court orders otherwise\.|You may ask for this leave without notice, unless the court orders otherwise\./g, RCP_14_01_1_2_WORDS],
  [/The court may grant it only if it is in the interest of justice\.|The court may give that leave only if it is in the interest of justice\./g, RCP_14_01_1_3_WORDS],
  // Reviewer, 28 Oct: shown in our words with no citation.
  [/Leave is not needed for a counterclaim, a crossclaim, or a third or later party claim, if the main case was started in the Superior Court\./g, CJA_23_1_2_WORDS],
];

/** Whether the screen shows this sentence in the rule's own words instead (so nothing else repeats it). */
export function isLeaveSentence(sentence: string): boolean {
  return LEAVE_SENTENCES.some(([pattern]) => { pattern.lastIndex = 0; const hit = pattern.test(sentence); pattern.lastIndex = 0; return hit; });
}

/** The text with the leave rules in their own words, each with its citation. */
export function withLeaveRulesQuoted(text: string): string {
  return LEAVE_SENTENCES.reduce((out, [pattern, shown]) => out.replace(pattern, shown), text).replace(/ {2,}/g, " ");
}
