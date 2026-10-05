import { NextRequest, NextResponse } from "next/server";

import { loadCorpusIndex } from "@/src/lib/case-system/retrieval/corpusIndex";
import {
  passagesById,
  questionsFromPassages,
  researchForQuestions,
} from "@/src/lib/case-system/retrieval/sourcedQuestions";
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
 * TWO CALLS, each with a whole request's time (one request ran out of time
 * on 9 of 12 stories when the model was slow, 2026-10-05):
 *   1. { story, courtPath, side? } -> research -> { passageIds, situation }
 *   2. the same plus { passageIds, situation } -> { questions }
 * Phase 2 takes passage IDS and re-reads each from the index, hash-checked,
 * so the text the questions are written from is always the official text.
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

type Body = {
  story: string;
  courtPath: "small-claims" | "civil" | "family";
  side?: string;
  passageIds?: string[];
  situation?: string;
};

const PASSAGE_ID = /^corpus:[A-Za-z0-9._-]{1,120}:\d{1,6}$/;

function isSourcedQuestionsBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.some((key) => !["story", "courtPath", "side", "passageIds", "situation"].includes(key))) return false;
  if (
    body.passageIds !== undefined &&
    !(Array.isArray(body.passageIds) && body.passageIds.length <= 10 && body.passageIds.every((id) => typeof id === "string" && PASSAGE_ID.test(id)))
  ) {
    return false;
  }
  if (body.situation !== undefined && !(typeof body.situation === "string" && body.situation.length <= 300)) return false;
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
  research: typeof researchForQuestions;
  questions: typeof questionsFromPassages;
  index: typeof loadCorpusIndex;
  fileRequests: typeof fileSourceRequests;
  enabled: () => boolean;
  hasAi: () => boolean;
};

export function createSourcedQuestionsPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    research: researchForQuestions,
    questions: questionsFromPassages,
    index: loadCorpusIndex,
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

    const input = {
      story: body.story,
      courtPath: body.courtPath,
      ...(body.side && SIDES[body.side] ? { side: SIDES[body.side] } : {}),
    };

    if (!body.passageIds) {
      const found = await deps.research(input);
      if (found.sourceRequests.length > 0) {
        await deps.fileRequests(found.sourceRequests, { courtPath: body.courtPath });
      }
      return NextResponse.json({
        ok: true,
        passageIds: found.passageIds,
        situation: found.situation,
        ...(found.skipped ? { skipped: found.skipped } : {}),
      });
    }

    const index = deps.index();
    const passages = index ? passagesById(index, body.passageIds) : [];
    const result = await deps.questions(input, passages, body.situation ?? "");
    return NextResponse.json({
      ok: true,
      questions: result.questions,
      ...(result.skipped ? { skipped: result.skipped } : {}),
    });
  };
}

export const POST = createSourcedQuestionsPost();
