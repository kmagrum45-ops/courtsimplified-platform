# COURTSIMPLIFIED FACT PATTERN RECOGNITION ENGINE V1

Version: 1.0

Status: DESIGN PHASE

Priority: HIGHEST

---

# PURPOSE

The Fact Pattern Recognition Engine is the first true cognitive engine in CourtSimplified.

Its purpose is to understand what happened before attempting legal classification.

Current CourtSimplified logic relies too heavily on:

- keywords
- trigger terms
- direct issue matching

This engine shifts CourtSimplified toward factual understanding.

---

# CURRENT MODEL

User Narrative
↓
Keyword Detection
↓
Issue Classification
↓
Theory Detection

Problems:

- misses hidden issues
- misses contextual facts
- misses procedural implications
- misses credibility patterns
- misses judge concerns

---

# TARGET MODEL

User Narrative
↓
Fact Extraction
↓
Fact Pattern Detection
↓
Issue Detection
↓
Theory Detection
↓
Proof Mapping
↓
Judge Concern Detection
↓
Authority Matching
↓
Strategy Generation

---

# PRIMARY OBJECTIVE

Determine:

"What actually happened?"

before attempting:

"What legal category does this belong to?"

---

# OUTPUT OBJECT

FactPatternReport

Fields:

- detectedPatterns
- confidenceScores
- supportingFacts
- missingFacts
- proceduralSignals
- credibilitySignals
- proofSignals
- authoritySignals
- judicialConcernSignals
- recommendedQuestions

---

# INITIAL PATTERN CATEGORIES

## Family Law

Patterns:

- retroactive support
- non-payment allegation
- historical payment pattern
- parenting conflict
- parenting schedule conflict
- mobility dispute
- alienation concern
- status quo pattern
- communication breakdown
- access interference

---

## Civil

Patterns:

- negligence
- contract breach
- misrepresentation
- defamation
- limitation concern
- property dispute
- debt dispute
- service issue
- procedural non-compliance

---

## Small Claims

Patterns:

- unpaid invoice
- contractor dispute
- defective work
- debt recovery
- property damage
- service dispute
- consumer dispute

---

# FACT EXTRACTION

Engine must identify:

- people
- dates
- locations
- actions
- communications
- payments
- agreements
- documents
- procedural events

without relying on legal terminology.

---

# MISSING FACT DETECTION

Engine must identify:

- unknown dates
- missing documents
- missing witnesses
- missing amounts
- missing procedural events

Output:

Missing Fact List

---

# PROCEDURAL SIGNAL DETECTION

Engine must identify:

- service events
- filing events
- deadlines
- court appearances
- motions
- conferences
- judgments

Output:

Procedural Signals

---

# CREDIBILITY SIGNAL DETECTION

Engine must identify:

- inconsistent statements
- delay patterns
- admissions
- denials
- unexplained changes
- documentary conflicts

Output:

Credibility Signals

---

# JUDGE CONCERN SIGNAL DETECTION

Engine must identify facts likely to attract judicial attention.

Examples:

Family:

- child stability
- parenting history
- communication failures

Civil:

- proof
- causation
- damages

Procedural:

- service
- deadlines
- compliance

Output:

Judge Concern Signals

---

# INTEGRATION TARGETS

The Fact Pattern Engine must feed:

- CourtSimplifiedBrain
- LegalTheoryEngine
- ElementProofEngine
- LitigationStrategyEngine
- WorkflowOrchestration
- Future JudgeConcernEngine
- Future AuthorityApplicabilityEngine

---

# SUCCESS CRITERIA

The engine succeeds when:

A user can describe a situation in plain language and CourtSimplified can identify:

- what happened
- what matters
- what is missing
- what needs proof
- what procedural issues exist
- what concerns a judge may have

without requiring legal keywords.

---

# LONG TERM ROLE

This engine becomes the foundation for all future litigation cognition.

Without Fact Pattern Recognition:

CourtSimplified remains keyword-driven.

With Fact Pattern Recognition:

CourtSimplified begins reasoning from facts.