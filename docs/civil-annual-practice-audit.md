# Civil authority registry — audit, copyright scan, preservation

**26 September 2026, branch `annual-practice-preserve`.** Read-only except for the
preservation step and the one code removal in task 4.

Every statement is labelled:

| Label | Means |
|---|---|
| **confirmed-in-package** | read from the ZIP contents on disk |
| **confirmed-in-live-code** | read from the working tree, and a command is given |
| **missing** | looked for and not present |
| **needs-verification** | stated here but not established by this session |

No quoted passage from the Ontario Annual Practice appears in this document. The
longest book-derived fragment reproduced anywhere is a section heading, quoted twice
for identification.

---

## 0. Confirming the external review, and three corrections

**confirmed-in-package.** The ZIP is at
`C:\Users\kmagr\Downloads\COURTSIMPLIFIED_MASTER_AUTHORITY_REGISTRY_V20_TRACKING_LOCKED.zip`,
36,486 bytes, modified 2026-09-26 19:50; contents dated 2026-06-18.

| Review said | Found |
|---|---|
| 34 files | **34 files** — confirmed |
| ~188 KB | **85,336 bytes uncompressed**, 36 KB compressed. Neither is 188 KB. **Correction** |
| 15 rule files | **16 files** covering **15 distinct rule numbers** — Rule 49 has two. **Correction** |
| Rules 14, 16, 18, 19, 20, 25, 26, 30, 31, 37, 39, 49, 50, 57, 58 | confirmed, exactly those |
| Rules 39/49/50 carry decision trees, deadlines, forms, object designs | confirmed — they are the three largest files (9.0 KB, 12.1 KB, 6.2 KB) and the only ones with `decisionTrees` and `deadlineObjects` |
| No case names, quoted passages, pinpoints or commentary prose | **confirmed, zero hits** for neutral citations, reporter abbreviations, `X v. Y` name shapes, `at p.`/`pp.`/`at para.`, and non-JSON/MD files |
| Only book-derived element is `authoritySectionsCaptured` | confirmed — 3 files carry it |
| Rule 76 simplified procedure absent | **imprecise. Correction below** |

**Rule 76 is named, not absent.** It appears in `master_authority_index.json` under
`nextPriorityRules` and in `authority_registry/README.md`. There is no `rule76_*`
file. So the package **claims Rule 76 as intended scope and never captured it** —
which is a stronger statement than "absent", because the index overstates coverage.
The same is true of Rule 51 and Rule 53.

### Three version numbers in one package

**confirmed-in-package**, and worth knowing before anyone cites a version:

| Where | Says |
|---|---|
| filename | `V20` |
| `master_authority_index.json` → `registryVersion` | `v17_live_code_integration_audit` |
| same file → `registryCompletenessWarning` | "This **v8** package consolidates all rules confirmed in chat" |

The warning's own text is "Earlier ZIPs had drift." It is itself drifted. The
manifest also carries `nonNegotiableTrackingRules` including *"Always check the
manifest/file inventory before saying which rules are included"* — advice this audit
followed, and which the package needed.

---

## 1. Other copies on disk

**No v8–v19 ZIPs exist. confirmed-in-package / missing.** Searched `Downloads`,
`Desktop`, `Documents`, `courtsimplified-backups`, the repo, and
`courtsimplified-registry-backup`. The `v8`/`v17` numbers are internal iteration
labels, never separate files. What does exist:

| Path | Size | Date | Contents beyond the V20 ZIP |
|---|---|---|---|
| `Downloads/…_V20_TRACKING_LOCKED.zip` | 36 KB | 2026-09-26 | the subject |
| `Downloads/…_V1_V0_85_ONTARIO_CIVIL_AUTHORITY_COLLECTION_AUDIT.zip` | 534 KB | 2026-07-04 | 203 entries. A project-bible audit package, **not** an authority registry. Contains a `FILE_ENTRIES` record for `authorityBrainBridge.ts` |
| `Downloads/…_V1_V0_86_AUTHORITY_BRAIN_BRIDGE_REGENERATED.zip` | 4.05 MB | 2026-07-04 | 204 entries. Same shape, 7× larger. 40 files mention "Annual Practice"; 32 contain case citations |
| `.claude/worktrees/agent-add7509fa37610fac` | 9.6 MB | — | the deleted `ontarioCivilAuthorityCollection.ts`. **git-excluded, 0 tracked files** |
| `_PROJECT_REGISTRY/` | 3.8 MB, 62 files | — | **zero** Annual Practice markers |
| `courtsimplified-registry-backup/20260911-233918` | 1.9 MB, 52 files | 2026-09-11 | **zero** Annual Practice markers |

