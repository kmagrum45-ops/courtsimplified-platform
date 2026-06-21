# COURTSIMPLIFIED MASTER BLUEPRINT

## PROJECT CONSTITUTION

This document is the source of truth for CourtSimplified architecture, intelligence systems, workflow systems, legal knowledge design, procedural design, evidence design, and future development decisions.

All future coding must connect to this blueprint.

---

# MISSION

CourtSimplified is not a chatbot.

CourtSimplified is not a forms website.

CourtSimplified is not a legal search engine.

CourtSimplified is a complete litigation operating system designed to guide users from legal problem identification through final resolution.

The goal is to become the leading public legal litigation platform in Canada and set the standard for future legal technology platforms.

---

# CORE DOCTRINE

## INTELLIGENT SILENCE

CourtSimplified must not display:

* resolved issues
* irrelevant issues
* factually contradicted issues
* procedurally impossible issues
* duplicate issues
* immaterial issues
* warnings that do not affect the user’s next step
* generic legal warnings that do not apply to the specific facts

CourtSimplified must show only:

* what matters now
* what the user must do next
* what evidence matters
* what deadlines matter
* what forms matter
* what risks matter
* what court or tribunal is correct
* what procedural stage the user is actually in
* what proof gaps affect the case
* what a judge is likely to care about
* what the other side is likely to argue

If an issue does not affect the user’s next action, next filing, next deadline, next evidentiary requirement, legal position, or litigation risk, the system should generally remain silent.

Examples:

* If limitation is not a real issue, say nothing about limitation.
* If service has already happened, do not warn about serving.
* If the user selected Civil but the claim is under the Small Claims limit, recommend Small Claims.
* If evidence already resolves a concern, suppress that warning.
* If a warning is only theoretical, do not show it unless it affects the current case.

---

# MASTER ARCHITECTURE

User Story
↓
Intake Normalization
↓
Legal Signal Classification
↓
Claim Reasoning
↓
CourtSimplified Brain
↓
CourtSimplified Brain Bridge
↓
Master Case Bridge
↓
Master Case Schema
↓
Case System Assembly
↓
Workflow Orchestration
↓
Dashboard
↓
Documents
↓
Forms
↓
Evidence Packages
↓
Court Packages
↓
Trial Packages

---

# CURRENT LOCKED ARCHITECTURE

## Core Brain

* intakeNormalizationEngine
* legalSignalClassifier
* claimReasoningEngine
* courtSimplifiedBrain
* courtSimplifiedBrainBridge
* masterCaseBridge
* masterCaseSchema
* caseSystemAssembly

## Intelligence Systems

* elementProofEngine
* contradictionDetectionEngine
* credibilityRiskEngine
* authorityVerificationEngine
* authorityWeightEngine
* citationSafetyEngine
* jurisdictionAuthorityEngine

## Workflow Systems

* workflowOrchestrationArchitecture
* workflowOrchestrationEngine
* dashboardAdapter
* dashboardEngine
* app/dashboard/cases/[id]/page.tsx

---

# BUILD RULES

1. Full replacement files only.
2. One file at a time.
3. No patching.
4. No snippets as final coding solutions.
5. No competing legal brains.
6. No duplicate intelligence systems.
7. Preserve locked architecture.
8. Every change must connect to this blueprint.
9. Every recommendation must be procedurally aware.
10. Every legal conclusion must connect to facts, evidence, or law.
11. Every procedural recommendation must connect to court, stage, form, deadline, or rule logic.
12. Think like a judge before generating output.
13. Think like a litigator before generating documents.
14. Think like a court clerk before recommending forms.
15. Think like a self-represented litigant when designing user flow.
16. Do not display unnecessary warnings.
17. Do not simplify working features.
18. Do not create new architecture unless the blueprint requires it.
19. Do not bypass MasterCaseSchema or CaseSystemAssembly.
20. Every major change must include current file, source of truth, dependencies, locked files, upgrade goal, risks, and next file.

