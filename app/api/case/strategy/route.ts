import { withConfirmedGuidance } from "@/src/lib/security/intakeGuidanceGate";
import { NextRequest, NextResponse } from "next/server";

import { buildStrategy } from "@/src/lib/case-system/retrieval/strategy";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { strategyEnabled } from "@/src/lib/content-library/phaseScope";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { caseFactsText, readCaseRecord } from "@/src/lib/case-system/caseRecord";
import { userStory } from "@/src/lib/case-system/userStory";
import { allDateQuestions } from "@/src/lib/case-system/casePosition";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";

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

type Body = { story?: string; courtPath: "small-claims" | "civil" | "family"; side?: string; caseId?: string };

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["story", "courtPath", "side", "caseId"].includes(key))) return false;
  if (typeof body.courtPath !== "string" || !COURTS.has(body.courtPath)) return false;
  if (body.caseId !== undefined && (typeof body.caseId !== "string" || !body.caseId)) return false;
  if (body.story !== undefined && (typeof body.story !== "string" || body.story.length > MAX_STORY)) return false;
  if (body.side !== undefined && (typeof body.side !== "string" || !(body.side in SIDES))) return false;
  // A saved case gives its own story and side; without one, the request must.
  return body.caseId !== undefined || (typeof body.story === "string" && body.story.trim().length >= 20 && typeof body.side === "string");
}

/**
 * The saved case, read the way every other screen reads it (caseRecord.ts): the side from
 * the person's own situation answers first (sideFromParts), the stage and exact step, the
 * dates, the amount and the kind of claim they confirmed, as the same case-facts text the
 * law lookup uses (names never included). The strategy follows the shared pieces like
 * everything else (site owner, 2026-10-25): it used the intake form's own role field and
 * no saved facts at all.
 */
type SavedCase = { story: string; side: "plaintiff" | "defendant" | null; facts: string };

type Dependencies = {
  authenticate: typeof getAuthenticatedUser;
  build: typeof buildStrategy;
  fileRequests: typeof fileSourceRequests;
  enabled: () => boolean;
  hasAi: () => boolean;
  loadCase: (request: NextRequest, user: { id: string }, caseId: string) => Promise<SavedCase | null>;
};

export function createStrategyPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    build: buildStrategy,
    fileRequests: fileSourceRequests,
    enabled: () => strategyEnabled(),
    hasAi: hasConfiguredServerAi,
    loadCase: async (request, user, caseId) => {
      const owned = (await getAuthenticatedOwnedCase(request, user as never, caseId).catch(() => null)) as { master_result?: unknown; court_path?: string | null } | null;
      if (!owned) return null;
      const master = (owned.master_result && typeof owned.master_result === "object" ? owned.master_result : {}) as Record<string, unknown>;
      const record = readCaseRecord(master, owned.court_path);
      return {
        story: userStory(master.intakeData as never),
        side: record.side ? (record.side.value === "responding" ? "defendant" : "plaintiff") : null,
        facts: caseFactsText(record, { stepTitle: (id) => findStage(id)?.title, dateQuestion: (id) => allDateQuestions().find((question) => question.id === id)?.question }),
      };
    },
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
    const saved = body.caseId ? await deps.loadCase(request, user as { id: string }, body.caseId).catch(() => null) : null;
    const story = (saved?.story || body.story || "").slice(0, MAX_STORY);
    const side = saved?.side ?? (body.side ? SIDES[body.side] : null);
    if (story.trim().length < 20 || !side) return NextResponse.json({ ok: false, error: "A story, a court and a side are required." }, { status: 400 });
    const result = await deps.build({ story, courtPath: body.courtPath, side, ...(saved?.facts ? { facts: saved.facts } : {}) });
    if (result.missingLaw.length) await deps.fileRequests(result.missingLaw, { courtPath: body.courtPath });
    return NextResponse.json({ ok: true, sections: result.sections.filter((section) => section.answer.status !== "unavailable") });
  };
}

export const POST = withConfirmedGuidance(createStrategyPost(), {"currentAnalysis":true});
