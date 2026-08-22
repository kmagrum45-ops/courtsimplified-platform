/**
 * Guards the two leaks the browser scenario harness found on 2026-08-22, across
 * 16 and 8 scenarios respectively:
 *
 *   "Possible issue to review: unknown."   -- the engines' unclassified domain
 *                                             rendered as a legal issue.
 *   "Documents already recorded: nothing"  -- the Small Claims intake's default
 *                                             ["nothing"] sentinel rendered as
 *                                             a filed document.
 *
 * The harness that found them needs a running server, so it cannot gate CI.
 * This covers the same ground deterministically: the shared helpers are
 * exercised against the real token vocabularies, and the renderers are asserted
 * to route through them, so reintroducing a raw list fails here rather than in
 * a browser sweep nobody ran.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { recordedDocuments } from "../../src/lib/case-system/intelligence/answeredQuestions";
import {
  isMeaningfulIssueSignal,
  meaningfulIssueSignals,
} from "../../src/lib/case-system/intelligence/issueSignals";

// ---- issue classifications ------------------------------------------------

for (const empty of ["unknown", "Unknown", "unspecified", "none", "not-sure", "not sure", "n/a", "other", "", "   "]) {
  assert.equal(
    isMeaningfulIssueSignal(empty),
    false,
    `${JSON.stringify(empty)} names no issue and must not be rendered as one.`,
  );
}

for (const real of ["defamation", "harassment", "contract", "family-parenting", "enforcement", "debt", "Adoption — step-parent, relative, or adult adoption"]) {
  assert.equal(
    isMeaningfulIssueSignal(real),
    true,
    `${JSON.stringify(real)} is a real classification and must survive filtering.`,
  );
}

// The exact list the overview received for the Small Claims scenarios that
// produced the leak: a single "unknown" and nothing else.
assert.deepEqual(meaningfulIssueSignals(["unknown"]), []);
assert.deepEqual(meaningfulIssueSignals(["unknown", "defamation"]), ["defamation"]);
assert.deepEqual(meaningfulIssueSignals([]), []);

// ---- document selections --------------------------------------------------

// Small Claims defaults to ["nothing"]; Civil defaults to []. Both must read as
// no documents on record.
assert.deepEqual(recordedDocuments(["nothing"]), []);
assert.deepEqual(recordedDocuments([]), []);
assert.deepEqual(recordedDocuments(["not-sure"]), []);
assert.deepEqual(recordedDocuments(["Nothing filed yet"]), []);
assert.deepEqual(recordedDocuments(undefined), []);

assert.deepEqual(
  recordedDocuments(["plaintiffs-claim", "nothing", "affidavit-service"]),
  ["plaintiffs-claim", "affidavit-service"],
  "Real filings must survive alongside a sentinel.",
);

// ---- renderers must route through the shared helpers ----------------------

const overview = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
assert.match(
  overview,
  /meaningfulIssueSignals\(/,
  "The case overview must filter issue classifications through the shared helper.",
);
assert.match(
  overview,
  /recordedDocuments\(/,
  "The case overview must filter document selections through the shared helper.",
);
assert.doesNotMatch(
  overview,
  /const issueSignals = Array\.from\(/,
  "The case overview must not rebuild an unfiltered issue list.",
);

const settlementConference = readFileSync("app/settlement-conference/page.tsx", "utf8");
assert.match(
  settlementConference,
  /meaningfulIssueSignals\(caseData\?\.analysis\?\.detectedIssues/,
  "The settlement conference issues list must filter through the shared helper.",
);

console.log(
  "Overview issue and document label verification passed: unclassified issue types and non-filing document sentinels are filtered, and both renderers route through the shared helpers.",
);
