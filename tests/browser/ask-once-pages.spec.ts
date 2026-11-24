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
import { realAiReadings, replayMisses } from "./harness/aiFixtures";
import { factsAskedTwice, factsOfAsk, firstOfferExcused, heldViolations, recordAsks, repeatViolations, type Asked } from "./harness/askOnce";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { chooseOffers } from "./harness/offers";
import { MARRIED_ONLY_SCREEN_TEXT } from "../../src/lib/case-system/family/marriedOnly";
import { expectThisRunsServer } from "./harness/siteAccess";
import { HOME_QUESTIONS } from "../../src/lib/case-system/caseFile/factQuestions";
import { answerTriage } from "./harness/triageAnswer";
import { writeQuestionLog } from "./harness/questionLog";

/** The home page's amount questions, every court, by their fact list ids (the A2 check: never asked cold when the story states it). */
const AMOUNT_HOME_QUESTIONS = Object.values(HOME_QUESTIONS).flatMap((sides) => [...sides.starting, ...sides.responding]).filter((item) => /amount/i.test(item.id)).map((item) => item.question);

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

type Side = "bringing" | "responding";
type Stated = { amount?: string; when?: string; otherParty?: string };
/** `home`: the home page's story reading asks these questions (Chrome check of #550, 5b-5d), answered with these words. */
/** `parties`: the story gives the parties' details; the Parties step is answered from its offers (Chrome forms test, #550). */
/** `reading`: the facts the home page's story reading shows, as the model gives them (Chrome milestone test of #550). */
/** `married`: the Family triage's "Were you married?" answered No or "I'm not sure"; then no married-only sentence anywhere. */
/** `situation`: the start's own answers, when they are not the plain ones (S6: just served with a Form 7A). */
/** `realAi`: the AI steps answer with the real model's recorded outputs (harness/aiFixtures.ts; Chrome's milestone pass 2). */
/** `answers`: what the person answers a question matching `match` (Chrome's own answers, before the plain ones). */
/** `city`: the city given at the start (default Kingston). */
type Story = { name: string; court: Court; side: Side; text: string; served?: string; stated: Stated; amountLater?: true; home?: { question: string; answer: string }[]; parties?: true; marriedUnsure?: true; married?: "no" | "unsure"; reading?: { label: string; value: string }[]; situation?: SituationAnswers; realAi?: true; answers?: { match: RegExp; value: string; fact?: string }[]; city?: string };
const S = (name: string, court: Court, side: Side, text: string, stated: Stated, served?: string): Story => ({ name, court, side, text: `Synthetic: ${text}`, stated, served });

