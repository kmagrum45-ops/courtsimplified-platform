# Case size and the one case file: plan (not built)

Written 2026-10-28 at the site owner's request ("Step 5": connect every screen to the shared
case file, then delete the old copies). **Nothing here is built.** Each part below is a separate
PR, in the order given, and none starts before the owner approves this plan.

## Why

A saved case (`cases.master_result`) is about **1.7 MB**. It was measured on staging on 28 Oct,
across about 567 cases, before the staging cleanup. Almost all of that is copies nobody reads:

- **Writers spread the stored row and never delete a key.** So every analysis adds to the row
  and nothing is ever taken out.
- **`intakeData.masterResultPatch` holds the whole previous master,** so the row nests one level
  deeper with each re-analysis.
- **Large rows cost time and failures:**
  - every save sends the whole row;
  - the database cancelled concurrent large writes (57014, walkthrough 9 Oct);
  - staging reached the size where the owner was given `VACUUM FULL` steps.

**Estimate after the clean-up: about 0.3 MB a case.** This is to be re-measured on staging at
each step, not assumed.

## What is read today, and what is not

**Read by a screen or route** (keep):

- `intakeAnalysis` (case page)
- `masterCase`
- the `persistedRecord` title
- `intakeData.analysis` (guided-assistant fallback)
- `intakeData.extra`'s user fields
- `intakeCheckpoint`
- `position`
- `intakeAnswers`
- `casePicture`
- `familyStatus`

**Not read by anything** (the search of 28 Oct, to be re-run before deleting):

- `intakeData.masterResultPatch`
- `dashboardPatch` / `brainDashboardPatch`
- the `intelligence` copies inside `intakeData` and `extra`
- `caseSystemAssembly`
- `courtSimplifiedIntelligence`
- `masterCaseFile`
- `caseContext`
- the `family*` analysis copies

**The one risk:** `generate-form`'s `getCaseValues` (`app/api/generate-form/route.ts`) fills a
court form by `deepPick` over the **whole** row. A field could today be filled from a copy that
looks unread. Deleting that copy would then blank a form field, or fill it from a different
copy. The equivalence test below exists for this.

## The order

1. **Connect the screens that still bypass the shared case file.**
   - `SITE_MAP.md` lists **42** bypasses today:
     - Situation and case file: 12
     - Stage map and next steps: 11 (one of them "guarded, not a bypass")
     - Screens and forms: 14
     - Chat: B2-B6, 5
   - Each is moved to the shared piece and deleted from its list in the same PR, as the site map
     requires.
   - The ones that change what a person sees go first:
     - B4: the law lookup takes the side from the request, not `readCaseRecord().side`;
     - B2 and B3: the chat's broad or model-guessed stage;
     - the forms page's own stage reader;
     - the overview's own "Your role".
   - Wording-only copies (labels, formatters) follow.
   - #507 already removed one, the Family served date.
2. **Stop writing the unread copies.**
   - Each writer stops writing one key at a time: the engines' `payload`, `extra: {...input}`
     spreads, and `masterResultPatch`.
   - Nothing is deleted from saved rows yet. New and re-analysed cases simply stop growing.
   - Each PR carries the equivalence test.
3. **Make every write a merge of named keys.**
   - Writes no longer spread the stored row. The position and form-applicability routes already
     work this way (`updateMasterResult`, #501).
   - This is what keeps a removed key from coming back.
4. **Clean the saved rows.**
   - A script removes the unread keys from existing rows, on **staging first**.
   - Run with `--confirm` only. It refuses production, like `db:clean-staging`.
   - Measure the size before and after, with `count(*)` and `pg_column_size`, never `table-stats`.
   - Production only on the owner's explicit go-ahead, after a verified manual backup (there are
     no automatic backups).

## The equivalence test (before / after)

This is a new suite, `test:case-size-equivalence`, run in CI on every PR of steps 2 to 4.

- **The cases:**
  - the fixture cases (`scripts/verification/fixtures/`);
  - the story-pack saved rows (synthetic);
  - one saved row per court built the way each intake writes it today;
  - for each, the row as it is now and the row with the unread keys removed.
