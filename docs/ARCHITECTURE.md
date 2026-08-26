# CourtSimplified Architecture Map

Written from a direct audit of the repo on 2026-08-25. This is a map for
orientation, not a spec — when it and the code disagree, trust the code and
update this file.

**⚠ Known risk, documented and not yet fixed — see §10.** There is exactly
one Supabase project ("courtsimplified"), tagged PRODUCTION, free tier, no
dev/staging split. Several test and debug scripts hold real production
database/auth access, including service-role (RLS-bypassing) admin
credentials. Confirmed by the project owner 2026-08-25; deliberately left
unfixed pending a decision — read §10 before adding anything else that
touches Supabase from test or script code.

## 1. The two location gates (read this first — this is the thing that costs hours)

There are **two separate, unrelated components** that ask for province, city,
and story before an intake can start. They look almost identical and use the
same field labels, which is exactly what makes them easy to confuse.

### Gate A — [`app/_components/HomeLocationGate.tsx`](../app/_components/HomeLocationGate.tsx)

- Rendered only on the home page, [`app/page.tsx`](../app/page.tsx) (line 191), inside
  `<Suspense fallback={null}>`. It reads `?path=` from the URL via
  `useSearchParams()` and renders nothing (`return null`) unless `path` is
  present.
- This is what a user hits when they click "Start case" on the home page,
  which links to `/builder?path=X` — but the gate itself lives on `/`, and
  `HomeLocationGate` intercepts before the browser ever navigates there
  (`goToIntake()` calls `router.push` only after the gate is satisfied).
