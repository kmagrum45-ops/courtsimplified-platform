import type { Fixture } from "./fixtureTypes";

/**
 * Session 36 -- a GeneratedStory is a Fixture (same shape the pipeline
 * runner and mapGuidedIntakeToSmallClaimsInput consume) plus the ground
 * truth the rule checks need to verify against: what claim type this story
 * SHOULD match, what amount was actually claimed and whether it's over the
 * Small Claims limit, which evidence descriptions were explicitly
 * confirmed as available (rule 3 checks these never get flagged missing),
 * and whether the date was stated as uncertain (rule 5 checks that
 * uncertainty survives).
 */
export type GeneratedStory = Fixture & {
  claimTypeId: string;
  amount: number;
  overLimit: boolean;
  confirmedEvidenceDescriptions: string[];
  dateUncertain: boolean;
};
