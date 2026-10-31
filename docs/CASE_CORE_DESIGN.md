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
- **Facts the story gives but screens ask again** (the founder's Chrome test on preview `git-fi-47d01f` = #531 `c91ddc21`; all five still happen at d9b4dda4, code report Part 6). These become facts too:
  - Family: `parentingTime` (also covers "current living situation"), `otherParentResidence`, `otherParentIncome`. They are asked today by `ChildSupportIntake.tsx:297,343,364`, which leaves two always empty (`:169`, `:174`). `married` is a fact already, but only the triage writes it (`caseFile.ts:351`).
  - Small Claims: the remedy type, held as part of `wants`. Today it is a page-only choice that starts empty and is never saved (`StatementOfClaimSurface.tsx:108`), so the next step asks it after Confirm (`readinessGate.ts:182`).
  - `evidence`: the items the person has, and each element's state. Today anything with no recorded state counts as "Still to add" (`readinessGate.ts:193-205`), and the story's items reach only a display line (`storyFacts.ts:164`).
  - `timeline`: the dated case events. Today it is filled only by the long Family form (`FamilyIntake.tsx:316,408,422`).
- **The story offers them, never ticks them.** Each of these facts, plus `otherParty`, is offered from the story as a suggestion through "Use the suggestion". Today the review offers the story's words only in civil (`intakeReview.ts:172`).
- **The privacy rule doesn't block prefill.** It governs only what goes to the AI (`modelNameContext.ts`, `requestNames.ts`). Today the Form 7A party boxes ignore even a saved name: `StatementOfClaimSurface.tsx:110-115` starts them at `""`, and `form7ADraftFields` returns `otherParty: ""` (`caseFile.ts:662`). In the core they read `caseFileOf().otherParty`, or offer the story's name as a suggestion.
- **Every form, overview and next-step screen reads these through `caseFileOf` and asks through `nextQuestion`.** That covers the Family triage and the child-support builder (`childSupportPrefill.ts` is deleted), the Small Claims remedy chooser and evidence checklist, and the Form 7A party boxes.
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

## 10. Writer first: one writer before any court's readers move (evaluation)

**Phase 1 would route every save point through `give`, before any court moves:**
- the ~60 intake-state fields written through `recovery.put` (`IntakeRecovery.tsx:420`, `:646`);
- the 10 callers of `updateMasterResult` (`updateCaseRecord.ts:84`);
- the 3 direct `cases` writes: `builder/page.tsx:1099`, `api/cases/route.ts:346` (no caller found), `intakeCheckpoint.ts:120`;
- the browser-storage copies listed in code report §2.2.

Each save point keeps writing its old copy too, so that unconverted screens still work. But it also writes the fact record. Each old field is mapped to its fact id through one table built from `factsOfQuestion.ts`, never per screen.

**What Phase 1 alone fixes, and what it doesn't** (evidence: code report §1.1, §1.2):
- **Writers alone fix almost no carry entries.** `caseFileOf` already applies the change record last (`caseFile.ts:417`, `:510-538`), so the gate and the review already see removals and changes. The entries come from **readers that bypass `caseFileOf`**:

  | Reader that bypasses `caseFileOf` | Where |
  |---|---|
  | The case title column, and the header built from it | `builder/page.tsx:1102`, `CaseHomeContext.tsx:66-68` |
  | The dashboard card | `dashboard/page.tsx:173,190` |
  | The form prefill | `storedIntakeValues`, `caseRecord.ts:196-226`, used at `builder/page.tsx:2156,2208` |
  | `generate-form`'s search of the whole row | `route.ts:445-470` |
  | The analysis narrative that embeds "Other party: X" | `CivilIntake.tsx:243`, `FamilyIntake.tsx:536` |

  The code report attributes the 42 "returned after removal" entries (all other party) to these readers. That attribution is unproven; capturing the page text each carry entry matched would settle it.
- **So Phase 1 should be the writers PLUS these shared, court-independent readers,** moved to `caseFileOf`. With both, the expected clears are the 42 removals plus the review and form-field re-offers that item C removes. Prediction to be measured: about 42 + some of the 84 "asked twice". Wrong if two valid carry runs after Phase 1 still show other-party removals on the case page, case file or dashboard.
- **It does not fix** the per-court question surfaces that ask without the gate: the three whole forms, and the Small Claims guided selector (code report F2). Those move with each court.

**What could break:**
- Rows grow, because of the double writes while old copies remain. That needs the size check in CASE_SIZE_PLAN.
- Large concurrent writes have failed before (57014). The writes are merged per section, so they stay small.
- A wrong field-to-fact mapping would write a fact under the wrong id. Guarded by the mapping table's own test.
- Code that reads the old copies is unaffected until it moves.

**Failing-first tests:**
1. A terminal check that every `recovery.put`, `updateMasterResult` caller and `cases` write produces a fact record. It scans the call sites against the mapping table, so a new unmapped writer fails it.
2. For each shared reader: remove the other party, then check the case page title, the case file, the dashboard, the form prefill and generated form values. Fails today, in all three courts.
3. The coexistence test in §11.

**Days (estimates):**
- Writers: 3–5.
- Shared readers: 2–3.
- Checks: 1.
- **Total about 6–9.** Wrong if the mapping table cannot cover a writer without per-screen code; the terminal check in test 1 would show that on day 1.

**Safer or faster than court by court?**
- **Safer:** yes. While old screens still write, a write that never reaches the fact record would lose to an old copy (§11). Phase 1 removes that risk for every court at once.
- **Faster to the first numbers:** probably. The 42 removal entries span all three courts and come from shared readers, so converting Small Claims first would leave civil's and Family's 54 other-party entries (all 42 removals among them) until their turn.
- **Recommendation:** Phase 1 (writers plus shared readers) first, then Small Claims, civil and Family as decided.
- **This changes the order the founder set, so it waits for the founder's yes.** Until then, the decided order stands.

## 11. Coexistence while old screens still write old copies

**The rule:** for any fact, once a fact record exists in `caseFile.facts`, every old copy of that fact is ignored by `caseFileOf` and by every converted reader, whatever is written there later. The legacy adapter (`legacyFactsOf`, §3) reads old copies only for a fact with no record, in today's order.

- A newer answer typed on an unconverted screen reaches the record only through `give`. That's why Phase 1 comes first: after it, every screen writes through `give` as well as its old copy.
- If a court moves before Phase 1, its unconverted screens' new answers would be ignored. That is a known risk, recorded here as the reason to do Phase 1 first.

**Failing-first test (all three courts):**
1. Remove the other party through the new path (the change control, which writes `give(removed)`).
2. From an unconverted screen (the civil or Family whole form, or the Small Claims form), rewrite the old copy with the old name, using the real save path.
3. Reload.
4. Check every screen: overview, case file, case page title, dashboard, review, form prefill, generated form values and the chat. The removal must win everywhere.

This fails today on the readers in §10's table. Wrong if the old name shows on any screen after step 4.

## 12. Sequence numbers come from the save, never from the browser; two tabs

**Ordering.** Each fact record's `seq` is assigned **on the server** when the save arrives. Today `saveCheckpoint` runs its compare-and-set update from the browser through the Supabase client (`intakeCheckpoint.ts:90`, `updateCaseRecord.ts:71-87`), so browser code would compute any number it writes. The core changes that:
- `give` in the browser sends only the fact and its new value to one server route, `POST /api/cases/facts`.
- That route checks the signed-in owner and case (the existing `getAuthenticatedOwnedCase`), re-reads the row, and assigns `seq` as the highest seq in the stored record + 1.
- It writes only if `updated_at` has not changed. If another save landed first, it retries from the new row.
- The browser never sends a `seq` or a time that is used for ordering. The `at` time is set by the server.

So the order is the order in which the server accepted the saves. This needs no migration: it is a new route over the same JSON. A database-side trigger would also work, but it is a migration, so it is only built with the founder's explicit yes.

Guests (until guest removal) have no saved row. Their tab keeps a local counter, which only orders their own edits.

**Two tabs with unsent edits to the same fact:**
- Each tab's buffer records, per fact, the `seq` it last saw.
- When a tab saves, each fact whose stored `seq` has moved past what that tab saw is a conflict **for that fact only**. Its other facts save normally.
- The conflicting edit is not applied. It stays in that tab's buffer and is shown as "Not saved yet: save or discard", with the newer saved value beside it.
- "Save" makes it the latest save, with the next `seq`, so it wins. "Discard" drops it.

The rule that results: per fact, the latest accepted save wins, and an edit made against an older view is never applied silently.

**Failing-first test:**
1. Open the same case in two tabs.
2. Change the amount in tab 1 and save.
3. Change it differently in tab 2 and save.
4. Check that tab 2 shows "Not saved yet" with tab 1's value beside it, and other facts saved from tab 2 are kept.
5. Press "Save" in tab 2, reload both tabs, and check tab 2's value shows on every screen.
