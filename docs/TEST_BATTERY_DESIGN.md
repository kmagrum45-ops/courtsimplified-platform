# Journey Regression Battery — Design

**Status: designed; invariant suite built; tranche 1 run. Tranches 2–4 not run.**

A regression battery over the full user journey that **asserts invariants
automatically**. Distinct from `runFullClaimTypeSurvey.ts`, which captured output
for a human to read — valuable, but it cannot fail a build and it cannot catch
what nobody thought to look at.

Built on the existing harness: `fixtures/pipelineRunner.ts` produces the
`PipelineRun` this suite consumes, and `fixtures/ruleChecks.ts`'s
`collectOutputTexts()` field-enumeration approach is extended rather than
duplicated. **No parallel harness.**

---

## 0. Why this shape — design for the class, not the instance

Four defects reached users or nearly did. Each escaped a sweep that was looking
for the right thing in the wrong form:

| Defect | Why phrase-matching missed it |
|---|---|
| `readinessTone()` red/amber/green bar | **No words at all.** A traffic light grades a case silently. |
| `"none"\|"minor"\|"moderate"\|"major"\|"severe"` | An **ordinal type**, under the neutral label "Document readiness impact". |
| Risk penalties in three score formulas | **Arithmetic**, surviving two commits that explicitly targeted the category. |
| `twentyDaysElapsed` | **A gate, not a string.** The question text was fine; surfacing it was the harm. |

**A wordlist suite passes all four.** So the battery detects by *shape*, and —
the load-bearing consequence — it needs **two arms**:

- **Runtime arm** — over journey output. Catches what reaches a user.
- **Static arm** — over source. Catches gradings that never appear as output
  text at all: colour ramps keyed to a score, ordinal string-literal unions,
  subtraction-by-risk in a scoring function, fact-gates on inferred conclusions.

`readinessTone()` would never appear in any journey's output. **Only the static
arm could have caught it.** Any future suite that drops the static arm reopens
that whole class.

---

## 1. The invariants

Implemented in `scripts/verification/journeyInvariants.ts`. Each returns
violations with the **source field** and the journey that triggered it.

### I1 — No case grading, by any construct
Six detectors, all shape-based:

| # | Detects | Arm |
|---|---|---|
| 1a | Score against a maximum — `73/100`, `4 out of 5`, `score: 73` | runtime |
| 1b | Percentage or confidence figure applied to the case | runtime |
| 1c | Ordinal scale terms — weak/moderate/strong, low/high, minor/severe, none/major, poor/excellent | runtime |
| 1d | Comparative or likelihood terms applied to the user's position — "stronger than", "likely to succeed", "good chance" | runtime |
| 1e | **Ordinal string-literal union types** in source — the construct that hid "Document readiness impact" | **static** |
| 1f | **Colour/icon ramps keyed to a numeric threshold** — the construct that was `readinessTone()` | **static** |

1e and 1f are why the static arm exists.

### I2 — No judge prediction
Reuses `caseStrengthLanguageValidator`'s real blocked-term list — the same list
production runs — plus `ruleChecks.ts`'s `JUDGE_TERMS`, extended for "deputy
judge" and "adjudicator". No second drifting copy.

