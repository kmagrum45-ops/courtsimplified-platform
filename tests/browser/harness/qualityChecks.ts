/**
 * Quality checks over a captured overview.
 *
 * These read rendered text only, so they judge what a user sees. Each finding
 * carries a `family` tag naming the bug class it belongs to, so a report can
 * separate "another instance of something already fixed" from "genuinely new".
 */

import type { CapturedOverview } from "./intakeDriver";
import type { SelectedScenario } from "./scenarioSelection";

export type Severity = "high" | "medium" | "low";

export type Finding = {
  check: string;
  severity: Severity;
  family: string;
  detail: string;
};

/** Internal vocabulary and debug residue that must never reach a user. */
const JARGON_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /source-linked/i, label: "source-linked (data-model wording)" },
  { pattern: /\breview-required\b/, label: "review-required (raw token)" },
  { pattern: /\bnot-sure\b/, label: "not-sure (raw token)" },
  { pattern: /\bundefined\b/, label: "undefined" },
  { pattern: /\bnull\b/, label: "null" },
  { pattern: /\[object Object\]/, label: "[object Object]" },
  { pattern: /\bNaN\b/, label: "NaN" },
  { pattern: /OPENAI|OPENAI_API_KEY/i, label: "OPENAI reference" },
  { pattern: /deterministic-fallback|cognitionMode/i, label: "engine mode wording" },
  { pattern: /masterResult|courtSimplifiedBrain|intelligencePatch/i, label: "internal identifier" },
  { pattern: /\bTODO\b|\bFIXME\b|lorem ipsum/i, label: "placeholder marker" },
];

/** The generic question shown when nothing specific was produced. */
const PLACEHOLDER_QUESTION = "What important fact should be confirmed next?";

/** Wording that asks about something the documents card already answers. */
const ALREADY_ANSWERED_QUESTIONS: Array<{ pattern: RegExp; answeredBy: (docs: string) => boolean }> = [
  {
    pattern: /has anything already been filed\?/i,
    answeredBy: (docs) => hasRecordedDocuments(docs),
  },
  {
    pattern: /has anything already been served\?/i,
    answeredBy: (docs) => /affidavit of service|served|claim filed/i.test(docs),
  },
  {
    pattern: /has the (defendant|respondent) filed a defence\?/i,
    answeredBy: (docs) => /defence|default judgment|answer/i.test(docs),
  },
];

function hasRecordedDocuments(documentsCard: string): boolean {
  if (!documentsCard) return false;
  if (/No filed or served documents were selected/i.test(documentsCard)) return false;
  const body = documentsCard.replace(/^Documents already recorded/i, "").trim();
  if (!body) return false;
  return !/^(nothing|none|not sure)\.?$/i.test(body);
}

/*
 * Positive checks: does the rendered overview actually say what the
 * registry expects, not just avoid saying something forbidden? The registry
 * (scriptRegistry.ts) and the UI copy (IntelligenceOverviewPanel.tsx,
 * ProcedureAuthorityDisplay) were written independently, so this compares by
 * shared vocabulary rather than exact string equality -- a scenario asking
 * about "mitigation efforts since dismissal" should still match rendered
 * text that says "job search efforts after the dismissal."
 */

const OVERLAP_STOPWORDS = new Set([
  "about", "after", "again", "against", "because", "before", "being", "between",
  "could", "during", "either", "from", "have", "having", "into", "just", "must",
  "next", "onto", "over", "person", "please", "should", "since", "some", "still",
  "that", "their", "them", "then", "there", "these", "they", "this", "those",
  "through", "under", "until", "were", "what", "when", "where", "which", "while",
  "will", "with", "would", "your", "already", "review", "confirm", "recorded",
]);

function significantWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[’]/g, "'")
        .replace(/[^a-z0-9' ]+/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !OVERLAP_STOPWORDS.has(word)),
    ),
  );
}

function normalizeForOverlap(text: string): string {
  return ` ${text.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, " ")} `;
}

/**
 * Fraction (0-1) of `expected`'s significant words that appear (as
 * substrings, so "mitigation"/"mitigate" and "dismissed"/"dismissal" still
 * count) somewhere in `actual`. 1 when `expected` has no significant words
 * to check.
 */
