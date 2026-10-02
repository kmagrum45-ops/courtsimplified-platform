# RLS gap analysis — 2026-10-02

Produced with `npm run test:rls-matrix`, which builds a private Postgres from
`supabase/migrations/`, then attacks every table, view, function and the evidence
bucket as an anonymous visitor, two signed-in users and the service role. Every
finding below was **reproduced by running it**, not read off the DDL.

**What was tested:** the 14 migration files as they stand on `main` at `eb20bdd`.
**What was not:** production itself. See "Limits" — the files are a record of
production, not a guarantee of it.

## Result

465 checks. **448 pass. 17 fail, grouped into 5 findings.** None lets an anonymous
visitor in, and none lets one litigant read another's rows or files directly.

| # | Finding | Who can do it | Severity |
|---|---|---|---|
| F1 | Rewrite or delete the family form catalogue through a view | any signed-in user | **High** |
| F2 | Rewrite or delete the form-filling overlay map | any signed-in user | **High** |
| F4 | Point a document row at another user's stored file, then export it | signed-in user who knows the victim's file path | **Medium** |
| F3 | Attach rows to another user's case or document | signed-in user who knows the case id | **Low today, rises with sharing** |
| F5 | `TRUNCATE` held on 33 tables and views (it ignores RLS) | signed-in user, if any SQL path reaches it | **Low** (defence in depth) |

What holds, across all 11 user-owned tables and the bucket: no cross-user read,
update or delete; no row written in someone else's name; no row handed to someone
else; no anonymous access of any kind; the bucket is private and every object is
confined to its owner's folder; `ai_call_log` and `prune_ai_call_log` are closed to
clients; no policy applies to `PUBLIC`.

---

## F1 — `family_form_lookup` lets any signed-in user write `court_forms`

**Reproduced:** as `authenticated`, `UPDATE public.family_form_lookup SET official_title = …`
changed 1 row in `court_forms`; `DELETE` removed it. The same user reading
`court_forms` directly sees 0 rows — RLS is fine on the table; the view walks
around it.

**Why:** a view runs with its *owner's* rights unless it is `security_invoker`.
This one is owned by `postgres` (who owns `court_forms`, so RLS does not apply),
it is a plain filtered `SELECT` and therefore auto-updatable, and
`20260915090000` revoked writes on it from `anon` only — `authenticated` still
holds `GRANT ALL` from the baseline. PostgREST exposes it as
`/rest/v1/family_form_lookup`.

**Impact:** anyone who signs up can alter or wipe the family entries of the form
catalogue. Nothing in `app/` reads `court_forms` today, which limits the
user-facing damage, but production has **no automatic backups** (CLAUDE.md §6).

**Fix (one migration):** `ALTER VIEW public.family_form_lookup SET (security_invoker = on);`
and `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.family_form_lookup FROM authenticated;`.
Apply the same `security_invoker` to the two other views for consistency (they are
aggregates, so not writable today, but would become so if simplified).

## F2 — `pdf_overlay_fields` is writable by every signed-in user

**Reproduced:** as `authenticated`, insert, update and delete all succeed.

**Why:** `20260915120000` added `pdf_overlay_fields_write_authenticated`
(`FOR ALL TO authenticated USING (true)`) so `/admin/pdf-field-mapper` could save.
That page is behind the site password gate, not behind an admin check, so
"authenticated" means every account.

**Impact:** `app/api/generate-form/route.ts` reads these rows to decide where each
answer is printed on a court form. Anyone with an account can move every user's
answers to the wrong boxes on forms they will file, or delete the map and break form
generation. No backups.

**Fix — needs your decision on how an admin is recognised:**
1. *Recommended:* move the mapper's saves to a server route that checks the caller is
   you (an allow-list of user ids, or an `app_metadata.role = 'admin'` claim set in the
   Supabase dashboard) and writes with the service role; drop the policy and revoke
   `INSERT, UPDATE, DELETE` from `authenticated`.
2. Keep browser writes, but change the policy to
   `USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')`.

## F4 — a workspace document row can point at another user's file

**Reproduced:** as the attacker, `UPDATE workspace_documents SET storage_path = '<victim>/<case>/file.pdf'`
on their own row succeeds.

