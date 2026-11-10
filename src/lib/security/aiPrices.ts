/**
 * WHAT AN AI CALL COSTS: ONE PRICE TABLE, KEYED BY MODEL (site owner, 10 Nov 2026).
 *
 * Dollars per million tokens, OpenAI's Standard rates as the site owner gave them on 10 Nov 2026. A call is priced from
 * the model the response says it used (a dated snapshot such as "gpt-6.1-sol-2026-08-12" is priced as its model) and its
 * real token counts: input not read from the cache, input read from the cache, and output (reasoning tokens are output,
 * and OpenAI counts them in the output total).
 *
 * LONG CONTEXT: when a call's input is over 272,000 tokens, the WHOLE call (all its input, cached input and output) is
 * priced at the long-context rates. A model with no long-context rate in the table is refused before a call whose input
 * could be that long; its long rate is not guessed.
 *
 * A MODEL NOT IN THE TABLE IS NEVER PRICED BY GUESSING: the spending gate refuses the call before it is made and logs an
 * error (aiSpendLimit.ts aiSpendGate). If a response comes back naming a model the table lacks, it is counted at the
 * dearest rates in the table and an error is logged, so a surprise never makes a call look cheap.
 *
 * OVERRIDES: AI_PRICE_INPUT_PER_M and AI_PRICE_OUTPUT_PER_M, when set to a positive number, replace the short-context
 * input and output rates for every model. Cached-input and long-context rates always come from the table.
 *
 * To add a model: add its row here with the rates from OpenAI's pricing page, and say where they came from.
 */

export type ModelPrice = {
  /** Input tokens not read from the cache. */
  input: number;
  /** Input tokens read from the cache. */
  cachedInput: number;
  output: number;
  /** Rates for a call whose input is over LONG_CONTEXT_TOKENS; absent when unknown (such a call is refused). */
  longContext?: { input: number; cachedInput: number; output: number };
};

/** A call with more input tokens than this is priced at the long-context rates. */
export const LONG_CONTEXT_TOKENS = 272_000;

/**
 * The table. gpt-6.1-sol: all rates from the site owner (10 Nov 2026). The other four: the owner's short-context input
 * and output rates (10 Nov 2026); their cached-input rate was not given, so it is the full input rate (never cheaper
 * than the truth), and they have no long-context rate (a call over 272K input tokens to them is refused).
 */
export const PRICE_TABLE: Readonly<Record<string, ModelPrice>> = {
  "gpt-6.1-sol": { input: 2, cachedInput: 0.1, output: 10, longContext: { input: 4, cachedInput: 0.2, output: 15 } },
  "gpt-6.1-terra": { input: 1, cachedInput: 1, output: 5 },
  "gpt-6-astra": { input: 10, cachedInput: 10, output: 50 },
  "gpt-6-luna": { input: 0.1, cachedInput: 0.1, output: 0.5 },
  "gpt-5.5": { input: 5, cachedInput: 5, output: 30 },
};

type Env = Record<string, string | undefined>;

/** The table's key for a model name, or null when the table has no such model. A dated snapshot maps to its model. */
export function priceKey(model: unknown): string | null {
  if (typeof model !== "string") return null;
  const name = model.trim().toLowerCase();
  if (!name) return null;
  if (PRICE_TABLE[name]) return name;
  const undated = name.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  return PRICE_TABLE[undated] ? undated : null;
}

/** The dearest rates in the table (for a response naming a model the table lacks). */
export function dearestPrice(): ModelPrice {
  return Object.values(PRICE_TABLE).reduce((dearest, price) => (price.output > dearest.output ? price : dearest));
}

function override(env: Env, name: string): number | null {
  const value = Number(env[name]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** A model's rates with the overrides applied, or null when the model is not in the table. */
export function priceFor(model: unknown, env: Env = {}): ModelPrice | null {
  const key = priceKey(model);
  if (!key) return null;
  return withOverrides(PRICE_TABLE[key], env);
}

export function withOverrides(price: ModelPrice, env: Env): ModelPrice {
  return { ...price, input: override(env, "AI_PRICE_INPUT_PER_M") ?? price.input, output: override(env, "AI_PRICE_OUTPUT_PER_M") ?? price.output };
}

export type TokenCounts = { input: number; cached: number; output: number };

/** The token counts on a response's `usage` (chat completions, responses and embeddings shapes). */
export function tokenCounts(response: unknown): TokenCounts | null {
  const usage = (response as { usage?: Record<string, unknown> } | null)?.usage;
  if (!usage) return null;
  const n = (value: unknown) => (typeof value === "number" && value > 0 ? value : 0);
  const details = (usage.prompt_tokens_details ?? usage.input_tokens_details ?? {}) as Record<string, unknown>;
  const input = n(usage.prompt_tokens ?? usage.input_tokens);
  return { input, cached: Math.min(n(details.cached_tokens), input), output: n(usage.completion_tokens ?? usage.output_tokens) };
}

/** Dollars for these counts at this price (the long-context rates when input is over 272K and the model has them). */
export function costUsd(price: ModelPrice, counts: TokenCounts): number {
  const rates = counts.input > LONG_CONTEXT_TOKENS && price.longContext ? price.longContext : price;
  return ((counts.input - counts.cached) * rates.input + counts.cached * rates.cachedInput + counts.output * rates.output) / 1_000_000;
}

/**
 * A generous count of the input tokens a request could use, from its length (about 3 characters a token, fewer than
 * English usually takes, so it errs high). Used only to refuse, before the call, a long request to a model with no
 * long-context rate.
 */
export function inputTokensAtMost(body: unknown): number {
  try {
    return Math.ceil(JSON.stringify(body ?? "").length / 3);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
