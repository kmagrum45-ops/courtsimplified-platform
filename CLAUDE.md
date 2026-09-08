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

Every card, claim, or assertion must carry its source URL (or, where the source is a neutral citation rather than a URL, the citation) and the date it was verified.

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

## 6. Environment facts

- Supabase: two projects. `courtsimplified` (us-west-2, PRODUCTION) and `courtsimplified-dev` (ca-central-1). Never modify production without explicit go-ahead.
- Production is intended to move to ca-central-1 for Canadian data residency — see ARCHITECTURE.md.
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
