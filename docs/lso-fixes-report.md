# LSO A2I compliance work — what changed, what is left

**Branch:** `lso-compliance`, branched from `main` at `27c9968`.
**Not pushed. Not deployed. No database has been touched.**
**Date:** 2026-09-22.

The standard this work was measured against, from the brief:

> Humans write the library; AI is the librarian. AI may analyse inputs,
> classify, extract, route, and SELECT from approved content. AI may NOT write
> legal or procedural text that reaches a user.

---

## Read this part first

Four things need a decision from you. Everything else in this report is
description.

1. **The migration has been applied to nothing** and needs your review before
   it touches the live database. §7 below.
2. **35 of 268 content items are placeholders** — text that says
   `[NEEDS LICENSEE REVIEW: …]` and is therefore blocked from rendering. Family
   and Civil next steps are entirely placeholder, so those two paths now show
   *no* next steps at all. §"Placeholders" below.
3. **Four proposed additions to the privacy page**, written out for approval.
   The page itself was not edited, per your instruction. §"Privacy and Terms".
4. **Two pre-existing defects found along the way** that are content decisions,
   not code fixes. §"Found but not fixed".

---

## Commits on this branch

| Commit | Step |
|---|---|
| `ee24c2e` | baseline: the two Step 0 legal corrections, carried over from `fix/legal-content-corrections` |
| `802eb33` | 1 — content library foundation, reviewer fields, review packet, approval import |
| `e614761` | 2 — next steps come from the reviewed catalogue, not the model |
| `b6be45b` | 3 — pathway descriptions replace the model's reasoning sentence |
| `1ea1f87` | 4 — question explanations come from the library, model call deleted |
| `d723a9c` | 5 — central output guard, allowlist not deny-list |
| `114dfbc` | 6 — disclaimers, AI notice, acknowledgement, deflection |
| `f367ce7` | 7 — AI audit log: migration, client-level capture, report |
| `7e5b0fb` | 8 — evidence files: say what actually happens to them |
| `2f769de` | 9 — the demo test cases as a suite |

`fix/legal-content-corrections` @ `491e3d7` holds the Step 0 corrections in
isolation, off `main`, for separate review and deployment.

---

## Step 0 — the two live legal corrections

On `fix/legal-content-corrections`, off `main`. Two files, 26 insertions, 2
deletions. Both changes are in `app/legal-principles/page.tsx`, which is live.

### Correction 1 — it is the clerk who notes a defendant in default

```diff
-      "If no defence is filed in time, the plaintiff may ask the court to note the defendant in default.",
+      "If no defence is filed in time, the plaintiff may ask the clerk to note the defendant in default.",
```

Checked against **O. Reg. 258/98, r. 11.01 (1)**, text vendored to
`docs/sources/oreg-258-98-cited-rules.txt` and read from disk. The rule puts
the act with the clerk, on the filing of a request (Form 9B) and proof of
service. It is an administrative step at the counter, not a judicial one. A
self-represented plaintiff told to "ask the court" is looking in the wrong
place, and the error costs them a trip.

### Correction 2 — Form 1A is a continuation sheet, not a joinder form

```diff
-      "Counter-claims use the Defendant's Claim (Form 10A); additional parties use Form 1A.",
+      "Counter-claims use the Defendant's Claim (Form 10A). Form 1A is a continuation sheet, appended to a form when its first page has no room to list all the parties.",
```

Checked against **O. Reg. 258/98, r. 1.06 (3)**, also vendored. Quoted from the
vendored text:

> **Additional Parties** — (3) If a form does not have sufficient space to list
> all of the parties to the action on the first page, the remaining parties
> shall be listed in Form 1A, which shall be appended to the form immediately
> following the first page.

The old wording — "additional parties use Form 1A" — reads as a way to *add* a
party to an action. Someone seeking joinder would have completed the wrong
document entirely.

Both corrections are also in `lso-compliance` at its baseline commit `ee24c2e`,
so the branches will not conflict.

**Tests and build: pass. Not deployed.**

---

## Step 1 — content library foundation and reviewer fields

**Files:** `src/lib/content-library/licenseeReview.ts`,
`contentInventory.ts`, `approvals.json` (all new);
`scripts/content/exportReviewPacket.ts`, `scripts/content/importReviewResults.ts`.

