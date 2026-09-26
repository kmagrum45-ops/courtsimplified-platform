# Which Supabase project is which

**THIS FILE IS THE SOURCE OF TRUTH.** Established 26 September 2026 by reading
the live systems, not by reading other documents.

Every fact below was verified by a command, and the command is given. Where the
display name and the reality disagree, **the ref decides**.

---

## The two projects

| Ref | Display name | Region | Status | What it IS |
|---|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | `ca-central-1` | ACTIVE_HEALTHY | **PRODUCTION.** The live database. 2 accounts, 4 cases |
| `icpvzwxyjsdgyqfkwycw` | `courtsimplified-staging` | `ca-central-1` | ACTIVE_HEALTHY | **STAGING.** Created 2026-09-26, clean, no user data |

Both are in organisation `rcxzxczzgsnrrmfdujvv`, on the **free plan with a
2-active-project limit** — which is exactly filled by these two. A third project
cannot be created without pausing one or upgrading, and the CLI has no `pause`
subcommand.

**Both are now in `ca-central-1`**, so a staging run exercises the same Canadian
data-residency path as production. Nothing of ours is in the United States.

### `ffymjxjcnwakgdmldpne` was DELETED on 2026-09-26

The original April project, in `us-west-2`. This file and three others called it
"staging" and said it was empty. It was not: 3 auth accounts — the operator's, a
family member's, and the browser harness's — and 2 cases.

It was deleted on the site owner's explicit instruction, after a backup that was
**verified against a census of its contents** rather than merely checked for
non-zero size: 3 accounts in the dump matching 3 in the census, 3 of 3 with bcrypt
password hashes, 3 auth identities, 2 cases. The backup is at
`courtsimplified-backups/april-ffymjx-20260926-143148/` and holds `schema.sql`,
`data.sql`, `auth-data.sql`, `roles.sql`, and `migration-history.sql` — the 26
legacy migration versions with their statements, which existed nowhere else and
would otherwise have gone with the project.

**A SQL dump does not contain storage object bytes**, only the `storage.objects`
rows. The 730 objects were all in the public `court-forms` bucket; their bytes are
in `courtsimplified-backups/oregon-2026-08-30/storage/` (733 files) and the same
730 objects exist in production. Nothing unique was lost.

**If you find that ref named anywhere, it is stale.**

Row counts for the projects that exist, counted from dumps rather than estimated,
are in `docs/security/DATA_FLOW_INVENTORY.md` §2.2a.

### How production was identified

Not from the name — the name says the opposite. From the deployment:

```
vercel env pull <temp file outside the repo> --environment=production
grep -oE 'https://[a-z]{20}\.supabase\.co' <that file>
  -> https://fddlpnibovkkkgboabqb.supabase.co
```

The Vercel **production** environment's `NEXT_PUBLIC_SUPABASE_URL` points at
`fddlpnibovkkkgboabqb`. That is what serves real users, so that is production,
whatever it is called in the dashboard.

`.env.local` on this machine points at the same ref — i.e. **local development
currently runs against production**. See "State to fix" below.

---

## ⚠️ THE DISPLAY NAMES ARE BACKWARDS

The project named `courtsimplified-dev` is **the live one**.
The project named `courtsimplified` is **the spare**.

Until they are renamed, **identify a project by its ref and never by its name.**
Any instruction anywhere that says "apply it to dev first" is, read literally, an <!-- [dev-wording-quoted] -->
instruction to apply it to production.

---

## Three things that differ from what the older docs say

Recorded rather than silently corrected, because a document that disagrees with
the system is a hazard and somebody should know which way it drifted.

**1. `ffymjxjcnwakgdmldpne` is NOT paused.**
`docs/security/DATA_FLOW_INVENTORY.md` §2.1 and `CLAUDE.md` §6 both record it as
INACTIVE / "dormant and paused". `supabase projects list` reports
**ACTIVE_HEALTHY**. It appears to have been restored at some point without the
docs being updated. Nothing needed restoring.

**2. Vercel has no Supabase variables outside production.**

| Variable | Environments |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production only |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only |
| `OPENAI_API_KEY` | Production, Preview |

So Preview deployments have no database configuration at all, rather than
pointing at the wrong one. That is safe today and is a gap to fill once staging
has the schema.

**3. `ffymjxjcnwakgdmldpne` is not empty, and the source of that belief was an
estimate.** Every document said it held no data. All of them were quoting
`supabase inspect db table-stats`, whose `estimated_row_count` is
`pg_class.reltuples` — a planner statistic that `ANALYZE` and autovacuum maintain
and that reads `0` on any table nobody has analysed. A dump produced 977 KB: 3
accounts and 2 cases. **Row counts in this file and in the inventory now come from
dumps or `count(*)`, never from `table-stats`.**

---

## State to fix

| What | State | Wanted | Blocked on |
|---|---|---|---|
| A staging project | **done** — `icpvzwxyjsdgyqfkwycw`, ca-central-1 | — | — |
| Repo migrations on staging | **done** — 8 of 8, 0 remote-only | — | — |
| Supabase CLI link | **done** — `icpvzwxyjsdgyqfkwycw` | — | — |
| `.env.local` | **done** — points at staging | — | — |
| `supabase/config.toml` `project_id` | **done** — `courtsimplified-staging` | — | — |
| Suite, fixtures, eval against staging | **done** — see setup-report | — | — |
| The 5 pending migrations on production | not applied | applied | nothing — staging is green; this is the next action |
| Production's display name | `courtsimplified-dev` | `courtsimplified-prod` | a valid `SUPABASE_ACCESS_TOKEN` |
| Auth settings, daily backups, PITR | not set | min password 12, email confirmation, MFA | a valid `SUPABASE_ACCESS_TOKEN` |
| Vercel Preview | no Supabase vars | staging vars | nothing — staging now exists |

The token in the environment on 2026-09-26 is 48 characters; a personal access
token is `sbp_` plus 40 **hex** characters, 44 in total. See
`docs/infra/setup-report.md`, Decision 5.

---

## Verifying this file yourself

```
supabase projects list                       # refs, names, regions, status
vercel env pull <temp file> --environment=production
cat supabase/.temp/project-ref               # which project the CLI would target
```

Never paste the contents of an env file anywhere. The ref is public; the keys
beside it are not.
