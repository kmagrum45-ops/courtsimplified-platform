import { expect, test } from "@playwright/test";

const paths = [
  { path: "family", label: "Family", area: "Family Intake" },
  { path: "small-claims", label: "Small Claims", area: "Your role" },
  { path: "civil", label: "Civil", area: "Your role" },
] as const;

async function begin(page: import("@playwright/test").Page, journey: typeof paths[number]) {
  await page.goto(`/builder?path=${journey.path}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("court-path-location-gate")).toHaveCount(0);
  await page.getByLabel("Province or territory").selectOption("Ontario");
  await page.getByLabel("City or municipality").fill("Toronto");
  await page.getByLabel("Tell us what happened in your own words").fill("A private logged-out intake needs review.");
  await page.getByRole("button", { name: `Continue with ${journey.label} questions` }).click();
}

for (const journey of paths) {
  test(`logged-out ${journey.label} starts directly in its intake`, async ({ page }) => {
    await begin(page, journey);
    if (journey.path === "civil") await expect(page.getByLabel("Your role")).toBeVisible();
    else await expect(page.getByText(journey.area, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit case story" })).toBeVisible();
  });
}