---

# BLUEPRINT PHASES

## PHASE 1 — FOUNDATIONAL INTELLIGENCE

Purpose:

Understand the user’s story and convert it into structured legal data.

CourtSimplified must identify:

* facts
* dates
* parties
* relationships
* locations
* evidence
* damages
* procedural indicators
* court indicators
* urgency indicators
* contradiction indicators

Status:

IN PROGRESS

---

## PHASE 2 — COURT ROUTING INTELLIGENCE

Purpose:

Determine the correct court, tribunal, forum, and jurisdiction.

CourtSimplified must detect and correct wrong user selections.

Examples:

* Ontario + $15,000 + defamation = Ontario Small Claims Court
* Parenting, decision-making, child support = Family Court
* Tenant eviction, rent, repair, lease issues = LTB
* Human rights discrimination = HRTO
* Federal immigration issue = Immigration/Federal pathway
* Civil claim over Small Claims limit = Superior Court
* Judicial review issue = Divisional Court or Federal Court depending on decision-maker

Status:

NOT COMPLETE

---

## PHASE 3 — LEGAL REASONING INTELLIGENCE

Purpose:

Determine legal theories and what must be proven.

CourtSimplified must identify:

* causes of action
* legal claims
* required legal elements
* available remedies
* burden of proof
* defences
* proof gaps
* damages theory

Examples:

Defamation:

* exact words
* publication
* identification
* harm
* screenshots or witnesses
* possible defences

Negligence:

* duty
* breach
* causation
* damages

Contract:

* agreement
* breach
* loss
* proof of terms

Status:

PARTIALLY COMPLETE

---

## PHASE 4 — PROCEDURAL INTELLIGENCE

Purpose:

Determine exactly where the user is in the court process and what must happen next.

CourtSimplified must understand:

* current stage
* next stage
* required forms
* required service
* required filing
* deadlines
* conferences
* motions
* discovery
* mediation
* pre-trial
* trial
* appeal
* enforcement

Status:

EARLY STAGE

---

## PHASE 5 — EVIDENCE INTELLIGENCE

Purpose:

Turn raw uploads into usable legal evidence.

CourtSimplified must determine:

* what evidence exists
* what evidence is missing
* what evidence proves
* what legal element it supports
* what timeline event it supports
* whether it is duplicated
* whether it contradicts another item
* whether it needs explanation
* whether it should be used in a court package

Status:

PARTIALLY COMPLETE

---

## PHASE 6 — JUDICIAL INTELLIGENCE

Purpose:

Think like a judge.

CourtSimplified must identify:

* judge concerns
* credibility concerns
* proof weaknesses
* procedural non-compliance
* overclaiming
* exaggeration
* unsupported allegations
* missing evidence
* irrelevant material
* likely questions from the court

Status:

EARLY STAGE

---

## PHASE 7 — LITIGATION STRATEGY INTELLIGENCE

Purpose:

Think like opposing counsel and a strategic litigator.

CourtSimplified must identify:

* likely defences
* likely attacks
* settlement opportunities
* costs risks
* procedural opportunities
* discovery strategy
* request to admit opportunities
* offer to settle timing
* expert evidence needs
* summary judgment risks
* trial risks

Status:

NOT COMPLETE

---

## PHASE 8 — AUTHORITY INTELLIGENCE

Purpose:

Use legal authority correctly.

CourtSimplified must determine:

* applicable statutes
* rules
* regulations
* practice directions
* leading authorities
* binding authorities
* persuasive authorities
* wrong-jurisdiction authorities
* unsafe citations
* current versus outdated authority

Status:

PARTIALLY COMPLETE

---

## PHASE 9 — DOCUMENT INTELLIGENCE

Purpose:

Generate court-ready materials only after the system understands facts, evidence, court, procedure, and proof.

CourtSimplified must generate:

