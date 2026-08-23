# Workflow Guidance Drafts — UNREVIEWED

Staging area for `legal_procedure_rules.workflow_guidance` content researched by
Claude but not yet reviewed or approved by a human. Nothing in this file has
been written to the database. Do not treat anything here as verified.

Each entry below is a complete draft of what would go into the `workflow_guidance`
column plus its provenance columns, in the same shape the 11 already-live
entries use, so it can be pasted into a migration directly once approved. Move
an entry out of this file (into a migration, with `workflow_guidance_review_status`
set to `verified-for-workflow`) only after a human has reviewed it. Delete the
entry from this file once promoted, or once rejected.

---

## id=1 — small-claims / starting-case — "Starting a Small Claims lawsuit"

**Status: STAGED LIVE under `workflow_guidance_review_status = 'ai-drafted-pending-review'`,
awaiting manual review and approval. Written via migration
`20260823015237_stage_ai_drafted_workflow_guidance_pending_review.sql`,
2026-08-23. Confirmed via the live app (database → `/api/rules/procedures` →
`resolveBetaProcedureAuthority` → `getProcedureAuthorityDisplayItems`, not just
code reading) that this status keeps the draft text completely invisible to
users: the rendered card is `{ state: "verified-full-procedure", guidance: [] }`,
identical to before this draft existed. This row's citation
(`authority_review_status`) was already `verified-for-workflow` independently,
so the safety mechanism here is specifically that
`permittedWorkflowGuidance.displayState` resolves to `review-required` and the
component only uses that text when it resolves to
`verified-source-linked-workflow` — not a generic amber "review required" box,
since this row already had a verified citation before the draft was added.**

**To promote:** review the draft text below against the primary source
(CanLII blocked automated fetches throughout this session, so it was never
directly read), then run
`UPDATE public.legal_procedure_rules SET workflow_guidance_review_status = 'verified-for-workflow' WHERE id = 1;`
as its own tracked migration. Nothing in this session sets that value — it is
reserved as a manual decision.

**Researched:** 2026-08-23, via independent web search (not assumed, not
generated from memory). This row's `authority_citation` (O. Reg. 258/98, r.
7.01) was already `verified-for-workflow` before this draft — only the
`workflow_guidance` text itself was missing, which is what this fills.

**Proposed `workflow_guidance` text:**

> A Small Claims Court action starts with a plaintiff's claim stating the parties, the nature of the claim, and the amount and relief sought.

Restates only what the rule requires — no commentary, no advice, no
recommendation — matching the pattern already confirmed clean across the 11
live entries.

**Proposed provenance columns** (mirroring the shape of the 11 live rows):

| Column | Value |
|---|---|
| `workflow_guidance_source_id` | `on-scc-start-r7-01` (matches this row's existing `authority_source_id`) |
| `workflow_guidance_source_type` | `primary-procedural-rule` |
| `workflow_guidance_official_source_url` | `https://www.ontario.ca/laws/regulation/980258` |
| `workflow_guidance_citation` | `O. Reg. 258/98, Rules of the Small Claims Court` |
| `workflow_guidance_pinpoint` | `r. 7.01` |
| `workflow_guidance_issuing_body` | `Ontario e-Laws` |
| `workflow_guidance_checked_at` | `2026-08-23` |
| `workflow_guidance_court_area` | `small-claims` |
| `workflow_guidance_stage_applicability` | `["starting-case"]` |
| `workflow_guidance_review_status` | **`ai-drafted-pending-review`** — a value that does not exist in the live schema yet. See the review-status investigation in this session's report before using it. |

**Sources consulted** (cross-checked across three independent sources before
drafting, not taken from a single page):

- Search summary of r. 7.01(1)–(2)'s content (commencement and required
  contents of a plaintiff's claim)
- [michaelsfirm.ca — Ontario Small Claims Court process](https://www.michaelsfirm.ca/the-ontario-small-claims-court-process-explained/) — independently confirms Form 7A and the same substantive content
- [CanLII — O. Reg. 258/98 (latest)](https://www.canlii.org/en/on/laws/regu/o-reg-258-98/latest/) — the primary source; direct fetch returned HTTP 403 (CanLII blocked automated fetches consistently throughout this session's research), so this is cited as the authoritative source to check manually before promotion, not as a source whose text was directly read

**A data-quality finding surfaced by this research, unrelated to the draft
itself:** row id=1's existing `required_forms` field says `"Form 1B – Plaintiff's Claim"`.
Every other reference to this form anywhere in the codebase — the tested,
passing `smallClaimsIntelligenceEngine.ts`, `smallClaimsEngine.ts`,
`caseSystemAssembly.ts`, and `verifySmallClaimsEngine.ts` — consistently says
**Form 7A**, and two independent external sources found during this research
also say Form 7A. `required_forms: ["Form 1B"]` on this row appears to be stale
or incorrect data. This was not touched — it is outside what this task asked
for — but it should not be missed. It sits on the exact row this draft targets.

---

Last Updated: 2026-08-23
