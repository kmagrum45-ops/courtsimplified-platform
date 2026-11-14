/**
 * THE PARTIES OF AN OLDER CASE, READ FROM WHAT IT HOLDS (site owner, 14 Nov 2026, rule 1: "a new reader accepts old
 * data"). A case saved before the parties record (parties/parties.ts) keeps its parties in the other party fact and in
 * the whole Small Claims form's boxes (yourName, yourAddress, defendantAddress, ...). Read here, inside the case file
 * module (the one place a fact may be read: test:case-file-guard), by caseFileOf only; never saved.
 *
 * Pure. States no law.
 */
import { isCompanyName, type Party } from "../parties/parties";

const clean = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

export type OldPartyShapes = {
  /** The other party's name, as the case file holds it (answered), if any. */
  otherPartyName?: string;
  /** The whole Small Claims form's boxes, and the saved intake's (and its extra's) of the same names. */
  boxes: Record<string, unknown>[];
};

/** The parties an older case holds, read from its own answers; never saved. */
export function partiesFromOldShapes(old: OldPartyShapes): Party[] {
  const box = (...keys: string[]) => { for (const source of old.boxes) for (const key of keys) { const value = clean(source[key]); if (value) return value; } return ""; };
  const list: Party[] = [];
  const name = box("yourName");
  const street = box("yourAddress", "addressDetails");
  const you: Party = { id: "you", you: true, side: "yours", details: {}, unsure: [] };
  if (name) you.details.fullName = name;
  if (street) {
    you.details.street = street;
    // The city and province boxes start filled from where the case is heard; read only beside an address the person gave.
    const city = box("yourCity");
    const province = box("yourProvince");
    if (city) you.details.city = city;
    if (province) you.details.province = province;
  }
  const postal = box("yourPostalCode");
  const phone = box("yourPhone");
  const email = box("yourEmail");
  if (postal) you.details.postalCode = postal;
  if (phone) you.details.phone = phone;
  if (email) you.details.email = email;
  if (Object.keys(you.details).length) list.push(you);
  const otherName = clean(old.otherPartyName) || box("otherParty", "defendantName", "respondentName");
  const otherAddress = box("defendantAddress", "otherPartyAddress");
  if (otherName || otherAddress) {
    const company = otherName ? isCompanyName(otherName) : false;
    list.push({
      id: "other-1",
      side: "other",
      ...(otherName ? { kind: company ? ("company" as const) : undefined } : {}),
      details: { ...(otherName ? (company ? { companyName: otherName } : { fullName: otherName }) : {}), ...(otherAddress ? { street: otherAddress } : {}) },
      unsure: [],
    });
    if (list[list.length - 1].kind === undefined) delete list[list.length - 1].kind;
  }
  return list;
}

