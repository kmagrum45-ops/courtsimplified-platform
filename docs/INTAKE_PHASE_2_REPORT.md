CONTROL STATE CHECKPOINT — Phase 2

Date: 2026-10-18. Status: implemented and verified locally; stopped for review.

## Scope and result

Reliable unfinished-intake persistence now covers Ontario Small Claims, Family, and Civil. Phase 1 request cancellation, retry, validation, and regression coverage remain in place. No intake confirmation gate was added. The procedural guidance components, legal content, citations, and completion decisions were not changed in this phase.

The existing `cases` record remains authoritative. The additive `master_result.intakeCheckpoint` holds recoverable UI answers and position; it is not another MasterCase, intake engine, workflow, or table. Completed analysis continues through the existing canonical pipeline and reuses the checkpoint's case ID.

Authenticated intake changes debounce for 400 ms. Before expensive intake operations, the latest state must be retained in the current tab and saved to the owned case. A failed save blocks that operation and offers retry. Case writes use the existing `runCaseWrite` queue and `updateMasterResult` compare-and-swap protection. Two checkpoint attempts, each with bounded requests, fit within the existing queue's work limit. No AI operation holds the write queue.

## Confirmed recovery behaviour

| Behaviour | Small Claims | Family | Civil |
|---|---|---|---|
| Refresh/navigation restores unfinished answers and mode | Passed | Passed | Passed |
| Unsent question text and question position recover | Passed | Passed | Passed |
| Account record restores intake after tab storage is cleared | Passed | Passed | Passed |
| Failed saves retain pending text, block AI, and recover on retry/reconnection | Passed | Passed | Passed |
| Recoverable authentication rejection during saving | Passed | Passed | Passed |
| Older AI response cannot replace another tab's newer checkpoint | Passed | Passed | Passed |
| Conflicted pending text remains accessible after refresh | Passed | Passed | Passed |
| Unavailable selected case does not substitute another case | Passed | Passed | Passed |
| Explicit guest flow can refresh; fresh start stays empty | Passed | Passed | Passed |
| Unsaved results resume intake; saved results retain their case-page destination | Passed | Passed | Passed |

Additional protections:

- Reads and writes are scoped to account, case, and court. Account changes retire the prior recovery context. Same-account token refresh does not clear intake.
- Checkpoint revisions reject conflicting writes from another tab. Existing `updated_at` conflict protection remains in use. Unrelated fields are preserved when checkpointing, and the builder's full save preserves stored fields, including the checkpoint.
- Response checks fetch only owner, court, and checkpoint revision. They do not repeatedly download the whole case.
- Unsent structured-chat drafts belong to their question. Correcting an earlier answer in the form cannot place its draft under the next question.
- Interrupted request loading flags are not restored as permanent loading states. Recovery does not automatically repeat paid analysis.
- Normal in-app links wait for a pending authenticated save; a failed save keeps the intake visible. Visibility/online/page interruption handlers also attempt to flush pending work. Unacknowledged owned changes receive a browser unload warning where supported.
- The dashboard fetches a small lifecycle projection and routes unfinished records back to intake. Completed records keep their case-page route.
- Guest recovery uses the existing session-storage slot, tagged with the exact flow and court. No shared localStorage draft was introduced. A fresh start and sign-out retain the existing privacy cleanup. Guest sign-in starts a fresh account intake; the UI tells guests to copy their text first.
- Returning sign-in preserves a pending checkpoint only for the verified matching owner and exact requested flow. Other-account and guest drafts are cleared.

## Verification evidence

All checks ran sequentially. Browser tests intercepted application AI, auth, and case requests using synthetic accounts and records; they made no paid AI calls or real case writes.

Browser command:

```text
npx.cmd playwright test tests/browser/intake-recovery.spec.ts tests/browser/intake-reliability.spec.ts tests/browser/family-civil-intake-reliability.spec.ts --workers=1
```

Result: **24 passed**. Targeted three-area reruns also passed after the final conflict-refresh and results-recovery refinements. The final results-recovery rerun passed **3/3**, including unsaved-result recovery and completed-case routing.

Offline suites executed successfully using their package-script entry points (`node --import tsx ...`):

- `test:intake-recovery`
- `test:intake-requests`
- `test:small-claims`
- `test:three-area`
- `test:builder-persistence`
- `test:case-write-queue`
- `test:storage-keys`
- `test:reset-intake`
- `test:no-stale-intake`
- `test:forms-case-isolation`
- `test:case-record`
- `test:intake-start-screens`
- `test:account-recovery-ux`

The requested `test:case-isolation` script does not exist in this checkout. Existing forms isolation and the new checkpoint account/case/court isolation tests passed instead; no substitute alias was invented.

Other verification:

- `npx.cmd tsc --noEmit --pretty false`: passed.
- `npm.cmd run build`: passed, including TypeScript and all 340 static pages, with a 4096 MB Node heap. No development server was stopped or overlapped.
- ESLint baseline comparison: no new findings. New recovery modules and the final question-draft changes also passed focused lint.
- `git diff --check`: passed; new task files also checked for trailing whitespace.
- Suite index regenerated as required by `CLAUDE.md`: 152 documented suites, 28 without headers; the undocumented count did not increase.

The build retains the existing middleware deprecation warning and the optional missing `genericAnswers.published.json` warning. Legal registries were not regenerated. These software checks do not establish legal accuracy or constitute legal review.

## Lint reconciliation

The earlier **24 findings** were the full Phase 1 file scope. The **seven warnings** were its narrower Family/Civil/harness regression scope; they were not competing totals.

