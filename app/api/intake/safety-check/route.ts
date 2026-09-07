import { NextRequest, NextResponse } from "next/server";

import { runSafetyPass } from "@/src/lib/case-system/intake/safetyPass";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";

/**
 * Session 17 -- the Small Claims static form's own path to the same
 * safety pass guided mode already runs on every free-text turn
 * (orchestrateIntakeTurn.ts calls runSafetyPass() directly; this route
 * calls the identical function, not a reimplementation). SmallClaimsIntake.tsx
 * calls this before its existing /api/small-claims/analyze submission --
 * that route's own logic is untouched by this session.
 *
 * Auth pattern matches guided-turn/route.ts: required unconditionally,
 * no deterministic fallback, since runSafetyPass() always calls real AI
 * and there's no safe deterministic substitute for a safety
 * classification. An unauthenticated form submission simply skips this
 * check client-side rather than calling this route -- same as today,
 * not a new gap this route introduces.
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
      const authenticated = Boolean(await dependencies.authenticate(request));
      if (!authenticated) {
        return errorResponse("Sign in required.", 401);
      }

      if (!dependencies.hasExternalAiKey()) {
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
        userMessage: result.userMessage ?? null,
      });
    } catch {
      console.error("Safety-check route failed.");
      return errorResponse("CourtSimplified could not complete the safety check right now.", 500);
    }
  };
}

export const POST = createSafetyCheckPost();
