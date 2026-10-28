/**
 * THE STORY PACK: 30 MADE-UP STORIES, THROUGH THE STEPS A PERSON TAKES (2026-10-23).
 *
 * Ten stories in each of Small Claims, civil and Family. Each runs twice in a real
 * browser: once answering through the questions, once through the review panel.
 * Each run starts the case, answers, confirms, opens the next step, asks the
 * follow-up chat two questions, and opens the case page. The site's server calls
 * are answered by this commit's own code (harness/thisCommitServer.ts); no AI, no
 * database.
 *
 * Every check asserts a property that must hold for any story, never a wording of
 * today (CLAUDE.md s. 5):
 *   - no internal wording reaches the person (record labels, engine warnings);
 *   - no doubled full stop ("Leo, age 7..") and no citation repeated in one line;
 *   - a stage the person's own answers settle is never asked again, on the results
 *     or the case page;
 *   - the case page names the person's side, whichever side;
 *   - Small Claims offers the amount owed, claimed or damaged, never a fee or an
 *     amount paid, and nothing when the story leaves it unclear;
 *   - the chat's evidence reply quotes the person's own words when the story lists
 *     evidence, never ends a line on "To keep your case record complete:", and
 *     does not ask for "main dates" once a served date is recorded.
 * Findings are collected (expect.soft) so one run reports all of them; the list is
 * written to story-pack-records/<run id>/findings.jsonl (harness/packRecords.ts), one folder per run.
 *
 * Run before any PR is marked ready: npm run test:story-pack (against a production
 * build on port 3100, like CI), or point PLAYWRIGHT_BASE_URL at a preview with that
 * preview's SITE_ACCESS_PASSWORD in the environment.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { deleteHarnessUser, signInHarnessUser } from "./harness/smallClaimsDriver";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED, type SituationAnswers } from "./harness/situation";
import { factsAskedTwice, recordAsks } from "./harness/askOnce";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";
import { asksForDate } from "../../src/lib/case-system/dates";
import { internalWordingIn, rawKeysIn } from "../../src/lib/case-system/copy/rawKeys";
import { CHARTER_STORIES, MESSY_STORIES, WALKTHROUGH_STORIES, type PackStory, type Route } from "./storyPackMore";
import { appendRecord } from "./harness/packRecords";

// Actions wait up to 60 s: on a slow runner the story is read, and a guided turn answered,
// in more than 20 s, and a button still disabled then is waiting, not broken.
test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

/** A story: civil documents / Family filed documents as option values; Small Claims' amount the story's own words claim (storyPackMore.ts). */
type Story = PackStory;

/** Whether the amount offered is one the story's own words claim (or nothing, where that is right too). */
function amountFits(story: Story, offered: string | null, strict: boolean): boolean {
  const allowed = Array.isArray(story.amount) ? story.amount : [story.amount ?? null];
  return allowed.includes(offered) || (!strict && offered === null);
}

/**
 * The situation answers (step 2) each story's person gives before writing it: served
 * with their court's papers when the story names them ("not sure" otherwise) on the
 * day the story gives, a case already going that they started when something is
 * filed, or starting with nothing filed.
 */
const ORIGINATING: Record<Court, { names: RegExp; papers: string }> = {
  "small-claims": { names: /plaintiff's claim/i, papers: "small-claims-7A" },
  civil: { names: /statement of claim/i, papers: "civil-14A" },
  family: { names: /\bapplication\b/i, papers: "family-8" },
};
function situationForStory(story: Story): SituationAnswers {
  if (story.situation) return story.situation;
  if (story.side === "defendant" || story.side === "respondent") {
    const day = /\bserved\b[^.]*?\bon ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(story.story)?.[1];
    const papers = ORIGINATING[story.court].names.test(story.story) ? ORIGINATING[story.court].papers : "not-sure";
    return { where: "served", papers, receivedOn: day ?? "unknown" };
  }
  if (story.filed.some((item) => item !== "nothing")) return { where: "going", started: "me" };
  return STARTING_NOTHING_FILED;
}

const STORIES: Story[] = [
  // Small Claims
  { id: "sc-deck-owed", court: "small-claims", side: "plaintiff", filed: [], amount: "$6,000", story: "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt." },
  { id: "sc-movers-damage", court: "small-claims", side: "plaintiff", filed: [], amount: "$2,500", story: "Test Movers Inc. charged me a $3,800 moving fee on May 2, 2026. They broke my dining table and TV, worth $2,500 together. I have photos and the invoice." },
  { id: "sc-roofer-single", court: "small-claims", side: "plaintiff", filed: [], amount: null, story: "I paid Test Roofing Ltd. $9,000 on May 12, 2026 to fix my roof and they never came back. I have emails and the receipt." },
  { id: "sc-deposit-back", court: "small-claims", side: "plaintiff", filed: [], amount: "$1,800", story: "My landlord kept my $1,800 deposit when I moved out in June 2026. He says I owe $500 for cleaning but I want the $1,800 back. I have the lease and move-out photos." },
  { id: "sc-loan-friend", court: "small-claims", side: "plaintiff", filed: [], amount: "$3,000", story: "I lent my former friend $3,000 in January 2026 and he never paid me back. I have the e-transfer record and his text messages." },
  { id: "sc-car-estimate", court: "small-claims", side: "plaintiff", filed: [], amount: "$2,500", story: "A driver backed into my parked car on April 4, 2026. The repair estimate is $2,500 and I paid a $500 deductible. I have photos and the estimate." },
  { id: "sc-invoice-unpaid", court: "small-claims", side: "plaintiff", filed: [], amount: "$5,400", story: "I did landscaping work for Test Homes Ltd. and sent an invoice for $5,400 on June 10, 2026. It is still unpaid. I have the invoice and emails." },
  { id: "sc-unclear", court: "small-claims", side: "plaintiff", filed: [], amount: null, story: "I hired Test Renovations Ltd. to build a deck for $8,000. I paid $2,000 and they never finished." },
  // A defendant is not asked the amount (the claim states it): nothing is offered.
  { id: "sc-defendant-served", court: "small-claims", side: "defendant", filed: [], amount: null, story: "Test Supply Ltd. is suing me for $4,200 they say I owe for tools. I was served with a Plaintiff's Claim on October 6, 2026. I have my receipts." },
  { id: "sc-defendant-unclear", court: "small-claims", side: "defendant", filed: [], amount: null, story: "My former roommate says I owe her money for utilities and served me with court papers last week. I have our text messages." },
  // #471 re-test: a monthly rent is never offered as the amount (nothing is, here).
  { id: "sc-rent-unclear", court: "small-claims", side: "plaintiff", filed: [], amount: null, story: "I rent my apartment for $1,800 a month. When I moved out in June 2026 the landlord kept my deposit and will not say how much he is keeping. I have the lease." },
  // Civil
  { id: "civil-deposit", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["contract"], story: "A supplier, Northwind Supplies Ltd., kept my $62,000 deposit and never delivered the equipment. I have the invoice and emails." },
  { id: "civil-defendant", court: "civil", side: "defendant", filed: ["statement-claim"], issues: ["contract"], story: "Test Equipment Ltd. is suing me for $80,000. I was served with a Statement of Claim on October 6, 2026. I have the purchase agreement." },
  { id: "civil-employment", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["employment"], story: "I was fired from Test Logistics Inc. in August 2026 after nine years with no notice. They paid me two weeks. I have my offer letter and pay stubs." },
  { id: "civil-negligence", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["negligence"], story: "I was hurt in a fall at a Test Mall store in July 2026 when a shelf collapsed. My losses are about $70,000. I have medical records and photos." },
  { id: "civil-professional", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["professional-negligence"], story: "My accountant at Test CPA LLP filed my company's taxes wrong for 2024 and we paid $55,000 in penalties. I have the reassessment letters." },
  { id: "civil-defamation", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["defamation"], story: "A former business partner posted false statements about me online in September 2026 and I lost two contracts. I have screenshots." },
  { id: "civil-construction", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["contract"], story: "Test Builders Ltd. abandoned my home addition in May 2026 after I paid $120,000. I have the contract and bank records." },
  { id: "civil-already-filed", court: "civil", side: "plaintiff", filed: ["statement-claim"], issues: ["contract"], story: "I already filed a Statement of Claim against Test Motors Ltd. in September 2026 for $90,000 over a defective truck. I have the purchase papers." },
  { id: "civil-defendant-debt", court: "civil", side: "defendant", filed: ["statement-claim"], issues: ["debt"], story: "A lender, Test Capital Corp., sued me for $150,000 on a loan guarantee. I was served on October 1, 2026. I have the guarantee and emails." },
  { id: "civil-property", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["property"], story: "My neighbour built a fence two metres onto my land in June 2026 and refuses to move it. I have the survey and photos." },
  // #471 re-test: evidence on its own line, not introduced by "I have".
  { id: "civil-evidence-line", court: "civil", side: "plaintiff", filed: ["nothing"], issues: ["contract"], story: "Northwind Supplies Ltd. kept my $45,000 deposit for a machine they never delivered.\nEvidence: contract, emails, bank statements" },
  // Family
  { id: "family-spousal", court: "family", side: "applicant", filed: ["nothing"], issues: ["spousal-support"], story: "My spouse and I separated in March 2026 after 12 years of marriage. I want spousal support. I have our tax returns." },
  { id: "family-child-support", court: "family", side: "applicant", filed: ["nothing"], issues: ["child-support"], story: "We separated in April 2026. Our son is Leo, age 7. I want child support. I have his school records and my pay stubs." },
  { id: "family-respondent", court: "family", side: "respondent", filed: ["application"], issues: ["parenting-time"], story: "My former partner started a family case and I was served with the Application on October 6, 2026. It is about parenting time for our daughter, age 5." },
  { id: "family-parenting", court: "family", side: "applicant", filed: ["nothing"], issues: ["parenting-time", "decision-making-responsibility"], story: "We separated in February 2026 and cannot agree on parenting time for our two children, ages 4 and 9. I have our text messages." },
  { id: "family-property", court: "family", side: "applicant", filed: ["nothing"], issues: ["property-division"], story: "We were married for 20 years and separated in January 2026. We cannot agree on dividing the house and pensions. I have the property records." },
  { id: "family-respondent-support", court: "family", side: "respondent", filed: ["application"], issues: ["child-support"], story: "My former spouse served me with an Application for child support on October 1, 2026. Our children are ages 10 and 12. I have my pay stubs." },
  { id: "family-no-order", court: "family", side: "applicant", filed: ["nothing"], issues: ["decision-making-responsibility"], story: "We were never married and there has never been a court order. I want decision-making responsibility for our son, age 3." },
  { id: "family-divorce", court: "family", side: "applicant", filed: ["nothing"], issues: ["other"], story: "We separated in 2024 and agree on everything. I just want a divorce. I have our marriage certificate." },
  { id: "family-relocation", court: "family", side: "applicant", filed: ["nothing"], issues: ["relocation"], story: "I want to move to Ottawa with our daughter, age 8, for a new job in January 2027. Her father does not agree. I have the job offer." },
  // #471 re-test: evidence in a sentence that also names the court papers, and a witness and a calendar.
  { id: "family-evidence-served", court: "family", side: "respondent", filed: ["application"], issues: ["child-support"], story: "My ex served me with an application for child support on October 1, 2026; my bank statements show I paid every month." },
  { id: "family-evidence-witness", court: "family", side: "applicant", filed: ["nothing"], issues: ["parenting-time"], story: "My spouse left in March 2026. Our daughter's school can confirm she lives with me. I kept a calendar of every visit." },
  { id: "family-safety", court: "family", side: "applicant", filed: ["nothing"], issues: ["safety-concerns", "parenting-time"], story: "I left my partner in September 2026 after he threatened me. I want a parenting order for our son, age 6. I have messages he sent." },
  // The messy case pack's 20 cases, and the seven walkthrough paths (storyPackMore.ts).
  ...MESSY_STORIES,
  ...WALKTHROUGH_STORIES,
  ...CHARTER_STORIES,
];

const INTERNAL = /Court path:|Stage: Stage unclear|Main story:|Case story:|Reasoning domain|privilege \/ recipient|procedural stage is uncertain|Important limitation|Knowledge retrieval warning|\bundefined\b|\[object Object\]|\bNaN\b/;
const EVIDENCE = /\b(?:text messages?|messages|emails?|receipts?|invoices?|contracts?|photos?|screenshots?|records?|letters?|pay stubs|tax returns|survey|lease|estimate|agreement|offer letter|job offer|certificate|bank statements|calendar|can confirm)\b/i;
const DOUBLE_STOP = /[A-Za-z0-9)][.]{2}(?![.])/;
// Appended as found: a failed test restarts its worker, which would lose an in-memory list.
// Each run's records in its own folder (harness/packRecords.ts): a later run never replaces them.

