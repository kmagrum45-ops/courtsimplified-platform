# Ask-once stress test: the plan (not built yet)

Asked for by the site owner on 19 Nov 2026 (Chrome pass 3 on #550, item 3): at least 30 made-up stories, each read
3 times by the real model and recorded (tests/browser/fixtures/real-ai/), run in the ask-once CI shards
(`.github/workflows/courtsimplified-ask-once.yml`, one story in exactly one shard: `test:ask-once-shards`).

## What every story and every reading must show (fails the run)

1. **No fact is asked twice** on any screen: the ask-once spec's own count (tests/browser/ask-once-pages.spec.ts).
2. **No question is asked whose answer the story states** (added 19 Nov 2026). For every fact the story reader can
   state (`STORY_STATED_FACTS` in src/lib/case-system/intakeReview.ts: when it happened, the amount, what the person
   wants), a story that states it is never asked it cold, on any screen: the home page does not ask it
   (factQuestions.ts `homeAsks`), and the intake offers it once (Yes / No, that's not right / I'm not sure). Read
   from each record's `seen` lines: a "home:" or chat question for a stated fact is a failure.
3. **The same story asks the same questions on every reading**, worded identically: the home page's questions come
   from the story and the record, never from the model's reading (`test:no-ai-question-text` checks the recorded
   readings; the stress run checks the pages).
4. **No answer, and no "I do not know yet", is saved as part of the story** (personWords.ts `frontDoorStory`): the
   case file's story, the Form 7A reasons and every draft hold the story field only.
5. **"Not sure" never replaces a value** the person gave or the story states (factRecord.ts `applyFactWrites`;
   `test:one-writer` fact states).
6. **A replay that misses a recorded step fails** (aiFixtures.ts `replayMisses`), and after re-recording only the
   steps the replay uses are kept (scripts/browser/pruneAiFixtures.mjs).

## Stories

Ten per court (Small Claims, Civil, Family), both sides, written so that the stated facts vary: some give a date, an
amount and what the person wants, some give none, some give one. Each gets a row in the spec's story list with its
own answers, and three recorded readings.

## Cost

Recording 30 stories x 3 readings calls the model once per AI step per reading (about 6 steps). It is recorded once
and replayed for free in CI afterwards; the replay runs on every PR that touches the ask-once spec's import closure.
