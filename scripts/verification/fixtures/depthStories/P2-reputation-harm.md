
=== P2-reputation-harm ===
Defamation, paraphrased. Never says posted, said, told, wrote, shared, published.

general intake: 10 turns, halted=false, complete=true

exact matchClaimType   : (none)
AI suggestion          : sc-claim-defamation-libel-slander (Defamation (libel or slander))
confirmation outcome   : confirmed
claim type established : sc-claim-defamation-libel-slander via confirmed-suggestion

--- SUPPRESSED (0) ---
  (none)

--- NO QUESTION NEEDED (1) ---
  amount-within-jurisdiction-defamation

--- UNAUTHORED, attestation only (1) ---
  limitation-if-newspaper-or-broadcast

--- DEFERRED past budget (0) ---
  (none)

--- ASKED (2) ---

  Q1 [depth-defamation-communicated] -> statement-made-and-communicated
    SPEC TEXT  : Apart from you, who saw or heard {subjectLabel}?
    SHOWN TEXT : Apart from you, who saw or heard the accusation?
    slots defaulted: (none - all filled from user)
    answer     : Everyone in the building group could see it, maybe two hundred people, and my neighbour Rita saw it first.
    -> state   : provided
    lead-in for next (model-authored, NOT question text): It sounds like you've been dealing with a challenging situation regarding your reputation and lost work over the past couple of months. I understand that you’re seeking to have the harmful content removed and to be compensated for your losses. To better understand your case, can you tell me if this involved a newspaper or a broadcast?

  Q2 [depth-defamation-newspaper-notice] -> notice-if-newspaper-or-broadcast
    SPEC TEXT  : Did this involve a newspaper or a broadcast?
    SHOWN TEXT : Did this involve a newspaper or a broadcast?
    slots defaulted: (none - all filled from user)
    answer     : No, it was just the residents' group online. Nothing in the paper or on the radio.
    -> state   : provided

--- FINAL ELEMENT STATE MAP ---
  provided        statement-made-and-communicated  via depth-answer
  not-yet         amount-within-jurisdiction-defamation
  provided        notice-if-newspaper-or-broadcast  via depth-answer
  not-yet         limitation-if-newspaper-or-broadcast
