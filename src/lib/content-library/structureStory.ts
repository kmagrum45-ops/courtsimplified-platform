/**
 * CHAT ITEM 7 — putting somebody's own events in the order they happened.
 *
 * *** THIS FUNCTION CANNOT REWRITE ANYTHING, AND THAT IS STRUCTURAL ***
 *
 * It takes events the person recorded and returns THE SAME STRINGS in date
 * order. It does not edit them, summarise them, merge two into one, or drop one
 * it thinks is unimportant. There is no model call and no string manipulation of
 * `what` anywhere in this file.
 *
 * `test:presentation-help` asserts the output is a PERMUTATION of the input — same
 * multiset of strings, different order — so a later change that starts tidying
 * somebody's words fails a check instead of passing a review. Level 1 forbids
 * wording rewrites, and this is what that forbidding looks like when it is real.
 *
 * *** WHY CHRONOLOGICAL AND NOT "MOST IMPORTANT FIRST" ***
 *
 * Because ordering by importance is a judgment about their case, and because the
 * Ministry's guide says chronological in as many words:
 *
 *   "Usually the best way to organize a story is in the order that the events
 *    actually happened."
 *
 * See CHRONOLOGICAL_ORDER_BASIS. The one ordering rule here comes from the
 * source, not from us.
 *
 * *** UNDATED EVENTS GO LAST, AND ARE MARKED ***
 *
 * Not dropped, and not guessed into a position. An event with no date is
 * something the person has not told us when — which is a gap to show them, not a
 * reason to leave it out of their own account.
 */

import { parseUserDate } from "../case-system/deadlines/deadlineEvents";

export type RecordedEvent = {
  id: string;
  /** What happened, in the person's own words. Never modified. */
  what: string;
  /** Whatever they typed as the date. May be absent or unparseable. */
  when?: string;
};

export type OrderedEvent = RecordedEvent & {
  /** The parsed date, where there was an unambiguous one. */
  on: string | null;
  /**
   * Set where `when` was given but could not be read as a date.
   *
   * Distinct from having no date at all: "last spring" is an answer, and telling
   * somebody it is not a date they can put in front of a judge is more useful
   * than silently sorting it to the bottom.
   */
  dateUnclear: boolean;
};

export type StructuredStory = {
  /** The person's events, chronologically, undated ones last. */
  events: OrderedEvent[];
  /** How many have no usable date. Counted, never characterised. */
  undated: number;
};

/**
 * Orders recorded events by date.
 *
 * Stable within each group, so two events on the same day — or two with no date
 * — stay in the order the person entered them. Re-ordering equal events would be
 * us deciding which came first, and we do not know.
 */
export function structureStory(events: RecordedEvent[]): StructuredStory {
  /*
   * The entry order is carried alongside rather than on the event, so the
   * returned objects are exactly the shape callers see and nothing has to be
   * deleted off them afterwards.
   */
  const withOrder = events.map((event, index) => {
    const raw = (event.when ?? "").trim();
    const on = raw ? parseUserDate(raw) : null;
    return {
      index,
      event: { ...event, on, dateUnclear: raw.length > 0 && on === null } as OrderedEvent,
    };
  });

  withOrder.sort((a, b) => {
    const left = a.event.on;
    const right = b.event.on;

    if (left && right && left !== right) return left < right ? -1 : 1;
    if (left && !right) return -1;
    if (!left && right) return 1;

    // Same date, or both undated: keep the order they entered them. Deciding
    // which of two same-day events came first is something we do not know.
    return a.index - b.index;
  });

  return {
    events: withOrder.map((entry) => entry.event),
    undated: withOrder.filter((entry) => entry.event.on === null).length,
  };
}

/**
 * What is missing from the record, as facts about the record.
 *
 * CLAUDE.md §3 allows exactly this shape — "no evidence recorded for this
 * issue", "this date is unconfirmed" — and forbids anything that grades the
 * case. So each flag names something absent and stops. There is no severity, no
 * ordering by importance, and no statement about what the absence means, because
 * all three would be assessment in a checklist's clothes.
 */
export function gapsInStory(story: StructuredStory): string[] {
  const gaps: string[] = [];

  const unclear = story.events.filter((event) => event.dateUnclear);
  for (const event of unclear) {
    gaps.push(`The date for "${trim(event.what)}" is not a date we can read.`);
  }

  const missing = story.events.filter((event) => event.on === null && !event.dateUnclear);
  for (const event of missing) {
    gaps.push(`No date is recorded for "${trim(event.what)}".`);
  }

  return gaps;
}

/** Shortens for display only. The stored event is never altered. */
function trim(text: string): string {
  return text.length <= 60 ? text : `${text.slice(0, 57)}…`;
}
