/**
 * No model-written prose reaches a document, an export, or a court form.
 *
 * COSTS NOTHING. Calls the real engine with a real input, with external
 * cognition disabled, and inspects what comes out. No network, no AI.
 *
 * *** THE FAILURE THIS EXISTS FOR ***
 *
 * The LSO audit named `analysis.nextBestActions` reaching the downloadable
 * document as "the clearest policy breach in the code". Step 2 of the
 * remediation fixed that field and the "What to do next" heading it fed.
 *
 * An independent review on 2026-09-23 found three siblings still going the
 * same way, by routes nobody had walked:
 *
 *   missingEvidence     buildSummary()'s "Evidence to gather" heading, THREE
 *                       LINES ABOVE the heading that was fixed, then
 *                       analysis.summary -> CaseContext.summary ->
 *                       documentGenerationEngine.ts:105 -> the document body.
 *   missingInformation  -> documentGenerationEngine.ts:91, baseWarnings().
 *   risksAndGaps        -> app/api/document-export/route.ts:151, the "Risks
 *                       and gaps" section of a downloaded package (that route
 *                       was removed on 2026-10-04; the forms tool still reads
 *                       the field).
 *
 * Three render sites, one cause: the fields are assembled once and consumed
 * everywhere. So the fix is at the assembly point, and so is this check.
 *
 * *** WHY IT ASSERTS THE FIELD AND NOT THE DOCUMENT ***
 *
 * Checking the rendered document would need a full case, a database and a PDF.
 * Checking the FIELD asserts the property that makes every downstream consumer
 * safe — including the one someone adds next month, which a document-level
 * test written today would not cover.
 *
 * Run: node --import tsx scripts/verification/verifyNoModelProseInDocuments.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  analyzeSmallClaimsWithBrain,
  buildRawUserText,
  type SmallClaimsIntelligenceInput,
} from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Source with comments removed.
 *
 * Required, not tidy-minded. The comment at each fixed site explains what was
 * removed and therefore CONTAINS the expression being searched for — the note
 * above `risksAndGaps: []` says the words "analysis.risksAndGaps". The first
 * version of this file reported all three fixes as defects for that reason.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * A COMPLETE input. Every string field the engine reads is present.
 *
 * Built from the route's own `requiredStringFields` list rather than from the
 * fields this check happens to care about — a partial fixture threw inside the
 * engine on a field nobody here was testing, which is a fixture defect
 * masquerading as a finding.
 */
function fixture(): SmallClaimsIntelligenceInput {
  const blankStrings = [
    "yourAddress", "yourCity", "yourProvince", "yourPostalCode", "yourPhone",
    "yourEmail", "otherPartyPhone", "otherPartyEmail", "courtLocation",
    "claimNumber", "agreementDetails", "paymentHistory", "damagesBreakdown",
    "deadlineDetails", "missingEvidence", "settlementEfforts", "urgent",
  ];

  return {
    ...Object.fromEntries(blankStrings.map((field) => [field, ""])),
    caseStage: "starting-case",
    yourRole: "Plaintiff",
    yourName: "A. Plaintiff",
    otherParty: "B. Defendant",
    defendantAddress: "1 Example Street, Toronto ON",
    facts: "I paid for a deck rebuild in February and the work was never finished.",
    timeline: "Paid 3 February 2026. Work abandoned 20 March 2026.",
    amountClaimed: "$4,800",
    goal: "I want the money back.",
    issues: ["contract-dispute"],
    documents: [],
    filedDocuments: [],
    evidence: "A signed quote and text messages.",
    serviceDetails: "",
    defenceResponse: "",
    uploadedEvidenceFiles: [],
  } as unknown as SmallClaimsIntelligenceInput;
}

// ===========================================================================
// 1. The three fields carry no model contribution
// ===========================================================================

/**
 * Fields on AnalysisResult that reach a document, an export or a form, and
 * that used to carry model prose.
 *
 * Asserted at the ASSEMBLY POINT in source rather than by running the model,
 * because the property is "the model's value is not read into this field",
 * which is a fact about the code and not about one run of it.
 */
const STRIPPED_FIELDS = [
  { field: "missingInformation", reaches: "documentGenerationEngine.ts baseWarnings()" },
  { field: "missingEvidence", reaches: "buildSummary() -> CaseContext.summary -> the document body" },
  { field: "risksAndGaps", reaches: "the forms tool's \"To check before filing\" list" },
];

{
  const engine = withoutComments(read("src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts"));
  const offenders: string[] = [];

  for (const { field, reaches } of STRIPPED_FIELDS) {
    // The assembly point is `field: <expression>`. If that expression mentions
    // intelligencePatch, the model's value is being read into a user-facing
    // field again.
    const match = new RegExp(`\\n\\s{4}${field}:([\\s\\S]{0,400}?)\\n\\s{4}[a-zA-Z]`).exec(engine);
    if (!match) {
      offenders.push(`could not find the assembly of \`${field}\` — has it moved?`);
      continue;
    }
    if (/intelligencePatch\./.test(match[1])) {
      offenders.push(`\`${field}\` reads intelligencePatch again — reaches ${reaches}`);
    }
  }

  if (offenders.length === 0) {
    pass(`none of the ${STRIPPED_FIELDS.length} document-bound fields reads model output`);
  } else {
    fail("a model-written field is assembled into user-facing output", offenders.join("\n"));
  }
}

