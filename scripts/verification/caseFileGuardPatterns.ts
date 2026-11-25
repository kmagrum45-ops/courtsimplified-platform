/**
 * THE CASE FILE GUARD'S PATTERNS: EACH WAY A CASE FACT IS KEPT OR READ OUTSIDE THE CASE FILE
 * (site owner, 29 Oct: "everything a person tells the site is stored once, in the case file").
 *
 * Derived from the fact inventory of 29 Oct (origin/main f7bdfb99, 147 rows: 146 places and row
 * #107, the number of defendants, kept nowhere). Each pattern is the concrete code shape the
 * inventory found for one of its rows: a key of a second store (`extra.confirmedClaimTypeId`), a
 * local copy (`draftClaimTypeId`), a second reader (`readCaseRecord`), an own date reader, an AI
 * prompt built from raw text. `rows` names the inventory rows the pattern stands for.
 *
 * Scanned in app/ and src/ (.ts, .tsx), outside the case file module itself
 * (src/lib/case-system/caseFile/), by scripts/verification/verifyCaseFileGuard.ts. Every file a
 * pattern matches must be on the allowed list (caseFileGuardAllowed.json) with the row it belongs
 * to; the list may only shrink.
 *
 * A pattern is deliberately the store's or reader's NAME, not one line's exact text: a new file that
 * keeps the same copy, or reads the same second store, matches it and fails the guard.
 */
export type GuardPattern = {
  /** The pattern's id, used by the allowed list. */
  id: string;
  /** The fact it keeps or reads. */
  fact: string;
  /** The inventory rows it stands for (fact-inventory.md, 29 Oct). */
  rows: readonly number[];
  /** The code shape, matched against each line. */
  regex: RegExp;
};

