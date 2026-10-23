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
 * written to test-results/story-pack-findings.json.
 *
 * Run before any PR is marked ready: npm run test:story-pack (against a production
 * build on port 3100, like CI), or point PLAYWRIGHT_BASE_URL at a preview with that
 * preview's SITE_ACCESS_PASSWORD in the environment.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 20_000 });

type Story = {
  id: string;
  court: Court;
  story: string;
  side: "plaintiff" | "defendant" | "applicant" | "respondent";
  /** civil documents / Family filed documents, as option values. */
  filed: string[];
  issues?: string[];
  /** Small Claims: the amount the story's own words claim, or null when they leave it unclear. */
  amount?: string | null;
};

const STORIES: Story[] = [
  // Small Claims
  { id: "sc-deck-owed", court: "small-claims", side: "plaintiff", filed: [], amount: "$6,000", story: "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt." },
  { id: "sc-movers-damage", court: "small-claims", side: "plaintiff", filed: [], amount: "$2,500", story: "Test Movers Inc. charged me a $3,800 moving fee on May 2, 2026. They broke my dining table and TV, worth $2,500 together. I have photos and the invoice." },
  { id: "sc-roofer-single", court: "small-claims", side: "plaintiff", filed: [], amount: "$9,000", story: "I paid Test Roofing Ltd. $9,000 on May 12, 2026 to fix my roof and they never came back. I have emails and the receipt." },
  { id: "sc-deposit-back", court: "small-claims", side: "plaintiff", filed: [], amount: "$1,800", story: "My landlord kept my $1,800 deposit when I moved out in June 2026. He says I owe $500 for cleaning but I want the $1,800 back. I have the lease and move-out photos." },
  { id: "sc-loan-friend", court: "small-claims", side: "plaintiff", filed: [], amount: "$3,000", story: "I lent my former friend $3,000 in January 2026 and he never paid me back. I have the e-transfer record and his text messages." },
  { id: "sc-car-estimate", court: "small-claims", side: "plaintiff", filed: [], amount: "$2,500", story: "A driver backed into my parked car on April 4, 2026. The repair estimate is $2,500 and I paid a $500 deductible. I have photos and the estimate." },
  { id: "sc-invoice-unpaid", court: "small-claims", side: "plaintiff", filed: [], amount: "$5,400", story: "I did landscaping work for Test Homes Ltd. and sent an invoice for $5,400 on June 10, 2026. It is still unpaid. I have the invoice and emails." },
  { id: "sc-unclear", court: "small-claims", side: "plaintiff", filed: [], amount: null, story: "I hired Test Renovations Ltd. to build a deck for $8,000. I paid $2,000 and they never finished." },
  // A defendant is not asked the amount (the claim states it): nothing is offered.
  { id: "sc-defendant-served", court: "small-claims", side: "defendant", filed: [], amount: null, story: "Test Supply Ltd. is suing me for $4,200 they say I owe for tools. I was served with a Plaintiff's Claim on October 6, 2026. I have my receipts." },
  { id: "sc-defendant-unclear", court: "small-claims", side: "defendant", filed: [], amount: null, story: "My former roommate says I owe her money for utilities and served me with court papers last week. I have our text messages." },
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
  { id: "family-safety", court: "family", side: "applicant", filed: ["nothing"], issues: ["safety-concerns", "parenting-time"], story: "I left my partner in September 2026 after he threatened me. I want a parenting order for our son, age 6. I have messages he sent." },
];

const INTERNAL = /Court path:|Stage: Stage unclear|Main story:|Case story:|Reasoning domain|privilege \/ recipient|procedural stage is uncertain|Important limitation|Knowledge retrieval warning|\bundefined\b|\[object Object\]|\bNaN\b/;
const EVIDENCE = /\b(?:text messages?|messages|emails?|receipts?|invoices?|contracts?|photos?|screenshots?|records?|letters?|pay stubs|tax returns|survey|lease|estimate|agreement|offer letter|job offer|certificate)\b/i;
const DOUBLE_STOP = /[A-Za-z0-9)][.]{2}(?![.])/;
// Appended as found: a failed test restarts its worker, which would lose an in-memory list.
const FINDINGS = "test-results/story-pack-findings.jsonl";

function note(run: string, where: string, what: string, ok: boolean, detail = "") {
  if (!ok) {
    fs.mkdirSync("test-results", { recursive: true });
    fs.appendFileSync(FINDINGS, JSON.stringify({ run, where, what, detail: detail.replace(/\s+/g, " ").slice(0, 300) }) + "\n");
  }
  expect.soft(ok, `${where}: ${what}${detail ? ` -- ${detail.replace(/\s+/g, " ").slice(0, 200)}` : ""}`).toBe(true);
}

/** The text-level properties every page and reply must hold. */
function checkText(run: string, where: string, text: string) {
  const internal = INTERNAL.exec(text);
  note(run, where, "no internal wording", !internal, internal ? text.slice(Math.max(0, internal.index - 80), internal.index + 80) : "");
  const double = DOUBLE_STOP.exec(text);
  note(run, where, "no doubled full stop", !double, double ? text.slice(Math.max(0, double.index - 60), double.index + 20) : "");
  const repeated = text.split("\n").map((line) => line.split(/;\s*/).map((part) => part.trim()).filter((part) => part.length >= 6)).find((parts) => new Set(parts).size !== parts.length);
  note(run, where, "no citation or phrase repeated within a line", !repeated, repeated?.join(" ; ") ?? "");
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
    if (key === "servedDate") { await question.getByRole("textbox").fill("October 6, 2026"); await question.getByTestId("guided-form-next").click(); continue; }
    // A box already filled from the story ("Leo, age 7."): the person keeps it, so the
    // chat's "Got it" line echoes their own words (where "Leo, age 7.." showed).
    const box = question.getByRole("textbox");
    if ((await box.count()) && (await box.inputValue()).trim()) { await question.getByTestId("guided-form-next").click(); continue; }
    await question.getByTestId("guided-form-skip").click();
  }
  checkText(story.id, "questions", await page.getByTestId("guided-form-chat").innerText().catch(() => ""));
  await page.getByTestId("guided-form-done").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
}