function note(run: string, where: string, what: string, ok: boolean, detail = "") {
  if (!ok) {
    appendRecord("findings.jsonl", { run, where, what, detail: detail.replace(/\s+/g, " ").slice(0, 300) });
  }
  expect.soft(ok, `${where}: ${what}${detail ? ` -- ${detail.replace(/\s+/g, " ").slice(0, 200)}` : ""}`).toBe(true);
}

/** The text-level properties every page and reply must hold. */
function checkText(run: string, where: string, text: string) {
  const internal = INTERNAL.exec(text);
  note(run, where, "no internal wording", !internal, internal ? text.slice(Math.max(0, internal.index - 80), internal.index + 80) : "");
  // The copy guard (#477 re-test, item 5): no stored code or field name, on any screen.
  // The site's reasoning machinery (profile names and investigation steps), on any screen (Charter re-test 27 Oct).
  const machinery = internalWordingIn(text);
  note(run, where, "no internal reasoning-profile wording", machinery.length === 0, machinery.join("; "));
  const raw = rawKeysIn(text);
  note(run, where, "no raw field name or code", raw.length === 0, raw.join(", "));
  const double = DOUBLE_STOP.exec(text);
  note(run, where, "no doubled full stop", !double, double ? text.slice(Math.max(0, double.index - 60), double.index + 20) : "");
  const repeated = text.split("\n").map((line) => line.split(/;\s*/).map((part) => part.trim()).filter((part) => part.length >= 6)).find((parts) => new Set(parts).size !== parts.length);
  note(run, where, "no citation or phrase repeated within a line", !repeated, repeated?.join(" ; ") ?? "");
}

/** No toggle on the page without a label or without anything in it (an empty sources toggle under a chat line, Charter re-test 27 Oct). */
async function checkToggles(run: string, where: string, page: Page) {
  const empty = await page.evaluate(() => [...document.querySelectorAll("details")].filter((toggle) => {
    const label = toggle.querySelector(":scope > summary");
    const inside = [...toggle.childNodes].filter((node) => node !== label).map((node) => node.textContent ?? "").join("").trim();
    // A box to fill in, a button or a link is something inside too (the Small Claims form's optional details).
    const controls = [...toggle.querySelectorAll("input, textarea, select, button, a[href]")].some((control) => !label?.contains(control));
    return !(label?.textContent ?? "").trim() || (!inside && !controls);
  }).map((toggle) => (toggle.querySelector(":scope > summary")?.textContent ?? "").trim().slice(0, 60) || "(no label)"));
  note(run, where, "no empty toggle", empty.length === 0, empty.join("; "));
}

const STARTING = new Set(["plaintiff", "applicant"]);
/** Whether the person's own answers settle the stage (stageFromAnswers.ts): starting with nothing filed, or served with only the starting document. */
const settles = (story: Story) => story.court !== "small-claims" && (STARTING.has(story.side) ? story.filed.length === 1 && story.filed[0] === "nothing" : story.filed.length === 1 && ["statement-claim", "application"].includes(story.filed[0]));

/** Civil and Family: the guided questions, answered as the person would, or left for the review. */
async function guidedQuestions(page: Page, story: Story, viaReview: boolean) {
  const leave = viaReview ? new Set(["yourRole", "documents", "filedDocuments", "issues"]) : new Set<string>();
  for (let i = 0; i < 30; i++) {
    const question = page.getByTestId("guided-form-question");
    if (!(await question.isVisible().catch(() => false))) break;
    const key = (await question.getAttribute("data-key")) ?? "";
    // A suggestion from the story ("Is that right?"): the person says No when they
    // mean to answer it themselves (here or in the review), Yes to their own side.
    const suggested = question.getByTestId("guided-form-from-story");
    if (await suggested.isVisible().catch(() => false)) {
      const value = JSON.parse((await suggested.getAttribute("data-value")) ?? "null");
      if (key === "yourRole" && !leave.has(key) && value === story.side) { await question.getByTestId("guided-form-from-story-yes").click(); continue; }
      if (leave.has(key) || ["yourRole", "documents", "filedDocuments", "issues"].includes(key)) await question.getByTestId("guided-form-from-story-no").click();
    }
    // The review route: the person stops the questions and answers the rest in the review
    // ("Skip" would record "not sure", and a skipped question is not asked again there).
    if (leave.has(key)) {
      await page.getByTestId("intake-start-review").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
      return;
    }
    if (key === "yourRole") { await question.getByTestId(`guided-option-${story.side}`).click(); continue; }
    if (key === "documents" || key === "filedDocuments" || (key === "issues" && story.issues)) {
      const yes = question.getByTestId("guided-form-from-story-yes");
      if (await yes.isVisible().catch(() => false)) await question.getByTestId("guided-form-from-story-no").click();
      for (const item of key === "issues" ? story.issues! : story.filed) await question.getByTestId(`guided-check-${item}`).check();
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    const yes = question.getByTestId("guided-form-from-story-yes");
    if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
    // A question asking for a date: a day without its year is asked for the year (dateYear.ts).
    const box = question.getByRole("textbox");
    if ((await box.count()) && asksForDate(await question.innerText()) && !(await box.inputValue()).trim()) {
      await box.fill("October 6");
      await question.getByTestId("guided-form-next").click();
      note(story.id, `questions (${key})`, "a date without its year is asked for the year", await question.getByTestId("guided-form-needs-more").isVisible({ timeout: 5_000 }).catch(() => false));
      if (await question.getByTestId("guided-form-needs-more").isVisible().catch(() => false)) { await box.fill("October 6, 2026"); await question.getByTestId("guided-form-next").click(); }
      continue;
    }
    // A box already filled from the story ("Leo, age 7."): the person keeps it, so the
    // chat's "Got it" line echoes their own words (where "Leo, age 7.." showed).
    if ((await box.count()) && (await box.inputValue()).trim()) { await question.getByTestId("guided-form-next").click(); continue; }
    await question.getByTestId("guided-form-skip").click();
  }
  checkText(story.id, "questions", await page.getByTestId("guided-form-chat").innerText().catch(() => ""));
  await page.getByTestId("guided-form-done").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

/** Civil and Family: what was left for the review, answered there. */
async function answerInReview(page: Page, story: Story, dates = true) {
  const panel = page.getByTestId("intake-review");
  const question = (id: string) => panel.locator(`[data-testid=intake-initial-question][data-question="${id}"]`);
  const sideLabel: Record<Story["side"], RegExp> = { plaintiff: /plaintiff/i, defendant: /defendant/i, applicant: /starting it/i, respondent: /served/i };
  if (await question("yourRole").count()) await question("yourRole").getByRole("button", { name: sideLabel[story.side] }).click();
  for (const [id, items] of [[story.court === "civil" ? "documents" : "filedDocuments", story.filed], ["issues", story.issues ?? []]] as const) {
    const box = question(id);
    if (!(await box.count()) || items.length === 0) continue;
    for (const item of items) await box.locator(`input[data-testid=intake-field-pick][value="${item}"]`).check();
    await box.getByTestId("intake-field-save").click();
  }
  if (dates) await reviewDates(page, story.id);
}

/** Every review question asking for a date: "October 6" is asked for its year, then the full date is kept. */
async function reviewDates(page: Page, run: string) {
  const panel = page.getByTestId("intake-review");
  const open = panel.locator("[data-testid=intake-initial-question][data-answered=false]");
  for (let i = 0; i < (await open.count()); i++) {
    const question = open.nth(i);
    const box = question.getByRole("textbox");
    if (!(await box.count()) || !asksForDate(await question.locator("p").first().innerText())) continue;
    const id = (await question.getAttribute("data-question")) ?? "";
    await box.fill("October 6");
    await box.press("Enter");
    const asked = question.getByTestId("intake-field-needs-more");
    note(run, `review (${id})`, "a date without its year is asked for the year", await asked.isVisible({ timeout: 5_000 }).catch(() => false));
    await box.fill("October 6, 2026");
    await box.press("Enter");
  }
}

/** Small Claims, from the home page; answered in the review panel, or through the form's own boxes. Returns the amount offered. */
async function smallClaims(page: Page, story: Story, viaReview: boolean): Promise<string | null> {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(story.story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  if (!viaReview) {
    // The questions one at a time (the guided route), answered as the person would.
    await smallClaimsGuided(page, story);
    // The review then offers nothing it has not been told, or the amount the story claims.
    const use = page.locator('[data-question="sc-amount-claimed"]').getByRole("button", { name: /^Use “.*” \(from your story\)$/ });
    return (await use.count()) ? (/“(.*)”/.exec((await use.first().innerText()) ?? "")?.[1] ?? null) : null;
  }
  return answerSmallClaimsReview(page, story);
}

/** Small Claims' review panel, answered as the person would: the kind of dispute, "No" to filed, the story's amount. Returns the amount offered. */
async function answerSmallClaimsReview(page: Page, story: Story): Promise<string | null> {
  if ((await page.getByTestId("intake-review").getAttribute("data-phase")) !== "reviewing") await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  // The side was given in the situation questions (step 2): the review never asks it again.
  note(story.id, "review", "the side given at the start is not asked again", (await q("sc-orient-role").count()) === 0);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  const filedQuestion = story.side === "defendant" ? "sc-defendant-defence-filed" : "sc-claim-filed";
  if (await q(filedQuestion).count()) await q(filedQuestion).getByRole("button", { name: "No", exact: true }).click();
  const use = q("sc-amount-claimed").getByRole("button", { name: /^Use “.*” \(from your story\)$/ });
  const offered = (await use.count()) ? (/“(.*)”/.exec((await use.first().innerText()) ?? "")?.[1] ?? null) : null;
  if (offered) await use.first().click();
  await reviewDates(page, story.id);
  return offered;
}

/**
 * Small Claims' questions one at a time, answered as the person would: a date first
 * without its year (it must be asked for), the side in words, "No" to filed, nothing
 * known otherwise. "Here's what I understood" is confirmed as offered, except a claim
 * of their own, which is unticked: it must not be offered again (#471 re-test).
 * Returns how many times the counterclaim was offered.
 */
async function smallClaimsGuided(page: Page, story: Story): Promise<number> {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let counterclaimOffers = 0;
  let lastQuestion = "";
  for (let i = 0; i < 25; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(question).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) {
      for (const row of await proposals.getByTestId("story-proposal-row").all()) {
        if (/A claim of your own/.test(await row.innerText())) {
          counterclaimOffers += 1;
          const tick = row.locator("input[type=checkbox]").first();
          if (await tick.count()) await tick.uncheck();
        }
      }
      await proposals.getByRole("button").last().click();
      continue;
    }
    const text = (await question.innerText()).replace(/\s+/g, " ");
    if (text === lastQuestion && !/add the year/i.test(text)) break;
    lastQuestion = text;
    const answer = /add the year/i.test(text) ? "October 6, 2026"
      : asksForDate(text) ? "October 6"
      : /bringing this claim|responding to a claim/i.test(text) ? (story.side === "defendant" ? "Responding to a claim (defendant)" : "Bringing the claim (plaintiff)")
      : /kind of dispute/i.test(text) ? "A contract or agreement dispute"
      : /filed|served/i.test(text) ? "No"
      : "I don't know";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    // The reply (the next question, or the request for the year) before reading on.
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 30_000 }).toBeGreaterThan(before + 1).catch(() => {});
    if (answer === "October 6") {
      const asked = page.locator("[data-testid=guided-message][data-from=assistant]").last();
      note(story.id, "questions (Small Claims)", "a date without its year is asked for the year", await expect(asked).toContainText("add the year", { timeout: 15_000 }).then(() => true, () => false), text.slice(0, 120));
    }
  }
  note(story.id, "questions (Small Claims)", "a claim of their own, unticked, is not offered again", counterclaimOffers <= 1, `offered ${counterclaimOffers} times`);
  checkText(story.id, "questions", await page.locator("[data-testid=guided-message]").allInnerTexts().then((all) => all.join("\n")));
  if ((await page.getByTestId("intake-review").getAttribute("data-phase")) !== "reviewing") {
    await page.getByTestId("intake-start-review").click().catch(() => {});
  }
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
  return counterclaimOffers;
}

