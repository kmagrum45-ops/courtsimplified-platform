#!/usr/bin/env node
/**
 * Whether the OpenAI account can make a call right now, for CI's one billed
 * suite (2026-10-08).
 *
 * WHY. With the account's balance empty, every pull request that touched
 * code the safety regression runs failed its build -- not because anything
 * was wrong, but because no call could be made -- and nothing could reach
 * the live site. This makes one tiny call (one output token on the cheapest
 * model, a fraction of a cent) and prints `credit=no` only when OpenAI
 * answers that the quota is used up. CI then skips the billed suite with a
 * warning and records NO pass, so the suite runs again on the next build once
 * there is credit: an unpaid account delays the check, it never waives it.
 *
 * Any other answer (success, an outage, a bad key) prints `credit=yes`, and
 * the suite runs and reports whatever is wrong, exactly as before.
 *
 * Prints `credit=yes|no` (for $GITHUB_OUTPUT). Never prints the key.
 */

const key = process.env.OPENAI_API_KEY ?? "";

export function quotaExhausted(status, body) {
  if (status !== 429) return false;
  const code = body?.error?.code ?? body?.error?.type ?? "";
  return /insufficient_quota|billing/.test(String(code));
}

async function main() {
  if (!key) {
    console.log("credit=yes");
    return;
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1, store: false, messages: [{ role: "user", content: "ok" }] }),
    });
    const body = await response.json().catch(() => ({}));
    console.log(quotaExhausted(response.status, body) ? "credit=no" : "credit=yes");
  } catch {
    console.log("credit=yes");
  }
}

if (process.argv[1] && process.argv[1].endsWith("openaiCredit.mjs")) await main();
