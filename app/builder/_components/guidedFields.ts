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
import { SERVED_LINE } from "../../../src/lib/case-system/casePosition";
import {
  amountFromStory,
  childrenFromStory,
  civilRoleFromStory,
  familyRoleFromStory,
  goalFromStory,
  otherPartyFromStory,
  otherPartyNameFromStory,
  servedDateFromStory,
} from "./storyAnswers";

const storyOf = (values: GuidedValues) => (typeof values.facts === "string" ? values.facts : "");

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
  return [
    {
      key: "facts",
      label: "Your story",
      question: "In your own words, what is happening in your family situation?",
      why: "Everything else we show you starts from this, so we read it before asking anything else.",
      kind: "longtext",
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
      question: "What is the case about? Pick everything that applies.",
      why: "Each issue has its own forms and steps, so this keeps what you see to the ones that fit.",
      kind: "multi",
      options: options.issues,
    },
    {
      key: "filedDocuments",
      label: "What has been filed",
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
      question: "Tell us about the children: how many, how old, and who they live with now.",
      why: "Parenting and child support depend on the children's ages and where they live.",
      kind: "longtext",
      when: (values) => has(values, "issues", "decision-making-responsibility", "parenting-time", "child-support", "relocation"),
    },
    {
      key: "servedDate",
      label: "When you were served",
      fromStory: (values) => servedDateFromStory(storyOf(values)),
      question: "What day were you served with the court papers? If you're not sure of the exact day, you can leave this for now.",
      why: "We count your deadline to answer the papers from the day you were served, so this is the date we count it from.",
      kind: "text",
      // Someone who has already filed their answer is past that deadline.
      when: (values) => has(values, "yourRole", "respondent") && !has(values, "filedDocuments", "answer"),
    },
    {
      key: "upcomingCourtDate",
      label: "Court date",
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
}

export function civilGuidedFields(options: { issues: GuidedChoice[]; documents: GuidedChoice[] }): GuidedField[] {
  return [
    {
      key: "facts",
      label: "Your story",
      question: "In your own words, what happened?",
      why: "Everything else we show you starts from this, so we read it before asking anything else.",
      kind: "longtext",
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
      question: "Has anything been filed with the court or served yet?",
      why: "This tells us where your case is, so the next step we show is the right one.",
      kind: "multi",
      emptyValues: ["not-sure"],
      options: options.documents,
    },
    {
      key: "issues",
      label: "What the case is about",
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
}
