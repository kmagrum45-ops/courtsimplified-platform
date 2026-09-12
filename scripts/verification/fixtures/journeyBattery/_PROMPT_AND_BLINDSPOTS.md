# Part 2(b) and Part 3 — Reports

**Reports, not commits.** Nothing here was implemented. Part 2(b) is explicitly
a recommendation about a live pipeline prompt and deserves its own pass with
fixture comparison.

---

# Part 2(b) — Why the model generates case-strength language

**Read: `courtSimplifiedBrain.ts` lines 1695–1730, the system prompt's
prohibition block, CANONICAL VALUES section, and REQUIRED DEPTH section.**

## The instruction is not unclear. That is the finding.

The prohibition is stated **twice**, explicitly, and **names the exact word the
model produced three times**:

> **Line 1705** — "Never state or imply anything about the claim's overall
> strength, **viability**, likely outcome, or chances of success, in
> intelligenceSummary, structuredCaseSummary, **or any other field**. Describe
> what facts and evidence are present or absent; do not grade what that means
> for the case."

> **Line 1725 (REQUIRED DEPTH #8)** — "Never state or imply the claim's
> strength, **viability**, or likely outcome."

So the obvious hypotheses are wrong:
- It is **not** missing — it is stated twice.
- It is **not** vague — it names viability, strength, likely outcome, chances.
- It is **not** narrowly scoped — line 1705 says "or any other field".

**Three unrelated stories producing the identical phrase against an instruction
this explicit points somewhere else: the prompt contradicts itself.**

## The contradiction

The same prompt that forbids grading **requires** it, three times, in
structurally stronger positions than the prohibition:

| Location | What it requires | Conflict |
|---|---|---|
| **CANONICAL VALUES** — `Allowed element status: satisfied, partially-satisfied, missing, contradicted, not-applicable` | The model must mark each legal element **satisfied** or **partially-satisfied** | This is the "who does the applying" violation encoded **as a required enum**. The model is ordered to state that the user's facts satisfy an element. |
| **CANONICAL VALUES** — `Allowed confidence: very-low, low, medium, high, very-high` | An ordinal grade per claim | An ordinal scale the model must populate |
| **REQUIRED DEPTH #2** — "Identify the **strongest** primary theory, viable alternatives, **weak** theories" | Rank theories by strength | Explicitly asks for strength ranking |
| **REQUIRED DEPTH #8** — "Explain theory, risk, proof gaps, and next step. Never state or imply the claim's strength, viability, or likely outcome." | Both, **in one sentence** | Asks for the analysis and forbids its natural conclusion |

**A schema constraint beats a prose prohibition.** `satisfied` and `very-high`
are not suggestions the model weighs — they are the only values the JSON schema
accepts. The model is required to grade, then told in prose not to. It does
both, and "may affect the claim's **viability**" is what that resolution sounds
like.

The identical phrasing across three stories supports this. "…gaps in evidence
regarding the falsity and the extent of harm, and key dates are missing, which
may affect the claim's viability" is the natural English completion of *"explain
proof gaps"*. The model is finishing the sentence the prompt asked for.

## Recommendations, in order of expected effect

**1. Remove the contradiction before rewording anything.** Reordering or
bolding the prohibition will not beat a schema enum. Specifically:

- **`Allowed element status`** — `satisfied` / `partially-satisfied` should
  become something factual: `documented` / `partially-documented` /
  `not-documented`. That is a statement about what is in the file, which the
  system may make, rather than about whether a legal test is met, which it may
  not. **This is the single highest-value change** and it aligns the schema with
  `STATEMENT_OF_CLAIM_READINESS_DESIGN.md`, which already established that the
  system may not assert element satisfaction.
- **`Allowed confidence: very-low…very-high`** — if this drives only internal
  routing, it should not be a field the model narrates from. If it reaches
  output, it is an ordinal grade.
- **REQUIRED DEPTH #2's "strongest / weak theories"** — reframe as "the theory
  the facts most directly describe" and "theories the facts do not address",
  which is about fact coverage rather than merit.

**2. Split REQUIRED DEPTH #8.** Asking for proof-gap explanation and forbidding
the conclusion in the same sentence invites exactly the completion observed.
Separate the instruction to describe gaps from the instruction never to say what
they mean.

**3. Give the model the permitted form, not only the forbidden one.** The
judge-prediction rule at line 1704 works better than the strength rule, and the
difference is instructive: it supplies **replacement phrasing** ("reframe as
procedural or evidentiary readiness gaps instead — a missing document, an
unconfirmed date, an element without documented proof"). The strength rule at
1705 says "do not grade" and stops. Add the equivalent: *"Write 'no document has
been recorded for X' rather than 'this may affect the claim.'"*

**4. Only then consider positioning.** The prohibitions sit at the end of a
~10-item "do not" list, and REQUIRED DEPTH — which demands the grading — comes
*after* them. Recency favours the requirement. Worth fixing, but it is the
smallest of the four.

## Why this was not implemented

A prompt change alters behaviour on every live path. The right sequence is:
change the enum, run `test:fixtures` and a journey tranche, and compare
interception counts before and after — which **Part 2(a) now makes measurable
for the first time**. That is the point of doing 2(a) first.

---

# Part 3 — The suite's own blind spots

## Blind spot 8 (curated file list) — ADDRESSED, with a caveat

It hid real findings **twice**: `masterCaseSchema.ts` during the self-test, and
`document-export/page.tsx` during tranche 1. Both misses concealed live defects.

**`checkI1Static` now walks all of `app/` and `src/` by default.** Feasibility
was measured, not assumed: **219 files, well under a second, no network calls.**

**The honest tradeoff:** curated list → 11 hits; whole tree → **101 hits across
42 files**. The extra hits are **not all defects**. The detector flags a
*construct*, and no regex can distinguish an ordinal union that grades the
user's case (prohibited) from one that is a log level or an internal band
(fine). So the wide output is a **triage queue, not a defect list**, and it is
documented as such in the code.

**What the wide scan bought immediately:** **zero threshold-colour ramps
anywhere in `app/` or `src/`.** After fixing `statusTone` and `getExportTone`,
that class is now clean tree-wide — a curated list could only ever have
reported that the files someone thought to list were clean.

## I4 — still weak. Not fixed, and here is exactly why

**What it currently checks.** Three conditions, all of which must match in the
same string:

```ts
ELEMENT_WORDS    = /element|requirement|must show|must prove|need to show|need to prove|test for/i
SECOND_PERSON    = /your (claim|case|evidence|facts|situation|story)|you have|you don't have|you meet/i
SATISFACTION_VERB= /meets?|satisfies|establishes?|proves?|fails? to|falls? short|is missing|doesn't meet|.../i
```

**Where it is blind:**

1. **Conjunction is the core weakness.** All three must co-occur *in one
   string*. Real output splits the claim across a summary sentence and a list
   item, and neither alone trips it.
2. **Implicature passes entirely.** "You'll want to gather more on causation"
   asserts nothing and communicates a deficiency perfectly. So does "Evidence
   recorded for: duty. Evidence recorded for: causation — none."
3. **Third-person phrasing passes.** "The claim requires proof of publication;
   no document has been recorded" is the same message without `you`.
4. **It cannot see the schema-level version at all** — and that is where the
   real violation lives. `elements[].status = "satisfied"` **is** an assertion
   that the user's facts satisfy an element, in structured data rather than
   prose. I4 scans text. **It would never have found the thing Part 2(b)
   identifies as the root cause.**

**Tranche 1's zero I4 hits should be read as weak detection, not clean output.**
The same run showed the model reaching for case-strength language four times.

**Why no fix this session.** A stronger-looking regex would still miss 1–4. The
only detection that would actually work is checking the **structured** output —
flagging any `element.status` value that asserts a legal conclusion — and that
is a real piece of work, not a pattern tweak. **An honest "this check is weak
and here is where" is worth more than a pattern that looks strengthened and
still misses the schema.**

## Recommended next, in order

1. Change `Allowed element status` (Part 2(b) #1) — fixes the root cause *and*
   removes what I4 cannot see.
2. Add a structured-output invariant over `elements[].status` — the real I4.
3. Triage the 101-hit wide-scan queue by asking, per hit, whether the ordinal
   describes the user's case or something else.
