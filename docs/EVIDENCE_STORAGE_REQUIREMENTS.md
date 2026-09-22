# Requirements for the day CourtSimplified stores a document

**Status: not built, and nothing here is implemented.** This file exists so that
the safeguards are settled *before* the feature rather than bolted on after, and
so that the person who builds document storage does not have to rediscover why
each one is here.

**Provenance, stated plainly:** the LSO implementation brief's Step 8 asked for
upload safeguards. Krystel's instruction on 2026-09-22 was to skip scanning
"since files are discarded", to add the pre-upload warning, to confirm what
reaches OpenAI, to fix UI copy implying storage — and to *record the full Step 8
safeguards as a requirement for when document storage is built*. Items 1 and 2
below are verbatim from that instruction. Items 3 onward are the standard set
that a document-storage feature needs and are **proposed, not approved** — they
should be reviewed and cut or added to before anyone builds against them.

---

## What is true today (verified 2026-09-22)

There are three file pickers, in `SmallClaimsIntake.tsx`, `FamilyIntake.tsx` and
`CivilIntake.tsx`. All three run the same handler shape:

```ts
const nextFiles = Array.from(files).map((file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}`,
  name: file.name,
  size: file.size,
  type: file.type || "Unknown file type",
  lastModified: file.lastModified,
  // ...user-typed fields
}));
```

The `File` object is read for four metadata properties and then dropped. There
is no `FileReader`, no `arrayBuffer()`, no `readAsText`, no `readAsDataURL`, and
no request body anywhere that carries file bytes. The only `arrayBuffer()` call
in the whole codebase is `app/api/generate-form/route.ts:1260`, on a blank PDF
form fetched from a court website — not on anything a user chose.

**So: no file content reaches OpenAI, because no file content is ever read.**

**What does reach OpenAI** is the file *name*, its size, its MIME type, and
whatever the user typed into the title, description, category, date, source and
relevance fields, all of which are assembled into the case description that the
analysis call sends.

A filename is a disclosure. `restraining-order-application-2025.pdf` tells you
something the user never decided to tell you, because nobody thinks of a
filename as content. That is why the notice at the picker says to check the name
before choosing, and it is the one live risk in the current, storage-free
design.

`case_evidence` exists as a table and there is a storage bucket. Both are empty:
0 rows, 0 objects. Nothing writes to either.

---

## 1. The pre-upload warning — BUILT (2026-09-22)

`app/_components/EvidenceFileNotice.tsx`, rendered at all three pickers, above
the input rather than below it. It states that files are not uploaded, saved or
stored; that the name and the user's own words are what get recorded and sent;
and that these should not be added:

- anything covered by solicitor-client or litigation privilege
- anything a court has sealed or ordered kept confidential
- anything subject to a publication ban
- health, medical or counselling records belonging to someone other than the user

The wording deliberately makes **no statement about what those orders do or
whether one applies to the reader** — that would be legal content about the
reader's situation. It says only: if your document is one of these, do not put
it through this screen. **The wording is flagged for licensee review.**

## 2. UI copy must not imply storage — DONE (2026-09-22)

Every heading said "Upload". Nothing was uploaded. Changed:

| Where | Was | Now |
|---|---|---|
| `SmallClaimsIntake.tsx` | Upload and describe evidence files | List and describe your evidence |
| `FamilyIntake.tsx` | Upload and describe family-law evidence | List and describe your family-law evidence |
| `CivilIntake.tsx` | Upload civil evidence files | List your civil evidence |
| all three | Choose evidence files | Choose files to list |
| `CivilIntake.tsx:441` | N uploaded evidence file(s) captured. | N evidence file(s) listed. |

`uploadedEvidenceFiles` is still the variable name throughout. That is internal
and was left alone deliberately: renaming it touches every intake and the
analysis payload for no user-visible gain, and this document is a better record
of the discrepancy than a rename would be. **If storage is ever built, rename it
then** — at that point the name will finally be true, and the diff will be
reviewed anyway.

---

## Everything below is PROPOSED and NOT APPROVED

## 3. Scanning, which is only now required

Skipping malware scanning was correct *because the file is discarded*. The
moment a byte is retained, that reasoning expires and does not partially
survive: a stored file is served back to someone.

- Server-side scan before the object is readable by anyone, including the
  uploader. Not client-side, and not after the object is already addressable.
- A file that fails is rejected, not quarantined-and-listed. A quarantine that
  users can see is a queue someone eventually releases from.

## 4. Type allowlist and size cap

- An **allowlist** of accepted types, not a deny-list of rejected ones — the
  same argument as `outputGuard.ts`: a deny-list establishes only that a thing
  is not on the list someone thought of.
- Validate by content sniffing, never by extension or by the browser-supplied
  MIME type. Both are user-controlled.
- A per-file and a per-case size cap, both enforced server-side.

## 5. Access control

- RLS on the storage bucket scoped to the owning user, written the same way the
  `cases` policies are, and covered by `verifyCaseRlsPolicyContract`-style
  assertions rather than by inspection.
- Reads through short-lived signed URLs. No public bucket, no long-lived URL,
  no object path that is guessable from a case id.
- Encryption at rest. Confirm what Supabase provides by default rather than
  assuming it; record the answer here with the date.

## 6. Retention and deletion

- The privacy page has to say how long a stored document is kept, and the answer
  has to be a number. "Until you delete it" is only acceptable if deletion
  actually works, which means a tested path, not a button.
- Deleting a case deletes its objects. An orphaned object in a bucket is a
  document a user believes they deleted.
- `privacy@courtsimplified.com` deletion requests must reach the bucket too,
  not only the database.

## 7. What may reach OpenAI, and what the user is told

The current position — no file content leaves the device — is the strongest one
available and should not be traded away silently.

- If document *text* is ever extracted and sent to a model, that is a material
  change to the privacy page, not an implementation detail. It needs its own
  notice at the point of upload and its own line in the privacy policy.
- The audit log's Decision 1 (no narrative stored) applies to extracted document
  text as well. `input_sha256` and `input_chars`, never the text.

## 8. Audit

- Every read of a stored object logged: who, which object, when.
- Included in the quarterly supervision report
  (`scripts/compliance/aiQuarterlyReport.ts`), which today reports only on model
  calls.

## 9. The warning has to change

Item 1's notice says files are not uploaded, saved or stored. On the day that
stops being true, that notice becomes the most misleading text on the site. It
is the first thing to rewrite, not the last.
