/**
 * 10 fabricated, full-length Small Claims fixtures built to exercise
 * breadth this repo's existing 3 fixtures (unpaidInvoiceClean/Gap,
 * overLimitContract) and the 50-story generated batch (generateStories.ts)
 * do NOT cover: the defendant-side question branch, the post-filing
 * date/deadline-computation branch (Decision 5's seven date questions,
 * never exercised end-to-end by any committed fixture before this one),
 * the injury/municipal-notice branch (sc-date-injury), and an internally
 * inconsistent story built to test contradiction detection rather than
 * claim-type matching.
 *
 * All parties, businesses, dates, dollar amounts and documents are
 * invented, same convention as every other fixture in this directory.
 * Every answer set is built from `baseCaseReviewAnswers()` so a question
 * the story doesn't anticipate still has a safe default rather than
 * throwing mid-run (pipelineRunner.ts throws if the real orchestrator asks
 * something with no answer on file).
 *
 * These are read by scripts/verification/runCaseReviews.ts, NOT by
 * runFixtures.ts -- they don't have .expected.md files and aren't meant
 * to replace the 3 pinned regression fixtures. Their purpose is a full,
 * itemized, human-readable case review per story (opening story, every
 * document itemized, the full question/answer transcript, and the
 * complete final AnalysisResult), for manual audit -- not automated
 * pass/fail.
 */

import type { Fixture } from "../fixtureTypes";
import { baseCaseReviewAnswers } from "./caseReviewDefaults";

// ---------------------------------------------------------------------------
// 1. Non-payment for goods sold -- plaintiff, straightforward, complete evidence.
export const nonPaymentGoodsSoldFixture: Fixture = {
  id: "non-payment-goods-sold",
  title: "Sold custom furniture, buyer never paid (plaintiff, clean)",
  story:
    "I build custom furniture out of my garage workshop. In February a customer, Renata Fields, " +
    "ordered a solid-oak dining table and six chairs for $6,200, agreed by email. I delivered the " +
    "finished set to her house on May 2, 2026, and she signed a delivery confirmation. The invoice " +
    "was due within 10 days of delivery. She has not paid me anything and stopped replying to my " +
    "emails after the first week. I have not filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "order-email-thread.pdf",
      type: "PDF (email export)",
      description: "Email thread from February 2026 where Renata Fields agreed to the $6,200 price and specifications.",
    },
    {
      filename: "delivery-confirmation-signed.pdf",
      type: "PDF",
      description: "Delivery confirmation slip signed by Renata Fields on May 2, 2026, acknowledging receipt of the full set.",
    },
    {
      filename: "invoice-2026-may.pdf",
      type: "PDF",
      description: "Invoice dated May 2, 2026, for $6,200, due May 12, 2026.",
    },
    {
      filename: "followup-emails.pdf",
      type: "PDF (email export)",
      description: "Two follow-up emails, May 15 and May 29, 2026, asking for payment; no reply to either.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The furniture was delivered on May 2, 2026, with payment due 10 days later.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Unpaid money owed to you",
    "sc-amount-claimed": "$6,200",
    "sc-evidence-available":
      "I have four things: (1) order-email-thread.pdf, the email thread where she agreed to the $6,200 price; " +
      "(2) delivery-confirmation-signed.pdf, the delivery slip she signed on May 2, 2026; " +
      "(3) invoice-2026-may.pdf, the invoice for $6,200 due May 12, 2026; " +
      "(4) followup-emails.pdf, two follow-up emails from May 15 and May 29, 2026 that went unanswered.",
    "sc-remedy-sought": "I want the court to order Renata Fields to pay the full $6,200, plus my court costs.",
  }),
  location: { province: "Ontario", city: "Kingston" },
};

