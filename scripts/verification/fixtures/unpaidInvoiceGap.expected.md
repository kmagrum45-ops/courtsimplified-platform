# Expected: unpaid-invoice-gap

Written before the runner exists or has been run against this fixture.

## 1. Claim type match

**Expected: `sc-claim-unpaid-debt-services`**, same as `unpaid-invoice-clean` — deliberately the
same kind of claim. Verified deterministically before writing this file: the story contains the
signal phrase `"unpaid invoice"` verbatim ("it's an unpaid invoice"), the same match mechanism as
the clean fixture, confirmed by directly running `matchClaimType()` against this exact text.

## 2. Facts the opening story should let the AI extract

Same prediction and same caveat (subject to real model variance) as `unpaid-invoice-clean.expected.md`:
- `role: "plaintiff"`
- `disputeCategory: "work-or-services"` (handyman deck-repair work, unpaid)
- `claimFiled: false` ("I haven't filed anything with the court yet")

## 3. Questions expected to be selected

**Identical set to `unpaid-invoice-clean`** — same facts in §2 produce the same `appliesWhen`
trace against `QUESTION_BANK`. See that file's §3 for the full 10-asked / 5-not-asked list; not
repeated here since the reasoning is identical. If this fixture's actual question set diverges
from the clean fixture's despite both extracting the same 3 facts, that divergence is itself a
finding worth flagging in STEP 4 — the two fixtures are deliberately built to test question
selection identically while varying evidence completeness.

## 4. Evidence-to-element mapping — the deliberate gap

Same 3 `plaintiffElements` as `unpaid-invoice-clean` (see that file's §4 table for the full
element/category list). This fixture's evidence is built to leave exactly one element thin:

| Element | Evidence category | Fixture item | Status |
|---|---|---|---|
| `existed-agreement-or-understanding` | "Written agreement or contract" / "Communication showing the understanding" | *(none — the deal was verbal only, over a phone call)* | **GAP** |
| `services-or-money-provided` | "Proof the work or service happened" | `deck-finished-photo.jpg` | covered |
| `amount-unpaid` | "Invoice or statement of account" | `invoice-final.jpg` | covered |

**Expected: the final AI-driven analysis (`missingEvidence` and/or `evidenceIssueLinks` on the
returned `AnalysisResult`) should identify the lack of anything written or otherwise documenting
the original agreement as a gap.** This is the one deliberately missing document the task asked
for — the fixture's own evidence answer states it explicitly ("I don't have anything in writing
showing the original agreement"), so the AI has the fact available in its input; the question is
whether the analysis actually surfaces it as an organized gap rather than only being present as
unstructured prose in the case story.

`plaintiffElements[0].plainExplanation` itself states the legal fact this expectation rests on: an
agreement "whether written, verbal, or based on the parties' conduct" can still support the claim
— so the correct system behavior is to flag the ABSENCE OF EVIDENCE for this element as a gap to
fill, never to say the claim itself is weak or unlikely to succeed without written proof (that
would cross into case-strength assessment, which CLAUDE.md §3 forbids). Source for the underlying
element already carries its own citation in `claimTypes.ts`:
https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/
(general balance-of-probabilities standard — not re-verified fresh this session since it's an
existing, already-sourced citation this fixture references, not a new legal claim this fixture's
expectations are asserting).

## 5. The uncertain date

The story states the completion date as "sometime in early spring 2026 -- I don't remember the
exact date," both in the opening story and again when answering `sc-orient-when-happened` and
`sc-contractor-completion-date`. **Expected: this should surface somewhere as an unconfirmed/
uncertain fact** (`missingInformation`, `risksAndGaps`, or equivalent) — CLAUDE.md §3's allowed
framing is exactly "this date is unconfirmed," which is what a correct system should produce here,
not a fabricated specific date and not silence.

## 6. What should NOT fire: the over-limit warning

Same as `unpaid-invoice-clean` — not expected. $3,200 is far under the $50,000 Small Claims limit
(same citation as that file's §5: ontario.ca, verified 2026-09-08).
