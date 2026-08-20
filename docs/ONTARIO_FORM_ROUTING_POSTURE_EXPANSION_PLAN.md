# Ontario Form Routing Posture Expansion Plan

## Scope and decision boundary

This plan classifies all 429 remaining unmapped, user-facing canonical queue rows in `ONTARIO_COMPLETE_FORM_ROUTING_QUEUE.csv`. The accompanying matrix uses complete, mutually exclusive queue selectors so that every row is classified once without duplicating the live-derived queue. It is a planning artifact, not legal advice, a form certification, or a routing change.

The locked source chain remains unchanged: Intake -> CourtSimplifiedBrain -> BrainMigrationLayer -> MasterCaseSchema -> CaseSystemAssembly -> Specialized Intelligence Systems -> Workflow -> UI. The only eventual storage location proposed here is the existing selected case's `master_result.formApplicability`. `court_form_library` remains the catalogue and `legal_form_mapping_rules` remains the eventual mapping registry. No second registry, runtime engine, case state, migration, resolver, route, or UI contract is proposed.

| Classification | Forms | Treatment |
| --- | ---: | --- |
| identity repair required | 369 | No question or mapping until exact canonical identity, source/revision, and canonical stage are independently repaired and verified. |
| new reusable posture fact could support future routing | 5 | Candidate only; every prerequisite below remains review-required. |
| requires specialized workflow beyond safe beta routing | 55 | Retain review-required. A posture answer cannot establish statutory requirements, court direction, evidence, service, timing, validity, or readiness. |
| court-controlled/not suitable for recommendation | 0 | None in the user-facing scope; nine court-only queue records were excluded upstream. |

## Existing canonical contract and fail-closed boundary

`MasterCaseSchema.CaseStage` already supplies the canonical stage vocabulary: `pre-litigation`, `starting-case`, `responding`, `already-started`, `conference`, `motion`, `trial`, `settlement`, `enforcement`, `appeal`, `urgent`, `closed`, and `not-sure`. This plan does not expand it.

The existing Forms route reads only the authenticated owner's selected case, merges permitted answers into `master_result.formApplicability` while preserving other `master_result` fields, and accepts only declared `formApplicability.<area>.<field>` choices. The Forms page renders those declared questions generically. The resolver requires matching court area, stage, exact canonical ID plus court type, verified catalogue provenance, and declared mapping conditions. Future work must retain that model: absent, conflicting, `not-sure`, or unrecognized facts resolve nothing and remain review-required.

The plan deliberately does not duplicate existing facts such as the Small Claims Defendant's Claim posture, Family motion document set, Civil response document, or Civil pleading posture.

## Reusable posture facts

### Small Claims discontinuance posture and capacity gate

- Paths: `formApplicability.smallClaims.discontinuancePosture` and `formApplicability.smallClaims.discontinuanceCapacity`.
- Allowed values: `discontinue-undefended-claim`, `another-small-claims-posture`, `not-sure`; and `no-party-under-disability`, `party-under-disability-or-not-sure`.
- Court area / canonical stage: `small-claims` / `already-started`.
- Exact potential canonical form: `4300c97c-a430-45b4-b7cb-da90f0d9be20`, Form 11.3A, Notice of Discontinued Claim.
- Non-overlap: the first fact distinguishes this narrow discontinuance posture from a Defendant's Claim or generic motion; the second records only the disability boundary. Neither represents service, leave, timing, validity, evidence, merits, or filing readiness.
- Proof required before any mapping: re-verify the current official Form 11.3A identity/revision, catalogue provenance, and the full Rule 11.3.01 boundary documented in Cohort 2, including the disability/leave limitation.

### Family reply posture

- Path: `formApplicability.family.replyPosture`.
- Allowed values: `reply-to-family-answer`, `another-family-response`, `not-sure`.
- Court area / canonical stage: `family` / `already-started`.
- Exact potential canonical form: `ff396301-b97f-4e0e-84fa-6d1fd4995d1f`, Form 10A, Reply.
- Non-overlap: identifies a reply to a Family Answer, rather than a general response, motion, conference record, or general application.
- Proof required before any mapping: repair or verify the currently `general` catalogue stage; then establish the exact current Family Law Rules pinpoint and official Form 10A identity/revision. All deadline, service, validity, and filing questions remain outside this fact.

### Family conference posture

- Path: `formApplicability.family.conferencePosture`.
- Allowed values: `party-requesting-case-conference`, `party-preparing-general-settlement-conference-brief`, `another-family-conference-posture`, `not-sure`.
- Court area / canonical stage: `family` / `conference`.
- Exact potential canonical forms: `edd91020-9fea-4294-a01c-695236c5b3f6`, Form 17, Conference Notice; and `7ef801e0-5296-4019-9e93-ed2853133207`, Form 17C, Settlement Conference Brief.
- Non-overlap: separates requesting a conference from preparing a general settlement-conference brief; it does not decide whether a court has scheduled the event or whether anything is ready for it.
- Proof required before any mapping: re-verify each official page and current revision, repair current catalogue provenance/identity, and re-confirm the Cohort 2 Rule 17(4.1) and Rule 17(13) links. Form 17D has no canonical ID in the queue and remains identity-repair-required; it must not be included in a future mapping until that defect and its `conference` stage are repaired.

### Family consent motion-to-change posture

- Path: `formApplicability.family.motionToChangePosture`.
- Allowed values: `consent-child-support-only-change`, `another-motion-to-change-posture`, `not-sure`.
- Court area / canonical stage: `family` / `motion`.
- Exact potential canonical form: `4f1eed91-6a00-4111-b28d-d0231ad385bc`, Form 15D, Consent Motion to Change Child Support.
- Non-overlap: narrower than the existing broad `motionDocumentSet`; it captures only the proposed consent/child-support-only posture.
- Proof required before any mapping: re-verify the current official page/revision, catalogue provenance, and the Cohort 2 Rule 15(18) boundary. It cannot establish a final order/agreement, valid consent, attachments, service, or filing readiness.

## Not proposed for safe beta routing

The 55 specialized rows include civil pleading variants with unresolved distinct preconditions, enforcement, appeal, mortgage, discovery, court-directed, contempt, CYFSA/adoption, urgent, trial, and remedy-specific matters. In particular, Small Claims Forms 20O/20P and Family Form 23C cannot be reduced to a fact that certifies enforceability, an order/default, amount owing, court direction, service, evidence, or readiness. The 369 identity-repair rows have insufficient reliable identity/stage/source evidence for a posture design. All remain review-required.

## Prioritized implementation sequence

1. **Family conference posture** — potentially covers Forms 17 and 17C with one fact. First repair/re-verify canonical identity, provenance, stage, and the Rule 17 links; leave Form 17D excluded until it has an exact canonical ID.
2. **Small Claims discontinuance posture plus capacity gate** — covers Form 11.3A with two tightly coupled fail-closed facts. First prove current form/catalogue provenance and the complete Rule 11.3.01 boundary.
3. **Family reply posture** — covers Form 10A. First repair its general-stage record and verify its current rule/form source link.

Family Form 15D is a later, separate candidate. No expansion authorizes a mapping until all listed proof is complete and a new mapping review independently confirms the exact source, canonical identity, stage, and fail-closed condition contract.
