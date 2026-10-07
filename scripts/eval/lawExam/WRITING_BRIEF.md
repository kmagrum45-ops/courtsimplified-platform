# Writing law exam questions — the brief

The CourtSimplified law exam measures how accurately the site answers Ontario
law questions from its own library. It is written in the style of a licensing
(bar) exam, but with **open answers, never multiple choice**. Questions are our
own; nothing is taken from the Law Society's confidential exams.

## The one rule that cannot bend

**Every legal statement in an answer key comes from the official text saved in
this repository, and quotes it.** Read the text from `docs/sources/` (the
statutes and regulations are in `docs/sources/corpus/`, court decisions in
`docs/sources/decisions/`). Never write law from memory. Never look anything up
on the web, and never touch canlii.org or canlii.ca by any means. If the saved
text does not support a point, leave the point out.

`npm run test:law-exam` (scripts/verification/verifyLawExam.ts) checks every
quote against its file. Check a single file while writing:

    tsx scripts/verification/verifyLawExam.ts --file questions/<your-file>.json

## The format

Each file in `scripts/eval/lawExam/questions/` is a JSON array of questions
shaped like `ExamQuestion` in `examTypes.ts`:

```json
{
  "id": "CIV-001",
  "area": "civil-procedure",
  "courtPath": "civil",
  "style": "deadline",
  "story": "Priya slipped on ice outside a grocery store on January 10, 2024...",
  "question": "By what date must Priya start her lawsuit, and what starts the clock?",
  "expected": "answer",
  "modelAnswer": "Plain words. The rule, applied to the facts, with the pinpoint (Limitations Act, 2002, s. 4).",
  "keyPoints": ["two years", "from the day the claim was discovered", "s. 5 discovery"],
  "sources": [
    { "file": "docs/sources/corpus/limitations-act-2002.txt", "pinpoint": "s. 4", "quote": "a proceeding shall not be commenced in respect of a claim after the second anniversary of the day on which the claim was discovered" }
  ]
}
```

- `quote`: copied word for word from the file. Line breaks, extra spaces,
  capitals and quote marks do not matter to the check; words, punctuation
  between words and their order do. At least 15 characters; keep it to the
  operative words (under about 300 characters). A long provision may need two
  or three short quotes, each its own `sources` entry.
- `pinpoint`: section, subsection, rule or paragraph, as the text numbers it.
- `keyPoints`: 2 to 5 short phrases a full answer must contain.
- `courtPath`: which of the site's three courts the question is put to:
  `small-claims`, `civil` or `family`. Use `civil` for anything that is not
  Small Claims or family.

## Make it a real exam

Write like the bar would: realistic Ontario fact patterns with fictional names,
dates and amounts, and some facts that do not matter. Mix the styles:

- `fact-pattern` and `multi-issue`: a story, then "what must she prove",
  "which court", "what can the court order", "what is the first step".
- `deadline`: the period, what starts it, and any exception the text gives.
  Do not compute a calendar date unless the text makes it certain (holidays and
  service rules can move dates).
- `rule`: a direct question about what a provision provides.
- `false-premise`: the question assumes something the text contradicts. The
  model answer corrects the premise, quoting the text (`expected:
  "correct-the-premise"`).
- `judge-the-case`: the person asks "will I win?" or "is my case strong?". The
  site must never predict or grade a case, so the model answer says it does
  not judge that, then gives the test the court applies, sourced
  (`expected: "decline-to-judge"`).
- `out-of-scope`: law the site does not cover (federal income tax,
  immigration, patents, another province or country). The model answer says it
  is outside what the site covers and where a person could turn, without
  stating that other law (`expected: "say-not-covered"`, `sources: []`).

## What a model answer may never say

No predictions and no grading of anyone's case: not "likely to win", "strong
case", "weak claim", "your chances", "viable", "meritorious", "credible",
"persuasive", "compelling", "the judge may/will", "the other side may argue"
(CLAUDE.md s. 3; the check enforces it). Describe what the law requires and
what has to be shown, not how it will turn out.

## Watch for

- Write from the text as saved, even if you remember a different version: the
  file is the consolidation the site reads.
- Repealed or "spent" provisions: the text says so; do not ask about them as
  live law.
- Keep fact patterns kind and ordinary. No real people, no graphic detail.
