# CourtSimplified — Standing Rules

These rules are absolute. They apply to every task, every session, without being restated.

## 1. Secrets — never expose

Never display, echo, print, log, or include any secret value in your output. This covers:
- Database passwords
- API keys (OpenAI, Supabase, Resend, any other)
- Service role keys
- Access tokens
- The site access password

This applies everywhere: commands you run, explanations you write, commit messages, code comments, file contents, error output.

When a command needs a secret, read it from `.env.local` or the environment inside the command itself. Never paste a literal secret value into a command line. Never ask the user to paste one to you.

If a task cannot be completed without a secret becoming visible, stop and say so. Do not work around it by displaying the value.

## 2. Legal content — never unsourced

Every legal statement must cite a specific, real, publicly resolvable source: a statute or regulation section, a court rule, a court form, a reported decision, or an official government/court/law-society publication. Retrieve and read the actual source before writing anything from it — never from your own knowledge of the law.

Acceptable sources: ontario.ca, ontariocourts.ca, ontariocourtforms.on.ca, CanLII (canlii.org), the Courts of Justice Act, the Rules of the Small Claims Court (O. Reg. 258/98), Justice Ontario, and Law Society of Ontario public materials.

Every citation must be verified to resolve before it ships. A citation that cannot be checked does not go in. Never cite a case, section number, or form number from recall — if it wasn't actually retrieved and read, it doesn't get written down. No invented case names, no approximated citations, no paraphrased holdings attributed to a decision that wasn't read.

CanLII blocks automated scraping. Do not attempt to scrape it. Cite decisions retrieved through legitimate access, and record the neutral citation plus the date verified.

CanLII and the Supreme Court of Canada's own site both block automated fetching, which is why a primary source manually downloaded and saved under `docs/sources/` is a first-class citation route: reading it from disk satisfies the "retrieved and read" requirement the same way a live fetch does, provided `docs/sources/README.md` records what it is, its neutral citation, the URL it came from, and the date it was downloaded.

**CanLII's Terms of Use bind every CanLII feature (2026-10-07).** Full record in `docs/SOURCING_NOTES.md`, "CanLII: the Terms of Use, the API key, and decisions people upload". In short:

- **Never fetch decision text, or any page, from canlii.org or canlii.ca, by any means** — no scraping, no WebFetch, no curl, no browser, no workflow. Any script that fetches URLs from data calls `refuseCanliiContent(url)` first. Links for people to click are fine.
- **The API is metadata only** (`src/lib/canlii/canliiCore.ts`): the court list, one case's metadata, its citing cases. Never the per-court list endpoint (bulk). One request at a time, two a second, a daily cap of 4,000 (CanLII allows 5,000), through the shared lease; cache every answer. The key comes from `CANLII_API_KEY`, server side only, never logged. With no key, or CanLII down, the site works as before.
- **A decision a person uploads to their own case** is shown everywhere with "Source: CanLII" (`DecisionAttribution`), stays in that case only — never in the shared library, the corpus index, the research step, source requests, evals, fixtures, logs or anyone else's analysis — and never in their timeline or exhibit book. AI help with it runs only on their click, behind the document-analysis (ZDR) switch; every quote is checked against the uploaded text; it never predicts or grades their case, and never fills in an anonymised name.
- **Never ask or nudge anyone to download decisions in bulk or for someone else.** Telling a person how to search CanLII for their own case is fine.
- **Being cited by a later decision is not being upheld.** Say so wherever the citator count shows.

`npm run test:canlii` checks all of this in CI.

Every card, claim, or assertion must carry its source URL (or, where the source is a neutral citation rather than a URL, the citation) and the date it was verified.

Before starting any sourcing work, read `docs/SOURCING_NOTES.md` — techniques that already work (e.g. the e-Laws `.doc` fallback), dead ends already ruled out, and things already confirmed not to exist, so they don't get rediscovered at the cost of fresh tool calls. When a sourcing session establishes a new technique, a new dead end, or confirms something doesn't exist, add it there in the same session.

**Guide like a lawyer; never judge the case** — the standing rule for what the system may say about a user's own matter, everywhere in this codebase. Set by the site owner on 2026-10-04, replacing the information-only "who does the applying" test, which is no longer the rule.

