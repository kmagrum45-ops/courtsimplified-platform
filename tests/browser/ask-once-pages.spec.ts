/**
 * ASK ONCE, ON EVERY PAGE, FOR 39 STORIES (site owner, 11 Nov 2026: "the site must remember the case and every
 * screen must read from it"; target ZERO, no baseline).
 *
 * Each story (the 32 of test:story-invariants, the tree story from the live site, the slip-and-fall, and three of Chrome's
 * check of #550 read on the home page with its own questions: 5b, 5c, 5d, and Chrome's forms story: the person's details and
 * two defendants typed in the story, the Parties step answered from its offers; and a Family story whose "Were you married?" is answered "I'm not sure" in the triage, decision A of 14 Nov 2026) is given
 * once, signed in, and taken through the questions (Small Claims: the chat, pressing Continue on its story offers
 * without ticking, as the person on the live site did; civil and Family: one question at a time, using an offer
 * from the story when one is made), the review, the next step, the case page, the case file page and, for a Small
 * Claims claim, the draft. The ask-once recorder (harness/askOnce.ts) watches every question on every screen, after
 * every answer. Violations, per story, by fact and screen:
 *   asked-twice      a fact asked again after the person gave it (the recorder's own rule, held and repeat);
 *   stated-cold      a fact the story states asked cold (not as an offer from the story): a value stated in the
 *                    story is offered once and never asked cold afterward;
 *   typed-reconfirm  a value the person typed shown again as needing confirmation (the review's Confirm);
 *   missing-label    a "not answered" / "not yet been clearly entered" label shown for a fact the case holds.
 *
 * Every story must reach every page, and every violation must be on the expected list (harness/askOnceExpected.json:
 * measured on #549 before any fix, one entry each with its reason; it may only shrink, test:ask-once-expected, and is
 * empty when slice 4 lands). An entry no longer seen is reported as FIXED (delete it). ASK_ONCE_REPORT=1 records and
 * counts without failing (a measurement). Records: ask-once-records/<story>.json.
 * Runs in CI on a local Supabase stack (courtsimplified-ask-once.yml, scripts/browser/carryLocal.sh with CARRY_SPEC).
 * Model routes are stood in (thisCommitServer.ts): no AI spend.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import { asksForDate } from "../../src/lib/case-system/dates";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, answerSituation, situationAnswersFor, STARTING_NOTHING_FILED, type SituationAnswers } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns, type Court } from "./harness/thisCommitServer";
import { factsAskedTwice, factsOfAsk, heldViolations, recordAsks, repeatViolations, type Asked } from "./harness/askOnce";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { chooseOffers } from "./harness/offers";
import { MARRIED_ONLY_SCREEN_TEXT } from "../../src/lib/case-system/family/marriedOnly";
import { expectThisRunsServer } from "./harness/siteAccess";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

type Side = "bringing" | "responding";
type Stated = { amount?: string; when?: string; otherParty?: string };
/** `home`: the home page's story reading asks these questions (Chrome check of #550, 5b-5d), answered with these words. */
/** `parties`: the story gives the parties' details; the Parties step is answered from its offers (Chrome forms test, #550). */
/** `reading`: the facts the home page's story reading shows, as the model gives them (Chrome milestone test of #550). */
/** `married`: the Family triage's "Were you married?" answered No or "I'm not sure"; then no married-only sentence anywhere. */
/** `situation`: the start's own answers, when they are not the plain ones (S6: just served with a Form 7A). */
type Story = { name: string; court: Court; side: Side; text: string; served?: string; stated: Stated; amountLater?: true; home?: { question: string; answer: string }[]; parties?: true; marriedUnsure?: true; married?: "no" | "unsure"; reading?: { label: string; value: string }[]; situation?: SituationAnswers };
const S = (name: string, court: Court, side: Side, text: string, stated: Stated, served?: string): Story => ({ name, court, side, text: `Synthetic: ${text}`, stated, served });

