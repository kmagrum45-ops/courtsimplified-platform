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

Real use of an earlier prose draft of this schema showed that "how you get
this document" is not one fuzzy idea — it's four distinct, mutually
exclusive routes, and which one applies changes what a user should
actually do next. Burying that in a free-text `typicalAccessRoute: string`
field meant the distinction lived only in whatever words a content author
happened to choose, unreadable by the surfacing layer. The four routes,
in order of how a user would typically encounter them:

1. **`published`** — on the institution's own site or a government site.
   A board's code of conduct, its policy manual, the Ministry PPMs behind
   them. No request needed at all.
2. **`exists-not-published`** — an operational record nobody posts, but
   which the institution will often provide on a direct, informal request
   to the relevant office (the school, the board office, the service
   itself) — a supervision schedule for a specific day and location, an
   incident report, concussion-protocol documentation for a specific
   event. **This is the most important route**, not the formal one: for
   most of what actually mattered in the motivating case, the barrier was
   never obtaining the document — it was knowing the document existed and
   what it was called. A user cannot request what they cannot name. This
   route's whole job is naming it.
3. **`formal-access-request`** — where an informal ask fails or the
   institution says it needs one, and the user files under the applicable
   act (MFIPPA/FIPPA, §5). Carries fees, prescribed response timelines,
   exemptions, and an appeal route through the IPC.
4. **`disclosure-in-proceeding`** — available only once a claim has been
   filed, and structurally different from the first three: it's an
   obligation on the *other party* to produce relevant documents, not a
   request to a records office. Gated on case stage — see §4.5.

```ts
export type InstitutionCategory =
  | "school-board"
  | "municipality-police"
  | "licensed-business-regulated-trade";

export type RecordAccessRoute =
  | "published"
  | "exists-not-published"
  | "formal-access-request"
  | "disclosure-in-proceeding";

export type RecordAccessRouteInfo = {
  route: RecordAccessRoute;
  /**
   * General description of how this route typically works for this
   * specific record -- e.g. "usually posted on the board's own policy
   * page" or "not usually posted; ask the school or board office
   * directly and name the record." Never a specific institution's
   * specific URL -- see 4.3. Never a promise that a specific institution
   * will actually provide it.
   */
  description: string;
};

export type InstitutionalRecordEntry = {
  /** e.g. "Supervision schedule", "Code of conduct", "Police-notification protocol" */
  name: string;
  /** What it typically is and why it exists -- general, not this user's facts. */
  plainExplanation: string;
  /**
   * The typical route BEFORE a claim is filed -- one of "published",
   * "exists-not-published", or "formal-access-request". A record entry
   * never carries "disclosure-in-proceeding" as its own typical route:
   * that route isn't a property of a specific document type, it's a
   * case-stage-gated fact about every record relevant to a filed claim.
   * See `DisclosureInProceedingGuidance` below and §4.5.
   */
  accessRoute: RecordAccessRouteInfo;
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

/**
 * Route 4 as its own top-level structure, not a fourth value content
 * authors reach for on a per-record basis -- see §4.5 for why, including
 * why this is deliberately two entries (Small Claims, Civil), never one
 * merged description.
 */
export type DisclosureInProceedingGuidance = {
  courtArea: "small-claims" | "civil";
  plainExplanation: string;
  /** Always `{ field: "claimFiled", op: "equals", value: true }` -- see §4.5. */
  surfacedWhen: FactCondition;
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};
```

### 4.2 The three categories, and what each would cover

This section describes the *shape* of content per category — the kinds of
standards that typically exist and the kinds of records a person might
request, each marked with its typical route from §4.1 so the grouping is
visible here, not just in the schema. No specific institution's specific
document is named; no citation is finalized. Real sourcing is §7. Every
category also gets `disclosure-in-proceeding` (route 4) once a claim is
filed — that's a cross-cutting overlay described once in §4.5, not
repeated per category below.

**1. School boards**

*Published* (on the board's own site or a Ministry site; no request
needed): code of conduct; general safe-arrival and safety protocol
statements; bullying-prevention and intervention policy; the board's
general policy manual; Ministry of Education Policy/Program Memoranda
(PPMs) — on the Ministry's site, not the board's; the board's general
concussion/head-injury protocol (Ontario's concussion-protocol framework
is public policy, even though a specific application of it usually isn't
— see next).

*Exists but not published* (operational records, typically obtained by
asking the school or board office directly and naming the record): the
supervision schedule for a specific day and location; incident reports
for a specific event; concussion-protocol documentation completed for a
specific incident; records of whether a police-notification threshold was
actually applied on a given occasion. This tier is the one the motivating
case actually needed — none of these four are secret, but none are posted
either.

