# Courthouse Tracking — Design Spec

Status: **design only, not implemented.** No content, schema, or UI code from
this document exists in the codebase yet. Filed as an open item in
`docs/INTAKE_STATUS.md`, buildable-now tier — unlike Tier 3 of
`docs/DEADLINE_TRACKING_DESIGN.md`, this feature computes nothing and
carries no counting-method risk, so it needs no licensee gate. The
TypeScript shapes below are illustrative design artifacts, the same
convention `docs/RESEARCH_GUIDANCE_DESIGN.md` and
`docs/DEADLINE_TRACKING_DESIGN.md` use for their own schema sections — not
a final schema to migrate or implement as written.

## 1. A correction, checked before designing anything

The request framed this as pairing with "the 'Find your courthouse' link
just added." Searched first, per standing practice this session: **no such
link exists anywhere in this codebase.** Grepped for `courthouse`,
`court-location`, `ocj/court`, and `ontariocourts.ca/ocj` across the whole
repo — the only hits are unrelated prose in `familySafetyResources.ts`
(describing Ontario's *own* courthouse-by-courthouse support-worker
listing, not a link this site added) and an incidental match in a
Supabase snapshot file. There is currently no locator link, on any page,
anywhere in this codebase, for a user to click.

This doesn't block the design — the feature's shape doesn't depend on
exactly which page the link lives on — but it does mean §3 below describes
*candidate* placements for both the link and the confirmation step
together, not a fixed slot next to something that already exists. Whoever
builds this should either add the link as part of the same piece of work,
or confirm first whether it was added in a session this document's author
didn't have visibility into.

## 2. The model: the site never determines jurisdiction itself

Checked directly this session, not assumed:

- **`ontariocourts.ca/ocj/court-locations/`** is not a functional search
  tool over an exposed dataset — it's an informational/navigational page
  that tells the user where to go (the Ministry of the Attorney General's
  own tools), with no API or data endpoint surfaced.
- **`ontario.ca/locations/courts/`** is a real, working search tool
  (postal code / address / city / courthouse name, with a court-type
  filter) — but it's a search UI, not a public API. There is nothing here
  for this codebase to call programmatically.

So the model is exactly what the request describes, and it's the only
honest option given what these two pages actually are: the site links the
user to Ontario's real locator, the user does the lookup themselves on
Ontario's site, and then tells this site what they found. The site's job
is capturing and remembering that confirmed answer — never looking it up,
never guessing at it, never inferring it from a city or postal code the
user typed elsewhere.

### 2.1 A related existing fact this feature formalizes

`app/api/generate-form/route.ts`'s `getCaseValues()` already reads a loose
`courtLocation` value onto every generated form — `extra.courtLocation ||
extra.court || extra.city ||` a `deepPick` fallback over the same three
keys (`app/api/generate-form/route.ts:694-699`). This is free text a user
typed somewhere in intake (a city, sometimes just `city` from the location
gate), never verified against anything, and it's what fills a form's
"court location" field today. It is **not** the same field
`questionBank.ts`'s `KNOWN_FACT_FIELDS` tracks — that list
(`questionBank.ts:33-49`) has no `courtLocation`/`city` entry at all; this
value lives only in the builder's free-text intake fields
(`IncomingData`/`extra`), outside the fact-confirmation system entirely.

This feature doesn't replace that mechanism — it gives it something better
to read from. A confirmed courthouse name and address is strictly more
precise and more trustworthy than a city the user typed once during
intake and that nothing since has verified. §4 covers exactly how a form
would prefer the confirmed value when present.

## 3. Where it's captured in the flow

Three candidate touchpoints, not narrowed to one — this is exactly the
kind of "not designed further here" decision `docs/DEADLINE_TRACKING_DESIGN.md`
§2.2 leaves open for its own case-timeline surface, for the same reason:
picking the exact route/component is implementation work for whichever
session builds this, not a decision this spec needs to force.

1. **Alongside wherever the locator link itself lands.** The most direct
   pairing, matching the request's own framing — the link out to
   `ontario.ca/locations/courts/`, and directly beside it, a short
   "Confirm the courthouse you found" form (two fields: name, address).
   This is the natural home once that link exists somewhere concrete.
2. **The builder's location step.** `HomeLocationGate.tsx` already
   collects province and city before intake begins
   (`app/_components/HomeLocationGate.tsx:193-195`) — a courthouse
   confirmation is a natural, more specific follow-on to that same
   location context, though it would need to happen after the user has
   actually done the external lookup, which this early a step may be too
   soon for.