* pleadings
* affidavits
* motions
* conference briefs
* evidence summaries
* exhibit indexes
* court packages
* trial packages
* appeal packages
* enforcement packages

Status:

EARLY STAGE

---

## PHASE 10 — CASE MANAGEMENT

Purpose:

Operate like a litigation file.

CourtSimplified must manage:

* deadlines
* tasks
* evidence
* forms
* filed documents
* served documents
* draft documents
* workflow progress
* upcoming events
* missing information
* case readiness

Status:

EARLY STAGE

---

# PROCEDURAL INTELLIGENCE VISION

CourtSimplified must understand the lifecycle of litigation.

General civil lifecycle:

Pre-Filing
↓
Filing
↓
Service
↓
Defence
↓
Reply
↓
Pleadings Closed
↓
Discovery
↓
Mediation
↓
Motions
↓
Pre-Trial
↓
Trial
↓
Judgment
↓
Appeal
↓
Enforcement

Family lifecycle:

Pre-Filing
↓
Application
↓
Service
↓
Answer
↓
Reply if required
↓
First Appearance if applicable
↓
Case Conference
↓
Settlement Conference
↓
Motion if needed
↓
Trial Management Conference
↓
Trial
↓
Order
↓
Enforcement or Variation

Small Claims lifecycle:

Pre-Filing
↓
Plaintiff’s Claim
↓
Service
↓
Defence
↓
Default if no Defence
↓
Settlement Conference
↓
Motions if needed
↓
Trial
↓
Judgment
↓
Enforcement

The user should not have to determine their own procedural stage.

CourtSimplified should determine it automatically.

---

# COURT ROUTING VISION

The system must override incorrect court selections.

Example:

Ontario
+
$15,000
+
Defamation

Should recommend:

Ontario Small Claims Court

Not:

Civil Court / Superior Court

The system must explain the reason only when useful.

If the selected court is already correct, it does not need to lecture the user.

---

# EVIDENCE OPERATING SYSTEM

## Mission

Evidence should not be stored as random files.

Evidence should be stored as legal proof.

CourtSimplified must understand:

File
↓
Evidence Item
↓
Fact
↓
Timeline Event
↓
Legal Issue
↓
Legal Element
↓
Proof Value
↓
Court Package Use

---

## Evidence First Doctrine

CourtSimplified should never start from the document.

CourtSimplified should start from:

Fact
↓
Evidence
↓
Proof
↓
Document

Every document should be generated from the evidence and proof structure, not from generic drafting.

---

## Evidence Storage Structure

Every case should contain:

* Court Documents
* Draft Documents
* Filed Documents
* Served Documents
* Evidence
* Messages
* Photos
* Videos
* Audio
* Receipts
* Medical Records
* School Records
* Police Records
* Financial Records
* Expert Records
* Timeline
* Witnesses
* Authorities
* Forms
* Court Packages
* Trial Packages

---

## Evidence Item Schema

Every evidence item should eventually store:

* evidenceId
* caseId
* title
* type
* originalFileName
* storedFilePath
* uploadDate
* documentDate
* dateRange
* source
* uploadedBy
* author
* sender
* recipient
* peopleMentioned
* location
* description
* extractedText
* summary
* relevance
* legalIssuesSupported
* legalElementsSupported
* timelineEventsLinked
* exhibitsLinked
* proofStrength
* reliabilityLevel
* admissibilityConcerns
* confidentialityLevel
* privilegeConcern
* duplicationStatus
* contradictionStatus
* courtPackageUse
* trialPackageUse
* pageCount
* exhibitLabel
* notes

---

## Evidence Types

CourtSimplified must classify:

* text message
* email
* screenshot
* social media post
* photograph
* video
* audio
* receipt
* invoice
* contract
* bank record
* e-transfer record
* school record
* medical record
* police record
* court document
* expert report
* witness statement
* government record
* letter
* form
* other

---

# MESSAGE EVIDENCE ARCHITECTURE

Messages are a special evidence type.

