# Strategy — the plan (agreed 2026-10-08, not yet built)

Site owner's decisions, 2026-10-08:

- Build case strategy behind its own switch: **off on the live site until the Law
  Society's A2I approval covers it**, on for testing.
- Look at a matter from every seat: the person's own lawyer, the other side's
  lawyer or prosecutor, and the judge. Works for either side (bringing or
  responding to a case).
- **It never says how strong a case is, or how likely it is to succeed.** Not with
  the switch on, not ever. No percentages, no "good chance", no grading.
- Every point carries its source, like everything else (CLAUDE.md s. 2), and is a
  suggestion the person confirms (s. 4).

## What strategy shows (each item sourced)

1. **What you must prove, and with what.** Each element of the claim or defence,
   who carries the burden, the evidence on file for it, and what is missing.
2. **What the other side can raise.** The defences, objections and arguments the
   law makes available to them, and for each, the law and evidence that answer it.
3. **What the judge must decide.** The issues in order, the legal test for each,
   and the standard of proof.
4. **Procedural tools and timing.** Motions, offers to settle and their cost
   consequences (e.g. Small Claims r. 14.07), deadlines, the order of steps.
5. **Both sides.** The same analysis for a plaintiff/applicant and for a
   defendant/respondent.

## Rule change needed before building

CLAUDE.md s. 3 now forbids "opposing-argument responses" and "settlement pressure".
Proposed wording (to be shown to the site owner before it goes in): those are
allowed **only** inside the strategy feature, **only** while its switch is on, and
the ban on grading a case's strength or predicting outcomes stays absolute.

## How it will be tested

A strategy exam built like the law exam (scripts/eval/lawExam): case scenarios,
each with a written checklist of what a careful lawyer would cover from each seat,
graded by a separate call; plus a check that no strategy output grades the case.