export const STORIES: Story[] = [
  S("sc-loan-friend", "small-claims", "bringing", "In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised to pay me back by June 1, 2026.", { amount: "4500", when: "March 2026", otherParty: "Alex Testwood" }),
  S("sc-loan-sister", "small-claims", "bringing", "I loaned my sister $2,000 in May 2026 to fix her roof. She has not repaid any of it.", { amount: "2000", when: "May 2026" }),
  S("sc-iou", "small-claims", "bringing", "My coworker signed an IOU for $900 on April 4, 2026 and has not paid it back.", { amount: "900", when: "April 4, 2026" }),
  S("sc-served-roommate", "small-claims", "responding", "On October 28, 2026 I was served with a Plaintiff's Claim. My former roommate says I owe her $3,200 for rent and utilities.", { amount: "3200" }, "October 28, 2026"),
  S("sc-served-cousin", "small-claims", "responding", "I was served on November 2, 2026 with a claim saying I owe $1,500 on a loan from my cousin. I paid most of it back.", { amount: "1500" }, "November 2, 2026"),
  S("civil-loan-partner", "civil", "bringing", "In June 2025 I lent my former business partner $85,000. She signed a note promising to repay it by March 1, 2026.", { amount: "85000", when: "June 2025" }),
  S("civil-served-guarantee", "civil", "responding", "On November 2, 2026 I was served with a Statement of Claim. A supplier says I owe $120,000 under a guarantee I signed.", { amount: "120000" }, "November 2, 2026"),
  S("sc-deposit-landlord", "small-claims", "bringing", "I moved out on August 31, 2026. My former landlord kept my $1,500 last month's rent deposit.", { amount: "1500", when: "August 31, 2026" }),
  S("sc-deposit-venue", "small-claims", "bringing", "I paid a $600 deposit for a wedding venue on January 10, 2026. The venue cancelled and kept the deposit.", { amount: "600", when: "January 10, 2026" }),
  S("sc-served-kitchen", "small-claims", "responding", "I was served with a claim on October 15, 2026. A customer says I kept her $2,000 deposit for a kitchen I never built.", { amount: "2000" }, "October 15, 2026"),
  S("sc-contractor-bathroom", "small-claims", "bringing", "I paid a contractor $6,000 to renovate my bathroom in April 2026 and the work was never finished.", { amount: "6000", when: "April 2026" }),
  S("sc-roofer", "small-claims", "bringing", "A roofer charged me $8,000 on July 2, 2026 and the roof still leaks.", { amount: "8000", when: "July 2, 2026" }),
  S("sc-served-plumber", "small-claims", "responding", "I am a plumber. I was served with a claim on September 30, 2026 by a homeowner who says my work flooded her basement.", {}, "September 30, 2026"),
  S("civil-builder", "civil", "bringing", "A builder took $140,000 from me for an addition in 2025 and walked off the job in February 2026.", { amount: "140000", when: "February 2026" }),
  S("sc-car-backed", "small-claims", "bringing", "On May 3, 2026 a driver backed into my parked car. The repair cost $3,400.", { amount: "3400", when: "May 3, 2026" }),
  S("sc-served-truck", "small-claims", "responding", "I was served with a claim on November 5, 2026. A neighbour says I scratched his truck in a parking lot.", {}, "November 5, 2026"),
  S("sc-mechanic", "small-claims", "bringing", "A mechanic charged me $1,800 on March 9, 2026 for a repair that did not fix my car's engine.", { amount: "1800", when: "March 9, 2026" }),
  S("sc-wages", "small-claims", "bringing", "My former employer did not pay my last two weeks of wages, $2,300, when I quit on July 15, 2026.", { amount: "2300", when: "July 15, 2026" }),
  S("civil-fired", "civil", "bringing", "I was fired without notice on September 1, 2026 after eight years at my job.", { when: "September 1, 2026" }),
  S("civil-served-dismissal", "civil", "responding", "I was served with a Statement of Claim on October 20, 2026. A former employee says I wrongfully dismissed him.", {}, "October 20, 2026"),
  S("sc-invoice", "small-claims", "bringing", "I did freelance design work and sent an invoice for $2,000 on May 1, 2026. It is still unpaid.", { amount: "2000", when: "May 1, 2026" }),
  S("sc-laptop", "small-claims", "bringing", "I bought a used laptop online for $700 on June 6, 2026 and it never arrived.", { amount: "700", when: "June 6, 2026" }),
  S("sc-served-furniture", "small-claims", "responding", "I was served with a claim on October 1, 2026. My former tenant says I damaged his furniture when he moved out.", {}, "October 1, 2026"),
  S("civil-tree-fell", "civil", "bringing", "My neighbour's tree fell on my house on March 3, 2026, causing $60,000 in damage.", { amount: "60000", when: "March 3, 2026" }),
  S("family-never-married", "family", "bringing", "Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me.", { otherParty: "Jordan Testfield" }),
  S("family-married-2015", "family", "bringing", "I married Sam Testmarsh in 2015 and we separated in January 2026. We have two children who live with me.", { otherParty: "Sam Testmarsh" }),
  S("family-served-form8", "family", "responding", "I was served with a Form 8 Application on October 12, 2026. My ex wants sole decision-making for our son.", {}, "October 12, 2026"),
  S("family-support-unpaid", "family", "bringing", "My ex has not paid child support since March 2026 even though there is a court order.", {}),
  S("family-served-motion", "family", "responding", "On November 1, 2026 I was served with a motion to change the support order. My ex says my income went up.", {}, "November 1, 2026"),
  S("family-sell-house", "family", "bringing", "We separated in May 2026 after 12 years of marriage. I want to sell the house we own together.", {}),
  S("family-served-divorce", "family", "responding", "I got served on September 20, 2026 with my wife's application for divorce and spousal support.", {}, "September 20, 2026"),
  S("family-moved-away", "family", "bringing", "My former partner moved away with our son in August 2026 without telling me. I want a parenting schedule.", {}),
  // From the live site (11 Nov): the story as typed, a quote stated, no date.
  { name: "sc-tree-cut", court: "small-claims", side: "bringing", text: "my neighbor cut down a tree on my property withoiut my permission. i want the tree replaced and i got a quote for 1500 to do the work and supply the tree", stated: { amount: "1500", otherParty: "my neighbor" } },
  // The slip-and-fall: $5,000, $450 and $18.45 saved; the draft said the amount "has not yet been clearly entered".
  { ...S("sc-slip-and-fall-changed", "small-claims", "bringing", "On March 14, 2026 I slipped on an icy step outside Testmart Grocery and broke my wrist. I am claiming $5,000 for pain and suffering, $450 for physiotherapy and $18.45 for a wrist brace.", { amount: "5468.45", when: "March 14, 2026", otherParty: "Testmart Grocery" }), amountLater: true },
  S("sc-slip-and-fall", "small-claims", "bringing", "On March 14, 2026 I slipped on an icy step outside Testmart Grocery and broke my wrist. I am claiming $5,000 for pain and suffering, $450 for physiotherapy and $18.45 for a wrist brace.", { amount: "5468.45", when: "March 14, 2026", otherParty: "Testmart Grocery" }),
  // Chrome check of #550 (13 Nov), with the home page's own questions as Chrome saw them asked.
  // 5b: being sued; the case status asked again after the start screen, and a claim of your own offered again.
  { ...S("sc-served-kitchen-home", "small-claims", "responding", "A contractor redid my kitchen in August 2026. The agreed price was $6,200 and I paid $2,000. They have sued me for the other $4,200. I dispute all of it: the cabinets are crooked and the countertop is cracked.", { amount: "4200" }, "October 20, 2026"),
    home: [
      { question: "Has anything happened in the court case since you received the claim?", answer: "No, nothing else has happened yet." },
      { question: "Do you want to make a claim of your own against the contractor?", answer: "No. I only want to defend the claim. I am not seeking money from the contractor." },
    ] },
  // 5c: Family; "Is anything urgent ... a safety worry" asked after "No safety concerns".
  // Decision A (14 Nov 2026): "Were you married?" answered "I'm not sure" in the triage; never asked again on any page,
  // and no married-only sentence on the case page.
  { ...S("family-married-unsure", "family", "bringing", "Jordan Testmarry and I separated in March 2026. Our son is 5 and lives with me. I want a parenting schedule and child support.", { otherParty: "Jordan Testmarry" }), marriedUnsure: true },
  { ...S("family-not-married-home", "family", "bringing", "Jordan Testcase and I were never married. Our daughter has lived with me in Ottawa since birth and sees Jordan every second weekend. Jordan does not agree to a parenting schedule.", { otherParty: "Jordan Testcase" }),
    home: [
      { question: "Are there any immediate safety concerns for you or your child?", answer: "No safety concerns." },
      { question: "Are there any existing court orders or written agreements about parenting?", answer: "No, there are no orders or written agreements." },
    ] },
  // 5d: Civil; "Who is the other side?" asked after the home page's question about who bought the goods was answered.
  { ...S("civil-goods-home", "civil", "bringing", "I sold $85,000 of equipment personally to a company in Ottawa. Payment was due September 30, 2026 and nothing has been paid.", { amount: "85000" }),
    home: [{ question: "Who bought the goods from you?", answer: "Testgoods Ltd., in Ottawa." }] },
  // Chrome's forms test on #550 (14 Nov): the person's own details and two defendants, typed in the story; the Parties step
  // offers each once; no party detail is asked again on any page afterwards.
  { ...S("sc-forms-chrome", "small-claims", "bringing", "On October 4, 2026 I slipped on a wet floor at the Circle K on Sample Road in Ottawa and fell. I want to claim $5,000 for pain and suffering, $450 in lost wages and $18.45 for medicine. My name is Test Plaintiff, 12 Example Street, Ottawa ON K1A 0A1, phone 613-555-0100, email test.plaintiff@example.com. I am suing Circle K Convenience Stores Ltd., 100 Sample Road, Ottawa ON K1B 0B1, and also the store manager, Test Manager, at the same address.", { amount: "5468.45", when: "October 4, 2026", otherParty: "Circle K Convenience Stores Ltd." }), parties: true },
  // Chrome's milestone test of #550 (16 Nov 2026), its stories S1 to S8 as Chrome ran them from the home page: the
  // reading shows what Chrome saw it show, and each page afterwards (the review, the Parties step, the next step, the case
  // page, the Forms tab) must ask nothing the person or the reading already gave.
  { ...S("sc-milestone-s1-injury", "small-claims", "bringing", "On October 4, 2026 I slipped on a wet floor inside the Circle K on Sample Road in Ottawa and fell. I hurt my back, missed 3 days of work at $150 a day, $450 in all, and paid $18.45 for medicine. I want $5,000 for pain and suffering too.", { amount: "5468.45", when: "October 4, 2026" }),
    home: [{ question: "Did you see a doctor after the fall?", answer: "Yes, at the hospital the same day." }],
    reading: [{ label: "Amount sought", value: "$5,468.45 total, including $5,000 for pain and suffering" }, { label: "Lost wages", value: "3 days at $150 per day, totalling $450" }, { label: "Medicine", value: "$18.45" }] },
  { ...S("sc-milestone-s4-tree", "small-claims", "bringing", "On October 4, 2026 my neighbour cut down a tree on my side of the property line. I want the tree replaced and I got a quote for $1500 to do the work.", { amount: "1500", when: "October 4, 2026" }),
    home: [{ question: "Did you give permission to cut the tree?", answer: "No." }],
    reading: [{ label: "Replacement quote", value: "$1,500" }] },
  { ...S("sc-milestone-s5-loan", "small-claims", "bringing", "In March 2026 I lent my friend Alex $3,000. He promised to pay me back by June 1, 2026 and has paid nothing.", { amount: "3000", when: "March 2026", otherParty: "Alex" }),
    home: [{ question: "Is there anything in writing about the loan?", answer: "Text messages." }],
    reading: [{ label: "Other party", value: "Your friend Alex" }, { label: "Amount", value: "$3,000" }], parties: true },
  { ...S("sc-milestone-s6-sued", "small-claims", "responding", "A contractor redid my kitchen. They have sued me for $4,200. I agree I hired the contractor. I disagree that I owe $4,200: I already paid $2,000 and the work was bad.", { amount: "4200" }, "October 20, 2026"),
    home: [{ question: "What do you dispute about the claim?", answer: "The work was bad and I already paid $2,000." }],
    situation: { where: "served", stage: "just-served", papers: "small-claims/7A", receivedOn: "2026-10-20", court: "small-claims" } },
  { ...S("family-milestone-s7a-not-married", "family", "bringing", "Jordan Testpartner and I lived together and separated in June 2026. We were never married. Our son is 4 and lives with me. I want a parenting schedule.", { otherParty: "Jordan Testpartner" }),
    home: [{ question: "Are you and your partner legally married?", answer: "" }, { question: "Does your son see his other parent now?", answer: "Every second weekend." }], married: "no" },
  { ...S("family-milestone-s7b-unsure", "family", "bringing", "Robin Testpartner and I separated in May 2026. Our daughter is 7 and lives with me. I want child support and a parenting schedule.", { otherParty: "Robin Testpartner" }),
    home: [{ question: "Are you and your partner legally married?", answer: "" }, { question: "Does your daughter see her other parent now?", answer: "Sometimes." }], married: "unsure" },
  { ...S("civil-milestone-s8", "civil", "bringing", "I sold $85,000 of equipment to Testgoods Ltd. in Ottawa. Payment was due September 30, 2026 and nothing has been paid.", { amount: "85000", otherParty: "Testgoods Ltd." }),
    home: [{ question: "Is there a written contract?", answer: "Yes, an invoice and a purchase order." }] },
];

