/**
 * WHO MAY USE AN APPROVAL-TIER OR AI-ADVICE FEATURE, HERE AND NOW.
 *
 * *** THE DECISION (site owner, 2026-10-29: "production defaults off, owner allowlist") ***
 *
 * Until 2026-10-29 the owner's live-testing switch (a2iScope.ts OWNER_LIVE_TESTING)
 * and the code defaults of every AI-advice switch (phaseScope.ts) turned every
 * such feature on everywhere, production included, and Vercel Production sets
 * none of the switches' variables (checked 2026-10-29). So the live site offered
 * form completion, wording help, case-specific deadlines, answers to legal
 * questions, document analysis, strategy and the rest to anyone past the
 * password gate, none of it approved by the Law Society's A2I program.
 *
 * Now, on PRODUCTION (VERCEL_ENV or NEXT_PUBLIC_VERCEL_ENV is "production"):
 *   - every such feature is OFF for everyone,
 *   - EXCEPT for signed-in accounts whose Supabase user id is listed in the
 *     server-side variable A2I_TESTER_USER_IDS (comma-separated ids, never
 *     emails), who get exactly what staging gets.
 * Off production (previews, staging, local, the terminal suites) nothing
 * changes: each feature is what its own switch says, as before.
 *
 * FAILS CLOSED: no variable, an unparsable list (any entry that is not a user
 * id), no signed-in user, or a server code path that runs outside a request
 * that named its user -> off on production.
 *
 * *** WHERE THE USER COMES FROM ***
 *
 * Server: the route's own authenticated user (serverAuth.getAuthenticatedUser,
 * from the bearer token, never from a request body), put in scope for the whole
 * request by capabilityRequest.ts (the confirmed-guidance gate, withRequestNames
 * and capabilityRoute do it for every route). Library code reads it from there,
 * at any depth, without a parameter.
 *
 * Browser: never decided here. The browser cannot see A2I_TESTER_USER_IDS or
 * the user's verified id, so it uses the answer the server gave
 * (/api/capabilities, held by CapabilityProvider) and, before that arrives, the
 * anonymous answer the server rendered into the page. With neither: off.
 *
 * This file is the bottom layer: it imports nothing of the site's, so a2iScope,
 * phaseScope and aiAnalysis can all use it without an import cycle. The full
 * list of capabilities and `capabilityOn` live in capabilities.ts.
 *
 * Asserted by `npm run test:a2i-scope` and `npm run test:a2i-routes`.
 */

export type CapabilityEnv = Record<string, string | undefined>;

export type CapabilityContext = {
  /** Defaults to process.env. */
  env?: CapabilityEnv;
  /**
   * The verified user asking. `undefined` = use the user the enclosing request
   * named (capabilityRequest.ts); `null` = nobody signed in.
   */
  userId?: string | null;
};

/** The server-side variable listing the testers. Never a NEXT_PUBLIC_ variable. */
export const TESTER_ENV_VAR = "A2I_TESTER_USER_IDS";

/**
 * Capabilities the owner has opened to EVERYONE on production. Empty: adding a
 * key here is a regulatory decision (A2I approval, or the owner's recorded
 * decision), made in the same commit that records it.
 */
export const OPEN_TO_EVERYONE_ON_PRODUCTION: readonly string[] = [];

export function isProductionDeployment(env: CapabilityEnv): boolean {
  return env.VERCEL_ENV === "production" || env.NEXT_PUBLIC_VERCEL_ENV === "production";
}

/**
 * Whether to treat this as production, for every decision that turns something
 * on. The deployment's own environment always counts, whatever env a caller
 * passed: a caller handing in a partial record (one switch variable, say) must
 * never get the preview answer on the live site. The passed env counts too, so
 * a check can simulate production. (Review of PR #513, 2026-10-29.)
 */
export function onProductionDeployment(env: CapabilityEnv = {}): boolean {
  const own = typeof process !== "undefined" && process.env ? isProductionDeployment(process.env) : false;
  return own || isProductionDeployment(env);
}

/**
 * The tester list in force: the passed env's when it names one, else the
 * deployment's own. So a partial env neither hides the listed testers nor
 * invents any.
 */
function testerEnv(env: CapabilityEnv): CapabilityEnv {
  if (env[TESTER_ENV_VAR] !== undefined) return env;
  return typeof process !== "undefined" && process.env ? process.env : env;
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The listed tester ids. Empty when the variable is unset or blank, and empty
 * when ANY entry is not a user id: a list someone mistyped is not guessed at.
 */
export function testerIds(env: CapabilityEnv): ReadonlySet<string> {
  const raw = env[TESTER_ENV_VAR];
  if (typeof raw !== "string" || !raw.trim()) return new Set();
  const entries = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!entries.length || entries.some((entry) => !USER_ID.test(entry))) return new Set();
  return new Set(entries.map((entry) => entry.toLowerCase()));
}

export function isListedTester(env: CapabilityEnv, userId: string | null | undefined): boolean {
  if (!userId || !USER_ID.test(userId)) return false;
  return testerIds(env).has(userId.toLowerCase());
}

// ---------------------------------------------------------------------------
// The request's user (server) and the server's answer (browser), shared through
// globalThis so a second copy of this module in another bundle sees the same.
// ---------------------------------------------------------------------------

const RESOLVER = Symbol.for("courtsimplified.capabilityRequestUser");
const CLIENT_SET = Symbol.for("courtsimplified.clientCapabilities");
type Holder = { [RESOLVER]?: () => string | null | undefined; [CLIENT_SET]?: Readonly<Record<string, boolean>> | null };
const holder = globalThis as unknown as Holder;

/** Called once by capabilityRequest.ts (server only). */
export function registerRequestUserResolver(resolver: () => string | null | undefined): void {
  holder[RESOLVER] = resolver;
}

/** The verified user of the enclosing request, or null (none named, or not on the server). */
export function requestUserId(): string | null {
  try {
    return holder[RESOLVER]?.() ?? null;
  } catch {
    return null;
  }
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** The browser's copy of the server's answer (CapabilityProvider). */
export function setClientCapabilities(set: Readonly<Record<string, boolean>> | null): void {
  holder[CLIENT_SET] = set;
}

export function clientCapabilities(): Readonly<Record<string, boolean>> | null {
  return holder[CLIENT_SET] ?? null;
}

/**
 * THE ONE DECISION. `baseOn` is what the feature's own switch says (today's
 * behaviour); this adds who may have it on production. Every approval-tier
 * capability and AI-advice switch goes through here (a2iScope.isInScope, the
 * phaseScope switches, aiAnalysis.documentAnalysisEnabled), so there is no
 * second place to forget.
 */
export function capabilityAllowed(key: string, baseOn: boolean, context: CapabilityContext = {}): boolean {
  // The browser never decides: it holds the server's answer, or nothing (off).
  if (isBrowser()) return clientCapabilities()?.[key] === true;
  if (!baseOn) return false;
  const env = context.env ?? (typeof process !== "undefined" ? process.env : {});
  if (!onProductionDeployment(env)) return true;
  if (OPEN_TO_EVERYONE_ON_PRODUCTION.includes(key)) return true;
  const userId = context.userId !== undefined ? context.userId : requestUserId();
  return isListedTester(testerEnv(env), userId);
}

