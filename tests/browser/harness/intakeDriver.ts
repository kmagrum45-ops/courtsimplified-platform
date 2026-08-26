/**
 * Drives one scenario through a real intake in the browser and captures what
 * the completed case overview actually renders.
 *
 * The capture is deliberately page-level: card text as a user sees it, not
 * engine internals. A check that reads the same objects the engine produced
 * would pass on output that never reaches the screen, which is how the
 * Procedure Authority panel sat unrendered while its logic stayed green.
 */

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { grantSiteAccess } from "./siteAccess";
import { authStorageKey, mintRealTestSession } from "./realTestSession";

import type { SelectedScenario } from "./scenarioSelection";

/**
 * Signed-in state so intakes reach the overview on the structured-ai path,
 * not just the fallback engine.
 *
 * The analyze routes call getAuthenticatedUser(request), which validates the
 * Authorization: Bearer token directly against Supabase from the Next.js
 * server -- a server-to-server call Playwright cannot intercept. A stub that
 * only fakes what the browser sees (localStorage, the Supabase auth/v1/user
 * route) leaves that server-side check with no valid token, so it was always
 * false. This
 * mints a real session for a dedicated harness test user instead, so the
 * token the server validates is one Supabase itself issued.
 *
 * Case persistence (the cases table) is still faked: the harness runs
 * repeatedly, including in CI, and should not write rows into the real
 * project on every run.
 */
export async function authenticateRealTestUser(page: Page): Promise<void> {
  await grantSiteAccess(page);

  const { session, supabaseUrl } = await mintRealTestSession();
  const storageKey = authStorageKey(supabaseUrl);

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: storageKey, value: JSON.stringify(session) },
  );

  await page.route("**/rest/v1/cases**", (route) => {
    const method = route.request().method();
    if (method === "POST") {
      return route.fulfill({ status: 201, json: [{ id: "00000000-0000-4000-8000-000000000099" }] });
    }
    if (method === "PATCH") {
      return route.fulfill({ status: 200, json: [{ id: "00000000-0000-4000-8000-000000000099" }] });
    }
    return route.fulfill({ status: 200, json: [] });
  });
}

/** What the overview rendered, as text a reader would see. */
export type CapturedOverview = {
  scenarioId: string;
  courtPath: string;
  stage: string;
  stageSubstitutedFrom: string | null;
  reachedOverview: boolean;
  failureReason: string | null;
  cards: Record<string, string>;
  confirmNextQuestion: string;
  documentsCard: string;
  issuesCard: string;
  authorityPanelRendered: boolean;
  authorityPanelText: string;
  authorityHeadingClass: string | null;
  siblingHeadingClass: string | null;
  fullOverviewText: string;
  consoleErrors: string[];
  /** Server-reported reasoning mode from the analyze route, if observed. */
  reasoningMode: string | null;
  serverAuthenticated: boolean | null;
};

const SUBMIT_LABEL: Record<string, RegExp> = {
  "small-claims": /^Generate Summary$/,
  family: /Continue to Unified Analysis/,
  civil: /Continue to Unified Analysis/,
};

/** Registry role wording mapped to the option values each intake offers. */
const ROLE_VALUES: Record<string, string> = {
  "plaintiff / claimant": "plaintiff",
  "defendant / responding party": "defendant",
  "step-parent applicant": "applicant",
  applicant: "applicant",
  respondent: "respondent",
  plaintiff: "plaintiff",
  defendant: "defendant",
};

async function selectRoleIfPresent(page: Page, role: string): Promise<void> {
  const select = page.getByLabel("Your role");
  if ((await select.count()) === 0) return;

  const wanted = ROLE_VALUES[role.trim().toLowerCase()] || "";
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({ value: (node as HTMLOptionElement).value, text: (node as HTMLOptionElement).textContent || "" })),
  );

  const match =
    options.find((option) => option.value && option.value === wanted) ||
    options.find((option) => option.value && option.text.trim().toLowerCase() === role.trim().toLowerCase()) ||
    options.find((option) => option.value);

  if (match) await select.selectOption(match.value);
}

/**
 * Match a registry fact such as "Plaintiff's Claim filed and served" to a
 * checkbox label such as "Plaintiff's Claim already filed / served". Matching is
 * on distinctive words rather than exact text, since the two vocabularies were
 * written independently. Curly and straight apostrophes both appear.
 */
