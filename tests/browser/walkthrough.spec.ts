/**
 * The page walkthrough: plays each persona through the real site and records
 * what every page shows them, so a reviewer (human or the critic in
 * scripts/walkthrough/critique.ts) can read the whole journey page by page.
 *
 * WHY. Site owner, 2026-10-04: "is there a way for you to see all the results
 * at each stage of the user case?" Every other suite checks a module or a
 * string. None reads what a person actually sees on each page, in order, which
 * is where the reported problems lived: the user's typos pasted back, a
 * child-support draft on a custody case, a served father treated as the one
 * starting the case.
 *
 * NOT A GATE. It asserts only that each persona got through. What the pages
 * say is judged by the critic, which writes REPORT.md. Output goes to
 * walkthrough-output/ (gitignored): one JSON per persona plus a full-page
 * screenshot per step.
 *
 * Needs a running app (PLAYWRIGHT_BASE_URL, or the config's own dev server),
 * SITE_ACCESS_PASSWORD, and Supabase credentials for a NON-production project
 * (authenticateRealTestUser mints a harness user; case rows are faked). The
 * workflow courtsimplified-walkthrough.yml refuses production first.
 *
 * Run: npx playwright test tests/browser/walkthrough.spec.ts
 */

import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { authenticateRealTestUser } from "./harness/intakeDriver";
import { HELD_BACK_PERSONAS } from "./walkthrough/heldBackPersonas";
import { PERSONAS, type Persona } from "./walkthrough/personas";

const OUT = path.resolve(process.cwd(), "walkthrough-output");

type Step = { n: number; step: string; url: string; text: string; screenshot: string; note?: string };

async function capture(page: Page, persona: Persona, steps: Step[], step: string, note?: string) {
  const n = steps.length + 1;
  const dir = path.join(OUT, persona.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = `${String(n).padStart(2, "0")}-${step}.png`;
  await page.waitForTimeout(800);
  // Open every collapsed section first: innerText skips a closed <details>,
  // so the critic read "What you told us" as empty when it was only folded
  // (first run, 2026-10-04).
  await page
    .evaluate(() => document.querySelectorAll("details").forEach((element) => element.setAttribute("open", "")))
    .catch(() => undefined);
  const main = page.locator("main");
  const text = ((await main.count()) > 0 ? await main.first().innerText() : await page.locator("body").innerText()).trim();
  await page.screenshot({ path: path.join(dir, file), fullPage: true }).catch(() => undefined);
  steps.push({ n, step, url: page.url(), text, screenshot: `${persona.id}/${file}`, note });
}

async function passGate(page: Page, persona: Persona, steps: Step[]) {
  await page.goto(`/builder?path=${persona.path}`, { waitUntil: "domcontentloaded" });
  const province = page.getByLabel("Province or territory");
  // The first-use notice gates the builder for a new account (first run,
  // 2026-10-04: every persona stopped here). Accepting it is what a user does.
  const acknowledge = page.getByRole("checkbox", { name: /I understand/i });
  await expect(province.or(acknowledge)).toBeVisible({ timeout: 90_000 });
  if (await acknowledge.isVisible().catch(() => false)) {
    await capture(page, persona, steps, "first-use-notice");
    await acknowledge.check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(province).toBeVisible({ timeout: 90_000 });
  await province.selectOption("Ontario");
  await page.getByLabel("City or municipality").fill(persona.city);
  // The builder's own gate no longer asks for the story (second run,
  // 2026-10-04: family and civil timed out here); it is entered in the intake.
  const button =
    persona.path === "small-claims"
      ? page.getByRole("button", { name: "Continue", exact: true })
      : page.getByRole("button", { name: /Continue with .* questions/ });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
}

async function fillLabelled(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: true }).first();
  if ((await field.count()) === 0) return false;
  await field.fill(value);
  return true;
}

