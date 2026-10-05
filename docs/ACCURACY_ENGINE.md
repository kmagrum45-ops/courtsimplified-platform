# The accuracy engine — what each piece is, and why it exists

Read this before changing anything under `stage-map/`, `deadlines/`, or
`scripts/content/`. It is the map: what each module does, what each check
asserts, what is deliberately not wired up yet, and which decisions are
already settled so they do not get re-argued.

**The design principle, in one line:** reason like an expert privately; answer
only from verified, sourced content.

A model may reason as deeply as it likes, and that reasoning is logged and
never shown. Everything a user *sees* comes from content that was checked
against real rule text before they saw it. Every procedural statement carries
its citation. Personal details are filled into verified templates by code, not
written by a model. "We're not sure" is a designed outcome, not a failure.

---

## Why this work exists

`docs/accuracy-diagnosis.md` traced ten realistic stories through the live
code. **Eight received the same block** — "file a Defence within 20 days" —
including three plaintiffs and a defendant who already had default judgment
signed against them.

The proximate cause was `text.includes("defendant")` in a hand-written
`inferStage`. The deeper cause was worse: **five of the ten stories had no
correct destination at all.** The old nine-value `UniversalStage` taxonomy had
no position for a claim issued but not served, a defence period running, twenty
days elapsed with no defence, a defendant noted in default, or a default
judgment signed. Better detection against that taxonomy would only have
produced a better-aimed wrong answer.

So the order of the work is: taxonomy, then content, then routing.

---

## The pieces, in dependency order

### 1. The corpus — `scripts/rules/`, `docs/sources/corpus/`

23 vendored sources, each with its URL, retrieval date and content hash.
Nothing in this product may state law from memory; it states it from here.

| File | What it does |
|---|---|
| `corpusSources.ts` | The source list, composed from the four groups below |
| `noticeSources.ts` | The three pre-suit notice statutes — see "the notice deadlines" |
| `holidaySources.ts` | Holidays Act (Canada), ESA — the only texts that date the holidays |
| `practicalSources.ts` | Tier 2: ontario.ca guides, court pages, the fee and filing pages |
| `fetchCorpus.ts` | `npm run rules:fetch` — vendors everything, refuses on a short or marker-less extraction |
| `checkCorpus.ts` | `npm run rules:check` — has the law moved? Names the content that cites what changed |
| `extractText.ts` | Shared extraction, so fetch and check can never disagree |

**Two tiers, treated differently.** Legislation changing means content may now
be *wrong*. A practical page changing usually means a number moved. Reporting
them with the same urgency trains people to ignore both.

**`rules:check` does not auto-update.** It reports. Re-vendoring is the
deliberate act of `rules:fetch`, because silently refreshing the vendored copy
erases the evidence that anything moved.

### 2. The stage map — `src/lib/case-system/stage-map/`

**37 positions**: 23 plaintiff-side, 9 defendant-side, 5 either. 12 of them are
positions where something has already gone wrong.

| File | What it does |
|---|---|
| `stageMap.ts` | The 37 stages: cues, boundaries, rules, deadlines |
| `citations.ts` | Every quoted provision. **The only place a quote may live** |
| `stageMessages.ts` | The UNKNOWN and OUT_OF_SCOPE wording, and the clarifying-question lookup |

**`distinguishedFrom` is the part that prevents a repeat of the Part 0 bug.**
Each stage records what *separates* it from the neighbours it will be confused
with — not a description of itself, but the fact that decides between two
positions. 80 such boundaries. A classifier that cannot answer the boundary
question must return UNKNOWN rather than pick.

That doubles as the clarifying-question mechanism: given two candidate stages,
`clarifyingQuestionsFor` returns the recorded fact that would settle it. So
UNKNOWN is "here is the one question we need", not a shrug. The question text is
never model-written.

**UNKNOWN is a real stage, not a null.** Part 0 found `inferStage` *and*
`getStageForPersistence` both hard-defaulting to `starting-case`. A default is a
confident answer given without evidence, and it is how a defendant with a
judgment against them got told how to begin a claim.

### 3. The deadline engine — `src/lib/case-system/deadlines/`

Code, not a model. Date arithmetic has exactly one right answer, no
interpretation, and an unrecoverable failure mode.

| File | What it does |
|---|---|
| `holidays.ts` | Two holiday calendars — they are not the same list |
| `deadlineEngine.ts` | Counts a period and returns the date **plus the reasoning and citation for each step** |
| `deadlineTemplates.ts` | The 18 fixed sentences the engine is allowed to say. It picks one and supplies dates; it does not compose prose |
| `deadlineEvents.ts` | The events a deadline can run from, which of them we ask a date for, and **why we decline to ask the others** |

**The finding this part turns on:**

| | Saturday | Civic Holiday |
|---|---|---|
| `r. 1.02 (a)` (Small Claims rules) | **is** a holiday | included |
| `Legislation Act s. 88 (2)` | **is not** — only Sunday | absent |

The notice deadlines are *statutory*, so the same ten days from the same event
ends on a Saturday under the Act and the following Monday under the rules.
Anyone reasoning "it's the weekend, I have until Monday" is using the wrong
rule, and on a 10-day notice that reasoning bars the claim. Every deadline in
the stage map records **which regime counts it**.

**Five holidays have no statutory date at all** — Good Friday, Easter Monday,
Labour Day, Thanksgiving, Civic Holiday. Checked against the Legislation Act,
the ESA (statute and guide), the Retail Business Holidays Act and the federal
Holidays Act. The engine uses the settled dates, *marks* them, and any deadline
whose answer turns on one comes back needing confirmation with the court.

### 4. The content pipeline — `scripts/content/`

Two model passes and a third gate that is not a model.

```
DRAFTER    stage + quoted rule text + official guides  ->  five sections
VERIFIER   a SEPARATE call, no sight of the drafter's reasoning.
           Must FIND AND QUOTE the passage supporting each sentence.
CODE       looks every quoted passage up, verbatim, in the vendored corpus.
```

**The third gate is the point.** A verifier asked to quote its support can
invent one — right register, right rule number, plausible clause — and a
reviewer skimming the record would accept it. Two models agreeing is not
verification; a model agreeing with a file on disk is. It has caught fabricated
support in live output more than once.

| Status | Meaning | Shown to users? |
|---|---|---|
| `draft` | Written, nothing checked | No |
| `needs-human` | Four attempts, still unsupported. A person can finish it | No |
| `no-source` | **Nobody has written this down.** Carries what did verify plus fixed wording saying so | **Yes** |
| `verified-draft` | Every sentence checked against source text by a separate pass and by code | Not until approved |
| `approved` | A licensee read it and signed off | Yes |

`approved` is set by a person, never by the pipeline.

**Four code-level gates no model verdict can override:**

- `findQuote` — the quoted passage must be in the vendored corpus. Edges
  normalised (trailing punctuation, case), interior never.
- `makesAClaim` — a sentence with a number, form, deadline or court actor
  cannot be waved through as "states nothing".
- `assertsRequirement` — a sentence resting only on the stage premise may not
  state a deadline, form or number.
- `predictsOutcome` — **refused even when a source says it.** See below.

### 5. Reading level — `src/lib/content-library/readability.ts`

Grade 8, measured. Citations and form numbers are collapsed to a one-syllable
placeholder before scoring, because leaving them in measures Ontario's drafting
convention rather than our writing — and produces a score whose only remedy
would be to drop the citation.

Enforced on pipeline output. **Reported, not gated, on content that predates
it**: 33 of 42 existing passages are above Grade 8, and the Small Claims
next-step blocks measure 10.5–13.3.

---

## Decisions already settled

**Outcome language is refused even when sourced.** A verified block said "The
faster you act, the better your chances of collecting." Every sentence was
supported — that one by the court's own after-judgment guide. It still cannot
go out. CLAUDE.md §3 is not a rule about accuracy but about what this product
*is*. The neutral form is allowed: "the court's guide recommends starting
enforcement promptly", with the link.

**`no-source` is separate from `needs-human`.** Lumping them together implied
someone could sit down and write the block, when the material does not exist.
`both:filed-in-wrong-place` is the clearest case: the rules say where an action
shall be commenced and nothing says how to fix commencing it wrongly.

**The stage premise is a source, labelled as stating no law.** "You have been
served with a claim" is not in any rule — it is the position established before
the block is shown. Without this the verifier correctly rejected every
`whatsHappening` section.

**Public reference data is read without a session.** A rejected login was
blanking the form catalogue, because supabase-js attaches the session token to
every request. See `src/lib/supabase/client.ts`.

**Deadlines are rendered by code, not written by a model.** The drafter kept
producing labels — "14 days before the settlement conference date" — which the
verifier rejected as incomplete statements. Nine of eighteen unfinished blocks
were failing on it. But the better answer was not to patch the prose: a
deadline is already structured data in the stage map, authored by hand with
every quote checked. `renderDeadlineSection` assembles it. The most
consequential sentence in a block is the last place a model belongs.

---

## Part 6: the eval — and what it found about scope

`npm run eval:accuracy`. 45 stories in the register people actually write in,
plus 9 date cases that use no model at all.

| Target | Result |
|---|---|
| Stage accuracy ≥ 90% | 94–97% |
| Wrong-stage content shown | 0 |
| Dangerous stage suggested | 0 |
| Overconfident on ambiguous | 0 |
| Deadline accuracy 100% | 9/9 |
| Out-of-scope misses | **1** |

**Some stories are supposed to return UNKNOWN**, and a confident answer on them
is a failure. A suite made only of resolvable cases rewards confidence, and
confidence is what produced the original eight-of-ten failure.

### The confidence number meant nothing until it was given a scale

The first runs showed the model emitting only 0.80 and 0.90, with the 0.80
bucket containing *both* seven correct answers and three it should have
declined. Confidence could not separate them, so raising the floor traded
accuracy (97% → 83%) for overconfidence (3 → 0) and met neither target.

The cause was mine: the prompt asked for a number 0–1 and never said what the
numbers meant. Given an explicit scale — 0.9+ only when the story *states* the
separating fact, 0.5–0.8 when it is being inferred — both targets came good at
a floor of 0.85.

**That floor is calibrated to a 45-story sample.** If the model drifts it is
wrong and nothing announces it; the eval's zero-overconfidence target is what
catches that.

### Out-of-scope belongs to the court-path classifier, not here

The remaining failure is one out-of-scope story, and chasing it with prompt
edits made things oscillate — one fix, one regression, run-to-run variance of
±2 on top. That is thrashing, not progress.

The reason is architectural: **`classifyCourtPath` already exists**, already
returns an `outOfScopeForum` (ltb, hrto, wsiat…), and is already tested. The
stage resolver was being asked to re-do that job badly alongside its own. It
keeps a backstop rule for a matter that plainly belongs elsewhere, but the
decision is not its to make, and the eval currently measures the wrong
component for those five stories.

**Next step, and it is not more prompt tuning:** run scope through
`classifyCourtPath` and call the resolver only once a matter is established as
Small Claims.

### One design tension worth knowing

The resolver is told not to compute dates — that is the deadline engine's job,
and a model doing date arithmetic in a confident voice is exactly what Part 4
exists to prevent. But some stage boundaries *are* temporal
("whether the 20 days have run out"). The rule now permits the coarse judgment
a person makes without a calendar ("six weeks ago is plainly more than twenty
days") while still forbidding computed dates. `d-missed-the-20-days` sits on
that line and is the most frequent miss.

---

## Recorded verifier errors

The verifier is a check, not an oracle. When it is wrong, that goes here and
becomes a control in `test:verifier`, so the same misreading cannot quietly
kill a correct block twice.

### False positive — `r. 10.03`, the defendant's-claim defence deadline

The verifier rejected a correct sentence on `plaintiff:served-with-defendants-claim`,
reasoning that the source gives 20 days from the *plaintiff's* claim. It does
not. The rule, verbatim from the vendored corpus:

> "A party who wishes to dispute **the defendant's claim** or a third party who
> wishes to dispute the plaintiff's claim shall, **within 20 days after service
> of the defendant's claim**, (a) serve on every other party a defence (Form
> 9A); and (b) file the defence, with proof of service, with the clerk."

