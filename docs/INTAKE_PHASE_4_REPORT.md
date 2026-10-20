# CONTROL STATE CHECKPOINT

Phase 4: unified guidance presentation and confirmation enforcement.

Local implementation only, preserving the inspected Phase 1–3 working tree on `fix/basic-limitation-warning-qualifier` at `2c6e4a1`. No branch switch, staging, commit, push, merge, database migration or deployment is authorized or performed. Unrelated `.claude/` files are untouched.

## Result and architecture

The intended sequence is now story → essential questions → editable review → explicit confirmation → verified procedural guidance. Completing an analysis, selecting a court, saving a case and exhausting a question selector do not confirm intake.

The root cause was independent generation and display decisions: the home understanding card rendered stage answers, builder submissions generated full analysis, restored results and case workspaces trusted older completion values, and downstream APIs could produce guidance without checking explicit review. Hiding one panel could not enforce the boundary.

The existing `workflowStatus.intakeCompleted` and Phase 3 `intakeReview` provenance remain authoritative. `confirmedIntakeRevision` validates that provenance against the selected case, court and current checkpoint input revision. `guidanceInputRevision` identifies which confirmed input produced saved guidance; it records freshness, not a second completion state. The HTTP wrapper and UI consume the same policy. No second engine, case store, question selector or workflow was introduced. The canonical Brain → migration → MasterCase → assembly → specialized court intelligence chain is unchanged.

Material edits invalidate confirmation and withhold previously generated guidance. New analysis clears affected generated case-picture/stage selections when their input revision changes, while preserving unrelated canonical fields, stored documents, evidence, drafts and recorded dates. Legacy `intakeCompleted: true` alone never establishes explicit confirmation. Legacy cases must review, confirm and regenerate before case-specific guidance is shown; their records are retained.

The existing question banks and Family/Civil field selectors supply the remaining essential questions. Review lists them and requires an answer or an explicit “I do not know yet” acknowledgement for each before confirmation. Unknown facts remain unknown. Optional evidence/research does not block review, confirmation or the existing post-confirmation generation action. Stable, reversible unknown checkboxes avoid disappearing controls and keyboard/focus problems.

## Presentation and API boundaries

Home shows factual clarification and initial questions rather than full checked answers, stage procedures or research. Intake-only options reuse the existing understanding/orchestration functions while skipping full guidance generation. Initial factual extraction and court-category clarification may still use authenticated AI.

Builder, case layout, dashboard and case-specific forms use the same confirmation/freshness policy. The broad case-layout gate also covers nested case pages. Public guides and the unselected general forms catalogue remain available. Factual evidence and documents remain stored; their factual storage endpoints do not require procedural confirmation. The case-workspace UI itself stays gated until current guidance is generated.

The shared server wrapper checks authenticated ownership, selected case ID, court and confirmation before invoking a handler; it rechecks the current revision before returning the result. Full analysis submissions must supply the captured input revision. Downstream guidance additionally requires a current saved analysis. Responses are private and not cacheable. A stale response cannot restore visible guidance after another tab changes initial facts. Case-reader persistence also checks its captured revision. Existing write queues and conflict protections remain in use.

Protected HTTP surfaces:

- Analysis: `small-claims/analyze`, `family/analyze`, `civil/analyze` POST.
- Case guidance: `case/stage-answer`, `case/resolve-stage`, `case/review`, `case/read`, `case/strategy`, `assistant/law`, `guided-assistant`, `generate-form`, `rules/procedures` POST.
- Optional post-confirmation research: `intake/depth-turn`, `intake/sourced-questions` POST.
- Document interpretation: `workspace/documents/analyse`, `workspace/documents/decision-help` POST.
- Procedural exports: `workspace/export` GET; `workspace/exhibit-book` GET/POST.
- Recommendations and workflow: `cases/form-applicability` GET/PATCH; `cases/events` GET; `cases/chat` GET/POST; `workspace/organisation` timeline GET. Factual event writes, chat deletion and non-timeline organisation views retain their existing boundaries.

Case-record responses redact generated guidance while confirmation or generation is stale, without deleting the saved record. The guided assistant obtains selected-case memory from the owned server record rather than accepting an arbitrary client case-memory object. The complete 38-route API inventory is covered by the new offline guard: any new route must be classified explicitly.

Initial understanding, court/claim clarification, safety, wording help, general provision explanations, factual case/document storage and site access are outside the completion gate. Their existing validation/security boundaries still apply. Paid initial AI, wording and explanation routes require server-verified authentication. Request-local authentication caching and small case-identity projections avoid repeated token verification and downloading complete case records merely to check the gate. There are two small ownership/revision reads around protected work; latency against live infrastructure has not been measured.

## Safety and urgent information

