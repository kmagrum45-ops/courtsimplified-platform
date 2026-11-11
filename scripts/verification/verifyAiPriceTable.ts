/**
 * EACH AI CALL IS PRICED FROM THE MODEL IT USED AND ITS REAL TOKEN COUNTS; A MODEL WITH NO PRICE IS NEVER CALLED
 * (site owner, 10 Nov 2026: "replace the two fixed defaults with a price table in code keyed by model name").
 *
 * The cost the spending limit counts (aiSpendLimit.ts callCostUsd) and the gate in front of every call (aiSpendGate),
 * with fake responses and a fake client. Checks:
 *   1. a short call on a dated gpt-6.1-sol snapshot: input, cached input and output each at their own rate;
 *   2. a long-context call (over 272K input tokens): the whole call at the long-context rates, cached included;
 *   3. a model not in the table: the gate makes 0 calls and logs one error (a counted caller; exempt callers outside
 *      production are not priced, so not refused);
 *   4. a model with no long-context rate, sent over 272K input tokens: refused before the call;
 *   5. a response naming a model not in the table (the request named a priced one): priced at the dearest rates in
 *      the table, and an error logged, never priced at zero;
 *   6. AI_PRICE_INPUT_PER_M / AI_PRICE_OUTPUT_PER_M override the short-context input and output rates only.
 *   7. embeddings (text-embedding-3-large $0.13, -small $0.02 per 1M input), from prompt_tokens or total_tokens;
 *   8. a long embedding batch is not refused: embeddings have one flat rate, no long-context tier.
 * Costs nothing: no network, no database, no AI.
 *
 * WHAT FAILURE THIS CATCHES: the daily limits counting a call at the wrong price (a long or cached call, or a dearer
 * model), so a limit set in dollars lets through more than it says; or a call to a model nobody priced.
 *
 * Run: npm run test:ai-price-table
 */
import { forceNoStore } from "../../src/lib/case-system/openaiClient";
import * as spend from "../../src/lib/security/aiSpendLimit";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const quietError = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0] ?? "").includes("[aiCallLog]")) quietError(...args); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const env = { AI_RATE_LIMITS: "local" } as Record<string, string | undefined>;
// The functions this suite needs may not exist yet: it then fails, never crashes.
const cost = spend.callCostUsd as unknown as (response: unknown, env: Record<string, string | undefined>, requested?: string) => number;
const api = spend as unknown as { setPriceErrorSinkForTests?: (sink: ((message: string) => void) | null) => void };
const logged: string[] = [];
api.setPriceErrorSinkForTests?.((message) => logged.push(message));

