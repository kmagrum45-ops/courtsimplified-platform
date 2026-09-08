import type { Fixture } from "./fixtureTypes";

/**
 * WRONG-FORUM fixture -- deliberately the SAME kind of claim as the other
 * two (an unpaid invoice for services rendered under a signed contract),
 * with the amount as the ONLY substantive variable changed, so the harness
 * isolates whether the over-limit warning fires because of the dollar
 * figure specifically, not because the underlying claim shape is
 * different. $68,500 is chosen to clearly exceed Ontario's Small Claims
 * Court limit of $50,000 (effective October 1, 2025) -- verified fresh
 * this session directly against ontario.ca, not assumed from an earlier
 * session's citation; see unpaidInvoiceClean.expected.md's sibling
 * expectations file for the citation. All facts fabricated.
 */
export const overLimitContractFixture: Fixture = {
  id: "over-limit-contract",
  title: "Unpaid invoice, amount exceeds the Small Claims limit (WRONG-FORUM)",
  story:
    "I run a catering company. We signed a contract with an event venue to cater a series of " +
    "corporate events through the summer, for a total contract value of $68,500. We delivered the " +
    "first two events as agreed. Before the remaining events, the venue cancelled the rest of the " +
    "contract on June 12, 2026, and is refusing to pay the outstanding balance. This is an unpaid " +
    "invoice -- they owe me $68,500 for the work under the signed contract. I haven't filed " +
    "anything with the court yet.",
  evidenceItems: [
    {
      filename: "catering-contract-signed.pdf",
      type: "PDF",
      description: "Signed catering services contract for the full event series, total value $68,500.",
    },
    {
      filename: "delivered-invoices.pdf",
      type: "PDF",
      description: "Invoices for the two events already delivered.",
    },
    {
      filename: "cancellation-email.pdf",
      type: "PDF (email export)",
      description: "The venue's email cancelling the remaining events and refusing to pay the outstanding balance.",
    },
  ],
  answers: {
    "sc-orient-when-happened": "The venue cancelled the remaining events on June 12, 2026, after we'd already delivered the first two.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Work done or services provided (e.g. a contractor)",
    "sc-amount-claimed": "$68,500",
    "sc-defamation-publication-details": "Not applicable -- this isn't a defamation matter.",
    "sc-claim-filed": "No, I haven't filed anything with the court yet.",
    "sc-defendant-served": "No, nothing has been served yet since no claim has been filed.",
    "sc-defence-filed": "No.",
    "sc-defence-time-elapsed": "No.",
    "sc-defendant-noted-in-default": "No.",
    "sc-contractor-completion-date":
      "The signed contract set a series of event dates through the summer. We delivered the first two events on schedule, then the venue cancelled the rest on June 12, 2026, before the remaining agreed dates.",
    "sc-contractor-notice-before-replacement":
      "Not applicable -- this is a cancelled contract dispute, not a situation where I needed to hire someone else to finish work.",
    "sc-evidence-available":
      "I have three things: (1) catering-contract-signed.pdf, the signed catering services contract for the full event series, total value $68,500; (2) delivered-invoices.pdf, invoices for the two events already delivered; (3) cancellation-email.pdf, the venue's email cancelling the remaining events and refusing to pay the outstanding balance.",
    "sc-remedy-sought": "I want the court to order the venue to pay the outstanding $68,500 balance owed under the signed contract.",
    "sc-safety-check": "No safety concerns -- this is a business contract payment dispute.",
  },
  location: { province: "Ontario", city: "Toronto" },
};
