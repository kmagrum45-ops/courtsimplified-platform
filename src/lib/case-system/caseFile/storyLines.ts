/**
 * WHAT THE STORY SAYS THAT NO ANSWER HOLDS YET, FOR "WHAT WE HAVE SO FAR" (#477 re-test, item 6).
 *
 * Chrome found "What we have so far" missing facts the person had written: where they
 * married, the threats and the police call, the claim against them and who is suing, the
 * other party's name. Each is shown in the person's own words, marked as from their story.
 *
 * Display only: a line here never fills a case-file slot, so it never stops a question
 * being asked (a story suggestion is never an answer until the person gives it, caseFile.ts).
 *
 * Pure: no React, no network. States no law.
 */
import { sentences } from "../sentences";
import { DANGER_WORDS } from "../intake/dangerWords";
import { moneyMentions } from "../claimAmount";
import { otherPartyFromStory, otherPartyNameFromStory } from "../../../../app/builder/_components/storyAnswers";
import { marriedWhereIn, type CaseFile } from "./caseFile";

export type StoryLine = { fact: "otherParty" | "marriedWhere" | "amountAgainst" | "safety" | "injury" | "property" | "complaint" | "witness" | "lostPay"; label: string; value: string; quote: string };

/**
 * The person's own sentence for each of these, when the story has one (Charter re-test 2026-10-26:
 * the injury, the phone, the screened-out complaint, the witness and the lost pay were in the story
 * but not in "What we have so far"). The sentence itself is the value: nothing is read into it.
 */
const SENTENCE_LINES: [StoryLine["fact"], string, RegExp][] = [
  ["injury", "Injury", /\b(?:injur\w*|hurt|bruis\w*|swollen|swelling|fractur\w*|sprain\w*|concussion|numb\w*|broken (?:arm|wrist|leg|bone|nose|rib)s?)\b/i],
  ["property", "Property", /\b(?:phone|laptop|car|vehicle|bike|bicycle|property|belongings)\b[^.]*\b(?:damag\w*|cracked|broken|kept|seized|taken|lost|stolen)\b|\b(?:damag\w*|cracked|broke|seized|took|kept)\b[^.]*\b(?:phone|laptop|car|vehicle|bike|bicycle|property|belongings)\b/i],
  ["complaint", "Complaint", /\bcomplaint\b/i],
  ["witness", "Witness", /\bwitness\w*\b|\bsaw (?:it|what happened|the whole thing)\b/i],
  ["lostPay", "Lost pay", /\b(?:missed|lost|losing)\b[^.]*\b(?:work|pay|wages|income|shifts?)\b/i],
];

export function storyLines(story: string, file: CaseFile, responding: boolean): StoryLine[] {
  const lines: StoryLine[] = [];
  if (!story.trim()) return lines;
  if (file.otherParty.state === "not-asked") {
    const named = otherPartyNameFromStory(story) ?? otherPartyFromStory(story);
    // Badge numbers the story gives go with them ("badges 4471 and 5520").
    const badges = /\bbadges?(?: numbers?)?\s+((?:#?\d+)(?:\s*(?:,|and|&)\s*#?\d+)*)/i.exec(story)?.[1];
    if (named) lines.push({ fact: "otherParty", label: "The other party", value: badges ? `${named.value} (badges ${badges})` : named.value, quote: named.quote });
  }
  if (file.marriedWhere.state === "not-asked") {
    const said = marriedWhereIn(story);
    if (said) lines.push({ fact: "marriedWhere", label: "Where you married", value: said.place, quote: said.quote });
  }
  // The claim against them: the amount and who is suing, in their words (case 19).
  if (responding && file.amount.state === "not-asked") {
    const against = moneyMentions(story).filter((mention) => mention.kind === "against");
    if (against.length && new Set(against.map((mention) => mention.number)).size === 1) lines.push({ fact: "amountAgainst", label: "The claim against you", value: against[0].quote.trim(), quote: against[0].quote });
  }
  for (const [fact, label, words] of SENTENCE_LINES) {
    // The first sentence that says it (later ones repeat it, or list it as evidence).
    const found = sentences(story).find((sentence) => words.test(sentence) && !/\?\s*$/.test(sentence))?.trim();
    if (found) lines.push({ fact, label, value: found, quote: found });
  }
  // Threats, fear for safety and a call to the police (case 16), each sentence as written.
  const safety = sentences(story).filter((sentence) => DANGER_WORDS.test(sentence) || /\b(?:called|phoned) (?:the )?police\b|\bpolice (?:came|were called)\b/i.test(sentence)).map((sentence) => sentence.trim());
  if (safety.length) lines.push({ fact: "safety", label: "Safety", value: safety.join(" "), quote: safety.join(" ") });
  return lines;
}
