/**
 * Journey invariant suite -- the assertion half of the regression battery
 * designed in docs/TEST_BATTERY_DESIGN.md.
 *
 * Extends fixtures/ruleChecks.ts rather than replacing it: the same
 * field-enumeration posture, the same "pure pattern matching, no AI call
 * ever judges another AI call's output" rule, and I2 reuses
 * caseStrengthLanguageValidator's real production blocked-term list rather
 * than a second copy that could drift.
 *
 * TWO ARMS, and the distinction is the whole point (design doc §0):
 *
 *   RUNTIME  -- over a PipelineRun's output. Catches what reaches a user.
 *   STATIC   -- over source files. Catches grading constructs that never
 *               appear as output text at all.
 *
 * readinessTone() coloured a progress bar red/amber/green from a 0-100
 * score. It emitted no words, so no runtime check over output could ever
 * have seen it. Only the static arm catches that class. Likewise
 * "Document readiness impact", which was an ordinal string-literal union
 * ("none"|"minor"|"moderate"|"major"|"severe") under a neutral label.
 *
 * Known blind spots are documented in docs/TEST_BATTERY_DESIGN.md §3 and
 * summarised on each check below. They are stated rather than papered
 * over: a suite that reports clean because its checks are shallow is
 * worse than no suite, because it licenses confidence.
 */

import fs from "node:fs";
import path from "node:path";

import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import type { PipelineRun } from "./fixtures/pipelineRunner";

export type InvariantId =
  | "I1-no-case-grading"
  | "I2-no-judge-prediction"
  | "I3-no-opposing-prediction"
  | "I4-no-element-satisfaction"
  | "I5-no-fabricated-facts"
  | "I6-confirmed-evidence-not-missing"
  | "I7-citations-resolve"
  | "I8-unconfirmed-suggestion-contained"
  | "I9-no-cross-case-leakage"
  | "I10-no-bare-deadline"
  | "I11-unknown-advances"
  | "I12-injection-inert";

export type Violation = {
  invariant: InvariantId;
  journeyId: string;
  /** Which field of which structure the offending text came from. */
  sourceField: string;
  detail: string;
  offendingText: string;
};

/* ------------------------------------------------------------------ */
/* Field enumeration                                                   */
/* ------------------------------------------------------------------ */

type FieldText = { field: string; text: string };

/**
 * Every user-reachable string in a run. Deliberately exhaustive over
 * AnalysisResult rather than a curated subset -- ruleChecks.ts's
 * collectOutputTexts() covers 10 fields; AnalysisResult declares ~40, and
 * the defects that escaped were in the ones nobody enumerated.
 */
export function collectJourneyTexts(run: PipelineRun): FieldText[] {
  const out: FieldText[] = [];
  const push = (field: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push({ field, text: v });
    else if (Array.isArray(v)) {
      for (const item of v) if (typeof item === "string" && item.trim()) out.push({ field, text: item });
    }
  };

  const analysis = run.analysisOutput as Record<string, unknown> | null;
  if (analysis) {
    for (const [key, value] of Object.entries(analysis)) {
      if (key === "intelligence") continue; // nested snapshot, walked below
      push(`analysis.${key}`, value);
    }
    const intel = analysis.intelligence as Record<string, unknown> | undefined;
    if (intel) {
      for (const [key, value] of Object.entries(intel)) push(`analysis.intelligence.${key}`, value);
    }
  }

  run.turns.forEach((turn, i) => {
    push(`turns[${i}].questionAsked`, turn.questionAsked);
    if (turn.evidenceGuidanceThisTurn) {
      push(`turns[${i}].evidenceGuidance.unaddressed`, turn.evidenceGuidanceThisTurn.unaddressed);
      push(`turns[${i}].evidenceGuidance.addressed`, turn.evidenceGuidanceThisTurn.addressed);
    }
    push(`turns[${i}].possibleCorrections`, turn.possibleCorrections);
  });

  push("haltMessage", run.haltMessage);
  return out;
}

/** Everything the user themselves supplied -- the traceability base for I5. */
export function userSuppliedText(run: PipelineRun): string {
  return [run.input.story, ...Object.values(run.input.answers), run.input.location.city].join("\n").toLowerCase();
}

/* ------------------------------------------------------------------ */
/* I1 -- no case grading, by any construct                             */
/* ------------------------------------------------------------------ */

