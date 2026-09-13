/**
 * Surfaces inconsistencies between recorded events. Never resolves them.
 *
 * COSTS NOTHING. Pure functions over live event rows — no API call, no network.
 * Read-time, like deriveCaseStage, and stores nothing.
 *
 * THE RULE THIS FOLLOWS. The user knows what happened and the site does not. A
 * defence recorded with no service recorded is procedurally odd, and the
 * overwhelmingly likely explanation is that the user recorded one and not the
 * other — not that the court did something impossible. So this NAMES the
 * oddity, cites the rule that makes it odd, says plainly that it may be a gap
 * in what is recorded, and offers the user the moves. It never deletes,
 * reorders, infers a missing event, or adjusts a date.
 *
 * WHY IT LIVES BESIDE deriveCaseStage. Same inputs, same read-time contract,
 * same transparency requirement: deriveCaseStage already returns basis[] so a
 * derivation is never a black box, and an inconsistency notice is the same kind
 * of thing pointed the other way.
 *
 * DATES. A sequence check only runs where BOTH dates are recorded as 'exact'.
 * Comparing an approximate date is arithmetic on a recollection, and this
 * codebase does not compute dates for users.
 */

import {
  liveCaseEvents,
  reliableOccurredAt,
  type CaseEventRow,
} from "./caseEventAdapter";
import {
  SMALL_CLAIMS_RULES_SOURCE_URL,
  SMALL_CLAIMS_RULES_VERIFIED_AT,
  type CaseEventType,
} from "./caseEventTypes";

export type CaseEventInconsistency = {
  id: string;
  /** What is odd, in plain words. Never "you are wrong". */
  observation: string;
  /** The provision that makes it odd, quoted. */
  rule: string;
  ruleQuote: string;
  sourceUrl: string;
  verifiedAt: string;
  /**
   * Always includes leaving it alone. The site is not confident enough to
   * insist, and an unrecorded event is not an error.
   */
  options: string[];
  /** Event ids involved, so the UI can point at them. */
  relatedEventIds: string[];
};

const SOURCE = {
  sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
  verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
};

/** "That may just be a gap in what's recorded here — you'd know." */
const GAP_NOTE =
  "That may simply be a gap in what has been recorded here rather than anything wrong with the case.";

type Ordering = {
  id: string;
  later: CaseEventType;
  earlier: CaseEventType;
  rule: string;
  ruleQuote: string;
  /** Why the earlier event is presupposed, in plain words. */
  because: string;
};

/**
 * Orderings the regulation establishes.
 *
 * Each is a PRESUPPOSITION drawn from the rule's own words, not a workflow
 * someone thought sensible. If a rule does not establish the ordering, it is
 * not in this list.
 */
const ORDERINGS: Ordering[] = [
  {
    id: "defence-without-service",
    later: "defence-filed",
    earlier: "claim-served",
    rule: "O. Reg. 258/98, r. 9.01",
    ruleQuote:
      "A defendant who wishes to dispute a plaintiff's claim shall, within 20 days of being " +
      "served with the claim, (a) serve on every other party a defence (Form 9A); and (b) file " +
      "the defence, with proof of service, with the clerk.",
    because: "the rule runs the time for a defence from being served with the claim",
  },
  {
    id: "service-without-filing",
    later: "claim-served",
    earlier: "claim-filed",
    rule: "O. Reg. 258/98, r. 7.01 (1)",
    ruleQuote:
      "An action shall be commenced by filing a plaintiff's claim (Form 7A) with the clerk, " +
      "together with a copy of the claim for each defendant.",
    because: "a claim is filed with the clerk before it is served",
  },
  {
    id: "conference-without-defence",
    later: "settlement-conference-held",
    earlier: "defence-filed",
    rule: "O. Reg. 258/98, r. 13.01 (1)",
    ruleQuote: "A settlement conference shall be held in every defended action.",
    because: "the rule attaches the settlement conference to a defended action",
  },
  {
    id: "trial-date-without-conference",
    later: "trial-date-fixed",
    earlier: "settlement-conference-held",
    rule: "O. Reg. 258/98, r. 16.01 (1)",
    ruleQuote:
      "The clerk shall fix a date for trial and serve a notice of trial on each party who has " +
      "filed a claim or defence if, (a) a settlement conference has been held; and (b) a party " +
      "has filed a request to the clerk (Form 9B) to fix a date for trial and has paid the " +
      "required fee.",
    because: "the rule makes a settlement conference a precondition to fixing a trial date",
  },
  {
    id: "enforcement-without-order",
    later: "enforcement-step",
    earlier: "order-or-judgment-received",
    rule: "O. Reg. 258/98, r. 20",
    ruleQuote:
      "Rule 20 governs enforcement of orders, naming among others the affidavit for enforcement " +
      "request (Form 20P), the certificate of judgment (Form 20A), the writ of delivery " +
      "(Form 20B) and writs of seizure and sale (Forms 20C and 20D).",
    because: "enforcement under the rule operates on an order",
  },
];

