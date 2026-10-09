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
   strength). Done when every claim type in the test set lists its parts with
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
