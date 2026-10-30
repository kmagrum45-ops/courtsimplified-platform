/**
 * THE END-TO-END CARRY TEST: ONE STORY, CARRIED FROM INTAKE THROUGH EVERY QUESTION AND STEP
 * (site owner, 30 Oct: "a fact given once is known everywhere, never asked again, never refilled
 * after the person removed it, never shown on the wrong case").
 *
 * WHAT IT CHECKS. Twelve runs: each court (Small Claims, civil, Family) through each route (the
 * questions one at a time, the review then "Show my next step", the whole form); Small Claims (the
 * owner's demo court) guest AND signed in on every route, civil and Family guest or signed
 * in. Each run: gives the story; answers each question once; gives two tracked facts in the form
 * (a value to CHANGE later and a value to REMOVE later, both typed by the person and absent from
 * the story, so seeing them anywhere is unambiguous); reloads; a guest signs in from the builder
 * (the guest -> account carry); confirms and opens the next step (the overview, and the Form 7A
 * section for Small Claims); the case page ("What we have so far", "Check my case file"); changes
 * one value and removes the other on the form; reloads and walks every screen again; starts a
 * second case in the same tab; goes back to the first through the dashboard and its address.
 * It counts four things and prints them on one fixed line, also written to carry-records/:
 *   CARRY COUNTS <run> asked-twice=N returned-after-removal=N wrong-case=N screens-disagree=N
 *   (1) asked-twice: the story pack's recorder (harness/askOnce.ts factsAskedTwice + heldViolations,
 *       the held check reading the saved staging row through caseFileOf), per case;
 *   (2) returned-after-removal: the removed value shown, refilled or offered on any screen after removal;
 *   (3) wrong-case: a page addressed to one case (its id in the address) showing the other case's
 *       marker or values, or the second case opening under the first case's id;
 *   (4) screens-disagree: one fact read from each screen showing a value other than the one the person
 *       gave (or the old one after a change), including the same screen before and after a reload or sign-in;
 *       and on every Small Claims route, the Form 7A section not drawn after "Show my next step" (owner,
 *       30 Oct: it must appear on every route) -- fact "form-7a-section", screen "form-7a (<when>)".
 *
 * WHAT FAILURE IT CATCHES. Any of the four not on the baseline (harness/carryBaseline.json, each entry
 * with its fact and reason) fails the run; a baseline entry no run matched is reported as stale
 * (scripts/browser/carryTotals.ts). verifyCarryBaseline.ts (CI typecheck job) rejects a PR that adds a
 * baseline entry compared with origin/main, so the counts only go down; with the file empty the test
 * asserts zero. A step the test could not reach (a screen missing, a button renamed) also fails the run:
 * a count from a run that never reached the screen is not a zero.
 *
 * THE REAL SAVE PATH (site owner, 29 Oct). Real page typing; every save through the site's own routes
 * and client code to the real STAGING database (realTestSession.ts refuses production); real staging
 * accounts (a fresh one per run, deleted after); the guest signs in through the site's own login form.
 * STAND-INS, the only ones:
 *   - serveModelStandIns (harness/thisCommitServer.ts): the routes that would call a model, answered in
 *     the test by this commit's own code with every model step replaced -- /api/case/read,
 *     /api/case/understand, /api/classify-court-path, /api/assistant/law, /api/intake/guided-turn
 *     (the real turn; extract/propose/classify/safety replaced; it is told the run's real user id),
 *     /api/intake/classify-claim-type (503), /api/intake/depth-turn (503). No OpenAI spend.
 *   - the situation answers pre-set in the tab (autoAnswerSituation), as every intake test does.
 *   - signed-in runs start with a real Supabase session minted for a real staging user
 *     (authenticateRealTestUser), put in the tab's storage; guest runs sign in through the login form.
 * The next-step analysis and "Check my case file" run on the site's own server, which in CI holds no
 * model key, so they use the site's deterministic engines.
 *
 * Run: CI only (.github/workflows/courtsimplified-carry.yml, four machines of three runs (Small Claims by guest / signed in), against a production
 * build on port 3100 and staging). Not runnable on the owner's machine (no dev server). Locally against a
 * served build: PLAYWRIGHT_BASE_URL=... npx playwright test tests/browser/carry-end-to-end.spec.ts
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { createRealTestAccount, deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { grantSiteAccess } from "./harness/siteAccess";
import { answerSituation, autoAnswerSituation, situationAnswersFor, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns, type Court } from "./harness/thisCommitServer";
import { factsAskedTwice, heldFacts, heldViolations, recordAsks, repeatViolations, type Asked, type HeldState } from "./harness/askOnce";
import { countsLine, countsOf, readBaseline, shows, splitByBaseline, writeRunRecord, type CarryKind, type CarryViolation } from "./harness/carryCounts";
import { asksForDate } from "../../src/lib/case-system/dates";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type RouteName = "questions" | "review" | "form";
type Who = "guest" | "signed-in";
type Value = { text: string; amount?: number; marker?: RegExp };

/** The two tracked facts per court: one changed, one removed. Values the person types; none is in the story. */
const TRACK: Record<Court, {
  change: { fact: string; fields: string[]; box: string; v1: Value; v2: Value };
  remove: { fact: string; fields: string[]; box: string; value: Value };
}> = {
  "small-claims": {
    change: { fact: "amount", fields: ["amountClaimed", "amountClaimedText", "amount"], box: "sc-intake-amountClaimed", v1: { text: "$6,400", amount: 6400 }, v2: { text: "$7,250", amount: 7250 } },
    remove: { fact: "otherParty", fields: ["otherParty", "defendantName", "otherPartyName"], box: "sc-intake-otherParty", value: { text: "Jordan Testwood", marker: /Testwood/ } },
  },
  civil: {
    change: { fact: "amount", fields: ["amountClaimed"], box: "Amount claimed or disputed", v1: { text: "$96,400", amount: 96400 }, v2: { text: "$97,250", amount: 97250 } },
    remove: { fact: "otherParty", fields: ["otherParty"], box: "Other party", value: { text: "Testwood Contracting Ltd.", marker: /Testwood/ } },
  },
  family: {
    change: { fact: "wants", fields: ["goal"], box: "What do you want the court to order?", v1: { text: "Synthetic: alternate weekends with our daughter", marker: /alternate weekends/i }, v2: { text: "Synthetic: a week-about schedule", marker: /week-about/i } },
    remove: { fact: "otherParty", fields: ["otherParty"], box: "Other party", value: { text: "Jordan Testwood", marker: /Testwood/ } },
  },
};

