import type { Fixture } from "./fixtureTypes";

/**
 * GAP fixture -- the same kind of claim as unpaidInvoiceClean.fixture.ts
 * (an unpaid invoice for services), but deliberately missing one document
 * that matters (no written agreement -- verbal only) and containing one
 * date the user states as uncertain (doesn't remember exactly when the
 * work was finished). All facts fabricated.
 */
export const unpaidInvoiceGapFixture: Fixture = {
  id: "unpaid-invoice-gap",
  title: "Unpaid invoice, missing agreement + uncertain date (GAP)",
  story:
    "I do small handyman jobs. A homeowner, the Whitfields, called me about repairing their deck. " +
    "We agreed over the phone on $3,200 for materials and labour -- there was never anything in " +
    "writing, just the phone call. I finished the deck repairs sometime in early spring, but I " +
    "honestly don't remember the exact date anymore. I sent them an invoice for $3,200 afterward " +
    "and it's an unpaid invoice -- they never paid me anything. I followed up once by text message " +
    "asking about payment and never heard back. I haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "invoice-final.jpg",
      type: "Photo (JPG)",
      description: "Photo of the handwritten invoice for $3,200.",
    },
    {
      filename: "deck-finished-photo.jpg",
      type: "Photo (JPG)",
      description: "Photo of the completed deck repair, showing the finished work.",
    },
    {
      filename: "text-message-followup.png",
      type: "Screenshot (PNG)",
      description: "Screenshot of one follow-up text message asking about payment, no reply visible.",
    },
    // Deliberately no written-agreement item, and no communication showing the
    // original terms -- that's the one gap this fixture is built to test. Proof
    // the work happened (deck-finished-photo.jpg) and proof the amount is
    // unpaid (invoice-final.jpg) are both present, so only the "an agreement or
    // understanding existed" element is left thin.
  ],
  answers: {
    "sc-orient-when-happened": "Sometime in early spring 2026 -- I don't remember the exact date the work was finished.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Work done or services provided (e.g. a contractor)",
    "sc-amount-claimed": "$3,200",
    "sc-defamation-publication-details": "Not applicable -- this isn't a defamation matter.",
    "sc-claim-filed": "No, I haven't filed anything with the court yet.",
    "sc-defendant-served": "No, nothing has been served yet since no claim has been filed.",
    "sc-defence-filed": "No.",
    "sc-defence-time-elapsed": "No.",
    "sc-defendant-noted-in-default": "No.",
    "sc-contractor-completion-date":
      "We agreed on the work over a phone call, there was never anything in writing. I finished the deck repairs sometime in early spring, but I don't remember the exact date. The Whitfields stopped responding after I sent the invoice.",
    "sc-contractor-notice-before-replacement":
      "Not applicable -- I completed the work myself; I didn't need to hire anyone else to finish it. I did follow up once by text message asking about payment.",
    "sc-evidence-available":
      "I have three things: (1) invoice-final.jpg, a photo of the handwritten invoice for $3,200; (2) deck-finished-photo.jpg, a photo of the completed deck repair showing the finished work; (3) text-message-followup.png, a screenshot of one follow-up text message asking about payment. I don't have anything in writing showing the original agreement -- it was all arranged over a phone call.",
    "sc-remedy-sought": "I want the court to order the Whitfields to pay the $3,200 owed for the deck repair work.",
    "sc-safety-check": "No safety concerns -- this is a straightforward payment dispute.",
  },
  location: { province: "Ontario", city: "London" },
};
