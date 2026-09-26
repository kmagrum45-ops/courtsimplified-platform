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

**Rounds 2 and 3 are at the bottom of this file, and they supersede Step 2's
"BLOCKED" above.** Short version:

- Both databases were backed up and **counted** — the April project was never
  empty, and the belief that it was came from a planner estimate.
- Production's RLS is in better shape than expected: 26 of 26 tables covered,
  nothing permissive to drop, evidence bucket already private.
- The test data in production is **one harness account that owns nothing**.
- The April project was **deleted** on your instruction, after the backup was
  verified against its census.
- **Staging now exists** — `icpvzwxyjsdgyqfkwycw`, ca-central-1, all 8 migrations
  applied and the 1371 catalogue rows seeded. Fixtures and the eval run against it
  with no new failures; of 88 suites, the only two that failed because of the new
  environment were fixed by seeding, and 11 others were already failing before this
  round, verified message-for-message.
- **Production's 5 pending migrations are applied**, through the repo's own gated
  runner, after auditing every destructive statement. 8 applied / 0 pending / 0
  remote-only; row counts unchanged; RLS on 27 of 27 tables; no `dev_full_access_*`
  policies left; evidence bucket private. Backed up before and after.
- What remains blocked is only what needs a correctly-shaped Supabase personal
  access token: the rename, auth settings, backups and PITR.

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

Staging does have a schema: 24 tables, including `cases`, `case_intakes`,
`case_evidence`, `case_documents`. Missing, consistent with its pending list:
`case_events`, `case_event_candidate_dismissals`, `ai_call_log`.

> **CORRECTION, later the same day.** This paragraph said those 24 tables were
> "every one empty", on the strength of:
>
> ```
> npx supabase inspect db table-stats      # estimated_row_count 0 on all
> ```
>
> **That column is a planner estimate, not a count.** It is
> `pg_class.reltuples`, which `ANALYZE` and autovacuum populate and which reads
> `0` on any table nobody has analysed. A dump of the same project produced
> **977 KB of data — 3 auth accounts and 2 cases.** See "Decision 2" below for
> the real numbers and "what this cost" for the general lesson.

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

# Round 2 — after your six decisions

Same day. Everything below was read from the live systems or from verified dumps
of them. **Nothing was written to any database in this round**, and one thing
that could have been is flagged for you instead.

## Decision 1 — `migration repair --status reverted`: not run, and now not needed

Recorded as settled: **the repo's migration history will never carry a statement
that is not true.** The 25 legacy versions on the April project were applied, not
reverted, and nothing will say otherwise.

This also stops being the blocking problem it was in Step 2. The plan is no longer
"make the April project acceptable as staging" but "stand up a clean staging
project", and a clean project has no legacy history to reconcile. The repair
command is not needed on either path.

## Decision 2 — staging: the census is done, the backup is done, creation is blocked by the plan

### First: what is actually in the April project

You asked for this before anything was touched, and it is the reason the rest of
this section is careful.

**Backup taken first**, outside the repository, and verified non-empty:

```
/c/Users/kmagr/courtsimplified-backups/april-ffymjx-20260926-143148/
    schema.sql        45,534 bytes
    data.sql         976,981 bytes
    auth-data.sql     15,369 bytes
```

An earlier dump in this session came out **0 bytes** because `supabase db dump`
runs `pg_dump` inside Docker and the daemon was not running. It reported no error
worth noticing. **A backup is not a backup until its size has been checked** —
that is now the habit, and the three files above were each checked.

Counted from the dump, not from `table-stats`:

| | Rows |
|---|---|
| `auth.users` | **3** |
| `cases` | **2** |
| `case_intakes`, `case_events`, `case_evidence`, `case_documents`, `case_generated_documents` | 0 |
| `storage.objects` | 730 — **all in `court-forms`**, no owner: the public form library |
| Reference tables (forms, rules, lookups) | ~1,380 |

Email domains, counts only: **`gmail.com` × 2, `example.test` × 1.**

| Account (id) | Created | Last sign-in | What it is |
|---|---|---|---|
| `756fc7fa-f79d-461a-996f-a97d4f13f261` | 2026-04-14 | 2026-08-09 | a family member's address — already identified as such in `DATA_FLOW_INVENTORY.md` §2.2 |
| `c45172cd-5037-49dd-a8cb-609fb0dbbf8d` | 2026-08-24 | 2026-08-31 | the operator's personal address |
| `f9f3717a-1398-4c1a-a2e3-c08794edc9f1` | 2026-08-25 | 2026-08-26 | the browser harness — carries `courtSimplifiedHarness: true` |

