/**
 * WHICH FACT A QUESTION ASKS FOR, FROM ITS OWN WORDS -- THE TEST'S OWN TABLE (never ask twice, 28 Oct).
 *
 * Several places ask in words and carry no question id: the follow-up chat's replies, the home
 * page's story reading ("What we still need to know"), "A few questions the law raises", the
 * overview's "What to confirm next", the Forms page, and the Small Claims depth questions (whose
 * ids are their own). The site has a wording map of its own (factOfAskedText in
 * src/lib/case-system/caseFile/factsOfQuestion.ts), and that map is the known bug: the chat asked
 * "What are you trying to get or fix through the legal process?" after the person had said what
 * they wanted, because the site's map did not know those words. So the test does not depend on
 * it: this table is built from the actual question strings the site writes
 * (conversationIntelligenceEngine.ts, answeredQuestions.ts, the depth registry, the chat's
 * children question), and the site's map is only the fallback for words this table has no row for.
 *
 * Every row matches its own question strings, checked by scripts/verification/verifyNeverAskTwice.ts.
 */
import { factOfAskedText } from "../../../src/lib/case-system/caseFile/factsOfQuestion";

/** [words, the facts they ask for]. Every matching row counts (a question may ask two things). */
export const QUESTION_WORDS: readonly (readonly [RegExp, readonly string[]])[] = [
  // What the person wants (chat: conversationIntelligenceEngine.ts "What are you trying to get or fix...").
  [/\bwhat are you trying to (?:get|fix|change|achieve)\b|\bwhat (?:outcome|result|remedy|order) (?:are|do) you (?:seeking|want|asking)\b|\bwhat (?:do|would) you (?:want|like) the court to\b/i, ["wants"]],
  // Whether anything is filed (chat "Has anything already been filed, served, ordered, ..."; the overview's "Has anything already been filed?").
  // Not "Is there already a court order or agreement?": an order or agreement in place is a fact of its own, not
  // "anything filed" (row 1 review, 29 Oct: a new case and a motion to change are different steps).
  [/\bhas anything (?:already )?been (?:filed|served|started)\b|\bhave you (?:already )?(?:filed|started)\b|\bis there already a court case\b/i, ["filed"]],
  // An order or agreement already in place: a fact of its own, so asking it again is still a repeat (site
  // owner, 29 Oct). Chat "Is there already a court order or agreement?", "What order or arrangement exists
  // right now?", and the Family framework's "Is there already a court order, agreement, upcoming conference, ...".
  [/\bis there already a court order\b|\bwhat order or arrangement exists\b/i, ["existingOrder"]],
  // Court dates (chat "Is there already ... upcoming conference, motion, or court date?"; the overview's "Are there court dates, ...").
  [/\bare there (?:any )?court dates\b|\bupcoming conference, motion, or court date\b|\bwhen is (?:the|your) (?:next )?(?:court date|hearing|conference)\b/i, ["courtDate"]],
  // When it happened (chat "What are the main dates, including when the problem happened..."; "When did the event happen?"; "What are the key dates in order?").
  [/\bwhat are the (?:main|key|exact) dates\b|\bwhen did the (?:event|problem|incident) happen\b|\bwhen did (?:this|it) happen\b/i, ["whenHappened"]],
  // The served day (the overview's "Who served whom, with which document, and when?"; the story reading's "When were you served?").
  [/\bwhen were you served\b|\bwhat (?:date|day) were you served\b|\bwho served whom\b/i, ["servedDate"]],
  // How the papers were served (the step page's service method; "How were the papers served?").
  [/\bhow (?:were|was) (?:the papers|you|it|your [a-z ]+?) served\b/i, ["serviceMethod"]],
  // The Defence (the overview's "Has the defendant filed a Defence?").
  [/\bhas the (?:defendant|other (?:party|side)) filed a defen[cs]e\b|\bhave you filed (?:a|your) defen[cs]e\b/i, ["defenceFiled"]],
  // Evidence (chat "What proof do you already have...", "Do you have photos, repair estimates...", "What records do you have: ...").
  [/\bwhat (?:proof|evidence|records) do you (?:already )?have\b|\bdo you have (?:a screenshot|photos|any (?:proof|evidence))\b|\bwhat (?:documents, records|evidence proves)\b/i, ["evidence"]],
  // The other party (chat "it sounds like this may involve X. Is that right, or is the main concern with someone else?"; "Which public actor is involved").
  [/\bis the main concern with someone else\b|\bwhich public actor is involved\b|\bwho (?:is|are) the other (?:party|side|parent)\b|\bwho (?:are|is) (?:you )?su(?:e|ing)\b/i, ["otherParty"]],
  // Children (the chat's children question, the Family triage's "Do you have a child together?", the overview's children line).
  [/\b(?:are there|do you have|have you had) (?:any )?(?:children|kids|a child)\b|\bchild(?:ren)?(?:'s)? (?:together|involved|names, ages)\b|\bdoes (?:this|the case) involve (?:any )?child/i, ["children"]],
  // The amount (the depth questions "How much is still owing, and how did you work that out?", "...how much is still owing?").
  [/\bhow much (?:is|was) (?:still )?(?:owing|owed|unpaid)\b|\bhow much (?:are you|do you want to) claim/i, ["amount"]],
  // The side (the overview's "Are you the one who started this case, or the one responding to it?"; the Forms page's "Are you responding to a Plaintiff's Claim?").
  [/\bare you the one who started this case\b|\bare you responding to (?:a|the) (?:plaintiff's claim|claim|application)\b|\bare you (?:the )?(?:plaintiff|defendant|applicant|respondent)\b/i, ["side"]],
  // Married (the Family triage; the story reading).
  [/\bwere you (?:ever )?married\b|\bare you married to\b/i, ["married"]],
];

/** Every fact the words ask for: this table's rows, else the site's own map, else none. */
export function factsOfWords(words: string): string[] {
  const text = words.replace(/\s+/g, " ").trim();
  const facts = new Set<string>();
  for (const [pattern, asks] of QUESTION_WORDS) if (pattern.test(text)) for (const fact of asks) facts.add(fact);
  if (!facts.size) {
    const fallback = factOfAskedText(text);
    if (fallback) facts.add(fallback);
  }
  return [...facts];
}

/** The question sentences in a reply: each sentence that ends in a question mark (a list item counts as its own sentence). */
export function questionSentences(reply: string): string[] {
  const sentences: string[] = [];
  for (const line of reply.split(/\n+/)) {
    for (const match of line.matchAll(/[^.?!]*\?/g)) {
      const sentence = match[0].replace(/^[\s\-•*\d.)]+/, "").replace(/\s+/g, " ").trim();
      if (sentence.length >= 8) sentences.push(sentence);
    }
  }
  return sentences;
}
