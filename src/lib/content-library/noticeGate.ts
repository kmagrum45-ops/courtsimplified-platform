/**
 * THE "BEFORE YOU START" NOTICE COMES BEFORE ANY WORK (site owner, 15 Nov 2026).
 *
 * The notice (FirstUseAcknowledgement.tsx) says the site is not a lawyer and that AI is used. No analysis, AI request or
 * next-step work may begin until the person has accepted it. Found on PR #550: from the case page's "Show my next step",
 * the builder showed the notice and worked out the next step behind it.
 *
 * WORK_ROUTE: every browser request that starts work (analysis, a model call, the next step). The browser sends each one
 * through workFetch (app/_components/workFetch.ts), which holds it until the notice is accepted; test:notice-gate fails on
 * a call to one of these routes made any other way, and on a route under app/api that calls a model and is not listed.
 *
 * NOT_GATED: work routes the browser sends where the notice is never shown, each with why. Kept short on purpose.
 */
export const WORK_ROUTE = /^\/api\/(small-claims|civil|family)\/analyze$|^\/api\/case\/(review|stage-answer|strategy|read|understand)$|^\/api\/intake\/(guided-turn|depth-turn|classify-claim-type|safety-check|sourced-questions|tidy-wording)$|^\/api\/(guided-assistant|assistant\/law|law\/explain|generate-form|classify-court-path|cases\/event-candidates|workspace\/documents\/decision-help)$/;

export const NOT_GATED: Record<string, string> = {
  "/api/case/understand": "The home page reads the story before the builder, where the notice is first shown. Reported to the site owner, 15 Nov 2026; their decision.",
  "/api/classify-court-path": "The home page's court suggestion, before the builder, where the notice is first shown. Reported to the site owner, 15 Nov 2026; their decision.",
};
