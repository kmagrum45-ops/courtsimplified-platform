# CourtSimplified — ordered build plan

**The rule:** nothing moves to the next step until the current step's verifications pass and anything found is fixed or explicitly deferred with a reason. A step that ends with "reported, not fixed" is not complete.

**Where this comes from:** `docs/OUTSTANDING_ISSUES.md` (the issues register), the three intake specs, `PROCEDURAL_INTELLIGENCE_DESIGN.md`, and the journey battery's findings. Those remain authoritative for detail — this is the sequence.

---

## STEP 0 — in flight

**Entry-point design spec.** Two entry points into one case file: a user starting from nothing, and a user already in the court process. Must land before Step 2, because it changes intake's shape.

**Gate:** spec committed. Nothing to fix — docs only.

---

## STEP 1 — close the sanitizer findings

Three items outstanding from the interception measurement work. None blocks a user, all are known compliance defects, and leaving them means building on top of known problems.

1. **`structuredCaseSummary`** — `viability` went 15→19 after the prompt change. It concentrated rather than fell. Do not write another prohibition; REQUIRED DEPTH #8/#9 was the strongest prose form available and didn't move the number. Restructure the field so there is no free-text slot for a conclusion to occupy.
2. **`intelligenceSummary`** — now opens "has a potential case against…". Not on the blocked list, closer to viability than the phrases that are. Same behaviour finding new words, which is evidence the wordlist will always lag.
3. **`ElementProofStatus`** — `"proven"` / `"partly-proven"` is the same violation as the element status already fixed. Declared independently in four places, compared by literal in two. The model never sees it (assigned downstream), so it is contained but real.

**Gate:** five-run measurement before and after, both distributions reported, and a statement on whether the difference clears the variance. Fixture diffs reviewed for substantive change in what a user would read, not just pass/fail.

**⚠️ The gate is not yet met, and the old baseline cannot be used toward it.** The three fixes are committed (`1bec20f`) and verified on their own terms, but the measurement that was supposed to justify them is outstanding:

- **The `3,2,5,7,5` baseline (mean 4.4, spread 5) is unusable.** `measureInterceptionRate.ts` counted a failed journey as zero interceptions and had no timeout, and the pipeline swallows 429s rather than throwing — so a degraded run scored as a clean one. Both biases run *downward*, i.e. toward "the change worked". Which runs were affected cannot be recovered. Guards added in `bcd1020`.
- **What STEP 1 now requires: a fresh two-sided measurement** — new BEFORE *and* new AFTER, both under the guarded harness. Do not reuse the old numbers on either side.
- **`npm run test:fixtures` has not run since the fix.** `git log --follow` puts the last content change to all three `.actual.md` files at `8052231` (2026-09-08), four days before `1bec20f`. Regeneration is required, and the fixture-diff half of this gate is unstarted.
- **Cost, corrected:** a journey is ~35 logical calls (~46 unmatched), a battery block ~593, a **`--runs=5` block ~2,965**, a 3-fixture regeneration ~105. The earlier "~680 per run" figure was wrong — it counted one pass of 16 journeys and ignored both the runs multiplier and the SDK's retry amplification. Full detail in `OUTSTANDING_ISSUES.md` §11.
- **A full five-and-five block is ~5,600 calls against a 10,000/day cap**, so it was never affordable in one day. The old baseline was therefore probably collected across a cap boundary — a second independent reason to discard it.
- **The gate's instrument only validates fix 1.** `intelligenceSummary` cannot be measured by interception count (its phrasing was never on the wordlist) and `ElementProofStatus` is never model-generated. Do not read a clean measurement as clearing all three.
- **Sequencing:** STEP 1 item 2 is not closed by the measurement. See §11's sanitizer-blindness audit — the structural grading slots in the cognition prompt are a §3 question that must be settled before a cache is frozen for the replay design, because changing them changes the brain's output schema.

---

### 🔴 THE LAST UNTIED THREAD FROM THE ORIGINAL HANDOFF

**Fixture regeneration for `1bec20f` has never run.** This is now four layers of work deep and must not be lost again. It is the only thing left over from the original handoff that has neither been done nor explicitly closed.

