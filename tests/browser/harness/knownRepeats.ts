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
  {
    surface: "chat-reply", fact: "wants", auditRow: 1,
    reason: "The follow-up chat's closing questions are fixed sentences (conversationIntelligenceEngine.ts) that do not read the case file, so it asks what the person wants to get or fix after they said so.",
  },
  {
    surface: "chat-reply", fact: "filed", auditRow: 1,
    reason: "The follow-up chat asks whether anything has been filed, served or ordered even when the start answers or the forms already said so; its fixed question does not read the case file.",
  },
  {
    surface: "chat-reply", fact: "whenHappened", auditRow: 1,
    reason: "The follow-up chat asks for the main dates, including when the problem happened, after the person gave when it happened; its fixed question does not read the case file.",
  },
  {
    surface: "chat-reply", fact: "children", stories: ["w6-family-children"], auditRow: 1,
    reason: "Site owner, 28 Oct: the follow-up chat asks about the children after the Family questions recorded them; the chat's question does not read the case file. On the list until the chat reads it.",
  },
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
