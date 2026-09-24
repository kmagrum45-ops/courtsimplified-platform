# The chat engine — what it can say to a user

**Report only. Nothing changed.** 2026-09-23, branch `lso-compliance` @ `535ae70`.

Scope: `src/lib/case-system/ai-case-partner/` (5,087 lines, 5 files), the route
`app/api/ai-case-partner/route.ts`, and the surface that renders it,
`app/builder/_components/CourtAssistantChat.tsx`.

---

## The headline

**No model is involved. Every word is a template or a hand-written label.**
`grep` for `createOpenAIClient`, `chat.completions` or any outbound `fetch`
across all five files returns nothing, and the gateway hard-codes
`externalModelUsed: false` (`aiCasePartnerGateway.ts:19`). The directory name
is misleading.

**But it states law and procedure, and none of it has been reviewed.** It tells
users what a defamation claim "turns on", what a contract dispute "turns on",
and — via an eleven-object doctrine library whose every entry is marked
`verificationStatus: "not-verified"` — what evidence priorities and procedural
watch-points apply to their case.

**It is reachable in phase 1.** It is mounted twice in the builder
(`app/builder/page.tsx:1672` and `:1890`) and gated only on `analysisAvailable`,
which is true on the Small Claims path.

---

## Every output path, classified

`userFacingAnswer` is the only field rendered as chat text
(`CourtAssistantChat.tsx:924-925`). It is built by `buildAnswer`
(`aiCasePartnerOrchestrator.ts:1068`), which branches on an intent detected
from the user's message by keyword.

| # | Path | Kind | Legal/procedural content? |
|---|---|---|---|
| 1 | `buildEvidenceAnswer` | template + labels | **Yes** — evidence priorities from the doctrine library |
| 2 | `buildLegalIssuesAnswer` | template + labels | **Yes** — names legal issues and domains |
| 3 | `buildDocumentReadinessAnswer` | template + labels | **Yes** — "Check procedure: …" items |
| 4 | `buildBestQuestion` | template + question bank | Mostly not; the `reason` strings state why a rule matters |
| 5 | `buildWarmOpening` | **fixed template**, keyword-branched | No |
| 6 | `buildLegalExplanation` | **fixed template**, keyword-branched | **Yes — the clearest case** |
| 7 | `buildCaution` | fixed template + investigation warning | **Yes** — procedural caution |
| 8 | "I've added the new information…" | template + user's own facts | No |
| 9 | Fallback strings (4) | fixed template | No |
| 10 | `INITIAL_ASSISTANT_MESSAGE` | fixed template | No |
| 11 | Error message | fixed template | No |
| 12 | `systemWarnings` panel | template + engine warnings | **Yes** — rendered outside the chat transcript |

**None is model-written free text. None is a catalogue block from the content
library.** Every one is a template in the orchestrator, filled with labels from
the three deterministic engines or from the doctrine library.

### The three that matter most

**Path 6, `buildLegalExplanation` (`:777`)** — fires on the first turn of any
general conversation. It branches on a keyword in the detected issue label and
returns a fixed sentence about what that kind of claim requires:

> "A possible defamation issue usually turns on the exact words, whether they
> referred to you, whether they were communicated to another person, the
> context, any resulting reputational harm, and any defence that may apply."

> "A contract or payment dispute usually turns on the agreement, each side's
> obligations, the alleged breach, supporting records, and the resulting loss."

That is a statement of the elements of a cause of action. It is not wrong — but
it is **unsourced, uncited, and unreviewed**, and it is the kind of statement
`claimTypes.ts` carries a source URL for. The phrasing ("usually turns on",
"may apply") keeps it on the information side of CLAUDE.md §2's "who does the
applying" test: it describes the claim type, not the reader's case. The problem
is provenance, not framing.

**Paths 1–3** name issues, evidence priorities and procedural watch-points drawn
from `legalReasoning.reasoningSummary`, which comes from `DOCTRINE_SEED_LIBRARY`
(`src/lib/case-system/knowledge/doctrineSeedLibrary.ts`, 977 lines). That
library is **a fourth body of unreviewed content nobody has flagged before**:

- 11 knowledge objects.
- **All 11 use `operationalSource()`** — `sourceKind: "operational-guidance"`,
  `authorityLevel: "operational-guidance"`, `jurisdiction: "Unknown"`, and
  `verificationStatus: "not-verified"`.
- Zero statute, rule or case-law citations anywhere in the file.
- **Not in `contentInventory.ts`**, so it is not in the review packet.

The file is honest about itself in its metadata. Nothing downstream tells the
user that what they are reading is "operational guidance, not verified".

**Path 12, the warnings panel (`CourtAssistantChat.tsx:1291`)** renders up to
four engine warnings under the heading "Information still to confirm", outside
the chat transcript. These include jurisdiction and limitation cautions, and
one explicitly states the monetary limit:

> "Claim amount $X exceeds the Ontario Small Claims Court limit of $50,000;
> Small Claims Court may not have jurisdiction and the Superior Court of Justice
> should be considered."

