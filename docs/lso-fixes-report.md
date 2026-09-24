# LSO A2I compliance work — what changed, what is left

**Branch:** `lso-compliance`, branched from `main` at `27c9968`.
**Not pushed. Not deployed. No database has been touched.**
**Dates:** Steps 0–9 on 2026-09-22; Items 1–4 and this revision on 2026-09-23.

The standard this work was measured against, from the brief:

> Humans write the library; AI is the librarian. AI may analyse inputs,
> classify, extract, route, and SELECT from approved content. AI may NOT write
> legal or procedural text that reaches a user.

---

## Read this part first

Six things need a decision from you. Everything else in this report is
description.

1. **The output guard does not do what this report previously said it did.**
   It is applied at two render sites, not across the product. An independent
   review found this and the claim has been corrected throughout. §"Independent
   review" and §"What the output guard actually covers".
2. **Nothing has been reviewed by a licensee.** That is unchanged and it is the
   long pole. The user-facing notices now say so explicitly, because they
   previously said the opposite.
3. **The migration has been applied to nothing** and needs your review before it
   touches the live database. §7, and §"Renaming the Supabase projects" for the
   step-by-step.
4. **Five proposed additions to the privacy page**, written out for approval.
   The page itself was not edited, per your instruction. §"Privacy and Terms".
   Two were revised on 2026-09-23 and a fifth added — do not adopt the earlier
   wording for the audit log.
5. **Phase 1 is Small Claims only.** Family and Civil are gated behind a fixed
   message plus referrals. The 18 placeholder blocks stay in the library as
   drafts for phase 2. §"Item 2".
6. **Two pre-existing defects found along the way** that are content decisions,
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
| `3bb5b3b` | **Item 1** — stop reading file names at all |
| `ac25a8b` | **Item 2** — phase 1 is Small Claims only, and says so |
| `06a3ee0` | **Item 3** — nothing says "dev" when it means production any more |
| `51621ca` | **Item 4** — independent review: the two headline controls did not hold |

`fix/legal-content-corrections` @ `491e3d7` holds the Step 0 corrections in
isolation, off `main`, for separate review and deployment.

**Steps 0–9 describe the state on 2026-09-22.** Items 1–4 are 2026-09-23 and in
three places they **supersede** what a Step section says. Each of those is
marked in place rather than silently rewritten, because a reader comparing this
document to the audit needs to see what changed and when:

- **Step 2** overstated how the stage is produced. Corrected in place.
- **Step 5** called the output guard "the load-bearing control". Corrected in
  place; see §"What the output guard actually covers".
- **Step 8** described file names reaching OpenAI. No longer true; see
  "Superseded" at the end of that section and §"Item 1".

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
**false**, so nothing disappears from the site today.

> **A correction.** This used to end "turning it on before launch is what makes
> approval load-bearing". It is not, yet. The flag is read only inside the
> output guard, and the guard is applied at two render sites — so turning it on
> today would blank two paragraphs on the home gate and change nothing else.
> Making approval load-bearing means routing the catalogue renders through the
> guard as well. See §"What the output guard actually covers".

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

The model used to write the "what to do next" list. It no longer contributes to
it: the stage is resolved by `getStageForPersistence` in
`app/builder/page.tsx`, deterministically, and that stage keys into
`NEXT_STEP_BLOCKS`. A stage the catalogue does not know yields no block rather
than a rendered one.

**A correction.** This section previously read "the model now returns only a
stage code, under a JSON schema". That was wrong in both halves and an
independent review caught it. The stage is derived in code, not returned by a
model; and of the six model calls only `classifyClaimTypeWithAi` uses a genuine
constrained JSON *schema* — the rest pass `response_format: { type:
"json_object" }`, which constrains the envelope to valid JSON and says nothing
about what is inside it. `verifyOutputGuard`'s own header made the same
overstatement and has been corrected.

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

**This section previously called the guard "the load-bearing control" and said
a string reaches a user only if it is a library item or an allowlisted system
message. That was false, and it is the most serious inaccuracy an independent
review found in this document.**

What the guard *does* is correct: given a string, it allows it only if it is
(1) the text of a content-library item or (2) one of five explicitly
allowlisted non-legal system messages. What it did not do was see most strings.
`assertApprovedUserContent` had exactly two call sites in the entire product,
both in `HomeLocationGate.tsx`.

`verifyOutputGuard` tested the *function* and passed with the control
disconnected. A check that cannot fail when the control is removed is not a
check on the control.

See §"What the output guard actually covers" for the current, honest position.
`npm run test:guard-coverage` now asserts the two real call sites — and goes
red when one is removed, which was mutation-tested — and carries a maintained
list of seven significant render paths that do *not* consult it, each with a
reason.

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

