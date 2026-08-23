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

## id=31 (existing row) — family / child-support — "Child support claim or response"

**Status: DRAFT ONLY. Nothing written to the database.** Unlike id=1, this row
currently has `authority_citation = NULL` and `authority_review_status =
'review-required'` — there is no existing verified citation to attach
`workflow_guidance` to. This draft proposes both the citation and the
guidance text together, both staged unpromoted.

**Safety mechanism, confirmed by reading the actual consumer code (not
assumed):** `app/builder/_components/ProcedureAuthorityDisplay.tsx` (lines
~29–72) hard-codes `citation: null` on every mapped item whenever
`resolved.displayState === "review-required"` — it does not pass through
`resolved.citation` from the database record at all in that branch. Since
`resolveBetaProcedureAuthority` in `betaProcedureAuthority.ts` (line 287) puts
`storedStatus !== "verified-for-workflow"` into `commonMissing`, and
`reviewStatus()` (line 183–190) normalizes any non-canonical value — including
leaving `authority_review_status` at its current `'review-required'` — the
raw citation text this draft proposes would not reach the rendered page even
if written to the row today, independent of and in addition to the
`workflow_guidance_review_status = 'ai-drafted-pending-review'` gate already
proven safe for id=1. Both gates would be in the unpromoted state
simultaneously if this is staged.

**To promote:** review both the citation and guidance text below against the
primary sources, then run two separate manual updates as their own tracked
migration:
`UPDATE public.legal_procedure_rules SET authority_review_status = 'verified-for-workflow' WHERE id = 31;`
and, independently,
`UPDATE public.legal_procedure_rules SET workflow_guidance_review_status = 'verified-for-workflow' WHERE id = 31;`
Nothing in this draft sets either value — both are reserved as manual
decisions, exactly as with id=1.

**Researched:** 2026-08-23, via independent web search and direct fetch of a
Government of Canada primary source (not assumed, not generated from memory).

**Proposed `authority_citation`:**

> Federal Child Support Guidelines, SOR/97-175, ss. 3–4, 7; applied to Family Law Act proceedings in Ontario by the Child Support Guidelines, O. Reg. 391/97, which adopts the same federal Tables

**Proposed `workflow_guidance` text** (plain restatement, no commentary, no
advice, and deliberately does not restate exact table dollar amounts — those
must be looked up from the published Tables for the payor's income and
number of children, not recited as prose):

> Child support is calculated primarily from the paying parent's annual income and the number of children, using the published Child Support Tables for the paying parent's province of residence. The Child Support Tables were updated effective October 1, 2025 — the first revision since 2017 — and the updated Tables apply to amounts calculated for periods on or after that date. Section 7 "special or extraordinary expenses," such as child care, health-related expenses not covered by insurance, and education, are calculated separately from the table amount and are shared between the parents in proportion to their incomes, not split evenly.

**Proposed provenance columns:**

| Column | Value |
|---|---|
| `authority_source_id` | `on-fam-child-support-fcsg` |
| `authority_source_type` | `primary-federal-regulation` |
| `official_source_url` | `https://www.justice.gc.ca/eng/fl-df/child-enfant/index.html` |
| `authority_citation` | as above |
| `authority_pinpoint` | `ss. 3–4, 7` |
| `authority_issuing_body` | `Department of Justice Canada / Government of Ontario` |
| `authority_checked_at` | `2026-08-23` |
| `authority_court_area` | `family` |
| `authority_topic` | `child-support` |
| `authority_stage_applicability` | `["child-support"]` |
| `authority_review_status` | **left as `review-required`** (its current live value — this draft does not change it) |
| `workflow_guidance_source_id` | `on-fam-child-support-fcsg` (matches `authority_source_id`) |
| `workflow_guidance_source_type` | `primary-federal-regulation` |
| `workflow_guidance_official_source_url` | `https://www.justice.gc.ca/eng/fl-df/child-enfant/index.html` |
| `workflow_guidance_citation` | same as `authority_citation` |
| `workflow_guidance_pinpoint` | `ss. 3–4, 7` |
| `workflow_guidance_issuing_body` | `Department of Justice Canada / Government of Ontario` |
| `workflow_guidance_checked_at` | `2026-08-23` |
| `workflow_guidance_court_area` | `family` |
| `workflow_guidance_stage_applicability` | `["child-support"]` |
| `workflow_guidance_review_status` | **`ai-drafted-pending-review`** |

**Sources consulted** (cross-checked across independent sources, including one
direct fetch of a Government of Canada page — not taken from a single page):

