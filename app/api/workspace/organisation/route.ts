/**
 * Everything the workspace screens read: the document table, the chronology, the
 * communication log, the deadline tracker and the exhibit index.
 *
 * *** WHY ONE ROUTE AND NOT SIX ***
 *
 * Every one of these views is a different arrangement of the same three tables plus
 * the stage map. Six routes would each re-authenticate, re-check case ownership and
 * re-read `workspace_documents`, and the left nav switches between them constantly —
 * so six routes means six round trips to render one screen, and six places where a
 * `.eq("user_id", user.id)` could be forgotten.
 *
 * `view` selects the arrangement. Ownership is checked once, in one place.
 *
 * *** THE DEADLINES ARE NOT COMPUTED HERE ***
 *
 * They come from `computedDeadlinesFor`, which calls the deadline engine, guards each
 * sentence against the content library and fills it. ACCURACY_ENGINE decision 5: the
 * engine no longer writes its own prose, because `outputGuard` is an allowlist and
 * interpolated prose assembled inside an engine is not a content-library item. This
 * route passes the engine's output through untouched and writes no law.
 *
 * *** WHAT THIS ROUTE MAY NOT RETURN ***
 *
 * CLAUDE.md §3. It returns counts, gaps and dates. It does not rank documents by
 * importance, score completeness, or say anything about how the case will go. A
 * missing document is reported as "no document recorded", which is the factual form
 * §3 permits.
 *
 * NO MODEL IS CALLED HERE.
 */

import { readCaseRecord, recordedDateAnswers } from "@/src/lib/case-system/caseRecord";
import { readStoredPicture, stepFromPicture } from "@/src/lib/case-system/intake/caseReader";
import { decisionAttribution } from "@/src/lib/case-workspace/courtDecision";
import { COURT_DECISION_TYPE, DECISION_COLUMNS, decisionDetailsFor } from "@/src/lib/case-workspace/courtDecisionStore";
import { suggestedStageFor } from "@/src/lib/case-system/stage-map/suggestedStep";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";
import { isUuid } from "@/src/lib/case-workspace/storagePaths";
import {
  documentOrder,
  proposeNumbering,
  proposeRenumberFromOne,
  type NumberableDocument,
} from "@/src/lib/case-workspace/exhibitNumbering";
import { buildTimeline, type TimelineDocumentInput } from "@/src/lib/case-workspace/timeline";
import {
  buildCommunicationLog,
  type CommunicationRow,
} from "@/src/lib/case-workspace/communicationLog";
import { findDates, formatForCourt, type DatePrecision } from "@/src/lib/case-workspace/parseDate";
import { DOCUMENT_TYPES } from "@/src/lib/case-workspace/documentTypes";
import { computedDeadlinesFor } from "@/src/lib/content-library/computedDeadline";
import { DEADLINE_EVENTS, caseDatesFrom } from "@/src/lib/case-system/deadlines/deadlineEvents";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { officialUrl, sourceName } from "@/src/lib/case-system/stage-map/citations";
import { readCasePosition, storyHintsForDates } from "@/src/lib/case-system/casePosition";

export const runtime = "nodejs";

const DOCUMENT_COLUMNS =
  "id,case_id,storage_path,original_name,mime,size_bytes,uploaded_at," +
  "user_type,user_date,user_date_precision,user_label,exhibit_number,exhibit_suffix," +
  "parties,amount,notes,extraction_status,extraction_notice";

