/**
 * The rule itself, beside a published sentence (walkthrough run 38525903567,
 * SJ, senior-lawyer review 2026-10-14).
 *
 * WHY. The unpaid-judgment answer says "For an examination, you serve the
 * notice at least 30 days before the hearing." and "You file proof at least 3
 * days before, and the court may order payments." Both were proved, word for
 * word, from the ontario.ca guide "After judgment" -- correctly, but a reader
 * (and a lawyer) wants the rule that sets the time. The published text is
 * hash-locked and is not edited; the rule is shown BESIDE the sentence.
 *
 * Any saved source, not only the Small Claims rules (walkthrough run
 * 38593464953): the Municipal Act and the City of Toronto Act for the
 * gross-negligence sentence (SW), the court's own after-judgment guide for
 * what no rule says (SJ: filing a writ at the enforcement office, its fees and
 * deposits).
 *
 * Each entry is a sentence that appears verbatim in a published answer, and
 * the provisions that state it, quoted from the saved text of its source
 * (docs/sources/corpus/<sourceId>.txt). test:published-library checks: every
 * sentence is still in a published answer (a stale entry fails), every quote
 * is in its saved text, and every number in the sentence -- form numbers
 * included, "20P" as "20P" -- is in a quote beside it.
 */

import { S_MUNICIPAL_44_9_SIDEWALK, S_TORONTO_42_5_SIDEWALK, type CorpusSourceId, type RuleCitation } from "../case-system/stage-map/citations";

export type SentenceRules = { sentence: string; rules: RuleCitation[] };

const cite =
  (sourceId: CorpusSourceId) =>
  (pinpoint: string, quote: string): RuleCitation => ({ sourceId, pinpoint, quote });

const scr = cite("oreg-258-98-small-claims-rules");
const guide = cite("guide-after-judgment");

/** r. 20.10 (3): the notice of examination is served under r. 8.01 (10)-(12). */
const R_20_10_3 = scr("r. 20.10 (3)", "The notice of examination shall be served in accordance with subrules 8.01 (10), (11) and (12).");

/*
 * SJ (walkthrough run 38593464953): the next-step paragraph named the forms,
 * the affidavit, the certificate and the writ filing with no rule beside
 * them. Which rule says what, read from the saved text:
 * - r. 20.03 (a): the writs (20C, 20D) and garnishment; r. 20.08 (4): the clerk
 *   issues the notice of garnishment (20E); r. 20.10 (1): the notice of examination (20H).
 * - Form 20P: r. 20.06 (1) and 20.07 (1) (each writ), r. 20.08 (3) (a)
 *   (garnishment), r. 20.10 (2) (a) (examination).
 * - Form 20A: r. 20.08 (3) (b) and 20.10 (2) (b), each "if the order was made
 *   in another territorial division/jurisdiction", filed with the clerk where
 *   the debtor "resides or carries on business" (r. 20.08 (3), 20.10 (1)).
 * - The enforcement office, its fees and deposits: no rule says it. r. 20.06
 *   (1) and 20.07 (1) issue the writ to the bailiff or the sheriff; the
 *   court's guide says the rest, and is quoted as the guide.
 */
const R_20_06_1 = scr(
  "r. 20.06 (1)",
  "the clerk shall, at the creditor's request, supported by an affidavit for enforcement request (Form 20P) stating the amount still owing, issue to a bailiff a writ of seizure and sale of personal property (Form 20C)",
);
const R_20_07_1 = scr(
  "r. 20.07 (1)",
  "the clerk shall at the creditor's request, supported by an affidavit for enforcement request (Form 20P) stating the amount still owing, issue to the sheriff specified by the creditor a writ of seizure and sale of land (Form 20D).",
);

/*
 * SW (walkthrough run 38593464953): "There, the municipality is liable only
 * for gross negligence." -- the sentence that follows the snow-and-ice
 * sentence in the notice answer. Municipal Act s. 44 (9) and, for Toronto,
 * City of Toronto Act s. 42 (5), each quoted from the saved text.
 */
// The stage map's own citations, so the sentence and the stage text quote one text.
const MA_44_9 = S_MUNICIPAL_44_9_SIDEWALK;
const COTA_42_5 = S_TORONTO_42_5_SIDEWALK;

export const SENTENCE_RULES: SentenceRules[] = [
  {
    sentence: "You can ask for a notice of examination [Form 20H] or garnishment [Form 20E], or a writ of seizure and sale [Form 20C or 20D].",
    rules: [
      scr(
        "r. 20.10 (1)",
        "the clerk of a court in the territorial division in which the debtor or other person to be examined resides or carries on business shall, at the creditor's request, issue a notice of examination (Form 20H) directed to the debtor or other person.",
      ),
      scr("r. 20.08 (4)", "On the filing of the documents required by subrule (3), the clerk shall issue a notice of garnishment (Form 20E) naming as garnishee the person named in the affidavit."),
      scr(
        "r. 20.03 (a)",
        "an order for the payment or recovery of money may be enforced by, (i) a writ of seizure and sale of personal property (Form 20C) under rule 20.06, (ii) a writ of seizure and sale of land (Form 20D) under rule 20.07, and (iii) garnishment under rule 20.08",
      ),
    ],
  },
  {
    sentence: "Each is filed with an Affidavit for Enforcement Request [Form 20P].",
    rules: [
      scr("r. 20.10 (2) (a)", "The creditor's request shall be accompanied by, (a) an affidavit for enforcement request (Form 20P)"),
      scr(
        "r. 20.08 (3) (a)",
        "A creditor who seeks to enforce an order by garnishment shall file with the clerk of a court in the territorial division in which the debtor resides or carries on business, (a) an affidavit for enforcement request (Form 20P)",
      ),
      R_20_06_1,
      R_20_07_1,
    ],
  },
  {
    sentence: "Either notice needs a Certificate of Judgment [Form 20A] in another court's area where the debtor lives or does business.",
    rules: [
      scr("r. 20.08 (3) (b)", "(b) a certificate of judgment (Form 20A), if the order was made in another territorial division."),
      scr("r. 20.10 (2) (b)", "(b) a certificate of judgment (Form 20A), if the order was made in another territorial jurisdiction."),
      scr(
        "r. 20.04 (1)",
        "the clerk shall, at the creditor's request, supported by an affidavit for enforcement request (Form 20P) stating the amount still owing, issue a certificate of judgment (Form 20A) to the clerk at the court location specified by the creditor.",
      ),
    ],
  },
  {
    sentence: "You file an issued writ at the enforcement office, which has its own fees and deposits.",
    rules: [
      R_20_06_1,
      R_20_07_1,
      guide("How a creditor begins the writ of seizure and sale of personal property process", "Court staff will issue the writ and return the issued writ to you to file in the enforcement office."),
      guide(
        "How a creditor begins the writ of seizure and sale of personal property process",
        "You pay an enforcement fee and a deposit to the enforcement office to cover the anticipated disbursements (expenses) to enforce the writ.",
      ),
    ],
  },
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
  {
    sentence: "There, the municipality is liable only for gross negligence.",
    rules: [MA_44_9, COTA_42_5],
  },
  {
    sentence: "For injury from snow or ice on a sidewalk, the City is liable only for gross negligence.",
    rules: [COTA_42_5],
  },
];

/** The entries whose sentence is in `text`, in the order they appear there. */
export function sentenceRulesIn(text: string): SentenceRules[] {
  return SENTENCE_RULES.filter((entry) => text.includes(entry.sentence)).sort((a, b) => text.indexOf(a.sentence) - text.indexOf(b.sentence));
}
