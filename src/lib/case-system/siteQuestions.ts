/**
 * THE SITE'S OWN QUESTION LIST (site owner, 14 Nov 2026, item B).
 *
 * The fixed questions the site asks, by their exact words: the Small Claims question bank, the depth questions, and
 * the Family and Civil chat questions. personWords.ts removes text from an old case only when it is one of these
 * (or one of the questions that case itself recorded as asked), so none of the person's own words can be removed;
 * test:site-text-never-facts checks with the same list.
 */
import { QUESTION_BANK } from "./intake/questionBank";
import { DEPTH_QUESTIONS } from "./intake/depth/elementQuestionRegistry";
import { civilGuidedFields, familyGuidedFields } from "../../../app/builder/_components/guidedFields";

let cached: string[] | null = null;

/** Every fixed question the site asks, trimmed, each once; only whole questions (ending in "?"). */
export function siteQuestions(): string[] {
  if (cached) return cached;
  const choice = { issues: [], filed: [], documents: [] } as never;
  const fields = [...familyGuidedFields(choice), ...civilGuidedFields(choice)].map((field) => (field as { question?: string }).question ?? "");
  cached = [...new Set([...QUESTION_BANK.map((q) => q.text), ...DEPTH_QUESTIONS.map((q) => q.text), ...fields].map((q) => q.trim()).filter((q) => q.length > 12 && q.endsWith("?")))];
  return cached;
}
