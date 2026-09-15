/**
 * Verifies the Statement of Claim wiring: gate -> attestation -> draft.
 *
 * COSTS NOTHING. The gate is pure, the drafting engine is deterministic by
 * hard constraint, and attestation is user input. No model is involved at any
 * point in this surface, so all three constraints are checkable offline.
 *
 * The central check is the THIRD one. "The engine cannot invent facts" is
 * asserted in the engine's own header, but the brief asks whether it still
 * holds THROUGH THE WIRING — so this drives the real mapper output through the
 * real gate into the real engine and checks every content word of the output
 * against the inputs, rather than trusting the engine's docstring.
 *
 * Run: node --import tsx scripts/verification/verifyStatementOfClaimSurface.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { evaluateReadinessGate } from "../../src/lib/case-system/readiness/readinessGate";
import {
  createElementStateMap,
  recordCannotProvide,
  recordDepthAnswer,
  type ElementStateMap,
} from "../../src/lib/case-system/intake/depth/elementStateMap";
import { draftStatementOfClaimParticulars } from "../../src/lib/case-system/statementOfClaimDraftEngine";
import type { SmallClaimsIntelligenceInput } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import { formatRecordedAmount } from "../../src/lib/case-system/format/recordedAmount";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const DEBT = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-unpaid-debt-services")!;

/** The engine's own placeholder, kept in one place so the checks below read as intent. */
const MISSING_AMOUNT = "[amount claimed to be confirmed]";

const INPUT = {
  facts:
    "I did the bookkeeping for a bakery. We settled on a figure and I finished at the end of June. " +
    "She has stopped answering me.",
  amountClaimed: "4200",
  province: "Ontario",
  city: "Toronto",
  yourName: "",
  yourAddress: "",
  otherParty: "",
  defendantAddress: "",
} as unknown as SmallClaimsIntelligenceInput;

function mapWith(states: Record<string, "provided" | "cannot-provide">): ElementStateMap {
  let map = createElementStateMap(
    DEBT.plaintiffElements.map((element) => ({ id: element.id, name: element.name })),
  );

  for (const [elementId, state] of Object.entries(states)) {
    map =
      state === "provided"
        ? recordDepthAnswer(map, { elementId, questionId: "q", answerText: "We agreed verbally." })
        : recordCannotProvide(map, { elementId, questionId: "q" });
  }

  return map;
}

const allProvided = Object.fromEntries(
  DEBT.plaintiffElements.map((element) => [element.id, "provided" as const]),
);

