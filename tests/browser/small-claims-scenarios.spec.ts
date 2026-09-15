/**
 * SC-2 and SC-3 from docs/SCENARIOS.md — the two fully writable today.
 *
 * Run: npx playwright test tests/browser/small-claims-scenarios.spec.ts
 *
 * DETERMINISTIC AND FREE. Signed out, so `/api/small-claims/analyze` takes its
 * no-model path and the assertions are about what the engine produces rather
 * than about a stub. See `harness/smallClaimsDriver.ts`.
 */

import { expect, test } from "@playwright/test";

import {
  clickGenerateSummary,
  deleteHarnessUser,
  fillSmallClaimsIntake,
  openSmallClaimsForm,
  signInHarnessUser,
  stubSmallClaimsAnalyze,
} from "./harness/smallClaimsDriver";

/**
 * SC-2's whole point, in one string.
 *
 * "about" is the user's own hedge about their own certainty. "plus what I paid
 * the bailiff" is a second head of claim they have not totalled. Both are
 * statements about their case, made by them, and display code that tidies them
 * into `$6,187.00` would be changing what they said with no way for them to see
 * it happened.
 */
const AMOUNT = "about $6,000 plus what I paid the bailiff";

/** Every figure the spec types. Nothing else may appear as a dollar amount. */
const TYPED_FIGURES = ["$6,000"];

