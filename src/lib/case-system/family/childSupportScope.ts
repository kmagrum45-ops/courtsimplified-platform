/**
 * What the child support path covers, and what it recognises but does not.
 *
 * COSTS NOTHING. Pure string matching over what the user typed. No AI.
 *
 * WHY THIS EXISTS AS A MODULE RATHER THAN SILENCE. The screen covers one
 * situation: a first application for child support on the Family Law Act s. 33
 * path, for the table amount, with or without s. 7 expenses. Four common
 * situations sit just outside it, and each takes the case somewhere the
 * screen's questions and the draft's form selection would be wrong for.
 *
 * A user in one of them must be TOLD, not walked through the wrong form. A
 * variation application is not Form 8; an undue-hardship claim is not the table
 * amount and therefore not FLR r. 13 (1.3); a high-income case has a provision
 * of its own. Saying nothing produces a confident, complete, wrong document.
 *
 * WHAT THIS MUST NOT DO — and the line is narrow enough to state exactly.
 *
 * It may NOT say the user's situation IS a variation, IS a shared-parenting
 * case, or that s. 10 applies to them. That is applying a legal test to their
 * facts, which CLAUDE.md section 2 puts on the advice side. What it does
 * instead is notice the VOCABULARY, surface the topic, and hand the question
 * back: "what you have written mentions changing an existing order — if that is
 * what this is, this part of the site does not cover it yet." The user decides
 * whether the description fits.
 *
 * It also may not gate. A match shows a notice; nothing is blocked, nothing is
 * rerouted, and the user can carry on if the notice does not describe them.
 *
 * FALSE POSITIVES ARE THE ACCEPTABLE FAILURE. A user told "this might be
 * outside what we cover, here is why" who then decides it isn't has lost a few
 * seconds. A user silently handed a Form 8 for a variation has lost more.
 */

import { FLA_URL, ONTARIO_GUIDELINES_URL } from "./childSupportFlaPath";

export type ScopeNoticeId =
  | "variation-of-existing-order"
  | "child-at-or-over-age-of-majority"
  | "income-over-150000"
  | "shared-or-split-parenting-time"
  | "undue-hardship";

export type ScopeNotice = {
  id: ScopeNoticeId;
  /** Shown as a heading. States the topic, never the user's situation. */
  topic: string;
  /** What the provision is about, in general terms. */
  whatItIs: string;
  /** Why this screen's questions and draft would be wrong for it. */
  whyNotCoveredHere: string;
  pinpoint: string;
  sourceUrl: string;
  /**
   * Words and phrases that raise the topic. Matched against the user's own
   * text, lowercased, as whole phrases — never as a conclusion about them.
   */
  triggers: string[];
};

