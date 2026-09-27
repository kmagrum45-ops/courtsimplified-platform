/**
 * The narrow readability exception: a term of art that cannot be simplified without
 * becoming wrong does not, by itself, fail a block.
 *
 * *** WHY THIS EXISTS, AND THE MEASUREMENT THAT FORCED IT ***
 *
 * `TARGET_GRADE` is 8, and the 16 published stage blocks meet it comfortably — they
 * top out at 7.98 with a median of 6.61, on short vocabulary: notice, clerk, claim,
 * defence.
 *
 * The serving-documents block cannot, and the reason is one phrase.
 * "Serve your documents 14 days before the settlement conference." scores **9.66 on
 * its own**. Remove the term and the same sentence scores 7.19. "settlement
 * conference" is six syllables across two words, and it is not a stylistic choice: it
 * is the name of the proceeding the 14-day period in r. 13.03 (2) runs from. Seven
 * drafter/verifier runs reached 11 of 11 sentences verified with every accuracy gate
 * clear and never cleared grade 8 at the same time.
 *
 * *** WHAT THIS IS NOT ***
 *
 * It is NOT a relaxation of the reading-level target, and it must never become one.
 * It does not lower the target, it does not grant per-block allowances, and it cannot
 * be switched on for a block that is merely hard to read.
 *
 * The test it applies is deliberately hostile to itself: the term is replaced with a
 * placeholder of the SAME WORD COUNT and the MINIMUM POSSIBLE SYLLABLE COUNT — one
 * syllable per word — and the block must then be at or under target. That asks "if
 * this term were as easy as any English phrase could possibly be, would this block
 * pass?" If the answer is no, the excess is not the term's fault and the block fails
 * normally. Padding, long sentences, an awkward construction and ordinary long words
 * all survive the substitution and all still fail.
 *
 * Holding word count and sentence count constant matters: Flesch-Kincaid is a
 * function of words, sentences and syllables, so substituting a same-word-count
 * phrase isolates the term's syllable cost and changes nothing else.
 *
 * *** THE REPETITION GUARD, WHICH IS THE LIKELIEST ROUTE TO ABUSE ***
 *
 * A block that says "settlement conference" eight times is over target because of
 * repetition, not because the term is unavoidable — and the drafter is already told
 * to name it once and then say "these documents". So each term carries
 * `maxOccurrences`, and beyond that the exception does not apply. Without this, the
 * mechanism would quietly excuse exactly the padding the readability gate exists to
 * catch.
 *
 * *** EVERY ENTRY CARRIES WHERE THE TERM COMES FROM ***
 *
 * A term qualifies because a source uses it as the name of something, not because it
 * is long. `definedAt` is a pinpoint into the vendored corpus, and
 * `test:generic-library` checks the cited passage is really there — so an entry
 * cannot be added on an assertion that some rule probably uses the phrase.
 */

import { readability, TARGET_GRADE } from "./readability";

export type TermOfArt = {
  /** Matched case-insensitively, as a whole phrase. */
  term: string;
  /** Where the source uses it as a name. Checked against the corpus by a suite. */
  definedAt: { sourceId: string; pinpoint: string; quote: string };
  /** Why no plain substitute is accurate. One line, and it has to be a real reason. */
  justification: string;
  /**
   * How many times it may appear before the excess is repetition rather than the term.
   * Two, not one: a block may reasonably name the proceeding and then state the period
   * that runs from it.
   */
  maxOccurrences: number;
};

export const TERMS_OF_ART: readonly TermOfArt[] = [
  {
    term: "settlement conference",
    definedAt: {
      sourceId: "oreg-258-98-small-claims-rules",
      pinpoint: "r. 13.01 (1)",
      quote: "A settlement conference shall be held in every defended action.",
    },
    justification:
      "The name of a specific proceeding the Rules require and fix a date for. " +
      '"Meeting" or "hearing" would be inaccurate: a settlement conference is neither ' +
      "a trial nor an informal meeting, it is the event r. 13.03 (2) counts 14 days " +
      "back from, and a reader told to serve documents before a \"meeting\" cannot " +
      "identify which event that is on their notice from the court.",
    maxOccurrences: 2,
  },
];

/**
 * A placeholder of the same word count and one syllable per word.
 *
 * Exported so a suite can assert those two properties. They are the entire basis of the
 * test: if the placeholder dropped a word, the substitution would reduce the WORD count
 * as well as the syllable count, and Flesch-Kincaid would fall for a reason that has
 * nothing to do with the term being unavoidable -- the exception would then be granted
 * to blocks it is not for. A mutation replacing "ox" with "" went unnoticed until a
 * check was written for exactly this.
 */
export function minimumSyllablePlaceholder(term: string): string {
  /*
   * "ox" rather than "a" or "the": `countSyllables` may treat very short function
   * words specially, and a word that could be counted as zero syllables would make the
   * substitution more generous than one syllable per word. A two-letter noun is
   * unambiguously one syllable.
   */
  return term
    .trim()
    .split(/\s+/)
    .map(() => "ox")
    .join(" ");
}

