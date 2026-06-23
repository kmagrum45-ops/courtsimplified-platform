# COURTSIMPLIFIED AUTHORITY BIBLE V1

Version: 1.0

Status: Active

Purpose:

Define the authority architecture used by CourtSimplified.

This document governs:

- authority verification
- authority weighting
- citation safety
- authority hierarchy
- authority applicability
- authority intelligence

---

# AUTHORITY PHILOSOPHY

CourtSimplified must not simply retrieve authorities.

CourtSimplified must understand:

- what the authority is
- whether it is valid
- whether it is safe
- whether it is applicable
- whether it helps the user
- whether it hurts the user

Authority intelligence must be treated as a first-class litigation system.

---

# CURRENT AUTHORITY ARCHITECTURE

## authoritySourceSchema

Status:

Audited

Purpose:

Defines authority structure.

Current Fields:

- source type
- jurisdiction
- court level
- binding level
- verification status
- authority status
- citation information
- domains
- keywords
- summary
- practical meaning
- procedural impacts
- evidence impacts
- burden impacts
- strategic impacts
- limitations
- warnings
- authority relationships

Purpose:

Creates the standardized authority object used throughout CourtSimplified.

---

## verifiedAuthorityRegistry

Status:

Audited

Purpose:

Defines authority hierarchy.

Current Authority Types:

- Constitution
- Charter
- Statute
- Regulation
- Rule of Court
- Practice Direction
- Official Form
- Official Guide
- Supreme Court of Canada
- Court of Appeal
- Superior Court
- Provincial Court
- Tribunal
- Policy
- Secondary Source

Purpose:

Determine default authority treatment.

---

## authorityVerificationEngine

Status:

Audited

Purpose:

Verify authority safety.

Checks:

- authority status
- verification status
- citation availability
- summary availability
- manual review requirements

Flags:

- repealed
- superseded
- amended
- overruled
- questionable
- unverified

Purpose:

Prevent unsafe authority use.

---

## authorityWeightEngine

Status:

Audited

Purpose:

Determine authority strength.

Current Inputs:

- binding level
- source type
- court level
- jurisdiction fit
- verification penalties

Current Outputs:

- weight score
- authority grade
- recommendation
- warnings

Purpose:

Rank authority strength.

---

## citationSafetyEngine

Status:

Audited

Purpose:

Determine whether authority is safe for citation.

Outputs:

- safe
- review-required
- unsafe

Purpose:

Prevent unsafe authority citations.

---

# CURRENT AUTHORITY PIPELINE

Authority
↓
Verification
↓
Weighting
↓
Citation Safety
↓
Authority Use

Current Status:

Operational

---

# MAJOR AUDIT FINDING

Current system is excellent at:

- authority verification
- authority hierarchy
- authority weighting
- citation safety

Current weakness:

The system does not yet understand whether authority actually applies.

---

# MISSING AUTHORITY SYSTEM

AuthorityApplicabilityEngine

Priority:

CRITICAL

Purpose:

Determine:

- supports user
- supports opponent
- distinguishable
- not applicable
- factually applicable
- procedurally applicable
- legally applicable

Inputs:

- authority
- facts
- issues
- legal theory
- procedural stage

Outputs:

Authority Applicability Report

---

# ANNUAL PRACTICE INTEGRATION

Ontario Annual Practice authorities will eventually be integrated into:

- Authority Registry
- Procedural Intelligence
- Workflow Intelligence
- Judicial Concern Analysis

Examples:

- Rule 16
- Rule 25
- Rule 26
- Rule 30
- Rule 39
- Rule 57
- Rule 58

Future Goal:

Annual Practice rules become intelligent procedural authorities.

---

# LONG-TERM GOAL

CourtSimplified should eventually be capable of determining:

- whether an authority is valid
- whether an authority is safe
- whether an authority is strong
- whether an authority applies
- whether an authority supports the user
- whether an authority supports the opponent
- how an authority impacts litigation strategy

Authority intelligence must eventually operate at the same level as evidence intelligence, procedural intelligence, and strategy intelligence.