test.describe("Small Claims scenarios", () => {
  test.use({ navigationTimeout: 90_000, actionTimeout: 30_000 });

  let userId = "";
  test.afterEach(async () => {
    if (userId) await deleteHarnessUser(userId);
    userId = "";
  });

  /**
   * SC-2 · Personal loan, amount with a qualifier.
   */
  test("SC-2: a qualified amount survives to the overview, and nothing is totalled", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    userId = await signInHarnessUser(page);
    await stubSmallClaimsAnalyze(page);
    await openSmallClaimsForm(page, { city: "London" });

    await fillSmallClaimsIntake(page, {
      caseStage: "starting-case",
      yourRole: "Plaintiff / claimant",
      yourName: "Alina Kovacs",
      otherParty: "Dmitri Kovacs",
      facts:
        "I lent my cousin 6000 in march 2024 so he could cover rent he said in a text " +
        "he would pay me back by september. he paid nothing and now wont answer. I also " +
        "paid a bailiff 187 to try and serve him",
      timeline:
        "March 2024 I transferred the money. September 2024 was when he said he would repay. " +
        "Nothing since.",
      evidence: "The text where he says he will pay me back by September. My bank transfer.",
      goal: "Money",
      amountClaimed: AMOUNT,
      damagesBreakdown: "The loan, and what the bailiff charged me",
    });

    await clickGenerateSummary(page);
    await expect(page.getByTestId("case-overview")).toBeVisible({ timeout: 60_000 });

    const overview = page.getByTestId("case-overview");
    await expect(overview).toBeVisible();

    // ---- THE ASSERTION THIS SCENARIO EXISTS FOR ----

    await expect(
      overview,
      "the amount was altered on its way to the screen. It is the user's own " +
        "statement about their own claim and must reach the page as they wrote it",
    ).toContainText(AMOUNT);

    const overviewText = (await overview.innerText()) || "";

    // Not a blacklist of wrong totals. The property: every dollar figure
    // ATTRIBUTED TO THIS CLAIM must be one this spec typed. Holds for totals
    // the spec has never seen — $6,187.00, $6,187, anything arithmetic makes.
    //
    // Scoped to the "Amount recorded:" line rather than the page, and the
    // first run is why: a page-wide version failed on $50,000, $35,000 and
    // $10,000, which are the Small Claims monetary jurisdiction and the LTB
    // cap, quoted with citations and present for every user. Sourced law is not
    // an invented figure, and a check that cannot tell them apart would have to
    // be silenced rather than fixed.
    const amountLine = /Amount recorded:[^.]*\./.exec(overviewText)?.[0] || "";
    expect(
      amountLine,
      "no 'Amount recorded:' line on the overview — the amount did not reach " +
        "the panel at all",
    ).not.toEqual("");

    const figures = amountLine.match(/\$[\d,]+(?:\.\d+)?/g) || [];
    const originated = figures.filter(
      (figure) =>
        !TYPED_FIGURES.some((typed) => figure === typed || figure === `${typed}.00`),
    );
    expect(
      originated,
      `a dollar figure is attributed to this claim that the user never entered: ` +
        `${JSON.stringify(originated)} (line: ${JSON.stringify(amountLine)}). ` +
        "Either the amount was reformatted, or something totalled the loan and " +
        "the bailiff cost the user deliberately did not total",
    ).toEqual([]);

    // The qualifier specifically. `formatRecordedAmount` passes a qualified
    // string through untouched and formats only a bare number, so the bare
    // form appearing is the defect this guards.
    expect(
      overviewText,
      "the amount rendered as a formatted bare figure, dropping 'about' and the " +
        "bailiff cost",
    ).not.toMatch(/\$6,000\.00(?! plus)/);

    // No arithmetic anywhere on the page, not just in the amount field.
    const pageText = (await page.locator("body").innerText()) || "";
    for (const total of ["6187", "6,187", "$6,187"]) {
      expect(
        pageText.includes(total),
        `the page contains ${total} — 6000 + 187, a sum the user did not make`,
      ).toBe(false);
    }

    // No grade of any kind reached the screen.
    for (const pattern of [/\d+\s*%/, /\d+\s*\/\s*100/, /readiness/i, /strongest/i, /weakest/i]) {
      expect(pattern.test(pageText), `the overview contains ${pattern}`).toBe(false);
    }
  });

  /**
   * SC-3 · Contractor damage, evidence missing.
   *
   * NOT the same test as FS-4, though both end with a document the user can
   * reach. SC-3 is about a gate OPENING; FS-4 is about there being no gate to
   * open, because the family path has none (OUTSTANDING_ISSUES section 0b).
   * Read as one property, a change breaking one would look covered by the other.
   *
   * What is asserted here is the half that does not need the Statement of Claim
   * surface: a user who cannot supply the central figure still reaches the
   * overview, and nothing on it invents one or treats the absence as a failure.
   * The gate itself lives behind `draftInput`, which no load path reconstructs
   * (section 27), so it is out of reach of this driver and is not asserted.
   */
  test("SC-3: an unavailable figure is recorded as absent, and nothing is invented", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    userId = await signInHarnessUser(page);
    await stubSmallClaimsAnalyze(page);
    await openSmallClaimsForm(page, { city: "Barrie" });

    await fillSmallClaimsIntake(page, {
      caseStage: "starting-case",
      yourRole: "Plaintiff / claimant",
      yourName: "Rosalie Ferland",
      otherParty: "Keswick Renovations",
      facts:
        "a contractor doing my bathroom cracked the tile in the hallway and put a hole " +
        "in the drywall. he says it was already like that. I dont have a quote yet for " +
        "the repair",
      timeline: "He worked on the bathroom over two weeks in August. I noticed the tile after.",
      evidence: "Photos of the cracked tile and the hole. The invoice for the bathroom work.",
      missingEvidence: "A quote for the repair. I don't know what it will cost.",
      goal: "Money to put the damage right",
      // The central figure, deliberately not supplied.
      amountClaimed: "",
    });

    await clickGenerateSummary(page);
    await expect(page.getByTestId("case-overview")).toBeVisible({ timeout: 60_000 });

    const overview = page.getByTestId("case-overview");
    await expect(
      overview,
      "no overview for a user who could not supply the loss amount — an " +
        "unavailable figure must not be a dead end",
    ).toBeVisible();

    const pageText = (await page.locator("body").innerText()) || "";

    // ---- Nothing invented ABOUT THIS CASE ----
    //
    // Scoped to what the page says about this user's claim, not to the whole
    // page, and the first run is why. A whole-page version failed on $50,000,
    // $35,000 and $10,000 — the Small Claims monetary jurisdiction and the LTB
    // cap, quoted with citations in the court-points and jurisdiction-route
    // cards. Those are sourced statements of law that appear for every user and
    // say nothing about this one.
    //
    // "No dollar figure anywhere" was the wrong property. The right one is that
    // no figure is attributed to THIS USER'S CLAIM. The panel renders exactly
    // one such line — "Amount recorded: ..." — and for a user who entered no
    // amount it must not render at all.
    expect(
      pageText,
      "an amount is attributed to a user who entered none — the panel renders " +
        "'Amount recorded:' only when the intake carried one",
    ).not.toMatch(/Amount recorded:/);

    // ---- And the absence is not dressed up as a deficiency ----

    for (const pattern of [
      /your claim is weak/i,
      /you (should|must) (get|obtain) a quote/i,
      /without (a|this) (quote|figure) you cannot/i,
    ]) {
      expect(
        pattern.test(pageText),
        `the overview characterises the missing figure, matching ${pattern} — ` +
          "not having a quote yet is a fact about their records, not a judgment " +
          "about their case",
      ).toBe(false);
    }

    for (const pattern of [/\d+\s*%/, /\d+\s*\/\s*100/, /readiness/i, /strongest/i, /weakest/i]) {
      expect(pattern.test(pageText), `the overview contains ${pattern}`).toBe(false);
    }
  });
});