The expanded Phase 2 scope includes the dashboard's one inherited finding, producing a **25-finding baseline**. The final comparison found **19 inherited findings**: nine errors and ten warnings, **zero new findings**. The focused Family/Civil scope now has **six inherited warnings**. Necessary hook changes resolved six existing findings overall. Full-scope lint still exits nonzero for inherited debt; it is not reported as a clean full lint run.

Comparison used ESLint on the same file scope at `HEAD` and in the working tree, matching rule IDs and source lines independently of line-number shifts. Local detailed results are in ignored `.next/phase2-lint-reconciliation.json` and `.next/phase2-checks.json`.

## Phase 2 files changed

Phase 1-only changes remain in the working tree and are included in the Git diff. This list identifies the Phase 2 changes made on top of them.

| Files | Purpose |
|---|---|
| `app/_components/IntakeRecovery.tsx` (new) | Connect existing UI state to the owned case checkpoint; recovery, save status, request guards, and tab privacy |
| `src/lib/case-system/intakeCheckpoint.ts` (new) | Bounded checkpoint envelope, owned reads, queued CAS saves, same-ID insert recovery, small revision projection |
| `src/lib/case-system/updateCaseRecord.ts` | Optional court filter on the existing conflict-safe updater |
| `src/lib/case-system/builderDraftStorage.ts` | Preserve the active version-2 envelope when the legacy read-once hand-off is consumed |
| `app/_components/HomeLocationGate.tsx` | Save before operations, full-text hand-off, recovery, and same-account refresh protection |
| `app/_components/CaseUnderstandingCard.tsx` | Retain unanswered text on recovery while clearing replies for genuinely new question sets |
| `app/builder/page.tsx` | Reuse checkpoint case ID, recover builder state, use validated owned rows, preserve stored fields |
| `app/builder/_components/FamilyIntake.tsx` | Family answers/mode/provenance recovery and guarded requests |
| `app/builder/_components/CivilIntake.tsx` | Civil answers/mode/provenance recovery and guarded requests |
| `app/builder/_components/SmallClaimsIntake.tsx` | Structured Small Claims answer and edit-state recovery; guarded requests |
| `app/builder/_components/GuidedSmallClaimsIntake.tsx` | Conversation, proposals, pending input and position recovery; guarded requests |
| `app/builder/_components/GuidedFormChat.tsx` | Question/history/skip state and question-scoped unsent drafts |
| `app/builder/_components/SourcedQuestions.tsx` | Recover questions, answers and position without restarting completed research |
| `app/dashboard/page.tsx` | Resume unfinished owned intake using a lightweight lifecycle projection |
| `app/login/page.tsx` | Preserve only an explicit returning checkpoint for the verified matching owner |
| `scripts/verification/verifyIntakeRecovery.ts` (new) | Synthetic storage, ownership, court/case isolation, revision conflicts and ambiguous-insert tests |
| `scripts/verification/verifyBuilderPersistenceReliability.ts` | Update persistence assertions for preserved fields and the owned recovery case ID |
| `scripts/verification/verifyNoStaleIntake.ts` | Check the validated recovery-row integration while retaining fresh-start isolation assertions |
| `tests/browser/intake-recovery.spec.ts` (new) | Independent recovery/failure/isolation coverage in all three court areas |
| `package.json`, `.github/workflows/courtsimplified-ci.yml` | Register recovery verification and browser CI coverage |
| `docs/VERIFICATION_SUITES.md` | Required generated suite index |
| `docs/INTAKE_PHASE_2_REPORT.md` (new) | This report |

## Limitations and compatibility

1. No database migration is required: the checkpoint is additive JSON metadata on the existing case record. Legacy read-once hand-offs remain supported. Previously lost, never-saved answers cannot be reconstructed.
2. Server acknowledgement is the durability boundary. A crash or power loss before acknowledgement can still lose changes not retained by the browser. A debounce, network failure, storage quota, or storage denial must not be described as a guaranteed server save.
3. Guest progress is confined to its current tab/flow. It is not promoted into an account on sign-in. Sign-out privacy cleanup intentionally clears pending browser content, including after a terminal authentication sign-out; account recovery then uses the last acknowledged checkpoint. Recoverable save/authentication failures retain pending text while that flow remains available.
4. Checkpoints over 500,000 bytes are refused rather than silently truncated. Storage/size failure asks the user to copy text and blocks expensive intake operations until saving is possible.
5. Cross-tab conflicts require explicit review. Pending text remains visible, and a separate saved-intake link uses `noopener noreferrer`; the system does not silently merge conflicting facts.
6. Local file bytes are not copied into checkpoints. Existing evidence references/metadata can recover; files that were never uploaded may need to be selected again.
7. Older open application tabs may not understand the new checkpoint metadata. Any later rollout should refresh those tabs; an older full-record writer can discard fields it does not preserve. No rollout or migration was performed here.
8. Browser verification used synthetic auth and database responses. No production sign-in, live RLS mutation probe, production deployment, or live legal-content validation was performed.
9. The confirmation gate and premature-guidance presentation remain outside Phase 2 and require the next approval. Inherited lint/build warnings remain as recorded above.

## Git and stop state

Branch remains `fix/basic-limitation-warning-qualifier`; `HEAD` remains `2c6e4a1`. The working tree contains the preserved Phase 1 changes plus these uncommitted Phase 2 changes. The pre-existing `.claude/` work was not modified. Nothing was staged, committed, pushed, merged, switched, or deployed.

Phase 2 is stopped. Further implementation requires approval.
