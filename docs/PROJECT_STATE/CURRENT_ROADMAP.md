# CourtSimplified – Open Items

Tracked defects, gaps, and decisions that are known but deliberately deferred.
Each entry should carry enough context that a future session can act on it
without reconstructing the investigation. Remove an entry once it is resolved
(reference the commit) or superseded.

---

## Readiness scoring counts an unclassified issue as a real issue

**Found:** 2026-08-22, while fixing the "unknown" issue-classification leak in
`IntelligenceOverviewPanel` and `app/settlement-conference/page.tsx` (commit
`271ba77`).

**What's happening:** Two pages use `detectedIssues.length` as a readiness or
progress signal, without filtering out the engines' unclassified `"unknown"`
domain first:

- `app/document-export/page.tsx:271-272` — `ready: !!caseData?.analysis?.detectedIssues?.length` gates document-export readiness, and the paired `reason` text assumes a length of zero means no issues were found.
- `app/trial-package/page.tsx:199` — `if ((caseData?.analysis?.detectedIssues || []).length > 0) score += 10;` adds to a trial-readiness score.
- `app/trial-package/page.tsx:354` — displays `detectedIssues.length` as a plain count to the user.

So a case the engine could not classify — `detectedIssues: ["unknown"]` —
currently satisfies `.length > 0` on all three, and is treated as though a real
issue had been identified: `ready: true`, +10 to a readiness score, and a
displayed count of 1.

**Why this is not a quick patch:** Filtering `"unknown"` out of the count (the
same `meaningfulIssueSignals()` helper from `src/lib/case-system/intelligence/issueSignals.ts`
used to fix the rendering leak) is mechanical, but it changes what "ready" or a
readiness score *means* for an unclassified case. Once filtered, some cases that
currently read as ready will read as not-ready or score lower. Whether that is
correct — should an unclassified case actually block progress toward
document-export or trial prep, or is issue classification not load-bearing for
those readiness checks — is a product decision, not an implementation detail.
That decision should be made deliberately, with the actual readiness criteria in
mind, not inferred from fixing a display bug.

**Related, already fixed:** The equivalent rendering leak (raw `"unknown"`
printed as an issue name/bullet) was fixed in `IntelligenceOverviewPanel.tsx`
and `app/settlement-conference/page.tsx` in commit `271ba77`, and guarded by
`scripts/verification/verifyOverviewIssueAndDocumentLabels.ts` (`npm run
test:overview-labels`). This entry is only about the *scoring/gating* uses, which
were deliberately left unchanged pending this decision.

---

Last Updated: 2026-08-22
