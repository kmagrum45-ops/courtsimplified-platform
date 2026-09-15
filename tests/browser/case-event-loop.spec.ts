/**
 * The event loop, end to end in a browser: candidates appear, confirming one
 * records it, and the stage and the freshness banner move because of it.
 *
 * WHY THIS SPEC EXISTS. Every piece of this shipped working and the feature
 * still did nothing. `GET /api/cases/event-candidates` read
 * `master_result.timeline`, a key no write path has ever set, so the surface
 * resolved zero candidates on every request from the day it shipped. The
 * parser was correct and mutation-covered throughout — it was handed
 * `undefined`, and no unit check could see it because a pure function given
 * nothing behaves perfectly.
 *
 * The single assertion that would have caught it is "the candidate list is
 * non-empty", and it is only reachable from a browser against a real case.
 * That is the centre of this file; everything else is the loop it belongs to.
 *
 * A FRESH USER PER RUN, not a reused one cleaned up afterwards. Teardown that
 * fails leaves rows, and the next run passes on the previous run's data —
 * which is the shape of every silent-pass defect this codebase has found. A
 * user created seconds ago owns no cases, no case_events and no dismissals, so
 * "the candidate list is non-empty" cannot be satisfied by anything but this
 * run.
 *
 * Run: npx playwright test tests/browser/case-event-loop.spec.ts
 * The config's webServer block starts one on port 3100 and reuses an existing
 * one, so nothing needs to be running first.
 */

import { expect, test } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";
import {
  authStorageKey,
  deleteHarnessUser,
  mintRealTestSession,
} from "./harness/realTestSession";
import { SEEDED_SENTENCES, seedCaseWithTimeline } from "./harness/seedCase";
import { stubAiRoutes } from "./harness/aiStubs";

/**
 * Everything the section 3 sweep removed, as patterns a browser can re-check.
 *
 * These are worth as much as the positive assertions: the sweep deleted eleven
 * grades across the engines, and nothing else would notice one coming back
 * through a path nobody thought to re-read. A string is only a defect when a
 * user can see it, which is exactly what this can check and a unit test
 * cannot.
 */
const FORBIDDEN: Array<{ label: string; pattern: RegExp }> = [
  { label: "a percentage", pattern: /\d+\s*%/ },
  { label: "an N/100 score", pattern: /\d+\s*\/\s*100/ },
  { label: "the word readiness", pattern: /readiness/i },
  { label: "the word strongest", pattern: /strongest/i },
  { label: "the word weakest", pattern: /weakest/i },
];

async function assertNoGrades(text: string, where: string): Promise<void> {
  for (const { label, pattern } of FORBIDDEN) {
    const match = pattern.exec(text);
    expect(
      match,
      `${where} contains ${label}: ${JSON.stringify(match?.[0] ?? "")}`,
    ).toBeNull();
  }
}

