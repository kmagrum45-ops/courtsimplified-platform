/**
 * THE BUILT-IN ERROR LOG (2026-10-14 audit, MASTER_PLAN build order 6C).
 *
 * Server errors used to reach only Vercel's console, where nobody saw them.
 * Next.js calls `onRequestError` (instrumentation.ts) for every error thrown
 * while handling a request; this writes one row to `server_errors`
 * (migration 20261015090000, server-only) with the route, method, kind and a
 * short, scrubbed message. Read it in the Supabase table editor, newest first.
 *
 * PRIVACY: no request body, no story, no names. An error's own message is NOT
 * recorded, only its name and safe code (src/lib/logging/safeLog.ts; site owner,
 * 16 Nov 2026): a message can carry the person's words, which removing emails and
 * numbers does not catch. A message the site wrote itself (SiteMessageError, or
 * `siteWritten: true`) is kept, cut to 500 characters, with email addresses, phone
 * numbers and long digit runs replaced. Never throws: a failed write is dropped (the error is still in
 * Vercel's console as before).
 */

import { errorCode, errorName, isSiteWritten } from "../logging/safeLog";

const MAX_MESSAGE = 500;

/** Removes what could identify a person from an error message. Pure. */
export function scrubErrorMessage(message: string): string {
  return (message || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]")
    .replace(/\b\d{6,}\b/g, "[number]")
    .replace(/(sk|pk|eyJ)[A-Za-z0-9_.-]{16,}/g, "[secret]")
    .slice(0, MAX_MESSAGE);
}

export type ServerErrorRow = {
  route: string | null;
  method: string | null;
  kind: string | null;
  message: string;
  digest: string | null;
  environment: string | null;
};

/** The row for one error. Pure. */
export function errorRow(error: unknown, request: { path?: string; method?: string }, context: { routePath?: string; routeType?: string }): ServerErrorRow {
  const err = error as { name?: string; message?: string; digest?: string } | null;
  return {
    route: (context?.routePath || request?.path || "").split("?")[0].slice(0, 200) || null,
    method: request?.method?.slice(0, 10) || null,
    kind: [context?.routeType, err?.name].filter(Boolean).join(":").slice(0, 100) || null,
    message: isSiteWritten(error) ? scrubErrorMessage(err?.message ?? "") : [errorName(error), errorCode(error)].filter(Boolean).join(" "),
    digest: typeof err?.digest === "string" ? err.digest.slice(0, 100) : null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
  };
}

/** Writes one row. Never throws. */
export async function recordServerError(error: unknown, request: { path?: string; method?: string }, context: { routePath?: string; routeType?: string }): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const row = errorRow(error, request, context);
    await fetch(`${url}/rest/v1/server_errors`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Dropped on purpose: logging must never break a request.
  }
}
