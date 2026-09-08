/**
 * Session 36 -- deterministic generator for the 50-story batch. No AI, no
 * Math.random() -- every story is produced from its index via plain
 * arithmetic, same "index-driven, fully reproducible" posture as
 * scripts/verification/scenarioRegistry.ts's baseScenario(area, index).
 * Re-running generateStories(50) always produces the exact same 50
 * stories.
 *
 * All facts fabricated -- parties, dates, amounts, businesses, all
 * invented, matching the existing 3 fixtures' convention.
 *
 * Each of the 11 archetypes below is built from a real claimTypes.ts
 * signal phrase (grepped from the file, not recalled), so the batch
 * exercises different CLAIM_TYPES entries, not "unpaid invoice" every
 * time -- verified deterministically after generation in
 * runGeneratedFixtures.ts's summary (which claim type each story actually
 * matched), not assumed here.
 *
 * Three independent variation axes, chosen by index arithmetic so the mix
 * is even across all 50 stories without needing true randomness:
 *   - overLimit:      i % 3 === 0   (~1/3 of stories, amount > $50,000)
 *   - hasEvidenceGap: i % 2 === 1   (~1/2 of stories, one confirmed-
 *                                    evidence item deliberately omitted)
 *   - dateUncertain:  i % 4 === 3   (~1/4 of stories, the date is stated
 *                                    as not remembered)
 */

import type { GeneratedStory } from "./generatedStoryTypes";

const CITIES = ["Ottawa", "London", "Toronto", "Hamilton", "Kingston", "Windsor", "Barrie", "Sudbury"];

function fmtAmount(n: number): string {
  return `$${n.toLocaleString()}`;
}

/** Standard answers every archetype needs regardless of its own story -- same defensive-default pattern as Session 35's hand-written fixtures. */
function standardAnswers(): Record<string, string> {
  return {
    "sc-defamation-publication-details": "Not applicable -- this isn't a defamation matter.",
    "sc-claim-filed": "No, I haven't filed anything with the court yet.",
    "sc-defendant-served": "No, nothing has been served yet since no claim has been filed.",
    "sc-defence-filed": "No.",
    "sc-defence-time-elapsed": "No.",
    "sc-defendant-noted-in-default": "No.",
    "sc-contractor-completion-date": "Not directly applicable to this situation, but happy to give more detail if needed.",
    "sc-contractor-notice-before-replacement": "Not applicable to this situation.",
    "sc-safety-check": "No safety concerns -- this is a straightforward payment/property dispute.",
  };
}

function dateText(i: number, uncertain: boolean): string {
  const months = ["January", "March", "April", "June", "August", "October"];
  const month = months[i % months.length];
  return uncertain
    ? `sometime in ${month} 2026 -- I don't remember the exact date`
    : `${month} ${(i % 27) + 1}, 2026`;
}

type ArchetypeParams = {
  i: number;
  amount: number;
  hasGap: boolean;
  dateUncertain: boolean;
  city: string;
};

type Archetype = {
  claimTypeId: string;
  disputeCategoryChoice: string;
  build: (params: ArchetypeParams) => {
    story: string;
    confirmedEvidenceDescriptions: string[];
    evidenceAnswer: string;
    remedyAnswer: string;
  };
};

