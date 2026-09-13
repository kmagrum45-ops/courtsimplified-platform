# L4-spans-two

**Testing:** Spans two plausible claim types — contractor damage AND abandoning the job (breach of contract for services). Tests suggest-never-decide under genuine ambiguity: does confirmation present a choice, or railroad one reading?

**Story as written:**

> I hired a man to put new flooring through the downstairs. He pulled up the old floor, scratched the hallway radiator badly getting it out, and then only laid about half the new boards before he stopped turning up. I have paid him most of it already. So I have got a half finished floor and a radiator that needs replacing.

## Claim type

- exact matchClaimType: (none)
- AI suggestion: sc-claim-contractor-damage (Damage caused by a contractor's work)
- confirmation outcome: **confirmed**
- **established: sc-claim-contractor-damage via confirmed-suggestion**

## Questions asked, in order (general intake)

1. _(opening story — no question)_
2. **[general intake]** `sc-orient-when-happened`
   - lead-in (model-authored): "Thank you for sharing that you're the plaintiff in a dispute related to work or services. I understand this can be a challenging situation. Can you tell me roughly when the situation that led to this claim happened?"
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
   - lead-in (model-authored): "It's been about two months since you started this process, and I understand that navigating these situations can be challenging. To help us move forward, could you share the total dollar amount you are claiming?"
   - question shown: "What is the total dollar amount you are claiming?"
   - answered: "About $5,400 between finishing the floor and the radiator."
6. **[general intake]** `sc-claim-filed`
   - lead-in (model-authored): "It's been about two months since you mentioned the work related to finishing the floor and the radiator, and you're looking to claim about $5,400 for that. I understand this situation can be quite frustrating. Let's talk about whether a Plaintiff's Claim has been filed with the court."
   - question shown: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?"
   - answered: "No, I have not filed anything yet."
7. **[general intake]** `sc-contractor-completion-date`
   - lead-in (model-authored): "It sounds like you’re dealing with a situation related to work that was supposed to be completed about two months ago, involving a claim of around $5,400 for finishing the floor and the radiator. Let’s talk about the timeline a bit more."
   - question shown: "What was the agreed completion date for the work, and did that date pass before the other party stopped responding?"
   - answered: "He never finished — he stopped coming in June."
8. **[general intake]** `sc-contractor-notice-before-replacement`
   - lead-in (model-authored): "It sounds like you've been dealing with some issues related to work done about two months ago, specifically concerning the floor and radiator, totaling around $5,400. I can understand how frustrating this situation must be for you. Let's talk about what happened with the original contractor."
   - question shown: "Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?"
   - answered: "Not applicable."
9. **[general intake]** `sc-evidence-available`
   - lead-in (model-authored): "It sounds like you have a situation related to work or services that began about two months ago, involving a claim of about $5,400 for finishing the floor and the radiator. Let’s talk about what evidence you might have to support your claim."
   - question shown: "What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?"
   - answered: "Photos of the floor and the radiator, and the payments I made to him."
10. **[general intake]** `sc-remedy-sought`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you've put a lot of effort into this matter, especially with the photos and payments you've documented. Let's talk about what outcome you are hoping to achieve."
   - question shown: "What outcome are you asking the court to order?"
   - answered: "What it costs me to finish the job and fix the radiator."
11. **[general intake]** `sc-safety-check`
   - lead-in (model-authored): "Thank you for sharing the details about your situation. It sounds like you've been working through some challenges related to the work that was done, and I appreciate your patience as we gather more information. Let's move on to the next part of our conversation."
   - question shown: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?"
   - answered: "No safety concerns."

## Depth phase

- authored & asked: 1
- suppressed: 2
- unauthored (attestation only): 0
- noQuestionNeeded: 1 — amount-within-jurisdiction-contractor

### Suppressed, and on what term

- `existed-agreement-contractor` — fired on term **"hired"** in: "I hired a man to put new flooring through the downstairs."
- `loss-amount-contractor` — fired on term **"paid"** in: "I have paid him most of it already."

### Depth questions asked

- **[depth]** `depth-contractor-damage` -> `work-caused-damage`
  - spec text: "What was damaged or left different from what was agreed?"
  - shown: "What was damaged or left different from what was agreed?"
  - slots defaulted: (none)
  - answered: "The hallway radiator is gouged along the bottom, and half the floor is still bare."
  - -> state: **provided**

## Final element state map

- `provided` — existed-agreement-contractor (via user-story)
- `provided` — work-caused-damage (via depth-answer)
- `provided` — loss-amount-contractor (via user-story)
- `not-yet` — amount-within-jurisdiction-contractor

## Readiness gate

- remedy confirmed (simulated): sc-remedy-monetary-judgment
- **draftAvailable: false**
- outstanding: 1 of 4
- cannot-provide: 0
- blockers:
  - elements-not-yet: amount-within-jurisdiction-contractor

### Attestation, simulated ("I don't have this" on each outstanding element)

- amount-within-jurisdiction-contractor -> cannot-provide

- **draftAvailable after attestation: true**
- outstanding: 0 | cannot-provide: 1

## Assertions about what the user said

_None found._

## Summary

- claim type: sc-claim-contractor-damage via confirmed-suggestion
- turns: 11 | gate: OPEN after attestation | assertion hits: 0
