# L1-personal-loan

**Testing:** Personal loan between individuals — never run end to end. Exercises the two authored loan depth questions, which have never fired, and checks the unshadowing fix (71adaa9) routes it here rather than to debt/services.

**Story as written:**

> My younger sister asked me for help in March when she was behind on her car payments. I moved her two thousand eight hundred dollars from my account to hers. She said she would give it back when her tax return came in. Her tax return came in April. She bought a holiday with it. Every time I raise it now she tells me I am being unfair and changes the subject.

## Claim type

- exact matchClaimType: (none)
- AI suggestion: sc-claim-personal-loan-between-individuals (Personal loan between individuals -- borrower hasn't repaid)
- confirmation outcome: **confirmed**
- **established: sc-claim-personal-loan-between-individuals via confirmed-suggestion**
- expected: sc-claim-personal-loan-between-individuals — MATCH

## Questions asked, in order (general intake)

1. _(opening story — no question)_
2. **[general intake]** `sc-orient-when-happened`
   - lead-in (model-authored): "Thank you for sharing that you're involved in a loan repayment dispute. I understand this can be a challenging situation. Can you tell me roughly when the situation that led to this claim happened?"
   - question shown: "Roughly when did the situation that led to this claim happen?"
   - answered: "About two months ago."
3. **[general intake]** `sc-orient-role`
   - lead-in (model-authored): "Thank you for sharing that information about your situation regarding the loan repayment. It sounds like this has been on your mind for a couple of months now. Can you tell me if you are the person or business bringing this claim, or the one responding to a claim?"
   - question shown: "Are you the person or business bringing this claim, or the one responding to a claim?"
   - answered: "Starting a claim (plaintiff)"
4. **[general intake]** `sc-orient-dispute-category`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like you've been dealing with this loan repayment issue for about two months now. Can you tell me more about the nature of the dispute?"
   - question shown: "What kind of dispute is this?"
   - answered: "Starting a Small Claims case"
5. **[general intake]** `sc-amount-claimed`
   - lead-in (model-authored): "Thank you for sharing that information about your situation regarding the loan repayment. It sounds like this has been on your mind for the past couple of months. To help us understand your case better, could you let me know the total dollar amount you are claiming?"
   - question shown: "What is the total dollar amount you are claiming?"
   - answered: "$2,800."
6. **[general intake]** `sc-claim-filed`
   - lead-in (model-authored): "Thank you for sharing the details about your situation regarding the loan repayment. It sounds like this has been on your mind for a couple of months now. To help us move forward, could you let me know if a Plaintiff's Claim (Form 7A) has already been filed with the court?"
   - question shown: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?"
   - answered: "No, I have not filed anything yet."
7. **[general intake]** `sc-evidence-available`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like you've been dealing with this loan repayment issue for about two months now, and I can see how important the amount of $2,800 is to you. To better understand your situation, could you tell me what evidence you have to support your claim?"
   - question shown: "What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?"
   - answered: "The bank transfer, and a text where she says she will give it back after her return."
8. **[general intake]** `sc-remedy-sought`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you have been waiting for a resolution regarding the loan repayment, and I can see how that might be frustrating. Let's talk about what outcome you are hoping to achieve."
   - question shown: "What outcome are you asking the court to order?"
   - answered: "I just want the money back."
9. **[general intake]** `sc-safety-check`
   - question shown: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?"
   - answered: "No safety concerns."

## Depth phase

- authored & asked: 1
- suppressed: 1
- unauthored (attestation only): 0
- noQuestionNeeded: 1 — amount-within-jurisdiction-personal-loan

### Suppressed, and on what term

- `amount-remains-unpaid-personal-loan` — fired on term **"payment"** in: "she was behind on her car payments."

### Depth questions asked

- **[depth]** `depth-loan-agreement` -> `loan-agreement-existed`
  - spec text: "What was said or written about repaying the money?"
  - shown: "What was said or written about repaying the money?"
  - slots defaulted: (none)
  - answered: "She said she would give it back when her tax return came in. It was over text."
  - -> state: **provided**

## Final element state map

- `provided` — loan-agreement-existed (via depth-answer)
- `provided` — amount-remains-unpaid-personal-loan (via user-story)
- `not-yet` — amount-within-jurisdiction-personal-loan

## Readiness gate

- remedy confirmed (simulated): sc-remedy-monetary-judgment
- **draftAvailable: false**
- outstanding: 1 of 3
- cannot-provide: 0
- blockers:
  - elements-not-yet: amount-within-jurisdiction-personal-loan

### Attestation, simulated ("I don't have this" on each outstanding element)

- amount-within-jurisdiction-personal-loan -> cannot-provide

- **draftAvailable after attestation: true**
- outstanding: 0 | cannot-provide: 1

## Assertions about what the user said

_None found._

## Summary

- claim type: sc-claim-personal-loan-between-individuals via confirmed-suggestion
- turns: 9 | gate: OPEN after attestation | assertion hits: 0
