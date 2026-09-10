# Procedural Rules Inventory

Status: **read-only inventory of current state, not a sourcing pass.** Nothing
was sourced, written, or changed this session — every citation below either
already existed in the codebase or was independently fetched this session to
confirm it still resolves. Filed as context for a future sourcing-pass
session to scope against, not a deliverable that closes any gap itself. Per
CLAUDE.md §2, no legal fact is stated here from recall — every "STATED
WITHOUT A CITATION" and "KNOWN GAP" entry below is flagged, not filled in.

## How to read this

Every rule-dependent fact found is classified as exactly one of:

- **SOURCED** — has a real citation, independently fetched this session (or,
  for a small number explicitly noted, fetched earlier in this same
  session) and confirmed to still resolve and say what it's cited for.
- **CITED BUT UNVERIFIED** — a citation exists but this session didn't
  independently confirm the specific pinpoint it's being used for.
- **STATED WITHOUT A CITATION** — the code or content asserts a procedural
  fact with no traceable source.
- **KNOWN GAP** — already logged elsewhere as unsourced (`docs/DEADLINE_TRACKING_DESIGN.md`,
  `docs/INTAKE_STATUS.md`, or a file's own header). Confirmed still open
  this session, not re-researched.

## Summary

| Rule area | Sourced | Cited, unverified | Stated w/o citation | Known gap |
|---|---|---|---|---|
| `claimTypes.ts` — 19 Small Claims claim types (~20 distinct source URLs, 100+ citation instances) | 20 distinct sources verified | 0 | 0 | 0 (2 claim-type candidates permanently or provisionally cut — already logged, §4) |
| `DEFENCE_CONCEPTS` (5 entries) | 5 | 0 | 0 | 1 (`mitigation`, the 6th scoped concept — already logged) |
| `questionBank.ts` procedural questions | 6 | 0 | 0 | 0 (2 questions correctly carry no citation — pure fact-gathering, §3) |
| `legal_form_mapping_rules` (31 rows) — regulation-level citation | 30 | 0 | 0 | 1 (row id=8) |
| `legal_form_mapping_rules` — stage-assignment pinned to a specific rule/section (not just the regulation) | 0 | 30 | 0 | 0 |
| Deadline Tier 2/3 content (`docs/DEADLINE_TRACKING_DESIGN.md`) | 0 | 0 | 0 | 7 procedural stages, unchanged |
| Family/Civil authority registries outside page-level links (3 systems found, §6) | 2 URLs (already covered above, reused) | 1 (`ontarioCivilAuthorityCollection.ts`, dead code) | 1 (`doctrineSeedLibrary.ts`'s family-parenting seed — self-labeled "operational guidance only," not a hidden gap) | 0 |

The headline finding isn't a citation-quality problem — it's a **layer**
problem. Every Small Claims claim type's *content* (what a plaintiff
generally has to show, what evidence supports it, what remedies exist,
what defence concepts commonly arise) is genuinely, verifiably sourced.
The gap is entirely at the *deadline* layer: nothing in this codebase
computes or asserts a specific date for anything, by design (confirmed:
`docs/DEADLINE_TRACKING_DESIGN.md`'s Tier 2/3 remains completely
unbuilt — no new files exist since that spec was written). The one
partial exception, detailed in §3, is genuinely useful groundwork for
closing that gap.

## 1. `claimTypes.ts` — every distinct citation, verified this session

19 claim types cite the same ~20 distinct sources repeatedly (e.g.
`ontario.ca/document/guide-procedures-small-claims-court/making-claim` is
cited 15+ times across different elements). Rather than list 100+
citation instances, this table lists each **distinct URL once**, what it's
used to support, and its verification status. Every claim type's
per-element citations map onto one of these rows — `verifyIntakeCoverage.ts`
already structurally enforces that every `plaintiffElement`/
`defendantConsideration`/`proceduralNote` carries a `sourceUrl` (confirmed
via its own passing output this session: "0 non-draft entries missing a
resolvable source"), so the question this inventory answers isn't "is
there a URL," it's "does that URL actually resolve and say what it's
cited for."

| Source | Used for | Status |
|---|---|---|
| `ontario.ca/page/civil-claims-suing-and-being-sued` | General civil/Small Claims distinction, proof burden | SOURCED (verified this session, Civil page task) |
| `ontario.ca/document/guide-procedures-small-claims-court/making-claim` | Claim commencement, Form 7A, jurisdiction, elements across most claim types | SOURCED (verified this session) — title "Making a claim," confirms Form 7A/10A, jurisdiction, filing methods |
| `ontario.ca/document/guide-procedures-small-claims-court/replying-claim` | Form 10A / Defendant's Claim, 20-day filing window for a defendant's own claim | SOURCED (verified this session — confirmed the exact "20 days after you file your defence" wording) |
| `ontario.ca/document/guide-procedures-small-claims-court/serving-documents` | Service requirements, affidavit of service | SOURCED (verified this session) |
| `ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/` | Defence filing across most claim types' defendant considerations | SOURCED (verified this session) — independently states "20 calendar days from the date you were served," corroborating §3 |
| `ontario.ca/page/suing-someone-small-claims-court` | $50,000 limit, general claim mechanics | SOURCED (verified earlier this session, small-claims page task) |
| `ontario.ca/page/being-sued-small-claims-court` | Defendant-side general mechanics | SOURCED (verified earlier this session) |
| `ontariocourts.ca/.../steps-to-civil-case/` | Generic proof-burden framing reused across many claim types' first element | SOURCED (verified earlier this session, Civil page task) |
| `ontario.ca/laws/docs/90o02_eV006.doc` (Occupiers' Liability Act) | Slip-and-fall/occupier duty of care, waiver/assumption-of-risk defence | SOURCED (verified earlier this session, DEFENCE_CONCEPTS task) — flagged then as a historical-version render (Dec 2020–Jan 2021 snapshot), not the current consolidation; still the right statute, worth a fresher fetch in an actual sourcing pass |
| `ontario.ca/laws/docs/elaws_statutes_90n01_e.doc` (Negligence Act) | Contributory negligence defence concept | SOURCED (verified earlier this session) |
| `ontario.ca/laws/docs/90s01_e.doc` (Sale of Goods Act) | Breach of contract — goods, implied conditions | SOURCED (verified this session — confirmed exact title) |
| `ontario.ca/page/know-your-rights-when-getting-tow` | Improper/unauthorized towing claim type | SOURCED (verified this session) |
| `ontario.ca/page/your-rights-under-consumer-protection-act` | Consumer Protection Act issue, cancelled-contract/deposit claim type | SOURCED (verified this session) |
| `ontario.ca/document/your-guide-employment-standards-act-0/termination-employment` | Wrongful dismissal claim type | SOURCED (verified this session) |
| `ontario.ca/document/your-guide-employment-standards-act-0/overtime-pay` | Unpaid overtime claim type | SOURCED (verified this session) |
| `ontario.ca/document/your-guide-employment-standards-act-0/vacation` | Unpaid vacation pay claim type | SOURCED (verified this session) |
| `ontario.ca/laws/docs/90d16_e.doc` (Dog Owners' Liability Act) | Dog bite/attack claim type, strict liability | SOURCED (verified this session — confirmed exact title, amendments through June 2024) |
| `ontario.ca/page/renting-commercial-property-ontario` | Commercial tenancy dispute claim type | SOURCED (verified this session) |
| `ontario.ca/page/car-repair-shops-your-rights` | Vehicle repair dispute claim type | SOURCED (verified this session) |
| `ontario.ca/page/buying-new-or-used-vehicle-your-rights` | Used vehicle non-disclosure claim type | SOURCED (verified this session) |
| `ontario.ca/laws/docs/98c19_e.doc` (Condominium Act, 1998) | Unpaid condominium common expenses claim type | SOURCED (verified this session — confirmed exact title, S.O. 1998, c. 19) |
| `ontario.ca/laws/docs/elaws_statutes_90c43_ev005.doc` (Courts of Justice Act) | Defamation claim type's jurisdiction basis (s.23) | SOURCED (verified this session — confirmed s.23 exists and states Small Claims jurisdiction is remedy-based, matching the file header's own s.23(1) claim exactly) |
| `ontario.ca/laws/docs/90l12_e.doc` (Libel and Slander Act) | Defamation claim type's newspaper/broadcast notice-period carve-out | SOURCED (verified this session — confirmed exact title, R.S.O. 1990, c. L.12) |

**Not verified this session, flagged rather than assumed:** the file
header's own account of amount-specific pinpoints (e.g. the $50,000 limit
being "effective October 1, 2025") and every `verifiedAt` date recorded in
each claim type's `citations` array were not independently re-checked
against the live page's current text word-for-word — this session
confirmed each URL **resolves and covers the claimed topic**, not that
every specific pinpoint quote is still current phrasing. That finer-grained
check is real work for an actual sourcing pass, not this inventory.

## 2. `DEFENCE_CONCEPTS` (`claimTypes.ts:216-278`)

All 5 entries carry `status: "draft"` (confirmed directly this session —
unchanged since the session that built the "Defences that commonly come
up" card). All 5 `sourceUrl`s were independently verified this session
(during that same task): `civil-claims-suing-and-being-sued`,
`replying-claim`, `90o02_eV006.doc`, `elaws_statutes_90n01_e.doc` — all
SOURCED, all resolving and supporting their `plainExplanation`. The 6th
scoped concept, `mitigation`, is a **KNOWN GAP** — the file's own header
(`claimTypes.ts:196-205`) states no source was found across the three
approved domains after a real attempt, explicitly left open for a future
session to re-try, not closed.

## 3. `questionBank.ts` — procedural questions, and the one genuinely useful finding this session

Six questions state a procedural fact with a `sourceUrl`:

| Question id | Fact stated | Source | Status |
|---|---|---|---|
| `sc-amount-claimed` | $50,000 limit | `suing-someone-small-claims-court` | SOURCED |
| `sc-claim-filed` | Form 7A starts a case | `making-claim` | SOURCED |
| `sc-defendant-served` | Affidavit of Service (Form 8A) needed before the case can move forward | `serving-documents` | SOURCED |
| `sc-defence-filed` | **"A defendant generally has 20 calendar days to serve and file a defence"** | `default-proceedings/` | SOURCED — see below |
| `sc-defence-time-elapsed` | Same 20-day fact, restated as a yes/no gate | `default-proceedings/` | SOURCED |
| `sc-defendant-noted-in-default` | Default-noting is a real, distinct procedural step | `default-proceedings/` | SOURCED |

**The one finding worth flagging precisely, because it bears directly on
`docs/DEADLINE_TRACKING_DESIGN.md`'s open counting-method question:**
`sc-defence-filed`'s `why` field asserts "20 **calendar** days" —
specific about the counting method, not just "20 days." Fetched
`ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/`
directly this session with a targeted prompt about calendar vs. business
days. It returns, verbatim: **"A defendant generally has 20 calendar days
to serve and file a defence to a claim."** — an exact match to the code's
own wording, independently confirmed by the separate
`how-to-respond-to-a-case/` page as well ("20 calendar days from the date
you were served with the Claim").

This is genuinely useful groundwork, not a finished answer. It resolves
**one of three** counting-method questions `docs/DEADLINE_TRACKING_DESIGN.md`
§5.5 named for the Defence deadline specifically: calendar days, confirmed,
not business days. It does **not** resolve the other two — neither fetched
page states whether the clock starts the day of service or the day after,
nor whether statutory holidays are excluded from the count. And this fact
existing correctly in `questionBank.ts` is not the same as the *feature*
existing: no `DeadlineInformationTopic` or `DeadlineRule` content object
(`docs/DEADLINE_TRACKING_DESIGN.md` §3.1/§4.3) has been built from it — the
source material for the "responding" stage is now demonstrably stronger
than the design doc's own §6 sourcing plan assumed, but the structured
content that would surface it to a user still doesn't exist.

**Two questions correctly carry no citation, by design, not by
oversight** — worth naming as a positive pattern, not a gap:
`sc-contractor-completion-date` and `sc-contractor-notice-before-replacement`
both have inline comments explaining exactly why (`questionBank.ts:296,312-314`)
— one is pure fact-gathering with no legal claim attached, the other is a
real rule the codebase's own header says was searched for and not found on
an approved domain this session, so it deliberately stays an unsourced
factual question rather than being dressed up with a `why` it can't back.

## 4. Claim types cut or not attempted — confirmed still logged, not re-researched

`claimTypes.ts`'s own header (`claimTypes.ts:35-43,96-116`) logs two
claim-type candidates as cut, both confirmed still absent from
`CLAIM_TYPES` this session:
- **Vehicle accident — property damage only**: cut twice, explicitly "not
  re-attempted a third time" — general negligence elements aren't stated
  on any approved domain. KNOWN GAP, permanently closed per the file's own
  account.
- **Debt collection agency harassment**: real sourcing exists but as a
  defendant consideration, not an independent claim type (no underlying
  monetary claim to attach one to) — not built, logged as a future
  possibility, not a gap in existing content.

## 5. `legal_form_mapping_rules` — 31 rows, queried fresh this session

| | Count |
|---|---|
| Total rows | 31 |
| Rows with a resolvable `authority_citation` + `official_source_url` | 30 |
| Rows with neither | 1 (id=8, `court_area=small-claims`, `authority_review_status=review-required` — already known-broken from this session's earlier forms-pipeline audit, confirmed still broken) |

Of the 30 cited rows, every one resolves to the **regulation as a whole**,
not a specific rule number:

| Court area | Rows | Citation | URL | Status |
|---|---|---|---|---|
| small-claims | 4 (ids 6, 7, 15, 18) | O. Reg. 258/98, Rules of the Small Claims Court | `ontario.ca/laws/regulation/980258` | SOURCED (regulation-level; verified earlier this session, small-claims page task) |
| family | 13 | O. Reg. 114/99, Family Law Rules | `ontario.ca/laws/regulation/990114` | SOURCED (regulation-level; verified earlier this session, Family page task — e-Laws JS-shell caveat noted then, cross-confirmed via search) |
| civil | 13 | R.R.O. 1990, Reg. 194, Rules of Civil Procedure | `ontario.ca/laws/regulation/900194` | SOURCED (regulation-level; same caveat) |

**The precise gap, per the task's own question ("does each one trace back
to an actual cited rule, or is it internal logic with no citation
attached"):** neither — it's in between. Each row's `authority_citation`
correctly names a real, verified, in-force regulation. But **the specific
claim each row makes — "this form/rule applies at stage X"** — is not
pinned to a numbered rule or section within that regulation anywhere in
the schema. `authority_stage_applicability` (e.g. `["motion"]`,
`["responding"]`) and `applicability_conditions` (user-confirmed fact
paths) are internal categorization the site built, backed by *a*
citation to the governing regulation, not *the specific provision*
establishing that stage-gate. This is **CITED BUT UNVERIFIED** at the
level that actually matters for correctness — the regulation is real, but
whether rule 20 (say) genuinely governs exactly the "motion" stage the way
this row asserts hasn't been checked against the specific rule text, only
against the regulation's existence as a whole. All 30 rows share this
same gap uniformly; it isn't concentrated in any one court area.

## 6. Family/Civil rule references beyond page-level resource links

Beyond `app/family/page.tsx` and `app/civil/page.tsx`'s own resource-link
sections (already cited and verified in the sessions that rebuilt those
pages), three separate, non-overlapping systems reference these
regulations:

**`src/lib/case-system/authority-intelligence/verifiedAuthoritySeedRegistry.ts`**
(1,347 lines) — **live**, imported by `authorityRetrievalEngine.ts` (a real
consumer, not just a verification script). Carries genuinely careful,
sourced entries for both regulations: `O. Reg. 114/99, Family Law Rules`
(`sourceUrl: ontario.ca/laws/regulation/990114`, `verifiedAt:
"2026-08-06"`) and `R.R.O. 1990, Reg. 194, Rules of Civil Procedure, r.
1.02` (`sourceUrl: ontario.ca/laws/regulation/900194`, same
`verifiedAt`). Both URLs are the same ones already SOURCED above (§5).
Each entry carries its own explicit `limitsAndWarnings` array stating
plainly that it doesn't determine a specific form, deadline, remedy, or
outcome — the same posture this codebase already applies everywhere else.
SOURCED, not re-verified beyond confirming the same two URLs still
resolve.

**`src/lib/case-system/authority/ontarioCivilAuthorityCollection.ts`**
(269 lines) — a **separate, third registry** of the same regulation
(`"Ontario Rules of Civil Procedure"`, `verificationStatus: "needs-review"`,
`citation: { citation: "Rules of Civil Procedure" }` — no `sourceUrl` field
visible in this entry). Checked reachability: only `project-tree.txt` (a
generated file listing, not code) references this file — **it is not
imported anywhere in live code or in any verification script.** CITED BUT
UNVERIFIED, and moot in practice since nothing reads it.

**`src/lib/case-system/knowledge/doctrineSeedLibrary.ts`** (977 lines) —
**live**, imported by `courtSimplifiedBrain.ts`, `caseSystemAssembly.ts`,
and `aiCasePartnerOrchestrator.ts`. Its family-parenting seed
(`SEED_FAMILY_PARENTING_BEST_INTERESTS_001`, `doctrineSeedLibrary.ts:550-589`)
is explicitly tagged `source: operationalSource(...)` — the file's own
convention for internal organizational heuristics, distinct from a
verified legal citation — and its own `limitations` field states plainly:
"Must later be connected to verified Divorce Act, Children's Law Reform
Act, Family Law Rules, and Ontario family procedure sources." This is
**STATED WITHOUT A CITATION, correctly self-labeled as such** — not a
hidden gap. The entry ships with its own `systemWarnings: ["Operational
guidance only. Verify family law, forms, disclosure, and procedure before
filing."]`. Worth distinguishing from an unlabeled gap: this is the
codebase's own architecture flagging its own limitation, the same posture
this inventory is trying to produce at a higher level.

## 7. `docs/DEADLINE_TRACKING_DESIGN.md` §6 — confirmed still exactly as open

Checked via `Glob` for any `deadline*.ts` file under `src/lib/case-system/intake/`:
**none exist.** No `DeadlineInformationTopic`, `DeadlineRule`, or any other
content object from that spec has been built. All 7 procedural stages that
document's §6 named as needing research remain in the identical state:

| Stage | Status per DEADLINE_TRACKING_DESIGN.md §6 | Changed this session? |
|---|---|---|
| Responding to a claim | Not sourced as structured content | No new content built — but see §3 above: the underlying source material (20 calendar days, confirmed) is now stronger than when that doc was written |
| Default proceedings | Not sourced as structured content | No change — `questionBank.ts`'s existing `default-proceedings/` citations (§3) were already there before this session |
| Motions | Not sourced | No change |
| Settlement conference and trial | Not sourced | No change |
| Appeals and enforcement | Not sourced | No change |

## 8. What this means for a future sourcing pass

The scope of "fully sourcing procedural rules" is smaller than it might
sound, but concentrated in one specific place. Nearly all of what
`claimTypes.ts`, `DEFENCE_CONCEPTS`, and `questionBank.ts` currently assert
about *what a claim needs* is already real, verified sourcing — 20+
distinct sources, all independently confirmed live this session, none
found broken or stale in substance (one flagged as a historical statute
snapshot rather than the current consolidation, §1). The actual open work
concentrates in three places: (1) `legal_form_mapping_rules`' 30 cited rows
need their stage-assignments checked against the *specific* rule/section
within each regulation, not just the regulation's existence — the one row
with no citation at all (id=8) needs sourcing from scratch; (2) Deadline
Tracking's Tier 2/3 (`docs/DEADLINE_TRACKING_DESIGN.md`) needs the actual
content objects built — for "responding" specifically, the source material
is already stronger than that design doc assumed, which should shorten
that particular piece of the work; (3) `doctrineSeedLibrary.ts`'s
family-parenting seed needs the Family Law Rules/Divorce Act/Children's
Law Reform Act connection its own header already asks for.

No claim type is "fully sourced end to end" in the strict sense the site
owner is asking to see, because **no** claim type currently has any
deadline content at all — that layer doesn't exist yet for anything. What
differs by claim type is only the *content* layer (elements, evidence,
remedies, defences), and on that layer, every Small Claims claim type
checked this session is genuinely, verifiably sourced.