All three handlers read four metadata properties and drop the File object.
As of item 1 below, one of those four is gone too — see "Superseded" at the
end of this section.

There is no `FileReader`, no `arrayBuffer()`, no `readAsText`, no
`readAsDataURL`, and no request body carrying bytes anywhere in `app/` or
`src/`. The only `arrayBuffer()` in the codebase is
`app/api/generate-form/route.ts:1260`, on a blank PDF form fetched from a court
website.

**At the time this section was first written**, what reached OpenAI was the file
*name*, its size, its MIME type, and whatever the user typed about it — all
assembled into the case description the analysis sends.

**A filename is a disclosure.** `restraining-order-application-2025.pdf` tells
you something the user never decided to tell you, because nobody thinks of a
filename as content.

**This is no longer true. See "Superseded" below.**

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

### Superseded by item 1 — filenames are no longer read at all

Everything above about filenames describes the state on 2026-09-22. On
2026-09-23 the filename stopped being captured. The notice no longer tells users
to rename their files, because there is nothing left to warn them about, and a
warning describing a risk we have removed teaches people to distrust the
accurate parts too.

**What reaches OpenAI now:** the file's type and size, a neutral reference
("Document 1"), and whatever the user chooses to type as a label and
description. Details in §"Item 1" below.

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

**35 of 268 inventory items** carry `[NEEDS LICENSEE REVIEW: …]`. Nothing is
invented; a placeholder renders as nothing.

> **A correction.** This paragraph used to say placeholders "are blocked from
> rendering by the output guard". That overstated the guard, which is applied at
> two render sites — see §"What the output guard actually covers". What actually
> prevents a placeholder appearing is narrower and still sound: the next-step
> catalogue returns the block and `isPlaceholder()` gates it at the render site,
> and `questionExplanations.ts` returns `null` for a placeholder rather than the
> string. Both are real; neither is the guard.

### Next steps — 21 blocks

| Pathway | Stages with no content |
|---|---|
| **Family** | starting-case, responding, already-started, conference, motion, trial, enforcement, urgent, not-sure — **all nine** |
| **Civil** | starting-case, responding, already-started, conference, motion, trial, enforcement, urgent, not-sure — **all nine** |
| Small Claims | enforcement, urgent, not-sure |

**Superseded by Item 2.** When this was written, Family and Civil users reached
the intake and found nothing where the next steps should be — a blank space that
reads as "we have no advice for you". Both pathways are now gated behind a fixed
message and the referral resources, so **no user reaches an empty screen**. The
18 blocks stay in the library as phase-2 drafts and `npm run test:phase-scope`
requires them to.

Small Claims' three remaining placeholders (`enforcement`, `urgent`,
`not-sure`) are live gaps. A Small Claims user at the enforcement stage — who
has a judgment and wants to collect — currently sees no next steps. `urgent` and
`not-sure` are not procedural positions in the Rules at all, and the catalogue
entry for `urgent` says so.

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
> how long it took, and the result it returned. **We do not keep what you
> wrote** — the record holds a one-way fingerprint of your text and its length,
> never the text itself, and any sentence the AI writes back is recorded only as
> its length. These records are kept for 12 months and are used only to
> supervise and review the AI, as required by the Law Society of Ontario.

**This wording was revised on 2026-09-23 and the reason matters.** The first
draft said the record held "the structured result it returned", and separately
that "we do not keep what you wrote". An independent review established that
those two sentences could not both be true: four of the six model calls return
prose — `safety-pass` returns the model's own sentence about why it thinks a
person is in distress — and storing that for twelve months would have kept the
substance of what the user wrote while the letter of the claim held.

The code was changed rather than the claim weakened: prose fields are now
redacted before the row is written. **Do not adopt the earlier wording.**

### D. "uploaded files"

"Retention and deletion" says: *"We will delete your account, case information,
and uploaded files."*

No files are uploaded (Step 8), so this promises to delete something that was
never held — which is misleading in the more dangerous direction, because it
implies the files were there.

> **Proposed replacement:** We will delete your account and your case
> information, and confirm by email when it is done. CourtSimplified does not
> store the evidence files you list — only the type and size of each document,
> and the label and notes you write about it, which are part of your case
> information.

*(Revised 2026-09-23: the first draft said "only their names", which item 1
made untrue. File names are no longer read at all.)*

### E. What is sent to the AI about a document

New, because item 1 changed the answer and the page has never stated it.

> **Proposed addition to "Service providers", after the OpenAI paragraph:** When
> you list an evidence document, we do not read or record its file name. What
> goes to our AI provider is the document's type and size, a neutral reference
> such as "Document 1", and the label and notes you choose to write about it.
> The document itself never leaves your device.

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

