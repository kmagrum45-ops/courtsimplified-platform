import { expect, test } from "@playwright/test";

const casePartnerPlaceholder =
  "Ask about an important date, document, or case detail.";

async function waitForCourtPathLocationGate(page: import("@playwright/test").Page) {
  await page.locator('[data-testid="court-path-location-gate-ready"], [data-testid="saved-case-panel"]').waitFor({ state: "visible" });
  if (await page.getByTestId("saved-case-panel").isVisible()) {
    await page.getByRole("button", { name: "Start a new case" }).click();
  }
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const nativeGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        return JSON.stringify({
          access_token: "synthetic-browser-token",
          refresh_token: "synthetic-browser-refresh-token",
          token_type: "bearer",
          expires_at: 4_102_444_800,
          user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "journey@example.test" },
        });
      }
      return nativeGetItem.call(this, key);
    };
  });
  await page.route("**/auth/v1/user", (route) => route.fulfill({
    status: 200,
    json: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "journey@example.test" },
  }));
  await page.route("**/rest/v1/cases**", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, json: [{ id: "00000000-0000-4000-8000-000000000099" }] });
    }
    return route.fulfill({ status: 200, json: [] });
  });
});

test("warm Small Claims builder", async ({ page, request, baseURL }) => {
  test.setTimeout(35_000);
  const startedAt = Date.now();
  await test.step("local development server is reachable", async () => {
    try {
      await request.get(baseURL || "http://127.0.0.1:3000", {
        timeout: 5_000,
      });
    } catch {
      throw new Error(
        `Local development server unavailable at ${baseURL || "http://127.0.0.1:3000"}. Start npm run dev first.`,
      );
    }
  });
  await test.step(
    "warm Builder route until the first focused intake question is available",
    async () => {
      await page.goto("/?path=small-claims", {
        waitUntil: "domcontentloaded",
        timeout: 8_000,
      });
      await waitForCourtPathLocationGate(page);
      await page.getByLabel("Province or territory").selectOption("Ontario");
      await page.getByLabel("City or municipality").fill("Toronto");
      await page.getByLabel("Tell us what happened in your own words").fill("A payment was missed.");
      await page.getByRole("button", { name: /Continue to Small Claims intake/ }).click();
      await expect(page.getByLabel("Amount claimed or disputed")).toBeVisible({
        timeout: 35_000,
      });
    },
  );
  console.log(`Builder warm-up completed in ${Date.now() - startedAt}ms`);
});

test("Small Claims: one story reaches reviewable intake", async ({ page }) => {
  test.setTimeout(15_000);
  const narrative =
    "A fictional claimant served a fictional respondent with a Plaintiff's Claim.";

  await test.step("open Small Claims builder", async () => {
    await page.goto("/?path=small-claims", {
      waitUntil: "domcontentloaded",
      timeout: 8_000,
    });
  });

  await test.step("enter one synthetic narrative", async () => {
    await waitForCourtPathLocationGate(page);
    await page.getByLabel("Province or territory").selectOption("Ontario");
    await page.getByLabel("City or municipality").fill("Toronto");
    await page.getByLabel("Tell us what happened in your own words").fill(narrative);
    await page.getByRole("button", { name: /Continue to Small Claims intake/ }).click();
  });

  await test.step("confirm the visible Small Claims structured intake", async () => {
    await page.getByLabel("Amount claimed or disputed").fill("2500", {
      timeout: 8_000,
    });
  });

  await test.step("verify the Small Claims structured intake", async () => {
    await page
      .getByText("Confirm the details needed for your Small Claims matter.")
      .waitFor({ state: "visible", timeout: 8_000 });
  });

  await test.step("verify editable narrative and carried Home context", async () => {
    await expect(page.getByText(narrative, { exact: true })).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByText("Canonical intake context: Ontario, Toronto.")).toBeVisible();
  });
});

test("Home court cards lead directly to their selected structured intake", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Start Your Case", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Open Workspace", { exact: true })).toHaveCount(0);
  await expect(page.getByText("A different pricing approach", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/generate filled PDFs/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start case", exact: true })).toHaveCount(3);
  await page.goto("/family", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Adoption — review required")).toBeVisible();
  await expect(page.getByText(/requires review of the current Ontario forms and court requirements/)).toBeVisible();

  for (const [index, journey] of [
    { path: "family", title: "Family", heading: "Family Intake" },
    { path: "small-claims", title: "Small Claims", heading: "Confirm the details needed for your Small Claims matter." },
    { path: "civil", title: "Civil", heading: "Civil structured intake" },
  ].entries()) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Start case", exact: true }).nth(index).click();
    await expect(page).toHaveURL(new RegExp(`/builder\\?path=${journey.path}$`));
    await expect(page.getByTestId("court-path-location-gate")).toHaveCount(0);
    await page.getByLabel("Province or territory").selectOption("Ontario");
    await page.getByLabel("City or municipality").fill("Toronto");
    await page.getByLabel("Tell us what happened in your own words").fill(`A ${journey.title} case needs review.`);
    await page.getByRole("button", { name: `Continue with ${journey.title} questions` }).click();
    if (journey.path === "civil") await expect(page.getByLabel("Your role")).toBeVisible();
    else await expect(page.getByText(journey.heading, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Tell us what happened in your own words")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit case story" })).toBeVisible();
    await expect(page.getByText("Canonical intake context: Ontario, Toronto.")).toBeVisible();
    await expect(page.getByText("AI Case Partner", { exact: true })).toHaveCount(0);
  }
});

