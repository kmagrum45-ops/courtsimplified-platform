/**
 * THE DEADLINES BLOCK'S ITEMS (site owner, 27 Nov 2026, block table row D). Of the 35 catalogue items the generator marks
 * as notices or time limits (catalogueConditions.generated.ts DEADLINE_LINE_ITEMS), each is KEPT or CUT here, by hand,
 * with its reason (for review only; `why` is never shown to anyone using the site). The owner's test: cut anything that has no stated period, or no notice to be given by a date.
 *
 * A kept item is drawn in the one deadlines block, one line each, each distinct deadline once, soonest first, in its own
 * stored words (no wording changes). `days` is the item's shortest stated period, in days, only to order the lines; it
 * is never shown. `sameAs` marks a second item stating the same deadline for the same claim type: it is not drawn again.
 *
 * Listed in docs/acceptance/sc-deadline-items.md (scripts/content/writeDeadlineItems.ts), for the owner's review.
 * test:sc-results checks that every DEADLINE_LINE_ITEMS key is decided here exactly once.
 */
export type DeadlineDecision =
  | { keep: true; days: number; why: string }
  | { keep: false; why: string; sameAs?: string };

export const DEADLINE_DECISIONS: Record<string, DeadlineDecision> = {
  "sc-claim-slip-and-fall-occupier-liability|element|notice-if-snow-or-ice": { keep: true, days: 60, why: "written notice of the claim within 60 days after the injury (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-slip-and-fall-occupier-liability|note|1": { keep: false, why: "the same 60-day snow-and-ice notice as the element above, for the same claim type", sameAs: "sc-claim-slip-and-fall-occupier-liability|element|notice-if-snow-or-ice" },
  "sc-claim-wrongful-dismissal|element|minimum-employment-length": { keep: false, why: "a three-month length of employment the Act's standard applies from; no notice anyone must give by a date" },
  "sc-claim-wrongful-dismissal|element|notice-or-pay-not-given": { keep: false, why: "the termination notice the employer owed is what the claim is about (the entitlement), not a deadline anyone must still meet" },
  "sc-claim-used-vehicle-nondisclosure|note|0": { keep: true, days: 730, why: "written notice of the claim to the registrar within two years (O. Reg. 333/08 s. 80)" },
  "sc-claim-unpaid-condo-common-expenses|note|1": { keep: false, why: "notice to encumbrancers on or before the day the certificate is registered: no stated period" },
  "sc-claim-unpaid-condo-common-expenses|note|2": { keep: true, days: 90, why: "the lien expires three months after the default unless a certificate is registered; written notice to the owner at least 10 days before (Condominium Act, 1998, s. 85)" },
  "sc-claim-online-purchase-not-delivered|element|cancellation-right-and-notice-remote": { keep: true, days: 7, why: "notice of cancellation within the stated periods (7 days, 15 days, 30 days or one year, depending on what the supplier failed to do)" },
  "sc-claim-online-purchase-not-delivered|note|0": { keep: true, days: 60, why: "a written request to the credit card issuer within 60 days (Consumer Protection Act, 2002, s. 99 (1))" },
  "sc-claim-repairer-or-storer-holding-property|element|limits-on-lien-repairlien": { keep: true, days: 60, why: "a storer who received the article from someone other than its owner gives written notice within 60 days (Repair and Storage Liens Act s. 4 (4))" },
  "sc-claim-repairer-or-storer-holding-property|note|1": { keep: true, days: 15, why: "notice of sale at least 15 days before the sale, after the 60-day period (Repair and Storage Liens Act s. 3 (3) and the sale provisions)" },
  "sc-claim-real-estate-deposit-dispute|element|condo-rescission-red": { keep: true, days: 10, why: "rescission of a new condominium purchase within 10 days" },
  "sc-claim-private-career-college-refund|element|two-day-rescission-pcc": { keep: true, days: 2, why: "cancellation within two days after receiving a copy of the contract" },
  "sc-claim-insurance-claim-denied|consideration|condition-not-met-ins": { keep: false, why: "no stated period" },
  "sc-claim-bank-error-or-unauthorized-transaction|element|lost-or-stolen-card-bnk": { keep: false, why: "no stated period" },
  "sc-claim-snow-plow-or-municipal-works-damage|note|0": { keep: true, days: 10, why: "written notice of the claim to the municipality within 10 days after the injury (Municipal Act, 2001, s. 44 (10))" },
  "sc-claim-fall-in-a-parking-lot-or-plaza|note|0": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-fall-at-a-rental-property|note|1": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-fall-at-a-municipal-facility|consideration|sidewalk-or-road-scmuni": { keep: true, days: 10, why: "written notice to the municipality within 10 days after the injury, for a fall on a public sidewalk or road (Municipal Act, 2001, s. 44 (10))" },
  "sc-claim-fall-at-a-municipal-facility|note|0": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-injury-at-a-business-or-event|note|0": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-injury-from-a-falling-object|note|0": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-injury-on-public-transit|consideration|sidewalk-or-road-sctransit": { keep: true, days: 10, why: "written notice to the municipality within 10 days after the injury, for an injury at a stop on a public sidewalk or road (Municipal Act, 2001, s. 44 (10))" },
  "sc-claim-injury-on-public-transit|note|0": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1))" },
  "sc-claim-unpaid-severance|element|notice-or-pay-owed-severance": { keep: false, why: "the notice and severance the employer owed are what the claim is about; \"within six months\" is part of a severance condition, not a deadline" },
  "sc-claim-unpaid-severance|consideration|exempt-from-notice-severance": { keep: false, why: "a three-month length of employment, not a notice anyone must give by a date" },
  "sc-claim-contractor-misclassification|element|standard-not-given-misclass": { keep: false, why: "a three-month length of employment, not a notice anyone must give by a date" },
  "sc-claim-against-a-municipality-other|note|0": { keep: true, days: 10, why: "written notice of the claim to the municipality within 10 days after the injury (Municipal Act, 2001, s. 44 (10))" },
  "sc-claim-hit-and-run-or-uninsured-driver|note|1": { keep: true, days: 120, why: "notice within 120 days after the incident (Insurance Act s. 258.3 (1))" },
  "sc-defence-sued-by-a-collection-agency|element|who-the-agency-is": { keep: false, why: "no stated period" },
  "sc-defence-sued-as-parent-owner-or-employer|note|1": { keep: true, days: 60, why: "the 60-day snow-and-ice written notice (Occupiers' Liability Act s. 6.1 (1)); on the defence side it is the other side's notice" },
  "sc-claim-funeral-or-cemetery-dispute|element|contract-requirements-fun": { keep: false, why: "the cancellation may be given at any time; the 30 days is the operator's refund, not a notice by a date" },
  "sc-claim-funeral-or-cemetery-dispute|element|cooling-off-fun": { keep: true, days: 30, why: "cancellation by written notice within 30 days" },
  "sc-claim-funeral-or-cemetery-dispute|element|later-cancellation-fun": { keep: false, why: "a later cancellation has no stated period; the 30 days is the operator's refund, not a notice by a date" },
  "sc-claim-financial-advisor-or-mortgage-broker|note|1": { keep: true, days: 7, why: "written notice of rescission within 60 days after delivery of the security, or 7 days after the confirmation; no action more than 90 days after the notice (Securities Act s. 136)" },
};
