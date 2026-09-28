/**
 * The amount a user says they are claiming, against the amount they ask the
 * court to order.
 *
 * *** WHY THIS EXISTS ***
 *
 * The 2026-09-27 case-review batch included a story built with three different
 * figures: "around $5,000" in the story, $6,200 as the amount claimed, and a
 * $7,500 invoice. The output listed the invoice and the claim side by side and
 * never mentioned that they disagree. The fact-pattern contradiction detector
 * does not compare amounts at all.
 *
 * *** WHY ONLY THESE TWO FIGURES ***
 *
 * Both are the user's own statement of the same thing -- what they want -- so
 * a difference between them is a fact to confirm, not a reading of the case.
 *
 * Figures in the evidence and the story are deliberately NOT compared. They
 * differ from the claim for ordinary reasons: the batch's contractor contract
 * was $1,400 and the flood repair it caused $6,300; the car cost $54,000 and
 * the appraisal put its loss at $18,000. Flagging those would tell users their
 * paperwork conflicts when it does not, and working out which figure the claim
 * should be is applying the facts -- the system's side of the line in
 * CLAUDE.md section 2, not the user's.
 *
 * *** WHAT IT SAYS ***
 *
 * Only that the two figures differ and which is which. It does not say which is
 * right, and it does not say the difference matters to the outcome
 * (CLAUDE.md sections 3 and 4). Pure and deterministic: no model call.
 */

/**
 * Dollar figures written with a "$". Deliberately stricter than
 * utils.extractDollarAmounts, which also reads bare numbers -- a requested
 * outcome that says "by June 15, 2026" would otherwise yield 15 and 2026 and
 * be reported as a mismatch.
 */
export function statedDollarFigures(text: string): number[] {
  const matches = String(text || "").match(/\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+(?:\.\d{1,2})?/g) || [];
  return matches
    .map((m) => Number(m.replace(/[$,\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export type AmountMismatch = { claimed: number[]; requested: number[] };

/**
 * A mismatch is reported only when both answers contain a "$" figure and they
 * share none. A requested outcome that restates the claimed amount and adds
 * something ("$8,400 plus the $102 filing fee") shares $8,400 and passes.
 */
export function claimedVersusRequestedMismatch(
  amountClaimed: string,
  requestedOutcome: string,
): AmountMismatch | null {
  const claimed = statedDollarFigures(amountClaimed);
  const requested = statedDollarFigures(requestedOutcome);
  if (claimed.length === 0 || requested.length === 0) return null;
  const shared = claimed.some((c) => requested.some((r) => Math.abs(c - r) < 0.005));
  return shared ? null : { claimed, requested };
}

function money(values: number[]): string {
  return values
    .map((v) => `$${v.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`)
    .join(", ");
}

export function amountMismatchWarning(mismatch: AmountMismatch): string {
  return (
    `The amount recorded as claimed (${money(mismatch.claimed)}) is different from the amount in the ` +
    `outcome you asked for (${money(mismatch.requested)}). Confirm which figure is correct.`
  );
}

/**
 * Reads both answers from the raw intake text by their labels, as
 * detectOverLimitClaimAmount does. The labels are the ones buildRawUserText()
 * writes (smallClaimsIntelligenceEngine.ts); verifyAmountConsistency runs that
 * real builder, so a renamed label fails a suite rather than silently turning
 * this check off.
 */
export function detectClaimedVersusRequestedMismatch(rawUserText: string): AmountMismatch | null {
  const lines = String(rawUserText || "").split(/\r?\n/);
  const valueAfter = (label: string) => {
    const line = lines.find((entry) => entry.toLowerCase().startsWith(label));
    return line ? line.slice(label.length) : "";
  };
  return claimedVersusRequestedMismatch(
    valueAfter("amount claimed or disputed:"),
    valueAfter("goal / requested outcome:"),
  );
}