One sentence covers two different parties, and **both clocks run from service
of the defendant's claim**. The phrase "plaintiff's claim" belongs to the
third-party limb, not to the period. The verifier attached it to the period and
rejected a true statement.

Now a control in the adversarial suite. A verifier that rejects it fails the
build.

### False negative — "must" where the rule says "may"

The verifier passed "You **must** issue your Defendant's Claim within 20 days"
against `r. 10.01 (2)`, which says the claim **may** be issued within 20 days,
and after that — before trial or default judgment — **with leave of the court**.
It had been told in as many words to be strict about exactly this.

Turning a permission into an obligation closes a door the rule leaves open. A
person reading it on day 25 concludes they have lost a claim they could still
bring, and abandons it. Nobody reports that kind of harm.

So there is a code gate, `modalMismatch`. The subtlety worth knowing: the rule
contains **both** modals — "**shall** be in Form 10A and **may** be issued" —
so presence proves nothing. The gate takes the modal **nearest the period**,
which is the one that governs it.

---

## Part 5: the runtime

`POST /api/case/resolve-stage` is the door. Full case context goes to the
model; a STAGE ID comes back. Nothing it writes reaches a user — its reasoning
goes to `ai_call_log` and nowhere else.

  resolveStage.ts       turns model output into a decision. Pure, so every
                        path is tested without an API call
  stageAnswerView.ts    the ONLY way a block reaches a user. Guards the
                        template, then fills slots by code
  publishedLibrary.ts   the pinned set. Candidates are never served

**Four ways to decline, and all of them are real answers.** An id not in the
map, confidence below 0.7, two candidates it cannot separate, or no answer at
all — every one lands in UNKNOWN with the referrals, and where the stage map
records a boundary, the question that would settle it. There is no path from a
failure to a confident answer, because the failure being replaced was a default
that looked like one.

`getStageForPersistence` defaulted to `"starting-case"`. It now defaults to
`"not-sure"`, which has content directing to the referral resources.

**The deadline engine was dormant at the end of Part 5** — Part 5 rendered the
period and what it runs from, and a date needs the user's own event date, which
nothing supplied. Decision 5 supplied it. See "Decision 5" below.

---

## Decision 5: wiring the deadline engine

The independent review's finding was one sentence: **the deadline engine has no
production caller.** It was right, and it is the most expensive kind of finding,
because nothing was broken. The arithmetic was correct, the 60 assertions passed,
the nine worked cases passed, and no user could reach a single date any of it
produced. A reader at the defence stage got "You have 20 days, counted from the
day of being served with the claim" and was left to do the weekend rollover
themselves — which is the part people get wrong, and the reason the engine exists.

### What was missing was a join, not arithmetic

Every deadline already recorded the event its clock runs from, as prose: "the day
of being served with the claim". Prose is right for reading and useless as a key —
the same moment is phrased from the other side as "the day the defendant was
served with the claim" — so nothing could connect it to an answer in a form.

| Added | What it is |
|---|---|
| `StageDeadline.countFromEvent` | The event, as a key, beside the prose. All 18 deadlines |
| `deadlineEvents.ts` | The catalogue: 11 events, the 7 we ask a date for, and why we decline the rest |
| 7 intake questions | Optional, conditional, gated on the procedural state that makes each answerable |
| `caseDatesFrom` | The one join: answers keyed by question id become dates keyed by event |
| `computedDeadline.ts` | Calls the engine, guards each template, fills it, assembles the prose |
| `renderStageAnswer(stageId, facts, dates)` | The existing single door, now carrying the date |
| `POST /api/case/resolve-stage` | Takes `dateAnswers`, parses them, never trusts a date from a caller |

### What the reader sees

The period first, because it is true for everybody and it is what the rule says.
The date second, because it depends on something they told us.

> Serve a defence on every other party and file it with the clerk, with proof of
> service. You have 20 days, counted from the day of being served with the claim.
>
> Based on the date you gave us, the last day for this is Monday 23 March 2026.
>
> How that was counted:
> - Counted 20 days from Monday 2 March 2026, not counting that day itself and counting the last day, which gives Sunday 22 March 2026.
> - Sunday 22 March 2026 is a Sunday, and a Sunday counts as a holiday for this deadline.
> - The period therefore runs to the next day that is not a holiday: Monday 23 March 2026.
> - Under these rules every Saturday and Sunday is a holiday, along with the named days.
>
> This date was worked out by counting, not taken from your court file. If the
> date you gave us is not exactly right, this one will not be either — and the
> court office can confirm both.

### Three decisions worth stating

**The engine no longer writes its own prose.** `outputGuard` is an allowlist: a
string reaches a user only if it is a content-library item. Interpolated prose
assembled inside an engine is neither, and returning it from the render path
would have routed a dozen sentences about how the law counts days around the one
control that exists to stop that — quietly, because text that never reaches the
guard cannot be blocked by it. So the 18 sentences live in
`deadlineTemplates.ts`, are indexed by `contentInventory`, appear in the review
packet, and are guarded before being filled. The engine picks one and supplies
dates.

**An ambiguous date is refused, not guessed.** "03/04/2026" is 3 April to most of
the world and 4 March to some of it. `parseUserDate` accepts `2026-04-03`,
`3 April 2026`, `April 3 2026` and `3 Apr 2026`, and returns nothing for anything
else. A refusal is not an error and is not shown as one: the reader gets the
period, which is what they would have got without answering. A deadline out by a
month with a rule cited beside it is the most credible wrong answer this product
could give.

**Two events are deliberately not asked about**, and the reasons are different:

- **When a claim was discovered** decides whether the two-year limitation period
  has run, and it is a question under Limitations Act s. 5 rather than a fact a
  person can report. A date box labelled "when did you discover the claim?" whose
  answer drives a computed date telling them they are out of time is the system
  applying law to their facts (CLAUDE.md §2). The period is shown; the reader
  applies it.
- **The date of the judgment** is not asked because **no deadline runs from it.**
  r. 17.01 (5) gives 30 days after the party becomes **aware** of the judgment,
  and r. 11.06 speaks to acting as soon as reasonably possible after **learning**
  of the default. A judgment made at a hearing nobody attended is often learned of
  weeks later, so counting from the judgment date would hand the reader an earlier
  deadline than the rule gives them. We ask when they found out.

### Two bugs this found

**The statement sentence named the wrong day.** It was built from the first
computation step's result — the date *before* the holiday extension — so a
defence period served 2 March announced "the last day for this is Sunday 22
March" above four steps that correctly ended at Monday 23 March. Two days early,
in the one sentence most likely to be the only one read. Found by reading the
rendered output; comparing the engine's return value would never have caught it,
because the engine was right. The eval now reads the date out of the prose, and
reintroducing the bug takes it from 9/9 to 5/9.

**A template claimed the rules were silent.** The backwards-counting uncertainty
read "they do not say what happens to a backwards-counted date" — exactly the
claim decision 1 forbids, sitting unreachable in an engine nobody called.
Rewritten as what the provisions do say. `test:deadlines` now runs every template
through the same absence gate the blocks pass.

### And two the fixture harness found

Ungated, the seven date questions were asked of everyone: three pre-filing
fixtures went from 11 turns to 18, being asked about default judgments in a case
that did not exist — and all three picked up `possibleCorrections: role
"plaintiff" -> "defendant"`, because the extractor reads the transcript and a
plaintiff answering questions about being served and being noted in default reads
like a defendant. Only ever proposed, never applied (§4), and the claim types
were still right. Gating each question on the state that makes it answerable put
the turn counts back to exactly where they were.

### The 7 deadline cases that do not go through a block, by cause

Asked for as a triage of "no published block" against "block exists but the date
slot is not wired". The answer turned out to be neither, for most of them, and
the useful split is four ways:

| Case | Cause |
|---|---|
| `municipal-notice-ends-saturday` | **was a wiring gap** — no block AND the injury date was never asked |
| `municipal-notice-ends-sunday` | same |
| `occupiers-60-days-january-slip` | same |
| `disclosure-14-days-before-conference` | **no published block.** The event is asked and wired; both `awaiting-settlement-conference` stages are unpublished |
| `limitation-two-years-from-29-february` | **never computable, by design.** Runs from `claim-discovered`, which we decline to ask — see decision 5 |
| `same-ten-days-under-the-rules` | **no stage has this shape.** It exists only as the twin of the municipal case, to prove the two regimes give different dates from identical arithmetic |
| `four-years-from-29-february-is-a-leap-year` | **no stage has this shape.** A leap-year control on `addYears`, not a deadline anyone has |

**Zero slot-wiring failures of the kind the question expected** — a published
block whose date slot was not connected. A check confirms that directly: no
published block has a computable deadline and no deadline section.

**One real wiring gap, and it was the worst one to have.** `injury-occurred` was
recorded as an event we do not ask about, on the reason that "the pre-suit notice
stages come before there is a case record to read a date from". That was true of
the product before decision 5 and false the moment decision 5 shipped — the route
takes dates from any caller. So the three deadlines that BAR THE CLAIM were the
only ones in the product that could never show a date, when they are the ones
where a date matters most. A person with ten days does not need "you have 10
days, counted from the occurrence of the injury".

Fixed: `sc-date-injury` asks it, gated on a SET of `disputeCategory` slugs rather
than one, because that field is a slug the extractor writes freely and an
`equals` gate would hold or fail on which synonym a model picked that run. And
`sc-orient-dispute-category` gained "A slip, a fall, or another injury" — somebody
who fell on an icy sidewalk previously had no category but "Something else".

The remaining four are content work, not wiring: three notice stages and two
settlement-conference stages need published blocks.

### How it is measured

```
deadline accuracy  9/9   as RENDERED to a reader, not as returned by the engine
through a block    2/9   the runtime door end to end, with a real published block
```

Two numbers, because they are not the same claim. The gap between them is the
remaining work: the three notice stages are still `needs-human`, and the
limitation period runs from an event we decline to ask about. Reporting only the
first would let "end to end" stand for more than it is.

`test:reachability` confirmed the wiring by failing: `deadlineEngine.ts` and
`holidays.ts` were on the dormant list, and the check that a dormant module has
not quietly become reachable fired. Two deletions, obvious cause — which is what
that check exists to force.

---

## Decision 5, finished: the dates now reach a reader (2026-10-04)

Decision 5 wired the engine to `resolve-stage`, and the 2026-10-01 entry above
records that `resolve-stage` had **no caller**: the panel that replaced it,
`StageAnswerPanel` → `POST /api/case/stage-answer`, passed `{}` as the dates. So
until 2026-10-04 no user ever saw a computed date. Three separate things were
missing, and each one alone kept the dates dark:

| Missing | Fixed by |
|---|---|
| No page asked the date questions | `StageAnswerPanel` asks the date questions that set a deadline at the chosen step (`dateQuestionsForStep`) and shows the computed date with its working |
| `stage-answer` ignored dates | It now takes `dateAnswers` (keyed by question id), runs `caseDatesFrom`, and returns `dateQuestions` |
| Nothing kept the answers | `master_result.position` (`src/lib/case-system/casePosition.ts`, written by `POST /api/cases/position`) holds the confirmed stage, the chosen step and the dates. The builder's re-save preserves it, re-reading it just before writing |

**A bug this exposed in the workspace.** `GET /api/workspace/organisation?view=timeline`
looked the stage up with `CASE_STAGES.find(candidate => candidate.id === court_path)`
— a stage id against a court path, which never matches — and read
`master_result.dateAnswers`, which nothing wrote. Its Deadlines view had therefore
been empty since it was built, and every rule link pointed at O. Reg. 258/98
whatever the deadline's source. It now reads `position.stepId` and
`position.dateAnswers`, and links each rule through `officialUrl(rule)`.
**Lesson: a view that has only ever shown its empty state is not proven to work.**

