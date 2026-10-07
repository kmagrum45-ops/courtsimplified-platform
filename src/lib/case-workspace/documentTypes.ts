/**
 * The fixed document-type catalogue, and the fixed timeline event types.
 *
 * *** WHY FIXED, AND WHY IN CODE AND IN A CHECK CONSTRAINT ***
 *
 * A free-text type would be easier and would quietly ruin the two things the
 * workspace exists for. The exhibit index groups by type, and the type filter is how
 * a user finds a document in a bundle of ninety — both need the same word to mean
 * the same thing every time. "Invoice", "invoice", "Inv." and "bill" are four types
 * to a computer and one to a person.
 *
 * The list is duplicated as a CHECK in
 * `20260927090000_case_workspace_documents.sql` on purpose. The code list is what a
 * user picks from; the CHECK is what stops any other client, script or future edge
 * function writing something outside it. `test:workspace-catalogue` asserts the two
 * agree, because a duplicate that can drift is worse than no duplicate.
 *
 * *** THESE ARE DESCRIPTIONS, NOT LEGAL CHARACTERISATIONS ***
 *
 * "contract-agreement" says what the document IS. Nothing here says a contract was
 * formed, was breached, or binds anybody — that would be applying law to the user's
 * facts (CLAUDE.md §2), and it is the line the AI suggestions must also stay behind.
 * The labels are deliberately plain enough that confirming one asserts nothing legal.
 */

export type DocumentTypeId =
  | "contract-agreement"
  | "invoice-receipt"
  | "bank-or-transfer-record"
  | "letter-demand-letter"
  | "email-or-text-message"
  | "photo-or-video"
  | "court-form"
  | "court-order-endorsement"
  | "proof-of-service"
  | "witness-statement"
  | "estimate-quote"
  | "insurance-document"
  | "court-decision"
  | "other";

export type DocumentType = {
  id: DocumentTypeId;
  /** What the user sees in the picker. */
  label: string;
  /** A plain hint, so somebody who is not a lawyer can choose correctly. */
  hint: string;
  /** True where a form number is worth capturing alongside. */
  wantsFormNumber?: true;
};

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  {
    id: "contract-agreement",
    label: "Contract or agreement",
    hint: "Anything you and the other side both signed or agreed to, including a quote you accepted.",
  },
  {
    id: "invoice-receipt",
    label: "Invoice or receipt",
    hint: "A bill you sent or were sent, or proof that something was paid for.",
  },
  {
    id: "bank-or-transfer-record",
    label: "Bank or e-transfer record",
    hint: "A statement, an e-transfer confirmation, a cancelled cheque.",
  },
  {
    id: "letter-demand-letter",
    label: "Letter, including a demand letter",
    hint: "A letter either of you sent, on paper or attached to an email.",
  },
  {
    id: "email-or-text-message",
    label: "Email or text message",
    hint: "A message or a thread. A screenshot counts.",
  },
  {
    id: "photo-or-video",
    label: "Photo or video",
    hint: "A picture of damage, a place, an object, or a screen.",
  },
  {
    id: "court-form",
    label: "Court form",
    hint: "A form filed at the court, such as a Plaintiff's Claim or a Defence.",
    wantsFormNumber: true,
  },
  {
    id: "court-order-endorsement",
    label: "Court order or endorsement",
    hint: "Something signed by a judge or deputy judge, or the note made on the file.",
  },
  {
    id: "proof-of-service",
    label: "Proof of service",
    hint: "An affidavit or certificate showing a document was delivered to the other side.",
    wantsFormNumber: true,
  },
  {
    id: "witness-statement",
    label: "Witness statement",
    hint: "What somebody who saw what happened has written down.",
  },
  {
    id: "estimate-quote",
    label: "Estimate or quote",
    hint: "What someone said a repair or a job would cost.",
  },
  {
    id: "insurance-document",
    label: "Insurance document",
    hint: "A policy, a claim, or a letter from an insurer.",
  },
  {
    // 2026-10-07. A decision the person downloaded from CanLII for their own
    // research. Shown everywhere with "Source: CanLII" (courtDecision.ts),
    // as CanLII's Terms of Use s. 4.2 require.
    id: "court-decision",
    label: "Court decision (from CanLII)",
    hint: "A judge's decision you downloaded from CanLII to read for your own case.",
  },
  {
    id: "other",
    label: "Something else",
    hint: "Anything that does not fit. You can describe it in your own words.",
  },
];

export const DOCUMENT_TYPE_IDS: readonly DocumentTypeId[] = DOCUMENT_TYPES.map((type) => type.id);

export function documentTypeById(id: string): DocumentType | undefined {
  return DOCUMENT_TYPES.find((type) => type.id === id);
}

/**
 * Timeline event types.
 *
 * A fixed list for the same reason, plus one more: these are what an AI suggestion
 * is allowed to propose. A free-text event type from a model is a sentence about the
 * user's case written by a model, which is the thing the whole content pipeline
 * exists to prevent. The model may pick an id from here and supply a date; it may
 * not name the event.
 */
export type TimelineEventTypeId =
  | "document-created"
  | "document-sent"
  | "document-received"
  | "payment-made"
  | "payment-received"
  | "work-started"
  | "work-finished"
  | "problem-noticed"
  | "complaint-made"
  | "demand-sent"
  | "agreement-reached"
  | "claim-filed"
  | "document-served"
  | "hearing-or-conference"
  | "order-made"
  | "other-event";

export type TimelineEventType = { id: TimelineEventTypeId; label: string };

export const TIMELINE_EVENT_TYPES: readonly TimelineEventType[] = [
  { id: "document-created", label: "A document was made or dated" },
  { id: "document-sent", label: "Something was sent" },
  { id: "document-received", label: "Something was received" },
  { id: "payment-made", label: "A payment was made" },
  { id: "payment-received", label: "A payment was received" },
  { id: "work-started", label: "Work started" },
  { id: "work-finished", label: "Work finished" },
  { id: "problem-noticed", label: "A problem was noticed" },
  { id: "complaint-made", label: "A complaint was made" },
  { id: "demand-sent", label: "A demand for payment was sent" },
  { id: "agreement-reached", label: "An agreement was reached" },
  { id: "claim-filed", label: "A claim was filed" },
  { id: "document-served", label: "A document was served" },
  { id: "hearing-or-conference", label: "A hearing or conference" },
  { id: "order-made", label: "An order was made" },
  { id: "other-event", label: "Something else happened" },
];

export const TIMELINE_EVENT_TYPE_IDS: readonly TimelineEventTypeId[] =
  TIMELINE_EVENT_TYPES.map((type) => type.id);
