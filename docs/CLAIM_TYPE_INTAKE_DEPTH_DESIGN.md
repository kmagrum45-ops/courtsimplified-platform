# Claim-Type Intake Depth — Design

**Status: designed, not built. No code was written or changed for this spec.**

Design for a second phase of guided intake that runs **after a claim type is
confirmed** and asks questions specific to that claim type.

**The problem.** Guided intake asks one general question set regardless of claim
type. A defamation claim and an unpaid-invoice claim get the same questions. Thin
facts in, thin Statement of Claim draft out. This is the largest available
improvement to draft quality that adds **no legal judgment** — better input into
the same deterministic engine.

**Relationship to the readiness gate.** `docs/STATEMENT_OF_CLAIM_READINESS_DESIGN.md`
established per-element **attestation** as the bridge between a claim type's
`plaintiffElements` and what the user supplied, and why an automatic
satisfied/not-satisfied check would be the system applying a legal test. **This
spec uses that same mechanism and does not invent a second way to read
`plaintiffElements`.** §5 sets out how the two compose.

---

## 0. Three architecture findings, checked before designing

Each of these constrains the design, and two of them mean the brief's stated
approach needs adjusting. Reported plainly rather than designed around.

### Finding 1 — `appliesWhen` cannot gate claim-type-specific questions

`selectQuestions.ts` is a pure function `(facts, answeredIds, courtArea) →
ordered question IDs`, filtering on `courtArea`, `status === "reviewed"`,
not-already-answered, and `questionApplies(question, facts)`.

That last check evaluates `appliesWhen: FactCondition`, and **`FactCondition` is
keyed to `KnownFactField` — a closed 19-entry `as const` list**
(`questionBank.ts:33–55`). There is no field for "the confirmed claim type," and
no per-claim-type facts.

So a claim-type-specific question **cannot** be expressed in the existing bank
without extending `KNOWN_FACT_FIELDS` per claim type — which is precisely the
per-claim-type schema growth the readiness spec rejected.

**Design consequence:** claim-type questions need their own selection path keyed
on the confirmed claim type, not new `KnownFactField` entries. `KNOWN_FACT_FIELDS`
stays as it is. Its own comment describes a *"narrow now, expand deliberately"*
posture; expanding it by ~150 scenarios is the opposite of that.

### Finding 2 — the voice layer cannot put the user's vocabulary into question text

**This contradicts the brief's property 2 as literally stated, so it needs saying
directly.** The brief asks that if the user said "my ex-girlfriend," the question
says that — and says the voice layer already does this, so reuse it.

It does not. The voice layer produces **only a lead-in**. Its own header
(`voiceLayer.ts:11–17`) states it *"does not alter question text — the model is
instructed never to repeat or rewrite the question, and even if it tried,
`composeVoiceTurn()` always returns `question.text` verbatim as a separate field,
never something the model produced."* `VoiceTurn.questionText` is documented as
*"The fixed question text, verbatim from questionBank.ts — never model output"*
(`:34`). System prompt rule 3 forbids repeating, paraphrasing or rewriting the
question at all.

That is a **deliberate safety invariant**, not an oversight: it is what
guarantees a model can never generate the words a user is asked to answer. It
should not be relaxed.

**Design consequence — the split solution in §3.** Vocabulary enters through two
channels, neither of which is "let the model write the question":

- **The lead-in** carries the user's framing conversationally, exactly as today.
- **Deterministic slot substitution** puts the user's own captured words into
  the question text — `{partyLabel}` filled from a verbatim captured string. A
  substitution is **not model output**, so the invariant holds intact.

### Finding 3 — property 4 already has an enforced precedent

`IntakeQuestion.allowUnknown` carries the comment *"Every question must have an
I-don't-know path that doesn't dead-end"* (`questionBank.ts`). This is an
existing invariant of the bank, not something this spec introduces. Claim-type
questions inherit it as a hard requirement (§4).

Similarly, `examples?: string[]` is documented as *"Neutral examples that help a
user understand the kind of factual answer requested"* — the neutrality
convention property 3 needs already exists and has a name.

