# Infrastructure setup — what was done, what is blocked, what is yours

**26 September 2026, branch `infra-staging`.** Every fact below was read from the
live systems with the command shown beside it.

No secret, token, password or connection string appears in this file or in any
command that produced it. Project refs and organisation ids do appear — those are
identifiers, not credentials.

---

## The headline

**Step 1 is done and is the most valuable part.** Which project is which is now
established by reading Vercel and Supabase rather than by reading a document, and
it is written down in `docs/infra/projects.md`.

**Step 2 is BLOCKED at the schema push, and I stopped rather than guess.** The
reason is a real state mismatch that no document records, explained in full below.

**Step 3 was not attempted**, because it must not be: staging has not passed.

**Two live hazards were found and closed** — both were quietly true for some time.

---

## What was actually wrong when I started

### 1. The Supabase CLI was linked to PRODUCTION

```
cat supabase/.temp/project-ref   ->  fddlpnibovkkkgboabqb
```

That is the live database. Any `supabase db push` run from this machine, by
anybody, at any point, would have gone to production. Now linked to staging, and
`npm run db:staging` / `npm run db:prod` print the target and refuse when the link
disagrees with the environment named on the command line.

### 2. `.env.local` pointed at PRODUCTION

So every `npm run test:fixtures` and `npm run eval:accuracy` was exercising the
real pipeline against real users' database — signing in, reading, and writing
intake rows. The audit-log sink fixed a week ago covered one table; it did not
cover the connection.

`scripts/db/assertNotProduction.ts` now refuses to run either against the
production ref:

```
Error: eval:accuracy refuses to run against PRODUCTION (fddlpnibovkkkgboabqb).
NEXT_PUBLIC_SUPABASE_URL points at the live database — the one named
"courtsimplified-dev", which is production despite the name.
```

The guard reads `.env.local` itself rather than trusting that something loaded it
first. The first version read only `process.env`, which left a load-order hole:
`npm run test:fixtures` without `--env-file` saw no URL, reported "no Supabase URL
configured" and passed — and anything loading the env later would then have had
production. A guard whose answer depends on which import ran first is not a guard.

The escape hatch requires a written reason, the same shape as
`db:migrate --skip-staging`:

```
ALLOW_PROD_DB="one line saying why" npm run test:fixtures
```

**`.env.local` has NOT been repointed at staging.** That needs staging's anon and
service-role keys, which means handling secrets, and it needs staging to have the
current schema — which is the blocked step. Until then the guard is what stands
between a test run and production.

---

## Step 1 — the truth, established

| | Ref | Display name | Region | Status |
|---|---|---|---|---|
| **PRODUCTION** | `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | `ca-central-1` | ACTIVE_HEALTHY |
| **STAGING** | `ffymjxjcnwakgdmldpne` | `courtsimplified` | `us-west-2` | ACTIVE_HEALTHY |

Production identified from the deployment, not the name:

```
vercel env pull <temp file outside the repo> --environment=production
grep -oE 'https://[a-z]{20}\.supabase\.co' <that file>
  ->  https://fddlpnibovkkkgboabqb.supabase.co
```

Written to `docs/infra/projects.md`, which is now the source of truth.

### Two facts the documents had wrong

**The spare project is not paused.** `CLAUDE.md` §6,
`docs/security/DATA_FLOW_INVENTORY.md` §2.1 and `supabase/environments.json` all
recorded `ffymjxjcnwakgdmldpne` as INACTIVE / "dormant and paused". It is
`ACTIVE_HEALTHY` and appears to have been restored at some point without the docs
following. **Nothing needed restoring.** All three corrected.

**Vercel has no Supabase variables outside production.**

| Variable | Environments |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production only |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only |
| `OPENAI_API_KEY` | Production, Preview |

Preview deployments therefore have no database configuration at all, rather than
pointing at the wrong one. Safe today; a gap to fill once staging has the schema.

---

## Step 2 — BLOCKED, and exactly why

Staging is linked. The schema push refuses:

```
npx supabase db push --dry-run

  Remote migration versions not found in local migrations directory.
  ... try repairing the migration history table:
  supabase migration repair --status reverted 20260707023159 ... (25 versions)
