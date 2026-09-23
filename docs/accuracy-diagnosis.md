# Why the procedural guidance is wrong — diagnosis before rewrite

**Date:** 2026-09-23. **Branch:** `accuracy-engine`. **No code was changed to produce this.**

Ten realistic Small Claims stories — six plaintiff, four defendant, spanning
before-filing through enforcement — were run through the live pipeline by
`scripts/diagnosis/traceAccuracy.ts`. Raw output: `docs/accuracy-trace-output.txt`.

The headline is worse than "often mismatched".

> **Eight of the ten stories produced the identical block**, and that block tells
> the reader: *"A defendant who wishes to dispute a claim must, within 20 days of
> being served, serve a Defence (Form 9A)…"*
>
> Among the eight are a plaintiff who filed but has not served, a plaintiff whose
> defendant never defended and who needs the clerk to note them in default, a
> plaintiff holding a settlement conference notice, **and a plaintiff who won at
> trial four months ago and wants to collect a judgment.**

All four are told to file a Defence within 20 days. None of them can. Two of them
are the plaintiff.

---

## The single largest cause: one `String.includes` in a `.tsx` file

`app/builder/_components/SmallClaimsIntake.tsx`, `inferStage()`:

```ts
if (
  input.filedDocuments.includes("defence") ||
  text.includes("served with a claim") ||
  text.includes("defendant") ||          // <-- this line
  text.includes("responding") ||
  text.includes("defending")
) {
  return "responding";
}

return "starting-case";
```

`text` is the user's role, story, service details and defence response,
concatenated and lowercased.

**Every Small Claims story contains the word "defendant", because that is what
the other party is called.** "I served the defendant on 20 July." "The defendant
filed a defence." "The defendant has paid nothing." A plaintiff cannot describe
their own case without naming the defendant, and the moment they do, the site
decides they *are* one.

This is not a model failure. No AI is involved in this decision at all. It is a
substring test, and it is the layer that decides which procedural instructions a
person reads.

### The second half of the same function

When no keyword matches, the function returns `"starting-case"`. There is no
"unknown" branch. A user who leaves the stage dropdown on **"Not sure"** — the
default — is never told the site is not sure. They are told to file a
Plaintiff's Claim.

`app/builder/page.tsx:91` does the same thing independently:

```ts
function getStageForPersistence(analysis, caseData) {
  return (
    analysis?.intelligence?.proceduralPosture?.stage ||
    caseData?.caseStage ||
    analysis?.caseStage ||
    "starting-case"           // <-- a guess, presented as a detection
  );
}
```

This value is what `StageConfirmation` shows as the *suggested* stage. The
suggest-then-confirm step added in the LSO work means the user can override it —
but the thing being suggested is a hard-coded default wearing the costume of a
detection, and people accept suggestions.

---

## Per-scenario trace

`classify` = `classifyCourtPath` (live). `facts` = `extractIntakeFacts` (live).
`guided` = `deriveCaseStage` (pure, facts-driven). `static` = `inferStage`
(pure, keyword-driven — **this is the one that selects the block**).

| # | Story | Correct stage | classify | guided | static | Block shown | Layers at fault |
|---|---|---|---|---|---|---|---|
| P1 | Contractor took $4,800, nothing filed | before filing | ✅ small-claims 0.9 | `starting-case` ✅ | `starting-case` ✅ | starting-case ✅ | — |
| P2 | Filed 4 Aug, not yet served | claim issued, r. 8.01(2) running | ✅ 0.7 | `already-started` ~ | **`responding`** ❌ | **responding** ❌ | b, c, e |
| P3 | Served 1 Sep, 2 weeks silence | r. 9.01 period running | ✅ 0.8 | `unknown` | **`responding`** ❌ | **responding** ❌ | b, e, f |
| P4 | Served 20 Jul, no defence ever | note in default, r. 11.01(1) | ✅ 0.9 | `unknown` | **`responding`** ❌ | **responding** ❌ | b, e, f |
| P5 | Defence filed, conference 12 Nov | settlement conference, r. 13 | ✅ 0.7 | `conference` ✅ | **`responding`** ❌ | **responding** ❌ | b, c |
| P6 | Won at trial, judgment unpaid | enforcement, r. 20 | ✅ 0.9 | `conference` ❌ | **`responding`** ❌ | **responding** ❌ | b, d |
| D1 | Handed papers 10 Sep | defence period, r. 9.01 | ✅ 0.7 | `responding` ✅ | `responding` ✅ | responding ✅ | — |
| D2 | Noted in default, was in hospital | set aside, r. 11.06 | ✅ 0.8 | `unknown` | **`responding`** ❌ | **responding** ❌ | b, e, f |
| D3 | Filed defence 3 weeks ago | settlement conference, r. 13 | ✅ 0.7 | `conference` ✅ | **`responding`** ❌ | **responding** ❌ | b, c |
| D4 | Bank garnished, judgment exists | set aside, r. 11.06 | ✅ 0.8 | `unknown` | **`responding`** ❌ | **responding** ❌ | b, e, f |

