import assert from "node:assert/strict";

import {
  buildProductionReadyLegalKnowledge,
  type ProductionAuthorityCandidate,
  retrieveProductionReadyAuthorities,
} from "../../src/lib/case-system/authority-intelligence/authorityRetrievalEngine";
import { runCourtSimplifiedBrain } from "../../src/lib/case-system/intelligence/courtSimplifiedBrain";

const NOW = new Date("2026-08-06T00:00:00.000Z");

function syntheticAuthority(
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

  const excludedPacket = buildProductionReadyLegalKnowledge({ context: { ...context, legalDomains: [...context.legalDomains] }, candidateEntries: [syntheticAuthority({ sourceReferences: [{ ...complete.sourceReferences[0], sourceUrl: undefined }] })], asOf: NOW });
  assert.equal(excludedPacket.precedents.length, 0);
  assert.equal(JSON.stringify(excludedPacket).includes("Synthetic proposition"), false, "excluded authority must not affect packet output");
  assert.ok(excludedPacket.sourceWarnings.some((warning) => warning.includes("No production-ready verified authority")));

  for (const [courtPath, text] of [
    ["small-claims", "A synthetic unpaid invoice dispute."],
    ["family", "A synthetic request about parenting time."],
    ["civil", "A synthetic negligence dispute."],
  ] as const) {
    const output = await runCourtSimplifiedBrain({ caseId: `authority-${courtPath}`, courtPath, province: "Ontario", stage: "starting-case", rawUserText: text, allowExternalCognition: false });
    const knowledge = output.intelligence.legalKnowledge;
    assert.equal(knowledge.statutes.length + knowledge.proceduralRules.length + knowledge.precedents.length, 0, `${courtPath}: current seeds must remain excluded`);
    assert.ok(knowledge.sourceWarnings.some((warning) => warning.includes("No production-ready verified authority")));
    const canonical = JSON.stringify(output.masterResultPatch);
    assert.equal(canonical.includes("authority_test_"), false, `${courtPath}: synthetic authority leaked across area boundary`);
    const assembly = output.masterResultPatch.caseSystemAssembly as { legalReasoningReadiness?: { authorityCount?: number } } | undefined;
    assert.equal(assembly?.legalReasoningReadiness?.authorityCount, 0, `${courtPath}: generic authority categories must not be counted as sources`);
  }

  console.log("Authority knowledge bridge verification passed: production readiness, provenance, existing safety gates, deduplication, all-domain retrieval, canonical exclusion, and three-area isolation.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Authority bridge verification failed.");
  process.exitCode = 1;
});
