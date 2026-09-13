# L7-vacation-pay

**Testing:** Employment claim type — unexercised category, and no authored depth questions. Tests a pipeline built mostly on debt and contract against something structurally different.

**Story as written:**

> I left my job at the end of April after four years. I had holiday built up that I never took, about three weeks worth. My final pay came through with none of it in. I emailed the office twice and the second time they said it had all been dealt with, which it has not.

## Claim type

- exact matchClaimType: (none)
- AI suggestion: sc-claim-unpaid-overtime-vacation-pay (Unpaid overtime or vacation pay)
- confirmation outcome: **confirmed**
- **established: sc-claim-unpaid-overtime-vacation-pay via confirmed-suggestion**
- expected: sc-claim-unpaid-overtime-vacation-pay — MATCH

## Questions asked, in order (general intake)

1. _(opening story — no question)_
2. **[general intake]** `sc-orient-when-happened`
   - lead-in (model-authored): "Thank you for sharing that information with me. It sounds like you're navigating a situation related to work or services. To better understand your case, could you tell me roughly when the situation that led to this claim happened?"
   - question shown: "Roughly when did the situation that led to this claim happen?"
   - answered: "About two months ago."
3. **[general intake]** `sc-orient-role`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. Can you tell me if you are the person or business bringing this claim, or the one responding to a claim?"
   - question shown: "Are you the person or business bringing this claim, or the one responding to a claim?"
   - answered: "Starting a claim (plaintiff)"
4. **[general intake]** `sc-orient-dispute-category`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. Can you tell me more about the nature of the dispute?"
   - question shown: "What kind of dispute is this?"
   - answered: "Starting a Small Claims case"
5. **[general intake]** `sc-amount-claimed`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. To better understand your case, could you let me know the total dollar amount you are claiming?"
   - question shown: "What is the total dollar amount you are claiming?"
   - answered: "Roughly $3,100 for the holiday I did not take."
6. **[general intake]** `sc-claim-filed`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to a holiday that you weren’t able to take, and I can see how that might be frustrating. Let’s go ahead and clarify whether a Plaintiff's Claim has been filed with the court."
   - question shown: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?"
   - answered: "No, I have not filed anything yet."
7. **[general intake]** `sc-contractor-completion-date`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to a holiday that you didn’t take, and I can see how that might be frustrating. Let’s talk about the timeline a bit more."
   - question shown: "What was the agreed completion date for the work, and did that date pass before the other party stopped responding?"
   - answered: "Not applicable."
8. **[general intake]** `sc-contractor-notice-before-replacement`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to a holiday that you weren’t able to take, and I can see how that might be frustrating. Let’s talk about what happened with the original contractor."
   - question shown: "Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?"
   - answered: "Not applicable."
9. **[general intake]** `sc-evidence-available`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to a holiday that you weren’t able to take, and I can see how that would be frustrating. Let’s talk about what evidence you might have to support your claim."
   - question shown: "What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?"
   - answered: "My final payslip, my contract, and the emails to the office."
10. **[general intake]** `sc-remedy-sought`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to work or services that has been on your mind for about two months now. I can see how important the amount you’re claiming is to you, especially regarding the holiday you didn’t take. Let’s talk about what outcome you’re hoping to achieve."
   - question shown: "What outcome are you asking the court to order?"
   - answered: "The holiday pay I am owed."
11. **[general intake]** `sc-safety-check`
   - lead-in (model-authored): "Thank you for sharing the details about your situation regarding the holiday pay you believe you are owed. It sounds like this has been a frustrating experience for you. Let's continue by discussing any concerns you might have about safety or the other party's behavior."
   - question shown: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?"
   - answered: "No safety concerns."

## Depth phase

- authored & asked: 0
- suppressed: 0
- unauthored (attestation only): 3 — overtime-not-paid, vacation-pay-not-paid, amount-within-jurisdiction-wages
- noQuestionNeeded: 0

### Suppressed, and on what term

_Nothing suppressed._

### Depth questions asked

_None._

## Final element state map

- `not-yet` — overtime-not-paid
- `not-yet` — vacation-pay-not-paid
- `not-yet` — amount-within-jurisdiction-wages

## Readiness gate

- remedy confirmed (simulated): sc-remedy-monetary-judgment
- **draftAvailable: false**
- outstanding: 3 of 3
- cannot-provide: 0
- blockers:
  - elements-not-yet: overtime-not-paid, vacation-pay-not-paid, amount-within-jurisdiction-wages

### Attestation, simulated ("I don't have this" on each outstanding element)

- overtime-not-paid -> cannot-provide
- vacation-pay-not-paid -> cannot-provide
- amount-within-jurisdiction-wages -> cannot-provide

- **draftAvailable after attestation: true**
- outstanding: 0 | cannot-provide: 3

## Assertions about what the user said

_None found._

## Summary

- claim type: sc-claim-unpaid-overtime-vacation-pay via confirmed-suggestion
- turns: 11 | gate: OPEN after attestation | assertion hits: 0
