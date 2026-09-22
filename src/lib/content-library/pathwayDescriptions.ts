/**
 * Fixed descriptions for each court pathway and each out-of-scope forum.
 *
 * *** WHY THIS FILE EXISTS ***
 *
 * The court-path classifier returns a `reasoning` sentence — a model-written
 * sentence about the user's own story — and it was rendered to the user at
 * `HomeLocationGate.tsx:241` (docs/lso-ai-audit.md, finding B-6).
 *
 * The path CODE is a permitted use: the model analyses the input and selects
 * from a fixed list. The sentence is not. This catalogue supplies what the user
 * reads; the model's sentence now goes only to the audit log.
 *
 * *** WHAT THESE SAY, AND WHAT THEY DO NOT ***
 *
 * Each block describes the FORUM in general terms — what kind of matter it
 * handles. None of them says anything about the reader's own situation, and
 * none asserts that their facts satisfy any test. That is the line CLAUDE.md
 * section 2 draws between legal information and legal advice, and it is why
 * these can be written from the forum's own published description while a
 * sentence about "your story" could not be.
 *
 * The out-of-scope forum names were already in the classifier's own prompt as
 * a fixed enum; the descriptions restate the forum's subject matter.
 *
 * Nothing here is licensee-approved yet.
 */

export type PathwayDescription = {
  id: string;
  /** In-scope pathway code, or out-of-scope forum id. */
  pathway: string;
  /** Short label for the heading. */
  label: string;
  /** The text a user reads. Rendered verbatim; never model-generated. */
  text: string;
  sourceUrl: string;
  /** True for the nine forums CourtSimplified does not handle. */
  outOfScope: boolean;
};

const PLACEHOLDER = (what: string) => `[NEEDS LICENSEE REVIEW: ${what}]`;

export const PATHWAY_DESCRIPTIONS: PathwayDescription[] = [
  // ------------------------------------------------------------- in scope
  {
    id: "pathway:small-claims",
    pathway: "small-claims",
    label: "Small Claims Court",
    text:
      "Small Claims Court handles claims for money or the return of personal property up to $50,000, not counting interest and costs. The limit rose from $35,000 on October 1, 2025.",
    sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
    outOfScope: false,
  },
  {
    id: "pathway:civil",
    pathway: "civil",
    label: "Superior Court of Justice (Civil)",
    text:
      "The Superior Court of Justice hears civil claims, including those above the Small Claims Court limit. Its procedure is set by the Rules of Civil Procedure, R.R.O. 1990, Reg. 194.",
    sourceUrl: "https://www.ontario.ca/laws/regulation/900194",
    outOfScope: false,
  },
  {
    id: "pathway:family",
    pathway: "family",
    label: "Family Court",
    text:
      "Family Court deals with matters such as parenting, child and spousal support, and property on the breakdown of a relationship. Its procedure is set by the Family Law Rules, O. Reg. 114/99.",
    sourceUrl: "https://www.ontario.ca/laws/regulation/990114",
    outOfScope: false,
  },
  {
    id: "pathway:mixed",
    pathway: "mixed",
    label: "More than one court",
    text:
      "What you have described may involve more than one of Family, Small Claims and Civil. You can choose which to start with, and you can change your choice later.",
    sourceUrl: "",
    outOfScope: false,
  },

  // --------------------------------------------------------- out of scope
  {
    id: "pathway:ltb",
    pathway: "ltb",
    label: "Landlord and Tenant Board",
    text:
      "The Landlord and Tenant Board resolves disputes between residential landlords and tenants, including rent, maintenance and eviction. CourtSimplified does not cover it.",
    sourceUrl: "https://tribunalsontario.ca/ltb/",
    outOfScope: true,
  },
  {
    id: "pathway:hrto",
    pathway: "hrto",
    label: "Human Rights Tribunal of Ontario",
    text:
      "The Human Rights Tribunal of Ontario deals with claims of discrimination and harassment under the Human Rights Code, including the duty to accommodate. CourtSimplified does not cover it.",
    sourceUrl: "https://tribunalsontario.ca/hrto/",
    outOfScope: true,
  },
  {
    id: "pathway:wsiat",
    pathway: "wsiat",
    label: "Workplace Safety and Insurance Appeals Tribunal",
    text:
      "WSIAT hears appeals about workplace injury and workers' compensation decisions. CourtSimplified does not cover it.",
    sourceUrl: "https://www.wsiat.on.ca/",
    outOfScope: true,
  },
  {
    id: "pathway:cat",
    pathway: "cat",
    label: "Condominium Authority Tribunal",
    text:
      "The Condominium Authority Tribunal resolves certain disputes between condominium corporations and owners. CourtSimplified does not cover it.",
    sourceUrl: "https://www.condoauthorityontario.ca/tribunal/",
    outOfScope: true,
  },
  {
    id: "pathway:social-benefits-tribunal",
    pathway: "social-benefits-tribunal",
    label: "Social Benefits Tribunal",
    text:
      "The Social Benefits Tribunal hears appeals about Ontario Works and Ontario Disability Support Program decisions. CourtSimplified does not cover it.",
    sourceUrl: "https://tribunalsontario.ca/sbt/",
    outOfScope: true,
  },
  {
    id: "pathway:lat",
    pathway: "lat",
    label: "Licence Appeal Tribunal",
    text:
      "The Licence Appeal Tribunal hears disputes about statutory accident benefits and certain licensing decisions. CourtSimplified does not cover it.",
    sourceUrl: "https://tribunalsontario.ca/lat/",
    outOfScope: true,
  },
  {
    id: "pathway:divisional-court",
    pathway: "divisional-court",
    label: "Divisional Court",
    text:
      "The Divisional Court hears judicial review of decisions made by government bodies and tribunals, and certain appeals. CourtSimplified does not cover it.",
    sourceUrl: "https://www.ontariocourts.ca/scj/divisional-court/",
    outOfScope: true,
  },
  {
    id: "pathway:immigration",
    pathway: "immigration",
    label: "Immigration and refugee matters",
    text:
      "Immigration and refugee matters are federal and are dealt with by the Immigration and Refugee Board. CourtSimplified does not cover them.",
    sourceUrl: "https://irb.gc.ca/en/Pages/index.aspx",
    outOfScope: true,
  },
  {
    id: "pathway:criminal-related",
    pathway: "criminal-related",
    label: "Criminal matters",
    text: PLACEHOLDER(
      "wording for someone describing a criminal charge or criminal court process. This needs care: it should direct to duty counsel and Legal Aid Ontario without implying anything about their situation",
    ),
    sourceUrl: "",
    outOfScope: true,
  },
];

const BY_PATHWAY = new Map(PATHWAY_DESCRIPTIONS.map((entry) => [entry.pathway, entry]));

/** The description for a pathway or forum code, or null for an unknown code. */
export function pathwayDescriptionFor(pathway: string): PathwayDescription | null {
  return BY_PATHWAY.get(pathway) ?? null;
}

/** Whether a description is still an unreviewed placeholder. */
export function isPlaceholderDescription(entry: PathwayDescription): boolean {
  return entry.text.startsWith("[NEEDS LICENSEE REVIEW:");
}