The site works the way a lawyer guiding a client would. A user is here because they believe they have a matter, and the site's job is to take them through it to their goal. So the system MAY apply the law to the user's own facts — and is expected to:

- say which court, process, form, rule and deadline applies to them ("you were served on September 20, so your defence is due by…");
- tell them the next step and what it needs ("the next step is filing your Defence, Form 9A, with…");
- read what they have already told us, fill in what it answers, and ask only what is missing;
- help with wording — suggest what to put in a form, claim, defence or affidavit, as a draft they edit;
- explain what someone bringing or defending this kind of matter must show, and point out what is not yet recorded.

It may NEVER say, in any wording, that the user has or does not have a case, or that their case is strong or weak, likely or unlikely to succeed. No predictions of outcome, no chances, no grading of the merits (section 3). When a user asks "do I have a case?", the standing answer: the site does not judge that — it helps them prepare and move forward with what they have, and here is what comes next.

Everything else in this file still binds the guidance: every legal statement is sourced (above), every output is a suggestion the user confirms (section 4), and each advice-giving feature sits behind its own switch so it can be turned off for real users until the Law Society's A2I approval covers it. Code gates written under the old test (outcome language, "you should", the wrong-reader and advice-deflection checks) are being revisited to match this rule; until each is, it still applies to the surface it guards. Design context: `docs/AI_INTAKE_DESIGN.md` (written under the old test).

## 3. Never assess case strength

The platform organizes facts and identifies gaps. It does not judge how a case will go.

Allowed: "no evidence recorded for this issue", "this document is missing", "this date is unconfirmed".

Not allowed: strengths, weaknesses, risk scores, readiness scores that weight risk, predictions about judges, opposing-argument responses, settlement pressure, or anything grading the merits of a user's specific case.

If asked to add something that grades a case, flag it rather than building it.

## 4. Suggest, never decide

Every AI-generated output is shown as a suggestion the user confirms or overrides. Never auto-apply, never silently reroute, never decide for the user.

## 5. Working style

- One change at a time, verified before moving to the next.
- Report findings before making changes when scope is unclear or larger than asked.
- Prove claims by running things, not by reasoning about them. Timing, row counts, and actual output beat assumptions.
- When you are wrong, say so plainly and correct it.
- Do not run `git push` or start long-running dev servers — those are blocked; the user runs them.
- Do not run `npm run build` while a dev server is running. It overwrites `.next`,
  which the dev server is serving from, and leaves it unable to render — pages hang
  indefinitely while middleware still answers, so it looks like a code fault. Verify
  with `tsc --noEmit` and the terminal suites instead, and build when nothing is
  serving.

**A check must assert a property, not a current value.**

When writing a check, ask what would make it fail. **If the answer is "someone doing
the work we want done", the check is wrong.** A check that pins today's value calls
an improvement a regression, and the person who improved the code has to decide
whether the red line is real — which is exactly the judgment a suite exists to spare
them.

Three failed this way in a single day:

| Check | Pinned | What broke it |
|---|---|---|
| `verifyFixtureHarnessGuards` | `voiceLayer.ts` passes an abort signal | the model call was deliberately removed, so there was no request to abort |
| `verifyDepthQuestions` | `limitation-if-newspaper-or-broadcast` is unauthored | the element was authored — the work the check existed to encourage |
| `verifyReachability` | a dormant list of unreachable modules | two modules were wired up, exactly as intended |

Each was rewritten to assert the property instead: voiceLayer makes **no** model call;
an element with no authored question lands in `unauthored` (asserted against a
synthetic id that will never be authored); a module is reachable **or** declared
dormant with a reason. All three now fail only on a real regression.

The reachability case is the instructive one, because it is *correct* for a list to
need updating when a module is wired — so it carries a second check that a dormant
entry has not quietly become reachable, and the update is a one-line deletion with
an obvious cause. A list that must be maintained is fine. A check that punishes the
maintenance is not.

## 5a. One line of work — nothing waits on a side branch

Established 2026-09-29, after work from several chats sat on seven unmerged
branches: each passed its own tests, they conflicted with each other, and the
live site ran none of it.

