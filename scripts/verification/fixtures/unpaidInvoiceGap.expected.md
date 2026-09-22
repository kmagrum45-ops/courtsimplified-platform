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

## 7. LSO A2I rewrite (2026-09-22): `nextBestActions` and the two summaries are library text now

`*.actual.md` was regenerated on 2026-09-22 and three kinds of change appear in the diff. They are
separated here because only the first is a behaviour change, and absorbing all three silently is
exactly what §7 of CLAUDE.md forbids.

**(a) Intended — the model stopped writing procedure.** `nextBestActions` used to be model prose
("Complete and file the Small Claims Court Claim Form", "Prepare to present evidence of the
contract"). It is now the reviewed next-steps catalogue
(`src/lib/content-library/nextSteps.ts`), selected by pathway and stage, and the entries carry
their rules — Plaintiff's Claim (Form 7A) filing under r. 7.01(1) and (1.1), the six-month service
window under r. 8.01(2), and proof of service under r. 8.09.1. The model's only remaining role is
choosing the stage code, which the catalogue keys on.

**(b) Intended — the summaries stopped applying law to facts.** `structuredIntelligenceSummary`
used to read like advice: *"The claimant has a potential claim against [defendant] for breach of
contract and debt recovery. The signed services agreement and demand letters support the claim."*
That is the system applying a legal test to the user's facts, which CLAUDE.md §2's "who does the
applying" test puts on the wrong side of the line, and CLAUDE.md §3 forbids independently. Both
summaries are now assembled deterministically from what the user recorded: claim type, stage,
what is in the file, what is still missing. No conclusion is drawn.

**(c) Not a behaviour change — the file was stale.** Two kinds of diff are noise:

  - `evidenceGuidance this turn` moved from `addressed: … ; unaddressed: …` to `categories: …`.
    That split was removed from `evidenceGapDetector.ts` in Session 48; `pipelineRunner.ts` has
    printed one list ever since. The `.actual.md` files simply had not been regenerated.
  - `missingInformation`, `missingEvidence`, `risksAndGaps`, `possibleCorrections` and whether
    `defenceFiled` is extracted all shift run to run. These are still free-text model output on
    code this rewrite did not touch, and they are not pinned by any expectation in this file. A
    diff in them is not a signal.
