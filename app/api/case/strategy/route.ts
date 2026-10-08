import { NextRequest, NextResponse } from "next/server";

import { buildStrategy } from "@/src/lib/case-system/retrieval/strategy";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { strategyEnabled } from "@/src/lib/content-library/phaseScope";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

/**
 * POST /api/case/strategy (2026-10-08): the person's matter from every seat
 * (retrieval/strategy.ts). Signed-in only, behind STRATEGY=on (off on the live
 * site until A2I approval), on the person's click, never automatically. Each
 * section is a checked answer; nothing grades the case.
 */
// Four thorough checked answers side by side; Vercel's Fluid-compute limit.
export const maxDuration = 300;

const MAX_STORY = 8_000;
const COURTS = new Set(["small-claims", "civil", "family"]);
const SIDES: Record<string, "plaintiff" | "defendant"> = {
  plaintiff: "plaintiff",
  applicant: "plaintiff",
  defendant: "defendant",
  respondent: "defendant",
};

type Body = { story: string; courtPath: "small-claims" | "civil" | "family"; side: string };

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["story", "courtPath", "side"].includes(key))) return false;
  return (
    typeof body.story === "string" &&
    body.story.trim().length >= 20 &&
    body.story.length <= MAX_STORY &&
    typeof body.courtPath === "string" &&
    COURTS.has(body.courtPath) &&
    typeof body.side === "string" &&
    body.side in SIDES
  );
}

type Dependencies = {
  authenticate: typeof getAuthenticatedUser;
  build: typeof buildStrategy;
  fileRequests: typeof fileSourceRequests;
  enabled: () => boolean;
  hasAi: () => boolean;
};

export function createStrategyPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    build: buildStrategy,
    fileRequests: fileSourceRequests,
    enabled: () => strategyEnabled(),
    hasAi: hasConfiguredServerAi,
    ...overrides,
  };
  return async function strategyPost(request: NextRequest) {
    if (!deps.enabled()) return NextResponse.json({ ok: true, sections: [], skipped: "off" });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
    }
    if (!isBody(body)) return NextResponse.json({ ok: false, error: "A story, a court and a side are required." }, { status: 400 });
    const user = await deps.authenticate(request).catch(() => null);
    if (!user) return NextResponse.json({ ok: true, sections: [], skipped: "signed-out" });
    if (!deps.hasAi()) return NextResponse.json({ ok: true, sections: [], skipped: "no-ai" });
    const result = await deps.build({ story: body.story, courtPath: body.courtPath, side: SIDES[body.side] });
    if (result.missingLaw.length) await deps.fileRequests(result.missingLaw, { courtPath: body.courtPath });
    return NextResponse.json({ ok: true, sections: result.sections.filter((section) => section.answer.status !== "unavailable") });
  };
}

export const POST = createStrategyPost();
