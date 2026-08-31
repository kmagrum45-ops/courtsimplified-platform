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

Never state a legal fact without a verified source from ontario.ca, ontariocourts.ca, or ontariocourtforms.on.ca. Web-fetch the source; do not write from your own knowledge of the law.

CanLII (canlii.org, canlii.ca) and the Supreme Court site (decisions.scc-csc.ca) block automated access. Do not scrape them, use mirrors, or fall back on recall. If a statement can only be sourced from those, cut it.

Every card, claim, or assertion must carry its source URL and the date it was verified.

**The "who does the applying" test** — the standing rule for telling legal information apart from legal advice, everywhere in this codebase, not just intake:

Legal INFORMATION = the system explains law generally; the USER applies it to their facts.
Legal ADVICE = the SYSTEM applies law to the user's facts.

Wording is not the shield — "in your situation, negligence applies" is advice no matter how it's phrased. The safe pattern is topic surfacing: "situations like this often involve a concept called X — here's what it means and what someone bringing this kind of claim generally must show; worth reading to see if it fits your circumstances." The system may surface topics based on facts (navigation, like the court classifier). It may never state that the user's facts satisfy a legal test, never assess strength, never draft what to say. When a user asks "do I have a case?", the standing answer: the platform organizes and informs but cannot assess — a licensed paralegal or lawyer can, and here's what to bring to that conversation. Full design context: `docs/AI_INTAKE_DESIGN.md`.

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