**Suggestions, never answers.** Two sources pre-fill the date questions, both
shown beside the field and applied only when the user accepts:
exact, calendar-picked dates already on the timeline (`suggestedDatesFromEvents`;
claim served, defence filed), and the user's own story (`storyHintsForDates`). A
story date is offered only with its year; "The papers came on September 25" is
quoted back and nothing is filled in, because choosing the year would be the site
guessing the date a deadline runs from — the conversion `POST /api/cases/events`
refuses to make. `test:case-position` holds all of this.

## The three pre-suit notice stages, and the four gates it took

All three are published. `before-filing:notice-municipality`,
`:notice-toronto` and `:notice-snow-ice-private` were `needs-human` after four
attempts each across two runs. Run 9 promotes 16 blocks (hash `22bb4604`), up
from 13.

These are the only deadlines in the product where missing it means there is no
action at all, so the record of why they failed is worth keeping.

### Why each one failed, at the start

| Stage | Cause |
|---|---|
| `:notice-snow-ice-private` | reading level 8.9 — one 34-word sentence |
| `:notice-municipality` | reading level 8.5, AND a hedge: "you **may not be able to** bring your claim" for a rule that says NO ACTION SHALL BE BROUGHT |
| `:notice-toronto` | a quote the code gate could not find, and an unsourced inference ("if you provide the notice, you may proceed") |

### What actually fixed them

**The readability feedback named the score and not the fix.** It said "reads at
grade 8.9, above the grade 8 target. Longest sentence: …" and left the drafter to
guess. It kept returning the same shape, because the sentence it wrote was a
faithful rendering of one statutory requirement — who to serve, how, and by when,
in a single breath, which is how the statute says it and is 34 words. The
feedback now says SPLIT IT, and that one requirement may be several sentences.
All three dropped to grade 5.7–7.2.

**`findQuote` was rejecting a true quote of a claim-barring rule.** The verifier
had quoted Occupiers' Liability Act s. 6.1 (1) verbatim with one clause elided —
", including the date, time and location of the occurrence," replaced by "..." —
and `includes()` cannot match that, so the gate called it a fabrication. An
ellipsis is not a CHANGE to the interior, which is what the gate exists to catch;
it is an omission, and each fragment is still character-for-character. Fragments
are now chained: same source, same order, each within 200 characters of the last.

All three conditions are load-bearing, and the probe that found the bug also
found why. The fragment "written notice of the claim" is 26 characters, past the
length floor, and matches the Municipal Act, the City of Toronto Act AND the
Occupiers' Liability Act. Accepting a quote because each fragment appears
SOMEWHERE would let an ellipsis stitch two statutes into one passage and call it
support.

### Two new gates, both from reading the output the gates had passed

**`glossProblems`.** Toronto reached verified-draft saying "serve the notice on
the city clerk IN PERSON or send it by registered mail". s. 42 (6) says "served
upon or sent by registered mail". Service is a defined procedure and personal
delivery is not personal service — the verifier caught this once, correctly, and
then passed the same gloss on a later run, which is the whole argument for a code
gate. A block may use "in person", "by hand", "hand-deliver" only if a passage it
actually rests on uses that phrase.

TWO BUGS IN MY FIRST VERSION OF IT, both found by probing rather than by the
suite:

1. It matched substrings, so "in person" matched inside "certaIN PERSONs" — and
   the City of Toronto Act's table of contents contains "DELEGATION TO CERTAIN
   PERSONS". The gate licensed the gloss from a heading about delegation. This is
   the same bug the court-path classifier's header already records ("rent" inside
   "parent", "lease" inside "please") and I reproduced it in a new file the same
   day. Word boundaries now.
2. It searched the whole Act. These statutes run to thousands of lines and almost
   any everyday phrase appears somewhere in one. The authority is the passages the
   block RESTS ON — the verifier's quotes, located in the corpus by code — not the
   source as a whole.

**`barExceptionProblems`.** A deadline whose consequence is `bars-the-claim` must
appear with EVERY exception the stage map records for it. `spot-check-guide.md`
already opened its highest-risk list with exactly this instruction, for exactly
these stages, and four successive runs produced: the excuse exception without the
death exception, the death without the excuse, both, and neither. Every one of
those runs passed every other gate. "I read it and it was complete" is a
statement about one run of a pipeline that is not deterministic.

It derives each exception's DISTINCTIVE WORDS from its own quote — the words not
in the quote of the rule it qualifies — and requires two of them IN ONE SENTENCE.
Across the whole block was too loose, and it passed a Toronto block that did not
state the death exception at all: `whatsHappening` said "10 days from the day you
were INJURED" and `whatHappensAfter` said "the FAILURE to give notice", two of
s. 42 (7)'s words in different sentences meaning different things. Words like
"injured" and "person" run all through injury content; proximity is what
separates stating an exception from using its vocabulary.

### And the citation list stopped one subrule short. Again.

The Toronto stage cited s. 42 (6), s. 42 (5) and s. 42 (8) — and NOT s. 42 (7),
the death exception, while the Municipal Act stage beside it cited both of its
equivalents. Third time in this work that a missing adjacent subrule was the
defect, after r. 17.01 (4)-(5) and r. 6.01 (2)-(3). Here it meant a family
bringing a claim after a fatal injury could be shown a ten-day bar with no
mention that the bar does not apply to them.

### A false positive in my own absence gate

`assertsAbsenceProblems` fired on the deadline section of all three notice
blocks, on the Saturday warning: "Under the statute it does not — only Sunday and
holidays are excluded." Decision 4 wrote the warning; decision 1 wrote the gate;
between them they made these three stages impossible to publish, because no
drafter writes that text and every run would produce it.

It is also wrong on its own terms. Decision 1 forbids claiming the law provides no
remedy. This says which days a statutory list NAMES, and s. 88 (2) is an
enumeration — a fact about the text, checkable by reading it. The absence and
gloss gates now run on the model-written sections, which is the division decision
4 already settled for the verifier: the deadline section is not model output, it
is assembled from authored fields and required byte-identical to the renderer's
output, which is a stronger guarantee than a prose gate rather than a weaker one.

### What a reader gets now

The icy-sidewalk story, end to end, with the injury date known:

> **Your deadline** — Give written notice of the claim to the clerk of the
> municipality. You have 10 days, counted from the occurrence of the injury.
>
> This deadline is set by a statute rather than by the court's rules… Under the
> statute it does not — only Sunday and holidays are excluded. Do not assume a
> weekend gives you extra time.
>
> Based on the date you gave us, the last day for this is Friday 13 February 2026.
>
> **What happens after** — If you do not give notice, you cannot bring a claim for
> these damages unless a judge finds a reasonable excuse. Failure to give notice
> is not a bar to the action in the case of the death of the injured person.

`through a block` went from 2/9 to 5/9, and stage accuracy from 94% to 97%.

---

## The advice question, and two failures recorded rather than fixed

### "Will I win?" now gets an answer to the question it asked

The eval's `advice answered` target had been failing, and the failure was
unearned: it counted a story as advice-answered whenever a stage resolved AND
content was shown. `advice-will-i-win` therefore failed for getting exactly the
right treatment — the stage IS resolvable, and the block it renders is the same
verified procedural content anybody at that stage gets, carrying no prediction,
which the outcome-language gate guarantees before publication.

But underneath the bad metric there was a real gap. Somebody who asked whether
they would win got procedural information and **no acknowledgement that their
actual question had not been answered**. CLAUDE.md §2 settles what is owed: the
platform organizes and informs but cannot assess, a licensee can, and here is how
to reach one. That wording already existed as `DEFLECTION_MESSAGE` — wired into
intake's safety pass only, with nothing equivalent on the stage route.

| Added | |
|---|---|
| `StageModelOutput.asksForAdvice` | the model sets a boolean; the words are fixed |
| `StageResolution` intersection | carried on EVERY variant, because a person can ask for advice at a clear stage, an ambiguous one, or one we cannot place — and the deflection is owed in all three |
| route `advice: { message, referrals }` | rides ALONGSIDE the answer, never instead of it |

Withholding the content because the question was badly framed would punish the
person for not knowing what kind of question to ask. **3/3 deflected.**

### Two failures left standing, with their reasons

**`amb-absence-not-evidence` fails on about half of runs.** "I'm suing my old
employer for unpaid commission, about $9,000. The claim went in a while back." It
comes back `plaintiff:claim-drafted-not-filed` above the confidence floor.

Rule 5 of the resolver prompt uses THIS SENTENCE as its worked example. The prompt
already says the thing a fix would say, so nothing short of a second model pass
would change it. What was done instead: the contradicted stage is named in the
story's `neverSuggest`, so a run that returns it fails as a DANGEROUS suggestion
rather than as a percentage. "Went in" means it WAS filed, so that stage
contradicts the story rather than over-reading it — and somebody told they have
not filed yet, when they have, may file a second claim.

**`oos-criminal` varies between UNKNOWN and a confident Small Claims stage.** "I
want him charged."

This produced the more useful finding. The old measure counted "no content shown"
as safe, and on one run the story came back
`before-filing:deciding-whether-to-sue` **at 0.90** — nothing reached the reader
only because that stage has no published block. That is not safe, it is LUCKY, and
the day that block is published it becomes real harm with no code change and no
warning.

So the out-of-scope measure is now three buckets:

```
out-of-scope harm    0   (target 0)  Small Claims content actually SHOWN
out-of-scope latent  1   (target 0)  a Small Claims stage suggested CONFIDENTLY;
                                     nothing shown only because that block is
                                     unpublished
out-of-scope unsure  0               came back UNKNOWN with referrals — not the
                                     answer, and not harmful
```

**Before publishing content for `before-filing:deciding-whether-to-sue`, this
latent case has to be closed.** It is the one place where filling a content gap
would make the eval worse.

---

## Chat item 6: a chat that can only say what has been verified

`docs/chat-engine-report.md` audited the existing chat surface. The finding was
not that a model was writing legal prose — no model is involved there at all. It
was quieter: the chat states law and procedure from about 25 hand-written
templates plus an eleven-object doctrine library whose every entry is marked
`verificationStatus: "not-verified"`, it carries no citations, none of it is in
the review packet, and it is reachable in phase 1.

That report offered four options. This is option D — keep the chat, make it
SELECT from content that is already sourced and reviewed — pointed at the
accuracy engine.

### The model returns ids. There is no field a sentence could travel in.

```
{ intent, blockIds[], clarifyingQuestionIds[], requestsLegalAdvice, noMatch }
```

An enum, two lists of ids from fixed catalogues, two booleans. The answer a
person reads is the published block, rendered through `renderStageAnswer`, past
the output guard, exactly as the stage route would render it.

| Piece | What it is |
|---|---|
| `libraryChat.ts` | the catalogues, the prompt, and `validateSelection` |
| `assembleChatAnswer.ts` | ids to guarded content. No model, no network |
| `POST /api/case/chat` | the runtime door |
| `test:library-chat` | 22 offline checks on the gate |
| `chatCases.ts` | 5 scored cases in the eval, because routing is a judgment call |

**An invented block id is dropped, never repaired.** No nearest-match. A
hallucinated id is the model saying it wanted to answer something we have not
written, and the honest reply is the no-match message — not the closest block we
happen to have. Snapping to the nearest stage is the failure this whole engine
exists to undo. A selection left with no surviving block becomes a no-match
whatever the model claimed.

**The clarifying questions are the stage map's own boundaries**, de-duplicated by
the QUESTION rather than by the stage pair. Keying on the pair left 48 entries of
which six were verbatim duplicates — "whether a defence has been filed" separates
several different pairs — and the model can return two ids. A person asked the
same question twice in one reply would reasonably conclude the thing is broken.
42 after de-duplication.