test("Small Claims and Family landing pages present the requested official information", async ({ page }) => {
  await page.goto("/small-claims", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ontario Small Claims Court limit" })).toBeVisible();
  await expect(page.getByText(/up to \$50,000, excluding interest and costs/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official Ontario resources" })).toBeVisible();
  const smallClaimsResources = [
    ["Suing someone in Small Claims Court", "https://www.ontario.ca/page/suing-someone-small-claims-court"],
    ["Being sued in Small Claims Court", "https://www.ontario.ca/page/being-sued-small-claims-court"],
    ["Guide to procedures in Small Claims Court", "https://www.ontario.ca/document/guide-procedures-small-claims-court"],
    ["Official Small Claims Court forms", "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/"],
    ["Rules of the Small Claims Court", "https://www.ontario.ca/laws/regulation/980258"],
  ];
  for (const [name, href] of smallClaimsResources) {
    const resourceLink = page.getByRole("link", { name, exact: true });
    await expect(resourceLink).toHaveAttribute("href", href);
    await expect(resourceLink).toHaveAttribute("target", "_blank");
  }

  await page.goto("/family", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Safety, violence and support" })).toBeVisible();
  const familyResources = [
    ["Connect with supports for survivors of violence", "https://www.ontario.ca/page/connect-supports-survivors-violence"],
    ["Family Court Support Workers", "https://www.ontario.ca/page/family-court-support-workers"],
    ["Ontario family law services", "https://www.ontario.ca/page/family-law-services"],
    ["Guide to procedures in Family Court", "https://www.ontario.ca/document/guide-procedures-family-court"],
    ["Official Family Law Rules forms", "https://ontariocourtforms.on.ca/en/family-law-rules-forms/"],
    ["Family Law Rules", "https://www.ontario.ca/laws/regulation/990114"],
  ];
  for (const [name, href] of familyResources) {
    const resourceLink = page.getByRole("link", { name, exact: true });
    await expect(resourceLink).toHaveAttribute("href", href);
    await expect(resourceLink).toHaveAttribute("target", "_blank");
  }
});

test("Case Partner carries confirmed Small Claims location and displays a date follow-up", async ({ page }) => {
  test.setTimeout(20_000);
  let partnerRequest: Record<string, unknown> | null = null;
  let partnerRequestCount = 0;
  const analysis = {
    courtPath: "small-claims",
    caseStage: "already-started",
    completedForms: [], receivedForms: [], requiredNextForms: [], notNeededNow: [],
    detectedIssues: ["Defamation / reputational harm"], inferredFacts: [], missingInformation: ["Has the defendant filed a Defence?"], risksAndGaps: [],
    guidance: [], summary: "Synthetic Small Claims intake summary.",
  };
  const payload = {
    courtPath: "small-claims", pathLabel: "Small Claims", caseStage: "already-started",
    yourName: "Alex Example", otherParty: "Jordan Example", facts: "Synthetic alleged false text messages were communicated to two third parties.", timeline: "",
    evidence: "", missingEvidence: "", goal: "Compensation", urgent: "", analysis,
    extra: { yourProvince: "Ontario", yourCity: "Ottawa", yourRole: "Plaintiff / claimant", amountClaimed: "$10,000", filedDocuments: ["plaintiffs-claim", "affidavit-service"] },
  };

  await page.route("**/api/small-claims/analyze", (route) => route.fulfill({
    status: 200,
    json: { ok: true, reasoningMode: "deterministic-fallback", analysisAvailable: false, authenticated: false, result: { analysis, payload, masterResultPatch: {}, dashboardPatch: {} } },
  }));
  await page.route("**/api/ai-case-partner", async (route) => {
    partnerRequestCount += 1;
    partnerRequest = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        answer: "I recorded the date as information to review; it does not confirm a deadline.",
        courtContext: { courtPath: "small-claims", jurisdiction: "Ontario", city: "Toronto" },
        conversationIntelligence: { conversationFocus: { courtArea: "small-claims" } },
        conversationMemory: { memory: { warnings: ["Confirm the date against the court record."] } },
        caseInvestigation: { issues: [] },
      },
    });
  });

  await page.goto("/?path=small-claims", { waitUntil: "domcontentloaded" });
  await waitForCourtPathLocationGate(page);
  await page.getByLabel("Province or territory").selectOption("Ontario");
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill("Synthetic alleged false text messages were communicated to two third parties.");
  await page.getByRole("button", { name: /Continue to Small Claims intake/ }).click();
  await page.getByLabel("Your role").selectOption("Plaintiff / claimant");
  await page.getByRole("button", { name: "Plaintiff’s Claim already filed / served" }).click();
  await page.getByRole("button", { name: "Affidavit of Service filed with the court" }).click();
  await page.getByRole("button", { name: "Generate Summary" }).click();
  const overview = page.getByTestId("completed-case-overview");
  await expect(overview).toBeVisible();
  await expect(overview.getByText("Your case overview", { exact: true })).toBeVisible();
  await expect(overview.getByText("Role: Plaintiff / claimant.", { exact: false })).toBeVisible();
  await expect(overview.getByText("Possible defamation or reputational-harm issue to review", { exact: true })).toBeVisible();
  await expect(overview.getByText("Claim already filed and served.", { exact: true })).toBeVisible();
  await expect(overview.getByText("Affidavit of Service filed with the court", { exact: true })).toBeVisible();
  await expect(overview.getByText("Has the defendant filed a Defence?", { exact: true })).toBeVisible();
  await expect(overview.getByText("Complete unedited message threads or screenshots", { exact: true })).toBeVisible();
  await expect(overview.getByText("Uncle and father: what each received and when", { exact: true })).toBeVisible();
  await expect(overview.getByText("Evidence the statement was false, if available", { exact: true })).toBeVisible();
  await expect(overview.getByText("Points the court may need clarified", { exact: true })).toBeVisible();
  await expect(page.getByText("Case ID:", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Save: Waiting", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Not recorded", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Case follow-up is temporarily unavailable", { exact: false })).toHaveCount(0);
  await expect(page.getByText("AI Case Partner", { exact: true })).toHaveCount(0);
});

type FormsFixture = {
  caseId: string;
  courtPath: "small-claims" | "family" | "civil";
  stage: string;
  questions: Array<Record<string, unknown>>;
  recommendation?: { canonicalFormId: string; courtType: string; officialTitle: string };
  catalogTitle: string;
};

async function installSyntheticFormsJourney(page: import("@playwright/test").Page, fixture: FormsFixture) {
  let saved = false;
  await page.addInitScript(() => {
    const nativeGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        return JSON.stringify({
          access_token: "synthetic-browser-token",
          refresh_token: "synthetic-browser-refresh-token",
          token_type: "bearer",
          expires_at: 4_102_444_800,
          user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated" },
        });
      }
      return nativeGetItem.call(this, key);
    };
  });
  await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, json: { user: { id: "00000000-0000-4000-8000-000000000001" } } }));
  await page.route("**/rest/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/cases?")) {
      return route.fulfill({ status: 200, json: [{ id: fixture.caseId, court_path: fixture.courtPath, master_result: { courtPath: fixture.courtPath, province: "Ontario", stage: fixture.stage, masterCase: { stage: fixture.stage } } }] });
    }
    if (url.includes("/court_form_clean_view?")) {
      return route.fulfill({ status: 200, json: [{ canonical_form_id: fixture.recommendation?.canonicalFormId || "00000000-0000-4000-8000-000000000099", court_type: fixture.courtPath, form_number: "Synthetic", official_title: fixture.catalogTitle, pdf_path: null, word_path: null, form_group: null, procedure_stage: fixture.stage, purpose: null, version_count: 1 }] });
    }
    return route.fulfill({ status: 200, json: [] });
  });
  await page.route(/\/api\/cases\/form-applicability(?:\?caseId=)?/, async (route) => {
    if (route.request().method() === "PATCH") saved = true;
    await route.fulfill({
      status: 200,
      json: {
        courtPath: fixture.courtPath,
        formApplicability: {},
        applicabilityQuestions: fixture.questions,
        recommendations: saved && fixture.recommendation ? [{ ...fixture.recommendation, officialSourceUrl: "https://ontariocourtforms.on.ca/en/official-forms/", revisionOrEffectiveAt: "Verified catalogue revision" }] : [],
      },
    });
  });
}

