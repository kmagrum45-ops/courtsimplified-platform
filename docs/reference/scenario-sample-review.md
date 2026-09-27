# Scenario review — all 35, 2026-09-27

Supersedes the 10% sample of 2026-09-26. **Every scenario has now been read against
the profile it sits under.** No model calls; this is reading.

**Population: 35** across the 7 authored claim-barring profiles.
**Reviewed: 35.** **Replaced: 5** (1 in the sample, 4 in this pass).

Criteria: synthetic; no personal data; phrased as a real person would; **and does it
belong to this profile** — meaning would training a classifier on it point at the
right notice regime.

That last criterion is the one that matters, and it is the one no gate can check.
`test:claim-types` verifies the structural properties across all 35 by machine. The
judgement is human, and it found five problems the machine could not.

---

## The five replaced, and why each was wrong

| Profile | Was | Why it was wrong |
|---|---|---|
| `sc-claim-against-the-crown-ontario` | "The province cancelled my licence and it cost me income" | Challenging a licensing **decision** is judicial review in the Superior Court, not a damages claim. Would have attached a 60-day Crown notice to somebody who needs a different court. |
| `sc-claim-fall-municipal-sidewalk-or-road` | "a loose paving stone outside the library" | A library forecourt is the institution's own land, not a highway or sidewalk. That is an occupiers' liability matter, not the s. 44 regime — wrong deadline, wrong defendant. |
| `sc-claim-fall-toronto-sidewalk-or-road` | "a broken curb on Queen Street" | There is a Queen Street in a great many Ontario municipalities. The scenario carries **no signal at all** that this is Toronto, and Toronto has its own statute. |
| `sc-claim-against-the-crown-ontario` | "sue a provincial agency over money they took" | Vague twice over: money taken by a public body is often a fee or tax dispute with its own appeal route, and many provincial agencies are separate legal entities rather than the Crown, so s. 18 may not apply. |
| `sc-claim-against-the-crown-ontario` | "A government road crew wrecked my fence" | Road crews are usually **municipal**. This profile carries the Crown's 60-days-**before** notice; a municipality carries 10-days-**after**. Getting that backwards is the most expensive confusion in this tier. |

Three of the five were on the Crown profile. That is not chance: "the government" is
the one phrase a self-represented person uses for the province, the city, an agency
and a ministry interchangeably, and those four carry different notice regimes. The
Crown scenarios needed to name the actor explicitly, and now do.

---

## Two kept deliberately, as hard cases

**`sc-claim-fall-toronto-sidewalk-or-road`: "a raised sidewalk slab in Scarborough".**
Scarborough is Toronto, so the filing is right, and it usefully tests whether the
classifier knows that. But the Toronto profile requires the municipality as a
**confirmed fact from the user**, never inferred — that is what
`requiresConfirmedFact` on `before-filing:notice-toronto` is for. Inferring "Toronto"
from a borough name is still an inference. So the correct behaviour is to **ask**
which city, and this story belongs in the eval set expecting a clarifying question
rather than the Toronto profile. Deleting it would remove the test.

**`sc-claim-fall-toronto-sidewalk-or-road`: "There was ice on a Toronto sidewalk".**
This sits across two regimes — s. 42 (6) for a Toronto sidewalk and the Occupiers'
Liability Act s. 6.1 (1) sixty-day snow-and-ice notice. For a municipal sidewalk the
municipal regime governs, so the filing is right. Kept because the overlap is real
and a user will describe it this way; noted here so nobody "fixes" it later by moving
it to the snow-and-ice profile.

---

## The 30 that stand

| Profile | Scenarios | Verdict |
|---|---|---|
| `sc-claim-fall-municipal-sidewalk-or-road` | 5 | 4 stand, 1 replaced |
| `sc-claim-fall-toronto-sidewalk-or-road` | 5 | 3 stand, 1 replaced, 1 kept as a hard case |
| `sc-claim-fall-snow-ice-private-property` | 5 | **all 5 stand** — parking lot, apartment walkway, restaurant entrance, plaza, and one where the landlord blames the snow contractor, which usefully exercises the multiple-occupier point in s. 6.1 (2) |
| `sc-claim-against-the-crown-ontario` | 5 | 2 stand, 3 replaced |
| `sc-claim-defamation-newspaper-or-broadcast` | 5 | **all 5 stand.** Newspaper and broadcast in a mix, one naming Ontario explicitly for the s. 7 scope point, and none is an online-only post — that belongs to `sc-claim-defamation-online-or-in-print`, which is declared and unauthored |
| `sc-claim-by-or-against-an-estate` | 5 | **all 5 stand**, and they cover both directions of s. 38 — four claims against an estate and one by a trustee |
| `sc-claim-notice-deadline-already-missed` | 5 | **all 5 stand**, and between them they exercise both statutory exceptions: hospital (a reasonable excuse) and the city repairing the sidewalk immediately (no prejudice) |

---

## Eval stories may only be generated from reviewed scenarios

All 35 are now reviewed, so all 35 are eligible. The rule matters for what comes
next: the declared profiles have no scenarios yet, and when they get them the same
reading has to happen before any eval story is generated from them.

**A misassigned scenario becomes a misassigned expected answer, and an eval that
encodes the wrong answer is worse than no eval** — it converts a bug into a
requirement, and the next person to fix the behaviour has to argue with a red suite.
`test:claim-types` cannot catch this, which is why the rule is written down rather
than automated.