Existing urgent municipal warnings are clearly labelled and accessible during collection/review. Their answer uses the existing case/owner/flow-scoped checkpoint rather than a separate unscoped session key. Pure notice-answer helpers moved into the existing content-library module; legal wording and citations did not change.

The safety audit found an older endpoint explicitly permitting anonymous paid AI, contrary to the supplied repository standing rule. Paid classification now requires server-verified authentication but does not require intake confirmation. Fixed existing emergency/support resources are available in the shared intake panel without authentication, confirmation or AI; the general disclosure omits the classifier-specific statement that intake cannot continue. An unavailable classification is not described as proof of safety. The shared safety helper still fails open rather than trapping intake on a network fault. Existing per-court responses to an actual classified warning remain unchanged. Form review itself does not wait for a paid safety classification; the existing pre-analysis classification remains, and guided turns retain their safety checks.

## Court finder

“Not sure which one?” retains its existing classification logic. It now has an explicit “Review possible court paths” submit action, a focused accessible missing-answer summary, linked invalid fields and preserved entered values on validation failure. Results are withheld until valid submission and hidden again after editing. All three existing court handoffs preserve the existing province/city/story transfer. No new court-identification engine or browser draft store was added. Refresh recovery for the standalone finder questionnaire remains outside this change; validation failure recovery and builder handoff are covered.

## Missing-module fixture guard

The missing `explainQuestion.ts` was deliberately deleted in commit `1ea1f87` when explanations moved to the verified question library. The guard was stale. It now verifies exact bank-provided explanation/source values, unknown-question handling, and an AST property that question-help components do not fetch/generate explanations or establish independent asynchronous races. Existing write, timeout, fallback, safety and voice guards remain. The suite passes; no guard was deleted and no removed model module was restored.

## Verification

All checks ran sequentially on the existing installation; no dependencies were installed.

**54 distinct browser scenarios passed.** The combined Phase 1–4 run passed 41 scenarios and stopped on three assertions that expected the later confirmation-write error while an earlier queued unknown-answer save was intentionally failing; three remaining scenarios had not run. After making the fixture wait for the earlier answer saves, all 14 review scenarios passed. Seven existing CI front-door/privacy scenarios also passed across their run and the two corrected account-fixture reruns. A final four-scenario gate/public-information rerun passed after lint fixes.

The existing front-door tests were adapted to the approved experience: date provenance and the written-admission deadline qualifier are asserted on an explicitly confirmed case, with no dates panel during initial intake. The assertions were retained, using the existing stage renderer rather than a second deadline implementation. Two old privacy fixtures used incomplete synthetic session tokens and hung during authentication; they now reuse the same offline account transport as the recovery tests. The finder privacy tests use the new explicit completion action.

```text
npx.cmd playwright test tests/browser/intake-review.spec.ts tests/browser/intake-recovery.spec.ts tests/browser/intake-reliability.spec.ts tests/browser/family-civil-intake-reliability.spec.ts tests/browser/intake-guidance-gate.spec.ts --workers=1 --max-failures=3
npx.cmd playwright test tests/browser/intake-review.spec.ts --workers=1 --max-failures=1
npx.cmd playwright test tests/browser/case-understanding-continuity.spec.ts tests/browser/intake-reset.spec.ts --workers=1 --max-failures=2
npx.cmd playwright test tests/browser/intake-reset.spec.ts --grep 'signed-in' --workers=1 --max-failures=1
npx.cmd playwright test tests/browser/intake-guidance-gate.spec.ts --grep 'confirmation gates generation|Urgent verified notice' --workers=1 --max-failures=1
```

Three-area browser coverage includes collection/review withholding, confirmed generation, material edits, refresh before and after confirmation, legacy records, saved document/evidence retention, dashboard/case-form gates, finder validation/handoff, interruption, unsent text, failed saves/retry, stale requests and same-flow guest privacy. Family and Civil each retain independent duplicate-submission, timeout and stale-safety-response regressions. The new full-analysis-after-edit browser regression is Small Claims; late-response server policy is independently tested for all three courts offline.

**23 distinct offline suites passed**, through their existing `node --import tsx` entry points:

- `test:intake-guidance-gate`, `test:intake-review`, `test:intake-recovery`, `test:fixture-guards`.
- `test:small-claims`, `test:three-area`, `test:forms-case-isolation`.
- `test:guided-form-chat`, `test:select-questions`, `test:intake-sequencing`, `test:intake-coverage`.
- `test:intake-requests`, `test:no-stale-intake`, `test:builder-persistence`, `test:case-write-queue`, `test:case-load-restore`, `test:case-reader`.
- `test:classifier-gating`, `test:story-answer-proposals`, `test:mount-conditions`, `test:municipal-notice-first`, `test:ai-route-contract`, `test:safety-coverage`.

