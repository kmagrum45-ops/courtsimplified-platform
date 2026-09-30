/**
 * The story set for the story review battery (runStoryReview.ts).
 *
 * WHY THIS SET EXISTS (2026-09-28). The site owner ran one realistic story
 * through the guided intake by hand -- a customer suing a Kijiji contractor
 * who quit halfway -- and found problems no suite had caught: questions the
 * story had already answered, a claim type for the wrong side of the dispute,
 * nothing asking for the receipt or the other party's address. Every existing
 * battery used plaintiff-side service stories written to exercise one rule at
 * a time. These are written the way people actually write, across Small
 * Claims, civil and family, both sides, with one safety story and one story
 * that belongs at a tribunal.
 *
 * EXPECTATIONS ARE COMMITTED BEFORE ANY RUN. Each `expect` block says what a
 * careful human helper would do with the story. When the pipeline disagrees,
 * the report says so; the fix goes in the product or, with a written reason,
 * here. Never edit an expectation just to make a report go quiet.
 *
 * These are fabricated stories. No real person, business or case.
 */

import type { SafetyClassification } from "../../../src/lib/case-system/intake/safetyPass";

export type ReviewArea = "small-claims" | "civil" | "family" | "tribunal";
export type ReviewSide = "plaintiff" | "defendant" | "applicant" | "respondent";

export type ReviewStory = {
  id: string;
  area: ReviewArea;
  side: ReviewSide;
  /** One line for the report. */
  note: string;
  story: string;
  /** Answers for bank questions this story's person would give; overrides the side defaults. */
  answers?: Record<string, string>;
  /** Answers for depth questions, by depth question id. Unlisted ones get "I'm not sure." */
  depthAnswers?: Record<string, string>;
  expect: {
    /** Acceptable primaryPath values from the court-path classifier. */
    courtPath: string[];
    safety: SafetyClassification[];
    /** Small Claims only. Acceptable claim type ids; any one counts. */
    claimTypes?: string[];
    /**
     * Bank questions the story plainly answers. Each must either be offered
     * back for confirmation from the story, or not asked at all. Asking one
     * again is the "you already told us that" failure.
     */
    answeredByStory?: string[];
    /** Small Claims only: "plaintiff" or "defendant", the side the teller is on. */
    role?: "plaintiff" | "defendant";
    /**
     * Findings a careful reader of the confirmed case would raise. Each is a
     * finding kind, optionally with words one of its quotes must contain.
     */
    reviewShouldRaise?: { kind: string; quoteIncludes?: string }[];
    /** Set when the story asks for legal advice ("do I have a case"); the notice must show. */
    asksForAdvice?: boolean;
    /** Questions that must never be asked of this person (asked = shown as a question). */
    mustNotAsk?: string[];
    /** Questions this person must reach, asked or offered from the story. */
    mustReach?: string[];
    /**
     * Matter kinds the story plainly contains (crossForumNotes.ts IssueKind).
     * Each must be among the classifier's listed issues. Checked only when
     * the model ran; other kinds may also appear.
     */
    matterKinds?: string[];
    /** Connection notes the story's topics must select. Others may also appear. */
    notes?: string[];
  };
};

export const PLAINTIFF_DEFAULTS: Record<string, string> = {
  "sc-orient-when-happened": "Earlier this year.",
  "sc-orient-role": "Bringing the claim (plaintiff)",
  "sc-orient-dispute-category": "Something else",
  "sc-claim-filed": "No, I haven't filed anything yet.",
  "sc-defendant-served": "No, nothing has been filed yet.",
  "sc-defence-filed": "No.",
  "sc-defence-time-elapsed": "Not applicable, nothing is filed.",
  "sc-defendant-noted-in-default": "No.",
  "sc-contractor-completion-date": "I'm not sure.",
  "sc-contractor-notice-before-replacement": "I'm not sure.",
  "sc-safety-check": "No, I feel safe.",
  "sc-amount-claimed": "I'm not sure yet.",
  "sc-evidence-available": "Some messages.",
  "sc-remedy-sought": "I want my money back.",
  "sc-service-details": "Nothing has been served.",
  "sc-defamation-publication-details": "I'm not sure.",
};

export const DEFENDANT_DEFAULTS: Record<string, string> = {
  ...PLAINTIFF_DEFAULTS,
  "sc-orient-role": "Responding to a claim (defendant)",
  "sc-claim-filed": "Yes, they filed a claim against me.",
  "sc-defendant-served": "Yes, I was served.",
  "sc-defence-filed": "No, not yet.",
  "sc-defence-time-elapsed": "I'm not sure.",
  "sc-defendant-claim-received": "I got the Plaintiff's Claim form.",
  "sc-defendant-response-facts": "I disagree with what they say happened.",
  "sc-defendant-response-evidence": "I have some messages.",
  "sc-defendant-outcome": "I want the claim dismissed.",
  "sc-defendant-service-method": "Someone handed it to me.",
  "sc-defendant-counterclaim": "I'm not sure.",
  "sc-defendant-admission-payment": "No.",
  "sc-defendant-defence-filed": "No, not yet.",
  "sc-date-claim-served": "I'm not sure of the exact date.",
  "sc-date-claim-issued": "I'm not sure, I'd have to check the form.",
};

