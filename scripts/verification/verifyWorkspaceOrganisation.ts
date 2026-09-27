/**
 * Exhibit numbers do not move under a user's feet, the chronology says where every
 * date came from, and the exhibit book's index points at the pages it claims to.
 *
 * WHAT THIS CATCHES, in the order the damage matters:
 *
 *   1. An index that disagrees with its own book. "Exhibit 4, page 7" is said out
 *      loud to a judge holding the book. If it starts on page 8, every reference
 *      after that is wrong and the litigant looks careless. This is checked by
 *      ASSEMBLING a real book from real multi-page PDFs whose pages carry markers,
 *      then reading the finished PDF back and confirming the page the index names
 *      actually contains that exhibit.
 *
 *   2. An exhibit number changing after it has been relied on. Numbers appear in
 *      claims, affidavits and correspondence. `proposeNumbering` must never move
 *      one; only the explicitly dangerous `proposeRenumberFromOne` may, and it must
 *      report every change and warn.
 *
 *   3. A chronology item with no source, or no computed deadlines at all. The second
 *      is the subtle one and it nearly shipped: the first version of the timeline
 *      recovered a deadline's date by regex from a field it had been told was prose
 *      and which is actually ISO, so every computed item would have been dropped
 *      silently. A check that only counted documents would have passed.
 *
 *   4. A sentence about a missing document that grades the case. CLAUDE.md §3 allows
 *      "no document recorded for this" and forbids anything about weakness.
 *
 * COSTS NOTHING in money. Builds and re-reads a few small PDFs, so it takes a couple
 * of seconds.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceOrganisation.ts
 */

import {
  documentOrder,
  exhibitLabel,
  proposeNumbering,
  proposeRenumberFromOne,
  type NumberableDocument,
} from "../../src/lib/case-workspace/exhibitNumbering";
import { buildTimeline } from "../../src/lib/case-workspace/timeline";
import {
  NO_DOCUMENT_NOTE,
  buildCommunicationLog,
  type CommunicationRow,
} from "../../src/lib/case-workspace/communicationLog";
import { buildExhibitBook } from "../../src/lib/case-workspace/exhibitBook";
import type { ComputedDeadline } from "../../src/lib/content-library/computedDeadline";

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

const document = (over: Partial<NumberableDocument> & { id: string }): NumberableDocument => ({
  userDate: null,
  exhibitNumber: null,
  exhibitSuffix: null,
  uploadedAt: "2026-03-01T00:00:00Z",
  originalName: `${over.id}.pdf`,
  ...over,
});

