/**
 * THE SITE'S DAILY SPENDING LIMIT FOR AI HELP REFUSES CALLS BEFORE THEY ARE MADE (site owner, 10 Nov 2026).
 *
 * A fake OpenAI client (counts its calls, answers 1,000 input and 1,000 output tokens, $0.012 at the default prices) is
 * wrapped by the site's own client wrapper (openaiClient.ts forceNoStore), exactly as createOpenAIClient wraps the real
 * one, and asked as different people:
 *   1. a signed-in person over their day's limit: their next calls make 0 calls, and say the owner's words;
 *   2. a person's hourly burst limit inside the day;
 *   3. one address with several accounts shares one address limit (several accounts do not get several budgets);
 *   4. the site-wide day: guests and signed-in people together;
 *   5. the next Toronto day starts again (and the next hour, for the burst limit);
 *   6. the harness test accounts and terminal scripts are exempt only outside production; AI_RATE_LIMITS=off likewise;
 *   7. a second server instance's spend (the shared count) refuses here too.
 * Costs nothing: no network, no database, no AI.
 *
 * WHAT FAILURE THIS CATCHES: a signed-in person, or one person with several accounts, running up the OpenAI bill
 * without limit; or a test flag that lifts the limit on the live site.
 *
 * Run: npm run test:ai-spend-limit
 */
import { forceNoStore } from "../../src/lib/case-system/openaiClient";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const WORDS = "You've reached today's limit for AI help. Your case is saved. The rest of the site still works, and AI help is back tomorrow.";
const quietError = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0] ?? "").includes("[aiCallLog]")) quietError(...args); };

type Limit = typeof import("../../src/lib/security/aiSpendLimit");
// Loaded only if it exists, so this suite runs (and fails) on code that has no limit at all.
let limit: Limit | null = null;

function fakeClient() {
  const counter = { calls: 0 };
  const client = forceNoStore({
    chat: { completions: { create: async () => { counter.calls += 1; return { model: "fake", choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1000, completion_tokens: 1000 } }; } } },
  });
  return { counter, client: client as unknown as { chat: { completions: { create: (body: unknown) => Promise<unknown> } } } };
}

type Asker = { userId?: string | null; visitor?: string | null; harness?: boolean; inRequest?: boolean };
async function ask(client: ReturnType<typeof fakeClient>["client"], asker: Asker, times: number): Promise<{ refused: number; words: Set<string> }> {
  let refused = 0;
  const words = new Set<string>();
  for (let i = 0; i < times; i++) {
    const call = () => client.chat.completions.create({ model: "fake", messages: [{ role: "user", content: "hello" }] });
    try {
      if (limit) await limit.withAiAskerForTests(asker, call);
      else await call();
    } catch (error) {
      refused += 1;
      words.add(error instanceof Error ? error.message : String(error));
    }
  }
  return { refused, words };
}

const LIMIT_VARIABLES = ["AI_USER_DAILY_USD", "AI_USER_HOURLY_USD", "AI_IP_DAILY_USD", "AI_SITE_DAILY_USD", "AI_RATE_LIMITS", "VERCEL_ENV", "NEXT_PUBLIC_VERCEL_ENV", "AI_PRICE_INPUT_PER_M", "AI_PRICE_OUTPUT_PER_M", "AI_SPEND_CAP_USD"];
function scenario(env: Record<string, string>) {
  for (const name of LIMIT_VARIABLES) delete process.env[name];
  Object.assign(process.env, env);
  limit?.resetSpendMemory();
  limit?.setSpendStoreForTests(null);
}