// ---------------------------------------------------------------------------
// 2. Breach of contract -- goods, deliberate evidence gap (verbal order only).
export const breachContractGoodsGapFixture: Fixture = {
  id: "breach-contract-goods-gap",
  title: "Custom cabinets built to the wrong dimensions (plaintiff, evidence gap)",
  story:
    "I hired a cabinet maker, Thornbury Millwork, to build custom kitchen cabinets for a $9,800 " +
    "renovation. We agreed on everything over two phone calls in January -- there was never anything " +
    "in writing, it was all verbal. They delivered and installed the cabinets on April 3, 2026, but " +
    "the upper cabinets are four inches shorter than the height we discussed, so there's a gap to the " +
    "ceiling that looks unfinished and doesn't match the rest of the kitchen. I paid a $4,900 deposit " +
    "up front by e-transfer. I want the balance refunded or the cabinets fixed at their cost. I " +
    "haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "etransfer-deposit-receipt.pdf",
      type: "PDF",
      description: "E-transfer confirmation showing the $4,900 deposit sent to Thornbury Millwork on January 20, 2026.",
    },
    {
      filename: "cabinet-photos.jpg",
      type: "JPG",
      description: "Photos of the installed cabinets on April 3, 2026, showing the gap between the uppers and the ceiling.",
    },
    {
      filename: "text-messages-complaint.pdf",
      type: "PDF (text export)",
      description: "Text messages from April 4-10, 2026, where I raised the height problem and they disputed the measurements agreed to.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The cabinets were installed on April 3, 2026, and the problem was noticed the same day.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "A contract or agreement dispute",
    "sc-amount-claimed": "$4,900",
    "sc-evidence-available":
      "I have three things: (1) etransfer-deposit-receipt.pdf, the e-transfer confirmation for the $4,900 deposit sent " +
      "January 20, 2026; (2) cabinet-photos.jpg, photos of the installed cabinets showing the gap; (3) text-messages-complaint.pdf, " +
      "texts from April 4-10, 2026, where I raised the problem and they disputed what was agreed. I don't have anything in writing " +
      "showing the original agreed dimensions -- it was all discussed on two phone calls.",
    "sc-remedy-sought": "I want the court to order Thornbury Millwork to refund my $4,900 deposit, or pay to fix the cabinets to the agreed height.",
  }),
  location: { province: "Ontario", city: "Barrie" },
};

// ---------------------------------------------------------------------------
// 3. Dog bite -- plaintiff, private dog owner, injury date question.
export const dogBiteInjuryFixture: Fixture = {
  id: "dog-bite-injury",
  title: "Bitten by a neighbour's dog while walking (plaintiff, injury)",
  story:
    "On June 14, 2026, I was walking on the public sidewalk in front of my neighbour's house when " +
    "their dog got loose from the yard and bit my left forearm. I went to urgent care the same day " +
    "and needed four stitches. I know the dog and its owner, Marcus Delray -- it's his dog, and he " +
    "was outside when it happened. I want him to pay for my medical costs and the clothing that was " +
    "damaged. I haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "urgent-care-record.pdf",
      type: "PDF",
      description: "Urgent care visit record from June 14, 2026, describing the bite wound and four stitches.",
    },
    {
      filename: "bite-photo.jpg",
      type: "JPG",
      description: "Photo of the bite wound taken the same day, before stitches.",
    },
    {
      filename: "medical-bill.pdf",
      type: "PDF",
      description: "Itemized bill for the urgent care visit and follow-up, totalling $740.",
    },
    {
      filename: "text-from-owner.pdf",
      type: "PDF (text export)",
      description: "Text messages from Marcus Delray the same evening acknowledging it was his dog and that it got loose.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The bite happened on June 14, 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "A slip, a fall, or another injury",
    "sc-amount-claimed": "$1,200, covering my medical costs and the damaged clothing.",
    "sc-date-injury": "The injury happened on June 14, 2026.",
    "sc-evidence-available":
      "I have four things: (1) urgent-care-record.pdf, the June 14, 2026 urgent care record describing the wound and stitches; " +
      "(2) bite-photo.jpg, a photo of the wound taken the same day; (3) medical-bill.pdf, an itemized bill totalling $740; " +
      "(4) text-from-owner.pdf, texts from the dog's owner the same evening admitting it was his dog and that it got loose.",
    "sc-remedy-sought": "I want the court to order Marcus Delray to pay $1,200 to cover my medical costs and the damaged clothing.",
  }),
  location: { province: "Ontario", city: "Sudbury" },
};

