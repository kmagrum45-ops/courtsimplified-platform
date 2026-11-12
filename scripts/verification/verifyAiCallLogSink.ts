/**
 * Does a test run write to the live database? It must not.
 *
 *   npm run test:ai-call-log-sink
 *
 * COSTS NOTHING. No model call, no network, no database — which is the entire
 * point, and is asserted rather than assumed: the Supabase client factory is
 * replaced with one that throws, and the check fails if anything builds a client.
 *
 * *** THE FAILURE THIS EXISTS TO CATCH, WHICH HAD NOT HAPPENED YET ***
 *
 * Every eval run and every fixture run loads `.env.local`, which points at
 * `fddlpnibovkkkgboabqb` — THE LIVE DATABASE (CLAUDE.md §6: the project names are
 * backwards, and the one called `-dev` is production). So those runs were already
 * opening a service-role client to production and inserting audit rows, dozens per
 * fixture run.
 *
 * Nothing was damaged, for the worst possible reason: the insert fails with
 * PGRST205 because `ai_call_log` does not exist yet. The migration is written and
 * waiting to be applied. THE DAY IT IS APPLIED, every test run starts writing to
 * production and the audit log a regulator reads fills with fabricated fixture
 * stories interleaved with real users' calls.
 *
 * So this is a check against a defect that was latent rather than live. The
 * console output of a fixture run — line after line of `[aiCallLog] insert
 * failed` — was the symptom, and it read like noise.
 *
 * *** WHY THE DEFAULT IS THE FILE SINK AND NOT AN OPT-IN TEST FLAG ***
 *
 * An opt-in flag means the next script somebody writes defaults to writing to
 * production, because nobody remembers a flag whose absence is invisible. The
 * database is used only when `NEXT_RUNTIME` says we are inside the Next.js
 * server; everything else — scripts, evals, fixtures, and anything added later —
 * goes to a local file with no network call at all.
 *
 * The `AI_CALL_LOG` override exists so a deployment that somehow lacks
 * NEXT_RUNTIME can force the database rather than silently stop auditing, which
 * is the failure this arrangement could otherwise introduce.
 */

import { existsSync, readFileSync, rmSync } from "node:fs";

import {
  FILE_SINK_PATH,
  observeAiCall,
  setAiCallLogClientFactory,
  sinkFor,
  withAiCallContext,
} from "../../src/lib/audit/aiCallLog";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`pass  ${name}`);
    return;
  }
  failures.push(detail ? `${name}\n      ${detail}` : name);
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// 1. The sink decision, as a pure function of the environment
// ---------------------------------------------------------------------------

check(
  "a script with no NEXT_RUNTIME uses the file sink",
  sinkFor({} as unknown as NodeJS.ProcessEnv) === "file",
  `got "${sinkFor({} as unknown as NodeJS.ProcessEnv)}" — this is the default every eval, ` +
    `fixture and future script gets, and it must never be the database`,
);

check(
  "a run with Supabase credentials present STILL uses the file sink",
  sinkFor({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "irrelevant-and-not-a-real-key",
  } as unknown as NodeJS.ProcessEnv) === "file",
  "having credentials is not evidence of being inside the app — .env.local is " +
    "loaded by every script in this repository",
);

check(
  "the Next.js server uses the database",
  sinkFor({ NEXT_RUNTIME: "nodejs" } as unknown as NodeJS.ProcessEnv) === "database",
  "the audit log is a compliance obligation; the app itself must still write it",
);

check(
  "an explicit override wins in both directions",
  sinkFor({ AI_CALL_LOG: "database" } as unknown as NodeJS.ProcessEnv) === "database" &&
    sinkFor({ NEXT_RUNTIME: "nodejs", AI_CALL_LOG: "file" } as unknown as NodeJS.ProcessEnv) === "file" &&
    sinkFor({ NEXT_RUNTIME: "nodejs", AI_CALL_LOG: "off" } as unknown as NodeJS.ProcessEnv) === "off",
  "a deployment without NEXT_RUNTIME must be able to force the database rather " +
    "than silently stop auditing",
);

check(
  "an unrecognised override is ignored rather than obeyed",
  sinkFor({ AI_CALL_LOG: "yes-please" } as unknown as NodeJS.ProcessEnv) === "file",
  "a typo in the override must fall back to the safe default, not to the database",
);

check(
  "on Vercel (any VERCEL_ENV) with no override, the database is used — never the file sink",
  ["production", "preview", "development"].every(
    (value) => sinkFor({ VERCEL_ENV: value } as unknown as NodeJS.ProcessEnv) === "database",
  ),
  "Vercel's filesystem is read-only: the file sink there writes nothing, so an " +
    "AI call on the live site or a preview left no audit row at all (item O, 2026-10-29)",
);

