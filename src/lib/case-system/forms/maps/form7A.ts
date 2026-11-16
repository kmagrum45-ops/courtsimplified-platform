/**
 * FORM 7A, PLAINTIFF'S CLAIM (Small Claims Court, Aug. 1, 2022): every box of the official PDF and the fact that fills it
 * (site owner, 14 Nov 2026, rules 4 to 6). The box names are the PDF's own (docs/sources/forms/scr-7a-aug22-en-fil.pdf,
 * read with pdf.js; test:form-maps checks every one has an entry here).
 *
 * The parties: Plaintiff No. 1 and Defendant No. 1 are the first party on each side (parties.ts partiesByRole); every
 * party after them is its own entry on Form 1A (form1A.ts), and the "listed on attached Form 1A" boxes are ticked.
 * The reasons for the claim are the person's own words (no site question, no sentence that only gives party details).
 *
 * Pure. States no law: a box the site has no wording for is left blank and listed (needsWording).
 */
import { formatRecordedAmount } from "../../format/recordedAmount";
import type { AttachedSection, FormMapDefinition, FormContext } from "../formMap";
import { partyBoxes } from "../partyBoxes";
import { splitToBoxes } from "../textFit";

const PDF_FILE = "docs/sources/forms/scr-7a-aug22-en-fil.pdf";

/**
 * The reasons over the page 2 box and the page 3 continued box, as many whole sentences as each holds at a readable size
 * (textFit.ts, measured: until 15 Nov 2026 a fixed 3,400 and 1,200 characters, which lost the last lines below the box),
 * then the rest, for added pages.
 */
export function splitReasons(text: string): [string, string, string] {
  const [first, second, rest] = splitToBoxes(PDF_FILE, ["Reasons for claim and details", "Reasons for claim and details_continued"], text);
  return [first, second, rest];
}

/**
 * The reasons that did not fit either box, for the attached pages: headed with the official form's own words (page 1's
 * "Form 7A" and "Plaintiff's Claim"; page 2's "REASONS FOR CLAIM AND DETAILS"), "(continued)".
 */
const reasonsAttached = (ctx: FormContext): AttachedSection[] => [{ title: "Form 7A, Plaintiff's Claim", heading: "REASONS FOR CLAIM AND DETAILS (continued)", text: splitReasons(ctx.reasons)[2] }];

const plaintiff = (ctx: FormContext) => ctx.plaintiffs[0];
const defendant = (ctx: FormContext) => ctx.defendants[0];
const claimNumberBox = { kind: "blank" as const, why: "For the court office." };

