/**
 * Runs the real intake pipeline (pipelineRunner.ts's runStoryThroughPipeline
 * -- the same shared runner runFixtures.ts, runGeneratedFixtures.ts, and
 * runFixtureDrafts.ts already use) against one fabricated, clearly-labeled
 * test story per Small Claims claim type in claimTypes.ts -- all 19 -- and
 * writes a single, complete, unabridged report.
 *
 * This is a survey, not a pass/fail check: every field of every stage's
 * real output is captured and written out, nothing is graded or fixed.
 *
 * Real, billed OpenAI calls throughout, same as every other script in this
 * directory that touches the real pipeline -- cost was estimated before
 * writing this (measured actual system-prompt sizes, used real per-story
 * turn counts from the existing 3 fixtures) and reported separately from
 * this file, not repeated here.
 *
 * Session 37 (commit 42274b3) update: this run writes to
 * fixtures/smallClaimsFullSurveyV2.md, a NEW file -- fixtures/smallClaimsFullSurvey.md
 * (commit ffa722b) is left untouched as the "before" snapshot, since every
 * story in it was matched by the exact-substring matcher alone, before the
 * AI-classifier fallback existed. Same 19 stories, same documents, same
 * per-claim-type structure as before, plus two additions: each section now
 * reports whether the retained match came from the exact matcher or the AI
 * fallback (and, if the fallback fired, whether/how it was confirmed and
 * that the unconfirmed suggestion never leaked into matchedClaimTypes/
 * evidenceGuidance/claimGuidance beforehand), and a final section
 * exercises the rejection/retry path end to end, which nothing had
 * exercised until now.
 *
 * Run: node --import tsx --env-file=.env.local scripts/verification/runFullClaimTypeSurvey.ts
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runStoryThroughPipeline, type PipelineRun } from "./fixtures/pipelineRunner";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { buildClaimTypeOverviewContent } from "../../src/lib/case-system/intake/claimTypeOverviewContent";
import { draftStatementOfClaimParticulars } from "../../src/lib/case-system/statementOfClaimDraftEngine";
import { classifyClaimTypeWithAi } from "../../src/lib/case-system/intake/claimTypeAiClassifier";
import { resolveClaimTypeSuggestion } from "../../src/lib/case-system/intake/claimTypeSuggestionResolution";

type SurveyStory = {
  claimTypeId: string;
  /** The fabricated user's opening story, in first person -- realistic, matches the claim type's own `signals`. */
  story: string;
  /** Fabricated supporting "documents" as plain text, labeled clearly in the report, never described as real evidence. */
  documents: string[];
  /** Answer text for every QUESTION_BANK question id -- see fixtureTypes.ts's own header for why this covers all 15, not just the ones expected to fire. */
  answers: Record<string, string>;
  location: { province: "Ontario"; city: string };
};

const DEFAULT_ANSWERS: Record<string, string> = {
  "sc-orient-when-happened": "About six weeks ago.",
  "sc-orient-role": "Bringing the claim (plaintiff)",
  "sc-claim-filed": "No, nothing has been filed with the court yet.",
  "sc-defendant-served": "No, not yet -- no claim has been filed.",
  "sc-defence-filed": "No.",
  "sc-defence-time-elapsed": "Not applicable -- no claim has been filed yet.",
  "sc-defendant-noted-in-default": "No.",
  "sc-contractor-completion-date": "The agreed date passed and the other side stopped responding.",
  "sc-contractor-notice-before-replacement": "Yes, I told them about the problem and gave them a chance to fix it before doing anything else.",
  "sc-safety-check": "No safety concerns.",
};

function withAnswers(overrides: Record<string, string>): Record<string, string> {
  return { ...DEFAULT_ANSWERS, ...overrides };
}

