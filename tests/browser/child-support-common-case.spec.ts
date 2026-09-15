/**
 * The child support common case, end to end in a browser.
 *
 * One or two children, no spousal support, no s. 7 claim, never married. The
 * design claim is that this user answers seven short questions and gets a
 * draft, and that three things are TRUE OF WHAT THEY SEE rather than of the
 * modules behind it:
 *
 *   - no second income field, and not an empty one — absent
 *   - no section 7 list
 *   - no Form 13, because FLR r. 13 (1.3) removes the financial statement
 *   - no calculated amount anywhere in the draft
 *
 * WHY IN A BROWSER WHEN verifyChildSupportIntake ALREADY CHECKS THIS. That
 * check reads the component SOURCE and calls the pure modules. Both are worth
 * having and neither substitutes for the other: a source check proves the field
 * is written inside the disclosure, and this proves the disclosure is actually
 * closed when a real user arrives and that the field is actually not visible.
 * The gap between those two is where this codebase has repeatedly found
 * defects — EventCandidateSurface's logic was correct and mounted behind a
 * condition that never held.
 *
 * NO SIGN-IN AND NO SEEDED CASE. The screen makes no API call, so there is no
 * user row to create and none to delete. Nothing this spec does can leave state
 * for the next run to pass on.
 *
 * Run: npx playwright test tests/browser/child-support-common-case.spec.ts
 */

import { expect, test } from "@playwright/test";

import { openBuilder } from "./harness/builderGate";

/** What this user says. Deliberately qualified — it must survive verbatim. */
const STATED_INCOME = "about $58,000";
const INCOME_BASIS = "line 15000 of their 2025 notice of assessment";

test.describe("child support — the common case", () => {
  test.use({ navigationTimeout: 90_000, actionTimeout: 30_000 });

  test("seven questions, r. 13 (1.3) fires, and the draft calculates nothing", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await openBuilder(page, "family", {
      city: "Sudbury",
      story:
        "The other parent has not paid anything towards our two children since we separated.",
    });

    const screen = page.getByTestId("child-support-intake");
    await expect(screen).toBeVisible({ timeout: 60_000 });

    // ---- The no-calculation line is there BEFORE anything is answered ----
    //
    // A user who reaches question four still expecting a number has been
    // misled for four questions. Asserted on the rendered page, not on where
    // the JSX sits.
    const notice = page.getByTestId("child-support-no-calculation-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("does not calculate the amount");

    // ---- What the common-case user must NOT be shown, before touching anything ----

    await expect(
      page.getByTestId("cs-income-section-seven"),
      "the second income field is visible on arrival — it belongs inside the " +
        "section 7 disclosure, which is closed by default",
    ).not.toBeVisible();

    await expect(
      page.getByTestId("cs-section-seven-expenses"),
      "the section 7 expense list is visible on arrival",
    ).not.toBeVisible();

    await expect(page.getByTestId("disclosure-section-seven")).toHaveAttribute(
      "data-open",
      "false",
    );
    await expect(page.getByTestId("disclosure-property")).toHaveAttribute(
      "data-open",
      "false",
    );

    // ---- The seven questions ----

    await page.getByTestId("cs-applicant-name").fill("Dana Okonkwo");
    await page.getByTestId("cs-applicant-address").fill("14 Bay Street, Sudbury ON");
    await page.getByTestId("cs-respondent-name").fill("Riley Tran");

    // Question 2 is its own step because it decides which province's table
    // applies. The reason must be on the page, not just in the code.
    const residenceReason = page.getByTestId("cs-residence-reason");
    await expect(residenceReason).toBeVisible();
    await expect(residenceReason).toContainText("ordinarily resides");
    await expect(residenceReason).toContainText("not where you");

    await page.getByTestId("cs-respondent-address").fill("7 Elm Avenue, Sudbury ON");

    await page
      .getByTestId("cs-children")
      .fill("Two children, aged 6 and 9, both in school full time.");
    await page
      .getByTestId("cs-parenting-time")
      .fill("The children live with me. Riley sees them every second weekend.");

    await page.getByTestId("cs-income-table").fill(STATED_INCOME);
    await page.getByTestId("cs-income-table-basis").fill(INCOME_BASIS);

    // Not ticked: the figure is one party's statement, not an agreed one.
    await expect(page.getByTestId("cs-income-agreed-in-writing")).not.toBeChecked();

    await page.getByTestId("cs-table-only-yes").click();
    await expect(page.getByTestId("cs-table-only-yes")).toHaveAttribute(
      "data-selected",
      "true",
    );

    await page
      .getByTestId("cs-documents")
      .fill("2023, 2024 and 2025 notices of assessment");

    // ---- Nothing this user wrote is out of scope ----
    //
    // The notices exist to tell a user the site does not cover their
    // situation. Firing on a plain common-case story would make them noise.
    await expect(
      page.getByTestId("cs-scope-notices"),
      "an out-of-scope notice fired on an ordinary first application",
    ).toHaveCount(0);

    // ---- The draft ----

    await page.getByTestId("cs-build-draft").click();
    await expect(page.getByTestId("cs-draft")).toBeVisible({ timeout: 20_000 });

    const financialStatement = page.getByTestId("cs-draft-financial-statement");
    await expect(financialStatement).toContainText("None required");
    await expect(financialStatement).toContainText("13 (1.3)");
    await expect(
      financialStatement,
      "this user was routed to a financial statement — r. 13 (1.3) removes it " +
        "where the only support claim is child support in the table amount",
    ).not.toContainText("Form 13.1");

    const draftText = (await page.getByTestId("cs-draft-text").innerText()) || "";

    // The income survives with its qualifier. "about" is the user's own word
    // about their own certainty and must not be rounded away.
    expect(draftText).toContain(STATED_INCOME);
    expect(draftText).toContain(INCOME_BASIS);

    // No second income figure, because none was recorded. Omitted, not blank.
    expect(draftText).not.toContain("Annual income for special or extraordinary expenses");

    // ---- NO CALCULATED AMOUNT. The property, not a phrase blacklist. ----
    //
    // Every dollar figure in the rendered draft must be one this spec typed.
    // That holds for figures this spec has never seen, which a list of
    // forbidden strings would not.
    const figures = draftText.match(/\$[\d,]+(?:\.\d+)?/g) || [];
    const typed = `${STATED_INCOME} ${INCOME_BASIS}`;
    const originated = figures.filter((figure) => !typed.includes(figure));
    expect(
      originated,
      `the draft contains a dollar figure the user never entered: ${JSON.stringify(
        originated,
      )} — the table is a formula over an income a court determines, and no ` +
        "amount may be produced here",
    ).toEqual([]);

    expect(draftText).toContain("No amount of support is calculated in this document.");
    expect(draftText).not.toMatch(/per month|payable monthly/i);

    // ---- The screen survives the things that used to unmount it ----
    //
    // ChildSupportIntake and the table card were inside the `!analysis`
    // section until 2026-09-14. Both are still here after the draft is built,
    // and so is the family triage.
    await expect(page.getByTestId("child-support-intake")).toBeVisible();
    await expect(page.getByTestId("child-support-table-card")).toBeVisible();
  });
});
