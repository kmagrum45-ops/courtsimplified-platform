/**
 * REAL AI ANSWERS, RECORDED AND REPLAYED (site owner, 17 Nov 2026: "the page tests use AI stand-ins, so they never see
 * what the real AI reads"; and: "the real AI does not give the same reading every time ... keep every distinct result").
 *
 * Each AI step a story passes through in the test process (the home page's story reading, the court suggestion, the
 * Small Claims chat's fact reading, claim kind, story suggestions and safety pass) has a plain stand-in in
 * thisCommitServer.ts. With a fixture, the step's output is the real model's instead.
 *
 * A story has one or more READINGS: tests/browser/fixtures/real-ai/<story>/<reading>.json, each one whole run of the
 * real model. The model does not answer the same way every time (S6 suggested "a claim of your own" in Chrome's run and
 * not in ours), so a story is recorded several times and every distinct reading is kept; the page test runs once per
 * reading (realAiReadings), and each must give a correct flow that asks nothing twice.
 *   AI_FIXTURES=record   calls the real model for any step this reading has not recorded (OPENAI_API_KEY in the test
 *                        process only; the site's server has none) and saves it;
 *   otherwise            replays, and fails loudly when a step was never recorded for this input (never a silent stand-in).
 * A step's output is matched by its input (a hash of the words sent), so a test that sends other words fails instead of
 * replaying an answer to a different question. The fixtures hold the made-up stories and labels only.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DIR = path.join("tests", "browser", "fixtures", "real-ai");
export const RECORDING = process.env.AI_FIXTURES === "record";

/** `said`: the start of the words sent (made-up stories only), so a replay that misses can be compared with it. */
/** `ms`: how long the real model took (replayed at that speed when AI_REPLAY_REAL_SPEED=1, so a screen that waits on it shows). */
type Entry = { step: string; input: string; said?: string; output: unknown; ms?: number };
type Fixture = { story: string; reading: string; recorded: string; note: string; entries: Entry[] };

/** `key`: "<story>/<reading>" (a reading of a story). */
const file = (key: string) => path.join(DIR, `${key}.json`);
const hashOf = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);

/**
 * The readings recorded for a story, in order ("r1", "r2", ...). Recording (AI_FIXTURES=record) with AI_FIXTURE_READING
 * set records that reading (a new one when it is not on disk yet); otherwise every reading on disk.
 */