The municipal suite initially failed importing an authenticated client through a UI helper, then its source-scanning assertions failed on Windows line endings. Pure helpers now live in the existing library, and the guard normalizes line endings before examining the same branches. Its complete rerun passed; warning assertions and legal content were not removed. The final HTTP gate rerun passed, including actual anonymous analysis, stage-answer and safety handler refusals, all three ownership/revision policies and the complete API inventory.

There is no `test:case-isolation` package script. Existing `test:forms-case-isolation`, the three-area contract and the new recovery/review/guidance ownership checks cover the relevant boundaries without inventing another script.

**TypeScript passed:** `npx.cmd tsc --noEmit --pretty false`. An earlier attempt stopped on trailing malformed data in generated `.next/dev/types/routes.d.ts`; the normal production build regenerated build artifacts, and the exact standalone command subsequently passed. No source-type check was suppressed and no generated guard was deleted.

**Production build passed:** `npm.cmd run build`, with a process-local 4096 MB Node heap cap restored afterward, including all 340 static pages. A read-only process inspection found no running Next development server before building. The first sandboxed build failed fetching the existing Google Fonts; the permitted rerun fetched them and passed. Existing middleware deprecation and optional missing `published/genericAnswers.published.json` warnings remain. Browser runs also report the existing multiple Supabase-client warning from FormsWorkspace and smooth-scroll notice; these were not broadened into unrelated architectural work.

The required suite index regenerated successfully: **154 suites documented, 28 without a header**, the same undocumented count as Phase 3. Final tracked diff and new-file whitespace checks passed; the index is empty.

### Lint comparison

Focused ESLint covered the 92 source/test files in the combined task scope. Before/current contents were compared under the same file configuration, with rule ID and source-line matching independent of shifted line numbers. The captured start snapshot replaced non-ASCII characters during PowerShell serialization; matching normalizes those characters consistently rather than mistaking unchanged punctuation for a new finding.

**Expanded baseline: 41. Current: 40 (24 errors, 16 warnings). New findings: zero.** One inherited municipal component finding disappeared when its unscoped effect-backed answer state was replaced with the existing scoped checkpoint. The new findings detected during development were fixed and lint was rerun; no lint rule was disabled to conceal them. Full lint remains nonzero because inherited debt is present.

The historical 24 findings and seven focused warnings covered different Phase 1 scopes. Phase 2 expanded that baseline to 25 and reduced it to 19; Phase 3 kept those 19. Phase 4 additionally touches case layout, case-file/forms and other previously uncounted existing files, so its comparable baseline is 41 rather than 19. The focused Family/Civil intake scope still has **six warnings** (Civil four, Family two) and zero errors. These counts are not presented as a full-repository lint cleanup.

Browser tests use synthetic authentication/case transport and mocked HTTP analysis responses produced through the existing offline canonical engines. They do not mutate production records or prove live Supabase RLS, real-AI quality or legal accuracy.

## Release prerequisites and compatibility

- Run the paid `npm run test:fixtures` suite before shipping, including its three whole-case Small Claims fixtures; review actual versus expected output rather than blindly regenerating expectations.
- Run `npm run test:safety-regression` against real AI. Offline coverage verifies wiring/authentication, not classifier accuracy.
- Run configured-provider integration with `RUN_REAL_AI_INTEGRATION=1 npm run test:ai-real-integration`; its existing coverage is Small Claims, not three independent paid court-area tests.
- Complete authenticated staging walkthroughs for Small Claims, Family and Civil with real AI and the new review/confirmation sequence. The older paid walkthrough driver assumes earlier navigation and lacks confirmation, so it must be adapted before its output can be treated as acceptance evidence. The old full-answer understanding evaluator also needs intake-only expectations before it is an appropriate front-door oracle.
- No schema migration is required; metadata is additive JSON. Older open clients should refresh before rollout because they do not understand the new confirmation/guidance metadata or required API case/revision headers. Direct callers of protected endpoints need selected-case identity and current confirmation; full analysis callers also need the revision header.
- Guest progress retains existing same-tab/exact-flow privacy restrictions. Case-specific AI guidance requires signing in and successfully saving/reviewing the owned case. No shared browser drafts or new persistent guest storage were introduced.
- Existing inherited lint debt and framework warnings are reported separately below. No legal text/citations or generated legal registries were changed; software verification does not establish legal accuracy.

## Changed files and Git status

Previously uncommitted Phase 1–3 work remains uncommitted and is not overwritten. Branch `fix/basic-limitation-warning-qualifier` and HEAD `2c6e4a1` are unchanged. The index is empty. Unrelated `.claude/` remains untouched. No deployment or real case/database mutation was performed. Stopped after Phase 4 for approval; paid fixtures and staging verification remain release prerequisites.

