# Unmatched Claim Type — Design

**Status: designed, not built. No code was written or changed for this spec.**

What the site does when the AI classifier returns `none` and no claim type fits
the user's story.

**Filed separately rather than as a section of
`docs/CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md`.** Reasoning, since the brief left the
call open:

1. **The preconditions are complements.** The depth spec's entire premise is
   *"after a claim type is confirmed."* This spec's precondition is the negation
   of that. Folding the negative case into a document whose title and every
   section assume the positive case makes both harder to read and invites a
   future editor to apply one's rules to the other.
2. **Roughly a third of this spec is instrumentation and privacy design** (§6) —
   what gets logged, where it lives, what constraints apply to user-submitted
   narrative. That has nothing to do with intake depth and would bloat a
   453-line document with an unrelated concern.
3. **It is independently actionable.** The logging piece (§6) is buildable on
   its own, before any depth work, and the roadmap argues it is the highest-value
   instrumentation available. Burying it inside a larger spec would delay it
   behind unrelated decisions.

**Resolves `docs/STATEMENT_OF_CLAIM_READINESS_DESIGN.md` §10 open question 2**,
which asked whether a draft should exist with no claim type matched and
recommended no, while flagging that a bare refusal leaves the user in the same
trap that spec's §4 argues against. The site owner has decided: **neither a
weaker draft nor an empty-handed user.** The answer is a third path — explain,
inform, let the user choose.

---

## 0. Two findings, checked before designing

### Finding 1 — there are no ranked near-misses; they have to be derived

**The brief assumes "the classifier's ranked near-misses surface first." The
classifier does not produce any.**

`claimTypeAiClassifier.ts` returns **exactly one id or `"none"`**, enforced by a
strict JSON-schema enum (`buildResponseSchema`, `allowedIds = [...ids,
NONE_VALUE]`). There is no ranking, no score, no second choice. The documented
contract is *"a single claimTypeId from that list, or null"*, failing closed to
no suggestion *"rather than force a guess."*

**Re-querying the model to manufacture a ranking would work against its own
design.** Its system prompt says: *"If it fits none of them well, or you are
unsure, say 'none' — do not guess."* An `excludeIds` parameter does exist, but
it is for re-asking after a user rejects a suggestion — i.e. after the model
asserted a fit. Once it has said `none`, asking again with exclusions is asking
it to produce the guess it just declined to make.

**Design consequence, and it improves the result rather than compromising it:**
"closest" is computed **deterministically from each claim type's own `signals`**
— the everyday-language fact-pattern cues already authored on every entry — by
word overlap against the user's story, in the same posture as
`filterConfirmedEvidenceFromMissing` and the depth spec's `alreadyCovered`
filter.

This matters for §3. A deterministic overlap over the user's own words supports
a claim about **text similarity** and nothing more, which is *exactly* the line
the brief draws. An AI-produced ranking would be a model's opinion about which
claim type best fits the user's situation — which is the thing that must not
happen. **The absence of ranked near-misses is therefore fortunate, not a gap to
be filled.**

### Finding 2 — a privacy precedent already exists and should govern §6

`docs/PRIVATE_REAL_WORLD_CASE_REVIEW.md` opens: *"Use this manual checklist
**outside the repository** when reviewing a private case."* The established
posture is that real user narrative does not enter the repo. §6 follows it.

---

## 1. Step one — explain the requirement

**Adopted wording**, drafted here so it can be reviewed as content rather than
described in the abstract:

> **We don't have a match for this kind of situation yet.**
>
> A Statement of Claim is built around a particular kind of claim. The court
> expects the document to set out what that kind of claim generally involves —
> so until a kind of claim is identified, there's nothing for the document to be
> organized around.
>
> That's about how these court documents are structured, not about your
> situation or whether you can bring a claim. Below are the kinds of claim this
> site currently covers, with a plain description of what each one generally
> involves. If you recognize your situation in one of them, you can choose it
> and carry on.

### Checked against the "who does the applying" test

| Sentence | Why it passes |
|---|---|
| "A Statement of Claim is built around a particular kind of claim." | States how the document works. Says nothing about this user. |
| "The court expects the document to set out what that kind of claim generally involves." | States a general fact about court expectations. Generic subject. |
| "until a kind of claim is identified, there's nothing for the document to be organized around" | States a consequence of the document's structure, not of this user's facts. |
| "That's about how these court documents are structured, not about your situation or whether you can bring a claim." | **Explicitly disclaims** the inference a user is most likely to draw — that no match means no claim. |