CourtSimplified must treat message evidence as a conversation, not scattered screenshots.

## Message Package Rules

Message packages should:

* remain chronological
* preserve sender/recipient
* preserve date/time
* preserve context
* avoid wasting page space
* fit multiple messages per page where possible
* include page numbers
* include exhibit labels
* include date ranges
* include source information
* include a conversation summary
* identify important messages
* identify admissions
* identify threats
* identify agreements
* identify contradictions
* identify service proof
* identify payment discussions
* identify parenting discussions
* identify settlement discussions
* identify harassment or defamation evidence when relevant

---

## Message Layout Standard

Default layout should support:

* 4 screenshots per page when screenshots are used
* chronological order
* caption under each screenshot
* date/time if known
* sender/recipient if known
* exhibit reference
* page number
* clean printable spacing
* no wasted empty pages

If messages are extracted as text, the system should support:

* conversation table
* date
* time
* sender
* recipient
* message content
* issue tag
* evidence tag

---

## Message Intelligence

CourtSimplified should detect message categories:

* admission
* denial
* threat
* agreement
* payment
* service
* notice
* parenting
* support
* harassment
* defamation
* settlement
* contradiction
* timeline confirmation
* credibility concern

---

# TIMELINE ARCHITECTURE

Every case should have a master timeline.

Timeline events should come from:

* user story
* evidence dates
* message dates
* court filing dates
* service dates
* deadlines
* hearings
* orders
* correspondence
* payments
* incidents
* medical events
* school events
* police events

Every timeline event should store:

* eventId
* date
* time
* dateConfidence
* title
* description
* peopleInvolved
* evidenceLinked
* legalIssuesLinked
* proceduralStageLinked
* source
* contradictionFlag
* importanceLevel

The timeline should support:

* chronological view
* issue-based view
* evidence-based view
* court-process view
* trial chronology export

---

# EXHIBIT ARCHITECTURE

Every evidence item used in court should be capable of becoming an exhibit.

CourtSimplified must support:

* exhibit labels
* exhibit numbering
* exhibit index
* exhibit descriptions
* page ranges
* source references
* evidence summaries
* legal issue links

Exhibit formats should adapt to the court:

* Small Claims
* Family
* Civil
* Tribunal
* Motion Record
* Trial Record
* Court Package

---

# COURT PACKAGE ARCHITECTURE

CourtSimplified should generate court packages from structured case data.

Court packages may include:

* cover page
* table of contents
* party information
* procedural status
* issue summary
* chronology
* evidence index
* exhibit package
* proof chart
* forms
* affidavits
* authorities
* filing checklist
* service checklist
* next-step checklist

Court packages must be stage-specific.

Examples:

Case Conference Package:

* conference brief
* required financial disclosure
* relevant evidence
* proof of service
* confirmation materials
* procedural checklist

Small Claims Settlement Conference Package:

* Plaintiff’s Claim or Defence
* evidence summary
* settlement position
* payment history if relevant
* damages chart
* proof gaps

Civil Motion Package:

* notice of motion
* affidavit
* exhibits
* draft order
* factum if required
* authorities if required
* confirmation if required

---

# TRIAL PACKAGE ARCHITECTURE

Trial packages should eventually include:

* trial chronology
* witness list
* exhibit list
* issue list
* proof chart
* legal elements chart
* damages chart
* admissions
* contradictions
* cross-examination preparation
* judge concern summary
* opening statement outline
* closing argument outline
* authorities
* document bundle

The system must not create trial materials until the procedural stage and evidence are ready.

---

# FILING AND SERVICE ARCHITECTURE

CourtSimplified must track:

* documents drafted
* documents filed
* documents served
* method of service
* date of service
* person served
* proof of service
* filing confirmation
* court file number
* Case Center upload status if applicable
* JSO filing status if applicable

If the user says something has already been served, service warnings should be suppressed unless there is a specific defect.

