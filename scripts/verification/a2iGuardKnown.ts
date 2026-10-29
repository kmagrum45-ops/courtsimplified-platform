/**
 * Known problems for the A2I guard (scripts/verification/verifyA2iGuard.ts):
 * every check that fails TODAY, with the reason in plain words and the
 * file:line that causes it. The guard stays green while every failure is
 * listed here, and goes red on an unlisted failure, on a listed check that now
 * passes (delete its entry: the statement got truer), and on a listed name
 * that no longer runs.
 *
 * Listed 2026-10-29, as the code stood on main at aed6e63c. An entry is not
 * an acceptance of the problem: it is the record of what the A2I application
 * says that the site does not yet do. Fix the cause, or reword the statement
 * in the application, then delete the entry.
 */
export type A2iGuardKnown = {
  /** The check's name as the guard prints it. */
  check: string;
  /** Why the statement is not true, in plain words. */
  reason: string;
  /** Where the cause is (file:line). */
  cause: string;
};

export const A2I_GUARD_KNOWN: A2iGuardKnown[] = [
  // (a) AI never writes legal content that reaches a user.
  { check: "A2I-a-analysis-text-off", reason: "Model-written analysis sentences are shown to users unless AI_ANALYSIS_TEXT_TO_USERS=off, and production sets no switch.", cause: "src/lib/content-library/phaseScope.ts:89" },
  { check: "A2I-a-checked-answers-off", reason: "The checked answer has the model draft legal statements; those matched to the library are shown.", cause: "src/lib/content-library/phaseScope.ts:285" },
  { check: "A2I-a-plain-explanations-off", reason: "Provision explanations are written by the AI (\"Written by AI and checked\").", cause: "src/lib/content-library/phaseScope.ts:210" },
  { check: "A2I-a-case-understanding-off", reason: "The front-door card shows an AI summary, facts and 'where it stands'.", cause: "src/lib/content-library/phaseScope.ts:317" },
  { check: "A2I-a-strategy-off", reason: "The strategy panel shows checked answers drafted by the model.", cause: "src/lib/content-library/phaseScope.ts:301" },
  { check: "A2I-a-decision-help-off", reason: "Decision help writes a free explanation of an uploaded decision; it runs because owner live testing turns document analysis on.", cause: "src/lib/case-workspace/aiAnalysis.ts:110; src/lib/case-system/policy/a2iScope.ts:177" },

  // (b) Court-form drafting is switched off.
  { check: "A2I-b-form-filling-paused", reason: "Official-form filling was unpaused for live testing.", cause: "src/lib/content-library/phaseScope.ts:61" },
  { check: "A2I-b-drafting-scope-off", reason: "Owner live testing turns the formCompletion capability on (no A2I approval recorded).", cause: "src/lib/case-system/policy/a2iScope.ts:177" },

  // (c) Case review is not offered today.
  { check: "A2I-c-ai-review-off", reason: "caseReviewGaps is an enabled 'information' capability, so the case is sent to the model for review.", cause: "src/lib/case-system/policy/a2iScope.ts:57; src/lib/case-system/caseReview/runCaseReview.ts:26" },
  { check: "A2I-c-panel-gated", reason: "CaseReviewPanel is rendered on the builder and the case page with no case-review switch around it.", cause: "app/builder/page.tsx:2622; app/cases/[id]/page.tsx:344" },

  // (d) Production stores no user data.
  { check: "A2I-d-no-production-writes", reason: "Cases, chat messages, events, documents and audit rows are written with no production refusal.", cause: "app/api/cases/route.ts:348; app/api/cases/chat/route.ts:124; src/lib/case-system/intakeCheckpoint.ts:110 (and the other writers the check names)" },
  { check: "A2I-d-production-contents", reason: "Not checkable from code: what the production database holds needs a count(*) on the live project.", cause: "docs/infra/projects.md (last recorded 26 Sep: 2 accounts, 4 cases)" },

  // (e) Remaining questions come only from a fixed, reviewed set.
  { check: "A2I-e-sourced-questions-off", reason: "Sourced questions are written by the model from the law it read, up to five a run.", cause: "src/lib/content-library/phaseScope.ts:257" },
  { check: "A2I-e-front-door-questions-fixed", reason: "The front-door reading shows questions the model wrote itself; only a citation in one is screened.", cause: "src/lib/case-system/understanding/understandCase.ts:259-272" },
  { check: "A2I-e-bank-reviewed", reason: "Not checkable from code: no review sign-off is recorded, and the site's notice says the content has not been reviewed by a licensed lawyer or paralegal.", cause: "app/_components/AiUseNotice.tsx" },

  // (f) Names are never sent to the AI.
  { check: "A2I-f-lowercase-name", reason: "A known name typed in lower case is not matched (case-sensitive pattern; parts must be capitalised).", cause: "src/lib/case-system/privacy/nameLabels.ts:51, :86" },
  { check: "A2I-f-unknown-name", reason: "A name typed in the story that is not in a name field (a witness, a landlord) goes as typed.", cause: "src/lib/case-system/privacy/nameLabels.ts:11-13" },
  { check: "A2I-f-address", reason: "No code removes addresses before a model call.", cause: "src/lib/case-system/openaiClient.ts:205 (labels names only)" },
  { check: "A2I-f-phone", reason: "No code removes phone numbers before a model call.", cause: "src/lib/case-system/openaiClient.ts:205 (labels names only)" },
  { check: "A2I-f-email", reason: "No code removes email addresses before a model call.", cause: "src/lib/case-system/openaiClient.ts:205 (labels names only)" },
  { check: "A2I-f-file-number", reason: "No code removes court file numbers before a model call.", cause: "src/lib/case-system/openaiClient.ts:205 (labels names only)" },

  // (g) Every AI request and response is logged in Canada for 90 days.
  { check: "A2I-g-logged-outside-context", reason: "A call made outside withAiCallContext is not written down, only reported on the console.", cause: "src/lib/audit/aiCallLog.ts:656" },
  { check: "A2I-g-full-request-response", reason: "By design the log holds a hash and length of the request and a redacted reply, never the text.", cause: "src/lib/audit/aiCallLog.ts:322, :471" },
  { check: "A2I-g-retention-90-days", reason: "prune_ai_call_log defaults to 12 months and is not scheduled.", cause: "supabase/migrations/20260922120000_add_ai_call_log.sql:246, :255" },

  // (h) A legal-content filter blocks conclusions and unknown citations.
  { check: "A2I-h-front-door-conclusion", reason: "withoutLaw is a sentence pattern; a conclusion such as 'He is liable to you for breach of contract' passes it.", cause: "src/lib/case-system/understanding/understandCase.ts:204, :224" },
  { check: "A2I-h-front-door-citation", reason: "A case citation (e.g. '2019 ONCA 123') is not in withoutLaw's pattern and is not checked against the library.", cause: "src/lib/case-system/understanding/understandCase.ts:204, :224" },
  { check: "A2I-h-decision-help-library", reason: "Decision help's explanation is checked for numbers, names, quotes and predictions, not against the library.", cause: "src/lib/case-workspace/courtDecision.ts:154, :164" },
  { check: "A2I-h-output-guard-counted", reason: "The output guard's block counter has no caller ('NOT WIRED UP').", cause: "src/lib/audit/aiCallLog.ts:302" },

  // (i) AI label, report button, AI notice at sign-up.
  { check: "A2I-i-ai-label", reason: "Only the case review panel and the guided intake carry 'AI suggestion'; eight AI screens do not.", cause: "app/_components/CaseUnderstandingCard.tsx, ExplainProvision.tsx, StrategyPanel.tsx; app/builder/_components/SourcedQuestions.tsx, CourtAssistantChat.tsx, IntelligenceOverviewPanel.tsx, TidyWordingReview.tsx; app/cases/_components/CourtDecisionPanel.tsx" },
  { check: "A2I-i-report-problem", reason: "No 'report a problem' control exists on any AI screen.", cause: "the ten screens listed in verifyA2iGuard.ts AI_SCREENS" },
  { check: "A2I-i-notice-at-signup", reason: "The AI notice comes at first use of the builder, stored in the browser; the sign-up page has no AI wording.", cause: "app/login/page.tsx; app/builder/page.tsx:2047 (FirstUseAcknowledgement)" },

  // (j) Privileged/sealed scan before AI; document analysis off.
  { check: "A2I-j-marker-scan", reason: "The only document scan looks for SINs, cards and similar numbers, not privileged or sealed markers.", cause: "src/lib/case-workspace/personalDataScan.ts:240" },
  { check: "A2I-j-document-analysis-off", reason: "documentAnalysisEnabled returns true while owner live testing is on, although ZDR is not confirmed.", cause: "src/lib/case-workspace/aiAnalysis.ts:110; src/lib/case-system/policy/a2iScope.ts:177" },

  // (k) Models pinned, storage off, Canadian residency.
  { check: "A2I-k-model-pinned", reason: "Both tiers use the alias gpt-6.1-sol, not a dated snapshot.", cause: "src/lib/case-system/aiModels.ts:64-65" },
  { check: "A2I-k-zdr-confirmed", reason: "store:false is forced, but OpenAI's abuse-monitoring retention still applies: ZDR has not been confirmed.", cause: "src/lib/case-workspace/aiAnalysis.ts:77" },
  { check: "A2I-k-residency-endpoint", reason: "The client uses OpenAI's default endpoint; no region or data-residency endpoint is set (whether a Canadian one exists is unknown from the repo).", cause: "src/lib/case-system/openaiClient.ts:306" },

  // (l) Court path is rules-based; the AI picks from a fixed list.
  { check: "A2I-l-tenancy-rule-wins", reason: "Residential tenancies (LTB) are keyword lists inside the classifier, not a fixed regime that always wins.", cause: "src/lib/case-system/intelligence/fixedRegimes.ts:20, :189" },
];
