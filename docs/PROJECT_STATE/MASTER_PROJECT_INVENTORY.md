# CourtSimplified – Master Project Inventory

**Status:** Active Development

**Purpose**

This document is the master index for the CourtSimplified project. It is the primary source of truth for the project's architecture, documentation, and engineering standards.

Every development session must begin by reviewing this document before making architectural or structural changes.

---

# Vision

CourtSimplified is being built as a complete Litigation Operating System for self-represented litigants.

The platform is intended to guide users from the beginning of a legal matter through resolution by combining:

- Legal procedure
- Workflow management
- Evidence analysis
- Strategy assistance
- AI reasoning
- Court document generation
- Legal authority verification
- Litigation intelligence

The objective is not simply to answer legal questions, but to help users build, organize, and present their cases.

---

# Engineering Principles

The following principles are permanent unless intentionally replaced through an Architecture Decision Record (ADR).

1. Documentation is the source of truth.
2. Never rely on conversational memory.
3. Never create duplicate systems.
4. Never create parallel workflows.
5. Always inspect existing architecture before adding new components.
6. Prefer extending stable systems over replacing them.
7. Every significant architectural change must be documented.
8. Every new subsystem must have a clearly defined purpose.
9. Every dependency should be understood before modification.
10. The project should become increasingly self-documenting over time.

---

# Documentation Structure

The documentation is organized into the following sections:

- PROJECT_STATE
- ARCHITECTURE
- INTELLIGENCE
- TESTING
- DECISIONS

Each section has a specific responsibility and should be kept current.

---

# Project Goals

Current engineering priorities include:

- Stable architecture
- Clear documentation
- Automatic project inventory generation
- Reliable engineering snapshots
- Long-term maintainability
- Scalable legal intelligence

---

# Source of Truth Order

When making decisions, consult information in this order:

1. Current source code
2. Engineering documentation
3. Architecture documentation
4. Architecture Decision Records
5. Conversation history (only when necessary)

---

# Long-Term Objective

CourtSimplified should eventually be capable of generating and maintaining its own engineering documentation so that future development depends on the project itself rather than human memory.

---

Last Updated: