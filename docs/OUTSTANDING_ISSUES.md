# CourtSimplified — outstanding issues register

Everything found and not yet fixed, as of this session. Ordered by what actually matters, not by when it was discovered.

**How to read this:** each item states what's wrong, where it was found, and why it matters. Items marked ⚠️ can produce wrong information for a real user. Items marked 🔒 are security or privacy. Items marked ✅ were raised and investigated and **did not hold** — kept, not deleted, so the same surface reading doesn't re-raise them. Items marked 📌 are observations about the process rather than defects. Everything else is incomplete rather than broken.

---

## 0. 📌 Three instances of one failure, and the rule they produce (2026-09-14)

**The wrong claim:** that Ontario and the federal government each publish a
child support table, and that a build must know which path a case is on before
reading one. Written into two vendored source headers, a registry comment in
`statutoryProvisions.ts`, two module headers, and a `SOURCING_NOTES.md` entry.

**The truth:** O. Reg. 303/24 **revoked Schedule I of O. Reg. 391/97** and
rewrote its s. 2 (1) so that "table" means the table set out in the **Federal
Child Support Guidelines**. There is one table. It has been one table since
2024-07-26. All six places have been corrected.

### The mechanism, which is the part worth keeping

The Ontario regulation's consolidation period reads **"from 2024-07-26"** while
the federal one is current to 2026-07-21. That difference was cited, in every
one of the six places, as proof of *separate amendment histories*.

**2024-07-26 is the date Ontario's table was abolished.** The single strongest
piece of available evidence against the conclusion was read as the evidence for
it — because nothing asked *why* the date was what it was. The regulation was
retrieved, and the sections cited from it were read. The question never asked
was what the amendment that produced this consolidation actually changed.

The failure is not "didn't read enough text". Reading more of ss. 3 to 9 would
not have helped; the answer was at line 885, in a one-line schedule stub, and
in a definition in s. 2 (1) that a reader looking for the amount provisions
scrolls past.

### The specific rule: trace the amendment

> **When a consolidation date or amendment marker is unexplained, find out what
> the amendment changed before building on the text around it.**

An amendment marker is not decoration and not a version stamp. `_eV<nnn>` in an
e-Laws URL, a "last amended" line, a consolidation period that starts on an odd
date, `O. Reg. 303/24, s. 1 (4)` in a section's citation trail — each is a
pointer to a change someone made on purpose, and the reason is knowable. This
is distinct from the `pendingReplacement` field, which covers amendments **not
yet in force**. This one was in force and complete, and nothing in the codebase
was looking for that case.

### 📌 An emphatic wrong claim spreads further than a quiet one

The instruction that produced the six copies was to flag the two-table problem
**prominently**, so a future author would hit it. It worked exactly as intended
— and because the claim was wrong, prominence is what propagated it into six
files instead of one. Cross-references compounded it: three of the six did not
restate the reasoning, they pointed at a header that carried it, so the error
gained citations without ever gaining evidence.

Worth knowing on both sides. When something is flagged prominently, the
underlying claim has to be load-bearing enough to carry the emphasis, and the
check for it should happen **before** the flag is duplicated, not after.

### 📌 The second instance, same shape: `head` truncation read as the whole list (2026-09-14)

**The wrong claim:** that `app/builder/page.tsx` had "two pre-existing eslint
findings" — an unused `localDraftWarning` and one `set-state-in-effect`.
Reported twice in the same session, once as a closing note and once as a
summary, both times as a complete enumeration.

**The truth:** it had **seven**. One more `set-state-in-effect`, two
`exhaustive-deps`, four `no-explicit-any`.

**The mechanism.** The command was `npx eslint app/builder/page.tsx 2>&1 | head
-12`. The `set-state-in-effect` message is eight lines of prose, so the first
error alone consumed most of the budget and `head` cut the rest. The output
*looked* complete — it ended mid-file with no marker, because `head` does not
leave one. Nothing in what came back said "there is more", and nothing asked.

`head` and `tail` were used throughout this session, correctly, to keep large
outputs out of context. The failure was not using them. It was **reporting a
truncated list as an enumeration** — "two findings", a closed set, when what
had actually been observed was "at least one, plus whatever `head` discarded".

### 📌 The fourth instance: one search term, absence read as absence (2026-09-14)

**The wrong claim:** that the contradiction notice is never rendered — reported
as a scenario-audit finding, with the flourish that
`app/case-timeline/page.tsx`'s own header claims to render it while the word
appears once in the file, in that comment.

**The truth:** it is rendered, at `case-timeline/page.tsx:303-316`, under the
name **`inconsistencies`**, fed by `findCaseEventInconsistencies` through
`GET /api/cases/events`. The section carries the comment "Contradictions.
Surfaced, never resolved."

**The mechanism.** `grep -rn "contradiction" app/case-timeline/page.tsx`
returned one hit, in the header. That was read as proof the behaviour was
missing. The question never asked: **does this thing have another name in the
code?** It did — the header itself lists `inconsistencies` among the fields it
renders, two lines below the sentence that was quoted as evidence against it.

A search proves what the search term matches. It never proves what exists.

This one would have been expensive in a specific way: it was about to be
written up as a defect of the same class as the two-table assertions — a header
claiming behaviour the code does not have — which would have put a false
example into the record used to justify a rule.

### Four instances, one habit

| | What was seen | What it actually was | Never asked |
|---|---|---|---|
| Consolidation date | `from 2024-07-26` | the date the table was revoked | *why* is this date what it is |
| `head` truncation | the first eslint problem | one of seven | *how many* are there |
| Mutation no-op | a passing check | a check against unmodified code | *did the edit land* |
| One search term | one hit, in a comment | the feature, under another name | *what else is it called* |

### 📌 The third instance: a mutation test that never mutated (2026-09-14)

**Nearly the worst of the three**, because it would have produced a green tick
on a check nobody had actually tested.

`FamilyStatusTriage` was added to `verifyMountConditions`'s declared list, and
the mutation test was to put it back under `!analysis` and confirm the check
went red. The `node -e` string replace did not match — CRLF against an `\n` in
the search string — so **the file was never modified**. The check then ran
against correct code and passed. In the terminal that is indistinguishable from
a mutation that was caught, and it was one keystroke from being reported as
"caught".

Re-run printing whether the edit landed:

```
changed: true
FAIL  FamilyStatusTriage: not gated on analysis-pipeline state
      gated on ["analysis"] via: [...]
```

A mutation test that silently fails to mutate is **a check that cannot fail,
wearing the costume of one that just did**. It is the exact defect this
codebase has spent the session hunting — `verifyCitedProvisions` firing on its
own comment, the candidate route reading a key nothing writes, the matcher
scoring 0/10 — arrived from the opposite direction.

### Five in one session, and four of them are one failure

The table above lists the first four. Not four accidents — one habit: **taking the
result of an operation as evidence without confirming what the operation
actually covered.** A date read without asking what produced it. A list read
without asking what was cut from it. A test result read without asking whether
the test had done anything. A search read without asking what it could not have
matched.

The fourth is the one that generalises furthest, because it has no operation to
confirm — nothing went wrong mechanically. `grep` did exactly what it was asked.
The gap was between **what was searched for** and **what was concluded**, which
no amount of confirming the command ran would close.

**The fifth, below, is not one of these four.** It is included in this section
because it produces the same end state — a green result establishing nothing —
by a different route. There the operation was confirmed, the output was
complete, and the assertion still never ran, because it sat inside a conditional
that was false. Confirming an operation is no defence against an assertion that
was never reached.

Worth holding both shapes in mind, because the habits that catch them differ:
the first four are caught by asking **what did this actually cover**; the fifth
by asking **what would this do if the interesting case did not occur**.

### 📌 The fifth instance, and a different mechanism: an assertion that never ran

**Different from the other four**, which is why it is worth its own entry.
Nothing no-opped, nothing truncated, no search missed a synonym. The code ran,
the command succeeded, and **the assertion was simply inside an `if` whose
condition was false**.

SC-1's evidence-citation guard, as first written:

```ts
const headingCount = await overview
  .getByText("Evidence to organize or confirm", { exact: true })
  .count();

if (headingCount > 0) {
  // ... every item must carry a (Source) link
}
```

It passed in **4.2 seconds**, and a pass there is indistinguishable from a run
where the heading never rendered and the entire guard was skipped. Green, fast,
and proving nothing — with no failure anywhere to indicate it.

The condition looked like defensive good practice: *the list may legitimately be
empty, so only check items when there are items.* But **the heading's presence
was part of what the spec existed to verify** — the defamation claim type
matching, and carrying sourced evidence content. Guarding on it made the thing
under test into the thing that decided whether the test happened.

Rewritten to assert the condition first, then the property unconditionally. It
now fails if the heading is missing — which is the conversation worth having —
and mutation-confirmed by stripping the source links: red, naming the item.

### The rule

> **An assertion nested inside a conditional is only a check when the condition
> is independently guaranteed. If the condition is what you are testing, assert
> it.**

The tell: ask what the test would do if the condition were false. If the answer
is "pass", it is not a check under those circumstances — and nothing will ever
tell you which circumstances the last green run was in.

This has a sibling already in the register: `verifyMountConditions` and
`verifyHarnessCoverage` both carry self-tests for exactly this reason — a
condition parser that silently found nothing, or a scan that matched no calls,
would satisfy every assertion built on top of it while establishing nothing.

### 📌 The sixth: a rename that touched one layer, leaving two searches that disagree

**A new direction on the negative-search rule**, and the one most likely to
recur, because the half-done state looks finished from either end.

`CaseContext.strengths` / `.weaknesses` fed the case dashboard. The section 3
sweep changed the **labels** — the dashboard has rendered them as *"Points
Supported by Evidence"* and *"Gaps to Address"* for some time — and left the
**field names** alone.

So the codebase held two answers to the same question:

| Search | Result | Conclusion it invites |
|---|---|---|
| `grep "weaknesses"` | `context.weaknesses`, `strategicWeaknesses`, `theory.weaknesses` | **unswept** — section 3 language throughout |
| `grep "Weaknesses"` in rendered text | "Gaps to Address", "Points Supported by Evidence" | **clean** — already fixed |

**Both are wrong.** The first over-reports: the content behind those names was
already recorded-vs-not, and rewriting it would have damaged correct work. The
second under-reports: the fields were still named as grades, and a reader
scanning for section 3 problems stops on a name.

### The rule

> **A rename that touches only one layer leaves two searches that disagree, and
> neither is evidence on its own.**

Where they disagree, the answer is in neither result: read the value's whole
path, from where it is computed to where it is rendered. A field can be
correctly named and wrongly rendered, or wrongly named and correctly rendered,
and only following it end to end distinguishes those.

### What it hid, and what the compiler found that no search did

Following the path turned up a consumer neither search had: **`courtPackageAssemblyEngine`**
built two strings for a settlement-conference package —
*"Strengths to consider for settlement: …"* and *"Weaknesses or risks to
address before settlement conference: …"*. Live section 3 language, in a
document assembled for court, and it surfaced only when the type was renamed
and `tsc` reported the break.

That is the technique this session already established and did not apply here
first: **change the type and read the compiler.** A grep is a starting point;
the compiler is the trace.

### The corollary for doing a rename

Rename the field, then let the compiler enumerate the consumers, then read each
one — because the ones that need wording changes are exactly the ones a search
for the new name cannot find and a search for the old name has already been
declared clean of.

### The widest rule in this section

> **A negative search result is evidence about the TERM, never about the
> feature.**

It is wider than the other three because it needs no tooling to go wrong and no
tooling to prevent. `head` can be paired with `wc -l`; a scripted edit can print
whether it landed; an amendment marker can be traced. This one is a reasoning
step with nothing mechanical in it: the command succeeded, the output was
accurate, and the conclusion did not follow from it.

Before concluding a feature is absent:

- **search the concept's other names** — `contradiction` is `inconsistencies`
  here; `readiness` was also `confidence` and once an unnamed expression
- **search the consumer, not the producer** — what would have to call it, what
  would have to render it
- **name the thing that would have to exist** if the feature did, and look for
  that instead
- or say what was actually established: *"a search for X returns nothing; I have
  not established that the feature is absent"*

### And this one was caught before it entered the record

Worth stating, because it is the only one of the four that did not cost
anything, and the reason is instructive rather than lucky.

It was **one commit from being used to justify the rule it would have
undermined.** The false finding was that
`app/case-timeline/page.tsx`'s header claimed behaviour the code did not have —
which would have been written up as a second example of the two-table shape, in
the same document that argues headers making unverifiable claims are a real
defect class. A fabricated example, in the register of real ones, supporting a
rule about not trusting partial evidence.

What caught it was re-reading the header before quoting it and noticing that the
sentence two lines below the one being quoted as evidence **listed the field by
its real name**. Not a tool, not a check — reading the whole of the thing being
cited rather than the part that supported the point.

That is the closing argument for this entire section. Three of these four were
caught after they had been stated, one before. The difference each time was
whether anything looked past the first piece of evidence that agreed.

### The general rule, which the other two instances produce

> **Any verification step whose own execution is not confirmed can pass while
> proving nothing.**
>
> Confirm the operation happened before reporting on its result.

Three specific forms, each with a cheap confirmation:

| Operation | Silent failure | Confirmation |
|---|---|---|
| Truncated output (`head`, `tail`) | the list ends with no marker | `wc -l`, or a formatter carrying its own totals — `eslint -f json` reports `errorCount` |
| String replace / patch | no match, file unchanged, exit 0 | print whether the content changed; or assert the mutated text is present before running the check |
| Reading a consolidated source | the date is shown, its cause is not | retrieve what the amendment did before building on the text around it |
| **Search for a named thing** | zero hits, which reads as "absent" | **a negative search result is evidence about the TERM, never about the feature.** Before concluding absence: search the concept's other names, search the consumer rather than the producer, or find the thing that would have to exist and check that instead. `contradiction` returned one comment; the feature was called `inconsistencies` |

The general test, applicable to a form not listed here: **ask what this step
would look like if it had silently done nothing, and whether that is
distinguishable from success.** Where it is not, add the confirmation. `exit 0`
is not confirmation — `sed`, `node -e` replaces, `grep` with no match under
`|| true`, and a mutation applied to the wrong path all exit 0 having done
nothing.

Note what the rule is *not*. It is not "stop using `head`" — reading a 200-line
output into context to count it is worse. It is not "stop scripting edits". The
requirement is on the **report**: describe what was actually observed. "The
first error is X; I have not counted the rest" is honest and takes the same
breath as the false enumeration.

### Can a check assert that a file header's claims are carried out?

Asked because the fourth instance was about to be written up as one: a header
claiming behaviour the code does not have, the same shape as the two-table
assertions. It turned out to be false — the header was accurate and the search
was not — but the underlying question stands, because the two-table case was
real: six files asserted something untrue, and nothing noticed.

**The general form is not expressible, and the reason is worth stating.** A
header comment is prose making claims in natural language about intent, scope,
history and rationale. "Four finished pieces had no screen" is a claim about the
past. "It renders only what the API produces" is a claim about a negative. "This
is the second table" was a claim about the world, not about the code at all —
no analysis of this repository could have falsified it, because the fact that
made it wrong lived in O. Reg. 303/24.

A checker would need to parse intent, and one that guesses would flag correct
comments, which is the failure mode CLAUDE.md section 5 exists to prevent.

**Two narrower forms ARE expressible, and both already exist here:**

1. **Declared properties with a maintained list** — `verifyMountConditions`
   (section 0c) and `verifyReachability`'s dormant list. The claim is moved out
   of prose and into a structure the check can read, with a required reason
   field so the prose survives alongside it. This works because the author
   states the property deliberately rather than a parser inferring it.
2. **Quotation fidelity** — `verifyChildSupportTableCard` checks that every
   passage a card presents as quoted appears in a vendored source, with the
   vendored file's own header stripped so the comparison is against retrieved
   text rather than someone's transcription. `verifyCitedProvisions` does the
   same for the provisions registry.

Both cover claims about **this codebase's own artefacts**. Neither could have
caught the two-table error, whose refutation was in an external instrument
nobody had retrieved — that one is covered instead by `verifyAmendmentTrails`
and the trace-the-amendment rule above, which is a process, not a check.

**So: no general check, and no attempt at one.** What the three specific
mechanisms have in common is that each asks the author to state a property in a
form a machine can read, rather than asking a machine to read prose.

### The same question asked generally: 9 untraced in-force amendments

`npm run test:amendment-trails` (`scripts/verification/verifyAmendmentTrails.ts`)
reads each vendored source, finds its consolidation year, and lists the
amendment citations **in the vendored text itself** from that year or the one
before — amendments to the very provisions this codebase quotes, made around
the consolidation it was cut from. All 14 vendored sources record a
consolidation or currency date. **Exactly one records what the amendment did**,
and only because it was corrected today.

| Vendored source | Untraced amendment | Citations |
|---|---|---|
| `oreg-258-98-cited-rules.txt` | **O. Reg. 3/25** | **18** |
| `oreg-258-98-cited-rules.txt` | O. Reg. 222/25 | 9 |
| `clra-cited-sections.txt` | 2025, c. 6 | 6 |
| `fla-cited-sections.txt` | 2025, c. 6 | 6 |
| `flr-cited-rules.txt` | O. Reg. 228/25 | 4 |
| `flr-cited-rules.txt` | O. Reg. 150/25 | 2 |
| `flr-cited-rules.txt` | O. Reg. 172/25 | 1 |
| `flr-cited-rules.txt` | O. Reg. 8/25 | 1 |
| `flr-cited-rules.txt` | O. Reg. 9/25 | 1 |

**O. Reg. 3/25 is the largest exposure by a distance** — 18 citations across
the Rules of the Small Claims Court, which is the main path this product
serves. Whatever it changed, it changed it in provisions already quoted to
users. It has not been read.

This is a **list, not a red line.** Tracing one costs a retrieval and a
judgment, and a check that stays red until someone does nine of them is a check
people switch off. It fails only when a vendored source has no consolidation
marker at all, or when an amendment already recorded as traced disappears from
the sources. Tracing an entry means retrieving the amending instrument, reading
what it did, and adding it to `TRACED` in the script with the answer.

Note what this does **not** cover: `pendingReplacement` on
`statutoryProvisions.ts` already handles amendments **not yet in force**. These
are in force and complete — which is the case nothing in the codebase was
looking for, and the case that produced the failure above.

---

## 0b. ⚠️ There is no readiness gate on the family path (2026-09-14)

**Probed, not reasoned about**, before building the child support screen:

| Probe | Result |
|---|---|
| Family `ClaimType`s | **0 of 22** |
| `SUPPORT_ELEMENT` ids appearing on any `ClaimType` | **0 of 8** |
| `evaluateReadinessGate` on a common-case child support state map | `draftAvailable: false`, blocker `no-confirmed-claim-type`, `totalElements: 0` |
| `elementsStillOutstanding` with 4 of 8 answered | correctly returns the 4 `not-yet` |
| Product consumers of `elementsStillOutstanding` | **none** — only verification scripts |

`readinessGate.ts` returns early on a null claim type, before it reads the
element state map at all, and its only source of elements is
`input.claimType.plaintiffElements`. `SUPPORT_ELEMENTS` is a separate array on a
module the gate has never heard of.

**The original worry was backwards.** Four skipped elements hold nothing —
because nothing gates. The real exposure is that wiring the child support screen
to `evaluateReadinessGate` would make the draft permanently unavailable, showing
a user "no confirmed claim type" when they have no claim type to confirm and
never will. That is the empty-forever shape found four times now: the candidate
surface reading a key nothing writes, the freshness banner that could never
fire, the matcher scoring 0/10 on prose, and this.

**Decided for v1: the family path does not use the gate.** The child support
draft is safe to produce incomplete — `"No figure recorded"`, the bracketed
placeholders and the `RECORDED AS NOT HELD` section exist for exactly that. This
is a real difference between the paths, not a shortcut: a Statement of Claim
full of bracketed placeholders is a pleading someone might file; a child support
draft saying "No figure recorded" is doing its job, because the figure is one a
court determines regardless. `verifyChildSupportIntake` asserts the screen does
**not** call `evaluateReadinessGate`, with the reason.

**Open: generalise the gate to take elements rather than a `ClaimType`.** That
is the right long-term shape. It was not done here because it changes a module
the whole Small Claims path depends on, with its own mutation-covered suite, to
serve a path that does not need withholding — the wrong trade to make inside a
UI build.

**Checked and cleared while probing:** `children-and-ages-recorded` is
`isNoQuestionNeeded = true`, which looked wrong for child support. It is not —
the FLA s. 31 question already asks each child's age and what they are doing.
The element stays because O. Reg. 391/97 s. 3 turns on the number of children
and whether one is the age of majority; the second question would be the
duplicate.

---

## 0c. Convert the builder's hydration gate to `useSyncExternalStore` — one file, not two

**Scoped work, not a lint cleanup.**

**CORRECTED BEFORE IT WAS COMMITTED.** The first draft of this entry scoped the
change to two files and said they used "the identical pattern". They do not, and
the difference is the whole point of the entry. Checked rather than assumed:

| File | `hydrated` is set | What it means | eslint |
|---|---|---|---|
| `app/builder/page.tsx:318` | bare mount effect, empty deps | React has hydrated | flagged (suppressed in `dd1923f`) |
| `app/_components/HomeLocationGate.tsx:63` | inside an async callback, after `supabase.auth.getUser()` | auth resolved **and** the saved draft loaded | **clean, 0 problems** |

`HomeLocationGate` is waiting on asynchronous external data, which is precisely
the case `react-hooks/set-state-in-effect` permits — "subscribe for updates from
some external system, calling setState in a callback". It is not a hydration
flag that happens to be spelled differently; it is a different thing wearing the
same variable name. `useSyncExternalStore` does not apply to it and it should
stay as it is.

**So the reason given in `dd1923f` for not converting the builder — consistency
with `HomeLocationGate` — was wrong.** They were never consistent. The real
reason to take care is narrower and still holds: it is a change to a file on
every path, and there is a specific property that must survive it.

**Related, and worth a line while someone is in there:** the builder's comment
says `HomeLocationGate` "already uses for this exact class of race". Same
purpose, different mechanism — a reader following that cross-reference expecting
the same shape will not find it.

### The race this defends, which must survive the conversion

This is the reason the flag exists, and it is easy to break while "cleaning up".

The intake gate renders the same server markup on the client's first paint,
**before React has attached its event handlers**. A province or city selected in
that window is a native DOM mutation React does not know about. Hydration then
reconciles the controlled inputs back to their still-blank React state and
silently discards the selection. The user typed something, saw it, and it was
gone — with no error, because nothing failed.

The defence is not a delay. It is that while `!hydrated` **the form is not
rendered at all** — the user sees "Preparing a private case start…" instead. The
inputs and their handlers come into existence together, after hydration has
committed, so there is no window in which one exists without the other.

Any replacement must preserve exactly that: the first client render, the one
that reconciles against server HTML, must produce the placeholder and not the
form.

### Why convert

`eslint`'s `react-hooks/set-state-in-effect` fires on the builder's gate, and it
is a **false positive**: empty dependency array, one boolean, set once, nothing
in the effect reading it, and a repeat call setting `true` over `true` which
React bails out of. No feedback path, no loop. The file currently carries a
suppression with that reasoning at the call site (`dd1923f`).

A suppression is the right holding position and the wrong resting one — it keeps
a correct-but-flagged pattern in the codebase for every future reader to
re-adjudicate. `useSyncExternalStore` expresses the same thing without an effect
and without a suppression:

```ts
const hydrated = useSyncExternalStore(
  () => () => {},   // never changes, so no subscription is needed
  () => true,       // client snapshot
  () => false,      // server snapshot — the render that matches server HTML
);
```

React uses the server snapshot for the hydrating render and the client snapshot
afterwards, which is the two-pass behaviour this gate already relies on, made
explicit.

### Why it was not done inside the commit that suppressed the rule

`app/builder/page.tsx` is on **every path**, and the change is to the code that
decides whether the intake form exists in the DOM at all. Getting it subtly
wrong — the client snapshot returning `true` on the hydrating render — removes
the guard while leaving every test that checks for the form still passing,
because the form would be there sooner rather than later. That is a change worth
making on its own, with the race in front of you, not as the tail of a commit
about a dropped warning message.

### Done when

- `app/builder/page.tsx` uses `useSyncExternalStore` and carries no suppression.
- Its comment no longer claims `HomeLocationGate` uses the same mechanism.
- `HomeLocationGate` is **untouched** — it lints clean and its async flag is the
  permitted case, not a variant of this one.
- A browser check covers the race itself rather than the implementation:
  **the intake form is not in the DOM until hydration has committed.** That is
  the property. `hydrated`, and `useSyncExternalStore` after it, are two ways of
  achieving it, and a check pinned to either mechanism would call a correct
  conversion a regression — the standing rule in CLAUDE.md section 5.

---

## 0d. ⚠️ A returning user hits the location gate again (2026-09-14)

**Scoped, not fixed — deliberately.** To be done with the other persistence
work, not on its own.

`setConfirmedLocation` is called from exactly three places in
`app/builder/page.tsx`: the not-sure guide hand-off (331), a matching local
draft (343), and the intake gate's own Continue button (1104). **The
existing-case load path never calls it.**

So opening `/builder?caseId=<id>&path=family` for a case that already exists
renders the location gate — province, city, "tell us what happened in your own
words" — to someone who did all of that when they created the case. Unless a
local draft happens to match, which depends on the same browser and the same
signed-in user.

Everything behind that gate is affected, because the whole structured-intake
section is conditioned on `confirmedLocation`: the family triage, the family
intake, the child support screen and the table card, the Small Claims mode
chooser and both its intakes, and the civil intake.

The fix is to populate `confirmedLocation` when an existing case loads, from
whatever the case already records about where it is. That is a persistence
question — what the case row holds, whether it is trustworthy, what happens when
it holds nothing — which is why it belongs with the rest of the persistence
work and not in a UI commit.

### The scenarios this blocks

`docs/SCENARIOS.md` landed 2026-09-14. Three of its scenarios cannot reach
their second session while this stands, and all three are marked there as
specifying work rather than checking it:

| Scenario | What it needs | What it hits |
|---|---|---|
| **SC-6** · Dog bite across three sessions | session 2 loads the case and shows prior answers | the location gate, before any of that |
| **X-3** · Full lifecycle, five sessions | every session after the first | the same |
| **FS-8** · Triage dismissed, then returns | session 2 must not re-prompt | the same, though the mechanism behind it is real — `triageStateFromStored` restores dismissal from `master_result.familyStatus` at `app/builder/page.tsx:445` |

FS-8 is the useful one to note: its underlying behaviour is **built and
correct**, and only the gate stands between a returning user and it. That makes
this a single fix unblocking three scenarios, not three separate pieces of work.

A red run on any of the three is therefore expected and is not a regression
until this is fixed.

---

## 0e. 📌 The builder's location gate had never been crossed by a browser test (2026-09-14)

**Found while writing the first child support spec.** Fixed by
`tests/browser/harness/builderGate.ts` (`3306b83`); recorded because the *shape*
matters more than the gap.

`app/builder/page.tsx` has its own location gate — province, city, and on every
path but Small Claims a story — and everything else on the page is conditioned
on the `confirmedLocation` it sets. **No browser test had ever passed through
it.** `family-adoption.spec.ts` reaches the family path through `/`, the
`HomeLocationGate`, whose button reads "Continue to Family intake"; the
builder's reads "Continue with Family questions". Two gates, similar markup,
and the harness only knew the first.

So the entire structured-intake section was unreachable from Playwright, **on
all three paths**:

| Path | Unreachable |
|---|---|
| Family | `FamilyStatusTriage`, `FamilyIntake`, `ChildSupportIntake`, `ChildSupportTableCard` |
| Small Claims | the mode chooser, `SmallClaimsIntake`, `GuidedSmallClaimsIntake` |
| Civil | `CivilIntake` |

### Why this is the same shape as the matcher and the candidate surface

Machinery that looked tested, with the thing it tests never reached:

| | What was green | What was never exercised |
|---|---|---|
| `matchClaimType` | mutation-covered unit checks | plain prose — it scored **0/10**, so every panel test had been reading model fallback output |
| `EventCandidateSurface` | a correct, mutation-covered parser | the route handed it `undefined`, so it resolved zero candidates from the day it shipped |
| The builder gate | eight browser specs, all passing | the gate itself, so nothing behind it had ever rendered in a test |

Each time the tests were real and the subject was absent. A passing suite says
what it exercised, never what it did not, and **the boundary it stops at is
invisible from inside it** — nothing goes red when a spec simply never arrives.

### The harness has now produced this shape twice, which makes it a place to look

Same session, same file tree:

| | Capability asserted | Evidence behind it |
|---|---|---|
| The builder gate | eight browser specs covering the app | none had crossed the gate, so nothing behind it had rendered in a test |
| `builderGate.ts` | "for any of the three paths", in its own signature and header | only ever run on family. The Small Claims branch used the wrong button text — the gate renders `"Continue"` there and `"Continue with X questions"` elsewhere — and was wrong from the moment it was written |

The second was found within hours of the first, by the first spec that used the
untested branch. Both are **a capability asserted in code with no evidence
behind it**: a `path` parameter with three values and one exercised, a suite
whose coverage was counted in specs rather than in screens reached.

**So the harness is a place to look, not a coincidence.** It is the part of the
tree where an untested branch is least likely to be noticed, because nothing
downstream fails when a helper is merely never called with a particular
argument — and because a harness's own bugs surface as failures in whatever
spec happens to use it next, which reads as a problem with the spec.

Worth a pass, not yet done: every exported harness helper with a parameter that
selects a branch, and which values of it have actually been run.

### What follows from it

- A browser suite's coverage should be stated as *screens actually rendered in
  a test*, not as spec count. Eight specs and four of the builder's nine
  surfaces unrendered is not a contradiction.
- The related question, not yet asked: **which other entry gates has no spec
  crossed?** `/document-workspace`, `/court-package`, `/trial-package`,
  `/settlement-conference`, `/evidence` and `/forms` each have their own entry
  conditions, and whether any spec reaches past them is unknown.
- `verifyReachability` cannot see this either. It walks the import graph; these
  modules are all imported. Reachability in the graph, reachability behind a
  mount condition (section 0c, `verifyMountConditions`), and reachability behind
  a test's entry path are three different properties, and the codebase now has
  checks for the first two.

---

## 0f. ⚠️ The child support draft's "Still to fill in" list omits a missing income (2026-09-14)

**Found by writing the no-income-figure browser scenario.** Not fixed — it is a
design question about what the placeholder list is for, and worth deciding
rather than patching.

A user who supplies **no income figure and no income documents** gets
`draft.placeholders === []`, so the "Still to fill in" panel does not render at
all. Probed directly:

```
placeholders: []
financialStatementForm: Form 13
```

The engine is internally consistent. `placeholders` collects the bracketed
`[... to be confirmed]` markers produced by the `value()` helper, and a missing
income does not produce one — `incomeBlock` renders it in place as **"No figure
recorded"**, which is a deliberate and better treatment of an absence than a
bracket. Both behaviours are right on their own.

**The consequence is wrong for the user.** The most significant thing they have
not supplied is absent from the list of things they have not supplied, and with
nothing else missing the panel vanishes entirely — so a draft with no income
figure in it presents as complete.

### The failure mode is a complete-looking draft, not a blocked one

Worth stating precisely, because it is the opposite of what a reader expects
from a gap of this kind, and it is why this is the priority item.

Nothing is withheld. The user is not stuck. They click the button, a document
appears, the "Still to fill in" panel is **absent** — which everywhere else on
this site means *nothing is outstanding* — and the draft reads as finished. The
words "No figure recorded" are in the body, one line among forty, in a document
they have just been told is assembled from what they recorded.

So the person most likely to be harmed is the one who reads carefully and
believes what the interface shows them. They take a draft to a court office, or
to a lawyer, or file it, having been given no signal that its central figure is
missing. **A blocked draft would have been safer**, which is the uncomfortable
part: the design decision that makes this path good — the draft is always
produced, absence is recorded rather than blocking — is what makes this failure
possible.

That is the test each option below has to pass: not "is the information
present" but **"would someone who reads their draft and thinks it is finished be
corrected?"**

### Three ways to resolve it, and what each means for that user

1. **Feed recorded absences into the same list**, so "an annual income figure"
   and "the income documents s. 21 requires" appear alongside bracketed items.
   *For that user:* the panel appears, they see the income named as outstanding,
   they are corrected at the moment they would otherwise conclude it is done.
   *Cost:* `placeholders` stops cleanly meaning "brackets in the text", and the
   two kinds of absence — never asked, and asked-and-unavailable — become
   indistinguishable in one list.
2. **A second list beside it.** RECORDED AS NOT HELD already exists as a draft
   *section* for elements the user said they cannot provide; unrecorded income
   is the same category arriving by a different route. *For that user:* the
   distinction survives — "you have not filled this in" reads differently from
   "you told us you cannot get this" — but two panels is more to read, and the
   one they need may be the second.
3. **Rename and re-scope `placeholders` to "what is not yet recorded"**,
   covering both. *For that user:* the panel's heading finally means what it
   already appears to promise. *Cost:* a rename reaching the draft engine, the
   screen, and `verifyChildSupportDraft`'s assertions.

The question underneath all three is whether "Still to fill in" means *brackets
in this document* or *things this application still needs*. It is currently the
first and reads as the second, and that gap is the defect — the options differ
mainly in what they cost, not in whether they close it.

**A fourth, not recommended but worth naming:** suppress the draft button until
an income figure is entered. It closes the failure mode and it is wrong — it
reintroduces exactly the blocking that section 0b rejected for this path, and
punishes the user who genuinely cannot get the figure, who is the one the
"No figure recorded" treatment was built for.

**Not asserted in the spec.** `child-support-scenarios.spec.ts` records the gap
in a comment and asserts nothing about it, deliberately: a spec encoding
today's behaviour there would make fixing this look like a regression — the
check-pins-a-current-value rule in CLAUDE.md section 5.

---

## 0g. The §2 boundary, in three places that were each decided separately

**One question, three independent answers, and they agree — which is worth
confirming rather than assuming.** Each is a spot where **a fact the user knows
sits directly next to a legal characterisation the site will not make.** They
were resolved months and sessions apart, none of them looking at the others.

| | The fact the user has | The characterisation the site will not make | Where |
|---|---|---|---|
| **DCPD bar** | whether the other driver was insured | whether Insurance Act s. 263 bars their action | `elementQuestionRegistry.ts:808`, element `dcpd-bar-does-not-apply` |
| **Tenancy classification** | what they rent and on what terms | whether the tenancy is residential (RTA/LTB) or commercial | `jurisdictionRoutes.ts:148`, `sc-route-residential-tenancy-ltb` |
| **Which province's table** | where the other parent lives | which province's table O. Reg. 391/97 s. 2 (1) selects | `ChildSupportTableCard.tsx`, `ChildSupportIntake.tsx` question 2 |

### What each actually did

All three landed on the same pattern, independently:

- **DCPD.** The element is named `dcpd-bar-does-not-apply` — a legal conclusion,
  and no fact question resolves it. The authored question asks the fact that
  usually decides it ("What do you know about the other driver's insurance?")
  and quotes s. 263 (1) (c) and s. 263 (5) (a) so the reader sees the rule
  rather than an answer. It may stay unresolved, safely: only `not-yet` holds
  the readiness gate, `allowUnknown` routes "I don't know" to `cannot-provide`,
  and the element is then listed under RECORDED AS NOT HELD rather than assumed.
- **Tenancy.** The route states plainly that it "answers the
  residential-vs-commercial classification question only", quotes RTA s. 3 (1)
  and s. 168 (2), and records that **where the parties disagree, either can
  apply to the LTB for a determination** — handing the classification to the
  body that makes it rather than making it.
- **Child support table.** s. 2 (1) (a) and (b) are quoted in full; the
  residence answer is recorded as the respondent's address and read by nothing.
  `child-support-scenarios.spec.ts` asserts that no part of the page tells the
  user which table is theirs.

**The shared answer: surface the rule, record the fact, name the body that
decides, never state the conclusion.** That is CLAUDE.md section 2's "who does
the applying" test, and three separate authors reached it three times.

### Why it is still an open item

The consistency is real but **accidental** — nothing enforces it and nothing
records it as the standing answer, so the fourth instance will be decided from
scratch too, and might land differently. Three known cases is enough to state
the rule once, in CLAUDE.md, with these as its worked examples.

Two things to settle when it is stated:

1. **Where the boundary sits for navigation.** The court classifier already
   routes on facts, which section 2 permits as topic surfacing. Selecting which
   province's table to *show* is arguably the same act — the difference between
   "here is the Alberta table because that is where they live" and "the Alberta
   table applies to you" is real but thin, and the second is what a user will
   hear either way. Currently all three refuse; whether that is the right
   setting or merely the safe one has not been argued.
2. **Whether the user should be told a body decides.** Only the tenancy route
   does this, and it is the most useful of the three: it tells someone stuck on
   a classification exactly where to take it. The DCPD and table cases have
   equivalents — an insurer's determination, a court's — and neither says so.

### Related, distinct

Not the same problem, kept separate deliberately: sections 0b (no readiness gate
on the family path) and 0f (the "Still to fill in" list) are about what a user
is *told is missing*. This is about what the site *knows and will not say*.

---

## 0h. 📌 A whole §3 structure that was load-bearing only in appearance (2026-09-15)

`civilEvidenceEngine` carried a complete evidence-strength apparatus:

- a type — `CivilEvidenceStrength = "strong" | "moderate" | "weak" | "missing"`
- a classifier — `assessStrength()`, keyword matching on the user's own
  description: *official, court, record, certified, signed* → **strong**;
  *screenshot, email, text* → **moderate**; *heard, told me, maybe* → **weak**
- a field computed on **every** evidence item, `CivilEvidenceLink.strength`

**Traced before removal, it existed to produce one sentence.** `"Strong
documentary evidence exists."`, pushed into a list when any item graded
"strong". Nothing else in `src/` or `app/` read `.strength` at all.

**And no consumer read that sentence.** Its only downstream use was
`civilStrategyEngine:103`, which takes `.length` of the containing list and
never its contents — so the sentence's entire effect was to make a count
non-zero, in exactly the cases where `"N evidence item(s) uploaded."` had
already done so. Deleting it changed no observable behaviour.

### Why the shape is worth recording

It looked load-bearing from every angle that is cheap to check. A named type, a
classifier with real logic, a field on a core structure, four call sites. A
reasonable reader — and a reasonable estimate of the work — treats that as
infrastructure with consumers, and plans a replacement predicate for the branch
it gates.

There was nothing to replace. The estimate was wrong in the safe direction this
time; the next one may not be.

> **Before planning a replacement for a §3 structure, trace what actually
> consumes it. Size is not evidence of use.**

Two cheap tells, both present here: the field was computed unconditionally but
read in one expression, and the one reader consumed a `.length` rather than the
values. Either is a sign the structure is wider than its purpose.

---

## 0i. Two dead surfaces that look like live paths

Recorded together because both are things a future session could reasonably
believe are wired, and neither announces otherwise.

| Surface | State |
|---|---|
| `buildCaseRecordSupabasePayload` (`casePersistenceEngine.ts:698`) | **Zero callers.** Grep across `src/`, `app/`, `scripts/` finds none outside its own file. It builds a full Supabase row — `id`, `user_id`, `case_context`, `evidence_packages`, `workspace_documents`, `sync_notes`, `diagnostics` — so it reads as the persistence path for the whole case record |
| `/api/cases` | Kept deliberately (§21), not deleted, but not on a live path |

**Why the first one matters more than a normal dead function.** It is the reason
a rename of `CaseContext` fields looked risky: a payload builder targeting a
database implies stored rows with those keys, which implies orphaned data and a
migration. In fact that path has never run, no migration defines those columns,
and the only persistence is `localStorage`. **The dead surface did not just sit
there — it made a safe change look dangerous**, which is a cost beyond the lines
themselves.

Not deleted: it may be the intended shape for the ca-central-1 move
(ARCHITECTURE.md). But an unwired payload builder for a table that does not
exist should say so at the top of itself, and currently does not.

---

## 1. Defects that could mislead a user

**Every item in this section is now closed.** Kept with outcomes rather than deleted, because two of them were misdescribed and one was a rumour that turned out to be true — that record is worth more than a clean slate.

### ✅ `twentyDaysElapsed` — FIXED (`3fdccdc`)
The fact-gate held an AI-inferred conclusion that a legal deadline had passed. Removed from the gate, from `KNOWN_FACT_FIELDS`, and from both extraction prompts; the question now asks for the service date and method and states the rule so the user applies it. **One correction to the original finding:** "mail or courier service isn't effective until the fifth day" is true of documents generally (r. 8.07(2), r. 8.07.1(2)) but **not of claims** — r. 8.07(3) and r. 8.07.1(3) expressly exclude a claim served under r. 8.03(7), and r. 8.03(8) makes that service effective on the date a signature verifies receipt. The deemed-service/r. 3.01 composition gap is real and still needs a licensee; it is recorded in the content rather than guessed.

### ✅ `defence-set-off-or-counterclaim` — FIXED (`3fdccdc`)
Now states it may be **issued** within 20 days after the day the defence is filed (r. 10.01(2)(a)), that issuing and filing are distinct, and the outer bound the entry had omitted: with leave, before trial or default judgment (r. 10.01(2)(b)). Re-sourced from an ontario.ca guide page to the regulation.

### ✅ r. 8.01(2) six-month service deadline — FIXED (`3fdccdc`)
Added as education topic `sc-topic-six-month-service-window`, gated on `claimFiled == true`. Placed there rather than as 22 duplicate `proceduralNotes` because it is not claim-type specific. Records that the Rules prescribe **no** method for computing a period expressed in months, rather than inferring one.

### ✅ Causation elements — WAS ALREADY FIXED; the register was stale
**This was not a defect when reported here.** Commit `c5cefe1` had already extended both `causation-vehicle-accident` and `causation-property-in-care` with the factual "but for" branch, sourced to Clements with paragraph-level pinpoints (paras. 8 and 9) on both claim types. Verified directly in Session 48 — no fix was needed and none was invented.

### ✅ `outOfScopeForums.ts` — FIXED (`0791237`)
Confirmed live and user-facing (`courtPathClassifier.ts` → `/api/classify-court-path` → `HomeLocationGate.tsx` renders `redirectMessage`). Six forums sourced to the provision conferring the jurisdiction — LTB (RTA s.3(1), s.168(2)), HRTO (Human Rights Code s.34), WSIAT (WSIA s.123(1)), CAT (Condominium Act s.1.36), LAT (Insurance Act s.280), Divisional Court (JRPA s.6). Three had the jurisdictional assertion **removed** instead: SBT (constituting Act not retrieved), IRB (federal, outside the acceptable-source domains), criminal (made no jurisdictional claim to begin with). **A real defect surfaced while sourcing CAT:** s.1.36(4) excludes lien disputes under s.85/86 and title disputes, so the old message would have wrongly redirected the unpaid-common-expenses claim type this repo already carries.

### ✅ The leave requirement — CONFIRMED, and the content gap FIXED (`56de7ec`)
The rumour was accurate, including the date. **CJA s.23(1.1)**, added by 2023, c. 12, Sched. 3, s. 1, in force **01/07/2024**: an action within Small Claims Court's jurisdiction shall not be commenced in the Superior Court except with leave. **s.23(1.2)** excepts a counterclaim, crossclaim or third-party claim where the main action was already in the Superior Court. `courtPathClassifier.ts` was checked and **does not** imply a free election — it never mentions the Superior Court, and both places that route users there concern claims *over* the limit. So the defect was omission, not error. Now stated in `sc-topic-monetary-limit`; confirmation recorded in `SOURCING_NOTES.md`.

---

## 2. Security and privacy

### ✅ `app/api/ai-case-partner/route.ts` — "cross-user data exposure" — RAISED, INVESTIGATED, DID NOT HOLD
**Found:** Codex review. **Investigated and corrected:** verification session, 2026-09-12.

**Kept deliberately rather than deleted, so nobody re-raises it from the same surface reading.**

The original entry read: *"Accepts a `caseId` and sensitive case context with no per-user authentication and no ownership verification. Potential cross-user data exposure. Highest-urgency item on this list."*

**The two literal facts are true: there is no authentication, and there is no ownership check.** The conclusion drawn from them is not.

- `runAiCasePartnerGateway` is a **synchronous pure function**. The entire `src/lib/case-system/ai-case-partner/` directory has **zero database access** — no Supabase client, no service-role key, no `fetch`, no OpenAI call. Grepped across the whole directory, not inferred.
- `caseId` is passed in and **only ever echoed back as a label**, into `createEmptyMemory(caseId)` in `conversationMemoryEngine.ts`. It is never used to look anything up.
- All case context arrives **in the request body**, from a client that loaded it through an authenticated path (`CourtAssistantChat.tsx:866` sends `caseMemory` containing `caseData`, `masterResult`, `evidenceData`, `strategyData`). Passing another user's `caseId` returns analysis of **the caller's own submitted text** with that id echoed back.
- `middleware.ts:70-79` gates **every** request including `/api/*` behind the `cs_site_access` cookie, with an explicit comment that API routes are deliberately not excluded *"an API route reachable without the gate would let someone bypass it entirely by calling the API directly."* Only `/site-access` and `/api/site-access` are exempt.

**There is no ownership check because there is nothing to own-check — the route reads no case data.** There is no cross-user exposure path.

**Adding auth here is a product decision, not a patch.** Neither live caller sends an `Authorization` header — `CourtAssistantChat.tsx` sends only `Content-Type`, and `/ai-test` sends no `caseId` at all (`mode: "sandbox-test"`). Adding a 401 breaks both immediately, and `INTAKE_STATUS.md` already records guest builder access as an accepted tradeoff. That is a decision about who the builder chat is for, not a security fix to apply quietly.

