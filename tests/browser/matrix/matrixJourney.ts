/**
 * THE JOURNEY MATRIX'S OWN STEPS, BESIDE THE ASK-ONCE JOURNEY IT DRIVES (ask-once-pages.spec.ts, MATRIX=1).
 *
 * The journey itself (the story given, the chat or the questions, the review, the next step, the case pages) is the
 * ask-once suite's, unchanged. These add what the matrix's checks need and the recorder cannot see:
 *   sampleScreens          every second, what the screen offers (a box, a question, a way forward, a working sign, the
 *                          idle "Send your story below"); a state counts only when it lasts three samples (check 10);
 *   guestDescribesThenSignsUp  a guest gives the start, city and story, then signs up through the site's own link;
 *                          what was given before and what the page holds after (check 7);
 *   probeNotSureAndRemoved one detail of the other side answered "I'm not sure", another typed then emptied, then a
 *                          reload: what each shows and whether either is asked again (check 8);
 *   reviewNotFilled        the review's "Not filled in yet" items (check 9);
 *   form7aOf               Form 7A's fill values and the facts the saved record holds (check 11).
 * Each writes plain data into the journey's record (matrix-records/<journey>.json); scripts/browser/matrixReport.ts
 * turns the records into the table.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { caseFileOf, slotText } from "../../../src/lib/case-system/caseFile/caseFile";
import { locationOf, storyOf } from "../../../src/lib/case-system/intakeStory";
import { harnessAdmin } from "../harness/realTestSession";
import type { MatrixStoryWithStart } from "./matrixStories";
import type { ScreenState } from "./matrixChecks";

export const MATRIX_RECORDS = process.env.MATRIX_RECORDS ?? "matrix-records";

/** What the page offers now (run in the page). */
async function screenNow(page: Page): Promise<ScreenState | null> {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const shown = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); const s = getComputedStyle(el as HTMLElement); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const any = (selector: string) => [...main.querySelectorAll(selector)].some(shown);
    const text = (main as HTMLElement).innerText ?? "";
    return {
      screen: `${location.pathname}${location.search.replace(/([?&](?:intake|caseId)=)[^&]+/g, "$1…")}`,
      box: [...main.querySelectorAll("textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select")].some((el) => shown(el) && !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly),
      question: any("[data-testid=situation-questions], [data-testid=guided-message][data-from=assistant], [data-testid=guided-form-question], [data-testid=story-proposals], [data-testid=triage-question], [data-use-suggestion]"),
      forward: [...main.querySelectorAll("button, a[href]")].some((el) => shown(el) && !(el as HTMLButtonElement).disabled),
      working: /Reading your story|Reading what you told us|Saving…|Working on it|Please wait|Thinking|Checking|Loading/i.test(text) || any("[aria-busy=true], [data-testid=working-note]"),
      idleWords: /Send your story below to get started/.test(text),
    };
  }).catch(() => null);
}

/** Samples the screen every second until stop(); a dead state is kept only when it lasts three samples in a row. */
export function sampleScreens(page: Page, file: (screen: string) => string): { stop: () => ScreenState[] } {
  const kept: ScreenState[] = [];
  const run: { streak: { key: string; count: number; state: ScreenState } | null } = { streak: null };
  let running = true;
  const dead = (s: ScreenState) => (s.idleWords && !s.working && !s.question) || (!s.box && !s.question && !s.forward && !s.working);
  void (async () => {
    while (running) {
      const s = await screenNow(page);
      if (s) {
        const key = dead(s) ? `${s.screen}|${s.idleWords}` : "";
        const streak = run.streak;
        if (key && streak && streak.key === key) streak.count += 1; else run.streak = key ? { key, count: 1, state: s } : null;
        if (run.streak && run.streak.count === 3) kept.push({ ...run.streak.state, file: file(run.streak.state.screen) });
      }
      await new Promise((done) => setTimeout(done, 1_000));
    }
  })();
  return { stop: () => { running = false; return kept; } };
}

