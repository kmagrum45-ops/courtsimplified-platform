/**
 * THE WORK OF THE ONE STORY READER, inside the case file module (21 Nov 2026, batch (a)).
 *
 * The one story reader is intakeReview.ts statedInStory: every place that asks what the story states reads it, and the
 * one-decider list names it as the one place (test:one-decider). What it reads is done here, in the case file module,
 * because the case file guard keeps every reading of a fact inside this folder (test:case-file-guard). Called only by
 * statedInStory (test:one-story-reader); nothing else imports this file.
 *
 * `reading`: the story reading the person was shown, used only where the story writes its value (the amount: written
 * in the story, or the sum of amounts written in it). `court`: the readers that depend on the court (the person's role,
 * the kind of claim, the papers filed, the other side). `oneClick`: the review's strict amount rule (#471: never an
 * amount already paid); every other place offers what the story states, as before. Pure. States no law. No model.
 */
import {
  childrenFromStory,
  childrenPartialFromStory,
  civilFiledFromStory,
  civilIssuesFromStory,
  civilRoleFromStory,
  courtDateFromStory,
  familyFiledFromStory,
  familyIssuesFromStory,
  familyRoleFromStory,
  goalFromStory,
  otherPartyFromStory,
  otherPartyNameFromStory,
  servedDateFromStory,
  type PartialStoryAnswer,
} from "../../../../app/builder/_components/storyAnswers";
import { countable, dayWrittenBefore, findDates, findDayMonthWithoutYear, isRealIsoDate, MONTH_WORDS_EN } from "../dates";
import { servedDateAt } from "../servedWords";
import { sentences } from "../sentences";
import { businessOtherSideIn } from "./storyFacts";
import { offeredAmount, type ReadingFact } from "./storyOffers";
import type { SlotFact } from "./slotFacts";

export type StoryCourt = "small-claims" | "civil" | "family";
export type StoryValue = { value: string | string[]; quote: string };
/** What the story states, by fact; `filedDocuments` is the papers filed (a list), `childrenPartial` the children half-told. */
export type StoryReading = Partial<Record<SlotFact | "filedDocuments", StoryValue>> & { childrenPartial?: PartialStoryAnswer };
export type StoryReadInput = { story: string; reading?: readonly ReadingFact[]; court?: StoryCourt; oneClick?: boolean };

const MONTH_AND_YEAR = new RegExp(`^(?:${MONTH_WORDS_EN.join("|")}) \\d{4}$`);

/** "payment was due July 10", "by July 10": a deadline, not when it happened. */
const DEADLINE_BEFORE = /\b(?:due|deadline|payable|by|until|before|no later than|expires?|expiring)\s*(?:on\s*)?$/i;

/**
 * When it happened, from the story: the first date that is not written as a deadline (re-test round 7: "work finished
 * June 10, payment due July 10" was read as July 10), read by the shared reader (dates.ts). A full date is offered as it
 * is, a month and year ("August 2026") as it is. A day and month with no year is not offered: its year would be a guess
 * (it took another date's year before), so the person types it and is asked for the year. Moved here from intakeReview.ts.
 */
function whenItHappened(story: string): string | null {
  const notDeadline = (index: number) => !DEADLINE_BEFORE.test(story.slice(Math.max(0, index - 30), index));
  const mentions = [
    ...findDates(story).filter((date) => (date.precision === "day" ? countable(date) : date.precision === "month" && !dayWrittenBefore(story, date))).map((date) => ({ index: story.indexOf(date.source), date })),
    ...findDayMonthWithoutYear(story).filter((date) => !date.numeric).map((date) => ({ index: date.index, date: null })),
  ].filter((mention) => mention.index >= 0).sort((a, b) => a.index - b.index);
  // The day the person was served is its own fact, never when the dispute happened (servedWords.ts; Chrome check of #547, G3a).
  const chosen = mentions.find((mention) => notDeadline(mention.index) && !servedDateAt(story, mention.index));
  if (!chosen || !chosen.date) return null;
  if (chosen.date.precision === "day") return chosen.date.iso;
  const [year, month] = chosen.date.iso.split("-").map(Number);
  return `${MONTH_WORDS_EN[month - 1]} ${year}`;
}

