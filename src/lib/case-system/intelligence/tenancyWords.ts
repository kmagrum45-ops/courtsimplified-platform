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
