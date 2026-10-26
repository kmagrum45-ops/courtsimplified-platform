/**
 * THE NAMES OF THE CASE BEING WORKED ON, FOR THE AI CLIENT (site owner, 2026-10-25).
 *
 * An AI route that knows the case runs its work inside `withNameLabelsFor` (security/requestNames.ts). Every model call made
 * during that work goes through the one client (openaiClient.ts), which replaces each name
 * with its label in what is sent and puts the names back in what comes back (nameLabels.ts).
 * So no route, and no library function a route calls, has to remember to do it: the rule is a
 * property of the client, as store:false and the audit log are.
 *
 * Server only (AsyncLocalStorage keeps each request's names to that request).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { NameLabel } from "./nameLabels";

const names = new AsyncLocalStorage<readonly NameLabel[]>();

/** Runs `work` with these names labelled in every model call it makes. */
export function withNameLabelsFor<T>(labels: readonly NameLabel[], work: () => Promise<T>): Promise<T> {
  return labels.length ? names.run(labels, work) : work();
}

/** The names labelled for the model call being made now (none outside withNameLabelsFor). */
export function currentNameLabels(): readonly NameLabel[] {
  return names.getStore() ?? [];
}
