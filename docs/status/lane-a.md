# Lane A status

Updated after every step (site owner's working agreement, 27 Nov 2026). Every claim is labelled PROVEN (shown by a run,
a check or a command) or NOT PROVEN.

**Updated:** 27 Nov 2026, night (Toronto), after the block table approval: build order step 1 done, step 2 built,
step 3 (the rerun) next.

## For review now

- **The 35 deadline items, kept or cut with the reason (row D):** `docs/acceptance/sc-deadline-items.md` on
  `feat/sc-results` (23 kept, 12 cut):
  https://github.com/kmagrum45-ops/courtsimplified-platform/blob/feat/sc-results/docs/acceptance/sc-deadline-items.md
- **The block table, with the approved changes to L, D and Z:** `docs/acceptance/sc-results-blocks.md` on `feat/sc-results`:
  https://github.com/kmagrum45-ops/courtsimplified-platform/blob/feat/sc-results/docs/acceptance/sc-results-blocks.md
- **Catalogue conditions:** `docs/acceptance/catalogue-conditions-review.md` on `feat/catalogue-conditions` (75f7023e).

## The one counting method

The shared acceptance script's rules (`docs/acceptance/small-claims-journeys.md` on `test/acceptance-script`), applied
to the saved visible text of every screen by `tests/browser/acceptance/reevaluate.ts`, so every column is counted the
same way.

| Code | Stories | Rows | Failing rows | How |
|---|---|---|---|---|
| main 9c714ec9 (before #568) | all 10 | 1,387 | **428** | rerun of 27 Nov, saved screens. PROVEN |
| #568, switch off | all 10 + 8b second route | 1,540 | **509** | 27 Nov run. PROVEN |
| #568, switch on, first count | all 10 + 8b second route | 846 | 239 | 27 Nov run; every story stops at Forms. PROVEN |
| #568, switch on, recounted with the rule (b) fix | same saved screens | 760 | **190** | 49 rows were the script's, not the site's (below). PROVEN |

Main's saved screens have no field values, so (p), (q), (k) are under-counted there. Without those three rules: main
403 / 1,132, switch off 413 / 1,179. PROVEN. Report: https://github.com/kmagrum45-ops/courtsimplified-platform/pull/568#issuecomment-7232708828

## Correction

I said the biggest front-half cause was that confirming on Understood does not record the stated facts, so Questions
asks them again. **That was wrong.** A probe through the real write path and story 1's saved screens show the facts are
recorded and Questions does not ask them again (PROVEN). The real fault: the review showed a confirmed month and year
("March 2026") as "Not answered yet", and left out what was agreed, paid and tried to settle it. Most Questions (b)
rows were the script reading the kind question's option list.

## Finished

- **Build order step 1 (front half)**, branch `fix/understood-saves` (ef3c8c0d, from main, pushed, no PR):
  - the review shows every fact confirmed on Understood, in the words confirmed, through one function
    (`flow/reviewLines.ts`, the shared `slotText`): "March 2026 (day not given yet)", the amount as "$12,500.00",
    what was agreed, what was paid, what was tried. PROVEN by `test:sc-flow-core` 11, red on the old review (6 fails),
    green now (664 checks);
  - one notice in the new flow: the AI notice as stored, with the "Read more" link to /privacy; the legal information
    notice is not drawn when the switch is on for Small Claims. NOT PROVEN until the rerun.
- **Rule (b) checked and fixed** (`test/acceptance-script` 1c66e3f5): it counted the Understood step's once-offer lines,
  the review's lines and the kind question's option list as questions. Fixed; real re-asks still fail. PROVEN by
  `test:acceptance-rules` 10 (red on the old rules). Still real on the saved run: the defamation question "What exact
  words…, who received or saw them, and when did that happen?" asks a date and audience the story gives (stories 3, 7);
  "What evidence do you have" for 8b. Left as they are: story 5 "accept you owe … the amount" and the (a) date-word
  matches (stories 5, 6), likely script, NOT PROVEN.
- **Build order step 2 (results step)**, branch `feat/sc-results` (07ab1796, pushed, no PR; on top of
  `feat/catalogue-conditions` and with `fix/understood-saves` merged in): Forms has "See your next step"; `?step=results`
  draws the stage map's next-step card at the stage the situation answers settle, then the deadlines, the checklist,
  the law (considerations and notes), what you can do next and the sources, from the record by rules. No AI call
  (PROVEN by `test:sc-results` 5, red on an added AI import); each item once, deadlines soonest first, nothing without
  a confirmed kind (PROVEN by `test:sc-results`, red on a duplicate). That it works in the browser: NOT PROVEN until the
  rerun.
- **Deadline items:** 23 kept, 12 cut, each with its reason (`results/deadlineLines.ts`). A kept deadline that is an
  element (6) is drawn once, in the deadlines, not in the checklist (chosen, reversible).
- **Sign-up check (rule (s))**: on staging the site promises an email link and signs in at once. PROVEN. Staging skips
  confirmation by design; production requires it (not run there).

## In progress

- `ci:local` on `test/acceptance-script`, then the tests-only PR (owner's item 5).
- Then build order step 3: story 8 on the new build first, then all ten, and the three-column table.

## Pushed, waiting

| Branch | Commit | What | Next |
|---|---|---|---|
| `test/acceptance-script` | 97907028 | the acceptance script (tests only) | PR now (owner's item 5) |
| `fix/understood-saves` | ef3c8c0d | step 1: review keeps confirmed facts; one notice | held for the owner's review |
| `feat/catalogue-conditions` | 75f7023e | conditions | held for the owner's review |
| `feat/sc-results` | 07ab1796 | step 2: the results step (+ the two above) | held; the rerun first |
| `feat/sc-results-step` | 11c040f6 | the block table before approval (superseded by `feat/sc-results`) | none |
| `fix/save-plain-words` | 2d0b4e78 | item D: no raw save errors, one retry | held |
| `fix/have-this-every-element` | fdcfdb9f | the "I have this" crash fix (WIP) | step 4 |
| `fix/shared-causes` | 3b36e6c1 | "For:" once; "Not given" dropped (WIP, paused) | paused |

## Blocked

- Seeing the new flow on a Vercel preview needs `NEXT_PUBLIC_SC_FLOW_V2=on` on Preview (a Vercel setting; not changed
  by me). The local runs build it with the switch on instead.
