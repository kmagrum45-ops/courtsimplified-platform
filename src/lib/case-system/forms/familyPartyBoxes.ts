/**
 * The boxes a Family Law Rules form gives each side at its top (Forms 8, 10, 13, 13.1): one box each for the side's
 * full legal name, address, phone and email, and the same four for its lawyer. A side with more than one party has all
 * of them in the one box, in order; the address, phone and email boxes then say whose each is.
 *
 * A box is filled only when every party on the side has the detail (a list with one party missing would look complete);
 * otherwise it says what is missing and where to add it. The other side's phone and email, and every lawyer box, are
 * filled when given and never counted as missing (as on Form 7A, partyBoxes.ts).
 *
 * The values are the case record's own words (parties.ts): no model, no wording of the site's. Pure. States no law.
 */
import { partyName, type Party } from "../parties/parties";
import { addressLine } from "./formContext";
import type { BoxEntry, FormContext } from "./formMap";

export type FamilySideBoxNames = {
  name: string; address: string; phone: string; email: string;
  lawyerName: string; lawyerAddress: string; lawyerPhone: string; lawyerEmail: string;
};

const clean = (value: string | undefined) => (value ?? "").trim();
const repAddress = (party: Party) => addressLine({ details: { street: party.details.repStreet, city: party.details.repCity, province: party.details.repProvince, postalCode: party.details.repPostalCode } });

/** One value per party, all or nothing: "" when the side is empty or any party lacks it. Named when more than one. */
function eachParty(parties: readonly Party[], value: (party: Party) => string): string {
  const values = parties.map(value);
  if (!values.length || values.some((item) => !item)) return "";
  return values.length === 1 ? values[0] : parties.map((party, index) => `${partyName(party)}: ${values[index]}`).join("; ");
}

/** The parties that gave a value, named when more than one gave it (a lawyer's details, the other side's phone). */
function given(parties: readonly Party[], value: (party: Party) => string): string {
  const held = parties.map((party) => ({ party, value: value(party) })).filter((item) => item.value);
  const distinct = [...new Set(held.map((item) => item.value))];
  if (distinct.length <= 1) return distinct[0] ?? "";
  return held.map((item) => `${partyName(item.party)}: ${item.value}`).join("; ");
}

/**
 * The eight boxes for one side. `pick` is the side's parties (ctx.plaintiffs is the side that started the case: the
 * applicants); `who` names the side in the "missing" line; `own` is true for the person's side.
 */
export function familySideBoxes(names: FamilySideBoxNames, pick: (ctx: FormContext) => readonly Party[], factBase: string, who: string, own: boolean): Record<string, BoxEntry> {
  const optional = own ? {} : { optional: true as const };
  return {
    [names.name]: { kind: "fill", fact: `${factBase}[*] full legal name`, read: (ctx) => eachParty(pick(ctx), (party) => partyName(party)), missing: { what: `the ${who}'s full legal name`, addAt: "parties" } },
    [names.address]: { kind: "fill", fact: `${factBase}[*] street, city, province, postal code`, read: (ctx) => eachParty(pick(ctx), (party) => (clean(party.details.street) && clean(party.details.city) ? addressLine(party) : "")), missing: { what: `the ${who}'s address`, addAt: "parties" } },
    [names.phone]: { kind: "fill", fact: `${factBase}[*].phone`, read: (ctx) => (own ? eachParty(pick(ctx), (party) => clean(party.details.phone)) : given(pick(ctx), (party) => clean(party.details.phone))), missing: { what: `the ${who}'s phone number`, addAt: "parties" }, ...optional },
    [names.email]: { kind: "fill", fact: `${factBase}[*].email`, read: (ctx) => (own ? eachParty(pick(ctx), (party) => clean(party.details.email)) : given(pick(ctx), (party) => clean(party.details.email))), missing: { what: `the ${who}'s email address`, addAt: "parties" }, ...optional },
    [names.lawyerName]: { kind: "fill", fact: `${factBase}[*].repName`, read: (ctx) => given(pick(ctx), (party) => clean(party.details.repName)), missing: { what: `the ${who}'s lawyer`, addAt: "parties" }, optional: true },
    [names.lawyerAddress]: { kind: "fill", fact: `${factBase}[*] lawyer's street, city, province, postal code`, read: (ctx) => given(pick(ctx), repAddress), missing: { what: `the ${who}'s lawyer's address`, addAt: "parties" }, optional: true },
    [names.lawyerPhone]: { kind: "fill", fact: `${factBase}[*].repPhone`, read: (ctx) => given(pick(ctx), (party) => clean(party.details.repPhone)), missing: { what: `the ${who}'s lawyer's phone number`, addAt: "parties" }, optional: true },
    [names.lawyerEmail]: { kind: "fill", fact: `${factBase}[*].repEmail`, read: (ctx) => given(pick(ctx), (party) => clean(party.details.repEmail)), missing: { what: `the ${who}'s lawyer's email address`, addAt: "parties" }, optional: true },
  };
}

/** The person's own party (the one using the site). */
export const you = (ctx: FormContext): Party | undefined => [...ctx.plaintiffs, ...ctx.defendants].find((party) => party.you);

/** "Sudbury, ON": the person's municipality and province, as given; "" unless both are held. */
export function municipalityAndProvince(party: Party | undefined): string {
  const city = clean(party?.details.city);
  const province = clean(party?.details.province);
  return city && province ? `${city}, ${province}` : "";
}