```

`--include-all` makes no difference; I tried it.

### The state nobody wrote down

The two projects have **different migration histories**, and the asymmetry is the
opposite way round from what everyone assumed.

| | Created | Repo migrations applied | Applied but NOT in the repo | Pending |
|---|---|---|---|---|
| **Production** | 2026-08-26 | 3 | **0** | 4 |
| **Staging** | 2026-04-13 | 1 | **25** | 6 |

**Staging is the ORIGINAL project.** It carries 25 migrations from 7 July to 23
August 2026 that predate this repository's migrations folder. **Production is the
newer, clean one**, created in August, whose history matches the repo exactly.

So `supabase db push` works against production and refuses against staging — the
inverse of the safe order this whole task is built on.

Staging does have a schema: 24 tables, **every one empty**, including `cases`,
`case_intakes`, `case_evidence`, `case_documents`. Missing, consistent with its
pending list: `case_events`, `case_event_candidate_dismissals`, `ai_call_log`.

```
npx supabase inspect db table-stats      # 24 tables, estimated_row_count 0 on all
```

### Why I stopped instead of proceeding

The CLI offers two ways forward and I am not willing to choose either unasked.

**`supabase migration repair --status reverted <25 versions>`** writes to
staging's `supabase_migrations.schema_migrations` to record 25 migrations as
reverted. They were not reverted; they were applied, and the schema they produced
is still there. It touches no application data, and it is what the CLI itself
suggests — but it puts a false statement into the table whose entire job is to
record what happened. In a codebase that has spent this much effort on not
asserting things it cannot verify, that is your call and not mine.

**`supabase db pull`** would import staging's legacy schema into the repo as a new
migration — 25 migrations' worth of history the repo has deliberately never had,
which would then also be "pending" against production.

**What I would recommend, if you want a recommendation:** the repair. The repo is
the source of truth going forward, the 25 legacy versions describe a schema that
predates it, and the alternative pollutes the migrations folder permanently. But
it is a write to a history table on the basis of a judgement, so it is yours.

The exact command, if you agree — run it with the CLI linked to
`ffymjxjcnwakgdmldpne` and nothing else:

```
npx supabase link --project-ref ffymjxjcnwakgdmldpne
npm run db:staging                      # confirm it says STAGING before continuing
npx supabase migration repair --status reverted \
  20260707023159 20260808000000 20260809000000 20260809000001 20260809000002 \
  20260809000003 20260810000000 20260810000001 20260810000002 20260810000003 \
  20260810000004 20260810000005 20260810000006 20260810000007 20260810000008 \
  20260810000009 20260810000010 20260810000011 20260810000012 20260810000013 \
  20260810000014 20260822235241 20260823014722 20260823015237 20260823020000
