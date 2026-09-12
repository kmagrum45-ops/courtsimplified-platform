# Statement of Claim — Readiness Gate Design

**Status: designed, not built. No code was written or changed for this spec.**

Design for how `src/lib/case-system/statementOfClaimDraftEngine.ts` becomes
reachable by a user. The engine is built, fixture-verified, deterministic, and
wired to nothing. This spec decides the gate that makes it available.

The requirement from the site owner: the draft becomes available once the case
file is **genuinely complete** — the user's story and evidence are entered, the
court type is selected, the remedy sought is chosen, and the legal basis is
established. Explicitly **not** "intake finished."

---

## 0. The finding that shapes everything below

**Read `claimTypes.ts` first, as instructed, to confirm `plaintiffElements`
supports a derived gate. It supports half of what the brief assumes, and the
missing half changes the design — for the better.**

The structure is:

```ts
export type PlaintiffElement = {
  id: string;
  name: string;
  plainExplanation: string;
  sourceUrl: string;
  evidenceCategories: EvidenceCategory[];   // { name, why, examples[] }
};
```

**What this DOES support.** Every claim type carries its own ordered list of
elements, each with a human-readable `name`, a sourced `plainExplanation`, and
named `evidenceCategories` with concrete `examples`. A gate can therefore
enumerate, entirely from data, what a given claim type calls for — and it does
so identically for claim type 23 and claim type 50, because the elements arrive
attached to the claim type. **The no-hardcoded-list constraint is satisfiable.**

**What this does NOT support, and the brief assumes it does.** There is **no
machine-readable link between a `PlaintiffElement` and any captured intake
field.** `id` is a slug for cross-referencing (`causation-vehicle-accident`),
not a pointer to data. `evidenceCategories` are prose. Confirmed by search: no
`elementId`, `plaintiffElementId`, or `element_id` exists anywhere in
`src/lib/case-system/evidence*` or `src/lib/case-system/intake`. Nothing
anywhere associates a piece of captured evidence with an element it speaks to.

**So a fully automatic gate is not buildable on the current schema.** The system
can derive *what a claim type calls for*; it cannot derive *whether the user has
supplied it*, because no data connects the two.

**This is the right constraint, not an obstacle to engineer around.** Any
automatic check of "has the user satisfied element X?" would be the system
applying a legal test to the user's facts — precisely what CLAUDE.md section 2's
"who does the applying" test forbids, and what section 3 forbids as assessing
case strength. A machine that decides "you have adequately addressed causation"
has assessed the case.

**The bridge is therefore a per-element user attestation**, and it must be,
independent of schema convenience. The system derives and presents the question;
**the user answers it.** That single move satisfies the no-hardcoded-list
requirement, the "who does the applying" test, and "suggest, never decide"
simultaneously.

### What would need to change for anything more automatic

Recorded so a later session does not rediscover it, and so the cost is visible:

1. `PlaintiffElement` would need an optional field linking it to intake data —
   e.g. `satisfiedByFields?: string[]` naming `IntakeFacts` keys, or
   `capturesField`-style wiring like `questionBank.ts` already uses.
2. That linkage would have to be authored for **every element of every claim
   type** (22 claim types today, ~150 scenarios mapped in
   `docs/SMALL_CLAIMS_TAXONOMY_ROADMAP.md`) — and re-authored for each new one,
   which reintroduces by the back door exactly the per-claim-type maintenance
   burden the derived design exists to avoid.
3. Even fully wired, it would establish only that *a field is non-empty*, not
   that its content addresses the element. The gate would look automatic while
   meaning very little.

**Recommendation: do not add that linkage.** The attestation design is better on
the merits, not merely cheaper.

---

## 1. Decision — what "evidence entered" means concretely

Defined against what the pipeline actually captures today, not an idealized
version.

**What exists, confirmed by reading the mapper:**

- `app/builder/_components/guidedIntakeToSmallClaimsInput.ts:136` sets
  **`uploadedEvidenceFiles: []`** with the comment *"guided mode has no
  file-upload capability at all."* Not a gap to be filled later in passing —
  guided mode has no upload path whatsoever.
