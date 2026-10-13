/**
 * How the "Here's what I understood" card reads (2026-10-13).
 *
 * The walkthrough's ice-slip case (her own words: "i slipped ... this happened
 * january 13 2025") scored "asks twice" because the card printed each bank
 * question as a question -- "Are you the person or business bringing this
 * claim, or the one responding to a claim?" -- and showed the same date twice,
 * once as "when did it happen" and once as "the injury date". The answers
 * were already filled in from her story; the card just read like a
 * questionnaire.
 *
 * So the card states what was understood ("Your side: Bringing the claim"),
 * and two date answers that name the same day are shown once and confirmed
 * together. Nothing changes about what is saved: each question still gets its
 * own confirmed answer, exactly as before.
 *
 * Pure: no browser, no network, no model.
 */

/** What the card calls each answer. A question not listed shows its own text. */
export const CARD_LABELS: Record<string, string> = {
  "sc-orient-when-happened": "When it happened",
  "sc-orient-role": "Your side",
  "sc-orient-dispute-category": "What it's about",
  "sc-amount-claimed": "The amount",
  "sc-claim-filed": "Whether a claim has been filed",
  "sc-defendant-served": "Whether the other side has been served",
  "sc-defence-filed": "Whether a defence has been filed",
  "sc-defendant-claim-received": "Whether you were served with a claim",
  "sc-defendant-defence-filed": "Whether you filed a defence",
  "sc-defendant-outcome": "What you want to happen with the claim",
  "sc-defendant-service-method": "How you were served",
  "sc-defendant-counterclaim": "A claim of your own against them",
  "sc-evidence-available": "What proof you have",
  "sc-remedy-sought": "What you're asking the court to order",
  "sc-date-injury": "The date of the injury",
  "sc-date-claim-served": "The date the claim was served",
  "sc-date-claim-issued": "The date the claim was issued",
  "sc-date-defence-filed": "The date the defence was filed",
  "sc-date-settlement-conference": "The settlement conference date",
};

export function cardLabel(questionId: string, questionText: string): string {
  return CARD_LABELS[questionId] ?? questionText;
}

type Draft = { questionId: string; answer: string; keep: boolean };

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DAY = new RegExp(`\\b(${MONTHS})\\.? (\\d{1,2})(?:st|nd|rd|th)?,? (\\d{4})\\b|\\b(\\d{4})-(\\d{2})-(\\d{2})\\b`, "i");

/** "January 13, 2025, at 2 pm" -> "2025-01-13". Null when there is no full day. */
export function dayOf(answer: string): string | null {
  const match = DAY.exec(answer);
  if (!match) return null;
  if (match[4]) return `${match[4]}-${match[5]}-${match[6]}`;
  const month = MONTHS.split("|").findIndex((name) => new RegExp(`^(?:${name})$`, "i").test(match[1])) + 1;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

const isDateQuestion = (questionId: string) => questionId === "sc-orient-when-happened" || questionId.startsWith("sc-date-");

/**
 * For each draft, the index of the earlier draft it is shown with, or -1 when
 * it gets its own row: two date answers naming the same full day are one row.
 */
export function sameDayAs(drafts: readonly Draft[]): number[] {
  return drafts.map((draft, index) => {
    if (!isDateQuestion(draft.questionId)) return -1;
    const day = dayOf(draft.answer);
    if (!day) return -1;
    return drafts.findIndex((other, otherIndex) => otherIndex < index && isDateQuestion(other.questionId) && dayOf(other.answer) === day);
  });
}

/**
 * The drafts as confirmed: a row shown with another takes that row's tick,
 * and, if the person changed the day there, the changed answer.
 */
export function confirmedDrafts<T extends Draft>(drafts: readonly T[], shownWith: readonly number[], originals: readonly string[]): T[] {
  return drafts.map((draft, index) => {
    const lead = shownWith[index];
    if (lead === undefined || lead < 0) return draft;
    const leader = drafts[lead];
    const edited = leader.answer.trim() !== (originals[lead] ?? "").trim();
    return { ...draft, keep: leader.keep, answer: edited ? leader.answer : draft.answer };
  });
}
