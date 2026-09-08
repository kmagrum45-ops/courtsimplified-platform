# Expected: over-limit-contract (WRONG-FORUM)

Written before the runner exists or has been run against this fixture.

## 1. Claim type match

**Expected: `sc-claim-unpaid-debt-services`**, same as the other two fixtures. Deliberately kept
identical in claim shape so the ONLY substantive variable this fixture changes is the dollar
amount — isolating whether the over-limit behavior fires because of the amount specifically, not
because the underlying claim pattern differs. Verified deterministically before writing this
file: the story contains the signal phrase `"unpaid invoice"` verbatim, confirmed by directly
running `matchClaimType()` against this exact text.

## 2. Facts the opening story should let the AI extract

Same prediction and caveat as the other two fixtures:
- `role: "plaintiff"`
- `disputeCategory: "work-or-services"` (a signed catering-services contract, unpaid balance)
- `claimFiled: false`

## 3. Questions expected to be selected

**Identical set to `unpaid-invoice-clean`** — same predicted facts, same `appliesWhen` trace. See
that file's §3 for the full list. Not repeated here.

## 4. The forum-boundary question this fixture actually tests

This engine (`analyzeSmallClaimsWithBrain`) is Small-Claims-specific — it does not reroute a case
to a different court or refuse to process it. What it CAN do, and what this fixture tests, is
whether it correctly WARNS that Small Claims Court may not have jurisdiction over this amount.
That's the real, achievable behavior for this pipeline; an expectation that the system "redirects"
the user somewhere else would be testing for behavior this code doesn't attempt.

**Legal fact being asserted, with a fresh citation** (not reused from memory of an earlier
session's sourcing): Ontario Small Claims Court's monetary jurisdiction is **$50,000**, excluding
interest and costs, effective October 1, 2025. Source: ontario.ca — "Suing someone in Small Claims
Court" (https://www.ontario.ca/page/suing-someone-small-claims-court), verified by direct fetch
2026-09-08: "Effective October 1, 2025, the monetary jurisdiction of Small Claims Court will
increase from $35,000 to $50,000." This fixture's claimed amount, $68,500, exceeds that limit by
$18,500.

**Expected: `AnalysisResult.userWarnings` (and/or `intelligenceWarnings`) should contain a warning
that the claimed amount exceeds the Small Claims Court limit and that the Superior Court of
Justice should be considered.**

This isn't a guess at wording — read directly in `courtSimplifiedBrain.ts` this session:
`detectOverLimitClaimAmount()` scans `rawUserText` for a line containing `"amount claimed or
disputed:"` (which `buildRawUserText()` in `smallClaimsIntelligenceEngine.ts` always produces from
`input.amountClaimed`), extracts the dollar figure, and if it exceeds `ONTARIO_SMALL_CLAIMS_LIMIT`
pushes exactly this string into `systemWarnings` (which maps to `AnalysisResult.userWarnings`):

> "Claim amount $68,500 exceeds the Ontario Small Claims Court limit of $50,000; Small Claims
> Court may not have jurisdiction and the Superior Court of Justice should be considered."

For this to fire, `input.amountClaimed` needs to actually be `"$68,500"` — that depends on the
Session 30 direct-capture pipeline (`sc-amount-claimed`'s answer being captured verbatim into
`amountClaimedText`, then read by `guidedIntakeToSmallClaimsInput.ts` into `amountClaimed`)
working correctly end to end. If the warning does NOT fire, the runner's `.actual.md` should
record what `input.amountClaimed` actually resolved to, so a mismatch here can be traced to
either the capture step or the warning-detection step, not left ambiguous.

## 5. Evidence-to-element mapping

Same 3 elements as the other two fixtures (see `unpaidInvoiceClean.expected.md` §4 for the table).
This fixture's evidence is complete, same as the clean fixture — `catering-contract-signed.pdf`
(written agreement), `delivered-invoices.pdf` (proof services were performed / invoice), and
`cancellation-email.pdf` (supports the unpaid-balance fact). **Expected: no significant evidence
gap on the 3 formal elements** — evidence completeness isn't what this fixture is testing;
deliberately held constant so the amount is the only variable against the clean fixture.