check(
  "on Vercel the explicit override still wins",
  sinkFor({ VERCEL_ENV: "preview", AI_CALL_LOG: "off" } as unknown as NodeJS.ProcessEnv) === "off" &&
    sinkFor({ VERCEL_ENV: "preview", AI_CALL_LOG: "file" } as unknown as NodeJS.ProcessEnv) === "file",
);

// ---------------------------------------------------------------------------
// 2. THE PART THAT MATTERS: nothing reaches the network
// ---------------------------------------------------------------------------
//
// Asserting the sink choice proves the INTENT. This proves the BEHAVIOUR, and it
// catches a write path added later that does not consult `sinkFor`.
//
// *** MY FIRST VERSION OF THIS CHECK PASSED WITH THE SAFETY DISABLED ***
//
// It spied on `globalThis.fetch` and counted requests. Mutation-testing it — by
// making `sinkFor` return "database" unconditionally — produced: the five sink
// checks correctly FAILED, and "logging three calls made NO network request"
// still PASSED.
//
// The spy was not looking in the wrong place. It was looking too EARLY. The
// database write is fire and forget by design, so the request is issued after the
// assertion has already run, and the verdict came down to a race.
//
// A check whose result depends on timing is not evidence. Constructing the client
// happens synchronously, before any await, so the check now replaces the client
// factory and asserts it is never called. True or false the moment `insertRow`
// returns.

async function logThreeCalls(): Promise<number> {
  let clientsBuilt = 0;

  /*
   * The spy COUNTS and returns a harmless stub. It does not throw.
   *
   * Throwing was the first version, and it turned a failing check into an
   * uncaught error: the mutation run printed a stack trace instead of the
   * assertion that explains what went wrong. A check has to fail legibly,
   * because the person reading the failure is the person who has to act on it.
   */
  const restore = setAiCallLogClientFactory((() => {
    clientsBuilt += 1;
    return {
      from: () => ({ insert: () => Promise.resolve({ error: null }) }),
    };
  }) as unknown as typeof import("@supabase/supabase-js").createClient);

  if (existsSync(FILE_SINK_PATH)) rmSync(FILE_SINK_PATH);

  try {
    await withAiCallContext({ callType: "stage-resolver", caseId: "sink-test" }, async () => {
      // Three calls, so a single-row fluke cannot pass this.
      for (let index = 0; index < 3; index += 1) {
        await observeAiCall({ model: "gpt-4o-mini", messages: [] }, async () => ({
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }));
      }
    });
  } finally {
    // finally, so a thrown assertion cannot leave the seam replaced.
    restore();
  }

  return clientsBuilt;
}

// ---------------------------------------------------------------------------
// 3. On the database sink, the write finishes before the wrapper resolves, and a
//    failed write is loud, never silent, and never breaks the person's request.
// ---------------------------------------------------------------------------
//
// The failure (item O, 2026-10-29): the insert was fire and forget. On Vercel a
// function may be frozen the moment its response is sent, so an un-awaited
// write can simply never happen, and a failed one only reached a console line
// nobody reads. All with a fake client: no network, no database.

const FAKE_ENV: Record<string, string> = {
  AI_CALL_LOG: "database",
  NEXT_PUBLIC_SUPABASE_URL: "https://fake.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "fake-not-a-key",
};

async function withFakeEnv<T>(work: () => Promise<T>): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(FAKE_ENV)) {
    saved[key] = process.env[key];
    process.env[key] = FAKE_ENV[key];
  }
  try {
    return await work();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

type FakeInsert = (
  table: string,
  row: unknown,
) => Promise<{ error: { code?: string; message?: string } | null }>;

async function oneLoggedCall(insert: FakeInsert): Promise<string> {
  const restore = setAiCallLogClientFactory((() => ({
    from: (table: string) => ({ insert: (row: unknown) => insert(table, row) }),
  })) as unknown as typeof import("@supabase/supabase-js").createClient);
  try {
    return await withFakeEnv(() =>
      withAiCallContext({ callType: "stage-resolver", caseId: "sink-test" }, async () => {
        await observeAiCall({ model: "gpt-4o-mini", messages: [] }, async () => ({
          choices: [{ message: { content: "{}" } }],
        }));
        return "the person's answer";
      }),
    );
  } finally {
    restore();
  }
}

async function captureErrors<T>(work: () => Promise<T>): Promise<{ result: T | Error; lines: string[] }> {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
  };
  try {
    return { result: await work(), lines };
  } catch (error) {
    return { result: error instanceof Error ? error : new Error(String(error)), lines };
  } finally {
    console.error = original;
  }
}