const STORIES: SurveyStory[] = [
  {
    claimTypeId: "sc-claim-unpaid-debt-services",
    story:
      "I run a small graphic design business. I signed a services agreement with a local bakery, " +
      "Maple & Crumb, to design their full brand identity for a fee of $6,200, due within 15 days " +
      "of delivery. I delivered all the final files on time and they confirmed receiving everything " +
      "by email. This is an unpaid invoice -- Maple & Crumb never paid me anything, even after two " +
      "written demand emails asking for payment.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Invoice #1042 to Maple & Crumb, $6,200, dated for design services, marked unpaid.",
      "[FABRICATED TEST DOCUMENT] Signed services agreement listing the $6,200 fee and 15-day payment term.",
      "[FABRICATED TEST DOCUMENT] Demand email dated three weeks after delivery, asking for payment.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Unpaid money owed to you",
      "sc-amount-claimed": "$6,200",
      "sc-evidence-available": "I have the signed agreement, the invoice, and two demand emails I sent asking for payment.",
      "sc-remedy-sought": "I want the court to order Maple & Crumb to pay the full $6,200 owed.",
    }),
    location: { province: "Ontario", city: "Ottawa" },
  },
  {
    claimTypeId: "sc-claim-slip-and-fall-occupier-liability",
    story:
      "I slipped and fell on a patch of ice right outside the entrance of a grocery store, Fresh " +
      "Market on King Street, that hadn't been salted or cleared. I fell hard and hurt my wrist, " +
      "which needed a cast. A store employee saw me fall and filled out an incident report. I have " +
      "photos I took of the ice right after I fell.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Photo description: ice-covered pavement immediately outside the store entrance, taken minutes after the fall.",
      "[FABRICATED TEST DOCUMENT] Store incident report, filled out by the employee who witnessed the fall.",
      "[FABRICATED TEST DOCUMENT] Emergency room discharge summary noting a wrist fracture and cast.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$4,800",
      "sc-evidence-available": "I have photos of the ice, the store's own incident report, and my emergency room records.",
      "sc-remedy-sought": "I want the court to order the store to pay for my medical costs and lost time from work.",
    }),
    location: { province: "Ontario", city: "Hamilton" },
  },
  {
    claimTypeId: "sc-claim-improper-unauthorized-towing",
    story:
      "My car was towed without permission from a private lot where I was parked while visiting a " +
      "friend. The towing company, Rapid Tow, never contacted me and I only found out when I called " +
      "the impound lot. They charged storage fees that kept increasing every day I couldn't pick up " +
      "the car. I didn't consent to the tow and wasn't given any of the consent paperwork I'm told " +
      "I'm entitled to.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Impound lot receipt showing the vehicle, tow date, and accumulating daily storage fees.",
      "[FABRICATED TEST DOCUMENT] Text messages with the friend confirming where the car was legally parked.",
      "[FABRICATED TEST DOCUMENT] Photo description: the parking area with no visible no-parking signage.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$950",
      "sc-evidence-available": "I have the impound receipt showing the storage fees, texts confirming where I was parked, and a photo of the lot.",
      "sc-remedy-sought": "I want the court to order Rapid Tow to refund the towing and storage fees.",
    }),
    location: { province: "Ontario", city: "Mississauga" },
  },
  {
    claimTypeId: "sc-claim-breach-of-contract-goods",
    story:
      "I ordered custom-built patio furniture online from Backyard Living for $3,400. What arrived " +
      "was the wrong item entirely -- a completely different, cheaper style than what I ordered and " +
      "paid for. When I complained, they admitted the mistake by email but the goods never arrived " +
      "correctly even after a second attempt, which showed up damaged on arrival.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Order confirmation showing the furniture style and $3,400 price actually ordered.",
      "[FABRICATED TEST DOCUMENT] Photo description: the wrong item that arrived, next to the order confirmation for comparison.",
      "[FABRICATED TEST DOCUMENT] Email from Backyard Living acknowledging the wrong item was sent.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "A contract or agreement dispute",
      "sc-amount-claimed": "$3,400",
      "sc-evidence-available": "I have the order confirmation, photos of what actually arrived, and their email admitting the mistake.",
      "sc-remedy-sought": "I want a full refund of the $3,400 I paid.",
    }),
    location: { province: "Ontario", city: "London" },
  },
  {
    claimTypeId: "sc-claim-non-payment-goods-sold",
    story:
      "I sell handmade furniture. A customer ordered a custom dining table from me for $2,900, I " +
      "built and delivered it as agreed, and they accepted it -- but the buyer never paid for the " +
      "product. I've sent three follow-up messages asking for payment for the merchandise and gotten " +
      "no response.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Order form signed by the buyer listing the $2,900 price and delivery date.",
      "[FABRICATED TEST DOCUMENT] Delivery confirmation text from the buyer saying the table arrived.",
      "[FABRICATED TEST DOCUMENT] Three follow-up text messages asking for payment, all unanswered.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Unpaid money owed to you",
      "sc-amount-claimed": "$2,900",
      "sc-evidence-available": "I have the signed order form, the delivery confirmation, and my follow-up messages asking for payment.",
      "sc-remedy-sought": "I want the court to order payment of the full $2,900.",
    }),
    location: { province: "Ontario", city: "Kitchener" },
  },
  {
    claimTypeId: "sc-claim-consumer-protection-act-issue",
    story:
      "A home renovation company advertised a kitchen package as including specific brand-name " +
      "appliances for $12,000, which is why I signed with them. After I paid a deposit, they told " +
      "me the advertised appliances weren't actually included and I'd have to pay thousands more -- " +
      "this felt like false advertising and a deceptive sales practice, since the ad I saw and saved " +
      "clearly listed the appliances as included.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Screenshot description: the original online ad listing the appliances as included in the $12,000 package.",
      "[FABRICATED TEST DOCUMENT] Signed contract referencing the advertised package.",
      "[FABRICATED TEST DOCUMENT] Email from the company admitting the appliances were not included.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "A consumer purchase problem",
      "sc-amount-claimed": "$1,500",
      "sc-evidence-available": "I have a saved copy of the original ad, the signed contract, and their email admitting the appliances weren't included.",
      "sc-remedy-sought": "I want my deposit back and compensation for the misleading advertising.",
    }),
    location: { province: "Ontario", city: "Windsor" },
  },
  {
    claimTypeId: "sc-claim-contractor-damage",
    story:
      "I hired a contractor to renovate my bathroom. Partway through, the renovation went wrong -- " +
      "the contractor caused water damage to the floor below by not properly sealing a pipe, and the " +
      "workmanship damaged the hardwood floor in the hallway outside the bathroom too. I told them " +
      "about the damage right away and gave them a chance to fix it, but they never came back.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Photo description: water stains on the ceiling of the room below the renovated bathroom.",
      "[FABRICATED TEST DOCUMENT] Photo description: damaged hardwood flooring in the hallway outside the bathroom.",
      "[FABRICATED TEST DOCUMENT] Repair estimate from a second contractor to fix both the plumbing and the floor.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Work done or services provided (e.g. a contractor)",
      "sc-amount-claimed": "$5,600",
      "sc-evidence-available": "I have photos of the water damage and the hardwood damage, plus a repair estimate from another contractor.",
      "sc-remedy-sought": "I want the cost of the repairs, based on the second contractor's estimate.",
    }),
    location: { province: "Ontario", city: "Barrie" },
  },
  {
    claimTypeId: "sc-claim-wrongful-dismissal",
    story:
      "I was fired without notice after four years working full-time at a small retail company. I " +
      "was let go without severance and told it was effective immediately, with no explanation of " +
      "cause. My employer didn't give notice or pay in lieu of notice, and I believe this was a " +
      "wrongful dismissal given how long I'd worked there.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Termination letter dated the day of dismissal, stating immediate effect and no reason given.",
      "[FABRICATED TEST DOCUMENT] Pay stubs showing four years of continuous full-time employment.",
      "[FABRICATED TEST DOCUMENT] Email from HR confirming no severance or notice pay was provided.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$9,000",
      "sc-evidence-available": "I have the termination letter, my pay stubs showing four years of employment, and the HR email confirming no severance was paid.",
      "sc-remedy-sought": "I want notice pay and severance appropriate for four years of service.",
    }),
    location: { province: "Ontario", city: "Sudbury" },
  },
  {
    claimTypeId: "sc-claim-dog-bite-animal-injury",
    story:
      "I was bitten by a dog while walking on a public sidewalk near my neighbour's house. The dog " +
      "got loose from their yard and attacked me, biting my leg badly enough that I needed stitches. " +
      "A neighbour across the street saw the whole thing happen and gave me their contact information " +
      "as a witness.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Urgent care record describing the dog bite wound and stitches.",
      "[FABRICATED TEST DOCUMENT] Photo description: the bite wound on the leg, taken the same day.",
      "[FABRICATED TEST DOCUMENT] Witness statement from the neighbour who saw the dog attack.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$3,200",
      "sc-evidence-available": "I have my urgent care records, a photo of the wound, and a written witness statement from my neighbour.",
      "sc-remedy-sought": "I want compensation for my medical costs and the pain from the injury.",
    }),
    location: { province: "Ontario", city: "Thunder Bay" },
  },
  {
    claimTypeId: "sc-claim-breach-of-contract-services",
    story:
      "I paid a landscaping company $4,500 upfront to redo my backyard, including new sod and a " +
      "patio. They never finished the job -- the service provider walked off the project after " +
      "laying about a third of the patio stones and never came back, despite several calls. I paid " +
      "for a service that wasn't done.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Signed contract and deposit receipt for the $4,500 landscaping job.",
      "[FABRICATED TEST DOCUMENT] Photo description: the abandoned, partially completed patio.",
      "[FABRICATED TEST DOCUMENT] Call log showing four unanswered attempts to reach the company.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Work done or services provided (e.g. a contractor)",
      "sc-amount-claimed": "$4,500",
      "sc-evidence-available": "I have the signed contract, photos of the unfinished patio, and a log of my calls trying to reach them.",
      "sc-remedy-sought": "I want a refund for the portion of the job that was never completed.",
    }),
    location: { province: "Ontario", city: "Guelph" },
  },
  {
    claimTypeId: "sc-claim-recovery-of-personal-property",
    story:
      "I lent a former roommate my gaming console and several games worth about $1,100 when we were " +
      "still living together. Since I moved out, they won't give my property back -- every time I " +
      "ask for it back, they make an excuse or stop responding to messages.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Purchase receipt for the gaming console and games, showing the original cost.",
      "[FABRICATED TEST DOCUMENT] Text messages asking for the property back, with the roommate's excuses.",
      "[FABRICATED TEST DOCUMENT] Photo description: the console in the plaintiff's apartment before the roommate borrowed it.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$1,100",
      "sc-evidence-available": "I have the original purchase receipt, texts asking for it back, and a photo of the console before I lent it out.",
      "sc-remedy-sought": "I want the property returned, or its value in money if it isn't returned.",
    }),
    location: { province: "Ontario", city: "Kingston" },
  },
  {
    claimTypeId: "sc-claim-consumer-cancellation-refund",
    story:
      "I signed up for a gym membership and paid a $600 initiation deposit, then cancelled within " +
      "the cooling-off period the same week. The gym membership refund was never processed -- it's " +
      "been two months and the deposit still hasn't been returned despite my cancellation being " +
      "within the required window.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Membership agreement showing the $600 deposit and sign-up date.",
      "[FABRICATED TEST DOCUMENT] Written cancellation notice sent within the cooling-off period.",
      "[FABRICATED TEST DOCUMENT] Email exchange with the gym confirming cancellation was received but no refund issued.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "A deposit that wasn't returned",
      "sc-amount-claimed": "$600",
      "sc-evidence-available": "I have the membership agreement, my written cancellation notice, and emails confirming they received it.",
      "sc-remedy-sought": "I want my full $600 deposit refunded.",
    }),
    location: { province: "Ontario", city: "Oshawa" },
  },
  {
    claimTypeId: "sc-claim-commercial-tenancy-dispute",
    story:
      "I run a small retail shop and had a commercial lease dispute with my landlord over unpaid " +
      "commercial rent I allegedly owe. I believe the amount is wrong -- the landlord changed the " +
      "locks on my retail lease space without proper notice, and I want the court to sort out what's " +
      "actually owed between a business tenant and a commercial landlord.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Copy of the signed commercial lease agreement.",
      "[FABRICATED TEST DOCUMENT] Rent payment records showing amounts actually paid.",
      "[FABRICATED TEST DOCUMENT] Photo description: the changed locks on the retail unit.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$7,800",
      "sc-evidence-available": "I have the signed lease, my rent payment records, and a photo of the changed locks.",
      "sc-remedy-sought": "I want the court to determine the correct amount owed and address the lockout.",
    }),
    location: { province: "Ontario", city: "Brampton" },
  },
  {
    claimTypeId: "sc-claim-dishonoured-nsf-cheque",
    story:
      "A client paid me $2,250 for consulting work with a personal cheque, which bounced -- an NSF " +
      "cheque due to non-sufficient funds. The bank confirmed the cheque was returned, and the client " +
      "has ignored my requests to make it right since.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Copy of the returned NSF cheque with the bank's dishonour stamp.",
      "[FABRICATED TEST DOCUMENT] Bank statement showing the NSF fee charged.",
      "[FABRICATED TEST DOCUMENT] Messages to the client asking them to replace the bounced cheque.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Unpaid money owed to you",
      "sc-amount-claimed": "$2,250",
      "sc-evidence-available": "I have the returned cheque, my bank statement showing the NSF fee, and messages asking the client to fix it.",
      "sc-remedy-sought": "I want the full amount of the cheque plus the NSF fee it cost me.",
    }),
    location: { province: "Ontario", city: "St. Catharines" },
  },
  {
    claimTypeId: "sc-claim-unpaid-overtime-vacation-pay",
    story:
      "I worked as a warehouse associate and regularly worked over 44 hours a week without receiving " +
      "unpaid overtime for those extra hours. When I left the job, my final paycheque was also " +
      "missing vacation pay that had built up over the year. My employer didn't pay vacation pay " +
      "despite several requests.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Timesheet records showing weekly hours worked, several weeks over 44 hours.",
      "[FABRICATED TEST DOCUMENT] Final pay stub with no vacation pay line item.",
      "[FABRICATED TEST DOCUMENT] Email to HR asking about the missing overtime and vacation pay.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something else",
      "sc-amount-claimed": "$2,100",
      "sc-evidence-available": "I have my timesheets showing the extra hours, my final pay stub, and my email asking HR about it.",
      "sc-remedy-sought": "I want the unpaid overtime and vacation pay I'm owed.",
    }),
    location: { province: "Ontario", city: "Cambridge" },
  },
  {
    claimTypeId: "sc-claim-vehicle-repair-dispute",
    story:
      "I took my car to a repair shop for brake work. The estimate was $400, but the repair shop " +
      "overcharged me and the final bill was $700 -- more than the required estimate allows. Worse, " +
      "the same brake problem came back within a month, so the repair wasn't fixed within the " +
      "warranty period they promised.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Original written estimate for $400 from the repair shop.",
      "[FABRICATED TEST DOCUMENT] Final invoice showing $700 charged.",
      "[FABRICATED TEST DOCUMENT] Second invoice from a different shop, a month later, for the same brake repair.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "A vehicle-related dispute",
      "sc-amount-claimed": "$700",
      "sc-evidence-available": "I have the original estimate, the final invoice showing the overcharge, and the second shop's invoice for the repeat repair.",
      "sc-remedy-sought": "I want a refund of the amount charged above the estimate and the cost of the repeat repair.",
    }),
    location: { province: "Ontario", city: "Waterloo" },
  },
  {
    claimTypeId: "sc-claim-used-vehicle-nondisclosure",
    story:
      "I bought a used car from a registered dealer for $14,000. After a mechanic looked at it, I " +
      "learned the dealer didn't disclose that the vehicle had a salvage title from a prior accident " +
      "-- vehicle history hidden from me at the time of sale. I would never have paid that price if " +
      "I'd known.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Bill of sale showing the $14,000 purchase price and date.",
      "[FABRICATED TEST DOCUMENT] Vehicle history report obtained after the sale showing the salvage title.",
      "[FABRICATED TEST DOCUMENT] Mechanic's inspection report noting prior accident repair work.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "A vehicle-related dispute",
      "sc-amount-claimed": "$14,000",
      "sc-evidence-available": "I have the bill of sale, the vehicle history report showing the salvage title, and the mechanic's inspection report.",
      "sc-remedy-sought": "I want to cancel the purchase and get my money back.",
    }),
    location: { province: "Ontario", city: "Vaughan" },
  },
  {
    claimTypeId: "sc-claim-unpaid-condo-common-expenses",
    story:
      "I'm on the board of a small condominium corporation. One of the unit owners has condo fees " +
      "unpaid for the last five months, resulting in unpaid common expenses of $2,750. We've sent " +
      "formal notices about the arrears with no response, and the condo corporation is now suing the " +
      "owner to recover the amount.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Condo fee ledger showing five months of unpaid common expenses.",
      "[FABRICATED TEST DOCUMENT] Formal arrears notice letter sent to the unit owner.",
      "[FABRICATED TEST DOCUMENT] Board meeting minutes authorizing the collection action.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Unpaid money owed to you",
      "sc-amount-claimed": "$2,750",
      "sc-evidence-available": "I have the condo fee ledger, the arrears notice we sent, and the board minutes authorizing this claim.",
      "sc-remedy-sought": "I want the court to order payment of the outstanding common expenses.",
    }),
    location: { province: "Ontario", city: "Markham" },
  },
  {
    claimTypeId: "sc-claim-defamation-libel-slander",
    story:
      "A former business partner posted false things about me on a public community Facebook group, " +
      "claiming I stole money from our shared business -- which never happened. The post damaged my " +
      "reputation; several customers mentioned seeing it and one cancelled a booking specifically " +
      "because of it. The post is still up and has been shared several times.",
    documents: [
      "[FABRICATED TEST DOCUMENT] Screenshot description: the Facebook post making the false theft accusation, with the date and visible share count.",
      "[FABRICATED TEST DOCUMENT] Message from a customer saying they cancelled a booking after seeing the post.",
      "[FABRICATED TEST DOCUMENT] Screenshot description: comments on the post from other community members reacting to the accusation.",
    ],
    answers: withAnswers({
      "sc-orient-dispute-category": "Something said about you (defamation)",
      "sc-amount-claimed": "$8,000",
      "sc-defamation-publication-details":
        "He wrote that I \"stole thousands from our old business\" in a post on the local community " +
        "Facebook group, visible to the group's roughly 2,000 members, about three weeks ago.",
      "sc-evidence-available": "I have a screenshot of the post with the share count, a message from the customer who cancelled because of it, and screenshots of the comments.",
      "sc-remedy-sought": "I want compensation for the harm to my reputation and lost business.",
    }),
    location: { province: "Ontario", city: "Toronto" },
  },
];

