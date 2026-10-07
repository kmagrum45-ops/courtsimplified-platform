/**
 * The amount the user recorded, set against the court's money limits, at the
 * step where it decides how the claim is started.
 *
 * WHY (page review, 2026-10-07). The civil plaintiff who recorded $60,000 was
 * shown the whole of Rule 76 and the Small Claims limit in general terms, and
 * left to work out which applied to her. A lawyer would say it: "$60,000 is
 * over the Small Claims limit and under $200,000, so if you are only asking
 * for money, your claim goes under the simplified procedure and must say so."
 * CLAUDE.md "Guide like a lawyer" allows exactly that; it applies the rule to
 * the user's own figure and says nothing about whether the claim is good.
 *
 * Behind `caseSpecificDeadlines` (case-specific procedural answers). Every
 * sentence is conditional on what only the user knows -- whether the claim is
 * only for money -- and every sentence carries its provision.
 */

import { isInScope } from "./policy/a2iScope";
import { parseRecordedAmount, formatRecordedAmount } from "./format/recordedAmount";
import {
  RCP_76_02_1_MANDATORY,
  RCP_76_02_3_OPTIONAL,
  RCP_76_02_4_SAY_SO,
  S_CJA_23_1_1_LEAVE,
  S_MONETARY_LIMIT,
  type RuleCitation,
} from "./stage-map/citations";

export type AmountNote = { text: string; sources: RuleCitation[] };

/** The steps at which a plaintiff decides where and how to start. */
const CIVIL_STARTING_STEPS = new Set([
  "civil:before-filing:deciding-whether-to-sue",
  "civil:plaintiff:claim-drafted-not-issued",
]);

const SMALL_CLAIMS_LIMIT = 50_000;
const SIMPLIFIED_LIMIT = 200_000;

export function amountNoteFor({
  courtPath,
  stepId,
  recordedAmount,
}: {
  courtPath: string;
  stepId: string | null | undefined;
  recordedAmount: string | null | undefined;
}): AmountNote | null {
  if (!isInScope("caseSpecificDeadlines")) return null;
  const amount = parseRecordedAmount(recordedAmount ?? "");
  if (amount === null || amount <= 0) return null;
  const shown = formatRecordedAmount(recordedAmount ?? "");
  const lead = `You recorded ${shown}. These limits do not count interest and costs.`;

  if (courtPath === "civil" && stepId && CIVIL_STARTING_STEPS.has(stepId)) {
    if (amount <= SMALL_CLAIMS_LIMIT) {
      return {
        text:
          `${lead} A claim for money of $50,000 or less is within the Small Claims Court's limit. ` +
          "It can be started in the Superior Court only with that court's leave. " +
          "If you start it in the Superior Court with leave, and it is only for money or property, " +
          "it goes under the simplified procedure (Rule 76), and your statement of claim must say so.",
        sources: [S_MONETARY_LIMIT, S_CJA_23_1_1_LEAVE, RCP_76_02_1_MANDATORY, RCP_76_02_4_SAY_SO],
      };
    }
    if (amount <= SIMPLIFIED_LIMIT) {
      return {
        text:
          `${lead} That is more than the Small Claims Court's $50,000 limit, so the claim is started in the Superior Court. ` +
          "If your claim is only for money or property, $200,000 or less means it must go under the simplified procedure (Rule 76). " +
          "Your statement of claim must then say the action is brought under Rule 76.",
        sources: [S_MONETARY_LIMIT, RCP_76_02_1_MANDATORY, RCP_76_02_4_SAY_SO],
      };
    }
    return {
      text:
        `${lead} That is more than $200,000, so the simplified procedure (Rule 76) is not required. ` +
        "You may still choose it. If you do, your statement of claim must say so.",
      sources: [RCP_76_02_1_MANDATORY, RCP_76_02_3_OPTIONAL, RCP_76_02_4_SAY_SO],
    };
  }

  if (courtPath === "small-claims" && stepId === "before-filing:deciding-whether-to-sue" && amount > SMALL_CLAIMS_LIMIT) {
    return {
      text:
        `${lead} That is more than the Small Claims Court's limit of $50,000. ` +
        "Choose “My claim is worth more than the limit — what happens now?” in the list above for what that means.",
      sources: [S_MONETARY_LIMIT],
    };
  }
  return null;
}

/** The amount the user recorded on a saved intake, whichever intake wrote it. */
export function recordedAmountOf(intake: { facts?: unknown; extra?: unknown } | null | undefined): string {
  if (!intake || typeof intake !== "object") return "";
  const extra = intake.extra && typeof intake.extra === "object" ? (intake.extra as Record<string, unknown>) : {};
  if (typeof extra.amountClaimed === "string" && extra.amountClaimed.trim()) return extra.amountClaimed.trim();
  const civil = extra.civilInput && typeof extra.civilInput === "object" ? (extra.civilInput as Record<string, unknown>) : null;
  if (civil && typeof civil.amountClaimed === "string" && civil.amountClaimed.trim()) return civil.amountClaimed.trim();
  // The Small Claims record carries it only as a labelled line.
  if (typeof intake.facts === "string") {
    const line = intake.facts.match(/Amount claimed or disputed:\s*([^\n]+)/);
    if (line && line[1].trim()) return line[1].trim();
  }
  return "";
}