// ---------------------------------------------------------------------------
// 4. Slip and fall -- municipal sidewalk, the 10-day-notice fact pattern the
// sc-date-injury question was added specifically to cover.
export const slipAndFallMunicipalFixture: Fixture = {
  id: "slip-and-fall-municipal",
  title: "Fell on an uncleared icy public sidewalk owned by the city (plaintiff, injury, municipal)",
  story:
    "On January 9, 2026, I slipped and fell on a public sidewalk on Bank Street in Ottawa that hadn't " +
    "been salted or cleared after an ice storm two days earlier. I broke my wrist and needed a cast " +
    "for six weeks. The sidewalk is city property, not in front of any specific business. I called " +
    "the city's 311 line the same week to report the fall. I haven't filed anything with the court " +
    "yet and I'm not sure what else I need to do.",
  evidenceItems: [
    {
      filename: "er-record.pdf",
      type: "PDF",
      description: "Emergency room record from January 9, 2026, diagnosing a fractured wrist and documenting the fall.",
    },
    {
      filename: "fall-scene-photos.jpg",
      type: "JPG",
      description: "Photos taken shortly after the fall showing the icy, unsalted sidewalk condition.",
    },
    {
      filename: "311-call-reference.pdf",
      type: "PDF",
      description: "Confirmation email with a reference number for the 311 call reporting the fall, made January 13, 2026.",
    },
    {
      filename: "physio-invoices.pdf",
      type: "PDF",
      description: "Invoices for six weeks of physiotherapy following the cast removal, totalling $1,850.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The fall happened on January 9, 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "A slip, a fall, or another injury",
    "sc-amount-claimed": "$4,500, covering medical costs, physiotherapy, and time missed from work.",
    "sc-date-injury": "The fall happened on January 9, 2026.",
    "sc-evidence-available":
      "I have four things: (1) er-record.pdf, the January 9, 2026 emergency room record diagnosing a fractured wrist; " +
      "(2) fall-scene-photos.jpg, photos of the icy sidewalk taken shortly after the fall; (3) 311-call-reference.pdf, " +
      "confirmation of a 311 call reporting the fall on January 13, 2026; (4) physio-invoices.pdf, physiotherapy invoices " +
      "totalling $1,850.",
    "sc-remedy-sought": "I want the court to order the City of Ottawa to pay $4,500 for my medical costs, physiotherapy, and lost wages.",
  }),
  location: { province: "Ontario", city: "Ottawa" },
};

// ---------------------------------------------------------------------------
// 5. Contractor damage -- plaintiff, water damage during a renovation.
export const contractorPropertyDamageFixture: Fixture = {
  id: "contractor-property-damage",
  title: "Contractor's plumbing work flooded the basement (plaintiff, property damage)",
  story:
    "I hired a contractor, Deep River Plumbing, to replace a bathroom sink and connect a new water " +
    "line, agreed in writing for $1,400. On May 20, 2026, while doing the work, they left a fitting " +
    "loose overnight and it flooded my basement, damaging the flooring and drywall. I paid a " +
    "restoration company $6,300 to fix the water damage. Deep River Plumbing admitted over text that " +
    "the fitting was theirs but says they're not responsible for the flood damage, only the original " +
    "sink job. I haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "plumbing-contract.pdf",
      type: "PDF",
      description: "Signed contract for the $1,400 sink replacement and water line work, dated May 15, 2026.",
    },
    {
      filename: "flood-damage-photos.jpg",
      type: "JPG",
      description: "Photos of the flooded basement taken the morning of May 21, 2026.",
    },
    {
      filename: "restoration-invoice.pdf",
      type: "PDF",
      description: "Invoice from the restoration company for $6,300, covering flooring and drywall repair.",
    },
    {
      filename: "admission-text.pdf",
      type: "PDF (text export)",
      description: "Text from Deep River Plumbing's owner admitting the loose fitting was theirs, but disputing responsibility for the flood.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The flooding happened overnight on May 20-21, 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Property damage",
    "sc-amount-claimed": "$6,300",
    "sc-evidence-available":
      "I have four things: (1) plumbing-contract.pdf, the signed $1,400 contract dated May 15, 2026; (2) flood-damage-photos.jpg, " +
      "photos of the flooded basement from May 21, 2026; (3) restoration-invoice.pdf, the $6,300 restoration invoice; " +
      "(4) admission-text.pdf, a text where the contractor admits the loose fitting was theirs.",
    "sc-remedy-sought": "I want the court to order Deep River Plumbing to pay the $6,300 restoration cost.",
  }),
  location: { province: "Ontario", city: "Windsor" },
};

