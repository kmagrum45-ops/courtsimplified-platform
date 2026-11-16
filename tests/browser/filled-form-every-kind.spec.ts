/**
 * THE FILLED FORM 7A IS REACHABLE FOR EVERY KIND OF SMALL CLAIMS CLAIM, ON THE 7A SECTION AND THE FORMS TAB (site owner,
 * 16 Nov 2026, Chrome milestone test of #550, row 24: "No filled Form 7A anywhere").
 *
 * Chrome: for a personal injury, a contractor and a loan claim, the "Preparing your Plaintiff's Claim (Form 7A)" section
 * said only "your answer does not name one of them yet" and the Forms tab offered only "Download the official form and
 * fill it in yourself." Cause: the 7A section returned early when the kind of claim had no checklist, before the Parties
 * step and the filled form (StatementOfClaimSurface.tsx), and the Forms tab never offered the filled form.
 *
 * What it checks, for four kinds (injury, contractor, loan, tree), with the real save path (a real local or staging
 * account; realTestSession.ts refuses production) and the model stand-ins: a confirmed Small Claims case, the parties
 * typed into the Parties step as a person would; then "Download filled Form 7A (PDF)" on the 7A section AND on the case's
 * Forms tab each downloads the court's own PDF, and its boxes read back hold the names, the addresses, the amount, both
 * defendants (the second on Form 1A, its own download), the French names with their accents (the contractor story), and
 * the "additional pages attached" tick, matching the pages actually attached: none for the 350-word story, which fits
 * the form's two reasons boxes (they hold about 2,100 words; pages start near 2,400 words, more than the 8,000
 * characters a story is read at, so test:attached-pages checks the attached pages on the PDF itself; site owner, 16 Nov).
 *
 * What failure it catches: a kind of claim, or a page, from which the filled official form cannot be downloaded, or a
 * download that loses a name, an accent, the amount, a defendant or the attached pages.
 *
 * Stand-ins: the model calls (serveModelStandIns); the parties are typed (a person would type them).
 */
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";
import { pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import { formatRecordedAmount } from "../../src/lib/case-system/format/recordedAmount";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

type PartyIn = { kind: "person" | "company"; first?: string; last?: string; company?: string; street: string; city: string; province: string; postal: string; phone?: string; email?: string };
type Kind = { name: string; kind: RegExp; story: string; amount: string; you: PartyIn; others: PartyIn[]; expectAttached: boolean };

const LONG_STORY = `Synthetic: On October 4, 2026 I slipped on a wet floor inside the Circle K store on Sample Road in Ottawa. ${"There was no sign warning that the floor had just been mopped, and the manager on duty saw me fall and helped me up. I hurt my back and my wrist, went to the hospital the same day, and had X-rays taken. I missed three days of work at $150 a day and paid $18.45 for medicine. A witness gave me her name and number, and I wrote notes the same evening about what happened, who was there, and what was said. ".repeat(4)}I want to claim $5,468.45 in total.`;

const YOU: PartyIn = { kind: "person", first: "Test", last: "Plaintiff", street: "12 Example Street", city: "Ottawa", province: "ON", postal: "K1A 0A1", phone: "613-555-0100", email: "test.plaintiff@example.com" };
const CIRCLE_K: PartyIn = { kind: "company", company: "Circle K Convenience Stores Ltd.", street: "100 Sample Road", city: "Ottawa", province: "ON", postal: "K1B 0B1" };
const MANAGER: PartyIn = { kind: "person", first: "Test", last: "Manager", street: "100 Sample Road", city: "Ottawa", province: "ON", postal: "K1B 0B1" };

const KINDS: Kind[] = [
  { name: "injury (350-word story, fits the form)", kind: /personal injury/i, story: LONG_STORY, amount: "$5,468.45", you: YOU, others: [CIRCLE_K, MANAGER], expectAttached: false },
  { name: "contractor (French names)", kind: /Work or a service/i, story: "Synthetic: I paid a contractor a $1,200 deposit in March 2026 to renovate my kitchen and the work was never started.", amount: "$1,200",
    you: { kind: "person", first: "Gagné", last: "Élève", street: "8 rue de l'Église", city: "Gatineau", province: "QC", postal: "J8X 1A1", phone: "819-555-0100", email: "gagne.eleve@example.com" },
    others: [{ kind: "company", company: "Saint-Jérôme Rénovations Ltée", street: "8 rue de l'Église", city: "Gatineau", province: "QC", postal: "J8X 1A1" }], expectAttached: false },
  { name: "loan", kind: /loan or debt/i, story: "Synthetic: In March 2026 I lent my friend Alex Testwood $3,000. He promised to repay me by June 1, 2026 and has paid nothing.", amount: "$3,000", you: YOU,
    others: [{ kind: "person", first: "Alex", last: "Testwood", street: "5 Lender Lane", city: "Ottawa", province: "ON", postal: "K1C 0C1" }], expectAttached: false },
  { name: "tree", kind: /Property damage/i, story: "Synthetic: On October 4, 2026 my neighbour cut down a tree on my side of the property line. It damaged my fence. I got a quote for $1,500 to replace the tree.", amount: "$1,500", you: YOU,
    others: [{ kind: "person", first: "Pat", last: "Neighbour", street: "14 Example Street", city: "Ottawa", province: "ON", postal: "K1A 0A2" }], expectAttached: false },
];

const visible = (locator: Locator, ms: number) => locator.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);

