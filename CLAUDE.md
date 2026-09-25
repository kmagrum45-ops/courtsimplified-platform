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

Every card, claim, or assertion must carry its source URL (or, where the source is a neutral citation rather than a URL, the citation) and the date it was verified.

Before starting any sourcing work, read `docs/SOURCING_NOTES.md` — techniques that already work (e.g. the e-Laws `.doc` fallback), dead ends already ruled out, and things already confirmed not to exist, so they don't get rediscovered at the cost of fresh tool calls. When a sourcing session establishes a new technique, a new dead end, or confirms something doesn't exist, add it there in the same session.

**The "who does the applying" test** — the standing rule for telling legal information apart from legal advice, everywhere in this codebase, not just intake:

Legal INFORMATION = the system explains law generally; the USER applies it to their facts.
Legal ADVICE = the SYSTEM applies law to the user's facts.

Wording is not the shield — "in your situation, negligence applies" is advice no matter how it's phrased. The safe pattern is topic surfacing: "situations like this often involve a concept called X — here's what it means and what someone bringing this kind of claim generally must show; worth reading to see if it fits your circumstances." The system may surface topics based on facts (navigation, like the court classifier). It may never state that the user's facts satisfy a legal test, never assess strength, never draft what to say. When a user asks "do I have a case?", the standing answer: the platform organizes and informs but cannot assess — a licensed paralegal or lawyer can, and here's what to bring to that conversation. The system never tells a user they have a case; it gives them the information they need to decide what kind of matter they have and how to move forward. Full design context: `docs/AI_INTAKE_DESIGN.md`.

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

## 6. Environment facts

### Supabase — THE PROJECT NAMES ARE BACKWARDS. READ THIS BEFORE TOUCHING EITHER.

**Identify a project by its REF, never by its name.** Until the rename below is
done, the name tells you the opposite of the truth.

| Ref | Current name | Region | What it actually is |
|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | `ca-central-1` | **PRODUCTION. THE LIVE DATABASE.** Real users' accounts, cases and intakes. Vercel and `.env.local` both point here. |
| `ffymjxjcnwakgdmldpne` | `courtsimplified` | `us-west-2` | **Dormant and paused.** 3 operator accounts, 2 shell cases, nothing else. |

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
- A rename to `courtsimplified-prod` / `courtsimplified-staging` is planned and
  not yet done — step-by-step instructions are in `docs/lso-fixes-report.md`.
  **Until it is done, this table is the only reliable statement of which is
  which.** When it is done, update this table, `docs/ARCHITECTURE.md`,
  `docs/security/DATA_FLOW_INVENTORY.md` and `supabase/environments.json`.
- Production is intended to stay in ca-central-1 for Canadian data residency —
  see ARCHITECTURE.md. It is already there; it is the *paused* project that is
  in the United States.
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
