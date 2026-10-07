/**
 * Case types, batch "civil-1" (civil): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/civil-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   civil-claim-car-accident-injury -- Injury in a car accident (suing the at-fault driver)
 *   civil-claim-occupier-injury -- Injured on someone else's property (Superior Court)
 *   civil-claim-medical-or-professional-negligence -- Harm from a professional's careless work (Superior Court)
 *   civil-claim-claim-against-government -- Suing the Ontario government or a Crown agency
 *   civil-claim-claim-against-municipality -- Suing a city or town (road, sidewalk or service)
 *   civil-claim-dog-bite-injury -- Injured by a dog (Superior Court)
 *   civil-claim-assault-and-battery -- Someone hurt you on purpose (assault and battery, civil claim)
 *   civil-claim-privacy-intrusion -- Your privacy was invaded
 *   civil-claim-insurance-claim-denied -- Your insurer refused a claim
 *   civil-claim-construction-lien -- Enforcing or fighting a construction lien
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_CIVIL_1: ClaimType[] = [];
