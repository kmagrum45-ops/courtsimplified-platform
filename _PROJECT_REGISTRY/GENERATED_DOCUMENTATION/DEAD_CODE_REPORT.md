# CourtSimplified Dead-Code Candidate Report

**Generated:** 2026-07-31T19:11:06.892Z

> These are static-analysis candidates, not deletion instructions. Dynamic imports, framework conventions, registries, future integrations, and intentionally staged subsystems must be checked before any file is changed.

## Summary

| Metric | Count |
|---|---:|
| Reachable architecture nodes | 134 |
| Dead-code candidates | 61 |
| High-confidence candidates | 15 |
| Medium-confidence candidates | 12 |
| Disconnected-subsystem review candidates | 34 |
| Exempted declarations/configuration | 1 |

## Candidates

| Confidence | Role | Layer | Consumers | Lines | Reason | File |
|---|---|---|---:|---:|---|---|
| High | Architecture System | Case System | 0 | 1109 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\authority-intelligence\authorityCaseSystemBridge.ts |
| High | Architecture System | Case System | 0 | 220 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\authority-intelligence\authorityDisplayEngine.ts |
| High | Architecture System | Case System | 0 | 216 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\authority\jurisdictionAuthorityEngine.ts |
| High | Architecture System | Case System | 0 | 246 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\claimDraftEngine.ts |
| High | Architecture System | Case System | 0 | 532 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\contracts\engineGovernance.ts |
| High | Architecture System | Case System | 0 | 782 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\documentExportEngine.ts |
| High | Architecture System | Case System | 0 | 220 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\documentsStatusEngine.ts |
| High | Architecture System | Case System | 0 | 373 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\evidence-packaging\evidencePackagingEngine.ts |
| High | Architecture System | Case System | 0 | 409 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\facts\factPatternAnaysisEngine.ts |
| High | Architecture System | Case System | 0 | 340 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\facts\factPatternEngine.ts |
| High | Architecture System | Case System | 0 | 562 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\familyMasterCaseEngine.ts |
| High | Architecture System | Case System | 0 | 812 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\case-system\litigation-intelligence\caseInvestigator.ts |
| High | Architecture System | Legal Intelligence | 0 | 457 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\legal-intelligence\engines\interpretationEngine.ts |
| High | Persistence | Persistence | 0 | 86 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\supabase\forms\formRules.ts |
| High | Architecture System | Persistence | 0 | 411 | Not reachable from any detected application/API entry point and has no detected consumers. | src\lib\supabase\forms\prefillEngine.ts |
| Medium | Registry | User Interface | 0 | 304 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | app\builder\_components\formsRegistry.ts |
| Medium | Library Module | Case System | 0 | 270 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\authority\ontarioCivilAuthorityCollection.ts |
| Medium | Registry | Case System | 0 | 150 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\form-registry.legacy.ts |
| Medium | Contract or Schema | Case System | 0 | 1256 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\litigation-strategy\litigationStrategyArchitecture.ts |
| Medium | Library Module | Case System | 0 | 1 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\litigation-strategy\litigationStrategyScoring.ts |
| Medium | Registry | Case System | 0 | 74 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\registry.ts |
| Medium | Contract or Schema | Case System | 0 | 182 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\types\document-generation.ts |
| Medium | Contract or Schema | Case System | 0 | 311 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\types\evidence.ts |
| Medium | Contract or Schema | Case System | 0 | 258 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\types\procedure.ts |
| Medium | Contract or Schema | Case System | 0 | 143 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\types\proof-map.ts |
| Medium | Contract or Schema | Case System | 0 | 222 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\types\strategy.ts |
| Medium | Contract or Schema | Case System | 0 | 160 | Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually. | src\lib\case-system\types\timeline.ts |
| Review | Architecture System | Case System | 1 | 1120 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\authorityBrainBridge.ts |
| Review | Library Module | Case System | 3 | 704 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\authorityIntegrationHub.ts |
| Review | Architecture System | Case System | 4 | 847 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\authorityNavigator.ts |
| Review | Registry | Case System | 3 | 250 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\authorityRegistryArchitecture.ts |
| Review | Architecture System | Case System | 1 | 334 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\authorityRetrievalEngine.ts |
| Review | Architecture System | Case System | 1 | 941 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\authorityWorkflowBridge.ts |
| Review | Registry | Case System | 1 | 798 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\authority-intelligence\verifiedAuthoritySeedRegistry.ts |
| Review | Library Module | Case System | 1 | 16 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\defaults.ts |
| Review | Contract or Schema | Case System | 1 | 201 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\evidence-packaging\evidencePackagingArchitecture.ts |
| Review | Contract or Schema | Case System | 1 | 153 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\facts\factPatternArchitecture.ts |
| Review | Architecture System | Case System | 1 | 766 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\familyAffidavitNarrativeEngine.ts |
| Review | Architecture System | Case System | 1 | 630 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\familyCaseFileCatalogEngine.ts |
| Review | Architecture System | Case System | 3 | 588 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\familyEvidenceEngine.ts |
| Review | Architecture System | Case System | 4 | 527 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\familyFormRoutingEngine.ts |
| Review | Architecture System | Case System | 5 | 619 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\familyWorkflowEngine.ts |
| Review | Library Module | Case System | 1 | 65 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\form8.ts |
| Review | Architecture System | Case System | 1 | 1129 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\authorityInvestigator.ts |
| Review | Architecture System | Case System | 1 | 677 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\burdenInvestigator.ts |
| Review | Architecture System | Case System | 1 | 830 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\contradictionInvestigator.ts |
| Review | Architecture System | Case System | 1 | 827 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\credibilityInvestigator.ts |
| Review | Architecture System | Case System | 1 | 620 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\evidenceInvestigator.ts |
| Review | Architecture System | Case System | 1 | 722 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\judgePerspectiveInvestigator.ts |
| Review | Architecture System | Case System | 1 | 568 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\narrativeInvestigator.ts |
| Review | Architecture System | Case System | 1 | 800 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\opponentStrategyInvestigator.ts |
| Review | Architecture System | Case System | 1 | 1218 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\proceduralInvestigator.ts |
| Review | Architecture System | Case System | 1 | 901 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\settlementInvestigator.ts |
| Review | Architecture System | Case System | 1 | 1308 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\litigation-intelligence\modules\trialReadinessInvestigator.ts |
| Review | Contract or Schema | Case System | 1 | 271 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\case-system\types\document-workspace.ts |
| Review | Architecture System | Legal Intelligence | 1 | 213 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\legal-intelligence\core\aiOrchestratorTypes.ts |
| Review | Library Module | Legal Intelligence | 6 | 300 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\legal-intelligence\core\caseModel.ts |
| Review | Contract or Schema | Legal Intelligence | 1 | 170 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\legal-intelligence\core\legalKnowledgeTypes.ts |
| Review | Contract or Schema | Legal Intelligence | 2 | 291 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\legal-intelligence\core\precedentTypes.ts |
| Review | Contract or Schema | Legal Intelligence | 1 | 130 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\legal-intelligence\core\validationTypes.ts |
| Review | Workflow | Legal Intelligence | 1 | 153 | Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point. | src\lib\legal-intelligence\core\workflowTypes.ts |
