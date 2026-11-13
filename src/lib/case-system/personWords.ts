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
 * drops the questions and the site's own heading. It changes nothing that is stored; a case saved the old way reads
 * the same, minus the site's questions.
 */

const FOLLOW_UP_HEADING = /^Answers to follow-up questions about the law that applies:\s*$/;

/** The home page's story with the person's answers to its follow-up questions: their words only, each answer once. */
export function frontDoorStory(story: string, answers: readonly { question: string; answer: string }[]): string {
  const base = story.trim();
  const kept = answers.map((item) => item.answer.trim()).filter((answer, index, all) => answer && all.indexOf(answer) === index && !base.includes(answer));
  return [base, ...kept].filter(Boolean).join("\n\n");
}

/**
 * A paragraph the home page added the old way: the question (its words up to the last "?", which may be more than one
 * sentence) followed by the answer. Only paragraphs after the first are read this way: the first is always the person's
 * story as they wrote it. Known cost, for a case saved the old way only: a later paragraph of the person's own that
 * asks a question is shown from the words after its last "?". Nothing stored is changed.
 */
const QUESTION_THEN_ANSWER = /^([\s\S]*\?)\s+([^?]*\S[^?]*)$/;

/** The text with every site question and site heading taken out: the person's story and answers only. */
export function personWordsOnly(text: string): string {
  if (!text) return text;
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (FOLLOW_UP_HEADING.test(line.trim())) continue;
    if (/^\s*Q:\s/.test(line)) continue;
    kept.push(line.replace(/^(\s*)A:\s+/, "$1"));
  }
  const paragraphs = kept.join("\n").split(/\n{2,}/);
  return paragraphs
    .map((paragraph, index) => {
      if (index === 0) return paragraph;
      const match = paragraph.trim().match(QUESTION_THEN_ANSWER);
      return match ? match[2].trim() : paragraph;
    })
    .filter((paragraph) => paragraph.trim())
    .join("\n\n")
    .trim();
}