If the user has not filed, filing instructions may be relevant.

If the user has filed but not served, service becomes relevant.

If the user has filed and served, the system should move to the next procedural stage.

---

# FORM DEPENDENCY ARCHITECTURE

CourtSimplified must not recommend forms in isolation.

Every form recommendation should know:

* triggering fact
* court
* case type
* procedural stage
* required supporting documents
* required evidence
* service requirement
* filing requirement
* deadline
* next step after filing
* what happens if not filed

Example:

Family Case Conference:

* Form 17A may be required.
* Form 17F may be required.
* Financial disclosure may be required.
* Proof of service may be required.
* Additional motion or affidavit material may trigger additional forms.
* The system must not miss supporting procedural documents.

---

# AUTHORITY AND PRECEDENT ARCHITECTURE

CourtSimplified must not dump cases.

It must rank and explain authority.

Authority hierarchy:

1. Statute
2. Regulation
3. Court Rule
4. Practice Direction
5. Supreme Court of Canada
6. Court of Appeal
7. Superior Court
8. Small Claims or tribunal decisions
9. Persuasive out-of-province cases
10. Secondary sources

Authority must be linked to:

* legal issue
* procedural issue
* claim element
* defence
* remedy
* motion
* evidence issue
* court stage

The Ontario Annual Practice, Family Law Practice, Small Claims materials, court guides, CanLII, statutes, rules, and practice directions are knowledge sources.

They are not to be copied into the platform.

They are to be transformed into CourtSimplified reasoning.

---

# DASHBOARD VISION

The dashboard should answer:

* What court am I in?
* Am I in the right court?
* What stage am I at?
* What is my next step?
* What evidence matters now?
* What forms matter now?
* What deadlines matter now?
* What proof gaps matter now?
* What risks matter now?
* What should be silent because it does not matter?

The dashboard should not overwhelm the user.

The dashboard should behave like a legal command center.

---

# CURRENT PRIORITY

Current priority:

Evidence Operating System and Procedural Intelligence.

Immediate focus:

1. Evidence storage structure.
2. Message evidence packaging.
3. Court package architecture.
4. Filing and service tracking.
5. Court routing.
6. Procedural stage detection.
7. Form dependency intelligence.
8. Deadline intelligence.
9. Intelligent Silence enforcement.

---

# CURRENT STATUS

TypeScript Errors:

0

Current Major Goal:

Build the leading Canadian litigation operating system.

Current Active Blueprint Phase:

Evidence Operating System + Procedural Intelligence Foundation.

Current Next Objective:

Design and then build the file/evidence storage layer that supports message packages, exhibits, court packages, trial packages, and procedural workflows.

---

# BUILD LOG

## Locked

* Core brain architecture
* MasterCase architecture
* Proof analysis layer
* Authority layer
* Contradiction layer
* Credibility layer
* Workflow orchestration
* Dashboard adapter
* Dashboard engine
* Dashboard intelligence UI
* Intelligent Silence doctrine

## Next To Design

* Evidence storage schema
* Evidence package schema
* Message package schema
* Filing/service tracking schema
* Court package schema
* Trial package schema

## Next To Build

To be determined after reviewing current existing evidence-related files.
COURTSIMPLIFIED FILE INVENTORY — LOCKED WORKING LIST

ROOT:
.next/
app/
downloads/
lib/
node_modules/
public/
scripts/
src/
upload-clean/  [DELETED]
.env.local
.gitignore
eslint.config.mjs
form-compatibility-report.json
next-env.d.ts
next.config.ts
package-lock.json
package.json
postcss.config.mjs
README.md
tsconfig.json

APP:
app/admin/pdf-field-mapper/page.tsx
app/ai-drafting-assistant/page.tsx
app/ai-test/page.tsx