/**
 * A guest gives the start, the city and the story on the home page, then signs up through the site's own link
 * ("Sign in or create a free account (what you entered comes with you)"). The site then takes them where it takes them
 * (their case in the builder); the journey goes on from there. Returns what was given, and the case id the site opened.
 */
export async function guestDescribesThenSignsUp(page: Page, story: MatrixStoryWithStart, account: { email: string; password: string }): Promise<{ before: Record<string, string>; caseId: string }> {
  await page.goto(`/?path=${story.court}`);
  await page.getByTestId("court-path-location-gate-ready").waitFor({ timeout: 120_000 });
  await page.getByLabel("City or municipality").fill(story.city);
  await page.locator("textarea").first().fill(story.text);
  const before: Record<string, string> = { municipality: story.city, story: story.text };
  await page.waitForTimeout(1_500);
  await page.getByRole("link", { name: /Sign in or create a free account/ }).first().click();
  // The link opens the page on "Create Account"; the account exists, so the person picks the Login tab, then logs in
  // (in sign-up mode the last "Login" button is the tab, not the form's own button). Typed only once the page has loaded
  // (typed before, the boxes were reset: "Email and password are required"), and checked before Login is pressed.
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("button", { name: "Login" }).first().click();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.locator('input[type="email"]').fill(account.email);
    await page.locator('input[type="password"]').fill(account.password);
    await page.waitForTimeout(500);
    if ((await page.locator('input[type="email"]').inputValue()) === account.email && (await page.locator('input[type="password"]').inputValue()) === account.password) break;
  }
  await page.getByRole("button", { name: "Login" }).last().click();
  // Signed in when neither "Sign in" link (header and footer) shows: a single-element wait on two matches fails at once,
  // which read as a sign-in that hung (25 Nov 2026).
  const signedIn = await expect.poll(() => page.getByRole("link", { name: "Sign in", exact: true }).count(), { timeout: 90_000 }).toBe(0).then(() => true, () => false);
  if (!signedIn) throw new Error("the guest could not sign in through the site's own link");
  // Then the site moves on from the login page to where the person was (its `next`): read the case only once it has.
  await page.waitForURL((address) => !address.pathname.startsWith("/login"), { timeout: 90_000 }).catch(() => {});
  // "You have an unsaved case in this tab": the person keeps working on what they entered.
  const keep = page.getByRole("button", { name: "Keep working on it" });
  if (await keep.isVisible({ timeout: 5_000 }).catch(() => false)) await keep.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  const url = new URL(page.url());
  return { before, caseId: url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? "" };
}