**The evidence, not an inference.** `git log --follow` puts the last content change to all three `.actual.md` files at **`8052231` (2026-09-08)** — four days *before* `1bec20f` (2026-09-12 15:40). Their filesystem mtimes read 15:40:18, but all three fall inside a ~3ms window, which no three sequential pipeline runs could produce; that is a bulk git write, not a harness write. Content, not mtime, is the evidence.

**What that means, stated precisely:** the `structuredCaseSummary` restructuring is **untested at fixture level — not shown to be inert, simply never exercised.** The composer itself is pinned by `verifyCaseFileSummaryComposer.ts` (7/7, deterministic, no API), but that proves the assembled sentence is well-formed, not that the end-to-end pipeline produces what we expect.

**BLOCKED — and the block is now narrower than when first written.** A regeneration must not run against a cognition schema that is about to change.

- ✅ `evidenceIssueLinks[].strength` — **removed** (`5210908`), along with its "explain why the proof is weak" instruction.
- ⛔ `claimClassifications[].score` — **still present, deliberately held.** It is not a simple deletion: `clampScore(claim.score)` at `courtSimplifiedBrain.ts:1043` also feeds `confidence` as a fallback (`confidenceFromScore(score)`), and `claimTheoryEngine.ts:66-68` maps it to `dominant`/`active`/`possible` — a *routing* decision. Removing it requires `status` to take over that routing, which is a design change, not a cleanup.

**So: regenerate only after `claimClassifications[].score` is resolved.** Anything captured before then is against a schema with a known pending change.

**Cost after removal: ~105 requests**, not the ~315 figure that circulated. 315 was the old *with-retries* number (3 fixtures × ~35 calls × 3 attempts). With `maxRetries: 0` (`d1efdcc`) it is ~105 — roughly 1% of the daily cap, and affordable the same day as other work.

**When it runs, it runs under the guarded path** (`9c941aa`): `withTimeout`, `describeRunDegradation`, and `abortIfRateLimited` all fire before `writeFileSync`, so a degraded or rate-limited run cannot overwrite good fixture output with placeholder text. That protection did not exist when the regeneration was first skipped.

---

## STEP 2 — intake depth

Build from `CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md`, now informed by Step 0's entry-point design.

This is the step that carries the intelligence. Claim-type-specific questions, gap-driven so nothing already stated is asked again, vocabulary reaching the question by deterministic slot substitution only, "I don't know" resolving rather than blocking.

Four things are load-bearing and must survive the build:
- the suppression filter is a pure function, run unconditionally, biased toward suppression
- `composeVoiceTurn()` never emits model output as question text — do not relax that invariant
- depth answers feed attestation directly; one state map, two views
- "I don't know" resolves an element to cannot-provide

**Gate:** four paraphrase-only stories across different claim-type categories, run end to end through the real pipeline, with the full question sequence reported for each. A story that already supplied everything should produce a near-empty question set — if it doesn't, the filter is too weak. Any question that reads like something the user already answered is a bug, not a note.

---

## STEP 3 — the readiness gate

Build from `STATEMENT_OF_CLAIM_READINESS_DESIGN.md`. Derives from the matched claim type's own `plaintiffElements`, per-element attestation as the bridge, three states where only "not yet" holds the gate, administrative gaps treated differently from substantive ones.

**Gate:** a user who genuinely cannot supply something must still reach a draft, with the gap marked. A user who hasn't tried yet must not. Test both, plus the unmatched path from `UNMATCHED_CLAIM_TYPE_DESIGN.md` — including that no output implies the user lacks a case rather than that the site lacks coverage.

---

## STEP 4 — wire the drafting engine

The engine works and is tested against three fixtures. No user can reach it. This is the step where the site first delivers its central artifact.

**Gate:** a complete journey from story to reviewable draft, by a user, in a browser. Draft tested against claim types beyond unpaid invoice — it has only ever been exercised on invoice fixtures, and defamation or bailment have a different fact shape. Review-and-approve step present and following an existing confirmation pattern.

---

## STEP 5 — your walkthrough

**This is yours and nothing substitutes for it.** Everything above will have been verified by sessions; none of it has been used by a person.

Homepage → a court page → start an intake → describe a real situation in your own words → watch the classifier → answer the depth questions → reach a draft → check the forms page → try something the site probably can't handle.

