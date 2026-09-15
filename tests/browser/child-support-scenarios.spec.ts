/**
 * Two child support scenarios past the common case.
 *
 * Run: npx playwright test tests/browser/child-support-scenarios.spec.ts
 *
 * ---------------------------------------------------------------------------
 * SCOPE NOTE ON THE FIRST SCENARIO — READ BEFORE EXTENDING IT
 * ---------------------------------------------------------------------------
 *
 * It was scoped as "the residence answer selects that province's table". That
 * is NOT implemented and this spec does not pretend otherwise. The residence
 * answer is free text that reaches the draft as the respondent's address for
 * service and nothing reads it for any other purpose.
 *
 * Asserting "the table shown is not Ontario's by default" today would pass for
 * the wrong reason — no table is shown and no province is named as applicable,
 * so the assertion would hold because the feature is absent. That is a check
 * that cannot fail, which is the pattern this repo has spent the session
 * removing.
 *
 * What IS asserted is the property that actually holds and that a future change
 * could break: the rule is quoted so the user can apply it, and the site never
 * applies it for them. s. 2 (1) (b) is on the page for a user whose payor lives
 * elsewhere; nothing tells them which province's table is theirs. Whether it
 * SHOULD is a CLAUDE.md section 2 question — the system stating "your table is
 * Alberta's" is applying a statutory definition to the user's facts — and it is
 * reported rather than decided here.
 */

import { expect, test } from "@playwright/test";

import { openBuilder } from "./harness/builderGate";

