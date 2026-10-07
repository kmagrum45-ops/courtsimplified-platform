/**
 * Case types, batch "sc-money-owed-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-money-owed-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-guarantor-or-cosigner-pursued -- Being chased for a loan you co-signed
 *   sc-claim-etransfer-sent-in-error -- An e-transfer sent to the wrong person
 *   sc-claim-deposit-not-returned -- A deposit nobody gave back
 *   sc-claim-overpayment-not-refunded -- An overpayment or duplicate payment not refunded
 *   sc-claim-unpaid-commission-or-expenses -- Unpaid commission, bonus or expenses
 *   sc-claim-settlement-agreement-unpaid -- Money owed under a settlement or repayment agreement
 *   sc-claim-promissory-note-unpaid -- An unpaid promissory note
 *   sc-claim-joint-expense-share -- Someone's share of a shared cost
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_SC_MONEY_OWED_1: ClaimType[] = [];
