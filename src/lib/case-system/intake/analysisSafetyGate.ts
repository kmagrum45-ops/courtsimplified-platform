/**
 * The safety check before every analysis -- one shared path, on the server
 * (site owner, 2026-10-29, item N).
 *
 * WHY HERE. The safety pass (safetyPass.ts) was reached only from the
 * browser: each intake called it before posting its analysis. A route that
 * forgot (the Small Claims guided "Show my next step" from a home-page story)
 * analysed the story with no check, and a failed check (401, 429, 503, a
 * time-out) read as "clear". The three analyze routes
 * (/api/{small-claims,civil,family}/analyze) are where every analysis begins,
 * whichever door the person came through -- the form, the guided chat, the
 * review panel's Continue, a case already started -- so the check runs there,
 * on the exact text the analysis reads, and no browser route can skip it.
 *
 * WHAT IT DOES. Runs the safety pass on the story; on an error, a rate limit
 * or a time-out it tries once more; if that fails too the result is "failed"
 * -- never "clear" -- and the analysis carries on (the person is never
 * blocked by a classifier fault). The result is recorded in the case,
 * `master_result.safetyCheck`: status, classification, the failure kind, the
 * time and a hash of the story. Never the story's words.
 *
 * The safety pass itself is unchanged: same prompt, same fixed messages.
 * A concern is shown by the browser with the existing danger handling; a
 * clear or failed result shows nothing (the footer line stays).
 *
 * No stored result is reused: a result in master_result could be written by
 * the browser, so the server checks the text it is about to analyse every
 * time (one standard-tier call).
 */

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { runSafetyPass, type SafetyClassification, type SafetyPassResult } from "./safetyPass";
import { updateMasterResult } from "../updateCaseRecord";

export type AnalysisSafetyStatus = "clear" | "concern" | "failed";
export type AnalysisSafetyFailure = "error" | "rate-limit" | "timeout" | "unavailable";

/** What the case keeps (master_result.safetyCheck). No story text. */
export type AnalysisSafetyRecord = {
  status: AnalysisSafetyStatus;
  classification?: SafetyClassification;
  requestsLegalAdvice?: boolean;
  failure?: AnalysisSafetyFailure;
  /** Model calls made: 0 when unavailable, 1, or 2 after a retry. */
  attempts: number;
  storyHash: string;
  checkedAt: string;
  court: string;
};

/** What the analyze route sends back to the browser. */
export type AnalysisSafetyReply = {
  status: AnalysisSafetyStatus;
  classification: SafetyClassification | null;
  requestsLegalAdvice: boolean;
  /** One of safetyPass.ts's fixed constants, only for a concern. */
  userMessage: string | null;
  recorded: boolean;
};

export type AnalysisSafetyDependencies = {
  runSafety: (storyText: string, apiKey: string) => Promise<SafetyPassResult>;
  apiKey: () => string | undefined;
  record: (request: Request, ids: { userId: string; caseId: string }, record: AnalysisSafetyRecord) => Promise<boolean>;
  now: () => Date;
  pause: (ms: number) => Promise<void>;
  timeoutMs: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The narrative an analysis reads: the listed free-text fields that hold words, in order. */
export function analysisStoryText(input: unknown, fields: Iterable<string>): string {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return [...fields]
    .map((field) => record[field])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n\n");
}

export function storyHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** The case this request is for: the guidance gate's header, else the body's. */
export function analysisCaseId(request: Request, bodyCaseId?: unknown): string {
  const header = request.headers.get("x-courtsimplified-case-id");
  const candidate = header || (typeof bodyCaseId === "string" ? bodyCaseId : "");
  return UUID.test(candidate) ? candidate : "";
}

class SafetyTimeout extends Error {
  constructor() { super("safety check timed out"); this.name = "TimeoutError"; }
}

function failureKind(error: unknown): AnalysisSafetyFailure {
  const record = (error && typeof error === "object" ? error : {}) as { status?: unknown; name?: unknown; code?: unknown };
  if (record.status === 429 || record.code === "rate_limit_exceeded") return "rate-limit";
  if (error instanceof SafetyTimeout || record.name === "TimeoutError" || record.name === "APIConnectionTimeoutError") return "timeout";
  return "error";
}

function bearerClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return url && key && token
    ? createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
    : null;
}

