# Intake Entry Point — Design

**Status: designed, not built. No code was written or changed for this spec.**

How intake serves two very different people from the same case file: someone
who arrives with a mess and no vocabulary for it, and someone already inside
the court process holding a document.

**Filed separately** rather than as a section of
`CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md`, for the same reason the unmatched path
was: that spec's entire premise is *after a claim type is confirmed*, and this
one governs what happens **at arrival, before anything is confirmed**. It also
changes intake's global shape rather than adding a phase to it, and it has to
be read by anyone touching entry, which a section inside a 453-line depth spec
would not be.

---

## 0. The insight this design is built on

**This is not "skip to stage 4."**

A user at settlement-conference stage still needs their claim type, their
evidence, their particulars — **everything the beginner path captures**. What
they do not need is the scaffolding, the explanation, and the pace.

> **The fast path captures the same facts faster. It never captures fewer
> facts.**

Get that wrong and you ship a fast path that produces an incomplete case file,
which is worse than a slow path producing a complete one — because the
incomplete one looks finished. Every decision below is checked against that.

---

## 1. Audit — what already exists

**Report before designing, as instructed. Four things were named; two of the
references do not resolve.**

### 1a. Two named references are wrong or absent

- **`docs/PROCEDURAL_INTELLIGENCE_DESIGN.md` does not exist.** (The brief
  allowed for this.)
- **Commit `8f39ba1` is not in this repository.** The defendant-response
  questions were added in **`5de3444`**, "Add defendant-response guided intake
  questions (origin not fully confirmed)".

### 1b. `legal_form_mapping_rules` — the stage gating is NOT three stages, and the real risk is different

The brief says it "gates on stage: starting-case / responding /
already-started". That is the *product's* common subset, not what the code
does.

- `authority_stage_applicability` and `workflow_guidance_stage_applicability`
  are **string arrays stored on DB rows**.
- Matching is `stageApplicability.includes(context.procedureStage)` —
  **exact string membership** (`betaProcedureAuthority.ts:225, 289`).
- `procedureStage()` (`form-applicability/route.ts:139`) reads `stage`,
  `proceduralStage`, or `currentStage` from `masterResult`, `masterCase`, or
  `proceduralState`, first match wins, and **defaults to `""`**.

**So the taxonomy lives in data, not code.** Two consequences the brief's
framing would miss:

1. **A finer taxonomy needs the DB rows updated, not a type change.** Adding
   stage values the rows do not list does not error — it **silently rejects**
   the recommendation with "authority stage applicability mismatch". A user at
   a newly-added stage would quietly get no verified forms.
2. **`procedureStage()` defaulting to `""` means an unknown stage already
   fails closed today**, which is the safe direction but is invisible to the
   user.

**Is three the right taxonomy? The question is malformed — it is already
nine.** `UniversalStage` (`builderTypes.ts:5`) is `starting-case | responding |
already-started | conference | motion | trial | enforcement | urgent |
not-sure`. See §3 for whether those nine are the right nine.

### 1c. The committed defendant questions — what they capture, and the gap

From `5de3444`. Four questions added, three existing ones gated to
`role: "plaintiff"`:

| Question | Captures |
|---|---|
| `sc-defendant-claim-received` | When they received the claim, and what documents |
| `sc-defendant-response-facts` | Their own account of what they agree/disagree with |
| `sc-defendant-response-evidence` | What evidence they have |
| `sc-defendant-outcome` | What outcome they want |

**Where they fall short of a full defendant case file**, measured against what
the Rules and the other specs require:

- **No defendant's claim / counterclaim capture.** r. 10.01(2) gives 20 days
  from the day the defence is filed to *issue* one, and it is a distinct
  proceeding. Nothing asks whether they want one.
- **No service-method capture** — and the reworked
  `sc-defendant-noted-in-default` now needs exactly that (date served **and**
  method), because when service is effective depends on how it was done.
- **No admission/payment-proposal path.** r. 9.03 lets a defendant admit
  liability and propose terms; that is a common, materially different posture
  with its own 20-day and 15-day mechanics.
- **No capture of what stage the case is at** beyond "a claim was received" —
  a defendant past a settlement conference answers these four identically to
  one served yesterday.
