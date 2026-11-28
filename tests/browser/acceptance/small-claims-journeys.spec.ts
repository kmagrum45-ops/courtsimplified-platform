/**
 * THE SHARED ACCEPTANCE SCRIPT, EXECUTABLE (site owner, 27 Nov 2026, item J).
 *
 * What it checks: each Small Claims story in docs/acceptance/small-claims-journeys.md (its `json` blocks are read from
 * that file, so the doc and this test can never disagree; only the site owner changes them), followed the way the Chrome
 * tester follows it, signed in with a staging test account and the real AI the site uses. On every screen, once it has
 * settled, it reads the VISIBLE text and applies the doc's rules: (b) no question or card asks a fact the story states;
 * (c) no string the story or every story forbids; (d) the Form 7A checklist's "N of M still to add" matches the items
 * shown; (e) no console error or unhandled rejection; (f) no sentence of 60+ characters and no source citation twice on
 * one screen; (g) a value labelled "From your story" / "Confirmed from the story" is something the story says; (h) "I
 * have this" / "I don't have this" take each Form 7A item off the list; (i) every answer given is kept on the review,
 * the case page and after a reload; (j) each of three notices at most once on a screen (footer excluded); (k) stories 8
 * and 8b run in ONE account, and the second never asks the person's own details the first asked; (l) checklist items the
 * story covers are not "still to add"; (m) "Show my next step" reaches the overview within 20 seconds. A screenshot per
 * step (T<story>-<nn>.png), every screen's visible text (screens-<story>.json, re-checked offline by reevaluate.ts) and the
 * PASS/FAIL table (table-<story>.md) are saved as artifacts.
 *
 * What failure it exists to catch: a test that says "fixed" while the person's screen still shows the problem. The
 * browser test of 27 Nov 2026 (147 screenshots) found repeated questions, an invented goal and the "I have this" crash
 * while the suites were green: this script reads what the person reads.
 *
 * Run against a preview: PLAYWRIGHT_BASE_URL=<preview URL> npx playwright test tests/browser/acceptance/
 * (the preview points at staging; realTestSession.ts refuses production). STORIES=7,8 runs only those.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Request, type TestInfo } from "@playwright/test";
import { STORY_LABEL } from "../../../src/lib/case-system/copy/storyGuidance";
import { authenticateRealTestUser } from "../harness/intakeDriver";
import { deleteHarnessUser } from "../harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED, type SituationAnswers } from "../harness/situation";
import { recordInitialUnknowns, tickIfAsked } from "../harness/intakeReview";
import { chooseOffers } from "../harness/offers";
import { DOC, journeysOf, keptProblems, NOT_SURE, offeredValue, ownDetailsAgain, ownDetailsAsked, prefilledProblems, QUICK_SECONDS, screenRows, type Given, type Journey, type Row, type SavedScreen } from "./rules";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000,
  // A protected Vercel preview: the bypass the site owner sets as a secret (never kept in the repository).
  ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" } } : {}) });

/** The start answers the doc's `start` names. */
function startOf(start: string): SituationAnswers {
  const [where, a, b] = start.split(":");
  if (where === "served") return { where: "served", court: "small-claims", papers: a, receivedOn: b ? new Date(`${b}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "unknown" };
  if (where === "going") return { where: "going", court: "small-claims", started: "me", stage: [a, b].filter(Boolean).join(":") };
  return { ...STARTING_NOTHING_FILED, court: "small-claims" };
}

const visible = (page: Page, testId: string, ms: number) => page.getByTestId(testId).first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
const TYPED = "The screenshots and the emails I kept";
/** Which Small Claims screens the site under test shows (the same switch its build reads). */
const FLOW = process.env.NEXT_PUBLIC_SC_FLOW_V2 === "on" ? "v2" : "old";
/** Made-up details for the person's own boxes (rule (k)), by the Parties step's detail name. Never real. */
const OWN_TEST_DETAILS: Record<string, string> = { firstName: "Testplaintiff", lastName: "Acceptance", street: "100 Test Street", city: "Ottawa", province: "ON", postalCode: "K1A 0A1", phone: "613-555-0100", email: "acceptance.plaintiff@example.test" };
/** Chrome's second route (I1c): "Stop initial questions and review" right after the start, instead of the chat. */
const STOP_AND_REVIEW = ["8b"];
type Route = "chat" | "stop-and-review";

class Run {
  rows: Row[] = [];
  console: string[] = [];
  screens: SavedScreen[] = [];
  given: Given[] = [];
  /** What the stateful rules saw, kept with the screens (run-<story>.json) so they too are re-checked offline. */
  seen: { nextSeconds?: number; stillToAdd?: string[]; checklist?: string; startedAt: number; endedAt?: number } = { startedAt: Date.now() };
  n = 0;
  /** Every call that saves or reads the case (item D): what it was, its status or error, and how long it took. */
  saves: { at: number; method: string; url: string; status: number | string; ms: number }[] = [];
  constructor(readonly page: Page, readonly journey: Journey, readonly info: TestInfo) {
    const started = new Map<object, number>();
    const SAVE = /\/api\/cases\/|\/rest\/v1\/cases\b|\/api\/intake\/|\/api\/case\//;
    page.on("request", (request) => { if (SAVE.test(request.url())) started.set(request, Date.now()); });
    const done = (request: Request, status: number | string) => {
      const at = started.get(request);
      if (at === undefined) return;
      started.delete(request);
      this.saves.push({ at, method: request.method(), url: request.url().replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, ""), status, ms: Date.now() - at });
    };
    page.on("requestfinished", async (request) => done(request, (await request.response().catch(() => null))?.status() ?? "no response"));
    page.on("requestfailed", (request) => done(request, request.failure()?.errorText ?? "failed"));
    page.on("console", (m) => { if (m.type() === "error") this.console.push(m.text().replace(/\s+/g, " ").slice(0, 240)); });
    page.on("pageerror", (e) => this.console.push(`unhandled: ${e.message.slice(0, 240)}`));
  }
  add(step: string, screen: string, rule: string, problems: string[]) {
    this.rows.push({ step, screen, rule, pass: problems.length === 0, seen: problems.join("; ").slice(0, 600) || "ok" });
  }
  /** One screen: settle, screenshot, save its visible text, and apply the per-screen rules (rules.ts screenRows). */
  async screen(screen: string, questions: string[] = []) {
    const { page, journey } = this;
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(800);
    this.n += 1;
    const step = `T${journey.id}-${String(this.n).padStart(2, "0")}`;
    await page.screenshot({ path: this.info.outputPath(`${step}.png`), fullPage: true }).catch(() => {});
    const read = await page.evaluate(() => {
      const body = document.body.innerText;
      const footer = [...document.querySelectorAll("footer, [role=contentinfo]")].map((e) => (e as HTMLElement).innerText).join("\n");
      const emptyFields = [...document.querySelectorAll("input, textarea, select")].filter((e) => {
        const el = e as HTMLInputElement;
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && !el.disabled && !["hidden", "checkbox", "radio", "submit", "button"].includes(el.type) && !el.value;
      }).map((e) => {
        const el = e as HTMLInputElement;
        // The box's own name first ("Plaintiff (you): Phone number"), so rule (k) can tell the person's details apart.
        const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : null;
        return (el.getAttribute("aria-label") || byFor || el.closest("label")?.textContent || el.placeholder || "").replace(/\s+/g, " ").trim();
      }).filter(Boolean);
      // What is typed in boxes (rule (p): the story shown again in an edit box is not in the page's text).
      const fieldValues = [...document.querySelectorAll("input, textarea")].map((e) => (e as HTMLInputElement).value ?? "").filter((v) => v.trim().length > 0);
      return { body, footer, emptyFields, fieldValues };
    }).catch(() => ({ body: "", footer: "", emptyFields: [] as string[], fieldValues: [] as string[] }));
    const saved: SavedScreen = { step, screen, text: read.body, bodyWithoutFooter: read.footer && read.body.includes(read.footer) ? read.body.replace(read.footer, "") : read.body, questions, emptyFields: read.emptyFields, console: this.console.splice(0), fieldValues: read.fieldValues, flow: FLOW };
    this.screens.push(saved);
    this.rows.push(...screenRows(journey, saved));
    return { step, text: saved.text };
  }
  write(prefix: string, route: Route = "chat") {
    const table = ["| Story | Step | Screen | Rule | PASS/FAIL | What was seen |", "|---|---|---|---|---|---|",
      ...this.rows.map((row) => `| ${this.journey.id} | ${row.step} | ${row.screen} | ${row.rule} | ${row.pass ? "PASS" : "FAIL"} | ${row.seen.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`)].join("\n");
    this.seen.endedAt = Date.now();
    fs.writeFileSync(this.info.outputPath(`table-${prefix}.md`), table + "\n");
    fs.writeFileSync(this.info.outputPath(`screens-${prefix}.json`), JSON.stringify({ journey: this.journey.id, route, screens: this.screens }, null, 1));
    fs.writeFileSync(this.info.outputPath(`run-${prefix}.json`), JSON.stringify({ journey: this.journey.id, route, given: this.given, seen: this.seen, rows: this.rows.filter((row) => !/^\((?:b|c|e|f|g|j)\)/.test(row.rule)) }, null, 1));
    fs.writeFileSync(this.info.outputPath(`saves-${prefix}.json`), JSON.stringify(this.saves, null, 1));
    return table;
  }
}

/** The person's own boxes, filled with made-up values where a screen asks them (rule (k)); only a story that says so. */
async function fillOwnDetails(page: Page, run: Run) {
  for (const [detail, value] of Object.entries(OWN_TEST_DETAILS)) {
    const box = page.locator(`input[data-testid="parties-input-${detail}"][aria-label*="(you):"]`).first();
    if (!(await box.isVisible().catch(() => false)) || (await box.inputValue().catch(() => "x"))) continue;
    await box.fill(value);
    await box.press("Tab");
    await page.waitForTimeout(600);
    if (!run.given.some((g) => g.where === "own" && g.what === `Your ${detail}`)) run.given.push({ what: `Your ${detail}`, value, where: "own" });
  }
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
}

/** The new Small Claims flow's front half: Understood, Questions, Review, Forms (the doc's click path, new-flow version). */
async function newFlowFront(page: Page, run: Run) {
  const { journey } = run;
  const outcome = journey.answers?.outcome;
  const outcomeAsked = (q: string) => /\boutcome\b|asking the court|want the court|what do you want/i.test(q);
  // Understood: every line offered from the story; "Yes, all" for what the story states.
  if (await visible(page, "understood-lines", 120_000)) {
    const lines = await page.getByTestId("understood-line").allInnerTexts().catch(() => []);
    await run.screen("New flow: Understood", lines);
    for (const line of lines) { const offered = offeredValue(line); if (offered.value) run.given.push({ what: offered.what, value: offered.value, where: "chat-yes" }); }
    const all = page.getByTestId("understood-yes-all");
    if (await all.isVisible().catch(() => false)) await all.click();
    else await page.getByTestId("understood-continue").click().catch(() => {});
  } else await run.screen("New flow: Understood (not shown)");
  // Questions: every unknown on one page; the outcome in the story's own words, "I'm not sure" for the rest.
  await page.getByTestId("questions-left").waitFor({ timeout: 60_000 }).catch(() => {});
  await run.screen("New flow: Questions", await page.getByTestId("flow-question").allInnerTexts().catch(() => []));
  if (journey.answers?.ownDetails) await fillOwnDetails(page, run);
  const fields = await page.getByTestId("flow-question").evaluateAll((rows) => rows.map((row) => ({ field: row.getAttribute("data-question-id") ?? "", text: (row as HTMLElement).innerText }))).catch(() => [] as { field: string; text: string }[]);
  for (const { field, text } of fields) {
    if (outcome && outcomeAsked(text)) {
      await page.getByTestId(`flow-answer-${field}`).fill(outcome).catch(() => {});
      if (!run.given.some((g) => g.where === "typed")) run.given.push({ what: "Outcome", value: outcome, where: "typed" });
    } else await page.getByTestId(`flow-unsure-${field}`).click().catch(() => {});
    await page.waitForTimeout(400);
  }
  if (await page.getByTestId("questions-save").isVisible().catch(() => false)) await page.getByTestId("questions-save").click().catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await run.screen("New flow: Questions answered", await page.getByTestId("flow-question").allInnerTexts().catch(() => []));
  await page.getByTestId("questions-continue").click({ timeout: 30_000 }).catch(() => {});
  // Review: (i) what was given is in it; then confirm.
  if (await visible(page, "flow-review", 60_000)) {
    const review = await run.screen("Review", await page.getByTestId("flow-review-line").allInnerTexts().catch(() => []));
    run.add(review.step, "Review", "(i) kept", keptProblems(run.given.filter((g) => g.where === "chat-yes" || g.where === "typed"), review.text));
    await page.getByTestId("flow-review-confirm").click().catch(() => {});
  }
  // Forms: (t) it must lead on to the next step (site owner, 27 Nov 2026: "Forms leads nowhere" is a failing row).
  await page.locator("[data-testid=sc-flow][data-flow-step=forms]").waitFor({ timeout: 60_000 }).catch(() => {});
  const forms = await run.screen("New flow: Forms");
  const onward = page.getByRole("button", { name: /next step/i }).or(page.getByRole("link", { name: /next step/i }));
  run.add(forms.step, "New flow: Forms", "(t) next step reachable", (await onward.first().isVisible().catch(() => false)) ? [] : ["Forms leads nowhere: no button or link to the next step"]);
}

/** One story, start to end, in the signed-in account the page already has. */
async function follow(page: Page, run: Run, route: Route = "chat") {
  const { journey } = run;
  const id = journey.id;
  const outcome = journey.answers?.outcome;
  const outcomeAsked = (q: string) => /\boutcome\b|asking the court|want the court|what do you want/i.test(q);
  await autoAnswerSituation(page, startOf(journey.start));
  // 1. Home: the city, the story, "Continue to Small Claims intake"; the reading card.
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill(journey.city);
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(journey.story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  const card = page.getByTestId("case-understanding");
  if (await visible(page, "case-understanding", 120_000)) {
    const asks = await card.locator("[data-testid=case-understanding-questions] li label > span").allInnerTexts().catch(() => []);
    await run.screen("Home: Here is what we understood", asks);
    // The outcome, in the story's own words, when the card asks it (rule (i): it is then kept everywhere).
    const outcomeBox = card.locator("[data-testid=case-understanding-questions] li").filter({ hasText: /outcome|asking the court|want/i }).locator("input").first();
    if (outcome && (await outcomeBox.isVisible().catch(() => false))) {
      await outcomeBox.fill(outcome);
      run.given.push({ what: "Outcome", value: outcome, where: "typed" });
      await page.getByTestId("case-understanding-update").click().catch(() => {});
      await page.waitForTimeout(3_000);
      await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
      await run.screen("Home: after my answers", await card.locator("[data-testid=case-understanding-questions] li label > span").allInnerTexts().catch(() => []));
    }
    await page.getByTestId("case-understanding-continue-suggested").or(page.getByTestId("case-understanding-continue-chosen")).first().click().catch(() => {});
  }
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 120_000 });
  // 2. Start: the first-use notice.
  for (let round = 0; round < 4; round++) {
    await page.waitForTimeout(1_500);
    const notice = page.getByTestId("acknowledgement-checkbox");
    if (!(await notice.isVisible().catch(() => false))) break;
    await notice.check().catch(() => {});
    await page.getByTestId("acknowledgement-continue").click().catch(() => {});
  }
  await run.screen("Builder: start");
  // The new Small Claims flow (SC_FLOW_V2 on): Understood, Questions, Review, Forms, instead of the chat and its review.
  const v2 = FLOW === "v2" && (await page.getByTestId("sc-flow").isVisible({ timeout: 30_000 }).catch(() => false));
  if (v2) await newFlowFront(page, run);
  if (!v2) {
  // Chrome's second route (I1c): straight to "Stop initial questions and review".
  if (route === "stop-and-review") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click({ timeout: 30_000 }).catch(() => {});
  // 3. The chat, one screen per card or question.
  const choose = page.getByRole("button", { name: /Answer questions one at a time/ });
  if (route === "chat" && (await choose.first().isVisible({ timeout: 20_000 }).catch(() => false))) await choose.first().click();
  const send = page.getByTestId("guided-send-saved-story");
  if (route === "chat" && (await send.isVisible({ timeout: 10_000 }).catch(() => false))) await send.click();
  let last = "";
  for (let i = 0; route === "chat" && i < 25; i++) {
    const proposals = page.getByTestId("story-proposals");
    const suggestion = page.getByTestId("claim-type-suggestion");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    const finished = page.getByText("That's everything needed for now");
    await expect(finished.or(proposals).or(suggestion).or(question).first()).toBeVisible({ timeout: 120_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const phase = (await page.getByTestId("intake-review").getAttribute("data-phase").catch(() => null)) ?? "";
    if (/^(?:reviewing|user-confirmed)$/.test(phase) || (await finished.isVisible().catch(() => false))) break;
    if (await proposals.isVisible().catch(() => false)) {
      // Each card is a story-proposal-row (a script defect in the baseline read "li" and found none).
      const rows = await proposals.locator("[data-testid=story-proposal-row]").allInnerTexts().catch(() => []);
      await run.screen("Chat: from your story (Yes / No / I'm not sure)", rows);
      // (i): each value said Yes to is an answer the person gave.
      for (const row of rows) { const offered = offeredValue(row); if (offered.value) run.given.push({ what: offered.what, value: offered.value, where: "chat-yes" }); }
      await chooseOffers(proposals, "yes");
      await proposals.getByTestId("story-proposals-continue").click().catch(() => {});
      await page.waitForTimeout(2_000);
      continue;
    }
    if (await suggestion.isVisible().catch(() => false)) {
      await run.screen("Chat: kind of claim suggested");
      await suggestion.getByRole("button").first().click().catch(() => {});
      continue;
    }
    const text = (await question.innerText().catch(() => "")).replace(/\s+/g, " ");
    if (!text || text === last) break;
    last = text;
    await run.screen("Chat: question", [text]);
    const qid = await question.getAttribute("data-question-id").catch(() => null);
    const box = qid ? page.locator(`[data-testid=guided-answer][data-question-id="${qid}"]`) : page.getByTestId("guided-answer").last();
    if (!(await box.isVisible({ timeout: 10_000 }).catch(() => false))) break;
    const before = await page.locator("[data-testid=guided-message]").count();
    const typeOutcome = Boolean(outcome && outcomeAsked(text.split(/Why we ask/i)[0]));
    await box.fill(typeOutcome ? outcome! : NOT_SURE);
    if (typeOutcome && !run.given.some((g) => g.where === "typed")) run.given.push({ what: "Outcome", value: outcome!, where: "typed" });
    await box.locator("xpath=..").getByRole("button", { name: "Send", exact: true }).click().catch(() => {});
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 120_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  // 4. The review: (i) every value said Yes to is in its summary.
  const panel = page.getByTestId("intake-review");
  if (await visible(page, "intake-review", 60_000)) {
    if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click().catch(() => {});
    await expect(panel).toHaveAttribute("data-phase", /reviewing|user-confirmed/, { timeout: 60_000 }).catch(() => {});
    const asks = await panel.locator("[data-testid=intake-initial-question]").allInnerTexts().catch(() => []);
    const review = await run.screen("Review", asks);
    run.add(review.step, "Review", "(i) kept", keptProblems(run.given.filter((g) => g.where === "chat-yes" || g.where === "typed"), review.text));
    // The person's own details, with made-up values, where the review asks them (rule (k)): story 8 only.
    if (journey.answers?.ownDetails) {
      for (const [detail, value] of Object.entries(OWN_TEST_DETAILS)) {
        const box = page.locator(`input[data-testid="parties-input-${detail}"][aria-label*="(you):"]`).first();
        if (!(await box.isVisible().catch(() => false)) || (await box.inputValue().catch(() => "x"))) continue;
        await box.fill(value);
        await box.press("Tab");
        await page.waitForTimeout(600);
        run.given.push({ what: `Your ${detail}`, value, where: "own" });
      }
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      if (run.given.some((g) => g.where === "own")) await run.screen("Review: my details entered");
    }
    await recordInitialUnknowns(page).catch(() => {});
    await tickIfAsked(page).catch(() => {});
    await page.getByTestId("intake-confirm").click().catch(() => {});
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 }).catch(() => {});
    await run.screen("Confirmed");
  }
  }
  // 5. The next step: (m) how long it takes. The new flow's Forms step leads nowhere yet (row (t)), so the results page is
  // opened by its address, timed from there, until the new results step replaces it.
  const next = page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first();
  const clicked = v2 || (await next.isVisible({ timeout: 10_000 }).catch(() => false));
  const pressedAt = Date.now();
  if (v2) { const url = new URL(page.url()); url.searchParams.set("step", "results"); await page.goto(url.toString()); }
  else if (clicked) await next.click();
  const reached = await visible(page, "completed-case-overview", 300_000);
  run.seen.nextSeconds = Math.round((Date.now() - pressedAt) / 1000);
  run.add(`T${id}-next`, "Next step", "reached", reached ? [] : ["the next-step overview never showed"]);
  run.add(`T${id}-next`, "Next step", "(m) quick", !clicked ? ["\"Show my next step\" was not shown"] : !reached ? ["never reached"] : run.seen.nextSeconds > QUICK_SECONDS ? [`${run.seen.nextSeconds} seconds (over ${QUICK_SECONDS})`] : []);
  if (!reached) return;
  await run.screen("Next step");
  const overviewUrl = page.url();
  // 6. Form 7A: (d) the count, (l) what the story covers, (h) the two buttons on every item.
  const section = page.getByTestId("statement-of-claim-surface").first();
  if (await section.isVisible({ timeout: 60_000 }).catch(() => false)) {
    const items = section.getByTestId("form7a-still-to-add");
    const count = await items.count();
    const checklist = await section.innerText();
    const stillToAdd = (await items.allInnerTexts().catch(() => [])).map((t) => t.split("\n")[0].trim());
    run.seen.stillToAdd = stillToAdd;
    run.seen.checklist = checklist;
    const heading = checklist.match(/(\d+) of (\d+) still to add/i);
    run.add(`T${id}-7a`, "Form 7A", "(d) counts match", heading && Number(heading[1]) !== count ? [`says "${heading[0]}" with ${count} item(s) shown`] : []);
    if (journey.notStillToAdd?.length) run.add(`T${id}-7a`, "Form 7A", "(l) checklist prefilled", prefilledProblems(journey, stillToAdd, checklist));
    for (let turn = 0; turn < count; turn++) {
      const item = items.first();
      if (!(await item.isVisible().catch(() => false))) break;
      const element = (await item.getAttribute("data-element")) ?? "?";
      const label = ((await item.innerText().catch(() => "")).split("\n")[0] ?? "").trim();
      if (turn % 2 === 0) {
        await item.locator("textarea").fill(TYPED);
        await item.getByRole("button", { name: "I have this", exact: true }).click();
        run.given.push({ what: `I have this: ${label}`, value: TYPED, where: "checklist-have" });
      } else {
        await item.getByRole("button", { name: "I don't have this", exact: true }).click();
        run.given.push({ what: `I don't have this: ${label}`, value: label, where: "checklist-not" });
      }
      await page.waitForTimeout(1_000);
      const stays = await section.locator(`[data-testid=form7a-still-to-add][data-element="${element}"]`).count();
      run.add(`T${id}-7a-${turn + 1}`, "Form 7A checklist", "(h) buttons work", stays ? [`"${turn % 2 === 0 ? "I have this" : "I don't have this"}" left ${element} on the list`] : []);
      if (stays) break;
    }
    await run.screen("Form 7A after the checklist");
  }
  // 7. The case page: (i) every answer is on it.
  const caseId = new URL(page.url()).searchParams.get("intake") ?? new URL(page.url()).searchParams.get("caseId");
  if (!caseId) return;
  await page.goto(`/cases/${caseId}`);
  await page.getByTestId("case-file").or(page.getByTestId("case-review")).first().waitFor({ timeout: 90_000 }).catch(() => {});
  const casePage = await run.screen("Case page");
  run.add(casePage.step, "Case page", "(i) kept", keptProblems(run.given, casePage.text));
  // 8. Reload: (i) still there after a page reload, on the case page and on the next-step page's checklist.
  await page.reload();
  await page.getByTestId("case-file").or(page.getByTestId("case-review")).first().waitFor({ timeout: 90_000 }).catch(() => {});
  const reloaded = await run.screen("Case page after a reload");
  run.add(reloaded.step, "Case page after a reload", "(i) kept", keptProblems(run.given, reloaded.text));
  await page.goto(overviewUrl);
  if (await visible(page, "completed-case-overview", 120_000)) {
    const back = await page.getByTestId("statement-of-claim-surface").first().getByTestId("form7a-still-to-add").allInnerTexts().catch(() => []);
    const answered = run.given.filter((g) => g.where !== "chat-yes").map((g) => g.what.replace(/^I (?:have|don't have) this: /, ""));
    const reloadedOverview = await run.screen("Next step after a reload");
    run.add(reloadedOverview.step, "Next step after a reload", "(i) kept", answered.filter((label) => back.some((row) => row.split("\n")[0].trim() === label)).map((label) => `"${label}" is back on "still to add"`));
  }
}

const ALL = journeysOf(fs.readFileSync(path.join(process.cwd(), DOC), "utf8"));
const ONLY = (process.env.STORIES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const chosen = ALL.filter((j) => !ONLY.length || ONLY.includes(j.id));
// Rule (k): stories 8 and 8b run one after the other in ONE signed-in account.
const SAME_ACCOUNT = ["8", "8b"];
const groups: { journeys: Journey[]; route: Route }[] = [];
for (const journey of chosen) {
  if (SAME_ACCOUNT.includes(journey.id) && chosen.filter((j) => SAME_ACCOUNT.includes(j.id)).length === SAME_ACCOUNT.length) {
    if (journey.id === SAME_ACCOUNT[0]) groups.push({ journeys: SAME_ACCOUNT.map((id) => chosen.find((j) => j.id === id)!), route: "chat" });
  } else groups.push({ journeys: [journey], route: "chat" });
  // Chrome's second route, in its own account (I1c).
  if (STOP_AND_REVIEW.includes(journey.id) && process.env.ROUTES !== "chat") groups.push({ journeys: [journey], route: "stop-and-review" });
}

for (const { journeys: group, route } of groups) {
  test(`acceptance: Small Claims ${group.map((j) => `story ${j.id} (${j.name})`).join(" then ")}${route === "chat" ? "" : ` by "${route}"`}`, async ({ page }, info) => {
    test.setTimeout(1_200_000 * group.length);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    const runs: Run[] = [];
    try {
      for (const journey of group) {
        const run = new Run(page, journey, info);
        runs.push(run);
        try { await follow(page, run, route); } catch (error) { run.add(`T${journey.id}-stop`, "The run", "finished", [`stopped: ${String((error as Error).message ?? error).split("\n")[0].slice(0, 200)}`]); }
      }
      if (runs.length === 2) {
        const [first, second] = runs;
        second.add(`T${second.journey.id}-k`, `Same account as story ${first.journey.id}`, "(k) account details once", ownDetailsAgain(first.screens, second.screens));
        second.seen = { ...second.seen, ...{ firstAsked: ownDetailsAsked(first.screens) } } as Run["seen"];
      }
    } finally {
      const failed: string[] = [];
      for (const run of runs) {
        const table = run.write(route === "chat" ? run.journey.id : `${run.journey.id}-${route}`, route);
        await info.attach(`table-story-${run.journey.id}.md`, { body: table, contentType: "text/markdown" });
        failed.push(...run.rows.filter((row) => !row.pass).map((row) => `${row.step} ${row.screen} ${row.rule}: ${row.seen}`));
      }
      await deleteHarnessUser(userId).catch(() => {});
      expect(failed, `${group.map((j) => `story ${j.id}`).join(" and ")}: every step passes the acceptance script`).toEqual([]);
    }
  });
}