test.describe("case event loop", () => {
  // Overridden for THIS spec only, not in playwright.config.ts, so the seven
  // existing specs keep the tighter caps they were written against. The
  // builder route is large and a cold next-dev compile of it exceeds the 8s
  // default navigation timeout on the first hit of a run.
  test.use({ navigationTimeout: 90_000, actionTimeout: 30_000 });

  let userId = "";

  test.afterEach(async () => {
    if (userId) await deleteHarnessUser(userId);
    userId = "";
  });

  test("candidates appear, confirming one moves the stage and dates the analysis", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // ---- A user and a case that exist only for this run ----

    await grantSiteAccess(page);
    await stubAiRoutes(page);

    const session = await mintRealTestSession();
    userId = session.userId;

    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      {
        key: authStorageKey(session.supabaseUrl),
        value: JSON.stringify(session.session),
      },
    );

    const { caseId } = await seedCaseWithTimeline(userId);

    // ---- The candidate list is NON-EMPTY, in the browser ----
    //
    // Asserted on the RENDERED surface. This spec first checked the route
    // instead, because the surface was mounted behind `analysis &&
    // canonicalIntakeSaved` and was therefore unreachable for a case that was
    // not mid-analysis. That mount condition is fixed; the surface now mounts
    // on caseId alone, which is all it ever needed.
    //
    // The route is still checked below, after the render, because the two
    // failures are different: an empty RENDER can mean the mount condition
    // regressed, and an empty ROUTE means the read location regressed. The
    // second is the bug that shipped.
    // Authorization ONLY. The site-access cookie is deliberately not set here:
    // `page.request` shares the browser context's cookie jar, which
    // grantSiteAccess has already loaded, and an explicit Cookie header
    // REPLACES the jar's value for that request rather than adding to it.
    //
    // This spec previously set `cs_site_access` from
    // `process.env.SITE_ACCESS_PASSWORD`, which is empty in the Playwright
    // process — next dev loads .env.local, the test runner does not, which is
    // the whole reason siteAccess.ts reads the file itself. So the header
    // overwrote a working cookie with an empty one and the route answered
    // "Site access required." for every run this spec has ever had.
    const authed = {
      Authorization: `Bearer ${session.session.access_token}`,
    };

    await page.goto(`/builder?path=small-claims&caseId=${caseId}`);

    const surface = page.getByTestId("event-candidate-surface");
    await expect(
      surface,
      "the candidate surface did not render. It returns null when it resolves zero " +
        "candidates, so an empty list and a broken mount look identical from outside — " +
        "check the route assertion below to tell them apart",
    ).toBeVisible({ timeout: 30_000 });

    const rendered = page.getByTestId("event-candidate");
    await expect(rendered).not.toHaveCount(0);

    const renderedSentences = await page
      .getByTestId("event-candidate-sentence")
      .allInnerTexts();
    expect(
      renderedSentences.some((text) => text.includes(SEEDED_SENTENCES[0])),
      `no rendered candidate carried the seeded sentence. Saw: ${JSON.stringify(renderedSentences)}`,
    ).toBe(true);

    const candidateResponse = await page.request.get(
      `/api/cases/event-candidates?caseId=${caseId}`,
      { headers: authed },
    );
    expect(candidateResponse.ok(), await candidateResponse.text()).toBe(true);

    const candidateBody = (await candidateResponse.json()) as {
      candidates?: Array<{ narrativeBasis?: string; state?: string }>;
    };
    const resolved = candidateBody.candidates || [];

    expect(
      resolved.length,
      "zero candidates for a case whose masterCase.timeline has two sentences — " +
        "this is the empty-forever shape the surface shipped with",
    ).toBeGreaterThan(0);

    // Not just "some rows" — the sentences seeded into masterCase.timeline.
    // This user is seconds old, so there is nowhere else for one to come from.
    expect(
      resolved.some((item) => (item.narrativeBasis || "").includes(SEEDED_SENTENCES[0])),
      `no candidate carried the seeded sentence. Saw: ${JSON.stringify(resolved.map((r) => r.narrativeBasis))}`,
    ).toBe(true);

    // ---- Confirming one records it, by clicking ----

    const target = page
      .getByTestId("event-candidate")
      .filter({ hasText: SEEDED_SENTENCES[0] })
      .first();

    await target.getByTestId("event-candidate-type").selectOption("claim-served");
    await target.getByTestId("event-candidate-confirm").click();

    // It moves out of the prompt and into "already decided", as confirmed.
    await expect(
      page.getByTestId("event-candidate-decided").first(),
      "the candidate did not move to confirmed after clicking Record this",
    ).toHaveAttribute("data-state", "confirmed", { timeout: 20_000 });

    // ---- The stage moved, and moved BECAUSE of the event ----

    await page.goto(`/case-timeline?caseId=${caseId}`);
    await expect(page.getByTestId("case-timeline-heading")).toBeVisible({ timeout: 30_000 });

    const stage = page.getByTestId("case-stage");
    await expect(stage).toBeVisible();

    // The seeded case has no intakeFacts, so before any event the stage can
    // only be "unknown". A stage that is no longer unknown can only have come
    // from the event just confirmed.
    await expect(
      stage,
      "the stage is still unknown after confirming claim-served — the event is not reaching deriveCaseStageWithEvents",
    ).not.toHaveAttribute("data-stage", "unknown");

    await expect(page.getByTestId("recorded-event")).not.toHaveCount(0);
    await expect(page.getByTestId("recorded-event").first()).toHaveAttribute(
      "data-event-type",
      "claim-served",
    );

    // ---- The analysis is now dated, and says so ----

    // derivedFrom is the other field that returned the same answer forever:
    // with nothing written, every case read "never-analyzed" and this banner
    // could not fire at all.
    await expect(
      page.getByTestId("analysis-freshness-banner"),
      "no freshness banner after recording an event — the stored analysis has not noticed it",
    ).toBeVisible({ timeout: 20_000 });

    // ---- Nothing in the rendered flow grades the case ----

    await assertNoGrades(
      (await page.locator("body").innerText()) || "",
      "the timeline screen",
    );

    await page.goto(`/builder?path=small-claims&caseId=${caseId}`);
    await page.waitForLoadState("networkidle");
    await assertNoGrades(
      (await page.locator("body").innerText()) || "",
      "the builder screen",
    );
  });
});

/*
 * FIXED, and why the fix was one line of condition rather than a rewrite.
 *
 * EventCandidateSurface was mounted behind `analysis && canonicalIntakeSaved`.
 * Both are React state: `analysis` starts null, is set only by handleComplete
 * after an analysis run, and is reset to null whenever an existing case loads.
 * A user who ran intake, saw candidates, answered none and reloaded never saw
 * them again — still unanswered server-side, rendered by nothing.
 *
 * That defeated the decision the schema was built around: unanswered
 * candidates never expire, because silence is not "no". They did not expire.
 * They became invisible, which is worse, because the record says they are
 * still open.
 *
 * The surface needed NOTHING from `analysis`. Its only prop is caseId and it
 * fetches its own state. The gate was incidental — it was placed inside that
 * block for layout and inherited a condition that had nothing to do with it.
 * It now mounts on caseId alone.
 *
 * STILL GATED, deliberately: StatementOfClaimSurface. It takes `mappedInput`,
 * a SmallClaimsIntelligenceInput built during the run, and no load path
 * reconstructs one. `master_result.intakeData` holds the StoredCaseData the
 * run saved, which carries most of the same values in a different shape, so a
 * mapping is possible — but the surface's own design note says party details
 * are merged in rather than inferred, precisely so an empty field stays empty
 * and the draft emits "[... to be confirmed]". A rehydration that guessed at
 * party fields would break that, so it is reported rather than assumed. See
 * OUTSTANDING_ISSUES.
 */
