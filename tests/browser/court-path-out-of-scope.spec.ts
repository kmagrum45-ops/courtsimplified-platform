import { test, expect } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";
import { classificationScenarios } from "../../scripts/verification/scenarioRegistry";
import { OUT_OF_SCOPE_FORUMS } from "../../src/lib/case-system/intelligence/outOfScopeForums";

/**
 * Proves the out-of-scope forum fix (August 2026 audit) end to end through
 * the actual home-page location gate a real user hits, not just the
 * classifier contract. Before the fix, an LTB story like these silently
 * mis-routed to a false "civil" or "small-claims" suggestion -- see
 * courtPathClassifier.ts's detectFromKeywords() for why.
 *
 * Runs one test per forum, using each forum's keyword-only scenario from
 * scenarioRegistry.ts (the same source scripts/verification/verifyCourtPathClassifier.ts
 * proves the classifier contract against) so there is one story per forum,
 * not two copies that can drift apart. The keyword-only story is used
 * deliberately, not the AI-escalated one: this test's job is proving the UI
 * renders the result correctly, which the escalation path's extra network
 * round trip has no bearing on -- that half is already proven at the
 * classifier level, live, with 5-run consistency.
 */
const keywordScenarios = classificationScenarios.filter(
  (scenario) => scenario.expected.kind === "out-of-scope" && scenario.story.length <= 320,
);

for (const scenario of keywordScenarios) {
  const forum = scenario.expected.kind === "out-of-scope" ? OUT_OF_SCOPE_FORUMS[scenario.expected.forum as keyof typeof OUT_OF_SCOPE_FORUMS] : null;

  test(`home gate tells the user CourtSimplified doesn't cover a ${forum?.name} matter`, async ({ page }) => {
    await grantSiteAccess(page);

    await page.goto("/?path=civil", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Province or territory").selectOption("Ontario");
    await page.getByLabel("City or municipality").fill("Toronto");
    await page.getByLabel("Tell us what happened in your own words").fill(scenario.story);

    const continueButton = page.getByRole("button", { name: /Continue to Civil intake/ });
    await expect(continueButton).toBeEnabled({ timeout: 10_000 });
    await continueButton.click();

    const outOfScopePanel = page.getByTestId("court-path-out-of-scope");
    await expect(outOfScopePanel).toBeVisible({ timeout: 15_000 });
    await expect(outOfScopePanel).toContainText("CourtSimplified doesn't cover this");
    await expect(outOfScopePanel).toContainText(forum!.name);

    // The old "switch to path X" suggestion must not also render -- this is a
    // distinct outcome, not a variant of the in-scope suggestion.
    await expect(page.getByTestId("court-path-suggestion")).toHaveCount(0);

    // Never blocked: the user can still continue with their own selection.
    const continueAnyway = page.getByTestId("court-path-out-of-scope-continue");
    await expect(continueAnyway).toBeVisible();
    await continueAnyway.click();
    await expect(page).toHaveURL(/\/builder\?path=civil/);
  });
}