`authorityBrainBridge.ts` itself is **missing** from every copy — consistent with the
2026-09-11 finding that it never existed.

### A false record worth knowing about

**confirmed-in-package.** The V0_85 and V0_86 packages contain
`FILE_ENTRIES/src__lib__case-system__authority-intelligence__authorityBrainBridge_V026.md`,
which states:

> Status: LOCKED / BUILD PASSED

for a file that has never existed in the repository. The audit package asserts a
passing build for a path with zero hits repo-wide. This is the same class of stale
artefact the 2026-09-11 findings flagged as having already sent one AI hunting a
deleted file. **Do not treat these packages as evidence of what exists.** `git log`
and the working tree are the evidence.

---

## 2. Copyright scan

Scanned: the V20 contents, the worktree's `ontarioCivilAuthorityCollection.ts`, the
V0_85 and V0_86 packages, `_PROJECT_REGISTRY/`, and the 2026-09-11 registry backup.

To separate public rule text from commentary, the **Rules of Civil Procedure are now
vendored**: `rules-of-civil-procedure`, R.R.O. 1990, Reg. 194, 1,055,635 characters,
consolidation **FROM SEPTEMBER 1, 2026**. That is what makes the distinction
checkable rather than asserted.

| Looked for | V20 | worktree file | V0_85 / V0_86 | `_PROJECT_REGISTRY` | registry-backup |
|---|---|---|---|---|---|
| Verbatim / near-verbatim commentary | none | none | none | none | none |
| Case names or citations | none | none | **4 SCC neutral citations** | none | none |
| Page pinpoints | none | none | none | none | none |
| Headnote-style summaries | none | none | none | none | none |
| Advocacy notes (as prose) | none | none | none | none | none |
| Scans or images | none | none | none | none | none |
| `thomson` / `carswell` / `reuters` | none | none | none | none | none |
| Book-derived structure | **`authoritySectionsCaptured`, 3 files** | none | none | none | none |

### Classification

| Finding | Classification | Why |
|---|---|---|
| `authoritySectionsCaptured` heading lists | **keep as internal reference** | A record of where someone looked. Derived from the book's structure, so non-shipping, but it is a coverage checklist and not expression. Identifying fragments: `"RCP39:1 Synopsis and Comment"`, `"RCP49:1 Synopsis, Comment and Advocacy Notes"` |
| 4 SCC neutral citations in V0_86 | **keep** | Saadati v. Moorhead, Hryniak v. Mauldin, Grant v. Torstar and one further SCC citation. Case names and neutral citations are public facts about public decisions, and CLAUDE.md §2 expressly permits citing decisions. `grant-v-torstar-2009-SCC-61.pdf` is already vendored under `docs/sources/` |
| 40 "Annual Practice" mentions in V0_86 | **keep** | All are architectural plans — "Annual Practice hooks", "currency/version metadata", "links". References to an intended integration, never the commentary. Same character as the empty field in live code |
| `ontarioCivilAuthorityCollection.ts` | **remove / do not revive** | No book content at all: six metadata entries pointing at the Rules of Civil Procedure with `verificationStatus: "needs-review"`. **The problem with it is not copyright.** It contains an unsourced legal proposition in the project's own voice, about screening immunity and notice in public-authority claims. That is a CLAUDE.md §2 violation, and reviving the file would import an assertion with nothing behind it. Preserved off-repo only |
| `authorityBrainBridge` "LOCKED / BUILD PASSED" entry | **remove from reliance** | A false record. Keep the ZIP, believe none of it |

**Nothing requires removal on copyright grounds.** The one substantive risk found is
the unsourced legal proposition above, which is a sourcing problem.

---

## 3. Preservation

**Backups taken off-repo**, all three ZIPs plus the worktree's three authority files:

```
/c/Users/kmagr/courtsimplified-backups/annual-practice-20260926-200425/
    COURTSIMPLIFIED_MASTER_AUTHORITY_REGISTRY_V20_TRACKING_LOCKED.zip
    COURTSIMPLIFIED_CONTROL_PACKAGE_V1_V0_85_ONTARIO_CIVIL_AUTHORITY_COLLECTION_AUDIT.zip
    COURTSIMPLIFIED_CONTROL_PACKAGE_V1_V0_86_AUTHORITY_BRAIN_BRIDGE_REGENERATED.zip
    worktree-authority/ontarioCivilAuthorityCollection.ts
    worktree-authority/authorityRegistryArchitecture.ts
    worktree-authority/verifiedAuthoritySeedRegistry.ts
```

`_PROJECT_REGISTRY/` and the 2026-09-11 registry backup were not re-copied: neither
holds Annual Practice material, and the latter is already an off-repo backup.

