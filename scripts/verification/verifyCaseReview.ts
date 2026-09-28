/**
 * The case review points at gaps in the user's own record, grounded in their
 * own words, and never grades, advises or invents.
 *
 * COSTS NOTHING. The model is stubbed; the real validator, templates, runner
 * and case-file assembler are exercised.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - an AI finding whose quote is not the user's own text reaches the user
 *     (the model inventing what the user "said");
 *   - a finding kind outside the fixed list, or model prose, reaching the
 *     screen (every shown sentence must come from a fixed template);
 *   - any finding text using grading or law-applying words (CLAUDE.md 2 and 3);
 *   - names or addresses reaching the text sent to the model;
 *   - the review running its AI half with the scope switch off, or failing
 *     closed into an invented result instead of the deterministic findings;
 *   - the Small Claims contents checks firing for a defendant or after filing.
 *
 * Run: node --import tsx scripts/verification/verifyCaseReview.ts
 */

import { pathToFileURL } from "node:url";

import {
  AI_FINDING_KINDS,
  AI_FINDING_TEMPLATES,
  caseFileFromMasterResult,
  caseFileText,
  deterministicFindings,
  type ConfirmedCaseFile,
} from "../../src/lib/case-system/caseReview/caseReview";
import { validateCaseReviewOutput } from "../../src/lib/case-system/caseReview/caseReviewModel";
import { runCaseReview } from "../../src/lib/case-system/caseReview/runCaseReview";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const STORY =
  "I hired a guy off kijiji to redo my basement bathroom. we agreed 4500 for labour and I paid him 2000 up " +
  "front in march. he did about half the work then stopped showing up. I texted him for weeks and he read " +
  "them and didnt answer. I had to hire someone else to finish and they charged me 3200. I want my 2000 " +
  "back and something for the damage but im not sure how much the drywall will cost to fix";

const FILE: ConfirmedCaseFile = {
  courtPath: "small-claims",
  role: "Plaintiff / claimant",
  stage: "starting-case",
  story: STORY,
  yourName: "Dana Whitfield",
  otherParty: "",
  otherPartyAddress: "",
  amountText: "2000 plus what the judge thinks is fare",
  timelineText: "july 15 2026 they stopped working",
  evidenceText: "text messages and the contract",
  goalText: "money",
  confirmedClaimTypeId: "sc-claim-breach-of-contract-services",
  filedDocuments: [],
};

/** Words that grade a case or apply law to facts. None may appear in a finding. */
const FORBIDDEN = /\b(strong|weak|likely|unlikely|win|lose|liable|breach|entitled|negligen\w*|owes?|merit|chance)\b/i;

