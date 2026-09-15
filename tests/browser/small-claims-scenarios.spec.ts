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

  /**
   * SC-1 · Defamation — the evidence panel's citation guard.
   *
   * THE REGRESSION THIS GUARDS. The live walkthrough found "Pattern of
   * harassment" in the evidence checklist: an item with no basis in the user's
   * story and no source behind it, produced by a fallback that read the model's
   * free-form output. The fix removed the fallback, so the list is either the
   * claim type's own sourced content or EMPTY.
   *
   * CLAIM-TYPE-DERIVED, SO THE STUB DOES NOT TOUCH IT.
   * `buildClaimTypeOverviewContent(facts)` matches on `intake.facts` — the
   * story this spec types — and the analysis contributes nothing but the court
   * path. See the stub header in harness/smallClaimsDriver.ts.
   *
   * SC-1's remaining steps — the r. 11 card on default, Form 7A suppressed
   * after filing — need recorded events this driver does not reach. They stay
   * unwritten rather than half-asserted.
   */
  test("SC-1: every evidence item carries a source, or the list is empty", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    userId = await signInHarnessUser(page);
    await stubSmallClaimsAnalyze(page);
    await openSmallClaimsForm(page, { city: "Kingston" });

    await fillSmallClaimsIntake(page, {
      caseStage: "starting-case",
      yourRole: "Plaintiff / claimant",
      yourName: "Noor Haddad",
      otherParty: "Cassandra Pike",
      facts:
        "my uncles ex girlfriend sent messeges to him and my dad saying i was a " +
        "prostitute but these statements are false and she said it to discredit me " +
        "during a custody arguement between my uncle and his baby mom. it caused my " +
        "boyfriend to break up with me and made my family worried and asked me lots of " +
        "questions",
      timeline: "She sent the messages in May. My boyfriend ended things in June.",
      evidence: "Screenshots of the messages my uncle forwarded to me.",
      goal: "Money",
      amountClaimed: "$10,000.00",
    });

    await clickGenerateSummary(page);
    await expect(page.getByTestId("case-overview")).toBeVisible({ timeout: 60_000 });

    const overview = page.getByTestId("case-overview");

    // ---- THE GUARD ----
    //
    // Every item under "Evidence to organize or confirm" carries a (Source)
    // link, or the heading does not appear. Asserted as a property over
    // whatever items are present, so it holds for items this spec has never
    // seen — which a blacklist of "pattern of harassment" would not.
    // NOT GUARDED BY `if (heading exists)`. An earlier version was, and it
    // passed in 4.2s — which is indistinguishable from a run where the heading
    // never rendered and the whole guard was skipped. A conditional guard is a
    // check that cannot fail whenever its condition is false.
    //
    // This story matches the defamation claim type, which carries sourced
    // evidence content, so the heading MUST be present. If a future change
    // means it legitimately is not, this fails and says so — which is the
    // conversation worth having, rather than silently asserting nothing.
    await expect(
      overview.getByText("Evidence to organize or confirm", { exact: true }),
      "no evidence checklist for a story that matches the defamation claim " +
        "type — either the match broke, or the claim type lost its sourced " +
        "content. Both matter; neither should pass quietly",
    ).toBeVisible();

    const items = overview
      .locator("h3", { hasText: "Evidence to organize or confirm" })
      .locator("xpath=following-sibling::ul[1]/li");

    const total = await items.count();
    expect(
      total,
      "the heading rendered with no items under it — an empty list must not " +
        "render its heading",
    ).toBeGreaterThan(0);

    for (let index = 0; index < total; index += 1) {
      const item = items.nth(index);
      const text = (await item.innerText()) || "";
      await expect(
        item.getByRole("link", { name: "Source" }),
        `evidence item without a source: ${JSON.stringify(text)}. The fallback ` +
          "that produced unsourced items was removed — the list is the claim " +
          "type's own sourced content or it is empty",
      ).toHaveCount(1);
    }

    // The specific invention the walkthrough found, kept as a named case
    // alongside the property rather than instead of it.
    const pageText = (await page.locator("body").innerText()) || "";
    expect(
      /pattern of harassment/i.test(pageText),
      "'Pattern of harassment' is back — an evidence item with no basis in the " +
        "story and no source behind it",
    ).toBe(false);

    for (const pattern of [/\d+\s*%/, /\d+\s*\/\s*100/, /readiness/i, /strongest/i, /weakest/i]) {
      expect(pattern.test(pageText), `the overview contains ${pattern}`).toBe(false);
    }
  });

  /**
   * SC-5 · Wrong tribunal.
   *
   * Jurisdiction routes ship as GENERAL INFORMATION with no matching against
   * the user's facts. `JURISDICTION_ROUTES` is static sourced data the panel
   * renders in full, so the stub touches none of it.
   *
   * A false positive here sends someone to the wrong forum. The decision
   * recorded in jurisdictionRoutes.ts is that matching was attempted, measured
   * and abandoned: against three plainly-worded stories only one matched at
   * all, and it matched on the words "my landlord" — which this story contains.
   */
  test("SC-5: jurisdiction routes are general information, not a decision about this case", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    userId = await signInHarnessUser(page);
    await stubSmallClaimsAnalyze(page);
    await openSmallClaimsForm(page, { city: "Oshawa" });

    await fillSmallClaimsIntake(page, {
      caseStage: "starting-case",
      yourRole: "Plaintiff / claimant",
      yourName: "Devon Marsh",
      otherParty: "My landlord",
      facts:
        "my landlord hasnt fixed the heat since november and now hes trying to evict me " +
        "for complaining. I want to sue him",
      timeline: "The heat went in November. The eviction notice came in February.",
      evidence: "Texts asking him to fix it. A photo of the thermostat.",
      goal: "Money, and for him to fix the heat",
    });

    await clickGenerateSummary(page);
    await expect(page.getByTestId("case-overview")).toBeVisible({ timeout: 60_000 });

    const overview = page.getByTestId("case-overview");

    await expect(
      overview.getByText("Situations that usually belong somewhere other than Small Claims", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      overview,
      "the caption that makes these information rather than a finding is missing",
    ).toContainText("nothing here has been matched against what you recorded");

    // The LTB route is present — a user whose situation it describes must be
    // able to find it — and so are the others. Filtering to the one that
    // appears to apply would write a conclusion into the experience without
    // ever stating it.
    const overviewText = (await overview.innerText()) || "";
    expect(overviewText).toContain("Landlord and Tenant Board");
    expect(
      overviewText,
      "the other routes were filtered out, leaving only the one that looks like " +
        "this user's situation",
    ).toContain("Superior Court of Justice");
    expect(overviewText).toContain("Insurance Act");

    // ---- And nothing says it belongs there ----

    const pageText = (await page.locator("body").innerText()) || "";
    for (const claim of [
      /your (case|matter|claim|dispute) belongs/i,
      /you (should|must|need to) (apply|go) to the (LTB|Landlord)/i,
      /this (matter|case|claim) (belongs|goes) to the (LTB|Landlord)/i,
      /small claims (court )?(cannot|can't) hear (your|this)/i,
      /based on what you (told us|recorded)[^.]{0,60}(LTB|Landlord and Tenant)/i,
    ]) {
      expect(
        claim.test(pageText),
        `the page states where this user's matter belongs, matching ${claim} — ` +
          "the routes are surfaced as information and the user applies them",
      ).toBe(false);
    }

    const selected = overview.locator("[data-selected='true'], [aria-selected='true']");
    await expect(
      selected,
      "a jurisdiction route is marked as selected for this user",
    ).toHaveCount(0);
  });
});
