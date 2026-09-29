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
- `disputeCategory: "unpaid-money"` (handyman deck-repair work, unpaid; was `work-or-services`, see
  `unpaidInvoiceClean.expected.md` §2 note)
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
exact date," both in the opening story and again when answering `sc-orient-when-happened`
(`sc-contractor-completion-date` is no longer asked of someone owed payment; 2026-09-28). **Expected: this should surface somewhere as an unconfirmed/
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

## 8. Independent review (2026-09-23): model prose removed from three more fields

`*.actual.md` was regenerated again. Three fields went empty or shorter, and
this is the intended change, not a regression.

An independent reviewer — given only the LSO policy, the seven regulator
questions, the original audit and the branch diff — found that §7's fix was
incomplete. The "What to do next" heading had been converted to catalogue text,
and three sibling fields were still carrying model prose to a user by routes
nobody had walked:

| Field | Where it reached a user |
|---|---|
| `missingEvidence` | `buildSummary()`'s "Evidence to gather" heading — **three lines above** the heading that was fixed — then `analysis.summary` → `CaseContext.summary` → `documentGenerationEngine.ts:105` → the document body |
| `missingInformation` | `documentGenerationEngine.ts:91`, `baseWarnings()` |
| `risksAndGaps` | `app/api/document-export/route.ts:151`, the "Risks and gaps" section of a downloaded package |

The same reviewer found `IntelligenceOverviewPanel` rendering a model-written
question ("What to confirm next") on the main builder screen, unguarded.

All three fields are assembled once, in `smallClaimsIntelligenceEngine.ts`, so
the model's contribution is now stripped there rather than at each render site
— the render sites were how the first fix came to be partial.

**What the diff shows:**

- `missingEvidence: []` and `risksAndGaps: []`. Empty rather than substituted:
  there is no reviewed catalogue of risk or evidence-gap wording to select
  from, and a risk statement about a specific case sits close to CLAUDE.md §3's
  line anyway. The panel still shows "Evidence to organize or confirm" from the
  claim-type catalogue, which is reviewed library content with source links, so
  the capability is not lost on the surface where it belongs.
- `missingInformation` keeps only its deterministic entries — does the intake
  have a name, an address for service, a claim amount — plus the fixed defence
  question.
- The summary's heading changed from "Evidence to gather" to "Evidence
  recorded" and now always shows what the user typed. It used to *prefer* the
  model's list and fall back to the user's words; the preference was backwards.

None of this is lost for supervision. The model's version is still carried on
`analysis.intelligence`, which is what the audit log records.

Asserted by `npm run test:no-model-prose`, which checks the assembly point
rather than the rendered document — the property that makes every downstream
consumer safe, including ones added later.

## Decision 5 — the seven date questions, and why none of them is asked here

`QUESTION_BANK` gained seven optional date questions, one for each event the
stage map counts a deadline from that a person can simply report: the date the
claim was served, the date on the issued claim, the date a defence was filed, the
date a defendant's claim was served, the settlement conference date, the date the
reader learned of a noting in default, and the date they learned of a judgment
made at a hearing they missed. They exist so the deadline engine — which until
now had no production caller at all — can show a person their actual date with
the counting shown, instead of leaving them to apply "20 days" across a weekend.

**Expected to be asked here: none of the seven.** This fixture is a pre-filing
story: nothing issued, nothing served, no defence. Each question is gated on the
procedural fact that makes it answerable (`claimFiled`, `claimServed`,
`defenceFiled`), and the two side-specific ones on `role` as well, so all seven
gate out and the turn count is unchanged.

That is the expected behaviour, and it is the behaviour only after a correction
the fixture run forced. Ungated, the seven were asked of all three fixtures:

- every story went from 11 turns to 18, being asked about default judgments and
  settlement conferences in a case that did not exist yet, and
- all three picked up `possibleCorrections: role "plaintiff" -> "defendant"`,
  because the extractor reads the transcript and a plaintiff answering questions
  about being served and being noted in default reads like a defendant.

The role correction was only ever *proposed* (CLAUDE.md §4 — nothing is applied
without the user), and the claim type and stage were right regardless. But a date
question nudging the reader's own role toward the wrong answer is not a cost
worth paying for a date that, in a pre-filing case, does not exist. Hence the
gates. The "If…" phrasing stays on top of them, because the gates read
AI-extracted booleans that can be wrong.

The story answers all seven anyway — the harness requires every bank question to
have an answer — and each answer says the thing has not happened. Those answers
are not dates, and `parseUserDate` refuses anything that is not an unambiguous
one, so nothing is computed. The refusal is the point: "03/04/2026" is two
different days, and a deadline out by a month with a rule cited beside it is the
most credible wrong answer this product could give.

The computed-date path is therefore NOT exercised by these fixtures. It is
measured by `npm run eval:accuracy`, whose nine deadline cases now read the date
out of the rendered prose a reader sees, two of them through `renderStageAnswer`
and a real published block.

**On the summary wording in `.actual.md`:** the `intelligenceSummary` and
`structuredIntelligenceSummary` lines differ from the previous run in wording
only. Those are model output and §2 above already records them as subject to
variance. The structural record — questions asked, claim type matched, stage
derived, turn count — is identical to the run before these questions existed.

## 2026-09-29 — model upgrade (gpt-4o-mini → gpt-6.1-sol)

Re-run on the new models (src/lib/case-system/aiModels.ts). Every change in
`.actual.md` was reviewed and is accepted as correct; none touches a routing,
question-selection or stage decision this file asserts.

- **`claimServed` is no longer set.** gpt-4o-mini wrote `claimServed: false`
  from a story that never mentions service; the new model leaves it unset. This
  file already expects it *never set*, so the new behaviour matches it more
  closely. Every question gated on `claimServed == true` stays unselected either
  way.
- **Summary and warning wording is more careful.** Documents are now described
  as "reported" / "described, contents not reviewed" rather than listed as if
  verified. That is closer to the information-not-advice rule, not further.

- **`detectedIssues` / `detectedClaimTypes` add `contract` alongside `debt`.**
  The story is an agreement for services with an unpaid balance; tagging both is
  a more complete label. Labels here are navigation, not an assessment.