- **Provenance: structurally verified only.** `5de3444` says plainly it was
  not authored by the session that committed it, origin unconfirmed, verified
  by `tsc`/`eslint`/`build`/`test:select-questions` and a §2 check — **never
  tested end to end.** Tranche 1 of the journey battery ran category B and
  found no invariant violations, which is the first behavioural evidence they
  work at all.

### 1d. `proceduralStateArchitecture.ts` — traced. It is NOT the right home for case stage.

- It declares **163 event types**, `defence-due` among them
  (`proceduralStateArchitecture.ts:71`).
- It is **live**: `buildProceduralState` is imported by
  `caseSystemAssembly.ts:17`, which flows through the bridge and migration
  layer into `runCourtSimplifiedBrain`'s patches.
- **The `verificationStatus` field is not what it sounds like.** It sits on
  `ProceduralAuthorityReference` (`:34`) with values `verified | needs-review |
  not-verified | do-not-use | unknown`. **It verifies the SOURCE of a
  procedural rule, not the state of the user's case.** Nothing here records
  whether a case fact has been confirmed by the user.

**Verdict: it is the wrong home for case stage, and for a reason worth
stating.** 163 event types is a model of *what can happen in a proceeding*, not
*where this user is*. Those are different objects: the first is a taxonomy of
the domain, the second is one value about one case. Putting stage here would
bury a single user-confirmed fact inside a 163-member domain model whose own
verification field means something else entirely — and would invite the next
reader to think `verificationStatus` covers it.

### 1e. `KnownFactField` — extend it, and this is the case where that is correct

19 entries, no stage field. Two prior specs rejected schema growth:

- **The readiness spec** rejected per-element linkage: it would need authoring
  **per element, per claim type** (~150 scenarios), and would still only prove
  a field was non-empty. **High cost, low value.**
- **The depth spec** rejected `appliesWhen` gating on claim type: it would need
  **~150 new `KnownFactField` entries**, against a list whose own comment
  describes a "narrow now, expand deliberately" posture.

**Both objections were about growth that scales with content. Stage does
not.** It is **one field with a bounded value set**, authored once, and it is
exactly the kind of thing `appliesWhen` exists to gate on — the mechanism is
already there and already used by the defendant questions (`role`).

Adding one field to a 19-entry list is the "expand deliberately" case, not the
growth those specs rejected. **Recommendation: extend it.** Building a parallel
stage store alongside would create the second state model §6 exists to prevent.

**One caution.** `twentyDaysElapsed` was deleted from this same list because it
held an **AI-inferred legal conclusion**. The new field must hold a
**user-confirmed fact**, never an inference — which is what §2 decides.

---

## 2. Decision — how the fork happens

**Adopted: infer a candidate from the story, then CONFIRM it, and never store
the inference. If the user does not confirm, the field stays empty and the
guided path runs.**

### The two options, weighed

**Ask first.** Honest, no inference, no conclusion asserted. But it makes a
confused user self-classify **before the site has helped them at all** — and
the confused user is the one the guided path exists for. It also asks them to
choose using vocabulary they may not have; "already started" is exactly the
phrase a user misapplies to a demand letter (§4).

**Infer and confirm.** Follows the classifier pattern that already works: the
model proposes, the user disposes, and only the user's answer is stored. But
the model is inferring a **procedural** conclusion, and that is the shape of
`twentyDaysElapsed`.

### Why infer-and-confirm wins, and how it differs from `twentyDaysElapsed`

The precedent cuts the other way once examined. `twentyDaysElapsed` was deleted
because it stored **an AI-inferred legal conclusion as a fact** — nothing asked
the user, and no confirmation stood between the inference and the fact model.
The harm was that a downstream gate relied on it.

The claim-type classifier does the same *kind* of inference and is **fine**,
because the inference is a **suggestion the user must accept**, and what gets
stored is the user's acceptance. `UNMATCHED_CLAIM_TYPE_DESIGN.md` §4 already
established that a confirmed suggestion *is* the user's own selection.

**So the rule is not "never infer." It is "never store an inference."** This
design:

- infers a **candidate** stage from the opening story,
- **never writes it to the fact model**,
- surfaces it as a question in the user's own terms,
- stores **only** what the user confirms.

**The copy matters, and is drafted here rather than described:**