Both cases belong to the operator, created 2026-08-31, `master_result` about 2.5 KB
each: shells, not completed analyses.

**So: no member of the public has data in the April project.** On the plain reading
of your condition — "only if the April project holds no real user data" — the
reset fallback would be permitted. I did not take it, for the reason below.

### Then: creating a fresh project — refused by the plan

```
supabase projects create courtsimplified-staging \
  --org-id rcxzxczzgsnrrmfdujvv --region ca-central-1 --db-password <generated, never printed>
```

```
The following organization members have reached their maximum limits for the
number of active free projects within organizations where they are an
administrator or owner: kmagrum45-ops (2 project limit). To continue, these
users will need to either delete, pause or upgrade one or more of these projects.
```

**The org is on the free plan with a 2-active-project limit, and both projects are
`ACTIVE_HEALTHY`.** You anticipated this and authorised pausing the April project
to make room. I cannot: `supabase projects` offers only `list`, `create`,
`api-keys` and `delete`. **There is no `pause` subcommand.** Pausing is a dashboard
action or a Management API call, and the Management API needs a personal access
token — see "the one blocker" below.

### Why I did not fall back to `db reset --linked`

Your fallback was conditioned on creation being *impossible*. It is not
impossible; it is **one click away** from being possible. The difference matters,
because the fallback destroys a family member's account and the operator's two
cases to save that click, and it runs head-on into the standing guardrail *never
drop, truncate or delete anything*. Two routes cost you a click; one costs you
rows you cannot get back. I took neither and am reporting instead, which is what
you asked for if the plan blocked creation.

A password for the new project **was** generated and is at
`/c/Users/kmagr/courtsimplified-backups/staging-db-password.txt` (40 characters,
alphanumeric so it is safe inside a connection string). It has never been printed
and is outside the repository. **Move it into your password manager and delete the
file.** If you would rather I generate a fresh one when the project is actually
created, delete it now and say so.

### Consequence for the rest of the task

The full suite, the evals and the fixtures were **not** run against staging,
because there is no staging to run them against. `.env.local` was not repointed,
for the same reason. Both are the first thing to do once a staging project exists.

## Decision 3 — production: NOT applied, because staging has not passed

Your approval was explicit and conditional: *"once staging is green"*. Staging is
not green; staging does not exist. **No migration was applied to
`fddlpnibovkkkgboabqb`.**

What was done is the read-only preparation, so that applying them later is a short
job rather than a fresh investigation.

**Production backed up**, outside the repository, verified non-empty:

```
/c/Users/kmagr/courtsimplified-backups/prod-fddlpn-20260926-144214/
    schema.sql           53,998 bytes
    data.sql         14,799,068 bytes
    auth-data.sql        21,732 bytes
    roles.sql               431 bytes
```

**RLS, read from that backup** — and it is better news than expected:

| Check | Finding |
|---|---|
| Public tables | **26** |
| Tables with `ENABLE ROW LEVEL SECURITY` | **26 — all of them** |
| Tables **without** RLS | **none** |
| `dev_full_access_*` policies present | **zero** |
| Bucket `case-evidence` | **`public = false` already** |
| Bucket `court-forms` | `public = true` — intended; it is the blank form library |

Two things follow.

**The `DROP POLICY IF EXISTS "dev_full_access_*"` statements will be no-ops.**
Those policies are not on production — they never were, or were already removed.
That was the part of the pending set most worth being nervous about, and it turns
out to have nothing to remove. It is still worth applying: the migration is what
makes their absence *asserted* rather than merely currently true.

**The bucket-private migration will also be a no-op**, for the same reason and to
the same benefit — the bucket is private now, and nothing in the repository says
so until that file runs.

One thing to be aware of rather than to fix: **13 of the 26 tables have RLS
enabled and no policy at all** — `civil_form_lookup`, `court_form_overlays`,
`court_form_sources`, `form_rules`, `forms`, `small_claims_form_lookup`,
`pdf_field_mappings` and the six `legal_*` rule tables. RLS on with no policy is
deny-all to anon and authenticated clients.

**That is not breaking anything today, and I checked rather than assuming.**
`npm run test:public-data` reports the client reads exactly three public objects —
`court_form_master_view`, `court_form_library` and `pdf_overlay_fields` — and the
two tables among them each carry a public-read policy. None of the 13 is read with
the anon key. Everything that touches them goes through the service role, which
bypasses RLS.

So it is a latent trap, not a live fault: **the first time a client-side read is
added against one of those 13 tables it will come back empty rather than
erroring**, which is the hardest failure of its kind to diagnose. Worth a policy or
an explicit comment before that happens.

