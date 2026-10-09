import { NextRequest, NextResponse } from "next/server";

import { ANSWER_TIME_MS, checkedAnswer, checkedAnswerView } from "@/src/lib/case-system/retrieval/checkedAnswer";
import { findingsView } from "@/src/lib/case-system/retrieval/findingsView";
import { researchQuestion } from "@/src/lib/case-system/retrieval/researchQuestion";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { assistantLawEnabled, checkedAnswersEnabled, plainExplanationsEnabled } from "@/src/lib/content-library/phaseScope";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { caseFactsText, readCaseRecord } from "@/src/lib/case-system/caseRecord";
import { allDateQuestions } from "@/src/lib/case-system/casePosition";
import { UUID_PATTERN } from "@/src/lib/case-system/events/caseEventRequest";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { userStory } from "@/src/lib/case-system/userStory";

/**
 * "The law on your question" for the Court Assistant: one question, researched
 * (retrieval/researchQuestion.ts), answered with the provisions' own words and
 * the quotes code found in them -- or a plain "our library does not have this
 * yet", with the missing law filed as a source request. Called beside the
 * assistant's own reply, so the reply is never held up by it.
 *
 * Signed-in only, like every route that sends a person's words to a model.
 */

export const runtime = "nodejs";
// 300 s, Vercel's limit with Fluid compute: a thorough checked answer takes up to
// ANSWER_TIME_MS, and the research fallback gets what is left (2026-10-07).
export const maxDuration = 300;

const MAX_QUESTION = 1_000;
const MAX_STORY = 8_000;
const COURTS = new Set(["small-claims", "civil", "family"]);
const SIDES: Record<string, "plaintiff" | "defendant"> = {
  plaintiff: "plaintiff",
  applicant: "plaintiff",
  defendant: "defendant",
  respondent: "defendant",
};

type Body = { question: string; story?: string; courtPath: "small-claims" | "civil" | "family"; side?: string; caseId?: string };

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["question", "story", "courtPath", "side", "caseId"].includes(key))) return false;
  return (
    typeof body.question === "string" &&
    body.question.trim().length >= 3 &&
    body.question.length <= MAX_QUESTION &&
    (body.story === undefined || (typeof body.story === "string" && body.story.length <= MAX_STORY)) &&
    typeof body.courtPath === "string" &&
    COURTS.has(body.courtPath) &&
    (body.side === undefined || (typeof body.side === "string" && body.side.length <= 40)) &&
    (body.caseId === undefined || (typeof body.caseId === "string" && UUID_PATTERN.test(body.caseId)))
  );
}

type Dependencies = {
  authenticate: typeof getAuthenticatedUser;
  research: typeof researchQuestion;
  /** 2026-10-07: the checked answer (retrieval/checkedAnswer.ts). */
  answer: typeof checkedAnswer;
  answerEnabled: () => boolean;
  fileRequests: typeof fileSourceRequests;
  enabled: () => boolean;
  hasAi: () => boolean;
  /**
   * 2026-10-08 (master plan Phase 1): the person's saved case, so the answer
   * knows what is already recorded -- their story and their confirmed side,
   * step and dates -- read from the case they own, never from the request.
   * Null when there is no saved case or it is not theirs.
   */
  loadCase: (request: NextRequest, user: { id: string }, caseId: string) => Promise<{ story: string; facts: string } | null>;
};

export function createAssistantLawPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    research: researchQuestion,
    answer: checkedAnswer,
    answerEnabled: () => checkedAnswersEnabled(),
    fileRequests: fileSourceRequests,
    enabled: () => assistantLawEnabled(),
    hasAi: hasConfiguredServerAi,
    loadCase: async (request, user, caseId) => {
      const owned = (await getAuthenticatedOwnedCase(request, user as never, caseId).catch(() => null)) as
        | { master_result?: unknown; court_path?: string | null }
        | null;
      if (!owned) return null;
      const master = (owned.master_result && typeof owned.master_result === "object" ? owned.master_result : {}) as Record<string, unknown>;
      const record = readCaseRecord(master, owned.court_path);
      return {
        story: userStory(master.intakeData as never),
        facts: caseFactsText(record, {
          stepTitle: (id) => findStage(id)?.title,
          dateQuestion: (id) => allDateQuestions().find((question) => question.id === id)?.question,
        }),
      };
    },
    ...overrides,
  };
  return async function assistantLawPost(request: NextRequest) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
    }
    if (!isBody(body)) return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
    if (!deps.enabled() || !deps.hasAi()) return NextResponse.json({ ok: true, findings: [], skipped: "off" });
    const user = await deps.authenticate(request);
    if (!user) return NextResponse.json({ ok: true, findings: [], skipped: "sign-in" });
    // The saved case, when there is one: its story replaces the request's, and
    // what it records is added under its own heading.
    const saved = body.caseId ? await deps.loadCase(request, user as { id: string }, body.caseId).catch(() => null) : null;
    const story = (saved?.story || body.story || "").slice(0, MAX_STORY);

    // 2026-10-07: answer first, checked statement by statement against the
    // official text. When that gives an answer (or a decline, or "outside
    // what we cover"), it is the reply; otherwise the research step runs as
    // before, so a person always gets the law the library holds.
    const input = {
      question: body.question,
      ...(story ? { story } : {}),
      courtPath: body.courtPath,
      ...(saved?.facts ? { facts: saved.facts } : {}),
      ...(body.side && SIDES[body.side] ? { side: SIDES[body.side] } : {}),
    };
    const started = Date.now();
    if (deps.answerEnabled()) {
      const answer = await deps.answer(input, { timeoutMs: ANSWER_TIME_MS }).catch(() => null);
      if (answer?.missingLaw.length) await deps.fileRequests(answer.missingLaw, { courtPath: body.courtPath });
      if (answer && (answer.status === "answered" || answer.status === "outside-scope" || answer.declinedToJudge)) {
        return NextResponse.json({ ok: true, findings: [], answer: checkedAnswerView(answer) });
      }
    }

    // Whatever time the answer used comes off the research step's, so the
    // reply stays inside maxDuration.
    const result = await deps.research(input, { timeoutMs: Math.max(20_000, 270_000 - (Date.now() - started)) });
    if (result.sourceRequests.length > 0) {
      await deps.fileRequests(result.sourceRequests, { courtPath: body.courtPath });
    }
    return NextResponse.json({
      ok: true,
      findings: findingsView(result, plainExplanationsEnabled()),
      ...(result.skipped ? { skipped: result.skipped } : {}),
    });
  };
}

export const POST = createAssistantLawPost();
