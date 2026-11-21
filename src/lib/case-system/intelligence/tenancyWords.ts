/**
 * The words that mark a lease as commercial, and the words that keep it residential: one list, read by the keyword
 * pass (conversationIntelligenceEngine.ts inferCourtArea) and the tribunal guard (tribunalSignals.ts
 * isCommercialTenancyOnly), which until 9 Nov 2026 each held their own copy.
 *
 * Why it matters: the Residential Tenancies Act, 2006 s. 3 (1) "applies with respect to rental units in residential
 * complexes" (docs/sources/corpus, e-Laws 06r17_e.doc), so a commercial lease is not the Landlord and Tenant Board's.
 * Only a business renting commercial space is excluded (site owner, 10 Nov 2026): a shop, a warehouse, an office, "my
 * company is the tenant". Who the landlord is never makes a lease commercial: a residential tenant whose landlord is a
 * company, a numbered company or a property manager is the LTB's. So there is no "business landlord" here, and no bare
 * "my company" / "my business" (a tenant can name their own job in a story about their apartment).
 */
export const COMMERCIAL_TENANCY_WORDS = [
  "commercial",
  "strip mall",
  "storefront",
  "retail unit",
  "office space",
  "my restaurant",
  "my store",
  "my shop",
  "business premises",
  "warehouse",
  "rent a shop",
  "lease a shop",
  "a shop for",
  "an office",
  "commercial space",
  "my company rents",
  "my company leases",
  "my company is the tenant",
  "for my business",
  "for my company",
] as const;

export const RESIDENTIAL_TENANCY_WORDS = ["apartment", "residential", "rental unit", "basement", "my home", "house i rent"] as const;

/**
 * A tenancy word alone is not a tenancy dispute (site owner, 10 Nov 2026). "I rent an apartment and a stranger hit my
 * parked car", "I rent an apartment and my neighbour's dog bit me" and "I sold my cousin a car and he owes me $2,000
 * (he is also my landlord)" name the person's rented home or their landlord, but the dispute is a car accident, a dog
 * bite and a sale: nothing about the tenancy, and they were sent to the LTB. The LTB is named only when the story also
 * says what is wrong with the tenancy: the unit's condition or repairs, the rent, an eviction or notice to end, the
 * deposit, a lock-out, the landlord entering, or the board itself. A matching rule, not a statement of law: the notice's
 * text is still the forum's own sourced redirectMessage, and the person can continue either way (s. 4).
 *
 * Read by the keyword pass only (conversationIntelligenceEngine.ts inferCourtArea: no dispute signal, no LTB score),
 * which the shared rule (fixedRegimes.ts exclusiveTribunalFor) and the court-path classifier both use. A model's own
 * LTB answer is not refused by it: the model has read the whole story, and the classifier's "already in Small Claims"
 * override needs that answer.
 */
const TENANCY_DISPUTE_SIGNALS: readonly RegExp[] = [
  /\bmou?ld\b/, /\brepairs?\b/, /\bmaintenance\b/, /\b(?:won'?t|will not|refuses? to|doesn'?t|does not|didn'?t|did not) fix\b/,
  /\b(?:no|broken|without) (?:heat|hot water|water|electricity|power)\b/, /\bheat(?:er|ing)?\b[^.?!]{0,40}\bbroken\b/, /\bbroken\b[^.?!]{0,40}\bheat(?:er|ing)?\b/,
  /\bleak(?:s|ing|y)?\b/, /\bpests?\b/, /\bbed ?bugs?\b/, /\bcockroach(?:es)?\b/, /\bmice\b/, /\brats\b/, /\binfestation\b/,
  /\b(?:the|my|our|his|her|their|unpaid|back|late|monthly|last month'?s) rent\b/, /\brent (?:increase|arrears|owing|owed|is|was|for)\b/,
  /\b(?:pay|paid|paying|pays|raised|raise|raising|increased|increase) (?:the |my |his |her |their )?rent\b/, /\bmonths? of rent\b/,
  /\bevict(?:ed|ing|ion|s)?\b/, /\bnotice to (?:end|terminate|vacate)\b/, /\b(?:end|terminate|break|breaking) (?:the|my|our) (?:tenancy|lease)\b/, /\bn(?:4|5|12|13)\b/,
  /\bdeposit\b/, /\blocked (?:me|us) out\b/, /\bchanged the locks\b/,
  /\b(?:entered|enters|entering|came into|comes into) (?:my|our|the) (?:unit|apartment|home|room)\b/, /\bwithout (?:notice|permission)\b/,
  /\bharass(?:ed|es|ing|ment)?\b/, /\bvital services\b/, /\butilities\b/,
  /\bltb\b/, /\blandlord and tenant board\b/,
];

export function hasTenancyDisputeSignal(story: string): boolean {
  const normalized = story.toLowerCase();
  return TENANCY_DISPUTE_SIGNALS.some((signal) => signal.test(normalized));
}
