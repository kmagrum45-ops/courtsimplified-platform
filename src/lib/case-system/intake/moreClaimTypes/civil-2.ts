/**
 * Case types, batch "civil-2" (civil): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/civil-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   civil-claim-mortgage-enforcement -- A lender enforcing a mortgage (power of sale)
 *   civil-claim-partition-or-sale-of-property -- Co-owners who cannot agree: partition or sale of property
 *   civil-claim-adverse-possession-or-boundary -- A boundary or land dispute
 *   civil-claim-estate-dispute-will-challenge -- Challenging a will or how an estate is handled
 *   civil-claim-dependant-support-from-estate -- Support from the estate of someone who supported you
 *   civil-claim-power-of-attorney-accounting -- An attorney or guardian who must account for money they managed
 *   civil-claim-fraudulent-conveyance -- A debtor moved property to avoid paying
 *   civil-claim-oppression-shareholder -- A company's owners or managers treating a shareholder unfairly
 *   civil-claim-employment-human-rights-damages -- Discrimination at work (court claim with another cause of action)
 *   civil-claim-enforcing-a-judgment -- Collecting on a Superior Court judgment
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_CIVIL_2: ClaimType[] = [];