> **It sounds like a claim may already have been started against you — is that
> right?**
> If it is, we can pick up from there instead of starting from the beginning.
> Nothing is assumed until you tell us.
> [ Yes, I've been served ] [ No, nothing's been filed ] [ I'm not sure ]

**"I'm not sure" is a first-class answer and routes to the guided path.** It is
the honest answer for exactly the user the guided path serves, and it must
never read as a failure — the same rule the unmatched spec applies to "none of
these fit".

**Where there is no confident candidate, do not ask.** Run the guided path
silently. A user with no procedural signal in their story should not be
prompted to wonder whether they have missed something.

---

## 3. Decision — the stage taxonomy

**Adopted: keep `UniversalStage`'s nine values as the stored vocabulary, and
derive finer positions from facts already captured rather than adding stage
values.**

### Why not invent a finer taxonomy

`SMALL_CLAIMS_RULES_MAP.md` is the authority, and what it shows is that the
regulation's structure is **not a stage ladder**. It is 26 rules organised by
*activity* — commencement (7), service (8), defence (9), defendant's claim
(10), default (11), settlement conference (13), motions (15), trial (17),
enforcement (20). A case is not "at rule 13"; it has had a defence filed, which
makes a settlement conference due within 90 days.

**The regulation recognises EVENTS, not stages.** The positions the brief names
— issued-not-served, served-not-defended, defended-awaiting-conference,
past-judgment-in-enforcement — are all **derivable from facts**:

| Position | Derived from |
|---|---|
| Issued, not served | `claimFiled` true, `claimServed` false |
| Served, not defended | `claimServed` true, `defenceFiled` false |
| Defended, conference pending | `defenceFiled` true, no conference date |
| Past judgment, enforcing | judgment fact + enforcement step |

**Three of those four fields already exist in `KnownFactField`.** Deriving
beats storing: a derived position cannot drift out of sync with the facts it
came from, and it needs no new authoring when the taxonomy changes.

### What to actually add

**One field: `caseStage`, holding a `UniversalStage` value, set only from a
user-confirmed answer (§2).** Plus the existing `claimFiled` / `claimServed` /
`defenceFiled` booleans, which already carry the finer positions.

### The DB risk this creates, and it is the sharpest operational point here

Per §1b, `authority_stage_applicability` is matched by **exact string
membership against DB rows**, and a miss **silently rejects** the form
recommendation.

**So any stage value stored must already appear in those rows.** Storing
`conference` when no row lists it means a user at a settlement conference
silently receives no verified forms — a regression that produces no error and
no log line.

**Before any stage value reaches `procedureStage()`, audit which values the
`legal_form_mapping_rules` rows actually carry.** That is a data question, not
a code question, and it is a build blocker for this feature. **Flagged, not
resolved here.**

---

## 4. Decision — what the fast path actually skips

**Adopted: it skips PACING and TEACHING. It skips no facts, no sourcing, and no
confirmation.**

### Identical on both paths — non-negotiable

| | |
|---|---|
| Which facts are captured | **Identical.** Same `KnownFactField` set, same question bank. |
| The per-element state map | **Identical.** Same `provided` / `cannot provide` / `not yet` from the readiness spec. |
| Sourcing and citations | **Identical.** Same `sourceUrl`, same `verifiedAt`, same §2 rules. |
| Confirm-before-track | **Identical.** Every claim type, remedy and stage still user-confirmed. |
| The readiness gate | **Identical.** Same conditions, same element attestation. |
| `alreadyCovered` filtering | **Identical.** |

### What actually differs

| | Guided | Fast |
|---|---|---|
| Questions per turn | One | **Several, grouped** |
| Voice-layer lead-in | Full restatement | **Minimal or none** |
| `why` / `sourceUrl` display | Shown inline | **Available, not pushed** |
| Explanation of *why we ask* | Expanded | **On request** |
| Confirmation prompts | Each step | **Batched per group** |

**Grouping is the whole speed gain.** A user who has been served can answer
"when were you served, how, and have you filed anything?" in one turn. That is
three `KnownFactField` values in one exchange rather than three turns — the
same facts, a third of the pacing.

### Checked against the per-element state map

The readiness spec's map is populated from **answers**, not from *how the
answer was collected*. A fast-path answer and a guided-path answer produce
the identical state. **Nothing downstream branches on path** — which is the
test of whether this is genuinely the same intake, and it is the same test
`UNMATCHED_CLAIM_TYPE_DESIGN.md` §4 applied to claim-type selection.

**The fast path can therefore never produce a thinner case file. It can only
produce the same file in fewer turns.** If a design change would break that,
it is the wrong change.

---

## 5. Decision — when a user misjudges their own stage

**Adopted: detect the mismatch from the facts, never contradict the user, and
ask a question that lets them correct themselves.**

The cases are real and common: *"already filed"* meaning a demand letter was
mailed; *"being sued"* meaning a demand letter arrived, not a claim.

### The mechanism

The confirmed stage and the captured facts can disagree. That disagreement is
**observable without judging anyone**:

- stage `responding`, but `sc-defendant-claim-received` describes no court
  document and no claim number
- stage `already-started`, but `claimFiled` false and no issue date

**What the site does NOT do:** tell the user their document is not a claim.
Identifying a document is exactly the "who does the applying" line, and the
site does not know what they are holding.

**What it does:** name what it would expect to see, and ask.

> **One thing worth checking.** A Plaintiff's Claim issued by the court
> normally has a court file number stamped on it and says "Plaintiff's Claim"
> or "Form 7A" at the top. If what you have does not have those, it may be
> something else — a demand letter, for instance — and a different set of steps
> would apply.
> **Does the document you received have a court file number on it?**
> [ Yes ] [ No ] [ I'm not sure — I'd rather check ]

Every clause states what a court-issued claim **generally has**. The user
compares it to their document. **The user does the applying.**

**"I'd rather check" must be a real answer** that pauses rather than forcing a
guess — and the stage stays as they set it until they say otherwise. **The site
never silently reclassifies a case.** The user changed it or it did not change.

---

## 6. Decision — composing with the three existing specs

**Adopted: one state model. Stage is a fact in the same fact model, not a
parallel object.**

```
arrival
  │
  ├─ stage candidate inferred (never stored) ──► CONFIRMED? ──► caseStage fact
  │                                              └─ no / unsure ──► guided path
  │
  ├─ claim type: classifier suggestion ──► CONFIRMED ──► matchedClaimType
  │       └─ none ──► UNMATCHED_CLAIM_TYPE_DESIGN.md
  │
  ├─ depth questions ──► CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md
  │       (alreadyCovered filter reads the SAME facts)
  │
  └────────────────► per-element state map ──► readiness gate
```

**The seam risk the depth spec identified applies here doubled, and the
mitigation is the same:** everything writes to one fact model and one element
state map. Concretely:

- The fast path's **grouped questions must run through the same
  `alreadyCovered` filter**. A user who said "I was served on the 3rd" in their
  story must not then be asked when they were served — the failure the depth
  spec exists to prevent, and grouping makes it *more* likely by asking three
  things at once.
- **Stage never gates sourcing.** A `conference`-stage user gets the same
  citations. Speed is pacing only.
- **Nothing downstream reads which path was taken.** If a component needs to
  know, that is the signal a second state model has appeared.

---

## 7. Genuinely open — flagged, not decided

1. **Which stage values do the `legal_form_mapping_rules` rows actually
   carry?** §3's build blocker. A stage the rows do not list silently disables
   verified forms. **Must be audited before build.**
2. **Should the fast path exist for plaintiffs at all, or only defendants and
   mid-case users?** A plaintiff who has issued but not served is mid-case too,
   but the beginner path's teaching may still serve them. Not obvious.
3. **How many questions per group before it becomes a form?** The depth spec
   capped asked questions at 3–5 for a reason. Grouping fights that cap and the
   interaction is unmeasured.
4. **Does the defendant question set need building out before this ships?**
   §1c lists four real gaps (counterclaim, service method, admission/payment
   proposal, stage). A fast path for defendants that captures an incomplete
   defendant file is the exact failure §0 warns about. **This may be a
   prerequisite rather than a follow-up**, and I have not resolved which.
5. **Does `caseStage` need a "confirmed at" timestamp?** Stage moves. A stage
   confirmed six weeks ago may be stale, and nothing here detects that.