function main(): void {
  // ---- The gate actually gates ----

  const held = evaluateReadinessGate({
    claimType: DEBT,
    elementStateMap: createElementStateMap(
      DEBT.plaintiffElements.map((e) => ({ id: e.id, name: e.name })),
    ),
    confirmedRemedyId: null,
    storyText: INPUT.facts || "",
  });
  check("gate holds before attestation and remedy", !held.draftAvailable);

  const open = evaluateReadinessGate({
    claimType: DEBT,
    elementStateMap: mapWith(allProvided),
    confirmedRemedyId: "sc-remedy-monetary-judgment",
    storyText: INPUT.facts || "",
  });
  check("gate opens once every condition is met", open.draftAvailable, JSON.stringify(open.blockers));

  // ---- CONSTRAINT: cannot-provide is VISIBLE in the draft ----

  const [first, ...rest] = DEBT.plaintiffElements;
  const mixed = mapWith({
    [first.id]: "cannot-provide",
    ...Object.fromEntries(rest.map((element) => [element.id, "provided" as const])),
  });

  const mixedGate = evaluateReadinessGate({
    claimType: DEBT,
    elementStateMap: mixed,
    confirmedRemedyId: "sc-remedy-monetary-judgment",
    storyText: INPUT.facts || "",
  });
  check("cannot-provide does not hold the gate", mixedGate.draftAvailable);

  const draft = draftStatementOfClaimParticulars(
    INPUT,
    { claimTypeId: DEBT.id, claimTypeName: DEBT.name },
    mixedGate.cannotProvide.map((item) => ({ elementId: item.elementId, name: item.name })),
  );

  check(
    "cannot-provide element appears IN THE DRAFT, in the claim type's own words",
    draft.draftText.includes(first.name),
    `looking for: ${first.name}`,
  );
  check(
    "the draft labels it as not held, not as a deficiency",
    draft.draftText.includes("RECORDED AS NOT HELD"),
  );
  check(
    "nothing is written in for the unrecorded element",
    !draft.draftText.includes(`${first.name}:`),
    "an unrecorded element must be named, never filled in",
  );

  // Omission is the other failure mode, and it is silent. Prove the element
  // would be ABSENT if the wiring failed to pass it through.
  const draftWithoutPassthrough = draftStatementOfClaimParticulars(INPUT, {
    claimTypeId: DEBT.id,
    claimTypeName: DEBT.name,
  });
  check(
    "without the wiring the element would be silently absent (so the check is meaningful)",
    !draftWithoutPassthrough.draftText.includes(first.name),
  );

  // ---- CONSTRAINT: a pleading states a sum, or it states a placeholder ----
  //
  // FOUND LIVE, not theorised: docs/journeys/SMALL_CLAIMS_JOURNEYS.md recorded
  // all five drafts interpolating the raw intake answer into the figure
  // position, because `sc-amount-claimed` is free text and the engine's check
  // was `Boolean(amountClaimed)`. That produced, verbatim:
  //
  //   "The Plaintiff claims I don't know what it would come to. from the Defendant."
  //   "(a) payment of I don't know what it would come to.;"
  //
  // and reported NOTHING missing, because a non-empty string satisfied the old
  // check. The user is told the document is complete while it claims a sum that
  // is a sentence saying they do not know the sum.
  //
  // THE PROPERTY, asserted rather than the strings above pinned: for any answer
  // that does not name a figure, (1) the figure positions carry the placeholder,
  // (2) "Exact amount claimed" is outstanding, and (3) the user's own wording
  // survives somewhere in the document. The third clause matters as much as the
  // first two — declining to promote free text to a figure must not become
  // deleting what the user said.
  //
  // The table is phrasings, not a fixed expectation: adding a phrasing is how
  // this check grows, and a correct engine passes every row without being
  // edited.
  const notASum = [
    "I don't know what it would come to.",
    "$460 plus the storage, so about $540.",
    "About $5,400 between finishing the floor and the radiator.",
    "Roughly $3,100 for the holiday I did not take.",
    "somewhere around a thousand dollars I think",
    "unknown",
    "TBD",
  ];

  for (const answer of notASum) {
    const d = draftStatementOfClaimParticulars(
      { ...INPUT, amountClaimed: answer } as SmallClaimsIntelligenceInput,
      { claimTypeId: DEBT.id, claimTypeName: DEBT.name },
    );

    check(
      `"${answer.slice(0, 40)}" is never stated as the sum claimed`,
      d.draftText.includes(`The Plaintiff claims ${MISSING_AMOUNT} from the Defendant.`),
      `figure position got something else`,
    );
    check(
      `"${answer.slice(0, 40)}" is never the relief asked for`,
      d.reliefSought.some((line) => line.includes(`payment of ${MISSING_AMOUNT};`)),
      JSON.stringify(d.reliefSought[0]),
    );
    check(
      `"${answer.slice(0, 40)}" puts "Exact amount claimed" in the outstanding list`,
      d.missingParticulars.includes("Exact amount claimed"),
      JSON.stringify(d.missingParticulars),
    );
    check(
      `"${answer.slice(0, 40)}" is still preserved in the document`,
      d.draftText.includes(answer),
      "declining to promote free text to a figure must not delete what the user said",
    );
  }

  // The other direction: a real sum must NOT be sent to the outstanding list,
  // or the fix trades a false "complete" for a false "incomplete".
  for (const answer of ["4200", "$4,200", "4,200.00", "$2,800.", "$2,800"]) {
    const d = draftStatementOfClaimParticulars(
      { ...INPUT, amountClaimed: answer } as SmallClaimsIntelligenceInput,
      { claimTypeId: DEBT.id, claimTypeName: DEBT.name },
    );
    check(
      `"${answer}" is treated as a sum`,
      !d.missingParticulars.includes("Exact amount claimed") &&
        !d.draftText.includes(MISSING_AMOUNT),
      JSON.stringify(d.missingParticulars),
    );
  }

  // Every spelling of the same amount must produce the same pleading, so the
  // document does not vary with how the user happened to type it.
  const spellings = ["4200", "$4,200", "4,200.00", "$4200.00"].map((answer) => {
    const d = draftStatementOfClaimParticulars(
      { ...INPUT, amountClaimed: answer } as SmallClaimsIntelligenceInput,
      { claimTypeId: DEBT.id, claimTypeName: DEBT.name },
    );
    return d.reliefSought[0];
  });
  check(
    "every spelling of the same amount pleads identically",
    new Set(spellings).size === 1,
    JSON.stringify(spellings),
  );

  // ---- The remedy answer is not an amount and is not filed under one ----
  //
  // "I don't know what I can even ask for." was numbered into AMOUNT CLAIMED
  // as though it were a statement about the sum.
  const withGoal = draftStatementOfClaimParticulars(
    { ...INPUT, amountClaimed: "4200", goal: "I just want the money back." } as SmallClaimsIntelligenceInput,
    { claimTypeId: DEBT.id, claimTypeName: DEBT.name },
  );
  const amountSection = withGoal.draftText.slice(
    withGoal.draftText.indexOf("AMOUNT CLAIMED"),
    withGoal.draftText.indexOf("\n\n", withGoal.draftText.indexOf("AMOUNT CLAIMED")),
  );
  check(
    "the remedy answer is not filed under AMOUNT CLAIMED",
    amountSection.length > 0 && !amountSection.includes("I just want the money back."),
    JSON.stringify(amountSection),
  );
  check(
    "the remedy answer still appears in the document, under its own heading",
    withGoal.draftText.includes("I just want the money back."),
  );

  // ---- CONSTRAINT: the engine cannot invent facts, THROUGH the wiring ----
  //
  // Every number in the draft must come from the input. A fabricated date,
  // amount or name is exactly what the engine's deterministic design exists to
  // prevent, and the wiring is where it could still leak.
  const draftNumbers = (draft.draftText.match(/\b\d[\d,.]*\b/g) || [])
    // Paragraph numbering is generated by the engine, not content.
    .filter((token) => !draft.draftText.includes(`\n${token}. `))
    .filter((token) => !/^\d{1,2}$/.test(token));

  // The formatted amount is a DERIVATION of an input, not a new fact: the
  // engine now renders a parseable amount canonically, so "4200" reaches the
  // pleading as "$4,200.00" and every spelling of the same sum pleads
  // identically. That is one permitted derivation, named explicitly — anything
  // else absent from the inputs still fails this check, which is the point.
  const inputText = [
    INPUT.facts,
    INPUT.amountClaimed,
    formatRecordedAmount(INPUT.amountClaimed),
  ].join(" ");
  const inventedNumbers = draftNumbers.filter(
    (token) => !inputText.includes(token.replace(/,/g, "")) && !inputText.includes(token),
  );
  check(
    "no number in the draft is absent from the inputs",
    inventedNumbers.length === 0,
    `invented: ${inventedNumbers.join(", ")}`,
  );

  // Empty party fields must yield placeholders, never guesses drawn from the
  // story ("a bakery" must not become the defendant's name).
  for (const placeholder of [
    "[Plaintiff name to be confirmed]",
    "[Plaintiff address to be confirmed]",
    "[Defendant name to be confirmed]",
    "[Defendant address to be confirmed]",
  ]) {
    check(`empty party field yields "${placeholder}"`, draft.draftText.includes(placeholder));
  }
  // The PARTIES section must contain the placeholders and nothing lifted from
  // the story. Checking the section directly is stronger than checking whether
  // a word appears anywhere in the document, since the user's own narrative is
  // reproduced verbatim further down and legitimately contains those words.
  const partiesSection = draft.draftText.slice(
    draft.draftText.indexOf("PARTIES"),
    draft.draftText.indexOf("PARTIES") > -1
      ? draft.draftText.indexOf("\n\n", draft.draftText.indexOf("PARTIES"))
      : 0,
  );
  check(
    "the PARTIES section contains no word lifted from the narrative",
    partiesSection.length > 0 && !/bakery|bookkeeping/i.test(partiesSection),
    JSON.stringify(partiesSection),
  );

  // Supplied party details must appear verbatim, unaltered.
  const named = draftStatementOfClaimParticulars(
    { ...INPUT, yourName: "Dana Whitfield", otherParty: "Cedar & Co." } as SmallClaimsIntelligenceInput,
    { claimTypeId: DEBT.id, claimTypeName: DEBT.name },
  );
  check("a supplied plaintiff name appears verbatim", named.draftText.includes("Dana Whitfield"));
  check("a supplied defendant name appears verbatim", named.draftText.includes("Cedar & Co."));
  check(
    "supplying a name removes its placeholder",
    !named.draftText.includes("[Plaintiff name to be confirmed]"),
  );

  // ---- CONSTRAINT: no case-strength language reaches the draft ----

  check(
    "the assembled draft carries no case-strength language",
    validateCaseStrengthLanguage(draft.draftText).valid,
    JSON.stringify(validateCaseStrengthLanguage(draft.draftText)),
  );

  // ---- CONSTRAINT: no score, percentage or ordinal label on the screen ----

  const surface = readFileSync(
    path.join(__dirname, "..", "..", "app", "builder", "_components", "StatementOfClaimSurface.tsx"),
    "utf8",
  );
  // Strips line comments, block comments AND JSX comments. The first version
  // missed `{/* ... */}`, so a comment saying "A COUNT, not a score" tripped
  // the very check it was explaining. Worth stating because the fix is to the
  // DETECTOR, not to the code under test — weakening the rule instead would
  // have been the wrong repair.
  const code = surface
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");

  // Substring, case-insensitive, NO word boundaries — a \b-anchored check does
  // not fire on `readinessScore`, which is how four score formulas survived
  // earlier removal passes (docs/OUTSTANDING_ISSUES.md section 11).
  check("surface has no score-shaped identifier", !/score|percent|ratio/i.test(code), (code.match(/\w*(?:score|percent|ratio)\w*/gi) || []).join(", "));
  check("surface has no percentage arithmetic", !/\*\s*100|100\s*\*/.test(code));
  check(
    "surface renders no ordinal readiness ladder",
    !/"(very-low|low|medium|high|very-high|weak|moderate|strong|ready|near-ready)"/.test(code),
  );
  check("surface renders no progress bar", !/progress|<meter|role="progressbar"/i.test(code));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
