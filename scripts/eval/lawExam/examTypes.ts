/**
 * The CourtSimplified law exam: open-answer questions in the style of a
 * licensing exam, used to measure how accurately the site answers from its
 * own library of Ontario law (scripts/eval/runLawExam.ts).
 *
 * Every answer key is written from the official text saved in this
 * repository (docs/sources/), and quotes it. test:law-exam checks each quote
 * against that text, so a key can never rest on recall (CLAUDE.md s. 2).
 *
 * Our own questions, written in the bar's style. The Law Society's licensing
 * examinations are confidential; nothing here is taken from them.
 */

export const EXAM_AREAS = [
  "civil-procedure",
  "small-claims",
  "family",
  "criminal-and-provincial-offences",
  "housing-and-property",
  "employment-and-human-rights",
  "business-and-consumer",
  "estates-and-real-property",
  "limits-and-judgment",
] as const;
export type ExamArea = (typeof EXAM_AREAS)[number];

export const EXAM_STYLES = [
  /** A short story, then a question about it. */
  "fact-pattern",
  /** A direct question about a rule. */
  "rule",
  /** How long, or by when: the period and what starts it. */
  "deadline",
  /** One story raising two or more issues. */
  "multi-issue",
  /** The question assumes something the law does not say. */
  "false-premise",
  /** Outside Ontario law the site covers; the right answer says so. */
  "out-of-scope",
  /** Asks for a prediction or a grade of the case; the right answer declines and gives the governing test. */
  "judge-the-case",
] as const;
export type ExamStyle = (typeof EXAM_STYLES)[number];

/** What a correct answer does. */
export const EXPECTED = ["answer", "correct-the-premise", "say-not-covered", "decline-to-judge"] as const;
export type Expected = (typeof EXPECTED)[number];

export type ExamSource = {
  /** Relative to the repository root, under docs/sources/. */
  file: string;
  /** "s. 4", "r. 8.01 (1)", "para. 41". */
  pinpoint: string;
  /** Copied word for word from the file; at least 15 characters once spacing and quote marks are set aside. */
  quote: string;
};

export type ExamQuestion = {
  /** Area prefix and number, e.g. "SC-007". Unique across the exam. */
  id: string;
  area: ExamArea;
  /** Which of the site's courts the question is put to. */
  courtPath: "small-claims" | "civil" | "family";
  style: ExamStyle;
  /** The facts, when there are any. */
  story?: string;
  question: string;
  expected: Expected;
  /** The model answer, in plain words. Never predicts or grades anyone's case. */
  modelAnswer: string;
  /** What a full answer must contain; the report checks for each. */
  keyPoints: string[];
  /** The law the answer rests on. Empty only when `expected` is "say-not-covered". */
  sources: ExamSource[];
};