function looksLikeSameDocument(registryFact: string, checkboxLabel: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[â€™']/g, "'").replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim();

  const factWords = new Set(normalize(registryFact).split(" ").filter((word) => word.length > 3));
  const labelWords = new Set(normalize(checkboxLabel).split(" ").filter((word) => word.length > 3));
  if (factWords.size === 0 || labelWords.size === 0) return false;

  let shared = 0;
  for (const word of factWords) if (labelWords.has(word)) shared += 1;
  return shared >= 2;
}

async function checkDocuments(page: Page, selected: SelectedScenario): Promise<void> {
  const facts = selected.scenario.filedServiceFacts || [];
  if (facts.length === 0) return;

  for (const fact of facts) {
    const boxes = page.getByRole("button").filter({ hasText: /filed|served|judgment|conference|prepared|started/i });
    const count = await boxes.count();
    for (let index = 0; index < count; index += 1) {
      const box = boxes.nth(index);
      const label = (await box.innerText()).trim();
      if (looksLikeSameDocument(fact, label)) {
        await box.click();
        break;
      }
    }
  }
}

async function checkIssues(page: Page, selected: SelectedScenario): Promise<void> {
  const labels = (selected.scenario.intakeFacts.issueLabels as string[] | undefined) || [];
  for (const label of labels) {
    const button = page.getByRole("button", { name: label, exact: false }).first();
    if ((await button.count()) > 0) await button.click().catch(() => undefined);
  }
}

async function readCards(page: Page): Promise<Record<string, string>> {
  const overview = page.getByTestId("case-overview");
  const sections = overview.locator("section");
  const count = await sections.count();
  const cards: Record<string, string> = {};

  for (let index = 0; index < count; index += 1) {
    const section = sections.nth(index);
    const heading = section.locator("h2").first();
    if ((await heading.count()) === 0) continue;
    const title = (await heading.innerText()).trim();
    if (!title || cards[title]) continue;
    cards[title] = (await section.innerText()).trim();
  }

  return cards;
}

export async function runScenario(
  page: Page,
  selected: SelectedScenario,
): Promise<CapturedOverview> {
  const { scenario, stage, stageSubstitutedFrom } = selected;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200));
  });

  const captured: CapturedOverview = {
    scenarioId: scenario.id,
    courtPath: scenario.courtPath,
    stage,
    stageSubstitutedFrom,
    reachedOverview: false,
    failureReason: null,
    cards: {},
    confirmNextQuestion: "",
    documentsCard: "",
    issuesCard: "",
    authorityPanelRendered: false,
    authorityPanelText: "",
    authorityHeadingClass: null,
    siblingHeadingClass: null,
    fullOverviewText: "",
    consoleErrors,
    reasoningMode: null,
    serverAuthenticated: null,
  };

  // The analyze routes gate the AI on authenticated && hasConfiguredServerAi()
  // and report the outcome as reasoningMode. Without capturing it, a run that
  // never invoked the AI is indistinguishable from one that did.
  page.on("response", async (response) => {
    if (!/\/api\/(small-claims|civil|family)\/analyze/.test(response.url())) return;
    try {
      const body = await response.json();
      if (typeof body?.reasoningMode === "string") captured.reasoningMode = body.reasoningMode;
      if (typeof body?.authenticated === "boolean") captured.serverAuthenticated = body.authenticated;
    } catch {
      // Body unreadable: leave null so the report says unobserved rather than
      // asserting a mode that was never actually read.
    }
  });

  try {
    const facts = String(scenario.intakeFacts.facts || "A synthetic matter requires review.");
    const city = String(scenario.intakeFacts.city || "Toronto");

    await page.goto(`/builder?path=${scenario.courtPath}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Province or territory").selectOption("Ontario");
    await page.getByLabel("City or municipality").fill(city);
    await page.getByLabel("Tell us what happened in your own words").fill(facts);
    // The gate button is disabled until React has processed the province, city
    // and story changes (app/builder/page.tsx line ~750). Clicking without
    // waiting races the re-render, which is why one path passed and two failed.
    const continueButton = page.getByRole("button", { name: /Continue with .* questions/ });
    await continueButton.waitFor({ state: "visible", timeout: 30_000 });
    await expect(continueButton).toBeEnabled({ timeout: 30_000 });
    await continueButton.click();

    // Case stage exists on all three intakes and is the main axis under test.
    const stageSelect = page.getByLabel("Case stage");
    await stageSelect.waitFor({ state: "visible", timeout: 30_000 });
    await stageSelect.selectOption(stage);

    // Civil rejects the intake outright without a role (isCivilInput checks
    // allowedRoles), so this is required rather than cosmetic.
    await selectRoleIfPresent(page, scenario.role);

    // The registry's recorded filings and issue labels are what the quality
    // checks reason about. Leaving them unset would make the already-answered
    // and issue-detection checks unable to fire at all.
    await checkDocuments(page, selected);
    await checkIssues(page, selected);

    if (scenario.courtPath === "small-claims") {
      const amount = String(scenario.intakeFacts.amountClaimed || "$2,500");
      await page.getByLabel("Amount claimed or disputed").fill(amount);
    }

    await page.getByRole("button", { name: SUBMIT_LABEL[scenario.courtPath] }).click();

    const overview = page.getByTestId("completed-case-overview");
    await overview.waitFor({ state: "visible", timeout: 90_000 });
    // The authority panel fetches after mount; let it settle before capture.
    await page.waitForTimeout(2_500);

    captured.reachedOverview = true;
    captured.cards = await readCards(page);
    captured.confirmNextQuestion = captured.cards["What to confirm next"] || "";
    captured.documentsCard = captured.cards["Documents already recorded"] || "";
    captured.issuesCard = captured.cards["Issues to review"] || "";
    captured.fullOverviewText = (await overview.innerText()).trim();

    const panels = page.locator("section", { hasText: "Ontario procedure authority" });
    if ((await panels.count()) > 0) {
      const panel = panels.last();
      captured.authorityPanelRendered = true;
      captured.authorityPanelText = (await panel.innerText()).trim();
      const heading = panel.locator("h2, h3").first();
      captured.authorityHeadingClass = await heading.getAttribute("class");
    }

    const sibling = page.locator("h2", { hasText: "Case snapshot" }).first();
    if ((await sibling.count()) > 0) {
      captured.siblingHeadingClass = await sibling.getAttribute("class");
    }
  } catch (error) {
    captured.failureReason = error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 900) : String(error);
  }

  return captured;
}
