import { NextResponse } from "next/server";

import { classifyCourtPath } from "../../../src/lib/case-system/intelligence/courtPathClassifier";

/**
 * Thin server wrapper around the existing court-path classifier.
 *
 * The classifier reads OPENAI_API_KEY and must not run in the browser, so the
 * intake gate calls this route instead of importing it directly.
 *
 * This route classifies only. It never routes, never persists, and never
 * decides for the user: the caller shows the result as a suggestion the user
 * confirms or overrides.
 */

export const runtime = "nodejs";

const MAX_STORY_CHARACTERS = 4_000;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = (body || {}) as {
    story?: unknown;
    declaredCourtPath?: unknown;
  };

  const story = String(payload.story || "").slice(0, MAX_STORY_CHARACTERS).trim();

  if (!story) {
    return NextResponse.json({ error: "A story is required." }, { status: 400 });
  }

  const declaredCourtPath =
    typeof payload.declaredCourtPath === "string"
      ? payload.declaredCourtPath
      : null;

  try {
    const classification = await classifyCourtPath({ story, declaredCourtPath });
    return NextResponse.json(classification);
  } catch (error) {
    // classifyCourtPath is documented as never throwing. If that ever changes,
    // the intake must still be able to continue, so fail open and let the
    // caller proceed on the user's own selection.
    console.error("Court path classification route failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        primaryPath: "unknown",
        secondaryPath: null,
        outOfScopeForum: null,
        confidence: 0,
        reasoning: "Classification unavailable.",
        source: "ai-error",
        aiCalled: false,
      },
      { status: 200 },
    );
  }
}
