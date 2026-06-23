# COURTSIMPLIFIED BURDEN OF PROOF ENGINE V1

STATUS: DESIGN PHASE

OWNER

CourtSimplified Cognitive Layer

PURPOSE

The Burden of Proof Engine determines:

- who carries the burden
- what must be proven
- whether sufficient proof exists
- what elements remain unsupported
- what evidence is missing
- what risks exist if the burden is not satisfied

This engine does not determine guilt, liability, or outcome.

It evaluates whether the evidentiary burden appears to be satisfied.

---

WHY THIS ENGINE EXISTS

Many litigation failures occur because a party:

- misunderstands the burden
- proves the wrong issue
- lacks evidence for a required element
- relies on assumptions
- relies on allegations
- relies on speculation

This engine prevents those failures.

---

PRIMARY QUESTIONS

Who carries the burden?

What legal test applies?

What elements must be proven?

What evidence supports each element?

What evidence is missing?

Has the burden been satisfied?

What weaknesses remain?

What would a judge likely say is missing?

---

INPUTS

Case Narrative

Fact Findings

Issue Findings

Claim Findings

Defense Findings

Evidence Packages

Authority Analysis

Case Reasoning Analysis

Procedural Analysis

MasterCaseSchema

---

OUTPUTS

Burden Findings

Element Findings

Missing Element Findings

Proof Sufficiency Findings

Risk Findings

Judicial Concern Findings

Recommended Actions

---

BURDEN CATEGORIES

Category 1

Plaintiff Burden

Examples:

Small Claims

Civil Claims

Contract Claims

Negligence Claims

Defamation Claims

Property Claims

---

Category 2

Applicant Burden

Examples:

Applications

Motions

Procedural Requests

Family Court Requests

Charter Applications

---

Category 3

Crown Burden

Examples:

Criminal Charges

Bail Hearings

Charter Justification

Certain Detention Requests

---

Category 4

Reverse Onus

Examples:

Statutory Reverse Onus

Certain Bail Situations

Specified Legislative Schemes

---

ELEMENT ANALYSIS

For every claim:

Identify:

Element 1

Element 2

Element 3

Element N

For each element:

Determine:

Supported

Partially Supported

Unsupported

Contradicted

Unknown

---

PROOF SUFFICIENCY MODEL

Evidence Strength Levels

None

Weak

Moderate

Strong

Very Strong

---

SUPPORTED ELEMENT TEST

Questions:

What evidence supports this element?

How reliable is the evidence?

How credible is the evidence?

Is corroboration available?

Does the evidence directly prove the element?

---

UNSUPPORTED ELEMENT TEST

Questions:

What is missing?

What evidence would strengthen the element?

Can the missing evidence realistically be obtained?

What risk does the missing evidence create?

---

ASSUMPTION DETECTION

Detect:

Speculation

Assumptions

Unsupported conclusions

Circular reasoning

Unproven inferences

Logical gaps

---

RATIONAL CONNECTION ANALYSIS

Questions:

Does the evidence logically support the conclusion?

Does the conclusion exceed the evidence?

Are alternative explanations possible?

Is there a gap between allegation and proof?

Is there a gap between risk and evidence?

Is there a gap between objective and action?

---

JUDICIAL CONCERN OUTPUTS

The engine must identify:

Missing proof

Missing elements

Weak evidence

Overreaching conclusions

Improper assumptions

Unsupported allegations

Burden failures

---

RISK SCORING

Minimal

Low

Moderate

High

Critical

---

RECOMMENDED ACTIONS

For every unsupported element:

Identify:

What is missing

Why it matters

How to obtain it

Priority level

Expected impact

---

LONG TERM GOAL

The Burden of Proof Engine becomes the primary proof-validation system for CourtSimplified.

All major litigation reasoning should pass through this engine.

The engine must continuously test whether conclusions are supported by evidence.

No duplicate burden-analysis systems should be created.

This engine becomes the single source of truth for burden analysis and proof sufficiency.