// 1a: a score presented against a maximum, or a labelled score.
const SCORE_PATTERNS: RegExp[] = [
  /\b\d{1,3}\s*\/\s*(?:100|10|5)\b/,
  /\b\d{1,3}\s+out of\s+(?:100|10|5)\b/i,
  /\b(?:score|rating|grade|readiness)\b\s*[:=]\s*\d/i,
];

// 1b: a percentage or confidence figure applied to the case.
const PERCENT_PATTERNS: RegExp[] = [
  /\b\d{1,3}\s*%\s*(?:match|confidence|likely|chance|ready|complete[a-z]*)\b/i,
  /\b(?:confidence|likelihood|probability)\b[^.]{0,20}\b\d{1,3}\s*%/i,
];

// 1c: ordinal scale terms. Curated -- see blind spot 2.
const ORDINAL_TERMS = [
  "very weak", "weak", "moderate", "strong", "very strong",
  "poor", "fair", "excellent",
  "minor", "severe", "critical",
  "low risk", "high risk", "medium risk",
  "not ready", "near-ready", "developing",
];

// 1d: comparative / likelihood applied to the user's position.
const COMPARATIVE_PATTERNS: RegExp[] = [
  /\byour (?:case|claim|position|evidence)\b[^.]{0,40}\b(?:is|looks|seems|appears)\b[^.]{0,20}\b(?:strong|weak|good|bad|solid|thin)\b/i,
  /\b(?:likely|unlikely) to (?:succeed|win|fail|lose)\b/i,
  /\b(?:good|poor|strong|weak) chance\b/i,
  /\bstronger than\b|\bweaker than\b/i,
];

function checkI1Runtime(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  for (const { field, text } of collectJourneyTexts(run)) {
    const lower = text.toLowerCase();
    for (const re of SCORE_PATTERNS) {
      const m = text.match(re);
      if (m) v.push({ invariant: "I1-no-case-grading", journeyId: run.input.id, sourceField: field, detail: "score against a maximum (1a)", offendingText: m[0] });
    }
    for (const re of PERCENT_PATTERNS) {
      const m = text.match(re);
      if (m) v.push({ invariant: "I1-no-case-grading", journeyId: run.input.id, sourceField: field, detail: "percentage/confidence figure (1b)", offendingText: m[0] });
    }
    for (const term of ORDINAL_TERMS) {
      // Only flag where the ordinal is applied to the user's matter, not
      // where it appears inside sourced legal content ("severe" in a
      // statutory quote is not a grading of this case).
      if (lower.includes(term) && /\byour\b|\bthis (?:case|claim)\b/.test(lower)) {
        v.push({ invariant: "I1-no-case-grading", journeyId: run.input.id, sourceField: field, detail: `ordinal scale term "${term}" applied to the user's matter (1c)`, offendingText: text.slice(0, 200) });
        break;
      }
    }
    for (const re of COMPARATIVE_PATTERNS) {
      const m = text.match(re);
      if (m) v.push({ invariant: "I1-no-case-grading", journeyId: run.input.id, sourceField: field, detail: "comparative/likelihood applied to the user's position (1d)", offendingText: m[0] });
    }
  }
  return v;
}

/* --- I1 static arm: the constructs that emit no output text --------- */

/**
 * Files scanned by the static arm. Curated, not the whole tree -- blind
 * spot 8. Chosen as the places that render or compute case-derived
 * signals.
 */
/**
 * SELF-TESTED. An earlier version of this list and the three patterns
 * below scored ZERO against the known-defective historical code, which is
 * exactly the "reports clean because the checks are shallow" failure this
 * battery exists to avoid. `npm run test:journey-invariants-selftest`
 * replays the pre-fix files from git and asserts each detector fires.
 *
 * The list is wider than the render layer because the first version
 * scanned only where values are DISPLAYED. "Document readiness impact" is
 * typed `string` at the adapter and is only an ordinal union at its
 * definition site, so the union was invisible until the schema and engine
 * files were added here.
 */