**Gate:** every problem found is written into `OUTSTANDING_ISSUES.md` and fixed before Step 6.

---

## STEP 6 — push

46+ commits are local only. None of this exists anywhere but your machine.

**Gate:** Step 5's findings fixed first. Push after the walkthrough, not before.

---

## STEP 7 — the journey battery, tranches 2 and 3

Tranche 1 covered categories A–D. Remaining: out-of-scope routing (including the condo lien case — Condominium Act s.1.36(4) excludes liens from the CAT), degraded input, distress, guest vs authenticated, and the 390px viewport.

Known weaknesses to carry: I4 is weak by its own admission and cannot see `elements[].status`; blind spot 8 is now tree-wide but produced 101 hits across 42 files needing triage; the runtime arm reads post-sanitizer output and cannot distinguish a clean generation from a catch.

**Gate:** every violation triaged. Anything user-facing fixed.

---

## STEP 8 — procedural intelligence

Build from `PROCEDURAL_INTELLIGENCE_DESIGN.md`. This is what makes the site useful after filing rather than only at intake — case state, rule selection, what generally follows when a document arrives.

Depends on Step 0's stage taxonomy and Step 2's state map. Do not start before those are settled.

**Gate:** no computed dates. Every timing statement either cites a rule or says the site does not calculate the date. The recorded silences in the rules map surface as silences.

---

## STEP 9 — deadline tracking, tiers 1 and 2

Tier 1 (user-entered deadlines, tracked and reminded) and tier 2 (sourced general deadline information). Tier 3 stays gated on licensee review of counting methods.

**Blocker to resolve first:** no email or notification system exists anywhere in the codebase. Tier 1's reminders are a real dependency, not a detail.

---

## STEP 10 — coverage

22 claim types against ~150 mapped scenarios in `SMALL_CLAIMS_TAXONOMY_ROADMAP.md`. Batch 1 has two left: unpaid wages / final pay / commissions, and moving company disputes.

Out-of-scope routing is cheaper than sourced claim types and arguably as valuable — `jurisdictionRoutes.ts` has 6 sourced entries against 16 forums identified.

Also here: CJA ss. 23, 26, 27, 29, 31 — s. 29's cost cap first, since "what does this cost me if I lose" is the question self-represented people most need answered.

**Ongoing, not a step:** the `none` logging from the unmatched path replaces the roadmap's guesses with real evidence of what users actually bring. That should drive what gets sourced next.

---

## PARALLEL — not blocking, but not optional

**The review backlog.** Everything is `status: "draft"` — 22 claim types, 9 education topics, 6 defence concepts, 6 jurisdiction routes. Nobody has reviewed any of it. This grows with every content session and cannot be closed by building.

Two routes: your own review pass on the highest-traffic entries, and the licensee conversation — a paralegal engagement or the LSO's Access to Innovation sandbox. Neither gets easier by waiting.

**Known-unfixable without a licensee:** the deemed-service counting question. The regulation genuinely does not say how service-effectiveness composes with r. 3.01, and no amount of reading resolves it.

---

## Standing rules for every step

- Read `SOURCING_NOTES.md` before any sourcing work. It records techniques, dead ends, and confirmed absences that have each cost a session to establish.
- Verify findings against the code rather than trusting a register. `OUTSTANDING_ISSUES.md` has been wrong twice — the causation gap was already fixed, and the Pecore row contradicted an earlier rejection.
- Clear `.next/types` if `tsc` reports a phantom module. A deleted route left stale references three separate times.
- Add an entrypoint guard to any new script. `runFullClaimTypeSurvey.ts` lacked one and importing it silently re-ran 19 billed journeys.
- A single run cannot measure interception rate. Five minimum per side, both distributions reported.
- A harness that drives the real pipeline must bound each run and check `describeRunDegradation()` before recording anything. The pipeline swallows API failures in two places (`voiceLayer.ts:166`, `courtSimplifiedBrain.ts:2027`), so a rate-limited run completes and looks ordinary — and a failure counted as a clean result biases every measurement toward success.
- Do not push until Step 6.
- **Do not close STEP 1 while the fixture regeneration for `1bec20f` is still outstanding.** It is flagged in red under STEP 1's gate and has already survived four layers of unrelated work by being easy to defer.
