import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  buildProductionReadyLegalKnowledge,
  type ProductionAuthorityCandidate,
  retrieveProductionReadyAuthorities,
} from "../../src/lib/case-system/authority-intelligence/authorityRetrievalEngine";
import { VERIFIED_AUTHORITY_SEED_ENTRIES } from "../../src/lib/case-system/authority-intelligence/verifiedAuthoritySeedRegistry";
import { runCourtSimplifiedBrain } from "../../src/lib/case-system/intelligence/courtSimplifiedBrain";

const NOW = new Date("2026-08-06T00:00:00.000Z");

export function syntheticAuthority(
  patch: Partial<ProductionAuthorityCandidate> = {},
): ProductionAuthorityCandidate {
  return {
    id: "authority_test_complete",
    version: "1.0.0",
    kind: "case-law",
    displayMode: "collapsed",
    verificationStatus: "verified",
    userRiskLevel: "safe-summary",
    title: "Synthetic Authority A",
    shortTitle: "Synthetic A",
    citation: "Synthetic Citation 1",
    neutralCitation: "Synthetic 1",
    courtLevel: "supreme-court-of-canada",
    jurisdiction: "Canada",
    year: 2026,
    bindingWeight: "binding",
    importanceScore: 80,
    confidence: "high",
    courtPaths: ["small-claims", "family", "civil"],
    legalDomains: ["defamation"],
    proceduralStages: ["starting-case", "responding", "trial"],
    topicTags: ["synthetic-topic"],
    doctrineTags: ["synthetic-doctrine"],
    ruleReferences: [],
    statuteReferences: [],
    formReferences: [],
    corePrinciple: "Synthetic proposition for software contract testing only.",
    plainLanguageSummary: "Synthetic summary for software testing.",
    legalTestSummary: "Synthetic test structure.",
    howCourtsUseIt: ["Synthetic use."],
    practicalUse: ["Synthetic practical use."],
    commonMistakes: ["Synthetic misuse warning."],
    limitsAndWarnings: ["Synthetic record; not legal content."],
    legalTestElements: [{ id: "synthetic-element", label: "Synthetic element", explanation: "Synthetic explanation.", proofNeeded: ["Synthetic proof"], commonWeaknesses: [], evidenceExamples: [], burdenRelevance: "Synthetic burden." }],
    evidenceImplications: [],
    workflowLinks: [],
    relatedAuthorities: { follows: [], followedBy: [], distinguishes: [], distinguishedBy: [], limits: [], limitedBy: [], overrules: [], overruledBy: [], related: [] },
    annualPracticeLinks: [],
    aiUseRules: { canShowToUser: true, canUseForReasoning: true, canUseForDrafting: true, mustVerifyBeforeCitation: false, mustExplainLimits: true, mustAskContextQuestions: true, prohibitedUses: [] },
    suggestedAiQuestions: [],
    suggestedEvidenceQuestions: [],
    suggestedWorkflowActions: [],
    sourceReferences: [{ id: "synthetic-source", sourceType: "official-court", title: "Synthetic source", citationOrUrlLabel: "Synthetic label", sourceUrl: "https://example.test/authority/a", pinpoint: "para. 1", verifiedAt: "2026-08-01", notes: ["Synthetic only."] }],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    lastVerifiedAt: "2026-08-01T00:00:00.000Z",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: "2027-01-01T00:00:00.000Z",
    ...patch,
  };
}

const context = {
  courtPath: "small-claims" as const,
  jurisdiction: "Ontario" as const,
  stage: "starting-case" as const,
  legalDomains: ["defamation", "negligence"] as const,
};

const officialGuideContext = {
  courtPath: "small-claims" as const,
  jurisdiction: "Ontario" as const,
  stage: "starting-case" as const,
  legalDomains: ["debt"] as const,
};

function ready(entries: ProductionAuthorityCandidate[]) {
  return retrieveProductionReadyAuthorities({
    context: { ...context, legalDomains: [...context.legalDomains] },
    candidateEntries: entries,
    asOf: NOW,
  });
}

function expectExcluded(label: string, entry: ProductionAuthorityCandidate) {
  assert.equal(ready([entry]).authorities.length, 0, `${label} must be excluded`);
}

