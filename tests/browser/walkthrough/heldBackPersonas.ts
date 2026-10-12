/**
 * TEN HELD-BACK CASES for the beta finish line (master plan decision log,
 * 2026-10-08: "20 cases PLUS 10 new held-back cases").
 *
 * NEW SET, written 2026-10-12. It replaces the set used to find and fix bugs
 * on 2026-10-09 (commits #259, #260); that set no longer measures honestly
 * and is kept, not run, in retiredHeldBackPersonas.ts.
 *
 * WHY HELD BACK. The 20 cases in personas.ts are what the work is tuned on;
 * a site that passes only the cases it was fixed against has learned those
 * cases, not the law. These ten are written to be different from all twenty
 * and from the retired ten (other claims, other cities, other steps, one case
 * the site cannot fully handle) and are run ONLY to measure:
 * WALKTHROUGH_SET=held-back. Never tune against their reports; if one fails,
 * fix the cause in general and add a NEW case to personas.ts if a case is
 * needed to reproduce it.
 *
 * Same conventions as personas.ts: written the way people write (lower case,
 * typos), all names, dates and amounts invented, `expect` read by the critic.
 * Every legal fact in an `expect` line was checked against the saved official
 * text in docs/sources/corpus/ on 2026-10-12.
 */

import type { Persona } from "./personas";