const STATIC_SCAN_FILES = [
  "app/dashboard/page.tsx",
  "app/dashboard/cases/[id]/page.tsx",
  "src/lib/case-system/dashboardEngine.ts",
  "src/lib/case-system/dashboard/dashboardAdapter.ts",
  "src/lib/case-system/intelligence/courtSimplifiedBrain.ts",
  "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts",
  "app/builder/_components/IntelligenceOverviewPanel.tsx",
  // Definition sites for ordinal grading types -- added after the self-test
  // showed the union was declared here, not where it is consumed.
  "src/lib/case-system/architecture/masterCaseSchema.ts",
  "src/lib/case-system/contradictions/credibilityRiskEngine.ts",
  "src/lib/case-system/litigation-intelligence/litigationReasoningEngine.ts",
  // Added during tranche 1: blind spot 8 bit a second time. This page
  // renders `{exportResult.readinessScore}%` and was invisible to the arm
  // because the list was built from the dashboard surfaces only.
  "app/document-export/page.tsx",
  "src/lib/case-system/documentExportEngine.ts",
];

// 1e: ordinal string-literal unions -- what "Document readiness impact" was.
const ORDINAL_UNION = /("(?:none|very-low|low|minor|moderate|medium|high|major|severe|critical|weak|strong|poor|fair)"\s*\|\s*"[^"\n]+"(?:\s*\|\s*"[^"\n]+")*)/gi;

// 1f: colour ramp keyed to a numeric threshold -- what readinessTone() was.
// Loosened after the self-test: the first version required an explicit
// `: number` parameter annotation AND a Tone/Colour-ish name, and missed
// `function readinessTone(score: number)` on the name pattern's backtracking.
// Now: any function whose body compares a number and returns a colour class.
const THRESHOLD_COLOUR_FN = /function\s+\w+\s*\([^)]*\)[^{]*\{[\s\S]{0,400}?(?:>=|<=|>|<)\s*\d+[\s\S]{0,200}?bg-(?:red|amber|yellow|orange|emerald|green|rose|lime)-\d{2,3}/g;
const COLOUR_RAMP = /(?:score|readiness|rating|confidence)[^\n]{0,80}\n?[^\n]{0,140}(?:bg-(?:red|amber|yellow|orange|emerald|green)-\d{2,3})/gi;

// Risk-weighted arithmetic in a scoring expression -- the third defect class.
// Loosened after the self-test: the first version required `score -=` or
// `score = ... -`, and missed `return clampScore(score - highRiskPenalty * 2)`.
const RISK_SUBTRACTION = /\b(?:score|readiness|total|average)\b[^;\n]{0,60}-[^;\n]{0,60}\b\w*(?:[Rr]isk|[Pp]enalty|[Cc]ontradiction|[Ww]eakness|[Bb]locker)\w*\b|\b(?:score|readiness|total)\s*-=[^;\n]{0,80}/g;

/**
 * Session 48 — blind spot 8 addressed. The curated list above hid real
 * findings TWICE (masterCaseSchema.ts during the self-test,
 * document-export/page.tsx during tranche 1), so the arm can now walk the
 * whole tree instead.
 *
 * Measured rather than assumed: a full walk of app/ and src/ is 219 files,
 * runs in well under a second, and makes no network calls — so it is
 * feasible, and `scanAll` defaults to true.
 *
 * The honest tradeoff, stated because it matters to how the output is read:
 * the curated list produced 11 hits, the whole tree produces ~101 across 42
 * files. The extra hits are not all defects. The detector flags a
 * CONSTRUCT, and no regex can tell whether a given ordinal union grades the
 * USER'S CASE (prohibited) or something unrelated like a log level or an
 * internal confidence band (fine). So the wide scan is a TRIAGE QUEUE, not
 * a defect list, and callers should treat it that way.
 *
 * What the wide scan buys that the curated list could not: it confirmed
 * zero threshold-colour ramps anywhere in app/ or src/ after the two fixed
 * this session. A curated list can only ever report that the files someone
 * thought to list are clean.
 */
function collectScanFiles(repoRoot: string, scanAll: boolean): string[] {
  if (!scanAll) return STATIC_SCAN_FILES;

  const out: string[] = [];
  const walk = (dir: string) => {
    const full = path.join(repoRoot, dir);
    if (!fs.existsSync(full)) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/node_modules|\.next|\.git/.test(rel)) continue;
        walk(rel);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(rel);
      }
    }
  };
  walk("app");
  walk("src");
  return out;
}

