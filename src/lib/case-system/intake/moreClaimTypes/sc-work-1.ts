/**
 * Case types, batch "sc-work-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-work-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-unpaid-tips -- Unpaid tips
 *   sc-claim-unpaid-severance -- Unpaid severance or termination pay
 *   sc-claim-unpaid-bonus-after-termination -- A bonus or commission unpaid after leaving
 *   sc-claim-contractor-misclassification -- Being treated as a contractor when you were not
 *   sc-claim-gig-platform-payment -- A gig platform that will not pay
 *   sc-claim-caregiver-or-domestic-worker-unpaid -- A nanny, caregiver or domestic worker unpaid
 *   sc-claim-employer-suing-former-employee -- An employer suing a former employee
 *   sc-claim-bad-reference-or-employer-defamation -- Something untrue said by an employer
 *   sc-claim-non-compete-or-non-solicit -- A non-compete or non-solicit clause
 */

import type { ClaimType } from "../claimTypes";

export const TYPES_SC_WORK_1: ClaimType[] = [];