/** Two stories per court, each with its own marker word, naming no tracked value. */
const STORIES: Record<Court, { a: string; b: string }> = {
  "small-claims": {
    a: "I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid. My neighbour remembers their teal-orange van. I have the contract and text messages.",
    b: "A moving company broke my dining table in May 2026. Their plum-yellow truck was parked outside. I have photos.",
  },
  civil: {
    a: "Synthetic: I hired a builder in March 2026 to build an addition to my home and they abandoned the job in June 2026. Their teal-orange van was there every day. I have the contract and emails.",
    b: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  },
  family: {
    a: "Synthetic: my former partner and I separated in March 2026 and we disagree about parenting time for our daughter, age 6. She carries a teal-orange backpack. I have our text messages.",
    b: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
  },
};
const MARK_A = /teal-orange/i;
const MARK_B = /plum-yellow/i;
const SIDE: Record<Court, "plaintiff" | "applicant"> = { "small-claims": "plaintiff", civil: "plaintiff", family: "applicant" };
const ISSUE: Record<Court, string> = { "small-claims": "", civil: "contract", family: "parenting-time" };

const ROUTES: RouteName[] = ["questions", "review", "form"];
/**
 * Small Claims (the owner's demo court, 30 Oct): every route, guest AND signed in (six runs, split
 * over two CI machines by who). Civil and Family: each route once, guest on the questions and review,
 * signed in on the form.
 */
const RUNS: { court: Court; route: RouteName; who: Who }[] = [
  ...ROUTES.flatMap((route) => (["guest", "signed-in"] as Who[]).map((who) => ({ court: "small-claims" as Court, route, who }))),
  ...(["civil", "family"] as Court[]).flatMap((court) => ROUTES.map((route) => ({ court, route, who: (route === "form" ? "signed-in" : "guest") as Who }))),
];

