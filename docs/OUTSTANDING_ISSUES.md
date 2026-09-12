# CourtSimplified — outstanding issues register

Everything found and not yet fixed, as of this session. Ordered by what actually matters, not by when it was discovered.

**How to read this:** each item states what's wrong, where it was found, and why it matters. Items marked ⚠️ can produce wrong information for a real user. Items marked 🔒 are security or privacy. Items marked ✅ were raised and investigated and **did not hold** — kept, not deleted, so the same surface reading doesn't re-raise them. Items marked 📌 are observations about the process rather than defects. Everything else is incomplete rather than broken.

---

## 1. Defects that could mislead a user

**Every item in this section is now closed.** Kept with outcomes rather than deleted, because two of them were misdescribed and one was a rumour that turned out to be true — that record is worth more than a clean slate.

### ✅ `twentyDaysElapsed` — FIXED (`3fdccdc`)
The fact-gate held an AI-inferred conclusion that a legal deadline had passed. Removed from the gate, from `KNOWN_FACT_FIELDS`, and from both extraction prompts; the question now asks for the service date and method and states the rule so the user applies it. **One correction to the original finding:** "mail or courier service isn't effective until the fifth day" is true of documents generally (r. 8.07(2), r. 8.07.1(2)) but **not of claims** — r. 8.07(3) and r. 8.07.1(3) expressly exclude a claim served under r. 8.03(7), and r. 8.03(8) makes that service effective on the date a signature verifies receipt. The deemed-service/r. 3.01 composition gap is real and still needs a licensee; it is recorded in the content rather than guessed.

### ✅ `defence-set-off-or-counterclaim` — FIXED (`3fdccdc`)
Now states it may be **issued** within 20 days after the day the defence is filed (r. 10.01(2)(a)), that issuing and filing are distinct, and the outer bound the entry had omitted: with leave, before trial or default judgment (r. 10.01(2)(b)). Re-sourced from an ontario.ca guide page to the regulation.

### ✅ r. 8.01(2) six-month service deadline — FIXED (`3fdccdc`)
Added as education topic `sc-topic-six-month-service-window`, gated on `claimFiled == true`. Placed there rather than as 22 duplicate `proceduralNotes` because it is not claim-type specific. Records that the Rules prescribe **no** method for computing a period expressed in months, rather than inferring one.

### ✅ Causation elements — WAS ALREADY FIXED; the register was stale
**This was not a defect when reported here.** Commit `c5cefe1` had already extended both `causation-vehicle-accident` and `causation-property-in-care` with the factual "but for" branch, sourced to Clements with paragraph-level pinpoints (paras. 8 and 9) on both claim types. Verified directly in Session 48 — no fix was needed and none was invented.

### ✅ `outOfScopeForums.ts` — FIXED (`0791237`)
Confirmed live and user-facing (`courtPathClassifier.ts` → `/api/classify-court-path` → `HomeLocationGate.tsx` renders `redirectMessage`). Six forums sourced to the provision conferring the jurisdiction — LTB (RTA s.3(1), s.168(2)), HRTO (Human Rights Code s.34), WSIAT (WSIA s.123(1)), CAT (Condominium Act s.1.36), LAT (Insurance Act s.280), Divisional Court (JRPA s.6). Three had the jurisdictional assertion **removed** instead: SBT (constituting Act not retrieved), IRB (federal, outside the acceptable-source domains), criminal (made no jurisdictional claim to begin with). **A real defect surfaced while sourcing CAT:** s.1.36(4) excludes lien disputes under s.85/86 and title disputes, so the old message would have wrongly redirected the unpaid-common-expenses claim type this repo already carries.

### ✅ The leave requirement — CONFIRMED, and the content gap FIXED (`56de7ec`)
The rumour was accurate, including the date. **CJA s.23(1.1)**, added by 2023, c. 12, Sched. 3, s. 1, in force **01/07/2024**: an action within Small Claims Court's jurisdiction shall not be commenced in the Superior Court except with leave. **s.23(1.2)** excepts a counterclaim, crossclaim or third-party claim where the main action was already in the Superior Court. `courtPathClassifier.ts` was checked and **does not** imply a free election — it never mentions the Superior Court, and both places that route users there concern claims *over* the limit. So the defect was omission, not error. Now stated in `sc-topic-monetary-limit`; confirmation recorded in `SOURCING_NOTES.md`.

---

## 2. Security and privacy

### ✅ `app/api/ai-case-partner/route.ts` — "cross-user data exposure" — RAISED, INVESTIGATED, DID NOT HOLD
**Found:** Codex review. **Investigated and corrected:** verification session, 2026-09-12.

