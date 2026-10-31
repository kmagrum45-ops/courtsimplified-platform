# The case core: design (founder decision, 31 Oct 2026)

One core, built once; Small Claims moves onto it first, then civil, then Family. Each court's old copies and readers are deleted as it moves. Evidence for every "today" statement: `docs/CODE_REPORT_31OCT.md` (read at #536's head, d9b4dda4). Nothing here is built yet.

## 1. Data model: one record per case

The record stays where it is, inside `cases.master_result.intakeCheckpoint.sections.caseFile` (JSON). **No table or column change, so no database migration.**

```
caseFile.facts[factId] = {
  value?,                                      // absent when unsure or removed
  state: "answered" | "unsure" | "removed",    // "not asked" = no entry
  source: "person" | "suggestion-accepted",
  at, seq,                                     // newest wins; seq breaks ties
  question?                                    // the question that was answered (for the "Answered: …" line)
}
caseFile.suggestions[factId] = { value, quote, from: "story" | "ai" | "classifier" }   // offered, never counted as answered
caseFile.turnedDown[factId] = [values]                                                  // "Not quite": never offered again
```

- **Facts:** every slot in `SLOT_FACTS`, plus the nine question facts the gate cannot hold today: evidence, story, service method, court file number, claim issued date, defence filed date, filed documents, situation, and claim served (code report §1.1). The step kinds of story dates (today's `dateInOwnSentence`, 14 entries) become facts keyed by sentence: `eventKind:<sentenceId>`.
- **State rules:**
  - The newest record wins on every screen, including a removal.
  - An answer given after "unsure" replaces the unsure record, so the record never holds both (fault 2).
  - "Unsure" is never asked again.
  - A suggestion is never a value until the person accepts it.

## 2. One writer, one reader, one asker

- **Writer: `give(fact, record)`**, exported, the only function that writes a fact.
  - In the browser it goes through `IntakeRecovery.put` into `sections.caseFile.facts`, then the existing save path `saveCheckpoint` (revision check). On a conflict it re-reads and re-applies only the facts this person changed, merged per fact.
  - On the server, routes that record a fact (position, drafts, form applicability) call `giveOnServer`, which merges only the `caseFile` section through `updateMasterResult`.
  - No other code writes facts. The old sections (`civil.input`, `family.*`, `small-claims.input`, `guided.*`, `builder.initialAnswers`, `position.claimKind` and others) are no longer written for a court once that court has moved.
- **Reader: `caseFileOf(record)`**, in the browser and on the server.
  - Every screen, route, form filler and AI context reads facts only through it: `readCaseRecord`, `storedIntakeValues`, `caseReview`, the dashboard card, `CaseHomeContext`'s title, and `generate-form` `getCaseValues`. `deepPick` over the whole row is banned.
  - The case title shown is built from `caseFileOf` when shown. The `title` column is kept, but no fact is read from it.
- **Asker: `nextQuestion(file, court, surface)`** in a new `questionEngine.ts`.
  - What it returns: the required facts for the court and the confirmed kind, minus answered, unsure and removed facts, in the court's order.
  - A small dependency table (claim kind → its elements; side → its forms; stage → its dates) reopens dependent questions when an answer changes. A change after Confirm also cancels the confirmation and says so.
  - Every surface asks only what it returns. Today `nextQuestion` and `askable` have no caller outside `caseFile.ts`, and the forms check nothing (code report F2).
  - The Small Claims guided route's own server selector (`orchestrateIntakeTurn.ts:467`) stops choosing questions. The server only proposes values.

## 3. Existing saved cases (no migration)

- A read-only `legacyFactsOf(master)` turns the old stores into fact records when there is no `caseFile.facts` entry for a fact. Today's `caseFileOf` order is kept for that fallback (code report §1.0).
- It is used only for reading. The first time a person answers or changes a fact, `give` writes that fact into `caseFile.facts`, and from then on the record wins.
- **No schema change, and no bulk rewrite of saved rows.** If a bulk clean-up of old keys is ever wanted, it is a separate step on staging first, under CASE_SIZE_PLAN step 4, and only with an explicit yes.

## 4. The browser tab: a buffer only

- `sessionStorage` holds only `pending: { factId: { value, at } }`, the unsent edits for that case. It never holds a whole checkpoint.
- On load, the saved record is shown. Pending edits, if any, are offered as "Not saved yet: save or discard", never applied silently (the experiment note in CASE_SIZE_PLAN).
- Guests (until guest removal) keep their record in the tab under the same shape.

## 5. One intake page and one results page

- **Intake page, per court:** one list of question cards in the engine's order. Each card shows one of four things:
  - the question;
  - "Answered: … You can change it here" (one shared `ChangeAnswer`);
  - "Not answered yet: add it when you know";
  - an offered suggestion ("Use the suggestion").
- **"Whole form" is a view mode of the same cards,** all shown at once, not a separate store.
- **The guided chat is a helper panel on the same page.** It asks the engine's next question in conversation, writes through `give`, and shows nothing the cards don't.
- **The review is the same list with the confirm tick.**
- **Results page:** the next step from the stage map, the overview, "Check my case file", the Form 7A section and the law, all reading `caseFileOf`. The case page shows the same pieces.

## 6. Reused unchanged

- The stage map, deadline engine and content library.
- Court forms and Form 7A drafting.
- Safety rules and crisis messages.
- Guidance, the checked-answer engine, and legal content.
- **The AI prompts' wording.** Each AI call's case context comes from `caseFileOf` through `aiCaseContext.ts`. Today only the analysis research and the claim-kind classifier do (code report §2.4). The rest are moved per court; their wording does not change. Any prompt whose legal content would change is reported to the founder first.

## 7. Files that change

- **Core, built once:**
  - `caseFile/caseFile.ts` (fact records, exported `give`, `legacyFactsOf`);
  - new `caseFile/questionEngine.ts`;
  - `caseFileOfMaster.ts`;
  - `IntakeRecovery.tsx` (the tab as a buffer; pending offered back);
  - `intakeCheckpoint.ts` (save and merge per fact);
  - `aiCaseContext.ts`;
  - `updateCaseRecord.ts` (`giveOnServer`);
  - new `IntakePage` and `ResultsPage` components, plus the existing `ChangeAnswer` and `UseSuggestion`.
- **Small Claims move:**
  - `GuidedSmallClaimsIntake.tsx` and `SmallClaimsIntake.tsx`, replaced by the Small Claims intake page configuration;
  - `orchestrateIntakeTurn.ts` (selector removed);
  - `IntakeReviewPanel.tsx`;
  - the Small Claims branches of `app/builder/page.tsx`;
  - `caseRecord.ts` (`storedIntakeValues`, `readCaseRecord`);
  - the Small Claims parts of `generate-form/route.ts`;
  - `dashboard/page.tsx:173`;
  - `CaseHomeContext.tsx`;
  - `app/cases/[id]/page.tsx`;
  - the Small Claims AI routes' context;
  - the event candidates.
- **Civil move:** `CivilIntake.tsx`, `GuidedFormChat.tsx` (the civil part), and the civil narrative that embeds names (`CivilIntake.tsx:243`), plus the same shared readers.
- **Family move:** `FamilyIntake.tsx`, `FamilyStatusTriage.tsx` (and the `familyStatus` copy), the narrative (`FamilyIntake.tsx:536`), and `GuidedFormChat.tsx`.

## 8. Checks that make it stay true

- `test:case-data-access` (code report Part 3) is built with the core.
  - It fails on any line that touches case data outside the core modules: tables, `master_result` paths, browser storage, checkpoint sections, `/api` calls, and AI calls without `aiCaseContext`.
  - It counts per line, with an allowed count per court that may only shrink.
  - Every miss found becomes a pattern plus a planted test case.
- `caseFileGuardAllowed.json` (603) shrinks with each court.
- **Done for a court:** its carry counts reach zero in two valid runs, its allowed entries are zero, and its old components are deleted.

## 9. Order

1. #536, and item C (no re-asking after "not sure").
2. The core plus `test:case-data-access`.
3. Small Claims.
4. Civil.
5. Family.

**Stop and report** if a court does not reach zero in two valid carry runs.