const CHROME = (name: string, court: Court, side: Side, text: string, stated: Stated, more: Partial<Story> = {}): Story => ({ name, court, side, text, stated, realAi: true, city: "Ottawa", ...more });
const SAFETY_NONE = { match: /safety|urgent|danger|afraid/i, value: "No safety concerns." };
export const CHROME_PASS_2: Story[] = [
  CHROME("sc-chrome2-s1-fall", "small-claims", "bringing", "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. There was no wet-floor sign. I fell on my right hip. A shopper, Sam Patel, saw it. The manager wrote notes. I went to the hospital that night; X-rays showed a bad bruise, no break. I missed 3 days of work (Oct 5 to 7) at $150 a day and bought Tylenol and an ice pack for $18.45. I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.", { amount: "5468.45", when: "October 4, 2026" }, { answers: [
    { match: /address|where (is|was) the store|location of the store/i, value: "100 Sample Road, Ottawa ON K1B 0B1" },
    { match: /who (runs|operates|owns)|operator|company|business name|\bwho\b|other (party|side)/i, value: "Circle K Convenience Stores Ltd.", fact: "otherParty" },
    { match: /water|spill|how long|caused/i, value: "I don't know where the water came from." },
    { match: /still|recover|injur|doctor|treatment|hurt/i, value: "My hip is still sore when I walk for a long time." },
  ] }),
  CHROME("sc-chrome2-s2-deposit", "small-claims", "bringing", "My contractor left the work unfinished and kept my $1,200 deposit.", { amount: "1200" }, { answers: [
    { match: /where (was|is|were) the work|work (was )?done|property/i, value: "Ottawa, Ontario" },
    { match: /where (is|are) the contractor|contractor.*(located|based|live)/i, value: "Gatineau, Quebec" },
    { match: /when|date/i, value: "September 2026" },
    { match: /what (do you want|are you asking)|outcome|order/i, value: "Return of my $1,200 deposit" },
    { match: /how much|amount|other (costs|money)/i, value: "Only the $1,200 deposit.", fact: "amount" },
  ] }),
  CHROME("sc-chrome2-s3-fence", "small-claims", "bringing", "Pat Testfield lives next door to me at 47 Maple Crescent in Ottawa. In July 2026 Pat hired a crew to put up a new wooden fence between our yards without talking to me first. The crew took down my old chain-link fence, which was on my side of the line, and threw it away. They also dug up part of my garden bed along the fence and drove a small machine over my lawn, which left deep ruts. When I asked Pat about it, Pat said the old fence was ugly and that the new fence was a favour to me. I had a surveyor confirm in August 2026 that the old fence stood on my land. I got two quotes to replace my chain-link fence and repair the lawn and garden. The lower quote is $2,400. I sent Pat a letter on September 1, 2026 asking for payment by September 30, 2026, and Pat has not paid or answered. I want $2,400 plus my costs.", { amount: "2400", when: "July 2026", otherParty: "Pat Testfield" }, { answers: [
    { match: /name|who/i, value: "Pat Testfield", fact: "otherParty" },
    { match: /address/i, value: "47 Maple Crescent, Ottawa ON K1A 0A2" },
  ] }),
  CHROME("sc-chrome2-s4-tree", "small-claims", "bringing", "My neighbour cut down my maple tree on Oct 4, 2026 without asking. I want the tree replaced and I got a quote for $1500 to do the work and supply the tree.", { amount: "1500", when: "October 4, 2026" }, { answers: [
    { match: /trunk|property line|whose (side|property)|where (was|is) the tree/i, value: "Entirely on my property." },
    { match: /what (do you want|are you asking)|outcome|order/i, value: "The $1,500 so I can arrange the replacement myself." },
    { match: /name|who/i, value: "Test Neighbour", fact: "otherParty" },
  ] }),
  CHROME("sc-chrome2-s5-loan", "small-claims", "bringing", "On June 1, 2026 I lent my friend Alex $3,000 for a car repair. He texted me an IOU. He has not paid me back.", { amount: "3000", when: "June 1, 2026" }, { answers: [
    { match: /what (do you want|are you asking)|outcome|order/i, value: "I want Alex to pay me back the $3,000." },
    { match: /last name|full name/i, value: "I'm not sure" },
  ] }),
  CHROME("sc-chrome2-s6-sued", "small-claims", "responding", "I was served with a Small Claims claim on Oct 20, 2026. A contractor says I owe $4,200 for a kitchen job. I already paid $2,000 and the work was bad.", { amount: "4200" }, {
    served: "October 20, 2026",
    situation: { where: "served", stage: "just-served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims" },
    answers: [
      { match: /further court papers|responded|since you were served|anything (else )?happened/i, value: "Nothing else yet. I was just served" },
      { match: /how (were|was) (you|it) served|served on you/i, value: "Handed to me at my door." },
      { match: /agreed|price|contract/i, value: "We agreed $6,200 for cabinets and countertop." },
      { match: /wrong|bad|problem|defect/i, value: "The cabinets are crooked and the countertop is cracked." },
      { match: /issued/i, value: "October 15, 2026" },
      { match: /when (was|did) the work|when/i, value: "August 2026" },
      { match: /filed a defence|defence/i, value: "No" },
      // "Do you believe the plaintiff, or someone else, owes you money...?" is a yes or no (decision 1, 18 Nov 2026); Chrome
      // said yes to it (accepted the story's claim back). Before the plaintiff's name, which the same words would match.
      { match: /owes? you (?:any )?money|claim of your own|counter-?claim|defendant.s claim/i, value: "Yes" },
      { match: /plaintiff|contractor.*name|who (is suing|sued)/i, value: "Test Kitchens Inc.", fact: "otherParty" },
      { match: /facts|disagree|dispute/i, value: "I agree I hired the contractor. I disagree that I owe $4,200: I already paid $2,000 and the work was bad." },
      { match: /outcome|what (do you want|are you asking)/i, value: "Only responding to the claim" },
    ] }),
  CHROME("family-chrome2-s7a-no", "family", "bringing", "My partner and I separated in June 2026. We have a 6-year-old. I want a parenting schedule.", {}, { married: "no", answers: [
    { match: /other (parent|person).s name|their name|name of the other/i, value: "" },
    { match: /lived together|live together/i, value: "From 2018 to June 2026." },
    { match: /urgent/i, value: "No" },
    SAFETY_NONE,
    { match: /agree/i, value: "The other parent does not agree." },
    { match: /time with|see the|schedule|arrangement/i, value: "Every second weekend with the other parent." },
    { match: /live|lives|home|where (is|does) the child/i, value: "With me in Ottawa since birth." },
  ] }),
  CHROME("family-chrome2-s7b-unsure", "family", "bringing", "My partner and I separated in June 2026. We have a 6-year-old. I want a parenting schedule.", {}, { married: "unsure", answers: [
    { match: /other (parent|person).s name|their name|name of the other/i, value: "" },
    { match: /urgent/i, value: "I do not know yet" },
    SAFETY_NONE,
    { match: /agree/i, value: "The other parent does not agree." },
    { match: /time with|see the|schedule|arrangement/i, value: "Every second weekend with the other parent." },
    { match: /live|lives|home|where (is|does) the child/i, value: "With me in Ottawa since birth." },
  ] }),
  CHROME("civil-chrome2-s8-goods", "civil", "bringing", "A company owes me $85,000 for goods I delivered in August 2026 and has not paid. The company is Testgoods Ltd.", { amount: "85000", otherParty: "Testgoods Ltd." }, { answers: [
    { match: /urgent/i, value: "No" },
    { match: /order|what (do you want|are you asking)|outcome/i, value: "Payment of the $85,000." },
  ] }),
];

/**
 * Chrome's pass 3 on #550 (19 Nov 2026, comment 7013013873): the same story texts as pass 2 (site owner, 19 Nov: both
 * checked letter for letter against the saved pass 2 cases), answered as Chrome answered them in pass 3 (its "Stand-ins
 * used"). A box Chrome left blank is answered "I do not know yet" (the page test's not-sure), and Chrome's typed "I don't
 * know" is typed as it was. Each must reach every page asking nothing twice, and pass Chrome's pass 3 findings
 * (chromePass3Problems).
 */
