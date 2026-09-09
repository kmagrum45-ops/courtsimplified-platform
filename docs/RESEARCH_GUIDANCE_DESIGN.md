# Institutional Research Guidance — Design Spec

Status: **design only, not implemented.** No content, schema, or UI code from
this document exists in the codebase yet. Filed as an open item in
`docs/INTAKE_STATUS.md`. This spec describes the shape, the schema, and
where it plugs in — it does not write the actual sourced content, which is
real research work for a later session (see §7).

## 1. The idea, and why it's not a general guide

Every institution operates under written standards it set for itself. A
school board has supervision schedules, safe-schools policies, and
police-notification requirements. A police service has procedures and
oversight bodies. A licensed business or regulated trade has licensing
conditions, a regulator, and its own published terms. Most self-represented
people never think to go looking for those documents — not because the
documents are hard to get, but because nobody told them the documents
exist.

This is scoped from a real case: a student injured at school, where the
school's own supervision schedule showed staff should have been present and
weren't, its own protocol required police notification that never happened,
and its own head-injury monitoring procedure wasn't followed. None of that
required a lawyer to spot. It required knowing where to look.

The second half is FOI (freedom-of-information requests): knowing that
internal institutional records can be requested at all, which statute
governs the request, and how to word it so the institution can actually act
on it.

This is **not** a general "how to investigate an institution" guide. Like
every other content registry in `src/lib/case-system/intake/`, it is
deterministic, sourced, claim-type-and-fact-gated content — the same
pattern as `claimTypes.ts`/`educationTopics.ts`/`remedyTypes.ts`, extended
to a new content shape, not a new mechanism.

## 2. The section-3 boundary, checked against every design decision below

CLAUDE.md section 2's "who does the applying" test governs this feature
end to end:

> Legal INFORMATION = the system explains law generally; the USER applies
> it to their facts. Legal ADVICE = the SYSTEM applies law to the user's
> facts.

Applied here specifically:

- The feature teaches **that** categories of written standards typically
  exist for a type of institution, and **how** to go find them (where
  they're typically published, what they're typically called, what
  statute or policy requires them). It never asserts that a *specific*
  institution has a *specific* document, and never asserts what that
  document would show.
- The feature never concludes that an institution breached a duty, fell
  short of a standard, or was negligent. It never assembles a case theory
  connecting "the document says X" to "therefore the institution is
  liable." That step — reading what was found and deciding what it means —
  stays with the user (or the paralegal/lawyer they eventually bring it
  to), same as every other place in this codebase the AI-intake design
  draws that line.
- The FOI component teaches the request *process* — which act applies,
  what a request needs to be specific and answerable, how to word one. It
  never drafts a request populated with a user's specific allegations, and
  never tells a user what a requested record will contain before they've
  seen it.

Concrete sentence pairs, in the voice this content will actually use:

| Not allowed (applies law to facts) | Allowed (surfaces the topic, method stays with the user) |
|---|---|
| "Because the school's supervision schedule shows no staff were present, the school breached its duty of care." | "School boards generally maintain a supervision schedule assigning staff to specific times and locations. If you want to see whether one existed for the time and place in question, that's a record a school board typically holds and that you can request." |
| "The police should have been notified under the board's own policy, so the board is liable for that failure." | "Some school board policies set out when police must be notified of a specific kind of incident. Ontario's Ministry of Education issues Policy/Program Memoranda that require boards to have codes of conduct and safety protocols — a board's own version of that document is worth requesting to see what its notification threshold actually was." |
| "This proves the officer didn't follow procedure." | "Police services operate under their own procedures and are subject to oversight bodies. Those procedures, and complaint/oversight records, are generally accessible — here's how municipal police records are requested and which office handles a complaint about conduct." |
| "You have a strong FOI claim here." | "A request under [the applicable act] needs to identify the record with enough specificity that the institution can locate it — a date range, a named policy or incident, or a specific record type, rather than an open-ended request for 'everything.'" |

Every entry added to this content (§4–§6) gets checked against this table
before it ships, the same review posture `claimTypes.ts`'s own header
describes for its existing entries.

## 3. Three components, one research-skills layer