/** Small Claims' own form ("Fill in the form yourself"): the story saved, then the review. Returns the amount offered there. */
async function smallClaimsForm(page: Page, story: Story): Promise<string | null> {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(story.story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  const box = page.getByLabel("Case story", { exact: true });
  if ((await box.count()) && !(await box.inputValue()).trim()) await box.fill(story.story);
  const save = page.locator('[data-testid$="story-save"]:visible').first();
  if ((await save.count()) && (await save.isEnabled())) await save.click();
  return answerSmallClaimsReview(page, story);
}

/** "Not sure which one?" on the home page: the guide's questions, then the path it offers that the story's court is. */
async function notSurePath(page: Page, story: Story) {
  const guide = story.guide!;
  await page.goto("/");
  await page.getByRole("button", { name: /Not sure which one\?/ }).click();
  await page.getByLabel("Guide province or territory").selectOption("Ontario");
  await page.getByLabel("Guide city or municipality").fill("Sudbury");
  await page.getByLabel("Guide what happened").fill(story.story);
  await page.getByLabel("Guide relationship").fill(guide.relationship);
  await page.getByLabel("Guide remedy").fill(guide.remedy);
  await page.getByLabel("Guide amount").fill(guide.amount);
  await page.getByLabel("Guide case started").selectOption(guide.started);
  await page.getByRole("button", { name: "Review possible court paths" }).click();
  const choose = page.getByRole("button", { name: `Choose ${guide.choose === "small-claims" ? "Small Claims" : guide.choose === "civil" ? "Civil" : "Family"}` });
  note(story.id, "not-sure path", `${guide.choose} is offered for this amount`, await choose.isVisible().catch(() => false));
  await choose.click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByTestId("intake-review")).first()).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await expect(page.getByTestId("intake-review")).toBeVisible({ timeout: 60_000 });
}

async function confirmAndContinue(page: Page) {
  const panel = page.getByTestId("intake-review");
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
}

async function lastReply(page: Page, question: string): Promise<string> {
  const transcript = page.getByTestId("case-partner-transcript");
  const before = await transcript.locator("div.mr-auto").count();
  await page.getByPlaceholder("Ask about an important date, document, or case detail.").fill(question);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(transcript.locator("div.mr-auto")).toHaveCount(before + 1, { timeout: 60_000 });
  // The reply, not the "reviewing this case ..." line shown while it is on its way.
  const reply = transcript.locator("div.mr-auto").last();
  await expect(reply).not.toContainText("is reviewing this case", { timeout: 60_000 });
  return reply.innerText();
}

// The case page's top line repeats the situation answers (step 2); a case saved before them keeps the older side line.
const SIDE_LINE: Record<Story["side"], RegExp> = {
  plaintiff: /You are bringing this case \(plaintiff\)|You're suing in Small Claims Court|You're bringing a civil case/,
  applicant: /You started, or plan to start, this case \(applicant\)|You're bringing a family case/,
  defendant: /You are responding \(defendant\)|You're being sued in Small Claims Court|You're responding to a civil case/,
  respondent: /You are responding \(respondent\)|You're responding to a family case/,
};

/**
 * GATE A2: THE KIND OF CLAIM. The kinds each story's own words fit (Small Claims claim
 * types), or "not-sure". Every screen that names a kind of claim must name one of these,
 * or say it is not sure and ask, and show the story's words it rests on. A kitchen
 * renovation is never a personal loan.
 */
const CLAIM_KIND: Record<string, string[]> = {
  "sc-deck-owed": ["sc-claim-breach-of-contract-services", "sc-claim-unpaid-debt-services"],
  "sc-movers-damage": ["sc-claim-property-damaged-lost-in-business-care", "sc-claim-breach-of-contract-services"],
  "sc-roofer-single": ["sc-claim-breach-of-contract-services"],
  "sc-deposit-back": ["sc-claim-deposit-not-returned"],
  "sc-loan-friend": ["sc-claim-personal-loan-between-individuals"],
  "sc-car-estimate": ["sc-claim-vehicle-accident-uninsured-driver-property-damage"],
  "sc-invoice-unpaid": ["sc-claim-unpaid-debt-services"],
  "sc-unclear": ["sc-claim-breach-of-contract-services"],
  "sc-defendant-served": ["sc-claim-non-payment-goods-sold"],
  "sc-defendant-unclear": ["sc-claim-unpaid-debt-services"],
  "sc-rent-unclear": ["sc-claim-deposit-not-returned"],
  ...Object.fromEntries([...MESSY_STORIES, ...WALKTHROUGH_STORIES].filter((story) => story.kinds).map((story) => [story.id, story.kinds!])),
};
const CLAIM_NAME = new Map((CLAIM_TYPES as { id: string; name: string }[]).map((type) => [type.id, type.name]));
const KIND_LINE = /Kind of claim (?:this matches|you confirmed)\s*([^\n]*)/g;
/** Every kind of claim a screen names: one the story fits, or "not sure" with a question, with the story's words beside it. */
function checkClaimKind(run: string, where: string, text: string, story: Story) {
  const named = [...text.matchAll(KIND_LINE)].map((match) => match[1].trim()).filter(Boolean);
  for (const name of named) {
    const id = [...CLAIM_NAME.entries()].find(([, label]) => name.startsWith(label))?.[0] ?? null;
    const fits = story.court === "small-claims" && id !== null && (CLAIM_KIND[story.id] ?? []).includes(id);
    const notSure = /not sure/i.test(name);
    const quoted = [...text.matchAll(/“([^”]{8,})”/g)].some((match) => story.story.includes(match[1]));
    const finding = { run, where, shown: name, expected: CLAIM_KIND[story.id] ?? ["(none: this area names no kind of claim)"], fits, notSure, quoted };
    appendRecord("claim-kind.jsonl", finding);
    note(run, where, "the kind of claim shown fits the story, or says it is not sure and asks", fits || notSure, name);
    note(run, where, "the kind of claim shown carries the story's words", quoted, name);
  }
}

for (const story of STORIES) {
  for (const route of story.routes ?? (["questions", "review"] as Route[])) {
    test(`${story.id} (${route})`, async ({ page }) => {
      test.setTimeout(240_000);
      const run = `${story.id} (${route})`;
      await grantSiteAccess(page);
      await autoAnswerSituation(page, situationForStory(story));
      // Gate A1: every question shown in this case, on every screen.
      const asked = await recordAsks(page);
      // A chat reply that fails says why in the run's log: its status and body, a request that
      // never completed, and the page's own error line (case 05 failed only on the CI runner).
      page.on("response", async (response) => {
        if (/\/api\/(guided-assistant|assistant\/law)/.test(response.url()) && !response.ok()) console.log(`CHAT-DIAG ${run} ${response.status()} ${response.url()} ${(await response.text().catch(() => "")).slice(0, 400)}`);
      });
      page.on("requestfailed", (request) => { if (/\/api\/(guided-assistant|assistant\/law)/.test(request.url())) console.log(`CHAT-DIAG ${run} failed ${request.url()} ${request.failure()?.errorText}`); });
      page.on("console", async (message) => { if (/guided assistant request failed|CourtSimplified guided assistant/i.test(message.text())) console.log(`CHAT-DIAG ${run} console ${JSON.stringify(await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => "?")))).slice(0, 400)}`); });
      page.on("pageerror", (error) => console.log(`CHAT-DIAG ${run} pageerror ${String(error).slice(0, 300)}`));
      const account = await fakeAccount(page);
      await serveFromThisCommit(page, story.court, account.rows as unknown as Map<string, Record<string, unknown>>);

      // 1-2. Start the case and answer.
      if (route === "not-sure") {
        await notSurePath(page, story);
        await answerSmallClaimsReview(page, story);
      } else if (story.court === "small-claims" && route === "form") {
        const offered = await smallClaimsForm(page, story);
        note(run, "form", `the amount offered is one the story claims`, amountFits(story, offered, false), `offered ${offered ?? "nothing"}`);
      } else if (story.court === "small-claims") {
        const offered = await smallClaims(page, story, route === "review");
        // The review offers the story's amount; the questions' review may offer nothing, but never a wrong amount.
        note(run, route === "review" ? "review" : "questions", `the amount offered is one the story claims`, amountFits(story, offered, route === "review"), `offered ${offered ?? "nothing"}`);
      } else {
        await openBuilder(page, story.court, { story: story.story });
        await guidedQuestions(page, story, route === "review");
        if (route === "review") await answerInReview(page, story);
      }
      checkText(run, "review", await page.getByTestId("intake-review").innerText()); await checkToggles(run, "review", page);

      // 3. Confirm, and the next step.
      await confirmAndContinue(page);
      await page.waitForTimeout(1_500);
      const results = await page.locator("body").innerText();
      checkText(run, "results", results); await checkToggles(run, "results", page);
      checkClaimKind(run, "results", results, story);
      if (settles(story)) {
        note(run, "results", "a stage the answers settle is not asked again", !results.includes("Which of these fits your case best?"));
      }

      // 4. The chat.
      const ask = page.getByRole("button", { name: "Ask follow-up questions" });
      // The chat opens once the case is saved (a moment after the next step shows).
      await ask.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
      if (await ask.isVisible().catch(() => false)) {
        await ask.click();
        const gather = await lastReply(page, "What should I gather first?");
        checkText(run, "chat", gather);
        const quotes = [...gather.matchAll(/“([^”]+)”/g)].map((match) => match[1]);
        // Only when the story names some evidence: then there are the person's own words to quote.
        if (EVIDENCE.test(story.story)) note(run, "chat", "the evidence reply quotes the person's own words", quotes.some((quote) => story.story.includes(quote)), gather.slice(0, 200));
        const asked = await lastReply(page, "How long do I have to respond?");
        checkText(run, "chat", asked); await checkToggles(run, "chat", page);
        note(run, "chat", "no line ends on its lead-in with nothing after it", !/To keep your case record complete:\s*$/m.test(gather + "\n" + asked), asked.slice(-160));
        if (/served/i.test(story.story) && /October \d/.test(story.story)) {
          note(run, "chat", "does not ask for the main dates once a served date is recorded", !/main dates/i.test(gather + asked), (gather + asked).slice(Math.max(0, (gather + asked).search(/main dates/i) - 200), (gather + asked).search(/main dates/i) + 80));
        }
      } else note(run, "chat", "the follow-up chat can be opened", false);

      // 5. The case page.
      const row = [...account.rows.values()][0] as Record<string, unknown> | undefined;
      if (row?.id) {
        await page.goto(`/cases/${row.id}`);
        // The case page reads the case again shortly after opening (before asking for a stage).
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(4_000);
        const casePage = await page.locator("body").innerText();
        checkText(run, "case page", casePage); await checkToggles(run, "case page", page);
        // The header's own side line, for either side (only the responding side had one).
        note(run, "case page", "names the person's side", SIDE_LINE[story.side].test(casePage));
        checkClaimKind(run, "case page", casePage, story);
        if (settles(story)) note(run, "case page", "a stage the answers settle is not asked again", !casePage.includes("Which of these fits your case best?"));
      } else note(run, "case page", "the case was saved", false);

      // Gate A2 on the guided route's own card: "This sounds like it may be about: X -- is that right?"
      for (const item of asked.filter((entry) => entry.kind === "ask" && entry.surface === "sc-claim-kind")) {
        const name = /may be about: (.*?) — is that right?/.exec(item.text)?.[1] ?? item.text;
        checkClaimKind(run, "guided card", `Kind of claim this matches ${name}
${item.text}`, story);
      }

      // Gate A1: no fact asked twice in this case, across every screen.
      await page.waitForTimeout(600);
      const repeats = factsAskedTwice(asked, situationForStory(story));
      appendRecord("ask-once.jsonl", ({ run, asked: asked.filter((item) => item.kind === "ask").map((item) => `${item.surface}:${item.id}@${item.screen}`), repeats: repeats.map((repeat) => ({ fact: repeat.fact, given: `${repeat.given.surface}:${repeat.given.id}@${repeat.given.screen} "${repeat.given.text.slice(0, 80)}"`, asks: repeat.asks.map((item) => `${item.surface}:${item.id}@${item.screen} "${item.text.slice(0, 80)}"`) })) }));
      // 26 Oct re-test, case 19: "No, nothing yet" was followed by "Has the other party filed a Defence?"
      // and "what date was it served?". Nothing filed means nothing served or defended, in any story.
      const start = situationForStory(story);
      if (story.court === "small-claims" && start.where === "starting" && start.filed === "nothing") {
        const served = asked.filter((item) => item.kind === "ask" && /^(sc-defence-filed|sc-date-claim-served|sc-date-claim-issued|sc-defence-time-elapsed|sc-defendant-noted-in-default)$/.test(item.id));
        note(run, "ask-once", "'No, nothing yet': no Defence or served-date question", served.length === 0, served.map((item) => `${item.id}@${item.screen}`).join(", "));
      }
      note(run, "ask-once", "no fact is asked twice in the case", repeats.length === 0, repeats.map((repeat) => `${repeat.fact} (${repeat.asks.map((item) => `${item.surface}:${item.id}@${item.screen}`).join(", ")})`).join("; "));
      // Jason, 2026-10-24: any fact asked twice fails the build, whatever else this run found.
      expect(repeats.map((repeat) => `${repeat.fact}: ${repeat.asks.map((item) => `${item.surface}:${item.id}@${item.screen}`).join(", ")}`), "no fact is asked twice in the case").toEqual([]);
    });
  }
}