export const CHROME_PASS_3: Story[] = [
  CHROME("sc-chrome3-s1-fall", "small-claims", "bringing", CHROME_PASS_2[0].text, { amount: "5468.45", when: "October 4, 2026" }, { answers: [
    { match: /what date|date did it happen|injur(?:y|ed) (?:date|happen)/i, value: "2026-10-04" },
    { match: /address|where (is|was) the store|location of the store/i, value: "100 Sample Road, Ottawa ON K1B 0B1" },
    { match: /who (runs|operates|owns)|operator|company|business name|\bwho\b|other (party|side)/i, value: "Circle K Convenience Stores Ltd.", fact: "otherParty" },
    { match: /water|spill|how long|caused|wet/i, value: "" },
    { match: /still|recover|symptom|doctor|treatment|hurt/i, value: "" },
  ] }),
  CHROME("sc-chrome3-s2-deposit", "small-claims", "bringing", CHROME_PASS_2[1].text, { amount: "1200" }, { city: "Gatineau", answers: [
    { match: /where (is|are) the contractor|contractor.*(located|based|live)|business (is )?based/i, value: "Saint-Jérôme Rénovations Ltée, 8 rue de l'Église, Gatineau QC J8X 1A1" },
    { match: /where (do|did) you live|your (own )?(city|address)/i, value: "Gatineau, Quebec. 8 rue de l'Église, Gatineau QC J8X 1A1" },
    { match: /where (was|is|were) the work|work (was )?done|property/i, value: "8 rue de l'Église, Gatineau QC J8X 1A1" },
    { match: /how much|amount|other (costs|money)|beyond the deposit/i, value: "Only the $1,200 deposit", fact: "amount" },
    { match: /what (do you want|are you asking)|outcome|order|remedy/i, value: "Return of my $1,200 deposit." },
    { match: /when|date/i, value: "I do not know yet" },
  ] }),
  CHROME("sc-chrome3-s6-sued", "small-claims", "responding", CHROME_PASS_2[5].text, { amount: "4200" }, {
    served: "October 20, 2026",
    situation: { where: "served", stage: "just-served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims" },
    answers: [
      { match: /further court papers|responded|since you were served|anything (else )?happened/i, value: "Nothing else yet. I was just served" },
      { match: /how (were|was) (you|it) served|served on you/i, value: "Handed to me at my door." },
      { match: /agreed|price|contract/i, value: "We agreed $6,200 for cabinets and countertop." },
      { match: /wrong|bad|problem|defect/i, value: "The cabinets are crooked and the countertop is cracked." },
      { match: /issued|when (was|did) the work|when|date/i, value: "I don't know" },
      { match: /filed a defence|defence/i, value: "No" },
      // Chrome pass 3, S6-1: the second question, after the first was answered.
      { match: /owes? you (?:any )?money|responsible for part/i, value: "Yes, the plaintiff. I have not started my own claim yet." },
      { match: /outcome of your own|only responding|claim of your own|counter-?claim|defendant.s claim/i, value: "Yes, a claim of my own against them too." },
      { match: /plaintiff|contractor.*name|who (is suing|sued)/i, value: "" },
      { match: /facts|disagree|dispute/i, value: "I agree I hired the contractor. I disagree that I owe $4,200: I already paid $2,000 and the work was bad." },
    ] }),
  CHROME("family-chrome3-s7-no", "family", "bringing", CHROME_PASS_2[6].text, {}, { married: "no", answers: [
    { match: /existing (court )?order|written agreement/i, value: "No" },
    { match: /urgent/i, value: "No" },
    { match: /safety|violence|danger|afraid/i, value: "No safety concerns" },
    { match: /other (parent|person).s name|their name|name of the other/i, value: "" },
    { match: /time with|see the|schedule|arrangement/i, value: "" },
    { match: /live|lives|home|where (is|does) the child/i, value: "" },
  ] }),
];

export const STORIES: Story[] = [
  // Chrome's test of #561 (23 Nov 2026), run 1, signed in: its exact story and city; the home reading shows the other side
  // as Chrome saw it (a description, never a name: "Person or business hired to renovate your kitchen in Ottawa"). Its
  // question log must show no fact asked while held, nothing twice and every question with its fact (the one asker).
  { name: "sc-chrome561-kitchen", court: "small-claims", side: "bringing", text: "TEST Tess Plaintiff, Ottawa, hired TEST Fakebuild Contracting Inc., Ottawa, in January 2026 to renovate a kitchen. I paid $5,468.45. The work was not finished and I want my money back.", stated: { amount: "5468.45", when: "January 2026", otherParty: "TEST Fakebuild Contracting Inc." }, city: "Ottawa", home: [], reading: [{ label: "Other party", value: "Person or business hired to renovate your kitchen in Ottawa" }], parties: true },
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
    situation: { where: "served", stage: "just-served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims" } },
  { ...S("family-milestone-s7a-not-married", "family", "bringing", "Jordan Testpartner and I lived together and separated in June 2026. We were never married. Our son is 4 and lives with me. I want a parenting schedule.", { otherParty: "Jordan Testpartner" }),
    home: [{ question: "Are you and your partner legally married?", answer: "" }, { question: "Does your son see his other parent now?", answer: "Every second weekend." }], married: "no" },
  { ...S("family-milestone-s7b-unsure", "family", "bringing", "Robin Testpartner and I separated in May 2026. Our daughter is 7 and lives with me. I want child support and a parenting schedule.", { otherParty: "Robin Testpartner" }),
    home: [{ question: "Are you and your partner legally married?", answer: "" }, { question: "Does your daughter see her other parent now?", answer: "Sometimes." }], married: "unsure" },
  { ...S("civil-milestone-s8", "civil", "bringing", "I sold $85,000 of equipment to Testgoods Ltd. in Ottawa. Payment was due September 30, 2026 and nothing has been paid.", { amount: "85000", otherParty: "Testgoods Ltd." }),
    home: [{ question: "Is there a written contract?", answer: "Yes, an invoice and a purchase order." }] },
  // Chrome's milestone pass 2 on bbcade40 (17 Nov 2026): its stories word for word (S3 is not: the site owner did not
  // have its text and asked for one with "I want $2,400 plus my costs"), with Chrome's own answers, and every AI step
  // answered by the real model's recorded output (harness/aiFixtures.ts, tests/browser/fixtures/real-ai/).
  ...CHROME_PASS_2,
  ...CHROME_PASS_3,
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
// The Forms tab offer (forms-offer) too: a fact is offered once, then never offered or asked again (site owner, 17 Nov;
// a SECOND offer of a fact counts as asked again, the first does not: askOnce.ts firstOfferExcused).
const OFFER_SURFACES = new Set(["sc-proposal", "story-proposal-row", "guided-form-from-story", "claim-kind", "parties-offer", "forms-offer"]);

