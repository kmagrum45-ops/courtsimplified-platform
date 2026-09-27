# The doctrine seed library — eleven items needing a source

**Status: a work list, not content.** Every item below exists in
`src/lib/case-system/knowledge/doctrineSeedLibrary.ts` carrying
`verificationStatus: "not-verified"`, `authorityLevel: "operational-guidance"` and
`jurisdiction: "Unknown"`. The file is honest about itself in its own metadata.

Nothing here may reach a user until it is sourced from the vendored corpus and
passes the content pipeline, exactly like the stage answers and claim-type profiles.

---

## Why the file was not moved out of the app tree

The instruction was to move it out of `src/` and gate it so nothing in the app
imports it. **That is not safely possible, and the reason is worth recording.**

Five live modules import it:

| Module | What it does with it |
|---|---|
| `guided-assistant/guidedAssistantOrchestrator.ts` | computes a verification status from it, and feeds it to a reasoning coordinator |
| `orchestration/caseSystemAssembly.ts` | feeds it to a reasoning coordinator |
| `intelligence/courtSimplifiedBrain.ts` | imports `getDoctrineSeedLibrary` |
| `content-library/contentInventory.ts` | indexes it **into the review packet** — which is exactly where a to-source list belongs |
| `scripts/verification/verifyAssistantBlocks.ts` | asserts things about it |

Moving the file means either breaking those five or rewriting them, and the rewrite
is a bigger change than "retire a checklist". `contentInventory` in particular is
already doing the job the instruction asked for: it puts these items in front of a
reviewer.

**So the retirement is conceptual rather than physical, and the safety it was meant
to buy was bought a different way** — see below.

## What was done instead, and why it matters more

The render gate that stops unverified doctrine reaching users **failed open.** It
read:

```ts
if (args.knowledgeVerification !== undefined && !isRenderableVerification(...))
```

so omitting the argument rendered the block. **One call site out of thirty-seven
passed it.** Proven before changing anything: with no status,
`assistant:opening:generic` returned 127 characters; with `"not-verified"` it
returned none.

Now a block declares `drawsOnUnverifiedKnowledge`, and the gate refuses it unless
given a renderable status — caller or no caller. `knowledgeGateRefusal` is exported
so `test:assistant-blocks` can drive it with synthetic blocks.

> The first check written for that fix **passed with the fix reverted**, because the
> one real block declaring the dependency is also a placeholder and was refused a
> step earlier. It was watching the wrong refusal. That is why the check now tests
> the rule directly and not a block.

**One thing remains unverified.** The library also flows into
`buildLegalReasoningCoordinator` from two places, and whether any of its text
reaches a user down those paths has **not** been traced. The gate covers the
assistant-block route. Treat the coordinator route as an open question.

---

## The four that graded a case are DELETED, 2026-09-27

Not on the needs-source list, because no source would have cured them. Each asked the
product to grade a case or predict a decision-maker, which CLAUDE.md §3 forbids
outright:

| Deleted | What it asked for |
|---|---|
| `SEED_JUDICIAL_CONCERN_ORGANIZATION_001` | how a judge reads a disorganised file — a prediction about a decision-maker |
| `SEED_CREDIBILITY_INCONSISTENCY_001` | how inconsistency affects credibility — weighing a witness |
| `SEED_SETTLEMENT_COST_RISK_001` | cost risk around settlement — §3 names settlement pressure explicitly |
| `SEED_DAMAGES_PROPORTIONALITY_001` | whether damages are proportionate — grading the merits |

**Seven objects remain.** Five suites re-run clean after the deletion.

## The seven remaining items

Each needs a source from the vendored corpus, or deletion. None may be paraphrased
into content as it stands, and `test:reasoning-text-gate` plus the assistant-block
knowledge gate keep all of it away from users meanwhile.

| Id | What it asserts, in outline | Route |
|---|---|---|
| `SEED_DEFAMATION_PATTERN_001` | patterns in defamation matters | **rewritable.** The Libel and Slander Act is now vendored — rewrite from it, respecting s. 7's scope, which limits ss. 5 (1) and 6 to Ontario newspapers and broadcasts |
| `SEED_LIMITATION_DISCOVERABILITY_001` | discoverability under the limitation rules | **rewritable.** Limitations Act ss. 4 and 5 are vendored |
| `SEED_PUBLIC_AUTHORITY_SCREENING_001` | screening immunity, discretion and notice in public-authority claims | **rewritable.** Municipal Act, City of Toronto Act and Crown Liability and Proceedings Act are all vendored. This is the same proposition found unsourced in the deleted `ontarioCivilAuthorityCollection.ts` |
| `SEED_BURDEN_PROOF_MAPPING_001` | mapping what must be proved | **rewritable, per claim type.** This is the one the assistant's burden block draws on, and the claim-type profiles are where it belongs |
| `SEED_FORM_SELECTION_DISCIPLINE_001` | choosing the right form | **rewritable.** The forms table and the ontario.ca guides are vendored |
| `SEED_FAMILY_PARENTING_BEST_INTERESTS_001` | best interests in parenting matters | **OUT OF SCOPE.** Family law routes elsewhere; this product does not advise on it. Delete when the family surfaces are settled |
| `SEED_EVIDENCE_DIGITAL_CONTEXT_001` | how digital evidence should be read in context | **no evident source route.** Not a statutory proposition. Either find a CLEO "going to court" page that states it, or drop it |

### Where that leaves the library

- **5 rewritable** from sources already in the corpus.
- **1 out of scope**, marked as such.
- **1 with no evident source route.**
- **4 deleted** as ungateable under §3.

The original eleven were described as "waiting for a citation". Four were not
waiting for anything; they were asking for something the product may never do. That
distinction is the whole value of the triage, and it is why the list is a work item
in the review packet rather than a research backlog.
