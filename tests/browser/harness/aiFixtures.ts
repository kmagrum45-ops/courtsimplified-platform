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
type Entry = { step: string; input: string; said?: string; output: unknown };
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
  if (saved) { used(key, step, hash); return saved.output as T; }
  if (!RECORDING) {
    // Said here too: the site catches a failed AI step and goes on without it, so the error alone would be silent.
    const message = `real-AI fixture ${key}: step "${step}" was never recorded for this input (${hash}); record with AI_FIXTURES=record`;
    console.error(`${message}\n  input: ${JSON.stringify(input).slice(0, 600)}`);
    // And kept, so the page test fails on it: a step the site swallows is never a silent pass (site owner, 18 Nov 2026).
    replayMisses.push(`${key} ${step} ${hash}`);
    throw new Error(message);
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("AI_FIXTURES=record needs OPENAI_API_KEY in the test process");
  const output = await real();
  const fresh = load(key);
  fresh.entries.push({ step, input: hash, said: JSON.stringify(input).slice(0, 600), output: output as unknown });
  fs.mkdirSync(path.dirname(file(key)), { recursive: true });
  fs.writeFileSync(file(key), `${JSON.stringify(fresh, null, 2)}\n`);
  used(key, step, hash);
  return output;
}