// ===========================================================================
// 2. buildSummary prefers the user's own words
// ===========================================================================

{
  const engine = withoutComments(read("src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts"));
  // From the `return [` rather than from the signature: buildSummary takes a
  // destructured object, so its parameter list contains a `}` at the start of
  // a line and slicing to the first one caught 121 characters of signature and
  // no body at all — which made the "still emits the user's facts" check below
  // fail for a reason that had nothing to do with the code under test.
  const start = engine.indexOf("function buildSummary(");
  const bodyStart = engine.indexOf("return [", start);
  const body = engine.slice(bodyStart, engine.indexOf("\n}", bodyStart));

  // buildSummary's output becomes the document body verbatim. Anything it
  // reads off `analysis` other than the deterministic stage is suspect.
  const suspicious = ["analysis.missingEvidence", "analysis.missingInformation", "analysis.risksAndGaps", "analysis.nextBestActions", "analysis.intelligenceSummary"];
  const found = suspicious.filter((expression) => body.includes(expression));

  if (found.length === 0) {
    pass("buildSummary reads no model-derived analysis field");
  } else {
    fail(
      "buildSummary reads a model-derived field into the document body",
      found.join("\n"),
    );
  }

  // And the positive: it must still produce something, or this passes because
  // the document went empty.
  if (body.includes("input.facts") && body.includes("catalogueNextSteps")) {
    pass("buildSummary still emits the user's own facts and the catalogue next steps");
  } else {
    fail("buildSummary no longer emits the user's facts or the catalogue — check above passes trivially");
  }
}

// ===========================================================================
// 3. What the user can print or download, and the form route
// ===========================================================================

// The export route (app/api/document-export) was removed on 2026-10-04 with
// its page, which no user could reach. What replaced it — the case file and
// the drafts on the case page — is checked instead: neither may read the
// stored analysis or a strength assessment, only the user's own record.
{
  const sources = [
    "app/cases/[id]/case-file/page.tsx",
    "app/cases/[id]/drafts/page.tsx",
    "src/lib/case-system/drafts/caseDrafts.ts",
  ];
  const problems: string[] = [];
  for (const file of sources) {
    const source = withoutComments(read(file));
    for (const [pattern, what] of [
      [/intakeAnalysis|courtSimplifiedIntelligence/, "reads the stored model analysis"],
      [/risksAndGaps/, "reads risksAndGaps"],
      [/\bstrengths\b|\bweaknesses\b/, "carries a strength assessment"],
    ] as const) {
      if (pattern.test(source)) problems.push(`${file} ${what}`);
    }
  }
  if (problems.length === 0) {
    pass("the case file and drafts read no model prose and no strength assessment");
  } else {
    fail("a document the user can print or download can carry model prose or a strength assessment", problems.join("\n"));
  }
}

{
  const formRoute = withoutComments(read("app/api/generate-form/route.ts"));
  const factsBlock = formRoute.slice(
    formRoute.indexOf("const facts = safe("),
    formRoute.indexOf("const timeline = safe("),
  );

  if (!/"summary"/.test(factsBlock)) {
    pass("the court-form facts field cannot resolve to the analysis summary");
  } else {
    fail(
      'generate-form\'s facts fallback still includes "summary"',
      "That can resolve to analysis.summary and the destination is a filed court document.",
    );
  }
}

// ===========================================================================
// 4. End to end, deterministically
// ===========================================================================

async function run(): Promise<void> {
  // allowExternalCognition: false means no model call at all, so whatever the
  // fields contain is what the deterministic path put there.
  const result = await analyzeSmallClaimsWithBrain(fixture(), {
    allowExternalCognition: false,
  });

  const analysis = result.analysis as unknown as Record<string, unknown>;

  for (const { field } of STRIPPED_FIELDS) {
    const value = analysis[field];
    const items = Array.isArray(value) ? value : [];
    // missingInformation legitimately keeps deterministic entries; the other
    // two are empty by design. Both are fine — what matters is that nothing
    // here came from a model, which check 1 asserts structurally. This is the
    // smoke test that the engine still runs after the change.
    console.log(`      ${field}: ${items.length} item(s)`);
  }

  const summary = String(analysis.summary ?? "");
  if (summary.includes("I paid for a deck rebuild")) {
    pass("the summary still contains the user's own facts");
  } else {
    fail("the summary lost the user's facts", summary.slice(0, 200));
  }

  if (!summary.includes("Missing proof:")) {
    pass('the summary no longer emits "Missing proof:" model text');
  } else {
    fail('the summary still emits "Missing proof:"');
  }

  // The prompt builder is unaffected by all of this and should still work.
  if (buildRawUserText(fixture()).includes("Small Claims Ontario intake")) {
    pass("the prompt builder still runs");
  } else {
    fail("the prompt builder broke");
  }
}

run()
  .then(() => {
    console.log("");
    console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
    process.exitCode = failures === 0 ? 0 : 1;
  })
  .catch((error) => {
    console.error("Suite failed.", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
