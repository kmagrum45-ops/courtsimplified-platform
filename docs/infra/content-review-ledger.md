# The content review record (`content_reviews`) — PR description draft

Review lane, piece 2. Site owner's spec, 2026-10-29:

> a content_reviews table where only site operators can add rows; the database
> sets the date (never typed, never backdated); rows are never edited or
> deleted; each row chained to the one before; a copy of the chain kept outside
> the database.

**Status: written, not applied.** The migration is
`supabase/migrations/20261030090000_add_content_reviews.sql`. Nothing in this
repository applies it (CLAUDE.md s. 6). The owner applies it after approving it,
staging (`icpvzwxyjsdgyqfkwycw`) first, through `scripts/db/applyMigrations.ts`,
with a backup before production (`fddlpnibovkkkgboabqb`). Nothing reads the
table yet, so the site works the same before and after.

## What the migration does

| Owner's rule | How it is held |
|---|---|
| Only site operators add rows | INSERT policy `WITH CHECK is_site_operator()`, and the insert trigger checks it again, so the service role and the table owner are refused as well. Rows are written with the operator's own sign-in, never the service key, so the database records who reviewed. |
| The database sets the date | The trigger overwrites `reviewed_at` with `clock_timestamp()` (to the millisecond) after it takes the chain lock, and `reviewer_id` with `auth.uid()`. Neither column is in the INSERT grant, so a client cannot name them. |
| Never edited or deleted | No UPDATE/DELETE policy. UPDATE, DELETE and TRUNCATE are revoked from anon, authenticated and service_role. A row trigger refuses UPDATE and DELETE, and a statement trigger refuses TRUNCATE, for every role including the table owner. All three triggers are `ENABLE ALWAYS`, so `session_replication_role = replica` does not switch them off. |
| Each row chained to the one before | `row_hash` = sha256 of a canonical, length-prefixed serialisation of every field plus `prev_row_hash`, which is the previous row's `row_hash`. The first row's `prev_row_hash` is 64 zeros. The trigger takes a transaction advisory lock, then reads the previous row and assigns `id` = previous + 1. Concurrent inserts therefore cannot fork the chain, and ids have no gaps. `prev_row_hash` is UNIQUE as a second guard against a fork. |
| A copy outside the database | Proposed below. Not built. |

**The honest limit.** The database owner (the `postgres` role, or anyone with
the dashboard) can still drop or disable the triggers and rewrite rows. Nothing
inside a database can stop its owner. What the chain plus the outside copy give
is detection: changing any field changes that row's hash and breaks the next
row's link, and the outside copy keeps the hashes as they were. A rewrite is
detectable, not impossible.

### What changed from the earlier proposal, and why

- **`id` is assigned by the trigger under the lock, not by an identity
  sequence.** A sequence hands out ids before the BEFORE trigger runs and before
  the lock is taken. With a sequence, two concurrent inserts could get ids 5
  and 6, and the transaction holding 6 could commit first, so "previous row by
  id" would fork the chain. Assigning `id` under the lock makes chain order and
  id order the same. It also leaves no gaps, so a missing id in the outside copy
  means a row was deleted.
- **`reviewed_at` uses `clock_timestamp()` read after the lock, not `now()`.**
  `now()` is the time the transaction started. A transaction that waited for
  the lock would carry an earlier date than the row it chains after.
- **Only operators can insert, whatever the role.** The trigger refuses an
  insert from anyone who is not a signed-in operator, including the service role
  and the SQL editor. This keeps the owner's "only site operators" true even for
  the server key. A review screen (piece 3) must insert with the operator's own
  session.
- **The database computes `item_hash` and `after_hash`.** `item_hash` is the
  sha256 of `before_text`, the exact text reviewed. If a client supplies a value
  that disagrees, the insert is refused. This guarantees the hash describes the
  text actually stored.
- **New column `after_hash`** (sha256 of `after_text`), so "needs review" can be
  answered for an item whose text was changed by its review.
- **`result` and `after_text` are tied together.** `changed` requires an
  `after_text` that differs from `before_text`. `approved` and `removed` forbid
  one.
- **No foreign key from `reviewer_id` to `auth.users`.** A cascade would try to
  delete history, which the trigger blocks, so the account could never be
  deleted. The record of who reviewed should outlive the account.
- **READ COMMITTED only.** Under REPEATABLE READ the trigger could read a stale
  "previous row" after waiting for the lock, so it refuses those isolation
  levels. PostgREST and supabase-js use READ COMMITTED.
- **The public site does not read the table.** Content is served from the code
  catalogues by the server, which can read reviews with the service role
  (SELECT only). No view or function exposes anything, not even removed ids, to
  anon or ordinary users. If a browser-side need appears, add a SECURITY DEFINER
  function returning only `item_id` and `result` for removed items, and list it in
  `rlsManifest.mjs` `definerFunctionsClientsMayCall`.

### "Needs review" is computed, never stored

An item is reviewed when some row has:

- `result = 'approved'` and `item_hash` = sha256(UTF-8) of the item's current
  text, **or**
- `result = 'changed'` and `after_hash` = sha256 of its current text.

Anything else needs review, including text edited after it was reviewed. A
`removed` row never makes an item reviewed. JavaScript gives the same hash with
`createHash("sha256").update(text, "utf8").digest("hex")`.

