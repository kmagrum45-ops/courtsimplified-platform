/**
 * Out-of-scope forum redirect messages.
 *
 * DRAFT wording -- every redirectMessage below is pending lawyer/paralegal
 * review before it ships to real users. Collected in this one file, separate
 * from classification logic, specifically so that review can happen in one
 * pass over message text rather than hunting through call sites.
 *
 * Boundary line these were written to (agreed 2026-08-25, courtPathClassifier
 * audit): name the forum and the general topic that triggered the
 * suggestion; never characterize the user's own facts as satisfying that
 * forum's legal test. "This sounds like it may involve a landlord-tenant
 * relationship" is a topic observation. Something like "you have a right to
 * stay under the Residential Tenancies Act" would be a legal conclusion
 * about their specific facts -- that is the distinction to check for in
 * review, on every message below.
 *
 * Every forum is named explicitly and individually -- deliberately no
 * generic "tribunal" bucket. A user needs to know it's the LTB specifically,
 * not that it's "a tribunal."
 *
 * All nine forums from the August 2026 audit are populated. LTB was built
 * and proven first, deliberately, to validate the mechanism (schema,
 * keyword mapping, UI, consistency testing) on one forum before repeating
 * the pattern eight more times.
 *
 * SESSION 48 -- CITATIONS ADDED. These messages are LIVE user-facing content
 * (courtPathClassifier.ts -> /api/classify-court-path ->
 * HomeLocationGate.tsx, which renders `redirectMessage` directly), and every
 * one of them carried an uncited jurisdictional assertion of the form "it is
 * the body that handles X in Ontario". Under CLAUDE.md section 2 that is a
 * legal statement and needs a source.
 *
 * Each message has two halves, and they are not the same kind of claim:
 *   1. "CourtSimplified does not cover matters that go to X" -- a fact about
 *      this product. Needs no legal source.
 *   2. "X is the body that handles [topic] in Ontario" -- a statement about
 *      a real tribunal's jurisdiction. Needs one.
 *
 * Six forums now carry the statutory provision that actually confers the
 * jurisdiction. For the remaining three, half 2 was REMOVED rather than
 * sourced -- see each entry's own note. Nothing here asserts a jurisdiction
 * it cannot cite.
 *
 * STILL OPEN: migrating these into jurisdictionRoutes.ts, which the register
 * names as the eventual home. That is a larger refactor (different shape --
 * matterDescription/whyNotSmallClaims/whereItGoes/signals/courtArea) and was
 * not attempted here. Adding citations in place removes the live defect
 * without half-finishing the move.
 */

import type { EducationCitation } from "../intake/educationTopics";

export type OutOfScopeForumId =
  | "ltb"
  | "hrto"
  | "wsiat"
  | "cat"
  | "social-benefits-tribunal"
  | "lat"
  | "divisional-court"
  | "immigration"
  | "criminal-related";

export type OutOfScopeForum = {
  id: OutOfScopeForumId;
  /** Full official name, always shown -- never a generic "tribunal" label. */
  name: string;
  /** DRAFT: pending lawyer/paralegal review. See file header for the boundary line. */
  redirectMessage: string;
  /**
   * The provision that confers the jurisdiction the message names. Empty
   * ONLY where the message makes no jurisdictional claim at all -- see the
   * file header. Never empty alongside an "it is the body that handles X"
   * sentence.
   */
  citations: EducationCitation[];
};

