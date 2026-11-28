# The old Small Claims results page, block by block: KEEP, MERGE or DROP (for review)

**For:** Cowork Claude's review, before the new Small Claims results step is built behind `SC_FLOW_V2` (site owner,
27 Nov 2026, order of work step 3). Nothing here is built yet. Source: an inventory of main 65a3424a read from the code
(`app/builder/page.tsx` = P, `IntelligenceOverviewPanel.tsx` = IOP, `StageAnswerPanel.tsx` = SAP,
`StatementOfClaimSurface.tsx` = SOC); file and line references are to that commit. The inventory's file:line references
are NOT PROVEN line by line; they were read by a search agent and spot-checked.

## The rules this table applies

1. **Hidden by default.** A block shows only when its `appliesWhen` condition is met by the case record (the facts in
   `caseFile.ts`, and the item conditions in `applicability/` on `feat/catalogue-conditions`).
2. **Procedure only from the map** (CLAUDE.md s. 2a): stage map, `stageSequence.ts`, `nextStepPractical.ts`, the
   deadline engine. No other store of procedure is shown.
3. **Law chosen by rules, not AI research:** the law shown is the catalogue's own sourced items for the confirmed kind
   (elements, defendant considerations, procedural notes, defence concepts, jurisdiction routes), each shown only when
   its condition matches, each with its own source. The AI research blocks are dropped.
4. **One deadline line:** every deadline on the page becomes one line on the next-step card.
5. **One notice per screen:** one notice block, one wording.
6. **No duplicates:** each fact, rule, citation, element and evidence item is shown once.
7. **No wording changes:** every block shows library text as stored.

## The table

Side: P plaintiff, D defendant, B both.