## Item 1 — filenames are no longer read at all

**Commit `3bb5b3b`.**

The filename is not scrubbed on the way out. It is never read.

The audit found **eight places** a name reached a model, across five files: the
Small Claims prompt builder, the Civil canonical adapter, the Civil and Family
intake narratives, the normalizer's two evidence-text builders, the claim draft
engine, and the Family payload's `fileName`/`originalName` pair. A scrubber
would have to be remembered at all eight, and at the ninth someone adds next
month. That is a habit, not a control.

So `name` is gone from all four evidence-file types. **There is no field left
that can hold one**, which is what lets the test assert the property rather than
sample the payloads. The compiler then enumerated every site, so the list above
is known complete rather than believed complete.

| Was | Now |
|---|---|
| `name: "restraining-order-2025.pdf"` | `reference: "Document 1"` |
| `id: "${name}-${size}-${lastModified}"` | `id: "doc-${size}-${lastModified}-${type}"` |
| Civil payload sent `lastModified` | dropped — metadata beyond type and size |
| UI showed the filename | shows `Document 1 · PDF · 240 KB` |

**Numbers are not reused when a document is removed.** Renumbering would
repoint every description the user had already written about "Document 3".

**The label is the user's handle**, and the UI says at the field itself that it
goes to the AI. A disclosure made on purpose is a different thing from one made
by accident.

**What is lost, stated plainly.** A user selecting four similar PDFs can no
longer tell them apart by name. They are distinguished by position, type, size
and their own label. That is a real cost, accepted because the alternative is
to keep sending names and hope every future payload builder remembers not to.

**Two server-side controls behind it.** All three analyze routes validate
uploads against strict allowlists. `name`, `fileName` and `originalName` are
gone from them, so a body still carrying one is refused at the door.

> **A bug this created, found by inspection and not by any check.** Two of those
> three routes still listed the old field names after the type change. That was
> wrong in both directions at once: they would have **rejected every real
> payload** carrying the new `reference`, and **accepted one carrying a file
> name**. `npm run test:no-filenames` now asserts all three routes in both
> directions.

`npm run test:no-filenames` asserts this four ways — structural, source, route
allowlists, and behavioural against the real prompt builders — with a negative
control that plants a filename in a field users legitimately type into and
requires the detector to catch it. Mutation-tested six ways; all caught.

---

## Item 2 — phase 1 is Small Claims only

**Commit `ac25a8b`.**

When the LSO work turned the Family and Civil next-step catalogues into
placeholders, the output guard correctly stopped them rendering. The result was
the worst of both: a user could complete a Family intake and find **nothing**
where the next steps should be. A blank space reads as "we have no advice for
you", not "we do not cover this yet".

**Four doors, all gated:**

| Door | Why it needs its own gate |
|---|---|
| `HomeLocationGate` | the front door |
| `app/builder/page.tsx` | `/builder?path=family` is reachable by URL and from a saved draft |
| `app/family/page.tsx` | above the fold; its two "Start my Family case" CTAs removed |
| `app/civil/page.tsx` | same |

The classifier's "Switch to Family" button is now conditional on availability —
offering to switch to a path we have just said we do not cover would walk the
user into the gate.

**The message says three things and stops:** what we do cover, that we do not
cover this yet, and that this is **not a comment on their situation or on
whether they have a case**. That last sentence is not padding. Someone turned
away at the door can reasonably read it as "you have no case", and they are
often already worried about precisely that. The four referral resources follow.

**The 18 placeholder blocks stay**, and `npm run test:phase-scope` requires
them to. They are phase 2's shape and the review packet's record of what still
needs authoring. A gate implemented by deleting them would have passed every
other check in that suite.

---

## Item 3 — the Supabase projects, and migration ordering

**Commit `06a3ee0`. No Supabase project was touched.**

`CLAUDE.md` §6 read: *"Supabase: two projects. `courtsimplified` (us-west-2,
PRODUCTION) and `courtsimplified-dev` (ca-central-1)."* It named the **paused**
project as production and implied the live one was a scratch environment. Every
safeguard phrased in terms of applying to "dev" first was, followed literally,
an instruction to apply it to the live database.

**The wording was the hazard, not the names.** Three genuinely dangerous
instructions were fixed (in `ARCHITECTURE.md`, a migration header, and this
report). `CLAUDE.md` §6 is now a table keyed by **ref**, with "identify a
project by its ref, never by its name" stated first.

`npm run test:db-environments` scans 254 files for four phrasings that, read
literally, send someone to the live database.

> A check that would have forbidden its own explanation: the first version
> failed on `CLAUDE.md`'s new warning, because explaining the trap means
> quoting it. One line may now carry `[dev-wording-quoted]` and be exempt —
> ugly on purpose, manual on purpose, one line not one file.

