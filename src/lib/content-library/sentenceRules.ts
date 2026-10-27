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

const rcp = (pinpoint: string, quote: string): RuleCitation => ({ sourceId: "rules-of-civil-procedure", pinpoint, quote });

/**
 * The leave sentences after "a claim within the Small Claims limit needs leave": the rule that
 * sets each, beside it (Charter re-test 27 Oct: "by motion without notice… only if it is in the
 * interest of justice" were shown with no citation). Checked against the saved Rules of Civil
 * Procedure, r. 14.01.1 (2) and (3).
 */
const RCP_14_01_1_2 = rcp("r. 14.01.1 (2)", "A motion under subsection 23 (1.1) of the Courts of Justice Act for leave to commence an action in the Superior Court of Justice that is within the Small Claims Court's jurisdiction may be made without notice, unless the court orders otherwise.");
const RCP_14_01_1_3 = rcp("r. 14.01.1 (3)", "The court may grant leave under subsection 23 (1.1) of the Courts of Justice Act only if it is in the interest of justice.");

export const SENTENCE_RULES: SentenceRules[] = [
  { sentence: "You may ask for leave by motion without notice, unless the court orders otherwise.", rules: [RCP_14_01_1_2] },
  { sentence: "You may ask for this leave without notice, unless the court orders otherwise.", rules: [RCP_14_01_1_2] },
  { sentence: "The court may grant it only if it is in the interest of justice.", rules: [RCP_14_01_1_3] },
  { sentence: "The court may give that leave only if it is in the interest of justice.", rules: [RCP_14_01_1_3] },
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