export const OUT_OF_SCOPE_FORUMS: Record<OutOfScopeForumId, OutOfScopeForum> = {
  ltb: {
    id: "ltb",
    name: "Landlord and Tenant Board (LTB)",
    redirectMessage:
      "This sounds like it may involve a landlord-tenant relationship — rent, eviction, repairs, or a " +
      "residential lease. CourtSimplified does not cover matters that go to the Landlord and Tenant Board (LTB). " +
      "The LTB is a separate tribunal from Family, Small Claims, and Civil court. The Residential Tenancies " +
      "Act, 2006 applies to rental units in residential complexes despite any other Act, and gives the LTB " +
      "exclusive jurisdiction to determine all applications under that Act.",
    citations: [
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: "https://www.ontario.ca/laws/docs/06r17_e.doc",
        verifiedAt: "2026-09-12",
        pinpoint:
          "s.3(1): the Act applies to rental units in residential complexes \"despite any other Act and despite any agreement or waiver to the contrary\"; s.168(2): \"The Board has exclusive jurisdiction to determine all applications under this Act and with respect to all matters in which jurisdiction is conferred on it by this Act\"",
      },
    ],
  },
  hrto: {
    id: "hrto",
    name: "Human Rights Tribunal of Ontario (HRTO)",
    redirectMessage:
      "This sounds like it may involve discrimination or a human rights issue — for example, based on a " +
      "protected ground like disability, race, sex, or family status, or a request for accommodation. " +
      "CourtSimplified does not cover matters that go to the Human Rights Tribunal of Ontario (HRTO). The HRTO " +
      "is a separate tribunal from Family, Small Claims, and Civil court. Under the Human Rights Code, a person " +
      "who believes their rights under Part I of the Code have been infringed may apply to the Tribunal — " +
      "generally within one year of the incident, or of the last incident in a series, though the Tribunal may " +
      "accept a later application in some circumstances.",
    citations: [
      {
        sourceName: "Human Rights Code, R.S.O. 1990, c. H.19",
        officialUrl: "https://www.ontario.ca/laws/docs/90h19_e.doc",
        verifiedAt: "2026-09-12",
        pinpoint:
          "s.34(1): a person who believes a Part I right has been infringed may apply to the Tribunal for an order under s.45.2, within one year after the incident or the last incident in a series; s.34(2): a later application may be accepted where the Tribunal is satisfied as to the delay",
      },
    ],
  },
  wsiat: {
    id: "wsiat",
    name: "Workplace Safety and Insurance Appeals Tribunal (WSIAT)",
    redirectMessage:
      "This sounds like it may involve a workplace injury or a workers' compensation claim. CourtSimplified " +
      "does not cover matters that go through the Workplace Safety and Insurance Board (WSIB) or the Workplace " +
      "Safety and Insurance Appeals Tribunal (WSIAT). WSIB and WSIAT are separate from Family, Small Claims, and " +
      "Civil court. Under the Workplace Safety and Insurance Act, 1997, WSIAT has exclusive jurisdiction to hear " +
      "and decide appeals from final decisions of the Board on entitlement to benefits under the insurance plan.",
    citations: [
      {
        sourceName: "Workplace Safety and Insurance Act, 1997, S.O. 1997, c. 16",
        officialUrl: "https://www.ontario.ca/laws/docs/97w16_e.doc",
        verifiedAt: "2026-09-12",
        pinpoint:
          "s.123(1): \"The Appeals Tribunal has exclusive jurisdiction to hear and decide\" all appeals from final decisions of the Board with respect to entitlement to health care, return to work, labour market re-entry and entitlement to other benefits under the insurance plan, among other listed matters",
      },
    ],
  },
  cat: {
    id: "cat",
    name: "Condominium Authority Tribunal (CAT)",
    redirectMessage:
      "This sounds like it may involve a dispute with a condominium corporation or board — for example, about " +
      "condo rules, records, or by-laws. CourtSimplified does not cover matters that go to the Condominium " +
      "Authority Tribunal (CAT). The CAT is a separate tribunal from Family, Small Claims, and Civil court. " +
      "Under the Condominium Act, 1998 a corporation, an owner, a mortgagee and (where the regulations provide) " +
      "a purchaser may apply to the Tribunal to resolve a PRESCRIBED dispute — the categories are set by " +
      "regulation rather than open-ended. The Act also carves matters OUT of the Tribunal's reach, including " +
      "disputes about a corporation's lien for unpaid common expenses and disputes involving the determination " +
      "of title to real property, so not every condominium disagreement goes there.",
    citations: [
      {
        sourceName: "Condominium Act, 1998, S.O. 1998, c. 19",
        officialUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-12",
        pinpoint:
          "s.1.36(1)-(3): a corporation, an owner or mortgagee, and (where the regulations so provide) a purchaser may apply to the Tribunal for the resolution of a prescribed dispute; s.1.36(4): an application may NOT be made with respect to a dispute under Part III, s.20, 26, 82.1, 82.2, 85 or 86, s.117(1), or Part VII or VIII, or one involving the determination of title to real property",
      },
    ],
  },
  "social-benefits-tribunal": {
    id: "social-benefits-tribunal",
    name: "Social Benefits Tribunal (SBT)",
    // Jurisdictional assertion REMOVED rather than sourced. The constituting
    // provisions are in the Ontario Works Act, 1997 and the Ontario
    // Disability Support Program Act, 1997; neither was retrieved this
    // session (the ODSP .doc id tried did not resolve), so the claim that
    // the SBT "is the body that hears appeals of social assistance decisions
    // in Ontario" is not asserted. The forum is still named, which is what
    // the user needs in order to look it up.
    redirectMessage:
      "This sounds like it may involve an appeal of an Ontario Works or Ontario Disability Support Program " +
      "(ODSP) decision. CourtSimplified does not cover those matters. Appeals of social assistance decisions " +
      "in Ontario are generally dealt with through the Social Benefits Tribunal (SBT), which is separate from " +
      "Family, Small Claims, and Civil court — the SBT publishes its own process, and confirming it directly is " +
      "the reliable route.",
    citations: [],
  },
  lat: {
    id: "lat",
    name: "Licence Appeal Tribunal (LAT)",
    redirectMessage:
      "This sounds like it may involve a dispute over statutory accident benefits or another licensing-related " +
      "matter. CourtSimplified does not cover matters that go to the Licence Appeal Tribunal (LAT). The LAT is a " +
      "separate tribunal from Family, Small Claims, and Civil court. Under the Insurance Act, where there is a " +
      "dispute about an insured person's entitlement to statutory accident benefits, or the amount of those " +
      "benefits, the insured person or the insurer may apply to the Licence Appeal Tribunal to resolve it.",
    citations: [
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-12",
        pinpoint:
          "s.280(1): the section applies to the resolution of disputes about an insured person's entitlement to statutory accident benefits or the amount of such benefits; s.280(2): \"The insured person or the insurer may apply to the Licence Appeal Tribunal to resolve a dispute described in subsection (1)\"",
      },
    ],
  },
  "divisional-court": {
    id: "divisional-court",
    name: "Divisional Court",
    redirectMessage:
      "This sounds like it may involve asking a court to review a decision made by a government body, tribunal, " +
      "or official — a judicial review. CourtSimplified does not cover judicial review applications. Under the " +
      "Judicial Review Procedure Act an application for judicial review is made to the Divisional Court, which " +
      "is a separate branch of the Ontario Superior Court of Justice from Family, Small Claims, and ordinary " +
      "Civil proceedings. The Act does allow an application to be made instead to a judge of the Superior Court " +
      "of Justice, with that judge's leave, where the delay of proceeding in the Divisional Court is likely to " +
      "involve a failure of justice.",
    citations: [
      {
        sourceName: "Judicial Review Procedure Act, R.S.O. 1990, c. J.1",
        officialUrl: "https://www.ontario.ca/laws/docs/90j01_e.doc",
        verifiedAt: "2026-09-12",
        pinpoint:
          "s.6(1): \"Subject to subsection (2), an application for judicial review shall be made to the Divisional Court\"; s.6(2): an application may be made to a judge of the Superior Court of Justice with leave, where the delay involved in proceeding in the Divisional Court is likely to involve a failure of justice",
      },
    ],
  },
  immigration: {
    id: "immigration",
    name: "Immigration and Refugee Board of Canada (IRB)",
    // Jurisdictional assertion REMOVED rather than sourced. The IRB is
    // constituted federally, under the Immigration and Refugee Protection
    // Act; that is outside the acceptable-source domains in CLAUDE.md
    // section 2 (which are Ontario sources plus CanLII), so no citation for
    // it could be added here. The message now states only that this is a
    // federal matter and outside what the site covers -- both facts about
    // scope, not assertions about the IRB's jurisdiction.
    redirectMessage:
      "This sounds like it may involve an immigration or refugee matter. CourtSimplified does not cover " +
      "immigration or refugee matters. These are dealt with federally rather than by Ontario courts, so nothing " +
      "on this site — which covers Ontario Family, Small Claims, and Civil court — will apply to them. The " +
      "Immigration and Refugee Board of Canada (IRB) and Immigration, Refugees and Citizenship Canada publish " +
      "their own processes.",
    citations: [],
  },
  "criminal-related": {
    id: "criminal-related",
    name: "Criminal Court",
    // No citation: this message makes no jurisdictional claim about a
    // tribunal. It says the site does not cover criminal matters (a fact
    // about scope) and points to people who can help. Nothing here asserts
    // what any court's jurisdiction is.
    redirectMessage:
      "This sounds like it may involve a criminal charge or a criminal court process. CourtSimplified does not " +
      "cover criminal matters. Criminal Court is separate from Family, Small Claims, and Civil court, which " +
      "handle non-criminal matters. If you are dealing with a criminal charge, a paralegal, a criminal defence " +
      "lawyer, or duty counsel can help.",
    citations: [],
  },
};

export function getOutOfScopeForum(id: string): OutOfScopeForum | null {
  return (OUT_OF_SCOPE_FORUMS as Record<string, OutOfScopeForum>)[id] || null;
}