- `:162` maps `evidence` to `textField(result.facts.evidenceText)` — the
  **verbatim free-text answer to the single question `sc-evidence-available`**.
- Name, address, defendant's address and claim number are left empty by design
  (header, lines 9–13), never guessed.
- `src/lib/case-system/evidence/` contains intelligence and relationship
  engines, but nothing that links an evidence item to a claim-type element.

**Therefore "evidence entered" CANNOT mean "files uploaded."** A threshold
requiring uploads would make the gate permanently unreachable for every guided-
mode user — the largest intended audience. That is a design error worth naming
explicitly, because it is the obvious first instinct.

**Definition adopted:**

> "Evidence entered" means that, for each `plaintiffElement` of the confirmed
> claim type, the user has recorded an explicit state — **provided**,
> **cannot provide**, or **not yet** — and, where the state is *provided*, has
> entered non-empty text describing what they have.

Properties this has:

- It works with free text, so guided mode can satisfy it today.
- It upgrades cleanly if file upload is added later — an attached file becomes
  one way to reach *provided*, not a new gate.
- It never judges whether the described evidence is sufficient. The user says
  what they have; the system records it.
- It scales to claim type 50 with no new code, because the element list is data.

**Explicitly NOT part of the definition:** any assessment of quality,
sufficiency, admissibility, or weight. Recording "I have the text messages" is a
fact about the case file. Concluding "that is enough to prove publication" is
assessment, and is out of bounds under CLAUDE.md section 3.

---

## 2. Decision — remedy selection: required, inferred, or confirmed

**Adopted: the claim type's `remedies` field SEEDS the options; the user
CONFIRMS the selection. Never inferred silently.**

Each `ClaimType` carries `remedies: string[]` referencing `REMEDY_TYPES`
(`sc-remedy-monetary-judgment`, `sc-remedy-interest-and-costs`, and others).
That field is the correct source for *which options to present* — it is sourced
content, and it is per-claim-type, so it needs no hardcoded list.

But **CLAUDE.md section 4 ("suggest, never decide") settles the rest.** Silently
inferring the remedy from the claim type would auto-apply a determination the
user never made, and the remedy sought appears in the draft's RELIEF SOUGHT
section — it would be attributed to the user in a court document they did not
choose it for.

Guided intake already captures `remedySoughtText` (the verbatim answer to
`sc-remedy-sought`, mapped to `goal`). That is the user's own statement of what
they want, in their words. The confirmation step should **present the claim
type's `remedies` as options alongside what the user already said**, and have
the user confirm which applies — the same shape as the existing claim-type
suggestion, where a system-generated proposal becomes a user selection only on
an affirmative act.

**Required for the gate: yes.** A Statement of Claim without a prayer for relief
is not a Statement of Claim. This is one of the few genuinely non-skippable
items, and unlike an evidence item, it is always answerable — a user always
knows what outcome they want, even when they lack documents. There is no
legitimate "cannot provide" case here.

---

## 3. Decision — does the confirmed claim type establish the legal basis?

**Adopted: yes, the confirmed claim type alone establishes it. Nothing further
is required.**

Reasoning, and the reason this is not a shortcut:

The AI classifier produces a *suggestion*. `GuidedSmallClaimsIntake.tsx:470–495`
shows it to the user as *"This sounds like it may be about: {name} — is that
right?"*, with the explicit line *"This is a suggestion only, not a
determination of your case — nothing is applied until you confirm it,"* and a
confirm/reject pair. Only on confirm does it become the matched claim type
(`resolveSuggestion`, `:351`).

**The confirmed result is therefore the user's own selection**, arrived at after
being shown a proposal and given a real option to reject it. That is exactly the
fact the gate needs. Requiring something *further* — a second legal-basis check —
would mean the system evaluating whether the user's chosen basis is correct for
their facts, which is the "who does the applying" violation in its purest form.

**Two qualifications that belong in the implementation:**

