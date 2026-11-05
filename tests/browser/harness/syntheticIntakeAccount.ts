/** Browser-only synthetic account and case transport. Never sends real AI or case writes. */
import type { Page } from "@playwright/test";
import { readFactWrites } from "../../../src/lib/case-system/caseFile/factRecord";
import { intakeCourtOfRow, saveFactWrites } from "../../../src/lib/case-system/caseFile/factSave";
const OWNER = "11111111-1111-4111-8111-111111111111";
export async function fakeAccount(page: Page) {
  await page.addInitScript(({ owner }) => {
    const get = Storage.prototype.getItem;
    const user = { id: owner, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
    const token = [btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })), btoa(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })), "synthetic-signature"].join(".");
    const session = JSON.stringify({ access_token: token, refresh_token: "synthetic-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user });
    Storage.prototype.getItem = function (key: string) {
      return this === localStorage && /^sb-.+-auth-token$/.test(key) ? session : get.call(this, key);
    };
  }, { owner: OWNER });
  await page.route("**/auth/v1/**", route => route.fulfill({ json: { id: OWNER, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } }));
  const rows = new Map<string, Record<string, unknown>>();
  /*
   * Stored the way Postgres stores jsonb: every object's keys reordered, shorter keys first, then by
   * their bytes. A case read back is never in the order the page wrote it, as on the real database
   * (Chrome, 28 Oct: the home reading's answers came back as {answer, question}, the saved facts no
   * longer matched the page's, and Confirm bounced; plain objects here hid that from every test).
   */
  const asJsonb = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(asJsonb);
    if (!value || typeof value !== "object") return value;
    const bytes = (key: string) => new TextEncoder().encode(key);
    const order = (a: string, b: string) => { const x = bytes(a), y = bytes(b); if (x.length !== y.length) return x.length - y.length; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort(order).map((key) => [key, asJsonb((value as Record<string, unknown>)[key])]));
  };
  let fail = false;
  let writes = 0;
  let failureStatus = 503;
  await page.route("**/rest/v1/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.endsWith("/cases")) return route.fulfill({ json: [] });
    if (req.method() === "POST") {
      if (fail) return route.fulfill({ status: failureStatus, json: { message: "Synthetic save failure" } });
      const row = asJsonb(req.postDataJSON()) as Record<string, unknown>;
      row.updated_at = new Date(++writes + Date.now()).toISOString();
      rows.set(row.id as string, row);
      return route.fulfill({ json: { id: row.id } });
    }
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    const row = id ? rows.get(id) : undefined;
    if (req.method() === "PATCH") {
      if (fail) return route.fulfill({ status: failureStatus, json: { message: "Synthetic save failure" } });
      // Like the database: a write that names no owner is limited to the owner's rows by
      // row-level security (the position save sends only id and updated_at).
      const ownerFilter = url.searchParams.get("user_id");
      if (!row || row.user_id !== OWNER || (ownerFilter !== null && ownerFilter !== `eq.${OWNER}`) || url.searchParams.get("updated_at") !== `eq.${row.updated_at}`) return route.fulfill({ json: [] });
      Object.assign(row, asJsonb(req.postDataJSON()));
      writes++;
      return route.fulfill({ json: [{ id }] });
    }
    const project = (value: Record<string, unknown>) => {
      const master = value.master_result as Record<string, unknown>;
      const checkpoint = master?.intakeCheckpoint as Record<string, unknown> | undefined;
      return { ...value, position: master?.position, drafts: master?.drafts, otherParty: (master?.intakeData as Record<string, unknown>)?.otherParty, lifecycleStage: master?.lifecycleStage, workflowStatus: master?.workflowStatus, guidanceInputRevision: master?.guidanceInputRevision, flowId: checkpoint?.flowId, cpCourt: checkpoint?.courtPath, cpVersion: String(checkpoint?.version ?? ""), revision: checkpoint?.revision, inputRevision: checkpoint?.inputRevision };
    };
    const ownerFilter = url.searchParams.get("user_id");
    const owned = row?.user_id === OWNER && (!ownerFilter || ownerFilter === `eq.${OWNER}`);
    return route.fulfill({ json: id ? owned ? project(row!) : null : ownerFilter === `eq.${OWNER}` ? [...rows.values()].filter(value => value.user_id === OWNER).map(project) : [] });
  });
  let aiCalls = 0;
  await page.route("**/api/**", route => {
    aiCalls++;
    return route.fulfill({ status: 503, json: { ok: false, error: "Synthetic retryable interruption" } });
  });
  /*
   * POST /api/cases/facts (case core G2: the tab sends its unsent edits there, and the server numbers each one). A
   * STAND-IN FOR THE DATABASE ONLY: the route's own checks and the one writer itself (factRecord.ts readFactWrites,
   * factSave.ts saveFactWrites: the server's numbers, the compare-and-set on updated_at) run on these rows, as
   * the real route runs them on the case's row. Registered after the catch-all above, so it answers first.
   */
  await page.route("**/api/cases/facts", async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const read = readFactWrites(body);
    if (!read.ok) return route.fulfill({ status: 400, json: { error: read.error } });
    const row = typeof body.caseId === "string" ? rows.get(body.caseId) : undefined;
    if (!row || row.user_id !== OWNER) return route.fulfill({ status: 404, json: { error: "The selected case could not be found." } });
    const court = intakeCourtOfRow(row as { court_path: string | null });
    if (!court) return route.fulfill({ status: 409, json: { error: "This case has no intake to save facts into." } });
    const client = {
      from: () => ({
        select: () => { const self = { eq: () => self, maybeSingle: async () => ({ data: { master_result: row.master_result, updated_at: row.updated_at }, error: null }) }; return self; },
        update: (values: Record<string, unknown>) => {
          const filters: Record<string, string> = {};
          const self = {
            eq: (column: string, value: string) => { filters[column] = value; return self; },
            select: async () => {
              if (fail) return { data: null, error: { message: "Synthetic save failure" } };
              if (filters.updated_at !== undefined && filters.updated_at !== row.updated_at) return { data: [], error: null };
              row.master_result = asJsonb(values.master_result);
              row.updated_at = new Date(++writes + Date.now()).toISOString();
              return { data: [{ id: row.id }], error: null };
            },
          };
          return self;
        },
      }),
    };
    const outcome = await saveFactWrites(client, { caseId: String(body.caseId), userId: OWNER, court }, read.writes);
    if (outcome.ok) return route.fulfill({ json: { saved: outcome.saved, conflicts: outcome.conflicts, facts: outcome.facts } });
    return route.fulfill({ status: outcome.reason === "rejected" ? 400 : outcome.reason === "not-found" ? 404 : outcome.reason === "error" ? 500 : 409, json: { error: outcome.reason } });
  });
  return { rows, fail: (value: boolean, status = 503) => { fail = value; failureStatus = status; }, calls: () => aiCalls, writes: () => writes };
}