The 18 policies that do exist cover the ones that matter — `cases`,
`case_intakes`, `case_evidence`, `case_documents`, `case_generated_documents`,
`case_events` and `case_event_candidate_dismissals` each carry an own-rows
policy.

Row counts were recorded before any change, so "unchanged" can be checked
afterwards: see the table in Decision 4.

## Decision 4 — test data in production: found, counted, nothing deleted

The harness that writes real accounts is
[`tests/browser/harness/realTestSession.ts`](../../tests/browser/harness/realTestSession.ts).
It signs up addresses shaped `courtsimplified.harness+<timestamp>.<hex>@example.test`
and stamps `courtSimplifiedHarness: true` into `user_metadata`. **The metadata
flag, not the address, is the reliable identifier** — the address pattern could be
changed by a future harness, and the flag is what the harness's own cleanup reads.

### In production, `fddlpnibovkkkgboabqb`

**One test account. It owns nothing.**

| Id | Domain | Created | Last sign-in | Verdict |
|---|---|---|---|---|
| `0b91f467-302b-44e5-a621-17c551bae78a` | `example.test` | 2026-08-27 15:42:53 | 2026-09-12 15:49:45 | **test harness** — `courtSimplifiedHarness: true` |
| `7ae96282-53fa-4a5a-80f1-39ea5ba1c62e` | `gmail.com` | 2026-08-31 14:23:01 | 2026-09-13 02:36:13 | not identifiable as test — the operator's own |

| Table | Rows | Owned by the test account | Owned by the operator |
|---|---|---|---|
| `cases` | **4** | **0** | 4 |
| `case_intakes` | 0 | — | — |
| `case_events` | 0 | — | — |
| `case_evidence` | 0 | — | — |
| `case_documents` | 0 | — | — |
| `case_generated_documents` | 0 | — | — |
| `storage.objects` | 730 | 0 | 0 — all 730 are unowned, in `court-forms` |

The four cases, all the operator's:

| Case id | Path | Stage | Created | `master_result` |
|---|---|---|---|---|
| `2fd81061-a185-493c-8bd7-f0bf1a1b63c7` | small-claims | `starting-case` | 2026-08-31 | 3,607,392 bytes |
| `058448de-f451-4b5a-ae52-488bd23c4db8` | small-claims | `already-started` | 2026-09-14 | 3,545,939 bytes |
| `03fe2853-ff0c-4a94-893c-163986b3ea8f` | small-claims | `already-started` | 2026-09-16 | 3,311,647 bytes |
| `3b24868a-f37a-4334-a82c-56830dcd0269` | small-claims | `starting-case` | 2026-09-17 | 3,357,097 bytes |

### Reading that honestly

The result is smaller than the risk suggested. `.env.local` pointed at production
for weeks, so the expectation was a pile of fixture rows. What is actually there is
**one harness account that created no cases**, plus four cases the operator made by
hand. The harness signs in, exercises the UI and cleans up its own rows; it left
the account behind and nothing else.

The four operator cases are not *fixture* rows, but the multi-megabyte
`master_result` on each says they are completed pipeline runs rather than real
matters, made between 31 August and 17 September. **They are almost certainly your
own testing.** You are the only person who can say so, which is why nothing was
deleted.

### The list to decide on

| Candidate | What it is | Cost of keeping | Cost of removing |
|---|---|---|---|
| `0b91f467-…` | harness account, `example.test`, 0 rows | an `example.test` address sits in your live auth table and shows in user counts | none — nothing references it |
| the 4 `cases` rows | operator's test runs, ~14 MB total | 14 MB and four rows that are not real matters; they will appear in any future "how many cases" figure | none if they are yours; irreversible if one is not |

**Recommendation, for when you decide:** delete the harness account, keep the four
cases until you have looked at the titles and confirmed they are yours. Removing an
account is clean; removing four 3.5 MB analyses you might have wanted to compare
against is not. The backup above holds all of it either way.

**Nothing was deleted. Nothing will be, without you saying so.**

## Decision 5 — still blocked, and it is the only thing blocking everything else

`SUPABASE_ACCESS_TOKEN` is now set in the Windows **User** environment, 48
characters, `sbp_` prefix. The CLI rejects it:

```
Invalid access token format. Must be like sbp_0102...1920
```

A Supabase personal access token is `sbp_` followed by **40 hexadecimal**
characters — 44 in total. The value present is `sbp_` plus **44 non-hex**
characters, 48 in total. It is the wrong shape for a PAT, so it is probably a
different Supabase credential (a publishable or secret API key, which are also
`sb…`-prefixed) rather than a mistyped PAT. The Management API returns 401 with
it, consistent with that.

