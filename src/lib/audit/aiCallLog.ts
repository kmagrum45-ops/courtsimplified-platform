/**
 * Every model call, recorded — without recording what the user wrote.
 *
 * *** WHY THE INTERCEPT IS IN THE CLIENT AND NOT IN THE CALL SITES ***
 *
 * The obvious implementation is a `logAiCall()` that each of the six call
 * sites calls after it finishes. That implementation is wrong for the same
 * reason `forceNoStore` lives where it does: it produces a guarantee that holds
 * for the call sites someone remembered, and the seventh call site — the one
 * added next month by someone who has not read this file — is silently exempt.
 *
 * "Every model call is logged" has to be a property of the client, not a habit
 * of the callers. So `openaiClient.ts` wraps `chat.completions.create` and
 * `responses.create` and the row is written there, whether or not the caller
 * knows this file exists.
 *
 * *** THE PROBLEM THAT CREATES, AND HOW THE CONTEXT SOLVES IT ***
 *
 * The client can see the model, the request, the response and the clock. It
 * cannot see what the caller was DOING — which call site this is, whose session
 * it belongs to, or whether the caller's own validation accepted the result.
 * Those are exactly the fields an audit needs.
 *
 * `withAiCallContext()` carries them down with AsyncLocalStorage: the caller
 * declares what it is before making the call, and reports its validation
 * verdict after. Nothing is threaded through function signatures, so a call
 * three layers deep is covered without every layer in between growing a
 * parameter it does not use.
 *
 * *** WHAT HAPPENS WHEN A CALL SITE FORGETS ***
 *
 * A call with no context still HAPPENS — the product never breaks because the
 * audit log is unhappy — but it cannot be attributed, so it is not written, and
 * a console error names the model and the stack. The real defence is static:
 * `verifyAiCallLogging.ts` asserts that every file constructing an OpenAI
 * client runs its call inside `withAiCallContext`, and fails the suite if a new
 * one does not. A runtime warning nobody reads is not a control.
 *
 * *** WHAT IS NOT STORED ***
 *
 * The prompt. The narrative. Any message content. See the migration's
 * Decision 1 — the input is described (sha256, length) and never held. If you
 * are adding a field here, the test is whether a person's account of their own
 * legal problem could end up inside it.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

/**
 * Must match the CHECK constraint in
 * supabase/migrations/20260922120000_add_ai_call_log.sql. A value not in that
 * list is rejected by the database, deliberately: the reporting script groups
 * by this column, and a call type it does not know about would be invisible in
 * the one place it is supposed to be visible.
 */
export type AiCallType =
  | "safety-pass"
  | "court-path-classifier"
  | "extract-intake-facts"
  | "extract-intake-facts-confidence"
  | "claim-type-classifier"
  | "small-claims-analysis";

export type AiValidationResult = "valid" | "invalid" | "error" | "timeout";

export type AiCallContext = {
  callType: AiCallType;
  userId?: string | null;
  caseId?: string | null;
  /**
   * The caller's own verdict on what came back. Set with
   * `recordAiValidation()` after the caller has parsed and checked the
   * response. Left unset it stays "valid", because a call that returned and
   * whose caller said nothing is a call the caller accepted.
   */
  validationResult: AiValidationResult;
  validationDetail?: string | null;
  requestsLegalAdvice?: boolean | null;
  outputGuardBlocked: number;
  /**
   * Rows staged by observeAiCall, written when the context exits.
   *
   * WHY NOT WRITE ON RESOLUTION. The caller's validation verdict, the Step 6d
   * flag and the guard-block count are all known AFTER the call returns --
   * that is when the caller parses what came back. A row written the instant
   * the HTTP request resolved would record "valid" for every call, including
   * the ones whose output the caller then threw away, which is precisely the
   * population a reviewer is looking for.
   *
   * So the row is assembled at call time, when the request body is in hand,
   * and the caller-supplied fields are filled in at flush time.
   */
  pending: PendingRow[];
};

