# Data map — the case workspace

**What this is:** every store that holds a litigant's uploaded documents or anything
derived from them, what is in it, how long it stays, and who can read it.

**Scope.** The case workspace only. `docs/security/DATA_FLOW_INVENTORY.md` is the
whole-product inventory and remains the authority for accounts, intake, email and the
third parties. This document exists because the workspace introduced something the
product had never held before — **the documents themselves** — and that deserves its
own map rather than a section.

**Checked, not asserted.** `test:workspace-export` compares the table list below with
`EXPORTED_TABLES` in `app/api/workspace/export/route.ts` and fails if they disagree. A
table added to one and not the other is the realistic failure — an export that quietly
omits a store is worse than no export, because the person reasonably treats it as
complete.

Last verified against the schema: **2026-09-27**.

---

## 1. What the workspace holds

| Store | What is in it | Keyed to | Exported |
|---|---|---|---|
| `workspace_documents` | One row per uploaded document: original file name, content type, size, SHA-256, upload time, and the user's own label, type, date, parties, amount and notes. Exhibit number and suffix. Extraction status and notice | `user_id`, `case_id` | yes |
| `workspace_document_text` | The text read out of a document, its character count, how it was read (`pdf-text-layer`, `docx`, `plain`, `rtf`, `client-ocr`, `none`), OCR confidence, and **PII flag names only** | `user_id`, `document_id` | yes |
| `workspace_timeline_events` | Events the user added by hand: date, title, type | `user_id`, `case_id` | yes |
| `workspace_communications` | Who said what to whom and when, in the user's own words, optionally linked to a document | `user_id`, `case_id` | yes |
| `case-evidence` bucket (Supabase Storage) | **The document files themselves**, at `{user_id}/{case_id}/{document_id}` | path segment 1 | yes, as short-lived signed URLs |

### 1.1 Two fields that are not what they look like

**`workspace_document_text.pii_flags` holds flag NAMES, never matches.** The column
comment says why: recording the match would put a Social Insurance Number in the table
that exists to warn about Social Insurance Numbers. `scanForPersonalData` has no code
path that returns a matched value, and `test:workspace-pii` serialises the whole result
and asserts no identifier appears in it.

**`workspace_documents.original_name` is stored and never sent to a model.** A file name
is a disclosure in its own right — `restraining-order-application.pdf` tells you
something the user never decided to tell you. It is kept because the user needs to
recognise their own document. `lso-fixes-report.md` Step 8 records that file names used
to reach OpenAI and no longer do; `test:workspace-ai-flag` asserts a payload built from
a document with that file name does not contain it.

### 1.2 Added for a feature that is switched off

`workspace_documents.analysed_at` and `analysis_suggestion` support model-suggested
document details. **Both are NULL for every row and will stay NULL** — see section 4.

---

## 2. Who can read it

**Row Level Security on every table**, policies scoped to `auth.uid() = user_id`.

**The bucket is private** (`public = false`, asserted by a migration and read back from
staging on 2026-09-27), with four policies on `storage.objects` comparing
`(storage.foldername(name))[1]` to `auth.uid()::text`. **That string comparison on the
first path segment is the whole of the cross-user access control**, which is why paths
are only ever built by `documentObjectPath` and ownership is decided by parsing the
path rather than by a prefix test.

**Server routes use a service-role client, which bypasses RLS.** Every query in every
workspace route therefore carries an explicit `.eq("user_id", user.id)`. On those paths
that clause is not belt-and-braces — it is the only thing scoping the query.

**Residency:** both projects are in `ca-central-1`. Nothing of ours is in the United
States.

---

## 3. How long it stays

| | |
|---|---|
| Documents, text, events, communications | Until the user deletes them, or the account is deleted |
| A deleted document | **Gone**: the storage object, the extracted text and the row. Deletion removes the object first, then the row, so a half-failure leaves a row carrying `deleted_at` with its object still present — a findable bug rather than a silent one |
| A failed registration | The object is removed. An object with no row is a file no screen lists and no deletion reaches |

**A delete that cannot remove the file reports failure and says the file is still
there.** Reporting success would be telling somebody their medical record is gone when
it is not.

