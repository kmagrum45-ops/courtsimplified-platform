/**
 * FORM 10A, DEFENDANT'S CLAIM (Small Claims Court, Aug. 1, 2022; effective Jan. 30, 2023): every box of the official
 * PDF and the fact that fills it (26 Nov 2026; the same method as Forms 7A and 9A). The box names are the PDF's own
 * (docs/sources/forms/scr-10a-aug22-fil-en.pdf, read with pdf.js; test:form-maps checks every one has an entry here).
 *
 * The form's own words name its two parties "Plaintiff by Defendant's Claim" (the person making this claim: the person,
 * a defendant in the case) and "Defendant by Defendant's Claim". The boxes are named "- Plaintiff" and "- Defendant".
 *
 * Site owner, 26 Nov 2026:
 *   - The "Plaintiff" boxes are the person's own details, filled only when the case record says the person is the
 *     defendant. Whether anyone else on their side joins the claim is not held, so the Form 1A tick stays blank.
 *   - The "Defendant" boxes stay blank unless the record says who the claim is against. It does not yet, so they are
 *     blank and the fact is listed (neededFacts).
 *   - Boxes the record does not hold (the claim's own reasons and amount, the claim number, the court office) are blank,
 *     each with the fact it needs.
 *
 * Boxes that are not what they look like: "Additonal pages are attached because more room was needed" (sic) is a text
 * box 8 points square, not a check box; "Claim Number, page 1", "Name of Small Claims Court" and "Address of Small Claims
 * Court" each appear twice on page 1 under one name (one entry here); "Province - Paintiff" (sic) is the PDF's own name.
 *
 * The words beside each blank box are in copy/formBoxCopy.ts, by id. Pure. States no law.
 */
import { respondsToTheCase } from "../../caseFile/caseFile";
import { FORM_BOX_WHY } from "../../copy/formBoxCopy";
import type { BoxEntry, FormMapDefinition, FormContext } from "../formMap";
import { blank, each, needsWording } from "../mapHelpers";
import { partyBoxes } from "../partyBoxes";

const PDF_FILE = "docs/sources/forms/scr-10a-aug22-fil-en.pdf";

/** The person's details go in only when the record says the person is the defendant (as on Form 9A). */
const notTheDefendant = (ctx: FormContext): string | null => (respondsToTheCase(ctx.file) ? null : FORM_BOX_WHY.onlyWhenYouAreTheDefendant);
/** Each entry, blank as well when the person is not the defendant (a box's own blankWhen, a company's first name, still applies). */
const onlyForTheDefendant = (entries: Record<string, BoxEntry>): Record<string, BoxEntry> =>
  Object.fromEntries(Object.entries(entries).map(([box, entry]) => [box, entry.kind === "fill" ? { ...entry, blankWhen: (ctx: FormContext) => notTheDefendant(ctx) ?? entry.blankWhen?.(ctx) ?? null } : entry]));

const person = (ctx: FormContext) => ctx.defendants[0];

const CLAIM_NUMBER = "the claim number (court file number) for the defendant's claim";
const COURT_OFFICE = "the Small Claims Court office the defendant's claim is filed at (its name, address and phone)";
const AGAINST_WHOM = "who the defendant's claim is against (the plaintiff, or another person), and that party's details";
const OTHERS_ON_SIDE = "whether anyone else on the person's side makes the defendant's claim with them";
const OWN_REASONS = "the reasons for the person's own claim against the other party, in their own words (what happened, where, when), held apart from their defence";
const OWN_AMOUNT = "the principal amount of the person's own claim";

const claimNumberBox = blank(FORM_BOX_WHY.claimNumberNotHeld, CLAIM_NUMBER);
const courtBox = blank(FORM_BOX_WHY.courtOfficeNotHeld, COURT_OFFICE);
const againstWhomBox = blank(FORM_BOX_WHY.againstWhomNotHeld, AGAINST_WHOM);
const signedOnTheDay = blank(FORM_BOX_WHY.writtenOnTheDay);