### Renaming the Supabase projects — step by step, for Krystel

**Do this before applying any migration.** Nothing in the repository depends on
the names, so the rename is safe; it is the instructions that were dangerous,
and those are already fixed.

**1. Rename the live project.**
- Supabase dashboard → project `fddlpnibovkkkgboabqb` (currently
  `courtsimplified-dev`, `ca-central-1`) → Settings → General → Project name.
- Change to **`courtsimplified-prod`**.
- *Check before you click:* the URL contains `fddlpnibovkkkgboabqb` and the
  region reads `ca-central-1`. If it says `us-west-2`, you are in the wrong
  project.
- Renaming does **not** change the project ref, the API URL, or any key.
  Nothing needs redeploying.

**2. Restore and rename the dormant project.**
- Project `ffymjxjcnwakgdmldpne` (currently `courtsimplified`, `us-west-2`) →
  Restore. A paused project accepts no connections until it is restored.
- Rename to **`courtsimplified-staging`**.
- **Delete the 3 operator accounts and 2 shell cases** it holds, or leave them —
  either is fine, but staging must never receive real user data.

**3. Tell the repository the rename is done.**
- In `supabase/environments.json`, move each `intendedName` into `currentName`
  and set `"renameComplete": true`.
- `scripts/db/applyMigrations.ts` prints a warning until you do.

**4. Update the four documents that describe the old state.**
- `CLAUDE.md` §6 — the table.
- `docs/ARCHITECTURE.md` — the project table around line 552 and the narrative
  around line 522.
- `docs/security/DATA_FLOW_INVENTORY.md` — §2.1.1 and the tables at lines 90,
  91 and 103.
- `docs/INTAKE_STATUS.md` — the logging recommendation at line 151.
- Then run `npm run test:db-environments` to confirm nothing dangerous is left.

**5. Apply migrations, staging first.**

```
npm run db:migrate -- --env staging            # dry run, shows what would happen
npm run db:migrate -- --env staging --confirm  # applies
npm run db:migrate -- --env production         # dry run; refuses if staging has not had it
npm run db:migrate -- --env production --confirm
```

The runner resolves a project by **ref**, never by name; dry-runs unless
`--confirm`; and refuses production for any migration not recorded against
staging **at the same content hash** — so editing a migration after staging saw
it cannot reach production on the old record.

If staging is going to stay paused for now:

```
npm run db:migrate -- --env production --confirm --skip-staging "staging not yet restored; migration syntax-checked only"
```

The reason is written into `supabase/applied-migrations.json`, so the exception
is a decision someone made rather than a flag someone found.

> **On the pending list.** The ledger starts empty and five migrations predate
> it, so the first run lists six as "NOT RECORDED AS APPLIED". That is not the
> same as "not applied" — Supabase tracks what a project has actually had and
> `db push` skips those. The wording in the tool says so.

---

## Independent review

**Commit `51621ca`.**

A subagent that had seen none of this work was given only the LSO A2I policy as
this project records it, the seven regulator questions, `docs/lso-ai-audit.md`
and the branch diff, and asked to find every remaining way unreviewed legal text
could reach a user, every privacy leak, every gap between the code and this
report's claims, and every broken test.

It found a great deal. **Its three critical findings were all confirmed by
direct inspection before anything was changed**, and two of them are failures of
this document as much as of the code.

### What it found, and what happened

| # | Finding | Status |
|---|---|---|
| 1 | Model prose still reached the downloadable document and the export package via `missingEvidence`, `missingInformation` and `risksAndGaps` | **Fixed** |
| 2 | `IntelligenceOverviewPanel` rendered a model-written question on the main builder screen (audit finding B-5, never addressed) | **Fixed** |
| 3 | The output guard had two call sites in the whole product while this report called it "the load-bearing control" | **Partly fixed; scope now stated honestly** |
| 4 | The AI notice told users the legal information "was written and checked by people". Nothing has been reviewed | **Fixed** |
| 5 | The audit log would have stored the narrative in substance — `safety-pass` returns the model's sentence about why someone is in distress | **Fixed by redaction** |
| 6 | `output_guard_blocked` had no callers, so the quarterly report always printed a false "nothing was blocked" | **Fixed: reports the limitation instead** |
| 7 | `user_id` and `case_id` would be NULL on every audit row | **Fixed at the analyze route; anonymous routes stay anonymous** |
| 8 | The review packet omits `legal-principles/page.tsx`, the crisis messages and the chat engine | **NOT FIXED — needs your decision** |
| 9 | This report was three commits stale and contradicted the code | **Fixed by this revision** |
| 10 | "The model returns only a stage code under a JSON schema" was wrong in both halves | **Fixed in Step 2** |
| 11 | The first-use acknowledgement gated nothing — a user could scroll past it | **Fixed; storage limitation still stands** |
| 12 | Identifiers including the court file number go to OpenAI | **Confirmed, not changed — see Q6** |
| 13–21 | Nine test and documentation defects | **Fixed** |