- Continue button: **"Continue to `[Path]` intake"** — [line 219](../app/_components/HomeLocationGate.tsx#L219).
- Before leaving the page, it calls `/api/classify-court-path` with the
  story and the user's declared path. If the classifier disagrees with
  medium-to-high confidence, it shows a "This looks like it may be X, not Y"
  suggestion panel (lines 180–217) that the user must explicitly accept or
  dismiss — it never silently reroutes.
- Also handles a returning user: if a saved draft exists in `localStorage`,
  it offers "Resume saved case" instead of the blank form.

### Gate B — [`app/builder/page.tsx`](../app/builder/page.tsx), `BuilderPageContent` (~line 741)

- Rendered on `/builder` itself, only when `!confirmedLocation` — i.e. only
  when the user arrived at `/builder?path=X` **without** having already
  passed through Gate A and saved a matching draft. In practice that means:
  a bookmark, a shared link, a page refresh, or a direct URL edit.
- Continue button: **"Continue with `[Path]` questions"** — [line 750](../app/builder/page.tsx#L750).
- It does **not** call the classifier — it only unlocks the actual
  court-path-specific intake form (`FamilyIntake` / `SmallClaimsIntake` /
  `CivilIntake`, lines 771–786).
- `confirmedLocation` gets set one of two ways: (a) this gate's own button,
  or (b) a `useEffect` (lines 173–203) that runs on mount and looks for a
  matching saved draft (`loadCompactBuilderDraft`) or guest session
  (`consumeGuestIntakeSession`) — the same mechanism Gate A writes to.

**Why this matters:** if you're debugging "the continue button won't
enable," you have to know *which* gate you're actually looking at. They have
different disabled-expressions, different state variable names
(`province`/`city`/`facts` vs. `intakeProvince`/`intakeCity`/`intakeStory`),
and different button text. A fix applied to the wrong file will look like it
did nothing.

## 2. All routed screens and what renders them

| Route | Component | Notes |
|---|---|---|
| `/` | [`app/page.tsx`](../app/page.tsx) | Marketing/landing home; hosts Gate A |
| `/builder?path=X` | [`app/builder/page.tsx`](../app/builder/page.tsx) → `BuilderPageContent` | Hosts Gate B, then the path-specific intake, then the completed case overview |
| `/family`, `/family/ontario` | [`app/family/page.tsx`](../app/family/page.tsx), [`app/family/ontario/page.tsx`](../app/family/ontario/page.tsx) | Static informational content, links into `/builder?path=family` |
| `/small-claims`, `/ontario-smallclaims` | [`app/small-claims/page.tsx`](../app/small-claims/page.tsx), [`app/ontario-smallclaims/page.tsx`](../app/ontario-smallclaims/page.tsx) | Same pattern for small claims |
| `/civil`, `/ontario-civil` | [`app/civil/page.tsx`](../app/civil/page.tsx), [`app/ontario-civil/page.tsx`](../app/ontario-civil/page.tsx) | Same pattern for civil |
| `/dashboard` | [`app/dashboard/page.tsx`](../app/dashboard/page.tsx) | List of the signed-in user's saved cases (via `dashboardEngine`) |
| `/dashboard/cases/[id]` | [`app/dashboard/cases/[id]/page.tsx`](../app/dashboard/cases/%5Bid%5D/page.tsx) | Single-case workspace: loads the case row from Supabase, shows intake summary, readiness scoring, links into the workflow tools below |
| `/case-dashboard` | [`app/case-dashboard/page.tsx`](../app/case-dashboard/page.tsx) | Older/local-storage-only case dashboard (`caseContextStorage`), separate from the Supabase-backed `/dashboard` |
| `/evidence` | [`app/evidence/page.tsx`](../app/evidence/page.tsx) | Evidence intake and organization (`evidenceEngine`) |
| `/forms` | [`app/forms/page.tsx`](../app/forms/page.tsx) | Official form lookup and recommendations (`formsSelectedCase`) |
| `/document-workspace` | [`app/document-workspace/page.tsx`](../app/document-workspace/page.tsx) | Drafting workspace tied to the case |
| `/court-package` | [`app/court-package/page.tsx`](../app/court-package/page.tsx) | Assembles a court-ready document package |
| `/trial-package` | [`app/trial-package/page.tsx`](../app/trial-package/page.tsx) | Trial-preparation package |
| `/settlement-conference` | [`app/settlement-conference/page.tsx`](../app/settlement-conference/page.tsx) | Settlement-conference prep |
| `/litigation-strategy` | [`app/litigation-strategy/page.tsx`](../app/litigation-strategy/page.tsx) | Strategy report (`litigationStrategyEngine`) |
| `/ai-drafting-assistant` | [`app/ai-drafting-assistant/page.tsx`](../app/ai-drafting-assistant/page.tsx) | AI-assisted drafting actions |
| `/document-export` | [`app/document-export/page.tsx`](../app/document-export/page.tsx) | Final export step |
| `/case-law`, `/legal-principles` | [`app/case-law/page.tsx`](../app/case-law/page.tsx), [`app/legal-principles/page.tsx`](../app/legal-principles/page.tsx) | Static reference content |
| `/login`, `/forgot-password`, `/reset-password` | [`app/login/page.tsx`](../app/login/page.tsx) etc. | Supabase Auth screens |
| `/site-access` | [`app/site-access/page.tsx`](../app/site-access/page.tsx) | The password form for the site-wide gate (§4) |
| `/admin/pdf-field-mapper` | [`app/admin/pdf-field-mapper/page.tsx`](../app/admin/pdf-field-mapper/page.tsx) | Internal tool for mapping PDF form fields |
| `/ai-test` | [`app/ai-test/page.tsx`](../app/ai-test/page.tsx) | Internal AI scratch/test page |

Most of the workflow pages (`evidence`, `forms`, `document-workspace`,
`court-package`, `trial-package`, `settlement-conference`,
`litigation-strategy`, `ai-drafting-assistant`, `document-export`) follow the
same pattern: they read `caseId` and `path` from the query string
(`buildWorkflowHref` in `builder/page.tsx`), load the case via
`workflowCaseLoader` or `caseContextStorage`, and render a `Suspense`
boundary because they all call `useSearchParams()`.

## 3. Which API routes require authentication

The four **analyze** routes share one deliberate pattern: the AI is never
invoked for an anonymous visitor, and the response always says which engine
actually ran.

| Route | Auth check | AI gate | Reports `reasoningMode` |
|---|---|---|---|
| `POST /api/small-claims/analyze` | `getAuthenticatedUser(request)` | `authenticated && hasConfiguredServerAi()` | Yes |
| `POST /api/civil/analyze` | `getAuthenticatedUser(request)` | `authenticated && hasConfiguredServerAi()` | Yes |
| `POST /api/family/analyze` | `getAuthenticatedUser(request)` | `authenticated && hasConfiguredServerAi()` | Yes |
| `POST /api/case-summary` | `getAuthenticatedUser(request)` | `authenticated` only — does **not** call `hasConfiguredServerAi()` before setting `allowExternalCognition` | No (returns `sourceEngine` instead) |

`getAuthenticatedUser` ([`src/lib/supabase/serverAuth.ts`](../src/lib/supabase/serverAuth.ts))
reads the `Authorization: Bearer <token>` header and validates it directly
against Supabase (`supabase.auth.getUser(accessToken)`). It does **not**
trust anything in the request body, a cookie, or `localStorage` — this is
why a client-side-only auth stub cannot satisfy it (see §5 and Task 3).

`hasConfiguredServerAi()` ([`serverAiConfiguration.ts`](../src/lib/case-system/intelligence/serverAiConfiguration.ts))
just checks that `OPENAI_API_KEY` is set server-side. It reveals nothing
about the key itself.

**Worth flagging:** `case-summary`'s omission of the `hasConfiguredServerAi()`
check looks like an inconsistency rather than a deliberate design choice —
worth a decision on whether to align it with the other three.

`classify-court-path` is the only **fully unauthenticated** route among the
ones that do real reasoning — by design, since Gate A calls it for every
visitor, signed in or not, before they've committed to a path. It never
persists anything and is documented in its own file as suggestion-only.

Routes that check auth (via `getAuthenticatedUser`), grep-confirmed:
`api/cases`, `api/cases/[id]/evidence`, `api/cases/form-applicability`,
`api/generate-form`, `api/assistant-chat`, plus the four analyze routes and
`case-summary` above.

Routes with no `getAuthenticatedUser` call (grep-confirmed absent):
`api/classify-court-path`, `api/evidence-praser`, `api/rules/issues`,
`api/rules/evidence`, `api/rules/procedures`, `api/scan-form-fields`,
`api/admin/scan-pdf-fields`, `api/rule-engine`, `api/document-export`,
`api/ai-case-partner`, `api/form-rules`, `api/site-access`. All of these
still sit behind the site-wide password gate in middleware (§4) — that gate
is not a substitute for per-user auth, since the site password is shared by
every visitor, not per-account.

## 4. The site-wide password gate

[`middleware.ts`](../middleware.ts) — a pre-launch gate, unrelated to
per-user Supabase auth.

- Cookie `cs_site_access`; compared against `SITE_ACCESS_PASSWORD`.
- Matches everything except `_next/static`, `_next/image`, `favicon.ico`,
  `robots.txt`, `sitemap.xml` — **deliberately includes `/api/*`**, so an API
  route can't be reached by going around the gate.
- Fails closed: if `SITE_ACCESS_PASSWORD` is unset, every request 401s,
  including `/site-access` itself.
- It replaced HTTP Basic Auth specifically because Basic Auth shares the
  `Authorization` header with real user Bearer tokens, and a browser only
  sends one `Authorization` header — so Basic Auth was silently eating every
  authenticated API call. The cookie lives in a separate channel and can't
  collide with that again (see the comment block at the top of the file for
  the full incident writeup).
- The password itself is never logged; it's only ever the cookie's value,
  `HttpOnly` + `Secure`.

For anything that drives the browser against a real dev server (Playwright,
manual curl testing), the gate cookie must be set first —
[`tests/browser/harness/siteAccess.ts`](../tests/browser/harness/siteAccess.ts)
does this by reading `SITE_ACCESS_PASSWORD` from the environment or
`.env.local` and setting the cookie directly on the browser context.

## 5. Request flow: intake → completed case overview

1. **Entry.** User reaches Gate A (home) or Gate B (`/builder`, cold) and
   confirms Ontario + city + story. `HomeLocationGate` additionally checks
   the story against `/api/classify-court-path` and lets the user accept or
   override a suggested path — see §1.
2. **Draft persistence.** The confirmed `{ courtPath, province, city, facts }`
   is written to `localStorage` (signed-in, via `builderDraftStorage`) or
   `sessionStorage` (guest, via `saveGuestIntakeSession`), and the browser
   navigates to `/builder?path=X`.
3. **Structured intake.** `BuilderPageContent` renders one of
   `FamilyIntake` / `SmallClaimsIntake` / `CivilIntake`
   ([`app/builder/_components/`](../app/builder/_components/)) — each collects the
   path-specific fields (case stage, role, filed documents, issues, amount
   claimed for small claims, etc.) and, on submit, calls the matching
   `/api/{path}/analyze` route with the Supabase session's
   `access_token` as a Bearer header (confirmed in `SmallClaimsIntake.tsx`).
4. **Server analysis.** The analyze route authenticates the request,
   decides `reasoningMode` (`structured-ai` vs. `deterministic-fallback`,
   §3), runs the corresponding intelligence engine, and returns the result
   plus `reasoningMode` and `authenticated`.
5. **`handleComplete()`** stores the result as `analysis`/`caseData` in
   `BuilderPageContent` state, then a `useEffect` (lines 311–478) persists
   it: creates a `cases` row in Supabase if one doesn't exist yet
   (`user_id`, `court_path`, `master_result`), builds a canonical record via
   `buildMasterCaseFromIntake` (`masterCaseOrchestrator.ts`), and writes a
   compact recovery draft to `localStorage`.
6. **Completed case overview.** Once `canonicalIntakeSaved` is true, the
   `data-testid="completed-case-overview"` section renders
   (`app/builder/page.tsx:801`): `IntelligenceOverviewPanel`,
   `ProcedureAuthorityDisplay`, a "what to do next" panel linking into the
   workflow tools (`/evidence`, `/forms`, `/dashboard/cases/[id]`), and,
   once analysis is available, `CourtAssistantChat` for follow-up questions.
7. **Case workspace.** From there, `/dashboard/cases/[id]` is the durable
   home for the case — it reloads the same Supabase row and lets the user
   continue into evidence, forms, drafting, and export.

`masterCaseOrchestrator.ts` and `caseContextEngine.ts` are the shared
case-file model underneath all of this — they normalize whatever the
path-specific intake produced into one `CaseContext`/master-case record that
every downstream workflow page reads from. Neither was read in full for this
map (630 and ~1,900 lines respectively); treat their public exports as the
contract and read into them only as needed for a specific change.

## 6. AI content and the "suggest, don't decide" pattern

Every place this repo puts model output in front of a user is built to be
overridable, not authoritative:

- **Court-path suggestion** (Gate A): shown only as "This looks like it may
  be X" with explicit "Switch" / "Keep" buttons; never auto-navigates.
- **`classify-court-path` route**: its own file comment states it "never
  routes, never persists, and never decides for the user."
- **Analyze routes**: gate real AI reasoning behind `authenticated &&
  hasConfiguredServerAi()` (except `case-summary`, §3) and always report
  which engine ran, so a fallback-engine response is never presented as if
  it were the AI's.
- **Out-of-scope forum suggestion** (added for the LTB fix, §7): shown with
  its own "CourtSimplified doesn't cover this" panel and a "Continue anyway"
  button — never blocks, and the message shown is a fixed, drafted string
  from `outOfScopeForums.ts`, not free-text model output, specifically so an
  AI-generated sentence can never drift into characterizing the user's facts
  as satisfying a forum's legal test.

## 7. Court-path classification: two overlapping type systems, and the out-of-scope fix

**Type-overlap debt (flagged, not resolved):** this codebase has two separate
court-path taxonomies that were never reconciled:

- `CourtPathValue` / `CasePartnerCourtArea` — used by
  [`courtPathClassifier.ts`](../src/lib/case-system/intelligence/courtPathClassifier.ts)
  and the keyword engine underneath it
  ([`conversationIntelligenceEngine.ts`](../src/lib/case-system/ai-case-partner/conversationIntelligenceEngine.ts)).
  Drives the home-gate suggestion (§1) only.
- `IntelligenceCourtPath` — used by
  [`courtSimplifiedBrain.ts`](../src/lib/case-system/intelligence/courtSimplifiedBrain.ts)
  and the `case-summary` route. Already includes `"ltb"`, `"immigration"`,
  `"criminal-related"`, `"tribunal"`, `"unknown"` alongside the three in-scope
  paths, but nothing was found wiring those values to any distinct
  out-of-scope UI — `asCourtPath()`-style coercion functions there just
  sanitize AI output into a stricter enum, they don't route or message
  differently for them.

Neither taxonomy was migrated toward the other in this pass. Extending
`CasePartnerCourtArea` (below) makes the overlap slightly worse, not better —
worth a deliberate decision later on whether these should ever merge, rather
than discovering the duplication by accident.

**Out-of-scope forum fix (2026-08-25 audit; all nine forums built):**
`courtPathClassifier.ts` used to force every story into
`family`/`small-claims`/`civil`/`mixed`/`unknown` — a correctly-detected `ltb`
keyword signal was silently discarded back to `"unknown"` by its own
`asRoutablePath()` helper, and the AI escalation prompt's JSON schema had no
"none of these" option at all. A real landlord-tenant dispute could reach the
user as a false "this looks like Civil" suggestion. LTB was built and proven
first, deliberately, on its own, before the other eight were built on the
same mechanism — that sequencing caught three real bugs the other eight
inherit fixes for (below). Fixed:

- [`outOfScopeForums.ts`](../src/lib/case-system/intelligence/outOfScopeForums.ts)
  (new) — the single file holding every out-of-scope redirect message, each
  explicitly named (`"Landlord and Tenant Board (LTB)"`, never a generic
  "tribunal" label), marked DRAFT pending lawyer/paralegal review. All nine
  forums populated: LTB, HRTO, WSIAT, CAT, Social Benefits Tribunal, LAT,
  Divisional Court, Immigration and Refugee Board, Criminal Court.
- `courtPathClassifier.ts` — `CourtPathClassification.primaryPath` gained an
  `"out-of-scope"` value plus an `outOfScopeForum` field; both the keyword
  stage and the AI escalation prompt can express all nine ids.
- `conversationIntelligenceEngine.ts`'s `CasePartnerCourtArea` and
  `inferCourtArea()` gained keyword signal lists for the six brand-new
  forums (hrto, wsiat, cat, social-benefits-tribunal, lat, divisional-court),
  each a set of whole words or multi-word phrases chosen to avoid the
  substring-collision bug below.

Three real bugs surfaced only by actually proving this, live, not by writing
the code and assuming it worked:

1. **Keyword substring collisions.** `countSignals` does plain
   `.includes()`, so the original `ltb` list's bare `"rent"` matched inside
   `"parent"`/`"different"`/`"currently"`, and bare `"lease"` matched inside
   `"please"`. An adult step-parent adoption story was classified
   out-of-scope `ltb` purely because it said "step-parent" twice —
   confirmed live, not assumed. Same class of bug independently flagged for
   the `criminal-related` list (bare `"police"` firing on "the police were
   called" in an ordinary family story). Fixed by rewriting every list
   (`ltb`, `criminal-related`, `immigration`, and all six new lists) to use
   whole words or multi-word phrases specific enough not to collide with
   unrelated words; bare `"tribunal"` was dropped from `ltb` entirely since
   it isn't LTB-specific and would have collided with every other tribunal's
   own list.
2. **Prompt-calibration ("escape hatch") bug.** The model treated "doesn't
   clearly fit family/small-claims/civil" as evidence FOR an out-of-scope
   forum, rather than as genuine uncertainty — a totally generic,
   content-free story ("Synthetic saved facts for a focused review.") was
   classified out-of-scope `ltb` at 0.9 confidence, reasoning "The story
   does not indicate a specific claim... suggesting it may pertain to
   landlord-tenant issues." Fixed by making `SYSTEM_PROMPT` explicitly
   require affirmative words for each forum, never absence-of-fit; guarded
   permanently by `CLASSIFY-INSUFFICIENT-INFO-GENERIC-001` in
   `scenarioRegistry.ts`.
3. **Model self-consistency bug.** For the Divisional Court escalation
   scenario, the model's own `reasoning` text correctly said "falls under
   divisional court review" while its structured `primaryPath` field
   disagreed (`"civil"`) in 2 of 3 sampled runs — the model wasn't reliably
   translating its own stated conclusion into the structured fields, despite
   `temperature: 0`. This is exactly what the 5-run consistency requirement
   exists to catch. Fixed by adding an explicit instruction that
   `primaryPath`/`outOfScopeForum` must exactly match what `reasoning`
   concludes; confirmed stable across 6 further live runs after the fix.

Proven end to end, not assumed: `scripts/verification/verifyCourtPathClassifier.ts`
asserts both the free keyword-only path and the paid AI-escalated path for
all nine forums (18 scenarios) plus the insufficient-info guard, against
`classificationScenarios` in `scenarioRegistry.ts`, and repeats each 5x
asserting identical routing — confirmed live against the real model
(`RUN_COURT_PATH_CLASSIFIER_AI=1`: 153 assertions, all 18 forum scenarios
stable across 5 runs each), not just offline. A parallel browser-level test,
[`tests/browser/court-path-out-of-scope.spec.ts`](../tests/browser/court-path-out-of-scope.spec.ts)
(parameterized over all nine forums' keyword scenarios, sourced from the same
`scenarioRegistry.ts` so there's one story per forum, not two copies that can
drift apart), proves the actual `HomeLocationGate` UI renders each forum's
message and never blocks the user — run 3x, 27/27 passing each time.

**Logged as follow-ups, not fixed in this pass:**

- `IntelligenceOverviewPanel.tsx` only has bespoke evidence/next-question
  content for defamation and adoption; every other issue type falls through
  to generic `analysis.missingEvidence` / `candidateQuestions[0]`, which is
  why a wrongful-dismissal scenario rendered a completely empty evidence
  card. Commented in place at the relevant code.
- `scenarioRegistry.ts`'s own `expectedNextQuestion` for
  `CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001` is a generic procedural fallback
  ("Has anything already been filed?") rather than reflecting that
  scenario's own `intentionalGaps` (mitigation efforts; the correct
  corporate defendant). Commented in place at the relevant code.
- Genuine mixed in-scope/out-of-scope matters (one story naming both an
  in-scope claim and an out-of-scope one) are not yet built —
  `courtPathClassifier`'s schema has no representation for that combination.

## 8. The 20-test browser regression suite: dark since 2026-08-23, now fixed

`golden-journeys.spec.ts`, `reasoning-contract.spec.ts`, `family-adoption.spec.ts`,
`guest-intake.spec.ts`, and `scroll-positioning.spec.ts` (20 tests total) were
all failing, uniformly timing out waiting for `court-path-location-gate-ready`.
Root-caused via `git log`/`git merge-base` before touching anything, per
explicit instruction not to assume the cause:

- `604d60a` (2026-08-20) was the last commit to touch any of these 5 spec
  files or `HomeLocationGate.tsx`, and is a direct ancestor of `HEAD`.
- `e12cb6d` (2026-08-23, "add site-wide password gate via middleware") added
  `middleware.ts`'s gate three days later. It and the follow-up cookie fix
  (`af68cc4`) both post-date `604d60a` and neither touched these 5 files.
- Confirmed directly: navigating without the gate cookie 302s every one of
  these tests to `/site-access?next=...`, a page with no
  `court-path-location-gate-ready` testid at all — so no timeout value could
  have fixed it. **Not a config/timeout issue; not a testid or render-condition
  change in `HomeLocationGate.tsx`.** Fixed by adding `grantSiteAccess(page)`
  (same helper the newer harness already used) to all 5 files.

That fix alone took the suite from 0/20 to 18/20. The remaining 2 were a
mid-work regression and a genuinely pre-existing bug, both confirmed via
`git stash` against untouched baseline code before being treated as either:

- **A real regression this session introduced**, caught by the same testing
  that produced bug #1 above: the LTB keyword-substring collision made
  `family-adoption.spec.ts`'s adult step-parent adoption story resolve
  out-of-scope `ltb`. Fixed by the keyword-list rewrite in §7.
- **A genuinely pre-existing, unrelated bug**, confirmed by testing the exact
  same story against stashed baseline classifier code: `golden-journeys.spec.ts`'s
  "Case Partner" test uses a defamation-flavored story
  ("false text messages... two third parties") declared as Small Claims. The
  classifier — baseline and current alike — correctly flags this as more
  Civil-shaped (confidence 0.9 on baseline, matching this platform's own
  `SC-DEFAMATION-FILED-SERVED-DEFAULT-001` scenario treating defamation as
  ambiguous between the two). The test never accounted for the resulting
  suggestion panel. Fixed at the test level with a new
  `continueKeepingDeclaredPath()` helper in `golden-journeys.spec.ts` that
  keeps the declared path if a suggestion (in-scope or out-of-scope) appears
  — this is the "keep" half of the suggest-don't-decide contract, not a
  workaround.

Confirmed passing repeatedly, not just once: full suite run 3x, 20/20 both
times after the fixes.

## 9. Repo cleanup

Stale `.bak`/`.backup` files found during the initial audit
(`HomeLocationGate.tsx.backup`, `intakeDriver.ts.bak` through `.bak5`,
`scenario-quality.spec.ts.bak`) have been deleted. No stray
`probe-gate.spec.ts` was ever found in the repo.

## 10. Known risk: test and debug code runs directly against production Supabase

**Status: documented 2026-08-25, deliberately not fixed.** The project owner
confirmed there is exactly **one** Supabase project — "courtsimplified",
branch "main", explicitly tagged **PRODUCTION**, on the **free tier**. No
dev/staging/prod split exists anywhere in this codebase or its
infrastructure. Every finding below was verified directly (file read, or a
grep result cross-checked against the actual file), not assumed from a
script's name or docstring.

### What currently touches production, and how

| What | Where | Against production | Guarded? | How it's triggered |
|---|---|---|---|---|
| Creates/resets a real user in `auth.users` | [`tests/browser/harness/realTestSession.ts`](../tests/browser/harness/realTestSession.ts) (`mintRealTestSession`, `ensureHarnessUserId`) | Admin API, service-role key | No flag — runs every time it's called | Called by `authenticateRealTestUser()` in `intakeDriver.ts` |
| Real, unstubbed `GET /auth/v1/user` | [`tests/browser/harness/intakeDriver.ts`](../tests/browser/harness/intakeDriver.ts) — only `**/rest/v1/cases**` is stubbed; `**/auth/v1/user**` is not | Read-only, real Auth traffic | No | Every scenario run through `authenticateRealTestUser()` (e.g. `supabase.auth.getUser()` calls inside `app/builder/page.tsx`) |
| Full scenario sweep, up to `SCENARIO_BATCH` (default 25) runs | [`tests/browser/scenario-quality.spec.ts`](../tests/browser/scenario-quality.spec.ts) | Both rows above, once per scenario | No | `npm run test:browser-journeys` (manual only — **not** in either CI workflow) |
| Read-only export of the real form catalogue | `scripts/verification/inspectSupabaseFormCatalogueReadonly.mjs` | Anon-key `SELECT` on `court_form_library` and related tables | No | Ad hoc — not wired to any `npm run` script |
| Boots a real `next dev` server against production Supabase vars (falls back to them when none are explicitly set) | `scripts/verification/verifyAiCasePartnerContext.mjs` | Real HTTP requests to `/api/ai-case-partner`, `/api/cases`, `/api/small-claims/analyze`, `/api/assistant-chat`; assertions expect 401/`deterministic-fallback`, so it's not designed to write rows, but nothing structural prevents it | No | `npm run test:ai-context` — **runs on every push/PR** as the last step of `courtsimplified-ci.yml`, with `SUPABASE_SERVICE_ROLE_KEY` and the rest injected from `secrets.*` |
| Lists real `auth.users`; sends a real SMTP email via Resend; fires a real `POST /auth/v1/recover` against production | `scripts/diagnose-auth-email.mjs` (untracked) | Admin API read + real email send + real Auth endpoint | No | Manual only (`node --env-file=.env.diagnose scripts/diagnose-auth-email.mjs`) |
| **PATCHes production Supabase Auth/SMTP configuration** via the Management API, reads it back, then fires a real `POST /auth/v1/recover` | `scripts/fix-smtp-and-verify.mjs` (untracked) | Direct write to live Auth config (`smtp_host`, `smtp_pass`, `smtp_admin_email`, …) + real recovery email | No | Manual only |

Both untracked scripts carry their own secret-scrubbing console filters
(built for the live SMTP incident this session's history references) —
that protects against leaking credentials to logs, but does nothing to
protect the production project itself from a mistake in the script.

### The sharper risk underneath the list: service-role key = RLS bypass

`verifyCaseRlsPolicyContract.ts` (§ elsewhere in this file) confirms `cases`
has row-level security scoping every row to `auth.uid()` — real user data is
protected from *other real users*, and from the harness user's own queries
under its own anon-key session. But every script in the table above that
uses `SUPABASE_SERVICE_ROLE_KEY` (`realTestSession.ts`,
`diagnose-auth-email.mjs`, `fix-smtp-and-verify.mjs`, and the CI-wired
`verifyAiCasePartnerContext.mjs`) **bypasses RLS entirely by design** — a
service-role key is the database's admin credential. RLS is not a backstop
for a bug in one of these scripts; an unscoped query, a typo'd filter, or a
copy-paste mistake in any of them has unrestricted read/write access to
every row in every table, for every user, in production. There is currently
no environment where that class of mistake is safe to make.

### Options to separate test/dev from production

1. **Supabase branching (Preview Branches).** Supabase's own mechanism for
   exactly this — an ephemeral, schema-synced copy of the project per branch
   or PR. **Not available on the free tier** — it requires a paid (Pro or
   above) plan. Would need a plan upgrade before this is usable at all.
   Tradeoff: closest to zero-drift with production schema/RLS since Supabase
   manages the sync; ongoing cost; adds CI complexity (branch-scoped secrets
   per run).
2. **A second, separate Supabase project as dev/staging.** Free tier
   supports multiple projects, so this has no direct dollar cost. The repo
   already has `supabase/migrations/` and `supabase/config.toml` — the
   Supabase CLI's `supabase db push`/`supabase migration up` tooling this
   implies could keep a second project's schema in sync with production's
   migration history, so this isn't starting from nothing. Tradeoff: manual
   discipline required to keep it in sync (nothing enforces migrations were
   actually applied to both); doubles the secrets every CI workflow and
   `.env.local` needs to manage; RLS policies, extensions, and auth
   configuration (the exact thing `fix-smtp-and-verify.mjs` touches) must be
   separately provisioned and kept equivalent, or tests stop being
   representative of production behavior.
3. **Local Supabase via the CLI (`supabase start`, Docker-based).** Fully
   local, zero production network calls, zero marginal cost, and — like
   option 2 — the existing `supabase/migrations/` already gives it a schema
   source of truth to apply. Tradeoff: requires Docker in every dev and CI
   environment; local Postgres can still drift from hosted Supabase in
   subtle ways (extensions, auth email delivery, Management API behavior —
   `fix-smtp-and-verify.mjs`'s entire surface has no local equivalent);
   slower first-run CI (image pull + migration apply).
4. **Mitigate without separating environments.** Keep the single project but
   remove admin-level access from routine test runs: never use
   `SUPABASE_SERVICE_ROLE_KEY` outside a small, explicitly-reviewed set of
   scripts; delete or gate the two untracked incident-response scripts
   behind an explicit confirmation prompt; keep `**/rest/v1/cases**`
   stubbed everywhere `authenticateRealTestUser()` is used (already true
   today) and add the same stub for `**/auth/v1/user**` if the real-token
   validation isn't specifically what's being tested. This is containment,
   not isolation — every run still authenticates against, and briefly
   touches, the real project.

None of these are mutually exclusive; a real fix likely combines picking one
of 1–3 as the actual dev/test environment with tightening option 4's
practices (minimize service-role usage, gate destructive scripts) regardless
of which environment ends up hosting test runs.

### Why this needs resolving before real beta users exist

CourtSimplified's own data is not generic app data — it is family law,
criminal-adjacent, immigration, and financial narratives that real
self-represented litigants will type into an intake form believing the
platform is safe to be honest with. Two distinct risk shapes follow from
that, both of which get harder to unwind the longer they're left as-is:

- **Data commingling.** Once real beta users exist, their `cases` rows sit
  in the same tables the harness user and any future test runs write to
  (today, `cases` writes are stubbed in the browser harness, but nothing
  architectural prevents a future test from omitting that stub the way the
  6-week-old site-gate omission went unnoticed in 5 spec files — see §8).
  Distinguishing "real" from "synthetic" rows after the fact, in a database
  with no environment boundary, is an audit problem that only grows.
- **Blast radius of a mistake.** The service-role-key point above is the
  sharper version of this: today, a bug in a test/debug script can only
  embarrass a project with no real users in it. Once beta users exist, the
  same class of bug — an unscoped query, a bad migration tested "live," a
  repeat of the SMTP incident these two untracked scripts were built to
  fix — has a real person's legal matter, or the platform's ability to send
  them a password-reset email, on the other end of it. A separate
  environment is what turns "a mistake here is a bug to fix" into "a mistake
  here is a bug to fix," full stop — right now it's "a mistake here is an
  incident."

This section intentionally stops at documenting the risk and the options.
No code changes were made to any of the files listed above as part of
writing this section.