// ---- what was agreed ---------------------------------------------------------------------------

/**
 * A sentence of the story that says what the person and the other side agreed ("We agreed he would redo the roof for
 * $6,000 by June."; "The written quote said the deck would be finished in two weeks."), in their words (C9, 23 Nov
 * 2026). Only the person's own agreement: never one they deny ("I never agreed"), a court order, or a parenting
 * arrangement.
 */
const AGREED = /\b(?:we|i|they|he|she|the (?:contractor|seller|buyer|landlord|tenant|company|business)) (?:had |both |all )?(?:agreed|promised)\b|\b(?:the|our|my|a|their) (?:signed |written |verbal |oral )?(?:contract|agreement|quote|estimate|deal|invoice) (?:said|says|stated|was for|set out|called for|required)\b|\b(?:agreed|promised) (?:to|on|that)\b/i;
const NOT_THEIR_AGREEMENT = /\b(?:never|did ?n[o']t|didn't|not) (?:agree|promise)|\b(?:court order|parenting|custody|separation agreement|access schedule)\b/i;
function agreementTermsOf(story: string): StoryValue | null {
  for (const sentence of sentences(story)) {
    if (!AGREED.test(sentence) || NOT_THEIR_AGREEMENT.test(sentence)) continue;
    return { value: sentence.trim(), quote: sentence.trim() };
  }
  return null;
}


/** Everything the story states, by fact, with the story's words for each. */
export function readStoryFacts({ story, reading = [], court, oneClick = false }: StoryReadInput): StoryReading {
  const out: StoryReading = {};
  if (!story.trim()) return out;
  const date = whenItHappened(story);
  // A month and year ("In March 2026") is stated as well as a full date (page test, 12 Nov: it was read, then dropped).
  if (date && (isRealIsoDate(date) || MONTH_AND_YEAR.test(date))) out.whenHappened = { value: date, quote: date };
  // The one offer reader (storyOffers.ts): the story reading's amount when the story writes it, else the story's.
  const amount = offeredAmount(story, reading, oneClick ? { oneClick: true } : {});
  if (amount) out.amount = { value: amount.value, quote: amount.quote };
  const goal = goalFromStory(story);
  if (goal) out.wants = goal;
  const children = childrenFromStory(story);
  if (children) out.children = children;
  const partial = childrenPartialFromStory(story);
  if (partial) out.childrenPartial = partial;
  const served = servedDateFromStory(story);
  if (served) out.servedDate = served;
  const courtDate = courtDateFromStory(story);
  if (courtDate) out.courtDate = courtDate;
  // The person's role: Family's words, else the Civil reader's (Small Claims read the same way, as the start's cross-check did).
  if (court) {
    const role = court === "family" ? familyRoleFromStory(story) : civilRoleFromStory(story);
    if (role) out.side = role;
  }
  if (court === "family" || court === "civil") {
    const issues = court === "family" ? familyIssuesFromStory(story) : civilIssuesFromStory(story);
    if (issues) out.claimKind = issues;
    const filed = court === "family" ? familyFiledFromStory(story) : civilFiledFromStory(story);
    if (filed) out.filedDocuments = filed;
    const other = court === "family" ? otherPartyNameFromStory(story) : otherPartyFromStory(story) ?? businessOtherSideIn(story);
    if (other) out.otherParty = other;
  }
  // What was agreed, for a place that asks it in words only (never offered: not one of STORY_STATED_FACTS; C9).
  const agreed = agreementTermsOf(story);
  if (agreed) out.agreementTerms = agreed;
  return out;
}
