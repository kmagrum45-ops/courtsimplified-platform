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

**Round 2, after your six decisions, is at the bottom of this file.** Short
version: both databases are now backed up and counted, production's RLS is in
better shape than expected, the test data in production turns out to be one
account that owns nothing, and everything still outstanding is waiting on a single
credential — a correctly-shaped Supabase personal access token.

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

**Nothing was applied to either database in either round.** Two full backups were
taken — the April project and production — because reading production at all is
worth doing behind a backup, and because Decision 3 will need one already in hand.
Both are outside the repository and both were verified non-empty:

```
/c/Users/kmagr/courtsimplified-backups/april-ffymjx-20260926-143148/
/c/Users/kmagr/courtsimplified-backups/prod-fddlpn-20260926-144214/
```

The CLI was linked to production for the duration of the backup and **relinked to
`ffymjxjcnwakgdmldpne` afterwards**, so that a stray `supabase db push` cannot
reach the live database. Verified with `supabase projects list`.