/*
 * SITUATIONS FROM THE #471 RE-TEST, EACH THROUGH BOTH ROUTES WHERE THE SCREEN EXISTS.
 * The served-date year, the rent amount, the evidence quote and the counterclaim are
 * checked in every story run above; these need steps of their own.
 */
const byId = (id: string) => STORIES.find((story) => story.id === id)!;

/** Answers given again after a story change: kept, re-chosen or re-entered, until none is from the earlier story. */
async function answerAgain(page: Page, story: Story) {
  const panel = page.getByTestId("intake-review");
  for (let round = 0; round < 6 && (await page.getByTestId("intake-answer-stale").count()) + (await panel.getByTestId("intake-hidden-keep").count()) > 0; round++) {
    for (const keep of ["intake-keep-answer", "intake-hidden-keep"]) {
      while (await panel.getByTestId(keep).count()) await panel.getByTestId(keep).first().click();
    }
    const open = panel.locator("[data-testid=intake-initial-question][data-answered=false]");
    for (let i = 0; i < (await open.count()); i++) {
      const question = open.nth(i);
      const id = (await question.getAttribute("data-question")) ?? "";
      const label = await question.locator("p").first().innerText();
      if (id === "yourRole" || id === "sc-orient-role") {
        const sides: Record<Story["side"], RegExp> = { plaintiff: /plaintiff/i, defendant: /defendant/i, applicant: /starting it/i, respondent: /served/i };
        await question.getByRole("button", { name: sides[story.side] }).first().click();
        continue;
      }
      const picks = question.getByTestId("intake-field-pick");
      if (await picks.count()) {
        const wanted = id === "issues" ? story.issues ?? [] : story.filed;
        const ticks = wanted.length ? wanted.map((value) => question.locator(`input[data-testid=intake-field-pick][value="${value}"]`)) : [picks.first()];
        for (const tick of ticks) if (await tick.count()) await tick.check();
        await question.getByTestId("intake-field-save").click();
        continue;
      }
      const box = question.getByRole("textbox");
      if (await box.count()) { await box.fill(asksForDate(label) ? "October 6, 2026" : "Synthetic answer"); await box.press("Enter"); continue; }
      const no = question.getByRole("button", { name: "No", exact: true });
      if (await no.count()) { await no.click(); continue; }
      const choice = question.locator("button:not([data-testid=intake-unknown]):not([data-testid=intake-keep-answer])").first();
      if (await choice.count()) await choice.click();
    }
    // A line answered for the earlier story with no question: given again as it stands.
    // One labelled line at a time: each answered line loses its label, so the list moves.
    for (let n = 0; n < 12; n++) {
      const lines = panel.locator("div:has(> [data-testid=intake-answer-stale])");
      let acted = false;
      for (let k = 0; k < (await lines.count()) && !acted; k++) {
        const line = lines.nth(k);
        const box = line.locator("textarea:visible:enabled, input[type=text]:visible:enabled").first();
        const pressed = line.locator("[data-testid=intake-entry-yes-no][aria-pressed=true]").first();
        if ((await box.count()) && (await box.inputValue()).trim()) { const value = await box.inputValue(); acted = await box.fill(`${value} `, { timeout: 3_000 }).then(() => box.fill(value, { timeout: 3_000 })).then(() => box.blur()).then(() => true, () => true); }
        else if (await pressed.count()) { await pressed.click(); acted = true; }
      }
      if (!acted) break;
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(400);
  }
}

for (const [id, court] of [["civil-deposit", "civil"], ["family-spousal", "family"], ["sc-loan-friend", "small-claims"]] as const) {
  for (const route of ["questions", "review"] as const) {
    test(`situation: one sentence added keeps every answer; the story rewritten, every answer given again, confirm opens -- ${court} (${route})`, async ({ page }) => {
      test.setTimeout(240_000);
      const story = byId(id);
      const run = `story-change ${court} (${route})`;
      await grantSiteAccess(page);
      await autoAnswerSituation(page, situationForStory(story));
      const account = await fakeAccount(page);
      await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
      if (court === "small-claims") await smallClaims(page, story, route === "review");
      else {
        await openBuilder(page, court, { story: story.story });
        await guidedQuestions(page, story, route === "review");
        if (route === "review") await answerInReview(page, story);
      }
      const panel = page.getByTestId("intake-review");
      const box = panel.getByRole("textbox", { name: "Review: Your story", exact: true });
      // One sentence added (#477 re-test: editing one sentence lost every follow-up answer):
      // every answer stays, none is labelled or asked again.
      const before = await panel.locator("[data-testid=intake-initial-question]").evaluateAll((items) => items.map((item) => `${item.getAttribute("data-question")}:${item.getAttribute("data-answered")}`));
      await box.fill(`${await box.inputValue()} Synthetic: one more detail added later.`);
      await panel.getByTestId("review-story-save").click();
      await page.waitForTimeout(800);
      expect(await page.getByTestId("intake-answer-stale").count(), "one sentence added: no answer is set aside").toBe(0);
      const after = await panel.locator("[data-testid=intake-initial-question]").evaluateAll((items) => items.map((item) => `${item.getAttribute("data-question")}:${item.getAttribute("data-answered")}`));
      expect(after.filter((item) => item.endsWith(":false") && !before.includes(item)), "one sentence added: nothing answered is asked again").toEqual([]);
      // The story rewritten: the answers to the earlier one are labelled, not wiped.
      await box.fill("Synthetic rewritten story: a different matter entirely, told again from the start with new facts. It has three sentences now. None is the same as before.");
      await panel.getByTestId("review-story-save").click();
      await page.waitForTimeout(800);
      note(run, "review", "answers to the earlier story are labelled, not wiped", (await page.getByTestId("intake-answer-stale").count()) > 0);
      await answerAgain(page, story);
      note(run, "review", "every answer given again: nothing is left from the earlier story", (await page.getByTestId("intake-answer-stale").count()) === 0 && (await panel.getByTestId("intake-hidden-keep").count()) === 0);
      const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
      while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
      await page.getByTestId("intake-review-acknowledgement").check();
      const needs = await page.getByTestId("intake-confirm-needs").innerText().catch(() => "");
      note(run, "review", "confirm is not blocked by answers already given again", !/earlier version/.test(needs) && (await page.getByTestId("intake-confirm").isEnabled()), needs);
    });
  }
}

for (const court of ["civil", "family"] as const) {
  test(`situation: the side given at the start is shown, and shows chosen when changed -- ${court} (review)`, async ({ page }) => {
    test.setTimeout(180_000);
    const story = byId(court === "civil" ? "civil-deposit" : "family-spousal");
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, court, { story: story.story });
    await guidedQuestions(page, story, true);
    // The side is chosen in the situation questions (step 2): the review shows it as given, and
    // Change, from anywhere, opens the questions with it marked and looking chosen.
    note(`side-highlight ${court}`, "review", "the review shows the side given at the start", await page.getByTestId("intake-entry-from-start").first().isVisible());
    // This step looks at the questions itself: the automatic answers are switched off for it.
    await autoAnswerSituation(page, false);
    await page.getByTestId("situation-change").click();
    const pressed = page.getByTestId("situation-questions").locator('[data-testid="situation-option"][aria-pressed="true"]').first();
    await expect(pressed).toBeVisible();
    const shown = await pressed.evaluate((element) => getComputedStyle(element).backgroundColor);
    note(`side-highlight ${court}`, "situation", "the answer given is marked, and looks chosen", (await pressed.getAttribute("data-value")) === situationForStory(story).where && shown === "rgb(47, 125, 103)", shown);
    await page.getByTestId("situation-change-done").click();
    await expect(page.getByTestId("situation-line")).toBeVisible();
  });
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`situation: review questions keep their places while answered -- ${court}`, async ({ page }) => {
    test.setTimeout(180_000);
    const story = byId(court === "small-claims" ? "sc-unclear" : court === "civil" ? "civil-deposit" : "family-spousal");
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") {
      await page.goto("/?path=small-claims");
      await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
      await page.getByLabel("City or municipality").fill("Sudbury");
      await page.getByLabel("Tell us what happened in your own words").fill(story.story);
      await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
      await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
      const acknowledgement = page.getByTestId("acknowledgement-checkbox");
      await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
      if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
      await page.getByTestId("intake-start-review").click();
    } else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, true);
    }
    const panel = page.getByTestId("intake-review");
    const order = () => panel.locator("[data-testid=intake-initial-question]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-question") ?? ""));
    const before = await order();
    // Answer each question in turn, typing where there is a box; none moves.
    for (const id of before) {
      const question = panel.locator(`[data-testid=intake-initial-question][data-question="${id}"]`);
      const box = question.getByRole("textbox");
      const pick = question.getByTestId("intake-field-pick").first();
      if (await pick.count()) { await pick.check(); await question.getByTestId("intake-field-save").click(); }
      else if (await box.count()) { await box.pressSequentially("Synthetic 2026-05-12", { delay: 10 }); await box.press("Tab"); }
      else { const choice = question.locator("button:not([data-testid=intake-unknown]):enabled").first(); if (await choice.count()) await choice.click(); }
      const now = (await order()).filter((item) => before.includes(item));
      if (JSON.stringify(now) !== JSON.stringify(before.filter((item) => now.includes(item)))) {
        note(`order ${court}`, "review", "questions keep their places while answered", false, `${before.join(" > ")}  became  ${now.join(" > ")}`);
        return;
      }
    }
    note(`order ${court}`, "review", "questions keep their places while answered", true);
  });
}

/*
 * THE #477 RE-TEST ON THE LIVE SITE (Chrome, 2026-10-25), EACH WITH THE REAL STEPS.
 */

// Case 11: the "Before you start" notice shown again after confirming (it is kept per account,
// so signing in brings it back, L35). "Show my next step" showed it below the button, out of
// sight; ticking it and pressing Continue crashed the page, and the case then crashed every
// time it was opened.
for (const court of ["civil", "family", "small-claims"] as const) {
  test(`retest-477 case 11: the notice after confirming shows where the person is looking, Continue opens the next step, and the case opens -- ${court}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = byId(court === "civil" ? "civil-defendant-debt" : court === "family" ? "family-spousal" : "sc-defendant-served");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error).slice(0, 300)));
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, true);
      await answerInReview(page, story);
    }
    const panel = page.getByTestId("intake-review");
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    // The notice is owed again, as after signing in on this device.
    await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith("courtSimplifiedNoticeAcknowledged")) localStorage.removeItem(key); });
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
    await page.getByTestId("intake-continue-guidance").click();
    const notice = page.getByTestId("acknowledgement-checkbox");
    await expect(notice, "the notice is on screen where the person pressed the button").toBeInViewport({ timeout: 15_000 });
    await notice.check();
    await page.getByTestId("acknowledgement-continue").click();
    await expect(page.getByTestId("completed-case-overview").or(page.getByTestId("sign-in-for-safety-check")).first(), "Continue opens the next step").toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
    expect(errors, "no page error").toEqual([]);
    // The case opens, and opens again.
    const row = [...account.rows.values()][0] as Record<string, unknown> | undefined;
    expect(row?.id, "the case was saved").toBeTruthy();
    for (let visit = 0; visit < 2; visit++) {
      await page.goto(`/cases/${row!.id}`);
      await page.waitForLoadState("networkidle").catch(() => {});
      await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
      await expect(page.getByTestId("case-intake-gate"), "a confirmed case is not sent back to an unfinished intake").toHaveCount(0);
    }
    expect(errors, "no page error").toEqual([]);
  });
}

// Case 11, live re-test 26 Oct: after the notice, Continue closed it and nothing else happened; the
// person had to press "Show my next step" again. One press of Continue, with the mouse where a
// person's would be, must open the next step. The overview must not already be showing, so the
// check cannot pass on a page that was there before Continue.
for (const court of ["civil", "family", "small-claims"] as const) {
  test(`retest-26oct case 11: one real click on the notice's Continue opens the next step -- ${court}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = byId(court === "civil" ? "civil-defendant-debt" : court === "family" ? "family-spousal" : "sc-defendant-served");
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, true);
      await answerInReview(page, story);
    }
    const panel = page.getByTestId("intake-review");
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    // The notice is owed again, as after signing in on this device.
    await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith("courtSimplifiedNoticeAcknowledged")) localStorage.removeItem(key); });
    // The live site's own wait: the account and the saved case take a moment to come back.
    for (const host of ["**/auth/v1/**", "**/rest/v1/**"]) await page.route(host, async (route) => { await new Promise((done) => setTimeout(done, 1_500)); await route.fallback(); });
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
    const nextStep = page.getByTestId("completed-case-overview").or(page.getByTestId("sign-in-for-safety-check"));
    const realClick = async (testId: string) => {
      const target = page.getByTestId(testId);
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (!box) throw new Error(`${testId} has no box on screen`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    };
    await realClick("intake-continue-guidance");
    const notice = page.getByTestId("acknowledgement-checkbox");
    await expect(notice).toBeInViewport({ timeout: 15_000 });
    await expect(nextStep, "the next step is not open before Continue").toHaveCount(0);
    await realClick("acknowledgement-checkbox");
    await expect(notice).toBeChecked();
    // The live analysis takes a minute or more; it is held here so the wait can be seen. Live, the
    // page landed at its top with the progress line out of sight and "Show my next step" still
    // pressable, so it looked as if nothing happened and the person pressed again.
    await page.route(`**/api/${court}/analyze`, async (route) => { await new Promise((done) => setTimeout(done, 20_000)); await route.fallback(); });
    await page.route("**/api/intake/safety-check", async (route) => { await new Promise((done) => setTimeout(done, 3_000)); await route.fallback(); });
    await realClick("acknowledgement-continue");
    const status = page.getByTestId("next-step-status");
    // At once: the screens report their work only after saving and checking the sign-in (seconds, live).
    await expect(status, "the next step is being worked out, where the person is looking, at once").toBeInViewport({ timeout: 1_000 });
    await expect(page.getByTestId("intake-continue-guidance"), "it cannot be pressed again while it works").toBeDisabled({ timeout: 1_000 });
    await expect(nextStep.first(), "one press of Continue opens the next step").toBeVisible({ timeout: 90_000 });
  });
}

