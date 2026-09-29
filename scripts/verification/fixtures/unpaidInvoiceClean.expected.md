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
- `disputeCategory: "unpaid-money"` — a design-services agreement, unpaid (was `work-or-services`; see note below).
> **Changed 2026-09-28.** The narrator here did the work and was not paid, so the predicted
> category is now `unpaid-money`, and the scripted answer to `sc-orient-dispute-category` is
> "Unpaid money owed to you". `extractIntakeFacts.ts` now has a fixed category list in which
> `work-or-services` means work the narrator PAID FOR. The two contractor questions
> (`sc-contractor-completion-date`, `sc-contractor-notice-before-replacement`) are addressed to a
> contractor's customer ("before hiring anyone else to finish...") and are gated on
> `role == plaintiff` AND `disputeCategory == work-or-services`, so they are no longer asked here.
> This fixture's own scripted answer to the second one was "Not applicable -- I completed and
> delivered the work myself", which is the defect. Found by the story review battery.

- `claimFiled: false` — the story states explicitly: "I haven't filed anything with the court yet."

## 3. Questions expected to be selected

Traced by hand through `selectQuestions.ts`'s `appliesWhen` evaluation against the facts in §2,
against the real 15-question `QUESTION_BANK` (all `status: "reviewed"`):

**Expected to be asked** (8, in phase order — orientation, then substance, then sensitive):
1. `sc-orient-when-happened`
2. `sc-orient-role`
3. `sc-orient-dispute-category`
4. `sc-amount-claimed`
5. `sc-claim-filed` (`appliesWhen: role == "plaintiff"` — true)
6. `sc-evidence-available`
7. `sc-remedy-sought`
8. `sc-safety-check`

(`sc-contractor-completion-date` and `sc-contractor-notice-before-replacement` were 6 and 7
until 2026-09-28; see §2.)

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
