# CourtSimplified — Test Scenarios

**Status: draft for review. Expectations are proposed, not settled.**

Read this before it becomes code. Every stale check found in the last two
sessions asserted what the code did rather than what it should do, because the
same pass wrote both. This document exists to break that: the expectations get
settled by a person first, then built.

Correct anything below that doesn't match what a self-represented person
actually needs. Where you disagree, your version wins — that's the point of
writing it down first.

---

## Status after the code audit (2026-09-14)

Every scenario below was checked against the code as it stands. **A red run on a
🚧 scenario is not a regression** — it is the scenario doing its other job.

| Marker | Meaning | Scenarios |
|---|---|---|
| ✅ | Built and asserted by a spec | FS-1, FS-2, FS-4 |
| 🟢 | Behaviour exists, spec not written | FS-3, FS-5, FS-9, SC-5, SC-8, SC-12 |
| 🔧 | Behaviour exists, needs harness work first | SC-1, SC-2, SC-3, SC-9, SC-10, FS-6, FS-7, X-1 |
| 🚧 | **Specifies work rather than checking it** | SC-4, SC-6, SC-7, SC-11, SC-13, X-2, X-3, FS-8 |

**🚧 — what does not exist yet, and what a red run means**

- **SC-4, SC-11** — the matcher correctly returns `null` and shows no fallback
  list, but **nothing explains why**. SC-4's own "Must never: show an empty panel
  with no explanation — that reads as broken" describes today's behaviour.
- **SC-6, X-3, FS-8** — blocked at session 2 by `OUTSTANDING_ISSUES.md` section
  0d: the existing-case load path never sets `confirmedLocation`, so a returning
  user meets the location gate again. FS-8's underlying behaviour is built and
  correct (`triageStateFromStored`, `page.tsx:445`); only the gate is in the way.
  SC-6 additionally hits section 27 — `StatementOfClaimSurface` needs a
  `draftInput` no load path reconstructs.
- **SC-7** — no path exists to correct an answer. This is a design document.
- **SC-13** — `outOfScopeForums.ts` deliberately removed its criminal entry for
  making no jurisdictional claim. Recognising a criminal matter is unbuilt.
- **X-2** — answered below, not built.

**Corrected after reading the code:** FS-2 (asserted a feature that does not
exist), FS-4 (wrong mechanism in three places), SC-3 (not the same test as
FS-4), SC-1 (a cost assertion split out as SC-1a), X-2 (open question answered).

**One correction to the audit itself.** SC-12 was first reported as unbuilt on
the strength of a `grep` for "contradiction" returning one comment. It is built
and rendered — `case-timeline/page.tsx:303-316`, under the name
`inconsistencies`. A search proves what the term matches, never what exists.
Recorded in `OUTSTANDING_ISSUES.md` section 0, under "One search term, absence read as absence".

---

## How to read a scenario

Each one has:

- **Story** — in the voice a real person uses. Lowercase, typos, run-ons and
  irrelevant detail are deliberate. Every story tested so far that was written
  by the same author as the signals matched; the ones written as people speak
  did not.
- **Turn-by-turn** — what the site shows, what the user answers, and what must
  change as a result. This is where most defects live. A scenario that only
  checks the end state passes while four screens in the middle lie.
- **Draft** — what the document must and must not contain.
- **Must never** — negative assertions. Every serious defect this session was
  something appearing that shouldn't: an invented harassment finding, a Form 7A
  offered after default, a blocker naming a claim type the user never had.

---

# Part 1 — Small Claims

## 🔧 SC-1 · Defamation, defendant in default

**Why it's here:** this is the walkthrough that found three defects. It stays as
a permanent regression scenario.

**Story**

> my uncles ex girlfriend sent messeges to him and my dad saying i was a
> prostitute but these statements are false and she said it to discredit me
> during a custody arguement between my uncle and his baby mom. it caused my
> boyfriend to break up with me and made my family worried and asked me lots of
> questions

Recorded: claim already filed and served, defendant noted in default, $10000.00
entered as the amount, outcome "money".

**Turn-by-turn**