// Case 11, after the page stopped: the case was confirmed but no next step was made, and the
// case page asked for the review again. It says the information is confirmed and opens the
// next step without asking anything again.
test("retest-477 case 11: a confirmed case with no next step yet opens it from the case page", async ({ page }) => {
  test.setTimeout(240_000);
  const story = byId("civil-defendant-debt");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situationForStory(story));
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "civil", account.rows as unknown as Map<string, Record<string, unknown>>);
  await openBuilder(page, "civil", { story: story.story });
  await guidedQuestions(page, story, true);
  await answerInReview(page, story);
  const panel = page.getByTestId("intake-review");
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  await page.waitForLoadState("networkidle").catch(() => {});
  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  await expect(page.getByTestId("case-confirmed-no-step")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Review your initial information before receiving case guidance")).toHaveCount(0);
  await page.getByTestId("case-show-next-step").click();
  await expect(page.getByTestId("intake-review"), "the confirmation stands").toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
});

// A bad saved record never locks a person out: the case page and the intake show a plain
// message with a way back (or the page itself), never the bare "This page couldn't load".
for (const [label, damage] of [
  ["sections not a record", (master: Record<string, unknown>) => { (master.intakeCheckpoint as Record<string, unknown>).sections = "damaged"; }],
  ["position and intake data of the wrong kind", (master: Record<string, unknown>) => { master.position = 42; master.intakeData = ["damaged"]; master.workflowStatus = "damaged"; }],
] as const) {
  test(`retest-477 case 11: a damaged saved case still opens with a way back -- ${label}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = byId("civil-defendant-debt");
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, "civil", account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, "civil", { story: story.story });
    await expect(page.getByTestId("intake-review")).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => account.rows.size, { timeout: 60_000 }).toBe(1);
    const row = [...account.rows.values()][0] as Record<string, unknown>;
    damage(row.master_result as Record<string, unknown>);
    for (const url of [`/cases/${row.id}`, `/builder?path=civil&intake=${row.id}`]) {
      await page.goto(url);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2_000);
      await expect(page.getByText("This page couldn’t load"), `${url}: never the bare error page`).toHaveCount(0);
      if (await page.getByTestId("page-error").count()) await expect(page.getByTestId("page-error-cases")).toBeVisible();
    }
  });
}

// Case 19: Marcus started as the one suing ($1,650), then changed his answer: Circuit Doctors'
// owner served him with a claim on October 20. "Amount claimed: $1,650 (your answer already
// given; it is not asked again)" stayed on the claim against him. The old side's facts are
// set aside when the side changes, and asked again.
test("retest-477 case 19: after changing side, the old side's amount is not carried -- small-claims", async ({ page }) => {
  test.setTimeout(240_000);
  const story = MESSY_STORIES.find((item) => item.id === "m19-laptop-repair")!;
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await smallClaims(page, story, true);
  const amount = page.locator('[data-question="sc-amount-claimed"]');
  if (!(await amount.getByRole("button", { name: /from your story/ }).count())) {
    // No amount offered: the person types the total they want back.
    await amount.getByRole("textbox").fill("$1,650");
    await amount.getByRole("textbox").press("Enter");
  }
  await expect(amount).toHaveAttribute("data-answered", "true");
  // The side changes: served with a Plaintiff's Claim on October 20, 2026.
  await autoAnswerSituation(page, { where: "served", papers: "small-claims-7A", receivedOn: "October 20, 2026" });
  await page.getByTestId("situation-change").click();
  await expect(page.getByTestId("situation-line")).toContainText(/Plaintiff.s Claim \(Form 7A\)/, { timeout: 30_000 });
  await page.waitForTimeout(1_000);
  const held = page.locator('[data-question="sc-amount-claimed"], [data-question="amountClaimed"]');
  const oldAmount = async () => { for (const box of await held.getByRole("textbox").all()) if ((await box.inputValue()).includes("1,650")) return true; return (await held.count()) > 0 && (await held.first().getAttribute("data-answered")) === "true"; };
  expect(await oldAmount(), "the review holds no amount from the old side").toBe(false);
  await expect(page.getByTestId("intake-review")).not.toContainText("1,650");
  // The form, too.
  await page.reload();
  await page.waitForLoadState("networkidle").catch(() => {});
  const form = page.getByRole("button", { name: "Fill in the form yourself" });
  if (await form.isVisible().catch(() => false)) await form.click();
  await page.waitForTimeout(1_500);
  await expect(page.locator("body"), "the form holds no amount from the old side").not.toContainText("$1,650 (your answer already given");
  await expect(page.getByTestId("intake-review")).not.toContainText("1,650");
  expect(await oldAmount(), "after a reload too").toBe(false);
  for (const box of await page.getByRole("textbox").all()) expect(await box.inputValue(), "no box holds the old side's amount").not.toContain("1,650");
});

// The repeats Chrome still saw live (#477 re-test), each with the real story.
const messy = (id: string) => MESSY_STORIES.find((item) => item.id === id)!;

// Case 19: "Have you already started a court claim?" after "No, nothing yet". The story reading
// is told what the situation answers settled, so it does not ask it (the filter: test:case-understanding).
test("retest-477 repeat: the story reading is told that nothing is filed yet and the side -- small-claims", async ({ page }) => {
  test.setTimeout(180_000);
  const story = messy("m19-laptop-repair");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/case/understand", async (route) => { sent.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ json: { ok: true, skipped: "off" } }); });
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill(story.story);
  await page.getByLabel("Tell us what happened in your own words").blur();
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  expect(sent.length, "the story was sent to be read").toBeGreaterThan(0);
  expect(sent.at(-1)!.situation, "the reading knows nothing is filed yet, and the side").toEqual({ side: "starting", filed: false });
});

// Cases 14 and 16: the Family review asked "Tell us about the children..." and "Is there a court
// date coming up?" with both in the story. Each is offered from the story for one click.
for (const id of ["m14-served-divorce", "m16-conference-safety"]) {
  test(`retest-477 repeat: the family review offers the children and the court date the story gives -- ${id}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = messy(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, "family", account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, "family", { story: story.story });
    await guidedQuestions(page, story, true);
    // The dates are left open here: the helper would type one into the court date's box first.
    await answerInReview(page, story, false);
    const panel = page.getByTestId("intake-review");
    const expected: Record<string, RegExp> = id === "m14-served-divorce" ? { childrenInfo: /Mia \(4\) and Noah \(2\)/ } : { childrenInfo: /daughter, age 6/i, upcomingCourtDate: /Case conference on November 16, 2026/ };
    for (const [question, words] of Object.entries(expected)) {
      const box = panel.locator(`[data-testid=intake-initial-question][data-question="${question}"]`);
      if (!(await box.count())) continue; // answered already, from the story, in the questions
      const offer = box.getByTestId("intake-field-from-story");
      await expect(offer, `${question}: offered from the story`).toContainText(words);
      await offer.click();
      await expect(box).toHaveAttribute("data-answered", "true");
    }
  });
}

// 26 Oct re-test, case 16: a case already going showed "Your side: I'm starting it (or I want to)" in the
// guided "What we already have", and "Has anything been filed…?" was asked with nothing offered though
// the story names the application and the answer. Family and civil, each side.
for (const id of ["m16-conference-safety", "w5-civil-going-defence"]) {
  test(`retest-26oct: a case already going keeps its start answer's words, and the papers are offered from the story -- ${id}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = [...MESSY_STORIES, ...WALKTHROUGH_STORIES].find((item) => item.id === id)!;
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, story.court, account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, story.court, { story: story.story });
    const known = page.getByTestId("guided-form-known");
    await expect(known).toBeVisible({ timeout: 60_000 });
    await expect(known, "the side in the start answer's words").toContainText(/started this case/);
    await expect(known).not.toContainText(/starting it \(or I want to\)|plan to start/);
    const filedKey = story.court === "family" ? "filedDocuments" : "documents";
    const question = page.getByTestId("guided-form-question");
    for (let i = 0; i < 12 && (await question.isVisible().catch(() => false)); i++) {
      if ((await question.getAttribute("data-key")) === filedKey) {
        await expect(question.getByTestId("guided-form-from-story"), "the papers the story names are offered").toBeVisible();
        return;
      }
      const skip = page.getByTestId("guided-form-skip");
      if (!(await skip.isVisible().catch(() => false))) break;
      await skip.click();
    }
    // Not asked at all: the papers are already held (listed under "What we already have").
  });
}

// The amount: Small Claims and civil offer the story's amount for one click.
test("retest-477 repeat: the amount the story wants is offered for one click -- small-claims (case 19)", async ({ page }) => {
  test.setTimeout(240_000);
  const story = messy("m19-laptop-repair");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await smallClaims(page, story, true);
  await expect(page.locator('[data-question="sc-amount-claimed"]').getByRole("button", { name: "Use “$1,650” (from your story)" })).toBeVisible();
});
test("retest-477 repeat: the amount the story claims is offered for one click -- civil", async ({ page }) => {
  test.setTimeout(240_000);
  const story = byId("civil-negligence");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situationForStory(story));
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "civil", account.rows as unknown as Map<string, Record<string, unknown>>);
  await openBuilder(page, "civil", { story: story.story });
  await guidedQuestions(page, story, true);
  await answerInReview(page, story);
  const box = page.getByTestId("intake-review").locator('[data-testid=intake-initial-question][data-question="amountClaimed"]');
  if (await box.count()) await expect(box.getByTestId("intake-field-from-story")).toContainText("$70,000");
  else expect(await page.getByTestId("intake-review").innerText(), "the amount is held from the story").toContain("70,000");
});

// Case 16: the review said "Case stage: conference", "Your side: I'm starting it (or I want to)"
// and "What has been filed: Not recorded" after the person had said all three. It shows what was
// answered: the step picked, who started the case, and the papers filed.
test("retest-477 case 16: the review shows the step picked, who started the case, and what was filed -- family (questions)", async ({ page }) => {
  test.setTimeout(240_000);
  const story = messy("m16-conference-safety");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situationForStory(story));
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "family", account.rows as unknown as Map<string, Record<string, unknown>>);
  await openBuilder(page, "family", { story: story.story });
  await guidedQuestions(page, story, false);
  const review = await page.getByTestId("intake-review").innerText();
  expect(review, "the step picked, in its own words").toContain("Case conference scheduled");
  expect(review, "never the bare word").not.toMatch(/Case stage\s*\n?\s*conference\b/i);
  expect(review, "who started the case").toContain("I started this case (applicant)");
  expect(review, "never the starting-a-case wording for a case already going").not.toContain("I'm starting it (or I want to)");
  expect(review.match(/What has been filed\s*\n?\s*([^\n]*)/)?.[1] ?? "", "what was filed, as answered").not.toMatch(/Not recorded/);
});

// Conference audit (2026-10-26): case 16 as a respondent. A person served was never asked what had
// happened since, and every screen then said "Responding to a case" or a bare "conference". Each
// screen that says where the case is now says the case conference, and the case file keeps the date.
test("conference audit case 16 as a respondent: asked what happened since service; the case conference and November 16 on every screen -- family", async ({ page }) => {
  test.setTimeout(300_000);
  const story = messy("m16r-conference-respondent");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situationForStory(story));
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "family", account.rows as unknown as Map<string, Record<string, unknown>>);
  await openBuilder(page, "family", { story: story.story });
  await guidedQuestions(page, story, true);
  await answerInReview(page, story);
  const review = await page.getByTestId("intake-review").innerText();
  expect(review, "review: the step picked, in its own words").toContain("Case conference scheduled");
  expect(review, "review: the responding side, in the form's words").toContain("The other person started it and I was served");
  expect(review, "review: never the starting wording").not.toContain("Starting a new case");
  expect(review, "review: never the bare word").not.toMatch(/Case stage\s*\n?\s*conference\b/i);
  await confirmAndContinue(page);
  await expect(page.getByText("Current stage", { exact: true }).locator("..")).toContainText("Case conference scheduled", { timeout: 60_000 });

  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  const file = page.getByTestId("case-file");
  await expect(file).toBeVisible({ timeout: 60_000 });
  await expect(file.locator('[data-testid=case-file-line][data-fact="conferenceDate"]'), "What we have so far: the case conference and its day").toContainText(/Case conference[\s\S]*November 16, 2026/);
  // The conference's day is not shown a second time as a court date (the harness may answer the court date question with another day).
  await expect(file.locator('[data-testid=case-file-line][data-fact="courtDate"]').filter({ hasText: /November 16, 2026/ }), "the conference day is not also a court date").toHaveCount(0);

  await page.goto(`/cases/${row.id}/case-file`);
  await expect(page.getByTestId("case-file"), "the printable case file: where the case is").toContainText("Case conference scheduled", { timeout: 60_000 });
  await page.goto(`/cases/${row.id}/timeline`);
  await expect(page.getByText("Your step", { exact: true }).locator(".."), "the timeline: the step").toContainText("Case conference scheduled", { timeout: 60_000 });
});

// Item 7: the safety help box is open on the results page, in every area, for any story (it was
// folded unless the story used words of danger; the danger notice itself still shows only then).
for (const [court, id] of [["small-claims", "sc-loan-friend"], ["civil", "civil-deposit"], ["family", "family-spousal"]] as const) {
  test(`retest-477 item 7: the safety help box is open on the results page -- ${court}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else { await openBuilder(page, court, { story: story.story }); await guidedQuestions(page, story, true); await answerInReview(page, story); }
    await expect(page.getByTestId("intake-safety-resources"), "folded while answering").not.toHaveAttribute("open", "");
    await confirmAndContinue(page);
    await expect(page.getByTestId("intake-safety-resources"), "open on the results page").toHaveAttribute("open", "");
    if (court === "family") await expect(page.getByTestId("family-safety-resources"), "Family's who-to-contact box is open too").toHaveAttribute("open", "");
  });
}

