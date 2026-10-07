/**
 * The people the page walkthrough plays, one per kind of user.
 *
 * Written the way real users write: lower case, typos, run-on sentences, and
 * details that do not apply to every surface. That is the point — the
 * walkthrough exists to see what each page does with text like this (site
 * owner, 2026-10-04: the family output "just repeats what the user put
 * verbatim", spelling mistakes "stay", and pages give "information not needed"
 * for the case). All names, dates and amounts are invented.
 *
 * `expect` is what a reader of the pages should be able to rely on. The critic
 * (scripts/walkthrough/critique.ts) is told these facts and judges each page
 * against them; nothing here is asserted by string match.
 */

export type Persona = {
  id: string;
  path: "family" | "civil" | "small-claims";
  summary: string;
  city: string;
  story: string;
  /** Family: "applicant" | "respondent" | "not-sure". Civil: the "Your role" option value. Small Claims: the role option text. */
  role: string;
  /** The intake's own "Case stage" value. */
  stage: string;
  /** Family: issue values (family-issue-<value> test ids). Civil: the issue button labels. */
  issues?: string[];
  /** The "already filed" button labels, exactly as shown. */
  documents?: string[];
  fields?: Record<string, string>;
  /** Value for the post-analysis stage confirmation select. */
  confirmStage: string;
  /**
   * Small Claims only: "guided" plays the AI-assisted intake (one question at a
   * time) instead of the form. The site owner's own live tests use this path,
   * and the form-only walkthrough never saw its questions (2026-10-06).
   */
  mode?: "form" | "guided";
  /**
   * Guided only: everything this person knows, which the answering model draws
   * on to reply to each question the way the person would. Facts not here are
   * answered "not sure".
   */
  backstory?: string;
  expect: string[];
};

