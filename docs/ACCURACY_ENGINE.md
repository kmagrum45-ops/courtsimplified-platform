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

**Still dormant:** the deadline engine. Part 5 renders the PERIOD and what it
runs from; a date needs the user's own event date and no slot supplies one yet.
Computing a date from a date we do not have would be the worst possible use of
it.

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