| Step | Expected |
|---|---|
| Story submitted | Matches `sc-claim-defamation-libel-slander` |
| Claim type shown for confirmation | User confirms. Nothing proceeds on an unconfirmed type. |
| Case snapshot renders | Amount reads **$10,000.00**, not `10000.00` |
| Evidence panel | Every item carries a source citation, or the panel is empty. No uncited items. |
| Depth questions | Drawn from the authored defamation set. Publication, identification, what was said, to whom, when. |
| Element: newspaper/broadcast limitation | Asked as a fact — was it published in a newspaper or broadcast, and when — not as a limitation question. |
| Default recorded | r. 11 card appears: all four routes, 11.01(3) precondition, 11.04. |
| Next steps | "Create Plaintiff's Claim draft" is **absent**, replaced by a line explaining why and how to correct the record. |

**Draft:** not reachable — the claim is already filed. The site should say so.

**Must never**
- "Pattern of harassment" or any evidence item with no basis in the story
- Offer Form 7A after the claim is recorded as filed
- State which r. 11 route this claim takes
- Any score, percentage, strength or readiness figure

**Split out 2026-09-14 — SC-1a · One classifier call, not one per turn**

This was a row in the table above. It is a **cost assertion, not a behavioural
one**, and a page assertion cannot see it: the call happens server-side and
nothing it produces distinguishes one call from four.

It needs a different harness — a request counter around
`/api/intake/classify-claim-type`, or the model-call accounting the journey
battery already does — and it belongs with the other cost checks rather than in
a user-journey scenario. Kept as its own ID so it is not lost, and so a red run
on SC-1 is never ambiguous between "the user saw the wrong thing" and "the
journey cost too much".

---

## 🔧 SC-2 · Personal loan, amount with a qualifier

**Why it's here:** the currency formatter must not silently delete a user's own
qualifying words about their own claim.

**Story**

> I lent my cousin 6000 in march 2024 so he could cover rent he said in a text
> he would pay me back by september. he paid nothing and now wont answer. I also
> paid a bailiff 187 to try and serve him

Amount entered: `about $6,000 plus what I paid the bailiff`

**Turn-by-turn**

| Step | Expected |
|---|---|
| Match | `sc-claim-personal-loan-between-individuals` |
| Amount displayed | **`about $6,000 plus what I paid the bailiff`** — verbatim, unchanged |
| Depth questions | What was agreed and how; what was handed over and when; how much is owing and how they worked it out |
| Readiness | Opens once elements are answered or marked cannot-provide |

**Draft**
- Amount appears exactly as the user wrote it
- No arithmetic. `6000 + 187` appears nowhere
- No interest calculated

**Must never**
- Render the amount as `$6,000.00`, dropping "about" and the bailiff cost
- Total anything the user didn't total

---

## 🔧 SC-3 · Contractor damage, evidence missing

**Why it's here:** cannot-provide must resolve an element. §32 was a permanent
dead end for 18 claim types; this proves the fix holds.

> **NOTE ADDED 2026-09-14: SC-3 and FS-4 are not the same test under two names.**
>
> The `cannot-provide` mechanism — `recordCannotProvide`, `allowUnknown`, and
> the readiness gate holding only on `not-yet` — is **Small Claims only**. It
> depends on `evaluateReadinessGate`, which takes a `ClaimType`; there is no
> family `ClaimType` among the 22 and no `SUPPORT_ELEMENT` id appears on any of
> them (`OUTSTANDING_ISSUES.md` section 0b).
>
> So **SC-3 tests a gate opening** and **FS-4 tests that there is no gate to
> open**. Both end with a draft the user can reach, by entirely different
> routes. Read together as one property, a change breaking one would look
> covered by the other.

**Story**

> a contractor doing my bathroom cracked the tile in the hallway and put a hole
> in the drywall. he says it was already like that. I dont have a quote yet for
> the repair

**Turn-by-turn**

| Step | Expected |
|---|---|
| Match | `sc-claim-contractor-damage` |
| Loss amount question | "What will it cost to put right, and where does that figure come from?" |
| User answers | "I don't know" → resolves as cannot-provide |
| Gate | **Opens.** A cannot-provide is a recorded state, not a gap |
| Other elements | Still asked normally |

**Draft**
- Loss amount appears under a not-recorded heading, not as a blank
- The rest assembles from what was recorded

**Must never**
- Hold the draft because one element is unanswerable
- Suggest a figure
- Treat "I don't know" as "not yet answered"