**Why:** the policies check `user_id` but not `storage_path`. The upload route always
builds the path itself, but `authenticated` also holds `INSERT`/`UPDATE` on the table
through the API, so the route is not the only way in.

**Impact:** `app/api/workspace/export/route.ts` (and `exhibit-book`, `extract`) take
each of the caller's rows and sign or download **whatever path the row holds**, with
the service role. Point a row at the victim's file, call export, receive a working
link to it. The attacker needs the victim's full path — their user id, case id and
document id — which the product never shows, so this is not drive-by. It turns any
future leak of those ids (a screenshot, a log, a support email) into a leak of
medical records or bank statements.

**Fix:** add to the insert and update policies
`AND (storage.foldername(storage_path))[1] = auth.uid()::text`. Better still, since
every write to the four workspace tables goes through server routes, revoke
`INSERT, UPDATE, DELETE` on them from `authenticated` and keep only `SELECT`.

## F3 — rows can be attached to another user's case

**Reproduced on all 10 child tables:** the attacker inserts a row with their own
`user_id` but the victim's `case_id` (or `document_id`), and can move an existing
row there. Policies check `user_id`; foreign keys check only that the case exists.

**Impact today: low.** Every read path found is scoped by `user_id` — the events
routes use the caller's RLS client, the workspace routes add `.eq("user_id", …)` —
so the planted row is invisible to the victim and to the app.

**Why it still matters:** the planned two-party negotiation space is exactly a
feature where reads become *case*-scoped rather than user-scoped. From that day,
this becomes "write into the other party's case".

**Fix:** composite foreign keys — add `UNIQUE (id, user_id)` on `cases` and
`workspace_documents`, then `FOREIGN KEY (case_id, user_id) REFERENCES cases (id, user_id)`
on each child. Enforced by Postgres for every role, including the service role.

## F5 — `authenticated` holds `TRUNCATE` on 33 tables and views

`TRUNCATE` is not subject to RLS. PostgREST cannot issue it and no function in the
schema runs arbitrary SQL, so this is not reachable today. It comes from the
baseline's `GRANT ALL` and the default privileges for new tables. **Fix:**
`REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;`
plus `ALTER DEFAULT PRIVILEGES … REVOKE` so new tables do not get it back.

---

## Smaller observations (not failing checks)

- `court_forms` is readable by `anon` (family rows only) but **not** by signed-in
  users — there is no `authenticated` policy. Harmless while nothing reads it as a
  signed-in user; surprising when something does.
- `case_documents`, `case_evidence` and `case_generated_documents` are unused
  (`docs/case-workspace-report.md`). Unused tables with live grants are attack
  surface with no benefit. Dropping them is your call.
- `cases` carries two overlapping policy sets (`Users manage own cases` and the four
  `cases_*_own`). Equivalent today; one should go so a future edit is not made to
  the wrong one.

## Limits — what this suite cannot see

1. **Production drift.** It tests the migration files. Anything created in the
   Supabase dashboard and never written into a migration is invisible to it. Close
   this by running the read-only queries in `docs/security/01a–01e` against
   production, or by feeding a `supabase db dump --schema-only` of production
   into the suite (a follow-up).
2. **Service-role code.** Routes using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS
   entirely; their safety is the `.eq("user_id", …)` in the code. F4 is an example
   of how that goes wrong. A static check that every service-role query on a user
   table filters by the caller would cover it (a follow-up).
3. **Storage API behaviour** — signed URL expiry, the bucket's MIME and size limits —
   is enforced by Supabase's storage server, not Postgres. `test:workspace-rls`
   covers it against staging.
4. **Postgres version.** The suite uses the runner's PostgreSQL 16; Supabase runs
   15 or 17. RLS semantics did not change between them.

## Running it

- `npm run test:rls-matrix` — about 20 seconds, no secrets, runs in CI.
- `npm run test:rls-matrix-catches` — plants nine regressions and proves each is
  caught by the check named for it (about three minutes; run after changing the suite).
- New table → add one line to `scripts/verification/rls/rlsManifest.mjs`, or the
  suite fails. That is deliberate.
- Fix a finding → delete its lines from `knownGaps`, or the suite fails with
  "fixed — still listed".
