/**
 * FORM 1A, ADDITIONAL PARTIES (Small Claims Court, Jan. 1, 2021): every party after the first on each side, each its own
 * entry, three to a copy (site owner, 14 Nov 2026, rule 2: a second defendant is never merged into another party's
 * name). The box names are the PDF's own (docs/sources/forms/scr-1a-jan21-en-fil.pdf; test:form-maps checks them all).
 *
 * Pure. States no law.
 */
import type { AdditionalParty, BoxEntry, FormContext, FormMapDefinition } from "../formMap";
import type { Party } from "../../parties/parties";
import { partyBoxes } from "../partyBoxes";

export const ENTRIES_PER_1A = 3;

/** Every party after the first on each side, in order (plaintiffs, then defendants), with its number on its side. */
export function additionalParties(plaintiffs: readonly Party[], defendants: readonly Party[]): AdditionalParty[] {
  return [
    ...plaintiffs.slice(1).map((party, index) => ({ party, side: "plaintiff" as const, number: index + 2 })),
    ...defendants.slice(1).map((party, index) => ({ party, side: "defendant" as const, number: index + 2 })),
  ];
}

/** The copies of Form 1A a case needs: three parties to each (none when each side has one party). */
export function form1ACopies(additional: readonly AdditionalParty[]): AdditionalParty[][] {
  const copies: AdditionalParty[][] = [];
  for (let at = 0; at < additional.length; at += ENTRIES_PER_1A) copies.push(additional.slice(at, at + ENTRIES_PER_1A));
  return copies;
}

function entry(index: number, names: { rep: { street: string; postal: string; email: string; phone: string } }): Record<string, BoxEntry> {
  const n = index + 1;
  const at = (ctx: FormContext) => ctx.additional?.[index];
  const whoOf = `the party in entry ${n}`;
  return {
    [`Plaintiff ${n}`]: { kind: "fill", fact: `additional[${index}].side`, read: (ctx) => (at(ctx) ? at(ctx)!.side === "plaintiff" : false), missing: { what: "", addAt: "parties" } },
    [`Defendant ${n}`]: { kind: "fill", fact: `additional[${index}].side`, read: (ctx) => (at(ctx) ? at(ctx)!.side === "defendant" : false), missing: { what: "", addAt: "parties" } },
    [`Plaintiff number ${n}`]: { kind: "fill", fact: `additional[${index}].number`, read: (ctx) => (at(ctx)?.side === "plaintiff" ? String(at(ctx)!.number) : ""), missing: { what: "", addAt: "parties" }, optional: true },
    [`Defendant number ${n}`]: { kind: "fill", fact: `additional[${index}].number`, read: (ctx) => (at(ctx)?.side === "defendant" ? String(at(ctx)!.number) : ""), missing: { what: "", addAt: "parties" }, optional: true },
    ...Object.fromEntries(Object.entries(partyBoxes({
      lastOrCompany: `Last name or name of company ${n}`, first: `First name ${n}`, second: `Second name ${n}`, alsoKnownAs: `Also known as ${n}`,
      street: `Address (street number, apartment, unit) ${n}`, city: `City/Town ${n}`, province: `Province ${n}`, phone: `Phone number ${n}`, postalCode: `Postal code ${n}`, email: `Email address ${n}`,
      repName: `Representative ${n}`, repLso: `Representative's Law Society of Ontario number ${n}`, repStreet: names.rep.street, repCity: `Representative's City/Town ${n}`, repProvince: `Representative's Province ${n}`, repPhone: names.rep.phone, repPostalCode: names.rep.postal, repEmail: names.rep.email,
    }, (ctx) => at(ctx)?.party, `additional[${index}]`, whoOf, false)).map(([box, value]) => {
      // An entry with no party on this copy is left empty, not "missing".
      if (value.kind !== "fill") return [box, value];
      const read = value.read;
      return [box, { ...value, read: (ctx: FormContext) => (at(ctx) ? read(ctx) : ""), blankWhen: (ctx: FormContext) => (at(ctx) ? value.blankWhen?.(ctx) ?? null : "No party in this entry.") }];
    })),
  };
}

export const FORM_1A: FormMapDefinition = {
  id: "small-claims/1A",
  court: "small-claims",
  number: "1A",
  title: "Additional Parties",
  pdf: {
    file: "docs/sources/forms/scr-1a-jan21-en-fil.pdf",
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/01a/scr-1a-jan21-en-fil.pdf",
    sha256: "a1c9688900ec8b19fc675b9ff6485ee04aba84df47ad5ab80822a0d9ea107501",
    fetched: "2026-11-14",
  },
  boxes: {
    "Claim Number": { kind: "blank", why: "For the court office." },
    ...entry(0, { rep: { street: "Representative's Address, (street number, apartment, unit) 1", postal: "Representative's Postal code 1", email: "Representative's Email address 1", phone: "Representative's phone number 1" } }),
    ...entry(1, { rep: { street: "Representative's Address (street number, apartment number, unit) 2", postal: "Representative's postal code 2", email: "Representative's email address 2", phone: "Representative's phone number 2" } }),
    ...entry(2, { rep: { street: "Representative's Address (street number, apartment, unit) 3", postal: "Representative's postal code 3", email: "Representative's email address 3", phone: "Representative's phone number 3" } }),
  },
};