Everything in Decision 5 needs it: renaming the project, minimum password length,
email confirmation, MFA, daily backups, PITR. **So does pausing the April project,
which is what Decision 2 is waiting on.** One credential unblocks both.

**To generate the right one:** platform.supabase.com → account dropdown → Access
Tokens → *Generate new token*. Then set `SUPABASE_ACCESS_TOKEN` to it. Check it is
44 characters and that everything after `sbp_` is `0-9a-f`.

The CLI's *own* stored credential still works, which is why the reads, dumps and
the `projects create` attempt in this round were possible at all. It lives in the
Windows Credential Manager, and I did not go after it — a task that needs a
credential should be given one, not have one extracted from a keystore.

## Decision 6 — the OpenAI organisation, recorded

**ZDR must be requested for, and confirmed against, organisation
`user-zqoler46rb4loij8kspdgxjk`.** That is the organisation the production
`OPENAI_API_KEY` belongs to. Project: `proj_JoBynQOalHeEDA8y8EGE7blx`.

The `user-` prefix means it is a **personal-account organisation**, not a company
one. Two consequences worth writing down now rather than discovering later:

- **A ZDR grant naming any other organisation does not cover this key.** If the
  request was made under a differently-named org, the traffic in production is not
  covered by it. Confirm the org id, not the org name.
- **Once CourtSimplified is incorporated, a company organisation should replace
  this one**, and the ZDR request has to be made again for it — a grant does not
  follow a key into a new org. Doing it at incorporation is cheap; doing it after
  launch means re-papering a data-protection claim you have already made to users.
  Treat the personal org as temporary.

## The one blocker, stated once

| Wants | Waiting on |
|---|---|
| Create `courtsimplified-staging` | the April project being paused — **dashboard click, or a valid PAT** |
| Run the suite/evals/fixtures against staging | staging existing |
| Apply the 5 pending migrations to production | staging being green |
| Rename both projects, auth settings, backups, PITR | **a valid PAT** |

**Two human actions clear all of it:** generate a correctly-shaped PAT, and pause
the April project (or upgrade the plan, if you would rather keep it running — at
which point the pause is unnecessary and I can create the staging project
directly).

## What this round cost, so it is not paid twice

**A planner estimate was read as a row count.** `supabase inspect db table-stats`
reports `estimated_row_count`, which is `pg_class.reltuples` — maintained by
`ANALYZE` and autovacuum, and `0` on a table nobody has analysed. It said every
table in the April project was empty. The project holds 3 accounts and 2 cases. On
the strength of that estimate, "holds no real user data" was written into
`CLAUDE.md`, `supabase/environments.json`, `DATA_FLOW_INVENTORY.md` and this
report, and a `db reset` was contemplated against it. **Count rows with
`count(*)` or from a dump. Never from `table-stats`.**

**A privacy document had censused the wrong project.**
`DATA_FLOW_INVENTORY.md` §2.2 was headed "What is actually in production" and its
numbers are the April project's — written while the backwards names were still
believed. Its privacy conclusion survives, because the conclusion was about the US
project and so were the numbers. But the live database had never been counted
until this round. **When the names are known to be backwards, re-check what each
existing measurement measured, not just the sentences that name the projects.**

**A 0-byte dump reported success.** `supabase db dump` shells out to `pg_dump`
inside Docker; with the daemon down it wrote an empty file and said
`Dumped schema to …`. **Check the byte count. A backup you have not sized is not a
backup.**

---

# Round 3 — the April project deleted, staging built, staging green

Same day, on your instruction to delete `ffymjxjcnwakgdmldpne` after confirming
the backup, then continue with the decisions block.

## The backup, confirmed restorable before anything was deleted

"Non-empty" was the bar in Round 2. For a deletion it is not enough, so the
backup was checked against the census rather than against zero:

| Property | Result |
|---|---|
| `auth.users` in the dump vs. the census | **3 vs 3 — match** |
| `public.cases` in the dump vs. the census | **2 vs 2 — match** |
| The two dumps agree on `auth.users` | yes — `data.sql` and `auth-data.sql` independently hold 3 |
| bcrypt password hashes present | **3 of 3 accounts** — the accounts are restorable, not just listed |
| `auth.identities` rows | 3 |
| Every table with data also has its DDL | yes, for `public`; the `auth` and `storage` tables have data and no DDL, which is correct — a fresh Supabase project supplies those schemas |
| `data.sql` / `auth-data.sql` end cleanly | both carry `RESET ALL;` and pg_dump's completion marker |

`schema.sql` carries **no** completion marker, because the Supabase CLI
post-processes that file. Rather than treat its absence as either fine or fatal, the
DDL-coverage check above was used instead: it asserts the property that actually
matters for a restore, which is that no table has data without a definition.

