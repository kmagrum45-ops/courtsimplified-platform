/** Browser-only synthetic account and case transport. Never sends real AI or case writes. */
import type { Page } from "@playwright/test";
import { holdRealTraffic } from "./speed";
const OWNER = "11111111-1111-4111-8111-111111111111";
export async function fakeAccount(page: Page) {
  // Real speed is installed before any stub this test registers, so each stub sees its request when the page
  // sends it and only its answer is held (speed.ts). Installed later (in grantSiteAccess), its own hold ran
  // before an earlier stub and a stub counting requests saw none for 20 s (#488 group A, 28 Oct).
  await holdRealTraffic(page);
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
  return { rows, fail: (value: boolean, status = 503) => { fail = value; failureStatus = status; }, calls: () => aiCalls, writes: () => writes };
}
