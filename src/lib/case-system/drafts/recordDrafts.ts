/**
 * THE DRAFTS, FROM THE CASE RECORD (site owner, 14 Nov 2026, rules 7 and 8; Chrome forms test on #550, rows 5, 11-13).
 *
 * The Plaintiff's Claim draft, "Your story", the affidavit outline and the chronology read the parties and the facts from
 * the case record (caseFileOf, through forms/formContext.ts), never from the saved intake's own copy:
 *   - the parties: each its own entry, from the Parties step (rule 2: never two merged into one name);
 *   - what happened: the person's own words, with the site's questions and the sentences that only give party details
 *     taken out (personWordsOnly, storyWithoutPartyDetails), kept as they wrote it, never cut into numbered sentences;
 *   - the dates, the amount and what they want: as the record holds them (the amount as every screen shows it).
 * Something not given is said plainly, with where to add it; nothing the person gave says "not entered".
 *
 * Every line is the person's own words or a plain label. No model, no law stated, nothing judged (CLAUDE.md s. 3).
 */
import { dayOfSlot, slotText, type SlotFact } from "../caseFile/caseFile";
import { formatForCourt } from "../dates";
import { formatRecordedAmount } from "../format/recordedAmount";
import { partyName, type Party } from "../parties/parties";
import { addressLine } from "../forms/formContext";
import type { FormContext } from "../forms/formMap";
import { affidavitOutlineDraft, chronologyDraft, newId, orderTimeline, type CaseDraft, type DraftSection, type TimelineEntry } from "./caseDrafts";

const ADD_PARTIES = "Add it in The parties.";

const section = (heading: string, text: string): DraftSection => ({ id: newId("part"), heading, text, reviewed: false });
const shell = (title: string, kind: CaseDraft["kind"], sections: DraftSection[], now: Date): CaseDraft => {
  const stamp = now.toISOString();
  return { id: newId("draft"), title, kind, createdAt: stamp, updatedAt: stamp, sections };
};

/** The words each side is called by in this court. */
function sideWords(ctx: FormContext): { plaintiff: string; defendant: string } {
  return ctx.file.area === "family" ? { plaintiff: "Applicant", defendant: "Respondent" } : { plaintiff: "Plaintiff", defendant: "Defendant" };
}

/** One party, as a few lines: the name, the address, and the phone and email if given. */
function partyLines(party: Party | undefined, role: string, number: number): string {
  const label = `${role} ${number}${party?.you ? " (you)" : ""}`;
  if (!party) return `${label}: not given yet. ${ADD_PARTIES}`;
  const name = partyName(party);
  const address = addressLine(party);
  return [
    `${label}: ${name || `name not given yet. ${ADD_PARTIES}`}`,
    `Address: ${address || `not given yet. ${ADD_PARTIES}`}`,
    party.details.phone ? `Phone: ${party.details.phone}` : "",
    party.details.email ? `Email: ${party.details.email}` : "",
    party.details.repName ? `Representative: ${party.details.repName}` : "",
  ].filter(Boolean).join("\n");
}

/** Every party, each its own entry (rule 2). */
export function partiesText(ctx: FormContext): string {
  const words = sideWords(ctx);
  const plaintiffs = ctx.plaintiffs.length ? ctx.plaintiffs : [undefined];
  const defendants = ctx.defendants.length ? ctx.defendants : [undefined];
  return [
    ...plaintiffs.map((party, index) => partyLines(party, words.plaintiff, index + 1)),
    ...defendants.map((party, index) => partyLines(party, words.defendant, index + 1)),
  ].join("\n\n");
}

/** The person's own words, kept in their paragraphs (never cut into numbered sentences). */
const reasonsText = (ctx: FormContext) => ctx.reasons.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean).join("\n\n");

const wantsText = (ctx: FormContext): string => (ctx.file.wants.state === "answered" ? slotText(ctx.file.wants, formatForCourt) : "");

const DATE_FACTS: [SlotFact, string][] = [["whenHappened", "When it happened"], ["servedDate", "Served on"], ["conferenceDate", "Conference date"], ["courtDate", "Next court date"]];

