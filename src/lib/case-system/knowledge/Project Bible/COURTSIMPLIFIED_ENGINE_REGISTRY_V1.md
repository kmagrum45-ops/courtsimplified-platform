# COURTSIMPLIFIED ENGINE REGISTRY V1

Version: 1.0

Status: Active

Purpose:

Permanent registry of all active engines inside CourtSimplified.

This file exists to prevent:

- duplicate engines
- overlapping engines
- abandoned engines
- architecture drift
- competing sources of truth

Every future engine must be registered here.

---

# ENGINE REGISTRY RULES

Before creating any new engine:

1. Search this registry.

2. Determine whether functionality already exists.

3. Determine whether functionality belongs inside an existing engine.

4. Determine how it connects to MasterCaseSchema.

5. Determine downstream impacts.

No new engine may be created until this review is completed.

---

# ACTIVE ENGINE CLUSTER

## Cluster 1

CourtSimplified Brain Cluster

Purpose:

Primary case intelligence.

Status:

Active

Core Components:

- CourtSimplifiedBrain
- BrainMigrationLayer
- MasterCaseSchema

Responsibilities:

- intake understanding
- issue detection
- case analysis
- intelligence routing
- downstream orchestration

Dependencies:

- Intake Normalization
- MasterCaseSchema

Criticality:

CRITICAL

---

## Cluster 2

Case Context Cluster

Purpose:

Persistent case memory.

Status:

Active

Core Components:

- caseContextEngine
- caseContextStorage

Responsibilities:

- case persistence
- active case management
- save
- restore
- memory continuity

Capabilities:

- local storage
- active case switching
- future Supabase persistence

Criticality:

CRITICAL

---

## Cluster 3

Workflow Orchestration Cluster

Purpose:

Litigation workflow control.

Status:

Active

Core Components:

- workflowOrchestration

Responsibilities:

- route selection
- readiness analysis
- blocker analysis
- next actions
- workflow progression

Criticality:

CRITICAL

---

## Cluster 4

Authority Intelligence Cluster

Purpose:

Authority validation and safety.

Status:

Active

Core Components:

- authoritySourceSchema
- verifiedAuthorityRegistry
- authorityVerificationEngine
- authorityWeightEngine
- citationSafetyEngine

Responsibilities:

- authority verification
- authority weighting
- citation safety
- authority ranking
- legal authority governance

Criticality:

CRITICAL

---

## Cluster 5

Knowledge Intelligence Cluster

Purpose:

Knowledge retrieval and doctrine governance.

Status:

Active

Core Components:

- doctrineSeedLibrary
- knowledgeRetrievalEngine
- legalKnowledgeObjects
- legalAuthorityRegistry

Responsibilities:

- knowledge retrieval
- doctrine management
- verification controls
- jurisdiction controls
- procedural guidance controls

Criticality:

HIGH

---

# KNOWN FUTURE CLUSTERS

Planned:

- Evidence Intelligence Cluster
- Contradiction Intelligence Cluster
- Credibility Intelligence Cluster
- Procedural Intelligence Cluster
- Proof Intelligence Cluster
- Strategy Intelligence Cluster
- Trial Intelligence Cluster
- Settlement Intelligence Cluster
- Judicial Concern Intelligence Cluster
- Annual Practice Authority Cluster

Status:

Planned

Not Yet Audited

---

# ENGINE CREATION POLICY

No engine may be created if:

- functionality already exists
- functionality belongs inside another engine
- it creates duplicate intelligence
- it bypasses MasterCaseSchema
- it creates a second source of truth

All engines must integrate into the Litigation Operating System architecture.

This registry is the authoritative record of active engines.