// ---------------------------------------------------------------------------
// 6. Improper towing -- plaintiff, vehicle towed without consent.
export const improperTowingFixture: Fixture = {
  id: "improper-towing",
  title: "Car towed from a private lot without consent (plaintiff, vehicle dispute)",
  story:
    "On July 3, 2026, my car was towed from the parking lot of the apartment building where I live " +
    "by a company called Rapid Fleet Towing. I have a valid parking pass for that spot and was not " +
    "given any warning. It cost me $410 to get my car back, and the tow company never gave me an " +
    "itemized receipt showing their rates, only a handwritten total. I have my building's parking " +
    "pass showing I was authorized to park there. I haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "parking-pass.pdf",
      type: "PDF",
      description: "Photo of the valid resident parking pass for the spot, issued by the building management in January 2026.",
    },
    {
      filename: "handwritten-tow-receipt.jpg",
      type: "JPG",
      description: "The handwritten receipt for $410 given at the tow yard, with no rate breakdown.",
    },
    {
      filename: "building-manager-email.pdf",
      type: "PDF (email export)",
      description: "Email from the building manager confirming no tow was authorized for that spot on July 3, 2026.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The tow happened on July 3, 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "A vehicle-related dispute",
    "sc-amount-claimed": "$410",
    "sc-evidence-available":
      "I have three things: (1) parking-pass.pdf, my valid resident parking pass from January 2026; (2) handwritten-tow-receipt.jpg, " +
      "the $410 receipt with no rate breakdown; (3) building-manager-email.pdf, an email from the building manager confirming no tow " +
      "was authorized for that spot.",
    "sc-remedy-sought": "I want the court to order Rapid Fleet Towing to refund the $410 I paid to get my car back.",
  }),
  location: { province: "Ontario", city: "London" },
};

// ---------------------------------------------------------------------------
// 7. Used vehicle non-disclosure, over the Small Claims limit -- second
// over-limit fact pattern (different claim type than the existing
// overLimitContract.fixture.ts) so the warning is verified against a second
// signal phrase, not just "unpaid invoice" again.
export const usedVehicleOverLimitFixture: Fixture = {
  id: "used-vehicle-overlimit",
  title: "Used vehicle sold with undisclosed accident damage, amount over the court's limit (plaintiff, wrong forum)",
  story:
    "In March 2026 I bought a used vehicle privately from a seller, Priya Nandakumar, for $54,000. " +
    "She told me it had never been in an accident. Two months later my mechanic found evidence of " +
    "significant prior collision repair hidden under the paint, which I believe she knew about and " +
    "didn't disclose. I had it independently appraised and the car is worth at least $18,000 less " +
    "than what I paid because of the undisclosed damage. I'm claiming the full $54,000 purchase " +
    "price back since I wouldn't have bought it at all had I known. I haven't filed anything with " +
    "the court yet.",
  evidenceItems: [
    {
      filename: "bill-of-sale.pdf",
      type: "PDF",
      description: "Signed bill of sale for $54,000, dated March 8, 2026, with the seller's written statement of no prior accidents.",
    },
    {
      filename: "mechanic-inspection-report.pdf",
      type: "PDF",
      description: "Independent mechanic's report from May 2026 documenting hidden collision repair.",
    },
    {
      filename: "appraisal-report.pdf",
      type: "PDF",
      description: "Independent appraisal valuing the car $18,000 lower due to the undisclosed damage.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "I bought the car on March 8, 2026, and found the undisclosed damage in May 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "A consumer purchase problem",
    "sc-amount-claimed": "$54,000",
    "sc-evidence-available":
      "I have three things: (1) bill-of-sale.pdf, the signed $54,000 bill of sale with her written no-accidents statement; " +
      "(2) mechanic-inspection-report.pdf, the mechanic's May 2026 report finding hidden collision repair; (3) appraisal-report.pdf, " +
      "an independent appraisal valuing the car $18,000 lower.",
    "sc-remedy-sought": "I want the court to order Priya Nandakumar to refund the full $54,000 purchase price.",
  }),
  location: { province: "Ontario", city: "Hamilton" },
};