const ARCHETYPES: Archetype[] = [
  // 1. sc-claim-unpaid-debt-services -- signal: "unpaid invoice"
  {
    claimTypeId: "sc-claim-unpaid-debt-services",
    disputeCategoryChoice: "Work done or services provided (e.g. a contractor)",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const business = ["a marketing consultancy", "a bookkeeping service", "a photography studio", "a web development shop"][i % 4];
      const items = [
        { label: "a signed services agreement", desc: `a signed services agreement setting out the ${fmtAmount(amount)} fee` },
        { label: "the invoice", desc: "the invoice for the work, itemized and dated" },
        { label: "delivery confirmation", desc: "an email thread confirming the work was delivered and received" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I run ${business}. I completed a project for a client and delivered it ${when}. This is an unpaid invoice -- ` +
          `the client never paid me the ${fmtAmount(amount)} owed. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have a signed agreement -- it was arranged informally." : ""),
        remedyAnswer: `I want the court to order the client to pay the full ${fmtAmount(amount)} owed.`,
      };
    },
  },
  // 2. sc-claim-breach-of-contract-goods -- signal: "wrong item delivered" / "product defective"
  {
    claimTypeId: "sc-claim-breach-of-contract-goods",
    disputeCategoryChoice: "A contract or agreement dispute",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the order confirmation", desc: "the order confirmation showing what was ordered and paid" },
        { label: "photos of the item received", desc: "photos showing the wrong item delivered" },
        { label: "the return request email", desc: "an email requesting a return or replacement, with no response" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I ordered custom equipment online for ${fmtAmount(amount)}, paid in full. When it arrived ${when}, it was the wrong item ` +
          `delivered -- not what I ordered at all. The seller has refused to fix it or refund me. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have the original order confirmation saved anywhere." : ""),
        remedyAnswer: `I want the court to order the seller to refund the full ${fmtAmount(amount)}.`,
      };
    },
  },
  // 3. sc-claim-non-payment-goods-sold -- signal: "sold goods and wasn't paid"
  {
    claimTypeId: "sc-claim-non-payment-goods-sold",
    disputeCategoryChoice: "Unpaid money owed to you",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the sale listing/agreement", desc: "the original sale listing describing the item and price" },
        { label: "proof of handover", desc: "a text message confirming the buyer picked up the item" },
        { label: "payment request messages", desc: "messages asking the buyer to pay as agreed" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I sold a piece of equipment to someone I found online for ${fmtAmount(amount)}. I sold goods and wasn't paid -- ` +
          `I handed the item over ${when} on the promise of e-transfer payment, and the buyer never sent it. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have the original listing saved anymore." : ""),
        remedyAnswer: `I want the court to order the buyer to pay the ${fmtAmount(amount)} owed.`,
      };
    },
  },
  // 4. sc-claim-dishonoured-nsf-cheque -- signal: "NSF cheque"
  {
    claimTypeId: "sc-claim-dishonoured-nsf-cheque",
    disputeCategoryChoice: "A loan or debt",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the NSF-marked cheque", desc: "a copy of the cheque marked NSF by the bank" },
        { label: "the bank's NSF notice", desc: "the bank's notice confirming the NSF cheque" },
        { label: "follow-up messages", desc: "follow-up messages asking for payment after the bounce" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `A former business associate gave me a cheque for ${fmtAmount(amount)} to settle a debt. It was an NSF cheque -- ` +
          `it bounced when I deposited it ${when}, and they haven't made it good since. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I no longer have a copy of the actual cheque, just my bank statement showing the bounce." : ""),
        remedyAnswer: `I want the court to order payment of the full ${fmtAmount(amount)} the cheque was for.`,
      };
    },
  },
  // 5. sc-claim-recovery-of-personal-property -- signal: "won't give my property back"
  {
    claimTypeId: "sc-claim-recovery-of-personal-property",
    disputeCategoryChoice: "Something else",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "proof of ownership", desc: "a purchase receipt proving I own the item" },
        { label: "messages asking for its return", desc: "text messages asking for the item back, with no real response" },
        { label: "photos of the item", desc: "photos of the item from before I lent it out" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I lent specialized equipment worth ${fmtAmount(amount)} to an acquaintance ${when}. They won't give my property back -- ` +
          `every time I ask, they make an excuse. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have a receipt proving I originally bought it." : ""),
        remedyAnswer: `I want the court to order the return of the item, or its value of ${fmtAmount(amount)} if it isn't returned.`,
      };
    },
  },
  // 6. sc-claim-vehicle-repair-dispute -- signal: "repair shop overcharged"
  {
    claimTypeId: "sc-claim-vehicle-repair-dispute",
    disputeCategoryChoice: "A vehicle-related dispute",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the original estimate", desc: "the shop's original written estimate" },
        { label: "the final invoice", desc: "the final invoice showing the higher charge" },
        { label: "the payment receipt", desc: "my receipt showing I paid under protest" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I took my car in for repairs and got a written estimate. The repair shop overcharged -- when I picked the car up ` +
          `${when}, the final bill was ${fmtAmount(amount)} more than the estimate, with no explanation. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I didn't keep a copy of the original written estimate." : ""),
        remedyAnswer: `I want the court to order the shop to refund the ${fmtAmount(amount)} overcharge.`,
      };
    },
  },
  // 7. sc-claim-unpaid-overtime-vacation-pay -- signal: "unpaid overtime"
  {
    claimTypeId: "sc-claim-unpaid-overtime-vacation-pay",
    disputeCategoryChoice: "Unpaid money owed to you",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "pay stubs", desc: "pay stubs showing my regular hours and pay rate" },
        { label: "my work schedule records", desc: "my own schedule records showing the extra hours worked" },
        { label: "the final paycheque", desc: "my final paycheque, with no vacation pay included" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I worked at a retail store for over a year. This is unpaid overtime -- I regularly worked more than 44 hours a week ` +
          `without extra pay, and when I left ${when}, my employer didn't pay vacation pay either, totalling ${fmtAmount(amount)}. ` +
          `I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I never kept my own pay stubs, just my bank deposit records." : ""),
        remedyAnswer: `I want the court to order payment of the ${fmtAmount(amount)} in unpaid overtime and vacation pay.`,
      };
    },
  },
  // 8. sc-claim-dog-bite-animal-injury -- signal: "dog bit me"
  {
    claimTypeId: "sc-claim-dog-bite-animal-injury",
    disputeCategoryChoice: "Something else",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the medical/vet bill", desc: `a medical bill for treatment, totalling ${fmtAmount(amount)}` },
        { label: "photos of the injury", desc: "photos of the injury taken right after it happened" },
        { label: "a witness statement", desc: "a written statement from someone who saw it happen" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `While walking in my neighborhood ${when}, a dog bit me. It was unprovoked, and the owner was right there. ` +
          `I had to get medical treatment, costing ${fmtAmount(amount)}. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I didn't get a written witness statement at the time." : ""),
        remedyAnswer: `I want the court to order the owner to pay the ${fmtAmount(amount)} in medical costs.`,
      };
    },
  },
  // 9. sc-claim-consumer-cancellation-refund -- signal: "deposit not refunded after cancelling"
  {
    claimTypeId: "sc-claim-consumer-cancellation-refund",
    disputeCategoryChoice: "A deposit that wasn't returned",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the cancellation confirmation email", desc: "an email confirming the cancellation was received" },
        { label: "the membership contract", desc: "the original membership contract showing the terms" },
        { label: "payment records", desc: `payment records showing the ${fmtAmount(amount)} deposit paid` },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I signed up for a gym membership with an upfront deposit of ${fmtAmount(amount)}. This is deposit not refunded after ` +
          `cancelling -- I cancelled within the cooling-off window ${when}, and the gym has refused to return my deposit. ` +
          `I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have a copy of the original membership contract." : ""),
        remedyAnswer: `I want the court to order the gym to refund the full ${fmtAmount(amount)} deposit.`,
      };
    },
  },
  // 10. sc-claim-unpaid-condo-common-expenses -- signal: "condo fees unpaid"
  {
    claimTypeId: "sc-claim-unpaid-condo-common-expenses",
    disputeCategoryChoice: "Unpaid money owed to you",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the fee statement/ledger", desc: `the owner's fee ledger showing ${fmtAmount(amount)} in arrears` },
        { label: "notice letters sent", desc: "copies of the arrears notice letters sent to the owner" },
        { label: "the condo declaration excerpt", desc: "an excerpt from the condo declaration showing the fee obligation" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I'm on the board of a small condo corporation. Condo fees unpaid -- one owner has fallen behind on common ` +
          `expenses since ${when}, now totalling ${fmtAmount(amount)}, despite repeated notices. We haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have a copy of the condo declaration on hand." : ""),
        remedyAnswer: `I want the court to order the owner to pay the ${fmtAmount(amount)} in arrears.`,
      };
    },
  },
  // 11. sc-claim-used-vehicle-nondisclosure -- signal: "dealer didn't disclose"
  {
    claimTypeId: "sc-claim-used-vehicle-nondisclosure",
    disputeCategoryChoice: "A consumer purchase problem",
    build: ({ i, amount, hasGap, dateUncertain }) => {
      const when = dateText(i, dateUncertain);
      const items = [
        { label: "the purchase agreement", desc: `the purchase agreement showing the ${fmtAmount(amount)} price paid` },
        { label: "the mechanic's inspection report", desc: "an independent mechanic's report showing the undisclosed damage" },
        { label: "the vehicle history report", desc: "a vehicle history report showing the prior salvage title" },
      ];
      const kept = hasGap ? items.slice(1) : items;
      return {
        story:
          `I bought a used car from a dealer for ${fmtAmount(amount)}. The dealer didn't disclose that it had a salvage ` +
          `title -- I found out ${when} from an independent inspection, well after the sale. I haven't filed anything with the court yet.`,
        confirmedEvidenceDescriptions: kept.map((k) => k.label),
        evidenceAnswer: `I have: ${kept.map((k, idx) => `(${idx + 1}) ${k.desc}`).join("; ")}.` + (hasGap ? " I don't have a copy of the original purchase agreement anymore." : ""),
        remedyAnswer: `I want the court to order the dealer to pay back the ${fmtAmount(amount)} purchase price.`,
      };
    },
  },
];

