<!-- generated 2026-09-15T23:03:40.622Z -->
## L4-spans-two

_Spans two plausible claim types — contractor damage AND abandoning the job (breach of contract for services). Tests suggest-never-decide under genuine ambiguity: does confirmation present a choice, or railroad one reading?_

### The story as submitted

> I hired a man to put new flooring through the downstairs. He pulled up the old floor, scratched the hallway radiator badly getting it out, and then only laid about half the new boards before he stopped turning up. I have paid him most of it already. So I have got a half finished floor and a radiator that needs replacing.

### Which claim type matched

No exact match. The AI classifier suggested `sc-claim-contractor-damage` (Damage caused by a contractor's work),
which the user is asked to confirm or reject — it is a suggestion, never applied on its own.

Simulating the user confirming it: **confirmed**

**Established: `sc-claim-contractor-damage` — user confirmed the AI suggestion.**

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

**A4.** About $5,400 between finishing the floor and the radiator.

**Q5.** `sc-claim-filed`
> Has a Plaintiff's Claim (Form 7A) already been filed with the court?

**A5.** No, I have not filed anything yet.

**Q6.** `sc-contractor-completion-date`
> What was the agreed completion date for the work, and did that date pass before the other party stopped responding?

**A6.** He never finished — he stopped coming in June.

**Q7.** `sc-contractor-notice-before-replacement`
> Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?

**A7.** Not applicable.

**Q8.** `sc-evidence-available`
> What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?

**A8.** Photos of the floor and the radiator, and the payments I made to him.

**Q9.** `sc-remedy-sought`
> What outcome are you asking the court to order?

**A9.** What it costs me to finish the job and fix the radiator.

**Q10.** `sc-safety-check`
> Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?

**A10.** No safety concerns.

#### Phase 2 — depth questions (claim-type specific)

`Damage caused by a contractor's work` has 4 element(s). Of those:

- **4** have an authored question and were asked
- **0** have no authored question, so the site cannot ask — it falls back to letting the user attest
- **1** were already covered by what the user wrote (amount-within-jurisdiction-contractor)

**D1.** `depth-contractor-agreement` → element `existed-agreement-contractor`
> What was agreed with the floor fitter about the work?

**A.** We agreed a price for the whole downstairs. He wrote it on the back of a card.

Recorded as: **provided**

**D2.** `depth-contractor-damage` → element `work-caused-damage`
> What was damaged or left different from what was agreed?

**A.** The hallway radiator is gouged along the bottom, and half the floor is still bare.

Recorded as: **provided**

**D3.** `depth-contractor-loss` → element `loss-amount-contractor`
> What will it cost to put right, and where does that figure come from?

**A.** It is two quotes — one to finish the floor, one for the radiator.

Recorded as: **provided**

**D4.** `depth-contractor-loss` → element `loss-amount-contractor`
> How was the $5,400 worked out?

**A.** It is two quotes — one to finish the floor, one for the radiator.

Recorded as: **provided**

### Where the user stands before drafting

- Remedy confirmed: `sc-remedy-monetary-judgment`
- Elements outstanding: **0 of 3**
- Elements marked unanswerable: **0**
- **Draft available: true**

### The Statement of Claim draft

Party fields as the user filled them in.

```
DRAFT STATEMENT OF CLAIM -- PROPOSAL ONLY, NOT A FINAL DOCUMENT

This draft was assembled from the facts you provided during intake. It is a starting point for you to review, correct, and complete -- CourtSimplified has not verified these facts, has not decided whether this claim is appropriate to file, and this is not ready to file as written. Replace every bracketed placeholder, check every paragraph against what actually happened, and have the final version reviewed before it is used.

PARTIES
1. The Plaintiff is Martin Osei-Bonsu, of 812 Colborne Street, London, Ontario N6A 3Z9.
2. The Defendant is Raymond Teal, operating as Teal Flooring, of Unknown — he only ever gave me a mobile number.

NATURE OF THE CLAIM
3. This is a claim for damage caused by a contractor's work.

FACTS (in the Plaintiff's own words, as provided during intake)
4. About two months ago.
5. I hired a man to put new flooring through the downstairs.
6. He pulled up the old floor, scratched the hallway radiator badly getting it out, and then only laid about half the new boards before he stopped turning up.
7. I have paid him most of it already.
8. So I have got a half finished floor and a radiator that needs replacing.

AMOUNT CLAIMED
9. The Plaintiff claims About $5,400 between finishing the floor and the radiator. from the Defendant.
10. What it costs me to finish the job and fix the radiator.

RELIEF SOUGHT
(a) payment of About $5,400 between finishing the floor and the radiator.;
(b) interest and costs of this proceeding, as the court may allow.

This is a proposal for your review, not a final document. Confirm every fact above before using it.
```

### Outstanding — what the draft itself says is missing

_Nothing. Every particular the engine tracks was present._

**Amount as it reaches the document:** `About $5,400 between finishing the floor and the radiator.`

The engine copies this string verbatim — it does not parse a number out of it, so any hedge the user typed appears in the draft exactly as written.

