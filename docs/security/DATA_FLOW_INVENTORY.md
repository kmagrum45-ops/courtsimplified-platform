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
| **Supabase Postgres (`courtsimplified`)** | Accounts, cases, intakes, evidence metadata, generated documents, events | **`us-west-2` — Oregon, United States** |
| **Supabase Storage, bucket `case-evidence`** | Uploaded evidence files | Same project, same region |
| **Supabase (`courtsimplified-dev`)** | Development only; no real user data intended | `ca-central-1` — Canada |
| **Browser `localStorage`** | A compact draft (province, city, names, facts, timeline, evidence, goal), the active case id, and case-context blobs | The user's own device |
| **Cookie `cs_site_access`** | The shared site password, HttpOnly | The user's own device |

### 2.1 Data residency — stated plainly

**Ontario users' litigation narratives, party names and addresses, and uploaded
evidence are stored in the United States.**

`docs/ARCHITECTURE.md:528` records that `us-west-2` "was never a deliberate
data-residency choice". A move to `ca-central-1` is documented as a planned
follow-up and **has not happened**. The development project is already in
Canada; production is not.

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
  the database.
- There is no documented process for that, and no record of it having been done.
- Cascade behaviour on deleting an auth user has **not been verified**. Whether
  case rows, evidence rows and storage objects are removed with the account is
  unknown, and should be tested before any deletion commitment is made in a
  policy.

### 4.3 Browser-side data

`localStorage` holds a compact draft and case-context blobs. Clearing browser
data removes it. Nothing in the product tells the user this.

---

## 5. Access controls, as they stand

| Control | State |
|---|---|
| Row Level Security | **Enabled on all 24 tables** |
| Case-table policies | All scoped `TO authenticated USING (auth.uid() = user_id)`. **No anon policy exists on any case table** |
| Evidence storage | Scoped to `bucket_id = 'case-evidence' AND foldername[1] = auth.uid()` |
| Site-wide gate | Single shared password, HttpOnly cookie, covers `/api/*` |
| Rate limiting | **None** |
| Secrets in version control | **None.** No `.env` has ever been committed; a pattern scan of all tracked files is clean |

**Two findings were identified in the 2026-09-15 audit and remediation is
written but not yet applied to production** (`docs/security/02-remediation.sql`):

1. Twelve policies had no `TO` clause and therefore applied to `PUBLIC`,
   including anonymous callers, granting write and delete on **legal content
   tables** — the rules and form data served to users. No personal data. The
   exposure is content integrity.
2. `anon` held `ALL` on the five case tables. **No data was exposed** — RLS
   denies by default and no anon policy exists — but it left RLS as the only
   layer rather than the second.

Two unauthenticated admin surfaces (`app/admin/pdf-field-mapper`,
`app/api/admin/scan-pdf-fields`) remain, and are recorded as known open holes in
`scripts/verification/verifyAnonGrants.ts`.

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
3. **Whether US storage is acceptable for the pre-beta period**, and what must be
   disclosed while it persists.
4. **What deletion will actually mean** once built — hard delete, cascade
   behaviour, evidence files in storage, backups.
5. **The opposing party's data.** The platform holds identifying information and
   allegations about a person who is not a user. What, if anything, is owed to
   them.
6. **Whether children's information in family matters** triggers any additional
   obligation.

---

## 8. Verification

Everything above can be re-checked:

```
npm run test:anon-grants          # migration-file grants and policies
docs/security/01-audit-current-state.sql   # LIVE database state — read-only
```

**One caveat that applies to this whole document.** Only three migrations exist
for twenty-four tables, so most of the schema was created through the Supabase
dashboard. The access-control section was verified against the migration files,
which are a snapshot rather than a guaranteed record of the live database.
`01-audit-current-state.sql` is the only thing that can confirm production, and
it has not been run.
