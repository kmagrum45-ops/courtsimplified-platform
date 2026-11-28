/**
 * WHEN A SMALL CLAIMS CATALOGUE ITEM APPLIES TO THIS CASE (site owner, 27 Nov 2026, order of work step 2).
 *
 * Every PlaintiffElement, DefendantConsideration and ProceduralNote of a Small Claims claim type has a showing
 * condition, written against the case record (caseFile.ts CaseFile), kept HERE and keyed by the item, so the catalogue
 * (claimTypes.ts and moreClaimTypes/) and its legal wording are never changed. The default is hidden: an item shows only
 * when its condition is met by what the record holds.
 *
 * Every item's condition starts with "the record's confirmed kind of claim is this item's claim type" (a kind not yet
 * confirmed shows nothing). An item whose own text names a further fact (a consumer agreement, a minor, a newspaper or
 * broadcast, ...) also needs that fact. A fact the record does not hold yet is not "no": the verdict is "ask", and the
 * fact is asked ONCE through the one asker (site owner's choice, 27 Nov 2026: "Hide; ask once"). The questions' words
 * are not written yet: they go in copy/askCopy.ts by id, for the owner's approval, with the new results step (step 3).
 *
 * The conditions are generated from the items' own text (scripts/content/generateCatalogueConditions.ts) into
 * catalogueConditions.generated.ts, one reviewable entry per item; test:catalogue-conditions checks every item has one.
 */
import type { CaseFile } from "../caseFile/caseFile";

/** Facts that decide whether an item applies, beyond what the record already holds. Each is asked once when needed. */
export const APPLICABILITY_FACTS = [
  "consumerAgreement", // the agreement was a consumer agreement (Consumer Protection Act, 2002)
  "employment", // the dispute is between an employer and an employee
  "residentialTenancy", // the dispute is about a residential tenancy
  "partyIsMinor", // a party is under 18
  "publishedInNewspaperOrBroadcast", // the words were published in a newspaper or a broadcast
  "governmentParty", // a municipality, the Crown or a government body is a party
  "insurerInvolved", // an insurer is involved
  "loanRepayableOnDemand", // the loan had no fixed repayment date (repayable on demand)
  "moneyOwed", // the claim is for money the other side owes (a debt), which is when set-off (CJA s. 111) can come up
] as const;
export type ApplicabilityFact = (typeof APPLICABILITY_FACTS)[number];

export type ItemCondition =
  | { kind: "claim-type"; id: string }
  | { kind: "fact"; fact: ApplicabilityFact; is: boolean }
  | { kind: "amount-over"; dollars: number }
  | { all: ItemCondition[] }
  | { any: ItemCondition[] };

/** Where an item is in the catalogue: its claim type, its list, and its id (a procedural note has none: its index). */
export type ItemKey = `${string}|${"element" | "consideration" | "note"}|${string}`;
export const itemKey = (claimTypeId: string, list: "element" | "consideration" | "note", idOrIndex: string | number): ItemKey => `${claimTypeId}|${list}|${idOrIndex}`;

/** The record's answers to the applicability facts (saved with the case; read by the results step). */
export type ApplicabilityAnswers = Partial<Record<ApplicabilityFact, boolean>>;

export type Verdict = { shows: true } | { shows: false; ask: ApplicabilityFact[] };

const confirmedKind = (record: CaseFile | null): string | null => {
  const kind = record?.claimKind;
  return kind && kind.state === "answered" && kind.confirmed && typeof kind.value === "string" ? kind.value : null;
};
const amountOf = (record: CaseFile | null): number | null => {
  const amount = record?.amount;
  return amount && amount.state === "answered" && typeof amount.value === "number" ? amount.value : null;
};

/**
 * Whether the item shows. Hidden by default: anything not met is hidden. A fact the record does not hold yet comes back
 * as `ask` (the facts that would decide it), never as shown.
 */
export function verdictOf(condition: ItemCondition, record: CaseFile | null, answers: ApplicabilityAnswers = {}): Verdict {
  if ("all" in condition) {
    const parts = condition.all.map((part) => verdictOf(part, record, answers));
    if (parts.every((part) => part.shows)) return { shows: true };
    // A part already known to be unmet hides it without asking anything.
    if (parts.some((part) => !part.shows && part.ask.length === 0)) return { shows: false, ask: [] };
    return { shows: false, ask: [...new Set(parts.flatMap((part) => (part.shows ? [] : part.ask)))] };
  }
  if ("any" in condition) {
    const parts = condition.any.map((part) => verdictOf(part, record, answers));
    if (parts.some((part) => part.shows)) return { shows: true };
    return { shows: false, ask: [...new Set(parts.flatMap((part) => (part.shows ? [] : part.ask)))] };
  }
  if (condition.kind === "claim-type") return confirmedKind(record) === condition.id ? { shows: true } : { shows: false, ask: [] };
  if (condition.kind === "amount-over") {
    const amount = amountOf(record);
    return amount !== null && amount > condition.dollars ? { shows: true } : { shows: false, ask: [] };
  }
  const known = answers[condition.fact];
  if (known === undefined) return { shows: false, ask: [condition.fact] };
  return known === condition.is ? { shows: true } : { shows: false, ask: [] };
}

/** The default rule: an item applies to its own claim type, once the record's kind of claim is confirmed as that type. */
export const defaultCondition = (claimTypeId: string): ItemCondition => ({ kind: "claim-type", id: claimTypeId });