export const GUARD_PATTERNS: readonly GuardPattern[] = [
  // ---- 1. Claim type (rows 1-15, AI 136) ----
  { id: "ct.matchedClaimType", fact: "claim type", rows: [1, 2, 10], regex: /\bmatchedClaimType\b/ },
  { id: "ct.extra.confirmedClaimTypeId", fact: "claim type", rows: [2, 3, 7, 8, 11, 12], regex: /\bconfirmedClaimTypeId\b/ },
  { id: "ct.claimTypeUserConfirmed", fact: "claim type", rows: [2, 3, 7], regex: /\bclaimTypeUserConfirmed\b/ },
  { id: "ct.claimTypeQuote", fact: "claim type", rows: [2, 3, 7], regex: /\bclaimTypeQuote\b/ },
  { id: "ct.position.claimKind", fact: "claim type", rows: [4], regex: /\bchosenClaimKind\b|position\??\.claimKind\b|savePositionQueued\([^)]*\bclaimKind\b/ },
  { id: "ct.draftClaimTypeId", fact: "claim type", rows: [5], regex: /\bdraftClaimTypeId\b/ },
  { id: "ct.matchedClaimTypeId", fact: "claim type", rows: [6], regex: /\bmatchedClaimTypeId\b/ },
  { id: "ct.claimKindShown", fact: "claim type", rows: [7], regex: /\bclaimKindShown\(/ },
  { id: "ct.kindFromStory", fact: "claim type", rows: [9], regex: /\bkindFromStory\(/ },
  { id: "ct.familyScope", fact: "claim type", rows: [13], regex: /\bfamilyScope\b/ },
  { id: "ct.issueSignals", fact: "claim type", rows: [14], regex: /\bdetectedClaimTypes\b/ },
  { id: "ct.matchClaimType", fact: "claim type", rows: [15], regex: /\bmatchClaimType\(/ },
  { id: "ct.aiClassifier", fact: "claim type", rows: [136], regex: /\bclassifyClaimTypeWithAi\b|classify-claim-type/ },

  // ---- 2. Stage / status (rows 16-45, AI 134, 138, 146) ----
  { id: "st.current_stage", fact: "stage", rows: [16, 40], regex: /\bcurrent_stage\b/ },
  { id: "st.getStageForPersistence", fact: "stage", rows: [17], regex: /\bgetStageForPersistence\b/ },
  { id: "st.persistedRecord", fact: "stage", rows: [18], regex: /\bpersistedRecord\b/ },
  { id: "st.proceduralPosture.stage", fact: "stage", rows: [19], regex: /proceduralPosture\??\.stage\b/ },
  { id: "st.confirmedStage", fact: "stage", rows: [20, 21, 22, 26, 34, 37, 39, 41, 43], regex: /\bconfirmedStage\b/ },
  { id: "st.builderStageCopies", fact: "stage", rows: [21], regex: /\blastConfirmedRef\b|\bmotionStageBasis\b|\bmotionAnswerThisVisit\b/ },
  { id: "st.stepFromPicture", fact: "stage", rows: [23], regex: /\bstepFromPicture\(|\bsuggestedStageFor\(/ },
  { id: "st.situationCaseStage", fact: "stage", rows: [24], regex: /situationAnswers\([^)]*\)\.caseStage|fromStart\.caseStage/ },
  { id: "st.inferStage", fact: "stage", rows: [25], regex: /\binferStage\(/ },
  { id: "st.stageFromAnswers", fact: "stage", rows: [26], regex: /stageFromAnswers["']/ },
  { id: "st.deriveCaseStageWithEvents", fact: "stage", rows: [27], regex: /\bderiveCaseStageWithEvents\b/ },
  { id: "st.deriveCaseStage", fact: "stage", rows: [28], regex: /\bderiveCaseStage\b/ },
  { id: "st.intakeFacts", fact: "stage", rows: [29, 41], regex: /\bintakeFacts\b/ },
  { id: "st.notedInDefault", fact: "stage", rows: [30, 134], regex: /\bnotedInDefault\b/ },
  { id: "st.casePicture", fact: "stage", rows: [31, 53], regex: /\bcasePicture\b/ },
  { id: "st.stepNamedInStory", fact: "stage", rows: [32], regex: /\bstepNamedInStory\b/ },
  { id: "st.caseStepFor", fact: "stage", rows: [33], regex: /\bsuggestedStepForCase\b|\bstepStoryText\b|\bcaseStepFor\b/ },
  { id: "st.applicableStage", fact: "stage", rows: [34], regex: /\bapplicableStage\b/ },
  { id: "st.masterStageKeys", fact: "stage", rows: [35], regex: /(?:masterResult|masterCase|master)\??\.(?:stage|proceduralStage|currentStage)\b/ },
  { id: "st.deepPick", fact: "stage, names, amount, court, city, story", rows: [36], regex: /\bdeepPick\(/ },
  { id: "st.existingCaseStage", fact: "stage", rows: [38], regex: /\bexistingCaseStage\b/ },
  { id: "st.storedIntakeValues", fact: "stage and 14 form facts", rows: [39], regex: /\bstoredIntakeValues\(/ },
  { id: "st.userIsResponding", fact: "stage / side", rows: [41, 93], regex: /\buserIsResponding\b|\boriginatingDocumentRecorded\b/ },
  { id: "st.answeredQuestions", fact: "stage", rows: [42], regex: /\bwithoutStageAnswered\b|\bwithoutAnsweredQuestions\b|\bhasClaimAndService\b/ },
  { id: "st.getStageLabel", fact: "stage", rows: [43], regex: /\bgetStageLabel\(/ },
  { id: "st.motionToChange", fact: "stage (family motion)", rows: [44], regex: /\bmotionToChange\b/ },
  { id: "st.case_events", fact: "stage / dates", rows: [45], regex: /\bcase_events\b/ },
  { id: "st.caseReaderModel", fact: "stage (AI case reader)", rows: [138], regex: /\bcaseReaderModel\b|\breadCaseWithModel\b/ },
  { id: "st.resolveCasePosition", fact: "stage (AI)", rows: [146], regex: /\bresolveCasePosition\b/ },

  // ---- 3. Dates (rows 46-67) ----
  { id: "dt.dateAnswers", fact: "dates", rows: [46, 47], regex: /\bdateAnswers\b/ },
  { id: "dt.dateDraft", fact: "dates", rows: [47], regex: /\bdateDraft\b/ },
  { id: "dt.arrivalOnlyDates", fact: "dates", rows: [48], regex: /\barrivalOnlyDates\b|\bwithoutArrivalDates\b/ },
  { id: "dt.keptFromStory", fact: "dates", rows: [49], regex: /\bkeptFromStory\b/ },
  { id: "dt.storyHintsForDates", fact: "dates", rows: [50], regex: /\bstoryHintsForDates\b/ },
  { id: "dt.suggestedDatesFromAnswers", fact: "dates", rows: [51], regex: /\bsuggestedDatesFromAnswers\b/ },
  { id: "dt.suggestedDatesFromEvents", fact: "dates", rows: [52], regex: /\bsuggestedDatesFromEvents\b/ },
  { id: "dt.datesFromPicture", fact: "dates", rows: [53], regex: /\bdatesFromPicture\b/ },
  { id: "dt.guidedDates", fact: "dates", rows: [54], regex: /\bguidedDates\b|\bguidedDatesRef\b|\bguidedAnswersRef\b/ },
  { id: "dt.intakeAnswers", fact: "dates and all guided answers", rows: [55], regex: /\bintakeAnswers\b/ },
  { id: "dt.servedDateOf", fact: "dates (family served)", rows: [56], regex: /\bservedDateOf\b|\bwithServedDate\b/ },
  { id: "dt.familyDates", fact: "dates (family served / court date)", rows: [57], regex: /\bupcomingCourtDate\b/ },
  { id: "dt.storyDates", fact: "dates", rows: [58], regex: /\bservedDateFromStory\b|\bcourtDateFromStory\b/ },
  { id: "dt.masterCaseTimeline", fact: "dates", rows: [60], regex: /\bmasterCase\b/ },
  { id: "dt.findDates", fact: "dates", rows: [61, 64], regex: /\bfindDates\(/ },
  { id: "dt.dateMentionsIn", fact: "dates", rows: [62], regex: /\bdateMentionsIn\(/ },
  { id: "dt.structureStory", fact: "dates", rows: [63], regex: /\bstructureStory\b/ },
  { id: "dt.dateInSentence", fact: "dates", rows: [65], regex: /\bdateInSentence\(|\bfirstWordedDate\(/ },
  { id: "dt.readCaseRecord", fact: "many", rows: [11, 66, 129], regex: /\breadCaseRecord\(/ },
  { id: "dt.triageDates", fact: "dates (family triage)", rows: [67], regex: /\bdateStart\b|\bdateEnd\b/ },

  // ---- 4. Manner of service (rows 68-72) ----
  { id: "sv.positionService", fact: "service manner", rows: [68], regex: /position\??\.service\b|\bservice\??\.method\b/ },
  { id: "sv.serviceMethod", fact: "service manner", rows: [69], regex: /\bchangingMethod\b|\bserviceSaved\b/ },
  { id: "sv.serviceFromStory", fact: "service manner", rows: [70], regex: /\bserviceMethodShown\b|\bservedOnFor\b|\bserviceMethodFromStory\b/ },
  { id: "sv.serviceDetails", fact: "service manner", rows: [71], regex: /\bserviceDetails\b/ },
  { id: "sv.serviceMethodText", fact: "service manner", rows: [72], regex: /\bserviceMethodText\b|sc-defendant-service-method/ },

  // ---- 5. Amount and outcome (rows 73-82) ----
  { id: "am.amountClaimed", fact: "amount", rows: [73, 75, 76], regex: /\bamountClaimed(?:Text)?\b/ },
  { id: "am.recordedAmountOf", fact: "amount", rows: [74], regex: /\brecordedAmountOf\(/ },
  { id: "am.statedDollarAmounts", fact: "amount", rows: [77], regex: /\bstatedDollarAmounts\b/ },
  { id: "am.claimAmountFromStory", fact: "amount", rows: [78], regex: /\bclaimAmountFromStory\(|\bamountFromStory\(/ },
  { id: "wo.legalRemedy", fact: "outcome / wants", rows: [79, 80], regex: /\blegalRemedy\b|\bremedySoughtText\b/ },
  { id: "wo.goalFromStory", fact: "outcome / wants", rows: [81], regex: /\bgoalFromStory\(/ },
  { id: "wo.confirmedRemedyId", fact: "outcome / wants", rows: [82], regex: /\bconfirmedRemedyId\b/ },

  // ---- 6. Evidence (rows 83-85) ----
  { id: "ev.evidenceStores", fact: "evidence", rows: [83], regex: /\bevidenceGuidance\b|\buploadedEvidenceFiles\b/ },
  { id: "ev.typedEvidence", fact: "evidence", rows: [84], regex: /\btypedEvidence\b/ },
  { id: "ev.evidenceText", fact: "evidence", rows: [85], regex: /\bevidenceText\b|\bevidenceIn\(/ },

  // ---- 7. City (rows 86-90) ----
  { id: "ci.intakeCity", fact: "city", rows: [86], regex: /\bintakeCity\b/ },
  { id: "ci.yourCity", fact: "city", rows: [87], regex: /\byourCity\b|\byourProvince\b/ },
  { id: "ci.courtPathFinder", fact: "city, story, started", rows: [88], regex: /\bCOURT_PATH_FINDER_KEY\b/ },
  { id: "ci.municipalityCopies", fact: "city", rows: [89], regex: /\buserMunicipality\b|\botherMunicipality\b/ },
  { id: "ci.courtLocation", fact: "city / court location", rows: [90], regex: /\bcourtLocation\b/ },

  // ---- 8. The rest (rows 91-147) ----
  { id: "sd.yourRole", fact: "side", rows: [91, 94, 95, 99], regex: /\byourRole\b/ },
  { id: "sd.sideFromParts", fact: "side", rows: [92], regex: /\bsideFromParts\(/ },
  { id: "sd.homeSideRename", fact: "side", rows: [96], regex: /side:\s*"starting"/ },
  { id: "sd.roleFromStory", fact: "side", rows: [97], regex: /\bfamilyRoleFromStory\b|\bcivilRoleFromStory\b/ },
  { id: "sd.sideInAnswer", fact: "side", rows: [98], regex: /\bsideInAnswer\(/ },
  { id: "sd.caseFilePanelMaps", fact: "side", rows: [100], regex: /file\.side\.value\s*===/ },
  { id: "sd.roleWordsLabel", fact: "side", rows: [101], regex: /\bSMALL_CLAIMS_ROLE_WORDS\b/ },
  { id: "op.otherParty", fact: "other party", rows: [102, 103, 106], regex: /\bintakeData\??\.otherParty\b|\bextra\??\.otherParty\b|\bcivilInput\??\.otherParty\b|\bintake\??\.otherParty\b/ },
  { id: "op.caseTitleFromIntake", fact: "other party", rows: [104], regex: /\bcaseTitleFromIntake\(/ },
  { id: "op.otherSideIn", fact: "other party", rows: [105], regex: /\botherSideIn\(|\botherPartyFromStory\(/ },
  { id: "op.otherPartyAddress", fact: "other party", rows: [106], regex: /\botherPartyAddress\b/ },
  { id: "ch.familyStatus", fact: "children / married", rows: [108], regex: /\btriageState\b|\bfamilyStatus\b/ },
  { id: "ch.childrenInfo", fact: "children", rows: [109], regex: /\bchildrenInfo\b|\bchildSupportPrefill\b/ },
  { id: "ch.childrenFromStory", fact: "children", rows: [110], regex: /\bchildrenFromStory\(|\bchildrenInStory\(/ },
  { id: "sy.userStory", fact: "story", rows: [111], regex: /\buserStory\(/ },
  { id: "sy.understoodAnswers", fact: "story", rows: [112], regex: /\bunderstoodAnswers\b/ },
  { id: "sy.setHomeStory", fact: "story", rows: [113], regex: /\bsetHomeStory\(/ },
  { id: "sy.storyWithTimeline", fact: "story", rows: [114], regex: /\bstoryWithTimeline\(/ },
  { id: "sy.chatTranscript", fact: "story", rows: [115], regex: /courtsimplified-ai-case-partner-chat/ },
  { id: "sy.guidedTranscript", fact: "story", rows: [116], regex: /\bsuggestionStoryText\b/ },
  { id: "sy.formChat", fact: "story / answers", rows: [117], regex: /"form-chat"/ },
  { id: "sy.sourcedAnswers", fact: "story / answers", rows: [118, 140], regex: /\bsourcedAnswers\b/ },
  { id: "sy.homeCard", fact: "story / answers", rows: [119], regex: /"home-card"/ },
  { id: "sy.homeUnderstood", fact: "many (AI understanding)", rows: [120], regex: /"understood"/ },
  { id: "co.courtCopies", fact: "court", rows: [121], regex: /\bcourt_path\b|intakeData\??\.courtPath\b|master\??\.courtPath\b/ },
  { id: "co.homeSuggestion", fact: "court", rows: [122], regex: /"suggestion"/ },
  { id: "un.unsureMarkers", fact: "unsure markers", rows: [123], regex: /\bdeclinedIds\b|\brejectedSuggestionIds\b|\bnoClaimTypeMatch\b/ },
  { id: "fl.reviewFlags", fact: "review confirmed", rows: [124], regex: /\bguidanceInputRevision\b|\bguidanceFactsRevision\b|\bintakeCompleted\b|\bfamilyQuestionsDone\b/ },
  { id: "fl.routingConfirmed", fact: "court / routing confirmed", rows: [125], regex: /\broutingConfirmed\b|\bcourtConfirmed\b/ },
  { id: "fl.dateConfirmedByUser", fact: "dates (documents)", rows: [126], regex: /\bdateConfirmedByUser\b/ },
  { id: "mn.frozenDrafts", fact: "many (frozen copy)", rows: [127], regex: /\bstartingDocumentDraft\b|\brespondingDocumentDraft\b/ },
  { id: "mn.caseFileFromMasterResult", fact: "many", rows: [12, 128, 144], regex: /\bcaseFileFromMasterResult\(/ },
  { id: "mn.caseFactsText", fact: "many (AI fact text)", rows: [129, 141, 142], regex: /\bcaseFactsText\(/ },
  { id: "mn.reviewEntries", fact: "many", rows: [130], regex: /\breviewEntries\(/ },
  { id: "mn.engineCopies", fact: "many", rows: [132], regex: /\bcourtSimplifiedIntelligence\b|\bmasterCaseFile\b|\bfamilyFormRouting\b/ },
  { id: "ai.understandCase", fact: "AI", rows: [133], regex: /\bunderstandCase\(/ },
  { id: "ai.extractIntakeFacts", fact: "AI", rows: [134], regex: /\bextractIntakeFacts\(/ },
  { id: "ai.storyAnswerProposals", fact: "AI", rows: [135], regex: /\bproposeStoryAnswers\(|storyAnswerProposals["']/ },
  { id: "ai.courtPathClassifier", fact: "AI", rows: [137], regex: /courtPathClassifier["']/ },
  { id: "ai.brain", fact: "AI", rows: [139], regex: /courtSimplifiedBrain["']/ },
  { id: "ai.sourcedQuestions", fact: "AI", rows: [140], regex: /sourced-questions/ },
  { id: "ai.strategy", fact: "AI", rows: [141], regex: /retrieval\/strategy["']/ },
  { id: "ai.libraryChat", fact: "AI", rows: [143], regex: /\blibraryChat\b/ },
  { id: "ai.caseReviewModel", fact: "AI", rows: [144], regex: /caseReviewModel["']/ },
  { id: "ai.decisionHelp", fact: "AI", rows: [145], regex: /decisionHelp["']/ },
  { id: "ai.depthTurn", fact: "AI", rows: [147], regex: /\borchestrateDepthTurn\b/ },
];

/**
 * Inventory rows no single code pattern can name, and how each is tracked instead. Never silently
 * dropped: the guard prints them with every run.
 */
export const ROWS_NOT_PATTERNS: readonly { row: number; why: string; trackedBy: string }[] = [
  { row: 107, why: "An absence: the number of defendants is kept nowhere (only one otherParty string).", trackedBy: "Nothing to scan; recorded here until a slot for it exists (owner's conversion order, 'the rest')." },
  { row: 59, why: "storyFacts.ts complaintIn and its own A_DATE regex live inside the case file module (src/lib/case-system/caseFile/), which the guard does not scan.", trackedBy: "Listed here; the date conversion (owner's step 3) moves it to dates.ts." },
  { row: 131, why: "master_result.intakeData itself, the whole second record of every form fact: its readers are the other rows' patterns (userStory, otherParty, amountClaimed, yourRole, readCaseRecord ...), so a pattern of its own would only repeat them.", trackedBy: "The patterns of rows 39, 73, 87, 91, 102, 111, 129." },
];
