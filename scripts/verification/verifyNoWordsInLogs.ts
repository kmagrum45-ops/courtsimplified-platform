/**
 * verifyNoWordsInLogs — no server code logs an error's message or a request or response body (site owner, 16 Nov 2026:
 * "fix every one that could write the person's words, names, addresses or document titles to a log so it records only
 * the error's name and a safe code").
 *
 * Why: a caught error's message can carry the person's words. pdf-lib quotes the character it could not encode,
 * Postgres the value that broke a constraint, a storage error the file name, a JSON parse error the body. Logging the
 * whole error, `.message`, `.details`, `.stack` or String(error) writes them to Vercel's console, and the error
 * handler (instrumentation.ts) wrote every uncaught error's message, scrubbed only of emails and numbers, to the
 * server_errors table.
 *
 * What it asserts:
 *   1. Search: every console.error/warn/log/info/debug call in server code (app/, src/, instrumentation.ts; files
 *      marked "use client" run in the person's own browser and are not a log the site keeps) passes no error message,
 *      details, hint or stack, no String(error) or `${error}`, no bare caught error, and no bare request or response
 *      body, or its file and line are in DECLARED with a reason.
 *   2. Every DECLARED entry is still such a call (a stale entry fails: delete it).
 *   3. The error handler's row (serverErrorLog.ts errorRow) keeps an ordinary error's name and code, never its
 *      message; a message the site wrote itself (SiteMessageError) is kept.
 *   4. Negative control: the classifier catches each forbidden form and passes the safe ones.
 *
 * No network, no model.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { errorRow } from "../../src/lib/monitoring/serverErrorLog";
import { SiteMessageError, safeError } from "../../src/lib/logging/safeLog";

const ROOT = process.cwd();

/** Log calls allowed to stay, by "file:line", each with why. Delete an entry when the call is changed. */
const DECLARED: Record<string, string> = {};

const ERRORISH = /^(error|err|e|caught|cause|exception|reason|[a-z]\w*Error)$/;
const BODYISH = /^(body|payload|requestBody|responseBody|rawBody|story|text|prompt|input|messages|conversation|answer|answers|values|data)$/;

/** The arguments of a call, split at its top-level commas (strings and template literals skipped over). */
function topLevel(text: string, open: string, close: string): string[] {
  const parts: string[] = [];
  let depth = 0, current = "", quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) { current += char; if (char === "\\") { current += text[++i] ?? ""; continue; } if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'" || char === "`") { quote = char; current += char; continue; }
    if ("([{".includes(char)) depth++;
    if (")]}".includes(char)) depth--;
    if (char === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  void open; void close;
  return parts;
}

/** Why this log call could write the person's words, or null when it cannot. `args` is the text inside the parentheses. */
export function unsafeLog(args: string): string | null {
  if (/\.(message|details|hint|stack)\b/.test(args)) return "an error's message, details, hint or stack";
  if (/String\(\s*(error|err|e|caught|cause|exception|reason)\s*\)/.test(args)) return "String(error)";
  if (/\$\{\s*(error|err|e|caught|cause|exception|reason)\s*\}/.test(args)) return "${error}";
  const values: string[] = [];
  for (const arg of topLevel(args, "(", ")")) {
    if (arg.startsWith("{") && arg.endsWith("}")) {
      for (const property of topLevel(arg.slice(1, -1), "{", "}")) {
        const colon = property.indexOf(":");
        values.push(colon === -1 ? property.replace(/^\.\.\./, "") : property.slice(colon + 1).trim());
      }
    } else values.push(arg);
  }
  for (const value of values) {
    if (ERRORISH.test(value)) return `the whole caught error (${value})`;
    if (BODYISH.test(value)) return `a request or response body (${value})`;
  }
  return null;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|mts)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
  }
  return out;
}

type LogCall = { at: string; call: string; why: string | null };

