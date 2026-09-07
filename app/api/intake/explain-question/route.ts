import { NextRequest, NextResponse } from "next/server";

import { explainQuestionForUser } from "@/src/lib/case-system/intake/explainQuestion";
import { QUESTION_BANK } from "@/src/lib/case-system/intake/questionBank";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * Session 15 -- Tier 2 field help for the Small Claims static form. The
 * client sends only a `questionId`; this route looks the question up
 * itself from the real, reviewed QUESTION_BANK and passes only its fixed
 * `text`/`why` to explainQuestionForUser(). The client never sends
 * question text directly and never sends any of the form's other field
 * values -- there is no request field for them, so there is no channel
 * through which a user's own answers could reach the explanation prompt,
 * even by accident. This mirrors guided-turn/route.ts's auth pattern
 * exactly: getAuthenticatedUser() + hasConfiguredServerAi(), required
 * unconditionally since there's no deterministic fallback for this call.
 */

export const runtime = "nodejs";

const MAX_QUESTION_ID_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type ExplainQuestionRequestBody = {
  questionId: string;
};

function isExplainQuestionRequestBody(value: unknown): value is ExplainQuestionRequestBody {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(["questionId"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;

  return (
    typeof value.questionId === "string" &&
    value.questionId.length > 0 &&
    value.questionId.length <= MAX_QUESTION_ID_LENGTH
  );
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type ExplainQuestionRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  explain: typeof explainQuestionForUser;
  hasExternalAiKey: () => boolean;
};

export function createExplainQuestionPost(overrides: Partial<ExplainQuestionRouteDependencies> = {}) {
  const dependencies: ExplainQuestionRouteDependencies = {
    authenticate: getAuthenticatedUser,
    explain: explainQuestionForUser,
    hasExternalAiKey: hasConfiguredServerAi,
    ...overrides,
  };

  return async function explainQuestionPost(request: NextRequest) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("A valid request body is required.", 400);
    }

    if (!isExplainQuestionRequestBody(body)) {
      return errorResponse("A valid request body is required.", 400);
    }

    try {
      const authenticated = Boolean(await dependencies.authenticate(request));
      if (!authenticated) {
        return errorResponse("Sign in required.", 401);
      }

      if (!dependencies.hasExternalAiKey()) {
        return errorResponse("Explanations are not available right now.", 503);
      }
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return errorResponse("Explanations are not available right now.", 503);
      }

      // Looked up server-side, from the real reviewed bank only -- the
      // client sends an id, never text/why directly, so it cannot inject
      // arbitrary content into the explanation prompt through this route.
      const question = QUESTION_BANK.find(
        (item) => item.id === body.questionId && item.status === "reviewed",
      );
      if (!question) {
        return errorResponse("Question not found.", 404);
      }

      const result = await dependencies.explain({ text: question.text, why: question.why }, apiKey);

      return NextResponse.json({ ok: true, explanation: result?.explanation ?? null });
    } catch {
      console.error("Explain-question route failed.");
      return errorResponse("CourtSimplified could not generate an explanation right now.", 500);
    }
  };
}

export const POST = createExplainQuestionPost();