npx supabase db push --dry-run          # read what it now proposes
npx supabase db push
```

---

## Step 3 — not attempted, and one thing to decide before it is

No backup was taken and no migration was applied to production, because Step 2 has
not passed. That ordering is the point of the task.

**When it is time, one of the four pending migrations needs your go-ahead.** The
guardrail says stop on DROP/TRUNCATE/DELETE, and I scanned all eight:

| Migration | Finding | My reading |
|---|---|---|
| `20260915090000_revoke_anon_write…` | **10 × `DROP POLICY IF EXISTS "dev_full_access_*"`** | Drops permissive RLS **policies**, not tables or data. This IS the security fix. Safe — but it is a DROP, so it stops here for you |
| `20260922120000_add_ai_call_log` | `DELETE FROM ai_call_log` | Inside a `CREATE FUNCTION` body — the retention function. **Does not execute at migration time** |
| The other six | `REVOKE … DELETE`, `FOR DELETE` policies, comments | Permission grants and policy definitions. Not data operations |

Pending on production: `20260915090000`, `20260915120000`, `20260922120000`,
`20260926030000`, plus the new `20260926120000` below.

---

## Step 4 — what could be done from here, and what could not

### Done

**OpenAI.** The key in use authenticates (HTTP 200) and belongs to:

```
organization:  user-zqoler46rb4loij8kspdgxjk
project:       proj_JoBynQOalHeEDA8y8EGE7blx
```

Read from the `openai-organization` / `openai-project` response headers. The key
is project-scoped (`sk-proj-`). **Note the organisation prefix is `user-`, which
is a personal-account organisation rather than a named business one.** Whether
Zero Data Retention was granted to it cannot be read from the API — see the human
steps.

**Storage.** A migration now asserts the bucket is private:
`20260926120000_case_evidence_bucket_private.sql`. It is idempotent and additive —
creates `case-evidence` if missing, sets `public = false` if it exists, no DROP or
DELETE.

It is needed because **the bucket is in no migration at all.** `20260823020500`
creates four RLS policies on `storage.objects` scoped to `case-evidence`, and
nothing anywhere touches `storage.buckets`. So the bucket was made by hand and
whether it is public is dashboard state no migration asserts and no check reads —
for a bucket holding uploaded evidence. A public bucket serves objects over
unauthenticated URLs, and object-level RLS does not help.

### Not done, because there is no credential on this machine for it

Auth settings, project rename, and point-in-time recovery all need the **Supabase
Management API**. The CLI on this machine stores its access token in the **Windows
Credential Manager**, not in `~/.supabase/access-token`, and exposes no rename or
settings command:

```
supabase projects --help   ->  list | create | api-keys | delete
ls ~/.supabase/            ->  telemetry.json, traces/   (no access-token)
```

Getting a bearer token would have meant extracting a secret, which the guardrails
forbid. **This is not the API refusing — it is that I have no way to authenticate
to it without handling a credential.** If you set `SUPABASE_ACCESS_TOKEN` in the
environment I can do all of these in one pass.

---

## Yours to do

### A. Rename the two projects (2 minutes, cosmetic but worth it)

1. dashboard → project `fddlpnibovkkkgboabqb` → **Settings → General → Project
   name** → `courtsimplified-prod`.
   *Before clicking:* the URL contains `fddlpnibovkkkgboabqb` and the region reads
   `ca-central-1`. If it says `us-west-2` you are in the wrong project.
2. dashboard → project `ffymjxjcnwakgdmldpne` → same path → `courtsimplified-staging`.
   *Before clicking:* region reads `us-west-2`.
3. In `supabase/environments.json`, move each `intendedName` into `currentName`
   and set `"renameComplete": true`.

Renaming changes no ref, no URL and no key. Nothing needs redeploying.

### B. Auth settings — Authentication → Providers / Policies

- **Minimum password length 12.** Authentication → Policies → Password → minimum
  length. Currently unverified from here.
- **Email confirmation required.** Authentication → Providers → Email → *Confirm
  email* ON.
- **MFA (TOTP).** Authentication → Providers → enable TOTP for users.

Do these on **staging first**, then production, and note that changing minimum
password length does not invalidate existing passwords.

### C. Point-in-time recovery — Settings → Database → Backups

Check whether PITR is offered on the current plan. It requires Pro or above. If it
is not available, record the plan requirement rather than leaving the line blank —
daily backups are not the same guarantee.

### D. Vercel

- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` for **Preview** and **Development**, pointing at
  **staging** (`ffymjxjcnwakgdmldpne`). They do not exist today.
  `vercel env add <NAME> preview`
- **Deployment protection on previews:** Vercel dashboard → project → Settings →
  Deployment Protection → Vercel Authentication ON for Preview.

### E. Two-factor authentication on the accounts (needs a phone)

Supabase, Vercel, OpenAI, GitHub, Namecheap, Resend. Each is
Account → Security → Two-factor / Authenticator app. This is the single highest-value
item on the list and none of it can be done from here.

### F. DNS at Namecheap — SPF, DKIM, DMARC

No Namecheap API key is configured in the environment, so this was not attempted.
Resend's dashboard generates the exact records; add them at Namecheap →
Domain List → Manage → Advanced DNS, then verify:

```
nslookup -type=TXT <domain>
nslookup -type=TXT _dmarc.<domain>
```

### G. Confirm Zero Data Retention with OpenAI

ZDR is granted per organisation. The org in use is
`user-zqoler46rb4loij8kspdgxjk`, which is a **personal-account** organisation.
platform.openai.com → Settings → Organization → check whether ZDR is active on
*that* org. If the ZDR request was made for a different organisation, the key in
production is not covered by it — worth checking before launch rather than after.

---

## What changed in the repository

| File | Change |
|---|---|
| `docs/infra/projects.md` | **New.** The source of truth for which project is which |
| `docs/infra/setup-report.md` | This file |
| `scripts/db/assertNotProduction.ts` | **New.** Refuses evals/fixtures against the production ref |
| `scripts/db/target.ts` | **New.** `db:staging` / `db:prod`, print the target, refuse on a mismatched link |
| `supabase/migrations/20260926120000_…` | **New.** Asserts the evidence bucket is private |
| `supabase/environments.json` | staging status corrected to ACTIVE_HEALTHY; notes rewritten with verified facts |
| `CLAUDE.md` §6 | "dormant and paused" corrected; points at `docs/infra/projects.md` |
| `docs/security/DATA_FLOW_INVENTORY.md` | the same two corrections |
| `scripts/eval/runAccuracyEval.ts`, `scripts/verification/runFixtures.ts` | call the guard before anything else |

Nothing was applied to any database. No backup was needed because no change was
made.
