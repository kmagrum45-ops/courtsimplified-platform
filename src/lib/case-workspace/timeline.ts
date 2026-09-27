/**
 * The case chronology: documents, events the user entered, and computed deadlines,
 * merged into one list where EVERY item says where it came from.
 *
 * WHAT THIS CATCHES: a date presented as fact when it was a guess, and a computed
 * deadline presented as something read off a court file.
 *
 * *** WHY THE SOURCE TAG IS NOT DECORATION ***
 *
 * Three completely different kinds of thing end up on one line of a chronology:
 *
 *   - `document` — a date on a piece of paper the user holds. Strongest.
 *   - `user-entered` — something they remember and typed. Only as good as memory.
 *   - `computed` — a date nobody has seen, worked out by counting from a rule.
 *
 * Presented identically they look equally solid, and the computed one looks the most
 * solid of all because it is precise. It is the least: it depends on the accuracy of
 * a date the user supplied, and the deadline engine says so in its own caution text.
 * A litigant who cannot tell these apart cannot tell which of their dates would
 * survive being questioned.
 *
 * So `source` is required on every item — not optional with a default, because a
 * default is how an untagged item ends up wearing the wrong tag. `test:workspace-timeline`
 * asserts every item has one and that a computed item carries its citation.
 *
 * *** WHY THIS MODULE COMPOSES NO PROSE ABOUT DEADLINES ***
 *
 * ACCURACY_ENGINE, Decision 5: `outputGuard` is an allowlist, and a string reaches a
 * user only if it is a content-library item. The 18 deadline sentences live in
 * `deadlineTemplates.ts`, are indexed by `contentInventory`, appear in the review
 * packet, and are guarded before being filled.
 *
 * Interpolating a deadline sentence here would route prose about how the law counts
 * days around the one control that exists to stop that — quietly, because text that
 * never reaches the guard cannot be blocked by it. So computed items carry the
 * statement `computedDeadlinesFor` already produced, verbatim, and this file writes
 * not one word of law.
 *
 * *** WHAT THIS MODULE MAY NOT DO ***
 *
 * It orders events. It does not say which matter, which are missing in a way that
 * hurts, or what any of it means for the case — CLAUDE.md §3. A gap in a chronology
 * is reported as "no document recorded for this" and never as a weakness.
 *
 * NO MODEL IS CALLED HERE. Pure functions.
 */

import type { ComputedDeadline } from "../content-library/computedDeadline";
import { formatForCourt, type DatePrecision } from "./parseDate";
import { exhibitLabel } from "./exhibitNumbering";
import type { TimelineEventTypeId } from "./documentTypes";

export type TimelineSource =
  | {
      kind: "document";
      documentId: string;
      /** "4A", where one has been assigned. */
      exhibitLabel: string | null;
      /** Shown as the source line. */
      description: string;
      /**
       * How the document's date was arrived at. A date read by OCR from a
       * photograph is not the same claim as one the user confirmed, and a
       * chronology that cannot say which is which invites the user to rely on the
       * wrong one.
       */
      dateConfirmedByUser: boolean;
    }
  | {
      kind: "user-entered";
      eventId: string;
      description: string;
    }
  | {
      kind: "computed";
      deadlineId: string;
      /** The rule it was counted under, e.g. "r. 11.06". For the check-the-rule link. */
      rule: string | null;
      /** Where the reader can check that rule themselves. */
      ruleUrl: string | null;
      description: string;
    };

export type TimelineItem = {
  /** ISO date. Every item on the chronology has one; undated things are not here. */
  date: string;
  precision: DatePrecision;
  /** The date as a reader should see it, respecting precision. */
  displayDate: string;
  /** What happened. For a document, the user's label or the document's name. */
  title: string;
  eventType: TimelineEventTypeId | null;
  source: TimelineSource;
  /**
   * The deadline engine's own caution and uncertainty, passed through untouched for
   * a computed item. Never rewritten — see the note about outputGuard above.
   */
  notes: string[];
};

export type TimelineDocumentInput = {
  id: string;
  userDate: string | null;
  userDatePrecision?: DatePrecision;
  userLabel: string | null;
  originalName: string;
  userType: TimelineEventTypeId | null;
  exhibitNumber: number | null;
  exhibitSuffix: string | null;
  /**
   * False where the date came from extraction or OCR and the user has not confirmed
   * it. The document still appears; it is labelled as unconfirmed.
   */
  dateConfirmedByUser: boolean;
};

export type TimelineEventInput = {
  id: string;
  eventDate: string | null;
  eventDatePrecision?: DatePrecision;
  title: string;
  eventType: TimelineEventTypeId | null;
};

export type TimelineBuildInput = {
  documents: readonly TimelineDocumentInput[];
  events: readonly TimelineEventInput[];
  /** Straight from computedDeadlinesFor. Already guarded and filled. */
  deadlines: readonly ComputedDeadline[];
  /**
   * The stage-map deadline metadata, so a computed item can name its rule. Keyed by
   * deadlineId. Supplied by the caller because this module does not read the stage
   * map — that would make a pure ordering function depend on the content library.
   */
  deadlineRules?: Readonly<Record<string, { rule: string | null; url: string | null; what: string }>>;
};