**Kept deliberately rather than deleted, so nobody re-raises it from the same surface reading.**

The original entry read: *"Accepts a `caseId` and sensitive case context with no per-user authentication and no ownership verification. Potential cross-user data exposure. Highest-urgency item on this list."*

**The two literal facts are true: there is no authentication, and there is no ownership check.** The conclusion drawn from them is not.

- `runAiCasePartnerGateway` is a **synchronous pure function**. The entire `src/lib/case-system/ai-case-partner/` directory has **zero database access** — no Supabase client, no service-role key, no `fetch`, no OpenAI call. Grepped across the whole directory, not inferred.
- `caseId` is passed in and **only ever echoed back as a label**, into `createEmptyMemory(caseId)` in `conversationMemoryEngine.ts`. It is never used to look anything up.
- All case context arrives **in the request body**, from a client that loaded it through an authenticated path (`CourtAssistantChat.tsx:866` sends `caseMemory` containing `caseData`, `masterResult`, `evidenceData`, `strategyData`). Passing another user's `caseId` returns analysis of **the caller's own submitted text** with that id echoed back.
- `middleware.ts:70-79` gates **every** request including `/api/*` behind the `cs_site_access` cookie, with an explicit comment that API routes are deliberately not excluded *"an API route reachable without the gate would let someone bypass it entirely by calling the API directly."* Only `/site-access` and `/api/site-access` are exempt.

**There is no ownership check because there is nothing to own-check — the route reads no case data.** There is no cross-user exposure path.

**Adding auth here is a product decision, not a patch.** Neither live caller sends an `Authorization` header — `CourtAssistantChat.tsx` sends only `Content-Type`, and `/ai-test` sends no `caseId` at all (`mode: "sandbox-test"`). Adding a 401 breaks both immediately, and `INTAKE_STATUS.md` already records guest builder access as an accepted tradeoff. That is a decision about who the builder chat is for, not a security fix to apply quietly.

