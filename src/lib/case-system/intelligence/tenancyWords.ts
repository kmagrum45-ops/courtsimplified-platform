/**
 * The words that mark a lease as commercial, and the words that keep it residential: one list, read by the keyword
 * pass (conversationIntelligenceEngine.ts inferCourtArea) and the tribunal guard (tribunalSignals.ts
 * isCommercialTenancyOnly), which until 9 Nov 2026 each held their own copy.
 *
 * Why it matters: the Residential Tenancies Act, 2006 s. 3 (1) "applies with respect to rental units in residential
 * complexes" (docs/sources/corpus, e-Laws 06r17_e.doc), so a commercial lease is not the Landlord and Tenant Board's.
 * "business landlord", "warehouse", "my company" and "my business" were added with the C1 tribunal-first check: a
 * deposit kept by a business landlord on warehouse space for a company was named the LTB on the word "landlord".
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
  "business landlord",
  "warehouse",
  "my company",
  "my business",
] as const;

export const RESIDENTIAL_TENANCY_WORDS = ["apartment", "residential", "rental unit", "basement", "my home", "house i rent"] as const;
