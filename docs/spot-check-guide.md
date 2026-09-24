# Spot-check guide

For the licensee reviewing content before it is served.

This is not a list of everything to read. It is a list of the places where an
error would do the most damage and would be hardest to notice — the things to
check first, and what "wrong" looks like in each.

---

## Start here: what the statuses mean

| Status | What it means | Can a user see it? |
|---|---|---|
| `draft` | Written, nothing checked. | No |
| `needs-human` | The pipeline tried three times and could not support every sentence from a source. It stopped. | **No** |
| `verified-draft` | Every sentence was checked against vendored source text by a separate pass, and every supporting quote was then found verbatim in the corpus by code. | No — not until approved |
| `approved` | **You** read it and signed off. | Yes |

Nothing reaches `approved` except by a person. The pipeline's ceiling is
`verified-draft`, and `REQUIRE_APPROVED_CONTENT` is the switch that stops
anything unapproved from being served.

**`verified-draft` is not a recommendation.** It means the sentences match the
sources. It does not mean the block is useful, complete, well-judged, or the
right thing to say to a frightened person. That is what your review is for.

---

## 1. The three pre-suit notice deadlines — check these first

`docs/sources/corpus/municipal-act-2001.txt`, `city-of-toronto-act-2006.txt`,
`occupiers-liability-act.txt`

These are the only deadlines in the product where missing it means **there is
no action at all**, rather than a step being lost. They are also the ones a
self-represented person is least likely to know exist. Nobody expects a 10-day
clock on a fall.

Check that every block stating one of them **also states the exceptions**:

- failure is not a bar where the injured person died
- failure is not a bar where a judge finds a reasonable excuse and no prejudice

A block giving the number without those would frighten someone out of a claim
they still have. That failure is invisible — the person simply goes away and
never tells anyone.

Also check the **scope**, which cuts both ways. Municipal notice attaches to the
non-repair duty, not to every municipal injury. And `Municipal Act s. 44 (9)`
says that except in cases of gross negligence a municipality is **not liable**
for personal injury caused by snow or ice on a sidewalk. Telling someone to
serve notice in 10 days without that is telling them half of what decides their
case.

**Why this is first:** the Occupiers' Liability Act was previously cited in this
codebase from a historical consolidation frozen seven weeks before s. 6.1 came
into force, so the slip-and-fall content mentioned the two-year limitation
period and not the 60-day notice. That already happened here.

## 2. Any date the product computes

The deadline engine (`src/lib/case-system/deadlines/`) counts days in code, not
by model, and shows its working. Check a few against the calendar.

The one to check hardest: **a statutory deadline that lands on a Saturday.**

- Under the Small Claims rules (`r. 1.02 (a)`), every Saturday and Sunday is a
  holiday, so a period running out on a Saturday runs to the Monday.
- Under the `Legislation Act s. 88 (2)`, **only Sunday is a holiday.** Saturday
  is not on the list.

The notice deadlines are statutory. So the same ten days from the same event
ends on the Saturday under the Act and the Monday under the rules. The engine
flags this rather than stating it flatly, and that flag is correct.

Five holidays — Good Friday, Easter Monday, Labour Day, Thanksgiving Day and
Civic Holiday — have **no date stated in any statute** we could find. The engine
uses the settled dates and marks them. Where a deadline moved because of one of
those, the answer says to confirm with the court. Check that it does.

## 3. Wrong actor, wrong form, wrong number

These three are what the verifier is tested against, because they are what cost
people cases and they read perfectly well:

| Error | What it looks like | What it costs |
|---|---|---|
| Wrong actor | "a judge may note the defendant in default" | It is the **clerk** (`r. 11.01 (1)`). Someone books a motion for something done at a counter — weeks lost. |
| Wrong form | "file a request to note in default using Form 9A" | It is **Form 9B**. Form 9A is the defence, so a plaintiff is sent to file the other side's document. |
| Wrong number | "serve your defence within 30 days" | It is **20** (`r. 9.01`). Ten extra days taken in good faith, and they are noted in default. |

Scan for form numbers and day-counts and check each against the rule cited
beside it. The form table is vendored at
`docs/sources/corpus/small-claims-forms-table.txt`.

## 4. Where the block says nothing at all

Read the `needs-human` blocks, not just the verified ones.

The stages that could not be written are as informative as the ones that could.
Where the pipeline reports "the whatToDoNext section could not be written from
the sources", it usually means there genuinely is no official source saying what
to do — `both:filed-in-wrong-place` is the clearest example. A person in that
position is getting nothing from us, and that is a content gap to fill by
authoring, not a pipeline fault to fix.

## 5. Tone, on the stages where someone is frightened

The twelve "things went wrong" stages — missed deadline, failed service, missed
hearing, default judgment against you, wrong court — are where a person is most
likely to be reading at midnight, and where wording does the most work.

Check that these:

- do not minimise ("don't worry" when there is something to worry about)
- do not catastrophise (a missed defence deadline is recoverable under
  `r. 11.06`; a missed notice period usually is not — the two must not read the
  same)
- say what can still be done, first

## 6. The line between information and advice

Every block should explain what the law says and leave the reader to apply it.
Flag anything that:

- tells the reader their facts satisfy a legal test
- says how strong their position is, or what a judge is likely to do
- drafts what they should say or argue
- decides something for them rather than laying out the option

The wording is not the shield. "In your situation, the limitation period has
expired" is advice however it is phrased.

---

## What to do with what you find

- **A wrong particular** (number, form, actor) — that is a defect. Report it
  with the block id; the block goes back to `needs-human`.
- **A missing exception or a missing caveat** — same.
- **Tone, emphasis, ordering, or a word a reader would not know** — mark it up.
  These do not fail a check and will never be caught automatically.
- **A block you would not serve** — leave it unapproved and say why. There is no
  pressure to approve anything, and an unapproved block is simply not shown.

## Reproducing the evidence yourself

```
npm run test:rules-corpus    # every source is vendored, current, and complete
npm run test:stage-map       # every quoted provision is in the vendored text
npm run test:deadlines       # the day-counting, including the Saturday case
npm run test:verifier        # the verifier rejects wrong deadlines, actors, forms
npm run test:stage-answers   # re-checks every quote the pipeline relied on
npm run rules:check          # has any source changed since it was vendored?
```

`docs/content-pipeline/` holds the run logs: for every sentence, the verifier's
verdict and the passage it quoted. That is the record of what was checked and
what it concluded, and it is committed rather than written to a database so it
can be read without access to anything.