---

## 1. Decision — where the questions come from

**Adopted: authored questions attached to ELEMENT IDs, with a derived fallback
and a deliberate "no question needed" state. Not authored per claim type.**

### Why not derived alone

Deriving a question mechanically from an element's `plainExplanation` or
`evidenceCategories` produces exactly the failure the brief forbids. The element
`property-damaged-by-defendant` becomes *"Did the defendant damage your
property?"* — asked of a user who opened with *"my landlord's contractor smashed
my window."* That is a form wearing a conversation's clothes.

The deeper reason: **`plainExplanation` is prose written to explain a legal
concept to someone reading about it, not to elicit a fact from someone living
it.** Those are different jobs. Mechanical transformation between them cannot
produce good questions, and — because the output would be generated rather than
reviewed — it could not be checked for coaching (§3) before a user saw it.

### Why not authored per claim type, and why the readiness objection does not carry over

The brief rightly asks whether the readiness spec's rejection of per-element
linkage applies here. **It does not, and the difference is worth being precise
about, because the surface similarity is strong.**

The readiness spec rejected linkage because it was **high cost, low value**: it
had to be authored for every element of every claim type, and even fully wired
it would only establish that *a field is non-empty* — it would look automatic
while meaning very little.

Here the value side inverts. **Question quality is the entire deliverable.**
There is no cheaper mechanism that produces the same result, because the whole
point is asking a better question than a generic one. Cost is real; value is not
marginal.

And the cost is much lower than "~150 scenarios × N questions", for three
measured reasons:

1. **Elements recur across claim types.** Of 133 element entries in
   `claimTypes.ts`, the single name *"The amount claimed falls within Small
   Claims Court's jurisdiction"* appears **8 times**, and *"The amount owing
   falls within Small Claims Court's jurisdiction"* a further **3**. Authoring
   attached to **element id** is written once and reused wherever that element
   appears.
2. **Many elements need no question at all.** Those 11 jurisdictional entries
   are not facts a user narrates — they are legal conditions checked against the
   amount already captured. The same is true of most procedural elements. A
   first-class **`noQuestionNeeded`** state covers these, and it is not a gap.
3. **The marginal cost of claim type 50 is therefore well below its element
   count**, because it inherits every already-authored element it shares.

### The model

For each element id, one of three authoring states:

| State | Meaning |
|---|---|
| **Authored question(s)** | A reviewed question, in the `IntakeQuestion` shape, targeting this element's fact. |
| **`noQuestionNeeded`** | This element is jurisdictional/procedural — no user-narrated fact behind it. Explicit, not absent. |
| **Not yet authored** | Falls back (below). |

**The fallback for unauthored elements is NOT a generated question.** It is the
readiness gate's attestation prompt, which already exists and is already safe:
the element's `name`, its `plainExplanation`, its `evidenceCategories` as
*"things that often help"*, and the three-state control. So an unauthored element
degrades to **exactly today's behaviour**, never to a bad question.

**This makes the feature incrementally shippable**, which matters more than
coverage: author the highest-traffic claim types first, and every unauthored
element still works.

**Authoring burden should be stated honestly rather than minimised:** each
authored question is reviewed content under CLAUDE.md section 2 where it states
any legal fact (`why` requires `sourceUrl`). This is real work. The argument is
that it is bounded, reusable, and incrementally deliverable — not that it is
cheap.

---

## 2. Property 1 — nothing already stated gets asked again

**This is the property that decides whether the feature feels like listening or
like a form, so it gets the most robust mechanism available.**

**Adopted: a deterministic pre-filter, modelled directly on
`filterConfirmedEvidenceFromMissing`. The model is never trusted to notice.**

The precedent is exact. `smallClaimsIntelligenceEngine.ts:157` filters any
`missingEvidence` item sharing **2+ significant words** with what the user said
they had, using a stopword list, after the model re-flagged already-confirmed
evidence. Its comment names the underlying bug: *"missingEvidence should state
factual absence, not re-surface or grade evidence that was already confirmed."*
**Re-asking an answered question is the same bug in a different surface**, and
deserves the same treatment: a pure function, no AI, run unconditionally.

