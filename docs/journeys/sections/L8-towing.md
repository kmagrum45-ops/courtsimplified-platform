<!-- generated 2026-09-15T23:05:12.450Z -->
## L8-towing

_Smallest claim type in the catalogue (2 elements). Tests the gate and the attestation path on a minimal element set, where an off-by-one in the gate would be most visible._

### The story as submitted

> I parked behind the plaza where I always park when I visit my mum and when I came back the car was gone. There was no sign up that I could see. I had to pay four hundred and sixty to get it released from the yard the next morning, plus a day of storage on top.

### Which claim type matched

No exact match. The AI classifier suggested `sc-claim-improper-unauthorized-towing` (Improper or unauthorized towing),
which the user is asked to confirm or reject — it is a suggestion, never applied on its own.

Simulating the user confirming it: **confirmed**

**Established: `sc-claim-improper-unauthorized-towing` — user confirmed the AI suggestion.**
Expected `sc-claim-improper-unauthorized-towing` — match.

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

**A4.** $460 plus the storage, so about $540.

**Q5.** `sc-claim-filed`
> Has a Plaintiff's Claim (Form 7A) already been filed with the court?

**A5.** No, I have not filed anything yet.

**Q6.** `sc-contractor-completion-date`
> What was the agreed completion date for the work, and did that date pass before the other party stopped responding?

**A6.** Not applicable.

**Q7.** `sc-contractor-notice-before-replacement`
> Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?

**A7.** Not applicable.

**Q8.** `sc-evidence-available`
> What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?

**A8.** The receipt from the tow yard and photos of where I parked.

**Q9.** `sc-remedy-sought`
> What outcome are you asking the court to order?

**A9.** What it cost me to get the car back.

**Q10.** `sc-safety-check`
> Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?

**A10.** No safety concerns.

#### Phase 2 — depth questions (claim-type specific)

`Improper or unauthorized towing` has 2 element(s). Of those:

- **2** have an authored question and were asked
- **0** have no authored question, so the site cannot ask — it falls back to letting the user attest
- **0** were already covered by what the user wrote

**D1.** `depth-tow-where-parked` → element `towed-without-consent`
> Where was the vehicle parked when it was towed, and what were you told about why?

**A.** I am not certain about that.

Recorded as: **provided**

**D2.** `depth-tow-rate-disclosure` → element `no-rate-disclosure`
> Were you given anything in writing about the cost before or when you paid?

**A.** I am not certain about that.

Recorded as: **provided**

### Where the user stands before drafting

- Remedy confirmed: `sc-remedy-monetary-judgment`
- Elements outstanding: **0 of 2**
- Elements marked unanswerable: **0**
- **Draft available: true**

### The Statement of Claim draft

Party fields as the user filled them in.

```
DRAFT STATEMENT OF CLAIM -- PROPOSAL ONLY, NOT A FINAL DOCUMENT

This draft was assembled from the facts you provided during intake. It is a starting point for you to review, correct, and complete -- CourtSimplified has not verified these facts, has not decided whether this claim is appropriate to file, and this is not ready to file as written. Replace every bracketed placeholder, check every paragraph against what actually happened, and have the final version reviewed before it is used.

PARTIES
1. The Plaintiff is Gordon Achterberg, of 19 Rutherford Road South, Brampton, Ontario L6W 3J1.
2. The Defendant is Clearway Towing & Storage, of 3155 Steeles Avenue East, Brampton, Ontario L6T 4W5.

NATURE OF THE CLAIM
3. This is a claim for improper or unauthorized towing.

FACTS (in the Plaintiff's own words, as provided during intake)
4. About two months ago.
5. I parked behind the plaza where I always park when I visit my mum and when I came back the car was gone.
6. There was no sign up that I could see.
7. I had to pay four hundred and sixty to get it released from the yard the next morning, plus a day of storage on top.

AMOUNT CLAIMED
8. The Plaintiff claims $460 plus the storage, so about $540. from the Defendant.
9. What it cost me to get the car back.

RELIEF SOUGHT
(a) payment of $460 plus the storage, so about $540.;
(b) interest and costs of this proceeding, as the court may allow.

This is a proposal for your review, not a final document. Confirm every fact above before using it.
```

### Outstanding — what the draft itself says is missing

_Nothing. Every particular the engine tracks was present._

**Amount as it reaches the document:** `$460 plus the storage, so about $540.`

The engine copies this string verbatim — it does not parse a number out of it, so any hedge the user typed appears in the draft exactly as written.

