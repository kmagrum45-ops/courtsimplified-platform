/**
 * Deterministic self-test for composeCaseFileSummary().
 *
 * WHY THIS EXISTS. Fix 1 and Fix 2 (Session 48) removed the free-text summary
 * slot and replaced it with two model-supplied arrays assembled by
 * composeCaseFileSummary(). The intended evidence for that change was a
 * five-runs-either-side interception measurement, which is blocked by the
 * OpenAI account's 100-requests-per-day cap (one measurement run alone costs
 * roughly 680 requests).
 *
 * The composer is a PURE FUNCTION, so the part of the fix that this project
 * controls can be verified exactly, with no billed call. That is what this
 * does. It does NOT substitute for the measurement: it proves the assembled
 * sentence is well-formed and carries no verdict, not that the model stopped
 * trying to supply one. Those are different claims and only the second needs
 * the API.
 *
 * Two of these cases are regressions that actually shipped during development
 * and were caught by reading the output:
 *   - doubled periods ("...exist..") from wrapping already-terminated
 *     sentences in a sentence frame;
 *   - "It does not yet record No court documents have been filed yet." — a
 *     negative frame around an already-negative item.
 *
 * Run: node --import tsx scripts/verification/verifyCaseFileSummaryComposer.ts
 */

import { pathToFileURL } from "node:url";

import {
  composeCaseFileSummary,
  type CaseFileSummaryParts,
} from "../../src/lib/case-system/intelligence/courtSimplifiedBrain";

type Case = {
  name: string;
  parts: CaseFileSummaryParts;
  context: { primaryClaimTypes: string[]; stage: string };
  /** Substrings that must appear. */
  expect: string[];
  /** Substrings that must NOT appear. */
  reject: string[];
};

/**
 * Words that would mean the composed sentence had graded the case. The
 * composer builds from parts and never writes these itself, so any hit means
 * a model-supplied item carried a verdict through the composer unchanged —
 * which is a real finding, not a composer bug.
 */
const VERDICT_WORDS = [
  "strong",
  "weak",
  "likely",
  "unlikely",
  "viability",
  "chances",
  "good case",
  "potential case",
  "should win",
  "favourable",
  "favorable",
];

const CASES: Case[] = [
  {
    name: "plain shape — both arrays populated",
    parts: {
      caseFileRecorded: [
        "A signed services agreement dated 3 March 2025 is in the file.",
        "An invoice for $8,400 is in the file.",
      ],
      caseFileNotRecorded: ["No proof of delivery has been recorded."],
    },
    context: { primaryClaimTypes: ["debt"], stage: "pre-filing" },
    expect: ["Recorded under debt.", "In the file:", "Still to record:"],
    reject: ["..", "It does not yet record No"],
  },
  {
    name: "REGRESSION: items already ending in a period must not double up",
    parts: {
      caseFileRecorded: [
        "Text messages between the parties exist.",
        "A deposit receipt exists.",
      ],
      caseFileNotRecorded: ["No written contract exists."],
    },
    context: { primaryClaimTypes: ["contract"], stage: "pre-filing" },
    expect: [
      // Two items, so the join is actually exercised: the first must lose its
      // period to the separator rather than keeping it and doubling up.
      "Text messages between the parties exist; A deposit receipt exists.",
      "No written contract exists.",
    ],
    reject: ["exist..", "exists.."],
  },
  {
    name: "REGRESSION: negative item must not sit inside a negative frame",
    parts: {
      caseFileRecorded: [],
      caseFileNotRecorded: ["No court documents have been filed yet."],
    },
    context: { primaryClaimTypes: [], stage: "pre-filing" },
    expect: ["Still to record: No court documents have been filed yet."],
    reject: ["It does not yet record No", ".."],
  },
  {
    name: "structured shape — labelled lines, claim type and stage included",
    parts: {
      caseFileRecorded: ["Photographs of the damage are in the file."],
      caseFileNotRecorded: ["No repair estimate has been recorded."],
    },
    context: { primaryClaimTypes: ["property-damage"], stage: "defence-filed" },
    expect: [
      "Claim type recorded: property-damage.",
      "Stage recorded: defence-filed.",
      "In the file:",
      "Still to record:",
    ],
    reject: [".."],
  },
  {
    name: "empty in, neutral fixed string out (never prose)",
    parts: { caseFileRecorded: [], caseFileNotRecorded: [] },
    context: { primaryClaimTypes: ["debt"], stage: "pre-filing" },
    expect: ["No case-file details have been recorded yet."],
    reject: ["Recorded under", "In the file"],
  },
  {
    name: "missing arrays entirely (model returned neither key)",
    parts: {},
    context: { primaryClaimTypes: [], stage: "" },
    expect: ["No case-file details have been recorded yet."],
    reject: ["undefined", "In the file"],
  },
  {
    name: "recorded only — outstanding line still resolves cleanly (structured)",
    parts: { caseFileRecorded: ["A signed lease is in the file."], caseFileNotRecorded: [] },
    context: { primaryClaimTypes: ["debt"], stage: "pre-filing" },
    expect: ["Nothing is outstanding on the items reviewed."],
    reject: ["Still to record:", ".."],
  },
];

function main(): void {
  let failures = 0;

  for (const c of CASES) {
    const shape: "plain" | "structured" =
      c.name.includes("structured") || c.expect.some((e) => e.startsWith("Claim type recorded"))
        ? "structured"
        : "plain";

    const out = composeCaseFileSummary(c.parts, c.context, shape);
    const problems: string[] = [];

    for (const needle of c.expect) {
      if (!out.includes(needle)) problems.push(`missing expected: ${JSON.stringify(needle)}`);
    }
    for (const needle of c.reject) {
      if (out.includes(needle)) problems.push(`contains rejected: ${JSON.stringify(needle)}`);
    }
    for (const word of VERDICT_WORDS) {
      if (out.toLowerCase().includes(word)) problems.push(`verdict word leaked through: "${word}"`);
    }

    if (problems.length) {
      failures += 1;
      console.log(`FAIL  [${shape}] ${c.name}`);
      console.log(`      output: ${JSON.stringify(out)}`);
      for (const p of problems) console.log(`      - ${p}`);
    } else {
      console.log(`pass  [${shape}] ${c.name}`);
      console.log(`      ${out}`);
    }
  }

  console.log(`\n${CASES.length - failures}/${CASES.length} passed.`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
