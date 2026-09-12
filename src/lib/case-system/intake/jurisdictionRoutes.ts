/**
 * Jurisdiction-routing registry -- sourced facts about where a matter does
 * NOT belong in Small Claims Court (or doesn't belong there alone), and
 * where it generally goes instead. Same conventions as claimTypes.ts and
 * educationTopics.ts: every fact carries a real citation (`sourceUrl` +
 * `verifiedAt`), `status`/`reviewedAt` follow the same site-owner-review
 * meaning used throughout this directory (not a claim that outside legal
 * counsel has reviewed the wording), and this reuses `EducationCitation`
 * from educationTopics.ts rather than redefining it.
 *
 * Motivation (Session 37, following commit 3bd2667): that commit sourced
 * Insurance Act s.263 and found that when both vehicles in a collision are
 * insured under a direct-compensation policy, the insured has NO right of
 * action against the other driver for vehicle damage at all -- the remedy
 * is a claim against their own insurer. That's a real, sourced,
 * independently valuable finding, but it only existed inside one narrow
 * ClaimType's proceduralNotes -- a user whose story matches the (common)
 * both-insured case gets no ClaimType match at all (correctly -- this
 * isn't a Small Claims matter for them) and, until now, no explanation of
 * why or where to go instead. This registry gives findings like that a
 * home of their own, independent of any one ClaimType, so they can
 * eventually surface directly off an AI-classifier "none" result (see
 * this file's own closing note on where that wiring belongs -- not built
 * this session, registry and content only).
 *
 * "Who does the applying" test (CLAUDE.md section 2) applies here exactly
 * as it does to claimTypes.ts: `whyNotSmallClaims` and `whereItGoes` state
 * what a rule GENERALLY provides and where THAT KIND of matter is
 * GENERALLY heard -- never that a specific user's matter belongs
 * elsewhere. Surfacing a route based on facts is navigation, the same
 * boundary the rest of this directory already draws; deciding whether a
 * given story actually fits a route is the user's call, informed by this
 * content, not a determination this registry makes for them.
 *
 * SEEDED THIS SESSION with only what was already genuinely sourced
 * somewhere in this repo -- no new research was done to find additional
 * routes. Three qualified:
 *   1. Vehicle property damage where both vehicles are insured under
 *      Ontario's direct-compensation scheme -- Insurance Act s.263,
 *      sourced in commit 3bd2667 (claimTypes.ts's new vehicle-accident
 *      entry).
 *   2. A tenancy that is genuinely residential (not commercial) --
 *      already sourced and cited in claimTypes.ts's commercial-tenancy-
 *      dispute entry (ontario.ca/page/renting-commercial-property-ontario).
 *   3. Claims over $50,000, or seeking a remedy other than money or
 *      return of property (e.g. an injunction) -- already sourced and
 *      cited in educationTopics.ts's monetary-limit topic and
 *      remedyTypes.ts's outside-jurisdiction entry.
 *
 * Deliberately NOT included, checked and left out for lack of a source:
 *   - HRTO (human rights), WSIB (workplace injury), CAT (condo records/
 *     pets/parking/storage/noise), LAT (accident benefits) -- searched
 *     claimTypes.ts, questionBank.ts, educationTopics.ts, remedyTypes.ts,
 *     and courtPathClassifier.ts/outOfScopeForums.ts. The only place any
 *     of these forums are even named is outOfScopeForums.ts, which
 *     carries zero citations of any kind -- it's AI-classifier redirect
 *     text (courtPathClassifier.ts's "out-of-scope forum" stage), not
 *     sourced content, and docs/SMALL_CLAIMS_TAXONOMY_ROADMAP.md already
 *     flagged all four of these boundaries as needing dedicated sourcing
 *     work before anything gets built on them. Not attempted this
 *     session, per the task's explicit instruction not to research new
 *     entries.
 *   - Landlord vs. a FORMER residential tenant (the specific LTB/Small-
 *     Claims timing boundary docs/AI_INTAKE_DESIGN.md's open-questions
 *     section already tracks) -- courtPathClassifier.ts's own header
 *     states this was "confirmed unsourceable from ontario.ca/
 *     ontariocourts.ca/ontariocourtforms.on.ca in an earlier session."
 *     Entry 2 below covers the different, already-sourced question of
 *     residential vs. commercial classification, not this one.
 */

