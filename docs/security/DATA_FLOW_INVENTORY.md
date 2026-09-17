# CourtSimplified — Data Flow Inventory

**Prepared 2026-09-15, for legal counsel drafting a Privacy Policy and Terms of
Service, and for the Law Society of Ontario Access to Innovation assessment.**

This is a factual inventory, not a policy. Every statement was verified against
the code on the date above, with the file and line recorded so counsel or an
assessor can check it. Where something could not be verified from the code, it
says so rather than guessing.

**Status of the platform:** pre-beta. The whole site sits behind a single shared
password gate (`middleware.ts`), so there is no public user base yet.

---

## 0. The short answer

Added 2026-09-15 after auditing both live databases rather than reading the
migration files. Everything below is verified; the detail is in the sections
that follow.

**There is no third-party personal data anywhere in this platform.**

| | |
|---|---|
| The live database | **Canada (`ca-central-1`).** The deployed site, local development and every browser test all run against it. NOTE: it is CONFUSINGLY NAMED `courtsimplified-dev` — see 2.1.1 |
| The dormant US database (`us-west-2`) | **PAUSED and unused by the deployment.** 3 accounts — two the operator's own, one the test harness. 2 shell case rows. Nothing else. Confusingly named `courtsimplified` |
| Anonymous write access | **Zero, in both projects.** Remediated and verified 2026-09-15 |
| Anonymous access to case tables | **None.** Every policy is `TO authenticated` with `auth.uid() = user_id` |
| Analytics / advertising / session replay | **None.** Checked |

**What is genuinely outstanding**, and named here rather than left to be found:

- Users' narratives and party names **are sent to OpenAI**, and the privacy
  notice does not say so. Logging is off and verified, but abuse-monitoring
  retention still applies and ZDR has not been applied for — see 3.2.
- **There is no way for a user to delete their data** through the product. The
  cascade works when done by hand (4.2.1), but storage files are not covered.
- The **privacy notice is three paragraphs** and omits the third-party
  processing, the storage location, retention and deletion.
- **There are no terms of service at all.**

---

## 1. Personal data collected

### 1.1 Account data

| Field | Source | Where it lives |
|---|---|---|
| Email address | Supabase Auth sign-up | Supabase `auth.users` |
| Password (hashed) | Supabase Auth | Supabase `auth.users` |
| User ID (UUID) | Supabase Auth | Referenced as `user_id` on every case table |

The platform does not operate its own credential store. Authentication is
Supabase Auth.

### 1.2 Case data — the substantive collection

Collected through the intake forms (`app/builder`). All of it is free text the
user types, and **none of it is inferred or purchased from anywhere**.

| Category | Specific fields | Notes |
|---|---|---|
| **The user's narrative** | `facts` — an unstructured account of their legal problem | The most sensitive item. Typically contains names of family members, allegations, financial detail, and in family matters can contain disclosure of violence |
| **Party identity** | `yourName`, `yourAddress`, `yourEmail`, `yourPostalCode`, `otherParty`, `defendantAddress` | Full legal names and service addresses of the user AND of the opposing party — a third party who has not consented |
| **Case detail** | `timeline`, `evidence`, `missingEvidence`, `goal`, `amountClaimed`, `damagesBreakdown`, `agreementDetails`, `paymentHistory`, `settlementEfforts`, `defenceResponse`, `deadlineDetails`, `urgent` | |
| **Location** | Province (Ontario only) and city | Drives court/forum routing |
| **Family-specific** | Relationship status, marriage/separation dates, municipality of each party, children's ages and circumstances, parenting-time arrangements, income figures and their stated basis | Child support path |
| **Uploaded evidence** | Arbitrary user files | Supabase Storage bucket `case-evidence` |

**Special-category data is collected in substance if not by design.** A family
intake can contain information about children, health, and family violence. The
child support path records income. The safety-disclosure path exists precisely
because users disclose threats and abuse.

### 1.3 Data about people who are not users

Worth flagging explicitly for counsel: the platform stores **the full name and
service address of the opposing party**, and narrative allegations about them.
That person has no account, no notice, and no way to access or correct what is
held about them.

---

## 2. Where the data is stored