The following inventory identifies Phase 4 differences against the inspected starting working tree; it excludes unchanged inherited files. Broad file coverage reflects a single shared policy applied at existing API/UI boundaries, not additional engines.

- `.github/workflows/courtsimplified-ci.yml`
- `app/_components/CaseUnderstandingCard.tsx`
- `app/_components/ExplainProvision.tsx`
- `app/_components/HomeLocationGate.tsx`
- `app/_components/IntakeRecovery.tsx`
- `app/_components/IntakeReviewPanel.tsx`
- `app/_components/NotSureCourtGuide.tsx`
- `app/api/assistant/law/route.ts`
- `app/api/case/read/route.ts`
- `app/api/case/resolve-stage/route.ts`
- `app/api/case/review/route.ts`
- `app/api/case/stage-answer/route.ts`
- `app/api/case/strategy/route.ts`
- `app/api/case/understand/route.ts`
- `app/api/cases/chat/route.ts`
- `app/api/cases/events/route.ts`
- `app/api/cases/form-applicability/route.ts`
- `app/api/cases/route.ts`
- `app/api/civil/analyze/route.ts`
- `app/api/classify-court-path/route.ts`
- `app/api/family/analyze/route.ts`
- `app/api/generate-form/route.ts`
- `app/api/guided-assistant/route.ts`
- `app/api/intake/classify-claim-type/route.ts`
- `app/api/intake/depth-turn/route.ts`
- `app/api/intake/guided-turn/route.ts`
- `app/api/intake/safety-check/route.ts`
- `app/api/intake/sourced-questions/route.ts`
- `app/api/intake/tidy-wording/route.ts`
- `app/api/law/explain/route.ts`
- `app/api/rules/procedures/route.ts`
- `app/api/small-claims/analyze/route.ts`
- `app/api/workspace/documents/analyse/route.ts`
- `app/api/workspace/documents/decision-help/route.ts`
- `app/api/workspace/exhibit-book/route.ts`
- `app/api/workspace/export/route.ts`
- `app/api/workspace/organisation/route.ts`
- `app/builder/_components/CivilIntake.tsx`
- `app/builder/_components/CourtAssistantChat.tsx`
- `app/builder/_components/FamilyIntake.tsx`
- `app/builder/_components/FamilyStatusTriage.tsx`
- `app/builder/_components/GuidedFormChat.tsx`
- `app/builder/_components/GuidedSmallClaimsIntake.tsx`
- `app/builder/_components/MunicipalNoticeFirst.tsx`
- `app/builder/_components/ProcedureAuthorityDisplay.tsx`
- `app/builder/_components/SmallClaimsIntake.tsx`
- `app/builder/_components/SourcedQuestions.tsx`
- `app/builder/_components/StageAnswerPanel.tsx`
- `app/builder/_components/TidyWordingReview.tsx`
- `app/builder/_components/guidedFields.ts`
- `app/builder/page.tsx`
- `app/cases/[id]/case-file/page.tsx`
- `app/cases/[id]/forms/page.tsx`
- `app/cases/[id]/layout.tsx`
- `app/dashboard/page.tsx`
- `app/forms/FormsWorkspace.tsx`
- `docs/INTAKE_PHASE_4_REPORT.md`
- `docs/VERIFICATION_SUITES.md`
- `package.json`
- `scripts/verification/verifyFixtureHarnessGuards.ts`
- `scripts/verification/verifyIntakeGuidanceGate.ts`
- `scripts/verification/verifyIntakeRecovery.ts`
- `scripts/verification/verifyIntakeReview.ts`
- `scripts/verification/verifyMunicipalNoticeFirst.ts`
- `scripts/verification/verifySafetyPassCoverage.ts`
- `scripts/verification/verifyThreeAreaContract.ts`
- `src/lib/case-system/intake/claimTypeSuggestionResolution.ts`
- `src/lib/case-system/intake/clientSafetyCheck.ts`
- `src/lib/case-system/intake/orchestrateIntakeTurn.ts`
- `src/lib/case-system/intakeReview.ts`
- `src/lib/case-system/understanding/understandCase.ts`
- `src/lib/content-library/municipalNoticeFirst.ts`
- `src/lib/security/intakeGuidanceGate.ts`
- `src/lib/supabase/serverAuth.ts`
- `tests/browser/case-understanding-continuity.spec.ts`
- `tests/browser/family-civil-intake-reliability.spec.ts`
- `tests/browser/harness/intakeReview.ts`
- `tests/browser/harness/syntheticIntakeAccount.ts`
- `tests/browser/intake-guidance-gate.spec.ts`
- `tests/browser/intake-recovery.spec.ts`
- `tests/browser/intake-reset.spec.ts`
- `tests/browser/intake-review.spec.ts`
