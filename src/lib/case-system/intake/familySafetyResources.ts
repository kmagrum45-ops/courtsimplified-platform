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
 * Sourcing: the organization NAMES below (Assaulted Women's Helpline,
 * Fem'aide, Victim Support Line, Family Court Support Worker Program,
 * Family Law Information Centre) are directly confirmed from two fetched
 * ontario.ca pages -- see citations. Specific phone numbers/current
 * contact details were NOT confirmed from either fetched page and are
 * deliberately left out rather than guessed. Same "fixed skeleton, no
 * invented specifics" principle as safetyPass.ts's IMMEDIATE_DANGER_MESSAGE.
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
      "Ontario also names specific support organizations for family violence, including the Assaulted " +
      "Women's Helpline, Fem'aide (French-language support), and the Victim Support Line.\n\n" +
      "[PLACEHOLDER -- NEEDS REAL REVIEW: specific phone numbers and current contact details for these " +
      "organizations were not confirmed from a directly fetched ontario.ca page during this session and " +
      "are deliberately not included here. They need verification by someone able to confirm they are " +
      "current before this reaches a real user -- same principle as safetyPass.ts's " +
      "IMMEDIATE_DANGER_MESSAGE.]",
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
    ],
    reviewedAt: null,
    status: "draft",
  },
];
