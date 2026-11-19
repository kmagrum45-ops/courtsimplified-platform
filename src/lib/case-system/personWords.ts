/**
 * ONLY THE PERSON'S OWN WORDS BECOME FACTS (Chrome check of #550, 13 Nov 2026; test:site-text-never-facts).
 *
 * The site's questions reached the person's facts two ways: the home page added each follow-up answer to the story as
 * "<question> <answer>" (HomeLocationGate.tsx), and the follow-up answers about the law were added as "Q: <question>"
 * / "A: <answer>" (sourcedAnswerListText, app/builder/_components). Every reader that turned the story into facts -- the drafts' numbered facts, the
 * "From your story" quotes -- then read the site's questions as the person's words.
 *
 * frontDoorStory is the home page's one writer: the story, then each answer, never the question.
 * personWordsOnly is the one reader for text that may hold either older shape: it keeps the story and the answers and
 * drops only exact site questions and the site's own heading. It changes nothing that is stored; a case saved the old way reads
 * the same, minus the site's questions.
 */

import { siteQuestions } from "./siteQuestions";

const FOLLOW_UP_HEADING = /^Answers to follow-up questions about the law that applies:\s*$/;

/**
 * An answer the person wrote as a full sentence of their own ("No, there are no orders or written agreements.", "I don't
 * know where the water came from"): it may stand in the story as its own sentence. A bare fragment -- an address, a
 * name, "No", "No safety concerns", "Only the $1,200 deposit", "Gatineau, Quebec." -- never does: glued onto the story
 * it printed in the Form 7A reasons box (Chrome pass 3 on #550, 19 Nov 2026: "...$18.45 for medicine. 100 Sample Road,
 * Ottawa ON K1B 0B1 Circle K Convenience Stores Ltd."). The fragment is still held: home.understoodAnswers, read into
 * the case file (caseFile.ts homeAnswerFacts) and the Parties step (answeredInIntake).
 */
const SENTENCE_SUBJECT = /^(?:I|I'm|I’m|I've|I’ve|I'd|I’d|I'll|I’ll|We|We're|We’re|We've|We’ve|My|Our|He|She|They|They're|They’re|It|It's|It’s|There|The|This|That|These|Those|His|Her|Their|Nobody|No one|Someone|Nothing|Everything)\b/i;
/** A verb, so "The store on Main Street" (a subject word, no verb) stays a fragment. */
const SENTENCE_VERB = /\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|don't|don’t|didn't|didn’t|doesn't|doesn’t|can|can't|can’t|could|will|would|won't|won’t|should|must|may|might|said|says|told|paid|pay|owe|owes|owed|want|wants|know|knew|think|thought|got|get|went|came|left|took|gave|made|lost|hurt|fell|live|lives|moved|need|needs|keep|kept|see|saw|\w+ed)\b/i;
export function isOwnSentence(answer: string): boolean {
  const words = answer.trim().replace(/^(?:yes|no|not really|not yet)\s*[,.;:!-]\s*/i, "");
  return SENTENCE_SUBJECT.test(words) && SENTENCE_VERB.test(words) && words.split(/\s+/).filter(Boolean).length >= 4;
}

/**
 * The home page's story with the person's answers to its follow-up questions: their story, then each answer they wrote
 * as a full sentence (isOwnSentence), once. Never a question, never a fragment (site owner, 19 Nov 2026: the reasons,
 * the claim draft and every document use the person's own story sentences only).
 */
export function frontDoorStory(story: string, answers: readonly { question: string; answer: string }[]): string {
  const base = story.trim();
  const kept = answers.map((item) => item.answer.trim()).filter((answer, index, all) => answer && all.indexOf(answer) === index && !base.includes(answer) && isOwnSentence(answer));
  return [base, ...kept].filter(Boolean).join("\n\n");
}

/**
 * A story saved before 19 Nov 2026 holds the home page's answers glued on as paragraphs of their own. Taken out: ONLY a
 * paragraph after the first that is exactly one of this case's recorded answers (home.understoodAnswers) and not a full
 * sentence of the person's own. Nothing else is touched, so no word the person wrote in their story is ever removed.
 */
export function withoutGluedAnswers(story: string, answers: readonly string[]): string {
  if (!story || !answers.length) return story;
  const fragments = new Set(answers.map((answer) => answer.trim()).filter((answer) => answer && !isOwnSentence(answer)));
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
    if (trimmed === question) return "";
    if (trimmed.startsWith(question) && /^\s/.test(trimmed.slice(question.length))) return trimmed.slice(question.length).trim();
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
    // The follow-up block the site writes (sourcedAnswerListText): its "Q:" lines are the site's, its "A:" the person's.
    if (inFollowUps && /^\s*Q:\s/.test(line)) continue;
    // An answer is kept only when the person wrote it as a full sentence; a bare fragment ("Yes", an amount) never
    // stands in a draft on its own (site owner, 19 Nov 2026).
    if (inFollowUps) { const answer = line.replace(/^(\s*)A:\s+/, "$1"); if (isOwnSentence(answer)) kept.push(answer); continue; }
    kept.push(pastFirstParagraph ? withoutSiteQuestion(line, questions) : line);
  }
  return kept.join("\n").split(/\n{2,}/).filter((paragraph) => paragraph.trim()).join("\n\n").trim();
}
