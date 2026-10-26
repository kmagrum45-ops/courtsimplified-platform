/**
 * A CHAT QUESTION THE PERSON'S OWN STORY ALREADY ANSWERS IS NOT ASKED (Charter re-test 2026-10-26).
 *
 * The chat asked "Which public actor is involved?" after a story naming the TEST Capital Region
 * Police Service and both officers' badge numbers. Its only "already asked" check compared the chat's
 * own messages. This is the one list of the chat's questions a story can answer, each with the words
 * that answer it; the question is dropped when the story (or the conversation) has them.
 *
 * Pure. States no law.
 */
const ANSWERED_BY: [RegExp, RegExp][] = [
  // Which public body or official: the story names one.
  [/\bwhich (?:public|government)? ?(?:actor|authority|body|agency|official|institution)\b|\bwho is the (?:public|government) (?:actor|authority|body)\b|\bpublic actor\b/i,
    /\b(?:police(?: service| force| department| board)?|officers?|constables?|city of|municipality|ministry|government|crown|province of|public (?:body|authority)|board|agency|school board|hospital)\b/i],
  // Who the other party is: the story names a person or body being sued.
  [/\bwho (?:is|are) the (?:other party|other side|defendants?|respondents?)\b|\bwho (?:are you|do you want to) su(?:e|ing)\b/i,
    /\b(?:sue|suing|sued|claim against)\s+(?:the|my|a|an|[A-Z])/],
  // When it happened: the story gives a date.
  [/\bwhen did (?:this|it|the (?:incident|event|stop|arrest)) happen\b|\bwhat (?:date|day) did (?:this|it) happen\b/i,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s+\d{4})?\b|\b\d{4}-\d{2}-\d{2}\b/i],
];

/** Whether the story or conversation already answers this question. */
export function answeredInStory(question: string, known: string): boolean {
  if (!known.trim()) return false;
  return ANSWERED_BY.some(([asks, answer]) => asks.test(question) && answer.test(known));
}
