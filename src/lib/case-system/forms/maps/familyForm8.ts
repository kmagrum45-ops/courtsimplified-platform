/**
 * FAMILY LAW RULES FORM 8, APPLICATION (GENERAL) (FLR 8, June 13, 2025): every box of the official PDF and the fact that
 * fills it (Lane B, 15 Nov 2026; the same method as Small Claims Form 7A). Box names are the PDF's own
 * (docs/sources/forms/flr-8-jun25-en.pdf: no "-fil" version is published, and this one has fillable boxes; test:form-maps
 * checks every one has an entry here).
 *
 * The person is the applicant (they start the case). Filled from the record: each side's names, addresses, phone and
 * email, the respondent's lawyer if given (familyPartyBoxes.ts), where each lives, and the "Married on" tick when the
 * person recorded they were married to the other party. Everything else (the court office, the family history's dates
 * and personal details, the children's details, earlier cases and agreements, the claims and the facts for them) is a
 * fact the record does not hold yet, or wording the site does not have: blank, each with its reason. The person's story
 * is not poured into the facts box: on this form the facts follow the claims ticked, and the site does not hold those.
 *
 * Pure. States no law.
 */
import type { FormContext, FormMapDefinition } from "../formMap";
import { familySideBoxes, municipalityAndProvince } from "../familyPartyBoxes";
import { blank, each, needsWording } from "../mapHelpers";

const COURT_OFFICE = "the Family court office the application is filed at (its name and address)";
const PERSONAL = "each party's age, birthdate, date they started living at their address, names before the marriage, gender and any previous divorce";
const RELATIONSHIP_DATES = "the dates the parties married, started living together and separated (or that they never lived together, or still do)";
const CHILDREN = "each child's full legal name, age, birthdate, where they live and whom they live with (the record holds only that there are children)";
const EARLIER = "earlier court cases, written agreements, child support calculations or arbitration awards between the parties, with their dates";
const CLAIMS = "which orders the person asks the court for (the claims on pages 4 and 5), each ticked by the person";
const DIVORCE_GROUNDS = "if a divorce is claimed: the ground (separation, adultery or cruelty), its dates and its details, in the person's own words";
const FACTS = "the important facts for each claim, in the person's own words, once the claims are chosen";

const fileNumber = blank("For the court office.");
const court = blank("The court office is not held in the case record yet. Fill in the court the application is filed at.", COURT_OFFICE);
const issued = blank("Not filled by the site: completed when the application is issued (the first court date, its place, and the case track).");
const personal = blank("Not asked by the site. Fill in by hand.", PERSONAL);
const dates = blank("Not asked by the site. Fill in by hand.", RELATIONSHIP_DATES);
const children = blank("The site holds only that there are children, not their details. Fill in by hand.", CHILDREN);
const earlier = blank("Not asked by the site. Fill in by hand.", EARLIER);
const claims = blank("Which orders you ask for is your choice and is not asked by the site. Tick by hand.", CLAIMS);
const grounds = blank("Not asked by the site. Fill in by hand if you claim a divorce.", DIVORCE_GROUNDS);
const signed = blank("Signed and dated by hand.");
const lawyer = blank("Completed by your lawyer, if you have one.");

const applicants = (ctx: FormContext) => ctx.plaintiffs;
const respondents = (ctx: FormContext) => ctx.defendants;

