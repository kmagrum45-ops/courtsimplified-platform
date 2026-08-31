# AI-Guided Intake — Design

Written 2026-08-31 as the persistent design context for a multi-phase
feature. This document is meant to survive across sessions — read it before
touching anything under `src/lib/case-system/intake/` or any future
AI-guided intake UI. When it and the code disagree, trust the code and
update this file, same convention as `docs/ARCHITECTURE.md`.

## The governing rule — "who does the applying" test

This is the single test that decides whether any piece of intake content
(a question, an explanation, a generated sentence) is legal information or
legal advice. It is also recorded in `CLAUDE.md` under the legal-content
section, since it governs everything in this codebase, not just intake.

> Legal **INFORMATION** = the system explains law generally; the **user**
> applies it to their facts.
>
> Legal **ADVICE** = the **system** applies law to the user's facts.

Wording is not the shield — "in your situation, negligence applies" is
advice no matter how it's phrased. The safe pattern is topic surfacing:

> "Situations like this often involve a concept called X — here's what it
> means and what someone bringing this kind of claim generally must show;
> worth reading to see if it fits your circumstances."

The system may surface topics based on facts (navigation, like the court
classifier). It may never state that the user's facts satisfy a legal
test, never assess strength, never draft what to say. When a user asks
"do I have a case?", the standing answer: the platform organizes and
informs but cannot assess — a licensed paralegal or lawyer can, and here's
what to bring to that conversation.

Every question and education-topic entry built against this design should
be checked against this test before it ships: does the text merely explain
what the law generally requires, or does it (even implicitly) tell the
user their facts meet it? If the latter, it's advice, and it doesn't ship.

## The five eventual phases

The intake will become AI-guided in phases. Only Phase 0 (foundation) is
built as of this writing — see "What's actually built" below.

1. **Safety pass (AI)**: distress/danger/out-of-scope detection, runs
   first, can halt intake. Not built.
2. **Fact extraction (AI)**: free text → structured facts, shown back to
   the user for confirmation — suggest-then-confirm applied to
   comprehension itself, not just to output. Not built.
3. **Question selection (NO AI, deterministic)**: facts → remaining gaps →
   next question ID. **Built in Phase 0** — see `selectQuestions.ts`.
   Deliberately the one phase with no AI in it at all, now or later: gap
   analysis is exactly the kind of thing that should be a pure function
   over structured facts, not a model call.
4. **Voice layer (AI, bounded)**: composes a conversational restatement
   and transition around a question, but the question **text** and
   question **choices** always come from the fixed bank — the voice layer
   can rephrase around them, never replace them. A validator blocks legal
   characterization, evaluation, prediction, or advice in the voice
   layer's output; on validation failure, intake falls back to the plain
   reviewed question text. Intake must never block on the voice layer —
   if it's slow, errors, or fails validation, the user still gets the
   question. Not built.
5. **Education layer (post-intake payoff)**: sourced general legal
   education surfaced by topic relevance. **Foundation built in Phase 0**
   — see `educationTopics.ts`. The surfacing logic itself (which topics to
   show, when) is not built; only the sourced content registry is.

## What's actually built (Phase 0 foundation)

No AI calls, no UI changes, no live route touched. Four new files:

- **`src/lib/case-system/intake/questionBank.ts`** — the Small Claims
  question bank. Each question has a stable `id`, `courtArea`,
  `appliesWhen` (a `FactCondition` — a small serializable condition tree,
  not a function, so it can be statically walked), `text`, optional
  `why`/`sourceUrl`, `answerType`, `allowUnknown` (every question has a
  real I-don't-know path — no dead ends), `sensitive`, `phase`
  (`orientation` | `substance` | `sensitive`, encoded as data, not array
  position), an optional `covers` array linking a question to the exact
  `intentionalGaps` string(s) it addresses in
  `scripts/verification/scenarioRegistry.ts`, and `status`/`reviewedAt`
  (everything currently `"draft"`/`null`, pending licensee review — same
  spirit as `outOfScopeForums.ts`'s draft convention, but here it's a real
  typed field the coverage script can check, not just a comment).

  Also exports `KNOWN_FACT_FIELDS` — a small, deliberately-curated list of
  fact field names `appliesWhen`/`surfacedWhen` conditions are allowed to
  reference. There is no fact-extraction AI yet (Phase 2, above), so this
  is a Phase 0 placeholder for "the extractor schema" the coverage script
  validates against: the field names this question bank is designed to
  eventually be driven by. Expand it deliberately as real extraction gets
  built — don't invent a field inline on a question.

- **`src/lib/case-system/intake/selectQuestions.ts`** — the deterministic
  selector: `(facts, answeredIds) → ordered remaining question IDs`. Pure
  function, no AI, no network, no side effects. Sorts by `phase` (stable
  sort, so declaration order within a phase is preserved), filters out
  already-answered questions and questions whose `appliesWhen` doesn't
  match the given facts.

- **`src/lib/case-system/intake/educationTopics.ts`** — the Small Claims
  education topic registry. Each topic has `id`, `courtArea`, `title`,
  optional `surfacedWhen` (same `FactCondition` type), `plainExplanation`
  (general education only — see the governing rule above), a non-empty
  `citations` tuple (`[EducationCitation, ...EducationCitation[]]`,
  compile-time enforced the same way `app/legal-principles/page.tsx`
  enforces its own `citations` field), and `status`/`reviewedAt`.

  Two topics from the original 8-topic scope — "breach of contract
  elements" and "negligence elements" — are deliberately **not** in this
  registry. Both were checked against ontario.ca and ontariocourts.ca this
  session (web search + fetch); neither domain has a self-help-guide page
  stating a general legal-elements framework. What exists on
  ontariocourts.ca is individual Court of Appeal decisions discussing
  those concepts case-by-case — synthesizing a general elements statement
  from reading appellate opinions is legal analysis from case law, which
  `CLAUDE.md`'s sourcing rule treats the same as a CanLII-only fact: cut
  it rather than write it from inference. If a future session finds an
  actual page on one of the three approved domains stating these plainly,
  add the topics back with that citation.

- **`scripts/verification/verifyIntakeCoverage.ts`** (`npm run
  test:intake-coverage`, wired into CI) — fails the build if: any
  small-claims scenario's `intentionalGaps` entry has no question whose
  `covers` array names it; any question's or topic's `appliesWhen`/
  `surfacedWhen` references a fact field not in `KNOWN_FACT_FIELDS`; or any
  **non-draft** question/topic that states a legal fact (a question with a
  `why`, or any topic) lacks a resolvable source URL from one of the three
  approved domains. Nothing currently trips these checks because
  everything is still `status: "draft"` — the checks exist so they start
  enforcing the moment something is marked reviewed.

- **`scripts/verification/verifySelectQuestions.ts`** (`npm run
  test:select-questions`, wired into CI) — the selector's unit tests:
  determinism (same input → same output, run 5x), phase ordering,
  `appliesWhen` filtering, sensitive-last, and `allowUnknown` (every
  question in the bank has a real unknown path, and an answered question —
  including one answered "unknown" — is never re-selected).

## What's deliberately not touched

The existing static `SmallClaimsIntake.tsx` form, its route, and every
other live UI. This foundation is additive; nothing about the current
intake experience changed. Wiring the question bank into an actual guided
UI is future work, not part of this phase.
