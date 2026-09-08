import type { Fixture } from "./fixtureTypes";

/**
 * CLEAN fixture -- an unpaid invoice for services, complete evidence, no
 * ambiguity. All facts fabricated.
 */
export const unpaidInvoiceCleanFixture: Fixture = {
  id: "unpaid-invoice-clean",
  title: "Unpaid invoice, complete evidence (CLEAN)",
  story:
    "I run a small graphic design business. Back in March I signed a services agreement with a " +
    "local business, Cedar & Co., to design their full brand identity for a fee of $8,400, due " +
    "within 15 days of delivery. I delivered all the final files on April 10, 2026, and they " +
    "confirmed receiving everything by email that same day. This is an unpaid invoice -- Cedar & " +
    "Co. never paid me anything. I sent two written demand emails, on April 28 and May 15, 2026, " +
    "asking for payment, and never got a response. I haven't filed anything with the court yet.",
  evidenceItems: [
    {
      filename: "service-agreement-signed.pdf",
      type: "PDF",
      description: "Signed services agreement dated March 3, 2026, both parties' signatures, states scope and $8,400 fee.",
    },
    {
      filename: "invoice-2026-014.pdf",
      type: "PDF",
      description: "The invoice itself, dated April 10, 2026, for $8,400, due April 25, 2026.",
    },
    {
      filename: "delivery-email-thread.pdf",
      type: "PDF (email export)",
      description: "Email thread confirming the final files were delivered and received April 10, 2026.",
    },
    {
      filename: "demand-letters.pdf",
      type: "PDF (email export)",
      description: "Two written demand emails, sent April 28 and May 15, 2026, asking for payment.",
    },
  ],
  answers: {
    "sc-orient-when-happened": "The work was delivered on April 10, 2026, with payment due 15 days later.",
    "sc-orient-role": "Bringing the claim (plaintiff)",
    "sc-orient-dispute-category": "Work done or services provided (e.g. a contractor)",
    "sc-amount-claimed": "$8,400",
    "sc-defamation-publication-details": "Not applicable -- this isn't a defamation matter.",
    "sc-claim-filed": "No, I haven't filed anything with the court yet.",
    "sc-defendant-served": "No, nothing has been served yet since no claim has been filed.",
    "sc-defence-filed": "No.",
    "sc-defence-time-elapsed": "No.",
    "sc-defendant-noted-in-default": "No.",
    "sc-contractor-completion-date":
      "The agreed completion date was April 10, 2026, when I delivered all the final files. Cedar & Co. stopped responding shortly after that date passed without payment.",
    "sc-contractor-notice-before-replacement":
      "Not applicable -- I completed and delivered the work myself; no one else needed to finish it. I sent two written demand emails asking for payment instead.",
    "sc-evidence-available":
      "I have four things: (1) service-agreement-signed.pdf, a signed services agreement dated March 3, 2026, both parties' signatures, stating the scope and the $8,400 fee; (2) invoice-2026-014.pdf, the invoice dated April 10, 2026, for $8,400, due April 25, 2026; (3) delivery-email-thread.pdf, an email thread confirming the final files were delivered and received April 10, 2026; (4) demand-letters.pdf, two written demand emails sent April 28 and May 15, 2026 asking for payment.",
    "sc-remedy-sought": "I want the court to order Cedar & Co. to pay the full $8,400 owed, plus my court costs.",
    "sc-safety-check": "No safety concerns -- this is a straightforward business payment dispute.",
  },
  location: { province: "Ontario", city: "Ottawa" },
};
