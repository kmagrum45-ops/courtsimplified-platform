/**
 * FORUM-CHECK SOURCES — the tribunals, regulators and consumer programmes a
 * claim-type profile routes people to, each described by the body itself.
 *
 * *** WHY THE BODY'S OWN PAGE AND NOT OUR SUMMARY ***
 *
 * "The Landlord and Tenant Board handles that" is a statement about the world. If
 * a profile says it and the Board's remit has moved, the user files in the wrong
 * place and loses time they may not have. The statutes settle jurisdiction where
 * they speak — the Residential Tenancies Act, the Condominium Act, the Human
 * Rights Code are all vendored — but no statute says what OMVIC's compensation
 * fund covers, what CAMVAP arbitrates, or which complaints a College takes. Only
 * the body says that, so the body is the source.
 *
 * *** HTTP 200 IS NOT EVIDENCE OF LANDING ON THE RIGHT PAGE ***
 *
 * `tribunalsontario.ca/lat/` returns 200 and redirects to the Tribunals Ontario
 * home page, whose title is "Home - Tribunals Ontario". It mentions the Licence
 * Appeal Tribunal four times, so a keyword probe would have called it a LAT page
 * and been wrong. Every entry below carries a marker taken from the fetched page's
 * own title or body, checked before it was written down — the same discipline the
 * e-Laws schedule trap forced on the statutes.
 *
 * *** TEN SOURCES ARE MISSING AND ARE LISTED, NOT PAPERED OVER ***
 *
 * Refused outright:
 *   TICO (travel)                  — HTTP 403 to an automated fetch
 *   FSRA (financial services)      — HTTP 403 to an automated fetch
 *
 * No page resolves:
 *   Licence Appeal Tribunal        — /lat/ redirects to the directory and every
 *                                    sub-path is a 404
 *   Ontario Victim Services        — no ontario.ca page under any tried path
 *
 * HTTP 200 with nothing to quote — all five caught by `minCharacters`, not by the
 * status code and not by `mustContain`:
 *   HCRA (new-home builders)       — JS shell; the body contains neither "HCRA"
 *                                    nor "Home Construction". Tarion is here and
 *                                    covers the same warranty ground
 *   Tribunals Ontario directory    — 356 chars of language-toggle and footer
 *   OBSI (banking ombudsman)       — 509 chars, all of it a cookie banner
 *   Bereavement Authority          — 86 chars: a skip-link and a heading
 *   College of Veterinarians       — 449 chars reading "Page not found". **A SOFT
 *                                    404: HTTP 200 with a not-found body.** The
 *                                    marker "complaint" matched three times on
 *                                    the error page, so mustContain passed it
 *   Consumer protection: drivers   — 995 chars of "Ontario.ca needs JavaScript
 *                                    ... Log in to continue". Some ontario.ca
 *                                    pages serve static HTML and some do not;
 *                                    the auto-repair and renovation guides
 *                                    extract 18,460 and 9,262 characters
 *
 * *** WHAT THE SOFT 404 TEACHES, BECAUSE IT WILL HAPPEN AGAIN ***
 *
 * A status code says the request succeeded. A `mustContain` marker says a word
 * appeared. Neither says a DOCUMENT came back. The length floor is the only check
 * that noticed, and it noticed because an error page is short — which is exactly
 * the reasoning `corpusSources.ts` records for keeping the floor per-source
 * rather than global.
 *
 * Profiles that would have routed to any of these must say we have no verified
 * route yet rather than naming one from memory. The travel, banking,
 * financial-services, new-home, veterinary, funeral and auto-insurance forum
 * checks are therefore INCOMPLETE and recorded as such in the report.
 */

import type { CorpusSource } from "./corpusSources";

const page = (
  id: string,
  title: string,
  citation: string,
  url: string,
  mustContain: string[],
  why: string,
  minCharacters = 1000,
): CorpusSource => ({ id, title, citation, url, format: "html", tier: "practical", mustContain, why, minCharacters });

