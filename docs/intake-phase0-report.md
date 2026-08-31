# AI-Guided Intake — Phase 0 Foundation — Step 1 Report

Written 2026-08-31, before any Phase 0 code was built, per the explicit
"report before building" gate in that session's build instructions. This is
a point-in-time report, not a spec — if the code diverges from it later,
trust the code.

## Part a — Small-claims scenarios and their `intentionalGaps`

Source: `scripts/verification/scenarioRegistry.ts`, `RegistryScenario.intentionalGaps`
(line 163). 30 small-claims scenarios total, but only 2 are hand-authored —
the other 28 are mechanically generated filler sharing one identical
placeholder gap.

| Scenario ID | intentionalGaps (verbatim) |
|---|---|
| `SC-DEFAMATION-FILED-SERVED-DEFAULT-001` | `["Defence status"]` |
| `SC-CONTRACTOR-INCOMPLETE-RENOVATION-001` | `["Exact agreed completion date and whether it passed before the contractor stopped responding", "Whether any written notice was given to the original contractor before hiring the second one"]` |
| `SC-003` … `SC-030` (28 scenarios) | `["important date"]` — identical for all 28; each scenario is `"Synthetic small-claims matter N; saved facts require a focused review."`, otherwise undifferentiated |

**Implication for the question bank**: only 2 of 30 scenarios carry real
design signal. The 28 generic placeholders can't drive specific question
content — they only support a generic "when did this happen" orientation
question. The 2 real scenarios plus the current form's own fields (part b)
are the actual gap sources used for the Step 2 question bank design.

## Part b — What the current static form asks

Source: `app/builder/_components/SmallClaimsIntake.tsx`. Summary of what
matters for the redesign:

- **One long single-page form**, no phases/ordering — case stage, role,
  names, case story (only hard-required field), timeline, evidence, missing
  evidence, remedy sought, amount claimed, amount breakdown, party/service
  details, documents-filed multi-select, an optional collapsed panel
  (agreement details, payment history, defence response, settlement
  efforts, deadlines/urgency), then file upload.
- **No structured facts model persisted** — raw answers live only in React
  state (a `localStorage` cache path is defined but dead/unused). What's
  actually saved to Supabase is AI-derived prose bullets
  (`CaseContext.facts: string[]`), not field-level answers.
- **Gap-tracking is advisory only**: `buildMissingPrompt()` checks 8 fields
  client-side and shows one sentence; nothing blocks submission except the
  case-story field.
- **Five fields the data model defines but the UI never renders at all**:
  `yourPhone`, `otherPartyPhone`, `otherPartyEmail`, `courtLocation`,
  `claimNumber`.

This confirms the foundation work is additive, not a replacement of live
code — nothing here currently enforces phase ordering, gap-coverage, or
sourcing, so `questionBank`/`selectQuestions` genuinely don't exist yet in
any form.

## Part c — Proposed `questionBank` schema + 5 examples

Two convention notes before the schema: the build prompt described
`outOfScopeForums.ts` as already having a typed `status: "draft"` field —
it doesn't; "draft" there is comment-only (a JSDoc note), not a checked
type. This design follows the prompt's explicit spec (real typed
`status`/`reviewedAt` fields) since it's a stronger, actually-enforceable
pattern, not the older convention. Second, `appliesWhen` needs to be a
**data structure**, not an opaque function — the Step 5 coverage script has
to statically walk it to find which fact fields it references, which a raw
closure won't allow.

```ts
// src/lib/case-system/intake/questionBank.ts

export type FactCondition =
  | { field: string; op: "exists" }
  | { field: string; op: "notExists" }
  | { field: string; op: "truthy" }
  | { field: string; op: "equals"; value: string | number | boolean }
  | { field: string; op: "in"; values: (string | number | boolean)[] }
  | { all: FactCondition[] }
  | { any: FactCondition[] };

export type QuestionPhase = "orientation" | "substance" | "sensitive";
export type AnswerType = "date" | "amount" | "yes-no" | "short-text" | "choice";

export type IntakeQuestion = {
  id: string;
  courtArea: "small-claims";
  appliesWhen?: FactCondition;        // omitted = always applies
  text: string;                       // exact words shown to the user
  why?: string;
  sourceUrl?: string;                 // required for any question stating a legal/procedural fact
  answerType: AnswerType;
  choices?: string[];                 // required when answerType === "choice"
  allowUnknown: boolean;
  sensitive: boolean;
  phase: QuestionPhase;
  reviewedAt: string | null;          // null while status is "draft"
  status: "draft" | "reviewed";
};
```

