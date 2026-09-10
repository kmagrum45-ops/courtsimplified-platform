/**
 * Family-specific safety/support resource content -- NOT a safety-pass
 * mechanism. safetyPass.ts (AI classification of a story into
 * immediate-danger/distress/clear) is a separate, unrelated concern. This
 * is pure sourced content, shown based on court path (Family) alone,
 * never based on any AI judgment call about a user's specific facts --
 * same "no AI, just data" principle as claimTypes.ts's `signals` field.
 *
 * Session 6. Reuses EducationCitation from educationTopics.ts rather than
 * redefining it. Not `EducationTopic` itself, since that type's
 * `courtArea` is hardcoded to `"small-claims"` -- this needs `"family"`.
 *
 * DRAFT wording, pending lawyer/paralegal (and, for this specific topic,
 * ideally someone with family-violence-support expertise) review, same
 * convention as the rest of this directory.
 *
 * Sourcing: the organization NAMES (Assaulted Women's Helpline, Fem'aide,
 * Victim Support Line, Family Court Support Worker Program, Family Law
 * Information Centre) were confirmed in Session 6 from two fetched
 * ontario.ca pages. Session 8 went back for the phone numbers specifically
 * -- those two original pages genuinely don't contain any (confirmed by
 * re-fetching both and asking explicitly), but two other ontario.ca pages
 * do, directly fetched and quoted: Assaulted Women's Helpline and Fem'aide
 * numbers came from ontario.ca/page/connect-supports-survivors-violence;
 * the Victim Support Line number was confirmed on that same page AND
 * independently on ontario.ca/page/victim-services-ontario (identical
 * both times). See citations for exact quoted text.
 *
 * This session resolved the placeholder the two paragraphs above left open.
 * Neither the Family Court Support Worker Program nor the Family Law
 * Information Centre has a single province-wide phone number -- confirmed
 * again this session, not re-guessed -- because both are delivered locally
 * per court location, not centrally. That's a real, correct fact about how
 * these programs work, not a sourcing gap to keep flagging. The content
 * below states the actual, sourced way to reach the local one instead of a
 * number that doesn't exist:
 *   - Family Court Support Worker: ontario.ca/page/family-court-support-workers
 *     itself says the way to reach yours is its own table of service
 *     providers by court location ("Visit the service provider's website
 *     for the court location your case is in..."), not a courthouse phone
 *     call -- checked directly this session, not assumed from the program's
 *     name.
 *   - Family Law Information Centre: ontario.ca/document/guide-procedures-
 *     family-court confirms FLICs are "available in all family courts,"
 *     i.e. reached by going to the courthouse handling the case, and
 *     ontario.ca/locations/courts/ is where that courthouse's own contact
 *     information lives -- confirmed by fetching one individual courthouse
 *     page (Alexandria) directly and finding a real, live phone number
 *     listed there, not assumed to be true of the index generally.
 */

import type { EducationCitation } from "./educationTopics";

export type FamilyResourceTopic = {
  id: string;
  courtArea: "family";
  title: string;
  content: string;
  /** Non-empty tuple, compile-time enforced -- same pattern as educationTopics.ts. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const FAMILY_RESOURCE_TOPICS: FamilyResourceTopic[] = [
  {
    id: "family-violence-support-resources",
    courtArea: "family",
    title: "Support if family violence is part of your situation",
    content:
      "If family violence is part of what you're dealing with, Ontario has support services separate " +
      "from the court process itself. A Family Court Support Worker can help you understand and go " +
      "through the family court process if you're a victim of domestic violence -- Family Court " +
      "Support Workers do not give legal advice, but they can help you understand what's happening and " +
      "connect you to other services. Every courthouse also has a Family Law Information Centre (FLIC) " +
      "that provides information about the court process and referrals to local resources.\n\n" +
      "Ontario also names specific support organizations for family violence:\n" +
      "- Assaulted Women's Helpline: 1-866-863-0511 (toll-free), or 416-863-0511\n" +
      "- Fem'aide (French-language support): 1-877-336-2433 (toll-free)\n" +
      "- Victim Support Line: 1-888-579-2888 (toll-free), or 416-314-2447\n\n" +
      "The Family Court Support Worker Program and the Family Law Information Centre are delivered " +
      "locally through each court location rather than through a single province-wide phone number. " +
      "To find the Family Court Support Worker for your court, use Ontario's own listing of service " +
      "providers by court location, which links directly to the organization delivering the program " +
      "there. To reach the Family Law Information Centre, contact or visit the courthouse handling " +
      "your case -- Ontario's own courthouse listing gives the address and contact information, " +
      "including a phone number, for each location.",
    citations: [
      {
        sourceName: "Ontario.ca — Violence and Abuse: Family Violence",
        officialUrl: "https://www.ontario.ca/page/violence-family",
        verifiedAt: "2026-09-07",
        pinpoint: "names Assaulted Women's Helpline, Fem'aide, and Victim Support Line as family violence support resources",
      },
      {
        sourceName: "Ontario.ca — Family Court Support Workers",
        officialUrl: "https://www.ontario.ca/page/family-court-support-workers",
        verifiedAt: "2026-09-10",
        pinpoint:
          "\"If you are a victim of domestic violence and going through the family court process, you " +
          "might be able to get help from a family court support worker.\" The same page directs users " +
          "to its own table of service providers by court location rather than a phone number: " +
          "\"Visit the service provider's website for the court location your case is in to learn more " +
          "about the program and how you can access it.\"",
      },
      {
        sourceName: "Ontario.ca — Guide to Procedures in Family Court",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-family-court",
        verifiedAt: "2026-09-10",
        pinpoint:
          "\"You may choose to visit a Family Law Information Centre (FLIC) at any point in your case. " +
          "FLICs are available in all family courts to assist people who are involved in the family " +
          "law process.\"",
      },
      {
        sourceName: "Ontario.ca — Court Locations",
        officialUrl: "https://www.ontario.ca/locations/courts/",
        verifiedAt: "2026-09-10",
        pinpoint:
          "Each individual courthouse page lists that location's address and contact information -- " +
          "confirmed directly by fetching the Alexandria courthouse page, which lists a phone number " +
          "(\"613-525-4330\") alongside the address and office hours.",
      },
      {
        sourceName: "Ontario.ca — Connect with Supports for Survivors of Violence",
        officialUrl: "https://www.ontario.ca/page/connect-supports-survivors-violence",
        verifiedAt: "2026-09-07",
        pinpoint:
          "Assaulted Women's Helpline \"Toll-free: 1-866-863-0511\" and \"416-863-0511\"; Fem'aide " +
          "\"Toll-free: 1-877-336-2433\"; Victim Support Line \"Toll-free: 1-888-579-2888\" and " +
          "\"416-314-2447\"",
      },
      {
        sourceName: "Ontario.ca — Victim Services Ontario",
        officialUrl: "https://www.ontario.ca/page/victim-services-ontario",
        verifiedAt: "2026-09-07",
        pinpoint:
          "Victim Support Line: \"416-314-2447\" and \"Toll-free: 1-888-579-2888\" -- independently " +
          "confirms the same numbers found on the page above",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