const UNDER_LIMIT_BASE = [3200, 4800, 6500, 9200, 12000, 15500, 22000, 31000, 41000, 47500];
const OVER_LIMIT_BASE = [55000, 62500, 68500, 74000, 81000, 93000, 105000, 118000];

export function generateStories(count: number): GeneratedStory[] {
  const stories: GeneratedStory[] = [];

  for (let i = 0; i < count; i += 1) {
    const archetype = ARCHETYPES[i % ARCHETYPES.length];
    const overLimit = i % 3 === 0;
    const hasGap = i % 2 === 1;
    const dateUncertain = i % 4 === 3;
    const amount = overLimit ? OVER_LIMIT_BASE[i % OVER_LIMIT_BASE.length] : UNDER_LIMIT_BASE[i % UNDER_LIMIT_BASE.length];
    const city = CITIES[i % CITIES.length];

    const built = archetype.build({ i, amount, hasGap, dateUncertain, city });

    const answers: Record<string, string> = {
      ...standardAnswers(),
      "sc-orient-when-happened": dateText(i, dateUncertain),
      "sc-orient-role": "Bringing the claim (plaintiff)",
      "sc-orient-dispute-category": archetype.disputeCategoryChoice,
      "sc-amount-claimed": fmtAmount(amount),
      "sc-evidence-available": built.evidenceAnswer,
      "sc-remedy-sought": built.remedyAnswer,
    };

    stories.push({
      id: `generated-${String(i + 1).padStart(3, "0")}-${archetype.claimTypeId.replace("sc-claim-", "")}`,
      title: `Generated story ${i + 1}: ${archetype.claimTypeId} (amount=${fmtAmount(amount)}, overLimit=${overLimit}, gap=${hasGap}, dateUncertain=${dateUncertain})`,
      story: built.story,
      evidenceItems: [],
      answers,
      location: { province: "Ontario", city },
      claimTypeId: archetype.claimTypeId,
      amount,
      overLimit,
      confirmedEvidenceDescriptions: built.confirmedEvidenceDescriptions,
      dateUncertain,
    });
  }

  return stories;
}