| Store | Contents | Region |
|---|---|---|
| **Supabase, ref `fddlpnibovkkkgboabqb`** — **THE LIVE DATABASE**, confusingly named `courtsimplified-dev` | Everything: accounts, cases, intakes, evidence metadata, generated documents, events | **`ca-central-1` — Canada** |
| **Supabase, ref `ffymjxjcnwakgdmldpne`** — dormant, confusingly named `courtsimplified` | Paused. 3 operator/harness accounts, 2 shell cases, nothing else — see 2.2 | `us-west-2` — Oregon, United States |
| **Supabase Storage, bucket `case-evidence`** | Uploaded evidence files. **Empty in both** | Per project |
| **Browser `localStorage`** | **26 keys — see 4.3.** A resumable draft, the active case id, case-context blobs, assembled evidence packages, parsed message threads, case-partner chat transcripts, and whole generated workspace documents. **20 of the 26 carry no user id** | The user's own device |
| **Cookie `cs_site_access`** | The shared site password, HttpOnly | The user's own device |

### 2.1 Data residency — the deployed site runs on Canadian infrastructure

**Corrected twice, and this is the settled position.** Verified against the
Supabase Management API and against Vercel's environment configuration.

| Ref | Project name | Region | Status | **What it actually is** |
|---|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | **`ca-central-1`** | ACTIVE_HEALTHY | **THE LIVE DATABASE.** Vercel's `NEXT_PUBLIC_SUPABASE_URL` points here, and so does `.env.local` |
| `ffymjxjcnwakgdmldpne` | `courtsimplified` | `us-west-2` | INACTIVE (paused) | **Dormant.** Nothing points at it |

**So the accurate statement is: user data is stored in Canada, today, not as a
plan.** The deployed application, local development and every browser test all
run against `ca-central-1`.

### 2.1.1 ⚠️ THE PROJECT NAMES ARE BACKWARDS — read this before touching either

**The project called `courtsimplified-dev` is the live one. The project called
`courtsimplified` is dormant.**

Anyone reading the names would conclude the opposite, and that conclusion is
dangerous in both directions:

- **Treating the live project as scratch.** It is named `-dev`. Someone testing
  a destructive change "on dev" would be running it against the database the
  deployed site serves from. This nearly happened during this audit: the
  instruction was "test the deletion cascade on dev", given moments after
  establishing that dev is what production serves.
- **Treating the dormant project as live.** It is named `courtsimplified` and
  sits in `us-west-2`, which made the residency position look far worse than it
  is — the first version of this document described Canadian users' case files
  as being stored in the United States, on exactly that reading.

**How it came about:** `courtsimplified` was created first and was production;
`courtsimplified-dev` was created later in Canada to prove out the migration
procedure. The deployment was then pointed at the Canadian project and the
original was paused. **The names record the intention at creation, not the
current roles**, and nothing renamed them.

**Recommended:** rename them in the Supabase dashboard so the names match the
roles — the live one to something unambiguous, and the dormant one to
`courtsimplified-legacy-us-west-2` or similar. Until then, every reference in
tooling should carry the role rather than the name, which is why
`runSecurityAudit.ts` and `applySecurityRemediation.ts` print region and status
alongside the ref on every run.

**Not renamed here**, because a rename changes a name that appears in tooling,
in `.env` files and possibly in Vercel, and it should be done deliberately
rather than at the end of a long session.

### 2.2 What is actually in production — counted, 2026-09-15

The open question above has been answered. Production was resumed, read
read-only, and re-paused.

| Table | Rows |
|---|---|
| `auth.users` | **3** |
| `cases` | **2** |
| `case_intakes` | 0 |
| `case_documents` | 0 |
| `case_evidence` | 0 |
| `case_generated_documents` | 0 |
| Storage bucket `case-evidence` | **0 objects** |

**All three accounts are the operator's own or the test harness:**

| Account | Created | Note |
|---|---|---|
| The operator's personal address | 2026-08-24 | |
| A family member's address | 2026-04-14 | last sign-in 2026-08-09 |
| `courtsimplified.harness@example.test` | 2026-08-25 | flagged `courtSimplifiedHarness: true` |

**Both cases belong to the operator**, created the same day, titled
`"New Family Case"` and `"New Small Claims Case"` — the default titles. Each
`master_result` is about 2.5 KB with a single key, `masterCaseFile`: shells, not
completed analyses.

The 730 objects in Supabase Storage are in the **`court-forms`** bucket — the
blank court-form library, public reference material. The `case-evidence` bucket
is empty.

**So: no third-party personal data has ever been stored in the United States by
this platform.** No notification obligation arises, because no other person's
information is there.