function occurrencesOf(term: string, text: string): number {
  const pattern = new RegExp(
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
    "gi",
  );
  return (text.match(pattern) ?? []).length;
}

function substitute(term: string, text: string): string {
  const pattern = new RegExp(
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
    "gi",
  );
  return text.replace(pattern, minimumSyllablePlaceholder(term));
}

/** One granted exception, for the log. Everything a reviewer needs to disagree. */
export type ReadabilityException = {
  term: string;
  occurrences: number;
  definedAt: TermOfArt["definedAt"];
  justification: string;
  /** The block's real grade, which is over target. */
  gradeWithTerm: number;
  /** The grade with the term reduced to one syllable per word. At or under target. */
  gradeWithoutTerm: number;
  target: number;
};

export type ReadabilityAssessment =
  | { withinTarget: true; grade: number; exception: null }
  | { withinTarget: true; grade: number; exception: ReadabilityException }
  | { withinTarget: false; grade: number; exception: null; reason: string };

/**
 * Whether a block's reading level is acceptable, and if it is only acceptable because
 * of a term of art, which one.
 *
 * Returns `withinTarget: true` with `exception: null` for a block that simply meets
 * the target — the ordinary case, and the one that must stay ordinary.
 */
export function assessReadability(
  text: string,
  target: number = TARGET_GRADE,
): ReadabilityAssessment {
  const grade = readability(text).grade;

  if (Number(grade.toFixed(1)) <= target) {
    return { withinTarget: true, grade, exception: null };
  }

  /*
   * Every allowlisted term present is substituted at once, then the block is measured.
   * Substituting one at a time would report the first term as the cause of an excess
   * that two terms share, and the log would name the wrong reason.
   */
  const present = TERMS_OF_ART.filter((entry) => occurrencesOf(entry.term, text) > 0);

  if (present.length === 0) {
    return {
      withinTarget: false,
      grade,
      exception: null,
      reason:
        `reads at grade ${grade.toFixed(1)}, above the grade ${target} target, and ` +
        `contains no allowlisted term of art — so the excess is ordinary vocabulary, ` +
        `sentence length or padding`,
    };
  }

  const overUsed = present.filter(
    (entry) => occurrencesOf(entry.term, text) > entry.maxOccurrences,
  );

  if (overUsed.length > 0) {
    const detail = overUsed
      .map(
        (entry) =>
          `"${entry.term}" appears ${occurrencesOf(entry.term, text)} times and may ` +
          `appear ${entry.maxOccurrences}`,
      )
      .join("; ");
    return {
      withinTarget: false,
      grade,
      exception: null,
      reason:
        `reads at grade ${grade.toFixed(1)}, above the grade ${target} target. ${detail}. ` +
        `Name the term once and then refer back to it — repeating it is padding, and the ` +
        `term-of-art exception does not cover repetition`,
    };
  }

  let substituted = text;
  for (const entry of present) substituted = substitute(entry.term, substituted);

  const gradeWithout = readability(substituted).grade;

  if (Number(gradeWithout.toFixed(1)) > target) {
    return {
      withinTarget: false,
      grade,
      exception: null,
      reason:
        `reads at grade ${grade.toFixed(1)}, above the grade ${target} target. Replacing ` +
        `${present.map((entry) => `"${entry.term}"`).join(" and ")} with the plainest ` +
        `possible words still leaves grade ${gradeWithout.toFixed(1)}, so the term of art ` +
        `is not what pushes this over — shorten the sentences or cut the padding`,
    };
  }

  /*
   * Granted. Where more than one term contributed, the entry names the one with the
   * most occurrences; all of them are in the justification via the reason text, and a
   * second term in the allowlist is not expected soon.
   */
  const principal = present
    .slice()
    .sort((a, b) => occurrencesOf(b.term, text) - occurrencesOf(a.term, text))[0];

  return {
    withinTarget: true,
    grade,
    exception: {
      term: principal.term,
      occurrences: occurrencesOf(principal.term, text),
      definedAt: principal.definedAt,
      justification: principal.justification,
      gradeWithTerm: Number(grade.toFixed(2)),
      gradeWithoutTerm: Number(gradeWithout.toFixed(2)),
      target,
    },
  };
}

/** One line for a log or a report. */
export function formatReadabilityException(
  exception: ReadabilityException,
  blockId: string,
): string {
  return (
    `READABILITY EXCEPTION  block=${blockId}  term="${exception.term}" ` +
    `(x${exception.occurrences})  grade ${exception.gradeWithTerm} with, ` +
    `${exception.gradeWithoutTerm} without, target ${exception.target}  ` +
    `defined at ${exception.definedAt.pinpoint} (${exception.definedAt.sourceId})`
  );
}
