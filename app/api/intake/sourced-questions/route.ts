import { NextRequest, NextResponse } from "next/server";

import { sourcedQuestions } from "@/src/lib/case-system/retrieval/sourcedQuestions";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { sourcedQuestionsEnabled } from "@/src/lib/content-library/phaseScope";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

/**
 * Follow-up questions for the person's story, written from the law the
 * research step read and checked by code and a second model call
 * (retrieval/sourcedQuestions.ts). Called by all three intakes in the
 * background once the story is told; the questions are shown before the
 * analysis, and answering is optional.
 *
 * Signed-in only, like every route that sends a story to a model
 * (guided-turn, the analyze routes). A person who is not signed in gets no
 * questions and the intake goes on as before.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_STORY_LENGTH = 8_000;
const COURTS = new Set(["small-claims", "civil", "family"]);
const SIDES: Record<string, "plaintiff" | "defendant"> = {
  plaintiff: "plaintiff",
  applicant: "plaintiff",
  "moving-party": "plaintiff",
  defendant: "defendant",
  respondent: "defendant",
  "responding-party": "defendant",
};

type Body = { story: string; courtPath: "small-claims" | "civil" | "family"; side?: string };

function isSourcedQuestionsBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.some((key) => !["story", "courtPath", "side"].includes(key))) return false;
  return (
    typeof body.story === "string" &&
    body.story.trim().length >= 20 &&
    body.story.length <= MAX_STORY_LENGTH &&
    typeof body.courtPath === "string" &&
    COURTS.has(body.courtPath) &&
    (body.side === undefined || (typeof body.side === "string" && body.side.length <= 40))
  );
}

type Dependencies = {
  authenticate: typeof getAuthenticatedUser;
  questions: typeof sourcedQuestions;
  fileRequests: typeof fileSourceRequests;
  enabled: () => boolean;
  hasAi: () => boolean;
};

export function createSourcedQuestionsPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    questions: sourcedQuestions,
    fileRequests: fileSourceRequests,
    enabled: () => sourcedQuestionsEnabled(),
    hasAi: hasConfiguredServerAi,
    ...overrides,
  };
  return async function sourcedQuestionsPost(request: NextRequest) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
    }
    if (!isSourcedQuestionsBody(body)) {
      return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
    }
    if (!deps.enabled() || !deps.hasAi()) return NextResponse.json({ ok: true, questions: [], skipped: "off" });
    if (!(await deps.authenticate(request))) return NextResponse.json({ ok: true, questions: [], skipped: "sign-in" });

    const result = await deps.questions({
      story: body.story,
      courtPath: body.courtPath,
      ...(body.side && SIDES[body.side] ? { side: SIDES[body.side] } : {}),
    });
    if (result.sourceRequests.length > 0) {
      await deps.fileRequests(result.sourceRequests, { courtPath: body.courtPath });
    }
    return NextResponse.json({
      ok: true,
      questions: result.questions,
      ...(result.skipped ? { skipped: result.skipped } : {}),
    });
  };
}

export const POST = createSourcedQuestionsPost();
