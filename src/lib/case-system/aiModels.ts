/**
 * Which OpenAI model each AI task uses — the single place that decides.
 *
 * WHY THIS EXISTS. Until 2026-09-29 every call site named `gpt-4o-mini`
 * directly: ten hard-coded strings in seven files, plus two env vars that only
 * two of those sites read. Upgrading the model meant finding and editing all of
 * them, and missing one meant part of the pipeline silently stayed on the old
 * model. Now every call site asks this file for its parameters by TIER, and the
 * model is changed here or by environment variable, without touching call
 * sites.
 *
 * THE TWO TIERS.
 *
 *   deep     — work where reasoning quality is the point: the final case
 *              analysis, case review, court-path and claim-type classification,
 *              and stage resolution. Default: gpt-6.1-sol at `medium` effort.
 *
 *   standard — work that must also be quick because the user is waiting on it
 *              turn by turn: the safety pass, intake fact extraction, answer
 *              proposals from the story, and library chat selection.
 *              Default: gpt-6.1-sol at `low` effort.
 *
 * Both tiers use the same model on purpose. The difference between them is how
 * long the model thinks, not which model it is — so a fact extracted during
 * intake and the analysis built on it come from the same model.
 *
 * CHANGING IT. Set any of these in `.env.local` or in Vercel:
 *
 *   AI_MODEL_DEEP        AI_EFFORT_DEEP        (none | low | medium | high | xhigh)
 *   AI_MODEL_STANDARD    AI_EFFORT_STANDARD
 *
 * The older `COURTSIMPLIFIED_REASONING_MODEL` and
 * `COURTSIMPLIFIED_CLASSIFIER_MODEL` are NO LONGER READ (removed 2026-09-29).
 * They overrode the tier default at two sites, so a leftover value in Vercel
 * would silently have kept those sites on an old model. A leftover value is
 * now harmless. `test:ai-models` fails if anything reads them again.
 *
 * REASONING MODELS TAKE DIFFERENT PARAMETERS. The gpt-5.x / gpt-6.x models
 * think before answering. `modelParams` translates each call's request for the
 * older models' knobs into what the chosen model accepts:
 *
 *   - `temperature` is sent only when reasoning is off (`none`). With reasoning
 *     on, the model's own sampling is what the reasoning was tuned for.
 *   - A token cap becomes `max_completion_tokens` PLUS headroom for reasoning.
 *     Reasoning tokens count against that cap, so the court-path classifier's
 *     old `max_tokens: 200` would have been spent entirely on thinking and
 *     returned an empty answer.
 *   - An older non-reasoning model (gpt-4o, gpt-4.1…) still gets exactly the
 *     parameters it always got, so setting AI_MODEL_* back to gpt-4o-mini is a
 *     clean rollback.
 *
 * This file imports nothing, so it can be checked without the app's
 * dependencies installed: scripts/verification/verifyAiModels.ts.
 */

export type AiTier = "deep" | "standard";

/** The effort values both the SDK type and the gpt-6.x models accept. */
export type AiEffort = "none" | "low" | "medium" | "high" | "xhigh";

const EFFORTS: readonly AiEffort[] = ["none", "low", "medium", "high", "xhigh"];

export const TIER_DEFAULTS: Readonly<Record<AiTier, { model: string; effort: AiEffort }>> = {
  deep: { model: "gpt-6.1-sol", effort: "medium" },
  standard: { model: "gpt-6.1-sol", effort: "low" },
};

const ENV_NAMES: Readonly<Record<AiTier, { model: string; effort: string }>> = {
  deep: { model: "AI_MODEL_DEEP", effort: "AI_EFFORT_DEEP" },
  standard: { model: "AI_MODEL_STANDARD", effort: "AI_EFFORT_STANDARD" },
};

/**
 * Extra output tokens allowed for thinking when a call carries a cap. Only
 * applied to calls that set a cap at all — an uncapped call stays uncapped.
 */
const REASONING_HEADROOM: Readonly<Record<AiEffort, number>> = {
  none: 0,
  low: 2_000,
  medium: 6_000,
  high: 16_000,
  xhigh: 32_000,
};

/**
 * True for the pre-reasoning chat models. They take `temperature` and never
 * `reasoning_effort`. Anything not matched here is treated as a reasoning
 * model, which is the direction every new OpenAI model has gone.
 */
export function isLegacyChatModel(model: string): boolean {
  return /^(gpt-3\.5|gpt-4(?!\.5)|gpt-4o|gpt-4\.1|chatgpt-4o)/i.test(model.trim());
}

/** False for models that always reason and reject `reasoning_effort: "none"`. */
export function supportsNoReasoning(model: string): boolean {
  return !/^gpt-6(?:\.\d+)?-astra|^gpt-6\.1-sol/i.test(model.trim());
}

function readEnv(name: string): string | undefined {
  const value = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return value && value.trim() ? value.trim() : undefined;
}

function isEffort(value: unknown): value is AiEffort {
  return typeof value === "string" && (EFFORTS as readonly string[]).includes(value);
}

/**
 * The model and effort a tier resolves to right now. `modelOverride` is for a
 * caller that was explicitly handed a model (an eval passing one, or one of the
 * two legacy env vars) — an explicit choice beats the tier default.
 */
