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
| Production (`us-west-2`) | **PAUSED.** 3 accounts — two the operator's own, one the test harness. 2 shell case rows. Every other case table empty. **No uploaded evidence.** |
| Development (`ca-central-1`) | **Canada.** What the app runs against locally and in every browser test |
| Anonymous write access | **Zero, in both projects.** Remediated and verified 2026-09-15 |
| Anonymous access to case tables | **None.** Every policy is `TO authenticated` with `auth.uid() = user_id` |
| Analytics / advertising / session replay | **None.** Checked |

**What is genuinely outstanding**, and named here rather than left to be found:

- Users' narratives and party names **are sent to OpenAI**, and the privacy
  notice does not say so.
- **There is no way for a user to delete their data** through the product.
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
| **Supabase (`courtsimplified-dev`)** | What the app actually runs against — accounts, cases, intakes, evidence metadata, generated documents, events | **`ca-central-1` — Canada** |
| **Supabase Postgres (`courtsimplified`)** | PAUSED. 3 operator/harness accounts, 2 shell cases, nothing else — see 2.2 | `us-west-2` — Oregon, United States |
| **Supabase Storage, bucket `case-evidence`** | Uploaded evidence files. **Empty in production** | Per project |
| **Browser `localStorage`** | A compact draft (province, city, names, facts, timeline, evidence, goal), the active case id, and case-context blobs | The user's own device |
| **Cookie `cs_site_access`** | The shared site password, HttpOnly | The user's own device |

### 2.1 Data residency — corrected 2026-09-15 after querying the live projects

**The position is better than the section above implies, and the correction was
verified rather than assumed.**

| Ref | Name | Region | Status |
|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | **`ca-central-1`** | ACTIVE_HEALTHY |
| `ffymjxjcnwakgdmldpne` | `courtsimplified` | `us-west-2` | **INACTIVE (paused)** |

**`.env.local` points at the CANADIAN project**, so local development and every
browser test run against `ca-central-1`. **Production is paused and serving
nothing.**

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

### 3.2 What counsel needs to establish about OpenAI, which the code cannot answer

Verified from the code: there is **no** `store: false` flag, **no**
zero-data-retention configuration, and **no** organization or project pinning in
`src/lib/case-system/openaiClient.ts`.

**The applicable retention and training terms are a property of the OpenAI
account, not of this codebase, and must be confirmed from the account itself.**
Under OpenAI's standard API terms, API inputs are not used to train models by
default and are retained for a limited abuse-monitoring period — but whether
this account has a Zero Data Retention arrangement, and which OpenAI entity is
the contracting party, cannot be determined from the repository.

This is the single most important open question for a privacy policy, because
it determines what can truthfully be said about retention by a sub-processor.

### 3.3 When the OpenAI call does NOT happen

`app/api/small-claims/analyze/route.ts:289`:

```
allowExternalCognition = authenticated && hasExternalAiKey()
```

An unauthenticated request runs a deterministic engine with **no model call**.
A signed-in user's analysis does call OpenAI.

### 3.4 Other outbound

| Destination | What | Notes |
|---|---|---|
| **Supabase** (`supabase.co`) | All persistence and auth | Processor |
| **Vercel** | Hosting; request logs | Standard platform logging |
| **ontario.ca, laws-lois.justice.gc.ca, ontariocourtforms.on.ca** | Outbound links only | No user data transmitted; the user's browser follows a link |

**No analytics, advertising, tracking pixels, or session-replay tooling were
found.** A search for the common vendors returns nothing. This is a genuine and
unusual privacy strength and is worth stating in the policy.

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
- Cascade behaviour on deleting an auth user has **not been verified**. Whether
  case rows, evidence rows and storage objects are removed with the account is
  unknown, and should be tested before any deletion commitment is made in a
  policy.

### 4.3 Browser-side data

`localStorage` holds a compact draft and case-context blobs. Clearing browser
data removes it. Nothing in the product tells the user this.

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

Re-checkable at any time with `npm run audit:security -- --project <dev|prod>`.

---

## 6. What the current notice says, against what is true

`app/privacy/page.tsx` is a three-paragraph interim notice. Measured against
this inventory:

| Fact | Disclosed? |
|---|---|
| Intake responses, evidence, account details collected | **Yes** |
| Not legal advice, not a law firm, no solicitor-client relationship | **Yes, prominently** |
| Pre-beta status, full policy pending counsel | **Yes** |
| User content sent to OpenAI | **No — no third party is named** |
| Data stored in the United States | **No** |
| Retention period | **No** |
| Deletion rights or process | **No** |
| Cookies | **No** |
| Operating legal entity | **No** |
| Complaint route / PIPEDA | **No** |

**It does not misstate anything. It omits the third-party AI processing, the US
storage location, and the absence of a deletion path** — the three facts a
regulator would consider material.

---

## 7. Open questions counsel must resolve

1. **OpenAI's contracting entity and retention terms for this account**, including
   whether ZDR applies. Determines what the policy can say about sub-processors.
2. **The operating legal entity.** The only contact is a Gmail address.
3. ~~Whether US storage is acceptable for the pre-beta period.~~ **ANSWERED
   2026-09-15** — production holds no third-party data (section 2.2), so
   nothing about anyone else is in the United States. What remains is to stand
   the Canadian production project up before taking real users.
4. **What deletion will actually mean** once built — hard delete, cascade
   behaviour, evidence files in storage, backups.
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
npm run audit:security -- --project dev     # LIVE dev state, read-only
npm run audit:security -- --project prod    # LIVE production, read-only
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

**Production is paused.** Running `--project prod` against it will time out
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