**If that decision is ever made, the model to follow is `app/api/cases/form-applicability/route.ts:158-164`** — `getAuthenticatedUser` then `getAuthenticatedOwnedCase`. Do not invent a second approach. (`getAuthenticatedUser`'s own doc: it *"never accepts a user id supplied in a request body or query string as proof of identity."*)

**Test gap, real and worth recording:** `verifyAiCasePartnerContext.mjs` exercises this route but **asserts nothing about auth or ownership** — its only 401 assertion is against case *storage*. So if auth is ever added, no existing test would catch a regression that removed it again.

### 🔒 Unbounded request payloads
**Found:** Codex review. **Confirmed** in the same verification session — this is the part of the original finding that is real.

- **`ai-case-partner`** accepts `caseMemory?: unknown` with **no validation and no size cap**, and passes it straight to `estimateJsonSize()`, which runs `JSON.stringify` over it. `sanitizeConversation` properly bounds the conversation (20 messages × 6,000 chars); `caseMemory` is bounded by nothing. **Nine routes define a `MAX_*_BYTES` cap; this one doesn't.**
- **`evidence-praser`** (yes — the directory name is misspelled) does `await file.text()` on an uploaded file with **no limit**, then runs a global regex over the whole string.

**Resource-exhaustion risk, behind the password gate. Not confidentiality** — `evidence-praser` parses only what the caller uploaded and hands it back; it takes no `caseId` and touches no database.

### 🔒 Eleven of 25 API routes have no authentication
**Found:** route-by-route survey, same verification session.

`ai-case-partner`, `evidence-praser`, `admin/scan-pdf-fields`, `classify-court-path`, `document-export`, `form-rules`, `rule-engine`, `rules/evidence`, `rules/issues`, `rules/procedures`, `scan-form-fields`.

**`admin/scan-pdf-fields` is the one worth looking at first**, because it sits under `/admin` and carries no auth at all. The rest are largely stateless utility or content routes, but none has been individually assessed.

All of them sit behind the `cs_site_access` gate, which is a real mitigation and not a substitute for per-route authorization where a route touches user data.

### 📌 A finding about findings
**Recorded because it should change how the next external review is weighed.**

The `ai-case-partner` entry above came from an external reviewer reading **one route file in isolation**. Refuting it required reading **three others** — the gateway (to establish there is no database access), `conversationMemoryEngine.ts` (to establish `caseId` is only echoed), and `middleware.ts` (to establish the gate covers `/api/*`).

The reviewer's two literal observations were correct. The severity conclusion was wrong, and it was wrong in the direction that produces urgent-looking work that isn't needed — it sat at the top of this register's suggested order.

**The lesson is not that external review is unreliable.** It surfaced a genuine unbounded-payload issue and a genuine no-auth inventory in the same pass. It is that **a finding about what a route *exposes* cannot be verified from the route file alone** — it needs the call graph and the middleware. Treat single-file severity claims as leads to verify, not conclusions to schedule.

---

## 3. Safety-boundary violations the §3 cleanup missed

### ✅ `app/api/case-summary/route.ts` + dashboard readiness score — BOTH RESOLVED
**Found:** Codex review. **Investigated, and the finding was half right.**

The report bundled two things as one. They were **unconnected systems** — no data path ran between them — and that mattered:

- **The dashboard readiness score was the real, live violation.** Displayed as "Readiness score: N/100", and **three** formulas fed it, all subtracting for risk, which CLAUDE.md §3 prohibits by name. Fixed in `dc3934c`: every subtraction deleted, the score replaced with a factual section count ("4 of 9 sections have information recorded"), and `readinessTone()`'s red/amber/green bar removed — a traffic light grades the case whatever the number behind it.
- **The route did emit that content, but had zero callers**, so nothing reached a user. Codex's claim that this was "a spot the sweep didn't reach" was **wrong**: `6129abd`'s own message calls it "the now-dead ... case-summary API route" and its diff edits the block directly above `evidenceStrengths`. It was seen and deprioritised, not missed. Resolved in `901716e` by deleting the route.

### The content audit was never seen
A read-and-report audit of all sourced content — name-vs-text mismatches, citations that don't cover their claim, missing scope limits, entries now citable to better sources — was commissioned. **The results never arrived** (the paste came through empty). It may have run. Worth re-running or locating.

---

## 4. Content gaps now closeable

26 judgments sit in `docs/sources/`. **Seven have now been used** (Garland, Red Deer College, Clements, Grant v. Torstar, Hill, Waldick, Machtinger, Honda) — this section previously said three, and was stale by four commits.

| Gap | Source available | Notes |
|---|---|---|
| ~~Defamation~~ | Grant v. Torstar, Hill | ✅ **DONE** in `d4a6fab` — responsible-communication defence (Torstar paras. 96-98, 126) added as a defendantConsideration; Hill para. 164 (general damages presumed from publication) and para. 137 (declining the U.S. "actual malice" standard) as a proceduralNote |
| ~~Occupiers' liability~~ | Waldick v. Malcolm | ✅ **DONE** in `b8931e6` — standard of care on snow/ice, the local-custom holding, and s.4(1) volenti as a defendantConsideration |
| ~~Employment — reasonable notice~~ | Machtinger, Honda | ✅ **DONE** in `69c7e93` — Honda para. 50 and the Bardal factors; Machtinger's void-termination-clause holding; plus ESA s.97(2), which bars a civil wrongful-dismissal action once an ESA complaint is filed |
| **Gift vs. loan** | ~~Pecore v. Pecore~~ | ❌ **THIS ROW WAS WRONG.** "Reopens now" contradicts an explicit, reasoned rejection in `CONTENT_AUDIT.md`, which read Pecore in full and said "do not cite Pecore here". Re-verified in Session 48 against the judgment: Pecore is about the **presumption of resulting trust in gratuitous transfers** (a father placing assets in joint accounts with his daughter), i.e. gift vs. resulting trust — who holds beneficial title to transferred property. That is a different question from gift vs. loan, which is whether a **repayment obligation** exists. A loan is neither a gift nor a resulting trust; it is a debt created by agreement. The gap stays open and Pecore does not close it. |
| Duty of care framework | Cooper v. Hobart | — |
| Standard of care | Ryan v. Victoria | — |
| School supervision | Myers v. Peel | Unbuilt claim type, roadmap Batch 3 |
| Employment — reasonable notice | Bardal, Machtinger, Honda v. Keays | Existing entries source ESA minimums only, which are a floor |
| Contract cluster | Sattva, Bhasin, Callow, Fidler, Tercon, Uber v. Heller, Cognos | Largest category, thinnest foundation |
| Limitations — discoverability | Grant Thornton, Pioneer v. Godfrey | — |

**Not closeable:** bailment's reversed onus. Ferguson and Punch are Ontario decisions; CanLII blocks retrieval and the SCC site doesn't carry them. The claim type correctly says it isn't asserting the doctrine.

**Still unsourced:** breach of contract elements. No single leading case exists — formation is textbook law. This is why it keeps getting cut, and no download fixes it.

### CJA sections identified but not sourced
ss. 23 (jurisdiction), 25 (summary hearings), 26 (representation), 27 (evidence — relaxed in Small Claims), 28 (instalment orders), **29 (limit on costs)**, 31 (appeals). Also 17, 19 (appeal routing), 21.11 (venue).

s. 29 matters most: "what does this cost me if I lose" is the question self-represented people most need answered, and there's a statutory cap.

---

## 5. Built but unreachable

- **Statement of Claim engine** — works, tested, wired to nothing. Two specs now exist (readiness gate, intake depth). Neither built.
- **Defendant-response questions** — committed with uncertain provenance, structurally verified, never run end to end. Every one of the 19 survey stories was a plaintiff.
- **Guided intake collects no name or address** — structurally absent from `IntakeFacts`. Not a gate blocker; is a filing blocker.

---

## 6. Designed, not built

- Deadline tracking, tiers 1 and 2 (`DEADLINE_TRACKING_DESIGN.md`)
- Courthouse tracking (`COURTHOUSE_TRACKING_DESIGN.md`)
- Institutional research guidance / FOI (`RESEARCH_GUIDANCE_DESIGN.md`)
- CanLII research guide (filed in `INTAKE_STATUS.md`)
- ~~Statement of Claim readiness gate~~ — **built** (`e32640a`), wired (`d132fe2`)
- ~~Claim-type intake depth~~ — **built** (`673266a`), wired (`f07b119`)

### 🔭 Family court — the consent order path (FUTURE WORK, not scheduled)

**Not for now. Not designed, not sourced, not scoped.** Recorded so the idea is not lost, and so nobody mistakes it for work that is ready to start.

The family court area has no route for someone who has **already reached a mutual agreement** with the other party and needs the court to turn it into a written order, rather than bringing a contested application. Two parts to the work:

1. **A route through the site** for a user who arrives with an agreement already made and needs it made into an order.
2. **Content surfacing that route where it fits**, because users who have agreed often do not know this path exists and assume any court involvement means a fight. That assumption is itself the thing worth addressing.

**Sourcing is entirely unstarted, and nothing here may be written from recall.** Every statement about what this path is, what it requires, which forms apply, or how a court deals with it must trace to a primary source under CLAUDE.md §2 — ontario.ca, ontariocourts.ca, ontariocourtforms.on.ca, or a source saved under `docs/sources/` with its provenance recorded. Read `SOURCING_NOTES.md` first; the e-Laws `.doc` fallback is likely to be needed, and the plain `_e.doc` / `_eV00N` current-versus-historical distinction applies.

**The §3 boundary is the hard part of this one, and should be settled in design rather than discovered in build.** The site may present what this path is and what the process generally requires. It may **not** tell a user whether their agreement is suitable for it, whether a court would approve it, or whether it is the right choice for them — all three are the system applying law to the user's facts, which is the "who does the applying" test failing. The line is the same one the intake depth spec adopted: *naming what a path generally involves is fine; signalling that the user's situation qualifies is not.*

**A known trap, given the second part of the work:** content that *encourages* a route sits closer to advice than content that merely describes one. "People who have agreed sometimes use this route" is information. "This sounds like it would suit your situation" is advice. Whatever surfaces this path has to stay on the first side of that, including in any copy written to counter the assume-a-fight problem — which is precisely where the pressure to be reassuring will push it.

---

## 7. Review backlog

**Everything is `status: "draft"`.** 22 claim types, 8 education topics, 6 defence concepts, 3 jurisdiction routes. None reviewed by anyone.

The DEFENCE_CONCEPTS entries are live in front of users and have never had a review pass. `familySafetyResources.ts` is fixed but still draft and still dormant.

This is the item that grows with every session of content work, and the only one that can't be closed by building.

---

## 8. Repo hygiene

- ⏸️ `PROJECT_DOCUMENTATION/` — **scanned clean, awaiting a decision.** 31 files, 689 KB (23 `.md`, 7 `.csv`, 1 `.json`), still gitignored at `.gitignore:156`. Scanned in Session 48 for secrets (API key, JWT, `service_role`, private key, password patterns) and personal data (emails, phone numbers, postal codes): **zero matches of either.** Content is Ontario court form provenance, routing and certification research built from public sources. It is safe to commit; whether 689 KB belongs in permanent git history is the site owner's call, not a hygiene cleanup. An off-repo backup exists (taken alongside the `npm run snapshot` fix).
- ✅ `repomix-output.xml` — **done.** The register said it "should be gitignored"; it already was, at `.gitignore:171`, and was never tracked. Only the 7.5 MB local artifact needed deleting, and it is regenerable.
- ✅ `cs-context.txt` — **deleted** (`17d5135`).
- ✅ Duplicate JSON snapshots — **deduplicated** (`17d5135`). Confirmed **byte-identical** by matching MD5 and by `cmp` reporting no differences, not by file size alone. Kept the earlier capture; removed the redundant re-run and the stale line in `COURTSIMPLIFIED_MASTER_BLUEPRINT.md`'s file listing.
- ⏸️ `/family/ontario` and `/ontario-civil` — **reported, not acted on.** Both exist and build (260 and 237 lines), are linked from nowhere, and contain **zero** sourced legal links (`sourceUrl`/`officialUrl`/`ontario.ca` all absent). That makes deletion low-risk on the sourcing side, but they are still whole pages and removal is the site owner's call. Recommendation: delete rather than relink — unreachable marketing-style pages that carry no citations are a §2 liability if anyone ever links them back in without review.
- `DEADLINE_TRACKING_DESIGN.md` citations into `app/forms/page.tsx` have drifted since the forms-messaging session edited that file
- **46+ commits unpushed**

---

## 9. Accepted limits — not bugs

- Rule 3 fixture, 1 of 50: "delivered" vs "delivery" token mismatch, non-stemmed matching. Deliberate.
- `HomeLocationGate` story-field duplication. Known, deferred.
- Guest safety check on the static form. Deliberate tradeoff — worth reconfirming before a stranger uses the site.

---

## 10. Coverage

22 claim types against ~150 mapped scenarios. Batch 1 has two remaining: unpaid wages / final pay / commissions, and moving company disputes.

`jurisdictionRoutes.ts` has 3 entries; the roadmap identifies 16 forums that should be recognized. Out-of-scope routing is cheaper than sourced claim types and arguably as valuable — a user told "this belongs at the LTB" has been genuinely helped.

---

## 11. Verification integrity — corrections to this session's own conclusions

📌 Three findings about the tools used to verify work, and two corrections to claims made earlier in this session. Recorded because each one made a piece of evidence look stronger than it was.

### ⚠️ The fixture harness could overwrite good `.actual.md` with degraded output — FIXED (`9c941aa`)

**The original claim was wrong and is corrected here.** `runFixtures.ts:124` was reported as a possibly-unconditional write. It never was: the write is downstream of an `await`ed `runStoryThroughPipeline`, and because the loop had no `try/catch`, a throw genuinely did skip it.

The real defect is narrower and worse. The pipeline **swallows API failures at two sites**, so a 429 does not reliably throw:

- `src/lib/case-system/intake/voiceLayer.ts:166` — catches everything and returns `fellBackToPlainText: true`.
- `src/lib/case-system/intelligence/courtSimplifiedBrain.ts:2027` — catches, logs only `errorName`, returns `null`; at `:2278` that null becomes `buildFallbackCognition()`, substituting canned placeholder prose ("Detailed analysis is not available right now…").

A run degraded that way **completes normally** with a non-null `analysisOutput`, so the harness wrote placeholder text over good fixture output — and nothing in the rendered file recorded it, because `renderActualMarkdown` prints the summaries but never `cognitionMode`, the flag that would have exposed it. Against CLAUDE.md §7's "never quietly let `.actual.md` drift out of sync with `.expected.md`", that is precisely the prohibited drift.

Fixed by `scripts/verification/pipelineGuards.ts` (`withTimeout` + `describeRunDegradation`), with the write now downstream of both. Pinned by `verifyFixtureHarnessGuards.ts`, which was mutation-tested — neutering the guard makes it fail — so it is not a check that cannot fail.

### ⚠️ The interception-measurement harness shared the same blind spot — the `3,2,5,7,5` baseline is unusable

`measureInterceptionRate.ts` caught a throwing journey and continued, contributing **zero interceptions** — indistinguishable from a journey that ran clean. It also had no timeout, and inherited the same silent-degradation hole: a 429 inside the brain's cognition call returns fallback text rather than throwing, so the journey "succeeds".

Both failure modes bias the measured rate **downward**, which is exactly what a successful prompt change is supposed to look like. Any run that brushed the daily quota under-reported and looked like an improvement.

**Consequence:** the `3,2,5,7,5` baseline (mean 4.40, spread 5) **cannot be used as the BEFORE side of any comparison.** It is not known to be wrong, but it is not known to be clean either, and there is no way to tell retroactively which runs were degraded. STEP 1's gate therefore requires a **fresh two-sided measurement** — new BEFORE *and* new AFTER, both under the guarded harness. Do not reuse the old numbers on either side.

Guards added in `bcd1020`; the harness now aborts rather than burning quota producing unusable runs, and writes `NOT A VALID MEASUREMENT` into the report if any journey failed.

### 📌 Request fan-out per journey — derived from the code

Recorded because every cost estimate this session was wrong until it was counted properly.

Per intake turn carrying new text, `orchestrateIntakeTurn.ts` issues:

| Step | Call | When |
|---|---|---|
| `runSafetyPass` | 1 | every turn |
| `extractIntakeFactsWithConfidence` | 1 | every turn |
| `classifyClaimTypeWithAi` | 1 | **only** when `matchClaimType()` finds nothing |
| `composeVoiceTurn` | 1 | only when a next question exists |

**3 logical calls per turn for a matched claim type, 4 for an unmatched one.** At the observed ~11.6 turns per journey, plus exactly one brain cognition call at the end:

| Unit | Logical calls | HTTP requests at the old 3× retry |
|---|---|---|
| One journey (matched) | **~35** | ~105 |
| One journey (unmatched) | ~46 | ~138 |
| Battery block — 16 journeys, 1 run | ~593 | ~1,780 |
| **`--runs=5` block — 80 journey-runs** | **~2,965** | **~8,900** |
| 3-fixture regeneration | ~105 | ~315 |

**Correction: the earlier "~680 requests per run" figure was wrong.** It counted a single pass of 16 journeys and ignored both the `--runs=5` multiplier and the SDK's retry amplification. A `--runs=5` block is roughly **3,000 logical calls**, not 680 — and was up to ~8,900 HTTP requests before `maxRetries: 0` (`d1efdcc`).

Cross-checked against the usage dashboard: 178 complete journeys ran on 2026-09-12 (battery 16, two `--runs=5` blocks at 80 each, 2 defendant journeys) ≈ 6,400 logical calls, against 13,543 observed requests — ≈ 76 requests per journey versus ~35 logical, which is the retry multiplier plus the hung block's two-hour retry storm.

### 📌 All interceptions originate in the brain call, none in the voice layer

Across both of today's blocks (10 runs, 16 journeys each), **all 41 interceptions carried a `cognition.*` context. Not one came from a voice-layer field.**

That is the justification for skipping `composeVoiceTurn` in any measurement design: the harness already discards the generated lead-in (it answers from a fixed dict keyed by question id), and the sanitizer has never caught anything there. Dropping it removes ~11 calls per journey (~35 → ~24) at no measured cost to what the interception count observes.

It also means the measured quantity is produced by **exactly one call per journey** — `runStructuredGptCognition` — which is what makes the frozen-intake replay design (option D) viable at ~1/35 the cost.

### ⚠️ The `maxRetries: 2` default — every call was up to 3 requests — FIXED (`d1efdcc`)

`openai@6.34.0` sets `this.maxRetries = options.maxRetries ?? 2` (`client.js:158`), and its `shouldRetry()` (`client.js:473`) contains:

```js
// Retry on rate limits.
if (response.status === 429) return true;
```

Nine call sites each built their own client with no options, so **every logical call was up to three HTTP requests**, and the request rate **tripled exactly as the daily cap was being reached** — the failure mode accelerated itself.

**Record this so it is never reintroduced: retrying a 429 against a *daily* cap can never succeed.** The quota does not replenish in the seconds between attempts, so a retry can only spend two further requests and deepen the deficit. Now `maxRetries: 0`, set once in `src/lib/case-system/openaiClient.ts`, which is the only place a client may be constructed.

### ⚠️ A full five-and-five block was never affordable in one day — a second reason the baseline is unusable

A full end-to-end five-and-five block is **~5,600 logical calls against a 10,000/day cap** — and was up to ~16,800 HTTP requests under the old retry default. It could not have completed within a single day's quota alongside any other work.

**Therefore the `3,2,5,7,5` baseline was in all likelihood collected across a cap boundary**, with some runs throttled and some not. This is a **second, independent reason it is unusable**, separate from the absorption bias already recorded above: even had failures been counted correctly, the five runs were not drawn under equivalent conditions. Two different defects, same conclusion — discard it and measure both sides fresh.

### 📌 Only one of the three Step 1 fixes is measurable by interception rate

From the per-journey interception data in `_RATE_before.md` and `_RATE_after.md` (10 runs, 41 interceptions):

- **`structuredCaseSummary`** — measurable. 13 of 16 journeys produced at least one, 34 of the 41 interceptions. The highest-yield journeys are C3, A4, A3, A2, C2.
- **`intelligenceSummary`** — **not measurable this way. Zero interceptions in either block.** That is not evidence it is clean: the finding against it was that it opens *"has a potential case against…"*, a phrase deliberately **not on the blocked wordlist**. The sanitizer cannot count what it does not match, so interception rate is structurally blind to this fix. It needs a different check.
- **`ElementProofStatus`** — not measurable at all. It is assigned downstream and never model-generated, so no journey can produce an interception on it. Type-level and static checks already cover it.

**Consequence for the gate:** a five-and-five interception measurement validates Fix 1 only. Do not read a clean result as covering Fixes 2 and 3.

### ⚠️ The §3 cleanup was never completed — the handoff's claim is wrong

**The handoff states that "every risk-weighted score, colour ramp and ordinal grade" was removed. That is not true.** `24e47c3` did this pass for the **element-status schema only**. Five separate instances of the same pattern are still live, and each survived for a different reason. None is caught by the sanitizer.

**1. A fifth score formula — `scoreFromConfidence()` / `buildReadinessScore()`**, `src/lib/case-system/dashboard/dashboardAdapter.ts:130` and `:325`. Converts ordinals to 0–95 numbers and averages **nine** of them, including `proofReadiness`, `credibilityReadiness` and `contradictionReadiness` — case-merits grades. The risk *penalty* was deleted this session (the comment at `:343` records it), but **the score itself survived**. It is user-facing: `app/dashboard/page.tsx:199` filters on `readinessScore >= 80` to show an "export ready" count. It evaded the earlier removal pass purely by being spelled `confidence` rather than `score`.

**2. A live colour ramp — `getReadinessTone()`**, `app/court-package/page.tsx:94`, applied to a card at `:305`. Green when the readiness string contains "ready", amber when it contains "risk", "gap" or "missing". It survived because it keys on **strings**, not a numeric score.

**3. The cognition prompt still asks the model to grade the case.** `claimClassifications[].score` (0–100), `rejectedFalsePositives[].score`, `evidenceIssueLinks[].strength`, `formRecommendations[].confidence`, and — most directly — `evidenceIssueLinks[].explanation`, whose instruction reads: *"Explain why the current proof is weak, developing, or stronger."* The prompt asks for a weakness characterisation in words.

**4. The sanitizer cannot see numbers.** `sanitizeCognitionOutput` (`caseStrengthLanguageValidator.ts:205`) tests `typeof raw === "string"` and returns everything else untouched. `score: 70` passes through entirely unexamined. No wordlist can ever catch it — this is a shape problem, not a vocabulary problem.

**5. `assemblyConfidence` renders `strong` / `moderate` / `weak` on the user's own evidence** — `evidenceAssemblyEngine.ts:26`, rendered at `app/evidence/page.tsx:618` as a badge reading e.g. "WEAK confidence". The computation (`confidenceFor`, `:271`) only counts how many metadata fields were filled — 5+ of 7 → "strong". **It never inspects evidential weight, but the label says it does.** `/evidence` is reachable in one click from the builder's "Organize evidence" button, so this is shipping, not latent.

**The lesson for any future pass:** every one of these evaded a field-name or wordlist check. A grade is a *shape* — an ordinal drawn from a fixed ladder, or a bounded number — and that is what has to be detected. See the structural-check proposal filed with this entry.

### ⚠️ The assistant route was passing 18,000 characters of unfiltered JSON to a free-text model — FIXED, then the ROUTE WAS DELETED

> **CORRECTION (2026-09-14). `/api/assistant-chat` had no caller and has been
> deleted.** The reachability sweep found it: `CourtAssistantChat` posts to
> `/api/ai-case-partner`, not here, and nothing in `app/` or `src/` referenced
> this route. So the 18,000-character leak described below was real in the
> code and reached no user, because the code never ran.
>
> **A correction to a claim made in this session's own analysis:** while
> scoping `confirmedEvents`, this route was described as "the single app
> entry" to `runCourtSimplifiedBrain`. That was wrong. It was *an* entry in
> the source and *no* entry in practice. The brain's only live entry is
> `analyzeSmallClaimsWithBrain` via `/api/small-claims/analyze` — so the
> `confirmedEvents` wiring in `aacf63c` does cover the only live path, but not
> for the reason given at the time.
>
> `verifyAssistantContext.ts` was deleted with it: a whole suite whose only
> subject was a dead route.
>
> **What did NOT move with the deletion.** `validateCaseStrengthLanguage` was
> applied at this route and at no other app route, so no API route applies it
> now. It is still applied inside the library, at `courtSimplifiedBrain:1134`
> and `intake/depth/slots.ts:122`, both of which are live. The live
> `/api/ai-case-partner` path calls no model at all — there is no OpenAI
> import anywhere under `ai-case-partner/` — so its answer is assembled
> deterministically by engines, which the runtime-string sweep (section 28)
> covers. Worth re-checking if that ever changes.

`/api/assistant-chat`'s context block ended with five raw dumps:

```
MASTER_RESULT SNAPSHOT:       safeJson(body.master_result, 5000)
CASE_DATA SNAPSHOT:           safeJson(body.caseData, 3500)
EVIDENCE_DATA SNAPSHOT:       safeJson(body.evidenceData, 3500)
STRATEGY_DATA SNAPSHOT:       safeJson(body.strategyData, 2500)
WORKSPACE_DOCUMENT SNAPSHOT:  safeJson(body.workspaceDocument, 3500)
```

`JSON.stringify` over whatever the component passed — so **any field added to any engine reached a free-text model with nobody deciding it should.** The curated fields above them were chosen carefully; these bypassed that entirely.

**What was in there.** On the family path `master_result` carries `familyEvidence`, whose every item has `strength` and **`strengthScore`** — the 0–100 grade from `familyEvidenceEngine.ts:253` — plus `familyMasterResult.confidence`, the **high/medium/low** from `determineConfidence()`. `strategyData` carried `litigationRisks` with severities. `caseData` carried the entire `analysis` object.

**This is why "not rendered in the UI" was never a sufficient answer to whether a §3 value reaches the user.** Both family score formulas were reported as not rendered. They were being handed, in full, to a model that writes prose.

**The rule this establishes: free text has no field paths.** Every mitigation this project has built — `sanitizeCognitionOutput`'s path-walking, the field-name checks, the ordinal-ladder detectors — operates on *named fields in a structured object*. A chat reply is one string. Once the model has been given a number, nothing downstream can stop it saying the number. **No field-level check can ever cover this surface. Only what enters the context can.**

**Fixed** by replacing all five with `buildUserAccountContext()`, an explicit allowlist carrying only the user's own account (`facts`, `timeline`, `evidence`, `goal`, `urgent`). A new engine field cannot reach the prompt unless someone adds it there on purpose. `risk.severity` removed. `validateCaseStrengthLanguage` now runs on the output — falling back to the deterministic answer rather than a blank bubble.

**The floor is a floor.** The validator tests strings against 27 substrings: it cannot see numbers, and *"you'd likely be looking at around $600 a month"* passes it cleanly. Pinned by `verifyAssistantContext.ts`, mutation-tested.

### ⚠️ Six risk-weighted score formulas have now been found live, not four — and more remain

The handoff records four score formulas removed. **Six have now been found.** The two additional ones were both live, both user-reachable, and both missed by every earlier pass:

**Fifth — `scoreFromConfidence()` / `buildReadinessScore()`** (`dashboardAdapter.ts`), removed in `5210908`. Averaged nine ordinals, reached the user through the dashboard's `readinessScore >= 80` card. Missed because it was spelled `confidence`, not `score`.

**Sixth — `confidenceFromScore(averageScore - penalty)`** (`elementProofEngine.ts`), removed in `5210908`, where:

```
penalty = (not-recorded elements × 12) + (contradicted elements × 20)
```

That is a **risk-weighted merits score of exactly the kind §3 names** — it takes the user's own case, scores it, and subtracts points for each gap. It was missed because it had no `score` in its name at all: it surfaced as a field called `overallProofStrength`.

### ⚠️ Three §3 structures remain live and untouched — including three more scoring formulas

Not fixed, deliberately out of scope for `5210908`, and each verified live at the time of writing:

**1. `strategy.{strengths, weaknesses}`** — `courtSimplifiedBrain.ts:1627` and `dashboardAdapter.ts:400`. A whole strengths-and-weaknesses structure over the user's case. `5210908` removed only the proof-analysis inputs to it; it is still fed by `factPatternAnalysis.strongestPatterns`, `evidenceIntelligence.strongestEvidence`, `authorityReadiness.strongestAuthorityCount` and others.

**2. The credibility scores** — and these are worse than a type declaration. `credibilityRiskEngine.ts:290-303` **computes all three**:

```ts
judgeConcernScore        = round(overallScore * 0.9)
crossExaminationRiskScore = round(overallScore * 1.05)
settlementPressureScore   = round(overallScore * 0.85)
```

§3 names *"predictions about judges"* and *"settlement pressure"* explicitly. Worse, `dashboardAdapter.ts:422` emits `settlementPressureScore` as **literal user-facing text**: `` `Settlement pressure score: ${...}.` `` inside `settlementConsiderations`. Note the irony — the comment eight lines above it, at `:414`, correctly refuses to generate `likelyJudgeConcerns` as a §3 violation, while the same function ships a settlement-pressure number. **These are three further scoring formulas, so the true count of formulas found live in this codebase is nine, not six.**

**3. `systemScore` / `calculateDashboardSystemScore()`** — `dashboardEngine.ts:460`, consumed at `:824`.

### 📌 The handoff's "who does the applying" claim is unverified, and on this session's evidence wrong

The handoff states that the "who does the applying" boundary held consistently across ~70 commits. **That claim was never verified, and this session's evidence contradicts it.** Nine scoring formulas, a colour ramp, a strengths/weaknesses structure, an ordinal badge on the user's own evidence, and a settlement-pressure number in user-facing text were all live while that claim stood.

**The common cause is method, not diligence: every prior removal pass searched by name.** That is why each one produced a clean report on a dirty codebase:

| What was missed | Why the name search failed |
|---|---|
| `scoreFromConfidence` | spelled `confidence`, not `score` |
| `overallProofStrength` | the formula had no name at all — it was an expression |
| `getReadinessTone` | a colour, not a number or a word |
| `assemblyConfidence` | the *label* was the violation; the computation was innocent |
| `event.confidence` | a hardcoded constant, so no formula existed to find |
| `settlementPressureScore` | correctly named — and still shipped, because nobody searched |

**Standing conclusion for any future pass: a grade is a shape, not a name.** An ordinal drawn from a fixed ladder, a bounded number, or a colour derived from either. Until a check detects grades structurally and is mutation-tested against every instance listed here, **no report that this codebase is §3-clean should be believed — including this one.** The count went four → six → nine within a single session, entirely by looking harder.

### ⚠️ `noQuestionNeeded` elements hold the readiness gate — and attestation makes the user lie

Found by the live batch (stories L1, L4). An element marked `noQuestionNeeded` — a jurisdictional condition like `amount-within-jurisdiction-personal-loan`, checked against the amount already captured, explicitly *"not a fact the user narrates"* — is correctly skipped by `selectDepthQuestions`, which leaves it `not-yet` in the element state map. The readiness gate holds on `not-yet`. So:

```
L1: blockers -> elements-not-yet: amount-within-jurisdiction-personal-loan
L4: blockers -> elements-not-yet: amount-within-jurisdiction-contractor
```

**The only way through is for the user to attest "I don't have this" about a jurisdictional test.** That is incoherent — it is not a thing the user holds — and it records a false `cannot-provide` in the case file.

The gate should treat `noQuestionNeeded` as resolved (or exclude those elements from the count entirely). Not fixed; the fix is a one-line change in `evaluateReadinessGate` plus a decision on whether such elements appear in `totalElements` at all.

### ⚠️ The suppression filter is producing false `provided` states, not just unasked questions

The over-suppression cost recorded against `alreadyCovered` was framed as "one unasked question". The live batch shows the consequence is worse: a suppressed element is recorded **`provided` via `user-story`** and feeds the readiness gate that way. Every instance observed so far is a false positive:

| Element | Fired on | The user's actual words |
|---|---|---|
| `work-caused-damage` | `redo` | "I had someone in to **redo** the tiling" *(hiring, not damage)* |
| `loss-amount-contractor` | `cost` | "I want what it **cost** me to put right" *(not how the amount was worked out)* |
| `amount-remains-unpaid-personal-loan` | `payment` | "she was behind on her car **payments**" *(nothing to do with repaying the loan)* |
| `existed-agreement-contractor` | `hired` | "I **hired** a man to put new flooring down" *(not what was agreed)* |
| `loss-amount-contractor` | `paid` | "I have **paid** him most of it already" *(payments made, not the loss claimed)* |

**Five for five.** The gate then opens on elements the user never addressed, which is a different and more serious failure than a missing prompt. `alreadyCovered.ts`'s header already explains why token matching cannot answer "did the user supply this element's fact"; this records what that costs downstream.

### 📌 `sc-safety-check` is asked of everyone, and nothing reads the answer

**What governs it:** the question has **no `appliesWhen`**, so it always applies. `phase: "sensitive"` sorts it last via `PHASE_ORDER` in `selectQuestions.ts:33`. It has **no `capturesField`**, and there is no safety field in `KNOWN_FACT_FIELDS`.

**Nothing consumes the answer.** A repo-wide search for readers found only two comments referring to a past bug. The user's reply is not stored in `IntakeFacts` and is read nowhere. It costs one turn (~3 API calls) to produce nothing.

**`runSafetyPass` already does this job, on the opening story, on every turn with new text.** It is a real classifier with a carefully-written prompt returning `immediate-danger` / `distress` / `clear`, with explicit instructions distinguishing current threat from past violence and from hyperbole. So the trigger can be folded into a call **already being made — zero new calls**, and the question disappears for most users, *saving* ~3 calls per journey.

**One gap:** `runSafetyPass` classifies danger, not relationship. A calm mention of an ex-partner would be `clear`, so the domestic/intimate-partner trigger is not covered today. Closing it means extending that call's JSON schema with an additional field and criteria — still the same single call, no new request.

**Bias — the inverse of the suppression filter, and it should be stated that way.** A false negative means not asking someone who needed asking; a false positive costs one extra question and ~3 calls. The errors are asymmetric in the opposite direction from `alreadyCovered`, so the judgment should be biased **toward asking**.

**Sequencing caveat:** because nothing reads the answer today, asking currently has near-zero benefit and only cost. Deciding what the answer is *for* should come before tuning the trigger — otherwise the work makes a question that does nothing slightly cheaper.

### 📌 The voice lead-in repeats itself, and costs ~29% of a journey's calls

Observed in story L5: five of eight lead-ins told the user some version of *"it sounds like you're still figuring out some details"* — to a user who had just answered "I don't know" eight times. Three consecutive turns opened near-identically. L1 repeated *"Thank you for sharing that information about your situation regarding the loan repayment. It sounds like this has been on your mind for a couple of months now"* three times in near-identical form.

**The cause is the prompt plus statelessness, not the model.** `voiceLayer.ts`'s SYSTEM_PROMPT rule 1 instructs it to *"Restate ONLY what is in the facts you were given"* — so it restates the accumulated facts **every turn**. Each call is independent: it receives `(facts, next question)` and nothing about what it has already said, so it cannot avoid repeating itself. Facts accumulate slowly, so consecutive turns restate near-identical content. When the facts consist of "I don't know" answers, rule 1 compels restating the user's own uncertainty back to them.

**Does it earn ~10 requests per journey?** On this evidence, **no, not as designed.** Rule 3 forbids it from including the question, rule 1 forbids new facts — so by construction the lead-in carries no information the user does not already have. That is ~10 of ~34 calls, **roughly 29% of a journey's spend**, on decorative text whose failure mode is worst for the least confident users.

Four options, cheapest first: (a) remove it — saves ~29%; (b) generate one lead-in at the start rather than per turn — 1 call instead of ~10; (c) pass prior lead-ins so it can vary — same cost, better output; (d) a small reviewed set chosen deterministically — zero calls. Not changed; this is a product-voice decision, not a defect fix.

### ✅ Suppression: removed (option D), and the confirm-step successor (option B) measured and rejected

The `alreadyCovered` filter is **gone** (`0244e91`). It suppressed a depth question on a single keyword *and* recorded the element as `provided`, so the gate treated it as resolved, the user never saw it, and the draft was assembled as though they had supplied the fact. Five for five wrong in the live batch.

**Option B — suppress but record a distinct `possibly-covered` state the user confirms — was scoped, then measured before building.** Run offline against all 12 stories from this session (8 live batch + 4 paraphrase), zero API calls:

| Threshold | Flagged / askable | Correct |
|---|---|---|
| 1 term | **6 of 16** | 0 — all six are the known false matches, plus one more |
| 2 terms | **1 of 16** | 0 — the single firing (`loss-amount-contractor` on "cost" + "paid") is also wrong |

**There is no threshold at which it fires often and correctly.** At two terms it fires once in twelve stories, is wrong when it does, and therefore saves zero calls — in exchange for a fourth state threaded through `ElementStateMap`, the gate, the attestation surface, the draft and their suites.

**Recommendation taken: leave D standing, do not build B.** Rejected on the numbers, not on principle.

One caveat recorded with it: **6 of the 12 stories could not fire at all**, because their claim type has no authored depth questions. If authoring expands to the remaining 18 claim types the firing rate will rise — but the mechanism is unchanged, so the false-positive rate rises with it. Re-measure before revisiting, rather than assuming more coverage makes the idea work.

### 📌 Depth-question coverage: 4 of 22 claim types — the other 18 degrade by design

Authored depth questions exist for **four** claim types only:

| Claim type | Elements | Authored | noQuestionNeeded |
|---|---|---|---|
| `sc-claim-unpaid-debt-services` | 3 | 3 | 0 |
| `sc-claim-contractor-damage` | 4 | 3 | 1 |
| `sc-claim-defamation-libel-slander` | 4 | 2 | 1 |
| `sc-claim-personal-loan-between-individuals` | 3 | 2 | 1 |

**The other 18 claim types have zero authored depth questions.** That is the design working, not a gap in it: `CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md` §1 makes an unauthored element fall back to the readiness gate's attestation prompt — the element's own `name`, `plainExplanation` and `evidenceCategories` — so it degrades to **exactly today's behaviour, never to a generated question**. That is what makes the feature incrementally shippable.

**Authoring the remaining questions is unscoped work.** The honest size, from the correction recorded in `elementQuestionRegistry.ts`: all **75 element ids are distinct**, so keying by id yields zero reuse, and the recurring jurisdictional names are exactly the `noQuestionNeeded` category needing no authoring. Real reuse among askable elements is 3 names across 6 entries. So the remaining burden is roughly **55 authored questions**, each reviewed content under CLAUDE.md §2 where it states a legal fact.

Recorded so the 4-of-22 figure is not rediscovered by a future session reading "the depth layer is built" and assuming it covers the catalogue.

### 📌 The OpenAI cap is **not** a project-level RPD override — hypothesis unconfirmed

An earlier conclusion in this session held that the ~100 requests/day ceiling came from a custom project-level rate limit, inferred from a header mismatch (`x-ratelimit-limit-requests: 10000` alongside `remaining-requests` tracking a ~100 scale). **That inference does not hold.** The project rate-limit page lists **TPM and RPM only — there is no RPD row on any model**, and `gpt-4o-mini` inherits org values exactly. There is no project-level override to raise.

**Leading hypothesis, unconfirmed:** ordinary daily consumption against the org-level **10,000 RPD** cap. A single measurement run costs roughly 680 requests (16 journeys × ~11 turns × 3–4 calls/turn), and a three-fixture regeneration roughly 130, so a heavy session can plausibly approach that ceiling.

**Unresolved and not to be papered over:** this does not explain the observed `remaining-requests` going *up* (20 → 75 across ~8 minutes while 5 requests were spent), which suggests a rolling window rather than a fixed daily counter. Two samples cannot characterise it. **Pending evidence: the OpenAI usage page**, which is the only thing that settles actual consumption. Until then, treat the ceiling as real and unexplained rather than diagnosed.

---

## 12. Family engines — flagged in the section 3 audit, needing a decision

The family engines had never been audited before this session. Two score
formulas were removed (`scoreEvidence`, `determineConfidence`) along with the
`FamilyEvidenceStrength` ladder, `judgeReadySummary`'s two grading lines and a
dead `severity` ordinal. `npm run test:family-no-scores` pins all of that.

These were found in the same pass and **deliberately left alone** — each needs a
call, not a silent edit:

**a. `credibilityRisks`** (`familyStrategyEngine.ts:389`,
`familyAiIntakeNormalizer.ts:510`, consumed by `familyFormRoutingEngine.ts:495`
and `familyAffidavitNarrativeEngine.ts:729`). Emits *"Emotionally charged
wording may reduce credibility if not tied to specific evidence."* That predicts
how a reader will receive the user's material, which reads as a merits judgment.
It is also, in substance, ordinary drafting guidance of the kind the platform
exists to give. The question is whether "may reduce credibility" can be restated
as a fact about the document rather than a prediction about its reception.

**b. `FamilyEvidenceGap.priority: "critical" | "important" | "helpful"`**
(`familyEvidenceEngine.ts:71`). This ranks *missing* evidence, not the user's
case, and some entries are genuinely procedural (a form cannot be filed without
the disclosure). But "critical" is still an ordinal the engine assigns to the
user's situation. Either ground each level in a rule that requires the document,
or drop the field.

**c. `FamilyNarrativeParagraph.supportLevel`** — `"supported" |
"partially-supported" | "unsupported" | "needs-review"`. This is arguably the
allowed shape already: it records whether a recorded evidence item matches the
paragraph. Two things spoil that. `supportLevelForText` returns `"needs-review"`
when the user's own wording contains "i think" or "maybe" — a credibility read,
the same one removed from `scoreEvidence`. And `"partially-supported"` is
returned whenever *any* evidence exists, matched or not, which makes the middle
rung meaningless.

**d. `judgeImpact`** (`familyEvidenceEngine.ts`, `buildJudgeImpact`). Generic,
category-level statements ("Helps the judge understand what orders already
exist"), not applied to the user's facts, and **currently read by nothing**. One
entry — "financial credibility" — does grade. The name asserts knowledge of what
a judge will weigh.

**e. `FamilyNormalizedIssueScore` and the `*Scores` locals** in
`familyAiIntakeNormalizer.ts` (`caseTypeScores`, `parentingScores`,
`supportScores`, `safetyScores`, `propertyScores`, `primaryConfidence`). These
are **topic-detection** confidences — navigation, the same class as the Small
Claims court classifier, not a grade of the matter. `verifyFamilyNoScores.ts`
exempts this file explicitly and says why. Left as-is deliberately.
`primaryConfidence` is now unconsumed: `determineConfidence` was its only
reader.

---

## 13. Small Claims amount question — a design direction

**Not scheduled. Not designed. Recorded so the shape is not lost.**

### The problem, observed

Intake asks *"What is the total dollar amount you are claiming?"* In the
eight-story live batch, the honest answer from a user who knows nothing about
this was **"I don't know what it would come to."**

That is the normal answer, not an outlier. The question asks for the *output* of
work the user has not done, at the point where they are least equipped to do it,
and a number given under that pressure is a guess the rest of the intake then
treats as a fact.

### The better shape

Help the user build the addable pile from their own documents, rather than
asking for a total upfront. Receipts, invoices, repair quotes, records of lost
income, bills paid — the out-of-pocket amounts they can point to a document for.

**The user totals it. The site records the items and what each is evidenced by.**
That division matters: it is the same recorded-vs-not partition used by
`elementProofEngine` and by the family evidence engine's
`completeEvidence` / `incompleteEvidence`, applied to money. An item is either
evidenced by a document the user can name, or it is not.

### Where this stops, and why the line is sharp

Damages that **cannot be added up from documents** — pain and suffering, loss of
enjoyment, reputational harm — are assessed by reasoning from what courts have
awarded in comparable cases.

That is assessing what a court would do. It is the CLAUDE.md section 3 line,
and it fails twice over:

1. It grades the user's specific case against other cases.
2. It requires case law this platform **cannot retrieve** — CanLII blocks
   automated fetching, and synthesizing a range from decisions we have not read
   is precisely what section 2 excludes.

**The site records what the user can document. It does not estimate the rest,
and it does not suggest a range.** Not a band, not a "typical", not a
"claims like this often". The absence has to be stated to the user plainly, or
they will read the documented subtotal as the whole answer — which is its own
kind of misinformation by omission.

### Constraints that belong in the education layer, not in any calculation

These are factual and citable. They inform; they do not compute.

**a. The Small Claims monetary limit — sourced, but the citation is currently
incomplete.** `claimTypes.ts` states "$50,000" in at least ten places and cites
`90c43_e.doc` (the Courts of Justice Act) for it. **The number is not in the
Act.** CJA s. 23 (1) (a) gives the Small Claims Court jurisdiction *"in any
action for the payment of money where the amount claimed does not exceed the
prescribed amount exclusive of interest and costs"* — "the prescribed amount",
undefined there. The figure is prescribed by **O. Reg. 626/00, s. 1 (1)**:
*"The maximum amount of a claim in the Small Claims Court is $50,000."*
(retrieved 2026-09-13 via `ontario.ca/laws/docs/000626_e.doc`, consolidation
from 2025-10-01; most recently amended by O. Reg. 42/25). s. 1 (2) sets the same
cap on what a deputy judge may preside over.

So every "$50,000" in `claimTypes.ts` needs the regulation added alongside the
Act. The proposition is true and the source is the wrong half of the pair — a
smaller problem than an invented citation, and still a section 2 problem. Worth
fixing whether or not this design direction is ever built, because the amount is
in a regulation that has been amended repeatedly and will be again.

**Correction to this entry as first written.** It said the repo did not cite the
regulation. It does: `verifiedAuthoritySeedRegistry.ts` has an entry for
O. Reg. 626/00. Two qualifications keep the finding alive rather than closing
it. First, that registry cites it as
`https://www.ontario.ca/laws/regulation/000626` — the e-Laws viewer route, which
`SOURCING_NOTES.md` records as returning a JS shell with no text, so the
citation does not resolve to anything readable. Second, `claimTypes.ts` is a
separate registry and still cites only the Act. The gap is narrower than
originally stated and is about **parallel conventions not seeing each other**,
which is the subject of `docs/SOURCED_FACT_CONVENTIONS.md`.

**b. Mitigation — PROPERLY SOURCED. This entry previously said the opposite and
was wrong.**

The original text here asserted that mitigation was "not sourced at all" and
that the only thing in the codebase was an unsourced sentence in
`doctrineSeedLibrary.ts`'s `mitigationIssues`. That sentence exists, but it is
not the only thing, and citing it as the whole picture erased work that was done
properly.

`DEFENCE_CONCEPTS` in `claimTypes.ts` carries **`defence-failure-to-mitigate`**,
closed in Session 43 and sourced to **Red Deer College v. Michaels, [1976] 2
S.C.R. 324**, retrieved and saved under `docs/sources/` via the
decisions.scc-csc.ca HTML-fallback route (the PDF has no text layer). The entry
states the burden principle — that a defendant arguing failure to mitigate
generally has to prove both that the plaintiff failed to take reasonable steps
and that taking them would have reduced the loss — and carries its own inline
note that the case is a wrongful-dismissal case, that the Supreme Court stated
the rule in employment terms, and that **how mitigation applies outside
employment is not something that case decides**. That limitation is exactly the
kind of thing section 2 is for, and it was already recorded.

**How the error happened, because it is repeatable:** the search went to
`doctrineSeedLibrary.ts` because that file's `mitigationIssues` field matched on
the word, found an unsourced sentence there, and stopped. `DEFENCE_CONCEPTS` was
never opened. A grep that finds *a* bad instance is not evidence there is no
good one — see `docs/SOURCED_FACT_CONVENTIONS.md` on why parallel conventions
make this failure mode likely.

**What remains true:** the `doctrineSeedLibrary.ts` `mitigationIssues` sentence
is still unsourced and still duplicates a doctrine that already has a sourced
home. It should point at `defence-failure-to-mitigate` or be deleted, not be
separately sourced.

**c. Statutory caps** — none identified. Not searched for. Unknown rather than
absent.

### What would need deciding before building

- Whether the documented subtotal is ever shown as a single number, or only ever
  as a list of items with their own amounts. A single number invites being read
  as "the claim is worth this".
- What the intake does with a user who genuinely has only non-documentable
  harm — the current design gives them an empty pile and no answer.
- Whether "I don't know" becomes a first-class recordable state for the amount,
  the way `not-yet` is elsewhere, rather than a blocked field.

---

## 21. `master_result` fields that are read and never written — AUDIT RUN, one fixed

**The audit ran on 2026-09-13. Findings at the bottom of this section.** The
method and the reasoning are kept above them because the failure shape recurs
and the next person needs both.

### The failure shape

`master_result` is an untyped `jsonb` blob. A field read from it that nothing
writes does not throw, does not warn, and does not appear in any log — it just
returns `undefined` forever, and whatever depends on it silently returns the
same answer for every case, permanently.

**Two were found by accident on 2026-09-13, within one commit of each other:**

| Field | Read by | What it did while unwritten |
|---|---|---|
| `derivedFrom` | `analysisFreshness` | Every case reported `never-analyzed`, so the staleness banner could never fire. Reader, message and three freshness states all shipped and were inert. |
| `intakeFacts` | `deriveCaseStageWithEvents` | Every case handed `{}` to the stage derivation, so the stage came entirely from confirmed events. A user who told intake they had filed and served still saw "Not enough recorded to say". |

Neither was found by a check or a failing build. Both were found because
someone went looking at the feature end to end and noticed it always said the
same thing. **That is not a reliable way to find the rest.**

### Why it is worth an audit rather than a fix-as-you-go

Both instances had the same signature — a field appearing only on the read side
— and both sat in code that was otherwise correct, tested and mutation-verified.
The checks around them passed, because the checks tested the reader's logic, not
whether anything fed it. A pure function given `{}` behaves perfectly.

### The method

1. Grep every read: `master_result.<field>`, `masterResult.<field>`,
   `masterResult?.<field>`, `asRecord(masterResult).<field>`, and bracket forms
   `masterResult["<field>"]`. The blob is untyped, so these are the only handles.
2. For each field, grep the write side — `master_result: {` object literals and
   any `mergeMasterResult` patch that sets it.
3. Classify: **written**, **never written**, or **written only on one path**
   (the third is real — `intakeFacts` is written by the builder save site and
   by nothing else, so a case updated through another route keeps a stale one).
4. **Report the list before changing anything.** Some reads may be legitimately
   optional, some may be dead readers worth deleting rather than feeding, and
   deciding which is which is not a mechanical call.

### Worth considering afterwards, not instead

A typed accessor for `master_result` would make the whole class impossible —
one module owning the shape, with the reads and writes visible together. That is
a larger change than the audit and should not gate it, but the audit is the
thing that would tell you whether it is worth doing.

### FINDINGS (2026-09-13)

**Found a third instance, and it was the worst of the three.**

| Field | Read by | Status |
|---|---|---|
| `timeline` | `app/api/cases/event-candidates` | **FIXED (`aacf63c`).** Never written top-level. Entries live at `masterCase.timeline`. Every request to the candidate surface resolved zero candidates from the day it shipped. |

The read is now `candidatesFromMasterResult` in `src/`, so the LOCATION is
checkable rather than only the parsing — `candidatesFromTimeline` was correct
and mutation-covered throughout, and was handed `undefined`. **The doc comment
asserting the top-level location was written without checking**: inferred from
the shape of `mapEvent`'s return value, never from where that value is stored.

**Twelve dead wires on the forms page, not fixed.**
`app/forms/page.tsx` reads `proceduralStage`, `currentStage`, `stage`,
`requiredNextForms`, `requiredForms`, `recommendedForms`, `completedForms`,
`receivedForms`, `architectureWarnings`, `missingInformation`, `risksAndGaps`
and `guidance` from the blob. None is written by any path. The screen is not
broken — the stage chain falls through to `assembly.proceduralState`, which is
written, and the forms surface is carried by `courtSimplifiedArchitecture` and
`masterCase` — but half the inputs to that page contribute nothing. Deciding
between feeding them and deleting them is a design call per step 4 above.

**Four dead fallback tails in `app/api/document-export`:** `analysis`, `facts`,
`goal`, `timeline`, each last in a chain behind `body.facts` / `body.goal` /
`body.caseData`. `app/document-export/page.tsx` passes only `master_result`,
so they may bite; not proven either way.

**Clean:** `masterCase`, `caseSystemAssembly`, `courtSimplifiedArchitecture`,
`workflowReadiness`, `persistedRecord`, `intakeData`, `intakeAnalysis`,
`masterCaseFile`, `formApplicability`. `assembly` is never written but is a
documented fallback for `caseSystemAssembly`, which is.

**Still single-path:** `derivedFrom` and `intakeFacts` are written only by the
builder save site. `POST /api/cases` spreads `...existing` and refreshes
neither, so a case last touched by that route would derive its stage from
stale intake facts and say nothing about it.

> **CORRECTION (2026-09-14): that concern is HYPOTHETICAL, and stays that
> way until something calls the route.** The reachability sweep found
> `POST /api/cases` has no caller anywhere in `app/` or `src/` — the builder
> writes to Supabase directly. There is no second write path today, so no
> case can currently acquire a stale `derivedFrom` by this mechanism.
>
> **The route is KEPT, deliberately, and this is why.** It is referenced
> through this section as the second write path, and deleting it silently
> would make these notes wrong — a doc describing a mechanism that no longer
> exists is worse than a dormant route. It is recorded in
> `verifyReachability.ts` terms as live-but-uncalled: the file is reachable
> to Next as a route, so the module check does not flag it.
>
> **If it is ever wired up, this becomes real on the first call**, and
> `buildMasterResult` needs to refresh `derivedFrom` and `intakeFacts` rather
> than spreading `...existing` over them.

---

## 23. `CaseContext.strengths` / `.weaknesses` — persisted under §3 names

`caseContextEngine.ts:143-144` declares them, `:1827-1828` persists them, and
`:1872-1877` reads them back off the stored payload. So these are §3-named
fields living in the user's saved case.

**Not a live §3 exposure.** The §3 *content* question was already settled
downstream: `:1540` maps `context.weaknesses` into `proofGaps`, and the
comment at `:1534-1536` records that `StrategyProfile.strengths/weaknesses`
were removed and that this is a SEPARATE structure feeding the survivor. What
is underneath is gap content, not merit content.

**Deliberately left alone (2026-09-13).** Renaming a structure that is written
to and read back from storage is a design call, not a rename: old rows keep
the old keys, and the read-back at `:1872` would need to decide whether to
fall back to them — which is exactly the decision `extractDashboardMaster`
took the other way, with a comment explaining why falling back would
reintroduce removed content. That decision needs making once, for this
structure, on its own.

**What would make it worth doing:** any new reader of `context.strengths`
appearing, or the field reaching a user-facing surface under its own name.
Neither is true today.

---

## 27. StatementOfClaimSurface is still unreachable for a loaded case

**The candidate surface half of this is FIXED. This half is not.**

Both surfaces sat behind `analysis && canonicalIntakeSaved` in
`builder/page.tsx`. Both are React state, `analysis` starts null and is reset
to null when an existing case loads, so neither rendered for a case that was
not being analysed in that same browser session.

`EventCandidateSurface` is fixed — it needed nothing from `analysis` (its only
prop is `caseId`, and it fetches its own state), so it now mounts on `caseId`
alone.

`StatementOfClaimSurface` genuinely needs data the load path does not rebuild:
`mappedInput: SmallClaimsIntelligenceInput`, plus `matchedClaimTypeId` and
`initialElementStateMap`, all set during the run from the analysis result.

**What IS persisted, and why it is not simply a mapping job.**
`master_result.intakeData` holds the `StoredCaseData` the run saved, and
`payload.extra.elementStateMap` is in there too, so the per-element record
state survives. Most `SmallClaimsIntelligenceInput` values exist in that blob
in a different shape.

The obstacle is not the mapping, it is the party fields. The surface's own
design note records that party details are merged in from confirmed state
rather than inferred from the story, **precisely so that an empty field stays
empty and the engine emits its `[... to be confirmed]` placeholder**. A
rehydration that filled `yourName` or `defendantAddress` from a best-effort
read of the blob would silently defeat that, and the failure would look like a
finished draft rather than a missing one.

**Options, in preference order:**

1. **Persist `mappedInput` at the save site**, alongside `derivedFrom` and
   `intakeFacts`, and rehydrate it verbatim. No inference, nothing to guess.
   Costs one field on `master_result`.
2. Rebuild it from `intakeData` with party fields deliberately left blank, so
   a loaded draft shows placeholders until the user re-confirms them. Honest,
   but it makes a loaded draft look less complete than the one they saw.
3. Leave it gated and route users back through analysis. Current behaviour.

Option 1 is the one that matches how `derivedFrom` and `intakeFacts` were
handled, and it is the only one that cannot invent a party name.

---

## 34. 📌 A check must assert a PROPERTY, not a current value

**Three checks failed in a single day because each pinned a moving target.** In
every case the code had improved and the check reported it as a regression.
Recorded in CLAUDE.md section 5 as a standing rule; the evidence is here.

### The test to apply when writing a check

**Ask what would make it fail. If the answer is "someone doing the work we want
done", the check is wrong.**

A check that pins today's value forces the person who improved the code to
decide whether a red line is real — which is exactly the judgment a suite
exists to spare them. Worse, a stale red line trains everyone to skim the
output, so the *next* failure is the one nobody reads.

### The three, and what each actually pinned

| Check | Pinned | What broke it | Rewritten to assert |
|---|---|---|---|
| `verifyFixtureHarnessGuards` | `voiceLayer.ts` passes an abort signal to its request | `e5f76fb` deliberately removed the model call, so there was no request to abort. **The check had been failing since then** — a permanent red line in every run. | voiceLayer makes **no** model call at all, and `composeVoiceTurn` still returns `question.text` verbatim |
| `verifyDepthQuestions` | `limitation-if-newspaper-or-broadcast` appears in `result.unauthored` | the element was authored — precisely the work the check existed to encourage | an element with no authored question lands in `unauthored`, asserted against a **synthetic id that will never be authored**; plus a new check that every real defamation element is covered |
| `verifyReachability` | a list of modules that are unreachable | `statusTriage` and `jurisdictionRoutes` were wired up, exactly as intended | a module is reachable **or** declared dormant with a reason |

### The reachability case is the instructive one

It is **correct** for that list to need updating when a module is wired — the
list is the point. What makes it acceptable rather than the same defect again:

- the update is a **one-line deletion** with an obvious cause,
- the failure message names the entry and says what to do,
- and it carries a **second** check in the other direction, so a dormant entry
  that has quietly become reachable also fails.

**A list that must be maintained is fine. A check that punishes the maintenance
is not.** The difference is whether the check tells you what changed and what to
do, or just goes red.

### Why this kept happening here specifically

Every one of these was written in the same session as the thing it checked, by
someone who had just finished making a value true and reached for that value as
the assertion. The value was fresh, obviously correct, and easy to write. The
property was one more step of thought.

That is not a knowledge problem — it is the path of least resistance at the
moment of writing, which is why it belongs in CLAUDE.md rather than in
somebody's memory.

### A related shape, not yet swept for

A check can also be wrong in the opposite direction: asserting a property so
weak that nothing can fail it. Section 24 records that "checks that cannot fail"
was **sampled, not exhausted**, and names mutation-testing every check as the
only real closure. The two are the same question asked from either end —
*what makes this fail?* A check with no answer and a check whose answer is
"doing good work" are both broken.

---

## 33. 📌 Two element ids bundle "amount owing" into a jurisdiction name — do NOT rename casually

`amount-owing-commercial` (commercial tenancy) and
`amount-within-jurisdiction-condo` (unpaid condo common expenses) are both
marked `NO_QUESTION_NEEDED` as jurisdictional tests, which is correct for what
they do. **Their names are not.** Both read as though they also cover whether
the amount is in fact owed, which is a separate question with a separate answer
and is not what the element checks.

Compare the unambiguous siblings: `amount-within-jurisdiction-goods-sold`,
`amount-within-jurisdiction-wages`, `value-within-jurisdiction-property`.

**Deliberately not renamed while authoring questions.** Element ids are not
labels — they reach the readiness gate (`evaluateReadinessGate` keys
`elementStateMap` by them), the draft engine (`cannotProvide` entries travel
into the Statement of Claim under RECORDED AS NOT HELD), and the
no-question-needed registry. A rename is a data migration for any case already
carrying the old id in `master_result`, plus a fixture regeneration.

**What a rename would require, in order:**

1. Decide whether the element covers jurisdiction ONLY, or jurisdiction and
   amount-owed. If the latter, it is two elements, not a renamed one.
2. Rename in `claimTypes.ts` and `NO_QUESTION_NEEDED`.
3. Decide what happens to stored `elementStateMap` entries under the old id —
   dropped, or migrated. Dropping silently reopens a gate the user already
   passed.
4. Regenerate the fixtures (`npm run test:fixtures`, ~105 requests) and read
   the diff rather than accepting it.

Worth doing. Not worth doing in the middle of authoring questions, which is
where it was found.

---

## 32. ⚠️ The matcher fix moved 18 claim types from never-reached to reached-and-bare

**This is the same defect class the reachability sweep found, one level up: the
fix that made something reachable also made its thinnest part user-facing.**

### What changed, in one morning

Before 2026-09-14, `matchClaimType` scored **0 of 10** against plainly-worded
stories (section 30). `buildClaimTypeOverviewContent` returned `null`
essentially always, so:

- the claim type was never confirmed,
- the depth phase had no elements to work from,
- and the overview panel fell through to unsourced model output.

**The attestation fallback was load-bearing for ZERO claim types**, because no
claim type was ever reached.

After the matcher fix, a user whose story matches reaches the element list. For
the 18 claim types with no authored depth questions, that list was **bare**: an
element such as *"Existence of a valid contract"* with "I have this / I can't
provide this" buttons and nothing explaining what it means for their situation.

**The attestation fallback became load-bearing for eighteen claim types in a
single commit.** It is a deliberate, documented degradation
(`selectDepthQuestions`: "unauthored -> skip, degrades to attestation"), and it
went from covering nothing to covering most of the product without anyone
choosing that.

### Worse than thin: it was a permanent block

An element that is neither authored nor marked `NO_QUESTION_NEEDED` goes to
`unauthored`, is never asked, and stays `not-yet`. **Only `not-yet` holds the
readiness gate.** So those users could not reach a draft at all — not a thin
experience, a dead end. The gate's own header records this exact failure
happening once before, to `amount-within-jurisdiction-personal-loan`.

### Closed, same day

All 75 elements across all 22 claim types are now authored (62) or explicitly
marked not-user-narratable (13). **Zero unauthored.** 65 questions in the
registry.

### The lesson worth keeping

**Making something reachable is not a neutral act.** The matcher fix was
unambiguously right, and it converted a silent gap into a user-facing one the
same afternoon. Anything that unblocks a path should be assumed to expose
whatever was behind the block, and the check for that is to walk the path
afterwards — not to reason that the fix was narrow.

The pattern to watch for next time: **a fallback whose load-bearing-ness
changes without the fallback changing.** Nothing about
`selectDepthQuestions` was edited; its importance went from zero to
near-total because something upstream started working.

---

## 31. Dead pairs — 4,576 lines, left in place, with two preconditions

Found by the reachability sweep (section 32). Listed as a block because
**deleting one half of a pair leaves the same problem with fewer lines**: the
survivor keeps its only importer and stays unreachable, and the next sweep
re-finds it looking smaller.

`verifyReachability.ts` holds every entry below with a reason, so none of this
can drift back into "nobody noticed".

### The pairs

| Pair | Lines | Note |
|---|---|---|
| `aiIntakeNormalizer` ↔ `smallClaimsEngine` | 2,037 | The live Small Claims path is `smallClaimsIntelligenceEngine` via `/api/small-claims/analyze`. This is a separate, older engine nothing routes to. |
| `formKnowledgeBase` ↔ `formTriggerEngine` | 1,162 | Also blocked on sourcing — section 26. |
| `scenarioEngine` ↔ `scenarioConfidenceEngine` | 713 | Carries section 3 grading. |
| `evidencePackagingEngine` ↔ `evidencePackagingArchitecture` | 574 | Live evidence path is `evidenceEngine` plus `/evidence`. |
| `registry` ↔ `defaults` | 90 | `registry` imports `./types/family-case.ts` with an explicit `.ts` extension, which suggests it was never compiled on a working path. |

### Singletons in the same set

| Module | Lines | Note |
|---|---|---|
| `documentExportEngine` | 770 | Carries its own `calculateReadinessScore` (`content*55 + locked*35`). |
| `facts/factPatternAnaysisEngine` | 409 | The brain has its own `buildFactPatternAnalysis`. Filename is misspelled. |
| `documentsStatusEngine` | 242 | |
| `proceduralRules` | 101 | Predates the database-backed `legal_form_mapping_rules` path. |

### The two preconditions, and they are preconditions rather than follow-ups

**1. Section 3 removal comes FIRST, not after.** `scenarioEngine` grades
`evidenceReadiness` as strong/partial/weak, `scenarioConfidenceEngine` exists
to score a scenario, and `documentExportEngine` carries a weighted readiness
formula the live export route already had removed. **None of these can be
revived as-is.** Reviving one and then removing the grade is the sequence that
put a grade in front of a user in the first place — the code goes live, the
cleanup is a follow-up, and the follow-up is what gets dropped.

**2. `formKnowledgeBase` is blocked on sourcing regardless** — section 26. Its
`lawyerLogic`, `whatTheFormRequires` and `riskIfWrong` strings carry no
citations and the rule type has nowhere to put one. Wiring `formTriggerEngine`
without that pass puts twelve unsourced procedural assertions in front of a
user, which is CLAUDE.md section 2.

### Why they are not simply deleted

4,576 lines is a large deletion, and unlike `/api/assistant-chat` — a route
with a defined external surface and no caller — several of these are engines
whose logic may be worth recovering. `factPatternAnaysisEngine` duplicates
something the brain does; `documentExportEngine` duplicates something the
export route does. A future session comparing the two implementations may find
the dormant one is better in places.

**What would justify deleting them:** nothing recovers anything from them for
two more sessions, or a decision that duplicate implementations are worse than
the risk of losing the better one. Both are judgment calls, and neither is
urgent while `verifyReachability` keeps them visible.

---

## 30. ⚠️ The claim-type matcher never fired — and that reframes every earlier walkthrough

**Before 2026-09-14, `matchClaimType` matched nothing on prose a person would
actually write.** Measured, not estimated:

| Measurement | Value |
|---|---|
| Plainly-worded stories matching the right claim type (one per type) | **0 of 10** |
| Plainly-worded stories matching **anything at all** | **0 of 10** |
| Signals that are multi-word phrases | **250 of 255 (98%)** |
| Signals containing a first-person pronoun | **88 of 255 (35%)** |
| Claim types with **no single-word signal** | **19 of 22** |

The matcher required a signal to appear in the story **verbatim**. With 98% of
signals being multi-word phrases, a claim type could only match a user who
happened to type an exact string like `"spreading rumors that aren't true"`.
The 35% carrying a first-person pronoun could only match a story written in
that exact grammatical person.

### What this means for testing done before today

**Any walkthrough or manual test of the intelligence overview panel before
2026-09-14 was reading model fallback output, not sourced content.**

`buildClaimTypeOverviewContent()` returned `null` whenever the matcher missed,
which was effectively always. The panel then fell through to
`analysis.missingEvidence` and `intelligenceEvidenceIssues[].missingEvidence`
— unconstrained model output — for "Evidence to organize or confirm".
`courtPoints` and `commonDefences` returned `[]`, so those cards did not render
at all.

So an earlier session that looked at the panel and judged the sourced
claim-type content to be working was looking at something else. The three
cards behaved as:

| Card | What was actually shown before today |
|---|---|
| Evidence to organize or confirm | model free-text, no citations |
| Points the court may need clarified | nothing — card did not render |
| Defences that commonly come up | nothing — card did not render |

This is how `"Pattern of harassment"` reached a user on a defamation story
about false statements in one custody argument. It was not a bad generation
against good plumbing; the sourced path had never run.

**Nothing failed while this was true.** No check covered the matcher against
prose, and the panel's fallback guaranteed a non-empty list, so the symptom
was a plausible-looking list rather than an empty one.

### What changed

Two independent defects, fixed separately:

1. **Algorithm.** A signal now hits either as a whole phrase or when every
   content word appears in any order and any grammatical person, after
   stopword and pronoun removal. Plus a margin guard: the top scorer must beat
   the runner-up outright or the result is `null`. **0 of 10 → 3 of 10.**
2. **Vocabulary.** Signals for six claim types did not contain the words people
   use. Third-person framings added to defamation and then to five more.
   **3 of 10 → 4 of 10 → 10 of 10.**

`scripts/verification/verifyClaimTypeMatcher.ts` pins a floor of 10 of 10 and
zero wrong matches, and the fallback branch is removed, so a future miss shows
as an empty list rather than an invention.

### What is still NOT established

The ten stories are **one per claim type and written by the same author as the
signals**, which is the weakest part of this. They demonstrate the matcher is
no longer inoperative. They do **not** establish real-world coverage, and a
floor of 10 of 10 against them must not be read as "the matcher works". Real
intake text from the fixtures, or from a walkthrough, is the next honest test.

---

## 29. No claim type covers a PRIVATE used-vehicle sale with a misrepresented history

Found while writing the matcher's test stories. A plainly-worded story —
*"I bought a used car privately, the seller said it had never been in a crash,
the mechanic found frame repair"* — matches **nothing**, and that is the
correct behaviour after this change.

**Why it must not be matched to `sc-claim-used-vehicle-nondisclosure`.** That
claim type is scoped to a **dealer**, and it is scoped that way because the
Consumer Protection Act duties its elements are built on **attach to dealers**.
A private seller is not subject to the same obligations. Matching a private
sale to it would hand the user dealer-specific elements for a claim that does
not have them — a wrong claim type, which drives the evidence checklist, the
court points, the common defences and the elements the Statement of Claim is
assembled from.

**The claim type was deliberately NOT widened.** The test story was corrected
to a dealer purchase instead, with the reasoning recorded inline beside it so
nobody "fixes" the miss by loosening the scope.

**The open question is coverage, not matching.** A private buyer misled about a
vehicle's history plainly has *something*. Whether it belongs under
misrepresentation, breach of contract, or its own claim type is a **sourcing
question** for the coverage expansion: it needs the elements retrieved and
cited before anything is authored, per CLAUDE.md section 2. Until then, `null`
is the honest answer and the panel shows an empty list rather than the wrong
checklist.

---

## 28. 📌 The field-name sweep and the runtime-string sweep are COMPLEMENTARY, not nested

**Neither closes the section 3 pattern on its own.** A future session must not
read either as complete, and must not assume that having run one makes the
other redundant.

### The two sweeps, and what each is blind to

**The field-name sweep** (2026-09-13) searched declared fields, named formulas
and type declarations: identifiers matching `[A-Za-z]+[Ss]core[sd]?`, ordinal
unions like `"strong" | "moderate" | "weak"`, threshold ladders, `/100`
interpolations. It found and removed eleven grades.

**It is blind to a sentence assembled at runtime.** A template literal that
says "this claim has weak overall proof" declares no field, defines no union
and computes no score. There is nothing for a field-name search to match.

**The runtime-string sweep** (2026-09-14) searched string literals for grading
vocabulary — `weak`, `strong`, `poor`, `solid`, `likely to succeed` — then
filtered out authority-weight language (`binding`, `persuasive`,
`controlling`), which is legitimate vocabulary about precedent rather than a
grade on the user's case.

**It is blind to a grade that never becomes a string.** A numeric score routed
into a branch, or an ordinal stored and read by other code, contains no
grading word anywhere.

### Proof that neither is a superset — one real miss each way

| Found by | Missed by | What it was |
|---|---|---|
| runtime-string sweep | field-name sweep | `strongestEvidence` / `weakestEvidence`, **declared fields** on `CaseEvidenceIntelligence` (masterCaseSchema), `EvidenceIntelligenceResult` and the assembly's readiness type. The field sweep banned `strongestEvidence` in **family** code only (`verifyFamilyNoScores`), so the three non-family copies survived it. Surfaced to the user as `` `${n} weak evidence item(s) should be strengthened or explained.` `` |
| field-name sweep | runtime-string sweep | Nothing on this pass — but the shape exists: `courtSimplifiedBrain:1410` built "This claim has weak overall proof because key evidence remains missing: …" from a template literal. The field sweep could not see it. Its **trigger** had already been made factual by an earlier pass while the sentence it produced stayed graded, which is the same blindness in the other direction. |

The `strongestEvidence` case is the sharper one: a *declared field*, exactly
what the first sweep was looking for, found only by a search for words in
strings. The scoping of the family check to family files is why — a ban with a
directory scope is not a ban.

### What a third sweep would have to cover

Both above are still keyword searches, and share a blindness neither closes:

- **A grade with no grading word.** `level: "a" | "b" | "c"` ordered by
  quality, or a numeric field named `weight`, `rank`, `tier`, `priority`,
  `index`.
- **A grade assembled from parts**, where no single literal contains a grading
  word: `` `${adjective} ${noun}` `` with the adjective from a lookup.
- **A grade a model produces at runtime**, which appears in no source file at
  all. This is how "Pattern of harassment" reached a user: not a grade, but the
  same invisibility — the panel's unsourced fallback branch, now removed.

**The only method that would actually close it is behavioural**: render the
product and read what a user reads. `tests/browser/case-event-loop.spec.ts`
does this for the flow it covers — no percentage, no `N/100`, no "readiness",
no "strongest", no "weakest" anywhere in the rendered page. That check has no
opinion about how a string was built, which is precisely why it survives both
blindnesses. Extending it to more screens is worth more than a third keyword
sweep.

### Still open, flagged while removing the above

- **`finding.strength`** on `CaseEvidenceIntelligenceFinding`, produced by
  `strengthFromConfidence()` mapping an ordinal confidence onto an ordinal
  strength. Still reaches `masterCaseBridge` and `damagesRemedyEngine`. Its
  own block.
- **`types/civil-case.ts`** carries a separate `strongestEvidence`, its own
  `"developing" | "moderate" | "strong"` ladder, and `keyEvidenceStrengths`
  read by `civilStrategyEngine`. A different object with the same field name —
  see section 25 on why a grep cannot tell them apart.

---

## 26. ⚠️ BLOCKER on formKnowledgeBase — unsourced procedural assertions

**`formTriggerEngine` must not be wired up until every string in
`formKnowledgeBase` is sourced.** This is a precondition, not a nice-to-have.

`FORM_KNOWLEDGE_BASE` carries three free-text fields per form —
`lawyerLogic`, `whatTheFormRequires` and `riskIfWrong` — across twelve forms.
**None carries a citation.** The rule type has no `sourceUrl` and no
`verifiedAt`, so there is nowhere to put one today.

They say things like *"The claim must clearly explain what happened, why the
defendant is responsible, and how the amount claimed was calculated"* and
*"Support cannot be assessed properly without reliable financial
disclosure."* Those are assertions about what Ontario procedure requires. They
may well be right. **Nothing in the repo establishes that they are**, and
CLAUDE.md section 2 requires a specific, resolvable source retrieved and read
before a legal statement ships.

**Why it is safe right now, and only right now.** `formKnowledgeBase` and
`formTriggerEngine` are a closed two-file loop with no external importer
anywhere in `src/`, `app/`, `scripts/` or `tests/`. Nothing renders these
strings, so nothing unsourced reaches a user. The moment anything imports
`runFormTriggerEngine` and displays a recommendation, twelve unsourced
procedural assertions become user-facing content.

**What wiring it up requires, in order:**

1. Add `sourceUrl` and `verifiedAt` to `FormKnowledgeRule`, required not
   optional, so an entry cannot be added without them.
2. Re-read every `lawyerLogic`, `whatTheFormRequires` and `riskIfWrong`
   string against the actual rule or form, and cite it. Some will not survive
   the check.
3. Only then connect the engine.

**History worth knowing.** The twelve `whatTheFormRequires` strings were
called `judgeConcern` and were deleted wholesale in `f5b7a3c` as section 3
predictions. That was wrong — every one states what the form or the court
requires, not what a judge will think — and they were restored in `3fd0fdf`
under the accurate name. The sourcing gap is a separate defect from the naming
one and was found while restoring them.

---

## 25. 📌 A grep for a field name is NOT a trace — check for collisions first

**Standing addition to the sweep method.** Two different types carrying the
same field name is how several defects survived removal passes that were
looking directly at them.

**The cases, all real:**

- `readiness.overallLevel` (dead, no readers) and
  `credibilityAnalysis.overallLevel` (live, with readers branching on
  `"serious"` / `"critical"`) are indistinguishable in a grep. A sweep that
  saw hits for `overallLevel` and concluded "this has readers" would leave the
  dead one in place; one that concluded "no readers" would break the live
  branch.
- `settlementReadiness` appears on **four** separate objects — procedural
  state, workflow orchestration, credibility, damages — plus the one removed
  from `CaseReadinessState`.
- `scoreFromConfidence` survived three separate removal passes under three
  names for the same reason.
- `masterResult.strategy` in `CivilIntake` is a locally-built engine result;
  `master_result.strategy` in the dashboard is the persisted blob. Same text,
  unrelated objects.

**The rule.** If a grep for a field name returns hits in more than one type,
the grep has told you nothing and the hits must be separated by hand before
any of them is acted on.

**The reliable method, and it is cheaper than the grep.** Delete or rename the
field **on the type first**, then let `tsc --noEmit` enumerate the consumers.
The compiler knows which object each access belongs to and grep cannot. This
is how the five `*Readiness: CaseConfidence` ordinals were traced: grep
returned five hits across four unrelated objects, and the type change showed
the true answer was two producers and zero readers.

Applies to every future pattern sweep, not just section 3.

---

## 24. Pattern 4 — "checks that cannot fail" was SAMPLED, not exhausted

A five-pattern sweep ran on 2026-09-13. Four of the five patterns were
enumerated to completion. **This one was not**, and it must not be read as
closed.

**What was searched:** two shapes across every suite in
`scripts/verification/` — (a) a `check(...)` whose condition is a literal
`true`, `!false`, or an always-empty comparison; (b) a check pinning a
current-but-wrong value as the expected one, so fixing the defect would break
the suite.

**What was found:** no constant-true checks. One pinning check, already
recorded — `verifyAuthorityKnowledgeBridge` pins the e-Laws viewer URLs as
expected values, so correcting those 54 URLs fails the suite.

**Why that is not the whole answer.** A check can be unfailable in ways
neither shape catches: a condition over an empty collection that is vacuously
true (the `?: true` fields caught earlier this session were exactly this and
only `tsc` saw it); a regex that cannot match anything; a suite whose fixture
makes the assertion trivially satisfied; a check whose subject was deleted so
it now asserts over `undefined`. None of those has been swept for.

**The stronger method, when someone does this properly:** mutation-test every
check, not just the ones with a mutation case today. A check that cannot fail
is exactly a check no mutation catches, and `runMutationTests` already has the
harness to prove it. That is the real closure condition for this pattern.

---

## 23. `readiness.score` — removed from the export, still live on the civil path

**The export half is FIXED.** The plain-text package a user carries to a court
office printed `Readiness: 33%` and `Status: needs-repair`. The export SCREEN
had already removed its Readiness card as a §3 grading (`dc3934c`), and left a
comment saying so — **and the document went on printing both for months
afterwards.** The screen was checked by eye; the document was checked by
nothing.

That is the lesson worth keeping: *a value that has stopped appearing on a
screen has not stopped reaching the user.* `scripts/verification/
verifyExportedDocument.ts` now renders the actual document and reads what a
user would read, rather than grepping the route — a source check would have
passed on the day the card came out, which is exactly when it was wrong.

What was underneath was never a merits judgment: `ready` is
`content.length > 0`, so the score was "two of these six sections have
something in them". That fact is kept and named; the percentage, the ordinal
status, and the `score < 80` next-action branch are gone, **slots included** —
a `score` field left on the response object is one template literal away from
being printed again, and there is a mutation covering exactly that.

### STILL OPEN — the civil path, which is worse

`civilStrategyEngine.ts` emits as literal user-facing text:

```
`Current civil readiness level: ${master.readiness.level} (${master.readiness.score}/100).`
```

unconditionally, as the first member of `buildReadinessStrategy`. `CivilIntake.
tsx:422` independently builds the same string again into `inferredFacts`. Both
reach the user: `readinessStrategy` flows into `suggestedFocus` and `guidance`,
and `suggestedFocus` is printed under "Next focus:" in the summary handed to
`handleComplete`. `CivilIntake` is mounted at `builder/page.tsx:1099` for
`courtPath === "civil"`.

Three threshold branches sit on the same score:

| Branch | Emits |
|---|---|
| `>= 65` (`buildSettlementLeverage`) | "The file is organized enough to support a more structured settlement position." |
| `< 45` (`buildReadinessStrategy`) | "Focus on facts, chronology, evidence, and forum before drafting final documents." |
| `45–65` | "Move from organization into proof mapping and damages support." |
| `>= 65` | "Begin preparing drafting, settlement, and package-readiness materials while resolving final blockers." |

**The branches have a factual replacement; the score strings do not.** Each
branch is really a statement about what is and is not recorded, and
`readiness.blockers` already carries that directly and unscored. The `N/100`
strings have nothing to replace them and should simply go.

**Not started.** Three call sites plus whatever computes
`CivilCaseData.readiness.score`, and `buildSettlementLeverage` is settlement-
pressure content in its own right — a separate question from the number.

---

## 20. Verification suites reach into `app/api` — seven of them, in two shapes

**Fixed for `verifyCaseEvents`; the class is untouched and larger than first
reported.**

`src/` is the library and `app/` is the delivery mechanism. A verification suite
importing from a route inverts that, and reads as a mistake to whoever touches
it next. `verifyCaseEvents` was moved: its parsing and validation now live in
`src/lib/case-system/events/caseEventRequest.ts`.

**Seven suites remain coupled, and the coupling comes in two kinds:**

| Suite | Imports from `app/api` | Reads route source as text |
|---|---|---|
| `verifyCaseOutcomeMatrix.ts` | 4 | — |
| `verifyThreeAreaContract.ts` | 3 | — |
| `verifyFormsSelectedCaseIsolation.ts` | 1 | 2 |
| `verifyGenerateFormSelectedCaseAuthorization.ts` | 1 | 1 |
| `verifyServerAiReasoningContract.ts` | 1 | — |
| `verifyOntarioBetaProcedureAuthorityBundle.ts` | — | 1 |
| `verifyScenarioMatrix.ts` | — | 1 |

**A correction to the count.** This was described as "four suites". It is seven,
five of which import. A plain grep for `from "../../app/api` finds only four,
because several imports are multi-line and the `from` sits on a different line
from the path — which is how the number came out low. Counting occurrences of
the path itself gives the real figure.

**The two kinds are not equally bad.** Importing a route handler pulls its whole
dependency graph into the suite and couples the check to the route's runtime.
Reading a route's source as text is a deliberate structural assertion — "this
file does not contain X" — and is legitimate in itself, though it breaks
silently when the file moves.

**What fixing it looks like:** for each importer, move the logic the suite
actually tests into `src/` and have the route compose it, as `caseEventRequest`
now does. That is a per-suite change, and some of them test route-level
behaviour (auth, status codes) that genuinely lives in the route — for those the
honest answer may be that the coupling stays and is documented, not removed.

---

## 19. `case_intakes` is dead — no reader, no writer, never populated

**Found 2026-09-13 while scoping the event candidate surface.**

The table exists from `20260823020500_add_case_evidence_storage_bucket.sql` with
`intake_data`, `normalized_data`, `created_at`, `updated_at` and the usual
ownership columns. **Nothing in `app/`, `src/` or `scripts/` reads or writes
it.** `normalized_data` has never held a row.

**Why this matters more than an unused table usually does.** The step-2 scoping
report for the case lifecycle recommended storing event candidates in
`case_intakes.normalized_data`, on the reasoning that "they're already there".
They were not, and they never had been. The recommendation was taken as
plausible — and a schema that looks like it holds something is exactly the kind
of thing that invites that error. The design was corrected before any code
depended on it, but only because the follow-up work checked.

**Drop it, or fill it?** The name and shape suggest it was meant to persist raw
and normalized intake per case, which the pipeline recomputes on every run
instead. There is a real argument for that being worth storing:

- `master_result` is a derived cache and is overwritten wholesale, so the input
  that produced any given analysis is not recoverable.
- Re-running the pipeline costs API calls; a stored normalized intake would
  allow re-deriving without re-parsing.

**But nothing needs it today**, and an empty table that looks useful is worse
than no table — this section exists because it already misled one design pass.

**Recommendation: drop it**, and reopen the question as "should intake input be
persisted, and in what shape" if the need appears. Dropping is a migration
against dev and then a production decision under CLAUDE.md section 6. Not urgent;
recorded so the next person to see `normalized_data` in the schema knows it is
empty by history rather than by accident.

---

## 18. Event candidates — SUPERSEDED, and wrong when written

> **This section's recommendation was wrong and was not followed.** It proposed
> storing candidates in `case_intakes.normalized_data`, on the reasoning that
> they already lived there. That table is dead and has never held a row — see
> section 19. Candidates are instead derived from `master_result.timeline`,
> which is genuinely persisted, and rejections are recorded in
> `case_event_candidate_dismissals` keyed on the sentence.
>
> The trigger this section identified — that "what the parser suggested" and
> "what the user has not answered" stop being the same set — was correct, and
> arrived faster than expected: a user rejecting a candidate once was enough.
> That is why the dismissal ledger exists. Kept for the reasoning, not the
> recommendation.

**Original text follows.**

**Decision: candidates stay in `case_intakes.normalized_data` for now. Recorded
so a later session watches for the trigger rather than rediscovering it.**

A narrative-parsed event is a CANDIDATE, not an event. The `case_events`
`source` CHECK has no `system-inference` value, so a parse cannot become a row
until a user confirms it. Candidates therefore need somewhere to live before
confirmation, and the choice was between a new `case_event_candidates` table and
the column they already occupy — `normalized_data.events`, written by the intake
normalizer.

`normalized_data` was taken. It needs no migration, and nothing yet requires
candidate state to outlive an intake run.

### The trigger that invalidates this

**Once a user can add events outside intake, "what the parser suggested" and
"what the user has not answered yet" stop being the same set.**

Today they coincide: every candidate came from one narrative parse, and a user
who has not been through the confirmation surface has answered none of them.
That coincidence is what makes a single column workable.

It breaks the moment any of these is true:

- **Intake is re-run.** A second parse produces a new candidate set. Does it
  replace the first, merge with it, or sit beside it? Candidates the user
  already rejected would reappear unless rejection is recorded — and
  `normalized_data` has nowhere to record a rejection, because it is the
  parser's output, not a user's answer.
- **A document is recognised** (step 4). A parsed document produces candidates
  that did not come from the narrative at all. Writing them into
  `normalized_data` would make that column mean two different things.
- **A user rejects a candidate.** There is currently no place to store "asked
  and declined". Without it, a rejected candidate is indistinguishable from an
  unanswered one and will be re-offered forever.

**The third is the one that will bite first**, because it needs no new feature —
just a user who says no once.

### What to do when it triggers

Move candidates to their own table with a status (`pending` / `confirmed` /
`rejected`), a `source` recording where the candidate came from, and a foreign
key to the `case_events` row when one is created from it. That is a migration
plus a read-path change, and it is cheap while nothing depends on the current
shape — which is the argument for watching the trigger rather than waiting for
symptoms.

---

## 17. `ProceduralEventType` mixes deadlines with events, and two courts

**Found 2026-09-13 while building `case_events`. The adapter handles it; the
union is wrong and someone should know why.**

`proceduralStateArchitecture.ts` declares `ProceduralEventType` with **77
members**. Two problems, both structural.

### a. Seven members are DEADLINES, not events

```
"defence-due"                    "undertaking-due"
"motion-confirmation-due"        "conference-materials-due"
"certificate-of-readiness-due"   "pre-trial-brief-due"
"trial-materials-due"
```

**An event happened; a deadline has not.** They are different kinds of thing
with different semantics, and deadlines are a separate table under
`DEADLINE_TRACKING_DESIGN.md` with a user-supplied date and a certainty. A
member like `defence-due` invites storing a deadline as an event, which would
put a date the site never computed into a record of things that occurred.

`case_events` maps none of the seven, and its own vocabulary has no `-due`
member. The mismatch is carried explicitly in `EVENT_TYPE_MAPPING` rather than
resolved by renaming either side.

### b. Superior Court civil vocabulary is mixed with Small Claims

`affidavit-of-documents-served`, `discovery-scheduled`, `discovery-completed`,
`undertaking-given`, `notice-of-action-issued` and others describe a procedure
Small Claims does not have. **Small Claims has no discovery.** The union is not
wrong about civil practice — it is one court's vocabulary in a type used by
three court paths, with nothing marking which member belongs where.

### What an audit would do

1. Move the seven `-due` members out, to the deadline model where they belong.
2. Tag or split members by court path, so a Small Claims caller cannot reach a
   civil-only member.
3. Check the result against the sourced vocabularies — `caseEventTypes.ts` for
   Small Claims, and the family equivalent when it is written.

**Not urgent, and not free:** `ProceduralEventType` is referenced by
`ProceduralRequirement.requiredBeforeEvents` and the dependency model, so
narrowing it touches `proceduralStateEngine.ts` broadly. Recorded so the next
person to look at that file knows the union is a known problem rather than a
considered design.

---

## 16. Every case table grants ALL to `anon`

**Inherited convention, matched by `case_events` for consistency, recorded here
rather than absorbed silently.**

`case_documents`, `case_evidence`, `case_generated_documents`, `case_intakes`
and `cases` each carry:

```sql
GRANT ALL ON TABLE "public"."<table>" TO "anon";
```

RLS holds the line — every one of these tables has `ENABLE ROW LEVEL SECURITY`
and a `USING (auth.uid() = user_id)` policy, and `auth.uid()` is null for an
anonymous request, so no row matches. The grant is survivable.

**But on a platform holding case details, this is one bad policy away from a
leak.** The grant is the wide default and RLS is the only thing narrowing it. A
policy dropped during a migration, a table created without `ENABLE ROW LEVEL
SECURITY`, or a policy written with `USING (true)` during debugging would each
turn a working grant into an open table. Defence in depth would have the grant
itself be narrow, so that an RLS mistake fails closed rather than open.

`case_events` matches the convention deliberately — diverging in one table
would leave two conventions and make the inconsistency itself a hazard. Fixing
it means changing all six together, checking nothing depends on anon access, and
is its own piece of work.

**Worth pairing with a check:** nothing currently asserts that every `case_*`
table has RLS enabled and a non-trivial policy. That check is cheap and would
catch the failure mode above.

---

## 15. Checks that DEFEND a defect — fixtures encode assumptions

**Found 2026-09-13. One instance fixed; nothing else audited for it.**

`verifyAuthorityKnowledgeBridge.ts` asserted:

```ts
assert.equal(jurisdictionRegulation.sourceReferences[1]?.sourceUrl,
  "https://www.ontario.ca/laws/regulation/r25042");
assert.equal(regulation.sourceUrl,
  "https://www.ontario.ca/laws/regulation/000626");
```

Both pinned the e-Laws **viewer** route, which returns a JS shell with no
readable text. The suite therefore **would have failed if anyone fixed those
citations** — and it did fail, on the commit that fixed them.

**This is a distinct failure mode from a check that cannot see a defect.** A
blind check is passive: it misses the problem. A check like this is active: it
holds the problem in place, and the person who fixes the bug is the one who gets
the red build. The pressure is to revert the fix.

**The general lesson: a fixture encodes an assumption as strongly as an
assertion does.** Any `assert.equal` against a literal is a claim that the
literal is correct. Any hand-built test double is a claim that its shape is
valid. Neither is reviewed the way shipped content is, and both outlive the
reasoning that produced them.

**Not audited.** One instance was found because a fix happened to collide with
it. Nothing systematic has looked for others. What to look for:

- `assert.equal(..., "<literal URL>")` — pins a URL, right or wrong.
- Test doubles carrying fields that shipped code no longer has, or values that
  shipped registries no longer use.
- Expected-output fixtures (`*.expected.md`) recording behaviour that was never
  correct, only current.
- Any fixture whose value was copied from production data rather than authored
  from a source.

A first pass could be mechanical: every literal URL in `scripts/verification/`
run through `isResolvableSourceUrl`. Synthetic fixtures (`.../regulation/example`)
would need excluding — they are test doubles, not citations, and two suites use
them legitimately.

---

## 14. The 146 undated ClaimType sources — the backfill plan

**Not started. Recorded so it can be done in batches rather than as one block.**

`verifyIntakeCoverage` prints the count every run: **146 of 146** ClaimType
sub-entries carry a `sourceUrl` with no `verifiedAt` — 75 plaintiff elements,
30 defendant considerations, 35 procedural notes, 6 defence concepts. Nothing
tracks whether any of them has gone stale.

`verifiedAt?` and `consolidationPeriod?` are now optional on all four types, so
**new** entries carry them and old ones are visibly absent rather than falsely
dated. The check reports and does not enforce, deliberately: failing would
pressure someone into stamping 146 dates to make the build green, and a
`verifiedAt` that was not verified is worse than none.

### The work is 26 fetches, not 146

The 146 entries point at only **34 distinct URLs**:

| Route | Distinct URLs | Cost |
|---|---|---|
| e-Laws `.doc` | 13 | fetch + `antiword` |
| ontario.ca / ontariocourts.ca pages | 13 | fetch |
| CanLII | 3 | **cannot be automated** — section 2 forbids scraping |
| Local PDFs under `docs/sources/` | 5 | free, already on disk |

Roughly **26 retrievals**, no OpenAI spend.

### But a date is not verification

`verifiedAt` asserts two things: the source was retrieved, **and the pinpoint
still says what we claim it says**. A 200 response satisfies only the first.
Honest re-verification means re-reading each cited proposition against the
fetched text — 146 propositions. This session alone turned up a paraphrased form
title, a judge prediction split across two source lines so grep missed it, and a
historical consolidation missing a 60-day notice rule. Budget it as a content
review with 26 fetches attached, not as a backfill.

### How to run it

1. **Per claim type**, not per URL — one claim type's elements reviewed together
   keeps the legal context in one place.
2. **Capture `consolidationPeriod` in the same pass.** For the 13 e-Laws URLs
   the header date is right there; fetching without recording it means a second
   pass later.
3. **Vendor the 3 CanLII URLs to `docs/sources/`** rather than re-fetching. That
   is the route Mustapha and Red Deer College already use, and section 2 forbids
   scraping CanLII.
4. **Grep each fetched source for "On a day to be named"** before dating it.

### Checked already, and clean

`elaws_statutes_90n01_e.doc` (Negligence Act, cited by
`defence-contributory-negligence`) was flagged as a possible repeat of the
Occupiers' Liability historical-version error. **It is not.** Checked
2026-09-13: HTTP 200, and its header reads "CONSOLIDATION PERIOD: FROM JANUARY
1, 2004 TO THE E-LAWS CURRENCY DATE" — current, not historical. The plain
`90n01_e.doc` form **403s**; the prefixed form is the only one that resolves.
The 2004 date looks alarming and is correct: the Act's last amendment was 2002,
c. 24, Sched. B, s. 25. s. 1 is the apportionment provision the defence concept
cites.

**The correction that matters for future sessions:** the `elaws_statutes_`
prefix is **not** itself a historical marker. The `_eV<nnn>` version suffix is.
SOURCING_NOTES.md now says so.

---

## Suggested order

**Before any real user:**
1. ~~`ai-case-partner` auth and ownership~~ — **removed: investigated and did not hold (§2).**
2. ~~The three Small Claims Rules defects~~ — ✅ done, `3fdccdc`.
3. ~~`outOfScopeForums.ts` citations~~ — ✅ done, `0791237`.
4. ~~Causation gap~~ — ✅ was never open; already fixed in `c5cefe1` (§1).
5. ~~The leave requirement~~ — ✅ confirmed and stated, `56de7ec`.
6. ~~Defamation and occupiers' liability from retrieved sources~~ — ✅ done in `d4a6fab` / `b8931e6`.
7. ~~Confirm and fix `case-summary` case-strength content~~ — ✅ done. Dashboard half in `dc3934c`; the route itself deleted in `901716e`.
8. **Walk through the site yourself.** Still hasn't happened. Nothing on this list substitutes for it.
9. `admin/scan-pdf-fields` — assess why an `/admin` route has no auth (§2).
10. Payload caps on `ai-case-partner`'s `caseMemory` and `evidence-praser`'s upload (§2). Nine routes already define `MAX_*_BYTES`; follow that pattern.
11. Push. **50+ commits unpushed.**

**Then:**
12. Build the readiness gate, intake depth, and the unmatched-claim-type path from the specs
13. CJA s. 29 and the Small Claims statutory cluster (see Decisions below)
14. Coverage expansion and out-of-scope routing

**Ongoing, in parallel:** the licensee conversation — it now gates two known items (the deemed-service composition gap in §1, and counting-method verification generally).

---

## Decisions — ALL RESOLVED (Session 48)

All four were delegated and acted on. Kept with outcomes rather than deleted, since two of them turned out to be larger than described.

### ✅ 1. `evidenceStrengths` asymmetry — resolved by deleting the route (`901716e`)
`app/api/case-summary/route.ts` is gone. Reachability re-verified independently: no fetch of the path anywhere, its only export was the Next.js `POST` handler and nothing imported it, and no verification script referenced it — `verifyAiCasePartnerContext.mjs` and `verifyServerAiReasoningContract.ts` both checked by name. The six `"case-summary"` hits prior sessions flagged are confirmed to be an unrelated `documentType` union member. **The asymmetry `6129abd` created dissolves rather than being answered in either direction.** Nothing was orphaned — `runCourtSimplifiedBrain` and `getAuthenticatedUser` both have many other callers. `ARCHITECTURE.md` updated in four places.

### ✅ 2. Latent judge-concern strings — removed (`c5fce59`)
**Three strings, not the two reported.** `Judge concern score` and `Cross-examination risk score` were flagged; `Document readiness impact` (typed `"none" | "minor" | "moderate" | "major" | "severe"`) sat alongside them, came from the same `credibilityRiskEngine`, and is the same kind of grading — removing only the named two would have left the defect under a less obvious label. `exportNotes` and its type are kept; what remains is `proceduralReadinessLabels()`, which states which procedural steps are ready — a fact about the file, not a grade.

### ✅ 3. Orphan routes — deleted (`a8b11ae`)
`/family/ontario` and `/ontario-civil`. Verified first: no link, redirect, rewrite, sitemap or test reference anywhere; `next.config.ts` defines no redirects or rewrites at all and the project has no sitemap route, so nothing 404s that previously resolved. Re-confirmed both carried zero sourced legal links (`ontario.ca`, `sourceUrl`, `officialUrl`, `canlii` all 0). Content recoverable from history if the marketing value matters.

### ✅ 4. `PROJECT_DOCUMENTATION/` — now tracked (`51b41ac`)
Re-scanned rather than trusting the prior session's scan: **0 secret matches, 0 emails, 0 phone numbers, 0 postal codes, 0 SIN-shaped strings, 0 files with real case narrative.** Inventory unchanged (31 files, 689 KB), so nothing had been added in between. **The `.gitignore` change needed care:** the entry was `_PROJECT_REGISTRY/`, which excludes the *directory*, and git cannot re-include a path whose parent directory is excluded — a bare negation would have silently done nothing. Changed to `_PROJECT_REGISTRY/*` plus a negation, and verified with `git check-ignore` that the generated output (`BuildStatus.txt`, `GENERATED_DOCUMENTATION/`) is still ignored.

---

## Superseded — kept for the record

### 1. The `evidenceStrengths` asymmetry
Commit `6129abd` deleted `evidenceWeaknesses` while keeping `evidenceStrengths`, having edited the `missingEvidence` block **directly above it** — so this was seen and kept, not missed. Grading evidence upward is the same operation as grading it downward.

| Option | For | Against |
|---|---|---|
| **Remove `evidenceStrengths` too** | Symmetry with the deletion already made; §3 bars grading, and "strong evidence" is a grade | Loses a signal some users may find reassuring |
| **Restore `evidenceWeaknesses`** | Restores symmetry the other way | Directly contradicts `6129abd`'s reasoning; reintroduces adequacy-graded commentary §3 prohibits |
| **Keep as is, document why** | Least churn | Leaves an unexplained asymmetry for the next reader to trip over |
| **Delete the whole route** | It has zero callers (§3); the question dissolves | Forecloses reviving it later without a rebuild |

**Note:** this lives in `app/api/case-summary/route.ts`, which is **unreachable** — no caller anywhere. So nothing user-facing turns on the answer today.

### 2. CJA ss. 23, 26, 27, 29, 31 — sourcing the statutory cluster
Real work, not a quick fix. **s. 23 is now partly done** (s.23(1) and the s.23(1.1) leave requirement are cited in `sc-topic-monetary-limit`). What I would build, if asked:

- **s. 29 — its own education topic, and the highest value of the five.** "What does this cost me if I lose" is the question self-represented people most need answered, and there is a statutory cap. `r. 19.06`/`19.07` already cite s. 29 from the Rules side; the statute itself is uncited.
- **s. 27 (evidence, relaxed in Small Claims)** — pairs naturally with the existing `sc-topic-burden-of-proof`.
- **s. 26 (representation)** and **s. 31 (appeals)** — each a short topic; s. 31 matters most to someone who has just lost.

Not built this session, as instructed.

### 3. `dashboardAdapter.ts:509-511` — the latent "Judge concern score"
Still present: `` `Judge concern score: ${…}` `` and `` `Cross-examination risk score: ${…}` `` built into `courtPackage.exportNotes`. This is the exact category `d1fa87c` was written to remove.

**Is removing it safe? Yes.** Traced fully: `exportNotes` is parsed into the dashboard model (`dashboardEngine.ts:419`) and typed (`types/case.ts:200`), but the only `.tsx` reference anywhere is `app/dashboard/page.tsx:146`, which sets it to `[]` as a default. **Nothing renders it.** Deleting the two lines removes strings that reach no user and breaks no display.

It was left alone only because it was out of scope for the commit that found it — not because removal is risky.