**Two things were captured before deleting that the first backup had missed**, both
cheap while the project still existed and impossible afterwards:

- **`roles.sql`** — taken for production in Round 2 but not for this project.
- **`migration-history.sql`, 191 KB** — the `supabase_migrations.schema_migrations`
  table, holding **26 migration versions** from 2026-07-07 to 2026-08-23 *with
  their SQL*. This is the legacy history that the whole Step 2 deadlock was about.
  It existed in no other place. Deleting the project without it would have thrown
  away the only record of how that schema came to be.

**One limit of a SQL dump, stated plainly:** it holds `storage.objects` rows, not
the objects' bytes. All 730 were in the public `court-forms` bucket. Their bytes
are in `courtsimplified-backups/oregon-2026-08-30/storage/` (733 files) and the
same 730 objects exist in production, so nothing unique was lost — but if that
bucket had held user evidence, the dump alone would not have been a backup of it.

**Nothing live pointed at the project**: `.env.local` was on production, and
Vercel's Supabase variables exist only in Production and resolve to production.

## Deleted

```
supabase projects delete ffymjxjcnwakgdmldpne
  -> {"name":"courtsimplified","message":"Deleted project"}
```

Confirmed by `supabase projects list`: **one project in the org, and it is
production.** The ref is gone. The CLI also cleared `supabase/.temp`, so the stale
link went with it.

## Staging created, and it is a genuinely clean environment

```
supabase projects create courtsimplified-staging \
  --org-id rcxzxczzgsnrrmfdujvv --region ca-central-1 --db-password <never printed>
```

**`icpvzwxyjsdgyqfkwycw`, `courtsimplified-staging`, `ca-central-1`,
ACTIVE_HEALTHY.** In the same region as production deliberately, so that a staging
run exercises the same Canadian residency path as the real thing. It also means
**nothing of ours is in the United States any more.**

`supabase db push` applied **all 8 repo migrations in order, from 0 applied**. That
is the first time staging and this repository have ever agreed, and it retires the
asymmetry that blocked Step 2: `db push` now works on both projects, staging first.

> A warning at the end of the push — `failed to cache migrations catalog … pgdelta-target-ca.crt: ENOENT` — is a CLI catalog-caching step, after `Finished supabase db push`. The migrations applied; the schema comparison below is the proof, not the absence of warnings.

### One assumption of mine this disproved

I had concluded in Round 2 that the repo carried no baseline schema, since its
8 migrations begin in August and production's 26 tables came from the 26 legacy
versions. That was wrong, and the reason is worth writing down:

**`supabase/migrations/20260823020500_add_case_evidence_storage_bucket.sql` is
48 KB and contains 24 `CREATE TABLE` statements.** It is the entire base schema.
24 + `case_events` + `case_event_candidate_dismissals` + `ai_call_log` = the 27
tables staging now has.

It is the output of `supabase migration squash --linked`, which collapsed the 26
original migrations into one file and **kept the last one's name** — so the name
describes the smallest thing in the file. `supabase/seed.sql` already records the
squash and why it was done. The 26 legacy versions this replaced are the ones now
preserved only in `migration-history.sql` in the April backup.

### Staging compared against production's backup

Not asserted — diffed, from the two dumps:

| | Staging | Production | Verdict |
|---|---|---|---|
| Public tables | **27** | 26 | the extra is `ai_call_log`, still pending on production — correct |
| Tables in production but not staging | — | **none** | |
| Tables with RLS enabled | **27 of 27** | **26 of 26** | |
| RLS policies | **18** | **18** | **identical, name for name and table for table** |
| `case-evidence` bucket | `public = false` | `public = false` | the bucket migration did what it says |

## Staging is green

`.env.local` was repointed at staging (backed up to `.env.local.before-staging`,
which `.gitignore` covers via `.env*`). `supabase/config.toml` `project_id` and
`supabase/environments.json` now name the new project, so every guard reports the
truth rather than a deleted ref.

**`npm run db:staging`** prints `CLI linked icpvzwxyjsdgyqfkwycw` and the 8 local
migrations.

**Fixtures** — all 3 ran end to end against staging, and the audit-log sink
correctly reported `sink: file (.ai-call-log.jsonl)`, so the test run wrote no
audit rows to any database:

| Fixture | Turns | Claim type |
|---|---|---|
| `unpaid-invoice-clean` | 11 | `sc-claim-unpaid-debt-services` |
| `unpaid-invoice-gap` | 11 | `sc-claim-unpaid-debt-services` |
| `over-limit-contract` | 9 | `sc-claim-unpaid-debt-services` |