// Items 5 and 6 on the case page and review: words, not codes; the label the court uses; the
// facts the story gives that no answer holds yet; an amount typed in words kept as a number.
for (const id of ["m14-served-divorce", "m16-conference-safety"]) {
  test(`retest-477 items 5-6: the review's labels and What we have so far -- ${id}`, async ({ page }) => {
    test.setTimeout(240_000);
    const story = messy(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, "family", account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, "family", { story: story.story });
    await guidedQuestions(page, story, true);
    await answerInReview(page, story);
    const review = await page.getByTestId("intake-review").innerText();
    expect(review, "no adoption details on a case that is not an adoption").not.toContain("Adoption details");
    expect(review, "the court's label").not.toMatch(/(^|\n)Court date\n/);
    expect(rawKeysIn(review), "no raw code in the review").toEqual([]);
    await confirmAndContinue(page);
    const row = [...account.rows.values()][0] as Record<string, unknown>;
    await page.goto(`/cases/${row.id}`);
    const file = page.getByTestId("case-file");
    await expect(file).toBeVisible({ timeout: 60_000 });
    const text = await file.innerText();
    expect(rawKeysIn(text), "no raw code in What we have so far").toEqual([]);
    if (id === "m14-served-divorce") {
      expect(text, "where they married").toContain("Lisbon, Portugal");
      expect(text, "the kind of claim in words").toMatch(/Parenting time|Spousal support|Divorce/i);
    } else {
      expect(text, "the threats and the police call").toMatch(/threatened[\s\S]*police/);
      expect(text, "the papers filed, by name").toMatch(/Yes: .*Application/i);
    }
  });
}
test("retest-477 item 5: an amount typed in words is kept and shown as $2,500.00 -- small-claims (case 20)", async ({ page }) => {
  test.setTimeout(240_000);
  const story = byId("sc-unclear");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await smallClaims(page, story, true);
  const amount = page.locator('[data-question="sc-amount-claimed"]').getByRole("textbox");
  await amount.fill("twenty five hundred");
  await amount.press("Enter");
  await confirmAndContinue(page);
  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  const line = page.locator('[data-testid=case-file-line][data-fact="amount"]');
  await expect(line).toContainText("$2,500.00", { timeout: 60_000 });
  await expect(line).not.toContainText("twenty five hundred");
});

// Chrome's Charter claim against police (2026-10-26), through the review as Chrome took it: what the
// review asks, the one-click answers from the story, the next step's deadline without a second
// press, "What we have so far" and the chat (verifyCharterRetest.ts holds each shared piece's checks).
test("retest Charter: the review fits the claim, the story answers in one click, the deadline counts once, What we have so far and the chat -- civil (c1)", async ({ page }) => {
  test.setTimeout(300_000);
  const story = CHARTER_STORIES[0];
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situationForStory(story));
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "civil", account.rows as unknown as Map<string, Record<string, unknown>>);
  // The live case reader found "June 3, 2025" in the story and offered it on the step: the date was
  // shown and saved, and counted only after a second press. The reader is an AI call, so here it
  // answers as it did, with the story's own words.
  await page.route("**/api/case/read", (route) => route.fulfill({ json: { ok: true, picture: { side: null, events: [], dates: [{ questionId: "case-date-act-or-omission", date: "2025-06-03", month: 6, day: 3, quote: "On June 3, 2025 in Ottawa I was stopped by two officers" }], amount: null, otherParty: null, married: null, childTogether: null } } }));
  await openBuilder(page, "civil", { story: story.story });
  await guidedQuestions(page, story, true);
  const panel = page.getByTestId("intake-review");
  const review = await panel.innerText();
  expect(review, "a plaintiff is not asked when and how they were served").not.toContain("When and how you were served");
  for (const label of ["Human rights grounds", "Discrimination facts", "Accommodation requests", "Institutional facts", "Privacy records facts", "Government actor"]) expect(review, `no raw label "${label}"`).not.toContain(label);
  expect(rawKeysIn(review), "no raw code in the review").toEqual([]);
  // The kind of claim, suggested from the story's own words, ticked for the person to confirm.
  const issues = panel.locator('[data-testid=intake-initial-question][data-question="issues"]');
  if (await issues.count()) {
    await expect(issues.locator('input[data-testid=intake-field-pick][value="charter"]')).toBeChecked();
    await expect(issues.locator('input[data-testid=intake-field-pick][value="police-conduct"]')).toBeChecked();
    await expect(issues.getByTestId("intake-field-pick-quote")).toContainText("Charter");
    await issues.getByTestId("intake-field-save").click();
  }
  // The amount and what they want, one click each from the story.
  for (const [question, words] of [["amountClaimed", "$75,000"], ["legalRemedy", "violating my Charter rights"]] as const) {
    const box = panel.locator(`[data-testid=intake-initial-question][data-question="${question}"]`);
    if (!(await box.count())) continue;
    await expect(box.getByTestId("intake-field-from-story"), `${question}: offered from the story`).toContainText(words);
    await box.getByTestId("intake-field-from-story").click();
    await expect(box).toHaveAttribute("data-answered", "true");
  }
  // The day it happened, as Chrome gave it in the review.
  const open = panel.locator("[data-testid=intake-initial-question][data-answered=false]");
  for (let i = 0; i < (await open.count()); i++) {
    const question = open.nth(i);
    const typed = question.getByRole("textbox");
    if (!(await typed.count()) || !asksForDate(await question.locator("p").first().innerText())) continue;
    await typed.fill("June 3, 2025");
    await typed.press("Enter");
  }
  await confirmAndContinue(page);
  // The deadline from the story's date shows without pressing "Count my deadline" again.
  await expect(page.getByText(/3 June 2027|June 3, 2027/).first(), "the limitation date shows once the date is kept").toBeVisible({ timeout: 60_000 });
  // The chat: no question the story answers, nothing of the site's machinery.
  const ask = page.getByRole("button", { name: "Ask follow-up questions" });
  await ask.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  if (await ask.isVisible().catch(() => false)) {
    await ask.click();
    const reply = await lastReply(page, "Who do I name, do I need to give notice, will I get $75,000?");
    expect(reply).not.toMatch(/Which public actor is involved/i);
    expect(reply).not.toMatch(/reasoning profile/i);
  }
  // What we have so far.
  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  const file = page.getByTestId("case-file");
  await expect(file).toBeVisible({ timeout: 60_000 });
  const text = await file.innerText();
  expect(rawKeysIn(text), "no raw code").toEqual([]);
  for (const [what, words] of [["who is sued, with the badges", /4471 and 5520/], ["the injury", /wrist (?:was )?bruised/i], ["the phone", /cracked screen/], ["the screened-out complaint", /screened out/], ["the witness", /witness/], ["the lost pay", /2 weeks of work/], ["the kind of claim in words", /Charter \/ constitutional issue/], ["the deadline", /3 June 2027|June 3, 2027/]] as const) expect(text, what).toMatch(words);
  expect(text, "the stage as a stage, never a question").not.toMatch(/Where the case is\s*\n?\s*How do I/);
});

// Root cause 3 (Charter re-test after #486/#487): the first "Confirm my initial information"
// bounced with "Your initial facts changed", and only a second press confirmed. At the live site's
// speed (account and database calls 1.5 s, the analysis 20 s), one real click must confirm, in
// every area.
for (const [court, id] of [["civil", "c1-charter-police"], ["small-claims", "sc-deck-owed"], ["civil", "civil-deposit"], ["family", "family-spousal"]] as const) {
  test(`retest-27oct root cause 3: one real click confirms the initial information at real speed -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(480_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, true);
      await answerInReview(page, story);
    }
    // From here at the live site's speed: the saves still running meet the Confirm press.
    for (const host of ["**/auth/v1/**", "**/rest/v1/**"]) await page.route(host, async (route) => { await new Promise((done) => setTimeout(done, 1_500)); await route.fallback(); });
    await page.route(`**/api/${court}/analyze`, async (route) => { await new Promise((done) => setTimeout(done, 20_000)); await route.fallback(); });
    const panel = page.getByTestId("intake-review");
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
    await page.getByTestId("intake-review-acknowledgement").check();
    const confirm = page.getByTestId("intake-confirm");
    await confirm.scrollIntoViewIfNeeded();
    const box = await confirm.boundingBox();
    if (!box) throw new Error("no Confirm button on screen");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(panel, "one press confirms").toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
    await expect(page.getByText(/Your initial facts changed|Initial information changed while saving/), "never bounced back").toHaveCount(0);
  });
}

// Chrome, 28 Oct (twice, a brand-new case, nothing edited, a 6 s wait): the first Confirm bounced
// with "Your initial facts changed", and after the second "Show my next step" went back to the review,
// unticked. The questions route, at the live site's speed from the first screen: the review opened
// with "Continue to your next steps", nothing changed, one tick, one press; the next step loads and
// stays confirmed.
for (const [court, id] of [["civil", "c1-charter-police"], ["small-claims", "sc-deck-owed"], ["civil", "civil-deposit"], ["family", "family-spousal"]] as const) {
  test(`retest-28oct confirm once: nothing changed, one tick, one press, the next step loads and stays confirmed -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(600_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    for (const host of ["**/auth/v1/**", "**/rest/v1/**"]) await page.route(host, async (route) => { await new Promise((done) => setTimeout(done, 1_500)); await route.fallback(); });
    for (const api of [`**/api/${court}/analyze`, "**/api/intake/sourced-questions", "**/api/case/understand", "**/api/intake/guided-turn"]) await page.route(api, async (route) => { await new Promise((done) => setTimeout(done, 20_000)); await route.fallback(); });
    const warnings: string[] = [];
    page.on("console", (message) => { if (/Confirm refused/.test(message.text())) warnings.push(message.text()); });
    if (court === "small-claims") await smallClaims(page, story, false);
    else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, false);
      const next = page.getByRole("button", { name: "Continue to your next steps" }).first();
      if (await next.isVisible().catch(() => false)) await next.click();
    }
    const panel = page.getByTestId("intake-review");
    await expect(panel).toBeVisible({ timeout: 120_000 });
    // Anything the review still needs is answered "I don't know yet" (Chrome had nothing left).
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
    await page.waitForTimeout(6_000);
    await page.getByTestId("intake-review-acknowledgement").check();
    const confirm = page.getByTestId("intake-confirm");
    await confirm.scrollIntoViewIfNeeded();
    const box = await confirm.boundingBox();
    if (!box) throw new Error("no Confirm button on screen");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(panel, `one press confirms${warnings.length ? `: ${warnings.join(" | ")}` : ""}`).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
    await expect(page.getByText(/Your initial facts changed|Initial information changed while saving/), "never bounced back").toHaveCount(0);
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(3_000);
    await expect(page.getByTestId("intake-review-acknowledgement"), "and does not go back to the review").toHaveCount(0);
    expect(warnings, "no Confirm was refused").toEqual([]);
  });
}