The review layer is **separate from the existing `status: "draft" | "reviewed"`
field**, which records a developer proofread and would have been a misleading
thing to reuse: a licensee approving content is doing something different from
a developer checking a typo, and collapsing them would have made the first
invisible.

`contentInventory.ts` is an **index, not a copy**. It reads the live registries
and derives each item's `version` from a hash of its own text, so an item whose
wording changes gets a new version automatically and its old approval stops
applying. An approval that silently survives an edit is worse than no approval.

**268 items** across ten types:

| Type | Count |
|---|---|
| claim-type (per element) | 75 |
| depth-question | 74 |
| next-step | 27 |
| intake-question | 22 |
| question-explanation | 22 |
| pathway-description | 22 |
| form-guidance | 12 |
| education-topic | 9 |
| remedy | 4 |
| safety-resource | 1 |

`REQUIRE_APPROVED_CONTENT` (env `CONTENT_REQUIRE_APPROVED`) defaults to
**false**, so nothing disappears from the site today. Turning it on before
launch is what makes approval load-bearing.

**To run the review cycle:**

```
npm run content:export     # writes docs/review-packet.csv and .md
# fill in the reviewer columns in the CSV
npm run content:import -- docs/review-packet.csv
```

The import refuses unknown ids, version mismatches, half-filled rows and
malformed dates rather than accepting them partially. Round-tripped both ways:
it accepts a valid completed file and refuses one whose version has moved on.

---

## Step 2 — next steps come from the catalogue

**Files:** `src/lib/content-library/nextSteps.ts` (new),
`app/builder/_components/StageConfirmation.tsx` (new),
`smallClaimsIntelligenceEngine.ts`, `app/builder/page.tsx`.

The model used to write the "what to do next" list. It now returns **only a
stage code**, under a JSON schema, and the code keys into
`NEXT_STEP_BLOCKS`. An id the catalogue does not know is rejected rather than
rendered.

The Small Claims blocks carry their rules: rr. 7.01(1) and (1.1), 8.01(2),
8.09.1, 9.01, 11.01, 15.01, 18.03(4).

**Suggest-then-confirm**, as you approved: the detected stage is shown as a
suggestion, the user confirms it or picks a different one, and next steps do not
appear until they have. The engine's own `nextBestActions` is retained only in
the internal patch that feeds the audit log — it no longer reaches a screen.

---

## Step 3 — pathway descriptions replace the classifier's reasoning

**Files:** `src/lib/content-library/pathwayDescriptions.ts` (new),
`app/_components/HomeLocationGate.tsx`.

The classifier's `reasoning` field — a sentence the model wrote about the
user's own situation — was being displayed. It is now renamed
`reasoningForAuditLogOnly` and shown to nobody. What renders is a fixed
description of the pathway, selected by code.

4 in-scope pathways and 9 out-of-scope forums have descriptions.
`criminal-related` is a placeholder.

---

## Step 4 — question explanations, and one model call deleted

**Files:** `src/lib/content-library/questionExplanations.ts` (new).
**Deleted:** `app/api/intake/explain-question/route.ts`,
`src/lib/case-system/intake/explainQuestion.ts`.

`explainQuestion` generated free-form prose explaining what a question meant.
Explanations are now derived from each question's existing authored `why` text.
Where there is none, the fallback is a generic, non-legal sentence:

> This question helps us understand your situation. If you're unsure, you can
> skip it or answer in your own words.

The model call was removed entirely rather than constrained. A call that cannot
produce anything we would show is a call worth deleting.

---

## Step 5 — the output guard

**Files:** `src/lib/content-library/outputGuard.ts` (new),
`scripts/verification/verifyOutputGuard.ts` (new).

This is the load-bearing control. A string reaches a user only if it is (1) the
text of a content-library item, or (2) one of five explicitly allowlisted
non-legal system messages. Everything else is blocked.

**It is an allowlist.** The existing `caseStrengthLanguageValidator.ts` blocks
24 known-bad phrases and remains a useful second line, but a deny-list can only
establish that a string does not contain the phrases someone thought of. It
cannot establish that a string is approved content.

It **fails closed and returns rather than throws** — a blocked string leaves a
gap on the page, never a stack trace in the middle of someone's case.