### The three that matter most

**The document path.** Step 2 fixed `buildSummary()`'s "What to do next"
heading. The reviewer found `missingEvidence` going to the document **three
lines above it**, through the same function, and `documentGenerationEngine.ts`
— the file the audit named as the clearest breach — never touched at all. Only
one of its inputs had been changed.

The fix is at the **assembly point** in `smallClaimsIntelligenceEngine.ts`, not
at the render sites, because fixing render sites is how the first attempt came
to be partial. `npm run test:no-model-prose` asserts it there for the same
reason.

Also removed: `"summary"` from `/api/generate-form`'s facts fallback, where the
destination is a PDF filed at a court counter, and two case-**strength**
fallbacks (`strategyData.strengths`, `.weaknesses`) that CLAUDE.md §3 forbids
outright rather than merely leaves unreviewed.

**The audit log.** Decision 2 of the migration claimed `structured_output` was
"non-legal by construction" because every call returns "a classification label,
a stage code, a content id, a boolean". That is untrue of four of the six call
types. `safety-pass` returns `reason` — the model's sentence about why it thinks
this person is in danger — and it would have been kept for twelve months.
Decision 1 ("the narrative is never stored") would have been true in letter and
false in substance. The output is now redacted by named-field deny-list plus a
blanket 80-character cap, and Decision 2 in the migration says it was wrong.

**The notice.** `AiUseNotice` and `FirstUseAcknowledgement` both told users *"It
does not write the legal information you see — that was written and checked by
people."* `approvals.json` is empty. This was a representation made to
self-represented litigants at the moment they are asked to tick a box, and it is
the single item most likely to be picked up by a regulator. Both now say the
wording is written by people and selected by the AI, and has **not yet been
reviewed by a licensed Ontario lawyer or paralegal**.

### My own checks had the defect the reviewer flagged

Both new suites initially reported the **fixes** as defects, because the comment
explaining why a field was removed contains that field's name. Comments are now
stripped before matching in three suites. Recorded because the miss is more
useful than the fix.

---

## What the output guard actually covers

The honest position, maintained in `scripts/verification/verifyOutputGuardCoverage.ts`.

**Guarded (1 file, 2 render sites):**

| Where | What |
|---|---|
| `HomeLocationGate.tsx:301` | the pathway description |
| `HomeLocationGate.tsx:358` | the out-of-scope forum redirect message |

**Not guarded, with reasons:**

| Path | Why, and what would close it |
|---|---|
| `StageConfirmation.tsx` | Text read directly from `nextSteps.ts` — the library the guard checks against. What the guard *would* add is the `REQUIRE_APPROVED_CONTENT` check. **This is the real gap.** |
| `PathwayUnavailable.tsx` | Fixed constants outside the library. Adding them to the library would let the guard cover them. |
| `LegalAdviceDeflection.tsx` | Same. |
| `safetyPass.ts` crisis messages | Fixed constants, never model text — but unreviewed crisis wording, and not in the review packet. **Highest-priority library gap.** |
| `legal-principles/page.tsx` | 22 hand-written procedural stages, cited, but outside `contentInventory.ts` so no review tracks them. |
| `ai-case-partner/` | ~5,000 lines of deterministic template responses behind the builder's chat. Procedural statements, outside the library entirely. |
| `documentGenerationEngine.ts` | Assembles the user's own recorded facts plus catalogue next steps. Guarding it would refuse the user's own words, which are not library items. Covered by `test:no-model-prose` instead. |

### The consequence for `REQUIRE_APPROVED_CONTENT`

An earlier version of this report said turning the flag on would blank the site
until everything was approved. **That was wrong.** `isServable` is reachable
only through the guard, so turning it on today would blank two paragraphs on the
home gate and change nothing else.

**Licensee approval is not load-bearing anywhere yet.** Making it so means
routing the catalogue renders through the guard — `StageConfirmation` first.
That is the highest-value remaining piece of work on this branch and it is not
done.

---

## What we can truthfully tell the LSO

For each of the seven questions: **IN PLACE** means verified in the code today.
**PLANNED** means decided and not built. **NOT BUILT** means what it says. File
references are to the branch head.

### Q1 — The role of generative AI, and where it is used