export const FORUM_CHECK_SOURCES: CorpusSource[] = [
  // ---------------------------------------------------------------------------
  // Tribunals
  // ---------------------------------------------------------------------------
  page(
    "ltb-landlord-and-tenant-board",
    "Landlord and Tenant Board",
    "tribunalsontario.ca",
    "https://tribunalsontario.ca/ltb/",
    ["Landlord and Tenant Board"],
    "The most-needed forum check in the library. Most of what users describe about " +
      "renting belongs here rather than in this court, and the Board's own page is " +
      "what a referral should point at.",
  ),
  page(
    "hrto-human-rights-tribunal",
    "Human Rights Tribunal of Ontario",
    "tribunalsontario.ca",
    "https://tribunalsontario.ca/hrto/",
    ["Human Rights Tribunal"],
    "Discrimination claims. The Human Rights Code is vendored and says the Tribunal " +
      "has them; this is where a user actually goes.",
  ),
  page(
    "sbt-social-benefits-tribunal",
    "Social Benefits Tribunal",
    "tribunalsontario.ca",
    "https://tribunalsontario.ca/sbt/",
    ["Social Benefits Tribunal"],
    "ODSP and Ontario Works decisions, which users describe as 'they cut me off' and " +
      "which are an appeal, not a claim.",
  ),
  page(
    "cat-condominium-authority-tribunal",
    "Condominium Authority Tribunal — Dispute Resolution",
    "condoauthorityontario.ca",
    "https://www.condoauthorityontario.ca/tribunal/",
    ["Condominium Authority Tribunal"],
    "What the CAT will and will not take, which decides whether a condo dispute " +
      "belongs there or here. Not at tribunalsontario.ca — tribunalsontario.ca/cat/ " +
      "is a 404, and the CAT sits under the Condominium Authority.",
  ),
  page(
    "wsib-injured-or-ill-people",
    "WSIB — injured or ill people",
    "wsib.ca",
    "https://www.wsib.ca/en/injured-or-ill-people",
    ["WSIB"],
    "Workplace injury. A hard out-of-scope route: a worker's claim goes to the WSIB, " +
      "and a profile that let one proceed here would be sending somebody to lose.",
  ),

  // ---------------------------------------------------------------------------
  // Sector regulators and industry programmes
  // ---------------------------------------------------------------------------
  page(
    "omvic",
    "Ontario Motor Vehicle Industry Council",
    "omvic.ca",
    "https://www.omvic.ca/",
    ["OMVIC"],
    "Used cars bought from a registered dealer: the complaint route and the " +
      "compensation fund, neither of which is in the Motor Vehicle Dealers Act.",
  ),
  page(
    "camvap",
    "Canadian Motor Vehicle Arbitration Plan",
    "camvap.ca",
    "https://www.camvap.ca/",
    ["arbitration"],
    "New-vehicle defects. Arbitration instead of a claim, and choosing it forecloses " +
      "the court route — so a profile must name it before a user files.",
  ),
  page(
    "tarion",
    "Tarion — homeowners",
    "tarion.com",
    "https://www.tarion.com/homeowners",
    ["Tarion"],
    "New-home warranty claims. Stands in for the HCRA page, which is a JS shell with " +
      "no fetchable text.",
  ),
  page(
    "ccts-telecom-complaints",
    "Commission for Complaints for Telecom-television Services",
    "ccts-cprst.ca",
    "https://www.ccts-cprst.ca/for-consumers/",
    ["Complaint"],
    "Phone, internet and TV billing. A free route that resolves most of what users " +
      "would otherwise sue over.",
  ),
  page(
    "oeb-consumer-protection",
    "Ontario Energy Board — consumer information and protection",
    "oeb.ca",
    "https://www.oeb.ca/consumer-information-and-protection",
    ["Ontario Energy Board"],
    "Electricity and gas billing, and energy retailer contracts.",
  ),
  page(
    "reco-complaints",
    "Complaints against RECO",
    "reco.on.ca",
    "https://www.reco.on.ca/complaints/",
    ["RECO"],
    "Real estate agent conduct, which is a regulator matter even where the money " +
      "dispute is a claim.",
  ),
  page(
    "leca-law-enforcement-complaints",
    "Law Enforcement Complaints Agency",
    "leca.ca",
    "https://leca.ca/",
    ["Law Enforcement Complaints"],
    "Complaints about police conduct. Referral text only — suing police is out of " +
      "scope for this product, and the agency is the route that exists.",
  ),

  // ---------------------------------------------------------------------------
  // Consumer Protection Ontario
  // ---------------------------------------------------------------------------
  page(
    "cpo-consumer-protection-ontario",
    "Consumer Protection Ontario",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-protection-ontario",
    ["Consumer Protection Ontario"],
    "The hub that names which administrative authority handles which sector — the " +
      "page every consumer forum check starts from.",
  ),
  page(
    "cpo-filing-a-consumer-complaint",
    "Filing a consumer complaint",
    "ontario.ca",
    "https://www.ontario.ca/page/filing-consumer-complaint",
    ["complaint"],
    "The ministry complaint route, which exists alongside a claim and costs nothing.",
  ),
  page(
    "cpo-complaints-and-enforcement",
    "Consumer complaints and enforcement",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-complaints-and-enforcement",
    ["enforcement"],
    "What the ministry will actually do with a complaint, so a profile does not " +
      "oversell it as a substitute for a claim.",
  ),
  page(
    "cpo-homes-and-renovations",
    "Consumer protection information about homes and renovations",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-protection-information-about-homes-and-renovations",
    ["renovation"],
    "Contractor and renovation disputes — the single largest group of claims in the " +
      "property-damage and services families.",
  ),
  page(
    "cpo-guide-home-renovation-businesses",
    "Guide for home renovation and roofing businesses",
    "ontario.ca",
    "https://www.ontario.ca/page/guide-home-renovation-and-roofing-businesses",
    ["renovation"],
    "Written for the business, which makes it the best available statement of what a " +
      "renovator's obligations are — needed for the contractor-side profiles.",
  ),
  page(
    "cpo-guide-auto-repair",
    "Guide for auto repair businesses",
    "ontario.ca",
    "https://www.ontario.ca/page/guide-auto-repair-businesses",
    ["repair"],
    "Estimates, authorisation and charges on a repair — the facts an auto-repair " +
      "dispute turns on, stated by the ministry.",
  ),
  page(
    "cpo-guide-towing-and-storage",
    "Guide for towing and vehicle storage service providers",
    "ontario.ca",
    "https://www.ontario.ca/page/guide-towing-and-vehicle-storage-service-providers",
    ["towing"],
    "PARTLY FILLS A GAP. The Towing and Storage Safety and Enforcement Act, 2021 has " +
      "no fetchable e-Laws document (see SOURCING_NOTES), so this official guide plus " +
      "the Repair and Storage Liens Act is what towing content may rely on.",
  ),
  page(
    "cpo-when-shopping",
    "Consumer protection when shopping",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-protection-when-shopping",
    ["shopping"],
    "Online purchases, deliveries and returns, in the ministry's own words rather " +
      "than paraphrased out of the Act.",
  ),
  page(
    "cpo-contracts",
    "Contracts: best practices and types",
    "ontario.ca",
    "https://www.ontario.ca/page/contracts-best-practices-and-types",
    ["contract"],
    "Which kind of agreement a user has — direct, internet, remote — decides which " +
      "cancellation right applies, and the Act is organised by those categories.",
  ),
  page(
    "cpo-credit-loans-and-debt-collection",
    "Consumer protection information: credit, loans and debt collection",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-protection-information-credit-loans-and-debt-collection",
    ["debt"],
    "The debt family's official companion to the Collection and Debt Settlement " +
      "Services Act.",
  ),
  page(
    "cpo-guide-collection-agencies",
    "Guide for collection agencies",
    "ontario.ca",
    "https://www.ontario.ca/page/guide-collection-agencies",
    ["collection"],
    "What a collection agency may and may not do, written for the agency. The single " +
      "most useful page for the very common 'a collection agency is suing me' position.",
  ),
  page(
    "cpo-travelling-and-entertainment",
    "Consumer protection information around travelling and entertainment",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-protection-information-around-travelling-and-entertainment",
    ["travel"],
    "Travel and event disputes. Stands in for TICO, which returns 403 to an " +
      "automated fetch, so the travel forum check is incomplete without it.",
  ),
  page(
    "cpo-funerals",
    "Consumer protection when planning a funeral, burial, cremation or scattering",
    "ontario.ca",
    "https://www.ontario.ca/page/consumer-protection-when-planning-funeral-burial-cremation-or-scattering",
    ["funeral"],
    "The ministry's companion to the Bereavement Authority page.",
  ),
  page(
    "cpo-identify-scam-or-fraud",
    "How to identify a scam or fraud",
    "ontario.ca",
    "https://www.ontario.ca/page/identify-scam-or-fraud",
    ["scam"],
    "Scam and fraud recovery, where the bank, the police and a civil claim are three " +
      "separate routes and users expect one. A safety-first profile.",
  ),
  page(
    "cpo-protecting-consumer-rights",
    "Protecting consumer rights and safety",
    "ontario.ca",
    "https://www.ontario.ca/page/protecting-consumer-rights-and-safety",
    ["consumer"],
    "The overview that names the rights the sector pages assume.",
  ),
];