/** Civil and Family: what was left for the review, answered there. */
async function answerInReview(page: Page, story: Story) {
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
  const served = question("servedDate");
  if (await served.count()) { await served.getByRole("textbox").fill("October 6, 2026"); await served.getByRole("textbox").press("Enter"); }
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
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByTestId("sc-intake-yourRole").selectOption(story.side === "defendant" ? "Defendant / responding party" : "Plaintiff / claimant");
    const offered = (await page.getByTestId("sc-intake-amountClaimed").inputValue()).trim() || null;
    await page.getByTestId("intake-start-review").click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
    return offered;
  }
  await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  await q("sc-orient-role").getByRole("button", { name: story.side === "defendant" ? /Responding/ : /Bringing the claim/ }).first().click();
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  const filedQuestion = story.side === "defendant" ? "sc-defendant-defence-filed" : "sc-claim-filed";
  if (await q(filedQuestion).count()) await q(filedQuestion).getByRole("button", { name: "No", exact: true }).click();
  const use = q("sc-amount-claimed").getByRole("button", { name: /^Use “.*” \(from your story\)$/ });
  const offered = (await use.count()) ? (/“(.*)”/.exec((await use.first().innerText()) ?? "")?.[1] ?? null) : null;
  if (offered) await use.first().click();
  return offered;
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
  await page.getByRole("button", { name: "Ask Case Partner" }).click();
  await expect(transcript.locator("div.mr-auto")).toHaveCount(before + 1, { timeout: 60_000 });
  // The reply, not the "reviewing this case ..." line shown while it is on its way.
  const reply = transcript.locator("div.mr-auto").last();
  await expect(reply).not.toContainText("is reviewing this case", { timeout: 60_000 });
  return reply.innerText();
}

const SIDE_LINE: Record<Story["side"], RegExp> = {
  plaintiff: /You are bringing this case \(plaintiff\)/,
  applicant: /You started, or plan to start, this case \(applicant\)/,
  defendant: /You are responding \(defendant\)/,
  respondent: /You are responding \(respondent\)/,
};

for (const story of STORIES) {
  for (const route of ["questions", "review"] as const) {
    test(`${story.id} (${route})`, async ({ page }) => {
      test.setTimeout(240_000);
      const run = `${story.id} (${route})`;
      await grantSiteAccess(page);
      const account = await fakeAccount(page);
      await serveFromThisCommit(page, story.court, account.rows as unknown as Map<string, Record<string, unknown>>);

      // 1-2. Start the case and answer.
      if (story.court === "small-claims") {
        const offered = await smallClaims(page, story, route === "review");
        // The review offers the story's amount; the form's own box reads the story only on its
        // "Save story", so there it may be empty, but never a wrong amount.
        const fits = route === "review" ? offered === story.amount : offered === null || offered === story.amount;
        note(run, route === "review" ? "review" : "form", `the amount offered is ${story.amount ?? "nothing (unclear)"}`, fits, `offered ${offered ?? "nothing"}`);
      } else {
        await openBuilder(page, story.court, { story: story.story });
        await guidedQuestions(page, story, route === "review");
        if (route === "review") await answerInReview(page, story);
      }
      checkText(run, "review", await page.getByTestId("intake-review").innerText());

      // 3. Confirm, and the next step.
      await confirmAndContinue(page);
      await page.waitForTimeout(1_500);
      const results = await page.locator("body").innerText();
      checkText(run, "results", results);
      if (settles(story)) {
        note(run, "results", "a stage the answers settle is not asked again", !results.includes("Which of these fits your case best?"));
      }

      // 4. The chat.
      const ask = page.getByRole("button", { name: "Ask follow-up questions" });
      if (await ask.isVisible().catch(() => false)) {
        await ask.click();
        const gather = await lastReply(page, "What should I gather first?");
        checkText(run, "chat", gather);
        const quotes = [...gather.matchAll(/“([^”]+)”/g)].map((match) => match[1]);
        // Only when the story names some evidence: then there are the person's own words to quote.
        if (EVIDENCE.test(story.story)) note(run, "chat", "the evidence reply quotes the person's own words", quotes.some((quote) => story.story.includes(quote)), gather.slice(0, 200));
        const asked = await lastReply(page, "How long do I have to respond?");
        checkText(run, "chat", asked);
        note(run, "chat", "no line ends on its lead-in with nothing after it", !/To keep your case record complete:\s*$/m.test(gather + "\n" + asked), asked.slice(-160));
        if (/served/i.test(story.story) && /October \d/.test(story.story)) {
          note(run, "chat", "does not ask for the main dates once a served date is recorded", !/main dates/i.test(gather + asked), (gather + asked).slice(0, 200));
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
        checkText(run, "case page", casePage);
        // The header's own side line, for either side (only the responding side had one).
        note(run, "case page", "names the person's side", SIDE_LINE[story.side].test(casePage));
        if (settles(story)) note(run, "case page", "a stage the answers settle is not asked again", !casePage.includes("Which of these fits your case best?"));
      } else note(run, "case page", "the case was saved", false);
    });
  }
}

