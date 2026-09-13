/**
 * The family engines grade nothing.
 *
 * COSTS NOTHING. A source scan plus one pure engine run.
 *
 * WHY. The family engines had never been audited. They held two of the eight
 * score formulas this session found: `scoreEvidence` (0-100 per evidence item,
 * bucketed strong / useful / needs-context / weak / risky) and
 * `determineConfidence` (100 minus weighted penalties, bucketed high / medium /
 * low). The first reached the user twice over — as `recommendedEvidence` and
 * inside `analysis.summary`. The second had no reader at all, which is exactly
 * why it survived: nothing rendered it, and "not rendered" was treated as
 * evidence that a section 3 value was harmless. It was not — it was serialized
 * into the assistant prompt until 1981f80.
 *
 * The checks below are substring matches, not word-boundary matches. A
 * `\bScore\b` pattern does NOT fire on `strengthScore`, and that is how four
 * score formulas survived an earlier removal pass.
 *
 * Run: node --import tsx scripts/verification/verifyFamilyNoScores.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runFamilyEvidenceEngine } from "../../src/lib/case-system/familyEvidenceEngine";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ENGINE_DIR = path.join(__dirname, "..", "..", "src", "lib", "case-system");

const FAMILY_FILES = readdirSync(ENGINE_DIR)
  .filter((file) => file.startsWith("family") && file.endsWith(".ts"))
  .map((file) => ({
    file,
    raw: readFileSync(path.join(ENGINE_DIR, file), "utf8"),
  }));

/**
 * Comments in these files legitimately quote what was removed — that is the
 * record of why it went. Assert on live code only.
 */