class Run {
  violations: CarryViolation[] = [];
  unreached: string[] = [];
  /** The tracked facts' state, as the person left them. */
  changed = false;
  removed = false;
  given = false;
  caseA = "";
  caseB = "";
  constructor(readonly page: Page, readonly court: Court, readonly route: RouteName, readonly who: Who) {}
  get name() { return `${this.court} ${this.route} ${this.who}`; }
  add(kind: CarryKind, fact: string, where: string, detail: string) {
    const key = `${kind}|${fact}|${where}`;
    if (this.violations.some((item) => `${item.kind}|${item.fact}|${item.where}` === key)) return;
    this.violations.push({ kind, run: this.name, court: this.court, route: this.route, fact, where, detail: detail.replace(/\s+/g, " ").slice(0, 240) });
  }
  /** A step that must be reached for the counts to mean anything; a failure is recorded and the run goes on. */
  async step(name: string, body: () => Promise<void>) {
    try { await body(); } catch (error) {
      // The first line and the locator it waited on (CI run 41096555611 recorded only "toBeVisible() failed").
      const message = String(error).replace(/\u001b\[[0-9;]*m/g, "");
      const waited = /Locator: (.*)/.exec(message)?.[1] ?? /waiting for (.*)/.exec(message)?.[1] ?? "";
      this.unreached.push(`${name}: ${message.split("\n")[0].slice(0, 160)}${waited ? ` [waited on ${waited.trim().slice(0, 200)}]` : ""}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Driving the site
// ---------------------------------------------------------------------------------------------

function idOf(page: Page): string {
  const url = new URL(page.url());
  return url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? "";
}

/**
 * Gets the builder to its intake: the first-use notice (shown once PER ACCOUNT, keyed by user id in
 * FirstUseAcknowledgement.tsx, so a guest who signs in meets it again on the builder) and the
 * situation questions, whenever either comes, then waits for the intake itself. CI run 41096555611:
 * every guest run stopped right after sign-in because the notice stood in front of the form, and an
 * expect() does not trigger a locator handler (only actions do).
 */
async function passNotice(page: Page) {
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const situation = page.getByTestId("situation-questions");
  const ready = page.getByTestId("intake-review")
    .or(page.getByTestId("guided-form-question"))
    .or(page.getByTestId("guided-form-show-form"))
    .or(page.getByRole("button", { name: "Fill in the form yourself" }))
    .or(page.getByTestId("sc-intake-otherParty"))
    .or(page.getByTestId("completed-case-overview"))
    .or(page.locator("[data-testid=guided-message]").first());
  for (let round = 0; round < 5; round++) {
    await expect(acknowledgement.or(situation).or(ready).first()).toBeVisible({ timeout: 60_000 });
    // The notice decides after the page draws (it reads the account first): give it that moment.
    await page.waitForTimeout(1_500);
    if (await acknowledgement.isVisible().catch(() => false)) {
      await acknowledgement.check();
      await page.getByTestId("acknowledgement-continue").click();
      continue;
    }
    if (await situation.isVisible().catch(() => false)) { await answerSituation(page, situationAnswersFor(page)); continue; }
    return;
  }
}

/** The story given at the start: the home page for Small Claims, the builder's first question elsewhere. */
async function giveStory(page: Page, court: Court, story: string) {
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel("Tell us what happened in your own words").fill(story);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    await expect(page.getByTestId("acknowledgement-checkbox").or(page.getByRole("button", { name: "Fill in the form yourself" })).first()).toBeVisible({ timeout: 60_000 });
    await passNotice(page);
  } else {
    await openBuilder(page, court, { city: "Kingston", story, situation: STARTING_NOTHING_FILED });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
  }
}

/** The guest signs in from the builder's header, through the site's own login form, with a real staging account. */
async function signInFromBuilder(run: Run, account: { email: string; password: string }) {
  const { page } = run;
  const before = idOf(page);
  await page.locator('[data-testid="header-sign-in"]:visible').first().click();
  await page.waitForURL(/\/login\?next=/, { timeout: 60_000 });
  await page.getByPlaceholder("you@example.com").fill(account.email);
  await page.getByPlaceholder("Enter password").fill(account.password);
  await page.getByRole("button", { name: "Login", exact: true }).last().click();
  await page.waitForURL((url) => url.pathname === "/builder" && Boolean(url.searchParams.get("intake")) && url.searchParams.get("intake") !== before, { timeout: 90_000 });
  run.caseA = idOf(page);
  // The account meets the first-use notice again (it is kept per account): pass it, as the person does.
  await passNotice(page);
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
}

/**
 * Opens a case from My cases with an in-app click (the router-cache path of PR #532). My cases folds
 * older cases under "Other cases" (dashboard-other-cases, a <details>): opened first when the case is
 * in it (CI run 41096555611: the first case was folded once the second existed).
 */
async function openFromDashboard(page: Page, id: string) {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-case").first()).toBeVisible({ timeout: 60_000 });
  const link = page.locator(`a[href*="${id}"]`).first();
  if (!(await link.isVisible().catch(() => false))) {
    const fold = page.getByTestId("dashboard-other-cases");
    if ((await fold.count()) && (await fold.getAttribute("open")) === null) await fold.locator("summary").first().click();
  }
  await expect(link).toBeVisible({ timeout: 30_000 });
  await link.click();
  await page.waitForURL((url) => url.href.includes(id), { timeout: 60_000 });
  await page.waitForTimeout(3_000);
}

/** The Small Claims questions one at a time, each answered once, the tracked facts with the person's values. */
async function smallClaimsQuestions(run: Run) {
  const { page } = run;
  const track = TRACK["small-claims"];
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let last = "";
  for (let i = 0; i < 25; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(question).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) {
      await proposals.getByTestId("story-proposals-continue").click();
      await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 });
      continue;
    }
    const text = (await question.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const answer = /add the year/i.test(text) ? "October 6, 2026"
      : /how much|amount/i.test(text) ? track.change.v1.text
      : /\bwho\b.*\b(other party|suing|sue|defendant)|name of the (other|person|business)/i.test(text) ? track.remove.value.text
      : asksForDate(text) ? "March 3, 2026"
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
      : /kind of dispute/i.test(text) ? "A contract or agreement dispute"
      : /filed|served/i.test(text) ? "No"
      : "I don't know";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
}

/** Civil and Family questions one at a time, each answered once. */
async function guidedFormQuestions(run: Run) {
  const { page, court } = run;
  const track = TRACK[court];
  for (let i = 0; i < 30; i++) {
    const question = page.getByTestId("guided-form-question");
    if (!(await question.isVisible({ timeout: 10_000 }).catch(() => false))) break;
    const key = (await question.getAttribute("data-key")) ?? "";
    const yes = question.getByTestId("guided-form-from-story-yes");
    const no = question.getByTestId("guided-form-from-story-no");
    const box = question.getByRole("textbox");
    if (key === "yourRole") {
      if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
      await question.getByTestId(`guided-option-${SIDE[court]}`).click();
      continue;
    }
    if (key === "documents" || key === "filedDocuments" || key === "issues") {
      if (await no.isVisible().catch(() => false)) await no.click();
      await question.getByTestId(`guided-check-${key === "issues" ? ISSUE[court] : "nothing"}`).check();
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    const own = track.change.fields.includes(key) ? track.change.v1.text : track.remove.fields.includes(key) ? track.remove.value.text : null;
    if (own) {
      if (await no.isVisible().catch(() => false)) await no.click();
      await question.getByRole("textbox").fill(own);
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
    if ((await box.count()) && (await box.inputValue()).trim()) { await question.getByTestId("guided-form-next").click(); continue; }
    await question.getByTestId("guided-form-skip").click();
  }
  await page.getByTestId("guided-form-done").click().catch(() => {});
}

/** The form box for a tracked fact on this court's form view (opening the form view first). */
async function formBox(page: Page, court: Court, box: string): Promise<Locator> {
  if (court === "small-claims") return page.getByTestId(box);
  return page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: new RegExp(`^${box.replace(/[?().]/g, "\\$&")}$`) }) }).locator("input, textarea").first();
}

async function openForm(run: Run, id = run.caseA) {
  const { page, court } = run;
  await page.goto(`/builder?path=${court}&intake=${id}${court === "small-claims" ? "&step=form" : ""}`);
  await passNotice(page);
  if (court !== "small-claims") {
    const show = page.getByTestId("guided-form-show-form");
    await expect(show.or(await formBox(page, court, TRACK[court].remove.box)).first()).toBeVisible({ timeout: 60_000 });
    if (await show.isVisible().catch(() => false)) await show.click();
  }
  await expect(await formBox(page, court, TRACK[court].remove.box)).toBeVisible({ timeout: 60_000 });
}

/** Waits until the case's saved row holds (or no longer holds) a value: the real save path, read from staging. */
async function savedHolds(run: Run, userId: string | null, marker: RegExp | number, holds: boolean) {
  if (!userId || !run.caseA) { await run.page.waitForTimeout(3_000); return; }
  const admin = harnessAdmin();
  const test_ = (text: string) => (typeof marker === "number" ? shows(text, { amount: marker }) || text.includes(String(marker)) : marker.test(text));
  await expect.poll(async () => {
    const { data } = await admin.from("cases").select("master_result").eq("id", run.caseA).eq("user_id", userId).maybeSingle();
    return test_(JSON.stringify((data as { master_result?: { intakeCheckpoint?: unknown } } | null)?.master_result?.intakeCheckpoint ?? null));
  }, { timeout: 30_000, message: "the change reached the saved case" }).toBe(holds).catch(() => {});
}

/** The person types into a box, key by key, then leaves it. */
async function typeInto(box: Locator, value: string) {
  await box.fill("");
  if (value) await box.pressSequentially(value, { delay: 20 });
  else await box.press("Backspace").catch(() => {});
  await box.blur();
}

async function answerReview(run: Run) {
  const { page, court } = run;
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", /reviewing|user-confirmed/, { timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "user-confirmed") return;
  const q = (id: string) => panel.locator(`[data-testid=intake-initial-question][data-question="${id}"]`);
  const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await page.locator('[data-question="sc-claim-filed"]').count()) await page.locator('[data-question="sc-claim-filed"]').getByRole("button", { name: "No", exact: true }).click();
  const amount = page.locator('[data-question="sc-amount-claimed"]').getByRole("textbox");
  if (court === "small-claims" && (await amount.count())) { await amount.fill(TRACK["small-claims"].change.v1.text); await amount.press("Enter"); }
  if (await q("yourRole").count()) await q("yourRole").getByRole("button", { name: SIDE[court] === "applicant" ? /starting it/i : /plaintiff/i }).first().click();
  for (const id of ["documents", "filedDocuments", "issues"]) {
    const box = q(id);
    if (!(await box.count())) continue;
    const pick = box.locator(`input[data-testid=intake-field-pick][value="${id === "issues" ? ISSUE[court] : "nothing"}"]`);
    if (await pick.count()) { await pick.check(); await box.getByTestId("intake-field-save").click(); }
  }
  for (const [fields, value] of [[TRACK[court].change.fields, TRACK[court].change.v1.text], [TRACK[court].remove.fields, TRACK[court].remove.value.text]] as const) {
    for (const field of fields) {
      const box = q(field).getByRole("textbox");
      if (await box.count()) { await box.fill(value); await box.press("Enter"); break; }
    }
  }
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
}

/** Confirm, then "Show my next step": the overview. */
async function confirmAndShow(run: Run) {
  const { page, court } = run;
  // Small Claims questions continue from the questions (step=guided): only that route's completion
  // draws the Form 7A section (app/builder/page.tsx:1319 setDraftInput, read at :2678).
  const step = court !== "small-claims" ? "" : run.route === "questions" ? "&step=guided" : "&step=form";
  await page.goto(`/builder?path=${court}&intake=${run.caseA}${step}`);
  await passNotice(page);
  await answerReview(run);
  const panel = page.getByTestId("intake-review");
  if ((await panel.getAttribute("data-phase")) !== "user-confirmed") {
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  }
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 150_000 });
}

// ---------------------------------------------------------------------------------------------
// Reading one fact from each screen, and judging what it shows
// ---------------------------------------------------------------------------------------------

/** The review's line for a fact: its box's value and the line's words (an offer "Use … (from your story)" included). */
async function reviewLine(page: Page, fields: string[]): Promise<string | null> {
  for (const field of fields) {
    const entry = page.locator(`[data-testid=intake-entry][data-field="${field}"]`).first();
    if (!(await entry.count())) continue;
    const boxes = await entry.locator("input, textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value));
    return `${boxes.join(" ")} ${await entry.innerText()}`;
  }
  return null;
}

/** Judges one screen. `scoped`: the screen's own place for the fact (null when the screen has none). `whole`: all its words. */
function judge(run: Run, screen: string, scoped: { change?: string | null; remove?: string | null }, whole: string | null, caseKey: "a" | "b" = "a") {
  const track = TRACK[run.court].change;
  const party = TRACK[run.court].remove;
  if (caseKey === "b") {
    // The second case: nothing of the first may show (its marker, its changed value, its party).
    const leaked = whole !== null && (MARK_A.test(whole) || shows(whole, track.v2) || shows(whole, track.v1) || party.value.marker!.test(whole));
    if (leaked) run.add("wrong-case", "case", screen, `the second case's page shows the first case: ${whole!.slice(0, 160)}`);
    return;
  }
  if (whole !== null && MARK_B.test(whole)) run.add("wrong-case", "case", screen, "the first case's page shows the second case's story");
  if (!run.given) return;
  const expected = run.changed ? track.v2 : track.v1;
  if (scoped.change !== undefined && scoped.change !== null) {
    if (!shows(scoped.change, expected) || (run.changed && shows(scoped.change, track.v1))) run.add("screens-disagree", track.fact, screen, `shows "${scoped.change.trim().slice(0, 120)}", the person's value is "${expected.text}"`);
  }
  if (run.changed && whole !== null && shows(whole, track.v1) && !shows(whole, track.v2)) run.add("screens-disagree", track.fact, screen, `still shows the old value "${track.v1.text}" after the person changed it to "${track.v2.text}"`);
  if (run.removed) {
    const seen = [scoped.remove, whole].some((text) => text !== undefined && text !== null && party.value.marker!.test(text));
    if (seen) run.add("returned-after-removal", party.fact, screen, `"${party.value.text}" shown again after the person removed it`);
  } else if (scoped.remove !== undefined && scoped.remove !== null && !party.value.marker!.test(scoped.remove)) {
    run.add("screens-disagree", party.fact, screen, `shows "${scoped.remove.trim().slice(0, 120)}", the person's value is "${party.value.text}"`);
  }
}

/** The form and the review, read on the builder. */
async function readBuilder(run: Run, when: string) {
  const { page, court } = run;
  await openForm(run);
  const change = await (await formBox(page, court, TRACK[court].change.box)).inputValue().catch(() => null);
  const remove = await (await formBox(page, court, TRACK[court].remove.box)).inputValue().catch(() => null);
  judge(run, `form (${when})`, { change, remove }, null);
  const panel = page.getByTestId("intake-review");
  if (await panel.isVisible().catch(() => false)) {
    if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click().catch(() => {});
    await page.waitForTimeout(800);
    judge(run, `review (${when})`, { change: await reviewLine(page, TRACK[court].change.fields), remove: await reviewLine(page, TRACK[court].remove.fields) }, await panel.innerText());
  }
}

/** The overview and (Small Claims) the Form 7A section, after "Show my next step". */
async function readOverview(run: Run, when: string) {
  const { page } = run;
  judge(run, `overview (${when})`, {}, await page.getByTestId("completed-case-overview").innerText());
  const surface = page.getByTestId("statement-of-claim-surface").first();
  if (run.court === "small-claims") {
    await surface.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    if (await surface.isVisible().catch(() => false)) judge(run, `form-7a (${when})`, {}, await surface.innerText());
    // Owner (30 Oct): the Form 7A section must appear on every Small Claims route. Missing, it is a
    // COUNTED violation (screens-disagree, fact "form-7a-section", screen "form-7a (<when>)"), so it can be
    // listed in the baseline like any other and fails the run until it is. Today main draws it only after
    // the questions one at a time (app/builder/page.tsx:1319 sets draftInput there and nowhere else; :2678).
    else run.add("screens-disagree", "form-7a-section", `form-7a (${when})`, `the Form 7A section ("Preparing your Plaintiff's Claim (Form 7A)") was not drawn after "Show my next step" on the ${run.route} route, while the other screens show the case`);
  }
}

/** The case page: "What we have so far" (by fact), "Check my case file", and the whole page. */
async function readCasePage(run: Run, when: string, id = run.caseA, caseKey: "a" | "b" = "a") {
  const { page, court } = run;
  await page.goto(`/cases/${id}`);
  await expect(page.getByTestId("case-file").or(page.getByTestId("case-guidance-outdated")).or(page.getByTestId("case-review")).first()).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(2_000);
  const line = async (fact: string) => {
    const lines = page.locator(`[data-testid=case-file-line][data-fact="${fact}"], [data-testid=case-file-story-line][data-fact="${fact}"]`);
    return (await lines.count()) ? (await lines.allInnerTexts()).join(" ") : null;
  };
  judge(run, `case file (${when})`, { change: await line(TRACK[court].change.fact), remove: await line(TRACK[court].remove.fact) }, null, caseKey);
  judge(run, `case page (${when})`, {}, await page.locator("main").first().innerText().catch(() => page.locator("body").innerText()), caseKey);
  if (caseKey === "b") return;
  const review = page.getByTestId("case-review");
  if (await review.isVisible().catch(() => false)) {
    await review.getByRole("button", { name: /Check my case file|Check again/ }).click();
    await expect(review.getByRole("button", { name: /Check again/ }).or(review.locator("p.text-\\[\\#a63b3b\\]")).first()).toBeVisible({ timeout: 90_000 });
    judge(run, `check my case file (${when})`, {}, await review.innerText());
  } else run.unreached.push(`check my case file (${when}): not shown on the case page`);
}

// ---------------------------------------------------------------------------------------------
// The runs
// ---------------------------------------------------------------------------------------------

for (const { court, route, who } of RUNS) {
  test(`carry end to end -- ${court} ${route} ${who}`, async ({ page }) => {
    test.setTimeout(1_200_000);
    const run = new Run(page, court, route, who);
    const track = TRACK[court];
    await grantSiteAccess(page);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    // The first-use notice, whenever it comes before an action (it is per account, so it comes again
    // after a guest signs in). Assertions are covered by passNotice.
    await page.addLocatorHandler(page.getByTestId("acknowledgement-checkbox"), async () => {
      await page.getByTestId("acknowledgement-checkbox").check();
      await page.getByTestId("acknowledgement-continue").click();
    }, { noWaitAfter: true });

    // Who the person is: a real staging account (signed in from the start, or signed in from the builder).
    let userId: string | null = null;
    let signedIn = false;
    let account: { email: string; password: string; userId: string } | null = null;
    if (who === "signed-in") { userId = await authenticateRealTestUser(page, { realCases: true }); signedIn = true; }
    else { account = await createRealTestAccount(); userId = account.userId; }

    // The saved case, read from staging every few seconds, for the recorder's held check (caseFileOf).
    let current = "";
    let held: Map<string, HeldState> | null = null;
    const admin = harnessAdmin();
    const refresh = setInterval(async () => {
      if (!signedIn || !current) return;
      const { data } = await admin.from("cases").select("master_result").eq("id", current).eq("user_id", userId as string).maybeSingle();
      held = data ? heldFacts((data as { master_result: unknown }).master_result, court) : null;
    }, 3_000);
    const asked: Asked[] = await recordAsks(page, { held: () => (held ? (fact: string) => held!.get(fact) ?? null : null) });
    const segments: { from: number; to: number; key: "a" | "b" }[] = [];
    let segmentStart = 0;
    let segmentKey: "a" | "b" = "a";
    const segment = (key: "a" | "b") => { segments.push({ from: segmentStart, to: asked.length, key: segmentKey }); segmentStart = asked.length; segmentKey = key; held = null; };

    await serveModelStandIns(page, court, userId ?? undefined);

    try {
      // 1. The story.
      await run.step("give the story", async () => {
        await giveStory(page, court, STORIES[court].a);
        run.caseA = idOf(page);
        current = run.caseA;
      });

      // A guest on the Small Claims questions signs in first: the questions one at a time need an account.
      if (who === "guest" && court === "small-claims" && route === "questions") {
        await run.step("sign in from the builder (before the questions)", async () => { await signInFromBuilder(run, account!); signedIn = true; current = run.caseA; });
      }

      // 2. Each question once, by the route.
      await run.step(`answer the questions (${route})`, async () => {
        if (route === "questions") {
          if (court === "small-claims") await smallClaimsQuestions(run);
          else await guidedFormQuestions(run);
        } else if (route === "form" && court === "small-claims") {
          await page.getByRole("button", { name: "Fill in the form yourself" }).click();
        }
        if (route === "review") await answerReview(run);
      });

      // 3. The tracked facts, given in the form where they are not yet given.
      await run.step("give the two tracked facts in the form", async () => {
        await openForm(run);
        for (const [box, value] of [[track.change.box, track.change.v1.text], [track.remove.box, track.remove.value.text]] as const) {
          const field = await formBox(page, court, box);
          if (!(await field.inputValue()).trim()) await typeInto(field, value);
        }
        run.given = true;
        await savedHolds(run, signedIn ? userId : null, track.remove.value.marker!, true);
        await readBuilder(run, "given");
      });

      // 4. Reload: everything still there.
      await run.step("reload", async () => { await page.reload(); await readBuilder(run, "after reload"); });

      // 5. The guest signs in from the builder: the story and answers carried into the account.
      if (who === "guest" && !signedIn) {
        await run.step("sign in from the builder", async () => {
          await page.goto(`/builder?path=${court}&intake=${run.caseA}`);
          await signInFromBuilder(run, account!);
          signedIn = true;
          current = run.caseA;
          await readBuilder(run, "after sign-in");
        });
      }

      // 6. Confirm, the next step (overview, Form 7A), the case page and "Check my case file".
      await run.step("confirm and show the next step", async () => { await confirmAndShow(run); await readOverview(run, "after confirm"); });
      await run.step("case page", async () => { await readCasePage(run, "after confirm"); });

      // 7. Change one value, remove the other, on the form; reload; every screen again.
      await run.step("change a value", async () => {
        await openForm(run);
        await typeInto(await formBox(page, court, track.change.box), track.change.v2.text);
        run.changed = true;
        await savedHolds(run, userId, track.change.v2.amount ?? track.change.v2.marker!, true);
        await readBuilder(run, "after change");
      });
      await run.step("remove a value", async () => {
        await openForm(run);
        await typeInto(await formBox(page, court, track.remove.box), "");
        run.removed = true;
        await savedHolds(run, userId, track.remove.value.marker!, false);
        await page.reload();
        await readBuilder(run, "after removal and reload");
      });
      await run.step("confirm again and show the next step", async () => { await confirmAndShow(run); await readOverview(run, "after change and removal"); });
      await run.step("case page again", async () => { await readCasePage(run, "after change and removal"); });

      // 8. A second case in the same tab.
      segment("b");
      await run.step("start a second case in the same tab", async () => {
        await giveStory(page, court, STORIES[court].b);
        run.caseB = idOf(page);
        current = run.caseB;
        if (!run.caseB || run.caseB === run.caseA) run.add("wrong-case", "case", "second case (address)", `the second case opened under ${run.caseB ? "the first case's id" : "no id"}`);
        await page.waitForTimeout(3_000);
        judge(run, "second case builder", {}, await page.locator("body").innerText(), "b");
        await page.reload();
        await passNotice(page);
        await page.waitForTimeout(2_000);
        if (idOf(page) !== run.caseB) run.add("wrong-case", "case", "second case (after reload)", `the address changed from the second case to ${idOf(page) || "none"}`);
        judge(run, "second case builder (after reload)", {}, await page.locator("body").innerText(), "b");
      });

      // 9. Back to the first case: through the dashboard (in-app navigation) and by its address.
      segment("a");
      current = run.caseA;
      await run.step("back to the first case from the dashboard", async () => {
        await openFromDashboard(page, run.caseA);
        judge(run, "first case from the dashboard", {}, await page.locator("body").innerText());
      });
      // Then the second case the same way: it must show itself, not the first.
      await run.step("the second case from the dashboard", async () => {
        await openFromDashboard(page, run.caseB);
        judge(run, "second case from the dashboard", {}, await page.locator("body").innerText(), "b");
      });
      await run.step("the first case by its address", async () => {
        await readBuilder(run, "first case by address, after the second case");
        await readCasePage(run, "first case by address, after the second case");
      });
      segments.push({ from: segmentStart, to: asked.length, key: segmentKey });
    } finally {
      clearInterval(refresh);
      if (userId) await deleteHarnessUser(userId);
    }

    // Asked twice, per case: the story pack's recorder, the same rules.
    for (const key of ["a", "b"] as const) {
      const events = segments.filter((item) => item.key === key).flatMap((item) => asked.slice(item.from, item.to));
      for (const violation of [...repeatViolations(factsAskedTwice(events, STARTING_NOTHING_FILED)), ...heldViolations(events)]) {
        run.add("asked-twice", violation.fact, `${violation.surface}@${violation.screen}`, `${violation.rule}: ${violation.text.slice(0, 120)} (${violation.detail})`);
      }
    }

    const { known, unknown } = splitByBaseline(run.violations, readBaseline());
    writeRunRecord({ run: run.name, court, route, who, violations: run.violations, known: known.length, unknown: unknown.length, unreached: run.unreached });
    console.log(countsLine(countsOf(run.violations), `[${run.name}]`));
    for (const item of run.unreached) console.log(`CARRY UNREACHED [${run.name}] ${item}`);
    for (const item of unknown) console.log(`CARRY NEW ${item.kind} ${item.fact} @ ${item.where}: ${item.detail}`);
    expect(run.unreached, "every step of the run was reached (a count from a step never reached is not a zero)").toEqual([]);
    expect(unknown.map((item) => `${item.kind} ${item.fact} @ ${item.where}: ${item.detail}`), "no violation outside the baseline (harness/carryBaseline.json)").toEqual([]);
  });
}