export type Violation = { story: string; court: Court; side: Side; kind: "asked-twice" | "stated-cold" | "typed-reconfirm" | "missing-label"; fact: string; screen: string; detail: string };
const RECORDS = "ask-once-records";
/** The violations still expected, each with its reason (harness/askOnceExpected.json; may only shrink). */
export type ExpectedEntry = { story: string; kind: Violation["kind"]; fact: string; screen: string; reason: string };
export const EXPECTED_PATH = "tests/browser/harness/askOnceExpected.json";
const EXPECTED: ExpectedEntry[] = JSON.parse(fs.readFileSync(EXPECTED_PATH, "utf8")).entries;
/** A violation's key: the story, the kind, the fact and the screen without its address's query. */
export const keyOf = (item: { story: string; kind: string; fact: string; screen: string }) => [item.story, item.kind, item.fact, item.screen.replace(/\?.*/, "")].join(" | ");
const expectedFor = (item: Violation) => EXPECTED.some((entry) => keyOf(entry) === keyOf(item));
const REPORT = Boolean(process.env.ASK_ONCE_REPORT);
const TYPED_NOT_SURE = "I do not know yet";
/** Surfaces that offer a value from the story for one confirmation (allowed once), not a cold ask. */
const OFFER_SURFACES = new Set(["sc-proposal", "story-proposal-row", "guided-form-from-story", "claim-kind", "parties-offer"]);