APP/API:
app/api/admin/scan-pdf-fields/route.ts
app/api/ai-case-partner/route.ts
app/api/assistant-chat/route.ts
app/api/builder-analysis/route.ts
app/api/case-summary/route.ts
app/api/cases/route.ts
app/api/document-export/route.ts
app/api/evidence-praser/route.ts
app/api/form-rules/
app/api/generate-form/route.ts
app/api/rule-engine/route.ts
app/api/rules/evidence/
app/api/rules/issues/
app/api/rules/procedures/
app/api/scan-form-fields/route.ts

APP/BUILDER:
app/builder/page.tsx
app/builder/_components/builderTypes.ts
app/builder/_components/CivilIntake.tsx
app/builder/_components/CourtAssistantChat.tsx
app/builder/_components/FamilyIntake.tsx
app/builder/_components/formsRegistry.ts
app/builder/_components/IntelligenceOverviewPanel.tsx
app/builder/_components/SmallClaimsIntake.tsx
app/builder/docs/architecture/page.tsx

APP ROUTES:
app/case-dashboard/page.tsx
app/case-law/page.tsx
app/civil/page.tsx
app/court-package/page.tsx
app/dashboard/page.tsx
app/dashboard/cases/[id]/page.tsx
app/dashboard/cases/[id]/docs/COURTSIMPLIFIED_MASTER_BLUEPRINT...
app/document-export/page.tsx
app/document-workspace/page.tsx
app/evidence/page.tsx
app/family/page.tsx
app/family/ontario/page.tsx
app/forms/page.tsx
app/legal-principles/page.tsx
app/litigation-strategy/page.tsx
app/login/page.tsx
app/ontario-civil/page.tsx
app/ontario-smallclaims/page.tsx
app/settlement-conference/page.tsx
app/small-claims/page.tsx
app/trial-package/page.tsx
app/layout.tsx
app/page.tsx
app/globals.css
app/favicon.ico

DOWNLOADS:
downloads/Form_7A_Plaintiffs_Claim.pdf
downloads/rscc-14a-e.pdf
downloads/scr-20q-oct24-en-fil - Copy.pdf

LIB:
lib/getFormsFromRules.js

PUBLIC:
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg

SCRIPTS:
scripts/form-import-audit/metadata-cleanup-1778275299090.json
scripts/form-import-audit/ontario-forms-1778272369679.json
scripts/form-import-audit/ontario-forms-1778273095968.json
scripts/adobe-form-test.js
scripts/audit-supabase-forms.mjs
scripts/clean-form-metadata.js
scripts/import-ontario-forms.js
scripts/scan-form-compatibility.js

SRC/LIB/CASE-SYSTEM/ARCHITECTURE:
src/lib/case-system/architecture/masterCaseSchema.ts

SRC/LIB/CASE-SYSTEM/AUTHORITY:
src/lib/case-system/authority/authoritySourceSchema.ts
src/lib/case-system/authority/authorityVerificationEngine.ts
src/lib/case-system/authority/authorityWeightEngine.ts
src/lib/case-system/authority/citationSafetyEngine.ts
src/lib/case-system/authority/jurisdictionAuthorityEngine.ts
src/lib/case-system/authority/verifiedAuthorityRegistry.ts

SRC/LIB/CASE-SYSTEM/CLAIMS:
src/lib/case-system/claims/claimTheoryArchitecture.ts
src/lib/case-system/claims/claimTheoryEngine.ts

SRC/LIB/CASE-SYSTEM/CONTRACTS:
src/lib/case-system/contracts/engineGovernance.ts
src/lib/case-system/contracts/masterCaseBridge.ts

SRC/LIB/CASE-SYSTEM/CONTRADICTIONS:
src/lib/case-system/contradictions/contradictionDetectionEngine.ts
src/lib/case-system/contradictions/contradictionSchema.ts
src/lib/case-system/contradictions/credibilityRiskEngine.ts

SRC/LIB/CASE-SYSTEM/CREDIBILITY:
src/lib/case-system/credibility/credibilityRiskArchitecture.ts
src/lib/case-system/credibility/credibilityRiskEngine.ts