export function resolveTier(
  tier: AiTier,
  modelOverride?: string,
  effortOverride?: string,
): { model: string; effort: AiEffort } {
  const defaults = TIER_DEFAULTS[tier];
  const names = ENV_NAMES[tier];
  const model = (modelOverride && modelOverride.trim()) || readEnv(names.model) || defaults.model;
  const envEffort = readEnv(names.effort);
  const effort = isEffort(effortOverride)
    ? effortOverride
    : isEffort(envEffort)
      ? envEffort
      : defaults.effort;
  return { model, effort };
}

export type ModelParamOptions = {
  /** Explicit model for this call; wins over env and default. */
  model?: string;
  /**
   * Explicit effort for this call; wins over the tier's env var and default.
   * For a single call site whose speed matters differently from the rest of
   * its tier (see the final analysis in courtSimplifiedBrain.ts). An invalid
   * value is ignored, falling back to the tier.
   */
  effort?: string;
  /** What the call used with the old models. Kept for legacy models and `none`. */
  temperature?: number;
  seed?: number;
  /** The answer's own size cap. Reasoning headroom is added on top. */
  maxOutputTokens?: number;
};

export type ChatModelParams = {
  model: string;
  reasoning_effort?: AiEffort;
  temperature?: number;
  seed?: number;
  max_completion_tokens?: number;
};

/**
 * The model parameters for one Chat Completions call. Spread it into the
 * request in place of `model` / `temperature` / `max_tokens`:
 *
 *     client.chat.completions.create({
 *       ...modelParams("deep", { temperature: 0 }),
 *       response_format: { type: "json_object" },
 *       messages,
 *     });
 */
export function modelParams(tier: AiTier, options: ModelParamOptions = {}): ChatModelParams {
  const { model, effort } = resolveTier(tier, options.model, options.effort);
  const params: ChatModelParams = { model };

  if (options.seed !== undefined) params.seed = options.seed;

  if (isLegacyChatModel(model)) {
    if (options.temperature !== undefined) params.temperature = options.temperature;
    if (options.maxOutputTokens !== undefined) params.max_completion_tokens = options.maxOutputTokens;
    return params;
  }

  // Measured 2026-09-29: gpt-6.1-sol rejects "none" outright (a 400 that the
  // fallback deliberately does not paper over), and OpenAI's model pages list
  // no "none" for gpt-6-astra either. Setting AI_EFFORT_*=none against them
  // would break every call, so it becomes the lowest effort they accept.
  params.reasoning_effort = effort === "none" && !supportsNoReasoning(model) ? "low" : effort;
  if (params.reasoning_effort === "none" && options.temperature !== undefined) {
    params.temperature = options.temperature;
  }
  if (options.maxOutputTokens !== undefined) {
    params.max_completion_tokens = options.maxOutputTokens + REASONING_HEADROOM[params.reasoning_effort];
  }
  return params;
}

/**
 * Sampling parameters that can be dropped without changing what the request
 * asks for. If a model rejects one of these, the call is retried once without
 * it. `reasoning_effort`, `response_format` and the like are deliberately NOT
 * here: a model rejecting those is a configuration error that should surface,
 * not be papered over.
 */
// prompt_cache_options (2026-10-08): sent to stop implicit cache writes
// (openaiClient.ts withoutCacheWrites); dropped if a model does not know it.
export const DROPPABLE_PARAMS: readonly string[] = ["temperature", "top_p", "seed", "prompt_cache_options"];

/**
 * Which droppable parameter an error says the model rejected, if any.
 *
 * OpenAI reports these as a 400 with `param` set and a message such as
 * "Unsupported parameter: 'temperature' …" or "Unsupported value:
 * 'temperature' does not support 0 with this model…". Both shapes are matched
 * because an error can reach here re-wrapped with only its message intact.
 */
export function rejectedDroppableParam(
  error: unknown,
  body: Record<string, unknown>,
): string | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  if (status !== undefined && status !== 400) return null;

  const param = (error as { param?: unknown }).param;
  if (typeof param === "string" && DROPPABLE_PARAMS.includes(param) && param in body) {
    return param;
  }

  const message = error instanceof Error ? error.message : String((error as { message?: unknown }).message ?? "");
  const match = /unsupported (?:parameter|value)[^']*'([a-z_]+)'/i.exec(message) ?? /unrecognized request argument supplied:\s*([a-z_]+)/i.exec(message);
  if (match && DROPPABLE_PARAMS.includes(match[1]) && match[1] in body) return match[1];
  return null;
}

/**
 * Runs `create(body)`; if the model rejects a droppable sampling parameter,
 * retries without it — at most once per parameter, so at most three extra
 * requests and only ever after a 400, which is not billed and does not count
 * against the daily request cap the way a 429 retry would.
 *
 * This exists because the exact parameter rules for each new model are only
 * fully known by calling it. A call that would otherwise fail outright and
 * fall back to deterministic output instead gets its answer.
 */
export async function createWithParamFallback<T>(
  create: (body: Record<string, unknown>) => Promise<T>,
  body: Record<string, unknown>,
  onDrop?: (param: string, model: unknown) => void,
): Promise<T> {
  let current = body;
  for (let attempt = 0; attempt <= DROPPABLE_PARAMS.length; attempt += 1) {
    try {
      return await create(current);
    } catch (error) {
      const param = rejectedDroppableParam(error, current);
      if (!param || attempt === DROPPABLE_PARAMS.length) throw error;
      onDrop?.(param, current.model);
      const rest = { ...current };
      delete rest[param];
      current = rest;
    }
  }
  // Unreachable: the loop either returns or throws.
  throw new Error("createWithParamFallback: exhausted without a result");
}