**There is no automatic retention expiry.** Documents stay until deleted. That is a
deliberate gap and it belongs in section 5: a litigation file needs to survive a case,
and nobody has decided what "the case is over" means here.

---

## 4. What leaves, and what does not

**Nothing in the workspace is sent to any third party today.**

- Extraction runs **in the Node runtime on our own infrastructure** — `pdfjs-dist`,
  `fflate`, `TextDecoder`. No document is sent anywhere to be read.
- OCR runs **in the user's own browser** (`tesseract.js`, English and French). The image
  never leaves their device for that purpose; the recognised text comes back tagged
  `client-ocr` with a confidence score.
- **Adobe PDF Services was refused** on data-residency grounds and removed from
  `package.json` — DATA_FLOW_INVENTORY §3.6.

### 4.1 Model analysis is built and OFF

`AI_DOCUMENT_ANALYSIS_ENABLED` is **false in every environment, including staging.**

It is gated on **two keys**: the environment variable, and `ZDR_CONFIRMED_AT` in
`src/lib/case-workspace/aiAnalysis.ts`, which is `null`. The second cannot be set from
an environment variable or a dashboard — it is a source constant, so turning this on
requires a commit and a diff.

**The blocker is not that the feature is unfinished.** OpenAI has not confirmed that
zero data retention and modified abuse monitoring cover **uploaded documents**. §3.2 of
the inventory establishes that position for text a user typed into a form; nobody has
asked about the contents of a document they uploaded. **As of 2026-09-27 that request
has not been sent.**

`test:workspace-ai-flag` proves the off path: no spelling of the environment variable
turns it on, nothing outside `aiAnalysis.ts` reads that variable, and the route refuses
**before** authentication and before any document is read — a refusal that happens after
a database read has already touched the thing it exists not to touch.

---

## 5. Open, and honest about it

1. **No retention expiry.** Documents stay until deleted. Needs a decision about what
   ends a case and what happens then.
2. **No production backup.** The organisation is on the free plan: no daily backups, no
   point-in-time recovery. This now matters more than it did, because losing the
   database would lose documents a litigant may not have another copy of.
3. **Signed URLs in an export are minutes long and cannot be revoked** once issued.
4. **The ZDR/MAM request has not been sent.** Section 4.1.
5. **Deletion completeness is asserted at source level, not end to end.** The integration
   test against a real object and a real account is Slice 4.

---

## 6. Proposed privacy-policy wording

**Drafted for counsel, not adopted.** Every sentence describes something this document
records as true today. Where the truth is awkward the wording says so rather than
rounding it off — a policy that overstates a protection is worse than one that admits a
gap, because it is the one people rely on.

> **Your documents**
>
> When you upload a document, we store the file and a record of what you told us about
> it. We also read the text out of it so you can search it and so it can take its place
> in your timeline.
>
> **Where your documents are.** On servers in Canada. We do not send your documents to
> any other company.
>
> **Reading text from photographs.** If you upload a photograph or a scan, the reading
> happens inside your own web browser. The picture does not leave your device for us to
> read it.
>
> **We do not use your documents to train anything**, and we do not send them to an
> artificial-intelligence service. If that ever changes we will tell you before it does,
> and we will say exactly what would be sent.
>
> **What we notice, and what we do not.** We look for things like a Social Insurance
> Number or a bank account number in your documents, so we can point them out to you. We
> record only that one was found — never the number itself.
>
> **When you delete a document** we delete the file, the text we read from it, and our
> record of it. If we cannot delete the file we tell you so, rather than saying it is
> gone.
>
> **How long we keep it.** Until you delete it, or until you close your account. We do
> not currently delete documents automatically after a period of time.
>
> **Getting a copy.** You can export everything we hold about you at any time. The export
> lists what it contains and what it does not.

### 6.1 Two sentences counsel should look at first

- **"We do not send your documents to an artificial-intelligence service."** True today
  and enforced by a two-key gate. It stops being true the moment section 4.1 is
  unblocked, so it needs to be worded as a present statement with a commitment to notify
  — which is how it is drafted above.
- **"Until you delete it, or until you close your account."** Accurate, and it is a
  weaker retention promise than a reader may expect. Section 5 item 1.
