# docs/security — how to run these, and in what order

Produced by the 2026-09-15 audit. Nothing here has been run against any
database by Claude: CLAUDE.md section 6 puts production changes behind an
explicit go-ahead.

## Order

| Step | File | Safe on production? |
|---|---|---|
| 1 | `01a-rls-enabled.sql` | **Yes — read-only** |
| 2 | `01b-policies-and-roles.sql` | **Yes — read-only** |
| 3 | `01c-anon-grants.sql` | **Yes — read-only** |
| 4 | `01d-case-table-grants.sql` | **Yes — read-only** |
| 5 | `01e-views-and-security-mode.sql` | **Yes — read-only** |
| 6 | `02-remediation.sql` | **No — this modifies. Dev first.** |
| 7 | Re-run 01b and 01d | Read-only |

Run 01a–01e one at a time in the Supabase SQL editor. Each is self-contained
and says what it reports, what to expect, and what a bad result looks like.

## What each one answers

**01a — Is RLS actually on?** One row per table. Anything with
`rls_enabled = false` is the finding; on a case table it is an open door,
because anon already holds privileges there and RLS is the only thing denying.

**01b — Every policy, and who it applies to.** The query that finds Finding 1.
Look at the `roles` column: `{public}` means the policy was written with no
`TO` clause, which includes anon. That is how twelve `dev_full_access_*`
policies granted anonymous write and DELETE on the legal content tables.

**01c — What anon has been granted.** Grants and policies are different layers:
a grant says whether the role may attempt the operation, a policy says which
rows it may touch. With RLS on and no matching policy, Postgres denies — so the
grant alone exposes nothing. It still matters, because it means RLS is the only
layer.

**01d — The seven case tables.** The query that finds Finding 2, and the one to
re-run afterwards. After remediation, **anon should appear zero times.**

**01e — Views.** A view does not enforce the RLS of the tables beneath it
unless it is `security_invoker`; by default it runs as its owner. Read the
`definition` column and check no view selects from a `case_*` table.

## The caveat that applies to all of it

Only three migrations exist for twenty-four tables, so most of this schema was
created through the Supabase dashboard. **The audit behind `02-remediation.sql`
read the migration files, which are a snapshot rather than a guaranteed record
of production.** These five queries are the only thing that can confirm what is
actually there.

`npm run test:anon-grants` checks the migration files and says so at the top of
its own output. A green run there means the files are correct, never that
production is.

## Related

- `DATA_FLOW_INVENTORY.md` — what personal data is collected, where it is
  stored, what leaves the system and to whom. Written for counsel.
- `../OUTSTANDING_ISSUES.md` section 16 — the original anon-grant finding.