Five examples, spanning all three phases and both sourced/unsourced:

```ts
export const QUESTION_BANK: IntakeQuestion[] = [
  {
    id: "sc-orient-when-happened",
    courtArea: "small-claims",
    text: "Roughly when did the situation that led to this claim happen?",
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: null,
    status: "draft",
    // Purely factual — no legal claim made, no source required.
  },
  {
    id: "sc-amount-claimed",
    courtArea: "small-claims",
    text: "What is the total dollar amount you are claiming?",
    why: "Small Claims Court can only hear claims up to $50,000 (effective October 1, 2025), excluding interest and costs — if your amount is higher, this may not be the right court.",
    sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
    answerType: "amount",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-filed",
    courtArea: "small-claims",
    text: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?",
    why: "This is the form that formally starts a Small Claims Court case.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-defendant-served",
    courtArea: "small-claims",
    appliesWhen: { field: "claimFiled", op: "equals", value: true },
    text: "Has the other party been formally served with the claim, and do you have a completed Affidavit of Service (Form 8A)?",
    why: "The court needs proof of service before a case can move forward without a response.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-safety-check",
    courtArea: "small-claims",
    text: "Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: true,
    phase: "sensitive",
    reviewedAt: null,
    status: "draft",
    // Screening question, not a legal-fact assertion — no source required.
  },
];
```

`sc-amount-claimed`'s $50,000 figure and `sc-claim-filed`/`sc-defendant-served`'s
procedural claims were verified against ontario.ca on 2026-08-31, not
carried over unchecked from the existing `legal-principles` citations.

## Part d — Proposed `educationTopics` schema + 2 examples

```ts
// src/lib/case-system/intake/educationTopics.ts
import type { FactCondition } from "../intake/questionBank";

export type EducationCitation = {
  sourceName: string;
  officialUrl: string;
  verifiedAt: string;
  pinpoint?: string;
};

export type EducationTopic = {
  id: string;
  courtArea: "small-claims";
  title: string;
  surfacedWhen?: FactCondition;
  plainExplanation: string;           // general education only — never "your facts meet this"
  citations: [EducationCitation, ...EducationCitation[]];   // non-empty tuple, compile-time enforced
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};
```

```ts
export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: "sc-topic-monetary-limit",
    courtArea: "small-claims",
    title: "Small Claims Court's $50,000 limit",
    plainExplanation:
      "Small Claims Court in Ontario can only order payment or return of property up to $50,000, not counting interest and court costs. This limit applies to the total amount claimed, not each individual issue in a case. If a claim is worth more than that, it generally has to go to a different court (Superior Court of Justice) instead.",
    citations: [
      {
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-08-31",
        pinpoint: "monetary jurisdiction increased from $35,000 to $50,000, effective October 1, 2025",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-topic-limitation-period",
    courtArea: "small-claims",
    title: "Time limits on starting a claim",
    plainExplanation:
      "In most cases, Ontario's Limitations Act, 2002 gives someone 2 years from when they discovered (or reasonably should have discovered) their claim to start a lawsuit. Waiting past that window can mean losing the right to sue at all, regardless of how strong the underlying facts are. There are exceptions and different rules for some claim types, so this is general information, not a determination of any specific deadline.",
    citations: [
      {
        sourceName: "Ontario.ca — Civil Claims: Suing and Being Sued",
        officialUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
        verifiedAt: "2026-08-31",
        pinpoint: "\"a claim cannot be started more than two years after the claim was discovered\"",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
```

## Conflict check

No conflicts found between the build prompt and CLAUDE.md — the "who does
the applying" rule sharpens CLAUDE.md's existing legal-content rules (§2,
§3), it doesn't contradict them.

## Status

Report only — no Phase 0 code has been written yet. Waiting for approval
before Step 2 (question bank), Step 3 (selector), Step 4 (education
topics), Step 5 (coverage verification), Step 6 (commits).