export const HELD_BACK_PERSONAS: Persona[] = [
  {
    id: "held-back-sc-guided-wedding-photographer",
    path: "small-claims",
    mode: "guided",
    summary: "A couple's wedding photographer cancelled two weeks before the wedding and kept the deposit.",
    city: "Niagara Falls",
    story:
      "we booked a photographer for our wedding and paid her 2800 deposit in january. 2 weeks before the weding " +
      "on august 15 she texted that she double booked and cant come, we had to find someone last minute that cost " +
      "us 3400. she said she would refund but never did and now she blocked my number",
    backstory:
      "You live in Niagara Falls, Ontario. On January 9, 2026 you and your fiance signed a written contract with " +
      "Tessa Varga, who runs Golden Hour Photography as a sole proprietor out of Welland, for wedding photos for " +
      "$4,200, and you paid a $2,800 deposit by e-transfer. On August 1, 2026 she texted that she had double " +
      "booked and could not come to your August 15 wedding. You hired another photographer for $3,400 (you have " +
      "the invoice). She texted on August 3 that she would refund the deposit 'by the end of the month' and never " +
      "did; she blocked your number in September. You have the contract, the e-transfer receipt, the texts and the " +
      "new invoice. You have not sent a formal letter and have not started a case. You want the $2,800 back, plus " +
      "the $1,200 extra the new photographer cost over the original contract price if you can claim it.",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF starting a Small Claims case; nothing is filed. The next form is the Plaintiff's Claim (Form 7A); the filing fee for an infrequent claimant is $108.",
      "Where to file: the territorial division where the cause of action arose or where the defendant resides or carries on business, or the court nearest to where the defendant resides or carries on business (rule 6.01). Once issued, the claim is served personally or by an alternative to personal service (rule 8.01 (1)), within six months after it is issued (rule 8.01 (2)).",
      "The two-year limitation period runs from about August 2026 (the cancellation and the unpaid refund); it has not passed.",
      "Questions come one at a time and do not re-ask the deposit, the wedding date or the cancellation already told. Nothing may say whether the claim is strong or will succeed.",
    ],
  },
  {
    id: "held-back-sc-defendant-horse-sale",
    path: "small-claims",
    summary: "Sold a horse privately; the buyer says it was lame and has sued for the price. Served in person.",
    city: "Orillia",
    story:
      "i sold my quarter horse to a lady in june for 8500, she rode him twice before buying and had her own vet " +
      "look at him. now shes suing me in small claims saying he was lame the whole time and she wants all her " +
      "money back. a guy handed me the plaintifs claim at my barn on october 1. he was fine when he left here",
    role: "Defendant / responding party",
    stage: "responding",
    confirmStage: "responding",
    fields: { amountClaimed: "$8,500" },
    expect: [
      "The user is the DEFENDANT, personally served with a Plaintiff's Claim on October 1, 2026. Her next form is the Defence (Form 9A): served on every other party and filed with proof of service within 20 days of being served (rule 9.01), so by October 21, 2026. The fee for filing a defence is $77.",
      "If she has her own claim arising from the sale, a Defendant's Claim (Form 10A, fee $108) may be mentioned as an option, not a recommendation.",
      "She must not be treated as the one suing or offered a Plaintiff's Claim draft. Nothing may say whether her defence is good or will succeed.",
    ],
  },
  {
    id: "held-back-sc-enforcement-examination",
    path: "small-claims",
    summary: "Won a Small Claims judgment in February; the debtor has not paid and she doesn't know where he works or banks.",
    city: "Belleville",
    story:
      "i got judgment in belleville small claims court in february 2026 against a guy who did my kitchen cabinets " +
      "and never finished, the judge gave me 11400. hes paid nothing. i dont know where he works now or where he " +
      "banks so i cant garnish. he still lives in belleville i think. how do i find out what he has",
    role: "Plaintiff / claimant",
    stage: "enforcement",
    confirmStage: "enforcement",
    fields: { amountClaimed: "$11,400" },
    expect: [
      "The user is the CREDITOR (plaintiff) holding an unpaid Small Claims judgment for $11,400 made in February 2026; she does not know the debtor's employer or bank.",
      "The fitting step is an examination of the debtor: a Notice of Examination (Form 20H), issued by the clerk where the debtor resides or carries on business, requested with an Affidavit for Enforcement Request (Form 20P) (rule 20.10). The fee to issue a notice of examination is $68.",
      "The notice is served personally or by an alternative to personal service, with a blank Financial Information Form (Form 20I) if the debtor is an individual, at least 30 days before the examination date, and filed with proof of service at least three days before it (rule 8.01 (10) to (12)).",
      "Nothing may say whether she will be able to collect.",
    ],
  },
  {
    id: "held-back-sc-tenant-repairs-ltb",
    path: "small-claims",
    summary: "A current tenant wants to sue her landlord in Small Claims for unrepaired leaks and mould. Belongs at the Landlord and Tenant Board.",
    city: "Cornwall",
    story:
      "im renting an apartment in cornwall and since march 2026 the bathroom celing leaks every time upstairs " +
      "showers and theres black mould now. i asked the landlord in writing april 3 and june 20 and he does nothing. " +
      "i want to sue him in small claims for 4000 for my rent back and my ruined stuff. i still live there",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    fields: { amountClaimed: "$4,000" },
    expect: [
      "The user is a CURRENT TENANT complaining that her landlord has not repaired a leak and mould. The site must say plainly that this is a matter for the Landlord and Tenant Board, which has exclusive jurisdiction over applications under the Residential Tenancies Act (s. 168 (2)), and that a tenant may apply to the Board about a landlord's breach of the maintenance obligation (s. 29 (1)), and point her to the Board and to legal help.",
      "The one-year time limit for a tenant's application, counted from the conduct complained of (s. 29 (2)), should be pointed out.",
      "She must not be steered into a Plaintiff's Claim (Form 7A) as though Small Claims were the right place. Nothing may say whether she will get money back.",
    ],
  },
  {
    id: "held-back-family-applicant-parenting-time",
    path: "family",
    summary: "A never-married father whose ex has stopped his parenting time; starting a case.",
    city: "North Bay",
    story:
      "me and my sons mom were never maried, we split in 2024 and i had him every other weekend no problem. " +
      "since june 2026 she stoped letting me see him, she says hes too busy and doesnt answer. i havent seen him " +
      "in 4 months. i want a court order for my weekends back",
    role: "applicant",
    stage: "starting-case",
    issues: ["parenting-time"],
    documents: ["Nothing filed yet"],
    fields: {
      "Children / parenting details": "my son is 6, he lives with his mom in north bay, i live 10 min away",
      "Past caregiving / living history": "every second weekend friday to sunday from 2024 until june 2026",
      "Evidence you have": "texts where she cancels, my old calendar of weekends",
    },
    confirmStage: "starting-case",
    expect: [
      "The user is the APPLICANT starting a parenting-time case; never married; nothing filed. The starting form is an Application (Form 8), and because it claims parenting time it is filed with an affidavit in Form 35.1 (rule 35.1).",
      "The application must be served by special service by someone other than him (rule 6 (4.1)); the other parent then has 30 days after service to serve and file an Answer (rule 10 (1)).",
      "Each party must attend the mandatory information program no later than 45 days after the case is started (rule 8.1 (4)).",
      "Information should be about parenting time, not divorce, property or support. Nothing may say what schedule a court will order.",
    ],
  },
  {
    id: "held-back-family-respondent-served-support",
    path: "family",
    summary: "A husband served with his wife's Application (Form 8) for child and spousal support.",
    city: "Brantford",
    story:
      "my wife moved out in july with our 2 girls and on september 29 a process server gave me court papers, its " +
      "an application form 8 asking for child support and spousal suport. i want to pay child support but i dont " +
      "think i should pay her spousal, she works full time. what do i file",
    role: "respondent",
    stage: "responding",
    issues: ["child-support", "spousal-support"],
    documents: ["Application filed (by either person)"],
    fields: {
      "Children / parenting details": "two girls, 9 and 13, they live with their mom since july",
      "Current living situation": "she moved out in july 2026, i stayed in the rented townhouse",
      "Evidence you have": "her job posting on linkedin, my pay stubs",
    },
    confirmStage: "responding",
    expect: [
      "The user is the RESPONDENT, served with an Application (Form 8) on September 29, 2026. His next form is an Answer (Form 10), served on every other party and filed within 30 days after being served (rule 10 (1)), so by October 29, 2026.",
      "Because the application claims support, he must serve and file a financial statement (Form 13, since there is no property claim) within the time for his answer, whether or not he answers (rule 13 (1), (1.1)).",
      "Nothing should treat him as the one starting the case (no Application drafting for him). Nothing may say whether spousal support will be ordered or how much.",
    ],
  },
  {
    id: "held-back-family-motion-disclosure",
    path: "family",
    summary: "An applicant mid-case, after the case conference, bringing a motion because her ex won't give financial disclosure.",
    city: "Waterloo",
    story:
      "i started a case for child support in april and we had the case conference in september. the judge told " +
      "him to give his tax returns and business records and he still hasnt. the court gave me a motion date of " +
      "november 18 2026 to make him do it. what do i have to give and when",
    role: "applicant",
    stage: "motion",
    issues: ["child-support", "disclosure"],
    documents: ["Application filed (by either person)", "Answer / response already filed"],
    fields: {
      "Children / parenting details": "one son, 11, lives with me",
      "Evidence you have": "the case conference endorsement, my emails asking his lawyer for the documents",
      "Upcoming court date or deadline": "motion november 18 2026",
    },
    confirmStage: "motion",
    expect: [
      "The user is the APPLICANT and the MOVING PARTY on a motion set for November 18, 2026; the case conference has already been held, so a motion may now be brought (rule 14 (4)).",
      "The motion needs a Notice of Motion (Form 14) and an affidavit (Form 14A) (rule 14 (9)), served on the other party no later than six days before the motion date and filed no later than four days before it, with Saturdays, Sundays and days the court offices are closed not counted (rules 14 (11), 3 (2)); and a Confirmation of Motion (Form 14C) to the clerk by 2 p.m. three days before the motion date (rule 14 (11) (e)).",
      "Nothing may say whether the order will be made.",
    ],
  },
  {
    id: "held-back-civil-plaintiff-hidden-water-damage",
    path: "civil",
    summary: "A house buyer who found concealed foundation water damage after closing; claim over the Small Claims limit.",
    city: "St. Catharines",
    story:
      "we bought a house in st catharines that closed june 5 2026. in july after a big rain the basement flooded " +
      "and when we pulled the new drywall the foundation was cracked and there was old water stains, the sellers " +
      "had just put up new drywall and said no water problems on the form. foundation company quoted 140000",
    role: "plaintiff",
    stage: "starting-case",
    issues: ["Fraud / misrepresentation", "Property / land / possession issue"],
    documents: ["Nothing filed yet"],
    fields: {
      "Amount claimed or disputed": "$140,000",
      Timeline: "june 5 2026 closed, july 14 2026 flooded and found the cracks",
      "Evidence you have": "the sellers property information form, photos behind the drywall, the foundation quote",
    },
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF starting a Superior Court action for about $140,000, over the $50,000 Small Claims limit. The next form is a Statement of Claim (Form 14A) or a Notice of Action (Form 14C); the fee on issue is $243.",
      "The originating process is served personally or by an alternative to personal service (rule 16.01), within six months after it is issued (rule 14.08).",
      "A money claim of $200,000 or less must proceed under the simplified procedure (rule 76.02 (1)), and the claim must say it is brought under Rule 76 (rule 76.02 (4)).",
      "The two-year limitation period runs from when the claim was discovered, about July 2026 (Limitations Act, ss. 4, 5); it has not passed. Nothing may say whether the claim will succeed or what it is worth.",
    ],
  },
  {
    id: "held-back-civil-defendant-non-solicit",
    path: "civil",
    summary: "A former employee served with a Statement of Claim saying she took clients in breach of a non-solicit.",
    city: "Guelph",
    story:
      "i left my job at an insurance brokerage in may and started my own. now my old boss sued me in superior " +
      "court for 85000 saying i stole his clients and broke a non solicit in my contract. some clients followed " +
      "me on there own. i was served at my house on october 2 2026, what do i do and how long do i have",
    role: "defendant",
    stage: "responding",
    issues: ["Employment-related civil issue", "Contract / agreement dispute"],
    documents: ["Statement of Claim already filed / served"],
    fields: {
      "Amount claimed or disputed": "$85,000",
      "Evidence you have": "my employment contract, emails from clients who contacted me first",
    },
    confirmStage: "responding",
    expect: [
      "The user is the DEFENDANT, served in Ontario with a Statement of Claim on October 2, 2026. Her next form is a Statement of Defence (Form 18A), delivered (served and filed with proof of service) within 20 days after service (rule 18.01), so by October 22, 2026.",
      "A Notice of Intent to Defend (Form 18B) delivered within that time gives ten more days for the defence (rule 18.02). The filing fee for a notice of intent to defend, or for a statement of defence if none was filed, is $194.",
      "Nothing about starting a claim. Nothing may say whether her defence is good or whether the non-solicit is enforceable.",
    ],
  },
  {
    id: "held-back-civil-plaintiff-discovery",
    path: "civil",
    summary: "A plaintiff mid-case who has been served a notice of examination for discovery and hasn't done his affidavit of documents.",
    city: "Sarnia",
    story:
      "a transport truck backed into my shop in sarnia in march 2025 and i sued the trucking company for 175000 for the " +
      "building and lost business. they filed a defence in august 2026. now there lawyer sent me a notice of " +
      "examination for discovery on november 26 and asked for my affidavit of documents which i never did",
    role: "plaintiff",
    stage: "already-started",
    issues: ["Negligence / harm / damages"],
    documents: ["Statement of Claim already filed / served", "Statement of Defence already filed / received"],
    fields: {
      "Amount claimed or disputed": "$175,000",
      Timeline: "march 2025 truck hit the shop, august 2026 they filed defence, november 26 2026 my discovery",
      "Evidence you have": "repair invoices, my sales records before and after, photos of the damage",
    },
    confirmStage: "already-started",
    expect: [
      "The user is the PLAINTIFF, an individual acting in person, in a Superior Court action; pleadings are closed and the defendant has served a Notice of Examination (Form 34A) for November 26, 2026.",
      "He must serve on every other party an affidavit of documents (Form 30A for an individual) listing all relevant documents (rule 30.03). If the action is under the simplified procedure (money only, $200,000 or less), it was due within 10 days after the close of pleadings, with copies of the Schedule A documents (rule 76.03 (1)), and no party may exceed a total of three hours of oral discovery (rule 76.04 (2)); this should be stated conditionally.",
      "Information should be about discovery obligations, not starting or defending a claim. Nothing may say whether the claim will succeed.",
    ],
  },
];