---

## 🚧 SC-4 · Nothing matches

**Why it's here:** the matcher now returns null rather than guessing. The user
must be told something useful when it does.

**Story**

> my neighbour keeps parking across my driveway and when I asked him to stop he
> said the city told him he could. I cant get my car out some mornings and Ive
> been late for work twice

**Turn-by-turn**

| Step | Expected |
|---|---|
| Match | `null`. No wrong match, no tie broken by array order |
| Panel | No evidence list. **Not** an unsourced fallback list |
| User sees | A plain statement that the site doesn't have a claim type covering this, and what they can still do |

**Must never**
- Match this to the nearest claim type
- Show a generated evidence checklist
- Show an empty panel with no explanation — that reads as broken

---

## 🟢 SC-5 · Wrong tribunal

**Why it's here:** jurisdiction routes ship as general information with no
matching. A false positive here sends someone to the wrong forum.

**Story**

> my landlord hasnt fixed the heat since november and now hes trying to evict me
> for complaining. I want to sue him

**Turn-by-turn**

| Step | Expected |
|---|---|
| Jurisdiction routes | All three shown as general information with citations |
| LTB route | Present in the list, **not** highlighted or selected for this user |
| Claim type | Whatever the matcher returns, including null |

**Must never**
- State that this matter belongs at the LTB
- Match on "my landlord"
- Filter the routes to the one that appears to apply

---

## 🚧 SC-6 · Dog bite across three sessions

**Why it's here:** nobody has tested a returning user. §27 says the Statement of
Claim surface is hidden after reload. This scenario is designed to catch that
class.

**Session 1**

> a dog bit my daughter at the park on saturday. the owner gave me his name but
> I dont have his address. she needed 4 stitches

| Step | Expected |
|---|---|
| Match | `sc-claim-dog-bite-animal-injury` |
| Owner element | Answered partially — name yes, address no |
| Loss element | Not yet answered |
| Session ends | Everything recorded persists |

**Session 2 — three days later**

| Step | Expected |
|---|---|
| Case loads | **Statement of Claim surface is visible.** Not hidden behind an active analysis |
| Prior answers | All present, shown back as recorded |
| Outstanding items | The two unanswered elements, in order |
| User adds | Animal services report number, hospital bill $340 |
| Draft | Reflects all three sessions' answers |

**Session 3 — two weeks later**

| Step | Expected |
|---|---|
| User records | Claim filed and served |
| Next steps | No longer offers to draft the claim |
| Timeline | Shows the events in order, with the stage derived and its basis listed |

**Must never**
- Lose a recorded answer between sessions
- Re-ask an answered question
- Hide the draft surface on reload
- Show a stale draft that predates the latest answers

---

## 🚧 SC-7 · The user changes an answer

**Why it's here:** conditionality was built forward — an element that doesn't
apply is never asked. Whether it works *backward* has never been tested.

**Story:** wrongful dismissal, straightforward.

**Turn-by-turn**

| Step | Expected |
|---|---|
| User states | No severance received |
| Later | Returns and corrects: two weeks' pay was received |
| Record | Updates. Old answer is superseded, not duplicated |
| Draft | Regenerates with the corrected fact |
| Any derived content | Reflects the change |

**Must never**
- Keep both answers
- Leave the draft showing the superseded version
- Require starting over

---

## 🟢 SC-8 · Element that can't be resolved by any fact

**Why it's here:** `dcpd-bar-does-not-apply` is a legal conclusion. The
scenario proves the user isn't trapped by it.

**Story**

> guy ran a red light and hit my car. police came. he had no insurance, the
> officer said his plate came back uninsured. my car needs a new door and bumper,
> the shop quoted 4800

**Turn-by-turn**

| Step | Expected |
|---|---|
| Match | `sc-claim-vehicle-accident-uninsured-driver-property-damage` |
| DCPD element | Question asks what the user knows about the other driver's insurance |
| Provision | The DCPD provision shown beside the question |
| Element state | Recorded as a fact; element itself may remain unresolved |
| Gate | **Opens anyway** |

**Must never**
- Say whether the DCPD bar applies
- Block the draft on an element no fact can resolve

---

## 🔧 SC-9 · No claim type exists for the situation

