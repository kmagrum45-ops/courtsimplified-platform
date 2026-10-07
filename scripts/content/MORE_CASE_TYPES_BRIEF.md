# Writing case types — the brief (2026-10-07)

The site owner's direction: the library must cover hundreds of case types,
each one sourced. The plan is `src/lib/case-system/intake/moreClaimTypes/plan.json`:
batches of up to 10 case types, each with an id and a plain name. One author
writes one batch, in two files only:

- `src/lib/case-system/intake/moreClaimTypes/<batch>.ts` — the case types;
- `docs/sources/catalogue-verification/<batch>.json` — the record of what each
  entry rests on, quoted from the saved law.

Do not edit any other file. Do not run git.

## Read first

- `src/lib/case-system/intake/claimTypes.ts`: the `ClaimType`,
  `PlaintiffElement`, `DefendantConsideration`, `ProceduralNote`,
  `EvidenceCategory` and `SourceRef` types, and the first three entries of
  `CORE_CLAIM_TYPES` as examples of the voice and depth wanted.
- One existing record in `docs/sources/catalogue-verification.json`, to see the
  record shape (`key`, `verifiedAt`, `outcome`, `fingerprint`, `sources`,
  `howRead`).
- `docs/SOURCING_NOTES.md`, the sections on the corpus and CanLII.

## The rule that cannot bend

**Every legal statement comes from text saved in this repository, and its
record quotes that text word for word.** The statutes, regulations and official
guides are in `docs/sources/corpus/` (their `url` is in
`docs/sources/corpus/manifest.json`); court decisions are in
`docs/sources/decisions/`. Use the manifest `url` as the entry's `sourceUrl`,
so the check can find the text and test every quote. Never write law from
memory, never use the web, never touch canlii.org or canlii.ca. If the saved
text does not support a point, leave the point out. If a case type cannot be
supported at all from the saved text, write nothing for it and say so in your
reply.

## What each case type needs

- `id` and `name`: exactly as in plan.json.
- `courtArea`: the batch's court ("small-claims", "civil" or "family").
- `broughtBy`: plain words for who brings this (customer or business, tenant
  or landlord...). Not a legal statement.
- `typicalDefendantProfile`: "individual", "business" or "either".
- `plaintiffElements`: 2 to 4. Each: `id`, `name`, `plainExplanation` (what has
  to be shown, in plain words, naming the Act and section it comes from),
  `sourceUrl`, `verifiedAt: "2026-10-07"`, `consolidationPeriod` (the
  "CONSOLIDATION PERIOD: FROM ..." start date of that file in ISO form, e.g.
  "2024-12-04", whenever the source is an e-Laws `.doc`), optional `alsoCites`
  (`{ sourceUrl, pinpoint }`) for a second source, and `evidenceCategories`
  (2 to 3: `name`, `why`, `examples`).
- `defendantConsiderations`: 1 to 3, same fields plus `whenThisComesUp`.
- `applicableDefenceConceptIds`: from `defence-limitation-period-expired`,
  `defence-no-agreement-existed`, `defence-set-off-or-counterclaim`,
  `defence-waiver-release-assumption-of-risk`, `defence-contributory-negligence`,
  `defence-failure-to-mitigate` (only those that fit).
- `remedies`: for Small Claims, from `sc-remedy-monetary-judgment`,
  `sc-remedy-return-of-property`, `sc-remedy-outside-jurisdiction`,
  `sc-remedy-interest-and-costs`; `[]` for civil and family.
- `proceduralNotes`: 1 to 3 — which court or tribunal decides it (and when it
  is NOT this court: say so, e.g. the Landlord and Tenant Board's exclusive
  jurisdiction), any notice that must be given first, any time limit — each
  with `sourceUrl` and `verifiedAt`.
- `signals`: 6 to 12 short phrases a person might use in their story.
- `citations`: at least one `{ sourceName, officialUrl, verifiedAt, pinpoint }`.
- `reviewedAt: null`, `status: "draft"`.

## The record for each entry

For every plaintiff element, defendant consideration and procedural note, add
a record to your batch's JSON `records` array:

```json
{ "key": "<claimTypeId>|plaintiffElement|<elementId>",
  "verifiedAt": "2026-10-07", "outcome": "authored", "fingerprint": "",
  "sources": [ { "sourceUrl": "<same url>", "pinpoint": "s. 43 (1)", "quote": "<words copied exactly from the file>" } ],
  "howRead": "Vendored corpus file docs/sources/corpus/<file>.txt" }
```

Keys: `|defendantConsideration|<id>` for a consideration, and
`<claimTypeId>#note<index>` with kind `proceduralNote` written as
`<claimTypeId>|proceduralNote|<claimTypeId>#note<index>` — copy the key format
from an existing procedural-note record in `catalogue-verification.json`
(search it for `#note0`). Every `sourceUrl` and `alsoCites` url of the entry
must appear among the record's `sources`. Quotes may skip material with
` ... `; each piece must be in the file on its own.

## Voice and limits

Plain words, grade 8, for a person with no lawyer. Say what the law requires
and what has to be shown. Never say whether anyone will win, whether a case is
strong or weak, what a judge will think, or what the other side may argue (the
check refuses "may argue", "likely to", "strong", "weak", "credible",
"persuasive", "viable"...). "May" in the law stays "may"; never turn it into
"must", and never add "only" where the law does not say it.

## Check your work, in this order

    node --import tsx scripts/content/fingerprintBatch.ts --batch <batch>
    node --import tsx scripts/verification/verifyCatalogueVerification.ts
    node --import tsx scripts/verification/verifyClaimLibrary.ts
    node --import tsx scripts/verification/verifyClaimTypeCatalogue.ts
    node --import tsx scripts/verification/verifyIntakeCoverage.ts
    node --import tsx scripts/verification/verifyClaimTypeMatcher.ts

Fix every failure that comes from your batch until all pass. Run the
fingerprint step again after any change to an entry's text. If a failure
comes from another batch, leave it and say so.

Reply in under 300 words: the case types written, any you could not support
from the saved text, and anything you were unsure of.