**And the Canadian migration is a formality at this size.** Two shell rows and
three operator-controlled accounts. The `auth.users` UUID-preservation problem
flagged in `ARCHITECTURE.md` — the step most likely to need Supabase support —
does not arise.

### 2.3 Production's schema is behind development

Found while applying the security remediation, which aborted with
`42P01: relation "public.case_events" does not exist`.

Production has **24 tables**; development has **26**. `case_events` and
`case_event_candidate_dismissals` were created in dev by the September
migrations and **never applied to production** — nothing runs migrations against
production, and nothing reported that they had not run.

**Consequence: a new Canadian project must take its schema from development,
not from production.** Production is not the authoritative schema; it is an
older one.

`docs/ARCHITECTURE.md` records this, the seven steps a move would take, and the
fact that the schema is not fully reproducible from the repository — only three
migrations exist for twenty-four tables, so a faithful move needs a `pg_dump`
rather than a migration replay.

---

## 3. What leaves the system, and to whom

### 3.1 OpenAI — the only third-party processor of user content

**Six call sites send user content to OpenAI's API:**

| Module | What is sent |
|---|---|
| `intelligence/courtSimplifiedBrain.ts` | The largest payload — see below |
| `intake/safetyPass.ts` | The user's story text |
| `intake/extractIntakeFacts.ts` | The user's story text |
| `intake/claimTypeAiClassifier.ts` | The user's story text |
| `intake/explainQuestion.ts` | Question context |
| `intelligence/courtPathClassifier.ts` | The user's story text |

**The brain payload is the significant one.** `buildCognitionPrompt`
(`courtSimplifiedBrain.ts:1816`) interpolates
`JSON.stringify(normalizedIntake, null, 2)` into the user message.
`NormalizedIntake` (`intelligence/intelligenceTypes.ts:448`) contains:

- **`rawUserText`** — the user's narrative, verbatim
- **`parties`** — extracted party identities
- `dates`, `moneyAmounts`, `events`, `harms`, `evidence`, `desiredOutcomes`

**So the user's story and the names of both parties are transmitted to OpenAI.**

### 3.2 Retention at OpenAI — the whole position, in the order it should be said

**This is written to be said out loud. It is true rather than reassuring, and
the last sentence is the one most likely to be asked about.**

> When someone uses the analysis features, what they wrote about their own legal
> problem is sent to OpenAI's API, along with the names of the parties. We have
> configured every request with `store: false`, and we have verified in the
> OpenAI dashboard that API call logging has never been enabled for our
> account — the Logs tab offers an Enable button rather than any records, so
> nothing a user has written has ever been stored in our OpenAI logs. Under
> OpenAI's standard API terms, API inputs are not used to train their models.
> OpenAI does retain API inputs for a limited period for abuse monitoring, and
> that applies to us: we have not applied for Zero Data Retention, which is the
> arrangement that removes it.

### The four claims, and what backs each

| Claim | Evidence |
|---|---|
| The user's narrative and party names are sent | `buildCognitionPrompt` (`courtSimplifiedBrain.ts:1816`) interpolates the whole `NormalizedIntake`, which contains `rawUserText` and `parties`. Five other call sites send story text |
| `store: false` on every request | `forceNoStore` in `openaiClient.ts` wraps the client at construction. `npm run test:no-store` asserts it, including that a caller passing `store: true` is overridden |
| Logging has never been enabled | Verified in the OpenAI dashboard, 2026-09-15. The Logs tab for Chat Completions offers an **Enable** button and shows no records |
| Abuse-monitoring retention still applies | OpenAI's standard API terms. **Not removed by `store: false`** — only Zero Data Retention removes it, and this account has not applied |

### Two things worth understanding about how this came to be true

**The default was already in our favour, and that is not a reason to rely on
it.** Every call site uses **Chat Completions**, where `store` defaults to
`false`. The **Responses API** — where OpenAI is steering new work — defaults to
`store: true`. The first call site to move there would have started logging user
narratives silently, with every existing check still green. `forceNoStore`
wraps both APIs, so that move is covered before anyone makes it.

**Org-level logging and per-request `store` are different controls.** The
account setting was "Enabled per call", which defers to the request. Both are
now closed: the setting is off, and the requests say so explicitly. Either alone
would have been enough today; neither alone survives someone changing the other.

### What is still open, and it is a real gap rather than a technicality

