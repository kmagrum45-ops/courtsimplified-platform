/**
 * Next.js instrumentation. `onRequestError` records every server error in the
 * built-in error log (src/lib/monitoring/serverErrorLog.ts; 2026-10-14 audit).
 */

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordServerError } = await import("./src/lib/monitoring/serverErrorLog");
  await recordServerError(error, request, context);
}