export function checkI1Static(repoRoot: string, scanAll = true): Violation[] {
  const v: Violation[] = [];
  for (const rel of collectScanFiles(repoRoot, scanAll)) {
    const full = path.join(repoRoot, rel);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");
    // Strip line and block comments so the deliberate prose explaining a
    // past removal is not itself reported as the defect.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    for (const m of code.matchAll(ORDINAL_UNION)) {
      v.push({ invariant: "I1-no-case-grading", journeyId: "(static)", sourceField: rel, detail: "ordinal string-literal union type (1e) — the construct that hid \"Document readiness impact\"", offendingText: m[1].slice(0, 160) });
    }
    for (const m of code.matchAll(THRESHOLD_COLOUR_FN)) {
      v.push({ invariant: "I1-no-case-grading", journeyId: "(static)", sourceField: rel, detail: "colour ramp keyed to a numeric score (1f) — the construct that was readinessTone()", offendingText: m[0].slice(0, 160) });
    }
    for (const m of code.matchAll(COLOUR_RAMP)) {
      v.push({ invariant: "I1-no-case-grading", journeyId: "(static)", sourceField: rel, detail: "colour class rendered near a score/readiness value (1f)", offendingText: m[0].replace(/\s+/g, " ").slice(0, 160) });
    }
    for (const m of code.matchAll(RISK_SUBTRACTION)) {
      v.push({ invariant: "I1-no-case-grading", journeyId: "(static)", sourceField: rel, detail: "risk-weighted subtraction in a scoring expression", offendingText: m[0].replace(/\s+/g, " ").slice(0, 160) });
    }
  }
  return v;
}

/* ------------------------------------------------------------------ */
/* I2 / I3 -- judge and opposing-party prediction                      */
/* ------------------------------------------------------------------ */

const JUDGE_TERMS = [
  "judge may", "judge will", "judge would", "judge might", "judge is likely",
  "deputy judge may", "deputy judge will", "adjudicator may", "adjudicator will",
  "court may question", "court may ask", "court may care", "court will focus",
  "judge concern", "judicial concern",
];

function checkI2(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  for (const { field, text } of collectJourneyTexts(run)) {
    const lower = text.toLowerCase();
    for (const term of JUDGE_TERMS) {
      if (lower.includes(term)) {
        v.push({ invariant: "I2-no-judge-prediction", journeyId: run.input.id, sourceField: field, detail: `judge-prediction term "${term}"`, offendingText: text.slice(0, 200) });
        break;
      }
    }
    // Reuse the real production validator -- same list the fix runs.
    const result = validateCaseStrengthLanguage(text);
    if (!result.valid && result.matchedTerm && JUDGE_TERMS.some((t) => t.startsWith(result.matchedTerm!.slice(0, 5)))) {
      v.push({ invariant: "I2-no-judge-prediction", journeyId: run.input.id, sourceField: field, detail: `caseStrengthLanguageValidator matched "${result.matchedTerm}"`, offendingText: text.slice(0, 200) });
    }
  }
  return v;
}

/**
 * I3. The difficulty is the EXEMPTION, not the detection.
 * DEFENCE_CONCEPTS content states what a defence generally involves and is
 * permitted and live. So a hit only counts when the text is specific to
 * THIS user -- second-person reference plus definite future framing.
 * Blind spot 4: a user-specific prediction written in third person passes.
 */
const OPPOSING_PREDICTION = /\b(?:the )?(?:defendant|plaintiff|other side|opposing (?:party|side))\b[^.]{0,60}\b(?:will|is going to|is likely to)\b[^.]{0,40}\b(?:argue|claim|say|raise|allege|respond)\b/i;
const GENERIC_DEFENCE_FRAMING = /\b(?:generally|typically|often|can|may) (?:involves?|argues?|raises?|be raised)\b|\bthis defence\b|\ba defendant (?:can|may)\b/i;

function checkI3(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  for (const { field, text } of collectJourneyTexts(run)) {
    const m = text.match(OPPOSING_PREDICTION);
    if (!m) continue;
    if (GENERIC_DEFENCE_FRAMING.test(text)) continue; // permitted DEFENCE_CONCEPTS form
    if (!/\byou\b|\byour\b/i.test(text)) continue; // not specific to this user
    v.push({ invariant: "I3-no-opposing-prediction", journeyId: run.input.id, sourceField: field, detail: "user-specific prediction of what the opposing party will argue", offendingText: m[0] });
  }
  return v;
}

/* ------------------------------------------------------------------ */
/* I4 -- no assertion the user's facts satisfy an element              */
/* ------------------------------------------------------------------ */