**IN PLACE.** Six model call sites, all server-side, all `gpt-4o-mini` at
temperature 0 (the analysis call at 0.1). All route through
`createOpenAIClient()` in `src/lib/case-system/openaiClient.ts`; there is no
`new OpenAI(...)` anywhere else, asserted by `npm run test:ai-call-logging`.

The six: safety classification (`intake/safetyPass.ts`), fact extraction and its
confidence variant (`intake/extractIntakeFacts.ts`), claim-type suggestion from
a fixed catalogue (`intake/claimTypeAiClassifier.ts`), court-pathway
classification (`intelligence/courtPathClassifier.ts`), and case analysis
(`intelligence/courtSimplifiedBrain.ts`).

**IN PLACE.** Intake questions are never AI-written — a fixed bank, and the
module that once wrapped them in conversational prose had its model call
removed. The `explainQuestion` route and module were **deleted**, not
constrained.

**IN PLACE.** Next steps come from a reviewed catalogue
(`content-library/nextSteps.ts`) keyed by pathway and stage, with the stage
resolved deterministically in code.

**IN PLACE, as of 2026-09-23.** No model prose reaches a generated document, the
export package, or a court form. Asserted by `npm run test:no-model-prose`.
*This was not true when the audit was written and was still not true a day
before this revision.*

**NOT BUILT.** Any AI drafting of court documents.

### Q2 — How we ensure accuracy

**IN PLACE.** Every legal statement carries a source URL and a verification
date. Primary sources are vendored verbatim under `docs/sources/` and
machine-checked by `verifyCitedProvisions.ts`. Roughly 70 verification scripts
run against the content registries.

**IN PLACE.** Content is versioned by a hash of its own text
(`content-library/contentInventory.ts`), so editing an item invalidates any
approval it had. 268 items are inventoried across ten types.

**IN PLACE.** A review packet exports to `docs/review-packet.csv` and `.md`, and
an import script refuses unknown ids, version mismatches, half-filled rows and
malformed dates.

**NOT BUILT — and this is the largest gap.** *No licensee has reviewed any
content.* `src/lib/content-library/approvals.json` is empty. Accuracy today
rests on sourcing discipline and automated checking, not professional review,
and the user-facing notices now say exactly that.

**NOT BUILT.** `REQUIRE_APPROVED_CONTENT` exists and defaults to false, and
turning it on would currently affect two paragraphs. See §"What the output guard
actually covers".

**KNOWN GAP.** The review packet omits `app/legal-principles/page.tsx` (22
procedural stages), the crisis messages in `safetyPass.ts`, and
`src/lib/case-system/ai-case-partner/`. **A licensee could sign off all 268
items and leave those unreviewed.** This needs a scoping decision.

### Q3 — Safety guardrails and transparency

**IN PLACE.** A site-wide disclaimer on every route (`app/layout.tsx`): "legal
information, not legal advice. We are not a law firm", with the privacy page and
two contact addresses.

**IN PLACE.** An AI-use notice (`AiUseNotice.tsx`) in the builder and on the
home gate — the home gate matters because what a user types there goes to the
classifier before they see anything else.

**IN PLACE.** A first-use acknowledgement that **gates** the builder: nothing
renders until the box is ticked. *It did not gate anything until 2026-09-23.*

**IN PLACE.** Legal-question deflection. `safetyPass.ts` returns a
`requestsLegalAdvice` boolean; when true, all three intakes show a fixed message
and four referral resources (LSO Referral Service, Legal Aid Ontario, Pro Bono
Ontario, CLEO Steps to Justice). The model sets a flag; the words are fixed.
Verified against the real model by `npm run test:lso-demo-cases` — 12/12,
including a negative control proving an ordinary narrative is *not* flagged.

**IN PLACE.** A deterministic validator blocking 24 case-strength,
judge-prediction and opposing-argument terms, and an allowlist output guard —
**applied at two render sites, not product-wide**. See §"What the output guard
actually covers". Do not describe the guard as comprehensive.

**PARTIAL.** The acknowledgement is stored in `localStorage` keyed by user id,
so it is **per browser, not per account**. A user on a second device sees it
again; clearing site data resets it. It is also not shown on the home gate,
where the first model call happens.

### Q4 — Managing the risks of commercial AI

**IN PLACE.** `store: false` forced on every call by a wrapper applied at client
construction, spread last so a caller cannot override it, covering
`chat.completions.create`, `chat.completions.parse` and `responses.create`.
Asserted by `npm run test:no-store`.

**IN PLACE.** A deterministic fallback when the API is unavailable. Input capped
at 8,000 characters on the safety route. No Assistants, Files, Threads, vector
stores, Batch or fine-tuning. No API key client-side.

**PARTIAL.** Models are named but not pinned to dated snapshots, and two are
environment-overridable.

