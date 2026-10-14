# CourtSimplified Master Plan

Adopted 2026-10-06 by the site owner, who handed the build to Claude. The living copy is the
"CourtSimplified Master Plan" doc in the owner's Claude artifacts; this file is
the repository copy, so every session reads the same plan. **Change it only
through the decision log at the end, with a date and a reason.** A new review
finding goes into the phase that owns it or onto the after-beta list; it never
moves the finish line on its own.

## Why the site falls short today

The law is right (four review rounds, 8 personas: legal statements, side,
court, amount and stage correct; nothing judged a case). The wiring is not:
a dozen panels each read their own slice of what the person said, restate
general rules, and stop. A lawyer holds one picture of the client and answers
the next step first. Every recurring finding traces to that: facts asked
again, deadlines not counted or lost on Back, the next step buried,
other-side content, research that does not answer its heading, rules
recited three times.

## The design

Story and answers -> AI reads the story (language only, proposes facts) ->
**one case record** (side, court, stage, dates, amount, claim, parties,
filings; each fact confirmed once, with provenance) -> **legal engine in code**
(stage map, deadline engine, claim elements, court limits; reads only the
sourced library) -> next-step card, what to show + evidence, drafts, law and
decisions list. Gaps in the record become the next question. Every page reads
the record.

## What we keep

The sourced corpus, the stage map, the 126 published step answers, the
deadline engine, claim types and elements, the guided intake, the form
library, the sourcing rules, the switches and the suites. The plan rewires
around them.

## Build order (adopted 2026-10-12, governs the order of work)

The site owner set this order on 2026-10-12 to stop drift. The living copy,
with every item and its status, is the "CourtSimplified Build Order" doc in the
owner's Claude artifacts. Work it top to bottom; a new idea goes on the
after-beta list; one main chat builds at a time, and any other chat takes a
job that does not touch the same files (and says which files it touches).

