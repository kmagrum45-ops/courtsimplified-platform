/**
 * Every OpenAI request carries `store: false`, and no call site can bypass it.
 *
 * COSTS NOTHING. Reads source off disk and calls the factory with a fake key.
 * No network, no model call.
 *
 * WHAT IS BEING DEFENDED. The user's account of their own legal problem —
 * `rawUserText`, verbatim — plus the extracted party names, leave the system on
 * every analysis. `store: false` is what keeps them out of the org's OpenAI
 * logs.
 *
 * THE WRAPPER IS ONLY WORTH ANYTHING IF NOTHING GOES AROUND IT.
 * `createOpenAIClient` forces the flag, so a call site that constructs
 * `new OpenAI()` directly gets an unwrapped client and silently starts
 * storing — with no error, no type failure, and nothing else to notice. That
 * is the whole reason this check exists, and it is the same shape as the
 * retry storm this file's own header describes: nine independent `new OpenAI()`
 * sites with no shared governance.
 *
 * Run: node --import tsx scripts/verification/verifyNoStore.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { forceNoStore } from "../../src/lib/case-system/openaiClient";

const ROOTS = ["src", "app", "scripts"];
const FACTORY = path.join("src", "lib", "case-system", "openaiClient.ts");

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

async function main(): Promise<void> {
  // ---- 1. Nothing constructs a client outside the factory ----

  const offenders: string[] = [];

  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (path.normalize(file) === path.normalize(FACTORY)) continue;

      const source = fs
        .readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ");

      // STRING LITERALS STRIPPED FIRST. Without this the check flags itself:
      // its own failure message contains the words it searches for. Same
      // shape as the audit runner refusing 01c over `LIKE '%INSERT%'`.
      const code = source.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');

      if (/\bnew\s+OpenAI\s*\(/.test(code)) offenders.push(file);
    }
  }

  check(
    "no file constructs `new OpenAI()` outside openaiClient.ts",
    offenders.length === 0,
    `${offenders.join("\n      ")}\n      A directly-constructed client is NOT ` +
      "wrapped, so its requests are stored. Use createOpenAIClient().",
  );

  // ---- 2 and 3. The wrapper actually forces the flag ----
  //
  // Tested against a STUB, not the real SDK. The first attempt monkey-patched
  // the SDK's internal transport to intercept the outgoing body, and captured
  // nothing — the interception point was a guess about SDK internals, and a
  // guess that produced `store was undefined` reads identically to a wrapper
  // that does not work.
  //
  // A stub removes the guess. `forceNoStore` takes any object shaped like a
  // client, so what is exercised here is the merge itself — the only thing
  // this check is about. Whether the real SDK is shaped as expected is covered
  // by tsc and by the fact that six call sites use it.

  function stubClient() {
    const seen: { body: Record<string, unknown> | null } = { body: null };
    const client = {
      chat: {
        completions: {
          create: (body: Record<string, unknown>) => {
            seen.body = body;
            return Promise.resolve({});
          },
        },
      },
      responses: {
        create: (body: Record<string, unknown>) => {
          seen.body = body;
          return Promise.resolve({});
        },
      },
    };
    return { client, seen };
  }

  const chat = stubClient();
  forceNoStore(chat.client);
  await chat.client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "check" }],
  });

  check(
    "a chat.completions request leaves the wrapper carrying store: false",
    chat.seen.body !== null && chat.seen.body.store === false,
    `the wrapper delivered ${JSON.stringify(chat.seen.body)}`,
  );

  // The Responses API defaults to STORING. It is the one this wrapper exists
  // to cover before anybody reaches for it.
  const resp = stubClient();
  forceNoStore(resp.client);
  await resp.client.responses.create({ model: "gpt-4o-mini", input: "check" });

  check(
    "a responses request leaves the wrapper carrying store: false",
    resp.seen.body !== null && resp.seen.body.store === false,
    `the wrapper delivered ${JSON.stringify(resp.seen.body)} — the Responses API ` +
      "defaults to store: true, so an unwrapped call there logs user narratives",
  );

  // `{ ...body, store: false }` spreads last precisely so a caller cannot opt
  // back in. Reordering it to `{ store: false, ...body }` would let one.
  const forced = stubClient();
  forceNoStore(forced.client);
  await forced.client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "check" }],
    store: true,
  });

  check(
    "a caller passing store: true is overridden, not obeyed",
    forced.seen.body !== null && forced.seen.body.store === false,
    "the spread order in forceNoStore was reversed — `{ store: false, ...body }` " +
      "lets a caller opt back in to storing the user's narrative",
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
