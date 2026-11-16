/**
 * FAMILY LAW RULES FORM 10, ANSWER (FLR 10, June 13, 2025): every box of the official PDF and the fact that fills it
 * (Lane B, 15 Nov 2026; the same method as Small Claims Form 7A). Box names are the PDF's own
 * (docs/sources/forms/flr-10-jun25-en-fil.pdf; test:form-maps checks every one has an entry here).
 *
 * The person is the respondent (they answer the application). Filled from the record: each side's names, addresses,
 * phone and email, the applicant's lawyer if given (familyPartyBoxes.ts), and "My name is" (the person). Which of the
 * applicant's claims the person agrees or disagrees with, their own claims, and the facts for them are the person's
 * choices and words that the record does not hold: blank, each with its reason. The story is not poured into the facts
 * boxes: they follow the claims chosen.
 *
 * Pure. States no law.
 */
import { partyName } from "../../parties/parties";
import type { FormContext, FormMapDefinition } from "../formMap";
import { familySideBoxes, you } from "../familyPartyBoxes";
import { blank, each, needsWording } from "../mapHelpers";

const COURT_OFFICE = "the Family court office the application was filed at (its name and address, as on the application)";
const FILE_NUMBER = "the court file number on the application the person was served with";
const ADDED = "any added respondent or added party (their full legal name and address), and the Children's Lawyer's agent if one acts";
const POSITION = "which of the applicant's claims the person agrees with and which they do not (by the numbers on the application), each the person's own choice";
const OWN_CLAIMS = "whether the person makes claims of their own, against whom, and which (the claims on page 4), each ticked by the person";
const HISTORY = "whether the family history in the application is correct";
const FACTS = "the facts for the person's position and for each of their own claims, in the person's own words";

const fileNumber = blank("The court file number is not held in the case record yet: copy it from the application.", FILE_NUMBER);
const court = blank("The court office is not held in the case record yet: copy it from the application.", COURT_OFFICE);
const added = blank("Not asked by the site. Fill in by hand if it applies.", ADDED);
const position = blank("Which claims you agree or disagree with is your choice, and is not asked by the site. Fill in by hand.", POSITION);
const ownClaims = blank("Your own claims are your choice, and are not asked by the site. Tick by hand.", OWN_CLAIMS);
const signed = blank("Signed and dated by hand.");
const lawyer = blank("Completed by your lawyer, if you have one.");

const applicants = (ctx: FormContext) => ctx.plaintiffs;
const respondents = (ctx: FormContext) => ctx.defendants;

