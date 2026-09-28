/**
 * Whether the platform assembles drafts of court documents (Plaintiff's Claim
 * Form 7A, Statement of Claim Form 14A, Family Application Form 8).
 *
 * OFF as of 2026-09-28, for all three areas equally.
 *
 * The site owner's standing decision is that users fill in court forms
 * themselves, with the site guiding them and answering questions, and the LSO
 * Access to Innovation submission describes claim drafting as paused.
 * docs/REGULATORY_POSITION.md section 6.4 is the reason: Law Society Act
 * s. 1(6)2.vii names "selects, drafts, completes or revises, on behalf of a
 * person" a document for use in a proceeding, and a deterministic template
 * does not obviously take the platform outside it.
 *
 * The drafting engines and their suites are kept intact, so this can be turned
 * back on deliberately if an approved sandbox scope allows it. Turning it on
 * is a regulatory decision, not a code one.
 */
export const COURT_DOCUMENT_DRAFTING_ENABLED = false;