**That last sentence is the load-bearing one.** Without it, "we don't have a
match" reads as "you don't have a case," which would be a strength assessment
delivered by omission. The system does not know whether the user has a claim and
must not imply an answer either way.

**Prohibited variants**, recorded so the copy does not drift:

| Never say | Why |
|---|---|
| "Your situation doesn't fit any claim type." | Characterizes the user's situation. |
| "You may not have a Small Claims matter." | Assessment, and unsupported. |
| "Try describing your situation differently." | Implies the user described it wrongly; invites them to reshape facts to fit a category. |
| "We couldn't identify your claim." | Puts the failure on the user's account rather than on the site's coverage. |

The adopted copy locates the limit in **the site's coverage** — *"we don't have
a match … yet"*, *"the kinds of claim this site currently covers"* — which is
both true and the only framing that doesn't implicitly grade the user.

---

## 2. Step two — presenting the options without a wall of 22

**Adopted: progressive disclosure of DETAIL, not reduction of the LIST.**

The honest framing of the problem: 22 items is not itself a wall. Twenty-two
expanded paragraphs of sourced legal explanation is. So the mechanism is to
control how much of each entry is visible at once, not to hide entries.

### Three tiers

**Tier 1 — "Closest to what you described" (3–5 entries, expanded).**
Computed deterministically by `signals` overlap (Finding 1). Each shows `name`
plus its sourced `plainExplanation`. Labelled exactly as the brief specifies —
see §3 for the wording and the line it sits on.

**Tier 2 — the full list (all 22, collapsed to one line each).**
`name` only, or `name` plus a single short line. Expanding one reveals its
sourced `plainExplanation` and, optionally, its `plaintiffElements` names as
*"what this kind of claim generally involves."* All 22 remain present and
reachable from the first screen — the brief requires the user be able to
recognize themselves in something the classifier missed, and that only works if
nothing is hidden behind a search box.

**Tier 3 — "None of these fit."** Always visible, never buried beneath the list
(§5).

### An optional narrowing control, and an honest note on its weakness

`typicalDefendantProfile` exists on all 22 entries and is data-derived, so a
filter on *"Is this about a business, or a person?"* needs no new authoring and
cannot break when claim type 50 arrives. It is also a **factual question the
user can answer about their own situation** — not a legal characterization.

**But it narrows weakly, and the spec should not oversell it.** The actual
distribution is 10 `business`, 8 `either`, 5 `individual`. So "a business"
yields 18 of 22 and "a person" yields 13 of 22. That is a mild aid, not a
solution to list length. **Tier 1 is what does the real work**; this filter is
a secondary convenience and should be built only if it is cheap.

### Grouping was considered and rejected

