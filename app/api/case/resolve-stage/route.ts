/**
 * PART 5 — the runtime door for working out where a case stands.
 *
 * *** WHAT GOES IN AND WHAT COMES BACK ***
 *
 * In: everything known about the case, as text. The model is given the full
 * context deliberately — the old `inferStage` decided from a substring match
 * and that is exactly what this replaces.
 *
 * Out: a stage id from a fixed list, or an admission that we do not know, plus
 * the published block for that stage if there is one. **No prose the model
 * wrote ever leaves this route.** Its reasoning goes to `ai_call_log` and
 * nowhere else.
 *
 * *** WHY THE ANSWER IS A SUGGESTION ***
 *
 * The response says `suggested`, not `stage`. Nothing is persisted and no
 * content is presented as settled until the user confirms (CLAUDE.md §4). The
 * alternative and the clarifying question are returned with it so they have
 * something concrete to disagree with.
 *
 * *** WHY IT IS SAFE TO FAIL ***
 *
 * A model that errors, times out, returns malformed JSON or names a stage that
 * does not exist all land in the same place: UNKNOWN, with referrals. There is
 * no path where a failure produces a confident answer, because the failure
 * mode being replaced was precisely a default that looked like an answer.
 */

import { NextResponse } from "next/server";

import {
  resolveCasePosition,
  type CasePosition,
} from "../../../../src/lib/case-system/stage-map/resolveCasePosition";
import { withAiCallContext, recordAiValidation } from "../../../../src/lib/audit/aiCallLog";
import {
  UNKNOWN_STAGE_MESSAGE,
  UNKNOWN_STAGE_MESSAGE_NO_QUESTION,
  OUT_OF_SCOPE_STAGE_MESSAGE,
  STAGE_REFERRALS,
} from "../../../../src/lib/case-system/stage-map/stageMessages";
import { renderStageAnswer } from "../../../../src/lib/content-library/stageAnswerView";
import {
  caseDatesFrom,
  type CaseDates,
} from "../../../../src/lib/case-system/deadlines/deadlineEvents";

const MAX_CONTEXT_BYTES = 20_000;

type Body = {
  caseContext?: unknown;
  caseId?: unknown;
  courtPath?: unknown;
  /**
   * Answers to the date questions, keyed by question bank id. All optional.
   *
   * Decision 5. Sent as whatever the person typed, never as a date this route
   * is asked to trust: `caseDatesFrom` parses each one and drops anything
   * ambiguous. The alternative — accepting an ISO date from the caller — would
   * put the parsing in whichever component happened to collect the answer, and
   * "03/04/2026" would then mean March or April depending on who wrote that
   * component.
   */
  dateAnswers?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Everything the user sees, assembled from content that was checked first. */
function present(position: CasePosition, dates: CaseDates) {
  if (position.kind === "out-of-scope") {
    return {
      outcome: "out-of-scope" as const,
      message: OUT_OF_SCOPE_STAGE_MESSAGE,
      forum: position.forum ? { id: position.forum.id, name: position.forum.name } : null,
      referrals: STAGE_REFERRALS,
    };
  }

  const resolution = position.stage;

  /*
   * The boundary caveat rides ALONGSIDE the answer, never instead of it.
   *
   * See resolveCasePosition: where the LTB / Small Claims line falls for a
   * former tenant is unsourceable, so the person gets the Small Claims
   * guidance AND is told the forum may be the other one. A dead end would be
   * safe and useless.
   */
  const caveat =
    position.kind === "boundary-unclear"
      ? {
          forum: position.forum ? { id: position.forum.id, name: position.forum.name } : null,
          message: position.reasoning,
          referrals: STAGE_REFERRALS,
        }
      : null;

  /*
   * The resolver's own out-of-scope backstop fired.
   *
   * Scope is settled before it is called, so reaching here means the stage
   * resolver saw a matter that plainly belongs elsewhere and the classifier
   * had let it through. Treated as out of scope rather than overruled — it is
   * the second of two components to say so.
   */
  if (resolution.kind === "out-of-scope") {
    return {
      outcome: "out-of-scope" as const,
      message: OUT_OF_SCOPE_STAGE_MESSAGE,
      forum: null,
      referrals: STAGE_REFERRALS,
    };
  }

  if (resolution.kind === "unknown") {
    return {
      outcome: "unknown" as const,
      message: resolution.clarifyingQuestion
        ? UNKNOWN_STAGE_MESSAGE
        : UNKNOWN_STAGE_MESSAGE_NO_QUESTION,
      // Never model-written. It is the recorded boundary between two stages.
      clarifyingQuestion: resolution.clarifyingQuestion ?? null,
      candidates: resolution.candidates,
      referrals: STAGE_REFERRALS,
      caveat,
    };
  }

  /*
   * A suggested stage with no published block is still UNKNOWN to the user.
   *
   * Knowing where someone is and having nothing checked to tell them is not
   * an answer. Showing the stage name alone would imply guidance we do not
   * have.
   */
  const answer = renderStageAnswer(resolution.stageId, {}, dates);
  if (!answer) {
    return {
      outcome: "unknown" as const,
      message: UNKNOWN_STAGE_MESSAGE_NO_QUESTION,
      clarifyingQuestion: null,
      candidates: [resolution.stageId],
      referrals: STAGE_REFERRALS,
      caveat,
    };
  }

  return {
    outcome: "suggested" as const,
    suggested: {
      stageId: resolution.stageId,
      confidence: resolution.confidence,
      because: resolution.because,
      alternative: resolution.alternative ?? null,
    },
    answer,
    caveat,
  };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const caseContext = text(body.caseContext);
  if (!caseContext) {
    return NextResponse.json({ error: "caseContext is required." }, { status: 400 });
  }
  if (Buffer.byteLength(caseContext, "utf8") > MAX_CONTEXT_BYTES) {
    return NextResponse.json({ error: "caseContext is too large." }, { status: 413 });
  }

  const caseId = text(body.caseId) || null;

  const courtPath = text(body.courtPath) || null;

  /*
   * A bad `dateAnswers` costs the reader their computed dates and nothing else.
   *
   * Not a 400. The date questions are optional by design, so a malformed bag of
   * answers has to land in the same place as an unanswered one — the periods,
   * with their rules. Failing the whole request would mean a client bug here
   * took away the stage answer as well.
   */
  const dateAnswers: Record<string, string> = {};
  if (body.dateAnswers && typeof body.dateAnswers === "object") {
    for (const [key, value] of Object.entries(body.dateAnswers as Record<string, unknown>)) {
      if (typeof value === "string" && value.length <= 64) dateAnswers[key] = value;
    }
  }
  const dates = caseDatesFrom(dateAnswers);

  const position = await withAiCallContext({ callType: "stage-resolver", caseId }, async () => {
    const resolved = await resolveCasePosition(caseContext, { knownCourtPath: courtPath });

    const stage = resolved.kind === "out-of-scope" ? null : resolved.stage;
    recordAiValidation(
      stage?.kind === "suggested" ? "valid" : "invalid",
      stage?.kind === "suggested"
        ? `stage ${stage.stageId} at ${stage.confidence}`
        : `declined: ${resolved.kind}${stage ? ` / ${stage.kind}` : ""}`,
    );

    return resolved;
  });

  return NextResponse.json(present(position, dates));
}