### The canonical serialisation (for anyone re-verifying the chain)

```
"content_reviews.v1" + field(id) + field(item_id) + field(item_hash)
  + field(reviewer_id) + field(reviewed_at) + field(source_ref)
  + field(source_retrieved_at) + field(source_sha256) + field(quote_check)
  + field(result) + field(before_text) + field(after_text) + field(note)
  + field(prev_row_hash)

field(NULL) = "~"
field(v)    = <UTF-8 byte length of v> ":" v
timestamps  = UTC, to the millisecond, "YYYY-MM-DDTHH:MM:SS.mmmZ" (Date#toISOString)
row_hash    = lower-case hex sha256 of the UTF-8 bytes
```

This was checked by recomputing two rows' hashes in Node, one of them with
non-ASCII text and a microsecond timestamp that the database truncated, and
matching the trigger's output (scratch PGlite run, see below).

## The outside copy: proposal only, not built

**A scheduled GitHub Actions workflow, daily, that appends the chain to a
JSON-lines file on a separate branch `review-ledger`.**

1. **Read.** Read every row from `content_reviews`, read-only, ordered by `id`,
   through the REST API.
   - **Key: the staging service-role key (`STAGING_SUPABASE_SERVICE_ROLE_KEY`,
     already a repository secret), against STAGING only, until the owner says
     otherwise.** On this table the service role can only SELECT: insert is
     refused by the trigger, and update, delete and truncate by the grants and
     triggers. But the same key has full power over every other staging table,
     which is acceptable only because staging holds no user data.
   - **For production, the recommendation is not the production service key.**
     Use a dedicated login role, `content_review_reader`, with `SELECT` on
     `content_reviews` and nothing else. The owner creates it in the SQL editor,
     so its password never appears in the repository, and stores its
     connection string as a repository secret. Then a leak of that secret
     exposes the review record and nothing more. This needs a small follow-up
     migration (the role grant), and the owner decides it.
2. **Verify.** Recompute every row's `row_hash` from the canonical
   serialisation. Check that each `prev_row_hash` equals the previous row's
   `row_hash`, that ids run 1..n with no gap, and that the first link is 64 zeros.
3. **Compare with the copy.** Every row already in `review-ledger/content_reviews.jsonl`
   must match the database byte for byte. If an earlier row no longer matches,
   has gone missing, or the chain no longer verifies, the job **fails loudly**:
   the run goes red, it opens an issue (or emails the owner through the usual
   failed-workflow notice), and it writes nothing.
4. **Append.** New rows go to the end of the file, committed to `review-ledger`
   with a message naming the id range and the last `row_hash`.
5. **Branch protection.** A ruleset on `review-ledger` blocks force-push and
   deletion, and the branch carries a `vercel.json` with
   `{"git": {"deploymentEnabled": false}}` (CLAUDE.md s. 5a: a branch that is
   not the site is never built). A pushed, protected commit history is a second
   chain: rewriting the copy needs a force-push, which the ruleset refuses.
6. **Cost.** No model calls and one REST read a day. It runs `spendGuard`
   only if the workflow template requires it.

### Alternatives considered

| Option | Why not chosen |
|---|---|
| **GitHub release asset** (upload the `.jsonl` as an asset on a release each day) | Assets can be deleted and replaced by anyone with write access, with no history of the earlier bytes. A release is a mutable container, so the copy would be weaker than the database it guards. |
| **A second storage bucket** (Supabase Storage, write-once object per day) | It lives in the same Supabase organisation, with the same owner and the same dashboard, so the person who could rewrite the table could also rewrite the bucket. An outside copy must sit outside the database owner's reach. |
| **`review-ledger` branch (proposed)** | Outside Supabase entirely. Git history is itself a hash chain. Branch protection makes a rewrite need a force-push, which is refused and logged. The file is readable and diffable by anyone with repository access, and nothing is spent. |

Its limit, stated the same way: a repository admin can turn off the ruleset.
Rewriting both the database and the branch so that they agree would need both
the Supabase owner and a GitHub admin, and every clone of the branch would still
show the old history.

## Tests

- `npm run test:content-reviews-migration`
  (`scripts/verification/verifyContentReviewsMigration.ts`, in CI). Reads the
  SQL only and asserts the properties above. It also scans **every** migration
  for anything that undoes them later: an UPDATE, DELETE or ALL policy, a grant
  of update, delete, truncate or all, or a disabled trigger. Each check was
  shown to fail on a deliberately weakened copy (29 weakenings, all caught).
- `npm run test:rls-matrix` (in CI). `content_reviews` is declared in
  `rlsManifest.mjs` as an `appendOnlyLedger`, and the matrix now attacks it in a
  real Postgres:
  - anon, a non-operator and the service role cannot read or insert as
    applicable;
  - the operator inserts in their own name, dated by the database, and cannot
    supply a reviewer or date;
  - nobody, including the operator, the service role and the table owner, can
    update, delete or truncate;
  - the rows form one gapless chain.
  `test:rls-matrix-catches` gains two plants: the refusing trigger dropped, and
  `is_site_operator()` opened to every account.
- A scratch run in PGlite (an in-memory Postgres, nothing committed, no project
  touched) applied every migration and ran 36 behaviour checks against the
  table: chain, hashes, grants, policies, superuser and replica-mode refusals,
  isolation guard, and no gaps after refused inserts. All passed.