async function main() {
  console.log("");
  console.log("WORKSPACE ORGANISATION");
  console.log("");

  // -------------------------------------------------------------------------
  // 1. Existing exhibit numbers are never moved by ordinary numbering
  // -------------------------------------------------------------------------

  {
    const problems: string[] = [];

    const documents: NumberableDocument[] = [
      document({ id: "a", userDate: "2026-01-10", exhibitNumber: 1 }),
      document({ id: "b", userDate: "2026-02-10", exhibitNumber: 2 }),
      document({ id: "c", userDate: "2026-03-10", exhibitNumber: 3 }),
      // Arrives later, belongs chronologically between 1 and 2.
      document({ id: "late", userDate: "2026-01-20" }),
      // Arrives later, belongs at the end.
      document({ id: "newest", userDate: "2026-04-01" }),
      // No confirmed date at all.
      document({ id: "undated" }),
    ];

    const proposal = proposeNumbering(documents);

    for (const existing of ["a", "b", "c"]) {
      const entry = proposal.proposed.find((p) => p.documentId === existing);
      const before = documents.find((d) => d.id === existing);
      if (!entry) {
        problems.push(`${existing} is missing from the proposal`);
      } else if (entry.exhibitNumber !== before?.exhibitNumber || entry.isChange) {
        problems.push(
          `${existing} was ${before?.exhibitNumber} and the proposal makes it ` +
            `${entry.label} (isChange: ${entry.isChange}). Ordinary numbering must never move one.`,
        );
      }
    }

    if (proposal.proposed.some((entry) => entry.isChange)) {
      problems.push("proposeNumbering produced a change, so it cannot be applied without a warning");
    }
    if (proposal.warning !== null) {
      problems.push("proposeNumbering produced a warning, which means it is moving something");
    }

    const late = proposal.proposed.find((p) => p.documentId === "late");
    if (!late) {
      problems.push("the in-between document was not numbered");
    } else if (late.exhibitSuffix === null) {
      problems.push(
        `the in-between document got plain number ${late.label} instead of a suffix. ` +
          `A plain number here either sits out of date order or forces a renumber.`,
      );
    } else if (late.exhibitNumber !== 1) {
      problems.push(`the in-between document was suffixed under ${late.exhibitNumber}, expected 1`);
    }

    const newest = proposal.proposed.find((p) => p.documentId === "newest");
    if (newest?.exhibitNumber !== 4 || newest.exhibitSuffix !== null) {
      problems.push(`the newest document got ${newest?.label}, expected plain 4`);
    }

    if (!proposal.needDates.includes("undated")) {
      problems.push("a document with no confirmed date was numbered rather than listed as needing a date");
    }
    if (proposal.proposed.some((entry) => entry.documentId === "undated")) {
      problems.push("a document with no confirmed date was given an exhibit number");
    }

    if (problems.length === 0) {
      pass("ordinary numbering never moves an assigned number, suffixes a late document, and refuses to number an undated one");
    } else {
      fail("exhibit numbering moved something it should not have", problems.join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 2. Renumbering from one reports every change and warns
  // -------------------------------------------------------------------------

  {
    const problems: string[] = [];

    const documents: NumberableDocument[] = [
      document({ id: "a", userDate: "2026-03-10", exhibitNumber: 1 }),
      document({ id: "b", userDate: "2026-01-10", exhibitNumber: 2 }),
      document({ id: "enclosure", userDate: "2026-01-05", attachedToId: "b" }),
    ];

    const proposal = proposeRenumberFromOne(documents);

    // b is earliest, so it becomes 1 and a becomes 2. Both change.
    const a = proposal.proposed.find((p) => p.documentId === "a");
    const b = proposal.proposed.find((p) => p.documentId === "b");

    if (b?.exhibitNumber !== 1) problems.push(`the earliest document became ${b?.label}, expected 1`);
    if (a?.exhibitNumber !== 2) problems.push(`the later document became ${a?.label}, expected 2`);

    if (!a?.isChange || !b?.isChange) {
      problems.push(
        "a renumber that moves two documents did not mark both as changes, so a " +
          "confirmation screen would not show what moves",
      );
    }

    if (proposal.warning === null) {
      problems.push(
        "renumbering from one produced NO warning. This is the operation that " +
          "invalidates references already sent to the other side.",
      );
    } else if (!/serv|filed|refer/i.test(proposal.warning)) {
      problems.push("the warning does not mention that references already sent will no longer match");
    }

    const enclosure = proposal.proposed.find((p) => p.documentId === "enclosure");
    if (enclosure?.exhibitNumber !== 1 || enclosure.exhibitSuffix !== "A") {
      problems.push(
        `the enclosure became ${enclosure?.label}, expected 1A — an enclosure follows ` +
          `its parent even though its own date is earlier`,
      );
    }

    if (problems.length === 0) {
      pass("renumbering from one reorders by date, keeps enclosures under their parent, and warns about every move");
    } else {
      fail("renumbering is unsafe", problems.join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 3. Ordering is deterministic for documents sharing a date
  // -------------------------------------------------------------------------

  {
    /*
     * Without tie-breakers the order of two documents dated the same day depends on
     * whatever order the database returned, so the exhibit book would reorder itself
     * between renders and the index would stop matching the pages.
     */
    const problems: string[] = [];

    const sameDay: NumberableDocument[] = [
      document({ id: "x", userDate: "2026-03-10", uploadedAt: "2026-03-11T10:00:00Z", originalName: "zebra.pdf" }),
      document({ id: "y", userDate: "2026-03-10", uploadedAt: "2026-03-11T09:00:00Z", originalName: "apple.pdf" }),
      document({ id: "z", userDate: "2026-03-10", uploadedAt: "2026-03-11T09:00:00Z", originalName: "banana.pdf" }),
    ];

    const first = documentOrder(sameDay).dated.map((d) => d.id).join(",");
    const reversed = documentOrder([...sameDay].reverse()).dated.map((d) => d.id).join(",");

    if (first !== reversed) {
      problems.push(
        `the same three documents ordered ${first} one way and ${reversed} reversed. ` +
          `The order depends on input order, so the book will not render the same twice.`,
      );
    }

    // Earliest upload first; same upload time falls back to name.
    if (first !== "y,z,x") {
      problems.push(`expected y,z,x (upload time, then name), got ${first}`);
    }

    if (problems.length === 0) {
      pass("documents sharing a date order identically regardless of input order");
    } else {
      fail("document ordering is not deterministic", problems.join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 4. Every chronology item carries a source, and computed items really appear
  // -------------------------------------------------------------------------

  {
    const problems: string[] = [];

    /*
     * *** THE ISO DATE IS THE POINT OF THIS FIXTURE ***
     *
     * ComputedDeadline.date is an ISO date, though its doc comment said "spelled out
     * with its weekday" until 2026-09-27. The timeline believed the comment and
     * recovered a date by regex, which matches nothing against "2026-03-23" — so
     * every computed item vanished. The non-zero assertion below is what catches it.
     */
    const computed: ComputedDeadline[] = [
      {
        deadlineId: "defence-20-days",
        date: "2026-03-23",
        statement: "Based on the date you gave us, the last day for this is Monday 23 March 2026.",
        working: [{ text: "Counted 20 days from Monday 2 March 2026.", citation: null }],
        uncertainty: null,
        caution: "This date was worked out by counting, not taken from your court file.",
        closureWarning: null,
      },
    ];

    const timeline = buildTimeline({
      documents: [
        {
          id: "d1",
          userDate: "2026-03-02",
          userDatePrecision: "day",
          userLabel: "Claim served",
          originalName: "claim.pdf",
          userType: null,
          exhibitNumber: 1,
          exhibitSuffix: null,
          dateConfirmedByUser: true,
        },
        {
          id: "d2",
          userDate: "2026-03-05",
          userLabel: null,
          originalName: "receipt.jpg",
          userType: null,
          exhibitNumber: null,
          exhibitSuffix: null,
          // Read by OCR, not confirmed. Must be labelled as such.
          dateConfirmedByUser: false,
        },
        { id: "d3", userDate: null, userLabel: "No date yet", originalName: "x.pdf", userType: null, exhibitNumber: null, exhibitSuffix: null, dateConfirmedByUser: false },
      ],
      events: [
        { id: "e1", eventDate: "2026-03-04", title: "Phoned the other side", eventType: null },
        { id: "e2", eventDate: null, title: "Something undated", eventType: null },
      ],
      deadlines: computed,
      deadlineRules: {
        "defence-20-days": {
          rule: "r. 10.01",
          url: "https://www.ontario.ca/laws/regulation/980258",
          what: "Serve and file a defence",
        },
      },
    });

    for (const item of timeline.items) {
      if (!item.source || typeof item.source.kind !== "string") {
        problems.push(`an item titled "${item.title}" has no source`);
      }
      if (!item.source.description || item.source.description.trim().length === 0) {
        problems.push(`an item titled "${item.title}" has an empty source description`);
      }
    }

    if (timeline.counts.computed === 0) {
      problems.push(
        "NO computed deadline reached the chronology, though one was supplied. This is " +
          "the silent-drop failure: a computed item whose date cannot be read is left out.",
      );
    }
    if (timeline.counts.fromDocuments !== 2) {
      problems.push(`expected 2 dated documents, got ${timeline.counts.fromDocuments}`);
    }
    if (timeline.counts.userEntered !== 1) {
      problems.push(`expected 1 user-entered event, got ${timeline.counts.userEntered}`);
    }

    const computedItem = timeline.items.find((item) => item.source.kind === "computed");
    if (computedItem && computedItem.source.kind === "computed") {
      if (computedItem.source.rule !== "r. 10.01") {
        problems.push("the computed item does not name the rule it was counted under");
      }
      if (!computedItem.source.ruleUrl) {
        problems.push("the computed item has no check-the-rule link");
      }
      /*
       * The engine's caution must survive into the chronology VERBATIM. It is the
       * sentence that stops a counted date being read as one taken off a court file.
       *
       * Asserted by identity against the fixture's own string, not by keyword. The
       * first version of this searched for /counted/i and failed against correct
       * code, because the engine's sentence says "counting". A check that depends on
       * which inflection a content-library sentence happens to use will break the
       * next time that sentence is reworded — and the sentence is allowed to be
       * reworded, because it lives in deadlineTemplates.ts and goes through review.
       *
       * What must not change is that the caution reaches the reader unaltered, which
       * is exactly what comparing the whole string tests.
       */
      if (!computedItem.notes.includes(computed[0].caution)) {
        problems.push(
          "the deadline engine's caution did not reach the chronology unaltered. It is " +
            "the sentence that distinguishes a date we counted from one read off a court file.",
        );
      }
      if (!computedItem.notes.includes(computed[0].statement)) {
        problems.push("the engine's guarded statement did not reach the chronology unaltered");
      }
    }

    // An unconfirmed date must be visibly unconfirmed.
    const unconfirmed = timeline.items.find(
      (item) => item.source.kind === "document" && item.source.documentId === "d2",
    );
    if (unconfirmed && unconfirmed.source.kind === "document") {
      if (unconfirmed.source.dateConfirmedByUser !== false) {
        problems.push("an unconfirmed date was marked confirmed");
      }
      if (unconfirmed.notes.length === 0) {
        problems.push("an unconfirmed date carries no note saying so");
      }
    }

    // Sorted, and undated things collected rather than dropped.
    const dates = timeline.items.map((item) => item.date);
    if ([...dates].sort().join(",") !== dates.join(",")) {
      problems.push(`the chronology is not in date order: ${dates.join(", ")}`);
    }
    if (timeline.undated.length !== 2) {
      problems.push(`expected 2 undated entries collected, got ${timeline.undated.length}`);
    }

    if (problems.length === 0) {
      pass(
        `every chronology item carries a source (${timeline.counts.fromDocuments} documents, ` +
          `${timeline.counts.userEntered} entered, ${timeline.counts.computed} computed with rule and link)`,
      );
    } else {
      fail("the chronology is missing provenance", problems.join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 5. The communication log says nothing about the merits
  // -------------------------------------------------------------------------

  {
    const problems: string[] = [];

    const rows: CommunicationRow[] = [
      {
        id: "c1",
        occurredOn: "2026-03-10",
        occurredAtTime: null,
        direction: "sent",
        otherParty: "Ms Tremblay",
        method: "email",
        summary: "Asked for payment",
        documentId: "d1",
      },
      {
        id: "c2",
        occurredOn: "2026-03-10",
        occurredAtTime: "09:15",
        direction: "received",
        otherParty: null,
        method: "phone",
        summary: "They said they would pay",
        documentId: null,
      },
    ];

    const log = buildCommunicationLog(rows);

    const withDocument = log.entries.find((entry) => entry.id === "c1");
    const withoutDocument = log.entries.find((entry) => entry.id === "c2");

    if (withDocument?.noDocumentNote !== null) {
      problems.push("an entry WITH a document was given a no-document note");
    }
    if (withoutDocument?.noDocumentNote !== NO_DOCUMENT_NOTE) {
      problems.push(`an entry with no document got "${withoutDocument?.noDocumentNote}"`);
    }

    /*
     * §3: wording is not the shield. The note may state what the file contains and
     * nothing about how the case will go.
     */
    const forbidden = /weak|strong|risk|unlikely|hurt|harm|prove[sn]?\b|credib|believ|chance|proport/i;
    if (forbidden.test(NO_DOCUMENT_NOTE)) {
      problems.push(
        `the no-document note "${NO_DOCUMENT_NOTE}" grades the case, which §3 forbids ` +
          `however it is worded`,
      );
    }

    // Untimed entries sort after timed ones on the same day: an untimed entry has no
    // position within the day, and placing it first would assert one.
    if (log.entries[0]?.id !== "c2") {
      problems.push(`expected the timed entry first on a shared day, got ${log.entries[0]?.id}`);
    }

    if (log.counts.withoutDocument !== 1) {
      problems.push(`expected 1 entry without a document, counted ${log.counts.withoutDocument}`);
    }
    if (log.parties.join(",") !== "Ms Tremblay") {
      problems.push(`party list was ${log.parties.join(",")}`);
    }

    if (problems.length === 0) {
      pass('the communication log states "no document recorded for this" and grades nothing');
    } else {
      fail("the communication log says too much", problems.join("\n"));
    }
  }

  // -------------------------------------------------------------------------
  // 6. THE INDEX POINTS AT THE RIGHT PAGES — checked by reading the book back
  // -------------------------------------------------------------------------

  {
    const problems: string[] = [];

    const { PDFDocument, StandardFonts } = await import("pdf-lib");

    /** A PDF whose every page carries a unique marker, so it can be found again. */
    const markedPdf = async (marker: string, pages: number): Promise<Uint8Array> => {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      for (let n = 1; n <= pages; n += 1) {
        const page = pdf.addPage([612, 792]);
        page.drawText(`${marker} page ${n}`, { x: 72, y: 700, size: 24, font });
      }
      return pdf.save();
    };

    const book = await buildExhibitBook(
      {
        title: "Okonkwo v. Tremblay",
        courtFileNumber: "SC-26-00004471-0000",
        courtName: "Superior Court of Justice (Small Claims Court)",
        plaintiff: "Jonathan Okonkwo",
        defendant: "Marie Tremblay",
      },
      [
        {
          id: "1",
          exhibitNumber: 1,
          exhibitSuffix: null,
          userLabel: "The contract",
          originalName: "contract.pdf",
          userType: "contract-agreement",
          userDate: "2026-01-10",
          mime: "application/pdf",
          bytes: await markedPdf("ALPHA", 3),
        },
        {
          id: "2",
          exhibitNumber: 2,
          exhibitSuffix: null,
          userLabel: "The invoice",
          originalName: "invoice.pdf",
          userType: "invoice-receipt",
          userDate: "2026-02-10",
          mime: "application/pdf",
          bytes: await markedPdf("BRAVO", 1),
        },
        {
          id: "3",
          exhibitNumber: 3,
          exhibitSuffix: null,
          userLabel: "The letter",
          originalName: "letter.pdf",
          userType: "letter-demand-letter",
          userDate: "2026-03-10",
          mime: "application/pdf",
          bytes: await markedPdf("CHARLIE", 2),
        },
        {
          // Cannot be merged. Must still be indexed, with no page.
          id: "4",
          exhibitNumber: 4,
          exhibitSuffix: null,
          userLabel: "The agreement in Word",
          originalName: "agreement.docx",
          userType: "contract-agreement",
          userDate: "2026-03-20",
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes: new Uint8Array([1, 2, 3]),
        },
      ],
      { preparedOn: "2026-09-27" },
    );

    // Read the assembled book back, page by page, and see what is actually there.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loading = pdfjs.getDocument({
      data: book.bytes,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: pdfjs.VerbosityLevel.ERRORS,
    });
    const read = await loading.promise;

    const pageText: string[] = [];
    for (let n = 1; n <= read.numPages; n += 1) {
      const page = await read.getPage(n);
      const content = await page.getTextContent();
      pageText.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      page.cleanup();
    }
    await loading.destroy();

    const expectedMarker: Record<string, string> = { "1": "ALPHA", "2": "BRAVO", "3": "CHARLIE" };

    for (const entry of book.index) {
      const marker = expectedMarker[entry.label];

      if (!marker) {
        // Exhibit 4, the .docx: indexed, no page, and told to the reader.
        if (entry.page !== null) {
          problems.push(`exhibit ${entry.label} cannot be merged but was given page ${entry.page}`);
        }
        if (entry.suppliedSeparately === null) {
          problems.push(`exhibit ${entry.label} was silently left out with no explanation`);
        }
        continue;
      }

      if (entry.page === null) {
        problems.push(`exhibit ${entry.label} is in the book but has no page number`);
        continue;
      }

      const text = pageText[entry.page - 1] ?? "";
      if (!text.includes(marker)) {
        problems.push(
          `THE INDEX IS WRONG: it says exhibit ${entry.label} is on page ${entry.page}, ` +
            `and page ${entry.page} actually contains ${JSON.stringify(text.slice(0, 40))}. ` +
            `Every reference to this exhibit would send a reader to the wrong document.`,
        );
      }
      if (!/page 1\b/.test(text)) {
        problems.push(
          `the index points at page ${entry.page} for exhibit ${entry.label}, but that is ` +
            `not the exhibit's FIRST page`,
        );
      }
    }

    if (book.index.length !== 4) {
      problems.push(`expected 4 index entries, got ${book.index.length}`);
    }
    if (book.separateCount !== 1) {
      problems.push(`expected 1 document supplied separately, got ${book.separateCount}`);
    }
    // The index must not be mistaken for an assessment.
    for (const entry of book.index) {
      if (/weak|strong|important|key|best|crucial|proves/i.test(entry.description)) {
        problems.push(`an index description reads as an assessment: ${entry.description}`);
      }
    }

    if (problems.length === 0) {
      pass(
        `the exhibit book's index points at the right first page for all 3 merged ` +
          `exhibits, verified by reading the finished ${book.pageCount}-page PDF back, ` +
          `and the unmergeable one is indexed with an explanation`,
      );
    } else {
      fail("the exhibit book's index does not match its pages", problems.join("\n"));
    }
  }
}

void main()
  .catch((error: unknown) => {
    fail("the organisation suite threw", error instanceof Error ? error.message : String(error));
  })
  .finally(() => {
    console.log("");
    if (failures > 0) {
      console.log(`${failures} FAILURE(S).`);
      process.exitCode = 1;
    } else {
      console.log("All checks passed.");
    }
    console.log("");
  });
