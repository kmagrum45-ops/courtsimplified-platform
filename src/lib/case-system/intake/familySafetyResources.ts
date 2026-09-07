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
 * Still unresolved, stated plainly rather than guessed: neither the
 * Family Court Support Worker Program page nor any other fetched page
 * gives a single phone number for it -- ontario.ca's own guidance is a
 * table of courthouse-by-courthouse links to local service providers'
 * own websites, not a number. Same for the Family Law Information Centre
 * -- named, but no number found on any fetched page. Both need someone to
 * either confirm there genuinely is no single number (plausible, given
 * these are locally delivered programs) or find the right page.
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
      "[PLACEHOLDER -- STILL NEEDS REAL REVIEW: no single phone number for the Family Court Support " +
      "Worker Program or the Family Law Information Centre was found on any ontario.ca page checked -- " +
      "ontario.ca's own listing is courthouse-by-courthouse links to local providers' own websites, not " +
      "a number. This may genuinely be correct (these are locally delivered programs), but that should " +
      "be confirmed by someone reviewing this, not assumed. The three numbers above ARE directly " +
      "confirmed -- see citations.]",
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
        verifiedAt: "2026-09-07",
        pinpoint:
          "\"If you are a victim of domestic violence and going through the family court process, you " +
          "might be able to get help from a family court support worker.\"",
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