export function realAiReadings(story: string): string[] {
  if (RECORDING && process.env.AI_FIXTURE_READING) return [process.env.AI_FIXTURE_READING];
  const dir = path.join(DIR, story);
  if (!fs.existsSync(dir)) return RECORDING ? ["r1"] : [];
  return fs.readdirSync(dir).filter((name) => /^r\d+\.json$/.test(name)).map((name) => name.replace(/\.json$/, "")).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

function load(key: string): Fixture {
  if (!fs.existsSync(file(key))) {
    const [story, reading] = key.split("/");
    return { story, reading, recorded: new Date().toISOString().slice(0, 10), note: "Real model outputs for a made-up story (AI_FIXTURES=record).", entries: [] };
  }
  return JSON.parse(fs.readFileSync(file(key), "utf8")) as Fixture;
}

/**
 * NAMES NEVER SENT (site owner, 25 Nov 2026: "no real person's name ever goes to the AI in the replay or the matrix").
 * A recording (and the nightly live check) calls the model from this test process. The route stand-ins run each route
 * through the site's own name labels (thisCommitServer.ts viaHandler -> security/requestNames.ts withRequestNames), as
 * the live site does; on top of that, every request this process sends to OpenAI is read here first, and one holding a
 * name a story lists (the matrix's stories do: matrixStories.ts `names`) is stopped before it leaves: nothing is sent,
 * nothing is recorded, and the error names the name. So a name the site's labels miss stops the recording, never leaks.
 */
const NAMES = new Map<string, readonly string[]>();
/** `story`: the part of a fixture key before its reading ("matrix-chrome-alex" of "matrix-chrome-alex/r1"). */
export function namesNeverSent(story: string, names: readonly string[]): void {
  NAMES.set(story, names);
}
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The listed names (any story's) in what would be sent; empty when none. */
export function listedNamesIn(body: string): string[] {
  return [...new Set([...NAMES.values()].flat())].filter((name) => new RegExp(`\\b${escaped(name)}(?!\\w)`, "i").test(body));
}
let guarded = false;
/**
 * Every request to the model that was stopped (a listed name) or did not succeed, in this process. The site catches a
 * failed model call and goes on with a fallback (the court classifier answers "unknown"), so a step's output alone
 * cannot say whether the model answered: realStep compares this list before and after the call and never saves a step
 * during which a request was stopped or failed (found 25 Nov 2026: the first matrix recording saved the classifier's
 * fallback as if it were the model's reading).
 */
export const failedSends: string[] = [];
/** Wraps this process's fetch once: a request to OpenAI holding a listed name throws before it is sent. */
export function installSendGuard(): void {
  if (guarded) return;
  guarded = true;
  const send = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!/api\.openai\.com/.test(url)) return send(input as never, init);
    const body = typeof init?.body === "string" ? init.body : input instanceof Request ? await input.clone().text() : "";
    const found = listedNamesIn(body);
    if (found.length) {
      const why = `refused: a request to the model held the listed name(s) ${found.map((name) => `"${name}"`).join(", ")} as typed; nothing was sent`;
      failedSends.push(why);
      throw new Error(why);
    }
    try {
      const response = await send(input as never, init);
      if (!response.ok) failedSends.push(`the model answered ${response.status}`);
      return response;
    } catch (error) {
      failedSends.push(`the request failed: ${String(error).slice(0, 160)}`);
      throw error;
    }
  }) as typeof fetch;
}

/** AI_FIXTURES=verify: every step whose live answer no longer matches its recording (the nightly live check's report). */
export const verifyDrift: string[] = [];

/**
 * What a recording and a live answer must agree on, per step; null when they agree. Never the words (the model words
 * things differently every time), only what the site acts on: the facts read, the questions offered from the story, the
 * kind of claim, the safety reading, the court and side of the story reading.
 */
export function driftOf(step: string, saved: unknown, live: unknown): string | null {
  const o = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});
  if (o(live).error) return `the live call failed: ${String(o(live).error).slice(0, 160)}`;
  const sorted = (list: unknown) => (Array.isArray(list) ? list.map(String).sort().join(",") : "");
  const differ = (what: string, a: string, b: string) => (a === b ? null : `${what}: recorded [${a}], live [${b}]`);
  if (step === "fact-reading") return differ("facts read", Object.keys(o(o(saved).facts)).sort().join(","), Object.keys(o(o(live).facts)).sort().join(","));
  if (step === "story-suggestions") return differ("questions offered", sorted(Array.isArray(saved) ? saved.map((item) => o(item).questionId) : []), sorted(Array.isArray(live) ? live.map((item) => o(item).questionId) : []));
  if (step === "claim-kind" || step === "claim-kind-confirm") return differ("kind of claim", String(o(saved).claimTypeId ?? o(o(saved).result).claimTypeId ?? ""), String(o(live).claimTypeId ?? o(o(live).result).claimTypeId ?? ""));
  if (step === "safety") return differ("safety reading", String(o(saved).classification ?? ""), String(o(live).classification ?? ""));
  if (step === "court-suggestion") return differ("court", String(o(saved).primaryPath ?? ""), String(o(live).primaryPath ?? ""));
  if (step === "story-reading") {
    const read = (value: unknown) => { try { const j = o(typeof value === "string" ? JSON.parse(value) : value); return `${j.mainCourt ?? ""}/${j.side ?? ""}`; } catch { return ""; } };
    return differ("court/side read", read(saved), read(live));
  }
  return differ("answer's parts", Object.keys(o(saved)).sort().join(","), Object.keys(o(live)).sort().join(","));
}