// The same, the way Chrome came in: the home page's story reading with rounds of "Update with my
// answers" (their answers are initial facts: home.understoodAnswers), then "Continue with …". The
// reading's reply is canned here (the harness has no AI); everything after it is this commit's code.
const PATH_WORDS: Record<string, string> = { civil: "Civil", family: "Family", "small-claims": "Small Claims" };
for (const [court, id] of [["civil", "c1-charter-police"], ["family", "family-spousal"], ["small-claims", "sc-deck-owed"]] as const) {
  test(`retest-28oct confirm once, through the home reading's rounds: one press confirms and the next step stays confirmed -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(600_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    const QUESTIONS = ["Who exactly do you want to name in the claim?", "What records do you have?"];
    let round = 0;
    await page.route("**/api/case/understand", async (route) => {
      const question = QUESTIONS[Math.min(round, QUESTIONS.length - 1)];
      round += 1;
      await route.fulfill({ json: { ok: true, understanding: { summary: "Synthetic summary of your story.", facts: [], matters: [], mainCourt: court, side: "starting", stage: "Deciding whether to start a case", step: null, questions: [{ question, why: "Synthetic." }], asksForPrediction: false, regime: null }, answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false } } });
    });
    for (const host of ["**/auth/v1/**", "**/rest/v1/**"]) await page.route(host, async (route) => { await new Promise((done) => setTimeout(done, 1_500)); await route.fallback(); });
    for (const api of [`**/api/${court}/analyze`, "**/api/intake/sourced-questions", "**/api/intake/guided-turn"]) await page.route(api, async (route) => { await new Promise((done) => setTimeout(done, 20_000)); await route.fallback(); });
    const warnings: string[] = [];
    page.on("console", (message) => { if (/Confirm refused/.test(message.text())) warnings.push(message.text()); });
    await page.goto(`/?path=${court}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.getByLabel("Tell us what happened in your own words").fill(story.story);
    await page.getByRole("button", { name: `Continue to ${PATH_WORDS[court]} intake` }).click();
    const card = page.getByTestId("case-understanding");
    await expect(card).toBeVisible({ timeout: 120_000 });
    for (const [question, answer] of [[QUESTIONS[0], "Synthetic Organization Ltd. I don't know the names."], [QUESTIONS[1], "The receipt just says investigation."]]) {
      await page.getByLabel(question).fill(answer);
      await page.getByTestId("case-understanding-update").click();
      await expect(page.getByTestId("case-understanding-update")).not.toHaveText(/Updating/, { timeout: 120_000 });
    }
    await page.getByTestId("case-understanding-continue-suggested").click();
    await page.waitForURL(/\/builder\?/, { timeout: 120_000 });
    const acknowledgement = page.getByTestId("acknowledgement-checkbox");
    await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" })).or(page.getByTestId("guided-form-chat"))).toBeVisible({ timeout: 120_000 });
    if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
    if (court === "small-claims") {
      await smallClaimsGuided(page, story);
    } else {
      await guidedQuestions(page, story, false);
    }
    const panel = page.getByTestId("intake-review");
    await expect(panel).toBeVisible({ timeout: 120_000 });
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
    await page.waitForTimeout(6_000);
    await page.getByTestId("intake-review-acknowledgement").check();
    const confirm = page.getByTestId("intake-confirm");
    await confirm.scrollIntoViewIfNeeded();
    const box = await confirm.boundingBox();
    if (!box) throw new Error("no Confirm button on screen");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(panel, `one press confirms${warnings.length ? `: ${warnings.join(" | ")}` : ""}`).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(3_000);
    await expect(page.getByTestId("intake-review-acknowledgement"), "and does not go back to the review").toHaveCount(0);
    expect(warnings, "no Confirm was refused").toEqual([]);
  });
}

// Chrome, 28 Oct: a reopened chat showed each answer's words but not the law sections and citations
// shown live. The law is kept with the question it answers, so a reload shows it again.
for (const [court, id] of [["civil", "civil-deposit"], ["family", "family-spousal"], ["small-claims", "sc-deck-owed"]] as const) {
  test(`retest-28oct a reopened chat shows the law and citations the live answer showed -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(480_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    await page.route("**/api/assistant/law", (route) => route.fulfill({ json: { findings: [], answer: { status: "answered", declinedToJudge: false, notConfirmed: [], statements: [{ text: "A synthetic statement of the rule.", sources: [{ passageId: "p1", citation: "Synthetic Act, 2019, s. 4 (1)", sourceUrl: "https://www.ontario.ca/laws/statute/00x00", quote: "The synthetic words.", kind: "legislation" }] }] } } }));
    if (court === "small-claims") await smallClaims(page, story, true);
    else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, true);
      await answerInReview(page, story);
    }
    await confirmAndContinue(page);
    const ask = page.getByRole("button", { name: "Ask follow-up questions" });
    await ask.waitFor({ state: "visible", timeout: 60_000 });
    await ask.click();
    await lastReply(page, "Do I need to give notice before I start?");
    const law = page.getByTestId("assistant-law");
    await expect(law.last(), "the live answer shows its citation").toContainText("Synthetic Act, 2019, s. 4 (1)", { timeout: 60_000 });
    // Reopened the way My cases opens a saved case.
    const saved = [...account.rows.values()][0] as Record<string, unknown>;
    await page.goto(`/builder?path=${court}&caseId=${saved.id}`);
    const next = page.getByRole("button", { name: "Show my next step" });
    await next.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
    if (await next.isVisible().catch(() => false)) await next.click();
    const again = page.getByRole("button", { name: "Ask follow-up questions" });
    await again.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
    if (await again.isVisible().catch(() => false)) await again.click();
    await expect(page.getByTestId("case-partner-transcript"), "the question is still there").toContainText("Do I need to give notice before I start?", { timeout: 60_000 });
    await expect(page.getByTestId("assistant-law").last(), "and so is the law the answer showed, with its citation").toContainText("Synthetic Act, 2019, s. 4 (1)", { timeout: 60_000 });
  });
}

// Root cause 3, as a person does it: the last thing typed in the review is still in its box (it
// saves when the box is left), and the next press is Confirm. That press both saves the answer and
// confirms: it must confirm what is now on screen, at once, in every area.
for (const [court, id] of [["civil", "c1-charter-police"], ["small-claims", "sc-deck-owed"], ["civil", "civil-deposit"], ["family", "family-spousal"]] as const) {
  test(`retest-27oct root cause 3: an answer typed after the tick clears it and says so beside the button; one more tick confirms -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(480_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else {
      await openBuilder(page, court, { story: story.story });
      await guidedQuestions(page, story, true);
      await answerInReview(page, story);
    }
    const panel = page.getByTestId("intake-review");
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
    await page.getByTestId("intake-review-acknowledgement").check();
    // From here at the live site's speed.
    for (const host of ["**/auth/v1/**", "**/rest/v1/**"]) await page.route(host, async (route) => { await new Promise((done) => setTimeout(done, 1_500)); await route.fallback(); });
    // An answer typed to a question still open in the review, the box not left (it saves when left).
    const boxes = panel.locator('input[aria-label^="Answer: "]');
    expect(await boxes.count(), "the review has a question still open to type in").toBeGreaterThan(0);
    const box = boxes.first();
    const label = (await box.getAttribute("aria-label")) ?? "";
    const answer = /when|date|day/i.test(label) ? "March 2026" : /amount|money|much/i.test(label) ? "$6,000" : "Payment of what is owed";
    await box.fill(answer);
    // Pressed straight from the box: the press leaves the box, which saves the typed answer.
    await page.getByTestId("intake-confirm").click({ force: true });
    // The press saved the typed answer (it saves when its box is left): the tick covered the answers
    // as they were, so it is cleared, and the reason is said beside the button.
    await expect(page.getByTestId("intake-review-acknowledgement")).not.toBeChecked({ timeout: 20_000 });
    await expect(page.getByTestId("intake-tick-again"), "the reason, beside the button").toHaveText("You changed an answer. Please tick to confirm again.");
    await expect(panel, "the typed answer was kept").toContainText(answer);
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    await page.getByTestId("intake-review-acknowledgement").click();
    await expect(page.getByTestId("intake-tick-again"), "gone once ticked again").toHaveCount(0);
    await page.getByTestId("intake-confirm").click();
    await expect(panel, "one more press confirms").toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
    await expect(page.getByText(/Your initial facts changed|Initial information changed while saving/), "never bounced back").toHaveCount(0);
 });
}