function overlapRatio(expected: string, actual: string): number {
  const words = significantWords(expected);
  if (words.length === 0) return 1;
  const normalizedActual = normalizeForOverlap(actual);
  const matched = words.filter((word) => normalizedActual.includes(word));
  return matched.length / words.length;
}

const ISSUE_MATCH_RATIO = 0.35;
const NEXT_QUESTION_MATCH_RATIO = 0.4;
const LIST_COVERAGE_RATIO = 0.4;

/**
 * "Case snapshot" echoes the intake's raw facts verbatim (IntelligenceOverviewPanel.tsx,
 * the `snapshot` array includes `facts` directly). A check run against
 * capture.fullOverviewText unmodified would then trivially "find" whatever the
 * scenario's own input narrative already said, regardless of whether the app
 * actually produced it -- the registry's synthetic facts were often written using
 * similar vocabulary to the registry's own expectations, so this is a real risk,
 * not a theoretical one. Removing the exact raw-facts string (rather than dropping
 * whole cards) keeps everything else -- the closing disclaimer, the authority
 * panel, the workflow section -- available to match against.
 */
function overviewTextExcludingRawFacts(selected: SelectedScenario, capture: CapturedOverview): string {
  const rawFacts = String(selected.scenario.intakeFacts.facts || "").trim();
  if (!rawFacts) return capture.fullOverviewText;
  return capture.fullOverviewText.split(rawFacts).join(" ");
}

/** 8. Expected issue(s) from the registry should be identifiable in the overview. */
function checkExpectedIssues(selected: SelectedScenario, capture: CapturedOverview): Finding[] {
  const expected = selected.scenario.expectedPossibleIssues || [];
  const haystack = capture.issuesCard;
  const missing = expected.filter((issue) => overlapRatio(issue, haystack) < ISSUE_MATCH_RATIO);

  if (missing.length === 0) return [];

  return [{
    check: "expected-issue-missing",
    severity: "high",
    family: "NEW: expected content missing (issue)",
    detail: `Registry expects issue(s) ${JSON.stringify(missing)} to be identifiable in the overview; ` +
      `Issues to review shows: ${oneLine(capture.issuesCard) || "(empty)"}`,
  }];
}

/** 9. The rendered next-question should resemble the registry's expected one. */
function checkExpectedNextQuestion(selected: SelectedScenario, capture: CapturedOverview): Finding[] {
  const expected = (selected.scenario.expectedNextQuestion || "").trim();
  if (!expected) return [];

  const ratio = overlapRatio(expected, capture.confirmNextQuestion);
  if (ratio >= NEXT_QUESTION_MATCH_RATIO) return [];

  return [{
    check: "expected-next-question-mismatch",
    severity: "medium",
    family: "NEW: expected content missing (next question)",
    detail: `Registry expects a next question resembling ${JSON.stringify(expected)}; ` +
      `overview shows: ${JSON.stringify(oneLine(capture.confirmNextQuestion))} (word overlap ${Math.round(ratio * 100)}%).`,
  }];
}

/** 10. Evidence guidance the registry expects should be reflected somewhere in the evidence card. */
function checkExpectedEvidenceGuidance(selected: SelectedScenario, capture: CapturedOverview): Finding[] {
  const expected = selected.scenario.expectedEvidenceGuidance || [];
  if (expected.length === 0) return [];

  const haystack = capture.cards["Evidence and proof to organize"] || "";
  const missing = expected.filter((item) => overlapRatio(item, haystack) < ISSUE_MATCH_RATIO);
  const coverage = (expected.length - missing.length) / expected.length;

  if (coverage >= LIST_COVERAGE_RATIO) return [];

  return [{
    check: "expected-evidence-guidance-missing",
    severity: "medium",
    family: "NEW: expected content missing (evidence guidance)",
    detail: `Only ${Math.round(coverage * 100)}% of the registry's expected evidence guidance appears in the ` +
      `evidence card; missing: ${JSON.stringify(missing)}.`,
  }];
}