SRC/LIB/CASE-SYSTEM/DAMAGES:
src/lib/case-system/damages/damagesRemedyArchitecture.ts
src/lib/case-system/damages/damagesRemedyEngine.ts

SRC/LIB/CASE-SYSTEM/DASHBOARD:
src/lib/case-system/dashboard/dashboardAdapter.ts

SRC/LIB/CASE-SYSTEM/EVIDENCE:
src/lib/case-system/evidence/evidenceRelationshipArchitecture.ts
src/lib/case-system/evidence/evidenceRelationshipEngine.ts

SRC/LIB/CASE-SYSTEM/EVIDENCE-PACKAGING:
src/lib/case-system/evidence-packaging/evidencePackagingArchitecture.ts
src/lib/case-system/evidence-packaging/evidencePackagingEngine.ts

SRC/LIB/CASE-SYSTEM/INTELLIGENCE:
src/lib/case-system/intelligence/claimReasoningEngine.ts
src/lib/case-system/intelligence/courtSimplifiedBrain.ts
src/lib/case-system/intelligence/elementProofEngine.ts
src/lib/case-system/intelligence/evidenceIntelligenceEngine.ts
src/lib/case-system/intelligence/intakeNormalizationEngine.ts
src/lib/case-system/intelligence/intelligenceTypes.ts
src/lib/case-system/intelligence/legalKnowledgeEngine.ts
src/lib/case-system/intelligence/legalSignalClassifier.ts
src/lib/case-system/intelligence/litigationSynthesisEngine.ts
src/lib/case-system/intelligence/proceduralPostureEngine.ts
src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts

SRC/LIB/CASE-SYSTEM/KNOWLEDGE:
src/lib/case-system/knowledge/doctrineSeedLibrary.ts
src/lib/case-system/knowledge/knowledgeRetrievalEngine.ts
src/lib/case-system/knowledge/legalAuthorityRegistry.ts
src/lib/case-system/knowledge/legalKnowledgeObjects.ts

SRC/LIB/CASE-SYSTEM/ORCHESTRATION:
src/lib/case-system/orchestration/brainMigrationLayer.ts
src/lib/case-system/orchestration/caseSystemAssembly.ts
src/lib/case-system/orchestration/courtSimplifiedBrainBridge.ts

SRC/LIB/CASE-SYSTEM/PROCEDURE:
src/lib/case-system/procedure/proceduralStateArchitecture.ts
src/lib/case-system/procedure/proceduralStateEngine.ts

SRC/LIB/CASE-SYSTEM/TIMELINE:
src/lib/case-system/timeline/timelineCognitionEngine.ts
src/lib/case-system/timeline/timelineEventArchitecture.ts

SRC/LIB/CASE-SYSTEM/TYPES:
src/lib/case-system/types/case.ts
src/lib/case-system/types/civil-case.ts
src/lib/case-system/types/document-generation.ts
src/lib/case-system/types/document-workspace.ts
src/lib/case-system/types/evidence.ts
src/lib/case-system/types/family-case.ts
src/lib/case-system/types/index.ts
src/lib/case-system/types/procedure.ts
src/lib/case-system/types/proof-map.ts
src/lib/case-system/types/strategy.ts
src/lib/case-system/types/timeline.ts

SRC/LIB/CASE-SYSTEM/WORKFLOW:
src/lib/case-system/workflow/workflowOrchestrationArchitecture.ts
src/lib/case-system/workflow/workflowOrchestrationEngine.ts

