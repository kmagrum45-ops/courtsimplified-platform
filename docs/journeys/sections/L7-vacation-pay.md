<!-- generated 2026-09-15T23:04:39.352Z -->
## L7-vacation-pay

_Employment claim type — unexercised category, and no authored depth questions. Tests a pipeline built mostly on debt and contract against something structurally different._

### The story as submitted

> I left my job at the end of April after four years. I had holiday built up that I never took, about three weeks worth. My final pay came through with none of it in. I emailed the office twice and the second time they said it had all been dealt with, which it has not.

### Which claim type matched

No exact match. The AI classifier suggested `sc-claim-unpaid-overtime-vacation-pay` (Unpaid overtime or vacation pay),
which the user is asked to confirm or reject — it is a suggestion, never applied on its own.

Simulating the user confirming it: **confirmed**

**Established: `sc-claim-unpaid-overtime-vacation-pay` — user confirmed the AI suggestion.**
Expected `sc-claim-unpaid-overtime-vacation-pay` — match.

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

**A4.** Roughly $3,100 for the holiday I did not take.

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

**A8.** My final payslip, my contract, and the emails to the office.

**Q9.** `sc-remedy-sought`
> What outcome are you asking the court to order?

**A9.** The holiday pay I am owed.

**Q10.** `sc-safety-check`
> Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?

**A10.** No safety concerns.

#### Phase 2 — depth questions (claim-type specific)

`Unpaid overtime or vacation pay` has 3 element(s). Of those:

- **2** have an authored question and were asked
- **0** have no authored question, so the site cannot ask — it falls back to letting the user attest
- **1** were already covered by what the user wrote (amount-within-jurisdiction-wages)

**D1.** `depth-wages-overtime` → element `overtime-not-paid`
> What hours did you work beyond your normal hours, and what were you paid for them?

**A.** I am not certain about that.

Recorded as: **provided**

**D2.** `depth-wages-vacation` → element `vacation-pay-not-paid`
> What vacation did you take or build up, and what vacation pay did you receive?

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
1. The Plaintiff is Priya Ramnarine, of 55 Eglinton Avenue West, Apt 1102, Mississauga, Ontario L5R 3E3.
2. The Defendant is Harlow Fabrication Ltd., of 2400 Meadowpine Boulevard, Mississauga, Ontario L5N 6S2.

NATURE OF THE CLAIM
3. This is a claim for unpaid overtime or vacation pay.

FACTS (in the Plaintiff's own words, as provided during intake)
4. About two months ago.
5. I left my job at the end of April after four years.
6. I had holiday built up that I never took, about three weeks worth.
7. My final pay came through with none of it in.
8. I emailed the office twice and the second time they said it had all been dealt with, which it has not.

AMOUNT CLAIMED
9. The Plaintiff claims Roughly $3,100 for the holiday I did not take. from the Defendant.
10. The holiday pay I am owed.

RELIEF SOUGHT
(a) payment of Roughly $3,100 for the holiday I did not take.;
(b) interest and costs of this proceeding, as the court may allow.

This is a proposal for your review, not a final document. Confirm every fact above before using it.
```

### Outstanding — what the draft itself says is missing

_Nothing. Every particular the engine tracks was present._

**Amount as it reaches the document:** `Roughly $3,100 for the holiday I did not take.`

The engine copies this string verbatim — it does not parse a number out of it, so any hedge the user typed appears in the draft exactly as written.

