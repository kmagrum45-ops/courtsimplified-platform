/**
 * THE AI RESEARCH IS TOLD THE CASE FILE'S KIND OF CLAIM, IN ALL THREE COURTS (site owner, 31 Oct,
 * Chrome check item 4; rule 8: every AI call gets its case context from the case file through one
 * shared builder, src/lib/case-system/caseFile/aiCaseContext.ts).
 *
 * On the preview, a Small Claims case with "A moving company broke my dining table in May. Their
 * truck was parked outside. I have photos." and the kind confirmed as "Property damage" showed the
 * Highway Traffic Act under "The law behind this". That card comes from the analysis's AI research
 * (retrieval/researchStory.ts, retrieval/storyRetrieval.ts queryPrompt), which was given the story and
 * nothing of the kind the person confirmed: "Property damage" is a dispute category with no catalogue
 * claim-type id, so kindForAnalysis gave nothing and nothing about the kind reached the analysis.
 *
 * WHAT IT CHECKS
 *   1. The shared builder (researchCaseContext) reads the kind from the case file: a Small Claims
 *      dispute category in its WORDS (with no catalogue id), the civil and Family issues picked in
 *      words, a site suggestion only as a suggestion, a kind turned down never at all.
 *   2. The research prompt (queryPrompt, used by both the research step and plain retrieval) carries
 *      those words in each court, marks a suggestion as one, and never names a kind turned down.
 *   3. The analysis passes the context to the research (retrievalInputOf), each analyze route accepts
 *      it and refuses a malformed one, each court's adapter hands it to the analysis, and each screen
 *      that starts an analysis builds it from the case file through the shared builder.
 * NO legal wording and NO applicability rule is checked or added here: the research is only TOLD.
 *
 * WHAT FAILURE IT CATCHES: the confirmed kind dropped on its way to the research on any route (the
 * research reading the story alone again); a removed kind fed back as known; a suggestion sent as if
 * the person had confirmed it; a second builder of case context beside aiCaseContext.ts.
 *
 * Deterministic: no model, no network, no database.
 */
import { readFileSync } from "node:fs";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FLOW = "00000000-0000-4000-8000-0000000000d1";
const REVISION = "00000000-0000-4000-8000-0000000000d2";
const STORY = {
  propertyDamage: "A moving company broke my dining table in May. Their truck was parked outside. I have photos.",
  vehicle: "Another driver rear-ended my car at a red light in May. The repair cost $4,800 and their insurer refused to pay.",
  family: "We separated in May 2026 and cannot agree on dividing the house. It is in both names.",
  civil: "A supplier never delivered the machine I ordered in April. I paid a $9,000 deposit.",
};
type Area = "small-claims" | "civil" | "family";
const checkpointOf = (court: Area, story: string, sections: Record<string, unknown>): Checkpoint =>
  ({ version: 1, flowId: FLOW, courtPath: court, revision: REVISION, sections: { story: { text: story, location: { city: "Kingston", province: "Ontario" } }, ...sections } }) as unknown as Checkpoint;