/** Writes safetyCheck onto the case as it is now (updateCaseRecord.ts), as its owner. */
async function recordInCase(request: Request, ids: { userId: string; caseId: string }, record: AnalysisSafetyRecord): Promise<boolean> {
  const db = bearerClient(request);
  if (!db) return false;
  const saved = await updateMasterResult(db, ids, (master) => ({ ...master, safetyCheck: record }));
  return saved.ok;
}

const DEFAULTS: AnalysisSafetyDependencies = {
  runSafety: runSafetyPass,
  apiKey: () => process.env.OPENAI_API_KEY,
  record: recordInCase,
  now: () => new Date(),
  pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  // Twice this, worst case, comes out of the analysis's time (test:analysis-time-budget); the pass usually answers in seconds.
  timeoutMs: 20_000,
};

async function withinTime<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new SafetyTimeout()), ms); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Runs before the analysis, every time, and never throws. `aiAvailable` is
 * the route's own rule for paid AI (a verified session and a server key);
 * without it the check cannot run and is recorded as failed ("unavailable").
 */
export async function checkStoryBeforeAnalysis(
  request: Request,
  context: { court: string; storyText: string; userId: string | null; caseId: string; aiAvailable: boolean },
  overrides: Partial<AnalysisSafetyDependencies> = {},
): Promise<AnalysisSafetyReply> {
  const deps: AnalysisSafetyDependencies = { ...DEFAULTS, ...overrides };
  const base = { storyHash: storyHash(context.storyText), court: context.court };
  let record: AnalysisSafetyRecord;
  let userMessage: string | null = null;

  try {
    const apiKey = deps.apiKey();
    if (!context.aiAvailable || !apiKey) {
      record = { ...base, status: "failed", failure: "unavailable", attempts: 0, checkedAt: deps.now().toISOString() };
    } else {
      let attempts = 0;
      let result: SafetyPassResult | null = null;
      let failure: AnalysisSafetyFailure = "error";
      // One try, and one more after a short pause if it errored, was refused or timed out.
      while (attempts < 2 && !result) {
        if (attempts > 0) await deps.pause(500);
        attempts += 1;
        try {
          result = await withinTime(deps.runSafety(context.storyText, apiKey), deps.timeoutMs);
        } catch (error) {
          failure = failureKind(error);
        }
      }
      const checkedAt = deps.now().toISOString();
      if (!result) {
        record = { ...base, status: "failed", failure, attempts, checkedAt };
      } else {
        const concern = result.classification !== "clear";
        record = {
          ...base,
          status: concern ? "concern" : "clear",
          classification: result.classification,
          requestsLegalAdvice: result.requestsLegalAdvice,
          attempts,
          checkedAt,
        };
        userMessage = concern ? result.userMessage ?? null : null;
      }
    }
  } catch {
    record = { ...base, status: "failed", failure: "error", attempts: 0, checkedAt: new Date().toISOString() };
  }

  let recorded = false;
  if (context.userId && context.caseId) {
    try {
      recorded = await deps.record(request, { userId: context.userId, caseId: context.caseId }, record);
    } catch {
      recorded = false;
    }
    // The analysis still runs; the reply says the record was not kept.
    if (!recorded) console.error("Safety check result could not be recorded in the case.");
  }
  if (record.status === "failed") console.error(`Safety check before analysis failed (${record.failure}).`);

  return {
    status: record.status,
    classification: record.classification ?? null,
    requestsLegalAdvice: record.requestsLegalAdvice === true,
    userMessage,
    recorded,
  };
}