function situationOf(story: Story): SituationAnswers {
  if (story.situation) return story.situation;
  if (story.side === "bringing") return { ...STARTING_NOTHING_FILED, court: story.court };
  return { where: "served", papers: "not-sure", receivedOn: story.served ?? "unknown", court: story.court };
}

/** The answer a person gives to a question, from what their story states; otherwise a plain value or "not sure". */
function answerFor(story: Story, text: string): { value: string; fact: string | null } {
  if (/add the year/i.test(text)) return { value: "October 6, 2026", fact: null };
  if (/how much|amount|dollar/i.test(text)) return story.amountLater ? { value: TYPED_NOT_SURE, fact: null } : { value: story.stated.amount ?? "1000", fact: "amount" };
  if (/\bwho\b|name of the (other|person|business)|other (party|side)|other person.s name|their name/i.test(text)) return { value: story.stated.otherParty ?? "Testperson Holdings", fact: "otherParty" };
  if (asksForDate(text)) return { value: story.stated.when && /\d{1,2}, \d{4}/.test(story.stated.when) ? story.stated.when : "March 3, 2026", fact: "whenHappened" };
  if (/bringing this claim|responding to a claim/i.test(text)) return { value: story.side === "bringing" ? "Bringing the claim (plaintiff)" : "Responding to a claim (defendant)", fact: "side" };
  if (/filed|served/i.test(text)) return { value: "No", fact: null };
  return { value: TYPED_NOT_SURE, fact: null };
}

async function giveStory(page: Page, story: Story) {
  if (story.home) {
    // The home page, as Chrome used it: the start screen first (answered by the page's handler), the story, then the
    // reading's questions answered in their boxes and "Update with my answers", then the suggested court.
    await page.goto(`/?path=${story.court}`);
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story.text);
    await page.getByRole("button", { name: `Continue to ${{ "small-claims": "Small Claims", family: "Family", civil: "Civil" }[story.court]} intake` }).click();
    const questions = page.getByTestId("case-understanding-questions");
    if (await visible(questions, 120_000)) {
      // Family: whether they were married is the triage's one question (factStatus.ts ASKED_BY_THE_INTAKE), never asked on
      // the home page beside it (Chrome milestone test of #550, row 45).
      if (story.court === "family") await expect(questions.getByLabel("Are you and your partner legally married?", { exact: true }), "married is asked once, by the triage").toHaveCount(0);
      for (const { question, answer } of story.home) {
        const box = questions.getByLabel(question, { exact: true });
        if (await box.isVisible().catch(() => false)) await box.fill(answer);
      }
      await page.getByTestId("case-understanding-update").click().catch(() => {});
      await expect(questions).toHaveCount(0, { timeout: 120_000 }).catch(() => {});
    }
    // The court was chosen at the start (situationOf: every story's start names its court): the reading's same court is
    // not asked again with Yes / No / I'm not sure (Chrome milestone test of #550, row 6, every story).
    await expect(page.getByTestId("case-understanding").getByRole("button", { name: /^(No, that.s not right|I.m not sure)$/ }), "the court chosen at the start is not asked again").toHaveCount(0);
    await page.getByTestId("case-understanding-continue-suggested").click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 90_000 });
  } else if (story.court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story.text);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 90_000 });
  } else {
    await openBuilder(page, story.court, { city: "Kingston", story: story.text, situation: situationOf(story) });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
  }
  // The first-use notice and the situation questions, whenever they come.
  for (let round = 0; round < 5; round++) {
    const notice = page.getByTestId("acknowledgement-checkbox");
    const situation = page.getByTestId("situation-questions");
    await page.waitForTimeout(1_500);
    if (await notice.isVisible().catch(() => false)) {
      await notice.check().catch(() => {});
      await page.getByTestId("acknowledgement-continue").click().catch(() => {});
      continue;
    }
    if (await situation.isVisible().catch(() => false)) { await answerSituation(page, situationAnswersFor(page)); continue; }
    break;
  }
}

