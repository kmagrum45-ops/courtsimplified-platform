/**
 * THE SPEED A BROWSER TEST RUNS AT: instant, or the live site's real speed.
 *
 * Every flow runs both ways in CI (site owner, 2026-10-26). Instant is how the stubs answer:
 * at once. Real speed (BROWSER_SPEED=slow) holds each court's analysis for 20 seconds and every
 * account and database call for 1.5 seconds, as the live site takes them.
 *
 * Why: case 11 (live re-test, 26 Oct). After the notice's Continue the next step was being worked
 * out, but out of sight, with "Show my next step" still pressable; every instant test passed,
 * because the stubbed analysis answered before anyone could see the wait.
 *
 * Where the hold goes: holdRealTraffic (called by grantSiteAccess, which every spec reaches
 * directly or through its driver) holds each analysis and account call once, whoever answers it:
 * a stub registered before it (its own hold runs first, then falls back to the stub), a stub
 * registered after it (page.route is wrapped for this page, so the stub's handler holds first),
 * or the real server. A test at real speed gets three times its time limit; a wait the test
 * itself asserts keeps its own limit, so a screen that is only right when answers come at once
 * fails here, as it would for a person.
 *
 * Run one area at real speed locally: BROWSER_SPEED=slow npm run test:story-pack
 */
import { test, type Page } from "@playwright/test";

export type Speed = "instant" | "slow";
export const SPEED: Speed = process.env.BROWSER_SPEED === "slow" ? "slow" : "instant";

/** How long the live site takes: a court's analysis, and one account or database call. */
export const SLOW_ANALYSIS_MS = 20_000;
export const SLOW_ACCOUNT_MS = 1_500;

/** The routes that work out a case (each court's analysis). */
export const ANALYSIS_ROUTES = ["**/api/small-claims/analyze", "**/api/civil/analyze", "**/api/family/analyze"] as const;
/** The account and database calls (Supabase auth and rows). */
export const ACCOUNT_ROUTES = ["**/auth/v1/**", "**/rest/v1/**"] as const;

const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const ANALYSIS_URL = /\/api\/(?:small-claims|civil|family)\/analyze(?:\?|$)/;
const ACCOUNT_URL = /\/(?:auth|rest)\/v1\//;
/** Each request is held once, however many handlers it passes through. */
const held = new WeakSet<object>();
async function holdOnce(request: object & { url(): string }): Promise<void> {
  if (held.has(request)) return;
  const url = request.url();
  const ms = ANALYSIS_URL.test(url) ? SLOW_ANALYSIS_MS : ACCOUNT_URL.test(url) ? SLOW_ACCOUNT_MS : 0;
  if (!ms) return;
  held.add(request);
  await pause(ms);
}
const wrapped = new WeakSet<Page>();

/** At real speed: every analysis and account call this page makes is held once, and the test gets three times its time limit. */
export async function holdRealTraffic(page: Page): Promise<void> {
  if (SPEED !== "slow" || wrapped.has(page)) return;
  wrapped.add(page);
  for (const pattern of [...ANALYSIS_ROUTES, ...ACCOUNT_ROUTES]) await page.route(pattern, async (route) => { await holdOnce(route.request()); await route.fallback(); });
  // Every route this page registers from now on holds first (the stub that answers is the last one registered).
  const route = page.route.bind(page);
  page.route = ((url: Parameters<Page["route"]>[0], handler: Parameters<Page["route"]>[1], options?: Parameters<Page["route"]>[2]) =>
    route(url, async (incoming, request) => { await holdOnce(request); return handler(incoming, request); }, options)) as Page["route"];
  const info = test.info();
  if (info.timeout > 0) info.setTimeout(info.timeout * 3);
}
