# Deadlines and Case Timeline — Design Spec

Status: **design only, not implemented.** No content, schema, or UI code from
this document exists in the codebase yet. Filed as an open item in
`docs/INTAKE_STATUS.md`, split across three separate statuses (see the
entry there): Tiers 1 and 2 buildable now, Tier 3 gated pending licensee
review. The TypeScript shapes below are illustrative design artifacts —
the same convention `docs/RESEARCH_GUIDANCE_DESIGN.md` uses for its own
schema sections — not a final schema to migrate or implement as written.

## 1. Three tiers, kept deliberately separate

The site owner's framing splits this feature into three pieces on purpose,
because they carry genuinely different risk, and bundling them would force
the riskiest one's review timeline onto the two safest ones:

| Tier | What it does | Who supplies the date | Risk |
|---|---|---|---|
| 1 | User enters a deadline they already know, system tracks and reminds | User, entirely | Calendar-app risk only |
| 2 | System surfaces sourced general deadline information for a procedural stage | Nobody — it's general information, no date is computed | Ordinary content-sourcing risk, same as `claimTypes.ts` |
| 3 | System computes a specific date from a confirmed triggering fact and a rule, user confirms before tracking | System calculates, user confirms both the fact and the resulting date | The only tier that produces a specific, reliance-bearing date — see §5.5 |

Tiers 1 and 2 have no dependency on each other or on Tier 3 and can ship
independently, in either order or together. Tier 3 depends on nothing
Tiers 1/2 don't already need (a timeline surface to write into, sourced
rule content to compute from) but must not ship until §5.6's gate clears.

## 2. Tier 1 — user-entered deadline tracking

This is calendar-app functionality with case-record styling. The system
never interprets a rule and never calculates anything — the user supplies
a date and a label, and the system stores it, displays it against the
case, and reminds as it approaches.

### 2.1 Shape

```ts
export type UserDeadlineEntry = {
  id: string;
  caseId: string;
  label: string; // free text the user supplies, e.g. "Defence response due"
  date: string; // ISO date, entered by the user directly -- never computed
  note?: string;
  source: "user-entered"; // distinguishes this row from a Tier 3 row at the storage layer -- see 5.3
  reminders: { daysBefore: number; sentAt: string | null }[]; // e.g. [{daysBefore: 7, sentAt: null}, {daysBefore: 1, sentAt: null}]
  createdAt: string;
};
```

`source: "user-entered"` is a fixed literal here and `"rule-confirmed"` on
the Tier 3 shape (§5.3) — the same row shape backs both tiers' entries on
a shared timeline, distinguished by this one field, rather than two
unrelated tables a UI has to reconcile.

### 2.2 Where it lives

A case timeline surface (calendar or list view) scoped to a case, most
naturally reached from the case workspace alongside the existing evidence
and document-workspace surfaces (`app/evidence/page.tsx`,
`app/document-workspace/page.tsx` are the closest existing analogues for
"a case-scoped page that isn't a court form"). Not designed further here —
picking the exact route and layout is implementation work for whichever
session builds Tier 1, not a decision this spec needs to make.

### 2.3 Reminders — a real infrastructure gap, checked, not assumed

Checked this session, not assumed: there is **no existing email or push
notification integration in this codebase**. `CLAUDE.md` §1 lists Resend
as a secret category to protect if one is ever added, which is a
guardrail for a future integration, not evidence one exists — grepping the
codebase for `resend`/`Resend` returns nothing. There is also no existing
in-app reminder or scheduled-scan job.

What the repo does already have, as a real precedent to build the
reminder scan on rather than inventing scheduling infrastructure from
scratch: `.github/workflows/courtsimplified-nightly-ai.yml` runs on a
daily GitHub Actions `cron` schedule already. A reminder feature would
need an equivalent scheduled job — scan every tracked deadline daily,
find the ones crossing a `daysBefore` threshold, send the reminder — plus
an actual delivery channel (email via something like Resend, since none
is wired up yet, or in-app only as a lower-effort first version that
defers the "how do we email someone" question entirely). This is a real,
named dependency for whoever builds Tier 1's reminder half, not something
this spec resolves.

### 2.4 Why this is lowest risk