**`docs/reference/civil-annual-practice/`** now holds the V20 contents (34 files)
plus a `README.md` stating that it is a non-shipping Phase 2 drafting map, that
nothing may be served to users, that the `authoritySectionsCaptured` lists are
internal only, and that every published sentence must come from the vendored corpus.

Nothing unique was added from the other copies, for the reasons in the table above.

### The gate

`npm run test:reference-not-shipped` asserts four properties:

1. the folder declares itself non-shipping;
2. **no file under `app/` or `src/` reads it**;
3. no corpus source definition reads it;
4. `scripts/rules/refusedCorpusPaths.ts` covers it, with a written reason.

It checks **reads**, not mentions. The first version flagged any occurrence of the
folder name and immediately failed on two comments explaining why the folder must not
be used — the same mistake CLAUDE.md §6 had to add an exemption marker for. A check
that forbids describing a hazard makes the hazard harder to explain.

Mutation-tested three ways: a real `import` from the folder fails it; a `readFileSync`
of it fails it; a prose mention does not.

---

## 4. Current code

**confirmed-in-live-code.** Before:

```
grep -rn 'annualPracticeLinks' app/ src/ scripts/
```

found 14 hits — 12 in `verifiedAuthoritySeedRegistry.ts` (11 empty arrays, 1
placeholder), 1 type declaration in `authorityRegistryArchitecture.ts:183`, and **one
the 2026-09-11 findings did not mention**: a synthetic fixture at
`scripts/verification/verifyAuthorityKnowledgeBridge.ts:51`. Nothing read the field.
The placeholder's own text was *"Annual Practice commentary should be added from
verified user-provided extraction"* with `notes: ["Pending Annual Practice extraction."]`.

Removed: all 12 registry occurrences, the type declaration, and the fixture line.

**This required two changes beyond the file named in the task, and could not have been
done without them.** `annualPracticeLinks` was a **required** field, so deleting it
from the data alone does not compile. The declaration is replaced by a comment
recording why it was removed and what provenance any future version would need —
edition and year, which the old shape could not record, for a book republished
annually.

`npm run typecheck` is clean. **The `warnings` array still reads "Add Annual Practice
authorities only after verified extraction"** — left in place because the task said to
touch nothing else, but it now invites what `refusedCorpusPaths.ts` refuses, and is
worth rewording.

**The worktree is not referenced by the build. confirmed-in-live-code:** 0 files from
`.claude/worktrees` in either tsconfig program (`tsc --listFilesOnly`), git-excluded at
`.git/info/exclude:11`, 0 tracked files.

---

## 5. Phase 2 value against the current accuracy engine

### What the package already gives, in stage-map terms

**confirmed-in-package.** `master_litigation_lifecycle_map_v1.json` defines 8 stages
with rule mappings and outputs — a usable Civil skeleton:

| # | Stage | Rules | Purpose (package's own) |
|---|---|---|---|
| 1 | Commencement | 14 | start correctly, action/application route, issue originating process |
| 2 | Service | 16 | valid method, recipient, timing, proof, service risk |
| 3 | Response / Defence | 18, 19 | defence deadlines, notice of intent, default risk and consequences |
| 4 | Pleadings | 25, 26 | issues, material facts, admissions, denials, replies, particulars, amendments |
| 5 | Discovery | 30, 31 | documentary evidence, privilege, disclosure, affidavits of documents, oral discovery |
| 6 | Motions | 37, 39 | relief, motion jurisdiction, materials, confirmations, abandonment |
| 7 | Settlement / Risk | 49, 57, 58 | offers, cost consequences, conduct, entitlement |
| 8 | Pre-Trial Readiness | 50 | narrow issues, settlement review, expert readiness, admissions, witnesses |

### Deadline events it identifies, with the governing rule

**confirmed-in-package**, and the first two **confirmed against the vendored public
rule text** — which is exactly what vendoring Reg. 194 was for:

| Event | Period | Rule | Status |
|---|---|---|---|
| Statement of defence, served in Ontario | 20 days | r. 18.01(a) | **verified in vendored text**: "within twenty days after service of the statement of claim, where the defendant is served in Ontario" |
| Served elsewhere in Canada or the USA | 40 days | r. 18.01(b) | **verified in vendored text** |
| Served anywhere else | 60 days | r. 18.01(c) | **verified in vendored text** |
| Notice of intent to defend extension | +10 days | r. 18.02(2) | **verified in vendored text**: "entitled to ten days, in addition to the time prescribed by rule 18.01" |
| Motion record / affidavit service | at least 7 days before hearing | Rule 39 | needs-verification against Reg. 194 |
| Responding material | at least 4 days before hearing | Rule 39 | needs-verification |
| Offer to settle, for costs consequences | at least 7 days before hearing | r. 49.10 | "at least seven days before the hearing" appears in the vendored text; the pinpoint needs-verification |
| Pre-trial conference window | 120 days max / 30 days min before trial | Rule 50 | needs-verification. Package notes this applies to actions set down after 30 March 2022 |
| Form 50A delivery | at least 30 days before pre-trial | Rule 50 | needs-verification |
| Pre-trial brief | at least 5 days before pre-trial, with proof of service | Rule 50 | needs-verification |