An everyday-language grouping ("money owed", "damage to property", "work
disputes") would read better than a flat list. It is rejected because the
groupings would have to be **authored per claim type** and re-authored for every
new one — the exact per-claim-type maintenance burden the readiness spec
rejected for linkage and the depth spec rejected for question derivation.
Applying that objection inconsistently here would be incoherent. A flat,
scannable list that works unchanged at claim type 50 is the better trade.

---

## 3. The line: "closest to what you described"

**This is the section the brief singles out, so the line is stated exactly and
its location justified.**

**Permitted label:** *"Closest to what you described"* — and, on hover or as a
subhead, *"These use wording similar to yours. That's a comparison of words, not
an assessment of your situation."*

**Where the line sits, precisely:**

> A statement about **similarity between the user's words and a claim type's
> authored `signals`** is a statement about text. It is verifiable, it is
> computed by a pure function the user could in principle inspect, and it
> asserts nothing about law or about the merits of their situation.
>
> A statement about **which claim type fits their situation best** is a legal
> characterization of their facts. It is the system doing the applying.

The distinction is not a wording trick, and this is why it holds: the ordering
is produced by **word overlap against the user's own text**, so the claim
"closest to what you described" is *literally and only* true of the words. The
system is not in a position to assert more, and the label does not.

| Permitted | Prohibited |
|---|---|
| "Closest to what you described" | "Best match for your claim" |
| "These use wording similar to yours." | "These are most likely to apply." |
| "Everything this site covers" (Tier 2 heading) | "Other, less likely options" |
| Presenting Tier 1 and Tier 2 in the same visual weight | Styling Tier 1 as recommended |
| Ordering Tier 1 by overlap score | Showing the score as a confidence or fit percentage |

**Two design consequences that follow from the line and are easy to lose:**

- **Tier 1 must not be visually privileged as a recommendation.** Same card
  treatment as Tier 2, no accent colour, no "recommended" affordance. It is a
  convenience ordering, and it should look like one.
- **No scores, percentages, or confidence indicators are ever shown.** A "78%
  match" reads as a system judgment about fit no matter what the label says, and
  it edges toward the readiness score CLAUDE.md section 3 prohibits.

**If Tier 1 would be empty or near-empty** (a story sharing almost no vocabulary
with any `signals`), show Tier 2 alone rather than padding Tier 1 with weak
overlaps. A near-miss list that isn't actually near is a false signal.

---

## 4. Step three — the user picks

**Adopted: a selection here is the same fact as a confirmed classifier
suggestion, and flows into the same per-element state map. No parallel path.**

The readiness spec established that a confirmed claim type is *"the user's own
selection, arrived at after being shown a proposal and given a real option to
reject it."* A selection from this list is **the same fact arrived at more
directly** — the user read sourced descriptions and recognized their own
situation, with no model proposal in between.

If anything it is the **stronger** version of that fact: the classifier
suggestion involves a model's characterization that the user ratifies, while
this involves no model characterization at all.

**Therefore, on selection:**

- It becomes the confirmed claim type, identically to `resolveSuggestion`'s
  `"confirmed"` outcome.
- Its `plaintiffElements` populate the per-element state map
  (`STATEMENT_OF_CLAIM_READINESS_DESIGN.md` §8).
- The depth phase (`CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md`) runs as normal, with
  `alreadyCovered` filtering against the story the user already told.
- The readiness gate applies unchanged.

**Nothing downstream needs to know how the claim type was arrived at.** That is
the test of whether this is genuinely the same fact, and it is: no downstream
consumer should branch on provenance.

**Reversibility.** The user must be able to change it later. Recognizing
yourself in a description you are reading for the first time is a judgment made
with incomplete information, and the depth questions that follow may show the
user it was wrong. A locked selection would turn a helpful step into a trap —
the same objection the readiness spec's §4 raises against a one-way gate.

---

## 5. "None of these fit" — a real answer

**Adopted: always visible, never penalized, routing to one of two honest
outcomes.**

**Outcome A — a jurisdiction route matches.** `jurisdictionRoutes.ts` exists for
exactly this and its header anticipates this wiring: routes *"can eventually
surface directly off an AI-classifier `none` result (see this file's own closing
note on where that wiring belongs — not built this session)."* **This spec is
that wiring's design.**

Route matching uses the same deterministic `signals` overlap as §3 — the
registry carries `signals` on the same convention as `claimTypes.ts` *("No AI
here — just data")*.

Presented in the registry's own sourced words: `matterDescription`,
`whyNotSmallClaims`, `whereItGoes`, `destinationForum`. The file's header
already states the constraint this must honour — those fields *"state what a
rule GENERALLY provides and where THAT KIND of matter is GENERALLY heard — never
that a specific user's matter belongs elsewhere."*

So the presentation is: *"Matters like this are generally heard at [forum] —
here's why"*, never *"your matter belongs at the LTB."* **Surfacing a route is
navigation; deciding it applies is the user's call.**

Only 3 routes exist today (`jurisdictionRoutes.ts` was seeded with what was
already sourced). The roadmap's Batch 4 names building out this coverage as
work in its own right.

**Outcome B — nothing matches at all.** An honest statement:

> This doesn't look like something the site covers yet. That's a limit of what
> we've built, not a judgment about your situation. A licensed paralegal or
> lawyer can tell you what kind of matter this is and where it belongs.

Checked: locates the limit in the site's coverage, disclaims the inference,
routes to someone qualified to do the applying. This is CLAUDE.md's standing
answer to "do I have a case?" applied to a narrower question.

**"None of these fit" must never be styled as a failure or a last resort.** It
is a legitimate outcome that produces the single most valuable input to §6.
Burying it beneath 22 options, or framing it as "I couldn't find mine", would
suppress exactly the signal the roadmap wants.

---

## 6. Logging unmatched cases

The roadmap's closing note calls this *"the single highest-value instrumentation
you could add"* — it *"replac[es] this document's educated guesses with actual
demand data from real users."* Agreed, with the constraint that this is
**user-submitted narrative about their own legal situation**, which is among the
most sensitive categories of text this product handles.

### What gets logged

| Field | Why |
|---|---|
| The free-text story that produced `none` | The whole point — what users actually bring. |
| Timestamp | Trend over time; distinguishes a spike from steady demand. |
| Tier 1 `signals`-overlap results (ids + scores) | Shows whether a near-miss *should* have matched — distinguishes a missing claim type from a matching failure on an existing one. |
| What the user did next (picked a claim type / picked a route / "none of these") | The outcome signal. A user who picks an existing type after seeing descriptions indicates a **classifier** gap; "none of these" indicates a **coverage** gap. Different fixes. |
| Selected claim type or route id, if any | As above. |
| Court area | Keeps Small Claims separate from future Family/Civil. |

**That fourth row is the one that turns a log into evidence.** Without it, every
entry looks like "we're missing a claim type," when a meaningful share will be
"we have the claim type and the classifier missed it." Those demand opposite
responses — sourcing work versus classifier tuning — and the log is nearly
useless for prioritization if it cannot tell them apart.

### What is NOT logged

- **No user identity.** No account id, email, name, IP, or session identifier
  that could link an entry to a person. The log answers *"what kinds of problem
  do users bring?"* and needs no one's identity to do it.
- **No joining key back to a case record.** A key would reintroduce
  identifiability through the back door and make the log a de facto copy of
  private case narrative.
- **Nothing from the readiness or depth phases.** Those only exist after a claim
  type is confirmed, so they are out of scope by construction.

### Where it lives, and the constraint that decides it

**Not in the repository.** `PRIVATE_REAL_WORLD_CASE_REVIEW.md` establishes the
posture (Finding 2) — real case narrative stays out of the repo. A committed log
file would put user stories in git history permanently, replicated to every
clone, and effectively unremovable.

**Recommended: a dedicated Supabase table, distinct from case records**, on
`courtsimplified-dev` for development. Per CLAUDE.md section 6, **production is
never modified without explicit go-ahead**, so a production table is a separate
decision requiring the site owner's approval, not something this spec authorizes.

### Privacy constraints

1. **Stories are pseudonymous but not anonymous, and the design must not pretend
   otherwise.** A narrative like *"my landlord's contractor smashed my window at
   [address] on [date]"* can identify people even with no user id attached,
   because the user may name themselves, the defendant, or an address inside
   their own free text. **Stripping identity fields does not make the text
   anonymous.** Any handling — retention, access, export — must treat entries as
   potentially identifying.
2. **Disclosure before logging.** The user should be told plainly, at the point
   it happens, that their description is being kept to improve the site's
   coverage — in the same register as the rest of the product's copy, not buried
   in a privacy policy.
3. **Opt-out should be available**, and a declined log is a real outcome, not a
   degraded one. A user who declines still gets §1–§5 in full.
4. **Retention should be bounded**, with a defined period rather than
   indefinite. Naming the number is a product/legal decision, not a design one.
5. **Access should be limited to the site owner** for roadmap prioritization.
   This is a research corpus, not an operational dataset, and it should not be
   readable by any user-facing code path.
6. **The log must never feed back into a user's own experience.** It is input to
   the roadmap. Using it to alter what a user is shown would make it operational
   data and change its privacy character entirely.

### What it is for

Reviewed periodically to answer one question: **what kinds of claim are users
bringing that the site does not cover?** That answer replaces the roadmap's
Batch 1–4 ordering, which is explicitly described there as educated guesses.

---

## 7. Out of scope

- **Building out `jurisdictionRoutes.ts` coverage.** Three routes exist; the
  roadmap's Batch 4 is that work. This spec designs the wiring, not the content.
- **Classifier tuning.** The log will produce evidence about classifier misses
  (§6); acting on it is separate.
- **Retention period and the production-table decision** — §6 flags both as
  requiring the site owner, and CLAUDE.md section 6 requires explicit go-ahead
  for production.
- **Family and Civil.** No content exists.

---

## 8. Open questions for the site owner

1. **Should a user who picks nothing be able to return later?** The design
   implies yes — their story is captured and the list is reachable. But if the
   site later *adds* a matching claim type, should that user be told? That is a
   notification and re-contact question with its own privacy implications, and
   §6's no-identity rule would actively prevent it. **The two goals conflict**,
   and the conflict should be resolved deliberately rather than discovered later.

2. **Does the "closest to what you described" ordering need a floor?** §3 says
   show Tier 2 alone rather than pad Tier 1 with weak overlaps, but does not fix
   a threshold. Setting it requires seeing real overlap distributions — which
   §6's log will produce, so this may be answerable after launch rather than
   before.

3. **Should `typicalDefendantProfile` filtering be built at all?** §2 is candid
   that it narrows weakly (22 → 18 or 13). It may not earn its interface weight.
