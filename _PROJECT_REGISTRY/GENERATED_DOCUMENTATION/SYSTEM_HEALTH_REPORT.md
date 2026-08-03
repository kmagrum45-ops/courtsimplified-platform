# CourtSimplified System Health Report

**Generated:** 2026-07-31T19:11:39.126Z

**Snapshot Version:** 2.4.0

**Overall Status:** Needs Review

**Health Score:** 86/100

> This report consolidates static architecture, registry, dependency, integration, reachability, and production-build health. It does not prove legal accuracy, security, privacy compliance, or complete runtime branch coverage.

## Health Areas

| Area | Status | Score | Evidence |
|---|---|---:|---|
| Production Build | Healthy | 30/30 | Passed; exit code 0 |
| Registry Integrity | Healthy | 25/25 | 21/21 checks passed; 0 missing source files |
| Internal Import Resolution | Healthy | 15/15 | 0 unresolved internal imports |
| Runtime API Resolution | Healthy | 10/10 | 7/7 runtime API calls resolved |
| Circular Dependency Safety | Review | 1/10 | 2 high-risk and 1 medium-risk circular groups |
| Entry-Point Reachability | Review | 5/10 | 15 high-confidence candidates; 61 total review candidates |

## Blocking Issues

- None detected.

## Review Findings

- 2 high-risk circular dependency group(s) require architectural review.
- 1 medium-risk circular dependency group(s) require review.
- 15 high-confidence dead-code candidate(s) require manual confirmation.
- 46 additional reachability candidate(s) require staged or dynamic-use review.

## Consolidated Metrics

| Metric | Value |
|---|---:|
| Total files | 288 |
| TypeScript files | 196 |
| Architecture nodes | 196 |
| Architecture edges | 432 |
| Workflow records | 15 |
| Entry traces | 41 |
| Runtime API calls | 7 |
| Circular dependency groups | 3 |
| Dead-code review candidates | 61 |
| Registry validation failures | 0 |

## Control Doctrine

- No candidate may be deleted without source inspection, dependency confirmation, and deliberate approval.
- This health model does not prove runtime branch coverage, legal accuracy, security, privacy compliance, or that a dead-code candidate is safe to remove.