function liveCode(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

/**
 * The classifier's per-issue detection scores (`FamilyNormalizedIssueScore`,
 * `caseTypeScores`, `parentingScores`, ...) are navigation, not case grading:
 * they decide which topic to surface, the same as the Small Claims court
 * classifier, and they are not a judgment about how a matter will go. They are
 * exempt here and flagged in OUTSTANDING_ISSUES.md instead.
 */
const CLASSIFIER_EXEMPT = /familyAiIntakeNormalizer\.ts$/;

function main(): void {
  // ---- No score-suffixed identifier survives ----
  //
  // Substring, case-insensitive. `strengthScore` must fail this, and did.

  for (const { file, raw } of FAMILY_FILES) {
    if (CLASSIFIER_EXEMPT.test(file)) continue;

    const code = liveCode(raw);
    const hits = code.match(/[A-Za-z]+[Ss]core[sd]?\b/g) || [];
    check(`${file} declares no score-suffixed identifier`, hits.length === 0, hits.join(", "));
  }

  // ---- The two removed formulas are gone by name ----

  const allCode = FAMILY_FILES.map(({ raw }) => liveCode(raw)).join("\n");

  for (const name of [
    "scoreEvidence",
    "determineConfidence",
    "strengthScore",
    "FamilyEvidenceStrength",
    "FamilyMasterCaseConfidence",
    "strongestEvidence",
    "riskyEvidence",
    "judgeReadySummary",
  ]) {
    check(`${name} is gone from live family code`, !allCode.includes(name));
  }

  // ---- No ordinal ladder grading the user's material ----

  for (const { file, raw } of FAMILY_FILES) {
    const code = liveCode(raw);

    // Form routing priorities ("required-now") are procedural facts about what
    // a rule demands, not a grade. The banned shape is a bare high/medium/low
    // or strong/weak ladder.
    check(
      `${file} has no high/medium/low ladder`,
      !/"high"\s*\|\s*"medium"\s*\|\s*"low"/.test(code),
    );
    check(
      `${file} has no strong/weak ladder`,
      !/"strong"\s*\|\s*"useful"|"weak"\s*\|\s*"risky"/.test(code),
    );
  }

  // ---- No prediction about how a reader will receive the user's material ----
  //
  // Drafting guidance is allowed and wanted: "Replace emotional labels with
  // dated incidents" tells someone what to do. What is not allowed is the
  // prediction that used to sit beside it — "Emotionally charged wording may
  // reduce credibility if not tied to specific evidence" — which forecasts a
  // decision-maker's reaction to the user's own case (CLAUDE.md section 3).
  //
  // These patterns are deliberately narrow. A blanket ban on "credibility"
  // would fire on legitimate drafting vocabulary, and a check that cannot
  // distinguish the two teaches people to suppress it.

  const PREDICTION_PATTERNS: Array<{ pattern: RegExp; why: string }> = [
    { pattern: /may reduce credibility/i, why: "forecasts how a reader will weigh the user's material" },
    { pattern: /\b(will|would|may) (?:be )?(?:seen|viewed|perceived) (?:as|by)/i, why: "forecasts a reader's perception" },
    { pattern: /\bthe (?:judge|court) (?:will|would|is likely to)\b/i, why: "predicts what the decision-maker will do" },
    { pattern: /\bjudge impact\b/i, why: "asserts what a judge takes from a document" },
    { pattern: /\bfinancial credibility\b/i, why: "grades the user's credibility" },
  ];

  for (const { file, raw } of FAMILY_FILES) {
    const code = liveCode(raw);

    for (const { pattern, why } of PREDICTION_PATTERNS) {
      const hit = code.match(pattern);
      check(
        `${file} makes no prediction matching ${pattern.source.slice(0, 34)}`,
        hit === null,
        hit ? `"${hit[0]}" — ${why}` : undefined,
      );
    }
  }

  // The guidance the prediction sat beside must still be there. A check that
  // only removes things eventually removes the useful half too.
  const strategyEngine = FAMILY_FILES.find(({ file }) => file === "familyStrategyEngine.ts");
  check(
    "the drafting guidance survived the prediction's removal",
    strategyEngine !== undefined &&
      liveCode(strategyEngine.raw).includes("Replace emotional labels with dated incidents"),
  );

  // ---- No percentage arithmetic over the user's case ----

  for (const { file, raw } of FAMILY_FILES) {
    if (CLASSIFIER_EXEMPT.test(file)) continue;

    const code = liveCode(raw);
    const pct = code.match(/Math\.(min|max)\(\s*100|\/\s*100\b|\*\s*100\b/g) || [];
    check(`${file} does no percentage arithmetic`, pct.length === 0, pct.join(", "));
  }

  // ---- The engine's own output holds no grade ----
  //
  // A source scan cannot see a grade assembled at runtime, so run the thing.

  const result = runFamilyEvidenceEngine({
    normalized: {
      detectedCaseTypes: [],
      parentingIssues: [],
      supportIssues: [],
      safetyIssues: [],
      propertyIssues: [],
      missingInformation: [],
      evidence: {
        hasTimeline: false,
        hasFinancialDisclosure: false,
        hasPoliceOrSafetyRecords: false,
      },
    } as never,
    strategy: { recommendedEvidence: [] } as never,
    workflow: {
      evidenceNeededNow: [],
      parentingIssues: [],
      supportIssues: [],
      safetyIssues: [],
      propertyIssues: [],
    } as never,
    formRouting: { blockersBeforeGeneration: [] } as never,
    rawEvidence: [
      // Fully recorded.
      {
        title: "Text messages about pickup times",
        fileName: "messages.pdf",
        category: "message-email-text",
        date: "2026-03-04",
        source: "My phone",
        relevance: "parenting time",
      },
      // Missing everything the old scorer penalised, including the hedging
      // phrase that used to cost 15 points and earn a credibility remark.
      {
        title: "A note I wrote",
        description: "I think this was around the time things got bad, not sure",
      },
    ],
  });

  const serialized = JSON.stringify(result);

  check(
    "no engine output field grades an item",
    !/"strength"|"strengthScore"|"confidence"/.test(serialized),
    serialized.slice(0, 200),
  );
  check(
    "no output text calls the user's evidence weak or strong",
    !/\b(weak|strong|strongest|risky|credibilit)/i.test(serialized),
    (serialized.match(/[^"]*\b(weak|strong|strongest|risky|credibilit)[^"]*/i) || [])[0],
  );

  // ---- The partition that replaced the ladder ----

  check(
    "the fully recorded item is in completeEvidence",
    result.completeEvidence.length === 1 &&
      result.completeEvidence[0]?.title === "Text messages about pickup times",
  );
  check(
    "the item missing details is in incompleteEvidence",
    result.incompleteEvidence.length === 1 &&
      result.incompleteEvidence[0]?.title === "A note I wrote",
  );
  check(
    "the partition covers every item exactly once",
    result.completeEvidence.length + result.incompleteEvidence.length ===
      result.analyzedEvidence.length,
  );
  check(
    "membership is stated as what is not recorded",
    result.incompleteEvidence[0]?.missingDetails.every((detail) => /^No /.test(detail)) === true,
    result.incompleteEvidence[0]?.missingDetails.join(" | "),
  );
  check(
    "the user's hedging wording is not held against them",
    result.incompleteEvidence[0]?.missingDetails.every(
      (detail) => !/uncertain|second-hand/i.test(detail),
    ) === true,
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
