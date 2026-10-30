/**
 * THE BUILDER OPENS THE CASE JUST STARTED OR CHOSEN, NEVER AN EARLIER ONE.
 *
 * The site owner's Chrome check (30 Oct), signed in: a guest Small Claims case,
 * signed in from the builder (the case carried into the account), then from My
 * cases a new Family case; on "Here is what we understood", "Continue with Family"
 * opened the EARLIER Small Claims case: address path=small-claims&intake=<earlier>.
 *
 * Cause (scripts/verification/verifyAddressWins.ts): Next's client router reused
 * the first client-side visit's address for a later visit to the same prerendered
 * page. It happens only on a production build (next start, as CI's browser job
 * runs), never under next dev, and only on client-side navigation, so each step
 * here is the click a person makes, not page.goto, and every save has finished
 * before a link is clicked (an unsaved intake turns a click into a full load).
 *
 *   (a) Small Claims, sign in from the builder, then Family -> the Family case.
 *   (b) the same, Family then Small Claims.
 *   (c) civil after Small Claims.
 *   (d) "Open" on each of two saved cases from My cases opens that case.
 *
 * Stand-ins (synthetic, nothing reaches a database or the AI): Supabase auth
 * (sign-in returns a synthetic session) and the cases table are answered in the
 * browser; /api/case/understand returns a fixed reading for the second case (and
 * "off" for the first, so the court-path check runs, answered "no suggestion");
 * every other /api/** call answers 503. The site's own pages, router, intake store
 * and save path run as they are.
 */
import { expect, test, type Page } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { passSituationGate } from "./harness/situation";
import { situationSection, withKnownCourt } from "../../src/lib/case-system/situation/situation";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

type Court = "small-claims" | "family" | "civil";
const OWNER = "11111111-1111-4111-8111-111111111111";
const LABEL: Record<Court, string> = { "small-claims": "Small Claims", family: "Family", civil: "Civil" };
const LINE: Record<Court, string> = { "small-claims": "You're suing in Small Claims Court", family: "You're bringing a family case", civil: "You're bringing a civil case" };
const START: Record<Court, string> = { "small-claims": "Small Claims Court", family: "Family court", civil: "Superior Court" };
const STORY: Record<Court, string> = {
  "small-claims": "I'm scared he will hurt me. He also owes me $3,000 for a car repair I paid for in Ottawa.",
  family: "Synthetic family story: we separated in March and I want child support for our daughter.",
  civil: "Synthetic civil story: a contractor's defective work caused $120,000 of water damage to my house.",
};

/** Pages whose first case is read with the understanding step off (the court-path check runs instead). */
const understandOff = new WeakSet<Page>();

type Row = Record<string, unknown> & { id: string; user_id: string; court_path: string; updated_at: string; master_result: Record<string, unknown> & { intakeCheckpoint?: Record<string, unknown> } };

/** Signed out until the login form is submitted; then a synthetic account holding `seed`. */
async function syntheticAccount(page: Page, seed: Row[] = []) {
  const user = { id: OWNER, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const token = () => [btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })), btoa(JSON.stringify({ sub: OWNER, exp: Math.floor(Date.now() / 1000) + 3600 })), "synthetic-signature"].join(".");
  const session = () => ({ access_token: token(), refresh_token: "synthetic-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user });
  const rows = new Map<string, Row>(seed.map((row) => [row.id, structuredClone(row)]));
  let writeCount = 0;
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { ok: false, error: "Synthetic: no AI in this test" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: null, confidence: 0 } }));
  await page.route("**/api/case/understand", async (route) => {
    const body = route.request().postDataJSON() as { chosenCourt?: Court };
    const court = body.chosenCourt ?? "family";
    if (understandOff.has(page)) return route.fulfill({ json: { ok: true, skipped: "off" } });
    return route.fulfill({ json: {
      ok: true,
      understanding: { summary: "Synthetic reading of your story.", facts: [], matters: [], mainCourt: court, side: "starting", stage: "", questions: [], asksForPrediction: false, step: null, regime: null },
      answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
    } });
  });
  await page.route("**/auth/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/token") || url.pathname.endsWith("/signup")) return route.fulfill({ json: session() });
    if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204, body: "" });
    return route.fulfill({ json: user });
  });
  await page.route("**/rest/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.endsWith("/cases")) return route.fulfill({ json: [] });
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    if (req.method() === "POST") {
      const row = req.postDataJSON() as Row;
      if (rows.has(row.id)) return route.fulfill({ status: 409, json: { message: "duplicate key" } });
      row.updated_at = new Date(++writeCount + Date.now()).toISOString();
      rows.set(row.id, row);
      return route.fulfill({ json: { id: row.id } });
    }
    const row = id ? rows.get(id) : undefined;
    if (req.method() === "PATCH") {
      if (!row || url.searchParams.get("updated_at") !== `eq.${row.updated_at}`) return route.fulfill({ json: [] });
      Object.assign(row, req.postDataJSON(), { updated_at: new Date(++writeCount + Date.now()).toISOString() });
      return route.fulfill({ json: [{ id }] });
    }
    const project = (value: Row) => {
      const master = value.master_result;
      const checkpoint = master?.intakeCheckpoint;
      return { ...value, position: master?.position, drafts: master?.drafts, otherParty: (master?.intakeData as { otherParty?: unknown } | undefined)?.otherParty, lifecycleStage: master?.lifecycleStage, workflowStatus: master?.workflowStatus, guidanceInputRevision: master?.guidanceInputRevision, flowId: checkpoint?.flowId, cpCourt: checkpoint?.courtPath, cpVersion: String(checkpoint?.version ?? ""), revision: checkpoint?.revision, inputRevision: checkpoint?.inputRevision };
    };
    return route.fulfill({ json: id ? row ? project(row) : null : [...rows.values()].map(project) });
  });
  return { rows };
}

