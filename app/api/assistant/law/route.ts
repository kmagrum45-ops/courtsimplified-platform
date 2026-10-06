import { NextRequest, NextResponse } from "next/server";

import { findingsView } from "@/src/lib/case-system/retrieval/findingsView";
import { researchQuestion } from "@/src/lib/case-system/retrieval/researchQuestion";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { assistantLawEnabled, plainExplanationsEnabled } from "@/src/lib/content-library/phaseScope";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

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
export const maxDuration = 60;

const MAX_QUESTION = 1_000;
const MAX_STORY = 8_000;
const COURTS = new Set(["small-claims", "civil", "family"]);
const SIDES: Record<string, "plaintiff" | "defendant"> = {
  plaintiff: "plaintiff",
  applicant: "plaintiff",
  defendant: "defendant",
  respondent: "defendant",
};

type Body = { question: string; story?: string; courtPath: "small-claims" | "civil" | "family"; side?: string };

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["question", "story", "courtPath", "side"].includes(key))) return false;
  return (
    typeof body.question === "string" &&
    body.question.trim().length >= 3 &&
    body.question.length <= MAX_QUESTION &&
    (body.story === undefined || (typeof body.story === "string" && body.story.length <= MAX_STORY)) &&
    typeof body.courtPath === "string" &&
    COURTS.has(body.courtPath) &&
    (body.side === undefined || (typeof body.side === "string" && body.side.length <= 40))
  );
}

type Dependencies = {
  authenticate: typeof getAuthenticatedUser;
  research: typeof researchQuestion;
  fileRequests: typeof fileSourceRequests;
  enabled: () => boolean;
  hasAi: () => boolean;
};

export function createAssistantLawPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    research: researchQuestion,
    fileRequests: fileSourceRequests,
    enabled: () => assistantLawEnabled(),
    hasAi: hasConfiguredServerAi,
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
    if (!(await deps.authenticate(request))) return NextResponse.json({ ok: true, findings: [], skipped: "sign-in" });

    const result = await deps.research({
      question: body.question,
      ...(body.story ? { story: body.story } : {}),
      courtPath: body.courtPath,
      ...(body.side && SIDES[body.side] ? { side: SIDES[body.side] } : {}),
    });
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
