# Walkthrough fix ledger (5-case runs, 2026-10-13)

Every reason the reviewer gave for a failure in runs 38470954003, 38475320722
and 38482600205, grouped by its cause. Each cause has one fix and one way it is
checked. A cause is closed only when its fix is merged AND a later run no
longer reports it. Status: open / fixed (merged, awaiting run) / closed (run
confirms) / blocked (says why).

Cases: SW = civil-plaintiff-municipal-slip (Toronto sidewalk), MC =
family-motion-to-change-support, FR = family-respondent-parenting, RN =
small-claims-guided-defendant-reno, JU = small-claims-plaintiff-judgment-unpaid.

## Asked again (noRepeat)

| # | Cause | Cases | Fix | Check | Status |
|---|---|---|---|---|---|
| R1 | Case page asks for the stage confirmed on the results page | SW, FR, RN | Stage saved first and alone, retried; case page reads again before asking (#325, #326) | Run 3: no case page asked | closed |
| R2 | Guided questions asked though the story answers them: side ("Are you suing someone", "starting or responding"), other side ("Who is the other side" after "sue the city"), goal ("What would you like to happen" after "how do i get it lowered") | SW, FR, MC | Story readers widened; a question the story answers is shown as "From what you told us: ... Is that right?" | test:story-answers on every test story | open |
| R3 | The child-support builder asks "Tell me about the children" and income documents after the intake recorded them | MC | Builder not shown for an existing order (#326); prefill from the intake for anyone else | Run | fixed / open (prefill) |
| R8 | Results ask "How were the papers served?" (open select) though the story said "in the mail" | RN | A way of serving read from a sentence about the papers is shown as a suggestion with the sentence and a Change button; the select opens only on Change or when none is read | test:next-step | fixed |
| R9 | Unpaid judgment: "within 6 years of the order" never connected to the judgment date; card asked no date | JU | Six-year leave threshold (r. 20.08 (2.1), 20.06 (1.1), 20.07 (1.1)) on both unpaid-judgment steps, counted to the anniversary of the order and never moved past a weekend (`threshold`, s. 89 (7)); the condition that needs leave sooner beside it (run-24) | test:next-step | fixed |
| R4 | Case overview asks "Which year was that?" / "How were the papers served?" after the date and method were saved | RN | Overview reads the saved date and method before asking | test | open |
| R5 | Case file shows "None yet" / asks for dates already saved | SW, RN | Case file reads the saved position | test | open |
| R6 | Timeline asks "What kind of step was this?" for a sentence matching the confirmed stage | JU | Timeline classifies a sentence that matches the confirmed stage's own event without asking | test | open |
| R7 | Forms page asks about a defendant's claim after the intake recorded the request for repair money | RN | Forms suggestion from the recorded claim | test | open |
| R13 | Guided chat asks "Has anything been filed..." after "i got served the papers" / "i want to sue the city" | FR, SW | familyFiledFromStory / civilFiledFromStory offer the form's own option from the story (served -> application / statement of claim; wants to sue with no paper mentioned -> nothing filed); never from a negation or someone else served | test:story-answers section 5 | fixed (awaiting merge) |
| R14 | Forms page asks "Was this case started by Notice of Action?" after the confirmed stage "I have not filed anything yet" | SW | The confirmed starting-case stage offers "No" as a suggestion (never kept; never for a defendant or a story naming a notice of action) | test:case-record | fixed (awaiting merge) |
| R15 | Forms page asks "Which motion document set?" on the motion-to-change step | MC | With no step chosen, the step the case pages show (caseStepFor) answers it as a suggestion; a chosen step keeps it | test:case-record | fixed (awaiting merge) |
| R16 | Card shows an open "How were the papers served?" select though the story says "in the mail" (pre-selected, never shown as known) | RN | serviceMethodFromStory already reads it; the select is shown regardless in StageAnswerPanel.tsx (other agent's file): show a known method as "From what you told us: Regular mail" with Change | test:service-dates (reader) | open (StageAnswerPanel) |
| R17 | Timeline asks "What kind of step was this?" of "It's been months and he hasn't paid anything." | JU | describesNothingHappening: a dateless sentence saying only that something did not happen is not a candidate | test:case-events | fixed (awaiting merge) |
| D1 | "Within 6 years of the order" not tied to the May judgment; no order-date question | JU | Order-date cue reads "i won my case ... in may" (quoted, no day filled). The step plaintiff:judgment-in-my-favour-unpaid has `deadlines: []`, so no date question: needs a stage-map deadline counted from `order-made` (rr. 20.06 (1.1), 20.07 (1.1), 20.08 (2.1)) | test:case-position | open (stage-map) |

## The next step and its card

| # | Cause | Cases | Fix | Check | Status |
|---|---|---|---|---|---|
| C1 | Notice step: no help writing the notice to the City (what it must say, who gets it, how) | SW | Card shows what the notice must contain and how to deliver it, from s. 42 (6) itself, and offers a draft notice built from the person's facts | test + run | open |
| C2 | Card for the notice step led with general two years; Crown/libel/occupier notices shown | SW | Notice that fits leads; others dropped (#326, #327) | test:next-step-card | fixed |
| C3 | Toronto notice explained with the Municipal Act | SW | Toronto's own deadline added (#326); the intake's tailored question cites s. 42 | run | fixed / open (intake question) |
| C4 | Passed notice deadline: no plain warning, no urgent-help pointer, no mention of the excuse rule | SW | When a bar-the-claim deadline has passed, the card says so plainly, names the excuse/death exceptions from the rule, and points to urgent help | test | open |
| C5 | Motion to change: application offered instead of Form 15 | MC | No application builder for an existing order (#326) | Run 3: Form 15 named | closed |
| C6 | Motion to change: card leads with "Attend the mandatory information program" without its source, for a support-only change | MC | Check r. 8.1's own scope for motions to change; show it only where it applies, with its rule | test | open |
| C7 | Family respondent (parenting only): card shows property-claim and financial-statement lines | FR | Lines conditional on a property or support claim are folded unless the person's issues include one; run 38500825561 still read the fold as next steps, so any "If" limit naming only claim kinds the words never show (property, support, home, divorce, parenting) now folds under its own heading saying why | test:next-step | fixed |
| C9 | Passed statutory notice: card line called Saturday "the last day" and "passed" before the s. 89 (2) words; "today" read in UTC (22:30 in Toronto was the 14th) | SW | deadlineLineFor: a closed counted day is never THE last day, same conditional words as the passed box; today is Ontario's (todayInOntario) | test:next-step | fixed |
| C10 | Notice step titled with every notice kind; card led by the every-notice paragraph ("Leave the notice to the Crown ...") | SW | One notice kind kept: title fitted to it (noticeStepTitle); the every-notice paragraph left to the full answer (cardShowsLead) | test:next-step | fixed |
| C11 | Notice card never named the later claim form | SW | "Then, starting the court case": Form 14A (r. 14.03 (1)) or Form 7A (r. 7.01 (1)) and the issuing fee, after the notice | test:next-step-practical | fixed |
| C12 | Support-table card shown before the motion-to-change step | MC | Existing order: table card folded after the step panel (page.tsx, two small edits) | test:next-step | fixed |
| C8 | Mail service: receipt date counted as mailing date; definitive deadline shown though how it was served is unresolved | RN | A date the papers ARRIVED by mail is not counted as the mailing date; the card asks for the mailing date (postmark) and shows the range | test:case-position | open |

## Where to file, fee, service

| # | Cause | Cases | Fix | Check | Status |
|---|---|---|---|---|---|
| F1 | Family: the person's own court not named | MC, FR | Name the court office from their city (the courthouse list) for an existing case: "the court where the case was started" plus the office for their city | test | open |
| F2 | Family respondent: fee shown as $171 first; the parenting-only no-fee rule buried | FR | Fee lines ordered by the person's issues; the exemption that applies leads | test | open |
| F3 | Motion to change: fee not shown | MC | Card names the motion-to-change fee rule from the fee regulation | test | open |
| F4 | Garnishment: serving the garnishee (employer) and its order not explained | JU | Garnishment service lines from r. 20.08 (6)-(6.1) | test:next-step-practical | open |
| F5 | Civil: serving a municipality (r. 16.02 (1) (i)) missing | SW | Service line for a municipal corporation | test | open |

## Sources

| # | Cause | Cases | Fix | Check | Status |
|---|---|---|---|---|---|
| S1 | Published answers cite one rule for several statements (r. 20.08 (7) for six-year, wage-limit, examination) | JU, RN, MC | Re-run the content pipeline for the affected answers so each sentence carries its own rule (paid; ~$1-3) | test:published-library + statement check | blocked: needs OpenAI credit |
| S2 | Mandatory information program line without its rule | FR, MC | The card shows r. 8.1 (4) beside it | test | open |
| S3 | Timeline's holiday/office-closure explanation without source | SW | Cite Legislation Act s. 89 there | test | open |
| S4 | "The rules don't say whether that moves" stated without a source | RN | Reword to what the rule says, with the rule | test | open |
| S6 | "Papers left with you after 4 p.m. count as served the next day" without its rule | FR | Each when-service-counts sentence of a deadline shown with its subrule from the deadline's own exceptions (r. 6 (11.1) etc.), under "Your deadline" | test:next-step | fixed |
| S5 | Six-month Family Law Act restriction without precise provision | MC | Cite the subsection | test | open |

## Conversation

| # | Cause | Cases | Fix | Check | Status |
|---|---|---|---|---|---|
| V1 | Two question systems at once (family triage beside the guided chat; child-support builder) | FR, MC | Triage questions come after the guided chat, not beside it | run | open |
| V2 | Guided chat ends "That's everything we need" without the service date / move details | FR | For a respondent, the service date is asked (it starts their deadline); "why" says so | test | open |
| V3 | Questions without a "why" (claim-type page: dates); two questions in one | RN | Claim-type page: one question at a time, each with why | run | open |
| V4 | "How do I get it lowered?" never answered plainly | MC | The motion-to-change answer leads with the plain route: Form 15, where, fee, service | run | open |
| V5 | Urgency not raised by the site when the facts show it (passed notice) | SW | Same as C4 | run | open |
