/**
 * The communication log: who said what to whom, when, and whether a document
 * backs it up.
 *
 * WHAT THIS CATCHES: a log that reads as though it proves things it does not.
 *
 * *** WHY A LOG ENTRY WITH NO DOCUMENT IS MARKED, AND WHAT THE MARK MAY SAY ***
 *
 * A litigant typing "12 March — phoned them, they agreed to pay by the end of the
 * month" has made a note of something they remember. That note is genuinely useful:
 * it fixes the date while it is fresh, and it tells them what to look for later. It
 * is not the same kind of thing as an email they can produce.
 *
 * So each entry says whether a document is attached. The wording is the whole
 * difficulty. CLAUDE.md §3 forbids grading a case, and "this is weak because you
 * have no proof" is grading it. The permitted form is the factual one the rule
 * itself gives: **"no document recorded for this"**. That states what the file
 * contains. Anything about what it means for the outcome is out of bounds, whatever
 * words it is dressed in.
 *
 * `noDocumentNote` exists as the single place that sentence is written, so it cannot
 * drift into an assessment in one screen and not another.
 *
 * *** WHY THE LOG IS NOT MERGED INTO THE CHRONOLOGY BY DEFAULT ***
 *
 * A phone call is an event and belongs on a chronology, but forty text messages
 * would swamp one and hide the dates that matter. So the log is its own view, and
 * `timelineWorthy` marks the entries that stand alone as events — anything with a
 * document, and anything the user has flagged. That is a presentation decision, not
 * a judgement about importance, and it is reversible by the user showing everything.
 *
 * NO MODEL IS CALLED HERE. Pure functions.
 */

import { formatForCourt } from "./parseDate";

export type CommunicationDirection = "sent" | "received";

export type CommunicationMethod =
  | "email"
  | "text-message"
  | "phone"
  | "letter"
  | "in-person"
  | "other";

/** Kept in step with the CHECK constraints in 20260927090000. */
export const COMMUNICATION_DIRECTIONS: readonly CommunicationDirection[] = ["sent", "received"];

export const COMMUNICATION_METHODS: readonly { id: CommunicationMethod; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "text-message", label: "Text message" },
  { id: "phone", label: "Phone call" },
  { id: "letter", label: "Letter" },
  { id: "in-person", label: "In person" },
  { id: "other", label: "Something else" },
];

export type CommunicationRow = {
  id: string;
  occurredOn: string;
  occurredAtTime: string | null;
  direction: CommunicationDirection;
  otherParty: string | null;
  method: CommunicationMethod;
  summary: string;
  documentId: string | null;
};

export type CommunicationEntry = CommunicationRow & {
  /** "Sent to Ms Tremblay by email" — assembled from fields, never free prose. */
  headline: string;
  displayDate: string;
  /** Null where a document is attached. The only sentence about its absence. */
  noDocumentNote: string | null;
  /** Whether this entry is offered for the chronology. Presentation, not weight. */
  timelineWorthy: boolean;
};

export function methodLabel(method: CommunicationMethod): string {
  return COMMUNICATION_METHODS.find((entry) => entry.id === method)?.label ?? "Something else";
}

/**
 * The one sentence this product says about a log entry with nothing attached.
 *
 * It states what the file contains and stops. CLAUDE.md §3: "no evidence recorded
 * for this issue" is explicitly allowed; anything implying the entry is weak, risky
 * or unlikely to be believed is not — including softened versions, because §3 says
 * wording is not the shield.
 */
export const NO_DOCUMENT_NOTE = "No document recorded for this.";

export function toEntry(row: CommunicationRow): CommunicationEntry {
  const verb = row.direction === "sent" ? "Sent" : "Received";
  const preposition = row.direction === "sent" ? "to" : "from";

  const party = row.otherParty?.trim();

  /*
   * Assembled from fields in a fixed shape rather than composed. Two reasons: a
   * sentence built from a template cannot accidentally say something about the
   * merits, and an exhibit book's index has to read identically every time it is
   * generated.
   */
  const headline = party
    ? `${verb} ${preposition} ${party} by ${methodLabel(row.method).toLowerCase()}`
    : `${verb} by ${methodLabel(row.method).toLowerCase()}`;

  return {
    ...row,
    headline,
    displayDate: formatForCourt(row.occurredOn, "day"),
    noDocumentNote: row.documentId === null ? NO_DOCUMENT_NOTE : null,
    timelineWorthy: row.documentId !== null || row.method === "letter" || row.method === "in-person",
  };
}

export type CommunicationLog = {
  entries: CommunicationEntry[];
  counts: {
    total: number;
    sent: number;
    received: number;
    /** How many entries have no document. A count, not a verdict. */
    withoutDocument: number;
  };
  /** Distinct other parties, for a filter. Sorted, empty strings dropped. */
  parties: string[];
};

export function buildCommunicationLog(rows: readonly CommunicationRow[]): CommunicationLog {
  const entries = rows.map(toEntry).sort((a, b) => {
    if (a.occurredOn !== b.occurredOn) return a.occurredOn < b.occurredOn ? -1 : 1;
    /*
     * Within a day, timed entries come before untimed ones and in time order. An
     * untimed entry has no position within the day, so putting it last is the only
     * placement that does not assert something about when it happened.
     */
    const aTime = a.occurredAtTime ?? "~";
    const bTime = b.occurredAtTime ?? "~";
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;
    return a.summary.localeCompare(b.summary);
  });

  return {
    entries,
    counts: {
      total: entries.length,
      sent: entries.filter((entry) => entry.direction === "sent").length,
      received: entries.filter((entry) => entry.direction === "received").length,
      withoutDocument: entries.filter((entry) => entry.documentId === null).length,
    },
    parties: [
      ...new Set(
        rows
          .map((row) => row.otherParty?.trim())
          .filter((party): party is string => typeof party === "string" && party.length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  };
}
