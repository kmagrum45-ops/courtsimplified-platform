
=== P3-work-left-damage ===
Contractor damage, paraphrased. Never says quote, damage, estimate, repair.

general intake: 11 turns, halted=false, complete=true

exact matchClaimType   : (none)
AI suggestion          : sc-claim-contractor-damage (Damage caused by a contractor's work)
confirmation outcome   : confirmed
claim type established : sc-claim-contractor-damage via confirmed-suggestion

--- SUPPRESSED (2) ---
  work-caused-damage  [depth-contractor-damage]
    matched terms: redo
    from the user's words: "I had someone in to redo the tiling in my upstairs bathroom."
  loss-amount-contractor  [depth-contractor-loss]
    matched terms: cost
    from the user's words: "I want what it cost me to put right."

--- NO QUESTION NEEDED (1) ---
  amount-within-jurisdiction-contractor

--- UNAUTHORED, attestation only (0) ---
  (none)

--- DEFERRED past budget (0) ---
  (none)

--- ASKED (1) ---

  Q1 [depth-contractor-agreement] -> existed-agreement-contractor
    SPEC TEXT  : What was agreed with {defendantLabel} about the work?
    SHOWN TEXT : What was agreed with the tiler about the work?
    slots defaulted: (none - all filled from user)
    answer     : He wrote the price on a piece of paper and I said go ahead. That was all.
    -> state   : provided

--- FINAL ELEMENT STATE MAP ---
  provided        existed-agreement-contractor  via depth-answer
  provided        work-caused-damage  via user-story
  provided        loss-amount-contractor  via user-story
  not-yet         amount-within-jurisdiction-contractor