This spec covers two of three pieces. The third — CanLII research guidance
(neutral citations, the citing-documents view, checking negative
treatment) — is **not a separate feature**; it's the third leg of the same
"teach the research method, the user applies it" layer, already filed as
its own open item in `docs/INTAKE_STATUS.md`. All three share the same
section-2/section-3 posture: teach how to find and read a category of
source, never generate or apply findings to a user's specific facts.

1. **Institutional written-standards guidance** (§4) — what internal
   policies/procedures a category of institution typically has, and where
   they're typically published or how to get them.
2. **FOI request guidance** (§5) — MFIPPA vs. FIPPA, the request process,
   what makes a request usable.
3. **CanLII research guidance** (filed separately in
   `docs/INTAKE_STATUS.md`) — not designed in this document.

## 4. Institutional written-standards guidance

### 4.1 Schema

New file: `src/lib/case-system/intake/institutionalRecordsTopics.ts`.
Reuses `EducationCitation` from `educationTopics.ts` and `FactCondition`
from `questionBank.ts` rather than redefining either — same convention
every existing registry in this directory follows.

```ts
export type InstitutionCategory =
  | "school-board"
  | "municipality-police"
  | "licensed-business-regulated-trade";

export type InstitutionalRecordEntry = {
  /** e.g. "Supervision schedule", "Code of conduct", "Police-notification protocol" */
  name: string;
  /** What it typically is and why it exists -- general, not this user's facts. */
  plainExplanation: string;
  /**
   * Where this category of document is typically published or how it's
   * typically obtained -- e.g. "usually posted on the board's own policy
   * page" or "not usually public; request under MFIPPA." Never a specific
   * institution's specific URL -- see 4.3.
   */
  typicalAccessRoute: string;
  /** What in law/policy requires this kind of document to exist. */
  basisSourceUrl: string;
};

export type InstitutionalRecordsTopic = {
  id: string;
  institutionCategory: InstitutionCategory;
  courtArea: CourtArea[]; // from questionBank.ts -- see 4.4 on why this is an array here, unlike EducationTopic's single value
  title: string;
  /** General framing: what kind of accountability structure this institution category typically operates under. */
  plainExplanation: string;
  records: [InstitutionalRecordEntry, ...InstitutionalRecordEntry[]];
  /** Omitted means generally relevant to this institution category, not further fact-gated. */
  surfacedWhen?: FactCondition;
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};
```

### 4.2 The three categories, and what each would cover

This section describes the *shape* of content per category — the kinds of
standards that typically exist and the kinds of records a person might
request. No specific institution's specific document is named; no
citation is finalized. Real sourcing is §7.

**1. School boards**

Typical written standards: codes of conduct, supervision/yard-duty
schedules, safe-arrival and safety protocols, police-notification
thresholds (often driven by a school board / police service protocol,
common across Ontario boards), bullying-prevention and intervention
plans, special-education/IEP-related procedures, incident-reporting and
head-injury/concussion-management procedures (Ontario has a
concussion-protocol framework applicable to school boards), transportation
and field-trip safety policies. These generally exist because the
Education Act and Ministry of Education Policy/Program Memoranda (PPMs)
require boards to have them, even though the *content* of a specific
board's version isn't centrally published by the province — each board
publishes (or must be asked for) its own. Records a person might request:
the specific supervision schedule for a given day/location, incident
reports, the board's concussion-protocol documentation for a specific
incident, correspondence about a specific student (subject to separate
student-record access rules, distinct from general FOI), board policy
manual excerpts.

**2. Municipalities and police services**

Typical written standards: municipal by-laws and policies, police service
procedures (governed by policing legislation and Ministry-issued
standards), use-of-force and de-escalation policies, complaint-handling
procedures. Police services in Ontario are also subject to independent
oversight bodies (bodies that investigate serious incidents involving
police, and a separate conduct-complaints body) — distinct from an FOI
request to the police service itself, and worth teaching as a separate
avenue. Note for content-drafting: a municipality and its police service
are legally distinct institutions with separate governance (a police
services board, not the municipal council, generally governs police
policy) — the content must not conflate "ask the city" with "ask the
police service." Records a person might request: incident/occurrence
reports, a specific policy or procedure in effect on a given date,
by-law enforcement records, oversight-body complaint/investigation
outcomes (via that body's own process, which may not be a standard FOI
request at all).

