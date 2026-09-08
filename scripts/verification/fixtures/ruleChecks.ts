/**
 * Session 36 -- the 5 rules, checked deterministically against real
 * pipeline output. Same posture as voiceLayer.ts's validator and Session
 * 36's own caseStrengthLanguageValidator.ts: pure pattern matching, no AI
 * call ever judges another AI call's output.
 *
 * Rules 1 and 2 directly reuse caseStrengthLanguageValidator.ts's real
 * blocked-term list -- the same list the actual fix runs in production --
 * rather than a second, separately-maintained copy that could drift from
 * it. Rules 3 and 5 use word-overlap keyword matching, the same technique
 * evidenceGapDetector.ts already established in this codebase (deliberately
 * coarse, not exact-string, since the registry/analysis text and a user's
 * own words are never going to match verbatim). Rule 4 is a direct
 * substring check against the exact warning string
 * courtSimplifiedBrain.ts's detectOverLimitClaimAmount() generates.
 */

import type { AnalysisResult } from "../../../app/builder/_components/builderTypes";
import { validateCaseStrengthLanguage } from "../../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import type { GeneratedStory } from "./generatedStoryTypes";

export type RuleId = "no-judge-prediction" | "no-opposing-argument-prediction" | "confirmed-evidence-not-missing" | "over-limit-warning-correct" | "uncertain-date-preserved";

export type RuleFailure = {
  rule: RuleId;
  detail: string;
  offendingText: string;
};

export type RuleCheckResult = {
  storyId: string;
  claimTypeId: string;
  matchedClaimType: string | null;
  failures: RuleFailure[];
};

const JUDGE_TERMS = new Set(["judge may", "court may question", "court may ask", "court may require", "court may care"]);
const OPPOSING_TERMS = new Set(["may argue", "opposing side", "other side may", "strongest response", "strongest argument"]);

type FieldTextEntry = { field: string; text: string };

function collectOutputTexts(a: AnalysisResult): FieldTextEntry[] {
  const entries: FieldTextEntry[] = [];
  const addAll = (field: string, values: readonly string[] | undefined) => {
    for (const v of values || []) entries.push({ field, text: v });
  };
  addAll("detectedIssues", a.detectedIssues);
  addAll("missingInformation", a.missingInformation);
  addAll("missingEvidence", a.missingEvidence);
  addAll("evidenceWeaknesses", a.evidenceWeaknesses);
  addAll("risksAndGaps", a.risksAndGaps);
  addAll("userWarnings", a.userWarnings);
  addAll("intelligenceWarnings", a.intelligenceWarnings);
  addAll("judgeConcerns", a.judgeConcerns);
  addAll("courtConcerns", a.courtConcerns);
  addAll("proceduralRisks", a.proceduralRisks);
  addAll("nextBestActions", a.nextBestActions);
  if (a.intelligenceSummary) entries.push({ field: "intelligenceSummary", text: a.intelligenceSummary });
  return entries;
}

// Rules 1 & 2: judge-prediction / opposing-argument-prediction, anywhere in the output.
function checkJudgeAndOpposingLanguage(entries: FieldTextEntry[]): RuleFailure[] {
  const failures: RuleFailure[] = [];
  for (const entry of entries) {
    const result = validateCaseStrengthLanguage(entry.text);
    if (result.valid || !result.matchedTerm) continue;
    const rule: RuleId = JUDGE_TERMS.has(result.matchedTerm)
      ? "no-judge-prediction"
      : OPPOSING_TERMS.has(result.matchedTerm)
        ? "no-opposing-argument-prediction"
        : "no-judge-prediction"; // any future BLOCKED_TERMS addition not yet categorized defaults here rather than being silently dropped
    failures.push({
      rule,
      detail: `Field "${entry.field}" matched blocked term "${result.matchedTerm}"`,
      offendingText: entry.text,
    });
  }
  return failures;
}

// Rule 3: evidence explicitly confirmed during the conversation must never be flagged missing.
const STOPWORDS = new Set([
  "a", "an", "the", "of", "or", "and", "to", "for", "with", "your", "you",
  "if", "this", "that", "these", "those", "is", "are", "was", "were", "in",
  "on", "at", "from", "by", "it", "its", "as", "be", "been", "being", "not",
  "any", "all", "showing", "confirming", "email", "records",
]);

function keywordsOf(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n += 1;
  return n;
}