/** The review of a saved case, opened as the ask-once suite opens it to change an answer. */
async function openReview(page: Page, court: string, id: string) {
  await page.goto(`/builder?path=${court}&intake=${id}&change=amount`);
  await page.getByTestId("intake-review").waitFor({ timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(3_000);
}

/** One detail of the other side "I'm not sure", another typed then emptied (removed); a reload; what each shows. */
export async function probeNotSureAndRemoved(page: Page, court: string, id: string) {
  await openReview(page, court, id);
  const party = page.locator("[data-testid=parties-party][data-party=other]").first();
  if (!(await party.isVisible().catch(() => false))) return undefined;
  const asks = party.locator("label[data-testid=parties-detail-ask]");
  if ((await asks.count()) < 2) return undefined;
  const notSureDetail = (await asks.nth(0).getAttribute("data-detail")) ?? "";
  const removedDetail = (await asks.nth(1).getAttribute("data-detail")) ?? "";
  await asks.nth(0).getByTestId("parties-detail-not-sure").click().catch(() => {});
  await page.waitForTimeout(1_500);
  const removedBox = party.locator(`label[data-detail="${removedDetail}"] input`).first();
  await removedBox.fill("Testvalue 1");
  await removedBox.blur();
  await page.waitForTimeout(2_000);
  await party.locator(`[data-testid=parties-detail-held][data-detail="${removedDetail}"] [data-testid=parties-detail-change]`).click().catch(() => {});
  const typing = party.locator(`label[data-detail="${removedDetail}"] input`).first();
  await typing.fill("");
  await typing.blur();
  await page.waitForTimeout(3_000);
  await page.reload();
  await page.getByTestId("intake-review").waitFor({ timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(3_000);
  const read = async (detail: string) => {
    const where = page.locator(`[data-testid=parties-party][data-party=other] [data-detail="${detail}"]`).first();
    const shown = ((await where.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    const askedAgain = (await where.getAttribute("data-testid").catch(() => "")) === "parties-detail-ask" && (await where.getByTestId("parties-detail-not-sure").isVisible().catch(() => false));
    return { fact: `otherParty.${detail}`, shown, askedAgain };
  };
  return { notSure: await read(notSureDetail), removed: await read(removedDetail) };
}

/** A field the review shows, as a recorder event (check 3 judges every shown field, answered or not). */
export type ShownField = { kind: "ask"; surface: string; id: string; screen: string; text: string; at: number };
/** The review's "Not filled in yet" items, by their label, and every field it shows (its data-field). */
export async function reviewEntries(page: Page, court: string, id: string): Promise<{ notFilled: string[]; shown: ShownField[] }> {
  await openReview(page, court, id);
  const notFilled: string[] = [];
  const shown: ShownField[] = [];
  for (const entry of await page.locator("[data-testid=intake-review] [data-testid=intake-entry]").all()) {
    if (!(await entry.isVisible().catch(() => false))) continue;
    const text = ((await entry.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    const field = (await entry.getAttribute("data-field").catch(() => null)) ?? "";
    if (field) shown.push({ kind: "ask", surface: "review-entry", id: field, screen: "review", text: text.slice(0, 160), at: Date.now() });
    if (/Not filled in yet/.test(text)) notFilled.push(text.split(/Not filled in yet/)[0].trim().slice(0, 80));
  }
  return { notFilled, shown };
}

/** The facts the saved case record holds, in words (the case file, from the saved row). */
export async function recordFacts(id: string): Promise<Record<string, string>> {
  const { data } = await harnessAdmin().from("cases").select("master_result").eq("id", id).maybeSingle();
  const master = (data as { master_result?: Record<string, unknown> } | null)?.master_result ?? {};
  const file = caseFileOf((master.intakeCheckpoint ?? null) as never, master) as unknown as Record<string, { state?: string } | undefined>;
  const out: Record<string, string> = {};
  for (const fact of ["otherParty", "amount", "courtLocation", "whenHappened", "wants"]) {
    const slot = file[fact];
    if (slot?.state === "answered") out[fact] = slotText(slot as never, (iso) => iso);
  }
  return out;
}

/** One journey's record, written for the report (merged across shards by matrixReport.ts). */
export function writeJourney(name: string, record: unknown): void {
  fs.mkdirSync(MATRIX_RECORDS, { recursive: true });
  fs.writeFileSync(path.join(MATRIX_RECORDS, `${name.replace(/[^a-z0-9.-]+/gi, "-")}.json`), JSON.stringify(record, null, 1));
}

/**
 * What the account's case holds of the start a guest gave (check 7): the story and the city, read from the saved row
 * (never from a box on the page, which could hold the tab's copy). Waits up to `ms` for the case to be saved.
 */
export async function savedStart(id: string, ms = 60_000): Promise<Record<string, string>> {
  const until = Date.now() + ms;
  for (;;) {
    const { data } = await harnessAdmin().from("cases").select("master_result").eq("id", id).maybeSingle();
    const sections = ((data as { master_result?: { intakeCheckpoint?: { sections?: unknown } } } | null)?.master_result?.intakeCheckpoint?.sections ?? null) as never;
    if (sections) return { municipality: locationOf(sections)?.city ?? "", story: storyOf(sections) };
    if (Date.now() > until) return { municipality: "(no saved case)", story: "(no saved case)" };
    await new Promise((done) => setTimeout(done, 3_000));
  }
}