export const FAMILY_FORM_10: FormMapDefinition = {
  id: "family/10",
  court: "family",
  number: "10",
  title: "Answer",
  pdf: {
    file: "docs/sources/forms/flr-10-jun25-en-fil.pdf",
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/family/10/flr-10-jun25-en-fil.pdf",
    sha256: "a1dc3693c8357adea943916a36617f9b1094fd8d662c61c373fc14f6d5c15cd9",
    fetched: "2026-11-15",
  },
  boxes: {
    ...each(["Court File Number, page 1", "Court File Number, page 2", "Court File Number, page 3", "Court File Number, page 4", "Court File Number, page 5"], fileNumber),
    ...each(["Name of court", "Court office address"], court),

    // ---- Page 1: the parties (filled from the record)
    ...familySideBoxes({
      name: "Full legal name - Applicant(s)", address: "Address - Applicant(s)", phone: "Phone & fax - Applicant(s)", email: "Email - Applicant(s)",
      lawyerName: "Name - Applicant(s) Lawyer", lawyerAddress: "Address - Applicant(s) Lawyer", lawyerPhone: "Phone & fax - Applicant(s) Lawyer", lawyerEmail: "Email - Applicant(s) Lawyer",
    }, applicants, "applicants", "applicant", false),
    ...familySideBoxes({
      name: "Full legal name - Respondent(s)", address: "Address - Respondent(s)", phone: "Phone & fax - Respondent(s)", email: "Email - Respondent(s)",
      lawyerName: "Name - Respondent(s) Lawyer", lawyerAddress: "Address - Respondent(s) Lawyer", lawyerPhone: "Phone & fax - Respondent(s) Lawyer", lawyerEmail: "Email - Respondent(s) Lawyer",
    }, respondents, "respondents", "respondent", true),
    ...each(["Name & address of Children's Lawyer's agent for service", "Full legal name - added respondent", "Address of added party"], added),
    "Full legal name": { kind: "fill", fact: "you: full legal name (\"My name is\")", read: (ctx) => { const party = you(ctx); return party ? partyName(party) : null; }, missing: { what: "your full legal name", addAt: "parties" } },

    // ---- Pages 1 and 2: the person's position
    ...each([
      "I agree with the following claim(s) made by the applicant",
      "I do not agree with the following claim(s) made by the applicant: (Refer to the numbers alongside the boxes on page 4 of the application form.)",
      "I am asking that the applicant’s claim (except for the parts with which I agree) be dismissed with costs",
    ], position),
    "I am making a claim of my own": ownClaims,
    ...each(["The FAMILY HISTORY, as set out in the application", "is correct", "is not correct"], blank("Not asked by the site. Tick by hand.", HISTORY)),
    "Facts that form the legal basis for my position in paragraph 2": blank("The facts for your position, in your own words. Not filled from your story: they follow the claims you agree or disagree with, which the site does not hold.", FACTS),

    // ---- Page 3: signatures
    ...each(["Date - Respondent’s signature 1", "Respondent’s signature 1"], signed),
    ...each(["Name - Respondent’s lawyer", "Date - Lawyer's signature", "Lawyer's signature"], lawyer),

    // ---- Page 4: the person's own claims
    ...each(["the applicant", "an added party", "Full legal name - added party"], ownClaims),
    ...each([
      "a divorce", "support for me 1", "support for child(ren) – table amount 1", "support for child(ren) - other than table amount 1", "decision-making responsibility for child(ren) 1", "parenting time with child(ren) 1",
      "contact with child(ren) (this requires court leave)", "equalization of net family properties", "exclusive possession of matrimonial home", "exclusive possession of contents of matrimonial home", "freezing assets", "sale of family property",
      "access", "lesser protection order", "return of child(ren) to my care", "place child(ren) into care of:", "Name of person", "interim society care and custody", "Number of months - interim society care and custody",
      "society supervision of my child(ren)", "Number of months - society supervision",
      "support for me 2", "support for child(ren) – table amount 2", "support for child(ren) – other than table amount 2", "decision-making responsibility for child(ren) 2", "parenting time with child(ren) 2",
      "restraining/non-harassment order", "indexing spousal support", "declaration of parentage",
      "guardianship over child's property (claim must be served on the Children’s Lawyer and the child must currently have property)", "contact with child(ren) (this does not require court leave)",
      "Wrongful removal to or retention of child(ren) in Ontario involving a country outside Canada under the Convention on the Civil Aspects of International Child Abduction",
      "Wrongful removal to or retention of child(ren) in Ontario involving a country outside Canada NOT under the Convention on the Civil Aspects of International Child Abduction",
      "costs", "annulment of marriage", "prejudgment interest", "claims relating to a family arbitration", "Other", "Other - Specify",
    ], ownClaims),
    "Details of the order that you want the court to make": needsWording("The site has no checked wording for the orders asked for. Write them in your own words, or with legal help.", OWN_CLAIMS),

    // ---- Page 5: the facts for the person's own claims, and signature
    "Facts that form the legal basis for your claim(s)": blank("The facts for each of your claims, in your own words. Not filled from your story: they follow the claims you tick.", FACTS),
    ...each(["Date - Respondent’s signature 2", "Respondent’s signature 2"], signed),
  },
};