**If that decision is ever made, the model to follow is `app/api/cases/form-applicability/route.ts:158-164`** — `getAuthenticatedUser` then `getAuthenticatedOwnedCase`. Do not invent a second approach. (`getAuthenticatedUser`'s own doc: it *"never accepts a user id supplied in a request body or query string as proof of identity."*)

**Test gap, real and worth recording:** `verifyAiCasePartnerContext.mjs` exercises this route but **asserts nothing about auth or ownership** — its only 401 assertion is against case *storage*. So if auth is ever added, no existing test would catch a regression that removed it again.

### 🔒 Unbounded request payloads
**Found:** Codex review. **Confirmed** in the same verification session — this is the part of the original finding that is real.

- **`ai-case-partner`** accepts `caseMemory?: unknown` with **no validation and no size cap**, and passes it straight to `estimateJsonSize()`, which runs `JSON.stringify` over it. `sanitizeConversation` properly bounds the conversation (20 messages × 6,000 chars); `caseMemory` is bounded by nothing. **Nine routes define a `MAX_*_BYTES` cap; this one doesn't.**
- **`evidence-praser`** (yes — the directory name is misspelled) does `await file.text()` on an uploaded file with **no limit**, then runs a global regex over the whole string.

**Resource-exhaustion risk, behind the password gate. Not confidentiality** — `evidence-praser` parses only what the caller uploaded and hands it back; it takes no `caseId` and touches no database.

### 🔒 Eleven of 25 API routes have no authentication
**Found:** route-by-route survey, same verification session.

`ai-case-partner`, `evidence-praser`, `admin/scan-pdf-fields`, `classify-court-path`, `document-export`, `form-rules`, `rule-engine`, `rules/evidence`, `rules/issues`, `rules/procedures`, `scan-form-fields`.

**`admin/scan-pdf-fields` is the one worth looking at first**, because it sits under `/admin` and carries no auth at all. The rest are largely stateless utility or content routes, but none has been individually assessed.

All of them sit behind the `cs_site_access` gate, which is a real mitigation and not a substitute for per-route authorization where a route touches user data.

### 📌 A finding about findings
**Recorded because it should change how the next external review is weighed.**

The `ai-case-partner` entry above came from an external reviewer reading **one route file in isolation**. Refuting it required reading **three others** — the gateway (to establish there is no database access), `conversationMemoryEngine.ts` (to establish `caseId` is only echoed), and `middleware.ts` (to establish the gate covers `/api/*`).

The reviewer's two literal observations were correct. The severity conclusion was wrong, and it was wrong in the direction that produces urgent-looking work that isn't needed — it sat at the top of this register's suggested order.

**The lesson is not that external review is unreliable.** It surfaced a genuine unbounded-payload issue and a genuine no-auth inventory in the same pass. It is that **a finding about what a route *exposes* cannot be verified from the route file alone** — it needs the call graph and the middleware. Treat single-file severity claims as leads to verify, not conclusions to schedule.

---

## 3. Safety-boundary violations the §3 cleanup missed

### ✅ `app/api/case-summary/route.ts` + dashboard readiness score — BOTH RESOLVED
**Found:** Codex review. **Investigated, and the finding was half right.**

The report bundled two things as one. They were **unconnected systems** — no data path ran between them — and that mattered:

- **The dashboard readiness score was the real, live violation.** Displayed as "Readiness score: N/100", and **three** formulas fed it, all subtracting for risk, which CLAUDE.md §3 prohibits by name. Fixed in `dc3934c`: every subtraction deleted, the score replaced with a factual section count ("4 of 9 sections have information recorded"), and `readinessTone()`'s red/amber/green bar removed — a traffic light grades the case whatever the number behind it.
- **The route did emit that content, but had zero callers**, so nothing reached a user. Codex's claim that this was "a spot the sweep didn't reach" was **wrong**: `6129abd`'s own message calls it "the now-dead ... case-summary API route" and its diff edits the block directly above `evidenceStrengths`. It was seen and deprioritised, not missed. Resolved in `901716e` by deleting the route.

### The content audit was never seen
A read-and-report audit of all sourced content — name-vs-text mismatches, citations that don't cover their claim, missing scope limits, entries now citable to better sources — was commissioned. **The results never arrived** (the paste came through empty). It may have run. Worth re-running or locating.

---

## 4. Content gaps now closeable

26 judgments sit in `docs/sources/`. **Seven have now been used** (Garland, Red Deer College, Clements, Grant v. Torstar, Hill, Waldick, Machtinger, Honda) — this section previously said three, and was stale by four commits.

| Gap | Source available | Notes |
|---|---|---|
| ~~Defamation~~ | Grant v. Torstar, Hill | ✅ **DONE** in `d4a6fab` — responsible-communication defence (Torstar paras. 96-98, 126) added as a defendantConsideration; Hill para. 164 (general damages presumed from publication) and para. 137 (declining the U.S. "actual malice" standard) as a proceduralNote |
| ~~Occupiers' liability~~ | Waldick v. Malcolm | ✅ **DONE** in `b8931e6` — standard of care on snow/ice, the local-custom holding, and s.4(1) volenti as a defendantConsideration |
| ~~Employment — reasonable notice~~ | Machtinger, Honda | ✅ **DONE** in `69c7e93` — Honda para. 50 and the Bardal factors; Machtinger's void-termination-clause holding; plus ESA s.97(2), which bars a civil wrongful-dismissal action once an ESA complaint is filed |
| **Gift vs. loan** | ~~Pecore v. Pecore~~ | ❌ **THIS ROW WAS WRONG.** "Reopens now" contradicts an explicit, reasoned rejection in `CONTENT_AUDIT.md`, which read Pecore in full and said "do not cite Pecore here". Re-verified in Session 48 against the judgment: Pecore is about the **presumption of resulting trust in gratuitous transfers** (a father placing assets in joint accounts with his daughter), i.e. gift vs. resulting trust — who holds beneficial title to transferred property. That is a different question from gift vs. loan, which is whether a **repayment obligation** exists. A loan is neither a gift nor a resulting trust; it is a debt created by agreement. The gap stays open and Pecore does not close it. |
| Duty of care framework | Cooper v. Hobart | — |
| Standard of care | Ryan v. Victoria | — |
| School supervision | Myers v. Peel | Unbuilt claim type, roadmap Batch 3 |
| Employment — reasonable notice | Bardal, Machtinger, Honda v. Keays | Existing entries source ESA minimums only, which are a floor |
| Contract cluster | Sattva, Bhasin, Callow, Fidler, Tercon, Uber v. Heller, Cognos | Largest category, thinnest foundation |
| Limitations — discoverability | Grant Thornton, Pioneer v. Godfrey | — |

**Not closeable:** bailment's reversed onus. Ferguson and Punch are Ontario decisions; CanLII blocks retrieval and the SCC site doesn't carry them. The claim type correctly says it isn't asserting the doctrine.

**Still unsourced:** breach of contract elements. No single leading case exists — formation is textbook law. This is why it keeps getting cut, and no download fixes it.

### CJA sections identified but not sourced
ss. 23 (jurisdiction), 25 (summary hearings), 26 (representation), 27 (evidence — relaxed in Small Claims), 28 (instalment orders), **29 (limit on costs)**, 31 (appeals). Also 17, 19 (appeal routing), 21.11 (venue).

s. 29 matters most: "what does this cost me if I lose" is the question self-represented people most need answered, and there's a statutory cap.

---

## 5. Built but unreachable

- **Statement of Claim engine** — works, tested, wired to nothing. Two specs now exist (readiness gate, intake depth). Neither built.
- **Defendant-response questions** — committed with uncertain provenance, structurally verified, never run end to end. Every one of the 19 survey stories was a plaintiff.
- **Guided intake collects no name or address** — structurally absent from `IntakeFacts`. Not a gate blocker; is a filing blocker.

---

## 6. Designed, not built

- Deadline tracking, tiers 1 and 2 (`DEADLINE_TRACKING_DESIGN.md`)
- Courthouse tracking (`COURTHOUSE_TRACKING_DESIGN.md`)
- Institutional research guidance / FOI (`RESEARCH_GUIDANCE_DESIGN.md`)
- CanLII research guide (filed in `INTAKE_STATUS.md`)
- Statement of Claim readiness gate
- Claim-type intake depth

---

## 7. Review backlog

**Everything is `status: "draft"`.** 22 claim types, 8 education topics, 6 defence concepts, 3 jurisdiction routes. None reviewed by anyone.

The DEFENCE_CONCEPTS entries are live in front of users and have never had a review pass. `familySafetyResources.ts` is fixed but still draft and still dormant.

This is the item that grows with every session of content work, and the only one that can't be closed by building.

---

## 8. Repo hygiene

- ⏸️ `PROJECT_DOCUMENTATION/` — **scanned clean, awaiting a decision.** 31 files, 689 KB (23 `.md`, 7 `.csv`, 1 `.json`), still gitignored at `.gitignore:156`. Scanned in Session 48 for secrets (API key, JWT, `service_role`, private key, password patterns) and personal data (emails, phone numbers, postal codes): **zero matches of either.** Content is Ontario court form provenance, routing and certification research built from public sources. It is safe to commit; whether 689 KB belongs in permanent git history is the site owner's call, not a hygiene cleanup. An off-repo backup exists (taken alongside the `npm run snapshot` fix).
- ✅ `repomix-output.xml` — **done.** The register said it "should be gitignored"; it already was, at `.gitignore:171`, and was never tracked. Only the 7.5 MB local artifact needed deleting, and it is regenerable.
- ✅ `cs-context.txt` — **deleted** (`17d5135`).
- ✅ Duplicate JSON snapshots — **deduplicated** (`17d5135`). Confirmed **byte-identical** by matching MD5 and by `cmp` reporting no differences, not by file size alone. Kept the earlier capture; removed the redundant re-run and the stale line in `COURTSIMPLIFIED_MASTER_BLUEPRINT.md`'s file listing.
- ⏸️ `/family/ontario` and `/ontario-civil` — **reported, not acted on.** Both exist and build (260 and 237 lines), are linked from nowhere, and contain **zero** sourced legal links (`sourceUrl`/`officialUrl`/`ontario.ca` all absent). That makes deletion low-risk on the sourcing side, but they are still whole pages and removal is the site owner's call. Recommendation: delete rather than relink — unreachable marketing-style pages that carry no citations are a §2 liability if anyone ever links them back in without review.
- `DEADLINE_TRACKING_DESIGN.md` citations into `app/forms/page.tsx` have drifted since the forms-messaging session edited that file
- **46+ commits unpushed**

---

## 9. Accepted limits — not bugs

- Rule 3 fixture, 1 of 50: "delivered" vs "delivery" token mismatch, non-stemmed matching. Deliberate.
- `HomeLocationGate` story-field duplication. Known, deferred.
- Guest safety check on the static form. Deliberate tradeoff — worth reconfirming before a stranger uses the site.

---

## 10. Coverage

22 claim types against ~150 mapped scenarios. Batch 1 has two remaining: unpaid wages / final pay / commissions, and moving company disputes.

`jurisdictionRoutes.ts` has 3 entries; the roadmap identifies 16 forums that should be recognized. Out-of-scope routing is cheaper than sourced claim types and arguably as valuable — a user told "this belongs at the LTB" has been genuinely helped.

---

## 11. Verification integrity — corrections to this session's own conclusions

📌 Three findings about the tools used to verify work, and two corrections to claims made earlier in this session. Recorded because each one made a piece of evidence look stronger than it was.

### ⚠️ The fixture harness could overwrite good `.actual.md` with degraded output — FIXED (`9c941aa`)

**The original claim was wrong and is corrected here.** `runFixtures.ts:124` was reported as a possibly-unconditional write. It never was: the write is downstream of an `await`ed `runStoryThroughPipeline`, and because the loop had no `try/catch`, a throw genuinely did skip it.

The real defect is narrower and worse. The pipeline **swallows API failures at two sites**, so a 429 does not reliably throw:

- `src/lib/case-system/intake/voiceLayer.ts:166` — catches everything and returns `fellBackToPlainText: true`.
- `src/lib/case-system/intelligence/courtSimplifiedBrain.ts:2027` — catches, logs only `errorName`, returns `null`; at `:2278` that null becomes `buildFallbackCognition()`, substituting canned placeholder prose ("Detailed analysis is not available right now…").

A run degraded that way **completes normally** with a non-null `analysisOutput`, so the harness wrote placeholder text over good fixture output — and nothing in the rendered file recorded it, because `renderActualMarkdown` prints the summaries but never `cognitionMode`, the flag that would have exposed it. Against CLAUDE.md §7's "never quietly let `.actual.md` drift out of sync with `.expected.md`", that is precisely the prohibited drift.

Fixed by `scripts/verification/pipelineGuards.ts` (`withTimeout` + `describeRunDegradation`), with the write now downstream of both. Pinned by `verifyFixtureHarnessGuards.ts`, which was mutation-tested — neutering the guard makes it fail — so it is not a check that cannot fail.

### ⚠️ The interception-measurement harness shared the same blind spot — the `3,2,5,7,5` baseline is unusable

`measureInterceptionRate.ts` caught a throwing journey and continued, contributing **zero interceptions** — indistinguishable from a journey that ran clean. It also had no timeout, and inherited the same silent-degradation hole: a 429 inside the brain's cognition call returns fallback text rather than throwing, so the journey "succeeds".

Both failure modes bias the measured rate **downward**, which is exactly what a successful prompt change is supposed to look like. Any run that brushed the daily quota under-reported and looked like an improvement.

**Consequence:** the `3,2,5,7,5` baseline (mean 4.40, spread 5) **cannot be used as the BEFORE side of any comparison.** It is not known to be wrong, but it is not known to be clean either, and there is no way to tell retroactively which runs were degraded. STEP 1's gate therefore requires a **fresh two-sided measurement** — new BEFORE *and* new AFTER, both under the guarded harness. Do not reuse the old numbers on either side.

Guards added in `bcd1020`; the harness now aborts rather than burning quota producing unusable runs, and writes `NOT A VALID MEASUREMENT` into the report if any journey failed.

### 📌 Request fan-out per journey — derived from the code

Recorded because every cost estimate this session was wrong until it was counted properly.

Per intake turn carrying new text, `orchestrateIntakeTurn.ts` issues:

| Step | Call | When |
|---|---|---|
| `runSafetyPass` | 1 | every turn |
| `extractIntakeFactsWithConfidence` | 1 | every turn |
| `classifyClaimTypeWithAi` | 1 | **only** when `matchClaimType()` finds nothing |
| `composeVoiceTurn` | 1 | only when a next question exists |

**3 logical calls per turn for a matched claim type, 4 for an unmatched one.** At the observed ~11.6 turns per journey, plus exactly one brain cognition call at the end:

| Unit | Logical calls | HTTP requests at the old 3× retry |
|---|---|---|
| One journey (matched) | **~35** | ~105 |
| One journey (unmatched) | ~46 | ~138 |
| Battery block — 16 journeys, 1 run | ~593 | ~1,780 |
| **`--runs=5` block — 80 journey-runs** | **~2,965** | **~8,900** |
| 3-fixture regeneration | ~105 | ~315 |

**Correction: the earlier "~680 requests per run" figure was wrong.** It counted a single pass of 16 journeys and ignored both the `--runs=5` multiplier and the SDK's retry amplification. A `--runs=5` block is roughly **3,000 logical calls**, not 680 — and was up to ~8,900 HTTP requests before `maxRetries: 0` (`d1efdcc`).

Cross-checked against the usage dashboard: 178 complete journeys ran on 2026-09-12 (battery 16, two `--runs=5` blocks at 80 each, 2 defendant journeys) ≈ 6,400 logical calls, against 13,543 observed requests — ≈ 76 requests per journey versus ~35 logical, which is the retry multiplier plus the hung block's two-hour retry storm.

### 📌 All interceptions originate in the brain call, none in the voice layer

Across both of today's blocks (10 runs, 16 journeys each), **all 41 interceptions carried a `cognition.*` context. Not one came from a voice-layer field.**

That is the justification for skipping `composeVoiceTurn` in any measurement design: the harness already discards the generated lead-in (it answers from a fixed dict keyed by question id), and the sanitizer has never caught anything there. Dropping it removes ~11 calls per journey (~35 → ~24) at no measured cost to what the interception count observes.

It also means the measured quantity is produced by **exactly one call per journey** — `runStructuredGptCognition` — which is what makes the frozen-intake replay design (option D) viable at ~1/35 the cost.

### ⚠️ The `maxRetries: 2` default — every call was up to 3 requests — FIXED (`d1efdcc`)

`openai@6.34.0` sets `this.maxRetries = options.maxRetries ?? 2` (`client.js:158`), and its `shouldRetry()` (`client.js:473`) contains:

```js
// Retry on rate limits.
if (response.status === 429) return true;
```

Nine call sites each built their own client with no options, so **every logical call was up to three HTTP requests**, and the request rate **tripled exactly as the daily cap was being reached** — the failure mode accelerated itself.

**Record this so it is never reintroduced: retrying a 429 against a *daily* cap can never succeed.** The quota does not replenish in the seconds between attempts, so a retry can only spend two further requests and deepen the deficit. Now `maxRetries: 0`, set once in `src/lib/case-system/openaiClient.ts`, which is the only place a client may be constructed.

### ⚠️ A full five-and-five block was never affordable in one day — a second reason the baseline is unusable

A full end-to-end five-and-five block is **~5,600 logical calls against a 10,000/day cap** — and was up to ~16,800 HTTP requests under the old retry default. It could not have completed within a single day's quota alongside any other work.

**Therefore the `3,2,5,7,5` baseline was in all likelihood collected across a cap boundary**, with some runs throttled and some not. This is a **second, independent reason it is unusable**, separate from the absorption bias already recorded above: even had failures been counted correctly, the five runs were not drawn under equivalent conditions. Two different defects, same conclusion — discard it and measure both sides fresh.

### 📌 Only one of the three Step 1 fixes is measurable by interception rate

From the per-journey interception data in `_RATE_before.md` and `_RATE_after.md` (10 runs, 41 interceptions):

- **`structuredCaseSummary`** — measurable. 13 of 16 journeys produced at least one, 34 of the 41 interceptions. The highest-yield journeys are C3, A4, A3, A2, C2.
- **`intelligenceSummary`** — **not measurable this way. Zero interceptions in either block.** That is not evidence it is clean: the finding against it was that it opens *"has a potential case against…"*, a phrase deliberately **not on the blocked wordlist**. The sanitizer cannot count what it does not match, so interception rate is structurally blind to this fix. It needs a different check.
- **`ElementProofStatus`** — not measurable at all. It is assigned downstream and never model-generated, so no journey can produce an interception on it. Type-level and static checks already cover it.

**Consequence for the gate:** a five-and-five interception measurement validates Fix 1 only. Do not read a clean result as covering Fixes 2 and 3.

### ⚠️ The §3 cleanup was never completed — the handoff's claim is wrong

**The handoff states that "every risk-weighted score, colour ramp and ordinal grade" was removed. That is not true.** `24e47c3` did this pass for the **element-status schema only**. Five separate instances of the same pattern are still live, and each survived for a different reason. None is caught by the sanitizer.

**1. A fifth score formula — `scoreFromConfidence()` / `buildReadinessScore()`**, `src/lib/case-system/dashboard/dashboardAdapter.ts:130` and `:325`. Converts ordinals to 0–95 numbers and averages **nine** of them, including `proofReadiness`, `credibilityReadiness` and `contradictionReadiness` — case-merits grades. The risk *penalty* was deleted this session (the comment at `:343` records it), but **the score itself survived**. It is user-facing: `app/dashboard/page.tsx:199` filters on `readinessScore >= 80` to show an "export ready" count. It evaded the earlier removal pass purely by being spelled `confidence` rather than `score`.

**2. A live colour ramp — `getReadinessTone()`**, `app/court-package/page.tsx:94`, applied to a card at `:305`. Green when the readiness string contains "ready", amber when it contains "risk", "gap" or "missing". It survived because it keys on **strings**, not a numeric score.

**3. The cognition prompt still asks the model to grade the case.** `claimClassifications[].score` (0–100), `rejectedFalsePositives[].score`, `evidenceIssueLinks[].strength`, `formRecommendations[].confidence`, and — most directly — `evidenceIssueLinks[].explanation`, whose instruction reads: *"Explain why the current proof is weak, developing, or stronger."* The prompt asks for a weakness characterisation in words.

**4. The sanitizer cannot see numbers.** `sanitizeCognitionOutput` (`caseStrengthLanguageValidator.ts:205`) tests `typeof raw === "string"` and returns everything else untouched. `score: 70` passes through entirely unexamined. No wordlist can ever catch it — this is a shape problem, not a vocabulary problem.

**5. `assemblyConfidence` renders `strong` / `moderate` / `weak` on the user's own evidence** — `evidenceAssemblyEngine.ts:26`, rendered at `app/evidence/page.tsx:618` as a badge reading e.g. "WEAK confidence". The computation (`confidenceFor`, `:271`) only counts how many metadata fields were filled — 5+ of 7 → "strong". **It never inspects evidential weight, but the label says it does.** `/evidence` is reachable in one click from the builder's "Organize evidence" button, so this is shipping, not latent.

**The lesson for any future pass:** every one of these evaded a field-name or wordlist check. A grade is a *shape* — an ordinal drawn from a fixed ladder, or a bounded number — and that is what has to be detected. See the structural-check proposal filed with this entry.

### 📌 The OpenAI cap is **not** a project-level RPD override — hypothesis unconfirmed

An earlier conclusion in this session held that the ~100 requests/day ceiling came from a custom project-level rate limit, inferred from a header mismatch (`x-ratelimit-limit-requests: 10000` alongside `remaining-requests` tracking a ~100 scale). **That inference does not hold.** The project rate-limit page lists **TPM and RPM only — there is no RPD row on any model**, and `gpt-4o-mini` inherits org values exactly. There is no project-level override to raise.

**Leading hypothesis, unconfirmed:** ordinary daily consumption against the org-level **10,000 RPD** cap. A single measurement run costs roughly 680 requests (16 journeys × ~11 turns × 3–4 calls/turn), and a three-fixture regeneration roughly 130, so a heavy session can plausibly approach that ceiling.

**Unresolved and not to be papered over:** this does not explain the observed `remaining-requests` going *up* (20 → 75 across ~8 minutes while 5 requests were spent), which suggests a rolling window rather than a fixed daily counter. Two samples cannot characterise it. **Pending evidence: the OpenAI usage page**, which is the only thing that settles actual consumption. Until then, treat the ceiling as real and unexplained rather than diagnosed.

---

## Suggested order

**Before any real user:**
1. ~~`ai-case-partner` auth and ownership~~ — **removed: investigated and did not hold (§2).**
2. ~~The three Small Claims Rules defects~~ — ✅ done, `3fdccdc`.
3. ~~`outOfScopeForums.ts` citations~~ — ✅ done, `0791237`.
4. ~~Causation gap~~ — ✅ was never open; already fixed in `c5cefe1` (§1).
5. ~~The leave requirement~~ — ✅ confirmed and stated, `56de7ec`.
6. ~~Defamation and occupiers' liability from retrieved sources~~ — ✅ done in `d4a6fab` / `b8931e6`.
7. ~~Confirm and fix `case-summary` case-strength content~~ — ✅ done. Dashboard half in `dc3934c`; the route itself deleted in `901716e`.
8. **Walk through the site yourself.** Still hasn't happened. Nothing on this list substitutes for it.
9. `admin/scan-pdf-fields` — assess why an `/admin` route has no auth (§2).
10. Payload caps on `ai-case-partner`'s `caseMemory` and `evidence-praser`'s upload (§2). Nine routes already define `MAX_*_BYTES`; follow that pattern.
11. Push. **50+ commits unpushed.**

**Then:**
12. Build the readiness gate, intake depth, and the unmatched-claim-type path from the specs
13. CJA s. 29 and the Small Claims statutory cluster (see Decisions below)
14. Coverage expansion and out-of-scope routing

**Ongoing, in parallel:** the licensee conversation — it now gates two known items (the deemed-service composition gap in §1, and counting-method verification generally).

---

## Decisions — ALL RESOLVED (Session 48)

All four were delegated and acted on. Kept with outcomes rather than deleted, since two of them turned out to be larger than described.

### ✅ 1. `evidenceStrengths` asymmetry — resolved by deleting the route (`901716e`)
`app/api/case-summary/route.ts` is gone. Reachability re-verified independently: no fetch of the path anywhere, its only export was the Next.js `POST` handler and nothing imported it, and no verification script referenced it — `verifyAiCasePartnerContext.mjs` and `verifyServerAiReasoningContract.ts` both checked by name. The six `"case-summary"` hits prior sessions flagged are confirmed to be an unrelated `documentType` union member. **The asymmetry `6129abd` created dissolves rather than being answered in either direction.** Nothing was orphaned — `runCourtSimplifiedBrain` and `getAuthenticatedUser` both have many other callers. `ARCHITECTURE.md` updated in four places.

### ✅ 2. Latent judge-concern strings — removed (`c5fce59`)
**Three strings, not the two reported.** `Judge concern score` and `Cross-examination risk score` were flagged; `Document readiness impact` (typed `"none" | "minor" | "moderate" | "major" | "severe"`) sat alongside them, came from the same `credibilityRiskEngine`, and is the same kind of grading — removing only the named two would have left the defect under a less obvious label. `exportNotes` and its type are kept; what remains is `proceduralReadinessLabels()`, which states which procedural steps are ready — a fact about the file, not a grade.

### ✅ 3. Orphan routes — deleted (`a8b11ae`)
`/family/ontario` and `/ontario-civil`. Verified first: no link, redirect, rewrite, sitemap or test reference anywhere; `next.config.ts` defines no redirects or rewrites at all and the project has no sitemap route, so nothing 404s that previously resolved. Re-confirmed both carried zero sourced legal links (`ontario.ca`, `sourceUrl`, `officialUrl`, `canlii` all 0). Content recoverable from history if the marketing value matters.

### ✅ 4. `PROJECT_DOCUMENTATION/` — now tracked (`51b41ac`)
Re-scanned rather than trusting the prior session's scan: **0 secret matches, 0 emails, 0 phone numbers, 0 postal codes, 0 SIN-shaped strings, 0 files with real case narrative.** Inventory unchanged (31 files, 689 KB), so nothing had been added in between. **The `.gitignore` change needed care:** the entry was `_PROJECT_REGISTRY/`, which excludes the *directory*, and git cannot re-include a path whose parent directory is excluded — a bare negation would have silently done nothing. Changed to `_PROJECT_REGISTRY/*` plus a negation, and verified with `git check-ignore` that the generated output (`BuildStatus.txt`, `GENERATED_DOCUMENTATION/`) is still ignored.

---

## Superseded — kept for the record

### 1. The `evidenceStrengths` asymmetry
Commit `6129abd` deleted `evidenceWeaknesses` while keeping `evidenceStrengths`, having edited the `missingEvidence` block **directly above it** — so this was seen and kept, not missed. Grading evidence upward is the same operation as grading it downward.

| Option | For | Against |
|---|---|---|
| **Remove `evidenceStrengths` too** | Symmetry with the deletion already made; §3 bars grading, and "strong evidence" is a grade | Loses a signal some users may find reassuring |
| **Restore `evidenceWeaknesses`** | Restores symmetry the other way | Directly contradicts `6129abd`'s reasoning; reintroduces adequacy-graded commentary §3 prohibits |
| **Keep as is, document why** | Least churn | Leaves an unexplained asymmetry for the next reader to trip over |
| **Delete the whole route** | It has zero callers (§3); the question dissolves | Forecloses reviving it later without a rebuild |

**Note:** this lives in `app/api/case-summary/route.ts`, which is **unreachable** — no caller anywhere. So nothing user-facing turns on the answer today.

### 2. CJA ss. 23, 26, 27, 29, 31 — sourcing the statutory cluster
Real work, not a quick fix. **s. 23 is now partly done** (s.23(1) and the s.23(1.1) leave requirement are cited in `sc-topic-monetary-limit`). What I would build, if asked:

- **s. 29 — its own education topic, and the highest value of the five.** "What does this cost me if I lose" is the question self-represented people most need answered, and there is a statutory cap. `r. 19.06`/`19.07` already cite s. 29 from the Rules side; the statute itself is uncited.
- **s. 27 (evidence, relaxed in Small Claims)** — pairs naturally with the existing `sc-topic-burden-of-proof`.
- **s. 26 (representation)** and **s. 31 (appeals)** — each a short topic; s. 31 matters most to someone who has just lost.

Not built this session, as instructed.

### 3. `dashboardAdapter.ts:509-511` — the latent "Judge concern score"
Still present: `` `Judge concern score: ${…}` `` and `` `Cross-examination risk score: ${…}` `` built into `courtPackage.exportNotes`. This is the exact category `d1fa87c` was written to remove.

**Is removing it safe? Yes.** Traced fully: `exportNotes` is parsed into the dashboard model (`dashboardEngine.ts:419`) and typed (`types/case.ts:200`), but the only `.tsx` reference anywhere is `app/dashboard/page.tsx:146`, which sets it to `[]` as a default. **Nothing renders it.** Deleting the two lines removes strings that reach no user and breaks no display.

It was left alone only because it was out of scope for the commit that found it — not because removal is risky.