- **Start every session from the latest `main`** (`git fetch origin main` and
  branch from `origin/main`), never from an old branch or another chat's branch.
- **Finish every session with the work in `main`:** open a PR into `main`, let
  CI run (it runs on PRs into `main`, with the real OpenAI key), fix what fails,
  merge. Do not end a session with work only on a side branch, and do not tell
  the user something is fixed until it is merged and Vercel has deployed it.
- **Everything goes into `main` through auto-merge (site owner, 2026-10-08;
  replaces "merge immediately, don't wait for CI" of 2026-09-29).** Open the PR
  and switch on auto-merge straight away (GraphQL `enablePullRequestAutoMerge`,
  method SQUASH). GitHub merges it by itself the moment `typecheck-and-build`
  passes — the ruleset "main must pass checks" requires that check on `main`,
  and nobody but the site owner can bypass it. So nothing waits on a person,
  and nothing broken reaches `main`. Why it changed: merging before CI finished
  put two type errors on `main` on 2026-10-08, failed both Vercel builds
  each time, and emailed the site owner. If the check fails, fix it on the
  same branch; the PR merges itself once it passes. Wait for the merge before
  telling the user something is live, and before syncing `case-workspace`.
- **Never push directly to `main`.** Merge through a PR so the history shows it.
- **A branch that is not the site must never be built by Vercel.** Anything that
  publishes reports or data to its own branch puts a `vercel.json` with
  `{"git": {"deploymentEnabled": false}}` in that branch (see
  `courtsimplified-story-review.yml`). Each failed preview emails the site owner.
- **`case-workspace` follows `main`:** after a merge, fast-forward it to `main`.
- If a PR cannot be merged yet (it needs a decision), say so plainly and list it,
  so the user always knows what is not live.

## 6. Environment facts

### Supabase — identify a project by its REF, never by its name

**The names were backwards until 2026-09-26 and are now correct.** The rule stands
anyway: a name is editable in a dashboard, a ref is not, and every script here
resolves by ref.