export const FAMILY_FORM_8: FormMapDefinition = {
  id: "family/8",
  court: "family",
  number: "8",
  title: "Application (General)",
  pdf: {
    file: "docs/sources/forms/flr-8-jun25-en.pdf",
    url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/family/08/flr-8-jun25-en.pdf",
    sha256: "3a91056a1a947218af57f49b6d6e984435152736092e779ed2515eb4e2b8936a",
    fetched: "2026-11-15",
  },
  boxes: {
    ...each(["Court File Number, page 1", "Court File Number, page 2", "Court File Number, page 3", "Court File Number, page 4", "Court File Number, page 5", "Court File Number, page 6"], fileNumber),
    ...each(["Name of court", "Court office address"], court),

    // ---- Page 1: the parties (filled from the record)
    ...familySideBoxes({
      name: "Applicant(s) - Full legal name", address: "Applicant(s) - Address", phone: "Applicant(s) - Phone & fax", email: "Applicant(s) - Email",
      lawyerName: "Applicant(s) Lawyer - Full legal name", lawyerAddress: "Applicant(s) Lawyer - Address", lawyerPhone: "Applicant(s) Lawyer - Phone & fax", lawyerEmail: "Applicant(s) Lawyer - Email",
    }, applicants, "applicants", "applicant", true),
    ...familySideBoxes({
      name: "Respondent(s) - Full legal name", address: "Respondent(s) - Address", phone: "Respondent(s) - Phone & fax", email: "Respondent(s) - Email",
      lawyerName: "Respondent(s) Lawyer - Full legal name", lawyerAddress: "Respondent(s) Lawyer - Address", lawyerPhone: "Respondent(s) Lawyer - Phone & fax", lawyerEmail: "Respondent(s) Lawyer - Email",
    }, respondents, "respondents", "respondent", false),

    // ---- Pages 1 and 2: the notice to the respondent (completed when issued) and the financial statement ticks
    ...each(["The first court date is:", "Date - First court date", "Time - first court date", "a.m", "p.m", "Court Address", "THIS CASE IS ON THE FAST TRACK OF THE CASE MANAGEMENT SYSTEM", "THIS CASE IS ON THE STANDARD TRACK OF THE CASE MANAGEMENT SYSTEM", "Date of issue"], issued),
    "Signature - clerk of the court": blank("For the court office."),
    ...each([
      "This case includes a claim for support. It does not include a claim for property or exclusive possession of the matrimonial home and its contents. You MUST fill out a Financial Statement (Form 13 – a blank copy attached), serve a copy on the applicant(s) and file a copy in the court office with an Affidavit of Service even if you do not answer this case",
      "This case includes a claim for property or exclusive possession of the matrimonial home and its contents. You MUST fill out a Financial Statement (Form 13.1 – a blank copy attached), serve a copy on the applicant(s) and file a copy in the court office with an Affidavit of Service even if you do not answer this case",
    ], claims),

    // ---- Page 3: family history
    "Municipality & province - applicant": { kind: "fill", fact: "applicants[0] city, province", read: (ctx) => municipalityAndProvince(ctx.plaintiffs[0]), missing: { what: "the applicant's city or town and province", addAt: "parties" } },
    "Municipality & province - respondent": { kind: "fill", fact: "respondents[0] city, province", read: (ctx) => municipalityAndProvince(ctx.defendants[0]), missing: { what: "the respondent's city or town and province", addAt: "parties" } },
    ...each([
      "Age - applicant", "Birthdate: (d, m, y) - Applicant", "Date - start of residency - applicant", "First name on the day before the marriage date - applicant", "Last name on the day before the marriage date - applicant",
      "Male - applicant", "Female - applicant", "Another gender - applicant", "No - applicant", "Yes - applicant", "Place and date of previous divorce - applicant",
      "Age - respondent", "Birthdate: (d, m, y) - respondent", "Date - start of residency - respondent", "First name on the day before the marriage date - respondent", "Last name on the day before the marriage date - respondent",
      "Male - respondent", "Female - respondent", "Another gender - respondent", "Gender information not available - respondent", "No - respondent", "Yes - respondent", "Place and date of previous divorce - respondent",
    ], personal),
    "Married on": {
      kind: "fill", fact: "married (the person recorded they were married to the other party)",
      read: (ctx) => ctx.file.married.state === "answered" && ctx.file.married.value === true,
      missing: { what: "", addAt: "story" },
    },
    ...each(["Date - Married on", "Started living together on", "Date - Started living together", "Separated on", "Date - Separated on", "Never lived together", "Still living together"], dates),
    ...each([1, 2, 3, 4, 5, 6].flatMap((n) => [`Full legal name ${n}`, `Age ${n}`, `Birthdate: (d, m, y) ${n}`, `Resident in (municipality & province) ${n}`]), children),
    // The official PDF numbers the "Now Living With" boxes 1 to 5 and then 7 (no 6).
    ...each([1, 2, 3, 4, 6, 7].map((n) => `Now Living With (name of person and relationship to child) ${n}`), children),
    ...each(["No 1", "Yes 1", "No 2", "Yes 2", "Date of agreement & Terms in dispute"], earlier),

    // ---- Page 4: earlier support and agreements, then the claims
    ...each(["No 3", "Yes 3", "Date(s) of Notice(s) of Calculation or Recalculation", "No 4", "Yes 4", "Explanation - Change in order for child support", "No 5", "Yes 5", "Date - Agreement and family arbitration award"], earlier),
    ...each([
      "a divorce", "support for me 1", "support for child(ren) – table amount 1", "support for child(ren) – other than table amount 1", "decision-making responsibility for child(ren) 1", "parenting time with child(ren) 1",
      "contact with child(ren) (this requires court leave)", "support for me 2", "support for child(ren) – table amount 2", "support for child(ren) – other than table amount 2", "decision-making responsibility for child(ren) 2",
      "parenting time with child(ren) 2", "restraining/non-harassment order", "indexing spousal support", "declaration of parentage",
      "guardianship over child’s property (claim must be served on the Children’s Lawyer and the child must currently have property)", "contact with child(ren) (this does not require court leave)",
      "wrongful removal to or retention of child(ren) in Ontario involving a country outside Canada under the Convention on the Civil Aspects of International Child Abduction",
      "wrongful removal to or retention of child(ren) in Ontario involving a country outside Canada NOT under the Convention on the Civil Aspects of International Child Abduction",
      "equalization of net family properties", "exclusive possession of matrimonial home", "exclusive possession of contents of matrimonial home", "freezing assets", "sale of family property",
      "Costs", "annulment of marriage", "prejudgment interest", "claims relating to a family arbitration", "Other (Specify)", "Other - Specify",
    ], claims),
    "Details of the order that you want the court to make": needsWording("The site has no checked wording for the orders asked for. Write them in your own words, or with legal help.", CLAIMS),

    // ---- Page 5: divorce grounds and the facts
    ...each(["Separation", "Date - seperation", "have not lived together again since that date in an unsuccessful attempt to reconcile", "have lived together again during the following period(s) in an unsuccessful attempt to reconcile", "Dates - periods of living together", "Adultery", "Adultery - details", "Cruelty", "Cruelty - details"], grounds),
    "Facts that form the legal basis for your other claim(s)": blank("The facts for each claim, in your own words. Not filled from your story: they follow the claims you tick, which the site does not hold.", FACTS),

    // ---- Page 6: signatures
    ...each(["Applicants signature", "Date of signature"], signed),
    ...each(["Name - Applicant’s lawyer", "Date - Lawyer’s signature", "Lawyer’s signature"], lawyer),
  },
};