function situationOf(story: Story): SituationAnswers {
  if (story.situation) return story.situation;
  if (story.side === "bringing") return { ...STARTING_NOTHING_FILED, court: story.court };
  return { where: "served", papers: "not-sure", receivedOn: story.served ?? "unknown", court: story.court };
}

/** The answer a person gives to a question, from what their story states; otherwise a plain value or "not sure". */
function answerFor(story: Story, shown: string): { value: string; fact: string | null } {
  // Chrome answered the question, not its "Why we ask" line (S1 reading r1: "address" in the why of "how long had the
  // floor been wet?" had the store's address typed as the answer). Chrome's stories only: the others' records stand.
  const text = story.realAi ? shown.split(/Why we ask/i)[0] : shown;
  const own = story.answers?.find((item) => item.match.test(text));
  if (own) return { value: own.value || TYPED_NOT_SURE, fact: own.fact ?? null };
  // Chrome's stories: only what Chrome gave and the story states; anything else "I do not know yet", never a made-up
  // value (a made-up date answered S8's "When was payment due?" with "March 3, 2026" and changed what the AI read next).
  if (story.realAi) {
    if (/how much|amount|dollar/i.test(text) && story.stated.amount) return { value: story.stated.amount, fact: "amount" };
    if (/\bwho\b|other (party|side)/i.test(text) && story.stated.otherParty) return { value: story.stated.otherParty, fact: "otherParty" };
    if (/bringing this claim|responding to a claim/i.test(text)) return { value: story.side === "bringing" ? "Bringing the claim (plaintiff)" : "Responding to a claim (defendant)", fact: "side" };
    return { value: TYPED_NOT_SURE, fact: null };
  }
  if (/add the year/i.test(text)) return { value: "October 6, 2026", fact: null };
  if (/how much|amount|dollar/i.test(text)) return story.amountLater ? { value: TYPED_NOT_SURE, fact: null } : { value: story.stated.amount ?? "1000", fact: "amount" };
  if (/\bwho\b|name of the (other|person|business)|other (party|side)|other person.s name|their name/i.test(text)) return { value: story.stated.otherParty ?? "Testperson Holdings", fact: "otherParty" };
  if (asksForDate(text)) return { value: story.stated.when && /\d{1,2}, \d{4}/.test(story.stated.when) ? story.stated.when : "March 3, 2026", fact: "whenHappened" };
  if (/bringing this claim|responding to a claim/i.test(text)) return { value: story.side === "bringing" ? "Bringing the claim (plaintiff)" : "Responding to a claim (defendant)", fact: "side" };
  if (/filed|served/i.test(text)) return { value: "No", fact: null };
  return { value: TYPED_NOT_SURE, fact: null };
}

/**
 * Chrome's milestone pass 2 findings, read from what the run saw on the real AI's recorded readings (the story's `seen`
 * notes). Each is a property: it fails only on the fault Chrome found, whatever the AI asked.
 */