const ELEMENT_WORDS = /\b(?:element|requirement|must show|must prove|need to show|need to prove|test for)\b/i;
const SECOND_PERSON = /\byour (?:claim|case|evidence|facts|situation|story)\b|\byou have\b|\byou don'?t have\b|\byou meet\b/i;
const SATISFACTION_VERB = /\b(?:meets?|satisfies|satisfied|establishes?|proves?|fails? to|falls? short|is missing|are missing|doesn'?t meet|don'?t have enough|not enough to)\b/i;

/**
 * Blind spot 1, and the most important caveat in this file: this detects
 * EXPLICIT satisfaction claims only. "You'll want to gather more on
 * causation" implies a deficiency without asserting one and passes here.
 * I4 passing is weak evidence, not proof.
 */
function checkI4(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  for (const { field, text } of collectJourneyTexts(run)) {
    if (ELEMENT_WORDS.test(text) && SECOND_PERSON.test(text) && SATISFACTION_VERB.test(text)) {
      v.push({ invariant: "I4-no-element-satisfaction", journeyId: run.input.id, sourceField: field, detail: "element language + second person + satisfaction/deficiency verb", offendingText: text.slice(0, 240) });
    }
  }
  return v;
}

/* ------------------------------------------------------------------ */
/* I5 -- no fabricated facts                                           */
/* ------------------------------------------------------------------ */

const DATE_RE = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi;
const MONEY_RE = /\$\s?[\d,]+(?:\.\d{2})?/g;

/** System-supplied specifics that are legitimately not from the user. */
const SYSTEM_SPECIFIC = /\$50,000|\$35,000|\$500\b|\$45,000|\$10,000|form \d+[a-z]?|o\. reg\.|r\.s\.o\.|s\.o\. \d{4}/i;

function checkI5(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  const supplied = userSuppliedText(run);
  for (const { field, text } of collectJourneyTexts(run)) {
    for (const re of [DATE_RE, MONEY_RE]) {
      for (const m of text.matchAll(re)) {
        const token = m[0].trim();
        if (SYSTEM_SPECIFIC.test(token)) continue;
        const normalised = token.replace(/\s|,/g, "").toLowerCase();
        const suppliedNorm = supplied.replace(/\s|,/g, "");
        if (!suppliedNorm.includes(normalised)) {
          v.push({ invariant: "I5-no-fabricated-facts", journeyId: run.input.id, sourceField: field, detail: `specific not traceable to user-supplied text: "${token}"`, offendingText: text.slice(0, 200) });
        }
      }
    }
  }
  return v;
}

/* ------------------------------------------------------------------ */
/* I6 / I8 / I10 / I11                                                 */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(["a","an","the","of","or","and","to","for","with","your","you","if","this","that","is","are","was","were","in","on","at","from","by","it","its","as","be","any","all","showing","confirming","email","records","have","had"]);
const keywords = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));

/** I6, verified under paraphrase: 2+ significant-word overlap, same technique as the production filter. */
function checkI6(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  const confirmed = keywords(Object.values(run.input.answers).join(" ") + " " + run.input.story);
  const analysis = run.analysisOutput as Record<string, unknown> | null;
  const missing = (analysis?.missingEvidence as string[] | undefined) || [];
  for (const item of missing) {
    let overlap = 0;
    for (const w of keywords(item)) if (confirmed.has(w)) overlap += 1;
    if (overlap >= 2) {
      v.push({ invariant: "I6-confirmed-evidence-not-missing", journeyId: run.input.id, sourceField: "analysis.missingEvidence", detail: `${overlap} significant words overlap with evidence the user described`, offendingText: item });
    }
  }
  return v;
}

/** I8: an unconfirmed suggestion must not leak into matched/guidance on the same turn. */
function checkI8(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  run.turns.forEach((turn, i) => {
    if (turn.suggestedClaimTypeThisTurn && turn.matchedClaimTypeThisTurn) {
      v.push({ invariant: "I8-unconfirmed-suggestion-contained", journeyId: run.input.id, sourceField: `turns[${i}]`, detail: "a suggestion and a matched claim type coexist on the same turn", offendingText: `suggested=${turn.suggestedClaimTypeThisTurn} matched=${turn.matchedClaimTypeThisTurn}` });
    }
    if (turn.suggestedClaimTypeThisTurn && turn.evidenceGuidanceThisTurn) {
      v.push({ invariant: "I8-unconfirmed-suggestion-contained", journeyId: run.input.id, sourceField: `turns[${i}].evidenceGuidanceThisTurn`, detail: "evidence guidance surfaced while a suggestion was still unconfirmed", offendingText: turn.suggestedClaimTypeThisTurn });
    }
  });
  return v;
}