- **Where no claim type matched, the gate cannot open.** The UI already handles
  this state (`noClaimTypeMatch`, `:497`). Without a claim type there are no
  `plaintiffElements`, so there is nothing to derive a gate from and no basis
  to state. This should read as "we don't have a specific match for this kind of
  situation yet," matching the existing copy, **not** as a failure by the user.
- **`ClaimType.status` should be surfaced, not enforced.** Some entries are
  `status: "draft"` (e.g. `sc-claim-wrongful-dismissal`). The gate should not
  *block* on draft status — that would silently withhold a feature for reasons
  the user cannot see or act on — but the draft's own header is the right place
  to note that this claim type's content is still under review.

---

## 4. Decision — the hard one: when a user genuinely cannot supply something

**Adopted: a three-state model per element, where "cannot provide" is a
first-class terminal state that opens the gate, and a draft with marked gaps is
produced.**

This is the decision the brief asks to be argued rather than asserted, so both
sides follow.

### The case against producing a gapped draft

It is not weak, and it should be stated at full strength:

1. **A document that looks finished invites filing.** A user who receives
   something titled "Statement of Claim" may file it with `[Plaintiff address to
   be confirmed]` still in it. That wastes a filing fee and may prejudice them.
2. **A gate that always opens is not a gate.** If "cannot provide" is freely
   available on every element, a user can reach a draft having entered almost
   nothing, and the "genuinely complete" requirement becomes decorative.
3. **Gaps in a legal document are not uniform.** A missing postal code and a
   missing account of what the defendant actually did are not equivalent, and a
   flat placeholder mechanism treats them alike.

### The case for producing it, which prevails

1. **A strict gate traps users permanently, and the trapped population is
   exactly the intended audience.** Someone who never received a written
   contract cannot produce one — ever. No amount of further intake changes that.
   A gate admitting only "done" and "not done" tells that user to keep working
   on something that will never complete, with no explanation and no exit. For a
   self-represented-litigant platform, that is the worst available outcome: it
   fails the people least able to get help elsewhere, and it fails them silently.

