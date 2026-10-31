# Code report, 31 Oct 2026: one core per case — what holds, reads, writes and asks each fact today

Read-only analysis of `.tmp-src/proof-goal` at `d9b4dda4` (head of PR #536). No code changed, nothing committed, no servers, no gh.
All paths are relative to that copy. "Prove wrong" = the check that would overturn the claim.

---

## 0. Five findings that matter most for the new core

| # | Finding | Evidence | Prove wrong |
|---|---|---|---|
| F1 | **There is no single writer today.** `give` is a *private* helper inside `caseFileOf` (it builds a file in memory from older stores); nothing outside calls it. Facts are written by ~60 `useIntakeState` fields via `recovery.put`, plus 10 `updateMasterResult` callers, plus 3 raw `cases` writes. | `caseFile.ts:164` (`function give`, not exported); `IntakeRecovery.tsx:420` (`put`), `:646` (`useIntakeState`); `updateCaseRecord.ts:84`; raw writes `builder/page.tsx:1099`, `api/cases/route.ts:346` (upsert), `intakeCheckpoint.ts:120` (insert) | `grep -rn "export function give"` finds one |
| F2 | **The question engine is not used by screens.** `nextQuestion` and `askable` have no caller outside `caseFile.ts`. Screens use `alreadyAsked` (review, guided) and `chatMayAsk` (chats). The three whole forms (`SmallClaimsIntake`, `CivilIntake`, `FamilyIntake`) consult no gate at all. The Small Claims guided route picks questions with its own selector (`selectQuestions`). | `grep "nextQuestion(\|askable("` → only `caseFile.ts`; `intakeReview.ts:373`; `GuidedSmallClaimsIntake.tsx:692`; `GuidedFormChat.tsx:213`; `orchestrateIntakeTurn.ts:467,471,548` | a screen file calling `nextQuestion(`/`askable(` |
| F3 | **The tab is a full copy that wins on load, not a buffer.** On opening a case, the tab's checkpoint is used before the saved one when both exist. | `IntakeRecovery.tsx:204` `snapshot = session?.checkpoint ?? saved ?? …`; tab write `:266` (`writeIntakeSession` of the whole checkpoint) | a test where the tab holds an older revision and the saved row wins without the conflict path (`:203`) |
| F4 | **"After I don't know, nothing asks again" conflicts with today's written rule.** The case file deliberately offers each unsure fact once more (review / "at end"). 42 of the 86 asked-twice carry entries are this re-offer (review, review-entry, form-field after an "unsure"). | `caseFile.ts:25-27`, `:693-701` (`atEnd`), `:776-779` (`offeredOnceMore`); `intakeReview.ts:357-380` (`includeUnknown`) | carry entries whose reason is not `(given at review:… "unsure")` / `held unsure` |
| F5 | **"Removed" is not a state** in `SlotState` (`not-asked/answered/unsure`), it is a flag; and **removal only reaches readers that call `changedWords`/`caseFileOf`**. Copies read directly (case title, dashboard select, form prefill, generate-form `deepPick`, `readCaseRecord.side`, `caseReview.role/stage`) bring removed values back. | `caseFile.ts:50,57`; see §1 table "f" column | — |

---

## PART 1 — per fact

### 1.0 The stores (referred to below by short name)

| Short name | Where | Kind |
|---|---|---|
| **CP** | `cases.master_result.intakeCheckpoint.sections.*` (signed in) — `intakeCheckpoint.ts:9-22` | saved checkpoint (the closest thing to "the one record") |
| **TAB** | `sessionStorage["courtSimplifiedGuestIntakeSession"]` = whole checkpoint, guest **and** signed-in | `intakeCheckpoint.ts:74-80`, `IntakeRecovery.tsx:266,597` |
| **POS** | `master_result.position` (stepId, confirmedStage, claimKind, claimKindAt, dateAnswers, service) | `positionSave.ts:246`, `api/cases/position/route.ts:83` |
| **ID** | `master_result.intakeData` (+ `.extra`, `.extra.civilInput`, `.extra.personAnswers`, `.masterResultPatch`) — analysis copy, written on every "Show my next step" | `builder/page.tsx:903-925,1099`; SC engine `smallClaimsIntelligenceEngine.ts:790-813` (`extra: {...input}`); `CivilIntake.tsx:795-823`; `FamilyIntake.tsx:743-760` |
| **IA** | `master_result.intakeAnswers` (guided answers copy) | `builder/page.tsx:1078` |
| **IF** | `master_result.intakeFacts` (claimFiled/served/defenceFiled + guided facts) | `builder/page.tsx:1021-1028` |
| **FS** | `master_result.familyStatus` (copy of `CP.builder.triageState`) | `builder/page.tsx:350` (CP), `:1244-1250` (FS) |
| **PIC** | `master_result.casePicture` (AI case reader) | `builder/page.tsx:1204`, `api/case/read/route.ts:64` |
| **COL** | columns `cases.title`, `court_path`, `current_stage` | `builder/page.tsx:1102-1105`, `intakeCheckpoint.ts:120-123` |
| **EV** | tables `case_events`, `workspace_documents`, `workspace_timeline_events`, `case_chat_messages` | `api/cases/events/route.ts:239`, `api/workspace/organisation/route.ts:332`, `api/cases/chat/route.ts:98-161` |
| **CHAT** | `localStorage["courtsimplified-ai-case-partner-chat:<case>:<path>:<session>"]` + `sessionStorage[…:route-transfer]` | `CourtAssistantChat.tsx:204-205,553,717,1238` |
| **CS** | React component state seeded from the above (forms, review, overview) | per component |

`caseFileOf` reads, in order (first answer stands, `caseFile.ts:179`): POS.stepId/claimKind (`:235-238`) → CP.situation (`:241-258`) → CP.home.understoodAnswers (`:266-272`) → CP.civil.input / CP.family / CP.small-claims.input (`:274-294`) → CP.family.servedDate (`:297`) → CP.guided.* (`:300-333`) → CP.builder.initialAnswers/Unknowns (`:336-344`) → CP.form-chat.skipped (`:346`) → CP.builder.triageState (`:349-359`) → CP.caseFile.unsure (`:362`) → POS.dateAnswers (`:365-366`) → ID.extra (claim kind, issues, elementStateMap; `:369-383`) → IA (`:384-391`) → CP.caseFile.turnedDown (`:409`) → **CP.caseFile.changes last, wins** (`:417`, `applyChanges :510-538`).

So caseFileOf itself still reads **three older saved copies** (POS, ID.extra, IA). A removed fact cannot come back *through caseFileOf* (changes applied last), but each copy is still read directly elsewhere (column f).

### 1.1 Per-fact table

Legend: **1** = the one source caseFileOf uses first today; others are copies. Carry = entries in `tests/browser/harness/carryBaseline.json` (128 total).

| Fact | a. Own copies | b. Readers outside caseFileOf | c. Writers | d. Asked / shown (court, route) | e. Asked after answered | f. Removed value comes back via | Carry |
|---|---|---|---|---|---|---|---|
| **side** | **1** CP.situation (`situation.ts`); CP.civil.input.yourRole, CP.family.yourRole (`FamilyIntake.tsx:289`), SC input.yourRole (`SmallClaimsIntake.tsx:118`); ID.extra.yourRole, ID.extra.civilInput.yourRole, ID.extra.personAnswers.side (`CivilIntake.tsx:827`); IF.role; POS.confirmedStage="responding" | `readCaseRecord.side` → `sideFromParts` (`caseRecord.ts:95-117,162`) used by 6 routes + case layout; `caseReview.ts:259` (`role: extra.yourRole`); overview `IntelligenceOverviewPanel.tsx:129`; guard `sd.yourRole` lists 21 files | situation gate (`useSituation`, `IntakeRecovery.tsx:784`); forms; analysis save | situation (all courts); SC guided `sc-orient-role`; forms; review; overview "Your role" | forms do not gate | `readCaseRecord.side` never applies the change record (only amount/otherParty do, `caseRecord.ts:140-141`); `caseReview.ts:259` | 0 |
| **court** | **1** CP.situation.court; checkpoint.courtPath; COL.court_path; ID.courtPath; master.courtPath; persistedRecord.casePath (`builder/page.tsx:914`) | `areaOfMaster` (`caseFileOfMaster.ts:19-25`); guard `co.courtCopies` 28 files read `court_path` | `createCheckpointCase` (`intakeCheckpoint.ts:121`); `builder/page.tsx:1104`; `api/cases/route.ts:165` | home/not-sure guide; builder `?path=` | — | COL.court_path read by 28 files directly | 0 |
| **stage** | **1** POS.stepId; CP.situation.stage; CP.family.caseStage (`FamilyIntake.tsx:284`), civil/SC caseStage; COL.current_stage; ID.caseStage; persistedRecord.stage; PIC; EV-derived stage | guard: 113 entries / 57 files (`st.*`), e.g. `cases/[id]/page.tsx:124` reads `current_stage`; `caseReview.ts:260` (`stage: intake.caseStage`); `caseStep.ts:44,51` | `positionSave.ts:246`; `builder/page.tsx:1105`; situation; forms | situation; results StageConfirmation (`builder/page.tsx:2397`); case page (`cases/[id]/page.tsx:222`); step page | StageConfirmation offered after situation answer (guard `st.confirmedStage`, 23 files) | COL.current_stage, `caseReview` stage, PIC | 0 |
| **filed / papers / documents** | **1** CP.situation.filed/papers; CP.*.documents/filedDocuments; ID.extra.filedDocuments/documents/civilInput.documents (`caseRecord.ts:76-84`); ID.extra.personAnswers.filed (`CivilIntake.tsx:829`); IF.claimFiled/claimServed (`builder/page.tsx:1022-1023`) | `documentsOf` / `readCaseRecord.documents` (`caseRecord.ts:150,175`); overview `IntelligenceOverviewPanel.tsx:133`; `caseReview.ts:254` | situation; forms; analysis save | situation; forms; review; overview | forms ungated | `documentsOf` reads ID only (no change record) | 0 |
| **servedDate** | **1** CP.situation.receivedOn; CP.family.servedDate; family timeline; POS.dateAnswers (`sc-date-claim-served`…); IA | `withCaseFileDates` (`caseFile.ts:877-902`); `readCaseRecord.dates` (`caseRecord.ts:144-153`) from IA+POS | situation; family form; StageAnswerPanel | situation; family form; step page date questions | — | `readCaseRecord.dates` from IA/POS (no change record) | 0 |
| **amount** | **1** CP.small-claims.input.amountClaimed / civil.input / guided answers `sc-amount-claimed`; ID.extra.amountClaimed, civilInput.amountClaimed | `readCaseRecord.amount` (`caseRecord.ts:166`, change-aware); overview `IntelligenceOverviewPanel.tsx:145` (change-aware); **`generate-form` `:724` (deepPick, not change-aware)**; guard `am.*` 33 entries | forms; guided; analysis save | SC guided; SC/civil form; review; overview | SC form shows amount after guided answer (carry) | generate-form `deepPick` over whole row (`route.ts:445-470`) | 6 (SC: asked-twice 4 questions route, screens-disagree 2 overview) |
| **otherParty** | **1** CP.civil.input.otherParty / CP.family.otherParty (`FamilyIntake.tsx:314`) / SC input; ID.otherParty, ID.extra.otherParty, civilInput.otherParty; **COL.title** (`builder/page.tsx:1102` via `caseTitleFromIntake`); civil/family narrative `"Other party: X"` in ID.facts (`CivilIntake.tsx:243`, `FamilyIntake.tsx:536`) | **`CaseHomeContext.tsx:66-68`** (title, case page + case file header); **`dashboard/page.tsx:173,190`** (`master_result->intakeData->otherParty`); `case-file/page.tsx:205` (record, change-aware); `generate-form/route.ts:588-596`; `caseReview.ts:265` (change-aware); drafts `caseDrafts`, `startingDocumentDraft`, `respondingDocumentDraft` | forms; analysis save; title column | forms (all courts); review entry "The other party/side/person" | review entry shown though held (carry, civil/family/SC) | title column + CaseHomeContext; dashboard JSON select; **form prefill `storedIntakeValues` (`caseRecord.ts:196-226`, used `builder/page.tsx:2156,2208`)**; generate-form | **60** (civil 27, family 27, SC 6; 42 returned-after-removal, 18 asked-twice) |
| **children** | **1** CP.builder.triageState.record; CP.family.childrenInfo (`FamilyIntake.tsx:315`); FS (`builder/page.tsx:1244`) | `FamilyStatusTriage.tsx:131`; family analyze route; guard `ch.*` 20 entries | triage; family form | Family triage; family form; review | review re-offers after "unsure" | FS read by `caseRecord`, `applicabilitySuggestions` (guard `ch.familyStatus`) | 4 (family asked-twice) |
| **married / marriedWhere** | **1** CP.builder.triageState.record.marriedToOtherParty; FS; story sentence (`caseFile.ts:153-158,354-357`); placeOfMarriage | triage; family engines | triage | Family triage | — | FS copy | 0 |
| **claimKind** | **1** POS.claimKind; CP.guided.matchedClaimType/pendingSuggestion/rejectedSuggestionIds (`GuidedSmallClaimsIntake.tsx:590-601`); CP.civil/family issues; ID.extra.confirmedClaimTypeId (old cases); CP.caseFile.turnedDown | `claimKindOf` everywhere (good); guard `ct.*` 27 entries | overview pick; guided tick; forms | SC guided; overview list; Form 7A section | — | (old) ID.extra read only as fallback (`caseFile.ts:369-376`) | 0 |
| **wants** | **1** CP form goal/legalRemedy/remedySought; guided `sc-remedy-sought`; home understoodAnswers; ID.goal, ID.extra.legalRemedy | overview `:146` (change-aware); `case-file/page.tsx:209-211` (**`intake.goal`, not change-aware**); `caseReview.ts:271` (aware); generate-form `requestedResult :649` | forms; guided; review; home | home card; SC guided; forms; review | form field after review "unsure" (SC, civil) | `case-file/page.tsx:211`; generate-form | 24 (SC 16, civil 8; all asked-twice) |
| **whenHappened** | **1** guided `sc-orient-when-happened`; review; POS.dateAnswers `case-date-act-or-omission`; IA | `withCaseFileDates`; `readCaseRecord.dates` | guided; review; StageAnswerPanel | SC guided; review; SC form; step page | SC form field after review "unsure" | IA/POS via readCaseRecord | 10 (SC) |
| **dateInOwnSentence** (not a slot) | EV case_events candidates from story sentences | `EventCandidateSurface.tsx` | event surface | "What kind of step was this?" on form/guided/results | asked again on each step (carry) | — | 14 (SC) |
| **urgent** | **1** CP.family.urgent (`FamilyIntake.tsx:331`), civil/SC input.urgent; ID.urgent, ID.extra.urgent | `storedIntakeValues :219`; family/civil engines | forms; review | forms; review (civil, family) | review re-offers after "unsure" | form prefill `storedIntakeValues` | 10 (civil 5, family 5) |
| **conferenceDate / courtDate** | **1** CP.family.upcomingCourtDate; POS.dateAnswers; EV | `withCaseFileDates`; family engines | family form; StageAnswerPanel | family form; step page | — | POS | 0 |
| **defenceFiled / outcome** | guided `sc-defence-filed`; IF.defenceFiled (`builder/page.tsx:1024`); `defendantOutcomeText` | `caseStageFromEvents`; `sideChange.ts` | guided | SC guided | — | IF | 0 |
| **story** (not a slot) | **1** CP.story.text (`intakeStory.ts:18-30`); ID.facts (narrative), ID.extra.story, civilInput.facts; CP.guided.messages (`:547`); CP.form-chat.heard; CHAT transcript; home understood | `userStory` in 15 files (guard `sy.userStory`); generate-form `facts :629`; AI calls (§2.4) | StoryEditor; HomeLocationGate (`HomeLocationGate.tsx` put STORY_SECTION text) | home; every intake; review | — | ID copies read by `userStory` (`userStory.ts:128-138`) | 0 |
| **city / location** (not a slot) | **1** CP.story.location (`intakeStory.ts:41-52`); CP.builder.intakeCity (`builder/page.tsx:395`); SC input.yourCity; civil input.city; ID.extra.yourCity/city/civilInput.city; courtLocation fields; family municipality (`FamilyStatusTriage`); `sessionStorage` courtPathFinder | `readCaseRecord.city` (`caseRecord.ts:173`); `CourtAssistantChat.tsx:85`; generate-form `courtLocation :712` | location gate; forms | home; builder city box (`builder/page.tsx:1970`); forms | — | ID copies | 0 |
| **evidence / documents uploaded** (not a slot) | form `evidence`/`missingEvidence`/`uploadedEvidenceFiles`; EV workspace_documents; ID.evidence | `caseReview.ts:268`; overview `ev.typedEvidence`; generate-form `evidenceSummary :643` | forms; workspace upload | forms; chat `chat:proof` | **chat can always ask** — `evidence` is not a slot (`factsOfQuestion.ts:41`, `caseFile.ts:44-48`), only the conversation check stops it (`caseFile.ts:742`) | — | 0 |

**Facts the gate cannot hold** (they are question facts but not in `SLOT_FACTS`): `evidence`, `story`, `serviceMethod`, `courtFileNumber`, `claimIssuedDate`, `defenceFiledDate`, `filedDocuments`, `situation`, `claimServed` (`factsOfQuestion.ts:14-17` vs `caseFile.ts:44-48`). `alreadyAsked` on these returns false forever, so any screen may ask them again. Prove wrong: add one to SLOT_FACTS and see a carry entry disappear.

### 1.2 Carry list grouped (128)

| Fact | Total | civil | family | small-claims | asked-twice | returned-after-removal | screens-disagree |
|---|---|---|---|---|---|---|---|
| otherParty | 60 | 27 | 27 | 6 | 18 | 42 | 0 |
| wants | 24 | 8 | 0 | 16 | 24 | 0 | 0 |
| dateInOwnSentence | 14 | 0 | 0 | 14 | 14 | 0 | 0 |
| urgent | 10 | 5 | 5 | 0 | 10 | 0 | 0 |
| whenHappened | 10 | 0 | 0 | 10 | 10 | 0 | 0 |
| amount | 6 | 0 | 0 | 6 | 4 | 0 | 2 |
| children | 4 | 0 | 4 | 0 | 4 | 0 | 0 |
| **Total** | **128** | 40 | 36 | 52 | 84 | 42 | 2 |

By screen: review-entry 29, form-field 19, review 22, event-candidate 14, overview 8, case file 12, case page 12, dashboard 6, form-after-second-case 6.

**Where each removal entry most likely comes from** (code reading; prove by capturing the DOM text the carry test matched):

| Carry "where" | Likely copy | Line |
|---|---|---|
| case page / case file header, dashboard card | `cases.title` = "…Testwood…", built from otherParty, never rebuilt on removal; CaseHomeContext falls back to `intakeData.otherParty` | `builder/page.tsx:1102`; `CaseHomeContext.tsx:66-68`; `dashboard/page.tsx:173,190` |
| form (first case by address) | prefill from ID copy | `caseRecord.ts:209` via `builder/page.tsx:2156,2208`; Family `FamilyIntake.tsx:314` initialValues |
| overview (civil, family) | analysis text written from the narrative that embeds "Other party: X" | `CivilIntake.tsx:243`, `FamilyIntake.tsx:536` → `intakeAnalysis` |

---

## PART 2 — map audit

### 2.1 How SITE_MAP.md's generated part is made

- Generator: `scripts/docs/generateSiteMapGraph.ts` (`npm run docs:site-map`; CI `npm run test:site-map` = `--check`, `:153-158`).
- Includes: a hand-kept list of 36 "shared pieces" (`SHARED`, `:24-61`); for each, what it imports and who imports it, across `app/ src/ scripts/ tests/` (`:63`); a screens table of 6 facts from `FACT_PIECES` (`:67-74`, `:118-125`).
- **Leaves out:**
  1. Anything not imported: string keys (`"master_result"`, `master_result->intakeData->otherParty`), `.from("cases")`, `sessionStorage`/`localStorage` keys, `fetch("/api/…")` between screen and route, props passing facts down. Only `import … from` / `import()` are parsed (`:98`); `require` ignored.
  2. Modules not on `SHARED`: notably **`intakeCheckpoint.ts`, `updateCaseRecord.ts`, `supabase/serverAuth.ts`, `IntakeRecovery.tsx`, `openaiClient.ts`, `aiCaseContext.ts`, `positionSave.ts`, `intakeStorageKeys.ts`, `caseReview.ts`** — the actual readers/writers of the record. (Some are described in the hand-written part, e.g. `SITE_MAP.md:84,110`, but are not graphed.)
  3. Screens that import none of the 6 FACT_PIECES are dropped from the screens table (`:118`).

### 2.2 Independent inventory of case-data access (app/ + src/)

Patterns searched: `.from("cases")`, `master_result`, `intakeCheckpoint`/`readIntakeSession`/`writeIntakeSession`/`saveCheckpoint`, `useIntakeRecovery`/`recovery.put`, `session/localStorage`, `caseFileOf(Master)`, `readCaseRecord`, `updateMasterResult`, OpenAI calls, `aiCaseContext`, `fetch("/api/cases|case|generate-form|guided-assistant|assistant|workspace")`. **130 files match; 26 never appear in SITE_MAP.md; 12 appear by base name only.**

Raw `cases` table access (20 calls in 11 files): `api/cases/route.ts:213,246,321,347,422`; `api/workspace/documents/decision-help/route.ts:112`; `builder/page.tsx:1054,1099`; `builder/_components/positionSave.ts:234`; `cases/[id]/layout.tsx:94`; `dashboard/page.tsx:171`; `forms/FormsWorkspace.tsx:445`; `_components/IntakeRecovery.tsx:154`; `intakeCheckpoint.ts:83,120,133`; `updateCaseRecord.ts:71,84`; `supabase/serverAuth.ts:110`.

`master_result` writers: `updateCaseRecord.ts:84` (10 callers: `api/case/read:64`, `api/cases/drafts:72,92`, `api/cases/form-applicability:237`, `api/cases/position:83`, `builder/page.tsx:1204,1244`, `positionSave.ts:246`, `analysisSafetyGate.ts:118`, `intakeCheckpoint.ts:92,141`); raw `builder/page.tsx:1099`; `api/cases/route.ts:346` upsert of a whole client-built row (`buildCaseRow :145`) — **no caller found in app/src by string search** (prove wrong: a fetch with a computed URL); `intakeCheckpoint.ts:120` insert.

Server loaders: `serverAuth.ts:90,141,176` (`getAuthenticatedOwnedCase*`) used by 19 routes — **serverAuth.ts is not in SITE_MAP.md**.

Browser storage of case data: `IntakeRecovery.tsx:193,236,266,597,767`; `HomeLocationGate.tsx:260`; `login/page.tsx:104,133,138`; `CourtAssistantChat.tsx:553,564,717,1238`; `builder/page.tsx:585-593`; `IntakeRecovery.tsx:573-580`; `NotSureCourtGuide.tsx:58`; `cases/[id]/drafts/page.tsx:87,270` (legacy local drafts).

### 2.3 Files touching case data that are MISSING from SITE_MAP.md

| File | What it touches | Line |
|---|---|---|
| `src/lib/supabase/serverAuth.ts` | reads `cases` + `case_events` for 19 routes | `:110,165` |
| `app/api/generate-form/route.ts` | fills court forms by `deepPick` over whole row | `:445,560,1308` |
| `app/api/small-claims/analyze/route.ts`, `civil/analyze`, `family/analyze` | analysis, AI research context, case events | SC `:4,292`; civil `:4,97`; family `:15` |
| `app/api/case/review/route.ts` | own case-file builder `caseFileFromMasterResult` + AI | `:48` |
| `app/api/cases/drafts/route.ts` | writes `master_result.drafts` | `:72,92` |
| `app/api/cases/event-candidates/route.ts` | case_events, dismissals | `:122-232` |
| `app/api/intake/classify-claim-type/route.ts` | AI with claim-kind context | — |
| `app/api/intake/tidy-wording/route.ts` | AI on person's words | — |
| `app/api/classify-court-path/route.ts` | AI on story | — |
| `app/api/workspace/documents/analyse`, `extract`, `upload-url`, `file/[id]/[name]`, `workspace/export` | case documents | — |
| `app/forms/page.tsx` (+ `FormsWorkspace.tsx` graphed) | reads `cases` | `FormsWorkspace.tsx:445` |
| `app/builder/_components/CaseReviewPanel.tsx`, `EvidenceUploadCard.tsx`, `cases/_components/CourtDecisionPanel.tsx` | call case APIs | — |
| `app/_components/NextStepStatus.tsx`, `builder/_components/MunicipalNoticeFirst.tsx`, `StoryEditor.tsx` | write CP via recovery | `MunicipalNoticeFirst.tsx:49`; `StoryEditor.tsx:56` |
| `app/_components/NotSureCourtGuide.tsx`, `startSignIn.ts` | sessionStorage intake keys | `NotSureCourtGuide.tsx:58` |
| `src/lib/case-system/drafts/caseDrafts.ts`, `events/caseAnalysisFreshness.ts`, `formsSelectedCase.ts`, `civilStrategyEngine.ts` | read master_result shapes | — |
| `src/lib/case-system/storage/pendingPositionSaves.ts`, `resetIntake.ts`, `storyDataRegistry.ts` | storage keys / registry | — |
| `src/lib/case-workspace/decisionHelp.ts`, `content-library/crisisMessages.ts`, `privacy/modelNameContext.ts` | OpenAI client | `decisionHelp.ts:38` |
| `src/lib/case-system/builderDraftStorage.ts`, `architecture/masterCaseSchema.ts` | dormant shapes (no importer of builderDraftStorage found) | — |

Base-name only (not graphed): `updateCaseRecord.ts`, `intakeStorageKeys.ts`, `courtPathClassifier.ts`, `researchQuestion.ts`, `resolveCasePosition.ts`.

### 2.4 Every OpenAI call and where its case context comes from

All go through `createOpenAIClient` (`openaiClient.ts:304`). Only two take context from the case file's builder (`aiCaseContext.ts`).

| Model call | Route(s) | Case context from | Via aiCaseContext? |
|---|---|---|---|
| `courtSimplifiedBrain.ts:2108` (+ `researchStory.ts:456`, `storyRetrieval.ts:279,296`) | small-claims/civil/family analyze | request body; research context built **in the browser** from `caseFileOf(checkpoint)` (`CivilIntake.tsx:766`, `FamilyIntake.tsx:672`, `SmallClaimsIntake.tsx:966`, `builder/page.tsx:6`) then `parseResearchCaseContext` | yes (partly; the rest of the input is the form copy) |
| `claimTypeAiClassifier.ts:151` | intake/classify-claim-type; guided-turn | `classifyClaimTypeBody(claimKindAiContext(caseFileOf…))` `GuidedSmallClaimsIntake.tsx:869` | yes |
| `extractIntakeFacts.ts:93,182` | guided-turn (`orchestrateIntakeTurn`) | guided facts in body | no |
| `storyAnswerProposals.ts:249` | guided-turn, depth-turn | story in body | no |
| `safetyPass.ts:182` | intake/safety-check | story in body | no |
| `tidyWording.ts:207` | intake/tidy-wording | text in body | no |
| `courtPathClassifier.ts:985` | classify-court-path | story in body | no |
| `understandCase.ts:525`, `checkedAnswer.ts:700` | case/understand, assistant/law | story / `readCaseRecord` + `caseFactsText` (`caseRecord.ts:233`) | no |
| `researchQuestion.ts:71` | assistant/law | `readCaseRecord` (`law/route.ts:122`) | no |
| `caseReaderModel.ts:48` | case/read | master (`userStory`, IA) | no |
| `resolveCasePosition.ts:364` | case/resolve-stage | body | no |
| `explainProvision.ts:325` | law/explain | provision | n/a |
| `sourcedQuestions.ts:432` | intake/sourced-questions | story in body | no |
| `caseReviewModel.ts:152` | case/review (`runCaseReview`) | `caseFileFromMasterResult` (`caseReview.ts:243`, own reader) | no |
| `decisionHelp.ts:38` | workspace/documents/decision-help | `readCaseRecord(...).story` (`route.ts:117`) | no |
| `strategy` | case/strategy | `readCaseRecord` (`strategy/route.ts:76`) | no |
| `libraryChat.ts:377` | none found (dormant) | — | — |

---

## PART 3 — proposed CI check (not built): `test:case-data-access`

**Rule it enforces:** every file that touches case data is either (i) one of the core modules (`caseFile/*`, the one writer, the one loader) or (ii) listed in the generated map as reading through them; anything else fails.

| Access kind | How detected | Catches | Misses |
|---|---|---|---|
| Imports | import graph (reuse `generateSiteMapGraph.ts` resolver `:89-108`); a file importing `intakeCheckpoint`, `updateCaseRecord`, `serverAuth` loaders, `openaiClient` must be on the core list | new reader/writer modules | facts passed by props; dynamic import with variable path |
| Table | regex `\.from\(\s*["']cases["']\)`, `\.rpc\(`, and the other case tables (`case_events`, `case_chat_messages`, `workspace_*`) | new raw DB access | a table name in a variable; SQL in migrations/RPCs |
| JSON paths | regex `master_result\b`, `master_result->`, `intakeData`, `intakeAnswers`, `intakeFacts`, `familyStatus`, `casePicture`, `position\b` on a master object | dashboard-style selects (`dashboard/page.tsx:173`), copies the current guard misses | keys built by string concatenation; `deepPick` (walks any key — must be banned by name) |
| Browser storage | regex `(session\|local)Storage\.` outside `intakeStorageKeys.ts` + `IntakeRecovery.tsx`; and key literals must come from `NAMED_STORAGE_KEYS` (`intakeStorageKeys.ts:453`) | new tab copies (e.g. chat transcript `CourtAssistantChat.tsx:553`) | storage via a wrapper (`getBrowserStorage()`) unless the wrapper is also matched |
| Checkpoint sections | regex `useIntakeState\(\s*"([^"]+)"` / `recovery.put\(` — section names must be in an allowed list that shrinks as courts move | a new section = a new copy of a fact | sections chosen at run time (`StoryEditor.tsx:56` takes `section` as a prop) |
| API between screen and route | regex `fetch\(["'\`]/api/` — each route called must be in the map | screens calling unmapped routes | URLs built from variables |
| AI calls | `createOpenAIClient\(` / `chat.completions.create` must sit in a module whose route builds context with `aiCaseContext` (assert the route imports it) | AI calls fed raw copies | context assembled from a copy *after* importing aiCaseContext |

**Per-line, not per-file.** The existing guard reports only the first match of each pattern per file (`verifyCaseFileGuard.ts:62-65` `findIndex`), so a second copy inside an already-allowed file (`builder/page.tsx` has many) is invisible. The new check should count matches per file and allow a count that may only go down.

**How every miss becomes permanent:** each miss found by the carry test or a review is added as (1) a regex in the pattern file with the inventory row, and (2) a planted-copy self-test, the same way the guard already plants a new copy, an added entry and a stale entry each run (`verifyCaseFileGuard.ts:26`). The allowed list may only shrink against `origin/main` (as the guard does, `:16-17`).

**Relation to what exists:**
- `test:case-file-guard` (`verifyCaseFileGuard.ts`, 603 allowed entries, 37 fact groups, 113 for stage alone) names *copies by shape*. Known gaps: dashboard's `master_result->intakeData->otherParty` matches no `op.otherParty` regex (`caseFileGuardPatterns.ts:135` only matches `intakeData.otherParty` dotted forms); per-file not per-line; AI patterns are module names only (`:163-173`), so `checkedAnswer`, `researchQuestion`, `tidyWording`, `safetyPass`, `explainProvision` calls are not tracked as fact readers.
- `test:shared-behaviour` (`verifySharedBehaviour.ts`) bans re-implementing a *behaviour* outside its module; grep finds 3 `name:` entries in `sharedBehaviourRegistry.ts`. The new check is the *data* counterpart; the two can share the walker and the comment-stripping (`verifySharedBehaviour.ts:37-40`).
- `test:site-map` only checks the generated part is fresh, not that it is complete. The new check closes that: "touches case data" ⇒ "in the map".

---

## PART 4 — the separate ways of answering today

| Component | Court / route | Its own state | Gate used | Note |
|---|---|---|---|---|
| `GuidedSmallClaimsIntake.tsx` (1782 lines) | SC questions | CP.guided: facts, answeredIds, messages, earlierAnswers, matchedClaimType, pendingSuggestion, depth*, proposalDrafts… (`:544-648`) | `alreadyAsked` only to pre-mark answered (`:692`); next question from server `selectQuestions` (`orchestrateIntakeTurn.ts:467`) | its own question bank order |
| `SmallClaimsIntake.tsx` (1652) | SC whole form | CP.small-claims.input (`:622`), ~35 fields (`:100-135`); prefill from `storedIntakeValues` (`builder/page.tsx:2156`) | none (caseFileOf only for kind, `:715,966`) | |
| `CivilIntake.tsx` (1362) | civil form + questions | CP.civil.input (`:508`), mode (`:565`), personSet/personDocuments | none on form; `GuidedFormChat` for questions (`:997`) | narrative embeds names (`:243`) |
| `FamilyIntake.tsx` (1344) | family form + questions | ~20 separate CP.family.* fields (`:280-353`) | none on form; `GuidedFormChat` (`:945`) | narrative embeds names (`:536`) |
| `GuidedFormChat.tsx` (521) | civil/family questions | CP.form-chat: heard, changing, needsMore, knownAtStart, skipped (`:182-192`) | `chatMayAsk`, `offeredOnceMore` (`:202-213`) | writes back into civil/family form copies |
| `IntakeReviewPanel.tsx` (375) | all courts, review | writes CP.builder.initialAnswers/Unknowns and back into civil.input / family.* / small-claims.input | `remainingEssentialQuestions` → `alreadyAsked` (`intakeReview.ts:357-380`) | re-offers unsure once (F4) |
| `FamilyStatusTriage.tsx` (501) | family | CP.builder.triageState + FS copy | own | two saved copies |
| `app/builder/page.tsx` (2710) | all | CP.builder: step, triageState, intakeCity, startedModes (`:350-430`); analysis save (`:1099`) | — | chooses component per court (`:2044-2208`) |
| `HomeLocationGate.tsx`, `SourcedQuestions.tsx`, `StageAnswerPanel.tsx` (2205), `EventCandidateSurface.tsx`, `CourtAssistantChat.tsx` (1587) | home / follow-up / step page / events / chat | CP.home, CP.sourced, POS, EV, CHAT | chats: `chatMayAsk` via `answeredInStory.ts:21,48` | each asks facts its own way |

Input for "one intake page": five question surfaces (guided SC, GuidedFormChat, three forms) + review + triage + events + step-page dates each hold state; only the chats and the review consult the gate.

---

## PART 5 — can the carry test run off the shared staging site?

### What the repo already shows

| Item | Evidence |
|---|---|
| Local Supabase config exists: Postgres 17 (matches hosted 17.6.1), auth `minimum_password_length = 6`, `enable_confirmations = false` (same as staging), seed paths include the catalogue snapshot | `supabase/config.toml:26,63,203,247,282,92` |
| Seed = `seed.sql` (2.9 KB) + `snapshots/20260822_catalogue_data_snapshot.sql` (561 KB) | `ls -l supabase/snapshots` |
| 22 migrations; the `case-evidence` bucket is now created by a migration | `supabase/migrations/20260926120000_case_evidence_bucket_private.sql:1-20` |
| CI already builds a real Postgres from the migrations (no Supabase, no secrets, ~10 s) — but **plain Postgres + a stand-in bootstrap, no auth/PostgREST/storage API**, so it cannot serve the app | `.github/workflows/courtsimplified-ci.yml:143-147`; `scripts/verification/verifyRlsMatrix.mjs:1-50` |
| Production refusal is by ref regex `https://<20 chars>.supabase.co`; a local `http://127.0.0.1:54321` URL gives ref `null` and passes | `scripts/db/assertNotProduction.ts:56-60`; `tests/browser/harness/realTestSession.ts:97-101,187-191`; `scripts/walkthrough/guard.ts` |
| Carry workflow: 4 matrix machines, `npm run build` + `next start` on the runner, staging via `STAGING_*` secrets, site password generated per run | `.github/workflows/courtsimplified-carry.yml:22-90` |
| No CSP or code pins the URL to `*.supabase.co` | grep of `next.config.ts`, `middleware.ts`: none |
| Timeouts that failed under load | `positionSave.ts:55,63` (10 s) |
| Docker is installed on this Windows machine (29.7.2); Supabase CLI is not in `node_modules/.bin` | `docker --version`; `ls node_modules/.bin` |
| Earlier analysis of exactly this choice | `docs/ARCHITECTURE.md:468-475` |

### (a) Local stack (`supabase start`) inside each Actions job (and on the PC)

- **Set up:** add `supabase/setup-cli` step; `supabase start` (migrations + `[db.seed]` load on first start; verify with `count(*)` on `court_form_library` = 723 per CLAUDE.md §6); export `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local anon/service keys that `supabase status -o env` prints (masked) **before** `npm run build` (the `NEXT_PUBLIC_*` values are baked into the build); keep the guard step (local passes). Add a positive check to the guard that the URL is either local or the staging ref, so a mis-set secret cannot point elsewhere. `grantSiteAccess` needs nothing new (site password is per run already).
- **Founder dashboard steps:** none in Supabase or Vercel. GitHub: nothing, unless choosing to keep the `STAGING_*` secrets for other workflows (keep them).
- **Days:** 1–2 (estimate). Wrong if the migrations fail on `supabase start` (e.g. extensions in the squashed baseline) — find out by one local `supabase start` on this PC.
- **Differences from staging:** no network latency (runner↔ca-central-1 removed), so timeout bugs under real latency are **hidden**; one private DB per machine, so contention bugs are hidden too (the 57014 class); local GoTrue/storage versions may differ from hosted; no Vercel (already true today); rate limits: `AI_RATE_LIMITS: local` already. Catalogue = the August snapshot plus the two correction migrations (`20261004130000`, `20261014200000`); staging may hold later hand edits — compare `count(*)` per catalogue table once.
- **Runs/day:** each machine adds ~2–4 min (image pull ~1–2 GB, estimate) to today's ~20–40 min. With 4 machines per run and no shared DB, runs no longer block each other: limited only by runner concurrency (20 concurrent jobs on GitHub Free, estimate from GitHub docs) → ~5 full runs in parallel. Minutes: ~4 × 30 = ~120 billed min/run (estimate). If the repo is private on GitHub Free (2,000 min/month), that is **~16 runs/month** before other CI; if public, standard runners are free. Prove wrong: the Actions usage page for one carry run.
- **Cost:** $0 for Supabase; Actions minutes as above.

### (b) A second hosted Supabase test project

- **Set up:** create project in ca-central-1; `supabase db push` the migrations + load `seed.sql` and the snapshot (CLAUDE.md §6: migrations alone give zero catalogue rows); add its ref to `supabase/environments.json` and to the guard's allowed refs; set auth (min 6, no confirmation); new secrets `CARRY_SUPABASE_URL/PUBLISHABLE_KEY/SERVICE_ROLE_KEY`; point `courtsimplified-carry.yml:41-45` at them; keep-alive workflow for it (`supabase-keep-alive.yml` exists for pausing).
- **Founder dashboard steps:** Supabase → New project (org, name, region Canada Central, strong DB password stored in a password manager) → Authentication settings: minimum password 6, turn off "Confirm email" → API settings: copy URL, publishable key, service role key **straight into** GitHub → Settings → Secrets → Actions as the three `CARRY_*` secrets (never into chat). Vercel: nothing.
- **Free plan limit:** Supabase free tier allows **2 active free projects** (estimate from Supabase pricing; prove on the org billing page). Prod + staging already use both → a third needs **Pro, $25/month (estimate)**, or pausing one.
- **Days:** 1–2 for setup, plus ongoing: every migration applied to three projects (`applyMigrations.ts` enforces staging-before-production only).
- **Differences:** same latency/region as staging (good: real timeouts), but a free/nano instance shared by 4 machines would again contend; same contention problem moves, not disappears, unless split per machine (4 projects — not possible on free).
- **Runs/day:** still one at a time if 4 machines share it (the current problem) → ~2/hour at 30 min (estimate); minutes cost same as (a).

### Recommendation: **(a) the local stack in each job**, with staging kept for one nightly / pre-merge real-latency run.

Reasons: no new project or bill, no new secrets, no third migration target, isolation per machine removes the cross-run interference that caused the missed steps, and the carry test counts *what the site asks and shows*, which does not depend on network latency. What it gives up (latency and contention realism) is exactly what the occasional staging run keeps. Main risk: the squashed baseline migration failing under `supabase start`; one local try on this PC (Docker present) settles it before any workflow change.

All numbers above are estimates; each states what would prove it wrong.