/** Small Claims: the chat, one question at a time; the story offers left unticked and "Continue" pressed (the live case). */
async function smallClaimsChat(page: Page, story: Story, typed: Map<string, string>) {
  const choose = page.getByRole("button", { name: /Answer questions one at a time/ });
  if (await visible(choose, 20_000)) await choose.click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await visible(send, 10_000)) await send.click();
  let last = "";
  for (let i = 0; i < 25; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const suggestion = page.getByTestId("claim-type-suggestion");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(suggestion).or(question).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(800);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) {
      // Each offer answered Yes: the story's values are the person's (an offer never asked cold afterward).
      await chooseOffers(proposals, "yes");
      await proposals.getByTestId("story-proposals-continue").click();
      await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 }).catch(() => {});
      continue;
    }
    if (await suggestion.isVisible().catch(() => false)) {
      await suggestion.getByRole("button").first().click();
      continue;
    }
    const text = (await question.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const { value, fact } = answerFor(story, text);
    if (fact && value !== TYPED_NOT_SURE) typed.set(fact, value);
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(value);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 90_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
}

/** Civil and Family: one question at a time; an offer from the story is used, anything else typed or set aside. */
async function guidedForm(page: Page, story: Story, typed: Map<string, string>) {
  const side = story.court === "family" ? (story.side === "bringing" ? "applicant" : "respondent") : story.side === "bringing" ? "plaintiff" : "defendant";
  const notSure = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const question = page.getByTestId("guided-form-question");
    if (!(await visible(question, 15_000))) break;
    const key = (await question.getAttribute("data-key")) ?? "";
    const yes = question.getByTestId("guided-form-from-story-yes");
    const no = question.getByTestId("guided-form-from-story-no");
    const box = question.getByRole("textbox");
    if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
    if (key === "yourRole") { await question.getByTestId(`guided-option-${side}`).click().catch(() => question.getByTestId("guided-form-skip").click()); continue; }
    if (key === "documents" || key === "filedDocuments" || key === "issues") {
      if (await no.isVisible().catch(() => false)) await no.click();
      const pick = question.locator("[data-testid^=guided-check-]").first();
      if (await pick.isVisible().catch(() => false)) await pick.check();
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    if ((await box.count()) && (await box.first().inputValue()).trim()) { await question.getByTestId("guided-form-next").click(); continue; }
    const label = (await question.innerText()).replace(/\s+/g, " ");
    const { value, fact } = answerFor(story, label);
    if ((await box.count()) && !(value === TYPED_NOT_SURE && notSure.has(key))) {
      if (value === TYPED_NOT_SURE) notSure.add(key);
      else if (fact) typed.set(fact, value);
      await box.first().fill(value);
      await question.getByTestId("guided-form-next").click();
      if (await visible(question.getByTestId("guided-form-needs-more"), 1_500)) { await box.first().fill(""); await question.getByTestId("guided-form-skip").click(); }
      continue;
    }
    await question.getByTestId("guided-form-skip").click();
  }
  await page.getByTestId("guided-form-done").click().catch(() => {});
}

/** The Family triage's "Were you married?" answered "I'm not sure" when it is on the page (decision A); true once answered. */
async function triageMarriedUnsure(page: Page, seen: string[], wait: number, answer: "unsure" | "no" = "unsure"): Promise<boolean> {
  const married = page.locator("[data-testid=triage-question][data-question=married-to-other-party]");
  if (!(await visible(married, wait))) return false;
  // The answer must reach the saved intake record (the case page reads it). A person who leaves is held until it is
  // saved (a link saves first; typing an address asks "Leave site?"); page.goto skips that prompt, so without this wait
  // the test left inside the save's delay and the answer was never saved (runs6, 15 Nov).
  const saved = page.waitForResponse((response) => {
    const request = response.request();
    if (request.method() !== "PATCH" || !request.url().includes("/rest/v1/cases") || !response.ok()) return false;
    try {
      const body = JSON.parse(request.postData() ?? "{}") as { master_result?: { intakeCheckpoint?: { sections?: { builder?: { triageState?: { record?: { marriedToOtherParty?: string } } } } } } };
      return body.master_result?.intakeCheckpoint?.sections?.builder?.triageState?.record?.marriedToOtherParty === answer;
    } catch { return false; }
  }, { timeout: 60_000 });
  await married.getByTestId(`triage-answer-${answer}`).click();
  await expect(married).toHaveCount(0, { timeout: 30_000 });
  await saved.catch(() => { throw new Error("the married \"I'm not sure\" answer never reached the saved intake record"); });
  seen.push(`triage: married answered ${answer}, saved`);
  return true;
}

