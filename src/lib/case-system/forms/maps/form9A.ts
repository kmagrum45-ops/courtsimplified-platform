/**
 * FORM 9A, DEFENCE (Small Claims Court, Aug. 1, 2022): every box of the official PDF and the fact that fills it (Lane B,
 * 15 Nov 2026; the same method as Form 7A, form7A.ts). The box names are the PDF's own
 * (docs/sources/forms/scr-9a-aug22-en-fil.pdf, read with pdf.js; test:form-maps checks every one has an entry here).
 *
 * The person is a defendant: Plaintiff No. 1 and Defendant No. 1 are the first party on each side (parties.ts
 * partiesByRole, the person's side being the defendants); every party after them is its own entry on Form 1A
 * (form1A.ts), and the "listed on attached Form 1A" boxes are ticked. The page 2 box asks "what happened, where, when":
 * the person's own words (no site question, no sentence that only gives party details), as on Form 7A.
 *
 * Unlike Form 7A, this PDF gives the plaintiff's and the defendant's "also known as" boxes their own names, so both fill.
 *
 * Pure. States no law: a box the site has no fact or wording for is left blank, with the reason.
 */
import { partyName } from "../../parties/parties";
import type { FormMapDefinition, FormContext } from "../formMap";
import { partyBoxes } from "../partyBoxes";
import { splitText } from "../splitText";

/** The room in the page 2 box and the page 3 continued box (each about the same share of its box as Form 7A's). */
export const DEFENCE_REASONS_BUDGETS = [2_600, 1_400] as const;
const reasons = (ctx: FormContext) => splitText(ctx.reasons, DEFENCE_REASONS_BUDGETS);

const plaintiff = (ctx: FormContext) => ctx.plaintiffs[0];
const defendant = (ctx: FormContext) => ctx.defendants[0];

const CLAIM_NUMBER = "the claim number (court file number) on the Plaintiff's Claim the person was served with";
const claimNumberBox = { kind: "blank" as const, why: "The claim number is not held in the case record yet: copy it from the Plaintiff's Claim.", needsFact: CLAIM_NUMBER };
const COURT_OFFICE = "the Small Claims Court office the claim was issued at (its name, address and phone, as on the claim)";
const courtBox = { kind: "blank" as const, why: "The court office is not held in the case record yet: copy it from the Plaintiff's Claim.", needsFact: COURT_OFFICE };
const RESPONSE = "what the person says to the claim: dispute it, admit all of it, or admit part (and how much), each by the person's own choice";
const responseBox = { kind: "blank" as const, why: "The site does not ask yet whether you dispute the claim, admit all of it or admit part. Tick by hand.", needsFact: RESPONSE };
const TERMS = "the terms of payment the person proposes (amount, per week or month, first payment date), if they admit any of the claim";
const termsBox = { kind: "blank" as const, why: "Terms of payment are not asked. Fill in by hand if you admit any of the claim.", needsFact: TERMS };
const signedBox = { kind: "blank" as const, why: "Written by hand on the day you sign." };

