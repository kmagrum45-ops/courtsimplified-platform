/**
 * KNOWN PROBLEMS FROM THE SITE OWNER'S CHROME RE-TEST OF 29 OCT (flow items C, D, H).
 *
 * Each entry is a problem reproduced by a test that asserts the WANTED property, so
 * the test fails today. Listing it here lets CI stay green while the problem waits
 * for its fix; a NEW failure (not listed) still fails the build.
 *
 * The list must stay honest both ways: when a fix makes a listed test pass, that
 * test fails with "now passes: delete its entry here" (the terminal suite) or
 * "expected to fail, but passed" (Playwright's test.fail). The update is then a
 * one-line deletion with an obvious cause (CLAUDE.md s. 5: a list that must be
 * maintained is fine; a check that punishes the maintenance is not).
 *
 * Read by: scripts/verification/verifyChrome29OctFlow.ts (terminal, free) and
 * tests/browser/retest-29oct-flow.spec.ts (browser).
 */
export type KnownProblem = {
  id: string;
  /** What the person sees, in plain words, and where the cause is. */
  reason: string;
  /** The exact name of the check or test that reproduces it. */
  test: string;
};

export const KNOWN_PROBLEMS_29OCT_FLOW: readonly KnownProblem[] = [
  {
    id: "C-sc-guided-question-saved",
    reason:
      "A question typed into the Small Claims one-at-a-time chat (\"Do I ask for $1,200 or $1,500?\") is kept word for word as the answer and never answered (orchestrateIntakeTurn.ts, the capturesField copy).",
    test: "C: a question typed as a Small Claims guided answer is not silently saved as the answer",
  },
  {
    id: "C-mixed-answer-not-split",
    reason:
      "An answer that is part statement, part question (\"$1,500, can I ask for more?\") is kept whole as the amount: the statement is not saved on its own and the question is never kept open for an answer (orchestrateIntakeTurn.ts, the capturesField copy).",
    test: "C: a mixed answer (\"$1,500, can I ask for more?\") saves the statement and keeps the question open",
  },
  {
    id: "C-guided-form-question-saved",
    reason:
      "A question typed into a civil or Family one-at-a-time answer box (\"Is there a deadline?\") passes the only check before keeping (GuidedFormChat.tsx answerNeedsMore) and is saved as the answer.",
    test: "C: a question typed into a civil or Family answer box is not kept as the answer without a note",
  },
  {
    id: "D3-explain-repeats-why",
    reason:
      "On the Small Claims form, \"Why does this matter?\" and \"I don't understand this — explain it\" under the amount show the same paragraph: both read the question's own why (questionExplanations.ts).",
    test: "D3: the explain button says something the why line does not already say",
  },
  {
    id: "D3-explain-generic",
    reason:
      "For a question with no why (side, evidence, outcome), the explain button shows the generic \"This question helps us understand your situation\" sentence (questionExplanations.ts GENERIC_FALLBACK).",
    test: "D3: every question offered with an explain button has its own explanation",
  },
  {
    id: "H1-apology-placeholder",
    reason:
      "The Small Claims form's outcome box suggests \"apology\", which the Small Claims Court cannot order (SmallClaimsIntake.tsx placeholder).",
    test: "H1: no Small Claims box suggests an outcome the court cannot order (apology)",
  },
  {
    id: "H2-dispute-one-choice",
    reason:
      "\"What kind of dispute is this?\" allows one choice only, so a case that is both unpaid money and a contract cannot say so (questionBank.ts sc-orient-dispute-category, answerType choice).",
    test: "H2: the kind of dispute can take more than one answer",
  },
  {
    id: "H3-city-lowercase",
    reason:
      "The court-office line repeats the city as typed (\"If your case is in kingston\") instead of the place's own name (nextStepPractical.ts city.trim()).",
    test: "H3: the court-office line names the city with its own capitalisation",
  },

  // The owner's Chrome test of #501's preview (29 Oct, second round). Each was also there before #501.
  {
    id: "OWNER-1-month-year-asked",
    reason:
      "A story sentence \"... in March 2026 ...\" is offered under \"Things that may have happened in your case\" with \"When, in your words\" empty and \"The exact date\" asked: dateInSentence (casePosition.ts:808) reads a full day or a day and month only, so a month and year fills nothing (EventCandidateSurface.tsx emptyDraft). Small Claims only (the surface is Small Claims only).",
    test: "OWNER-1: a month and year in an event's own sentence fills \"When, in your words\"",
  },
  {
    id: "OWNER-2-overview-keeps-story-month",
    reason:
      "The case overview's \"Case snapshot\" row \"When (your words)\" shows the story's \"March 2026\" after the exact day is recorded: it reads intake.timeline only (IntelligenceOverviewPanel.tsx:341,348), while the step page's day goes to position.dateAnswers (read by caseFileOf) and an event's exact day goes to case_events (read by neither).",
    test: "OWNER-2: the case overview's \"When\" row reads the recorded day, not only the story's words",
  },
  {
    id: "OWNER-3-topic-cut-mid-word",
    reason:
      "A chat answer ended \"...Ottawa Small Claims Co.\": a statement that is not confirmed is listed by its first 80 characters (checkedAnswer.ts:478, 616-617, 624-625, statement.text.slice(0, 80)) and the list is closed with a full stop (CheckedAnswerPanel.tsx:129).",
    test: "OWNER-3: a topic listed as not confirmed is never cut mid-word",
  },
  {
    id: "OWNER-4-chat-no-close-no-way-back",
    reason:
      "The follow-up chat has no close (app/builder/page.tsx:374 showFollowUp is only ever set true, line 2767), and after a reload nothing on the case page opens it; the only way back is \"Update your story\" and \"Show my next step\", which runs the analysis again (OWNER-5).",
    test: "OWNER-4: the follow-up chat can be closed, and the case page opens it again",
  },
  {
    id: "OWNER-5-next-step-reanalysed",
    reason:
      "Back to the questions with nothing changed, \"Show my next step\" runs the whole analysis again (about 2 minutes with the model): the guided continue handler (app/builder/page.tsx:502-516) always calls handleGuidedComplete, never checking guidanceIsCurrent (intakeReview.ts:233) on the saved case.",
    test: "OWNER-5: back to the questions with nothing changed, the next step shows without a new analysis -- small-claims",
  },
  {
    id: "OWNER-7-ask-button-wraps",
    reason:
      "At 375 px the chat's Ask button wraps one letter per line: body { overflow-wrap: anywhere } (app/globals.css:178-180) lets the word break anywhere, and the button may shrink in its flex row beside the long note (CourtAssistantChat.tsx:1530-1541, no shrink-0 or whitespace-nowrap).",
    test: "OWNER-7: at 375 px the chat's Ask button keeps its word on one line -- small-claims",
  },
];

export function isKnownProblem(testName: string): boolean {
  return KNOWN_PROBLEMS_29OCT_FLOW.some((problem) => problem.test === testName);
}