### The `alreadyCovered` filter

Before any claim-type question is asked, drop it if its target fact already
appears in the user's own words. Inputs are the captured verbatim text the
pipeline already holds — the opening story, plus `amountClaimedText`,
`timelineText`, `evidenceText`, `remedySoughtText`, `serviceDetailsText`.

Deliberate design choices, each with its reason:

- **Pure and deterministic.** Same inputs, same output, no network, testable
  offline — matching `selectQuestions.ts`'s existing contract.
- **Keyword overlap, not semantic similarity.** An embedding check would be more
  accurate and is the wrong tool: it cannot be reasoned about when it misfires,
  and a silent AI-driven suppression could drop a question the user genuinely
  needed to answer with no trace.
- **Per-question keyword sets, authored alongside the question.** Rather than
  one global stopword list, each authored question carries the significant terms
  that mean "this was already covered" (for a defamation publication element:
  *posted, said, told, wrote, shared, sent*). This is more accurate than generic
  overlap and is reviewable by a human reading the question next to its filter.
- **Bias toward suppression on ambiguity.** Wrongly suppressing costs one
  unasked question, and the readiness gate still surfaces the element for
  attestation — so the fact is never lost. Wrongly asking costs the user's trust
  in whether the system read their story. The failure modes are not symmetric,
  and the design should not pretend they are.

**Escape hatch.** A suppressed question must remain reachable — the readiness
section (§5) lists the element regardless, so a user who feels their story did
not really cover it can still add detail. Suppression removes a *prompt*, never
an *opportunity*.

---

## 3. Property 2 — questions inherit the user's vocabulary

**Adopted: a two-channel design, because Finding 2 rules out the single-channel
one the brief assumed.**

### Channel A — the lead-in (existing, unchanged)

The voice layer already restates the user's situation in natural language before
each question, may acknowledge tone from a verbatim excerpt, and is guarded by
`validateVoiceLayerOutput()` — pure, deterministic, run on every lead-in. Claim-
type questions use it exactly as existing questions do. **No parallel mechanism.**

### Channel B — deterministic slot substitution (new, and the actual contribution)

Authored question text may contain named slots filled from captured verbatim
strings:

> Authored: `"When {defendantLabel} put up {subjectLabel}, who else saw it?"`
> Rendered: `"When your ex-girlfriend put up the post, who else saw it?"`

Properties that make this safe:

- **The substitution is a pure string operation over text the user themselves
  typed.** No model produces the question. `VoiceTurn.questionText` remains
  non-model output and Finding 2's invariant holds exactly as written.
- **Every slot has an authored neutral default** — `{defendantLabel}` → "the
  other party", `{subjectLabel}` → "it". A question must read correctly with
  every slot defaulted, which is the ship-safe state.
- **Slots take the user's noun only, never their characterization.** "my
  ex-girlfriend" is a referring expression; "that liar" is a characterization,
  and echoing it back inside a question would adopt it. Slot candidates should be
  drawn from a bounded set of captured party/subject labels, not free extraction
  from the story — and where no clean label exists, the neutral default is
  correct, not a fallback failure.

**Why not let the voice layer write the question, which would be simpler.** It
would dissolve the one guarantee that makes this architecture defensible: that
the words a user is asked to answer were written and reviewed by a person. For a
legal intake product that is not a tradeoff worth making for phrasing quality.

---

## 4. Properties 3 and 4 — no coaching, and "I don't know" as a real answer

### Property 3 — no coaching toward answers

**Adopted: three stacked defences, since this is where the product is most
likely to drift under pressure to sound helpful.**

The line, from the brief and adopted verbatim as the test: **naming what a claim
type generally involves is fine; signalling which answer helps is not.**

