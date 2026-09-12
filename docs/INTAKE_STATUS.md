# AI-Guided Intake — Consolidated Status

Written 2026-09-07 (Session 27) as a read-and-report audit across every
session that touched `src/lib/case-system/intake/`, the guided/static
Small Claims UI, and the court-path classifier. `docs/AI_INTAKE_DESIGN.md`
stays the design/architecture doc (the five phases, the "who does the
applying" rule); this file is the current-state audit — what's built,
what's open, what's permanently closed. Update this file, not the design
doc, when a future session closes or discovers a gap. When this file and
the code disagree, trust the code.

## 1. What's fully built and verified, by feature

| Feature | File(s) | Built | Verified how | Notes |
|---|---|---|---|---|
| Safety pass | `safetyPass.ts` | Session 4, narrowed Session 6 | `test:safety-regression`, 11 cases, **CI-wired**, real billed OpenAI calls every run | Only phase with a permanent, CI-gated regression suite |
| Fact extraction | `extractIntakeFacts.ts` | Session 3 (plain), Session 10 (with-confidence sibling) | Proof scripts only (`scripts/proofs/`), not CI-gated | Two exports: `extractIntakeFacts()` (4 old proofs depend on its shape) and `extractIntakeFactsWithConfidence()` (the one the orchestrator actually calls) |
| Claim-type matching | `claimTypeMatcher.ts` | Session 9 (promoted from Session 3 proof) | Proof scripts only | Pure substring match on `claimTypes.ts`'s `signals`; no `status` gate (see §2) |
| Question selection | `selectQuestions.ts` | Session 1 | `test:select-questions`, **CI-wired** | Only phase declared "no AI, ever" by design |
| Voice layer | `voiceLayer.ts` | Session 7 | Proof script only | Validator (`validateVoiceLayerOutput`) is pure/deterministic; two open quality notes, see §2 |
| Orchestrator | `orchestrateIntakeTurn.ts` | Session 9; extended Sessions 10, 16, 22 | Proof scripts only, no dedicated `verification/*` suite | Sequences all of the above; stateless by design (caller owns `facts`/`answeredIds`) |
| Evidence gap detection | `evidenceGapDetector.ts` | Session 22, negation fix Session 25 | Proof script with hard `assert`s (not CI-gated) | Pure keyword heuristic, explicitly imperfect by design |
| Guided chat mode | `GuidedSmallClaimsIntake.tsx` + `/api/intake/guided-turn` | Route: Session 11; real content: Session 13; evidence panel: Session 23 | Manual + proof scripts | See §3 for what it's missing relative to the form |
| Static form mode | `SmallClaimsIntake.tsx` + `/api/small-claims/analyze` | Pre-existing; Tier 1/2 help Session 15; safety check Session 17; auth-required Session 19 | `tsc`/`eslint`/`build` each session | Does **not** run through `orchestrateIntakeTurn` at all — separate pipeline |
| Content: question bank | `questionBank.ts` | Session 1, marked reviewed Session 13 | `test:intake-coverage`, **CI-wired** | 15 questions, all `status: "reviewed"` |
| Content: claim types | `claimTypes.ts` | Sessions 1–2 (8), 18 (+6), 20 (+4), 26 (+1 defamation) | `test:intake-coverage` | 19 entries, all `status: "reviewed"`, all direct-fetch sourced |
| Content: defence concepts | `claimTypes.ts` (`DEFENCE_CONCEPTS`) | Session 1 | `test:intake-coverage` | 5 of 6 scoped concepts sourced; mitigation cut (see §4) |
| Content: education topics | `educationTopics.ts` | Session 1 | `test:intake-coverage` (source-check only) | **6 topics, still `status: "draft"`, never surfaced anywhere** — see §2 |
| Content: remedy types | `remedyTypes.ts` | Session 1 | `test:intake-coverage` (source-check only) | **4 remedies, still `status: "draft"`, referenced by id from `claimTypes.ts` but never independently displayed** — see §2 |
| Content: family safety resources | `familySafetyResources.ts` | Session 6, numbers Session 8 | none (not covered by `verifyIntakeCoverage.ts`, no `courtArea: "family"` support there) | **Still `status: "draft"`, never wired to any UI, contains a literal `[PLACEHOLDER]` string in its own content field** — see §2 |
| LTB false-confidence fix | `courtPathClassifier.ts` | Session 24 | `test:court-path-classifier`, **CI-wired** | Keyword-only path only — see §2 |

## 2. Every known open gap

Ordered roughly by how much it affects a real user today.

### The guided chat mode produces no persisted result
**What:** `GuidedSmallClaimsIntake.tsx`'s `Props` type is `{ location, initialStory }` — no `onComplete` callback, no case-save hook, nothing. When `intakeComplete` becomes true, the component shows "That's everything needed for now" and stops. There is no code path from a finished guided conversation to a saved case, a document draft, or the dashboard — the facts collected simply end up nowhere once the chat says it's done.
**Flagged:** implicitly since Session 11 (the component's own file header says it "does not produce an AnalysisResult, so it does not feed into the builder's case-save/analysis pipeline"), never called out as a completeness gap until this audit.
**Why not fixed:** every session that touched guided mode (11, 12, 13, 22, 23) was scoped to one layer at a time (route, then real content, then evidence guidance) — none was scoped to "wire the end of the conversation to anything."
**Status:** open, unaddressed. This is the largest functional gap in the whole system — not a sourcing question, a missing feature.

### The dev-only preview scaffolding was never deleted after its own stated trigger condition
**What:** `DEV_ONLY_testReviewedBank.ts`'s file header says, in its own words: *"MUST BE DELETED BEFORE ANY REAL DEPLOYMENT... once questionBank.ts's real entries go through actual review and get marked 'reviewed' for real, this entire file (and the devPreview mechanism in the route) should be deleted, not kept 'just in case.'"* `questionBank.ts` was marked `reviewed` in Session 13. That file, `app/intake-preview/page.tsx`, and `isDevPreviewAllowed()`/the `?devPreview=true` branch in `app/api/intake/guided-turn/route.ts` are all still present.
**Flagged:** by its own author, Session 12, with an explicit trigger condition.
**Why not fixed:** no session since 13 was scoped to touch the guided-turn route or its dev scaffolding for cleanup purposes.
**Status:** **candidate for a 2-minute fix next session** — the trigger condition this code itself named has already been met.

### Guided mode never shows a question's `why`/sourceUrl
**What:** `GuidedSmallClaimsIntake.tsx`'s local `IntakeQuestion` type is `{ id, text }` only — no `why`, no `sourceUrl`. The real production guided chat never surfaces the sourced legal context (e.g. the $50,000 limit citation, the Form 7A citation) that the same questions carry in `questionBank.ts` and that the static form's Tier 1 help (Session 15) already shows. A guided-mode user gets *less* sourced context per question than a form-mode user.
**Flagged:** not previously — found during this audit by comparing the two components' types side by side.
**Why not fixed:** Session 23 scoped itself narrowly to evidence guidance; nobody has done a pass on guided mode's own message content since Session 13.
**Status:** open, unaddressed, not previously logged anywhere.

### Three content registries are fully sourced but completely dormant
**What:** `educationTopics.ts`, `remedyTypes.ts`, and `familySafetyResources.ts` are all real, sourced content — `remedyTypes.ts`'s own header says "all four entries were sourceable... nothing was cut" — but (a) none were ever flipped to `status: "reviewed"` the way `questionBank.ts` and `claimTypes.ts` were, and (b) the design doc says plainly "the surfacing logic itself... is not built." No UI, route, or orchestrator path reads any of these three files today.
**Flagged:** implicitly, since each file's own header calls itself "Phase 0 foundation" pending a later surfacing layer.
**Why not fixed:** Phase 5 (education layer) was explicitly scoped as foundation-only from the start; the "mark reviewed" sessions (13, 18, 20, 26) only ever touched `questionBank.ts`/`claimTypes.ts`.
**Status:** open. Not broken, just inert — worth a deliberate decision (build the surfacing layer, or explicitly leave it foundation-only) rather than continuing to accumulate sourced-but-unused content.

### A literal placeholder string sits inside `familySafetyResources.ts`'s user-facing content
**What:** the `content` field of `family-violence-support-resources` contains, verbatim: `"[PLACEHOLDER -- STILL NEEDS REAL REVIEW: no single phone number for the Family Court Support Worker Program or the Family Law Information Centre was found..."`. This isn't a code comment — it's inside the string that would be shown to a user if this were ever surfaced.
**Flagged:** by its own author, Session 8, deliberately (rather than guessing a number).
**Why not fixed:** the underlying fact (no single ontario.ca-listed number for those two programs) is still genuinely unresolved — see §4.
**Status:** low risk today only because of the dormancy above. Whoever eventually wires this content up must resolve or strip this string first — flagging so it isn't missed.

### `HomeLocationGate.tsx` still duplicates the Small Claims story field
**What:** the homepage location gate collects province/city/story before the Small Claims mode selector; the story then pre-fills whichever mode the user picks, duplicating what that mode collects itself. Session 14 fixed this for the `/small-claims` → `/builder` entry point only.
**Flagged:** Session 14, explicitly deferred.
**Why not fixed:** `HomeLocationGate.tsx` is shared by Family/Civil and its story feeds the AI court-path-classifier's switch-suggestion — the fix needs its own session that verifies the classifier still gets what it needs, not a quick patch.
**Status:** open, well-scoped, understood, not started.

### Guests get zero safety check on the static form (accepted tradeoff, not an oversight)
**What:** an unauthenticated form submission never reaches `/api/intake/safety-check` at all (Session 19 gates on session presence before even attempting it).
**Flagged:** Session 17 (found the gap), Session 19 (closed it for authenticated users, explicitly left it open for guests).
**Why not fixed:** there is no deterministic fallback for a real safety classification, matching why guided mode also requires authentication unconditionally. Closing it for guests would mean either requiring sign-in platform-wide for this form or building a guest-safe partial check — a real product decision, not made here.
**Status:** open, deliberately accepted, documented in Session 19's own commit message.

### LTB/former-tenant jurisdictional boundary — behavioral fix only, legal question still unsourced
**What:** Session 24 stopped the classifier from being confidently wrong about a former-tenant story, but did not and could not resolve where the LTB/Small-Claims line actually falls, and does not cover the AI-escalation path (stories over 320 characters).
**Flagged:** Session 1 (93f770d), still logged in `AI_INTAKE_DESIGN.md`'s open-questions section (see the note at the bottom of this file about that section).
**Why not fixed:** confirmed unsourceable from the three approved domains; a behavioral mitigation was the only responsible move without inventing a legal rule.
**Status:** open on the legal question itself; the code-level over-confidence bug is fixed for the common (short-story) case only.

### `IntelligenceOverviewPanel.tsx` has bespoke content for only 2 of many issue types
**What:** found while adding positive content checks to the scenario-quality harness — defamation and adoption are the only issue types with tailored evidence/court-points/confirm-question content in the case overview; every other issue type (wrongful dismissal, property damage, contract, etc.) falls through to a generic or empty path.
**Flagged:** commit `a6ba74c`.
**Why not fixed:** out of scope for that session, which was building the test harness that surfaced it, not fixing content.
**Status:** open. Note this is a **different rendering surface** than the guided-intake evidence guidance panel — it's the older case-overview/analysis system, not `orchestrateIntakeTurn`'s pipeline.

### Turn-scoping tradeoff in `matchedClaimTypes`/`evidenceGuidance`
**What:** both fields reflect only the current turn's `newStoryText`; a caller wanting persistence across turns must retain the last non-empty value itself. Documented, not a bug, but worth knowing before building on top of it.
**Flagged:** Session 9 (`matchedClaimTypes`), inherited by Session 22 (`evidenceGuidance`).
**Status:** open by design, explicitly deferred ("a documented decision for a future session, not solved here").

### Two minor voice-layer quality notes
**What:** (1) a lead-in sometimes previews a question's topic before the fixed question text repeats it, mildly redundant; (2) the model adds generic empathetic phrasing even with no `userStatedTone` given.
**Flagged:** Session 7, from reviewing real proof output.
**Status:** open, minor, explicitly "worth refining... not disqualifying."

### One real merge-rule UX tension, surfaced not fixed
**What:** in the Session 9 proof, turn 4's voice layer said "you haven't filed... yet" in the same turn the user's own text said they had — correct per the never-overwrite merge rule, but reads oddly.
**Flagged:** Session 9.
**Status:** open, "worth a future session's attention."

### CanLII research-guidance feature — planned, not started
**What:** a static, educational feature teaching users how to research case law on CanLII themselves — what a neutral citation is, how to use the "citing documents" view, and how to check whether a decision has since been treated negatively (overturned, distinguished, not followed) — deliberately scoped to teaching the skill, never to generating a case list, running a search, or otherwise applying CanLII results to a user's specific facts (that would cross the "who does the applying" line in `AI_INTAKE_DESIGN.md`/`CLAUDE.md` section 2 from legal information into legal advice). CanLII's no-scraping restriction means any future implementation must link out to CanLII rather than mirror its content.
**Status:** open, filed as a future item this session; no design work, sourcing, or code started.

### Institutional research guidance (written standards + FOI) — designed, not started
**What:** teaches users that institutions (school boards, municipalities/police services, licensed businesses/regulated trades) operate under their own written standards — supervision schedules, procedures, licensing conditions — and how to request internal records under MFIPPA/FIPPA. Same "who does the applying" boundary as the CanLII item above: teaches what typically exists and where/how to find or request it, never asserts what a specific institution's specific document says or whether it was followed. Full design — schema, the three institution categories, the FOI component, how it attaches to `ClaimType`, where it surfaces — is in `docs/RESEARCH_GUIDANCE_DESIGN.md`. This is the second of three pieces of the same research-skills layer; CanLII guidance above is the third. Neither is a separate feature from the other.
**Status:** open. Design spec written this session (`docs/RESEARCH_GUIDANCE_DESIGN.md`); no content sourced, no schema, engine, or UI code written.

### Deadlines and case timeline — designed, not started (three tiers, two statuses)
**What:** full design in `docs/DEADLINE_TRACKING_DESIGN.md`, split into three tiers on purpose because they carry different risk. **Tier 1** (user manually enters a deadline they already know; system stores, displays on a case timeline, and reminds as it approaches) is plain calendar-app functionality — no rule interpretation, no calculation. **Tier 2** (sourced general deadline information surfaced for a procedural stage, e.g. "a Defence is generally due within a set number of days of service, see the official rule") follows the exact same sourced-content pattern as `claimTypes.ts`/`educationTopics.ts` — general information, no computed date. **Tier 3** (system computes a specific deadline from a user-confirmed triggering fact and a stored rule, e.g. a confirmed service date) is an explicit architectural extension of `legal_form_mapping_rules`' existing stage-gating/fact-conditions/confirm-before-surface pattern (cited to exact files and lines in the design doc, §4), built around a confirm-before-track requirement: the system never asserts a computed deadline as reliable before the user confirms both the triggering date and the rule's fit to their situation.
**Why tier 3 is gated separately:** correct deadline arithmetic depends on the exact counting method per rule (calendar vs. business days, holiday exclusion, whether the clock starts the triggering day or the day after), and these differ across contexts within Small Claims procedure itself — get this wrong and the failure mode is a specific, confidently-tracked date that's silently incorrect, not a vague or incomplete answer. The design doc (§5.5–§5.6) names this as the single best candidate for the site owner's eventual licensee review, because it's a narrow, answerable-in-one-sitting technical question per rule, not a general product review.
**Status:** open. Design spec written this session (`docs/DEADLINE_TRACKING_DESIGN.md`); no content sourced, no schema, engine, or UI code written. **Tiers 1 and 2 are buildable now** — nothing blocks starting either. **Tier 3 is gated**: it must not ship until a licensee has independently verified the counting method (calendar/business days, holiday treatment, clock-start convention) for each specific rule it computes from, separately from ordinary content-sourcing review.

### Statement of Claim drafting (not form-filling) — first version built, one claim type
**What it actually is:** a drafting feature, not a form-filler. It takes the user's own story and specifics already captured in intake and writes them into the prose structure a Statement of Claim requires: numbered particulars, formal court-document language. The user then reviews, edits, and approves the draft before it's used. This is a different mechanism from `/api/generate-form` (the real PDF-filling engine — AcroForm field-fill or coordinate-overlay onto an official PDF, no prose generation) and should not be described in those terms.
**The boundary, checked against CLAUDE.md's "who does the applying" test:** the system organizes and formalizes facts the user already stated into correct court-document structure and language — that's legal information/formatting, not legal advice. It does not supply legal characterization the user didn't provide. The claim-type label comes from `claimTypeMatcher.ts`'s existing deterministic result, read, never argued for. The review-and-approve step is CLAUDE.md section 4's "suggest, never decide" principle applied to a full document — every draft's own header/footer states plainly it's a proposal, not ready to file.
**`claimDraftEngine.ts` assessed and set aside, not built on:** read in full this session. Its `numberedClaimFacts` mechanism naively numbers raw sentences with no legal structure, and it reads the *static form's* `ClaimDraftInput` shape (`yourName`/`otherParty`/`facts`/`extra`), not the guided-intake pipeline's `IntakeFacts`/`SmallClaimsIntelligenceInput` shape this feature needed. It **is** reachable from a live page (`app/builder/page.tsx:31,614`, a wired button in the static-form flow) — correcting this file's own earlier "not assessed" note. `d1fa87c` cleanly removed exactly its defence-risk/judge-concern content (19 lines, confirmed against the diff); nothing prohibited remains in it. Left alone rather than extended; the new feature is a separate file.
**Built:** `src/lib/case-system/statementOfClaimDraftEngine.ts` — `draftStatementOfClaimParticulars(input: SmallClaimsIntelligenceInput, matchedClaimType)`, a **pure, deterministic, no-AI function** (a template, not an LLM call — the only design that can honestly guarantee it never invents a date/amount/name/detail, since a sanitizer only blocks case-strength *language*, not fabricated *facts*). Produces numbered PARTIES / NATURE OF THE CLAIM / FACTS / AMOUNT CLAIMED particulars plus a fixed, non-case-specific RELIEF SOUGHT, with `[... to be confirmed]` placeholders for anything the guided-intake pipeline genuinely doesn't collect (name, address — confirmed structurally absent from `IntakeFacts`, not a bug). User prose is kept verbatim, never paraphrased into third person (a deliberate, documented choice — first/third-person conversion by regex is a real source of silently-wrong output). Output is passed through `caseStrengthLanguageValidator`'s existing `sanitizeCognitionOutput()` before returning, per the hard constraint — no second validator built.
**Verified against real fixture output, line by line, not summarized:** ran all three unpaid-invoice fixtures (all three independently matched `sc-claim-unpaid-debt-services` by the real pipeline) through a new `scripts/verification/runFixtureDrafts.ts` harness (reuses `pipelineRunner.ts`, writes `.draft.md` per fixture, same convention as `.actual.md`, deliberately a separate script so the CI-wired `test:fixtures`/`runFixtures.ts` is untouched). Checked every numbered particular in all three drafts against that fixture's own `facts`/`timeline`/`amountClaimed`/`goal` text: **zero invented dates, amounts, names, or details found** — every substantive word traces verbatim to intake, including the gap fixture correctly preserving "I don't remember the exact date" rather than inventing one. One real, minor defect found and reported rather than hidden: the sentence-splitter doesn't know "Co." is an abbreviation, so `unpaidInvoiceClean.draft.md` splits "Cedar & Co. never paid me anything" into two particulars at the abbreviation's period — words are still exact and nothing is added, but the split reads oddly; worth a follow-up fix to the splitter, not a content-safety issue.
**Broader context, filed here but out of scope for this item:** the site owner described this drafting piece as one component of a larger intended capability — arranging evidence, statements, witnesses, and other court-package components together, not just one document. That's a separate, larger design conversation for later.
**Status:** open. First working version built and fixture-verified this session, scoped to `sc-claim-unpaid-debt-services` only — not wired into any live page (`app/forms`/`app/builder`) yet, deliberately, per this session's scope; not tested against any other claim type's facts; the sentence-splitter's abbreviation bug is unfixed. Next steps: fix the splitter, verify against other claim types' fixtures, then wire into a real UI surface as a separate, later piece of work.

### Statement of Claim readiness gate — designed, not built
**What:** the gate that decides when `statementOfClaimDraftEngine.ts` (built and fixture-verified, currently wired to nothing) becomes reachable by a user. Full design in `docs/STATEMENT_OF_CLAIM_READINESS_DESIGN.md`. Requirement from the site owner: available once the case file is *genuinely complete* — story and evidence entered, court type selected, remedy chosen, legal basis established — explicitly not "intake finished."
**The finding that shaped it, checked before designing rather than assumed:** the brief asked for a gate deriving from the matched claim type's own `plaintiffElements` so it works for claim type 23 and claim type 50 alike. That structure supports *half* of what a fully automatic gate needs. It carries `name`, sourced `plainExplanation`, and `evidenceCategories` per element, so a gate can enumerate what a claim type calls for entirely from data — the no-hardcoded-list requirement is satisfiable. But **there is no machine-readable link between a `PlaintiffElement` and any captured intake field** (confirmed by search: no `elementId`/`plaintiffElementId`/`element_id` anywhere in `src/lib/case-system/evidence*` or `intake`). The system can derive what a claim type calls for; it cannot derive whether the user supplied it. **That is the right constraint, not an obstacle** — any automatic "has the user satisfied element X?" check would be the system applying a legal test to the user's facts, which CLAUDE.md section 2 forbids. The bridge is a per-element user attestation: the system derives and presents, the user answers. The spec recommends **against** adding the linkage schema, with reasoning (it would need authoring for every element of every claim type — ~150 scenarios in the taxonomy roadmap — reintroducing the per-claim-type maintenance burden the derived design exists to avoid, and would still only prove a field is non-empty).
**Six decisions made with reasoning, summarized:** (1) "evidence entered" cannot mean files uploaded — `guidedIntakeToSmallClaimsInput.ts:136` sets `uploadedEvidenceFiles: []` because guided mode has no upload capability at all, so a file threshold would make the gate permanently unreachable for the largest intended audience; defined instead as an explicit recorded state per element. (2) Remedy is seeded from the claim type's own `remedies` field but **confirmed by the user**, never silently inferred, per section 4 — it appears in the draft's RELIEF SOUGHT and would otherwise be attributed to the user in a court document they never chose it for. (3) The confirmed claim type alone establishes legal basis — it is already the user's own selection after an explicit confirm/reject, and requiring anything further would mean the system evaluating whether their chosen basis fits their facts. (4) **The hard one** — a three-state model (*provided* / *cannot provide* / *not yet*) where only *not yet* holds the gate, argued at length against the real counter-case; "cannot provide" is a first-class terminal state because a strict gate traps permanently exactly the users least able to get help elsewhere, and the engine's existing placeholder mechanism (`[... to be confirmed]` plus the `missingParticulars` checklist) already makes a partial draft safe by construction. (5) Gate-not-met copy names what is outstanding in the claim type's *own sourced words* ("claims like this one generally involve showing X"), never characterizing the user's position ("you don't have enough to prove X") — with an explicit permitted/prohibited table, and counting allowed but any readiness *percentage* or score prohibited under section 3. (6) Follows the forms page's **verified-form confirmation pattern** (`app/forms/page.tsx:848+`) rather than inventing a third — its existing gate ("we only show a recommendation after every applicable answer is explicit and verified") is almost word-for-word what this needs, and it already persists confirmations against the case, which a multi-item gate revisited over time requires. The classifier's inline suggestion pattern is kept for the single in-flow remedy confirmation.
**On the known plaintiff name/address gap:** **not a blocker.** The engine's `MISSING_PLAINTIFF_NAME`/`MISSING_PLAINTIFF_ADDRESS` placeholders exist precisely because those fields are structurally absent from `IntakeFacts` — designed for, not overlooked. They are administrative rather than substantive (the user knows their own name), so blocking the whole feature on two data-entry fields would invert the priority. Ship the gate independently; when the intake questions are added the placeholders simply stop appearing, with no gate logic change. It **is** a blocker for *filing*, and the spec keeps those two things separate.
**Status:** open. Design spec written this session; **no code written or changed**. Three open questions left for the site owner rather than silently decided (whether "cannot provide" should be reversible — spec assumes yes; whether a draft should be available at all where no claim type matched — spec says no but flags that this recreates the same trap in a different form; whether approving a draft persists an approval record). Should be built alongside or after verifying the engine against a claim type other than `sc-claim-unpaid-debt-services`, which is the only one its three fixtures exercise.

### Courthouse tracking — designed, not started, buildable now
**What:** lets the site remember which specific courthouse applies to a user's case, once the user has found it themselves. Full design in `docs/COURTHOUSE_TRACKING_DESIGN.md`. The model: neither `ontariocourts.ca/ocj/court-locations/` nor `ontario.ca/locations/courts/` exposes a public API for jurisdiction lookup (confirmed this session — the first is informational-only, the second is a real search UI with no programmatic endpoint), so the site links the user to Ontario's real locator, the user does the lookup there, and confirms back a courthouse name and address, which the site stores against the case and reuses (e.g. as a better-sourced replacement for the free-text `courtLocation`/`city` value `app/api/generate-form/route.ts`'s `getCaseValues()` already reads onto every generated form). Same confirm-before-track posture as Tier 3 of the deadlines design above, but with no computed fact and therefore no licensee gate — the system never determines jurisdiction, it only records what the user already found and typed.
**Correction, checked before designing:** the request framed this as pairing with "the 'Find your courthouse' link just added" — searched first, and no such link exists anywhere in this codebase. Flagged plainly in the design doc's own §1 rather than designed around silently; the spec names candidate placements for both the link and the confirmation step together instead of assuming a fixed slot next to something already built.
**Also flagged, not scoped:** `ontario.ca/locations/courts/` separately publishes a static A-Z index of courthouse name/address pairs (confirmed live this session), which could seed a future self-hosted courthouse directory — named as a real future data source in the design doc's §7, explicitly not built or scoped this session.
**Status:** open. Design spec written this session (`docs/COURTHOUSE_TRACKING_DESIGN.md`); no schema, engine, or UI code written. Buildable now — no gate, unlike Deadline Tracking's Tier 3.

## 3. Feature parity — guided mode vs. the static form

Both call into the same content (`questionBank.ts`, `claimTypes.ts`), but the two paths have meaningfully diverged.

**Guided mode has, the form doesn't:**
- Real-time claim-type matching and evidence-gap guidance (Sessions 22–23) — the form never calls `orchestrateIntakeTurn`, so `matchClaimType`/`detectEvidenceGaps` never run for it.
- `possibleCorrections` detection (a direct, confident contradiction of an already-confirmed fact, Session 10) — the form has no equivalent.
- AI-composed voice-layer lead-ins around each question.
- A safety check that runs on every free-text turn, not just once at the end.

**The form has, guided mode doesn't:**
- Tier 1 (`why`/`sourceUrl`) and Tier 2 (AI "explain it") field help (Session 15) — see §2, this is guided mode's most concrete gap.
- Evidence file upload and description.
- Party/service detail fields (addresses, phone, email, service details) and the "optional details for specific case types" section — `questionBank.ts`'s 15 questions are narrower than the form's ~25 fields.
- A completed result that actually goes somewhere (`AnalysisResult`, case save, document drafts, dashboard) — see §2, guided mode's biggest gap.
- A dedicated sign-in banner/link on an auth failure, rather than a generic error string.

**A third, easy-to-miss surface:** `SmallClaimsIntake.tsx` also embeds its own `GuidedIntakeQuestion` mini-widget — a deterministic-only (no AI, no voice layer) walk through `QUESTION_BANK` via `selectQuestions()`, with answers manually mapped to form fields by a hand-written `switch` statement in `handleGuidedAnswer()`. This is a **third, independent intake mechanism**, distinct from both the full form and the real `GuidedSmallClaimsIntake.tsx` chat — worth knowing about before assuming "guided" only ever means the chat component.

## 4. Sourcing: permanently closed vs. still open

**Permanently closed** (a session explicitly said don't re-attempt, or the source structurally cannot exist):
- General negligence elements / general breach-of-contract elements — no self-help-guide page on any of the three approved domains states a general elements framework; what exists is individual case law, which the sourcing rule excludes by design. Not "not found yet" — this kind of source doesn't exist on these domains.
- Vehicle accident property damage as a `ClaimType` — cut twice (Session 2, Session 18/20), explicit "not re-attempted a third time" with the reasoning logged in `claimTypes.ts`'s own header.
- A single province-wide child-protection phone number — Ontario's own guidance affirmatively states there is no such number (directs to local Children's Aid Societies instead). Confirmed absence, not an unconfirmed gap.

**Still open and re-attemptable:**
- The `mitigation` defence concept (no source found across 3 domains, but no "stop trying" note was ever attached — explicitly "add it back if a future session finds an actual page").
- A general/national (988-style) crisis line for `safetyPass.ts`'s `IMMEDIATE_DANGER_MESSAGE` — checked directly, not found, but crisis-line offerings can change; worth a periodic re-check rather than a permanent no.
- Family Court Support Worker Program / Family Law Information Centre phone numbers — likely genuinely correct that none exists (locally delivered programs), but that needs a human reviewer's confirmation, not more searching.
- Debt collection agency harassment as Small Claims content — real ontario.ca sourcing exists, but as a *defendant consideration* on the existing unpaid-debt claim type, not its own `ClaimType` (no independent monetary claim to attach one to).
- The exact LTB/Small-Claims jurisdictional cutoff for a former tenant — still unsourced, but no session has declared this permanently closed the way vehicle-accident was.

---

*Cross-reference: `docs/AI_INTAKE_DESIGN.md`'s "Open questions" section (written when only the LTB item existed) now points here for current status rather than duplicating it.*
