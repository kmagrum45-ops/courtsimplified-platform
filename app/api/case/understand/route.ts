import { NextResponse } from "next/server";
import { aiLimitResponse } from "@/src/lib/security/aiRouteGuard";

import { checkedAnswerView } from "@/src/lib/case-system/retrieval/checkedAnswer";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { understandCase } from "@/src/lib/case-system/understanding/understandCase";
import { caseUnderstandingEnabled } from "@/src/lib/content-library/phaseScope";

/**
 * The front door's reading of a person's story (site owner, 2026-10-14):
 * understandCase reasons about the whole story, and every legal point is
 * checked against the official text before it is returned. Replaces the
 * court-path labels and fixed notes at the front door; /api/classify-court-path
 * stays as the fallback when this is off or unavailable.
 *
 * Not signed-in, like the court-path check it replaces: the front door comes
 * before any account. The site is behind its access password.
 */

export const runtime = "nodejs";
// The reasoning call (up to 110 s) and the checking (up to 150 s) inside
// Vercel's 300 s limit.
export const maxDuration = 300;

const MAX_STORY = 6_000;
const MAX_ANSWERS = 8;
const COURTS = new Set(["small-claims", "civil", "family"]);

type Body = {
  story: string;
  city?: string;
  chosenCourt?: "small-claims" | "civil" | "family";
  answers?: { question: string; answer: string }[];
};

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["story", "city", "chosenCourt", "answers"].includes(key))) return false;
  return (
    typeof body.story === "string" &&
    body.story.trim().length >= 10 &&
    body.story.length <= MAX_STORY &&
    (body.city === undefined || (typeof body.city === "string" && body.city.length <= 120)) &&
    (body.chosenCourt === undefined || (typeof body.chosenCourt === "string" && COURTS.has(body.chosenCourt))) &&
    (body.answers === undefined ||
      (Array.isArray(body.answers) &&
        body.answers.length <= MAX_ANSWERS &&
        body.answers.every(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof (item as { question?: unknown }).question === "string" &&
            typeof (item as { answer?: unknown }).answer === "string" &&
            (item as { question: string }).question.length <= 400 &&
            (item as { answer: string }).answer.length <= 1_000,
        )))
  );
}

export async function POST(request: Request) {
  // Per-visitor and daily AI limits (2026-10-14 audit, aiRateLimit.ts).
  const limited = await aiLimitResponse(request, "understand");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  if (!isBody(body)) return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  if (!caseUnderstandingEnabled() || !hasConfiguredServerAi()) return NextResponse.json({ ok: true, skipped: "off" });

  const result = await understandCase({
    story: body.story,
    ...(body.city ? { city: body.city } : {}),
    ...(body.chosenCourt ? { chosenCourt: body.chosenCourt } : {}),
    ...(body.answers ? { answers: body.answers } : {}),
  });
  if (result.status !== "understood") return NextResponse.json({ ok: true, skipped: "unavailable" });

  // Law the library does not hold yet becomes a source request, as on every
  // checked answer.
  if (result.answer.missingLaw.length) {
    const court = result.understanding.mainCourt;
    await fileSourceRequests(result.answer.missingLaw, {
      courtPath: court === "small-claims" || court === "family" ? court : "civil",
    }).catch(() => undefined);
  }
  return NextResponse.json({
    ok: true,
    understanding: result.understanding,
    answer: checkedAnswerView(result.answer),
  });
}