async function main() {
limit = await import("../../src/lib/security/aiSpendLimit").catch(() => null);
check("the shared limiter exists (src/lib/security/aiSpendLimit.ts)", Boolean(limit));

// 1. A person's day: $0.03 allows three $0.012 calls (0, 0.012, 0.024 spent before each), then none.
scenario({ AI_USER_DAILY_USD: "0.03" });
{
  const { counter, client } = fakeClient();
  const result = await ask(client, { userId: "user-1", visitor: "visitor-1" }, 6);
  check("1. a person over their day's limit: their further calls make 0 calls (3 of 6 made)", counter.calls === 3, `calls made: ${counter.calls}`);
  check("1. a refused call says the owner's words", result.refused === 3 && result.words.size === 1 && result.words.has(WORDS), JSON.stringify([...result.words]));
  const other = await ask(client, { userId: "user-2", visitor: "visitor-2" }, 1);
  check("1. another person is not refused for the first person's spend", other.refused === 0 && counter.calls === 4, `calls: ${counter.calls}`);
}

// 2. A person's hourly burst: $0.02 an hour allows two calls in the hour.
scenario({ AI_USER_HOURLY_USD: "0.02" });
{
  const { counter, client } = fakeClient();
  await ask(client, { userId: "user-3", visitor: "visitor-3" }, 5);
  check("2. a person's hourly burst limit (2 of 5 made)", counter.calls === 2, `calls made: ${counter.calls}`);
}

// 3. One address, several accounts: $0.03 for the address across every account.
scenario({ AI_IP_DAILY_USD: "0.03" });
{
  const { counter, client } = fakeClient();
  for (const user of ["user-4", "user-5", "user-6", "user-7", "user-8"]) await ask(client, { userId: user, visitor: "shared-visitor" }, 1);
  check("3. one address with five accounts gets one address budget (3 of 5 made)", counter.calls === 3, `calls made: ${counter.calls}`);
  await ask(client, { userId: null, visitor: "shared-visitor" }, 1);
  check("3. a guest at that address is refused too", counter.calls === 3, `calls made: ${counter.calls}`);
}

// 4. The site's day: $0.03 for guests and signed-in people together.
scenario({ AI_SITE_DAILY_USD: "0.03" });
{
  const { counter, client } = fakeClient();
  await ask(client, { userId: null, visitor: "guest-a" }, 1);
  await ask(client, { userId: "user-9", visitor: "visitor-9" }, 1);
  await ask(client, { userId: null, visitor: "guest-b" }, 1);
  await ask(client, { userId: "user-10", visitor: "visitor-10" }, 2);
  check("4. the site-wide day covers guests and signed-in people together (3 of 5 made)", counter.calls === 3, `calls made: ${counter.calls}`);
}

// 5. The next Toronto day starts again; so does the next hour for the burst limit.
scenario({ AI_USER_DAILY_USD: "0.03" });
if (limit) {
  const asker = { inRequest: true, userId: "user-11", visitor: "visitor-11", harness: false };
  // 11:30 p.m. in Toronto on 9 Nov (04:30 UTC on 10 Nov), and 12:30 a.m. on 10 Nov in Toronto.
  const lateNight = Date.parse("2026-11-10T04:30:00Z");
  const afterMidnight = Date.parse("2026-11-10T05:30:00Z");
  const decision = await limit.checkAiSpend({ asker, now: lateNight });
  if (decision.allowed) await limit.recordAiSpend(decision.buckets, 0.05);
  const same = await limit.checkAiSpend({ asker, now: lateNight + 20 * 60_000 });
  const next = await limit.checkAiSpend({ asker, now: afterMidnight });
  check("5. spent at 11:30 p.m. Toronto: refused at 11:50 p.m.", !same.allowed);
  check("5. allowed again after midnight in Toronto (the next day)", next.allowed);
  scenario({ AI_USER_HOURLY_USD: "0.03" });
  const hourDecision = await limit.checkAiSpend({ asker, now: lateNight });
  if (hourDecision.allowed) await limit.recordAiSpend(hourDecision.buckets, 0.05);
  check("5. the burst limit: refused in the same hour, allowed in the next", !(await limit.checkAiSpend({ asker, now: lateNight + 10 * 60_000 })).allowed && (await limit.checkAiSpend({ asker, now: lateNight + 40 * 60_000 })).allowed);
} else check("5. the next day starts again", false, "no limiter");

// 6. Exemptions: only outside production.
scenario({ AI_SITE_DAILY_USD: "0.03" });
{
  const { counter, client } = fakeClient();
  await ask(client, { userId: "harness-1", visitor: "visitor-h", harness: true }, 5);
  check("6. a harness test account is exempt outside production (5 of 5 made)", counter.calls === 5, `calls made: ${counter.calls}`);
  await ask(client, { inRequest: false }, 5);
  check("6. a terminal script (no web request) is exempt outside production", counter.calls === 10, `calls made: ${counter.calls}`);
}
scenario({ AI_SITE_DAILY_USD: "0.03", VERCEL_ENV: "production" });
{
  const { counter, client } = fakeClient();
  await ask(client, { userId: "harness-2", visitor: "visitor-h2", harness: true }, 5);
  check("6. production never honours the harness flag (3 of 5 made)", counter.calls === 3, `calls made: ${counter.calls}`);
  scenario({ AI_SITE_DAILY_USD: "0.03", NEXT_PUBLIC_VERCEL_ENV: "production" });
  const second = fakeClient();
  await ask(second.client, { inRequest: false }, 5);
  check("6. on production a call outside a web request still counts against the site's day (3 of 5 made)", second.counter.calls === 3, `calls made: ${second.counter.calls}`);
}
scenario({ AI_USER_DAILY_USD: "0.03", AI_RATE_LIMITS: "off" });
{
  const { counter, client } = fakeClient();
  await ask(client, { userId: "user-12", visitor: "visitor-12" }, 5);
  check("6. AI_RATE_LIMITS=off lifts the limit outside production", counter.calls === 5, `calls made: ${counter.calls}`);
}
scenario({ AI_USER_DAILY_USD: "0.03", AI_RATE_LIMITS: "off", VERCEL_ENV: "production" });
{
  const { counter, client } = fakeClient();
  await ask(client, { userId: "user-13", visitor: "visitor-13" }, 5);
  check("6. AI_RATE_LIMITS=off is ignored on production", counter.calls === 3, `calls made: ${counter.calls}`);
}

// 7. The shared count: another instance has spent the person's day; this instance's memory is empty.
scenario({ AI_USER_DAILY_USD: "0.03" });
if (limit) {
  const spent: Record<string, number> = {};
  limit.setSpendStoreForTests({
    read: async (keys) => Object.fromEntries(keys.map((key) => [key, spent[key] ?? 0])),
    add: async (key, _hourly, micros) => { spent[key] = (spent[key] ?? 0) + micros; },
  });
  const { counter, client } = fakeClient();
  await ask(client, { userId: "user-14", visitor: "visitor-14" }, 3);
  limit.resetSpendMemory();
  await ask(client, { userId: "user-14", visitor: "visitor-14" }, 2);
  check("7. another instance's spend, in the shared count, refuses here (3 of 5 made)", counter.calls === 3, `calls made: ${counter.calls}`);
  limit.setSpendStoreForTests({ read: async () => null, add: async () => { throw new Error("down"); } });
  limit.resetSpendMemory();
  const down = fakeClient();
  await ask(down.client, { userId: "user-15", visitor: "visitor-15" }, 5);
  check("7. the shared count unreachable: the memory count still limits (never \"no limit\")", down.counter.calls === 3, `calls made: ${down.counter.calls}`);
} else check("7. the shared count", false, "no limiter");

// 8. The owner's limits (10 Nov 2026) when no variable is set, and each variable still overrides its own limit.
if (limit) {
  const defaults = limit.spendLimits({});
  const owner = { "user-daily": 4, "user-hourly": 1.5, "ip-daily": 6, "site-daily": 10 };
  check("8. with no variable set: $4 a day and $1.50 an hour a person, $6 a day an address, $10 a day the site", JSON.stringify(defaults) === JSON.stringify(owner), JSON.stringify(defaults));
  const set = limit.spendLimits({ AI_USER_DAILY_USD: "3", AI_USER_HOURLY_USD: "1", AI_IP_DAILY_USD: "5", AI_SITE_DAILY_USD: "12" });
  check("8. each variable sets its own limit", JSON.stringify(set) === JSON.stringify({ "user-daily": 3, "user-hourly": 1, "ip-daily": 5, "site-daily": 12 }), JSON.stringify(set));
  // The site's day is one row of the project's own ai_rate_limits table (each project has its own database).
  const buckets = limit.bucketsFor({ inRequest: true, userId: null, visitor: null, harness: false }, Date.UTC(2026, 10, 10, 17));
  check("8. the site's day is one bucket in the project's own count, never a per-server or per-instance one", buckets.length === 1 && buckets[0].kind === "site-daily" && /^\$s:\d{4}-\d{2}-\d{2}$/.test(buckets[0].key), JSON.stringify(buckets));
} else check("8. the owner's limits", false, "no limiter");

scenario({});
console.log(failures ? `\n${failures} check(s) failed.` : "\nThe daily limit for AI help refuses calls before they are made.");
process.exit(failures ? 1 : 0);
}
void main();