export type Timeline = {
  items: TimelineItem[];
  /**
   * Documents and events with no date at all. Listed so they are visible rather
   * than silently absent from the chronology — the "Date needed" group.
   */
  undated: { kind: "document" | "user-entered"; id: string; title: string }[];
  counts: { fromDocuments: number; userEntered: number; computed: number };
};

/** ISO date of the day part only, or null. Guards against a stored timestamp. */
function dayOf(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length < 10) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/**
 * The date a ComputedDeadline lands on.
 *
 * *** THIS WAS A REGEX, AND IT WOULD HAVE BROKEN THE WHOLE CHRONOLOGY ***
 *
 * `ComputedDeadline.date`'s doc comment said "spelled out with its weekday", so the
 * first version of this recovered an ISO date by matching "23 March 2026". The
 * comment was wrong: the field is assigned `result.deadline`, an ISO date, and
 * `scripts/eval/deadlineCases.ts` has always compared it as one.
 *
 * Against "2026-03-23" that regex matched nothing, returned null, and every computed
 * deadline would have been dropped from every chronology — silently, because no
 * check asserted a non-zero count of computed items. The comment in
 * `computedDeadline.ts` has been corrected and now records this.
 *
 * `dayOf` is reused rather than trusting the field's shape blindly, so a timestamp
 * or a malformed value still yields null instead of an invented position.
 */
function isoFromComputed(computed: ComputedDeadline): string | null {
  return dayOf(computed.date);
}

export function buildTimeline(input: TimelineBuildInput): Timeline {
  const items: TimelineItem[] = [];
  const undated: Timeline["undated"] = [];

  // ---- documents ----

  for (const document of input.documents) {
    const title = document.userLabel?.trim() || document.originalName;
    const date = dayOf(document.userDate);

    if (date === null) {
      undated.push({ kind: "document", id: document.id, title });
      continue;
    }

    const precision = document.userDatePrecision ?? "day";

    items.push({
      date,
      precision,
      displayDate: formatForCourt(date, precision),
      title,
      eventType: document.userType,
      source: {
        kind: "document",
        documentId: document.id,
        exhibitLabel:
          document.exhibitNumber !== null
            ? exhibitLabel(document.exhibitNumber, document.exhibitSuffix)
            : null,
        description: document.dateConfirmedByUser
          ? "From a document"
          : "From a document — date not confirmed yet",
        dateConfirmedByUser: document.dateConfirmedByUser,
      },
      notes: document.dateConfirmedByUser
        ? []
        : [
            "This date was read from the document rather than confirmed by you. " +
              "Worth checking before you rely on it.",
          ],
    });
  }

  // ---- events the user entered ----

  for (const event of input.events) {
    const date = dayOf(event.eventDate);

    if (date === null) {
      undated.push({ kind: "user-entered", id: event.id, title: event.title });
      continue;
    }

    const precision = event.eventDatePrecision ?? "day";

    items.push({
      date,
      precision,
      displayDate: formatForCourt(date, precision),
      title: event.title,
      eventType: event.eventType,
      source: { kind: "user-entered", eventId: event.id, description: "You entered this" },
      notes: [],
    });
  }

  // ---- computed deadlines ----

  for (const computed of input.deadlines) {
    const date = isoFromComputed(computed);
    if (date === null) continue;

    const meta = input.deadlineRules?.[computed.deadlineId];

    items.push({
      date,
      precision: "day",
      // The engine already spelled it out with its weekday. Not reformatted.
      displayDate: computed.date,
      title: meta?.what ?? computed.statement,
      eventType: null,
      source: {
        kind: "computed",
        deadlineId: computed.deadlineId,
        rule: meta?.rule ?? null,
        ruleUrl: meta?.url ?? null,
        description: meta?.rule ? `Computed from ${meta.rule}` : "Computed by counting",
      },
      /*
       * The engine's own words, in its own order, unaltered. caution is always
       * present and always last, because it is the sentence that tells the reader
       * this date was counted rather than read off their court file.
       */
      notes: [
        computed.statement,
        ...(computed.uncertainty ? [computed.uncertainty] : []),
        ...(computed.closureWarning ? [computed.closureWarning] : []),
        computed.caution,
      ],
    });
  }

  /*
   * Sorted by date, then by source kind so that on any given day the things that
   * happened come before the deadline that falls on it. A deadline listed above the
   * document that triggered it reads as though the deadline came first.
   */
  const kindOrder: Record<TimelineSource["kind"], number> = {
    document: 0,
    "user-entered": 1,
    computed: 2,
  };

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.source.kind !== b.source.kind) {
      return kindOrder[a.source.kind] - kindOrder[b.source.kind];
    }
    return a.title.localeCompare(b.title);
  });

  return {
    items,
    undated,
    counts: {
      fromDocuments: items.filter((item) => item.source.kind === "document").length,
      userEntered: items.filter((item) => item.source.kind === "user-entered").length,
      computed: items.filter((item) => item.source.kind === "computed").length,
    },
  };
}
