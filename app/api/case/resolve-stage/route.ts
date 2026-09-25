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
  createOpenAIClient,
  withAbortableTimeout,
} from "../../../../src/lib/case-system/openaiClient";
import { withAiCallContext, recordAiValidation } from "../../../../src/lib/audit/aiCallLog";
import {
  resolveFromModelOutput,
  stageCatalogueForPrompt,
  STAGE_RESOLVER_SYSTEM,
  type StageModelOutput,
  type StageResolution,
} from "../../../../src/lib/case-system/stage-map/resolveStage";
import {
  UNKNOWN_STAGE_MESSAGE,
  UNKNOWN_STAGE_MESSAGE_NO_QUESTION,
  OUT_OF_SCOPE_STAGE_MESSAGE,
  STAGE_REFERRALS,
} from "../../../../src/lib/case-system/stage-map/stageMessages";
import { renderStageAnswer } from "../../../../src/lib/content-library/stageAnswerView";

const MAX_CONTEXT_BYTES = 20_000;
const TIMEOUT_MS = 25_000;

type Body = { caseContext?: unknown; caseId?: unknown };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Everything the user sees, assembled from content that was checked first. */
function present(resolution: StageResolution) {
  if (resolution.kind === "out-of-scope") {
    return {
      outcome: "out-of-scope" as const,
      message: OUT_OF_SCOPE_STAGE_MESSAGE,
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
    };
  }

  /*
   * A suggested stage with no published block is still UNKNOWN to the user.
   *
   * Knowing where someone is and having nothing checked to tell them is not
   * an answer. Showing the stage name alone would imply guidance we do not
   * have.
   */
  const answer = renderStageAnswer(resolution.stageId);
  if (!answer) {
    return {
      outcome: "unknown" as const,
      message: UNKNOWN_STAGE_MESSAGE_NO_QUESTION,
      clarifyingQuestion: null,
      candidates: [resolution.stageId],
      referrals: STAGE_REFERRALS,
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

  const resolution = await withAiCallContext({ callType: "stage-resolver", caseId }, async () => {
    let output: StageModelOutput | null = null;

    try {
      const client = createOpenAIClient();
      const response = await withAbortableTimeout(
        (signal) =>
          client.chat.completions.create(
            {
              model: "gpt-4o-mini",
              temperature: 0,
              seed: 1,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: STAGE_RESOLVER_SYSTEM },
                {
                  role: "user",
                  content: `STAGES:\n\n${stageCatalogueForPrompt()}\n\nTHE CASE:\n\n${caseContext}`,
                },
              ],
            },
            { signal },
          ),
        TIMEOUT_MS,
      );

      const content = response?.choices[0]?.message?.content;
      if (content) output = JSON.parse(content) as StageModelOutput;
    } catch {
      // Any failure is UNKNOWN. See the header: there is no path from a
      // failure to a confident answer.
      output = null;
    }

    const resolved = resolveFromModelOutput(output);

    recordAiValidation(
      resolved.kind === "suggested" ? "valid" : "invalid",
      resolved.kind === "suggested"
        ? `stage ${resolved.stageId} at ${resolved.confidence}`
        : `declined: ${resolved.kind}`,
    );

    return resolved;
  });

  return NextResponse.json(present(resolution));
}
