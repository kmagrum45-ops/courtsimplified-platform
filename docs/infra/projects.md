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

**Staging's auth is deliberately NOT hardened.** `password_min_length` is 6. The
browser harness signs up real accounts, so a 12-character minimum or a confirmation
requirement would break it. Production's hardening must not be copied to staging
without fixing the harness first.

**Correction (2026-10-09): staging DOES require email confirmation.** Its public
`/auth/v1/settings` reports `mailer_autoconfirm: false` -- and in Supabase that
means confirmation is REQUIRED (`true` would mean accounts are confirmed
automatically). The line above previously said "`mailer_autoconfirm` is false"
as if that meant no confirmation. Found when an outside tester on the Preview site
could sign up but not sign in: the signup sent a confirmation email (and then hit
`over_email_send_rate_limit`), so the account was never confirmed and every
sign-in returned `invalid_credentials`. Preview's bundle does point at staging
(`icpvzwxyjsdgyqfkwycw`), so the projects match; the cause is this setting. To let
people test Preview by signing up, turn "Confirm email" off in staging's
Authentication settings (staging holds no user data).

---

## A2I-gated features on production: off, except for listed testers (2026-10-29)

**Owner's decision: "production defaults off, owner allowlist".** Until this date the
owner's live-testing switch (`OWNER_LIVE_TESTING`) and the code defaults of the AI-advice
switches turned every one of them on for everyone on production, and Vercel Production
sets none of their variables (checked 2026-10-29). Now, on Vercel **Production**
(`VERCEL_ENV` or `NEXT_PUBLIC_VERCEL_ENV` = `production`) each is **off**, except for a
signed-in account listed in **`A2I_TESTER_USER_IDS`**. Previews, staging, local and the
suites are unchanged. One decision, `capabilityAllowed` in
`src/lib/case-system/policy/capabilityAccess.ts`; see SITE_MAP.md, "Who gets the
A2I-gated features".

**`A2I_TESTER_USER_IDS`** — server-side only (never a `NEXT_PUBLIC_` variable).
Comma-separated **Supabase user ids** (UUIDs from Authentication → Users of
`fddlpnibovkkkgboabqb`), never emails. Spaces and capitals are fine. If any entry is not
a user id the whole list is ignored (fails closed). Unset = nobody. The code never logs
it and `/api/capabilities` answers booleans only.