**Why it's here:** §29 — private used-vehicle sale with a misrepresented
history. Deliberately uncovered. The site must fail honestly.

**Story**

> bought a used civic off a guy on marketplace for 9500. he swore it was never
> in an accident. took it to my mechanic and theres frame repair and carfax shows
> a crash in 2021

**Expected:** returns null. Does **not** match `used-vehicle-nondisclosure`,
which is scoped to a dealer. The user is told plainly.

**Must never**
- Match a private sale to the dealer claim type
- Produce dealer-specific elements for a private seller

---

## 🔧 SC-10 · Over the jurisdictional limit

**Story**

> my business partner took 78000 out of the company account and wont explain it

**Expected:** the exceeds-jurisdiction route is available as general information.
The site does not state that this matter cannot proceed in Small Claims.

---

## 🚧 SC-11 · Almost nothing entered

**Story**

> she owes me money

**Expected:** no match, no invented content, a clear prompt for what would help
— not an error, and not a generated evidence list.

---

## 🟢 SC-12 · Contradictory events

**Why it's here:** the contradiction machinery was built and has never fired in
front of a user.

**Setup:** claim filed 12 March. Then an event recorded 20 January that
presupposes the claim exists.

**Expected:** contradiction notice appears on the timeline, stating both
recorded facts. The site does **not** decide which is right or silently reorder.

---

## 🚧 SC-13 · Criminal matter described

**Story**

> my ex was charged with assault and theres a no contact order but he keeps
> showing up. I want to sue him for what he did

**Expected:** the site recognizes this is outside what it covers, says so, and
points to appropriate resources. It does not produce a Small Claims intake for
the criminal conduct.

---

# Part 2 — Family / child support

## ✅ FS-1 · The common case

**Why it's here:** most users. It should be short, and it should remove a form
from their life.

**Story**

> we were never married, we have 2 kids 7 and 10. he sees them every other
> weekend. he works at the plant, makes about 62 thousand. I just want the child
> support sorted

**Turn-by-turn**

| Step | Expected |
|---|---|
| Top of screen | States plainly that this produces the application and the rule, not a calculated amount — **before** question one |
| Q1 parties + residence | Asked as its own deliberate step with the reason stated |
| Q2 children | Free text. Not parsed into ages |
| Q3 time division | Free text. No 40% conclusion |
| Q4 income | One field. Basis recorded |
| Table-amount-only question | Yes → r. 13(1.3) fires |
| Financial statement | **None required.** Form 8 only |
| Second income field | Never rendered |
| s. 7 list | Never rendered |
| Property question | Collapsed, off |

**Draft**
- Form 8, cited to FLR r. 8(1)
- r. 13(1.3) quoted as the reason no financial statement is filed
- Income verbatim with basis
- No monthly figure, no table row, no calculated amount anywhere

**Must never**
- Render an empty second income field
- Send this user to Form 13
- Produce any dollar figure the user didn't enter

---

## ✅ FS-2 · Payor lives in another province

**Why it's here:** a wrong answer here silently selects the wrong table and
nothing downstream can detect it.

**Story:** same as FS-1, except he moved to Alberta in January.

> **CORRECTED 2026-09-14 after reading the code.** This originally read
> "residence answer selects Alberta's table". **That is not implemented**, and
> asserting it would have passed for the wrong reason: no table is shown and no
> province is named as applicable, so "does not default to Ontario" holds
> because the feature is absent. A check that cannot fail.
>
> Whether it *should* be implemented is a CLAUDE.md section 2 question, not a
> bug — "your table is Alberta's" is the system applying a statutory definition
> to the user's facts. See `OUTSTANDING_ISSUES.md` section 0g, which collects
> this with the DCPD bar and the tenancy classification: three places where a
> fact the user knows sits beside a characterisation the site will not make,
> each decided separately and all three landing on the same answer.

**Expected** — built, and asserted in `child-support-scenarios.spec.ts`

| Step | Expected |
|---|---|
| Residence question | Its own step, with the reason on the page: the table turns on where **the parent the order is sought against** ordinarily resides |
| The rule for this user | s. 2(1)(b), the elsewhere-in-Canada branch, quoted verbatim in the table card — without it a user in this position reads only (a) and concludes Ontario applies |
| Their answer | Carried into the draft verbatim as the address for service |
| Which table applies | **Not stated.** Nowhere on the page |