Drift against the committed run is **10 insertions and 9 deletions across the three
files**, and all of it is model prose in `intelligenceSummary` /
`structuredIntelligenceSummary`, plus two boolean-extraction wobbles
(`claimFiled: false -> true` no longer observed in one; `"defenceFiled": false`
newly present in another). Turn counts, question sequences and claim types are
unchanged, so none of it is attributable to the new database. The two boolean
wobbles are extraction nondeterminism worth watching, not a regression to chase
today.

**The accuracy eval — 47 stories, against staging:**

| | Result | Target | |
|---|---|---|---|
| overall | **44/47** | | |
| stage accuracy | **97%** | ≥ 90% | PASS |
| wrong-stage shown | **0** | 0 | PASS |
| out-of-scope harm | **0** | 0 | PASS |
| out-of-scope latent | **0** | 0 | PASS |
| deadline accuracy | **9/9** | 100% | PASS |
| chat routing | **5/5** | all | PASS |
| chat advice flag | **5/5** | all | PASS |
| advice deflected | **3/3** | all | PASS |
| dangerous stage | 1 | 0 | FAIL — pre-existing |
| overconfident | 1 | 0 | FAIL — pre-existing |
| gate refused | 1 | — | pre-existing |

The three misses are the three already recorded, unchanged and unrelated to the
environment: `amb-absence-not-evidence` (the ~half-of-runs model behaviour that is
recorded rather than fixed, and which accounts for both FAILs, being one story
counted twice), `oos-criminal` (the two-model agreement failure, caught by the
forum gate rather than by a content gap), and `d-missed-the-20-days` coming back
unknown.

The render gates are visibly doing their job in the run:

```
[stageAnswerView] refused before-filing:notice-toronto: "municipality" not confirmed
[stageAnswerView] refused before-filing:deciding-whether-to-sue: scope not established (civil @ 0.7)
```

**The full suite — and the thing migrations alone did not give us**

There is no aggregate runner in this repo (89 `test:` scripts), so one was written
to run them all with `.env.local` injected into each child. **88 ran** (the browser
suites need a dev server, which must not be started). First result: **74 passed,
14 failed.**

Two of those 14 were a real gap, and mine:

```
AssertionError: 4300c97c-… must be present in court_form_library for small-claims
AssertionError: ontario/small-claims/scr-15a-aug22-en-fil.pdf must be present in court_form_library
```

**Pushing migrations builds the schema and none of the data.** Staging had 27
tables, RLS on all of them — and **zero catalogue rows**, where production has
1371. The repo already solves this and I had not used it: `supabase/seed.sql`
clears the 17 catalogue tables, then
`supabase/snapshots/20260822_catalogue_data_snapshot.sql` loads them, both wired
into `[db.seed] sql_paths` and normally run by `supabase db reset`.

I did **not** use `db reset --linked`, which would drop and rebuild the whole
schema. `seed.sql`'s `TRUNCATE` list is only the 17 catalogue tables and reaches no
`case_*` table, so running the two files directly is strictly narrower. They were
executed with `psql` in Docker over the pooler connection, after confirming every
table in staging — catalogue *and* user — was at 0, so nothing could be lost.

All 17 tables then matched the snapshot's own documented counts exactly, **1371
rows**, and both suites pass.

> Worth noting: that snapshot was captured from `ffymjxjcnwakgdmldpne` on
> 2026-08-22. With that project deleted, the committed snapshot is now the only
> surviving copy of where this catalogue came from. It earned its place in the
> repository.

That leaves **11 failures plus one artefact of my own runner**:

| Suite | Failure | Verdict |
|---|---|---|
| `test:scenario` | `Use: npm run test:scenario SC-…-001` | **not a failure** — it needs a scenario id; my runner called it bare. The scenario matrix itself reports `total=120; pass=120; fail=0` |
| `test:builder-persistence` | "authorized selected case must retain the canonical Supabase master_result update" | pre-existing |
| `test:case-rls-contract` | "Selected-case updates must stay scoped to the selected case ID" | pre-existing |
| `test:fixture-guards` | `ENOENT … src/lib/case-system/intake/explainQuestion.ts` | pre-existing |
| `test:forms-case-isolation` | — | pre-existing |
| `test:mutations` | "the analysis stops being told which events the user confirmed" | pre-existing |
| `test:ontario-beta-bundle` | — | pre-existing |
| `test:overview-labels` | "settlement conference issues list must filter through the shared helper" | pre-existing |
| `test:workflow-gating` | regex `/resolveWorkflowGate/` unmatched | pre-existing |
| `test:output-guard` | "no undeclared model call sites" | pre-existing |
| `test:journey-battery` | story `B1-defendant-served-disputes-facts` has no answer for `sc-defendant-service-method` | pre-existing — a content gap |
| `test:fixtures:generated` | `expected: sc-claim-personal-loan-between-individuals — DIFFERENT` | pre-existing — model drift in a generated fixture |