*Formal access request* (MFIPPA, where an informal ask doesn't produce
the record): records the school or board office says it can't release
informally. Note: correspondence or records about a specific student
generally follow that student's/parent's own-records access route rather
than a general MFIPPA request — cross-cutting caveat, §4.6.

These generally exist because the Education Act and Ministry PPMs require
boards to have them, even though the *content* of a specific board's
version isn't centrally published by the province — each board publishes
(or must be asked for) its own; see §4.3 for why citations here point at
the basis, not a specific board's URL.

**2. Municipalities and police services**

*Published*: municipal by-laws; whichever police-service procedures a
given service chooses to post (varies by service); oversight-body
mandates and general complaint-process information.

*Exists but not published*: the specific policy or procedure in effect on
a given date, where not posted; incident/occurrence reports for a
specific event; by-law enforcement records for a specific address or
incident.

*Formal access request* (MFIPPA): records not provided informally.
Oversight-body complaint/investigation outcomes go through that body's
own process, which may not be a standard MFIPPA request at all — kept as
its own avenue in the content, not folded into "file an MFIPPA request."

Note for content-drafting, carried over unchanged: a municipality and its
police service are legally distinct institutions with separate governance
(a police services board, not the municipal council, generally governs
police policy) — the content must not conflate "ask the city" with "ask
the police service."

**3. Licensed businesses and regulated trades**

*Published*: licence or registration status (many regulators publish this
directly and searchably); the regulator's standards of practice or code
of conduct; discipline decisions the regulator chooses to publish.

*Exists but not published*: the business's own internal policies — this
varies a great deal by trade/sector and is the part of this category most
in need of real, per-regulator sourcing (§7), not a single unified rule.

*Formal access request*: complaint or discipline records the regulator
holds but doesn't proactively publish. Which act applies (MFIPPA or
FIPPA) depends on the regulator's own status and needs confirming per
regulator, not assumed — §5.2/§7.

This category is structurally different from the first two: the relevant
"institution" is often the *regulator*, not the business itself, which is
why so much of it sits in "published" rather than "exists but not
published" — a meaningful amount of this needs no request at all.

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
`accessRoute.description` field (§4.1) then teaches the user how to go
find their own institution's version (its policy page, or who to ask if
it isn't public). This is itself a section-3-compliant design choice, not a shortcut around
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

### 4.5 Route 4: gated on case stage, and never one description for both courts

Routes 1–3 are available to anyone, filed or not. Route 4
(`disclosure-in-proceeding`) is different in kind, not just in when it
applies: it's the other party's obligation to produce relevant documents
once a claim exists, not a request the user makes to a records office.
Showing it at the wrong time is a real failure in both directions, not a
cosmetic one:

- Showing it to someone who **hasn't** filed is actively harmful, not
  just premature: "you'll get it in discovery" answers a question the
  user isn't asking yet and is useless for the decision actually in front
  of them (whether and how to find the document *now*, before they've
  filed anything).
- Withholding it from someone who **has** filed, or — worse — steering
  them toward a formal access request when disclosure obligations already
  reach the record, wastes real money and time on a request they didn't
  need to make.

The design keys this off `claimFiled`, already a real field in
`questionBank.ts`'s `KNOWN_FACT_FIELDS` (no new fact needed here, unlike
Mechanism B in §6.1). `DisclosureInProceedingGuidance.surfacedWhen` is
always `{ field: "claimFiled", op: "equals", value: true }`: a user who
hasn't filed sees routes 1–3 only; a user who has also sees route 4,
additively — route 4 supplements what's shown, it doesn't replace it,
since routes 1–3 stay just as valid after filing as before.

**Small Claims disclosure and Superior Court discovery are not the same
procedure**, and this design does not resolve that here — it flags it so
a future session doesn't collapse them into one description. Small Claims
disclosure is governed by the Rules of the Small Claims Court (O. Reg.
258/98); Superior Court discovery is governed by the Rules of Civil
Procedure. The two have different scope, different mechanics, and
different formality. `DisclosureInProceedingGuidance` is typed with its
own `courtArea: "small-claims" | "civil"` (§4.1) specifically so these
ship as two separately sourced entries, never one merged paragraph
describing "disclosure/discovery" as though it's a single concept with
two names. Real sourcing for both is in §7.

### 4.6 Cross-cutting notes on access routes

Four things that apply across categories and, mostly, across routes 2 and
3 — general enough to belong in the schema and content guidance rather
than any one category's write-up.

