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
];