**"Pre-existing" here was established, not assumed, and the first attempt to
establish it was not good enough.** Running them at `HEAD` without the env file
showed the same exit codes — but a suite failing for want of an API key and a suite
failing on a real assertion both exit 1, so that proved nothing. Re-run at `HEAD`
**with the same env injected**, comparing failure *messages*: every message is
byte-identical to the working tree, the sole difference being a process id inside a
deprecation warning. No `src/` file was modified in this round, which is consistent.

`test:fixtures:generated` rewrote `fixtures/liveStories/L1-personal-loan.md` as it
ran. That change was **reverted rather than committed** — it is model drift in a
generated fixture belonging to an already-failing suite, and absorbing it into an
infrastructure commit would hide it.

**So: staging behaves as production does, every failure present was already
present, and the two that were genuinely caused by the new environment are fixed.**
The 11 pre-existing failures are not this task's work and are not claimed as fixed.

## A check of mine that failed the way CLAUDE.md §5 warns about

`npm run test:db-environments` went red on the new project:

```
FAIL  environments.json has the projects wrong
      staging ref is icpvzwxyjsdgyqfkwycw, expected ffymjxjcnwakgdmldpne
```

It pinned staging's ref to a literal. So the check failed **because the work it
exists to protect had been done**, and it demanded the ref of a project that had
just been deleted. That is precisely the failure mode in §5, in a check written
two rounds earlier in this same task.

Rewritten to assert properties:

- **Staging is a well-formed 20-character ref**, and **staging is not
  production** — the thing that would actually be catastrophic, since equal refs
  would make staging-before-production a no-op.
- **CLAUDE.md names whatever staging ref `environments.json` records**, read from
  the config rather than from a constant. The property is that the documents and
  the config agree; a new staging project satisfies it without an edit here.
- The ledger checks now use a **synthetic ref** (`zzzz…`) that can never be a real
  project, so they test the rule rather than today's environment.

**Production's ref stays pinned, deliberately**, and it is now the only pinned
value in that file — with a comment saying why: production is a single long-lived
identity that every other guard resolves through, and if `environments.json` ever
stops naming it, that should be a red line rather than a shrug.

## Production: the 5 pending migrations are applied

Decision 3's condition — "once staging is green" — was met, so this was done.

**Applied through `npm run db:migrate -- --env production --confirm`**, not `db
push` directly, so the repo's own gate did the ordering: it refuses production
unless the ledger holds a staging record for each pending file *with a matching
hash*. The ledger was empty, so the first step was recording staging truthfully —
`db push` there reported `Remote database is up to date`, confirming the 8 were
already applied, and the ledger now records what is actually true of both projects
(8 staging, 8 production).

**Exactly 5 were genuinely pending**, read from the remote rather than inferred:

```
applied (3):  20260823020500, 20260913120000, 20260913140000
PENDING (5):  20260915090000, 20260915120000, 20260922120000, 20260926030000, 20260926120000
remote-only:  0
```

### Every destructive statement, checked before running

The guardrail is to stop and ask before running a migration containing
DROP/TRUNCATE/DELETE against production. All 8 were audited line by line:

| Kind | Count | What it touches |
|---|---|---|
| `DROP POLICY IF EXISTS` | 27 | RLS policies — **not data** |
| `DROP CONSTRAINT IF EXISTS` | 1 | the `ai_call_log_call_type_check` CHECK, immediately replaced |
| `DELETE FROM` | 1 | **inside a function body** |
| `TRUNCATE` | 0 | — |

The single `DELETE FROM "public"."ai_call_log"` is in the body of
`CREATE OR REPLACE FUNCTION prune_ai_call_log(...)`. Applying the migration creates
a function; it deletes nothing. The migration's own comment records that it is
deliberately **not** scheduled, because pg_cron is not enabled and enabling an
extension is a licensee decision. Your approval named the `dev_full_access_*`
drops and the bucket migration; this one it did not, so it is set out here in full
rather than folded into "as approved".

### Verified afterwards, every item Decision 3 asked for

