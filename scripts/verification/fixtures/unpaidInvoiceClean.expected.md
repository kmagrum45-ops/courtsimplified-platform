# Expected: unpaid-invoice-clean

Written before the runner exists or has been run against this fixture. Predictions grounded in
reading the real code this session (`claimTypeMatcher.ts`, `questionBank.ts`'s `appliesWhen`
conditions, `claimTypes.ts`'s `sc-claim-unpaid-debt-services` entry, `courtSimplifiedBrain.ts`'s
`detectOverLimitClaimAmount`), not guessed.

## 1. Claim type match

**Expected: `sc-claim-unpaid-debt-services`** ("Unpaid debt or non-payment for services").

Verified deterministically before writing this file — `matchClaimType()` is pure keyword
substring matching, no AI, so this is not a prediction subject to model variance. Ran the real
function against this fixture's exact story text: it matches on the signal phrase `"unpaid
invoice"`, which the story contains verbatim ("This is an unpaid invoice"). No other `ClaimType`
signal phrase appears in the story.

## 2. Facts the opening story should let the AI extract

These ARE subject to model variance (`extractIntakeFactsWithConfidence` is a real GPT-4o-mini
call) — stated as the well-grounded prediction, not a guarantee:
- `role: "plaintiff"` — the narrator is the one who performed the work and wasn't paid, considering suing.
- `disputeCategory: "work-or-services"` — a design-services agreement, unpaid.
- `claimFiled: false` — the story states explicitly: "I haven't filed anything with the court yet."

## 3. Questions expected to be selected

Traced by hand through `selectQuestions.ts`'s `appliesWhen` evaluation against the facts in §2,
against the real 15-question `QUESTION_BANK` (all `status: "reviewed"`):

**Expected to be asked** (10, in phase order — orientation, then substance, then sensitive):
1. `sc-orient-when-happened`
2. `sc-orient-role`
3. `sc-orient-dispute-category`
4. `sc-amount-claimed`
5. `sc-claim-filed` (`appliesWhen: role == "plaintiff"` — true)
6. `sc-contractor-completion-date` (`appliesWhen: disputeCategory == "work-or-services"` — true)
7. `sc-contractor-notice-before-replacement` (same condition)
8. `sc-evidence-available`
9. `sc-remedy-sought`
10. `sc-safety-check`

**Expected NOT to be asked** (5, all correctly gated out given no claim has been filed and this
isn't a defamation matter):
- `sc-defamation-publication-details` (`disputeCategory == "defamation"` — false)
- `sc-defendant-served` (`claimFiled == true` — false)
- `sc-defence-filed` (`claimServed == true` — false, `claimServed` never set)
- `sc-defence-time-elapsed` (requires `claimServed == true` — false)
- `sc-defendant-noted-in-default` (requires `claimServed == true` — false)

## 4. Evidence-to-element mapping

`sc-claim-unpaid-debt-services` has 3 `plaintiffElements`, each with named `evidenceCategories`.
This fixture's evidence maps cleanly onto all three:

| Element | Evidence category | Fixture item |
|---|---|---|
| `existed-agreement-or-understanding` | "Written agreement or contract" | `service-agreement-signed.pdf` |
| `services-or-money-provided` | "Proof the work or service happened" | `delivery-email-thread.pdf` |
| `amount-unpaid` | "Invoice or statement of account" | `invoice-2026-014.pdf` |

`demand-letters.pdf` doesn't map to a named element category but is generally relevant supporting
material (evidence the plaintiff pursued payment before suing).

**Expected: no significant evidence gap flagged** for any of the 3 formal elements — all three
are directly evidenced. Any `missingEvidence`/`evidenceIssueLinks` entry the AI-driven final
analysis produces for THIS fixture should be reviewed skeptically as a possible false positive,
not assumed correct, since the fixture is deliberately complete.

## 5. What should NOT fire: the over-limit warning

`courtSimplifiedBrain.ts`'s `detectOverLimitClaimAmount()` fires when the claimed amount exceeds
Ontario's Small Claims Court limit. **Not expected here** — $8,400 is well under the limit.

Legal citation for the limit itself (asserted here since the "no warning" expectation depends on
knowing what the threshold actually is): Small Claims Court's monetary jurisdiction is **$50,000**
(excluding interest and costs), effective October 1, 2025. Source: ontario.ca — "Suing someone in
Small Claims Court" (https://www.ontario.ca/page/suing-someone-small-claims-court), verified by
direct fetch 2026-09-08: "Effective October 1, 2025, the monetary jurisdiction of Small Claims
Court will increase from $35,000 to $50,000."

## 6. Turn-scoped guided-conversation `evidenceGuidance` — a known limitation, not a fresh finding

`evidenceGapDetector.ts`'s `detectEvidenceGaps()` (surfaced turn-by-turn via `orchestrateIntakeTurn`'s
`evidenceGuidance`) is turn-scoped, not accumulated — it only evaluates the CURRENT turn's free
text, per its own file header. The opening story (turn 1) is the only turn in this fixture likely
to produce a fresh claim-type match (see §1), so any `evidenceGuidance` the runner captures should
be read against turn 1's story text only, not the later detailed evidence-list answer to
`sc-evidence-available` (a later turn, separately matched or not). This is an already-documented
architectural property, not something this fixture discovers for the first time — noted here so a
"missing" `evidenceGuidance` signal on the evidence-answer turn isn't misread as a bug.