async function main() {
  // 1. Short call: 10,000 input (4,000 cached), 2,000 output on a dated snapshot of gpt-6.1-sol.
  // 6,000 x $2 + 4,000 x $0.10 + 2,000 x $10 per million = $0.0324.
  const short = cost({ model: "gpt-6.1-sol-2026-08-12", usage: { prompt_tokens: 10_000, completion_tokens: 2_000, prompt_tokens_details: { cached_tokens: 4_000 } } }, env);
  check("1. short call: $0.0324 (cached input at $0.10, the dated snapshot priced as gpt-6.1-sol)", near(short, 0.0324), `got $${short}`);

  // 2. Long call: 300,000 input (100,000 cached), 5,000 output (Responses API shape).
  // 200,000 x $4 + 100,000 x $0.20 + 5,000 x $15 per million = $0.895.
  const long = cost({ model: "gpt-6.1-sol", usage: { input_tokens: 300_000, output_tokens: 5_000, input_tokens_details: { cached_tokens: 100_000 } } }, env);
  check("2. long-context call (300K input): $0.895, every token at the long-context rate", near(long, 0.895), `got $${long}`);

  // 3. A model not in the table, asked by a signed-in person (a counted call): 0 calls, one error logged.
  const counter = { calls: 0 };
  const client = forceNoStore({ chat: { completions: { create: async () => { counter.calls += 1; return { model: "gpt-9-mystery", usage: { prompt_tokens: 10, completion_tokens: 10 } }; } } } }) as unknown as { chat: { completions: { create: (body: unknown) => Promise<unknown> } } };
  spend.resetSpendMemory();
  const before = logged.length;
  let refusal = "";
  try {
    await spend.withAiAskerForTests({ userId: "00000000-0000-4000-8000-0000000000aa", visitor: "v-price" }, () => client.chat.completions.create({ model: "gpt-9-mystery", messages: [{ role: "user", content: "hello" }] }));
  } catch (error) {
    refusal = error instanceof Error ? error.name : String(error);
  }
  check("3a. a model not in the table: 0 model calls", counter.calls === 0, `calls ${counter.calls}`);
  check("3b. ... refused, not answered", refusal !== "", "no refusal");
  check("3c. ... and one error logged naming the model", logged.length - before === 1 && logged.slice(before).some((line) => line.includes("gpt-9-mystery")), JSON.stringify(logged.slice(before)));

  // 4. A model with no long-context rate, sent more than 272K input tokens' worth: refused before the call.
  const luna = { calls: 0 };
  const lunaClient = forceNoStore({ chat: { completions: { create: async () => { luna.calls += 1; return { model: "gpt-6-luna", usage: { prompt_tokens: 10, completion_tokens: 10 } }; } } } }) as unknown as { chat: { completions: { create: (body: unknown) => Promise<unknown> } } };
  let lunaRefused = false;
  try {
    await spend.withAiAskerForTests({ userId: "00000000-0000-4000-8000-0000000000ab", visitor: "v-luna" }, () => lunaClient.chat.completions.create({ model: "gpt-6-luna", messages: [{ role: "user", content: "x".repeat(1_200_000) }] }));
  } catch {
    lunaRefused = true;
  }
  check("4. no long-context rate known (gpt-6-luna) and over 272K input: refused, 0 calls", lunaRefused && luna.calls === 0, `refused ${lunaRefused}, calls ${luna.calls}`);

  // 5. The response names a model the table lacks: priced at the dearest rates, and an error logged.
  const beforeOdd = logged.length;
  const odd = cost({ model: "gpt-6.1-sol-unlisted-variant-x", usage: { prompt_tokens: 1_000, completion_tokens: 1_000 } }, env, "gpt-6.1-sol");
  check("5a. a response naming an unpriced model: priced at the dearest table rates (gpt-6-astra, $0.06)", near(odd, 0.06), `got $${odd}`);
  check("5b. ... and an error logged", logged.length - beforeOdd === 1, JSON.stringify(logged.slice(beforeOdd)));

  // 6. The overrides: the short-context input and output rates; cached input keeps the table's.
  const overridden = cost({ model: "gpt-6.1-sol", usage: { prompt_tokens: 10_000, completion_tokens: 2_000, prompt_tokens_details: { cached_tokens: 4_000 } } }, { ...env, AI_PRICE_INPUT_PER_M: "3", AI_PRICE_OUTPUT_PER_M: "12" });
  // 6,000 x $3 + 4,000 x $0.10 + 2,000 x $12 = $0.0424.
  check("6. overrides: input $3 and output $12, cached input still $0.10 ($0.0424)", near(overridden, 0.0424), `got $${overridden}`);

  // 7. Embeddings (site owner, 10 Nov 2026: text-embedding-3-large $0.13, text-embedding-3-small $0.02 per 1M input
  // tokens): input only, read from an embeddings response's usage (prompt_tokens / total_tokens, no completion tokens).
  const large = cost({ model: "text-embedding-3-large", usage: { prompt_tokens: 1_000_000, total_tokens: 1_000_000 } }, env);
  check("7a. text-embedding-3-large: 1M input tokens cost $0.13", near(large, 0.13), `got $${large}`);
  const small = cost({ model: "text-embedding-3-small", usage: { prompt_tokens: 500_000, total_tokens: 500_000 } }, env);
  check("7b. text-embedding-3-small: 500K input tokens cost $0.01", near(small, 0.01), `got $${small}`);
  const totalOnly = cost({ model: "text-embedding-3-large", usage: { total_tokens: 2_000_000 } }, env);
  check("7c. an embeddings usage with only total_tokens is priced from it ($0.26 for 2M)", near(totalOnly, 0.26), `got $${totalOnly}`);
  // 8. An embedding batch is not refused for its length: embeddings have one flat rate, no long-context tier.
  const embedCalls = { n: 0 };
  const embedClient = forceNoStore({ chat: { completions: { create: async () => ({}) } }, embeddings: { create: async () => { embedCalls.n += 1; return { model: "text-embedding-3-large", data: [], usage: { prompt_tokens: 400_000, total_tokens: 400_000 } }; } } }) as unknown as { embeddings: { create: (body: unknown) => Promise<unknown> } };
  let embedRefused = false;
  try {
    await spend.withAiAskerForTests({ userId: "00000000-0000-4000-8000-0000000000ac", visitor: "v-embed" }, () => embedClient.embeddings.create({ model: "text-embedding-3-large", input: ["x".repeat(1_200_000)], dimensions: 256 }));
  } catch {
    embedRefused = true;
  }
  check("8. a long embedding batch (over 272K tokens) is made once, not refused: embeddings have one flat rate", !embedRefused && embedCalls.n === 1, `refused ${embedRefused}, calls ${embedCalls.n}`);

  console.log(failures ? `\n${failures} check(s) failed.` : "\nEach AI call is priced from its model and real tokens; an unpriced model is never called.");
  process.exit(failures ? 1 : 0);
}
void main();