**The four Rule 18 events are wired-ready.** They have the shape the Small Claims
deadline engine already consumes: a period, a countable event, and a governing
provision quotable from a vendored source.

### "Things went wrong" positions it identifies

**confirmed-in-package**, from `decisionTrees` and the stage purposes: default risk
and consequences of noting in default (Rules 18/19); motion abandonment and failure to
confirm (Rule 37/39); offer withdrawn or expired before acceptance, and judgment
compared against an offer (Rule 49); failure to deliver Form 50A or a pre-trial brief
on time (Rule 50).

### What a Civil stage map needs and this lacks

**missing from the package**, every one:

| Gap | Why it matters |
|---|---|
| **Rule 76 simplified procedure** | Named in `nextPriorityRules`, never captured. The largest single gap: simplified procedure is where much of the money-claim volume above the Small Claims limit actually sits |
| **Rule 24 dismissal for delay** | A claim-ending event with no coverage |
| **Rule 48 listing / status** | Administrative dismissal, the most common way a self-represented action dies quietly |
| **Rules 52–53 trial and evidence** | No trial stage exists at all beyond readiness |
| **Rules 59–60 orders and enforcement** | Nothing after judgment. Small Claims has a whole post-judgment stage family |
| **Rules 61–62 appeals** | No appeal route |
| **Rule 29 third-party claims** | Multi-party structure absent |
| **Rule 51 and Rule 53** | Named in `nextPriorityRules`, no files |

Also absent and needed before anything ships: forum boundaries (which claims belong in
Superior Court versus Small Claims versus a tribunal), limitation interaction, and any
notion of a wrong-reader distinction between plaintiff and defendant.

### Effort estimate, in the units `docs/accuracy-report.md` uses

Small Claims, for calibration: **37 stages, 16 published blocks, 182 corpus sources,
47 eval stories**, and that is one court with one procedure.

| Piece | Estimate | Basis |
|---|---|---|
| Civil stage map | **30–45 stages** | 8 lifecycle stages expand roughly as Small Claims did — each stage splits by side and by what has gone wrong |
| Content blocks | **210–315** | 7 sections per stage, the Small Claims pattern |
| Corpus sources | **+10–20** | Reg. 194 is vendored; add practice directions, Superior Court guides, forms tables |
| Deadline events | **25–40** | 10 identified here, and the missing rules (24, 48, 52–53, 59–62) are deadline-dense |
| Eval stories | **60–90** | 2 per stage per side, plus forum-boundary and out-of-scope stories |

**The package saves the mapping work, not the drafting work.** Its value is that
somebody has already decided which rules matter for which stage and in what order —
worth real time. Every sentence still has to be drafted and verified from Reg. 194
through the existing pipeline, and that is where the effort is.

### One thing that cannot ship, stated plainly

**confirmed-in-package.** Much of the design is strategic: risk engines, exposure
scoring, fairness weighting, evidence-weight scoring, and in Rule 49 a comparison of
a judgment against an offer. Applying those to a user's facts is the system applying
law to facts, and grading a case — CLAUDE.md §3 and the "who does the applying" test
in §2 both forbid it, before the LSO A2I policy is even reached. **The procedural
skeleton is usable. The intelligence layer is not, and no amount of sourcing makes it
so.**

---

## Open items for the site owner

1. **The Annual Practice licensing question is unanswered and blocks nothing.** The
   field that invited it is gone; the planning package is preserved and fenced. If a
   licence is ever obtained, the re-added field needs edition and year.
2. **`verifiedAuthoritySeedRegistry.ts` still warns "Add Annual Practice authorities
   only after verified extraction."** It now contradicts `refusedCorpusPaths.ts`.
   One sentence to reword; left alone because this task was read-only there.
3. **The V0_85 / V0_86 packages contain a false "LOCKED / BUILD PASSED" record.**
   Consider deleting those two ZIPs, or noting inside the backup folder that their
   file entries are not evidence.
4. **Rule 76 is the gap to close first** if Civil proceeds.