/** Every console call in server code, with why it is unsafe (null: safe). */
function logCalls(): { calls: LogCall[]; clientFiles: number } {
  const calls: LogCall[] = [];
  let clientFiles = 0;
  const files = [...sourceFiles(path.join(ROOT, "app")), ...sourceFiles(path.join(ROOT, "src")), path.join(ROOT, "instrumentation.ts")];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (/^\s*["']use client["']/.test(source)) { if (/console\.\w+\(/.test(source)) clientFiles++; continue; }
    const re = /console\.(error|warn|log|info|debug)\(/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source))) {
      let i = match.index + match[0].length, depth = 1;
      while (i < source.length && depth > 0) { if (source[i] === "(") depth++; else if (source[i] === ")") depth--; i++; }
      const args = source.slice(match.index + match[0].length, i - 1);
      const at = `${path.relative(ROOT, file).split(path.sep).join("/")}:${source.slice(0, match.index).split("\n").length}`;
      calls.push({ at, call: `${match[0]}${args.replace(/\s+/g, " ").slice(0, 120)})`, why: unsafeLog(args) });
    }
  }
  return { calls, clientFiles };
}

let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.log(`FAIL ${name}\n  ${(error as Error).message.split("\n").join("\n  ")}`); }
}

const { calls, clientFiles } = logCalls();
const unsafe = calls.filter((call) => call.why);
console.log(`Log calls in server code: ${calls.length} (${unsafe.length} unsafe, ${Object.keys(DECLARED).length} declared); ${clientFiles} browser-only file(s) not counted.`);
for (const call of unsafe) console.log(`  ${call.at}  ${call.why}${DECLARED[call.at] ? "  [declared]" : ""}`);

check("1. no server log call writes an error's message, a caught error or a body (or it is declared)", () => {
  const undeclared = unsafe.filter((call) => !DECLARED[call.at]).map((call) => `${call.at}: ${call.why}`);
  assert.deepEqual(undeclared, [], "log safeError(error) (src/lib/logging/safeLog.ts) instead, or declare why not");
});

check("2. every declared entry is still an unsafe log call", () => {
  const stale = Object.keys(DECLARED).filter((at) => !unsafe.some((call) => call.at === at));
  assert.deepEqual(stale, [], "delete these from DECLARED");
});

check("3. the error handler's row keeps an error's name and code, never its message", () => {
  const ordinary = errorRow(Object.assign(new TypeError("Gagné, 12 rue Principale, Saint-Jérôme"), { code: "23505" }), { path: "/api/x", method: "POST" }, { routePath: "/api/x", routeType: "route" });
  assert.equal(ordinary.kind, "route:TypeError");
  assert.ok(!/Gagné|Principale|Jérôme/.test(JSON.stringify(ordinary)), JSON.stringify(ordinary));
  assert.equal(ordinary.message, "TypeError 23505");
  const site = errorRow(new SiteMessageError("case delete: 2 of 5 stored file(s) could not be removed"), {}, { routePath: "/api/cases" });
  assert.equal(site.message, "case delete: 2 of 5 stored file(s) could not be removed");
  assert.deepEqual(safeError(Object.assign(new Error("Key (title)=(Gagné) already exists"), { name: "PostgrestError", code: "23505" })), { errorName: "PostgrestError", code: "23505" });
  assert.deepEqual(safeError({ message: "x", statusCode: "40 4 because" }), { errorName: "object", code: null });
});

check("4. negative control: each forbidden form is caught, the safe ones pass", () => {
  for (const bad of [`"x:", error`, `"x:", error.message`, `"x:", readError?.message`, `"x", { error }`, `"x", { error: String(error) }`, "`x ${err}`", `"x", e`, `"x", insertError`, `"x", body`, `{ payload }`, `"x", error.stack.split("\\n")`, `"x", decisionError.code ?? "", decisionError.message`]) {
    assert.ok(unsafeLog(bad), `not caught: ${bad}`);
  }
  for (const good of [`"x:", safeError(error)`, `"x", { errorName: error instanceof Error ? error.name : "UnknownError" }`, `"x", { conversationMessages: conversation.length }`, "`refused ${stageId}`", `"x", errorName(error)`, `"plain words"`]) {
    assert.equal(unsafeLog(good), null, `wrongly caught: ${good}`);
  }
});

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