function ofType(rows: CaseEventRow[], type: CaseEventType): CaseEventRow[] {
  return rows.filter((row) => row.event_type === type);
}

function labelWithDate(row: CaseEventRow): string {
  const when = row.occurred_at_raw ? ` on ${row.occurred_at_raw}` : "";
  return `"${row.title}"${when}`;
}

/**
 * Inconsistencies among the live events for one case.
 *
 * Returns an empty array when nothing is odd. An empty array is not a finding
 * that the record is complete — only that nothing here contradicts anything
 * else here.
 */
export function findCaseEventInconsistencies(
  rows: CaseEventRow[],
): CaseEventInconsistency[] {
  const live = liveCaseEvents(rows);
  const found: CaseEventInconsistency[] = [];

  // ---- 1. A recorded event whose precondition is not recorded ----

  for (const ordering of ORDERINGS) {
    const laterEvents = ofType(live, ordering.later);
    if (laterEvents.length === 0) continue;
    if (ofType(live, ordering.earlier).length > 0) continue;

    found.push({
      id: ordering.id,
      observation:
        `You have recorded ${labelWithDate(laterEvents[0])}, and nothing recorded for the step ` +
        `before it — ${ordering.because}. ${GAP_NOTE}`,
      rule: ordering.rule,
      ruleQuote: ordering.ruleQuote,
      ...SOURCE,
      options: [
        "Add the earlier event, if it happened",
        "Correct the event you recorded",
        "Leave it as it is",
      ],
      relatedEventIds: laterEvents.map((row) => row.id),
    });
  }

  // ---- 2. Dated sequence inversions, EXACT dates only ----
  //
  // An approximate date is the user's best recollection. Comparing one would
  // manufacture a contradiction out of a guess and then ask the user to explain
  // it, which is worse than staying quiet.

  for (const ordering of ORDERINGS) {
    const laterEvents = ofType(live, ordering.later);
    const earlierEvents = ofType(live, ordering.earlier);
    if (laterEvents.length === 0 || earlierEvents.length === 0) continue;

    for (const later of laterEvents) {
      const laterDate = reliableOccurredAt(later);
      if (!laterDate) continue;

      for (const earlier of earlierEvents) {
        const earlierDate = reliableOccurredAt(earlier);
        if (!earlierDate) continue;
        if (earlierDate <= laterDate) continue;

        found.push({
          id: `${ordering.id}-out-of-order`,
          observation:
            `You have recorded ${labelWithDate(later)} as happening before ` +
            `${labelWithDate(earlier)}, and ${ordering.because}. ` +
            `Both dates are recorded as exact, so one of them may need correcting — ` +
            `or the sequence may genuinely have run that way in your case.`,
          rule: ordering.rule,
          ruleQuote: ordering.ruleQuote,
          ...SOURCE,
          options: [
            "Correct one of the dates",
            "Change a date to approximate, if you are not certain",
            "Leave it as it is",
          ],
          relatedEventIds: [later.id, earlier.id],
        });
      }
    }
  }

  return found;
}

/**
 * Live events of a singleton type that already exist.
 *
 * Used before recording a new event so a collision is SURFACED rather than
 * merged or silently duplicated. This does not decide anything: the caller asks
 * the user whether it is the same thing, a correction, or something else.
 *
 * Note the cardinality distinction this respects: `singleton-per-party` types
 * (claim-served, defence-filed, noted-in-default) are NOT reported here,
 * because a case with three defendants legitimately has three of each and this
 * table has no party model.
 */
export function existingSingletonEvents(
  rows: CaseEventRow[],
  type: CaseEventType,
  isSingleton: (type: CaseEventType) => boolean,
): CaseEventRow[] {
  if (!isSingleton(type)) return [];
  return ofType(liveCaseEvents(rows), type);
}