// ---------------------------------------------------------------------------
// 8. Defendant responding to a claim for non-payment of goods -- the branch
// no existing committed fixture exercises: role "defendant", claim already
// filed and served, defence not yet filed, partial admission with a
// payment-terms request (sc-defendant-admission-payment).
export const defendantRespondingGoodsSoldFixture: Fixture = {
  id: "defendant-responding-goods-sold",
  title: "Served with a claim for unpaid furniture, partly disputes the amount (defendant)",
  story:
    "I was served with a Plaintiff's Claim on June 2, 2026, from a furniture maker, Aldric Woodworks, " +
    "saying I owe $6,200 for a dining set. I did order the set and I do owe something, but the price " +
    "we agreed on was $5,100, not $6,200 -- the extra amount was for an upgraded finish I never asked " +
    "for and told them I didn't want. I'm willing to pay the $5,100 I actually agreed to, but I can't " +
    "pay it all at once and would need a few months to pay it off. I haven't filed a defence yet.",
  evidenceItems: [
    {
      filename: "claim-received.pdf",
      type: "PDF",
      description: "Copy of the Plaintiff's Claim served on me June 2, 2026, claiming $6,200.",
    },
    {
      filename: "original-order-email.pdf",
      type: "PDF (email export)",
      description: "My original order email from January 2026 confirming the agreed $5,100 price for the standard finish.",
    },
    {
      filename: "finish-decline-text.pdf",
      type: "PDF (text export)",
      description: "Text message where I explicitly told Aldric Woodworks I did not want the upgraded finish.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "I was served with the claim on June 2, 2026.",
    "sc-orient-role": "Responding to a claim (defendant)",
    "sc-orient-dispute-category": "Unpaid money owed to you",
    // Gated to role == "plaintiff" and shouldn't fire for a defendant story, but
    // answered defensively in case an early-turn extraction hasn't settled role
    // yet when the orchestrator evaluates the gate -- the harness throws on any
    // asked question with no answer on file, and a wrong-branch throw here would
    // stop the whole case-review run for one avoidable reason.
    "sc-amount-claimed": "Not applicable to me directly -- I'm responding to the amount claimed against me, not claiming an amount myself.",
    "sc-evidence-available": "Not applicable to me directly -- see my response evidence below instead.",
    "sc-remedy-sought": "Not applicable to me directly -- I'm responding to a claim, not seeking a remedy of my own beyond correcting the amount.",
    "sc-claim-filed": "Not applicable to me directly -- the plaintiff filed the claim against me.",
    "sc-defendant-served": "Not applicable to me directly -- I'm the one who was served.",
    "sc-defence-filed": "No, I haven't filed a defence yet.",
    "sc-defence-time-elapsed": "No, it hasn't been 20 days since I was served.",
    "sc-defendant-claim-received":
      "I received the Plaintiff's Claim on June 2, 2026, along with a blank Defence form.",
    "sc-defendant-response-facts":
      "I agree I ordered the dining set and owe something for it. I disagree with the amount -- we agreed on $5,100 for " +
      "the standard finish, and the $6,200 includes an upgraded finish I told them I didn't want.",
    "sc-defendant-response-evidence":
      "I have my original order email confirming the $5,100 price, and a text message where I told them I didn't want " +
      "the upgraded finish.",
    "sc-defendant-outcome":
      "I'm only responding to their claim -- I'm not asking for anything beyond having the amount corrected to $5,100.",
    "sc-defendant-service-method": "The claim was handed to me in person by a process server on June 2, 2026.",
    "sc-defendant-counterclaim": "No, I don't believe they owe me anything and I haven't started my own claim.",
    "sc-defendant-admission-payment":
      "Yes, I accept I owe $5,100 for the standard finish. The difficulty is being able to pay it all at once -- " +
      "I would need a few months to pay it off.",
    "sc-date-claim-served": "I was served on June 2, 2026.",
  }),
  location: { province: "Ontario", city: "Toronto" },
};

