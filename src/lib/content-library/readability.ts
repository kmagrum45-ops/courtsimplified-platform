/**
 * Reading level, measured rather than asserted.
 *
 * *** WHY THIS MATTERS MORE HERE THAN IN MOST PRODUCTS ***
 *
 * The people who most need this product are the ones who could not get a
 * lawyer. Content pitched at a reader who is comfortable with "notwithstanding
 * the foregoing" is content that excludes exactly the audience it was written
 * for, and does it invisibly — nobody writes in to say the sentence was too
 * long. So the grade level is a check, not an aspiration.
 *
 * Grade 8 is the target. It is roughly the level at which a plain-language
 * legal explanation stays accurate without becoming a translation exercise.
 *
 * *** WHAT IS MEASURED, AND WHAT IS DELIBERATELY NOT ***
 *
 * Flesch-Kincaid rewards short sentences and short words. Legal content has
 * two kinds of long token it cannot avoid:
 *
 *   citations   "(r. 11.01 (1))", "O. Reg. 258/98", "s. 44 (10)"
 *   form names  "Form 7A", "Plaintiff's Claim (Form 7A)"
 *
 * A citation is not prose. Leaving it in measures the Ontario legislative
 * drafting convention rather than our writing, and the score it produces is
 * one nobody can act on: the only way to improve it is to drop the citation,
 * which is the opposite of what this product is for. So each is collapsed to a
 * single short placeholder — the sentence keeps its shape and its boundaries,
 * and the score reflects the words we actually chose.
 *
 * What is NOT excluded: ordinary long words, subordinate clauses, passive
 * constructions, and every unavoidable term of art that is not a citation
 * ("settlement conference", "noted in default"). Those are real difficulty and
 * the writer has to deal with them, usually by saying what they mean.
 *
 * *** THE SCORE IS A FLOOR, NOT A TARGET TO OPTIMISE ***
 *
 * Flesch-Kincaid can be gamed by chopping sentences into fragments, which
 * reads worse, not better. It is used here to catch the genuinely dense
 * paragraph, not to rank two acceptable drafts. Nothing should ever be edited
 * purely to move this number.
 */

/** Measured difficulty of a passage, with enough detail to act on. */
export type ReadabilityScore = {
  /** Flesch-Kincaid grade level. Lower is easier. */
  grade: number;
  words: number;
  sentences: number;
  syllables: number;
  averageWordsPerSentence: number;
  /** Sentences well above the target, longest first. The actionable part. */
  hardestSentences: Array<{ text: string; grade: number; words: number }>;
};

/** The reading level content is written to. */
export const TARGET_GRADE = 8;

/**
 * Citations and form references, replaced with a one-syllable placeholder.
 *
 * Ordered longest-pattern-first so "Form 7A" inside "Plaintiff's Claim (Form
 * 7A)" is not half-replaced.
 */
const CITATION_PATTERNS: RegExp[] = [
  /\bO\.\s*Reg\.\s*\d+\/\d+(?:,\s*[sr]\.\s*[\d.()\s]+)?/gi,
  /\b[RS]\.S\.[OC]\.\s*\d{4},?\s*c\.\s*[\w.]+/gi,
  /\bS\.O\.\s*\d{4},?\s*c\.\s*[\w.]+(?:,\s*Sched\.\s*\w+)?/gi,
  /\brr?\.\s*\d{1,2}\.\d{1,2}(?:\.\d{1,2})?(?:\s*\(\s*[\d.]+\s*\))*/gi,
  /\bss?\.\s*\d{1,3}(?:\.\d{1,2})?(?:\s*\(\s*[\d.]+\s*\))*/gi,
  /\bForm\s+\d{1,2}[A-Z]?\b/gi,
];

/** A placeholder that is one word and one syllable, so it distorts nothing. */
const PLACEHOLDER = "rule";

export function stripCitations(text: string): string {
  let stripped = text;
  for (const pattern of CITATION_PATTERNS) {
    stripped = stripped.replace(pattern, PLACEHOLDER);
  }
  // "(rule)" and "(rule, rule)" left behind by the replacements above read as
  // empty parentheticals; drop them so they do not count as words.
  return stripped.replace(/\(\s*(?:rule)(?:\s*[,;and]+\s*rule)*\s*\)/gi, "").replace(/\s{2,}/g, " ");
}

/**
 * Syllables in an English word, by vowel groups.
 *
 * A heuristic, and knowingly so: "queue" and "hour" come out wrong. It is
 * within a few percent across a paragraph, which is all a grade-level estimate
 * ever is. The alternative — a pronunciation dictionary — would be a large
 * dependency for a number we only use to find dense paragraphs.
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length === 0) return 0;
  if (clean.length <= 3) return 1;

  const trimmed = clean
    .replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, "")
    .replace(/^y/, "");

  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[a-z]/i.test(sentence));
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => /[a-z]/i.test(word));
}

function fleschKincaid(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

export function readability(text: string): ReadabilityScore {
  const prose = stripCitations(text);
  const sentences = splitSentences(prose);
  const words = splitWords(prose);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);

  const hardestSentences = sentences
    .map((sentence) => {
      const sentenceWords = splitWords(sentence);
      const sentenceSyllables = sentenceWords.reduce((t, w) => t + countSyllables(w), 0);
      return {
        text: sentence,
        grade: fleschKincaid(sentenceWords.length, 1, sentenceSyllables),
        words: sentenceWords.length,
      };
    })
    // A very short sentence scores oddly and is never the problem.
    .filter((entry) => entry.words >= 8 && entry.grade > TARGET_GRADE)
    .sort((a, b) => b.grade - a.grade)
    .slice(0, 5);

  return {
    grade: fleschKincaid(words.length, sentences.length, syllables),
    words: words.length,
    sentences: sentences.length,
    syllables,
    averageWordsPerSentence: sentences.length ? words.length / sentences.length : 0,
    hardestSentences,
  };
}

/** Whether a passage is at or below the target reading level. */
export function isPlainEnough(text: string, target: number = TARGET_GRADE): boolean {
  return readability(text).grade <= target;
}
