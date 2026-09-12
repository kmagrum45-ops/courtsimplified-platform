# Ontario Form Routing Coverage Plan

Source: live read-only export `2026-08-11T23-28-34-070Z`. This is a data-routing inventory, not legal certification. Runtime identity remains exact `canonical_form_id + court_type`; titles and paths are displayed metadata only.

## Coverage summary

- `ambiguous-identity-or-stage`: 313
- `catalogue-unverified`: 129
- `court-only-or-non-user-form`: 9
- `excluded-by-safety-boundary`: 2
- `mapped-and-verified`: 23
- Total active canonical identities: 476
- Exact active mappings: 23

## Currently mapped forms

- `1e9b6788-cb57-42d6-a732-fd8cef53d623` â€” civil, mapping 10, stage `motion`
- `952b0ad2-1599-4815-be23-d2dfb5aee75d` â€” civil, mapping 12, stage `already-started`
- `502cd465-720a-4d71-8b6c-a7eefe788657` â€” civil, mapping 14, stage `responding`
- `38ecdb74-266d-4b46-908e-ddccfb3030df` â€” civil, mapping 19, stage `responding`
- `cdba6867-648f-40be-ac57-8094d5f0db7d` â€” civil, mapping 22, stage `responding`
- `1fead613-b24b-4797-b73c-0edfeb2af3d7` â€” civil, mapping 9, stage `starting`
- `82d885fe-4f0e-4e37-adce-6c1ff331f3f1` â€” family, mapping 1, stage `starting`
- `21fd1fd2-2d0f-486d-abbf-41faab3d488c` â€” family, mapping 13, stage `already-started`
- `faaf5ef0-e3c0-426a-ae2a-9e966feb499a` â€” family, mapping 16, stage `motion`
- `03664f12-87b9-439c-a896-5ffeb0dd738e` â€” family, mapping 17, stage `starting-case`
- `4894de57-6511-45b1-a71a-967c884510f5` â€” family, mapping 2, stage `responding`
- `497ac7b5-7ed7-4303-9c9a-621402b06a28` â€” family, mapping 20, stage `starting-case`
- `501395c9-f7a4-4214-b13b-30b38ce5d85c` â€” family, mapping 21, stage `parenting-affidavit`
- `f38325dc-0a6a-40ec-bb01-75293f7d68b5` â€” family, mapping 23, stage `motion`
- `dc9f6b2e-ef9b-45b8-9ee5-7fe2c9aa697d` â€” family, mapping 24, stage `motion`
- `ac3d1227-0c45-4f8d-8428-b291f5b3d437` â€” family, mapping 25, stage `motion`
- `b2b46bcf-97ae-42e4-9d01-4a962ea83a2a` â€” family, mapping 3, stage `conference`
- `e6fdaf6d-9aca-4193-853a-0fec07bc84c4` â€” family, mapping 4, stage `motion`
- `bf8fb6c7-ad37-4f04-98fa-4638ec6f2c9b` â€” family, mapping 5, stage `conference`
- `a576815d-2bc8-4a13-9502-348eec5819e2` â€” small-claims, mapping 15, stage `already-started`
- `a9359589-58d6-4255-b07f-5054ef5be3e2` â€” small-claims, mapping 18, stage `responding`
- `a289d2a2-a691-45eb-a625-15c42c6da695` â€” small-claims, mapping 6, stage `starting`
- `b429d68c-e1d4-4eb0-b7a2-4a0069e173d6` â€” small-claims, mapping 7, stage `responding`

## Three-area routing plan

### Batch A â€” simple, exact, existing-stage candidates

No IDs. The live export has no unmapped canonical identity with verified catalogue provenance and no unresolved safety/stage classification.

### Batch B â€” one new structured posture fact/question

No IDs. The nine previously identified posture candidates remain unverified and retain their pre-repair stages in this live export, so they are not eligible for mapping.

Blocked repair-set IDs:
- `4300c97c-a430-45b4-b7cb-da90f0d9be20`
- `ff396301-b97f-4e0e-84fa-6d1fd4995d1f`
- `92121753-d5a5-45e5-9cb6-21b837de7c13`
- `a4c3343d-1ed5-4da3-b247-8460b5d27b3c`
- `8135da24-53f9-4360-a7c4-81d66fe8530a`
- `a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185`
- `ce2bebe1-9c12-469f-bcca-ebb4d7968216`
- `b2cc9170-cb22-4087-843e-1b4ca4eb2620`
- `79f07cdf-6f02-4857-8402-1b77addfa7f6`

Minimum future posture facts, once catalogue repair and provenance are live and revalidated:

- `formApplicability.smallClaims.discontinuancePosture` and `formApplicability.smallClaims.discontinuanceCapacity`
- `formApplicability.family.replyPosture`
- `formApplicability.civil.pleadingPosture`

These belong in the existing canonical `master_result.formApplicability` branch and are server-declared mapping metadata, not a parallel state store.

### Batch C â€” review-required

All 453 remaining unmapped identities. They are fully enumerated, with exact reasons and eligibility, in `form-routing-coverage.csv`. 
- `ambiguous-identity-or-stage`: 313
- `catalogue-unverified`: 129
- `court-only-or-non-user-form`: 9
- `excluded-by-safety-boundary`: 2

## Top 20 safest next candidates

None. The export provides no legally safe, unmapped candidate: every provenance-verified canonical form is already mapped. The nine blocked repair-set IDs above require their failed/missing stage-and-provenance repair to be live before any posture-mapping batch. Remaining forms are catalogue-unverified, ambiguous, excluded by a recorded safety boundary, or absent from the clean user-facing view.

## Safety boundaries

- Civil Form 28B (`2ed14ff3-cec2-4c95-baa7-54c94b923c3a`) remains excluded pending Rule 28.05(2) canonical applicability design.
- Civil Form 29A (`b8d28c25-2b10-4450-a1f3-2d22f5ce2a8a`) remains excluded pending Rule 29.01 substantive applicability design.
- No form is certified, mapped, or selected by title, form number, path, or keyword in this plan.