// ---------------------------------------------------------------------------
// 9. Post-filing plaintiff -- claim filed, served, defence filed, settlement
// conference scheduled. The branch Decision 5's seven date questions exist
// for but that no committed fixture (all three were pre-filing) has ever
// exercised end to end with REAL dates, not "not applicable" answers.
export const plaintiffPostFilingDeadlinesFixture: Fixture = {
  id: "plaintiff-post-filing-deadlines",
  title: "Unpaid consulting fee, claim already filed and defended, settlement conference scheduled (plaintiff, post-filing)",
  story:
    "I'm a freelance IT consultant. A client, Northshore Logistics, didn't pay a $12,500 invoice for " +
    "a network migration I completed on February 2, 2026. After months of no payment I filed a " +
    "Plaintiff's Claim, which was issued by the court on May 4, 2026. I had it served on Northshore " +
    "Logistics on May 11, 2026, by a process server, and I have the Affidavit of Service. They filed " +
    "a Defence on May 28, 2026, disputing that the migration was completed to specification. A " +
    "settlement conference has now been scheduled for September 15, 2026.",
  evidenceItems: [
    {
      filename: "plaintiffs-claim-issued.pdf",
      type: "PDF",
      description: "Plaintiff's Claim (Form 7A) as issued by the court, dated May 4, 2026.",
    },
    {
      filename: "affidavit-of-service.pdf",
      type: "PDF",
      description: "Affidavit of Service (Form 8A) confirming service on Northshore Logistics on May 11, 2026.",
    },
    {
      filename: "defence-received.pdf",
      type: "PDF",
      description: "Copy of the Defence filed by Northshore Logistics on May 28, 2026, disputing completion of the work.",
    },
    {
      filename: "settlement-conference-notice.pdf",
      type: "PDF",
      description: "Court notice scheduling the settlement conference for September 15, 2026.",
    },
    {
      filename: "migration-completion-report.pdf",
      type: "PDF",
      description: "My completion report and sign-off checklist for the network migration, dated February 2, 2026.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The migration was completed February 2, 2026; the claim was issued May 4, 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Work done or services provided (e.g. a contractor)",
    "sc-amount-claimed": "$12,500",
    "sc-claim-filed": "Yes, the Plaintiff's Claim was issued by the court on May 4, 2026.",
    "sc-defendant-served":
      "Yes, Northshore Logistics was served on May 11, 2026, by a process server, and I have the Affidavit of Service.",
    "sc-defence-filed": "Yes, they filed a Defence on May 28, 2026.",
    "sc-defence-time-elapsed": "Yes, well over 20 days have passed since service.",
    "sc-defendant-noted-in-default": "Not applicable -- a Defence was filed.",
    "sc-contractor-completion-date":
      "The agreed completion date was February 2, 2026, when I finished the migration and delivered the sign-off report.",
    "sc-contractor-notice-before-replacement":
      "Not applicable -- I completed the work myself; no one else needed to finish it.",
    "sc-evidence-available":
      "I have five things: (1) plaintiffs-claim-issued.pdf, the claim as issued May 4, 2026; (2) affidavit-of-service.pdf, " +
      "proof of service on May 11, 2026; (3) defence-received.pdf, the Defence filed May 28, 2026; (4) settlement-conference-notice.pdf, " +
      "the notice for the September 15, 2026 conference; (5) migration-completion-report.pdf, my completion report from February 2, 2026.",
    "sc-remedy-sought": "I want the court to order Northshore Logistics to pay the full $12,500 invoice, plus my court costs.",
    "sc-date-claim-served": "The claim was served on May 11, 2026.",
    "sc-date-claim-issued": "The claim was issued by the court on May 4, 2026.",
    "sc-date-defence-filed": "The Defence was filed on May 28, 2026.",
    "sc-date-settlement-conference": "The settlement conference is scheduled for September 15, 2026.",
  }),
  location: { province: "Ontario", city: "Ottawa" },
};

