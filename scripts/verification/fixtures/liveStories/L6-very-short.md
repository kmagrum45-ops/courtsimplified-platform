# L6-very-short

**Testing:** One sentence. Worst case for turn-1-only classification (619a9e4): if a short opener cannot classify, nothing later rescues it, because the classifier no longer runs on answers.

**Story as written:**

> someone gave me a cheque for 900 and it bounced

## Claim type

- exact matchClaimType: (none)
- AI suggestion: sc-claim-dishonoured-nsf-cheque (Dishonoured (NSF) cheque)
- confirmation outcome: **confirmed**
- **established: sc-claim-dishonoured-nsf-cheque via confirmed-suggestion**
- expected: sc-claim-dishonoured-nsf-cheque — MATCH

## Questions asked, in order (general intake)

1. _(opening story — no question)_
2. **[general intake]** `sc-orient-when-happened`
   - lead-in (model-authored): "Thank you for sharing that you're involved in a payment dispute and that you haven't filed a claim yet. It sounds like you're navigating a challenging situation. Can you tell me roughly when the situation that led to this claim happened?"
   - question shown: "Roughly when did the situation that led to this claim happen?"
   - answered: "About two months ago."
3. **[general intake]** `sc-orient-role`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. Can you tell me if you are the person or business bringing this claim, or the one responding to a claim?"
   - question shown: "Are you the person or business bringing this claim, or the one responding to a claim?"
   - answered: "Starting a claim (plaintiff)"
4. **[general intake]** `sc-orient-dispute-category`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like you've been dealing with this payment issue for about two months now. Can you tell me more about the nature of the dispute?"
   - question shown: "What kind of dispute is this?"
   - answered: "Starting a Small Claims case"
5. **[general intake]** `sc-amount-claimed`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. To better understand your claim, could you let me know the total dollar amount you are claiming?"
   - question shown: "What is the total dollar amount you are claiming?"
   - answered: "$900."
6. **[general intake]** `sc-claim-filed`
   - lead-in (model-authored): "It sounds like you're dealing with a payment issue that arose about two months ago, and you're looking to claim $900. Let's explore the next steps in this process."
   - question shown: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?"
   - answered: "No, I have not filed anything yet."
7. **[general intake]** `sc-evidence-available`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like you've been dealing with this payment issue for about two months now, and I can understand how that might be frustrating. Can you tell me what evidence you have to support your claim?"
   - question shown: "What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?"
   - answered: "The cheque and the letter from my bank."
8. **[general intake]** `sc-remedy-sought`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you've been dealing with this for about two months now, and I can see how important the evidence you have is to your case. Let's talk about what outcome you are hoping to achieve."
   - question shown: "What outcome are you asking the court to order?"
   - answered: "The $900."
9. **[general intake]** `sc-safety-check`
   - lead-in (model-authored): "Thank you for sharing the details about your situation regarding the payment dispute. It sounds like you have some important evidence to support your claim. Before we move forward, I want to check if there's anything about your safety or the other party's behavior that we should be aware of."
   - question shown: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?"
   - answered: "No safety concerns."

## Depth phase

- authored & asked: 0
- suppressed: 0
- unauthored (attestation only): 3 — payment-made-by-cheque, cheque-returned-nsf, amount-unpaid-nsf
- noQuestionNeeded: 0

### Suppressed, and on what term

_Nothing suppressed._

### Depth questions asked

_None._

## Final element state map

- `not-yet` — payment-made-by-cheque
- `not-yet` — cheque-returned-nsf
- `not-yet` — amount-unpaid-nsf

## Readiness gate

- remedy confirmed (simulated): sc-remedy-monetary-judgment
- **draftAvailable: false**
- outstanding: 3 of 3
- cannot-provide: 0
- blockers:
  - elements-not-yet: payment-made-by-cheque, cheque-returned-nsf, amount-unpaid-nsf

### Attestation, simulated ("I don't have this" on each outstanding element)

- payment-made-by-cheque -> cannot-provide
- cheque-returned-nsf -> cannot-provide
- amount-unpaid-nsf -> cannot-provide

- **draftAvailable after attestation: true**
- outstanding: 0 | cannot-provide: 3

## Assertions about what the user said

_None found._

## Summary

- claim type: sc-claim-dishonoured-nsf-cheque via confirmed-suggestion
- turns: 9 | gate: OPEN after attestation | assertion hits: 0
