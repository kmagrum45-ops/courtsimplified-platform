# CourtSimplified Circular Dependency Report

**Generated:** 2026-07-31T19:11:06.892Z

> Circular groups are strongly connected components in the combined internal-import and resolved runtime-API graph. Findings require review; this report never authorizes automatic removal or rewrites.

## Summary

| Metric | Count |
|---|---:|
| Circular dependency groups | 3 |
| Files participating in cycles | 7 |
| High-risk groups | 2 |

## Circular Groups

| Group | Risk | Files | Roles | Layers | Cycle Edges |
|---:|---|---|---|---|---|
| 1 | High | src\lib\case-system\civilMasterCaseEngine.ts, src\lib\case-system\civilStrategyEngine.ts | Architecture System | Case System | src\lib\case-system\civilMasterCaseEngine.ts → src\lib\case-system\civilStrategyEngine.ts (InternalImport), src\lib\case-system\civilStrategyEngine.ts → src\lib\case-system\civilMasterCaseEngine.ts (InternalImport) |
| 2 | High | src\lib\case-system\dashboardEngine.ts, src\lib\case-system\dashboard\dashboardAdapter.ts | Architecture System, Integration Service | Case System | src\lib\case-system\dashboard\dashboardAdapter.ts → src\lib\case-system\dashboardEngine.ts (InternalImport), src\lib\case-system\dashboardEngine.ts → src\lib\case-system\dashboard\dashboardAdapter.ts (InternalImport) |
| 3 | Medium | src\lib\case-system\evidence\evidenceIntelligenceTypes.ts, src\lib\case-system\facts\factPatternTypes.ts, src\lib\case-system\intelligence\intelligenceTypes.ts | Contract or Schema | Case System | src\lib\case-system\evidence\evidenceIntelligenceTypes.ts → src\lib\case-system\intelligence\intelligenceTypes.ts (InternalImport), src\lib\case-system\facts\factPatternTypes.ts → src\lib\case-system\intelligence\intelligenceTypes.ts (InternalImport), src\lib\case-system\intelligence\intelligenceTypes.ts → src\lib\case-system\evidence\evidenceIntelligenceTypes.ts (InternalImport), src\lib\case-system\intelligence\intelligenceTypes.ts → src\lib\case-system\facts\factPatternTypes.ts (InternalImport) |
