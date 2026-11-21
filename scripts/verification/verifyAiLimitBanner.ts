/**
 * THE AI-LIMIT BANNER SAYS WHICH LIMIT AND WHEN HELP IS BACK, AND LASTS ONLY AS LONG AS THAT LIMIT (site owner,
 * 11 Nov 2026: production's first refusal was a person's HOURLY limit, and the banner said "back tomorrow" until
 * midnight, long after help was back).
 *
 * Checks (aiSpendLimit.ts, limitWords.ts, AiLimitNotice.tsx), no network:
 *   1. an hourly refusal's words say the hour's limit and the time help is back, never "tomorrow"; a daily refusal
 *      keeps the owner's words ("back tomorrow");
 *   2. the mark a refusal leaves (the cs_ai_limit cookie) names the kind of limit and ends when that limit ends: the
 *      next clock hour for the hourly limit, the next Toronto midnight for a daily one; its max-age agrees;
 *   3. the banner shows the mark's own words while it lasts, and nothing once its time has passed;
 *   4. a later call that succeeds clears the mark, so the banner goes at once;
 *   5. the limit numbers are not changed here (the defaults stay 4 / 1.50 / 6 / 10).
 *
 * WHAT FAILURE THIS CATCHES: a banner that says "tomorrow" for an hour's limit, or stays after help is back.
 *
 * Run: npm run test:ai-limit-banner
 */
export {};

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

async function main() {
  const limit = (await import("../../src/lib/security/aiSpendLimit")) as Record<string, unknown>;
  const words = (await import("../../src/lib/security/limitWords")) as Record<string, unknown>;
  const has = (name: string, from: Record<string, unknown>) => typeof from[name] === "function";
  check("setup: limitMark, limitNoticeWords and limitWordsFor exist", has("limitMark", words) && has("limitNoticeWords", words) && has("limitWordsFor", words));
  check("setup: the gate's cookie jar can be stood in for (setLimitCookieJarForTests)", has("setLimitCookieJarForTests", limit));
  if (failures) return finish();

  const limitMark = words.limitMark as (kind: string, now: number) => { value: string; maxAge: number; until: number };
  const limitNoticeWords = words.limitNoticeWords as (cookies: string, now: number) => string | null;
  const limitWordsFor = words.limitWordsFor as (kind: string, now: number) => string;
  const AI_LIMIT_WORDS = words.AI_LIMIT_WORDS as string;

  // 3:20 p.m. Toronto on 11 Nov 2026 (EST, UTC-5) = 20:20 UTC.
  const now = Date.UTC(2026, 10, 11, 20, 20);
  const hourly = limitWordsFor("user-hourly", now);
  check("1. an hourly refusal names the hour's limit and the time help is back", /this hour/i.test(hourly) && /4 p\.m\./.test(hourly), hourly);
  check("1. an hourly refusal never says tomorrow", !/tomorrow/i.test(hourly), hourly);
  for (const kind of ["user-daily", "ip-daily", "site-daily"]) check(`1. a ${kind} refusal keeps the owner's words`, limitWordsFor(kind, now) === AI_LIMIT_WORDS, limitWordsFor(kind, now));

  const markHour = limitMark("user-hourly", now);
  check("2. the hourly mark names its kind", markHour.value.startsWith("user-hourly"), markHour.value);
  check("2. the hourly mark ends at the next clock hour (40 minutes here)", markHour.until === Date.UTC(2026, 10, 11, 21, 0) && markHour.maxAge === 40 * 60, `${new Date(markHour.until).toISOString()} max-age ${markHour.maxAge}`);
  const markDay = limitMark("user-daily", now);
  check("2. a daily mark ends at the next Toronto midnight (05:00 UTC)", markDay.until === Date.UTC(2026, 10, 12, 5, 0) && markDay.maxAge === (markDay.until - now) / 1000, `${new Date(markDay.until).toISOString()} max-age ${markDay.maxAge}`);

  const jar = `other=1; cs_ai_limit=${encodeURIComponent(markHour.value)}`;
  check("3. while the hour lasts the banner says the hour's words", limitNoticeWords(jar, now + 10 * 60_000) === hourly, String(limitNoticeWords(jar, now + 10 * 60_000)));
  check("3. after the hour the banner shows nothing", limitNoticeWords(jar, markHour.until + 1) === null, String(limitNoticeWords(jar, markHour.until + 1)));
  check("3. no mark, no banner", limitNoticeWords("other=1", now) === null);
  check("3. an old mark (only a day, the earlier format) shows nothing", limitNoticeWords("cs_ai_limit=2026-11-11", now) === null);

  // 4. The gate: a refusal sets the mark, a later success clears it.
  const setJar = limit.setLimitCookieJarForTests as (jar: { set(name: string, value: string, options: { maxAge: number }): void; delete(name: string): void; has(name: string): boolean } | null) => void;
  const resetSpendMemory = limit.resetSpendMemory as () => void;
  const setSpendStoreForTests = limit.setSpendStoreForTests as (store: null) => void;
  const withAiAskerForTests = limit.withAiAskerForTests as <T>(asker: Record<string, unknown>, work: () => Promise<T>) => Promise<T>;
  const aiSpendGate = limit.aiSpendGate as <T>(call: () => Promise<T>, deps: { env?: Record<string, string>; now?: number; body?: unknown }) => Promise<T>;
  const store = new Map<string, string>();
  setJar({ set: (name, value) => store.set(name, value), delete: (name) => store.delete(name), has: (name) => store.has(name) });
  resetSpendMemory();
  setSpendStoreForTests(null);
  const env = { AI_USER_HOURLY_USD: "0.01", AI_RATE_LIMITS: "local" };
  const response = { model: "gpt-5.5", usage: { input_tokens: 4000, output_tokens: 1000 } };
  const call = () => aiSpendGate(async () => response, { env, now, body: { model: "gpt-5.5" } });
  const asker = { userId: "user-a", visitor: "v-a", harness: false, inRequest: true };
  await withAiAskerForTests(asker, call).catch(() => {});
  await withAiAskerForTests(asker, call).catch(() => {});
  check("4. a refusal leaves the hourly mark", (store.get("cs_ai_limit") ?? "").startsWith("user-hourly"), JSON.stringify([...store]));
  // An hour later the same person's call succeeds: the mark goes.
  await withAiAskerForTests(asker, () => aiSpendGate(async () => response, { env, now: now + 61 * 60_000, body: { model: "gpt-5.5" } })).catch(() => {});
  check("4. a later call that succeeds clears the mark", !store.has("cs_ai_limit"), JSON.stringify([...store]));
  setJar(null);

  const spendLimits = limit.spendLimits as (env: Record<string, string>) => Record<string, number>;
  check("5. the limit numbers are unchanged", JSON.stringify(spendLimits({})) === JSON.stringify({ "user-daily": 4, "user-hourly": 1.5, "ip-daily": 6, "site-daily": 10 }), JSON.stringify(spendLimits({})));
  finish();
}
function finish() {
  console.log(failures ? `\n${failures} check(s) failed.` : "\nThe AI-limit banner: all checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