async function submitLogin(page: Page) {
  await page.waitForURL(/\/login/, { timeout: 60_000 });
  await page.getByPlaceholder("you@example.com").fill("synthetic@example.invalid");
  await page.getByPlaceholder("Enter password").fill("Synthetic-password-1234");
  await page.getByRole("button", { name: "Login", exact: true }).last().click();
}

/** Waits until nothing typed is waiting to save, so a link click is a client-side visit (not the save-then-leave full load). */
async function settled(page: Page) {
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved to your account/i, { timeout: 60_000 });
}

/** The same click a person makes: the header's My Workspace link (a client-side visit). */
async function myCases(page: Page) {
  await page.getByRole("link", { name: "My Workspace" }).first().click();
  await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 60_000 });
  await expect(page.getByTestId("dashboard-start")).toBeVisible({ timeout: 60_000 });
}

/** The builder shows this case and no other: its address, its court's line, its story. */
async function expectBuilderOn(page: Page, court: Court, id: string, notStory: string) {
  await page.waitForURL((url) => url.pathname === "/builder", { timeout: 60_000 });
  const address = new URL(page.url());
  expect(address.searchParams.get("path"), "the address names the court chosen").toBe(court);
  expect(address.searchParams.get("intake") ?? address.searchParams.get("caseId"), "the address names the case chosen").toBe(id);
  await passSituationGate(page);
  await expect(page.getByTestId("situation-line").first()).toContainText(LINE[court], { timeout: 60_000 });
  await expect(page.getByText(notStory, { exact: false }), "no other case's story").toHaveCount(0);
}

/** First case as a guest, carried into the account by signing in from the builder (steps 1-2). */
async function guestCaseThenSignIn(page: Page, court: Court): Promise<string> {
  await grantSiteAccess(page);
  understandOff.add(page);
  await page.goto(`/?path=${court}`);
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY[court]);
  await page.getByRole("button", { name: `Continue to ${LABEL[court]} intake` }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const guestFlow = new URL(page.url()).searchParams.get("intake");
  await page.locator('[data-testid="header-sign-in"]:visible').first().click();
  await submitLogin(page);
  await page.waitForURL((url) => url.pathname === "/builder" && Boolean(url.searchParams.get("intake")) && url.searchParams.get("intake") !== guestFlow, { timeout: 60_000 });
  const first = new URL(page.url()).searchParams.get("intake")!;
  await passSituationGate(page);
  await settled(page);
  return first;
}

/** From My cases, a new case in another court, through "Continue with <court>" (steps 3-4). Returns its id. */
async function newCaseFromMyCases(page: Page, court: Court): Promise<string> {
  await myCases(page);
  await page.getByTestId("dashboard-start").getByRole("link", { name: new RegExp(START[court]) }).click();
  await page.waitForURL((url) => url.pathname === "/" && url.searchParams.get("path") === court && Boolean(url.searchParams.get("intake")), { timeout: 60_000 });
  const id = new URL(page.url()).searchParams.get("intake")!;
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY[court]);
  understandOff.delete(page);
  await page.getByRole("button", { name: `Continue to ${LABEL[court]} intake` }).click();
  await page.getByTestId("case-understanding-continue-suggested").click();
  return id;
}

for (const [first, second] of [["small-claims", "family"], ["family", "small-claims"], ["small-claims", "civil"]] as [Court, Court][]) {
  test(`${first} then sign in from the builder, then a new ${second} case from My cases: "Continue with ${LABEL[second]}" opens the ${second} case`, async ({ page }) => {
    test.setTimeout(300_000);
    const account = await syntheticAccount(page);
    const earlier = await guestCaseThenSignIn(page, first);
    expect(account.rows.has(earlier), "the carried case was saved to the account").toBe(true);
    const chosen = await newCaseFromMyCases(page, second);
    expect(chosen).not.toBe(earlier);
    await expectBuilderOn(page, second, chosen, STORY[first].slice(0, 40));
    // The other case's saved data is untouched.
    expect(JSON.stringify(account.rows.get(earlier)?.master_result)).toContain(STORY[first].slice(0, 40));
  });
}

function savedCase(id: string, court: Court, story: string): Row {
  const situation = withKnownCourt({ where: "starting", filed: "nothing" }, court);
  return {
    id, user_id: OWNER, court_path: court, title: `Synthetic ${court} case`, status: "active", current_stage: "not-sure", updated_at: "2026-10-01T00:00:00.000Z",
    master_result: { source: "builder-created-shell", workflowStatus: { intakeCompleted: false, intakeReview: { version: 1 } }, intakeCheckpoint: { version: 1, flowId: id, courtPath: court, revision: id.replace(/^.{8}/, "99999999"), sections: { story: { text: story, location: { province: "Ontario", city: "Ottawa" } }, ...situationSection(situation) } } },
  };
}

test("Open on each of two saved cases from My cases opens that case", async ({ page }) => {
  test.setTimeout(300_000);
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await syntheticAccount(page, [savedCase(A, "small-claims", STORY["small-claims"]), savedCase(B, "family", STORY.family)]);
  await grantSiteAccess(page);
  await page.goto("/login");
  await submitLogin(page);
  await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 60_000 });
  for (const [id, court, other] of [[A, "small-claims", STORY.family], [B, "family", STORY["small-claims"]], [A, "small-claims", STORY.family]] as [string, Court, string][]) {
    await expect(page.getByTestId("dashboard-case").first()).toBeVisible({ timeout: 60_000 });
    await page.locator(`[data-testid="dashboard-case"][href*="${id}"]`).first().click();
    await expectBuilderOn(page, court, id, other.slice(0, 40));
    await settled(page);
    await myCases(page);
  }
});