async function type(article: Locator, detail: string, value: string | undefined) {
  if (!value) return;
  const input = article.getByTestId(`parties-input-${detail}`);
  if (!(await visible(input, 3_000))) return; // already held (from the story) or not asked for this kind of party
  await input.fill(value);
  await input.press("Enter");
  await expect(article.locator(`[data-testid=parties-detail-held][data-detail=${detail}]`)).toBeVisible({ timeout: 15_000 });
}

async function fillParty(page: Page, article: Locator, party: PartyIn) {
  const kindButton = article.getByTestId(party.kind === "person" ? "parties-kind-person" : "parties-kind-company");
  if (await visible(kindButton, 3_000)) { await kindButton.click(); await expect(kindButton).toHaveCount(0, { timeout: 15_000 }); }
  // A name the story gave is offered: declined here, so the typed name is the one kept.
  for (let i = 0; i < 10; i++) {
    const no = article.locator("[data-testid=parties-offer-no], [data-testid=parties-name-split-no]").first();
    if (!(await no.isVisible().catch(() => false))) break;
    await no.click(); await page.waitForTimeout(300);
  }
  if (party.kind === "company") await type(article, "companyName", party.company);
  else { await type(article, "firstName", party.first); await type(article, "lastName", party.last); }
  for (const [detail, value] of [["street", party.street], ["city", party.city], ["province", party.province], ["postalCode", party.postal], ["phone", party.phone], ["email", party.email]] as const) await type(article, detail, value);
}

async function fillParties(page: Page, kind: Kind, section: Locator) {
  // The 7A section's own Parties step (the form's, elsewhere on the page, is folded away).
  const step = section.getByTestId("parties-step");
  await expect(step).toBeVisible({ timeout: 60_000 });
  // Any "Your story also names" offer is declined: the parties typed here are the record.
  for (let i = 0; i < 10; i++) {
    const no = step.getByTestId("parties-story-others").getByTestId("parties-offer-no").first();
    if (!(await no.isVisible().catch(() => false))) break;
    await no.click(); await page.waitForTimeout(300);
  }
  await fillParty(page, step.locator("[data-testid=parties-party][data-party=you]"), kind.you);
  for (const [index, party] of kind.others.entries()) {
    if (index > 0) await step.getByTestId("parties-add-other").click();
    await expect(step.locator("[data-testid=parties-party][data-party=other]")).toHaveCount(index + 1, { timeout: 15_000 });
    await fillParty(page, step.locator("[data-testid=parties-party][data-party=other]").nth(index), party);
  }
}

async function downloadBoxes(page: Page, button: Locator): Promise<{ boxes: Map<string, unknown>; pages: number; bytes: Uint8Array }> {
  await expect(button, "the filled-form button is there and can be pressed").toBeEnabled({ timeout: 30_000 });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120_000 }), button.click()]);
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  const boxes = new Map<string, unknown>();
  const all = await pdfBoxes(bytes);
  for (const box of all) if (!boxes.has(box.name) || box.value) boxes.set(box.name, box.value);
  const pages = Math.max(...all.map((box) => box.page));
  return { boxes, pages, bytes };
}