**2 of 10 correct.** Both correct cases are the two where "file a Plaintiff's
Claim" or "file a Defence" happens to be the right answer anyway.

The two worst are **P6** (a judgment creditor told to file a Defence) and **D4**
(someone whose bank account has already been garnished told to file a Defence —
the one thing they are barred from doing, because a defendant noted in default
cannot take a step without consent or leave).

---

## Failures by layer

### (a) Classification — **not the problem**

10 of 10 routed to `small-claims`, confidence 0.7–0.9. The court-path classifier
is doing its job. No work needed here.

### (b) Stage detection — **the primary cause**

Three separate defects, in order of damage:

1. **`text.includes("defendant")`** turns nearly every plaintiff into a
   defendant. Responsible for 7 of the 8 wrong answers.
2. **Hard defaults to `starting-case`** in both `inferStage` and
   `getStageForPersistence`. No "unknown" exists on the static path.
3. **Two stage systems that disagree and do not know about each other.**
   `deriveCaseStage` is careful, facts-driven, and returns `unknown` when the
   facts do not settle it — exactly the right design. `inferStage` is a keyword
   regex that always answers. **The block a user reads is selected by the
   keyword one.** The careful one only runs on the guided path and its answer is
   discarded for block selection.

   Note rows P5 and D3: `deriveCaseStage` got `conference` **right** and the
   user was still shown `responding`. The correct answer existed inside the
   system and was thrown away.

### (c) Block selection / mapping — a consequence, not an independent fault

`nextStepBlockFor(pathway, stage)` is a plain map lookup and behaves correctly.
It cannot be better than the stage handed to it. The mapping defect is
structural: **there is no wiring from `deriveCaseStage` to block selection at
all**, so the better detector cannot influence the output.

### (d) Content wrong or missing

- `next:small-claims:enforcement`, `:urgent`, `:not-sure` are
  `[NEEDS LICENSEE REVIEW: …]` placeholders and render as nothing. P6 would show
  an empty screen even with perfect detection.
- The Small Claims blocks that *do* exist are sourced and accurate — the LSO
  work verified them against r. 7.01(1)/(1.1), 8.01(2), 8.09.1, 9.01, 11.01,
  15.01, 18.03(4). **The content is not the main problem. The routing is.**

### (e) The stage taxonomy is far too coarse

`UniversalStage` has nine values: `starting-case`, `responding`,
`already-started`, `conference`, `motion`, `trial`, `enforcement`, `urgent`,
`not-sure`. It is a cross-pathway taxonomy — the same nine serve Family, Civil
and Small Claims — so it expresses none of them precisely.

**Stages with no representation at all**, each of which appeared in this
ten-story sample:

| Real position | Nearest available value | Why that is wrong |
|---|---|---|
| Claim issued, not yet served | `already-started` | Says nothing about the r. 8.01(2) six-month service window, which is the only thing that matters here |
| Served, defence period running | `already-started` | Cannot distinguish "wait" from "act" |
| Twenty days elapsed, no defence | — | The r. 11.01(1) noting-in-default step has nowhere to live |
| Noted in default | — | A defendant here is *barred* from filing a defence; the site tells them to file one |
| Default judgment signed | — | Needs r. 11.06 set-aside, not a defence |
| Judgment obtained, enforcing | `enforcement` | Exists but is an unwritten placeholder |

`urgent` and `not-sure` are not procedural positions at all. `urgent` has no
provision to cite — its own catalogue entry says so.

