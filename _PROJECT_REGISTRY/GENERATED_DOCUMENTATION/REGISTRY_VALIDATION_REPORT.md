# CourtSimplified Registry Validation Report

**Generated:** 2026-07-31T19:11:06.892Z

## Summary

| Metric | Count |
|---|---:|
| Validation checks | 21 |
| Passed | 21 |
| Failed | 0 |

## Validation Checks

| Check | Status | Expected | Actual | Details |
|---|---|---|---|---|
| Architecture node total | Passed | 196 | 196 | Architecture statistics must equal the actual node array. |
| Architecture edge total | Passed | 432 | 432 | Architecture statistics must equal the actual edge array. |
| Unique architecture files | Passed | 196 | 196 | Every architecture node must map to one unique source file. |
| Unique architecture node IDs | Passed | 196 | 196 | Every architecture node ID must be unique. |
| Internal edge references | Passed | 0 | 0 | Every internal import edge must reference two architecture nodes. |
| Unresolved internal imports | Passed | 0 | 0 | Internal imports should resolve to known source files. |
| Architecture source files exist | Passed | 0 | 0 | Every architecture node must exist in the current project tree. |
| Architecture entry-point total | Passed | 41 | 41 | Entry-point statistics must match entry-point nodes. |
| Workflow architecture model version | Passed | 1.0.0 | 1.0.0 | Workflow analysis must reference the current architecture model version. |
| Workflow record total | Passed | 15 | 15 | Workflow statistics must equal the workflow record array. |
| Unique workflow records | Passed | 15 | 15 | Every workflow file must have one workflow record. |
| Workflow files in architecture model | Passed | 0 | 0 | Every workflow record must reference an architecture node. |
| Unique entry traces | Passed | 41 | 41 | Every entry file must have one trace. |
| Entry-trace total | Passed | 41 | 41 | Every architecture entry point must have one integration trace. |
| Entry traces in architecture model | Passed | 0 | 0 | Every entry trace must reference an architecture node. |
| Runtime API call total | Passed | 7 | 7 | Workflow statistics must equal the runtime API call array. |
| Unresolved runtime API calls | Passed | 0 | 0 | Every detected runtime API call should resolve to an API route. |
| Runtime API graph references | Passed | 0 | 0 | Resolved runtime calls must reference known source and target nodes. |
| Engine registry exists | Passed | Present and non-empty | Present | The architecture audit requires the generated engine registry. |
| Engine registry record total | Passed | 95 | 95 | The engine-record table must match its architecture-system summary count. |
| Engine registry required fields | Passed | All required architecture fields | All present | Purpose, inputs, outputs, dependencies, consumers, workflow/AI positions, risk, duplicate detection, and integration points are required. |