**Zero Data Retention has not been applied for.** It is an arrangement with
OpenAI rather than a setting, and it is the only thing that removes
abuse-monitoring retention. Until it is in place, the honest position is that a
user's narrative exists briefly in OpenAI's systems, in the United States, under
their standard terms.

For a platform holding family-law and financial narratives from
self-represented people, that is worth pursuing — and worth stating plainly in
the meantime rather than implying that `store: false` means nothing is kept.

### Still to establish for the privacy policy

- **Which OpenAI entity is the contracting party** (OpenAI, L.L.C. vs OpenAI
  Ireland). Determines the cross-border framing.
- **Whether this account is eligible for ZDR**, and on what terms.

### 3.3 When the OpenAI call does NOT happen

`app/api/small-claims/analyze/route.ts:289`:

```
allowExternalCognition = authenticated && hasExternalAiKey()
```

An unauthenticated request runs a deterministic engine with **no model call**.
A signed-in user's analysis does call OpenAI.

### 3.4 Resend and Amazon SES — transactional email

**Email addresses leave the platform. No case content does.**

Resend is **not an application dependency**. There is no `resend` package, no
email module, and no code anywhere in `app/` or `src/` that sends mail. The
entire integration is one block of Supabase Auth configuration:

| Setting | Value (both projects, verified 2026-09-15) |
|---|---|
| `smtp_host` | `smtp.resend.com` |
| `smtp_port` | `587` |
| `smtp_user` | `resend` (the literal string, Resend's convention — not an address) |
| `smtp_pass` | a Resend API key — set; never returned by the Management API once saved |
| `smtp_admin_email` | `noreply@courtsimplified.com` |
| `smtp_sender_name` | `CourtSimplified` |

**The sending address is `noreply@courtsimplified.com` and there is only one.**
The domain's DNS carries `resend._domainkey` (DKIM) and an SPF record on the
`send` subdomain pointing at `amazonses` — Resend delivers through Amazon SES,
so an address reaching Resend reaches AWS too.

**Three Auth paths can send, and only two of them actually do:**

| Path | Call site | Sends? |
|---|---|---|
| Password reset | `app/forgot-password/page.tsx:24` — `resetPasswordForEmail` | Yes |
| Magic-link sign-in | `app/login/page.tsx:98` — `signInWithOtp`, `shouldCreateUser: false` | Yes |
| Signup confirmation | `app/login/page.tsx:56` — `signUp` | **No** — `mailer_autoconfirm` is `true` |

**What is transmitted:** the recipient's email address and a one-time link.
Nothing from the case record — no narrative, no party names, no documents —
appears in any of these messages, because Supabase's default templates are in
use (`ARCHITECTURE.md`: every `mailer_templates_*` value is stock) and they
interpolate only a link.

**How to say it out loud:**

> The only email we send is a password-reset or sign-in link. Those go out
> through Resend, which delivers via Amazon SES, so a user's email address
> reaches both. Nothing about their case is in those emails and nothing about
> their case is sent to either company.

**`rate_limit_email_sent` was 2 per hour on the live project**, project-wide
rather than per user — the third person needing a reset within an hour received
nothing, with no error surfaced to them. Raised to 30 on 2026-09-15 to match the
legacy project.

### 3.5 Other outbound

| Destination | What | Notes |
|---|---|---|
| **Supabase** (`supabase.co`) | All persistence and auth | Processor |
| **Vercel** | Hosting; request logs | Standard platform logging |
| **Resend → Amazon SES** | Recipient address + sign-in link | Section 3.4. No case content |
| **ontario.ca, laws-lois.justice.gc.ca, ontariocourtforms.on.ca** | Outbound links only | No user data transmitted; the user's browser follows a link |

**No analytics, advertising, tracking pixels, or session-replay tooling were
found.** A search for the common vendors returns nothing. This is a genuine and
unusual privacy strength and is worth stating in the policy.

**Resend was missed by the first pass of this inventory**, which listed OpenAI,
Supabase and Vercel as the complete set of third parties. It was found from the
DNS records rather than from the code — and it would not have been found in the
code, because there is none to find. See `OUTSTANDING_ISSUES.md` section 0: a
design document had asserted, under a heading reading "checked, not assumed",
that grepping for `resend` returned nothing, sixteen days after the two scripts
containing it were committed.

---

## 4. Retention and deletion

### 4.1 Retention

**No retention policy exists in code.** Nothing expires, nothing is purged, and
no TTL is configured on any table or bucket. Data persists until deleted.

### 4.2 Deletion — the gap

**A user cannot currently delete their data through the product.** Searched
`app/` and `src/` for any account-deletion or case-deletion path; none exists.

The database *permits* it — the `cases_delete_own` RLS policy allows an
authenticated user to delete their own rows — but no interface exercises it.

What this means practically, and counsel should know it:

- A deletion request today would be handled manually, by an operator, against
  the database. No such request could arise yet: there are no third-party
  accounts (section 2.2).
- There is no documented process for that, and no record of it having been done.

### 4.2.1 The cascade — tested 2026-09-15, and it works

**Manual deletion can be promised, because deleting the account really does
remove the case data.** Established two ways rather than assumed.

**Read-only, from `pg_constraint`:** every case table carries a foreign key to
`auth.users` with `ON DELETE CASCADE`.

| Table | On deleting the user |
|---|---|
| `cases` | CASCADE |
| `case_intakes` | CASCADE |
| `case_documents` | CASCADE |
| `case_evidence` | CASCADE |
| `case_generated_documents` | CASCADE |
| `case_events` | CASCADE |
| `case_event_candidate_dismissals` | CASCADE |

Each table additionally cascades from `cases`, so deleting a single case removes
its own children.

**Empirically:** a throwaway account was created in the live project, given a
case, and deleted. Before: 1 case. After: 0 rows in every case table, and the
user gone. The project returned to exactly its prior state — 2 users, 2 cases,
no residue.

**A note on how that FK was nearly missed**, because it matters for anyone
re-checking this: `information_schema.referential_constraints` did **not** list
these seven FKs, because it only exposes constraints whose referenced table the
querying role has privileges on, and `auth.users` is not visible there. A query
against `information_schema` alone returns the six FKs between public tables and
suggests `user_id` has no constraint at all — which would have meant orphaned
case rows on deletion. **`pg_constraint` is the authority; `information_schema`
is a filtered view.**

### 4.2.2 What is still not covered by the cascade

- **Storage objects.** The `case-evidence` bucket is separate from the database
  and has no foreign key to anything. Deleting a user removes the `case_evidence`
  ROWS but **not the uploaded files**. Both buckets are empty today, so nothing
  is currently orphaned — but a manual deletion procedure must delete the user's
  storage folder explicitly, and any automated deletion must do the same.
- **`case_events.supersedes_event_id`** is `ON DELETE RESTRICT`, self-
  referencing. A case whose event chain contains a supersession may not delete
  cleanly in one statement. Not reproduced — the probe's `case_events` insert
  failed on an unrelated `court_path` NOT NULL constraint, so this path is
  untested and should be exercised before a deletion feature ships.

### 4.3 Browser-side data — the shared-computer exposure

**Rewritten 2026-09-17. The previous version of this section said `localStorage`
"holds a compact draft and case-context blobs", which understated it by an order
of magnitude and was the basis for a privacy notice that understated it further.**

**26 browser-storage keys**, enumerated from every call site rather than searched
for by name (`src/lib/case-system/storage/intakeStorageKeys.ts` is the registry;
`npm run test:storage-keys` fails on a storage key named anywhere else).

| Scope | Count | What it means |
|---|---|---|
| `user` — key ends `:<userId>` | 2 | Two accounts on one browser cannot read each other's |
| `guest` — `sessionStorage` | 4 | Dies with the tab |
| **`shared` — `localStorage`, no user id, no expiry** | **20** | **Readable by the next person to use the browser. 19 can hold case content** |

#### Confirmed in a real browser, not inferred

On 2026-09-17 a user ran a storage scan on their own machine and found a case
story from a previous session in two keys:

```
courtSimplifiedWorkspaceDocument:case:3b24868a-f37a-4334-a82c-56830dcd0269
courtSimplifiedBuilderDraft:7ae96282-53fa-4a5a-80f1-39ea5ba1c62e
```

**The first is the worked example for this whole section.** It is the entire
generated drafting workspace document. It is keyed by **case id with no user id**,
so it is not partitioned by account; it lives in `localStorage`, so it survives
closing the window and restarting the browser; and nothing cleared it when a new
case was started.

The second carries a user id, meaning a signed-in session wrote it. On a shared
machine that is a second person's draft sitting beside the first.

**Why this matters for this platform specifically:** the audience is
self-represented people, and a material share of them use library, shelter and
drop-in-centre computers. "Stored on the user's own device" is a reassuring
phrase that, on a shared device, means *stored for whoever sits down next*.

#### What changed

`resetIntake()` (`src/lib/case-system/storage/resetIntake.ts`) clears every
registered key across both storage areas. It enumerates what is present and
matches against the registry rather than removing per known key, which is what
reaches the `:<caseId>` / `:<courtPath>` / `:<userId>` suffixed forms that a
hand-written list cannot name. It runs on anonymous arrival at the home gate, on
sign-out, on "Start a new case", and on opening the court-path finder. The
Supabase auth token is never touched.

`npm run test:reset-intake` asserts it against **the two key strings above,
verbatim**, so the fix is pinned to what was measured rather than to what was
inferred.

#### Still open

- **Browser tests unrun.** `tests/browser/intake-reset.spec.ts` is written and
  committed but has never executed — the local dev server would not render.
  Verified at unit level only.
- **A user who never returns to the home page is never swept**, other than by
  the builder's own transient clear on a new matter.
- **No quick-exit / "hide this site" control exists.** For this audience that is
  a standard safety control, and the reset it would need now exists.

---

## 5. Access controls

| Control | State |
|---|---|
| Row Level Security | **Enabled on every table** — 26 in dev, 24 in production |
| Case-table policies | All scoped `TO authenticated USING (auth.uid() = user_id)`. **No anon policy exists on any case table** |
| Evidence storage | Scoped to `bucket_id = 'case-evidence' AND foldername[1] = auth.uid()` |
| Site-wide gate | Single shared password, HttpOnly cookie, covers `/api/*` |
| Rate limiting | **None.** Still outstanding |
| Secrets in version control | **None.** No `.env` has ever been committed; a pattern scan of all tracked files is clean |

### 5.1 The 2026-09-15 audit: what was found, and what was done

Four findings. **All four are closed in development; three of four are closed in
production**, which is paused.

**1. Twelve policies applied to `PUBLIC`, including anonymous callers.**
Written with no `TO` clause, which Postgres defaults to PUBLIC. Combined with
`GRANT ALL`, an anonymous caller could write **and delete** the legal content
tables — the rules and form data this platform serves to self-represented
people. No personal data; the exposure is **content integrity**, which for this
product is arguably the more serious failure mode.
**Closed in both projects.**

**2. `anon` held `ALL` on the case tables.** **No data was ever exposed** — RLS
is enabled on every one and every policy is `TO authenticated`, so RLS denied by
default. The defect was that it left RLS as the **only** layer rather than the
second, where one mistaken policy would have converted to full exposure.
**Closed in both projects: `anon` now appears zero times on the case tables.**

**3. An unauthenticated route held service-role privileges.**
`/api/scan-form-fields` built its client with `SUPABASE_SERVICE_ROLE_KEY`, which
bypasses RLS entirely, and had no authentication — anyone past the shared site
password could rewrite the court-form field definitions over HTTP with a bare
`GET`. `/api/admin/scan-pdf-fields` was likewise unauthenticated.
**Both routes deleted.** The logic moved to `scripts/forms/`, which never
deploys and is never reachable over HTTP, and reads credentials from
`.env.local` at run time.

**4. An admin page behind only the shared site password.**
`app/admin/pdf-field-mapper` edits the form-overlay coordinates the document
filler uses. **It now requires a signed-in session**, gated before its own
content renders.

### 5.2 Verified state after remediation

| | Development (`ca-central-1`) | Production (`us-west-2`, paused) |
|---|---|---|
| `{public}` policies | **none** | none with `cmd = ALL` |
| `anon` write privileges | **zero, anywhere** | zero except two PDF-metadata tables |
| `anon` on case tables | **absent** | **absent** |
| RLS | enabled on all 26 tables | enabled on all 24 |

Production is missing only the second migration
(`20260915120000_close_admin_anon_write_holes.sql`), which closes anon write on
`pdf_field_mappings` and `pdf_form_inventory`. **Neither holds personal data** —
they hold PDF field coordinates and form classifications. Worth applying before
production ever serves traffic; not urgent while it is paused.

Re-checkable at any time with `npm run audit:security -- --project <live|legacy>`.

---

## 6. What the current notice says, against what is true

**Rewritten 2026-09-15** (commit `e6607da`, Resend added after). `app/privacy/page.tsx`
was three paragraphs: true, and radically incomplete — a user reading it would
not have known their story left the platform. It is now sourced section by
section from this document.

| Fact | Disclosed? |
|---|---|
| Intake responses, evidence, account details collected | **Yes** |
| Income and children's information in family matters | **Yes** |
| Not legal advice, not a law firm, no solicitor-client relationship | **Yes, prominently** — kept verbatim from the old notice |
| Pre-beta status, full policy pending counsel | **Yes** |
| The opposing party's name and address are held | **Yes** — including that they have no account and no notice |
| User content sent to OpenAI | **Yes** — in the section 3.2 language |
| OpenAI abuse-monitoring retention, ZDR not applied for | **Yes** — named as unsolved rather than glossed |
| Where data is stored | **Yes** — Canada, which is what the live project is |
| Resend / Amazon SES receive the user's email address | **Yes** — section 3.4 |
| Deletion process | **Yes** — by hand, removes everything in the database, with the storage-objects gap named |
| Cookies and browser storage | **Yes** — `cs_site_access`, the session in `localStorage`, and (from 2026-09-17) that the browser holds a working copy of the case, that it used to persist across users on a shared computer, and that starting a new case now clears it |
| No analytics, advertising or session-replay | **Yes** |
| Retention period | **No** — there is none to state (4.1) |
| Operating legal entity | **No** — unresolved, section 7 item 2 |
| Complaint route / PIPEDA | **No** — for counsel |

**What remains undisclosed is what remains unresolved**: there is no retention
policy to describe, and no legal entity to name. Both are section 7 items for
counsel rather than omissions from the notice.

**The notice and this document are coupled by convention only.** The page's
header comment says it is sourced from here; nothing enforces it. If this
inventory changes and the page does not, they drift silently, and the drift is
invisible precisely where it matters most. No mechanical check for this has been
written — see `OUTSTANDING_ISSUES.md` section 0.

---

## 7. Open questions counsel must resolve

1. ~~OpenAI's retention terms for this account.~~ **ANSWERED 2026-09-15** —
   logging verified never enabled, `store: false` now forced in code,
   abuse-monitoring retention still applies, ZDR not applied for (see 3.2).
   What remains: which OpenAI entity is the contracting party, and whether this
   account is eligible for ZDR.
2. **The operating legal entity.** The only contact is a Gmail address.
3. ~~Whether US storage is acceptable for the pre-beta period.~~ **ANSWERED
   2026-09-15** — production holds no third-party data (section 2.2), so
   nothing about anyone else is in the United States. What remains is to stand
   the Canadian production project up before taking real users.
4. ~~What deletion will actually mean once built.~~ **PARTLY ANSWERED
   2026-09-15** — the cascade is verified: deleting the account removes every
   case row (4.2.1). What remains for counsel: storage objects are NOT covered
   by the cascade and must be deleted explicitly, and backup retention at
   Supabase is unestablished.
5. **The opposing party's data.** The platform holds identifying information and
   allegations about a person who is not a user. What, if anything, is owed to
   them.
6. **Whether children's information in family matters** triggers any additional
   obligation.

---

## 8. Verification

Everything above can be re-checked, and none of the commands below modifies
anything:

```
npm run audit:security -- --project live     # LIVE dev state, read-only
npm run audit:security -- --project legacy    # LIVE production, read-only
npm run test:anon-grants                    # migration files only
```

`audit:security` runs the five queries in `docs/security/01a-*.sql` through
Supabase's Management API and prints the results. It is read-only by
construction: the SQL is read from those files rather than duplicated, every
statement is scanned against a deny-list of mutating keywords, and every one
must begin with `SELECT`.

The same five files can be pasted into the Supabase SQL editor one at a time;
each states what it reports, what to expect, and what a bad result looks like.
`docs/security/README.md` gives the order.

**Production is paused.** Running `--project legacy` against it will time out
until it is resumed, which is itself a change to production and should be
deliberate.

**The caveat that used to govern this whole document has been discharged.** It
previously said the access-control section was verified against the migration
files, which are a snapshot rather than a record — only three migrations exist
for twenty-four tables, so most of the schema was created through the dashboard.
**Both live databases have now been queried directly**, and the findings in
sections 2.2, 2.3 and 5.2 come from the databases rather than from the files.

The narrower caveat that remains: `npm run test:anon-grants` still reads only
the migration files and says so in its own output. A green run there means the
files are correct, never that a database is.