export const PERSONAS: Persona[] = [
  {
    id: "small-claims-guided-ice-slip",
    path: "small-claims",
    mode: "guided",
    summary: "The site owner's own live test: hurt slipping on an icy store entrance, wants to claim for lost work.",
    city: "Ottawa",
    story:
      "i went into the walmart by my house and the entry way was full of ice with no salt on the ground. i " +
      "slipped and hurt my elbow realy bad and couldnt work for a couple weeks and im self employed so i have " +
      "no insurance. the store should have put salt down. this happened january 13 2025 at 2 pm in ottawa",
    backstory:
      "You are a self-employed house cleaner in Ottawa. On January 13, 2025 around 2 pm you slipped on ice at the " +
      "entrance of the Walmart near your home; there was no salt or sand. You hurt your right elbow, went to the " +
      "Queensway Carleton Hospital emergency room that day, and were told it was a bad sprain. You could not work " +
      "for about three weeks and lost about $2,400 in cleaning jobs (you have your booking calendar and invoices " +
      "from before and after). Prescriptions and a brace cost about $180 (you have receipts). You took two photos " +
      "of the ice on your phone right after. A store employee helped you up; you don't know his name. You told the " +
      "customer service desk that day but did not get a written report. You have not sent Walmart any letter and " +
      "have not started any court case. You want to be paid back for lost income and costs, about $2,600 plus " +
      "something for the pain. You don't know Walmart's legal name or head office address.",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF: the store's ice hurt her and she wants to claim. She must never be asked whether she is bringing or responding to a claim once the story makes it plain.",
      "It happened January 13, 2025; she has not sued yet. Any limitation period or notice step must be pointed out to her directly, with the date worked out where the rules allow.",
      "Questions should not re-ask what the story or earlier answers already said (date, place, injury, self-employed).",
      "The site must not say whether she has a good case or will win.",
    ],
  },
  {
    id: "small-claims-guided-defendant-reno",
    path: "small-claims",
    mode: "guided",
    summary: "A homeowner served by a contractor for an unpaid renovation balance; says the work was defective.",
    city: "Kitchener",
    story:
      "a contractor did my bathroom reno and now hes suing me in small claims for 7500 he says i owe. the tiles " +
      "are cracked and the shower leaks into the basement so i stopped paying. i got the plaintiffs claim in the " +
      "mail on september 28",
    backstory:
      "You live in Kitchener. A contractor (Dan Ruiz, operating as Ruiz Renovations) renovated your bathroom in " +
      "June 2026 for $15,000 under a written quote you signed. You paid $7,500 up front. By August tiles cracked " +
      "and the shower leaked into the basement ceiling. You sent him texts and two emails with photos asking him " +
      "to fix it; he came once and did not fix it. You got another contractor's written estimate of $5,200 to " +
      "redo it. You received his Plaintiff's Claim by mail on September 28, 2026; it was mailed to your home. " +
      "You have not filed anything yet. You want to dispute the claim and maybe ask him to pay for the repairs. " +
      "You have the quote, the texts, the emails, photos of the leak and the repair estimate.",
    role: "Defendant / responding party",
    stage: "responding",
    confirmStage: "responding",
    expect: [
      "The user is the DEFENDANT served with a Plaintiff's Claim by mail on September 28, 2026. The Defence (Form 9A) deadline must be pointed out directly, counted from service, including how mail service changes the date if the rules say so.",
      "A defendant's claim for the repair cost should be presented as an option with its form, not a recommendation about the merits.",
      "Questions should not re-ask what the story already said (served, amount, date received).",
      "The site must not say whether he has a good defence or will win.",
    ],
  },
  {
    id: "family-respondent-parenting",
    path: "family",
    summary: "A father who was served by the mother and wants joint decision-making; no child support issue.",
    city: "Barrie",
    story:
      "my ex gf took me to court for custody of our daugter, i got served the papers last week. she wants sole custody and wants to move to ottawa with her. i want joint custody and to keep my time with her",
    role: "respondent",
    stage: "responding",
    issues: ["decision-making-responsibility", "parenting-time", "relocation"],
    documents: [],
    fields: {
      "Children / parenting details": "she is 12 years old and goes to publc school in barrie, she plays hocky",
      "Current living situation":
        "mother primary and me, the father every second weekend and every wednsday for diner",
      "Evidence you have": "texts with her mom, school emails, the calender of my weekends",
      "Safety or urgent concerns": "none",
    },
    confirmStage: "responding",
    expect: [
      "The user is the RESPONDENT: the other parent started the case and served him.",
      "Issues are decision-making responsibility, parenting time and a proposed move. Child support was NOT chosen.",
      "Nothing should treat him as the person starting the case (no Application / Form 8 drafting for him).",
      "His words should be cleaned up or synthesized, not pasted back with typos (daugter, publc, hocky, wednsday, diner, calender).",
    ],
  },
  {
    id: "family-applicant-child-support",
    path: "family",
    summary: "A mother starting a case for child support; never married; one child.",
    city: "Sudbury",
    story:
      "me and my sons father split up 2 years ago, we were never married. he hasnt paid any child suport since march and he makes good money as a electrician. i want to get support ordered",
    role: "applicant",
    stage: "starting-case",
    issues: ["child-support"],
    documents: ["Nothing filed yet"],
    fields: {
      "Children / parenting details": "my son is 7, he lives with me full time",
      "Evidence you have": "e-transfer records from when he used to pay, texts where he says he wont pay",
    },
    confirmStage: "starting-case",
    expect: [
      "The user is the APPLICANT starting a child-support case; never married.",
      "Child support is the only issue; parenting is not in dispute.",
      "Information should be about starting a support case, not about divorce or property.",
    ],
  },
  {
    id: "civil-plaintiff-contract",
    path: "civil",
    summary: "A homeowner whose contractor took a deposit and left; claim over the Small Claims limit.",
    city: "Ottawa",
    story:
      "i hired a contracter to redo my basement for 85,000 and paid 60,000 up front. he did maybe a quarter of the work then stoped showing up and wont answer my calls since june. i want my money back",
    role: "plaintiff",
    stage: "starting-case",
    issues: ["Contract / agreement dispute"],
    documents: ["Demand letter / warning letter sent"],
    fields: {
      "Amount claimed or disputed": "$60,000",
      Timeline: "march 2 signed contract, march 5 paid deposit, june 10 last day he came",
      "Evidence you have": "the contract, bank transfer, photos of the basement, texts",
    },
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF about to start a Superior Court civil case for about $60,000.",
      "Information should be about starting a civil action, not Small Claims procedure and not family law.",
    ],
  },
  {
    id: "civil-defendant-served",
    path: "civil",
    summary: "A person served with a Statement of Claim over an unpaid personal loan.",
    city: "Toronto",
    story:
      "i got served a statement of claim from my old buisness partner saying i owe him 75,000 from a loan. it wasnt a loan it was his investment in the company. what do i do now, i was served on september 20",
    role: "defendant",
    stage: "responding",
    issues: ["Debt / money owed", "Contract / agreement dispute"],
    documents: ["Statement of Claim already filed / served"],
    fields: {
      "Amount claimed or disputed": "$75,000",
      "Evidence you have": "the partnership emails, the bank records of his deposit",
    },
    confirmStage: "responding",
    expect: [
      "The user is the DEFENDANT, served with a Statement of Claim on September 20.",
      "Information should be about responding to a civil claim (defence, timing), not about starting one.",
    ],
  },
  {
    id: "small-claims-plaintiff-invoice",
    path: "small-claims",
    summary: "A self-employed painter owed $4,800 on an unpaid invoice.",
    city: "London",
    story:
      "i painted a house for a client in july and he never paid my invoice of 4800. i sent him reminders by text and email and he keeps saying next week",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    fields: { amountClaimed: "$4,800" },
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF about to start a Small Claims case for $4,800.",
    ],
  },
  {
    id: "small-claims-defendant-car",
    path: "small-claims",
    summary: "A person served with a Plaintiff's Claim for $9,000 of car damage they dispute.",
    city: "Hamilton",
    story:
      "i was served a plaintifs claim saying i damaged my neighbours car backing out and he wants 9000. it was already damaged before. the papers came on september 25",
    role: "Defendant / responding party",
    stage: "responding",
    fields: { amountClaimed: "$9,000" },
    confirmStage: "responding",
    expect: [
      "The user is the DEFENDANT, served with a Plaintiff's Claim on September 25.",
      "Information should be about responding (Defence and its timing), not about starting a claim.",
    ],
  },
  // ---- 2026-10-07: from 8 to 20 (master plan finish line: all three courts,
  // both sides, starting, responding, mid-case and enforcement). ----------
  {
    id: "small-claims-plaintiff-judgment-unpaid",
    path: "small-claims",
    summary: "A plaintiff who won a $6,500 Small Claims judgment that has not been paid.",
    city: "Ottawa",
    story:
      "i won my small claims case against my old roommate in may, the judge said he owes me 6500 plus costs. its been months and he hasnt paid anything. he works at a car dealership in kanata i think",
    role: "Plaintiff / claimant",
    stage: "enforcement",
    fields: { amountClaimed: "$6,500" },
    confirmStage: "enforcement",
    expect: [
      "The user is the PLAINTIFF holding an unpaid Small Claims judgment for $6,500 made in May 2026.",
      "Information should be about enforcing the judgment (for example garnishment and its forms), not about starting or defending a claim.",
      "Nothing should say whether he will be able to collect.",
    ],
  },
  {
    id: "small-claims-defendant-default",
    path: "small-claims",
    summary: "A defendant who missed the deadline to defend and has been noted in default.",
    city: "Mississauga",
    story:
      "i got small claims papers in august from a company saying i owe 3200 for a gym contract. i didnt do anything because i thought it was a scam. now i got a letter saying im noted in default. what can i do i never agreed to that amount",
    role: "Defendant / responding party",
    stage: "already-started",
    fields: { amountClaimed: "$3,200" },
    confirmStage: "already-started",
    expect: [
      "The user is the DEFENDANT, served in August 2026, who did not file a Defence and has been noted in default.",
      "Information should be about what a defendant noted in default can do (setting aside the noting, and its timing), not about filing a normal Defence on time or starting a claim.",
      "Nothing should say whether a motion would succeed.",
    ],
  },
  {
    id: "small-claims-settlement-conference",
    path: "small-claims",
    summary: "A former tenant suing for a $2,000 deposit, with a settlement conference coming up.",
    city: "Kingston",
    story:
      "i sued my old landlord for my 2000 last month rent deposit he never gave back. he filed a defence saying i damaged the carpet. now the court sent a notice for a settlement conference on november 12. what do i need to do before it",
    role: "Plaintiff / claimant",
    stage: "conference",
    fields: { amountClaimed: "$2,000" },
    confirmStage: "conference",
    expect: [
      "The user is the PLAINTIFF; a Defence was filed and a settlement conference is set for November 12, 2026.",
      "Information should be about preparing for the settlement conference (what to serve and file, and by when, counted from the conference date), not about starting a claim.",
      "Nothing should push her to settle or say how the conference will go.",
    ],
  },
  {
    id: "small-claims-guided-loan-plaintiff",
    path: "small-claims",
    mode: "guided",
    summary: "A person who lent a friend $3,000 and was never paid back.",
    city: "Hamilton",
    story:
      "i lent my friend 3000 in march 2025 to fix his truck, he said he would pay me back by summer. he paid 500 in july and nothing since and now he wont answer my texts",
    backstory:
      "You live in Hamilton. On March 10, 2025 you e-transferred your friend Kyle Benn $3,000 to fix his truck. " +
      "He texted that he would pay you back by the end of the summer. He sent $500 on July 15, 2025 and nothing " +
      "after. Your last text asking for the money was in August 2026; he did not reply. You have the e-transfer " +
      "records and the texts. Nothing was signed. You have not sent a formal demand letter and have not started " +
      "any court case. You want the $2,500 back. You know his home address in Stoney Creek.",
    role: "Plaintiff / claimant",
    stage: "starting-case",
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF, owed $2,500 on a personal loan of $3,000 made March 10, 2025, with $500 repaid July 15, 2025.",
      "The two-year limitation should be pointed out with the date worked out where the rules allow, and how the part payment may matter, from the sources.",
      "Questions should not re-ask what the story already said (amount, dates, part payment).",
      "The site must not say whether he has a good case.",
    ],
  },
  {
    id: "small-claims-guided-tenant-defendant",
    path: "small-claims",
    mode: "guided",
    summary: "A former tenant sued by a landlord for $4,000 of damage, served in person.",
    city: "Windsor",
    story:
      "my old landlord is suing me for 4000 saying i damaged the walls and floors when i moved out. the damage was there before i moved in. someone handed me the plaintiffs claim at my door on october 1",
    backstory:
      "You rented an apartment in Windsor from September 2023 to June 30, 2026. Your landlord, Maria Costa, " +
      "kept your last month's rent deposit and now claims $4,000 for wall and floor damage. You have move-in " +
      "photos from September 2023 that show scuffed floors and marked walls, and texts where you reported them " +
      "then. A process server handed you the Plaintiff's Claim at your door on October 1, 2026. You have not " +
      "filed anything. You want to dispute the claim and you think she owes you the deposit back.",
    role: "Defendant / responding party",
    stage: "responding",
    confirmStage: "responding",
    expect: [
      "The user is the DEFENDANT, personally served with a Plaintiff's Claim on October 1, 2026. The Defence deadline must be pointed out directly, counted from service.",
      "Claiming the deposit back should be presented as an option (a Defendant's Claim) with its form, not as advice about the merits.",
      "The landlord's claim is the other side's; nothing should treat the user as the one suing.",
      "The site must not say whether she has a good defence.",
    ],
  },
  {
    id: "civil-plaintiff-municipal-slip",
    path: "civil",
    summary: "A person who broke a wrist on an icy city sidewalk in Toronto; claim over the Small Claims limit.",
    city: "Toronto",
    story:
      "i slipped on ice on the sidewalk on queen street in toronto on september 30 and broke my wrist. i needed surgery and cant work for months. the sidewalk wasnt salted at all. i want to sue the city",
    role: "plaintiff",
    stage: "starting-case",
    issues: ["Negligence / harm / damages"],
    documents: ["Nothing filed yet"],
    fields: {
      "Amount claimed or disputed": "$90,000",
      Timeline: "september 30 2026 fell, october 1 surgery",
      "Evidence you have": "hospital records, photos of the sidewalk, a witness",
    },
    confirmStage: "starting-case",
    expect: [
      "The user is the PLAINTIFF, injured September 30, 2026 on a City of Toronto sidewalk, nothing filed.",
      "The written notice to the City (with its short time limit counted from the fall) must be pointed out directly, with the date worked out, before anything about filing.",
      "Nothing should say whether she will win or what the claim is worth.",
    ],
  },
  {
    id: "civil-defendant-noted-default",
    path: "civil",
    summary: "A person served with a Statement of Claim two months ago who did nothing and was noted in default.",
    city: "Ottawa",
    story:
      "i got a statement of claim in august from a supplier saying my business owes them 68000. i didnt respond because i was dealing with family stuff. now their lawyer sent a letter saying i was noted in default. i dont owe that much",
    role: "defendant",
    stage: "already-started",
    issues: ["Debt / money owed"],
    documents: ["Statement of Claim already filed / served"],
    fields: {
      "Amount claimed or disputed": "$68,000",
      "Evidence you have": "invoices, my payment records, emails with the supplier",
    },
    confirmStage: "already-started",
    expect: [
      "The user is the DEFENDANT in a Superior Court action, served in August 2026, and has been noted in default.",
      "Information should be about what a defendant noted in default can do (including moving to set the noting aside), not about delivering a defence on time.",
      "If the business is a corporation, the rule on representation should be pointed out from the sources, not assumed.",
      "Nothing should say whether a motion would succeed.",
    ],
  },
  {
    id: "civil-plaintiff-motion-documents",
    path: "civil",
    summary: "A plaintiff mid-case whose defendant will not produce documents; considering a motion.",
    city: "London",
    story:
      "im suing my former business partner for 120000 for money he took from the company. we exchanged pleadings in the spring. he still hasnt given his affidavit of documents even after i asked twice. can i make him",
    role: "plaintiff",
    stage: "motion",
    issues: ["Contract / agreement dispute", "Motion in an existing case"],
    documents: ["Statement of Claim already filed / served", "Statement of Defence already filed / received"],
    fields: {
      "Amount claimed or disputed": "$120,000",
      "Evidence you have": "company bank statements, my two letters asking for his documents",
    },
    confirmStage: "motion",
    expect: [
      "The user is the PLAINTIFF in a Superior Court action; pleadings closed; the defendant has not served an affidavit of documents.",
      "Information should be about the documentary discovery obligations and bringing a motion (its form and service time), from the sources.",
      "The simplified procedure question may arise from the $120,000 amount; it should be stated conditionally, not assumed.",
      "Nothing should say whether a motion would succeed.",
    ],
  },
  {
    id: "family-applicant-divorce-property",
    path: "family",
    summary: "A married woman separated in January 2025 who wants a divorce, equalization and the house.",
    city: "Toronto",
    story:
      "me and my husband got married in 2012 and separated in january 2025. we own a house together in scarborough. i want a divorce and my fair share, and i want to stay in the house with the kids for now. he makes alot more than me",
    role: "applicant",
    stage: "starting-case",
    issues: ["property-division", "matrimonial-home", "spousal-support"],
    documents: ["Nothing filed yet"],
    fields: {
      "Current living situation": "he moved out in january, i live in the house with our two kids",
      "Evidence you have": "the deed, mortgage statements, his pay stubs from before",
    },
    confirmStage: "starting-case",
    expect: [
      "The user is the APPLICANT, married in 2012, separated January 2025, nothing filed, in Toronto.",
      "Issues are divorce, property (equalization), the matrimonial home and spousal support. Child issues were not chosen and should not drive the guidance.",
      "Information should name the right court for a divorce with property claims and the starting forms, from the sources.",
      "Time limits for an equalization claim should be pointed out where the sources state them.",
    ],
  },
  {
    id: "family-motion-to-change-support",
    path: "family",
    summary: "A father paying child support under a 2022 order who lost his job and wants it lowered.",
    city: "Sudbury",
    story:
      "i pay 900 a month child support from a court order in 2022. i lost my job in july and now im on EI making way less. i cant keep paying 900. how do i get it lowered",
    role: "applicant",
    stage: "motion",
    issues: ["child-support"],
    documents: ["Existing court order or agreement"],
    fields: {
      "Children / parenting details": "two kids, 9 and 11, they live with their mom",
      "Evidence you have": "my termination letter, EI statements, the 2022 order",
    },
    confirmStage: "motion",
    expect: [
      "The user is the PAYOR under a 2022 child support order who wants to change it after losing his job in July 2026.",
      "Information should be about a motion to change a final order (its form and what goes with it), not about starting a new application.",
      "Nothing should say whether the change will be granted or what the new amount will be.",
    ],
  },
  {
    id: "family-applicant-safety-urgent",
    path: "family",
    summary: "A mother who feels unsafe after separation and wants an urgent parenting and home order.",
    city: "Brampton",
    story:
      "my husband moved out 2 weeks ago but he keeps showing up at the house and sending me threatening texts. i dont feel safe and im scared he will take the kids. i need something from the court fast",
    role: "applicant",
    stage: "urgent",
    issues: ["safety-concerns", "decision-making-responsibility", "matrimonial-home"],
    documents: ["Nothing filed yet"],
    fields: {
      "Children / parenting details": "a 4 year old and a 7 year old, they live with me",
      "Safety or urgent concerns": "threatening texts, showing up at the house uninvited",
      "Evidence you have": "screenshots of the texts",
    },
    confirmStage: "urgent",
    expect: [
      "The user is the APPLICANT facing threats after separation; she wants an urgent order about the children and the home.",
      "Safety resources and the urgent route should come first, before routine steps.",
      "Information about urgent motions should come from the sources; nothing should say whether an order will be granted.",
    ],
  },
  {
    id: "family-respondent-case-conference",
    path: "family",
    summary: "A respondent in a child-support case with a case conference coming up.",
    city: "Hamilton",
    story:
      "my ex started a case for child support in june and i filed my answer. now there is a case conference on november 20. i dont know what i need to bring or file before it",
    role: "respondent",
    stage: "conference",
    issues: ["child-support"],
    documents: ["Application filed (by either person)", "Answer / response already filed"],
    fields: {
      "Children / parenting details": "one daughter, 6, lives with her mom",
      "Upcoming court date or deadline": "case conference november 20 2026",
    },
    confirmStage: "conference",
    expect: [
      "The user is the RESPONDENT; the application and his answer are filed; a case conference is set for November 20, 2026.",
      "Information should be about preparing for the case conference (the brief and financial disclosure, and when they are due counted from the conference date).",
      "Nothing should push settlement or say how the conference will go.",
    ],
  },
];