| Permitted | Prohibited |
|---|---|
| "Did anyone else see the post?" | "How many people saw it — the more the better." |
| "Was there anything in writing?" | "A written agreement would really strengthen this." |
| `examples`: "a text message, an email, a receipt" | `examples` ordered best-to-worst |
| "Claims like this one generally involve X." | "You'll need X to succeed." |

1. **Authoring rule.** A question asks for a fact and stops. No question
   text or `examples` entry may indicate that one answer is better than another.
   `examples` is already documented as *"Neutral examples"* — that convention is
   now load-bearing and should be stated as a rule, not left as a comment.
2. **Review gate.** Claim-type questions carry `status: "draft" | "reviewed"`
   like every bank entry, and `selectQuestions.ts` already filters to
   `reviewed`. **An unreviewed question is structurally unaskable** — the
   existing mechanism is the enforcement, and no new one is needed.
3. **The voice layer's existing validator** already blocks "strong", "weak",
   "good case", "should win", "will win", "court will" in the lead-in.

**A gap worth naming rather than leaving implied:** `validateVoiceLayerOutput`
guards the *lead-in*. It does not run over *question text*, because question
text has until now always been human-reviewed bank content. That remains true
here — but if slot substitution (§3) ever admitted free-form user text into a
question, a prohibited term could arrive via the slot. Bounding slot values to
party/subject labels (§3) is what prevents that, which is a second reason for
the bound beyond avoiding characterization.

### Property 4 — "I don't know" must move the conversation forward

**Adopted: `allowUnknown: true` is mandatory for every claim-type question, and
an unknown answer resolves the element to "cannot provide" rather than leaving
it open.**

Finding 3 established this is already the bank's invariant. The addition here is
the **link to the readiness gate's three-state model**:

| User response | Element state |
|---|---|
| Answers | **provided** |
| "I don't know" / "I don't have that" | **cannot provide** |
| Never reached (skipped phase, suppressed) | **not yet** |

This is the whole point of the connection. The readiness spec holds the gate
only on *not yet* — the absence of an answer — never on *cannot provide*. So an
unanswerable question **resolves** rather than blocks. Without this link, adding
deeper questions would create more ways to be stuck, and a feature meant to
improve drafts would make them harder to reach.

**"I don't know" must never be presented as a lesser answer.** It records a fact
about the user's records, not a conclusion about their case — the same
constraint the readiness spec puts on "cannot provide."

---

## 5. Decision — how this composes with the readiness gate

**Adopted: targeted answers feed attestation DIRECTLY. The user never sees the
same element twice.**

This is the composition question the brief asks, and the alternative is worse in
a specific way: if the depth phase asks *"who else saw the post?"* and the
readiness section then separately asks *"have you got anything showing the
statement reached someone else?"*, the user has been asked the same thing twice
in different words. That is the §2 failure re-introduced at the seam between two
features — which is exactly where this kind of defect tends to appear.

**The model:** both phases are views over one per-element state.

```
confirmed claim type
        │
        ├─ plaintiffElements ──┬─ authored question?
        │                      │     ├─ yes, not alreadyCovered  → ASK  → state
        │                      │     ├─ yes, alreadyCovered      → skip → provided
        │                      │     └─ noQuestionNeeded         → n/a
        │                      │
        │                      └─ unauthored → readiness attestation only
        │
        └─ element state map ──→ readiness gate (§8 of the readiness spec)
```

- An element **answered** in the depth phase arrives at the readiness section
  already **provided**, shown as settled, editable but not re-asked.
- An element **suppressed** by `alreadyCovered` also arrives **provided** —
  because the user did state it, in their story. It should show **what their own
  words supplied**, so a wrong suppression is visible and correctable.
- An element answered **"I don't know"** arrives **cannot provide** (§4).
- An element **never reached** stays **not yet** and is the gate's job.

**The readiness section remains the single source of truth for gate state**, so
this spec adds no second gate and changes none of the readiness spec's
conditions. Depth questions are a better way to *populate* the same state map.

---

## 6. Decision — how many questions, and what stops it becoming an interrogation