**Why the informal/formal distinction is taught explicitly.** A formal
access request carries fees and statutory timelines an informal ask does
not. A user who doesn't know the difference fails in one of two
directions, and both are real: they never ask at all, because "requesting
records" sounds like a formal, expensive, lawyer-shaped step reserved for
route 3 — or they file a formal request for something a phone call to the
school office would have produced in a day, paying a fee and waiting
weeks for no reason. Teaching routes 2 and 3 as genuinely distinct, with
route 2 tried first, is what prevents both failure modes at once — this
is the concrete reason `accessRoute` is a required, typed field on every
record entry rather than a general "how to get institutional records"
paragraph.

**Route 3 has a real time cost.** Formal access requests carry statutory
response periods measured in weeks, not days. Content built for route 3
needs to say this plainly — that filing a formal request is not a fast
path — and, where a limitation period may be running, that waiting on a
records request outstanding is not itself a reason to delay whatever the
user otherwise needs to do. Consistent with §2: this stays a general fact
about how the formal-request process works, never a computed or implied
deadline for the user's own matter. The content says "a formal request
can take weeks to answer, and requesting records doesn't pause a
limitation period" — it never says "your deadline is X" or "you have
until Y."

**Records don't last forever.** Institutions destroy records on their own
retention schedules, so a record that exists today may not exist by the
time someone thinks to ask for it. This is stated as a general fact about
how institutions operate — a reason route 2 (ask early, ask directly) is
worth doing sooner rather than later — never as an urgency prompt tied to
a specific user's specific case ("your evidence may be destroyed" is not
language this content uses).

**A person's own records — or their child's — may follow a different
route.** §5.3 also notes this for the FOI process specifically; it's
stated here as a cross-cutting caveat because it affects routes 2 and 3
both, not just the formal-request route. A parent asking about their own child's
IEP, a person asking about their own personnel file, medical file, or
complaint history held by an institution — these commonly follow a
distinct access-to-one's-own-information regime (e.g. student records,
personal-information access rules that sit alongside but aren't identical
to general MFIPPA/FIPPA access) rather than the general "ask the records
office" path described in §4.2. Content for any record type that could
plausibly be about the requester (or their child) themselves needs to
flag this distinction rather than default to the general route.

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
that a refusal can itself be appealed to the IPC; and that a request
should flag when it's for the requester's own (or their child's)
information, since that may follow a different access route entirely —
see §4.6 for why this is a cross-cutting caveat, not an FOI-only one. All
of this is process information, sourced and
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

The plain `SourcedListItem[]` shape `evidenceToOrganize`/`courtPoints`
already use (`claimTypeOverviewContent.ts:53-56`) isn't enough for this
content: it has nowhere to carry the route, and §4.1–§4.6 exist
specifically so the route is a first-class, visible thing, not text a
user has to infer from how an item is worded. The surfacing type needs
its own shape rather than reusing `SourcedListItem` as-is:

```ts
export type InstitutionalRecordItem = {
  text: string;
  sourceUrl?: string;
  route: RecordAccessRoute; // from institutionalRecordsTopics.ts, §4.1
};

export type InstitutionalRecordsOverview = {
  /** Grouped by route so the UI renders one heading per group, not one flat list. */
  byRoute: Record<Exclude<RecordAccessRoute, "disclosure-in-proceeding">, InstitutionalRecordItem[]>;
  /**
   * Present only when claimFiled is true (§4.5) -- absent, not an empty
   * array, so the caller can tell "not filed yet" apart from "filed, but
   * nothing matched." Sourced from DisclosureInProceedingGuidance for the
   * case's own courtArea only -- never both Small Claims and Civil text
   * shown together (§4.5).
   */
  disclosureInProceeding?: InstitutionalRecordItem[];
};
```

Extend `claimTypeOverviewContent.ts`'s `ClaimTypeOverviewContent`
(currently `evidenceToOrganize` + `courtPoints`,
`claimTypeOverviewContent.ts:58-65`) with a fourth field,
`institutionalRecords: InstitutionalRecordsOverview`, built the same
deduplicated way `evidenceToOrganize` already is, grouped by
`accessRoute.route` (§4.1) as it's collected, and reading `claimFiled`
from the same `IntakeFacts` the rest of this pipeline already has in
scope to decide whether `disclosureInProceeding` is populated at all.

`IntelligenceOverviewPanel.tsx` would render up to four labeled groups
next to the existing "Points the court may need clarified" card
(`IntelligenceOverviewPanel.tsx:131`), each with its own short framing
so the route itself is what the user reads, not just the record name:

- **"Already public"** (`published`) — link straight to where it's
  typically posted.
- **"Ask for directly"** (`exists-not-published`) — the record name and
  who to ask, no fee/timeline framing, since none applies.
- **"Formal request if asking directly doesn't work"**
  (`formal-access-request`) — includes the fee/timeline note from §4.6.
- **"Now that you've filed"** (`disclosureInProceeding`, rendered only
  when present) — kept visually separate from the first three, since
  it's a different kind of thing (an obligation on the other party, not a
  request route) and only ever applies to a user who has filed.