test.describe("child support scenarios", () => {
  test.use({ navigationTimeout: 90_000, actionTimeout: 30_000 });

  /**
   * The payor lives in another province.
   *
   * O. Reg. 391/97 s. 2 (1) (b): where the parent or spouse against whom an
   * order is sought ordinarily resides elsewhere in Canada, the table is the
   * federal one for THAT province or territory. A user in Ontario whose payor
   * lives in Alberta needs the Alberta table.
   */
  test("payor in another province: the rule is quoted, and the site does not pick for them", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await openBuilder(page, "family", {
      city: "Thunder Bay",
      story:
        "The other parent moved to Calgary last year and has not contributed to our daughter since.",
    });

    await expect(page.getByTestId("child-support-intake")).toBeVisible({ timeout: 60_000 });

    // The residence question carries its reason, and the reason is the payor's
    // residence rather than the applicant's or the court's.
    const reason = page.getByTestId("cs-residence-reason");
    await expect(reason).toBeVisible();
    await expect(reason).toContainText("the parent the order is sought against");
    await expect(reason).toContainText("If they live outside Ontario");

    await page.getByTestId("cs-applicant-name").fill("Priya Raman");
    await page.getByTestId("cs-applicant-address").fill("22 Algoma Street, Thunder Bay ON");
    await page.getByTestId("cs-respondent-name").fill("Mark Deveau");
    await page.getByTestId("cs-respondent-address").fill("Calgary, Alberta");
    await page.getByTestId("cs-children").fill("One daughter, aged 4, in daycare.");
    await page
      .getByTestId("cs-parenting-time")
      .fill("She lives with me full time. He has not seen her since he moved.");
    await page.getByTestId("cs-income-table").fill("about $72,000");
    await page.getByTestId("cs-income-table-basis").fill("what he told me he earns");
    await page.getByTestId("cs-table-only-yes").click();

    // ---- The rule that applies to THIS user is on the page ----
    //
    // Paragraph (b), the elsewhere-in-Canada branch, quoted verbatim. Without
    // it a user in this position reads only paragraph (a) and concludes the
    // Ontario table is theirs.
    const card = page.getByTestId("child-support-table-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText(
      "ordinarily resides elsewhere in Canada, the table set out in the Federal Child Support Guidelines for the province or territory in which the parent or spouse ordinarily resides",
    );

    // ---- And the site does not apply it for them ----
    //
    // The property, asserted over the whole rendered page rather than one
    // element: nothing anywhere states which province's table is this user's.
    // This is what a "helpful" table selector would break.
    await page.getByTestId("cs-build-draft").click();
    await expect(page.getByTestId("cs-draft")).toBeVisible({ timeout: 20_000 });

    const pageText = (await page.locator("body").innerText()) || "";

    for (const claim of [
      /your table is/i,
      /the table that applies to you/i,
      /your province's table/i,
      /use the (Ontario|Alberta) table/i,
      /you (should|must|will) use the .{0,20}table/i,
    ]) {
      expect(
        claim.test(pageText),
        `the page tells the user which table is theirs, matching ${claim} — ` +
          "s. 2 (1) is quoted so the user can apply it; the system applying it " +
          "to their facts is the line in CLAUDE.md section 2",
      ).toBe(false);
    }

    // Nor does the draft name a province as the applicable one.
    const draftText = (await page.getByTestId("cs-draft-text").innerText()) || "";
    expect(draftText).not.toMatch(/applicable table (is|for) (Ontario|Alberta)/i);

    // What the draft DOES carry is their own answer, verbatim.
    expect(draftText).toContain("Calgary, Alberta");
  });

  /**
   * No income figure available.
   *
   * THE ASSERTION THAT MATTERS IS THAT NOTHING IS BLOCKED. Recorded as the
   * section 32 regression guard: a user who cannot supply a figure must still
   * reach a document. The whole child support design rests on the draft being
   * safe to produce incomplete — "No figure recorded" is doing its job, because
   * the figure is one a court determines regardless.
   *
   * There is deliberately no readiness gate on this path (section 0b), so the
   * failure this guards against would have to be introduced: someone adding a
   * gate, or disabling the build button until the field is filled.
   */
  test("no income figure: the draft is produced, says so, and carries the s. 21 checklist", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await openBuilder(page, "family", {
      city: "Windsor",
      story: "I need child support but I have no idea what the other parent earns.",
    });

    await expect(page.getByTestId("child-support-intake")).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("cs-applicant-name").fill("Joanne Whitefish");
    await page.getByTestId("cs-applicant-address").fill("101 Ouellette Avenue, Windsor ON");
    await page.getByTestId("cs-respondent-name").fill("Terry Blake");
    await page.getByTestId("cs-respondent-address").fill("Windsor, Ontario");
    await page.getByTestId("cs-children").fill("Two boys, 11 and 13, both at school.");
    await page
      .getByTestId("cs-parenting-time")
      .fill("They are with me all the time. He sees them when he wants to.");

    // The income question is left EMPTY, and the documents question too. This
    // is the user who does not have the information and cannot get it.
    await expect(page.getByTestId("cs-income-table")).toHaveValue("");
    await expect(page.getByTestId("cs-documents")).toHaveValue("");

    // ---- NOTHING IS BLOCKED. The regression guard. ----

    const build = page.getByTestId("cs-build-draft");
    await expect(
      build,
      "the build button is disabled with no income figure — a user who cannot " +
        "supply one must still reach a document; the draft is safe to produce " +
        "incomplete and that is the whole design",
    ).toBeEnabled();

    await build.click();
    await expect(
      page.getByTestId("cs-draft"),
      "no draft was produced without an income figure",
    ).toBeVisible({ timeout: 20_000 });

    const draftText = (await page.getByTestId("cs-draft-text").innerText()) || "";

    // ---- It says so, rather than leaving a blank ----

    expect(draftText).toContain("No figure recorded");
    expect(
      draftText,
      "the draft left the income line blank instead of saying nothing is recorded",
    ).not.toMatch(/Annual income for the table amount:\s*$/m);

    // ---- And points at what s. 21 requires, which is where a figure comes from ----
    //
    // Whitespace-normalised. The draft is hard-wrapped to a fixed column so it
    // reads as a document, which puts line breaks inside phrases — "each of the
    // three most recent\ntaxation years". Matching the raw text would make
    // these assertions depend on the wrap width, so re-wrapping the draft for
    // legibility would fail a check about what it SAYS. That is a check pinned
    // to a current value rather than a property (CLAUDE.md section 5).
    const flat = draftText.replace(/\s+/g, " ");

    expect(flat).toContain("s. 21");
    expect(flat).toContain("notices of assessment");
    expect(flat).toContain("three most recent taxation years");

    // ---- Still no invented figure. The property, over the whole draft. ----
    //
    // This user typed no number at all, so ANY dollar figure in the draft
    // originated in the software.
    const figures = draftText.match(/\$[\d,]+(?:\.\d+)?/g) || [];
    expect(
      figures,
      `the draft contains dollar figures for a user who entered none: ${JSON.stringify(
        figures,
      )}`,
    ).toEqual([]);

    // ---- THE PANEL, which this scenario previously could not assert ----
    //
    // It used to be a comment here saying the list did NOT mention the missing
    // income, and that encoding that would make fixing it look like a
    // regression. It is fixed: `stillNeeded` now answers "what does this
    // application need" rather than "what is bracketed", so the income and the
    // s. 21 documents reach it even though they render in prose.
    //
    // This is the assertion that makes the panel's absence mean something. A
    // user with no income figure and no documents is the person with the most
    // missing from their draft, and they are exactly who used to see no panel.
    const stillNeeded = page.getByTestId("cs-draft-still-needed");
    await expect(
      stillNeeded,
      "no outstanding-items panel for a user who supplied neither an income " +
        "figure nor any documents — its absence means nothing is outstanding, " +
        "so it must not be absent here",
    ).toBeVisible();

    await expect(stillNeeded).toContainText("income figure");
    await expect(stillNeeded).toContainText("s. 21");
  });
});