// ---------------------------------------------------------------------------
// 10. Internally inconsistent amounts -- built to test contradiction/
// credibility detection (credibilityRiskEngine.ts, documentReadinessImpact)
// rather than claim-type matching. The story, the invoice, and the remedy
// sought each name a different dollar figure on purpose.
export const contradictionAmountsFixture: Fixture = {
  id: "contradiction-amounts",
  title: "Unpaid invoice where the claimed amount doesn't match the paperwork (plaintiff, internal inconsistency)",
  story:
    "I did freelance bookkeeping work for a small retailer, Larkspur Variety, and they owe me around " +
    "$5,000 that was never paid. This is an unpaid invoice for services completed in March 2026. I " +
    "haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "bookkeeping-invoice.pdf",
      type: "PDF",
      description: "The actual invoice sent to Larkspur Variety, dated March 30, 2026, for $7,500 -- not $5,000.",
    },
    {
      filename: "engagement-email.pdf",
      type: "PDF (email export)",
      description: "Email from February 2026 confirming the bookkeeping engagement at a rate that totals $7,500 for the period billed.",
    },
  ],
  answers: baseCaseReviewAnswers({
    "sc-orient-when-happened": "The bookkeeping work was completed in March 2026.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Unpaid money owed to you",
    "sc-amount-claimed": "$6,200",
    "sc-evidence-available":
      "I have two things: (1) bookkeeping-invoice.pdf, the invoice dated March 30, 2026, for $7,500; (2) engagement-email.pdf, " +
      "the February 2026 email confirming the engagement rate.",
    "sc-remedy-sought": "I want the court to order Larkspur Variety to pay the $5,000 they owe me.",
  }),
  location: { province: "Ontario", city: "Peterborough" },
};

export const CASE_REVIEW_FIXTURES: Array<{ fixture: Fixture; description: string }> = [
  {
    fixture: nonPaymentGoodsSoldFixture,
    description: "Plaintiff, non-payment for goods sold, complete evidence -- baseline clean case with a different claim type than the 3 pinned fixtures.",
  },
  {
    fixture: breachContractGoodsGapFixture,
    description: "Plaintiff, breach of contract for goods, deliberate evidence gap (verbal agreement only, no writing).",
  },
  {
    fixture: dogBiteInjuryFixture,
    description: "Plaintiff, dog bite/animal injury -- exercises the injury-date question (sc-date-injury) in a private (non-municipal) fact pattern.",
  },
  {
    fixture: slipAndFallMunicipalFixture,
    description: "Plaintiff, slip and fall on an uncleared municipal sidewalk -- exercises sc-date-injury in the highest-stakes fact pattern it exists for (the 10-day municipal notice period).",
  },
  {
    fixture: contractorPropertyDamageFixture,
    description: "Plaintiff, property damage caused by a contractor's work, with a partial admission from the defendant already on record.",
  },
  {
    fixture: improperTowingFixture,
    description: "Plaintiff, improper/unauthorized towing -- straightforward vehicle dispute, complete evidence.",
  },
  {
    fixture: usedVehicleOverLimitFixture,
    description: "Plaintiff, undisclosed accident damage on a used vehicle, $54,000 claimed -- second over-limit fact pattern (different claim type than overLimitContract.fixture.ts) to verify the jurisdiction warning isn't tied to one signal phrase.",
  },
  {
    fixture: defendantRespondingGoodsSoldFixture,
    description: "DEFENDANT side -- served, disputing part of the claimed amount, admitting the rest and requesting payment terms (sc-defendant-admission-payment). No existing committed fixture exercises the defendant question branch at all.",
  },
  {
    fixture: plaintiffPostFilingDeadlinesFixture,
    description: "Plaintiff, POST-FILING -- claim issued, served, defended, settlement conference scheduled, with real dates for all applicable Decision-5 date questions. The computed-date/deadline branch no committed fixture has exercised end to end before this one (all three were pre-filing).",
  },
  {
    fixture: contradictionAmountsFixture,
    description: "Plaintiff, deliberately inconsistent dollar figures across the story ($5,000), the amount claimed ($6,200), and the invoice itself ($7,500) -- tests whether a factual inconsistency is flagged as a fact issue to resolve, never as a judgment on the case's merits (CLAUDE.md §3).",
  },
];
