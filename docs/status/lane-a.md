# Lane A status

Updated after every step (site owner's working agreement, 27 Nov 2026). Every claim is labelled PROVEN (shown by a run,
a check or a command) or NOT PROVEN.

**Updated:** 27 Nov 2026, evening (Toronto), after the review of `feat/catalogue-conditions`.

## For review now

- **Catalogue conditions, reviewed and corrected:** `docs/acceptance/catalogue-conditions-review.md` on `feat/catalogue-conditions` (75f7023e):
  https://github.com/kmagrum45-ops/courtsimplified-platform/blob/feat/catalogue-conditions/docs/acceptance/catalogue-conditions-review.md
- **The block table (step 3), KEEP / MERGE / DROP with appliesWhen:** `docs/acceptance/sc-results-blocks.md` on `feat/sc-results-step` (11c040f6):
  https://github.com/kmagrum45-ops/courtsimplified-platform/blob/feat/sc-results-step/docs/acceptance/sc-results-blocks.md

## The one counting method

The shared acceptance script's rules (a) to (s) (`docs/acceptance/small-claims-journeys.md` on
`test/acceptance-script`), applied to the saved visible text of every screen by
`tests/browser/acceptance/reevaluate.ts`, so every column is counted the same way.

| Code | Stories | Rows | Failing rows | How |
|---|---|---|---|---|
| main 9c714ec9 (before #568) | all 10 | 1,387 | **428** | rerun of 27 Nov, saved screens, current rules. PROVEN |
| main 9c714ec9, first baseline | all 10 | 131 failing (old rule set, no saved text) | 131 | not comparable to the row above: fewer rules, and no saved screens to re-check. PROVEN as recorded |
| #568 (main 65a3424a), switch off | all 10 | | not run yet | next |
| #568 (main 65a3424a), switch on (new flow) | all 10 | | not run yet | next, through the new-flow click path |

Failing rows on main by rule (428): (a) 0, (b) 13, (c) 127, (d) 0, (e) 4, (f) 53, (g) 19, (h) 4, (i) 12, (j) 97,
(k) 0, (l) 1, (m) 10, (n) 0, (o) 63, (p) 16, (q) 9, reached 0. Rule (r) and (s) come from the two-run and sign-up runs
below.

## Finished

- **#568 merged** (65a3424a). CI was green on 3de6c63a (35 of 35). PROVEN. `case-workspace` fast-forwarded. #565 and
  #567 closed as inside it; every file they changed is on main. PROVEN.
- **Step 2: a showing condition for every Small Claims catalogue item**, branch `feat/catalogue-conditions` (pushed,
  75f7023e, no PR yet). All 1,496 items (642 elements, 358 considerations, 496 notes, 196 claim types) have a
  condition, hidden by default; 138 wait on a fact, asked once; 35 notice or time-limit items show as one deadline
  line whenever the kind is confirmed; set-off shows only for money owed. After the owner's review of 21fe7d4d: a
  plaintiff element waits on a fact only from a hand-written list of 7 that quotes each element's own name; every other
  element (635) shows whenever its kind is confirmed (PROVEN by `test:catalogue-conditions` 4e, red on 21fe7d4d with the
  four reviewed elements, green now); the government fact needs a claim against a public body (the Line Fences Act
  fence notes no longer wait on it); every note is named by its first sentence in the review file. PROVEN by `test:catalogue-conditions` (red
  with no conditions, green now). Review file: `docs/acceptance/catalogue-conditions-review.md` on that branch. Whether
  each generated condition is right is NOT PROVEN: it is for Cowork Claude's review.
- **The acceptance script**, branch `test/acceptance-script` (pushed, 56e49c2e, tests only, no PR yet): rules (a) to
  (s), saved screen text, offline re-check, sign-up check. PROVEN by `test:acceptance-rules`.
- **Runs on main 9c714ec9** (stories 8 then 8b in one account, 9, 8b by Chrome's route, then 8b and 9 again):
  276 failing rows of 836. PROVEN. Real findings: cards ask stated facts (b); story 8's typed outcome missing from the
  review and its own details from the case page (i); 8b asks the person's own address, phone and email again (k, Chrome
  I1d); the "Here is what we understood" labels differ between two runs of 8b and of 9 (r, Chrome I2d).
- **Loan deadline report (Chrome I2b)**: the deadline counts two years from "when it happened" for every claim type
  (computedDeadline.ts:166); the story reader drops a date after "by" or "due" (storyReader.ts:46), so story 8 counted
  from the loan date. PROVEN by reading the code. No rule changed.
- **AI spend today (Toronto day), visible to us:** about $5.45 (staging's own count $0.46 before the runs, plus the
  runs' ledgers $1.94, $1.90, $1.15). The real OpenAI total is NOT PROVEN (no admin key).

## In progress

- One table counted the same way: #568 with the switch off (running since 19:51) and on (next), all 10 stories,
  against main above.
- Step 3 table written and pushed (above), waiting on review; no results-step code until it is reviewed.

## Pushed, waiting

| Branch | Commit | What | Next |
|---|---|---|---|
| `test/acceptance-script` | cc316ab5 | the acceptance script (tests only), with the new-flow click path | PR after the #568 runs |
| `feat/catalogue-conditions` | 75f7023e | step 2, conditions (reviewed once, corrected) | Cowork Claude's review, then a PR |
| `feat/sc-results-step` | 11c040f6 | step 3 block table (doc only) | review, then the results step |
| `fix/save-plain-words` | 2d0b4e78 | item D: no raw save errors, one retry; terminal test of a lost reply PROVEN | rebase on main, then a PR in its turn |
| `fix/have-this-every-element` | fdcfdb9f | the "I have this" crash fix (WIP) | with the save-to-case change and the reload check (step 4) |
| `fix/shared-causes` | 3b36e6c1 | "For:" once; "Not given" dropped (WIP, paused) | after the block table |

## Blocked

- The sign-up check's result (rule (s)) is NOT PROVEN: its first run read the page before the form answered. Fixed; it
  reruns with the next run.
- Seeing the new flow on a Vercel preview needs `NEXT_PUBLIC_SC_FLOW_V2=on` on Preview (a Vercel setting; not changed
  by me). The local runs build it with the switch on instead.