async function renderSection(
  story: SurveyStory,
  claimType: (typeof CLAIM_TYPES)[number],
  run: PipelineRun,
  apiKey: string,
): Promise<string> {
  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  push(`## ${claimType.name}`);
  push("");
  push(`**Intended claim type:** \`${claimType.id}\` (${claimType.name})`);
  push("");
  push("### FABRICATED TEST STORY -- not a real case, constructed for this survey only");
  push("");
  push("> " + story.story);
  push("");
  push("### FABRICATED TEST DOCUMENTS -- not real evidence, described in plain text only");
  push("");
  for (const doc of story.documents) push(`- ${doc}`);
  push("");

  if (run.halted) {
    push(`### PIPELINE HALTED: ${run.haltMessage}`);
    push("");
    push("No further stages ran for this claim type. Moving to the next one, per instruction not to debug.");
    push("");
    return lines.join("\n");
  }

  push("### Turn-by-turn conversation (real orchestrateIntakeTurn.ts output)");
  push("");
  push(`intakeComplete: ${run.intakeComplete} -- turns run: ${run.turns.length}`);
  push("");
  push("| # | Question asked | Answer given | Matched claim type this turn | Evidence guidance this turn |");
  push("|---|---|---|---|---|");
  run.turns.forEach((t, i) => {
    const q = (t.questionAsked ?? "(opening story)").replace(/\|/g, "\\|");
    const a = (t.answerGiven ?? "").replace(/\|/g, "\\|").slice(0, 120);
    const m = t.matchedClaimTypeThisTurn ?? "-";
    const eg = t.evidenceGuidanceThisTurn
      ? `categories: ${t.evidenceGuidanceThisTurn.categories.join(", ") || "(none)"}`
      : "-";
    push(`| ${i + 1} | ${q} | ${a} | ${m} | ${eg} |`);
  });
  const corrections = run.turns.flatMap((t) => t.possibleCorrections);
  if (corrections.length) {
    push("");
    push(`possibleCorrections seen: ${corrections.join("; ")}`);
  }
  push("");

  const actualMatch = run.retainedMatchedClaimType;
  const matchLabel = actualMatch ? `${actualMatch.claimTypeId} (${actualMatch.claimTypeName})` : "(none matched)";
  const mismatch = !actualMatch || actualMatch.claimTypeId !== claimType.id;
  push(`### Retained matched claim type at completion: ${matchLabel}`);
  push("");
  push(mismatch ? `**MISMATCH FLAGGED** -- intended \`${claimType.id}\`, pipeline matched ${matchLabel}.` : "Matches the intended claim type.");
  push("");

  push("### Match source (Session 37, commit 42274b3's AI-classifier fallback)");
  push("");
  if (run.retainedMatchedClaimType) {
    push(
      "**exact matcher** -- `matchClaimType()`'s substring matching found this claim type directly; the AI " +
        "fallback never ran for this story (it only runs when the exact matcher finds nothing).",
    );
  } else if (run.retainedSuggestedClaimType) {
    const suggestion = run.retainedSuggestedClaimType;
    push(
      `**AI classifier fallback** -- the exact matcher found nothing for this story; ` +
        `\`classifyClaimTypeWithAi()\` suggested \`${suggestion.claimTypeId}\` (${suggestion.claimTypeName}).`,
    );
    push("");
    push("Required confirmation: **yes** -- this raw pipeline run alone never populates `matchedClaimTypes`, " +
      "`evidenceGuidance`, or `claimGuidance` from an AI suggestion (see orchestrateIntakeTurn.ts's " +
      "`suggestedClaimType` doc comment). Leak check against the turn where the suggestion appeared:");
    const suggestingTurn = run.turns.find((t) => t.suggestedClaimTypeThisTurn);
    if (suggestingTurn) {
      push(
        `- matchedClaimTypeThisTurn on that turn: ${suggestingTurn.matchedClaimTypeThisTurn ?? "null"} ` +
          `${suggestingTurn.matchedClaimTypeThisTurn ? "-- **LEAK, should be null**" : "-- correct, no leak"}`,
      );
      push(
        `- evidenceGuidanceThisTurn on that turn: ${suggestingTurn.evidenceGuidanceThisTurn ? JSON.stringify(suggestingTurn.evidenceGuidanceThisTurn) : "null"} ` +
          `${suggestingTurn.evidenceGuidanceThisTurn ? "-- **LEAK, should be null**" : "-- correct, no leak"}`,
      );
    } else {
      push("- (no turn log carried the suggestion -- unexpected, see raw turns table above)");
    }
    push("");
    push("Simulating the user confirming this suggestion (`resolveClaimTypeSuggestion(\"confirm\", ...)`, the exact function the confirm/reject API route calls):");
    push("");
    try {
      const resolution = await resolveClaimTypeSuggestion(
        "confirm",
        story.story,
        CLAIM_TYPES,
        run.finalFacts,
        apiKey,
        suggestion.claimTypeId,
      );
      if (resolution.outcome === "confirmed") {
        push(
          `- outcome: **confirmed** -- evidenceGuidance now has ${resolution.evidenceGuidance.categories.length} category/categories; claimGuidance now has ` +
            `${resolution.claimGuidance.educationTopics.length} education topic(s) and ${resolution.claimGuidance.remedies.length} remedy/remedies.`,
        );
      } else {
        push(`- outcome: ${resolution.outcome} (unexpected for a confirm action on a valid id)`);
      }
    } catch (error) {
      push(`- confirmation simulation ERRORED: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    push(
      "**none** -- neither the exact matcher nor the AI classifier fallback found anything for this story. " +
        "This is the genuine \"no match in the system yet\" case; nothing was forced.",
    );
  }
  push("");

  push("### Final facts (real IntakeFacts, from orchestrateIntakeTurn.ts)");
  push("");
  push("```json");
  push(JSON.stringify(run.finalFacts, null, 2));
  push("```");
  push("");

  if (run.mappedInput) {
    push("### mapGuidedIntakeToSmallClaimsInput() output");
    push("");
    push("```json");
    push(JSON.stringify(run.mappedInput, null, 2));
    push("```");
    push("");
  }

  if (run.analysisOutput) {
    const a = run.analysisOutput.analysis as Record<string, unknown>;
    push("### Complete final AnalysisResult (analyzeSmallClaimsWithBrain, allowExternalCognition: true) -- every populated field");
    push("");
    push("```json");
    push(JSON.stringify(a, null, 2));
    push("```");
    push("");

    push("### Forms recommended -- two separate systems, reported separately (they can disagree)");
    push("");
    push(`**System 1 -- deterministic, \`buildAuthoritativeRequiredForms\` (\`AnalysisResult.requiredNextForms\`, no AI, no DB):**`);
    const required = Array.isArray(a.requiredNextForms) ? (a.requiredNextForms as string[]) : [];
    push(required.length ? required.map((f) => `- ${f}`).join("\n") : "(none)");
    push("");
    push(`\`notNeededNow\`: ${JSON.stringify(a.notNeededNow ?? [])}`);
    push(`\`completedForms\`: ${JSON.stringify(a.completedForms ?? [])}`);
    push(`\`receivedForms\`: ${JSON.stringify(a.receivedForms ?? [])}`);
    push("");
    push(
      "**System 2 -- `legal_form_mapping_rules` verified-confirmation path (`/api/cases/form-applicability`):** " +
        "NOT run for this survey -- that path is gated on an authenticated, saved case in Supabase " +
        "(`getAuthenticatedOwnedCase`), which this in-memory pipeline run never creates. Reported as a fact instead " +
        "of run: per `docs/PROCEDURAL_RULES_INVENTORY.md` §5, this system has exactly 4 small-claims rows total " +
        "(ids 6/7/15/18, covering Form 7A/9A/8A/10A) and none of them are gated on claim type at all -- only on " +
        "`court_area=small-claims` plus procedural stage plus explicit user-confirmed applicability answers. Which of " +
        "the 4 could apply is therefore identical for every one of the 19 claim types in this survey and depends " +
        "entirely on case stage, not on which claim type matched.",
    );
    push("");
  } else {
    push("### Complete final AnalysisResult");
    push("");
    push("Not run -- no mapped input was produced.");
    push("");
  }

  const overview = run.mappedInput ? buildClaimTypeOverviewContent(run.mappedInput.facts) : null;
  push("### commonDefences card content (claimTypeOverviewContent.ts, deterministic, no AI)");
  push("");
  if (overview && overview.claimTypeId === claimType.id) {
    push(overview.commonDefences.length ? "" : "(none)");
    for (const item of overview.commonDefences) {
      push(`- ${item.text}${item.sourceUrl ? ` (Source: ${item.sourceUrl})` : ""}`);
    }
  } else if (overview) {
    push(
      `Note: \`buildClaimTypeOverviewContent\` matched \`${overview.claimTypeId}\` against the *opening story text alone* ` +
        `(it uses its own independent matchClaimType() call, separate from the turn-by-turn orchestrator match above) -- ` +
        "shown for transparency since it can differ from the turn-by-turn match reported above.",
    );
    for (const item of overview.commonDefences) {
      push(`- ${item.text}${item.sourceUrl ? ` (Source: ${item.sourceUrl})` : ""}`);
    }
  } else {
    push("(claimTypeOverviewContent.ts's own matcher found no match against the opening story text)");
  }
  push("");

  if (claimType.id === "sc-claim-unpaid-debt-services" && run.mappedInput) {
    push("### Statement of Claim draft (statementOfClaimDraftEngine.ts, deterministic, no AI) -- full draftText");
    push("");
    const draft = draftStatementOfClaimParticulars(run.mappedInput, run.retainedMatchedClaimType);
    push("```");
    push(draft.draftText);
    push("```");
    push("");
  }

  return lines.join("\n");
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  const sections: string[] = [];
  sections.push("# Small Claims -- Full 19-Claim-Type Survey");
  sections.push("");
  sections.push(
    "**Every story and document in this report is fabricated test data, constructed for this survey only. " +
      "None of it describes a real person, business, or event.** Generated by `runFullClaimTypeSurvey.ts` against " +
      "the real pipeline (`orchestrateIntakeTurn.ts`, `analyzeSmallClaimsWithBrain`, `claimTypeMatcher.ts`, " +
      "`claimTypeOverviewContent.ts`, and -- for the unpaid-debt claim type only -- `statementOfClaimDraftEngine.ts`). " +
      "Not hand-edited. This is a complete record for review, not a pass/fail check -- nothing found here was fixed.",
  );
  sections.push("");
  sections.push(`Run at: ${new Date().toISOString()}`);
  sections.push("");
  sections.push("---");
  sections.push("");

  let index = 0;
  for (const story of STORIES) {
    index += 1;
    const claimType = CLAIM_TYPES.find((c) => c.id === story.claimTypeId);
    if (!claimType) {
      console.error(`No CLAIM_TYPES entry for ${story.claimTypeId} -- skipping.`);
      continue;
    }
    console.log(`\n${"=".repeat(70)}\n[${index}/${STORIES.length}] ${claimType.id}\n${"=".repeat(70)}`);
    // A single story erroring (a bad test-fixture answer, a transient API
    // failure) must not lose the other already-captured, already-paid-for
    // real API results -- caught and reported as its own section instead of
    // crashing the whole run, per the task's own instruction to report a
    // halt/error plainly and move to the next rather than debugging it.
    try {
      const run = await runStoryThroughPipeline(
        { id: claimType.id, story: story.story, answers: story.answers, location: story.location },
        apiKey,
      );
      const matchSource = run.retainedMatchedClaimType ? "exact" : run.retainedSuggestedClaimType ? "ai" : "none";
      console.log(
        `  turns: ${run.turns.length}, halted: ${run.halted}, matched: ${run.retainedMatchedClaimType?.claimTypeId ?? run.retainedSuggestedClaimType?.claimTypeId ?? "(none)"} (source: ${matchSource})`,
      );
      sections.push(await renderSection(story, claimType, run, apiKey));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ERRORED: ${message}`);
      sections.push(`## ${claimType.name}\n\n**Intended claim type:** \`${claimType.id}\`\n\n### PIPELINE RUN ERRORED\n\n${message}\n\nMoving to the next claim type, per instruction not to debug.`);
    }
    sections.push("---");
    sections.push("");
  }

  sections.push(await renderRejectionPathTest(apiKey));

  const outPath = path.join(__dirname, "fixtures", "smallClaimsFullSurveyV2.md");
  writeFileSync(outPath, sections.join("\n") + "\n", "utf8");
  console.log(`\nWrote ${outPath}`);
}

/**
 * Session 37 addition. Nothing exercised the reject/retry path end to end
 * before this -- claimTypeSuggestionResolution.ts's own doc comments and
 * the earlier round-1/round-2 verification only ever confirmed a
 * suggestion, never rejected one. Picks a few fresh, realistically-phrased
 * stories known (from that same earlier verification) to require the AI
 * fallback -- NOT reused verbatim from the 19 STORIES above, since those
 * were written to hit the exact matcher and mostly do -- then: gets the
 * initial AI suggestion, rejects it, confirms the retry excludes the
 * rejected id and either lands on a different claim type or genuinely
 * "none," and confirms a SECOND rejection is refused outright (no second
 * AI call, no loop) rather than trying forever.
 */
export async function renderRejectionPathTest(apiKey: string): Promise<string> {
  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  push("## Rejection / retry path -- exercised end to end for the first time");
  push("");
  push(
    "Fabricated test stories, deliberately different from the 19 canonical stories above (those mostly hit " +
      "the exact matcher and wouldn't exercise this path). Each one: get the AI classifier's first suggestion, " +
      "simulate the user rejecting it, confirm the retry excludes the rejected id, then simulate rejecting the " +
      "retry too, to confirm the cap holds (no third AI call, honest no-match instead of a loop).",
  );
  push("");

  const rejectionStories: { label: string; story: string }[] = [
    {
      label: "slip-and-fall, fresh phrasing",
      story: "The stairs outside their building were icy and I ended up falling and breaking my wrist.",
    },
    {
      label: "wrongful dismissal, fresh phrasing",
      story: "After eight years at the company, they let me go in a five-minute meeting with zero severance.",
    },
    {
      label: "defamation, fresh phrasing",
      story: "A neighbour started a rumor that I was involved in something illegal, which is completely false.",
    },
    {
      label: "boundary case (known from commit 42274b3's round-2 verification to produce a genuine second choice, to exercise the revised-suggestion + cap branches the first three stories above didn't reach)",
      story: "I delivered the custom order and the client has ignored every request for payment since.",
    },
  ];

  for (const { label, story } of rejectionStories) {
    push(`### ${label}`);
    push("");
    push(`> ${story}`);
    push("");

    const firstSuggestion = await classifyClaimTypeWithAi(story, CLAIM_TYPES, apiKey);
    if (!firstSuggestion) {
      push("First AI classification: **none** -- nothing to reject here, moving to the next story.");
      push("");
      continue;
    }
    push(`First AI suggestion: \`${firstSuggestion.claimTypeId}\` (${firstSuggestion.claimTypeName}).`);
    push("");
    push("Simulating the user rejecting it (`resolveClaimTypeSuggestion(\"reject\", ..., priorRejectedIds: [])`):");
    const firstRejection = await resolveClaimTypeSuggestion(
      "reject",
      story,
      CLAIM_TYPES,
      {},
      apiKey,
      firstSuggestion.claimTypeId,
      [],
    );
    if (firstRejection.outcome === "revised") {
      const revised = firstRejection.suggestedClaimType;
      const excludedCorrectly = revised.claimTypeId !== firstSuggestion.claimTypeId;
      push(
        `- outcome: **revised** -- retry suggested \`${revised.claimTypeId}\` (${revised.claimTypeName}). ` +
          `${excludedCorrectly ? "Correctly excludes the rejected id." : "**BUG: retry returned the same id that was just rejected.**"}`,
      );
      push("");
      push("Simulating the user rejecting the retry too (`priorRejectedIds: [firstSuggestion.claimTypeId]`), to confirm the one-retry cap holds:");
      const secondRejection = await resolveClaimTypeSuggestion(
        "reject",
        story,
        CLAIM_TYPES,
        {},
        apiKey,
        revised.claimTypeId,
        [firstSuggestion.claimTypeId],
      );
      push(
        `- outcome: **${secondRejection.outcome}** -- ` +
          (secondRejection.outcome === "no-match"
            ? "correct: the cap held, no further AI call was made, honest no-match returned instead of looping."
            : "**BUG: expected \"no-match\" once priorRejectedIds is non-empty -- the cap did not hold.**"),
      );
    } else if (firstRejection.outcome === "no-match") {
      push(
        "- outcome: **no-match** -- the retry (excluding the first suggestion) found nothing else in the closed " +
          "list. Correct honest fallback, not an error or a loop.",
      );
    } else {
      push(`- outcome: ${firstRejection.outcome} (unexpected for a reject action)`);
    }
    push("");
  }

  return lines.join("\n");
}

// Session 37: renderRejectionPathTest is now exported for reuse (see
// _tmp_patchRejectionSection.ts's real, already-learned-the-hard-way
// reason this guard exists -- importing this file to reuse one exported
// piece used to also re-run the entire 19-story survey as an import side
// effect, silently doubling the real billed API cost). Same guard pattern
// already used by verifyCaseOutcomeMatrix.ts and others in this
// directory: only run main() when this file is the actual entrypoint.
const isDirectExecution = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectExecution) {
  main();
}