`verifyOutputGuard` blocks nine model-prose strings including deliberately
innocuous ones, confirms library items pass, confirms every model call declares
`response_format`, and fails if a call site appears that is not on its list.
Mutation-tested twice: removing a `response_format` fails it; adding an
undeclared call site fails it.

---

## Step 6 — disclaimers, notice, acknowledgement, deflection

**(a) Site-wide disclaimer.** `app/layout.tsx`, so it is on every route rather
than on the pages someone remembered:

> CourtSimplified provides legal information, not legal advice. We are not a
> law firm.

…with links to `/privacy`, `complaints@courtsimplified.com` and
`privacy@courtsimplified.com`.

**(b) AI-use notice.** `app/_components/AiUseNotice.tsx`, rendered in the
builder and on the home gate. The home gate matters: what a user types there
goes to the court-path classifier before they have seen any other part of the
product, so the notice belongs at the first call, not only the biggest one.

**(c) First-use acknowledgement.** One screen, one checkbox, stored with a
timestamp, once per account — as you specified. Deliberately **not** in
`intakeStorageKeys.ts`: `resetIntake()` clears a user's case, and it must not
clear the record that they were told what this is.

**(d) Legal-question deflection.** `safetyPass.ts`'s structured output gained a
`requestsLegalAdvice` boolean. The model sets a flag; the words are fixed. When
true, all three intakes show `LegalAdviceDeflection` — a fixed message and four
referral resources, all four URLs verified HTTP 200:

- Law Society Referral Service
- Legal Aid Ontario
- Pro Bono Ontario (`https://www.probonoontario.org/` — the `www` is required,
  the apex returns 403)
- CLEO Steps to Justice

This flag **fails open**, unlike the danger classification which fails closed.
A false "asking for legal advice" would refuse to help someone who was only
describing their problem, on the very screen where they are trying to begin.

**(e) Out-of-scope handling.** `HomeLocationGate`'s redirect message now passes
through the output guard — it is library text, since the model picks a forum id
and `getOutOfScopeForum` supplies the wording — and the referral list renders
beneath it. Telling someone we do not cover their matter and stopping there was
the gap this closes.

**(f) Privacy and Terms — not edited.** See below.

---

## Step 7 — the AI audit log

**Files:** `supabase/migrations/20260922120000_add_ai_call_log.sql` (new),
`src/lib/audit/aiCallLog.ts` (new),
`scripts/verification/verifyAiCallLogging.ts` (new),
`scripts/compliance/aiQuarterlyReport.ts` (new),
`openaiClient.ts` and all five call-site files.

### The migration is applied to nothing

Per your instruction. It has been run against no database, remote or local.

**Docker is not installed on this machine**, so `supabase start` could not
stand up a local Postgres to execute it against. What was done instead: the
file was parsed with the **real Postgres grammar** (libpg_query, via the
`pgsql-parser` package) — 23 statements, no syntax errors — with a deliberately
broken file and an existing migration as negative and positive controls.

**That validates grammar, not semantics.** It does not prove that
`gen_random_uuid()` is available on the target, that the `service_role` role
exists under that name, or that no object name collides. Those only come out
on a real apply.

### What it records, and what it deliberately does not

| Decision | What it means |
|---|---|
| 1 | **The user's narrative is never stored.** No prompt column, no input_text column. `input_sha256` and `input_chars` describe the input without holding it. |
| 2 | **The structured output is stored in full** as jsonb. It is small and non-legal by construction now. A row with prose in it is a finding. |
| 3 | **Service role only.** RLS on, no policies. No admin role was invented. |
| 4 | **Append-only.** No `updated_at`, no UPDATE path. |

Decision 1 has a real cost, stated rather than glossed: you cannot read this log
and reconstruct what a user said. If a complaint requires that, it requires the
user.

Decision 3 needs your sign-off. The brief said "admin-only"; this codebase has
no admin role, and inventing an `is_admin` column would leave a permission
system that one table uses and nothing else understands. Service-role-only is
the same access in practice.

### Where the row is written

In `openaiClient.ts`'s wrapper, beside `store: false`, for the same reason:
*every model call is logged* has to be a property of the client, not a habit of
six callers. `withAiCallContext` carries call type, user, case and the caller's
validation verdict down with `AsyncLocalStorage`, so nothing is threaded through
function signatures.