function verifiedRecommendation(page: import("@playwright/test").Page) {
  return page.locator("article").filter({ hasText: "Official source verified" });
}

test("Forms: Small Claims 7A appears only after generic confirmations", async ({ page }) => {
  const fixture: FormsFixture = {
    caseId: "00000000-0000-4000-8000-000000000071", courtPath: "small-claims", stage: "starting-case", catalogTitle: "Plaintiff's Claim",
    questions: [
      { field_path: "formApplicability.smallClaims.eligibilityConfirmed", question: "Have you confirmed this is an eligible Ontario Small Claims Court matter?", value_type: "boolean", choices: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }] },
      { field_path: "formApplicability.smallClaims.requestedRemedyType", question: "What ordinary claim are you starting?", value_type: "string", choices: [{ value: "ordinary-money-claim", label: "Money claim" }, { value: "ordinary-property-claim", label: "Property claim" }, { value: "not-sure", label: "Not sure" }] },
    ],
    recommendation: { canonicalFormId: "a289d2a2-a691-45eb-a625-15c42c6da695", courtType: "small-claims", officialTitle: "Plaintiff's Claim" },
  };
  await installSyntheticFormsJourney(page, fixture);
  await page.goto(`/forms?caseId=${fixture.caseId}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(fixture.questions[0].question as string).selectOption({ label: "Yes" });
  await page.getByLabel(fixture.questions[1].question as string).selectOption({ label: "Money claim" });
  await page.getByRole("button", { name: "Save confirmations" }).click();
  await expect(verifiedRecommendation(page)).toContainText("Plaintiff's Claim");
  await expect(verifiedRecommendation(page)).toContainText("Official source verified");
  await expect(verifiedRecommendation(page)).not.toContainText("Statement of Defence");
});

test("Forms: unresolved Family 8 remains review-required", async ({ page }) => {
  const fixture: FormsFixture = {
    caseId: "00000000-0000-4000-8000-000000000008", courtPath: "family", stage: "starting-case", catalogTitle: "Application (General)",
    questions: [
      { field_path: "formApplicability.family.isGeneralApplication", question: "Is this a general Family Application?", value_type: "boolean", choices: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }] },
      { field_path: "formApplicability.family.isDivorceApplication", question: "Is this a divorce application?", value_type: "boolean", choices: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }] },
    ],
  };
  await installSyntheticFormsJourney(page, fixture);
  await page.goto(`/forms?caseId=${fixture.caseId}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(fixture.questions[0].question as string).selectOption({ label: "Not sure" });
  await page.getByRole("button", { name: "Save confirmations" }).click();
  await expect(page.getByText(/Review required/)).toBeVisible();
  await expect(verifiedRecommendation(page)).toHaveCount(0);
  await expect(page.getByText("Official source verified")).toHaveCount(0);
});