type DocumentRow = {
  id: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  uploaded_at: string;
  user_type: string | null;
  user_date: string | null;
  user_date_precision: DatePrecision | null;
  user_label: string | null;
  exhibit_number: number | null;
  exhibit_suffix: string | null;
  parties: string[] | null;
  amount: string | null;
  notes: string | null;
  extraction_status: string;
  extraction_notice: string | null;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function refuse(status: number, error: string, detail?: string) {
  return NextResponse.json({ success: false, error, detail }, { status });
}

/**
 * A document whose date the user has confirmed.
 *
 * *** WHY extraction_status DECIDES THIS ***
 *
 * `user_date` is written both when the user types a date and when a suggestion is
 * accepted, so the column alone cannot say which happened. What can: a document whose
 * text was read by OCR at low confidence is in `needs-details` precisely because it is
 * asking the user for the date. So a date on such a row has not been confirmed by
 * anybody, and the chronology must label it.
 *
 * A document with no date at all is neither confirmed nor unconfirmed — it is in the
 * "Date needed" group, and `dateConfirmedByUser` is not consulted for it.
 */
function dateIsConfirmed(row: DocumentRow): boolean {
  return row.user_date !== null && row.extraction_status !== "needs-details";
}

function toNumberable(row: DocumentRow): NumberableDocument {
  return {
    id: row.id,
    userDate: row.user_date,
    userDatePrecision: row.user_date_precision ?? "day",
    exhibitNumber: row.exhibit_number,
    exhibitSuffix: row.exhibit_suffix,
    uploadedAt: row.uploaded_at,
    originalName: row.original_name,
  };
}

/**
 * Dates found in a document's own text that disagree about day and month.
 *
 * *** WHY THIS IS SURFACED RATHER THAN RESOLVED ***
 *
 * "03/04/2026" is 3 April to most of the world and 4 March to some of it, and nothing
 * in the document says which. The deadline engine's `parseUserDate` refuses an
 * ambiguous date outright, which is right for a date a deadline is counted from.
 *
 * Here the document is already stored and the user is labelling it, so the better
 * answer is to ask: the inline prompt offers both readings and the user picks. Guessing
 * would put a date in a chronology that the document does not support, and a chronology
 * is read as a record of what happened.
 */
function ambiguityPrompt(row: DocumentRow, text: string | null): {
  raw: string;
  dayFirst: string;
  monthFirst: string;
} | null {
  if (row.user_date !== null || !text) return null;

  for (const found of findDates(text)) {
    if (!found.ambiguous) continue;
    return {
      raw: found.source,
      dayFirst: formatForCourt(found.ambiguous.dayFirst, "day"),
      monthFirst: formatForCourt(found.ambiguous.monthFirst, "day"),
    };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const { searchParams } = new URL(req.url);
    const caseId = String(searchParams.get("caseId") || "").trim();
    const view = String(searchParams.get("view") || "documents").trim();

    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    const supabase = getSupabaseAdmin();

    /*
     * Both clauses are deliberate. A service-role client bypasses RLS entirely, so on
     * this path the only thing scoping the query to the caller is written here.
     */
    const { data: documentRows, error: documentError } = await supabase
      .from("workspace_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: true });

    if (documentError) {
      console.error("workspace organisation read error:", documentError.message);
      return refuse(500, "CourtSimplified could not load this case.");
    }

    const allDocuments = (documentRows ?? []) as unknown as DocumentRow[];

    /*
     * Court decisions the person downloaded from CanLII (2026-10-07) are kept
     * with the case but are not part of its story: a decision's date is not an
     * event in the person's chronology, and a decision is not their evidence to
     * number as an exhibit. So they are listed on their own, with "Source:
     * CanLII" (courtDecision.ts), and left out of every other view.
     */
    const decisionRows = allDocuments.filter((row) => row.user_type === COURT_DECISION_TYPE);
    const documents = allDocuments.filter((row) => row.user_type !== COURT_DECISION_TYPE);

    // ---- documents: the table, with its "Date needed" group ----

    if (view === "documents") {
      const { dated, undated } = documentOrder(documents.map(toNumberable));

      /*
       * Extracted text is read ONLY for the documents that have no date, and only to
       * offer an ambiguity prompt. Loading it for the whole table would pull every
       * document's full text into a list request that never displays it.
       */
      const undatedIds = undated.map((entry) => entry.id);
      const textById = new Map<string, string>();

      if (undatedIds.length > 0) {
        const { data: textRows } = await supabase
          .from("workspace_document_text")
          .select("document_id,extracted_text")
          .eq("user_id", user.id)
          .in("document_id", undatedIds);

        for (const row of textRows ?? []) {
          if (row.extracted_text) textById.set(row.document_id, row.extracted_text);
        }
      }

      const byId = new Map(documents.map((row) => [row.id, row]));

      const shape = (id: string) => {
        const row = byId.get(id);
        if (!row) return null;
        return {
          id: row.id,
          exhibitNumber: row.exhibit_number,
          exhibitSuffix: row.exhibit_suffix,
          originalName: row.original_name,
          label: row.user_label,
          type: row.user_type,
          date: row.user_date,
          datePrecision: row.user_date_precision ?? "day",
          displayDate: row.user_date
            ? formatForCourt(row.user_date, row.user_date_precision ?? "day")
            : null,
          dateConfirmedByUser: dateIsConfirmed(row),
          extractionStatus: row.extraction_status,
          extractionNotice: row.extraction_notice,
          parties: row.parties ?? [],
          amount: row.amount,
          notes: row.notes,
          ambiguity: ambiguityPrompt(row, textById.get(row.id) ?? null),
        };
      };

      // Read apart from the main select; empty until migration 20261007090000
      // is applied, and the decisions still list with "Source: CanLII".
      const details = await decisionDetailsFor(
        (ids) => supabase.from("workspace_documents").select(DECISION_COLUMNS).eq("user_id", user.id).in("id", ids),
        decisionRows,
      );
      const decisions = decisionRows.map((row) => {
        const decision = details.get(row.id) ?? {};
        return {
          id: row.id,
          exhibitNumber: null,
          exhibitSuffix: null,
          originalName: row.original_name,
          label: row.user_label,
          type: row.user_type,
          date: null,
          datePrecision: "day" as const,
          displayDate: null,
          dateConfirmedByUser: false,
          extractionStatus: row.extraction_status,
          extractionNotice: row.extraction_notice,
          parties: [],
          amount: null,
          notes: row.notes,
          ambiguity: null,
          decision,
          attribution: decisionAttribution(decision),
        };
      });

      return NextResponse.json({
        success: true,
        view,
        documentTypes: DOCUMENT_TYPES,
        decisions,
        dated: dated.map((entry) => shape(entry.id)).filter(Boolean),
        /*
         * A named group rather than a null date sorted to the bottom. A document with
         * no date is not late in the chronology, it is absent from it, and the user has
         * something to do about that.
         */
        dateNeeded: undated.map((entry) => shape(entry.id)).filter(Boolean),
        counts: {
          total: allDocuments.length,
          decisions: decisions.length,
          dated: dated.length,
          dateNeeded: undated.length,
        },
      });
    }

    // ---- the chronology ----

    if (view === "timeline") {
      const { data: eventRows } = await supabase
        .from("workspace_timeline_events")
        .select("id,event_date,event_date_precision,title,event_type")
        .eq("user_id", user.id)
        .eq("case_id", caseId);

      /*
       * Deadlines come from the engine, for the step the user chose and the
       * dates they gave (master_result.position, written by /api/cases/position).
       * A case with no chosen step uses the step its confirmed stage points to (below); with neither, no computed deadlines — not a guess at
       * which step it might be at.
       *
       * Until 2026-10-04 this looked the stage up by the case's COURT PATH
       * (`candidate.id === court_path`), which no stage id ever equals, and read
       * `master.dateAnswers`, which nothing wrote. So the Deadlines view was
       * always empty, and every rule link pointed at the Small Claims
       * regulation whatever the deadline's source.
       */
      const position = readCasePosition(ownedCase.master_result, ownedCase.court_path);
      // The step the person chose, or else the one their confirmed stage
      // points to -- the same step the case page shows them as theirs
      // (Phase 1, 2026-10-07: dates given with no step picked counted nothing
      // here while the case page counted them).
      const record = readCaseRecord(ownedCase.master_result, ownedCase.court_path);
      // The same step the case page shows: theirs, else the one their story
      // names (the case reader's, then the phrases), else their stage's.
      const responding = record.side?.value === "responding";
      const masterRecord = (ownedCase.master_result ?? {}) as Record<string, unknown>;
      const stepId =
        position.stepId ||
        (record.courtPath ? stepFromPicture(record.courtPath, readStoredPicture(masterRecord.casePicture), responding) : "") ||
        (record.courtPath && position.confirmedStage
          ? suggestedStageFor(record.courtPath, position.confirmedStage, responding, record.story)
          : "");
      const stage = stepId ? findStage(stepId) : undefined;
      /*
       * The dates they confirmed or answered, and -- under them -- a full date
       * written in their own story, so the printable case file is not "None
       * yet" for a person whose story said "served on September 28, 2026"
       * (held-back walkthrough, 2026-10-09). A deadline counted from a story
       * date says so, and asks them to confirm it on the Overview.
       */
      const confirmedDates = { ...recordedDateAnswers(record), ...position.dateAnswers };
      const storyDates = Object.fromEntries(
        Object.entries(storyHintsForDates(record.story))
          .filter(([id, hint]) => hint.value && !hint.yearAssumed && !confirmedDates[id])
          .map(([id, hint]) => [id, hint.value as string]),
      );
      const dates = caseDatesFrom({ ...storyDates, ...confirmedDates });
      const fromStoryNote = (countFromEvent: string | undefined) => {
        const questionId = countFromEvent ? (DEADLINE_EVENTS as Record<string, { questionId?: string }>)[countFromEvent]?.questionId : undefined;
        return questionId && storyDates[questionId]
          ? "Counted from the date in your story. Confirm it under \u201cYour next step\u201d on the Overview."
          : undefined;
      };

      const computed = stage ? computedDeadlinesFor(stage.deadlines, dates, "workspace") : [];

      const deadlineRules = Object.fromEntries(
        (stage?.deadlines ?? []).map((deadline) => [
          deadline.id,
          {
            // The law's name with the section: "Limitations Act, 2002, s. 4",
            // never a bare "s. 4" (held-back walkthrough, 2026-10-09).
            rule: deadline.rule ? `${sourceName(deadline.rule)}, ${deadline.rule.pinpoint}` : null,
            url: deadline.rule ? officialUrl(deadline.rule) : null,
            what: deadline.what,
            note: fromStoryNote(deadline.countFromEvent),
          },
        ]),
      );

      const timelineDocuments: TimelineDocumentInput[] = documents.map((row) => ({
        id: row.id,
        userDate: row.user_date,
        userDatePrecision: row.user_date_precision ?? "day",
        userLabel: row.user_label,
        originalName: row.original_name,
        userType: null,
        exhibitNumber: row.exhibit_number,
        exhibitSuffix: row.exhibit_suffix,
        dateConfirmedByUser: dateIsConfirmed(row),
      }));

      const timeline = buildTimeline({
        documents: timelineDocuments,
        events: (eventRows ?? []).map((row) => ({
          id: row.id,
          eventDate: row.event_date,
          eventDatePrecision: row.event_date_precision ?? "day",
          title: row.title,
          eventType: row.event_type,
        })),
        deadlines: computed,
        deadlineRules,
      });

      return NextResponse.json({ success: true, view, ...timeline });
    }

    // ---- the communication log ----

    if (view === "communications") {
      const { data: rows, error } = await supabase
        .from("workspace_communications")
        .select("id,occurred_on,occurred_at_time,direction,other_party,method,summary,document_id")
        .eq("user_id", user.id)
        .eq("case_id", caseId);

      if (error) {
        console.error("workspace communications read error:", error.message);
        return refuse(500, "CourtSimplified could not load the communication log.");
      }

      const log = buildCommunicationLog(
        (rows ?? []).map(
          (row): CommunicationRow => ({
            id: row.id,
            occurredOn: row.occurred_on,
            occurredAtTime: row.occurred_at_time,
            direction: row.direction,
            otherParty: row.other_party,
            method: row.method,
            summary: row.summary,
            documentId: row.document_id,
          }),
        ),
      );

      return NextResponse.json({ success: true, view, ...log });
    }

    // ---- the exhibit index, and what numbering would do ----

    if (view === "exhibits") {
      const numberable = documents.map(toNumberable);
      const byId = new Map(documents.map((row) => [row.id, row]));

      const describe = (id: string) => {
        const row = byId.get(id);
        return row?.user_label?.trim() || row?.original_name || "";
      };

      const proposal = proposeNumbering(numberable);
      const renumber = proposeRenumberFromOne(numberable);

      return NextResponse.json({
        success: true,
        view,
        /*
         * Both are PROPOSALS (§4). Nothing is applied by reading this view, and the
         * renumber carries the warning that says what it would break.
         */
        addNew: {
          proposed: proposal.proposed.map((entry) => ({
            ...entry,
            description: describe(entry.documentId),
          })),
          needDates: proposal.needDates.map((id) => ({ id, description: describe(id) })),
          warning: proposal.warning,
        },
        renumberFromOne: {
          proposed: renumber.proposed.map((entry) => ({
            ...entry,
            description: describe(entry.documentId),
          })),
          needDates: renumber.needDates.map((id) => ({ id, description: describe(id) })),
          warning: renumber.warning,
          changeCount: renumber.proposed.filter((entry) => entry.isChange).length,
        },
      });
    }

    return refuse(
      400,
      "Unknown view.",
      "Use documents, timeline, communications or exhibits.",
    );
  } catch (error) {
    console.error("workspace organisation error:", error);
    return refuse(500, "CourtSimplified could not load this case.");
  }
}
