# Accounts and access: plan (not built)

Written 30 Oct 2026 for the site owner, from the owner's decisions of the same day. **Nothing here
is built.** It is a plan to approve, change or reject. Each part is its own PR, in the order of
section E.

How to read it:

- Every claim about the code names a file and line (`file:line`), found by reading the code on
  `origin/main` at 14e58e93. Line numbers move as code changes, so a PR re-checks them before
  editing. PR #536 (claim type) is not yet merged and moves some of them.
- **Every day count is an estimate.** None is a measurement.
- Where I am not sure, I say so.
- Nothing here is legal or tax advice. Points that need a lawyer, an accountant, the Law Society
  or the insurer are marked **For the owner and advisers**.

---

## A. The decisions this plan carries out (owner, 30 Oct 2026)

1. **No more guest cases.** A short "Is this the right place for me?" check stays on the home page,
   with the court choice. It saves nothing. From "tell us your story" onward, a free account is
   needed. Creating the account records that the person understands CourtSimplified is not a law
   firm and does not guarantee an outcome.
2. **The full intake becomes paid later:** one fee per case, for the life of the case. It is free
   during beta, but everyone needs an account. Payment is not built now.
3. **Build the gate, not the payment.** Each case has an access status: `beta` now, `paid` later,
   or `none`. Every server route that reads the story, calls the AI, writes case facts or serves
   guidance refuses a case without access. During beta, a new case gets `beta` access. When
   charging starts, only *the way the status is set* changes: a hosted checkout and its webhooks,
   so no card data ever touches our servers.
