/**
 * ONLY THE PERSON'S OWN WORDS BECOME FACTS (Chrome check of #550, 13 Nov 2026; test:site-text-never-facts).
 *
 * The site's questions reached the person's facts two ways: the home page added each follow-up answer to the story as
 * "<question> <answer>" (HomeLocationGate.tsx), and the follow-up answers about the law were added as "Q: <question>"
 * / "A: <answer>" (sourcedAnswerListText, app/builder/_components). Every reader that turned the story into facts -- the drafts' numbered facts, the
 * "From your story" quotes -- then read the site's questions as the person's words.
 *
 * frontDoorStory is the home page's one writer: the story field only, never a question or an answer (19 Nov 2026).
 * personWordsOnly is the one reader for text that may hold either older shape: it keeps the story and the answers and
 * drops only exact site questions and the site's own heading. It changes nothing that is stored; a case saved the old way reads
 * the same, minus the site's questions.
 */

import { siteQuestions } from "./siteQuestions";

const FOLLOW_UP_HEADING = /^Answers to follow-up questions about the law that applies:\s*$/;

/**
 * The home page's story: the story field the person wrote, and nothing else (site owner, 19 Nov 2026: "replace the
 * full-sentence rule with a check that the text came from a person-written story field"). No answer joins it -- not a
 * fragment, not a full sentence, never "I do not know yet" (Chrome pass 3 on #550: S1's address and company printed in
 * the Form 7A reasons box; S4's "I do not know yet" read as a sentence and glued on). The answers are held as answers
 * (home.understoodAnswers), read into the case file and the Parties step.
 */
export function frontDoorStory(story: string): string {
  return story.trim();
}

/**
 * A story saved before 19 Nov 2026 holds the home page's answers glued on as paragraphs of their own. Taken out: ONLY a
 * paragraph after the first that is exactly one of this case's recorded answers (the home page's answers): it came from
 * an answer box, not the story field. Nothing else is touched.
 */
export function withoutGluedAnswers(story: string, answers: readonly string[]): string {
  if (!story || !answers.length) return story;
  const fragments = new Set(answers.map((answer) => answer.trim()).filter(Boolean));
  if (!fragments.size) return story;
  const paragraphs = story.split(/\r?\n\s*\r?\n/);
  const kept = paragraphs.filter((paragraph, index) => index === 0 || !fragments.has(paragraph.trim()));
  return kept.length === paragraphs.length ? story : kept.join("\n\n");
}

/**
 * A line the home page added the old way: "<question> <answer>". Taken out is ONLY a question that exactly matches the
 * site's own fixed list (siteQuestions.ts) or a question this case recorded as asked (caseFile.ts askedQuestionsOf), and only at the
 * start of a line after the person's first paragraph. Nothing is cut at a question mark, so none of the person's own
 * words can be removed (site owner, 14 Nov 2026, item B). A model-written question the case did not record stays in.
 */
function withoutSiteQuestion(line: string, questions: readonly string[]): string {
  const trimmed = line.trim();
  for (const question of questions) {
    // The question and the answer joined to it: neither is from the story field (19 Nov 2026), so the line goes.
    if (trimmed === question) return "";
    if (trimmed.startsWith(question) && /^\s/.test(trimmed.slice(question.length))) return "";
  }
  return line;
}

/**
 * The text with the site's questions and the site's own heading taken out: the person's story and answers only.
 * `asked`: questions this case recorded as asked (askedQuestionsOf), removed the same exact way as the fixed list.
 */
export function personWordsOnly(text: string, asked: readonly string[] = []): string {
  if (!text) return text;
  // Longest first, so a question that begins with a shorter one is matched whole.
  const questions = [...new Set([...siteQuestions(), ...asked.map((question) => question.trim()).filter(Boolean)])].sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  let inFollowUps = false;
  let pastFirstParagraph = false;
  for (const line of text.split(/\r?\n/)) {
    if (FOLLOW_UP_HEADING.test(line.trim())) { inFollowUps = true; continue; }
    if (!line.trim()) { inFollowUps = false; pastFirstParagraph = kept.some((earlier) => earlier.trim()); kept.push(line); continue; }
    // The follow-up block the site writes (sourcedAnswerListText): its "Q:" lines are the site's, its "A:" lines answers,
    // not the story field: none stands in a draft (site owner, 19 Nov 2026).
    if (inFollowUps) continue;
    kept.push(pastFirstParagraph ? withoutSiteQuestion(line, questions) : line);
  }
  return kept.join("\n").split(/\n{2,}/).filter((paragraph) => paragraph.trim()).join("\n\n").trim();
}