async function runSpellingCheck(page: Page, persona: Persona, steps: Step[]) {
  const check = page.getByTestId("tidy-wording-check");
  if ((await check.count()) === 0) return;
  await check.click();
  await expect(check).toHaveText(/Suggest fixes/, { timeout: 90_000 });
  await capture(page, persona, steps, "spelling-suggestions");
  // Accept every suggestion, as a user who trusts the fixes would.
  for (let i = 0; i < 25; i += 1) {
    const use = page.getByRole("button", { name: "Use suggested" }).first();
    if ((await use.count()) === 0) break;
    await use.click();
  }
}

async function familyOrCivil(page: Page, persona: Persona, steps: Step[]) {
  await expect(page.getByLabel("Case stage").first()).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "intake-form");

  // The story: shown as prose with an "Edit case story" toggle.
  const storyField = page.getByLabel("Case story", { exact: true });
  if (!(await storyField.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Edit case story" }).click();
  }
  await storyField.fill(persona.story);

  if (persona.path === "family") {
    await page.getByTestId("family-role-select").selectOption(persona.role);
    for (const issue of persona.issues ?? []) await page.getByTestId(`family-issue-${issue}`).click();
  } else {
    await page.getByLabel("Your role").selectOption(persona.role);
    for (const label of persona.issues ?? []) {
      await page.getByRole("button", { name: label, exact: true }).first().click();
    }
  }
  for (const label of persona.documents ?? []) {
    await page.getByRole("button", { name: label, exact: true }).first().click();
  }
  await page.getByLabel("Case stage").first().selectOption(persona.stage);
  for (const [label, value] of Object.entries(persona.fields ?? {})) await fillLabelled(page, label, value);

  await runSpellingCheck(page, persona, steps);
  // The questions the law raises load after the story; a user waits for them
  // now that Continue waits too (page review, 2026-10-06).
  await expect(page.getByTestId("sourced-questions-loading")).toBeHidden({ timeout: 150_000 }).catch(() => undefined);
  await capture(page, persona, steps, "intake-filled");

  await page.getByRole("button", { name: /Continue to your next steps/ }).click({ timeout: 150_000 });
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(4_000);
  await capture(page, persona, steps, "after-analysis");
}

async function smallClaims(page: Page, persona: Persona, steps: Step[]) {
  const chooseForm = page.getByRole("button", { name: /Fill in the form yourself/i });
  await expect(chooseForm).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "mode-chooser");
  await chooseForm.click();
  await expect(page.getByTestId("sc-intake-analyze")).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "intake-form");

  const story = page.getByTestId("sc-intake-facts");
  if (!(await story.isVisible().catch(() => false))) await page.getByTestId("sc-intake-edit-story").click();
  await story.fill(persona.story);
  await page.getByTestId("sc-intake-yourRole").selectOption(persona.role);
  await page.getByTestId("sc-intake-caseStage").selectOption(persona.stage);
  for (const [name, value] of Object.entries(persona.fields ?? {})) {
    await page.getByTestId(`sc-intake-${name}`).fill(value).catch(() => undefined);
  }
  await runSpellingCheck(page, persona, steps);
  await capture(page, persona, steps, "intake-filled");

  await page.getByTestId("sc-intake-analyze").click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(4_000);
  await capture(page, persona, steps, "after-analysis");
}


/**
 * Answers one guided-intake question the way the persona would, from the
 * persona's backstory only. A model plays the user because the questions are
 * written live and cannot be scripted in advance; it never grades anything.
 * Without a key it answers "I'm not sure." so the run still gets through.
 */
async function answerAsPersona(persona: Persona, transcript: string[], question: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "I'm not sure.";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are playing an ordinary person using a legal self-help website in Ontario. Answer the website's " +
            "latest question in one or two short sentences, the way this person would type: casual, plain, no " +
            "legal terms they would not know. Use only what the person knows (below). If the question offers " +
            "choices, answer with the one that fits. If the person would not know, say you're not sure. Never " +
            "ask the website a question back.\n\nWhat the person knows:\n" + (persona.backstory ?? persona.story),
        },
        { role: "user", content: `Conversation so far:\n${transcript.slice(-8).join("\n")}\n\nThe website now asks:\n${question}\n\nYour reply:` },
      ],
    }),
  }).catch(() => null);
  const body = response?.ok ? ((await response.json()) as { choices?: { message?: { content?: string } }[] }) : null;
  return body?.choices?.[0]?.message?.content?.trim() || "I'm not sure.";
}

