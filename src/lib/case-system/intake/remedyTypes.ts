/**
 * Small Claims remedies registry -- Phase 0 content foundation, same
 * pattern and purpose as `educationTopics.ts` (see docs/AI_INTAKE_DESIGN.md):
 * general education only, no surfacing logic yet, no AI reads this in this
 * phase. Reuses `EducationCitation` and `FactCondition` rather than
 * redefining them.
 *
 * DRAFT wording -- every `plainExplanation` below is pending lawyer/
 * paralegal review before it ships, same convention as `questionBank.ts`
 * and `educationTopics.ts`.
 *
 * What this covers is what courts in this category of situation typically
 * CAN or CANNOT order -- never "you should ask for X" or "you are entitled
 * to X". See docs/AI_INTAKE_DESIGN.md, "who does the applying" test: this
 * registry describes the general shape of Small Claims remedies, it never
 * tells a user their facts qualify for one.
 *
 * All four entries were sourceable from ontario.ca/ontariocourts.ca this
 * session -- nothing was cut. (For the pattern of what to do when a fact
 * *isn't* sourceable, see educationTopics.ts's note on the two topics it
 * dropped.)
 */

import type { FactCondition } from "./questionBank";
import type { EducationCitation } from "./educationTopics";

export type RemedyTopic = {
  id: string;
  courtArea: "small-claims";
  title: string;
  /** Omitted means the topic is generally relevant and not fact-gated. */
  surfacedWhen?: FactCondition;
  plainExplanation: string;
  /** Non-empty tuple, compile-time enforced -- same pattern as educationTopics.ts. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const REMEDY_TYPES: RemedyTopic[] = [
  {
    id: "sc-remedy-monetary-judgment",
    courtArea: "small-claims",
    title: "Money judgments",
    plainExplanation:
      "Small Claims Court can order one party to pay money to another, up to $50,000 (not " +
      "counting interest and costs). This is the most common kind of order the court makes. " +
      "See the education topic on the $50,000 limit for how that cap works.",
    citations: [
      {
        // Same fact and citation as educationTopics.ts's sc-topic-monetary-limit --
        // cross-referenced rather than re-verified, since it's the identical claim.
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-08-31",
        pinpoint: "monetary jurisdiction increased from $35,000 to $50,000, effective October 1, 2025",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-remedy-return-of-property",
    courtArea: "small-claims",
    title: "Return of personal property",
    plainExplanation:
      "Alongside money, Small Claims Court can order the return of specific personal property -- " +
      "for example, an item someone is holding onto that belongs to someone else. This is generally " +
      "only available for personal property (belongings, not land or buildings), and is part of the " +
      "same $50,000 jurisdiction that applies to money claims.",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
        pinpoint:
          "\"The Small Claims Court can handle any action for the payment of money or the recovery " +
          "of personal property where the amount claimed does not exceed $50,000\"",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-remedy-outside-jurisdiction",
    courtArea: "small-claims",
    title: "What Small Claims Court generally doesn't handle",
    plainExplanation:
      "Small Claims Court's jurisdiction is generally limited to two kinds of remedies: money, and " +
      "the return of personal property, each up to $50,000. If what someone is looking for doesn't " +
      "fit either of those -- for example, asking a court to order someone to do or stop doing " +
      "something, rather than pay money or return an item -- that generally falls outside what " +
      "Small Claims Court can order, and would typically need to go to a different court instead.",
    citations: [
      {
        sourceName: "Ontario Superior Court of Justice — Small Claims Court",
        officialUrl: "https://www.ontariocourts.ca/scj/small-claims-court/",
        verifiedAt: "2026-09-07",
        pinpoint:
          "\"The Small Claims Court hears matters involving disputes for civil claims valued up to " +
          "$50,000 where a party is seeking money or the return of personal property.\"",
      },
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
        pinpoint:
          "\"The Small Claims Court can handle any action for the payment of money or the recovery " +
          "of personal property where the amount claimed does not exceed $50,000\"",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-remedy-interest-and-costs",
    courtArea: "small-claims",
    title: "Interest and costs",
    plainExplanation:
      "Interest and costs (such as court filing fees) are generally handled separately from, and in " +
      "addition to, the amount claimed -- they don't count against the $50,000 limit. Whether " +
      "interest or costs are awarded, and how much, depends on the specific case; this is general " +
      "information that these can be part of an order, not a specific amount for any claim.",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
        pinpoint:
          "\"...where the amount claimed does not exceed $50,000, excluding interest and costs such as court fees\"",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
