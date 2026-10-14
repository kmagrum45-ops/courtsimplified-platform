/**
 * The official forms a piece of reviewed guidance names, with their official
 * links, so the form a step tells the user to use is one click away.
 *
 * WHY (2026-10-04). A served defendant read "you can serve a Defence
 * [Form 9A]" in their next step, then opened the Forms tab and met a catalogue
 * of every form for the court with nothing pointing at 9A (page walkthrough:
 * "does not foreground those response forms and instead starts a 240-form
 * catalogue"). The guidance already names the forms; this reads the names it
 * gives and nothing else, so it adds no legal statement of its own.
 *
 * Only numbers that exist in that court's official list are returned; a
 * number the guidance mentions for another court, or a typo, is dropped.
 */

import { officialFormFor, type OfficialFormEntry } from "./officialFormLink";

const LIST = /\bForms?\s+([0-9][0-9A-Z.]*(?:\s*(?:,|\bor\b|\band\b)\s*[0-9][0-9A-Z.]*)*)/g;

export function formNumbersNamedIn(text: string): string[] {
  const numbers: string[] = [];
  for (const match of text.matchAll(LIST)) {
    for (const raw of match[1].split(/\s*(?:,|\bor\b|\band\b)\s*/)) {
      const number = raw.trim().replace(/\.+$/, "");
      if (number && !numbers.includes(number)) numbers.push(number);
    }
  }
  return numbers;
}

/** Official entries for the forms named across these texts, in the order first named. */
export function officialFormsNamedIn(texts: readonly string[], court: string): OfficialFormEntry[] {
  const found: OfficialFormEntry[] = [];
  for (const text of texts) {
    for (const number of formNumbersNamedIn(text)) {
      const entry = officialFormFor(court, number);
      if (entry && !found.some((existing) => existing.number === entry.number)) found.push(entry);
    }
  }
  return found;
}

/**
 * Family guidance often names, in one sentence, the forms for several kinds of
 * case: "serve an answer (Form 10, 33B, 33B.1, 33B.2 or 33D.3)", where only
 * Form 10 is the ordinary answer and the rest are child-protection forms. The
 * guidance says which is which; a bare list of links does not (page
 * walkthrough: adoption and child-protection forms listed as an unmarried
 * mother's next step). So in a family case, a form for one of these special
 * proceedings is listed only when the user's own words mention it.
 */
const SPECIAL_FAMILY_PROCEEDINGS: { form: RegExp; mentioned: RegExp }[] = [
  {
    form: /children[’']s aid|child protection|child, youth and family services|secure treatment|plan of care/i,
    mentioned: /children[’']s aid|\bCAS\b|child protection|protection worker/i,
  },
  { form: /adopt|openness/i, mentioned: /adopt/i },
  // "We were never married" is not a divorce (page review, 2026-10-06: an
  // unmarried mother was shown the divorce application).
  { form: /divorce/i, mentioned: /divorce|(?<!never |not |n't |were not |weren't )married|(?<!no )marriage|husband|wife/i },
];

export function relevantToFamilyCase(entry: OfficialFormEntry, userWords: string): boolean {
  return SPECIAL_FAMILY_PROCEEDINGS.every(
    ({ form, mentioned }) => !form.test(entry.title) || mentioned.test(userWords),
  );
}

/**
 * The user's own words from their intake — never the stored analysis, which is
 * model output — for relevantToFamilyCase to read.
 */
export function userWordsOf(intake: unknown): string {
  const record = intake && typeof intake === "object" ? (intake as Record<string, unknown>) : {};
  const fields = ["facts", "goal", "timeline", "evidence", "missingEvidence", "urgent", "otherParty"]
    .map((key) => (typeof record[key] === "string" ? withoutSiteQuestions(record[key] as string) : ""))
    .filter(Boolean);
  let extra = "";
  try {
    extra = record.extra ? JSON.stringify(ownAnswersOnly(record.extra)) : "";
  } catch {
    extra = "";
  }
  return [...fields, extra].join(" ");
}

/*
 * The site's own question text is not the person's words (review 2026-10-13).
 * Follow-up answers are kept as { question, answer } (sourcedAnswers.ts), and
 * the question is ours -- "Did the City of Toronto ... ?" -- so a word test
 * reading it would find a road, a libel or a divorce the person never named.
 * Only each answer is kept. The same answers, added to the story as
 * "Q: ... / A: ..." lines (withSourcedAnswerList), lose their "Q:" lines.
 */
function ownAnswersOnly(extra: unknown): unknown {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return extra;
  const out: Record<string, unknown> = { ...(extra as Record<string, unknown>) };
  if (Array.isArray(out.sourcedAnswers)) {
    out.sourcedAnswers = out.sourcedAnswers.map((item) =>
      item && typeof item === "object" && typeof (item as { answer?: unknown }).answer === "string" ? (item as { answer: string }).answer : "",
    );
  }
  return out;
}

/*
 * The labels the family intake writes in front of each line of the saved
 * `facts` record (FamilyIntake.tsx buildNarrative). They are the site's
 * words, not the person's (walkthrough run 38525903567, FM: a support-only
 * motion to change had "Children and parenting details: two kids, 9 and 11"
 * in its record, the label's "parenting" was read as a parenting claim, and
 * the information program led the card although r. 8.1 (1) para. 6 leaves a
 * support-only change out). The label goes; the person's value after it
 * stays. test:next-step checks every label buildNarrative writes is here.
 */
export const FAMILY_NARRATIVE_LABELS = [
  "Court path",
  "Stage",
  "Your full legal name",
  "Other party",
  "Existing family documents",
  "Family issue signals selected by user",
  "Children and parenting details",
  "Current living situation",
  "Past caregiving and living history",
  "Case story",
  "Timeline",
  "Known evidence",
  "Evidence still missing",
  "Requested court order / outcome",
  "Urgent or deadline-related concerns",
  "Safety concerns",
  "Property, home, support, or financial disclosure details",
  "Upcoming court date or deadline",
  "Adoption details",
  "Uploaded evidence metadata",
] as const;
const LABEL_AT_LINE_START = new RegExp(
  `^(\\s*)(?:${FAMILY_NARRATIVE_LABELS.map((label) => label.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")}): `,
);

function withoutSiteQuestions(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^Q: /.test(line.trim()) && line.trim() !== "Answers to follow-up questions about the law that applies:")
    .map((line) => line.replace(/^(\s*)A: /, "$1").replace(LABEL_AT_LINE_START, "$1"))
    .join("\n");
}
