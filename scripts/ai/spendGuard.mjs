#!/usr/bin/env node
/**
 * Daily OpenAI spend check, run before every AI test (2026-10-08).
 *
 * WHY. October's OpenAI spend reached about $396 against a $100 budget, almost
 * all from automated testing. Every workflow that makes billed AI calls runs
 * this first; it stops the run when today's spend (Toronto time) is already
 * above the limit.
 *
 *   node scripts/ai/spendGuard.mjs            # limit $15, or AI_DAILY_SPEND_LIMIT
 *
 * HOW. Today's cost comes from OpenAI's Costs API, which needs an ADMIN key
 * (OPENAI_ADMIN_KEY: platform.openai.com -> Settings -> Admin keys); the
 * ordinary API key cannot read costs. The key is read from the environment,
 * sent only to api.openai.com, and never printed.
 *
 * FAILS CLOSED. With no admin key, or when the Costs API cannot be read, the
 * run is stopped: a check that cannot see the spend must not wave a run
 * through. OpenAI's cost figures can lag by some hours, so the limit is a
 * brake, not an exact meter.
 *
 * Imports nothing outside Node, so it runs before `npm ci`.
 */

const limit = Number(process.env.AI_DAILY_SPEND_LIMIT || 15);
const key = process.env.OPENAI_ADMIN_KEY;

function stop(message) {
  console.log(`::error title=AI test run stopped::${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    import("node:fs").then(({ appendFileSync }) => appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**AI test run stopped.** ${message}\n`));
  }
  process.exitCode = 1;
}

/** Midnight today in Toronto, as Unix seconds. */
export function torontoMidnight(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offsetMs = asIfUtc - Math.floor(now.getTime() / 1000) * 1000;
  return Math.floor((Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offsetMs) / 1000);
}

/** Sum of every cost result in a Costs API page (asked for from Toronto midnight on). */
export function sumCosts(page) {
  let total = 0;
  for (const bucket of page?.data ?? []) {
    for (const result of bucket.results ?? []) total += Number(result?.amount?.value ?? 0);
  }
  return total;
}

async function main() {
  if (!Number.isFinite(limit) || limit <= 0) return stop("AI_DAILY_SPEND_LIMIT is not a positive number.");
  if (!key) {
    return stop(
      "OPENAI_ADMIN_KEY is not set, so today's OpenAI spend cannot be checked. Add an OpenAI admin key as the repository secret OPENAI_ADMIN_KEY.",
    );
  }
  const since = torontoMidnight();
  let page;
  try {
    const response = await fetch(`https://api.openai.com/v1/organization/costs?start_time=${since}&bucket_width=1d&limit=2`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return stop(`The OpenAI Costs API answered ${response.status}; today's spend could not be read.`);
    page = await response.json();
  } catch (error) {
    return stop(`The OpenAI Costs API could not be reached (${error?.name ?? "error"}).`);
  }
  const spent = sumCosts(page);
  const line = `Today's OpenAI spend so far: $${spent.toFixed(2)} (limit $${limit.toFixed(2)}).`;
  if (spent > limit) return stop(`${line} AI test runs are stopped for today.`);
  console.log(`::notice title=OpenAI spend::${line}`);
}

if (process.argv[1]?.endsWith("spendGuard.mjs")) await main();