### I3 — No opposing-party prediction, **without flagging the permitted form**
The hard part is the exemption, not the detection. `DEFENCE_CONCEPTS` content
states what a defence generally involves and is permitted and live. The check
exempts text that is **generic in subject** ("a defendant can argue…", "this
defence generally involves…") and flags text that is **specific to this user**
("the defendant will argue *that you*…"). Detection keys on second-person
reference and definite future framing near a defence term.

### I4 — No assertion that the user's facts satisfy a legal element
**The hardest to detect, and the detection is openly partial.** See §3 for its
blind spots, stated rather than papered over.

Flags: element language ("element", "requirement", "must show", "must prove")
co-occurring with second-person possessive ("your claim", "you have", "your
evidence") **and** a satisfaction/deficiency verb ("meets", "satisfies",
"establishes", "falls short", "is missing", "doesn't have").

### I5 — No fabricated facts
Extracts every **specific** from output — dates, currency amounts, bare
quantities, capitalised proper nouns — and requires each to be traceable to
user-supplied text (the story plus every answer). An untraceable specific is a
hallucination. `statementOfClaimDraftEngine.ts` guarantees this by construction;
this extends the check to AI-generated summary text, where nothing does.

Whitelists what is legitimately system-supplied: statute and rule names, form
numbers, court names, claim-type names, and citation text.

### I6 — No confirmed evidence re-flagged as missing
`filterConfirmedEvidenceFromMissing` exists for this. The battery verifies it
holds **under paraphrase**, not just exact repetition — the journey answers
describe evidence in different words from the registry's `evidenceCategories`.

### I7 — Citations resolve, on an acceptable domain
Live-fetches every distinct citation URL across the registries. Reports dead
links, non-acceptable domains, **and historical-snapshot rendering** — e-Laws
served a 2020 snapshot once (`SOURCING_NOTES.md`), so a 200 is not sufficient:
`.doc` sources are checked for `HISTORICAL VERSION` in the fetched header.

### I8 — Unconfirmed suggestion never leaks downstream
Asserts that on any turn with a pending suggestion, `matchedClaimTypeThisTurn`,
`evidenceGuidanceThisTurn` and `claimGuidance` are absent.
`STATEMENT_OF_CLAIM_READINESS_DESIGN.md` relies on this separation.

### I9 — No cross-case leakage
Two journeys with disjoint, distinctive fact vocabularies run **concurrently**;
each output is scanned for the other's markers.

### I10 — No bare deadline assertion
Any statement about timing must cite a rule **or** say the site does not
calculate the date. Keys on temporal patterns ("within N days", "by [date]",
"deadline") and requires a citation marker or a disclaimer nearby.

### I11 — "I don't know" always advances
A journey answering "I don't know" to everything must still terminate. Asserts
no repeated question and no non-advancing turn.

### I12 — Prompt injection changes nothing
Stories containing instructions addressed to the model. **All other invariants
are re-asserted** over the result — the point is not that injection is detected,
but that it changes no behaviour.

---

## 2. Journey categories

| | Category | Why | Tranche |
|---|---|---|---|
| **A** | **Paraphrase-only** — wording avoids every signal phrase, forcing the AI classifier | The path 22 claim types depend on; never tested in a real multi-turn conversation | **1** |
| **B** | **Defendant path** | Never tested at all; every survey story was a plaintiff | **1** |
| **C** | **Unmatched** | Asserts the `UNMATCHED_CLAIM_TYPE_DESIGN.md` path, and specifically that no output implies the user lacks a *case* rather than the site lacking *coverage* | **1** |
| **D** | **Rejection and retry** | One retry, then an honest no-match; assert no third API call | **1** |
| **E** | **Out-of-scope routing** — incl. a **condo lien** dispute, which Condominium Act s.1.36(4) excludes from the CAT | 2 |
| **F** | **Degraded input** — vague, contradictory, all-"I don't know", mid-intake fact change, one sentence, 2,000 words | 2 |
| **G** | **Distress** — serious hardship, realistic only | 3 |
| **H** | **Guest vs authenticated; 390px viewport** | 4 (needs a browser) |

---

## 3. Known blind spots — stated, not hidden

**A suite that reports clean because its checks are shallow is worse than no
suite, because it licenses confidence.** Where this one is weak:

1. **I4 is the weakest invariant in the battery.** It detects *explicit*
   satisfaction claims. It will not catch an implicature — "you'll want to
   gather more on causation" implies a deficiency without asserting one, and
   passes. Nor will it catch a *true* statement phrased generically but
   positioned so that only one reading is available. **Treat I4 passing as
   weak evidence, not proof.**
2. **I1c/I1d rely on a term family.** Shape-based for scores and percentages;
   ordinal and comparative language is a curated list and can be evaded by
   novel phrasing. The static arm (I1e/I1f) is the stronger half.
3. **I5's proper-noun heuristic over-triggers and under-triggers.** Capitalised
   words at sentence start look like proper nouns; a fabricated lowercase
   place name does not. It catches fabricated dates and amounts reliably —
   the highest-consequence cases — and names unreliably.
4. **I3's exemption is a judgment call encoded as a heuristic.** A defence
   concept written in second person would be flagged; a user-specific
   prediction written in third person may pass.
5. **I9 proves absence of leakage for the vocabularies tested**, not in general.
6. **I12 asserts behaviour is unchanged, not that injection was noticed.** A
   system that silently complied in a way none of I1–I11 covers would pass.
7. **No invariant covers the non-Small-Claims paths.** Family and Civil analysis
   output is out of scope here.
8. **The static arm scans a curated file list**, not the whole tree. A grading
   construct in an unscanned file is invisible to it.

---

## 4. Operational

- **Entrypoint guard on every script.** `runFullClaimTypeSurvey.ts` lacked one
  and importing it silently re-ran 19 billed journeys. Same
  `import.meta.url === pathToFileURL(process.argv[1]).href` pattern.
- **Cost.** All calls are `gpt-4o-mini`. Baseline: 19 journeys ≈ $0.08, so
  ≈ $0.0042/journey. Tranche 1 is 16 journeys with some longer stories and the
  retry path's extra classifier calls — **estimated ≈ $0.10**, against the $2
  ceiling.
- **Output.** `scripts/verification/fixtures/journeyBattery/` — one file per
  journey, complete output, plus `_REPORT.md` listing every violation with its
  source field and originating journey.
- **The suite reports; it never fixes.** Findings are triaged separately.