function chromePass2Problems(story: Story, seen: readonly string[]): string[] {
  const problems: string[] = [];
  const note = (prefix: string) => seen.filter((line) => line.startsWith(prefix)).map((line) => line.slice(prefix.length));
  // F1: the court chosen at the start, the reading agreeing or unclear: never asked again.
  if (note("court-question: ").includes("shown")) problems.push("F1 the reading card asked where the case belongs after the court was chosen");
  // F4 (served): no question whether a defence was filed or anything happened since, once "just served" is given.
  for (const asked of note("home: ")) if (story.situation?.stage === "just-served" && /responded to the claim|submitted a defen[cs]e|further court papers/i.test(asked)) problems.push(`F4 asked again: ${asked.slice(0, 140)}`);
  // F2: the city given at the start offered for the person's own (bringing a Small Claims case: the Parties step on the review).
  const parties = note("parties-step: ").join(" ");
  // The story's own start city (S2 of pass 3 starts in Gatineau), never one city pinned for every story.
  const startCity = story.city ?? "Kingston";
  if (story.court === "small-claims" && story.side === "bringing" && parties && /City or town/.test(parties) && !parties.includes(`City or town: ${startCity}`)) problems.push(`F2 the city given at the start (${startCity}) was not offered on the Parties step`);
  // F3: an address typed as an answer about the other side offered for them.
  const typedAddress = note("home: ").find((line) => /=> \d+ [A-Z][\w ]+ (?:Road|Street|Crescent|Avenue)/.test(line));
  if (typedAddress && parties && !/Street address[^:]*: \d+ /.test(parties)) problems.push(`F3 the address typed as an answer was not offered: ${typedAddress.slice(0, 140)}`);
  // (a2), 22 Nov 2026: an amount the story states is never asked cold on the home page (S1 r1/r2 read "Total claim and
  // court status: $5,468.45; nothing filed", the row was dropped whole for its filing words, and the total went with it),
  // and once the start said nothing is filed the reading shows no filing status.
  if (story.stated.amount) for (const asked of note("home: ")) if (AMOUNT_HOME_QUESTIONS.some((question) => asked.split(" => ")[0].includes(question))) problems.push(`A2 the amount the story states was asked cold on the home page: ${asked.slice(0, 140)}`);
  const readingShown = note("home-reading: ").join(" ");
  if (/\b(?:court|filing|case|claim|lawsuit) status\b|\bnothing (?:has been )?filed\b|\bnot (?:yet )?filed\b/i.test(readingShown)) problems.push(`A2 the reading card shows the filing status: ${readingShown.slice(0, 160)}`);
  // F8: "No safety concerns" given, then the urgent question still names a safety worry.
  const safetyGiven = note("home: ").some((line) => /safety/i.test(line) && /=> No safety concerns/i.test(line));
  for (const urgent of note("urgent: ")) if (safetyGiven && /safety/i.test(urgent)) problems.push(`F8 asked about safety again: ${urgent.slice(0, 140)}`);
  // F9/F11: the review's Timeline (and Family's living situation) offered from what was given, never an empty box. Read on
  // the real AI's readings, where the review's offers are recorded (answerReview: review-offer); for a stand-in story no
  // offer is recorded, so an empty list says nothing about the box (18 Nov: the full run flagged 10 stand-in stories).
  const offers = note("review-offer: ").join(" | ");
  const reviewText = seen.find((line) => line.startsWith("review phase=")) ?? "";
  if (story.realAi && story.court !== "small-claims" && /Timeline/.test(reviewText) && /(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4})/.test(story.text) && !/Timeline/.test(offers)) problems.push("F9/F11 the review's Timeline was empty though the story gives a month and year");
  if (story.court === "family" && /Current living situation/.test(reviewText) && note("home: ").some((line) => /\blive\b/i.test(line) && !/=> I do not know yet/.test(line)) && !/Current living situation/.test(offers)) problems.push("F9 the review's Current living situation was empty though it was answered");
  // F6: when living together ended is known (the story's separation), its start may be "I'm not sure".
  for (const line of note("triage: cohabitation-dates ")) if (/ended-offered=true/.test(line) && /start-unsure=false/.test(line)) problems.push("F6 when living together started was required after the story gave when it ended");
  // F7: "a child together" asked cold after the story said "We have a 6-year-old".
  if (note("triage: ").includes("child-together asked cold") && /\bwe have (?:a|an|one|two|\d+)\b/i.test(story.text)) problems.push("F7 \"Do you and the other person have a child together?\" asked cold after \"We have a 6-year-old\"");
  // F10: a confirmed amount is never "Missing" on Form 7A.
  const principal = note("form-7A-principal: ")[0];
  if (principal !== undefined && story.stated.amount && !/\d/.test(principal)) problems.push(`F10 Form 7A's principal amount was "${principal}"`);
  return problems;
}

/**
 * Chrome's pass 3 findings on #550 (19 Nov 2026), read from what the run saw on the real AI's recorded readings. Each is
 * a property (it fails only on the fault Chrome found, whatever the AI asked), on every real-AI story it applies to:
 *   S1-12/S2-7 the Form 7A reasons box holds no answer the person gave as a fragment (an address, a name, "No", an
 *              amount): the story's own sentences only; a full-sentence answer may stand;
 *   S1-14      the case page's lost pay is never the medicine amount $18.45 (S1's story: $450 lost wages);
 *   S2-4       a company's name is never split into a first name ("First name: Lt");
 *   S2-5/S2-6  an answered Quebec address: the Parties step never offers Province ON, and offers the street typed;
 *   S7-3       "No safety concerns" given: the urgent question asks nothing about safety or a child moved away.
 */