test("Forms: Civil 18A appears only for Statement of Defence and service wording stays non-certifying", async ({ page, context }) => {
  const fixture: FormsFixture = {
    caseId: "00000000-0000-4000-8000-000000000018", courtPath: "civil", stage: "responding", catalogTitle: "Statement of Defence",
    questions: [{ field_path: "formApplicability.civil.responseDocument", question: "Which civil response document are you preparing?", value_type: "string", choices: [{ value: "statement-of-defence", label: "I am preparing a Statement of Defence in response to a civil Statement of Claim." }, { value: "notice-of-intent-to-defend", label: "Notice of Intent to Defend" }, { value: "not-sure", label: "Not sure" }] }],
    recommendation: { canonicalFormId: "502cd465-720a-4d71-8b6c-a7eefe788657", courtType: "civil", officialTitle: "Statement of Defence" },
  };
  await installSyntheticFormsJourney(page, fixture);
  await page.goto(`/forms?caseId=${fixture.caseId}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(fixture.questions[0].question as string).selectOption({ label: "I am preparing a Statement of Defence in response to a civil Statement of Claim." });
  await page.getByRole("button", { name: "Save confirmations" }).click();
  await expect(verifiedRecommendation(page)).toContainText("Statement of Defence");
  await expect(verifiedRecommendation(page)).not.toContainText("Plaintiff's Claim");

  const servicePage = await context.newPage();
  const serviceFixture: FormsFixture = {
    caseId: "00000000-0000-4000-8000-000000000016", courtPath: "civil", stage: "already-started", catalogTitle: "Affidavit of Service",
    questions: [{ field_path: "formApplicability.civil.hasCompletedServiceAndPreparingProof", question: "I have completed service and am preparing proof of service for court documents.", value_type: "boolean", choices: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }], explanation: "This does not confirm that service was legally valid." }],
  };
  await installSyntheticFormsJourney(servicePage, serviceFixture);
  await servicePage.goto(`/forms?caseId=${serviceFixture.caseId}`, { waitUntil: "domcontentloaded" });
  await expect(servicePage.getByText("This does not confirm that service was legally valid.")).toBeVisible();
  await expect(servicePage.getByText("Official source verified")).toHaveCount(0);
});