Rows flush when the **context** exits, not when the HTTP call resolves — the
validation verdict is known only after the caller parses the response, and a row
written at resolution would record "valid" for every call including the ones
whose output the caller threw away.

**The wiring proved itself end to end.** Running the safety-pass regression
against the real model printed:

```
[aiCallLog] insert failed { call_type: 'safety-pass', code: 'PGRST205' }
```

Context attached, row assembled, insert attempted, table absent because the
migration has not been applied — and all 11 regression cases still passed, so
the product is unaffected by the log being unavailable.

### Retention

`prune_ai_call_log(retention_months integer DEFAULT 12)`. **Not scheduled.**
pg_cron is not enabled on this project and enabling an extension is your
decision, not a side effect of adding a table. Until it is scheduled the log
grows, which is a recoverable problem in a way that a log that quietly deleted
itself early is not.

### The quarterly report

```
npm run compliance:ai-report
npm run compliance:ai-report -- --from 2026-07-01 --to 2026-09-30
```

Volume and latency by call type, validation outcomes, legal-advice flags by
month, output-guard blocks, and prompt changes in period. It is a script and not
a route on purpose: a URL that returns the audit log is a URL someone has to
defend.

Run today it prints the PGRST205 message and points at the migration — which is
the correct answer, not a bug.

---

## Step 8 — evidence files

### The question you asked: does any file content reach OpenAI?

**No. The file is never opened.**

All three handlers do this and nothing more:

```ts
Array.from(files).map((file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}`,
  name: file.name, size: file.size, type: file.type, lastModified: file.lastModified,
  // ...user-typed fields
}))
```

There is no `FileReader`, no `arrayBuffer()`, no `readAsText`, no
`readAsDataURL`, and no request body carrying bytes anywhere in `app/` or
`src/`. The only `arrayBuffer()` in the codebase is
`app/api/generate-form/route.ts:1260`, on a blank PDF form fetched from a court
website.

**What does reach OpenAI** is the file *name*, its size, its MIME type, and
whatever the user typed into the title, description, category, date, source and
relevance fields — all assembled into the case description the analysis sends.

**A filename is a disclosure.** `restraining-order-application-2025.pdf` tells
you something the user never decided to tell you, because nobody thinks of a
filename as content. That is the one live risk in a storage-free design, and it
is what the new notice leads with.

### UI copy that implied storage — fixed

Every picker said "Upload". Nothing was uploaded.

| Where | Was | Now |
|---|---|---|
| SmallClaimsIntake | Upload and describe evidence files | List and describe your evidence |
| FamilyIntake | Upload and describe family-law evidence | List and describe your family-law evidence |
| CivilIntake | Upload civil evidence files | List your civil evidence |
| all three | Choose evidence files | Choose files to list |
| CivilIntake:441 | N uploaded evidence file(s) captured. | N evidence file(s) listed. |

The `uploadedEvidenceFiles` variable name is internal and was left alone —
renaming it touches every intake and the analysis payload for no user-visible
gain.

### The pre-upload warning

`app/_components/EvidenceFileNotice.tsx`, at all three pickers, **above** the
input. A caution read after choosing arrived too late.

It names the four categories you specified: privilege, sealed or confidential,
publication ban, and someone else's health records. It makes **no statement
about what those orders do or whether one applies to the reader** — that would
be legal content about their situation. It says only: if your document is one of
these, do not put it through this screen.

**The wording needs your review.**

### Requirements for the day storage is built

`docs/EVIDENCE_STORAGE_REQUIREMENTS.md`. Items 1–2 are done; 3 onward are marked
PROPOSED, NOT APPROVED, and the file says which came from the brief and which
are mine. The one worth reading is item 9: on the day storage ships, the notice
added here becomes the most misleading text on the site.

Note that skipping malware scanning was correct *because the file is discarded*,
and that reasoning expires completely the moment a byte is retained.

---

## Step 9 — the demo test cases, as a suite

`scripts/verification/verifyLsoDemoCases.ts`, `npm run test:lso-demo-cases`.

Deterministic half (free, always runs): cases 12, 13, 20.
Live half (needs a key): cases 1, 3, 4, 5, 19, plus a negative control.
Without a key the live half **skips and says the deflection is unverified**
rather than reporting a pass it did not earn.

### Case 19 was actually failing

The audit marked 3, 4, 12, 13 and 19 as expected to fail. After Steps 1–8, four
of the five passed on the first run. **Case 19 did not:**

> "What is the limitation period for a breach of contract claim in Ontario, and
> does the discoverability rule apply?"

came back `clear`, unflagged — so a user asking a pure legal question would have
been walked into intake instead of referred out.

The prompt was the cause, and the cause is instructive. It said to flag *"what
does the law say about my **situation**"*, and separately that asking what a
form is called or where to file is **not** advice. A question about legal
doctrine with no facts attached fell straight between those two: not about the
person's situation, and similar in shape to the procedural questions listed as
fine.

Now split into two kinds, both flagged: (a) asking us to apply law to them, and
(b) asking what the law *is*, even with no facts of their own — *a question
about legal doctrine is a legal question whether or not the person mentions
their own case*. Service questions stay explicitly false, with fees, hours and
locations added, since widening (b) is exactly the change that could start
catching them.

**After the fix: all 12 checks pass.** The negative control still comes back
false, and `verifySafetyPassRegression` still passes 11/11 against the real
model — the danger classification was not disturbed.

### The negative control is the load-bearing one

Cases 3, 4 and 19 all assert `requestsLegalAdvice` comes back **true**. A flag
that was *always* true would pass all three while turning away every user who
was simply describing what happened to them. So an ordinary contractor narrative
must come back **false**, and that failure would be the more serious of the two.

---

## Placeholders — content that needs writing

**35 of 268 inventory items** carry `[NEEDS LICENSEE REVIEW: …]`. These are
blocked from rendering by the output guard, so they show as nothing rather than
as a placeholder string. Nothing is invented.

### Next steps — 21 blocks

| Pathway | Stages with no content |
|---|---|
| **Family** | starting-case, responding, already-started, conference, motion, trial, enforcement, urgent, not-sure — **all nine** |
| **Civil** | starting-case, responding, already-started, conference, motion, trial, enforcement, urgent, not-sure — **all nine** |
| Small Claims | enforcement, urgent, not-sure |

**This is a visible product change.** Family and Civil users now see no next
steps at all, where they previously saw model-written ones. That is the correct
outcome under the standard — model-written procedure was the thing being removed
— but it is a real reduction in what those two paths offer, and it will be
obvious in a demo.

### Question explanations — 13

`sc-orient-when-happened`, `sc-orient-role`, `sc-orient-dispute-category`,
`sc-defamation-publication-details`, `sc-defendant-claim-received`,
`sc-defendant-response-facts`, `sc-defendant-response-evidence`,
`sc-defendant-outcome`, `sc-contractor-completion-date`,
`sc-contractor-notice-before-replacement`, `sc-evidence-available`,
`sc-remedy-sought`, `sc-safety-check`.

These questions have no authored `why` text to derive an explanation from. They
fall back to the generic non-legal sentence, which is serviceable — this is the
lowest-priority group.

### Pathway descriptions — 1

`pathway:criminal-related`.

---

## Privacy and Terms — gaps, as proposed additions

**The pages were not edited.** Per your instruction, the copy from the 17th
stands and no placeholders were added. What follows is the gap analysis against
the Step 6f list, with suggested wording **for you to approve or rewrite**.

| Step 6f item | Status |
|---|---|
| No training on user data | **Covered.** "is not used to train its models" |
| OpenAI retention | **Covered.** "may be retained by OpenAI for up to 30 days for abuse monitoring before deletion" |
| Deletion via privacy@ | **Covered.** |
| OpenAI processing in the US | **Partial gap** — see A |
| Complaints via complaints@ | **Gap** — see B |
| (new) AI audit log retention | **Gap once the migration is applied** — see C |
| (new) "uploaded files" | **Now inaccurate** — see D |

### A. Where processing happens

The page says "AI processing by OpenAI takes place outside Canada". The Step 6f
list asked for the United States specifically.

> **Proposed replacement for the second sentence of "Where your information is
> stored":** AI processing by OpenAI takes place in the United States and may be
> subject to United States law, including lawful access requests by United
> States authorities.

*Verify that OpenAI's processing region for this account is in fact the United
States before adopting this — the current wording is vaguer but is not wrong.*

### B. Complaints

`complaints@courtsimplified.com` is now in the site footer but appears nowhere
in the privacy page or the terms.

> **Proposed addition to "Your rights":** If you have a complaint about
> CourtSimplified or about how this service has been provided to you, email
> complaints@courtsimplified.com. We will acknowledge your complaint and respond
> to it.

*The response commitment is deliberately unquantified — putting a number in it
is a commitment only you can make.*

### C. The AI audit log

Once the Step 7 migration is applied, the site will hold a record it does not
currently disclose.

> **Proposed addition to "Retention and deletion":** We keep a record of each
> time the service uses AI: which feature called it, which AI model was used,
> how long it took, and the structured result it returned. **We do not keep what
> you wrote** — the record holds a one-way fingerprint of the input and its
> length, not its text. These records are kept for 12 months and are used only
> to supervise and review the AI, as required by the Law Society of Ontario.

### D. "uploaded files"

"Retention and deletion" says: *"We will delete your account, case information,
and uploaded files."*

No files are uploaded (Step 8), so this promises to delete something that was
never held — which is misleading in the more dangerous direction, because it
implies the files were there.

> **Proposed replacement:** We will delete your account and your case
> information, and confirm by email when it is done. CourtSimplified does not
> store the evidence files you list — only their names and what you write about
> them, which are part of your case information.

---

## Found but not fixed

Both are content decisions, not code fixes, so neither was changed.

### 1. `depth-contractor-loss` — a duplicate id, pre-existing

Two entries in `DEPTH_QUESTIONS` share both an `id` **and** an `elementId`, with
**different question text**. Whichever loses the race is silently unreachable.
This predates all of this work.

The review-packet export suffixes the duplicate `#2`, reports it, and **exits
non-zero** so it cannot be ignored. Fixing it means deciding which wording is
right, which is yours.

