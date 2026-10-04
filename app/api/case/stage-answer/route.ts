/**
 * The published "what happens next" answer for a stage THE USER CHOSE.
 *
 * *** NO MODEL ***
 *
 * `/api/case/resolve-stage` works out a stage from a story with a model and
 * returns a suggestion. This route does not guess anything: the user picks
 * their position from the fixed stage list in the builder (CLAUDE.md §4,
 * suggest never decide — here there is nothing to suggest), and this returns
 * the reviewed block for it, through the same render door and gates.
 *
 * Added 2026-10-01: the 35 stage answers were published, and no page called
 * either route, so no user could see them.
 *
 * In:  { stageId, courtPath, confirmedFacts? }
 * Out: { outcome: "rendered", answer } | { outcome: "needs-a-fact", question,
 *        answer (the general block, or null) } | { outcome: "unavailable", message }
 */

import { NextResponse } from "next/server";

import { renderStageAnswerOrRefuse } from "../../../../src/lib/content-library/stageAnswerView";
import { findStage, isSpecialStage } from "../../../../src/lib/case-system/stage-map/stageMap";
import {
  STAGE_ANSWER_UNAVAILABLE_MESSAGE,
  STAGE_SCOPE_UNCONFIRMED_MESSAGE,
} from "../../../../src/lib/case-system/stage-map/stageMessages";

type Body = {
  stageId?: unknown;
  courtPath?: unknown;
  confirmedFacts?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const stageId = typeof body.stageId === "string" ? body.stageId : "";
  if (!stageId || !findStage(stageId) || isSpecialStage(stageId)) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  }

  /*
   * The stored court path is the scope verdict. A case gets only its own
   * court's guidance; a stage from another court is refused by the render
   * door's forum gate, exactly as a model-resolved stage would be.
   */
  const courtPath =
    body.courtPath === "small-claims" || body.courtPath === "civil" || body.courtPath === "family"
      ? body.courtPath
      : null;
  const scope = courtPath ? { primaryPath: courtPath, confidence: 1 } : null;

  const facts: Record<string, string> = {};
  if (body.confirmedFacts && typeof body.confirmedFacts === "object") {
    for (const [key, value] of Object.entries(body.confirmedFacts as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim() && value.length <= 200) {
        facts[key] = value.trim();
      }
    }
  }

  const outcome = renderStageAnswerOrRefuse(stageId, facts, {}, scope);

  if (outcome.kind === "rendered") {
    return NextResponse.json({ outcome: "rendered", answer: outcome.answer });
  }

  if (outcome.refusal.reason === "fact-not-confirmed") {
    const alternative = outcome.refusal.generalAlternative;
    const general = alternative ? renderStageAnswerOrRefuse(alternative, facts, {}, scope) : null;
    return NextResponse.json({
      outcome: "needs-a-fact",
      question: outcome.refusal.question,
      answer: general?.kind === "rendered" ? general.answer : null,
    });
  }

  return NextResponse.json({
    outcome: "unavailable",
    message:
      outcome.refusal.reason === "scope-not-established"
        ? STAGE_SCOPE_UNCONFIRMED_MESSAGE
        : STAGE_ANSWER_UNAVAILABLE_MESSAGE,
  });
}