| Ref | Name | Region | What it is |
|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-prod` | `ca-central-1` | **PRODUCTION. THE LIVE DATABASE.** The Vercel production environment points here |
| `icpvzwxyjsdgyqfkwycw` | `courtsimplified-staging` | `ca-central-1` | **STAGING.** Created 2026-09-26, clean, every repo migration (all applied to both projects as of 2026-09-30) plus the seeded catalogue. Vercel **Preview** points here. Holds no user data and must never hold any |

**⚠️ ANYTHING WRITTEN BEFORE 2026-09-26 THAT SAYS "dev" MAY MEAN PRODUCTION.**
Production was called `courtsimplified-dev` for five months. That name still
appears in this repository's history, in several documents' historical passages,
and in four migration files — the migrations are deliberately **not** edited,
because the migration ledger stores their hashes. When you read an older
instruction, resolve the ref, not the word.

**`ffymjxjcnwakgdmldpne` no longer exists.** That was the original April project,
in `us-west-2`, which this file described as empty staging. It was **deleted on
2026-09-26** on the site owner's explicit instruction, after a backup that was
verified against a census of its contents. If you find that ref named anywhere,
it is stale; the backup is at
`courtsimplified-backups/april-ffymjx-20260926-143148/` and includes its schema,
data, auth rows with password hashes, roles, and the 26 legacy migration
versions that were never in this repository.

**`docs/infra/projects.md` is the source of truth for which is which**, established
2026-09-26 by reading the live systems. Three things in this table were wrong before
that and are worth knowing about:

- The second project was recorded here and in two other documents as *paused*. It
  is `ACTIVE_HEALTHY` and appears to have been restored without the docs being
  updated.
- **This table said the April project held "24 tables, every one empty". That was
  wrong, and the way it was wrong is the lesson.** It came from
  `supabase inspect db table-stats`, whose `estimated_row_count` column is
  `pg_class.reltuples` — a planner estimate that is only updated by `ANALYZE` or
  autovacuum, and reads 0 on a table nobody has analysed. A dump of the same
  project produced 977 KB of data: 3 auth accounts and 2 cases. **Never conclude a
  table is empty from `table-stats`. Use `count(*)`, or count rows in a dump.**
  An estimate that happens to say 0 is not a measurement that says 0.
- **The baseline schema lives in a file whose name hides it.**
  `supabase/migrations/20260823020500_add_case_evidence_storage_bucket.sql` is
  48 KB and contains **24 `CREATE TABLE` statements** — it is the whole base
  schema, not a storage bucket. It is the output of
  `supabase migration squash --linked`, which collapsed the 26 original
  migrations into one file and kept the **last** migration's name, so the name
  describes the smallest thing in it. `supabase/seed.sql` records the squash and
  why it was needed. Worth knowing before concluding, as I did, that the repo
  carries no baseline and a fresh project cannot be built from it.
- **Migrations alone do NOT give you a working environment; the catalogue is
  seeded separately.** A fresh project built from the 8 migrations has 27 tables,
  RLS on all of them and the same 18 policies as production — and **zero rows of
  reference data**. The 1371 catalogue rows (723 `court_form_library`, 113
  `court_forms`, 104 `forms`, the `legal_*` rules, the lookups) come from
  `supabase/seed.sql` + `supabase/snapshots/20260822_catalogue_data_snapshot.sql`,
  wired into `[db.seed] sql_paths` and normally loaded by `supabase db reset`.
  Push migrations to a new project without seeding and `test:cohort2-*` fail on
  `must be present in court_form_library`. That snapshot is also now the only
  surviving copy of that data's origin, the April project having been deleted.
- `.env.local` on the development machine pointed at **production**, so fixture
  and eval runs were exercising the real pipeline against real users' data.
  `scripts/db/assertNotProduction.ts` now refuses that, and `npm run db:staging` /
  `npm run db:prod` print the target before anything runs.

This entry previously read *"`courtsimplified` (us-west-2, PRODUCTION) and  <!-- [dev-wording-quoted] -->
`courtsimplified-dev` (ca-central-1)"*, which named the paused project as  <!-- [dev-wording-quoted] -->
production and implied the live one was a scratch environment. Any instruction
anywhere that says "apply it to dev first" was, read literally, an instruction  <!-- [dev-wording-quoted] -->
to apply it to production. That wording is the hazard, not the names
themselves.

- **Never modify `fddlpnibovkkkgboabqb` without an explicit go-ahead.** It is
  production regardless of what it is called.
- **Never apply a migration to any project without being asked to.** Write the
  file; the site owner applies it. See `scripts/db/applyMigrations.ts`, which
  enforces staging-before-production and refuses to do anything without
  `--confirm`.
- **The rename is DONE (2026-09-26).** `courtsimplified-prod` /
  `courtsimplified-staging`, via the Management API.
  `supabase/environments.json` has `renameComplete: true`, which is what silences
  the warning `scripts/db/applyMigrations.ts` prints on every run.
- **Production's auth is hardened; staging's deliberately is not.** Production:
  `password_min_length` 12, `mailer_autoconfirm` **false** so email confirmation
  is required, TOTP MFA enrol and verify on. Staging keeps the minimum at 6 with
  no confirmation, because the browser harness signs up real accounts and both
  changes would break it. **Requiring confirmation means signup now depends on
  Resend SMTP delivering** — it is configured on production, and if it stops
  working, new users cannot complete signup.
- **There are NO automatic backups of production.** The organisation is on the
  **free** plan, which provides neither daily backups nor point-in-time recovery.
  PITR is a paid add-on: $100/month for 7 days, and it needs Pro. Until that
  changes, the only backups that exist are the manual `supabase db dump` runs
  under `courtsimplified-backups/`. **Take one before any change to production**,
  and check its byte count — a dump with Docker down writes a 0-byte file and
  still reports success.
- Production stays in ca-central-1 for Canadian data residency — see
  ARCHITECTURE.md. **Both projects are now in ca-central-1**, so a staging run
  exercises the same residency path as the real thing. Nothing of ours is in the
  United States any more; the US project was the one deleted on 2026-09-26.
- The site is behind a password gate (middleware.ts, cookie `cs_site_access`). Test harnesses need `grantSiteAccess`.
- `.env.local` and `.env.diagnose` are gitignored and must stay that way.

## 7. Intake changes — run the fixture harness

Any new intake feature or content change (question bank, claim types, extraction, the guided or
static pipeline, the final analysis engine) must be run against
`scripts/verification/fixtures/` (`npm run test:fixtures`) before it ships. It exercises the real
pipeline end to end against three fabricated whole-case fixtures with pre-committed expectations —
see the fixtures directory for what's covered and why.

Any behaviour change it produces must be explained, not absorbed silently: update the relevant
`*.expected.md` with the reasoning if the new behaviour is correct, or fix the regression if it
isn't. Never quietly let `.actual.md` drift out of sync with what `*.expected.md` says should
happen.

**OpenAI spending, cost controls (2026-10-08).** October reached about $396
against a $100 budget, almost all testing. Now: every call to a GPT-5.6+ model
is sent with `prompt_cache_options: {mode: "explicit"}` and no breakpoint, so
nothing is written to the prompt cache (implicit caching wrote every prompt at
1.25x the input price and almost none was read back) — openaiClient.ts
`withoutCacheWrites`. Every AI workflow runs `scripts/ai/spendGuard.mjs` first
and shows today's spend (Toronto time), with a warning over $15; it never stops
a run (site owner, 2026-10-08: work is not to stop mid-way). Reading the spend
needs the repository secret `OPENAI_ADMIN_KEY` (an OpenAI admin key; the Costs
API); without it the note says so and the run continues. The walkthrough, story review, retrieval eval, nightly and coverage
runs skip code they already passed on (run with `force=yes` to override); CI's
billed suite runs only when the AI code changed since it last passed. The
walkthrough and nightly runs use low reasoning effort, and the repository
variable `AI_TEST_MODEL` sets a cheaper model for them. `npm run test:openai-cost`
checks all of this in CI.

**OpenAI spending (2026-10-07).** The walkthrough, story review (which runs
`test:fixtures`), nightly AI, corpus index and retrieval eval workflows are
manual-only (`workflow_dispatch`), because they spend the site's OpenAI
balance and it ran low. Start one deliberately when a run is worth its cost;
CI on pull requests still runs its one billed suite (safety regression).
The law exam (`courtsimplified-law-exam.yml`, `npm run eval:law-exam`) is
manual-only for the same reason and runs nothing without `--confirm`; its
answer keys are checked for free in CI by `test:law-exam`.

## 7a. The master plan

`docs/MASTER_PLAN.md` is the plan and the fixed beta finish line (adopted
2026-10-06). Work from it. It changes only through its decision log; a new
finding goes into the phase that owns it or onto the after-beta list, never
moves the finish line on its own.

## 8. Know what exists before adding to it

This codebase has 58 documents and more than 80 verification suites. The
recurring failure is not bad work — it is work done twice, or work built on an
assumption a suite already disproves. Two indexes exist so that stops:

- **`docs/ACCURACY_ENGINE.md`** — the map of the accuracy work: the corpus, the
  stage map, the deadline engine, the content pipeline. What each module does,
  which decisions are already settled, what is deliberately dormant and why,
  and the specific traps that have cost time before (frozen `_eV` consolidation
  snapshots, antiword's whitespace, the two different holiday definitions).
  **Read it before touching `stage-map/`, `deadlines/` or `scripts/content/`.**

- **`docs/VERIFICATION_SUITES.md`** — every `test:` script and what it asserts,
  generated by `npm run docs:suites` from each suite's own header comment.
  Never edited by hand: there is one description, in the file, so the index
  cannot drift from the behaviour.

**Every new verification suite gets a header comment** saying what it checks and
what failure it exists to catch. A suite whose purpose is undocumented is one
nobody can safely change or delete, so it survives forever and gets skipped.
Run `npm run docs:suites` after adding one. It reports how many suites still
have no header; that number should go down, never up.

**Write down what a finding cost.** When something takes real effort to
establish — a source that does not exist, a technique that works, a rule that
is not what it looks like — it goes in `docs/SOURCING_NOTES.md` or
`ACCURACY_ENGINE.md` in the same session, with enough context that the next
person does not repeat the search. A comment explaining why a check is subtle
is worth less than one saying "this caught me".
