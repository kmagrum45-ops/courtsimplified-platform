/**
 * The `alreadyCovered` suppression filter.
 *
 * LOAD-BEARING PROPERTY 1 (docs/CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md section 2):
 * a PURE function, BIASED TOWARD SUPPRESSION. When in doubt it suppresses.
 *
 * No AI, no network, no hidden state. Same inputs, same output, always —
 * matching selectQuestions.ts's existing contract. The model is never trusted
 * to notice that a question was already answered.
 *
 * The precedent is exact: smallClaimsIntelligenceEngine.ts's
 * filterConfirmedEvidenceFromMissing drops any missingEvidence item sharing 2+
 * significant words with what the user said they had, after the model
 * re-flagged already-confirmed evidence. Re-asking an answered question is the
 * same bug in a different surface.
 *
 * WHY THE BIAS IS TOWARD SUPPRESSION, and why that is not merely a tuning
 * choice — the failure modes are not symmetric:
 *
 *   - Wrongly SUPPRESSING costs one unasked question. The fact is not lost:
 *     the element still appears in the readiness section for attestation, and
 *     the state map records WHICH of the user's words caused the suppression,
 *     so the user can see it was misread and correct it.
 *   - Wrongly ASKING costs the user's belief that the system read their story.
 *     There is no recovery from that within the conversation.
 *
 * So every ambiguous case resolves to suppress. That is stated here rather
 * than left implicit in a threshold, because a future tuning pass that "fixes
 * over-suppression" by raising the bar would be reversing a deliberate
 * decision, not correcting a bug.
 *
 * Keyword overlap rather than embeddings, also deliberately: an embedding
 * check would be more accurate and is the wrong tool. It cannot be reasoned
 * about when it misfires, and a silent AI-driven suppression could drop a
 * question the user needed with no trace.
 */

/**
 * Words too common to signal that a topic was covered. Kept small on purpose:
 * an over-long stopword list makes matching HARDER, which pushes the filter
 * toward asking — the wrong direction given the bias above.
 */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
  "these", "those", "there", "here", "was", "were", "is", "are", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "of", "to", "in", "on",
  "at", "for", "with", "from", "by", "about", "as", "it", "its", "i", "me",
  "my", "we", "our", "you", "your", "he", "she", "they", "them", "his", "her",
  "their", "not", "no", "so", "just", "very", "some", "any", "all", "would",
  "could", "should", "will", "can", "what", "when", "who", "how", "which",
]);

export type AlreadyCoveredInput = {
  /** Every piece of the user's own verbatim text the pipeline already holds. */
  userTexts: string[];
  /**
   * Terms authored alongside the question that mean "this was already
   * covered". Per-question rather than one global list, because a defamation
   * publication element is covered by "posted, said, told, wrote, shared,
   * sent" and nothing generic gets that right.
   */
  coveredWhenMentioned: string[];
};

export type AlreadyCoveredResult = {
  covered: boolean;
  /** Which authored terms matched. Empty when not covered. */
  matchedTerms: string[];
  /**
   * The user's own sentence that triggered suppression, so the readiness
   * section can show what their words were taken to have supplied. A wrong
   * suppression must be VISIBLE, not silent.
   */
  matchedText?: string;
};

/** How many authored terms must appear before a question is suppressed. */
const SUPPRESSION_THRESHOLD = 1;

/**
 * Pure. Returns whether the user has already covered this question's fact.
 *
 * A single authored-term match suppresses. That is a low bar, and it is the
 * bar the bias requires: these terms are authored FOR this question, so a hit
 * is already strong evidence, and the asymmetry above says to resolve doubt
 * toward suppressing.
 */
export function isAlreadyCovered(input: AlreadyCoveredInput): AlreadyCoveredResult {
  const terms = input.coveredWhenMentioned
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0 && !STOPWORDS.has(term));

  // No authored terms means the question carries no suppression evidence.
  // Ask it: suppressing on no evidence would suppress everything, which is
  // not what "biased toward suppression" means.
  if (terms.length === 0) {
    return { covered: false, matchedTerms: [] };
  }

  const sentences = splitSentences(input.userTexts);
  const matchedTerms = new Set<string>();
  let matchedText: string | undefined;

  for (const sentence of sentences) {
    const words = tokenize(sentence);
    if (words.size === 0) continue;

    for (const term of terms) {
      if (matchesTerm(term, sentence, words)) {
        matchedTerms.add(term);
        if (!matchedText) matchedText = sentence.trim();
      }
    }
  }

  return {
    covered: matchedTerms.size >= SUPPRESSION_THRESHOLD,
    matchedTerms: [...matchedTerms].sort(),
    matchedText: matchedTerms.size >= SUPPRESSION_THRESHOLD ? matchedText : undefined,
  };
}

/**
 * A multi-word authored term matches as a phrase; a single word matches a
 * whole token.
 *
 * Token matching rather than substring: substring matching would let "sent"
 * match "consented" or "present", suppressing a question on a coincidence.
 * That is the one place the bias does NOT apply — a spurious match is not
 * ambiguity, it is a wrong answer, and biasing toward suppression is about
 * genuine doubt, not about accepting noise.
 */
function matchesTerm(term: string, sentence: string, words: Set<string>): boolean {
  if (term.includes(" ")) {
    return sentence.toLowerCase().includes(term);
  }

  if (words.has(term)) return true;

  // Accept the common inflections of an authored verb ("post" -> "posted",
  // "posting", "posts") without reaching for a stemmer. Deliberately narrow.
  return (
    words.has(`${term}s`) ||
    words.has(`${term}d`) ||
    words.has(`${term}ed`) ||
    words.has(`${term}ing`)
  );
}

function splitSentences(userTexts: string[]): string[] {
  return userTexts
    .filter((text) => typeof text === "string" && text.trim().length > 0)
    .flatMap((text) => text.split(/(?<=[.!?])\s+|\n+/))
    .filter((sentence) => sentence.trim().length > 0);
}

function tokenize(sentence: string): Set<string> {
  return new Set(
    sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0 && !STOPWORDS.has(word)),
  );
}