async function main() {
  const complete = syntheticAuthority();
  assert.deepEqual(ready([complete]).authorities.map((item) => item.id), [complete.id]);

  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const previousNodeEnv = mutableEnvironment.NODE_ENV;
  try {
    mutableEnvironment.NODE_ENV = "production";
    assert.throws(
      () => ready([complete]),
      /Candidate authority injection is unavailable in production/,
      "test-only candidate injection must be unreachable in production",
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnv;
  }

  expectExcluded("missing URL", syntheticAuthority({ sourceReferences: [{ ...complete.sourceReferences[0], sourceUrl: undefined }] }));
  expectExcluded("citation label used as URL", syntheticAuthority({ sourceReferences: [{ ...complete.sourceReferences[0], sourceUrl: undefined, citationOrUrlLabel: "https://example.test/not-a-source-field" }] }));
  expectExcluded("missing pinpoint", syntheticAuthority({ sourceReferences: [{ ...complete.sourceReferences[0], pinpoint: undefined }] }));
  expectExcluded("missing currentness", syntheticAuthority({ lastVerifiedAt: undefined }));
  expectExcluded("invalid currentness", syntheticAuthority({ lastVerifiedAt: "not-a-date" }));
  expectExcluded("future currentness", syntheticAuthority({ lastVerifiedAt: "2026-08-07T00:00:00.000Z" }));
  expectExcluded("wrong jurisdiction", syntheticAuthority({ jurisdiction: "Alberta" }));
  expectExcluded("wrong court path", syntheticAuthority({ courtPaths: ["family"] }));
  expectExcluded("wrong domain", syntheticAuthority({ legalDomains: ["family-parenting"] }));
  expectExcluded("wrong stage", syntheticAuthority({ proceduralStages: ["trial"] }));
  expectExcluded("expired", syntheticAuthority({ effectiveTo: "2026-01-01T00:00:00.000Z" }));
  expectExcluded("invalid effective date", syntheticAuthority({ effectiveFrom: "not-a-date" }));
  expectExcluded("limited", syntheticAuthority({ verificationStatus: "limited-use" }));
  expectExcluded("unsafe display", syntheticAuthority({ displayMode: "do-not-display" }));
  expectExcluded("negative treatment", syntheticAuthority({ relatedAuthorities: { ...complete.relatedAuthorities, overruledBy: ["synthetic-negative-treatment"] } }));
  expectExcluded("superseded", syntheticAuthority({ supersededBy: ["synthetic-successor"] }));

  assert.deepEqual(
    ready([syntheticAuthority({ limitsAndWarnings: ["Apply only when the synthetic conditions are established."] })]).authorities.map((item) => item.id),
    [complete.id],
    "known application limits must be preserved without being treated as negative authority status",
  );

  const duplicate = syntheticAuthority({ id: "authority_test_duplicate" });
  assert.equal(ready([complete, duplicate]).authorities.length, 1, "duplicate propositions must be deduplicated");

  const secondDomain = syntheticAuthority({ id: "authority_test_second_domain", citation: "Synthetic Citation 2", neutralCitation: "Synthetic 2", corePrinciple: "Second synthetic proposition.", legalDomains: ["negligence"], sourceReferences: [{ ...complete.sourceReferences[0], id: "synthetic-source-2", sourceUrl: "https://example.test/authority/b", pinpoint: "para. 2" }] });
  assert.deepEqual(ready([complete, secondDomain]).authorities.map((item) => item.id).sort(), [complete.id, secondDomain.id].sort(), "all active domains must be searched");

  const packet = buildProductionReadyLegalKnowledge({ context: { ...context, legalDomains: [...context.legalDomains] }, candidateEntries: [complete, duplicate, secondDomain], asOf: NOW });
  assert.equal(packet.precedents.length, 2);
  assert.equal(packet.precedents[0].sourceUrl?.startsWith("https://"), true);
  assert.equal(packet.precedents.every((item) => item.citation?.includes("para.")), true);

  const officialGuide = syntheticAuthority({
    id: "authority_test_official_guide",
    kind: "official-guide",
    title: "Synthetic Official Court Guidance",
    shortTitle: "Synthetic Guide",
    citation: "Synthetic Official Court Guidance",
    neutralCitation: undefined,
    courtLevel: "small-claims-court",
    jurisdiction: "Ontario",
    bindingWeight: "procedural-guidance",
    courtPaths: ["small-claims"],
    legalDomains: ["debt"],
    proceduralStages: ["starting-case"],
    corePrinciple: "Synthetic official guidance for software contract testing only.",
    limitsAndWarnings: ["Synthetic guidance is non-binding and not legal advice."],
    aiUseRules: { ...complete.aiUseRules, canUseForDrafting: false, prohibitedUses: ["Do not treat this guidance as a statute, rule, or precedent."] },
    sourceReferences: [{ ...complete.sourceReferences[0], id: "synthetic-official-guide-source", title: "Synthetic Official Court Guidance", sourceUrl: "https://example.test/guidance/small-claims", pinpoint: "synthetic overview" }],
  });
  const officialGuidePacket = buildProductionReadyLegalKnowledge({ context: { ...officialGuideContext, legalDomains: [...officialGuideContext.legalDomains] }, candidateEntries: [officialGuide], asOf: NOW });
  assert.equal(officialGuidePacket.officialGuidance.length, 1, "eligible official guidance must enter the canonical packet");
  assert.equal(officialGuidePacket.statutes.length + officialGuidePacket.proceduralRules.length + officialGuidePacket.precedents.length, 0, "official guidance must not be reclassified as law, a rule, or precedent");
  const guidance = officialGuidePacket.officialGuidance[0];
  assert.equal(guidance.guidanceClassification, "official-guidance");
  assert.equal(guidance.isBinding, false);
  assert.equal(guidance.sourceUrl, officialGuide.sourceReferences[0].sourceUrl);
  assert.equal(guidance.citation?.includes("synthetic overview"), true);
  assert.deepEqual(guidance.useLimits, officialGuide.limitsAndWarnings);
  assert.equal(guidance.canShowToUser, true);
  assert.equal(guidance.canUseForReasoning, true);

  const officialGuideReady = retrieveProductionReadyAuthorities({ context: { ...officialGuideContext, legalDomains: [...officialGuideContext.legalDomains] }, candidateEntries: [officialGuide], asOf: NOW });
  assert.deepEqual(officialGuideReady.authorities.map((item) => item.id), [officialGuide.id]);
  for (const [label, entry] of [
    ["official guide missing URL", syntheticAuthority({ ...officialGuide, sourceReferences: [{ ...officialGuide.sourceReferences[0], sourceUrl: undefined }] })],
    ["official guide missing pinpoint", syntheticAuthority({ ...officialGuide, sourceReferences: [{ ...officialGuide.sourceReferences[0], pinpoint: undefined }] })],
    ["official guide unsafe permissions", syntheticAuthority({ ...officialGuide, aiUseRules: { ...officialGuide.aiUseRules, canUseForReasoning: false } })],
  ] as const) {
    assert.equal(retrieveProductionReadyAuthorities({ context: { ...officialGuideContext, legalDomains: [...officialGuideContext.legalDomains] }, candidateEntries: [entry], asOf: NOW }).authorities.length, 0, `${label} must be excluded`);
  }
  assert.equal(retrieveProductionReadyAuthorities({ context: { ...officialGuideContext, courtPath: "family", legalDomains: [...officialGuideContext.legalDomains] }, candidateEntries: [officialGuide], asOf: NOW }).authorities.length, 0, "Small Claims-only official guidance must be excluded from Family");
  assert.equal(retrieveProductionReadyAuthorities({ context: { ...officialGuideContext, courtPath: "civil", legalDomains: [...officialGuideContext.legalDomains] }, candidateEntries: [officialGuide], asOf: NOW }).authorities.length, 0, "Small Claims-only official guidance must be excluded from Civil");

  const smallClaimsAuthorityContext = {
    courtPath: "small-claims" as const,
    jurisdiction: "Ontario" as const,
    stage: "starting-case" as const,
    legalDomains: ["procedural"] as const,
  };
  const jurisdictionRegulation = VERIFIED_AUTHORITY_SEED_ENTRIES.find((entry) => entry.id === "authority_ontario_small_claims_jurisdiction_oreg_626_00_s1");
  const procedureGuide = VERIFIED_AUTHORITY_SEED_ENTRIES.find((entry) => entry.id === "authority_ontario_small_claims_procedure_guide");
  assert.ok(jurisdictionRegulation, "Ontario Small Claims jurisdiction regulation seed must exist");
  assert.ok(procedureGuide, "Ontario Small Claims procedure guide seed must exist");
  assert.equal(jurisdictionRegulation.bindingWeight, "binding", "regulation must retain binding status");
  assert.equal(jurisdictionRegulation.sourceReferences[1]?.sourceUrl, "https://www.ontario.ca/laws/regulation/r25042");
  assert.equal(jurisdictionRegulation.sourceReferences[1]?.pinpoint, "s. 1; commencement s. 3");

  const realSmallClaimsPacket = buildProductionReadyLegalKnowledge({
    context: { ...smallClaimsAuthorityContext, legalDomains: [...smallClaimsAuthorityContext.legalDomains] },
    candidateEntries: [jurisdictionRegulation, procedureGuide],
    asOf: NOW,
  });
  assert.equal(realSmallClaimsPacket.statutes.length, 1, "binding regulation must reach canonical statutory output");
  assert.equal(realSmallClaimsPacket.officialGuidance.length, 1, "official guide must reach canonical official-guidance output");
  assert.equal(realSmallClaimsPacket.proceduralRules.length + realSmallClaimsPacket.precedents.length, 0, "guide must not become a court rule or precedent");
  const regulation = realSmallClaimsPacket.statutes[0];
  assert.equal(regulation.id, jurisdictionRegulation.id);
  assert.equal(regulation.sourceUrl, "https://www.ontario.ca/laws/regulation/000626");
  assert.equal(regulation.citation?.includes("s. 1"), true);
  assert.equal(regulation.useLimits.includes("Verify the applicable amount, remedy, parties, timing, interest, costs, and facts."), true);
  assert.equal(regulation.doNotUseFor.includes("Do not state that a user is eligible for Ontario Small Claims Court."), true);
  assert.equal(regulation.summary.includes("Confirm monetary jurisdiction"), true);
  assert.equal(regulation.summary.includes("eligible"), false, "regulation must not produce a legal eligibility conclusion");
  const realGuide = realSmallClaimsPacket.officialGuidance[0];
  assert.equal(realGuide.id, procedureGuide.id);
  assert.equal(realGuide.guidanceClassification, "official-guidance");
  assert.equal(realGuide.isBinding, false);
  assert.equal(procedureGuide.bindingWeight, "procedural-guidance", "guide must retain non-binding guidance status");
  assert.equal(realGuide.sourceUrl, "https://www.ontario.ca/document/guide-procedures-small-claims-court");
  assert.equal(realGuide.citation?.includes("overview / forms-and-procedure guidance section"), true);
  assert.equal(realGuide.useLimits.includes("It does not replace the Rules of the Small Claims Court or legal advice."), true);
  assert.equal(realGuide.doNotUseFor.includes("Do not treat this guidance as a statute, court rule, or precedent."), true);

  for (const courtPath of ["family", "civil"] as const) {
    const excluded = retrieveProductionReadyAuthorities({
      context: { ...smallClaimsAuthorityContext, courtPath, legalDomains: [...smallClaimsAuthorityContext.legalDomains] },
      candidateEntries: [jurisdictionRegulation, procedureGuide],
      asOf: NOW,
    });
    assert.equal(excluded.authorities.length, 0, `Ontario Small Claims authorities must be excluded from ${courtPath}`);
  }

  const realSmallClaimsOutput = await runCourtSimplifiedBrain({
    caseId: "authority-real-small-claims",
    courtPath: "small-claims",
    province: "Ontario",
    stage: "starting-case",
    rawUserText: "I need to start an Ontario Small Claims Court claim for an unpaid invoice and need the procedure and official forms.",
    allowExternalCognition: false,
  });
  assert.equal(realSmallClaimsOutput.intelligence.legalKnowledge.statutes.some((item) => item.id === jurisdictionRegulation.id), true, "real binding regulation must reach CourtSimplifiedBrain legal knowledge");
  assert.equal(realSmallClaimsOutput.intelligence.legalKnowledge.officialGuidance.some((item) => item.id === procedureGuide.id && item.isBinding === false), true, "real official guide must reach CourtSimplifiedBrain official guidance as non-binding");
  const realSmallClaimsCanonical = JSON.stringify(realSmallClaimsOutput.masterResultPatch);
  assert.equal(realSmallClaimsCanonical.includes(jurisdictionRegulation.id), true, "real binding regulation must reach canonical master-case assembly");
  assert.equal(realSmallClaimsCanonical.includes(procedureGuide.id), true, "real official guide must reach canonical master-case assembly");

  for (const courtPath of ["family", "civil"] as const) {
    const excludedOutput = await runCourtSimplifiedBrain({
      caseId: `authority-real-${courtPath}`,
      courtPath,
      province: "Ontario",
      stage: "starting-case",
      rawUserText: "I need to start an Ontario Small Claims Court claim for an unpaid invoice and need the procedure and official forms.",
      allowExternalCognition: false,
    });
    const excludedKnowledge = excludedOutput.intelligence.legalKnowledge;
    assert.equal(excludedKnowledge.statutes.some((item) => item.id === jurisdictionRegulation.id), false, `real binding regulation must be excluded from ${courtPath}`);
    assert.equal(excludedKnowledge.officialGuidance.some((item) => item.id === procedureGuide.id), false, `real official guide must be excluded from ${courtPath}`);
    const excludedCanonical = JSON.stringify(excludedOutput.masterResultPatch);
    assert.equal(excludedCanonical.includes(jurisdictionRegulation.id), false, `real binding regulation must not reach ${courtPath} canonical assembly`);
    assert.equal(excludedCanonical.includes(procedureGuide.id), false, `real official guide must not reach ${courtPath} canonical assembly`);
  }

  VERIFIED_AUTHORITY_SEED_ENTRIES.push(officialGuide);
  try {
    const output = await runCourtSimplifiedBrain({ caseId: "authority-official-guide", courtPath: "small-claims", province: "Ontario", stage: "starting-case", rawUserText: "A synthetic unpaid invoice dispute.", allowExternalCognition: false });
    assert.equal(output.intelligence.legalKnowledge.officialGuidance.some((item) => item.id === officialGuide.id), true, "official guidance must reach CourtSimplifiedBrain");
    assert.equal(JSON.stringify(output.masterResultPatch).includes(officialGuide.id), true, "official guidance must reach the canonical master-case assembly path");
  } finally {
    const index = VERIFIED_AUTHORITY_SEED_ENTRIES.findIndex((entry) => entry.id === officialGuide.id);
    if (index >= 0) VERIFIED_AUTHORITY_SEED_ENTRIES.splice(index, 1);
  }

  const excludedPacket = buildProductionReadyLegalKnowledge({ context: { ...context, legalDomains: [...context.legalDomains] }, candidateEntries: [syntheticAuthority({ sourceReferences: [{ ...complete.sourceReferences[0], sourceUrl: undefined }] })], asOf: NOW });
  assert.equal(excludedPacket.precedents.length, 0);
  assert.equal(JSON.stringify(excludedPacket).includes("Synthetic proposition"), false, "excluded authority must not affect packet output");
  assert.ok(excludedPacket.sourceWarnings.some((warning) => warning.includes("No production-ready verified authority")));

  for (const [courtPath, text] of [
    ["small-claims", "A synthetic unclassified dispute."],
    ["family", "A synthetic request about parenting time."],
    ["civil", "A synthetic negligence dispute."],
  ] as const) {
    const output = await runCourtSimplifiedBrain({ caseId: `authority-${courtPath}`, courtPath, province: "Ontario", stage: "starting-case", rawUserText: text, allowExternalCognition: false });
    const knowledge = output.intelligence.legalKnowledge;
    assert.equal(knowledge.statutes.length + knowledge.proceduralRules.length + knowledge.precedents.length + knowledge.officialGuidance.length, 0, `${courtPath}: current seeds must remain excluded`);
    assert.ok(knowledge.sourceWarnings.some((warning) => warning.includes("No production-ready verified authority")));
    const canonical = JSON.stringify(output.masterResultPatch);
    assert.equal(canonical.includes("authority_test_"), false, `${courtPath}: synthetic authority leaked across area boundary`);
    const assembly = output.masterResultPatch.caseSystemAssembly as { legalReasoningReadiness?: { authorityCount?: number } } | undefined;
    assert.equal(assembly?.legalReasoningReadiness?.authorityCount, 0, `${courtPath}: generic authority categories must not be counted as sources`);
  }

  console.log("Authority knowledge bridge verification passed: production readiness, Ontario Small Claims regulation and official-guidance propagation, provenance, existing safety gates, deduplication, canonical exclusion, and three-area isolation.");
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Authority bridge verification failed.");
    process.exitCode = 1;
  });
}