/** AI_REPLAY_REAL_SPEED=1: a replayed step waits as long as the model took when it was recorded (at most 60 s). */
async function replaySpeed(ms: number | undefined): Promise<void> {
  if (process.env.AI_REPLAY_REAL_SPEED === "1" && ms && ms > 0) await new Promise((done) => setTimeout(done, Math.min(ms, 60_000)));
}

/** Every step a replay asked for that was never recorded, in this test process (the page test asserts none). */
export const replayMisses: string[] = [];

/**
 * AI_FIXTURES_USED=<file>: each step a run uses is written there ("<story>/<reading> <step> <hash>"), so that after a
 * whole replay scripts/browser/pruneAiFixtures.mjs removes every recorded step nothing uses any more: a re-recorded
 * reading keeps only what it replays, never old steps beside new ones (site owner, 19 Nov 2026, rule 0).
 */
const used = (key: string, step: string, hash: string) => {
  if (process.env.AI_FIXTURES_USED) fs.appendFileSync(process.env.AI_FIXTURES_USED, `${key} ${step} ${hash}\n`);
};

/** The output of one AI step: the saved one when this reading has it, else (recording) the real model's, saved. */
export async function realStep<T>(key: string, step: string, input: unknown, real: () => Promise<T>): Promise<T> {
  const hash = hashOf(input);
  const saved = load(key).entries.find((entry) => entry.step === step && entry.input === hash);
  if (saved && process.env.AI_FIXTURES === "verify") {
    // The nightly live check: the live model's answer to the same input, compared with the recording by what matters for
    // the step (driftOf); the journey goes on with the recording, so drift is the only thing this run measures.
    if (process.env.OPENAI_API_KEY) {
      const live = await real().catch((error: unknown) => ({ error: String(error) }) as unknown as T);
      const drift = driftOf(step, saved.output, live);
      if (drift) verifyDrift.push(`${key} ${step}: ${drift}`);
    }
    used(key, step, hash);
    return saved.output as T;
  }
  if (saved) { used(key, step, hash); await replaySpeed(saved.ms); return saved.output as T; }
  if (!RECORDING) {
    // Said here too: the site catches a failed AI step and goes on without it, so the error alone would be silent.
    const message = `real-AI fixture ${key}: step "${step}" was never recorded for this input (${hash}); record with AI_FIXTURES=record`;
    console.error(`${message}\n  input: ${JSON.stringify(input).slice(0, 600)}`);
    // And kept, so the page test fails on it: a step the site swallows is never a silent pass (site owner, 18 Nov 2026).
    replayMisses.push(`${key} ${step} ${hash}`);
    throw new Error(message);
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("AI_FIXTURES=record needs OPENAI_API_KEY in the test process");
  installSendGuard();
  const failedBefore = failedSends.length;
  const started = Date.now();
  const output = await real();
  const ms = Date.now() - started;
  if (failedSends.length > failedBefore) {
    // Not saved: what came back is the site's fallback, not the model's reading (failedSends).
    const why = failedSends.slice(failedBefore).join("; ");
    replayMisses.push(`${key} ${step} not recorded: ${why}`);
    throw new Error(`real-AI fixture ${key}: step "${step}" not recorded: ${why}`);
  }
  const fresh = load(key);
  fresh.entries.push({ step, input: hash, said: JSON.stringify(input).slice(0, 600), output: output as unknown, ms });
  fs.mkdirSync(path.dirname(file(key)), { recursive: true });
  fs.writeFileSync(file(key), `${JSON.stringify(fresh, null, 2)}\n`);
  used(key, step, hash);
  return output;
}

// Installed as this module loads, before any AI client exists: the OpenAI library keeps the fetch it finds when a client
// is made (openai/internal/shims.js getDefaultFetch), so a guard installed later would not see that client's requests.
if (RECORDING || process.env.AI_FIXTURES === "verify") installSendGuard();