async function waitUntilIdle(page: Page) {
  // While a turn is in flight the intake's buttons read "...".
  await expect
    .poll(async () => page.getByRole("button", { name: "...", exact: true }).count(), { timeout: 180_000 })
    .toBe(0);
}

/**
 * The guided Small Claims intake, played start to finish (2026-10-06). Every
 * question is answered from the persona's backstory; the page is captured at
 * each kind of screen the user meets, and the whole conversation at the end.
 */
async function guidedSmallClaims(page: Page, persona: Persona, steps: Step[]) {
  const chooseGuided = page.getByRole("button", { name: /Answer questions one at a time/i });
  await expect(chooseGuided).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "mode-chooser");
  await chooseGuided.click();
  const input = page.getByPlaceholder(/Tell us what happened/i);
  await expect(input).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "guided-start");
  await input.fill(persona.story);
  await page.getByRole("button", { name: "Send", exact: true }).click();

  const overview = page.getByTestId("completed-case-overview");
  const seen = new Set<string>();
  const transcript: string[] = [`Person: ${persona.story}`];
  let questionsAnswered = 0;
  for (let turn = 0; turn < 60; turn += 1) {
    await waitUntilIdle(page);
    if (await overview.isVisible().catch(() => false)) break;

    const proposals = page.getByTestId("story-proposals");
    if (await proposals.isVisible().catch(() => false)) {
      if (!seen.has("proposals")) await capture(page, persona, steps, "story-proposals", "What the AI took from the story, offered for confirmation.");
      seen.add("proposals");
      await page.getByRole("button", { name: "Looks right, continue" }).click();
      continue;
    }
    const confirmType = page.getByRole("button", { name: "Yes, that's right" });
    if (await confirmType.isVisible().catch(() => false)) {
      if (!seen.has("claim-type")) await capture(page, persona, steps, "claim-type-suggestion");
      seen.add("claim-type");
      await confirmType.click();
      continue;
    }
    const nextSteps = page.getByRole("button", { name: /Continue to your next steps|Skip and continue/ });
    if (await nextSteps.isVisible().catch(() => false)) {
      // Give the sourced questions a chance to load before reading them.
      await expect(page.getByRole("button", { name: "Continue to your next steps" }))
        .toBeVisible({ timeout: 60_000 })
        .catch(() => undefined);
      await capture(page, persona, steps, "guided-conversation", `${questionsAnswered} questions answered.`);
      await nextSteps.first().click();
      continue;
    }
    const answerBox = page.getByPlaceholder(/Your answer/i);
    if (await answerBox.isVisible().catch(() => false)) {
      const messages = page.getByTestId("guided-message");
      const count = await messages.count();
      const question = count ? (await messages.nth(count - 1).innerText()).trim() : "";
      if (questionsAnswered === 0) await capture(page, persona, steps, "first-question");
      const reply = await answerAsPersona(persona, transcript, question);
      transcript.push(`Website: ${question}`, `Person: ${reply}`);
      await answerBox.fill(reply);
      await page.getByRole("button", { name: "Send", exact: true }).click();
      questionsAnswered += 1;
      continue;
    }
    await page.waitForTimeout(2_000);
  }
  await expect(overview).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(4_000);
  await capture(page, persona, steps, "after-analysis");
}

