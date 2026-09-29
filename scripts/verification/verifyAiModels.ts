/**
 * Every model call in the app takes its model from aiModels.ts, and the
 * parameters sent match what that kind of model accepts.
 *
 * COSTS NOTHING. Reads source off disk and calls pure functions. No network,
 * no model call, no dependencies beyond Node — it imports only aiModels.ts,
 * which imports nothing.
 *
 * WHAT IT EXISTS TO CATCH.
 *
 *   1. A call site that names a model directly. Until 2026-09-29 ten call
 *      sites hard-coded `gpt-4o-mini`; upgrading meant finding them all, and a
 *      missed one silently keeps part of the pipeline on the old model. The
 *      property asserted: no `chat.completions.create(` / `.parse(` call in
 *      src/ or app/ contains a `model:` string literal. It does NOT pin which
 *      model the tiers use — changing TIER_DEFAULTS is the work this file
 *      exists to make easy, and must never turn this suite red.
 *
 *   2. Parameters a reasoning model rejects or misuses: `temperature` sent
 *      while reasoning is on, and a token cap with no room for reasoning (the
 *      court-path classifier's old `max_tokens: 200` would have been spent on
 *      thinking and returned nothing).
 *
 *   3. A rollback that does not roll back: setting a tier to an older model
 *      must send that model exactly the parameters it always took.
 *
 *   4. The unsupported-parameter fallback retrying things it must not — only
 *      sampling knobs may be dropped, never response_format or effort, and a
 *      non-400 error (a 429 above all) is never retried.
 *
 * Run: node --import tsx scripts/verification/verifyAiModels.ts
 */

import fs from "node:fs";
import path from "node:path";

import {
  TIER_DEFAULTS,
  createWithParamFallback,
  isLegacyChatModel,
  modelParams,
  rejectedDroppableParam,
  resolveTier,
} from "../../src/lib/case-system/aiModels";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
}

function withEnv<T>(vars: Record<string, string | undefined>, run: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const CLEAN_ENV = {
  AI_MODEL_DEEP: undefined,
  AI_EFFORT_DEEP: undefined,
  AI_MODEL_STANDARD: undefined,
  AI_EFFORT_STANDARD: undefined,
};

// ------------------------------------------------ 1. no hard-coded models

console.log("\nNo call site names a model directly");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** The argument text of each `.create(` / `.parse(` call on chat.completions. */
function chatCallBodies(source: string): string[] {
  const bodies: string[] = [];
  const opener = /chat\.completions\.(?:create|parse)\(/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source))) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === "(") depth += 1;
      else if (source[i] === ")") depth -= 1;
    }
    bodies.push(source.slice(start, i - 1));
  }
  return bodies;
}