type PendingRow = Omit<
  AiCallLogRow,
  "validation_result" | "validation_detail" | "requests_legal_advice" | "output_guard_blocked"
>;

const storage = new AsyncLocalStorage<AiCallContext>();

/**
 * Runs `work` with an audit context attached. Every OpenAI call made inside it,
 * at any depth, is logged against these fields.
 */
export function withAiCallContext<T>(
  seed: {
    callType: AiCallType;
    userId?: string | null;
    caseId?: string | null;
  },
  work: () => Promise<T>,
): Promise<T> {
  return storage.run(
    {
      callType: seed.callType,
      userId: seed.userId ?? null,
      caseId: seed.caseId ?? null,
      validationResult: "valid",
      validationDetail: null,
      requestsLegalAdvice: null,
      outputGuardBlocked: 0,
      pending: [],
    },
    async () => {
      const context = storage.getStore();
      try {
        return await work();
      } finally {
        // finally, not after the return: a call site that throws still made
        // the model call, and a failed request is a row worth having.
        if (context) flush(context);
      }
    },
  );
}

/** Writes every row staged during this context, then clears the stage. */
function flush(context: AiCallContext): void {
  const staged = context.pending.splice(0, context.pending.length);
  for (const row of staged) {
    insertRow({
      ...row,
      validation_result: context.validationResult,
      validation_detail: context.validationDetail ?? null,
      requests_legal_advice: context.requestsLegalAdvice ?? null,
      output_guard_blocked: context.outputGuardBlocked,
    });
  }
}

/** The current context, or null outside one. */
export function currentAiCallContext(): AiCallContext | null {
  return storage.getStore() ?? null;
}

/**
 * The caller's verdict on the response it just got.
 *
 * A no-op outside a context, so a call site can report honestly without first
 * checking whether logging is switched on.
 */
export function recordAiValidation(
  result: AiValidationResult,
  detail?: string | null,
): void {
  const context = storage.getStore();
  if (!context) return;
  context.validationResult = result;
  context.validationDetail = detail ?? null;
}

/** Hoists the LSO Step 6d flag onto its own column. */
export function recordRequestsLegalAdvice(value: boolean): void {
  const context = storage.getStore();
  if (!context) return;
  context.requestsLegalAdvice = value;
}

/** Counts a string the output guard refused to render. */
export function recordOutputGuardBlock(): void {
  const context = storage.getStore();
  if (!context) return;
  context.outputGuardBlocked += 1;
}

/**
 * A stable identifier for the prompt that produced a row, derived from the
 * prompt text rather than maintained by hand.
 *
 * Same argument as the content library's `versionOf`: a version number someone
 * has to remember to bump is a version number that will eventually be wrong,
 * and a prompt version that silently lies is worse than having none — a
 * reviewer comparing two quarters would conclude nothing changed.
 */
export function promptVersionOf(promptText: string): string {
  return createHash("sha256").update(promptText, "utf8").digest("hex").slice(0, 12);
}

/** Describes the input without holding it. Migration Decision 1. */
function describeInput(text: string): { input_sha256: string; input_chars: number } {
  return {
    input_sha256: createHash("sha256").update(text, "utf8").digest("hex"),
    input_chars: text.length,
  };
}

/**
 * Everything the model was sent, flattened to one string for hashing and
 * length only. This string is never stored and never leaves this function.
 */
function flattenRequestInput(body: Record<string, unknown>): string {
  const messages = body.messages;
  if (Array.isArray(messages)) {
    return messages
      .map((message) => {
        const content = (message as { content?: unknown }).content;
        if (typeof content === "string") return content;
        if (Array.isArray(content)) {
          return content
            .map((part) => (typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""))
            .join("");
        }
        return "";
      })
      .join("\n");
  }

  // Responses API shape, covered for the same reason forceNoStore covers it:
  // before anyone uses it, not after.
  const input = body.input;
  if (typeof input === "string") return input;

  return "";
}