export const FORM_9A: FormMapDefinition = {
  id: "small-claims/9A",
  court: "small-claims",
  number: "9A",
  title: "Defence",
  pdf: {
    file: "docs/sources/forms/scr-9a-aug22-en-fil.pdf",
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/09a/scr-9a-aug22-en-fil.pdf",
    sha256: "32fa5e1e13a2de947c944fb45bb69a282591615efb71ee80a7bf8afff986ece6",
    fetched: "2026-11-15",
  },
  boxes: {
    // ---- Page 1: the court and the parties
    "Claim Number page 1": claimNumberBox,
    "Small Claims Court": courtBox,
    "Small Claims Court Address": courtBox,
    "Small Claims Court Phone number": courtBox,
    "Additional plaintiff(s) listed on attached Form 1A": { kind: "fill", fact: "parties: more than one plaintiff", read: (ctx) => ctx.plaintiffs.length > 1, missing: { what: "", addAt: "parties" } },
    "Under 18 years of age - plaintiff": { kind: "blank", why: "The site does not ask a party's age. If this party is under 18, tick the box by hand." },
    ...partyBoxes({
      lastOrCompany: "Last name or name of company for plaintiff", first: "First name of the plaintiff", second: "Second name of the plaintiff", alsoKnownAs: "Plaintiff also known as",
      street: "Plaintiff's Address (street number, apartment, unit)", city: "Plaintiff's city/town", province: "Plaintiff's province", phone: "Plaintiff's Phone number", postalCode: "Plaintiff's postal code", email: "Plaintiff's email address",
      repName: "Plaintiff's representative's name", repLso: "Plaintiff's representative's Law Society of Ontario number", repStreet: "Plaintiff's Representative's address (street number, apartment. unit)", repCity: "Plaintiff's representative's city/town", repProvince: "Plaintiff's representative's province", repPhone: "Plaintiff's representative's phone number", repPostalCode: "Plaintiff's representative's postal code", repEmail: "Plaintiff's representative's email address",
    }, plaintiff, "plaintiffs[0]", "the plaintiff", false),
    "Additional defendant(s) listed on attached Form 1A": { kind: "fill", fact: "parties: more than one defendant", read: (ctx) => ctx.defendants.length > 1, missing: { what: "", addAt: "parties" } },
    "Under 18 years of age - defendant": { kind: "blank", why: "The site does not ask a party's age. If this party is under 18, tick the box by hand." },
    ...partyBoxes({
      lastOrCompany: "Last name or name of company for defendant", first: "First name of defendant", second: "Second name of defendant", alsoKnownAs: "Defendant also known as",
      street: "Defendant's address (street number, apartment, unit)", city: "Defendant's city/town", province: "Defendant's province", phone: "Defendant's phone number", postalCode: "Defendant's postal code", email: "Defendant's email address",
      repName: "Defendant's representative", repLso: "Defendant's representative's Law Society of Ontario number", repStreet: "Defendant's representative's address (street number, apartment, unit)", repCity: "Defendant's representative's city/town", repProvince: "Defendant's representative's province", repPhone: "Defendant's representative's phone number", repPostalCode: "Defendant representative's postal code", repEmail: "Defendant representative's email address",
    }, defendant, "defendants[0]", "the defendant", true),

    // ---- Page 2: on whose behalf, the response, and the reasons in the person's own words
    "Claim Number, page 2": claimNumberBox,
    "Name(s) of defendant(s)": {
      kind: "fill", fact: "defendants[*] names (the person's side)",
      read: (ctx) => { const names = ctx.defendants.map(partyName); return names.length && names.every(Boolean) ? names.join("; ") : null; },
      missing: { what: "the name of each defendant on your side", addAt: "parties" },
    },
    "Dispute the claim made against me/us": responseBox,
    "Admit the full claim and propose the following terms of payment": responseBox,
    "Amount 1": termsBox,
    "week/month 1": termsBox,
    "Day and month of payment 1": termsBox,
    "Year of payment (yy) 1": termsBox,
    "Admit part of the claim in the amount of": responseBox,
    "Amount 2": { kind: "blank", why: "How much of the claim you admit is not asked. Fill in by hand if you admit part.", needsFact: RESPONSE },
    "Amount 3": termsBox,
    "week/month 2": termsBox,
    "Day and month of payment 2": termsBox,
    "Year of payment (yy) 2": termsBox,
    "Reasons for disputing the claim and details": { kind: "fill", fact: "story (the person's own words)", read: (ctx) => reasons(ctx)[0], missing: { what: "what happened, in your own words", addAt: "story" } },

    // ---- Page 3: the reasons continued, why the person disagrees, the date and signature
    "Claim Number, page 3": claimNumberBox,
    "Reasons for disputing the claim and details, continued": { kind: "fill", fact: "story, continued", read: (ctx) => reasons(ctx)[1], missing: { what: "", addAt: "story" }, optional: true },
    "Reasons for disagreeing with all or part of the claim": {
      kind: "blank", why: "Why you disagree with the claim is not asked on its own yet. Write it in your own words.",
      needsFact: "why the person disagrees with all or part of the claim, in their own words (asked on its own, not taken from the story)",
    },
    "Additional pages attached because more room was needed": { kind: "fill", fact: "story longer than both boxes", read: (ctx) => reasons(ctx)[2].length > 0, missing: { what: "", addAt: "story" } },
    "Day and month of signature": signedBox,
    "Year of signature (yy)": signedBox,
    "Signature of defendant or representative": { kind: "blank", why: "Signed by hand." },
  },
};
