/**
 * FAMILY TOPICS THAT EXIST ONLY BETWEEN MARRIED PEOPLE, hidden from a person who was not married to the other person
 * (Chrome check of #545, 9 Nov 2026, item 7: an unmarried couple's case-type boxes offered "Divorce", "Dividing property
 * (equalization)" and "Who lives in the family home (matrimonial home...)").
 *
 * Each entry rests on the saved statute text (docs/sources/corpus), read for this list:
 *   divorce           Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 8 (1): a court "may, on application by either or both
 *                     spouses, grant a divorce ... on the ground that there has been a breakdown of their marriage".
 *   property-division Family Law Act, R.S.O. 1990, c. F.3, s. 5 (1) (Part I): "the spouse whose net family property is the
 *                     lesser ... is entitled to one-half the difference"; "spouse" (s. 1 (1)) means two persons who "are
 *                     married to each other" or "have together entered into a marriage that is voidable or void, in good
 *                     faith".
 *   matrimonial-home  Family Law Act s. 18 (1) (Part II): a matrimonial home is property "occupied by the person and his
 *                     or her spouse as their family residence"; Part II's definitions (s. 17) add none for "spouse", so
 *                     it is s. 1 (1)'s.
 *   the step "family:applicant:uncontested-or-joint-divorce", and the step "family:before-filing:property-claim-time-limit"
 *                     (a claim to equalize net family property): the same two provisions.
 * Kept for everyone, because the saved text does not limit them to married people: spousal support (s. 29 adds two
 * persons "not married to each other" who have cohabited), selling the family home (no provision read limits it).
 *
 * "Not married": the person answered No to "Were you and the other person married to each other?" (caseFile.ts
 * neverMarried), or, with no answer, their story says so in plain words (triageStoryQuote.ts storyAnswerFor). A topic
 * already chosen stays shown, so the person can see and change it (CLAUDE.md s. 4: never removed for them). A story
 * reading alone hides them behind "Show all topics", never for good.
 */
import { neverMarried, type CaseFile } from "../caseFile/caseFile";
import { storyAnswerFor } from "./triageStoryQuote";

export const MARRIED_ONLY_FAMILY_ISSUES: ReadonlySet<string> = new Set(["divorce", "property-division", "matrimonial-home"]);
export const MARRIED_ONLY_FAMILY_STEPS: ReadonlySet<string> = new Set([
  "family:applicant:uncontested-or-joint-divorce",
  "family:before-filing:property-claim-time-limit",
]);

/** How the person's case says they were not married: answered, read from the story only, or not at all. */
export type NotMarried = "answered" | "story" | null;

export function notMarriedOf(file: CaseFile | null | undefined, story?: string | null): NotMarried {
  if (file && neverMarried(file)) return "answered";
  // Answered Yes: married, whatever the story says.
  if (file && file.married.state === "answered" && file.married.value === true) return null;
  const words = story ?? (typeof file?.story.value === "string" ? file.story.value : undefined);
  return storyAnswerFor("married-to-other-party", words) === "no" ? "story" : null;
}

/** The options shown to someone not married: the married-only ones left out, except one already chosen. */
export function withoutMarriedOnly<T extends { value: string }>(options: readonly T[], notMarried: NotMarried | boolean, chosen: readonly string[] = [], marriedOnly: ReadonlySet<string> = MARRIED_ONLY_FAMILY_ISSUES): T[] {
  if (!notMarried) return [...options];
  return options.filter((option) => !marriedOnly.has(option.value) || chosen.includes(option.value));
}

/**
 * The step answers' sentences about a divorce, or a Part I or Part II claim, and nothing else (Chrome check of #550,
 * 7.2: shown on a not-married case's next step). Word for word from the published answers (test:not-married-everywhere
 * fails on one that is not there); the bases are the provisions in this file's header, and for the year of habitual
 * residence the published answer's own Divorce Act citation. Shown whole or not at all; nothing is reworded.
 */
export const MARRIED_ONLY_SENTENCES: readonly string[] = [
  "For a divorce, the court in Ontario is the Superior Court of Justice.",
  "An Ontario court can hear a divorce if you or your spouse has been habitually resident in Ontario for at least one year.",
  // The sentence before it, continued: the year before a divorce case starts.
  "That year must be the one right before the case starts.",
  "The Ontario Court of Justice is not a court for family property claims under Part I of the Family Law Act.",
  "It is not one for matrimonial home claims under Part II either.",
];

/** The text without the married-only sentences, for a person the record says was not married; otherwise unchanged. */
export function withoutMarriedOnlySentences(text: string, notMarried: boolean): string {
  if (!notMarried || !text) return text;
  let shown = text;
  for (const sentence of MARRIED_ONLY_SENTENCES) shown = shown.split(sentence).join("");
  return shown === text ? text : shown.replace(/[ \t]{2,}/g, " ").replace(/ +([.,;:])/g, "$1").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim();
}

/** A step answer as a person not married reads it: each section without the married-only sentences. */
export function withoutMarriedOnlyAnswer<T extends object>(result: T | null, notMarried: boolean): T | null {
  const answer = result && "answer" in result ? (result as { answer?: { sections?: { heading: string; text: string }[] } | null }).answer : null;
  if (!notMarried || !answer?.sections) return result;
  return { ...result, answer: { ...answer, sections: answer.sections.map((section) => ({ ...section, text: withoutMarriedOnlySentences(section.text, true) })) } } as T;
}

/** Whether any option was left out (so a story-only reading can offer "Show all topics"). */
export function leavesOutMarriedOnly(options: readonly { value: string }[], notMarried: NotMarried | boolean, chosen: readonly string[] = []): boolean {
  return withoutMarriedOnly(options, notMarried, chosen).length < options.length;
}
