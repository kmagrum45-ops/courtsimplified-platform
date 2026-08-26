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
 */

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
};

export const OUT_OF_SCOPE_FORUMS: Record<OutOfScopeForumId, OutOfScopeForum> = {
  ltb: {
    id: "ltb",
    name: "Landlord and Tenant Board (LTB)",
    redirectMessage:
      "This sounds like it may involve a landlord-tenant relationship — rent, eviction, repairs, or a " +
      "residential lease. CourtSimplified does not cover matters that go to the Landlord and Tenant Board (LTB). " +
      "The LTB is a separate tribunal from Family, Small Claims, and Civil court, and it is the body that handles " +
      "residential tenancy disputes in Ontario.",
  },
  hrto: {
    id: "hrto",
    name: "Human Rights Tribunal of Ontario (HRTO)",
    redirectMessage:
      "This sounds like it may involve discrimination or a human rights issue — for example, based on a " +
      "protected ground like disability, race, sex, or family status, or a request for accommodation. " +
      "CourtSimplified does not cover matters that go to the Human Rights Tribunal of Ontario (HRTO). The HRTO " +
      "is a separate tribunal from Family, Small Claims, and Civil court, and it is the body that handles human " +
      "rights applications in Ontario.",
  },
  wsiat: {
    id: "wsiat",
    name: "Workplace Safety and Insurance Appeals Tribunal (WSIAT)",
    redirectMessage:
      "This sounds like it may involve a workplace injury or a workers' compensation claim. CourtSimplified " +
      "does not cover matters that go through the Workplace Safety and Insurance Board (WSIB) or the Workplace " +
      "Safety and Insurance Appeals Tribunal (WSIAT). WSIB and WSIAT are separate from Family, Small Claims, and " +
      "Civil court, and they are the bodies that handle workplace injury and compensation claims in Ontario.",
  },
  cat: {
    id: "cat",
    name: "Condominium Authority Tribunal (CAT)",
    redirectMessage:
      "This sounds like it may involve a dispute with a condominium corporation or board — for example, about " +
      "condo rules, records, or by-laws. CourtSimplified does not cover matters that go to the Condominium " +
      "Authority Tribunal (CAT). The CAT is a separate tribunal from Family, Small Claims, and Civil court, and " +
      "it is the body that handles many condominium disputes in Ontario.",
  },
  "social-benefits-tribunal": {
    id: "social-benefits-tribunal",
    name: "Social Benefits Tribunal (SBT)",
    redirectMessage:
      "This sounds like it may involve an appeal of an Ontario Works or Ontario Disability Support Program " +
      "(ODSP) decision. CourtSimplified does not cover matters that go to the Social Benefits Tribunal (SBT). " +
      "The SBT is a separate tribunal from Family, Small Claims, and Civil court, and it is the body that hears " +
      "appeals of social assistance decisions in Ontario.",
  },
  lat: {
    id: "lat",
    name: "Licence Appeal Tribunal (LAT)",
    redirectMessage:
      "This sounds like it may involve a dispute over statutory accident benefits or another licensing-related " +
      "matter. CourtSimplified does not cover matters that go to the Licence Appeal Tribunal (LAT). The LAT is a " +
      "separate tribunal from Family, Small Claims, and Civil court, and it is the body that handles many auto " +
      "insurance accident benefits disputes and licensing appeals in Ontario.",
  },
  "divisional-court": {
    id: "divisional-court",
    name: "Divisional Court",
    redirectMessage:
      "This sounds like it may involve asking a court to review a decision made by a government body, tribunal, " +
      "or official — a judicial review. CourtSimplified does not cover judicial review applications, which " +
      "generally go to the Divisional Court. The Divisional Court is a separate branch of the Ontario Superior " +
      "Court of Justice from Family, Small Claims, and ordinary Civil proceedings, and it is the body that " +
      "generally hears judicial review applications in Ontario.",
  },
  immigration: {
    id: "immigration",
    name: "Immigration and Refugee Board of Canada (IRB)",
    redirectMessage:
      "This sounds like it may involve an immigration or refugee matter. CourtSimplified does not cover matters " +
      "that go to the Immigration and Refugee Board of Canada (IRB) or other federal immigration processes. " +
      "These are separate from Family, Small Claims, and Civil court in Ontario — immigration matters are " +
      "handled at the federal level, not by Ontario courts.",
  },
  "criminal-related": {
    id: "criminal-related",
    name: "Criminal Court",
    redirectMessage:
      "This sounds like it may involve a criminal charge or a criminal court process. CourtSimplified does not " +
      "cover criminal matters. Criminal Court is separate from Family, Small Claims, and Civil court, which " +
      "handle non-criminal matters. If you are dealing with a criminal charge, a paralegal, a criminal defence " +
      "lawyer, or duty counsel can help.",
  },
};

export function getOutOfScopeForum(id: string): OutOfScopeForum | null {
  return (OUT_OF_SCOPE_FORUMS as Record<string, OutOfScopeForum>)[id] || null;
}