**Must never**
- Tell the user which province's table is theirs — "your table is", "the table
  that applies to you", "use the Alberta table"
- Treat residence as a formality, or style it as part of "who are the parties"
- Show Ontario's table, or any table, as the applicable one

**Open, not decided:** whether showing the payor's province's table would be
navigation (permitted, like the court classifier) or application (not). All
three of the section 0g cases currently refuse; nobody has argued whether that
is right or merely safe.

---

## 🟢 FS-3 · Two income figures

**Why it's here:** Schedule III items 3 and 3.1 give one person two Guidelines
incomes. A single field would have conflated them invisibly.

**Story**

> he pays me spousal support, 800 a month. the kids are in daycare and my
> daughter needs braces, thats about 4000 a year between them

**Turn-by-turn**

| Step | Expected |
|---|---|
| s. 7 disclosure opened | Second income field appears **with** the s. 7 list |
| Explanation | Items 3 and 3.1 quoted — why there are two figures |
| Both figures | Labelled by purpose, not by field name |
| Expenses | User's own amounts, untotalled, unapportioned |
| r. 13(1.3) | Does **not** fire. Financial statement required |

**Must never**
- Total the expenses
- Apportion them between the parties
- Say an expense is necessary, reasonable or extraordinary

---

## ✅ FS-4 · No income figure available

**Story**

> I have no idea what he makes. he works cash jobs and hasnt filed taxes in
> years as far as I know

> **CORRECTED 2026-09-14 after reading the code.** Three things in the original
> were wrong about the mechanism:
>
> - **"cannot-provide resolves"** — there is no cannot-provide control on this
>   screen. The user leaves the income field **blank**. `cannot-provide` is the
>   Small Claims depth-question mechanism (see SC-3), and it is not wired here.
> - **"carries the s. 21 checklist under RECORDED AS NOT HELD"** — s. 21 renders
>   under `INCOME DOCUMENTS`. `RECORDED AS NOT HELD` populates only from
>   `cannotProvide`, which this screen never sets, so that section does not
>   appear at all.
> - **"the s. 19 imputing provision is shown"** — s. 19 is in
>   `COURT_DETERMINES_INCOME`, which renders inside a collapsed `<details>` on
>   the *income question*, not beside the no-figure outcome. A user who skips
>   the income question never opens it.

**Expected** — the first four are built and asserted in
`child-support-scenarios.spec.ts`

| Step | Expected |
|---|---|
| Income field | Left blank. No "I don't know" control exists, and none is needed for the draft to be produced |
| Build button | **Enabled.** Nothing is withheld |
| Draft | Produced, and says **"No figure recorded"** rather than leaving a blank |
| s. 21 | Rendered under `INCOME DOCUMENTS` — what the Guidelines require with the application, which is where a figure would come from |
| Dollar figures | **None.** This user entered none, so any would have originated in the software |

**THE DEFECT THIS SCENARIO EXISTS TO CATCH IS NOT A BLOCKED DRAFT. It is a
draft that presents as complete.**

`draft.placeholders` is `[]` for this user, so the "Still to fill in" panel —
which everywhere else on this site means *nothing is outstanding* — does not
render at all. "No figure recorded" sits in the body, one line among forty, in a
document they have just been told is assembled from what they recorded.

The person harmed is the one who reads carefully and believes the interface.
They take a draft to a court office or a lawyer with no signal that its central
figure is missing. A blocked draft would have been safer — which is the
uncomfortable part, because the decision that makes this path good (always
produce the draft, record absence rather than block) is what makes this
possible.

Recorded as `OUTSTANDING_ISSUES.md` section 0f with three options and a fourth
that is named and rejected. **The spec deliberately asserts nothing about the
placeholder panel**, because encoding today's behaviour would make fixing it
look like a regression.

**Must never**
- Block the draft
- Estimate, or suggest a figure
- Say income will be imputed — s. 19 is something a court *may* do, not a
  prediction about this case

---

## 🟢 FS-5 · Out of scope — variation

**Story**

> we have an order from 2021 for 600 a month but he got a better job and I think
> it should be more

**Expected:** recognized as a variation, said plainly, not walked through Form 8.
Records that an order exists.

---

