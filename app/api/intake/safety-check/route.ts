import { NextRequest, NextResponse } from "next/server";
import { aiLimitResponse } from "@/src/lib/security/aiRouteGuard";

import { runSafetyPass } from "@/src/lib/case-system/intake/safetyPass";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

/** The existing safety pass remains independent of intake confirmation.
 * Paid classification requires server authentication; fixed resources are
 * available to every intake user without waiting for AI.
 */

export const runtime = "nodejs";

const MAX_STORY_TEXT_LENGTH = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type SafetyCheckRequestBody = {
  storyText: string;
};

function isSafetyCheckRequestBody(value: unknown): value is SafetyCheckRequestBody {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(["storyText"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;

  return (
    typeof value.storyText === "string" &&
    value.storyText.trim().length > 0 &&
    value.storyText.length <= MAX_STORY_TEXT_LENGTH
  );
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

type SafetyCheckRouteDependencies = {
  authenticate: typeof getAuthenticatedUser;
  runSafety: typeof runSafetyPass;
  hasExternalAiKey: () => boolean;
};

export function createSafetyCheckPost(overrides: Partial<SafetyCheckRouteDependencies> = {}) {
  const dependencies: SafetyCheckRouteDependencies = {
    authenticate: getAuthenticatedUser,
    runSafety: runSafetyPass,
    hasExternalAiKey: hasConfiguredServerAi,
    ...overrides,
  };

  return async function safetyCheckPost(request: NextRequest) {
    // Safety classification is available during intake, independently of review.
    // Paid AI still requires a server-verified session. General fixed safety
    // information is available in the intake review panel without classification.
    if (!await dependencies.authenticate(request)) return errorResponse("Sign in required for the AI safety check.", 401);
    // Per-visitor and daily AI limits (2026-10-14 audit, aiRateLimit.ts).
    const limited = await aiLimitResponse(request, "safety");
    if (limited) { console.error("Safety-check route refused: AI limit reached."); return limited; }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("A valid request body is required.", 400);
    }

    if (!isSafetyCheckRequestBody(body)) {
      return errorResponse("A valid request body is required.", 400);
    }

    try {
      if (!dependencies.hasExternalAiKey()) {
        console.error("Safety-check route unavailable: no AI key.");
        return errorResponse("The safety check is not available right now.", 503);
      }
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return errorResponse("The safety check is not available right now.", 503);
      }

      const result = await dependencies.runSafety(body.storyText, apiKey);

      // `reason` is deliberately never included -- SafetyPassResult marks
      // it "for internal logging only, never shown to any user."
      // `userMessage` is the same fixed IMMEDIATE_DANGER_MESSAGE /
      // DISTRESS_ACKNOWLEDGMENT constant guided mode uses, never
      // model-generated text.
      return NextResponse.json({
        ok: true,
        classification: result.classification,
        // Step 6d: the model sets a boolean; the client shows fixed words.
        requestsLegalAdvice: result.requestsLegalAdvice,
        userMessage: result.userMessage ?? null,
      });
    } catch {
      console.error("Safety-check route failed.");
      return errorResponse("CourtSimplified could not complete the safety check right now.", 500);
    }
  };
}

export const POST = createSafetyCheckPost();