export const FORM_10A: FormMapDefinition = {
  id: "small-claims/10A",
  court: "small-claims",
  number: "10A",
  title: "Defendant's Claim",
  pdf: {
    file: PDF_FILE,
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/10a/scr-10a-aug22-fil-en.pdf",
    sha256: "246e6d4a398f36302a80254078e6d8245cfa0e6bed1ba40aae016c15f5437f87",
    fetched: "2026-11-26",
  },
  boxes: {
    // ---- Page 1: the court and the parties
    "Claim Number, page 1": claimNumberBox,
    "Name of Small Claims Court": courtBox,
    "Address of Small Claims Court": courtBox,
    "Phone number of Small Claims Court": courtBox,
    "Additional plaintiff(s) listed on attached Form 1A": blank(FORM_BOX_WHY.othersOnYourSideNotHeld, OTHERS_ON_SIDE),
    "Plaintiff under 18 years of age": blank(FORM_BOX_WHY.ageNotAsked),
    ...onlyForTheDefendant(partyBoxes({
      lastOrCompany: "Last name, or name of company - Plaintiff", first: "First name - Plaintiff", second: "Second name - Plaintiff", alsoKnownAs: "Also known as - Plaintiff",
      street: "Address (street number, apt., unit) - Plaintiff", city: "City/Town - Plaintiff", province: "Province - Paintiff", phone: "Phone number - Plaintiff", postalCode: "Postal code  - Plaintiff", email: "Email address  - Plaintiff",
      repName: "Plaintiff's Representative", repLso: "Plaintiff's Representative's Law Society Of Ontraio Number", repStreet: "Address (street number, apt., unit) - Plaintiff's Representative", repCity: "City/Town - Plaintiff's Representative", repProvince: "Province - Plaintiff's Representative", repPhone: "Phone number -  Plaintiff's Representative", repPostalCode: "Postal code  -  Plaintiff's Representative", repEmail: "Email address  - Plaintiff's Representative",
    }, person, "defendants[0]", "the defendant", true)),
    "Additional defendant(s) listed on attached Form 1A": againstWhomBox,
    "Defendant under 18 years of age": blank(FORM_BOX_WHY.ageNotAsked),
    ...each([
      "Last name, or name of company - Defendant", "First name - Defendant", "Second name - Defendant", "Also known as - Defendant",
      "Address (street number, apt., unit) - Defendant", "City/Town - Defendant", "Province - Defendant", "Phone Number - Defendant", "Postal code - Defendant", "Email address - Defendant",
      "Defendant's Representative", "Defendant's Representative's Law Society of Ontario Number", "Address (street number, apt., unit) - Defendant's Representative", "City/Town - Defendant's Representative",
      "Province - Defendant's Representative", "Phone number - Defendant's Representative", "Postal code - Defendant's Representative", "Email address - Defendant's Representative",
    ], againstWhomBox),

    // ---- Pages 2 and 3: the reasons for the person's own claim (not their defence: the record holds no such words yet)
    "Claim number, page 2": claimNumberBox,
    "Reasons for claims and details. What happened? Where? When?": blank(FORM_BOX_WHY.ownClaimReasonsNotHeld, OWN_REASONS),
    "Claim number, page 3": claimNumberBox,
    "Reasons for claims and details. What happened? Where? When? (Continued)": blank(FORM_BOX_WHY.ownClaimReasonsNotHeld, OWN_REASONS),
    "Additonal pages are attached because more room was needed": blank(FORM_BOX_WHY.pagesAttachedByHand),

    // ---- Page 3: how much, interest, dates and signatures
    "Principal amount claimed (in dollars)": blank(FORM_BOX_WHY.ownClaimAmountNotHeld, OWN_AMOUNT),
    "Date": needsWording(FORM_BOX_WHY.interestNoWording),
    "the Courts of Justice Act": needsWording(FORM_BOX_WHY.interestUnderNoWording),
    "an agreement at the rate of": needsWording(FORM_BOX_WHY.interestUnderNoWording),
    "percent": needsWording(FORM_BOX_WHY.interestRateNoWording),
    "Prepared on date (day and month)": signedOnTheDay,
    "year (yy)": signedOnTheDay,
    "Signature of plaintiff or representative": blank(FORM_BOX_WHY.signedByHand),
    "Issued on date (day and month)": blank(FORM_BOX_WHY.forTheCourtOffice),
    "year (yy) 2": blank(FORM_BOX_WHY.forTheCourtOffice),
    "Signature of clerk": blank(FORM_BOX_WHY.forTheCourtOffice),
  },
};