async function main() {
  const { caseFileOf, claimKindOf } = await import("../../src/lib/case-system/caseFile/caseFile");
  const aiCaseContext = (await import("../../src/lib/case-system/caseFile/aiCaseContext")) as Record<string, unknown>;
  const { queryPrompt } = await import("../../src/lib/case-system/retrieval/storyRetrieval");
  const { CLAIM_TYPES } = await import("../../src/lib/case-system/intake/claimTypes");

  const build = aiCaseContext.researchCaseContext as ((file: ReturnType<typeof caseFileOf>) => Record<string, unknown>) | undefined;
  check("the shared builder aiCaseContext.ts has researchCaseContext (the research's case context, from the case file)", typeof build === "function");
  const contextOf = (checkpoint: Checkpoint) => (build ? build(caseFileOf(checkpoint)) : undefined);
  const promptFor = (court: Area, story: string, context: unknown) =>
    queryPrompt({ story, courtPath: court, side: "plaintiff", ...(context ? { caseContext: context } : {}) } as Parameters<typeof queryPrompt>[0]);

  // 1-2. Each court: the kind the person gave, in words, reaches the research prompt.
  const cases: { name: string; court: Area; story: string; sections: Record<string, unknown>; words: RegExp }[] = [
    { name: "Small Claims, \"Property damage\" (no catalogue id)", court: "small-claims", story: STORY.propertyDamage, sections: { builder: { initialAnswers: { "sc-orient-dispute-category": "Property damage" } } }, words: /Property damage/ },
    { name: "Small Claims, \"A vehicle-related dispute\"", court: "small-claims", story: STORY.vehicle, sections: { builder: { initialAnswers: { "sc-orient-dispute-category": "A vehicle-related dispute" } } }, words: /A vehicle-related dispute/ },
    { name: "Family, issues \"Dividing property\"", court: "family", story: STORY.family, sections: { family: { issues: ["property-division"] } }, words: /Dividing property/i },
    { name: "civil, issues \"Contract / agreement dispute\"", court: "civil", story: STORY.civil, sections: { civil: { input: { issues: ["contract"] } } }, words: /Contract \/ agreement dispute/i },
  ];
  for (const item of cases) {
    const checkpoint = checkpointOf(item.court, item.story, item.sections);
    const held = claimKindOf(caseFileOf(checkpoint));
    check(`${item.name}: the case file holds it as the person's (precondition)`, held.state === "answered" && Boolean(held.source), JSON.stringify(held));
    const context = contextOf(checkpoint);
    const prompt = promptFor(item.court, item.story, context);
    check(`${item.name}: the research prompt carries the kind in words`, item.words.test(prompt), prompt);
    check(`${item.name}: the research prompt still carries the story`, prompt.includes(item.story), prompt);
    check(`${item.name}: the kind is sent as the person's, not as a suggestion`, !/suggest/i.test(prompt), prompt);
  }
  const propertyHeld = claimKindOf(caseFileOf(checkpointOf("small-claims", STORY.propertyDamage, cases[0].sections)));
  check("\"Property damage\" maps to no catalogue claim-type id (why the analysis got nothing before)", propertyHeld.claimTypeId === null, String(propertyHeld.claimTypeId));

  // A suggestion waiting for the person's answer: marked as a suggestion; a kind turned down never sent.
  const nameOf = (id: string) => CLAIM_TYPES.find((claimType) => claimType.id === id)?.name ?? id;
  const pendingId = "sc-claim-unpaid-debt-services";
  const removedId = "sc-claim-defamation-libel-slander";
  const pending = checkpointOf("small-claims", STORY.propertyDamage, { guided: { pendingSuggestion: { claimTypeId: pendingId, claimTypeName: "x", quote: null }, rejectedSuggestionIds: [removedId] } });
  const pendingContext = contextOf(pending);
  const pendingPrompt = promptFor("small-claims", STORY.propertyDamage, pendingContext);
  check("an open suggestion reaches the research, in words", pendingPrompt.includes(nameOf(pendingId)), pendingPrompt);
  const suggestionLine = pendingPrompt.split("\n").find((line) => line.includes(nameOf(pendingId))) ?? "";
  check("an open suggestion is marked as a suggestion the person has not confirmed", /suggest/i.test(suggestionLine) && /not confirmed/i.test(suggestionLine), suggestionLine);
  check("a kind the person turned down is never sent to the research", !pendingPrompt.includes(nameOf(removedId)) && !JSON.stringify(pendingContext ?? {}).includes(removedId), pendingPrompt);
  // A proposal the person turned down (the guided match they said "Not quite" to) is not offered either.
  const turnedDown = checkpointOf("small-claims", STORY.propertyDamage, { guided: { matchedClaimType: { claimTypeId: removedId, userConfirmed: false, quote: null }, rejectedSuggestionIds: [removedId] } });
  const turnedDownPrompt = promptFor("small-claims", STORY.propertyDamage, contextOf(turnedDown));
  check("a proposal the person turned down is never sent to the research", !turnedDownPrompt.includes(nameOf(removedId)), turnedDownPrompt);
  // A held kind: no suggestion beside it.
  const heldWithPending = checkpointOf("small-claims", STORY.propertyDamage, { builder: { initialAnswers: { "sc-orient-dispute-category": "Property damage" } }, guided: { pendingSuggestion: { claimTypeId: pendingId, claimTypeName: "x", quote: null } } });
  const heldPrompt = promptFor("small-claims", STORY.propertyDamage, contextOf(heldWithPending));
  check("with a kind held, no suggestion is sent beside it", /Property damage/.test(heldPrompt) && !heldPrompt.includes(nameOf(pendingId)), heldPrompt);
  // Nothing held: no kind is sent as the person's (the story's own proposal, if any, only as a suggestion).
  const nothing = contextOf(checkpointOf("small-claims", STORY.propertyDamage, {}));
  const nothingPrompt = promptFor("small-claims", STORY.propertyDamage, nothing);
  check("nothing held: no kind is sent as the person's (at most a suggestion, marked as one)", nothingPrompt.split("\n").every((line) => !/kind of case/i.test(line) || /suggest/i.test(line)), nothingPrompt);

  // 3a. The analysis hands the context to the research.
  const brain = (await import("../../src/lib/case-system/intelligence/courtSimplifiedBrain")) as Record<string, unknown>;
  const retrievalInputOf = brain.retrievalInputOf as ((input: Record<string, unknown>) => Record<string, unknown>) | undefined;
  check("the analysis builds the research input in one place (retrievalInputOf)", typeof retrievalInputOf === "function");
  const context = contextOf(checkpointOf("small-claims", STORY.propertyDamage, cases[0].sections));
  const retrievalInput = retrievalInputOf?.({ courtPath: "small-claims", province: "Ontario", stage: "starting-case", rawUserText: STORY.propertyDamage, sourceType: "user-intake", caseContext: context });
  check("the research input carries the case context the analysis was given", Boolean(retrievalInput && JSON.stringify(retrievalInput.caseContext) === JSON.stringify(context) && context), JSON.stringify(retrievalInput));

  // 3b. Each analyze route accepts the context and refuses a malformed one.
  const { isSmallClaimsInput } = await import("../../app/api/small-claims/analyze/route");
  const { isCivilInput } = await import("../../app/api/civil/analyze/route");
  const { isFamilyInput } = await import("../../app/api/family/analyze/route");
  const scFields = ["caseStage", "yourName", "yourAddress", "yourCity", "yourProvince", "yourPostalCode", "yourPhone", "yourEmail", "otherParty", "otherPartyPhone", "otherPartyEmail", "yourRole", "courtLocation", "claimNumber", "amountClaimed", "defendantAddress", "agreementDetails", "paymentHistory", "damagesBreakdown", "serviceDetails", "deadlineDetails", "facts", "timeline", "evidence", "missingEvidence", "settlementEfforts", "defenceResponse", "goal", "urgent"];
  const scInput = { ...Object.fromEntries(scFields.map((field) => [field, ""])), caseStage: "starting-case", facts: STORY.propertyDamage, issues: [], filedDocuments: [], uploadedEvidenceFiles: [] };
  const civilFields = ["caseStage", "issues", "documents", "uploadedEvidenceFiles", "yourName", "otherParty", "yourRole", "courtLocation", "courtFileNumber", "amountClaimed", "limitationDeadline", "facts", "timeline", "evidence", "missingEvidence", "damagesBreakdown", "legalRemedy", "settlementEfforts", "serviceDetails", "urgent", "humanRightsGrounds", "discriminationFacts", "accommodationRequests", "governmentActor", "publicDecisionOrConduct", "institutionalFacts", "privacyRecordsFacts"];
  const civilInput = { ...Object.fromEntries(civilFields.map((field) => [field, ""])), caseStage: "starting-case", yourRole: "not-sure", issues: ["contract"], documents: [], uploadedEvidenceFiles: [], facts: STORY.civil };
  const familyInput = { caseStage: "starting-case", issues: ["Dividing property"], facts: STORY.family };
  const good = { kind: { words: "Property damage", source: "person-said" } };
  const bad = [{ kind: { words: "x".repeat(5000), source: "person-said" } }, { kind: { words: "x", source: "the-model" } }, { other: "x" }, "Property damage"];
  for (const [name, accepts, input] of [["Small Claims", isSmallClaimsInput, scInput], ["civil", isCivilInput, civilInput], ["Family", isFamilyInput, familyInput]] as const) {
    const accept = accepts as (value: unknown) => boolean;
    check(`${name} analyze route: an input without the context is still accepted (precondition)`, accept(input));
    check(`${name} analyze route: accepts the case context`, accept({ ...input, caseContext: good }));
    check(`${name} analyze route: refuses a malformed case context`, bad.every((value) => !accept({ ...input, caseContext: value })));
  }

  // 3c. Each court's adapter hands the context to the analysis; each screen builds it from the case file.
  const adapters: [string, string, RegExp][] = [
    ["Small Claims", "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts", /runCourtSimplifiedBrain\(\{[\s\S]*?caseContext[\s\S]*?\}\);/],
    ["civil", "src/lib/case-system/orchestration/civilIntakeCanonicalAdapter.ts", /runCourtSimplifiedBrain\(\{[\s\S]*?caseContext[\s\S]*?\}\);/],
    ["Family", "src/lib/case-system/orchestration/familyIntakeCanonicalAdapter.ts", /runCourtSimplifiedBrain\(\{[\s\S]*?caseContext[\s\S]*?\}\);/],
  ];
  for (const [name, file, pattern] of adapters) check(`${name}: the adapter passes the case context to the analysis`, pattern.test(strip(readFileSync(file, "utf8"))), file);
  const screens: [string, string][] = [
    ["Small Claims guided route (builder page)", "app/builder/page.tsx"],
    ["Small Claims form / review route", "app/builder/_components/SmallClaimsIntake.tsx"],
    ["civil", "app/builder/_components/CivilIntake.tsx"],
    ["Family", "app/builder/_components/FamilyIntake.tsx"],
  ];
  for (const [name, file] of screens) {
    const source = strip(readFileSync(file, "utf8"));
    // The context is the shared builder's, given a case file (caseFileOf directly, or a value that holds one).
    const call = /caseContext:\s*researchCaseContext\(\s*([^)]*)\)/.exec(source);
    const argument = call?.[1].trim() ?? "";
    const fromCaseFile = /^caseFileOf\(/.test(argument) || new RegExp(`(?:const|let)\\s+${argument.replace(/[^\w]/g, "") || "__none__"}\\s*=\\s*[^;]*caseFileOf\\(`).test(source);
    check(`${name}: the analysis request's case context is built from the case file by the shared builder`, Boolean(call) && fromCaseFile, call?.[0] ?? file);
  }

  if (failures) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll research case-context checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