**3. Licensed businesses and regulated trades**

Typical written standards: the licence or registration itself (often
publicly searchable through the relevant regulator), the regulator's
standards of practice or code of conduct that licensees are bound by,
required disclosures (e.g. consumer-protection disclosure obligations
already covered by some existing `CLAIM_TYPES` entries), complaint and
discipline records held by the regulator. This category is structurally
different from the first two: the relevant "institution" is often the
*regulator*, not the business itself, and many regulators publish licence
status, standards, and even discipline decisions directly on their own
public website — no FOI request needed for a meaningful amount of this.
Records a person might request: licence status and history, standards of
practice in effect at the relevant time, prior complaints or discipline
against the same licensee (where the regulator publishes or discloses
this), the business's own internal policies where FOI or an equivalent
disclosure obligation applies (this varies a great deal by trade/sector
and is the part of this category most in need of real sourcing per
regulator, not a single unified rule).

### 4.3 Why no fixed URL is cited for the standard itself

Every other citation in this codebase (`claimTypes.ts`, `educationTopics.ts`,
`remedyTypes.ts`) points at one fixed, stable page — an ontario.ca guide,
a statute, a court forms page. That doesn't work for "a school board's
supervision schedule," because there are 72 school boards, hundreds of
municipalities, dozens of police services, and many regulators, each
publishing (or not publishing) their own version at their own URL that
this codebase cannot maintain 72+ links for and keep current.

