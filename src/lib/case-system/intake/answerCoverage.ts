/**
 * THE ANSWERS TO "WHAT KIND OF CASE IS THIS?" THAT LEAD TO NO KIND OF CLAIM, AND WHY (coverage audit, 11 Nov 2026).
 *
 * An answer that names exactly one kind in the catalogue brings that kind's checklist with it (caseFile.ts claimKindOf,
 * DISPUTE_KIND). Every other answer is listed here with the reason it brings none, so a gap is said, never silent (CLAUDE.md
 * s. 2a: "a step the map lacks shows as not covered yet"). The screens already say so ("your answer does not name one of
 * them yet"). test:answer-coverage fails on an answer neither mapped nor listed, and on a listed one that has since gained
 * a kind (delete its line then). Filling these needs sourced checklists or a reviewed mapping: REVIEW_CHAT_ADDITIONS.md.
 */
export type CoverageCourt = "small-claims" | "civil" | "family";

const SEVERAL = "covers several kinds of claim in the catalogue; the person picks the kind, none is assumed";
const AREA = "an area of law the person picks on the form, not a kind in the catalogue; the case file holds Small Claims kinds only (claimKindOf)";

export const ANSWERS_WITH_NO_KIND: Record<CoverageCourt, Record<string, string>> = {
  "small-claims": {
    "unpaid-money": SEVERAL,
    "contract-dispute": SEVERAL,
    "property-damage": SEVERAL,
    "loan-or-debt": `${SEVERAL} (a personal loan, a co-signed loan, a settlement agreement, unpaid services; Chrome check of #547, G2)`,
    "work-or-services": SEVERAL,
    "deposit-refund": SEVERAL,
    "consumer-purchase": SEVERAL,
    "vehicle-dispute": SEVERAL,
    "personal-injury": SEVERAL,
    other: "names no kind by design",
  },
  civil: Object.fromEntries(
    ["contract", "negligence", "institutional-negligence", "professional-negligence", "human-rights", "disability-accommodation", "employment-human-rights",
      "housing-human-rights", "education-human-rights", "charter", "government-public-authority", "police-conduct", "judicial-review", "tribunal-overlap",
      "defamation", "privacy", "property", "debt", "employment", "fraud-misrepresentation", "intentional-tort", "injunction", "estate", "motion", "appeal",
      "enforcement", "other"].map((value) => [value, AREA]),
  ),
  family: Object.fromEntries(
    ["decision-making-responsibility", "parenting-time", "child-support", "spousal-support", "divorce", "property-division", "sale-of-home", "matrimonial-home",
      "safety-concerns", "relocation", "disclosure", "enforcement", "adoption", "other"].map((value) => [value, AREA]),
  ),
};