const TEMPORAL = /\bwithin \d+ (?:days?|months?|years?)\b|\b\d+-day\b|\bdeadline\b|\bby (?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
const CITATION_MARKER = /\br\.\s?\d|\bs\.\s?\d|\bsection \d|o\. reg\.|rules of the small claims court|limitations act|courts of justice act/i;
const NO_CALC_DISCLAIMER = /does not calculate|cannot calculate|confirm (?:the|this) date|not something this (?:site|content)|check with the court/i;

function checkI10(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  for (const { field, text } of collectJourneyTexts(run)) {
    if (!TEMPORAL.test(text)) continue;
    if (CITATION_MARKER.test(text) || NO_CALC_DISCLAIMER.test(text)) continue;
    v.push({ invariant: "I10-no-bare-deadline", journeyId: run.input.id, sourceField: field, detail: "timing statement with no rule citation and no does-not-calculate disclaimer", offendingText: text.slice(0, 220) });
  }
  return v;
}

/** I11: no question repeats, and the journey terminates. */
function checkI11(run: PipelineRun): Violation[] {
  const v: Violation[] = [];
  const seen = new Map<string, number>();
  run.turns.forEach((turn, i) => {
    if (!turn.questionAsked) return;
    const prior = seen.get(turn.questionAsked);
    if (prior !== undefined) {
      v.push({ invariant: "I11-unknown-advances", journeyId: run.input.id, sourceField: `turns[${i}].questionAsked`, detail: `question repeated (first asked at turn ${prior})`, offendingText: turn.questionAsked });
    }
    seen.set(turn.questionAsked, i);
  });
  if (!run.intakeComplete && !run.halted) {
    v.push({ invariant: "I11-unknown-advances", journeyId: run.input.id, sourceField: "run", detail: "journey neither completed nor halted — did not advance to an end state", offendingText: `turns=${run.turns.length}` });
  }
  return v;
}

/* ------------------------------------------------------------------ */
/* I9 -- cross-case leakage (needs two runs)                           */
/* ------------------------------------------------------------------ */

export function checkI9(a: PipelineRun, aMarkers: string[], b: PipelineRun, bMarkers: string[]): Violation[] {
  const v: Violation[] = [];
  const scan = (run: PipelineRun, foreign: string[], otherId: string) => {
    for (const { field, text } of collectJourneyTexts(run)) {
      for (const marker of foreign) {
        if (text.toLowerCase().includes(marker.toLowerCase())) {
          v.push({ invariant: "I9-no-cross-case-leakage", journeyId: run.input.id, sourceField: field, detail: `contains marker "${marker}" belonging to concurrent journey ${otherId}`, offendingText: text.slice(0, 200) });
        }
      }
    }
  };
  scan(a, bMarkers, b.input.id);
  scan(b, aMarkers, a.input.id);
  return v;
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

/** Every runtime invariant over one journey. I9 and I12 are applied by the caller. */
export function checkJourney(run: PipelineRun): Violation[] {
  return [
    ...checkI1Runtime(run),
    ...checkI2(run),
    ...checkI3(run),
    ...checkI4(run),
    ...checkI5(run),
    ...checkI6(run),
    ...checkI8(run),
    ...checkI10(run),
    ...checkI11(run),
  ];
}

export const INVARIANT_BLIND_SPOTS: Record<string, string> = {
  "I4-no-element-satisfaction": "Detects EXPLICIT satisfaction claims only. Implicature (\"you'll want more on causation\") passes. Weak evidence, not proof.",
  "I1-no-case-grading": "1a/1b are shape-based and strong. 1c/1d are a curated term family and can be evaded by novel phrasing. The static arm (1e/1f) is the stronger half.",
  "I5-no-fabricated-facts": "Reliable for dates and currency. Proper nouns are not checked — capitalisation is too noisy a signal.",
  "I3-no-opposing-prediction": "The DEFENCE_CONCEPTS exemption is a heuristic. A user-specific prediction written in third person may pass.",
  "I9-no-cross-case-leakage": "Proves absence for the vocabularies tested, not in general.",
  "I12-injection-inert": "Asserts behaviour is unchanged, not that injection was noticed.",
  "(static arm)": "Scans a curated file list, not the whole tree. A grading construct in an unscanned file is invisible.",
};
