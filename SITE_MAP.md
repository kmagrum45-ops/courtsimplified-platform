# Site map: how CourtSimplified works

For a developer who does not know the law. Read it top to bottom in about an hour. When this
map and the code disagree, the code is right: fix the map in the same pull request.

- The **written part** (everything above "Who reads what") explains the flow, the main
  modules and what each owns, every screen and where it gets each fact, and the places that
  do not use a shared piece yet ("Bypasses").
- The **generated part** ("Who reads what", at the end) lists, for each shared piece, what it
  reads and what reads it, built from the imports by `npm run docs:site-map`. CI fails
  (`npm run test:site-map`) when it is out of date.

Other maps go deeper on one area: `docs/ACCURACY_ENGINE.md` (the stage map, deadlines and
content pipeline in detail), `docs/VERIFICATION_SUITES.md` (every test suite),
`docs/SOURCING_NOTES.md` (how official sources are found). `docs/ARCHITECTURE.md` is from
August 2026 and older than the situation record and the case file.

## The whole flow in one page

1. **The person picks an area and types.** On the home page they choose Small Claims, civil
   or Family, give their city, and write what happened in their own words.
2. **They answer the situation questions.** Before anything else: are they starting a case,
   were they served with papers, or is a case already going; which papers and on what day;
   and, for a case already going, which step it is at. These answers are the **situation
   record** (`src/lib/case-system/situation/situation.ts`). They are the person's own answers
   and always win over anything read from the story.
3. **The story is read for suggestions.** Small readers (`app/builder/_components/storyAnswers.ts`,
   `src/lib/case-system/claimAmount.ts`, `src/lib/case-system/dates.ts`) find things the story
   already says, such as an amount, a date or the children, and offer each one with the words it
   came from. A suggestion is never an answer until the person accepts it. An AI reading of the
   story (`/api/case/understand`) adds a summary and a few questions; it never decides anything.