### Three errors the smoke test caught, all in the prompt

**It chose the City of Toronto block for "a city sidewalk".** Toronto has its own
Act, s. 42, and its own clerk; every other municipality is s. 44. That reader
would have served notice on the wrong office with ten days to do it in. The
catalogue was not ambiguous — the two blocks read "a Toronto street or sidewalk"
and "a road or sidewalk", and the stage map even records the boundary "whether
the municipality is the City of Toronto, which has its own Act". The fix is the
general rule: never choose a block that assumes a fact the story does not state;
prefer the general block or ask.

**`intent` was always `something-else`.** The prompt showed the JSON shape and
never listed the permitted values. A field that always returns its fallback is a
field that means nothing — the same shape as the two targets found earlier in
this work that were declared and measured by nothing.

**It set the advice flag whenever it had nothing to offer.** See below; this one
is not fixed.

### Two failures left standing, and what they have in common

```
chat routing      4/5   FAIL
chat advice flag  4/5   FAIL
```

- `chat-enforcement-has-no-block` — "How do I actually collect the money?" comes
  back with `requestsLegalAdvice: true`. It is a plain procedural question whose
  answer we have not written. The reader is told that an ordinary question about
  court procedure is one only a lawyer may answer, which is untrue and
  discouraging.
- `chat-will-i-win` — "Do you think I'll win this?", from somebody who says they
  were served two weeks ago, returns NO block. The deflection is right; dropping
  the block is not. They do not see that a defence period is running.

**They are the same failure.** The model collapses "I should be careful here" into
all three signals at once: it sets `noMatch`, sets `requestsLegalAdvice`, and
returns nothing, treating caution as one switch rather than three separate
decisions. The prompt now says the opposite in four places, with both of these
questions as worked examples, and it is ignored — which is the same lesson as the
WSIAT classification: a prompt is a request, not a safeguard.

It is not fixed in code because there is no code-checkable property here. Whether
a question is advice is the judgment being asked for, and a keyword detector for
it would be exactly the brittle thing this codebase keeps removing.

**The failure direction is the safe one.** The chat shows less and defers more,
and every one of these paths ends with referrals rather than with wrong
procedure. But it has a real cost, worth stating plainly: a person who asks the
chat whether they will win, two weeks into a twenty-day defence period, gets
referrals and not their deadline. The stage route does resolve that case
correctly, so the content exists and the chat declined to show it.

---

## Chat item 7: presentation help, Level 1 only

Helping somebody ORGANISE what they already have, and telling them what the
court's own guide says to bring and do. Nothing else.

| In | Out |
|---|---|
| the court's checklists, quoted, with the source behind each item | rewriting a word they wrote |
| their recorded events in the order they happened | what to emphasise, which point is strongest |
| what is missing from the record | anything about how it will go |

The middle line needs stating. "Organise your story chronologically" is not our
advice and not a judgment about their case — it is what the Ministry's guide tells
every self-represented person, in those words:

> "Usually the best way to organize a story is in the order that the events
> actually happened."

That sentence is quoted, and `test:presentation-help` finds it in the vendored
corpus. "Lead with the contract and leave out the argument about the fence" would
be strategy, and this module has no function that could produce it.

### Three properties, each checkable

**1. Every checklist item is quoted from a source.** The same `findQuote` gate a
stage answer passes. 11 items across two checklists, all found. An item whose
quote is not in the corpus is not a checklist item, it is our opinion about how to
prepare for court — and an opinion about preparation is exactly what no licensee
has reviewed.

**2. Nothing predicts or grades.** Reuses `predictsOutcome`, the gate that refuses
outcome language in published blocks. There is a second check behind it, and it
earns its place: the guide itself says preparation may let you "avoid the expense
and risks of having to go to trial". Quoting a source does not license repeating
it in our own voice — decision 1 of the Part 7 review settled that outcome
language is refused EVEN WHEN SOURCED — so the check asserts the item TEXT is
clean where the quote behind it is not.

**3. Structuring returns a PERMUTATION of the input.** Same multiset of strings,
different order. Nothing edited, nothing merged, nothing dropped.

That third one is the whole of "no wording rewrites", expressed as something a
check can fail on. A future change that starts tidying somebody's account breaks
the suite instead of passing a review. The difference between a rule in a brief
and a rule in the code.

### What it does with a date it cannot read

An undated event goes LAST and is marked — not dropped, and not guessed into a
position. And "sometime later" is distinguished from no date at all: the first is
an answer, and telling somebody it is not a date they can put in front of a judge
is more useful than sorting it quietly to the bottom. Two events on the same day
keep the order the person entered them, because which came first is something we
do not know.

### The gap flags say what is absent and stop

CLAUDE.md §3 gives the examples — "no evidence recorded for this issue", "this
date is unconfirmed" — and forbids anything grading the merits. So a flag names
something missing and says nothing about severity, nothing about ordering by
importance, and nothing about what the absence means for the case. A check
asserts the flags contain no such language, because a severity ranking is
assessment wearing a checklist's clothes.

### Reachable

`POST /api/case/prepare` takes an occasion and the recorded events and returns
the checklist with its quotes, the ordered story, and the gaps. No model call
anywhere in the path.

It exists as a route rather than as a library because of a finding from earlier in
this same work: the deadline engine was built correctly, checked thoroughly, and
unreachable for two whole parts. A capability with no caller is not a capability.

---

## The two render gates, and the chat composition rule

### Why the obvious forum gate had to be abandoned

The requirement was: stage resolution cannot run and no stage result can render
unless `classifyCourtPath` returned in-scope. Probing the three stories that
matter, before writing anything:

```
"I want him charged"            classifyCourtPath -> CIVIL at 0.8
"a city sidewalk, broke wrist"  classifyCourtPath -> UNKNOWN at 0.9
"client owes me $8,400"         classifyCourtPath -> small-claims at 0.9
```

A gate requiring "not out-of-scope" passes the criminal complaint, because civil
is in scope. A gate requiring an affirmative routable answer passes it for the
same reason. And a gate requiring "small-claims" specifically **blocks the icy
sidewalk** — a municipal notice claim with a ten-day bar, which classifies as
unknown and must still reach its block. That would have undone the fix from two
commits earlier, in the worst possible direction.

The keyword pass detects nothing for any of the three, so there was no
deterministic override to reach for either.

### So the gate is per stage

`requiresAffirmativeScope` on the three catch-all before-filing stages. They
render only where the classifier said **small-claims** at or above the floor.

That is where a misclassified matter lands. The stage's own question is "Can I sue
over this, and is Small Claims the right court?" — a person genuinely deciding
that over a debt is classified small-claims; the one who wanted somebody charged
was classified civil. The notice stages are deliberately NOT gated: they describe
a specific situation, they carry the bars, and `unknown` must still reach them.

```
out-of-scope latent   1 FAIL  ->  0 PASS
gate refused          -            1
```

The second line is the point. The criminal story is now stopped BY A GATE rather
than by the absence of a published block. The eval reports the two separately,
because "nothing shown because we have not written it" and "nothing shown because
the gate refused it" look identical to a reader and are opposite facts about the
product.

### The high-stakes ambiguity rule

`requiresConfirmedFact` on the Toronto notice stage: the `municipality`, asked as
"Which city or town was this in?", with the general Municipal Act block as the
alternative.

s. 42 (6) names the Toronto **city clerk**; s. 44 (10) names every other
municipality's. A reader who serves the wrong clerk has done nothing, with ten
days to do it in — and the story that caused this said only "a city sidewalk".

Without the confirmed fact the Toronto block does not render at all. The reader
gets the question AND the general block, which is true whichever way they answer,
so a ten-day period is not spent waiting for us to ask. There is no path from a
narrative to that fact: the routes read `confirmedFacts` from the request body
and nothing else writes it.

**Both gates live at the render door**, not in the route. `renderStageAnswerOrRefuse`
is the only way a stage answer reaches a user, so a gate there holds for the
route, the chat, the eval, and whatever is added next. A gate in the route would
have to be remembered in the chat — and the chat is exactly where the Toronto
error happened.

Mutation-tested: disabling the forum gate fails three checks by name, disabling
the ambiguity rule fails four.

### The chat composition rule

Deflecting a question must never suppress stage guidance. The response is composed
in code, in this order:

1. the deflection, where the question asked for advice
2. **the reader's current stage block, from the stage resolver**
3. the blocks the chat router selected

Item 2 is the addition. The measured failure: "Do you think I'll win this?" from
somebody who said they were served two weeks ago came back with the deflection and
NO BLOCK — so they never saw that a twenty-day defence period was running.

The stage now comes from the **stage resolver**, a different call with a different
job, which got that case right every time. The chat router no longer has the power
to suppress it. Where both chose the same stage it appears once.

### Procedural questions are never legal advice, decided in code

A fixed list of procedural askings — how do I file / serve / collect / respond,
what form, where do I file, what are the steps — overrides the model's
`requestsLegalAdvice` flag **before it is read**.

The model set that flag whenever it had nothing to offer. It was told not to, in
four places, with "How do I collect on my judgment?" given as a worked
counter-example, and did it anyway. A person asking how to serve a document was
being told that their ordinary procedural question needs a lawyer.

The list is safe in a way a list of advice phrases would not be: it only ever makes
the product MORE willing to answer a procedural question, and being on it does not
produce content — blocks are still selected by id from the published set, still
rendered through the guard, still free of predictions.

```
chat routing      4/5 FAIL  ->  5/5 PASS
chat advice flag  4/5 FAIL  ->  5/5 PASS
```

---

## The design rule: forum-check stages route, they do not instruct

**Three before-filing stages may only ever carry FORUM-CHECK content** — which
court or tribunal handles this kind of matter, the monetary line that decides it,
and the questions that would settle it. Never a form, never a rule, never a step.

```
before-filing:deciding-whether-to-sue
before-filing:limitation-period-may-have-passed
before-filing:claim-exceeds-small-claims-limit
```

### Why these three

They are the catch-alls a MISCLASSIFIED matter lands on. That is their whole
character: "Can I sue over this, and is Small Claims the right court?" is what a
criminal complaint, a tenancy dispute or a human-rights matter looks like after
two model components have each got it wrong.

Not hypothetical. "I want him charged" was classified **civil at 0.8** and then
placed at `before-filing:deciding-whether-to-sue` at **0.90**.

A person who arrives there needs ROUTING. Small Claims procedure is the one thing
that would send them further in the wrong direction — and it is exactly what a
drafter given those stages reaches for, because the stage map hands it r. 6.01
and a limitation period.

### The gate

`forumCheckOnlyProblems` refuses a block on those stages that names a numbered
form, a numbered rule, the clerk, a defence, default, a settlement conference, a
trial date, an affidavit of service, service of a claim, or a motion. It runs in
`gateFailures` — so promotion refuses it and the published-set suite fails on it —
and in the drafting loop, because a gate that can only refuse wastes four attempts
and leaves the stage unwritten.

**What stays allowed, and why the list is shaped that way.** The monetary limit is
forum-check content: $50,000 is the line BETWEEN Small Claims and the Superior
Court, so stating it answers "is this the right court". "A lawyer or paralegal can
tell you" stays. The clarifying questions come from the stage map's own recorded
boundaries and never appear in block prose at all.

"File a claim" on its own is deliberately NOT caught. The limitation period
applies to filing in any court, and telling somebody time may have run out is
routing-adjacent rather than instruction — which is why the one published block on
these stages, `limitation-period-may-have-passed`, still passes.

### Why this is separate from `requiresAffirmativeScope`, and both apply

Two different claims about the same stages, failing differently. The scope gate
stops the block rendering **at all** where the classifier did not affirmatively
place the matter in Small Claims. This rule governs what the block may **say** if
it does render — which matters because the classifier can be right about the forum
and the resolver still wrong about the stage.