3. **The case workspace / `IntelligenceOverviewPanel.tsx`'s case
   snapshot.** The panel already assembles a plain-language case summary
   from confirmed facts (`app/builder/_components/IntelligenceOverviewPanel.tsx:111-119`)
   — a "Courthouse" line here, with a "confirm it" prompt when unset,
   would put the capture step where a user already reviews their case
   facts, rather than only at first intake.

Wherever it lands, the UI pattern is the same one `docs/DEADLINE_TRACKING_DESIGN.md`
§5.1 already designed for Tier 3 confirmation and the one already shipped
for forms (`app/forms/page.tsx`'s "Verified form confirmation" section,
`app/forms/page.tsx:848-930`, `saveApplicability()` at
`app/forms/page.tsx:636-664`): a visible link out to the real source, an
explicit form to enter what the user found, and a save step — never an
inferred or auto-filled value.

(Note for whoever reads `docs/DEADLINE_TRACKING_DESIGN.md` alongside this
spec: that document cites this same section at slightly different line
numbers — `app/forms/page.tsx` was edited by an intervening session after
that doc was written, shifting line numbers in this exact region. The
numbers above were re-checked directly against the file as it stands
today; that older document's citations were not corrected, since doing so
is outside this session's scope.)

## 4. The confirm-and-store schema

```ts
export type CourthouseConfirmation = {
  caseId: string;
  /** Exactly as it appeared on the official locator -- e.g. "Toronto Small Claims Court". Never inferred or normalized against a lookup table. */
  courthouseName: string;
  /** Full address as shown on the official locator. */
  courthouseAddress: string;
  /** ISO date the user confirmed this -- ontario.ca/locations/courts/, the only source this points at (see 1). */
  confirmedAt: string;
  /** Fixed literal -- same provenance-tagging convention as UserDeadlineEntry.source / RuleConfirmedDeadlineEntry.source in DEADLINE_TRACKING_DESIGN.md 2.1/5.3. Leaves room for a second, distinct value later if a self-hosted directory (6) is ever built and offers its own confirm flow. */
  source: "user-confirmed-from-official-locator";
};
```

**Where it lives:** the closest existing precedent is `formApplicability`
on `master_result` — a single JSON object of user-confirmed answers,
merged onto the case record rather than tracked in its own table
(`mergeFormApplicability()`, `app/api/cases/form-applicability/route.ts:132-138`).
`master_result.courthouseConfirmation?: CourthouseConfirmation` follows
that exact shape: one confirmed object, present once set, absent (not an
empty placeholder) until the user actually confirms something — the same
"absent means not yet, not empty means confirmed-but-blank" distinction
`docs/RESEARCH_GUIDANCE_DESIGN.md` §6.2 uses for its own
`disclosureInProceeding` field. Whether it should instead be a dedicated
column or small table of its own (only relevant if a case is ever
expected to track more than one courthouse — see the open question in
§7) is implementation-scoping work, not decided here.

**No computed field anywhere in this shape.** Every value is either typed
in by the user (`courthouseName`, `courthouseAddress`) or a plain
timestamp of when they did it (`confirmedAt`). There's no rule, no
lookup, no derivation — which is exactly why this feature needs no
licensee gate the way Tier 3 of `docs/DEADLINE_TRACKING_DESIGN.md` does
(§7 there): there is no counting method, no jurisdictional boundary being
asserted, nothing that can be silently wrong in the way a computed
deadline can be. The only thing that can go wrong is the user mistyping
what they read off Ontario's own site, which is a data-entry error, not a
legal-accuracy failure this site is responsible for.

## 5. Checked against the "who does the applying" test

| Not allowed (system determines jurisdiction) | Allowed (this feature's actual behavior) |
|---|---|
| Inferring a courthouse from the city/postal code already in intake and presenting it as the answer. | Linking the user to Ontario's own locator and asking them to report back what they found — the system captures a fact, never derives one. |
| "Based on your address, your courthouse is [X]." | "Find your courthouse using Ontario's official court locator, then tell us what you found so we can remember it for this case." |
| Silently matching a typed courthouse name against an internal list and correcting/normalizing it. | Storing exactly what the user typed, unmodified — no matching, no autocomplete against a canonical list (unless and until §6's directory is built, and even then a confirmed value the user already typed is never silently overwritten). |
| Treating an unconfirmed value (e.g. the free-text `city` field from §2.1) as if it were the confirmed courthouse. | Every surface that reads this data checks for `courthouseConfirmation` specifically, distinct from the older, unverified `courtLocation`/`city` field — never conflating the two. |

This is the same review posture every content and confirm-before-track
design in this codebase gets checked against
(`docs/RESEARCH_GUIDANCE_DESIGN.md` §2, `docs/DEADLINE_TRACKING_DESIGN.md`
§3.3/§5.4) — the system's only claim here is "you told us this," which is
directly verifiable by the user against what they typed, the same
guarantee `docs/DEADLINE_TRACKING_DESIGN.md` §2.4 states for Tier 1.

## 6. Where it would resurface, once confirmed

- **Form generation.** `getCaseValues()`'s `courtLocation` field
  (§2.1) is the clearest, most concrete consumer: once
  `master_result.courthouseConfirmation` exists, `getCaseValues()` would
  prefer `courthouseConfirmation.courthouseName` over the current
  `extra.courtLocation || extra.court || extra.city` fallback chain,
  giving every generated form a verified courthouse name instead of
  whatever free text happened to be typed during intake. Not built here —
  named as the direct, obvious beneficiary.
- **Evidence-checklist and procedural framing.** Anywhere this codebase
  tells a user where to file or serve something, a confirmed courthouse
  address is more useful than a city name — e.g. a future evidence
  checklist item like "confirm the courthouse's specific filing
  requirements" could link directly to the confirmed address rather than
  a generic prompt.
- **Future deadline/filing content.** `docs/DEADLINE_TRACKING_DESIGN.md`'s
  Tier 2 (sourced general deadline information) and any future
  service/filing-location content would read the same confirmed value —
  e.g. general guidance about where documents must be filed becomes more
  concrete once a specific courthouse is on record, without the guidance
  itself becoming case-specific legal advice (it still states what's
  generally required at that location, never asserts the user's filing is
  correct).
- **Court package assembly** (`app/court-package/page.tsx` exists as a
  route today; its current content wasn't read as part of this design
  session, so no claim is made here about what it already does with
  location data — only that a case's confirmed courthouse is plausibly
  relevant to whatever this page assembles, and should be checked when
  that page is next touched).

None of these are built in this spec. They're named so whoever implements
the confirm-and-store schema (§4) doesn't have to separately rediscover
where the value would actually get used.

## 7. Future data source, flagged not scoped

`ontario.ca/locations/courts/` doesn't only offer the search box — it also
publishes a static alphabetical (A–Z) index of every Ontario court
location, each entry a courthouse name and address as a clickable link,
confirmed live this session via direct fetch. This is a real, structured,
scrapable-in-principle dataset that could seed a self-hosted courthouse
directory later — letting the confirm step become a pick-from-a-list
instead of free-text entry, and potentially enabling the normalization
`§5`'s table explicitly rules out for *this* design.

That is real, separate, larger sourcing work — deciding how to capture
~200+ courthouse records, keeping them current as Ontario's own list
changes, and building whatever UI a directory implies — and is explicitly
**out of scope for this session and this spec**. Flagging its existence
and real feasibility now so it doesn't need rediscovering, not scoping it.

## 8. Summary of what this spec decides vs. leaves open

**Decided:** the model — the site never determines jurisdiction, only
captures what the user found on Ontario's real locator and confirms back
(§2), verified directly this session that neither locator page exposes an
API (§2); the confirm-and-store schema, with a single fixed `source`
literal for provenance and explicit non-computation of every field (§4);
that this feature needs no licensee gate, unlike Deadline Tracking's Tier
3, because nothing in it is computed or asserted (§4); the "who does the
applying" boundary with concrete allowed/not-allowed phrasing, including
that a confirmed courthouse must never be conflated with the pre-existing,
unverified `courtLocation`/`city` free-text field already read by
`getCaseValues()` (§2.1, §5); where the confirmed value would resurface
once built, led by form generation as the clearest concrete consumer
(§6); that a static, fetchable A-Z courthouse index exists on
`ontario.ca/locations/courts/` as a real future data source, without
scoping the directory itself (§7).

**Left open, deliberately:** that no "Find your courthouse" link
currently exists anywhere in this codebase, contrary to how this task was
framed — flagged plainly rather than silently designed around (§1); which
of the three candidate capture points (§3) is the real one, and whether
the link should be built as part of the same work; whether storage should
live on `master_result` (matching `formApplicability`'s precedent) or as
its own table/column, relevant only if a case is ever expected to track
more than one courthouse; the exact UI copy and form fields beyond the
two-field name/address shape in §4; whether/when the self-hosted
directory in §7 gets built. None of these block filing this as a planned,
buildable-now item — they're the concrete next steps for whichever
session picks it up.
