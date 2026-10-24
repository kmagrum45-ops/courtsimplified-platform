import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { aiLimitResponse } from "@/src/lib/security/aiRouteGuard";

import { checkedAnswerView } from "@/src/lib/case-system/retrieval/checkedAnswer";
import { fileSourceRequests } from "@/src/lib/case-system/retrieval/sourceRequests";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { understandCase } from "@/src/lib/case-system/understanding/understandCase";
import { caseUnderstandingEnabled } from "@/src/lib/content-library/phaseScope";
import { understandingInputError, isUnderstandingBody } from "@/src/lib/case-system/understanding/understandInput";

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

export async function POST(request: Request) {
  // Per-visitor and daily AI limits (2026-10-14 audit, aiRateLimit.ts).
  const limited = await aiLimitResponse(request, "understand");
  if (limited) return limited;

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 120_000) return NextResponse.json({ ok: false, error: "This request is too long. Your answers have not been processed." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  if (!isUnderstandingBody(body)) return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  const inputError = understandingInputError(body.story, body.city ?? "", body.answers ?? []);
  if (inputError) return NextResponse.json({ ok: false, error: inputError }, { status: 400 });
  if (!(await getAuthenticatedUser(request))) return NextResponse.json({ ok: true, skipped: "authentication-required" });
  if (!caseUnderstandingEnabled() || !hasConfiguredServerAi()) return NextResponse.json({ ok: true, skipped: "off" });

  const result = await understandCase({
    story: body.story,
    ...(body.city ? { city: body.city } : {}),
    ...(body.chosenCourt ? { chosenCourt: body.chosenCourt } : {}),
    ...(body.answers ? { answers: body.answers } : {}),
    ...(body.situation ? { situation: body.situation } : {}),
  }, { signal: request.signal, intakeOnly: true });
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
