/** Browser-only synthetic account and case transport. Never sends real AI or case writes. */
import type { Page } from "@playwright/test";
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
  let fail = false;
  let writes = 0;
  let failureStatus = 503;
  await page.route("**/rest/v1/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.endsWith("/cases")) return route.fulfill({ json: [] });
    if (req.method() === "POST") {
      if (fail) return route.fulfill({ status: failureStatus, json: { message: "Synthetic save failure" } });
      const row = req.postDataJSON();
      row.updated_at = new Date(++writes + Date.now()).toISOString();
      rows.set(row.id, row);
      return route.fulfill({ json: { id: row.id } });
    }
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    const row = id ? rows.get(id) : undefined;
    if (req.method() === "PATCH") {
      if (fail) return route.fulfill({ status: failureStatus, json: { message: "Synthetic save failure" } });
      if (!row || url.searchParams.get("user_id") !== `eq.${OWNER}` || url.searchParams.get("updated_at") !== `eq.${row.updated_at}`) return route.fulfill({ json: [] });
      Object.assign(row, req.postDataJSON());
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