SRC/LIB/CASE-SYSTEM ROOT FILES:
src/lib/case-system/aiDraftingAssistantEngine.ts
src/lib/case-system/aiIntakeNormalizer.ts
src/lib/case-system/caseContextEngine.ts
src/lib/case-system/caseContextStorage.ts
src/lib/case-system/casePersistenceEngine.ts
src/lib/case-system/civilCaseFileCatalogEngine.ts
src/lib/case-system/civilEvidenceEngine.ts
src/lib/case-system/civilFormRoutingEngine.ts
src/lib/case-system/civilMasterCaseEngine.ts
src/lib/case-system/civilNarrativeEngine.ts
src/lib/case-system/civilStrategyEngine.ts
src/lib/case-system/civilWorkflowEngine.ts
src/lib/case-system/claimDraftEngine.ts
src/lib/case-system/courtPackageAssemblyEngine.ts
src/lib/case-system/dashboardEngine.ts
src/lib/case-system/defaults.ts
src/lib/case-system/documentExportEngine.ts
src/lib/case-system/documentGenerationEngine.ts
src/lib/case-system/documentsStatusEngine.ts
src/lib/case-system/documentWorkspaceEngine.ts
src/lib/case-system/evidenceAssemblyEngine.ts
src/lib/case-system/evidenceEngine.ts
src/lib/case-system/evidenceStorage.ts
src/lib/case-system/familyAffidavitNarrativeEngine.ts
src/lib/case-system/familyAiIntakeNormalizer.ts
src/lib/case-system/familyCaseFileCatalogEngine.ts
src/lib/case-system/familyEvidenceEngine.ts
src/lib/case-system/familyFormRoutingEngine.ts
src/lib/case-system/familyMasterCaseEngine.ts
src/lib/case-system/familyStrategyEngine.ts
src/lib/case-system/familyWorkflowEngine.ts
src/lib/case-system/form-registry.legacy.ts
src/lib/case-system/form8.ts
src/lib/case-system/formKnowledgeBase.ts
src/lib/case-system/formTriggerEngine.ts
src/lib/case-system/legalTheoryEngine.ts
src/lib/case-system/litigationStrategyEngine.ts
src/lib/case-system/masterCaseOrchestrator.ts
src/lib/case-system/proceduralRules.ts
src/lib/case-system/rawEvidenceStorage.ts
src/lib/case-system/registry.ts
src/lib/case-system/rulesEngine.ts
src/lib/case-system/scenarioConfidenceEngine.ts
src/lib/case-system/scenarioEngine.ts
src/lib/case-system/smallClaimsEngine.ts
src/lib/case-system/timelineEngine.ts
src/lib/case-system/utils.ts

SRC/LIB/FORMS:
src/lib/forms/formRules.ts
src/lib/forms/prefillEngine.ts

SRC/LIB/LEGAL-INTELLIGENCE:
src/lib/legal-intelligence/core/aiOrchestratorTypes.ts
src/lib/legal-intelligence/core/caseModel.ts
src/lib/legal-intelligence/core/legalKnowledgeTypes.ts
src/lib/legal-intelligence/core/precedentTypes.ts
src/lib/legal-intelligence/core/validationTypes.ts
src/lib/legal-intelligence/core/workflowTypes.ts
src/lib/legal-intelligence/engines/interpretationEngine.ts
src/lib/legal-intelligence/PROJECT_CONTROL.md

SRC/LIB/SUPABASE:
src/lib/supabase/client.ts

PROJECT CONTROL FILES:
PROJECT_CONTROL.md
src/lib/LIVE_FLOW_AUDIT.md

CONFIRMED DONE:
upload-clean/ deleted
npx tsc --noEmit = 0 errors

CURRENT PROBLEM:
intelligenceTypes.ts is still acting like an old complete architecture.
courtSimplifiedBrain.ts still depends heavily on intelligenceTypes.ts.
Old flow still exists:
intelligenceTypes.ts → courtSimplifiedBrain.ts → courtSimplifiedBrainBridge.ts → brainMigrationLayer.ts → MasterCaseSchema

TARGET:
MasterCaseSchema → CaseSystemAssembly → Workflow → Dashboard

NEXT RULE:
Before every step, update this inventory and classify changed files:
KEEP / MERGE / REPLACE / DELETE / LOCKED