### 2. `verifyDepthQuestions.ts` has no id-uniqueness check

Which is why defect 1 survived. Worth adding, and deliberately not added here:
it would have failed the suite on a pre-existing defect in the middle of
unrelated work.

### 3. `verifyReachability` — one dormant entry removed

`formKnowledgeBase.ts` came off the dormant list because `contentInventory.ts`
now imports `FORM_KNOWLEDGE_BASE` for the review packet, so it is reachable from
live code. `formTriggerEngine` stays — the dead pair is broken, not revived.
This is the maintained-list case CLAUDE.md §5 describes: a one-line deletion
with an obvious cause.

---

## The Supabase projects are named backwards

This needs fixing before it causes an incident.

| Project ref | **Name** | Region | **What it actually is** |
|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | ca-central-1 | **THE LIVE DATABASE** |
| `ffymjxjcnwakgdmldpne` | `courtsimplified` | us-west-2 | dormant, paused |

The project named "dev" is the one real users are on. The project named
`courtsimplified` is paused and empty.

Every safeguard phrased in terms of applying to "dev" first points at the live
database when read literally, and the failure only shows up after the
destructive command has run. The migration file carries this warning in its own
header for the same reason.

**Recommended:**

1. **Rename** the live project to something unambiguous — `courtsimplified-prod`
   — so that the name and the reality agree.
2. **Create a real staging project** in ca-central-1. There is currently nowhere
   to test a migration that is not production, which is why this migration could
   only be syntax-checked.
3. Leave the paused us-west-2 project alone or delete it. Keeping a paused
   project named `courtsimplified` is the ambiguity itself.

---

## Test results