## 🔧 FS-6 · Safety disclosure

**Why it's here:** `familySafetyResources` was unreachable until today. This is
the scenario where being wrong costs the most. **Review this one hardest.**

**Story**

> hes been threatening me since I left. last week he showed up at my work. I
> need child support but Im scared about him knowing where we live now

**Expected**
- Safety resources render — FCSW, FLIC, what each can and can't do
- Rendered on court path, **not** on an AI judgment about whether violence is present
- The intake does not require her to disclose her address to the other party
- The site does not assess danger, advise on a restraining order, or tell her what to do

**Must never**
- Make safety content conditional on a model reading her story
- Produce risk language of any kind
- Continue the support flow as if she hadn't said this

---

## 🔧 FS-7 · Married applicant

**Story:** same facts as FS-1, but the parties were married and one wants a
divorce.

**Expected:** triage records married. The Divorce Act path is recognized as out
of v1 scope and said so, rather than being run through the FLA path.

---

## 🚧 FS-8 · Triage dismissed, then returns

**Turn-by-turn**

| Step | Expected |
|---|---|
| Session 1 | User dismisses triage |
| Session 2 | Does **not** re-prompt. The dismissal never expires |
| User reopens it deliberately | Resumes at the next unanswered question |
| Unanswered fields | Read as not-asked, a real state — not as gaps |

---

## 🟢 FS-9 · A child turns 18 mid-case

**Story:** recorded in session 1 with children aged 17 and 12. Session 2, four
months later, the eldest has turned 18 and started college.

**Expected:** the age-of-majority branch under s. 3(2) is out of v1 scope. The
site recognizes the situation and says so rather than continuing as if nothing
changed.

---

# Part 3 — Cross-cutting

## 🔧 X-1 · Two matters, one account

Small Claims matter and a family matter in the same account. Neither leaks into
the other: no shared claim type, no shared elements, no draft mixing facts.

---

## 🚧 X-2 · Sensitive detail in a story

**Story** includes a child's full name and the school she attends.

**Expected:** recorded as the user wrote it, since it's their own information —
but the draft does not propagate a child's school into a document that gets
served on the other party unless the user chose to include it.

**Answered 2026-09-14: nothing flagged at input, reviewed at output.**

Flagging at input would be paternalistic — and worse, it would interrupt someone
mid-story to tell them their own child's name is sensitive, which they know. The
intake is a notebook. It takes what they write.

The draft is not a notebook. It is served on the other party, and that is a
different act with different consequences. So the review step before a document
goes out is the right place, and the framing is a question rather than a
warning: *this draft includes your daughter's school. It will be served on the
other party. Keep it, or take it out?* — the user decides, which is CLAUDE.md
section 4.

The distinction that settles it: **the site is not protecting the user from
their own information; it is telling them where that information is about to
go.** Nothing is removed automatically, nothing is judged sensitive by a model,
and the same review shows the whole draft rather than singling out fields an
algorithm found alarming.

Not built. This scenario currently specifies work.

---

## 🚧 X-3 · Full lifecycle, one matter, five sessions

The long one. Small Claims, unpaid services.

| Session | User does | Site must |
|---|---|---|
| 1 | Tells the story, answers three of five elements | Persist everything. Show what's outstanding |
| 2 (day 4) | Adds the invoice and the dates | Show prior answers as recorded, not re-ask |
| 3 (day 9) | Generates the draft | Draft carries every recorded fact, placeholders elsewhere |
| 4 (day 20) | Records the claim as filed and served | Stop offering to draft it. Stage derives from the event |
| 5 (day 45) | Records the defendant in default | r. 11 card appears. Next steps reflect default, not filing |

**Must never**
- Any session lose the prior one's work
- The stage contradict the recorded documents
- A next-step suggestion ignore what's already recorded

---

# What this document doesn't cover

Named honestly, so nobody reads the list as complete:

- **Load and concurrency.** Two sessions editing the same case.
- **Accessibility.** Screen reader, keyboard-only, and the reading level of
  every sourced quote. Statutory language is hard, and the audience is people
  without lawyers.
- **Mobile.** Most people in crisis are on a phone.
- **French.** Ontario family courts operate in both languages.
- **Anything involving a real person's case.** These stories are invented and
  should stay that way.