Grouping and gating happen once, here, in the data the UI reads — never
by the component guessing from `route` per-item at render time, and never
by a single flat list that leaves route 4 sitting next to route 1 with no
visual distinction between "already public" and "conditional on your
case's stage."

Secondary, independent surface (not required to ship the first version):
a dedicated reference page, following `/legal-principles`
(`app/legal-principles/page.tsx`)'s existing pattern of a standalone page
listing sourced cards with citations, browsable by institution category
regardless of whether a case has been started or matched a claim type. A
standalone page has no `claimFiled` fact to key off, so it would show
routes 1–3 plus a general, unfiled-framed description of route 4 ("once
you've filed a claim, ...") rather than the gated per-case version —
worth naming now so a future session doesn't assume the two surfaces can
share one rendering path unmodified. Worth building once there's enough
content to make browsing useful on its own, not a blocker for the first
version landing inside the builder flow.

### 6.3 `verifyIntakeCoverage.ts` coverage (future, not built this session)

The existing coverage script (`scripts/verification/verifyIntakeCoverage.ts`)
already checks source-URL resolvability and dangling id references across
`EDUCATION_TOPICS`, `REMEDY_TYPES`, and `CLAIM_TYPES`
(`verifyIntakeCoverage.ts:9-10,96`). Landing this feature means extending
that script the same way: import `INSTITUTIONAL_RECORDS_TOPICS`,
`FOI_GUIDANCE_TOPICS`, and the two `DisclosureInProceedingGuidance`
entries; check every `basisSourceUrl`/citation resolves; check every
`institutionalRecordsTopicIds`/`foiGuidanceTopicIds` reference on a
`ClaimType` points at a real entry; check that exactly one
`DisclosureInProceedingGuidance` entry exists per `courtArea` (never
zero, never two claiming the same court — the failure mode §4.5 exists to
prevent); and report topic/status counts in its existing summary line the
same way it already reports education and remedy topic counts.

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
- **Disclosure in an existing proceeding (route 4, two separate entries,
  §4.5):** Small Claims disclosure obligations from the Rules of the
  Small Claims Court, O. Reg. 258/98; Superior Court discovery
  obligations from the Rules of Civil Procedure. These are two different
  procedures with different scope and must be sourced and written
  separately — one description covering both would misstate at least one
  of them. Source: ontario.ca's regulation text for O. Reg. 258/98, and
  the Rules of Civil Procedure text, both already the kind of primary
  source this codebase's sourcing rule treats as authoritative (statute/
  rule text, not case law synthesis).

## 8. Summary of what this spec decides vs. leaves open

**Decided:** the schema for both content types (§4.1, §5.1); the four
access routes as a typed, closed `RecordAccessRoute` union rather than
free text, with route 4 kept as its own top-level, case-stage-gated
structure rather than a value any record entry carries as its "typical"
route (§4.1, §4.5); that citations point at the statutory/policy basis,
never a specific institution's specific document (§4.3); that route 4
gates on the existing `claimFiled` fact, additively (routes 1–3 stay
visible after filing, route 4 layers on top) rather than replacing what's
shown (§4.5); that Small Claims disclosure and Superior Court discovery
ship as two separately sourced entries, never merged (§4.5, §7); the four
cross-cutting notes — informal/formal rationale, route 3's time cost,
record retention, and the own-records caveat — as content guidance that
applies across categories rather than being repeated per category (§4.6);
that attachment uses both an id-reference mechanism (works today) and a
fact-gated mechanism (needed for Civil and for matters with no matched
claim type) rather than picking only one (§6.1); that the surfacing type
groups by route and gates route 4 on `claimFiled` in the data itself,
never inferred by the rendering component (§6.2); that the primary UI
surface is the existing `IntelligenceOverviewPanel.tsx` card pattern,
rendered as up to four labeled groups, with a `/legal-principles`-style
page as an independent secondary option that would show route 4
unfiled-framed rather than gated (§6.2).

**Left open, deliberately:** the actual sourced content, including both
disclosure rule sets (§7); the new `otherPartyType` fact field and its
question-bank entry that Mechanism B depends on (§6.1); which specific
regulators to build first for the licensed-trades category (§7);
whether/when to build the standalone reference page (§6.2). None of these
block filing this as a planned item — they're the concrete next steps for
whichever session picks it up.