**NOT BUILT.** Zero Data Retention (applied for, not granted) — so the standard
30-day abuse-monitoring retention applies. Rate limiting of any kind. A vendor
incident procedure.

### Q5 — Internal monitoring, and who verifies

**PLANNED, NOT LIVE.** `supabase/migrations/20260922120000_add_ai_call_log.sql`
creates an `ai_call_log` table recording every model call: call type, model,
prompt version, latency, validation outcome, and the structured output. **It has
been applied to no database.** Running `npm run compliance:ai-report` today
prints a "relation does not exist" message and points at the migration.

**IN PLACE.** The capture code is live and provably wired: the safety-pass
regression against the real model logs `[aiCallLog] insert failed { call_type:
'safety-pass', code: 'PGRST205' }` — context attached, row assembled, insert
attempted, table absent — with all 11 cases still passing.

**Design, once applied:** the user's narrative is never stored (`input_sha256`
and `input_chars` only); the structured output is stored **redacted**, with
prose fields replaced by `[redacted N chars]`; append-only; service-role only
(RLS on, no policies); 12-month retention via `prune_ai_call_log()`, **not
scheduled** because pg_cron is not enabled.

**NOT BUILT.** The output-guard block counter is **not wired** —
`recordOutputGuardBlock()` has no callers, because the guard runs in React
client components and `AsyncLocalStorage` is server-only. The quarterly report
states this limitation rather than printing a false "nothing was blocked".

**NOT BUILT.** *No human verifies AI output before it reaches a user.* This
remains true and we are not claiming otherwise.

### Q6 — Protecting sensitive information

**IN PLACE.** Data stored in Canada (`ca-central-1`). RLS on all 26 tables with
user-scoped policies on every user-data table. No API key client-side.
`store: false` on every call. A privacy policy naming OpenAI and the 30-day
retention.

**IN PLACE, as of 2026-09-23.** **File names are never read.** Not scrubbed —
never captured. `src/lib/case-system/evidence/evidenceReference.ts` reads size,
type and last-modified time; there is no field on any evidence type that can
hold a name. Documents are "Document 1", "Document 2". Asserted four ways by
`npm run test:no-filenames`, with a working negative control.

**IN PLACE.** No file content is sent to OpenAI, because no file is ever opened.
There is no `FileReader`, no `arrayBuffer()`, no request body carrying bytes.

**IN PLACE.** A pre-upload caution at all three file pickers, above the input,
naming privilege, sealed or confidential documents, publication bans, and
someone else's health records.

**NOT BUILT — and stated plainly.** Identifier stripping. The narrative, both
parties' names, addresses, the claimed amount, the court location **and the
court file number** are sent to OpenAI verbatim
(`smallClaimsIntelligenceEngine.ts`, `buildRawUserText`). A user's account of
their own legal problem leaves the country on every analysis.

**NOT BUILT.** Any detection of privileged, sealed, publication-ban, health or
identifier material. No file-type or size limits. These are currently
theoretical because nothing is stored — `docs/EVIDENCE_STORAGE_REQUIREMENTS.md`
records the full requirement set for the day that changes, and item 9 of that
file notes that the caution above becomes the most misleading text on the site
the moment storage ships.

### Q7 — Anything else the LSO should know

**Four things we would rather state than have found.**

**First, nothing has been reviewed by a licensee.** Not the 268 catalogued
items, not the 22 procedural stages on `/legal-principles`, not the crisis
messages, not the chat engine. Until 2026-09-23 the product told users the
opposite.

**Second, the safety pass's crisis resources have never been reviewed by anyone
with crisis-response, clinical or legal expertise.** The phone numbers are
individually sourced from ontario.ca and quoted verbatim, and the model never
writes the words a person in danger reads — but the message is unreviewed, and
one category (a national crisis line) is absent because ontario.ca does not list
one and we declined to guess.

**Third, this compliance work found its own errors late.** An independent review
on 2026-09-23 found that three of the fields feeding the downloadable document
still carried model prose after we had reported that path closed, and that the
output guard we described as "the load-bearing control" was applied at two
render sites. Both are now corrected in the code and in this document. We record
it because the pattern — a fix applied at the render site rather than the source,
and a control described by its intent rather than its coverage — is the kind of
error that recurs.

**Fourth, for a period the safety pass ran on only one of three court paths,**
because an authentication requirement introduced for API-cost reasons propagated
into a safety control. Fixed 2026-09-17; a check now asserts every narrative
intake calls the safety pass before extraction.

### Compliance verdict

**PARTIALLY COMPLIANT, and materially closer than at the audit.**