4. **Answers become the case file.** Every answer, wherever it was given (the situation
   questions, the area's form, the questions one at a time, the review), fills one slot in the
   **case file** (`src/lib/case-system/caseFile/caseFile.ts`). `nextQuestion` is the one rule
   for asking: a screen asks only what no slot holds yet, so nothing is asked twice.
5. **The person reviews and confirms.** The review panel shows what was given and what is
   still missing. Nothing goes further until the person confirms (CLAUDE.md s. 4).
6. **The stage map picks the procedure.** Fixed rules run first (some matters belong to a
   tribunal or a different court by law). Then the person's step, from their own answer or
   from the story, is looked up in the **stage map** (`src/lib/case-system/stage-map/`). The
   map, not the AI, says what the next step is, which form it uses, its deadline (the deadline
   engine counts it), and what comes after (CLAUDE.md s. 2a). A step the map lacks shows as
   "not covered yet".
7. **The results and the case page show it.** The next step, its form and deadline, the
   checked explanations from the published library, "What we have so far", and the chat.
   Every legal statement shown has passed the checked-answer engine against the saved official
   text (the **law library**, `docs/sources/`), or comes from a published, checked block.

The sections below follow the same order.

## Situation and case file

### The flow

1. **Home page.** `app/page.tsx:69` renders `HomeLocationGate` once `?path=` names an area (Small Claims, civil, Family). `app/_components/HomeLocationGate.tsx:107` wraps everything in `IntakeRecoveryBoundary`, so the intake store exists from the first screen.
2. **Situation questions come first.** `SituationGate` in `app/_components/IntakeRecovery.tsx:461` shows only `SituationQuestions` until the situation record is complete. The questions, one at a time: where are you (starting / served / case going), who started it, which papers (picked by a picture of the first page), the day you got them, has anything been filed, which court, for a case already going, which step it is at, and for someone served, whether anything has happened since ("Nothing else yet. I was just served", or a step such as a case conference). The next question is decided by `nextSituationQuestion` (`src/lib/case-system/situation/situation.ts:110`).
3. **The top line.** Once complete, `SituationLine` (`app/_components/SituationQuestions.tsx:214`) repeats the answers on every intake page with a Change link (`situationLine`, `situation.ts:222`).
4. **The story.** The person types their story and city on the home page. It is stored once, in `sections.story` (`src/lib/case-system/intakeStory.ts`). On Continue, the home page either writes the story into the same flow (`HomeLocationGate.tsx:229-235`) or, if the area changed, starts a new flow that carries the story and situation answers (`HomeLocationGate.tsx:236-246`). Then it routes to `/builder?path=...&intake=...`.
5. **Every write goes through one store.** `put()` in `IntakeRecovery.tsx:330` writes a field into the checkpoint. On the way it: runs the story-change rule if the story changed (`onStoryChange`, line 341), runs the side-change rule if the situation record changed (`onSideChange`, line 343), tags the answer with the current story version (`tagAnswers`, line 346), and sets the revisions through `applyFactRevisions` (`intakeReview.ts`, line 376): any fact change renews `factsRevision`, so next steps made before it are outdated (`guidanceIsCurrent`; the case page and Forms then offer "Update my next steps", `guidanceNeedsUpdate`); the review is re-opened only when `renewsInputRevision` says so: before Confirm, any material fact change; after Confirm, only an answer the person already had being changed or removed (`existingFactChanged`, the server's own rule), so one more answer after Confirm keeps it (Chrome re-test 29 Oct, D1).
6. **Checkpoint saved.** Guests keep it in `sessionStorage`; signed-in users get it written to `cases.master_result.intakeCheckpoint` (`src/lib/case-system/intakeCheckpoint.ts:84`, `saveCheckpoint`).
7. **Cross-check, never apply.** `SideCrossCheck` (`IntakeRecovery.tsx:532`) reads the side from the story and, if it disagrees with the person's answer, asks which is right. It never changes the record.
8. **Answers become the case file.** `caseFileOf` (`src/lib/case-system/caseFile/caseFile.ts:128`) reads every place an answer is kept and fills one slot per fact. Screens ask `nextQuestion` (`caseFile.ts:262`) which question to show, so nothing is asked twice.
9. **The review.** `IntakeReviewPanel` (`app/_components/IntakeReviewPanel.tsx`) shows `reviewEntries` (`src/lib/case-system/intakeReview.ts:53`) and the remaining questions (`remainingEssentialQuestions`, `intakeReview.ts:193`). The person confirms; the confirmation is recorded by `saveReviewTransition` (`intakeCheckpoint.ts:130`).

### Modules

**`app/_components/HomeLocationGate.tsx`** — the home page form.
- Owns: story box, city, the call to `/api/case/understand`, the court suggestion, hand-off to the builder.
- Reads: `useStory`, `useCaseLocation`, `useSituation` from `IntakeRecovery.tsx`; `sideOf`, `situationAnswers`, `filedFromSituation`, `withKnownCourt` from `situation.ts`; `writeIntakeSession`.
- Read by: `app/page.tsx` only.

**`app/_components/SituationQuestions.tsx`** — the situation question UI and the top line.
- Owns: one-question-at-a-time screens, the papers picture picker, the received-date box, the stage list, `SituationLine`, `openSituationChange`.
- Reads: `answerSituation`, `nextSituationQuestion`, `stageChoices`, `withKnownCourt`, `FIRST_PAGES` (`situation.ts`); `dateAnswerCheck`, `parseAnswerDate`, `formatForCourt` (`dates.ts`).
- Read by: `app/_components/IntakeRecovery.tsx`, `app/builder/_components/GuidedFormChat.tsx`.

**`src/lib/case-system/situation/situation.ts`** — the situation record (side, where, papers, served date, filed, court, stage).
- Owns: the record type, its cleaner `situationOf`, `sideOf`, `nextSituationQuestion`, `answerSituation` (clears answers that no longer apply), `situationLine`, `situationAnswers` (what each area's own questions would ask, so they are skipped), `stageFromSituation`, `stepFromSituation`, `broadStageOfStep`, `SERVED_DATE_QUESTION`, `sideContradiction`, `settledBySmallClaimsStep` (what a Small Claims step picked for a case already going settles, served or a Defence filed, read from the stage map's moves; a claim withdrawn, whose way in before service the rules held do not cover, settles nothing). `situationAnswers` also gives `roleWords`, the side in the start answer's words, and "No, nothing yet" settles that nothing was served.

**`src/lib/case-system/intakeStory.ts`** — the one copy of the story and location.
- Owns: `sections.story` (`storyOf`, `locationOf`, `storyOfMaster`), `migrateStory` (moves five legacy copies into one, on load), `guidedReadingOutdated`, `STORY_INPUT_KEYS`.

**`src/lib/case-system/intakeCheckpoint.ts`** — the checkpoint shape and its storage.
- Owns: `Checkpoint` and `IntakeSession` types, validation (`readCheckpoint`, 500 KB cap), session storage read/write, the Supabase load/create/save of the case row with a revision check (compare-and-swap), `saveReviewTransition`, `adoptStored`.
- Reads: `intakeReview.ts` (`inputRevision`, `reconcileReview`, `existingFactChanged`), `updateCaseRecord.ts`, `positionSave.ts`.
- Read by: `IntakeRecovery.tsx`, `HomeLocationGate.tsx`, `caseFile.ts`, `storyBasis.ts`, `sideChange.ts`, `guestCarry.ts`, `app/login/page.tsx`, `app/cases/[id]/page.tsx`, `app/api/cases/position/route.ts`.

**`app/_components/IntakeRecovery.tsx`** — the intake store (React context) and the situation gate.
- Owns: `IntakeRecoveryBoundary`, `put`/`read`, hooks (`useIntakeState`, `useStory`, `useSituation`, `useCaseLocation`, `useInputWithStory`), `SituationGate`, `SideCrossCheck`, "start the questions again" (`discardStaleAnswers`, line 265).
- Reads: `intakeCheckpoint.ts`, `storyBasis.ts`, `sideChange.ts`, `intakeStory.ts`, `situation.ts`, `intakeReview.ts`, `storyAnswers.ts` (role readers), `SituationQuestions.tsx`, `IntakeReviewPanel.tsx`.
- Read by (17 files): nearly every builder screen (`SmallClaimsIntake`, `CivilIntake`, `FamilyIntake`, `GuidedSmallClaimsIntake`, `GuidedFormChat`, `FamilyStatusTriage`, `StoryEditor`, `SourcedQuestions`), `HomeLocationGate`, `CaseUnderstandingCard`, `NextStepStatus`, `StoryChangedNotice`, `app/builder/page.tsx`.

**`src/lib/case-system/storyBasis.ts`** — the story-version rule.
- Owns: `sections.storyBasis` (answer key -> story version), `storyVersion` (a hash of the words), `tagAnswers`, `reaffirmAnswers`, `staleAnswerKeys`, `freshSections` (stale answers emptied for reading), `discardStale`, `onStoryChange` (a small edit keeps answers not drawn from changed sentences), `storyAnswersOutdated` (no next step while any answer is stale), `positionForStory`. The situation record is never tagged, so a story edit never resets it.

**`src/lib/case-system/sideChange.ts`** — when the side changes, the old side's answers are emptied.
- Owns: `SIDE_FACTS` (amount, filed, defenceFiled, wants, claimKind, outcome, claimServed), `onSideChange` (empties those answers in every area's form, guided answers, review answers, skips, the case file's unsure list, and untags them).

**`src/lib/case-system/caseFile/caseFile.ts`** — the case file: one slot per fact, and the one ask-once gate.
- Owns: `SLOT_FACTS` (19 facts, in display order), `conferenceKind` (which conference a conference date is for, from the question answered or the words; `:370`), slot states (not-asked / answered / unsure), `caseFileOf` (reads, in order: the saved position's step and claim kind, the situation record, each area's form, Small Claims guided answers, the review's answers and "I don't know yet", skips, the Family triage, the case file's own unsure list, the saved case's dates and answers; first answer wins), `alreadyAsked`, `nextQuestion`, `askable`, `withUnsure`, `withOfferedAtEnd`, `slotText`, `withCaseFileDates`.

**`src/lib/case-system/caseFile/factsOfQuestion.ts`** — which fact each question asks for.
- Owns: the `FACTS` map from question id (situation, civil/Family fields, Small Claims guided ids, step-page date ids, triage ids) to facts. An unlisted question is its own fact.

**`src/lib/case-system/caseFile/storyLines.ts`** — story lines for "What we have so far" (display only, never fills a slot).
- Owns: other party (with any badge numbers), where married, the claim against you, safety sentences, and the story's injury, damaged property, complaint, witness and lost pay (the first sentence that says each).

**`src/lib/case-system/caseFile/triageFromCaseFile.ts`** — skips the Family triage's "does this involve children" when another question already answered it.
- Reads: `caseFile.ts` (`alreadyAsked`), `family/statusTriage.ts` type.
- Read by: `app/builder/_components/FamilyStatusTriage.tsx`.

**`src/lib/case-system/intakeReview.ts`** — what the review shows, and review state.
- Owns: `reviewEntries` (situation answers shown first and marked `fromStart`), `remainingEssentialQuestions` (filtered through the case file gate), `smallClaimsInitialAnswers`, `panelAnswerFacts`, `materialInitialFacts` (what counts as a fact change), `existingFactChanged` and `renewsInputRevision` (the one rule for what cancels a confirmation, browser and server; `npm run test:confirmation-rule`), `applyFactRevisions`, `confirmedAnswerChanged` and `confirmedFactMarks` (after Confirm, an answer counts as changed only against the facts as confirmed, recorded by `transitionReview`; never against the last key press, so typing into an empty box keeps the confirmation; `saveCheckpoint` uses the same), `factsRevision`, `guidanceFactsRevision`, `guidanceNeedsUpdate` (next steps made before an answer added after Confirm: outdated, the confirmation kept), `inputRevision`, `reviewPhase`, `transitionReview`, `reconcileReview`, `guidanceIsCurrent`.

**`app/_components/IntakeReviewPanel.tsx`** — the review screen.
- Owns: listing entries, editing them, remaining questions with "I don't know yet", stale answers shown with their question, Confirm.
- Reads: `intakeReview.ts`, `caseFile.ts` (`caseFileOf`, `slotText`), `situation.ts`, `storyBasis.ts`, `dates.ts`, `guidedFields.ts`.
- Read by: `IntakeRecovery.tsx:450` only.

### Shared readers

- **`app/builder/_components/storyAnswers.ts`** — reads answers out of the story with the quote they came from (role, amount, goal, children in plain words, other party, served date, filed papers from the story's own filing words, court date, a civil or family case's kinds where the story names them). Suggestions only. Re-exports `sentences`. `amountFromStory` just calls `claimAmountFromStory` (line 169).
- **`src/lib/case-system/claimAmount.ts`** — the one reading of "the amount claimed" from the story (`claimAmountFromStory`, `moneyMentions`): an amount owed beats one paid, a fee or a price; unclear means nothing is offered.
- **`src/lib/case-system/dates.ts`** — the one date module: find, parse, check (`isRealIsoDate`), format the way a court writes it (`formatForCourt`), never invent precision, flag ambiguous numeric dates.
- **`src/lib/case-system/sentences.ts`** — the one sentence splitter (handles "Ltd.", "Dr.", "s. 24", "Oct. 6").
- **`src/lib/case-system/format/recordedAmount.ts`** — strict parse/format of a typed amount (`parseRecordedAmount`, `formatRecordedAmount`); anything not a plain number is shown as typed.
- **`src/lib/case-system/intake/claimKind.ts`** — the one rule for which "kind of claim" may be shown (`isKindOfClaim`, `claimKindShown`, `kindFromStory`, `LOAN_WORDS`): only `sc-claim-*` kinds, only with a source.
- **`src/lib/case-system/copy/rawKeys.ts`** — words for stored option codes (`optionWords`, `inWords`) and a detector for raw codes, field names and stage ids reaching the screen (`rawKeysIn`, used by `test:raw-keys`), and one for the reasoning profiles' internal wording (`internalWordingIn`, less the words a person is offered as answers).
- **`src/lib/case-system/canonicalJson.ts`** — one JSON text for one value: object keys sorted. Every comparison of a value read back from the database (jsonb reorders keys) with the page's copy uses it: initial facts (`intakeReview.ts`), story tags (`storyBasis.ts`), the store's "unchanged" check (`IntakeRecovery.tsx`), the family status (`app/builder/page.tsx`). Without it the first Confirm bounced (Chrome, 28 Oct).
- **`src/lib/content-library/leaveRuleWords.ts`** — the Small Claims leave rule (CJA s. 23 (1.1), (1.2); r. 14.01.1 (2), (3)) in its own words with its citation, in place of the published library's wording on screen (`StageAnswerPanel` `courtWords`); "A claim above it needs no such leave" removed.
- **`src/lib/case-workspace/fileFetch.ts`** — every download or open of a file: fetched by the page first, tried once more with a fresh link, a failure said on the page (the case's files, the exhibit book, the forms page).
- **`src/lib/case-system/copy/caseWords.ts`** — the stage (`stageInWords`), the side (`roleInWords`, the start answer's own words for a case already going) and a filed paper (`documentInWords`) as a screen shows them. The overview and the review read it; the guided box and the form routes take the start answer's words from `situationAnswers().roleWords`.
- **`src/lib/case-system/caseFile/storyFacts.ts`** — each fact the story gives, in plain words, with the sentence kept as its source: the other side, lost pay, injury, property, complaint, witness, evidence, last payment, written acknowledgment, what the other side says, the public body, losses, timeline; and `againstThemIn`, the sentences about the claim against someone responding, which is all their suggestions and "The claim against you" are read from. Read by `storyLines.ts` ("What we have so far") and the civil review's boxes (`BOX_FROM_STORY`).
- **`src/lib/case-system/intelligence/answeredQuestions.ts`** — which generic questions are answered already: by the papers recorded (`withoutAnsweredQuestions`), and by a known stage, a case already going included (`withoutStageAnswered`). The overview's "What to confirm next" reads both.
- **`src/lib/case-system/guided-assistant/answeredInStory.ts`** — whether the chat's question is answered by the story or by the case's own facts (`answeredFactsOf`).

### Bypasses

1. **Side renamed in the understand request.** `app/_components/HomeLocationGate.tsx:280` sends `side: "starting"` for the record's `"bringing"`. A second word for the same side, outside `sideOf`'s vocabulary. No comment explains the rename (unsure whether the API expects "starting").
2. **Story reads side for the cross-check.** `app/_components/IntakeRecovery.tsx:535` reads the side from the story (`familyRoleFromStory` / `civilRoleFromStory`). Deliberate: the comment at line 528 says the story is a cross-check, never the answer; only `sideContradiction` uses it.
3. **Court falls back to the area.** `src/lib/case-system/caseFile/caseFile.ts:145` fills the `court` slot from `checkpoint.courtPath` when the situation record has no court. The slot then claims source `situation:court` though the person never answered it.
4. **Saved step beats the situation stage.** `caseFile.ts:136` gives `stage` from `master.position.stepId` before the situation record. Deliberate (comment lines 133-134: a later correction on the step page must win).
5. **Papers kept as a title.** `caseFile.ts:154` stores the first page's title, not the paper id; an unknown id is stored raw. Readers of the slot cannot get back to `firstPageOf`.
6. **Side slot can hold the form's words.** `caseFile.ts:176` gives form fields to slots as stored. If the situation record has no side, `yourRole` ("plaintiff", "respondent", or Small Claims' "Defendant / responding party") fills the `side` slot instead of "bringing" / "responding". `app/cases/_components/CaseFilePanel.tsx:66` then tests `file.side.value === "responding"`, which fails for those words. Same at `caseFile.ts:198` (`guidedFacts.role`).
7. **Family served date from its own field.** `caseFile.ts:181` reads `sections.family.servedDate`, and `src/lib/case-system/intakeReview.ts:105-107` reads the served day out of the Family timeline text (`servedDateOf`) when the situation has none. Comment at `caseFile.ts:179` says Family keeps it there.
8. **Small Claims role from the form.** `intakeReview.ts:290` (`smallClaimsInitialAnswers`) takes `role` from the form's `yourRole`. `remainingBeforeCaseFile` then overrides it with the situation role (`intakeReview.ts:245`), `smallClaimsInitialAnswers` has one caller (`intakeReview.ts:240`), so the situation role wins.
9. **Hand-written role label.** `intakeReview.ts:65` writes the situation role into the Small Claims review as "Defendant / responding party" / "Plaintiff / claimant", a label typed here rather than taken from `rawKeys` or the form's options.
10. **Stored stage is a broad word.** `situationAnswers().caseStage` (`src/lib/case-system/situation/situation.ts:298`) stores the exact step as `broadStageOfStep` (`:168`; conference / motion / trial / enforcement / responding / already-started), and so does `stageFromAnswers.ts` (`stageOfCaseGoing`, `:225`). Every screen that says where the case is now shows the step's own title instead (`stageWords`, `situation.ts:288`; `caseStageWords`, `caseStep.ts:122`), but the stored word is still what the old engines and `getStageLabel` read (see "Screens and forms", Bypasses 1-2).
11. **Own slug humanizer in the review.** `app/_components/IntakeReviewPanel.tsx:34-37` turns any hyphenated value into words by replacing hyphens (`words()`), when no choice label exists, instead of `optionWords`/`inWords` from `rawKeys.ts`. A code with no label shows as "Parenting time"-style guesswork, not the form's own label.
12. **Own amount formatter.** `caseFile.ts:308` (`slotText`) formats a number with `toLocaleString` itself rather than `formatRecordedAmount`. Comment cites the #477 re-test ("$2,500.00"). Output matches today, but two formatters exist (unsure whether intentional).
13. **Review number box shows the raw value.** `IntakeReviewPanel.tsx:268` puts `String(entry.value)` in the textarea for a number, so an amount appears unformatted (e.g. "2500") while editing.

## Stage map and next steps

### The flow

The rule (CLAUDE.md s. 2a): the AI reads the story and picks a step id. Code owns the court rules that are fixed by law. The step, its form, its deadline, the fee, filing and service all come from the map. The AI never writes any of them.

1. **Court rules fixed by law run first.** `src/lib/case-system/intelligence/fixedRegimes.ts` has two of them. Construction liens go to the Superior Court (`detectsConstructionLien`, :130). An amount over $50,000 goes out of Small Claims (`SMALL_CLAIMS_MAXIMUM`, :180). `fixedRegimeFor` (:189) is applied in three places: the classifier result (`applyFixedRegime`, `intelligence/courtPathClassifier.ts:908`), the front-door reading (`withFixedRegime`, `understanding/understandCase.ts:328`) and `stage-map/resolveCasePosition.ts:199`. Tribunals that take the case away from the courts (LTB, HRTO, WSIAT and six more) are found by the classifier's keyword pass and the model pass. The redirect wording is in `intelligence/outOfScopeForums.ts`. Unsure: the tribunal rules are keyword lists inside the classifier, not a code rule that always wins like `fixedRegimes.ts`.
2. **The person says where they are (the situation record).** `src/lib/case-system/situation/situation.ts` asks before the story: starting, served, or a case already going. Then which papers, and the date they got them. For a case already going, the person picks one step from the map (`stageChoices` :131, `stepFromSituation` :149). These answers are kept apart from the story and are never asked again.
3. **The broad stage is confirmed.** The intake works out one of nine broad stages (`getStageForPersistence`, `app/builder/page.tsx:167`). `app/builder/_components/stageFromAnswers.ts` records the stage straight from the person's own answers when they leave no doubt: "starting, nothing filed", or "served, nothing filed back". Otherwise `app/builder/_components/StageConfirmation.tsx` shows the stage as a suggestion. The person confirms it or picks another. It is saved in `master_result.position` (`src/lib/case-system/casePosition.ts`, written by `app/api/cases/position/route.ts`).
4. **The exact step is chosen.** The step panel (`app/builder/_components/StageAnswerPanel.tsx:1395-1412`) uses this order: the step the person saved, then a pre-suit notice step, then the step the case reader found, then `stepFromPicture` (`intake/caseReader.ts:243`), then `suggestedStageFor` (`stage-map/suggestedStep.ts:80`). `suggestedStageFor` first looks for a procedural event named in the story (`stepNamedInStory` :26, e.g. "noted in default"), then maps the broad stage to a default step. Everything but the saved step is a suggestion, and the list stays open. Pages that cannot render the panel use the same order from `src/lib/case-system/caseStep.ts`.
5. **The step's content.** `app/api/case/stage-answer/route.ts` renders the published answer for the step through one door, `src/lib/content-library/stageAnswerView.ts`. If no answer is published, it shows the step's rules and deadlines from the map (`renderStageRulesOnly`). It also returns a "next step" summary built from the map's deadlines (:139).
6. **Practical details.** `src/lib/content-library/nextStepPractical.ts` (`STEP_PRACTICAL` :1348, `practicalFor` :2651) gives the form, fee, where to file and how to serve. Each line is a checked quote.
7. **Dates.** The person's dates (`dateQuestionsForStep`, `casePosition.ts:323`) go to `src/lib/content-library/computedDeadline.ts`. That file calls the deadline engine (`deadlines/deadlineEngine.ts`, `computeDeadline` :209), which counts the date and shows its working.
8. **What comes after.** `app/_components/WhatComesNext.tsx` (shown at `StageAnswerPanel.tsx:859`) reads `stage-map/stageSequence.ts` (`nextStepsFor` :597). Note: docs/ACCURACY_ENGINE.md says the sequence is "not yet shown in the step panel". That line is stale.
9. **Gaps.** A stage whose time has run out, where the map has no next stage, carries `whenTimeRunsOut.stage: null` (`stageMap.ts:228`). The panel then shows "not covered yet" (`StageAnswerPanel.tsx:442`). Missing law goes into `docs/law-map/` (draft JSON per area, checked by `npm run law-map:check`; README says nothing in it reaches a user).

### Modules

**`src/lib/case-system/intelligence/fixedRegimes.ts`** (218 lines)
- Owns: the construction-lien and over-$50,000 rules, each with a quoted provision, and `LIEN_STAGES` (:54).
- Reads: nothing of note (pure).
- Read by: `courtPathClassifier.ts`, `understanding/understandCase.ts`, `stage-map/resolveCasePosition.ts`.

**`src/lib/case-system/situation/situation.ts`**
- Owns: the situation record (where, started, papers, received date, filed, court, stage; for someone served, `JUST_SERVED` (:154) or the step since), `stepFromSituation`, `broadStageOfStep` (:168), `stageWords` (:288, the one wording of "Case stage"), `stageFromSituation` (:358).

**`app/builder/_components/stageFromAnswers.ts`** (229 lines)
- Owns: turning the person's own side and "what was filed" answers into a confirmed stage (`stageFromPersonAnswers` :84, `stageRecordedFromAnswers` :121). From the situation answers: the step picked (a case already going, or served with something since, `stageOfCaseGoing` :225), else starting-case or responding.
- Reads: `situation.ts`, `stageMap.ts`.
- Read by: `app/builder/page.tsx:1431`, `CivilIntake.tsx`, `FamilyIntake.tsx`, `app/cases/[id]/page.tsx`.

**`app/builder/_components/StageConfirmation.tsx`** (200 lines)
- Owns: the "From what you told us" stage question with nine broad options. The conference label is per court (`CONFERENCE_LABEL`).
- Reads: `builderTypes`.
- Read by: `app/builder/page.tsx:2530`, `app/cases/[id]/page.tsx`.

**`src/lib/case-system/casePosition.ts`** (820 lines)
- Owns: the saved position (`CasePosition` :53): confirmed stage, chosen step, date answers, service method. Validation (`readCasePosition` :160, `applyPositionPatch` :225), the date questions for a step (:323), and date hints from the story.

**`src/lib/case-system/stage-map/suggestedStep.ts`** (153 lines)
- Owns: `stepNamedInStory` (phrases that name a procedural event) and `suggestedStageFor` (broad stage to default step, per court).
- Reads: `stageMap.ts` types only.
- Read by: `caseStep.ts`, `StageAnswerPanel.tsx` (it also re-exports it, :153), `app/builder/page.tsx`.

**`src/lib/case-system/intake/caseReader.ts`** (317 lines; the model call is in `caseReaderModel.ts`)
- Owns: the case "picture" from the AI reading. It holds a fixed list of procedural events (`CASE_EVENTS` :43), each backed by a quote from the person. `stepFromPicture` maps events to a step through a code table. The reader never names a rule or a form. It runs only when `CASE_READER=on`.
- Reads: `stageMap.ts`, `casePosition.ts`, `dates.ts`.
- Read by: `caseStep.ts`, `app/api/case/read/route.ts`, `app/builder/page.tsx`, `StageAnswerPanel.tsx`, `app/cases/[id]/page.tsx`.

**`src/lib/case-system/caseStep.ts`** (128 lines)
- Owns: "the step a case is at" for pages that cannot render the panel (`caseStepFor` :81, `suggestedStepForCase` :58, `noticeStepForCase`); the step the person picked (`chosenStepFor` :103: the step page's, else the start answers' while it agrees with any stage confirmed since, `startStep` :113); and "where the case is" in words for every page that says it (`caseStageWords` :122).

**`src/lib/case-system/stage-map/stageMap.ts`** + `civilStages.ts` + `familyStages.ts` (2685 + 5424 + 5032 lines)
- Owns: every step (`CaseStage` :198): cues, `distinguishedFrom` boundaries, quoted rules, deadlines with their counting rule, `whenTimeRunsOut`, scope gates. Small Claims steps are in `CASE_STAGES` (:2623). Civil steps are in `CIVIL_STAGES` (`civilStages.ts:5424`, which includes the lien steps). Family steps are in `FAMILY_STAGES` (`familyStages.ts:5032`). `ALL_STAGES` is at :2644. Quotes live only in `stage-map/citations.ts`.

**`src/lib/case-system/stage-map/stageSequence.ts`** (614 lines)
- Owns: the moves from each step to the next (`STAGE_MOVES` :495) for all three courts, who makes each move, final steps with reasons (:498), starting points (:525), and `USUAL_NEXT` (:575).

**`src/lib/content-library/nextStepPractical.ts`** (2853 lines)
- Owns: for each step, its forms, fees, filing places, service rules, court offices, notice handling, and the "time has passed" lines (`STEP_PRACTICAL` :1348, `practicalFor` :2651). Every line is a quote checked by `test:next-step-practical`. A form must already be named in that step's rules, deadlines or published answer.

**Deadline engine: `src/lib/case-system/deadlines/`**
- Owns: date arithmetic (`deadlineEngine.ts` `computeDeadline` :209), the two holiday calendars (`holidays.ts`), the fixed sentences it may say (`deadlineTemplates.ts`), the events a deadline counts from and `caseDatesFrom` (`deadlineEvents.ts` :531), when service counts (`serviceEffectiveDate.ts`), and court service notices.

**`app/api/case/stage-answer/route.ts`** (192 lines)
- Owns: POST `{stageId, courtPath, confirmedFacts, dateAnswers}`. It returns the rendered published answer, or a rules-only answer, or "needs-a-fact", or "unavailable". It also returns `dateQuestions` and the `nextStep` deadline summary. No model is called. It is wrapped in `withConfirmedGuidance`.
- Reads: `stageAnswerView.ts`, `stageMap.ts`, `deadlineEvents.ts`, `computedDeadline.ts`, `casePosition.ts`, `nextStepPractical.ts`, `stageMessages.ts`.
- Read by (fetch): `StageAnswerPanel.tsx:1586`, `app/cases/[id]/forms/page.tsx:54`, `app/cases/[id]/case-file/page.tsx:98`.

**`app/builder/_components/StageAnswerPanel.tsx`** (2154 lines)
- Owns: the "Your next step" card and the "Where is your case?" step list. It chooses the step (:1395), asks the step's dates, saves the position (`positionSave.ts`), and shows the counted deadlines, the time-ran-out link, `NextStepPractical`, `WhatComesNext` and `GetHelp`.
- Reads: `stageMap.ts`, `casePosition.ts`, `serviceEffectiveDate.ts`, `deadlineEvents.ts`, `computedDeadline.ts`, `nextStepPractical.ts`, `caseReader.ts`, `suggestedStep.ts`, `citations.ts`.
- Read by: `app/builder/page.tsx`, `app/cases/[id]/page.tsx:272`, `app/cases/[id]/timeline/page.tsx`.

**Published library: `src/lib/content-library/published/stageAnswers.published.json`** (126 blocks plus a `release` record)
- Owns: the reviewed written answer per step id. It is pinned to one promoted pipeline run and a corpus date, with a content hash. A hand edit fails `verifyPublishedLibrary`. Changes go through `scripts/content/promoteContentRun.ts`.
- Read through: `publishedLibrary.ts` (`publishedBlockFor` :69). That is read by `stageAnswerView.ts` (the one render door: scope gate, confirmed-fact gate, output guard, date slots), `contentInventory.ts` and `chat/libraryChat.ts`. `stageAnswerView` is used by the stage-answer route, `app/api/case/resolve-stage/route.ts` and `chat/assembleChatAnswer.ts`.

**Forms for a step**
- The main source is `STEP_PRACTICAL[stepId].forms` in `nextStepPractical.ts`. Titles and links come from `content-library/forms/formGuide.ts`. They are shown by `NextStepPractical.tsx` in the panel and by `app/cases/[id]/forms/page.tsx` ("Forms for your next step").
- Fallback: `FormsNamedHere` reads form numbers out of the published answer text (`officialFormsNamedIn`). It is used when the practical entry has no forms (`StageAnswerPanel.tsx:821`), and under the full answer (:968).
- The forms page comment says the practical table wins because answer text also names forms for other cases.

**`src/lib/case-system/procedureOwnership.ts`** (70 lines)
- Owns: `isMapOwnedInstruction` and `isMapOwnedProcedure`. They detect model text that states a form, a filing or service instruction, or a period, so that text can be dropped.
- Read by: `groundedCognition.ts:612,637`, `understandCase.ts:214,303,478`, `retrieval/strategy.ts:98`, `case-workspace/courtDecision.ts`.

### Bypasses

1. **`app/cases/[id]/page.tsx:311` renders `NextStepsCard`** (`app/builder/_components/NextStepsCard.tsx`). It uses the older coarse blocks in `src/lib/content-library/nextSteps.ts` (`nextStepBlockFor` :378), keyed by broad stage, not by step. This bypasses the map. Probably does not reach a screen: it is the `else` branch of `courtPath === "small-claims" || "civil" || "family"` (:272), and `courtPath` is always one of those three. Unsure whether a bad stored value could reach it. `nextSteps.ts` is otherwise read only by `contentInventory.ts`.
2. **Stale comment in `StageConfirmation.tsx:23-25`.** It says the next steps after confirmation "come from ... nextSteps.ts". They now come from the stage map through `StageAnswerPanel`. Only the comment is wrong.
3. **`ProcedureAuthorityDisplay` at `app/builder/page.tsx:2646-2659`.** It posts the broad stage from `getStageForPersistence` (:167) to `app/api/rules/procedures/route.ts`. That route reads database rows from `legal_procedure_rules` (:62) and shows any verified guidance text and citation. This is a database store of procedure, keyed by a broad stage word that may come from the model (`analysis.intelligence.proceduralPosture.stage`). It shows before the stage is confirmed, for any court, unless the motion-to-change reading hides or folds it (`motionToChange.ts:382`). It reaches the builder results screen. Unsure how many verified rows production holds; with none, it shows "review-required" items.
4. **Civil "Required next forms" from the old engines.** `CivilIntake.tsx:350-354` builds `requiredNextForms` from `civilMasterCaseEngine` `formNeeds` and `civilFormRoutingEngine` `formRouting.requiredNow/recommendedNow` (fed by `civilWorkflowEngine.ts:1207`). `app/forms/FormsWorkspace.tsx:293` reads it, and `:1057` renders "Required next forms: Forms your case record points to." It reaches the forms tab and the `/forms` page whenever the first analysis named forms. Each item carries `UNLINKED_FORM_RECOMMENDATION_MESSAGE`. This bypasses `STEP_PRACTICAL`. The same object also feeds the "Recommended next documents" text in the stored civil `summary` (`CivilIntake.tsx:432`). Unsure where that summary is shown.
5. **Family form routing.** `familyFormRoutingEngine.ts` and `familyStrategyEngine.ts` `recommendedForms` (:217) are stored on the case as `familyFormRouting` (`orchestration/familyIntakeCanonicalAdapter.ts:213`). No page reading them was found, so they are probably stored only (unsure).
6. **`/legal-principles` page** (`app/legal-principles/page.tsx`). It renders 21-22 general procedural-stage cards from `src/lib/content-library/proceduralStages.ts`. This is a second written store of procedure, not tied to a person's case. It reaches a screen by URL. Unsure how it fits s. 2a "one copy".
7. **Broad stage words decide a default step.** In `suggestedStep.ts:101,119,143`, "conference" becomes `civil:both:pretrial-scheduled`, `family:both:case-conference-scheduled` or Small Claims `awaiting-settlement-conference`. Family "enforcement" always becomes `support-order-not-paid`. Family "urgent" becomes the motion step. These are suggestions the person can change (comment :88), but the step comes from a coarse word, not from the person's answer. `StageConfirmation.tsx` relabels "conference" per court for this reason (item 11, 2026-10-24).
8. **The step not from the person's own answer.** `caseStep.ts:81`: with no saved `position.stepId` and no step picked at the start, `caseStepFor` falls back to `suggestedStepForCase`. That uses the notice step, then the case-reader picture, then `suggestedStageFor` (from the broad stage and story phrases). The layout passes `requireConfirmedStage: true`, so a stage must be confirmed first, but the step itself is still a suggestion. Every case tab gets its step this way (`layout.tsx:193` feeds forms, case file and timeline), as do the organisation route and form-applicability suggestions.
9. **The model-resolved stage route.** `app/api/case/resolve-stage/route.ts` uses `resolveCasePosition` / `stage-map/resolveStage.ts`, a model choosing among Small Claims stages. No page fetch of it was found, so it is probably only used by the eval (unsure).
10. **Old stage defaults in the builder.** `getStageForPersistence` (`app/builder/page.tsx:167`) takes the model's `proceduralPosture.stage`, then the stored `caseStage`, then `analysis.caseStage`. Its comment says it stays on the nine-value taxonomy "until [resolveStage] is wired through the builder". This only feeds the suggestion shown in `StageConfirmation` (and bypass 3). It is not a step.
11. **Guarded, not bypasses.** Model text that states a step, form or period is filtered by `procedureOwnership.ts` in `understandCase.ts`, `groundedCognition.ts` and `strategy.ts`. The Small Claims engine no longer returns next steps of its own: it says they are on the case page (`smallClaimsIntelligenceEngine.ts:524-530`).

## Screens and forms

Every screen a person sees, and the shared piece each one reads a fact from. Paths are relative to the repo root. "Side" means whether the person is bringing the case or answering one. "Stage" means where the case is (a broad stage such as "responding", or an exact step from the stage map).

### Screens

**Home page and location gate.** `app/page.tsx` is the landing page with the three court cards (Small Claims, Civil, Family). Once `?path=` names a court, `app/_components/HomeLocationGate.tsx` (rendered at `app/page.tsx:69`) takes over the whole page: it asks for city, takes the person's story, calls the "understand" route and shows a suggested court. When it saves the case it writes the side from `sideOf` and the served date from `situationAnswers` (`HomeLocationGate.tsx:280`).

**"Here is what we understood" card.** `app/_components/CaseUnderstandingCard.tsx` (rendered at `HomeLocationGate.tsx:471`). Shows a summary, a list of label/value facts, and a "Where it stands" sentence (`CaseUnderstandingCard.tsx:86-107`). All three are written by the AI reading (`src/lib/case-system/understanding/understandCase.ts:63-73`, screened by `withoutLaw` at `:295`), not read from the shared pieces. Ends with "Continue with Small Claims / Civil / Family".

**Situation questions and situation line.** `app/_components/SituationQuestions.tsx` asks the short questions before the story (court, side, papers received, what has happened so far). The questions are mounted by `app/_components/IntakeRecovery.tsx:515`. Once answered, the sticky top line `SituationLine` (`SituationQuestions.tsx:214`, mounted at `IntakeRecovery.tsx:520`) prints `situationLine(situation)` with a "Change" link. `SideCrossCheck` (`IntakeRecovery.tsx:530-545`) warns when the story seems to say the other side; it reads the story with `civilRoleFromStory` / `familyRoleFromStory` (`app/builder/_components/storyAnswers.ts`) and compares with `sideContradiction` (situation.ts:384). It never changes the answer.

**The builder.** `app/builder/page.tsx` is the intake and results page for one court. It picks one of the intake forms, then shows the results (stage confirmation, step panel, overview). The side for the whole page is `respondingSide = userIsResponding(...)` (`app/builder/page.tsx:1623`), which calls `sideFromParts` (`src/lib/case-system/caseRecord.ts:89`): situation answer first, then confirmed stage, then intake role words.

**Family intake form.** `app/builder/_components/FamilyIntake.tsx`. A form plus a "one at a time" chat (`<GuidedFormChat>` at `FamilyIntake.tsx:952`). Reads the start answers with `situationAnswers("family", ...)` (`:299`). Shows a "Case stage" box (`:1002-1018`).

**Civil intake form.** `app/builder/_components/CivilIntake.tsx`. Same shape; `<GuidedFormChat>` at `:980`, `situationAnswers("civil", ...)` at `:537`, "Case stage" box at `:1001-1012`. Writes the amount into its facts text with `formatRecordedAmount` (`:245`, `:405`).

**Small Claims intake form.** `app/builder/_components/SmallClaimsIntake.tsx`. Form with amount field (`:1276-1281`), "Case stage" box (`:1141-1157`), `situationAnswers("small-claims", ...)` at `:652`, and the kind of claim from the story with `kindFromStory` (`:970`).

**Small Claims guided route.** `app/builder/_components/GuidedSmallClaimsIntake.tsx` (rendered at `app/builder/page.tsx:2306`). Server-driven questions one at a time; each turn's question comes from the server's `result.nextQuestion` (`:777-825`), which is NOT `caseFile.nextQuestion`. It skips questions the case file already holds via `alreadyAsked(caseFileOf(...))` (`:677`) and quotes the story for the kind of claim with `storyQuoteFor` (`:723`).

**Questions one at a time (Family / Civil).** `app/builder/_components/GuidedFormChat.tsx` with the field lists in `app/builder/_components/guidedFields.ts` (`familyGuidedFields` `:87`, `civilGuidedFields` `:193`). The next field is `pendingFields` (`guidedFields.ts:297`); fields already held are dropped with `caseFileOf` + `alreadyAsked` + `slotsOfQuestion` (`GuidedFormChat.tsx:190`). Story-filled answers come from `storyAnswers.ts` (amount: `amountFromStory` -> `claimAmountFromStory`, `storyAnswers.ts:169-170`, `guidedFields.ts:240`). Labels are each field's own `label` / option labels (`GuidedFormChat.tsx:116-141`, `:295`).

**Review panel.** `app/_components/IntakeReviewPanel.tsx`, mounted inside the situation gate at `IntakeRecovery.tsx:450`. Lists every answer for the person to confirm. Rows come from `reviewEntries` (`src/lib/case-system/intakeReview.ts:82`, label falls back to `FIELD_LABELS` at `intakeReview.ts:25`). A fact the case file holds is shown with `slotText(held, formatForCourt)` (`IntakeReviewPanel.tsx:256`). Ruled-out documents come from `situationAnswers(... situationOf(...))` (`:294`).

**Stage confirmation.** `app/builder/_components/StageConfirmation.tsx`, on the builder (`app/builder/page.tsx:2530`) and the case page (`app/cases/[id]/page.tsx:220`). "Suggested for your case: X" with accept/change, then "Stage recorded: X". For a case already going, X is the stage-map step's `userQuestion` (`findStage(... stepFromSituation(...))`, `app/builder/page.tsx:2535`); otherwise its own label list.

**Step panel (StageAnswerPanel).** `app/builder/_components/StageAnswerPanel.tsx` (builder `:2559`, case page `:274`). The exact step from the stage map, its deadlines from the person's dates, and the checked answer text. Step choices come from `stagesForPathway` / `findStage` (`:29`), the preselected step from `suggestedStageFor` (`src/lib/case-system/stage-map/suggestedStep.ts:80`) or `stepFromSituation`. Date questions from `dateQuestionsForStep` (`casePosition.ts`, imported `:8`). Every shown library sentence goes through `courtWords` (`:1250`, "lawsuit" -> "claim"/"action"), checked by `scripts/verification/verifyCourtTerms.ts`. Amount note via `amountNoteFor` (`:1539`) with the raw amount from `recordedAmountOf` (`src/lib/case-system/amountNotes.ts:95`).

**Case overview (IntelligenceOverviewPanel).** `app/builder/_components/IntelligenceOverviewPanel.tsx` (builder `:2617`, case page `:393`). "Your case overview" with a "Case snapshot" (`:364-372`): court, parties, your role, current stage, when, amount, what you want; plus the kind of claim (`claimKindShown`, `:183`) and its sourced content. The law box ("The law behind this") leads with the rules the research found, through `lawBehindThis` (`src/lib/case-system/retrieval/lawBehind.ts`, `:359`), and sits before "What we looked into". Both obey the research switch as it is now, even for research saved with a case: `app/builder/layout.tsx` and `app/cases/layout.tsx` (server layouts, read per request) read `RESEARCH_STEP` through `displaySwitchesFromEnv` (`src/lib/content-library/displaySwitches.ts`) and hand it to the panel through `app/_components/DisplaySwitches.tsx`; with it off the panel shows neither "What we looked into" nor the law-box lines built from it, and the saved research stays on the case (`test:research-display-switch`).

**Case page shell (layout).** `app/cases/[id]/layout.tsx`. Header with court label, title, the situation line (`:276-277`) or an older side sentence (`:254-259`), and "Last updated" (`:279`). Builds the shared `CaseHome` context (`:172-196`): `responding` via `userIsResponding` (`:177`) and the step via `caseStepFor` (`src/lib/case-system/caseStep.ts:80`, `layout.tsx:193`). Every tab reads these from `useCaseHome()` (`app/cases/_components/CaseHomeContext.tsx`). A gate screen at `:249` shows the situation line when the intake is not current.

**Case overview tab.** `app/cases/[id]/page.tsx`. Safety notice, "What we have so far" (`CaseFilePanel`, `:208`), stage confirmation, "What your records say" (`:251`), the step panel, the overview panel. Confirmed stage: saved position, else the situation answers (`stageRecordedFromAnswers`, `:128-129`).

**"What we have so far".** `app/cases/_components/CaseFilePanel.tsx`, fed `caseFileOf(checkpoint, master)` at `app/cases/[id]/page.tsx:209`. One row per slot (`LABEL` map `:18-37`); values by `shownValue` (`:47-62`) using `inWords`/`optionWords` (`src/lib/case-system/copy/rawKeys.ts:20-25`), `CLAIM_TYPES`, `findStage`, and finally `slotText(slot, formatForCourt)`.

**Case file tab (printable).** `app/cases/[id]/case-file/page.tsx`. "Where the case is" = `caseStageWords` (the step picked, by its title), else `getStageLabel(position.confirmedStage)`; "Exact step: `findStage(stepId).userQuestion`" only when that is another step (`:166-170`); deadlines; story with names; steps; documents; saved decisions; drafts. Dates by `formatDate` from `CaseHomeContext.tsx:77`.

**Timeline tab.** `app/cases/[id]/timeline/page.tsx` with `app/cases/_components/CaseTimeline.tsx`. Key dates from `recordedDateAnswers` (`caseRecord.ts`) and `allDateQuestions` (`casePosition.ts`), formatted by `formatLongDate` (`src/lib/case-system/deadlines/holidays.ts`, imported `timeline/page.tsx:10`). Stage line: the step's own title first (`findStage(stepId).title`, `timeline/page.tsx:101`), then the confirmed stage, and only last the events route's stage labelled by `getStageLabel` (`CaseTimeline.tsx:99-101`, `:302-308`). The key dates list reads `record.dates` (`timeline/page.tsx:38`); `recordedDateAnswers` only feeds the event suggestions.

**Forms tab.** `app/cases/[id]/forms/page.tsx`. The forms the current step names, from `practicalFor(stepId, court, city, responding, ...)` (`src/lib/content-library/nextStepPractical.ts`, `forms/page.tsx:36`), then the catalogue `app/forms/FormsWorkspace.tsx`, which prints its own situation line (`FormsWorkspace.tsx:826-827`).

**Drafts tab.** `app/cases/[id]/drafts/page.tsx`. Starting or responding document drafts, offered by `responding` and `respondingDocumentStillDue(stepId)` from the case home (`:64`, `:198-222`). Dates by `formatDate` (`:354`).

**Documents tab.** `app/cases/[id]/documents/page.tsx`. Evidence upload (`EvidenceUploadCard`) and `CaseWorkspace`. Shows no side, stage or kind; each document can show its own amount (`CaseWorkspace.tsx:792`, `document.amount`). Each card offers Open, Download and Delete (`FileActions`): open and download use a one-minute signed link to the person's own file in the private bucket (`app/api/workspace/documents/link/route.ts`); delete asks first and uses `DELETE /api/workspace/documents`. A card says the site has read a file only when it has (`src/lib/case-workspace/readStatus.ts`).

**Family status triage.** `app/builder/_components/FamilyStatusTriage.tsx` (in the Family builder). Asks whether they were married, whether there are children, and similar; skips what the case file holds (`triageFromCaseFile.ts`). Side from `sideOf` (`:144`). Quotes the story with `storyQuoteFor` from `src/lib/case-system/family/triageStoryQuote.ts`, a different function with the same name as the one in claimKind.ts (a naming trap).

**Statement of Claim surface.** `app/builder/_components/StatementOfClaimSurface.tsx` (builder `page.tsx:2631`, live while `FORM_COMPLETION_PAUSED` is false). Shows the matched claim type's name straight from `CLAIM_TYPES` (`:108`, `:211`) — see Bypasses.

**Event suggestions.** `EventCandidateSurface` in the builder (`app/builder/page.tsx:2490-2491`) and the timeline: dates the story or answers suggest, with the step title from `findStage(stepId).title` (shared).

**Child-support surfaces.** In the Family builder (`app/builder/page.tsx:2380-2402`). The role comes from `familyScope.role ?? savedExtra.yourRole`, combined with the shared `respondingSide`.

**Forms page.** `/forms` (`app/forms/FormsWorkspace.tsx`), also the bottom of the Forms tab. Has its own stage reader, `applicableStage` (`:1450`) — see Bypasses.

**Dashboard.** `app/dashboard/page.tsx`. A card per case: court, title, "Court stage: ..." from `caseStageWords`, else `getStageLabel(settledStage(position))` (`:84-94`), "Updated" with `formatDate` (`:123`).

**Error screens.** `app/error.tsx`, `app/builder/error.tsx`, `app/cases/error.tsx`, all rendering `app/_components/PageError.tsx` ("Something went wrong showing this page", error message and digest). No case facts.

**Working states (28 Oct).** `app/_components/Working.tsx` is the one way a control says it is doing slow work: `WorkingButton` shows its working label in plain words while its work runs and ignores a second press; `WorkingNote` is one status line inside a card whose controls are all held meanwhile. Used by the Small Claims guided intake (story, suggestions card, Send, Skip), the review panel ("Saving your review…"), the builder's results buttons while the case saves, the case page's file Open/Download/Delete, the event-candidate card, the Forms page, the evidence card, sign-in and Log out. `npm run test:working-states` fails when a button held by a work state sits in a card that says nothing about that work.

### Where each screen gets each fact

| Screen | Side | Stage | Claim kind | Amount | Dates | Labels/words |
|---|---|---|---|---|---|---|
| Home / location gate | `sideOf` (saved only, `HomeLocationGate.tsx:280`) | — | — | — | `situationAnswers().servedOn` (saved only) | own copy: page text |
| "What we understood" card | own copy: AI facts (`understandCase.ts:66`) | own copy: AI "Where it stands" (`understandCase.ts:73`) | own copy: AI facts | own copy: AI facts | own copy: AI facts | own copy: `COURT_LABEL`/`PATH_LABEL` (`CaseUnderstandingCard.tsx:20-28`) |
| Situation line / questions | `situationLine` -> `sideOf` | `situationLine` -> `stepFromSituation` + `findStage().userQuestion`; choices `stageChoices` | — | — | `formatForCourt` (dates.ts) inside `situationLine` | `situationLine` (`COURT_LINE`, `firstPageOf`) |
| Side cross-check | `sideContradiction` vs story readers (`storyAnswers.ts`) | — | — | — | — | own copy: `IntakeRecovery.tsx:536` |
| Family intake form | `situationAnswers().role` | `stageWords(situationAnswers())` (situation.ts); facts text `getStageLabel` (`:532`) | — | — | `formatForCourt` (dates.ts) | own copy: option text in the form |
| Civil intake form | `situationAnswers().role` | `stageWords(situationAnswers())` (situation.ts); facts text `getStageLabel` (`:239`, `:447`) | — | `formatRecordedAmount` (facts text, `:245`) | `dateAnswerCheck` (dates.ts) | own copy: option text in the form |
| Small Claims intake form | `situationAnswers().role` | `stageWords(situationAnswers())` (situation.ts) | `kindFromStory` (claimKind.ts) | raw input field (`:1279`); facts line later formatted by `formatRecordedAmount` in `smallClaimsIntelligenceEngine.ts:336` | `dateAnswerCheck`, `dateSpans` (dates.ts) | own copy: option text in the form |
| Small Claims guided route | server question bank | — | `storyQuoteFor` (claimKind.ts) | server field `amountClaimedText` (`:966`) | `dateAnswerCheck`, `isDateQuestionId` | server `voiceTurn`/question text |
| Questions one at a time (GuidedFormChat) | `caseFileOf` + `alreadyAsked`; story readers; a start answer shown in its own words (`startWords` from `situationAnswers().roleWords`) | — | — | `amountFromStory` -> `claimAmountFromStory` | `dateAnswerCheck`; `storyHintsForDates` (casePosition.ts) | own copy: field `label`/option labels in `guidedFields.ts` |
| Review panel | `caseFileOf` + `slotText` | `caseFileOf` + `slotText` (raw stage value if not held) | `slotText` / `reviewEntries` | `slotText` (own `$` format, see Bypasses) | `slotText(…, formatForCourt)` | `reviewEntries` (`FIELD_LABELS`); own copy: `words` / `SLUG` (`IntakeReviewPanel.tsx:34-37`) |
| Stage confirmation | `suggestionForSide(…, respondingSide)` (from `sideFromParts`) | step: `findStage(stepFromSituation)`; otherwise own copy: `STAGE_OPTIONS`/`CONFERENCE_LABEL` (`StageConfirmation.tsx:28-53`) | — | — | — | own copy: `StageConfirmation.tsx:28-53` |
| Step panel (StageAnswerPanel) | `responding` prop (`sideFromParts`) | stage map `findStage`/`stagesForPathway`, `suggestedStageFor`, `stepFromSituation` | `noticeStepId` from claim type id (builder) | `recordedAmountOf` (amountNotes.ts) -> `amountNoteFor` | `dateQuestionsForStep` (casePosition.ts), `isRealIsoDate` (dates.ts) | `courtWords` (`:1250`), `shortLabel` |
| Overview panel | `roleInWords` (caseWords.ts) with the `roleWords` prop (`situationAnswers().roleWords`) | the `stageWords` prop (`caseStageWords`, or the builder's picked step title); else `stageInWords` (caseWords.ts); "What to confirm next" through `withoutStageAnswered` (answeredQuestions.ts) | `claimKindShown` (claimKind.ts) | `formatRecordedAmount` (`:372`) of own field `textField(intake,"amountClaimed")` (`:144`) | own copy: raw timeline text (`:364`) | own copy: snapshot labels (`:366-374`) |
| Case page header (layout) | `situationLine`; else own copy sentence (`layout.tsx:254-259`) | `situationLine`; step `caseStepFor` (context) | — | — | `situationLine`; own copy: `formatDate` (`CaseHomeContext.tsx:77`) | `COURT_LABELS` (`CaseHomeContext`) |
| Case overview tab | `userIsResponding` (context), `sideOf(situationOfCase)` | `position.confirmedStage` / `stageRecordedFromAnswers`; `getStageLabel` for "What your records say" | via overview panel | `readCaseRecord().amount` (= `recordedAmountOf`, `page.tsx:302`) | `withCaseFileDates`, `unsureDateQuestions` (caseFile.ts); `formatDate` | via child components |
| "What we have so far" | `caseFileOf` (papers include the start answers'; a conference on the court date listed once, `courtDateIsConference`); story lines from `storyFacts.ts`; own copy: `SIDE` map (`CaseFilePanel.tsx:44`) | `findStage().title`; own copy: `BROAD` map (`:45`) | `CLAIM_TYPES` name, `optionWords` | `slotText` | `slotText(…, formatForCourt)` | `LABEL` (`:18-37`), `inWords`, `optionWords` |
| Case file tab | — (names only) | `caseStageWords`, else `getStageLabel`; `findStage(stepId).userQuestion` | — | — | own copy: `formatDate` | own copy: section titles |
| Timeline tab | — | `findStage(stepId).title`, then confirmed stage, then `getStageLabel` of events-route stage | — | — | `formatLongDate` (holidays.ts) of `record.dates` | `shortLabel` (StageAnswerPanel) |
| Forms tab | `responding` (context) | `stepId` (context, `caseStepFor`) | — | — | — | `practicalFor` (nextStepPractical.ts); `situationLine` in FormsWorkspace |
| Drafts tab | `responding` (context) | `stepId`, `position.confirmedStage` | — | — | own copy: `formatDate`, `toLocaleTimeString` (`:144`) | — |
| Documents tab | — | — | — | own copy: per-document `document.amount` (`CaseWorkspace.tsx:792`) | — | — |
| Dashboard | — | `caseStageWords` (caseStep.ts), else `getStageLabel(settledStage(...))` | — | — | own copy: `formatDate` | `COURT_LABELS` |
| Family status triage | `sideOf` (`:144`) | — | — | — | — | own copy: question text; `storyQuoteFor` (triageStoryQuote.ts) |
| Statement of Claim surface | — | — | own copy: `CLAIM_TYPES` name (`:108`, `:211`) | — | — | — |
| Event suggestions | — | `findStage(stepId).title` | — | — | `recordedDateAnswers` (caseRecord.ts) | — |
| Child-support surfaces | own copy: `familyScope.role ?? savedExtra.yourRole` with `respondingSide` (`page.tsx:2380-2402`) | — | — | — | — | — |
| Forms page (/forms) | `responding` | own copy: `applicableStage` (`FormsWorkspace.tsx:1450`) | — | — | — | `situationLine` |
| Error screens | — | — | — | — | — | own copy: `PageError.tsx` |

Unsure: `caseFile.nextQuestion` (`caseFile.ts:262`) has no screen caller found; it is reached only through `askable` (`caseFile.ts:273`), which no app or src file outside `caseFile.ts` calls. Screens use `alreadyAsked` instead.

### Bypasses

1. **`getStageLabel`: its own stage-word table.** `app/builder/_components/builderTypes.ts:249-262` ("Starting a new case", "Conference stage", "Stage unclear", ...). Used when no step was picked by the case file tab and dashboard (after `caseStageWords`), and by the timeline (`app/cases/_components/CaseTimeline.tsx:101`), case page "What your records say" (`app/cases/[id]/page.tsx:251`), and the intake facts text (`FamilyIntake.tsx:532`, `CivilIntake.tsx:239`, `:447`, `familyAnalysis.ts:49`). `CaseTimeline.tsx:20` says the label is "presentation" on purpose.
2. **Overview "Current stage" via `displayStage` when no step was picked.** `app/builder/_components/IntelligenceOverviewPanel.tsx:68` (`stage.replace(/-/g, " ")`), used at `:372` when the `stageWords` prop is empty. Shows raw ids ("responding", "already started", "not sure"). No comment explains it.
3. **`StageConfirmation` labels.** `app/builder/_components/StageConfirmation.tsx:28-53`: a third stage-word list ("I have not filed anything yet", ...) plus court-specific conference wording (comment `:43-46`, item 11, 2026-10-24). Used only when the step words are absent.
4. **"What we have so far" maps.** `app/cases/_components/CaseFilePanel.tsx:43-45`: own `COURT`, `SIDE` and `BROAD` (a fourth stage-word list: "Starting a case", "Served and responding"). `BROAD` is the fallback after `findStage` (`:55`).
5. **Overview "Your role".** `IntelligenceOverviewPanel.tsx:72-80`, `:134`: reads the intake's own `yourRole` field and its own `displayRole` wording, not `sideOf`/`sideFromParts`. Can disagree with the situation line if the intake field was not updated.
6. **Case header side sentence.** `app/cases/[id]/layout.tsx:252-259`: own wording, used only when there is no situation line ("the older side line only for a case saved before them", comment `:275`). The underlying side is shared (`sideFromParts`).
7. **Amount formatted in two places.** `src/lib/case-system/caseFile/caseFile.ts:308` (`slotText` writes `$2,500.00` with `toLocaleString`) versus `src/lib/case-system/format/recordedAmount.ts:118` (`formatRecordedAmount`). Comment `:307` cites the #477 re-test. And the raw amount has two readers: `recordedAmountOf` (`src/lib/case-system/amountNotes.ts:95`, used by `caseRecord.ts:153` and the step panel) versus the overview's `textField(intake, "amountClaimed")` (`IntelligenceOverviewPanel.tsx:144`).
8. **Dates formatted four ways.** The step panel has its own `formatIso` (`StageAnswerPanel.tsx:1299`, `toLocaleDateString`; used at `:1813`, `:1855`, `:1864-1865`, `:2044`, `:2063`) and also uses `formatLongDate` (`:397`, `:479`). Beside it: `formatForCourt` (`src/lib/case-system/dates.ts:330`) on the situation line, review panel and case file panel; `formatDate` (`app/cases/_components/CaseHomeContext.tsx:77`, `toLocaleDateString("en-CA")`) on the case header, case file tab, drafts and dashboard; `formatLongDate` (`src/lib/case-system/deadlines/holidays.ts`) on the timeline tab. The overview shows the timeline as raw text (`IntelligenceOverviewPanel.tsx:364`, comment: "Values are still the user's own words, shown as entered").
9. **Review panel's own slug-to-words.** `app/_components/IntakeReviewPanel.tsx:34-37` (`SLUG`, `words`, `shown`) turns `"moving-party"` into `"Moving party"` itself instead of `optionWords`/`inWords` (`src/lib/case-system/copy/rawKeys.ts:20-25`), which the case file panel uses. The case file panel itself still falls back to its own `replace(/-/g, " ")` (`CaseFilePanel.tsx:54`, `:55`) when no words are found. It also has `HIDDEN_ANSWER_NAMES` (`:24-31`) as a second label table beside `intakeReview.ts` `FIELD_LABELS`.
10. **"What we understood" card.** `app/_components/CaseUnderstandingCard.tsx:86-107`: side, dates, amounts and "Where it stands" are the AI reading's own label/value pairs (`understandCase.ts:63-73`), not the situation record, case file or stage map. This is by design (a restatement for the person to confirm, `understandCase.ts:20`). It is shown before the situation questions are finished, so there may be no shared value to use yet (unsure).
11. **Claim kind shown without the one rule.** "What we have so far" looks up `CLAIM_TYPES` directly and falls back to the raw value (`CaseFilePanel.tsx:56`); the Statement of Claim surface shows `CLAIM_TYPES.find(matchedClaimTypeId).name` (`StatementOfClaimSurface.tsx:108`, `:211`); the overview's "Issues to review" shows issues from engine signals (`IntelligenceOverviewPanel.tsx:147-152`, `:194-195`, `:429`); the Small Claims guided suggestion's name ("This sounds like it may be about: …") is the server's (`GuidedSmallClaimsIntake.tsx:1529`). None passes `claimKindShown` / `isKindOfClaim` (claimKind.ts).
12. **Side words.** `SmallClaimsIntake.tsx:652` writes its own role label ("Defendant / responding party" / "Plaintiff / claimant"), a second copy beside `intakeReview.ts:65`, and `:1261`, `:1291` switch wording on `input.yourRole`. The strategy panel still sends a side from `intake.extra.yourRole ?? intake.extra.role` (`IntelligenceOverviewPanel.tsx:448`), but for a saved case the route uses the case record's side instead (`app/api/case/strategy/route.ts`, `loadCase`); the panel's side is used only with no saved case, or a case that records no side. The chat renames the side "defendant"/"plaintiff" for every court (`CourtAssistantChat.tsx:939`).
13. **The forms page's own stage reader.** `applicableStage` (`app/forms/FormsWorkspace.tsx:1450`): `confirmedStage`, then `stageFromSituation`, then `masterResult.stage` / `proceduralStage` / `currentStage` (model output). It decides which form-matching text shows (`:1043`).
14. **Intake form labels.** Each intake form and `guidedFields.ts` has its own option and field labels (for example `CivilIntake.tsx:481`, `FamilyIntake.tsx:1012-1016`). The review panel reads them back through `entry.choices`, so they stay consistent there, but they are not `optionWords`.

## Law library and content pipeline

### The flow

The rule this area enforces (CLAUDE.md s. 2): the site never states law from memory. Law is
saved to disk from official sites. Anything shown to a person must match that saved text word
for word. What the model knows is allowed only as a draft, or as a "lead" that tells us what
to look up.

1. **Official text is saved to disk.** `scripts/rules/corpusSources.ts` is the allowlist of
   sources. It is built from `noticeSources.ts`, `holidaySources.ts`, `practicalSources.ts`,
   `familyLawSources.ts`, `claimTypeSources.ts`, `lawMapSources.ts`, `requestedSources.ts`
   and others in `scripts/rules/`. `npm run rules:fetch` (`scripts/rules/fetchCorpus.ts`)
   downloads each source into `docs/sources/corpus/<id>.txt`. It records the URL, the retrieval
   time, a sha256 hash and the "consolidation period" line in `docs/sources/corpus/manifest.json`
   (300 entries and 300 .txt files at time of writing). `docs/sources/corpus/superseded.json`
   lists texts that have been replaced.
2. **How a source gets in.** Ontario statutes come from the e-Laws `.doc` download, because the
   HTML pages are rendered by JavaScript. They are converted with antiword (`docs/SOURCING_NOTES.md`,
   "ontario.ca e-Laws pages are JS-rendered"). Court decisions, and pages that block robots
   (CanLII, lso.ca), are downloaded by hand into `docs/sources/`: PDFs such as
   `docs/sources/cooper-v-hobart-2001-SCC-79.pdf`, plus `docs/sources/decisions/`. Each is logged in
   `docs/sources/README.md`. Two GitHub workflows do the same job on demand:
   `.github/workflows/courtsimplified-vendor-sources.yml` and `courtsimplified-fetch-decisions.yml`.
   `scripts/rules/refusedCorpusPaths.ts` lists paths that must never become a source.
3. **Drift check.** `npm run rules:check` (`scripts/rules/checkCorpus.ts`) reports whether the
   live law has changed since it was saved. Run it BEFORE `rules:fetch`, never after: the fetch
   overwrites the saved copy, so a check run afterwards finds nothing (`docs/ACCURACY_ENGINE.md`,
   "Where the bodies are buried").
4. **Search index.** `npm run retrieval:index` (`scripts/retrieval/buildCorpusIndex.ts`, also run by
   `.github/workflows/courtsimplified-corpus-index.yml`) cuts the saved text into passages.
   `corpusChunker.ts` handles statutes and `decisionChunker.ts` handles judgments. It stores one
   vector per passage in `docs/sources/retrieval/corpus-index.json` + `corpus-vectors.bin`. The
   index holds only ids, hashes and vectors. When a search runs, the words are cut again from the
   `.txt` file and used only if the hash still matches
   (`src/lib/case-system/retrieval/corpusIndex.ts` header).
5. **Checked answer (runs on the live site).**
   (`src/lib/case-system/retrieval/checkedAnswer.ts`)
   - A model drafts an answer and names the Act and section behind each statement.
   - Code fetches those sections (`namedProvisions.ts`) plus search hits (`storyRetrieval.ts`).
   - A separate model call must quote the words that support each statement.
   - Code keeps a statement only if all of these hold: the quote really is in the passage
     (`intelligence/quoteMatch.ts`); every number is in the passage or in the person's own words;
     and the statement neither predicts nor grades the case.
   - Every other statement is listed as "could not confirm".
6. **Missing law becomes a source request.** When research says the library lacks a law,
   `retrieval/sourceRequests.ts` opens a GitHub "source-request" issue. The issue carries only the
   law's name and the court path, never the person's story.
   `.github/workflows/courtsimplified-source-requests.yml` then runs
   `scripts/sources/processSourceRequests.sh` and `resolveSourceRequest.ts`. They find the official
   URL, fetch the text and add the source to `scripts/rules/requestedSources.json`.
7. **Content pipeline (offline: pre-written answers for each stage of a case).**
   - `npm run content:draft` (`scripts/content/draftStageAnswers.ts`, which runs
     `verifiedContentPipeline.ts`) has three passes:
     - a DRAFTER model writes a stage block from quoted rule text;
     - a separate VERIFIER model must quote the support for each sentence;
     - CODE looks up every quote, word for word, in the saved text.
   - The output is a candidate run in `docs/content-pipeline/candidates/run-*.json`.
   - `npm run content:promote` (`scripts/content/promoteContentRun.ts`) applies the gates in
     `scripts/content/blockGates.ts` again. It writes the single set the site serves:
     `src/lib/content-library/published/stageAnswers.published.json` (release run-27, 126 blocks,
     tied to the manifest's `corpusGeneratedAt` date).
   - Block statuses (draft / needs-human / no-source / verified-draft / approved) are listed in
     `docs/ACCURACY_ENGINE.md` section 4. Only a person sets `approved`
     (`src/lib/content-library/approvals.json`, written by `scripts/content/importReviewResults.ts`).
8. **Hand-checked catalogue.** The claim-type catalogue (`src/lib/case-system/intake/claimTypes.ts`
   and the files next to it) is written by hand, with citations. The check on each entry is logged
   in `docs/sources/catalogue-verification.json` and in batch files under
   `docs/sources/catalogue-verification/` (e.g. `civil-1.json`, `gaps-1.json`).
   `scripts/content/fingerprintBatch.ts` stamps each record with a fingerprint of the entry's
   current text, so a later edit to the entry is noticed.
9. **Law map (drafts).** `docs/law-map/*.json` (civil, family, small-claims, employment, ...) is
   written by the model from its own knowledge, marked unverified and never shown to users.
   `npm run law-map:check` (`scripts/law-map/checkLawMap.ts`) finds each item's provision in the
   saved text and checks that an expected phrase is there. Results go to `docs/law-map/STATUS.md`
   and `status.json`. Items that pass are then built into the stage map by hand
   (`docs/ACCURACY_ENGINE.md`, "The map decides procedure").
10. **CanLII.** Only metadata (titles, citations, which later cases cite a case) comes in, through
    `src/lib/canlii/`. Decision text never does, and no page on canlii.org or canlii.ca is ever
    fetched (CLAUDE.md s. 2).

### Modules

**`scripts/rules/` (saving the official text)**
- OWNS: the source allowlist, `docs/sources/corpus/` and `manifest.json`.
- READS: official sites (e-Laws `.doc` files, laws-lois.justice.gc.ca, ontariocourts.ca).
- READ BY: `corpusIndex.ts`, `checkLawMap.ts`, `verifyPublishedLibrary.ts` (through the manifest
  date). `fetchCorpus.ts` and `checkCorpus.ts` call `refuseCanliiContent` from `canliiCore.ts`
  before every fetch.

**`retrieval/corpusChunker.ts`, `decisionChunker.ts`** (in `src/lib/case-system/`)
- OWN: how a statute or judgment is cut into passages that can be cited. For a judgment, only the
  court's own reasons are kept.
- READ: the corpus `.txt` files.
- READ BY: `corpusIndex.ts` and `scripts/retrieval/buildCorpusIndex.ts`.

**`retrieval/corpusIndex.ts`**
- OWNS: loading and searching `docs/sources/retrieval/corpus-index.json` and `corpus-vectors.bin`.
  Each hit is read again from disk, with a hash check.

**`retrieval/storyRetrieval.ts`, `namedProvisions.ts`**
- OWN: finding passages that match a story by meaning, and turning a named section
  ("CPA 2002, s. 43 (1)") into its passage.
- READ: `corpusIndex.ts`.
- READ BY: `checkedAnswer.ts`, `researchStory.ts`, `researchQuestion.ts`, `strategy.ts`,
  `understanding/understandCase.ts`, `intelligence/courtSimplifiedBrain.ts`.

**`retrieval/checkedAnswer.ts` (+ `checkedAnswerText.ts`)**
- OWNS: the draft, quote and code-check steps for each statement; the time limit
  (`ANSWER_TIME_MS`); the "second look"; the "could not confirm" list.
- Switch: `checkedAnswersEnabled` (`src/lib/content-library/phaseScope.ts`; env `CHECKED_ANSWERS=off`
  turns it off).

**`retrieval/citationCheck.ts`**
- OWNS: making each citation name exactly what its quote comes from: the subsection a quote sits in
  (`pinpointForQuote`, `citationForQuote`), the Act's own short title and year (`shortTitleIn`), and
  whether a statement adds a reason the quote does not give (`addsReason`, dropped to "could not
  confirm").
- READ BY: `checkedAnswer.ts` (`sourceOf`); checked over the whole library by `test:citations`.

**`src/lib/case-workspace/fileLink.ts`**
- OWNS: the short-lived signed path that opens an uploaded file under its own name
  (`fileLinkPath`, `fileLinkValid`; 60 seconds).
- READ BY: the document link route and `app/api/workspace/documents/file/[id]/[name]/route.ts`;
  checked by `test:document-link`.

**`intelligence/quoteMatch.ts`**
- OWNS: the single word-for-word quote test. It lower-cases, ignores quote marks and spacing, and
  requires a minimum length.
- READ BY: `groundedCognition.ts`, `checkedAnswer.ts`, `src/lib/case-workspace/courtDecision.ts`
  (decisions a person uploads), `verifyCanlii.ts`.

**`retrieval/researchQuestion.ts`, `researchStory.ts`**
- OWN: the older "research step", which returns quoted passages. It is the fallback when the
  checked answer cannot answer.
- READ: the index.
- READ BY: `app/api/assistant/law/route.ts`. `researchStory` is also where missing laws are named
  for source requests.

**`retrieval/explainProvision.ts`**
- OWNS: plain-language explanations of one provision, checked by a second model call and by code.
- READ BY: `app/api/law/explain/route.ts`, `checkedAnswer.ts` (for `numbersInWords`),
  `sourcedQuestions.ts`.
- Switch: `plainExplanationsEnabled`.

**`retrieval/sourceRequests.ts`**
- OWNS: opening "source-request" GitHub issues.
- READ BY: `app/api/assistant/law/route.ts`, `app/api/case/understand/route.ts`,
  `app/api/case/strategy/route.ts`, `app/api/intake/sourced-questions/route.ts`,
  `courtSimplifiedBrain.ts`.
- The workflow `.github/workflows/courtsimplified-source-requests.yml` closes each request by adding
  the source to `scripts/rules/requestedSources.json`.

**`scripts/content/verifiedContentPipeline.ts`, `draftStageAnswers.ts`, `draftGenericBlocks.ts`**
- OWN: the drafter/verifier/code pipeline that produces candidate runs.
- WRITE: `docs/content-pipeline/candidates/`.
- Run by hand (`npm run content:draft`, `content:draft-generic`). They spend OpenAI money.

**`scripts/content/blockGates.ts`**
- OWNS: every publish gate, in one place (`findQuote`, `makesAClaim`, `assertsRequirement`,
  `predictsOutcome`, readability).
- READ BY: `promoteContentRun.ts` and `scripts/verification/verifyPublishedLibrary.ts`. Because both
  use the same file, the publish step and the suite cannot drift apart.

**`scripts/content/promoteContentRun.ts`**
- OWNS: turning a candidate run into `src/lib/content-library/published/stageAnswers.published.json`
  (it needs `--confirm`).
- When `test:published-library` fails after the corpus changes, re-promoting the same run is the
  intended fix.

**`scripts/content/buildVerdictSources.ts`, `buildSourceDisplay.ts`**
- OWN: the generated files `published/verdictSources.generated.json` (the provision behind each
  proven sentence) and `published/sourceDisplay.generated.json` (how each source is named and dated).
- READ BY: `src/lib/content-library/stageAnswerView.ts`, `sourceDisplay.ts`.

**`src/lib/content-library/publishedLibrary.ts`**
- OWNS: loading the stage blocks the site serves, tied to one promoted run.
- `stageAnswerView.ts` is in turn READ BY `app/api/case/stage-answer/route.ts`,
  `app/api/case/resolve-stage/route.ts` and `chat/assembleChatAnswer.ts`. The panel on the page is
  `app/builder/_components/StageAnswerPanel.tsx`.

**`src/lib/content-library/publishedGenericLibrary.ts`**
- OWNS: the blocks that do not depend on a stage.
- It currently serves nothing, by design: `published/genericAnswers.published.json` does not exist
  yet (see its header).
- READ BY: `src/components/case-workspace/VerifiedServingPanel.tsx`.

**`src/lib/content-library/outputGuard.ts`**
- OWNS: `checkUserContent` / `assertApprovedUserContent`. A string may appear on screen only if it
  is exactly a library item (or a system message).
- READ BY: 18 files, including `app/claims/[id]/page.tsx`, `app/guides/[id]/page.tsx`,
  `app/glossary/page.tsx`, `app/forms/FormsWorkspace.tsx`, `stageAnswerView.ts`.
- Licensee approval is required only when `CONTENT_REQUIRE_APPROVED=true`
  (`src/lib/content-library/licenseeReview.ts:126`).

**`scripts/content/catalogueVerification.ts`, `fingerprintBatch.ts`**
- OWN: the format of the catalogue verification log, and the fingerprint of each entry's text.
- READ: `docs/sources/catalogue-verification.json`, `docs/sources/catalogue-verification/*.json`
  and the catalogue.
- READ BY: `scripts/verification/verifyCatalogueVerification.ts`, `verifySourceLinks.ts`.

**`src/lib/case-system/intake/claimTypes.ts`**
- OWNS: the Small Claims claim-type list: plain explanations, elements, defences and remedies, each
  with citations. `civilClaimTypes.ts`, `familyMatterTypes.ts` and `moreClaimTypes/*.ts` add the
  other courts.
- READ BY: 82 files. These include the matcher and the AI classifier (`claimTypeMatcher.ts`,
  `claimTypeAiClassifier.ts`), the depth questions, the gap detector, and the public pages (through
  `src/lib/content-library/claimLibrary.ts` into `app/claims/`).

**`docs/law-map/` + `scripts/law-map/checkLawMap.ts`**
- OWN: the unverified law drafts and their check status.
- READ: the corpus.
- READ BY: no code that runs on the site, as intended. Verified items feed the stage map by hand.
  `docs/law-map/saved-sources.txt` and `saved-decisions.txt` list what is already on disk.

**`src/lib/canlii/canliiCore.ts`**
- OWNS: the metadata-only CanLII API client. It has no imports. It holds the rate limit, the daily
  cap, the cache and `refuseCanliiContent`.
- READ BY: `canliiServer.ts`, `scripts/rules/fetchCorpus.ts`, `checkCorpus.ts`, `scripts/forms/*`.
- **`canliiServer.ts`** connects it to the real fetch, the shared lease and the database cache.
  READ BY `app/api/canlii/case/route.ts` and `scripts/sources/checkDecisionCitations.ts`.
- With no `CANLII_API_KEY`, nothing is called.

### Guards

- `test:rules-corpus`: the corpus files and the manifest agree on where each text came from and its
  hash. Stops a bad download from being saved.
- `test:corpus-retrieval`, `test:retrieval-bundled`: search returns real saved passages, and the
  index ships with the build.
- `test:checked-answer`: uses a fake model with the real library. A statement that is unquoted,
  misquoted, has a wrong number or predicts an outcome is refused.
- `test:grounded-analysis`: citations in the analysis must be quotes found in the library.
- `test:research-step`, `test:sourced-questions`, `test:plain-explanations`: the research step,
  sourced intake questions and provision explanations show only checked text.
- `test:source-requests`: a source request carries only the law's name and the court path, never
  the story.
- `test:published-library`: every served block still passes `blockGates.ts` against the current
  corpus. It fails when the corpus grows, until the run is re-promoted.
- `test:stage-answers`, `test:verdict-sources`, `test:generic-library`: the stage blocks, the source
  behind each sentence, and the generic library that serves nothing until it passes.
- `test:output-guard`: a string that is not a library item cannot appear on screen.
- `test:catalogue-verified`: every dated catalogue entry has a verification record, and the record's
  fingerprint matches the entry's current text.
- `test:claim-types`, `test:claim-library`, `test:cited-provisions`, `test:source-links`: the shape of
  the catalogue, the public claim pages, cited sections exist in the saved text, source URLs are
  well-formed.
- `test:law-map`: the law-map files parse, have no duplicate ids or broken links, every item has a
  way to be checked, there are no CanLII links, and no wording grades a case or tells the reader
  what to do (`scripts/verification/verifyLawMap.ts` header).
- `test:canlii`: no CanLII page is fetched; the API is used for metadata only; rate limit, daily cap
  and lease hold; uploaded decisions stay in their own case; the "being cited is not being upheld"
  wording is shown.
- `test:glossary`, `test:topic-guides`, `test:assistant-blocks`: the hand-written glossary, guides and
  guided-assistant strings carry sources.
- The full list, with each suite's own description: `docs/VERIFICATION_SUITES.md` (generated by
  `npm run docs:suites`).

### Bypasses

These are places where text that may state law reaches a person without going through the
checked-answer engine or the published pipeline blocks.

- **Hand-written catalogue and guides.** These are sourced by hand and checked by suites
  (catalogue-verified, topic-guides, glossary), not by the drafter/verifier/code pipeline. This does
  not break the rules as written, but it is the weakest lane.
  - Where it shows:
    - `claimTypes.ts` plain explanations: `app/claims/[id]/page.tsx:64`, `:91`, `:107`, `:122`.
    - Topic guides (`src/lib/content-library/guides/*.json`): `app/guides/[id]/page.tsx`.
    - Glossary (`glossary/glossaryEntries.json`): `app/glossary/page.tsx`.
    - Form summaries: `forms/formSummaries.json`.
  - The `claimTypes.ts` header still says "DRAFT wording ... pending lawyer/paralegal review".
  - The output guard checks only that a string is a library item. Approval is not required unless
    `CONTENT_REQUIRE_APPROVED=true` (`src/lib/content-library/licenseeReview.ts:126-127`).
- **Guided assistant strings.** The entries at `src/lib/content-library/assistantBlocks.ts:238`
  ("Legal explanations — these state law. Each needs a real citation") are hand-written templates.
  `test:assistant-blocks` guards them; the pipeline does not.
- **Model-written story fields on the front door.**
  - In `src/lib/case-system/understanding/understandCase.ts`, the `summary`, matter `title`, court
    `why` and `stage` fields (around lines 243-296) are model text.
  - They are filtered by a regex (`STATES_LAW`, line 205; `statesLaw`, line 213), not by the checked
    answer. A legal statement worded without the regex's trigger words could pass.
  - Unsure how often this happens. The `points` field does go through `checkedAnswer` (line 453).
- **Court Assistant fallback.** `app/api/assistant/law/route.ts` falls back to `researchQuestion`
  when the checked answer runs out of time. That path shows quoted passages that code has checked,
  not free statements. Probably not a bypass; unsure.
- **Builder analysis.** `intelligence/courtSimplifiedBrain.ts` (used from
  `app/builder/_components/civilAnalysis.ts`) checks citations with `groundedCognition` instead of
  `checkedAnswer`. Unsure whether every sentence the model returns there is checked.
- **Practical guidance.** CLAUDE.md s. 2 describes a `PRACTICAL_GUIDANCE` switch. No code reference
  to that name was found in `src/` or `app/`. Unsure whether it exists under another name.

## Chat

### The flow

1. **Where the chat lives.** The builder results page shows an "Ask follow-up questions" button once the case is saved (`app/builder/page.tsx:2764`). Clicking it mounts `CourtAssistantChat` (`app/builder/page.tsx:2765-2771`). The send button reads "Ask" (`app/builder/_components/CourtAssistantChat.tsx:1493`). No other page mounts this component. I found no separate chat on the case page (`app/cases/...`) (unsure whether one exists under another name).
2. **One message makes up to three calls.** `sendMessage` (`CourtAssistantChat.tsx:915`):
   - **Law lookup**, only for small-claims/civil/family: POST `/api/assistant/law` (`:946`). It sends the question, the person's last 4 messages, the court path, an optional story and side, and the caseId. The result renders under the reply, in `CheckedAnswerPanel` / `ResearchPanel`.
   - **Reply**: POST `/api/guided-assistant` (`:981`) with the message, caseId, `mode: "builder-chat"`, a `courtContext` (path, province, city, `stage: proceduralStage`) and the last messages. It retries twice on 404 while the case is still saving (`:1001`).
   - **History**: GET/POST/DELETE `/api/cases/chat` (`:744`), which stores the conversation in `case_chat_messages` under the person's own session (`app/api/cases/chat/route.ts:8-21`).
3. **The reply is not written by an AI.** `/api/guided-assistant` calls `runGuidedAssistantGateway`, which reports `modelProvider: "internal-orchestrator"` and `externalModelUsed: false` (`src/lib/case-system/guided-assistant/guidedAssistantGateway.ts:18-19`). The answer is built from rules plus authored library text (`assistantText("assistant:opening:...")`, `guidedAssistantOrchestrator.ts:760-802`). Intent is picked by keyword matching (`detectResponseIntent`, `guidedAssistantOrchestrator.ts:618`).
4. **The checked answer is the AI part.** `/api/assistant/law` runs `checkedAnswer` first. A model drafts the statements, then code matches each one against official text in the library, and only matched statements are shown (`src/lib/case-system/retrieval/checkedAnswer.ts:1-25`). Two more filters run on what is kept (`checkedAnswer.ts:611-617`): `withoutStatuteEchoes` (`retrieval/statuteEcho.ts`) drops a statement whose only source is a decision quoting an Act's words, and `withLibraryOwned` (`retrieval/libraryOwned.ts`) replaces the model's wording on topics the library owns (the notice to the Crown, the simplified procedure) with the Act's own quoted words and section, or the amount card's sentence. If that gives no answer, it falls back to `researchQuestion` (provisions in their own words). Law the library lacks is filed as a "source request" (`app/api/assistant/law/route.ts:158-176`).
5. **Facts sent to the AI.** The law route reloads the person's saved case on the server. It does not trust the request (`route.ts:120-135`):
   - the story comes from `userStory(intakeData)`;
   - the facts come from `caseFactsText(readCaseRecord(...))` (`src/lib/case-system/caseRecord.ts:224-244`). That text lists side, `confirmedStage`, exact step title (`stepId`, or the step picked at the start, `startStepId`, through `findStage`), dates (labelled through `allDateQuestions`), amount, the confirmed kind of claim (`claimTypeId` through `CLAIM_TYPES`), that an other party is recorded (never the name), city and documents.
   The guided-assistant route also reloads the case and sets the stage to `readCasePosition(master).confirmedStage ?? intake.caseStage ?? "not-sure"` (`app/api/guided-assistant/route.ts:136`).
6. **Small Claims guided conversation (the intake chat, before results).** `GuidedSmallClaimsIntake.tsx:665` sends POST `/api/intake/guided-turn` (`app/api/intake/guided-turn/route.ts`). That calls `orchestrateIntakeTurn` (`src/lib/case-system/intake/orchestrateIntakeTurn.ts:283`), which runs these steps in order: safety pass, fact extraction, claim-type match, `selectQuestions` (authored question bank), and the voice-layer lead-in. Next comes depth questions on a confirmed claim type: `/api/intake/depth-turn` (`GuidedSmallClaimsIntake.tsx:993`), with 2 model calls per turn (`app/api/intake/depth-turn/route.ts:30`). `/api/intake/classify-claim-type` (`:853`) offers an AI claim-kind suggestion that the person confirms.
7. **Danger check before anything else.** `orchestrateIntakeTurn` runs `runSafetyPass` first (`safetyPass.ts:171`). An "immediate-danger" result stops the turn and shows only a fixed message (`orchestrateIntakeTurn.ts:355-363`). "Distress", or a danger keyword (`storySuggestsDanger`, `dangerWords.ts`), adds a fixed acknowledgment but does not stop the turn (`:394`). Outside guided mode, `clientSafetyCheck.ts:68` calls `/api/intake/safety-check`. It returns the classification and a fixed `userMessage`, never the model's `reason` (`app/api/intake/safety-check/route.ts`). The builder requires sign-in so that this check can run before analysis (`app/builder/page.tsx:1284-1287`).
8. **Rate limit.** `aiLimitResponse(request, group)` (`src/lib/security/aiRouteGuard.ts`) uses `takeAiAllowance` (`src/lib/security/aiRateLimit.ts`). The per-visitor hourly limits are understand 30, light 150 and safety 300. A shared daily ceiling of 3,000 units applies (env `AI_DAILY_CEILING`), and safety calls cost 0 against it. A salted hash identifies the visitor. Routes that use it:
   - guided-assistant ("light"), even though it makes no model call;
   - safety-check ("safety").
   `/api/assistant/law`, `/api/intake/guided-turn` and `/api/intake/depth-turn` do NOT call it. They rely on sign-in instead. The rate-limit header says it is for routes needing no sign-in (`aiRateLimit.ts:1-10`).
9. **Confirmation gate.** `withConfirmedGuidance` (`src/lib/security/intakeGuidanceGate.ts`) wraps guided-assistant, assistant/law, depth-turn, sourced-questions, case/strategy and cases/chat. Before running, it requires sign-in, an owned case, a matching court path and a confirmed intake revision. After running, it re-checks, so a late answer is thrown away if the intake changed in another tab. Requests over 1,000,000 bytes are refused.
10. **Switches** (`src/lib/content-library/phaseScope.ts`):
    - `ASSISTANT_LAW=off` turns off the law lookup (`assistantLawEnabled`, `:267`). It also needs `APPLIED_LAW` and the research step.
    - `CHECKED_ANSWERS=off` (`:282`) turns off checked answers. They also need `AI_ANALYSIS_TEXT_TO_USERS` and `APPLIED_LAW`.
    - `STRATEGY=off` plus `NEXT_PUBLIC_STRATEGY=off` (`:298-301`; `app/_components/StrategyPanel.tsx:23`) hide strategy. The default is ON.
    - `AI_DOCUMENT_ANALYSIS_ENABLED` controls document analysis (`src/lib/case-workspace/aiAnalysis.ts:104-112`).
    - `PRACTICAL_GUIDANCE`: I found no reference to it anywhere in `src/` or `app/` (unsure whether it exists yet).
    - With no AI key, the law route answers `skipped: "off"`.
11. **"Never grade the case" guards.**
    - The checked-answer prompt bans predictions and sets `asksForPrediction`. The route then returns `declinedToJudge` (`checkedAnswer.ts:116-119, 613`; `route.ts:163`).
    - Model output (`litigationRisks`) was removed from what the chat sends (`app/builder/page.tsx:2775-2790`).
    - Risk to note: a built-in suggested question reads "What would a judge likely be concerned about?" (`CourtAssistantChat.tsx:173`). It goes to the rule engine's general reply and to the law lookup, where the prediction decline should catch it (unsure whether every wording is caught).
12. **Names never sent to the AI.** Every model call goes through `forceNoStore` (`src/lib/case-system/openaiClient.ts:214`), which replaces each known name in the request with a label (`[you]`, `[the other party]`, `[child 1]`) and puts the names back into the reply (`src/lib/case-system/privacy/nameLabels.ts`). The names for a request are set once per request: `withConfirmedGuidance` sets them from the saved case and the body (`intakeGuidanceGate.ts:51`), and the routes outside that gate are wrapped in `withRequestNames` (`src/lib/security/requestNames.ts`; 7 routes). The intake adapters also keep `nameRecorded()` (`privacy/modelPayloadNames.ts`), and `caseFactsText` says only that an other party is recorded. `npm run test:no-names-to-model` (`scripts/verification/verifyNoNamesToModel.ts`) checks every path, including a form filled with a synthetic name. A name the site does not know (never given in a name field, and not picked out by the story readers) is sent as typed; that suite's control check shows it.

### Modules

**`app/builder/_components/CourtAssistantChat.tsx`** (1539 lines)
- Owns: the chat UI, the suggested questions (`:169`), the message list and its browser copy (`STORAGE_PREFIX`, `:189`), and the court-path guidance banner (`buildCourtPathGuidance`, about `:394-445`).
- Reads: `useSituation` with `sideOf` (side), `useIntakeReviewView` with `reviewPhase` (whether intake is confirmed), `ONTARIO_SMALL_CLAIMS_LIMIT`, and its own `extractClaimAmount` and `knownLocation`.
- Read by: `app/builder/page.tsx:2765` only.

**`app/api/guided-assistant/route.ts`**
- Owns: request cleanup (last 20 messages, 6,000 characters each, `:51-79`) and the response shape.
- Reads: the owned case (`getAuthenticatedOwnedCase`), `readCasePosition` and `runGuidedAssistantGateway`. It ignores the client's `courtContext` and `caseMemory`.
- Read by: `CourtAssistantChat.tsx:981`.

**`src/lib/case-system/guided-assistant/`**: gateway (141 lines), orchestrator (1399), conversationIntelligenceEngine (2377), conversationMemoryEngine (624), caseInvestigationEngine (731)
- Owns: the rule-based reply, intent detection, the "case investigation" panel data, and the recommended route.
- Reads: `caseMemory` (the raw intake and master result), `DOCTRINE_SEED_LIBRARY` (every entry marked "not-verified", `orchestrator.ts:22-30`), `legalReasoningCoordinator`, and `assistantText` library blocks.
- Read by: the guided-assistant route only.

**`app/api/assistant/law/route.ts`**
- Owns: input checks (question up to 1,000 characters, story up to 8,000, at most 4 earlier messages), `questionInConversation`, and the order "checked answer first, then research".
- Reads: `readCaseRecord`, `caseFactsText`, `userStory`, `findStage`, `allDateQuestions`, `checkedAnswer`, `researchQuestion`, `fileSourceRequests`, and the phaseScope switches.
- Read by: `CourtAssistantChat.tsx:946`.

**`src/lib/case-system/retrieval/checkedAnswer.ts`** (722 lines)
- Owns: the draft prompt, the statement-by-statement check against passages, the senior-reviewer recheck, and `checkedAnswerView`.

**`app/api/intake/guided-turn/route.ts` and `src/lib/case-system/intake/orchestrateIntakeTurn.ts`**
- Owns: the order of the turn (safety, extraction, claim match, next question, lead-in), the halt on danger, and the 120 KB request cap.
- Reads: `QUESTION_BANK`, `CLAIM_TYPES`, the situation answers (`situationFacts`), and `OPENAI_API_KEY` on the server.
- Read by: `GuidedSmallClaimsIntake.tsx:665`. The route header says it is "stateless across calls": the client holds `facts` and `answeredIds`.

**`app/api/intake/safety-check/route.ts`, `src/lib/case-system/intake/safetyPass.ts`**
- Owns: the danger classification and the fixed messages (`IMMEDIATE_DANGER_MESSAGE`, `DISTRESS_ACKNOWLEDGMENT`).
- Read by: `clientSafetyCheck.ts:68`, `orchestrateIntakeTurn`, and depth-turn.

**`src/lib/security/aiRateLimit.ts`, `aiRouteGuard.ts`, `intakeGuidanceGate.ts`**: these are the limits and the confirmation gate described above. They are read by the API routes listed in flow points 8–9.

**`app/api/case/strategy/route.ts` and `app/_components/StrategyPanel.tsx`**
- Owns: the "every seat" strategy panel. It sits behind `strategyEnabled` and is mounted from `IntelligenceOverviewPanel.tsx:445`, which passes the case id.
- Reads: for a saved case, the owned case through `readCaseRecord` (`loadCase`): the story (`userStory`), the side from `sideFromParts`, and `caseFactsText` (stage, exact step, dates, amount, kind of claim). With no saved case, `story`, `courtPath` and `side` from the request body.

**`app/api/cases/chat/route.ts`**: stores the chat history. It sends nothing to a model.

### Facts the chat uses

| Fact | Law lookup (`/api/assistant/law`) | Rule reply (`/api/guided-assistant`) | Client (`CourtAssistantChat`) |
|---|---|---|---|
| Side | `record.side` from `sideFromParts` inside `caseFactsText`, plus the request's `side`, which comes from the client's `sideOf(situation)` | own copy: whatever `conversationIntelligence` reads from the text and memory (unsure) | `sideOf(useSituation())` (`:825`), falling back to `record.yourRole`/`record.role`, renamed "defendant"/"plaintiff" (`:939`) |
| Stage | `record.position.confirmedStage` plus the exact step title (`stepId`, else `startStepId` → `findStage`) | broad word only: `readCasePosition().confirmedStage ?? intake.caseStage` (`route.ts:136`) | `proceduralStage` prop = model's `analysis.intelligence.proceduralPosture.stage` → `caseData.caseStage` → `existingCaseStage` (`page.tsx:2771`) |
| Claim kind | `record.claimTypeId` named through `CLAIM_TYPES` in `caseFactsText` ("Kind of claim", confirmed only) | own copy: courtArea/legal domain picked up from keywords (`conversationIntelligenceEngine.ts`) | `conversationFocus.courtArea` from the reply |
| Amount | `recordedAmountOf(intake)` through `record.amount` | not used (unsure) | own copy: `extractClaimAmount(message text)` (`:232`, `:843`, `:1053`) |
| Dates | `record.dates` (confirmed dates win over guided ones), labelled by `allDateQuestions` | not used | not used |
| Labels (step title, date question) | `findStage(id).title`, `allDateQuestions().question` | `assistantText` library keys | built-in English strings |
| City/province | `record.city` | own copy: `memory.caseData.intake.extra.yourCity` (`orchestrator.ts:445-447`); jurisdiction hard-coded "Ontario" (`route.ts:135`) | own copy: `knownLocation()` (`:56`) |

### Bypasses

- **B2: the broad stage word instead of the exact step.** The guided-assistant route passes only `confirmedStage ?? intake.caseStage`, for example "conference" (`app/api/guided-assistant/route.ts:136`). It never passes `position.stepId`. The orchestrator then lowers it to a `CaseStage` enum (`guidedAssistantOrchestrator.ts:351-361, 449-466`) and can override it with a stage guessed from the message text (`:492-496`, `conversationFocus.proceduralStage`).
- **B3: the client sends a model-guessed stage.** `proceduralStage` comes from model output first (`app/builder/page.tsx:2771`) and is sent as `courtContext.stage` (`CourtAssistantChat.tsx:992`). The server ignores it today (`route.ts:131-135`). It is dead input, and it would become a bypass if anyone started reading it.
- **B4: side comes from the client.** The law route takes `side` from the request (`route.ts:158`). The client fills it from `sideOf(situation)` or from `record.yourRole`/`record.role`, and renames it "defendant"/"plaintiff" for every court, Family too, a third word for the side (`CourtAssistantChat.tsx:939`), not from `readCaseRecord().side`. `caseData` at `page.tsx:2772` has no top-level `yourRole`/`role`/`facts`, so the fallback and the client `story` (`:942`) are always empty (unsure; inferred from the prop shape).
- **B5: amount and court routing from chat text.** `extractClaimAmount` reads a dollar figure from the latest message (`CourtAssistantChat.tsx:232, 843`). `buildCourtPathGuidance` then compares it with the $50,000 limit and shows "proceed through a Superior Court of Justice civil action" (`:436-442`). The recorded amount (`recordedAmountOf`) is not used. This is a client-side legal statement with no source attached (unsure whether a citation is added nearby).
- **B6: location.** `knownLocation()` (`CourtAssistantChat.tsx:56-72`) and the orchestrator's `yourCity` path (`guidedAssistantOrchestrator.ts:445-447`) read raw intake keys instead of `record.city`. The route passes `caseData: intake` (`route.ts:132`), so the orchestrator's `["caseData","intake",...]` paths never match (unsure; inferred).

## Keeping this map current

- **A pull request that changes a shared piece updates this map** (CLAUDE.md s. 8): the
  written part by hand, the generated part with `npm run docs:site-map`. A shared piece is
  one listed in "Who reads what"; adding one means adding it to `SHARED` in
  `scripts/docs/generateSiteMapGraph.ts`.
- **A bypass that is fixed is deleted from its "Bypasses" list** in the same pull request. A
  new screen gets a row in "Where each screen gets each fact".
- `npm run test:site-map` (in CI) fails when the generated part no longer matches the imports.
  It cannot check the written part; the reviewer check below does.
- **Reviewer check.** Before a pull request that changes a shared piece is called ready, a fresh
  session that did not write it asks, for each fact (side, stage, claim kind, amount, dates,
  words), "where is this shown, and from which shared piece?", answers from this map, and
  checks each answer against a code search. Differences go in the pull request description.

## Who reads what (generated)

<!-- generated:who-reads-what:start (npm run docs:site-map; do not edit by hand) -->

Generated from the imports in app/, src/, scripts/ and tests/. "Reads" lists the repo modules it imports (shared pieces in bold); "Read by" lists what imports it (screens and routes in app/, modules in src/); "Checked by" lists the suites and browser tests that import it.

### Screens: which shared piece each imports, per fact

The columns mean *imports*, not *shows*: a module can be imported for another reason, and a screen can get a fact through props or its own copy. Where each screen actually gets each fact is the written table "Where each screen gets each fact" above; this table is for checking it against the code.

| Screen file | Side | Stage | Claim kind | Amount | Dates | Words |
|---|---|---|---|---|---|---|
| app/_components/HomeLocationGate.tsx | situation | — | — | — | — | — |
| app/_components/IntakeRecovery.tsx | situation | — | — | — | — | intakeReview |
| app/_components/IntakeReviewPanel.tsx | situation, caseFile | casePosition | — | — | dates, casePosition | intakeReview |
| app/_components/ReviewNeededNotice.tsx | — | — | — | — | — | intakeReview |
| app/_components/SituationQuestions.tsx | situation | — | — | — | dates | — |
| app/_components/WhatComesNext.tsx | — | stageMap, stageSequence | — | — | — | — |
| app/builder/_components/CivilIntake.tsx | situation | builderTypes | — | recordedAmount | dates | — |
| app/builder/_components/CourtAssistantChat.tsx | situation | — | — | — | — | intakeReview |
| app/builder/_components/EventCandidateSurface.tsx | — | casePosition | — | — | casePosition | — |
| app/builder/_components/FamilyIntake.tsx | situation | builderTypes | — | — | dates | — |
| app/builder/_components/FamilyStatusTriage.tsx | situation, caseFile | — | — | — | — | intakeReview |
| app/builder/_components/GuidedFormChat.tsx | caseFile | — | — | — | dates | — |
| app/builder/_components/GuidedSmallClaimsIntake.tsx | caseFile | casePosition | claimKind, claimTypes | — | dates, casePosition | intakeReview |
| app/builder/_components/IntelligenceOverviewPanel.tsx | caseFile | builderTypes | claimKind, claimTypes | recordedAmount | — | — |
| app/builder/_components/SmallClaimsIntake.tsx | situation | builderTypes | claimKind, claimTypes | — | dates | intakeReview |
| app/builder/_components/SourcedQuestions.tsx | — | — | — | — | — | intakeReview |
| app/builder/_components/StageAnswerPanel.tsx | — | stageMap, casePosition | — | amountNotes | dates, casePosition, holidays | — |
| app/builder/_components/StageConfirmation.tsx | — | builderTypes | — | — | — | — |
| app/builder/_components/StatementOfClaimSurface.tsx | — | — | claimTypes | — | — | — |
| app/builder/page.tsx | situation, caseFile, caseRecord | stageMap, casePosition, builderTypes | — | amountNotes | casePosition, caseRecord | intakeReview |
| app/cases/[id]/case-file/page.tsx | caseRecord | stageMap, caseStep, builderTypes | — | — | caseRecord | — |
| app/cases/[id]/drafts/page.tsx | — | builderTypes | — | — | — | — |
| app/cases/[id]/forms/page.tsx | — | caseStep | — | — | — | — |
| app/cases/[id]/layout.tsx | situation, caseRecord | caseStep, casePosition, builderTypes | — | — | casePosition, caseRecord | intakeReview |
| app/cases/[id]/page.tsx | situation, caseFile | stageMap, caseStep, casePosition, builderTypes | — | — | casePosition | — |
| app/cases/[id]/timeline/page.tsx | situation, caseRecord | stageMap, casePosition | — | — | casePosition, holidays, caseRecord | — |
| app/cases/_components/CaseFilePanel.tsx | caseFile | stageMap | claimTypes | — | dates | rawKeys |
| app/cases/_components/CaseHomeContext.tsx | caseRecord | casePosition | — | — | casePosition, caseRecord | — |
| app/cases/_components/CaseTimeline.tsx | — | builderTypes | — | — | — | — |
| app/dashboard/page.tsx | — | stageMap, caseStep, casePosition, builderTypes | — | — | casePosition | intakeReview |
| app/forms/FormsWorkspace.tsx | situation | — | — | — | — | intakeReview |

### src/lib/case-system/situation/situation.ts

The situation record: side, where the case is, papers, day served, stage picked.

- Reads (5): **src/lib/case-system/dates.ts**, src/lib/case-system/situation/firstPageForms.ts, src/lib/case-system/situation/firstPageTops.json, **src/lib/case-system/stage-map/stageMap.ts**, **src/lib/case-system/stage-map/stageSequence.ts**
- Read by (27): app/_components/HomeLocationGate.tsx, app/_components/IntakeRecovery.tsx, app/_components/IntakeReviewPanel.tsx, app/_components/SituationQuestions.tsx, app/api/cases/form-applicability/route.ts, app/api/cases/position/route.ts, app/api/intake/guided-turn/route.ts, app/builder/_components/CivilIntake.tsx, app/builder/_components/CourtAssistantChat.tsx, app/builder/_components/FamilyIntake.tsx, app/builder/_components/FamilyStatusTriage.tsx, app/builder/_components/SmallClaimsIntake.tsx, app/builder/_components/positionSave.ts, app/builder/_components/respondingSide.ts, app/builder/_components/stageFromAnswers.ts, app/builder/page.tsx, app/cases/[id]/layout.tsx, app/cases/[id]/page.tsx, app/cases/[id]/timeline/page.tsx, app/forms/FormsWorkspace.tsx, **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/casePosition.ts**, **src/lib/case-system/caseRecord.ts**, **src/lib/case-system/caseStep.ts**, **src/lib/case-system/intakeReview.ts**, **src/lib/case-system/sideChange.ts**, **src/lib/case-system/storyBasis.ts**
- Checked by (8): scripts/verification/verifyCaseFile.ts, scripts/verification/verifyCaseWords.ts, scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyConferenceStages.ts, scripts/verification/verifyOwnAnswers.ts, scripts/verification/verifySideChange.ts, scripts/verification/verifySituation.ts, tests/browser/situation.spec.ts

### src/lib/case-system/intakeStory.ts

The one copy of the story and the location.

- Reads (1): src/lib/case-system/intakeCheckpoint.ts
- Read by (8): app/_components/HomeLocationGate.tsx, app/_components/IntakeRecovery.tsx, app/_components/IntakeReviewPanel.tsx, app/api/cases/events/route.ts, app/builder/page.tsx, src/lib/case-system/guestCarry.ts, **src/lib/case-system/intakeReview.ts**, **src/lib/case-system/storyBasis.ts**
- Checked by (1): scripts/verification/verifyIntakeReview.ts

### src/lib/case-system/storyBasis.ts

Which version of the story each answer was given for.

- Reads (5): **src/lib/case-system/canonicalJson.ts**, src/lib/case-system/intakeCheckpoint.ts, **src/lib/case-system/intakeStory.ts**, **src/lib/case-system/sentences.ts**, **src/lib/case-system/situation/situation.ts**
- Read by (7): app/_components/IntakeRecovery.tsx, app/_components/IntakeReviewPanel.tsx, app/_components/StoryChangedNotice.tsx, app/builder/page.tsx, **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/intakeReview.ts**, **src/lib/case-system/sideChange.ts**
- Checked by (3): scripts/verification/verifyReviewFollowUps.ts, scripts/verification/verifyStoryBasis.ts, scripts/verification/verifyStoryDataRegistry.ts

### src/lib/case-system/sideChange.ts

Setting aside the old side's answers when the side changes.

- Reads (6): app/builder/_components/proposalCard.ts, **src/lib/case-system/caseFile/factsOfQuestion.ts**, src/lib/case-system/intake/questionBank.ts, src/lib/case-system/intakeCheckpoint.ts, **src/lib/case-system/situation/situation.ts**, **src/lib/case-system/storyBasis.ts**
- Read by (1): app/_components/IntakeRecovery.tsx
- Checked by (2): scripts/verification/verifyOwnAnswers.ts, scripts/verification/verifySideChange.ts

### src/lib/case-system/caseFile/caseFile.ts

The case file: one slot per fact, and nextQuestion, the one rule for asking.

- Reads (8): **src/lib/case-system/caseFile/factsOfQuestion.ts**, **src/lib/case-system/dates.ts**, **src/lib/case-system/format/recordedAmount.ts**, **src/lib/case-system/intake/claimKind.ts**, src/lib/case-system/intake/questionBank.ts, src/lib/case-system/intakeCheckpoint.ts, **src/lib/case-system/situation/situation.ts**, **src/lib/case-system/storyBasis.ts**
- Read by (16): app/_components/IntakeReviewPanel.tsx, app/api/cases/position/route.ts, app/builder/_components/FamilyStatusTriage.tsx, app/builder/_components/GuidedFormChat.tsx, app/builder/_components/GuidedSmallClaimsIntake.tsx, app/builder/_components/IntelligenceOverviewPanel.tsx, app/builder/page.tsx, app/cases/[id]/page.tsx, app/cases/_components/CaseFilePanel.tsx, **src/lib/case-system/caseFile/storyLines.ts**, src/lib/case-system/caseFile/triageFromCaseFile.ts, **src/lib/case-system/copy/rawKeys.ts**, **src/lib/case-system/guided-assistant/answeredInStory.ts**, src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts, src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts, **src/lib/case-system/intakeReview.ts**
- Checked by (9): scripts/verification/verifyCaseFile.ts, scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyChrome29octSafety.ts, scripts/verification/verifyConferenceStages.ts, scripts/verification/verifyFormsFromCaseFile.ts, scripts/verification/verifyOwnAnswers.ts, scripts/verification/verifySideChange.ts, scripts/verification/verifyStoryFacts.ts, tests/browser/harness/askOnce.ts

### src/lib/case-system/caseFile/factsOfQuestion.ts

Which fact each question asks for.

- Reads (0): nothing in the repo
- Read by (4): app/builder/_components/GuidedSmallClaimsIntake.tsx, **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/guided-assistant/answeredInStory.ts**, **src/lib/case-system/sideChange.ts**
- Checked by (3): scripts/verification/verifyOwnAnswers.ts, tests/browser/harness/askOnce.ts, tests/browser/harness/chatQuestionFacts.ts

### src/lib/case-system/caseFile/storyLines.ts

What the story says that no answer holds yet, for "What we have so far".

- Reads (6): **app/builder/_components/storyAnswers.ts**, **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/caseFile/storyFacts.ts**, **src/lib/case-system/claimAmount.ts**, src/lib/case-system/intake/dangerWords.ts, **src/lib/case-system/sentences.ts**
- Read by (1): app/cases/_components/CaseFilePanel.tsx
- Checked by (4): scripts/verification/verifyCaseFile.ts, scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyChrome29octSafety.ts, scripts/verification/verifyStoryFacts.ts

### src/lib/case-system/caseFile/storyFacts.ts

Each fact the story gives, in plain words with its sentence: the other side, losses, injury, evidence, last payment.

- Reads (2): **src/lib/case-system/dates.ts**, **src/lib/case-system/sentences.ts**
- Read by (2): **src/lib/case-system/caseFile/storyLines.ts**, **src/lib/case-system/intakeReview.ts**
- Checked by (1): scripts/verification/verifyStoryFacts.ts

### src/lib/case-system/copy/caseWords.ts

The stage, the side and the papers in words, never codes.

- Reads (2): app/builder/_components/builderTypes.ts, **src/lib/case-system/copy/rawKeys.ts**
- Read by (1): app/builder/_components/IntelligenceOverviewPanel.tsx
- Checked by (1): scripts/verification/verifyCaseWords.ts

### src/lib/case-system/intelligence/answeredQuestions.ts

Which generic questions the recorded papers and the stage already answer.

- Reads (0): nothing in the repo
- Read by (6): app/builder/_components/IntelligenceOverviewPanel.tsx, app/builder/_components/civilAnalysis.ts, app/builder/page.tsx, **src/lib/case-system/caseRecord.ts**, src/lib/case-system/intelligence/courtSimplifiedBrain.ts, src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts
- Checked by (3): scripts/verification/verifyCaseWords.ts, scripts/verification/verifyOverviewIssueAndDocumentLabels.ts, scripts/verification/verifyRespondingSide.ts

### src/lib/case-system/guided-assistant/answeredInStory.ts

Whether the chat's question is answered by the story or the case's facts.

- Reads (4): **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/caseFile/factsOfQuestion.ts**, **src/lib/case-system/dates.ts**, src/lib/case-system/intakeCheckpoint.ts
- Read by (2): src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts, src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts
- Checked by (3): scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyChatPlainWords.ts, scripts/verification/verifyOwnAnswers.ts

### src/lib/case-system/retrieval/citationCheck.ts

Each citation names exactly what its quote comes from (subsection, title, year).

- Reads (0): nothing in the repo
- Read by (2): **src/lib/case-system/retrieval/checkedAnswer.ts**, src/lib/case-system/retrieval/sourcedQuestions.ts
- Checked by (2): scripts/content/buildSourceDisplay.ts, scripts/verification/verifyCitations.ts

### src/lib/case-workspace/fileLink.ts

Short-lived signed links that open an uploaded file under its own name.

- Reads (0): nothing in the repo
- Read by (2): app/api/workspace/documents/file/[id]/[name]/route.ts, app/api/workspace/documents/link/route.ts
- Checked by (1): scripts/verification/verifyDocumentLink.ts

### src/lib/case-workspace/fileFetch.ts

Every file downloaded or opened: fetched first, tried once more, a failure said on the page.

- Reads (0): nothing in the repo
- Read by (2): app/cases/_components/CaseWorkspace.tsx, app/forms/FormsWorkspace.tsx
- Checked by (1): scripts/verification/verifyDocumentLink.ts

### src/lib/case-system/canonicalJson.ts

One JSON text per value, whatever order jsonb returns its keys in.

- Reads (0): nothing in the repo
- Read by (4): app/_components/IntakeRecovery.tsx, app/builder/page.tsx, **src/lib/case-system/intakeReview.ts**, **src/lib/case-system/storyBasis.ts**
- Checked by (0): no suite imports it directly

### src/lib/content-library/leaveRuleWords.ts

The Small Claims leave rule in the Act's and the rules' own words, with citations.

- Reads (1): src/lib/case-system/stage-map/citations.ts
- Read by (1): app/builder/_components/StageAnswerPanel.tsx
- Checked by (1): scripts/verification/verifyCharterRetest.ts

### src/lib/case-system/intakeReview.ts

The review: entries, remaining questions, confirmation.

- Reads (14): **app/builder/_components/guidedFields.ts**, **app/builder/_components/storyAnswers.ts**, **src/lib/case-system/canonicalJson.ts**, **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/caseFile/storyFacts.ts**, **src/lib/case-system/dates.ts**, **src/lib/case-system/intake/claimKind.ts**, src/lib/case-system/intake/questionBank.ts, src/lib/case-system/intake/selectQuestions.ts, src/lib/case-system/intakeCheckpoint.ts, **src/lib/case-system/intakeStory.ts**, **src/lib/case-system/sentences.ts**, **src/lib/case-system/situation/situation.ts**, **src/lib/case-system/storyBasis.ts**
- Read by (16): app/_components/IntakeRecovery.tsx, app/_components/IntakeReviewPanel.tsx, app/_components/ReviewNeededNotice.tsx, app/api/case/read/route.ts, app/api/cases/route.ts, app/builder/_components/CourtAssistantChat.tsx, app/builder/_components/FamilyStatusTriage.tsx, app/builder/_components/GuidedSmallClaimsIntake.tsx, app/builder/_components/SmallClaimsIntake.tsx, app/builder/_components/SourcedQuestions.tsx, app/builder/page.tsx, app/cases/[id]/layout.tsx, app/dashboard/page.tsx, app/forms/FormsWorkspace.tsx, src/lib/case-system/intakeCheckpoint.ts, src/lib/security/intakeGuidanceGate.ts
- Checked by (18): scripts/verification/verifyCaseFile.ts, scripts/verification/verifyCaseWords.ts, scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyConfirmationRule.ts, scripts/verification/verifyDateEntryPoints.ts, scripts/verification/verifyIntakeGuidanceGate.ts, scripts/verification/verifyIntakeRecovery.ts, scripts/verification/verifyIntakeReview.ts, scripts/verification/verifyNoNamesToModel.ts, scripts/verification/verifyOwnAnswers.ts, scripts/verification/verifyReviewFollowUps.ts, scripts/verification/verifySideChange.ts, scripts/verification/verifySituation.ts, scripts/verification/verifyStoryBasis.ts, scripts/verification/verifyStoryFacts.ts, tests/browser/case-understanding-continuity.spec.ts, tests/browser/intake-guidance-gate.spec.ts, tests/browser/story-change-every-flow.spec.ts

### app/builder/_components/storyAnswers.ts

The story readers: side, filed papers, children, dates, goal, other party.

- Reads (3): **src/lib/case-system/claimAmount.ts**, **src/lib/case-system/dates.ts**, **src/lib/case-system/sentences.ts**
- Read by (5): app/_components/IntakeRecovery.tsx, **app/builder/_components/guidedFields.ts**, **src/lib/case-system/caseFile/storyLines.ts**, **src/lib/case-system/intakeReview.ts**, src/lib/security/requestNames.ts
- Checked by (8): scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyClaimAmount.ts, scripts/verification/verifyDateEntryPoints.ts, scripts/verification/verifyFactSources.ts, scripts/verification/verifyFormsFromCaseFile.ts, scripts/verification/verifyGuidedFormChat.ts, scripts/verification/verifyStoryAnswers.ts, scripts/verification/verifyStoryFacts.ts

### app/builder/_components/guidedFields.ts

The civil and Family questions and their choices.

- Reads (3): app/builder/_components/GuidedFormChat.tsx, **app/builder/_components/storyAnswers.ts**, **src/lib/case-system/casePosition.ts**
- Read by (7): app/_components/IntakeReviewPanel.tsx, app/builder/_components/CivilIntake.tsx, app/builder/_components/FamilyIntake.tsx, app/builder/_components/GuidedFormChat.tsx, app/builder/_components/SmallClaimsIntake.tsx, **src/lib/case-system/copy/rawKeys.ts**, **src/lib/case-system/intakeReview.ts**
- Checked by (9): scripts/verification/verifyCaseFile.ts, scripts/verification/verifyCaseWords.ts, scripts/verification/verifyChrome29OctFlow.ts, scripts/verification/verifyDateEntryPoints.ts, scripts/verification/verifyFormsFromCaseFile.ts, scripts/verification/verifyGuidedFormChat.ts, scripts/verification/verifyOwnAnswers.ts, scripts/verification/verifyRawKeys.ts, scripts/verification/verifyStoryAnswers.ts

### src/lib/case-system/claimAmount.ts

The amount offered from the story.

- Reads (1): **src/lib/case-system/sentences.ts**
- Read by (3): **app/builder/_components/storyAnswers.ts**, **src/lib/case-system/caseFile/storyLines.ts**, src/lib/case-system/intelligence/narrativePrefill.ts
- Checked by (2): scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyClaimAmount.ts

### src/lib/case-system/format/recordedAmount.ts

An amount typed, as a number.

- Reads (0): nothing in the repo
- Read by (10): app/builder/_components/CivilIntake.tsx, app/builder/_components/IntelligenceOverviewPanel.tsx, src/lib/case-system/amountNotes.ts, **src/lib/case-system/caseFile/caseFile.ts**, src/lib/case-system/caseReview/caseReview.ts, src/lib/case-system/caseReview/caseReviewModel.ts, src/lib/case-system/family/childSupportDraftEngine.ts, src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts, src/lib/case-system/orchestration/civilIntakeCanonicalAdapter.ts, src/lib/case-system/statementOfClaimDraftEngine.ts
- Checked by (2): scripts/verification/verifyRecordedAmount.ts, scripts/verification/verifyStatementOfClaimSurface.ts

### src/lib/case-system/intake/claimKind.ts

The kind of claim.

- Reads (2): src/lib/case-system/intake/claimTypeMatcher.ts, src/lib/case-system/intake/claimTypes.ts
- Read by (10): app/builder/_components/GuidedSmallClaimsIntake.tsx, app/builder/_components/IntelligenceOverviewPanel.tsx, app/builder/_components/SmallClaimsIntake.tsx, **src/lib/case-system/caseFile/caseFile.ts**, src/lib/case-system/intake/claimTypeAiClassifier.ts, src/lib/case-system/intake/claimTypeOverviewContent.ts, src/lib/case-system/intake/extractIntakeFacts.ts, src/lib/case-system/intake/orchestrateIntakeTurn.ts, src/lib/case-system/intake/storyAnswerProposals.ts, **src/lib/case-system/intakeReview.ts**
- Checked by (0): no suite imports it directly

### src/lib/case-system/dates.ts

Reading and writing dates.

- Reads (0): nothing in the repo
- Read by (46): app/_components/IntakeReviewPanel.tsx, app/_components/SituationQuestions.tsx, app/api/workspace/documents/route.ts, app/api/workspace/exhibit-book/route.ts, app/api/workspace/organisation/route.ts, app/builder/_components/CivilIntake.tsx, app/builder/_components/FamilyIntake.tsx, app/builder/_components/GuidedFormChat.tsx, app/builder/_components/GuidedSmallClaimsIntake.tsx, app/builder/_components/SmallClaimsIntake.tsx, app/builder/_components/StageAnswerPanel.tsx, app/builder/_components/proposalCard.ts, **app/builder/_components/storyAnswers.ts**, app/cases/_components/CaseFilePanel.tsx, src/lib/case-system/caseContextEngine.ts, **src/lib/case-system/caseFile/caseFile.ts**, **src/lib/case-system/caseFile/storyFacts.ts**, **src/lib/case-system/casePosition.ts**, src/lib/case-system/civilWorkflowEngine.ts, src/lib/case-system/contradictions/contradictionDetectionEngine.ts, src/lib/case-system/deadlines/deadlineEvents.ts, src/lib/case-system/deadlines/holidays.ts, src/lib/case-system/events/caseEventCandidates.ts, src/lib/case-system/events/caseEventRequest.ts, **src/lib/case-system/guided-assistant/answeredInStory.ts**, src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts, src/lib/case-system/guided-assistant/conversationMemoryEngine.ts, src/lib/case-system/intake/caseReader.ts, src/lib/case-system/intake/storyAnswerProposals.ts, **src/lib/case-system/intakeReview.ts**, src/lib/case-system/intelligence/intakeNormalizationEngine.ts, src/lib/case-system/intelligence/narrativePrefill.ts, src/lib/case-system/privacy/nameLabels.ts, **src/lib/case-system/sentences.ts**, **src/lib/case-system/situation/situation.ts**, src/lib/case-system/understanding/understandInput.ts, src/lib/case-workspace/aiAnalysis.ts, src/lib/case-workspace/communicationLog.ts, src/lib/case-workspace/courtDecisionStore.ts, src/lib/case-workspace/exhibitBook.ts, src/lib/case-workspace/exhibitNumbering.ts, src/lib/case-workspace/timeline.ts, src/lib/case-workspace/upcomingDeadline.ts, src/lib/content-library/nextStepPractical.ts, src/lib/content-library/sourceDisplay.ts, src/lib/security/limitWords.ts
- Checked by (8): scripts/verification/verifyCaseFile.ts, scripts/verification/verifyChrome29octSafety.ts, scripts/verification/verifyDateEntryPoints.ts, scripts/verification/verifyReviewFollowUps.ts, scripts/verification/verifySituation.ts, scripts/verification/verifyWorkspaceDates.ts, tests/browser/retest-29oct-flow.spec.ts, tests/browser/story-pack.spec.ts

### src/lib/case-system/sentences.ts

Splitting text into sentences.

- Reads (1): **src/lib/case-system/dates.ts**
- Read by (28): app/builder/_components/StageAnswerPanel.tsx, app/builder/_components/childSupportPrefill.ts, app/builder/_components/motionToChange.ts, **app/builder/_components/storyAnswers.ts**, **src/lib/case-system/caseFile/storyFacts.ts**, **src/lib/case-system/caseFile/storyLines.ts**, **src/lib/case-system/casePosition.ts**, **src/lib/case-system/claimAmount.ts**, src/lib/case-system/claimDraftEngine.ts, src/lib/case-system/family/triageStoryQuote.ts, src/lib/case-system/familyAffidavitNarrativeEngine.ts, src/lib/case-system/familyStoryReading.ts, src/lib/case-system/format/previewText.ts, src/lib/case-system/forms/applicabilitySuggestions.ts, src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts, src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts, src/lib/case-system/intake/tidyWording.ts, **src/lib/case-system/intakeReview.ts**, src/lib/case-system/intelligence/intakeNormalizationEngine.ts, src/lib/case-system/intelligence/narrativePrefill.ts, **src/lib/case-system/retrieval/checkedAnswer.ts**, src/lib/case-system/retrieval/crossReferences.ts, src/lib/case-system/statementOfClaimDraftEngine.ts, **src/lib/case-system/storyBasis.ts**, src/lib/case-system/understanding/understandCase.ts, src/lib/case-workspace/courtDecision.ts, src/lib/content-library/nextStepPractical.ts, src/lib/content-library/readability.ts
- Checked by (1): scripts/verification/verifyDateEntryPoints.ts

### src/lib/case-system/copy/rawKeys.ts

Words for stored codes, and the copy guard.

- Reads (4): **app/builder/_components/guidedFields.ts**, **src/lib/case-system/caseFile/caseFile.ts**, src/lib/case-system/intake/questionBank.ts, src/lib/case-system/knowledge/legalReasoningProfiles.ts
- Read by (3): app/cases/_components/CaseFilePanel.tsx, **src/lib/case-system/copy/caseWords.ts**, src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts
- Checked by (4): scripts/verification/verifyChatPlainWords.ts, scripts/verification/verifyRawKeys.ts, scripts/verification/verifyStoryFacts.ts, tests/browser/story-pack.spec.ts

### src/lib/case-system/stage-map/stageMap.ts

The stage map: every step of each court's process.

- Reads (4): src/lib/case-system/deadlines/deadlineEvents.ts, src/lib/case-system/stage-map/citations.ts, src/lib/case-system/stage-map/civilStages.ts, src/lib/case-system/stage-map/familyStages.ts
- Read by (34): app/_components/WhatComesNext.tsx, app/api/assistant/law/route.ts, app/api/case/stage-answer/route.ts, app/api/case/strategy/route.ts, app/api/workspace/organisation/route.ts, app/builder/_components/StageAnswerPanel.tsx, app/builder/_components/motionToChange.ts, app/builder/_components/stageFromAnswers.ts, app/builder/page.tsx, app/cases/[id]/case-file/page.tsx, app/cases/[id]/page.tsx, app/cases/[id]/timeline/page.tsx, app/cases/_components/CaseFilePanel.tsx, app/dashboard/page.tsx, src/lib/case-system/caseFile/stepDeadlines.ts, **src/lib/case-system/casePosition.ts**, **src/lib/case-system/caseStep.ts**, src/lib/case-system/chat/libraryChat.ts, src/lib/case-system/deadlines/deadlineEngine.ts, src/lib/case-system/intake/caseReader.ts, src/lib/case-system/intelligence/groundedCognition.ts, **src/lib/case-system/situation/situation.ts**, src/lib/case-system/stage-map/civilStages.ts, src/lib/case-system/stage-map/familyStages.ts, src/lib/case-system/stage-map/resolveStage.ts, src/lib/case-system/stage-map/stageMessages.ts, **src/lib/case-system/stage-map/stageSequence.ts**, src/lib/case-system/stage-map/suggestedStep.ts, src/lib/case-system/understanding/understandCase.ts, src/lib/content-library/computedDeadline.ts, src/lib/content-library/contentInventory.ts, src/lib/content-library/municipalNoticeFirst.ts, src/lib/content-library/stageAnswerView.ts, src/lib/content-library/stageRules.ts
- Checked by (32): scripts/content/blockGates.ts, scripts/content/draftStageAnswers.ts, scripts/content/promoteContentRun.ts, scripts/content/verifiedContentPipeline.ts, scripts/eval/deadlineCases.ts, scripts/eval/runAccuracyEval.ts, scripts/eval/statementCheck.ts, scripts/law-map/checkLawMap.ts, scripts/rules/checkCorpus.ts, scripts/verification/verifyCaseEvents.ts, scripts/verification/verifyCasePosition.ts, scripts/verification/verifyCaseReader.ts, scripts/verification/verifyCitations.ts, scripts/verification/verifyConferenceStages.ts, scripts/verification/verifyCourtTerms.ts, scripts/verification/verifyDeadlineEngine.ts, scripts/verification/verifyLibraryChat.ts, scripts/verification/verifyMunicipalNoticeFirst.ts, scripts/verification/verifyNextStepCard.ts, scripts/verification/verifyNextStepPractical.ts, scripts/verification/verifyNoticeStep.ts, scripts/verification/verifyPublishedLibrary.ts, scripts/verification/verifyRespondingSide.ts, scripts/verification/verifyServiceDates.ts, scripts/verification/verifySituation.ts, scripts/verification/verifyStageAnswers.ts, scripts/verification/verifyStageMap.ts, scripts/verification/verifyStageResolution.ts, scripts/verification/verifyStageSequence.ts, scripts/verification/verifyStrategy.ts, scripts/verification/verifyTimeRanOut.ts, tests/browser/stage-rule.spec.ts

### src/lib/case-system/stage-map/stageSequence.ts

What comes after each step.

- Reads (3): src/lib/case-system/stage-map/citations.ts, src/lib/case-system/stage-map/civilStages.ts, **src/lib/case-system/stage-map/stageMap.ts**
- Read by (2): app/_components/WhatComesNext.tsx, **src/lib/case-system/situation/situation.ts**
- Checked by (5): scripts/eval/statementCheck.ts, scripts/verification/verifyCitations.ts, scripts/verification/verifyConferenceStages.ts, scripts/verification/verifyNextStepCard.ts, scripts/verification/verifyStageSequence.ts

### src/lib/case-system/content-library/nextStepPractical.ts

The next step's forms, filing and service details.

- Reads (0): nothing in the repo
- Read by (0): nothing
- Checked by (0): no suite imports it directly

### src/lib/case-system/casePosition.ts

The saved position: the step chosen and the step page's date questions.

- Reads (7): **src/lib/case-system/dates.ts**, src/lib/case-system/deadlines/deadlineEvents.ts, src/lib/case-system/deadlines/serviceEffectiveDate.ts, src/lib/case-system/policy/a2iScope.ts, **src/lib/case-system/sentences.ts**, **src/lib/case-system/situation/situation.ts**, **src/lib/case-system/stage-map/stageMap.ts**
- Read by (24): app/_components/IntakeReviewPanel.tsx, app/api/assistant/law/route.ts, app/api/case/stage-answer/route.ts, app/api/case/strategy/route.ts, app/api/cases/position/route.ts, app/api/guided-assistant/route.ts, app/api/workspace/organisation/route.ts, app/builder/_components/EventCandidateSurface.tsx, app/builder/_components/GuidedSmallClaimsIntake.tsx, app/builder/_components/StageAnswerPanel.tsx, **app/builder/_components/guidedFields.ts**, app/builder/_components/positionSave.ts, app/builder/page.tsx, app/cases/[id]/layout.tsx, app/cases/[id]/page.tsx, app/cases/[id]/timeline/page.tsx, app/cases/_components/CaseHomeContext.tsx, app/dashboard/page.tsx, **src/lib/case-system/caseRecord.ts**, **src/lib/case-system/caseStep.ts**, src/lib/case-system/intake/caseReader.ts, src/lib/case-system/intake/caseReaderModel.ts, src/lib/case-system/intake/storyAnswerProposals.ts, src/lib/content-library/municipalNoticeFirst.ts
- Checked by (20): scripts/eval/freeFinishLine.ts, scripts/verification/verifyCaseFile.ts, scripts/verification/verifyCasePosition.ts, scripts/verification/verifyCaseWriteQueue.ts, scripts/verification/verifyChrome29OctFlow.ts, scripts/verification/verifyConferenceStages.ts, scripts/verification/verifyConfirmationRule.ts, scripts/verification/verifyDateEntryPoints.ts, scripts/verification/verifyDeadlineEngine.ts, scripts/verification/verifyGuidedFormChat.ts, scripts/verification/verifyIntakeReview.ts, scripts/verification/verifyNoticeStep.ts, scripts/verification/verifyPendingPositionSaves.ts, scripts/verification/verifyPresumedLimitation.ts, scripts/verification/verifyServiceDates.ts, scripts/verification/verifySituation.ts, scripts/verification/verifyStoryAnswers.ts, scripts/verification/verifyUserStory.ts, tests/browser/harness/thisCommitServer.ts, tests/browser/retest-470.spec.ts

### src/lib/case-system/caseStep.ts

Which step a saved case is at.

- Reads (8): app/builder/_components/builderTypes.ts, **src/lib/case-system/casePosition.ts**, **src/lib/case-system/caseRecord.ts**, src/lib/case-system/claim-types/noticeStep.ts, src/lib/case-system/intake/caseReader.ts, **src/lib/case-system/situation/situation.ts**, **src/lib/case-system/stage-map/stageMap.ts**, src/lib/case-system/stage-map/suggestedStep.ts
- Read by (7): app/api/workspace/organisation/route.ts, app/cases/[id]/case-file/page.tsx, app/cases/[id]/forms/page.tsx, app/cases/[id]/layout.tsx, app/cases/[id]/page.tsx, app/dashboard/page.tsx, src/lib/case-system/forms/applicabilitySuggestions.ts
- Checked by (4): scripts/verification/verifyCasePosition.ts, scripts/verification/verifyCaseReader.ts, scripts/verification/verifyCaseRecord.ts, scripts/verification/verifyConferenceStages.ts

### src/lib/case-system/retrieval/corpusIndex.ts

The law library: the saved official texts, searched by passage.

- Reads (3): docs/sources/corpus/superseded.json, src/lib/case-system/retrieval/corpusChunker.ts, src/lib/case-system/retrieval/decisionChunker.ts
- Read by (9): app/api/intake/sourced-questions/route.ts, **src/lib/case-system/retrieval/checkedAnswer.ts**, src/lib/case-system/retrieval/explainProvision.ts, src/lib/case-system/retrieval/namedProvisions.ts, src/lib/case-system/retrieval/passagesForStory.ts, src/lib/case-system/retrieval/researchStory.ts, src/lib/case-system/retrieval/sourcedQuestions.ts, src/lib/case-system/retrieval/statuteEcho.ts, src/lib/case-system/retrieval/storyRetrieval.ts
- Checked by (17): scripts/eval/coverageProbe.ts, scripts/eval/explainProbe.ts, scripts/eval/researchProbe.ts, scripts/eval/runLawExam.ts, scripts/eval/runRetrievalRecall.ts, scripts/retrieval/buildCorpusIndex.ts, scripts/retrieval/historicalSources.ts, scripts/verification/verifyAssistantLaw.ts, scripts/verification/verifyCaseUnderstanding.ts, scripts/verification/verifyCharterRetest.ts, scripts/verification/verifyCheckedAnswer.ts, scripts/verification/verifyCorpusRetrieval.ts, scripts/verification/verifyMunicipalNoticeFirst.ts, scripts/verification/verifyPlainExplanations.ts, scripts/verification/verifyResearchStep.ts, scripts/verification/verifySourcedQuestions.ts, scripts/verification/verifyStrategy.ts

### src/lib/case-system/retrieval/checkedAnswer.ts

The checked answer: a legal statement passes only when official text supports it.

- Reads (16): src/lib/audit/aiCallLog.ts, src/lib/case-system/aiModels.ts, src/lib/case-system/intelligence/groundedCognition.ts, src/lib/case-system/intelligence/intelligenceTypes.ts, src/lib/case-system/intelligence/quoteMatch.ts, src/lib/case-system/openaiClient.ts, src/lib/case-system/retrieval/checkedAnswerText.ts, **src/lib/case-system/retrieval/citationCheck.ts**, **src/lib/case-system/retrieval/corpusIndex.ts**, src/lib/case-system/retrieval/explainProvision.ts, src/lib/case-system/retrieval/historicalLaw.ts, src/lib/case-system/retrieval/libraryOwned.ts, src/lib/case-system/retrieval/namedProvisions.ts, src/lib/case-system/retrieval/statuteEcho.ts, src/lib/case-system/retrieval/storyRetrieval.ts, **src/lib/case-system/sentences.ts**
- Read by (4): app/api/assistant/law/route.ts, app/api/case/understand/route.ts, src/lib/case-system/retrieval/strategy.ts, src/lib/case-system/understanding/understandCase.ts
- Checked by (5): scripts/eval/runLawExam.ts, scripts/eval/understandingCompare.ts, scripts/verification/verifyCaseUnderstanding.ts, scripts/verification/verifyCheckedAnswer.ts, scripts/verification/verifyStrategy.ts

### src/lib/content-library/publishedLibrary.ts

The published library: the checked blocks a step page shows.

- Reads (2): src/lib/content-library/published/stageAnswers.published.json, src/lib/content-library/stageAnswers.ts
- Read by (3): src/lib/case-system/chat/libraryChat.ts, src/lib/content-library/contentInventory.ts, src/lib/content-library/stageAnswerView.ts
- Checked by (4): scripts/content/promoteContentRun.ts, scripts/verification/verifyLibraryChat.ts, scripts/verification/verifyPublishedLibrary.ts, scripts/verification/verifyStageResolution.ts

### scripts/content/verifiedContentPipeline.ts

The content pipeline: drafting, checking and publishing library blocks.

- Reads (7): src/lib/case-system/openaiClient.ts, src/lib/case-system/stage-map/citations.ts, **src/lib/case-system/stage-map/stageMap.ts**, src/lib/content-library/genericAnswers.ts, src/lib/content-library/readability.ts, src/lib/content-library/readabilityExceptions.ts, src/lib/content-library/stageAnswers.ts
- Read by (0): nothing
- Checked by (9): scripts/content/blockGates.ts, scripts/content/draftGenericBlocks.ts, scripts/content/draftStageAnswers.ts, scripts/eval/runAccuracyEval.ts, scripts/verification/verifyElidedQuote.ts, scripts/verification/verifyGenericLibrary.ts, scripts/verification/verifyPresentationHelp.ts, scripts/verification/verifyStageAnswers.ts, scripts/verification/verifyVerifierRejects.ts

### src/lib/case-system/caseRecord.ts

The saved case read as facts (side, step, dates, amount) for the chat.

- Reads (7): src/lib/case-system/amountNotes.ts, **src/lib/case-system/casePosition.ts**, src/lib/case-system/intake/claimTypes.ts, **src/lib/case-system/intelligence/answeredQuestions.ts**, src/lib/case-system/privacy/modelPayloadNames.ts, **src/lib/case-system/situation/situation.ts**, src/lib/case-system/userStory.ts
- Read by (14): app/api/assistant/law/route.ts, app/api/case/strategy/route.ts, app/api/cases/form-applicability/route.ts, app/api/workspace/documents/decision-help/route.ts, app/api/workspace/exhibit-book/route.ts, app/api/workspace/organisation/route.ts, app/builder/_components/respondingSide.ts, app/builder/page.tsx, app/cases/[id]/case-file/page.tsx, app/cases/[id]/layout.tsx, app/cases/[id]/timeline/page.tsx, app/cases/_components/CaseHomeContext.tsx, **src/lib/case-system/caseStep.ts**, src/lib/case-system/forms/applicabilitySuggestions.ts
- Checked by (7): scripts/eval/freeFinishLine.ts, scripts/verification/verifyCaseRecord.ts, scripts/verification/verifyConferenceStages.ts, scripts/verification/verifyFormsFromCaseFile.ts, scripts/verification/verifyNoNamesToModel.ts, scripts/verification/verifySituation.ts, scripts/verification/verifyStrategy.ts

<!-- generated:who-reads-what:end -->
