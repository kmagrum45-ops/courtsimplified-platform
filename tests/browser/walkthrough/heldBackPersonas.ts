/**
 * TEN HELD-BACK CASES for the beta finish line (master plan decision log,
 * 2026-10-08: "20 cases PLUS 10 new held-back cases").
 *
 * WHY HELD BACK. The 20 cases in personas.ts are what the work is tuned on;
 * a site that passes only the cases it was fixed against has learned those
 * cases, not the law. These ten are written to be different from all twenty
 * (other claims, other cities, other steps, one case the site cannot fully
 * handle) and are run ONLY for the finish-line measurement:
 * WALKTHROUGH_SET=held-back. Do not tune against their reports; if one fails,
 * fix the cause in general and add a NEW case to personas.ts if a case is
 * needed to reproduce it.
 *
 * Same conventions as personas.ts: written the way people write (lower case,
 * typos), all names, dates and amounts invented, `expect` read by the critic.
 */

import type { Persona } from "./personas";

export const HELD_BACK_PERSONAS: Persona[] = [
  {
    id: "held-back-sc-used-car",
    path: "small-claims",
    summary: "Bought a used car privately; the seller hid a cracked engine block. Wants the repair cost back.",
    city: "Hamilton",
    story:
      "i bought a 2016 honda civic from a guy on marketplace for 7500 cash on august 2 2026. he said it never had " +
      "any problems. 3 weeks later the engine overheated and the mechanic said the block is cracked and its been " +
      "patched before, there was sealant all over it. repair is 5200. the guy wont answer my texts now",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    fields: { amountClaimed: "$5,200" },
    expect: [
      "The user is the PLAINTIFF starting a Small Claims case; the next form is the Plaintiff's Claim (Form 7A), with its fee, where to file in Hamilton (outside Toronto) and how to serve it.",
      "The site may set out what someone claiming for a misrepresented private sale must show, and what is not yet recorded, but must never say whether the claim is strong or will succeed.",
      "The two-year limitation period runs from about August 2026; it must not be said to have passed.",
    ],
  },
  {
    id: "held-back-sc-served-defendants-claim",
    path: "small-claims",
    summary: "Sued a neighbour over a fence; the neighbour has now served a defendant's claim against her.",
    city: "Oshawa",
    story:
      "i sued my neighbour in small claims for 3000 because he knocked down my fence with his truck. he filed a " +
      "defence and now i got served with something called a defendants claim on september 28 saying i owe him 2000 " +
      "for his trees i cut. what do i have to do about his claim",
    role: "Plaintiff / claimant",
    stage: "already-started",
    confirmStage: "already-started",
    fields: { amountClaimed: "$3,000" },
    expect: [
      "The user is the plaintiff in the main action but the DEFENDANT to the defendant's claim: her next step is a Defence (Form 9A) to the defendant's claim, within 20 days of being served (served September 28).",
      "She must not be offered a new Plaintiff's Claim draft: her case is already under way.",
      "Nothing may grade either claim.",
    ],
  },
  {
    id: "held-back-sc-guided-dog-bite",
    path: "small-claims",
    mode: "guided",
    summary: "Bitten by a neighbour's dog while walking; wants medical costs and lost wages.",
    city: "London",
    story:
      "my neighbours german shepherd got out of there yard and bit my leg when i was walking on the sidewalk on " +
      "july 19 2026. i needed stitches and missed 6 days of work. they said its my fault for walking by. i want " +
      "them to pay for it",
    backstory:
      "You live in London, Ontario. On July 19, 2026 around 6 pm your neighbour's German Shepherd ran out of their " +
      "open gate and bit your left calf on the public sidewalk. You went to Victoria Hospital and got 8 stitches. " +
      "You missed 6 shifts at a warehouse at $180 a shift ($1,080) and paid $95 for antibiotics and $60 for parking " +
      "(receipts kept). A neighbour across the street saw it and gave you her number. The dog's owners are Dale and " +
      "Rita, you know their address but not their last name. You have not sent a letter or started a case. You want " +
      "about $1,235 plus something for the pain and the scar.",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF; the bite was July 19, 2026; nothing is filed. The next form is the Plaintiff's Claim (Form 7A).",
      "Questions come one at a time, say why they matter, and do not re-ask the date, place or injury already told.",
      "The site may explain what the Dog Owners' Liability Act makes a person show, from the Act, but must not say whether the claim is strong.",
    ],
  },
  {
    id: "held-back-sc-guided-out-of-province",
    path: "small-claims",
    mode: "guided",
    summary: "Sold equipment online to a buyer in Alberta who never paid. A case the site may not fully handle.",
    city: "Peterborough",
    story:
      "i sold a used commercial espresso machine to a cafe owner in calgary for 6800. i shipped it in june, he sent " +
      "1000 and never paid the rest. he says it arrived damaged but he never sent pictures. can i sue him here in " +
      "ontario or do i have to go to alberta",
    backstory:
      "You run a small restaurant-equipment resale business from Peterborough, Ontario (sole proprietor). You sold the " +
      "machine by email to Marc, who owns a cafe in Calgary, Alberta, for $6,800. The deal was agreed by email; the " +
      "machine shipped from Peterborough on June 12, 2026 by freight; he paid $1,000 on June 10 and owes $5,800. " +
      "You have the emails, the invoice and the freight bill of lading. He has never been to Ontario that you know " +
      "of. You have not started a case.",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    expect: [
      "The other party is in Alberta. The site must say plainly what it can and cannot help with here (suing someone outside Ontario raises where the case can be brought and how to serve outside Ontario), with the rules it relies on, and point to help where it cannot go further.",
      "It must not decide for him whether Ontario is the right place, and must not grade the claim.",
      "Amount owed is $5,800; questions must not re-ask what he already said.",
    ],
  },
  {
    id: "held-back-sc-defendant-trial",
    path: "small-claims",
    summary: "Defendant with a trial date who needs a witness to come.",
    city: "Windsor",
    story:
      "im being sued by a contractor for 4100 he says i owe for a deck. i filed my defence in the spring and we had " +
      "the settlement conference, nothing settled. now the trial is on january 14 2027. my old neighbour saw the " +
      "deck was falling apart and i need him to come say that but he doesnt want to take the day off",
    role: "Defendant / responding party",
    stage: "trial",
    confirmStage: "trial",
    fields: { amountClaimed: "$4,100" },
    expect: [
      "The user is the DEFENDANT with a trial on January 14, 2027. His next step is the summons to witness (Form 18A): its fee, that it must be served personally at least 10 days before trial with attendance money.",
      "Nothing for starting a claim, and nothing that grades his defence.",
    ],
  },
  {
    id: "held-back-civil-wrongful-dismissal",
    path: "civil",
    summary: "Fired without cause after 14 years; the package offered is small. Over the Small Claims limit.",
    city: "Mississauga",
    story:
      "i worked at a logistics company for 14 years as a dispatch supervisor. they let me go on june 30 2026 with no " +
      "reason and offered 8 weeks pay if i sign a release. i didnt sign. i was making 78000 a year. i think i should " +
      "get way more than 8 weeks",
    role: "plaintiff",
    stage: "starting-case",
    confirmStage: "starting-case",
    issues: ["Employment-related civil issue"],
    documents: ["Nothing filed yet"],
    fields: {
      "Amount claimed or disputed": "$90,000",
      "Evidence you have": "my termination letter, the release they want me to sign, my pay stubs",
    },
    expect: [
      "The user is a PLAINTIFF starting a Superior Court action (over $50,000). The next form is a Statement of Claim (Form 14A) or a Notice of Action (Form 14C), with the $243 fee, where to file in Mississauga (outside Toronto) and personal service.",
      "The two-year limitation period runs from about June 30, 2026; it has not passed.",
      "The site may set out what the law makes a dismissed employee show, but must not say how much he will get or whether he will win.",
    ],
  },
  {
    id: "held-back-civil-served-counterclaim",
    path: "civil",
    summary: "Plaintiff served with a statement of defence and counterclaim.",
    city: "Kingston",
    story:
      "i sued my former business partner in superior court for 110000 he took from our company account. on " +
      "september 25 2026 his lawyer served me with a statement of defence and counterclaim saying i owe him 60000 " +
      "for unpaid salary. i dont have a lawyer anymore. what do i do with the counterclaim",
    role: "plaintiff",
    stage: "already-started",
    confirmStage: "already-started",
    issues: ["Contract / agreement dispute"],
    documents: ["Statement of Claim already filed / served", "Statement of Defence already filed / received"],
    fields: {
      "Amount claimed or disputed": "$110,000",
      "Evidence you have": "bank statements, the partnership agreement",
    },
    expect: [
      "The user is the plaintiff, now answering a COUNTERCLAIM served September 25, 2026: the next form is a Defence to Counterclaim (Form 27C), with its deadline counted, the fee and how to serve.",
      "No new Statement of Claim draft; nothing that grades either claim.",
    ],
  },
  {
    id: "held-back-civil-summary-judgment",
    path: "civil",
    summary: "Defendant served with a motion for summary judgment.",
    city: "Barrie",
    story:
      "a supplier sued my company for 95000 for unpaid invoices. we filed a defence because half the stuff was " +
      "defective. now they served a motion for summary judgment and the hearing is on december 3 2026. what do i " +
      "need to file to respond",
    role: "defendant",
    stage: "motion",
    confirmStage: "motion",
    issues: ["Debt / money owed", "Motion in an existing case"],
    documents: ["Statement of Claim already filed / served", "Statement of Defence already filed / received"],
    fields: {
      "Amount claimed or disputed": "$95,000",
      "Evidence you have": "photos of the defective parts, emails complaining to the supplier",
    },
    expect: [
      "The user is the DEFENDANT responding to a summary judgment motion heard December 3, 2026: what the responding party must serve and file, and by when, counted from that date.",
      "The site may set out the test the court applies on summary judgment, from the rule, but must never say whether the motion will succeed.",
      "A corporation is a party: if the rules restrict who may act for it, the site says so and points to help.",
    ],
  },
  {
    id: "held-back-family-served-motion-to-change",
    path: "family",
    summary: "Mother served with her ex's motion to change (lower) child support.",
    city: "Sudbury",
    story:
      "my ex was ordered to pay 900 a month child support in 2023 for our 2 boys. on october 2 2026 i got served " +
      "with a motion to change, he wants to pay 400 because he says he makes less now but he just bought a new " +
      "truck. the boys live with me. what do i do",
    role: "respondent",
    stage: "responding",
    confirmStage: "responding",
    issues: ["child-support"],
    documents: ["Existing court order or agreement"],
    fields: {
      "Children / parenting details": "two boys, 8 and 10, they live with me full time",
      "Evidence you have": "the 2023 order, his facebook posts with the truck",
    },
    expect: [
      "The user RESPONDS to a motion to change a final support order, served October 2, 2026: the next form is a Response to Motion to Change (Form 15B) with her financial statement (Form 13), with the time to respond counted.",
      "Not a temporary-motion step and not an application.",
      "The site must not predict whether the support will be lowered.",
    ],
  },
  {
    id: "held-back-family-support-not-paid",
    path: "family",
    summary: "Support order in place but the payor has stopped paying; enforcement.",
    city: "Thunder Bay",
    story:
      "i have a court order from 2024 that my ex pays 650 a month child support for our daughter. he hasnt paid " +
      "since may 2026, he owes me over 3000 now. the order is with the family responsibility office but nothing is " +
      "happening. what can i do",
    role: "applicant",
    stage: "enforcement",
    confirmStage: "enforcement",
    issues: ["child-support"],
    documents: ["Existing court order or agreement"],
    fields: {
      "Children / parenting details": "one daughter, 5, lives with me",
      "Evidence you have": "the court order, my FRO statements",
    },
    expect: [
      "The user is owed support under an order filed with the Family Responsibility Office: the site explains, from the Act and rules, what enforcement steps exist and who takes them, and what she can do herself.",
      "Where the site cannot take her further (FRO's own process), it says so and points to help.",
      "Nothing that grades her case.",
    ],
  },
];
