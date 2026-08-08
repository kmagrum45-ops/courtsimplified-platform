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

  const courtWideProcedural = syntheticAuthority({
    id: "authority_test_court_wide_procedural",
    legalDomains: ["procedural"],
    appliesAcrossIssueDomains: true,
  });
  assert.deepEqual(
    ready([courtWideProcedural]).authorities.map((item) => item.id),
    [courtWideProcedural.id],
    "explicit court-wide applicability may bypass only issue-domain overlap",
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
  assert.equal(jurisdictionRegulation.appliesAcrossIssueDomains, true, "jurisdiction regulation must explicitly apply across Small Claims issue domains");
  assert.equal(procedureGuide.appliesAcrossIssueDomains, true, "procedure guide must explicitly apply across Small Claims issue domains");
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

  for (const [label, expectedDomain, caseId, rawUserText] of [
    ["unpaid invoice/debt", "debt", "authority-real-small-claims-debt", "I need to start an Ontario Small Claims Court claim for an unpaid invoice and need the procedure and official forms."],
    ["property damage", "property-damage", "authority-real-small-claims-property-damage", "I need to start an Ontario Small Claims Court claim for compensation because my vehicle was damaged and I need the procedure and official forms."],
    ["defamation/reputation compensation", "defamation", "authority-real-small-claims-defamation", "I need to start an Ontario Small Claims Court claim for compensation because false statements damaged my reputation and I need the procedure and official forms."],
  ] as const) {
    const realSmallClaimsOutput = await runCourtSimplifiedBrain({ caseId, courtPath: "small-claims", province: "Ontario", stage: "starting-case", rawUserText, allowExternalCognition: false });
    assert.equal(realSmallClaimsOutput.intelligence.primaryClaimTypes.includes(expectedDomain), true, `${label}: CourtSimplifiedBrain must retain the substantive issue domain`);
    assert.equal(realSmallClaimsOutput.intelligence.legalKnowledge.statutes.some((item) => item.id === jurisdictionRegulation.id), true, `${label}: real binding regulation must reach CourtSimplifiedBrain legal knowledge`);
    assert.equal(realSmallClaimsOutput.intelligence.legalKnowledge.officialGuidance.some((item) => item.id === procedureGuide.id && item.isBinding === false), true, `${label}: real official guide must reach CourtSimplifiedBrain official guidance as non-binding`);
    const realSmallClaimsCanonical = JSON.stringify(realSmallClaimsOutput.masterResultPatch);
    assert.equal(realSmallClaimsCanonical.includes(jurisdictionRegulation.id), true, `${label}: real binding regulation must reach canonical master-case assembly`);
    assert.equal(realSmallClaimsCanonical.includes(procedureGuide.id), true, `${label}: real official guide must reach canonical master-case assembly`);
  }

  for (const pilotAuthority of [jurisdictionRegulation, procedureGuide]) {
    const safetyGatePatches: Array<[string, Partial<ProductionAuthorityCandidate>]> = [
      ["wrong stage", { proceduralStages: ["trial"] }],
      ["wrong jurisdiction", { jurisdiction: "Alberta" }],
      ["future currentness", { lastVerifiedAt: "2026-08-07T00:00:00.000Z" }],
      ["missing HTTPS source URL", { sourceReferences: pilotAuthority.sourceReferences.map((source) => ({ ...source, sourceUrl: undefined })) }],
      ["missing pinpoint", { sourceReferences: pilotAuthority.sourceReferences.map((source) => ({ ...source, pinpoint: undefined })) }],
      ["reasoning permission denied", { aiUseRules: { ...pilotAuthority.aiUseRules, canUseForReasoning: false } }],
    ];
    for (const [label, patch] of safetyGatePatches) {
      const excluded = retrieveProductionReadyAuthorities({
        context: { courtPath: "small-claims", jurisdiction: "Ontario", stage: "starting-case", legalDomains: ["property-damage"] },
        candidateEntries: [{ ...pilotAuthority, ...patch }],
        asOf: NOW,
      });
      assert.equal(excluded.authorities.length, 0, `${pilotAuthority.shortTitle}: court-wide applicability must not bypass ${label}`);
    }
  }

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

  const familyAuthorityContext = {
    courtPath: "family" as const,
    jurisdiction: "Ontario" as const,
    stage: "starting-case" as const,
    legalDomains: ["procedural"] as const,
  };
  const familyLawRules = VERIFIED_AUTHORITY_SEED_ENTRIES.find((entry) => entry.id === "authority_ontario_family_law_rules_oreg_114_99");
  const familyProcedureGuide = VERIFIED_AUTHORITY_SEED_ENTRIES.find((entry) => entry.id === "authority_ontario_family_procedure_guide");
  assert.ok(familyLawRules, "Ontario Family Law Rules seed must exist");
  assert.ok(familyProcedureGuide, "Ontario Family procedure guide seed must exist");
  assert.equal(familyLawRules.appliesAcrossIssueDomains, true, "Family Law Rules must explicitly apply across Ontario Family issue domains after court-path and stage matching");
  assert.equal(familyProcedureGuide.appliesAcrossIssueDomains, true, "Family procedure guide must explicitly apply across Ontario Family issue domains after court-path and stage matching");
  assert.equal(familyLawRules.bindingWeight, "binding", "Family Law Rules must retain binding status");
  assert.equal(familyLawRules.sourceReferences[0]?.sourceUrl, "https://www.ontario.ca/laws/regulation/990114");
  assert.equal(familyLawRules.sourceReferences[0]?.pinpoint, "Family Law Rules; applicable procedure depends on the current stage");

  const realFamilyPacket = buildProductionReadyLegalKnowledge({
    context: { ...familyAuthorityContext, legalDomains: [...familyAuthorityContext.legalDomains] },
    candidateEntries: [familyLawRules, familyProcedureGuide],
    asOf: NOW,
  });
  assert.equal(realFamilyPacket.proceduralRules.length, 1, "binding Family Law Rules must reach canonical procedural-rule output");
  assert.equal(realFamilyPacket.officialGuidance.length, 1, "Family procedure guide must reach canonical official-guidance output");
  assert.equal(realFamilyPacket.statutes.length + realFamilyPacket.precedents.length, 0, "Family pilot sources must not be reclassified as statutes or precedents");
  const familyRule = realFamilyPacket.proceduralRules[0];
  assert.equal(familyRule.id, familyLawRules.id);
  assert.equal(familyRule.sourceUrl, "https://www.ontario.ca/laws/regulation/990114");
  assert.equal(familyRule.citation?.includes("current stage"), true);
  assert.equal(familyRule.useLimits.includes("Do not decide a parenting arrangement, support amount, property result, remedy, or outcome from this record alone."), true);
  const realFamilyGuide = realFamilyPacket.officialGuidance[0];
  assert.equal(realFamilyGuide.id, familyProcedureGuide.id);
  assert.equal(realFamilyGuide.guidanceClassification, "official-guidance");
  assert.equal(realFamilyGuide.isBinding, false);
  assert.equal(familyProcedureGuide.bindingWeight, "procedural-guidance", "Family guide must retain non-binding guidance status");
  assert.equal(realFamilyGuide.sourceUrl, "https://www.ontario.ca/document/guide-procedures-family-court");
  assert.equal(realFamilyGuide.citation?.includes("guide overview / starting-family-case procedure guidance"), true);
  assert.equal(realFamilyGuide.useLimits.includes("It does not replace the Family Law Rules or legal advice."), true);
  assert.equal(realFamilyGuide.doNotUseFor.includes("Do not treat this guidance as a statute, court rule, or precedent."), true);

  for (const courtPath of ["small-claims", "civil"] as const) {
    const excluded = retrieveProductionReadyAuthorities({
      context: { ...familyAuthorityContext, courtPath, legalDomains: [...familyAuthorityContext.legalDomains] },
      candidateEntries: [familyLawRules, familyProcedureGuide],
      asOf: NOW,
    });
    assert.equal(excluded.authorities.length, 0, `Ontario Family authorities must be excluded from ${courtPath}`);
  }

  for (const [label, caseId, rawUserText] of [
    ["parenting", "authority-real-family-parenting", "I need to start an Ontario Family Court case about parenting time and need to understand the procedure and court resources."],
    ["child support", "authority-real-family-support", "I need to start an Ontario Family Court case about child support and need to understand the procedure and court resources."],
    ["property division", "authority-real-family-property", "I need to start an Ontario Family Court case about property division and need to understand the procedure and court resources."],
  ] as const) {
    const realFamilyOutput = await runCourtSimplifiedBrain({ caseId, courtPath: "family", province: "Ontario", stage: "starting-case", rawUserText, allowExternalCognition: false });
    assert.equal(realFamilyOutput.intelligence.legalKnowledge.proceduralRules.some((item) => item.id === familyLawRules.id), true, `${label}: real Family Law Rules must reach CourtSimplifiedBrain legal knowledge`);
    assert.equal(realFamilyOutput.intelligence.legalKnowledge.officialGuidance.some((item) => item.id === familyProcedureGuide.id && item.isBinding === false), true, `${label}: real Family guide must reach CourtSimplifiedBrain official guidance as non-binding`);
    const realFamilyCanonical = JSON.stringify(realFamilyOutput.masterResultPatch);
    assert.equal(realFamilyCanonical.includes(familyLawRules.id), true, `${label}: real Family Law Rules must reach canonical master-case assembly`);
    assert.equal(realFamilyCanonical.includes(familyProcedureGuide.id), true, `${label}: real Family guide must reach canonical master-case assembly`);
  }

  for (const pilotAuthority of [familyLawRules, familyProcedureGuide]) {
    const safetyGatePatches: Array<[string, Partial<ProductionAuthorityCandidate>]> = [
      ["wrong stage", { proceduralStages: ["trial"] }],
      ["wrong jurisdiction", { jurisdiction: "Alberta" }],
      ["future currentness", { lastVerifiedAt: "2026-08-07T00:00:00.000Z" }],
      ["missing HTTPS source URL", { sourceReferences: pilotAuthority.sourceReferences.map((source) => ({ ...source, sourceUrl: undefined })) }],
      ["missing pinpoint", { sourceReferences: pilotAuthority.sourceReferences.map((source) => ({ ...source, pinpoint: undefined })) }],
      ["reasoning permission denied", { aiUseRules: { ...pilotAuthority.aiUseRules, canUseForReasoning: false } }],
    ];
    for (const [label, patch] of safetyGatePatches) {
      const excluded = retrieveProductionReadyAuthorities({
        context: { courtPath: "family", jurisdiction: "Ontario", stage: "starting-case", legalDomains: ["family-parenting"] },
        candidateEntries: [{ ...pilotAuthority, ...patch }],
        asOf: NOW,
      });
      assert.equal(excluded.authorities.length, 0, `${pilotAuthority.shortTitle}: court-wide applicability must not bypass ${label}`);
    }
  }

  for (const courtPath of ["small-claims", "civil"] as const) {
    const excludedOutput = await runCourtSimplifiedBrain({
      caseId: `authority-real-family-${courtPath}`,
      courtPath,
      province: "Ontario",
      stage: "starting-case",
      rawUserText: "I need to start an Ontario Family Court case about parenting time and need to understand the procedure and court resources.",
      allowExternalCognition: false,
    });
    const excludedKnowledge = excludedOutput.intelligence.legalKnowledge;
    assert.equal(excludedKnowledge.proceduralRules.some((item) => item.id === familyLawRules.id), false, `real Family Law Rules must be excluded from ${courtPath}`);
    assert.equal(excludedKnowledge.officialGuidance.some((item) => item.id === familyProcedureGuide.id), false, `real Family guide must be excluded from ${courtPath}`);
    const excludedCanonical = JSON.stringify(excludedOutput.masterResultPatch);
    assert.equal(excludedCanonical.includes(familyLawRules.id), false, `real Family Law Rules must not reach ${courtPath} canonical assembly`);
    assert.equal(excludedCanonical.includes(familyProcedureGuide.id), false, `real Family guide must not reach ${courtPath} canonical assembly`);
  }

  const civilAuthorityContext = {
    courtPath: "civil" as const,
    jurisdiction: "Ontario" as const,
    stage: "starting-case" as const,
    legalDomains: ["procedural"] as const,
  };
  const civilProcedureRules = VERIFIED_AUTHORITY_SEED_ENTRIES.find((entry) => entry.id === "authority_ontario_rules_civil_procedure_rro_1990_reg_194_r_1_02");
  const civilClaimsGuide = VERIFIED_AUTHORITY_SEED_ENTRIES.find((entry) => entry.id === "authority_ontario_civil_claims_suing_and_being_sued_guide");
  assert.ok(civilProcedureRules, "Ontario Civil Rules of Civil Procedure seed must exist");
  assert.ok(civilClaimsGuide, "Ontario Civil claims guide seed must exist");
  assert.equal(civilProcedureRules.appliesAcrossIssueDomains, true, "Rules of Civil Procedure must explicitly apply across Ontario Civil issue domains only after court-path and stage matching");
  assert.equal(civilClaimsGuide.appliesAcrossIssueDomains, true, "Civil claims guide must explicitly apply across Ontario Civil issue domains only after court-path and stage matching");
  assert.equal(civilProcedureRules.bindingWeight, "binding", "Rules of Civil Procedure must retain binding status");
  assert.equal(civilClaimsGuide.bindingWeight, "procedural-guidance", "Civil claims guide must retain non-binding guidance status");
  assert.equal(civilProcedureRules.sourceReferences[0]?.sourceUrl, "https://www.ontario.ca/laws/regulation/900194");
  assert.equal(civilProcedureRules.sourceReferences[0]?.pinpoint, "r. 1.02");
  assert.equal(civilClaimsGuide.sourceReferences[0]?.sourceUrl, "https://www.ontario.ca/page/civil-claims-suing-and-being-sued");
  assert.equal(civilClaimsGuide.sourceReferences[0]?.pinpoint, "general steps for civil cases started by statement of claim");

  const realCivilPacket = buildProductionReadyLegalKnowledge({
    context: { ...civilAuthorityContext, legalDomains: [...civilAuthorityContext.legalDomains] },
    candidateEntries: [civilProcedureRules, civilClaimsGuide],
    asOf: NOW,
  });
  assert.equal(realCivilPacket.proceduralRules.length, 1, "binding Rules of Civil Procedure must reach canonical procedural-rule output");
  assert.equal(realCivilPacket.officialGuidance.length, 1, "Civil claims guide must reach canonical official-guidance output");
  assert.equal(realCivilPacket.statutes.length + realCivilPacket.precedents.length, 0, "Civil pilot sources must not be reclassified as statutes or precedents");
  const civilRule = realCivilPacket.proceduralRules[0];
  assert.equal(civilRule.id, civilProcedureRules.id);
  assert.equal(civilRule.sourceUrl, "https://www.ontario.ca/laws/regulation/900194");
  assert.equal(civilRule.citation?.includes("r. 1.02"), true);
  assert.equal(civilRule.useLimits.includes("Rule 1.02 states that the Rules do not govern proceedings in the Small Claims Court or proceedings to which the Family Law Rules apply, except as the Rules provide."), true);
  const civilGuide = realCivilPacket.officialGuidance[0];
  assert.equal(civilGuide.id, civilClaimsGuide.id);
  assert.equal(civilGuide.guidanceClassification, "official-guidance");
  assert.equal(civilGuide.isBinding, false);
  assert.equal(civilGuide.sourceUrl, "https://www.ontario.ca/page/civil-claims-suing-and-being-sued");
  assert.equal(civilGuide.citation?.includes("general steps for civil cases started by statement of claim"), true);
  assert.equal(civilGuide.useLimits.includes("It does not replace the Rules of Civil Procedure or legal advice."), true);
  assert.equal(civilGuide.doNotUseFor.includes("Do not treat this guidance as a statute, court rule, or precedent."), true);

  for (const courtPath of ["small-claims", "family"] as const) {
    const excluded = retrieveProductionReadyAuthorities({
      context: { ...civilAuthorityContext, courtPath, legalDomains: [...civilAuthorityContext.legalDomains] },
      candidateEntries: [civilProcedureRules, civilClaimsGuide],
      asOf: NOW,
    });
    assert.equal(excluded.authorities.length, 0, `Ontario Civil authorities must be excluded from ${courtPath}`);
  }

  for (const [label, expectedDomain, caseId, rawUserText] of [
    ["negligence", "negligence", "authority-real-civil-negligence", "I need to start an Ontario Superior Court civil claim about an injury caused by negligence and need general procedure information."],
    ["human rights", "civil-human-rights", "authority-real-civil-human-rights", "I need to start an Ontario Superior Court civil claim about discrimination on a human-rights ground and need general procedure information."],
    ["defamation", "defamation", "authority-real-civil-defamation", "I need to start an Ontario Superior Court civil claim about false statements that harmed my reputation and need general procedure information."],
  ] as const) {
    const realCivilOutput = await runCourtSimplifiedBrain({ caseId, courtPath: "civil", province: "Ontario", stage: "starting-case", rawUserText, allowExternalCognition: false });
    assert.equal(realCivilOutput.intelligence.primaryClaimTypes.includes(expectedDomain), true, `${label}: CourtSimplifiedBrain must retain the substantive issue domain`);
    assert.equal(realCivilOutput.intelligence.legalKnowledge.proceduralRules.some((item) => item.id === civilProcedureRules.id), true, `${label}: binding Rules of Civil Procedure must reach CourtSimplifiedBrain legal knowledge`);
    assert.equal(realCivilOutput.intelligence.legalKnowledge.officialGuidance.some((item) => item.id === civilClaimsGuide.id && item.isBinding === false), true, `${label}: Civil claims guide must reach CourtSimplifiedBrain official guidance as non-binding`);
    const realCivilCanonical = JSON.stringify(realCivilOutput.masterResultPatch);
    assert.equal(realCivilCanonical.includes(civilProcedureRules.id), true, `${label}: binding Rules of Civil Procedure must reach canonical master-case assembly`);
    assert.equal(realCivilCanonical.includes(civilClaimsGuide.id), true, `${label}: Civil claims guide must reach canonical master-case assembly`);
  }

  for (const courtPath of ["small-claims", "family"] as const) {
    const excludedOutput = await runCourtSimplifiedBrain({
      caseId: `authority-real-civil-${courtPath}`,
      courtPath,
      province: "Ontario",
      stage: "starting-case",
      rawUserText: "I need to start an Ontario Superior Court civil claim about an injury caused by negligence and need general procedure information.",
      allowExternalCognition: false,
    });
    const excludedKnowledge = excludedOutput.intelligence.legalKnowledge;
    assert.equal(excludedKnowledge.proceduralRules.some((item) => item.id === civilProcedureRules.id), false, `Rules of Civil Procedure must be excluded from ${courtPath}`);
    assert.equal(excludedKnowledge.officialGuidance.some((item) => item.id === civilClaimsGuide.id), false, `Civil claims guide must be excluded from ${courtPath}`);
    const excludedCanonical = JSON.stringify(excludedOutput.masterResultPatch);
    assert.equal(excludedCanonical.includes(civilProcedureRules.id), false, `Rules of Civil Procedure must not reach ${courtPath} canonical assembly`);
    assert.equal(excludedCanonical.includes(civilClaimsGuide.id), false, `Civil claims guide must not reach ${courtPath} canonical assembly`);
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
    const authorityIds = [...knowledge.statutes, ...knowledge.proceduralRules, ...knowledge.precedents, ...knowledge.officialGuidance].map((item) => item.id).sort();
    if (courtPath === "small-claims") {
      assert.deepEqual(authorityIds, [jurisdictionRegulation.id, procedureGuide.id].sort(), "Small Claims court-wide procedural sources must be available without a substantive issue-domain match");
    } else if (courtPath === "family") {
      assert.deepEqual(authorityIds, [familyLawRules.id, familyProcedureGuide.id].sort(), "Ontario Family court-wide procedural sources must be available without a substantive issue-domain match");
    } else {
      assert.deepEqual(authorityIds, [civilProcedureRules.id, civilClaimsGuide.id].sort(), "Ontario Civil court-wide procedural sources must be available without a substantive issue-domain match");
    }
    const canonical: string = JSON.stringify(output.masterResultPatch);
    assert.equal(canonical.includes("authority_test_"), false, `${courtPath}: synthetic authority leaked across area boundary`);
    const assembly = output.masterResultPatch.caseSystemAssembly as {
      legalReasoningReadiness?: { authorityCount?: number };
      authorityReadiness?: { verifiedAuthorityCount?: number };
    } | undefined;
    if (courtPath === "civil") {
      assert.equal(assembly?.authorityReadiness?.verifiedAuthorityCount, 2, `${courtPath}: canonical authority count must reflect only scoped procedural sources`);
    } else {
      assert.equal(assembly?.legalReasoningReadiness?.authorityCount, 0, `${courtPath}: generic authority categories must not be counted as sources`);
    }
  }

  console.log("Authority knowledge bridge verification passed: production readiness, Ontario Small Claims, Family, and Civil procedural-rule and official-guidance propagation, provenance, existing safety gates, deduplication, canonical exclusion, and three-area isolation.");
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