**Owner action (not done by any session):** in Vercel → Settings → Environment
Variables, add `A2I_TESTER_USER_IDS` to **Production** with your own account's user id
(and any other tester's), then redeploy. Until then production shows none of these
features to anyone, the owner included. Do not set it on Preview: previews already have
everything on.

| Capability or switch | Where | Production before | Production after (unlisted / no one signed in) | Listed tester on production | Why gated |
|---|---|---|---|---|---|
| `caseReviewGaps` (AI part of case review) | `a2iScope.ts`, `runCaseReview.ts` | on | off (the code-written checks still show) | on | model writes about the case; A2I statement (c) says case review is not offered |
| `claimElementMapping` | `a2iScope.ts` | on (nothing reads it) | off | on | needs A2I approval: applies law to facts |
| `wordingHelp` | `a2iScope.ts` | on (nothing reads it) | off | on | needs A2I approval: drafting |
| `formCompletion` (court-document drafting buttons, Statement of Claim surface) | `a2iScope.ts` (builder, drafts page, Statement of Claim surface) | on | off | on | needs A2I approval; statement (b) |
| `amountItemization` | `a2iScope.ts` | on (nothing reads it) | off | on | needs A2I approval |
| `caseSpecificDeadlines` | `a2iScope.ts`; deadline engine, `casePosition.ts`, `amountNotes.ts` | on | off | on | needs A2I approval: deadlines for the person's own case |
| `answerLegalQuestions` | `a2iScope.ts`; safety pass, `LegalAdviceDeflection` | on | off (legal questions get the fixed deflection) | on | needs A2I approval |
| `formFilling` (`FORM_COMPLETION_PAUSED`; `/api/generate-form`, `/forms`) | `phaseScope.ts` | on | off (paused notice) | on | completes official court forms; statement (b) |
| `documentAnalysis` (`AI_DOCUMENT_ANALYSIS_ENABLED`; analyse, decision help) | `aiAnalysis.ts` | on | off (two-key gate: ZDR not confirmed) | on | uploaded documents to the model; statement (j) |
| `aiAnalysisText` (`AI_ANALYSIS_TEXT_TO_USERS`; also wording tidy-up) | `phaseScope.ts` | on | off (code-written analysis text) | on | model-written text about the case; statement (a) |
| `appliedLaw` (`APPLIED_LAW`) | `phaseScope.ts` | on | off | on | applies provisions to the person's story |
| `plainExplanations` (`PLAIN_EXPLANATIONS`) | `phaseScope.ts` | on | off | on | AI-written explanation of the law |
| `deepAnalysis` (`ANALYSIS_DEPTH`) | `phaseScope.ts` | full | fast | full | runs the research step and checked answer inside the analysis |
| `researchStep` (`RESEARCH_STEP`) | `phaseScope.ts` | on | off | on | the model chooses the legal questions for the story |
| `sourcedQuestions` (`SOURCED_QUESTIONS`) | `phaseScope.ts` | on | off | on | model-written questions; statement (e) |
| `assistantLaw` (`ASSISTANT_LAW`) | `phaseScope.ts` | on | off | on | answers the person's legal questions |
| `checkedAnswers` (`CHECKED_ANSWERS`) | `phaseScope.ts` | on | off | on | AI-drafted legal statements; statement (a) |
| `strategy` (`STRATEGY`) | `phaseScope.ts` | on | off | on | CLAUDE.md s. 3: off on the live site until A2I |
| `caseUnderstanding` (`CASE_UNDERSTANDING`) | `phaseScope.ts` | on | off (fixed court-path labels) | on | AI summary and questions at the front door |
| `caseReader` (`CASE_READER`) | `phaseScope.ts` | on | off | on | follows `aiAnalysisText` (model reads the account) |

Each switch's own "off" variable still turns it off everywhere, testers included.
Opening one to everyone on production is a recorded decision: an A2I approval in
`a2iScope.ts`, or the key added to `OPEN_TO_EVERYONE_ON_PRODUCTION` in
`capabilityAccess.ts`. Checked by `npm run test:a2i-scope` and `npm run test:a2i-routes`.

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

## Staging filled up with test accounts (found 2026-10-28)

The free plan allows 500 MB per project. On 2026-10-28 the usage page showed 430 MB, and staging's backup
data file was about 1 GB of text against production's 75 MB. Counted on staging that day (counts only):

- 542 accounts, 538 of them browser-harness accounts (`@example.test`, flagged `courtSimplifiedHarness: true`),
  made 4-18 Oct by the walkthrough and the real-session browser tests, whose delete at the end of each test is
  best-effort and mostly had not happened;
- about 567 cases at about 1.7 MB each (up to 2.9 MB), because each case record holds the same analysis
  several times over (`intakeData.masterResultPatch`, `dashboardPatch` with its `caseSystemAssembly`, and the
  top-level copies). Production cases are built the same way; see the case-size plan.

The story pack and the CI browser regression use in-memory accounts and add nothing to staging.

**Cleanup:** `npm run db:clean-staging` (dry run) and `-- --confirm` (`scripts/db/harnessAccounts.ts`) delete
only accounts that are `@example.test` AND flagged AND over a day old, with their uploaded files; every case
table cascades on the account. It refuses any address but staging's, and production's outright. The walkthrough
runs the same cleanup at its start. Run on 2026-10-28: 538 deleted, 0 failed, 4 other accounts kept (116 cases
remained, 115 of them on one `gmail.com` account). The database keeps freed space for itself: the usage figure
drops only after `VACUUM FULL` on the large tables, run in staging's SQL editor.

That account is the site owner's own test account (checked 2026-10-28). On the owner's instruction its cases
made 18-23 Oct were deleted with `-- --account-cases --email <address> --from 2026-10-18 --to 2026-10-23
--keep-newest 5 --confirm` (`scripts/db/accountCases.ts`; days are Toronto days, the newest cases are always
kept): 110 cases and 13 uploaded files deleted, 0 failed; the account and its 5 newest cases kept.

## Verifying this file yourself

```
supabase projects list                       # refs, names, regions, status
vercel env pull <temp file> --environment=production
cat supabase/.temp/project-ref               # which project the CLI would target
```

Never paste the contents of an env file anywhere. The ref is public; the keys
beside it are not.