/** The dates the record holds, as entries (the day when it is known, else the person's words). */
export function recordDates(ctx: FormContext): TimelineEntry[] {
  return DATE_FACTS.flatMap(([fact, title]) => {
    const slot = ctx.file[fact];
    if (slot.state !== "answered" && !(slot.state === "unsure" && typeof slot.value === "string" && slot.value.trim())) return [];
    const day = dayOfSlot(slot);
    return [{ date: day, when: day ? null : slotText(slot, formatForCourt), title, detail: null, source: "timeline" as const }];
  });
}

export type DraftGiven = { timeline: TimelineEntry[]; intake: Record<string, unknown>; now: Date };

/** The Plaintiff's Claim (Form 7A) working draft. */
export function claimDraftOfRecord(ctx: FormContext, given: DraftGiven): CaseDraft {
  const evidence = typeof given.intake.evidence === "string" ? given.intake.evidence.trim() : "";
  return shell("Draft Plaintiff’s Claim (Form 7A)", "starting-document", [
    section("Parties", partiesText(ctx)),
    section("What you are asking for", wantsText(ctx) || "Not given yet: what you want the court to order."),
    section("Reasons for the claim, in your words", reasonsText(ctx) || "Not given yet: what happened, in your own words."),
    section("Amount claimed", ctx.amount === null ? "Not given yet: the amount you are claiming." : formatRecordedAmount(String(ctx.amount))),
    section("Evidence to review", evidence || "Nothing listed yet."),
  ], given.now);
}

/** "Your story": who is involved, what happened, when, what they have and what they want, from the record. */
export function yourStoryOfRecord(ctx: FormContext, given: DraftGiven): CaseDraft {
  const words = sideWords(ctx);
  const who = [
    ...ctx.plaintiffs.map((party, index) => `${party.you ? "You" : `${words.plaintiff} ${index + 1}`}: ${partyName(party) || "name not given yet"}`),
    ...ctx.defendants.map((party, index) => `${party.you ? "You" : `${words.defendant} ${index + 1}`}: ${partyName(party) || "name not given yet"}`),
  ];
  const dates = orderTimeline(recordDates(ctx)).map((entry) => `${entry.title}: ${entry.date ? formatForCourt(entry.date) : entry.when}`);
  const evidence = typeof given.intake.evidence === "string" ? given.intake.evidence.trim() : "";
  return shell("Your story", "your-story", [
    ...(who.length ? [section("Who is involved", who.join("\n"))] : []),
    section("What happened", reasonsText(ctx)),
    ...(dates.length ? [section("When things happened", dates.join("\n"))] : []),
    ...(evidence ? [section("What you have to show it", evidence)] : []),
    section("What you want", wantsText(ctx)),
  ], given.now);
}

/** The affidavit outline: who the person is (from the parties), what happened (their timeline, else their own words). */
export function affidavitOutlineOfRecord(ctx: FormContext, given: DraftGiven): CaseDraft {
  const you = [...ctx.plaintiffs, ...ctx.defendants].find((party) => party.you);
  const outline = affidavitOutlineDraft(given.timeline, given.now);
  const about = you ? [partyName(you), addressLine(you)].filter(Boolean).join("\n") : "";
  return {
    ...outline,
    sections: outline.sections.map((part) => {
      if (part.heading === "About you") return { ...part, text: about };
      if (part.heading === "What happened" && !given.timeline.length) return { ...part, text: reasonsText(ctx) || part.text };
      return part;
    }),
  };
}

/** The chronology: the Timeline tab's entries and the dates the record holds, in order. */
export function chronologyOfRecord(ctx: FormContext, given: DraftGiven): CaseDraft {
  const recorded = recordDates(ctx).filter((entry) => !given.timeline.some((item) => item.date && item.date === entry.date));
  return chronologyDraft([...given.timeline, ...recorded], given.now);
}

/** The four drafts as the Drafts tab makes them. */
export function draftsOfRecord(ctx: FormContext, given: DraftGiven): { claim: CaseDraft; story: CaseDraft; affidavit: CaseDraft; chronology: CaseDraft } {
  return { claim: claimDraftOfRecord(ctx, given), story: yourStoryOfRecord(ctx, given), affidavit: affidavitOutlineOfRecord(ctx, given), chronology: chronologyOfRecord(ctx, given) };
}
