/**
 * THE STORY'S FACTS, INTO THE RECORD AS "STATED IN THE STORY" (site owner, 26 Nov 2026, Small Claims rebuild, step 2).
 *
 * Jason's live test: "Here is what we understood" showed $10,000, the date and the kind, and every later screen asked them
 * again, because nothing the reading found was in the record. Here the story's facts become record slots in the state the
 * record already has for a story value not yet confirmed (caseFile.ts: source "story", confirmed false; factStatus.ts
 * reads it as "offer"). The Understood step offers each once (Yes / No, that's not right / I'm not sure); after that the
 * slot is the person's answer, "not sure", or said not right, and no screen asks it again (missingFacts.ts).
 *
 *   readers       the one story reader (intakeReview.ts statedInStory), for everyone. Signed in, it also reads the AI
 *                 reading's own facts (the amount the reading wrote, checked against the story's words by the reader);
 *                 a guest's reading is never used (guests get no AI, and no name is sent: privacy/nameLabels.ts).
 *   kind          the kind of claim the story shows by its own words (claimKind.ts kindFromStory); signed in, else the
 *                 one kind whose name the reading's matter names, when exactly one does. Otherwise none: it is asked on
 *                 the Questions page (owner's change B, 26 Nov 2026).
 *   never         a slot the person already answered, said "not sure" to, removed, or said "not right" to is left alone.
 *
 * Used only by the new Small Claims flow (behind SC_FLOW_V2): the old screens read the record as before.
 * Pure: no React, no network, no AI call. States no law.
 */
import type { CaseFile, Slot, SlotFact } from "../caseFile/caseFile";
import { slotStatus } from "../caseFile/factStatus";
import type { ReadingFact } from "../caseFile/storyOffers";
import { quotesOf, statedInStory } from "../intakeReview";
import { CLAIM_TYPES, type ClaimType } from "../intake/claimTypes";
import { kindFromStory, kindsOfClaim, storyQuoteFor } from "../intake/claimKind";
import { sentences } from "../sentences";

/** The facts the Understood step can hold from the story, in the order it shows them. */
export const STATED_FACTS = ["claimKind", "amount", "whenHappened", "wants", "otherParty"] as const satisfies readonly SlotFact[];
export type StatedFact = (typeof STATED_FACTS)[number];

/** What the home page's AI reading gave (signed in only): its facts and its matters' titles. */
export type FlowReading = { facts: readonly ReadingFact[]; matterTitles: readonly string[] };

/** The Small Claims kinds of claim (the kinds a person may hold: claimKind.ts kindsOfClaim). */
export function smallClaimsKinds(): ClaimType[] {
  return kindsOfClaim(CLAIM_TYPES.filter((type) => type.courtArea === "small-claims"));
}

/** A slot the story may fill: nothing the person said is there (no answer, no "not sure", not removed, not "not right"). */
function open(slot: Slot | undefined): boolean {
  return !slot || (slotStatus(slot) === "ask" && !slot.declined && slot.state === "not-asked");
}

const words = (value: string | string[]) => (Array.isArray(value) ? value.join(", ") : value).trim();

/**
 * The one kind a reading's matter names, by the kind's first word (its name without what is in brackets): only when
 * exactly one kind has that word in a matter's title. "Defamation claim concerning ..." names three kinds
 * (defamation, online or in print, a bad reference), so it names none: the person picks.
 */
export function kindNamedByReading(titles: readonly string[], kinds: readonly ClaimType[] = smallClaimsKinds()): ClaimType | null {
  const lead = (type: ClaimType) => type.name.replace(/\([^)]*\)/g, "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  for (const title of titles) {
    const said = title.toLowerCase();
    const named = kinds.filter((type) => lead(type).length >= 5 && new RegExp(`\\b${lead(type).replace(/[^a-z]/g, "")}\\b`).test(said));
    if (named.length === 1) return named[0];
  }
  return null;
}

/** The story's sentence a kind named by the reading rests on: its own signal phrase, else the story's first sentence. */
function quoteForKind(story: string, kind: ClaimType): string {
  return storyQuoteFor(story, kind) ?? sentences(story).map((item) => item.trim()).find(Boolean) ?? story.trim();
}

/**
 * The record with the story's facts added as stated in the story (offers), where the record holds nothing from the person.
 * `signedIn`: whether the AI reading may be used (never for a guest).
 */
export function withStoryStated(record: CaseFile, input: { story: string; reading?: FlowReading | null; signedIn: boolean }): CaseFile {
  const story = input.story.trim();
  if (!story) return record;
  const reading = input.signedIn ? input.reading ?? null : null;
  const next: CaseFile = { ...record };
  const read = quotesOf(statedInStory(story, reading?.facts ?? [], "small-claims")) as Partial<Record<SlotFact, { value: string | string[]; quote: string }>>;
  for (const fact of ["amount", "whenHappened", "wants", "otherParty"] as const) {
    const found = read[fact];
    if (!found || !words(found.value) || !open(record[fact])) continue;
    next[fact] = { state: "answered", value: words(found.value), source: { kind: "story", quote: found.quote }, confirmed: false };
  }
  if (open(record.claimKind)) {
    const kinds = smallClaimsKinds();
    const byStory = kindFromStory(story, kinds);
    const byReading = !byStory && reading ? kindNamedByReading(reading.matterTitles, kinds) : null;
    const kind = byStory?.claimType ?? byReading;
    if (kind) next.claimKind = { state: "answered", value: kind.id, source: { kind: "story", quote: byStory?.quote ?? quoteForKind(story, kind) }, confirmed: false };
  }
  return next;
}