const offenders: string[] = [];
let callCount = 0;
for (const file of [...walk("src"), ...walk("app")]) {
  const source = fs.readFileSync(file, "utf8");
  for (const body of chatCallBodies(source)) {
    callCount += 1;
    if (/\bmodel\s*:\s*["'`]/.test(body)) offenders.push(file);
  }
}
check(`found model calls to inspect (${callCount})`, callCount > 0,
  "no chat.completions calls found at all — the scan is broken, not the code");
check("no chat.completions call in src/ or app/ has a model string literal",
  offenders.length === 0, `hard-coded in: ${[...new Set(offenders)].join(", ")}`);

// The two pre-2026-09-29 variables overrode the tier default, so a value
// left in Vercel silently kept two sites on an old model. Nothing may read them.
const legacyReaders = [...walk("src"), ...walk("app")].filter((file) =>
  /process\.env\.COURTSIMPLIFIED_(REASONING|CLASSIFIER)_MODEL\b/.test(fs.readFileSync(file, "utf8")));
check("no code reads the retired COURTSIMPLIFIED_*_MODEL variables",
  legacyReaders.length === 0, `still read in: ${legacyReaders.join(", ")}`);

// ------------------------------------------------ 2. reasoning-model params

console.log("\nReasoning models get parameters they accept");

withEnv(CLEAN_ENV, () => {
  for (const tier of ["deep", "standard"] as const) {
    const params = modelParams(tier, { temperature: 0, maxOutputTokens: 200 });
    const reasoning = !isLegacyChatModel(params.model);
    if (!reasoning) {
      check(`${tier}: default is a legacy model, reasoning checks skipped`, true);
      continue;
    }
    check(`${tier}: sends a reasoning effort`, typeof params.reasoning_effort === "string");
    check(`${tier}: no temperature while reasoning is on`,
      params.reasoning_effort === "none" || params.temperature === undefined,
      `effort=${params.reasoning_effort} temperature=${params.temperature}`);
    check(`${tier}: a 200-token cap gets reasoning headroom`,
      params.reasoning_effort === "none" || (params.max_completion_tokens ?? 0) > 200,
      `max_completion_tokens=${params.max_completion_tokens}`);
    check(`${tier}: never sends the legacy max_tokens`, !("max_tokens" in params));
  }

  const uncapped = modelParams("deep", {});
  check("an uncapped call stays uncapped", uncapped.max_completion_tokens === undefined);
});

withEnv({ ...CLEAN_ENV, AI_MODEL_STANDARD: "gpt-6-luna", AI_EFFORT_STANDARD: "none" }, () => {
  const params = modelParams("standard", { temperature: 0 });
  if (!isLegacyChatModel(params.model)) {
    check("effort 'none' keeps the caller's temperature", params.temperature === 0);
  }
});

withEnv({ ...CLEAN_ENV, AI_EFFORT_DEEP: "high" }, () => {
  check("a per-call effort beats the tier's env effort",
    resolveTier("deep", undefined, "low").effort === "low");
  check("an invalid per-call effort falls back to the tier",
    resolveTier("deep", undefined, "fast").effort === "high");
});

withEnv({ ...CLEAN_ENV, AI_EFFORT_DEEP: "extreme" }, () => {
  check("an invalid effort in env falls back to the tier default",
    resolveTier("deep").effort === TIER_DEFAULTS.deep.effort);
});

// ------------------------------------------------ 3. rollback + overrides

console.log("\nRollback and overrides");

withEnv({ ...CLEAN_ENV, AI_MODEL_DEEP: "gpt-4o-mini" }, () => {
  const params = modelParams("deep", { temperature: 0.1, seed: 1, maxOutputTokens: 200 });
  check("legacy model: exact old temperature", params.temperature === 0.1);
  check("legacy model: no reasoning_effort", params.reasoning_effort === undefined);
  check("legacy model: cap passed through unchanged", params.max_completion_tokens === 200);
  check("legacy model: seed passed through", params.seed === 1);
});

withEnv({ ...CLEAN_ENV, AI_MODEL_DEEP: "env-model" }, () => {
  check("an explicit model beats the env var",
    modelParams("deep", { model: "explicit-model" }).model === "explicit-model");
  check("the env var beats the default", modelParams("deep").model === "env-model");
});

withEnv(CLEAN_ENV, () => {
  check("an empty override falls through to the default",
    modelParams("deep", { model: "" }).model === TIER_DEFAULTS.deep.model);
});

withEnv({ ...CLEAN_ENV, AI_MODEL_DEEP: "gpt-6.1-sol", AI_EFFORT_DEEP: "none" }, () => {
  check("effort 'none' becomes 'low' on a model that rejects it",
    modelParams("deep", { temperature: 0 }).reasoning_effort === "low");
  check("...and then sends no temperature",
    modelParams("deep", { temperature: 0 }).temperature === undefined);
});
withEnv({ ...CLEAN_ENV, AI_MODEL_DEEP: "gpt-6-luna", AI_EFFORT_DEEP: "none" }, () => {
  check("effort 'none' is kept on a model that accepts it",
    modelParams("deep").reasoning_effort === "none");
});

check("gpt-4o-mini is legacy", isLegacyChatModel("gpt-4o-mini"));
check("gpt-4.1 is legacy", isLegacyChatModel("gpt-4.1"));
check("gpt-6.1-sol is a reasoning model", !isLegacyChatModel("gpt-6.1-sol"));
check("gpt-5.6-luna is a reasoning model", !isLegacyChatModel("gpt-5.6-luna"));

// ------------------------------------------------ 4. the fallback

console.log("\nUnsupported-parameter fallback");

function apiError(status: number, message: string, param?: string): Error {
  return Object.assign(new Error(message), { status, param });
}

const body = { model: "m", temperature: 0, seed: 1, response_format: { type: "json_object" } };

check("a 400 naming temperature is droppable",
  rejectedDroppableParam(apiError(400, "Unsupported parameter: 'temperature'", "temperature"), body) === "temperature");
check("the message alone is enough",
  rejectedDroppableParam(apiError(400, "Unsupported value: 'temperature' does not support 0 with this model."), body) === "temperature");
check("a 429 is never droppable",
  rejectedDroppableParam(apiError(429, "Rate limit reached", "temperature"), body) === null);
check("response_format is never dropped",
  rejectedDroppableParam(apiError(400, "Unsupported parameter: 'response_format'", "response_format"), body) === null);
check("reasoning_effort is never dropped",
  rejectedDroppableParam(apiError(400, "Unsupported value: 'reasoning_effort'", "reasoning_effort"), { ...body, reasoning_effort: "low" }) === null);

async function fallbackChecks(): Promise<void> {
  const sent: Array<Record<string, unknown>> = [];
  const dropped: string[] = [];
  const result = await createWithParamFallback(
    async (attempt) => {
      sent.push(attempt);
      if ("temperature" in attempt) throw apiError(400, "Unsupported parameter: 'temperature'", "temperature");
      if ("seed" in attempt) throw apiError(400, "Unsupported parameter: 'seed'", "seed");
      return "answer";
    },
    body,
    (param) => dropped.push(param),
  );
  check("drops rejected params one at a time and gets the answer", result === "answer" && sent.length === 3,
    `attempts=${sent.length}`);
  check("reports each drop", dropped.join(",") === "temperature,seed");
  check("keeps response_format on the final attempt", "response_format" in sent[sent.length - 1]);
  check("never mutates the caller's body", "temperature" in body && "seed" in body);

  let attempts = 0;
  let threw = false;
  try {
    await createWithParamFallback(async () => {
      attempts += 1;
      throw apiError(429, "Rate limit reached");
    }, body);
  } catch {
    threw = true;
  }
  check("a 429 is thrown after exactly one attempt", threw && attempts === 1, `attempts=${attempts}`);
}

fallbackChecks().then(() => {
  console.log(failures === 0 ? "\nAll AI model checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
});
