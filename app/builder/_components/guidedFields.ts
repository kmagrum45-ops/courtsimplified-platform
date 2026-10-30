/**
 * The one-at-a-time questions for family and civil (build order Step 2C,
 * 2026-10-12), each over one of that court's own form fields (GuidedFormChat).
 *
 * The order is the order a person thinks in: who you are in the case, what it
 * is about, where it stands, then the details. Every "why" says what the site
 * does with the answer, in plain words; none states the law, so none needs a
 * source of its own -- the law reaches the person through the sourced stage
 * answers and the checked answers, as before.
 *
 * Option values are the forms' own values, so an answer here is exactly what
 * ticking the same box on the form would record.
 */

import type { GuidedChoice, GuidedField, GuidedValues } from "./GuidedFormChat";
import { SERVED_LINE, storyHintsForDates } from "../../../src/lib/case-system/casePosition";
import {
  amountFromStory,
  childrenFromStory,
  courtDateFromStory,
  civilIssuesFromStory,
  familyIssuesFromStory,
  childrenPartialFromStory,
  civilFiledFromStory,
  civilRoleFromStory,
  familyFiledFromStory,
  familyRoleFromStory,
  goalFromStory,
  otherPartyFromStory,
  otherPartyNameFromStory,
  servedDateFromStory,
} from "./storyAnswers";

const storyOf = (values: GuidedValues) => (typeof values.facts === "string" ? values.facts : "");

/**
 * A filed-documents answer from the story, kept to the options this form
 * offers (an option the form does not list is never offered); null when
 * none of the story's values is one of them.
 */
function offeredFiled(answer: { value: string[]; quote: string } | null, options: GuidedChoice[]) {
  const value = (answer?.value ?? []).filter((item) => options.some((option) => option.value === item));
  return answer && value.length ? { value, quote: answer.quote } : null;
}

const has = (values: GuidedValues, key: string, ...wanted: string[]) => {
  const value = values[key];
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.some((item) => wanted.includes(item));
};

/*
 * A family respondent's service date (2026-10-13, walkthrough V2: the chat
 * ended "That's everything we need for now" without asking when a served
 * parent was served, the day their time to answer counts from). It is kept
 * as one line of the family form's own Timeline, because the timeline is
 * what the step page already reads for dates (storyHintsForDates on
 * app/builder/page.tsx and app/cases/[id]/page.tsx), so the date reaches the
 * deadline count with no new place to store it. The person sees the line in
 * their Timeline and can change it there.
 */
export { SERVED_LINE };


/** The service date kept in the timeline, or "" when none is. */
export function servedDateOf(timeline: string): string {
  const line = timeline.split("\n").find((entry) => entry.trim().startsWith(SERVED_LINE.trim()));
  return line ? line.trim().slice(SERVED_LINE.trim().length).trim() : "";
}

/** The timeline with its service-date line set to this date (replaced, never doubled). */
export function withServedDate(timeline: string, date: string): string {
  const kept = timeline.split("\n").filter((entry) => !entry.trim().startsWith(SERVED_LINE.trim()));
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  const cleaned = date.trim();
  return [...kept, ...(cleaned ? [`${SERVED_LINE}${cleaned}`] : [])].join("\n");
}

/** The family chat's answers that are kept in the Timeline, read back from it. */
export function familyTimelineValues(timeline: string): GuidedValues {
  return { servedDate: servedDateOf(timeline) };
}

/** The Timeline after a chat answer the Timeline keeps; null for any other answer. */
export function familyTimelineAnswer(key: string, value: string, timeline: string): string | null {
  return key === "servedDate" ? withServedDate(timeline, value) : null;
}

