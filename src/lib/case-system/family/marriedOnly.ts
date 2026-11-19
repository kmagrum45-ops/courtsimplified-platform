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

/**
 * How the person's case says they were not married: answered, read from the story only, "unsure" (they said "I'm not
 * sure" whether they were married: the married-only topics stay hidden too, with MARRIED_UNSURE_NOTE; site owner, 14 Nov
 * 2026, decision A), or not at all.
 */
export type NotMarried = "answered" | "story" | "unsure" | null;

export function notMarriedOf(file: CaseFile | null | undefined, story?: string | null): NotMarried {
  if (file && neverMarried(file)) return "answered";
  if (file && file.married.state === "unsure") return "unsure";
  // Answered Yes: married, whatever the story says.
  if (file && file.married.state === "answered" && file.married.value === true) return null;
  const words = story ?? (typeof file?.story.value === "string" ? file.story.value : undefined);
  return storyAnswerFor("married-to-other-party", words) === "no" ? "story" : null;
}

/**
 * Whether married-only content is hidden for this case: the person answered they were not married, or that they are not
 * sure (decision A). The one test every screen hides married-only issues, steps, sentences and forms by.
 */
export function hidesMarriedOnly(file: CaseFile | null | undefined): boolean {
  return Boolean(file) && (neverMarried(file!) || file!.married.state === "unsure");
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
  const answer = result && "answer" in result ? (result as { answer?: { sections?: { heading: string; text: string }[]; sources?: { name: string; pinpoint?: string }[] } | null }).answer : null;
  if (!notMarried || !answer?.sections) return result;
  // Its Sources too: none that only married people's cases rest on (isMarriedOnlyLaw; full local run of 17 Nov, the case
  // page's full answer listed the Divorce Act after "No" and "not sure").
  const sources = answer.sources?.filter((source) => !isMarriedOnlyLaw(`${source.name}${source.pinpoint ? `, ${source.pinpoint}` : ""}`));
  return { ...result, answer: { ...answer, sections: answer.sections.map((section) => ({ ...section, text: withoutMarriedOnlySentences(section.text, true) })), ...(sources ? { sources } : {}) } } as T;
}

/** Whether any option was left out (so a story-only reading can offer "Show all topics"). */
export function leavesOutMarriedOnly(options: readonly { value: string }[], notMarried: NotMarried | boolean, chosen: readonly string[] = []): boolean {
  return withoutMarriedOnly(options, notMarried, chosen).length < options.length;
}

/**
 * A provision only married people's cases rest on, by its citation: the Divorce Act (a divorce and corollary relief
 * between spouses, s. 8 (1) above), and Parts I and II of the Family Law Act (ss. 4 to 28: net family property and the
 * matrimonial home, "spouse" as s. 1 (1) defines it, above). Part III (support, s. 29 on) is never one: it reaches two
 * persons not married who have cohabited. Left out of "The law behind this" for someone not married or not sure
 * (Chrome milestone test of #550, rows 40 and 44: the Divorce Act, s. 7.3, listed after "No").
 */
export function isMarriedOnlyLaw(citation: string): boolean {
  if (/\bDivorce Act\b/i.test(citation)) return true;
  const fla = /\bFamily Law Act\b[^;]*?\bs(?:s|ections?)?\.?\s*(\d+)/i.exec(citation);
  if (!fla) return false;
  const section = Number(fla[1]);
  return section >= 4 && section <= 28;
}

/**
 * Words that show married-only content on a screen, for the browser checks (ask-once-pages.spec.ts): each sentence above,
 * the folded fees part's heading (nextStepPractical.ts FEES_IF_CLAIMED_LABEL, asserted equal by test:not-married-everywhere),
 * the triage's divorce line, the Divorce Act as a law-list line, and the two married-only steps' "what can happen next"
 * words. Not r. 13 (1)'s quote: it is about a claim for support too (listed for the wording review, 16 Nov 2026).
 */
export const MARRIED_ONLY_SCREEN_TEXT: readonly string[] = [
  ...MARRIED_ONLY_SENTENCES,
  "Only if the case also asks for a divorce, or claims property or the matrimonial home",
  "Asking a court for a divorce",
  "Divorce Act, R.S.C. 1985",
  "Either spouse may start a divorce case",
  "A claim to equalize net family property has its own time limit",
];

/**
 * The analysis as someone not married or not sure reads it: its applied law and its research's provisions without the
 * married-only ones (isMarriedOnlyLaw). The overview reads the analysis through it once, so "The law behind this" and
 * every other part agree (Chrome milestone test of #550, rows 40 and 44).
 */
export function withoutMarriedOnlyLaw<A extends { appliedLaw?: { citation?: string; label: string }[]; research?: { findings: { question?: string; provisions: { citation?: string; label: string }[] }[] } }>(analysis: A, notMarried: boolean): A {
  if (!notMarried) return analysis;
  const keep = (item: { citation?: string; label: string }) => !isMarriedOnlyLaw(item.citation || item.label);
  // A research question is the model's own words: one that names married-only law, or whose every provision is one,
  // goes with them (Chrome pass 2 on #550, 7.7 and 7.9: "Should the parenting application proceed under the Children's
  // Law Reform Act or the Divorce Act…" after No and "not sure").
  const keepFinding = (finding: { question?: string; provisions: { citation?: string; label: string }[] }) =>
    !MARRIED_ONLY_QUESTION.test(finding.question ?? "") && !(finding.provisions.length > 0 && finding.provisions.every((item) => !keep(item)));
  return {
    ...analysis,
    ...(analysis.appliedLaw ? { appliedLaw: analysis.appliedLaw.filter(keep) } : {}),
    ...(analysis.research ? { research: { ...analysis.research, findings: analysis.research.findings.filter(keepFinding).map((finding) => ({ ...finding, provisions: finding.provisions.filter(keep) })) } } : {}),
  };
}

/** A research question that names law only married people's cases rest on (isMarriedOnlyLaw's, in words). */
export const MARRIED_ONLY_QUESTION = /\bDivorce Act\b|\bdivorce\b|\bmatrimonial home\b|\bequali[sz]ation\b|\bnet family property\b|\bPart (?:I|II) of the Family Law Act\b/i;