2. **The engine was built for this and already behaves correctly.** It emits
   `[Plaintiff name to be confirmed]`, `[Defendant address to be confirmed]`,
   `[amount claimed to be confirmed]` (lines 65–69) rather than inventing
   values, collects every one into `missingParticulars` (line 60: *"named
   plainly so the user knows exactly what to fill in before this is used"*), and
   prints them as a checklist in the draft (lines 213–216) under instructions to
   *"Replace every bracketed placeholder"* (line 206). **The safe-partial-draft
   behaviour is already implemented and fixture-verified.** The gate's job is to
   decide when to show it, not to re-solve a solved problem.

3. **The fixture evidence is directly on point.** The gap fixture preserved *"I
   don't remember the exact date"* verbatim rather than inventing a date. That
   is the exact scenario objection (3) worries about, and the engine's actual
   behaviour is to surface the gap in the user's own words — visibly, where they
   and any reviewer will see it.

4. **A marked gap is more useful than no draft, including to a licensee.** A
   user who takes a gapped draft to a paralegal arrives with a structured
   document and an explicit list of what is outstanding. A user who was refused
   a draft arrives with nothing and cannot explain what blocked them. The
   placeholder *is the work product* in the hard cases.

5. **Objection (1) is real but is a presentation problem, not a gate problem** —
   addressed in §6 by never letting a gapped draft present as final, and in §4's
   asymmetry rule below.

### The three states

For each `plaintiffElement` of the confirmed claim type:

| State | Meaning | Effect on gate |
|---|---|---|
| **Provided** | User entered text describing what they have. | Opens |
| **Cannot provide** | User affirmatively says this does not exist or is unavailable to them. | **Opens, and marks the draft** |
| **Not yet** (default) | Untouched. No statement either way. | **Holds** |

**The whole design turns on separating the third state from the second.** "Not
yet" is the absence of an answer; "cannot provide" is an answer. Only the
absence of an answer holds the gate. A user is never blocked by a fact about
their case — only by a question they have not yet reached.

**Asymmetry rule, answering objection (3).** Not every gap is equal, and the
design should not pretend otherwise:

- **Identity and amount placeholders** (plaintiff/defendant name and address,
  amount claimed) are *administrative* — the user knows these or can find them,
  and they block filing but not drafting. The draft proceeds with placeholders.
- **A "cannot provide" on a `plaintiffElement`** is *substantive*. The draft
  should still be produced, but the element's own `name` should appear in the
  draft's outstanding list in the claim type's own words, so that what is
  missing is visible in the document rather than only in the UI that produced it.

**"Cannot provide" must never be presented as a verdict.** It records a fact
about the user's records, not a conclusion about their case. The UI copy must
not imply that selecting it weakens anything — because the system does not know
that, and saying so would be assessment.

---

## 5. Decision — what the user sees when the gate is not met

**Adopted: the gate names exactly what is outstanding, in the claim type's own
sourced words, and never characterizes the user's position.**

The brief draws the right line and this spec adopts it verbatim as the test:

> Telling a user *"your claim type generally requires X and you haven't entered
> anything for it"* **states what the claim type requires.**
> Telling them *"you don't have enough to prove X"* **assesses their case.**

The first is legal information — the USER applies it. The second is the SYSTEM
applying law to their facts, prohibited by CLAUDE.md section 2, and additionally
a strength assessment prohibited by section 3.

### Concrete copy, derived entirely from data

For an outstanding element, using its own `name` and `plainExplanation`:

> **Still to add: "The statement was communicated to someone other than the
> plaintiff"**
> Claims like this one generally involve showing what was said or written and
> that it reached someone other than you.
> *Things that often help:* screenshots or copies of the post, message or
> publication; a witness account of who else saw or heard it.
> [ I have this ] [ I don't have this ] [ Skip for now ]

Every word after the heading comes from the claim type's own sourced
`plainExplanation` and `evidenceCategories`. Nothing is authored per claim type,
so this renders correctly for claim type 50 on the day it is added.

### Permitted vs prohibited, explicitly

| Permitted | Prohibited |
|---|---|
| "Claims like this one generally involve showing X." | "You need X to win." |
| "Nothing has been entered for this yet." | "Your evidence for X is weak." |
| "Things that often help: …" (from `evidenceCategories`) | "What you've entered isn't enough." |
| "This is what this kind of claim generally involves — worth reading to see if it fits your circumstances." | "This element is satisfied / not satisfied." |
| Naming the element and linking its `sourceUrl`. | Ranking elements by importance to *this* case. |

**The generic framing is load-bearing, not stylistic.** "Claims like this one
generally involve…" describes a category. "Your claim requires…" describes the
user's case and implies the system has evaluated it. The difference is the whole
of CLAUDE.md section 2, and the copy must not drift toward the second under
pressure to sound more direct.

**Counting is permitted; scoring is not.** "3 of 5 items still to add" is a fact
about the case file. Any readiness *percentage*, progress score, or
strength-flavoured indicator is prohibited — `docs/DEADLINE_TRACKING_DESIGN.md`
and CLAUDE.md section 3 both bar readiness scores that weight risk, and a
completion bar over legal elements reads as exactly that.

---

## 6. Decision — where the draft surfaces, and where review-and-approve lives

**Adopted: follow the forms page's verified-form confirmation pattern
(`app/forms/page.tsx:848+`). Do not invent a third pattern.**

Two confirm-before-use patterns exist. Both were read.

| | **Pattern A** — classifier suggestion (`GuidedSmallClaimsIntake.tsx:469–495`) | **Pattern B** — verified-form confirmation (`app/forms/page.tsx:848+`) |
|---|---|---|
| Shape | Inline, transient, in-flow | Persistent section on a page |
| Scope | One binary question | Several explicit answers |
| Persistence | Resolved and gone | Saved to the case (`saveApplicability`) |
| Gate | Blocks the turn | *"We only show a recommendation after every applicable answer is explicit and verified against the selected case."* |
| Re-entry | No | Yes — user returns and changes answers |

**Pattern B is the correct fit**, for reasons specific to this gate:

- Its stated gate is already, almost word for word, the gate this spec needs:
  a downstream artifact withheld until every applicable answer is **explicit**.
- Readiness is **multi-item and revisited over time**. A user will answer some
  elements, leave, return with a document, and change an answer. Pattern A is
  transient and cannot hold that state.
- It already **persists confirmations against the case**, which this gate
  requires — element states must survive a session.
- It handles the unauthenticated case coherently already (*"Official forms can
  be browsed here, but a verified recommendation needs an authenticated selected
  case and explicit confirmations"* — `:844`), and the same posture applies.

**Pattern A still applies to one thing:** the remedy confirmation in §2 is a
single, in-flow, suggestion-then-confirm decision, and should use Pattern A's
shape where it occurs during intake.

### Placement

- **The readiness section** lives on the case/builder surface, as a persistent
  section titled in the register of "Verified form confirmation" — e.g.
  **"Statement of Claim readiness."** It lists the confirmed claim type's
  elements with their three-state control, plus remedy confirmation.
- **The draft appears in that same section once the gate opens**, not on a
  separate page. Pattern B shows the recommendation directly beneath the
  confirmations that unlocked it, which keeps cause and effect adjacent.
- **Review-and-approve is inline, beneath the draft**, following the same shape
  as the verified-recommendation card: the artifact, its provenance, and its
  caveat together. The engine already supplies the caveat text — its header and
  footer state that the wording is the user's own and still needs their review,
  and print the `missingParticulars` checklist. **The UI should render what the
  engine already produces rather than composing new warning copy**, so the
  safety language cannot drift out of sync with the document it describes.
- **A gapped draft must never present as final.** Where `missingParticulars` is
  non-empty, the outstanding list renders *above* the draft body, and the
  approve action reads as approving a draft to work from — never "ready to
  file." The engine's own header already says this; the UI must not undercut it.

---

## 7. The plaintiff name and address gap

**Confirmed, not assumed.** `guidedIntakeToSmallClaimsInput.ts`'s header
(lines 9–13) states that guided mode's question bank is narrower than the
static form's ~25 fields and that *"name, address, defendant's address, claim
number, and others with no corresponding guided question at all"* are left
empty. Every such field is left as an empty string or empty array — *"never a
plausible-looking guess."* Logged in `docs/INTAKE_STATUS.md`.

A Statement of Claim needs both. So: **is fixing this a blocker for the gate?**

**Adopted: NO. It is not a blocker, and the placeholder mechanism covers it —
but it IS a blocker for filing, and the two must not be conflated.**

Reasoning:

1. **The engine already handles it correctly and deliberately.**
   `MISSING_PLAINTIFF_NAME` and `MISSING_PLAINTIFF_ADDRESS` (lines 65–69) exist
   precisely because these fields are *"confirmed structurally absent from
   `IntakeFacts`, not a bug"* (`INTAKE_STATUS.md`). This was designed for, not
   overlooked.

2. **These are administrative, not substantive.** Per §4's asymmetry rule: the
   user knows their own name and address. Nothing about their case is unresolved
   by the absence — only a field is unfilled. This is the clearest possible case
   for a placeholder rather than a gate.

3. **Blocking on it would invert the priority.** It would withhold the entire
   feature — including all the substantive organizing work the engine does —
   pending two data-entry fields the user can supply in seconds once asked. That
   is a poor trade, and it would delay the gate behind an unrelated intake
   change.

4. **But the draft cannot be filed with placeholders in it**, and the user must
   understand that clearly. This is already handled: the placeholders are
   deliberately conspicuous (`[Plaintiff name to be confirmed]`), they are
   collected into `missingParticulars`, and the draft instructs the user to
   replace every one before use.

**Recommendation:** ship the gate without waiting on the intake change, and
separately add plaintiff name and address as guided-intake questions when
convenient. When that lands, the placeholders simply stop appearing — no gate
logic changes, because the gate never depended on them. That independence is
itself an argument for the placeholder design.

**One caution worth stating.** Of all the placeholders, identity fields are the
most likely to be overlooked precisely because they feel trivial. The
outstanding-items list should not bury them among substantive items — but it
also should not rank them, which would edge toward assessment. Listing them
under a plain heading such as "Details still to fill in" separate from "Still to
add about what happened" keeps them visible without implying either is more
important to the merits.

---

## 8. The gate, stated in one place

The draft becomes available when **all** of the following hold:

1. **A claim type is confirmed** — the user affirmatively accepted the
   classifier's suggestion (§3). Without this there are no elements and no gate.
2. **Court type is selected** — already captured; Small Claims for this engine.
3. **A remedy is confirmed** by the user from the claim type's `remedies` (§2).
   No "cannot provide" state; always answerable.
4. **The user's story is entered** — non-empty narrative facts, already captured
   as `facts`/`timeline`.
5. **Every `plaintiffElement` of the confirmed claim type is in a resolved
   state** — *provided* or *cannot provide*. Any element left *not yet* holds
   the gate (§4).

Conditions 1–4 are fixed and few. **Condition 5 is entirely derived from the
confirmed claim type's own data**, which is what makes this work unchanged for
claim type 23, claim type 50, and the ~150 scenarios in the taxonomy roadmap.
Nothing in the gate enumerates claim types, categories, or fact patterns.

**What the gate never does:** decide whether an element is *satisfied*, weigh
evidence, score readiness, or characterize the user's position. It checks
whether the user has **answered**, never whether the answer is **good enough**.

---

## 9. Out of scope for this spec

- **The schema change in §0** — deliberately recommended against, not deferred.
- **File upload for guided mode** — the definition in §1 is designed to work
  without it and to absorb it later.
- **Plaintiff name/address intake questions** (§7) — independent work.
- **Other claim types' fixtures.** The engine is verified against three
  fixtures, all matching `sc-claim-unpaid-debt-services`. The gate is claim-type
  agnostic by construction, but the *engine* has not been exercised against
  another claim type's facts. That should happen before or alongside the build.
- **The sentence-splitter abbreviation defect** — logged in `INTAKE_STATUS.md`,
  unrelated to the gate.
- **The larger court-package capability** the site owner described (arranging
  evidence, statements, witnesses together). Noted in `INTAKE_STATUS.md` as a
  separate, larger design conversation.

---

## 10. Open questions for the site owner

1. **Should "cannot provide" on an element ever be irreversible?** This spec
   assumes it is freely changeable — a user who later finds a document should be
   able to switch it to *provided*. No reason to lock it, but worth confirming.

2. ~~**Should the draft be available at all where no claim type matched?**~~
   **RESOLVED by the site owner — see `docs/UNMATCHED_CLAIM_TYPE_DESIGN.md`.**
   This spec said no (§3: there are no elements to derive from), while flagging
   that a bare refusal leaves the user with nothing, which is the same trap §4
   argues against in a different form. That tension was real, and the answer is
   neither option this spec weighed: **not a weaker draft, and not an empty-
   handed user.** Instead the site explains why a kind of claim has to be
   identified before a Statement of Claim can exist, presents every claim type it
   covers with each one's own sourced `plainExplanation`, and lets the user
   recognize their own situation and choose — a selection that then flows into
   the same per-element state map as a confirmed classifier suggestion, so
   nothing downstream branches on how the claim type was arrived at. Where the
   user says none fit, they get a jurisdiction route or an honest statement that
   the site does not cover this yet. So §3's holding stands unchanged — **no
   draft without a confirmed claim type** — but the unmatched path is no longer
   a dead end, which is what §4's argument actually required.

3. **Does approving a draft need to persist an approval record**, or is the
   approval purely a UI step before download/edit? Pattern B persists
   confirmations; whether the *approval* itself is a stored fact is a product
   decision with records implications, not a design one this spec should settle.
