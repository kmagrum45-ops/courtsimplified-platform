# Scenario sample review — 10%, 2026-09-26

Decision 4 required a bulk sample review of 10% of the synthetic scenarios, recorded
in the report. This is that record.

**Population: 35 scenarios** across the 7 authored claim-barring profiles.
**Sample: 4** (10%, rounded up), drawn deterministically at even intervals so the
same sample can be re-read rather than re-rolled.

Criteria: is it synthetic; does it contain personal data; is it phrased as a real
person would; and **does it belong to the profile it sits under**.

| # | Profile | Scenario | Verdict |
|---|---|---|---|
| 1 | `sc-claim-fall-municipal-sidewalk-or-road` | "I tripped on a broken sidewalk downtown and broke my wrist" | **keep** |
| 2 | `sc-claim-fall-toronto-sidewalk-or-road` | "I hurt myself on a raised sidewalk slab in Scarborough" | **keep, with a note** |
| 3 | `sc-claim-against-the-crown-ontario` | "The province cancelled my licence and it cost me income" | **REPLACED** |
| 4 | `sc-claim-by-or-against-an-estate` | "I lent money to someone who has since passed away" | **keep** |

All four are synthetic and none contains personal data, consistent with
`test:claim-types`. Two findings are worth more than the pass rate.

## Finding 1 — scenario 3 was the wrong shape, and has been replaced

> "The province cancelled my licence and it cost me income"

Challenging a licensing **decision** is a judicial review matter for the Superior
Court, not a damages claim, and nothing in the vendored Crown Liability and
Proceedings Act says otherwise. A scenario that trains the classifier toward this
profile for a judicial-review question would route somebody to the wrong court
**and** attach a sixty-day notice requirement they do not need.

Replaced with a claim that is actually a damages claim against the Crown:

> "A provincial office lost documents I sent and I had to pay to replace them"

**This is what the review was for.** The gates could not have caught it: the string
is synthetic, contains no personal data, is the right length, and reaches no render
path. Only reading it against the profile it sits under shows the mismatch.

## Finding 2 — scenario 2 sits in tension with the municipality gate

> "I hurt myself on a raised sidewalk slab in Scarborough"

Scarborough is part of Toronto, so the scenario is correctly filed and it usefully
tests whether the classifier knows that. But the Toronto profile requires the
municipality to be a **confirmed fact from the user**, never inferred by the model —
that is the whole point of `requiresConfirmedFact` on
`before-filing:notice-toronto`.

Inferring "Toronto" from "Scarborough" is an inference, however reliable. So this
scenario is kept deliberately as a **hard case**: the right behaviour is to ask
"which city or town was this in?" rather than to cite the City of Toronto Act
because a borough name appeared. Whether the classifier does that is an eval
question, and the story belongs in the eval set with `unknown` or a clarifying
question as its expected answer — not with the Toronto profile.

Recorded rather than changed, because deleting it would remove the test.

## What this says about the other 31

The sample found one genuine misassignment in four, which does not support a claim
that the remaining 31 are clean. The two structural checks in `test:claim-types` —
no personal data, no render path — hold across all 35 and are machine-verified. The
judgement question, *does this scenario belong to this profile*, is verified for
4 of 35 and is open for the rest.

**Recommendation: review the remaining 31 before they are used to generate eval
stories**, since a misassigned scenario becomes a misassigned expected answer, and
an eval that encodes the wrong answer is worse than no eval.