No rule interpretation, no calculation, no fact the system asserts on the
user's behalf. The system's only claims are "you told us this date" and
"this date is approaching" — both directly verifiable by the user against
what they typed. Nothing here touches CLAUDE.md §2 or §3 at all: there is
no legal statement being made.

## 3. Tier 2 — sourced general deadline information

Same pattern as `claimTypes.ts` and `educationTopics.ts`: sourced,
citation-bearing content surfaced for a procedural stage, general
information the user applies to their own facts, never a computed date.

### 3.1 Shape

Reuses `EducationCitation` from `educationTopics.ts:51-56` and
`FactCondition`/`CourtArea` from `questionBank.ts:61,63-70` — the same
non-duplication convention every content registry in
`src/lib/case-system/intake/` already follows (`educationTopics.ts:58-69`,
`RESEARCH_GUIDANCE_DESIGN.md` §4.1 for the most recent precedent).

```ts
export type DeadlineInformationTopic = {
  id: string;
  courtArea: CourtArea;
  /** e.g. "You've been served with a claim" -- the procedural stage this applies to, in plain language. */
  stageDescription: string;
  title: string; // e.g. "Responding to a Plaintiff's Claim"
  /** General rule statement -- "generally," never "your," never a computed date. See 3.3. */
  plainExplanation: string;
  /** Omitted means generally relevant to the stage; present narrows further, same convention as EducationTopic.surfacedWhen. */
  surfacedWhen?: FactCondition;
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};
```

### 3.2 What it is not

Tier 2 never reads a date the user entered, never does arithmetic, and
never says "your deadline is." A `DeadlineInformationTopic` entry looks
like: "A Defence is generally due within a set number of days of being
served with a Plaintiff's Claim, under the Rules of the Small Claims
Court — see the official rule text for the exact count and how it's
calculated" (the actual number and citation are real sourcing work, §6,
not written here per CLAUDE.md §2 — see the note on `twentyDaysElapsed`
in §5.1 for why even a plain-sounding "20 days" is not safe to assert as
a finished fact without checking the counting method first).

### 3.3 Checked against the "who does the applying" test

