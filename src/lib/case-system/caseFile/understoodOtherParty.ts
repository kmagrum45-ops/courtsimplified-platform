/**
 * WHO THE CASE IS AGAINST, FROM THE STORY READING THE PERSON ACCEPTED (Chrome check of production c38e69fd, 8 Nov, B1).
 *
 * The home page's "Here is what we understood" named the other party ("Alex Testwood, your friend and the borrower";
 * "Dana Testwood"; "Jordan Testfield"), the person accepted the reading, and the case record never got it: Small Claims
 * never asked, its review and Form 7A name box stayed empty, and Civil and Family asked for the name again. This reads
 * that name, for the one writer to put on the record (home.otherParty) when the reading is accepted.
 *
 * A name is taken only when every rule holds (owner, 6 and 8 Nov: never a witness; unclear is left unset):
 *   - the reading's line is about the other side (its label says other party, other side, other parent, borrower...);
 *   - the name is written in the person's own story, word for word (never one the reading made up);
 *   - not every sentence naming them is a witness's (they saw, heard, remember, were there, can confirm);
 *   - a friend or relative only when the story ties them to what is owed (storyFacts.ts otherSideIn, F14).
 * Otherwise nothing is taken, and the questions ask for the name once, as before.
 */
import { sentences } from "../sentences";
import { bystanderSentence, otherSideIn } from "./storyFacts";
import { MONTH_FULL_NAMES_PATTERN, WEEKDAY_NAMES_PATTERN } from "../dates";

const OTHER_SIDE_LABEL = /\b(?:other (?:party|side|person|parent)|opposing (?:party|side)|defendant|respondent|borrower|debtor|landlord|tenant|employer|contractor|seller|buyer|who (?:you(?:'re| are) (?:suing|claiming against)|owes you))\b/i;
const NAME = /\b([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+)+(?:\s+(?:Inc|Ltd|Corp|LLC|Co|Limited)\.?)?)/g;
const ONE_WORD_NAME = /\b([A-Z][a-z'’-]+)\b/g;
/** A one-word name standing alone in the story: never part of a longer capitalised name ("Circle" of "Circle K"). */
const wholeWord = (name: string) => new RegExp(`(?<![A-Za-z'’-])(?<![A-Z][A-Za-z'’.-]*\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z'’-])(?!\\s+[A-Z0-9])`);
const NOT_A_NAME_WORD = /^(?:The|This|That|In|On|At|By|My|Our|Your|He|She|They|We|I|It|And|But|Synthetic|Small|Claims|Superior|Court|Ontario|Canada|Justice|Family|Civil)$/;
/** A month or a weekday, from the one place that lists them (dates.ts): never part of a name. */
const DATE_WORD = new RegExp(`^(?:${MONTH_FULL_NAMES_PATTERN}|${WEEKDAY_NAMES_PATTERN})$`, "i");
/** A friend or relative named beside the name: read only through the F14 rule. */
const RELATION_WORD = /\b(?:my|our)\s+(?:best |close |old |former )?(?:friend|brother|sister|cousin|uncle|aunt|nephew|niece|mother|father|mom|dad|son|daughter|stepson|stepdaughter|stepfather|stepmother|grandfather|grandmother|relative|co-?worker|colleague|classmate|acquaintance|[a-z]+-in-law)\b/i;
const WITNESS_AFTER = (name: string) => new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},?\\s+(?:who\\s+)?(?:also\\s+)?(?:saw|sees|heard|hears|watched|witnessed|remembers?|recalls?|noticed|was there|were there|was with me|can confirm|could confirm|will confirm)\\b`, "i");

export function otherPartyFromUnderstanding(facts: readonly { label: string; value: string }[] | null | undefined, story: string): string | null {
  if (!facts?.length || !story.trim()) return null;
  const lines = sentences(story);
  for (const fact of facts) {
    if (typeof fact?.label !== "string" || typeof fact?.value !== "string" || !OTHER_SIDE_LABEL.test(fact.label)) continue;
    // A name of two or more words first, then a name of one word ("Your friend Alex": Chrome milestone test of #550, S5).
    for (const match of [...fact.value.matchAll(NAME), ...fact.value.matchAll(ONE_WORD_NAME)]) {
      const name = match[1].trim();
      if (name.split(/\s+/).some((word) => NOT_A_NAME_WORD.test(word) || DATE_WORD.test(word))) continue;
      // A one-word name only as a whole word of the story.
      const naming = lines.filter((line) => (name.includes(" ") ? line.includes(name) : wholeWord(name).test(line)));
      if (!naming.length) continue;
      if (naming.every((line) => bystanderSentence(line) || WITNESS_AFTER(name).test(line))) continue;
      // A friend or relative only when the story ties them to what is owed: the other side's own sentence names them
      // ("I lent my friend Alex $3,000": otherSideIn reads "Your friend" from that sentence, its quote names Alex).
      const owing = otherSideIn(story);
      if (naming.some((line) => RELATION_WORD.test(line)) && !`${owing?.value ?? ""} ${owing?.quote ?? ""}`.includes(name)) continue;
      return name;
    }
  }
  return null;
}