// Root cause 3, Chrome's own steps (Charter re-test): a one-click answer from the story ("Yes,
// that's right" for the amount), then the tick, then Confirm, each at once, with the account and
// database at the live site's speed. The first Confirm bounced with "Your initial facts changed"
// and the tick had to be given again. One press must confirm, in every area.
for (const [court, id] of [["civil", "c1-charter-police"], ["small-claims", "sc-deck-owed"], ["civil", "civil-deposit"], ["family", "family-spousal"]] as const) {
  test(`retest-27oct root cause 3: a one-click answer, the tick and Confirm at once, one press confirms -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(480_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    // The AI readings answer late on the live site (the case reader and the story reading, seconds
    // after the page shows): held here 8 s, the case reader with the answer it gave live for the Charter story.
    const picture = id === "c1-charter-police" ? { side: null, events: [], dates: [{ questionId: "case-date-act-or-omission", date: "2025-06-03", month: 6, day: 3, quote: "On June 3, 2025 in Ottawa I was stopped by two officers" }], amount: null, otherParty: null, married: null, childTogether: null } : null;
    await page.route("**/api/case/read", async (route) => { await new Promise((done) => setTimeout(done, 8_000)); await route.fulfill({ json: picture ? { ok: true, picture } : { ok: true, skipped: "off" } }); });
    if (court === "small-claims") await smallClaims(page, story, true);
    else { await openBuilder(page, court, { story: story.story }); await guidedQuestions(page, story, true); }
    const panel = page.getByTestId("intake-review");
    await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
    // Everything else answered or left as not known, except one question the story answers in one click.
    const oneClick = panel.locator('[data-testid="intake-field-from-story"], [data-testid="intake-use-suggestion"]');
    // The review's first answer from the story, where it offers one (not every story gives one).
    const keep = (await oneClick.count()) ? await oneClick.first().locator("xpath=ancestor::*[@data-testid='intake-initial-question'][1]").getAttribute("data-question") : null;
    const unknowns = panel.locator(`[data-testid=intake-initial-question]${keep ? `:not([data-question="${keep}"])` : ""} input[data-testid="intake-unknown"]:not(:checked)`);
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
    // From here at the live site's speed, and each press at once, with the mouse.
    for (const host of ["**/auth/v1/**", "**/rest/v1/**"]) await page.route(host, async (route) => { await new Promise((done) => setTimeout(done, 1_500)); await route.fallback(); });
    // A real mouse press where the element is (Playwright's own click: it waits until nothing covers it, as a person would).
    const press = (target: ReturnType<typeof page.locator>) => target.click();
    if (keep) await press(panel.locator(`[data-testid=intake-initial-question][data-question="${keep}"]`).locator('[data-testid="intake-field-from-story"], [data-testid="intake-use-suggestion"]').first());
    await press(page.getByTestId("intake-review-acknowledgement"));
    // The late reading lands between the tick and the press, as it can for a person.
    await page.waitForTimeout(10_000);
    await press(page.getByTestId("intake-confirm"));
    await expect(panel, "one press confirms").toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
    await expect(page.getByText(/Your initial facts changed|Initial information changed while saving/), "never bounced back").toHaveCount(0);
  });
}

// Root cause 3 against the real (staging) database, as Chrome did it on the live site: a real
// account and real saves; every AI route is answered by this commit's own code (nothing spends).
// Run by hand: STAGING_RC3=1 against a build made with the staging environment.
test("retest-27oct root cause 3 on staging: the Charter review, a one-click answer, the tick and Confirm at once", async ({ page }) => {
  test.skip(!process.env.STAGING_RC3, "staging only, by hand");
  test.setTimeout(600_000);
  const story = byId("c1-charter-police");
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situationForStory(story));
  const userId = await signInHarnessUser(page);
  try {
    await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { ok: false, error: "not in this test" } }));
    await serveFromThisCommit(page, "civil", new Map());
    await openBuilder(page, "civil", { story: story.story });
    await guidedQuestions(page, story, true);
    const panel = page.getByTestId("intake-review");
    await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
    const oneClick = panel.locator('[data-testid="intake-field-from-story"], [data-testid="intake-use-suggestion"]');
    const keep = (await oneClick.count()) ? await oneClick.first().locator("xpath=ancestor::*[@data-testid='intake-initial-question'][1]").getAttribute("data-question") : null;
    const unknowns = panel.locator(`[data-testid=intake-initial-question]${keep ? `:not([data-question="${keep}"])` : ""} input[data-testid="intake-unknown"]:not(:checked)`);
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 30_000 }); }
    if (keep) await panel.locator(`[data-testid=intake-initial-question][data-question="${keep}"]`).locator('[data-testid="intake-field-from-story"], [data-testid="intake-use-suggestion"]').first().click();
    await page.getByTestId("intake-review-acknowledgement").click();
    await page.getByTestId("intake-confirm").click();
    const bounced = page.getByText(/Your initial facts changed|Initial information changed while saving/);
    await expect(panel.or(bounced).first()).toBeVisible();
    await expect.poll(async () => (await bounced.count()) ? "bounced" : await panel.getAttribute("data-phase"), { timeout: 90_000, message: "one press confirms" }).toBe("user-confirmed");
  } finally {
    await deleteHarnessUser(userId).catch(() => {});
  }
});

// Charter re-test 27 Oct: one press of "Count my deadline" was enough, but the button only greyed
// out without saying it was working. While the case is being saved it says so, in every area.
for (const [court, id] of [["small-claims", "sc-defendant-unclear"], ["civil", "civil-deposit"], ["family", "m16-conference-safety"]] as const) {
  test(`retest-27oct: Count my deadline says it is working while it saves -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(300_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else { await openBuilder(page, court, { story: story.story }); await guidedQuestions(page, story, true); await answerInReview(page, story); }
    await confirmAndContinue(page);
    const box = page.locator('[data-testid="stage-answer-date-question"] input[type="date"]').first();
    await expect(page.getByTestId("stage-answer-dates-save"), "the step can count a deadline").toBeVisible({ timeout: 90_000 });
    // A date the step does not hold yet is typed; one it already holds (from the story) is counted as it is.
    if (await box.isVisible().catch(() => false)) await box.fill("2026-03-03");
    // The case is saved at the live site's speed.
    await page.route("**/api/cases/position", async (route) => { await new Promise((done) => setTimeout(done, 3_000)); await route.fallback(); });
    await page.getByTestId("stage-answer-dates-save").click();
    await expect(page.getByTestId("stage-answer-dates-save"), "it says it is working").toHaveText("Counting your deadline…", { timeout: 1_000 });
    await expect(page.getByTestId("stage-answer-dates-save"), "and goes back once done").toHaveText("Count my deadline", { timeout: 30_000 });
  });
}

// Root cause 2 (Charter re-test 27 Oct): "No, let me answer" must ask for a typed answer and never
// drop a question. The one-click for What you want was bundled with the other party; after "No",
// the other party was never asked again. Every story suggestion here is answered "No": each question
// then asks for an answer itself, and every question that rode in a suggestion is still asked.
for (const [court, id] of [["civil", "c1-charter-police"], ["civil", "m11-old-credit-card"], ["family", "family-spousal"], ["family", "m16-conference-safety"]] as const) {
  test(`retest-27oct root cause 2: "No, let me answer" asks for the answer and drops no question -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(300_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, court, { story: story.story });
    const grouped = new Set<string>();
    const asked = new Set<string>();
    let nos = 0;
    for (let turn = 0; turn < 40; turn++) {
      const question = page.getByTestId("guided-form-question");
      if (!(await question.isVisible().catch(() => false))) break;
      const key = (await question.getAttribute("data-key")) ?? "";
      const suggested = question.getByTestId("guided-form-from-story");
      if (await suggested.isVisible().catch(() => false)) {
        for (const other of ((await suggested.getAttribute("data-group")) ?? "").split(" ").filter(Boolean)) if (other !== key) grouped.add(other);
        await question.getByTestId("guided-form-from-story-no").click();
        nos += 1;
        await expect(question, "after No, the same question is still asked").toHaveAttribute("data-key", key);
        await expect(question.getByTestId("guided-form-from-story"), "and is not offered from the story again").toHaveCount(0);
        await expect(question.getByRole("textbox").or(question.locator('input[type="checkbox"], input[type="radio"], [data-testid^="guided-option-"]')).first(), "it asks for the answer itself").toBeVisible();
      }
      asked.add(key);
      if (key === "yourRole") { await question.getByTestId(`guided-option-${story.side}`).click(); continue; }
      const box = question.getByRole("textbox");
      if (await box.count()) {
        await box.first().fill(asksForDate(await question.innerText()) ? "October 6, 2026" : /amount|money|much/i.test(await question.innerText()) ? "$6,000" : "My own answer for the test.");
        await question.getByTestId("guided-form-next").click();
      } else await question.getByTestId("guided-form-skip").click();
      await expect(question.or(page.getByTestId("guided-form-done")).first()).toBeVisible();
    }
    expect(nos, "the story offered at least one suggestion").toBeGreaterThan(0);
    const dropped = [...grouped].filter((key) => !asked.has(key));
    expect(dropped, "every question that rode in a suggestion was still asked").toEqual([]);
  });
}


// Site owner, 28 Oct: w5's optional third-party claim date showed on both the next-step page and the
// case page. The pack never answered it, so whether an answer on one screen stops the other asking was
// not known. Here a date each area shows on both screens is answered on one, then the other is opened:
// it shows the answer and does not ask again. Both ways round, in every area.
for (const [court, id, questionId] of [["civil", "w5-civil-going-defence", "case-date-third-party-claim-issued"], ["small-claims", "w4-sc-going-defence", "sc-date-defence-filed"], ["family", "m15-motion-to-change", "case-date-served-with-motion-to-change"]] as const) {
  for (const first of ["next step", "case page"] as const) {
    test(`retest-28oct: a date answered on the ${first} is not asked again on the other screen -- ${court} (${id}, ${questionId})`, async ({ page }) => {
      test.setTimeout(480_000);
      const story = byId(id);
      await grantSiteAccess(page);
      await autoAnswerSituation(page, situationForStory(story));
      const account = await fakeAccount(page);
      await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
      if (court === "small-claims") await smallClaims(page, story, true);
      else { await openBuilder(page, court, { story: story.story }); await guidedQuestions(page, story, true); await answerInReview(page, story); }
      await confirmAndContinue(page);
      const question = page.locator(`[data-testid="stage-answer-date-question"][data-question-id="${questionId}"]`);
      const known = page.getByTestId(`stage-answer-known-${questionId}`);
      const caseId = () => String(([...account.rows.values()][0] as Record<string, unknown> | undefined)?.id ?? "");
      const answer = async () => {
        await expect(question, "the date is asked here").toBeVisible({ timeout: 90_000 });
        await question.locator('input[type="date"]').fill("2026-03-03");
        await page.getByTestId("stage-answer-dates-save").click();
        await expect(known, "once answered, it shows as known").toBeVisible({ timeout: 60_000 });
        await expect(page.getByTestId("stage-answer-dates-save"), "and the save is done").toHaveText("Count my deadline", { timeout: 30_000 });
      };
      const openCasePage = async () => {
        await expect.poll(caseId, { timeout: 60_000, message: "the case is saved" }).not.toBe("");
        await page.goto(`/cases/${caseId()}`);
        await page.waitForLoadState("networkidle").catch(() => {});
      };
      if (first === "next step") {
        await answer();
        await openCasePage();
      } else {
        await openCasePage();
        await answer();
        // Reopened the way My cases opens a saved case.
        await page.goto(`/builder?path=${court}&caseId=${caseId()}`);
        const next = page.getByRole("button", { name: "Show my next step" });
        await next.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
        if (await next.isVisible().catch(() => false)) await next.click();
      }
      await expect(known, "the other screen shows the answer").toBeVisible({ timeout: 90_000 });
      await expect(question, "and does not ask for it again").toHaveCount(0);
    });
  }
}

// Owner, 28 Oct (#501): the Forms page's "does this form apply" choices go through the same write
// queue as the dates, and were lost the same way on a reload while a save waited. Here a confirmed
// case's Forms page saves one choice with the save held as a slow connection holds it, the page
// reloads before it lands, and the choice must still reach the case and show as given, in every area.
// A held save still waiting when its page goes never reaches the stub, as a request cut off with its
// page never reaches the server.
for (const [court, id, question, pick, value] of [
  ["small-claims", "sc-deck-owed", "Have you confirmed this is an eligible Ontario Small Claims Court matter?", "Yes", true],
  ["civil", "civil-deposit", "Which civil response document are you preparing?", "Notice of Intent to Defend", "notice-of-intent-to-defend"],
  ["family", "family-spousal", "Is this a general Family Application?", "Yes", true],
] as const) {
  test(`28oct lost save: a form choice saved just before a reload is kept -- ${court} (${id})`, async ({ page }) => {
    test.setTimeout(480_000);
    const story = byId(id);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, situationForStory(story));
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    if (court === "small-claims") await smallClaims(page, story, true);
    else { await openBuilder(page, court, { story: story.story }); await guidedQuestions(page, story, true); await answerInReview(page, story); }
    await confirmAndContinue(page);
    const caseId = String(([...account.rows.values()][0] as Record<string, unknown>).id ?? "");
    expect(caseId, "the case is saved").not.toBe("");
    const group = court === "small-claims" ? "smallClaims" : court;
    const field = court === "small-claims" ? "eligibilityConfirmed" : court === "civil" ? "responseDocument" : "isGeneralApplication";
    const choices = typeof value === "boolean" ? [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }] : [{ value: "statement-of-defence", label: "Statement of Defence" }, { value: "notice-of-intent-to-defend", label: "Notice of Intent to Defend" }, { value: "not-sure", label: "Not sure" }];
    const asked = { field_path: `formApplicability.${group}.${field}`, question, value_type: typeof value === "boolean" ? "boolean" : "string", choices };
    const stored: Record<string, Record<string, unknown>> = {};
    let pageGeneration = 0;
    // A full page load (a reload), not an address rewrite within the page.
    page.on("load", () => { pageGeneration += 1; });
    const held = { on: false };
    await page.route(/\/api\/cases\/form-applicability(?:\?caseId=)?/, async (route) => {
      if (route.request().method() === "PATCH") {
        const startedOn = pageGeneration;
        if (held.on) await new Promise((done) => setTimeout(done, 8_000));
        if (pageGeneration !== startedOn) return route.abort().catch(() => {});
        const body = route.request().postDataJSON() as { formApplicability?: Record<string, Record<string, unknown>> };
        for (const [part, answers] of Object.entries(body.formApplicability ?? {})) stored[part] = { ...stored[part], ...answers };
      }
      await route.fulfill({ status: 200, json: { courtPath: court, formApplicability: stored, applicabilityQuestions: [asked], recommendations: [] } }).catch(() => {});
    });
    await page.goto(`/forms?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
    const select = page.getByLabel(question);
    await expect(select, "the choice is asked").toBeVisible({ timeout: 90_000 });
    await select.selectOption({ label: pick });
    // The choice shows as chosen (it never did before 28 Oct: the page read it from the wrong place).
    await expect(select, "the choice shows as chosen").toHaveValue(JSON.stringify(value));
    held.on = true;
    await page.getByRole("button", { name: "Save confirmations" }).click();
    // Reloaded while the save is still on its way; the next page's saves go at normal speed.
    await page.waitForTimeout(500);
    held.on = false;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => stored[group]?.[field], { timeout: 60_000, message: "the choice reached the case" }).toEqual(value);
    await expect(page.getByLabel(question), "and is shown as given").toHaveValue(new RegExp(String(value)), { timeout: 60_000 });
  });
}
