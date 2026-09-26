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

## Where the bodies are buried

Things that cost time to learn and would cost it again:

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
