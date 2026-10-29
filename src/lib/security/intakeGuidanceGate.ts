/** HTTP enforcement of the Phase 3 confirmation proof, before work and before delivery. */
import { NextResponse } from "next/server";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../supabase/serverAuth";
import { confirmedIntakeRevision, guidanceIsCurrent } from "../case-system/intakeReview";
import { withNameLabelsFor } from "../case-system/privacy/modelNameContext";
import { withCapabilityUserId } from "../case-system/policy/capabilityRequest";
import { bodyNameLabels, mergeNameLabels, savedCaseNameLabels } from "./requestNames";

type Owned = { id: string; court_path: string | null; master_result: unknown };
type Identity = { id: string };
type Dependencies = {
  authenticate: (request: Request) => Promise<Identity | null>;
  owned: (request: Request, user: Identity, id: string) => Promise<Owned | null>;
  /** The saved case's intake, for the names every model call in the route labels. */
  names: (request: Request, user: Identity, id: string) => Promise<Owned | null>;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const refusal = (error: string, status: number) => NextResponse.json({ ok: false, error, code: "INTAKE_CONFIRMATION_REQUIRED" }, { status, headers: { "Cache-Control": "private, no-store" } });

export function withConfirmedGuidance<T extends Request>(handler: (request: T) => Promise<Response>, options: { court?: string; currentAnalysis?: boolean; requireRevision?: boolean } = {}, overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: getAuthenticatedUser,
    owned: (request, user, id) => getAuthenticatedOwnedCase(request, user as never, id, { masterKeys: ["workflowStatus", "guidanceInputRevision", "intakeCheckpoint"], intakeIdentityOnly: true }),
    names: (request, user, id) => getAuthenticatedOwnedCase(request, user as never, id, { masterKeys: ["intakeData", "intakeCheckpoint"] }),
    ...overrides,
  };
  return async (request: T): Promise<Response> => {
    const user = await deps.authenticate(request);
    if (!user) return refusal("Sign in to save and confirm your initial information before receiving case guidance.", 401);
    let body: Record<string, unknown> = {};
    if (!["GET", "HEAD"].includes(request.method)) {
      try {
        const raw = await request.clone().text();
        if (new TextEncoder().encode(raw).byteLength > 1_000_000) return refusal("This request is too large.", 413);
        body = object(JSON.parse(raw));
      } catch { return refusal("A valid request body is required.", 400); }
    }
    const ids = [request.headers.get("x-courtsimplified-case-id"), new URL(request.url).searchParams.get("caseId"), body.caseId, object(body.input).caseId].filter(value => value !== undefined && value !== null && value !== "");
    const caseId = ids[0];
    if (typeof caseId !== "string" || !UUID.test(caseId) || ids.some(id => id !== caseId)) return refusal("Open your selected case and complete its intake review first.", 409);
    const owned = await deps.owned(request, user, caseId);
    if (!owned || owned.id !== caseId) return refusal("Case not found.", 404);
    const court = options.court ?? body.courtPath;
    if (court && court !== owned.court_path) return refusal("The selected case belongs to a different court area.", 409);
    const revision = confirmedIntakeRevision(owned.master_result, owned.court_path, caseId);
    const expected = request.headers.get("x-courtsimplified-input-revision");
    if (!revision || (options.requireRevision && !expected) || (expected && expected !== revision) || (options.currentAnalysis && !guidanceIsCurrent(owned.master_result, owned.court_path, caseId))) return refusal("Answer the initial questions, review your information and confirm it before receiving case guidance.", 409);
    // Names never go to the model: every model call this route makes labels the case's names
    // and puts them back in its reply (privacy/modelNameContext.ts, site owner 2026-10-25).
    const saved = await deps.names(request, user, caseId).catch(() => null);
    // The verified user, for every capability check the route makes (policy/capabilityRequest.ts):
    // on production the A2I-gated features are on only for a listed tester (site owner, 2026-10-29).
    const response = await withCapabilityUserId(user.id, () => withNameLabelsFor(mergeNameLabels(saved ? savedCaseNameLabels(saved.master_result) : [], bodyNameLabels(body)), () => handler(request)));
    // No late model result may escape after another tab edits or reopens review.
    const latest = await deps.owned(request, user, caseId);
    if (!latest || latest.court_path !== owned.court_path || confirmedIntakeRevision(latest.master_result, latest.court_path, caseId) !== revision || options.currentAnalysis && !guidanceIsCurrent(latest.master_result, latest.court_path, caseId)) return refusal("Your initial information changed. Review and confirm it again; the older guidance was discarded.", 409);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
}