import type { EducationCitation } from "./educationTopics";
import type { CourtArea } from "./questionBank";

export type JurisdictionRoute = {
  id: string;
  /** The court area a user might otherwise land in by mistake. */
  courtArea: CourtArea;
  /** What kind of matter this is. */
  matterDescription: string;
  /** Why Small Claims Court is not the route (or not the only route) -- the general rule, not applied to any specific user's facts. */
  whyNotSmallClaims: string;
  /** Where this kind of matter generally goes instead. */
  whereItGoes: string;
  /** Short label for the actual destination (a forum, a different court, or "your own insurer" where that's what the rule provides). */
  destinationForum: string;
  /** Fact-pattern cues for later matching -- same convention as claimTypes.ts's `signals`. No AI here -- just data. */
  signals: string[];
  /** Non-empty tuple, compile-time enforced -- same pattern as claimTypes.ts/educationTopics.ts. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const JURISDICTION_ROUTES: JurisdictionRoute[] = [
  {
    id: "sc-route-vehicle-property-damage-dcpd",
    courtArea: "small-claims",
    matterDescription:
      "Vehicle property damage from a collision, where the vehicle that suffered the damage and at " +
      "least one other vehicle involved were both insured under a motor vehicle liability policy from " +
      "an insurer bound by Ontario's direct-compensation rule at the time of the accident.",
    whyNotSmallClaims:
      "Under section 263 of the Insurance Act, when that's the case, an insured generally has no " +
      "right of action against any other person involved in the accident for damage to their own " +
      "vehicle, its contents, or loss of use -- the right to sue the other driver directly is removed, " +
      "not just an alternative offered alongside it. Since January 1, 2024, an insured may elect not " +
      "to claim from their own insurer under this section, but that election does not by itself " +
      "restore a right of action against the other driver.",
    whereItGoes:
      "A claim against your own insurer, with recovery based on the degree of fault as determined " +
      "under the Fault Determination Rules. If there's a genuine dispute about the fault percentage " +
      "applied or a proposed settlement, section 263(4) resolves that by an action against the " +
      "INSURER, under the ordinary rules of law -- not an action against the other driver.",
    destinationForum: "Your own auto insurer (a claim under Insurance Act s.263)",
    signals: [
      "other driver was insured",
      "both of us had insurance",
      "my insurance company said",
      "direct compensation",
      "insurer denied my claim for the accident",
      "filing through my own insurance",
    ],
    citations: [
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-10",
        pinpoint: "s.263(1): applies when the damaged vehicle AND at least one other vehicle involved are each insured under a motor vehicle liability policy from an insurer bound by the section",
      },
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-10",
        pinpoint: "s.263(5)(a): where the section applies, an insured has no right of action against any other person involved for damage to the insured's automobile, its contents, or loss of use",
      },
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-10",
        pinpoint: "s.263(2)-(2.3): recovery is from the insured's own insurer, fault-based; the 2021, c. 40, Sched. 14, s. 4 opt-out (in force 01/01/2024) doesn't restore a right of action against the other driver; s.263(4): fault/settlement disputes are resolved by an action against the insurer",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-route-residential-tenancy-ltb",
    courtArea: "small-claims",
    matterDescription:
      "A dispute between a landlord and tenant arising from a tenancy that is residential (governed " +
      "by the Residential Tenancies Act), rather than commercial. " +
      "This entry answers the residential-vs-commercial classification question only. It does NOT " +
      "resolve where a landlord's claim against a FORMER tenant belongs once the tenancy has ended -- " +
      "that timing boundary between the Board and Small Claims Court is a separate question this " +
      "repository has not been able to source, and nothing here should be read as settling it.",
    whyNotSmallClaims:
      "The Commercial Tenancies Act governs commercial leases. A residential tenancy is governed by " +
      "the Residential Tenancies Act, 2006 instead. That Act applies to rental units in residential " +
      "complexes DESPITE ANY OTHER ACT and despite any agreement or waiver to the contrary, and the " +
      "Landlord and Tenant Board has exclusive jurisdiction to determine all applications under it " +
      "and all matters in which the Act confers jurisdiction on the Board.",
    whereItGoes:
      "The Landlord and Tenant Board. Where there's a genuine question about whether a specific " +
      "tenancy is residential or commercial, either party can apply to the LTB for a determination of " +
      "whether the Residential Tenancies Act applies. " +
      "The Board's own monetary jurisdiction is capped at the greater of $10,000 and the monetary " +
      "jurisdiction of the Small Claims Court. Someone entitled to apply under the Act whose claim " +
      "EXCEEDS that cap may instead start a proceeding in a court of competent jurisdiction, which " +
      "may then exercise the powers the Board would have had. But claiming an amount at or under the " +
      "cap in a Board application extinguishes the rest: once the Board issues its order, all of the " +
      "party's rights above the Board's monetary jurisdiction are gone.",
    destinationForum: "Landlord and Tenant Board",
    signals: [
      "my landlord",
      "my apartment",
      "residential tenancy",
      "rent for my apartment",
      "my rental unit",
    ],
    citations: [
      {
        sourceName: "Ontario.ca — Renting Commercial Property in Ontario",
        officialUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-07",
        pinpoint: "Commercial Tenancies Act governs commercial leases, not the Residential Tenancies Act; LTB determines residential-vs-commercial disputes",
      },
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: "https://www.ontario.ca/laws/docs/06r17_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.3(1): the Act applies with respect to rental units in residential complexes \"despite any other Act and despite any agreement or waiver to the contrary\"; s.168(2): \"The Board has exclusive jurisdiction to determine all applications under this Act and with respect to all matters in which jurisdiction is conferred on it by this Act\"",
      },
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: "https://www.ontario.ca/laws/docs/06r17_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.207(1): the Board may order payment up to the greater of $10,000 and the monetary jurisdiction of the Small Claims Court; s.207(2): a person whose claim exceeds that may commence a proceeding in any court of competent jurisdiction, which may exercise the powers the Board could have; s.207(3): once the Board issues its order on a claim at or under its monetary jurisdiction, the party's rights in excess of it are extinguished",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-route-exceeds-jurisdiction-superior-court",
    courtArea: "small-claims",
    matterDescription:
      "A money claim over $50,000 (excluding interest and costs), or a claim seeking a remedy Small " +
      "Claims Court doesn't generally grant -- such as an order to do or stop doing something (an " +
      "injunction), rather than payment of money or return of personal property.",
    whyNotSmallClaims:
      "Small Claims Court's jurisdiction is capped at $50,000 and limited to two kinds of remedies: " +
      "payment of money, and the return of personal property. A claim above that amount, or seeking a " +
      "different kind of remedy, generally falls outside what Small Claims Court can order.",
    whereItGoes: "The Superior Court of Justice.",
    destinationForum: "Superior Court of Justice",
    signals: [
      "over $50,000",
      "asking the court to order them to stop",
      "want an injunction",
      "want the court to make them do",
    ],
    citations: [
      {
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-08-31",
        pinpoint: "monetary jurisdiction increased from $35,000 to $50,000, effective October 1, 2025",
      },
      {
        sourceName: "Ontario Superior Court of Justice — Small Claims Court",
        officialUrl: "https://www.ontariocourts.ca/scj/small-claims-court/",
        verifiedAt: "2026-09-07",
        pinpoint: "\"The Small Claims Court hears matters involving disputes for civil claims valued up to $50,000 where a party is seeking money or the return of personal property.\"",
      },
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
        pinpoint: "\"The Small Claims Court can handle any action for the payment of money or the recovery of personal property where the amount claimed does not exceed $50,000\"",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