/**
 * The system prompt alone, which is what prompt_version identifies. Falls back
 * to the whole flattened input when there is no system message, so the column
 * is never empty — an empty prompt_version would group every row together.
 */
function systemPromptOf(body: Record<string, unknown>): string {
  const messages = body.messages;
  if (!Array.isArray(messages)) return flattenRequestInput(body);

  const system = messages.find(
    (message) => (message as { role?: unknown }).role === "system",
  ) as { content?: unknown } | undefined;

  return typeof system?.content === "string" ? system.content : flattenRequestInput(body);
}

/**
 * The structured object the model returned, or null.
 *
 * Parses the JSON so the column is queryable, and stores `{ raw: ... }` when it
 * will not parse. A response that failed to parse is one of the more
 * interesting rows in the table and dropping it would lose the evidence.
 */
function structuredOutputOf(response: unknown): unknown {
  const choice = (response as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string") return null;

  try {
    return JSON.parse(content);
  } catch {
    return { unparsed: content.slice(0, 4_000) };
  }
}

type AiCallLogRow = {
  user_id: string | null;
  case_id: string | null;
  call_type: AiCallType;
  model: string;
  prompt_version: string;
  input_sha256: string;
  input_chars: number;
  structured_output: unknown;
  validation_result: AiValidationResult;
  validation_detail: string | null;
  requests_legal_advice: boolean | null;
  output_guard_blocked: number;
  latency_ms: number;
};

/**
 * Writes one row. Fire and forget, and deliberately so: an audit-log insert
 * must never add latency to a user's request and must never be the reason a
 * page fails. A failed write is reported to the server console, where the
 * quarterly report's own gap check will also notice the hole.
 */
function insertRow(row: AiCallLogRow): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("[aiCallLog] not configured; call not recorded", {
      call_type: row.call_type,
    });
    return;
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  void client
    .from("ai_call_log")
    .insert(row)
    .then(({ error }) => {
      if (error) {
        console.error("[aiCallLog] insert failed", {
          call_type: row.call_type,
          code: error.code,
        });
      }
    });
}

/**
 * Times one model call and records it. Called by openaiClient.ts's wrapper, not
 * by call sites.
 *
 * Returns whatever `run` returns and re-throws whatever it throws. It is an
 * observer; it changes nothing about the call it observes.
 */
export async function observeAiCall<T>(
  body: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const context = storage.getStore();
  const started = Date.now();

  if (!context) {
    // Unattributable. Logged loudly, not written — a row with a guessed
    // call_type would be worse than a missing one, because it would look
    // complete. verifyAiCallLogging.ts is what actually prevents this.
    console.error(
      "[aiCallLog] model call made outside withAiCallContext; not recorded",
      { model: String(body.model ?? "unknown") },
    );
    return run();
  }

  const describe = () => ({
    user_id: context.userId ?? null,
    case_id: context.caseId ?? null,
    call_type: context.callType,
    model: String(body.model ?? "unknown"),
    prompt_version: promptVersionOf(systemPromptOf(body)),
    ...describeInput(flattenRequestInput(body)),
    latency_ms: Date.now() - started,
  });

  try {
    const response = await run();
    context.pending.push({ ...describe(), structured_output: structuredOutputOf(response) });
    return response;
  } catch (error) {
    const aborted =
      (error as { name?: string })?.name === "AbortError" ||
      /abort/i.test(error instanceof Error ? error.message : "");

    context.pending.push({ ...describe(), structured_output: null });

    // The error's NAME, never its message. An OpenAI error message can quote
    // the offending request back at you, and the request contains the
    // narrative. Decision 1 has no exception for error paths.
    //
    // Set on the context rather than on the row because the throw is about to
    // unwind past every recordAiValidation() the caller would have made.
    context.validationResult = aborted ? "timeout" : "error";
    context.validationDetail = (error as { name?: string })?.name ?? "UnknownError";

    throw error;
  }
}
