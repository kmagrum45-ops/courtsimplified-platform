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
import { claimAmountFromStory, moneyMentions } from "../claimAmount";
import { acknowledgedIn, againstThemIn, complaintIn, evidenceIn, injuryIn, lastPaymentIn, lostPayIn, otherSideIn, otherSideSaysIn, propertyIn, witnessIn, type StoryFact } from "./storyFacts";
import { otherPartyFromStory, otherPartyNameFromStory } from "../../../../app/builder/_components/storyAnswers";
import { marriedWhereIn, type CaseFile } from "./caseFile";

export type StoryLine = { fact: "otherParty" | "marriedWhere" | "amountAgainst" | "amount" | "safety" | "injury" | "property" | "complaint" | "witness" | "lostPay" | "evidence" | "lastPayment" | "acknowledged" | "otherSideSays"; label: string; value: string; quote: string };

/**
 * Each fact the story gives, in plain words, with the sentence it came from as its quote
 * (storyFacts.ts; Charter re-test 27 Oct, root cause 1: whole sentences were shown, "Witness" was
 * the list of evidence and "Lost pay" repeated the injury sentence).
 */
const FACT_LINES: [StoryLine["fact"], string, (story: string) => StoryFact | null][] = [
  ["lostPay", "Lost pay", lostPayIn],
  ["injury", "Injury", injuryIn],
  ["property", "Property", propertyIn],
  ["complaint", "Complaint", complaintIn],
  ["witness", "Witness", witnessIn],
  ["evidence", "Evidence you have", evidenceIn],
  ["lastPayment", "Last payment", lastPaymentIn],
  ["acknowledged", "Debt acknowledged in writing since", acknowledgedIn],
  ["otherSideSays", "What the other side says", otherSideSaysIn],
];

export function storyLines(story: string, file: CaseFile, responding: boolean): StoryLine[] {
  const lines: StoryLine[] = [];
  if (!story.trim()) return lines;
  if (file.otherParty.state === "not-asked") {
    // A business and the person behind it, or who they are to the person (storyFacts.ts), else the
    // older readers' name or role (Charter re-test 27 Oct: the other side was never listed).
    const named = otherSideIn(story) ?? otherPartyNameFromStory(story) ?? otherPartyFromStory(story);
    if (named) lines.push({ fact: "otherParty", label: "The other party", value: named.value, quote: named.quote });
  }
  // The amount the story gives, when no answer holds one: every case lists its loss (root cause 1).
  if (!responding && file.amount.state === "not-asked") {
    const amount = claimAmountFromStory(story);
    if (amount) lines.push({ fact: "amount", label: "Amount", value: amount.value, quote: amount.quote });
  }
  if (file.marriedWhere.state === "not-asked") {
    const said = marriedWhereIn(story);
    if (said) lines.push({ fact: "marriedWhere", label: "Where you married", value: said.place, quote: said.quote });
  }
  // The claim against them: the amount and who is suing, in their words (case 19).
  if (responding && file.amount.state === "not-asked") {
    const against = moneyMentions(story).filter((mention) => mention.kind === "against");
    if (against.length && new Set(against.map((mention) => mention.number)).size === 1) lines.push({ fact: "amountAgainst", label: "The claim against you", value: against[0].quote.trim(), quote: against[0].quote });
    else {
      // Read as the amount of the claim ("a Statement of Claim … for $11,400", case 11), from the
      // sentences about the claim against them only (reviewer, 26 Oct: the old side's $1,650 came back).
      const amount = claimAmountFromStory(againstThemIn(story));
      if (amount) lines.push({ fact: "amountAgainst", label: "The claim against you", value: amount.value, quote: amount.quote });
    }
  }
  for (const [fact, label, read] of FACT_LINES) {
    const found = read(story);
    if (found) lines.push({ fact, label, value: found.value, quote: found.quote });
  }
  // Threats, fear for safety and a call to the police (case 16), each sentence as written.
  const safety = sentences(story).filter((sentence) => DANGER_WORDS.test(sentence) || /\b(?:called|phoned) (?:the )?police\b|\bpolice (?:came|were called)\b/i.test(sentence)).map((sentence) => sentence.trim());
  if (safety.length) lines.push({ fact: "safety", label: "Safety", value: safety.join(" "), quote: safety.join(" ") });
  return lines;
}