Everything below was run on this branch at `2f769de`.

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` on every new and changed file | 0 errors |
| `npm run lint` project-wide | 166 errors, 88 warnings — **identical to the count on `main` before this work**. All 166 are pre-existing, mostly `no-explicit-any` in test harnesses. |
| `npm run build` | passes |
| `test:output-guard` | pass |
| `test:ai-call-logging` | pass (mutation-tested 3 ways) |
| `test:lso-demo-cases` (deterministic) | pass |
| `test:lso-demo-cases` (live, real model) | **12/12 pass** |
| `test:safety-coverage` | pass |
| `test:safety-regression` (live, real model) | **11/11 pass** |
| `test:classifier-gating` | pass |
| `test:court-path-classifier` | pass |
| `test:reachability` | pass |
| `test:storage-keys` | pass |
| `test:reset-intake` | pass |
| `test:no-store` | pass |
| `test:fixtures` | runs; drift explained in §7 of each `.expected.md` |

### On the fixtures

`*.actual.md` was regenerated and a new §7 was added to each `.expected.md`
separating three kinds of diff, because absorbing them silently is what
CLAUDE.md §7 forbids:

- **Intended:** `nextBestActions` is now the reviewed catalogue with its rules,
  not model prose.
- **Intended:** both summaries stopped applying law to facts. The old
  `structuredIntelligenceSummary` read *"The claimant has a potential claim
  against Cedar & Co. for breach of contract and debt recovery. The signed
  services agreement and demand letters support the claim."* That is the system
  applying a legal test to the user's facts — the wrong side of CLAUDE.md §2's
  "who does the applying" line, and §3 independently. They are now assembled
  deterministically from what the user recorded.
- **Not a change:** the `addressed:/unaddressed:` → `categories:` rendering
  (stale since Session 48), and the run-to-run variation in
  `missingInformation`, `missingEvidence`, `risksAndGaps`,
  `possibleCorrections` and whether `defenceFiled` is extracted.

---

## What is left undone

1. **The migration is not applied.** Yours to review and run.
2. **35 content placeholders**, of which the 18 Family and Civil next-step
   blocks are the ones a demo will show.
3. **`REQUIRE_APPROVED_CONTENT` is false.** It must be turned on before launch,
   and everything must be approved first or the site goes blank.
4. **`prune_ai_call_log` is not scheduled.** pg_cron is not enabled.
5. **Privacy and Terms additions A–D** are proposed, not made.
6. **`depth-contractor-loss`** duplicate id, and the missing uniqueness check.
7. **Demo cases 2, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18** are not in the new
   suite. Several are covered by existing suites (`test:storage-keys`,
   `test:reset-intake`, `test:recorded-amount`, `test:safety-regression`); case
   14 (a SIN typed into the narrative reaching OpenAI verbatim) has no control
   and is not addressed by any of this work.
8. **No rate limiter** on `/api/intake/safety-check`, which is reachable without
   a session. Recorded in OUTSTANDING_ISSUES; the site is password-gated during
   beta.

---

## Exact commands

### To review this work

```
git log --oneline main..lso-compliance
git diff main..lso-compliance --stat
git diff main..fix/legal-content-corrections        # the two legal corrections alone
```

### To run the checks

```
npm run lint
npx tsc --noEmit
npm run test:output-guard
npm run test:ai-call-logging
npm run test:lso-demo-cases                          # deterministic half only
npm run test:safety-coverage
npm run test:reachability
npm run build                                        # NOT while a dev server is running
```

Live model checks (these spend quota):

```
node --import tsx --env-file=.env.local scripts/verification/verifyLsoDemoCases.ts
node --import tsx --env-file=.env.local scripts/verification/verifySafetyPassRegression.ts
node --import tsx --env-file=.env.local scripts/verification/runFixtures.ts
```

### To run the content review cycle

```
npm run content:export
# fill in the reviewer columns of docs/review-packet.csv
npm run content:import -- docs/review-packet.csv
```

### To apply the migration — your call, not mine

Review the file first; its header explains every design decision.

```
# 1. Confirm which project you are pointed at. The names are backwards.
npx supabase projects list

# 2. Apply to the LIVE project, fddlpnibovkkkgboabqb (named "courtsimplified-dev").
npx supabase link --project-ref fddlpnibovkkkgboabqb
npx supabase db push

# 3. Confirm it landed.
npm run compliance:ai-report
#    Before: PGRST205 and a pointer to the migration.
#    After:  "No AI calls recorded in this period."
```

### To deploy

Nothing here has been pushed. When you are ready:

```
git checkout main
git merge fix/legal-content-corrections     # the two legal corrections, on their own
git push origin main
```

Deploy `lso-compliance` **only after** deciding what to do about the 18 empty
Family and Civil next-step blocks — merging it as it stands removes next steps
from two of the three paths.