/** The review: what the person typed shown again as needing confirmation; then confirmed and the next step shown. */
async function reviewAndNextStep(page: Page, story: Story, typed: Map<string, string>, found: Violation[], seen: string[]) {
  const panel = page.getByTestId("intake-review");
  if (!(await visible(panel, 60_000))) return false;
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click().catch(() => {});
  await expect(panel).toHaveAttribute("data-phase", /reviewing|user-confirmed/, { timeout: 60_000 }).catch(() => {});
  const phase = await panel.getAttribute("data-phase");
  const confirmShown = await visible(page.getByTestId("intake-confirm"), 5_000);
  // The review asks for confirmation when it asks for its tick ("I have reviewed this information") next to "Confirm my
  // initial information"; a "Continue" with no tick asks for nothing (the review as a summary, slice 3).
  const confirmAsked = await visible(page.getByTestId("intake-review-acknowledgement"), 3_000);
  seen.push(`review phase=${phase} confirm=${confirmShown} asked=${confirmAsked} typed=${[...typed].map(([k, v]) => `${k}:${v}`).join(",")} text=${(await panel.innerText()).replace(/\s+/g, " ").slice(0, 4000)}`);
  if (phase === "reviewing" && confirmShown && confirmAsked) {
    // The words on the panel and the values in its boxes (a typed answer sits in a box, not in the text).
    const boxes = await panel.locator("input[type=text], input:not([type]), textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value));
    const shown = `${(await panel.innerText()).replace(/\s+/g, " ")} ${boxes.join(" | ")}`;
    seen.push(`review boxes: ${boxes.filter(Boolean).join(" | ").slice(0, 600)}`);
    for (const [fact, value] of typed) {
      const digits = value.replace(/[^\d.]/g, "");
      const hit = fact === "amount" ? new RegExp(`\\$?${digits.replace(/(\d)(?=(\d{3})+(\.|$))/g, "$1,?")}`).test(shown) : shown.toLowerCase().includes(value.toLowerCase());
      if (hit) found.push({ story: story.name, court: story.court, side: story.side, kind: "typed-reconfirm", fact, screen: "review", detail: `typed "${value}", shown again with "Confirm my initial information"` });
    }
  }
  if (phase === "reviewing" && story.parties) await answerParties(page, seen);
  if (phase === "reviewing" && confirmShown) {
    await recordInitialUnknowns(page).catch(() => {});
    await tickIfAsked(page);
    await page.getByTestId("intake-confirm").click().catch(() => {});
  }
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 }).catch(() => {});
  const next = page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first();
  if (await visible(next, 10_000)) await next.click();
  return visible(page.getByTestId("completed-case-overview"), 240_000);
}

/**
 * The Parties step, answered as a person would from what their story gives: Yes to each detail offered, "A person" where it
 * asks whether a party is a person or a company, Yes to the name split from their own words. Every detail of the story's
 * parties is then held, so none is asked again on any page (the recorder's "parties" surfaces).
 */
async function answerParties(page: Page, seen: string[]) {
  const step = page.getByTestId("parties-step").first();
  if (!(await visible(step, 30_000))) { seen.push("parties: no Parties step shown"); return; }
  for (let round = 0; round < 60; round += 1) {
    const yes = step.locator("[data-testid=parties-offer-yes], [data-testid=parties-name-split-yes]").first();
    const person = step.locator("[data-testid=parties-kind-person]").first();
    if (await yes.isVisible().catch(() => false)) await yes.click();
    else if (await person.isVisible().catch(() => false)) await person.click();
    else break;
    await page.waitForTimeout(300);
  }
  seen.push(`parties: ${(await step.innerText()).replace(/s+/g, " ").slice(0, 900)}`);
}

/** A filled official form, downloaded through the real route with the person's own session (POST /api/cases/forms/filled). */
async function filledForm(page: Page, caseId: string, form: string, copy = 1): Promise<Map<string, unknown>> {
  const got = await page.evaluate(async ({ caseId, form, copy }) => {
    const key = Object.keys(window.localStorage).find((name) => /^sb-.*-auth-token$/.test(name));
    const token = key ? (JSON.parse(window.localStorage.getItem(key) || "{}") as { access_token?: string }).access_token : undefined;
    const response = await fetch("/api/cases/forms/filled", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ caseId, form, copy }) });
    return { status: response.status, type: response.headers.get("content-type"), bytes: response.ok ? Array.from(new Uint8Array(await response.arrayBuffer())) : [] };
  }, { caseId, form, copy });
  expect(got.status, `${form} downloads`).toBe(200);
  expect(got.type).toContain("application/pdf");
  const boxes = new Map<string, unknown>();
  for (const box of await pdfBoxes(new Uint8Array(got.bytes))) if (!boxes.has(box.name) || box.value) boxes.set(box.name, box.value);
  return boxes;
}

/**
 * Chrome's forms test: the official Form 7A and Form 1A, filled on the server from the case record, hold the parties the
 * person gave in the Parties step, each its own entry (rules 2 and 4), and the amount (rule 8).
 */
