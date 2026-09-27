# Civil authority registry — a non-shipping drafting map for Phase 2

**NOTHING IN THIS FOLDER MAY BE SERVED TO A USER.** Not a sentence, not a list,
not a heading. It is a planning artefact preserved for reference while the Civil
(Rules of Civil Procedure) work is scoped. Every sentence that ever reaches a user
must be drafted through the content pipeline and sourced from the vendored corpus
in `docs/sources/corpus/`, exactly as the Small Claims library is.

`scripts/verification/verifyReferenceFolderIsNotShipped.ts` asserts that nothing
under `app/` or `src/` imports or reads from here. `scripts/rules/corpusSources.ts`
refuses this path as a corpus source.

## What this is

The contents of `COURTSIMPLIFIED_MASTER_AUTHORITY_REGISTRY_V20_TRACKING_LOCKED.zip`,
34 files, 85 KB uncompressed. It maps the Rules of Civil Procedure into engine
names, topic lists, one-line doctrines, and — for Rules 39, 49 and 50 — decision
trees, deadline summaries, forms and object designs.

## The `authoritySectionsCaptured` lists are book-derived and internal only

Three files carry an `authoritySectionsCaptured` array. Those entries are
**section headings from the Ontario Annual Practice**, a commercially published
Thomson Reuters work:

    "RCP39:1 Synopsis and Comment"
    "RCP49:1 Synopsis, Comment and Advocacy Notes"

They are a record of *where someone looked*, not of what the book says. They are
useful internally as a coverage checklist and they are the single reason this
folder is marked non-shipping rather than merely unfinished. **A heading list is
still derived from a copyrighted work's structure.** Do not display it, do not
paraphrase from it, and do not treat a heading as evidence of what the rule
requires — go to the rule.

The Annual Practice is **not** on the acceptable-source list in CLAUDE.md §2
(ontario.ca, ontariocourts.ca, ontariocourtforms.on.ca, CanLII, Justice Ontario,
Law Society of Ontario). Using it as a source is a licensing decision for the site
owner, and it is a decision that has to be made *before* any engineering, not
after.

## What the copyright scan found, across every copy on this machine

Recorded in full in `docs/civil-annual-practice-audit.md`. In short: **no verbatim
commentary, no page pinpoints, no headnotes, no scans, no images** in any copy.
The only book-derived element anywhere is the heading lists above.

## Three version numbers, one package

Worth knowing before anyone cites "V20" as a version:

| Where | Says |
|---|---|
| The ZIP filename | `V20` |
| `master_authority_index.json` → `registryVersion` | `v17_live_code_integration_audit` |
| `master_authority_index.json` → `registryCompletenessWarning` | "This **v8** package consolidates all rules confirmed in chat" |

The package's own warning says "Earlier ZIPs had drift". It is itself drifted. **No
v8–v19 ZIPs exist on this machine**; those numbers are internal iteration labels
that were never reconciled, not a series of files. Treat the file inventory as the
only statement of what is here — which is what the manifest's own tracking rules
ask for.

## Coverage: what has a file, and what is only claimed

15 rules have an authority file (16 files — Rule 49 has two):

    14, 16, 18, 19, 20, 25, 26, 30, 31, 37, 39, 49, 50, 57, 58

`nextPriorityRules` names four, of which **three have no file at all**: Rule 51,
Rule 53, and **Rule 76 (simplified procedure)**. Rule 76 is named in the index and
the README, so it is not "absent" in the sense of unmentioned — it is listed as
intended and never captured. For a Civil product that matters more than most of
what *is* here, because simplified procedure is where a great many claims in this
court's money range actually live.

## What is deliberately NOT preserved here

The deleted `src/lib/case-system/authority/ontarioCivilAuthorityCollection.ts`
(removed in `41b4dbc`, surviving only in an abandoned git worktree) was reviewed
and **not** copied in. It holds six metadata entries pointing at the Rules of Civil
Procedure with `verificationStatus: "needs-review"` and no Annual Practice content
whatsoever — the third duplicate registry that commit deleted for good reason.

It does contain one unsourced legal proposition written in the project's own voice.
That is a CLAUDE.md §2 problem rather than a copyright one, and it is the reason the
file is not revived: reviving it would import an assertion with no source behind it.
The file is in the off-repo backup if anyone needs to read it again.