/** 11. Procedural status the registry expects (what's already filed/served) should be reflected. */
function checkExpectedProceduralStatus(selected: SelectedScenario, capture: CapturedOverview): Finding[] {
  const expected = selected.scenario.expectedProceduralStatus || [];
  if (expected.length === 0) return [];

  const statusCard = capture.cards["Where your case is now"] || "";
  const haystack = `${statusCard}\n${capture.documentsCard}`;
  const missing = expected.filter((item) => overlapRatio(item, haystack) < ISSUE_MATCH_RATIO);
  const coverage = (expected.length - missing.length) / expected.length;

  if (coverage >= LIST_COVERAGE_RATIO) return [];

  return [{
    check: "expected-procedural-status-missing",
    severity: "medium",
    family: "NEW: expected content missing (procedural status)",
    detail: `Only ${Math.round(coverage * 100)}% of the registry's expected procedural status appears in ` +
      `"Where your case is now" / documents; missing: ${JSON.stringify(missing)}.`,
  }];
}

/** 12. The scenario's review-required boundaries (the legal-safety caveats) should be present. */
function checkExpectedReviewBoundaries(selected: SelectedScenario, capture: CapturedOverview): Finding[] {
  const expected = selected.scenario.reviewRequiredBoundaries || [];
  if (expected.length === 0) return [];

  const haystack = overviewTextExcludingRawFacts(selected, capture);
  const missing = expected.filter((item) => overlapRatio(item, haystack) < ISSUE_MATCH_RATIO);

  if (missing.length === 0) return [];

  // Unlike evidence guidance and procedural status, this list mixes two
  // boilerplate entries every scenario shares ("No legal outcome is
  // decided.", the official-source line) with scenario-specific caveats
  // (wrong-defendant risk, injunction jurisdiction, near-the-limit amount).
  // Averaging coverage across both would let the boilerplate's near-certain
  // presence hide a missing scenario-specific caveat -- exactly the boundary
  // content a reviewing lawyer/paralegal would most need flagged. So this
  // reports every missing item, not just a below-threshold aggregate.
  return [{
    check: "expected-review-boundary-missing",
    severity: "high",
    family: "NEW: expected content missing (review-required boundary)",
    detail: `${missing.length}/${expected.length} registry-expected review-required boundaries do not appear ` +
      `anywhere in the overview: ${JSON.stringify(missing)}.`,
  }];
}