async function checkFilledForms(page: Page, caseId: string, seen: string[]) {
  const form7A = await filledForm(page, caseId, "small-claims/7A");
  seen.push(`form 7A: ${JSON.stringify(Object.fromEntries([...form7A].filter(([, value]) => value && value !== "Off")))}`.slice(0, 2000));
  expect(form7A.get("Plaintiff's last name or the company's name"), "Form 7A: the plaintiff's last name").toBe("Plaintiff");
  expect(form7A.get("First name of the Plaintiff"), "Form 7A: the plaintiff's first name").toBe("Test");
  expect(form7A.get("Plaintiff's address (street number, apartment, unit number)")).toBe("12 Example Street");
  expect(form7A.get("Plaintiff's phone number")).toBe("613-555-0100");
  expect(form7A.get("Plaintiff's email address")).toBe("test.plaintiff@example.com");
  expect(form7A.get("Defendant's last name or company's name"), "Form 7A: Defendant No. 1 is Circle K alone").toBe("Circle K Convenience Stores Ltd.");
  expect(form7A.get("Defendant's address (street number, apartment, unit number)")).toBe("100 Sample Road");
  expect(form7A.get("Additional defendant(s) listed on attached Form 1A"), "Form 7A: the second defendant is listed on Form 1A").not.toBe("Off");
  expect(form7A.get("Principal amount claimed"), "Form 7A: the amount the case holds").toBe("5,468.45");
  const form1A = await filledForm(page, caseId, "small-claims/1A", 1);
  expect(form1A.get("Last name or name of company 1"), "Form 1A: Defendant No. 2 is Test Manager, its own entry").toBe("Manager");
  expect(form1A.get("First name 1")).toBe("Test");
  expect(form1A.get("Defendant number 1")).toBe("2");
}

/** Waits up to `ms` for the element to show (Playwright's isVisible does not wait). */
const visible = (locator: Locator, ms: number) => locator.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);

/** The draft's own lines for a missing fact (claimDraftEngine.ts), by fact. */
const DRAFT_MISSING: [string, RegExp][] = [["amount", /The amount claimed has not yet been clearly entered.?/i], ["otherParty", /Defendant name not entered/i], ["wants", /order or result requested has not yet been entered/i]];
const MISSING_WORDS = /not yet been clearly entered|not answered yet|has not yet provided|still need(?:ed)?|not recorded/i;

/** Labels that say a fact is missing while the case holds it: the case page, the case file page, the Small Claims draft. */
async function readLabels(page: Page, story: Story, id: string, known: Set<string>, found: Violation[], seen: string[]) {
  const pages: [string, string][] = [["case page", `/cases/${id}`], ["case file", `/cases/${id}/case-file`]];
  if (story.court === "small-claims" && story.side === "bringing") pages.push(["draft", `/cases/${id}/drafts`]);
  // The Forms tab (Chrome milestone test of #550, row 25: "Have you confirmed this is an eligible Ontario Small Claims
  // Court matter?" asked after Small Claims was chosen at the start).
  pages.push(["forms", `/cases/${id}/forms`]);
  for (const [screen, address] of pages) {
    await page.goto(address).catch(() => {});
    await page.waitForTimeout(6_000);
    if (screen === "forms" && story.court === "small-claims") {
      // The court was chosen at the start: the eligibility question is kept from the case, never an open select.
      const open = page.locator("label", { hasText: "eligible Ontario Small Claims Court matter" }).locator("select");
      if (await open.count()) found.push({ story: story.name, court: story.court, side: story.side, kind: "asked-twice", fact: "court", screen: "forms", detail: "Have you confirmed this is an eligible Ontario Small Claims Court matter? Select an answer" });
    }
    if (screen === "draft") {
      // The draft is made when the person starts it from the Drafts tab.
      const start = page.getByRole("button", { name: /Plaintiff.s Claim \(Form 7A\)/ }).or(page.getByRole("link", { name: /Plaintiff.s Claim \(Form 7A\)/ })).first();
      if (await visible(start, 10_000)) { await start.click(); await page.waitForTimeout(8_000); }
    }
    seen.push(`${screen}: ${(await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 2500)}`);
    for (const fact of known) {
      const quiet = page.locator(`[data-testid=not-answered-yet][data-fact=${fact}]`);
      if (await quiet.first().isVisible().catch(() => false)) found.push({ story: story.name, court: story.court, side: story.side, kind: "missing-label", fact, screen, detail: (await quiet.first().innerText()).slice(0, 120) });
    }
    // The page's words and its boxes' values (a draft's parts are editable boxes).
    const values = await page.locator("textarea, input[type=text]").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value)).catch(() => [] as string[]);
    const body = `${(await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ")} ${values.join(" | ")}`;
    if (screen === "draft") seen.push(`draft boxes: ${values.join(" | ").replace(/\s+/g, " ").slice(0, 1500)}`);
    for (const [fact, words] of DRAFT_MISSING) {
      if (!known.has(fact)) continue;
      const line = words.exec(body);
      if (line) found.push({ story: story.name, court: story.court, side: story.side, kind: "missing-label", fact, screen, detail: line[0] });
    }
  }
}

