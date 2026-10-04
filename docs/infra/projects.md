# Which Supabase project is which

**THIS FILE IS THE SOURCE OF TRUTH.** Established 26 September 2026 by reading
the live systems, not by reading other documents.

Every fact below was verified by a command, and the command is given. Where the
display name and the reality disagree, **the ref decides** — and although the
names are now honest, that rule stands, because a name is editable in a dashboard
and a ref is not.

---

## The two projects

| Ref | Display name | Region | Status | What it IS |
|---|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-prod` | `ca-central-1` | ACTIVE_HEALTHY | **PRODUCTION.** The live database. 2 accounts, 4 cases. Vercel **Production** points here |
| `icpvzwxyjsdgyqfkwycw` | `courtsimplified-staging` | `ca-central-1` | ACTIVE_HEALTHY | **STAGING.** Created 2026-09-26, clean, no user data. Vercel **Preview** points here |

### The names were fixed on 2026-09-26

Production was called **`courtsimplified-dev`** from its creation on 2026-08-26
until 2026-09-26. Renamed via the Management API:

```
PATCH /v1/projects/fddlpnibovkkkgboabqb   {"name":"courtsimplified-prod"}
  -> HTTP 200 {"ref":"fddlpnibovkkkgboabqb","name":"courtsimplified-prod"}
```

Confirmed with `supabase projects list`. `supabase/environments.json` now carries
`renameComplete: true`, which is what silences the warning
`scripts/db/applyMigrations.ts` prints on every run.

**⚠️ Anything written before 2026-09-26 that says "dev" may mean PRODUCTION.**
The old name survives in this repository's history, in the historical passages of
several documents, and in four migration files — the migrations are deliberately
not edited, because the migration ledger stores their hashes. `npm run
test:db-environments` asserts that CLAUDE.md keeps warning about this, and it will
go on mattering for as long as the history exists.

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
| Catalogue seed on staging | **done** — 1371 rows, all 17 tables matching the snapshot | — | — |
| The 5 pending migrations on production | **done** — 8 applied / 0 pending / 0 remote-only, row counts unchanged | — | — |
| Workspace + story-proposal migrations (20260927×5, 20260928) | **done 2026-09-30** — staging then production via `npm run db:migrate`, after `npm run db:backup -- --env production`; 0 pending on either | — | — |
| Migration fingerprints on Windows | **fixed 2026-09-30** — hashes were taken over CRLF text on Windows, so recorded migrations showed as pending; `migrationHash` now normalizes line endings before hashing, and the five ledger entries hashed over CRLF were rewritten to the normalized hash (same content, verified) | — | — |
| Production's display name | **done** — `courtsimplified-prod` | — | — |
| Production auth settings | **done** — min password 12, email confirmation required, TOTP MFA on | — | — |
| Vercel Preview | **done** — the three staging Supabase variables | — | — |
| Daily backups on production | **NOT POSSIBLE** | daily backups | **the free plan provides none.** Needs Pro |
| Point-in-time recovery | **NOT POSSIBLE** | PITR | **paid add-on, $100/month for 7 days**, and needs Pro |
| `SITE_ACCESS_PASSWORD` on Preview | **done** — its own value, not production's | — | — |

### Two things that are deliberately not done

**Production has no automatic backups at all.** The organisation is on the free
plan. `GET /v1/projects/fddlpnibovkkkgboabqb/database/backups` returns
`"pitr_enabled": false` and `"backups": []`. PITR is offered as an add-on at
**$100/month (7 days)**, $200 (14 days), $400 (28 days), and requires Pro. Enabling
it spends money, so it was left for the site owner. **Until then the only backups
in existence are the manual dumps under `courtsimplified-backups/`.**

**Vercel Preview has its own site password, deliberately not production's.**
`middleware.ts` **fails closed** — with `SITE_ACCESS_PASSWORD` unset, every request
is rejected including `/site-access` itself — so Preview needed its own value before
it could serve anything. A fresh 28-character value was generated and stored at
`courtsimplified-backups/preview-password.txt` for Jason; **move it into a password
manager and delete the file.**

Verified rather than assumed: Preview **accepts** that value (`POST
/api/site-access` → 200, cookie set `HttpOnly, Secure, Path=/`) and **rejects
production's** (→ 401). `GET /` then returns 200 with the real homepage. Production's
own site password is only 11 characters — short for a shared gate, and worth
rotating deliberately rather than as a side effect of this work.

**Staging's auth is deliberately NOT hardened.** `password_min_length` is 6 and
`mailer_autoconfirm` is false there. The browser harness signs up real accounts, so
a 12-character minimum or a confirmation requirement would break it. Production's
hardening must not be copied to staging without fixing the harness first.

---

## GitHub Actions secrets point at PRODUCTION (found 2026-10-04)

The repository secrets `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` resolve to
`fddlpnibovkkkgboabqb` — **production**. Established by
`scripts/walkthrough/guard.ts`, which posts the ref it would use as a workflow
annotation (readable via the check-run annotations API; logs are not reachable
from a Claude session). Every workflow that reads those secrets
(`courtsimplified-ci.yml`, `courtsimplified-nightly-ai.yml`,
`supabase-keep-alive.yml`) therefore runs with production credentials,
including the service-role key.

The page walkthrough (`courtsimplified-walkthrough.yml`) reads
`STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PUBLISHABLE_KEY` and
`STAGING_SUPABASE_SERVICE_ROLE_KEY` first and refuses to run until they exist.
Pointing the CI workflow at staging the same way is outstanding.

---

## Verifying this file yourself

```
supabase projects list                       # refs, names, regions, status
vercel env pull <temp file> --environment=production
cat supabase/.temp/project-ref               # which project the CLI would target
```

Never paste the contents of an env file anywhere. The ref is public; the keys
beside it are not.