export const FORM_7A: FormMapDefinition = {
  id: "small-claims/7A",
  court: "small-claims",
  number: "7A",
  title: "Plaintiff's Claim",
  pdf: {
    file: PDF_FILE,
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/07a/scr-7a-aug22-en-fil.pdf",
    sha256: "8a10d53ae1fbc4e4d4b2022e0e6aea9f3ae3c24c9d9b1d4ee0e8ac1fed970e78",
    fetched: "2026-11-14",
  },
  boxes: {
    // ---- Page 1: the court and the parties
    "Claim Number page 1": claimNumberBox,
    "Claim Number page 2": claimNumberBox,
    "Claim Number page 3": claimNumberBox,
    "Small Claims Court": { kind: "blank", why: "Which Small Claims Court office the claim is filed at is not chosen in the case yet.", needsWording: true },
    "Small Claims Court Address": { kind: "blank", why: "Filled with the office once it is chosen.", needsWording: true },
    "Small Claims Court Phone number": { kind: "blank", why: "Filled with the office once it is chosen.", needsWording: true },
    "Additional plaintiff(s) listed on attached Form 1A": { kind: "fill", fact: "parties: more than one plaintiff", read: (ctx) => ctx.plaintiffs.length > 1, missing: { what: "", addAt: "parties" } },
    "Plaintiff under 18 years of age": { kind: "blank", why: "The site does not ask a party's age. If this party is under 18, tick the box by hand." },
    ...partyBoxes({
      lastOrCompany: "Plaintiff's last name or the company's name", first: "First name of the Plaintiff", second: "Second name of the Plaintiff",
      street: "Plaintiff's address (street number, apartment, unit number)", city: "Plaintiff's City/Town", province: "Plaintiff's province", phone: "Plaintiff's phone number", postalCode: "Plaintiff's postal code", email: "Plaintiff's email address",
      repName: "Plaintiff's representative's name", repLso: "Plaintiff's representative's Law Society of Ontario number", repStreet: "Plaintiff's representative's Address (street number, apartment, unit)", repCity: "Plaintiff's representative's City/Town", repProvince: "Plaintiff's representative's province", repPhone: "Plaintiff's representative's phone number", repPostalCode: "Paintiff's representative's postal code", repEmail: "Plaintiff's representative's email address",
    }, plaintiff, "plaintiffs[0]", "the plaintiff", true),
    // The official PDF names both "Also known as" boxes (the plaintiff's and the defendant's) the same, so one value would print
    // in both. Left blank: write other names by hand.
    "Any other names the plaintiff is known by": { kind: "blank", why: "The official form gives the plaintiff's and the defendant's \"Also known as\" boxes one name, so a value would print in both. Write other names by hand." },
    "Additional defendant(s) listed on attached Form 1A": { kind: "fill", fact: "parties: more than one defendant", read: (ctx) => ctx.defendants.length > 1, missing: { what: "", addAt: "parties" } },
    "Defendant under 18 years of age": { kind: "blank", why: "The site does not ask a party's age. If this party is under 18, tick the box by hand." },
    ...partyBoxes({
      lastOrCompany: "Defendant's last name or company's name", first: "Defendant's first name", second: "Defendant's second name",
      street: "Defendant's address (street number, apartment, unit number)", city: "Defendant's City/Town", province: "Defendant's province", phone: "Defendant's phone number", postalCode: "Defendant's postal code", email: "Defendant's email address",
      repName: "Defendant's representative's name", repLso: "Defendant's representative's Law Society of Ontario number", repStreet: "Defendant's representative's address (street number, apartment, unit number)", repCity: "Defendant's representative's City/Town", repProvince: "Defendant's representative's province", repPhone: "Defendant's representative's phone number", repPostalCode: "Defendant's representative's postal code", repEmail: "Defendant's representative's email address",
    }, defendant, "defendants[0]", "the defendant", false),

    // ---- Pages 2 and 3: the reasons, in the person's own words
    "Reasons for claim and details": { kind: "fill", fact: "story (the person's own words)", read: (ctx) => splitReasons(ctx.reasons)[0], missing: { what: "what happened, in your own words", addAt: "story" } },
    "Reasons for claim and details_continued": { kind: "fill", fact: "story, continued", read: (ctx) => splitReasons(ctx.reasons)[1], missing: { what: "", addAt: "story" }, optional: true },
    // Ticked exactly when pages are attached: the same sections the download attaches (officialPdf.ts filledFormPdf).
    "Additional pages attached because more room was needed": { kind: "fill", fact: "story longer than both boxes (the attached pages)", read: (ctx) => reasonsAttached(ctx).some((section) => section.text.trim().length > 0), missing: { what: "", addAt: "story" } },

    // ---- Page 3: how much, interest, dates and signatures
    "Principal amount claimed": { kind: "fill", fact: "amount", read: (ctx) => (ctx.amount === null ? null : formatRecordedAmount(String(ctx.amount)).replace(/^\$/, "")), missing: { what: "the amount you are claiming", addAt: "amount" } },
    "Start date for accruing prejudgement interest": { kind: "blank", why: "Whether to claim prejudgment interest, and from what date, is not asked: the site has no checked wording for it yet.", needsWording: true },
    "the Courts of Justice Act": { kind: "blank", why: "Which interest the claim is under is not asked: the site has no checked wording for it yet.", needsWording: true },
    "an agreement at the rate of": { kind: "blank", why: "Which interest the claim is under is not asked: the site has no checked wording for it yet.", needsWording: true },
    "Percentage": { kind: "blank", why: "An agreed interest rate is not asked: the site has no checked wording for it yet.", needsWording: true },
    "Day and month prepared": { kind: "blank", why: "Written by hand on the day you sign." },
    "Year prepared (yy)": { kind: "blank", why: "Written by hand on the day you sign." },
    "Signature of plaintiff or representative": { kind: "blank", why: "Signed by hand." },
    "Day and month issued": { kind: "blank", why: "For the court office." },
    "Year issued (yy)": { kind: "blank", why: "For the court office." },
    "Signature of clerk": { kind: "blank", why: "For the court office." },
  },
  attachments: reasonsAttached,
};
