/**
 * THE KNOWN REPEATS: EVERY PLACE THE SITE STILL ASKS AGAIN, NAMED, WITH WHY (never ask twice, site owner 28 Oct).
 *
 * The story pack fails any question whose fact the person already gave (factsAskedTwice) or whose
 * fact the saved case already holds (heldViolations), on every screen. The repeats the site is
 * known to make today are listed here, one entry each, so the gate can be on now: a violation that
 * matches an entry is written to the run's records as known and does not fail; any other violation
 * fails. Each entry names the row of the 28 Oct ask-twice audit it belongs to:
 *    1 the chat, by wording            5 the step page's service method    9 the served day for other papers
 *    2 builder screens lacking the case 6 "What to confirm next"           10 the Forms page
 *    3 the home page's story reading    7 the form views' fields           11 the Small Claims kind card
 *    4 "A few questions the law raises" 8 the Family triage                12 the depth "still owing"
 *
 * When the site is fixed, the entry stops matching anything; delete it (a stale entry is harmless
 * but says something untrue). Never add an entry without a reason a person can read.
 * Checked by scripts/verification/verifyNeverAskTwice.ts.
 */

export type KnownRepeat = {
  /** The surface the repeated question was on (askOnce.ts SCAN). */
  surface: string;
  /** The fact asked again, or the question's own id (one of the two). */
  fact?: string;
  questionId?: string;
  /** Only in these stories (story ids); every story when absent. */
  stories?: readonly string[];
  /** Why the site still asks it, in plain words. */
  reason: string;
  /** The audit row (1-12). */
  auditRow: number;
};

export const KNOWN_REPEATS: readonly KnownRepeat[] = [
  // Row 1 (the chats asking by wording) fixed 29 Oct: every chat asks by fact through the one gate
  // (caseFile.ts chatMayAsk), checked by test:chat-asks-by-fact; its four entries are deleted.
  // Row 3, seen in never-ask-twice-reading.spec.ts (a fixed reading in place of the model's).
  {
    surface: "form-field", fact: "wants", stories: ["home-reading-sc-form"], auditRow: 3,
    reason: "The person answered the home page reading's \"What would you like the court to order?\", and the Small Claims form's \"what do you want\" box is still empty: the form view does not carry the home reading's answers.",
  },
  // Row 7, seen in the story pack of 28 Oct (w2-form-defendant, w3-not-sure-35k): the Small Claims form
  // view shows its boxes empty for facts the start answers or the review already hold.
  {
    surface: "form-field", fact: "servedDate", auditRow: 7,
    reason: "The Small Claims form's box \"When and how was it served?\" stays empty after the start answers gave the day the claim was served; the form does not fill the day from the case file (the method is still its own question).",
  },
  {
    surface: "form-field", fact: "whenHappened", auditRow: 7,
    reason: "The Small Claims form's timeline box stays empty after the review answered when it happened; the review's answers are not carried into the form's boxes.",
  },
  {
    surface: "form-field", fact: "wants", auditRow: 7,
    reason: "The Small Claims form's \"what do you want\" box stays empty after the review recorded the answer (or \"I don't know yet\"), so the form asks it once more after the review's own last offer.",
  },
  // Seen 29 Oct once the recorder counts a reply in the follow-up chat as answering the question before it
  // (owner's rule): m19-laptop-repair (review); then CI 29 Oct (20d20725, the whole pack): sc-unclear (review) and
  // m04-tenant (review) -- every Small Claims story whose results-page chat asks the proof question before the form's
  // empty evidence box (the whole pack's records: these three only). Listed by story, not open to every story, so a
  // new story that shows it still fails and is looked at. The person replies to "What proof do you already have...?" with a
  // different question ("How long do I have to respond?"). Owner (29 Oct, option 1): the owner of this entry is the
  // EVIDENCE conversion (save follow-up chat replies as the person's evidence answer, and the form reads it from
  // the case file). It may be removed only when that conversion passes on every route. The recorder rule is NOT narrowed.
  {
    surface: "form-field", fact: "evidence", stories: ["m19-laptop-repair", "sc-unclear", "m04-tenant"], auditRow: 7,
    reason: "The results-page follow-up chat asked \"What proof do you already have...?\" and the person replied; the Small Claims form's evidence box then asked for the evidence again: a follow-up chat reply is not saved to the case file as the evidence answer, and the form's evidence box does not read the case file.",
  },
  // Chrome 29 Oct (finding 1), seen in the story pack's step 6 ("Update your story"): Small Claims only.
  {
    surface: "event-candidate", questionId: "when", auditRow: 2,
    reason: "\"Things that may have happened in your case\" quotes the person's sentence \"... in March 2026 ...\" and leaves \"When, in your words\" empty: dateInSentence (src/lib/case-system/casePosition.ts:808) reads only a full day or a day and month, so a month and year gives nothing to emptyDraft (app/builder/_components/EventCandidateSurface.tsx:72,84). Checked to fail in scripts/verification/verifyChrome29OctFlow.ts until fixed.",
  },
  {
    surface: "form-field", fact: "amount", auditRow: 7,
    reason: "The Small Claims form's amount box stays empty after the review recorded the amount question (or \"I don't know yet\"), so the form asks it once more after the review's own last offer.",
  },
];

export type Violation = {
  /** "twice": asked again after the person answered it in this run; "held": asked while the saved case held it. */
  rule: "twice" | "held";
  fact: string;
  surface: string;
  id: string;
  screen: string;
  text: string;
  /** For "held": the slot's state; for "twice": where it was given. */
  detail: string;
  /** Diagnostic only (never decides anything): the ask's case id, step and the page's own state for the fact (askOnce.ts diagnosticOf). */
  diag?: string;
};

/** The entry that excuses a violation in this story, or null. */
export function knownRepeatFor(violation: Pick<Violation, "surface" | "fact" | "id">, story: string, list: readonly KnownRepeat[] = KNOWN_REPEATS): KnownRepeat | null {
  return list.find((entry) =>
    entry.surface === violation.surface &&
    (entry.fact === undefined || entry.fact === violation.fact) &&
    (entry.questionId === undefined || entry.questionId === violation.id) &&
    (entry.fact !== undefined || entry.questionId !== undefined) &&
    (!entry.stories || entry.stories.includes(story)),
  ) ?? null;
}

/** The violations split into known (with their entry) and the rest. */
export function splitKnown(violations: readonly Violation[], story: string, list: readonly KnownRepeat[] = KNOWN_REPEATS) {
  const known: { violation: Violation; entry: KnownRepeat }[] = [];
  const unknown: Violation[] = [];
  for (const violation of violations) {
    const entry = knownRepeatFor(violation, story, list);
    if (entry) known.push({ violation, entry });
    else unknown.push(violation);
  }
  return { known, unknown };
}
