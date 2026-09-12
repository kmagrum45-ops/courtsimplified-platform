/**
 * Asserts that runFixtures.ts cannot write a .actual.md from a run that
 * threw, timed out, or silently degraded.
 *
 * COSTS NOTHING. No OpenAI call is made: the guards are pure functions over a
 * PipelineRun, so they are exercised against hand-built run objects. This is
 * deliberate — the OpenAI project is capped at roughly 100 requests/day and a
 * full three-fixture regeneration costs ~130.
 *
 * WHAT THIS DOES AND DOES NOT PROVE. It proves the guard classifies each run
 * shape correctly and that the write in runFixtures.ts is lexically downstream
 * of the guard. It does NOT prove the end-to-end harness behaves correctly
 * against a live 429 — that needs the API and the quota to reproduce.
 *
 * Run: node --import tsx scripts/verification/verifyFixtureHarnessGuards.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  describeRunDegradation,
  withTimeout,
  abortIfRateLimited,
  isRateLimitError,
  RateLimitAbort,
} from "./pipelineGuards";
import { OPENAI_MAX_RETRIES, withAbortableTimeout } from "../../src/lib/case-system/openaiClient";
import type { PipelineRun } from "./fixtures/pipelineRunner";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** Minimal PipelineRun shaped enough for the guard; cast at the boundary. */
function runWith(partial: Partial<PipelineRun>): PipelineRun {
  return {
    input: { id: "x", story: "", answers: {}, location: { province: "Ontario", city: "Toronto" } },
    turns: [],
    halted: false,
    haltMessage: "",
    intakeComplete: true,
    finalFacts: {},
    finalAnsweredIds: [],
    retainedMatchedClaimType: null,
    retainedSuggestedClaimType: null,
    mappedInput: null,
    analysisOutput: null,
    ...partial,
  } as PipelineRun;
}

function analysisWithCognitionMode(mode: "structured" | "fallback"): PipelineRun["analysisOutput"] {
  return { analysis: { intelligence: { cognitionMode: mode } } } as PipelineRun["analysisOutput"];
}

async function main(): Promise<void> {
  // ---- 1. The guard's classification ----

  check(
    "a healthy structured run is usable",
    describeRunDegradation(runWith({ analysisOutput: analysisWithCognitionMode("structured") })) === null,
  );

  const fallbackReason = describeRunDegradation(
    runWith({ analysisOutput: analysisWithCognitionMode("fallback") }),
  );
  check(
    "a cognition FALLBACK run is rejected (the 429-swallowed case)",
    typeof fallbackReason === "string" && fallbackReason.includes("buildFallbackCognition"),
    `got: ${JSON.stringify(fallbackReason)}`,
  );

  check(
    "a non-halted run with no analysisOutput is rejected",
    describeRunDegradation(runWith({ halted: false, analysisOutput: null })) !== null,
  );

  // A safety halt is legitimate pipeline behaviour, not degradation. If this
  // ever starts failing, the harness would refuse to record safety fixtures.
  check(
    "a HALTED run with no analysisOutput is still usable (safety halt is real behaviour)",
    describeRunDegradation(runWith({ halted: true, analysisOutput: null })) === null,
  );

  // ---- 2. The timeout actually rejects rather than hanging ----

  const neverSettles = new Promise<string>(() => {});
  let timedOut = false;
  try {
    await withTimeout(neverSettles, 50);
  } catch (error) {
    timedOut = error instanceof Error && error.message.includes("timed out");
  }
  check("withTimeout rejects a promise that never settles", timedOut);

  check(
    "withTimeout passes a value through when work finishes in time",
    (await withTimeout(Promise.resolve("ok"), 1000)) === "ok",
  );

  // ---- 3. The write is downstream of the guard, in the source ----
  //
  // A structural check, not a behavioural one: it reads runFixtures.ts and
  // asserts writeFileSync appears AFTER describeRunDegradation, and that the
  // degraded branch breaks out before reaching it. This is what makes the
  // guard unbypassable rather than merely present.

  const source = readFileSync(path.join(__dirname, "runFixtures.ts"), "utf8");
  const guardAt = source.indexOf("describeRunDegradation(run)");
  const writeAt = source.indexOf("writeFileSync(outPath");
  const timeoutAt = source.indexOf("withTimeout(");

  check("runFixtures.ts calls describeRunDegradation", guardAt !== -1);
  check("runFixtures.ts wraps the pipeline call in withTimeout", timeoutAt !== -1);
  check(
    "the .actual.md write is downstream of the degradation guard",
    guardAt !== -1 && writeAt !== -1 && guardAt < writeAt,
    `guard at ${guardAt}, write at ${writeAt}`,
  );
  check(
    "the degraded branch exits before the write",
    /if \(degraded\) \{[\s\S]{0,300}?break;/.test(source),
  );
  check(
    "there is exactly one .actual.md write site",
    (source.match(/writeFileSync\(/g) || []).length === 1,
  );

  // ---- 4. Retries are off, and a 429 aborts rather than continuing ----

  check("OPENAI_MAX_RETRIES is 0 (a daily-cap 429 cannot be cleared by retrying)", OPENAI_MAX_RETRIES === 0);

  check(
    "isRateLimitError recognises an SDK-style status object",
    isRateLimitError(Object.assign(new Error("Too Many Requests"), { status: 429 })),
  );
  check(
    "isRateLimitError recognises a 429 flattened into a message",
    isRateLimitError(new Error("429 Rate limit reached for gpt-4o-mini ... requests per day (RPD)")),
  );
  check("isRateLimitError ignores unrelated errors", !isRateLimitError(new Error("socket hang up")));

  let aborted = false;
  try {
    abortIfRateLimited(Object.assign(new Error("429"), { status: 429 }), "journey X");
  } catch (error) {
    aborted = error instanceof RateLimitAbort;
  }
  check("abortIfRateLimited throws RateLimitAbort on a 429", aborted);

  let passedThrough = true;
  try {
    abortIfRateLimited(new Error("some other failure"), "journey X");
  } catch {
    passedThrough = false;
  }
  check("abortIfRateLimited does NOT throw on a non-429", passedThrough);

  // Both billed harnesses must abort rather than absorb.
  for (const name of ["runFixtures.ts", "measureInterceptionRate.ts"]) {
    const s = readFileSync(path.join(__dirname, name), "utf8");
    check(`${name} calls abortIfRateLimited inside its catch`, s.includes("abortIfRateLimited("));
  }

  // ---- 5. The timeout actually cancels the request ----

  let sawAbort = false;
  const result = await withAbortableTimeout(async (signal) => {
    await new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => {
        sawAbort = true;
        resolve();
      });
    });
    if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    return "never";
  }, 50);
  check("withAbortableTimeout signals abort to the running request", sawAbort);
  check("withAbortableTimeout resolves null once aborted", result === null);

  // Both former race sites must now go through withAbortableTimeout. Comments
  // may still mention Promise.race (they explain what was replaced), so this
  // strips comment lines before looking for live usage.
  for (const file of ["voiceLayer.ts", "explainQuestion.ts"]) {
    const src = readFileSync(
      path.join(__dirname, "..", "..", "src", "lib", "case-system", "intake", file),
      "utf8",
    );
    const code = src
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");

    check(`${file} no longer races a live request with Promise.race`, !code.includes("Promise.race"));
    check(`${file} passes an abort signal to the request`, /\{\s*signal\s*\}/.test(code));
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