**Adopted: a hard per-claim-type budget of 3–5 asked questions, applied after
the `alreadyCovered` filter, with ordering by element position.**

Reasoning:

- **After filtering, the realistic count is already small.** A user who wrote a
  paragraph has typically covered the core of their own claim. The budget is a
  ceiling for the unusual case (a terse opener on a many-element claim type),
  not the expected length.
- **The cap applies to questions ASKED, not authored.** A claim type may carry
  eight authored questions; if five are filtered as already covered, three are
  asked. The budget never causes a *silent* drop of an unfiltered question: if
  more survive filtering than the budget allows, the overflow elements are
  **not asked but still surfaced** in the readiness section. Nothing is lost;
  only the conversational prompt is deferred.
- **Guided intake already runs ~15 questions.** Adding an unbounded second phase
  would roughly double a flow users already complete under effort. A bounded
  addition is a real improvement; an unbounded one risks abandonment, which
  produces worse drafts than asking nothing.
- **Order by element order**, which already reflects how the claim type's own
  sourced content is structured, rather than by any notion of importance —
  ranking elements by importance to *this* case would be assessment.

**The real anti-interrogation mechanism is §2, not the cap.** A budget limits
length; only the filter makes the questions feel earned. A well-filtered set of
five beats an unfiltered set of three.

---

## 7. Decision — is this phase skippable, and what does a skipper get?

**Adopted: yes, skippable at any point, with a plain and non-punitive exit.**

Reasoning:

- **The feature exists to improve draft quality, not to be a prerequisite.** The
  engine already produces a safe, placeholder-marked draft from general intake —
  that is fixture-verified and shipping behaviour. Making depth mandatory would
  convert an enhancement into a barrier.
- **CLAUDE.md section 4 ("suggest, never decide")** applies: the system may offer
  more questions; it may not require them.
- **A user who skips is materially worse off in draft richness, and that is
  acceptable and should be stated plainly** — *"you can add more detail any time;
  it'll make the draft fuller"* — without implying anything about their case.
  "Fuller draft" is a fact about the document. "Stronger claim" is assessment.

**What a skipper gets:** every unreached element stays **not yet**, so the
readiness gate holds — and the readiness section shows exactly which elements are
outstanding, with the same attestation controls. **The skip therefore routes into
the readiness gate rather than into a dead end.** A skipper has not lost the
feature; they have chosen a different surface for the same work.

**Skip should be per-phase, not per-question.** A per-question "skip" invites
reflexive skipping of everything; a single honest "I'd rather not answer more
questions right now" is a clearer choice and easier to resume from.

---

## 8. Out of scope

- **Extending `KNOWN_FACT_FIELDS`** — Finding 1 recommends against it.
- **Letting the voice layer generate question text** — Finding 2 explains why
  the invariant should hold.
- **Authoring the questions themselves.** This spec defines the mechanism, the
  authoring states, and the safety rules. The content is sourcing work under
  CLAUDE.md section 2, per claim type, and is the bulk of the real effort.
- **Family and Civil.** `CourtArea` already permits them; no content exists.
- **Semantic/embedding-based coverage detection** — considered and rejected in
  §2 for auditability, not capability.

---

## 9. Open questions for the site owner

1. **Should suppressed questions be visible as suppressed?** §2 biases toward
   suppression and §5 shows the element as *provided* with the user's own words.
   An explicit *"we took this from what you told us — change it?"* is more
   transparent but adds interface weight to the common case where the filter was
   simply right.

2. **Does the 3–5 budget hold for high-element claim types?** Wrongful dismissal
   and defamation carry more substantive elements than unpaid debt. A uniform cap
   is predictable; a per-claim-type cap fits better but is one more thing to
   author per claim type, against §1's whole argument.

3. **Should the depth phase run immediately after claim-type confirmation, or be
   offered later?** Immediately is more coherent conversationally, since the
   confirmation is fresh. Later respects that the user came to finish intake, not
   to answer twice as many questions. This spec assumes immediately-but-skippable;
   it is a product call, not a design constraint.
