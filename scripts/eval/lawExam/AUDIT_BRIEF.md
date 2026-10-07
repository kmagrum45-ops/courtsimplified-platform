# Auditing law exam answer keys — the brief

Read `WRITING_BRIEF.md` and `examTypes.ts` first. `npm run test:law-exam`
already confirms that every quote appears word for word in its source. An
audit checks what it cannot. For every question, open the cited sources under
`docs/sources/` (never the web, never canlii.org or canlii.ca) and check:

1. The model answer is correct according to the saved text, including any
   exception or cap the text gives that the facts trigger, and it leaves out no
   requirement the text treats as essential to the question asked.
2. Every statement of law in the model answer is supported by a quote in
   `sources` (add a word-for-word quote with its pinpoint, or remove the
   statement).
3. Each pinpoint is right: check the section, rule or paragraph numbering
   around the quote.
4. The provision is current in the saved text, not repealed or spent.
5. The question is fair: one defensible answer from the text, and the story
   gives the facts the answer depends on (for example, "separated but not
   divorced" when that decides which statute applies).
6. Nothing predicts or grades a case.

Fix problems in place, keeping each question's id, area, style and expected.
Then run `tsx scripts/verification/verifyLawExam.ts --file questions/<file>.json`
until it passes.

First audit (2026-10-07): an independent review of 32 questions found 0 wrong,
6 imprecise (a missing requirement, a missing cap, a duty cited to the wrong
section, a story that left the governing statute unclear), 26 fine. Every file
was then audited in full against this brief.