function checkBoxes(kind: Kind, boxes: Map<string, unknown>, where: string) {
  const expectBox = (box: string, value: unknown, what: string) => expect(boxes.get(box), `${where}: ${what}`).toBe(value);
  const you = kind.you;
  expectBox("Plaintiff's last name or the company's name", you.last, "the plaintiff's last name");
  expectBox("First name of the Plaintiff", you.first, "the plaintiff's first name");
  expectBox("Plaintiff's address (street number, apartment, unit number)", you.street, "the plaintiff's street");
  expectBox("Plaintiff's phone number", you.phone, "the plaintiff's phone");
  expectBox("Plaintiff's email address", you.email, "the plaintiff's email");
  const first = kind.others[0];
  expectBox("Defendant's last name or company's name", first.kind === "company" ? first.company : first.last, "Defendant No. 1's name");
  expectBox("Defendant's address (street number, apartment, unit number)", first.street, "Defendant No. 1's street");
  expectBox("Principal amount claimed", formatRecordedAmount(kind.amount).replace(/^\$/, ""), "the amount");
  expect(boxes.get("Additional defendant(s) listed on attached Form 1A") !== "Off" && Boolean(boxes.get("Additional defendant(s) listed on attached Form 1A")), `${where}: the Form 1A tick matches the defendants`).toBe(kind.others.length > 1);
  const attached = boxes.get("Additional pages attached because more room was needed");
  expect(attached !== "Off" && Boolean(attached), `${where}: the attached-pages tick`).toBe(kind.expectAttached);
}

for (const kind of KINDS) {
  test(`the filled Form 7A downloads from the 7A section and the Forms tab -- ${kind.name}`, async ({ page }) => {
    test.setTimeout(900_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, "small-claims", userId);
      await openBuilder(page, "small-claims", { city: "Ottawa" });
      await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      await page.getByLabel("Case story", { exact: true }).fill(kind.story);
      await saveCaseStory(page);
      await page.getByTestId("sc-intake-amountClaimed").fill(kind.amount);
      await page.getByTestId("sc-intake-amountClaimed").press("Tab");
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
      const panel = page.getByTestId("intake-review");
      if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      await expect(panel).toHaveAttribute("data-phase", "reviewing");
      const kindQuestion = page.locator('[data-question="sc-orient-dispute-category"]');
      if (await kindQuestion.count()) {
        const exact = kindQuestion.getByRole("button", { name: kind.kind }).first();
        if (await exact.count()) await exact.click();
      }
      const filed = page.locator('[data-question="sc-claim-filed"]');
      if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
      await recordInitialUnknowns(page);
      await tickIfAsked(page);
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      // The next step, as the person reaches it: the Form 7A section is drawn on the step's overview.
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });

      // The 7A section: the Parties step and the filled form, whatever the kind of claim.
      const section = page.getByTestId("statement-of-claim-surface");
      await expect(section, "the Form 7A section is shown").toBeVisible({ timeout: 120_000 });
      await expect(section.getByTestId("statement-of-claim-kind"), "the kind recorded is the one chosen").toContainText(kind.kind);
      await fillParties(page, kind, section);
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      const sectionButton = section.getByTestId("filled-form-7a").getByTestId("filled-form-download");
      await expect(sectionButton, "the 7A section offers the filled form").toHaveText("Download filled Form 7A (PDF)");
      const fromSection = await downloadBoxes(page, sectionButton);
      checkBoxes(kind, fromSection.boxes, "7A section");
      // Pages after the form's own (its last signature page) exactly when the tick says so, never one without the other.
      const lastFormPage = Math.max(...(await pdfBoxes(fromSection.bytes)).filter((box) => box.name.startsWith("Signature")).map((box) => box.page));
      expect(fromSection.pages > lastFormPage, "pages are attached after the form's own pages exactly when the tick is set").toBe(kind.expectAttached);
      if (kind.others.length > 1) {
        const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120_000 }), section.getByTestId("filled-form-1a-download").first().click()]);
        const form1A = new Map((await pdfBoxes(new Uint8Array(readFileSync((await download.path())!)))).filter((box) => box.value).map((box) => [box.name, box.value] as const));
        expect(form1A.get("Last name or name of company 1"), "Form 1A: Defendant No. 2, its own entry").toBe(kind.others[1].last);
        expect(form1A.get("First name 1")).toBe(kind.others[1].first);
      }
      // Nothing given is shown as missing.
      await expect(section.getByTestId("filled-form-7a").locator("[data-testid=form-box][data-state=missing]"), "no box the person gave is said to be missing").toHaveCount(0);

      // The Forms tab: the same filled form, from the same record.
      await page.goto(`/cases/${caseId}/forms`);
      const card = page.locator("[data-testid=forms-tab-filled][data-form='small-claims/7A']");
      await expect(card, "the Forms tab offers the filled Form 7A").toBeVisible({ timeout: 120_000 });
      const tabButton = card.getByTestId("filled-form-download");
      await expect(tabButton).toHaveText("Download filled Form 7A (PDF)");
      const fromTab = await downloadBoxes(page, tabButton);
      checkBoxes(kind, fromTab.boxes, "Forms tab");
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