That figure is correct and is sourced elsewhere in the codebase — but here it is
a bare string constant in `conversationIntelligenceEngine.ts` with no citation
attached to what the user reads.

---

## Which of the seven guard-bypass paths are in the chat engine

Two of the seven, and they are the two largest by volume.

| Guard-bypass path | In the chat engine? |
|---|---|
| `StageConfirmation` catalogue blocks | No |
| `PathwayUnavailable` | No |
| `LegalAdviceDeflection` | No |
| `safetyPass` crisis messages | No |
| `proceduralStages` / `/legal-principles` | No |
| **`ai-case-partner/`** | **Yes — this is that entry** |
| `documentGenerationEngine` | No |

Plus one the coverage list does not yet name: **`doctrineSeedLibrary.ts`**,
which reaches users only through this chat. It should be added to the UNGUARDED
list whatever you decide.

The chat consults the output guard **zero times**. Nothing in
`ai-case-partner/` or `CourtAssistantChat.tsx` imports
`assertApprovedUserContent`.

---

## Four things I did not expect to find

**1. No disclaimer anywhere on the chat surface.** `CourtAssistantChat.tsx`
contains no "legal information, not legal advice" notice, no `AiUseNotice`, and
no `LegalInformationNotice`. It sits inside the builder, which carries all
three at the top of the page — but the chat is the most conversational surface
in the product and the one most likely to be read as advice.

**2. `buildCaution` only fires on the first turn of a *general* conversation**
(`:1048`, `if (args.firstTurn && hasText(caution))`). The four direct-intent
answers — evidence, legal issues, document readiness, next question — never
carry a caution at all. A user who asks "what evidence do I need?" as their
first message gets a substantive answer with no qualification.

**3. Model output is passed into the chat but not rendered.**
`app/builder/page.tsx:1679` sends
`strategyData={{ risks: analysis?.intelligence?.litigationRisks, nextBestActions: … }}`
and `evidenceData={analysis?.intelligenceEvidenceIssues}` — both model-derived.
They are POSTed to the route inside `caseMemory`
(`CourtAssistantChat.tsx:876-877`) and I traced them through the orchestrator:
`caseMemory` is read only for `selectedCourtArea` / `courtArea`
(`aiCasePartnerOrchestrator.ts:469-470`). **No path puts those strings into
`userFacingAnswer`.** It is a latent risk, not a live leak — one
`getNestedValue(caseMemory, ["strategyData", "risks"])` away from becoming one.

**4. `caseMemoryPatch.summary` is `message.slice(0, 500)`** — the user's own
words, echoed into memory. Harmless (it is their text, held in their browser and
POSTed to our own route, never to OpenAI) but worth knowing it exists.

---

## What I can't tell you

- **Whether the legal statements are correct.** I read them for provenance, not
  accuracy. Checking whether "a contract dispute usually turns on the
  agreement, each side's obligations, the alleged breach…" is a fair statement
  of Ontario law is a licensee's judgment.
- **How often each path fires in practice.** There is no logging of chat
  responses — the audit log covers model calls only, and this makes none.
- **Whether users read it as advice.** No usage data.

---

## The options, as I see them

I'm not recommending one; the trade-offs are yours.

**A. Add it to the review packet as-is.** ~25 template strings plus the 11
doctrine objects. Low effort, and it makes the packet honest. But a reviewer
approving `buildLegalExplanation`'s defamation sentence is approving a statement
with no source attached, which is not what the other 291 items ask of them.

**B. Source the legal statements first, then add them.** The six or so
substantive templates (paths 1, 2, 3, 6, 7, 12) get citations the way
`claimTypes.ts` entries do, then go into the packet. Higher effort, and it makes
the packet uniform — every item a reviewer sees carries a source.

**C. Gate the chat out of phase 1.** Same treatment as Family and Civil: it is
not ready, so it is not shown. Removes the risk entirely and removes the
feature.

**D. Keep the chat, replace the substantive templates with catalogue lookups.**
Paths 1, 2, 3 and 6 select from `claimTypes.ts` / `educationTopics.ts`, which
are already sourced and already in the packet. Most work, best end state, and it
makes the chat consistent with how the rest of the product now selects content.

**Independent of the choice**, two things look worth doing:

- Put a disclaimer on the chat surface. It is the one AI-adjacent surface
  without one, and it is one line.
- Add `doctrineSeedLibrary.ts` to the UNGUARDED list in
  `verifyOutputGuardCoverage.ts` so it stops being invisible.

---

## Where to look

| What | Where |
|---|---|
| The answer builder and all 7 template paths | `aiCasePartnerOrchestrator.ts:732-1105` |
| The legal-explanation templates | `aiCasePartnerOrchestrator.ts:777-836` |
| Issue labels and signals | `conversationIntelligenceEngine.ts` |
| The doctrine library | `src/lib/case-system/knowledge/doctrineSeedLibrary.ts` |
| Where the answer is rendered | `CourtAssistantChat.tsx:924-952` |
| The warnings panel | `CourtAssistantChat.tsx:1291-1308` |
| Where the chat is mounted | `app/builder/page.tsx:1672`, `:1890` |
