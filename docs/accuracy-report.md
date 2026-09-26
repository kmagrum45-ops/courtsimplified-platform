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

## Where the reasoning lives

This report summarises. `docs/ACCURACY_ENGINE.md` is the working record — what
each module does, which decisions are settled, what is deliberately dormant, and
the specific traps that have cost time. Every failure named in section 9 is
written up there with the evidence that produced it.
