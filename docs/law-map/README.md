# The law map

The whole of the law the site covers, area by area: how each kind of case
starts, what must happen before it can start, every step after, the motions
at each point, the deadlines, the forms, the statutes, the legal tests and the
leading decisions. Site owner, 2026-10-13: "use your knowledge, managed, not
limited" (CLAUDE.md s. 2, "Draft from knowledge; publish only what is
verified").

## What this is, and what it is not

- **It is a draft.** Each item is written from Claude's own legal knowledge.
  Nothing here is shown to a user.
- **Each item names where the law says it** and gives a short phrase
  (`expect`) that should appear in that provision. `npm run law-map:check`
  looks up the provision in the saved official text and checks the phrase.
  That turns recall into something testable:
  - **matches the source**: the provision was found and the phrase is in it;
  - **phrase differs**: the provision was found, the phrase was not, so the
    draft is corrected from the source before anything is built from it;
  - **not located**: the pinpoint was not found in the saved text;
  - **source not saved**: the law is not in `docs/sources/corpus/` yet; it is
    a to-do for the vendor workflow;
  - **lead**: a court decision named from knowledge; it must be retrieved and
    read (SCC and ONCA sites; never CanLII) before the site quotes it.
- **Reviewed**: a second agent that did not write the item read the cited
  provision and checked that `says` states only what it supports (`review`
  on the item records the verdict and any correction). A matching phrase
  proves the item points at the right provision; the review proves the plain
  words do not say more than it does. The first sample (250 items,
  2026-10-13) found 11 wrong and about 94 that said more than the cited
  subsection; all were corrected from the source.
- **In the site** is shown beside the status when a stage or citation already
  quotes that provision.
- Only items that match the source AND have been reviewed are built into stages, cards and answers,
  and then they are quoted from the source, not from the draft.

## Format (one file per area, `<area>.json`)

```json
{
  "area": "small-claims",
  "title": "Small Claims Court",
  "updated": "2026-10-13",
  "items": [
    {
      "id": "sc.defence.time",
      "kind": "deadline",
      "title": "Defendant's time to defend",
      "says": "A defendant who wants to dispute the claim serves a defence (Form 9A) on every other party and files it, within 20 days of being served.",
      "source": { "corpusId": "oreg-258-98-small-claims-rules", "pinpoint": "r. 9.01", "expect": "within 20 days of being served" },
      "form": "9A",
      "leadsTo": ["sc.default.noting"]
    }
  ]
}
```

- `kind`: `pre-step` (before a case can start: a notice, leave, an internal
  process), `start`, `step`, `motion`, `deadline`, `form`, `test` (what must be
  shown: the elements of a claim or the test for an order), `option` (a choice
  the law offers: settle, discontinue, appeal), `enforcement`, `statute` (an
  Act or regulation that governs the area), `decision`.
- `source`: `corpusId` (an id from `docs/sources/corpus/manifest.json`) when the
  law is saved; otherwise `citation` and `url` for the official page. For a
  decision: `decision` (neutral citation) and `pinpoint` (paragraph).
- `expect`: 3 to 10 words believed to appear verbatim in the provision.
- `leadsTo`: ids of the items that can come next, so the map is also the
  chain of steps.

## Status

`docs/law-map/STATUS.md` (generated) and the owner's progress page.
