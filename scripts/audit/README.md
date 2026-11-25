# scripts/audit: read-only audits

These scripts read the code and a document, and report what they find. None of them edits a file in the repository, writes to a database, or calls a network service. None of them is a CI check.

## civilLogAudit.mts: the log's Civil wording compared with the site

This script checks that every Civil wording change the owner approved in the Review and Decisions Log is the wording the site actually shows.

```
node --import tsx scripts/audit/civilLogAudit.mts <log.md> [<report.txt>]
```

- `<log.md>` is the Review and Decisions Log, exported as Markdown. It is not kept in the repository.
- `<report.txt>` is optional. Without it, the report prints to the terminal.

**What it reads**

- The log's "Changes for the site chat" section, Civil rows only. It checks that each approved text is shown on the stages the row names. Where the row replaces a sentence, it checks that the old sentence is gone.
- The log's "Legal content review record" section, Civil rows only. It checks that each quoted result or change is shown somewhere in Civil.
- What the site renders for each step:
  - the published answers (`src/lib/content-library/published/stageAnswers.published.json`);
  - the stage map's rules and deadlines, through `stageRulesText` (`src/lib/content-library/stageRules.ts`), plus each rule's raw quote.

**What it reports**

- Each approved text it did not find. It says whether the text is shown on another stage or is not shown anywhere.
- Each old sentence that is still shown.
- The review rows that quote no wording, so they can be checked by hand.
- A count of mismatches against checks made.

**Before you act on a mismatch**

The script matches text as written, so a mismatch is something to look into, not proof of an error. Spacing and curly quotes are ignored, and each run either side of an elision ("..." or "…") is checked separately.

Wording is changed only as the legal wording rules allow: from the log's "Changes for the site chat" section, word for word, with each quote matching `docs/sources/corpus`.
