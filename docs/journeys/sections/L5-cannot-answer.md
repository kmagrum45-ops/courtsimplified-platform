<!-- generated 2026-09-15T23:04:07.029Z -->
## L5-cannot-answer

_The user cannot answer almost anything. Property 4 end to end: every element should resolve to cannot-provide, and the readiness gate must still OPEN so a draft stays reachable. The most important story in the batch._

### The story as submitted

> my neighbours dog got out and bit my leg when i was walking past. i went to the walk in clinic after. i dont really know what to do about it

### Which claim type matched

Matched directly: `sc-claim-dog-bite-animal-injury` (Dog bite or attack (Dog Owners' Liability Act)).
The user is shown this as a match, not asked to confirm it.

**Established: `sc-claim-dog-bite-animal-injury` — exact match on the story text.**
Expected `sc-claim-dog-bite-animal-injury` — match.

### Every question the site asked, in order

#### Phase 1 — general intake

**Opening.** No question — the user writes their story first.

**Q1.** `sc-orient-when-happened`
> Roughly when did the situation that led to this claim happen?

**A1.** I am not sure exactly when.

**Q2.** `sc-orient-role`
> Are you the person or business bringing this claim, or the one responding to a claim?

**A2.** Starting a claim (plaintiff)

**Q3.** `sc-orient-dispute-category`
> What kind of dispute is this?

**A3.** Starting a Small Claims case

**Q4.** `sc-amount-claimed`
> What is the total dollar amount you are claiming?

**A4.** I don't know what it would come to.

**Q5.** `sc-claim-filed`
> Has a Plaintiff's Claim (Form 7A) already been filed with the court?

**A5.** No, I have not filed anything yet.

**Q6.** `sc-evidence-available`
> What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?

**A6.** I don't have anything really.

**Q7.** `sc-remedy-sought`
> What outcome are you asking the court to order?

**A7.** I don't know what I can even ask for.

**Q8.** `sc-safety-check`
> Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?

**A8.** No, nothing like that.

#### Phase 2 — depth questions (claim-type specific)

`Dog bite or attack (Dog Owners' Liability Act)` has 3 element(s). Of those:

- **3** have an authored question and were asked
- **0** have no authored question, so the site cannot ask — it falls back to letting the user attest
- **0** were already covered by what the user wrote

**D1.** `depth-dog-what-happened` → element `dog-caused-bite-or-attack`
> What happened, and where were you when it happened?

**A.** I don't know.

Recorded as: **cannot-provide** — the site read this as "I don't know" and recorded it as unanswerable rather than pressing

**D2.** `depth-dog-owner` → element `defendant-is-owner`
> What do you know about who the dog belongs to?

**A.** I don't know.

Recorded as: **cannot-provide** — the site read this as "I don't know" and recorded it as unanswerable rather than pressing

**D3.** `depth-dog-loss` → element `loss-amount-dog-bite`
> What did this cost you, and how did you work that out?

**A.** I don't know.

Recorded as: **cannot-provide** — the site read this as "I don't know" and recorded it as unanswerable rather than pressing

### Where the user stands before drafting

- Remedy confirmed: `sc-remedy-monetary-judgment`
- Elements outstanding: **0 of 3**
- Elements marked unanswerable: **3**
- **Draft available: true**

### The Statement of Claim draft

**The user left the party fields blank.** The engine does not infer a name from the story — it emits a bracketed placeholder, which is what appears below.

```
DRAFT STATEMENT OF CLAIM -- PROPOSAL ONLY, NOT A FINAL DOCUMENT

This draft was assembled from the facts you provided during intake. It is a starting point for you to review, correct, and complete -- CourtSimplified has not verified these facts, has not decided whether this claim is appropriate to file, and this is not ready to file as written. Replace every bracketed placeholder, check every paragraph against what actually happened, and have the final version reviewed before it is used.

PARTIES
1. The Plaintiff is [Plaintiff name to be confirmed], of [Plaintiff address to be confirmed].
2. The Defendant is [Defendant name to be confirmed], of [Defendant address to be confirmed].

NATURE OF THE CLAIM
3. This is a claim for dog bite or attack (dog owners' liability act).

FACTS (in the Plaintiff's own words, as provided during intake)
4. I am not sure exactly when.
5. my neighbours dog got out and bit my leg when i was walking past.
6. i went to the walk in clinic after.
7. i dont really know what to do about it

AMOUNT CLAIMED
8. The Plaintiff claims I don't know what it would come to. from the Defendant.
9. I don't know what I can even ask for.

RELIEF SOUGHT
(a) payment of I don't know what it would come to.;
(b) interest and costs of this proceeding, as the court may allow.

RECORDED AS NOT HELD:
You told us you do not have anything for the following. They are listed here so they are visible in the document, not left out of it. Nothing has been written in for them.
- The dog bit or attacked the person (or another domestic animal)
- The defendant is the dog's owner
- The amount claimed reflects the injury or damage

PARTICULARS STILL NEEDED BEFORE THIS COULD BE FILED:
- Plaintiff's full legal name
- Plaintiff's address for court forms
- Defendant's full legal name
- Defendant's address for service

This is a proposal for your review, not a final document. Confirm every fact above before using it.
```

### Outstanding — what the draft itself says is missing

- Plaintiff's full legal name
- Plaintiff's address for court forms
- Defendant's full legal name
- Defendant's address for service

Recorded as unanswerable, and named inside the document above rather than left off it:

- The dog bit or attacked the person (or another domestic animal)
- The defendant is the dog's owner
- The amount claimed reflects the injury or damage

**Amount as it reaches the document:** `I don't know what it would come to.`

The engine copies this string verbatim — it does not parse a number out of it, so any hedge the user typed appears in the draft exactly as written.

