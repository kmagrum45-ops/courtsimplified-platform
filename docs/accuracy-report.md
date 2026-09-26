# The accuracy engine — what it does, what it refuses, and what is not true yet

**Branch `accuracy-engine`, 26 September 2026.** Every number here was read out
of the code by a script rather than recalled; the commands that reproduce them
are in section 10.

**Written for:** the licensee who will review this content, and anyone at the Law
Society who asks how a product that shows legal information decides what to say.

---

## 1. The claim this product makes

> Reason like an expert privately; answer only from verified, sourced content.

A model may reason as deeply as it likes. That reasoning is logged and never
shown. Everything a user *sees* comes from content checked against real rule text
before they saw it, every procedural statement carries its citation, and personal
details are filled into verified templates by code rather than written by a
model.

**"We're not sure" is a designed outcome, not a failure.** The stage resolver has
four ways to decline — an id not in the map, confidence below the floor, two
candidates it cannot separate, no answer at all — and the route adds a fifth,
because a stage it can name but has no checked content for is still UNKNOWN to
the reader. The chat adds two more: nothing in the library answers this, and this
question is one only a licensee may answer. Every one of them ends with referrals
and none of them ends with a guess.

What that rules out, deliberately: this product never assesses how a case will
go, never tells a reader their facts satisfy a legal test, and never drafts what
they should say. The line it works to is the one in `CLAUDE.md`: legal
INFORMATION is the system explaining law generally and the USER applying it;
legal ADVICE is the SYSTEM applying law to the user's facts.

---

## 2. What was wrong, which is why any of this exists

`docs/accuracy-diagnosis.md` traced ten realistic stories through the live code.

**Eight received the same answer** — "file a Defence within 20 days" — including
three plaintiffs and a defendant who already had default judgment signed against
them.

The proximate cause was `text.includes("defendant")` in a hand-written
`inferStage`. The deeper cause was worse: **five of the ten stories had no
correct destination at all.** The taxonomy had nine values and no position for a
claim issued but not served, a defence period running, twenty days elapsed with
no defence, a defendant noted in default, or a default judgment signed. Better
detection against that taxonomy would only have produced a better-aimed wrong
answer.

Two defaults did most of the damage. `inferStage` and `getStageForPersistence`
both fell back to `"starting-case"` when nothing matched — and a default is a
confident answer given without evidence.

---

## 3. What the product knows, and how it knows it

**23 vendored sources** under `docs/sources/corpus/`, each with its URL,
retrieval date and content hash. Nothing states law from memory; it states it
from here.

**59 citations**, each one a verbatim quote plus a pinpoint. `npm run
test:stage-map` reads every quote back out of the vendored text on every run, so
a rule number recalled rather than read cannot ship.

Two tiers, treated differently. Legislation changing means content may now be
*wrong*; a practical guide changing usually means a number moved. Reporting both
with the same urgency trains people to ignore both.

`npm run rules:check` reports drift and **does not auto-update**. Re-vendoring is
a deliberate act, because silently refreshing the local copy erases the evidence
that anything moved.



### The 23 sources, with what they are and when they were taken

All retrieved 24 September 2026. The consolidation period is the statute's own —
it is how e-Laws states the version, and it is what `npm run rules:check` compares
against to notice the law moving.