export function familyGuidedFields(options: { issues: GuidedChoice[]; filed: GuidedChoice[] }): GuidedField[] {
  const fields: GuidedField[] = [
    {
      key: "facts",
      label: "Your story",
      question: "In your own words, what is happening in your family situation?",
      why: "Everything else we show you starts from this, so we read it before asking anything else.",
      kind: "longtext",
      story: true,
    },
    {
      key: "yourRole",
      label: "Your side",
      fromStory: (values) => familyRoleFromStory(storyOf(values)),
      question: "Are you starting a family case, or responding to one the other person started?",
      why: "Your side decides which forms and deadlines are yours, so we only show you your own.",
      kind: "choice",
      emptyValues: ["not-sure"],
      options: [
        { value: "applicant", label: "I'm starting it (or I want to)" },
        { value: "respondent", label: "The other person started it and I was served" },
      ],
    },
    {
      key: "issues",
      label: "What the case is about",
      // The issues the story names, offered for one click (26 Oct re-test, case 14).
      fromStory: (values) => offeredFiled(familyIssuesFromStory(storyOf(values)), options.issues),
      question: "What is the case about? Pick everything that applies.",
      why: "Each issue has its own forms and steps, so this keeps what you see to the ones that fit.",
      kind: "multi",
      options: options.issues,
    },
    {
      key: "filedDocuments",
      label: "What has been filed",
      // "i got served the papers last week" answers this (walkthrough FR, 2026-10-13).
      fromStory: (values) => offeredFiled(familyFiledFromStory(storyOf(values)), options.filed),
      confirmAlone: true,
      question: "Has anything been filed with the court or given to you yet?",
      why: "This tells us where your case is, so the next step we show is the right one.",
      kind: "multi",
      emptyValues: ["not-sure"],
      options: options.filed,
    },
    {
      key: "childrenInfo",
      label: "The children",
      fromStory: (values) => childrenFromStory(storyOf(values)),
      // "our daugter": "One daughter." filled in, only the age and home asked (FR).
      partialFromStory: (values) => childrenPartialFromStory(storyOf(values)),
      question: "Tell us about the children: how many, how old, and who they live with now.",
      why: "Parenting and child support depend on the children's ages and where they live.",
      kind: "longtext",
      when: (values) => has(values, "issues", "decision-making-responsibility", "parenting-time", "child-support", "relocation"),
    },
    {
      key: "servedDate",
      label: "When you were served",
      fromStory: (values) => servedDateFromStory(storyOf(values)),
      // The year is asked for here, and an answer without one is asked to
      // add it, so the step page never asks "Which year was that?" (review
      // 2026-10-13). The why says only what the site does with the date: it
      // states no law (the counted limit and its rule are on the step page).
      question: "What day were you served with the court papers, with the year (for example, October 6, 2026)? If you're not sure of the exact day, you can leave this for now.",
      why: "We use this date to work out the timing of your next step for you.",
      kind: "text",
      // Someone who has already filed their answer is past that deadline.
      when: (values) => has(values, "yourRole", "respondent") && !has(values, "filedDocuments", "answer"),
    },
    {
      key: "upcomingCourtDate",
      // The court's own words (Jason, 2026-10-24): "Next court date", never "Court date".
      label: "Next court date",
      fromStory: (values) => courtDateFromStory(storyOf(values)),
      question: "Is there a court date coming up? If so, what is it and when?",
      why: "A date that's coming up can change what you need to do first.",
      kind: "text",
      when: (values) => has(values, "yourRole", "respondent") || has(values, "filedDocuments", "application", "answer", "motion-materials", "conference-brief"),
    },
    {
      key: "goal",
      label: "What you want",
      fromStory: (values) => goalFromStory(storyOf(values)),
      question: "What would you like to happen in the end?",
      why: "What you're asking for shapes what goes in your papers.",
      kind: "longtext",
    },
    {
      key: "otherParty",
      label: "The other person",
      // The question asks for a name: only a name the story gives is offered.
      fromStory: (values) => otherPartyNameFromStory(storyOf(values)),
      question: "What is the other person's name? You can leave this for later.",
      why: "It goes on your forms. Nothing else depends on it.",
      kind: "text",
    },
    {
      key: "urgent",
      label: "Anything urgent",
      question: "Is anything urgent, like a deadline this week, a safety worry, or someone about to move away with a child?",
      why: "Urgent situations can have a faster route, and we show those first.",
      kind: "longtext",
    },
  ];
  // The other party is asked on its own (site owner, 27 Oct: it was only ever recorded by riding along with another answer).
  const initial = new Set(["facts", "yourRole", "issues", "childrenInfo", "filedDocuments", "documents", "servedDate", "serviceDetails", "upcomingCourtDate", "amountClaimed", "goal", "legalRemedy", "otherParty", "urgent"]);
  return fields.map(field => ({ ...field, initial: initial.has(field.key) }));
}