The design resolves this by citing the *basis* — the statute or PPM that
requires the standard to exist — rather than any specific board's
specific document (`basisSourceUrl` in §4.1's schema). The
`typicalAccessRoute` field then teaches the user how to go find their own
institution's version (its policy page, or a request if it isn't public).
This is itself a section-3-compliant design choice, not a shortcut around
sourcing: the platform states a verified fact ("boards are required to
have X") and teaches a method (how to locate this board's X), rather than
fabricating or guessing at content it cannot verify per-institution.

### 4.4 Why `courtArea` is an array here

`EducationTopic`/`RemedyTopic`/`ClaimType` all use `courtArea:
"small-claims"` as a single literal, because `CLAIM_TYPES` today only has
Small Claims content. Institutional-liability matters don't respect that
boundary — the case that motivated this feature (a student injury) is
exactly the kind of matter likely to exceed the $50,000 Small Claims limit
and land in Civil instead. `InstitutionalRecordsTopic.courtArea` is
designed as `CourtArea[]` so a single topic (e.g. "school board written
standards") can be marked relevant to both `small-claims` and `civil`
without duplicating the entry — see §6.2 for the more significant gap this
creates on the surfacing side.

## 5. FOI request guidance

### 5.1 Schema

New file: `src/lib/case-system/intake/foiGuidance.ts`.

```ts
export type FoiGoverningAct = "MFIPPA" | "FIPPA";

export type FoiGuidanceTopic = {
  id: string;
  /** Which institutions this act covers -- see 5.2. Descriptive, not exhaustive. */
  governingAct: FoiGoverningAct;
  title: string;
  plainExplanation: string;
  /** Ordered, general process steps -- never a filled-in draft request. */
  processSteps: string[];
  /** What a request needs to include to be actionable, per the IPC's own guidance. */
  requestSpecificityGuidance: string[];
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};
```

### 5.2 MFIPPA vs. FIPPA — what the content needs to cover

Ontario has two parallel freedom-of-information statutes, and a user
needs to know which one governs the institution they're dealing with
before they can address a request correctly:

- **MFIPPA** (the *Municipal* Freedom of Information and Protection of
  Privacy Act) governs local/municipal-level public institutions —
  municipalities, local police services boards, and school boards are
  the three examples directly relevant to §4's three categories.
- **FIPPA** (the Freedom of Information and Protection of Privacy Act)
  governs provincial-level institutions — ministries, and most provincial
  agencies, boards, and commissions (which is where many of §4.2's
  regulators for licensed trades are likely to fall, though this needs
  confirming per regulator, not assumed).

Both statutes are overseen by the same body, the Information and Privacy
Commissioner of Ontario (IPC), which is the authoritative source for the
request process itself (§5.3) regardless of which act applies. The exact
institutional coverage line for each act — and confirmation of which act
covers which specific regulator in §4.2's third category — is real
sourcing work for §7, not asserted as final here.

### 5.3 The request process and what makes a request usable

Content to build, sourced from ontario.ca and the IPC (ipc.on.ca), not
drafted here: how to identify the correct institution and its designated
FOI/records office; that a request should be specific enough to let the
institution locate the record (a date range, a named record type or
policy, a specific incident or event — not an open-ended "everything you
have about..."); that there are prescribed fees and response-time rules;
that some records or portions can be withheld under stated exemptions
(e.g. ongoing investigations, personal information of third parties) and
that a refusal can itself be appealed to the IPC; and that requests
involving a student's own records, or a person's own personal
information, may follow a related-but-distinct access route from a
general FOI request. All of this is process information, sourced and
general — never a filled-in template naming a user's specific incident or
allegation. A future content review must confirm each of these points
directly against ontario.ca/ipc.on.ca before anything ships (§7).

## 6. How this attaches to `ClaimType` and where it surfaces

### 6.1 Attachment: two complementary mechanisms, not one

**Mechanism A — id references from `ClaimType` (primary, works today).**
Same convention as `remedies: string[]` and `applicableDefenceConceptIds:
string[]` on `ClaimType` (`claimTypes.ts:286-289`): add
`institutionalRecordsTopicIds?: string[]` and `foiGuidanceTopicIds?:
string[]`, referenced by id, not duplicated. This lets an existing Small
Claims claim type — e.g. a dog-bite claim against a municipality, a
contractor-damage claim against a licensed trade — reference the relevant
institution-category content directly, exactly the way the user asked
this to be designed. This works immediately for any `CLAIM_TYPES` entry
whose `typicalDefendantProfile` is `"business"` or that plausibly involves
a public institution.

**Mechanism B — a new fact-gated surface, independent of a matched claim
type (needed for the motivating case, and for Civil generally).** §4.4
already flags that `CLAIM_TYPES` is Small-Claims-only, and that the
motivating case (a student injury) is more likely a Civil matter, which
has no equivalent structured claim-type registry to attach to —
`CivilIntake.tsx` builds its `AnalysisResult` independently (see
`docs/AI_INTAKE_DESIGN.md`/`docs/INTAKE_STATUS.md` for the existing
Small-Claims/Civil parity gaps this isn't the first design to hit).
Rather than block this entire feature on Civil first getting its own
`ClaimType`-equivalent content registry, `InstitutionalRecordsTopic`'s own
`surfacedWhen?: FactCondition` (§4.1) lets it surface directly off a fact,
independent of any matched claim type — the same pattern
`EducationTopic`/`RemedyTopic` already use for content that's "generally
relevant," not narrowly tied to one claim type.

That requires one new fact: something capturing what kind of party the
user is dealing with. `questionBank.ts`'s `KNOWN_FACT_FIELDS` has no such
field today (`role`, `disputeCategory`, and five free-text fields is the
full list). A minimal addition — e.g. an `otherPartyType` fact with values
like `"school-board" | "municipality-or-police" | "licensed-business" |
"individual" | "other"`, captured by one new guided-intake question — is
the smallest change that would let Mechanism B work across Small Claims,
Civil, and (eventually) Family without waiting on a larger registry
build-out. This new fact field is **not** built in this spec; it's named
as the specific, minimal dependency Mechanism B needs, so a future session
scoping the real implementation isn't left to rediscover it.

Recommendation: build Mechanism A first (zero new fact-collection surface,
works for Small Claims immediately), design Mechanism B's schema now
(already done, in §4.1's `surfacedWhen`) but treat the new
`otherPartyType` fact and its question-bank entry as a separate, explicit
follow-up — not silently bundled into "just add the content."

### 6.2 UI surfacing point

Primary surface: extend `claimTypeOverviewContent.ts`'s
`ClaimTypeOverviewContent` (currently `evidenceToOrganize` +
`courtPoints`, `claimTypeOverviewContent.ts:58-65`) with a third field,
e.g. `institutionalRecordsToOrganize: SourcedListItem[]`, built the same
way `evidenceToOrganize` already is — deduplicated, each item carrying the
`sourceUrl` (here, `basisSourceUrl`) of the topic that introduced it.
`IntelligenceOverviewPanel.tsx` would render it as a new card next to the
existing "Points the court may need clarified" card
(`IntelligenceOverviewPanel.tsx:131`) — something like "Records this kind
of institution may hold" — following the identical list-with-source-link
rendering already used there. This is the most directly useful surface:
it appears exactly where a user is already reviewing their case, tied to
the specific institution type their own facts matched.

Secondary, independent surface (not required to ship the first version):
a dedicated reference page, following `/legal-principles`
(`app/legal-principles/page.tsx`)'s existing pattern of a standalone page
listing sourced cards with citations, browsable by institution category
regardless of whether a case has been started or matched a claim type.
Worth building once there's enough content to make browsing useful on its
own, not a blocker for the first version landing inside the builder flow.

### 6.3 `verifyIntakeCoverage.ts` coverage (future, not built this session)

The existing coverage script (`scripts/verification/verifyIntakeCoverage.ts`)
already checks source-URL resolvability and dangling id references across
`EDUCATION_TOPICS`, `REMEDY_TYPES`, and `CLAIM_TYPES`
(`verifyIntakeCoverage.ts:9-10,96`). Landing this feature means extending
that script the same way: import `INSTITUTIONAL_RECORDS_TOPICS` and
`FOI_GUIDANCE_TOPICS`, check every `basisSourceUrl`/citation resolves,
check every `institutionalRecordsTopicIds`/`foiGuidanceTopicIds` reference
on a `ClaimType` points at a real entry, and report topic/status counts in
its existing summary line the same way it already reports education and
remedy topic counts.

## 7. What content needs real sourcing, and from where (not done this session)

Nothing below is verified or written yet. Per CLAUDE.md section 2, no
entry ships without a direct-fetched, resolvable citation and a
verification date; this list is the research plan, not the content.

- **School boards:** Education Act provisions requiring boards to have
  codes of conduct/safety policies; Ministry of Education Policy/Program
  Memoranda (PPMs) covering safe schools, bullying prevention, and
  concussion/head-injury protocols; MFIPPA's application to school boards
  specifically. Source: ontario.ca, the Ministry of Education's PPM index.
- **Municipalities and police services:** the policing-legislation
  provisions requiring police services to have written procedures; the
  identity and mandate of Ontario's police-oversight bodies (distinct from
  a records request to the service itself); MFIPPA's application to
  municipalities and police services boards. Source: ontario.ca, the
  relevant oversight bodies' own sites (to be identified and confirmed,
  not named here).
- **Licensed businesses and regulated trades:** which regulators fall
  under FIPPA vs. operate independently with their own public-disclosure
  practices; what a handful of common regulators (to be chosen in a later
  session, not decided here) actually publish about licensees. Source:
  ontario.ca, each regulator's own site once chosen.
- **FOI process (both acts):** MFIPPA/FIPPA institutional coverage lines,
  request requirements, fees, timelines, exemptions, and the appeal route
  through the IPC. Source: ontario.ca, ipc.on.ca (the IPC's own guidance
  is the authoritative source for the request process itself, same as
  Ontario Courts is the authoritative source for court procedure
  elsewhere in this codebase).

## 8. Summary of what this spec decides vs. leaves open

**Decided:** the schema for both content types (§4.1, §5.1); that
citations point at the statutory/policy basis, never a specific
institution's specific document (§4.3); that attachment uses both an
id-reference mechanism (works today) and a fact-gated mechanism (needed
for Civil and for matters with no matched claim type) rather than picking
only one (§6.1); that the primary UI surface is the existing
`IntelligenceOverviewPanel.tsx` card pattern, with a `/legal-principles`-
style page as an independent secondary option (§6.2).

**Left open, deliberately:** the actual sourced content (§7); the new
`otherPartyType` fact field and its question-bank entry that Mechanism B
depends on (§6.1); which specific regulators to build first for the
licensed-trades category (§7); whether/when to build the standalone
reference page (§6.2). None of these block filing this as a planned item —
they're the concrete next steps for whichever session picks it up.
