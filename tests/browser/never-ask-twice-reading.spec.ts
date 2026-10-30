/**
 * NEVER ASK TWICE: THE HOME PAGE'S STORY READING, THROUGH TO THE FORM (audit row 3, site owner 28 Oct).
 *
 * The story pack opens the builder directly, or the home page with the story reading switched
 * off (the reading is a model call), so its questions -- "What we still need to know" -- are never
 * shown there, and the recorder's home-reading surface would go untested. This spec shows them,
 * with /api/case/understand answered by a fixed reading (no model, no database), answers one in
 * the person's own words, goes on to the Small Claims form, and runs the same gate as the story
 * pack (askOnce.ts factsAskedTwice + the held check, with harness/knownRepeats.ts).
 *
 * Checks: the reading's questions are recorded with the facts their words ask for (the test's own
 * table, chatQuestionFacts.ts); the answer typed is recorded as given; and no later screen asks a
 * fact the person gave there, or one the saved case holds -- unless the repeat is on the known list.
 * Failure it exists to catch: a home-page answer the rest of the site ignores (the Charter re-test,
 * 27 Oct: "what would you like the court to order?" answered at home, asked again in the chat).
 */
import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { factsAskedTwice, factsOfAsk, heldInRows, heldViolations, recordAsks, repeatViolations } from "./harness/askOnce";
import { splitKnown } from "./harness/knownRepeats";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { appendRecord } from "./harness/packRecords";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

const STORY = "I built a deck for my neighbour in Sudbury in August 2026. He agreed to pay $2,400 when it was done and never paid. I have the texts where he agreed.";
const WANTS = "What would you like the court to order?";
const WHEN = "When did this happen?";
const ANSWER = "Order him to pay the $2,400 he owes me.";

test("home reading: its questions are recorded, an answer counts as given, and nothing given there is asked again", async ({ page }) => {
  test.setTimeout(240_000);
  const run = "home-reading-sc-form";
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  let savedRows: Map<string, Record<string, unknown>> | null = null;
  const asked = await recordAsks(page, { held: () => (savedRows ? heldInRows(savedRows, "small-claims") : null) });
  const account = await fakeAccount(page);
  savedRows = account.rows;
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  // A fixed reading in place of the model's (registered last, so it answers first).
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: {
    ok: true,
    understanding: { summary: "Your neighbour did not pay for the deck you built.", facts: [], matters: [], mainCourt: "small-claims", side: "starting", stage: "Deciding whether to sue", step: "before-filing:deciding-whether-to-sue", questions: [{ question: WANTS, why: "It shapes the claim." }, { question: WHEN, why: "Dates matter." }], asksForPrediction: false, regime: null },
    answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
  } }));

  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await expect(page.getByTestId("case-understanding-questions")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel(WANTS).fill(ANSWER);
  await page.waitForTimeout(600);
  const onward = page.getByTestId("case-understanding-continue-suggested").or(page.getByTestId("case-understanding-continue-chosen")).or(page.getByRole("button", { name: /Continue/ })).first();
  await onward.click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.waitForTimeout(3_000);

  const reading = asked.filter((item) => item.kind === "ask" && item.surface === "home-reading");
  expect(reading.map((item) => item.id), "the reading's questions are recorded").toEqual(expect.arrayContaining([WANTS, WHEN]));
  expect(factsOfAsk({ surface: "home-reading", id: WANTS, text: WANTS }), "by the fact their words ask for").toContain("wants");
  expect(asked.some((item) => item.kind === "answer" && item.surface === "home-reading" && item.id === WANTS), "the answer typed is recorded as given").toBe(true);

  const violations = [...repeatViolations(factsAskedTwice(asked, STARTING_NOTHING_FILED)), ...heldViolations(asked)];
  const { known, unknown } = splitKnown(violations, run);
  const line = (item: (typeof violations)[number]) => `${item.rule} ${item.fact}: ${item.surface}:${item.id.slice(0, 100)}@${item.screen} (${item.detail})`;
  appendRecord("ask-once.jsonl", { run, asked: asked.filter((item) => item.kind === "ask").map((item) => `${item.surface}:${item.id.slice(0, 100)}@${item.screen}${item.held ? ` [held ${Object.entries(item.held).map(([fact, state]) => `${fact}=${state}`).join(",")}]` : ""}`) });
  appendRecord("never-ask-twice.jsonl", { run, story: run, known: known.map(({ violation, entry }) => ({ violation: line(violation), auditRow: entry.auditRow, reason: entry.reason })), unknown: unknown.map(line) });
  expect(unknown.map(line), "nothing given at home is asked again (known repeats excused)").toEqual([]);
});
