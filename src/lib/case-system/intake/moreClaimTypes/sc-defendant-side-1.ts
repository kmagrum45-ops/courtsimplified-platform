/**
 * Case types, batch "sc-defendant-side-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-defendant-side-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-defence-served-and-confused -- Being served and not understanding the papers
 *   sc-defence-sued-for-something-you-did-not-do -- Being sued for something you did not do
 *   sc-defence-sued-for-more-than-owed -- Being sued for more than you owe
 *   sc-defence-want-to-claim-back -- Wanting to claim back against the person suing you
 *   sc-defence-sued-in-the-wrong-place -- Being sued in the wrong court or place
 *   sc-defence-default-judgment-against-you -- A judgment made without you there
 *   sc-defence-wages-or-bank-account-garnished -- Wages or a bank account being taken
 *   sc-defence-writ-against-property -- A writ registered against your property
 *   sc-defence-examination-hearing-summons -- A summons to an examination hearing
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_SC_DEFENDANT_SIDE_1: ClaimType[] = [];