export function civilGuidedFields(options: { issues: GuidedChoice[]; documents: GuidedChoice[] }): GuidedField[] {
  const fields: GuidedField[] = [
    {
      key: "facts",
      label: "Your story",
      question: "In your own words, what happened?",
      why: "Everything else we show you starts from this, so we read it before asking anything else.",
      kind: "longtext",
      story: true,
    },
    {
      key: "yourRole",
      label: "Your side",
      fromStory: (values) => civilRoleFromStory(storyOf(values)),
      question: "Are you suing someone, or is someone suing you?",
      why: "Your side decides which forms and deadlines are yours, so we only show you your own.",
      kind: "choice",
      emptyValues: ["not-sure"],
      options: [
        { value: "plaintiff", label: "I'm suing, or I want to (plaintiff)" },
        { value: "defendant", label: "Someone is suing me (defendant)" },
        { value: "moving-party", label: "I'm bringing a motion in a case" },
        { value: "responding-party", label: "I'm answering someone else's motion" },
      ],
    },
    {
      key: "documents",
      label: "What has been filed",
      // "i got served a statement of claim", "i want to sue the city" (walkthrough SW, 2026-10-13).
      fromStory: (values) => offeredFiled(civilFiledFromStory(storyOf(values)), options.documents),
      confirmAlone: true,
      question: "Has anything been filed with the court or served yet?",
      why: "This tells us where your case is, so the next step we show is the right one.",
      kind: "multi",
      emptyValues: ["not-sure"],
      options: options.documents,
    },
    {
      key: "issues",
      label: "What the case is about",
      // The kinds the story's words name, offered for the person to confirm (Charter re-test).
      fromStory: (values) => civilIssuesFromStory(storyOf(values)),
      question: "What kind of case is it? Pick everything that fits.",
      why: "Different kinds of cases have different rules and forms, so this keeps what you see to the ones that fit.",
      kind: "multi",
      options: options.issues,
    },
    {
      key: "amountClaimed",
      label: "Amount",
      fromStory: (values) => amountFromStory(storyOf(values)),
      question: "How much money is involved, if any?",
      why: "The amount decides which court and which procedure your case uses.",
      kind: "text",
    },
    {
      key: "serviceDetails",
      label: "When and how you were served",
      fromStory: (values) => servedDateFromStory(storyOf(values)),
      question: "When were you served with the papers, and how (in person, by mail, by email)?",
      why: "We use the date and the way you were served to count your deadline.",
      kind: "text",
      when: (values) => has(values, "yourRole", "defendant", "responding-party"),
    },
    {
      key: "courtFileNumber",
      label: "Court file number",
      question: "What is the court file number on the papers? You can leave this for later.",
      why: "It goes on everything you file in this case.",
      kind: "text",
      when: (values) => has(values, "documents", "statement-claim", "statement-defence", "notice-application", "notice-motion", "order", "judgment"),
    },
    {
      key: "legalRemedy",
      label: "What you want",
      fromStory: (values) => goalFromStory(storyOf(values)),
      question: "What would you like the court to order?",
      why: "What you're asking for shapes what goes in your papers.",
      kind: "longtext",
    },
    {
      key: "otherParty",
      label: "The other side",
      fromStory: (values) => otherPartyFromStory(storyOf(values)),
      question: "Who is the other side (a person or a business)? You can leave the name for later.",
      why: "It goes on your forms. Nothing else depends on it.",
      kind: "text",
    },
    {
      key: "urgent",
      label: "Anything urgent",
      question: "Is anything urgent, like a deadline or hearing coming up soon?",
      why: "Urgent situations can have a faster route, and we show those first.",
      kind: "longtext",
    },
  ];
  // The other party is asked on its own (site owner, 27 Oct).
  const initial = new Set(["facts", "yourRole", "issues", "filedDocuments", "documents", "servedDate", "serviceDetails", "upcomingCourtDate", "amountClaimed", "goal", "legalRemedy", "otherParty", "urgent"]);
  return fields.map(field => ({ ...field, initial: initial.has(field.key) }));
}

export function isAnswered(field: GuidedField, value: GuidedValues[string]): boolean {
  if (Array.isArray(value)) return value.filter((item) => !(field.emptyValues ?? []).includes(item)).length > 0;
  const text = (value ?? "").trim();
  return text.length > 0 && !(field.emptyValues ?? []).includes(text);
}

/** The questions still to ask, in order: applicable, unanswered, not skipped. */
export function pendingFields(fields: readonly GuidedField[], values: GuidedValues, skipped: ReadonlySet<string>): GuidedField[] {
  return fields.filter(
    (field) => field.initial !== false && (field.when ? field.when(values) : true) && !isAnswered(field, values[field.key]) && !skipped.has(field.key),
  );
}

/** The Family and Civil forms' choice lists: one copy, read by the forms and by the review (plain words, not stored values). */
/**
 * The Small Claims form's filed papers (SmallClaimsIntake.tsx), here with the other areas' lists so a
 * screen names them in words ("Anything filed yet: Yes: plaintiffs-claim", reviewer 26 Oct).
 */
export const SMALL_CLAIMS_FILED_OPTIONS: GuidedChoice[] = [
  { value: "nothing", label: "Nothing filed yet" },
  { value: "plaintiffs-claim", label: "Plaintiff’s Claim already filed / served" },
  { value: "defence", label: "Defence already filed / received" },
  { value: "affidavit-service", label: "Affidavit of Service filed with the court" },
  { value: "offer-settle", label: "Offer to Settle prepared" },
  { value: "settlement-conference", label: "Settlement conference scheduled or completed" },
  { value: "default-judgment", label: "Default judgment step started" },
  { value: "witness-list", label: "Witness list prepared" },
  { value: "enforcement-documents", label: "Enforcement documents started" },
  { value: "not-sure", label: "Not sure" },
];

