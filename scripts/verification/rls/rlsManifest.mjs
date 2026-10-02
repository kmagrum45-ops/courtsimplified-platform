/**
 * WHAT EVERY TABLE IS FOR, AND WHO MAY TOUCH IT.
 *
 * Read by scripts/verification/verifyRlsMatrix.mjs. The suite derives its attacks from
 * this file, so the file is the security model written down: change a line here and
 * you are changing who can read a litigant's documents.
 *
 * *** A NEW TABLE THAT IS NOT LISTED HERE FAILS THE SUITE ***
 *
 * On purpose. Most RLS incidents are not a bad policy on a known table; they are a
 * new table nobody thought about, created with Supabase's default grants. So the
 * first thing the suite checks is that every relation in `public` has a line below.
 * Adding one is a one-line decision — which of the four kinds is it — and that
 * decision is the point.
 *
 *   userOwned  a litigant's own data. Owner reads and writes their rows; nobody else,
 *              signed in or not, can see, change, delete, forge or re-parent them.
 *   catalogue  shared reference data (court forms, rules). Readers as declared;
 *              NO client role writes. Edits go through the service role.
 *   serverOnly only the service role touches it.
 *   view       a view. Declares who reads it and that no client role can write
 *              through it (a view runs as its owner and skips RLS on the tables
 *              beneath it unless it is security_invoker).
 *
 * *** knownGaps — FINDINGS NOT YET FIXED ***
 *
 * A check whose id is listed here and FAILS is reported as an open gap, not a failure,
 * so CI stays green while the fix is decided. A check listed here that PASSES fails the
 * suite with "fixed — delete this line": the list can only shrink, and a fix cannot go
 * unnoticed. Each entry names its finding in docs/security/RLS_GAP_ANALYSIS.md.
 */

/** A case_id or document_id that must belong to the same user as the row. */
const caseParent = { column: "case_id", table: "cases" };
const documentParent = { column: "document_id", table: "workspace_documents" };

export const userOwned = {
  cases: { parent: null },
  case_intakes: { parent: caseParent },
  case_documents: { parent: caseParent },
  case_evidence: { parent: caseParent },
  case_generated_documents: { parent: caseParent },
  case_events: { parent: caseParent },
  case_event_candidate_dismissals: { parent: caseParent },
  workspace_documents: { parent: caseParent, storagePathColumn: "storage_path" },
  // Keyed by its document: one text row per document, so the primary key IS the parent.
  workspace_document_text: { parent: documentParent, key: "document_id" },
  workspace_timeline_events: { parent: caseParent },
  workspace_communications: { parent: caseParent },
};

/**
 * read: who may SELECT. "all rows" unless a predicate is given, in which case rows
 * outside it must stay hidden from that role.
 */
export const catalogue = {
  court_form_library: { anonRead: true, authenticatedRead: true },
  court_form_fields: { anonRead: true, authenticatedRead: true },
  pdf_overlay_fields: { anonRead: true, authenticatedRead: true },
  court_forms: {
    anonRead: { where: "category = 'family' AND province = 'ontario'" },
    authenticatedRead: false,
  },
  legal_form_mapping_rules: { anonRead: false, authenticatedRead: true },
  pdf_form_inventory: { anonRead: false, authenticatedRead: true },
  civil_form_lookup: { anonRead: false, authenticatedRead: false },
  court_form_overlays: { anonRead: false, authenticatedRead: false },
  court_form_sources: { anonRead: false, authenticatedRead: false },
  form_rules: { anonRead: false, authenticatedRead: false },
  forms: { anonRead: false, authenticatedRead: false },
  legal_element_rules: { anonRead: false, authenticatedRead: false },
  legal_evidence_rules: { anonRead: false, authenticatedRead: false },
  legal_issue_rules: { anonRead: false, authenticatedRead: false },
  legal_procedure_rules: { anonRead: false, authenticatedRead: false },
  legal_question_rules: { anonRead: false, authenticatedRead: false },
  legal_risk_rules: { anonRead: false, authenticatedRead: false },
  pdf_field_mappings: { anonRead: false, authenticatedRead: false },
  small_claims_form_lookup: { anonRead: false, authenticatedRead: false },
};

export const serverOnly = ["ai_call_log"];

export const views = {
  court_form_master_view: { readers: ["anon", "authenticated"] },
  court_form_clean_view: { readers: ["anon", "authenticated"] },
  family_form_lookup: { readers: ["anon", "authenticated"] },
};

/** SECURITY DEFINER functions a client role is allowed to call. None today. */
export const definerFunctionsClientsMayCall = [];

export const storage = {
  privateBuckets: ["case-evidence"],
  /** Buckets whose objects must sit under `{auth.uid()}/...` for the owner only. */
  userFolderBuckets: ["case-evidence"],
};

/** check id -> finding in docs/security/RLS_GAP_ANALYSIS.md */
export const knownGaps = {
  // F1 — any signed-in user can rewrite the family form catalogue through the view.
  "view:family_form_lookup:owner-rights-not-writable-by-clients": "F1",
  "view:family_form_lookup:authenticated-cannot-write": "F1",

  // F2 — any signed-in user can rewrite or delete the form-filling overlay map.
  "catalogue:pdf_overlay_fields:authenticated-cannot-insert": "F2",
  "catalogue:pdf_overlay_fields:authenticated-cannot-update": "F2",
  "catalogue:pdf_overlay_fields:authenticated-cannot-delete": "F2",

  // F3 — a row's parent case/document is not checked against its owner.
  "owned:case_intakes:cannot-attach-to-other-users-parent": "F3",
  "owned:case_documents:cannot-attach-to-other-users-parent": "F3",
  "owned:case_evidence:cannot-attach-to-other-users-parent": "F3",
  "owned:case_generated_documents:cannot-attach-to-other-users-parent": "F3",
  "owned:case_events:cannot-attach-to-other-users-parent": "F3",
  "owned:case_event_candidate_dismissals:cannot-attach-to-other-users-parent": "F3",
  "owned:workspace_documents:cannot-attach-to-other-users-parent": "F3",
  "owned:workspace_document_text:cannot-attach-to-other-users-parent": "F3",
  "owned:workspace_timeline_events:cannot-attach-to-other-users-parent": "F3",
  "owned:workspace_communications:cannot-attach-to-other-users-parent": "F3",

  // F4 — a workspace document row can point at another user's stored file.
  "owned:workspace_documents:storage-path-stays-in-own-folder": "F4",

  // F5 — signed-in users hold TRUNCATE (which ignores RLS) on user and catalogue tables.
  "grants:authenticated-has-no-truncate": "F5",
};
