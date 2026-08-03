# CourtSimplified Integration Trace Registry

**Generated:** 2026-07-31 15:11:03

> Traces combine resolved TypeScript imports with detected runtime /api/ route calls. A trace proves static connectivity, not that every runtime branch executed.

## Summary

| Metric | Count |
|---|---:|
| Entry traces | 41 |
| Runtime API calls | 7 |
| Resolved runtime API calls | 7 |
| Unresolved runtime API calls | 0 |
| Isolated entries | 24 |

## Entry Traces

| Route | Entry Type | Status | Reachable Nodes | Architecture Systems | Workflows | Maximum Depth | AI Pipeline | Runtime API Routes | Reachable Layers | File |
|---|---|---|---:|---:|---:|---:|---|---|---|---|
| /admin/pdf-field-mapper | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\admin\pdf-field-mapper\page.tsx |
| /ai-drafting-assistant | Application Entry | Connected | 10 | 8 | 1 | 5 | True | None detected | Case System | app\ai-drafting-assistant\page.tsx |
| /ai-test | Application Entry | Connected | 13 | 8 | 3 | 5 | True | /api/ai-case-partner | API, Case System | app\ai-test\page.tsx |
| /api/admin/scan-pdf-fields | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\admin\scan-pdf-fields\route.ts |
| /api/ai-case-partner | API Route | Connected | 12 | 8 | 3 | 4 | True | None detected | Case System | app\api\ai-case-partner\route.ts |
| /api/assistant-chat | API Route | Connected | 41 | 21 | 5 | 6 | False | None detected | Case System | app\api\assistant-chat\route.ts |
| /api/cases | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\cases\route.ts |
| /api/case-summary | API Route | Connected | 41 | 21 | 5 | 6 | False | None detected | Case System | app\api\case-summary\route.ts |
| /api/document-export | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\document-export\route.ts |
| /api/evidence-praser | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\evidence-praser\route.ts |
| /api/form-rules | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\form-rules\route.ts |
| /api/generate-form | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\generate-form\route.ts |
| /api/rule-engine | API Route | Connected | 17 | 7 | 0 | 3 | False | None detected | API, Case System, User Interface | app\api\rule-engine\route.ts |
| /api/rules/evidence | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\rules\evidence\route.ts |
| /api/rules/issues | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\rules\issues\route.ts |
| /api/rules/procedures | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\rules\procedures\route.ts |
| /api/scan-form-fields | API Route | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\api\scan-form-fields\route.ts |
| /builder | Application Entry | Connected | 75 | 43 | 10 | 8 | True | None detected | API, Case System, Persistence, User Interface | app\builder\page.tsx |
| /case-dashboard | Application Entry | Connected | 7 | 4 | 0 | 4 | False | None detected | Case System | app\case-dashboard\page.tsx |
| /case-law | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\case-law\page.tsx |
| /civil | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\civil\page.tsx |
| /court-package | Application Entry | Connected | 8 | 5 | 1 | 4 | False | None detected | Case System | app\court-package\page.tsx |
| /dashboard/cases/[id] | Application Entry | Connected | 4 | 1 | 0 | 2 | False | None detected | Case System, Persistence | app\dashboard\cases\[id]\page.tsx |
| /dashboard | Application Entry | Connected | 4 | 1 | 0 | 2 | False | None detected | Case System, Persistence | app\dashboard\page.tsx |
| /document-export | Application Entry | Connected | 1 | 0 | 0 | 1 | False | /api/document-export | API | app\document-export\page.tsx |
| /document-workspace | Application Entry | Connected | 11 | 7 | 1 | 4 | False | None detected | Case System, Persistence | app\document-workspace\page.tsx |
| /evidence | Application Entry | Connected | 10 | 4 | 1 | 4 | False | None detected | Case System, Persistence | app\evidence\page.tsx |
| /family/ontario | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\family\ontario\page.tsx |
| /family | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\family\page.tsx |
| /forms | Application Entry | Connected | 1 | 0 | 0 | 1 | False | /api/generate-form | API | app\forms\page.tsx |
| / | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\layout.tsx |
| /legal-principles | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\legal-principles\page.tsx |
| /litigation-strategy | Application Entry | Connected | 7 | 4 | 0 | 3 | False | None detected | Case System | app\litigation-strategy\page.tsx |
| /login | Application Entry | Connected | 1 | 0 | 0 | 1 | False | None detected | Persistence | app\login\page.tsx |
| /ontario-civil | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\ontario-civil\page.tsx |
| /ontario-smallclaims | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\ontario-smallclaims\page.tsx |
| / | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\page.tsx |
| /settlement-conference | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\settlement-conference\page.tsx |
| /small-claims | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\small-claims\page.tsx |
| /trial-package | Application Entry | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | app\trial-package\page.tsx |
| next.config.ts | Configuration | Isolated | 0 | 0 | 0 | 0 | False | None detected | None detected | next.config.ts |

## Runtime API Calls

| Source | Route | Status | Target |
|---|---|---|---|
| app\ai-test\page.tsx | /api/ai-case-partner | Resolved | app\api\ai-case-partner\route.ts |
| app\builder\_components\CourtAssistantChat.tsx | /api/ai-case-partner | Resolved | app\api\ai-case-partner\route.ts |
| app\document-export\page.tsx | /api/document-export | Resolved | app\api\document-export\route.ts |
| app\forms\page.tsx | /api/generate-form | Resolved | app\api\generate-form\route.ts |
| src\lib\case-system\rulesEngine.ts | /api/rules/evidence | Resolved | app\api\rules\evidence\route.ts |
| src\lib\case-system\rulesEngine.ts | /api/rules/issues | Resolved | app\api\rules\issues\route.ts |
| src\lib\case-system\rulesEngine.ts | /api/rules/procedures | Resolved | app\api\rules\procedures\route.ts |
