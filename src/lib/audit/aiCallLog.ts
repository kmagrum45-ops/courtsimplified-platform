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
 * Who the enclosing request belongs to, if anyone knows.
 *
 * *** WHY A SECOND STORE ***
 *
 * Independent review on 2026-09-23 found `user_id` and `case_id` NULL on every
 * row: all six call sites seed `withAiCallContext` with a call type and
 * nothing else, because none of them HAS an identity to give. They are library
 * functions two or three layers below the route, and the route is the only
 * place that knows who is asking.
 *
 * The alternative was threading `userId` and `caseId` through every
 * intervening signature — through functions that have no use for them — which
 * is the pattern `withAiCallContext` exists to avoid in the first place.
 *
 * So a route wraps its handler in `withAiCallIdentity` and every model call
 * underneath it, at any depth, inherits. A call site that does know can still
 * pass identity explicitly and that wins.
 *
 * NOT EVERY ROUTE HAS ONE. `/api/intake/safety-check` and
 * `/api/classify-court-path` are deliberately reachable without a session, so
 * their rows stay anonymous. That is correct, not a gap: the alternative is
 * requiring an account before the safety check can run, which is precisely the
 * defect OUTSTANDING_ISSUES section 0k records.
 */
const identityStorage = new AsyncLocalStorage<{
  userId: string | null;
  caseId: string | null;
}>();

/**
 * Attaches the requesting user and case to every model call made inside.
 *
 * Called by a route handler, not by a library function.
 */
export function withAiCallIdentity<T>(
  identity: { userId?: string | null; caseId?: string | null },
  work: () => Promise<T>,
): Promise<T> {
  return identityStorage.run(
    { userId: identity.userId ?? null, caseId: identity.caseId ?? null },
    work,
  );
}

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
  // An explicit seed wins; otherwise inherit whatever the route declared.
  const inherited = identityStorage.getStore();

  return storage.run(
    {
      callType: seed.callType,
      userId: seed.userId ?? inherited?.userId ?? null,
      caseId: seed.caseId ?? inherited?.caseId ?? null,
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

/**
 * Counts a string the output guard refused to render.
 *
 * *** THIS IS NOT WIRED UP, AND THE REPORT NOW SAYS SO. ***
 *
 * Independent review on 2026-09-23 found it had no callers, so
 * `output_guard_blocked` was hard-wired to 0 and the quarterly report printed
 * "Nothing was blocked. Every string a render path tried to show was either a
 * content-library item or an allowlisted system message." — a false statement
 * to a regulator, produced by the script named as the reporting mechanism.
 *
 * It is kept rather than deleted because there is a real obstacle to wiring it,
 * and deleting it would hide that obstacle: `outputGuard.ts` runs inside React
 * client components, and `AsyncLocalStorage` is a Node API with no context
 * there. Calling this from the guard would compile, do nothing in the browser,
 * and leave a counter that looks wired and is not — worse than one that is
 * visibly not.
 *
 * Closing it properly means either moving guard evaluation server-side or
 * reporting blocks over a separate channel. Recorded in the report as
 * outstanding work, and `aiQuarterlyReport.ts` now states the limitation
 * instead of the false claim.
 */
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
 * Fields that carry the model's own prose about the user's matter.
 *
 * *** WHY THIS LIST EXISTS — A CORRECTION ***
 *
 * The migration's Decision 2 said the structured output was "small, and
 * non-legal by construction", because "every user-facing model call now returns
 * structured output under a JSON schema: a classification label, a stage code,
 * a content id, a boolean". Independent review on 2026-09-23 found that is not
 * true of four of the six call types:
 *
 *   safety-pass            `reason` — the model's sentence about why it thinks
 *                          this person is in distress or danger. The most
 *                          sensitive string the platform produces.
 *   court-path-classifier  `reasoning` — a sentence about the user's story.
 *   small-claims-analysis  `caseFileRecorded` / `caseFileNotRecorded` — free
 *                          sentences naming evidence and counterparties.
 *   extract-intake-facts   its whole purpose is facts pulled from the story.
 *
 * Decision 1 says the user's narrative is never stored. Storing these would
 * have made that false the moment the migration ran — and the privacy wording
 * proposed in the report ("we do not keep what you wrote") false with it.
 *
 * *** WHAT IS KEPT INSTEAD ***
 *
 * The SHAPE of the prose, not the prose: the field name and its length. A
 * reviewer asking "did the model return a reason at all", "are reasons getting
 * longer", "which calls produced nothing" gets an answer. A reviewer asking
 * "what did this person say" does not, and should not.
 *
 * Redaction is by DENY-LIST, which is the weaker kind of control and is chosen
 * deliberately: an allowlist would silently drop the classification labels and
 * stage codes that are the whole point of the log the first time someone adds a
 * field. The deny-list is paired with `redactLongStrings` below, which catches
 * a prose field nobody thought to name.
 */
const PROSE_FIELDS = new Set([
  "reason",
  "reasoning",
  "caseFileRecorded",
  "caseFileNotRecorded",
  "plainLanguageSummary",
  "structuredCaseSummary",
  "missingInformation",
  "missingEvidence",
  "risksAndGaps",
  "nextBestActions",
  "summary",
  "explanation",
  "notes",
]);

/**
 * Any string longer than this is treated as prose whatever it is called.
 *
 * A classification label, a stage code, a content id and a claim-type id are
 * all comfortably under it. A sentence about someone's case is not. This is
 * what catches the prose field that gets added next year under a name nobody
 * put in the list above.
 */
const MAX_STORED_STRING = 80;

function redact(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    if (key && PROSE_FIELDS.has(key)) return `[redacted ${value.length} chars]`;
    if (value.length > MAX_STORED_STRING) return `[redacted ${value.length} chars]`;
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => redact(entry, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v, k)]),
    );
  }
  return value;
}

/**
 * The structured object the model returned, redacted, or null.
 *
 * An unparseable response is recorded as its LENGTH, not its text. The old
 * version stored 4,000 characters of it, reasoning that a failed parse is an
 * interesting row — which is true, and the interesting part is that it failed,
 * not what it said. Raw model output on a failed parse is exactly the case
 * where the content is least likely to be a tidy label.
 */
function structuredOutputOf(response: unknown): unknown {
  const choice = (response as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string") return null;

  try {
    return redact(JSON.parse(content));
  } catch {
    return { unparsed: `[redacted ${content.length} chars]` };
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