for (const story of STORIES) {
  test(`ask once on every page -- ${story.name}`, async ({ page }) => {
    test.setTimeout(900_000);
    const found: Violation[] = [];
    const typed = new Map<string, string>();
    const seen: string[] = [];
    const userId = await authenticateRealTestUser(page, { realCases: true });
    await expectThisRunsServer(page);
    let reached = "start";
    try {
      await autoAnswerSituation(page, situationOf(story));
      await serveModelStandIns(page, story.court, userId, story.home ? { homeQuestions: story.home.map((item) => item.question), homeFacts: story.reading ?? [] } : {});
      const events: Asked[] = await recordAsks(page);
      await giveStory(page, story);
      reached = "story";
      const id = new URL(page.url()).searchParams.get("intake") ?? "";
      const married = story.married ?? (story.marriedUnsure ? "unsure" : undefined);
      let triaged = married ? await triageMarriedUnsure(page, seen, 20_000, married) : false;
      if (story.court === "small-claims") await smallClaimsChat(page, story, typed);
      else await guidedForm(page, story, typed);
      if (married && !triaged) triaged = await triageMarriedUnsure(page, seen, 30_000, married);
      reached = "questions";
      const nextStep = await reviewAndNextStep(page, story, typed, found, seen);
      // The page asks "Were you married?" only once the questions are finished (the review's Continue: familyQuestionsDone,
      // page.tsx), so it is looked for after the review too.
      if (married && !triaged) triaged = await triageMarriedUnsure(page, seen, 60_000, married);
      if (married) expect(triaged, `the triage asked whether married, and took "${married}"`).toBe(true);
      if (nextStep) reached = "next step";
      if (story.amountLater && story.stated.amount) {
        await page.goto(`/builder?path=${story.court}&intake=${id}&change=amount`);
        const change = page.getByTestId("intake-review").locator("[data-testid=change-answer][data-fact=amount]").first();
        if (await visible(change, 60_000)) {
          if (!(await change.getByTestId("change-answer-text").isVisible().catch(() => false))) await change.getByTestId("change-answer-open").click().catch(() => {});
          await change.getByTestId("change-answer-text").fill(story.stated.amount);
          await change.getByTestId("change-answer-save").click();
          await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {});
          typed.set("amount", story.stated.amount);
          seen.push("amount given through Change");
        } else seen.push("no Change for the amount found");
      }
      const known = new Set<string>([...Object.keys(story.stated).filter((fact) => fact !== "when").concat(story.stated.when && /\d{1,2}, \d{4}/.test(story.stated.when) ? ["whenHappened"] : []), ...typed.keys()]);
      await readLabels(page, story, id, known, found, seen);
      if (story.parties) await checkFilledForms(page, id, seen);
      if (married) {
        // Every married-only text (marriedOnly.ts MARRIED_ONLY_SCREEN_TEXT: the sentences, the folded fees part, the divorce
        // line, the Divorce Act in the law list, the divorce and equalization steps), on the next-step page and the case
        // page, folded parts included (textContent reads inside a closed <details>; Chrome milestone test of #550, rows 40
        // and 44: each was in a folded part).
        for (const [where, address] of [["next step", `/builder?path=${story.court}&intake=${id}`], ["case page", `/cases/${id}`]] as const) {
          await page.goto(address);
          await expect(page.getByRole("heading", { name: "Your next step" }).or(page.getByTestId("completed-case-overview")).first()).toBeVisible({ timeout: 120_000 }).catch(() => {});
          await page.waitForTimeout(4_000);
          const text = (await page.locator("body").textContent()) ?? ""; // the whole page (it has two <main>), folded parts too
          const shown = MARRIED_ONLY_SCREEN_TEXT.filter((sentence) => text.includes(sentence));
          expect(shown, `no married-only text on the ${where} after married "${married}"`).toEqual([]);
        }
      }
      reached = reached === "next step" ? "all pages" : reached;
      const situation = situationOf(story);
      for (const violation of [...repeatViolations(factsAskedTwice(events, situation)), ...heldViolations(events)]) {
        found.push({ story: story.name, court: story.court, side: story.side, kind: "asked-twice", fact: violation.fact, screen: `${violation.surface}@${violation.screen}`, detail: violation.text.slice(0, 120) });
      }
      const stated = new Set(known);
      for (const fact of typed.keys()) if (!Object.keys(story.stated).includes(fact === "whenHappened" ? "when" : fact)) stated.delete(fact);
      const coldSeen = new Set<string>();
      // An offer from the story ("From what you told us") is the one allowed confirmation, on any surface.
      for (const ask of events.filter((item) => item.kind === "ask" && item.surface !== "situation" && !OFFER_SURFACES.has(item.surface) && !/From what you told us|from your story/i.test(item.text))) {
        for (const fact of factsOfAsk(ask)) {
          const key = `${fact}|${ask.surface}|${ask.id}`;
          if (stated.has(fact) && !coldSeen.has(key)) {
            coldSeen.add(key);
            found.push({ story: story.name, court: story.court, side: story.side, kind: "stated-cold", fact, screen: `${ask.surface}@${ask.screen}`, detail: ask.text.slice(0, 120) });
          }
        }
      }
    } finally {
      fs.mkdirSync(RECORDS, { recursive: true });
      fs.writeFileSync(path.join(RECORDS, `${story.name}.json`), JSON.stringify({ story: story.name, court: story.court, side: story.side, reached, violations: found, seen }, null, 2));
      await deleteHarnessUser(userId).catch(() => {});
    }
    const known = found.filter((item) => expectedFor(item));
    const unexpected = found.filter((item) => !expectedFor(item));
    const fixed = EXPECTED.filter((entry) => entry.story === story.name && !found.some((item) => keyOf(item) === keyOf(entry)));
    console.log(`ASK ONCE ${story.name}: reached ${reached}; ${found.length} violation(s), ${known.length} on the expected list, ${unexpected.length} not`);
    for (const entry of fixed) console.log(`ASK ONCE FIXED ${keyOf(entry)}: no longer seen; delete its entry`);
    if (!REPORT) {
      expect(reached, "the story reached every page (a page not reached is not a zero)").toBe("all pages");
      expect(unexpected, unexpected.map((item) => `${item.kind} ${item.fact} @ ${item.screen}: ${item.detail}`).join("\n")).toEqual([]);
    }
  });
}