async function confirmStage(page: Page, persona: Persona, steps: Step[]) {
  const select = page.getByTestId("stage-select");
  if ((await select.count()) === 0) return;
  await select.selectOption(persona.confirmStage);
  await page.getByTestId("stage-confirm").click();
  await page.waitForTimeout(3_000);
  await capture(page, persona, steps, "stage-confirmed");
  // A user offered "Count my deadline from <the date in my story>" takes it.
  // A date given in full is offered as one click; a month and day without a
  // year is answered by picking the year (the nearest is listed first, which
  // is the year every persona means).
  const suggestion = page.locator('[data-testid^="stage-answer-date-suggestion-"], [data-testid^="stage-answer-year-"] button').first();
  if (await suggestion.isVisible().catch(() => false)) {
    await suggestion.click();
    await page.waitForTimeout(4_000);
    await capture(page, persona, steps, "deadline-counted", "The user chose the date from their story.");
  }
}

/**
 * Back and Forward (2026-10-06). The site owner pressed Back after a live
 * test and lost the case: every builder step shared one URL. Back from the
 * results must show the intake as it was filled, Forward the results again.
 */
async function backAndForward(page: Page, persona: Persona, steps: Step[]) {
  const results = page.getByTestId("completed-case-overview");
  await page.goBack();
  await expect(results).toBeHidden({ timeout: 30_000 });
  // The story is page text on some intakes and a text box's value on others
  // (2026-10-06: four personas failed a text-only check while their filled
  // intake was on screen). Either counts; the spelling step may have changed
  // a word, so a short opening is compared.
  // The property: the story the user wrote is back on screen. Judged by its
  // longer words, most of which must appear, not by its opening: the spelling
  // step rewrites openings ("im suing" -> "I'm suing", "me and my husband" ->
  // "My husband and I"), and an opening match failed two personas whose intake
  // came back exactly as filled (2026-10-08, read from their saved page text).
  // Half, not most (2026-10-09): the personas are written with typos the
  // spelling step corrects ("contracter"), and each corrected word no longer
  // matches; a blank intake still scores near zero.
  const words = Array.from(new Set(persona.story.toLowerCase().match(/[a-z]{6,}/g) ?? [])).slice(0, 12);
  await expect
    .poll(
      () =>
        page.evaluate((wanted) => {
          const fields = Array.from(document.querySelectorAll("textarea, input")) as (HTMLInputElement | HTMLTextAreaElement)[];
          const shown = `${fields.map((field) => field.value).join(" ")} ${document.body.innerText}`.toLowerCase();
          return wanted.filter((word) => shown.includes(word)).length / Math.max(1, wanted.length);
        }, words),
      { timeout: 30_000 },
    )
    .toBeGreaterThanOrEqual(0.5);
  await capture(page, persona, steps, "back-to-intake", "Browser Back from the results: the intake as it was filled.");
  await page.goForward();
  await expect(results).toBeVisible({ timeout: 30_000 });
  await capture(page, persona, steps, "forward-to-results", "Browser Forward: the results again.");
}

/**
 * A reload of the results step reopens the saved case (2026-10-06), never a
 * blank intake. Run last: it leaves the builder.
 */
async function reloadReopensCase(page: Page, persona: Persona, steps: Step[]) {
  await page.goto(`/builder?path=${persona.path}&step=results`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "reload-reopens-case", "Reloading the results step opened the saved case.");
}

/**
 * The case page, tab by tab (2026-10-04). After intake the user's case lives at
 * /cases/[id]; the walkthrough follows them there so the critic reads what they
 * actually work from, not only the builder.
 */
async function visitCaseHome(page: Page, persona: Persona, steps: Step[]) {
  const open = page.getByTestId("open-case-home");
  if ((await open.count()) === 0) return;
  // Disabled means the case is still saving or the save failed. Skipping it
  // silently hid a failed save until the reload step, which then reported the
  // wrong thing ("case could not be opened", 2026-10-08).
  const enabled = await expect(open).toBeEnabled({ timeout: 60_000 }).then(() => true, () => false);
  if (!enabled) {
    const reason = await page.getByTestId("save-error").innerText().catch(() => "no save error shown");
    throw new Error(`"Open your case page" stayed disabled after 60 s: ${reason.replace(/\s+/g, " ").slice(0, 300)}`);
  }
  await open.click();
  await expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  await capture(page, persona, steps, "case-overview");
  for (const tab of ["timeline", "documents", "forms", "drafts", "case-file"]) {
    const link = page.getByTestId(`case-tab-${tab}`);
    if ((await link.count()) === 0) continue;
    await link.click();
    await page.waitForTimeout(3_000);
    await capture(page, persona, steps, `case-${tab}`);
  }
}