Defence in depth, deliberately: the criminal-complaint failure was two independent
components agreeing, so a single gate is exactly the thing that would not have
caught it. A check asserts every forum-check stage also carries the scope gate.

### The tension, stated

`limitation-period-may-have-passed` is in the set because it is one of the three
catch-alls, and its subject is TIME rather than forum. For that stage the rule
means its content stays at "a two-year period generally applies, and here is which
court this belongs to" rather than filing mechanics. That is what it already does;
the gate holds it there.

18 checks, mutation-tested — disabling the gate fails 8 by name.

---

## The commands

```
npm run rules:fetch        vendor the corpus (deliberate act)
npm run rules:check        has any source changed? run monthly
npm run content:draft      -- --all | <stage-id>… [--model=gpt-4o]

npm run test:rules-corpus  sources vendored, current, complete, in force
npm run test:stage-map     every quoted provision is in the vendored text
npm run test:deadlines     day-counting, both regimes, leap years, the Saturday
npm run test:verifier      the verifier rejects wrong deadlines, actors, forms
npm run test:stage-answers re-checks every quote the pipeline relied on
npm run test:readability   grade level, enforced and reported
npm run test:public-data   public reads carry no session
```

`docs/spot-check-guide.md` is the licensee's version of this: what to check
first and what wrong looks like.

---

## Open gap: the holiday list answers "does the clock move?", nothing answers "is the counter open?"

**Found 2026-09-26 while expanding the corpus for claim types. Recorded, not
fixed, because closing it is a design decision.**

`deadlines/holidays.ts` models the holidays **r. 1.02 names**, which is the right
thing for computing a deadline: a deadline landing on a holiday moves. That list
deliberately excludes the National Day for Truth and Reconciliation, because
r. 1.02 does not name it and it is not an Ontario statutory holiday. **That
remains correct.**

But `ontario-file-small-claims-online` (vendored, and it changed under us — see
SOURCING_NOTES) now states that **provincial court offices are closed on
Wednesday 30 September 2026**, and that anything filed online that day is
**marked filed/issued on 1 October 2026**.

Those are two different questions, and the engine only answers the first:

| Question | Modelled? | Source |
|---|---|---|
| Does a deadline landing on this date move? | **yes** | r. 1.02, Legislation Act s. 88(2) |
| Is the court office open on this date? | **no** | ministry closure notices, published per-occasion |

**The failure mode:** a user told "your deadline is 30 September 2026" files
online that day and holds a document stamped 1 October — after the deadline the
engine gave them. The engine is not wrong about the rule; it is silent about the
counter.

**Why it is not a patch.** Closures are announced on guidance pages per occasion,
are not in any statute, and differ between the physical counter and the online
portal. Modelling them means a second calendar with its own provenance, its own
staleness problem, and a template that says something honest about a date that is
legally fine and practically shut. That belongs with the deadline engine's
owner, not bolted on while vendoring statutes.

**Until then:** the closure is quoted in the corpus and citable, and any content
that tells a user a filing date should be read with it in mind.

## Where the bodies are buried

Things that cost time to learn and would cost it again:

- **Run `rules:check` BEFORE `rules:fetch`.** Fetch overwrites the vendored copy,
  so a check afterwards truthfully reports "nothing changed" about drift it just
  absorbed. This hid a live change to the online-filing guide; it was only found
  by diffing the manifest's hashes against `HEAD`.
- **Expanding the corpus invalidates the published library**, because
  `verifyPublishedLibrary` compares the release's `corpusGeneratedAt` against the
  manifest's. Re-promoting the same candidate run re-checks every quote against
  the new corpus text and is the intended fix — `npx tsx
  scripts/content/promoteContentRun.ts docs/content-pipeline/candidates/run-N.json
  --confirm`. If the content hash comes back identical, nothing changed but the
  verification is now real.
- **e-Laws schedule statutes share a chapter id.** `02c30_e.doc` is the Consumer
  Protection Act (Sched. A); the Motor Vehicle Dealers Act is a *different
  document*, `02m30_e.doc`. The chapter id returns Schedule A with HTTP 200 and a
  valid consolidation header, so deriving the id gets you the wrong Act with
  nothing looking wrong. Put the schedule marker in `mustContain`.

- **`docs/SOURCING_NOTES.md` first.** Techniques that work, dead ends already
  ruled out, things confirmed not to exist. Read it before any sourcing.
- **A `_eV006`-style suffix is a frozen historical snapshot.** The Occupiers'
  Liability Act was once cited from one frozen seven weeks before s. 6.1 came
  into force, so the snow-and-ice content omitted the 60-day notice entirely.
  Only the consolidation-header check catches this — a text probe for the
  provision does *not*, because it is present in the snapshot marked "not in
  force".
- **antiword pads words with multiple spaces and hard-wraps mid-sentence.**
  Every probe must use `\s+`, never a literal space.
- **The Small Claims monetary limit is $50,000** (O. Reg. 626/00 s. 1(1), as
  amended by O. Reg. 42/25), not $35,000.
- **City of Toronto notice is s. 42(6)**, not s. 42 at large.
- **A check must assert a property, not a current value.** See CLAUDE.md §5.
  Several checks here were rewritten after failing that test.

## Deliberately NOT built: model-based reading of document images (2026-09-27)

**Do not build this yet. The blocker is a retention question, not a technical one.**

A large share of what a self-represented litigant uploads is a photograph — a
receipt on a table, a letter held up to a phone. Those are read by
`tesseract.js` **in the user's own browser** (`src/lib/case-workspace/clientOcr.ts`),
English and French, so the image is never transmitted anywhere to be read. The
recognised text arrives tagged `client-ocr` with a confidence score, and below 70
the document lands in `needs-details` and asks the user to type the date and a
description themselves.

Tesseract on a phone photograph is mediocre, and a multimodal model would read
those images far better. **It is not built, and the reason is specific.**

`docs/security/DATA_FLOW_INVENTORY.md` §3.2 sets out the retention position for
OpenAI **text**: zero data retention and modified abuse monitoring. It has **not**
been confirmed that those terms cover **image inputs**. Until OpenAI confirms that
in writing, sending a photograph of a medical record would mean sending the most
sensitive data this product holds under terms nobody has checked — while the
equivalent text is protected by terms somebody did.

So the sequence is: get the confirmation, record it in §3.2 alongside the text
position with the date, and only then build it behind `AI_DOCUMENT_ANALYSIS_ENABLED`
like the rest of the AI surface.

**What this entry is protecting against:** the reasoning above is invisible from the
code. Someone comparing tesseract's output on a phone photo against what a model
would produce will conclude, correctly, that the model is better, and reasonably
assume nobody had considered it. The gap is deliberate and the blocker is a
contract, not a capability.

Related: Adobe PDF Services was refused outright on data-residency grounds and
removed from `package.json` — §3.6 of the inventory. That refusal is about where
data goes; this deferral is about what happens to it when it arrives. Two different
questions, and answering one does not answer the other.

---

## The typecheck was reporting success while checking nothing (2026-09-26)

**Worth its own section because the failure looked exactly like a pass, and it was
believed for a whole working session.**

`npx tsc --noEmit` reported errors only in `.next/dev/types/validator.ts` — a
generated dev-server file — and nothing else. Those were filtered out as
generated-file noise, which is reasonable, and the remaining count of zero was
read as "the types are fine".

They were not fine. TS1109, TS1434, TS1005 and TS1128 are **syntax** errors, and
**when a TypeScript program contains parse errors, tsc emits syntactic diagnostics
and skips semantic checking for the entire program.** Every type error anywhere in
`src/` was invisible for as long as that one generated file stayed malformed.

Proven, not inferred: appending `const x: number = "not a number";` to a source
file produced no error at all. Moving the generated file aside surfaced the canary
**and four errors in `stage-map/citations.ts`**, where three new corpus source ids
had been used without being added to the `CorpusSourceId` union.

**Those four were NOT pre-existing, and this entry said they were.** They had been
introduced minutes earlier in the same session, by appending citations before
extending the union. Checked afterwards by restoring the previous `citations.ts`
into the current tree and running the fixed typecheck: **zero errors.** So nothing
had been hiding in the codebase — the suppression was real, and what it suppressed
was a brand-new mistake.

That distinction matters more than it looks. "The typecheck was off and there were
four errors behind it" invites a hunt for what else rotted while it was off. The
truth is narrower and more useful: the typecheck was off, and the only thing it
hid was the error being made at that moment. The reason the suppression was noticed
at all is that those four errors were *expected* and did not appear.

### What now exists

