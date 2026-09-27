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

## The eleven items

Each needs a source from the vendored corpus, or deletion. None may be paraphrased
into content as it stands.

| Id | What it asserts, in outline | Likely source route |
|---|---|---|
| `SEED_EVIDENCE_DIGITAL_CONTEXT_001` | how digital evidence should be read in context | no statutory source; CLEO "going to court" pages, or drop |
| `SEED_DEFAMATION_PATTERN_001` | patterns in defamation matters | Libel and Slander Act **is now vendored** — rewrite from it, and respect s. 7's scope |
| `SEED_DAMAGES_PROPORTIONALITY_001` | proportionality of damages | borders on assessing a case. Check against CLAUDE.md §3 before sourcing at all |
| `SEED_JUDICIAL_CONCERN_ORGANIZATION_001` | how a judge reads a disorganised file | a prediction about judges — **§3 forbids this**. Recommend deletion |
| `SEED_LIMITATION_DISCOVERABILITY_001` | discoverability under the limitation rules | Limitations Act ss. 4 and 5 are vendored. Rewritable |
| `SEED_PUBLIC_AUTHORITY_SCREENING_001` | screening immunity, discretion and notice in public-authority claims | Municipal Act, City of Toronto Act and **Crown Liability and Proceedings Act** are all vendored. Rewritable, and this is the same proposition found unsourced in the deleted `ontarioCivilAuthorityCollection.ts` |
| `SEED_FAMILY_PARENTING_BEST_INTERESTS_001` | best interests in parenting matters | out of scope for this product — family law routes elsewhere. Recommend deletion |
| `SEED_BURDEN_PROOF_MAPPING_001` | mapping what must be proved | the one the assistant's burden block draws on. Needs a real source per claim type, which is what the claim-type profiles are for |
| `SEED_CREDIBILITY_INCONSISTENCY_001` | how inconsistency affects credibility | assessing a case. **§3 forbids it.** Recommend deletion |
| `SEED_SETTLEMENT_COST_RISK_001` | cost risk around settlement | settlement pressure — **§3 names this explicitly.** Recommend deletion |
| `SEED_FORM_SELECTION_DISCIPLINE_001` | choosing the right form | the forms table and the ontario.ca guides are vendored. Rewritable |

### The split, counted

- **5 rewritable** from sources already in the corpus: defamation, limitation
  discoverability, public-authority screening, burden mapping, form selection.
- **4 recommended for deletion** because they grade a case or predict a
  decision-maker, which no amount of sourcing cures: judicial concern, credibility,
  settlement cost risk, damages proportionality.
- **1 out of scope**: family parenting.
- **1 with no evident source route**: digital evidence context.

**That is the finding worth acting on.** Roughly a third of this library is not
waiting for a citation — it is asking the product to do something CLAUDE.md §3
forbids. Sourcing it would not make it shippable.