| Source | Citation | Retrieved | Consolidation |
|---|---|---|---|
| [Rules of the Small Claims Court](https://www.ontario.ca/laws/docs/980258_e.doc) | O. Reg. 258/98 | 2026-09-24 | FROM OCTOBER 14, 2025 TO THE E-LAWS CURRENCY DATE. |
| [Courts of Justice Act](https://www.ontario.ca/laws/docs/90c43_e.doc) | R.S.O. 1990, c. C.43 | 2026-09-24 | FROM DECEMBER 11, 2025 TO THE E-LAWS CURRENCY DATE. |
| [Small Claims Court Jurisdiction and Appeal Limit](https://www.ontario.ca/laws/docs/000626_e.doc) | O. Reg. 626/00 | 2026-09-24 | FROM OCTOBER 1, 2025 TO THE E-LAWS CURRENCY DATE. |
| [Limitations Act, 2002](https://www.ontario.ca/laws/docs/02l24_e.doc) | S.O. 2002, c. 24, Sched. B | 2026-09-24 | FROM DECEMBER 4, 2024 TO THE E-LAWS CURRENCY DATE. |
| [Legislation Act, 2006](https://www.ontario.ca/laws/docs/06l21_e.doc) | S.O. 2006, c. 21, Sched. F | 2026-09-24 | FROM DECEMBER 11, 2025 TO THE E-LAWS CURRENCY DATE. |
| [Rules of the Small Claims Court Forms](https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/) | ontariocourtforms.on.ca | 2026-09-24 | (none stated) |
| [Municipal Act, 2001](https://www.ontario.ca/laws/docs/01m25_e.doc) | S.O. 2001, c. 25 | 2026-09-24 | FROM JUNE 2, 2026 TO THE E-LAWS CURRENCY DATE. |
| [City of Toronto Act, 2006](https://www.ontario.ca/laws/docs/06c11_e.doc) | S.O. 2006, c. 11, Sched. A | 2026-09-24 | FROM JUNE 2, 2026 TO THE E-LAWS CURRENCY DATE. |
| [Occupiers' Liability Act](https://www.ontario.ca/laws/docs/90o02_e.doc) | R.S.O. 1990, c. O.2 | 2026-09-24 | FROM JANUARY 29, 2021 TO THE E-LAWS CURRENCY DATE. |
| [Holidays Act (Canada)](https://laws-lois.justice.gc.ca/eng/acts/H-5/FullText.html) | R.S.C. 1985, c. H-5 | 2026-09-24 | (none stated) |
| [Employment Standards Act, 2000](https://www.ontario.ca/laws/docs/00e41_e.doc) | S.O. 2000, c. 41 | 2026-09-24 | FROM JANUARY 1, 2026 TO THE E-LAWS CURRENCY DATE. |
| [Guide to Procedures in Small Claims Court: Making a claim](https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim) | ontario.ca — Guide to Procedures in Small Claims Court | 2026-09-24 | (none stated) |
| [Guide to Procedures in Small Claims Court: Serving documents](https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents) | ontario.ca — Guide to Procedures in Small Claims Court | 2026-09-24 | (none stated) |
| [Guide to Procedures in Small Claims Court: Replying to a claim](https://www.ontario.ca/document/guide-procedures-small-claims-court/replying-claim) | ontario.ca — Guide to Procedures in Small Claims Court | 2026-09-24 | (none stated) |
| [Guide to Procedures in Small Claims Court: Getting ready for court](https://www.ontario.ca/document/guide-procedures-small-claims-court/getting-ready-court) | ontario.ca — Guide to Procedures in Small Claims Court | 2026-09-24 | (none stated) |
| [Guide to Procedures in Small Claims Court: Motions and clerk's orders](https://www.ontario.ca/document/guide-procedures-small-claims-court/motions-and-clerks-orders) | ontario.ca — Guide to Procedures in Small Claims Court | 2026-09-24 | (none stated) |
| [Guide to Procedures in Small Claims Court: After judgment](https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment) | ontario.ca — Guide to Procedures in Small Claims Court | 2026-09-24 | (none stated) |
| [Suing someone in Small Claims Court](https://www.ontario.ca/page/suing-someone-small-claims-court) | ontario.ca | 2026-09-24 | (none stated) |
| [File Small Claims Court documents online](https://www.ontario.ca/page/file-small-claims-court-documents-online) | ontario.ca | 2026-09-24 | (none stated) |
| [Have your court fees waived](https://www.ontario.ca/page/have-your-court-fees-waived) | ontario.ca | 2026-09-24 | (none stated) |
| [Small Claims Court — Steps in a Case](https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/steps-in-a-case/) | ontariocourts.ca — Superior Court of Justice | 2026-09-24 | (none stated) |
| [Small Claims Court — How to Respond to a Case](https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/) | ontariocourts.ca — Superior Court of Justice | 2026-09-24 | (none stated) |
| [Small Claims Court — Default Proceedings](https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/) | ontariocourts.ca — Superior Court of Justice | 2026-09-24 | (none stated) |

### Two findings from this work worth recording

**The monetary limit is $50,000**, not $35,000 — O. Reg. 626/00 s. 1 (1) as
amended by O. Reg. 42/25. The old figure was in the product.

**There are two different holiday calendars, and the difference decides real
dates.** `r. 1.02 (a)` makes every Saturday and Sunday a holiday. `Legislation
Act s. 88 (2)` lists Sunday and not Saturday. The pre-suit notice deadlines are
statutory, so the same ten days from the same event ends on a Saturday under the
Act and the following Monday under the rules. On a ten-day notice that difference
is the claim.

**Five holidays have no statutory date anywhere** — Good Friday, Easter Monday,
Labour Day, Thanksgiving Day, Civic Holiday. Checked against the Legislation Act,
the ESA statute and guide, the Retail Business Holidays Act and the federal
Holidays Act. The engine uses the settled dates, marks them, and any deadline
whose answer turns on one comes back needing confirmation with the court.

---

## 4. Where a case can be: 37 positions, 80 boundaries

`src/lib/case-system/stage-map/`. **37 stages**, of which **12 are positions
where something has already gone wrong** — missed deadline, failed service,
missed hearing, default judgment against you, wrong court. Those are ordinary
positions carrying ordinary content, not error states. They are also when a
person is most frightened, and a product that models the happy path fails exactly
the people with the most at stake.

**80 recorded boundaries.** Each stage states what SEPARATES it from the
neighbours it will be confused with — not a description of itself, but the fact
that decides between two positions. A classifier that cannot answer the boundary
question must return UNKNOWN rather than pick.

That doubles as the clarifying-question mechanism: given two candidates, the
recorded boundary IS the question to ask. **42 distinct questions** after
de-duplication. None is written by a model.

**The confidence floor is 0.85, and it is calibrated rather than chosen.** It was
0.7 a priori. The first eval runs measured what the model actually does: 0.80 on
stories it should have declined, 0.90 where the fact was plainly stated. A floor
of 0.7 sat below both and caught nothing. The honest caveat is in the code — a
threshold fitted between two clusters in a 45-story sample is fitted to that
sample, and `npm run eval:accuracy` is what would notice drift.

---


### Every stage, and whether it has content

"Content" is the published status where there is one. A dash means a person at
that position gets UNKNOWN and the referrals — 21 of 35.

### plaintiff (23)

| Stage | Content | Deadlines | Went wrong |
|---|---|---|---|
| `before-filing:deciding-whether-to-sue` | — | 1 (1 BAR) |  |
| `before-filing:notice-municipality` | verified-draft | 1 (1 BAR) |  |
| `before-filing:notice-toronto` | verified-draft | 1 (1 BAR) |  |
| `before-filing:notice-snow-ice-private` | verified-draft | 1 (1 BAR) |  |
| `before-filing:notice-deadline-missed` | verified-draft | — | yes |
| `before-filing:limitation-period-may-have-passed` | no-source | — | yes |
| `before-filing:claim-exceeds-small-claims-limit` | — | — | yes |
| `plaintiff:claim-drafted-not-filed` | — | — |  |
| `plaintiff:claim-issued-not-served` | verified-draft | 1 |  |
| `plaintiff:service-attempted-failed` | verified-draft | 1 | yes |
| `plaintiff:six-month-service-window-expired` | verified-draft | — | yes |
| `plaintiff:served-awaiting-defence` | — | 1 |  |
| `plaintiff:defence-period-expired-no-defence` | verified-draft | — |  |
| `plaintiff:defendant-noted-in-default` | — | — |  |
| `plaintiff:assessment-of-damages-needed` | — | — |  |
| `plaintiff:default-judgment-signed` | — | — |  |
| `plaintiff:defence-filed` | — | 1 |  |
| `plaintiff:served-with-defendants-claim` | — | 1 |  |
| `plaintiff:awaiting-settlement-conference` | — | 1 |  |
| `plaintiff:settlement-conference-held` | — | 1 |  |
| `plaintiff:trial-date-set` | — | — |  |
| `plaintiff:judgment-in-my-favour-unpaid` | — | — |  |
| `plaintiff:action-dismissed-for-delay` | no-source | 1 | yes |

### defendant (9)

| Stage | Content | Deadlines | Went wrong |
|---|---|---|---|
| `defendant:served-defence-period-running` | verified-draft | 1 |  |
| `defendant:defence-period-expired-not-yet-noted` | verified-draft | — | yes |
| `defendant:noted-in-default` | verified-draft | — | yes |
| `defendant:default-judgment-against-me` | verified-draft | 1 | yes |
| `defendant:defence-filed` | verified-draft | 1 |  |
| `defendant:considering-defendants-claim` | — | 1 |  |
| `defendant:awaiting-settlement-conference` | — | 1 |  |
| `defendant:trial-date-set` | — | — |  |
| `defendant:judgment-against-me` | — | — |  |

### both (3)

| Stage | Content | Deadlines | Went wrong |
|---|---|---|---|
| `both:missed-settlement-conference` | — | — | yes |
| `both:missed-trial` | verified-draft | 1 | yes |
| `both:filed-in-wrong-place` | — | — | yes |

---


## 5. Dates are computed, never guessed

Date arithmetic has exactly one right answer, no interpretation, and an
unrecoverable failure mode. A model right 98% of the time is wrong about one
deadline in fifty, silently, in fluent prose, and the person finds out when the
clerk turns them away.

So `src/lib/case-system/deadlines/` is ordinary arithmetic, and it returns not a
date but **a date, the reasoning that produced it, and the provision behind each
step**. "20 December, and here is why" is checkable; "20 December" is something a
person has to trust.

**18 deadlines in the stage map. 4 of them BAR THE CLAIM** — the municipal
10-day notice, the Toronto 10-day notice, the occupiers' 60-day notice, and the
two-year limitation period. Missing a defence deadline changes what happens next
and is recoverable by motion under r. 11.06; missing a notice period means,
subject to narrow exceptions, there is no action at all. Content that presents
the two the same way teaches people that every deadline is survivable.

**The engine writes no prose.** It chooses from **18 fixed templates** and
supplies dates. Those templates are indexed for licensee review like any other
content, because the moment the engine acquired a caller its sentences became
user-facing — and prose assembled inside an engine would not have been *blocked*
by the output guard, it would have bypassed it entirely.

**An ambiguous date is refused, not guessed.** "03/04/2026" is 3 April to most of
the world and 4 March to some of it. Accepted: `2026-04-03`, `3 April 2026`,
`April 3 2026`, `3 Apr 2026`. Everything else leaves the date unknown and the
block shows the period. A deadline out by a month with a rule cited beside it is
the most credible wrong answer this product could give.

**11 events a deadline can run from; 9 are asked about.** The two that are not
are recorded with their reasons. When a claim was *discovered* decides whether
the limitation period has run and is a question under Limitations Act s. 5, not a
fact a person reports — a date box driving a computed "you are out of time" would
be the system applying law to their facts. And the date of the *judgment* is not
asked because no deadline runs from it: r. 17.01 (5) gives 30 days after the
party becomes AWARE, and asking for the judgment date would hand the reader an
earlier deadline than the rule gives them.

---


### The nine worked cases, and why each one is there

Every expected date is derived from the provisions in the case itself, so a red
line says what was expected AND why. Without that, the temptation is to update the
number until it goes green.

| Case | From | Period | Regime | Expected | The trap |
|---|---|---|---|---|---|
| defence-20-days-lands-sunday | 2 Mar 2026 | 20 days | rules | Mon 23 Mar | lands Sunday; r. 1.02 (a) rolls it to Monday |
| **municipal-notice-ends-saturday** | 3 Jun 2026 | 10 days | statute | **Sat 13 Jun** | **THE SATURDAY TRAP.** s. 88 (2) lists Sunday, not Saturday |
| same-ten-days-under-the-rules | 3 Jun 2026 | 10 days | rules | Mon 15 Jun | identical arithmetic, **two days later**, because the regime differs |
| municipal-notice-ends-sunday | 4 Jun 2026 | 10 days | statute | Mon 15 Jun | the mirror: Sunday IS a holiday under the Act |
| occupiers-60-days-january-slip | 15 Jan 2026 | 60 days | statute | Mon 16 Mar | 60 days lands Sunday, extends |
| service-window-six-months-from-31-august | 31 Aug 2025 | 6 months | rules | Mon 2 Mar | s. 89 (6): February has no 31st |
| limitation-two-years-from-29-february | 29 Feb 2024 | 2 years | statute | **Sat 28 Feb 2026** | s. 89 (7) leap year, AND it ends on a Saturday |
| four-years-from-29-february | 29 Feb 2024 | 4 years | statute | Sat 29 Feb 2028 | 2028 IS a leap year, so no adjustment |
| disclosure-14-days-before-conference | 20 May 2026 | 14 days | rules | Wed 6 May | counted BACKWARDS; forwards is the opposite of the rule |

The seventh caught me while writing Part 4: I expected 2 March, reasoning the
weekend would carry it to Monday. It does not, because the Legislation Act's
holiday list has no Saturday in it. That is the exact mistake the engine exists to
prevent, and I made it.

---


## 6. How a sentence becomes publishable

Two model passes and a third gate that is not a model.

```
DRAFTER    stage + quoted rule text + official guides  ->  four sections
VERIFIER   a SEPARATE call, no sight of the drafter's reasoning.
           Must FIND AND QUOTE the passage supporting each sentence.
CODE       looks every quoted passage up, verbatim, in the vendored corpus.
```

**The third gate is the point.** A verifier asked to quote its support can invent
one — right register, right rule number, plausible clause — and a reviewer
skimming the record would accept it. Two models agreeing is not verification; a
model agreeing with a file on disk is. It has caught fabricated support in live
output more than once.

| Status | Meaning | Shown? |
|---|---|---|
| `draft` | written, nothing checked | No |
| `needs-human` | four attempts, still unsupported; a person can finish it | No |
| `no-source` | **nobody has written this down.** Carries what did verify, plus fixed wording saying so | **Yes** |
| `verified-draft` | every sentence checked against source text by a separate pass and by code | Not until approved |
| `approved` | a licensee read it and signed off | Yes |

`approved` is set by a person, never by the pipeline.

**Published content is pinned to one promoted run.** Runs are candidates; a
script promotes one only if every block passes every gate, and a promoted set is
immutable and committed. The current release is **run-9, 16 blocks, content hash
`22bb4604`** — 14 `verified-draft` and 2 `no-source`. A regulator asking what the
product said on a date reads it from git history.

This matters because **the pipeline is not deterministic even at temperature 0
with a fixed seed**: counts vary by one, and across identical runs a number of
blocks change status. Pinning is what makes "what does the product say" a
question with an answer.

---


### What the pipeline has actually produced

```
35 stages drafted
   14  verified-draft     every sentence checked against source text
    2  no-source          nobody has written this down; says so
   19  needs-human        four attempts, still unsupported

16 published (run-9, hash 22bb4604)
```

The published set is smaller than verified-draft + no-source because promotion is
all-or-nothing against every gate: a block that verifies but fails the
wrong-reader check, the absence check, the gloss check or the bar-exception check
does not go out.

**Conflicts with the older catalogue.** `test:stage-answers` reports particulars
in the new blocks that disagree with the pre-existing content catalogue —
different day counts, different form numbers, different actors for the same step —
as a list for a reviewer rather than as a failure. It reports rather than fails
because when two of our own sources disagree, a script is not the thing that
should decide which is right. The current run reports none outstanding; the
mechanism stays because the next re-vendoring is when it earns its keep.

---


## 7. The gates no model verdict can override

- **`findQuote`** — the quoted passage must be in the vendored corpus. Edges
  normalised (trailing punctuation, case), interior never. An elided quote is
  chained: same source, same order, gaps under 200 characters.
- **`makesAClaim`** — a sentence with a number, form, deadline or court actor
  cannot be waved through as "states nothing".
- **`predictsOutcome`** — refused **even when a source says it**. Court guides
  talk about improving your chances; this product may report that a guide
  recommends something, never adopt a prediction in its own voice.
- **`wrongReaderProblems`** — a plaintiff's block may not contain a defendant's
  step, may not describe "the plaintiff" in the third person, may not have
  service the wrong way round.
- **`assertsAbsenceProblems`** — **never claim the law is silent.** Every other
  statement is verified by finding it in the corpus; an absence cannot be, because
  you can only fail to FIND something. The product may say what *we* lack.
- **`glossProblems`** — a block may say "in person" only if a passage it rests on
  says it. "Served upon" is not "in person", and personal delivery is not personal
  service.
- **`barExceptionProblems`** — a deadline that bars the claim must appear with
  every exception the stage map records for it. A bar without its exceptions
  frightens people out of claims they still have.
- **The deadline section must be byte-identical** to what the renderer produces
  from the stage map.
- **`forumCheckOnlyProblems`** — the three catch-all before-filing stages may carry
  FORUM-CHECK content only: which court or tribunal handles this kind of matter,
  and the monetary line that decides it. Never a form, a rule or a step. They are
  where a misclassified matter lands, so a person arriving there is ROUTED rather
  than instructed — procedure is the one thing that would send them further in the
  wrong direction.

**The output guard is an allowlist**, not a deny-list. A string reaches a user
only if it is a content-library item or an allowlisted non-legal system message.
A deny-list can establish that a string lacks the phrases somebody thought of; it
cannot establish that a string is approved content.

Templates are guarded **before** slots are filled, so an approval covers the
reviewed words rather than one user's filled-in sentence.

---

## 8. What is measured, and what it currently says

`npm run eval:accuracy` — 47 stories, 9 deadline cases, 5 chat cases.

```
stage accuracy      97%   (target >= 90%)   PASS
wrong-stage shown   0     (target 0)        PASS
dangerous stage     1     (target 0)        FAIL
out-of-scope harm   0     (target 0)        PASS
out-of-scope latent 1     (target 0)        FAIL
overconfident       1     (target 0)        FAIL
advice deflected    3/3   (target all)      PASS
deadline accuracy   9/9   (target 100%)     PASS
through a block     5/9
chat routing        4/5   (target all)      FAIL
chat advice flag    4/5   (target all)      FAIL
```

**89 verification suites** in total, run from the terminal, no database and
mostly no network.

Three things about these numbers are worth more than the numbers.

**They are measured on what a reader sees, not on what a component returns.** The
deadline result used to compare the engine's return value; the engine had no
production caller, so 9/9 meant a correct date sitting in an object nobody asked
for. It now reads the date out of the rendered prose — which immediately found a
real bug the old measure could not see, because the engine was right and the
sentence built from it named a different day. Reintroducing that bug takes the
score from 9/9 to 5/9.

**Three red lines are left standing on purpose**, each with its reason recorded
in `ACCURACY_ENGINE.md`. They are not passed by adjusting the target.

**Two eval lines were found to be lying and were fixed.** `out-of-scope miss`
counted the classifier's vote, so two stories printed as failures reading "want
out-of-scope, got out-of-scope" when the reader had in fact been sent away
correctly. And `wrong-stage shown` counted the `boundary-unclear` case, where
showing guidance WITH the caveat is the specified design. A red line that is
wrong is worse than no line: it is the one people learn to ignore.

---


### Before and after, by layer

Each number is from a committed eval run. Where a measurement CHANGED as well as
the number, that is noted — because an improved score on a re-defined measure is
not an improvement, and two of these were re-definitions that made a passing line
honest rather than a failing one pass.

| Layer | Before | Now | What changed |
|---|---|---|---|
| Stage accuracy | 94% | **97%** | three notice stages published; the WSIAT scope fix |
| Wrong-stage content shown | 0 | **0** | held |
| Confidence floor | 0.7 | **0.85** | calibrated against measured output, not chosen |
| Deadline accuracy | 9/9 | **9/9** | MEASURE CHANGED: was the engine's return value, now the date read out of the rendered prose |
| Deadline reaching a reader | 0/9 | **5/9** | the engine had no production caller at all |
| Out-of-scope harm | 0 | **0** | held |
| Out-of-scope latent | 1 | **0** | the forum gate; no longer depends on which blocks are published |
| Advice deflection | not measured | **3/3** | was advertised in the header and computed by nothing |
| Chat routing | 4/5 | **5/5** | the composition rule |
| Chat advice flag | 4/5 | **5/5** | procedural intents decided in code |
| Published blocks | 13 | **16** | the three claim-barring notice stages |
| Reviewed by a licensee | 0 | **0** | unchanged, and the largest single item outstanding |

Two lines are worth reading twice. **Deadline accuracy stayed at 9/9 while the
measurement got harder** — and the harder measurement immediately found a bug the
old one could not see. **Advice deflection went from unmeasured to 3/3**, having
been listed as a target in the eval's own header while nothing computed it.


### What the independent review found, and what was done

| Finding | Status |
|---|---|
| A block on the **plaintiff's** stage told the reader to file a **Defence (Form 9A)** | Fixed. Every sentence was true *about a defendant* and every gate passed it. Now: `wrongReaderProblems` in the drafting loop, side-aware sourcing, and section 0 of the spot-check guide |
| `quoteFound` had never once been false — 82 of 82, including 16 citing our own stage map | Fixed. Premise-only verdicts record false; four planted verdicts prove it can fail; mutation-tested |
| Blocks claimed **the rules set out no step** where r. 17.01 (4)-(5) and r. 6.01 (2)-(3) give remedies | Fixed. `assertsAbsenceProblems` refuses any claim that the law is silent |
| The deadline engine had **no production caller** | Fixed. Decision 5; 5/9 cases now reach a reader |
| The eval reported "All targets met" with exit 0 having classified **nothing** when the API key was unset | Fixed. Hard failure |
| `requestsLegalAdvice` declared in the suite and read by nothing | Fixed, then re-fixed: the first measure failed the right behaviour |
| A period of 0 days produced a fabricated date | Fixed. The engine throws |
| Duplicate content id `depth-contractor-loss` | Fixed. It was being ASKED twice |
| 13–15 of 30 stages have content | Open. 16 of 35 now |

Three findings were mine, from reading output the gates had passed: the statement
sentence naming the pre-extension date, the Toronto block chosen for "a city
sidewalk", and the audit log writing to production from every test run.


### Three people, end to end

Generated by running the real pipeline, not written by hand.

```
======================================================================
A PLAINTIFF
======================================================================

THEY TYPE:
  "I did design work for a company in April and invoiced them $8,400. They never paid and stopped answering. I filed a claim and the court issued it on 2 March 2026, but I haven't served it on them yet."

SCOPE:  small-claims @ 0.7
STAGE:  plaintiff:claim-issued-not-served @ 0.9

THEY SEE  [status: verified-draft, release run-9]

  The court gave me back my claim — how do I get it to the defendant?

  ## Where things stand
  The court has issued your claim, but it has not yet been delivered to the defendant. You need to serve the claim to the defendant according to the rules.

  ## What to do next
  You can serve the claim personally or use an alternative method of service as provided in the rules. You must serve the claim within six months after the date it was issued.

  ## Your deadline
  Serve the claim on the defendant. You have 6 months, counted from the date the claim was issued.
  
  Based on the date you gave us, the last day for this is Wednesday 2 September 2026.
  
  How that was counted:
  - Counted 6 months from Monday 2 March 2026, landing on the same day of the month (or the last day of that month, if it is shorter), which gives Wednesday 2 September 2026.
  - The Small Claims rules say how to count days. The Legislation Act supplies the month arithmetic, because Part VI of that Act applies to every Act and regulation.
  
  This date was worked out by counting, not taken from your court file. If the date you gave us is not exactly right, this one will not be either — and the court office can confirm both.

  ## What happens after
  After serving the claim, you may need to file an affidavit of service to confirm that the claim was delivered.

  Sources: Rules of the Small Claims Court, O. Reg. 258/98 r. 8.01 (1); Rules of the Small Claims Court, O. Reg. 258/98 r. 8.01 (2)

======================================================================
A DEFENDANT
======================================================================

THEY TYPE:
  "I was served with a Plaintiff's Claim on 2 March 2026 over a fence between our properties. They want $4,000. I don't agree with it."

SCOPE:  small-claims @ 0.7
STAGE:  defendant:served-defence-period-running @ 0.9

THEY SEE  [status: verified-draft, release run-9]

  I have been sued — what do I have to do, and by when?

  ## Where things stand
  You have been served with a claim. You need to respond by delivering a Defence (Form 9A) within 20 days of being served.

  ## What to do next
  Complete the Defence (Form 9A). Serve a copy on every other party. File the Defence with proof of service at the court office indicated on the claim.

  ## Your deadline
  Serve a defence on every other party and file it with the clerk, with proof of service. You have 20 days, counted from the day of being served with the claim.
  
  Based on the date you gave us, the last day for this is Monday 23 March 2026.
  
  How that was counted:
  - Counted 20 days from Monday 2 March 2026, not counting that day itself and counting the last day, which gives Sunday 22 March 2026.
  - Sunday 22 March 2026 is a Sunday, and a Sunday counts as a holiday for this deadline.
  - The period therefore runs to the next day that is not a holiday: Monday 23 March 2026.
  - Under these rules every Saturday and Sunday is a holiday, along with the named days.
  
  This date was worked out by counting, not taken from your court file. If the date you gave us is not exactly right, this one will not be either — and the court office can confirm both.

  ## What happens after
  If you do not file your Defence within the 20 days, the plaintiff can request to note you in default. This may lead to a judgment against you without further notice.

  Sources: Rules of the Small Claims Court, O. Reg. 258/98 r. 9.01; Rules of the Small Claims Court, O. Reg. 258/98 r. 3.01; Rules of the Small Claims Court, O. Reg. 258/98 r. 11.01 (1); Rules of the Small Claims Court, O. Reg. 258/98 r. 13.01 (1)

======================================================================
SOMEBODY WE CANNOT PLACE
======================================================================

THEY TYPE:
  "I need help with my court case. There's a thing with my neighbour."

SCOPE:  out-of-scope @ 0.3
STAGE:  unknown (low-confidence)

THEY SEE:
  We could not work out where the case stands.
  Candidates considered: before-filing:deciding-whether-to-sue
  Plus the referral resources.
```

The third is the one to look at hardest. A vague message produces UNKNOWN with the
candidate named and the referrals — **not** the earliest stage, and not a guess.
That is the specific failure this rebuild exists to undo: the old code defaulted
to `starting-case` and told eight of ten people to file a defence.

---


## 9. What is NOT true yet

This is the section to read first if you are deciding whether to rely on any of
it.

**Nothing has been reviewed by a licensee. 0 of 440 items.** Some registries
carry `status: "reviewed"`; that records an internal editorial pass by a
developer, and the two are tracked in separate layers so they cannot be confused.

**16 of 37 stages have published content.** A person at one of the other 21 gets
UNKNOWN and referrals. That is the designed behaviour and it is still an absence.

**5 of 9 deadline cases reach a reader through a published block.** The rest have
no block yet, or run from an event we decline to ask about.

**The chat defers more than it should.** A person who asks whether they will win,
two weeks into a twenty-day defence period, gets referrals and not their
deadline. The stage route resolves that case correctly, so the content exists and
the chat declined to show it. The failure direction is safe; the cost is real.

**One latent failure will become a real one when content is added.** On some runs
"I want him charged" comes back as a Small Claims stage at 0.90 confidence.
Nothing is shown only because that stage has no published block — that is luck,
not safety, and publishing content for
`before-filing:deciding-whether-to-sue` turns it into harm with no code change
and no warning. It is the one place where filling a content gap would make the
eval worse, and it is recorded as such.

**The audit log has never been written to.** `ai_call_log` does not exist in any
database; the migration is written and waiting for the site owner. Until it is
applied, no model call in production is recorded.

**The pipeline is not deterministic**, so "this block is verified" is a statement
about the promoted run and not about what a fresh run would produce.

**Model-behaviour limits do not respond to prompting.** Three are recorded with
their evidence: a story whose exact sentence appears in the resolver's own prompt
still fails about half of runs; the chat sets the advice flag whenever it has
nothing to offer, with that exact question given as a worked counter-example.
Where a property could be checked in code it has been; these are the ones where
it could not.

---

## 10. What a licensee needs to do, and how

**The ask:** read each item and say whether it is accurate and appropriate to
show to a self-represented person.

`docs/review-packet.md` is the readable version — 440 items with exact wording,
source, and where each appears. `docs/review-packet.csv` is the one to fill in.

| Type | Count |
|---|---|
| claim-type | 75 |
| depth-question | 73 |
| stage-answer | 57 |
| assistant-block | 32 |
| intake-question | 30 |
| question-explanation | 30 |
| next-step | 27 |
| pathway-description | 22 |
| procedural-stage | 21 |
| deadline-computation | 18 |
| form-guidance | 12 |
| doctrine | 11 |
| presentation-help | 11 |
| education-topic | 9 |
| system-message | 5 |
| remedy | 4 |
| safety-resource | 3 |

**Start with `docs/spot-check-guide.md`**, which is not a list of everything but
of the places an error would do the most damage and be hardest to notice. Its
section 0 is the check automated verification cannot make:

> **Read this as the person at this stage.** Does every instruction apply to you,
> and could you follow it?

That check exists because an independent review found a block on a **plaintiff's**
stage telling the reader to file a **Defence (Form 9A)**. Every sentence was a
true statement about a defendant, every quote was real, and every automated gate
passed it. Sentence-level verification is structurally blind to who the reader
is.

Returning the packet:

```
npm run content:import -- --file docs/review-packet.csv
```

An approval is recorded against the item's current version, derived from a hash
of its own text. Edit the wording afterwards and the approval no longer applies —
that is the difference between "a licensee approved this" and "a licensee
approved something that used to be here".


### What Jason and Krystel should look at first

In this order, and none of it needs a licensee:

1. **The three notice blocks** — `before-filing:notice-municipality`,
   `:notice-toronto`, `:notice-snow-ice-private`. They are the only content where
   an error means there is no claim at all. Check each states the bar, the number
   of days, AND both exceptions.
2. **The two computed dates in section 10's walkthroughs.** Count them on a
   calendar. The first sentence and the last step must name the same day.
3. **The wording of the five system messages** (review packet, type
   `system-message`). They are what somebody reads at the moment they are most
   likely to give up.
4. **The Saturday warning.** It appears on statutory deadlines only. Decide whether
   the wording is clear enough for somebody reading at midnight.
5. **The 19 `needs-human` blocks** are NOT the priority. They show nothing to
   anybody. The published 16 are what a user sees.

### Reproducing everything in this report

```
npm run test:rules-corpus        sources vendored, current, complete
npm run test:stage-map           every quoted provision is in the vendored text
npm run test:deadlines           the day-counting, both regimes, and the wiring
npm run test:verifier            the verifier rejects wrong deadlines, actors, forms
npm run test:stage-answers       re-checks every quote the pipeline relied on
npm run test:published-library   the served set matches the committed one
npm run test:library-chat        the chat can only return ids that exist
npm run test:presentation-help   every checklist item is quoted; no rewriting
npm run test:ai-call-log-sink    no test run writes to the live database
npm run eval:accuracy            the numbers in section 8 (spends model quota)
npm run content:export           regenerates the review packet
```

`docs/content-pipeline/` holds the run logs: for every sentence, the verifier's
verdict and the passage it quoted. Committed rather than written to a database,
so the record of what was checked can be read without access to anything.

---


## 11. Decisions we need from you

Not code. These are yours.

1. **Who reviews the content, and when?** 440 items, 0 reviewed. This is the
   single largest item between here and compliance, and nothing in the product can
   substitute for it. A licensee could start with the 16 published blocks — that is
   the set a user can actually reach today.

2. **Do we turn on `REQUIRE_APPROVED_CONTENT`?** It is one line. With it on, the
   product shows only licensee-approved content, which today is nothing. It is the
   switch that makes "nothing unreviewed is served" true rather than aspirational,
   and it cannot be flipped until (1) has happened.

3. **Apply the two migrations?** `ai_call_log` and the call-type correction,
   staging then production, by REF never by name. Until then no model call in
   production is recorded and the quarterly return has nothing to read. The
   checklist is in `docs/lso-fixes-report.md`.

4. **Rename the Supabase projects.** The names are backwards — the one called
   `-dev` is production. Every instruction anywhere that says "apply it to dev <!-- [dev-wording-quoted] -->
   first" is, read literally, an instruction to apply it to production. The
   step-by-step is written; it needs someone to do it.

5. **What happens to the 21 stages with no content?** Options: draft them through
   the pipeline (about $0.02 per stage per attempt, and roughly half need several),
   author them by hand, or accept UNKNOWN for those positions and say so plainly in
   the product.

6. **Is the chat shown in phase 1?** The new one only selects from verified
   content. The OLD one (`ai-case-partner`) is still mounted in the builder and
   still states unreviewed law from templates and the doctrine library. Replacing
   the mount is a small change; deciding to do it is not mine.

7. **Recognising out-of-scope matters at the classifier level is scheduled for
   the claim-types work.** Criminal, family, tenancy, human rights, employment
   standards, and the rest of the nine forums — recognised where the decision
   belongs, rather than caught downstream by a render gate. With **eval stories
   per forum**, so each one is measured rather than assumed.

   That is the real fix for the failure section 8 records as `gate refused 1`. The
   gate makes a misclassified matter safe; it does not make the classification
   right. "I want him charged" should be recognised as criminal by the component
   whose job that is, and today it is classified civil at 0.8.

   Until then the two render gates hold the line, and the design rule below keeps
   the content at those stages to routing.

8. **The three catch-all before-filing stages may only ever carry FORUM-CHECK
   content.** This is now a recorded design rule and a gate, not a convention:
   which court or tribunal handles this kind of matter, the monetary line that
   decides it, and the questions that would settle it — never a form, a rule or a
   step. `forumCheckOnlyProblems` refuses any block on those stages that names
   one, at promotion and in the drafting loop.

   So if content is written for them, a misclassified matter landing there gets
   ROUTED rather than instructed. The decision left for you is only whether to
   have that content written at all; what it may say is settled.

---


## Where the reasoning lives

This report summarises. `docs/ACCURACY_ENGINE.md` is the working record — what
each module does, which decisions are settled, what is deliberately dormant, and
the specific traps that have cost time. Every failure named in section 9 is
written up there with the evidence that produced it.
