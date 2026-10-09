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
  case_events: {
    parent: caseParent,
    extraParents: [
      { column: "related_document_id", table: "case_documents" },
      { column: "supersedes_event_id", table: "case_events" },
    ],
  },
  case_event_candidate_dismissals: { parent: caseParent },
  // 2026-10-08: the assistant conversation, saved with its case.
  case_chat_messages: { parent: caseParent },
  // The four workspace tables are written only by server routes (service role);
  // signed-in users read them and nothing else.
  workspace_documents: { parent: caseParent, storagePathColumn: "storage_path", clientWrites: false },
  // Keyed by its document: one text row per document, so the primary key IS the parent.
  workspace_document_text: { parent: documentParent, key: "document_id", clientWrites: false },
  workspace_timeline_events: {
    parent: caseParent,
    clientWrites: false,
    extraParents: [{ column: "document_id", table: "workspace_documents" }],
  },
  workspace_communications: {
    parent: caseParent,
    clientWrites: false,
    extraParents: [{ column: "document_id", table: "workspace_documents" }],
  },
};

/**
 * read: who may SELECT. "all rows" unless a predicate is given, in which case rows
 * outside it must stay hidden from that role.
 */
export const catalogue = {
  court_form_library: { anonRead: true, authenticatedRead: true },
  court_form_fields: { anonRead: true, authenticatedRead: true },
  // Written only by an account listed in site_operators (the overlay mapper page).
  pdf_overlay_fields: { anonRead: true, authenticatedRead: true, operatorWritable: true },
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

/*
 * canlii_cache, canlii_api_state and canlii_user_usage (2026-10-07,
 * 20261007090000): the CanLII API's cached metadata answers, its one-row
 * rate-limit lease, and each person's daily lookup allowance. Read and written
 * only by the server (src/lib/canlii/canliiServer.ts).
 */
export const serverOnly = ["ai_call_log", "site_operators", "canlii_cache", "canlii_api_state", "canlii_user_usage"];

export const views = {
  court_form_master_view: { readers: ["anon", "authenticated"] },
  court_form_clean_view: { readers: ["anon", "authenticated"] },
  family_form_lookup: { readers: ["anon", "authenticated"] },
};

/**
 * SECURITY DEFINER functions a client role may call, and which roles. Each needs a
 * reason: it runs with its owner's rights.
 *
 * is_site_operator(): answers "is the CALLER an operator?" for the overlay policy.
 * No arguments, pinned search_path, reads only site_operators. Policies run as the
 * caller, so a signed-in user must be able to execute it.
 */
export const definerFunctionsClientsMayCall = {
  "is_site_operator()": ["authenticated"],
};

export const storage = {
  privateBuckets: ["case-evidence"],
  /** Buckets whose objects must sit under `{auth.uid()}/...` for the owner only. */
  userFolderBuckets: ["case-evidence"],
};

/**
 * check id -> finding in docs/security/RLS_GAP_ANALYSIS.md. Empty since
 * 20261002090000_close_rls_gaps.sql closed F1–F5. Add an entry only with a
 * finding to point at.
 */
export const knownGaps = {};
