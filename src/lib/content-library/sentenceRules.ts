/**
 * The rule itself, beside a published sentence the release proved from a
 * guide (walkthrough run 38525903567, SJ, senior-lawyer review 2026-10-14).
 *
 * WHY. The unpaid-judgment answer says "For an examination, you serve the
 * notice at least 30 days before the hearing." and "You file proof at least 3
 * days before, and the court may order payments." Both were proved, word for
 * word, from the ontario.ca guide "After judgment" -- correctly, but a reader
 * (and a lawyer) wants the rule that sets the time. The published text is
 * hash-locked and is not edited; the rule is shown BESIDE the sentence.
 *
 * Each entry is a sentence that appears verbatim in a published answer, and
 * the provisions that state it, quoted from the saved Rules of the Small
 * Claims Court. test:stage-answers checks: every sentence is still in a
 * published answer (a stale entry fails), every quote is in the saved text,
 * and every number in the sentence is in a quote beside it.
 */

import type { RuleCitation } from "../case-system/stage-map/citations";

export type SentenceRules = { sentence: string; rules: RuleCitation[] };

const scr = (pinpoint: string, quote: string): RuleCitation => ({ sourceId: "oreg-258-98-small-claims-rules", pinpoint, quote });

/** r. 20.10 (3): the notice of examination is served under r. 8.01 (10)-(12). */
const R_20_10_3 = scr("r. 20.10 (3)", "The notice of examination shall be served in accordance with subrules 8.01 (10), (11) and (12).");

export const SENTENCE_RULES: SentenceRules[] = [
  {
    sentence: "For an examination, you serve the notice at least 30 days before the hearing.",
    rules: [
      R_20_10_3,
      scr(
        "r. 8.01 (12) (a)",
        "The notice of examination, (a) shall be served, together with the financial information form if applicable, at least 30 days before the date fixed for the examination",
      ),
    ],
  },
  {
    sentence: "You file proof at least 3 days before, and the court may order payments.",
    rules: [
      scr("r. 8.01 (12) (b)", "(b) shall be filed, with proof of service, at least three days before the date fixed for the examination."),
      scr("r. 20.10 (7)", "After the examination or if the debtor's consent is filed, the court may make an order as to payment."),
    ],
  },
];

/** The entries whose sentence is in `text`, in the order they appear there. */
export function sentenceRulesIn(text: string): SentenceRules[] {
  return SENTENCE_RULES.filter((entry) => text.includes(entry.sentence)).sort((a, b) => text.indexOf(a.sentence) - text.indexOf(b.sentence));
}
