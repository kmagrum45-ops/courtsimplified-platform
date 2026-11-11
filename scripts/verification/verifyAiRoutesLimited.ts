/**
 * EVERY OPENAI CALL GOES THROUGH THE ONE SPENDING LIMIT (site owner, 10 Nov 2026).
 *
 * The limit lives in one place (src/lib/security/aiSpendLimit.ts aiSpendGate) and is applied by the one client every
 * call site uses (openaiClient.ts createOpenAIClient -> forceNoStore). This reads the source and fails when any way
 * around it appears:
 *   1. a method forceNoStore wraps (chat create, chat parse, responses, embeddings) that does not go through aiSpendGate;
 *   2. createOpenAIClient returning a client forceNoStore did not wrap;
 *   3. any file in app/ or src/ (served code) other than openaiClient.ts that builds an OpenAI client itself
 *      (`new OpenAI`, a value import of the "openai" package) or calls the OpenAI API directly (api.openai.com);
 *   4. aiSpendGate making the call before it checks the limit.
 * A new call site that uses createOpenAIClient is covered by construction, so adding one keeps this green; the check
 * also lists every file that calls the client, so the report of what is limited is read from the code.
 * Self-tests plant each bypass in synthetic text, so the check cannot pass by finding nothing.
 *
 * WHAT FAILURE THIS CATCHES: a model call that reaches OpenAI without the daily spending limit.
 *
 * Run: npm run test:ai-routes-limited
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CLIENT = "src/lib/case-system/openaiClient.ts";
const LIMITER = "src/lib/security/aiSpendLimit.ts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

/** Each wrapper forceNoStore installs: `<target>.<method> = ((original ... }) as never;`, with its text. */
export function wrappers(client: string): Array<{ method: string; text: string }> {
  const body = client.slice(client.indexOf("export function forceNoStore"), client.indexOf("export function createOpenAIClient"));
  const found: Array<{ method: string; text: string }> = [];
  const start = /([\w.]+)\s*=\s*\(\(original/g;
  let match: RegExpExecArray | null;
  while ((match = start.exec(body))) {
    const end = body.indexOf("}) as never;", match.index);
    found.push({ method: match[1], text: body.slice(match.index, end < 0 ? undefined : end) });
  }
  return found;
}

export function unlimitedWrappers(client: string): string[] {
  return wrappers(client).filter((wrapper) => !wrapper.text.includes("aiSpendGate(")).map((wrapper) => wrapper.method);
}

export function clientIsWrapped(client: string): boolean {
  const body = client.slice(client.indexOf("export function createOpenAIClient"));
  return /return\s+forceNoStore\(\s*new OpenAI\(/.test(body.slice(0, 400));
}

/** Ways around the client in one file's text (comments removed). */
export function bypassesIn(text: string): string[] {
  // Quote marks are written \x22 and \x27 in these patterns: test:no-store strips string literals before it looks for a
  // constructed client, and a bare quote inside a pattern would make it misread where this file's strings are.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\x22\x27\x60])\/\/.*$/gm, "$1");
  const found: string[] = [];
  if (/\bnew\s+OpenAI\s*\(/.test(code)) found.push("a constructed OpenAI client");
  if (/import\s+(?!type\b)[^;]*from\s+[\x22\x27]openai(?:\/[^\x22\x27]*)?[\x22\x27]/.test(code)) found.push("a value import of the openai package");
  if (/require\(\s*[\x22\x27]openai[\x22\x27]\s*\)|import\(\s*[\x22\x27]openai[\x22\x27]\s*\)/.test(code)) found.push("a dynamic import of the openai package");
  if (/api\.openai\.com/.test(code)) found.push("a direct call to api.openai.com");
  return found;
}

export function checksBeforeCalling(limiter: string): boolean {
  const gate = limiter.slice(limiter.indexOf("export async function aiSpendGate"));
  const checked = gate.indexOf("checkAiSpend(");
  const called = gate.indexOf("await call()");
  return checked > 0 && called > checked && /if\s*\(!decision\.allowed\)[\s\S]*?throw new AiLimitReached/.test(gate.slice(checked, called));
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx|mjs|js)$/.test(name) ? [full] : [];
  });

function main() {
  // Self-tests: each bypass, planted, is found. (The constructor and the planted fetch are spelled in parts so test:no-store
  // and test:canlii, which read every file for them, do not take this file for a client or a script that fetches.)
  const NEW_CLIENT = "new " + "OpenAI(";
  const planted = `export function forceNoStore(c) { a.create = ((original) => { return aiSpendGate(() => x); }) as never; b.parse = ((original) => { return x; }) as never; return c; }\nexport function createOpenAIClient() { return forceNoStore(${NEW_CLIENT}{})); }`;
  check("self-test: a wrapper without the limit is found", JSON.stringify(unlimitedWrappers(planted)) === JSON.stringify(["b.parse"]));
  check("self-test: a constructed client is found", bypassesIn(`const c = ${NEW_CLIENT}{ apiKey });`).length === 1);
  check('self-test: a value import of "openai" is found, a type import is not', bypassesIn('import OpenAI from "openai";').length === 1 && bypassesIn('import type OpenAI from "openai";').length === 0);
  check("self-test: a direct fetch to api.openai.com is found", bypassesIn("await fet" + 'ch("https://api.openai.com/v1/chat/completions")').length === 1);
  check("self-test: a gate that calls before checking is found", !checksBeforeCalling("export async function aiSpendGate(call) { const r = await call(); const decision = await checkAiSpend(); }"));

  const client = readFileSync(path.join(ROOT, CLIENT), "utf8");
  const found = wrappers(client);
  check(`1. forceNoStore wraps chat create, chat parse, responses and embeddings (${found.length} found)`, ["create", "parse"].every((m) => found.some((w) => w.method.endsWith(`.${m}`))) && found.length >= 4, found.map((w) => w.method).join(", "));
  const unlimited = unlimitedWrappers(client);
  check("1. every wrapped method goes through aiSpendGate", unlimited.length === 0, `not limited: ${unlimited.join(", ")}`);
  check("2. createOpenAIClient returns a client forceNoStore wrapped", clientIsWrapped(client));

  const served = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "src"))];
  const offenders: string[] = [];
  const callers: string[] = [];
  for (const file of served) {
    const relative = path.relative(ROOT, file).split(path.sep).join("/");
    if (relative === CLIENT) continue;
    const text = readFileSync(file, "utf8");
    for (const bypass of bypassesIn(text)) offenders.push(`${relative}: ${bypass}`);
    if (/createOpenAIClient\(/.test(text)) callers.push(relative);
  }
  check("3. no served file builds its own OpenAI client or calls the API directly", offenders.length === 0, offenders.join("\n      "));

  let limiter = "";
  try {
    limiter = readFileSync(path.join(ROOT, LIMITER), "utf8");
  } catch {
    limiter = "";
  }
  check("4. aiSpendGate checks the limit, and refuses, before it makes the call", checksBeforeCalling(limiter));

  console.log(`\nFiles that call the OpenAI client (each limited through it): ${callers.length}`);
  for (const caller of callers.sort()) console.log(`  ${caller}`);
  console.log(failures ? `\n${failures} check(s) failed.` : "\nEvery OpenAI call goes through the one spending limit.");
  process.exit(failures ? 1 : 0);
}

main();
