/**
 * THE "BEFORE YOU START" NOTICE COMES BEFORE ANY WORK (site owner, 15 Nov 2026).
 *
 * The notice (FirstUseAcknowledgement.tsx) says the site is not a lawyer and that AI is used. No analysis, AI request or
 * next-step work may begin until the person has accepted it. Found on PR #550: from the case page's "Show my next step",
 * the builder showed the notice and worked out the next step behind it.
 *
 * WORK_ROUTE: every browser request that starts work (analysis, a model call, the next step, the story reading, the court
 * suggestion). WORK_SENDERS: every place that sends one. PAGES_WITHOUT_NOTICE: the pages that can send one and do not show
 * the notice. test:notice-gate (scripts/verification/verifyNoticeGate.ts) keeps all three the code's lists and checks
 * each gate: the builder page's notice return, the review panel's held start, the home page's Continue.
 *
 * A declared list for the checks, not site code: it lives under scripts/ so the guards that scan app/ and src/ for route
 * names (test:ai-rate-limit, test:case-file-guard) do not read the list itself as a screen sending them.
 *
 * NOT_GATED: work routes sent with no notice anywhere before them. Empty since the home page's notice (15 Nov 2026).
 */
export const WORK_ROUTE = /^\/api\/(small-claims|civil|family)\/analyze$|^\/api\/case\/(review|stage-answer|strategy|read|understand)$|^\/api\/intake\/(guided-turn|depth-turn|classify-claim-type|safety-check|sourced-questions|tidy-wording)$|^\/api\/(guided-assistant|assistant\/law|law\/explain|generate-form|classify-court-path|cases\/event-candidates|workspace\/documents\/decision-help)$/;

export const NOT_GATED: Record<string, string> = {};

/** Every browser request to a work route: the file that sends it and the route (test:notice-gate keeps it the code's list). */
export const WORK_SENDERS: { file: string; route: string }[] = [
  { file: "app/_components/ExplainProvision.tsx", route: "/api/law/explain" },
  { file: "app/_components/HomeLocationGate.tsx", route: "/api/case/understand" },
  { file: "app/_components/HomeLocationGate.tsx", route: "/api/classify-court-path" },
  { file: "app/_components/StrategyPanel.tsx", route: "/api/case/strategy" },
  { file: "app/builder/_components/CaseReviewPanel.tsx", route: "/api/case/review" },
  { file: "app/builder/_components/CivilIntake.tsx", route: "/api/civil/analyze" },
  { file: "app/builder/_components/CourtAssistantChat.tsx", route: "/api/assistant/law" },
  { file: "app/builder/_components/CourtAssistantChat.tsx", route: "/api/guided-assistant" },
  { file: "app/builder/_components/EventCandidateSurface.tsx", route: "/api/cases/event-candidates" },
  { file: "app/builder/_components/FamilyIntake.tsx", route: "/api/family/analyze" },
  { file: "app/builder/_components/GuidedSmallClaimsIntake.tsx", route: "/api/intake/classify-claim-type" },
  { file: "app/builder/_components/GuidedSmallClaimsIntake.tsx", route: "/api/intake/depth-turn" },
  { file: "app/builder/_components/GuidedSmallClaimsIntake.tsx", route: "/api/intake/guided-turn" },
  { file: "app/builder/_components/SmallClaimsIntake.tsx", route: "/api/small-claims/analyze" },
  { file: "app/builder/_components/SourcedQuestions.tsx", route: "/api/intake/sourced-questions" },
  { file: "app/builder/_components/StageAnswerPanel.tsx", route: "/api/case/stage-answer" },
  { file: "app/builder/_components/TidyWordingReview.tsx", route: "/api/intake/tidy-wording" },
  { file: "app/builder/page.tsx", route: "/api/case/read" },
  { file: "app/cases/[id]/case-file/page.tsx", route: "/api/case/stage-answer" },
  { file: "app/cases/[id]/forms/page.tsx", route: "/api/case/stage-answer" },
  { file: "app/cases/_components/CourtDecisionPanel.tsx", route: "/api/workspace/documents/decision-help" },
  { file: "app/forms/FormsWorkspace.tsx", route: "/api/generate-form" },
  { file: "src/lib/case-system/intake/clientSafetyCheck.ts", route: "/api/intake/safety-check" },
];

/** Every browser fetch whose address is built in code, with the routes it can call (none of them work routes). */
export const BUILT_ADDRESSES: Record<string, { routes: string[]; why: string }> = {
  "app/builder/_components/CourtAssistantChat.tsx": { routes: ["/api/cases/chat"], why: "The chat's saved messages, read (GET) or saved (POST); no model." },
  "app/builder/_components/positionSave.ts": { routes: ["/api/cases/drafts", "/api/cases/form-applicability", "/api/cases/position", "/api/cases/facts"], why: "Saves of the person's own case, queued, and sent as the page closes; no model." },
  "app/cases/_components/CaseWorkspace.tsx": { routes: ["/api/workspace/organisation", "/api/workspace/exhibit-book"], why: "The case workspace's views of the person's documents; no model." },
  "src/lib/canlii/canliiServer.ts": { routes: ["https://api.canlii.org/"], why: "Server side only: CanLII's metadata API (canliiCore.ts), never from the browser." },
};

/**
 * Pages that can send a work request and do not show the notice: each with why, and the site owner's review. Empty
 * since 16 Nov 2026: the six case pages (through their layout) and the public forms page go through NoticeGate. A new
 * entry fails test:notice-gate until it names the site owner's review; a new page that sends work fails until it goes
 * through the notice or is listed here.
 */
export const PAGES_WITHOUT_NOTICE: Record<string, { reason: string; reviewed: string }> = {};
