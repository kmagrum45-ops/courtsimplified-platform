# CONTROL STATE CHECKPOINT — Phase 3 intake review

Phase 3 only. Phase 1 and Phase 2 work was preserved. No staging, commit, push, branch switch, merge or deployment was performed. The working branch remains `fix/basic-limitation-warning-qualifier` at `2c6e4a1`. Unrelated `.claude/` work was left untouched.

## Authoritative state and behavior

Inspected the per-court home entry and understanding hand-off, builder location/mode routing, Small Claims form and guided intake, Family triage and chat/form intake, Civil chat/form intake, secondary Family support controls, saved-case recovery and dashboard entry. The completion error was the builder analysis-save payload setting `intakeCompleted: true`; question selectors and local question-complete flags had no explicit user-review provenance. Local selector-complete flags still describe question progress only.

`master_result.workflowStatus.intakeCompleted` remains the completion flag. Additive `workflowStatus.intakeReview` metadata records the reviewed input revision and, only after the user's explicit action, the confirmed revision and timestamp. Collecting, reviewing and user-confirmed are derived from that flag, provenance and the current input revision; there is no second persisted completion flag or case store.

AI analysis now records `intake-analyzed`, not user completion. Identification, case creation, selector exhaustion and analysis cannot set the completion flag. Only the explicit review transition can confirm the current initial information. The existing owned case row, write queue, updated-at conflict protection and authenticated owner/court filters carry these transitions.

The shared builder review panel presents existing answers in an editable summary. Text, numeric and boolean answers can be edited there; recorded list choices can be removed, and the original intake controls remain available for adding/changing choices. City is editable too. Confirmation requires an acknowledgement of the displayed revision, including unknown or missing information. Unknown facts are not invented.

Existing selectors distinguish the finite initial question list from later detail. Small Claims retains orientation, side, safety, amount, procedural status, relevant dates and requested outcome questions. Family and Civil retain their existing initial story/side/issues/status/date/outcome selectors, including applicable Family children information. Later evidence and additional detail remain available through existing controls. Users may stop initial questioning and review once a city and situation are recorded, explicitly acknowledging missing details; exhaustive evidence collection is not required to finish initial intake.

Material initial-fact changes advance an input revision and invalidate confirmation. Summary edits update the same underlying form state, rather than a separate draft. Review edits retain the review screen but clear its acknowledgement; edits after confirmation require a new review. Optional evidence changes do not pretend to be new initial facts. Stale response leases and full-analysis writes check input revisions, and stale reviewing tabs cannot confirm newer checkpoints.

Legacy completed cases keep their existing completion flag and unrelated workflow fields. Without new review provenance they are explicitly described as predating the new process, never as newly user-confirmed. New unfinished/reviewing cases reopen in the builder from the dashboard. Additive checkpoint metadata is backward compatible with Phase 2 checkpoints that lack `inputRevision`.

Authenticated review is restored from the owned case record. Guests use the existing exact-flow, tab-scoped session envelope only; no shared browser draft or persistent guest storage was added. Review performs no AI operation. Existing save deadlines, failure messages, recovery mechanisms and queue behavior are retained.

## Phase 3 changed files

This list is relative to the inspected Phase 2 working tree, not to `HEAD`, which also contains the uncommitted earlier phases.

| File | Phase 3 change |
|---|---|
| `src/lib/case-system/intakeReview.ts` (new) | Derived review state, existing-answer summary, material projection and revision-bound transitions |
| `src/lib/case-system/intakeCheckpoint.ts` | Additive input revision; owned queued review writes; atomic confirmation invalidation |
| `app/_components/IntakeRecovery.tsx` | Restore review metadata; revision leases; explicit transitions; summary-to-form subscriptions; reference synchronization |
| `app/_components/IntakeReviewPanel.tsx` (new) | Consolidated editable summary and explicit revision acknowledgement/confirmation |
| `app/builder/page.tsx` | Remove automatic completion; preserve workflow metadata; reject stale analysis writes; restore active intake mode |
| `app/dashboard/page.tsx` | Reopen new unconfirmed/reviewing cases in their own builder |
| `app/builder/_components/GuidedFormChat.tsx` | Use existing question metadata to stop after initial questions |
| `app/builder/_components/guidedFields.ts` | Mark Family/Civil initial questions without changing question/legal text |
| `src/lib/case-system/intake/selectQuestions.ts` | Initial-purpose filter on the existing reviewed/applicable question selector |
| `src/lib/case-system/intake/orchestrateIntakeTurn.ts` | Use that initial-purpose selector |
| `scripts/verification/verifyIntakeReview.ts` (new) | Three-area transitions, revisions, legacy cases, optional evidence and stopping rules |
| `scripts/verification/verifyIntakeRecovery.ts` | Owned review writes, stale confirmations and preservation regressions |
| `scripts/verification/verifyGuidedFormChat.ts` | Initial/optional and stopping assertions; synthetic offline browser-client setup; recoverable-mode assertion |
| `scripts/verification/verifyCaseLoadRestore.ts` | Retain recorded-city requirement while recognizing Phase 2 checkpoint precedence |
| `tests/browser/harness/syntheticIntakeAccount.ts` (new) | Extract the existing synthetic auth/case transport for reuse |
| `tests/browser/intake-recovery.spec.ts` | Reuse that harness; explicit legacy fixture for historical completed-result recovery |
| `tests/browser/intake-review.spec.ts` (new) | Three-area authenticated/guest review, refresh, confirmation, failure, stale-tab and legacy regressions; court finder inspection |
| `package.json`, `.github/workflows/courtsimplified-ci.yml` | Register offline review and browser regression checks |
| `docs/VERIFICATION_SUITES.md` | Required generated suite index |
| `docs/INTAKE_PHASE_3_REPORT.md` (new) | This report |