async function checkDatabaseWriteIsAwaitedAndLoud(): Promise<void> {
  // A slow insert: 150 ms. If the wrapper does not wait, it resolves first.
  let slowWriteFinished = false;
  await oneLoggedCall(async (table) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (table === "ai_call_log") slowWriteFinished = true;
    return { error: null };
  });
  check(
    "the database write has FINISHED by the time the wrapper resolves",
    slowWriteFinished,
    "the insert was still in flight when the request's work returned — on Vercel " +
      "the function can be frozen then and the row never written",
  );

  // A failed insert, as PostgREST reports a CHECK violation.
  const tables: string[] = [];
  const failed = await captureErrors(() =>
    oneLoggedCall(async (table) => {
      tables.push(table);
      return table === "ai_call_log"
        ? { error: { code: "23514", message: "violates check constraint" } }
        : { error: null };
    }),
  );
  check(
    "a failed insert does not throw into the person's request",
    failed.result === "the person's answer",
    failed.result instanceof Error ? failed.result.message : String(failed.result),
  );
  check(
    "a failed insert logs a loud, stable error line",
    failed.lines.some((line) => line.startsWith("[aiCallLog] WRITE FAILED") && line.includes("23514")),
    `console.error lines: ${JSON.stringify(failed.lines)}`,
  );
  check(
    "a failed insert is also recorded in server_errors",
    tables.includes("server_errors"),
    `tables written: ${tables.join(", ") || "(none)"}`,
  );

  // An insert that rejects outright (network down) is just as loud and just as harmless.
  const rejected = await captureErrors(() =>
    oneLoggedCall(async (table) => {
      if (table === "ai_call_log") throw new Error("fetch failed");
      return { error: null };
    }),
  );
  check(
    "a rejected insert does not throw and logs the stable error line",
    rejected.result === "the person's answer" &&
      rejected.lines.some((line) => line.startsWith("[aiCallLog] WRITE FAILED")),
    `result: ${String(rejected.result)}; lines: ${JSON.stringify(rejected.lines)}`,
  );
}

async function main(): Promise<void> {
  // The rows are staged by observeAiCall and flushed when the context exits, so
  // they are on disk by the time this resolves.
  const clientsBuilt = await logThreeCalls();

  check(
    "logging three calls built NO database client",
    clientsBuilt === 0,
    `it built ${clientsBuilt} client(s) — a test run was reaching for the live database`,
  );

  check(
    "the rows landed in the local file instead",
    existsSync(FILE_SINK_PATH) &&
      readFileSync(FILE_SINK_PATH, "utf8").trim().split("\n").length === 3,
    existsSync(FILE_SINK_PATH)
      ? `${readFileSync(FILE_SINK_PATH, "utf8").trim().split("\n").length} line(s), expected 3`
      : `${FILE_SINK_PATH} was not written — the rows went nowhere, which is a ` +
        `different bug and not a safer one`,
  );

  /*
   * And the rows still contain what an audit needs. A sink that silently dropped
   * the fields would pass every check above.
   */
  if (existsSync(FILE_SINK_PATH)) {
    const first = JSON.parse(readFileSync(FILE_SINK_PATH, "utf8").trim().split("\n")[0]) as Record<
      string,
      unknown
    >;
    check(
      "a file-sink row carries the call type, the case and the timing",
      first.call_type === "stage-resolver" &&
        first.case_id === "sink-test" &&
        typeof first.latency_ms === "number",
      JSON.stringify(first).slice(0, 200),
    );
    check(
      "a file-sink row still holds no prompt text",
      !Object.keys(first).some((key) => key === "prompt" || key === "messages" || key === "input"),
      `keys: ${Object.keys(first).join(", ")}`,
    );

    rmSync(FILE_SINK_PATH);
  }

  await checkDatabaseWriteIsAwaitedAndLoud();

  // ---------------------------------------------------------------------------

  console.log("");
  console.log("AI CALL LOG SINK");
  console.log("");
  console.log(`  ${passed} check(s) passed`);
  console.log("");

  if (failures.length > 0) {
    console.log(`${failures.length} FAILURE(S):`);
    for (const failure of failures) console.log(`  - ${failure}`);
    console.log("");
    process.exitCode = 1;
  } else {
    console.log("  All checks passed. No test run writes to the live database.");
    console.log("");
  }

}

void main();