export function evaluateCapture(
  selected: SelectedScenario,
  capture: CapturedOverview,
): Finding[] {
  const findings: Finding[] = [];

  if (!capture.reachedOverview) {
    findings.push({
      check: "intake-completes",
      severity: "high",
      family: "NEW: intake could not be completed",
      detail: capture.failureReason || "Overview never rendered.",
    });
    return findings;
  }

  // 1. Questions the recorded facts already answer.
  for (const rule of ALREADY_ANSWERED_QUESTIONS) {
    if (rule.pattern.test(capture.confirmNextQuestion) && rule.answeredBy(capture.documentsCard)) {
      findings.push({
        check: "already-answered-question",
        severity: "high",
        family: "KNOWN: next-question ignores recorded facts (fixed in 444cabf)",
        detail: `Asked ${JSON.stringify(firstMatch(rule.pattern, capture.confirmNextQuestion))} while Documents already recorded shows: ${oneLine(capture.documentsCard)}`,
      });
    }
  }

  // 2. Generic placeholder question, meaning nothing specific was produced.
  if (capture.confirmNextQuestion.includes(PLACEHOLDER_QUESTION)) {
    findings.push({
      check: "placeholder-next-question",
      severity: "medium",
      family: "KNOWN: placeholder question fallback (Family fixed in 03204cc; Civil still open)",
      detail: `"What to confirm next" fell through to the generic placeholder.`,
    });
  }

  // 3. Internal vocabulary or debug residue in visible text.
  const visible = `${capture.fullOverviewText}\n${capture.authorityPanelText}`;
  for (const { pattern, label } of JARGON_PATTERNS) {
    if (pattern.test(visible)) {
      findings.push({
        check: "jargon-or-placeholder-leak",
        severity: "medium",
        family: "KNOWN: internal wording reaching users (panel wording fixed this session)",
        detail: `Visible text contains ${label}: ${oneLine(context(visible, pattern))}`,
      });
    }
  }

  // 4. Scenario-specific prohibited wording from the registry itself.
  for (const prohibited of selected.scenario.prohibitedOutputWording || []) {
    if (prohibited && visible.toLowerCase().includes(prohibited.toLowerCase())) {
      findings.push({
        check: "registry-prohibited-wording",
        severity: "high",
        family: "NEW: registry-prohibited wording surfaced",
        detail: `Registry forbids ${JSON.stringify(prohibited)} for this scenario; it appears in the overview.`,
      });
    }
  }

  // 5a. An internal classification token rendered as the issue itself. The
  // engine's "unknown" domain reaches the card verbatim, so a user is told the
  // possible issue to review is "unknown", which names nothing.
  if (/possible issue to review:\s*unknown/i.test(capture.issuesCard)) {
    findings.push({
      check: "issue-type-unknown-leak",
      severity: "high",
      family: "NEW: classification token rendered as user-facing issue text",
      detail: `Issues card reads: ${oneLine(capture.issuesCard)}`,
    });
  }

  // 5b. Raw document tokens rendered as document labels. documentLabel() falls
  // back to the token with hyphens replaced, so "nothing" and "not-sure" render
  // as bullets reading "nothing" / "not sure" under a heading that says these
  // are documents already recorded.
  const documentBullets = capture.documentsCard
    .replace(/^Documents already recorded/i, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rawTokenBullet = documentBullets.find((line) => /^(nothing|not sure|not-sure|none)$/i.test(line));
  if (rawTokenBullet) {
    findings.push({
      check: "raw-token-document-label",
      severity: "high",
      family: "NEW: raw intake token rendered as a document label",
      detail: `Documents already recorded lists ${JSON.stringify(rawTokenBullet)} as though it were a filed document.`,
    });
  }

  // 5. Issues card should say something concrete.
  if (!capture.issuesCard.trim()) {
    findings.push({
      check: "issues-card-empty",
      severity: "low",
      family: "NEW: no issue surfaced for the scenario",
      detail: "Issues to review card was absent or empty.",
    });
  }

  // 6. Procedure Authority panel sanity, when it renders.
  if (capture.authorityPanelRendered) {
    if (/This procedure is verified for the selected court area and stage/i.test(capture.authorityPanelText)) {
      findings.push({
        check: "authority-tautology",
        severity: "medium",
        family: "KNOWN: authority panel tautology (fixed this session, uncommitted)",
        detail: "Panel shows the status-as-guidance bullet.",
      });
    }
    const hasCitation = /Official source/i.test(capture.authorityPanelText);
    const onlyReviewRequired = !/Verified/i.test(capture.authorityPanelText);
    if (onlyReviewRequired) {
      findings.push({
        check: "authority-panel-all-review-required",
        severity: "medium",
        family: "KNOWN: panel rendered with nothing verified (suppression added this session, uncommitted)",
        detail: "Panel rendered but contains no verified item.",
      });
    } else if (!hasCitation) {
      findings.push({
        check: "authority-panel-missing-citation",
        severity: "high",
        family: "NEW: verified authority item without a citation",
        detail: "Panel claims a verified state but shows no Official source line.",
      });
    }
    if (
      capture.authorityHeadingClass &&
      capture.siblingHeadingClass &&
      !capture.authorityHeadingClass.includes("text-lg")
    ) {
      findings.push({
        check: "authority-heading-mismatch",
        severity: "low",
        family: "KNOWN: panel heading smaller than sibling cards (fixed this session, uncommitted)",
        detail: `Panel heading class ${JSON.stringify(capture.authorityHeadingClass)} vs sibling ${JSON.stringify(capture.siblingHeadingClass)}.`,
      });
    }
  }

  // 7. Browser console errors during the run.
  if (capture.consoleErrors.length > 0) {
    findings.push({
      check: "console-errors",
      severity: "low",
      family: "NEW: console errors during intake",
      detail: `${capture.consoleErrors.length} console error(s); first: ${oneLine(capture.consoleErrors[0])}`,
    });
  }

  // 8-12. Positive checks: the registry's expectations should actually show
  // up in the rendered overview, not just avoid forbidden wording.
  findings.push(
    ...checkExpectedIssues(selected, capture),
    ...checkExpectedNextQuestion(selected, capture),
    ...checkExpectedEvidenceGuidance(selected, capture),
    ...checkExpectedProceduralStatus(selected, capture),
    ...checkExpectedReviewBoundaries(selected, capture),
  );

  return findings;
}

function firstMatch(pattern: RegExp, text: string): string {
  const match = pattern.exec(text);
  return match ? match[0] : "";
}

function context(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  if (!match || match.index === undefined) return "";
  return text.slice(Math.max(0, match.index - 60), match.index + 60);
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}
