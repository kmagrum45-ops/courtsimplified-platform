/**
 * FORM 8A, AFFIDAVIT OF SERVICE (Small Claims Court, Aug. 1, 2022): every box of the official PDF and the fact that
 * fills it (Lane B, 15 Nov 2026; the same method as Form 7A). Box names are the PDF's own
 * (docs/sources/forms/scr-8a-aug22-en-fil.pdf; test:form-maps checks every one has an entry here).
 *
 * What the record holds today fills only the title of the proceeding: the plaintiffs and the defendants, by name. The
 * rest of the form is the service itself (who served, whom, when, where, how, which papers) and the swearing: the case
 * record does not hold who served what on whom, so each of those boxes is blank, with the fact it needs. Nothing is
 * guessed from the story: an affidavit is sworn evidence, and the person fills it in from what they did.
 *
 * Pure. States no law.
 */
import { partyName, type Party } from "../../parties/parties";
import type { FormMapDefinition } from "../formMap";
import { blank, each } from "../mapHelpers";

const CLAIM_NUMBER = "the claim number (court file number)";
const COURT_OFFICE = "the Small Claims Court office the claim was issued at (its name, address and phone)";
const DEPONENT = "who served the papers (the person swearing this affidavit): their full name and the municipality and province they live in";
const SERVICE = "the service itself: whom the papers were served on, on what day, at what address or email, and which papers";
const METHOD = "how the papers were served (the person's own choice of the methods the form lists), and its details";

const claimNumber = blank("The claim number is not held in the case record yet: copy it from the claim.", CLAIM_NUMBER);
const court = blank("The court office is not held in the case record yet: copy it from the claim.", COURT_OFFICE);
const deponent = blank("Who served the papers is not recorded. The person who served them fills this in.", DEPONENT);
const service = blank("The service is not recorded. Fill in what was served, on whom, when and where.", SERVICE);
const method = blank("How the papers were served is not recorded. Tick and fill in the method used.", METHOD);
const sworn = blank("Filled in when the affidavit is sworn or affirmed before a commissioner.");
const signed = blank("Signed by hand, before the commissioner.");
const names = (parties: readonly Party[]): string | null => { const all = parties.map(partyName); return all.length && all.every(Boolean) ? all.join("; ") : null; };

export const FORM_8A: FormMapDefinition = {
  id: "small-claims/8A",
  court: "small-claims",
  number: "8A",
  title: "Affidavit of Service",
  pdf: {
    file: "docs/sources/forms/scr-8a-aug22-en-fil.pdf",
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/08a/scr-8a-aug22-en-fil.pdf",
    sha256: "303bfa9e9f9ddb0d9c09d766c24a683dcf6be767fd85c32cbe5857fde0874738",
    fetched: "2026-11-15",
  },
  boxes: {
    // ---- Page 1: the court and the parties (filled from the record)
    ...each(["Small Claims Court", "Small Claims Court address", "Small Claims Court phone number"], court),
    ...each(["Claim Number", "Claim Number, page 2", "Claim Number, page 3"], claimNumber),
    "Plaintiff(s)": { kind: "fill", fact: "plaintiffs[*] names", read: (ctx) => names(ctx.plaintiffs), missing: { what: "the name of each plaintiff", addAt: "parties" } },
    "Defendant(s)": { kind: "fill", fact: "defendants[*] names", read: (ctx) => names(ctx.defendants), missing: { what: "the name of each defendant", addAt: "parties" } },

    // ---- Page 1: who served, whom, when, where
    ...each(["Full name", "Municipality & province", "Deponent's name 1", "Deponent’s name 3"], deponent),
    ...each(["Full name of person/corporation/etc who was served", "Date of Service (day, month)", "Date of service (year, yy)", "Street or mailing address (street and number, unit, municipality province) or email address", "Name(s) of document(s) served"], service),
    ...each([
      "the address of the persons home", "the address of the place of business of the corporation/partnership/sole proprietorship", "the address of the person's or corporation's representative on record with the court",
      "the address on the document most recently filed in court by the party", "the address of the corporation's attorney for service in Ontario", "other address", "Specify the other address",
    ], service),

    // ---- Pages 1 and 2: how the papers were served
    ...each([
      "On an individual who is not a person under disability as defined in rule 1.02: By leaving a copy with the person",
      "On a corporation, municipality, board, commission, partnership, or sole proprietorship", "Name 1", "Office or position", "Specify corporation, board, etc",
      "On a person outside Ontario carrying on business in Ontario: By leaving a copy with", "Name of the person who carries on business in Ontario for the person named in section 1",
      "By leaving a copy with the minor", "and (select and complete if applicable) another copy with", "Name 2", "Specify: parent or person with care or person with lawful custody",
      "On a mentally incapable person: By leaving a copy with", "Provide details of who was given a copy and their relationship to the person, e.g. attorney for personal care, guardian, etc",
      "On an absentee: By leaving a copy with", "Specify the absentee’s committee or Public Guardian and Trustee",
      "On the Crown in Right of Canada, the Crown in Right of Ontario, or the Attorney General of Ontario", "Provide details of service",
      "By leaving a copy in a sealed envelope addressed to the person at the person’s place of residence with a person who appeared to be an adult member of the same household, and sending another copy of the same document(s) to the person’s place of residence on the same day or the following day by",
      "regular lettermail", "registered mail", "courier", "By registered mail", "By courier", "By leaving a copy with a lawyer or paralegal",
      "By email sent to", "Email address", "Time", "By regular lettermail",
      "By mail/courier to corporation or attorney for service t last known address recorded with the Ministry of Public and Business Service Delivery, and mail/courier to each director, as recorded with the Ministry of Public and Business Service Delivery, as set out below",
      "Name of director 1", "Director's address 1", "Name of director 2", "Director's address 2", "Name of director 3", "Director's address 3", "Name of director 4", "Director's address 4", "Name of  director 5", "Director's address 5",
      "By substituted service as ordered by the court", "Date of substituted service (day, month)", "Date of substituted service (year, yy)", "Details",
    ], method),

    // ---- Page 3: witness money, extra details, and the swearing (three alternative jurat blocks)
    "I paid or tendered the witness": blank("Only when a summons to witness was served. Tick and fill in by hand if it applies."),
    "Amount of attendance money": blank("Only when a summons to witness was served. Tick and fill in by hand if it applies."),
    "I have provided other details related to service of the documents referred to in Section 1 on a separate sheet, attached to this affidavit of service": blank("Tick by hand if you attach a separate sheet."),
    ...each([
      "in person", "by video conference",
      "city, town, etc 1", "name of the city, town, etc 1", "County, Regional Municipality, etc 1", "Name of the County, Regional Municipality, etc 1", "Date of Affirmation 1",
      "City, town, etc 2", "Name of the city, town, etc 2", "County, Regional Municipality, etc 2", "Name of the County, Regional Municipality, etc 2", "Date of Affirmation 2",
      "City, town, etc 3", "Name of the city, town, etc 3", "County, Regional, Municipality, etc 3", "Name of the County, Regional Municipality, etc 3",
      "City, town, etc 3a", "Name of the city, town, etc 3a", "County, Regional Municipality, etc 3a", "Name of the County, Regional Municipality, etc 3a", "Date of Affirmation 3",
    ], sworn),
    ...each(["Signature of Commissioner (or as may be) 1", "Signature of Deponent 1", "Signature of Commissioner (or as may be) 2", "Signature of Deponent 2", "Signature of Commissioner (or as may be) 3", "Signature of Deponent 3"], signed),
  },
};