1. **Quick fixes** -- done 2026-10-12.
2. **Shared pieces, built once for all three courts** (the phases below, done
   for every court together): 2A one case record read by every page; 2B
   questions that check the record first (driven by the walkthrough's
   repetition findings); 2C one-question-at-a-time intake for every court
   (GuidedFormChat over each court's own form) and the court check before
   intake; 2D deadlines counted from the day service is effective
   (serviceEffectiveDate.ts); 2E the next-step card complete or saying what
   it doesn't list; 2F the free finish line (eval:free-finish-line) in CI
   against a floor.
3. **Lock down Small Claims**: every form tied to its steps, empty next-step
   entries filled, missing sources finished; locked when its walkthrough
   cases, its held-back cases and a 50-statement random check all pass.
4. **Lock down Family**, the same way.
5. **Civil**, the same way; then the before-beta list (live-testing switch
   off, OpenAI data retention confirmed, backups decided, unused AI routes
   removed, per-visitor limits on routes that need no sign-in).

## Phases (each ends with a test that must pass before the next starts)

1. **One case record.** Done when no page asks for a fact already recorded,
   and a date given once appears everywhere it is used, after Back and reload.
2. **The next-step card** (step, form, counted deadline or "passed", where and
   how to file, fee, service, what to gather; everything else folded). Done
   when every test case's card has the correct form and deadline and nothing
   for the other side or another kind of case sits above it.
3. **Questions driven by gaps** (only what the next step and the elements
   need; a defendant's matter understood as the other side's claim). Done when
   no guided run asks anything twice and every fact the card needs is recorded
   or asked.
4. **What you must show, and your evidence** (parts, recorded, missing; no
   strength). The practical help lane (decision log 2026-10-13,
   `docs/PRACTICAL_GUIDANCE_DESIGN.md`) is built with this phase: how to
   gather and preserve the evidence, records and reports each part needs, in
   plain words, with legal statements still checked. Done when every claim type in the test set lists its parts with
   sources and no research heading appears without a passage answering it.
5. **Drafts and the law-and-decisions list** (every statute, rule, decision and
   guide used: citation, pinpoint, link, verified date, what it was used for).
   Done when each test case's next form is drafted with no invented fact and
   its list matches the sources on its pages.

## The finish line (beta-ready)

All pass for 20 test cases across the three courts, both sides, starting,
responding, mid-case and enforcement, including 3 or 4 real stories:

- The next-step card names the correct next form.
- A fixed period with a known date is counted; a passed date says so.
- Where and how to file, the fee and service are shown.
- No fact already given is asked again, on any page, after Back or reload.
- Nothing for the other side, another court or another kind of case above the fold.
- Every legal statement sourced and dated; every decision retrieved and read.
- Nothing judges the case, predicts an outcome or pushes settlement.
- A case the site cannot fully handle says so and points to help.
- The guided conversation acknowledges what the person said, asks one question
  at a time, says why a question matters when that is not obvious, and answers
  their questions in plain words from the library.

Excluded on purpose: licensed lawyer review (owner's choice, later); polish
that does not change what the person does next (after-beta list).

## Hard cases

Signals in the record (a passed limitation or notice date, several or
out-of-province parties, a claim near a money limit, safety or urgency, facts
pointing to several claims, a question the library does not cover) each get a
defined response: the rule and what it requires without saying whether it is
met, urgent routes first, choices listed, or a plain "not covered yet" with
referral routes. Each new claim type gets at least one test case.

## After-beta list

Ideas that are wanted, but wait until the finish line passes. Add to this
list rather than starting them; the owner moves an item into the plan only
through the decision log.

- Strategy features: looking at a matter from every angle (own lawyer, judge,
  the other side), behind their own switch, never saying how strong a case is
  (owner, 2026-10-08).
- A communication log, and a shared space where the two sides can negotiate
  on the site instead of by email.
- Polish that does not change what the person does next.
- A public Sources page listing every official text the answers quote, with
  its link and the date it was saved (docs/sources/corpus/manifest.json), and
  a Trust and Security page that claims only what is in place (Canadian data
  residency, per-person access, production auth settings) and nothing in
  progress. Seen on opencase.com, whose page called certifications "certified"
  that its own list showed "In Progress" (owner, 2026-10-09).
- Before the Trust page, decide on production backups: the free plan has none
  automatic, only the manual dumps (CLAUDE.md section 6).

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-06 | Plan adopted | One plan and one fixed finish line, so "done" is measured, not re-argued |
| 2026-10-06 | Added the conversation check to the finish line; owner approved the plan and handed the build to Claude | Correct answers are not enough; the person must also be guided well in conversation |
| 2026-10-07 | Owner direction: the site answers people's questions and stories in plain words, checking every statement against the official text before showing it (checked answers); and the library grows to hundreds of case types with a sourced answer for every stage. Added to the work alongside Phases 3-5; the finish line's test cases now also include the law exam (`scripts/eval/lawExam/`). | The first law exam run showed the site finds the main rule but shows only about half of what a full answer needs, and gives passages instead of an answer. The owner wants accurate answers, not lists of passages |
| 2026-10-08 | Owner direction: (1) no new feature directions until the finish line passes; a new idea goes on the after-beta list, and work already under way in a chat is finished, not dropped. (2) Phases 3-5 are worked in one main chat at a time; any other chat at the same time takes a separate job that does not touch the same files, and checks the open pull requests before starting. (3) Pull requests merge through auto-merge once CI passes (CLAUDE.md 5a). | Since the plan was adopted, most work went to directions added after it, and Phases 3-5 had not started, so the finish line kept moving. Several chats on the same code duplicated work and, on 2026-10-08, put two broken builds on main. |
| 2026-10-08 | Owner direction: follow this plan, phases 1-5 in order, until the finish line passes; no other build work until then. Finish line measured by the page walkthrough's 20 cases (`FINISH_LINE.md`, scored by `scripts/walkthrough/critique.ts`) PLUS 10 new held-back cases never used for fixing, run once at the end. The guided path is rebuilt to reason from the law for any case (the checked-answer engine, the case-type library, the deadline engine, the forms library), not scripted per case type. | First finish-line scorecard (2026-10-08): 0/20 on "where to file, fee, service" and "never ask twice", 1/14 on counted deadlines, 0/15 on the conversation; 5 runs did not finish. Two days had gone to the law exam and strategy, off this plan, and the build direction kept changing. |
| 2026-10-09 | Owner direction: grow the library now so the site can answer any matter people bring, starting with claims against the Crown, bail, victims' rights and human rights (the owner's own family matter was the test). Sources are added through the existing free routes (Vendor Sources for statutes and court pages, Fetch Decisions for Supreme Court and Court of Appeal judgments), and the automatic source requests keep adding what questions show is missing. Lower-court and tribunal decisions stay manual (CanLII terms). | Tested OpenCase with a real story: the answers needed law the site had (Criminal Code, Crown Liability and Proceedings Act, Human Rights Code, Charter) plus decisions and victims' statutes it lacked. |
| 2026-10-12 | Owner direction: "i want everything on, there are no saved cases and we are just testing plus nobody knows about or is useing the site". Switched on by default: strategy (STRATEGY / NEXT_PUBLIC_STRATEGY, off with `off`), the case reader (CASE_READER / NEXT_PUBLIC_CASE_READER, off with `off`), the full intake analysis (ANALYSIS_DEPTH, `fast` for the quick one), and AI document analysis while OWNER_LIVE_TESTING is on (AI_DOCUMENT_ANALYSIS_ENABLED=false turns it off; ZDR_CONFIRMED_AT stays null because no confirmation has arrived). | The site has no real users or saved cases; the owner wants to test the whole product as it will run. Before real users: OWNER_LIVE_TESTING back to false, and each switch reviewed. |
| 2026-10-12 | Owner direction: the build order above (quick fixes; shared pieces for all courts; then Small Claims, Family, Civil, each locked by tests) governs the order of work; the living list is the "CourtSimplified Build Order" doc. Everything is switched on for testing (no users, no saved cases). New held-back cases replace the set used for fixes on 2026-10-09. | To stop drift: one ordered list, each item done when its test passes, shared pieces built once so all three courts get them. |
| 2026-10-13 | Owner direction: Claude drafts from its own legal knowledge (the law map, `docs/law-map/`: every case type, how it starts, each step, motion, deadline, form, statute and leading decision), and only what is matched to the official text and passes the checks is published (CLAUDE.md s. 2). An independent agent checks each batch in place of a licensed reviewer. The map is built alongside the build order, in its own files, and feeds each court's lock-down as it is verified. | Coverage was growing only as tests found gaps; the owner wants the whole of the law used, managed rather than limited. |
| 2026-10-13 | Owner direction: a second, practical lane. Beside the legal lane (rules, deadlines, forms, courts: checked against the official text, CLAUDE.md s. 2), the site may write practical guidance in its own words about the person's own case: what evidence to gather and how (photos, independent expert reports, several quotes), how to get records (title searches, access-to-information requests, an institution's own policies and logs), who to ask and what to ask for. It may not state law: every sentence is screened, and a legal statement inside practical guidance goes through the checked-answer engine or is removed. Facts about a named institution come from its own official page, fetched and linked. Behind its own switch (`PRACTICAL_GUIDANCE`); the A2I description must call it general practical guidance, separate from the reviewed legal content. Built with Phase 4. Design: `docs/PRACTICAL_GUIDANCE_DESIGN.md`. | A walkthrough of a homeowner with a construction lien (2026-10-13) found the right law but nothing on what a lawyer would tell him next: get an independent expert, get quotes, photograph the slopes, pull title. The chat can only select pre-checked blocks, so anything outside rules and forms reads as robotic or is missing. |
| 2026-10-14 | Owner direction, fixed: **one way, not re-argued.** Smart AI reads and reasons; the code's map decides procedure. (1) The strongest model reads the whole story, reasons about it like a top lawyer, asks what is missing, explains in plain words and writes the practical lane. (2) Which court or process: code rules for the regimes that are fixed by law (construction liens, the LTB, the Small Claims money limit and the other exclusive tribunals) run first; the AI decides only within them, as a suggestion the person confirms. (3) The next step, its form, deadline, where and how to file, fee, service and what comes after come only from the stage map (`stage-map/stageMap.ts`, `stageSequence.ts`, `content-library/nextStepPractical.ts`, the deadline engine). The AI picks the stage and explains it; it never states a step, form or deadline of its own, on any page. (4) A step the map does not have is shown as "not covered yet" and goes into the law map to be verified and added. (5) Any other legal statement goes through the checked answer, and passes only if its rule belongs to the person's court and regime. (6) No other copy of procedure (database rows, older 9-stage blocks) is shown to anyone. CLAUDE.md s. 2a. | The owner has asked for this many times and sessions kept proposing different ways. The lien test (2026-10-13) showed the cause: the AI found the right law, then stated the ordinary 20-day civil Defence deadline from the wrong rulebook. An audit (2026-10-14) found the map is sound, but the case analysis, the front door's unchecked lines and strategy could still state procedure around it, and lien routing was one sentence in a prompt. |