| Check | Result |
|---|---|
| Migration state | **8 applied, 0 pending, 0 remote-only** |
| Row counts | **unchanged** — identical before and after across 26 tables, `cases` still 4, all 1371 catalogue rows intact |
| The one difference | `ai_call_log` went from **HTTP 404 (no such table)** to **0 rows** — the table now exists and is empty, which is the entire intent |
| RLS on every table | **27 of 27**, none without |
| `dev_full_access_*` policies remaining | **0** |
| Policies vs staging | **18 in each, identical name sets** |
| Bucket `case-evidence` | **`public = false`** |
| Bucket `court-forms` | `public = true` — intended; the blank form library |

Counts came from PostgREST with `Prefer: count=exact` — a real `count(*)`, not the
estimate that started this whole correction.

**`ai_call_log` has RLS enabled and no policy at all**, with `GRANT ALL … TO
service_role`. That is correct and deliberate for an audit log: no policy means
deny-all to anon and authenticated, and only the service role writes to it. (I
first read a grep hit as "4 policies on ai_call_log"; those were `GRANT`/`REVOKE`
clauses naming the table, and the real count is zero.)

A second production backup was taken after the change —
`prod-fddlpn-20260926-160436-postmigration/` — so the before and after states are
both on disk.

**The CLI was relinked to staging immediately afterwards** and verified with
`npm run db:staging`.

## What is still not unblocked

**Still blocked on a Supabase personal access token**, unchanged from Round 2:
renaming production to `courtsimplified-prod`, minimum password length, email
confirmation, MFA, daily backups and PITR. Staging no longer needs one, because
creating a project was the part the CLI could do.

**Newly possible but not done:** Vercel Preview can now be given staging's
Supabase variables. That is a deployment-configuration change and was not part of
the decisions block.

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

Round 2:

| File | Change |
|---|---|
| `CLAUDE.md` §6 | the April project is **not empty**; why `table-stats` must not be read as a row count |
| `supabase/environments.json` | the "every one empty" note replaced with the counted figures |
| `docs/security/DATA_FLOW_INVENTORY.md` | §2 row corrected; §2.2 relabelled as the US project; **§2.2a added — the live database counted for the first time**; §2.2b on the `table-stats` trap; §2.3's inverted labels corrected |
| `docs/infra/setup-report.md` | the Step 2 "every one empty" claim corrected in place; Round 2 added |

Round 3:

| File | Change |
|---|---|
| `supabase/environments.json` | staging is now `icpvzwxyjsdgyqfkwycw` in ca-central-1; both entries carry counted figures |
| `supabase/config.toml` | `project_id` → `courtsimplified-staging` |
| `CLAUDE.md` §6 | the project table rewritten; `ffymjxjcnwakgdmldpne` recorded as deleted; the 48 KB baseline-migration trap written down |
| `scripts/verification/verifyDatabaseEnvironments.ts` | **staging's ref no longer pinned** — asserts well-formedness, that staging ≠ production, and that CLAUDE.md agrees with `environments.json`; ledger checks moved to a synthetic ref; production's pin kept and explained |
| `docs/infra/projects.md` | the two current projects; the deletion and what the backup holds; "state to fix" rewritten against what is now done |
| `docs/security/DATA_FLOW_INVENTORY.md` | §2 table: staging added, the US project struck through as deleted; §2.2 retitled to the past tense with the deletion recorded |
| `docs/infra/setup-report.md` | this Round 3 |
| `scripts/verification/fixtures/*.actual.md` | regenerated against staging — prose-level model drift only, explained above |

| `supabase/applied-migrations.json` | **New.** The ledger — 8 staging entries, 8 production entries, each with the file's hash |

Nothing in the repository needed changing for the catalogue seed: `seed.sql`, the
snapshot and the `[db.seed] sql_paths` wiring were already there and already
correct. The gap was that `db push` does not run them, which is now written down in
`CLAUDE.md` §6 so the next fresh project does not repeat it.

**Nothing was applied to either database in Rounds 1 or 2.** In Round 3 the April
project was deleted and staging was created and migrated, both on explicit
instruction. **Production has still had nothing applied to it.**

Three backups exist, all outside the repository, all verified non-empty, and the
April one verified against a census before its project was deleted:

```
/c/Users/kmagr/courtsimplified-backups/april-ffymjx-20260926-143148/   schema, data, auth, roles, migration history
/c/Users/kmagr/courtsimplified-backups/prod-fddlpn-20260926-144214/    schema, data, auth, roles
/c/Users/kmagr/courtsimplified-backups/staging-icpvzw-20260926-151429/ schema, storage data
```

The CLI was linked to production only for the duration of its backup, and is now
linked to **`icpvzwxyjsdgyqfkwycw`, staging**, so that a stray `supabase db push`
cannot reach the live database. `.env.local` points at staging for the same reason.
Both verified by `npm run db:staging`, which prints the target before anything
runs.