- **What must be identical between the two rows:**
  - `readCaseRecord` (side, stage, step, every date with its source, amount, claim kind, city,
    documents, filings);
  - `caseFileOf` (every slot and its source);
  - `storedIntakeValues`;
  - `withCaseFileDates` (the step page's dates);
  - **`getCaseValues` for every court, every field.** This is the generate-form values: every
    name, address, amount, court, claim number and date a form is filled from.
  - the case page's server props, through the same readers the page calls.
- **Proof it can fail:** it must fail when a key that *is* read is removed (shown with
  `intakeData.extra.yourCity` and `intakeAnalysis`). So it is not vacuous.
- **A field that differs is not absorbed.** Either the removed key was read, and is kept, or
  `getCaseValues` was reading a stale copy, which is a fault to report to the owner before
  anything changes.

## Numbers each PR reports

- the row size on staging, before and after (median and largest), and the number of rows;
- the equivalence suite: cases compared, fields compared, differences (must be 0);
- for step 1, the bypass count before and after (from `SITE_MAP.md`).

## Not in this plan

- Production changes of any kind, without the owner's go-ahead.
- Migrations: a JSON clean-up needs none. If a column is ever dropped, the owner applies it.
- The `VACUUM FULL` on staging. The owner has the steps (28 Oct).

## The case store design (evaluated 2026-10-30, adopted in principle by the owner)

The owner proposed seven parts (a to g). Each was checked against the code on `fact/claim-type`
(PR #536, based on main 14e58e93). **Every day count below is an estimate, not a measurement.**

| Part | Exists today | Missing | Days (estimate) |
|---|---|---|---|
| **(a) One case store, filled from the saved record, written through per fact; a stale write refused; the saved record always wins** | A save carries the checkpoint revision and is refused as `intake-conflict` when it does not match (`src/lib/case-system/intakeCheckpoint.ts:96`). The row update is compare-and-set on `updated_at` (`src/lib/case-system/updateCaseRecord.ts:87`). | **On load, the tab copy wins over the saved record wholesale** (`app/_components/IntakeRecovery.tsx:204`, `session?.checkpoint ?? saved`): the rule-2 gap. A conflict only stops the page ("Another tab changed this intake", `:294`). Each screen keeps its own copy in memory. | 4–6 |
| **(b) Each fact with value, source, state and version** | A slot has a state (`not-asked`, `answered`, `unsure`), a source (an answer, or the story with its quote) and `confirmed` (`src/lib/case-system/caseFile/caseFile.ts:50-52`). | A "removed" state exists only for claim type (`claimKindRemoved`, `:89`), which is why 42 carry entries are "returned after removal". No "derived" source. No per-fact version. **No migration needed**: `master_result` is JSON, and a `caseFile` section is already reserved in the checkpoint (`CASE_FILE_SECTION`, `:93`). | 2–3 |
| **(c) One question engine: the claim type's required facts minus the confirmed, skipped and removed ones; a changed answer reopens the questions that depend on it** | The shared gate exists: `nextQuestion`, `askable`, `chatMayAsk` (`caseFile.ts:548-569`). | Each screen passes its own candidate list. There is no single list of required facts per claim type driving every screen (the elements live in `elementProofEngine` and the claim types). A changed answer cancels the whole confirmation (`reconcileReview`, `intakeCheckpoint.ts:113`); no dependent question is reopened on its own. | 5–8 |
| **(d) The old snapshot readers kept alive by a read-only view generated from the record, then deleted** | The guard and the site map count them. | **Far more than about 15**: 603 allowed entries in 169 files (`caseFileGuardAllowed.json`) and 42 bypasses in `SITE_MAP.md`. `getCaseValues` fills forms with `deepPick` over the whole row, so the view must pass this plan's equivalence test. | 8–15, spread over the conversions |
| **(e) Guests on the same store interface, moved into the account at sign-in** | Guests use the same checkpoint shape in tab storage. `carryGuestIntake` (`src/lib/case-system/guestCarry.ts:73`) moves it into the account as a new case, never into an existing one. | **Dropped** by the owner's decision of 30 Oct to remove guest cases (see `docs/ACCOUNTS_AND_ACCESS_PLAN.md`). | — |
| **(f) A failed save kept as a flagged unsaved draft and offered back, never silently applied** | `pending` on the tab session; the "You have an unsaved case in this tab" warning; a retry button; a visible failure note. | On reload, unsent edits are **applied silently**: the same line 204, because the tab copy becomes the page. They are not offered back to save or discard. | 2–3 |
| **(g) Tests wait on the save request or the "Saved" signal, not on polling** | A save-status element with a status or alert role (`IntakeRecovery.tsx:533`, `intake-save-status`). | The carry test polls the saved row every 3 seconds (`tests/browser/carry-end-to-end.spec.ts:535`), and 13 browser specs wait fixed times. This is the cause of the carry entries that come and go between runs. The status element carries no saved revision a test could wait for. | 2–3 |

Total: **about 23–38 days (estimate)** without (e).

### The four changes to the design (adopted)

1. **Merge per fact on a conflict.** The record already refuses a stale write. On a conflict, re-read the record and re-apply only the facts this person changed. Stop and ask only when the same fact changed on both sides. Each fact carries the revision at which it last changed; there is no full versioning system.
2. **The tab is a buffer of unsent edits, never a source of answers.** The saved record always wins. Unsent edits sit on top of it, marked, and are offered back ("Not saved yet: … Save / Discard"). This one change at `IntakeRecovery.tsx:204` delivers both (a) and (f).
3. **A small table of dependencies, not a general graph.** For example: claim type → its elements; side → its forms; stage → its dates.
4. **(e) "A new case, never a merge"** was the fourth change. It no longer applies, because guest cases are removed.

### Order (superseded by `docs/ACCOUNTS_AND_ACCESS_PLAN.md`, section E)

(g) the tests wait on the save → the tab-copy rule with the draft handling ((a) and (f)) → fact states (b) with the stage conversion → the question engine (c) → the old readers (d) retired inside each fact conversion. None of this replaces the fact-by-fact method; it makes each conversion smaller. There is to be no single large rewrite.

### Rule 5 item: the Form 7A section on the finished-case page (owner, 30 Oct; not in #536)

A finished Small Claims case reloads onto its case page (`app/_components/IntakeRecovery.tsx:247`:
guidance current → `/cases/<id>`), which draws no Form 7A section. #536 draws it on every builder route
(guided, whole form, one at a time) from the case file. Under rule 5 (every screen shows the same
value), the case page gets the same section, read only from the case file (`form7ADraftFields`,
`elementStates`), never from a screen's copy.

- **Carry check:** the carry test counts a missing or different Form 7A section on the finished-case
  page as `screens-disagree / form-7a-section`, as it already does on the builder routes.
- **Days:** 1–2 (estimate).
- **Placement:** after #536, with the stage conversion or as its own small PR (owner's choice).
