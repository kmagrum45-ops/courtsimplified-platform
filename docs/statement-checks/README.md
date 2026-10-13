# Random statement checks

Part of locking a court (master plan, build order step 3): 50 statements drawn
at random from everything a person sees for that court, each checked against
the saved official text by an independent agent that did not write them.

- Draw: `npx tsx scripts/eval/statementCheck.ts <court> [seed] [count]`
  (free: no network, no model). It collects published-answer sentences, deadline
  lines, next-step card lines and "what can happen next" lines with the quotes
  each rests on, checks every quote is word for word in its saved source, and
  writes `<court>-<seed>.json`.
- Review: an independent agent fills each statement's `review`
  (correct / overreaches / wrong, with a note) and a `reviewSummary`.
- Fix: corrections are made from the source and listed under `fixes`, then
  re-checked by the reviewer.

| Court | Seed | Drawn from | Correct | Overreaches | Wrong | After fixes |
|---|---|---|---|---|---|---|
| Small Claims | 20261013 | 747 statements | 40 | 10 | 0 | 48 correct; 2 accurate but under-cited (published answers, fixed at the next promotion) |
