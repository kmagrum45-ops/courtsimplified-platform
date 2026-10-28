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