function chromePass3Problems(story: Story, seen: readonly string[]): string[] {
  if (!story.realAi) return [];
  const problems: string[] = [];
  const note = (prefix: string) => seen.filter((line) => line.startsWith(prefix)).map((line) => line.slice(prefix.length));
  const answers = note("home: ").map((line) => line.split(" => ").slice(1).join(" => ").trim()).filter(Boolean);
  const sentence = (text: string) => text.split(/\s+/).length >= 4 && /\b(?:I|we|my|our|he|she|they|it|the)\b/i.test(text) && /\b(?:am|is|are|was|were|have|has|had|do|did|don't|know|want|paid|owe|agreed|hired|left|kept)\b/i.test(text);
  for (const reasons of note("form-7A-reasons: ")) {
    for (const answer of answers) if (answer !== "I do not know yet" && !sentence(answer) && !story.text.includes(answer) && reasons.includes(answer)) problems.push(`S1-12 the Form 7A reasons hold the answer "${answer}"`);
  }
  if (/\$18\.45/.test(story.text) && /\$450 lost wages/.test(story.text)) for (const line of note("lost-pay: ")) if (/\$18\.45/.test(line.split(/Costs you paid/)[0])) problems.push(`S1-14 lost pay shows the medicine amount: ${line.slice(0, 140)}`);
  const parties = note("parties-step: ").join(" ");
  if (/First name: (?:Lt|Ltée|Inc|Ltd)\b/.test(parties)) problems.push("S2-4 a company's name was split into a first name");
  const quebec = answers.find((answer) => /\b(?:Quebec|Québec|QC)\b/.test(answer));
  if (quebec && parties && /Province: ON\b/.test(parties)) problems.push(`S2-5 Province ON offered after the answer "${quebec}"`);
  const street = answers.map((answer) => /\b\d+ rue [^,]+/.exec(answer)?.[0]).find(Boolean);
  if (street && parties && /Defendant/.test(parties) && /Street address/.test(parties) && !parties.includes(street)) problems.push(`S2-6 the address typed as an answer ("${street}") was not offered on the Parties step`);
  const safetyGiven = note("home: ").some((line) => /=> No safety concerns/i.test(line));
  for (const urgent of note("urgent: ")) if (safetyGiven && /safety|move away|taken away|with a child/i.test(urgent)) problems.push(`S7-3 the urgent question asks the safety fact again: ${urgent.slice(0, 140)}`);
  return problems;
}

/**
 * The Family triage's other questions, answered as Chrome answered them (milestone pass 2, S7), each noted as it looked:
 * whether it was asked cold or offered from the story, and, for when living together started, whether "I'm not sure" was
 * there once when it ended was known (findings 6 and 7).
 */
async function answerTriageAsChrome(page: Page, story: Story, seen: string[]) {
  for (let round = 0; round < 8; round += 1) {
    const question = page.locator("[data-testid=triage-question]").first();
    if (!(await visible(question, 8_000))) break;
    const id = (await question.getAttribute("data-question")) ?? "";
    const offered = await page.getByTestId("triage-story-suggestion").isVisible().catch(() => false);
    if (id === "cohabitation-dates") {
      const ended = page.getByTestId("triage-cohabitation-end-yes");
      const endOffered = await ended.isVisible().catch(() => false);
      if (endOffered) await ended.click();
      const startUnsure = await visible(page.getByTestId("triage-cohabitation-start-unsure"), 3_000);
      seen.push(`triage: cohabitation-dates ended-offered=${endOffered} start-unsure=${startUnsure}`);
      // Chrome (case A) gave both: lived together 2018 to June 2026.
      await page.getByTestId("triage-cohabitation-start").fill("2018");
      if (!endOffered) await page.getByTestId("triage-cohabitation-end").fill("June 2026");
      await page.getByTestId("triage-dates-record").click();
    } else if (id === "child-together" || id === "case-involves-children") {
      seen.push(`triage: ${id} ${offered ? "offered from the story" : "asked cold"}`);
      if (offered) await page.getByTestId("triage-story-suggestion-yes").click();
      else await question.getByTestId("triage-answer-yes").click();
    } else {
      seen.push(`triage: ${id} (set aside)`);
      await question.getByTestId("triage-answer-not-yet").first().click().catch(() => {});
    }
    await page.waitForTimeout(800);
  }
}

/** What the home page's reading asked and what was answered (Chrome's answers), kept in the record for the report. */
const homeAnswers: string[] = [];
async function giveStory(page: Page, story: Story) {
  if (story.home || story.realAi) {
    // The home page, as Chrome used it: the start screen first (answered by the page's handler), the story, then the
    // reading's questions answered in their boxes and "Update with my answers", then the suggested court.
    await page.goto(`/?path=${story.court}`);
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill(story.city ?? "Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story.text);
    await page.getByRole("button", { name: `Continue to ${{ "small-claims": "Small Claims", family: "Family", civil: "Civil" }[story.court]} intake` }).click();
    const questions = page.getByTestId("case-understanding-questions");
    if (await visible(questions, 120_000)) {
      // Family: whether they were married is the triage's one question (factStatus.ts ASKED_BY_THE_INTAKE), never asked on
      // the home page beside it (Chrome milestone test of #550, row 45).
      if (story.court === "family") await expect(questions.getByLabel("Are you and your partner legally married?", { exact: true }), "married is asked once, by the triage").toHaveCount(0);
      for (const { question, answer } of story.home ?? []) {
        const box = questions.getByLabel(question, { exact: true });
        if (await box.isVisible().catch(() => false)) await box.fill(answer);
      }
      // The real reading's own questions, answered as Chrome answered them (answerFor: the story's answers first).
      if (story.realAi) for (const box of await questions.getByRole("textbox").all()) {
        const label = (await box.evaluate((node) => (node as HTMLTextAreaElement).labels?.[0]?.textContent ?? node.getAttribute("aria-label") ?? "")) ?? "";
        const { value } = answerFor(story, label);
        if (!(await box.inputValue()).trim()) await box.fill(value);
        homeAnswers.push(`home: ${label.replace(/\s+/g, " ").trim()} => ${value}`);
      }
      await page.getByTestId("case-understanding-update").click().catch(() => {});
      await expect(questions).toHaveCount(0, { timeout: 120_000 }).catch(() => {});
    }
    // (a2): what the reading card shows, for the check that it states no filing status (chromePass3Problems A2).
    if (story.realAi) homeAnswers.push(`home-reading: ${((await page.getByTestId("case-understanding-facts").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim()}`);
    // The court was chosen at the start (situationOf: every story's start names its court): the reading's same court is
    // not asked again with Yes / No / I'm not sure (Chrome milestone test of #550, row 6, every story).
    await expect(page.getByTestId("case-understanding").getByRole("button", { name: /^(No, that.s not right|I.m not sure)$/ }), "the court chosen at the start is not asked again").toHaveCount(0);
    // The reading's court is the chosen one ("Continue with ..."), or, when the reading is not clear, the chosen court's own button.
    if (story.realAi) homeAnswers.push(`court-question: ${(await page.getByTestId("case-understanding-court-question").isVisible().catch(() => false)) ? "shown" : "hidden"}`);
    await page.getByTestId("case-understanding-continue-suggested").or(page.getByTestId("case-understanding-continue-chosen")).first().click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 90_000 });
  } else if (story.court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill(story.city ?? "Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story.text);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 90_000 });
  } else {
    await openBuilder(page, story.court, { city: story.city ?? "Kingston", story: story.text, situation: situationOf(story) });
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
    // The chat is over once the review has opened (it is on the page while collecting too: only its open phases count).
    if (/^(?:reviewing|user-confirmed)$/.test((await page.getByTestId("intake-review").getAttribute("data-phase").catch(() => null)) ?? "")) break;
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
    /*
     * The answer goes into the box named by the shown question's id, never "the last box on the page" (site owner,
     * 19 Nov 2026: S4 reading r2 typed "Test Neighbour" into "Review: City" once the review had opened). A shown
     * question with no box of its own means the chat has ended: nothing is typed, and the page checks below decide.
     */
    const askedId = await question.getAttribute("data-question-id");
    expect(askedId, `the chat's question carries its id: ${text.slice(0, 120)}`).toBeTruthy();
    const box = page.locator(`[data-testid=guided-answer][data-question-id="${askedId}"]`);
    if (!(await visible(box, 10_000))) {
      // No box for the shown question: only an ended chat may show none (finished, or the review open). Anything else
      // is a chat that stopped asking with a question on screen, and nothing is typed anywhere else.
      const phase = (await page.getByTestId("intake-review").getAttribute("data-phase").catch(() => null)) ?? "";
      const ended = (await finished.isVisible().catch(() => false)) || /^(?:reviewing|user-confirmed)$/.test(phase);
      expect(ended, `the chat shows "${text.slice(0, 120)}" with no answer box of its own, and has not ended`).toBe(true);
      break;
    }
    await box.fill(value);
    await box.locator("xpath=..").getByRole("button", { name: "Send", exact: true }).click();
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
    if (story.realAi && key === "urgent") homeAnswers.push(`urgent: ${label}`);
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
  await answerTriage(married, answer);
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
  // Chrome's milestone pass 2: what the review and the Parties step offer, read before anything is answered.
  if (phase === "reviewing" && story.realAi) {
    for (const entry of await panel.locator("[data-testid=intake-entry]").all()) {
      const offered = entry.getByTestId("intake-entry-from-story");
      if (await offered.isVisible().catch(() => false)) seen.push(`review-offer: ${((await entry.innerText()).replace(/\s+/g, " ")).slice(0, 300)}`);
    }
    const parties = page.getByTestId("parties-step").first();
    if (await parties.isVisible().catch(() => false)) seen.push(`parties-step: ${(await parties.innerText()).replace(/\s+/g, " ").slice(0, 3000)}`);
  }
  // Chrome answered every offer on the review Yes (milestone pass 2): the real-AI stories do the same.
  if (phase === "reviewing" && story.realAi) for (let round = 0; round < 20; round += 1) {
    const offer = panel.locator("[data-testid=review-offer-choices]").filter({ has: page.locator("button:not([aria-pressed=true])") }).first();
    const yes = offer.getByRole("button").first();
    if (!(await yes.isVisible().catch(() => false)) || !/^Yes/.test((await yes.innerText()).trim())) break;
    await yes.click();
    await page.waitForTimeout(500);
  }
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
async function checkFilledForms(page: Page, caseId: string, seen: string[], story: Story) {
  const form7A = await filledForm(page, caseId, "small-claims/7A");
  seen.push(`form 7A: ${JSON.stringify(Object.fromEntries([...form7A].filter(([, value]) => value && value !== "Off")))}`.slice(0, 2000));
  // Chrome milestone S5 gives only the other party and the amount ("I lent my friend Alex $3,000"): Defendant No. 1 is
  // Alex and the amount 3,000.00 (site owner, 17 Nov). Every other check is Chrome forms story, unchanged.
  // Chrome's run 1 on #561 (23 Nov 2026), the values Chrome saw on its filled Form 7A (1.15), here reached from the story's
  // offers taken with Yes, never typed: the plaintiff TEST Tess Plaintiff, the defendant the company, both in Ottawa, $5,468.45.
  if (story.name === "sc-chrome561-kitchen") {
    expect(form7A.get("Plaintiff's last name or the company's name"), "Form 7A: the plaintiff's last name").toBe("Plaintiff");
    expect(form7A.get("First name of the Plaintiff"), "Form 7A: the plaintiff's first name").toBe("TEST Tess");
    expect(form7A.get("Defendant's last name or company's name"), "Form 7A: Defendant No. 1 is the company").toBe("TEST Fakebuild Contracting Inc.");
    expect(form7A.get("Principal amount claimed"), "Form 7A: the amount the case holds").toBe("5,468.45");
    return;
  }
  if (story.name === "sc-milestone-s5-loan") {
    expect(form7A.get("Defendant's first name"), "Form 7A: Defendant No. 1 is Alex").toBe("Alex");
    expect(form7A.get("Principal amount claimed"), "Form 7A: the amount the case holds").toBe("3,000.00");
    return;
  }
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
    // Chrome pass 3, S1-14: the case page's "Lost pay" row, read whole (it can sit past the note's first 2500 characters).
    if (story.realAi && screen === "case page") for (const line of ((await page.locator("body").innerText().catch(() => "")).match(/Lost pay[^\n]*(?:\n[^\n]*)?/g) ?? [])) seen.push(`lost-pay: ${line.replace(/\s+/g, " ")}`);
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

// A story read by the real AI runs once per recorded reading (harness/aiFixtures.ts): the model does not read the same
// story the same way every time, so each distinct reading must give a flow that asks nothing twice (site owner, 17 Nov).
// Named "sc-" so CI's Small Claims ask-once part runs it (its grep is "ask once on every page -- sc-"); it covers every court.
test("ask once on every page -- sc-chrome2-readings-recorded (every court)", () => {
  const missing = STORIES.filter((story) => story.realAi && realAiReadings(story.name).length === 0).map((story) => story.name);
  expect(missing, "record them with AI_FIXTURES=record").toEqual([]);
});
for (const story of STORIES) for (const reading of story.realAi ? realAiReadings(story.name) : [null]) {
  test(`ask once on every page -- ${story.name}${reading ? ` (reading ${reading})` : ""}`, async ({ page }) => {
    test.setTimeout(900_000);
    const found: Violation[] = [];
    const chrome2: string[] = [];
    replayMisses.length = 0;
    const typed = new Map<string, string>();
    const seen: string[] = [];
    const userId = await authenticateRealTestUser(page, { realCases: true });
    await expectThisRunsServer(page);
    let reached = "start";
    // The question log (one asker, 23 Nov 2026): every question shown, written for every story, signed in.
    let events: Asked[] = [];
    let log: ReturnType<typeof writeQuestionLog> | null = null;
    try {
      await autoAnswerSituation(page, situationOf(story));
      await serveModelStandIns(page, story.court, userId, story.realAi && reading ? { realAi: `${story.name}/${reading}` } : story.home ? { homeQuestions: story.home.map((item) => item.question), homeFacts: story.reading ?? [] } : {});
      events = await recordAsks(page);
      await giveStory(page, story);
      reached = "story";
      seen.push(...homeAnswers.splice(0));
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
      if (story.realAi && story.court === "family") await answerTriageAsChrome(page, story, seen);
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
      if (story.parties) await checkFilledForms(page, id, seen, story);
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
      if (story.realAi && story.court === "small-claims" && story.side === "bringing") {
        const form7A = await filledForm(page, id, "small-claims/7A").catch(() => null);
        seen.push(`form-7A-principal: ${form7A ? String(form7A.get("Principal amount claimed") ?? "") : "not downloaded"}`);
        // Chrome pass 3, S1-12 and S2-7: the reasons box, whole (both of its fields).
        if (form7A) seen.push(`form-7A-reasons: ${`${form7A.get("Reasons for claim and details") ?? ""} ${form7A.get("Reasons for claim and details_continued") ?? ""}`.replace(/\s+/g, " ").trim()}`);
      }
      seen.push(...homeAnswers.splice(0));
      chrome2.push(...chromePass2Problems(story, seen), ...chromePass3Problems(story, seen));
      const situation = situationOf(story);
      for (const violation of [...repeatViolations(factsAskedTwice(events, situation)), ...heldViolations(events)].filter((item) => !firstOfferExcused(item, events, OFFER_SURFACES))) {
        found.push({ story: story.name, court: story.court, side: story.side, kind: "asked-twice", fact: violation.fact, screen: `${violation.surface}@${violation.screen}`, detail: violation.text.slice(0, 120) });
      }
      const stated = new Set(known);
      for (const fact of typed.keys()) if (!Object.keys(story.stated).includes(fact === "whenHappened" ? "when" : fact)) stated.delete(fact);
      const coldSeen = new Set<string>();
      // An offer from the story ("From what you told us") is the one allowed confirmation, on any surface.
      for (const ask of events.filter((item) => item.kind === "ask" && item.surface !== "situation" && !OFFER_SURFACES.has(item.surface) && !/From what you told us|from your story|No, that.s not right/i.test(item.text))) {
        for (const fact of factsOfAsk(ask)) {
          const key = `${fact}|${ask.surface}|${ask.id}`;
          if (stated.has(fact) && !coldSeen.has(key)) {
            coldSeen.add(key);
            found.push({ story: story.name, court: story.court, side: story.side, kind: "stated-cold", fact, screen: `${ask.surface}@${ask.screen}`, detail: ask.text.slice(0, 120) });
          }
        }
      }
    } finally {
      log = writeQuestionLog(`${story.name}${reading ? `.${reading}` : ""}.signed-in`, `${story.name}${reading ? ` (reading ${reading})` : ""}, ${story.court}, signed in`, events);
      fs.mkdirSync(RECORDS, { recursive: true });
      fs.writeFileSync(path.join(RECORDS, `${story.name}${reading ? `.${reading}` : ""}.json`), JSON.stringify({ story: story.name, reading, court: story.court, side: story.side, reached, violations: found, seen }, null, 2));
      await deleteHarnessUser(userId).catch(() => {});
    }
    const known = found.filter((item) => expectedFor(item));
    const unexpected = found.filter((item) => !expectedFor(item));
    const fixed = EXPECTED.filter((entry) => entry.story === story.name && !found.some((item) => keyOf(item) === keyOf(entry)));
    console.log(`ASK ONCE ${story.name}${reading ? ` (${reading})` : ""}: reached ${reached}; ${found.length} violation(s), ${known.length} on the expected list, ${unexpected.length} not`);
    for (const entry of fixed) console.log(`ASK ONCE FIXED ${keyOf(entry)}: no longer seen; delete its entry`);
    // Chrome's #561 run (the one asker): its question log is held to zero, every question naming its fact (fail closed).
    if (story.name.endsWith("chrome561-kitchen") && log && process.env.QUESTION_LOG_ONLY !== "1") {
      expect(log.held, "no question asked while the record held its fact").toEqual([]);
      expect(log.twice, "no fact shown twice").toEqual([]);
      expect(log.noFact, "every question names its fact (fail closed)").toEqual([]);
    }
    if (!REPORT) {
      expect(reached, "the story reached every page (a page not reached is not a zero)").toBe("all pages");
      expect(unexpected, unexpected.map((item) => `${item.kind} ${item.fact} @ ${item.screen}: ${item.detail}`).join("\n")).toEqual([]);
      expect(chrome2, "Chrome's pass 2 and pass 3 findings, on the real AI's recorded readings").toEqual([]);
      // Every AI step replayed as recorded: the site swallows a failed step, so a miss would otherwise pass silently.
      if (story.realAi) expect(replayMisses, "every AI step of this reading was recorded").toEqual([]);
    }
  });
}
