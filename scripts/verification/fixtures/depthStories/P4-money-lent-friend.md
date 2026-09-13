
=== P4-money-lent-friend ===
Personal loan, paraphrased. Never says loan, lent, borrowed, repay, agreed.

general intake: 11 turns, halted=false, complete=true

exact matchClaimType   : (none)
AI suggestion          : sc-claim-unpaid-debt-services (Unpaid debt or non-payment for services)
confirmation outcome   : confirmed
claim type established : sc-claim-unpaid-debt-services via confirmed-suggestion

--- SUPPRESSED (0) ---
  (none)

--- NO QUESTION NEEDED (0) ---
  (none)

--- UNAUTHORED, attestation only (0) ---
  (none)

--- DEFERRED past budget (0) ---
  (none)

--- ASKED (3) ---

  Q1 [depth-debt-agreement] -> existed-agreement-or-understanding
    SPEC TEXT  : How was the arrangement with {defendantLabel} set up?
    SHOWN TEXT : How was the arrangement with my cousin set up?
    slots defaulted: (none - all filled from user)
    answer     : I am not sure about that one.
    -> state   : cannot-provide  (I-don't-know resolved)
    lead-in for next (model-authored, NOT question text): Thank you for sharing the details about your situation. It sounds like you’re looking to resolve an issue that’s been on your mind for a couple of months now. Can you tell me what you provided, and when?

  Q2 [depth-debt-work-done] -> services-or-money-provided
    SPEC TEXT  : What did you provide, and when?
    SHOWN TEXT : What did you provide, and when?
    slots defaulted: (none - all filled from user)
    answer     : I am not sure about that one.
    -> state   : cannot-provide  (I-don't-know resolved)
    lead-in for next (model-authored, NOT question text): Thank you for sharing your situation with me. It sounds like you’re looking to resolve this matter and get your money back. To better understand your case, could you tell me if any part of the $3,500 has been paid?

  Q3 [depth-debt-amount-unpaid] -> amount-unpaid
    SPEC TEXT  : Has any part of {amountLabel} been paid?
    SHOWN TEXT : Has any part of the $3,500 been paid?
    slots defaulted: (none - all filled from user)
    answer     : I am not sure about that one.
    -> state   : cannot-provide  (I-don't-know resolved)

--- FINAL ELEMENT STATE MAP ---
  cannot-provide  existed-agreement-or-understanding
  cannot-provide  services-or-money-provided
  cannot-provide  amount-unpaid
