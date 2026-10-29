/**
 * THE VERIFIED USER OF THIS REQUEST, FOR EVERY CAPABILITY CHECK MADE DURING IT
 * (site owner, 2026-10-29: "production defaults off, owner allowlist").
 *
 * On production an approval-tier or AI-advice feature is on only for a
 * signed-in user listed in A2I_TESTER_USER_IDS (capabilityAccess.ts). The
 * checks sit in library code several layers below the route (the analysis,
 * the safety pass, the deadline engine), so the route puts its user in scope
 * here and every check underneath reads it, at any depth -- the same pattern
 * as the AI call log's identity and the names labelled for the model.
 *
 * The user comes only from the bearer token (serverAuth.getAuthenticatedUser),
 * never from a request body. Off production the user changes nothing, so it is
 * not even looked up there (no extra Supabase call in previews or the suites).
 *
 * Wired in: the confirmed-guidance gate (intakeGuidanceGate.ts), withRequestNames
 * (requestNames.ts) and, for the remaining routes, capabilityRoute.
 * `npm run test:a2i-routes` fails when a route that reaches a capability check
 * has none of the three.
 *
 * Server only (AsyncLocalStorage).
 */
import { AsyncLocalStorage } from "node:async_hooks";

import { getAuthenticatedUser } from "../../supabase/serverAuth";
import { onProductionDeployment, registerRequestUserResolver } from "./capabilityAccess";

const STORE = Symbol.for("courtsimplified.capabilityRequestStore");
const holder = globalThis as unknown as { [STORE]?: AsyncLocalStorage<{ userId: string | null }> };
const store = (holder[STORE] ??= new AsyncLocalStorage<{ userId: string | null }>());
registerRequestUserResolver(() => store.getStore()?.userId ?? null);

/** Runs `work` with `userId` (already verified by the caller) as the request's user. */
export function withCapabilityUserId<T>(userId: string | null, work: () => Promise<T>): Promise<T> {
  return store.run({ userId }, work);
}

type Authenticate = (request: Request) => Promise<{ id: string } | null>;

/** Verifies the request's user (on production only) and runs `work` with it in scope. */
export async function withCapabilityUser<T>(
  request: Request,
  work: () => Promise<T>,
  authenticate: Authenticate = getAuthenticatedUser,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  const userId = onProductionDeployment(env) ? ((await authenticate(request).catch(() => null))?.id ?? null) : null;
  return withCapabilityUserId(userId, work);
}

/** A route handler with its verified user in scope for every capability check it makes. */
export function capabilityRoute<T extends Request, C extends unknown[]>(
  handler: (request: T, ...rest: C) => Promise<Response> | Response,
): (request: T, ...rest: C) => Promise<Response> {
  return (request: T, ...rest: C) => withCapabilityUser(request, async () => handler(request, ...rest));
}
