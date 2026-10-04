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
  expect: string[];
};

export const PERSONAS: Persona[] = [
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
