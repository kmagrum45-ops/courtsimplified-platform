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
      "sc-evidence-available": "The clinic receipt and photos of the bite.",
    },
    expect: {
      courtPath: ["small-claims"],
      safety: ["clear", "distress"],
      claimTypes: ["sc-claim-dog-bite-animal-injury"],
      answeredByStory: ["sc-orient-when-happened"],
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
];