**Even with perfect detection, five of the ten stories have no correct block to
select.** That makes the taxonomy, not the detector, the binding constraint.

### (f) Information the site never asks for

`extractIntakeFacts` is permitted to return exactly five fields: `role`,
`disputeCategory`, `claimFiled`, `claimServed`, `defenceFiled`.

**No dates.** Not the date of service, not the date of filing, not a conference
or trial date. So no deadline can be computed, and the difference between "served
three days ago" and "served three months ago" — which decides whether noting in
default is available — is invisible to the system.

**No later events.** Nothing records whether a defendant has been noted in
default, whether default judgment was signed, whether a settlement conference
has happened, or whether judgment was obtained at trial. D2, D4 and P6 all turn
on facts the extractor is not allowed to report.

This produced visible extraction errors: for **D4** ("my bank account got
garnished… there is a judgment against me") the extractor returned
`claimFiled: false`. For **D2** (noted in default) it also returned
`claimFiled: false`. Both people are deep inside a filed action. The model was
not wrong so much as cornered — it was asked whether a claim had been "filed"
by a narrator who never saw the claim, and given no field in which to say
"judgment already exists".

---

## Model and context inventory

| Call | Model | Temp | Output | Context it receives |
|---|---|---|---|---|
| `runSafetyPass` | `gpt-4o-mini` | 0 | `json_object` | story text only |
| `extractIntakeFacts` | `gpt-4o-mini` | 0 | `json_object` | story text only |
| `extractIntakeFactsWithConfidence` | `gpt-4o-mini` | 0 | `json_object` | story text only |
| `classifyClaimTypeWithAi` | `gpt-4o-mini` | 0 | JSON **schema**, enum-constrained | story + candidate claim types |
| `classifyCourtPath` | `COURTSIMPLIFIED_CLASSIFIER_MODEL` → `COURTSIMPLIFIED_REASONING_MODEL` → `gpt-4o-mini` | 0 | `json_object` | story + declared path |
| `runStructuredGptCognition` (brain) | `COURTSIMPLIFIED_REASONING_MODEL` → `gpt-4o-mini` | **0.1** | `json_object` | whole `NormalizedIntake` |

### Calls that cannot be right with what they are given

**`extractIntakeFacts`** — asked for a five-field snapshot of a case that may be
two years into litigation. It has no vocabulary for default, judgment,
conference, trial or enforcement, and no date fields. This is the call whose
output `deriveCaseStage` depends on.

**No call receives the stage taxonomy.** Not one of the six prompts contains the
list of stages, what distinguishes them, or the rules that attach to them. Stage
is decided afterwards, by `String.includes` in a React component. The model is
never asked the question the product most needs answered.

**`classifyClaimTypeWithAi` is the one call built the right way** — its
`response_format` is a JSON *schema* with the candidate ids as an enum, so the
model physically cannot return an id that does not exist. Every other call uses
bare `json_object` and validates afterwards. That difference is the template for
Part 5.

---

## What this means for the plan

Priority order, from the evidence rather than the brief's ordering:

1. **The taxonomy (Part 2) comes first.** Five of ten stories have no correct
   destination. Improving detection before there is somewhere correct to detect
   *to* would be measuring the wrong thing.
2. **Delete `inferStage`, and make `unknown` a real outcome.** One line is
   causing 7 of 8 failures, and the honest fallback already exists in
   `deriveCaseStage` — it is simply not wired to anything users see.
3. **Ask for the facts that decide the stage (Part 5's clarifying questions).**
   Service date, service method, whether noted in default, whether judgment
   exists. Today none of these can even be represented.
4. **Content (Part 3) is genuinely behind routing.** The existing Small Claims
   blocks are sourced and correct; they are shown to the wrong people. The
   exceptions are the three placeholders, of which `enforcement` is the one a
   real user hit in this sample.
5. **Constrain every stage-bearing output with a JSON schema enum**, the way
   `classifyClaimTypeWithAi` already does.

One thing this diagnosis does **not** support: that the problem is the model, or
the prompts, or the content. On this sample the model-driven layers
(classification, and extraction within the fields it was given) performed
adequately. **The wrong answers came from hand-written procedural code and from
a taxonomy too coarse to hold the right answer.**
