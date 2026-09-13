# L2-goods-damaged

**Testing:** Breach of contract for goods — ZERO authored depth questions. Tests the degrade-to-attestation path live: all elements should come back unauthored, and no bad question should be generated.

**Story as written:**

> I ordered a sofa from a furniture shop in the spring. When it turned up the frame was cracked on one side and the fabric was torn along the back. I rang them the same afternoon and sent photos. They said they would sort a replacement out. That was in May. Nothing has arrived and they have stopped taking my calls.

## Claim type

- exact matchClaimType: (none)
- AI suggestion: sc-claim-breach-of-contract-goods (Breach of contract — goods (wrong item, non-delivery, defective goods))
- confirmation outcome: **confirmed**
- **established: sc-claim-breach-of-contract-goods via confirmed-suggestion**
- expected: sc-claim-breach-of-contract-goods — MATCH

## Questions asked, in order (general intake)

1. _(opening story — no question)_
2. **[general intake]** `sc-orient-when-happened`
   - lead-in (model-authored): "Thank you for sharing that information about your situation. It sounds like you're navigating a challenging time. Can you tell me roughly when the situation that led to this claim happened?"
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
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. To help us understand your case better, could you let me know the total dollar amount you are claiming?"
   - question shown: "What is the total dollar amount you are claiming?"
   - answered: "$1,950, which is what I paid."
6. **[general intake]** `sc-claim-filed`
   - lead-in (model-authored): "It's been about two months since you paid $1,950 for the services in question. I understand this situation can be quite frustrating. Let's clarify whether a Plaintiff's Claim has been filed with the court."
   - question shown: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?"
   - answered: "No, I have not filed anything yet."
7. **[general intake]** `sc-contractor-completion-date`
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like you've been dealing with this situation for about two months now, and I can understand how that might be frustrating. Let's talk about the agreed completion date for the work and whether that date passed before the other party stopped responding."
   - question shown: "What was the agreed completion date for the work, and did that date pass before the other party stopped responding?"
   - answered: "Not applicable."
8. **[general intake]** `sc-contractor-notice-before-replacement`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to work or services that began about two months ago, and you’ve claimed an amount of $1,950, which is what you paid. I can understand how this might be frustrating. Let’s talk about what happened with the original contractor."
   - question shown: "Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?"
   - answered: "Not applicable."
9. **[general intake]** `sc-evidence-available`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you've been dealing with this for about two months now, and I can see how important the amount you paid is to you. Let's talk about what evidence you have to support your claim."
   - question shown: "What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?"
   - answered: "Photos I took the day it arrived, and the order confirmation."
10. **[general intake]** `sc-remedy-sought`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you have some important evidence, like photos and the order confirmation, to support your claim. Can you tell me what outcome you are asking the court to order?"
   - question shown: "What outcome are you asking the court to order?"
   - answered: "Either the sofa replaced or my money back."
11. **[general intake]** `sc-safety-check`
   - lead-in (model-authored): "Thank you for sharing the details about your situation regarding the sofa. It sounds like you’ve put a lot of thought into this, especially with the evidence you have. Let’s continue by discussing any concerns you might have about safety or the other party's behavior."
   - question shown: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?"
   - answered: "No safety concerns."

## Depth phase

- authored & asked: 0
- suppressed: 0
- unauthored (attestation only): 3 — goods-not-as-agreed, existed-agreement-goods, loss-amount-goods
- noQuestionNeeded: 0

### Suppressed, and on what term

_Nothing suppressed._

### Depth questions asked

_None._

## Final element state map

- `not-yet` — goods-not-as-agreed
- `not-yet` — existed-agreement-goods
- `not-yet` — loss-amount-goods

## Readiness gate

- remedy confirmed (simulated): sc-remedy-monetary-judgment
- **draftAvailable: false**
- outstanding: 3 of 3
- cannot-provide: 0
- blockers:
  - elements-not-yet: goods-not-as-agreed, existed-agreement-goods, loss-amount-goods

### Attestation, simulated ("I don't have this" on each outstanding element)

- goods-not-as-agreed -> cannot-provide
- existed-agreement-goods -> cannot-provide
- loss-amount-goods -> cannot-provide

- **draftAvailable after attestation: true**
- outstanding: 0 | cannot-provide: 3

## Assertions about what the user said

_None found._

## Summary

- claim type: sc-claim-breach-of-contract-goods via confirmed-suggestion
- turns: 11 | gate: OPEN after attestation | assertion hits: 0