export const STORIES: ReviewStory[] = [
  // ------------------------------------------------------------ Small Claims, plaintiff
  {
    id: "SC1-contractor-quit-customer",
    area: "small-claims",
    side: "plaintiff",
    note: "The site owner's own manual test, rewritten: customer v. Kijiji contractor who quit halfway.",
    story:
      "I hired a guy off Kijiji in May to redo my bathroom. I paid him a $2000 deposit by e-transfer. He " +
      "did about half the job, ripped out the old tub and put up some of the tile, then stopped showing up. " +
      "I texted him for weeks and he never answered. I had to hire another contractor who charged me 3200 " +
      "to finish it, and he pointed out that the first guy cracked a bunch of the tiles and put a hole in " +
      "the drywall in the hallway. When I finally reached the first guy he said the tiles were already " +
      "cracked when he got there, which is not true. I want to take him to small claims. I haven't filed " +
      "anything yet.",
    answers: {
      "sc-amount-claimed": "About $5,200 -- the $2000 deposit plus the $3200 to finish.",
      "sc-evidence-available": "The e-transfer receipt, my texts to him, and the second contractor's invoice.",
      "sc-contractor-completion-date": "He said it would be done in two weeks, by early June.",
      "sc-contractor-notice-before-replacement": "Yes, I texted him many times asking him to come back and finish.",
      "sc-remedy-sought": "I want the deposit back and what I paid to have the job finished.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-contractor-damage", "sc-claim-breach-of-contract-services"],
      answeredByStory: ["sc-orient-role", "sc-orient-when-happened", "sc-claim-filed"],
      role: "plaintiff",
      reviewShouldRaise: [
        { kind: "document-mentioned", quoteIncludes: "3200" },
        { kind: "missing-other-party-name" },
        { kind: "missing-other-party-address" },
      ],
    },
  },
  {
    id: "SC2-freelance-invoice",
    area: "small-claims",
    side: "plaintiff",
    note: "Plain unpaid invoice; the case that tripped the safety check in CI.",
    story:
      "I'm a freelance web developer. Back in April, I built a full website for a small business owner and " +
      "delivered the finished site along with all the source files. We'd agreed by email that they'd pay me " +
      "$3,200 within 30 days of delivery. It's now been over three months, they haven't paid me anything, " +
      "and they've stopped responding to my emails about the unpaid invoice.",
    answers: {
      "sc-amount-claimed": "$3,200.",
      "sc-evidence-available": "The email where they agreed to the price, the invoice, and my follow-up emails.",
      "sc-remedy-sought": "Payment of the invoice.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-unpaid-debt-services"],
      answeredByStory: ["sc-orient-when-happened"],
      role: "plaintiff",
      reviewShouldRaise: [{ kind: "missing-other-party-address" }],
    },
  },
  {
    id: "SC3-loan-to-friend",
    area: "small-claims",
    side: "plaintiff",
    note: "Personal loan, casual voice, partial repayment.",
    story:
      "so last fall my buddy asked to borrow 4500 for his truck payments, said hed pay me back by christmas. " +
      "i sent it in three etransfers. he paid back 500 in january and nothing since. now hes saying it was " +
      "more like a gift because i was helping him out. it wasnt a gift, i have texts where he says 'ill get " +
      "u back asap'. i want the rest back.",
    answers: {
      "sc-amount-claimed": "$4,000.",
      "sc-evidence-available": "The e-transfer records and his texts.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-personal-loan-between-individuals"],
      answeredByStory: ["sc-orient-role"],
      role: "plaintiff",
      reviewShouldRaise: [{ kind: "document-mentioned" }],
    },
  },
  {
    id: "SC4-used-car-dealer",
    area: "small-claims",
    side: "plaintiff",
    note: "Used vehicle bought from a dealer; prior accident not disclosed.",
    story:
      "In July I bought a 2018 Honda Civic from a used car dealership in Hamilton for $14,900. Two months " +
      "later a body shop told me it had been in a major accident and the frame had been repaired. The " +
      "dealer never told me that and the bill of sale doesn't mention it. I went back and they said all " +
      "sales are final. The body shop says the car is worth about $4,000 less because of the accident " +
      "history.",
    answers: {
      "sc-amount-claimed": "$4,000.",
      "sc-evidence-available": "The bill of sale and the body shop's written report.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-used-vehicle-nondisclosure", "sc-claim-consumer-protection-act-issue"],
      answeredByStory: ["sc-orient-when-happened"],
      role: "plaintiff",
      reviewShouldRaise: [{ kind: "document-mentioned" }],
    },
  },
  {
    id: "SC5-facebook-post",
    area: "small-claims",
    side: "plaintiff",
    note: "Defamation on social media about a small business owner.",
    story:
      "A former client posted on a local Facebook group with 20,000 members saying my cleaning company " +
      "steals from customers. That's completely false. Since the post in August I've lost three regular " +
      "clients who told me they saw it. I asked her to take it down and she refused. It's still up.",
    answers: {
      "sc-amount-claimed": "I'm not sure how much to ask for.",
      "sc-evidence-available": "Screenshots of the post and messages from the clients who left.",
      "sc-defamation-publication-details": "A public Facebook group with about 20,000 members. Still up.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-defamation-libel-slander"],
      answeredByStory: ["sc-orient-when-happened"],
      role: "plaintiff",
      reviewShouldRaise: [{ kind: "amount-not-a-figure" }],
    },
  },
  {
    id: "SC6-dog-bite",
    area: "small-claims",
    side: "plaintiff",
    note: "Neighbour's dog bit the teller on a walk.",
    story:
      "On September 3rd my neighbour's dog got loose and bit me on the leg while I was walking on the " +
      "sidewalk in front of their house. I needed stitches at the walk-in clinic and missed four days of " +
      "work. The neighbour says the dog has never bitten anyone before so it's not their fault. My lost " +
      "wages were about $1,100.",
    answers: {
      "sc-amount-claimed": "My lost wages of $1,100 plus something for the injury, I'm not sure how much.",
      "sc-date-injury": "September 3rd.",
      "sc-evidence-available": "The clinic receipt and photos of the bite.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear", "distress"],
      claimTypes: ["sc-claim-dog-bite-animal-injury"],
      // The story gives the date of the injury outright.
      answeredByStory: ["sc-orient-when-happened", "sc-date-injury"],
      role: "plaintiff",
      reviewShouldRaise: [{ kind: "document-mentioned" }],
    },
  },

  // ------------------------------------------------------------ Small Claims, defendant
  {
    id: "SC7-contractor-being-sued",
    area: "small-claims",
    side: "defendant",
    note: "The other side of SC1: the contractor, served with a claim.",
    story:
      "I'm a self-employed renovator. A homeowner hired me to redo a bathroom and paid a $2000 deposit. I " +
      "stopped partway because she kept changing the job and refused to pay for the extra materials. Now " +
      "she's sued me in small claims for $5,200. I was served with the papers last week. The tiles were " +
      "already cracked when I got there and I have photos from the first day.",
    answers: {
      "sc-defendant-response-facts":
        "She changed the scope three times and wouldn't pay for materials, so I stopped. The tiles were cracked before I started.",
      "sc-defendant-response-evidence": "Photos from the first day and our texts about the changes.",
    },
    expect: {
      // Just served: the next step is responding. Default and judgment are
      // never asked unless the person raises them (site owner, 2026-09-29).
      mustNotAsk: ["sc-date-learned-of-default", "sc-date-learned-of-judgment"],
      mustReach: ["sc-defendant-defence-filed"],
      courtPath: ["small-claims"],
      safety: ["clear"],
      answeredByStory: ["sc-orient-role", "sc-claim-filed", "sc-defendant-served"],
      role: "defendant",
      reviewShouldRaise: [],
    },
  },
  {
    id: "SC8-sued-on-loan-part-owed",
    area: "small-claims",
    side: "defendant",
    note: "Defendant who admits owing part of the amount.",
    story:
      "My ex-roommate is suing me for $2,800 she says I owe for rent and utilities. I did owe her about " +
      "$1,200 for my share of the hydro and internet, and I've told her I'll pay that, but the rest is for " +
      "months after I moved out. I got served with a Plaintiff's Claim on the 10th and I don't know what " +
      "to do next.",
    answers: {
      "sc-defendant-admission-payment": "I agree I owe about $1,200 and I'm willing to pay it.",
    },
    expect: {
      // Just served: the next step is responding. Default and judgment are
      // never asked unless the person raises them (site owner, 2026-09-29).
      mustNotAsk: ["sc-date-learned-of-default", "sc-date-learned-of-judgment"],
      mustReach: ["sc-defendant-defence-filed"],
      courtPath: ["small-claims"],
      safety: ["clear"],
      answeredByStory: ["sc-orient-role", "sc-claim-filed", "sc-defendant-served"],
      role: "defendant",
    },
  },

  // ------------------------------------------------------------ Safety
  {
    id: "SC9-threat-buried",
    area: "small-claims",
    side: "plaintiff",
    note: "Ordinary deposit dispute with a current threat mentioned once. Must stop and show safety help.",
    story:
      "I paid a caterer a $900 deposit for my daughter's party and they cancelled two days before and " +
      "won't refund it. When I went to their shop yesterday to ask for it back the owner followed me to my " +
      "car and said he knows where I live and I'd better not come back. I'm scared to go home tonight.",
    expect: {
      courtPath: ["small-claims"],
      safety: ["immediate-danger"],
    },
  },

  // ------------------------------------------------------------ Civil (Superior Court)
  {
    id: "CV1-renovation-over-limit",
    area: "civil",
    side: "plaintiff",
    note: "Construction dispute well over the Small Claims limit.",
    story:
      "We paid a general contractor $185,000 to build an addition on our house in Ottawa. The work " +
      "stopped in March with the roof unfinished and water has been coming in since. Another builder " +
      "quoted $140,000 to fix and finish it. The contractor has stopped responding and we think they have " +
      "gone out of business.",
    expect: { courtPath: ["civil"], safety: ["clear", "distress"] },
  },
  {
    id: "CV2-fired-after-12-years",
    area: "civil",
    side: "plaintiff",
    note: "Long-service termination; could be civil or small claims depending on amount.",
    story:
      "I worked for a manufacturing company for 12 years as a production supervisor making $78,000 a year. " +
      "Last month they called me in and fired me with two weeks' pay, saying it was a restructuring. I " +
      "wasn't given any reason related to my performance. I want to know what I can do.",
    expect: { courtPath: ["civil", "small-claims"], safety: ["clear", "distress"] },
  },

  // ------------------------------------------------------------ Family
  {
    id: "FM1-separation-parenting",
    area: "family",
    side: "applicant",
    note: "Separated parent wanting a parenting schedule and child support.",
    story:
      "My partner and I separated in June after eight years together. We were never married. We have two " +
      "kids, 6 and 9. They've been living with me and he sees them some weekends but it's whenever he " +
      "feels like it. He hasn't paid anything toward the kids since he moved out. I want a proper schedule " +
      "and child support.",
    expect: { courtPath: ["family"], safety: ["clear", "distress"] },
  },
  {
    id: "FM2-served-motion-to-change",
    area: "family",
    side: "respondent",
    note: "Payor served with a motion to change support after losing a job.",
    story:
      "My ex-wife has served me with a Motion to Change asking to increase the child support I pay. The " +
      "problem is I lost my job in the spring and I'm making a lot less now. I actually need the support " +
      "lowered, not raised. I have 30 days to respond and I don't have a lawyer.",
    expect: { courtPath: ["family"], safety: ["clear", "distress"] },
  },

  // ------------------------------------------------------------ Tribunal
  {
    id: "TR1-tenant-mould",
    area: "tribunal",
    side: "applicant",
    note: "Residential tenant: belongs at the Landlord and Tenant Board, not a court.",
    story:
      "I rent an apartment in Toronto. There's been black mould in the bathroom and bedroom since last " +
      "winter and my landlord keeps saying he'll send someone but never does. My son has asthma and it's " +
      "getting worse. I want the landlord to fix it and I want some rent back.",
    expect: { courtPath: ["out-of-scope"], safety: ["clear", "distress"] },
  },

  // ================================================================== 2026-09-28, round 2
  // Every Small Claims claim type the site knows, plus the situations real
  // people bring that no single-stage suite imagines.

  {
    id: "SC10-slip-city-sidewalk",
    area: "small-claims",
    side: "plaintiff",
    note: "Fall on an icy city sidewalk. The municipal notice period is short, so the date matters.",
    story:
      "On January 14 I slipped on a sheet of ice on the sidewalk outside the library on Main Street and " +
      "broke my wrist. The city hadn't salted it at all. I was off work for six weeks and lost about $4,800 " +
      "in pay. I want the city to pay me back.",
    answers: { "sc-amount-claimed": "$4,800 in lost pay.", "sc-date-injury": "January 14." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear", "distress"],
      claimTypes: ["sc-claim-slip-and-fall-occupier-liability"],
      answeredByStory: ["sc-orient-when-happened"],
      role: "plaintiff",
      reviewShouldRaise: [{ kind: "missing-other-party-address" }],
    },
  },
  {
    id: "SC11-towed-private-lot",
    area: "small-claims",
    side: "plaintiff",
    note: "Towed from a plaza lot with no posted rates; charged far more than expected.",
    story:
      "My car got towed from a plaza parking lot in Mississauga on August 2nd while I was in the pharmacy for " +
      "ten minutes. There was no sign with the towing rates. The tow company charged me $640 to get it back " +
      "and wouldn't give me an itemized bill until I paid.",
    answers: { "sc-amount-claimed": "$640." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-improper-unauthorized-towing"],
      answeredByStory: ["sc-orient-when-happened"],
      role: "plaintiff",
    },
  },
  {
    id: "SC12-sofa-arrived-damaged",
    area: "small-claims",
    side: "plaintiff",
    note: "Goods not as agreed: furniture store delivered a damaged, wrong-colour sofa.",
    story:
      "I ordered a grey sectional from a furniture store for $2,300. What they delivered in June was beige " +
      "and one arm was ripped. They said they'd replace it and never did. They won't refund me either.",
    answers: { "sc-amount-claimed": "$2,300." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-breach-of-contract-goods", "sc-claim-consumer-protection-act-issue"],
      role: "plaintiff",
    },
  },
  {
    id: "SC13-supplier-unpaid-by-store",
    area: "small-claims",
    side: "plaintiff",
    note: "A small business supplier owed for goods delivered to a shop.",
    story:
      "I run a small bakery and I delivered $6,450 worth of baked goods to a cafe over March and April on " +
      "their standing order. They paid the first two invoices and then stopped. The owner says business is " +
      "slow and he'll pay when he can, but it's been four months.",
    answers: { "sc-amount-claimed": "$6,450." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-non-payment-goods-sold", "sc-claim-unpaid-debt-services"],
      role: "plaintiff",
    },
  },
  {
    id: "SC14-door-to-door-furnace",
    area: "small-claims",
    side: "plaintiff",
    note: "Door-to-door contract cancelled in the cooling-off period; no refund.",
    story:
      "A salesman came to my door and signed me up for a furnace rental and I paid a $500 deposit. I " +
      "cancelled in writing four days later. That was two months ago and they still haven't refunded the " +
      "deposit.",
    answers: { "sc-amount-claimed": "$500." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-consumer-cancellation-refund", "sc-claim-consumer-protection-act-issue"],
      role: "plaintiff",
    },
  },
  {
    id: "SC15-fired-after-8-months",
    area: "small-claims",
    side: "plaintiff",
    note: "Short-service dismissal, small amount: a Small Claims matter.",
    story:
      "I worked as a receptionist at a dental office for eight months. Last Friday they told me not to come " +
      "back and gave me nothing, no notice and no pay in lieu. They didn't say I did anything wrong.",
    expect: {
      courtPath: ["small-claims", "civil"],
      safety: ["clear", "distress"],
      claimTypes: ["sc-claim-wrongful-dismissal"],
      role: "plaintiff",
    },
  },
  {
    id: "SC16-friend-keeps-laptop",
    area: "small-claims",
    side: "plaintiff",
    note: "Recovery of personal property: a laptop a friend won't give back.",
    story:
      "I lent my MacBook to a friend in the spring while hers was being fixed. She still has it and now says " +
      "I gave it to her. I didn't. It cost me $1,900 and I have the receipt in my name.",
    answers: { "sc-amount-claimed": "$1,900 or the laptop back." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-recovery-of-personal-property"],
      role: "plaintiff",
    },
  },
  {
    id: "SC17-restaurant-lease-deposit",
    area: "small-claims",
    side: "plaintiff",
    note: "Commercial tenant: landlord kept the deposit on a restaurant lease. Not the LTB.",
    story:
      "I leased a commercial unit for my restaurant in a strip mall for three years. When the lease ended in " +
      "July I handed back the keys and the unit was in good shape, but the landlord kept my $8,000 security " +
      "deposit and won't say why.",
    answers: { "sc-amount-claimed": "$8,000." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-commercial-tenancy-dispute"],
      role: "plaintiff",
    },
  },
  {
    id: "SC18-bounced-cheque",
    area: "small-claims",
    side: "plaintiff",
    note: "Buyer paid for a used boat with a cheque that bounced.",
    story:
      "I sold my fishing boat to a man for $3,700 in May and he paid by cheque. The cheque bounced for " +
      "insufficient funds and by then he'd already taken the boat. He keeps saying he'll send an e-transfer.",
    answers: { "sc-amount-claimed": "$3,700." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-dishonoured-nsf-cheque"],
      answeredByStory: ["sc-orient-when-happened"],
      role: "plaintiff",
    },
  },
  {
    id: "SC19-unpaid-vacation-pay",
    area: "small-claims",
    side: "plaintiff",
    note: "Former employee owed vacation pay and overtime.",
    story:
      "I quit my warehouse job in June and they never paid out my vacation pay. I also worked a lot of " +
      "overtime in the spring that was never paid at time and a half. I figure it's about $2,200 total.",
    answers: { "sc-amount-claimed": "About $2,200." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-unpaid-overtime-vacation-pay"],
      role: "plaintiff",
    },
  },
  {
    id: "SC20-mechanic-overcharged",
    area: "small-claims",
    side: "plaintiff",
    note: "Repair shop charged well over its written estimate.",
    story:
      "The garage gave me a written estimate of $900 to fix my brakes. When I went to pick up the car the " +
      "bill was $1,650 and they said they found more problems. They never called me to ask. I paid so I " +
      "could get my car back.",
    answers: { "sc-amount-claimed": "$750, the amount over the estimate." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-vehicle-repair-dispute"],
      role: "plaintiff",
    },
  },
  {
    id: "SC21-condo-arrears",
    area: "small-claims",
    side: "plaintiff",
    note: "A condo corporation's manager wants unpaid common expenses from an owner.",
    story:
      "I'm the property manager for a condominium corporation. One owner hasn't paid common expenses since " +
      "January and owes $4,120. We've sent notices and he ignores them. The board asked me to look at small " +
      "claims.",
    answers: { "sc-amount-claimed": "$4,120." },
    expect: {
      // "mixed" accepted (2026-09-28): which condo disputes belong at the
      // Condominium Authority Tribunal rather than a court turns on provisions
      // this project has not sourced, so a suggestion naming both is honest.
      courtPath: ["small-claims", "out-of-scope", "mixed"],
      safety: ["clear"],
      claimTypes: ["sc-claim-unpaid-condo-common-expenses"],
      role: "plaintiff",
    },
  },
  {
    id: "SC22-uninsured-driver",
    area: "small-claims",
    side: "plaintiff",
    note: "Rear-ended by a driver with no insurance.",
    story:
      "A driver rear-ended me at a red light on Bank Street in April. It turns out he had no insurance. My " +
      "repair bill was $5,300 and my insurance company told me to go after him myself for the deductible and " +
      "the rest.",
    answers: { "sc-amount-claimed": "$5,300." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-vehicle-accident-uninsured-driver-property-damage"],
      role: "plaintiff",
    },
  },
  {
    id: "SC23-dry-cleaner-ruined-dress",
    area: "small-claims",
    side: "plaintiff",
    note: "Property damaged while in a business's care.",
    story:
      "I took my wedding dress to a dry cleaner to be cleaned and boxed. It came back with a large burn mark " +
      "on the skirt. The dress cost $2,800. The cleaner says their ticket limits them to ten times the " +
      "cleaning price.",
    answers: { "sc-amount-claimed": "$2,800." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-property-damaged-lost-in-business-care"],
      role: "plaintiff",
    },
  },

  // ------------------------------------------------------------ situations, not claim types
  {
    id: "EX1-vague",
    area: "small-claims",
    side: "plaintiff",
    note: "Almost no detail. The site should ask, not guess.",
    story: "I got ripped off and I want my money back.",
    expect: { courtPath: ["unknown", "small-claims"], safety: ["clear"] },
  },
  {
    id: "EX2-asks-will-i-win",
    area: "small-claims",
    side: "plaintiff",
    note: "Ordinary story that ends by asking for legal advice.",
    story:
      "My neighbour's tree fell on my shed in a storm last month and crushed it. He knew the tree was dead " +
      "because I told him last year. The shed cost $3,000. Do I have a case? Will I win if I sue him?",
    answers: { "sc-amount-claimed": "$3,000." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      role: "plaintiff",
      asksForAdvice: true,
    },
  },
  {
    id: "EX3-over-limit-invoice",
    area: "civil",
    side: "plaintiff",
    note: "Unpaid invoice over $50,000: belongs in the Superior Court.",
    story:
      "My company did a software project for a distribution company and they owe us $78,000 on the final " +
      "invoice. The work was delivered and accepted in March. They say they're disputing the quality but " +
      "they never raised it before.",
    expect: { courtPath: ["civil"], safety: ["clear"] },
  },
  {
    id: "EX4-old-events",
    area: "small-claims",
    side: "plaintiff",
    note: "Events years ago. The site must not say it is too late, and must not guess.",
    story:
      "Back in 2021 I lent my cousin $3,000 and she promised to pay it back in a year. She never did and I " +
      "finally want to do something about it.",
    answers: { "sc-amount-claimed": "$3,000." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-personal-loan-between-individuals"],
      role: "plaintiff",
    },
  },
  {
    id: "EX5-already-filed-no-defence",
    area: "small-claims",
    side: "plaintiff",
    note: "Plaintiff already filed and served; no defence yet. Needs the plaintiff procedure questions.",
    story:
      "I filed my Plaintiff's Claim against my old landlord's cleaning company in August for $2,400 and had " +
      "it served on them by registered mail on September 2. They haven't filed a defence.",
    answers: {
      "sc-amount-claimed": "$2,400.",
      "sc-claim-filed": "Yes, in August.",
      "sc-defendant-served": "Yes, by registered mail on September 2. I don't have the affidavit of service yet.",
      "sc-defence-filed": "No.",
      "sc-date-claim-served": "September 2.",
      "sc-date-claim-issued": "August 12.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      answeredByStory: ["sc-orient-role", "sc-claim-filed"],
      role: "plaintiff",
    },
  },
  {
    id: "EX6-two-problems",
    area: "small-claims",
    side: "plaintiff",
    note: "Two disputes with the same person in one story.",
    story:
      "My ex-boyfriend owes me $1,500 I lent him for rent in January, and when he moved out of my place in " +
      "May he took my TV and my bike and won't give them back. I want both sorted out.",
    answers: { "sc-amount-claimed": "$1,500 plus the TV and bike, about $1,200." },
    expect: { courtPath: ["small-claims"], safety: ["clear"], role: "plaintiff" },
  },
  {
    id: "EX7-business-suing-customer",
    area: "small-claims",
    side: "plaintiff",
    note: "A business owner, writing as the business, suing a customer.",
    story:
      "We are a landscaping company. A homeowner hired us to redo her backyard for $11,500. We finished the " +
      "job in July and she paid $5,000 and now refuses to pay the rest, saying the grass didn't take.",
    answers: { "sc-amount-claimed": "$6,500." },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      claimTypes: ["sc-claim-unpaid-debt-services"],
      role: "plaintiff",
    },
  },
  {
    id: "EX8-noted-in-default",
    area: "small-claims",
    side: "defendant",
    note: "Defendant who ignored the claim and has now been noted in default.",
    story:
      "Someone sued me over a car I sold him. I got the papers in July but I didn't do anything because I " +
      "thought it would go away. Now I got a letter from the court saying I've been noted in default. What " +
      "happens now?",
    answers: {
      "sc-date-learned-of-default": "Last week, around September 20.",
    },
    expect: {
      // They said they were noted in default, so the date they found out is asked.
      mustReach: ["sc-date-learned-of-default"],
      courtPath: ["small-claims"],
      safety: ["clear", "distress"],
      answeredByStory: ["sc-orient-role"],
      role: "defendant",
    },
  },
  {
    id: "EX9-defendant-counterclaim",
    area: "small-claims",
    side: "defendant",
    note: "Defendant who thinks the plaintiff owes them more.",
    story:
      "My former business partner is suing me for $9,000 he says I owe from our food truck. I was served two " +
      "weeks ago. The truth is he took $14,000 of equipment when he left and never paid me for my share. I " +
      "want to make a claim back against him.",
    answers: { "sc-defendant-counterclaim": "Yes, he owes me for the equipment, about $14,000. I haven't started anything yet." },
    expect: {
      // Just served: the next step is responding. Default and judgment are
      // never asked unless the person raises them (site owner, 2026-09-29).
      mustNotAsk: ["sc-date-learned-of-default", "sc-date-learned-of-judgment"],
      mustReach: ["sc-defendant-defence-filed"],
      courtPath: ["small-claims"],
      safety: ["clear"],
      answeredByStory: ["sc-orient-role"],
      role: "defendant",
    },
  },
  {
    id: "EX10-dog-owner-sued",
    area: "small-claims",
    side: "defendant",
    note: "Dog owner served with a claim after a bite.",
    // The injury-date question applies to either side of an injury claim.
    answers: { "sc-date-injury": "I'm not sure, sometime in the summer." },
    story:
      "I've been served with a claim by a delivery driver who says my dog bit him on my porch. My dog did " +
      "nip him but he walked right past the Beware of Dog sign and into the gate. He wants $7,500.",
    expect: {
      // Just served: the next step is responding. Default and judgment are
      // never asked unless the person raises them (site owner, 2026-09-29).
      mustNotAsk: ["sc-date-learned-of-default", "sc-date-learned-of-judgment"],
      mustReach: ["sc-defendant-defence-filed"],
      courtPath: ["small-claims"],
      safety: ["clear"],
      answeredByStory: ["sc-orient-role"],
      role: "defendant",
    },
  },
  {
    id: "EX11-genuine-distress",
    area: "small-claims",
    side: "plaintiff",
    note: "Distress in the person's own words. The slower-pace message is right here.",
    story:
      "I lent my brother $6,000 from my savings and he won't pay it back and won't talk to me. I can't sleep, " +
      "I cry every day, I feel completely hopeless and I don't know how much longer I can cope with this.",
    answers: { "sc-amount-claimed": "$6,000." },
    expect: { courtPath: ["small-claims"], safety: ["distress", "immediate-danger"] },
  },
  {
    id: "EX12-past-violence-family",
    area: "family",
    side: "applicant",
    note: "Past abuse recounted as background to a custody question.",
    story:
      "I left my husband two years ago because he was violent. We share custody of our daughter and now he " +
      "wants her every weekend. I want to keep the current schedule. He hasn't threatened me since I left.",
    expect: { courtPath: ["family"], safety: ["distress"] },
  },
  {
    id: "TR2-discrimination",
    area: "tribunal",
    side: "applicant",
    note: "Workplace discrimination: the Human Rights Tribunal, not a court.",
    story:
      "My manager cut my hours in half after I told her I was pregnant, and gave them to a coworker who " +
      "isn't. When I asked why, she said I'd need to slow down anyway.",
    expect: { courtPath: ["out-of-scope"], safety: ["clear", "distress"] },
  },
  {
    id: "TR3-hurt-at-work",
    area: "tribunal",
    side: "applicant",
    note: "Injured on the job: WSIB, not a court.",
    story:
      "I hurt my back lifting boxes at work at the warehouse in August and I've been off since. My employer " +
      "says I should just use my sick days. I want to get paid while I'm off.",
    expect: { courtPath: ["out-of-scope"], safety: ["clear", "distress"] },
  },
  {
    id: "TR4-criminal-charge",
    area: "tribunal",
    side: "respondent",
    note: "A criminal charge: outside what the site covers.",
    story:
      "I was charged with assault after a fight outside a bar last month. My first court date is in two " +
      "weeks and I don't know if I need a lawyer.",
    expect: { courtPath: ["out-of-scope"], safety: ["clear", "distress"] },
  },
  {
    id: "TR5-residential-deposit",
    area: "tribunal",
    side: "applicant",
    note: "Residential tenant and landlord: the Landlord and Tenant Board.",
    story:
      "I moved out of my apartment in Kingston at the end of August and my landlord won't give back my last " +
      "month's rent deposit. He says he needs it for painting.",
    expect: { courtPath: ["out-of-scope", "small-claims"], safety: ["clear"] },
  },
  {
    id: "FM3-property-division-married",
    area: "family",
    side: "applicant",
    note: "Married couple separating; house and pension.",
    story:
      "My wife and I separated in March after 15 years of marriage. We own a house together and she wants " +
      "to keep it. I have a work pension. We can't agree on how to split things.",
    expect: { courtPath: ["family"], safety: ["clear", "distress"] },
  },
  {
    id: "CV3-neighbour-encroachment",
    area: "civil",
    side: "plaintiff",
    note: "Wants a structure removed, not money: the Superior Court.",
    story:
      "My neighbour built a garage that sits two feet onto my property according to my survey. I want the " +
      "court to make him move it. I'm not really after money.",
    expect: { courtPath: ["civil"], safety: ["clear"] },
  },
  // ---- Complex, multi-matter stories (2026-09-30) --------------------------
  // Fabricated facts, patterned on the questions the Court of Appeal and the
  // statutes answer about how parts of one dispute divide between forums
  // (docs/sources/decisions/, src/lib/content-library/crossForumNotes.ts).
  {
    id: "MX1-fired-after-accommodation-and-unpaid",
    area: "small-claims",
    side: "plaintiff",
    note: "Firing, a protected ground and unpaid wages in one story.",
    story:
      "I worked at a restaurant for three years. In June I told my manager I needed Friday afternoons off for " +
      "prayers, and two weeks later he fired me, saying business was slow. He still hasn't paid my last two " +
      "weeks, about $2,400, and I got no termination pay.",
    expect: {
      courtPath: ["small-claims", "mixed", "out-of-scope"],
      safety: ["clear"],
      role: "plaintiff",
      matterKinds: ["employment-termination", "discrimination"],
      notes: ["cross-forum:employment-standards-or-court", "cross-forum:human-rights-with-another-claim"],
    },
  },
  {
    id: "MX2-tenant-injured-by-unrepaired-ceiling",
    area: "tribunal",
    side: "applicant",
    note: "A current tenancy, a repair failure, an injury and damaged belongings.",
    story:
      "My landlord has ignored the leak in my apartment ceiling since March. Last week part of the ceiling fell " +
      "and hit me on the head. I needed stitches and missed a week of work, and my couch and laptop were " +
      "ruined, about $3,000 worth.",
    expect: {
      courtPath: ["out-of-scope", "small-claims", "mixed"],
      safety: ["clear"],
      matterKinds: ["residential-tenancy", "injury"],
      notes: ["cross-forum:tenancy-and-court"],
    },
  },
  {
    id: "MX3-cyclist-two-drivers",
    area: "small-claims",
    side: "plaintiff",
    note: "One injury, two people each blaming the other.",
    story:
      "I was riding my bike downtown when a delivery van driver opened his door right in front of me, and a car " +
      "behind me swerved and ran over my bike. I broke my wrist and the bike, worth $2,000, is destroyed. The van " +
      "driver says it was the car's fault and the car driver blames the van.",
    answers: { "sc-date-injury": "August 14.", "sc-amount-claimed": "$2,000 for the bike plus my injury." },
    expect: {
      courtPath: ["small-claims", "civil"],
      safety: ["clear"],
      role: "plaintiff",
      matterKinds: ["injury"],
      notes: ["cross-forum:several-people-at-fault"],
    },
  },
  {
    id: "MX4-ltb-order-unpaid",
    area: "small-claims",
    side: "plaintiff",
    note: "An earlier Board order plus a new claim against the same former landlord.",
    story:
      "In March the Landlord and Tenant Board ordered my former landlord to pay me back my $1,800 rent deposit, " +
      "and he still hasn't paid. When I moved out he also threw out my dining table and chairs, which cost me $900.",
    expect: {
      courtPath: ["small-claims", "out-of-scope", "mixed"],
      safety: ["clear"],
      role: "plaintiff",
      notes: ["cross-forum:earlier-decision"],
    },
  },
  {
    id: "MX5-renovation-over-limit-split",
    area: "civil",
    side: "plaintiff",
    note: "A claim above the Small Claims limit, and a plan to split it.",
    story:
      "My contractor walked off my home renovation halfway through. I paid him $85,000 and another company says " +
      "it will cost $70,000 more to finish. A friend said I could sue him in Small Claims twice so each claim is " +
      "under the limit.",
    expect: {
      courtPath: ["civil"],
      safety: ["clear"],
      matterKinds: ["debt-or-contract"],
      notes: ["cross-forum:over-small-claims-limit"],
    },
  },
  {
    id: "MX6-separation-and-family-loan",
    area: "family",
    side: "applicant",
    note: "A settled family arrangement and a separate unpaid loan.",
    story:
      "My ex-husband and I separated last year. We share the kids and he pays child support, and that part is " +
      "fine. But before we split, my mother and I lent him $15,000 for his truck, and now he refuses to pay any " +
      "of it back.",
    expect: {
      courtPath: ["family", "small-claims", "mixed"],
      safety: ["clear"],
      matterKinds: ["family", "debt-or-contract"],
    },
  },
  {
    id: "MX7-esa-complaint-then-sue",
    area: "small-claims",
    side: "plaintiff",
    note: "An employment standards complaint already filed, and a wish to sue for the same pay.",
    story:
      "My employer didn't pay me for my last three weeks of work, about $3,600. I filed a complaint with the " +
      "Ministry of Labour last month but haven't heard back, and now I want to sue him in Small Claims as well.",
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      role: "plaintiff",
      matterKinds: ["employment-pay"],
      notes: ["cross-forum:employment-standards-or-court"],
    },
  },
  {
    id: "MX8-neighbour-posts-and-gate",
    area: "small-claims",
    side: "plaintiff",
    note: "Defamation and property damage by the same neighbour.",
    story:
      "My neighbour keeps posting in our street's Facebook group that I poison cats, which is a lie, and last " +
      "month he kicked in my fence gate after an argument. Fixing the gate cost me $650.",
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear"],
      role: "plaintiff",
      matterKinds: ["defamation", "property-damage"],
    },
  },
];
