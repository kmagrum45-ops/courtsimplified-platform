<!-- generated 2026-09-15T23:01:28.005Z -->
## L1-personal-loan

_Personal loan between individuals — never run end to end. Exercises the two authored loan depth questions, which have never fired, and checks the unshadowing fix (71adaa9) routes it here rather than to debt/services._

### The story as submitted

> My younger sister asked me for help in March when she was behind on her car payments. I moved her two thousand eight hundred dollars from my account to hers. She said she would give it back when her tax return came in. Her tax return came in April. She bought a holiday with it. Every time I raise it now she tells me I am being unfair and changes the subject.

### Which claim type matched

Matched directly: `sc-claim-recovery-of-personal-property` (Recovery of personal property wrongfully held by another).
The user is shown this as a match, not asked to confirm it.

**Established: `sc-claim-recovery-of-personal-property` — exact match on the story text.**
Expected `sc-claim-personal-loan-between-individuals` — **DIFFERENT from expected.**

### Every question the site asked, in order

#### Phase 1 — general intake

**Opening.** No question — the user writes their story first.

**Q1.** `sc-orient-when-happened`
> Roughly when did the situation that led to this claim happen?

**A1.** About two months ago.

**Q2.** `sc-orient-role`
> Are you the person or business bringing this claim, or the one responding to a claim?

**A2.** Starting a claim (plaintiff)

**Q3.** `sc-orient-dispute-category`
> What kind of dispute is this?

**A3.** Starting a Small Claims case

**Q4.** `sc-amount-claimed`
> What is the total dollar amount you are claiming?

**A4.** $2,800.

**Q5.** `sc-claim-filed`
> Has a Plaintiff's Claim (Form 7A) already been filed with the court?

**A5.** No, I have not filed anything yet.

**Q6.** `sc-evidence-available`
> What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?

**A6.** The bank transfer, and a text where she says she will give it back after her return.

**Q7.** `sc-remedy-sought`
> What outcome are you asking the court to order?

**A7.** I just want the money back.

**Q8.** `sc-safety-check`
> Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?

**A8.** No safety concerns.

#### Phase 2 — depth questions (claim-type specific)

`Recovery of personal property wrongfully held by another` has 3 element(s). Of those:

- **2** have an authored question and were asked
- **0** have no authored question, so the site cannot ask — it falls back to letting the user attest
- **1** were already covered by what the user wrote (value-within-jurisdiction-property)

**D1.** `depth-property-ownership` → element `plaintiff-owns-or-has-right-to-property`
> What are the items, and how did you come to have them?

**A.** I am not certain about that.

Recorded as: **provided**

**D2.** `depth-property-possession` → element `defendant-possesses-and-wont-return`
> How did they come to have the items, and what have you asked them?

**A.** I am not certain about that.

Recorded as: **provided**

### Where the user stands before drafting

- Remedy confirmed: `sc-remedy-return-of-property`
- Elements outstanding: **0 of 2**
- Elements marked unanswerable: **0**
- **Draft available: true**

### The Statement of Claim draft

Party fields as the user filled them in.

```
DRAFT STATEMENT OF CLAIM -- PROPOSAL ONLY, NOT A FINAL DOCUMENT

This draft was assembled from the facts you provided during intake. It is a starting point for you to review, correct, and complete -- CourtSimplified has not verified these facts, has not decided whether this claim is appropriate to file, and this is not ready to file as written. Replace every bracketed placeholder, check every paragraph against what actually happened, and have the final version reviewed before it is used.

PARTIES
1. The Plaintiff is Deborah Whitfield, of 144 Sorauren Avenue, Unit 3, Toronto, Ontario M6R 2E4.
2. The Defendant is Kayleigh Whitfield, of 27 Fennimore Street, Toronto, Ontario M9N 1R8.

NATURE OF THE CLAIM
3. This is a claim for recovery of personal property wrongfully held by another.

FACTS (in the Plaintiff's own words, as provided during intake)
4. About two months ago.
5. My younger sister asked me for help in March when she was behind on her car payments.
6. I moved her two thousand eight hundred dollars from my account to hers.
7. She said she would give it back when her tax return came in.
8. Her tax return came in April.
9. She bought a holiday with it.
10. Every time I raise it now she tells me I am being unfair and changes the subject.

AMOUNT CLAIMED
11. The Plaintiff claims $2,800. from the Defendant.
12. I just want the money back.

RELIEF SOUGHT
(a) payment of $2,800.;
(b) interest and costs of this proceeding, as the court may allow.

This is a proposal for your review, not a final document. Confirm every fact above before using it.
```

### Outstanding — what the draft itself says is missing

_Nothing. Every particular the engine tracks was present._

**Amount as it reaches the document:** `$2,800.`

The engine copies this string verbatim — it does not parse a number out of it, so any hedge the user typed appears in the draft exactly as written.