function checkConfirmedEvidenceNotMissing(story: GeneratedStory, entries: FieldTextEntry[]): RuleFailure[] {
  const failures: RuleFailure[] = [];
  const candidateEntries = entries.filter((e) => e.field === "missingEvidence" || e.field === "evidenceWeaknesses");
  for (const confirmed of story.confirmedEvidenceDescriptions) {
    const confirmedKeywords = keywordsOf(confirmed);
    if (confirmedKeywords.size === 0) continue;
    for (const entry of candidateEntries) {
      const entryKeywords = keywordsOf(entry.text);
      // Deliberately coarse (>=2 shared significant words), same "known
      // precision limit, not a bug to chase with heuristics" posture as
      // evidenceGapDetector.ts's own word-overlap matching.
      if (overlapCount(confirmedKeywords, entryKeywords) >= 2) {
        failures.push({
          rule: "confirmed-evidence-not-missing",
          detail: `Confirmed evidence "${confirmed}" appears reflagged as missing/weak in field "${entry.field}"`,
          offendingText: entry.text,
        });
      }
    }
  }
  return failures;
}

// Rule 4: over-limit warning must fire iff amount exceeds the Small Claims limit.
// "Ontario Small Claims Court limit" is the exact phrase
// detectOverLimitClaimAmount() (courtSimplifiedBrain.ts) generates -- not a
// paraphrase, the literal string, verified against the real code this
// session, and against ontario.ca directly (see Session 35/36's fixtures'
// own citations for the $50,000 / October 1, 2025 verification).
function checkOverLimitWarning(story: GeneratedStory, entries: FieldTextEntry[]): RuleFailure[] {
  const warningText = entries
    .filter((e) => e.field === "userWarnings" || e.field === "intelligenceWarnings")
    .map((e) => e.text)
    .find((t) => t.includes("exceeds the Ontario Small Claims Court limit"));

  if (story.overLimit && !warningText) {
    return [
      {
        rule: "over-limit-warning-correct",
        detail: `Amount $${story.amount.toLocaleString()} exceeds the $50,000 limit but no over-limit warning was found in userWarnings/intelligenceWarnings`,
        offendingText: "(warning absent)",
      },
    ];
  }
  if (!story.overLimit && warningText) {
    return [
      {
        rule: "over-limit-warning-correct",
        detail: `Amount $${story.amount.toLocaleString()} is under the $50,000 limit but an over-limit warning was found anyway`,
        offendingText: warningText,
      },
    ];
  }
  return [];
}

// Rule 5: a date stated as uncertain must be reflected as uncertain, never silently treated as fixed.
const DATE_UNCERTAINTY_KEYWORDS = /(exact|confirm|unclear|unconfirmed|don.t know|do not know|uncertain|not sure|unknown)/i;

function checkUncertainDatePreserved(story: GeneratedStory, entries: FieldTextEntry[]): RuleFailure[] {
  if (!story.dateUncertain) return [];
  const candidateEntries = entries.filter((e) => e.field === "missingInformation" || e.field === "risksAndGaps");
  const acknowledged = candidateEntries.some((e) => /date/i.test(e.text) && DATE_UNCERTAINTY_KEYWORDS.test(e.text));
  if (!acknowledged) {
    return [
      {
        rule: "uncertain-date-preserved",
        detail:
          "Story stated the date as uncertain, but no missingInformation/risksAndGaps entry acknowledges the date needs confirming",
        offendingText: `(no matching entry found; missingInformation=${JSON.stringify(candidateEntries.filter((e) => e.field === "missingInformation").map((e) => e.text))})`,
      },
    ];
  }
  return [];
}

/** Runs all 5 rules against one story's real AnalysisResult. Pure, deterministic, no AI. */
export function checkRules(story: GeneratedStory, analysis: AnalysisResult, matchedClaimType: string | null): RuleCheckResult {
  const entries = collectOutputTexts(analysis);
  const failures: RuleFailure[] = [
    ...checkJudgeAndOpposingLanguage(entries),
    ...checkConfirmedEvidenceNotMissing(story, entries),
    ...checkOverLimitWarning(story, entries),
    ...checkUncertainDatePreserved(story, entries),
  ];
  return {
    storyId: story.id,
    claimTypeId: story.claimTypeId,
    matchedClaimType,
    failures,
  };
}
