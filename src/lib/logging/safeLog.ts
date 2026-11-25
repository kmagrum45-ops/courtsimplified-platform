/**
 * What may be logged about an error (site owner, 16 Nov 2026): its NAME and a safe code, never its message, details,
 * stack or any request or response body. A message can carry the person's words: pdf-lib quotes the character it could
 * not encode, Postgres quotes the value that broke a constraint, a storage error names the file, a JSON parse error
 * quotes the body. So the message is not logged, by any server code (verifyNoWordsInLogs.ts holds every new place to it).
 *
 * The one exception is an error the site wrote itself from no words of the person's (a count, a model name, a route):
 * SiteMessageError, or any error carrying `siteWritten: true`. Its message may be kept (serverErrorLog.ts still scrubs it).
 */

/** An error whose message the site wrote and which holds none of the person's words. */
export class SiteMessageError extends Error {
  readonly siteWritten = true;
  constructor(message: string) {
    super(message);
    this.name = "SiteMessageError";
  }
}

/** The error's name ("TypeError", "PostgrestError", "UnprintableText"), or what kind of value was thrown. */
export function errorName(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  if (error && typeof error === "object" && typeof (error as { name?: unknown }).name === "string") return String((error as { name: string }).name).slice(0, 60);
  return error === null ? "null" : typeof error;
}

const SAFE_CODE = /^[A-Za-z0-9_.-]{1,40}$/;

/** A machine code the error carries (Postgres "23505", PostgREST "PGRST116", a storage status "404", Node "ENOENT"), when it is one. */
export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  for (const key of ["code", "statusCode", "status"] as const) {
    const value = (error as Record<string, unknown>)[key];
    if ((typeof value === "string" || typeof value === "number") && SAFE_CODE.test(String(value))) return String(value);
  }
  return null;
}

/** What a log line may say about this error: its name and safe code. */
export function safeError(error: unknown): { errorName: string; code: string | null } {
  return { errorName: errorName(error), code: errorCode(error) };
}

/**
 * Where the error was thrown: up to three "at …" frames of its stack (file, line, function), never the stack's first
 * lines, which repeat the message and run past line 1 when the message holds a line break.
 */
export function errorFrames(error: unknown): string[] {
  const stack = error instanceof Error && typeof error.stack === "string" ? error.stack : "";
  return stack.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("at ")).slice(0, 3);
}

/** True when the site wrote this error's message from none of the person's words (SiteMessageError or `siteWritten: true`). */
export function isSiteWritten(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { siteWritten?: unknown }).siteWritten === true);
}