export const FAMILY_FILED_OPTIONS: GuidedChoice[] = [
  // Was "Application already filed / served", which did not say by whom, and
  // whose word "served" made the role guesser call an applicant a respondent.
  { value: "application", label: "Application filed (by either person)" },
  { value: "answer", label: "Answer / response already filed" },
  { value: "financial-statement", label: "Financial statement already completed" },
  { value: "affidavit", label: "Affidavit already prepared" },
  { value: "motion-materials", label: "Motion materials already filed" },
  { value: "conference-brief", label: "Conference brief already filed" },
  { value: "order-agreement", label: "Existing court order or agreement" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
];

export const FAMILY_ISSUE_OPTIONS: GuidedChoice[] = [
  { value: "decision-making-responsibility", label: "Decision-making responsibility / custody" },
  { value: "parenting-time", label: "Parenting time / access" },
  { value: "child-support", label: "Child support" },
  { value: "spousal-support", label: "Spousal support" },
  { value: "divorce", label: "Divorce" },
  { value: "property-division", label: "Dividing property (equalization)" },
  { value: "sale-of-home", label: "Selling the family home" },
  { value: "matrimonial-home", label: "Who lives in the family home (matrimonial home, exclusive possession)" },
  { value: "safety-concerns", label: "Safety concerns" },
  { value: "relocation", label: "Relocation / moving with child" },
  { value: "disclosure", label: "Disclosure problems" },
  { value: "enforcement", label: "Enforcement / arrears" },
  { value: "adoption", label: "Adoption — step-parent, relative, or adult adoption" },
  { value: "other", label: "Other family issue" },
];

export const CIVIL_ISSUE_OPTIONS: GuidedChoice[] = [
  { value: "contract", label: "Contract / agreement dispute" },
  { value: "negligence", label: "Negligence / harm / damages" },
  { value: "institutional-negligence", label: "Institutional negligence / system failure" },
  { value: "professional-negligence", label: "Professional negligence" },
  { value: "human-rights", label: "Human Rights / discrimination" },
  { value: "disability-accommodation", label: "Disability accommodation issue" },
  { value: "employment-human-rights", label: "Employment discrimination / accommodation" },
  { value: "housing-human-rights", label: "Housing discrimination" },
  { value: "education-human-rights", label: "School / education discrimination" },
  { value: "charter", label: "Charter / constitutional issue" },
  { value: "government-public-authority", label: "Government / public authority conduct" },
  { value: "police-conduct", label: "Police / law enforcement conduct" },
  { value: "judicial-review", label: "Judicial review / review of decision" },
  { value: "tribunal-overlap", label: "Tribunal and court overlap" },
  { value: "defamation", label: "Defamation / reputational harm" },
  { value: "privacy", label: "Privacy / records / disclosure issue" },
  { value: "property", label: "Property / land / possession issue" },
  { value: "debt", label: "Debt / money owed" },
  { value: "employment", label: "Employment-related civil issue" },
  { value: "fraud-misrepresentation", label: "Fraud / misrepresentation" },
  { value: "intentional-tort", label: "Intentional harm / harassment / assault-related civil issue" },
  { value: "injunction", label: "Injunction / urgent court order" },
  { value: "estate", label: "Estate / probate / trust issue" },
  { value: "motion", label: "Motion in an existing case" },
  { value: "appeal", label: "Appeal / leave to appeal" },
  { value: "enforcement", label: "Enforcement / collection after judgment" },
  { value: "other", label: "Other civil issue" },
];

export const CIVIL_DOCUMENT_OPTIONS: GuidedChoice[] = [
  { value: "statement-claim", label: "Statement of Claim already filed / served" },
  { value: "statement-defence", label: "Statement of Defence already filed / received" },
  { value: "notice-application", label: "Notice of Application already filed / received" },
  { value: "notice-motion", label: "Notice of Motion already filed / received" },
  { value: "affidavit-service", label: "Affidavit of Service completed" },
  { value: "affidavit", label: "Affidavit already prepared" },
  { value: "tribunal-application", label: "Tribunal application already started" },
  { value: "human-rights-application", label: "Human Rights application already started" },
  { value: "judicial-review-materials", label: "Judicial review materials started" },
  { value: "demand-letter", label: "Demand letter / warning letter sent" },
  { value: "order", label: "Order already made" },
  { value: "judgment", label: "Judgment already obtained" },
  { value: "discovery", label: "Discovery / Affidavit of Documents started" },
  { value: "trial-record", label: "Trial record / trial materials started" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
];