async function main(): Promise<void> {
  // ---- deterministic ----
  const fixed = deterministicFindings(FILE);
  const kinds = fixed.map((f) => f.kind);
  check("missing other party name is found", kinds.includes("missing-other-party-name"));
  check("missing other party address is found", kinds.includes("missing-other-party-address"));
  check("an amount that is not a figure is found", kinds.includes("amount-not-a-figure"));
  check("a recorded name is not reported missing", !kinds.includes("missing-your-name"));
  check(
    "rule-based findings cite their rule",
    fixed.filter((f) => f.kind.startsWith("missing-") || f.kind === "amount-not-a-figure").every((f) => Boolean(f.source?.sourceUrl)),
  );

  const defendant = deterministicFindings({ ...FILE, role: "Defendant / responding party" }).map((f) => f.kind);
  check("Plaintiff's Claim contents checks do not fire for a defendant", !defendant.includes("missing-other-party-address"));
  const filed = deterministicFindings({ ...FILE, filedDocuments: ["plaintiffs-claim"] }).map((f) => f.kind);
  check("Plaintiff's Claim contents checks do not fire after filing", !filed.includes("missing-other-party-name"));

  // ---- the model sees no names or addresses ----
  const sent = caseFileText({ ...FILE, otherParty: "Ron Kowalski", otherPartyAddress: "12 Elm St" });
  check("names and addresses never reach the model text", !/Dana Whitfield|Ron Kowalski|12 Elm St/.test(sent));

  // ---- AI validator ----
  const kept = validateCaseReviewOutput(
    {
      findings: [
        { kind: "document-mentioned", quotes: ["they charged me 3200"] },
        { kind: "document-mentioned", quotes: ["I have the signed invoice"] }, // not the user's words
        { kind: "date-approximate", quotes: ["up front in march"] },
        { kind: "strength-of-case", quotes: ["I paid him 2000"] }, // kind not allowed
        { kind: "entries-differ", quotes: ["I paid him 2000"] }, // wrong arity
        { kind: "entries-differ", quotes: ["I paid him 2000", "I paid him 2000"] }, // same words
        { kind: "unknown-amount-mentioned", quotes: ["im not sure how much"], note: "you will win" },
        { kind: "document-mentioned", quotes: ["they CHARGED me   3200"] }, // duplicate after normalising
      ],
    },
    FILE,
  );
  const keptKinds = kept.map((f) => `${f.kind}:${f.quotes.join("|")}`);
  check("a grounded document mention is kept", keptKinds.includes("document-mentioned:they charged me 3200"));
  check("a quote that is not the user's own words is dropped", !keptKinds.some((k) => k.includes("signed invoice")));
  check("a kind outside the fixed list is dropped", !kept.some((f) => f.kind === ("strength-of-case" as never)));
  check("a finding with the wrong number of quotes is dropped", !kept.some((f) => f.kind === "entries-differ"));
  check("extra model fields never reach the text", kept.every((f) => !/win/i.test(f.text)));
  check("the same finding is not repeated", kept.filter((f) => f.kind === "document-mentioned").length === 1);
  check("AI-located findings are marked as such", kept.every((f) => f.aiLocated));

  // 2026-09-28, story review battery: a pointer to add what the user already
  // listed as evidence, and an "unknown amount" that quotes a figure.
  const withEvidence: ConfirmedCaseFile = { ...FILE, evidenceText: "the second contractor's invoice and my texts" };
  const pointless = validateCaseReviewOutput(
    { findings: [
      { kind: "document-mentioned", quotes: ["the second contractor's invoice"] },
      { kind: "document-mentioned", quotes: ["they charged me 3200"] },
    ] },
    withEvidence,
  );
  check(
    "a document pointer never quotes the user's own evidence list",
    pointless.length === 1 && pointless[0].quotes[0] === "they charged me 3200",
    JSON.stringify(pointless.map((f) => f.quotes)),
  );
  const figure = validateCaseReviewOutput(
    { findings: [{ kind: "unknown-amount-mentioned", quotes: ["they charged me 3200"] }] },
    FILE,
  );
  check("an amount with a figure in it is never called unknown", figure.length === 0);
  check("garbage model output yields nothing", validateCaseReviewOutput("nonsense", FILE).length === 0);

  // ---- every sentence a user can see ----
  const texts = [...fixed.map((f) => f.text), ...Object.values(AI_FINDING_TEMPLATES)];
  const graded = texts.filter((t) => FORBIDDEN.test(t) || !validateCaseStrengthLanguage(t).valid);
  check("no finding text grades the case or applies the law", graded.length === 0, graded[0]);
  check("every AI kind has a template", AI_FINDING_KINDS.every((k) => typeof AI_FINDING_TEMPLATES[k] === "string"));

  // ---- runner ----
  const withAi = await runCaseReview(FILE, "stub-key", async () => kept);
  check("the runner adds AI findings to the deterministic ones", withAi.aiRan && withAi.findings.length === fixed.length + kept.length);
  const noKey = await runCaseReview(FILE, null, async () => {
    throw new Error("must not be called");
  });
  check("with no model available, only deterministic findings are returned", !noKey.aiRan && noKey.findings.length === fixed.length);
  const failing = await runCaseReview(FILE, "stub-key", async () => {
    throw new Error("model down");
  });
  check("a model failure falls back to the deterministic findings, not an invented result", !failing.aiRan && failing.findings.length === fixed.length);

  // ---- assembler ----
  const assembled = caseFileFromMasterResult(
    {
      intakeData: {
        courtPath: "small-claims",
        caseStage: "starting-case",
        facts: STORY,
        yourName: "",
        otherParty: "",
        timeline: "",
        evidence: "",
        goal: "money",
        extra: { yourRole: "Plaintiff / claimant", amountClaimed: "2000", confirmedClaimTypeId: "sc-claim-breach-of-contract-services", filedDocuments: ["nothing"] },
      },
      courtSimplifiedIntelligence: { summary: "MODEL PROSE" },
    },
    "small-claims",
  );
  check("the assembler reads the user's confirmed claim type", assembled.confirmedClaimTypeId === "sc-claim-breach-of-contract-services");
  check("the assembler never reads stored model output", !JSON.stringify(assembled).includes("MODEL PROSE"));
  check("the assembler tolerates an empty record", caseFileFromMasterResult(null, null).story === "");

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