export const SCOPE_NOTICES: ScopeNotice[] = [
  {
    id: "variation-of-existing-order",
    topic: "Changing a child support order or agreement that already exists",
    whatItIs:
      "Family Law Act s. 37 (2) provides that in an application for variation of an order for " +
      "support of a child, the court may vary the order in accordance with the child support " +
      "guidelines. That is a different application from a first order.",
    whyNotCoveredHere:
      "This part of the site builds a first application for support. A variation starts from a " +
      "different form and asks different questions, and nothing here is set up for it. Using this " +
      "would produce a document for the wrong application.",
    pinpoint: "FLA s. 37",
    sourceUrl: FLA_URL,
    triggers: [
      "existing order",
      "current order",
      "change the order",
      "change the amount",
      "vary the order",
      "variation",
      "already have an order",
      "already an order",
      "court already ordered",
      "increase the support",
      "decrease the support",
      "reduce the support",
      "separation agreement says",
    ],
  },
  {
    id: "child-at-or-over-age-of-majority",
    topic: "A child who is eighteen or older",
    whatItIs:
      "O. Reg. 391/97 s. 3 (2) provides that where a child is the age of majority or over, the " +
      "amount is either the amount determined by applying the guidelines as if the child were " +
      "under the age of majority, or — if the court considers that approach inappropriate — the " +
      "amount it considers appropriate having regard to the condition, means, needs and other " +
      "circumstances of the child and the financial ability of each parent or spouse.",
    whyNotCoveredHere:
      "The table route this screen follows is s. 3 (1), which is about children under the age of " +
      "majority. s. 3 (2) is a separate route with a discretion in it, and the questions here do " +
      "not collect what that route turns on.",
    pinpoint: "O. Reg. 391/97 s. 3 (2)",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    triggers: [
      "age of majority",
      "over 18",
      "over eighteen",
      "18 years old",
      "19 years old",
      "20 years old",
      "21 years old",
      "adult child",
      "at university",
      "in university",
      "at college",
      "in college",
      "post-secondary",
      "postsecondary",
    ],
  },
  {
    id: "income-over-150000",
    topic: "An income over $150,000",
    whatItIs:
      "O. Reg. 391/97 s. 4 provides a separate route where the income of the parent or spouse " +
      "against whom an order is sought is over $150,000: the amount may be the table amount, or " +
      "the table amount for the first $150,000 plus an amount the court considers appropriate for " +
      "the balance, having regard to the condition, means, needs and other circumstances of the " +
      "children and the financial ability of each parent or spouse.",
    whyNotCoveredHere:
      "s. 4 gives the court a choice between two routes, and the second is not a table figure at " +
      "all. An application resting on the table amount alone does not describe that situation.",
    pinpoint: "O. Reg. 391/97 s. 4",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    triggers: [
      "over 150,000",
      "over $150,000",
      "over 150000",
      "more than 150,000",
      "high income",
      "high-income",
    ],
  },
  {
    id: "shared-or-split-parenting-time",
    topic: "Parenting time split close to evenly, or split between children",
    whatItIs:
      "O. Reg. 391/97 s. 9 applies where each parent exercises not less than 40% of parenting " +
      "time with a child over the course of a year, and requires the amount to be determined " +
      "taking into account the table amounts for each parent, the increased costs of the " +
      "arrangement, and the conditions, means, needs and other circumstances of each parent and " +
      "child. s. 8 applies where there are two or more children and each parent has the majority " +
      "of parenting time with one or more of them.",
    whyNotCoveredHere:
      "Both sections replace the straightforward table route with something the court works out. " +
      "Whether either applies to a particular arrangement is for the court, so this screen records " +
      "the arrangement as described and does not decide — but an application built only around the " +
      "table amount may not be the right shape.",
    pinpoint: "O. Reg. 391/97 ss. 8 and 9",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    triggers: [
      "50/50",
      "50-50",
      "fifty fifty",
      "week on week off",
      "week on, week off",
      "alternating weeks",
      "equal time",
      "shared custody",
      "shared parenting",
      "half the time",
      "one lives with me and one lives with",
    ],
  },
  {
    id: "undue-hardship",
    topic: "A claim that the table amount would cause undue hardship",
    whatItIs:
      "O. Reg. 391/97 s. 10 lets a court award a different amount where a parent or spouse, or a " +
      "child, would otherwise suffer undue hardship, and sets out a comparison of household " +
      "standards of living in Schedule II.",
    whyNotCoveredHere:
      "A s. 10 claim is an application for an amount other than the table amount, which changes " +
      "what has to be filed — including whether FLR r. 13 (1.3) removes the financial statement. " +
      "The questions here do not collect what Schedule II's comparison needs.",
    pinpoint: "O. Reg. 391/97 s. 10; Schedule II",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    triggers: [
      "undue hardship",
      "cannot afford",
      "can't afford",
      "too much to pay",
      "unaffordable",
      "would leave me with nothing",
    ],
  },
];

/** Lowercase and collapse whitespace so a phrase matches however it was typed. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Which topics the user's own words raise.
 *
 * Returns notices, never conclusions. Order follows SCOPE_NOTICES so the
 * output is stable and does not imply a ranking.
 */
export function scopeNoticesFor(...texts: (string | undefined)[]): ScopeNotice[] {
  const haystack = normalize(texts.filter(Boolean).join(" \n "));
  if (!haystack) return [];

  return SCOPE_NOTICES.filter((notice) =>
    notice.triggers.some((trigger) => haystack.includes(normalize(trigger))),
  );
}
