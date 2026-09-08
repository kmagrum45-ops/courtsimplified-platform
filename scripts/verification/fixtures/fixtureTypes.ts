/**
 * Session 35 -- shared shape for the three end-to-end fixtures in this
 * directory. Each fixture is fabricated (invented parties, dates, amounts,
 * documents -- deliberately, per this session's brief) but shaped exactly
 * like a real user's guided-intake conversation: an opening story in first
 * person, a list of evidence items described the way a real user would
 * describe them in the chat (guided mode has no file-upload capability --
 * see guidedIntakeToSmallClaimsInput.ts's own header -- so evidence reaches
 * the pipeline as prose, same as a real user typing into the chat box), and
 * an answer for every question in QUESTION_BANK that could plausibly come
 * up, keyed by question id so the runner can answer whatever question the
 * real orchestrator actually asks next rather than a pre-scripted order.
 *
 * `answers` deliberately covers every question in QUESTION_BANK, not just
 * the ones this fixture's story is expected to trigger -- appliesWhen
 * gating and fact extraction both run for real, so the exact set of
 * questions asked is itself part of what the harness is testing, not
 * assumed in advance.
 */

export type EvidenceItem = {
  filename: string;
  type: string;
  /** One line describing what the document actually shows/contains. */
  description: string;
};

export type Fixture = {
  id: string;
  title: string;
  /** The opening free-text story, in the fabricated user's own voice. */
  story: string;
  evidenceItems: EvidenceItem[];
  /** Answer text for every QUESTION_BANK question id, keyed by id. */
  answers: Record<string, string>;
  location: { province: "Ontario"; city: string };
};