## Verification

Browser regressions passed: **38 distinct scenarios**. The combined Phase 1–3 run passed all 24 earlier scenarios and 10 new scenarios; three additional new tests correctly rejected stale confirmations but exposed a faulty assertion counting earlier mocked intake research. After changing that assertion to compare calls immediately before/after confirmation, all 13 review scenarios passed. The additional Small Claims guided-route summary edit/confirmation/refresh regression passed separately. No real AI or case writes were made by these synthetic browser tests.

Commands:

```text
npx.cmd playwright test tests/browser/intake-review.spec.ts tests/browser/intake-recovery.spec.ts tests/browser/intake-reliability.spec.ts tests/browser/family-civil-intake-reliability.spec.ts --workers=1
npx.cmd playwright test tests/browser/intake-review.spec.ts --workers=1
npx.cmd playwright test tests/browser/intake-review.spec.ts --grep "Small Claims guided route" --workers=1
```

Sixteen offline suites passed, run sequentially via their existing `node --import tsx` package-script entry points:

- `test:intake-review`, `test:intake-recovery`
- `test:small-claims`, `test:three-area`, `test:forms-case-isolation`
- `test:select-questions`, `test:guided-form-chat`, `test:intake-coverage`, `test:intake-sequencing`
- `test:intake-requests`, `test:no-stale-intake`
- `test:builder-persistence`, `test:case-write-queue`, `test:case-load-restore`
- `test:classifier-gating`, `test:story-answer-proposals` (stubbed model dependencies)

There is no `test:case-isolation` package script. The existing forms-isolation suite, three-area contract, and recovery/review owner/case/court tests were used instead.

`test:fixture-guards` was also run. Its earlier guards passed, then it failed reading missing `src/lib/case-system/intake/explainQuestion.ts`. The module is absent at `HEAD` too; neither that obsolete module nor the unchanged guard suite was modified to conceal the failure. The paid `test:fixtures` suite remains unrun and required before shipping.

`npx.cmd tsc --noEmit --pretty false` passed. `git diff --check` and whitespace checks on new Phase 3 files passed. The required suite index generation passed: 153 suites documented, 28 without headers; the undocumented count did not increase.

`npm.cmd run build` passed, including TypeScript and all 340 static pages, with process-local `NODE_OPTIONS=--max-old-space-size=4096` restored afterward. A read-only process check confirmed no development server was running beforehand; no user server was stopped. The first sandboxed attempt failed fetching existing Google fonts; the permitted outside-sandbox rerun fetched them and passed. Existing middleware deprecation and optional missing `published/genericAnswers.published.json` warnings remain. No fonts, environment files or generated legal registries were modified.

## Lint comparison

ESLint ran over the expanded Phase 1–3 source/test scope. Baseline contents came from the inspected Phase 2 working tree, with `HEAD` used for newly touched tracked files; new files had no baseline findings. Findings were matched by rule ID and source line independently of line-number movement.

**Phase 3 baseline: 19. Current: 19 (nine errors, ten warnings). New findings: zero.** New review modules and tests have zero findings. Full-scope lint remains nonzero because of inherited debt; it is not reported as clean.

The historical 24 findings were the larger Phase 1 scope; seven warnings were its narrower Family/Civil scope. Phase 2 expanded the historical baseline to 25 by including the dashboard and reduced it to 19. Phase 3 retains those 19 and the same six focused Family/Civil warnings. The comparison results were captured in the tool output; the production build clears temporary `.next` comparison files.

## Separate court-finder finding

The existing “Not sure which one?” questionnaire reaches its existing court chooser when all required fields are filled; the browser regression successfully chose Civil and reached its builder. The fully completed questionnaire dead-end was not reproduced. With the required “Has a case already started?” answer omitted, choices remain hidden without explaining the missing field. This standalone chooser also has no recoverable questionnaire checkpoint and transfers only its existing province/city/story hand-off. Those remaining usability/recovery concerns were not silently added to Phase 3.

## Remaining boundaries and compatibility risks

- Phase 4 guidance visibility is deliberately unchanged. Procedural information can still appear before confirmation; this phase establishes the state that the later presentation gate must consume.
- Previously generated analysis/evidence/documents remain on the record. Material edits invalidate intake confirmation and reject outdated incoming responses; this phase does not erase existing case work or introduce a new regeneration engine.
- No database migration is needed: metadata is additive JSON on the existing case record. Older open application tabs may not understand new provenance or preserve all metadata when performing old full-record writes. A later rollout should refresh such tabs. No rollout was performed.
- Verification uses synthetic auth/database/browser responses, not live RLS mutations, real production cases or a deployment. Software verification does not establish legal accuracy; no legal text or citations were changed.
- Guests retain progress only in the same tab and exact flow, under existing privacy restrictions. Clearing session storage, closing that browser session or changing accounts can remove guest recovery. Save failures remain visible; account recovery requires successful persistence.
- The billed real-AI fixture harness was not run: it requires external paid access and is required by `CLAUDE.md` before shipping intake changes. This local phase was not shipped; it remains a release prerequisite.

Final Git inspection: the branch and HEAD are unchanged, the working tree contains the preserved Phase 1/2 modifications plus the Phase 3 files listed above, and the index is empty. `.claude/` remains unrelated and untouched. Final tracked diff and new-file whitespace checks passed. Stopped after Phase 3 for approval. Nothing was committed, pushed or deployed.