| # | Old block (as seen) | Where (main 65a3424a) | Proposal | appliesWhen (against the record; hidden otherwise) | Side |
|---|---|---|---|---|---|
| 0a | Save status line | IntakeRecovery.tsx:678-691 | **KEEP** (the shared frame) | always, in the frame | B |
| 0b | Situation line, "Your story says … Which is right?" | IntakeRecovery.tsx:774-776 | **DROP** from results (the Understood step owns the side) | – | B |
| 1 | Legal information notice + "How AI is used here" | P:2029-2030 | **MERGE** into the ONE notice block (with 6o, 11c, the chat's copies, SAP:1008) | always, once per screen | B |
| 2 | "Open the whole form (all your answers)" | P:2147-2151 | **DROP** (the Review step is the one place for answers; a "Change your answers" link goes to it) | – | B |
| 3 | "Things that may have happened in your case" | EventCandidateSurface.tsx:345 | **DROP** from results (dates are asked once on the Questions step) | – | B |
| 4 | "Suggested for your case: X" Yes / No / I'm not sure | StageConfirmation.tsx:158-178 | **DROP** (the stage is confirmed once, on the Review step; the results read it) | – | B |
| 5 | "What happens next at your exact step" card | SAP:1845-2329 | **KEEP** as THE next-step card | `stage` answered and confirmed | B |
| 5b | "Suggested step … Yes / No / I'm not sure" | SAP:1871-1898 | **DROP** (duplicate of 4; Chrome I1k) | – | B |
| 5c | "Your next step": where you are, deadlines, passed-limit alert, papers-arrived note, folds | SAP:524-887 | **KEEP** the step; its deadlines become the **ONE deadline line** (row D below) | `stage` confirmed | B |
| 5d | Form, "What it costs", "Where and how to file", "Serving it", "The rule for this step" | NextStepPractical.tsx:89-299 | **KEEP** inside the card; the Form 7A rule (r. 7.01) is cited here once | `practicalFor(step)` returns it; each line only if the step has it | B |
| 5e | "This card doesn't list …" | SAP:838-859 | **KEEP, narrowed** (item F): only for an item that applies to this step and is missing; never one of a later step | the step's own list for that item is empty | B |
| 5f | "Sources: …" (first 4) | SAP:860-874 | **MERGE** with 5j's sources into ONE source list at the foot, each source once | any source shown | B |
| 5g | "What can happen next" | WhatComesNext.tsx:122-144 | **KEEP** inside the card | `stageSequence` has a next stage | B |
| 5h | "Work out your dates" | SAP:1974-2261 | **MERGE** into the deadline line as its "add the date" control | the deadline needs a date the record does not hold | B |
| 5i | "Your amount" | SAP:2263-2279 | **KEEP** | `amountNoteFor(record.amount)` returns a note | B |
| 5j | "The full answer for this step, with every rule and source" (folded) | SAP:930-1014 | **DROP** (repeats 5c and 5f; its sources go to the one list) | – | B |
| 5k | "Want a person to check this step with you?" | SAP:884, :697 | **KEEP** once | always, once | B |
| 6 | "Your case overview" heading | IOP:390-392 | **DROP** (the new step has its own frame) | – | B |
| 6a | Case snapshot (court, kind, parties, role, stage, when, amount, what you want, what you told us) | IOP:380-432 | **DROP** (the Review step is the one place; a "Change your answers" link) | – | B |
| 6b | "Issues to review" | IOP:434 | **DROP** (AI signals) | – | B |
| 6c | "Where your case is now: Claim already filed and served." | IOP:437 | **DROP** (duplicate of the card's "where you are") | – | B |
| 6d | "What to confirm next" | IOP:439 | **DROP** (the one asker owns questions: the Questions step) | – | B |
| 6e | "Documents already recorded" | IOP:441 | **DROP** from results (the case page shows them) | – | B |
| 6f | "Evidence and proof to organize" | IOP:444 | **MERGE** with 9e into ONE evidence checklist (row E) | kind confirmed; each item by its element's condition | B |
| 6g | "Your situation, answered" | IOP:447 | **DROP** (no Small Claims writer since 2026-10-14) | – | – |
| 6h | "Case strategy (beta)" | IOP:448-457 | **KEEP** behind its own switch, unchanged (CLAUDE.md s. 3 exception) | `STRATEGY` on (off on the live site) | B |
| 6i | "The law behind this" | IOP:459-463 | **DROP** (AI research); replaced by row L | – | B |
| 6j | "What we looked into" | IOP:464 | **DROP** (AI research); replaced by row L | – | B |
| 6k | "Points the court may need clarified" | IOP:469 | **MERGE** into row L (each element once; its evidence in row E) | kind confirmed; each element by its condition | B |
| 6l | "Defences that commonly come up" | IOP:470 | **MERGE** into row L as "What the other side may raise" | kind confirmed; each defence concept and consideration by its condition | B |
| 6m | "What rule 11 provides after a defendant is noted in default" | IOP:471-522 | **KEEP** | the record shows the defendant noted in default (document or stage) | B |
| 6n | "A rule that can affect where this kind of claim goes" | IOP:523-552 | **KEEP** (already rule-based) | its route's condition: the kind matches, or the amount is over $50,000 | B |
| 6o | Overview footer "CourtSimplified organizes your information …" | IOP:574 | **MERGE** into the one notice block | – | B |
| 7 | "Add your documents and photos" / "Add a court decision from CanLII" | EvidenceUploadCard.tsx:194, :242 | **KEEP** once, inside row E | kind confirmed | B |
| 8 | "Check my case file" | CaseReviewPanel.tsx:59 | **DROP** from results (AI-located findings; the case page keeps it) | – | B |
| 9 | "Preparing your Plaintiff's Claim (Form 7A)" | SOC:263-528 | **DROP** from results (the Forms step owns Form 7A) | – | P |
| 9a | Kind line + r. 7.01(1) rule text | SOC:270-286 | **DROP** (kind on Review; r. 7.01 cited once in 5d) | – | P |
| 9b | "What are you asking the court for?" | SOC:289-321 | **DROP** (asked once on the Questions step) | – | P |
| 9c | "Already in your case:" | SOC:324-333 | **MERGE** into row E (an item the record holds shows as held) | – | P |
| 9d | "From your story we found:" (Not right / Yes, that's right) | SOC:336-351 | **DROP** (Chrome I1j; the Understood step offers story facts once) | – | P |
| 9e | "N of M still to add" with "I have this" / "I don't have this" | SOC:354-428 | **MERGE** into row E | kind confirmed; each element by its condition | P |
| 9f | "Recorded as not held" | SOC:430-442 | **MERGE** into row E | – | P |
| 9g | "Names and addresses" + filled-form download | PartiesStep / FilledForm7A | **DROP** from results (Questions and Forms steps) | – | P |
| 9h | "Filling in the form" / "Assemble the draft" | SOC:447-526 | **DROP** from results (the Forms step, behind the drafting switch) | – | P |
| 10 | "The rule for this step" (database procedure rows) | ProcedureAuthorityDisplay.tsx:121 | **DROP** (CLAUDE.md s. 2a: one copy of procedure) | – | B |
| 11 | "What CourtSimplified can help with next" | P:2635-2734 | **MERGE** with 12 into ONE "What you can do next" list | – | B |
| 11a | "Your records show the document that starts this case has already been filed…" | P:2645-2651 | **DROP** (duplicate of the card) | – | B |
| 11b | "You are responding … a draft of your response is." | P:2668-2673 | **DROP** (duplicate of the card) | – | D |
| 11c | ScopePreviewNotice | P:2674-2678, SOC:492 | **MERGE** into the one notice block | – | B |
| 12 | Buttons: Create draft / Open your case page / Add documents / Check official forms | P:2679-2711 | **KEEP** in the one list; each button by its own switch | each action's existing switch | P / D / B |
| 13 | "Your response has a deadline… Work out your dates above" | P:2712-2723 | **MERGE** into the one deadline line | – | D |
| 14 | "This case is not saved to an account…" | P:2724-2733 | **DROP** (sign-in comes first; no guest cases) | – | B |
| 15 | "Ask follow-up questions" | P:2738-2739 | **KEEP** as one button in the list | the chat is available | B |
| 16 | The guided assistant chat (its own two notices, "Suggested next step", law under answers) | CourtAssistantChat.tsx | **KEEP** the chat; **DROP** its own notices (the one block) and its "Suggested next step" (the card owns the step) | opened by the button | B |

## The new results step, in order

| Row | Block | Made from | appliesWhen |
|---|---|---|---|
| A | The next-step card: the step, its form, fee, where and how to file, how to serve, what can come next | old 5, 5c, 5d, 5g, 5e (narrowed) | `stage` confirmed |
| D | ONE deadline line, inside the card | old 5c deadlines, the passed-limit alert, the papers-arrived note, 5h (as its "add the date" control), 5j's "Your deadline", 13, and the catalogue's notice/time-limit items (the 35 deadline lines on `feat/catalogue-conditions`) | the step has a deadline; a computed date when the record holds its count-from date, else the line with its "add the date" control |
| E | ONE evidence checklist: each element the person must show, with its evidence, "I have this" / "I don't have this", held items shown as held | old 6f, 9c, 9e, 9f, 7 | kind confirmed; each item by its element's condition |
| L | The law for this claim, chosen by rules: the elements' explanations, "What the other side may raise" (defence concepts and defendant considerations), the procedural notes, each with its own source | old 6k, 6l, and the catalogue fields no Small Claims screen shows today (`defendantConsiderations`, `proceduralNotes`) | kind confirmed; each item by its condition (hidden by default; a fact it waits on is asked once on the Questions step) |
| M | Amount note | old 5i | `amountNoteFor(record.amount)` |
| N | The jurisdiction rule and the rule 11 routes | old 6n, 6m | each route's own condition |
| S | Case strategy (beta) | old 6h | `STRATEGY` on |
| W | "What you can do next": drafts, case page, add documents, official forms, ask follow-up questions | old 11, 12, 15 | each action's own switch |
| F | ONE source list, each source once | old 5f, 5j | any source shown above |
| Z | ONE notice block | old 1, 6o, 11c, the chat's notices, SAP:1008 | always, once |

## Open points for the reviewer

1. **Row L shows catalogue text no Small Claims screen shows today:** `defendantConsiderations` (358 items) and
   `proceduralNotes` (496 items). Each is stored sourced text, shown only when its condition matches. Confirm this is
   wanted, since it is new on screen even though the wording is unchanged.
2. **Row D merges the catalogue's notice/time-limit items into the one deadline line.** Some of the 35 are not deadlines
   (for example "Who is suing: the original creditor, an agency, or a debt buyer"); the review of
   `catalogue-conditions-review.md` should cut those before the line uses them.
3. **Dropping 8 ("Check my case file") and 6e from results** leaves them on the case page only.
4. **The chat (16)** keeps its own law lookup (`/api/assistant/law`), which is AI research on the person's question, not
   the page's law. Say whether it stays.