| Not allowed (applies law to facts) | Allowed (Tier 2's actual voice) |
|---|---|
| "Your Defence is due March 15." | "A Defence is generally due within a set number of days of being served with a claim — check the exact count and how days are counted before relying on any date, since counting methods differ across Small Claims procedure (see the official rule text)." |
| "Because you were served on the 3rd, you have until the 23rd." | "If you've been served with a claim, the clock on responding generally starts running from service — worth confirming the exact start point and count against the official rule before treating any specific date as final." |
| "You're out of time to respond." | "Missing a response deadline generally has consequences (e.g. the other side may be able to move for a default step) — if you're unsure whether you're still within time, that's worth checking directly against the official rule or with a paralegal/lawyer, not assumed either way." |

This table is the same review posture `RESEARCH_GUIDANCE_DESIGN.md` §2
uses for its own content and the same one `claimTypes.ts`'s own header
describes — every Tier 2 entry gets checked against it before it ships,
not just at design time.

## 4. The architectural parallel — Tier 3 extends `legal_form_mapping_rules`, not a new mechanism

This is the load-bearing design decision for Tier 3, so it's worth being
explicit about exactly what already exists and where.

### 4.1 What `legal_form_mapping_rules` already does

`legal_form_mapping_rules` (queried in
`app/api/cases/form-applicability/route.ts:167`) already implements the
exact shape Tier 3 needs, for a different output (a form recommendation
instead of a deadline):

- **Stage gating.** `authority_stage_applicability` is an array of stage
  strings (`starting-case` / `responding` / `already-started`, per the
  row data queried against `.eq("court_area", area)` and matched to the
  case's own `procedureStage(masterResult)` in
  `app/api/cases/form-applicability/route.ts:170-171`). A rule only
  becomes a candidate once the case is at the stage the rule is written
  for — nothing fires for every case regardless of where it is.
- **Fact-gated applicability conditions.** `applicability_conditions`
  is a JSON `{ all: [{ path, equals }] }` shape, parsed by
  `applicabilityConditions()` in
  `src/lib/case-system/authority-intelligence/betaProcedureAuthority.ts:137-163`
  and checked against the case's own confirmed facts inside
  `resolveExactFormMapping()`
  (`betaProcedureAuthority.ts:350-421`) — a rule only resolves to a
  concrete recommendation once every named fact path matches what's
  actually been confirmed for that case.
- **Confirm-before-surface via paired UI questions.**
  `applicability_questions` (parsed by `parseApplicabilityQuestions()`,
  `app/api/cases/form-applicability/route.ts:47-76`) is a set of typed
  yes/no or choice questions, one per fact path referenced in
  `applicability_conditions`. `app/forms/page.tsx`'s "Verified form
  confirmation" section (`app/forms/page.tsx:856-885`) renders exactly
  these questions, and a recommendation only appears in
  `verifiedRecommendations` after the user answers and explicitly saves
  (`saveApplicability()`, `app/forms/page.tsx:641-669`) — never before,
  never inferred from anything else in the case record.
- **A closed, explicit review-status gate**, not just an `is_active`
  flag: every row must also carry `authority_review_status ===
  "verified-for-workflow"` and `form_review_status ===
  "verified-for-workflow"` before it's even a candidate
  (`app/api/cases/form-applicability/route.ts:167`) — the review state
  that lets a rule fire at all is itself a stored, checkable field, not
  an assumption.

Tier 3 reuses this shape wholesale: stage gating, JSON fact-path
conditions, paired confirmation questions, and an explicit
review-status gate that must read "verified" before a rule can fire —
the deadline-rule table this spec proposes (§4.3) is structurally the
same table with a different payload (a date-computation rule instead of
a canonical form id), not a new pattern invented for this feature.

### 4.2 A second, smaller existing precedent worth noting

`questionBank.ts`'s `KNOWN_FACT_FIELDS` already includes `claimServed`,
`defenceFiled`, and `twentyDaysElapsed`
(`src/lib/case-system/intake/questionBank.ts:36-39`), and an existing
question (`questionBank.ts:264-279`) asks the user directly — as a
yes/no, not a computed check — whether 20 days have elapsed since
service, gated on `claimServed: true` and `defenceFiled: false`. Today's
system does not compute this at all: it asks the user to state the
answer outright. Tier 3 is a step *forward* from this baseline (the
system would compute the date and show its work, rather than asking a
bare yes/no with no date attached), but the underlying posture — never
silently assert a deadline-relevant fact, always get the user's own
confirmation — is already how this codebase behaves today, not a new
constraint being introduced for Tier 3.

Separately, `proceduralStateArchitecture.ts` defines a much larger
`ProceduralEventType` union that already includes a `"defence-due"`
event (`src/lib/case-system/procedure/proceduralStateArchitecture.ts:71`)
and its own `ProceduralAuthorityReference` shape with a
`verificationStatus: "verified" | "needs-review" | "not-verified" |
"do-not-use"` field (`proceduralStateArchitecture.ts:20-25`) — a
verification-gate concept parallel to `legal_form_mapping_rules`'
`authority_review_status`. This is wired into live code
(`caseSystemAssembly.ts`, referenced from `app/forms/page.tsx` and
`app/api/cases/form-applicability/route.ts`), so it is not dormant —
but this spec has not traced how deeply it's actually populated or
consumed today. Flagging this as a related existing piece Tier 3's
implementer should investigate and reconcile with before building a
fourth parallel structure is more honest here than asserting a merge
plan this session hasn't verified.

### 4.3 Tier 3 shape, following §4.1's pattern directly

```ts
export type DeadlineRule = {
  id: string;
  courtArea: CourtArea;
  authorityStageApplicability: string[]; // same values as legal_form_mapping_rules.authority_stage_applicability
  /** What fact this rule's date is computed FROM -- e.g. "claimServed" plus a date value, not just the boolean. */
  triggeringFactPath: string; // e.g. "formApplicability.smallClaims.serviceDate" -- a date-valued fact, not yet in KNOWN_FACT_FIELDS today (see 5.2)
  /** The count itself -- see 5.5 for why every field here needs independent, per-rule sourcing. */
  count: number;
  countUnit: "calendar-days" | "business-days";
  excludesHolidays: boolean;
  /** Whether day zero is the day of the triggering event or the day after -- see 5.5. */
  clockStartsOnEventDay: boolean;
  resultLabel: string; // e.g. "Defence due"
  applicabilityConditions: { all: { path: string; equals: string | boolean }[] }; // same shape as legal_form_mapping_rules.applicability_conditions
  authoritySourceId: string;
  authorityCitation: string;
  officialSourceUrl: string;
  authorityCheckedAt: string;
  authorityReviewStatus: "verified-for-workflow" | "review-required";
  /** Set only after a licensee has independently confirmed the counting method -- see 5.6. Distinct from authorityReviewStatus, which only covers sourcing. */
  countingMethodLicenseeVerified: boolean;
};
```

`countingMethodLicenseeVerified` is the one field with no equivalent on
`legal_form_mapping_rules` — see §5.6 for why Tier 3 needs a second,
narrower gate that Tier-1/2-adjacent content sourcing doesn't.

## 5. The confirm-before-track pattern

### 5.1 The pattern itself

Worked example, in the exact voice the feature should use:

> You said you were served with the claim on March 1. A Defence is
> generally due 20 days after service under [cited rule] — counting
> calendar days from the day after service, that would put the deadline
> at March 21. Confirm this is right before we start tracking it and
> sending reminders.
>
> [ Confirm March 21 ] [ That's not right — let me enter the date myself ]

Two separate things are being confirmed, and the pattern must keep them
visibly separate rather than collapsing them into one "yes/no" click:

1. **The triggering fact** — that March 1 is actually the service date.
   The system never asserted this; the user stated it earlier and is now
   re-confirming it's still correct at the point it's about to be used
   for a calculation that matters.
2. **The rule's applicability** — that this rule (the general Defence
   deadline) is the one that actually governs this user's situation, not
   some other rule with different timing (e.g. an extension already
   granted, a different response type). The user's confirmation is what
   carries this, not the system asserting it — the system can surface
   that "this rule generally applies when X," but never assert that it
   *does* apply to this specific case without the user saying so.

The declining path ("That's not right") must fall through to Tier 1's
plain manual entry, not a dead end — a user who says the computed date is
wrong still needs a way to track *something*.

### 5.2 What's missing today to build this

`KNOWN_FACT_FIELDS` (`questionBank.ts:33-49`) has boolean/text facts
(`claimServed`, `defenceFiled`, `twentyDaysElapsed`) but no *date-valued*
fact for "the date of service" itself — today's system only ever asks
whether an event happened or whether enough time has passed, never
captures the actual date. A `DeadlineRule`'s `triggeringFactPath` (§4.3)
needs a real date value to compute from, which means Tier 3 needs at
least one new date-typed fact field and its own intake question before
any computation is possible — the same kind of small, explicit,
not-built-here dependency `RESEARCH_GUIDANCE_DESIGN.md` §6.1 named for
its own Mechanism B (`otherPartyType`). Naming this now so whoever scopes
Tier 3's real implementation doesn't have to rediscover it.

### 5.3 Storage: one shared shape, two sources

Building on §2.1's `UserDeadlineEntry`, a Tier 3-confirmed entry is the
same row shape with `source: "rule-confirmed"` and two additional fields
carrying what it was computed from, so a user (or a future licensee
review) can always see the arithmetic that produced a tracked date, not
just the date itself:

```ts
export type RuleConfirmedDeadlineEntry = Omit<UserDeadlineEntry, "source"> & {
  source: "rule-confirmed";
  computedFrom: { ruleId: string; triggeringFactValue: string }; // the DeadlineRule.id and the confirmed date it was computed from
};
```

Both variants render on the same timeline (§2.2); the UI distinguishes
them only by a badge ("you entered this" vs. "confirmed from [rule]"),
never by different visual weight implying one is more or less certain
than the other — both are equally user-confirmed by the time either
exists as a tracked row.

### 5.4 Checked against the "who does the applying" test

| Not allowed (system applies law to facts) | Allowed (Tier 3's actual behavior) |
|---|---|
| Silently computing and displaying "Defence due March 21" the moment a service date is entered, with tracking/reminders already active. | Computing March 21 and presenting it as a proposal requiring explicit confirmation before anything is tracked (§5.1). |
| Asserting that the general Defence-deadline rule governs this user's case because they said they were served. | Surfacing that this rule *generally* applies to being served with a claim, and relying on the user's own confirmation that it fits their situation — the same "topic surfacing, not fact-application" pattern CLAUDE.md §2 already requires everywhere else. |
| Auto-correcting a user's later-entered new fact (e.g. an extension) by silently recalculating and moving the tracked date. | Treating a materially changed fact as a fresh proposal needing its own confirmation, never a silent overwrite of something the user already confirmed — consistent with §4 (Suggest, never decide). |

This is the same test `RESEARCH_GUIDANCE_DESIGN.md` §2 and every other
content registry in this codebase gets checked against — Tier 3 is not a
special case of the rule, it's the tier where getting the confirm step
wrong is most consequential, because the output is a specific date a
user will plan around.

### 5.5 Why Tier 3 is a materially different risk than ordinary content gaps

An incomplete or slightly-off piece of general legal information (Tier
2) produces a vague or unhelpful answer — the user notices something is
missing or unclear and goes to verify it, because nothing about it
looked authoritative enough to stop checking. A wrong deadline
*calculation* does the opposite: it produces a specific, confident-
looking date, and a confirmed, tracked, reminder-bearing date is exactly
the kind of output a user stops double-checking once they've seen it
tracked. That's a **fails-silently** failure mode, not a vague one, and
it's strictly worse.

The specific technical risk is the counting method, which `DeadlineRule`
(§4.3) makes explicit rather than folding into a single opaque "N days"
number:

- **Calendar days vs. business days** — different rules within Small
  Claims procedure may count differently; assuming one counting method
  applies everywhere is exactly the kind of error this design exists to
  prevent.
- **Holiday exclusion** — whether statutory holidays are skipped when
  counting, which shifts the result by however many holidays fall in the
  window.
- **Whether the clock starts the day of the triggering event or the day
  after** — a one-day difference in the start point shifts every
  downstream date by one day, silently, unless the rule states its own
  convention explicitly.

These three questions can differ **within Small Claims procedure alone**
— there is no single "the counting rule" to source once and reuse
everywhere; each `DeadlineRule` needs its own counting method verified
against its own specific rule text, not inherited from a sibling rule
that happens to look similar.

### 5.6 The gate: licensee review of counting rules specifically

Per the site owner's framing, and worth stating plainly rather than
folding into a general "get this reviewed eventually": **Tier 3's
counting-rule verification is the single best candidate for the site
owner's eventual licensee review**, because it is a narrow, well-defined,
answerable-in-one-sitting technical question — "for this specific rule,
is the count calendar or business days, does it exclude holidays, and
does the clock start on the triggering day or the day after" — that a
paralegal or lawyer can confirm definitively per rule. This is
structurally different from, and easier than, a general product review:
it doesn't require the reviewer to evaluate the feature, the UI, or the
product decisions in this spec, only to confirm a specific, checkable
fact about a specific, named rule.

Concretely, before any `DeadlineRule` ships with `authorityReviewStatus:
"verified-for-workflow"` (§4.3's shape, mirroring
`legal_form_mapping_rules`' existing gate exactly), it also needs
`countingMethodLicenseeVerified: true` — a second, independent gate a
licensee sets, not something a content-sourcing pass can set on its own
the way `claimTypes.ts` entries move from `draft` to `reviewed` today.
Sourcing the citation (confirming the rule exists and roughly what it
says) and verifying the counting method (confirming exactly how to
compute a date from it) are two different jobs; Tier 3 must not ship on
the first alone.

## 6. Sourcing plan for Tier 2 (not done this session)

Nothing below is verified or written yet — this is the research plan, not
the content, per the same posture `RESEARCH_GUIDANCE_DESIGN.md` §7 uses
for its own sourcing plan. No specific rule number or day-count is
asserted here; per CLAUDE.md §2, none of that goes in a document (design
or otherwise) until it's actually been retrieved and read this session or
a future one — which is exactly why §3.2 above describes the Defence-
deadline example without stating a number, even though `questionBank.ts`
already uses "20 days" informally as a fact-field name.

Procedural stages/milestones a future sourcing session would need to
cover, sourced from the Rules of the Small Claims Court (O. Reg. 258/98)
via ontario.ca's regulation text and, where a plain-language restatement
already exists and is already used elsewhere in this codebase,
ontariocourts.ca's Small Claims guidance (the same domain already cited
at `questionBank.ts:272` for default proceedings and
`claimTypes.ts:387,683,778` etc. for claim-commencement guidance):

- **Responding to a claim** — the deadline to file a Defence after being
  served, and its exact counting method (calendar vs. business days,
  holiday treatment, start-day convention — §5.5).
- **Default proceedings** — the point at which a plaintiff may ask the
  court to note a defendant in default once a Defence deadline has
  passed without a Defence being filed; the existing `questionBank.ts`
  entry at `questionBank.ts:264-279` already touches this fact-wise but
  states no deadline math itself.
- **Motions** — general timing/notice requirements for bringing a
  motion, where they exist as a fixed rule rather than at the court's
  discretion.
- **Settlement conference and trial** — any fixed notice-period rules
  that apply once these stages are scheduled (as distinct from the
  scheduling itself, which is court-driven, not a self-represented
  litigant's own deadline).
- **Appeals and enforcement** — deadlines to appeal a decision, and any
  fixed timing rules in enforcement steps (garnishment notices, etc.).

Each of these, once actually sourced, becomes both a Tier 2
`DeadlineInformationTopic` (general information, §3) and — only after
§5.6's licensee gate clears independently — a candidate `DeadlineRule`
for Tier 3 (§4.3). The two are not the same deliverable from the same
research pass: Tier 2 needs the citation and a correct plain-language
restatement; Tier 3 additionally needs the counting method confirmed by
a licensee before it can compute anything.

## 7. Summary of what this spec decides vs. leaves open

**Decided:** the three-tier split and why each tier carries different
risk (§1); Tier 1's shape and its real, previously-unverified
infrastructure gap around reminders — no email/notification integration
exists yet, though a scheduled-job precedent does (§2.3); Tier 2's shape,
reusing `EducationCitation`/`FactCondition` rather than a new content
type (§3.1), checked against the "who does the applying" test with
concrete allowed/not-allowed phrasing (§3.3); that Tier 3 is an explicit
architectural extension of `legal_form_mapping_rules`' existing stage-
gating, fact-conditions, and confirm-before-surface pattern, cited to
exact files and lines rather than described abstractly (§4.1), with a
second, smaller existing precedent (`twentyDaysElapsed`,
`proceduralStateArchitecture.ts`'s event/verification types) flagged for
reconciliation, not merged into this design without further
investigation (§4.2); the confirm-before-track pattern itself, including
that it confirms two separate things (the triggering fact and the rule's
applicability), worked as a concrete example (§5.1); that Tier 3 needs a
new date-valued fact field not in `KNOWN_FACT_FIELDS` today (§5.2); that
Tier 3 rows share one storage shape with Tier 1 rows, distinguished by a
`source` field carrying its own computation provenance (§5.3); the
specific counting-method risks that make Tier 3 different in kind from
ordinary content gaps, not just in degree (§5.5); that Tier 3 needs a
second, narrower gate beyond ordinary content review —
`countingMethodLicenseeVerified`, distinct from `authorityReviewStatus`
— and why that specific, narrow question is the right first ask of the
site owner's eventual licensee review (§5.6).

**Left open, deliberately:** the actual sourced Tier 2 content and every
specific rule citation, day-count, and counting method (§6) — none of
which this document asserts, consistent with CLAUDE.md §2; the exact
route/layout for the case timeline surface (§2.2); the reminder-delivery
mechanism (email integration vs. in-app-only first version, §2.3); the
new date-valued fact field's exact name and its question-bank entry
(§5.2); how deeply `proceduralStateArchitecture.ts`'s existing event
taxonomy should be reconciled with, versus left alone, by Tier 3's real
implementation (§4.2). None of these block filing this as a planned item
— they're the concrete next steps for whichever session picks up each
tier.