/**
 * WALKTHROUGH_SHARD="2/4" runs every 4th persona starting at the 2nd, so the
 * workflow can play 20 personas in parallel jobs inside its time limit
 * (2026-10-07: 8 took ~2 hours on one runner). Unset runs them all.
 */
function shardOf(all: Persona[]): Persona[] {
  // WALKTHROUGH_PERSONAS="id1,id2" plays only those (2026-10-08: re-running the
  // cases a fix touches costs a fraction of all 20).
  const only = (process.env.WALKTHROUGH_PERSONAS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  const personas = only.length ? all.filter((persona) => only.includes(persona.id)) : all;
  const match = /^(\d+)\/(\d+)$/.exec(process.env.WALKTHROUGH_SHARD ?? "");
  if (!match) return personas;
  const index = Number(match[1]) - 1;
  const total = Number(match[2]);
  return personas.filter((_, i) => i % total === index);
}

test.describe("page walkthrough", () => {
  test.use({ navigationTimeout: 120_000, actionTimeout: 60_000 });

  // WALKTHROUGH_SET=held-back plays the ten held-back finish-line cases
  // (walkthrough/heldBackPersonas.ts) instead of the twenty tuning cases.
  const set = process.env.WALKTHROUGH_SET === "held-back" ? HELD_BACK_PERSONAS : PERSONAS;
  for (const persona of shardOf(set)) {
    test(persona.id, async ({ page }) => {
      test.setTimeout(persona.mode === "guided" ? 1_200_000 : 600_000);
      const steps: Step[] = [];
      let failure: string | null = null;
      // Every failed request to the app or the database, with its status and
      // the start of its error body, and every page error (2026-10-08: three
      // runs stopped on a failed save or load and none recorded why). Only
      // responses of 400 and above are read, which carry error messages, never
      // a session; query strings are dropped.
      const problems: string[] = [];
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (response.status() < 400 || !/\/(api|rest|auth|storage)\//.test(url.pathname)) return;
        void response
          .text()
          .catch(() => "")
          .then((body) => problems.push(`${response.request().method()} ${url.pathname} ${response.status()} ${body.replace(/\s+/g, " ").slice(0, 300)}`));
      });
      page.on("requestfailed", (request) => {
        const url = new URL(request.url());
        if (/\/(api|rest|auth|storage)\//.test(url.pathname)) problems.push(`${request.method()} ${url.pathname} failed: ${request.failure()?.errorText ?? "unknown"}`);
      });
      page.on("pageerror", (error) => problems.push(`page error: ${error.message.slice(0, 300)}`));
      try {
        // Real case rows (staging only, see the guard) so the case page can open.
        await authenticateRealTestUser(page, { realCases: true });
        await passGate(page, persona, steps);
        if (persona.path === "small-claims" && persona.mode === "guided") await guidedSmallClaims(page, persona, steps);
        else if (persona.path === "small-claims") await smallClaims(page, persona, steps);
        else await familyOrCivil(page, persona, steps);
        await confirmStage(page, persona, steps);
        await backAndForward(page, persona, steps);
        await visitCaseHome(page, persona, steps);
        await reloadReopensCase(page, persona, steps);
      } catch (error) {
        failure = error instanceof Error ? error.message.split("\n")[0].slice(0, 400) : String(error);
        await capture(page, persona, steps, "failed-here", failure).catch(() => undefined);
      }
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(
        path.join(OUT, `${persona.id}.json`),
        JSON.stringify({ persona, failure, problems: problems.slice(0, 50), steps }, null, 2),
      );
      expect(failure, `persona ${persona.id} did not get through: ${failure}`).toBeNull();
    });
  }
});