- Direct fetch of [Department of Justice Canada — FAQ, 2025 Update to the Federal Child Support Tables](https://www.justice.gc.ca/eng/fl-df/child-enfant/faq.html) — confirms, in the department's own words, that "the Government of Canada last updated the Federal Tables in 2017" and this is the first revision since then, and confirms the general basis (income and federal/provincial/territorial tax rules, tables built per child count and $1,000 income increments)
- [Department of Justice Canada — Child Support Tables look-up](https://www.justice.gc.ca/eng/fl-df/child-enfant/cst-orpe.html) and [2025 Update to the Federal Child Support Tables](https://www.justice.gc.ca/eng/fl-df/child-enfant/ft-tf.html) — confirm the October 1, 2025 effective date
- [Ontario — Child Support Guidelines, O. Reg. 391/97](https://www.ontario.ca/laws/regulation/970391) — confirms the provincial regulation mirrors the federal Tables for Family Law Act (non-divorce) proceedings
- [reganlawfirm.ca — Section 7 expenses](https://www.reganlawfirm.ca/post/child-support-in-ontario-what-are-section-7-expenses-and-how-are-they-calculated) and [nihanglaw.ca — Section 7 expenses](https://www.nihanglaw.ca/section-7-expenses-ontario-what-qualifies-who-pays/) — two independent secondary sources, cross-checked against each other, both describing section 7 categories (child care, health-related costs, education, extraordinary extracurricular) as shared proportionately to income, not split evenly — used only to confirm the mechanism, not for any of the primary citation text
- CanLII's own text of O. Reg. 391/97 was not directly read — CanLII blocked automated fetches (HTTP 403), consistent with every other attempt this session — cited above only via ontario.ca's own regulation page, which loaded but did not render machine-readable text either (JS-rendered page); the Department of Justice's own FAQ page was used as the actual primary-source text instead, since it did render and is itself a Government of Canada publication about this same instrument

---

## id=NEW (three rows required) — court fee waivers — applies to small-claims, family, and civil

**Status: DRAFT ONLY. Nothing written to the database.** This topic has **no
existing row** — unlike id=1 and id=31, this requires inserting three brand
new rows (`court_area` = `small-claims`, `family`, `civil`, each with
`procedure_stage = 'fee-waiver'`), since the table's schema scopes one row to
exactly one `court_area` (a plain `text` column, not an array) and fee
waivers are requested identically at any point in any of the three case
types.

**Important safety difference from id=1 and id=31, found while researching
this entry — worth flagging explicitly:** id=1's and id=31's staging pattern
only protects the `workflow_guidance` (and, for id=31, `authority_citation`)
*display* — it does nothing to hide a row's base descriptive columns
(`rule_name`, `trigger_facts`, `required_forms`, etc.), because those columns
have no review-status gate at all in `betaProcedureAuthority.ts`. That gap
doesn't matter for id=1/id=31 because those rows already exist live with
real base content. It does matter here, because these three rows do not
exist yet: the moment they're inserted, `app/api/rules/procedures/route.ts`
(confirmed as the *only* code in the repo that queries
`legal_procedure_rules` — grepped the whole tree) would return their raw
`rule_name`/`trigger_facts`/`required_forms`/etc. to any caller for
`courtPath` + `stage: "fee-waiver"`, regardless of review status, since that
route only filters `.eq("court_area", courtArea).eq("procedure_stage",
procedureStage).eq("is_active", true)` — no review-status filter exists on
the base row at all. **The correct staging mechanism for these three new
rows is therefore `is_active = false`**, not the `ai-drafted-pending-review`
pattern alone — confirmed by reading `route.ts` directly, that `is_active`
filter is the only thing standing between a freshly inserted row and a live
API response. `workflow_guidance_review_status = 'ai-drafted-pending-review'`
should still be set too, for consistency and so the row is already correctly
shaped for the moment `is_active` is flipped to `true`, but `is_active =
false` is what actually keeps it invisible in the meantime. No frontend code
currently requests `stage: "fee-waiver"` either, which is a second, weaker
reason nothing would surface today even without `is_active` — but that's an
absence of a caller, not a real gate, so it isn't relied on here.

**To promote:** review the text and citation below against the primary
sources, then in a single tracked migration: insert the three rows with
`is_active = false`, confirm live (via `/api/rules/procedures`, same method
proven for id=1) that requesting `stage: "fee-waiver"` for each court path
returns nothing, and only then — as a separate, later, manual decision — flip
`is_active = true` and `authority_review_status = 'verified-for-workflow'`
once a human has reviewed the primary source text directly (CanLII blocked
automated fetches for this regulation too).

**Researched:** 2026-08-23, via independent web search and direct fetch of
the Ontario government's own page (not assumed, not generated from memory).
Current income thresholds verified directly against ontario.ca as
instructed, not carried over from a search-engine summary alone.

**Proposed `authority_citation`:**

> Administration of Justice Act, R.S.O. 1990, c. A.6, s. 4.4; Fee Waiver, O. Reg. 2/05

**Proposed `workflow_guidance` text** (plain restatement, no commentary, no
advice):

> A person may ask to have court fees waived under section 4.4 of the Administration of Justice Act, using the eligibility criteria set out in O. Reg. 2/05 (Fee Waiver). A person automatically qualifies if they receive income assistance under the Ontario Works Act, income support under the Ontario Disability Support Program Act, or are represented under a Legal Aid Ontario certificate. Otherwise, eligibility is based on gross annual household income: less than $33,100 for one person, $49,600 for two, $57,300 for three, $68,700 for four, and $80,200 for five or more people. A person who meets the automatic or income criteria completes Form FW-A-3 (Fee Waiver Request to Registrar, Clerk or Sheriff); a person who does not meet those criteria completes Form FW-A-4 (Fee Waiver Request to Court), which is decided by a judge. A litigation guardian, or a person applying to become one, uses Form FW-A-6 or FW-A-7 — the litigation-guardian equivalents of FW-A-3 and FW-A-4. A person can request a fee waiver again if their financial situation changes.

**Proposed provenance columns** (identical across all three rows except
`court_area`; shown once):

| Column | Value |
|---|---|
| `authority_source_id` | `on-fee-waiver-aja-s4-4` |
| `authority_source_type` | `primary-statute-and-regulation` |
| `official_source_url` | `https://www.ontario.ca/page/have-your-court-fees-waived` |
| `authority_citation` | as above |
| `authority_pinpoint` | `s. 4.4; O. Reg. 2/05` |
| `authority_issuing_body` | `Ministry of the Attorney General (Ontario)` |
| `authority_checked_at` | `2026-08-23` |
| `authority_court_area` | `small-claims` / `family` / `civil` (one row each) |
| `authority_topic` | `fee-waiver` |
| `authority_stage_applicability` | `["fee-waiver"]` |
| `authority_review_status` | `review-required` (left unpromoted) |
| `is_active` | **`false`** — the actual mechanism keeping these rows invisible until reviewed; see safety note above |
| `workflow_guidance_source_id` | `on-fee-waiver-aja-s4-4` |
| `workflow_guidance_source_type` | `primary-statute-and-regulation` |
| `workflow_guidance_official_source_url` | `https://www.ontario.ca/page/have-your-court-fees-waived` |
| `workflow_guidance_citation` | same as `authority_citation` |
| `workflow_guidance_pinpoint` | `s. 4.4; O. Reg. 2/05` |
| `workflow_guidance_issuing_body` | `Ministry of the Attorney General (Ontario)` |
| `workflow_guidance_checked_at` | `2026-08-23` |
| `workflow_guidance_court_area` | `small-claims` / `family` / `civil` (one row each) |
| `workflow_guidance_stage_applicability` | `["fee-waiver"]` |
| `workflow_guidance_review_status` | **`ai-drafted-pending-review`** |

**Sources consulted** (cross-checked across independent sources, including
one direct fetch of the Ontario government's own page — not taken from a
single page):

- Direct fetch of [ontario.ca — Have your court fees waived](https://www.ontario.ca/page/have-your-court-fees-waived) — the primary source for the income thresholds ($33,100 / $49,600 / $57,300 / $68,700 / $80,200), the three automatic-eligibility categories, the four form numbers (FW-A-3, FW-A-4, FW-A-6, FW-A-7) and their full names, and the exact reapplication statement ("If your financial situation changes, you can request a fee waiver again")
- Independent general web search cross-checking the same five income figures and the same automatic-eligibility categories against a second summary before the direct fetch — matched exactly, no discrepancy
- [ontariocourtforms.on.ca — FW-A-3 and FW-A-4 PDF filenames/titles](https://ontariocourtforms.on.ca/static/media/uploads/courtforms/fw/4/fw-a-4-e.pdf) — independently confirms the FW-A-3 "Registrar, Clerk or Sheriff" / FW-A-4 "Court" split found on ontario.ca
- [CanLII — Administration of Justice Act, R.S.O. 1990, c. A.6](https://www.canlii.org/en/on/laws/stat/rso-1990-c-a6/latest/rso-1990-c-a6.html) and [CanLII — O. Reg. 2/05](https://www.canlii.org/en/on/laws/regu/o-reg-2-05/latest/o-reg-2-05.html) — the primary sources; direct fetch of both returned HTTP 403 (CanLII blocked automated fetches throughout this session, consistent with id=1's research), so both are cited as the authoritative sources to check manually before promotion, not as sources whose text was directly read. A general search summary of s. 4.4's operative text (written request to a judge/deputy judge/associate judge; litigation guardian completes the request on behalf of the person) was cross-checked but is not a substitute for reading the primary text directly

**A structural note surfaced by this research, unrelated to the draft
itself:** these income thresholds are the kind of figure that changes
periodically. The `workflow_guidance_checked_at` / `authority_checked_at`
staleness gate already built into `resolveBetaProcedureAuthority` (via
`currentCheckedAt()`) is exactly the mechanism that should catch this later —
worth confirming, at promotion time, how long a `checked_at` date is treated
as current before this entry starts failing the freshness check and reverting
to `review-required` on its own.

---

Last Updated: 2026-08-23
