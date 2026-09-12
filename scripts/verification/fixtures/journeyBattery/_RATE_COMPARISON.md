# Interception rate — before vs after the prompt change

**10 runs total, 5 either side, 16 journeys each = 160 journey-runs.**
Actual cost ≈ $0.67 against the $3 ceiling.

Change measured: commit `24e47c3` (element status vocabulary, REQUIRED DEPTH
#2, the #8/#9 split, and two grading instructions in the example JSON).

---

## The headline: on totals, NO MEASURABLE DIFFERENCE

| | Before | After |
|---|---|---|
| Per-run totals | **3, 2, 5, 7, 5** | **4, 5, 3, 3, 4** |
| Mean | 4.40 | 3.80 |
| Min / max | 2 / 7 | 3 / 5 |
| **Spread** | **5** | **2** |
| Grand total | 22 | 19 |

**The difference in means is 0.60. The before-spread is 5.** Every single
after-run value (3, 4, 5) falls inside the before-range of 2–7. The after
distribution sits entirely within the before distribution.

**So on totals this change is not distinguishable from noise, and it must not
be reported as a 14% reduction.** With n=5 either side and a spread this wide,
22 → 19 is exactly the kind of difference the five-run protocol existed to stop
anyone claiming.

---

## But the COMPOSITION changed decisively, and that is not noise

### By matched term

| Term | Before | After |
|---|---|---|
| `viability` | 18 | **19** |
| `may argue` | **4** | **0** |

### By field

| Field | Before | After |
|---|---|---|
| `cognition.structuredCaseSummary` | 15 | **19** |
| `cognition.claimClassifications[0].elements[1].risks[0]` | 3 | **0** |
| `cognition.litigationRisks[0].explanation` | 2 | **0** |
| `cognition.litigationRisks[0].title` | 2 | **0** |
| **Distinct leak sites** | **4** | **1** |

**Three of four leak sites went to zero. `may argue` went to zero.** Those are
categorical changes, not shifts within a range — a field that produced 7
interceptions across 80 journey-runs producing 0 across the next 80 is not the
same kind of observation as 22 vs 19.

---

## What this actually shows

**1. The element-status fix worked, and worked exactly where predicted.**

Part 2(b) argued the schema enum was the root cause: the model was ordered to
mark elements `satisfied`, then told in prose not to grade. The grading leaked
into the fields adjacent to that requirement —
`claimClassifications[].elements[].risks[]` and `litigationRisks[]`.

Those fields are now **silent**. 7 → 0. Changing what the schema *required*
removed the grading from the places the requirement touched, which is the
prediction the change was built on.

**2. `may argue` is gone.** 4 → 0. Opposing-argument prediction — the I3
violation class the battery's own I3 check never saw, because it only reads
post-sanitizer output — no longer appears at all.

**3. The main target was NOT hit. This is the honest failure in this result.**

`viability` in `structuredCaseSummary` went **15 → 19**. It did not fall. If
anything it **concentrated**: it is now the *only* interception type, where
before it was 68% of them.

REQUIRED DEPTH #8/#9 — the split that quoted the exact failing phrase and said
"then STOP" — **did not stop it.** That was the change aimed most directly at
this failure and it did not work.

**Possible explanations, none verified here:**
- The summary field is where the model naturally concludes, and an instruction
  to stop mid-thought fights the generative grain harder than a schema change
  does.
- Removing the grading from the element fields may have displaced it rather
  than eliminated it — the model still "wants" to say what the gaps mean and
  now has one fewer place to put it. The rise from 15 to 19 is consistent with
  displacement, though it is well inside the noise and should not be leaned on.
- `structuredCaseSummary` may simply need the same treatment the element status
  got: a structural change to what is *asked for*, rather than a prohibition on
  how to finish it.

**4. The after-spread is much tighter (5 → 2).** Possibly more consistent
behaviour; possibly chance at n=5. **Not claimed as a finding.**

---

## Verdict

| Claim | Supported? |
|---|---|
| "The change reduced the interception rate" | **No.** Inside the noise. |
| "The change eliminated opposing-argument prediction" | **Yes.** 4 → 0. |
| "The change removed grading from the element and risk fields" | **Yes.** 7 → 0, 3 leak sites to 1. |
| "The change fixed the viability problem" | **No.** 15 → 19. The primary target was missed. |

**Net: a real structural improvement that does not show up in the headline
number, plus a clear miss on the dominant failure mode.**

The change is worth keeping — three leak classes closed is not nothing, and the
schema no longer orders the model to do what the prose forbids. But anyone
reading "22 → 19" as success would be reading noise, and the thing that
actually needed fixing is still there.

---

## Recommended next, and why

**Do not iterate on the #8/#9 wording.** It is the strongest prose form
available — it quotes the failing phrase and names the stopping point — and it
did not move the number. More emphasis is unlikely to beat a generative
tendency that survived it.

**Instead, treat `structuredCaseSummary` the way the element status was
treated: change what is asked for, not what is forbidden.** The field currently
asks for a free-text narrative summary, which is an invitation to conclude. A
structured shape — a list of "recorded" and "not recorded" items with no prose
connective — removes the slot the conclusion goes in. That mirrors what worked
here and avoids what did not.

**Measurement protocol for that attempt:** the same 5-run either side, and the
same rule — report the distribution, and if the difference sits inside the
spread, say so.