| | |
|---|---|
| `tsconfig.verify.json` | the same config with `.next` excluded — a build output has no business gating verification, and route types are checked by `next build` where they belong |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.verify.json`. **Use this, not bare `tsc`** |
| `npm run test:typecheck-live` | writes a deliberate type error, asserts it IS reported, deletes it. Also asserts the project is clean first, because a typecheck that always fails would "detect" the canary for the wrong reason |

### It came back the next day, because `exclude` does not exclude (2026-09-27)

The canary earned its keep within a day. `npm run typecheck` started reporting
`TS1011`, `TS1109` and `TS1128` in `.next/dev/types/routes.d.ts` — the same class
of syntax error in the same generated directory that `tsconfig.verify.json`
excludes. The artefact was a **torn write**: a fragment line reading
`ecord<string, string | string[] | undefined>>` and `interface RouteContext`
appearing twice in 137 lines. No dev server was running by then; one had been.

**`exclude` never had a chance.** `next-env.d.ts` contains
`import "./.next/dev/types/routes.d.ts"`, and **a file reached by an import is in
the program regardless of `exclude`.** `exclude` only filters what the `include`
globs sweep up; it does not sever a reference. So a half-written build artefact
could still switch off semantic checking for the whole source tree, which is the
precise failure the config was written to prevent.

A second detail is worth knowing, because the obvious fix is a no-op: dropping
`next-env.d.ts` from `include` changes nothing, since `**/*.ts` matches it. It has
to be named in `exclude`.

`types/verify-env.d.ts` now carries the two `/// <reference types="next" />`
directives that were the only part of `next-env.d.ts` verification needed, and
`next-env.d.ts` itself is excluded. Verified afterwards by `test:typecheck-live`:
clean first, deliberate error reported, canary removed.

**The finding, in one line: an exclusion is not a boundary. An import is.** Any
claim that a config reads only the source tree has to be checked against what the
source tree imports, not against the glob list.
### The general lesson, which is not about TypeScript

A count of zero is not evidence unless something could have made it non-zero.
Every "0 errors" in this repository should be read as a question: *what would have
had to go wrong for this number to be 1?* Where the answer is "nothing could",
the check is decoration. That is the same reasoning as CLAUDE.md §5's rule about
properties versus values, arriving from the opposite direction: §5 is about checks
that fail when they should not, and this is about a check that passes when it
should not.

---

## The recurring blind spot: a check whose oracle is the code's own description (2026-09-27)

**Four instances, three of them on one branch, each found by a mutation after the fact.**
This is a structural hazard of how this repository is written, not a run of bad luck, and
`npm run test:check-oracles` now looks for it.

| Check | Searched for | In | Why it was wrong |
|---|---|---|---|
| the absence-claims gate | "cannot" near "court" | its own template | tripped on its own explanatory wording |
| `verifyWorkspaceOcr` | the Vite-only `?url` import | `clientOcr.ts` | the file has a comment explaining that `?url` does not work under Next, so the check **failed against correct code** |
| `verifyWorkspaceUi` | the boundary sentence, "Date needed" | the workspace page | every string it looks for is also discussed in that page's comments |
| `verifyWorkspaceExport` | `no-store` | the export route | the phrase is in the header comment explaining why the response must be no-store. A mutation making it cacheable left the check **green** |

### The mechanism, and why good comments make it worse

A source-level check greps a file for the text that proves a behaviour. The same text
appears in the comment explaining why that behaviour matters. The check then passes on a
file that merely *talks about* doing the right thing.

**The better the comment, the more certainly it contains the rule's keywords.** So this
gets more likely as the codebase gets better documented, which is the opposite of how a
hazard is supposed to behave.

### Two shapes, and only one is visible after the fact

- **only-in-comments** — the check is already broken and fails against correct code, or
  passes against no code at all. This is the aftermath.
- **in both code and comments** — the check passes *today*, correctly, and stops meaning
  anything the moment the code changes, because the comment holds it green. **This is the
  condition, and it is detectable before anything breaks.** All three branch instances
  were this shape when written.

`test:check-oracles` reports both. It resolves which file each literal is tested against,
via path constants and one level of aliasing, because a meta-check with false positives
gets skipped, and a skipped meta-check catches nothing.

### It caught itself first, which is the measure of the thing

The first version asked whether a suite *file* mentioned a comment-stripper anywhere. It
returned true for `verifyWorkspaceExport` even with the stripping removed, because the
file still defines `stripComments` and still explains it in a docstring. So every at-risk
suite was skipped and the audit reported all clear against all three known instances.

**The audit for comment-oracles was defeated by a comment-oracle inside the audit.**
Stripping is now recorded per variable, from the initialiser that produced it.

### What it does not cover

Only this shape, and only where the target file resolves. It prints an upper bound on the
literals it could not tie to a file rather than reporting silent success. The wider family
of a check comparing a constant with itself, or a document with its own prose, was scanned
for separately and found nothing, but it needs judgement rather than a pattern.

**The rule for writing one of these:** if a check greps source for a phrase, strip
comments first. There is no case where reading the comments is what you wanted.

## Case review and A2I scope (2026-09-28)

- **`src/lib/case-system/policy/a2iScope.ts`** is the one place that decides what kind of help the
  platform gives. "information" capabilities are on; each "needs-a2i-approval" capability (the five
  steps in the Stage 1 application) is off and cannot report as on without a recorded approval.
  Court-document drafting follows its `formCompletion` switch. Suite: `test:a2i-scope`.
- **Case review** (`src/lib/case-system/caseReview/`, route `/api/case/review`, panel
  `CaseReviewPanel.tsx`): deterministic findings from recorded fields (r. 7.01(2) contents for a
  Small Claims plaintiff before filing, no evidence, no confirmed claim type) plus AI-located
  findings. The model returns a fixed kind and quotes only; code checks every quote is the user's
  own text and words the finding from a fixed template. Names and addresses never reach the model.
  Mapping facts to kinds of claim is deliberately NOT here: that is the approval-tier
  `claimElementMapping` switch. Suite: `test:case-review`.
- Not built yet: persisting "done / not relevant" (screen-only today), and a server-side case-file
  assembler that also reads `case_events` and the workspace tables. The review reads
  `master_result.intakeData` only.
- **Testing preview.** Setting `NEXT_PUBLIC_CS_SCOPE_PREVIEW=on` turns every approval-tier capability
  on for testing, on any deployment that is not Vercel production (both `VERCEL_ENV` and
  `NEXT_PUBLIC_VERCEL_ENV` are checked). Set it on Vercel Preview/Development and in `.env.local`,
  never Production. Previewed screens show `ScopePreviewNotice`. `test:a2i-scope` asserts the
  preview never applies in production.
- **CI on main, 2026-09-28.** Releasing case-workspace to main surfaced six stale source checks
  (fixed to assert properties) and four read-only catalogue checks refused by the
  20260915090000 anon-read change (they now read with the service key when present). The safety
  regression passed all 11 cases when run locally the same afternoon.
  In CI it failed in under a second: the `OPENAI_API_KEY` repository secret is set but OpenAI
  rejects it (a local run with the working key passes). **CI main has not been green since
  2026-08-27**, and until 2026-09-28 no run had reached the safety step, the production build or
  `test:assistant-context` -- an earlier step always failed first. The nightly "Real-AI" workflow
  does not prove the secret works: it exits 0 unless `RUN_REAL_AI_INTEGRATION=1`, which it never sets.

## Story review battery (2026-09-28)

`scripts/verification/storyReview/` runs realistic stories (Small Claims both sides, civil, family,
a tribunal case, one safety case) through the whole guided intake in order -- routing, opening
story, story proposals accepted, remaining questions, depth phase, case review -- and checks each
against expectations committed in `stories.ts` before any run. It exists because the site owner's
manual test found failures that live *between* stages (re-asked questions, wrong side, no request
for the receipt or address), which no single-stage suite could see.

- Runs on GitHub (`.github/workflows/courtsimplified-story-review.yml`) with the real key, on
  demand or when the battery changes on main. The report is force-pushed to the
  `story-review-reports` branch; `git fetch origin story-review-reports` reads it without a
  browser login. Job logs need a signed-in browser; that branch does not.
- A review, not a gate: findings never fail the workflow. It also runs when `src/lib/case-system/intake/`
  or `caseReview/` changes on main, and runs `test:fixtures` (CLAUDE.md section 7) in the same job,
  publishing the three `.actual.md` files and the run log under `fixtures/` on the reports branch.
- First run (2026-09-28) found, and this commit series fixed: plaintiff-worded filing questions asked of
  defendants; the contractor-customer questions asked of freelancers owed money and a used-car buyer
  (free `disputeCategory` slug, now a fixed list); `sc-claim-filed` proposed from quotes unrelated to
  filing; case-review pointers quoting the user's own evidence list and "unknown amount" on a figure;
  "distress" on three plain disputes; court routing ignoring amounts (a $185,000 renovation to Small
  Claims on keywords alone -- now a stated amount that contradicts the keyword answer sends the story
  to the model, whose prompt now carries the $50,000 line from CJA s. 23 (1) / O. Reg. 626/00 s. 1 (1)).
  Then: defendants were asked the noted-in-default and judgment-at-a-hearing date questions whatever
  their stage -- now `sc-defendant-default-status` asks first and the date questions (ids unchanged, so
  the deadline engine's inputs are unchanged) follow only on yes / not sure; and the keyword pass
  called contractor stories "mixed" because civil's "contract" matched "contractor" and "sue"
  matched "sued" -- those two are now whole-word matches. Still open: the keyword pass sends a
  defamation story with no amount to civil (the civil list has "defamation"); the chat engine shares
  that list, so it was left for a decision rather than changed here.
- `npm run review:stories -- --offline` checks the plumbing here with fake model calls. Its
  results mean nothing about quality.
- Deterministic checks only (no model grades a model). The report also prints every question in
  order, because "that question didn't need asking" is often visible only to a reader.

## Model upgrade: gpt-4o-mini → gpt-6.1-sol (2026-09-29)

Every model call now takes its model from `src/lib/case-system/aiModels.ts`
(tiers `deep` / `standard`; env `AI_MODEL_*`, `AI_EFFORT_*`, `AI_EFFORT_ANALYSIS`).
`npm run test:ai-models` keeps it that way. Measured side by side on the story
review battery and the three fixtures, same stories, same day:

| | gpt-4o-mini | gpt-6.1-sol |
|---|---|---|
| Story review failed checks | 9 | 6 |
| Safety regression (x3) | — | 42/42 after the two prompt fixes below |
| Turn calls, median | 0.7–2.2s | 1.5–5.7s |
| Final analysis (`small-claims-analysis`) | ~9.5s | ~77s at medium, ~55s at low; gpt-6-luna ~33s |

**What it cost to learn, so nobody repeats it:**

- **The new model follows the safety prompt more literally.** Two misses came
  from wording gpt-4o-mini had been reading generously: flat, vocabulary-free
  distress was classed `clear` (the prompt said "only when their own words show
  despair…"), and "a child currently at risk" stopped a tenant-mould story whose
  son's asthma was worsening. Both fixed in the prompt, with examples that
  deliberately do not copy the regression text.
- **`gpt-6.1-sol` rejects `reasoning_effort: "none"`** with a 400 — found by
  setting `AI_EFFORT_ANALYSIS=none`, which broke the analysis outright.
  `modelParams()` now maps it to `low` for that model and gpt-6-astra.
- **The final analysis is output-bound, not reasoning-bound.** Dropping effort
  from medium to low saved only ~20s, and the fast model still took ~33s. It
  returns a large JSON document; making it shorter is the lever if speed matters
  more than depth.
- **Court-path "mixed"/"civil" misses (SC1, SC5, SC7) and the unscripted
  date questions (SC7, SC8) happen on BOTH models** — they are existing
  issues, not upgrade regressions.

## Model wording is gated; users read the sourced catalogue (2026-09-29)

**What was found.** A planted-marker test (`test:no-model-text-to-users`) run
against the analysis as it stood showed **19 model-written fields** reaching
what the analysis hands back: risk titles, explanations and fixes; next
actions; follow-up questions and their reasons; every claim "element" (label,
explanation, missing facts, risks); evidence-to-issue explanations; form
suggestions; and the model's case `score`, which became a "proof strength"
rating (CLAUDE.md section 3). Earlier fixes had each closed one route
(warnings, document prose) and left the rest. The A2I answers of 2026-09-28
commit to no AI-written legal content reaching a user without review.

**What is settled.** The model is not removed; it is gated by
`aiAnalysisTextToUsers()` in `content-library/phaseScope.ts`:

- **Off** (default; always in production, which ignores the variable): the
  model makes structured choices only (court path, stage, claim type,
  confidence, and the recorded/not-recorded case-file items). Every sentence is
  written by `buildCodeWrittenCognition` in `courtSimplifiedBrain.ts`.
- **On**: Vercel preview (staging) automatically, or a local run with
  `AI_ANALYSIS_TEXT_TO_USERS=on`. The model's own wording, for testing.
  Turning it on for real users is a code change to that function, made for
  what the Law Society approves.

**What users get instead is not a placeholder.** When the user confirmed a
catalogue claim type in the guided intake, the analyze route now receives
`confirmedClaimTypeId` and per-element `elementStates` (states only, validated
against `intake/claimTypes.ts`). The elements shown are the catalogue's, each
with its `plainExplanation` and official `sourceUrl`; follow-up questions are
the reviewed depth questions for elements still `not-yet`; an element the user
already answered is not asked again. The fact-specific engines (fact pattern,
evidence, element proof, contradictions, limitations) supply the rest as
before.

**Trap.** `buildFallbackCognition` (the no-model path) says "detailed analysis
is not available". Do not reuse its text when the model DID run; the
code-written builder keeps its "not available" risk only when `modelRan` is
false.

**Test seam.** `COURTSIMPLIFIED_TEST_PLANTED_COGNITION` returns a planted model
response without a network call. Ignored whenever `VERCEL_ENV` is set or
`NODE_ENV=production`.

**Update, same day: the switch is ON everywhere, production included**, at the
site owner's instruction (no users yet; the site is built the way it will
run). `AI_ANALYSIS_TEXT_TO_USERS=off` restores the code-written analysis above.
The A2I answers describe that configuration for when users are admitted.

## The analysis writes from verified sources, and a gate checks it (2026-09-29)

**The root cause, stated plainly.** The analysis prompt asked for
"lawyer-grade" reasoning -- risks, next steps, what a claim requires -- from
the model's general knowledge. It was given none of the verified material in
this file, attached no citations, and nothing checked its sentences. Every
earlier fix blocked a phrase or closed a route; none addressed that.

**Settled design** (`intelligence/groundedCognition.ts`):

1. `buildSourcePack` -- per case, the verified items that apply: the confirmed
   claim type's elements, evidence categories, defendant considerations and
   procedural notes (catalogue, each with its `sourceUrl`), plus the rules and
   deadlines of the stage-map positions for the case's stage and side
   (verbatim quotes, official URLs). Stable ids.
2. The prompt lists the pack and requires `sourceIds` + an exact `quote` on
   every legal statement. It is told unsupported statements are deleted.
3. `verifyGroundedCognition` is the safeguard, not the prompt: a cited id must
   be in THIS pack and the quote must appear in that item's verified text;
   anything presented as a plain fact is dropped if it contains legal content.
   Catalogue elements keep the catalogue's name and link; missing ones are
   restored. Survivors carry their `sourceUrl`.

**Two traps it hit.** (a) A cited next step with no legal keywords was kept as
a "fact" and lost its link -- a citation, when present, is now always checked
and its link attached. (b) The report of removed statements was stored on the
analysis, which travels to the browser and into the saved case: the removed
text is by definition unverified law, so the report on the analysis keeps
field and reason only.

**Coverage limit.** The gate makes the analysis as accurate as the pack, and
no wider. Small Claims has the stage map and catalogue; civil and family have
less, so more is removed there until content is added. That is the honest
failure direction: less said, nothing invented.

Asserted by `test:grounded-analysis` (planted hallucinations, end to end;
fails on a bypassed gate, naming each one).

## The catalogue is verified, and the verification is checkable (2026-09-30)

The grounded analysis is only as accurate as its pack, and for Small Claims the
pack is mostly the claim-type catalogue (`intake/claimTypes.ts`). So the
catalogue was read, entry by entry, against its sources: **146 entries, 58
supported as written, 86 corrected, 2 unverifiable** (O. Reg. 333/08 could not be
retrieved). Every correction was re-read by an independent reviewer who had not
written it; the 12 that still fell short were fixed and re-read again.

**What a date now means.** Each dated entry has a record in
`docs/sources/catalogue-verification.json`: the verbatim passages it rests on,
how each source was read, what was wrong before (for corrections), and a
fingerprint of the exact text verified. `test:catalogue-verified` (in CI):

- fails if an entry's text changes and its record does not -- editing verified
  content means re-reading the source, and the message says so;
- checks every quoted passage from a vendored corpus file really is in it
  (" ... " marks skipped material, each run checked separately);
- requires the entry's own `sourceUrl`, and every `alsoCites`, to be among the
  sources actually read for it;
- requires `consolidationPeriod` to be the start of the consolidation read.

Helpers (entry list, fingerprint) are in `scripts/content/catalogueVerification.ts`.

**New field: `alsoCites`.** An entry whose text rests on two instruments (the
Small Claims guide AND O. Reg. 626/00 for $50,000; Clements AND Mustapha for
causation) names the second inline and lists it in `alsoCites`, so a check can
read it.

**Four patterns caused most of the 86** -- they are the ones to watch for when
adding claim types (civil and family next): a general page cited for a specific
proposition (the burden-of-proof sentence cited for what a loan claim must
show); a procedure page cited for what a Defence may argue; "$50,000" cited to
the CJA, which says only "the prescribed amount"; and "two years from when the
incident was discovered" where the Act says the claim. Details in
`OUTSTANDING_ISSUES.md` §14 and `SOURCING_NOTES.md`.

**Connected 2026-09-30.** The source pack now also carries the confirmed claim
type's defence concepts, and the authored claim-type profiles in
`claim-types/` that extend it (`existingClaimTypeId`) or are a possible
variant of it (`alsoRelevantTo`, e.g. a municipal-sidewalk fall for a slip and
fall): their claim-barring notice rules and limitation rule, verbatim. Before
this the analysis never saw the ten-day municipal notice or the sixty-day snow
and ice notice, and `claim-types/` was unreachable from any page. Four claim
types were added from the corpus (child damage under the Parental
Responsibility Act, a repairer's or storer's lien, an online or remote purchase,
unpaid wages); two drafted types were not shipped because the statute gives no
money claim (SOURCING_NOTES.md). `test:catalogue-verified` now also rejects
case-grading or judge-prediction language in any entry.

## The civil and family libraries (2026-09-30)

`intake/civilClaimTypes.ts` (7 Superior Court claim types) and
`intake/familyMatterTypes.ts` (6 family matters) use the Small Claims
`ClaimType` shape, so one set of machinery reads all three: the source pack,
the verification log and `test:catalogue-verified` (321 entries, 319 verified,
2 unverifiable). Written from the Rules of Civil Procedure, the family statutes
(vendored whole through the Vendor Sources workflow) and the saved SCC
decisions; every entry re-read by an independent reviewer and every rewrite
re-read again.

**Connected.** The civil and family adapters map the issues a user picks to
library ids (`civilLibraryIdsForIssues`, `familyLibraryIdsForIssues`), passed
to the brain as `libraryMatterIds`; `buildSourcePack` adds those entries and
their defences. `buildSourcePack({ courtPath })` now adds the stage map's rules
only on the Small Claims path -- before this a civil or family analysis was
handed Small Claims procedure as its verified material.

**Next steps.** All 18 Family and Civil next-step blocks are authored from the
Rules, recorded in the log's `nextSteps`, and held by the same suite
(fingerprint, vendored quotes, link read, no grading language).

**Opened 2026-09-30 by the site owner** ("Put everything on live ... so it can
go through live testing"): `AVAILABLE_PATHWAYS` is all three,
`FORM_COMPLETION_PAUSED` is false, and `OWNER_LIVE_TESTING` in
`policy/a2iScope.ts` turns every approval-tier capability on in production.
Those capabilities are still reported as preview-only, so each screen shows the
testing notice, and none is recorded as A2I-approved. This is safe only behind
the site password (middleware.ts); `test:a2i-scope` fails if the gate goes
while live testing is on. **Before real users are admitted**, set
`OWNER_LIVE_TESTING.enabled` to false and decide each pathway and capability
again -- the A2I application describes phase 1 as Small Claims only.

## 2026-10-01: all 35 stage answers authored, reviewed and published (run-13)

The 14 withdrawn GPT answers (and the 19 never published) were replaced by 35
answers written from the saved corpus, every sentence carrying a verbatim
quote, and put through **six rounds of independent review** by reviewers who
had not seen the drafting. Errors found per round: 10, 9, 4, 0, 0, then 1 in
the final check of edited sentences (fixed by removing the half-statement).
Every round's fixes were re-gated (`gateFailures`) and every quote re-found
in its *named* source, not just anywhere in the corpus.

### The deadline section learned whose clock it is

`StageDeadline` now has `actor` (`reader` | `other-party` | `court`) and
`qualifier`. The renderer says "This is the court's timetable, not a step you
take" for the 90-day settlement conference, "They have 20 days" for the
defendant's time seen by a plaintiff, and appends the qualifier (court
extension, consent, fifth-day service, r. 11.1.01 (2) exceptions, the
r. 13.01 (4) no-conference case). Court-actor deadlines are excluded from
computed dates. Every qualifier must be supported by `rule` or `exceptions`.

### Things this cost and should not be relearned

- **r. 11.1.01 only counts an r. 11.03 step or a trial-date request.** Noting a
  defendant in default does not stop the two-year dismissal clock. Defended
  stages say "Request a trial date"; undefended ones name the assessment.
- **`defendant:judgment-against-me` had cited r. 11.06**, which only sets aside
  DEFAULT judgments. After a hearing the routes are r. 17.04 (new trial, 30
  days, two narrow conditions), CJA s. 31 + O. Reg. 626/00 s. 2 ($5,000) +
  RCP r. 61.04 (1)/(4), 61.05 (1) (serve within 30 days, file within 10 more,
  Form 61C), and RCP r. 63.01 (1) (delivering the notice stays the money parts).
- **RCP and Small Claims holiday definitions are word for word identical**, so
  `verifyStageMap` accepts either rules source as the computation provision of
  a rules-regime deadline.
- **The statutory day-count warning** now covers Legislation Act s. 89 (1), (2)
  and (5); s. 89 (2) helps only when the office is actually closed.
- **`verifyStageAnswers` had its own stricter readability copy** without the
  gate's term-of-art exception; it now calls `assessReadability`, so the suite
  and the publishing gate cannot disagree.
- **The resolve-stage route said "we can't tell where your case is up to"
  when it could** (stage resolved, answer refused). It now says what is
  actually missing: forum not confirmed, or no checked answer.
- **Known gap left on purpose:** the unpaid-judgment answer does not explain
  periodic-payment orders (r. 20.02 (2)–(4)); a half-statement was judged an
  error and the full one does not fit at grade 8.

### The eval after the model upgrade, and two findings it cost (2026-10-01)

- **Nobody had re-run `eval:accuracy` since the move to gpt-6.1-sol.** It is now
  a reported step in the story-review workflow (with the call log published), so
  it runs whenever stage-map, intake or eval code changes on `main`. First run:
  **54%** stage accuracy. The call log showed the cause: the right stage, with
  confidence hedged below the 0.85 floor on facts stated in plain words. After
  prompt rules 5b/5c (examples deliberately not copied from eval stories) and
  passing the side recorded at intake (`knownRole`): **97%, 0 wrong-stage
  content shown, 9/9 deadlines, 3/3 advice deflected, 5/5 chat routing.**
- **The new model is literal about "absence is not evidence".** One expectation
  was wrong for exactly that reason (`d-missed-the-20-days` assumed "not yet
  noted" from silence) and now expects the clarifying question.
- **The model path of the court-path classifier ignored the former-tenant cap**
  that the keyword path applied; and the stage resolver's out-of-scope backstop
  then overruled a boundary the classifier had flagged. Both fixed.
- **No page showed the stage answers.** `/api/case/resolve-stage` and
  `/api/case/chat` had no caller. The builder now has `StageAnswerPanel`: on a
  Small Claims case, after the coarse stage is confirmed, the user picks their
  exact position (each stage's own question) and `/api/case/stage-answer` (no
  model) renders the published block through the same gates.

## Meaning-based retrieval over the corpus (2026-10-05)

**What it is.** Before the analysis call, the model reads the story and writes
the legal questions it raises in the words legislation uses; those are
embedded and the corpus is searched by meaning; the nearest passages join the
source pack the analysis may cite. Word search was considered and rejected by
the site owner ("too many variables"): the person's words and the statute's
rarely match.

**The pieces.** `src/lib/case-system/retrieval/`:
`corpusChunker.ts` (passages on the law's own boundaries, not-in-force text
removed -- see SOURCING_NOTES.md, "Cutting e-Laws text"), `corpusIndex.ts`
(int8 vectors, ids and hashes; no text), `storyRetrieval.ts` (the query step,
the search, the court scope). The index is built by the Corpus Index workflow
(`npm run retrieval:index`), because the workspace cannot reach the
embeddings API, and lands in `docs/sources/retrieval/` through a PR.

**Decisions already settled.**
- Retrieval chooses what MAY be cited; the grounding gate is unchanged and
  still checks every quote against the cited passage's verbatim text.
- A hit is re-cut from the vendored file and used only if its hash matches
  the index, so a re-vendored source is never served under an old vector.
- Another court's rule book, guides and fees are excluded by court; statutes
  of substantive law never are.
- Any failure returns nothing and the analysis runs as before. The calls are
  audited under the analysis's call type; the queries are redacted from the
  log; the embeddings call is sent the queries, never the story.
- Passages from practical-tier sources (guides, Steps to Justice) are
  labelled as guidance, not legislation.

**Case law (2026-10-05).** The 31 saved judgments with a public page are
indexed too (`decisionChunker.ts`, registry `scripts/retrieval/decisionSources.ts`):
majority reasons only, not the courts below, labelled "Court decision" with
case, citation and paragraph, and shown with the caution that none has been
noted up. See SOURCING_NOTES.md, "Cutting judgments into citable passages".

**Cross-references (2026-10-05).** A found provision brings, one hop and
at most six in all, the provisions of the same law it names ("an order made
under section 9 or 10", "subrule 8.01 (4)", a bare "subsection (6)" of its
own section) -- labelled "referred to in ...". "s. 35" is never followed
(it is amendment history), nor a reference into another law
(`crossReferences.ts`).

**Shown to the person** as "The law behind this" (`AppliedLawPanel`): only
passages the analysis cited with a verified quote, verbatim, behind
`APPLIED_LAW=off`.

**Not done yet.** The chat (`chat/libraryChat.ts`) still selects published
blocks only.

**How it is measured (2026-10-05).** `scripts/eval/retrievalRecallSet.ts`: 50
stories in people's words, 63 labelled provisions, every label confirmed by
the provision's own text (test:corpus-retrieval). `npm run
eval:retrieval-recall` reports story hit rate, provision recall (and how much
came only through cross-references) and the time retrieval adds. The
Retrieval Eval workflow runs it with the probe in minutes, on any branch,
and publishes to `retrieval-eval-reports`. Compare runs, not one number:
the model's queries vary.

First measurements (2026-10-05): 43 of 50 stories and 52 of 63 provisions
before the labels were widened to every provision whose own text answers
the story; 48-49 of 50 and 58-60 of 70 after. Run to run the same code moves
by about two provisions. **Tried and removed:** lifting passages of a law the
model's query names (+0.06). A/B on the same labels: 60 and 58 with it, 58
without -- inside the noise, so not worth the code. **Also tried and
reverted:** telling the query step not to name the court in substantive
questions (the report showed "in the Ontario Small Claims Court" in almost
every query, pulling toward procedure). It found Garland for the mistaken
payment but lost procedural stories (r. 9.01, r. 8.01): 46 of 50 both ways
it was worded, against 47-49 for the original prompt. The time is the query
step: median about 5.5 s to write the queries, 0.2 s to embed, under 6 s in
all, run alongside intake normalization.


## Plain-language explanations, checked by a second model (2026-10-05)

"The law behind this" shows each provision verbatim, which is exact but often
hard to read. "Explain in plain words" on each item asks
`/api/law/explain` for an explanation, built in
`src/lib/case-system/retrieval/explainProvision.ts`:

1. **Only the official text is explained.** The route takes a passage id
   (`corpus:<source>:<n>`), never text. The passage is re-read from the
   vendored file and its hash checked against the index (`readPassage`), the
   same as retrieval.
2. **One call writes it** (standard tier, JSON): 2 to 5 sentences, every
   condition, exception, time limit and number kept, numbers written as the
   provision writes them, nothing added, nothing about anyone's case.
3. **Code checks it**: every number must appear in the provision or its
   citation; the case-strength deny-list; no "you should", "your case",
   "chances"; a length band.
4. **A second, separate call checks it** (standard tier, medium effort by
   default, `AI_EFFORT_EXPLAIN_CHECK`). It sees only the provision and the
   explanation -- not the writer's prompt -- and lists what the explanation
   says that the provision does not, and what it leaves out. Both lists must
   be empty. A malformed answer is a failure.
5. **One retry** with the findings given back, checked from scratch. If that
   fails too, nothing is shown and the panel says to read the provision.

Successful and checked-but-failed results are cached in memory by passage
hash; a model error is not cached. Behind `PLAIN_EXPLANATIONS=off` and
`AI_ANALYSIS_TEXT_TO_USERS=off`; the analysis marks items `explainable` only
when the switch is on, so the button does not appear when it is off.

**Why a second call rather than a better prompt.** The failure that matters is
a quiet one -- a dropped "unless", "may" turned into "must" -- which code
cannot see and which the writing call, checking its own words, shares a blind
spot for. The checker is asked a narrower question with no stake in the
answer.

**Measured by** `npm run eval:explain` (Retrieval Eval workflow,
`explain-probe.md` on the `retrieval-eval-reports` branch): the provisions
labelled in the recall set, each explanation shown or withheld with the
checker's findings on every attempt. Read the findings to judge whether the
checker is too lenient or too strict. Asserted by
`npm run test:plain-explanations`.

Audited under the existing `small-claims-analysis` call type (as retrieval
is), told apart by prompt version, so no migration was needed. If it should
have its own call type, that is a migration adding it to
`ai_call_log_call_type_check`.

**Measured 2026-10-05** (explain-probe.md, 40 provisions across Small Claims,
civil, employment, family, tenancy and decisions): 31 of 40 shown after the
length fix (#120); the first run was 24 of 30, every miss refused for length.
Of the nine withheld, the checker was right on most of them, and some of its
catches were real errors:
- Trespass to Property Act s. 2: twice it caught "entering without permission is an
  offence" without "where entry is prohibited under this Act".
- RTA s. 27: it caught "only" turning a permission into an exclusive rule.
- Municipal Act s. 44: it caught a dropped "from the occurrence of the injury".

On decision paragraphs it is picky (Bhasin, Garland, Whiten). Withholding is
the safe failure there, because the verbatim text is shown either way. Two of
the nine were refused only because the case-strength deny-list matched the
provision's own words ("may dispute", "prevails"), so a deny-listed term now
counts only when the provision does not use it. The shown explanations
spot-checked against their passages (FLR r. 14, CLRA s. 22, FCSG s. 3,
ESA s. 54) were accurate.

## A vehicle-injury notice stage, and the deadline wording fixed everywhere (run-15, 2026-10-05)

`before-filing:notice-vehicle-injury` (Insurance Act s. 258.3) is published,
with the claim-type profile `sc-claim-motor-vehicle-injury` in
`claim-types/noticeProfiles.ts` -- the first authored profile whose notice is
`claimBarring: false`. Reviewed by fresh independent agents until
a round found nothing (errors per round: 6, 3, 7, 3, 2, 2, 1, 0, 1,
1, 1, 5, 4, then the whole changed set: 4, 8, 1, 0).

The review of the new block reached the shared, code-rendered deadline text and
found real errors in what was already published -- worth knowing, because six
earlier review rounds had passed it:
- **"You have 10 days, counted from the injury"** did not say whether the
  injury day counts, and read like Legislation Act s. 89 (4) (a period
  "beginning ... on" a day includes it). Deadlines now read "You have N days
  after X", the rules' own word, which s. 89 (5) and r. 3.01 key on.
- **"The day the time is counted from is not itself counted"** sat beside a
  two-year limit, which ends on the second ANNIVERSARY (s. 4) -- read together
  they put the last day one day late. Year periods now say "The last day is the
  anniversary of that day" with s. 89 (7)'s February 29 rule.
- **s. 89 (2)** had been rendered "only if it is closed"; s. 89 (2) has no
  "only if", and s. 89 (1) moves a holiday deadline regardless.
- **Limitations Act s. 5** had been paraphrased in several blocks as "a court
  case is a fitting way to fix it" (s. 5 (1) (a) (iv): "to seek to remedy it",
  "having regard to the nature of the injury, loss or damage"), "caused it"
  (s. 5 (1) (a) (ii): "or contributed to"), "a reasonable person in your place"
  (s. 5 (1) (b): "with the abilities and in the circumstances", and "first"),
  and five notice blocks stated the two-year limit from "discovered" with no
  definition or presumption at all.

`renderDeadlineSection` changed, so all 21 affected blocks were re-rendered and
re-promoted together (the gate requires the deadline section byte-identical to
the renderer).

## The research step: the analysis researches before it writes (2026-10-05)

`retrieval/researchStory.ts` replaces single-pass retrieval in the brain
(`researchStepEnabled`, `RESEARCH_STEP=off` to return to it; plain retrieval
also runs if research produces nothing). Site owner, on why a bus-injury story
got generic steps: "I thought the ai can think like you do".

1. One call reads the story and lists 3-6 questions a lawyer would research
   (who is sued, notices, limitation, forum, governing statute, what must be
   shown and claimed, next step), each with search phrases, plus one neutral
   situation line with no personal details.
2. Each question is searched by meaning; hits re-read and hash-checked;
   cross-references followed.
3. One reading call PER QUESTION, in parallel (one call over all questions
   timed out 9 times in 10 at 45 s), sees the question, the situation line and
   the passages -- never the story -- and returns answered (passage + exact
   quote), search-again (new phrases), or not-in-library (the law's name).
   Code accepts an answer only if the quote is in a passage offered for that
   question.
4. One more round for search-again.

The answering passages go first into the source pack; "What we looked into"
(ResearchPanel) shows each question with the provisions' own words and the
verified quote, or the gap. Measured (`npm run eval:research`, 10 stories):
52 of 56 questions answered, median 28 s. The applicability rule in the
reading prompt ("a notice rule for a road in disrepair does not apply to an
injury caused by a vehicle being driven") took the bus story from citing the
Municipal Act and City of Toronto Act 10-day notices to citing only Insurance
Act s. 258.3.

Gaps it named in its first runs: the Statutory Accident Benefits Schedule
(O. Reg. 34/10), the Highway Traffic Act (now vendored and indexed: 919
passages, including s. 193, the onus of proof on a vehicle's owner or driver),
and the Criminal Code (ss. 264, 810) for family safety stories. Gaps are
logged by name only; the automated request-to-vendor pipeline is the next
piece.

### Missing laws are requested and added automatically (2026-10-05)

When the research step names a law the library lacks, the analysis files it
(`retrieval/sourceRequests.ts`) as a `source-request` issue -- the law's name
and court path only -- if `GITHUB_SOURCE_REQUEST_TOKEN` is set in Vercel.
`.github/workflows/courtsimplified-source-requests.yml` then:

1. resolves the name to an official URL (`scripts/sources/resolveSourceRequest.ts`:
   a model proposes the e-Laws code or Justice Laws path; code accepts only
   those two hosts and well-formed codes);
2. fetches it with `fetchCorpus --only`, which keeps it only if the text
   contains its own title and, for e-Laws, "CONSOLIDATION PERIOD" -- a wrong
   guess fails here and nothing is vendored;
3. indexes it, runs `test:rules-corpus` and `test:corpus-retrieval`;
4. merges a PR, comments and closes the issue -- or labels it `needs-human`.

Declarations it adds live in `scripts/rules/requestedSources.json`. It can be
run by hand from the Actions tab with a law's name. Asserted by
`npm run test:source-requests`.

Live since 2026-10-05: the token is in Vercel (Production), the repository
allows Actions to open pull requests, and the first requests (SABS, the
Compulsory Automobile Insurance Act, the Charter) went from issue to merged
index unattended in about seven minutes each. The workflow listens to
`labeled` only: an issue created with the label also fires `opened`, and the
second run flagged the law the first had just added.

### Questions from the law, for any kind of case (2026-10-05)

`retrieval/sourcedQuestions.ts`. The owner's direction: the intake should be
ready for every type of case, not only the 27 Small Claims and 7 civil claim
types with hand-written questions. Once the story is told, all three intakes
call `/api/intake/sourced-questions` in the background:

1. **Research** (first request): `researchStory`, returning the ids of the
   passages that answered a research question and the neutral situation line.
2. **Write and check** (second request, ids only -- each passage is re-read
   from the index, hash-checked): a model writes up to five questions about
   what those passages say matters that the story does not answer; code checks
   quote, numbers, outcome and advice wording; an independent check, which
   never sees the story, passes each as faithful, applicable and neutral.

Shown with "Why we ask" and the provision's link; answers are added to the
story under a labelled heading. Small Claims shows them only when no claim
type with reviewed depth questions was confirmed. Switch: `SOURCED_QUESTIONS`.

Measured (`npm run eval:sourced-questions`, Retrieval Eval with
`sourced_only`): 46 questions across 12 stories in all three courts, every
story with some; 12 drafts refused by the check, 2 by code; median 50 s for
both requests together. As one request, 9 of 12 ran out of time when the
model was slow -- hence two.

What it cannot do yet: elements that come from decisions rather than
statutes. A Charter search story gets limitation and procedure questions, not
what must be shown for Charter damages, because that test is in case law the
library does not hold (CanLII cannot be fetched automatically).