4. **The case store design is adopted with its changes** (`docs/CASE_SIZE_PLAN.md`, "The case
   store design"). The tab holds only unsent edits, never answers. A conflict is merged one fact at
   a time. A small table says which facts depend on which. **Item (e) is dropped**: it moved a
   guest's work into an account at sign-in, and there will be no guests.

---

## B. Removing guest cases

### B1. What "guest" means in the code today

A guest is a visitor who is not signed in. A guest's whole case lives in the browser tab
(`sessionStorage`), under one storage key. Signed-in people use **the same key** as a buffer of
unsaved edits. The difference is one field, `ownerId`: `null` for a guest, the user's id otherwise
(`src/lib/case-system/intakeCheckpoint.ts:23-35`, read at `:63-72`, written at `:74-80`).

So removing guests does **not** delete the tab store. It deletes every branch where
`ownerId === null`, and leaves one kind of tab copy: a signed-in person's unsent edits. That one
kind is exactly what the case store's rule 2 ("the tab is a buffer of unsent edits") must handle.

What guests can already *not* do. The AI routes already refuse a visitor who is not signed in:

- `intake/guided-turn/route.ts:306-308`, `intake/classify-claim-type/route.ts:131-134` and
  `intake/safety-check/route.ts:60` answer 401;
- `case/understand/route.ts:45` and `classify-court-path/route.ts:60` answer "skipped" or
  "unknown" without calling the model;
- every route wrapped in `withConfirmedGuidance` answers 401
  (`src/lib/security/intakeGuidanceGate.ts:30`).

So a guest can type a story and answer the form, but gets no AI reading, no "Here is what we
understood" and no next steps until signing in.

### B2. Every guest-only code path

**Count: 31 places in the site's code** (rows D1-D10, C1-C21 below), plus the guest tests in
B3. "Delete" means the code goes. "Change" means it stays, with its guest half removed. "Keep"
means it is reused by the no-save check.

**Delete (10)**

| # | Where | What it does today |
|---|---|---|
| D1 | `src/lib/case-system/guestCarry.ts` (whole file, 95 lines): `markGuestCarry` `:31`, `signInAddress` `:53`, `carryGuestIntake` `:73` | Marks a guest's intake when they press Sign in, and rewrites it as a new case in their account. |
| D2 | `app/login/page.tsx:9` (import), `:100-104` (after sign-up), `:134-136` (after sign-in) | Calls the carry after the account is created or signed into. |
| D3 | `src/lib/case-system/storage/intakeStorageKeys.ts:104-112` (registry entry), `:441`, `:457` (`GUEST_CARRY_KEY`) | The 30-minute "carry this intake" mark. |
| D4 | `intakeCheckpoint.ts:28-29` and `:69` (`workflowStatus` on the tab session) | **The guest workflowStatus mirror:** a guest's review and confirmation, kept in the tab because there is no saved case. |
| D5 | `intakeCheckpoint.ts:32-33` and `:70` (`carried`) | Marks a carried guest intake that has not created its case yet. |
| D6 | `src/lib/case-system/builderDraftStorage.ts:23`, `:125-170` (`saveGuestIntakeSession`, `consumeGuestIntakeSession`, `clearGuestIntakeSession`) | An older guest hand-off. **No page calls it**: only two checks do (`scripts/verification/verifyIntakeRecovery.ts:26`, `verifyNoStaleIntake.ts:95-104`). Dead code. |
| D7 | `app/builder/_components/SignInForSafetyCheck.tsx` (whole component, `:12`) | The "sign in for the safety check" box shown to a guest who asks for guidance. |
| D8 | `src/lib/content-library/acknowledgement.ts:48-50` (the `:guest` key) | Stores a guest's "I understand" under a guest key. See B2a. |
| D9 | `case/understand/route.ts:45` and `classify-court-path/route.ts:60` (the "no user: skip" answers) | Replaced by the access gate (section C): no user is a 401, as on every other route. |
| D10 | `scripts/verification/verifyGuestCarry.ts` (`npm run test:guest-carry`, `package.json:253`) | The carry's own check. |

**Change (21)**

| # | Where | Change |
|---|---|---|
| C1 | `app/_components/IntakeRecovery.tsx:186` | "Sign in to the account that owns this case" becomes "no user: go to sign-in", for every address. |
| C2 | `IntakeRecovery.tsx:193-194` | The refusal to open a carried intake over a saved case goes (nothing is carried). |
| C3 | `IntakeRecovery.tsx:200` | **The load rule.** Today `session?.checkpoint ?? saved`: the tab copy wins over the saved record. With guests gone, the only tab copy is a signed-in person's unsent edits. This line is where the tab-copy rule (section E, step 3) lands. |
| C4 | `IntakeRecovery.tsx:208` | `workflowStatus` read from the case record only (drop `session?.workflowStatus`). |
| C5 | `IntakeRecovery.tsx:229` | The guest-only reset on the home page goes. |
| C6 | `IntakeRecovery.tsx:260` | The cache writes `pending` only (drop the guest `workflowStatus` and `carried`). |
| C7 | `IntakeRecovery.tsx:271` | `if (!ownerId) return;` (guests never save) goes. |
| C8 | `IntakeRecovery.tsx:403` | The in-tab review transition for guests goes; review is always saved to the case (`:393-399`). |
| C9 | `IntakeRecovery.tsx:90-92` | The comment "the server serves guests without a case" is wrong today (the gate refuses no-user, `intakeGuidanceGate.ts:30`); removed. |
| C10 | `IntakeRecovery.tsx:493`, `:518`, `:528` | The guest notice ("Guest progress stays in this tab only…"), the guest half of "You have an unsaved case in this tab", and the guest sign-in link. |
| C11 | `IntakeRecovery.tsx:752-762` (`readHeldIntake`) | Guest case (`ownerId` null) removed; only unsent signed-in edits are "held". |
| C12 | `app/_components/startSignIn.ts:9-13` and its six callers: `AuthNavAction.tsx:57`, `app/builder/page.tsx:2627`, `GuidedSmallClaimsIntake.tsx:1617`, `SignInForSafetyCheck.tsx:18`, `IntakeRecovery.tsx:528`, `NextStepStatus.tsx:108` | Becomes a plain "sign in and come back here" link, with no carry. |
| C13 | `app/builder/page.tsx:1279-1284` | The guest check before the guided analysis goes. |
| C14 | `app/builder/page.tsx:1563-1565` (`savedCaseId`) | The guest branch goes; the case id comes from the address (rule 1). |
| C15 | `CivilIntake.tsx:688-692`, `FamilyIntake.tsx:609-613`, `SmallClaimsIntake.tsx:919-930` | The "guests sign in first" checks before analysis. The page itself now needs an account, so these become a defensive check only. |
| C16 | `app/_components/NextStepStatus.tsx:76`, `:107-108` | The guest sign-in line. |
| C17 | `src/lib/case-system/openCase.ts:71`, `:86` (`"start"` for a guest), `:108` | No id and no user: sign-in, then the case chooser. |
| C18 | `app/_components/HomeLocationGate.tsx` (758 lines) | **The home-page story box.** The story box (`:488`), the AI reading (`understandStory` `:277-309`, calling `/api/case/understand` at `:285`), the court-path check (`:354-359`) and the "Here is what we understood" card (`:499`) move behind the account, into the new case. The guest notice (`:471`) and the guest resets (`:189`, `:213`) go. What remains on the home page is the no-save check (B4). |
| C19 | "Here is what we understood" (`app/_components/CaseUnderstandingCard.tsx:90`) | **Skipped for guests today** because `/api/case/understand` answers `skipped: "authentication-required"` with no user (`understand/route.ts:45`) and the home page treats any skip as "no answer" (`HomeLocationGate.tsx:301-304`). After the change everyone who reaches the story is signed in, so everyone gets it. |
| C20 | `src/lib/security/aiRateLimit.ts:1-27`, `aiRouteGuard.ts:2-3` | The per-visitor limits were written for "AI routes that need no sign-in". After this, no AI route needs no sign-in. **Keep the limits as a backstop**; add a per-account limit later if wanted. Comments updated. |
| C21 | Stale comments: `src/lib/audit/aiCallLog.ts:172-176` (says safety-check and classify-court-path run without a session; both now require one) and `app/api/small-claims/analyze/route.ts:378` ("serves unauthenticated callers"; the wrapper refuses them) | Corrected. |

**Keep, for the no-save check (B4):** `app/page.tsx` (the three court cards), `NotSureCourtGuide.tsx`
(court finder), `src/lib/case-system/intelligence/fixedRegimes.ts`, `outOfScopeForums.ts:80`,
`src/lib/case-system/intake/jurisdictionRoutes.ts:95`, `PathwayUnavailable.tsx`, and
`isPathwayAvailable` (`src/lib/content-library/phaseScope.ts:132`).

**Not guest-only, despite the name.** Most keys with `scope: "guest"` in
`intakeStorageKeys.ts:94-180` are tab-scoped keys that signed-in people use too, including the
main key itself (`courtSimplifiedGuestIntakeSession`, `:96`, whose own note says "signed in or
not", `:101`). They stay. A rename to "tab" is cosmetic and can wait.

### B2a. The "I understand" box asked twice

- **The box.** `app/_components/FirstUseAcknowledgement.tsx:110-118`: "I understand that
  CourtSimplified guides me through the court process but is not my lawyer, and that AI is used to
  help organize my information." It is mounted in two places: the builder (`app/builder/page.tsx:1907`)
  and the situation gate (`IntakeRecovery.tsx:591`).
- **Why it is asked twice.** It is stored in the browser's `localStorage`, keyed by user id, or
  `:guest` with no user (`acknowledgement.ts:48-50`). A guest ticks it, signs in, and the key
  changes to their user id, so it is asked again. The carry test notes this
  (`tests/browser/carry-end-to-end.spec.ts:164-166`).
- **It is not a record.** The file says so itself: per browser, not per account, "NOT a reliable
  audit record" (`acknowledgement.ts:12-21`).
- **The change.** Ask once, on the sign-up form, with the owner's wording (section F4). Record it
  on the server (section C1). Remove the builder and situation-gate copies.
- **A second, different box stays.** The review's "I have reviewed this information…"
  (`IntakeReviewPanel.tsx:314`) is a confirmation of the answers, not the notice.

### B3. The tests

**Browser specs that are guest-only (delete or convert):**

- `tests/browser/guest-guidance.spec.ts`: 4 tests. A guest is told to sign in before guidance.
  **Delete**: the case no longer exists.
- `tests/browser/guest-intake.spec.ts`: 1 test. A guest can begin each court. **Convert**: the
  no-save check works without an account and hands off to sign-up.
- `tests/browser/guest-sign-in-carry.spec.ts`: 5 tests. Every sign-in link carries the guest's
  intake into a new case. **Delete.** Replace with one test: sign-up from the no-save check lands
  on a new case's story with the court already chosen.

**Guest tests inside other specs (convert to signed-in):**

- `intake-recovery.spec.ts:146`;
- `intake-review.spec.ts:147`;
- `story-box-guidance.spec.ts:162`;
- the guest half of `story-single-source.spec.ts:50`;
- `address-opens-chosen-case.spec.ts:140` (a guest case carried in) and `:247` (a guest with no
  court goes to the start page).

**Specs that never call a sign-in helper by name.** 15 specs contain none of
`authenticateRealTestUser`, `seedCase`, `signInFromBuilder` or `signInWithPassword` (found by
search; list in the PR). Some may sign in another way. **Each must be read in the guest-removal
PR**: any that types a story as a visitor will break and must sign in first.

**Verification suites that touch guest code:** `verifyGuestCarry.ts` (delete), and the guest
parts of `verifyIntakeGuidanceGate.ts`, `verifyOpenCase.ts`, `verifyResetIntake.ts`,
`verifyIntakeRecovery.ts` and `verifyNoStaleIntake.ts`.

### B3a. The carry list

The carry list is `tests/browser/harness/carryBaseline.json` on branch `fact/claim-type`. These
numbers were checked by counting the file.

**134 entries: 79 from guest runs, 55 from signed-in runs.**

| Court | Guest runs | Signed-in runs |
|---|---|---|
| Civil | 14 asked-twice, 14 returned-after-removal | 8 asked-twice, 7 returned-after-removal |
| Family | 11 asked-twice, 14 returned-after-removal | 7 asked-twice, 7 returned-after-removal |
| Small Claims | 25 asked-twice, 1 screens-disagree | 25 asked-twice, 1 screens-disagree |

**The runs** (`tests/browser/carry-end-to-end.spec.ts:115-124`, checked). There are 12 runs.

- **Small Claims:** every route (form, questions, review), both as a guest and signed in. That is
  six runs.
- **Civil and Family:** the form signed in, and **the questions and the review as a guest only**
  (`:123`).
- A "guest" run signs in partway through: before the questions on Small Claims (`:556-557`), and
  after the reload on the others (`:586-593`).

**The key point.** Civil's and Family's one-question-at-a-time route and their review route are
tested **only as guests**. Deleting the guest runs would leave those four routes with **no carry
coverage at all**.

**Removing guests does not fix these entries.** I matched each guest entry to the signed-in
entries by court, kind, fact and screen. **All 79 guest entries match a signed-in entry.** On
Small Claims, all 26 also match on the same route. There are 40 distinct defects in the whole
list. Every one is seen signed in, and none is seen only by guests. So the guest entries are the
same defects, seen again through another door.

**Recommendation: convert every guest carry run to signed-in. Do not delete any.**

- **Civil and Family questions and review (4 runs):** run them signed in from the start.
- **Small Claims (3 guest runs):** these would duplicate the three signed-in runs. Turn them into
  **"a new account, made through the site's own sign-up form, starting from the no-save check"**
  runs. That tests the new front door (sign-up, the acknowledgement, the court carried in the
  address), which nothing else would test.

**How many entries to expect after conversion (an estimate, with its reasoning):**

- **Civil and Family's 53 guest entries** should reappear under "signed-in". Each matches a defect
  seen signed in, so about **53**.
- **The 3 new Small Claims sign-up runs** go through the same screens as the signed-in runs, so
  they would likely show most of the same **26** entries.
- **Total: about 134 entries, relabelled** (a likely range is 120 to 134). The only expected
  drops are asks that came from the guest-specific steps (sign-in midway, the carry, the second
  "I understand"). I cannot tell from the file which entries those are.
- Two cheaper choices would lower the count, but only by lowering what is tested: drop the
  duplicated Small Claims runs and the count goes to about 108; delete the guest runs and it goes
  to 55. **The count going down that way would not mean anything got fixed.**

**A trap in the conversion.** The list's matching key includes `who` (guest or signed-in)
(`tests/browser/harness/carryCounts.ts:80` on `fact/claim-type`). The "may only shrink" check
compares that key with `main` (`scripts/verification/verifyCarryBaseline.ts:56-57` on the same
branch). So relabelling "guest" to "signed-in" reads as **new entries** and fails the PR.

The conversion PR needs a one-time rule, approved by the owner. The check compares counts per
court, kind, fact and screen, ignoring `who`, and passes only if no such count goes up. The PR
states the before and after counts.

### B4. The no-save check: "Is this the right place for me?"

**What it is for.** In under a minute, a visitor learns whether CourtSimplified covers their kind
of matter, and which court, before being asked to make an account. It is the part that reduces
sign-up friction (section F1).

**What it asks.** Only what picks the court and spots the regimes the code decides
(CLAUDE.md s. 2a):

1. **Which court.** The three court cards (`app/page.tsx`), with the "Not sure" finder
   (`NotSureCourtGuide.tsx`) for people who do not know. The finder's relationship, remedy,
   amount and "has a case started" questions stay. **Its free-text "what happened" box
   (`facts`) goes.** The story belongs inside the case, behind the account.
2. **Fixed regimes, as yes/no questions answered from code rules:**
   - more than the Small Claims limit (`fixedRegimes.ts:180`, `SMALL_CLAIMS_MAXIMUM`; rule and
     quote at `:79`);
   - a construction lien (`fixedRegimes.ts:72`, `CONSTRUCTION_ACT_S50_1`).
3. **Matters that belong elsewhere.** A short list taken from `OUT_OF_SCOPE_FORUMS`
   (`outOfScopeForums.ts:80`; ids include `ltb`, `hrto`, `wsiat`, per the classifier's list at
   `courtPathClassifier.ts:538`) and `JURISDICTION_ROUTES` (`jurisdictionRoutes.ts:95`). The
   person picks one, or none.
4. **A court we do not cover yet:** `PathwayUnavailable.tsx`, through `isPathwayAvailable`
   (`phaseScope.ts:132`).

**What it stores.** Nothing beyond the page. It writes no `sessionStorage` key (the finder writes
`COURT_PATH_FINDER_KEY` today, `NotSureCourtGuide.tsx:7`; that goes) and makes no server call. It
runs **no AI**: the court-path check (`classify-court-path`) and the reading (`case/understand`)
move inside the case (C18).

**The hand-off.** "Create a free account to tell us your story". This goes to
`/login?mode=signup&next=/builder?path=<court>`. The court travels **in the address only**,
because the address is the only authority (rule 1, `openCase.ts`). After sign-up, the new case
starts with that court. The court fills the situation's court question
(`withKnownCourt`, `IntakeRecovery.tsx:555`, `:581`), so the court is **not asked again**.

**Never ask twice.** Anything the check asks that is a fact of the case would have to be asked
again inside, because the check stores nothing. So the check asks **only** what decides the court.
It asks "more than $50,000?" as a yes/no, **never the amount itself**; the amount is asked once,
inside the case. This is a design rule for the PR, and the carry test's sign-up runs (B3a) check
it.

**What it must never say:**

- **No legal statement without its source** (CLAUDE.md s. 2). Each regime or forum shown carries
  the provision it rests on, quoted from the corpus with its link and date, as `fixedRegimes.ts`
  already does (its quotes are checked by `scripts/verification/verifyFixedRegimes.ts`, per
  `fixedRegimes.ts:11-13`). A forum without a checked source is not shown.
- **No judging the case** (CLAUDE.md s. 3). Not "you have a case", "this looks strong", "you are
  likely to win", or anything like them. It says which court handles *this kind of* matter, and
  what CourtSimplified covers.
- **It suggests and never decides** (CLAUDE.md s. 4). The person picks the court; the check only
  points out what a code rule says.

### B5. The first screen of a signed-in person

- **After sign-in, with no `next`:** `/dashboard`, the case chooser (`app/login/page.tsx:46-50`;
  `CASE_CHOOSER`, `openCase.ts:45`). Unchanged.
- **After sign-up from the no-save check:** a new case on the chosen court, at the story
  (`/builder?path=<court>`, which starts a new intake whose id goes into the address,
  `openCase.ts:85-89`).
- **An address with no case id:** the case chooser (`openCase.ts:86`). With guests gone, the
  "start" branch for a visitor (`:71`, `:86`) becomes "sign in, then the chooser".
- **"Start a new case"** on the dashboard (`app/dashboard/page.tsx:259-266`) leads to the story on
  that court. The person has already acknowledged the notice at sign-up, so the "I understand" box
  is no longer shown here.
- **The case is created when it is started, not at its first save.** Today the row is inserted on
  the first save (`IntakeRecovery.tsx:281`, `createCheckpointCase`, `intakeCheckpoint.ts:119-129`).
  The access gate (section C) needs a saved case to check. So "Start a new case" creates the row,
  with its access status, before the story box opens. This also removes the "unsaved case with no
  row yet" state that the tab-copy rule would otherwise have to handle.

---

## C. The access gate

### C1. Where the status is stored

Three options were weighed. The question is **who can change the status**.

**The fact that decides it:** the browser writes the case record directly.

- The row policy lets a signed-in person insert and update **any column** of their own case
  (`supabase/migrations/20260823020500_add_case_evidence_storage_bucket.sql:1119`, "Users manage
  own cases", for every operation; also `:1158`, `:1166`).
- The browser inserts the case (`intakeCheckpoint.ts:120`) and rewrites `master_result`:
  - `saveCheckpoint` `:92` and `saveReviewTransition` `:141`, both through
    `updateCaseRecord.ts:84`;
  - the builder's analysis save (`app/builder/page.tsx:1101-1110`, which also sets `title`,
    `court_path`, `status`, `current_stage`);
  - `app/builder/page.tsx:1206` and `:1246`;
  - the step and dates fallback (`positionSave.ts:246`, `savePositionDirect` `:283`).

| Option | Migration? | Can the person grant themselves access? | Verdict |
|---|---|---|---|
| Inside `cases.master_result` (JSON) | No | **Yes.** Any of the browser writes above can set it. | **Rejected.** |
| A new column on `cases` | Yes | **Yes, unless** column rights are taken away. Today's policy covers every column. Blocking one column means revoking table-wide `UPDATE` and granting it column by column, which every future column must remember. | Possible but fragile. |
| **A separate table, `case_access`, that only the server can write** | Yes | **No.** The table allows the owner to *read* their row, and no browser write at all. | **Recommended.** |

**Recommended: a separate table.**

- **Columns:** `case_id` (primary key, linked to `cases`, deleted with the case), `user_id`,
  `status` (`beta`, `paid` or `none`), `source` (for example `beta-default`, `checkout`,
  `refund`, `owner`), `granted_at`, `updated_at`.
- **Row rules:** row-level security on. Owners may read their own row. No insert, update or delete
  rule for signed-in users, so only the server (service role) and the database itself can write it.
- **How a new case gets `beta`:** a database trigger, run after a case row is inserted, adds the
  `case_access` row. The status comes from a one-row setting (`access_settings.new_case_status`),
  `beta` now. When charging starts, that setting becomes `none`, and a webhook sets `paid`.
  Nothing in the site's code changes for that switch. (A trigger is my recommendation, not the
  only way: case creation could instead move to a server route. That is more code.)
- **The acknowledgement record (B2a) goes in the same migration:** `account_acknowledgements`
  (`user_id`, notice version, a fingerprint of the exact text shown, time). It is written by a
  server route at sign-up, never by the browser.

**This needs a migration.** I write the file; **the owner applies it**, staging first, through
`scripts/db/applyMigrations.ts`. That script enforces staging before production and refuses
without `--confirm` (CLAUDE.md s. 6). Take a manual backup of production first; there are no
automatic ones.

**Cases that already exist.** The migration gives every existing case `beta`. Whether those
cases keep `beta` once charging starts (are they "grandfathered"?) is **for the owner to decide**.

**What the gate never blocks** (my recommendation; **for the owner**):

- reading what a person has already saved;
- exporting it;
- deleting it.

The gate stops *new* AI work, *new* guidance and *new* facts. Whether privacy law requires this
is a question for the owner's advisers; I make no statement on it.

### C2. Covering the browser's direct writes

The server routes are not the only door: the browser writes `cases` directly (C1). Two ways to
cover them:

1. **A row rule (recommended for now).** Change the update rule on `cases` to also require an
   access row with `beta` or `paid`. **Both** existing rules must change, because Postgres joins
   allowing rules with OR: "Users manage own cases" (`:1119`, all operations) and
   `cases_update_own` (`:1166`). Leaving the first one would let every update through. Insert
   stays open to the owner (the trigger then sets the status). Same migration.
2. **Move the writes to the server (later).** The case store design moves writes into one
   per-fact path. When that is done, the row rule can be dropped in favour of the server check.

What the person sees when a direct write is refused: today a refused update reads as "not found"
or a failed save. The PR must show a plain line instead ("This case does not have access…",
section D), not a generic save failure.

**Other tables the owner can write directly**: `workspace_documents`, `workspace_*` and the
evidence storage bucket (`20260927090000_case_workspace_documents.sql:376-408`;
`20260823020500…sql:1767`, `:1775`). The site writes them only through server routes. A direct
write there costs no AI and serves no guidance. **Lower priority**; listed so it is a decision,
not an oversight.

### C3. Every server route, and what the gate does

There are no server actions (no `"use server"` file in `app/` or `src/`). There are **40 route
files with 53 handlers** (`app/api/**/route.ts`).

**41 handlers in 35 files need the gate. 12 do not.**

**How a refusal looks:** in this order.

1. No user: **401**.
2. A case the person does not own, or no case id: **404**, or **409** where the existing gate
   already says so (`intakeGuidanceGate.ts:41`, `:43`).
3. Owned but without access: **403**, with `code: "CASE_ACCESS_REQUIRED"`, a plain message,
   `Cache-Control: private, no-store`, and **no case data in the body**. The inner handler never
   runs, so no model is called.

Key to the columns:

- **Story:** reads the story.
- **AI:** calls the AI.
- **Facts:** writes case facts.
- **Guidance:** serves guidance.
- **Wrapper:** `wCG` is `withConfirmedGuidance` today. Adding the access check inside `wCG`
  covers most handlers in one place, but `wCG` also demands a confirmed intake. Intake-phase
  routes need a sibling, `withCaseAccess`: user, owned case and access, no confirmation needed.

**Already tied to a case (case id in the body, the address or the `x-courtsimplified-case-id` header):**

| Route | Method | What it does | Story | AI | Facts | Guidance | Case id from | Today |
|---|---|---|---|---|---|---|---|---|
| assistant/law | POST | The chat's law answer | ✓ | ✓ | | ✓ | body / header | wCG `:183` |
| case/read | POST | Case reader: the story read into a case picture, saved | ✓ | ✓ | ✓ | | body | wCG `:119` |
| case/resolve-stage | POST | Stage suggestion | ✓ | ✓ | | ✓ | body / header | wCG `:335` |
| case/review | POST | "Check my case file" | ✓ | ✓ | | ✓ | body | wCG `:58` |
| case/stage-answer | POST | Published step answer for a chosen stage | | | | ✓ | header | wCG `:192` |
| case/strategy | POST | Strategy (behind its switch) | ✓ | ✓ | | ✓ | body | wCG `:107` |
| cases/chat | POST, PATCH | Saves chat messages and their law | ✓ | | ✓ | | body | wCG `:167`, `:169` |
| cases/drafts | POST | Creates or replaces a draft | | | ✓ | | body | own check `:53-56` |
| cases/event-candidates | GET, POST | Dates suggested from the story; dismiss | ✓ | | ✓ | ✓ | address / body | own check `:90-100` |
| cases/events | POST | Records an event (defence filed, …) | | | ✓ | | body | own check `:213-219` |
| cases/form-applicability | GET, PATCH | Which forms apply | | | ✓ | ✓ | address / body | wCG `:245`, `:247` |
| cases/position | POST | Saves stage, step, dates | | | ✓ | | body | own check `:62-66` |
| cases | POST | Saves a case through the server | | | ✓ | | body | own check `:286` |
| civil/analyze, family/analyze, small-claims/analyze | POST | The full analysis | ✓ | ✓ | | ✓ | header | wCG `:155`, `:307`, `:429` |
| generate-form | POST | Fills a court form from the case | ✓ | | | ✓ | body | wCG `:1405` |
| guided-assistant | POST | Guided assistant | ✓ | ✓ | | ✓ | body / header | wCG `:207` |
| intake/depth-turn | POST | One depth question turn | ✓ | ✓ | | | header | wCG `:282` |
| intake/sourced-questions | POST | Follow-up questions from the law | ✓ | ✓ | | | header | wCG `:145` |
| rules/procedures | POST | Procedure rows for the step | | | | ✓ | header | wCG `:90` |
| workspace/documents | POST, PATCH | Registers or edits an upload | | | ✓ | | body | own check `:125-140`, `:334` |
| workspace/documents/upload-url | POST | Upload link | | | ✓ | | body | own check `:97-109` |
| workspace/documents/extract | POST | Reads an upload's text | | | ✓ | | body | own check `:167-178` |
| workspace/documents/analyse | POST | AI document analysis (ZDR switch) | ✓ | ✓ | ✓ | | body | own check `:75-96` |
| workspace/documents/decision-help | POST | AI help with an uploaded decision | ✓ | ✓ | | ✓ | **the document's case** (`:66`, `:114`) | user only `:53` |
| workspace/exhibit-book | GET, POST | Builds the exhibit book; applies numbering | | | ✓ | ✓ | address / body | wCG `:353`, `:355` |
| workspace/organisation | GET | Timeline, deadline tracker, document table | ✓ | | | ✓ | address | own check `:179-191` |

**No case id today, but calls the AI (7 handlers). Each must be tied to a case or refused:**

| Route | What it does | Today | Change |
|---|---|---|---|
| case/understand | "Here is what we understood" | rate limit, then skip with no user (`:31`, `:45`) | Moves into the case (C18): sends the case id header; `withCaseAccess` |
| classify-court-path | Court-path suggestion from the story | rate limit; "unknown" with no user (`:32`, `:60`) | Same |
| intake/classify-claim-type | Confirms a claim-type suggestion | 401 with no user (`:131-134`) | Case id header; `withCaseAccess` |
| intake/guided-turn | Small Claims questions one at a time | 401 with no user (`:306-308`) | Same |
| intake/safety-check | AI danger check on the story | 401 with no user (`:60`) | Same. **For the owner:** this check is protective. In practice it is reached only from a story, which already needs access. If the owner prefers, it can be the one route that needs only an owned case, not access. |
| intake/tidy-wording | Wording suggestions | 401 with no user (`:65`) | Case id header; `withCaseAccess` |
| law/explain | Plain explanation of one provision | 401 with no user (`:44`) | Used only inside a case (`AppliedLawPanel`, `ResearchPanel` through `ExplainProvision.tsx:29`): case id header; `withCaseAccess` |

The browser already has one helper that sends the case id header, `intakeGuidanceHeaders`
(`IntakeRecovery.tsx:96-99`). The callers above add it.

**Not gated (12 handlers):**

| Route | Method | Why |
|---|---|---|
| site-access | POST | The site password gate; no case. |
| canlii/case | GET | CanLII metadata by citation; signed-in only, with its own daily allowance (`:26-27`); no case, no AI. |
| cases | GET | Reads the person's own cases. |
| cases | DELETE | Deletes the person's own case and its files. |
| cases/chat | GET, DELETE | Reads or clears their saved chat. |
| cases/events | GET | Reads their saved events. Today wrapped in wCG (`:380`), so it needs a "read only" option there. |
| workspace/documents | GET, DELETE | Lists or deletes their uploads. |
| workspace/documents/link, documents/file | GET | A one-minute link to, and the serving of, their own file. |
| workspace/export | GET | Exports everything held about them. Today wrapped in wCG (`:198`); also needs the "read only" option. |

### C4. One test that cannot miss a route

A new suite, `test:case-access-gate`. It costs nothing: no model, no network, and the database is
faked.

1. **The list is the source of truth.** One exported list, beside the gate (for example
   `src/lib/security/caseAccess.ts`). It holds every `METHOD /api/path` with its class: `gated`,
   `read-own` or `never`, and a one-line reason for the last two.
2. **The suite walks `app/api` for `route.ts` files,** the same way `verifyAiRateLimit.ts:155-158`
   already does. It reads each file's exported methods and **fails** if a handler is missing from
   the list, or if the list names a handler that no longer exists. A new route therefore fails CI
   until someone decides its class.
3. **For each `gated` handler,** it calls the handler with:
   - a signed-in stand-in user;
   - a case that user owns;
   - access `none`.

   It expects a 403 with `CASE_ACCESS_REQUIRED`, and a body with no case fields. A spy on the
   inner handler proves **the inner handler never ran** (so no model call). The wrappers already
   take stand-ins for their dependencies (`intakeGuidanceGate.ts:21`, `overrides`), so this needs
   no real database.
4. **It must be able to fail.** It checks itself on a fake route that skips the gate, and expects
   that route to be reported. It also checks that the same call with access `beta` reaches the
   inner handler. So it cannot pass simply because everything is refused.
5. **One real check on staging.** It runs in the existing browser workflow, with a real staging
   account whose case is set to `none` by the service role. It tries one AI route and one direct
   browser update, and expects both refused. This catches a missing row rule, which the offline
   suite cannot see.

This follows CLAUDE.md s. 5: it asserts a property (every handler is classified, and every gated
one refuses), not today's list of names.

### C5. What the payment step will need later (not built now)

- **A hosted checkout** (the payment provider's own page), so no card number reaches our servers
  or logs.
- **Webhooks.** The provider tells our server that a payment succeeded, and only then is the
  case's status set to `paid`. The webhook:
  - checks the provider's signature on every call, and refuses an unsigned one;
  - is **idempotent**: the same event received twice changes nothing the second time (keep each
    event's id);
  - writes `case_access` through the service role.
- **A test mode** with the provider's test keys, on staging only, before any real charge.
- **Refunds.** What a refund does to access (`none` at once? at the end of a period? never for a
  case already in progress?) is **a business decision for the owner**. The webhook carries it
  out.
- **Tax.** Whether and when CourtSimplified must register for and charge Ontario HST, and at what
  rate: **a question for an accountant.** This plan states no tax rule.
- **Receipts:** sent by the provider or by us, with what the accountant says a receipt must show.
- **Where the keys live:** the server's environment only (Vercel environment variables, separate
  for Preview and Production). **Never in a file, a commit, a log or a chat.** CLAUDE.md s. 1
  applies to payment keys exactly as to every other secret.
- **Terms of sale and the refund policy:** for the owner and advisers.

### C6. Test accounts for the demo (staging only)

- **Recommended: the owner makes them by hand** in the Supabase dashboard for **staging**
  (`icpvzwxyjsdgyqfkwycw`). Go to Authentication, then Add user, then Create new user, and tick
  auto-confirm. The owner types the password there. It is never written to a file, a command line
  or a chat.
- **Beta access comes by itself.** Once the migration is applied, every case the account creates
  gets `beta` from the trigger (C1), so there is no second step. Before the migration, there is no
  gate, so nothing is needed.
- **If a script is wanted later:** it creates the user with confirmation already done and **no
  password**, and sends the owner a "set your password" email to an address the owner controls,
  using the existing `/reset-password` page. It refuses production, as the harness already does
  (`tests/browser/harness/realTestSession.ts:25`, `assertNotProduction`). The harness's own
  accounts use passwords made in memory and never stored (`realTestSession.ts:122`, `:179`), and
  that rule stays.
- **For the owner:** which site the demo runs on.
  - **Preview** points at staging (`docs/infra/projects.md:192-193`), and staging accounts work
    there.
  - **Production** would need production accounts. That is a change to production and needs the
    owner's go-ahead (CLAUDE.md s. 6).
  - Staging **requires email confirmation** (`docs/infra/projects.md:186-195`). So
    dashboard-made accounts must be auto-confirmed, or they cannot sign in.

---

## D. Free and paid, screen by screen

- **Free:** works with no account.
- **Account:** needs a free account.
- **Access:** needs access on the case (`beta` now, `paid` later).

| Screen | Free / Account / Access | Someone without access sees |
|---|---|---|
| Home page (`app/page.tsx`) | Free | — |
| Court choice (court cards, "Not sure" finder) | Free | — |
| The no-save check (B4) | Free | — |
| Guides, glossary, forms catalogue (`/forms`), courthouses, legal principles, about, privacy, support | Free (unchanged; static pages) | — |
| Sign-up / sign-in (`app/login/page.tsx`) | Free | — |
| My cases (`/dashboard`) | Account | Their cases, each marked "Access needed" where it applies; "Start a new case" |
| **New case, then "Tell us your story"** | Access | During beta: never shown (every new case has `beta`). Later: "Your story and everything after it are part of the case service" and the price, with a Continue button to the hosted checkout. Nothing typed is lost, because nothing has been typed yet. |
| "Here is what we understood" | Access | Not reached |
| Questions one at a time (all courts) | Access | Not reached |
| Review ("Confirm my initial information") | Access | Not reached |
| Case page: overview, step panel, "What we have so far", timeline | Access for anything new; **what is already saved stays readable** (C1) | Their saved information, with the AI and next-step controls replaced by one line: "This case does not have access. Your saved information is shown; nothing new can be added." |
| Forms tab and form filling (`generate-form`) | Access | The forms catalogue (free); no filling from the case |
| Next steps (step answer, deadlines, procedures) | Access | The line above |
| Chat (`CourtAssistantChat`) | Access to ask; their past chat stays readable | Past messages; the ask box replaced by the line above |
| Law lookup in a case (`assistant/law`, "Explain this") | Access | The provision's official text and link (free), without the AI explanation |
| Documents: upload, read, analyse, exhibit book | Access to add or analyse; **open, download, delete and export stay free** | Their files, with Open, Download and Delete |
| Export everything (`workspace/export`) | Account | — (never gated) |
| Delete case | Account | — (never gated) |

---

## E. The recommended order, with days

All days are **estimates**. "Days" means working days of build and check, one PR at a time, with
the PR queue at three or fewer (owner, 28 Oct).

| Step | What | Days (estimate) |
|---|---|---|
| 0 | **PR #536, claim type** (in progress). Finish and merge first. | already under way |
| 1 | **(g) Tests wait on the save**, not on polling. The carry test polls every 3 seconds today (`carry-end-to-end.spec.ts:532-538`). The save-status element carries the saved revision, and tests wait for it. | 2–3 |
| 2 | **Guest removal (B)**, in two PRs. **2a:** delete the guest paths (B2), make the case at "Start a new case", move the acknowledgement to sign-up, and fix the sign-up message (F2). **2b:** convert the guest carry runs and specs to signed-in, with the one-time relabel rule (B3a). | 4–6 |
| 3 | **The tab-copy rule with the draft handling, (a)+(f)**, at `IntakeRecovery.tsx:200`. The saved record wins; unsent edits sit on top, marked, and are offered back ("Not saved yet: Save / Discard"); a conflict is merged per fact. | 3–6 (was 4–6 + 2–3, smaller after step 2) |
| 4 | **The access gate (C).** Write the migration (the owner applies it, staging first); add the shared check and `withCaseAccess`; tie the 7 case-less AI routes to the case; add the route-list suite; add the row rule. | 4–6 |
| 5 | **Fact states (b)**, carried by the stage conversion. | 2–3 |
| 6 | **The question engine (c).** | 5–8 |
| 7 | **The old readers (d)**, retired inside each per-fact conversion (stage, dates, amount, other party), not as a separate project. | 8–15, spread |

**Total: about 28–47 days (estimate)**, against 23–38 for the case store alone. Guest removal and
the gate add about 8–12. Guest removal takes about 1–3 off step 3.

### Why guest removal comes before the tab-copy rule

**For removing guests first.** The tab-copy rule must decide what a tab copy *is*. Today there are
three kinds:

- a guest's whole case (its only copy);
- a carried intake with no case yet;
- a signed-in person's unsent edits.

Each has its own branches in `IntakeRecovery.tsx` (C1-C11). After guest removal there is one kind,
and with the case created at "Start a new case" (B5) there is always a saved record to sit on top
of. Rule 2 ("the tab is a buffer of unsent edits, never a source of answers") then becomes true by
construction, not by special cases. Doing the tab-copy rule first would mean writing, testing and
then deleting the guest and carried branches.

**Against.** Guest removal changes many tests (B3) and all seven guest carry runs. Changing the
carry runs while the save rule also changes would make it hard to tell which change moved a count.

**Decision: guest removal first, right after (g).** The test-waiting fix (g) makes the carry runs
reliable before they are converted. Converting them (2b) before the tab-copy rule means the rule
is then judged against a stable, all-signed-in baseline. The risk of losing coverage is handled by
converting, never deleting (B3a).

### Where the gate fits

The gate goes **after** guest removal: the 7 case-less AI routes can only be tied to a case once
the case exists before the story (B5). It goes **before** the deeper case-store work, so that new
routes added during (b) to (d) are born inside the gate and its suite. The gate's server code
touches routes. The tab-copy rule touches `IntakeRecovery.tsx`. They share no files, so they could
run side by side if the owner wants. The queue limit of three still applies.

### The demo (9 Nov, a target, not a deadline)

There are 10 calendar days from today. Realistically:

- #536;
- (g);
- guest removal (2a, and 2b if it goes well).

The gate and the tab-copy rule would follow the demo. During beta the gate changes nothing a
person sees (every case has `beta`), so the demo does not depend on it. The per-fact conversions
(stage, dates, amount, other party) continue throughout, each with its carry test, as in
`docs/CASE_SIZE_PLAN.md`.

---

## F. Risks

### F1. People leaving at the account wall

Asking for an account before the story will lose some visitors. That is the cost of decision 1.
What reduces it:

- **The no-save check (B4)** answers the visitor's first question ("is this the right place, and
  which court?") before asking for anything. A visitor who signs up already knows the site covers
  their kind of matter.
- **A short sign-up:** email, password, the one acknowledgement box. Nothing else.
- **Nothing typed is lost:** the story box comes *after* sign-up, so there is never a story to lose
  at the wall. Today's carry exists only because guests typed first.
- **Measure it:** count, per day, visitors who finish the check, start sign-up, and finish sign-up
  (counts only, no personal data). Without numbers, this risk cannot be judged.

### F2. Email confirmation: if mail fails, nobody can sign up

- **Production requires email confirmation, and depends on Resend delivering** (CLAUDE.md s. 6).
  With guests gone, sign-up is the only way in. If mail stops, **no new person can start**.
- **The sign-up page is wrong for that setting today.**
  - Its comment says no confirmation email is sent (`app/login/page.tsx:87-98`).
  - When Supabase returns no session (which is what happens when confirmation is required), it
    says "Account created. You can sign in with those details now." (`:109`). But sign-in fails
    until the email link is clicked.
  - This exact confusion was seen with an outside tester on staging (`docs/infra/projects.md:186-195`).
  - **Fix it in step 2a:** "Check your email and click the link to finish creating your account".
    Add a "send it again" button, and say what to do if it does not arrive.
- **What to monitor:**
  - Resend's delivery and bounce counts.
  - Supabase's auth logs for sign-ups.
  - A daily count of accounts not confirmed within an hour. A rising count means mail is failing.
  - Supabase's email rate limits. Staging hit `over_email_send_rate_limit` (`projects.md:192`),
    and the master plan notes a shared limit of 30 an hour (`MASTER_PLAN.md`, build order 6D).
    Production uses Resend's SMTP, but check which limit applies to it before any launch.
- Staging also requires confirmation, so a browser test that signs up through the form (the new
  B3a runs) must confirm through the admin API or use auto-confirmed accounts.

### F3. An account, but a failed save

- With guests gone, every person has an account, but a save can still fail: a network drop, a
  conflict with another tab, or a refused write.
- Today the edit stays in the tab, marked `pending` (`intakeCheckpoint.ts:30-31`), with a
  warning and a retry. On reload, though, it is **applied silently** as if saved
  (`IntakeRecovery.tsx:200`).
- Step 3 (the draft handling, (f)) changes that. The unsent edits are shown as "Not saved yet",
  with Save and Discard, and never applied without the person choosing.
- Until step 3, the risk is the same as today's, no worse.

### F4. The beta wording: the Law Society (A2I sandbox) and the insurer

**For the owner and advisers. This is not legal advice, and I have not written the final
wording.**

- **What the acknowledgement must do, per decision 1:**
  - say that CourtSimplified is not a law firm;
  - say it does not guarantee an outcome;
  - be recorded per account, with the version and the exact text shown (C1). The current one is
    per browser and is not a record (`acknowledgement.ts:12-21`).
- **What it must not do:**
  - **Claim an approval the site does not have.** Do not mention the Law Society's A2I sandbox
    until the approval exists and covers what is described.
  - **Claim a review that does not happen.** There is no licensed reviewer yet, by the owner's
    choice (CLAUDE.md s. 2).
  - **Contradict what the site actually does.** CLAUDE.md s. 2 has the site "guide like a lawyer":
    it applies the law to the person's facts and suggests wording. Wording such as "general
    information only, never applied to you" would not match. **The advisers should reconcile the
    notice with that rule.** The current text ("guides me through the court process but is not my
    lawyer", `FirstUseAcknowledgement.tsx:117-118`) is closer.
  - **Grade or promise anything about the case** (CLAUDE.md s. 3).
- **Two more points:**
  - **Paid later.** The wording for a paid service (what the fee buys, what happens on a refund)
    is a separate review, before charging starts.
  - **The insurer.** The services described in the policy should match the services the site
    offers, including the paid intake once it exists. Ask the insurer before the wording is final.

---

## What I could not determine

- **Which carry entries come only from guest-specific steps** (the mid-run sign-in, the carry, the
  second "I understand"). The baseline records the screen and fact, not the step, so the
  after-conversion estimate (about 134, range 120 to 134) is a range, not a count.
- **Whether the 15 specs with no named sign-in helper actually run as visitors.** Each needs
  reading in the guest-removal PR.
- **The production email limits** under Resend's SMTP, and whether the 30-an-hour figure applies
  to production. To be checked in the dashboards before launch.
- **Whether the demo runs on Preview (staging) or production.** This decides where the demo
  accounts are made (C6).
- **Line numbers after #536 merges.** Every `file:line` here is from `origin/main` at 14e58e93.
