# L8-towing

**Testing:** Smallest claim type in the catalogue (2 elements). Tests the gate and the attestation path on a minimal element set, where an off-by-one in the gate would be most visible.

**Story as written:**

> I parked behind the plaza where I always park when I visit my mum and when I came back the car was gone. There was no sign up that I could see. I had to pay four hundred and sixty to get it released from the yard the next morning, plus a day of storage on top.

## Claim type

- exact matchClaimType: (none)
- AI suggestion: sc-claim-improper-unauthorized-towing (Improper or unauthorized towing)
- confirmation outcome: **confirmed**
- **established: sc-claim-improper-unauthorized-towing via confirmed-suggestion**
- expected: sc-claim-improper-unauthorized-towing — MATCH

## Questions asked, in order (general intake)

1. _(opening story — no question)_
2. **[general intake]** `sc-orient-when-happened`
   - lead-in (model-authored): "Thank you for sharing that information about your situation. It sounds like you're navigating a challenging time related to work or services. To better understand your case, could you tell me roughly when the situation that led to this claim happened?"
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
   - lead-in (model-authored): "Thank you for sharing that information. It sounds like this situation has been ongoing for about two months now. To help us move forward, could you let me know the total dollar amount you are claiming?"
   - question shown: "What is the total dollar amount you are claiming?"
   - answered: "$460 plus the storage, so about $540."
6. **[general intake]** `sc-claim-filed`
   - lead-in (model-authored): "It sounds like you're dealing with a situation related to work or services that began about two months ago, and you're looking to claim around $540. Let's take a moment to clarify the next steps in your process."
   - question shown: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?"
   - answered: "No, I have not filed anything yet."
7. **[general intake]** `sc-contractor-completion-date`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to work or services that began about two months ago, and you’re looking to claim around $540. Let’s explore the details a bit further."
   - question shown: "What was the agreed completion date for the work, and did that date pass before the other party stopped responding?"
   - answered: "Not applicable."
8. **[general intake]** `sc-contractor-notice-before-replacement`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to work or services that began about two months ago, and you’re looking to claim around $540. I understand this can be frustrating. Can you share if you spoke to the original contractor about the issue before considering hiring someone else?"
   - question shown: "Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?"
   - answered: "Not applicable."
9. **[general intake]** `sc-evidence-available`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to work or services that began about two months ago, and you’re looking to claim around $540. Let’s talk about what evidence you might have to support your claim."
   - question shown: "What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?"
   - answered: "The receipt from the tow yard and photos of where I parked."
10. **[general intake]** `sc-remedy-sought`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you have some important evidence, including a receipt and photos, to support your claim. Let's discuss what outcome you are hoping to achieve."
   - question shown: "What outcome are you asking the court to order?"
   - answered: "What it cost me to get the car back."
11. **[general intake]** `sc-safety-check`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you've been dealing with a challenging experience regarding your car and the costs involved. Let's make sure we have all the necessary information to move forward."
   - question shown: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?"
   - answered: "No safety concerns."

## Depth phase

- authored & asked: 0
- suppressed: 0
- unauthored (attestation only): 2 — towed-without-consent, no-rate-disclosure
- noQuestionNeeded: 0

### Suppressed, and on what term

_Nothing suppressed._

### Depth questions asked

_None._

## Final element state map

- `not-yet` — towed-without-consent
- `not-yet` — no-rate-disclosure

## Readiness gate

- remedy confirmed (simulated): sc-remedy-monetary-judgment
- **draftAvailable: false**
- outstanding: 2 of 2
- cannot-provide: 0
- blockers:
  - elements-not-yet: towed-without-consent, no-rate-disclosure

### Attestation, simulated ("I don't have this" on each outstanding element)

- towed-without-consent -> cannot-provide
- no-rate-disclosure -> cannot-provide

- **draftAvailable after attestation: true**
- outstanding: 0 | cannot-provide: 2

## Assertions about what the user said

_None found._

## Summary

- claim type: sc-claim-improper-unauthorized-towing via confirmed-suggestion
- turns: 11 | gate: OPEN after attestation | assertion hits: 0
