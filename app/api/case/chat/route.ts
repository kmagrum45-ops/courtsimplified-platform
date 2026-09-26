/**
 * CHAT ITEM 6 — the runtime door for asking the library a question.
 *
 * In: a question, optionally what is known about the case, optionally the date
 * answers.
 *
 * Out: published blocks, chosen by id. **No prose the model wrote ever leaves
 * this route**, because there is no field in the model's reply that a sentence
 * could travel in — it returns ids, an enum and two booleans. Its reasoning goes
 * to `ai_call_log` and nowhere else.
 *
 * *** WHY THIS IS A SEPARATE ROUTE FROM resolve-stage ***
 *
 * They answer different questions. `resolve-stage` asks "where is this case",
 * takes the whole case context, and returns one position. This asks "which of
 * the things we have written answers what they just typed", which may be none of
 * them and may be more than one, and which has to handle a question that is not
 * about position at all.
 *
 * Folding them together would mean every chat message re-ran stage resolution
 * over the full context, and every stage resolution pretended a question had
 * been asked.
 */

import { NextResponse } from "next/server";

import { withAiCallContext, recordAiValidation, recordRequestsLegalAdvice } from "../../../../src/lib/audit/aiCallLog";
import { selectFromLibrary } from "../../../../src/lib/case-system/chat/libraryChat";
import { assembleChatAnswer } from "../../../../src/lib/case-system/chat/assembleChatAnswer";
import { caseDatesFrom } from "../../../../src/lib/case-system/deadlines/deadlineEvents";

const MAX_MESSAGE_BYTES = 4_000;
const MAX_CONTEXT_BYTES = 20_000;

type Body = {
  message?: unknown;
  caseContext?: unknown;
  caseId?: unknown;
  dateAnswers?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = text(body.message);
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }
  if (Buffer.byteLength(message, "utf8") > MAX_MESSAGE_BYTES) {
    return NextResponse.json({ error: "message is too large." }, { status: 413 });
  }

  const caseContext = text(body.caseContext);
  if (Buffer.byteLength(caseContext, "utf8") > MAX_CONTEXT_BYTES) {
    return NextResponse.json({ error: "caseContext is too large." }, { status: 413 });
  }

  const caseId = text(body.caseId) || null;

  // Same treatment as resolve-stage: whatever they typed, parsed here, and an
  // ambiguous date is dropped rather than guessed.
  const dateAnswers: Record<string, string> = {};
  if (body.dateAnswers && typeof body.dateAnswers === "object") {
    for (const [key, value] of Object.entries(body.dateAnswers as Record<string, unknown>)) {
      if (typeof value === "string" && value.length <= 64) dateAnswers[key] = value;
    }
  }

  const selection = await withAiCallContext({ callType: "library-chat", caseId }, async () => {
    const chosen = await selectFromLibrary(message, caseContext);

    /*
     * What the audit records: whether the router found anything, and whether the
     * question was one we must decline. Not the question itself — the narrative
     * never enters the log (migration Decision 1).
     */
    recordAiValidation(
      chosen.noMatch ? "invalid" : "valid",
      chosen.noMatch
        ? `no match; intent ${chosen.intent}`
        : `${chosen.blockIds.length} block(s): ${chosen.blockIds.join(", ")}`,
    );
    recordRequestsLegalAdvice(chosen.requestsLegalAdvice);

    return chosen;
  });

  return NextResponse.json(assembleChatAnswer(selection, caseDatesFrom(dateAnswers)));
}