Closed since the audit: AI-written next steps reaching a generated document; the
classifier's reasoning sentence; AI-written question explanations; the absence
of any AI-use disclosure; the absence of deflection and referrals; filenames
reaching OpenAI; and the three further model-prose paths found by independent
review.

**Still blocking full compliance:**

1. **No licensee has reviewed any content.** The long pole, unchanged.
2. **The output guard covers two render sites**, so licensee approval is not
   load-bearing anywhere.
3. **The audit log is not applied**, so there is no monitoring in production.
4. **No human verifies AI output** before it reaches a user.
5. **No identifier stripping** — narratives and names go to OpenAI verbatim.
6. **Zero Data Retention not granted.**
7. **The review packet omits three bodies of live legal content.**

---

## Test results

Run on this branch at `51621ca`.

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `npm run lint` project-wide | 166 errors, 92 warnings — errors **identical to `main`**, all pre-existing |
| `npm run build` | passes |
| `test:no-model-prose` | pass — **new**, mutation-tested 3 ways |
| `test:guard-coverage` | pass — **new**, mutation-tested |
| `test:no-filenames` | pass — mutation-tested 6 ways |
| `test:phase-scope` | pass — mutation-tested 3 ways |
| `test:db-environments` | pass |
| `test:output-guard` | pass |
| `test:ai-call-logging` | pass |
| `test:no-store` | pass |
| `test:lso-demo-cases` (deterministic) | pass |
| `test:lso-demo-cases` (live, real model) | **12/12 pass** |
| `test:safety-regression` (live, real model) | **11/11 pass** |
| `test:small-claims`, `test:three-area` | pass |
| `test:safety-coverage`, `test:classifier-gating`, `test:court-path-classifier` | pass |
| `test:reachability`, `test:storage-keys`, `test:reset-intake`, `test:mount-conditions` | pass |
| `test:fixtures` | runs; drift explained in §§7–8 of each `.expected.md` |

---

## What is left undone

1. **Licensee review of all content.** Nothing is approved.
2. **Route the catalogue renders through the output guard**, starting with
   `StageConfirmation`. Until then approval is not load-bearing.
3. **Apply the migration.** Yours to review and run — §"Renaming the Supabase
   projects".
4. **Add the three omitted bodies of content to the review packet** —
   `legal-principles/page.tsx`, the crisis messages, `ai-case-partner/`. Needs
   your scoping decision.
5. **Privacy and Terms additions A–E**, none of them made.
6. **Wire the output-guard block counter**, which needs guard evaluation moved
   server-side or a separate reporting channel.
7. **`prune_ai_call_log` is not scheduled.** pg_cron is not enabled.
8. **The acknowledgement is per browser, not per account**, and is absent from
   the home gate where the first model call happens.
9. **Identifier stripping** — not built.
10. **17 Small Claims content placeholders** (13 question explanations, 3
    next-step blocks, 1 pathway description), plus the 18 Family and Civil
    blocks held for phase 2.
11. **`depth-contractor-loss`** duplicate id, and the missing uniqueness check.
12. **No rate limiter** on `/api/intake/safety-check`.
13. **Demo cases 2, 6–11, 14–18** are not in the automated suite. Case 14 (a SIN
    typed into the narrative reaching OpenAI verbatim) has no control.

---

## What Krystel and Jason should look at first

1. **The two notices** — `AiUseNotice.tsx` and `FirstUseAcknowledgement.tsx`.
   They now say content has not been reviewed by a licensee. That is accurate
   and it is also a commercial statement; confirm you want it worded that way.
2. **The pre-upload caution** in `EvidenceFileNotice.tsx` — it names legal
   categories and needs a licensee's eye.
3. **The phase-1 unavailable message** in `phaseScope.ts` — the first thing a
   Family user now sees.
4. **The six Small Claims next-step blocks** in `nextSteps.ts` — the only
   authored procedural content a user currently receives, carrying rr. 7.01,
   8.01(2), 8.09.1, 9.01, 11.01, 15.01, 18.03(4).
5. **The crisis messages** in `safetyPass.ts` — unreviewed, and the highest
   consequence of any text in the product.

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
npm run test:no-model-prose
npm run test:guard-coverage
npm run test:no-filenames
npm run test:phase-scope
npm run test:db-environments
npm run test:output-guard
npm run test:ai-call-logging
npm run test:lso-demo-cases
npm run build                                       # NOT while a dev server is running
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

### To deploy

Nothing here has been pushed.

```
git checkout main
git merge fix/legal-content-corrections     # the two legal corrections, on their own
git push origin main
```

`lso-compliance` can now be merged without removing next steps from any path —
Family and Civil are gated with a message rather than left blank. Before
merging, decide items 1 and 2 of §"What is left undone": the notices tell users
nothing has been reviewed, and that will be true until a licensee reviews it.
