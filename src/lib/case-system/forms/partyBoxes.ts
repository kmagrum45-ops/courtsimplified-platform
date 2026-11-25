/**
 * The boxes every Small Claims form gives a party (Form 7A's Plaintiff No. 1 and Defendant No. 1, each entry of Form
 * 1A), read from one party of the case record. Shared by the form maps so each party is written the same way on every
 * form. Pure. States no law.
 */
import { partyName, type Party, type PartyDetail } from "../parties/parties";
import type { BoxEntry, FormContext } from "./formMap";

export type PartyBoxNames = {
  lastOrCompany: string; first: string; second: string; alsoKnownAs?: string;
  street: string; city: string; province: string; phone: string; postalCode: string; email: string;
  repName: string; repLso: string; repStreet: string; repCity: string; repProvince: string; repPhone: string; repPostalCode: string; repEmail: string;
};

const text = (value: string | undefined) => (value ?? "").trim();

/** The party's own words for a detail; a person's name given whole is not split here (the asker asks which part is which). */
function detail(party: Party | undefined, key: PartyDetail): string {
  return party ? text(party.details[key]) : "";
}

/**
 * The box entries for one party. `pick` finds the party in the context (a side and a position); `who` names it in the
 * screen's "missing" line ("the plaintiff", "defendant 2"); `required` lists the details asked of this party (the
 * person's phone and email are asked; the other side's are accepted if given).
 */
export function partyBoxes(names: PartyBoxNames, pick: (ctx: FormContext) => Party | undefined, factBase: string, who: string, own: boolean): Record<string, BoxEntry> {
  const company = (ctx: FormContext) => pick(ctx)?.kind === "company";
  const nameMissing = (part: string) => ({ what: `${who}'s ${part}`, addAt: "parties" as const });
  const entries: Record<string, BoxEntry> = {
    [names.lastOrCompany]: {
      kind: "fill", fact: `${factBase}.lastName | ${factBase}.companyName`,
      read: (ctx) => { const party = pick(ctx); if (!party) return null; return company(ctx) ? detail(party, "companyName") || partyName(party) : detail(party, "lastName"); },
      missing: nameMissing("last name, or the company's name"),
    },
    [names.first]: {
      kind: "fill", fact: `${factBase}.firstName`,
      read: (ctx) => detail(pick(ctx), "firstName"),
      missing: nameMissing("first name"),
      blankWhen: (ctx) => (company(ctx) ? "Not used for a company." : null),
    },
    [names.second]: { kind: "fill", fact: `${factBase}.secondName`, read: (ctx) => detail(pick(ctx), "secondName"), missing: nameMissing("second name"), optional: true, blankWhen: (ctx) => (company(ctx) ? "Not used for a company." : null) },
    [names.street]: { kind: "fill", fact: `${factBase}.street`, read: (ctx) => detail(pick(ctx), "street"), missing: { what: `${who}'s street address`, addAt: "parties" } },
    [names.city]: { kind: "fill", fact: `${factBase}.city`, read: (ctx) => detail(pick(ctx), "city"), missing: { what: `${who}'s city or town`, addAt: "parties" } },
    [names.province]: { kind: "fill", fact: `${factBase}.province`, read: (ctx) => detail(pick(ctx), "province"), missing: { what: `${who}'s province`, addAt: "parties" } },
    [names.postalCode]: { kind: "fill", fact: `${factBase}.postalCode`, read: (ctx) => detail(pick(ctx), "postalCode"), missing: { what: `${who}'s postal code`, addAt: "parties" } },
    [names.phone]: { kind: "fill", fact: `${factBase}.phone`, read: (ctx) => detail(pick(ctx), "phone"), missing: { what: `${who}'s phone number`, addAt: "parties" }, ...(own ? {} : { optional: true as const }) },
    [names.email]: { kind: "fill", fact: `${factBase}.email`, read: (ctx) => detail(pick(ctx), "email"), missing: { what: `${who}'s email address`, addAt: "parties" }, ...(own ? {} : { optional: true as const }) },
    [names.repName]: { kind: "fill", fact: `${factBase}.repName`, read: (ctx) => detail(pick(ctx), "repName"), missing: { what: `${who}'s representative`, addAt: "parties" }, optional: true },
    [names.repLso]: { kind: "fill", fact: `${factBase}.repLso`, read: (ctx) => detail(pick(ctx), "repLso"), missing: { what: `the representative's Law Society of Ontario number`, addAt: "parties" }, optional: true },
    [names.repStreet]: { kind: "fill", fact: `${factBase}.repStreet`, read: (ctx) => detail(pick(ctx), "repStreet"), missing: { what: "the representative's street address", addAt: "parties" }, optional: true },
    [names.repCity]: { kind: "fill", fact: `${factBase}.repCity`, read: (ctx) => detail(pick(ctx), "repCity"), missing: { what: "the representative's city or town", addAt: "parties" }, optional: true },
    [names.repProvince]: { kind: "fill", fact: `${factBase}.repProvince`, read: (ctx) => detail(pick(ctx), "repProvince"), missing: { what: "the representative's province", addAt: "parties" }, optional: true },
    [names.repPhone]: { kind: "fill", fact: `${factBase}.repPhone`, read: (ctx) => detail(pick(ctx), "repPhone"), missing: { what: "the representative's phone number", addAt: "parties" }, optional: true },
    [names.repPostalCode]: { kind: "fill", fact: `${factBase}.repPostalCode`, read: (ctx) => detail(pick(ctx), "repPostalCode"), missing: { what: "the representative's postal code", addAt: "parties" }, optional: true },
    [names.repEmail]: { kind: "fill", fact: `${factBase}.repEmail`, read: (ctx) => detail(pick(ctx), "repEmail"), missing: { what: "the representative's email address", addAt: "parties" }, optional: true },
  };
  if (names.alsoKnownAs) entries[names.alsoKnownAs] = { kind: "fill", fact: `${factBase}.alsoKnownAs`, read: (ctx) => detail(pick(ctx), "alsoKnownAs"), missing: { what: `other names ${who} is known by`, addAt: "parties" }, optional: true };
  return entries;
}

/** The "missing" line for a person's name held whole: the name as given, and what is still needed. */
export function wholeNameNote(party: Party | undefined): string | null {
  if (!party || party.kind === "company" || text(party.details.lastName)) return null;
  const whole = text(party.details.fullName);
  return whole ? `Held as "${whole}": say which part is the last name and which the first.` : null;
}
